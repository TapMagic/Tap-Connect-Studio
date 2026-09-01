import { INITIAL_STUDIO_DRAWER_STATE, type StudioDrawerState } from "./drawer-controller";
import { INITIAL_STUDIO_WORKSPACE_STATE, type StudioWorkspaceState } from "../platform/adaptive-workspace";

export const STUDIO_RECONSTITUTION_SESSION_KEY = "tapconnect:studio-reconstitution:v2";

export type StudioShellSessionState = {
  version: 2;
  drawer: StudioDrawerState;
  inspectorOpen: boolean;
  assemblyInspectorOpen?: boolean;
  compositionInspectorOpen?: boolean;
  inspectorSection: "content" | "action" | "appearance" | "layout" | "accessibility" | "advanced";
  viewport: "desktop" | "tablet" | "phone";
  adaptiveWorkspace?: StudioWorkspaceState;
};

export const DEFAULT_STUDIO_SHELL_SESSION: StudioShellSessionState = {
  version: 2,
  drawer: INITIAL_STUDIO_DRAWER_STATE,
  inspectorOpen: false,
  assemblyInspectorOpen: false,
  compositionInspectorOpen: false,
  inspectorSection: "content",
  viewport: "desktop",
  adaptiveWorkspace: INITIAL_STUDIO_WORKSPACE_STATE,
};

export function loadStudioShellSession(storage: Pick<Storage, "getItem"> | null): StudioShellSessionState {
  if (!storage) return DEFAULT_STUDIO_SHELL_SESSION;
  try {
    const parsed = JSON.parse(storage.getItem(STUDIO_RECONSTITUTION_SESSION_KEY) || "null") as Partial<StudioShellSessionState> | null;
    if (!parsed || parsed.version !== 2 || !parsed.drawer) return DEFAULT_STUDIO_SHELL_SESSION;
    return {
      ...DEFAULT_STUDIO_SHELL_SESSION,
      ...parsed,
      // Transient task furniture is not resumable document state. A reload or
      // deterministic review entry always starts from coherent Edit; the Card
      // draft remains canonical and independently persisted.
      drawer: INITIAL_STUDIO_DRAWER_STATE,
      inspectorOpen: false,
      assemblyInspectorOpen: false,
      compositionInspectorOpen: false,
      adaptiveWorkspace: INITIAL_STUDIO_WORKSPACE_STATE,
    };
  } catch {
    return DEFAULT_STUDIO_SHELL_SESSION;
  }
}

export function saveStudioShellSession(storage: Pick<Storage, "setItem"> | null, state: StudioShellSessionState) {
  if (!storage) return;
  storage.setItem(STUDIO_RECONSTITUTION_SESSION_KEY, JSON.stringify(state));
}
