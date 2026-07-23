/**
 * Wallet pass state machine — pure transitions, no I/O.
 * DRAFT → PREVIEWED → ISSUED → UPDATED → REVOKED | REPLACED | EXPIRED
 */

export type WalletPassStatus =
  | "DRAFT"
  | "PREVIEWED"
  | "ISSUED"
  | "UPDATED"
  | "REVOKED"
  | "REPLACED"
  | "EXPIRED";

export type WalletLifecycleAction =
  | "create"
  | "preview"
  | "issue"
  | "update"
  | "revoke"
  | "replace"
  | "expire";

const TRANSITIONS: Record<WalletLifecycleAction, Partial<Record<WalletPassStatus, WalletPassStatus>>> = {
  create: { DRAFT: "DRAFT" },
  preview: { DRAFT: "PREVIEWED", PREVIEWED: "PREVIEWED" },
  issue: { DRAFT: "ISSUED", PREVIEWED: "ISSUED" },
  update: { ISSUED: "UPDATED", UPDATED: "UPDATED" },
  revoke: { ISSUED: "REVOKED", UPDATED: "REVOKED", PREVIEWED: "REVOKED" },
  replace: { ISSUED: "REPLACED", UPDATED: "REPLACED" },
  expire: { ISSUED: "EXPIRED", UPDATED: "EXPIRED", PREVIEWED: "EXPIRED" },
};

export function canTransition(
  status: WalletPassStatus,
  action: WalletLifecycleAction
): boolean {
  return Boolean(TRANSITIONS[action]?.[status]);
}

export function nextStatus(
  status: WalletPassStatus,
  action: WalletLifecycleAction
): { ok: true; status: WalletPassStatus } | { ok: false; error: string } {
  const next = TRANSITIONS[action]?.[status];
  if (!next) {
    return {
      ok: false,
      error: `Cannot ${action} pass in status ${status}`,
    };
  }
  return { ok: true, status: next };
}

export function isTerminal(status: WalletPassStatus): boolean {
  return status === "REVOKED" || status === "REPLACED" || status === "EXPIRED";
}

export function isInstallable(status: WalletPassStatus): boolean {
  return status === "ISSUED" || status === "UPDATED";
}
