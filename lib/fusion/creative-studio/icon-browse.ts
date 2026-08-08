/**
 * Shared Icon library browse taxonomy — Search + Explore + Collections.
 * Uses Iconify collections that return real results via approved prefixes.
 */

export type IconBrowseCategory = {
  id: string;
  label: string;
  /** Iconify search query that returns meaningful results. */
  query: string;
  /** Optional collection prefix filter. */
  prefix?: string;
};

export type IconCollectionBrowse = {
  id: string;
  label: string;
  prefix: string;
  sampleQuery: string;
};

export const ICON_BROWSE_CATEGORIES: readonly IconBrowseCategory[] = [
  { id: "recommended", label: "Recommended", query: "" },
  { id: "recent", label: "Recent", query: "" },
  { id: "favorites", label: "Favorites", query: "" },
  { id: "actions", label: "Actions", query: "check arrow send play" },
  { id: "communication", label: "Communication", query: "mail message chat phone" },
  { id: "commerce", label: "Commerce", query: "cart bag tag sale" },
  { id: "maps", label: "Maps & Places", query: "map pin location navigation" },
  { id: "social", label: "Social", query: "share heart star like" },
  { id: "rewards", label: "Rewards", query: "trophy award medal gift" },
  { id: "tickets", label: "Tickets & Events", query: "ticket calendar event" },
  { id: "food", label: "Food & Drink", query: "coffee food drink restaurant" },
  { id: "people", label: "People", query: "user people person team" },
  { id: "animals", label: "Animals", query: "dog cat paw animal" },
  { id: "media", label: "Media", query: "image camera video music" },
  { id: "navigation", label: "Navigation", query: "home menu search settings" },
  { id: "interface", label: "Interface", query: "plus edit delete settings" },
  { id: "decorative", label: "Decorative", query: "sparkles star leaf" },
] as const;

export const ICON_COLLECTION_BROWSE: readonly IconCollectionBrowse[] = [
  { id: "lucide", label: "Lucide", prefix: "lucide", sampleQuery: "star" },
  { id: "tabler", label: "Tabler", prefix: "tabler", sampleQuery: "home" },
  { id: "phosphor", label: "Phosphor", prefix: "ph", sampleQuery: "heart" },
  { id: "remix", label: "Remix", prefix: "ri", sampleQuery: "mail" },
  { id: "material", label: "Material Symbols", prefix: "material-symbols", sampleQuery: "check" },
] as const;

export type IconPickerMode = "search" | "browse" | "collections";

export type IconPickerTargetContext =
  | "root_icon"
  | "button_icon"
  | "badge_icon"
  | "coupon_icon"
  | "ticket_icon"
  | "nested_icon";

export type IconPickerRequest = {
  selectionRefId?: string | null;
  targetContext: IconPickerTargetContext;
  mode?: IconPickerMode;
  currentIconId?: string | null;
  replace?: boolean;
};

const RECENT_KEY = "tapconnect.icon.recent";
const FAVORITES_KEY = "tapconnect.icon.favorites";

export function readIconRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string").slice(0, 24) : [];
  } catch {
    return [];
  }
}

export function pushIconRecent(iconId: string): string[] {
  if (typeof window === "undefined") return [];
  const next = [iconId, ...readIconRecent().filter((id) => id !== iconId)].slice(0, 24);
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
  return next;
}

export function readIconFavorites(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(FAVORITES_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function toggleIconFavorite(iconId: string): string[] {
  const current = readIconFavorites();
  const next = current.includes(iconId) ? current.filter((id) => id !== iconId) : [iconId, ...current].slice(0, 48);
  try {
    if (typeof window !== "undefined") window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

export function browseCategoryById(id: string): IconBrowseCategory | undefined {
  return ICON_BROWSE_CATEGORIES.find((category) => category.id === id);
}

export function collectionById(id: string): IconCollectionBrowse | undefined {
  return ICON_COLLECTION_BROWSE.find((collection) => collection.id === id);
}
