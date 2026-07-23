/**
 * Admin feature registry copy — kill-switch clarity vs executable readiness.
 */

import type { listRegistryStatus } from "./resolve";

type RegistryRow = ReturnType<typeof listRegistryStatus>[number];

const KILL_SWITCH_FEATURES = new Set([
  "comms.messaging",
  "comms.email",
  "comms.inbox",
  "wallet.apple_google",
  "journey.tapflow",
  "ai.autopilot",
  "commerce.tapcommerce",
]);

export function isKillSwitchFeature(featureId: string): boolean {
  return KILL_SWITCH_FEATURES.has(featureId);
}

export function describeActivationState(row: RegistryRow): string {
  if (row.enabled && row.executable) return "Active — routes and APIs visible";
  if (row.enabled && !row.executable) {
    return "Switch ON — blocked by credentials or dependencies (mock paths may still work)";
  }
  if (!row.enabled && row.defaultEnabled) {
    return "Kill-switch OFF — override disabled a default-on feature";
  }
  return "Off — default or override disabled";
}

export function toggleButtonLabel(row: RegistryRow): string {
  if (row.enabled) {
    return isKillSwitchFeature(row.id) ? "Kill-switch OFF" : "Disable";
  }
  return row.enabled === false && !row.defaultEnabled ? "Enable" : "Turn ON";
}

export function toggleImpactWarning(row: RegistryRow, nextEnabled: boolean): string | null {
  if (nextEnabled) return null;

  if (isKillSwitchFeature(row.id)) {
    return `Kill-switch will hide ${row.name} routes and block governed sends until re-enabled.`;
  }

  if (row.maturity === "ga" && row.defaultEnabled) {
    return `${row.name} is GA and default-on — disabling may affect live workspaces.`;
  }

  return null;
}

export function killSwitchConfirmTitle(featureName: string): string {
  return `Confirm kill-switch — ${featureName}`;
}

export function requiresToggleConfirm(row: RegistryRow, nextEnabled: boolean): boolean {
  return toggleImpactWarning(row, nextEnabled) !== null;
}

export function overrideBadge(row: RegistryRow, overrides: { featureId: string; enabled: boolean }[]): string | null {
  const override = overrides.find((o) => o.featureId === row.id);
  if (!override) return null;
  return override.enabled ? "Override: ON" : "Override: OFF (kill-switch)";
}
