/**
 * API contract smoke — import route handlers where feasible; otherwise assert
 * domain schemas / services behind authenticated routes.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { z } from "zod";
import { evaluateChannelGuardian } from "../comms/channel-guardian";
import { nextStatus } from "../wallet/lifecycle";
import { validateLedgerAppend } from "../taploop/ledger-math";
import { parseTapSavePreferences } from "../tapsave/moments";
import { journeyIsValid, createEmptyJourney } from "../journey";
import { isFeatureEnabled } from "../features/resolve";
import { createGovernedEvent, enqueueOutboxSync, resetMemoryOutbox } from "../publication/events";
import { STUDIO_NAV } from "../studio/ia";

describe("API contract smoke: route handler exports", () => {
  it("health GET is exportable", async () => {
    const mod = await import("../../../app/api/health/route");
    assert.equal(typeof mod.GET, "function");
  });

  it("outbox GET/POST are exportable", async () => {
    const mod = await import("../../../app/api/outbox/route");
    assert.equal(typeof mod.GET, "function");
    assert.equal(typeof mod.POST, "function");
  });

  it("wallet GET/POST are exportable", async () => {
    const mod = await import("../../../app/api/wallet/route");
    assert.equal(typeof mod.GET, "function");
    assert.equal(typeof mod.POST, "function");
  });

  it("loyalty award POST is exportable", async () => {
    const mod = await import("../../../app/api/loyalty/award/route");
    assert.equal(typeof mod.POST, "function");
  });

  it("tapsave keep POST is exportable", async () => {
    const mod = await import("../../../app/api/tapsave/keep/route");
    assert.equal(typeof mod.POST, "function");
  });

  it("journeys draft handlers are exportable", async () => {
    const mod = await import("../../../app/api/journeys/draft/route");
    assert.equal(typeof mod.GET, "function");
    assert.equal(typeof mod.POST, "function");
  });

  it("admin features GET/POST are exportable", async () => {
    const mod = await import("../../../app/api/admin/features/route");
    assert.equal(typeof mod.GET, "function");
    assert.equal(typeof mod.POST, "function");
  });

  it("commerce GET/POST are exportable", async () => {
    const mod = await import("../../../app/api/commerce/route");
    assert.equal(typeof mod.GET, "function");
    assert.equal(typeof mod.POST, "function");
  });

  it("inbox and audience consent handlers are exportable", async () => {
    const inbox = await import("../../../app/api/inbox/route");
    const consent = await import("../../../app/api/audience/consent/route");
    assert.equal(typeof inbox.GET, "function");
    assert.equal(typeof consent.POST, "function");
  });
});

describe("API contract smoke: request schemas behind routes", () => {
  const loyaltyAwardSchema = z.object({
    enrollmentId: z.string().min(1),
    points: z.number().int().positive(),
    reason: z.string().trim().min(1).max(240),
    idempotencyKey: z.string().trim().min(1).max(120),
  });

  const keepSchema = z.object({
    businessId: z.string().min(1),
    email: z.string().email(),
    consentGiven: z.boolean().optional().default(true),
  });

  const outboxRetrySchema = z.object({
    action: z.literal("retry"),
    id: z.string(),
  });

  const walletActionSchema = z.object({
    action: z.enum(["create", "preview", "issue", "update", "revoke", "replace"]),
    passId: z.string().optional(),
    platform: z.enum(["apple", "google"]).optional(),
  });

  it("loyalty award schema rejects missing idempotency key", () => {
    const bad = loyaltyAwardSchema.safeParse({
      enrollmentId: "e1",
      points: 10,
      reason: "visit",
    });
    assert.equal(bad.success, false);
  });

  it("loyalty award schema accepts valid body", () => {
    const ok = loyaltyAwardSchema.safeParse({
      enrollmentId: "e1",
      points: 10,
      reason: "visit",
      idempotencyKey: "visit_1",
    });
    assert.equal(ok.success, true);
  });

  it("tapsave keep schema validates email", () => {
    assert.equal(
      keepSchema.safeParse({ businessId: "b", email: "not-an-email" }).success,
      false
    );
    assert.equal(
      keepSchema.safeParse({ businessId: "b", email: "a@b.co" }).success,
      true
    );
  });

  it("outbox retry and wallet action schemas parse", () => {
    assert.equal(
      outboxRetrySchema.safeParse({ action: "retry", id: "evt_1" }).success,
      true
    );
    assert.equal(
      walletActionSchema.safeParse({ action: "create", platform: "apple" }).success,
      true
    );
    assert.equal(
      walletActionSchema.safeParse({ action: "destroy" }).success,
      false
    );
  });
});

describe("API contract smoke: domain services behind routes", () => {
  it("guardian + wallet + ledger contracts stay coherent", () => {
    const g = evaluateChannelGuardian({
      channel: "email",
      purpose: "support",
      consentGiven: true,
      featureEnabled: true,
      providerReady: true,
    });
    assert.equal(g.allowed, true);

    const issued = nextStatus("PREVIEWED", "issue");
    assert.equal(issued.ok, true);

    const append = validateLedgerAppend([], { type: "AWARD", points: 5 });
    assert.equal(append.ok, true);
  });

  it("tapsave prefs + journey draft shape for API payloads", () => {
    const prefs = parseTapSavePreferences({ emailOptIn: false, frequency: "off" });
    assert.equal(prefs.frequency, "off");
    assert.equal(journeyIsValid(createEmptyJourney("API draft")), true);
  });

  it("feature kill switch contract for admin features API", () => {
    assert.equal(
      isFeatureEnabled("ai.autopilot", {
        overrides: [{ featureId: "ai.autopilot", enabled: false, scope: "global" }],
      }),
      false
    );
  });

  it("outbox enqueue shape matches dead-letter panel expectations", () => {
    resetMemoryOutbox();
    const record = enqueueOutboxSync(
      "api.smoke",
      createGovernedEvent({
        name: "api.smoke",
        businessId: "biz",
        aggregateType: "smoke",
        aggregateId: "1",
        correlationId: "corr",
        payload: { ok: true },
      })
    );
    assert.equal(record.status, "PENDING");
    assert.ok(record.envelope.occurredAt);
    resetMemoryOutbox();
  });

  it("studio IA exposes seven permanent destinations", () => {
    assert.equal(STUDIO_NAV.length, 7);
    assert.ok(STUDIO_NAV.every((n) => n.href.startsWith("/dashboard")));
  });
});
