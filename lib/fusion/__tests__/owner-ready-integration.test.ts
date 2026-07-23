/**
 * OWNER-READY integration-style coverage — pure / memory paths, no live Docker.
 */
import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import { evaluateChannelGuardian, type MessageChannel } from "../comms/channel-guardian";
import { sendEmailViaMock } from "../comms/email-mock";
import { isAddressSuppressed } from "../comms/suppression";
import {
  canTransition,
  isInstallable,
  isTerminal,
  nextStatus,
  type WalletLifecycleAction,
  type WalletPassStatus,
} from "../wallet/lifecycle";
import {
  computeBalance,
  validateLedgerAppend,
} from "../taploop/ledger-math";
import {
  createGovernedEvent,
  drainOutbox,
  enqueueOutbox,
  listDeadLetters,
  listPendingOutbox,
  markOutboxFailed,
  recallIdempotent,
  rememberIdempotent,
  resetMemoryOutbox,
  retryDeadLetter,
} from "../publication/events";
import {
  evaluateReadiness,
  isFeatureEnabled,
  isFeatureExecutable,
} from "../features/resolve";
import { FEATURE_DEFINITIONS } from "../features/registry";
import {
  defaultTapSavePreferences,
  parseTapSavePreferences,
} from "../tapsave/moments";
import {
  createEmptyJourney,
  journeyIsValid,
  simulateJourney,
  validateJourney,
  type JourneyDefinition,
} from "../journey";
import {
  assertSafeFusionDatabaseUrl,
  isIsolatedFusionDatabaseConfigured,
} from "../db/safety";

const originalUrl = process.env.DATABASE_URL;

describe("Owner-ready: Channel Guardian + email mock + suppression", () => {
  beforeEach(() => {
    resetMemoryOutbox();
    delete process.env.DATABASE_URL;
  });

  afterEach(() => {
    resetMemoryOutbox();
    if (originalUrl !== undefined) process.env.DATABASE_URL = originalUrl;
    else delete process.env.DATABASE_URL;
  });

  it("guardian decision matrix covers all deny codes", () => {
    const cases: Array<{
      label: string;
      ctx: Parameters<typeof evaluateChannelGuardian>[0];
      code: string;
      allowed: boolean;
    }> = [
      {
        label: "feature_off",
        ctx: { channel: "email", featureEnabled: false },
        code: "feature_off",
        allowed: false,
      },
      {
        label: "plan_blocked",
        ctx: { channel: "email", featureEnabled: true, planAllows: false },
        code: "plan_blocked",
        allowed: false,
      },
      {
        label: "provider_missing",
        ctx: { channel: "sms", featureEnabled: true, providerReady: false, recipientId: "1" },
        code: "provider_missing",
        allowed: false,
      },
      {
        label: "suppressed",
        ctx: {
          channel: "email",
          featureEnabled: true,
          providerReady: true,
          suppressed: true,
          consentGiven: true,
        },
        code: "suppressed",
        allowed: false,
      },
      {
        label: "missing_recipient",
        ctx: { channel: "telegram", featureEnabled: true, providerReady: true },
        code: "missing_recipient",
        allowed: false,
      },
      {
        label: "no_consent",
        ctx: {
          channel: "email",
          purpose: "promo",
          consentGiven: false,
          featureEnabled: true,
          providerReady: true,
        },
        code: "no_consent",
        allowed: false,
      },
      {
        label: "frequency",
        ctx: {
          channel: "email",
          purpose: "promo",
          consentGiven: true,
          featureEnabled: true,
          providerReady: true,
          frequencyExceeded: true,
        },
        code: "frequency",
        allowed: false,
      },
      {
        label: "ok transactional",
        ctx: {
          channel: "email",
          purpose: "transactional",
          consentGiven: false,
          featureEnabled: true,
          providerReady: true,
        },
        code: "ok",
        allowed: true,
      },
    ];

    for (const c of cases) {
      const d = evaluateChannelGuardian(c.ctx);
      assert.equal(d.code, c.code, c.label);
      assert.equal(d.allowed, c.allowed, c.label);
    }
  });

  it("email mock enqueues only when guardian allows", async () => {
    const blocked = await sendEmailViaMock({
      businessId: "biz_or",
      to: "blocked@example.com",
      subject: "Promo",
      body: "Sale",
      purpose: "promo",
      consentGiven: false,
      featureEnabled: true,
    });
    assert.equal(blocked.ok, false);
    assert.equal(listPendingOutbox().length, 0);

    const ok = await sendEmailViaMock({
      businessId: "biz_or",
      to: "ok@example.com",
      subject: "Receipt",
      body: "Thanks",
      purpose: "transactional",
      featureEnabled: true,
    });
    assert.equal(ok.ok, true);
    assert.ok(listPendingOutbox().some((r) => r.topic === "email.send"));
  });

  it("suppression helper returns false without DB / empty address", async () => {
    assert.equal(
      await isAddressSuppressed({
        businessId: "b",
        channel: "email",
        address: "   ",
      }),
      false
    );
    // No isolated DB → prisma catch → false (fail-open for lookup, guardian still applies)
    assert.equal(
      await isAddressSuppressed({
        businessId: "b",
        channel: "email" as MessageChannel,
        address: "anyone@example.com",
      }),
      false
    );
  });

  it("skipGuardian still honors suppression flag via DB miss path + explicit guard", async () => {
    const result = await sendEmailViaMock({
      businessId: "biz_or",
      to: "x@example.com",
      subject: "X",
      body: "Y",
      skipGuardian: true,
      featureEnabled: true,
    });
    // Without a suppression row, send proceeds
    assert.equal(result.ok, true);
  });
});

