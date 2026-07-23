/**
 * Machine-checkable subset of A11Y_RUNTIME_CHECKLIST — structural helpers only.
 * Does not replace manual VoiceOver/keyboard OWNER-READY pass (P-17).
 */

export type A11yStructuralCheck = {
  id: string;
  surface: string;
  requirement: string;
  codeHint: string;
};

export const A11Y_STRUCTURAL_CHECKS: A11yStructuralCheck[] = [
  {
    id: "a11y-nav-current",
    surface: "Studio nav",
    requirement: "Current nav item exposes aria-current=page",
    codeHint: "components/dashboard/nav.tsx",
  },
  {
    id: "a11y-mytap-skip",
    surface: "MyTap",
    requirement: "Skip link to preferences; logo alt text",
    codeHint: "app/mytap/[relationshipId]/page.tsx",
  },
  {
    id: "a11y-insights-text",
    surface: "Insights",
    requirement: "KPIs and failure metrics as text + CSV export",
    codeHint: "app/dashboard/insights/page.tsx",
  },
  {
    id: "a11y-admin-tabs",
    surface: "Platform Admin",
    requirement: "Tab labels not icon-only; evidence badges as text",
    codeHint: "components/fusion/admin/platform-admin-tabs.tsx",
  },
  {
    id: "a11y-wallet-status",
    surface: "Wallet",
    requirement: "Lifecycle status as text not color-only",
    codeHint: "components/fusion/wallet/wallet-pass-manager.tsx",
  },
];

export function assertA11yStructuralInventory(): { ok: true; count: number } {
  if (A11Y_STRUCTURAL_CHECKS.length < 5) {
    throw new Error("A11y structural inventory too thin");
  }
  return { ok: true, count: A11Y_STRUCTURAL_CHECKS.length };
}
