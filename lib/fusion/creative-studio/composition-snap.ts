import type { CreativeCompositionNode } from "@/lib/fusion/creative-studio/composition";

export type CompositionGuide = {
  axis: "x" | "y";
  value: number;
  kind: "edge" | "center" | "grid" | "safe-margin" | "equal-spacing";
};

function nearest(
  candidates: { source: number; target: number; kind: CompositionGuide["kind"] }[],
  threshold: number
) {
  return candidates
    .map((item) => ({ ...item, distance: Math.abs(item.target - item.source) }))
    .filter((item) => item.distance <= threshold)
    .sort((left, right) => left.distance - right.distance)[0];
}

export function snapCompositionNodes(input: {
  nodes: CreativeCompositionNode[];
  movingIds: string[];
  threshold?: number;
  grid?: number;
}): { nodes: CreativeCompositionNode[]; guides: CompositionGuide[] } {
  const moving = new Set(input.movingIds);
  const movers = input.nodes.filter((node) => moving.has(node.id));
  if (!movers.length) return { nodes: input.nodes, guides: [] };
  const fixed = input.nodes.filter((node) => !moving.has(node.id) && node.visible !== false);
  const threshold = input.threshold ?? 0.012;
  const grid = input.grid ?? 0.025;
  const minX = Math.min(...movers.map((node) => node.x));
  const maxX = Math.max(...movers.map((node) => node.x + node.width));
  const minY = Math.min(...movers.map((node) => node.y));
  const maxY = Math.max(...movers.map((node) => node.y + node.height));
  const movingX = [minX, (minX + maxX) / 2, maxX];
  const movingY = [minY, (minY + maxY) / 2, maxY];
  const fixedX = fixed.flatMap((node) => [
    { value: node.x, kind: "edge" as const },
    { value: node.x + node.width / 2, kind: "center" as const },
    { value: node.x + node.width, kind: "edge" as const },
  ]);
  const fixedY = fixed.flatMap((node) => [
    { value: node.y, kind: "edge" as const },
    { value: node.y + node.height / 2, kind: "center" as const },
    { value: node.y + node.height, kind: "edge" as const },
  ]);
  const canvasX = [
    { value: 0, kind: "edge" as const },
    { value: 0.03, kind: "safe-margin" as const },
    { value: 0.5, kind: "center" as const },
    { value: 0.97, kind: "safe-margin" as const },
    { value: 1, kind: "edge" as const },
  ];
  const canvasY = canvasX;
  const xSpacing = fixed.flatMap((left) => fixed.filter((right) => right.x > left.x + left.width).flatMap((right) => {
    const gap = right.x - (left.x + left.width);
    return [right.x + right.width + gap, left.x - gap - (maxX - minX)];
  })).filter((value) => value >= 0 && value <= 1 - (maxX - minX));
  const ySpacing = fixed.flatMap((top) => fixed.filter((bottom) => bottom.y > top.y + top.height).flatMap((bottom) => {
    const gap = bottom.y - (top.y + top.height);
    return [bottom.y + bottom.height + gap, top.y - gap - (maxY - minY)];
  })).filter((value) => value >= 0 && value <= 1 - (maxY - minY));
  const xMatch = nearest(
    [
      ...movingX.flatMap((source) =>
        [...fixedX, ...canvasX].map((target) => ({ source, target: target.value, kind: target.kind }))
      ),
      ...xSpacing.map((target) => ({ source: minX, target, kind: "equal-spacing" as const })),
      {
        source: minX,
        target: Math.round(minX / grid) * grid,
        kind: "grid" as const,
      },
    ],
    threshold
  );
  const yMatch = nearest(
    [
      ...movingY.flatMap((source) =>
        [...fixedY, ...canvasY].map((target) => ({ source, target: target.value, kind: target.kind }))
      ),
      ...ySpacing.map((target) => ({ source: minY, target, kind: "equal-spacing" as const })),
      {
        source: minY,
        target: Math.round(minY / grid) * grid,
        kind: "grid" as const,
      },
    ],
    threshold
  );
  const dx = xMatch ? xMatch.target - xMatch.source : 0;
  const dy = yMatch ? yMatch.target - yMatch.source : 0;
  return {
    nodes: input.nodes.map((node) =>
      moving.has(node.id)
        ? {
            ...node,
            x: Math.min(1 - node.width, Math.max(0, node.x + dx)),
            y: Math.min(1 - node.height, Math.max(0, node.y + dy)),
          }
        : node
    ),
    guides: [
      ...(xMatch
        ? [{ axis: "x" as const, value: xMatch.target, kind: xMatch.kind }]
        : []),
      ...(yMatch
        ? [{ axis: "y" as const, value: yMatch.target, kind: yMatch.kind }]
        : []),
    ],
  };
}
