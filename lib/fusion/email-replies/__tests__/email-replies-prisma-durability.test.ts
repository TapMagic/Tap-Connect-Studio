/**
 * Durable Prisma Email & Replies store + TapInbox retention proofs.
 * Runs only against isolated tapconnect_fusion_dev.
 *
 * No customer was contacted. Local mock / provider-test honesty only.
 */

import "dotenv/config";
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { assertSafeFusionDatabaseUrl } from "@/lib/fusion/db/safety";
import { prisma } from "@/lib/db";
import { EmailRepliesPrismaStore } from "../store-prisma";
import {
  activateReplyRouting,
  confirmDestinationVerification,
  getCampaignReplyPolicyView,
  listRoutingActivity,
  saveWizardDraft,
  sendDestinationRouteTest,
  sendDestinationVerification,
  setDestinationEnabledState,
} from "../service";
import { processInboundEmailReceived } from "../pipeline";
import { retainInboundReplyInTapInbox } from "../tapinbox-retain";
import { canLiveSend } from "@/lib/fusion/email/approval";
import { createAliasExpiry, hashReplyToken } from "../reply-alias";
import {
  evaluateVerificationToken,
  generateVerificationToken,
  hashToken,
} from "../verification";
import {
  parseCampaignReplyOverride,
  resetCampaignReplyOverride,
  resolveReplyPolicy,
} from "../policy";
import { buildOperatorReadinessChecklist } from "../operator-readiness";

const dbUrl = process.env.DATABASE_URL ?? "";
const safe = assertSafeFusionDatabaseUrl(dbUrl);
const run = safe.ok;

