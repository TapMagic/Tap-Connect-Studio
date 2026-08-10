import type { CreativeCompositionNode } from "./composition";
import { containerChildIds, isContainerNode } from "./selection-mode";
import { layoutActionGroupChildren } from "./visual-parts/action-group";

export type ContainerResizePolicy = "reflow" | "frame" | "scale" | "fit-content";

export const CONTAINER_RESIZE_POLICIES: readonly ContainerResizePolicy[] = [
  "reflow",
  "frame",
  "scale",
  "fit-content",
];

export function normalizeResizePolicy(value: unknown): ContainerResizePolicy {
  if (value === "frame" || value === "scale" || value === "fit-content" || value === "reflow") {
    return value;
  }
  if (value === "free") return "frame";
  return "reflow";
}

export type ContainerFrame = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Role-weighted relative heights inside a stack Container (sum ≈ 1). */
export function presetChildWeight(kind: string): number {
  switch (kind) {
    case "image":
    case "thumbnail":
    case "gallery":
    case "map":
    case "video":
      return 2.4;
    case "heading":
    case "business_name":
      return 1.35;
    case "subheading":
      return 1.05;
    case "button":
    case "form":
    case "ticket":
    case "coupon":
      return 1.15;
    case "badge":
    case "terms":
    case "offer_code":
    case "divider":
      return 0.55;
    case "logo":
      return 1.1;
    default:
      return 0.95;
  }
}

export function layoutStackChildren(input: {
  container: ContainerFrame;
  children: CreativeCompositionNode[];
  padding?: number;
  gap?: number;
}): CreativeCompositionNode[] {
  const padding = input.padding ?? 0.06;
  const gap = input.gap ?? 0.018;
  const innerX = input.container.x + input.container.width * padding;
  const innerWidth = input.container.width * (1 - padding * 2);
  const innerTop = input.container.y + input.container.height * padding;
  const innerHeight = input.container.height * (1 - padding * 2);
  const weights = input.children.map((child) =>
    presetChildWeight(String(child.props.presetChildRole || child.props.elementKind || child.primitive))
  );
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0) || 1;
  const gapTotal = gap * Math.max(0, input.children.length - 1);
  const usable = Math.max(0.04, innerHeight - gapTotal);
  let cursor = innerTop;
  return input.children.map((child, index) => {
    const height = usable * (weights[index] / weightSum);
    const next = {
      ...child,
      x: innerX,
      y: cursor,
      width: innerWidth,
      height: Math.max(0.04, height),
    };
    cursor += height + gap;
    return next;
  });
}

