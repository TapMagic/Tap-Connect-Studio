import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Pick the first image URL. `undefined`/`null` skips to the next candidate.
 * An explicit empty string means "cleared" — stop and return undefined (no fallback).
 */
export function firstImageUrl(
  ...candidates: Array<string | null | undefined>
): string | undefined {
  for (const c of candidates) {
    if (c === undefined || c === null) continue;
    const trimmed = String(c).trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  return undefined;
}
