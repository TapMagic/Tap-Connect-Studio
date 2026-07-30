/**
 * Same-tab navigation law.
 *
 * Internal Studio navigation stays in the current browser tab by default.
 * A new tab is allowed only when explicitly indicated and genuinely useful.
 * Every exception must show ↗ and clear wording.
 */

export type DetachedNavReason =
  | "full_workspace"
  | "email_console"
  | "preview_as_customer"
  | "published_card"
  | "live_device_preview"
  | "external_provider"
  | "external_legal"
  | "explicit_new_tab";

export type DetachedNavException = {
  reason: DetachedNavReason;
  /** Human label that must include ↗ when rendered. */
  label: string;
  hrefPattern: RegExp | string;
};

/** Explicit Owner-visible new-tab exceptions (href match helpers for audits/tests). */
export const DETACHED_NAV_EXCEPTIONS: DetachedNavException[] = [
  {
    reason: "full_workspace",
    label: "Open full workspace ↗",
    hrefPattern: /\/dashboard\/(card\/edit|brand\/edit|workbench|experiences\/canvas)/,
  },
  {
    reason: "email_console",
    label: "Email console ↗",
    hrefPattern: /email/i,
  },
  {
    reason: "preview_as_customer",
    label: "Preview as customer ↗",
    hrefPattern: /\/(preview\/card|t\/|mytap\/|offer\/)/,
  },
  {
    reason: "published_card",
    label: "Open published Card ↗",
    hrefPattern: /\/t\//,
  },
  {
    reason: "live_device_preview",
    label: "Live Device Preview ↗",
    hrefPattern: /live.?device|device.?preview/i,
  },
  {
    reason: "external_provider",
    label: "Open provider ↗",
    hrefPattern: /^https?:\/\//,
  },
  {
    reason: "external_legal",
    label: "Open legal page ↗",
    hrefPattern: /\/(privacy|terms|legal)/,
  },
  {
    reason: "explicit_new_tab",
    label: "Open in new tab ↗",
    hrefPattern: /[?&]detach=1/,
  },
];

export function isInternalStudioHref(href: string): boolean {
  if (!href) return false;
  if (href.startsWith("#")) return true;
  if (href.startsWith("/")) {
    return (
      href.startsWith("/dashboard") ||
      href.startsWith("/onboarding") ||
      href.startsWith("/auth") ||
      href.startsWith("/sign-")
    );
  }
  return false;
}

/**
 * Internal Studio destinations must not open with target=_blank unless the
 * caller opts into an explicit detached exception.
 */
export function assertSameTabNavigation(opts: {
  href: string;
  targetBlank?: boolean;
  explicitDetach?: boolean;
}): { allowed: boolean; reason: string } {
  const { href, targetBlank = false, explicitDetach = false } = opts;
  if (!targetBlank) {
    return { allowed: true, reason: "same_tab_default" };
  }
  if (explicitDetach) {
    return { allowed: true, reason: "explicit_detach" };
  }
  if (!isInternalStudioHref(href) && /^https?:\/\//.test(href)) {
    return { allowed: true, reason: "external_url" };
  }
  if (isInternalStudioHref(href)) {
    return {
      allowed: false,
      reason: "internal_studio_must_stay_same_tab",
    };
  }
  return { allowed: true, reason: "non_studio_href" };
}

export function withDetachMarker(label: string): string {
  return label.includes("↗") ? label : `${label} ↗`;
}
