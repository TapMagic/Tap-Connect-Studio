import type { CreativeCompositionBlock, CreativeCompositionNode } from "@/lib/fusion/creative-studio/composition";
import { establishCompositionParentAuthority, insertCompositionModule } from "./composition-parent-authority";

export const CURATED_HOST_COMPATIBILITY_CONTRACT = "curatedHostCompatibility@1.0.0" as const;

export type CuratedHostCompatibilityResult = {
  contractId: typeof CURATED_HOST_COMPATIBILITY_CONTRACT;
  root: CreativeCompositionBlock;
  changed: boolean;
  preservedMemberIds: readonly string[];
  outerNodeId?: string;
};

/**
 * Explicit, lossless compatibility adapter for the invalid historical state
 * where a Card root is also a Curated assembly. Callers decide whether and
 * when the adapted result may be persisted.
 */
export function adaptLegacyRootCuratedAssembly(root: CreativeCompositionBlock): CuratedHostCompatibilityResult {
  const assembly = root.signatureAssembly;
  if (!assembly) return { contractId: CURATED_HOST_COMPATIBILITY_CONTRACT, root, changed: false, preservedMemberIds: [] };
  const recipeId = assembly.input.recipeId;
  const generated = root.nodes.filter((node) =>
    typeof node.props.signatureAssemblyInstanceId === "string"
    && node.props.signatureRecipeId === recipeId,
  );
  if (!generated.length) return { contractId: CURATED_HOST_COMPATIBILITY_CONTRACT, root, changed: false, preservedMemberIds: [] };

  const familyLabel = assembly.input.familyId === "cabinet-noir" ? "Cabinet Noir" : assembly.input.familyId;
  const layoutLabel = assembly.input.layoutMode === "twin-rail" ? "Twin Rail" : assembly.input.layoutMode === "single-stack" ? "Single Stack" : "Standalone Action";
  const outerLabel = `${familyLabel} ${layoutLabel}`;

  const nested: CreativeCompositionBlock = {
    ...root,
    id: `${root.id}:curated`,
    label: outerLabel,
    parentAuthority: undefined,
    nodes: generated.map((node) => ({
      ...node,
      compositionKind: undefined,
      parentId: undefined,
      siblingOrder: undefined,
    })),
  };
  const memberIds = new Set(generated.map((node) => node.id));
  const remaining = root.nodes.filter((node) => !memberIds.has(node.id));
  const flowRoot = establishCompositionParentAuthority({
    ...root,
    label: "Card Surface",
    signatureAssembly: undefined,
    nodes: remaining,
  }, { cardGapPx: root.parentAuthority?.cardGapPx ?? 16 });
  const outerId = `curated-host:root:${root.id}`;
  const outer: CreativeCompositionNode = {
    id: outerId,
    primitive: "frame",
    compositionKind: "module",
    parentId: null,
    siblingOrder: 0,
    x: 0,
    y: 0,
    width: 1,
    height: 1,
    minHeightPx: Math.max(52, nested.pageHeightPx ?? 56),
    zIndex: 1,
    name: outerLabel,
    props: {
      label: outerLabel,
      componentKind: "curated-system",
      elementKind: "curated-system",
      curatedFamilyId: assembly.input.familyId,
      curatedLayoutMode: assembly.input.layoutMode,
    },
    moduleComposition: nested,
  };
  const inserted = insertCompositionModule(flowRoot, outer, null, 0);
  return inserted.ok
    ? { contractId: CURATED_HOST_COMPATIBILITY_CONTRACT, root: inserted.block, changed: true, preservedMemberIds: generated.map((node) => node.id), outerNodeId: outerId }
    : { contractId: CURATED_HOST_COMPATIBILITY_CONTRACT, root, changed: false, preservedMemberIds: [] };
}
