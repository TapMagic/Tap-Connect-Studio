/**
 * Campaign visual adapter — Shared Visual Authoring Core consumer.
 * Maps Campaign themeOverrides + BlockStyle/ButtonItem into property stacks.
 * Persistence stays on existing themeOverrides / contentBlocks JSON (no Prisma change).
 *
 * Inheritance classification: MIXED
 * - Create-time Brand color snapshot into themeOverrides
 * - Runtime Brand fallback for missing keys on public render
 * - Contact / logo chrome: runtime Brand/Business
 * - This wave: no durable linked Brand sync; published output is snapshot-safe
 *
 * Maturity: IMPLEMENTED BUT NOT OWNER-READY.
 */

import type { BlockStyle, ButtonItem, ContentBlock } from "@/lib/types/campaign";
import {
  brandColorsFromKit,
  buttonStyleToRadius,
  resolveFontFamily,
  type BrandKitVisualFields,
} from "./brand-kit-adapter";
import { checkBrandContrast, readableOn, type ContrastCheck } from "./contrast";
import {
  applyToSimilarInherited,
  promoteColorToBrandRole,
  provenanceLabel,
  resetItemToBrand,
  resetPropertyToBrandKeepPreset,
  resolveItemProperties,
  resolveProperty,
  setItemOverride,
  type ItemPropertyMap,
  type PromoteResult,
  type PropertySource,
  type PropertyStack,
  type ResolvedProperty,
} from "./visual-property";

/** Honest host labels for Campaign (surface → Campaign). */
export function campaignProvenanceLabel(source: PropertySource): string {
  switch (source) {
    case "brand":
      return "Brand";
    case "surface":
      return "Campaign";
    case "preset":
      return "Preset";
    case "custom":
      return "Custom";
  }
}

export type CampaignInheritanceClass = "snapshot" | "runtime" | "mixed";

/** Documented truth for Product Owner — do not change silently. */
export function classifyCampaignInheritance(): {
  class: CampaignInheritanceClass;
  summary: string;
  properties: Record<string, CampaignInheritanceClass>;
} {
  return {
    class: "mixed",
    summary:
      "Campaign colors are snapshotted into themeOverrides at create/save. Public render falls back to Brand Kit only when a key is missing. Contact and logo chrome resolve from Brand/Business at runtime. No durable linked Brand sync.",
    properties: {
      primaryColor: "snapshot",
      secondaryColor: "snapshot",
      backgroundColor: "snapshot",
      textColor: "snapshot",
      fontStyle: "snapshot",
      fontFamily: "snapshot",
      backgroundImage: "snapshot",
      buttonColors: "snapshot",
      contactProfile: "runtime",
      logoUrl: "runtime",
      missingThemeKeyFallback: "runtime",
    },
  };
}

export type CampaignThemeState = {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  backgroundImage: string;
  backgroundOverlayOpacity: number;
  fontStyle: string;
  fontFamily?: string;
  showPageLogo: boolean;
  defaultButtonShape: string;
  defaultButtonFinish: string;
};

export type CampaignCtaVisualItem = {
  id: string;
  blockId: string;
  label: string;
  kind: "button" | "offer_cta";
  properties: ItemPropertyMap;
};

export type CampaignVisualModel = {
  brand: BrandKitVisualFields;
  /** Campaign-level surface stacks (theme). */
  surface: ItemPropertyMap;
  items: CampaignCtaVisualItem[];
  selectedItemId: string | null;
  themeExtras: {
    backgroundImage: string;
    backgroundOverlayOpacity: number;
    showPageLogo: boolean;
    defaultButtonShape: string;
    defaultButtonFinish: string;
  };
};

