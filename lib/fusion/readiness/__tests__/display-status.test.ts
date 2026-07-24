import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  maturityToProvisional,
  resolveSectionReadiness,
  DISPLAY_READINESS_LABEL,
} from "../display-status";
import type { StudioSection } from "@/lib/fusion/studio/ia";

describe("display readiness derivation", () => {
  it("never promotes static owner_ready without ledger", () => {
    assert.equal(
      maturityToProvisional("owner_ready"),
      "functional_final_verification_required"
    );
  });

  it("resolves section without claiming OWNER-READY", () => {
    const section: StudioSection = {
      id: "cards",
      label: "Cards",
      href: "/dashboard/card",
      description: "Tap Card builder",
      maturity: "owner_ready",
      group: "Build",
    };
    const r = resolveSectionReadiness(section);
    assert.notEqual(r.display, "owner_ready");
    assert.equal(r.label, DISPLAY_READINESS_LABEL.functional_final_verification_required);
    // Cards ledger may already record headed proofs; residuals (blockers / missing proofs) must remain.
    assert.ok(
      r.missingDependencies.length > 0,
      "cards must retain residual blockers until OWNER-READY"
    );
    assert.ok(
      r.missingDependencies.some(
        (d) =>
          d.startsWith("proof:") ||
          d.includes("voiceover") ||
          d.includes("freeform") ||
          d.includes("not_owner")
      ),
      `expected residual gate deps, got: ${r.missingDependencies.join(", ")}`
    );
  });

  it("marks wallet credential path", () => {
    const section: StudioSection = {
      id: "wallet",
      label: "Wallet",
      href: "/dashboard/audience/wallet",
      description: "Pass lifecycle",
      maturity: "verified_needs_credentials",
      featureId: "wallet.apple_google",
      group: "Retention",
    };
    const r = resolveSectionReadiness(section);
    assert.equal(r.display, "verified_credentials_required");
  });

  it("marks email mock path as verified credentials required without Resend", () => {
    const section: StudioSection = {
      id: "email",
      label: "Email",
      href: "/dashboard/settings",
      description: "Mock adapter + suppression",
      maturity: "verified_needs_credentials",
      featureId: "comms.email",
      group: "Comms",
    };
    const r = resolveSectionReadiness(section);
    assert.equal(r.display, "verified_credentials_required");
    assert.equal(r.label, DISPLAY_READINESS_LABEL.verified_credentials_required);
    assert.ok(r.missingDependencies.some((d) => d.includes("resend") || d.includes("RESEND")));
  });

  it("marks TapCast omnichannel as credentials-required (never mock OWNER-READY)", () => {
    const section: StudioSection = {
      id: "tapcast",
      label: "TapCast",
      href: "/dashboard/experiences/tapcast",
      description: "Omnichannel social distribution",
      maturity: "verified_needs_credentials",
      featureId: "tapcast.omnichannel",
      group: "Distribution",
    };
    const r = resolveSectionReadiness(section);
    assert.equal(r.display, "verified_credentials_required");
    assert.equal(r.label, DISPLAY_READINESS_LABEL.verified_credentials_required);
    assert.notEqual(r.display, "owner_ready");
    assert.ok(
      r.missingDependencies.some(
        (d) =>
          d.includes("live_provider") ||
          d.includes("tiktok") ||
          d.includes("not_owner_ready") ||
          d.includes("provider:")
      )
    );
  });
});
