/**
 * Group authority — selection chrome, transform, and capability fan-out.
 * Groups remain a peer `groupId` relationship; this module makes them a real
 * editing target without inventing a second Group species.
 */

import { nanoid } from "nanoid";
import type { CreativeCompositionBlock, CreativeCompositionGroup, CreativeCompositionNode } from "./composition";
import {
  expandSelectionToGroups,
  groupNodes,
  resolveNodeBox,
  translateNodesOnPasteboard,
  ungroupNodes,
} from "./composition";
import { objectFamilyForNode, type ObjectFamily } from "./capabilities";
import { isTrueGroupMember } from "./selection-mode";
import { layeredResizePolicy } from "./platform/layered-region";

export type GroupUnionBounds = {
  groupId: string;
  memberIds: string[];
  left: number;
  top: number;
  width: number;
  height: number;
  /** Average rotation of members (degrees). */
  rotationDeg: number;
};

export type FanOutCapability =
  | "text_color"
  | "font"
  | "font_size"
  | "font_weight"
  | "italic"
  | "underline"
  | "alignment"
  | "line_height"
  | "letter_spacing"
  | "effect"
  | "material"
  | "motion"
  | "opacity"
  | "text_content"
  | "fill"
  | "gradient"
  | "border"
  | "visibility"
  | "accessibility";

export type TriState = "on" | "off" | "mixed" | "empty";

export type CompositionGroupLayoutMode = "layered" | "flow_vertical" | "flow_horizontal" | "grid";
export type CompositionGroupDensityMode = "dense" | "standard" | "airy" | "custom";
export type CompositionGroupSettings = {
  layout: CompositionGroupLayoutMode;
  density: CompositionGroupDensityMode;
  rowGapPx: number;
  columnGapPx: number;
  internalGapPx: number;
};

export type CompositionGroupScaleMode = CreativeCompositionGroup["scaleMode"];

const GROUP_DENSITY: Record<Exclude<CompositionGroupDensityMode, "custom">, Pick<CompositionGroupSettings, "rowGapPx" | "columnGapPx" | "internalGapPx">> = {
  dense: { rowGapPx: 4, columnGapPx: 6, internalGapPx: 2 },
  standard: { rowGapPx: 10, columnGapPx: 12, internalGapPx: 6 },
  airy: { rowGapPx: 20, columnGapPx: 22, internalGapPx: 12 },
};

function groupGap(value: unknown, fallback: number) {
  const number = Number(value);
  return Math.max(0, Math.min(64, Number.isFinite(number) ? number : fallback));
}

export function readCompositionGroupSettings(
  nodes: readonly CreativeCompositionNode[],
  groupId: string,
): CompositionGroupSettings {
  const member = groupMembers(nodes, groupId)[0];
  const rawDensity = String(member?.props.compositionGroupDensityMode || "standard");
  const density: CompositionGroupDensityMode = rawDensity === "dense" || rawDensity === "airy" || rawDensity === "custom" ? rawDensity : "standard";
  const rawLayout = String(member?.props.compositionGroupLayout || "layered");
  const layout: CompositionGroupLayoutMode = rawLayout === "flow_vertical" || rawLayout === "flow_horizontal" || rawLayout === "grid" ? rawLayout : "layered";
  const preset = density === "custom" ? GROUP_DENSITY.standard : GROUP_DENSITY[density];
  return {
    layout,
    density,
    rowGapPx: groupGap(member?.props.compositionGroupRowGapPx, preset.rowGapPx),
    columnGapPx: groupGap(member?.props.compositionGroupColumnGapPx, preset.columnGapPx),
    internalGapPx: groupGap(member?.props.compositionGroupInternalGapPx, preset.internalGapPx),
  };
}

function inferredGroupRecord(
  block: CreativeCompositionBlock,
  groupId: string,
): CreativeCompositionGroup | null {
  const members = groupMembers(block.nodes, groupId);
  const bounds = computeGroupUnionBounds(block.nodes, groupId, true);
  if (!bounds || members.length < 2) return null;
  const settings = readCompositionGroupSettings(block.nodes, groupId);
  return {
    id: groupId,
    name: "Group",
    parentId: members[0]?.parentId ?? null,
    x: bounds.left,
    y: bounds.top,
    width: bounds.width,
    height: bounds.height,
    anchor: members[0]?.anchor ?? "top-left",
    zIndex: Math.max(1, ...members.map((member) => member.zIndex)),
    locked: members.every((member) => member.locked === true),
    ...settings,
    scaleMode: "proportional",
  };
}

export function compositionGroupRecord(
  block: CreativeCompositionBlock,
  groupId: string,
): CreativeCompositionGroup | null {
  return block.groups?.find((group) => group.id === groupId) ?? inferredGroupRecord(block, groupId);
}

