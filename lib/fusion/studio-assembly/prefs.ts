/**
 * Studio Assembly frequency prefs — anonymous vs authenticated, localStorage only.
 * Smallest coherent persistence; no new settings schema.
 */

export const LANDING_REPLAY_KEY = "tapconnect.landing.assembly.replay";
export const STUDIO_FIRST_SEEN_KEY = "tapconnect.studio.assembly.firstSeen";
export const STUDIO_SKIP_KEY = "tapconnect.studio.assembly.skipEveryday";

export type StudioEntryKind = "first" | "everyday" | "replay" | "none";

function safeGet(key: string): string | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, value);
  } catch {
    /* ignore quota / private mode */
  }
}

export function markStudioFirstEntrySeen(at = Date.now()): void {
  safeSet(STUDIO_FIRST_SEEN_KEY, String(at));
}

export function hasSeenStudioFirstEntry(): boolean {
  return Boolean(safeGet(STUDIO_FIRST_SEEN_KEY));
}

export function markEverydaySkipPreferred(prefer = true): void {
  safeSet(STUDIO_SKIP_KEY, prefer ? "1" : "0");
}

export function prefersSkipEveryday(): boolean {
  return safeGet(STUDIO_SKIP_KEY) === "1";
}

/** Resolve which authenticated entry mode to play. */
export function resolveStudioEntryKind(opts?: {
  forceReplay?: boolean;
  forceFirst?: boolean;
}): StudioEntryKind {
  if (opts?.forceReplay) return "replay";
  if (opts?.forceFirst) return "first";
  if (prefersSkipEveryday()) return "none";
  if (!hasSeenStudioFirstEntry()) return "first";
  return "everyday";
}

export function entryKindToMode(
  kind: StudioEntryKind
): "FIRST_STUDIO_ENTRY" | "EVERYDAY_ENTRY" | null {
  if (kind === "first" || kind === "replay") return "FIRST_STUDIO_ENTRY";
  if (kind === "everyday") return "EVERYDAY_ENTRY";
  return null;
}
