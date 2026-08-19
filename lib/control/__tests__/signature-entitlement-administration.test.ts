import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  resolveSignatureEntitlementInspection,
  type GovernedEntitlementLayer,
} from "@/lib/control/signature-entitlement-administration";
import { assertControlPermission, type ControlActor } from "@/lib/control/identity";
import { performControlMutation } from "@/lib/control/mutations";
import { CABINET_NOIR_FAMILY } from "@/lib/fusion/creative-studio/signature-assets/cabinet-noir";

const service = { id: "service-1", status: "ACTIVE", defaultEnabled: false };

function inspect(input: {
  plan?: boolean;
  overrides?: readonly GovernedEntitlementLayer[];
  restrictions?: readonly GovernedEntitlementLayer[];
}) {
  return resolveSignatureEntitlementInspection({
    businessId: "business-1",
    businessName: "Acceptance Business",
    family: CABINET_NOIR_FAMILY,
    service,
    plan: input.plan === undefined ? null : { source: "Plan entitlement", enabled: input.plan },
    overrides: input.overrides,
    restrictions: input.restrictions,
    now: new Date("2026-08-18T12:00:00Z"),
  })!;
}

function actor(permissions: ControlActor["permissions"]): ControlActor {
  return {
    id: "actor-1",
    clerkId: "local:actor",
    displayName: "Actor",
    email: "actor@example.test",
    imageUrl: null,
    profilePhotoAlt: null,
    adapter: "local",
    recentAuthentication: true,
    environment: "local",
    permissions,
    roleNames: [],
  };
}

describe("controlled Signature entitlement administration", () => {
  it("inspects independently visible, selectable, and publishable state", () => {
    const result = inspect({});
    assert.equal(result.effective.enabled, false);
    assert.deepEqual(result.effective.access, { visible: true, selectable: false, publishable: false });
    assert.equal(result.entitlementKey, "signature.family.cabinet_noir");
    assert.equal(result.businessId, "business-1");
  });

  it("an authorized override grant updates effective access", () => {
    const result = inspect({
      overrides: [{ id: "grant-1", source: "Authorized grant", enabled: true, status: "ACTIVE" }],
    });
    assert.equal(result.effective.enabled, true);
    assert.deepEqual(result.effective.access, { visible: true, selectable: true, publishable: true });
    assert.deepEqual(result.activeOverrideIds, ["grant-1"]);
  });

  it("an active service restriction revokes effective access", () => {
    const result = inspect({
      plan: true,
      overrides: [{ id: "grant-1", source: "Authorized grant", enabled: true, status: "ACTIVE" }],
      restrictions: [{ id: "restriction-1", source: "Administrative revoke", enabled: false }],
    });
    assert.equal(result.effective.enabled, false);
    assert.equal(result.effective.access.selectable, false);
    assert.equal(result.effective.access.publishable, false);
    assert.deepEqual(result.activeRestrictionIds, ["restriction-1"]);
  });

  it("stronger restrictions preserve precedence over a later grant", () => {
    const result = inspect({
      overrides: [{ id: "grant-later", source: "Later grant", enabled: true, startsAt: "2026-08-18T11:00:00Z" }],
      restrictions: [{ id: "restriction-earlier", source: "Account restriction", enabled: false, startsAt: "2026-08-18T10:00:00Z" }],
    });
    assert.equal(result.effective.enabled, false);
    assert.match(result.effective.explanation.at(-1) ?? "", /restriction blocks final access/);
  });

  it("restoration re-enables the unchanged grant without rewriting content", () => {
    const grant = [{ id: "grant-1", source: "Authorized grant", enabled: true, status: "ACTIVE" }] as const;
    const revoked = inspect({ overrides: grant, restrictions: [{ id: "restriction-1", source: "Revoke", enabled: false }] });
    const restored = inspect({ overrides: grant, restrictions: [] });
    assert.equal(revoked.effective.access.publishable, false);
    assert.equal(restored.effective.access.publishable, true);
    assert.deepEqual(restored.activeOverrideIds, ["grant-1"]);
  });

  it("expired and restored restrictions no longer affect access", () => {
    const result = inspect({
      plan: true,
      restrictions: [
        { id: "expired", source: "Expired", enabled: false, expiresAt: "2026-08-18T11:59:59Z" },
        { id: "restored", source: "Restored", enabled: false, revokedAt: "2026-08-18T11:00:00Z" },
      ],
    });
    assert.equal(result.effective.enabled, true);
    assert.deepEqual(result.activeRestrictionIds, []);
  });

  it("authorized internal operators can grant and restrict through existing permissions", () => {
    const authorized = actor([
      { permission: "entitlements.override", effect: "ALLOW", source: "Platform Operator" },
      { permission: "entitlements.restrict", effect: "ALLOW", source: "Platform Operator" },
    ]);
    assert.doesNotThrow(() => assertControlPermission(authorized, "entitlements.override", "business-1"));
    assert.doesNotThrow(() => assertControlPermission(authorized, "entitlements.restrict", "business-1"));
  });

  it("ordinary Hosts cannot grant or revoke family entitlements", async () => {
    const ordinaryHost = actor([]);
    assert.throws(() => assertControlPermission(ordinaryHost, "entitlements.override", "business-1"), /Forbidden/);
    assert.throws(() => assertControlPermission(ordinaryHost, "entitlements.restrict", "business-1"), /Forbidden/);
    await assert.rejects(
      performControlMutation(ordinaryHost, {
        operation: "entitlement.override",
        data: { businessId: "business-1", serviceId: "service-1", reason: "Unauthorized grant" },
      }),
      /Forbidden/,
    );
    await assert.rejects(
      performControlMutation(ordinaryHost, {
        operation: "entitlement.restrict",
        data: { businessId: "business-1", serviceId: "service-1", reason: "Unauthorized revoke" },
      }),
      /Forbidden/,
    );
  });

  it("keeps generic administration free of family-specific branches", () => {
    const genericAuthorities = [
      "lib/control/signature-entitlement-administration.ts",
      "lib/control/snapshot.ts",
      "lib/control/mutations.ts",
      "components/control/control-room.tsx",
    ];
    for (const file of genericAuthorities) {
      assert.doesNotMatch(readFileSync(file, "utf8"), /cabinet[_ -]?noir|CN-\d+/i);
    }
    assert.doesNotMatch(resolveSignatureEntitlementInspection.toString(), /cabinet[_ -]?noir|CN-\d+/i);
  });

  it("records entitlement key and outcome without billing payloads in mutation audits", () => {
    const implementation = readFileSync("lib/control/mutations.ts", "utf8");
    assert.match(implementation, /outcome: "granted"[\s\S]*entitlementKey: override\.service\.key/);
    assert.match(implementation, /outcome: "restricted"[\s\S]*entitlementKey: service\.key/);
    assert.match(implementation, /outcome: "restored"[\s\S]*entitlementKey: service\.key/);
    assert.doesNotMatch(implementation, /next: override,/);
  });
});