export function applyContainerResize(
  nodes: CreativeCompositionNode[],
  containerId: string,
  nextFrame: ContainerFrame,
  policyOverride?: ContainerResizePolicy
): CreativeCompositionNode[] {
  const container = nodes.find((node) => node.id === containerId);
  if (!container || !isContainerNode(container)) return nodes;
  const policy = policyOverride ?? normalizeResizePolicy(container.props.resizePolicy);
  const childIds = new Set(containerChildIds(nodes, containerId));
  const orig = {
    x: container.x,
    y: container.y,
    width: Math.max(0.02, container.width),
    height: Math.max(0.02, container.height),
  };
  const frame: ContainerFrame = {
    x: nextFrame.x,
    y: nextFrame.y,
    width: Math.max(0.02, nextFrame.width),
    height: Math.max(0.02, nextFrame.height),
  };

  if (policy === "fit-content") {
    const children = nodes.filter((node) => childIds.has(node.id) && node.visible !== false);
    if (!children.length) {
      return nodes.map((node) => (node.id === containerId ? { ...node, ...frame } : node));
    }
    const padX = Number(container.props.padding ?? 18) / 390;
    const padY = Number(container.props.padding ?? 18) / Math.max(frame.height * 800, 1);
    const minX = Math.min(...children.map((node) => node.x));
    const minY = Math.min(...children.map((node) => node.y));
    const maxX = Math.max(...children.map((node) => node.x + node.width));
    const maxY = Math.max(...children.map((node) => node.y + node.height));
    const fitted: ContainerFrame = {
      x: clamp(minX - padX, -1, 2),
      y: clamp(minY - padY, -1, 2),
      width: Math.max(0.08, maxX - minX + padX * 2),
      height: Math.max(0.08, maxY - minY + padY * 2),
    };
    return nodes.map((node) =>
      node.id === containerId
        ? { ...node, ...fitted, props: { ...node.props, resizePolicy: "fit-content" } }
        : node
    );
  }

  if (policy === "frame") {
    return nodes.map((node) => (node.id === containerId ? { ...node, ...frame } : node));
  }

  if (policy === "scale") {
    const scaleX = frame.width / orig.width;
    const scaleY = frame.height / orig.height;
    return nodes.map((node) => {
      if (node.id === containerId) return { ...node, ...frame };
      if (!childIds.has(node.id)) return node;
      const relX = (node.x - orig.x) / orig.width;
      const relY = (node.y - orig.y) / orig.height;
      const nextWidth = Math.max(0.02, node.width * scaleX);
      const nextHeight = Math.max(0.02, node.height * scaleY);
      const fontSize = Number(node.props.fontSize);
      const props =
        Number.isFinite(fontSize) && node.primitive === "text"
          ? {
              ...node.props,
              fontSize: clamp(fontSize * ((scaleX + scaleY) / 2), 6, 320),
            }
          : node.props;
      return {
        ...node,
        x: frame.x + relX * frame.width,
        y: frame.y + relY * frame.height,
        width: nextWidth,
        height: nextHeight,
        props,
      };
    });
  }

  // reflow (default): frame changes; children re-laid in stack/row/grid; font sizes stable
  const layout = String(container.props.layout || "stack");
  const children = nodes.filter((node) => childIds.has(node.id));
  let laidOut = children;
  const isActionGroup =
    container.props.vpActionGroup === true ||
    layout === "grid" ||
    layout === "round_team" ||
    String(container.props.vpLayoutIntent || "") === "two_column" ||
    String(container.props.vpLayoutIntent || "") === "round_team_grid";
  if (isActionGroup) {
    laidOut = layoutActionGroupChildren({
      container: { ...container, ...frame },
      children,
      viewportWidthPx: Number(container.props.vpViewportWidthPx || 390),
    });
  } else if (layout === "stack" || layout === "free") {
    laidOut = layoutStackChildren({
      container: frame,
      children,
      padding: 0.06,
      gap: Number(container.props.gap ?? 12) / 800,
    });
  } else if (layout === "row") {
    const padding = 0.06;
    const gap = Number(container.props.gap ?? 12) / 390;
    const innerX = frame.x + frame.width * padding;
    const innerY = frame.y + frame.height * padding;
    const innerW = frame.width * (1 - padding * 2);
    const innerH = frame.height * (1 - padding * 2);
    const cell = (innerW - gap * Math.max(0, children.length - 1)) / Math.max(1, children.length);
    laidOut = children.map((child, index) => ({
      ...child,
      x: innerX + index * (cell + gap),
      y: innerY,
      width: Math.max(0.04, cell),
      height: Math.max(0.04, innerH),
    }));
  }
  const byId = new Map(laidOut.map((node) => [node.id, node]));
  return nodes.map((node) => {
    if (node.id === containerId) return { ...node, ...frame };
    return byId.get(node.id) || node;
  });
}

export function moveContainerWithChildren(
  nodes: CreativeCompositionNode[],
  containerId: string,
  dx: number,
  dy: number
): CreativeCompositionNode[] {
  const container = nodes.find((node) => node.id === containerId);
  if (!container || !isContainerNode(container)) return nodes;
  const childIds = new Set(containerChildIds(nodes, containerId));
  const movers = new Set([containerId, ...childIds]);
  return nodes.map((node) => {
    if (!movers.has(node.id) || node.locked) return node;
    return {
      ...node,
      x: clamp(node.x + dx, -1, 2),
      y: clamp(node.y + dy, -1, 2),
    };
  });
}

export type OverlapBox = { id: string; x: number; y: number; width: number; height: number };

export function boxesOverlap(a: OverlapBox, b: OverlapBox, epsilon = 0.002): boolean {
  return (
    a.x + epsilon < b.x + b.width &&
    a.x + a.width > b.x + epsilon &&
    a.y + epsilon < b.y + b.height &&
    a.y + a.height > b.y + epsilon
  );
}

export function findOverlappingPairs(boxes: readonly OverlapBox[]): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      if (boxesOverlap(boxes[i], boxes[j])) pairs.push([boxes[i].id, boxes[j].id]);
    }
  }
  return pairs;
}

export function containerChildrenOutsideBounds(
  container: OverlapBox,
  children: readonly OverlapBox[],
  epsilon = 0.004
): string[] {
  return children
    .filter(
      (child) =>
        child.x + epsilon < container.x ||
        child.y + epsilon < container.y ||
        child.x + child.width > container.x + container.width + epsilon ||
        child.y + child.height > container.y + container.height + epsilon
    )
    .map((child) => child.id);
}
