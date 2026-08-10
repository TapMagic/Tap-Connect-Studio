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
import {
  actionGroupContainerProps,
  layoutActionGroupChildren,
  type ActionGroupLayoutIntent,
  type ActionGroupPlanItem,
} from "@/lib/fusion/creative-studio/visual-parts/action-group";
import { applyCuratedFamily, applyIconStationContent, applyIconStationPosition } from "@/lib/fusion/creative-studio/visual-parts/apply";

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
  /** Explicit geometry for structured Action Group inserts. */
  frame?: { x: number; y: number; width: number; height: number };
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

function overlapArea(
  a: Pick<CreativeCompositionNode, "x" | "y" | "width" | "height">,
  b: Pick<CreativeCompositionNode, "x" | "y" | "width" | "height">
) {
  const width = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  const height = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  return width * height;
}

/** Cost of covering existing nodes — small earlier objects weigh more (Owner click targets). */
function coverageCost(
  candidate: Pick<CreativeCompositionNode, "x" | "y" | "width" | "height">,
  occupied: CreativeCompositionNode[]
) {
  return occupied.reduce((total, node) => {
    if (node.visible === false) return total;
    const area = overlapArea(candidate, node);
    if (area <= 0) return total;
    const smallTarget = node.width * node.height < 0.08 || node.primitive === "text" || node.props.elementKind === "icon";
    return total + area * (smallTarget ? 8 : 1);
  }, 0);
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
  // Also try below the current stack — critical when large coupons saturate the grid.
  const lowestBottom = occupied.reduce(
    (maximum, candidate) => (candidate.visible === false ? maximum : Math.max(maximum, candidate.y + candidate.height)),
    0.04
  );
  if (lowestBottom + 0.02 <= maxY) {
    candidates.push({
      x: clamp(0.06, 0, maxX),
      y: clamp(Number((lowestBottom + 0.03).toFixed(4)), 0, maxY),
    });
  }

  const open = candidates.find((candidate) => !intersects({ ...node, ...candidate }, occupied));
  if (open) return open;

  // Saturated plane: choose the candidate that least buries small Owner-clickable targets.
  let best = candidates[0] || { x: 0.04, y: 0.04 };
  let bestCost = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    const cost = coverageCost({ ...node, ...candidate }, occupied);
    if (cost < bestCost - 1e-9) {
      best = candidate;
      bestCost = cost;
    }
  }
  return best;
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
  const placement = input.frame
    ? { x: input.frame.x, y: input.frame.y }
    : findAvailableObjectPlacement(node, existing, input.dropPoint);
  const maxZ = existing.reduce((maximum, candidate) => Math.max(maximum, candidate.zIndex), 0);
  const inserted = {
    ...node,
    ...placement,
    width: input.frame?.width ?? node.width,
    height: input.frame?.height ?? node.height,
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

/** Insert a parent-owned Action Group (rails / two-column / round team) with real child geometry. */
export function insertActionGroup(
  config: TapConnectCardConfig,
  parentId: ObjectParentId,
  input: {
    intent: ActionGroupLayoutIntent;
    items: ActionGroupPlanItem[];
    viewportWidthPx?: number;
  }
): ObjectMutationResult {
  const existing = containerNodes(config, parentId);
  if (!existing) throw new Error(`Cannot insert action group into unknown parent: ${parentId}`);
  const maxZ = existing.reduce((maximum, candidate) => Math.max(maximum, candidate.zIndex), 0);
  const rowCount = Math.max(1, Math.ceil(input.items.length / (input.intent === "one_column" ? 1 : 2)));
  const container = createCardElement("composition", existing.length);
  const containerProps = {
    ...container.props,
    ...actionGroupContainerProps(input.intent),
  };
  const containerNode: CreativeCompositionNode = {
    ...container,
    x: 0.04,
    y: 0.08,
    width: 0.92,
    height: Math.min(0.72, 0.12 + rowCount * 0.14),
    zIndex: maxZ + 1,
    props: containerProps,
  };

  let childNodes: CreativeCompositionNode[] = input.items.map((item, index) => {
    const button = createCardElement("button", existing.length + index + 1);
    let props: Record<string, unknown> = {
      ...button.props,
      ...updateButtonLabel(button.props, item.label, button.id),
      containerId: containerNode.id,
      vpRailAware: true,
      vpActionGroupChild: true,
      showIcon: true,
      icon: item.icon || "sparkles",
      iconSecondary: item.iconSecondary || "arrow-up-right",
      actionType: item.actionType || "website",
      href: item.href || "https://host.example/action",
    };
    if (item.presentation) props.presentation = item.presentation;
    if (item.portrait || item.iconMediaUrl) {
      props = applyIconStationContent(props, {
        kind: "upload",
        mediaUrl: item.iconMediaUrl || "/tap-connect-mark.png",
        mediaAssetId: `demo-team-${index}`,
        slot: "primary",
      });
      props = applyIconStationPosition(props, "left");
    }
    if (item.familyId) {
      props = applyCuratedFamily(props, item.familyId, "button");
    }
    return {
      ...button,
      zIndex: maxZ + 2 + index,
      props,
    };
  });

  childNodes = layoutActionGroupChildren({
    container: containerNode,
    children: childNodes,
    viewportWidthPx: input.viewportWidthPx ?? 390,
  });

  containerNode.props = {
    ...containerNode.props,
    childIds: childNodes.map((child) => child.id),
  };

  return {
    config: withContainerNodes(config, parentId, [...existing, containerNode, ...childNodes]),
    parentId,
    objectIds: [containerNode.id, ...childNodes.map((child) => child.id)],
  };
}
