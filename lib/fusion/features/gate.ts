/**
 * Pure feature gate checks for pages and API routes.
 */

import { isFeatureEnabled, type ResolveContext } from "./resolve";

export type FeatureGateResult =
  | { ok: true }
  | { ok: false; featureId: string; message: string };

export function checkFeatureGate(
  featureId: string,
  ctx: ResolveContext,
  message?: string
): FeatureGateResult {
  if (isFeatureEnabled(featureId, ctx)) return { ok: true };
  return {
    ok: false,
    featureId,
    message:
      message ??
      `${featureId} is disabled — enable it in Platform Admin → Feature Registry`,
  };
}

/** Pass when any listed feature is enabled (e.g. comms.inbox | comms.email). */
export function checkAnyFeatureGate(
  featureIds: string[],
  ctx: ResolveContext,
  message?: string
): FeatureGateResult {
  if (featureIds.some((id) => isFeatureEnabled(id, ctx))) return { ok: true };
  return {
    ok: false,
    featureId: featureIds.join("|"),
    message:
      message ??
      `Required feature disabled — enable one of ${featureIds.join(", ")} in Platform Admin`,
  };
}

export function featureGateJsonBody(gate: Extract<FeatureGateResult, { ok: false }>) {
  return {
    error: gate.message,
    code: "feature_off" as const,
    feature: gate.featureId,
    placeholder: true,
  };
}
