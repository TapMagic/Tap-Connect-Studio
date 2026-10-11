import type { IconAsset } from "./icon-asset";
import {
  EVERENCORE_LOVE_AND_THEFT_BLANK_INSERT_ID,
  EVERENCORE_LOVE_AND_THEFT_BLANK_PICK_SOURCE,
  EVERENCORE_LOVE_AND_THEFT_PICK_INSERT_ASSETS,
  loveAndTheftPickMasterDefinition,
} from "./signature-assets/everencore-love-and-theft";

export type NavigationVisualLibrary = Readonly<{
  id: string;
  label: string;
  assets: readonly IconAsset[];
  allowBlank: boolean;
  blankId: string;
  blankPreviewRef: string;
}>;

const LOVE_AND_THEFT_NAVIGATION_VISUAL_LIBRARY: NavigationVisualLibrary = Object.freeze({
  id: "everencore-love-and-theft-pick-masters",
  label: "Love & Theft Pick Library",
  assets: EVERENCORE_LOVE_AND_THEFT_PICK_INSERT_ASSETS,
  allowBlank: true,
  blankId: EVERENCORE_LOVE_AND_THEFT_BLANK_INSERT_ID,
  blankPreviewRef: EVERENCORE_LOVE_AND_THEFT_BLANK_PICK_SOURCE,
});

/**
 * Read-time bridge for navigation values authored before certified pick IDs
 * were available. This is compatibility metadata, not a default business
 * mapping: a Host selection always persists the selected canonical master ID.
 */
const LOVE_AND_THEFT_LEGACY_NAV_REFS: Readonly<Record<string, string>> = Object.freeze({
  house: "LT-PICK-LOVE-THEFT",
  home: "LT-PICK-LOVE-THEFT",
  music: "LT-PICK-MUSIC",
  "calendar-days": "LT-PICK-CALENDAR",
  ticket: "LT-PICK-TICKET-ANGLED",
  lock: "LT-PICK-LOCK",
  star: "LT-PICK-FAVORITE",
  video: "LT-PICK-PLAY",
  "shopping-bag": "LT-PICK-MERCH",
  "map-pin": "LT-PICK-MAP",
  user: EVERENCORE_LOVE_AND_THEFT_BLANK_INSERT_ID,
  sparkles: EVERENCORE_LOVE_AND_THEFT_BLANK_INSERT_ID,
  circle: EVERENCORE_LOVE_AND_THEFT_BLANK_INSERT_ID,
});

/** Theme-library lookup is kept outside the shared navigation engine so a
 * future artist family can register its own visual drawer without changing
 * Page routing, ordering, visibility, active state, or count-aware layout. */
export function navigationVisualLibraryForPresentation(itemPresentation?: string): NavigationVisualLibrary | null {
  return itemPresentation === "everencore-love-and-theft-mini-pick"
    ? LOVE_AND_THEFT_NAVIGATION_VISUAL_LIBRARY
    : null;
}
export function resolveNavigationVisualRef(itemPresentation: string | undefined, iconRef?: string): string {
  const value = iconRef?.trim() || "circle";
  if (itemPresentation !== "everencore-love-and-theft-mini-pick") return value;
  const mastered = loveAndTheftPickMasterDefinition(value);
  if (mastered) return mastered.canonicalId;
  return LOVE_AND_THEFT_LEGACY_NAV_REFS[value]
    ?? LOVE_AND_THEFT_LEGACY_NAV_REFS[value.replace(/^lucide:/, "")]
    ?? EVERENCORE_LOVE_AND_THEFT_BLANK_INSERT_ID;
}
