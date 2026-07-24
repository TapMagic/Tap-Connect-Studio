"use client";

import { useState } from "react";
import { Layers, Move } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  emptyFreeformManifest,
  freeformToStructuredSections,
  type FreeformManifest,
  type FreeformNode,
} from "@/lib/fusion/blocks/freeform";
import { cn } from "@/lib/utils";

type Props = {
  enabled: boolean;
  sectionLabels: { id: string; label: string }[];
  onConvertToStructured?: (orderedIds: string[]) => void;
};

/**
 * Advanced Freeform Canvas scaffold — feature-gated.
 * Compiles to bounded manifests; no raw HTML/CSS/JS for ordinary users.
 */
export function FreeformCanvasPanel({
  enabled,
  sectionLabels,
  onConvertToStructured,
}: Props) {
  const [manifest, setManifest] = useState<FreeformManifest>(() => {
    const base = emptyFreeformManifest();
    base.nodes = sectionLabels.map((s, i) => ({
      id: s.id,
      blockLibraryId: `card.${s.label}`,
      x: 24,
      y: 24 + i * 88,
      width: 342,
      height: 72,
      zIndex: i + 1,
      props: { label: s.label },
    }));
    return base;
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (!enabled) {
    return (
      <div
        className="rounded-xl border border-dashed border-border/60 p-4 text-xs text-muted-foreground"
        data-testid="freeform-honest-disabled"
        role="status"
      >
        Freeform canvas is honestly disabled until{" "}
        <code className="font-mono">card.builder.freeform</code> is enabled in Platform Admin.
        Structured Card Builder remains the live WYSIWYG path.
      </div>
    );
  }

  function moveSelected(dx: number, dy: number) {
    if (!selectedId) return;
    setManifest((m) => ({
      ...m,
      nodes: m.nodes.map((n) =>
        n.id === selectedId ? { ...n, x: Math.max(0, n.x + dx), y: Math.max(0, n.y + dy) } : n
      ),
    }));
  }

  function convert() {
    const { order } = freeformToStructuredSections(manifest);
    onConvertToStructured?.(order);
  }

  const selected: FreeformNode | undefined = manifest.nodes.find((n) => n.id === selectedId);

  return (
    <div className="space-y-3 rounded-xl border border-border/60 bg-card/30 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" />
          <div>
            <p className="text-sm font-semibold">Freeform canvas</p>
            <p className="text-[11px] text-muted-foreground">
              Expert layout · snap later · converts to structured stack
            </p>
          </div>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={convert}>
          Convert to structured
        </Button>
      </div>

      <div
        className="relative mx-auto overflow-hidden rounded-2xl border border-primary/30 bg-[#0b0f19] shadow-[0_0_24px_rgba(114,255,138,0.12)]"
        style={{ width: manifest.width, height: Math.min(520, manifest.height), maxWidth: "100%" }}
      >
        {manifest.nodes.map((node) => (
          <button
            key={node.id}
            type="button"
            onClick={() => setSelectedId(node.id)}
            className={cn(
              "absolute rounded-lg border px-2 py-1.5 text-left text-[11px] text-white transition",
              selectedId === node.id
                ? "border-primary bg-primary/20 shadow-[0_0_12px_rgba(114,255,138,0.35)]"
                : "border-white/20 bg-white/10 hover:border-white/40"
            )}
            style={{
              left: node.x,
              top: node.y,
              width: node.width,
              height: node.height,
              zIndex: node.zIndex,
            }}
          >
            <span className="flex items-center gap-1 font-medium">
              <Move className="h-3 w-3 opacity-70" />
              {String(node.props.label ?? node.id)}
            </span>
          </button>
        ))}
      </div>

      {selected ? (
        <div className="grid gap-2 sm:grid-cols-4">
          <div className="space-y-1">
            <Label className="text-[10px]">X</Label>
            <p className="font-mono text-xs">{Math.round(selected.x)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">Y</Label>
            <p className="font-mono text-xs">{Math.round(selected.y)}</p>
          </div>
          <div className="flex items-end gap-1 sm:col-span-2">
            <Button type="button" size="sm" variant="outline" onClick={() => moveSelected(0, -8)}>
              ↑
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => moveSelected(0, 8)}>
              ↓
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => moveSelected(-8, 0)}>
              ←
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => moveSelected(8, 0)}>
              →
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Select a block to nudge position.</p>
      )}
    </div>
  );
}
