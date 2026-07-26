/**
 * Brand Kit inheritance model for authoring surfaces.
 * Single source of truth remains Brand Kit / Business — this layer only
 * copies, overrides, and restores fields into drafts (session authoring).
 * Durable linked inheritance that auto-updates objects when Brand Kit changes
 * is Phase 2 — do not present session copy as a durable sync link.
 */

export type BrandInheritanceMode = "linked" | "copied" | "overridden" | "ignored";

export type BrandFieldKey =
  | "logoUrl"
  | "primaryColor"
  | "secondaryColor"
  | "accentColor"
  | "backgroundColor"
  | "textColor"
  | "fontStyle"
  | "tone"
  | "businessName"
  | "phone"
  | "email"
  | "website"
  | "address"
  | "hours"
  | "bookingUrl"
  | "reviewUrl"
  | "supportContact"
  | "disclaimer"
  | "approvedKeywords";

export type BrandKitSnapshot = Partial<Record<BrandFieldKey, string | string[] | null>>;

export type InheritedFieldState = {
  key: BrandFieldKey;
  mode: BrandInheritanceMode;
  inheritedValue: string | string[] | null | undefined;
  localValue: string | string[] | null | undefined;
  source: "brand_kit" | "business" | "none";
};

export type BrandInheritanceState = {
  useBrandKit: boolean;
  /**
   * Internal flag for optional re-apply from kit within the session.
   * Not durable across saves/reloads — host UI must not call this "synchronized".
   */
  staySynchronized: boolean;
  fields: Partial<Record<BrandFieldKey, InheritedFieldState>>;
};

export const BRAND_FIELD_LABELS: Record<BrandFieldKey, string> = {
  logoUrl: "Logo",
  primaryColor: "Primary color",
  secondaryColor: "Secondary color",
  accentColor: "Accent color",
  backgroundColor: "Background",
  textColor: "Text color",
  fontStyle: "Font style",
  tone: "Tone / voice",
  businessName: "Business name",
  phone: "Phone",
  email: "Email",
  website: "Website",
  address: "Address",
  hours: "Hours",
  bookingUrl: "Booking URL",
  reviewUrl: "Review URL",
  supportContact: "Support contact",
  disclaimer: "Legal / disclaimer",
  approvedKeywords: "Approved keywords",
};

export function createInheritanceState(
  kit: BrandKitSnapshot,
  opts?: { useBrandKit?: boolean; staySynchronized?: boolean }
): BrandInheritanceState {
  const fields: BrandInheritanceState["fields"] = {};
  for (const key of Object.keys(BRAND_FIELD_LABELS) as BrandFieldKey[]) {
    const value = kit[key];
    if (value === undefined || value === null || value === "") continue;
    fields[key] = {
      key,
      mode: "linked",
      inheritedValue: value,
      localValue: value,
      source: key === "businessName" || key === "phone" || key === "email" || key === "website"
        ? "business"
        : "brand_kit",
    };
  }
  return {
    useBrandKit: opts?.useBrandKit ?? true,
    staySynchronized: opts?.staySynchronized ?? false,
    fields,
  };
}

/** Resolve effective value for a field given inheritance controls. */
export function resolveInheritedValue(
  state: BrandInheritanceState,
  key: BrandFieldKey
): string | string[] | null | undefined {
  if (!state.useBrandKit) {
    return state.fields[key]?.localValue;
  }
  const field = state.fields[key];
  if (!field) return undefined;
  if (field.mode === "overridden" || field.mode === "copied" || field.mode === "ignored") {
    return field.localValue;
  }
  return field.inheritedValue;
}

export function overrideField(
  state: BrandInheritanceState,
  key: BrandFieldKey,
  value: string | string[] | null
): BrandInheritanceState {
  const prev = state.fields[key];
  return {
    ...state,
    fields: {
      ...state.fields,
      [key]: {
        key,
        mode: "overridden",
        inheritedValue: prev?.inheritedValue,
        localValue: value,
        source: prev?.source ?? "brand_kit",
      },
    },
  };
}

export function restoreInherited(
  state: BrandInheritanceState,
  key: BrandFieldKey
): BrandInheritanceState {
  const prev = state.fields[key];
  if (!prev) return state;
  return {
    ...state,
    fields: {
      ...state.fields,
      [key]: {
        ...prev,
        mode: state.staySynchronized ? "linked" : "copied",
        localValue: prev.inheritedValue,
      },
    },
  };
}

/** Copy once: freeze current Brand Kit values; later kit edits do not sync. */
export function copyOnce(state: BrandInheritanceState): BrandInheritanceState {
  const fields: BrandInheritanceState["fields"] = {};
  for (const [key, field] of Object.entries(state.fields) as [
    BrandFieldKey,
    InheritedFieldState,
  ][]) {
    fields[key] = {
      ...field,
      mode: field.mode === "overridden" ? "overridden" : "copied",
      localValue: field.mode === "overridden" ? field.localValue : field.inheritedValue,
    };
  }
  return { ...state, staySynchronized: false, fields };
}

/** Refresh linked fields from a new Brand Kit snapshot. */
export function syncFromBrandKit(
  state: BrandInheritanceState,
  kit: BrandKitSnapshot
): { state: BrandInheritanceState; changedKeys: BrandFieldKey[] } {
  const changedKeys: BrandFieldKey[] = [];
  if (!state.useBrandKit || !state.staySynchronized) {
    return { state, changedKeys };
  }
  const fields = { ...state.fields };
  for (const key of Object.keys(BRAND_FIELD_LABELS) as BrandFieldKey[]) {
    const next = kit[key];
    const prev = fields[key];
    if (prev?.mode === "overridden" || prev?.mode === "copied" || prev?.mode === "ignored") {
      if (prev) {
        fields[key] = { ...prev, inheritedValue: next };
      }
      continue;
    }
    if (JSON.stringify(prev?.inheritedValue) !== JSON.stringify(next)) {
      changedKeys.push(key);
    }
    if (next === undefined || next === null || next === "") {
      if (prev) delete fields[key];
      continue;
    }
    fields[key] = {
      key,
      mode: "linked",
      inheritedValue: next,
      localValue: next,
      source: prev?.source ?? "brand_kit",
    };
  }
  return { state: { ...state, fields }, changedKeys };
}

/** Apply resolved brand values into a plain record for form prepopulation. */
export function applyInheritanceToDraft<T extends Record<string, unknown>>(
  draft: T,
  state: BrandInheritanceState,
  map: Partial<Record<BrandFieldKey, keyof T>>
): T {
  const next = { ...draft };
  for (const [brandKey, draftKey] of Object.entries(map) as [BrandFieldKey, keyof T][]) {
    const value = resolveInheritedValue(state, brandKey);
    if (value === undefined) continue;
    (next as Record<string, unknown>)[draftKey as string] = value;
  }
  return next;
}

export function explainMode(mode: BrandInheritanceMode): string {
  switch (mode) {
    case "linked":
      return "Using current Brand Kit values in this session (copied into this object — not a durable sync).";
    case "copied":
      return "Copied Brand Kit values into this object — future Kit changes do not auto-update it yet.";
    case "overridden":
      return "Customized for this experience — Restore Brand Kit values to re-copy from the Kit.";
    case "ignored":
      return "Not using Brand Kit for this field.";
  }
}
