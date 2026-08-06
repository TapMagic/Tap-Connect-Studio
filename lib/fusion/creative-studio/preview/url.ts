/**
 * Preview base URL reachability — never silently emit localhost QR for phones.
 * Local development prefers a LAN IP on port 3050 when available.
 */

import { networkInterfaces } from "node:os";

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

export function detectLanBaseUrl(port = 3050): string | null {
  const nets = networkInterfaces();
  for (const entries of Object.values(nets)) {
    for (const entry of entries || []) {
      if (!entry || entry.internal || entry.family !== "IPv4") continue;
      const ip = entry.address;
      if (
        ip.startsWith("10.") ||
        ip.startsWith("192.168.") ||
        /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)
      ) {
        return `http://${ip}:${port}`;
      }
    }
  }
  return null;
}

export function resolvePreviewBaseUrl(input?: {
  configured?: string | null;
  appUrl?: string | null;
  requestOrigin?: string | null;
  preferLanPort?: number;
}): PreviewBaseUrlAssessment {
  const configured =
    (input?.configured || process.env.NEXT_PUBLIC_PREVIEW_BASE_URL || "").trim();
  const appUrl =
    (input?.appUrl || process.env.NEXT_PUBLIC_APP_URL || "").trim();
  const origin = (input?.requestOrigin || "").trim();
  const lan = detectLanBaseUrl(input?.preferLanPort ?? 3050);

  const candidate = configured || appUrl || lan || origin || "http://localhost:3050";
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
        "Set NEXT_PUBLIC_PREVIEW_BASE_URL to a reachable https URL or LAN address (e.g. http://192.168.x.x:3050).",
    };
  }

  const host = parsed.hostname.toLowerCase();
  const isLocalhost =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host === "0.0.0.0";

  if (isLocalhost) {
    if (lan) {
      return {
        baseUrl: trimSlash(lan),
        reachableForPhone: true,
        isLocalhost: false,
        reason: "preview_lan_auto",
        guidance:
          "Using your LAN address. Keep the phone on the same Wi-Fi as this computer.",
      };
    }
    return {
      baseUrl: trimSlash(parsed.toString()),
      reachableForPhone: false,
      isLocalhost: true,
      reason: "preview_localhost_unreachable",
      guidance:
        "A phone cannot open localhost. Join the same Wi-Fi and set NEXT_PUBLIC_PREVIEW_BASE_URL to http://<your-lan-ip>:3050, or ensure this machine exposes a private IPv4 address.",
    };
  }

  return {
    baseUrl: trimSlash(parsed.toString()),
    reachableForPhone: true,
    isLocalhost: false,
    reason: "preview_base_url_ok",
    guidance:
      host.startsWith("192.168.") || host.startsWith("10.") || /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
        ? "Keep the phone on the same Wi-Fi as this computer."
        : null,
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
