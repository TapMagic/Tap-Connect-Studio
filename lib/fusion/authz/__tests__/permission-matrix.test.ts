import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { listPermissionMatrix, roleCan } from "../permission-matrix";

describe("permission matrix", () => {
  it("blocks viewers from publish", () => {
    assert.equal(roleCan("viewer", "campaign.publish"), false);
    assert.equal(roleCan("editor", "campaign.publish"), true);
  });

  it("reserves feature overrides for platform admin", () => {
    assert.equal(roleCan("owner", "feature.override"), false);
    assert.equal(roleCan("platform_admin", "feature.override"), true);
  });

  it("exposes full matrix", () => {
    assert.ok(listPermissionMatrix().length >= 10);
  });
});
