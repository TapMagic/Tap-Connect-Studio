/**
 * Safe SVG ingestion for Media / Logo assets.
 * Strips executable constructs; preserves presentation (fills, transparency).
 */

const FORBIDDEN_TAGS =
  /<\s*(script|foreignObject|iframe|object|embed|link|meta|base)\b/i;
const FORBIDDEN_ATTR =
  /\s(on\w+|href\s*=\s*["']?\s*javascript:|xlink:href\s*=\s*["']?\s*javascript:)/i;

export function looksLikeSvg(bytes: Buffer): boolean {
  const head = bytes.subarray(0, Math.min(bytes.byteLength, 512)).toString("utf8");
  return /<svg[\s>]/i.test(head) || (/<\?xml/i.test(head) && /<svg[\s>]/i.test(bytes.toString("utf8").slice(0, 4096)));
}

/** Returns sanitized SVG UTF-8 bytes, or null when unsafe/invalid. */
export function sanitizeMediaSvg(bytes: Buffer): Buffer | null {
  const raw = bytes.toString("utf8");
  if (!raw.includes("<svg")) return null;
  let cleaned = raw
    .replace(/<\s*script\b[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, "")
    .replace(/<\s*foreignObject\b[^>]*>[\s\S]*?<\s*\/\s*foreignObject\s*>/gi, "")
    .replace(/<\s*(?:iframe|object|embed|link|meta|base)\b[^>]*>[\s\S]*?(?:<\s*\/\s*\1\s*>)?/gi, "")
    .replace(/\son\w+\s*=\s*(["']).*?\1/gi, "")
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, "")
    .replace(/\s(?:href|xlink:href)\s*=\s*(["'])\s*javascript:[^"']*\1/gi, "")
    .replace(/<\s*\?\s*xml-stylesheet[\s\S]*?\?>/gi, "");
  if (!cleaned.includes("<svg") || FORBIDDEN_TAGS.test(cleaned) || FORBIDDEN_ATTR.test(cleaned)) {
    return null;
  }
  if (!/viewBox\s*=/i.test(cleaned)) {
    const width = cleaned.match(/\bwidth\s*=\s*["']?([\d.]+)/i)?.[1] || "24";
    const height = cleaned.match(/\bheight\s*=\s*["']?([\d.]+)/i)?.[1] || "24";
    cleaned = cleaned.replace(/<svg\b/i, `<svg viewBox="0 0 ${width} ${height}"`);
  }
  return Buffer.from(cleaned, "utf8");
}

export function assertSafeSvgFixtureRejected(raw: string): boolean {
  return sanitizeMediaSvg(Buffer.from(raw, "utf8")) === null;
}
