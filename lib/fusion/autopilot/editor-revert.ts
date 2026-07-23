/**
 * Client-side revert helpers for Autopilot accept → apply → undo in the campaign editor.
 * Pure functions — no API calls.
 */

import type { ContentBlock } from "@/lib/types/campaign";

export type EditorThemeSnapshot = {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  backgroundImage?: string;
  backgroundOverlayOpacity?: number;
};

export type EditorSnapshot = {
  title: string;
  blocks: ContentBlock[];
  theme?: EditorThemeSnapshot;
};

/** Deep-clone editor state before Autopilot apply */
export function captureEditorSnapshot(input: EditorSnapshot): EditorSnapshot {
  return {
    title: input.title,
    blocks: input.blocks.map((b) => ({
      ...b,
      data: { ...b.data },
      style: b.style ? { ...b.style } : undefined,
    })),
    theme: input.theme ? { ...input.theme } : undefined,
  };
}

/** Restore editor fields from a pre-apply snapshot */
export function revertEditorToSnapshot(snapshot: EditorSnapshot): EditorSnapshot {
  return captureEditorSnapshot(snapshot);
}

/** Whether undo should revert blocks that were applied to the editor */
export function shouldRevertEditorOnUndo(input: {
  previousStatus: string;
  editorWasApplied: boolean;
}): boolean {
  if (!input.editorWasApplied) return false;
  return (
    input.previousStatus === "accepted" ||
    input.previousStatus === "partial" ||
    input.previousStatus === "applied"
  );
}
