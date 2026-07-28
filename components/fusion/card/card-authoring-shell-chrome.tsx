"use client";

/**
 * @deprecated Card now uses full AdaptiveWorkspaceShell via CardAuthoringWorkspace.
 * Kept as a named export shim so older imports fail loudly in review rather than
 * silently remounting duplicate Command Shade chrome.
 */

export {
  CardAuthoringWorkspace as CardAuthoringShellChrome,
  type CardAuthoringWorkspaceProps as CardAuthoringShellChromeProps,
} from "@/components/fusion/card/card-authoring-workspace";
