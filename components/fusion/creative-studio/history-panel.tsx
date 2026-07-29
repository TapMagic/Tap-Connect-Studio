"use client";

import { NestedPanelShell } from "@/components/fusion/creative-studio/nested-panel-shell";

export type HistoryPanelProps = {
  pastLabels: string[];
  futureLabels: string[];
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onClose?: () => void;
};

export function HistoryPanel({
  pastLabels,
  futureLabels,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onClose,
}: HistoryPanelProps) {
  const recent = [...pastLabels].reverse().slice(0, 40);
  return (
    <NestedPanelShell
      title="History"
      breadcrumbs={["History"]}
      onClose={onClose}
      testId="session-history-panel"
    >
      <div className="mb-3 flex gap-2">
        <button
          type="button"
          className="min-h-10 flex-1 rounded-md border border-white/15 text-xs disabled:opacity-40"
          data-testid="history-panel-undo"
          disabled={!canUndo}
          onClick={onUndo}
        >
          Undo
        </button>
        <button
          type="button"
          className="min-h-10 flex-1 rounded-md border border-white/15 text-xs disabled:opacity-40"
          data-testid="history-panel-redo"
          disabled={!canRedo}
          onClick={onRedo}
        >
          Redo
        </button>
      </div>
      {recent.length === 0 ? (
        <p className="text-sm text-white/50" data-testid="history-empty">
          No edits in this session yet.
        </p>
      ) : (
        <ol className="space-y-1" data-testid="history-entry-list">
          {recent.map((label, i) => (
            <li
              key={`${label}-${i}`}
              className="rounded-md border border-white/10 px-3 py-2 text-xs text-white/80"
              data-testid="history-entry"
            >
              {label}
            </li>
          ))}
        </ol>
      )}
      {futureLabels.length ? (
        <p className="mt-3 text-[11px] text-white/40">
          {futureLabels.length} redo step{futureLabels.length === 1 ? "" : "s"} available
        </p>
      ) : null}
    </NestedPanelShell>
  );
}
