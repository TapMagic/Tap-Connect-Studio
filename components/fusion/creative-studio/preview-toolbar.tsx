"use client";

import { Monitor, Smartphone, Tablet } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PREVIEW_VIEWPORT_LABELS,
  type PreviewViewport,
} from "@/lib/fusion/creative-studio/modes";
import { STUDIO_WORDING } from "@/lib/fusion/creative-studio/wording";

export type PreviewToolbarProps = {
  viewport: PreviewViewport;
  onViewportChange: (v: PreviewViewport) => void;
  onLiveDevice: () => void;
  onRefresh?: () => void;
  onCopyLink?: () => void;
  onOpenTab?: () => void;
  onExit: () => void;
  liveDeviceActive?: boolean;
  className?: string;
};

export function PreviewToolbar({
  viewport,
  onViewportChange,
  onLiveDevice,
  onRefresh,
  onCopyLink,
  onOpenTab,
  onExit,
  liveDeviceActive,
  className,
}: PreviewToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 border-b border-white/10 bg-[#0c1018]/95 px-3 py-2",
        className
      )}
      data-testid="preview-toolbar"
      role="toolbar"
      aria-label="Draft preview controls"
    >
      <span className="text-xs font-medium text-amber-200/90" data-testid="preview-mode-badge">
        {STUDIO_WORDING.draftPreview}
      </span>
      {(
        [
          ["desktop", Monitor],
          ["tablet", Tablet],
          ["phone", Smartphone],
        ] as const
      ).map(([id, Icon]) => (
        <button
          key={id}
          type="button"
          aria-pressed={viewport === id}
          aria-label={PREVIEW_VIEWPORT_LABELS[id]}
          data-testid={`preview-viewport-${id}`}
          onClick={() => onViewportChange(id)}
          className={cn(
            "inline-flex min-h-10 items-center gap-1.5 rounded-md border px-2.5 text-xs",
            viewport === id
              ? "border-white/35 bg-white/10 text-white"
              : "border-white/10 text-white/65 hover:bg-white/5"
          )}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden />
          {PREVIEW_VIEWPORT_LABELS[id]}
        </button>
      ))}
      <button
        type="button"
        aria-pressed={Boolean(liveDeviceActive)}
        data-testid="preview-live-device"
        onClick={onLiveDevice}
        className={cn(
          "inline-flex min-h-10 items-center rounded-md border px-2.5 text-xs",
          liveDeviceActive
            ? "border-white/35 bg-white/10 text-white"
            : "border-white/10 text-white/65"
        )}
      >
        Live device
      </button>
      {onRefresh ? (
        <button
          type="button"
          data-testid="preview-refresh"
          className="min-h-10 rounded-md border border-white/10 px-2.5 text-xs text-white/65"
          onClick={onRefresh}
        >
          Refresh preview
        </button>
      ) : null}
      {onCopyLink ? (
        <button
          type="button"
          data-testid="preview-toolbar-copy"
          className="min-h-10 rounded-md border border-white/10 px-2.5 text-xs text-white/65"
          onClick={onCopyLink}
        >
          Copy preview link
        </button>
      ) : null}
      {onOpenTab ? (
        <button
          type="button"
          data-testid="preview-toolbar-open"
          className="min-h-10 rounded-md border border-white/10 px-2.5 text-xs text-white/65"
          onClick={onOpenTab}
        >
          Open in new tab
        </button>
      ) : null}
      <button
        type="button"
        data-testid="preview-exit"
        className="ml-auto min-h-10 rounded-md border border-white/20 px-3 text-xs text-white"
        onClick={onExit}
      >
        {STUDIO_WORDING.exitPreview}
      </button>
    </div>
  );
}
