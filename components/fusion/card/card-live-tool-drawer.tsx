"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { CardShellToolDrawer } from "@/components/fusion/card/card-shell-tool-drawer";
import {
  getCardEditorLive,
  subscribeCardEditorLive,
} from "@/components/fusion/card/card-editor-live";

export function CardLiveToolDrawer({
  toolId,
  onCloseTool,
  onRequestTool,
  appearanceInitialLevel,
}: {
  toolId: string;
  onCloseTool?: () => void;
  onRequestTool?: (toolId: string) => void;
  appearanceInitialLevel?: "root" | "colors" | "brand" | "layout" | "segment";
}): ReactNode {
  const model = useSyncExternalStore(
    subscribeCardEditorLive,
    getCardEditorLive,
    getCardEditorLive
  );

  if (!model) {
    return (
      <p className="text-xs text-white/45" data-testid="card-drawer-loading">
        Loading Card tools…
      </p>
    );
  }

  return (
    <CardShellToolDrawer
      toolId={toolId}
      {...model}
      onCloseTool={onCloseTool ?? model.onCloseTool}
      onRequestTool={onRequestTool}
      appearanceInitialLevel={appearanceInitialLevel}
    />
  );
}
