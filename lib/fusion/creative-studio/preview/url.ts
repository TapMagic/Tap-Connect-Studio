/**
 * Preview base URL reachability — never silently emit localhost QR for phones.
 */

export type PreviewBaseUrlAssessment = {
  baseUrl: string;
  reachableForPhone: boolean;
  isLocalhost: boolean;
  reason: string;
  guidance: string | null;
};

function trimSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

export function resolvePreviewBaseUrl(input?: {
  configured?: string | null;
  appUrl?: string | null;
  requestOrigin?: string | null;
}): PreviewBaseUrlAssessment {
  const configured =
    (input?.configured || process.env.NEXT_PUBLIC_PREVIEW_BASE_URL || "").trim();
  const appUrl =
    (input?.appUrl || process.env.NEXT_PUBLIC_APP_URL || "").trim();
  const origin = (input?.requestOrigin || "").trim();

  const candidate = configured || appUrl || origin || "http://localhost:3000";
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return {
      baseUrl: candidate,
      reachableForPhone: false,
      isLocalhost: true,
      reason: "preview_base_url_invalid",
      guidance:
        "Set NEXT_PUBLIC_PREVIEW_BASE_URL to a reachable https URL or LAN address.",
    };
  }

  const host = parsed.hostname.toLowerCase();
  const isLocalhost =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host === "0.0.0.0";

  if (isLocalhost) {
    return {
      baseUrl: trimSlash(parsed.toString()),
      reachableForPhone: false,
      isLocalhost: true,
      reason: "preview_localhost_unreachable",
      guidance:
        "A phone cannot open localhost. Use a LAN IP (e.g. http://192.168.x.x:3000), a hosted development domain, or set NEXT_PUBLIC_PREVIEW_BASE_URL.",
    };
  }

  return {
    baseUrl: trimSlash(parsed.toString()),
    reachableForPhone: true,
    isLocalhost: false,
    reason: "preview_base_url_ok",
    guidance: null,
  };
}

export function buildPreviewAbsoluteUrl(
  path: string,
  assessment?: PreviewBaseUrlAssessment
): { url: string; assessment: PreviewBaseUrlAssessment } {
  const a = assessment ?? resolvePreviewBaseUrl();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return { url: `${a.baseUrl}${normalized}`, assessment: a };
}
