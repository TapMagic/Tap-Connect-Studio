/**
 * Shared button / action icon placement + layout matrix (Campaign + Card builders).
 * Maps to renderer CSS classes on `.tap-btn` / `.tcc-pill`.
 */

export const ICON_PLACEMENT_OPTIONS = [
  { id: "before", label: "Before text" },
  { id: "after", label: "After text" },
  { id: "left", label: "Left edge (spread)" },
  { id: "right", label: "Right edge (spread)" },
  { id: "above", label: "Above text" },
  { id: "below", label: "Below text" },
  { id: "only", label: "Icon only" },
  { id: "none", label: "Text only (no icon)" },
] as const;

export type IconPlacement = (typeof ICON_PLACEMENT_OPTIONS)[number]["id"];

export const ICON_SIZE_OPTIONS = [
  { id: "sm", label: "Small", px: 14 },
  { id: "md", label: "Medium", px: 18 },
  { id: "lg", label: "Large", px: 24 },
] as const;

export type IconSizeToken = (typeof ICON_SIZE_OPTIONS)[number]["id"];

export const CONTENT_ALIGN_OPTIONS = [
  { id: "start", label: "Start" },
  { id: "center", label: "Center" },
  { id: "end", label: "End" },
] as const;

export type ContentAlign = (typeof CONTENT_ALIGN_OPTIONS)[number]["id"];

export const TEXT_SIZE_OPTIONS = [
  { id: "sm", label: "Small" },
  { id: "md", label: "Medium" },
  { id: "lg", label: "Large" },
] as const;

export type TextSizeToken = (typeof TEXT_SIZE_OPTIONS)[number]["id"];

export const VERTICAL_ALIGN_OPTIONS = [
  { id: "start", label: "Top" },
  { id: "center", label: "Middle" },
  { id: "end", label: "Bottom" },
] as const;

export type VerticalAlign = (typeof VERTICAL_ALIGN_OPTIONS)[number]["id"];

export type ButtonLayoutFields = {
  iconPosition?: IconPlacement;
  iconSize?: IconSizeToken;
  textSize?: TextSizeToken;
  iconGap?: number;
  /** Main-axis / horizontal content align (justify-content). */
  contentAlign?: ContentAlign;
  /** Cross-axis / vertical content align (align-items). */
  verticalAlign?: VerticalAlign;
  paddingX?: number;
  paddingY?: number;
  minHeight?: number;
  fullWidth?: boolean;
  wrap?: boolean;
};

/**
 * Canonical placement for renderer attrs/classes.
 * left/right are first-class (edge-spread), not aliases of before/after.
 */
export function normalizeIconPlacement(
  placement?: IconPlacement | "left" | "right" | "only" | "none" | null
): IconPlacement {
  if (!placement) return "before";
  return placement;
}

/** True when the icon should render after the label in DOM order. */
export function isIconAfterPlacement(place: IconPlacement): boolean {
  return place === "after" || place === "right" || place === "below";
}

export function iconSizePx(size?: IconSizeToken): number {
  return ICON_SIZE_OPTIONS.find((o) => o.id === (size ?? "md"))?.px ?? 18;
}

export function buttonLayoutClassNames(fields: ButtonLayoutFields): string[] {
  const place = normalizeIconPlacement(fields.iconPosition);
  const classes = [`tap-btn-place-${place}`];
  if (fields.contentAlign) classes.push(`tap-btn-align-${fields.contentAlign}`);
  if (fields.verticalAlign) classes.push(`tap-btn-valign-${fields.verticalAlign}`);
  if (fields.wrap) classes.push("tap-btn-wrap");
  if (fields.fullWidth === false) classes.push("tap-btn-fit");
  if (fields.iconSize) classes.push(`tap-btn-icon-${fields.iconSize}`);
  if (fields.textSize) classes.push(`tap-btn-text-${fields.textSize}`);
  return classes;
}

export function buttonLayoutInlineStyle(fields: ButtonLayoutFields): Record<string, string | number> {
  const style: Record<string, string | number> = {};
  if (typeof fields.iconGap === "number") style.gap = `${fields.iconGap}px`;
  if (typeof fields.paddingX === "number") {
    style.paddingLeft = `${fields.paddingX}px`;
    style.paddingRight = `${fields.paddingX}px`;
  }
  if (typeof fields.paddingY === "number") {
    style.paddingTop = `${fields.paddingY}px`;
    style.paddingBottom = `${fields.paddingY}px`;
  }
  if (typeof fields.minHeight === "number") style.minHeight = `${fields.minHeight}px`;
  return style;
}

/** Effective appearance from Look + iconPosition (iconPosition can force only/none). */
export function resolveAppearance(params: {
  appearance?: "icon_text" | "icon_only" | "text" | "image" | "image_label";
  iconPosition?: IconPlacement;
  hasImage?: boolean;
}): "icon_text" | "icon_only" | "text" | "image" | "image_label" {
  if (params.appearance === "image" || params.appearance === "image_label") {
    return params.appearance;
  }
  const place = normalizeIconPlacement(params.iconPosition);
  if (place === "only" || params.appearance === "icon_only") return "icon_only";
  if (place === "none" || params.appearance === "text") return "text";
  if (params.appearance) return params.appearance;
  return params.hasImage ? "image_label" : "icon_text";
}