function sameHex(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * Build surface stacks: Brand defaults + Campaign themeOverrides as surface when set.
 * Snapshot values that match Brand still sit on surface (honest Campaign snapshot ownership).
 */
export function buildCampaignSurfaceMap(
  brand: BrandKitVisualFields,
  theme: Partial<CampaignThemeState> | null | undefined,
  opts?: { treatMatchingBrandAsInherited?: boolean }
): ItemPropertyMap {
  const colors = brandColorsFromKit(brand);
  const treatMatch = opts?.treatMatchingBrandAsInherited ?? false;
  const font = resolveFontFamily(brand, "body");

  const surfaceOrBrand = (
    themeValue: string | undefined,
    brandValue: string,
    role: string,
    label: string
  ): PropertyStack => {
    const hasTheme = Boolean(themeValue && themeValue.trim());
    const matchesBrand = hasTheme && sameHex(themeValue, brandValue);
    const useSurface = hasTheme && !(treatMatch && matchesBrand);
    return {
      brand: { value: brandValue, role },
      surface: useSurface ? { value: themeValue!.trim(), role } : undefined,
      label,
    };
  };

  const fontStack: PropertyStack = {
    brand: { value: font.id, role: "body" },
    surface:
      theme?.fontStyle && theme.fontStyle.trim()
        ? { value: theme.fontStyle, role: "body" }
        : undefined,
    label: "Page font",
  };

  return {
    background: surfaceOrBrand(
      theme?.backgroundColor,
      colors.background,
      "background",
      "Campaign background"
    ),
    headline: surfaceOrBrand(
      theme?.textColor,
      colors.headline,
      "headline",
      "Headline / body text"
    ),
    body: surfaceOrBrand(theme?.textColor, colors.body, "body", "Body text"),
    primary: surfaceOrBrand(
      theme?.primaryColor,
      colors.primary,
      "primary",
      "Primary Brand"
    ),
    secondary: surfaceOrBrand(
      theme?.secondaryColor,
      colors.secondary,
      "secondary",
      "Secondary Brand"
    ),
    cta: surfaceOrBrand(theme?.primaryColor, colors.cta, "cta", "Customer-facing CTA"),
    link: {
      brand: { value: colors.link, role: "link" },
      label: "Link",
    },
    offerEmphasis: {
      brand: { value: colors.offerEmphasis, role: "offerEmphasis" },
      label: "Offer emphasis",
    },
    font: fontStack,
  };
}

function shapeToRadius(shape?: string | null): string {
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
      return buttonStyleToRadius(null);
  }
}

/** Property stacks for one CTA / button — proof property: background. */
export function buildCtaPropertyMap(
  brand: BrandKitVisualFields,
  button?: Partial<ButtonItem> | null,
  surfacePrimary?: string | null
): ItemPropertyMap {
  const colors = brandColorsFromKit(brand);
  const ctaBrand = surfacePrimary?.trim() || colors.cta;
  const radius = buttonStyleToRadius(brand.buttonStyle);

  const background: PropertyStack = {
    brand: { value: ctaBrand, role: "cta" },
    surface: surfacePrimary?.trim()
      ? { value: surfacePrimary.trim(), role: "cta" }
      : undefined,
    preset: undefined,
    item:
      button?.backgroundColor && button.backgroundColor.trim()
        ? { value: button.backgroundColor.trim(), role: "cta" }
        : undefined,
    label: "Button background",
  };

  const foreground: PropertyStack = {
    brand: { value: colors.headline, role: "headline" },
    item:
      button?.textColor && button.textColor.trim()
        ? { value: button.textColor.trim(), role: "headline" }
        : undefined,
    label: "Button text",
  };

  const radiusStack: PropertyStack = {
    brand: { value: radius, role: "radius" },
    surface: { value: radius, role: "radius" },
    preset: button?.shape
      ? { value: shapeToRadius(button.shape), role: "radius" }
      : undefined,
    item: undefined,
    label: "Corner radius",
  };

  const icon: PropertyStack = {
    preset: { value: button?.icon || "link", role: "icon" },
    label: "Icon",
  };

  const opacity: PropertyStack = {
    brand: { value: "1", role: "opacity" },
    item:
      typeof button?.opacity === "number"
        ? { value: String(button.opacity), role: "opacity" }
        : undefined,
    label: "Opacity",
  };

  return {
    background,
    foreground,
    radius: radiusStack,
    icon,
    opacity,
  };
}

