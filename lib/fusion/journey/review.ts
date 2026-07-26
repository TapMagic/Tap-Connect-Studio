/**
 * Deterministic Journey Review (rules-based).
 * Uses the current Journey definition plus validation/simulation rules.
 * Does not invoke a live AI model. Never applies silently.
 * Live grounded Automation Team review is Phase 2.
 */

import {
  JOURNEY_NODE_REGISTRY,
  isEntryNodeType,
  type JourneyDefinition,
  type JourneyEdge,
  type JourneyNode,
  type JourneyNodeType,
} from "./types";
import { validateJourney } from "./validation";
import { simulateJourney } from "./simulation";

export type JourneyFindingCode =
  | "disconnected_node"
  | "unreachable_node"
  | "missing_exit"
  | "dead_end"
  | "contradictory_condition"
  | "unbounded_loop"
  | "missing_wait_retry"
  | "unsupported_action"
  | "consent_guardian"
  | "missing_handoff"
  | "missing_recovery"
  | "incomplete_outcome"
  | "customer_confusion"
  | "validation_error";

export type JourneyFinding = {
  id: string;
  code: JourneyFindingCode;
  severity: "error" | "warning" | "info";
  title: string;
  plainLanguage: string;
  nodeIds: string[];
  edgeIds: string[];
  suggestedFix?: string;
};

export type JourneyPatchOp =
  | { op: "add_node"; node: JourneyNode }
  | { op: "remove_node"; nodeId: string }
  | { op: "update_node"; nodeId: string; patch: Partial<JourneyNode> }
  | { op: "add_edge"; edge: JourneyEdge }
  | { op: "remove_edge"; edgeId: string }
  | { op: "update_edge"; edgeId: string; patch: Partial<JourneyEdge> };

export type JourneyReviewProposal = {
  id: string;
  status: "pending" | "previewed" | "accepted" | "rejected" | "partial";
  title: string;
  summary: string;
  findings: JourneyFinding[];
  proposedOps: JourneyPatchOp[];
  customerExperience: string;
  createdAt: string;
  acceptedOpIndexes?: number[];
};

export type JourneyReviewResult = {
  findings: JourneyFinding[];
  proposal: JourneyReviewProposal | null;
  simulationPaths: Array<{
    label: string;
    preferEdgeLabel?: string;
    steps: string[];
    completed: boolean;
    communications: string[];
    warnings: string[];
  }>;
  customerSummary: string;
};

function fid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function outgoing(def: JourneyDefinition, nodeId: string) {
  return def.edges.filter((e) => e.from === nodeId);
}

function incoming(def: JourneyDefinition, nodeId: string) {
  return def.edges.filter((e) => e.to === nodeId);
}

function reachableFrom(def: JourneyDefinition, startId: string): Set<string> {
  const seen = new Set<string>();
  const q = [startId];
  while (q.length) {
    const id = q.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const e of outgoing(def, id)) q.push(e.to);
  }
  return seen;
}

function detectCycles(def: JourneyDefinition): string[][] {
  const cycles: string[][] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const stack: string[] = [];

  function dfs(id: string) {
    if (visiting.has(id)) {
      const idx = stack.indexOf(id);
      if (idx >= 0) cycles.push(stack.slice(idx));
      return;
    }
    if (visited.has(id)) return;
    visiting.add(id);
    stack.push(id);
    for (const e of outgoing(def, id)) dfs(e.to);
    stack.pop();
    visiting.delete(id);
    visited.add(id);
  }

  for (const n of def.nodes) dfs(n.id);
  return cycles;
}

