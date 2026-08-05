import type { TapConnectCardConfig } from "@/lib/brand/tap-card";
import {
  createCardElement,
  ensureRootComposition,
  moveCardElements,
  removeSectionKeepElements,
  wrapCardElementsInSection,
  type CardElementKind,
  type CardSurfaceKind,
  type ElementContainerId,
} from "@/lib/fusion/card/composer-model";
import {
  deleteNodes,
  duplicateNodes,
  type CreativeCompositionNode,
} from "@/lib/fusion/creative-studio/composition";
import { updateButtonContentNode, updateButtonLabel } from "@/lib/fusion/creative-studio/button-composition";

export type ObjectParentId = ElementContainerId;

export type ObjectMutationResult = {
  config: TapConnectCardConfig;
  parentId: ObjectParentId;
  objectIds: string[];
};

type InsertObjectInput = {
  config: TapConnectCardConfig;
  /** `null` deliberately means Card root. Undefined is rejected by the type/API. */
  parentId: ObjectParentId;
  kind: CardElementKind;
  initialProps?: Record<string, unknown>;
  dropPoint?: { x: number; y: number };
  layerPosition?: number;
};

function containerNodes(config: TapConnectCardConfig, parentId: ObjectParentId): CreativeCompositionNode[] | null {
  if (parentId === null) return ensureRootComposition(config).nodes;
  const section = config.sections.find((candidate) => candidate.id === parentId && candidate.type === "surface");
  return section?.composition?.nodes ?? null;
}

