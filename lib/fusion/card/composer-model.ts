import { nanoid } from "nanoid";
import type { TapCardSection, TapConnectCardConfig } from "@/lib/brand/tap-card";
import {
  createCompositionNode,
  createEmptyCreativeComposition,
  type CreativeCompositionNode,
  type CreativeCompositionPrimitive,
} from "@/lib/fusion/creative-studio/composition";
import { buttonElementDefaults, mapElementDefaults } from "@/lib/fusion/card/designer-elements";

export type CardSurfaceKind = NonNullable<TapCardSection["surfaceKind"]>;
export type CardElementKind =
  | "text" | "heading" | "subheading" | "business_name" | "address" | "hours" | "logo"
  | "secondary_logo" | "image" | "thumbnail" | "image_gallery" | "video" | "icon" | "badge" | "button" | "map"
  | "divider" | "offer_code" | "terms" | "coupon_artwork" | "ticket_artwork"
  | "decorative_graphic" | "qr_image"
  | "tapsave" | "contact_form" | "campaign" | "campaign_group" | "experience"
  | "composition";

export type ComposerLibraryItem = {
  kind: CardSurfaceKind | CardElementKind;
  label: string;
  description: string;
};

export type ComposerSelectedObject =
  | { type: "card"; id: "card"; sectionId: null; elementId: null }
  | { type: "section"; id: string; sectionId: string; elementId: null }
  | { type: "element"; id: string; sectionId: string | null; elementId: string };

export function resolveComposerSelectedObject(
  config: TapConnectCardConfig,
  sectionId: string | null,
  elementIds: string[] = []
): ComposerSelectedObject {
  const rootElement = config.rootComposition?.nodes.find(
    (candidate) => candidate.id === elementIds[0]
  );
  if (!sectionId && rootElement) {
    return { type: "element", id: rootElement.id, sectionId: null, elementId: rootElement.id };
  }
  const section = config.sections.find((candidate) => candidate.id === sectionId);
  if (!section) return { type: "card", id: "card", sectionId: null, elementId: null };
  const element = section.composition?.nodes.find((candidate) => candidate.id === elementIds[0]);
  if (!element) return { type: "section", id: section.id, sectionId: section.id, elementId: null };
  return { type: "element", id: element.id, sectionId: section.id, elementId: element.id };
}

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
  ["subheading", "Subheading", "Supporting headline"],
  ["business_name", "Business name", "Brand business name"], ["address", "Address", "Business address"],
  ["hours", "Hours", "Opening hours"], ["logo", "Logo", "Brand or custom logo"],
  ["secondary_logo", "Secondary logo", "Partner, sponsor, or alternate logo"],
  ["image", "Image", "Foreground image"], ["thumbnail", "Product thumbnail", "Compact product image"], ["image_gallery", "Image gallery", "Responsive gallery"],
  ["video", "Video", "Embedded video"], ["icon", "Icon", "Decorative or action icon"], ["badge", "Badge", "Editable promotional badge"],
  ["button", "Button", "Linked customer action"], ["map", "Map", "Location map"],
  ["divider", "Divider", "Visual separator"], ["offer_code", "Offer code", "Redeemable code"],
  ["terms", "Terms", "Offer terms"], ["coupon_artwork", "Coupon artwork", "Coupon visual"],
  ["ticket_artwork", "Ticket artwork", "Ticket visual"], ["decorative_graphic", "Decorative graphic", "Free-floating visual accent"],
  ["qr_image", "QR image", "QR artwork with accessible context"], ["tapsave", "TapSave prompt", "Keep this Card"],
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
  return {
    label: labels[kind],
    minHeight: kind === "blank" ? 64 : kind === "hero" ? 420 : kind === "identity" ? 300 : 260,
  };
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
    surfaceExactHeightPx: defaults.minHeight,
    surfaceCoordinateHeightPx: defaults.minHeight - 48,
    surfaceHeightMode: "fixed",
    surfacePaddingPx: kind === "blank" ? 4 : 24,
    surfaceGapPx: 12,
    surfaceAlign: "stretch",
    surfaceDistribute: "start",
    surfaceBorderWidthPx: 0,
    surfaceBorderColor: "#ffffff33",
    surfaceRadiusPx: kind === "blank" ? 0 : 18,
    surfaceShadow: "none",
    surfaceGlow: "none",
    surfaceBackgroundKind: kind === "blank" ? "transparent" : "solid",
    surfaceGradientStart: kind === "hero" ? "#111827" : "#171b24",
    surfaceGradientEnd: "#0b0f19",
    surfaceGradientAngle: 145,
    surfacePattern: "diagonal",
    surfaceTexture: "noise",
    backgroundColor: kind === "blank" ? "transparent" : kind === "hero" ? "#111827" : "#171b24",
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

