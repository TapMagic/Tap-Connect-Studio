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
    assert.ok(r.missingDependencies.some((d) => d.startsWith("proof:")));
  });

  it("marks wallet credential path", () => {
    const section: StudioSection = {
      id: "wallet",
      label: "Wallet",
      href: "/dashboard/audience/wallet",
      description: "Pass lifecycle",
      maturity: "verified_needs_credentials",
      featureId: "wallet.passes",
      group: "Retention",
    };
    const r = resolveSectionReadiness(section);
    assert.equal(r.display, "verified_credentials_required");
  });
});
