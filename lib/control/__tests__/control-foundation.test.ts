import assert from "node:assert/strict";
import test from "node:test";
import {
  PLATFORM_PERMISSIONS,
  ROLE_TEMPLATES,
  comparePermissionSets,
  resolveEffectivePermission,
  resolvePermissionSet,
} from "@/lib/control/permissions";
import { calculateEffectiveEntitlement } from "@/lib/control/entitlements";
import { resolvePresenceState } from "@/lib/control/presence";
import { demoPolicyDecision, demoReadiness, DEMO_BLOCKED_ACTIONS } from "@/lib/control/demo-policy";
import { supportSessionAllows, supportSessionIsActive } from "@/lib/control/support-policy";
import { approvalDecisionAllowed } from "@/lib/control/approval-policy";
import {
  businessLifecycleTransition,
  invitationTransition,
  permanentDeletionDecision,
  sandboxAccessDecision,
} from "@/lib/control/lifecycle";
import { availableCommands, executeCommand } from "@/lib/control/commands";
import { searchControlRecords } from "@/lib/control/search";
import { redactAuditValue } from "@/lib/control/audit";

test("permission catalog contains every required wave-one namespace", () => {
  for (const permission of [
    "platform.dashboard.view",
    "users.support_impersonate",
    "businesses.legal_hold",
    "entitlements.unlimited_grant",
    "demo.bind_landing",
    "approvals.approve",
    "platform.security_policy.manage",
  ]) {
    assert.equal(PLATFORM_PERMISSIONS.includes(permission as never), true);
  }
  assert.equal(new Set(PLATFORM_PERMISSIONS).size, PLATFORM_PERMISSIONS.length);
});

test("role templates are granular and Platform Owner is protected", () => {
  const owner = ROLE_TEMPLATES.find((role) => role.key === "platform-owner");
  const operator = ROLE_TEMPLATES.find((role) => role.key === "platform-operator");
  assert.ok(owner?.protected);
  assert.ok(owner?.ownerRole);
  assert.equal(owner?.permissions.length, PLATFORM_PERMISSIONS.length);
  assert.equal(operator?.permissions.includes("entitlements.unlimited_grant"), false);
  assert.equal(ROLE_TEMPLATES.some((role) => role.key === "demo-manager"), true);
  assert.equal(ROLE_TEMPLATES.some((role) => role.key === "auditor"), true);
});

test("DENY overrides ALLOW and explains both sources", () => {
  const effective = resolveEffectivePermission({
    permission: "entitlements.view",
    environment: "local",
    assignments: [
      { permission: "entitlements.view", effect: "ALLOW", source: "Platform Operator", environmentScope: "local" },
      { permission: "entitlements.view", effect: "DENY", source: "Direct billing denial", environmentScope: "local" },
    ],
  });
  assert.equal(effective.allowed, false);
  assert.match(effective.explanation[0], /Direct billing denial/);
  assert.equal(effective.sources.length, 2);
});

test("permission evaluation respects environment, business, and expiry", () => {
  const now = new Date("2026-07-31T12:00:00Z");
  const assignments = [
    { permission: "businesses.edit", effect: "ALLOW" as const, source: "Role", environmentScope: "staging" },
    { permission: "businesses.edit", effect: "ALLOW" as const, source: "Scoped role", environmentScope: "local", businessId: "b1" },
    { permission: "businesses.edit", effect: "DENY" as const, source: "Expired deny", environmentScope: "local", businessId: "b1", expiresAt: "2026-07-30T00:00:00Z" },
  ];
  assert.equal(resolveEffectivePermission({ permission: "businesses.edit", assignments, environment: "local", businessId: "b1", now }).allowed, true);
  assert.equal(resolveEffectivePermission({ permission: "businesses.edit", assignments, environment: "local", businessId: "b2", now }).allowed, false);
});

test("global business scope applies to any business", () => {
  const effective = resolveEffectivePermission({
    permission: "businesses.view",
    environment: "local",
    businessId: "business-123",
    assignments: [{ permission: "businesses.view", effect: "ALLOW", source: "Role", environmentScope: "local", businessId: "*" }],
  });
  assert.equal(effective.allowed, true);
});

test("permission set and role comparison expose sources", () => {
  const resolved = resolvePermissionSet({
    environment: "local",
    assignments: [{ permission: "users.view", effect: "ALLOW", source: "Auditor" }],
  });
  assert.equal(resolved.get("users.view")?.allowed, true);
  assert.equal(resolved.get("users.edit")?.allowed, false);
  assert.deepEqual(comparePermissionSets(["a", "b"], ["b", "c"]), {
    onlyLeft: ["a"],
    onlyRight: ["c"],
    shared: ["b"],
  });
});

