"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  buildDeterministicAskPreview,
  evaluateAskAction,
  type AskProposalPreview,
} from "@/lib/fusion/ask/policy";

const SUGGESTED = [
  "Explain this screen.",
  "Tell me what I should do next.",
  "Show what is missing before publication.",
  "Reword this description to sound warmer.",
  "Organize these images into Collections.",
  "Create alt text for selected images.",
  "Move contact actions to the top.",
];

export function AskTapConnectDrawer({
  workspace,
  selectionLabel,
  aiLive = false,
  onApplyDraft,
  onReject,
  onUndo,
  canUndo = false,
}: {
  workspace: string;
  selectionLabel?: string | null;
  aiLive?: boolean;
  onApplyDraft?: (preview: AskProposalPreview, prompt: string) => void;
  onReject?: () => void;
  onUndo?: () => void;
  canUndo?: boolean;
}) {
  const [prompt, setPrompt] = useState("");
  const [preview, setPreview] = useState<AskProposalPreview | null>(null);
  const [applied, setApplied] = useState(false);

  const readiness = useMemo(() => {
    if (aiLive) return "Live generative help is available for draft proposals.";
    return "Instructional help and deterministic extraction are available. Live generative AI needs credentials.";
  }, [aiLive]);

  function prepare() {
    const next = buildDeterministicAskPreview({
      prompt: prompt.trim() || "Explain this screen.",
      workspace,
      selectionLabel,
      aiLive,
    });
    setPreview(next);
    setApplied(false);
  }

  function apply() {
    if (!preview || preview.blockedAction || !onApplyDraft) return;
    const gate = evaluateAskAction({ action: "draft_transform" });
    if (!gate.allowed) return;
    onApplyDraft(preview, prompt);
    setApplied(true);
  }

  return (
    <div className="space-y-3" data-testid="ask-tapconnect-drawer">
      <div>
        <p className="text-sm font-semibold text-white/95">Ask TapConnect</p>
        <p className="mt-1 text-xs leading-relaxed text-white/55">{readiness}</p>
        <p className="mt-1 text-[11px] text-white/45">
          Context: {workspace}
          {selectionLabel ? ` · ${selectionLabel}` : ""}
        </p>
      </div>

      <label className="block space-y-1">
        <span className="text-[11px] text-white/55">Your request</span>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          data-testid="ask-tapconnect-prompt"
          placeholder="Ask for help, extraction, rewrite, or organization…"
          className="w-full rounded-lg border border-white/12 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/35"
        />
      </label>

      <div className="flex flex-wrap gap-1.5">
        {SUGGESTED.map((s) => (
          <button
            key={s}
            type="button"
            className="rounded-full border border-white/12 px-2.5 py-1 text-[11px] text-white/65 hover:border-white/30 hover:text-white"
            onClick={() => setPrompt(s)}
          >
            {s}
          </button>
        ))}
      </div>

      <Button
        type="button"
        className="w-full"
        data-testid="ask-tapconnect-prepare"
        onClick={prepare}
      >
        Prepare proposal
      </Button>

      {preview ? (
        <div
          className="space-y-2 rounded-lg border border-white/12 bg-white/[0.03] p-3"
          data-testid="ask-tapconnect-preview"
          data-fact-mode={preview.factMode}
        >
          {preview.blockedAction ? (
            <p
              className="text-sm text-[color:var(--studio-status-critical)]"
              data-testid="ask-tapconnect-blocked"
            >
              {preview.blockedReason}
            </p>
          ) : (
            <p className="text-sm text-white/85">Draft proposal ready for review.</p>
          )}
          <div>
            <p className="text-[11px] font-semibold uppercase text-white/45">Used</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-white/65">
              {preview.usedSources.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
          {preview.changes.length > 0 ? (
            <div>
              <p className="text-[11px] font-semibold uppercase text-white/45">Changes</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-white/65">
                {preview.changes.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <div>
            <p className="text-[11px] font-semibold uppercase text-white/45">Uncertain</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-white/65">
              {preview.uncertain.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
          <p className="text-[11px] text-white/45">
            Facts: {preview.factMode} · Scope:{" "}
            {preview.scope === "current_object"
              ? "this object only"
              : "Brand or business (needs confirmation)"}
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              disabled={Boolean(preview.blockedAction) || applied || !onApplyDraft}
              data-testid="ask-tapconnect-apply"
              onClick={apply}
            >
              Apply
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              data-testid="ask-tapconnect-reject"
              onClick={() => {
                setPreview(null);
                setApplied(false);
                onReject?.();
              }}
            >
              Reject
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!canUndo && !applied}
              data-testid="ask-tapconnect-undo"
              onClick={() => onUndo?.()}
            >
              Undo
            </Button>
          </div>
          {!onApplyDraft ? (
            <p className="text-xs text-white/60" data-testid="ask-tapconnect-apply-unavailable">
              Action assistance is being reconnected. You can continue editing directly.
            </p>
          ) : null}
          {applied ? (
            <p className="text-xs text-[color:var(--studio-status-ok)]" data-testid="ask-tapconnect-applied">
              Applied as a reversible draft. Nothing was published or sent.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
