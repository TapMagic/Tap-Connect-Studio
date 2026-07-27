"use client";

/**
 * Card authoring — Adaptive Workspace Shell V1 second-consumer proof.
 * Uses shared Command Shade for global workspace controls without redesigning
 * the Card builder (outline / canvas / inspector remain builder-owned).
 */

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { CommandShade } from "@/components/fusion/authoring/command-shade";
import {
  applyShadeAction,
  createShellSnapshot,
  resolveCommandShade,
  type WorkspaceShellSnapshot,
} from "@/lib/fusion/authoring/workspace-shell";
import {
  loadWorkspaceShellState,
  saveWorkspaceShellState,
  snapshotToPersisted,
  SESSION_RESTORE_LABEL,
} from "@/lib/fusion/authoring/workspace-shell-persist";
import { ensureDefaultToolRegistries } from "@/lib/fusion/authoring/workspace-tools";

ensureDefaultToolRegistries();

const WORKSPACE_ID = "card-authoring";

export type CardAuthoringShellChromeProps = {
  publicCode?: string | null;
  children: ReactNode;
};

export function CardAuthoringShellChrome({
  publicCode,
  children,
}: CardAuthoringShellChromeProps) {
  const restored = useMemo(() => loadWorkspaceShellState(WORKSPACE_ID), []);
  const [shell, setShell] = useState<WorkspaceShellSnapshot>(() =>
    createShellSnapshot(WORKSPACE_ID, {
      workspaceMode: restored.focusMode ? "focus" : "browse",
      shadePreference: restored.shadePreference,
      priorShadeDisplay: restored.priorShadeDisplay || "open",
      focusMode: restored.focusMode,
      dirty: false,
      saved: true,
    })
  );
  const [sessionRestored] = useState(() => Boolean(restored.sessionDraftRestored));
  const resolved = useMemo(() => resolveCommandShade(shell), [shell]);

  useEffect(() => {
    saveWorkspaceShellState(
      snapshotToPersisted(shell, restored.toolMemory, {
        sessionDraftRestored: sessionRestored,
      })
    );
  }, [shell, restored.toolMemory, sessionRestored]);

  const setPreference = useCallback(
    (preference: "auto" | "pinned_open" | "pinned_collapsed") => {
      setShell((s) => applyShadeAction(s, { type: "set_preference", preference }));
    },
    []
  );

  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-hidden"
      data-testid="card-edit-workspace-host"
      data-escape-authoring="true"
      data-adaptive-shell="v1"
      data-shell-consumer="card-authoring"
    >
      {sessionRestored ? (
        <p className="sr-only" role="status" data-testid="card-session-restore-notice">
          {SESSION_RESTORE_LABEL}
        </p>
      ) : null}

      <CommandShade
        identityLabel="Card editor"
        objectLabel="Outline · live preview · Format — Esc or Done returns to assembly"
        display={resolved.display}
        preference={resolved.preference}
        resolved={resolved}
        dirty={shell.dirty}
        saved={shell.saved}
        focusMode={shell.focusMode}
        onCollapse={() =>
          setShell((s) => applyShadeAction(s, { type: "set_display", display: "collapsed" }))
        }
        onExpand={() =>
          setShell((s) => applyShadeAction(s, { type: "set_display", display: "open" }))
        }
        onPinOpen={() => setPreference("pinned_open")}
        onPinCollapsed={() => setPreference("pinned_collapsed")}
        onAuto={() => setPreference("auto")}
        onFocusToggle={() =>
          setShell((s) =>
            applyShadeAction(s, {
              type: s.focusMode ? "exit_focus" : "enter_focus",
            })
          )
        }
        returnAction={
          <Link
            href="/dashboard/card"
            className="rounded-md border border-white/20 px-2.5 py-1 text-xs text-white/85 hover:bg-white/5"
            data-testid="card-edit-done-link"
          >
            Done editing
          </Link>
        }
        openInNewTab={
          <a
            href="/dashboard/card/edit"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-primary/35 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
            data-testid="card-edit-open-full"
            title="Open this editor in a detached tab"
          >
            Detached tab ↗
          </a>
        }
        previewControls={
          <div
            className="flex flex-wrap items-center gap-2"
            data-testid="card-edit-compact-toolbar"
          >
            <Link
              href="/dashboard/card/preview"
              className="rounded-md border border-white/15 px-2.5 py-1 text-xs text-white/75 hover:bg-white/5"
              data-testid="card-edit-open-preview"
            >
              View-only preview
            </Link>
            {publicCode ? (
              <a
                href={`/t/${publicCode}?public=1`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md border border-white/15 px-2.5 py-1 text-xs text-white/70 hover:bg-white/5"
                data-testid="card-edit-preview-public"
              >
                Open public URL
              </a>
            ) : null}
          </div>
        }
        primaryAction={
          <Link
            href="/dashboard/card"
            className="inline-flex min-h-11 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground"
            data-testid="card-shade-done"
          >
            Done
          </Link>
        }
      />

      <div className="min-h-0 flex-1 overflow-hidden" data-testid="card-builder-host">
        {children}
      </div>
    </div>
  );
}