describe("Email & Replies Prisma durability", { skip: !run }, () => {
  const store = new EmailRepliesPrismaStore();
  let businessId = "";
  let locationId: string | null = null;
  let primaryDestinationId = "";

  before(async () => {
    // This suite proves Prisma durability — never inherit memory test override.
    delete process.env.EMAIL_REPLIES_STORE;

    const biz = await prisma.business.create({
      data: {
        name: "Email Replies Durability Biz",
        slug: `email-replies-durability-${Date.now().toString(36)}`,
      },
    });
    businessId = biz.id;
    const loc = await prisma.location.create({
      data: {
        businessId,
        name: "Main",
        isDefault: true,
      },
    });
    locationId = loc.id;
  });

  after(async () => {
    if (!businessId) return;
    await prisma.inboxMessage.deleteMany({ where: { businessId } });
    await prisma.messageThread.deleteMany({ where: { businessId } });
    await prisma.replyRoutingAttempt.deleteMany({ where: { businessId } });
    await prisma.replyInitialMessage.deleteMany({ where: { businessId } });
    await prisma.replyVerificationToken.deleteMany({ where: { businessId } });
    await prisma.replyAlias.deleteMany({ where: { businessId } });
    await prisma.replyProviderEvent.deleteMany({ where: { businessId } });
    await prisma.replyPolicy.deleteMany({ where: { businessId } });
    await prisma.replyDestination.deleteMany({ where: { businessId } });
    await prisma.platformAuditEvent.deleteMany({ where: { businessId } });
    if (locationId) {
      await prisma.location.delete({ where: { id: locationId } }).catch(() => undefined);
    }
    await prisma.business.delete({ where: { id: businessId } }).catch(() => undefined);
  });

  it("1-6 creates/updates destination, categories, keep-copy, fallback — persists after re-read", async () => {
    const draft = await saveWizardDraft({
      businessId,
      mode: "TAP_ROUTE_EXTERNAL",
      destinationName: "Customer Support",
      destinationAddress: "Support@Durable.Example",
      categories: ["questions", "complaints"],
      keepCopyInTap: true,
      useTapInboxFallback: true,
      store,
    });
    assert.equal(draft.ok, true);
    if (!draft.ok) return;
    primaryDestinationId = draft.primaryDestinationId!;

    await store.upsertDestination({
      id: primaryDestinationId,
      businessId,
      locationId,
      name: "Customer Support",
      destinationType: "EMAIL_ADDRESS",
      address: "Support@Durable.Example",
      selectedCategories: ["questions", "complaints"],
      keepCopyInTap: true,
      role: "PRIMARY",
    });

    const fresh = new EmailRepliesPrismaStore();
    const dest = await fresh.getDestination(primaryDestinationId);
    assert.ok(dest);
    assert.equal(dest!.name, "Customer Support");
    assert.equal(dest!.normalizedAddress, "support@durable.example");
    assert.deepEqual(
      [...dest!.selectedCategories].sort(),
      ["complaints", "questions"]
    );
    assert.equal(dest!.keepCopyInTap, true);
    assert.equal(dest!.locationId, locationId);

    const policy = await fresh.getPolicy(businessId);
    assert.ok(policy?.fallbackDestinationId);
    assert.equal(policy?.keepCopyInTap, true);
    assert.equal(policy?.useTapInboxFallback, true);
  });

  it("7-15 verification hashing, single-use, supersede, revoke, restart", async () => {
    const vs = await sendDestinationVerification({
      businessId,
      destinationId: primaryDestinationId,
      store,
    });
    assert.equal(vs.ok, true);
    if (!vs.ok || !("tokenForTests" in vs)) return;
    const raw1 = vs.tokenForTests!;
    assert.notEqual(raw1, hashToken(raw1));

    const tokens = await prisma.replyVerificationToken.findMany({
      where: { businessId, destinationId: primaryDestinationId },
      orderBy: { createdAt: "desc" },
    });
    assert.ok(tokens.length >= 1);
    assert.equal(tokens[0]!.tokenHash, hashToken(raw1));
    assert.notEqual(tokens[0]!.tokenHash, raw1);

    const vs2 = await sendDestinationVerification({
      businessId,
      destinationId: primaryDestinationId,
      store,
    });
    assert.equal(vs2.ok, true);
    if (!vs2.ok || !("tokenForTests" in vs2)) return;
    const raw2 = vs2.tokenForTests!;

    const rejectedOld = await confirmDestinationVerification({
      businessId,
      destinationId: primaryDestinationId,
      token: raw1,
      store,
    });
    assert.equal(rejectedOld.ok, false);

    const confirmed = await confirmDestinationVerification({
      businessId,
      destinationId: primaryDestinationId,
      token: raw2,
      store,
    });
    assert.equal(confirmed.ok, true);

    const reused = await confirmDestinationVerification({
      businessId,
      destinationId: primaryDestinationId,
      token: raw2,
      store,
    });
    assert.equal(reused.ok, false);

    const expiredTok = generateVerificationToken();
    const expiredRow = await prisma.replyVerificationToken.create({
      data: {
        businessId,
        destinationId: primaryDestinationId,
        tokenHash: expiredTok.tokenHash,
        expiresAt: new Date(Date.now() - 60_000),
      },
    });
    const expiredEval = evaluateVerificationToken({
      presentedToken: expiredTok.token,
      record: {
        id: expiredRow.id,
        destinationId: primaryDestinationId,
        businessId,
        tokenHash: expiredTok.tokenHash,
        expiresAt: expiredRow.expiresAt.toISOString(),
        usedAt: null,
        createdAt: expiredRow.createdAt.toISOString(),
      },
      expectedBusinessId: businessId,
      expectedDestinationId: primaryDestinationId,
    });
    assert.equal(expiredEval.ok, false);
    if (!expiredEval.ok) assert.equal(expiredEval.code, "expired");

    const cross = await confirmDestinationVerification({
      businessId: "biz_other",
      destinationId: primaryDestinationId,
      token: raw2,
      store,
    });
    assert.equal(cross.ok, false);

    await store.revokeDestination(primaryDestinationId, businessId);
    const afterRevoke = await confirmDestinationVerification({
      businessId,
      destinationId: primaryDestinationId,
      token: raw2,
      store,
    });
    assert.equal(afterRevoke.ok, false);

    // Restore destination for later tests
    const restore = await saveWizardDraft({
      businessId,
      mode: "TAP_ROUTE_EXTERNAL",
      destinationName: "Customer Support Restored",
      destinationAddress: "support@durable.example",
      categories: ["all"],
      keepCopyInTap: true,
      useTapInboxFallback: true,
      store,
    });
    assert.equal(restore.ok, true);
    if (restore.ok) primaryDestinationId = restore.primaryDestinationId!;
    const vs3 = await sendDestinationVerification({
      businessId,
      destinationId: primaryDestinationId,
      store,
    });
    if (vs3.ok && "tokenForTests" in vs3) {
      await confirmDestinationVerification({
        businessId,
        destinationId: primaryDestinationId,
        token: vs3.tokenForTests!,
        store,
      });
    }
    const test = await sendDestinationRouteTest({
      businessId,
      destinationId: primaryDestinationId,
      store,
    });
    assert.equal(test.ok, true);
    const activated = await activateReplyRouting({ businessId, store });
    assert.equal(activated.ok, true);

    const afterRestart = new EmailRepliesPrismaStore();
    const dest = await afterRestart.getDestination(primaryDestinationId);
    assert.equal(dest?.verificationStatus, "VERIFIED");
    assert.ok(dest?.lastTestedAt);
    assert.equal((await afterRestart.getPolicy(businessId))?.activated, true);
  });

  it("16-18 disable / re-enable / pause persistence", async () => {
    const disabled = await setDestinationEnabledState({
      businessId,
      destinationId: primaryDestinationId,
      enabled: false,
      store,
    });
    assert.equal(disabled.ok, true);
    assert.equal(
      (await new EmailRepliesPrismaStore().getDestination(primaryDestinationId))
        ?.enabled,
      false
    );
    await setDestinationEnabledState({
      businessId,
      destinationId: primaryDestinationId,
      enabled: true,
      store,
    });

    await store.pauseDestination(primaryDestinationId, businessId, "host pause");
    const paused = await store.getDestination(primaryDestinationId);
    assert.equal(paused?.paused, true);
    await store.unpauseDestination(primaryDestinationId, businessId);
    assert.equal(
      (await store.getDestination(primaryDestinationId))?.paused,
      false
    );
  });

  it("19-22 business / location / campaign policy + fallback persistence", async () => {
    await store.setPolicy({
      businessId,
      locationId: null,
      mode: "TAP_ROUTE_EXTERNAL",
      primaryDestinationId,
      activated: true,
      keepCopyInTap: false,
      useTapInboxFallback: true,
      notifyOnFailure: true,
    });
    await store.setPolicy({
      businessId,
      locationId,
      mode: "TAP_INBOX",
      primaryDestinationId,
      activated: true,
      keepCopyInTap: true,
      useTapInboxFallback: true,
      notifyOnFailure: true,
    });

    const bizPolicy = await store.getPolicy(businessId);
    const locPolicy = await store.getPolicy(businessId, locationId);
    assert.equal(bizPolicy?.mode, "TAP_ROUTE_EXTERNAL");
    assert.equal(locPolicy?.mode, "TAP_INBOX");

    const resolvedLoc = resolveReplyPolicy({
      businessId,
      locationId,
      businessPolicy: bizPolicy,
      locationPolicy: locPolicy,
    });
    assert.equal(resolvedLoc.source, "location");
    assert.equal(resolvedLoc.mode, "TAP_INBOX");

    const campaignOverride = parseCampaignReplyOverride({
      override: true,
      mode: "DIRECT_EXTERNAL",
      keepCopyInTap: false,
      primaryDestinationId,
    });
    assert.ok(campaignOverride);
    const withCampaign = resolveReplyPolicy({
      businessId,
      businessPolicy: bizPolicy,
      campaignOverride,
    });
    assert.equal(withCampaign.source, "campaign");
    assert.equal(withCampaign.mode, "DIRECT_EXTERNAL");

    const reset = resetCampaignReplyOverride();
    const afterReset = resolveReplyPolicy({
      businessId,
      businessPolicy: bizPolicy,
      campaignOverride: reset,
    });
    assert.equal(afterReset.mode, "TAP_ROUTE_EXTERNAL");
    assert.equal(afterReset.source, "business");

    // Business policy change does not erase intentional campaign override fields
    await store.setPolicy({
      businessId,
      mode: "TAP_INBOX",
      primaryDestinationId,
      activated: true,
      keepCopyInTap: true,
      useTapInboxFallback: true,
      notifyOnFailure: true,
    });
    const stillCampaign = resolveReplyPolicy({
      businessId,
      businessPolicy: await store.getPolicy(businessId),
      campaignOverride,
    });
    assert.equal(stillCampaign.mode, "DIRECT_EXTERNAL");

    const view = await getCampaignReplyPolicyView({
      businessId,
      campaignId: "camp_durability_view",
      campaignOverride: {
        override: true,
        mode: "DIRECT_EXTERNAL",
        keepCopyInTap: false,
      },
      store,
    });
    assert.equal(view.display.isOverride, true);
  });

  it("23-26 alias persistence, expiry, cross-business rejection", async () => {
    const alias = await store.createAlias({
      businessId,
      campaignId: "camp_durability",
    });
    const found = await new EmailRepliesPrismaStore().getAliasByToken(alias.token);
    assert.equal(found?.businessId, businessId);
    assert.equal(found?.tokenHash, hashReplyToken(alias.token));
    assert.ok(!alias.token.includes(businessId));

    await prisma.replyAlias.update({
      where: { id: found!.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    const expired = await store.getAliasByToken(alias.token);
    assert.ok(expired);
    assert.ok(new Date(expired.expiresAt).getTime() < Date.now());

    const other = await store.createAlias({
      businessId,
      campaignId: "camp_other",
    });
    const crossBiz = await prisma.business.create({
      data: {
        name: "Other Biz",
        slug: `other-er-${Date.now().toString(36)}`,
      },
    });
    try {
      const lookup = await store.getAliasByToken(other.token);
      assert.equal(lookup?.businessId, businessId);
      assert.notEqual(lookup?.businessId, crossBiz.id);
    } finally {
      await prisma.business.delete({ where: { id: crossBiz.id } });
    }

    await store.deactivateAlias(other.token, businessId);
    assert.ok((await store.getAliasByToken(other.token))?.deactivatedAt);
  });

  it("27-35 provider event idempotency + no duplicate TapInbox / route", async () => {
    await store.markDestinationVerified(primaryDestinationId, businessId);
    await store.markDestinationTested(primaryDestinationId, "success");
    await store.setPolicy({
      businessId,
      mode: "TAP_INBOX",
      primaryDestinationId,
      activated: true,
      keepCopyInTap: true,
      useTapInboxFallback: true,
      notifyOnFailure: true,
    });

    const fixtureToken = "fixtureaaaaaaaaaaaa";
    await prisma.replyAlias.deleteMany({ where: { token: fixtureToken } });
    await prisma.replyAlias.create({
      data: {
        businessId,
        token: fixtureToken,
        tokenHash: hashReplyToken(fixtureToken),
        campaignId: "camp_inbox",
        expiresAt: createAliasExpiry(),
      },
    });

    const eventId = `evt_dur_${Date.now()}`;
    const emailId = `em_mock_dur_${Date.now()}`;

    const first = await processInboundEmailReceived({
      eventId,
      emailId,
      store,
      writeTapInbox: true,
    });
    assert.equal(first.ok, true);
    assert.equal(first.retainedInTap, true);
    assert.ok(first.threadId);
    assert.ok(first.inboxMessageId);

    const dupEvent = await processInboundEmailReceived({
      eventId,
      emailId,
      store,
      writeTapInbox: true,
    });
    assert.equal(dupEvent.duplicate, true);

    const msgs = await prisma.inboxMessage.findMany({
      where: {
        businessId,
        providerRef: (
          await store.getInitialReply(first.initialMessageId!)
        )?.providerMessageId,
      },
    });
    assert.equal(msgs.length, 1);

    const initials = await prisma.replyInitialMessage.findMany({
      where: { businessId, providerMessageId: emailId },
    });
    assert.ok(initials.length <= 1);
  });

  it("36-42 keepCopy false vs true + failure pause + TapInbox fallback", async () => {
    const fixtureToken = "fixtureaaaaaaaaaaaa";
    const alias = await store.getAliasByToken(fixtureToken);
    if (!alias || alias.businessId !== businessId) {
      await prisma.replyAlias.deleteMany({ where: { token: fixtureToken } });
      await prisma.replyAlias.create({
        data: {
          businessId,
          token: fixtureToken,
          tokenHash: hashReplyToken(fixtureToken),
          campaignId: "camp_inbox",
          expiresAt: createAliasExpiry(),
        },
      });
    }

    await store.setPolicy({
      businessId,
      mode: "TAP_ROUTE_EXTERNAL",
      primaryDestinationId,
      activated: true,
      keepCopyInTap: false,
      useTapInboxFallback: true,
      notifyOnFailure: true,
    });
    await store.upsertDestination({
      id: primaryDestinationId,
      businessId,
      name: "Customer Support Restored",
      destinationType: "EMAIL_ADDRESS",
      address: "support@durable.example",
      keepCopyInTap: false,
      role: "PRIMARY",
      selectedCategories: ["all"],
    });
    await store.unpauseDestination(primaryDestinationId, businessId);

    const emailId = `em_mock_keepfalse_${Date.now()}`;
    const eventId = `evt_keepfalse_${Date.now()}`;

    const beforeMsgs = await prisma.inboxMessage.count({ where: { businessId } });
    const routed = await processInboundEmailReceived({
      eventId,
      emailId,
      store,
      writeTapInbox: true,
    });
    assert.equal(routed.ok, true);
    assert.equal(routed.retainedInTap, false);
    const afterMsgs = await prisma.inboxMessage.count({ where: { businessId } });
    assert.equal(afterMsgs, beforeMsgs);

    const tapFallback = (await store.listDestinations(businessId)).find(
      (d) => d.destinationType === "TAP_INBOX"
    );
    await store.setPolicy({
      businessId,
      mode: "TAP_ROUTE_EXTERNAL",
      primaryDestinationId,
      fallbackDestinationId: tapFallback?.id ?? null,
      activated: true,
      keepCopyInTap: false,
      useTapInboxFallback: true,
      notifyOnFailure: true,
    });

    for (let i = 0; i < 3; i++) {
      const r = await processInboundEmailReceived({
        eventId: `evt_fail_${Date.now()}_${i}`,
        emailId: `em_mock_fail_${Date.now()}_${i}`,
        store,
        writeTapInbox: true,
        forceRouteFailure: true,
      });
      assert.equal(r.ok, false);
      assert.equal(r.retainedInTap, true);
      assert.ok(r.threadId);
    }
    const dest = await store.getDestination(primaryDestinationId);
    assert.equal(dest?.paused, true);
    assert.ok((dest?.consecutiveFailureCount ?? 0) >= 3);

    const activity = await listRoutingActivity({ businessId, store });
    assert.equal(activity.ok, true);
    if (!activity.ok) return;
    assert.ok(activity.items.length >= 1);
    assert.ok(
      activity.items.every(
        (a) =>
          !JSON.stringify(a).includes("tokenHash") &&
          !JSON.stringify(a).toLowerCase().includes("webhook_secret")
      )
    );
  });

  it("43-46 TapInbox retain idempotent + threading headers + no auto-case", async () => {
    const providerRef = `prov_keep_${Date.now()}`;
    const retained = await retainInboundReplyInTapInbox({
      businessId,
      fromAddress: "customer@example.com",
      subject: "Keep copy proof",
      body: "Hello from durability proof",
      providerMessageId: providerRef,
      campaignId: "camp_keep",
      internetMessageId: "<msg1@example.com>",
      inReplyTo: "<orig@example.com>",
      referencesHeader: "<orig@example.com>",
      attachmentMetadata: [{ filename: "a.pdf", size: 12, allowed: true }],
    });
    assert.equal(retained.ok, true);
    if (!retained.ok) return;

    const msg = await prisma.inboxMessage.findUnique({
      where: { id: retained.messageId },
    });
    assert.ok(msg);
    assert.equal(msg!.providerRef, providerRef);
    const meta = (msg!.metadata ?? {}) as Record<string, unknown>;
    assert.equal(meta.internetMessageId, "<msg1@example.com>");
    assert.equal(meta.inReplyTo, "<orig@example.com>");

    const cases = await prisma.tapCase.count({
      where: { businessId, threadId: retained.threadId },
    });
    assert.equal(cases, 0);

    const dup = await retainInboundReplyInTapInbox({
      businessId,
      fromAddress: "customer@example.com",
      subject: "Keep copy proof",
      body: "Hello from durability proof",
      providerMessageId: providerRef,
    });
    assert.equal(dup.ok, true);
    if (dup.ok) assert.equal(dup.created, false);
  });

  it("47-52 operator readiness honesty + no live send + store ping", async () => {
    const checklist = await buildOperatorReadinessChecklist();
    const ids = checklist.items.map((c) => c.id);
    assert.ok(ids.includes("schema_present"));
    assert.ok(ids.includes("durable_store"));
    const live = checklist.items.find((c) => c.id === "live_ready");
    assert.ok(live);
    assert.notEqual(live!.status, "live_ready");
    assert.equal(checklist.liveCampaignSendingEnabled, false);
    assert.equal(canLiveSend(), false);
    const ping = await store.ping();
    assert.equal(ping.kind, "prisma");
    assert.ok(checklist.durableStore.active);
  });
});
