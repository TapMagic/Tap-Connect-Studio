/**
 * Analyze & Repair — reverse-engineer existing objects into diagram;
 * Automation Team proposals require explicit accept / reject / preview.
 * NEVER apply repairs silently.
 */

import { nanoid } from "nanoid";
import {
  addEdge,
  addNode,
  bumpVersion,
  createCanvas,
  removeNode,
  requireCanvas,
  updateNode,
} from "./graph";
import {
  appendCanvasAudit,
  getProposal,
  listProposals,
  upsertProposal,
} from "./store";
import type { AutomationProposal, CanvasObjectKind, TapCanvas } from "./types";

export type ReverseVizInput = {
  canvasId?: string;
  businessId: string;
  name?: string;
  objects: Array<{
    type: CanvasObjectKind;
    id: string;
    label: string;
    provider?: string;
    status?: string;
  }>;
  associations?: Array<{ fromId: string; toId: string; label?: string }>;
};

export function reverseEngineerIntoCanvas(input: ReverseVizInput): TapCanvas {
  let canvas: TapCanvas;
  if (input.canvasId) {
    canvas = requireCanvas(input.canvasId);
  } else {
    canvas = createCanvas({
      businessId: input.businessId,
      name: input.name ?? "Reverse visualization",
      mode: "analyze",
    });
  }

  canvas.mode = "analyze";
  const idMap = new Map<string, string>();

  for (const [i, obj] of input.objects.entries()) {
    const { node } = addNode(canvas.id, {
      kind: obj.type,
      label: obj.label,
      x: 80 + (i % 4) * 180,
      y: 80 + Math.floor(i / 4) * 120,
      sketch: false,
      linked: { type: obj.type, id: obj.id, provider: obj.provider },
      data: { status: obj.status, reverseEngineered: true, authority: "tapconnect" },
    });
    updateNode(canvas.id, node.id, { liveStatus: obj.status ?? "imported" });
    idMap.set(obj.id, node.id);
  }

  for (const assoc of input.associations ?? []) {
    const source = idMap.get(assoc.fromId);
    const target = idMap.get(assoc.toId);
    if (source && target) {
      addEdge(canvas.id, {
        source,
        target,
        label: assoc.label,
        kind: "association",
        sketch: false,
      });
    }
  }

  bumpVersion(requireCanvas(canvas.id), "reverse-viz");
  appendCanvasAudit({
    canvasId: canvas.id,
    action: "analyze.reverse_viz",
    detail: { objectCount: input.objects.length },
  });

  return requireCanvas(canvas.id);
}

export function detectIssues(canvasId: string): AutomationProposal[] {
  const canvas = requireCanvas(canvasId);
  const found: AutomationProposal[] = [];

  const unlinked = canvas.nodes.filter((n) => !n.sketch && !n.linked && n.kind !== "note");
  if (unlinked.length) {
    found.push(
      createProposal(canvasId, {
        title: "Link orphan operational nodes",
        description: `${unlinked.length} node(s) lack authoritative object links`,
        severity: "warn",
        proposedPatch: {
          notes: "Propose linking or demoting to sketch",
          nodes: unlinked.map((n) => ({ id: n.id, label: `[orphan] ${n.label}` })),
        },
      })
    );
  }

  const sketchInOperate = canvas.nodes.filter((n) => n.sketch && canvas.mode === "operate");
  if (sketchInOperate.length) {
    found.push(
      createProposal(canvasId, {
        title: "Promote or hide sketch in Operate",
        description: "Sketch objects cannot execute — promote in Build or remove from operate view",
        severity: "info",
        proposedPatch: { removeNodeIds: [], notes: "Non-destructive proposal only" },
      })
    );
  }

  const blocked = canvas.nodes.filter((n) => n.data?.guardianBlocked);
  if (blocked.length) {
    found.push(
      createProposal(canvasId, {
        title: "Resolve Channel Guardian blocks",
        description: blocked.map((n) => n.label).join(", "),
        severity: "critical",
        proposedPatch: {
          notes: "Do not auto-bypass Guardian — operator must fix consent/purpose",
        },
      })
    );
  }

  appendCanvasAudit({
    canvasId,
    action: "analyze.issues_detected",
    detail: { proposalCount: found.length },
  });

  return found;
}

function createProposal(
  canvasId: string,
  input: Omit<AutomationProposal, "id" | "canvasId" | "status" | "createdAt">
): AutomationProposal {
  const p: AutomationProposal = {
    id: `aprop_${nanoid(10)}`,
    canvasId,
    title: input.title,
    description: input.description,
    severity: input.severity,
    status: "pending",
    proposedPatch: input.proposedPatch,
    createdAt: new Date().toISOString(),
  };
  upsertProposal(p);
  return p;
}

export function previewAutomationProposal(proposalId: string): {
  proposal: AutomationProposal;
  preview: AutomationProposal["proposedPatch"];
  applied: false;
} {
  const proposal = getProposal(proposalId);
  if (!proposal) throw new Error(`Proposal not found: ${proposalId}`);
  proposal.status = "previewed";
  upsertProposal(proposal);
  appendCanvasAudit({
    canvasId: proposal.canvasId,
    action: "automation.previewed",
    detail: { proposalId, applied: false },
  });
  return { proposal, preview: proposal.proposedPatch, applied: false };
}

/**
 * Accept applies the proposal patch explicitly. Reject discards without mutation.
 * Silent apply is forbidden — both paths audit.
 */
export function resolveAutomationProposal(opts: {
  proposalId: string;
  decision: "accept" | "reject";
}): { proposal: AutomationProposal; canvas?: TapCanvas } {
  const proposal = getProposal(opts.proposalId);
  if (!proposal) throw new Error(`Proposal not found: ${opts.proposalId}`);
  if (proposal.status === "accepted" || proposal.status === "rejected") {
    throw new Error(`Proposal already ${proposal.status}`);
  }

  if (opts.decision === "reject") {
    proposal.status = "rejected";
    proposal.resolvedAt = new Date().toISOString();
    upsertProposal(proposal);
    appendCanvasAudit({
      canvasId: proposal.canvasId,
      action: "automation.rejected",
      detail: { proposalId: proposal.id },
    });
    return { proposal };
  }

  // accept — apply label patches only (safe, explicit)
  const canvas = requireCanvas(proposal.canvasId);
  bumpVersion(canvas, "pre-automation-accept");
  for (const patch of proposal.proposedPatch.nodes ?? []) {
    if (patch.id && patch.label) {
      updateNode(proposal.canvasId, patch.id, { label: patch.label });
    }
  }
  for (const removeId of proposal.proposedPatch.removeNodeIds ?? []) {
    removeNode(proposal.canvasId, removeId);
  }

  proposal.status = "accepted";
  proposal.resolvedAt = new Date().toISOString();
  upsertProposal(proposal);
  bumpVersion(requireCanvas(proposal.canvasId), "post-automation-accept");
  appendCanvasAudit({
    canvasId: proposal.canvasId,
    action: "automation.accepted",
    detail: { proposalId: proposal.id, note: "Explicit operator accept — never silent" },
  });

  return { proposal, canvas: requireCanvas(proposal.canvasId) };
}

export function listPendingProposals(canvasId: string) {
  return listProposals(canvasId, "pending");
}
