import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ownerSeverityFromOps,
  worstOwnerSeverity,
} from "@/lib/fusion/ux/owner-status";
import {
  applyOwnerLanguage,
  ownerMaturityLabel,
  ownerReadinessForDisplay,
} from "@/lib/fusion/ux/owner-language";
import {
  assertSameTabNavigation,
  withDetachMarker,
} from "@/lib/fusion/ux/same-tab-navigation";
import { OWNER_FACING_READINESS_LABEL } from "@/lib/fusion/readiness/display-status";

describe("owner status severity", () => {
  it("maps ops statuses onto Owner severities", () => {
    assert.equal(ownerSeverityFromOps("ok"), "success");
    assert.equal(ownerSeverityFromOps("warn"), "attention");
    assert.equal(ownerSeverityFromOps("critical"), "error");
    assert.equal(ownerSeverityFromOps("neutral"), "info");
  });

  it("ranks error above attention", () => {
    assert.equal(worstOwnerSeverity(["success", "attention", "error"]), "error");
  });
});

describe("owner language", () => {
  it("replaces banned Owner phrases", () => {
    assert.equal(
      applyOwnerLanguage("Make and ship around the Card"),
      "Create and run experiences around the Card"
    );
    assert.equal(applyOwnerLanguage("Calm"), "Nothing needs your attention");
    assert.equal(
      applyOwnerLanguage("Unresolved decisions"),
      "Items that need your review"
    );
  });

  it("maps maturity jargon to Owner labels", () => {
    assert.equal(ownerMaturityLabel("provider-gated"), "Needs connection");
    assert.equal(ownerMaturityLabel("Functional"), "Available");
    assert.equal(ownerMaturityLabel("Legacy"), "Coming later");
  });

  it("keeps engineering DisplayReadiness out of Owner chrome", () => {
    assert.equal(
      OWNER_FACING_READINESS_LABEL.functional_final_verification_required,
      "Available"
    );
    assert.equal(ownerReadinessForDisplay("development").label, "Coming later");
    assert.match(
      OWNER_FACING_READINESS_LABEL.functional_final_verification_required,
      /^Available$/
    );
  });
});

describe("same-tab navigation law", () => {
  it("allows same-tab internal navigation", () => {
    assert.equal(
      assertSameTabNavigation({ href: "/dashboard/card", targetBlank: false }).allowed,
      true
    );
  });

  it("denies surprise new tabs for internal Studio routes", () => {
    const result = assertSameTabNavigation({
      href: "/dashboard/assets",
      targetBlank: true,
      explicitDetach: false,
    });
    assert.equal(result.allowed, false);
    assert.equal(result.reason, "internal_studio_must_stay_same_tab");
  });

  it("allows explicit detached exceptions and external URLs", () => {
    assert.equal(
      assertSameTabNavigation({
        href: "/dashboard/card/edit",
        targetBlank: true,
        explicitDetach: true,
      }).allowed,
      true
    );
    assert.equal(
      assertSameTabNavigation({
        href: "https://example.com/provider",
        targetBlank: true,
      }).allowed,
      true
    );
  });

  it("adds ↗ markers for detached labels", () => {
    assert.equal(withDetachMarker("Preview as customer"), "Preview as customer ↗");
    assert.equal(withDetachMarker("Open ↗"), "Open ↗");
  });
});
