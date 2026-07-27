/**
 * Deterministic Autopilot Brand Starter Kit fixture (local only).
 * No live crawl / search / AI. Every item starts Suggested + Needs confirmation.
 */

export type StarterProvenance =
  | "website"
  | "official_profile"
  | "autopilot"
  | "needs_confirmation";

export type StarterApprovalState =
  | "suggested"
  | "needs_confirmation"
  | "approved"
  | "kept"
  | "ignored"
  | "replaced";

export type StarterItemKind =
  | "logo_primary"
  | "logo_alternate"
  | "color_primary"
  | "color_secondary"
  | "font_body"
  | "image_hero";

export type StarterKitItem = {
  id: string;
  kind: StarterItemKind;
  label: string;
  /** Display value — URL, hex, or font id */
  value: string;
  altValue?: string;
  provenance: StarterProvenance;
  state: StarterApprovalState;
  note?: string;
};

export type BrandStarterKit = {
  id: string;
  headline: string;
  businessName: string;
  websiteHint: string;
  preparedLocally: true;
  items: StarterKitItem[];
};

export const STARTER_PROVENANCE_LABELS: Record<StarterProvenance, string> = {
  website: "From your website",
  official_profile: "From an official profile",
  autopilot: "Suggested by Autopilot",
  needs_confirmation: "Needs confirmation",
};

/** Deterministic fixture keyed by business name / website — no network. */
export function createBrandStarterKitFixture(input: {
  businessName?: string | null;
  website?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
}): BrandStarterKit {
  const name = (input.businessName || "Your business").trim() || "Your business";
  const site =
    (input.website || "").trim().replace(/^https?:\/\//, "") || "example.com";
  const seed = hashSeed(`${name}|${site}`);
  const primary =
    input.primaryColor ||
    pick(["#1a5f4a", "#0f766e", "#166534", "#1e3a5f"], seed);
  const secondary =
    input.secondaryColor ||
    pick(["#c4a35a", "#0ea5e9", "#b45309", "#6366f1"], seed + 1);
  const logoPrimary =
    input.logoUrl ||
    `data:image/svg+xml,${encodeURIComponent(logoSvg(name, primary))}`;
  const logoAlt = `data:image/svg+xml,${encodeURIComponent(
    logoSvg(name, secondary, true)
  )}`;
  const hero = `data:image/svg+xml,${encodeURIComponent(heroSvg(primary, secondary))}`;

  return {
    id: `starter-${seed.toString(16)}`,
    headline: "We found your Brand.",
    businessName: name,
    websiteHint: site,
    preparedLocally: true,
    items: [
      {
        id: "logo-primary",
        kind: "logo_primary",
        label: "Primary logo candidate",
        value: logoPrimary,
        provenance: input.logoUrl ? "official_profile" : "website",
        state: "suggested",
        note: "Needs confirmation",
      },
      {
        id: "logo-alt",
        kind: "logo_alternate",
        label: "Alternate logo",
        value: logoAlt,
        provenance: "autopilot",
        state: "needs_confirmation",
        note: "Needs confirmation",
      },
      {
        id: "color-primary",
        kind: "color_primary",
        label: "Primary color",
        value: primary,
        provenance: "website",
        state: "suggested",
        note: "Needs confirmation",
      },
      {
        id: "color-secondary",
        kind: "color_secondary",
        label: "Secondary color",
        value: secondary,
        provenance: "website",
        state: "suggested",
        note: "Needs confirmation",
      },
      {
        id: "font-body",
        kind: "font_body",
        label: "Likely body font",
        value: "sans",
        altValue: "Modern sans",
        provenance: "autopilot",
        state: "needs_confirmation",
        note: "Needs confirmation",
      },
      {
        id: "image-hero",
        kind: "image_hero",
        label: "Hero image candidate",
        value: hero,
        provenance: "website",
        state: "suggested",
        note: "Needs confirmation",
      },
    ],
  };
}

export function approveStarterItem(
  kit: BrandStarterKit,
  itemId: string
): BrandStarterKit {
  return mapItem(kit, itemId, (item) => ({ ...item, state: "approved", note: undefined }));
}

export function keepStarterItem(
  kit: BrandStarterKit,
  itemId: string
): BrandStarterKit {
  return mapItem(kit, itemId, (item) => ({ ...item, state: "kept", note: undefined }));
}

export function ignoreStarterItem(
  kit: BrandStarterKit,
  itemId: string
): BrandStarterKit {
  return mapItem(kit, itemId, (item) => ({ ...item, state: "ignored" }));
}

export function replaceStarterItem(
  kit: BrandStarterKit,
  itemId: string,
  value: string
): BrandStarterKit {
  return mapItem(kit, itemId, (item) => ({
    ...item,
    value,
    state: "replaced",
    note: "Needs confirmation",
  }));
}

/** Nothing is Brand truth until explicitly approved. */
export function isApprovedBrandTruth(state: StarterApprovalState): boolean {
  return state === "approved" || state === "kept";
}

export function pendingStarterCount(kit: BrandStarterKit): number {
  return kit.items.filter(
    (i) =>
      i.state === "suggested" ||
      i.state === "needs_confirmation" ||
      i.state === "replaced"
  ).length;
}

function mapItem(
  kit: BrandStarterKit,
  itemId: string,
  fn: (item: StarterKitItem) => StarterKitItem
): BrandStarterKit {
  return {
    ...kit,
    items: kit.items.map((i) => (i.id === itemId ? fn(i) : i)),
  };
}

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

function logoSvg(name: string, color: string, mark = false): string {
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="80" viewBox="0 0 240 80">
  <rect width="240" height="80" fill="none"/>
  <circle cx="40" cy="40" r="28" fill="${color}"/>
  <text x="40" y="46" text-anchor="middle" fill="#fff" font-family="system-ui,sans-serif" font-size="18" font-weight="700">${initials}</text>
  <text x="80" y="46" fill="${mark ? color : "#111"}" font-family="system-ui,sans-serif" font-size="20" font-weight="600">${escapeXml(name.slice(0, 18))}</text>
</svg>`;
}

function heroSvg(a: string, b: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="${a}"/><stop offset="100%" stop-color="${b}"/>
  </linearGradient></defs>
  <rect width="640" height="360" fill="url(#g)"/>
  <text x="40" y="300" fill="#fff" font-family="system-ui,sans-serif" font-size="28" font-weight="600" opacity="0.9">Brand hero</text>
</svg>`;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
