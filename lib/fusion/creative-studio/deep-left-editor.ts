/**
 * Deep left editor — hierarchical route stack.
 * Library and edit modes are mutually exclusive in the permanent left drawer.
 */

import type { SelectionRef } from "./selection-ref";

export type DeepLeftEditorMode = "library" | "edit";

export type DeepLeftNestedPage =
  | "home"
  | "overview"
  | "solid-colors"
  | "gradient-colors"
  | "photo-colors"
  | "custom-color"
  | "design-colors"
  | "brand-colors"
  | "recent-colors"
  | "all-gradients"
  | "font-catalog"
  | "icon-catalog"
  | "recommended"
  | "search-results"
  | "recent"
  | "favorites"
  | "collection"
  | "change-icon"
  | "flat"
  | "raised"
  | "recessed"
  | "glass"
  | "metallic"
  | "enamel"
  | "neon"
  | "effects"
  | "texture"
  | "custom"
  | "style"
  | "width"
  | "color"
  | "radius";

export type DeepEditorCapability =
  | "color"
  | "gradient"
  | "icon"
  | "material"
  | "border"
  | "font"
  | "surface"
  | "appearance"
  | "action"
  | "animate"
  | "position"
  | "content"
  | "shape"
  | string;

export type DeepEditorRoute = {
  routeId: string;
  target: SelectionRef | null;
  capability: DeepEditorCapability;
  page: DeepLeftNestedPage;
  title: string;
  parentRouteId: string | null;
  dataSource: string;
};

export type DeepLeftEditorSession = {
  mode: DeepLeftEditorMode;
  /** Registry / toolbar focus section id when mode === "edit". */
  section: string | null;
  /** Current leaf page — mirrors routeStack top for compatibility. */
  nestedPage: DeepLeftNestedPage;
  /** Explicit hierarchical stack. */
  routeStack: DeepEditorRoute[];
  previousLibraryTool: string;
  targetLabel: string;
  capabilityLabel: string;
  selectionGeneration: number;
  selectionRef: SelectionRef | null;
};

export const INITIAL_DEEP_LEFT_SESSION: DeepLeftEditorSession = {
  mode: "library",
  section: null,
  nestedPage: "home",
  routeStack: [],
  previousLibraryTool: "templates",
  targetLabel: "",
  capabilityLabel: "",
  selectionGeneration: 0,
  selectionRef: null,
};

function routeIdFor(capability: string, page: DeepLeftNestedPage, generation: number): string {
  return `${capability}:${page}:${generation}:${Math.random().toString(36).slice(2, 8)}`;
}

export function openDeepLeftEdit(
  current: DeepLeftEditorSession,
  input: {
    section: string;
    targetLabel: string;
    capabilityLabel: string;
    previousLibraryTool: string;
    selectionGeneration: number;
    selectionRef?: SelectionRef | null;
    page?: DeepLeftNestedPage;
  }
): DeepLeftEditorSession {
  // Same section already open — retarget labels/ref without wiping nested routes.
  if (current.mode === "edit" && current.section === input.section && !input.page) {
    return {
      ...current,
      previousLibraryTool: current.previousLibraryTool || input.previousLibraryTool,
      targetLabel: input.targetLabel,
      capabilityLabel: input.capabilityLabel,
      selectionGeneration: input.selectionGeneration,
      selectionRef: input.selectionRef ?? current.selectionRef,
      routeStack: current.routeStack.map((route) => ({
        ...route,
        target: input.selectionRef ?? route.target,
      })),
    };
  }
  const page = input.page || "home";
  const rootRoute: DeepEditorRoute = {
    routeId: routeIdFor(input.section, page, input.selectionGeneration),
    target: input.selectionRef ?? null,
    capability: input.section,
    page,
    title: input.capabilityLabel || input.section,
    parentRouteId: null,
    dataSource: input.section,
  };
  return {
    mode: "edit",
    section: input.section,
    nestedPage: page,
    routeStack: [rootRoute],
    previousLibraryTool: current.mode === "edit" ? current.previousLibraryTool : input.previousLibraryTool,
    targetLabel: input.targetLabel,
    capabilityLabel: input.capabilityLabel,
    selectionGeneration: input.selectionGeneration,
    selectionRef: input.selectionRef ?? null,
  };
}

