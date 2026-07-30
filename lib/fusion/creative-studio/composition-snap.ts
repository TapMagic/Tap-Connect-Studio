import type { CreativeCompositionNode } from "@/lib/fusion/creative-studio/composition";

export type CompositionGuide = {
  axis: "x" | "y";
  value: number;
  kind: "edge" | "center" | "grid";
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
    node.x,
    node.x + node.width / 2,
    node.x + node.width,
  ]);
  const fixedY = fixed.flatMap((node) => [
    node.y,
    node.y + node.height / 2,
    node.y + node.height,
  ]);
  const xMatch = nearest(
    [
      ...movingX.flatMap((source) =>
        fixedX.map((target) => ({ source, target, kind: "edge" as const }))
      ),
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
        fixedY.map((target) => ({ source, target, kind: "edge" as const }))
      ),
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

