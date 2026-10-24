import type { CreativeCompositionBlock } from "../composition";
import { isCardSurfaceLayered, resizeLayeredPlane } from "./layered-region";

export const STUDIO_CARD_EXTENT_CONTRACT = "studioCardExtent@1.0.0" as const;

export type CardExtent = {
  contractId: typeof STUDIO_CARD_EXTENT_CONTRACT;
  contentRequiredHeightPx: number;
  explicitMinimumHeightPx: number;
  actualHeightPx: number;
};

export function explicitCardMinimum(block: CreativeCompositionBlock, fallback = 420): number {
  return Math.max(240, Math.round(block.explicitMinimumHeightPx ?? block.pageHeightPx ?? fallback));
}

export function resolveCardExtent(
  block: CreativeCompositionBlock,
  contentRequiredHeightPx: number,
  fallback = 420,
): CardExtent {
  const explicitMinimumHeightPx = explicitCardMinimum(block, fallback);
  const required = Math.max(0, Math.ceil(contentRequiredHeightPx));
  return {
    contractId: STUDIO_CARD_EXTENT_CONTRACT,
    contentRequiredHeightPx: required,
    explicitMinimumHeightPx,
    actualHeightPx: Math.max(required, explicitMinimumHeightPx),
  };
}

export function setExplicitCardMinimum(
  block: CreativeCompositionBlock,
  heightPx: number,
): CreativeCompositionBlock {
  return { ...block, explicitMinimumHeightPx: Math.max(240, Math.min(4000, Math.round(heightPx))) };
}

export function fitCardToContent(
  block: CreativeCompositionBlock,
  contentRequiredHeightPx: number,
  fallback = 420,
): CreativeCompositionBlock {
  const required = Math.max(fallback, Math.ceil(contentRequiredHeightPx));
  const next = isCardSurfaceLayered(block)
    ? resizeLayeredPlane(block, required - (block.safeAreaPaddingPx ?? 12) * 2)
    : block;
  return setExplicitCardMinimum(next, required);
}

/** Direct page-edge extension grows usable Layered space; minimum-only input stays separate. */
export function extendCardPage(block: CreativeCompositionBlock, outerHeightPx: number): CreativeCompositionBlock {
  if (!isCardSurfaceLayered(block)) return setExplicitCardMinimum(block, outerHeightPx);
  return resizeLayeredPlane(block, outerHeightPx - (block.safeAreaPaddingPx ?? 12) * 2);
}
