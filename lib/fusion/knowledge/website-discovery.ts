/**
 * Expanded governed homepage discovery — extracts Suggested candidates only.
 * Never invents facts, services, prices, claims, or policies.
 * Same-origin CSS/font fetches are optional and capped.
 */

import type { WebsiteFinding } from "@/lib/fusion/knowledge/website-intake";

export type DiscoveryCandidateKind =
  | "logo"
  | "favicon"
  | "app_icon"
  | "og_image"
  | "color"
  | "css_variable"
  | "font"
  | "social_link"
  | "service"
  | "imagery_direction"
  | "style_cue"
  | "voice_cue"
  | "accessibility";

export type WebsiteDiscoveryCandidate = {
  kind: DiscoveryCandidateKind;
  /** Stable key for BrandPropertyDecision / UI grouping */
  propertyKey?: string;
  value: string;
  confidence: number;
  evidence: string;
  sourceUrl?: string;
};

export type WebsiteDiscoveryBundle = {
  findings: WebsiteFinding[];
  candidates: WebsiteDiscoveryCandidate[];
};

export function socialAndServiceFacts(candidates: WebsiteDiscoveryCandidate[]) {
  const socialLinks = candidates
    .filter((candidate) => candidate.kind === "social_link")
    .map((candidate) => {
      try {
        const value = JSON.parse(candidate.value) as unknown;
        if (
          value &&
          typeof value === "object" &&
          typeof (value as { network?: unknown }).network === "string" &&
          typeof (value as { url?: unknown }).url === "string"
        ) {
          return value as { network: string; url: string };
        }
      } catch {
        return null;
      }
      return null;
    })
    .filter((entry): entry is { network: string; url: string } => Boolean(entry))
    .slice(0, 12);
  const services = candidates
    .filter((candidate) => candidate.kind === "service")
    .map((candidate) => candidate.value)
    .filter(Boolean)
    .slice(0, 20);
  return { socialLinks, services };
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 2_000);
}

function meta(html: string, key: string): string | undefined {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["'][^>]*>`,
      "i"
    ),
  ];
  for (const pattern of patterns) {
    const value = html.match(pattern)?.[1];
    if (value) return decodeHtml(value);
  }
}

const MAX_CANDIDATE_URL_LENGTH = 2_048;

function absoluteUrl(base: URL, href: string | undefined): string | undefined {
  if (!href) return undefined;
  const trimmed = decodeHtml(href);
  if (!trimmed || trimmed.length > MAX_CANDIDATE_URL_LENGTH) return undefined;
  try {
    const url = new URL(trimmed, base);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
      return undefined;
    }
    if (url.port && !["80", "443"].includes(url.port)) return undefined;
    url.hash = "";
    return url.toString();
  } catch {
    return undefined;
  }
}

function sameOrigin(base: URL, candidate: string): boolean {
  try {
    return new URL(candidate).origin === base.origin;
  } catch {
    return false;
  }
}

function jsonLdObjects(html: string): Record<string, unknown>[] {
  const results: Record<string, unknown>[] = [];
  const pattern =
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (let index = 0; index < 25; index += 1) {
    const match = pattern.exec(html);
    if (!match) break;
    if (Buffer.byteLength(match[1], "utf8") > 50_000) continue;
    try {
      const parsed = JSON.parse(match[1]) as unknown;
      const graph =
        parsed && typeof parsed === "object"
          ? (parsed as { "@graph"?: unknown })["@graph"]
          : undefined;
      const values = Array.isArray(parsed)
        ? parsed
        : Array.isArray(graph)
          ? graph
          : [parsed];
      for (const value of values) {
        if (value && typeof value === "object" && !Array.isArray(value)) {
          results.push(value as Record<string, unknown>);
        }
      }
    } catch {
      // Ignore malformed structured data.
    }
  }
  return results;
}

function addFinding(
  findings: WebsiteFinding[],
  factKey: WebsiteFinding["factKey"],
  value: unknown,
  confidence: number,
  evidence: string
) {
  if (typeof value !== "string") return;
  const normalized = decodeHtml(value);
  if (!normalized || findings.some((f) => f.factKey === factKey && f.value === normalized)) {
    return;
  }
  findings.push({ factKey, value: normalized, confidence, evidence: evidence.slice(0, 240) });
}

