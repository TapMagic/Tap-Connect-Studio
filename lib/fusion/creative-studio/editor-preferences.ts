export type EditorAppearance = "system" | "light" | "dark";
export type PasteboardTheme = "light" | "dark" | "neutral" | "checkerboard";
export type EditorDensity = "comfortable" | "compact";

export type EditorPreferences = Readonly<{
  appearance: EditorAppearance;
  pasteboard: PasteboardTheme;
  density: EditorDensity;
  rulers: boolean;
  grid: boolean;
  safeMargins: boolean;
  snapStrength: "off" | "gentle" | "strong";
  alignmentGuides: boolean;
  publicationBoundary: boolean;
  dimOutsideDocument: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  largerControls: boolean;
}>;

export const EDITOR_PREFERENCES_STORAGE_KEY = "tapconnect:creative-studio:editor-preferences:v1";

export const DEFAULT_EDITOR_PREFERENCES: EditorPreferences = Object.freeze({
  appearance: "system",
  pasteboard: "neutral",
  density: "comfortable",
  rulers: false,
  grid: false,
  safeMargins: true,
  snapStrength: "gentle",
  alignmentGuides: true,
  publicationBoundary: true,
  dimOutsideDocument: true,
  reducedMotion: false,
  highContrast: false,
  largerControls: false,
});

export type PreferenceStorage = Pick<Storage, "getItem" | "setItem">;

export function readEditorPreferences(storage?: PreferenceStorage | null): EditorPreferences {
  if (!storage) return DEFAULT_EDITOR_PREFERENCES;
  try {
    const parsed = JSON.parse(storage.getItem(EDITOR_PREFERENCES_STORAGE_KEY) || "null") as Partial<EditorPreferences> | null;
    if (!parsed) return DEFAULT_EDITOR_PREFERENCES;
    return normalizeEditorPreferences(parsed);
  } catch {
    return DEFAULT_EDITOR_PREFERENCES;
  }
}

export function writeEditorPreferences(storage: PreferenceStorage, preferences: EditorPreferences): void {
  storage.setItem(EDITOR_PREFERENCES_STORAGE_KEY, JSON.stringify(normalizeEditorPreferences(preferences)));
}

export function normalizeEditorPreferences(input: Partial<EditorPreferences>): EditorPreferences {
  return {
    ...DEFAULT_EDITOR_PREFERENCES,
    ...input,
    appearance: includes(["system", "light", "dark"], input.appearance) ? input.appearance : "system",
    pasteboard: includes(["light", "dark", "neutral", "checkerboard"], input.pasteboard) ? input.pasteboard : "neutral",
    density: includes(["comfortable", "compact"], input.density) ? input.density : "comfortable",
    snapStrength: includes(["off", "gentle", "strong"], input.snapStrength) ? input.snapStrength : "gentle",
  };
}

function includes<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === "string" && values.includes(value as T);
}