/** Keeps persisted Group objects synchronized with canonical member geometry. */
export function synchronizeCompositionGroups(block: CreativeCompositionBlock): CreativeCompositionBlock {
  const ids = [...new Set(block.nodes.flatMap((node) => node.groupId && isTrueGroupMember(node) ? [node.groupId] : []))];
  const current = new Map((block.groups ?? []).map((group) => [group.id, group]));
  const groups = ids.flatMap((groupId) => {
    const inferred = inferredGroupRecord(block, groupId);
    if (!inferred) return [];
    const existing = current.get(groupId);
    return [{
      ...inferred,
      ...existing,
      parentId: inferred.parentId,
      x: inferred.x,
      y: inferred.y,
      width: inferred.width,
      height: inferred.height,
    }];
  });
  return { ...block, groups };
}

export function groupCompositionBlock(
  block: CreativeCompositionBlock,
  ids: readonly string[],
  groupId = `group-${nanoid(6)}`,
): CreativeCompositionBlock {
  const nodes = groupNodes(block.nodes, [...ids], groupId);
  if (nodes === block.nodes) return block;
  return synchronizeCompositionGroups({ ...block, nodes });
}

export function ungroupCompositionBlock(
  block: CreativeCompositionBlock,
  groupId: string,
): CreativeCompositionBlock {
  return {
    ...block,
    nodes: ungroupNodes(block.nodes, groupId),
    groups: (block.groups ?? []).filter((group) => group.id !== groupId),
  };
}

export function updateCompositionGroup(
  block: CreativeCompositionBlock,
  groupId: string,
  patch: Partial<CreativeCompositionGroup>,
): CreativeCompositionBlock {
  const record = compositionGroupRecord(block, groupId);
  if (!record) return block;
  const next = { ...record, ...patch, id: groupId, parentId: record.parentId };
  const groups = [...(block.groups ?? []).filter((group) => group.id !== groupId), next];
  return { ...block, groups };
}

export function setCompositionGroupSettingsInBlock(
  block: CreativeCompositionBlock,
  groupId: string,
  patch: Partial<CompositionGroupSettings>,
  region: { widthPx: number; heightPx: number },
): CreativeCompositionBlock {
  const nodes = setCompositionGroupSettings(block.nodes, groupId, patch, region);
  const synced = synchronizeCompositionGroups({ ...block, nodes });
  const settings = readCompositionGroupSettings(nodes, groupId);
  return updateCompositionGroup(synced, groupId, settings);
}

export function moveCompositionGroupInBlock(
  block: CreativeCompositionBlock,
  groupId: string,
  dx: number,
  dy: number,
): CreativeCompositionBlock {
  const bounds = computeGroupUnionBounds(block.nodes, groupId, true);
  if (!bounds) return block;
  const boundedDx = Math.max(-bounds.left, Math.min(1 - bounds.left - bounds.width, dx));
  const boundedDy = Math.max(-bounds.top, Math.min(1 - bounds.top - bounds.height, dy));
  return synchronizeCompositionGroups({ ...block, nodes: moveGroupComposition(block.nodes, groupId, boundedDx, boundedDy) });
}

export function resizeCompositionGroupInBlock(
  block: CreativeCompositionBlock,
  groupId: string,
  next: { left: number; top: number; width: number; height: number },
  options?: { minChildWidth?: number; minChildHeight?: number },
): CreativeCompositionBlock {
  const width = Math.max(.08, Math.min(1, next.width));
  const height = Math.max(.06, Math.min(1, next.height));
  const bounded = {
    left: Math.max(0, Math.min(1 - width, next.left)),
    top: Math.max(0, Math.min(1 - height, next.top)),
    width,
    height,
  };
  return synchronizeCompositionGroups({ ...block, nodes: resizeGroupComposition(block.nodes, groupId, bounded, options) });
}

export function setCompositionGroupScaleMode(
  block: CreativeCompositionBlock,
  groupId: string,
  scaleMode: CompositionGroupScaleMode,
  options: { minChildWidth: number; minChildHeight: number },
): CreativeCompositionBlock {
  const bounds = computeGroupUnionBounds(block.nodes, groupId, true);
  if (!bounds) return block;
  // These are parent-relative authored widths. Compact must remain useful when
  // the Group itself lives in a 60–70% side region; over-shrinking here makes
  // a two-column action bank technically smaller but visually illegible.
  const targetWidth = scaleMode === "compact" ? .78 : scaleMode === "medium" ? .88 : scaleMode === "full" ? .96 : bounds.width;
  const ratio = targetWidth / Math.max(.02, bounds.width);
  const targetHeight = scaleMode === "fill" ? Math.min(1 - bounds.top, bounds.height) : bounds.height * ratio;
  const resized = resizeCompositionGroupInBlock(block, groupId, {
    left: bounds.left,
    top: bounds.top,
    width: targetWidth,
    height: targetHeight,
  }, options);
  return updateCompositionGroup(resized, groupId, { scaleMode });
}