/** Section-bound resize: never rewrites Element transforms or structured spacing. */
export function resizeCardSurface(
  section: TapCardSection,
  heightPx: number
): TapCardSection {
  return {
    ...section,
    surfaceMinHeightPx: Math.max(32, Math.min(2400, Math.round(heightPx))),
    surfaceExactHeightPx: Math.max(32, Math.min(2400, Math.round(heightPx))),
    surfaceHeightMode: "fixed",
  };
}

export function fitCardSurfaceToContent(section: TapCardSection): TapCardSection {
  const padding = section.surfacePaddingPx ?? 24;
  const plane = section.surfaceCoordinateHeightPx ?? Math.max(80, (section.surfaceMinHeightPx ?? 260) - padding * 2);
  const bottom = (section.composition?.nodes ?? []).reduce(
    (max, node) => Math.max(max, (node.y + node.height) * plane),
    0
  );
  return {
    ...section,
    surfaceMinHeightPx: Math.max(32, Math.ceil(bottom + padding * 2)),
    surfaceHeightMode: "auto",
  };
}

function primitiveFor(kind: CardElementKind): CreativeCompositionPrimitive {
  if (["logo", "secondary_logo", "image", "thumbnail", "image_gallery", "video", "map", "qr_image"].includes(kind)) return "image";
  if (["button", "tapsave", "campaign", "campaign_group", "experience", "contact_form"].includes(kind)) return "button";
  if (kind === "divider") return "border";
  if (["coupon_artwork", "ticket_artwork"].includes(kind)) return "frame";
  if (["icon", "badge", "decorative_graphic"].includes(kind)) return "shape";
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
    subheading: "Your supporting message", address: "123 Main Street\nOcala, Florida", hours: "Open 10–5", offer_code: "SAVE20",
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
  if (primitive === "image") semanticProps.aspectLocked = true;
  const semanticText = text[kind];
  if (semanticText !== undefined) semanticProps.text = semanticText;
  if (kind === "button") semanticProps.label = "Learn more";
  if (kind === "tapsave") semanticProps.label = "Save this Card";
  if (kind === "logo") semanticProps.alt = "Business logo";
  if (kind === "secondary_logo") semanticProps.alt = "Partner logo";
  if (kind === "thumbnail") semanticProps.alt = "Product thumbnail";
  if (kind === "qr_image") semanticProps.alt = "QR code";
  if (kind === "icon") Object.assign(semanticProps, { icon: "sparkles", fill: "#b8ff2c", stroke: "#07100a", strokeWidth: 1.5, accessibleLabel: "Decorative icon", decorative: true });
  if (kind === "badge") Object.assign(semanticProps, { text: "SALE", badgeShape: "pill", fill: "#ef4444", color: "#ffffff", fontSize: 18, fontWeight: 800, radius: 999, accessibleLabel: "Sale" });
  if (kind === "button") Object.assign(semanticProps, buttonElementDefaults("website", node.id));
  if (kind === "map") Object.assign(semanticProps, mapElementDefaults());
  const isCompactAction = kind === "button" || kind === "tapsave";
  const isMap = kind === "map";
  return {
    ...node,
    width: isMap ? 0.84 : isCompactAction ? 0.42 : node.width,
    height: isMap ? 0.34 : isCompactAction ? 0.16 : node.height,
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

export function ensureRootComposition(config: TapConnectCardConfig) {
  return config.rootComposition ?? {
    ...createEmptyCreativeComposition("card-root-composition"),
    label: "Card root Elements",
    mobileFallback: "scale" as const,
    safeAreaPaddingPx: config.rootCanvasPaddingPx ?? 12,
  };
}

export function addElementToCardRoot(
  config: TapConnectCardConfig,
  kind: CardElementKind
): TapConnectCardConfig {
  const root = ensureRootComposition(config);
  return {
    ...config,
    rootComposition: {
      ...root,
      nodes: [...root.nodes, createCardElement(kind, root.nodes.length)],
    },
  };
}

export type ElementContainerId = string | null;

export function moveCardElements(
  config: TapConnectCardConfig,
  elementIds: string[],
  fromSectionId: ElementContainerId,
  toSectionId: ElementContainerId
): TapConnectCardConfig {
  if (fromSectionId === toSectionId || !elementIds.length) return config;
  const source = fromSectionId
    ? config.sections.find((section) => section.id === fromSectionId)?.composition
    : ensureRootComposition(config);
  const target = toSectionId
    ? config.sections.find((section) => section.id === toSectionId)?.composition
    : ensureRootComposition(config);
  if (!source || !target) return config;
  const ids = new Set(elementIds);
  const moving = source.nodes.filter((node) => ids.has(node.id) && !node.locked);
  if (!moving.length) return config;
  const movedIds = new Set(moving.map((node) => node.id));
  const sourceNodes = source.nodes.filter((node) => !movedIds.has(node.id));
  const maxZ = target.nodes.reduce((value, node) => Math.max(value, node.zIndex), 0);
  const targetNodes = [
    ...target.nodes,
    ...moving.map((node, index) => ({ ...node, zIndex: maxZ + index + 1 })),
  ];
  const sections = config.sections.map((section) => {
    if (section.id === fromSectionId) return { ...section, composition: { ...source, nodes: sourceNodes } };
    if (section.id === toSectionId) return { ...section, composition: { ...target, nodes: targetNodes } };
    return section;
  });
  return {
    ...config,
    sections,
    rootComposition:
      fromSectionId === null
        ? { ...source, nodes: sourceNodes }
        : toSectionId === null
          ? { ...target, nodes: targetNodes }
          : config.rootComposition,
  };
}

export function wrapCardElementsInSection(
  config: TapConnectCardConfig,
  elementIds: string[],
  fromSectionId: ElementContainerId,
  kind: CardSurfaceKind = "blank"
): { config: TapConnectCardConfig; sectionId: string } {
  const sourceSection = fromSectionId
    ? config.sections.find((candidate) => candidate.id === fromSectionId)
    : null;
  const sourcePlane = sourceSection
    ? sourceSection.surfaceCoordinateHeightPx
      ?? Math.max(32, (sourceSection.surfaceMinHeightPx ?? 260) - (sourceSection.surfacePaddingPx ?? 24) * 2)
    : Math.max(120, (config.rootCanvasMinHeightPx ?? 520) - (config.rootCanvasPaddingPx ?? 12) * 2);
  const created = createCardSurface(kind, config.sections.length);
  const section: TapCardSection = {
    ...created,
    surfaceLayout: "free",
    surfaceCoordinateHeightPx: sourcePlane,
    surfaceMinHeightPx: Math.min(2400, sourcePlane + (created.surfacePaddingPx ?? 0) * 2),
  };
  const withSection = { ...config, sections: [...config.sections, section] };
  return {
    config: moveCardElements(withSection, elementIds, fromSectionId, section.id),
    sectionId: section.id,
  };
}

export function removeSectionKeepElements(
  config: TapConnectCardConfig,
  sectionId: string,
  targetSectionId: ElementContainerId = null
): TapConnectCardConfig {
  const section = config.sections.find((candidate) => candidate.id === sectionId);
  if (!section || section.locked) return config;
  const ids = section.composition?.nodes.map((node) => node.id) ?? [];
  const moved = moveCardElements(config, ids, sectionId, targetSectionId);
  return {
    ...moved,
    sections: moved.sections
      .filter((candidate) => candidate.id !== sectionId)
      .map((candidate, order) => ({ ...candidate, order })),
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