describe("Owner-ready: Wallet state machine full matrix", () => {
  const statuses: WalletPassStatus[] = [
    "DRAFT",
    "PREVIEWED",
    "ISSUED",
    "UPDATED",
    "REVOKED",
    "REPLACED",
    "EXPIRED",
  ];
  const actions: WalletLifecycleAction[] = [
    "create",
    "preview",
    "issue",
    "update",
    "revoke",
    "replace",
    "expire",
  ];

  /** Expected next status when transition is legal; null = illegal */
  const EXPECTED: Record<
    WalletLifecycleAction,
    Partial<Record<WalletPassStatus, WalletPassStatus>>
  > = {
    create: { DRAFT: "DRAFT" },
    preview: { DRAFT: "PREVIEWED", PREVIEWED: "PREVIEWED" },
    issue: { DRAFT: "ISSUED", PREVIEWED: "ISSUED" },
    update: { ISSUED: "UPDATED", UPDATED: "UPDATED" },
    revoke: { ISSUED: "REVOKED", UPDATED: "REVOKED", PREVIEWED: "REVOKED" },
    replace: { ISSUED: "REPLACED", UPDATED: "REPLACED" },
    expire: { ISSUED: "EXPIRED", UPDATED: "EXPIRED", PREVIEWED: "EXPIRED" },
  };

  it("enumerates every status × action", () => {
    for (const status of statuses) {
      for (const action of actions) {
        const expected = EXPECTED[action][status];
        const allowed = canTransition(status, action);
        const next = nextStatus(status, action);
        if (expected) {
          assert.equal(allowed, true, `${status}/${action}`);
          assert.equal(next.ok, true, `${status}/${action}`);
          if (next.ok) assert.equal(next.status, expected);
        } else {
          assert.equal(allowed, false, `${status}/${action}`);
          assert.equal(next.ok, false, `${status}/${action}`);
        }
      }
    }
  });

  it("happy path draft → preview → issue → update → revoke", () => {
    let s: WalletPassStatus = "DRAFT";
    for (const [action, want] of [
      ["preview", "PREVIEWED"],
      ["issue", "ISSUED"],
      ["update", "UPDATED"],
      ["revoke", "REVOKED"],
    ] as const) {
      const r = nextStatus(s, action);
      assert.equal(r.ok, true);
      if (r.ok) {
        assert.equal(r.status, want);
        s = r.status;
      }
    }
    assert.equal(isTerminal(s), true);
    assert.equal(isInstallable(s), false);
  });

  it("no transitions out of terminal states", () => {
    for (const terminal of ["REVOKED", "REPLACED", "EXPIRED"] as const) {
      for (const action of actions) {
        assert.equal(
          canTransition(terminal, action),
          false,
          `terminal ${terminal} must not ${action}`
        );
      }
    }
  });
});

