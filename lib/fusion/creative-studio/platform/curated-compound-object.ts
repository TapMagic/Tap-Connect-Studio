import type { CreativeCompositionBlock, CreativeCompositionNode } from "../composition";

/**
 * Family-neutral projection of compiler output into one Host-facing Curated
 * object. Generated children remain renderer inputs; they never become the
 * selection, layer, or direct-manipulation model exposed by Studio.
 */
export const STUDIO_CURATED_COMPOUND_OBJECT_CONTRACT =
  "studioCuratedCompoundObject@1.0.0" as const;

export type StudioCuratedCompoundObject = {
  contractId: typeof STUDIO_CURATED_COMPOUND_OBJECT_CONTRACT;
  instanceId: string;
  blockId: string;
  anchorNodeId: string;
  memberNodeIds: readonly string[];
  familyId?: string;
  label: string;
  bounds: { left: number; top: number; width: number; height: number };
};

function instanceId(node: CreativeCompositionNode): string | null {
  const value = node.props.signatureAssemblyInstanceId;
  return typeof value === "string" && value ? value : null;
}

function isAssemblyOwned(node: CreativeCompositionNode, block: CreativeCompositionBlock): boolean {
  return Boolean(instanceId(node))
    && node.props.signatureRecipeId === block.signatureAssembly?.input.recipeId;
}

export function curatedCompoundObjectForNode(
  block: CreativeCompositionBlock,
  nodeId: string,
): StudioCuratedCompoundObject | null {
  const selected = block.nodes.find((node) => node.id === nodeId);
  if (!selected || !block.signatureAssembly || !isAssemblyOwned(selected, block)) return null;
  const selectedInstanceId = `${block.id}:${block.signatureAssembly.input.recipeId}`;
  const members = block.nodes.filter((node) => isAssemblyOwned(node, block));
  if (!members.length) return null;
  const left = Math.min(...members.map((node) => node.x));
  const top = Math.min(...members.map((node) => node.y));
  const right = Math.max(...members.map((node) => node.x + node.width));
  const bottom = Math.max(...members.map((node) => node.y + node.height));
  const state = block.signatureAssembly;
  return {
    contractId: STUDIO_CURATED_COMPOUND_OBJECT_CONTRACT,
    instanceId: selectedInstanceId,
    blockId: block.id,
    anchorNodeId: members.find((node) => node.props.signatureClassification === "live-action")?.id ?? members[0].id,
    memberNodeIds: members.map((node) => node.id),
    familyId: state.input.familyId,
    label: block.label || "Curated System",
    bounds: { left, top, width: right - left, height: bottom - top },
  };
}

export function curatedCompoundObjects(block: CreativeCompositionBlock): readonly StudioCuratedCompoundObject[] {
  if (block.parentAuthority?.layout === "flow") return [];
  const first = block.nodes.find((node) => isAssemblyOwned(node, block));
  if (!first) return [];
  const compound = curatedCompoundObjectForNode(block, first.id);
  return compound ? [compound] : [];
}

export function hostSelectionNodeId(block: CreativeCompositionBlock, nodeId: string): string {
  return curatedCompoundObjectForNode(block, nodeId)?.anchorNodeId ?? nodeId;
}
