/**
 * TapFlow journey graph — shared by beginner stage list and expert canvas.
 */

export type JourneyNodeType =
  | "trigger"
  | "entry_tap"
  | "wait"
  | "delay"
  | "condition"
  | "branch"
  | "message"
  | "email"
  | "award_loyalty"
  | "create_case"
  | "human_handoff"
  | "page_view"
  | "form_submit"
  | "offer_redeem"
  | "exit";

export type JourneyNode = {
  id: string;
  type: JourneyNodeType;
  label: string;
  config: Record<string, unknown>;
  position: { x: number; y: number };
};

export type JourneyEdge = {
  id: string;
  from: string;
  to: string;
  label?: string;
  condition?: string;
};

export type JourneyDefinition = {
  schemaVersion: number;
  name: string;
  nodes: JourneyNode[];
  edges: JourneyEdge[];
  metadata?: Record<string, unknown>;
};

export type JourneyValidationIssue = {
  severity: "error" | "warning";
  code: string;
  message: string;
  nodeId?: string;
  edgeId?: string;
};

export const JOURNEY_NODE_REGISTRY: Record<
  JourneyNodeType,
  { label: string; description: string; maxOutgoing?: number; beginner?: boolean }
> = {
  trigger: { label: "Trigger", description: "Start on tap / event", maxOutgoing: 1, beginner: true },
  entry_tap: { label: "Tap entry", description: "NFC/QR tap starts the journey", maxOutgoing: 1 },
  wait: { label: "Wait", description: "Delay before next step", maxOutgoing: 1, beginner: true },
  delay: { label: "Delay", description: "Wait before next step", maxOutgoing: 1 },
  condition: {
    label: "Condition",
    description: "Branch on attribute / consent / tier",
    maxOutgoing: 8,
    beginner: true,
  },
  branch: { label: "Branch", description: "Conditional split", maxOutgoing: 8 },
  message: {
    label: "Message",
    description: "Guardian-checked outbound message",
    beginner: true,
  },
  email: {
    label: "Email",
    description: "Guardian-checked email send",
    maxOutgoing: 1,
    beginner: true,
  },
  award_loyalty: {
    label: "Award loyalty",
    description: "TapLoop points award",
    maxOutgoing: 1,
    beginner: true,
  },
  create_case: {
    label: "Create case",
    description: "Open TapCase for follow-up",
    maxOutgoing: 1,
    beginner: true,
  },
  human_handoff: {
    label: "Human handoff",
    description: "Route to inbox / agent",
    maxOutgoing: 1,
    beginner: true,
  },
  page_view: { label: "Page view", description: "Show a campaign or card experience" },
  form_submit: { label: "Form submit", description: "Lead capture gate" },
  offer_redeem: { label: "Offer redeem", description: "Coupon unlock path" },
  exit: { label: "Exit", description: "End journey", maxOutgoing: 0, beginner: true },
};

export function isEntryNodeType(type: JourneyNodeType): boolean {
  return type === "trigger" || type === "entry_tap";
}

export function createEmptyJourney(name = "Untitled journey"): JourneyDefinition {
  const entryId = "trigger_1";
  const exitId = "exit_1";
  return {
    schemaVersion: 1,
    name,
    nodes: [
      {
        id: entryId,
        type: "trigger",
        label: "Trigger",
        config: { event: "tap" },
        position: { x: 80, y: 120 },
      },
      {
        id: exitId,
        type: "exit",
        label: "Complete",
        config: {},
        position: { x: 420, y: 120 },
      },
    ],
    edges: [{ id: "e1", from: entryId, to: exitId }],
  };
}

/** Beginner view: ordered stage list derived from first-edge walk */
export function journeyToStages(def: JourneyDefinition): JourneyNode[] {
  const entry = def.nodes.find((n) => isEntryNodeType(n.type));
  if (!entry) return [];
  const stages: JourneyNode[] = [];
  const visited = new Set<string>();
  let current: JourneyNode | undefined = entry;
  let guard = 0;
  while (current && guard < 64) {
    guard += 1;
    if (visited.has(current.id)) break;
    visited.add(current.id);
    stages.push(current);
    if (current.type === "exit") break;
    const edge = def.edges.find((e) => e.from === current!.id);
    if (!edge) break;
    current = def.nodes.find((n) => n.id === edge.to);
  }
  return stages;
}