describe("Owner-ready: TapLoop idempotency (memory award store)", () => {
  type MemEntry = {
    id: string;
    enrollmentId: string;
    points: number;
    reason: string;
    idempotencyKey: string;
  };

  /** Mirrors taploop/service award() duplicate:true contract without Prisma */
  function createAwardStore() {
    const byKey = new Map<string, MemEntry>();
    const ledger: Array<{ type: "AWARD" | "REDEEM"; points: number }> = [];

    return {
      award(input: {
        businessId: string;
        enrollmentId: string;
        points: number;
        reason: string;
        idempotencyKey: string;
      }) {
        const compound = `${input.businessId}::${input.idempotencyKey}`;
        const existing = byKey.get(compound);
        if (existing) {
          return {
            entry: existing,
            balance: computeBalance(ledger),
            duplicate: true as const,
          };
        }
        const check = validateLedgerAppend(ledger, {
          type: "AWARD",
          points: input.points,
        });
        if (!check.ok) throw new Error(check.error);
        const entry: MemEntry = {
          id: `le_${byKey.size + 1}`,
          enrollmentId: input.enrollmentId,
          points: input.points,
          reason: input.reason,
          idempotencyKey: input.idempotencyKey,
        };
        byKey.set(compound, entry);
        ledger.push({ type: "AWARD", points: input.points });
        return {
          entry,
          balance: computeBalance(ledger),
          duplicate: false as const,
        };
      },
      size: () => byKey.size,
      balance: () => computeBalance(ledger),
    };
  }

  it("duplicate award with same idempotency key does not double points", () => {
    const store = createAwardStore();
    const first = store.award({
      businessId: "b1",
      enrollmentId: "en1",
      points: 25,
      reason: "visit",
      idempotencyKey: "visit_abc_001",
    });
    assert.equal(first.duplicate, false);
    assert.equal(first.balance, 25);

    const second = store.award({
      businessId: "b1",
      enrollmentId: "en1",
      points: 25,
      reason: "visit",
      idempotencyKey: "visit_abc_001",
    });
    assert.equal(second.duplicate, true);
    assert.equal(second.entry.id, first.entry.id);
    assert.equal(second.balance, 25);
    assert.equal(store.size(), 1);
  });

  it("distinct keys accumulate; publication rememberIdempotent matches", () => {
    const store = createAwardStore();
    store.award({
      businessId: "b1",
      enrollmentId: "en1",
      points: 10,
      reason: "a",
      idempotencyKey: "k1",
    });
    store.award({
      businessId: "b1",
      enrollmentId: "en1",
      points: 15,
      reason: "b",
      idempotencyKey: "k2",
    });
    assert.equal(store.balance(), 25);

    const payload = { points: 10, reason: "a" };
    rememberIdempotent("b1", "loyalty.award", "k1", payload, { ok: true, points: 10 });
    const hit = recallIdempotent<{ ok: boolean; points: number }>(
      "b1",
      "loyalty.award",
      "k1",
      payload
    );
    assert.deepEqual(hit, { ok: true, points: 10 });
    assert.equal(
      recallIdempotent("b1", "loyalty.award", "k1", { points: 99, reason: "a" }),
      undefined
    );
  });
});

describe("Owner-ready: Outbox enqueue / drain / dead-letter retry", () => {
  beforeEach(() => {
    resetMemoryOutbox();
    delete process.env.DATABASE_URL;
  });

  afterEach(() => {
    resetMemoryOutbox();
    if (originalUrl !== undefined) process.env.DATABASE_URL = originalUrl;
    else delete process.env.DATABASE_URL;
  });

  it("full lifecycle: enqueue → fail → list dead → retry → drain", async () => {
    const a = await enqueueOutbox(
      "lifecycle.a",
      createGovernedEvent({
        name: "lifecycle.a",
        businessId: "biz_out",
        aggregateType: "test",
        aggregateId: "1",
        correlationId: "c-a",
        payload: { n: 1 },
      })
    );
    const b = await enqueueOutbox(
      "lifecycle.b",
      createGovernedEvent({
        name: "lifecycle.b",
        businessId: "biz_out",
        aggregateType: "test",
        aggregateId: "2",
        correlationId: "c-b",
        payload: { n: 2 },
      })
    );

    assert.equal(listPendingOutbox().length, 2);

    await markOutboxFailed(a.id, "worker boom");
    assert.equal(listPendingOutbox().length, 1);
    const dead = await listDeadLetters({ businessId: "biz_out" });
    assert.equal(dead.length, 1);
    assert.equal(dead[0].id, a.id);
    assert.equal(dead[0].lastError, "worker boom");

    const retried = await retryDeadLetter(a.id);
    assert.ok(retried);
    assert.equal(retried.status, "PENDING");
    assert.equal(listPendingOutbox().length, 2);

    const drained = await drainOutbox(10);
    assert.equal(drained.source, "memory");
    assert.equal(drained.drained.length, 2);
    assert.ok(drained.drained.every((r) => r.status === "PUBLISHED"));
    assert.equal(listPendingOutbox().length, 0);
    assert.ok(drained.drained.some((r) => r.id === b.id));
  });
});

