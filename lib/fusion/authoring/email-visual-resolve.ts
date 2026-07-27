/**
 * Email visual adapter — Shared Visual Authoring Core fourth consumer.
 * Maps Email visualTheme + block CTAs into property stacks with email-safe classification.
 *
 * Maturity: IMPLEMENTED BUT NOT OWNER-READY.
 */

import type { ButtonItem, ContentBlock } from "@/lib/types/campaign";
import {
  brandColorsFromKit,
  buttonStyleToRadius,
  resolveFontFamily,
  type BrandKitVisualFields,
} from "@/lib/fusion/authoring/brand-kit-adapter";
import { checkBrandContrast, readableOn, type ContrastCheck } from "@/lib/fusion/authoring/contrast";
import {
  applyToSimilarInherited,
  provenanceLabel,
  resetItemToBrand,
  resetPropertyToBrandKeepPreset,
  resolveItemProperties,
  resolveProperty,
  setItemOverride,
  type ItemPropertyMap,
  type PropertySource,
  type PropertyStack,
  type ResolvedProperty,
} from "@/lib/fusion/authoring/visual-property";
import type { EmailVisualTheme } from "@/lib/fusion/email/document";
import { emailSafeFontStack } from "@/lib/fusion/email/compatibility";

export function emailProvenanceLabel(source: PropertySource): string {
  switch (source) {
    case "brand":
      return "Brand";
    case "surface":
      return "Email";
    case "preset":
      return "Preset";
    case "custom":
      return "Custom";
  }
}

export type EmailCtaVisualItem = {
  id: string;
  blockId: string;
  label: string;
  kind: "button" | "offer_cta";
  properties: ItemPropertyMap;
};

export type EmailVisualModel = {
  brand: BrandKitVisualFields;
  surface: ItemPropertyMap;
  items: EmailCtaVisualItem[];
  selectedItemId: string | null;
  selectedSectionId: string | null;
  themeExtras: {
    showHeader: boolean;
    showFooter: boolean;
    showLogo: boolean;
    logoUrl: string;
  };
};

export function buildEmailSurfaceMap(
  brand: BrandKitVisualFields,
  theme?: EmailVisualTheme | null
): ItemPropertyMap {
  const colors = brandColorsFromKit(brand);
  const font = resolveFontFamily(brand, "body");
  const emailFont = emailSafeFontStack(font.css);

  const surfaceOrBrand = (
    themeValue: string | undefined,
    brandValue: string,
    role: string,
    label: string
  ): PropertyStack => {
    const hasTheme = Boolean(themeValue && themeValue.trim());
    return {
      brand: { value: brandValue, role },
      surface: hasTheme ? { value: themeValue!.trim(), role } : undefined,
      label,
    };
  };

  return {
    background: surfaceOrBrand(
      theme?.backgroundColor,
      colors.background,
      "background",
      "Email background"
    ),
    contentSurface: surfaceOrBrand(
      theme?.contentSurfaceColor,
      colors.surface,
      "surface",
      "Content surface"
    ),
    headline: surfaceOrBrand(theme?.headlineColor, colors.headline, "headline", "Headline"),
    body: surfaceOrBrand(theme?.bodyColor, colors.body, "body", "Body text"),
    ctaBackground: surfaceOrBrand(
      theme?.ctaBackgroundColor,
      colors.cta,
      "cta",
      "CTA background"
    ),
    ctaText: surfaceOrBrand(theme?.ctaTextColor, colors.headline, "headline", "CTA text"),
    link: surfaceOrBrand(theme?.linkColor, colors.link, "link", "Link"),
    offerEmphasis: surfaceOrBrand(
      theme?.offerEmphasisColor,
      colors.offerEmphasis,
      "offerEmphasis",
      "Offer emphasis"
    ),
    border: surfaceOrBrand(theme?.borderColor, "#e2e8f0", "border", "Border"),
    radius: surfaceOrBrand(theme?.borderRadius, buttonStyleToRadius(brand.buttonStyle), "radius", "Radius"),
    font: {
      brand: { value: font.id, role: "body" },
      surface: theme?.fontStyle ? { value: theme.fontStyle, role: "body" } : undefined,
      label: "Typography",
      // Honest email fallback stored as preset layer for host display
      preset: { value: emailFont.emailSafe, role: "body" },
    },
  };
}