function withContainerNodes(
  config: TapConnectCardConfig,
  parentId: ObjectParentId,
  nodes: CreativeCompositionNode[]
): TapConnectCardConfig {
  if (parentId === null) {
    return { ...config, rootComposition: { ...ensureRootComposition(config), nodes } };
  }
  return {
    ...config,
    sections: config.sections.map((section) =>
      section.id === parentId && section.composition
        ? { ...section, composition: { ...section.composition, nodes } }
        : section
    ),
  };
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function hexLuminance(color: string): number | null {
  const match = /^#([0-9a-f]{6})$/i.exec(color.trim());
  if (!match) return null;
  const channels = [0, 2, 4].map((offset) => parseInt(match[1].slice(offset, offset + 2), 16) / 255);
  const linear = channels.map((value) => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return .2126 * linear[0] + .7152 * linear[1] + .0722 * linear[2];
}

export function readableTextColor(background: string | undefined): "#111827" | "#f8fafc" {
  const luminance = background ? hexLuminance(background) : null;
  return luminance !== null && luminance > .46 ? "#111827" : "#f8fafc";
}

function insertionBackground(config: TapConnectCardConfig, parentId: ObjectParentId): string | undefined {
  if (parentId === null) {
    const root = ensureRootComposition(config).background;
    if (root?.kind === "solid" && root.value) return root.value;
    return config.surfaceColor;
  }
  const section = config.sections.find((candidate) => candidate.id === parentId);
  if (!section) return config.surfaceColor;
  if (section.surfaceBackgroundKind === "gradient") return section.surfaceGradientStart;
  return section.backgroundColor || config.surfaceColor;
}

function intersects(
  candidate: Pick<CreativeCompositionNode, "x" | "y" | "width" | "height">,
  occupied: CreativeCompositionNode[],
  gap = 0.018
) {
  return occupied.some((node) =>
    node.visible !== false
    && candidate.x < node.x + node.width + gap
    && candidate.x + candidate.width + gap > node.x
    && candidate.y < node.y + node.height + gap
    && candidate.y + candidate.height + gap > node.y
  );
}

/**
 * Find a deterministic, visible placement that does not cover an existing object.
 * The normalized scan is intentionally independent of viewport zoom.
 */
export function findAvailableObjectPlacement(
  node: CreativeCompositionNode,
  occupied: CreativeCompositionNode[],
  preferred?: { x: number; y: number }
): Pick<CreativeCompositionNode, "x" | "y"> {
  const maxX = Math.max(0, 1 - node.width);
  const maxY = Math.max(0, 1 - node.height);
  const candidates: Array<{ x: number; y: number }> = [];
  if (preferred) candidates.push({
    x: clamp(preferred.x, 0, maxX),
    y: clamp(preferred.y, 0, maxY),
  });
  for (let y = 0.04; y <= maxY + 0.0001; y += 0.04) {
    for (let x = 0.04; x <= maxX + 0.0001; x += 0.04) {
      candidates.push({ x: Number(x.toFixed(4)), y: Number(y.toFixed(4)) });
    }
  }
  const open = candidates.find((candidate) => !intersects({ ...node, ...candidate }, occupied));
  if (open) return open;

  // A saturated finite plane cannot promise a non-overlap. Cascade visibly instead of
  // reusing the exact same coordinates, preserving selection and storage truth.
  const cascade = Math.max(0, occupied.length);
  return {
    x: clamp(0.04 + (cascade % 8) * 0.025, 0, maxX),
    y: clamp(0.04 + (cascade % 12) * 0.025, 0, maxY),
  };
}

export function insertObject(input: InsertObjectInput): ObjectMutationResult {
  const existing = containerNodes(input.config, input.parentId);
  if (!existing) throw new Error(`Cannot insert into unknown or non-surface parent: ${input.parentId}`);
  const node = createCardElement(input.kind, existing.length);
  let props = { ...node.props, ...input.initialProps };
  if (node.primitive === "text" && input.initialProps?.color === undefined) {
    props.color = readableTextColor(insertionBackground(input.config, input.parentId));
  }
  if (input.kind === "button" && typeof input.initialProps?.label === "string") {
    props = updateButtonLabel(props, input.initialProps.label, node.id);
  }
  if (input.kind === "button" && typeof input.initialProps?.icon === "string") {
    props = updateButtonContentNode(props, "icon", { props: { icon: input.initialProps.icon } }, node.id);
  }
  const placement = findAvailableObjectPlacement(node, existing, input.dropPoint);
  const maxZ = existing.reduce((maximum, candidate) => Math.max(maximum, candidate.zIndex), 0);
  const inserted = {
    ...node,
    ...placement,
    zIndex: input.layerPosition ?? maxZ + 1,
    props,
  };
  return {
    config: withContainerNodes(input.config, input.parentId, [...existing, inserted]),
    parentId: input.parentId,
    objectIds: [inserted.id],
  };
}

export function replaceObject(
  config: TapConnectCardConfig,
  parentId: ObjectParentId,
  objectId: string,
  replacement: CreativeCompositionNode
): ObjectMutationResult {
  const nodes = containerNodes(config, parentId);
  if (!nodes?.some((node) => node.id === objectId)) return { config, parentId, objectIds: [] };
  const next = nodes.map((node) => objectId === node.id ? { ...replacement, id: objectId, zIndex: node.zIndex } : node);
  return { config: withContainerNodes(config, parentId, next), parentId, objectIds: [objectId] };
}

export function convertObject(
  config: TapConnectCardConfig,
  parentId: ObjectParentId,
  objectId: string,
  kind: CardElementKind
): ObjectMutationResult {
  const current = containerNodes(config, parentId)?.find((node) => node.id === objectId);
  if (!current) return { config, parentId, objectIds: [] };
  const converted = createCardElement(kind);
  return replaceObject(config, parentId, objectId, {
    ...converted,
    x: current.x,
    y: current.y,
    width: current.width,
    height: current.height,
    rotationDeg: current.rotationDeg,
    props: { ...converted.props, ...current.props, elementKind: kind },
  });
}

export function moveObject(
  config: TapConnectCardConfig,
  objectIds: string[],
  fromParentId: ObjectParentId,
  toParentId: ObjectParentId
): ObjectMutationResult {
  const next = moveCardElements(config, objectIds, fromParentId, toParentId);
  return { config: next, parentId: toParentId, objectIds: next === config ? [] : objectIds };
}

export function wrapObjects(
  config: TapConnectCardConfig,
  objectIds: string[],
  fromParentId: ObjectParentId,
  kind: CardSurfaceKind = "blank"
): ObjectMutationResult {
  const result = wrapCardElementsInSection(config, objectIds, fromParentId, kind);
  return { config: result.config, parentId: result.sectionId, objectIds };
}

export function unwrapSection(
  config: TapConnectCardConfig,
  sectionId: string,
  toParentId: ObjectParentId = null
): ObjectMutationResult {
  const objectIds = config.sections.find((section) => section.id === sectionId)?.composition?.nodes.map((node) => node.id) ?? [];
  const next = removeSectionKeepElements(config, sectionId, toParentId);
  return { config: next, parentId: toParentId, objectIds };
}

export function duplicateObject(
  config: TapConnectCardConfig,
  parentId: ObjectParentId,
  objectIds: string[]
): ObjectMutationResult {
  const nodes = containerNodes(config, parentId);
  if (!nodes) return { config, parentId, objectIds: [] };
  const duplicated = duplicateNodes(nodes, objectIds);
  const originals = new Set(nodes.map((node) => node.id));
  const placed = duplicated.nodes.map((node) => {
    if (originals.has(node.id)) return node;
    const occupied = duplicated.nodes.filter((candidate) => candidate.id !== node.id && (originals.has(candidate.id) || candidate.zIndex < node.zIndex));
    return { ...node, ...findAvailableObjectPlacement(node, occupied, { x: node.x, y: node.y }) };
  });
  return { config: withContainerNodes(config, parentId, placed), parentId, objectIds: duplicated.newIds };
}

export function deleteObject(
  config: TapConnectCardConfig,
  parentId: ObjectParentId,
  objectIds: string[]
): ObjectMutationResult {
  const nodes = containerNodes(config, parentId);
  if (!nodes) return { config, parentId, objectIds: [] };
  return { config: withContainerNodes(config, parentId, deleteNodes(nodes, objectIds)), parentId, objectIds };
}
