/**
 * Intelligent Prefill — Owner-visible control over using approved Business / Brand
 * information without silently overwriting manual or locked values.
 */

import type {
  BrandFieldKey,
  BrandInheritanceState,
  BrandKitSnapshot,
  InheritedFieldState,
} from "@/lib/fusion/authoring/brand-inheritance";
import {
  BRAND_FIELD_LABELS,
  copyOnce,
  createInheritanceState,
  restoreInherited,
} from "@/lib/fusion/authoring/brand-inheritance";

export type PrefillSourceKind =
  | "business"
  | "brand"
  | "location"
  | "website"
  | "custom"
  | "none";

export type PrefillFieldProvenance = {
  key: BrandFieldKey;
  source: PrefillSourceKind;
  label: string;
  mode: InheritedFieldState["mode"];
  value: string | string[] | null | undefined;
  locked?: boolean;
};

export type IntelligentPrefillPolicy = {
  /** Master switch — Off stops future automatic filling; does not erase values. */
  enabled: boolean;
  /** When true, blank fields may be filled from approved sources. */
  autoFillBlanks: boolean;
  lastRefreshAt: string | null;
};

export const DEFAULT_PREFILL_POLICY: IntelligentPrefillPolicy = {
  enabled: true,
  autoFillBlanks: true,
  lastRefreshAt: null,
};

export function sourceLabel(source: PrefillSourceKind): string {
  switch (source) {
    case "business":
      return "From Business";
    case "brand":
      return "From Brand";
    case "location":
      return "From Location";
    case "website":
      return "From website";
    case "custom":
      return "Custom here";
    case "none":
      return "Not set";
  }
}

export function mapInheritanceSource(
  source: InheritedFieldState["source"],
  mode: InheritedFieldState["mode"]
): PrefillSourceKind {
  if (mode === "overridden" || mode === "ignored") return "custom";
  if (source === "business") return "business";
  if (source === "brand_kit") return "brand";
  return "none";
}

export function listPrefillProvenance(
  state: BrandInheritanceState
): PrefillFieldProvenance[] {
  const out: PrefillFieldProvenance[] = [];
  for (const [key, field] of Object.entries(state.fields) as [
    BrandFieldKey,
    InheritedFieldState,
  ][]) {
    if (!field) continue;
    const source = mapInheritanceSource(field.source, field.mode);
    out.push({
      key,
      source,
      label: sourceLabel(source),
      mode: field.mode,
      value: field.localValue ?? field.inheritedValue,
    });
  }
  return out;
}

export function stopAutomaticPrefill(
  policy: IntelligentPrefillPolicy
): IntelligentPrefillPolicy {
  return { ...policy, enabled: false, autoFillBlanks: false };
}

export function enableAutomaticPrefill(
  policy: IntelligentPrefillPolicy
): IntelligentPrefillPolicy {
  return { ...policy, enabled: true, autoFillBlanks: true };
}

/**
 * Fill only blank fields from approved snapshot. Never touches overridden,
 * ignored, or locked fields. Turning policy off is handled by the caller.
 */
export function fillRemainingBlanks(
  state: BrandInheritanceState,
  approved: BrandKitSnapshot,
  opts?: { lockedKeys?: BrandFieldKey[] }
): BrandInheritanceState {
  if (!state.useBrandKit) return state;
  const locked = new Set(opts?.lockedKeys ?? []);
  const fields = { ...state.fields };
  for (const key of Object.keys(BRAND_FIELD_LABELS) as BrandFieldKey[]) {
    if (locked.has(key)) continue;
    const approvedValue = approved[key];
    if (
      approvedValue === undefined ||
      approvedValue === null ||
      approvedValue === ""
    ) {
      continue;
    }
    const prev = fields[key];
    if (prev?.mode === "overridden" || prev?.mode === "ignored") continue;
    const current = prev?.localValue ?? prev?.inheritedValue;
    const blank =
      current === undefined ||
      current === null ||
      current === "" ||
      (Array.isArray(current) && current.length === 0);
    if (!blank) continue;
    fields[key] = {
      key,
      mode: "linked",
      inheritedValue: approvedValue,
      localValue: approvedValue,
      source:
        key === "businessName" ||
        key === "phone" ||
        key === "email" ||
        key === "website" ||
        key === "address"
          ? "business"
          : "brand_kit",
    };
  }
  return { ...state, fields, useBrandKit: true };
}