export function reorderCompositionGroupZ(
  block: CreativeCompositionBlock,
  groupId: string,
  command: "backward" | "forward" | "back" | "front",
): CreativeCompositionBlock {
  const record = compositionGroupRecord(block, groupId);
  if (!record) return block;
  const siblings = block.nodes.filter((node) => (node.parentId ?? null) === record.parentId);
  const emitted = new Set<string>();
  const entries: Array<{ id: string; kind: "group" | "node"; zIndex: number }> = [];
  for (const node of siblings) {
    if (node.groupId) {
      if (emitted.has(node.groupId)) continue;
      emitted.add(node.groupId);
      const group = compositionGroupRecord(block, node.groupId);
      if (group) entries.push({ id: group.id, kind: "group", zIndex: group.zIndex });
      continue;
    }
    entries.push({ id: node.id, kind: "node", zIndex: node.zIndex });
  }
  entries.sort((a, b) => a.zIndex - b.zIndex);
  const index = entries.findIndex((entry) => entry.id === groupId && entry.kind === "group");
  if (index < 0) return block;
  if (command === "front") entries.push(...entries.splice(index, 1));
  else if (command === "back") entries.unshift(...entries.splice(index, 1));
  else if (command === "forward" && index < entries.length - 1) [entries[index], entries[index + 1]] = [entries[index + 1], entries[index]];
  else if (command === "backward" && index > 0) [entries[index - 1], entries[index]] = [entries[index], entries[index - 1]];
  const z = new Map(entries.map((entry, order) => [entry.id, order + 1]));
  return {
    ...block,
    groups: (block.groups ?? []).map((group) => group.parentId === record.parentId && z.has(group.id) ? { ...group, zIndex: z.get(group.id)! } : group),
    nodes: block.nodes.map((node) => !node.groupId && (node.parentId ?? null) === record.parentId && z.has(node.id) ? { ...node, zIndex: z.get(node.id)! } : node),
  };
}

/**
 * Updates one canonical Group relationship and, for non-layered policies,
 * rewrites its sibling geometry as a single history-ready transaction.
 */
export function setCompositionGroupSettings(
  nodes: CreativeCompositionNode[],
  groupId: string,
  patch: Partial<CompositionGroupSettings>,
  region: { widthPx: number; heightPx: number },
): CreativeCompositionNode[] {
  const current = readCompositionGroupSettings(nodes, groupId);
  const density = patch.density ?? current.density;
  const preset = density === "custom" ? null : GROUP_DENSITY[density];
  const next: CompositionGroupSettings = {
    layout: patch.layout ?? current.layout,
    density,
    rowGapPx: groupGap(patch.rowGapPx ?? preset?.rowGapPx, current.rowGapPx),
    columnGapPx: groupGap(patch.columnGapPx ?? preset?.columnGapPx, current.columnGapPx),
    internalGapPx: groupGap(patch.internalGapPx ?? preset?.internalGapPx, current.internalGapPx),
  };
  const members = groupMembers(nodes, groupId).sort((left, right) => (left.siblingOrder ?? left.zIndex) - (right.siblingOrder ?? right.zIndex));
  if (!members.length) return nodes;
  const memberSet = new Set(members.map((member) => member.id));
  let arranged = nodes;
  const bounds = computeGroupUnionBounds(nodes, groupId, true);
  if (bounds && next.layout !== "layered") {
    const rowGap = next.rowGapPx / Math.max(1, region.heightPx);
    const columnGap = next.columnGapPx / Math.max(1, region.widthPx);
    const insetX = next.internalGapPx / Math.max(1, region.widthPx);
    const insetY = next.internalGapPx / Math.max(1, region.heightPx);
    const boundedLeft = Math.max(0, Math.min(1, bounds.left));
    const boundedTop = Math.max(0, Math.min(1, bounds.top));
    const boundedWidth = Math.max(.08, Math.min(1 - boundedLeft, bounds.width));
    const contentWidth = Math.max(.04, boundedWidth - insetX * 2);
    const columns = next.layout === "grid" ? Math.min(2, members.length) : next.layout === "flow_horizontal" ? members.length : 1;
    const memberWidth = next.layout === "flow_vertical"
      ? contentWidth
      : Math.max(.04, (contentWidth - columnGap * Math.max(0, columns - 1)) / Math.max(1, columns));
    const reflowWidths = new Map(members.map((member) => [member.id, memberWidth] as const));
    const reflowHeights = new Map(members.map((member) => {
      if (!member.moduleComposition?.signatureAssembly) return [member.id, member.height] as const;
      const canonicalPhoneHeight = Number(member.moduleComposition.pageHeightPx ?? member.minHeightPx ?? 44);
      const physicalHeight = memberWidth * region.widthPx * canonicalPhoneHeight / 390;
      return [member.id, Math.max(44, physicalHeight) / Math.max(1, region.heightPx)] as const;
    }));
    const rowHeights: number[] = [];
    if (next.layout === "grid") {
      for (let row = 0; row < Math.ceil(members.length / columns); row += 1) {
        rowHeights[row] = Math.max(...members.slice(row * columns, row * columns + columns).map((member) => reflowHeights.get(member.id) ?? member.height));
      }
    }
    const positions = new Map<string, { x: number; y: number }>();
    let cursorX = boundedLeft + insetX;
    let cursorY = boundedTop + insetY;
    members.forEach((member, index) => {
      if (next.layout === "flow_vertical") {
        positions.set(member.id, { x: boundedLeft + insetX, y: cursorY });
        cursorY += (reflowHeights.get(member.id) ?? member.height) + rowGap;
      } else if (next.layout === "flow_horizontal") {
        positions.set(member.id, { x: cursorX, y: boundedTop + insetY });
        cursorX += memberWidth + columnGap;
      } else {
        const column = index % columns;
        const row = Math.floor(index / columns);
        const x = boundedLeft + insetX + column * (memberWidth + columnGap);
        const y = boundedTop + insetY + rowHeights.slice(0, row).reduce((value, height) => value + height + rowGap, 0);
        positions.set(member.id, { x, y });
      }
    });
    arranged = nodes.map((node) => positions.has(node.id) ? {
      ...node,
      ...positions.get(node.id)!,
      width: reflowWidths.get(node.id) ?? node.width,
      height: reflowHeights.get(node.id) ?? node.height,
    } : node);
  }
  return arranged.map((node) => memberSet.has(node.id) ? {
    ...node,
    props: {
      ...node.props,
      compositionGroupLayout: next.layout,
      compositionGroupDensityMode: next.density,
      compositionGroupRowGapPx: next.rowGapPx,
      compositionGroupColumnGapPx: next.columnGapPx,
      compositionGroupInternalGapPx: next.internalGapPx,
    },
  } : node);
}