/** Analyze journey — marks canvas findings; does not mutate. */
export function analyzeJourney(def: JourneyDefinition): JourneyFinding[] {
  const findings: JourneyFinding[] = [];
  const validation = validateJourney(def);

  for (const issue of validation) {
    findings.push({
      id: fid("val"),
      code: "validation_error",
      severity: issue.severity,
      title: issue.code,
      plainLanguage: issue.message,
      nodeIds: issue.nodeId ? [issue.nodeId] : [],
      edgeIds: issue.edgeId ? [issue.edgeId] : [],
    });
  }

  const entry = def.nodes.find((n) => isEntryNodeType(n.type));
  const reachable = entry ? reachableFrom(def, entry.id) : new Set<string>();

  for (const node of def.nodes) {
    const out = outgoing(def, node.id);
    const inn = incoming(def, node.id);

    if (!isEntryNodeType(node.type) && inn.length === 0 && out.length === 0) {
      findings.push({
        id: fid("disc"),
        code: "disconnected_node",
        severity: "warning",
        title: "Disconnected step",
        plainLanguage: `“${node.label}” is not connected to the journey. Customers will never reach it.`,
        nodeIds: [node.id],
        edgeIds: [],
        suggestedFix: "Connect it from a previous step, or remove it.",
      });
    }

    if (entry && !reachable.has(node.id) && node.type !== "exit") {
      if (!findings.some((f) => f.nodeIds.includes(node.id) && f.code === "unreachable_node")) {
        findings.push({
          id: fid("unr"),
          code: "unreachable_node",
          severity: "warning",
          title: "Unreachable step",
          plainLanguage: `“${node.label}” cannot be reached from the start.`,
          nodeIds: [node.id],
          edgeIds: [],
          suggestedFix: "Add a path from the trigger or an earlier branch.",
        });
      }
    }

    if (node.type !== "exit" && out.length === 0) {
      findings.push({
        id: fid("dead"),
        code: "dead_end",
        severity: "error",
        title: "Dead end",
        plainLanguage: `“${node.label}” has no next step. Customers stop here without a clear outcome.`,
        nodeIds: [node.id],
        edgeIds: [],
        suggestedFix: "Connect to an Exit, handoff, or follow-up step.",
      });
    }

    if ((node.type === "condition" || node.type === "branch") && out.length < 2) {
      findings.push({
        id: fid("cond"),
        code: "contradictory_condition",
        severity: "warning",
        title: "Incomplete branch",
        plainLanguage: `“${node.label}” should offer at least two labeled paths (for example Yes / No).`,
        nodeIds: [node.id],
        edgeIds: out.map((e) => e.id),
        suggestedFix: "Add an alternate branch with a clear label.",
      });
    }

    if (
      (node.type === "message" || node.type === "email") &&
      !node.config?.consentAware &&
      node.config?.requireConsent !== true
    ) {
      findings.push({
        id: fid("cg"),
        code: "consent_guardian",
        severity: "warning",
        title: "Consent / Channel Guardian",
        plainLanguage: `“${node.label}” should confirm consent before sending. Channel Guardian will block unsafe sends.`,
        nodeIds: [node.id],
        edgeIds: [],
        suggestedFix: "Mark the step as consent-aware in the inspector.",
      });
    }

    if (node.type === "create_case" && !def.nodes.some((n) => n.type === "human_handoff")) {
      findings.push({
        id: fid("hh"),
        code: "missing_handoff",
        severity: "info",
        title: "No human handoff",
        plainLanguage:
          "This journey opens a case but has no human handoff step. Consider adding one for recovery.",
        nodeIds: [node.id],
        edgeIds: [],
        suggestedFix: "Add a Human handoff after the case, or on a failure branch.",
      });
    }

    const reg = JOURNEY_NODE_REGISTRY[node.type as JourneyNodeType];
    if (!reg) {
      findings.push({
        id: fid("unsup"),
        code: "unsupported_action",
        severity: "error",
        title: "Unsupported action",
        plainLanguage: `Step type “${node.type}” is not registered for TapFlow.`,
        nodeIds: [node.id],
        edgeIds: [],
      });
    }
  }

  if (!def.nodes.some((n) => n.type === "exit")) {
    findings.push({
      id: fid("exit"),
      code: "missing_exit",
      severity: "warning",
      title: "Missing exit",
      plainLanguage: "Add a clear Exit so customers and operators know when the journey finishes.",
      nodeIds: [],
      edgeIds: [],
      suggestedFix: "Add an Exit node and connect completing paths to it.",
    });
  }

  const cycles = detectCycles(def);
  for (const cycle of cycles) {
    const hasWait = cycle.some((id) => {
      const n = def.nodes.find((x) => x.id === id);
      return n?.type === "wait" || n?.type === "delay" || n?.config?.maxRetries != null;
    });
    if (!hasWait) {
      findings.push({
        id: fid("loop"),
        code: "unbounded_loop",
        severity: "error",
        title: "Unsafe loop",
        plainLanguage:
          "A loop was detected without a wait, timeout, or retry limit. This can confuse customers or spin forever.",
        nodeIds: cycle,
        edgeIds: [],
        suggestedFix: "Add a Wait, max retries, or an Exit branch to break the loop.",
      });
    } else {
      findings.push({
        id: fid("bloop"),
        code: "unbounded_loop",
        severity: "info",
        title: "Bounded loop",
        plainLanguage: "A loop exists but includes wait/retry controls. Review the limit is intentional.",
        nodeIds: cycle,
        edgeIds: [],
      });
    }
  }

  const hasComm = def.nodes.some((n) => n.type === "message" || n.type === "email");
  const hasRecovery =
    def.nodes.some((n) => n.type === "human_handoff" || n.type === "create_case") ||
    def.edges.some((e) => /fail|error|retry/i.test(e.label ?? ""));
  if (hasComm && !hasRecovery) {
    findings.push({
      id: fid("rec"),
      code: "missing_recovery",
      severity: "info",
      title: "No recovery path",
      plainLanguage:
        "Messages go out but there is no failure/recovery branch. Consider a handoff or case on failure.",
      nodeIds: [],
      edgeIds: [],
    });
  }

  const sim = simulateJourney(def);
  if (!sim.completed) {
    findings.push({
      id: fid("out"),
      code: "incomplete_outcome",
      severity: "warning",
      title: "Incomplete outcome",
      plainLanguage:
        "The sample customer path does not reach Exit. Check branches and dead ends.",
      nodeIds: sim.steps.map((s) => s.nodeId).slice(-1),
      edgeIds: [],
    });
  }

  if (sim.steps.length > 8) {
    findings.push({
      id: fid("conf"),
      code: "customer_confusion",
      severity: "info",
      title: "Long journey",
      plainLanguage:
        "This path has many steps. Customers may feel lost — consider shortening or summarizing waits.",
      nodeIds: [],
      edgeIds: [],
    });
  }

  // Dedupe similar findings on same nodes
  const seen = new Set<string>();
  return findings.filter((f) => {
    const key = `${f.code}:${f.nodeIds.join(",")}:${f.plainLanguage}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function buildCustomerExperienceSummary(def: JourneyDefinition): string {
  const sim = simulateJourney(def);
  if (sim.steps.length === 0) {
    return "No customer path yet — add a Trigger and connect steps to an Exit.";
  }
  const parts = sim.steps.map((s, i) => {
    if (i === 0) return `Customer starts at “${s.label}”.`;
    if (s.nodeType === "exit") return `Journey ends at “${s.label}”.`;
    if (s.nodeType === "wait" || s.nodeType === "delay") return `They wait (${s.label}).`;
    if (s.nodeType === "email") return `They receive an email (“${s.label}”).`;
    if (s.nodeType === "message") return `They get a message (“${s.label}”).`;
    if (s.nodeType === "condition" || s.nodeType === "branch")
      return `A decision is made at “${s.label}”.`;
    if (s.nodeType === "award_loyalty") return `Loyalty points are awarded (“${s.label}”).`;
    if (s.nodeType === "human_handoff") return `A person takes over (“${s.label}”).`;
    return `Next: “${s.label}”.`;
  });
  if (!sim.completed) {
    parts.push("The path currently stops before a clear completion.");
  }
  return parts.join(" ");
}

function proposeOpsForFindings(
  def: JourneyDefinition,
  findings: JourneyFinding[]
): JourneyPatchOp[] {
  const ops: JourneyPatchOp[] = [];
  const hasExit = def.nodes.some((n) => n.type === "exit");

  for (const f of findings) {
    if (f.code === "missing_exit" && !hasExit) {
      const exitId = `exit_${fid("n")}`;
      ops.push({
        op: "add_node",
        node: {
          id: exitId,
          type: "exit",
          label: "Complete",
          config: {},
          position: { x: 520, y: 120 },
        },
      });
    }

    if (f.code === "dead_end" && f.nodeIds[0]) {
      let exit = def.nodes.find((n) => n.type === "exit");
      if (!exit) {
        const exitId = `exit_${fid("n")}`;
        exit = {
          id: exitId,
          type: "exit",
          label: "Complete",
          config: {},
          position: { x: 520, y: 200 },
        };
        ops.push({ op: "add_node", node: exit });
      }
      ops.push({
        op: "add_edge",
        edge: {
          id: `e_${fid("e")}`,
          from: f.nodeIds[0],
          to: exit.id,
          label: "continue",
        },
      });
    }

    if (f.code === "consent_guardian" && f.nodeIds[0]) {
      ops.push({
        op: "update_node",
        nodeId: f.nodeIds[0],
        patch: { config: { requireConsent: true, consentAware: true } },
      });
    }

    if (f.code === "contradictory_condition" && f.nodeIds[0]) {
      const node = def.nodes.find((n) => n.id === f.nodeIds[0]);
      const exit = def.nodes.find((n) => n.type === "exit");
      if (node && exit) {
        ops.push({
          op: "add_edge",
          edge: {
            id: `e_${fid("e")}`,
            from: node.id,
            to: exit.id,
            label: "else",
          },
        });
      }
    }

    if (f.code === "missing_handoff") {
      const handoffId = `human_handoff_${fid("n")}`;
      ops.push({
        op: "add_node",
        node: {
          id: handoffId,
          type: "human_handoff",
          label: "Human handoff",
          config: {},
          position: { x: 360, y: 260 },
        },
      });
    }
  }

  return ops;
}

/** Full review: analyze, propose, simulate paths, customer summary. Never mutates. */
export function reviewJourney(def: JourneyDefinition): JourneyReviewResult {
  const findings = analyzeJourney(def);
  const customerSummary = buildCustomerExperienceSummary(def);
  const actionable = findings.filter((f) => f.severity !== "info" || f.suggestedFix);
  const ops = proposeOpsForFindings(def, findings);

  const branchLabels = Array.from(
    new Set(def.edges.map((e) => e.label).filter(Boolean) as string[])
  );
  const labelsToSim =
    branchLabels.length > 0 ? branchLabels.slice(0, 4) : [undefined];

  const simulationPaths = labelsToSim.map((label) => {
    const sim = simulateJourney(def, label ? { preferEdgeLabel: label } : undefined);
    const communications = sim.steps
      .filter((s) => s.nodeType === "email" || s.nodeType === "message")
      .map((s) => s.label);
    const warnings = sim.issues
      .filter((i) => i.severity === "warning" || i.severity === "error")
      .map((i) => i.message);
    return {
      label: label ? `Branch: ${label}` : "Primary path",
      preferEdgeLabel: label,
      steps: sim.steps.map((s) => s.label),
      completed: sim.completed,
      communications,
      warnings,
    };
  });

  const proposal: JourneyReviewProposal | null =
    ops.length > 0 || actionable.length > 0
      ? {
          id: fid("prop"),
          status: "pending",
          title: "Journey review suggestions",
          summary:
            findings.length === 0
              ? "No issues found."
              : `Found ${findings.length} finding(s). Review proposed fixes before applying.`,
          findings,
          proposedOps: ops,
          customerExperience: customerSummary,
          createdAt: new Date().toISOString(),
        }
      : null;

  return { findings, proposal, simulationPaths, customerSummary };
}

/** Apply selected ops — returns new definition; never mutates input. */
export function applyJourneyPatch(
  def: JourneyDefinition,
  ops: JourneyPatchOp[],
  acceptedIndexes?: number[]
): JourneyDefinition {
  const indexes =
    acceptedIndexes ?? ops.map((_, i) => i);
  let next: JourneyDefinition = {
    ...def,
    nodes: [...def.nodes],
    edges: [...def.edges],
  };

  for (const i of indexes) {
    const op = ops[i];
    if (!op) continue;
    switch (op.op) {
      case "add_node":
        if (!next.nodes.some((n) => n.id === op.node.id)) {
          next = { ...next, nodes: [...next.nodes, op.node] };
        }
        break;
      case "remove_node":
        next = {
          ...next,
          nodes: next.nodes.filter((n) => n.id !== op.nodeId),
          edges: next.edges.filter((e) => e.from !== op.nodeId && e.to !== op.nodeId),
        };
        break;
      case "update_node":
        next = {
          ...next,
          nodes: next.nodes.map((n) =>
            n.id === op.nodeId
              ? {
                  ...n,
                  ...op.patch,
                  config: { ...n.config, ...(op.patch.config ?? {}) },
                }
              : n
          ),
        };
        break;
      case "add_edge":
        if (
          !next.edges.some(
            (e) => e.from === op.edge.from && e.to === op.edge.to && e.label === op.edge.label
          )
        ) {
          next = { ...next, edges: [...next.edges, op.edge] };
        }
        break;
      case "remove_edge":
        next = { ...next, edges: next.edges.filter((e) => e.id !== op.edgeId) };
        break;
      case "update_edge":
        next = {
          ...next,
          edges: next.edges.map((e) => (e.id === op.edgeId ? { ...e, ...op.patch } : e)),
        };
        break;
    }
  }

  return next;
}

/** Diff summary for UI — before/after node and edge counts + op descriptions. */
export function describeJourneyDiff(
  before: JourneyDefinition,
  after: JourneyDefinition,
  ops: JourneyPatchOp[]
): {
  nodesAdded: number;
  nodesRemoved: number;
  edgesAdded: number;
  edgesRemoved: number;
  opSummaries: string[];
} {
  return {
    nodesAdded: after.nodes.length - before.nodes.length,
    nodesRemoved: Math.max(0, before.nodes.length - after.nodes.length),
    edgesAdded: after.edges.length - before.edges.length,
    edgesRemoved: Math.max(0, before.edges.length - after.edges.length),
    opSummaries: ops.map((op) => {
      switch (op.op) {
        case "add_node":
          return `Add “${op.node.label}” (${op.node.type})`;
        case "remove_node":
          return `Remove node ${op.nodeId}`;
        case "update_node":
          return `Update ${op.nodeId}`;
        case "add_edge":
          return `Connect ${op.edge.from} → ${op.edge.to}${op.edge.label ? ` (${op.edge.label})` : ""}`;
        case "remove_edge":
          return `Remove edge ${op.edgeId}`;
        case "update_edge":
          return `Update edge ${op.edgeId}`;
      }
    }),
  };
}

/** Prevent invalid edges at authoring time. */
export function canConnectNodes(
  def: JourneyDefinition,
  fromId: string,
  toId: string
): { ok: boolean; reason?: string } {
  if (fromId === toId) return { ok: false, reason: "Cannot connect a step to itself" };
  const from = def.nodes.find((n) => n.id === fromId);
  const to = def.nodes.find((n) => n.id === toId);
  if (!from || !to) return { ok: false, reason: "Missing node" };
  if (from.type === "exit") return { ok: false, reason: "Exit cannot have outgoing connections" };
  if (isEntryNodeType(to.type)) return { ok: false, reason: "Cannot connect into the Trigger" };
  const reg = JOURNEY_NODE_REGISTRY[from.type];
  const outgoingCount = def.edges.filter((e) => e.from === fromId).length;
  if (reg?.maxOutgoing !== undefined && outgoingCount >= reg.maxOutgoing) {
    return {
      ok: false,
      reason: `${from.label} allows at most ${reg.maxOutgoing} outgoing connection(s)`,
    };
  }
  if (def.edges.some((e) => e.from === fromId && e.to === toId)) {
    return { ok: false, reason: "Connection already exists" };
  }
  return { ok: true };
}
