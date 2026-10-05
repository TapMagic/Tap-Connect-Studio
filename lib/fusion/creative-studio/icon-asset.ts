/**
 * Canonical IconAsset model + SVG sanitize/normalize for Iconify and built-ins.
 * Client-safe — no server-only imports.
 */
import { siApplemusic, siBandsintown, siFacebook, siInstagram, siSpotify, siYoutube } from "simple-icons";

export type IconRenderMode = "fill" | "stroke" | "multicolor";

export type IconAsset = Readonly<{
  provider: "iconify" | "native";
  collection: string;
  iconName: string;
  canonicalId: string;
  body: string;
  viewBox: string;
  width: number;
  height: number;
  renderMode: IconRenderMode;
  license?: { title?: string; spdx?: string; url?: string };
  source: string;
  fetchedAt: string;
  accessibleLabel?: string;
  canonicalReference?: string;
  compatibility?: readonly string[];
  attribution?: string;
}>;

const FORBIDDEN_SVG =
  /<\s*(script|foreignObject|iframe|object|embed)\b/i;
const FORBIDDEN_ATTR =
  /\s(on\w+|href\s*=\s*["']?\s*javascript:|xlink:href\s*=\s*["']?\s*javascript:)/i;

/** Strip executable / hostile SVG constructs. Keeps paths and presentation attrs. */
export function sanitizeSvg(raw: string): string | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed.includes("<svg")) return null;
  if (FORBIDDEN_SVG.test(trimmed) || FORBIDDEN_ATTR.test(trimmed)) {
    // Remove forbidden tags/attrs rather than reject when paths remain.
    const cleaned = trimmed
      .replace(/<\s*script\b[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, "")
      .replace(/<\s*foreignObject\b[^>]*>[\s\S]*?<\s*\/\s*foreignObject\s*>/gi, "")
      .replace(/\son\w+\s*=\s*(["']).*?\1/gi, "")
      .replace(/\son\w+\s*=\s*[^\s>]+/gi, "")
      .replace(/\s(?:href|xlink:href)\s*=\s*(["'])\s*javascript:[^"']*\1/gi, "");
    if (!cleaned.includes("<svg") || FORBIDDEN_SVG.test(cleaned)) return null;
    return normalizeSvgMarkup(cleaned);
  }
  return normalizeSvgMarkup(trimmed);
}

export function normalizeSvgMarkup(svg: string): string {
  let next = svg.trim();
  if (!/viewBox\s*=/i.test(next)) {
    const width = next.match(/\bwidth\s*=\s*["']?([\d.]+)/i)?.[1] || "24";
    const height = next.match(/\bheight\s*=\s*["']?([\d.]+)/i)?.[1] || "24";
    next = next.replace(/<svg\b/i, `<svg viewBox="0 0 ${width} ${height}"`);
  }
  // Force currentColor so Fill/Stroke editors can recolor.
  if (!/fill\s*=/i.test(next) && !/stroke\s*=/i.test(next)) {
    next = next.replace(/<svg\b/i, `<svg fill="currentColor"`);
  }
  return next;
}

export function parseViewBox(svg: string): { viewBox: string; width: number; height: number } {
  const match = svg.match(/viewBox\s*=\s*["']([^"']+)["']/i);
  const viewBox = match?.[1] || "0 0 24 24";
  const parts = viewBox.split(/[\s,]+/).map(Number);
  const width = Number.isFinite(parts[2]) ? parts[2] : 24;
  const height = Number.isFinite(parts[3]) ? parts[3] : 24;
  return { viewBox, width, height };
}

export function detectIconRenderMode(svg: string): IconRenderMode {
  const hasFill = /fill\s*=\s*["'](?!none)[^"']+["']/i.test(svg) || /fill\s*=\s*currentColor/i.test(svg);
  const hasStroke = /stroke\s*=\s*["'](?!none)[^"']+["']/i.test(svg) || /stroke\s*=\s*currentColor/i.test(svg);
  const colorCount = new Set(
    [...svg.matchAll(/(?:fill|stroke)\s*=\s*["'](#[0-9a-f]{3,8}|rgb[^"']+|hsl[^"']+)["']/gi)].map((m) => m[1].toLowerCase())
  ).size;
  if (colorCount >= 2) return "multicolor";
  if (hasStroke && !hasFill) return "stroke";
  return "fill";
}

export function createIconAsset(input: {
  provider: "iconify" | "native";
  collection: string;
  iconName: string;
  svg: string;
  source?: string;
  license?: IconAsset["license"];
  fetchedAt?: string;
  accessibleLabel?: string;
  canonicalReference?: string;
  compatibility?: readonly string[];
  attribution?: string;
}): IconAsset | null {
  const body = sanitizeSvg(input.svg);
  if (!body) return null;
  const { viewBox, width, height } = parseViewBox(body);
  return Object.freeze({
    provider: input.provider,
    collection: input.collection,
    iconName: input.iconName,
    canonicalId: `${input.collection}:${input.iconName}`,
    body,
    viewBox,
    width,
    height,
    renderMode: detectIconRenderMode(body),
    license: input.license,
    source: input.source || `https://icon-sets.iconify.design/${input.collection}/${input.iconName}/`,
    fetchedAt: input.fetchedAt || new Date().toISOString(),
    accessibleLabel: input.accessibleLabel,
    canonicalReference: input.canonicalReference,
    compatibility: input.compatibility,
    attribution: input.attribution,
  });
}

/** Built-in recommended icons — real SVG bodies, never provisional diamonds. */
export const NATIVE_ICON_SVGS: Record<string, string> = {
  sparkles:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/></svg>',
  "map-pin":
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>',
  phone:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
  mail:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7"/></svg>',
  "arrow-up-right":
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg>',
  heart:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>',
  play:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 3 14 9-14 9z"/></svg>',
  globe:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 0 20M12 2a15.3 15.3 0 0 0 0 20"/></svg>',
  lock:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  microphone:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3"/></svg>',
  shirt:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.1l.58 4.02a1 1 0 0 0 1.14.85l2-.34V22h12V10.09l2 .34a1 1 0 0 0 1.14-.85l.58-4.02a2 2 0 0 0-1.34-2.1Z"/></svg>',
  "calendar-days":
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/></svg>',
  star:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/></svg>',
  ticket:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/></svg>',
  tag:
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/></svg>',
};

const PLATFORM_ICON_SOURCE_DATE = "2026-09-28T00:00:00.000Z";
const platformIcons = [
  ["spotify", "Spotify", siSpotify],
  ["apple-music", "Apple Music", siApplemusic],
  ["youtube", "YouTube", siYoutube],
  ["instagram", "Instagram", siInstagram],
  ["facebook", "Facebook", siFacebook],
  ["bandsintown", "Bandsintown", siBandsintown],
] as const;

/** Reusable approved platform marks. No family owns or copies this artwork. */
export const CANONICAL_PLATFORM_ICON_ASSETS: readonly IconAsset[] = platformIcons.map(([iconName, label, icon]) => createIconAsset({
  provider: "native",
  collection: "simple-icons",
  iconName,
  svg: icon.svg,
  source: icon.source,
  fetchedAt: PLATFORM_ICON_SOURCE_DATE,
  accessibleLabel: label,
  canonicalReference: `simple-icons:${icon.slug}`,
  compatibility: ["curated-semantic-icon", "standard-icon", "standalone-icon"],
  attribution: `${label} mark via simple-icons; source authority: ${icon.source}`,
})!).filter(Boolean);

const semanticNativeIcons = [
  ["play", "Play"], ["map-pin", "Directions"], ["globe", "Website"], ["phone", "Phone"],
  ["ticket", "Tickets"], ["calendar-days", "Calendar"], ["star", "Featured"], ["lock", "Exclusive access"],
  ["microphone", "Podcast"], ["shirt", "Merch"], ["heart", "Support"],
] as const;

/** Reusable non-brand semantic artwork for every governed family and standalone Icon consumer. */
export const CANONICAL_NATIVE_SEMANTIC_ICON_ASSETS: readonly IconAsset[] = semanticNativeIcons.map(([iconName, label]) => createIconAsset({
  provider: "native",
  collection: "lucide",
  iconName,
  svg: NATIVE_ICON_SVGS[iconName],
  source: "tapconnect-native",
  fetchedAt: PLATFORM_ICON_SOURCE_DATE,
  accessibleLabel: label,
  canonicalReference: `lucide:${iconName}`,
  compatibility: ["curated-semantic-icon", "standard-icon", "standalone-icon"],
  attribution: `${label} mark via the TapConnect-approved Lucide source set.`,
})!).filter(Boolean);

export const CANONICAL_SEMANTIC_ICON_ASSETS: readonly IconAsset[] = [
  ...CANONICAL_NATIVE_SEMANTIC_ICON_ASSETS,
  ...CANONICAL_PLATFORM_ICON_ASSETS,
];

export function nativeIconAsset(iconId: string): IconAsset | null {
  const registered = CANONICAL_SEMANTIC_ICON_ASSETS.find((asset) => asset.iconName === iconId || asset.canonicalId === iconId);
  if (registered) return registered;
  const svg = NATIVE_ICON_SVGS[iconId];
  if (!svg) return null;
  return createIconAsset({ provider: "native", collection: "lucide", iconName: iconId, svg, source: "tapconnect-native" });
}

export function canonicalIconAsset(canonicalId: string): IconAsset | null {
  return CANONICAL_SEMANTIC_ICON_ASSETS.find((asset) => asset.canonicalId === canonicalId) ?? nativeIconAsset(canonicalId);
}

/** Default bare Icon Element — SVG only; no backing Surface chrome. */
export function bareIconDefaults(renderMode: IconRenderMode = "stroke"): Record<string, unknown> {
  return {
    fill: "#b8ff2c",
    stroke: "#b8ff2c",
    strokeWidth: renderMode === "stroke" ? 2 : 0,
    opacity: 1,
    glow: 0,
    shadow: 0,
    blur: 0,
    backingSurfaceEnabled: false,
    boxFill: "transparent",
    boxGradient: undefined,
    boxShadow: 0,
    boxGlow: 0,
    borderWidth: 0,
    borderStyle: "none",
    borderColor: "transparent",
    radius: 0,
  };
}

/** Props written onto a composition Icon node from an IconAsset (replace-safe). */
export function iconAssetToNodeProps(asset: IconAsset): Record<string, unknown> {
  return {
    ...bareIconDefaults(asset.renderMode),
    icon: asset.canonicalId,
    iconProvider: asset.provider,
    iconCollection: asset.collection,
    iconName: asset.iconName,
    iconSource: asset.source,
    iconSvg: asset.body,
    iconViewBox: asset.viewBox,
    iconRenderMode: asset.renderMode,
    iconLicense: asset.license?.spdx || asset.license?.title,
    iconFetchedAt: asset.fetchedAt,
    fillBehavior: asset.renderMode === "stroke" ? undefined : "currentColor",
    strokeBehavior: asset.renderMode === "fill" ? undefined : "currentColor",
  };
}

/** Replace Icon content while preserving identity, geometry, action, motion, a11y, backing. */
export function replaceIconContentProps(
  current: Record<string, unknown>,
  asset: IconAsset
): Record<string, unknown> {
  const preserve = [
    "accessibleLabel",
    "decorative",
    "actionType",
    "href",
    "trackingName",
    "motionPreset",
    "motionIntensity",
    "motionSpeedSeconds",
    "motionDelaySeconds",
    "motionPlay",
    "motionTrigger",
    "reducedMotionFallback",
    "backingSurfaceEnabled",
    "boxFill",
    "boxGradient",
    "boxShadow",
    "boxGlow",
    "borderWidth",
    "borderStyle",
    "borderColor",
    "radius",
    "opacity",
    "fill",
    "stroke",
    "strokeWidth",
    "glow",
    "shadow",
    "blur",
    "containerId",
    "aspectLocked",
  ] as const;
  const next: Record<string, unknown> = { ...current, ...iconAssetToNodeProps(asset) };
  for (const key of preserve) {
    if (current[key] !== undefined) next[key] = current[key];
  }
  if (!next.accessibleLabel) next.accessibleLabel = asset.iconName;
  return next;
}
