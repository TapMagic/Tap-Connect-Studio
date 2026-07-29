"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FONT_CATALOG,
  fontCssStack,
  getFontById,
} from "@/lib/fusion/creative-studio/fonts/catalog";
import { ensureFontLoaded, readRecentFonts } from "@/lib/fusion/creative-studio/fonts/load";
import { NestedPanelShell } from "@/components/fusion/creative-studio/nested-panel-shell";
import { ptToPx } from "@/lib/fusion/creative-studio/fonts/points";

export type FontComparisonProps = {
  sampleText: string;
  pointSize?: number;
  candidateIds?: string[];
  onPick: (fontId: string) => void;
  onClose?: () => void;
  onBack?: () => void;
};

function resolveCandidateIds(candidateIds?: string[]): string[] {
  const next = (candidateIds?.length ? candidateIds : readRecentFonts())
    .filter(Boolean)
    .slice(0, 5);
  if (next.length >= 3) return next;
  return [
    ...next,
    "inter",
    "playfair",
    "lora",
    "space-grotesk",
    "jetbrains-mono",
  ]
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 5);
}

function CompareRow({
  id,
  sampleText,
  pointSize,
  onPick,
}: {
  id: string;
  sampleText: string;
  pointSize: number;
  onPick: (fontId: string) => void;
}) {
  const font = getFontById(id) || FONT_CATALOG[0];
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void ensureFontLoaded(font.id)
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [font.id]);

  return (
    <button
      type="button"
      className="rounded-lg border border-white/10 bg-[#f5f1ea] p-3 text-left text-[#1a1a1a]"
      data-testid={`font-compare-row-${id}`}
      onClick={() => onPick(font.id)}
    >
      <span className="block text-[11px] text-black/50">{font.family}</span>
      <span
        className="block"
        style={{
          fontFamily: ready ? fontCssStack(font) : undefined,
          fontSize: `${ptToPx(pointSize)}px`,
          lineHeight: 1.25,
        }}
      >
        {sampleText || "The quick brown fox"}
      </span>
      {!ready ? (
        <span className="mt-1 block text-[10px] text-black/40">Loading typeface…</span>
      ) : null}
    </button>
  );
}

export function FontComparison({
  sampleText,
  pointSize = 24,
  candidateIds,
  onPick,
  onClose,
  onBack,
}: FontComparisonProps) {
  const ids = useMemo(() => resolveCandidateIds(candidateIds), [candidateIds]);

  return (
    <NestedPanelShell
      title="Compare fonts"
      breadcrumbs={["Text", "Typography", "Font", "Compare"]}
      onBack={onBack}
      onClose={onClose}
      testId="font-comparison"
    >
      <p className="mb-3 text-[11px] text-white/45">
        Side-by-side candidates using your selected Card text.
      </p>
      <div className="grid gap-2">
        {ids.map((id) => (
          <CompareRow
            key={id}
            id={id}
            sampleText={sampleText}
            pointSize={pointSize}
            onPick={onPick}
          />
        ))}
      </div>
    </NestedPanelShell>
  );
}