export function pushDeepLeftRoute(
  current: DeepLeftEditorSession,
  input: {
    page: DeepLeftNestedPage;
    title: string;
    dataSource?: string;
    capability?: DeepEditorCapability;
  }
): DeepLeftEditorSession {
  if (current.mode !== "edit" || !current.section) return current;
  const parent = current.routeStack[current.routeStack.length - 1] || null;
  const route: DeepEditorRoute = {
    routeId: routeIdFor(input.capability || current.section, input.page, current.selectionGeneration),
    target: current.selectionRef,
    capability: input.capability || current.section,
    page: input.page,
    title: input.title,
    parentRouteId: parent?.routeId ?? null,
    dataSource: input.dataSource || input.page,
  };
  return {
    ...current,
    nestedPage: input.page,
    routeStack: [...current.routeStack, route],
  };
}

/** Compatibility: set nested page by pushing (or replacing home child). */
export function setDeepLeftNestedPage(
  current: DeepLeftEditorSession,
  page: DeepLeftNestedPage
): DeepLeftEditorSession {
  if (current.mode !== "edit") return current;
  if (page === "home" || page === "overview") {
    const root = current.routeStack[0];
    if (!root) return { ...current, nestedPage: "home", routeStack: [] };
    return {
      ...current,
      nestedPage: "home",
      routeStack: [{ ...root, page: "home" }],
    };
  }
  const titles: Partial<Record<DeepLeftNestedPage, string>> = {
    // Appearance Fill uses solid-colors; Color library uses the same page via explicit push titles.
    "solid-colors": current.capabilityLabel === "Appearance" || current.section === "appearance" || current.section === "effects"
      ? "Fill"
      : "Default solid colors",
    "gradient-colors": current.capabilityLabel === "Appearance" || current.section === "appearance" || current.section === "effects"
      ? "Gradient"
      : "Default gradient colors",
    "photo-colors": "Photo colors",
    "custom-color": "Custom color",
    "design-colors": "Colors in this design",
    "brand-colors": "Brand colors",
    "recent-colors": "Recent colors",
    "all-gradients": "All gradients",
    "change-icon": "Change Icon",
    effects: "Effects",
    neon: "Effects",
    metallic: "Material",
    raised: "Material",
    glass: "Material",
    texture: "Material",
    flat: "Material",
    recessed: "Material",
    enamel: "Material",
    style: "Border",
    width: "Border",
    color: "Border",
    radius: "Border",
    recommended: "Recommended",
    "search-results": "Search results",
  };
  return pushDeepLeftRoute(current, {
    page,
    title: titles[page] || page,
  });
}

export function deepLeftGoBack(current: DeepLeftEditorSession): DeepLeftEditorSession {
  if (current.mode === "edit" && current.routeStack.length > 1) {
    const nextStack = current.routeStack.slice(0, -1);
    const top = nextStack[nextStack.length - 1]!;
    return {
      ...current,
      routeStack: nextStack,
      nestedPage: top.page,
    };
  }
  if (current.mode === "edit" && current.nestedPage !== "home" && current.nestedPage !== "overview") {
    return { ...current, nestedPage: "home", routeStack: current.routeStack.slice(0, 1).map((route) => ({ ...route, page: "home" as const })) };
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

export function retargetDeepLeftEdit(
  current: DeepLeftEditorSession,
  input: {
    targetLabel: string;
    selectionGeneration: number;
    selectionRef: SelectionRef | null;
    supportsCapability: boolean;
  }
): DeepLeftEditorSession {
  if (current.mode !== "edit") return current;
  if (!input.supportsCapability) return closeDeepLeftEdit(current);
  return {
    ...current,
    targetLabel: input.targetLabel,
    selectionGeneration: input.selectionGeneration,
    selectionRef: input.selectionRef,
    routeStack: current.routeStack.map((route) => ({
      ...route,
      target: input.selectionRef,
    })),
  };
}

export function deepLeftHeader(session: DeepLeftEditorSession): string {
  if (session.mode !== "edit" || !session.section) return "";
  const capability = session.capabilityLabel || session.section;
  const top = session.routeStack[session.routeStack.length - 1];
  if (top && top.page !== "home" && top.page !== "overview") {
    return session.targetLabel
      ? `${session.targetLabel} / ${capability} / ${top.title}`
      : `${capability} / ${top.title}`;
  }
  return session.targetLabel ? `${session.targetLabel} / ${capability}` : capability;
}

export function currentDeepLeftRoute(session: DeepLeftEditorSession): DeepEditorRoute | null {
  return session.routeStack[session.routeStack.length - 1] || null;
}
