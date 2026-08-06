/**
 * Deep left editor session — library and edit modes are mutually exclusive
 * in the permanent left drawer. Toolbar commands open edit mode; Back restores
 * the previous library tool.
 */

export type DeepLeftEditorMode = "library" | "edit";

export type DeepLeftNestedPage =
  | "home"
  | "solid-colors"
  | "gradient-colors"
  | "photo-colors"
  | "custom-color"
  | "all-gradients"
  | "font-catalog"
  | "icon-catalog";

export type DeepLeftEditorSession = {
  mode: DeepLeftEditorMode;
  /** Registry / toolbar focus section id when mode === "edit". */
  section: string | null;
  nestedPage: DeepLeftNestedPage;
  previousLibraryTool: string;
  targetLabel: string;
  capabilityLabel: string;
  selectionGeneration: number;
};

export const INITIAL_DEEP_LEFT_SESSION: DeepLeftEditorSession = {
  mode: "library",
  section: null,
  nestedPage: "home",
  previousLibraryTool: "templates",
  targetLabel: "",
  capabilityLabel: "",
  selectionGeneration: 0,
};

export function openDeepLeftEdit(
  current: DeepLeftEditorSession,
  input: {
    section: string;
    targetLabel: string;
    capabilityLabel: string;
    previousLibraryTool: string;
    selectionGeneration: number;
  }
): DeepLeftEditorSession {
  return {
    mode: "edit",
    section: input.section,
    nestedPage: "home",
    previousLibraryTool: current.mode === "edit" ? current.previousLibraryTool : input.previousLibraryTool,
    targetLabel: input.targetLabel,
    capabilityLabel: input.capabilityLabel,
    selectionGeneration: input.selectionGeneration,
  };
}

export function deepLeftGoBack(current: DeepLeftEditorSession): DeepLeftEditorSession {
  if (current.mode === "edit" && current.nestedPage !== "home") {
    return { ...current, nestedPage: "home" };
  }
  return {
    ...INITIAL_DEEP_LEFT_SESSION,
    previousLibraryTool: current.previousLibraryTool,
    mode: "library",
  };
}

export function closeDeepLeftEdit(current: DeepLeftEditorSession): DeepLeftEditorSession {
  return {
    ...INITIAL_DEEP_LEFT_SESSION,
    previousLibraryTool: current.previousLibraryTool,
    mode: "library",
  };
}

export function deepLeftHeader(session: DeepLeftEditorSession): string {
  if (session.mode !== "edit" || !session.section) return "";
  const capability = session.capabilityLabel || session.section;
  return session.targetLabel ? `${session.targetLabel} / ${capability}` : capability;
}