/** Map a family to the Material/Effect adapter target used for fan-out. */
export function appearanceAdapterTargetForFamily(
  family: ObjectFamily
): "glyph" | "icon_artwork" | "surface" {
  if (family === "text") return "glyph";
  if (family === "icon") return "icon_artwork";
  return "surface";
}

export type MixedValue<T> =
  | { kind: "uniform"; value: T }
  | { kind: "mixed" }
  | { kind: "empty" };

export function groupMembers(
  nodes: readonly CreativeCompositionNode[],
  groupId: string
): CreativeCompositionNode[] {
  return nodes.filter((node) => node.groupId === groupId && isTrueGroupMember(node));
}

export function resolveActiveGroupId(
  nodes: readonly CreativeCompositionNode[],
  selectedIds: readonly string[]
): string | null {
  const expanded = expandSelectionToGroups([...nodes], [...selectedIds]);
  const members = nodes.filter((node) => expanded.includes(node.id) && isTrueGroupMember(node));
  if (members.length < 2) return null;
  const groupId = members[0]?.groupId;
  if (!groupId) return null;
  const same = members.every((node) => node.groupId === groupId);
  if (!same) return null;
  // Parent mode: selection must cover the full group (or be expandable to it).
  const full = groupMembers(nodes, groupId);
  if (full.length < 2) return null;
  const selectedSet = new Set(expanded);
  if (!full.every((node) => selectedSet.has(node.id))) return null;
  return groupId;
}

export function isGroupParentSelection(
  nodes: readonly CreativeCompositionNode[],
  selectedIds: readonly string[]
): boolean {
  const groupId = resolveActiveGroupId(nodes, selectedIds);
  if (!groupId) return false;
  // Content scope (awaiting child or editing one) is never Group parent chrome.
  if (isGroupContentScope(nodes, groupId)) return false;
  // Content editing of a group child: only one member selected and flagged.
  if (selectedIds.length === 1) {
    const only = nodes.find((node) => node.id === selectedIds[0]);
    if (only?.props.groupContentEditing === true) return false;
  }
  return true;
}

export function isGroupContentEditing(
  nodes: readonly CreativeCompositionNode[],
  selectedIds: readonly string[]
): boolean {
  if (selectedIds.length !== 1) return false;
  const only = nodes.find((node) => node.id === selectedIds[0]);
  return Boolean(only?.groupId && only.props.groupContentEditing === true);
}

/** Group is in Edit Contents scope — Owner may or may not have chosen a child yet. */
export function isGroupContentScope(
  nodes: readonly CreativeCompositionNode[],
  groupId: string | null | undefined
): boolean {
  if (!groupId) return false;
  return groupMembers(nodes, groupId).some((node) => node.props.groupContentScope === true);
}

/**
 * Enter Group content mode WITHOUT selecting a child.
 * Group boundary stays subdued; Owner clicks the child they want.
 */
export function enterGroupContentMode(
  nodes: CreativeCompositionNode[],
  groupId: string
): CreativeCompositionNode[] {
  return nodes.map((node) => {
    if (node.groupId !== groupId || !isTrueGroupMember(node)) return node;
    const props: Record<string, unknown> = { ...node.props, groupContentScope: true };
    delete props.groupContentEditing;
    delete props.contentEditing;
    return { ...node, props };
  });
}

/** Activate one Group child after Owner click inside content scope. */
export function activateGroupContentChild(
  nodes: CreativeCompositionNode[],
  groupId: string,
  childId: string
): CreativeCompositionNode[] {
  return nodes.map((node) => {
    if (node.groupId !== groupId || !isTrueGroupMember(node)) return node;
    if (node.id === childId) {
      return {
        ...node,
        props: {
          ...node.props,
          groupContentScope: true,
          groupContentEditing: true,
          contentEditing: true,
        },
      };
    }
    const props: Record<string, unknown> = { ...node.props, groupContentScope: true };
    delete props.groupContentEditing;
    delete props.contentEditing;
    return { ...node, props };
  });
}