/**
 * Refresh non-overridden fields from approved sources.
 * Preserves overridden / ignored / locked values.
 */
export function refreshFromApproved(
  state: BrandInheritanceState,
  approved: BrandKitSnapshot,
  opts?: { lockedKeys?: BrandFieldKey[] }
): BrandInheritanceState {
  if (!state.useBrandKit) return state;
  const locked = new Set(opts?.lockedKeys ?? []);
  const fields = { ...state.fields };
  for (const key of Object.keys(BRAND_FIELD_LABELS) as BrandFieldKey[]) {
    if (locked.has(key)) continue;
    const approvedValue = approved[key];
    const prev = fields[key];
    if (prev?.mode === "overridden" || prev?.mode === "ignored") {
      if (prev) {
        fields[key] = { ...prev, inheritedValue: approvedValue };
      }
      continue;
    }
    if (
      approvedValue === undefined ||
      approvedValue === null ||
      approvedValue === ""
    ) {
      continue;
    }
    fields[key] = {
      key,
      mode: "linked",
      inheritedValue: approvedValue,
      localValue: approvedValue,
      source:
        key === "businessName" ||
        key === "phone" ||
        key === "email" ||
        key === "website" ||
        key === "address"
          ? "business"
          : "brand_kit",
    };
  }
  return { ...state, fields, useBrandKit: true };
}

/** Reset non-locked fields back to approved saved information. */
export function resetToSavedInformation(
  state: BrandInheritanceState,
  approved: BrandKitSnapshot,
  opts?: { lockedKeys?: BrandFieldKey[]; onlyKeys?: BrandFieldKey[] }
): BrandInheritanceState {
  const locked = new Set(opts?.lockedKeys ?? []);
  const only = opts?.onlyKeys ? new Set(opts.onlyKeys) : null;
  if (!only) {
    const base = createInheritanceState(approved, {
      useBrandKit: true,
      staySynchronized: false,
    });
    const fields = { ...base.fields };
    for (const key of locked) {
      const prev = state.fields[key];
      if (prev) fields[key] = prev;
    }
    return { ...base, fields, useBrandKit: true };
  }

  const fields = { ...state.fields };
  for (const key of only) {
    if (locked.has(key)) continue;
    const approvedValue = approved[key];
    if (
      approvedValue === undefined ||
      approvedValue === null ||
      approvedValue === ""
    ) {
      delete fields[key];
      continue;
    }
    fields[key] = {
      key,
      mode: "linked",
      inheritedValue: approvedValue,
      localValue: approvedValue,
      source:
        key === "businessName" ||
        key === "phone" ||
        key === "email" ||
        key === "website" ||
        key === "address"
          ? "business"
          : "brand_kit",
    };
  }
  return { ...state, fields, useBrandKit: true };
}

export function keepLinked(
  state: BrandInheritanceState,
  key: BrandFieldKey
): BrandInheritanceState {
  return restoreInherited({ ...state, staySynchronized: true }, key);
}

export function markUseOnlyHere(
  state: BrandInheritanceState,
  key: BrandFieldKey
): BrandInheritanceState {
  const prev = state.fields[key];
  if (!prev) return state;
  return {
    ...state,
    fields: {
      ...state.fields,
      [key]: { ...prev, mode: "copied" },
    },
  };
}

export function stopUsingSource(
  state: BrandInheritanceState,
  key: BrandFieldKey
): BrandInheritanceState {
  const prev = state.fields[key];
  if (!prev) return state;
  return {
    ...state,
    fields: {
      ...state.fields,
      [key]: { ...prev, mode: "ignored" },
    },
  };
}

export function freezeCurrentValues(
  state: BrandInheritanceState
): BrandInheritanceState {
  return copyOnce(state);
}

export function parsePrefillPolicy(raw: unknown): IntelligentPrefillPolicy {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_PREFILL_POLICY };
  const obj = raw as Record<string, unknown>;
  return {
    enabled: obj.enabled !== false,
    autoFillBlanks: obj.autoFillBlanks !== false,
    lastRefreshAt:
      typeof obj.lastRefreshAt === "string" ? obj.lastRefreshAt : null,
  };
}