test("effective entitlement follows plan plus overrides minus restrictions", () => {
  const effective = calculateEffectiveEntitlement({
    plan: { source: "Plan: Studio", enabled: true, allowance: 10 },
    overrides: [{ source: "Temporary grant", enabled: true, allowance: 25 }],
    restrictions: [{ source: "Publishing restriction", enabled: false }],
  });
  assert.equal(effective.enabled, false);
  assert.equal(effective.allowance, 25);
  assert.match(effective.explanation.at(-1) ?? "", /restriction blocks/);
});

test("expired entitlement layers no longer affect final access", () => {
  const effective = calculateEffectiveEntitlement({
    overrides: [{ source: "Expired grant", enabled: true, expiresAt: "2026-01-01T00:00:00Z" }],
    now: new Date("2026-07-31T00:00:00Z"),
  });
  assert.equal(effective.enabled, false);
  assert.match(effective.explanation[0], /No plan/);
});

test("presence resolves privacy-respecting states", () => {
  const now = new Date("2026-07-31T12:00:00Z");
  assert.equal(resolvePresenceState({ now, lastHeartbeatAt: "2026-07-31T11:59:30Z", authenticatedSessionActive: true }), "Online");
  assert.equal(resolvePresenceState({ now, lastMeaningfulActivityAt: "2026-07-31T11:50:00Z", authenticatedSessionActive: true }), "Recently active");
  assert.equal(resolvePresenceState({ now, lastMeaningfulActivityAt: "2026-07-31T10:00:00Z", authenticatedSessionActive: true }), "Signed in but idle");
  assert.equal(resolvePresenceState({ now, authenticatedSessionActive: false }), "Offline");
});

test("support session blocks every sensitive action in policy", () => {
  for (const action of ["roles.assign", "refund.create", "email.send", "publication.publish", "demo.bind_landing"]) {
    assert.equal(supportSessionAllows(action).allowed, false, action);
  }
  assert.equal(supportSessionAllows("businesses.view").allowed, true);
});

test("support sessions expire deterministically", () => {
  const now = new Date("2026-07-31T12:00:00Z");
  assert.equal(supportSessionIsActive({ status: "ACTIVE", expiresAt: "2026-07-31T12:30:00Z" }, now), true);
  assert.equal(supportSessionIsActive({ status: "ACTIVE", expiresAt: "2026-07-31T11:59:59Z" }, now), false);
  assert.equal(supportSessionIsActive({ status: "EXITED", expiresAt: "2026-07-31T12:30:00Z" }, now), false);
});

test("demo safety blocks sends, money movement, imports, and hardware assignment", () => {
  for (const action of DEMO_BLOCKED_ACTIONS) assert.equal(demoPolicyDecision(action).allowed, false);
  assert.equal(demoPolicyDecision("card.preview").allowed, true);
});

test("demo readiness requires DEMO kind, provenance, all blocks, and Card snapshot", () => {
  const ready = demoReadiness({
    workspaceKind: "DEMO",
    fixtureProvenance: "Local fixtures",
    blockedActions: [...DEMO_BLOCKED_ACTIONS],
    hasCardSnapshot: true,
  });
  assert.equal(ready.passed, true);
  const unsafe = demoReadiness({
    workspaceKind: "CUSTOMER",
    fixtureProvenance: null,
    blockedActions: [],
    hasCardSnapshot: false,
  });
  assert.equal(unsafe.passed, false);
  assert.ok(unsafe.issues.length > DEMO_BLOCKED_ACTIONS.size);
});

test("approval separation prevents requester self-approval", () => {
  const base = {
    requesterId: "rich",
    separationRequired: true,
    status: "PENDING",
    expiresAt: "2026-08-01T00:00:00Z",
    now: new Date("2026-07-31T00:00:00Z"),
  };
  assert.equal(approvalDecisionAllowed({ ...base, approverId: "rich" }).allowed, false);
  assert.equal(approvalDecisionAllowed({ ...base, approverId: "daniel" }).allowed, true);
});

