import type { CreativeCompositionBlock, CreativeCompositionNode } from "../composition";
import { layeredCompositionParentSizePx } from "./layered-region";

export const STUDIO_FRAME_SEMANTICS_CONTRACT = "studioFrameSemantics@1.0.0" as const;

export type StudioFrameRect = { left: number; top: number; width: number; height: number };
export type StudioFrameSemantics = {
  placement: StudioFrameRect;
  visual: StudioFrameRect;
  touch: StudioFrameRect;
  actionBearing: boolean;
  visualOverflowPx: number;
};

function finite(values: unknown[]): number[] {
  return values.map(Number).filter((value) => Number.isFinite(value));
}

export function isActionBearingCompositionNode(node: CreativeCompositionNode): boolean {
  if (node.primitive === "button" || String(node.props.elementKind || "") === "map") return true;
  if (node.props.action || node.props.actionType || node.props.destination || node.props.destinationType) return true;
  if (node.props.href || node.props.url || node.props.internalPageId) return true;
  return Boolean(node.props.compactActionGrid || node.props.items);
}

export function canonicalVisualOverflowPx(node: CreativeCompositionNode): number {
  const values = finite([
    node.props.visualOverflowPx,
    node.props.boxShadow,
    node.props.shadowBlur,
    node.props.glowBlur,
    node.props.glowRadius,
    node.props.effectBlur,
    node.props.outlineWidth,
    node.props.boxBorderWidth,
  ]);
  const preset = String(node.props.effectPreset || node.props.glow || "");
  const declared = Math.max(0, ...values);
  const presetOverflow = preset && preset !== "none" && preset !== "false" ? 12 : 0;
  return Math.min(64, Math.max(declared, presetOverflow));
}

function expand(frame: StudioFrameRect, x: number, y: number): StudioFrameRect {
  return {
    left: frame.left - x,
    top: frame.top - y,
    width: frame.width + x * 2,
    height: frame.height + y * 2,
  };
}

export function resolveStudioFrameSemantics(
  block: CreativeCompositionBlock,
  node: CreativeCompositionNode,
  parent = layeredCompositionParentSizePx(block, node.parentId ?? null),
): StudioFrameSemantics {
  const placement = { left: node.x, top: node.y, width: node.width, height: node.height };
  const overflowPx = canonicalVisualOverflowPx(node);
  const visual = expand(placement, overflowPx / parent.widthPx, overflowPx / parent.heightPx);
  const actionBearing = isActionBearingCompositionNode(node);
  const touchWidth = actionBearing ? Math.max(placement.width, 44 / parent.widthPx) : placement.width;
  const touchHeight = actionBearing ? Math.max(placement.height, 44 / parent.heightPx) : placement.height;
  const touch = {
    left: placement.left - (touchWidth - placement.width) / 2,
    top: placement.top - (touchHeight - placement.height) / 2,
    width: touchWidth,
    height: touchHeight,
  };
  return { placement, visual, touch, actionBearing, visualOverflowPx: overflowPx };
}

