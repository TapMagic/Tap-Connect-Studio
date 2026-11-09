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
  // This identifier is only projected after tenant-owned Asset resolution.
  if (source.startsWith("media-asset:")) return "browser_local";
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
  value: unknown,
  authorizedMediaAssetIds: ReadonlySet<string> = new Set()
): PreviewVisualResourceIssue[] {
  const issues: PreviewVisualResourceIssue[] = [];

  function visit(current: unknown, path: string, propertyName = ""): void {
    if (typeof current === "string") {
      if (!isVisualResourceProperty(propertyName)) return;
      const assetId = previewMediaAssetId(current);
      if (assetId && authorizedMediaAssetIds.has(assetId)) return;
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

export function previewMediaAssetSource(id: string): string { return "media-asset:" + encodeURIComponent(id); }
export function previewMediaAssetId(source: string): string | null {
  if (!source.startsWith("media-asset:")) return null;
  try { return decodeURIComponent(source.slice("media-asset:".length)) || null; } catch { return null; }
}

export function mapPreviewVisualSources<T>(value: T, mapper: (source: string) => string): T {
  function project(current: unknown, propertyName = ""): unknown {
    if (typeof current === "string") {
      if (!isVisualResourceProperty(propertyName)) return current;
      return mapper(current);
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

export function resolvePreviewVisualResources<T>(value: T, token: string): T {
  return mapPreviewVisualSources(value, source => {
    const assetId = previewMediaAssetId(source);
    if (assetId) return "/api/preview/card/asset/" + encodeURIComponent(token) + "?assetId=" + encodeURIComponent(assetId);
    const key = localMediaKey(source);
    return key ? signedPreviewAssetUrl(token, key) : source;
  });
}

export function collectPreviewMediaAssetIds(value: unknown): Set<string> {
  const ids = new Set<string>();
  mapPreviewVisualSources(value, source => { const id = previewMediaAssetId(source); if (id) ids.add(id); return source; });
  return ids;
}

/** No image payloads, signed queries or secrets in user-facing diagnostics. */
export function previewPortabilityRecovery(value: unknown, authorizedMediaAssetIds?: ReadonlySet<string>): string {
  const issue = inspectPreviewVisualResourcePortability(value, authorizedMediaAssetIds)[0];
  if (!issue) return "";
  let current: unknown = value, page = "Workspace", component = "image";
  for (const part of issue.path.match(/[^.[\]]+/g) || []) {
    if (current && typeof current === "object") {
      const node = current as Record<string, unknown>;
      if (node.pageId && typeof node.title === "string") page = node.title;
      if (node.id) component = String(node.name || node.label || node.primitive || node.id);
      current = node[part];
    }
  }
  if (issue.path === "profile.photoUrl") component = "contact photo / logo";
  const reference = typeof current === "string" ? current.startsWith("data:")
    ? current.slice(0, current.indexOf(",") + 1) + "[embedded image]"
    : current.split("?")[0].replace(/\/\/[^/@]+@/, "//[redacted]@")
      .replace(/\/preview\/live\/[^/]+/, "/preview/live/[redacted]").slice(0, 100) : issue.path;
  return page + " → " + component + " (" + issue.path + "): " + reference
    + ". This " + issue.kind.replaceAll("_", "-") + " reference has no usable authorized Asset. Choose it from Assets or upload it through Studio.";
}

/** A saved Experience owns its logo; workspace chrome is only a fallback.
 * Portability validation still applies to the returned source. */
export function previewContextLogo(snapshot: unknown, fallback?: string | null): string | null {
  if (snapshot && typeof snapshot === "object" && "headerLogoUrl" in snapshot) {
    const own = (snapshot as { headerLogoUrl?: unknown }).headerLogoUrl;
    if (typeof own === "string" && own.trim()) return own;
  }
  return fallback ?? null;
}