test("approval expiration and terminal state are enforced", () => {
  assert.equal(approvalDecisionAllowed({
    requesterId: "rich",
    approverId: "daniel",
    separationRequired: true,
    status: "PENDING",
    expiresAt: "2026-07-30T00:00:00Z",
    now: new Date("2026-07-31T00:00:00Z"),
  }).allowed, false);
  assert.equal(approvalDecisionAllowed({
    requesterId: "rich",
    approverId: "daniel",
    separationRequired: true,
    status: "APPROVED",
    expiresAt: "2026-08-01T00:00:00Z",
    now: new Date("2026-07-31T00:00:00Z"),
  }).allowed, false);
});

test("invitation lifecycle accepts only lawful transitions", () => {
  assert.equal(invitationTransition("DRAFT", "SENT").allowed, true);
  assert.equal(invitationTransition("SENT", "ACCEPTED").allowed, true);
  assert.equal(invitationTransition("ACCEPTED", "SENT").allowed, false);
  assert.equal(invitationTransition("REVOKED", "ACCEPTED").allowed, false);
});

test("business lifecycle refuses destructive shortcuts", () => {
  assert.equal(businessLifecycleTransition({ from: "ACTIVE", to: "DELETED", hasLegalHold: false }).allowed, false);
  assert.equal(businessLifecycleTransition({ from: "DELETION_SCHEDULED", to: "DELETED", hasLegalHold: true, gracePeriodComplete: true, recentAuthentication: true, secondApproval: true }).allowed, false);
  assert.equal(businessLifecycleTransition({ from: "DELETION_SCHEDULED", to: "DELETED", hasLegalHold: false, gracePeriodComplete: true, recentAuthentication: true, secondApproval: true }).allowed, true);
});

test("permanent deletion requires every safeguard", () => {
  const safe = { legalHold: false, gracePeriodComplete: true, recentAuthentication: true, typedConfirmation: true, secondApproval: true };
  assert.equal(permanentDeletionDecision(safe).allowed, true);
  for (const key of Object.keys(safe) as (keyof typeof safe)[]) {
    const unsafe = { ...safe, [key]: key === "legalHold" ? true : false };
    assert.equal(permanentDeletionDecision(unsafe).allowed, false, key);
  }
});

test("private sandboxes are isolated unless explicitly governed", () => {
  assert.equal(sandboxAccessDecision({ sandboxOwnerId: "rich", actorId: "daniel", explicitlyInvited: false, governedSupportSession: false }).allowed, false);
  assert.equal(sandboxAccessDecision({ sandboxOwnerId: "rich", actorId: "rich", explicitlyInvited: false, governedSupportSession: false }).allowed, true);
  assert.equal(sandboxAccessDecision({ sandboxOwnerId: "rich", actorId: "daniel", explicitlyInvited: true, governedSupportSession: false }).allowed, true);
  assert.equal(sandboxAccessDecision({ sandboxOwnerId: "rich", actorId: "daniel", explicitlyInvited: false, governedSupportSession: true }).allowed, true);
});

test("command palette never executes consequential commands directly", () => {
  const commands = availableCommands(new Set(["users.invite", "users.view"]));
  const invite = commands.find((command) => command.id === "invite-admin");
  const users = commands.find((command) => command.id === "users");
  assert.deepEqual(executeCommand(invite!), { kind: "prepare", action: "invite-administrator" });
  assert.deepEqual(executeCommand(users!), { kind: "navigate", href: "/control?section=users" });
});

test("global search excludes records without required permission", () => {
  const records = [
    { id: "u1", type: "user" as const, title: "Daniel", context: "Operator", keywords: ["daniel@example.test"], href: "/control?section=users", requiredPermission: "users.view" as const },
    { id: "a1", type: "audit" as const, title: "Daniel changed role", context: "correlation-1", keywords: [], href: "/control?section=audit", requiredPermission: "audit.view" as const },
  ];
  const results = searchControlRecords({ query: "Daniel", records, allowedPermissions: new Set(["users.view"]) });
  assert.deepEqual(results.map((record) => record.id), ["u1"]);
});

test("audit redaction removes secrets recursively", () => {
  const value = redactAuditValue({
    ok: "visible",
    token: "never",
    nested: { passwordHash: "never", harmless: 7 },
    list: [{ credential: "never" }],
  }) as Record<string, unknown>;
  assert.equal(value.ok, "visible");
  assert.equal(value.token, "[REDACTED]");
  assert.deepEqual(value.nested, { passwordHash: "[REDACTED]", harmless: 7 });
  assert.deepEqual(value.list, [{ credential: "[REDACTED]" }]);
});

