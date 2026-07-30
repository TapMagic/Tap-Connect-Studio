import { createHash } from "node:crypto";
import { isIP } from "node:net";
import { resolve4, resolve6 } from "node:dns/promises";
import http from "node:http";
import https from "node:https";

const MAX_REDIRECTS = 3;
const MAX_BYTES = 750_000;
const TIMEOUT_MS = 6_000;

export type WebsiteFinding = {
  factKey:
    | "businessName"
    | "website"
    | "phone"
    | "email"
    | "description"
    | "address"
    | "city"
    | "state";
  value: string;
  confidence: number;
  evidence: string;
};

export type WebsiteIntakeResult = {
  requestedUrl: string;
  finalUrl: string;
  contentHash: string;
  findings: WebsiteFinding[];
  fetchedAt: string;
};

export class WebsiteIntakeError extends Error {
  constructor(
    message: string,
    readonly code:
      | "invalid_url"
      | "private_network"
      | "unsupported_port"
      | "dns_failed"
      | "redirect_limit"
      | "timeout"
      | "too_large"
      | "unsupported_content"
      | "upstream_error"
  ) {
    super(message);
    this.name = "WebsiteIntakeError";
  }
}

function isPrivateIpv4(address: string): boolean {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) return true;
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 0 && parts[2] === 2) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && parts[2] === 100) ||
    (a === 203 && b === 0 && parts[2] === 113) ||
    a >= 224
  );
}

export function isPrivateAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) return isPrivateIpv4(address);
  if (version !== 6) return true;
  const normalized = address.toLowerCase().split("%")[0];
  if (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb") ||
    normalized.startsWith("ff")
  ) {
    return true;
  }
  const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  return mapped ? isPrivateIpv4(mapped[1]) : false;
}

export function normalizeHomepageUrl(input: string): URL {
  const raw = input.trim();
  let url: URL;
  try {
    url = new URL(raw.includes("://") ? raw : `https://${raw}`);
  } catch {
    throw new WebsiteIntakeError("Enter a valid website or domain.", "invalid_url");
  }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    throw new WebsiteIntakeError(
      "Use a public HTTP or HTTPS homepage without embedded credentials.",
      "invalid_url"
    );
  }
  const expectedPort = url.protocol === "https:" ? "443" : "80";
  if (url.port && url.port !== expectedPort) {
    throw new WebsiteIntakeError(
      "Only standard website ports are supported.",
      "unsupported_port"
    );
  }
  url.hash = "";
  return url;
}

async function publicAddresses(hostname: string): Promise<Array<{ address: string; family: 4 | 6 }>> {
  const literal = isIP(hostname);
  const addresses =
    literal === 4
      ? [{ address: hostname, family: 4 as const }]
      : literal === 6
        ? [{ address: hostname, family: 6 as const }]
        : [
            ...(await resolve4(hostname).catch(() => [])).map((address) => ({
              address,
              family: 4 as const,
            })),
            ...(await resolve6(hostname).catch(() => [])).map((address) => ({
              address,
              family: 6 as const,
            })),
          ];
  if (addresses.length === 0) {
    throw new WebsiteIntakeError("The website hostname could not be resolved.", "dns_failed");
  }
  if (addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new WebsiteIntakeError(
      "Private or local network websites cannot be imported.",
      "private_network"
    );
  }
  return addresses;
}

async function requestHtml(
  url: URL,
  redirects = 0
): Promise<{ finalUrl: URL; html: string }> {
  if (redirects > MAX_REDIRECTS) {
    throw new WebsiteIntakeError("The website redirected too many times.", "redirect_limit");
  }
  const [pinned] = await publicAddresses(url.hostname);
  const client = url.protocol === "https:" ? https : http;

  return new Promise((resolve, reject) => {
    const request = client.request(
      url,
      {
        method: "GET",
        headers: {
          "User-Agent": "TapConnect-Onboarding/1.0 (+homepage-only)",
          Accept: "text/html,application/xhtml+xml",
        },
        lookup: (_hostname, _options, callback) => {
          callback(null, pinned.address, pinned.family);
        },
      },
      (response) => {
        const status = response.statusCode || 0;
        if (status >= 300 && status < 400 && response.headers.location) {
          response.resume();
          let next: URL;
          try {
            next = normalizeHomepageUrl(new URL(response.headers.location, url).toString());
          } catch (error) {
            reject(error);
            return;
          }
          void requestHtml(next, redirects + 1).then(resolve, reject);
          return;
        }
        if (status < 200 || status >= 300) {
          response.resume();
          reject(
            new WebsiteIntakeError(
              `The homepage returned HTTP ${status}.`,
              "upstream_error"
            )
          );
          return;
        }
        const contentType = String(response.headers["content-type"] || "")
          .split(";")[0]
          .trim()
          .toLowerCase();
        if (!["text/html", "application/xhtml+xml"].includes(contentType)) {
          response.resume();
          reject(
            new WebsiteIntakeError(
              "The homepage did not return HTML.",
              "unsupported_content"
            )
          );
          return;
        }
        const chunks: Buffer[] = [];
        let size = 0;
        response.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > MAX_BYTES) {
            request.destroy(
              new WebsiteIntakeError("The homepage was too large to review safely.", "too_large")
            );
            return;
          }
          chunks.push(chunk);
        });
        response.on("end", () => {
          resolve({ finalUrl: url, html: Buffer.concat(chunks).toString("utf8") });
        });
      }
    );
    request.setTimeout(TIMEOUT_MS, () => {
      request.destroy(new WebsiteIntakeError("The homepage request timed out.", "timeout"));
    });
    request.on("error", (error) => {
      reject(
        error instanceof WebsiteIntakeError
          ? error
          : new WebsiteIntakeError("The homepage could not be reached.", "upstream_error")
      );
    });
    request.end();
  });
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
      // Malformed structured data is ignored; the Owner can enter facts manually.
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
  if (!normalized || findings.some((finding) => finding.factKey === factKey && finding.value === normalized)) {
    return;
  }
  findings.push({ factKey, value: normalized, confidence, evidence: evidence.slice(0, 240) });
}

export function extractHomepageFindings(html: string, finalUrl: URL): WebsiteFinding[] {
  const findings: WebsiteFinding[] = [];
  addFinding(findings, "website", finalUrl.origin, 1, "Final homepage URL");
  addFinding(findings, "businessName", meta(html, "og:site_name"), 0.85, "Open Graph site name");
  addFinding(
    findings,
    "description",
    meta(html, "og:description") || meta(html, "description"),
    0.75,
    "Homepage description metadata"
  );

  for (const object of jsonLdObjects(html)) {
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
  return findings.slice(0, 20);
}

export async function intakeHomepage(input: string): Promise<WebsiteIntakeResult> {
  const requested = normalizeHomepageUrl(input);
  const { finalUrl, html } = await requestHtml(requested);
  return {
    requestedUrl: requested.toString(),
    finalUrl: finalUrl.toString(),
    contentHash: createHash("sha256").update(html).digest("hex"),
    findings: extractHomepageFindings(html, finalUrl),
    fetchedAt: new Date().toISOString(),
  };
}
