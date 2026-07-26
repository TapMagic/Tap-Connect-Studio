"use client";

import { useId, useMemo, useState } from "react";
import { AlertTriangle, Check, Copy, FileCode2, RotateCcw, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  validateJourney,
  type JourneyDefinition,
} from "@/lib/fusion/journey";

/**
 * Advanced → Developer definition.
 * Collapsed by default. Never the primary host authoring surface.
 */
export function DeveloperDefinitionPanel({
  definition,
  onApply,
  className,
}: {
  definition: JourneyDefinition;
  onApply: (next: JourneyDefinition) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [priorValid, setPriorValid] = useState<JourneyDefinition | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [pendingImport, setPendingImport] = useState<JourneyDefinition | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const panelId = useId();

  const serialized = useMemo(() => JSON.stringify(definition, null, 2), [definition]);

  function openPanel() {
    setDraft(serialized);
    setPriorValid(definition);
    setParseError(null);
    setPendingImport(null);
    setOpen(true);
  }

  function validateText(text: string): { ok: true; value: JourneyDefinition } | { ok: false; error: string } {
    try {
      const parsed = JSON.parse(text) as JourneyDefinition;
      if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
        return { ok: false, error: "Definition must include nodes[] and edges[]" };
      }
      const issues = validateJourney(parsed).filter((i) => i.severity === "error");
      if (issues.length) {
        return { ok: false, error: issues.map((i) => i.message).join("; ") };
      }
      return { ok: true, value: parsed };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Invalid JSON" };
    }
  }

  function onDraftChange(text: string) {
    setDraft(text);
    const result = validateText(text);
    setParseError(result.ok ? null : result.error);
    setPendingImport(null);
  }

  function copyJson() {
    void navigator.clipboard.writeText(serialized);
    setMessage("Copied definition JSON");
  }

  function prepareImport() {
    const result = validateText(draft);
    if (!result.ok) {
      setParseError(result.error);
      return;
    }
    setPendingImport(result.value);
    setMessage("Review the comparison, then Apply import — nothing overwritten yet.");
  }

  function applyImport() {
    if (!pendingImport) return;
    setPriorValid(definition);
    onApply(pendingImport);
    setPendingImport(null);
    setMessage("Import applied. Use Restore prior if you need to undo.");
  }

  function restorePrior() {
    if (!priorValid) {
      setMessage("No prior valid definition stored");
      return;
    }
    onApply(priorValid);
    setDraft(JSON.stringify(priorValid, null, 2));
    setPendingImport(null);
    setParseError(null);
    setMessage("Restored prior valid definition");
  }

  return (
    <div
      className={cn("rounded-xl border border-amber-500/25 bg-amber-500/5", className)}
      data-testid="developer-definition-panel"
    >
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => (open ? setOpen(false) : openPanel())}
        data-testid="developer-definition-toggle"
      >
        <span className="flex items-center gap-2">
          <FileCode2 className="h-4 w-4 text-amber-200/80" aria-hidden />
          <span>
            <span className="block text-sm font-semibold text-amber-100">
              Advanced · Developer definition
            </span>
            <span className="block text-[11px] text-amber-100/55">
              Raw Journey JSON — for debugging and import/export only. Primary editing stays visual.
            </span>
          </span>
        </span>
        <span className="text-xs text-amber-100/60">{open ? "Collapse" : "Open"}</span>
      </button>

      {open ? (
        <div id={panelId} className="space-y-3 border-t border-amber-500/20 px-4 py-4">
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" className="gap-1" onClick={copyJson}>
              <Copy className="h-3.5 w-3.5" />
              Copy / export
            </Button>
            <Button type="button" size="sm" variant="secondary" className="gap-1" onClick={prepareImport}>
              <Upload className="h-3.5 w-3.5" />
              Validate import
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1"
              disabled={!priorValid}
              onClick={restorePrior}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restore prior valid
            </Button>
          </div>

          <div className="space-y-1">
            <Label htmlFor="journey-definition-json" className="text-xs text-amber-100/70">
              Definition JSON
            </Label>
            <textarea
              id="journey-definition-json"
              data-testid="journey-definition-json"
              className="min-h-[180px] w-full rounded-lg border border-amber-500/30 bg-black/40 px-3 py-2 font-mono text-[11px] text-amber-50/90 outline-none focus-visible:ring-2 focus-visible:ring-amber-400/40"
              value={draft}
              onChange={(e) => onDraftChange(e.target.value)}
              spellCheck={false}
            />
            {parseError ? (
              <p className="flex items-start gap-1.5 text-xs text-red-300" role="alert">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {parseError}
              </p>
            ) : (
              <p className="flex items-center gap-1.5 text-xs text-emerald-300/80">
                <Check className="h-3.5 w-3.5" />
                Syntax valid
              </p>
            )}
          </div>

          {pendingImport ? (
            <div
              className="rounded-lg border border-amber-400/40 bg-black/30 p-3"
              data-testid="developer-definition-compare"
            >
              <p className="text-sm font-medium text-amber-50">Compare before applying</p>
              <p className="mt-1 text-xs text-amber-100/60">
                Current: {definition.nodes.length} nodes / {definition.edges.length} edges → Import:{" "}
                {pendingImport.nodes.length} nodes / {pendingImport.edges.length} edges. Name: “
                {definition.name}” → “{pendingImport.name}”.
              </p>
              <p className="mt-2 text-[11px] text-amber-100/50">
                Applying will replace the visual journey. This is never silent — confirm below.
              </p>
              <div className="mt-3 flex gap-2">
                <Button type="button" size="sm" onClick={applyImport} data-testid="developer-definition-apply">
                  Apply import
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setPendingImport(null)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : null}

          {message ? (
            <p className="text-xs text-amber-100/70" role="status">
              {message}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
