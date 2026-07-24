import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import {
  connectTikTok,
  createTikTokCast,
  composeTikTok916,
  directPostTikTok,
  failAndRetryTikTok,
  listTikTokAudit,
  resetTikTokMemory,
  runTikTokRelationshipFunnel,
  uploadTikTokDraft,
  evaluateTikTokReadiness,
} from "../index";
import { resetProductivityMemory } from "@/lib/fusion/connectors/productivity";

const BIZ = "biz_tiktok_test";
const originalUrl = process.env.DATABASE_URL;

describe("TapCast · TikTok", () => {
  beforeEach(() => {
    resetTikTokMemory();
    resetProductivityMemory();
    // Force memory path — fake business ids must not hit Prisma FKs
    delete process.env.DATABASE_URL;
  });

  afterEach(() => {
    resetTikTokMemory();
    if (originalUrl !== undefined) process.env.DATABASE_URL = originalUrl;
    else delete process.env.DATABASE_URL;
  });

  it("readiness is VERIFIED — CREDENTIALS REQUIRED when env unset", () => {
    const readiness = evaluateTikTokReadiness();
    assert.equal(readiness.displayStatus, "verified_credentials_required");
    assert.equal(readiness.directPostGated, true);
  });

  it("mock posting workflow works without credentials", () => {
    const conn = connectTikTok({ businessId: BIZ });
    assert.equal(conn.ok, true);
    if (!conn.ok) return;
    assert.equal(conn.mode, "mock");

    const created = createTikTokCast({
      businessId: BIZ,
      title: "Special",
      caption: "Keep this Card",
    });
    assert.equal(created.ok, true);
    if (!created.ok) return;

    composeTikTok916(created.data.id, { durationSec: 20 });
    const draft = uploadTikTokDraft(created.data.id);
    assert.equal(draft.ok, true);
    if (!draft.ok) return;
    assert.equal(draft.data.status, "uploaded_draft");
    assert.ok(draft.data.externalDraftId);

    const posted = directPostTikTok(created.data.id);
    assert.equal(posted.ok, true);
    if (!posted.ok) return;
    assert.equal(posted.mode, "mock");
    assert.equal(posted.data.status, "published");
    assert.ok(posted.data.externalPostId);
  });

  it("retry path audits failure and success", () => {
    connectTikTok({ businessId: BIZ });
    const created = createTikTokCast({ businessId: BIZ, title: "Retry me" });
    assert.ok(created.ok);
    if (!created.ok) return;
    composeTikTok916(created.data.id);
    uploadTikTokDraft(created.data.id);
    const retried = failAndRetryTikTok(created.data.id);
    assert.equal(retried.ok, true);
    if (!retried.ok) return;
    assert.ok(retried.data.retryCount >= 1);
    assert.equal(retried.data.status, "published");
    const audit = listTikTokAudit(BIZ);
    assert.ok(audit.some((a) => a.action === "tiktok.publish_failed"));
    assert.ok(audit.some((a) => a.action === "tiktok.retry_succeeded"));
  });

  it("relationship funnel mock path creates associations + approval task", () => {
    const result = runTikTokRelationshipFunnel({
      businessId: BIZ,
      title: "Funnel Special",
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.deepEqual(result.data.funnelPath, [
      "content",
      "card",
      "keep",
      "wallet",
      "loyalty",
      "outcome",
    ]);
    assert.ok(result.data.cardStubId);
    assert.ok(result.data.campaignStubId);
    assert.ok(result.data.tapPointStubId);
    assert.equal(result.data.cast.status, "uploaded_draft");
    assert.ok(result.data.cast.funnel?.stages.length === 6);
  });

  it("live Direct Post is gated without credentials even if preferLive requested", () => {
    const conn = connectTikTok({ businessId: BIZ, preferLive: true });
    assert.equal(conn.ok, true);
    if (!conn.ok) return;
    // Without env, falls back to mock
    assert.equal(conn.mode, "mock");
  });
});
