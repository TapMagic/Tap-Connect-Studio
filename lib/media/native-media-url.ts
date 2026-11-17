export function nativeMediaAssetId(value: string): string | null {
  try {
    const url = new URL(value, "http://tapconnect.local");
    const match = /^\/api\/public\/native-media\/([A-Za-z0-9_-]+)$/.exec(
      url.pathname,
    );
    return match?.[1] || null;
  } catch {
    return null;
  }
}
export function nativeMediaAssetUrl(id: string): string {
  return `/api/public/native-media/${encodeURIComponent(id)}`;
}
