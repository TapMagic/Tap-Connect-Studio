/**
 * Group authority — selection chrome, transform, and capability fan-out.
 * Groups remain a peer `groupId` relationship; this module makes them a real
 * editing target without inventing a second Group species.
 */

import type { CreativeCompositionNode } from "./composition";
import {
  expandSelectionToGroups,
  resolveNodeBox,
  translateNodesOnPasteboard,
} from "./composition";
import { objectFamilyForNode, type ObjectFamily } from "./capabilities";
import { isTrueGroupMember } from "./selection-mode";

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
    const box = resolveNodeBox(member, allowPasteboardOverflow);
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
    const relX = (node.x - bounds.left) / bounds.width;
    const relY = (node.y - bounds.top) / bounds.height;
    const width = Math.max(minW, node.width * sx);
    const height = Math.max(minH, node.height * sy);
    const x = next.left + relX * next.width;
    const y = next.top + relY * next.height;
    const nextProps = { ...node.props };
    if (node.primitive === "text") {
      const fontSize = Number(node.props.fontSize ?? 18);
      if (Number.isFinite(fontSize)) {
        nextProps.fontSize = Math.max(6, Math.min(320, fontSize * Math.sqrt(sx * sy)));
      }
    }
    return { ...node, x, y, width, height, props: nextProps };
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
