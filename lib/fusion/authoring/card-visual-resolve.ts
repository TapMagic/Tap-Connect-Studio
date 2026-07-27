/**
 * Shared Card visual property stacks — Brand Kit workspace + Card preview consume this.
 * Proof property: action button background (property-level override).
 */

import type { TapCardSection, TapConnectCardConfig } from "@/lib/brand/tap-card";
import {
  brandColorsFromKit,
  buttonStyleToRadius,
  type BrandKitVisualFields,
} from "./brand-kit-adapter";
import {
  applyToSimilarInherited,
  promoteColorToBrandRole,
  resetItemToBrand,
  resetPropertyToBrandKeepPreset,
  resolveItemProperties,
  resolveProperty,
  setItemOverride,
  type BrandColorRole,
  type ItemPropertyMap,
  type PromoteResult,
  type PropertyStack,
  type ResolvedProperty,
} from "./visual-property";

export type CardActionVisualItem = {
  id: string;
  label: string;
  kind?: string;
  properties: ItemPropertyMap;
};

export type CardVisualModel = {
  brand: BrandKitVisualFields;
  surfaceRadius: string;
  items: CardActionVisualItem[];
  /** Selected action id for override proof */
  selectedItemId: string | null;
};

const PRESET_ICON = "link";

export function buildActionPropertyMap(
  brand: BrandKitVisualFields,
  section?: Partial<TapCardSection> | null
): ItemPropertyMap {
  const colors = brandColorsFromKit(brand);
  const radius = buttonStyleToRadius(brand.buttonStyle);
  const background: PropertyStack = {
    brand: { value: colors.cta, role: "cta" },
    surface: undefined,
    preset: undefined,
    item:
      section?.backgroundColor && section.backgroundColor.trim()
        ? { value: section.backgroundColor, role: "cta" }
        : undefined,
    label: "Button background",
  };
  const foreground: PropertyStack = {
    brand: { value: colors.headline, role: "headline" },
    item:
      section?.textColor && section.textColor.trim()
        ? { value: section.textColor, role: "headline" }
        : undefined,
    label: "Button text",
  };
  const radiusStack: PropertyStack = {
    brand: { value: radius, role: "radius" },
    surface: { value: radius, role: "radius" },
    item: section?.shape
      ? { value: shapeToRadius(section.shape), role: "radius" }
      : undefined,
    label: "Corner radius",
  };
  const icon: PropertyStack = {
    brand: undefined,
    preset: { value: section?.icon || PRESET_ICON, role: "icon" },
    item: undefined,
    label: "Icon",
  };
  return {
    background,
    foreground,
    radius: radiusStack,
    icon,
  };
}

function shapeToRadius(shape: string): string {
  switch (shape) {
    case "pill":
      return "999px";
    case "circle":
      return "50%";
    case "square":
      return "0";
    case "rounded_sm":
      return "0.4rem";
    case "rounded_md":
      return "0.75rem";
    case "rounded_lg":
      return "1rem";
    case "rounded_xl":
      return "1.35rem";
    default:
      return "1rem";
  }
}

/** Build visual model from Brand Kit + Card config (shared by both previews). */
export function buildCardVisualModel(
  brand: BrandKitVisualFields,
  config: TapConnectCardConfig | null | undefined,
  selectedItemId?: string | null
): CardVisualModel {
  const actions = collectActions(config);
  const items: CardActionVisualItem[] =
    actions.length > 0
      ? actions.map((a) => ({
          id: a.id,
          label: a.label || a.buttonLabel || a.actionKind || "Action",
          kind: a.actionKind,
          properties: buildActionPropertyMap(brand, a),
        }))
      : [
          {
            id: "proof-action",
            label: "Primary action",
            kind: "website",
            properties: buildActionPropertyMap(brand, null),
          },
        ];

  return {
    brand,
    surfaceRadius: buttonStyleToRadius(brand.buttonStyle),
    items,
    selectedItemId: selectedItemId ?? items[0]?.id ?? null,
  };
}

function collectActions(config: TapConnectCardConfig | null | undefined): TapCardSection[] {
  if (!config?.sections?.length) return [];
  const out: TapCardSection[] = [];
  for (const s of config.sections) {
    if (s.type === "action" && s.enabled !== false) out.push(s);
    if (s.type === "action_row" && s.children) {
      for (const c of s.children) {
        if (c.type === "action" && c.enabled !== false) out.push(c);
      }
    }
  }
  return out;
}

