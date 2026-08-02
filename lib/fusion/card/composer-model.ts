import { nanoid } from "nanoid";
import type { TapCardSection, TapConnectCardConfig } from "@/lib/brand/tap-card";
import {
  createCompositionNode,
  createEmptyCreativeComposition,
  type CreativeCompositionNode,
  type CreativeCompositionPrimitive,
} from "@/lib/fusion/creative-studio/composition";

export type CardSurfaceKind = NonNullable<TapCardSection["surfaceKind"]>;
export type CardElementKind =
  | "text" | "heading" | "business_name" | "address" | "hours" | "logo"
  | "image" | "image_gallery" | "video" | "icon" | "button" | "map"
  | "divider" | "offer_code" | "terms" | "coupon_artwork" | "ticket_artwork"
  | "tapsave" | "contact_form" | "campaign" | "campaign_group" | "experience"
  | "composition";

export type ComposerLibraryItem = {
  kind: CardSurfaceKind | CardElementKind;
  label: string;
  description: string;
};

export const CARD_SURFACE_LIBRARY: readonly ComposerLibraryItem[] = [
  ["blank", "Blank Section", "An empty, cohesive visual surface"],
  ["identity", "Identity Section", "Logo, business details and hours"],
  ["hero", "Hero Section", "A prominent opening surface"],
  ["content", "Content Section", "Text, images and supporting media"],
  ["actions", "Actions Section", "A group of customer actions"],
  ["offer", "Offer Section", "A local visual offer or linked offer"],
  ["contact", "Contact Section", "Contact details and forms"],
  ["location", "Location Section", "Address, map and directions"],
  ["gallery", "Gallery Section", "A visual media collection"],
].map(([kind, label, description]) => ({ kind: kind as CardSurfaceKind, label, description }));

export const CARD_ELEMENT_LIBRARY: readonly ComposerLibraryItem[] = [
  ["text", "Text", "Paragraph text"], ["heading", "Heading", "Section heading"],
  ["business_name", "Business name", "Brand business name"], ["address", "Address", "Business address"],
  ["hours", "Hours", "Opening hours"], ["logo", "Logo", "Brand or custom logo"],
  ["image", "Image", "Foreground image"], ["image_gallery", "Image gallery", "Responsive gallery"],
  ["video", "Video", "Embedded video"], ["icon", "Icon", "Decorative or action icon"],
  ["button", "Button", "Linked customer action"], ["map", "Map", "Location map"],
  ["divider", "Divider", "Visual separator"], ["offer_code", "Offer code", "Redeemable code"],
  ["terms", "Terms", "Offer terms"], ["coupon_artwork", "Coupon artwork", "Coupon visual"],
  ["ticket_artwork", "Ticket artwork", "Ticket visual"], ["tapsave", "TapSave prompt", "Keep this Card"],
  ["contact_form", "Contact form", "Consent-aware form"], ["campaign", "Campaign link", "Optional Campaign link"],
  ["campaign_group", "Campaign Group link", "Optional Campaign Group link"], ["experience", "Experience link", "Reusable Experience link"],
  ["composition", "Reusable composition", "Canonical reusable composition"],
].map(([kind, label, description]) => ({ kind: kind as CardElementKind, label, description }));

function surfaceDefaults(kind: CardSurfaceKind) {
  const labels: Record<CardSurfaceKind, string> = {
    blank: "Blank Section", identity: "Identity Section", hero: "Hero Section",
    content: "Content Section", actions: "Actions Section", offer: "Offer Section",
    contact: "Contact Section", location: "Location Section", gallery: "Gallery Section",
  };
  return { label: labels[kind], minHeight: kind === "hero" ? 420 : kind === "identity" ? 300 : 260 };
}

