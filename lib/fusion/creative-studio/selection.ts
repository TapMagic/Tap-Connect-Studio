/**
 * Canvas selection → contextual panel mapping.
 * Outline remains structural backup; canvas is primary for ordinary editing.
 */

export type TapCardSectionTypeLike = string;

export type SelectionPanelHint = {
  rootPanelId: string;
  rootTitle: string;
  toolId: string;
  nested?: Array<{ id: string; title: string }>;
};

const TYPE_MAP: Record<string, SelectionPanelHint> = {
  action: {
    rootPanelId: "button",
    rootTitle: "Button",
    toolId: "buttons",
    nested: [
      { id: "content", title: "Content" },
      { id: "action", title: "Action" },
      { id: "typography", title: "Typography" },
      { id: "appearance", title: "Appearance" },
      { id: "shape", title: "Shape" },
      { id: "spacing", title: "Size and Spacing" },
      { id: "icon", title: "Icon" },
      { id: "visibility", title: "Visibility" },
      { id: "behavior", title: "Behavior" },
      { id: "test", title: "Test Action" },
      { id: "advanced", title: "Advanced" },
    ],
  },
  text: {
    rootPanelId: "text",
    rootTitle: "Text",
    toolId: "typography",
    nested: [
      { id: "content", title: "Content" },
      { id: "typography", title: "Typography" },
      { id: "color", title: "Color" },
      { id: "alignment", title: "Alignment" },
      { id: "spacing", title: "Spacing" },
      { id: "effects", title: "Effects" },
      { id: "a11y", title: "Accessibility" },
      { id: "advanced", title: "Advanced" },
    ],
  },
  identity: {
    rootPanelId: "identity",
    rootTitle: "Identity",
    toolId: "content",
    nested: [
      { id: "content", title: "Content" },
      { id: "typography", title: "Typography" },
      { id: "logo", title: "Logo" },
    ],
  },
  hero: {
    rootPanelId: "hero",
    rootTitle: "Hero",
    toolId: "media",
    nested: [
      { id: "media", title: "Image" },
      { id: "content", title: "Content" },
      { id: "appearance", title: "Appearance" },
    ],
  },
  logo: {
    rootPanelId: "logo",
    rootTitle: "Logo",
    toolId: "media",
  },
  image: {
    rootPanelId: "image",
    rootTitle: "Image",
    toolId: "media",
    nested: [
      { id: "replace", title: "Replace" },
      { id: "crop", title: "Crop and Position" },
      { id: "appearance", title: "Appearance" },
      { id: "a11y", title: "Accessibility" },
    ],
  },
  special_offer: {
    rootPanelId: "offer",
    rootTitle: "Spotlight / Offer",
    toolId: "offer",
  },
  promo_header: {
    rootPanelId: "promo",
    rootTitle: "Promo",
    toolId: "content",
  },
  footer_cta: {
    rootPanelId: "footer",
    rootTitle: "Footer",
    toolId: "content",
  },
  spacer: {
    rootPanelId: "spacer",
    rootTitle: "Spacer",
    toolId: "layout",
  },
};

export function selectionPanelForSection(input: {
  type: TapCardSectionTypeLike;
  actionKind?: string | null;
  label?: string | null;
}): SelectionPanelHint {
  const kind = (input.actionKind || "").toLowerCase();
  if (input.type === "action") {
    if (kind === "directions" || kind === "maps" || kind === "address") {
      return {
        rootPanelId: "directions",
        rootTitle: "Directions",
        toolId: "buttons",
        nested: TYPE_MAP.action.nested,
      };
    }
    if (kind === "website" || kind === "url" || kind === "link") {
      return {
        rootPanelId: "website",
        rootTitle: "Website",
        toolId: "buttons",
        nested: TYPE_MAP.action.nested,
      };
    }
    if (kind === "vcard" || kind === "save_contact" || kind === "contact") {
      return {
        rootPanelId: "contact",
        rootTitle: "Save Contact",
        toolId: "buttons",
        nested: TYPE_MAP.action.nested,
      };
    }
    if (kind === "tapsave" || kind === "keep") {
      return {
        rootPanelId: "tapsave",
        rootTitle: "TapSave",
        toolId: "tapsave",
      };
    }
  }
  return (
    TYPE_MAP[input.type] ?? {
      rootPanelId: "section",
      rootTitle: input.label || "Section",
      toolId: "content",
    }
  );
}

/** Empty canvas / background → Card appearance */
export const CARD_APPEARANCE_PANEL: SelectionPanelHint = {
  rootPanelId: "card-appearance",
  rootTitle: "Card Appearance",
  toolId: "colors",
  nested: [
    { id: "surface", title: "Surface" },
    { id: "colors", title: "Colors" },
    { id: "layout", title: "Layout" },
  ],
};
