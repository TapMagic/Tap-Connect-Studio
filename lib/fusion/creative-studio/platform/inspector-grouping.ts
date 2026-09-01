export type StudioInspectorGroupId =
  | "content"
  | "text"
  | "action"
  | "surface"
  | "edge"
  | "spacing"
  | "position"
  | "responsive"
  | "accessibility"
  | "governance";

export type StudioInspectorGroup = {
  id: StudioInspectorGroupId;
  label: string;
  capability: string;
  semanticState?: "structure" | "governance";
};

export const STUDIO_INSPECTOR_GROUPS: readonly StudioInspectorGroup[] = [
  { id: "content", label: "Content", capability: "edit-content" },
  { id: "text", label: "Text", capability: "edit-text" },
  { id: "action", label: "Action", capability: "edit-action" },
  { id: "surface", label: "Surface", capability: "edit-surface" },
  { id: "edge", label: "Edge", capability: "edit-edge" },
  { id: "spacing", label: "Spacing", capability: "edit-spacing" },
  { id: "position", label: "Position", capability: "position", semanticState: "structure" },
  { id: "responsive", label: "Responsive", capability: "responsive" },
  { id: "accessibility", label: "Accessibility", capability: "accessibility" },
  { id: "governance", label: "Governance", capability: "governed", semanticState: "governance" },
];

export function projectStudioInspectorGroups(capabilities: readonly string[]) {
  const available = new Set(capabilities);
  return STUDIO_INSPECTOR_GROUPS.filter((group) => available.has(group.capability));
}
