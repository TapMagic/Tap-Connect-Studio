"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createLabeledHistory,
  pushLabeledHistory,
  redoLabeledHistory,
  undoLabeledHistory,
  type LabeledEditorHistory,
} from "@/lib/fusion/authoring/session-history";

type Options = {
  maxDepth?: number;
  /** Debounce window for batched slider-style updates (ms). */
  batchMs?: number;
};

/**
 * Labeled undo/redo for full editor snapshots.
 * Panel open/close and selection must not call setState with a label.
 */
export function useLabeledUndoRedo<T>(initial: T, options: Options = {}) {
  const maxDepth = options.maxDepth ?? 50;
  const batchMs = options.batchMs ?? 400;
  const [history, setHistory] = useState<LabeledEditorHistory<T>>(() =>
    createLabeledHistory(initial)
  );
  const recordingRef = useRef(true);
  const batchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingLabel = useRef<string | null>(null);

  const flushBatch = useCallback(() => {
    batchTimer.current = null;
    pendingLabel.current = null;
  }, []);

  const setPresent = useCallback(
    (
      next: T | ((prev: T) => T),
      opts?: { record?: boolean; label?: string; batch?: boolean }
    ) => {
      const record = opts?.record !== false && recordingRef.current;
      const label = opts?.label || "Change";
      setHistory((h) => {
        const resolved =
          typeof next === "function" ? (next as (prev: T) => T)(h.present) : next;
        if (!record) {
          return { ...h, present: resolved };
        }
        if (opts?.batch) {
          // Replace present without pushing while a batch is open; push once on idle.
          if (pendingLabel.current && batchTimer.current) {
            return { ...h, present: resolved };
          }
          pendingLabel.current = label;
          if (batchTimer.current) clearTimeout(batchTimer.current);
          const pushed = pushLabeledHistory(h, resolved, label, maxDepth);
          batchTimer.current = setTimeout(flushBatch, batchMs);
          return pushed;
        }
        return pushLabeledHistory(h, resolved, label, maxDepth);
      });
    },
    [batchMs, flushBatch, maxDepth]
  );

  const undo = useCallback(() => {
    setHistory((h) => undoLabeledHistory(h) ?? h);
  }, []);

  const redo = useCallback(() => {
    setHistory((h) => redoLabeledHistory(h) ?? h);
  }, []);

  const reset = useCallback((next: T) => {
    setHistory(createLabeledHistory(next));
  }, []);

  const withoutRecording = useCallback((fn: () => void) => {
    recordingRef.current = false;
    try {
      fn();
    } finally {
      recordingRef.current = true;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (batchTimer.current) clearTimeout(batchTimer.current);
    };
  }, []);

  // Stable label array identity when history entries are unchanged — prevents
  // live-publish / shell-status effects from re-firing every render.
  const pastLabels = useMemo(
    () => history.past.map((e) => e.label),
    [history.past]
  );
  const futureLabels = useMemo(
    () => history.future.map((e) => e.label),
    [history.future]
  );

  return {
    state: history.present,
    setState: setPresent,
    undo,
    redo,
    reset,
    withoutRecording,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    pastLabels,
    futureLabels,
  };
}