/** Axis-aligned union of member boxes (relative 0–1, pasteboard-aware). */
export function computeGroupUnionBounds(
  nodes: readonly CreativeCompositionNode[],
  groupId: string,
  allowPasteboardOverflow = true
): GroupUnionBounds | null {
  const members = groupMembers(nodes, groupId).filter((node) => node.visible !== false);
  if (!members.length) return null;
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  let rotationSum = 0;
  for (const member of members) {
    // Parent-authority Modules store x/y as their visual top-left. Older
    // freeform nodes use anchor-relative coordinates and still resolve through
    // the legacy box helper. Keeping those models distinct prevents a right
    // anchor from shifting a governed Group one full child width off-Card.
    const box = member.compositionKind
      ? { left: member.x, top: member.y, width: member.width, height: member.height }
      : resolveNodeBox(member, allowPasteboardOverflow);
    const rot = ((member.rotationDeg || 0) * Math.PI) / 180;
    // Approximate transformed AABB from center + half extents.
    const cx = box.left + box.width / 2;
    const cy = box.top + box.height / 2;
    const cos = Math.abs(Math.cos(rot));
    const sin = Math.abs(Math.sin(rot));
    const hw = (box.width * cos + box.height * sin) / 2;
    const hh = (box.width * sin + box.height * cos) / 2;
    left = Math.min(left, cx - hw);
    top = Math.min(top, cy - hh);
    right = Math.max(right, cx + hw);
    bottom = Math.max(bottom, cy + hh);
    rotationSum += member.rotationDeg || 0;
  }
  if (!Number.isFinite(left) || !Number.isFinite(top)) return null;
  return {
    groupId,
    memberIds: members.map((node) => node.id),
    left,
    top,
    width: Math.max(0.02, right - left),
    height: Math.max(0.02, bottom - top),
    rotationDeg: rotationSum / members.length,
  };
}

/** @deprecated Prefer enterGroupContentMode + activateGroupContentChild. Kept for callers that already chose a child. */
export function enterGroupContentEditing(
  nodes: CreativeCompositionNode[],
  groupId: string,
  childId: string
): CreativeCompositionNode[] {
  return activateGroupContentChild(enterGroupContentMode(nodes, groupId), groupId, childId);
}

export function exitGroupContentEditing(
  nodes: CreativeCompositionNode[],
  groupId: string
): CreativeCompositionNode[] {
  return nodes.map((node) => {
    if (node.groupId !== groupId) return node;
    const props = { ...node.props };
    delete props.groupContentEditing;
    delete props.groupContentScope;
    delete props.contentEditing;
    return { ...node, props };
  });
}

/** Scale all group members relative to union origin. One undo-friendly transaction. */
export function resizeGroupComposition(
  nodes: CreativeCompositionNode[],
  groupId: string,
  next: { left: number; top: number; width: number; height: number },
  options?: { minChildWidth?: number; minChildHeight?: number }
): CreativeCompositionNode[] {
  const bounds = computeGroupUnionBounds(nodes, groupId, true);
  if (!bounds || bounds.width <= 0 || bounds.height <= 0) return nodes;
  const sx = next.width / bounds.width;
  const sy = next.height / bounds.height;
  const minW = options?.minChildWidth ?? 0.02;
  const minH = options?.minChildHeight ?? 0.02;
  const memberSet = new Set(bounds.memberIds);

  return nodes.map((node) => {
    if (!memberSet.has(node.id)) return node;
    const relCenterX = (node.x + node.width / 2 - bounds.left) / bounds.width;
    const relCenterY = (node.y + node.height / 2 - bounds.top) / bounds.height;
    const resizePolicy = layeredResizePolicy(node);
    // Curated furniture and video keep their manufactured/media proportions.
    // Text/Button/Divider may change width, but their readable/touch-safe height
    // is not geometrically crushed by a Group envelope resize.
    const governedScale = Math.min(sx, sy);
    const width = Math.max(minW, node.width * (resizePolicy === "governed-aspect" ? governedScale : sx));
    const height = Math.max(minH, node.height * (resizePolicy === "free" ? sy : resizePolicy === "governed-aspect" ? governedScale : 1));
    const x = next.left + relCenterX * next.width - width / 2;
    const y = next.top + relCenterY * next.height - height / 2;
    // Group geometry changes a Text Box frame, never its glyph geometry.
    // Typography is authored independently and reflows inside the new frame.
    return { ...node, x, y, width, height, props: { ...node.props } };
  });
}

/** Rotate group members around the union center. */
export function rotateGroupComposition(
  nodes: CreativeCompositionNode[],
  groupId: string,
  absoluteDeg: number
): CreativeCompositionNode[] {
  const bounds = computeGroupUnionBounds(nodes, groupId, true);
  if (!bounds) return nodes;
  const memberSet = new Set(bounds.memberIds);
  const cx = bounds.left + bounds.width / 2;
  const cy = bounds.top + bounds.height / 2;
  const baseAvg = bounds.rotationDeg;
  const delta = ((absoluteDeg - baseAvg) * Math.PI) / 180;
  const cos = Math.cos(delta);
  const sin = Math.sin(delta);

  return nodes.map((node) => {
    if (!memberSet.has(node.id)) return node;
    const ncx = node.x + node.width / 2;
    const ncy = node.y + node.height / 2;
    const dx = ncx - cx;
    const dy = ncy - cy;
    const rx = dx * cos - dy * sin;
    const ry = dx * sin + dy * cos;
    return {
      ...node,
      x: rx + cx - node.width / 2,
      y: ry + cy - node.height / 2,
      rotationDeg: (node.rotationDeg || 0) + (absoluteDeg - baseAvg),
    };
  });
}

