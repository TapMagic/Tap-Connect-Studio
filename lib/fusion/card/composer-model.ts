import { nanoid } from "nanoid";
import type { TapCardSection, TapConnectCardConfig } from "@/lib/brand/tap-card";
import {
  createCompositionNode,
  createEmptyCreativeComposition,
  type CreativeCompositionNode,
  type CreativeCompositionPrimitive,
} from "@/lib/fusion/creative-studio/composition";
import { buttonElementDefaults, mapElementDefaults } from "@/lib/fusion/card/designer-elements";
import { updateButtonLabel } from "@/lib/fusion/creative-studio/button-composition";
import { layoutStackChildren } from "@/lib/fusion/creative-studio/container-resize";
import { iconAssetToNodeProps, nativeIconAsset } from "@/lib/fusion/creative-studio/icon-asset";
import {
  buildCouponContentComposition,
  couponSurfaceDefaults,
  type CouponLayoutGeometry,
} from "@/lib/fusion/creative-studio/coupon-composition";

export type CardSurfaceKind = NonNullable<TapCardSection["surfaceKind"]>;
export type CardElementKind =
  | "text" | "heading" | "subheading" | "business_name" | "address" | "hours" | "logo"
  | "secondary_logo" | "image" | "thumbnail" | "image_gallery" | "video" | "icon" | "badge" | "button" | "map"
  | "divider" | "offer_code" | "terms" | "coupon_artwork" | "ticket_artwork"
  | "decorative_graphic" | "qr_image"
  | "tapsave" | "contact_form" | "campaign" | "campaign_group" | "experience"
  | "composition" | "gallery" | "coupon" | "ticket" | "form" | "wallet_cta" | "event_rsvp";

export type SectionPresetId =
  | "blank" | "identity" | "hero" | "offer" | "location" | "contact"
  | "social_proof" | "product" | "event" | "gallery_presentation";

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

/** Compatibility catalog. New Owner-facing discovery uses SECTION_PRESET_LIBRARY below. */
export const CARD_SURFACE_LIBRARY: readonly ComposerLibraryItem[] = [
  ["blank", "Blank Section", "An empty generic Section"],
].map(([kind, label, description]) => ({ kind: kind as CardSurfaceKind, label, description }));

export const SECTION_PRESET_LIBRARY: ReadonlyArray<{ id: SectionPresetId; label: string; description: string; style: string }> = [
  { id: "blank", label: "Blank Section", description: "An optional generic layout and local appearance surface", style: "Blank" },
  { id: "identity", label: "Premium Identity", description: "Logo, business name, supporting text, and badge", style: "Brand-derived" },
  { id: "hero", label: "Premium Hero", description: "Image, headline, subheadline, and primary Button", style: "Editorial" },
  { id: "offer", label: "Premium Offer", description: "Badge, offer value, supporting copy, media, terms, and Claim Button", style: "High gloss" },
  { id: "location", label: "Premium Location", description: "Location, address, hours, Map, and Directions Button", style: "Clean professional" },
  { id: "contact", label: "Premium Contact", description: "Heading, contact methods, Form, and Save contact Button", style: "Glass" },
  { id: "social_proof", label: "Premium Social Proof", description: "Review quote, proof point, and CTA", style: "Luxury dark" },
  { id: "product", label: "Premium Product Spotlight", description: "Product image, name, value, description, and Button", style: "Warm retail" },
  { id: "event", label: "Premium Event", description: "Title, date, location, RSVP, calendar, and Ticket", style: "Bold promotional" },
  { id: "gallery_presentation", label: "Premium Gallery Presentation", description: "Gallery Component, caption, and optional CTA", style: "Minimal" },
];

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
  ["gallery", "Gallery", "Responsive editable media Component"],
  ["coupon", "Coupon", "Editable offer, code, QR, terms, and actions"],
  ["ticket", "Ticket", "Editable admission identity, QR, terms, and Wallet action"],
  ["form", "Form", "Editable fields, consent, and Submit Button"],
  ["wallet_cta", "Wallet CTA", "Governed add-to-wallet action"],
  ["event_rsvp", "Event / RSVP", "Event details and RSVP action"],
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

