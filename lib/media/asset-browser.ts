export type MediaAssetSource =
  | "upload"
  | "brand"
  | "studio"
  | "recent"
  | "favorite"
  | "pexels"
  | "logo_dev"
  | "url";

export type MediaOrientation = "all" | "landscape" | "portrait" | "square";

export type MediaAssetCandidate = {
  id: string;
  url: string;
  thumbUrl: string;
  label: string;
  source: MediaAssetSource;
  sourceLabel: string;
  sourceUrl?: string;
  providerId?: string;
  attributionName?: string;
  attributionUrl?: string;
  width?: number;
  height?: number;
  mimeType?: string;
  rights?: string;
  isBrandApproved?: boolean;
};

export type MediaProviderStatus = {
  available: boolean;
  provider: "pexels" | "logo_dev" | "library";
  message?: string;
  retryAfterSeconds?: number;
};

const RECENT_KEY = "tapconnect.media.recent.v1";
const FAVORITES_KEY = "tapconnect.media.favorites.v1";
const MAX_RECENT = 24;

function readStored(key: string): MediaAssetCandidate[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as MediaAssetCandidate[]) : [];
  } catch {
    return [];
  }
}

function writeStored(key: string, assets: MediaAssetCandidate[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(assets));
  } catch {
    // Storage is a convenience layer; selection must keep working without it.
  }
}

export function readRecentMedia(): MediaAssetCandidate[] {
  return readStored(RECENT_KEY);
}

export function rememberRecentMedia(asset: MediaAssetCandidate): MediaAssetCandidate[] {
  const next = [
    asset,
    ...readRecentMedia().filter((item) => item.id !== asset.id && item.url !== asset.url),
  ].slice(0, MAX_RECENT);
  writeStored(RECENT_KEY, next);
  return next;
}

export function readFavoriteMedia(): MediaAssetCandidate[] {
  return readStored(FAVORITES_KEY);
}

export function isFavoriteMedia(asset: MediaAssetCandidate): boolean {
  return readFavoriteMedia().some((item) => item.id === asset.id || item.url === asset.url);
}

export function toggleFavoriteMedia(
  asset: MediaAssetCandidate
): { favorites: MediaAssetCandidate[]; favorite: boolean } {
  const current = readFavoriteMedia();
  const exists = current.some((item) => item.id === asset.id || item.url === asset.url);
  const favorites = exists
    ? current.filter((item) => item.id !== asset.id && item.url !== asset.url)
    : [asset, ...current];
  writeStored(FAVORITES_KEY, favorites);
  return { favorites, favorite: !exists };
}

