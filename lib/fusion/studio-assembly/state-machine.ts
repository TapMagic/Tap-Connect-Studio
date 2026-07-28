/**
 * Studio Assembly state machine — one shared machine for all modes.
 * Pure functions; React drives timers and side effects.
 */

import type {
  AssemblyPhase,
  StudioAssemblyEvent,
  StudioAssemblyMachineState,
  StudioAssemblyMode,
} from "./types";
import { phaseSequenceForMode } from "./timing";

export function isTerminalPhase(phase: AssemblyPhase): boolean {
  return phase === "complete" || phase === "skipped" || phase === "failed";
}

export function createAssemblyMachine(
  mode: StudioAssemblyMode,
  reducedMotion = false
): StudioAssemblyMachineState {
  return {
    mode,
    phase: "idle",
    reducedMotion,
    capabilityIndex: 0,
    startedAt: null,
    completedAt: null,
    error: null,
  };
}

export function nextPhase(
  mode: StudioAssemblyMode,
  current: AssemblyPhase
): AssemblyPhase | null {
  const seq = phaseSequenceForMode(mode);
  const idx = seq.indexOf(current);
  if (idx < 0) return seq[0] ?? null;
  return seq[idx + 1] ?? null;
}

export function reduceAssembly(
  state: StudioAssemblyMachineState,
  event: StudioAssemblyEvent
): StudioAssemblyMachineState {
  switch (event.type) {
    case "START": {
      if (state.phase !== "idle" && state.phase !== "skipped" && state.phase !== "complete") {
        return state;
      }
      const seq = phaseSequenceForMode(state.mode);
      return {
        ...state,
        phase: seq[0] ?? "dark",
        capabilityIndex: 0,
        startedAt: Date.now(),
        completedAt: null,
        error: null,
      };
    }
    case "TICK": {
      if (
        state.phase === "skipped" ||
        state.phase === "complete" ||
        state.phase === "failed" ||
        state.phase === "idle"
      ) {
        return state;
      }
      return {
        ...state,
        phase: event.phase,
        capabilityIndex:
          event.phase === "capabilities_emerge"
            ? state.capabilityIndex + 1
            : state.capabilityIndex,
      };
    }
    case "SKIP":
      return {
        ...state,
        phase: "skipped",
        completedAt: Date.now(),
      };
    case "ACCELERATE": {
      if (isTerminalPhase(state.phase) || state.phase === "idle") {
        return state;
      }
      const seq = phaseSequenceForMode(state.mode);
      const pullbackIdx = seq.indexOf("pullback");
      const settleIdx = seq.indexOf("icons_settle");
      const currentIdx = seq.indexOf(state.phase);
      // Jump into pullback when still before it; otherwise finish settling.
      if (pullbackIdx >= 0 && (currentIdx < 0 || currentIdx < pullbackIdx)) {
        return { ...state, phase: "pullback" };
      }
      if (settleIdx >= 0 && (currentIdx < 0 || currentIdx < settleIdx)) {
        return { ...state, phase: "icons_settle" };
      }
      return {
        ...state,
        phase: "complete",
        completedAt: Date.now(),
      };
    }
    case "COMPLETE":
      return {
        ...state,
        phase: "complete",
        completedAt: Date.now(),
      };
    case "FAIL":
      return {
        ...state,
        phase: "failed",
        error: event.reason,
        completedAt: Date.now(),
      };
    case "REPLAY":
      return createAssemblyMachine(state.mode, state.reducedMotion);
    default:
      return state;
  }
}

export function isAssemblyActive(phase: AssemblyPhase): boolean {
  return !isTerminalPhase(phase) && phase !== "idle";
}

/** Whether Card→Home unfold is part of this mode. */
export function modeUnfoldsToHome(mode: StudioAssemblyMode): boolean {
  return mode === "FIRST_STUDIO_ENTRY" || mode === "EVERYDAY_ENTRY";
}
