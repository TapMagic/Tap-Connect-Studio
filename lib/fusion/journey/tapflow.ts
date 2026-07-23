/**
 * Legacy TapFlow shapes — bridge to unified engine so domain-contracts tests stay green.
 */

import { validateJourney as validateJourneyGraph } from "./validation";
import { simulatePath as simulatePathUnified } from "./simulation";
import type { JourneyDefinition, JourneyNode, JourneyNodeType } from "./types";
import { createEmptyJourney } from "./types";

export type LegacyNodeType = "trigger" | "wait" | "condition" | "message" | "end" | "action";

export type LegacyJourneyNode = {
  id: string;
  type: LegacyNodeType;
  label: string;
  config: Record<string, unknown>;
  x: number;
  y: number;
};

export type LegacyJourneyDefinition = {
  id: string;
  businessId: string;
  name: string;
  version: number;
  status: "draft" | "active" | "paused";
  nodes: LegacyJourneyNode[];
  edges: { id: string; from: string; to: string; label?: string }[];
};

function mapLegacyType(type: LegacyNodeType): JourneyNodeType {
  if (type === "end") return "exit";
  if (type === "action") return "message";
  if (type === "wait") return "wait";
  if (type === "condition") return "condition";
  if (type === "message") return "message";
  return "trigger";
}

function toUnified(def: LegacyJourneyDefinition): JourneyDefinition {
  return {
    schemaVersion: 1,
    name: def.name,
    nodes: def.nodes.map(
      (n): JourneyNode => ({
        id: n.id,
        type: mapLegacyType(n.type),
        label: n.label,
        config: n.config,
        position: { x: n.x, y: n.y },
      })
    ),
    edges: def.edges.map((e) => ({ id: e.id, from: e.from, to: e.to, label: e.label })),
  };
}

export function validateJourney(def: LegacyJourneyDefinition): { ok: boolean; issues: string[] } {
  const issues = validateJourneyGraph(toUnified(def));
  return {
    ok: !issues.some((i) => i.severity === "error"),
    issues: issues.map((i) => i.message),
  };
}

export function simulatePath(def: LegacyJourneyDefinition): string[] {
  return simulatePathUnified(toUnified(def));
}

/** Alias for older domain-contracts import */
export const simulatePathLegacy = simulatePath;

export { createEmptyJourney };
export type { JourneyDefinition };
