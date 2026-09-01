/**
 * Runtime projection for visual resources crossing the Studio -> Live Device
 * boundary. Persisted Card state keeps canonical MediaAsset references and the
 * authenticated Studio URL; a signed preview projects those URLs through its
 * own scoped resource authority.
 */

export type PreviewVisualResourceIssueKind =
  | "browser_local"
  | "machine_local"
  | "loopback_only";

export type PreviewVisualResourceIssue = {
  kind: PreviewVisualResourceIssueKind;
  path: string;
};

const VISUAL_KEY = /(?:src|url|image|logo|artwork|poster|thumbnail|fallback)$/i;
const NON_RESOURCE_KEY = /(?:assetid|resourceid|recipeid)$/i;
const NON_VISUAL_URL_KEY = /^(?:actionUrl|destinationUrl|reviewUrl|websiteUrl|mapUrl|bookingUrl|paymentUrl|href)$/i;
const MACHINE_PATH = /^(?:\/(?:Users|home|private\/var|var\/folders|tmp)\/|[A-Za-z]:\\)/;

function isVisualResourceProperty(key: string): boolean {
  return VISUAL_KEY.test(key) && !NON_RESOURCE_KEY.test(key) && !NON_VISUAL_URL_KEY.test(key);
}

export function localMediaKey(value: string): string | null {
  try {
    const url = new URL(value, "http://tapconnect.local");
    if (url.pathname !== "/api/media/local") return null;
    return url.searchParams.get("key") || null;
  } catch {
    return null;
  }
}

function issueForVisualSource(value: string): PreviewVisualResourceIssueKind | null {
  const source = value.trim();
  if (!source || localMediaKey(source)) return null;
  if (/^(?:blob|data|file):/i.test(source)) return "browser_local";
  if (MACHINE_PATH.test(source)) return "machine_local";
  try {
    const url = new URL(source);
    if (/^(?:localhost|127(?:\.\d{1,3}){3}|\[?::1\]?)$/i.test(url.hostname)) {
      return "loopback_only";
    }
  } catch {
    // Relative public paths and opaque canonical identifiers are portable.
  }
  return null;
}

export function inspectPreviewVisualResourcePortability(
  value: unknown
): PreviewVisualResourceIssue[] {
  const issues: PreviewVisualResourceIssue[] = [];

  function visit(current: unknown, path: string, propertyName = ""): void {
    if (typeof current === "string") {
      if (!isVisualResourceProperty(propertyName)) return;
      const kind = issueForVisualSource(current);
      if (kind) issues.push({ kind, path });
      return;
    }
    if (Array.isArray(current)) {
      current.forEach((entry, index) => visit(entry, `${path}[${index}]`, propertyName));
      return;
    }
    if (!current || typeof current !== "object") return;
    for (const [key, entry] of Object.entries(current as Record<string, unknown>)) {
      visit(entry, path ? `${path}.${key}` : key, key);
    }
  }

  visit(value, "");
  return issues;
}

export function collectPreviewLocalMediaKeys(value: unknown): Set<string> {
  const keys = new Set<string>();
  function visit(current: unknown, propertyName = ""): void {
    if (typeof current === "string") {
      if (!isVisualResourceProperty(propertyName)) return;
      const storageKey = localMediaKey(current);
      if (storageKey) keys.add(storageKey);
      return;
    }
    if (Array.isArray(current)) {
      current.forEach((entry) => visit(entry, propertyName));
      return;
    }
    if (!current || typeof current !== "object") return;
    for (const [key, entry] of Object.entries(current as Record<string, unknown>)) visit(entry, key);
  }
  visit(value);
  return keys;
}

export function signedPreviewAssetUrl(token: string, storageKey: string): string {
  return `/api/preview/card/asset/${encodeURIComponent(token)}?key=${encodeURIComponent(storageKey)}`;
}

export function resolvePreviewVisualResources<T>(value: T, token: string): T {
  function project(current: unknown, propertyName = ""): unknown {
    if (typeof current === "string") {
      if (!isVisualResourceProperty(propertyName)) return current;
      const storageKey = localMediaKey(current);
      return storageKey ? signedPreviewAssetUrl(token, storageKey) : current;
    }
    if (Array.isArray(current)) return current.map((entry) => project(entry, propertyName));
    if (!current || typeof current !== "object") return current;
    return Object.fromEntries(
      Object.entries(current as Record<string, unknown>).map(([key, entry]) => [
        key,
        project(entry, key),
      ])
    );
  }

  return project(value) as T;
}
