/**
 * Wallet pass evidence labels + install-link gating (pure, no I/O).
 */

import { labelEvidence, type EvidenceClass } from "@/lib/fusion/insights/tapproof";
import {
  canTransition,
  isInstallable,
  isTerminal,
  type WalletLifecycleAction,
  type WalletPassStatus,
} from "./lifecycle";

export type WalletEvidenceClass = Extract<EvidenceClass, "confirmed" | "modeled" | "incomplete">;

export function walletPassEvidenceClass(
  status: WalletPassStatus,
  mock: boolean
): WalletEvidenceClass {
  if (status === "DRAFT" || status === "PREVIEWED") return "incomplete";
  if (mock && (status === "ISSUED" || status === "UPDATED")) return "modeled";
  return "confirmed";
}

export function labelWalletEvidence(evidenceClass: WalletEvidenceClass): string {
  return labelEvidence(evidenceClass);
}

export function walletReplaceConfirmCopy(): string {
  return "Replace retires this pass (REPLACED) and creates a new DRAFT successor. Continue?";
}

export function walletReplaceOutcomeMessage(input: {
  oldSerial: string;
  newSerial: string;
}): string {
  return `Pass ${input.oldSerial.slice(0, 12)}… replaced — new draft ${input.newSerial.slice(0, 12)}… created. Issue the successor to restore install links.`;
}

export function walletInstallLinkAllowed(
  status: WalletPassStatus,
  featureEnabled: boolean
): boolean {
  return featureEnabled && isInstallable(status);
}

export function allowedWalletActions(status: WalletPassStatus): WalletLifecycleAction[] {
  const actions: WalletLifecycleAction[] = [
    "preview",
    "issue",
    "update",
    "revoke",
    "replace",
  ];
  return actions.filter((action) => canTransition(status, action));
}

export function walletStatusHint(status: WalletPassStatus): string {
  if (isTerminal(status)) return "Terminal — no further lifecycle actions";
  if (isInstallable(status)) return "Install link available when feature is on";
  if (status === "PREVIEWED") return "Preview ready — issue to enable install";
  return "Draft — preview or issue when ready";
}