function collectCtaItems(
  brand: BrandKitVisualFields,
  blocks: ContentBlock[],
  surfacePrimary?: string | null
): CampaignCtaVisualItem[] {
  const out: CampaignCtaVisualItem[] = [];
  for (const block of blocks) {
    if (block.enabled === false) continue;
    if (block.type === "button_group") {
      const buttons = (block.data as { buttons?: ButtonItem[] })?.buttons ?? [];
      for (const btn of buttons) {
        out.push({
          id: `${block.id}::${btn.id}`,
          blockId: block.id,
          label: btn.label || "Button",
          kind: "button",
          properties: buildCtaPropertyMap(brand, btn, surfacePrimary),
        });
      }
    }
    if (block.type === "offer_coupon") {
      const data = block.data as {
        ctaLabel?: string;
        backgroundColor?: string;
        textColor?: string;
      };
      const synthetic: Partial<ButtonItem> = {
        id: "offer-cta",
        label: data.ctaLabel || "Claim offer",
        backgroundColor: data.backgroundColor,
        textColor: data.textColor,
        style: "primary",
      };
      out.push({
        id: `${block.id}::offer-cta`,
        blockId: block.id,
        label: synthetic.label || "Offer CTA",
        kind: "offer_cta",
        properties: buildCtaPropertyMap(brand, synthetic, surfacePrimary),
      });
    }
  }
  return out;
}

export function buildCampaignVisualModel(
  brand: BrandKitVisualFields,
  theme: Partial<CampaignThemeState> | null | undefined,
  blocks: ContentBlock[],
  selectedItemId?: string | null
): CampaignVisualModel {
  const surface = buildCampaignSurfaceMap(brand, theme);
  const primaryResolved = resolveProperty(surface.primary);
  const items = collectCtaItems(brand, blocks, primaryResolved.value ?? null);
  return {
    brand,
    surface,
    items,
    selectedItemId: selectedItemId ?? items[0]?.id ?? null,
    themeExtras: {
      backgroundImage: theme?.backgroundImage ?? "",
      backgroundOverlayOpacity: theme?.backgroundOverlayOpacity ?? 55,
      showPageLogo: Boolean(theme?.showPageLogo),
      defaultButtonShape: theme?.defaultButtonShape ?? "pill",
      defaultButtonFinish: theme?.defaultButtonFinish ?? "flat",
    },
  };
}

