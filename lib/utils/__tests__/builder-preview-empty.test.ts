import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  campaignPreviewEmptyReason,
  tapCardPreviewEmptyReason,
} from "../builder-preview-empty";

describe("builder preview empty reasons", () => {
  it("detects empty campaign page vs email-only blocks", () => {
    assert.equal(campaignPreviewEmptyReason([]), "no_blocks");
    assert.equal(
      campaignPreviewEmptyReason([{ enabled: true, channel: "email" }]),
      "email_only"
    );
    assert.equal(
      campaignPreviewEmptyReason([{ enabled: true, channel: "page" }]),
      null
    );
    assert.equal(
      campaignPreviewEmptyReason([{ enabled: false, channel: "page" }]),
      "all_disabled"
    );
  });

  it("detects empty tap card segments", () => {
    assert.equal(tapCardPreviewEmptyReason([]), "no_blocks");
    assert.equal(tapCardPreviewEmptyReason([{ enabled: false }]), "all_disabled");
    assert.equal(tapCardPreviewEmptyReason([{ enabled: true }]), null);
  });
});
