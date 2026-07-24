import { localMockBgRemoveAdapter } from "./local-mock";
import type { BgRemoveAdapter, BgRemoveProvenance, BgRemoveRequest, BgRemoveResult } from "./types";

export type {
  BgRemoveAdapter,
  BgRemovePreviewMode,
  BgRemoveProvenance,
  BgRemoveProviderId,
  BgRemoveRequest,
  BgRemoveResult,
} from "./types";

const PROVENANCE_KEY = "tapconnect.bg-remove.provenance.v1";

/** Active adapter — swap when a live provider is certified. */
export function getBgRemoveAdapter(): BgRemoveAdapter {
  return localMockBgRemoveAdapter;
}

export async function removeBackground(req: BgRemoveRequest): Promise<BgRemoveResult> {
  return getBgRemoveAdapter().removeBackground(req);
}

function readStore(): Record<string, BgRemoveProvenance> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(PROVENANCE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, BgRemoveProvenance>) : {};
  } catch {
    return {};
  }
}

function writeStore(map: Record<string, BgRemoveProvenance>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PROVENANCE_KEY, JSON.stringify(map));
  } catch {
    // quota — non-blocking
  }
}

export function rememberBgRemoveProvenance(p: BgRemoveProvenance) {
  const map = readStore();
  map[p.derivedUrl] = p;
  map[`orig:${p.originalUrl}`] = p;
  writeStore(map);
}

export function getBgRemoveProvenance(url: string): BgRemoveProvenance | undefined {
  const map = readStore();
  return map[url] || map[`orig:${url}`];
}

export function clearBgRemoveProvenance(url: string) {
  const map = readStore();
  const p = map[url] || map[`orig:${url}`];
  if (!p) return;
  delete map[p.derivedUrl];
  delete map[`orig:${p.originalUrl}`];
  writeStore(map);
}

/** Where-used helper: scan JSON blobs for original + derived URLs. */
export function findBgRemoveWhereUsed(
  provenance: BgRemoveProvenance,
  blobs: unknown[]
): { url: string; count: number }[] {
  const targets = [provenance.originalUrl, provenance.derivedUrl];
  return targets.map((url) => {
    let count = 0;
    for (const blob of blobs) {
      const text = JSON.stringify(blob ?? {});
      if (text.includes(url)) count += 1;
    }
    return { url, count };
  });
}