function shapeToRadius(shape?: string | null): string {
  switch (shape) {
    case "pill":
      return "999px";
    case "square":
      return "0";
    case "rounded_sm":
      return "0.4rem";
    case "rounded_md":
      return "0.75rem";
    default:
      return buttonStyleToRadius(null);
  }
}

export function buildEmailCtaPropertyMap(
  brand: BrandKitVisualFields,
  button?: Partial<ButtonItem> | null,
  surfaceCta?: string | null
): ItemPropertyMap {
  const colors = brandColorsFromKit(brand);
  const ctaBrand = surfaceCta?.trim() || colors.cta;
  const radius = buttonStyleToRadius(brand.buttonStyle);

  return {
    background: {
      brand: { value: ctaBrand, role: "cta" },
      surface: surfaceCta?.trim() ? { value: surfaceCta.trim(), role: "cta" } : undefined,
      item:
        button?.backgroundColor?.trim()
          ? { value: button.backgroundColor.trim(), role: "cta" }
          : undefined,
      label: "Button background",
    },
    foreground: {
      brand: { value: colors.headline, role: "headline" },
      item:
        button?.textColor?.trim()
          ? { value: button.textColor.trim(), role: "headline" }
          : undefined,
      label: "Button text",
    },
    radius: {
      brand: { value: radius, role: "radius" },
      preset: button?.shape ? { value: shapeToRadius(button.shape), role: "radius" } : undefined,
      label: "Corner radius",
    },
  };
}

function collectEmailCtaItems(
  brand: BrandKitVisualFields,
  blocks: ContentBlock[],
  surfaceCta?: string | null
): EmailCtaVisualItem[] {
  const out: EmailCtaVisualItem[] = [];
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
          properties: buildEmailCtaPropertyMap(brand, btn, surfaceCta),
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
      };
      out.push({
        id: `${block.id}::offer-cta`,
        blockId: block.id,
        label: synthetic.label || "Offer CTA",
        kind: "offer_cta",
        properties: buildEmailCtaPropertyMap(brand, synthetic, surfaceCta),
      });
    }
  }
  return out;
}

export function buildEmailVisualModel(
  brand: BrandKitVisualFields,
  theme: EmailVisualTheme | null | undefined,
  blocks: ContentBlock[],
  opts?: { selectedItemId?: string | null; selectedSectionId?: string | null; showHeader?: boolean; showFooter?: boolean; showLogo?: boolean; logoUrl?: string }
): EmailVisualModel {
  const surface = buildEmailSurfaceMap(brand, theme);
  const ctaResolved = resolveProperty(surface.ctaBackground);
  const items = collectEmailCtaItems(brand, blocks, ctaResolved.value ?? null);
  return {
    brand,
    surface,
    items,
    selectedItemId: opts?.selectedItemId ?? items[0]?.id ?? null,
    selectedSectionId: opts?.selectedSectionId ?? blocks[0]?.id ?? null,
    themeExtras: {
      showHeader: opts?.showHeader !== false,
      showFooter: opts?.showFooter !== false,
      showLogo: opts?.showLogo !== false,
      logoUrl: opts?.logoUrl ?? "",
    },
  };
}