export function moveGroupComposition(
  nodes: CreativeCompositionNode[],
  groupId: string,
  dx: number,
  dy: number
): CreativeCompositionNode[] {
  const members = groupMembers(nodes, groupId);
  return translateNodesOnPasteboard(
    nodes,
    members.map((node) => node.id),
    dx,
    dy
  );
}

export function textDescendantsInScope(
  nodes: readonly CreativeCompositionNode[],
  selectedIds: readonly string[],
  options?: { includeNestedComponentText?: boolean }
): CreativeCompositionNode[] {
  const expanded = expandSelectionToGroups([...nodes], [...selectedIds]);
  const includeNested = options?.includeNestedComponentText === true;
  const out: CreativeCompositionNode[] = [];
  for (const node of nodes) {
    if (!expanded.includes(node.id)) continue;
    const family = objectFamilyForNode(node);
    if (family === "text") {
      out.push(node);
      continue;
    }
    if (!includeNested) continue;
    if (family === "button" || family === "badge" || family === "coupon" || family === "ticket") {
      // Nested text lives in contentComposition for components — surface parent text props too.
      if (typeof node.props.text === "string" || typeof node.props.label === "string") {
        out.push(node);
      }
    }
  }
  return out;
}

export function compatibleDescendants(
  nodes: readonly CreativeCompositionNode[],
  selectedIds: readonly string[],
  capability: FanOutCapability
): CreativeCompositionNode[] {
  const expanded = expandSelectionToGroups([...nodes], [...selectedIds]);
  const selected = nodes.filter((node) => expanded.includes(node.id));

  const familyOk = (family: ObjectFamily): boolean => {
    switch (capability) {
      case "text_color":
      case "font":
      case "font_size":
      case "font_weight":
      case "italic":
      case "underline":
      case "alignment":
      case "line_height":
      case "letter_spacing":
      case "text_content":
        return family === "text" || family === "badge" || family === "button";
      case "effect":
        return (
          family === "text" ||
          family === "icon" ||
          family === "badge" ||
          family === "button" ||
          family === "shape" ||
          family === "coupon" ||
          family === "ticket" ||
          family === "container" ||
          family === "image"
        );
      case "material":
        return (
          family === "text" ||
          family === "icon" ||
          family === "badge" ||
          family === "button" ||
          family === "shape" ||
          family === "coupon" ||
          family === "ticket" ||
          family === "container"
        );
      case "fill":
      case "gradient":
      case "border":
        return (
          family === "badge" ||
          family === "button" ||
          family === "shape" ||
          family === "coupon" ||
          family === "ticket" ||
          family === "container" ||
          family === "image" ||
          family === "logo" ||
          // Text fill/gradient applies to glyph color/gradientFill; border is text-box.
          family === "text" ||
          family === "icon"
        );
      case "motion":
        return family !== "group" && family !== "card_root" && family !== "utility";
      case "opacity":
      case "visibility":
      case "accessibility":
        return family !== "group" && family !== "card_root";
      default:
        return false;
    }
  };

  return selected.filter((node) => familyOk(objectFamilyForNode(node)));
}

export function readCapabilityValue(
  node: CreativeCompositionNode,
  capability: FanOutCapability
): unknown {
  switch (capability) {
    case "text_color":
      return node.props.color ?? node.props.labelColor ?? null;
    case "font":
      return node.props.fontFamily ?? null;
    case "font_size":
      return node.props.fontSize ?? null;
    case "font_weight":
      return node.props.fontWeight ?? null;
    case "italic":
      return node.props.italic === true;
    case "underline":
      return node.props.underline === true;
    case "alignment":
      return node.props.textAlign ?? node.props.align ?? null;
    case "line_height":
      return node.props.lineHeight ?? null;
    case "letter_spacing":
      return node.props.letterSpacingEm ?? node.props.letterSpacing ?? null;
    case "effect":
      return node.props.effectPreset ?? node.props.glyphEffect ?? null;
    case "material":
      return node.props.materialPreset ?? null;
    case "motion":
      return node.props.motionPreset ?? node.props.animation ?? null;
    case "opacity":
      return node.props.opacity ?? 1;
    case "text_content":
      return node.props.text ?? node.props.label ?? null;
    case "fill":
      return node.props.fill ?? node.props.color ?? null;
    case "gradient":
      return node.props.gradientFill ?? node.props.gradientModel ?? null;
    case "border":
      return `${node.props.borderStyle ?? "none"}|${node.props.borderWidth ?? 0}|${node.props.borderColor ?? ""}`;
    case "visibility":
      return node.visible !== false;
    case "accessibility":
      return node.props.accessibleLabel ?? node.props.ariaLabel ?? null;
    default:
      return null;
  }
}

