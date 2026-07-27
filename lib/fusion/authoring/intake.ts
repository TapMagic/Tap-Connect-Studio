/**
 * Local-only Brand intake stubs — file, URL, website, paste text, paste hex.
 * Website URL resolves through deterministic fixture behavior only (no live crawl).
 */

import {
  createBrandStarterKitFixture,
  type BrandStarterKit,
} from "./brand-starter-kit";

export type IntakeMethod =
  | "file_upload"
  | "asset_url"
  | "website_url"
  | "pasted_text"
  | "pasted_hex";

export type IntakeResult =
  | {
      ok: true;
      method: IntakeMethod;
      preparedLocally: true;
      starter?: BrandStarterKit;
      colors?: string[];
      assetUrl?: string;
      textSnippet?: string;
      message: string;
    }
  | {
      ok: false;
      method: IntakeMethod;
      preparedLocally: true;
      message: string;
      offerManual: true;
    };

const HEX_RE = /#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g;

export function intakeFromWebsiteUrl(
  url: string,
  ctx: { businessName?: string | null; logoUrl?: string | null }
): IntakeResult {
  const trimmed = url.trim();
  if (!trimmed) {
    return {
      ok: false,
      method: "website_url",
      preparedLocally: true,
      message: "Enter a website address to prepare a Brand shortlist locally.",
      offerManual: true,
    };
  }
  let host = trimmed;
  try {
    host = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`).hostname;
  } catch {
    host = trimmed.replace(/^https?:\/\//, "").split("/")[0] || trimmed;
  }
  // Deterministic empty discovery for known empty hosts
  if (/^(localhost|127\.0\.0\.1|empty\.invalid)$/i.test(host)) {
    return {
      ok: false,
      method: "website_url",
      preparedLocally: true,
      message:
        "Nothing usable was prepared from that address. Upload a logo or paste colors to continue.",
      offerManual: true,
    };
  }
  const starter = createBrandStarterKitFixture({
    businessName: ctx.businessName || host.split(".")[0],
    website: host,
    logoUrl: ctx.logoUrl,
  });
  return {
    ok: true,
    method: "website_url",
    preparedLocally: true,
    starter,
    message: "Prepared a Brand shortlist from local fixtures for review.",
  };
}

export function intakeFromAssetUrl(url: string): IntakeResult {
  const trimmed = url.trim();
  if (!trimmed || !/^https?:\/\//i.test(trimmed) && !trimmed.startsWith("data:")) {
    return {
      ok: false,
      method: "asset_url",
      preparedLocally: true,
      message: "Paste an exact image URL (https://…) or data URI.",
      offerManual: true,
    };
  }
  return {
    ok: true,
    method: "asset_url",
    preparedLocally: true,
    assetUrl: trimmed,
    message: "Asset URL ready — review on the Logos or Images topic.",
  };
}

export function intakeFromPastedText(text: string): IntakeResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return {
      ok: false,
      method: "pasted_text",
      preparedLocally: true,
      message: "Paste brand copy or notes to keep for review.",
      offerManual: true,
    };
  }
  const colors = Array.from(trimmed.matchAll(HEX_RE)).map((m) => m[0]);
  return {
    ok: true,
    method: "pasted_text",
    preparedLocally: true,
    textSnippet: trimmed.slice(0, 500),
    colors: colors.length ? colors : undefined,
    message: colors.length
      ? `Captured notes and ${colors.length} color value(s).`
      : "Captured notes for Brand review.",
  };
}

export function intakeFromPastedHex(raw: string): IntakeResult {
  const parts = raw
    .split(/[\s,;]+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => (p.startsWith("#") ? p : `#${p}`));
  const colors = parts.filter((p) =>
    /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(p)
  );
  if (!colors.length) {
    return {
      ok: false,
      method: "pasted_hex",
      preparedLocally: true,
      message: "Paste one or more hex colors like #1a5f4a.",
      offerManual: true,
    };
  }
  return {
    ok: true,
    method: "pasted_hex",
    preparedLocally: true,
    colors,
    message: `${colors.length} color(s) ready to review.`,
  };
}

export function intakeFromFileName(fileName: string): IntakeResult {
  if (!fileName.trim()) {
    return {
      ok: false,
      method: "file_upload",
      preparedLocally: true,
      message: "Choose an image file to add to your library.",
      offerManual: true,
    };
  }
  return {
    ok: true,
    method: "file_upload",
    preparedLocally: true,
    assetUrl: `local-upload:${fileName}`,
    message: "File staged for the logo/image library (uses MediaPicker when saving).",
  };
}
