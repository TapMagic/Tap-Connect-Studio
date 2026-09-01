import { STUDIO_AUTHORING_CAPABILITY_CONTRACT, type StudioAuthoringCapabilityContract } from "../../platform/authoring-contract";

/** Test-only second-family fixture. It must never enter discovery or customer UI. */
export const SYNTHETIC_GOVERNED_AUTHORING: StudioAuthoringCapabilityContract = {
  contractId: STUDIO_AUTHORING_CAPABILITY_CONTRACT,
  id: "syntheticGovernedAuthoring@9.0.0-test",
  version: "9.0.0",
  adapterAuthority: "synthetic-test-fixture",
  subject: { kind: "curated-system", familyId: "test-only-orbit" },
  selectionLevels: ["module", "module-internal"],
  groups: [{
    id: "orbit",
    label: "Orbit pattern",
    level: "module",
    controls: [
      { id: "orbit-count", label: "Satellites", type: "count-stepper", value: 3, options: [3, 5, 8], commandId: "synthetic.orbit.count" },
      { id: "orbit-tone", label: "Tone", type: "segmented", value: "quiet", options: [{ id: "quiet", label: "Quiet", availability: "enabled" }, { id: "signal", label: "Signal", availability: "disabled", disabledReason: "Signal requires the test-only broadcast entitlement." }], commandId: "synthetic.orbit.tone", entitlementKey: "test.orbit.broadcast" },
      { id: "orbit-appearance", label: "Appearance", type: "appearance-status", roles: [{ id: "halo", label: "Halo", optionLabel: "Ion glass", preview: "#75e7ff", governed: false }] },
    ],
  }],
  commandIds: ["synthetic.orbit.count", "synthetic.orbit.tone"],
  previewAuthority: "synthetic-test-renderer",
  persistenceAuthority: "shared-test-document",
  historyAuthority: "shared-test-history",
  entitlementKeys: ["test.orbit.broadcast"],
  tapItCommandIds: ["synthetic.orbit.count"],
};
