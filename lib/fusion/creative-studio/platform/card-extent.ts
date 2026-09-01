import type { CreativeCompositionBlock } from "../composition";

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
  return setExplicitCardMinimum(block, Math.max(fallback, Math.ceil(contentRequiredHeightPx)));
}
