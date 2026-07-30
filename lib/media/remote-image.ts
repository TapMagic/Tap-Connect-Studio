import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { request as httpsRequest } from "node:https";

export const MAX_MEDIA_BYTES = 8 * 1024 * 1024;
export const REMOTE_MEDIA_TIMEOUT_MS = 12_000;
const MAX_REDIRECTS = 3;

export class RemoteMediaError extends Error {
  constructor(
    message: string,
    readonly code:
      | "invalid_url"
      | "blocked_host"
      | "timeout"
      | "too_large"
      | "unsupported_mime"
      | "upstream",
    readonly status: number
  ) {
    super(message);
  }
}

export type RemoteImage = {
  finalUrl: string;
  bytes: Buffer;
  mimeType: "image/png" | "image/jpeg" | "image/webp" | "image/gif";
  declaredSize: number | null;
};

function blockedIpv4(address: string): boolean {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) return true;
  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 0 || b === 168)) ||
    (a === 198 && (b === 18 || b === 19 || b === 51)) ||
    (a === 203 && b === 0) ||
    a >= 224
  );
}

function blockedIpv6(address: string): boolean {
  const normalized = address.toLowerCase().split("%")[0];
  if (normalized === "::" || normalized === "::1") return true;
  if (normalized.startsWith("::ffff:")) {
    return blockedIpv4(normalized.slice("::ffff:".length));
  }
  return (
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    /^fe[89ab]/.test(normalized) ||
    normalized.startsWith("ff") ||
    normalized.startsWith("2001:db8:")
  );
}

export function isPublicIpAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return !blockedIpv4(address);
  if (family === 6) return !blockedIpv6(address);
  return false;
}

async function resolvePublicAddress(hostname: string): Promise<{
  address: string;
  family: 4 | 6;
}> {
  if (hostname.toLowerCase() === "localhost") {
    throw new RemoteMediaError("Private hosts are not allowed", "blocked_host", 400);
  }
  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some((entry) => !isPublicIpAddress(entry.address))) {
    throw new RemoteMediaError("Private or reserved hosts are not allowed", "blocked_host", 400);
  }
  const selected = addresses[0];
  return { address: selected.address, family: selected.family as 4 | 6 };
}

function parseSafeUrl(input: string): URL {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new RemoteMediaError("A valid HTTPS URL is required", "invalid_url", 400);
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    (url.port && url.port !== "443")
  ) {
    throw new RemoteMediaError("Only public HTTPS image URLs are allowed", "invalid_url", 400);
  }
  return url;
}

export function sniffImageMime(bytes: Buffer): RemoteImage["mimeType"] | null {
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return "image/png";
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  const gif = bytes.subarray(0, 6).toString("ascii");
  if (gif === "GIF87a" || gif === "GIF89a") return "image/gif";
  return null;
}

async function requestOnce(url: URL): Promise<{
  status: number;
  headers: import("node:http").IncomingHttpHeaders;
  bytes: Buffer;
}> {
  const resolved = await resolvePublicAddress(url.hostname);
  return new Promise((resolve, reject) => {
    const req = httpsRequest(
      url,
      {
        method: "GET",
        headers: {
          Accept: "image/png,image/jpeg,image/webp,image/gif",
          "User-Agent": "TapConnect-Media-Importer/1.0",
        },
        lookup: (_hostname, _options, callback) => {
          callback(null, resolved.address, resolved.family);
        },
      },
      (response) => {
        const declaredSize = Number(response.headers["content-length"] || 0);
        if (declaredSize > MAX_MEDIA_BYTES) {
          response.destroy();
          reject(
            new RemoteMediaError("Source image exceeds 8MB", "too_large", 413)
          );
          return;
        }
        const chunks: Buffer[] = [];
        let size = 0;
        response.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > MAX_MEDIA_BYTES) {
            response.destroy(
              new RemoteMediaError("Source image exceeds 8MB", "too_large", 413)
            );
            return;
          }
          chunks.push(chunk);
        });
        response.on("end", () => {
          resolve({
            status: response.statusCode || 502,
            headers: response.headers,
            bytes: Buffer.concat(chunks),
          });
        });
        response.on("error", reject);
      }
    );
    req.setTimeout(REMOTE_MEDIA_TIMEOUT_MS, () => {
      req.destroy(new RemoteMediaError("Source request timed out", "timeout", 504));
    });
    req.on("error", reject);
    req.end();
  });
}

export async function fetchRemoteImage(
  input: string,
  redirectsRemaining = MAX_REDIRECTS
): Promise<RemoteImage> {
  const url = parseSafeUrl(input);
  let response;
  try {
    response = await requestOnce(url);
  } catch (error) {
    if (error instanceof RemoteMediaError) throw error;
    throw new RemoteMediaError("Source image could not be reached", "upstream", 502);
  }

  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.location;
    if (!location || redirectsRemaining <= 0) {
      throw new RemoteMediaError("Source redirected too many times", "upstream", 502);
    }
    return fetchRemoteImage(new URL(location, url).toString(), redirectsRemaining - 1);
  }
  if (response.status < 200 || response.status >= 300) {
    throw new RemoteMediaError(`Source returned ${response.status}`, "upstream", 502);
  }

  const mimeType = sniffImageMime(response.bytes);
  if (!mimeType) {
    throw new RemoteMediaError(
      "Source bytes are not a supported PNG, JPEG, WebP, or GIF image",
      "unsupported_mime",
      415
    );
  }
  const declaredMime = String(response.headers["content-type"] || "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  if (declaredMime && declaredMime !== mimeType) {
    throw new RemoteMediaError("Source MIME type does not match its bytes", "unsupported_mime", 415);
  }

  return {
    finalUrl: url.toString(),
    bytes: response.bytes,
    mimeType,
    declaredSize: response.headers["content-length"]
      ? Number(response.headers["content-length"])
      : null,
  };
}
