/**
 * Preview base URL reachability — never silently emit localhost QR for phones.
 * Prefer an explicit public URL; otherwise translate the actual request origin
 * (preserving port) onto a LAN hostname when available.
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

export function portFromOrigin(origin: string | null | undefined, fallback = 3000): number {
  if (!origin) return fallback;
  try {
    const parsed = new URL(origin);
    if (parsed.port) return Number(parsed.port);
    return parsed.protocol === "https:" ? 443 : 80;
  } catch {
    return fallback;
  }
}

export function detectLanBaseUrl(port: number): string | null {
  let nets: ReturnType<typeof networkInterfaces>;
  try {
    nets = networkInterfaces();
  } catch {
    return null;
  }
  for (const entries of Object.values(nets)) {
    for (const entry of entries || []) {
      if (!entry || entry.internal) continue;
      const family = String(entry.family);
      if (family !== "IPv4" && family !== "4") continue;
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

function isLoopbackHost(host: string): boolean {
  const h = host.toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "::1" || h === "0.0.0.0";
}

function isPrivateLanHost(host: string): boolean {
  return (
    host.startsWith("192.168.") ||
    host.startsWith("10.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
  );
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
  const port =
    input?.preferLanPort ??
    (portFromOrigin(origin) ||
      portFromOrigin(appUrl) ||
      portFromOrigin(configured) ||
      3000);
  const lan = detectLanBaseUrl(port);

  // Authority precedence: explicit preview URL → app URL → request origin
  // translated to LAN (same port) → LAN probe → origin fallback.
  let candidate = configured || appUrl || "";
  if (!candidate && origin) {
    try {
      const parsed = new URL(origin);
      if (isLoopbackHost(parsed.hostname) && lan) {
        candidate = lan;
      } else {
        candidate = trimSlash(parsed.toString());
      }
    } catch {
      candidate = origin;
    }
  }
  if (!candidate) candidate = lan || `http://localhost:${port}`;

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
        `Set NEXT_PUBLIC_PREVIEW_BASE_URL to a reachable https URL or LAN address (e.g. http://192.168.x.x:${port}).`,
    };
  }

  const host = parsed.hostname.toLowerCase();
  const isLocalhost = isLoopbackHost(host);

  if (isLocalhost) {
    if (lan) {
      return {
        baseUrl: trimSlash(lan),
        reachableForPhone: true,
        isLocalhost: false,
        reason: "preview_lan_auto",
        guidance:
          "Using your LAN address with this app's actual port. Keep the phone on the same Wi-Fi. A private IP does not guarantee reachability if the server is loopback-only, firewalled, or on an isolated network.",
      };
    }
    return {
      baseUrl: trimSlash(parsed.toString()),
      reachableForPhone: false,
      isLocalhost: true,
      reason: "preview_localhost_unreachable",
      guidance:
        `A phone cannot open localhost. Join the same Wi-Fi and set NEXT_PUBLIC_PREVIEW_BASE_URL to http://<your-lan-ip>:${port}, or ensure this machine exposes a private IPv4 address while the Studio server listens on a reachable interface.`,
    };
  }

  return {
    baseUrl: trimSlash(parsed.toString()),
    reachableForPhone: true,
    isLocalhost: false,
    reason: "preview_base_url_ok",
    guidance: isPrivateLanHost(host)
      ? "Keep the phone on the same Wi-Fi. Firewall, VPN, or AP isolation can still block the phone even when a LAN IP is shown."
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
