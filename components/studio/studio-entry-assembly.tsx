"use client";

import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { StudioAssembly } from "@/components/fusion/studio-assembly/studio-assembly";
import {
  entryKindToMode,
  markEverydaySkipPreferred,
  resolveStudioEntryKind,
  type AssemblyCardSnapshot,
} from "@/lib/fusion/studio-assembly";

/**
 * Authenticated Studio entry overlay — everyday short / first-entry full / replay.
 * Failure-safe: if anything throws, Home remains reachable (returns null).
 */
export function StudioEntryAssembly({
  card,
}: {
  card: AssemblyCardSnapshot;
}) {
  const search = useSearchParams();
  const forceReplay = search.get("assembly") === "replay";
  const forceFirst = search.get("assembly") === "first";

  const initial = useMemo(() => {
    try {
      const kind = resolveStudioEntryKind({ forceReplay, forceFirst });
      return entryKindToMode(kind);
    } catch {
      return null;
    }
  }, [forceReplay, forceFirst]);

  const [dismissed, setDismissed] = useState(false);
  const [failed] = useState(false);
  const mode = initial;

  const dismiss = useCallback(() => {
    setDismissed(true);
    requestAnimationFrame(() => {
      const heading = document.querySelector<HTMLElement>("#home-card-heading");
      heading?.focus?.();
      const home = document.querySelector<HTMLElement>(
        '[data-testid="home-card-command-center"]'
      );
      home?.focus?.();
    });
  }, []);

  const safeCard = useMemo(() => card, [card]);

  if (failed || dismissed || !mode) return null;

  return (
    <StudioAssembly
      mode={mode}
      capabilityScope="studio"
      card={safeCard}
      autoStart
      showReplay={false}
      showContinue
      settleToNav
      continueLabel="Continue to Studio"
      onComplete={dismiss}
      onSkip={() => {
        markEverydaySkipPreferred(true);
        dismiss();
      }}
    />
  );
}
