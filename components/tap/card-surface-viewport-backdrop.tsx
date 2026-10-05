import { MaterialSurfaceLayers } from "@/components/fusion/creative-studio/material-surface-layers";
import type { TapConnectCardConfig } from "@/lib/brand/tap-card";
import { parseCreativeComposition } from "@/lib/fusion/creative-studio/composition";
import { materialPropsFromCompositionBackground } from "@/lib/fusion/creative-studio/material-engine";
import { resolveMaterialSurfaceFromProps } from "@/lib/fusion/creative-studio/material-surface";
import { readCardEdgeMode } from "@/lib/fusion/creative-studio/platform/edge-layout";
import { cardSurfaceImageLayerStyle } from "@/lib/fusion/creative-studio/platform/card-surface-rendering";
import { surfacePatternStyle } from "@/lib/fusion/creative-studio/patterns";

/** One full-viewport visual plane. Content safe-area geometry lives above it. */
export function CardSurfaceViewportBackdrop({ config, viewportFixed = false }: { config: TapConnectCardConfig; viewportFixed?: boolean }) {
  const root = parseCreativeComposition(config.rootComposition);
  if (!root || readCardEdgeMode(root) !== "full_bleed" || !root.background || root.background.kind === "none") return null;
  const imageStyle = cardSurfaceImageLayerStyle(root.background);
  const materialProps = materialPropsFromCompositionBackground(root.background);
  const material = materialProps ? resolveMaterialSurfaceFromProps(materialProps, "generic") : null;
  const patternStyle = (root.background.kind === "pattern" || root.background.kind === "texture") && root.background.pattern
    ? surfacePatternStyle(root.background.pattern)
    : null;
  const style = imageStyle || (material
    ? { background: material.background, backgroundSize: material.backgroundSize, opacity: root.background.opacity ?? 1 }
    : patternStyle || { background: root.background.value || config.surfaceColor || "#0b0f19", opacity: root.background.opacity ?? 1 });
  return <div className={`pointer-events-none inset-0 overflow-hidden ${viewportFixed ? "fixed" : "absolute"}`} data-card-surface-viewport-backdrop="true" data-edge-mode="full_bleed" style={style} aria-hidden>{material ? <MaterialSurfaceLayers surface={material} testIdPrefix="viewport-background" /> : null}</div>;
}
