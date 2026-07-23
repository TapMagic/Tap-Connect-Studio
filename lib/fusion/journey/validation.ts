import {
  JOURNEY_NODE_REGISTRY,
  isEntryNodeType,
  type JourneyDefinition,
  type JourneyValidationIssue,
} from "./types";

export function validateJourney(def: JourneyDefinition): JourneyValidationIssue[] {
  const issues: JourneyValidationIssue[] = [];
  const nodeIds = new Set(def.nodes.map((n) => n.id));

  if (!def.name.trim()) {
    issues.push({ severity: "error", code: "name_required", message: "Journey name is required" });
  }

  const entries = def.nodes.filter((n) => isEntryNodeType(n.type));
  if (entries.length === 0) {
    issues.push({
      severity: "error",
      code: "missing_entry",
      message: "Journey must have exactly one trigger or entry_tap node",
    });
  } else if (entries.length > 1) {
    issues.push({
      severity: "error",
      code: "multiple_entry",
      message: "Only one trigger/entry node allowed",
      nodeId: entries[1]?.id,
    });
  }

  const exits = def.nodes.filter((n) => n.type === "exit");
  if (exits.length === 0) {
    issues.push({
      severity: "warning",
      code: "no_exit",
      message: "Consider adding an exit node for clarity",
    });
  }

  for (const edge of def.edges) {
    if (!nodeIds.has(edge.from)) {
      issues.push({
        severity: "error",
        code: "dangling_edge_from",
        message: `Edge references missing source node: ${edge.from}`,
        edgeId: edge.id,
      });
    }
    if (!nodeIds.has(edge.to)) {
      issues.push({
        severity: "error",
        code: "dangling_edge_to",
        message: `Edge references missing target node: ${edge.to}`,
        edgeId: edge.id,
      });
    }
  }

  for (const node of def.nodes) {
    const reg = JOURNEY_NODE_REGISTRY[node.type];
    const outgoing = def.edges.filter((e) => e.from === node.id).length;
    if (reg?.maxOutgoing !== undefined && outgoing > reg.maxOutgoing) {
      issues.push({
        severity: "error",
        code: "too_many_outgoing",
        message: `${node.label} allows at most ${reg.maxOutgoing} outgoing edge(s)`,
        nodeId: node.id,
      });
    }
  }

  const reachable = new Set<string>();
  if (entries[0]) {
    const queue = [entries[0].id];
    while (queue.length) {
      const id = queue.shift()!;
      if (reachable.has(id)) continue;
      reachable.add(id);
      for (const e of def.edges.filter((x) => x.from === id)) {
        queue.push(e.to);
      }
    }
  }

  for (const node of def.nodes) {
    if (node.type === "exit") continue;
    if (entries[0] && !reachable.has(node.id)) {
      issues.push({
        severity: "warning",
        code: "unreachable_node",
        message: `Node “${node.label}” is not reachable from entry`,
        nodeId: node.id,
      });
    }
  }

  return issues;
}

export function journeyIsValid(def: JourneyDefinition): boolean {
  return !validateJourney(def).some((i) => i.severity === "error");
}
