/**
 * Shared Visual Authoring Core V0 — property resolution, provenance, reset, promote.
 * Consumed by Brand Kit workspace and Card (and later Campaign / Wallet / etc.).
 *
 * Resolution order:
 *   1. Brand Kit
 *   2. Surface theme
 *   3. Component preset
 *   4. Individual item override
 */

export type PropertySource = "brand" | "surface" | "preset" | "custom";

/** Brand color roles (V0). Mapped to BrandKit fields via adapter — not a parallel store. */
export type BrandColorRole =
  | "primary"
  | "secondary"
  | "background"
  | "surface"
  | "headline"
  | "body"
  | "cta"
  | "link"
  | "offerEmphasis";

export type BrandFontRole = "display" | "body" | "accent";

export type VisualPropertyKey =
  | `color.${BrandColorRole}`
  | `font.${BrandFontRole}`
  | "radius"
  | "icon"
  | "background"
  | "foreground"
  | "logo"
  | "imageFit"
  | string;

export type ResolvedProperty<T = string> = {
  value: T;
  source: PropertySource;
  /** Brand role or Brand Kit field key when inherited from Brand */
  role?: BrandColorRole | BrandFontRole | string | null;
  locked?: boolean;
  label?: string;
};

export type PropertyLayer<T = string> = {
  value?: T | null;
  role?: BrandColorRole | BrandFontRole | string | null;
};

export type PropertyStack<T = string> = {
  brand?: PropertyLayer<T>;
  surface?: PropertyLayer<T>;
  preset?: PropertyLayer<T>;
  item?: PropertyLayer<T>;
  locked?: boolean;
  label?: string;
};

export type VisualSurfaceId =
  | "card"
  | "campaign"
  | "wallet"
  | "email"
  | "social"
  | "form"
  | "confirmation"
  | "mytap"
  | "autopilot"
  | "brand_preview";

/** Resolve one property through Brand → Surface → Preset → Item. */
export function resolveProperty<T = string>(
  stack: PropertyStack<T>
): ResolvedProperty<T | undefined> {
  if (stack.item?.value !== undefined && stack.item?.value !== null && stack.item.value !== "") {
    return {
      value: stack.item.value,
      source: "custom",
      role: stack.item.role ?? stack.brand?.role ?? null,
      locked: stack.locked,
      label: stack.label,
    };
  }
  if (
    stack.preset?.value !== undefined &&
    stack.preset?.value !== null &&
    stack.preset.value !== ""
  ) {
    return {
      value: stack.preset.value,
      source: "preset",
      role: stack.preset.role ?? stack.brand?.role ?? null,
      locked: stack.locked,
      label: stack.label,
    };
  }
  if (
    stack.surface?.value !== undefined &&
    stack.surface?.value !== null &&
    stack.surface.value !== ""
  ) {
    return {
      value: stack.surface.value,
      source: "surface",
      role: stack.surface.role ?? stack.brand?.role ?? null,
      locked: stack.locked,
      label: stack.label,
    };
  }
  if (stack.brand?.value !== undefined && stack.brand?.value !== null && stack.brand.value !== "") {
    return {
      value: stack.brand.value,
      source: "brand",
      role: stack.brand.role ?? null,
      locked: stack.locked,
      label: stack.label,
    };
  }
  return {
    value: undefined,
    source: "brand",
    role: stack.brand?.role ?? null,
    locked: stack.locked,
    label: stack.label,
  };
}

/** Apply a local item override without detaching sibling properties. */
export function setItemOverride<T>(
  stack: PropertyStack<T>,
  value: T,
  role?: BrandColorRole | BrandFontRole | string | null
): PropertyStack<T> {
  return {
    ...stack,
    item: { value, role: role ?? stack.item?.role ?? stack.brand?.role ?? null },
  };
}

/** Reset one property to Brand (clears surface/preset/item for that stack). */
export function resetPropertyToBrand<T>(stack: PropertyStack<T>): PropertyStack<T> {
  return {
    ...stack,
    surface: undefined,
    preset: stack.preset?.role && !stack.preset.value ? stack.preset : undefined,
    item: undefined,
  };
}

/**
 * Reset property but keep component preset icon/shape defaults that are not Brand-owned.
 * For proof: clear item + surface; leave preset (e.g. icon) intact.
 */
export function resetPropertyToBrandKeepPreset<T>(
  stack: PropertyStack<T>
): PropertyStack<T> {
  return {
    ...stack,
    surface: undefined,
    item: undefined,
  };
}

export function isCustomSource(source: PropertySource): boolean {
  return source === "custom";
}

export function provenanceLabel(source: PropertySource): string {
  switch (source) {
    case "brand":
      return "Brand";
    case "surface":
      return "Surface";
    case "preset":
      return "Component";
    case "custom":
      return "Custom";
  }
}

/** Map of property key → stack for one authored item (e.g. Card action button). */
export type ItemPropertyMap = Record<string, PropertyStack>;

export function resetItemToBrand(map: ItemPropertyMap): ItemPropertyMap {
  const next: ItemPropertyMap = {};
  for (const [key, stack] of Object.entries(map)) {
    next[key] = resetPropertyToBrandKeepPreset(stack);
  }
  return next;
}

export function resolveItemProperties(
  map: ItemPropertyMap
): Record<string, ResolvedProperty<string | undefined>> {
  const out: Record<string, ResolvedProperty<string | undefined>> = {};
  for (const [key, stack] of Object.entries(map)) {
    out[key] = resolveProperty(stack);
  }
  return out;
}

/**
 * Safe promote: take a custom item value and write it into Brand role layer.
 * Does not mutate other items' intentional overrides — caller must re-resolve.
 */
export type PromoteResult = {
  ok: true;
  role: BrandColorRole;
  value: string;
  impact: string;
} | {
  ok: false;
  reason: string;
};

export function promoteColorToBrandRole(
  customValue: string | undefined | null,
  role: BrandColorRole
): PromoteResult {
  if (!customValue || !/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(customValue)) {
    return { ok: false, reason: "Choose a valid custom color before promoting to Brand." };
  }
  return {
    ok: true,
    role,
    value: customValue,
    impact: `Brand Kit ${role} will update for previews and new inheriting defaults. Existing saved/public Cards keep stored colors until re-saved — not live linked sync. Intentional Custom overrides stay as they are.`,
  };
}

/** Apply one property value to similar items that still inherit (not custom). */
export function applyToSimilarInherited(
  items: Array<{ id: string; properties: ItemPropertyMap }>,
  propertyKey: string,
  value: string,
  sourceItemId: string
): Array<{ id: string; properties: ItemPropertyMap }> {
  return items.map((item) => {
    if (item.id === sourceItemId) return item;
    const stack = item.properties[propertyKey];
    if (!stack) return item;
    const resolved = resolveProperty(stack);
    if (resolved.source === "custom") return item;
    return {
      ...item,
      properties: {
        ...item.properties,
        [propertyKey]: setItemOverride(stack, value, stack.brand?.role),
      },
    };
  });
}