function addCandidate(
  candidates: WebsiteDiscoveryCandidate[],
  candidate: WebsiteDiscoveryCandidate
) {
  const value = decodeHtml(candidate.value);
  if (!value) return;
  if (
    candidates.some(
      (entry) =>
        entry.kind === candidate.kind &&
        entry.value === value &&
        entry.propertyKey === candidate.propertyKey
    )
  ) {
    return;
  }
  candidates.push({ ...candidate, value, evidence: candidate.evidence.slice(0, 240) });
}

const SOCIAL_HOSTS: Array<{ host: string; network: string }> = [
  { host: "facebook.com", network: "facebook" },
  { host: "fb.com", network: "facebook" },
  { host: "instagram.com", network: "instagram" },
  { host: "linkedin.com", network: "linkedin" },
  { host: "twitter.com", network: "x" },
  { host: "x.com", network: "x" },
  { host: "youtube.com", network: "youtube" },
  { host: "tiktok.com", network: "tiktok" },
  { host: "yelp.com", network: "yelp" },
];

function normalizeHex(raw: string): string | undefined {
  const value = raw.trim();
  const short = value.match(/^#([0-9a-f]{3})$/i);
  if (short) {
    const [r, g, b] = short[1].split("");
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  const long = value.match(/^#([0-9a-f]{6})$/i);
  return long ? `#${long[1].toLowerCase()}` : undefined;
}

function extractInlineCssBundle(html: string): string {
  const parts: string[] = [];
  const stylePattern = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  for (let i = 0; i < 20; i += 1) {
    const match = stylePattern.exec(html);
    if (!match) break;
    parts.push(match[1]);
  }
  const styleAttrs = html.match(/style=["']([^"']+)["']/gi) || [];
  for (const attr of styleAttrs.slice(0, 80)) {
    parts.push(attr);
  }
  return parts.join("\n").slice(0, 200_000);
}

function extractColorsAndFonts(
  cssText: string,
  candidates: WebsiteDiscoveryCandidate[]
) {
  const varPattern = /(--[a-zA-Z0-9-_]+)\s*:\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))/g;
  let match: RegExpExecArray | null;
  while ((match = varPattern.exec(cssText))) {
    const hex = normalizeHex(match[2]);
    if (hex) {
      addCandidate(candidates, {
        kind: "css_variable",
        propertyKey: "primaryColor",
        value: `${match[1]}=${hex}`,
        confidence: 0.55,
        evidence: `Declared CSS variable ${match[1]}`,
      });
      addCandidate(candidates, {
        kind: "color",
        propertyKey: "primaryColor",
        value: hex,
        confidence: 0.5,
        evidence: `Color from CSS variable ${match[1]}`,
      });
    }
  }

  const hexPattern = /#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g;
  const hexCounts = new Map<string, number>();
  while ((match = hexPattern.exec(cssText))) {
    const hex = normalizeHex(`#${match[1]}`);
    if (!hex || hex === "#ffffff" || hex === "#000000" || hex === "#fff" || hex === "#000") {
      continue;
    }
    hexCounts.set(hex, (hexCounts.get(hex) || 0) + 1);
  }
  const ranked = [...hexCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const roles = ["primaryColor", "secondaryColor", "accentColor", "backgroundColor", "textColor"];
  ranked.forEach(([hex, count], index) => {
    addCandidate(candidates, {
      kind: "color",
      propertyKey: roles[index] || "accentColor",
      value: hex,
      confidence: Math.min(0.75, 0.4 + count / 40),
      evidence: `Recurring homepage color (${count} mentions)`,
    });
  });

  const fontPattern = /font-family\s*:\s*([^;}{]+)/gi;
  while ((match = fontPattern.exec(cssText))) {
    const family = decodeHtml(match[1].split(",")[0]?.replace(/["']/g, "") || "");
    if (!family || /inherit|initial|system-ui|sans-serif|serif|monospace/i.test(family)) {
      continue;
    }
    addCandidate(candidates, {
      kind: "font",
      propertyKey: "fontStyle",
      value: family,
      confidence: 0.55,
      evidence: "Declared font-family on homepage",
    });
  }

  const googleFonts = cssText.match(/fonts\.googleapis\.com\/css2?\?family=([^"'&\s]+)/i);
  if (googleFonts?.[1]) {
    const family = decodeURIComponent(googleFonts[1].split(":")[0].replace(/\+/g, " "));
    addCandidate(candidates, {
      kind: "font",
      propertyKey: "fontStyle",
      value: family,
      confidence: 0.7,
      evidence: "Google Fonts stylesheet reference",
    });
  }
}

function mapFontToBrandStyle(family: string): string {
  const lower = family.toLowerCase();
  if (/playfair|garamond|times|serif|libre baskerville/.test(lower)) return "CLASSIC";
  if (/comic|fredoka|pacifico|hand|script|caveat/.test(lower)) return "PLAYFUL";
  if (/cinzel|trajan|didot|bodoni|luxury/.test(lower)) return "PREMIUM";
  if (/inter|helvetica|arial|roboto|system|dm sans|manrope|work sans/.test(lower)) {
    return "MINIMAL";
  }
  return "MODERN";
}

function extractLinkCandidates(html: string, base: URL, candidates: WebsiteDiscoveryCandidate[]) {
  const linkPattern =
    /<link[^>]+rel=["']([^"']+)["'][^>]*href=["']([^"']+)["'][^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = linkPattern.exec(html))) {
    const rel = match[1].toLowerCase();
    const href = absoluteUrl(base, match[2]);
    if (!href) continue;
    if (rel.includes("icon") && !rel.includes("apple")) {
      addCandidate(candidates, {
        kind: "favicon",
        propertyKey: "logo",
        value: href,
        confidence: 0.6,
        evidence: `link rel=${rel}`,
        sourceUrl: href,
      });
    }
    if (rel.includes("apple-touch-icon")) {
      addCandidate(candidates, {
        kind: "app_icon",
        propertyKey: "alternateMark",
        value: href,
        confidence: 0.65,
        evidence: "Apple touch icon",
        sourceUrl: href,
      });
    }
  }

  const imgPattern =
    /<img[^>]+(?:src|data-src)=["']([^"']+)["'][^>]*(?:alt=["']([^"']*)["'])?/gi;
  while ((match = imgPattern.exec(html))) {
    const src = absoluteUrl(base, match[1]);
    const alt = (match[2] || "").toLowerCase();
    if (!src) continue;
    if (/logo|brand|mark/i.test(src) || /logo|brand/.test(alt)) {
      addCandidate(candidates, {
        kind: "logo",
        propertyKey: "logo",
        value: src,
        confidence: 0.7,
        evidence: alt ? `Image alt: ${alt}` : "Image filename suggests logo",
        sourceUrl: src,
      });
    }
  }

  const ogImage = absoluteUrl(base, meta(html, "og:image"));
  if (ogImage) {
    addCandidate(candidates, {
      kind: "og_image",
      propertyKey: "imageryDirection",
      value: ogImage,
      confidence: 0.75,
      evidence: "Open Graph image",
      sourceUrl: ogImage,
    });
  }

  const anchorPattern = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi;
  while ((match = anchorPattern.exec(html))) {
    const href = absoluteUrl(base, match[1]);
    if (!href) continue;
    try {
      const host = new URL(href).hostname.replace(/^www\./, "");
      const social = SOCIAL_HOSTS.find((entry) => host === entry.host || host.endsWith(`.${entry.host}`));
      if (social) {
        addCandidate(candidates, {
          kind: "social_link",
          value: JSON.stringify({ network: social.network, url: href }),
          confidence: 0.85,
          evidence: `Homepage link to ${social.network}`,
          sourceUrl: href,
        });
      }
    } catch {
      // skip
    }
  }
}

function extractJsonLdExtras(
  objects: Record<string, unknown>[],
  findings: WebsiteFinding[],
  candidates: WebsiteDiscoveryCandidate[],
  finalUrl: URL
) {
  for (const object of objects) {
    const type = object["@type"];
    const types = Array.isArray(type) ? type : [type];
    const isBusiness = types.some(
      (entry) =>
        typeof entry === "string" &&
        ["Organization", "LocalBusiness", "ProfessionalService", "Person"].includes(entry)
    );
    if (!isBusiness) continue;

    const sameAs = object.sameAs;
    const links = Array.isArray(sameAs) ? sameAs : typeof sameAs === "string" ? [sameAs] : [];
    for (const link of links) {
      if (typeof link !== "string") continue;
      try {
        const host = new URL(link).hostname.replace(/^www\./, "");
        const social = SOCIAL_HOSTS.find(
          (entry) => host === entry.host || host.endsWith(`.${entry.host}`)
        );
        if (social) {
          addCandidate(candidates, {
            kind: "social_link",
            value: JSON.stringify({ network: social.network, url: link }),
            confidence: 0.9,
            evidence: "JSON-LD sameAs",
            sourceUrl: link,
          });
        }
      } catch {
        // skip
      }
    }

    const logo = object.logo;
    if (typeof logo === "string") {
      const normalized = absoluteUrl(finalUrl, logo);
      if (normalized) {
        addCandidate(candidates, {
          kind: "logo",
          propertyKey: "logo",
          value: normalized,
          confidence: 0.9,
          evidence: "JSON-LD logo",
          sourceUrl: normalized,
        });
      }
    } else if (logo && typeof logo === "object" && !Array.isArray(logo)) {
      const url = (logo as Record<string, unknown>).url;
      if (typeof url === "string") {
        const normalized = absoluteUrl(finalUrl, url);
        if (normalized) {
          addCandidate(candidates, {
            kind: "logo",
            propertyKey: "logo",
            value: normalized,
            confidence: 0.9,
            evidence: "JSON-LD logo.url",
            sourceUrl: normalized,
          });
        }
      }
    }

    const makesOffer = object.makesOffer;
    const offers = Array.isArray(makesOffer) ? makesOffer : makesOffer ? [makesOffer] : [];
    for (const offer of offers.slice(0, 8)) {
      if (!offer || typeof offer !== "object") continue;
      const record = offer as Record<string, unknown>;
      const name =
        typeof record.name === "string"
          ? record.name
          : typeof record.itemOffered === "object" &&
              record.itemOffered &&
              typeof (record.itemOffered as Record<string, unknown>).name === "string"
            ? String((record.itemOffered as Record<string, unknown>).name)
            : null;
      if (!name) continue;
      // Never invent prices — only store the declared name.
      addCandidate(candidates, {
        kind: "service",
        value: name,
        confidence: 0.8,
        evidence: "JSON-LD makesOffer name (no price inferred)",
      });
    }

    if (typeof object.slogan === "string") {
      addCandidate(candidates, {
        kind: "voice_cue",
        propertyKey: "voiceCue",
        value: object.slogan,
        confidence: 0.7,
        evidence: "JSON-LD slogan",
      });
    }
  }
}

function extractCueCandidates(html: string, candidates: WebsiteDiscoveryCandidate[]) {
  const themeColor = meta(html, "theme-color");
  const themeHex = themeColor ? normalizeHex(themeColor) : undefined;
  if (themeHex) {
    addCandidate(candidates, {
      kind: "color",
      propertyKey: "primaryColor",
      value: themeHex,
      confidence: 0.8,
      evidence: "theme-color meta",
    });
  }

  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1];
  if (title) {
    addCandidate(candidates, {
      kind: "style_cue",
      propertyKey: "styleCue",
      value: decodeHtml(title).slice(0, 120),
      confidence: 0.35,
      evidence: "Document title (style cue only — not a fact)",
    });
  }

  const hasAltGaps = (html.match(/<img\b(?![^>]*\balt=)/gi) || []).length;
  if (hasAltGaps > 0) {
    addCandidate(candidates, {
      kind: "accessibility",
      propertyKey: "accessibility",
      value: `${hasAltGaps} image(s) without alt attributes observed on homepage`,
      confidence: 0.6,
      evidence: "Homepage HTML scan — contrast/claim not invented",
    });
  }
}

/**
 * Extract findings + Suggested discovery candidates from homepage HTML.
 * Optional sameOriginCssText may include fetched same-origin stylesheets.
 */
export function extractHomepageDiscovery(
  html: string,
  finalUrl: URL,
  opts?: { sameOriginCssText?: string }
): WebsiteDiscoveryBundle {
  const findings: WebsiteFinding[] = [];
  const candidates: WebsiteDiscoveryCandidate[] = [];

  addFinding(findings, "website", finalUrl.origin, 1, "Final homepage URL");
  addFinding(findings, "businessName", meta(html, "og:site_name"), 0.85, "Open Graph site name");
  addFinding(
    findings,
    "description",
    meta(html, "og:description") || meta(html, "description"),
    0.75,
    "Homepage description metadata"
  );

  const objects = jsonLdObjects(html);
  for (const object of objects) {
    const type = object["@type"];
    const types = Array.isArray(type) ? type : [type];
    if (
      !types.some(
        (entry) =>
          typeof entry === "string" &&
          ["Organization", "LocalBusiness", "ProfessionalService", "Person"].includes(entry)
      )
    ) {
      continue;
    }
    addFinding(findings, "businessName", object.name, 0.9, "Homepage structured data");
    addFinding(findings, "phone", object.telephone, 0.85, "Homepage structured data");
    addFinding(findings, "email", object.email, 0.85, "Homepage structured data");
    const address = object.address;
    if (typeof address === "string") {
      addFinding(findings, "address", address, 0.85, "Homepage structured data");
    } else if (address && typeof address === "object" && !Array.isArray(address)) {
      const record = address as Record<string, unknown>;
      const fullAddress = [
        record.streetAddress,
        record.addressLocality,
        record.addressRegion,
        record.postalCode,
      ]
        .filter((part): part is string => typeof part === "string" && Boolean(part.trim()))
        .join(", ");
      addFinding(findings, "address", fullAddress, 0.85, "Homepage structured data");
      addFinding(findings, "city", record.addressLocality, 0.85, "Homepage structured data");
      addFinding(findings, "state", record.addressRegion, 0.85, "Homepage structured data");
    }
  }

  extractJsonLdExtras(objects, findings, candidates, finalUrl);
  extractLinkCandidates(html, finalUrl, candidates);
  const cssBundle = [extractInlineCssBundle(html), opts?.sameOriginCssText || ""].join("\n");
  extractColorsAndFonts(cssBundle, candidates);
  extractCueCandidates(html, candidates);

  // Map first declared font to a licensed/local Brand fontStyle match (suggestion only).
  const fontCandidate = candidates.find((c) => c.kind === "font");
  if (fontCandidate) {
    addCandidate(candidates, {
      kind: "font",
      propertyKey: "fontStyle",
      value: mapFontToBrandStyle(fontCandidate.value),
      confidence: 0.45,
      evidence: `Local Brand font match for declared face "${fontCandidate.value}"`,
    });
  }

  if (candidates.some((c) => c.kind === "og_image" || c.kind === "logo")) {
    addCandidate(candidates, {
      kind: "imagery_direction",
      propertyKey: "imageryDirection",
      value: "Use Owner-approved homepage imagery direction only after review",
      confidence: 0.4,
      evidence: "Homepage imagery candidates observed — direction not invented",
    });
  }

  // Cap volume — Owner reviews a shortlist, not a crawl dump.
  return {
    findings: findings.slice(0, 24),
    candidates: candidates.slice(0, 40),
  };
}

export function listSameOriginStylesheetUrls(html: string, finalUrl: URL): string[] {
  const urls: string[] = [];
  const pattern =
    /<link[^>]+rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html))) {
    const href = absoluteUrl(finalUrl, match[1]);
    if (href && sameOrigin(finalUrl, href)) urls.push(href);
  }
  return urls.slice(0, 3);
}

export { mapFontToBrandStyle };
