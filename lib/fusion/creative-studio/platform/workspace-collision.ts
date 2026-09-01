export const STUDIO_WORKSPACE_COLLISION_CONTRACT = "studioWorkspaceCollision@1.0.0" as const;

export type StudioChromePlacement = "outside-start" | "outside-end" | "edge-start" | "edge-end" | "task-bar";

export function resolveStudioChromePlacement(input: {
  objectTop: number;
  objectBottom: number;
  viewportTop: number;
  viewportBottom: number;
  requiredPx: number;
  inspectorOnEnd: boolean;
}): StudioChromePlacement {
  if (input.objectTop - input.viewportTop >= input.requiredPx) return "outside-start";
  if (input.viewportBottom - input.objectBottom >= input.requiredPx) return "outside-end";
  return input.inspectorOnEnd ? "edge-start" : "edge-end";
}
