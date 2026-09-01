export type StudioRailId =
  | "templates"
  | "add"
  | "text"
  | "design"
  | "brand"
  | "assets"
  | "layers";

export type StudioDestinationReadiness = "ready" | "preview" | "disabled" | "hidden";

export type StudioRailDestination = {
  id: StudioRailId;
  label: string;
  description: string;
  icon: "layout-template" | "plus" | "type" | "palette" | "badge" | "image" | "layers";
  defaultReadiness: StudioDestinationReadiness;
};

export const STUDIO_RAIL_DESTINATIONS: readonly StudioRailDestination[] = [
  { id: "templates", label: "Templates", description: "Start from a complete Card structure", icon: "layout-template", defaultReadiness: "disabled" },
  { id: "add", label: "Add", description: "Add components and content", icon: "plus", defaultReadiness: "ready" },
  { id: "text", label: "Text", description: "Add text and writing structures", icon: "type", defaultReadiness: "disabled" },
  { id: "design", label: "Design", description: "Shape the Card’s visual direction", icon: "palette", defaultReadiness: "disabled" },
  { id: "brand", label: "Brand", description: "Use approved Brand resources", icon: "badge", defaultReadiness: "disabled" },
  { id: "assets", label: "Assets", description: "Use uploaded and reusable media", icon: "image", defaultReadiness: "disabled" },
  { id: "layers", label: "Outline", description: "Navigate Card structure, parentage, and flow order", icon: "layers", defaultReadiness: "ready" },
] as const;

export type StudioRailReadinessOverrides = Partial<Record<StudioRailId, StudioDestinationReadiness>>;

export function resolveStudioRail(
  overrides: StudioRailReadinessOverrides = {},
  internalOperator = false
): Array<StudioRailDestination & { readiness: StudioDestinationReadiness; interactive: boolean }> {
  return STUDIO_RAIL_DESTINATIONS.flatMap((destination) => {
    const readiness = overrides[destination.id] ?? destination.defaultReadiness;
    if (readiness === "hidden") return [];
    return [{
      ...destination,
      readiness,
      interactive: readiness === "ready" || (readiness === "preview" && internalOperator),
    }];
  });
}

export const STUDIO_DESTINATION_READINESS_GATE = [
  "canonical-command-owner",
  "shell-native-surface",
  "loading-empty-error-states",
  "permission-and-unsupported-states",
  "responsive-behavior",
  "demo-worthy-content",
  "save-reload-correctness",
  "accessibility",
  "human-acceptance",
  "no-fake-completeness",
] as const;