/** Tri-state for boolean formatting (Bold / Italic / Underline). */
export function triStateForCapability(
  nodes: readonly CreativeCompositionNode[],
  selectedIds: readonly string[],
  capability: "italic" | "underline" | "font_weight"
): TriState {
  const targets = compatibleDescendants([...nodes], selectedIds, capability);
  if (!targets.length) return "empty";
  if (capability === "font_weight") {
    const bold = targets.map((node) => Number(node.props.fontWeight || 600) >= 700);
    if (bold.every(Boolean)) return "on";
    if (bold.every((value) => !value)) return "off";
    return "mixed";
  }
  const flags = targets.map((node) => Boolean(readCapabilityValue(node, capability)));
  if (flags.every(Boolean)) return "on";
  if (flags.every((value) => !value)) return "off";
  return "mixed";
}

/**
 * Absolute set-all font size — intentionally normalizes hierarchy.
 * Prefer scaleFontSizes when preserving relative sizes.
 */
export function setAllFontSizes(
  nodes: CreativeCompositionNode[],
  selectedIds: readonly string[],
  fontSize: number
): { nodes: CreativeCompositionNode[]; appliedIds: string[] } {
  const size = Math.max(6, Math.min(320, fontSize));
  return fanOutProps(nodes, selectedIds, "font_size", { fontSize: size });
}

/**
 * Proportional font-size scale — preserves hierarchy (20/30/40 → +10% → 22/33/44).
 */
export function scaleFontSizes(
  nodes: CreativeCompositionNode[],
  selectedIds: readonly string[],
  factor: number
): { nodes: CreativeCompositionNode[]; appliedIds: string[] } {
  const scale = Number.isFinite(factor) && factor > 0 ? factor : 1;
  return fanOutWithAdapter(nodes, selectedIds, "font_size", (node) => {
    const current = Number(node.props.fontSize ?? 18);
    if (!Number.isFinite(current)) return null;
    return {
      ...node.props,
      fontSize: Math.max(6, Math.min(320, Math.round(current * scale * 100) / 100)),
    };
  });
}

/** Appearance scopes present in a Group — Text / Surfaces / Icons only when they exist. */
export function groupAppearanceScopes(
  nodes: readonly CreativeCompositionNode[],
  selectedIds: readonly string[]
): Array<{ scope: "text" | "surfaces" | "icons"; count: number }> {
  const expanded = new Set(
    compatibleDescendants(nodes, selectedIds, "opacity").map((node) => node.id)
  );
  let text = 0;
  let surfaces = 0;
  let icons = 0;
  for (const node of nodes) {
    if (!expanded.has(node.id) && !selectedIds.includes(node.id)) {
      // Also count expanded group members from selection.
    }
  }
  const members = nodes.filter((node) => {
    const ids = compatibleDescendants(nodes, selectedIds, "effect").map((n) => n.id);
    return ids.includes(node.id) || selectedIds.includes(node.id);
  });
  // Prefer full group member set when parent-selected.
  const groupId = resolveActiveGroupId(nodes, selectedIds);
  const pool = groupId ? groupMembers(nodes, groupId) : members;
  for (const node of pool) {
    const family = objectFamilyForNode(node);
    if (family === "text" || family === "badge") text += 1;
    else if (family === "icon") icons += 1;
    else if (
      family === "button" ||
      family === "shape" ||
      family === "coupon" ||
      family === "ticket" ||
      family === "container" ||
      family === "image"
    ) {
      surfaces += 1;
    }
  }
  const scopes: Array<{ scope: "text" | "surfaces" | "icons"; count: number }> = [];
  if (text) scopes.push({ scope: "text", count: text });
  if (surfaces) scopes.push({ scope: "surfaces", count: surfaces });
  if (icons) scopes.push({ scope: "icons", count: icons });
  return scopes;
}

export function mixedValueForCapability(
  nodes: readonly CreativeCompositionNode[],
  selectedIds: readonly string[],
  capability: FanOutCapability
): MixedValue<unknown> {
  const targets = compatibleDescendants([...nodes], selectedIds, capability);
  if (!targets.length) return { kind: "empty" };
  const first = readCapabilityValue(targets[0], capability);
  for (let i = 1; i < targets.length; i += 1) {
    if (readCapabilityValue(targets[i], capability) !== first) {
      return { kind: "mixed" };
    }
  }
  return { kind: "uniform", value: first };
}

/** Apply a prop patch to all compatible descendants. Returns patched nodes. */
export function fanOutProps(
  nodes: CreativeCompositionNode[],
  selectedIds: readonly string[],
  capability: FanOutCapability,
  patch: Record<string, unknown>
): { nodes: CreativeCompositionNode[]; appliedIds: string[]; skipped: number } {
  return fanOutWithAdapter(nodes, selectedIds, capability, (node) => {
    const props = { ...node.props, ...patch };
    const family = objectFamilyForNode(node);
    if (capability === "text_color" && family === "button" && patch.color != null) {
      props.labelColor = patch.color;
    }
    // Solid color must replace visible glyph gradient — otherwise color appears inert.
    if (
      (capability === "text_color" || capability === "fill") &&
      (family === "text" || family === "badge" || family === "button") &&
      (patch.color != null || patch.fill != null || patch.labelColor != null)
    ) {
      if (patch.gradientFill === undefined) {
        delete props.gradientFill;
        delete props.gradientModel;
      }
    }
    // Text fill/gradient maps onto glyph color/gradientFill rather than surface fill.
    if (capability === "fill" && family === "text" && patch.fill != null && patch.color == null) {
      props.color = patch.fill;
      delete props.fill;
    }
    return props;
  });
}

