/**
 * Creative Composition Block — typed registry contract.
 *
 * A bounded freeform surface inside a Card section for intentional compositions
 * (text over image, framed media, coupon artwork) without converting the whole
 * Card into an unrestricted fixed-pixel canvas.
 *
 * UI wiring remains progressive; this module defines the shared schema first.
 */

export type CreativeCompositionPrimitive =
  | "text"
  | "button"
  | "image"
  | "frame"
  | "shape"
  | "border"
  | "group"
  | "background";

export type CreativeCompositionAnchor =
  | "top-left"
  | "top"
  | "top-right"
  | "left"
  | "center"
  | "right"
  | "bottom-left"
  | "bottom"
  | "bottom-right";

export type CreativeCompositionNode = {
  id: string;
  primitive: CreativeCompositionPrimitive;
  /** Relative position within the composition (0–1) when percentage mode is used. */
  x: number;
  y: number;
  width: number;
  height: number;
  rotationDeg?: number;
  zIndex: number;
  locked?: boolean;
  visible?: boolean;
  groupId?: string | null;
  anchor?: CreativeCompositionAnchor;
  /** Optional percentage dimensions for responsive intent. */
  widthPct?: number;
  heightPct?: number;
  minWidthPx?: number;
  maxWidthPx?: number;
  /** Opaque payload owned by the primitive renderer. */
  props: Record<string, unknown>;
};

export type CreativeCompositionBlock = {
  version: 1;
  id: string;
  label: string;
  nodes: CreativeCompositionNode[];
  background?: {
    kind: "solid" | "gradient" | "image" | "none";
    value?: string;
  };
  /** Narrow-screen fallback when overlap cannot be preserved safely. */
  mobileFallback: "stack" | "scale" | "hide_decorative";
  safeAreaPaddingPx?: number;
};

export const CREATIVE_COMPOSITION_BLOCK_ID = "card.creative_composition" as const;

export function createEmptyCreativeComposition(
  id = "composition-1"
): CreativeCompositionBlock {
  return {
    version: 1,
    id,
    label: "Creative Composition",
    nodes: [],
    background: { kind: "none" },
    mobileFallback: "stack",
    safeAreaPaddingPx: 12,
  };
}

export function sortCompositionNodes(
  nodes: CreativeCompositionNode[]
): CreativeCompositionNode[] {
  return [...nodes].sort((a, b) => a.zIndex - b.zIndex || a.id.localeCompare(b.id));
}