export function createCardSurface(kind: CardSurfaceKind, order: number): TapCardSection {
  const id = `surface-${nanoid(7)}`;
  const defaults = surfaceDefaults(kind);
  return {
    id,
    type: "surface",
    enabled: true,
    locked: false,
    order,
    label: defaults.label,
    sourceMode: "LOCAL",
    surfaceKind: kind,
    surfaceLayout: kind === "actions" ? "row" : "stack",
    surfaceWidthPercent: 100,
    surfaceMinHeightPx: defaults.minHeight,
    surfacePaddingPx: 24,
    surfaceGapPx: 12,
    surfaceAlign: "stretch",
    surfaceDistribute: "start",
    surfaceBorderWidthPx: 0,
    surfaceBorderColor: "#ffffff33",
    surfaceRadiusPx: 18,
    surfaceShadow: "none",
    backgroundColor: kind === "hero" ? "#111827" : "#171b24",
    opacity: 100,
    overlayColor: "#000000",
    overlayOpacity: 0,
    backgroundFit: "cover",
    backgroundPosition: "50% 50%",
    responsiveBehavior: "stack",
    composition: {
      ...createEmptyCreativeComposition(`composition-${id}`),
      label: defaults.label,
      mobileFallback: "stack",
    },
  };
}

function primitiveFor(kind: CardElementKind): CreativeCompositionPrimitive {
  if (["logo", "image", "image_gallery", "video", "map"].includes(kind)) return "image";
  if (["button", "tapsave", "campaign", "campaign_group", "experience", "contact_form"].includes(kind)) return "button";
  if (kind === "divider") return "border";
  if (["coupon_artwork", "ticket_artwork"].includes(kind)) return "frame";
  if (kind === "icon") return "shape";
  return "text";
}

export function createCardElement(kind: CardElementKind, index = 0): CreativeCompositionNode {
  const definition = CARD_ELEMENT_LIBRARY.find((item) => item.kind === kind);
  const primitive = primitiveFor(kind);
  const node = createCompositionNode(primitive, {
    name: definition?.label || kind,
    x: 0.08 + (index % 3) * 0.04,
    y: 0.08 + (index % 6) * 0.12,
    zIndex: index + 1,
  });
  const text: Partial<Record<CardElementKind, string>> = {
    text: "Type here", heading: "Your heading", business_name: "Business name",
    address: "123 Main Street\nOcala, Florida", hours: "Open 10–5", offer_code: "SAVE20",
    terms: "Terms and conditions apply.",
  };
  const semanticProps: Record<string, unknown> = {
    elementKind: kind,
    sourceMode: "LOCAL",
    responsiveWidth: "percentage",
    hideOn: [],
    opacity: 1,
    borderWidth: 0,
  };
  const semanticText = text[kind];
  if (semanticText !== undefined) semanticProps.text = semanticText;
  if (kind === "button") semanticProps.label = "Learn more";
  if (kind === "tapsave") semanticProps.label = "Save this Card";
  if (kind === "logo") semanticProps.alt = "Business logo";
  return {
    ...node,
    props: {
      ...node.props,
      ...semanticProps,
    },
  };
}

export function addElementToSurface(section: TapCardSection, kind: CardElementKind): TapCardSection {
  const composition = section.composition ?? createEmptyCreativeComposition(`composition-${section.id}`);
  return {
    ...section,
    composition: { ...composition, nodes: [...composition.nodes, createCardElement(kind, composition.nodes.length)] },
  };
}

export function composerSelection(config: TapConnectCardConfig, sectionId: string | null, nodeId?: string | null) {
  const section = config.sections.find((candidate) => candidate.id === sectionId) ?? null;
  const element = nodeId ? section?.composition?.nodes.find((candidate) => candidate.id === nodeId) ?? null : null;
  return { card: config, section, element };
}

export function composerBreadcrumb(section: TapCardSection | null, element: CreativeCompositionNode | null): string[] {
  return ["Card", section?.label, element?.name || (element?.props.elementKind as string | undefined)]
    .filter((part): part is string => Boolean(part));
}

export function composerWarnings(section: TapCardSection): string[] {
  const warnings: string[] = [];
  for (const node of section.composition?.nodes ?? []) {
    if (node.x < 0 || node.y < 0 || node.x + node.width > 1 || node.y + node.height > 1) warnings.push(`${node.name || node.id} is off canvas.`);
    if (node.primitive === "text" && Number(node.props.fontSize || 18) < 12) warnings.push(`${node.name || "Text"} may be unreadable.`);
    if (node.primitive === "button" && (node.width < 0.18 || node.height < 0.1)) warnings.push(`${node.name || "Button"} may be below the minimum touch target.`);
  }
  return warnings;
}