function presetElement(kind: CardElementKind, index: number, props: Record<string, unknown> = {}) {
  const node = createCardElement(kind, index);
  const nextProps = kind === "button" && typeof props.label === "string"
    ? updateButtonLabel({ ...node.props, ...props }, props.label, node.id)
    : { ...node.props, ...props };
  return { ...node, props: nextProps };
}

const PRESET_CHILDREN: Record<Exclude<SectionPresetId, "blank">, Array<[CardElementKind, Record<string, unknown>?]>> = {
  identity: [["logo"], ["business_name", { fontSize: 30, fontWeight: 800 }], ["text", { text: "What we make memorable", fontSize: 16 }], ["badge", { text: "EST. HERE", accessibleLabel: "Established here" }]],
  hero: [["image", { alt: "Hero image" }], ["heading", { text: "A remarkable first impression", fontSize: 38, fontWeight: 850 }], ["subheading", { text: "Tell people why this matters in one clear sentence." }], ["button", { label: "Learn more", actionType: "website" }]],
  offer: [["badge", { text: "LIMITED", accessibleLabel: "Limited offer" }], ["heading", { text: "An offer worth tapping", fontSize: 34, fontWeight: 850 }], ["text", { text: "Add the value and a concise reason to act now." }], ["image", { alt: "Offer product" }], ["button", { label: "Claim offer", actionType: "claim_offer" }], ["terms", { text: "Draft terms — review before publishing.", ownerReviewRequired: true }]],
  location: [["heading", { text: "Come see us" }], ["address"], ["hours"], ["map"], ["button", { label: "Get directions", actionType: "directions", icon: "map-pin" }]],
  contact: [["heading", { text: "Let’s connect" }], ["text", { text: "Choose the easiest way to reach us." }], ["form"], ["button", { label: "Save to contacts", actionType: "save_contact" }]],
  social_proof: [["badge", { text: "★★★★★", accessibleLabel: "Five star rating" }], ["heading", { text: "Loved by local customers" }], ["text", { text: "“A short customer quote can live here.”" }], ["button", { label: "Read reviews", actionType: "reviews" }]],
  product: [["image", { alt: "Featured product" }], ["heading", { text: "Featured favorite" }], ["subheading", { text: "$49 · Exceptional value" }], ["text", { text: "Describe the detail that makes this product special." }], ["button", { label: "Shop now", actionType: "website" }]],
  event: [["badge", { text: "FRI 7PM", accessibleLabel: "Friday at 7 PM" }], ["heading", { text: "A night to remember" }], ["text", { text: "Date · time · location" }], ["button", { label: "RSVP", actionType: "custom" }], ["ticket"]],
  gallery_presentation: [["gallery"], ["text", { text: "A curated look at our latest work." }], ["button", { label: "See more", actionType: "website" }]],
};

/** Insert a named starting point over the one generic Section implementation. */
export function createSectionPreset(presetId: SectionPresetId, order: number): TapCardSection {
  const definition = SECTION_PRESET_LIBRARY.find((item) => item.id === presetId)!;
  const base = createCardSurface("blank", order);
  const nodes = presetId === "blank"
    ? []
    : PRESET_CHILDREN[presetId].map(([kind, props], index) => presetElement(kind, index, props));
  const section: TapCardSection = {
    ...base,
    label: definition.label,
    sectionPresetId: presetId,
    surfaceKind: "blank",
    surfaceLayout: presetId === "blank" ? "free" : "stack",
    surfaceMinHeightPx: presetId === "hero" ? 560 : presetId === "offer" ? 680 : 420,
    surfaceExactHeightPx: presetId === "hero" ? 560 : presetId === "offer" ? 680 : 420,
    surfaceRadiusPx: presetId === "blank" ? 0 : 24,
    surfaceBackgroundKind: presetId === "blank" ? "transparent" : "gradient",
    surfaceGradientStart: presetId === "offer" ? "#27104f" : "#171b24",
    surfaceGradientEnd: presetId === "offer" ? "#0b132b" : "#0b0f19",
    composition: { ...base.composition!, label: definition.label, nodes },
  };
  return {
    ...section,
    insertedPreset: {
      id: presetId,
      label: definition.label,
      section: {
        surfaceLayout: section.surfaceLayout,
        surfacePaddingPx: section.surfacePaddingPx,
        surfaceGapPx: section.surfaceGapPx,
        surfaceRadiusPx: section.surfaceRadiusPx,
        surfaceBackgroundKind: section.surfaceBackgroundKind,
        surfaceGradientStart: section.surfaceGradientStart,
        surfaceGradientEnd: section.surfaceGradientEnd,
      },
      nodes: structuredClone(nodes),
    },
  };
}

