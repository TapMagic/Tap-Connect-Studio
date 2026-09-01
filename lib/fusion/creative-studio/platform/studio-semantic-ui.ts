export type StudioSemanticState = "active" | "structure" | "governance" | "destructive";

export const STUDIO_SEMANTIC_UI = {
  active: { color: "#b8ff2c", cssVariable: "--studio-semantic-active", nonColorCue: "selected or primary" },
  structure: { color: "#8bdcff", cssVariable: "--studio-semantic-structure", nonColorCue: "hierarchy, breadcrumb, or placement icon" },
  governance: { color: "#f0bf62", cssVariable: "--studio-semantic-governance", nonColorCue: "constraint or caution label" },
  destructive: { color: "#fb7185", cssVariable: "--studio-semantic-destructive", nonColorCue: "error or destructive label" },
} as const satisfies Record<StudioSemanticState, { color: string; cssVariable: string; nonColorCue: string }>;

export function studioSemanticState(state: StudioSemanticState) {
  return STUDIO_SEMANTIC_UI[state];
}