/** Re-resolve after Brand Kit change — preserves Custom item overrides + Campaign surface. */
export function syncCampaignVisualFromBrand(
  model: CampaignVisualModel,
  brand: BrandKitVisualFields
): CampaignVisualModel {
  const colors = brandColorsFromKit(brand);
  const font = resolveFontFamily(brand, "body");
  const radius = buttonStyleToRadius(brand.buttonStyle);

  const surface: ItemPropertyMap = { ...model.surface };
  for (const [key, stack] of Object.entries(surface)) {
    const next = { ...stack };
    if (key === "background") next.brand = { value: colors.background, role: "background" };
    else if (key === "headline") next.brand = { value: colors.headline, role: "headline" };
    else if (key === "body") next.brand = { value: colors.body, role: "body" };
    else if (key === "primary") next.brand = { value: colors.primary, role: "primary" };
    else if (key === "secondary") next.brand = { value: colors.secondary, role: "secondary" };
    else if (key === "cta") next.brand = { value: colors.cta, role: "cta" };
    else if (key === "link") next.brand = { value: colors.link, role: "link" };
    else if (key === "offerEmphasis")
      next.brand = { value: colors.offerEmphasis, role: "offerEmphasis" };
    else if (key === "font") next.brand = { value: font.id, role: "body" };
    surface[key] = next;
  }

  const primaryResolved = resolveProperty(surface.primary);

  return {
    ...model,
    brand,
    surface,
    items: model.items.map((item) => {
      const props = { ...item.properties };
      for (const [key, stack] of Object.entries(props)) {
        const next = { ...stack };
        if (key === "background") {
          next.brand = { value: primaryResolved.value ?? colors.cta, role: "cta" };
          next.surface = primaryResolved.value
            ? { value: primaryResolved.value, role: "cta" }
            : undefined;
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

export function overrideCampaignSurfaceProperty(
  model: CampaignVisualModel,
  propertyKey: string,
  value: string
): CampaignVisualModel {
  const stack = model.surface[propertyKey];
  if (!stack) return model;
  return {
    ...model,
    surface: {
      ...model.surface,
      [propertyKey]: {
        ...stack,
        surface: { value, role: stack.brand?.role ?? propertyKey },
        item: undefined,
      },
    },
  };
}

export function resetCampaignSurfaceProperty(
  model: CampaignVisualModel,
  propertyKey: string
): CampaignVisualModel {
  const stack = model.surface[propertyKey];
  if (!stack) return model;
  return {
    ...model,
    surface: {
      ...model.surface,
      [propertyKey]: resetPropertyToBrandKeepPreset(stack),
    },
  };
}

export function resetCampaignThemeToBrand(model: CampaignVisualModel): CampaignVisualModel {
  const surface: ItemPropertyMap = {};
  for (const [key, stack] of Object.entries(model.surface)) {
    surface[key] = resetPropertyToBrandKeepPreset(stack);
  }
  return { ...model, surface };
}

export function overrideCampaignItemProperty(
  model: CampaignVisualModel,
  itemId: string,
  propertyKey: string,
  value: string
): CampaignVisualModel {
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

export function resetCampaignItemProperty(
  model: CampaignVisualModel,
  itemId: string,
  propertyKey: string
): CampaignVisualModel {
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

export function resetCampaignItem(
  model: CampaignVisualModel,
  itemId: string
): CampaignVisualModel {
  return {
    ...model,
    items: model.items.map((item) =>
      item.id === itemId
        ? { ...item, properties: resetItemToBrand(item.properties) }
        : item
    ),
  };
}

export function applyBackgroundToSimilarCampaignCtas(
  model: CampaignVisualModel,
  sourceItemId: string,
  value: string
): CampaignVisualModel {
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

export function resolveCampaignSurface(
  model: CampaignVisualModel
): Record<string, ResolvedProperty<string | undefined>> {
  return resolveItemProperties(model.surface);
}

export function resolveSelectedCampaignCta(
  model: CampaignVisualModel
): Record<string, ResolvedProperty<string | undefined>> | null {
  const item =
    model.items.find((i) => i.id === model.selectedItemId) ?? model.items[0];
  if (!item) return null;
  return resolveItemProperties(item.properties);
}

export function resolvedCampaignBackgroundSource(
  model: CampaignVisualModel
): ResolvedProperty<string | undefined> | null {
  if (!model.surface.background) return null;
  return resolveProperty(model.surface.background);
}

/**
 * Flatten resolved surface → theme props for CampaignPageRenderer / save payload.
 * Snapshot-safe: writes concrete values (not live Brand pointers).
 */
export function applyResolvedToCampaignTheme(
  model: CampaignVisualModel
): CampaignThemeState {
  const resolved = resolveCampaignSurface(model);
  const bg = resolved.background?.value ?? brandColorsFromKit(model.brand).background;
  const text = resolved.headline?.value ?? brandColorsFromKit(model.brand).headline;
  const primary = resolved.primary?.value ?? brandColorsFromKit(model.brand).primary;
  const secondary =
    resolved.secondary?.value ?? brandColorsFromKit(model.brand).secondary;
  const fontStyle = resolved.font?.value ?? "sans";
  return {
    primaryColor: primary,
    secondaryColor: secondary,
    backgroundColor: bg,
    textColor: text,
    backgroundImage: model.themeExtras.backgroundImage,
    backgroundOverlayOpacity: model.themeExtras.backgroundOverlayOpacity,
    fontStyle,
    fontFamily: undefined,
    showPageLogo: model.themeExtras.showPageLogo,
    defaultButtonShape: model.themeExtras.defaultButtonShape,
    defaultButtonFinish: model.themeExtras.defaultButtonFinish,
  };
}

/**
 * Write CTA custom backgrounds / text back onto contentBlocks without detaching siblings.
 */
export function applyCtaOverridesToBlocks(
  model: CampaignVisualModel,
  blocks: ContentBlock[]
): ContentBlock[] {
  return blocks.map((block) => {
    const related = model.items.filter((i) => i.blockId === block.id);
    if (related.length === 0) return block;

    if (block.type === "button_group") {
      const data = block.data as { buttons?: ButtonItem[] };
      const buttons = (data.buttons ?? []).map((btn) => {
        const item = related.find((r) => r.id === `${block.id}::${btn.id}`);
        if (!item) return btn;
        const resolved = resolveItemProperties(item.properties);
        const next = { ...btn };
        if (resolved.background?.source === "custom" && resolved.background.value) {
          next.backgroundColor = resolved.background.value;
        } else if (resolved.background?.source !== "custom") {
          // Clear stored custom so Brand/Campaign inheritance applies at render
          delete next.backgroundColor;
        }
        if (resolved.foreground?.source === "custom" && resolved.foreground.value) {
          next.textColor = resolved.foreground.value;
        } else if (resolved.foreground?.source !== "custom") {
          delete next.textColor;
        }
        return next;
      });
      return { ...block, data: { ...data, buttons } };
    }

    if (block.type === "offer_coupon") {
      const item = related.find((r) => r.kind === "offer_cta");
      if (!item) return block;
      const resolved = resolveItemProperties(item.properties);
      const data = { ...(block.data as Record<string, unknown>) };
      if (resolved.background?.source === "custom" && resolved.background.value) {
        data.backgroundColor = resolved.background.value;
      } else {
        delete data.backgroundColor;
      }
      if (resolved.foreground?.source === "custom" && resolved.foreground.value) {
        data.textColor = resolved.foreground.value;
      } else {
        delete data.textColor;
      }
      return { ...block, data };
    }

    return block;
  });
}

/** Map BlockStyle → stacks for Advanced / effects honesty (renderer-supported only). */
export function blockStyleToPropertyHints(style?: BlockStyle | null): {
  supported: string[];
  deferred: string[];
} {
  const supported = [
    "textColor",
    "backgroundColor",
    "fontSize",
    "fontWeight",
    "fontFamily",
    "align",
    "spacing",
    "card",
    "italic",
    "underline",
    "uppercase",
    "finish",
    "neonColor",
  ];
  const present = supported.filter((k) => {
    const v = style?.[k as keyof BlockStyle];
    return v !== undefined && v !== null && v !== "";
  });
  return {
    supported: present,
    deferred: ["extrusion", "reflection", "curvedText", "videoDam"],
  };
}

export function promoteCampaignCtaBackgroundToBrand(
  model: CampaignVisualModel,
  itemId: string
): {
  result: PromoteResult;
  nextBrand?: BrandKitVisualFields;
  nextModel?: CampaignVisualModel;
} {
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
  const nextBrand = { ...model.brand, primaryColor: result.value };
  let nextModel = syncCampaignVisualFromBrand(model, nextBrand);
  nextModel = overrideCampaignItemProperty(nextModel, itemId, "background", result.value);
  return { result, nextBrand, nextModel };
}

export function checkCampaignContrast(model: CampaignVisualModel): ContrastCheck[] {
  const surface = resolveCampaignSurface(model);
  const cta = resolveSelectedCampaignCta(model);
  const bg = surface.background?.value ?? "#0b0f19";
  const headline = surface.headline?.value ?? "#f8fafc";
  const body = surface.body?.value ?? headline;
  const ctaBg = cta?.background?.value ?? surface.cta?.value ?? "#22c55e";
  const ctaText = cta?.foreground?.value ?? readableOn(ctaBg);
  const link = surface.link?.value ?? "#f59e0b";
  const checks = checkBrandContrast({
    background: bg,
    surface: bg,
    headline,
    body,
    ctaBg,
    ctaText,
    link,
  });
  // Offer emphasis vs surface (advisory)
  const offer = surface.offerEmphasis?.value;
  if (offer) {
    const offerCheck = checkBrandContrast({
      background: bg,
      surface: bg,
      headline: offer,
      body: offer,
      ctaBg,
      ctaText,
      link: offer,
    }).find((c) => c.id === "link_on_background");
    if (offerCheck) {
      checks.push({
        ...offerCheck,
        id: "link_on_background",
        label: "Offer emphasis on surface",
      });
    }
  }
  return checks;
}

export function campaignDataSources(
  resolved: Record<string, ResolvedProperty<string | undefined>>
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, prop] of Object.entries(resolved)) {
    out[key] = prop.source;
  }
  return out;
}

export { provenanceLabel, readableOn };
