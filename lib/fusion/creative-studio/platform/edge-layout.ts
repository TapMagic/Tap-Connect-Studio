import type { CreativeCompositionBlock } from "../composition";

export const STUDIO_EDGE_LAYOUT_CONTRACT = "studioEdgeLayout@1.0.0" as const;

export type StudioEdgeMode = "contained" | "inset" | "full_bleed";

export const STUDIO_EDGE_MODES: readonly Readonly<{
  id: StudioEdgeMode;
  label: string;
  description: string;
}>[] = [
  { id: "contained", label: "Contained", description: "Keep the surface inside the content bounds." },
  { id: "inset", label: "Inset", description: "Add intentional space around the surface." },
  { id: "full_bleed", label: "Full bleed", description: "Extend the surface to the available Card edge." },
];

export function readCardEdgeMode(block: CreativeCompositionBlock): StudioEdgeMode {
  return block.edgeLayout?.mode ?? "full_bleed";
}

export function setCardEdgeMode(block: CreativeCompositionBlock, mode: StudioEdgeMode): CreativeCompositionBlock {
  return { ...block, edgeLayout: { version: 1, mode } };
}

export function readContainerEdgeMode(props: Readonly<Record<string, unknown>>): StudioEdgeMode {
  const mode = props.edgeMode;
  return mode === "inset" || mode === "full_bleed" ? mode : "contained";
}

export function setContainerEdgeMode(
  props: Readonly<Record<string, unknown>>,
  mode: StudioEdgeMode,
): Record<string, unknown> {
  return { ...props, edgeMode: mode };
}
