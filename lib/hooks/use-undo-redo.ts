"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  canRedoEditorHistory,
  canUndoEditorHistory,
  createEditorHistory,
  pushEditorHistory,
  redoEditorHistory,
  undoEditorHistory,
  type EditorHistory,
} from "@/lib/utils/editor-history";

type Options = {
  maxDepth?: number;
  /** When false, mutations do not push history (e.g. during undo/redo restore) */
  record?: boolean;
};

/**
 * Undo/redo for block editors — records discrete snapshots on each committed change.
 */
export function useUndoRedo<T>(initial: T, options: Options = {}) {
  const maxDepth = options.maxDepth ?? 50;
  const [history, setHistory] = useState<EditorHistory<T>>(() =>
    createEditorHistory(initial)
  );
  const recordingRef = useRef(true);

  const setPresent = useCallback(
    (next: T | ((prev: T) => T), record = true) => {
      setHistory((h) => {
        const resolved =
          typeof next === "function" ? (next as (prev: T) => T)(h.present) : next;
        if (!record || !recordingRef.current) {
          return { ...h, present: resolved };
        }
        return pushEditorHistory(h, resolved, maxDepth);
      });
    },
    [maxDepth]
  );

  const undo = useCallback(() => {
    setHistory((h) => {
      const prev = undoEditorHistory(h);
      return prev ?? h;
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((h) => {
      const next = redoEditorHistory(h);
      return next ?? h;
    });
  }, []);

  const reset = useCallback((next: T) => {
    setHistory(createEditorHistory(next));
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
    if (options.record === false) recordingRef.current = false;
  }, [options.record]);

  return {
    state: history.present,
    setState: setPresent,
    undo,
    redo,
    reset,
    withoutRecording,
    canUndo: canUndoEditorHistory(history),
    canRedo: canRedoEditorHistory(history),
  };
}
