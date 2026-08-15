import type { CreativeCompositionNode } from "@/lib/fusion/creative-studio/composition";
import { containerChildIds } from "@/lib/fusion/creative-studio/selection-mode";
import { getSignatureAsset } from "./registry";

export const ARC_EMBER_STAGE_ID = "master/arc-ember/stage/surface/v1";

export type ArcEmberStageMeasurement = {
  stageId: string;
  topPx: number;
  leftPx: number;
  widthPx: number;
  heightPx: number;
  childIds: string[];
  childHeightsPx: number[];
  requiredSurfaceHeightPx: number;
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function visibleStageChildren(nodes: readonly CreativeCompositionNode[], stageId: string) {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  return containerChildIds(nodes, stageId)
    .map((id) => byId.get(id))
    .filter((node): node is CreativeCompositionNode => Boolean(node && node.visible !== false));
}

function childHeightPx(child: CreativeCompositionNode, innerWidthPx: number, fallbackSurfaceHeightPx: number) {
  const asset = getSignatureAsset(child.props.signatureAssetId);
  if (asset) return clamp(innerWidthPx / asset.aspectRatio, asset.assetKind === "divider" ? 42 : 62, 220);
  return clamp(child.height * fallbackSurfaceHeightPx, 48, 260);
}

/**
 * Measures the content-driven manufactured frame. Source pixels are not changed here:
 * this only places independent children inside the protected content aperture.
 */
export function measureArcEmberStages(
  nodes: readonly CreativeCompositionNode[],
  viewportWidthPx: number,
  fallbackSurfaceHeightPx: number,
): ArcEmberStageMeasurement[] {
  const safeViewportWidth = Math.max(280, viewportWidthPx || 390);
  const safeFallbackHeight = Math.max(260, fallbackSurfaceHeightPx || 720);
  return nodes.flatMap((stage) => {
    if (stage.props.signatureAssetId !== ARC_EMBER_STAGE_ID || stage.visible === false) return [];
    const asset = getSignatureAsset(stage.props.signatureAssetId);
    const contract = asset?.expansionContract;
    if (!asset || !contract) return [];
    const widthPx = clamp(stage.width * safeViewportWidth, contract.minimumWidthPx, safeViewportWidth * 1.2);
    const leftPx = stage.x * safeViewportWidth;
    const topPx = Math.max(0, stage.y * safeFallbackHeight);
    const innerWidthPx = widthPx * (1 - contract.innerPadding.left - contract.innerPadding.right);
    const children = visibleStageChildren(nodes, stage.id);
    const childHeightsPx = children.map((child) => childHeightPx(child, innerWidthPx, safeFallbackHeight));
    const topPaddingPx = Math.max(44, widthPx * contract.innerPadding.top);
    const bottomPaddingPx = Math.max(50, widthPx * contract.innerPadding.bottom);
    const gapsPx = Math.max(0, childHeightsPx.length - 1) * contract.childGapPx;
    const contentHeightPx = childHeightsPx.reduce((sum, height) => sum + height, 0) + gapsPx;
    const heightPx = Math.max(contract.minimumHeightPx, topPaddingPx + contentHeightPx + bottomPaddingPx);
    return [{
      stageId: stage.id,
      topPx,
      leftPx,
      widthPx,
      heightPx,
      childIds: children.map((child) => child.id),
      childHeightsPx,
      requiredSurfaceHeightPx: topPx + heightPx + Math.max(24, widthPx * contract.glowSafeArea.bottom),
    }];
  });
}

export function requiredArcEmberSurfaceHeightPx(
  nodes: readonly CreativeCompositionNode[],
  viewportWidthPx: number,
  fallbackSurfaceHeightPx: number,
) {
  return Math.max(
    fallbackSurfaceHeightPx,
    ...measureArcEmberStages(nodes, viewportWidthPx, fallbackSurfaceHeightPx).map((measurement) => measurement.requiredSurfaceHeightPx),
  );
}

/** Deterministic render-time reflow: removal contracts; reinsertion expands; array/childIds order wins. */
export function layoutArcEmberStages(
  nodes: readonly CreativeCompositionNode[],
  viewportWidthPx: number,
  surfaceHeightPx: number,
  fallbackSurfaceHeightPx = surfaceHeightPx,
): CreativeCompositionNode[] {
  const measurements = measureArcEmberStages(nodes, viewportWidthPx, fallbackSurfaceHeightPx);
  if (!measurements.length) return [...nodes];
  const patches = new Map<string, Partial<CreativeCompositionNode>>();
  for (const measurement of measurements) {
    const stage = nodes.find((node) => node.id === measurement.stageId)!;
    const asset = getSignatureAsset(stage.props.signatureAssetId)!;
    const contract = asset.expansionContract!;
    patches.set(stage.id, {
      x: measurement.leftPx / viewportWidthPx,
      y: measurement.topPx / surfaceHeightPx,
      width: measurement.widthPx / viewportWidthPx,
      height: measurement.heightPx / surfaceHeightPx,
    });
    const innerLeftPx = measurement.leftPx + measurement.widthPx * contract.innerPadding.left;
    const innerWidthPx = measurement.widthPx * (1 - contract.innerPadding.left - contract.innerPadding.right);
    let cursorPx = measurement.topPx + Math.max(44, measurement.widthPx * contract.innerPadding.top);
    measurement.childIds.forEach((id, index) => {
      const heightPx = measurement.childHeightsPx[index] ?? 62;
      patches.set(id, {
        x: innerLeftPx / viewportWidthPx,
        y: cursorPx / surfaceHeightPx,
        width: innerWidthPx / viewportWidthPx,
        height: heightPx / surfaceHeightPx,
      });
      cursorPx += heightPx + contract.childGapPx;
    });
  }
  return nodes.map((node) => patches.has(node.id) ? { ...node, ...patches.get(node.id)! } : node);
}
