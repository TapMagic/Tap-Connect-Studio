import type { CreativeCompositionBlock, CreativeCompositionNode } from "../../lib/fusion/creative-studio/composition";
import { textRoleCanonicalProps } from "../../lib/fusion/creative-studio/platform/text-authoring";

/** Local unpublished acceptance content; no domain identities or production data. */
export function textEditingTruthComposition(layered = false): CreativeCompositionBlock {
  const prefix = layered ? "layer" : "flow";
  const text = (id: string, parentId: string | null, order: number, mode: string, y: number): CreativeCompositionNode => ({
    id: `${prefix}-${id}`, name: `${id} · ${mode}`, primitive: "text", compositionKind: "module", parentId,
    siblingOrder: order, x: .05, y, width: .9, height: .08, rotationDeg: 0, zIndex: order + 1,
    props: { ...textRoleCanonicalProps("free"), text: "MiXeD  Case\t🙂\nSecond line\n", textHeightMode: mode, textMinHeightPx: 96, textFixedHeightPx: 48, textOverflow: "visible", fontFamily: "Arial, sans-serif", color: "#ffffff", boxFill: "#15283c", boxPadding: 8 },
  });
  const container: CreativeCompositionNode = { id: `${prefix}-container`, name: "Nested Layered · padded", primitive: "frame", compositionKind: "container", parentId: null, siblingOrder: 3, x: .05, y: .48, width: .9, height: .48, zIndex: 4, props: { elementKind: "container", componentKind: "container", layout: "layered", layeredHeightPx: 420, padding: 16, fill: "#203327", surfaceTreatment: "solid", borderColor: "#b8ff2c", borderWidth: 1 } };
  return { id: `text-truth-${prefix}`, version: 1, label: "Text Editing Truth", pageHeightPx: 1000, safeAreaPaddingPx: 12, mobileFallback: "scale", parentAuthority: { version: 1, layout: "flow", cardGapPx: 16 }, compositionMode: { version: 1, mode: layered ? "layered" : "flow", layeredHeightPx: 1000 }, nodes: [
    text("Auto", null, 0, "auto", .02), text("Minimum", null, 1, "minimum", .17), text("Fixed", null, 2, "fixed", .34), container,
    text("Nested-Auto", container.id, 0, "auto", .02), text("Nested-Minimum", container.id, 1, "minimum", .3), text("Nested-Fixed", container.id, 2, "fixed", .7),
  ] };
}