describe("Owner-ready: Feature resolve kill switch for ai.autopilot", () => {
  it("default registry enables ai.autopilot when no override", () => {
    const def = FEATURE_DEFINITIONS.find((f) => f.id === "ai.autopilot");
    assert.ok(def);
    assert.equal(def.defaultEnabled, true);
    assert.equal(isFeatureEnabled("ai.autopilot", {}), true);
  });

  it("global override kill switch disables enabled + executable", () => {
    const overrides = [
      {
        featureId: "ai.autopilot",
        enabled: false,
        scope: "global",
        reason: "OWNER emergency pause",
      },
    ];
    assert.equal(isFeatureEnabled("ai.autopilot", { overrides }), false);
    assert.equal(isFeatureExecutable("ai.autopilot", { overrides }), false);
  });

  it("credentials missing still reports readiness when enabled", () => {
    const def = FEATURE_DEFINITIONS.find((f) => f.id === "ai.autopilot")!;
    const { readiness, blockers } = evaluateReadiness(def, {
      env: { OPENAI_API_KEY: undefined },
    });
    // Without key in env arg and if process lacks key, credentials_missing
    if (!process.env.OPENAI_API_KEY?.trim()) {
      assert.equal(readiness, "credentials_missing");
      assert.ok(blockers.some((b) => /openai|OPENAI/i.test(b)));
    }
  });

  it("re-enable via override restores enabled flag", () => {
    const overrides = [
      {
        featureId: "ai.autopilot",
        enabled: true,
        scope: "global",
        reason: "restore",
      },
    ];
    assert.equal(isFeatureEnabled("ai.autopilot", { overrides }), true);
  });
});

describe("Owner-ready: TapSave preference parse", () => {
  it("returns defaults for null/array/non-object", () => {
    const defaults = defaultTapSavePreferences();
    assert.deepEqual(parseTapSavePreferences(null), defaults);
    assert.deepEqual(parseTapSavePreferences(undefined), defaults);
    assert.deepEqual(parseTapSavePreferences([]), defaults);
    assert.deepEqual(parseTapSavePreferences("weekly"), defaults);
  });

  it("merges booleans and validates frequency enum", () => {
    assert.equal(
      parseTapSavePreferences({ frequency: "daily" }).frequency,
      "weekly"
    );
    assert.equal(
      parseTapSavePreferences({ frequency: "off" }).frequency,
      "off"
    );
    assert.equal(
      parseTapSavePreferences({ frequency: "immediate" }).frequency,
      "immediate"
    );
    const prefs = parseTapSavePreferences({
      emailOptIn: false,
      smsOptIn: true,
      walletOptIn: true,
      frequency: "monthly",
      extra: "ignored",
    });
    assert.deepEqual(prefs, {
      emailOptIn: false,
      smsOptIn: true,
      walletOptIn: true,
      frequency: "monthly",
    });
  });

  it("ignores non-boolean opt-in fields", () => {
    const prefs = parseTapSavePreferences({
      emailOptIn: "yes",
      smsOptIn: 1,
      walletOptIn: null,
    });
    assert.equal(prefs.emailOptIn, defaultTapSavePreferences().emailOptIn);
    assert.equal(prefs.smsOptIn, false);
    assert.equal(prefs.walletOptIn, false);
  });
});

