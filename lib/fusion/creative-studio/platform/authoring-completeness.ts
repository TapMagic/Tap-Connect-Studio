import type { StudioAuthoringCapabilityContract } from "./authoring-contract";

export const STUDIO_AUTHORING_COMPLETENESS_CONTRACT = "studioAuthoringCompleteness@1.0.0" as const;

export type StudioDeclaredCapabilityClassification =
  | "editable-reachable"
  | "preserved-read-only"
  | "governed"
  | "deliberately-deferred";

export type StudioDeclaredAuthoringCapability = {
  contractId: typeof STUDIO_AUTHORING_COMPLETENESS_CONTRACT;
  id: string;
  label: string;
  classification: StudioDeclaredCapabilityClassification;
  applicable: boolean;
  stateAuthority?: string;
  compilerAuthority?: string;
  rendererAuthority?: string;
  persistenceAuthority?: string;
  validationAuthority?: string;
  historyAuthority?: string;
  controlId?: string;
  commandId?: string;
  parityAuthorities?: readonly ("canvas" | "preview" | "public" | "live-device")[];
  visualAcceptance?: {
    fitContractId: string;
    rendererMapping: string;
    normalResourcePolicy: "governed-default" | "host-confirmed-crop";
    incompatibleResourcePolicy: "safe-fallback" | "reject-with-guidance";
    runtimeInspectionRequired: true;
  };
  deferralReason?: string;
};

export type StudioAuthoringCompletenessIssue = {
  capabilityId: string;
  code: "missing-authority" | "unreachable-control" | "undeclared-command" | "fake-deferred-control" | "missing-deferral" | "missing-visual-acceptance";
  message: string;
};

/**
 * Enforces the declared-capability rule at the adapter boundary. A capability
 * cannot be called editable merely because state and a renderer happen to exist.
 */
export function auditStudioAuthoringCompleteness(
  declarations: readonly StudioDeclaredAuthoringCapability[],
  contract: StudioAuthoringCapabilityContract,
): readonly StudioAuthoringCompletenessIssue[] {
  const controls = contract.groups.flatMap((group) => group.controls);
  const issues: StudioAuthoringCompletenessIssue[] = [];
  for (const declaration of declarations.filter((candidate) => candidate.applicable)) {
    const control = declaration.controlId ? controls.find((candidate) => candidate.id === declaration.controlId) : undefined;
    if (declaration.classification === "editable-reachable") {
      const requiredAuthorities = [
        ["state", declaration.stateAuthority],
        ["compiler", declaration.compilerAuthority],
        ["renderer", declaration.rendererAuthority],
        ["persistence", declaration.persistenceAuthority],
        ["validation", declaration.validationAuthority],
        ["history", declaration.historyAuthority],
      ] as const;
      for (const [name, authority] of requiredAuthorities) {
        if (!authority) issues.push({ capabilityId: declaration.id, code: "missing-authority", message: `${declaration.label} is missing its ${name} authority.` });
      }
      if (!declaration.controlId || !control) issues.push({ capabilityId: declaration.id, code: "unreachable-control", message: `${declaration.label} is declared editable but has no reachable shared-shell control.` });
      if (!declaration.commandId || !contract.commandIds.includes(declaration.commandId) || control?.commandId !== declaration.commandId) issues.push({ capabilityId: declaration.id, code: "undeclared-command", message: `${declaration.label} is not routed through one declared canonical command.` });
      const parity = new Set(declaration.parityAuthorities ?? []);
      for (const surface of ["canvas", "preview", "public", "live-device"] as const) {
        if (!parity.has(surface)) issues.push({ capabilityId: declaration.id, code: "missing-authority", message: `${declaration.label} does not declare ${surface} parity.` });
      }
      if (control?.type === "asset-slot" && control.slot.semanticRole !== "icon") {
        const visual = declaration.visualAcceptance;
        if (!visual?.fitContractId || !visual.rendererMapping || visual.runtimeInspectionRequired !== true) {
          issues.push({ capabilityId: declaration.id, code: "missing-visual-acceptance", message: `${declaration.label} is visual but does not declare a governed fit and runtime-inspection acceptance authority.` });
        }
      }
    }
    if (declaration.classification === "deliberately-deferred") {
      if (!declaration.deferralReason) issues.push({ capabilityId: declaration.id, code: "missing-deferral", message: `${declaration.label} is deferred without an explicit reason.` });
      if (control) issues.push({ capabilityId: declaration.id, code: "fake-deferred-control", message: `${declaration.label} is deferred but still exposed as an actionable control.` });
    }
  }
  return issues;
}

export function declaredAuthoringCapability(
  input: Omit<StudioDeclaredAuthoringCapability, "contractId">,
): StudioDeclaredAuthoringCapability {
  return { ...input, contractId: STUDIO_AUTHORING_COMPLETENESS_CONTRACT };
}

export function assertStudioAuthoringCompleteness(
  declarations: readonly StudioDeclaredAuthoringCapability[],
  contract: StudioAuthoringCapabilityContract,
) {
  const issues = auditStudioAuthoringCompleteness(declarations, contract);
  if (issues.length) throw new Error(issues.map((issue) => issue.message).join(" "));
  return contract;
}
