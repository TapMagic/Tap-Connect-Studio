import { nanoid } from "nanoid";
import type { CreativeCompositionNode } from "./composition";

type CompositionClipboard = { nodes: CreativeCompositionNode[]; copiedAt: number };
let clipboard: CompositionClipboard | null = null;
let styleClipboard: Record<string, unknown> | null = null;

export function copyCompositionNodes(nodes: CreativeCompositionNode[], ids: string[]): void {
  const selected = new Set(ids);
  clipboard = { nodes: structuredClone(nodes.filter((node) => selected.has(node.id))), copiedAt: Date.now() };
}

export function pasteCompositionNodes(nodes: CreativeCompositionNode[]): { nodes: CreativeCompositionNode[]; newIds: string[] } {
  if (!clipboard?.nodes.length) return { nodes, newIds: [] };
  const groupIds = new Map<string, string>();
  const pasted = structuredClone(clipboard.nodes).map((node) => {
    const id = `${node.primitive}-${nanoid(8)}`;
    const groupId = node.groupId ? groupIds.get(node.groupId) ?? (() => { const next = `group-${nanoid(8)}`; groupIds.set(node.groupId!, next); return next; })() : null;
    return { ...node, id, groupId, x: node.x + 0.03, y: node.y + 0.03, zIndex: Math.max(0, ...nodes.map((candidate) => candidate.zIndex)) + 1 };
  });
  return { nodes: [...nodes, ...pasted], newIds: pasted.map((node) => node.id) };
}

export function copyCompositionNodeStyle(node: CreativeCompositionNode): void {
  const excluded = new Set(["text", "label", "description", "showLabel", "showDescription", "icon", "href", "src", "alt", "accessibleLabel", "trackingName", "actionType", "locationId", "address"]);
  styleClipboard = Object.fromEntries(Object.entries(structuredClone(node.props)).filter(([key]) => !excluded.has(key)));
}

export function pasteCompositionNodeStyle(nodes: CreativeCompositionNode[], id: string): CreativeCompositionNode[] {
  if (!styleClipboard) return nodes;
  return nodes.map((node) => node.id === id ? { ...node, props: { ...node.props, ...structuredClone(styleClipboard) } } : node);
}

export function hasCompositionClipboard(): boolean { return Boolean(clipboard?.nodes.length); }
export function hasCompositionStyleClipboard(): boolean { return Boolean(styleClipboard); }

export function resetCompositionClipboardForTests(): void { clipboard = null; styleClipboard = null; }