/** Re-resolve all items after Brand Kit colors change — preserves Custom item overrides. */
export function syncCardVisualFromBrand(
  model: CardVisualModel,
  brand: BrandKitVisualFields
): CardVisualModel {
  const colors = brandColorsFromKit(brand);
  const radius = buttonStyleToRadius(brand.buttonStyle);
  return {
    ...model,
    brand,
    surfaceRadius: radius,
    items: model.items.map((item) => {
      const props = { ...item.properties };
      for (const [key, stack] of Object.entries(props)) {
        const next = { ...stack };
        if (key === "background") {
          next.brand = { value: colors.cta, role: "cta" };
        } else if (key === "foreground") {
          next.brand = { value: colors.headline, role: "headline" };
        } else if (key === "radius") {
          next.brand = { value: radius, role: "radius" };
          next.surface = { value: radius, role: "radius" };
        }
        props[key] = next;
      }
      return { ...item, properties: props };
    }),
  };
}

export function overrideCardItemProperty(
  model: CardVisualModel,
  itemId: string,
  propertyKey: string,
  value: string
): CardVisualModel {
  return {
    ...model,
    items: model.items.map((item) => {
      if (item.id !== itemId) return item;
      const stack = item.properties[propertyKey];
      if (!stack) return item;
      return {
        ...item,
        properties: {
          ...item.properties,
          [propertyKey]: setItemOverride(stack, value, stack.brand?.role),
        },
      };
    }),
  };
}

export function resetCardItemProperty(
  model: CardVisualModel,
  itemId: string,
  propertyKey: string
): CardVisualModel {
  return {
    ...model,
    items: model.items.map((item) => {
      if (item.id !== itemId) return item;
      const stack = item.properties[propertyKey];
      if (!stack) return item;
      return {
        ...item,
        properties: {
          ...item.properties,
          [propertyKey]: resetPropertyToBrandKeepPreset(stack),
        },
      };
    }),
  };
}

export function resetCardItem(model: CardVisualModel, itemId: string): CardVisualModel {
  return {
    ...model,
    items: model.items.map((item) =>
      item.id === itemId
        ? { ...item, properties: resetItemToBrand(item.properties) }
        : item
    ),
  };
}

export function applyBackgroundToSimilarOnCard(
  model: CardVisualModel,
  sourceItemId: string,
  value: string
): CardVisualModel {
  const updated = applyToSimilarInherited(
    model.items.map((i) => ({ id: i.id, properties: i.properties })),
    "background",
    value,
    sourceItemId
  );
  return {
    ...model,
    items: model.items.map((item) => {
      const hit = updated.find((u) => u.id === item.id);
      return hit ? { ...item, properties: hit.properties } : item;
    }),
  };
}

export function resolveSelectedAction(
  model: CardVisualModel
): Record<string, ResolvedProperty<string | undefined>> | null {
  const item = model.items.find((i) => i.id === model.selectedItemId) ?? model.items[0];
  if (!item) return null;
  return resolveItemProperties(item.properties);
}

export function resolvedBackgroundSource(
  model: CardVisualModel,
  itemId?: string | null
): ResolvedProperty<string | undefined> | null {
  const id = itemId ?? model.selectedItemId;
  const item = model.items.find((i) => i.id === id);
  if (!item?.properties.background) return null;
  return resolveProperty(item.properties.background);
}

/**
 * Promote custom button background → Brand CTA role (maps to primaryColor).
 * Safe: does not clear other items' Custom overrides.
 */
export function promoteButtonBackgroundToBrand(
  model: CardVisualModel,
  itemId: string
): { result: PromoteResult; nextBrand?: BrandKitVisualFields; nextModel?: CardVisualModel } {
  const item = model.items.find((i) => i.id === itemId);
  if (!item) return { result: { ok: false, reason: "No button selected." } };
  const resolved = resolveProperty(item.properties.background);
  if (resolved.source !== "custom" || !resolved.value) {
    return {
      result: {
        ok: false,
        reason: "Promote only works when this button background is Custom.",
      },
    };
  }
  const result = promoteColorToBrandRole(resolved.value, "cta");
  if (!result.ok) return { result };
  const nextBrand = {
    ...model.brand,
    primaryColor: result.value,
  };
  // Keep this item custom (same value); sync brand layer for inheritors
  let nextModel = syncCardVisualFromBrand(model, nextBrand);
  // Selected item stays custom with same value
  nextModel = overrideCardItemProperty(nextModel, itemId, "background", result.value);
  return { result, nextBrand, nextModel };
}

export function applyResolvedToSectionStyle(
  resolved: Record<string, ResolvedProperty<string | undefined>>
): {
  backgroundColor?: string;
  color?: string;
  borderRadius?: string;
  icon?: string;
  dataSources: Record<string, string>;
} {
  return {
    backgroundColor: resolved.background?.value,
    color: resolved.foreground?.value,
    borderRadius: resolved.radius?.value,
    icon: resolved.icon?.value,
    dataSources: {
      background: resolved.background?.source ?? "brand",
      foreground: resolved.foreground?.source ?? "brand",
      radius: resolved.radius?.source ?? "brand",
      icon: resolved.icon?.source ?? "preset",
    },
  };
}

export type { BrandColorRole };