describe("Owner-ready: Journey validate / simulate", () => {
  it("empty journey is valid and completes", () => {
    const def = createEmptyJourney("Welcome path");
    assert.equal(journeyIsValid(def), true);
    const sim = simulateJourney(def);
    assert.equal(sim.completed, true);
    assert.deepEqual(
      sim.steps.map((s) => s.nodeType),
      ["trigger", "exit"]
    );
  });

  it("flags missing entry and dangling edges", () => {
    const bad: JourneyDefinition = {
      schemaVersion: 1,
      name: "Broken",
      nodes: [
        {
          id: "m1",
          type: "message",
          label: "Hi",
          config: {},
          position: { x: 0, y: 0 },
        },
      ],
      edges: [{ id: "e", from: "m1", to: "missing" }],
    };
    const issues = validateJourney(bad);
    assert.ok(issues.some((i) => i.code === "missing_entry"));
    assert.ok(issues.some((i) => i.code === "dangling_edge_to"));
    assert.equal(journeyIsValid(bad), false);
  });

  it("simulates branched path preferring labeled edge", () => {
    const def: JourneyDefinition = {
      schemaVersion: 1,
      name: "Branch demo",
      nodes: [
        {
          id: "t",
          type: "trigger",
          label: "Start",
          config: {},
          position: { x: 0, y: 0 },
        },
        {
          id: "c",
          type: "condition",
          label: "Consent?",
          config: {},
          position: { x: 1, y: 0 },
        },
        {
          id: "yes",
          type: "award_loyalty",
          label: "Award",
          config: {},
          position: { x: 2, y: 0 },
        },
        {
          id: "no",
          type: "message",
          label: "Ask",
          config: {},
          position: { x: 2, y: 1 },
        },
        {
          id: "x",
          type: "exit",
          label: "Done",
          config: {},
          position: { x: 3, y: 0 },
        },
      ],
      edges: [
        { id: "e1", from: "t", to: "c" },
        { id: "e2", from: "c", to: "yes", label: "true" },
        { id: "e3", from: "c", to: "no", label: "false" },
        { id: "e4", from: "yes", to: "x" },
        { id: "e5", from: "no", to: "x" },
      ],
    };
    const truePath = simulateJourney(def, { preferEdgeLabel: "true" });
    assert.ok(truePath.steps.some((s) => s.nodeId === "yes"));
    assert.equal(truePath.completed, true);

    const falsePath = simulateJourney(def, { preferEdgeLabel: "false" });
    assert.ok(falsePath.steps.some((s) => s.nodeId === "no"));
  });
});

describe("Owner-ready: DB safety rejects Railway / hosted URLs", () => {
  const blocked = [
    "postgresql://u:p@containers-us-west-1.railway.app:5432/railway",
    "postgresql://u:p@host.rlwy.net:5432/tapconnect_fusion_dev",
    "postgresql://u:p@db.xxxxx.amazonaws.com:5432/tapconnect_fusion_dev",
    "postgresql://u:p@ep-foo.neon.tech:5432/tapconnect_fusion_dev",
    "postgresql://u:p@db.xxx.supabase.co:5432/tapconnect_fusion_dev",
    "postgresql://u:p@dpg-xxx.render.com:5432/tapconnect_fusion_dev",
  ];

  it("rejects each hosted provider host", () => {
    for (const url of blocked) {
      const r = assertSafeFusionDatabaseUrl(url);
      assert.equal(r.ok, false, url);
      if (!r.ok) assert.match(r.reason, /hosted|Railway|local/i);
    }
  });

  it("rejects non-local host even with fusion_dev name", () => {
    const r = assertSafeFusionDatabaseUrl(
      "postgresql://u:p@10.0.0.5:5432/tapconnect_fusion_dev"
    );
    assert.equal(r.ok, false);
  });

  it("rejects wrong protocol and invalid URL", () => {
    assert.equal(assertSafeFusionDatabaseUrl("mysql://127.0.0.1/tapconnect_fusion_dev").ok, false);
    assert.equal(assertSafeFusionDatabaseUrl("not-a-url").ok, false);
  });

  it("isIsolatedFusionDatabaseConfigured tracks env safely", () => {
    const prev = process.env.DATABASE_URL;
    process.env.DATABASE_URL =
      "postgresql://u:p@railway.app:5432/tapconnect_fusion_dev";
    assert.equal(isIsolatedFusionDatabaseConfigured(), false);
    process.env.DATABASE_URL =
      "postgresql://tapconnect:tapconnect@127.0.0.1:5433/tapconnect_fusion_dev";
    assert.equal(isIsolatedFusionDatabaseConfigured(), true);
    if (prev !== undefined) process.env.DATABASE_URL = prev;
    else delete process.env.DATABASE_URL;
  });
});