export function overrideEmailSurfaceProperty(
  model: EmailVisualModel,
  propertyKey: string,
  value: string
): EmailVisualModel {
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

export function resetEmailSurfaceProperty(
  model: EmailVisualModel,
  propertyKey: string
): EmailVisualModel {
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

export function resetEmailThemeToBrand(model: EmailVisualModel): EmailVisualModel {
  const surface: ItemPropertyMap = {};
  for (const [key, stack] of Object.entries(model.surface)) {
    surface[key] = resetPropertyToBrandKeepPreset(stack);
  }
  return { ...model, surface };
}

export function overrideEmailItemProperty(
  model: EmailVisualModel,
  itemId: string,
  propertyKey: string,
  value: string
): EmailVisualModel {
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

export function resetEmailItemProperty(
  model: EmailVisualModel,
  itemId: string,
  propertyKey: string
): EmailVisualModel {
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

export function resetEmailItem(model: EmailVisualModel, itemId: string): EmailVisualModel {
  return {
    ...model,
    items: model.items.map((item) =>
      item.id === itemId ? { ...item, properties: resetItemToBrand(item.properties) } : item
    ),
  };
}

export function applyBackgroundToSimilarEmailCtas(
  model: EmailVisualModel,
  sourceItemId: string,
  value: string
): EmailVisualModel {
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

export function resolveEmailSurface(
  model: EmailVisualModel
): Record<string, ResolvedProperty<string | undefined>> {
  return resolveItemProperties(model.surface);
}

export function resolveSelectedEmailCta(
  model: EmailVisualModel
): Record<string, ResolvedProperty<string | undefined>> | null {
  const item =
    model.items.find((i) => i.id === model.selectedItemId) ?? model.items[0];
  if (!item) return null;
  return resolveItemProperties(item.properties);
}

export function applyResolvedToEmailTheme(model: EmailVisualModel): EmailVisualTheme {
  const resolved = resolveEmailSurface(model);
  const colors = brandColorsFromKit(model.brand);
  return {
    backgroundColor: resolved.background?.value ?? colors.background,
    contentSurfaceColor: resolved.contentSurface?.value ?? colors.surface,
    headlineColor: resolved.headline?.value ?? colors.headline,
    bodyColor: resolved.body?.value ?? colors.body,
    ctaBackgroundColor: resolved.ctaBackground?.value ?? colors.cta,
    ctaTextColor: resolved.ctaText?.value ?? colors.headline,
    linkColor: resolved.link?.value ?? colors.link,
    offerEmphasisColor: resolved.offerEmphasis?.value ?? colors.offerEmphasis,
    borderColor: resolved.border?.value ?? "#e2e8f0",
    borderRadius: resolved.radius?.value ?? buttonStyleToRadius(model.brand.buttonStyle),
    fontStyle: resolved.font?.value ?? "sans",
  };
}

export function applyEmailCtaOverridesToBlocks(
  model: EmailVisualModel,
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

export function checkEmailContrast(model: EmailVisualModel): ContrastCheck[] {
  const surface = resolveEmailSurface(model);
  const cta = resolveSelectedEmailCta(model);
  const bg = surface.contentSurface?.value ?? surface.background?.value ?? "#ffffff";
  const headline = surface.headline?.value ?? "#0f172a";
  const body = surface.body?.value ?? headline;
  const ctaBg = cta?.background?.value ?? surface.ctaBackground?.value ?? "#22c55e";
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

  // Dark inbox advisory
  const darkBg = "#1a1a1a";
  const darkHeadline = surface.headline?.value ?? "#f8fafc";
  const darkCheck = checkBrandContrast({
    background: darkBg,
    surface: darkBg,
    headline: darkHeadline,
    body: darkHeadline,
    ctaBg,
    ctaText,
    link,
  }).find((c) => c.id === "headline_on_background");
  if (darkCheck && darkCheck.severity !== "ok") {
    checks.push({
      ...darkCheck,
      id: "headline_on_background",
      label: "Headline in dark inbox (simulated)",
    });
  }

  return checks;
}

export function emailTypographyFallback(model: EmailVisualModel): {
  preferred: string;
  emailSafe: string;
  warning: string;
} {
  const font = resolveFontFamily(model.brand, "body");
  return emailSafeFontStack(font.css);
}

export { provenanceLabel, readableOn };