/**
 * Apply a per-descendant adapter so mixed Text+Surface groups never receive
 * the primary node's material/effect keys blindly.
 */
export function fanOutWithAdapter(
  nodes: CreativeCompositionNode[],
  selectedIds: readonly string[],
  capability: FanOutCapability,
  buildProps: (node: CreativeCompositionNode, family: ObjectFamily) => Record<string, unknown> | null
): { nodes: CreativeCompositionNode[]; appliedIds: string[]; skipped: number } {
  const targets = compatibleDescendants(nodes, selectedIds, capability);
  const targetIds = new Set(targets.map((node) => node.id));
  const appliedIds: string[] = [];
  const next = nodes.map((node) => {
    if (!targetIds.has(node.id)) return node;
    const family = objectFamilyForNode(node);
    const props = buildProps(node, family);
    if (!props) return node;
    appliedIds.push(node.id);
    return { ...node, props };
  });
  return {
    nodes: next,
    appliedIds,
    skipped: expandSelectionToGroups(nodes, [...selectedIds]).length - appliedIds.length,
  };
}

/** Infer fan-out capability from a props patch produced by Appearance controls. */
export function inferFanOutCapability(patch: Record<string, unknown>): FanOutCapability | null {
  if (patch.materialPreset !== undefined) return "material";
  if (
    patch.effectPreset !== undefined ||
    patch.glow !== undefined ||
    patch.glowColor !== undefined ||
    patch.boxGlow !== undefined ||
    patch.secondaryGlow !== undefined ||
    patch.coreBrightness !== undefined ||
    patch.edgeWidth !== undefined ||
    patch.auraIntensity !== undefined
  ) {
    return "effect";
  }
  if (patch.fontFamily !== undefined) return "font";
  if (patch.fontSize !== undefined) return "font_size";
  if (patch.fontWeight !== undefined) return "font_weight";
  if (patch.italic !== undefined) return "italic";
  if (patch.underline !== undefined) return "underline";
  if (patch.textAlign !== undefined || patch.align !== undefined) return "alignment";
  if (patch.lineHeight !== undefined) return "line_height";
  if (patch.letterSpacingEm !== undefined || patch.letterSpacing !== undefined) return "letter_spacing";
  if (patch.color !== undefined || patch.labelColor !== undefined || patch.textColor !== undefined) {
    return "text_color";
  }
  if (patch.gradientFill !== undefined || patch.gradientModel !== undefined) return "gradient";
  if (patch.fill !== undefined || patch.surfaceFillKind !== undefined) return "fill";
  if (
    patch.borderWidth !== undefined ||
    patch.borderStyle !== undefined ||
    patch.borderColor !== undefined ||
    patch.radius !== undefined
  ) {
    return "border";
  }
  if (patch.opacity !== undefined || patch.surfaceOpacity !== undefined) return "opacity";
  if (patch.motionPreset !== undefined || patch.animation !== undefined) return "motion";
  if (patch.visible !== undefined) return "visibility";
  if (patch.accessibleLabel !== undefined || patch.ariaLabel !== undefined) return "accessibility";
  return null;
}

export function fanOutScopeLabel(applied: number, total: number): string | null {
  if (total <= 1 || applied <= 0) return null;
  if (applied === total) return null;
  return `Applies to ${applied} of ${total} selected elements`;
}

export function duplicateGroupPreservingMembership(
  nodes: CreativeCompositionNode[],
  ids: string[],
  createId: () => string,
  createGroupId: () => string
): { nodes: CreativeCompositionNode[]; newIds: string[] } {
  const expanded = expandSelectionToGroups(nodes, ids);
  const set = new Set(expanded);
  const maxZ = nodes.reduce((m, n) => Math.max(m, n.zIndex), 0);
  const groupMap = new Map<string, string>();
  const newIds: string[] = [];
  const clones: CreativeCompositionNode[] = [];
  let z = maxZ;
  for (const n of nodes) {
    if (!set.has(n.id) || n.locked) continue;
    z += 1;
    const id = createId();
    newIds.push(id);
    let groupId = n.groupId ?? null;
    if (groupId && isTrueGroupMember(n)) {
      if (!groupMap.has(groupId)) groupMap.set(groupId, createGroupId());
      groupId = groupMap.get(groupId)!;
    }
    clones.push({
      ...n,
      id,
      x: Math.min(0.92, n.x + 0.04),
      y: Math.min(0.92, n.y + 0.04),
      zIndex: z,
      locked: false,
      groupId,
      props: { ...n.props },
    });
  }
  return { nodes: [...nodes, ...clones], newIds };
}