/**
 * New authoring authority for premium presets. The Container and every child are
 * peers on the root coordinate plane, tied by groupId for hierarchy and Layers.
 * Legacy createSectionPreset remains exclusively as the old-draft adapter.
 */
export function insertRootContainerPreset(
  config: TapConnectCardConfig,
  presetId: SectionPresetId,
): { config: TapConnectCardConfig; containerId: string; objectIds: string[] } {
  const root = ensureRootComposition(config);
  const definition = SECTION_PRESET_LIBRARY.find((item) => item.id === presetId)!;
  const containerId = `container-${nanoid(7)}`;
  const groupId = `container-group-${nanoid(7)}`;
  const existingContainers = root.nodes.filter((node) => node.props.componentKind === "container").length;
  const x = Math.min(.12, .04 + (existingContainers % 4) * .025);
  const y = Math.min(.46, .04 + (existingContainers % 8) * .055);
  const width = .88;
  const height = presetId === "blank" ? .3 : presetId === "offer" || presetId === "hero" ? .64 : .52;
  const maxZ = root.nodes.reduce((maximum, node) => Math.max(maximum, node.zIndex), 0);
  const container: CreativeCompositionNode = {
    id: containerId,
    primitive: "frame",
    x, y, width, height,
    zIndex: maxZ + 1,
    name: `${definition.label} Container`,
    // Hierarchy identity for Layers only — not a true Group selection set.
    groupId: null,
    props: {
      componentKind: "container",
      elementKind: "container",
      presetId,
      containerGroupId: groupId,
      layout: presetId === "blank" ? "free" : "stack",
      resizePolicy: "reflow",
      fill: presetId === "blank" ? "transparent" : presetId === "offer" ? "#27104f" : "#171b24",
      gradientStart: presetId === "offer" ? "#27104f" : "#171b24",
      gradientEnd: presetId === "offer" ? "#0b132b" : "#0b0f19",
      gradientAngle: 145,
      radius: presetId === "blank" ? 0 : 24,
      padding: 18,
      gap: 12,
      opacity: 1,
      contentEditing: false,
      selectionMode: "parent",
      childIds: [] as string[],
    },
  };
  const source = presetId === "blank" ? [] : PRESET_CHILDREN[presetId];
  const staged = source.map(([kind, props], index) => {
    const child = presetElement(kind, root.nodes.length + index, props);
    return {
      ...child,
      zIndex: maxZ + 2 + index,
      groupId: null,
      props: { ...child.props, containerId, containerGroupId: groupId, presetChildRole: kind },
    };
  });
  const children = layoutStackChildren({
    container: { x, y, width, height },
    children: staged,
    padding: 0.06,
    gap: 0.016,
  });
  container.props.childIds = children.map((node) => node.id);
  const nodes = [...root.nodes, container, ...children];
  const lowest = nodes.reduce((bottom, node) => node.visible === false ? bottom : Math.max(bottom, node.y + node.height), 1);
  const currentHeight = root.pageHeightPx ?? config.rootCanvasMinHeightPx ?? 520;
  const neededHeight = lowest > 1 ? Math.min(2400, Math.ceil(currentHeight * lowest + 24)) : currentHeight;
  // Grow the page through the isolation helper so prior objects keep pixel bounds.
  const grown = neededHeight > currentHeight
    ? setRootPageHeightPreservingBounds({ ...root, nodes }, neededHeight, currentHeight)
    : { ...root, nodes, pageHeightPx: currentHeight };
  return {
    config: { ...config, rootComposition: grown },
    containerId,
    objectIds: [containerId, ...children.map((node) => node.id)],
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
  if (["button", "tapsave", "campaign", "campaign_group", "experience", "contact_form", "wallet_cta", "event_rsvp"].includes(kind)) return "button";
  if (["coupon", "ticket"].includes(kind)) return "frame";
  if (["gallery", "form", "composition"].includes(kind)) return "group";
  if (kind === "divider") return "border";
  if (["coupon_artwork", "ticket_artwork"].includes(kind)) return "frame";
  if (["icon", "badge", "decorative_graphic"].includes(kind)) return "shape";
  return "text";
}

function componentContent(kind: "gallery" | "coupon" | "ticket" | "form", parentId: string) {
  const child = (primitive: CreativeCompositionPrimitive, name: string, props: Record<string, unknown>, index: number) => createCompositionNode(primitive, {
    name,
    x: 0.08,
    y: 0.08 + index * 0.2,
    width: 0.84,
    height: primitive === "text" ? 0.14 : 0.2,
    zIndex: index + 1,
    props: { ...props, componentContentRole: name.toLowerCase().replaceAll(" ", "_") },
  });
  const nodes = kind === "coupon"
    ? buildCouponContentComposition("retail_card", parentId).nodes
    : kind === "ticket"
      ? [child("text", "Ticket title", { text: "ADMIT ONE" }, 0), child("text", "Ticket identity", { text: "TICKET-001" }, 1), child("image", "QR artwork", { src: "", alt: "Ticket QR setup required", qrManagementState: "setup_required" }, 2), child("text", "Terms", { text: "Draft terms — review before publishing." }, 3), child("button", "Wallet action", { ...buttonElementDefaults("website", `${parentId}-wallet`), label: "Add to Wallet", actionType: "wallet" }, 4)]
      : kind === "form"
        ? [child("text", "Form heading", { text: "Stay in touch" }, 0), child("text", "Email field", { text: "Email", formFieldType: "email", required: true }, 1), child("text", "Consent", { text: "I agree to be contacted." }, 2), child("button", "Submit action", { ...buttonElementDefaults("website", `${parentId}-submit`), label: "Submit", actionType: "form", liveSubmission: false }, 3)]
        : [child("image", "Gallery item", { src: "", alt: "Empty gallery item" }, 0)];
  return { ...createEmptyCreativeComposition(`${parentId}-content`), label: `${kind} content`, nodes };
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
  if (kind === "icon") {
    const sparkles = nativeIconAsset("sparkles");
    Object.assign(
      semanticProps,
      sparkles
        ? iconAssetToNodeProps(sparkles)
        : {
            icon: "sparkles",
            fill: "#b8ff2c",
            stroke: "#b8ff2c",
            strokeWidth: 2,
            backingSurfaceEnabled: false,
            boxFill: "transparent",
            borderWidth: 0,
            borderStyle: "none",
            radius: 0,
          },
      { accessibleLabel: "Decorative icon", decorative: true }
    );
  }
  if (kind === "badge") Object.assign(semanticProps, { text: "SALE", badgeShape: "pill", fill: "#b91c1c", color: "#ffffff", fontSize: 18, fontWeight: 800, radius: 999, accessibleLabel: "Sale" });
  if (kind === "button") Object.assign(semanticProps, buttonElementDefaults("website", node.id));
  if (kind === "wallet_cta") Object.assign(semanticProps, buttonElementDefaults("website", node.id), { elementKind: kind, label: "Add to Wallet", actionType: "wallet" });
  if (kind === "event_rsvp") Object.assign(semanticProps, buttonElementDefaults("website", node.id), { elementKind: kind, label: "RSVP", actionType: "custom" });
  if (kind === "gallery") Object.assign(semanticProps, { componentKind: "gallery", media: [], layout: "grid", gap: 12, accessibleLabel: "Image gallery", contentComposition: componentContent("gallery", node.id) });
  if (kind === "coupon") {
    const geometry: CouponLayoutGeometry = "retail_card";
    const surface = couponSurfaceDefaults(geometry);
    const content = buildCouponContentComposition(geometry, node.id, {
      headline: "SPECIAL OFFER",
      offerValue: "20% OFF",
      code: "SAVE20",
      terms: "Draft terms — review before publishing.",
    });
    Object.assign(semanticProps, {
      ...surface,
      headline: "SPECIAL OFFER",
      offerValue: "20% OFF",
      code: "SAVE20",
      terms: "Draft terms — review before publishing.",
      ownerReviewRequired: true,
      accessibleLabel: "Coupon",
      contentComposition: content,
    });
  }
  if (kind === "ticket") Object.assign(semanticProps, { componentKind: "ticket", mask: "ticket", title: "ADMIT ONE", ticketId: "TICKET-001", terms: "Draft terms — review before publishing.", ownerReviewRequired: true, accessibleLabel: "Ticket", contentComposition: componentContent("ticket", node.id) });
  if (kind === "form") Object.assign(semanticProps, { componentKind: "form", heading: "Stay in touch", fields: [{ id: "email", label: "Email", type: "email", required: true }], consent: "I agree to be contacted.", liveSubmission: false, accessibleLabel: "Contact form", contentComposition: componentContent("form", node.id) });
  if (kind === "map") Object.assign(semanticProps, mapElementDefaults());
  if (kind === "composition") Object.assign(semanticProps, { componentKind: "container", elementKind: "composition", layout: "stack", resizePolicy: "reflow" });
  const isCompactAction = kind === "button" || kind === "tapsave";
  const isMap = kind === "map";
  const isBadge = kind === "badge";
  const isLogo = kind === "logo" || kind === "secondary_logo";
  const isThumbnail = kind === "thumbnail";
  return {
    ...node,
    width: isMap ? 0.84 : isBadge ? 0.84 : isLogo || isThumbnail ? 0.42 : isCompactAction ? 0.42 : node.width,
    height: isMap ? 0.34 : isBadge ? 0.12 : isLogo ? 0.18 : isThumbnail ? 0.3 : isCompactAction ? 0.16 : node.height,
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

/**
 * Change Card page height while preserving absolute pixel bounds of every root
 * Element. Normalized y/height are rescaled so Text, Image, Icon, Button, Map,
 * Coupon, Ticket, Form, Gallery, Container, and Group boxes stay put.
 */
export function setRootPageHeightPreservingBounds(
  root: NonNullable<TapConnectCardConfig["rootComposition"]>,
  nextHeightPx: number,
  fallbackHeightPx = 520
): NonNullable<TapConnectCardConfig["rootComposition"]> {
  const pageHeightPx = Math.max(240, Math.min(2400, Math.round(nextHeightPx)));
  const previous = Math.max(1, root.pageHeightPx ?? fallbackHeightPx);
  if (previous === pageHeightPx) return { ...root, pageHeightPx };
  const scale = previous / pageHeightPx;
  const nodes = root.nodes.map((node) => ({
    ...node,
    y: Math.max(0, Math.min(2, node.y * scale)),
    height: Math.max(0.01, Math.min(2, node.height * scale)),
  }));
  return { ...root, nodes, pageHeightPx };
}

/** Absolute pixel bounds for geometry-isolation proofs. */
export function rootObjectPixelBounds(
  root: NonNullable<TapConnectCardConfig["rootComposition"]>,
  fallbackHeightPx = 520
): Array<{ id: string; x: number; y: number; width: number; height: number }> {
  const pageHeightPx = root.pageHeightPx ?? fallbackHeightPx;
  const pageWidthPx = 390;
  return root.nodes.map((node) => ({
    id: node.id,
    x: Math.round(node.x * pageWidthPx),
    y: Math.round(node.y * pageHeightPx),
    width: Math.round(node.width * pageWidthPx),
    height: Math.round(node.height * pageHeightPx),
  }));
}

/** Grow the published root plane when authored objects extend below its current minimum. */
export function rootCanvasAutoHeight(config: TapConnectCardConfig): number {
  const base = config.rootComposition?.pageHeightPx ?? config.rootCanvasMinHeightPx ?? 520;
  const bottom = ensureRootComposition(config).nodes.reduce((value, node) => node.visible === false ? value : Math.max(value, node.y + node.height), 1);
  return Math.min(2400, Math.max(base, Math.ceil(base * bottom)));
}

/**
 * Smallest safe Card-root height that contains every visible root Element.
 * The calculation intentionally ignores Sections, pasteboard chrome, drawers,
 * and the Utility Layer: none of those owns the published root plane.
 */
export function fitRootCanvasToContent(config: TapConnectCardConfig): number {
  const current = config.rootComposition?.pageHeightPx ?? config.rootCanvasMinHeightPx ?? 520;
  const padding = config.rootCanvasPaddingPx ?? 12;
  const visible = ensureRootComposition(config).nodes.filter((node) => node.visible !== false);
  if (!visible.length) return 320;
  const bottom = visible.reduce((value, node) => Math.max(value, node.y + node.height), 0);
  return Math.max(240, Math.min(2400, Math.ceil(current * bottom + padding * 2)));
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
