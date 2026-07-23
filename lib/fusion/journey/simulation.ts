import type { JourneyDefinition, JourneyNode } from "./types";
import { isEntryNodeType } from "./types";
import { validateJourney } from "./validation";

export type SimulationStep = {
  nodeId: string;
  nodeType: string;
  label: string;
  action: string;
};

export type SimulationResult = {
  steps: SimulationStep[];
  completed: boolean;
  issues: ReturnType<typeof validateJourney>;
};

const ACTION_BY_TYPE: Record<string, string> = {
  trigger: "Event fires / visitor taps",
  entry_tap: "Visitor taps NFC/QR",
  wait: "Wait configured interval",
  delay: "Wait configured interval",
  condition: "Evaluate condition; take matching edge",
  branch: "Evaluate branch condition",
  message: "Queue Guardian-eligible message",
  email: "Queue Guardian-eligible email",
  award_loyalty: "Award TapLoop points (idempotent)",
  create_case: "Open TapCase for ops follow-up",
  human_handoff: "Hand off to inbox / human agent",
  page_view: "Render campaign page",
  form_submit: "Capture lead; Guardian checks consent",
  offer_redeem: "Reveal coupon code",
  exit: "Journey complete",
};

/**
 * Deterministic sample-path walk — follows first outgoing edge (or labeled "true"/default).
 * Same engine for beginner stage list and expert graph preview.
 */
export function simulateJourney(
  def: JourneyDefinition,
  opts?: { preferEdgeLabel?: string }
): SimulationResult {
  const issues = validateJourney(def);
  const steps: SimulationStep[] = [];
  const entry = def.nodes.find((n) => isEntryNodeType(n.type));
  if (!entry) {
    return { steps, completed: false, issues };
  }

  const visited = new Set<string>();
  let current: JourneyNode | undefined = entry;
  let guard = 0;
  const prefer = opts?.preferEdgeLabel?.toLowerCase();

  while (current && guard < 32) {
    guard += 1;
    if (visited.has(current.id)) break;
    visited.add(current.id);

    steps.push({
      nodeId: current.id,
      nodeType: current.type,
      label: current.label,
      action: ACTION_BY_TYPE[current.type] ?? "Continue",
    });

    if (current.type === "exit") break;

    const outgoing = def.edges.filter((e) => e.from === current!.id);
    let edge = outgoing[0];
    if (prefer && outgoing.length > 1) {
      edge =
        outgoing.find((e) => (e.label ?? e.condition ?? "").toLowerCase() === prefer) ??
        outgoing.find((e) => (e.label ?? "").toLowerCase() === "true") ??
        outgoing[0];
    }
    if (!edge) break;
    current = def.nodes.find((n) => n.id === edge!.to);
  }

  return {
    steps,
    completed: steps.some((s) => s.nodeType === "exit"),
    issues,
  };
}

/** Alias used by older TapFlow helpers / tests */
export function simulatePath(def: JourneyDefinition): string[] {
  return simulateJourney(def).steps.map((s) => s.nodeId);
}
