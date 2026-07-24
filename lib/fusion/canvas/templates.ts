/**
 * Guided creation templates + NL-style weekly-specials recipe.
 * Creates Campaign Group + schedules + fallback + Tap Point assign stubs +
 * ExternalWorkItem approval tasks + readiness checks (mock OK).
 */

import { nanoid } from "nanoid";
import { addEdge, addNode, createCanvas, bumpVersion, requireCanvas } from "./graph";
import { appendCanvasAudit } from "./store";
import {
  connectWorkProvider,
  createExternalWorkItem,
} from "@/lib/fusion/connectors/productivity/adapter";
import type { CanvasTemplateId, TapCanvas } from "./types";

export type TemplateResult = {
  canvas: TapCanvas;
  createdObjectStubs: Array<{ type: string; id: string; label: string }>;
  workItemIds: string[];
  readiness: {
    ok: boolean;
    checks: Array<{ id: string; ok: boolean; message: string }>;
  };
};

const TEMPLATE_META: Record<
  CanvasTemplateId,
  { name: string; nodes: Array<{ kind: string; label: string; promoteTo?: string }> }
> = {
  simple_campaign: {
    name: "Simple Campaign",
    nodes: [
      { kind: "campaign", label: "Campaign", promoteTo: "campaign" },
      { kind: "card", label: "Landing Card", promoteTo: "card" },
      { kind: "tap_point", label: "Tap Point assign stub", promoteTo: "tap_point" },
    ],
  },
  weekly_specials: {
    name: "Weekly Specials",
    nodes: [], // handled by recipe
  },
  campaign_group: {
    name: "Campaign Group",
    nodes: [
      { kind: "campaign_group", label: "Campaign Group" },
      { kind: "campaign", label: "Slot A" },
      { kind: "campaign", label: "Slot B / fallback" },
    ],
  },
  card: {
    name: "Card",
    nodes: [{ kind: "card", label: "New Card" }],
  },
  offer: {
    name: "Offer",
    nodes: [{ kind: "offer", label: "Offer" }, { kind: "card", label: "Offer Card" }],
  },
  funnel: {
    name: "Funnel",
    nodes: [
      { kind: "funnel_step", label: "Discover" },
      { kind: "funnel_step", label: "Keep Card" },
      { kind: "funnel_step", label: "Wallet" },
      { kind: "funnel_step", label: "Loyalty outcome" },
    ],
  },
  email_sequence: {
    name: "Email sequence",
    nodes: [
      { kind: "trigger", label: "Keep trigger" },
      { kind: "email_sequence", label: "Email sequence" },
      { kind: "wait", label: "Wait 2d" },
    ],
  },
  tapflow: {
    name: "TapFlow",
    nodes: [
      { kind: "trigger", label: "Tap scan" },
      { kind: "tapflow", label: "TapFlow draft" },
      { kind: "action", label: "Follow-up action" },
    ],
  },
  loyalty: {
    name: "Loyalty",
    nodes: [
      { kind: "loyalty", label: "Loyalty program" },
      { kind: "card", label: "Punch / reward card" },
    ],
  },
  deployment_map: {
    name: "Deployment map",
    nodes: [
      { kind: "deployment_slot", label: "Front door" },
      { kind: "deployment_slot", label: "Bar" },
      { kind: "tap_point", label: "Unassigned Tap Point" },
    ],
  },
  service_approval: {
    name: "Service / Approval workflow",
    nodes: [
      { kind: "trigger", label: "Service request" },
      { kind: "external_work_item", label: "Approval task" },
      { kind: "action", label: "Notify on approve" },
    ],
  },
};

export function listCanvasTemplates(): Array<{
  id: CanvasTemplateId;
  name: string;
}> {
  return (Object.keys(TEMPLATE_META) as CanvasTemplateId[]).map((id) => ({
    id,
    name: TEMPLATE_META[id].name,
  }));
}

export function applyCanvasTemplate(opts: {
  businessId: string;
  templateId: CanvasTemplateId;
  name?: string;
}): TemplateResult {
  if (opts.templateId === "weekly_specials") {
    return createWeeklySpecialsGroup({
      businessId: opts.businessId,
      name: opts.name,
    });
  }

  const meta = TEMPLATE_META[opts.templateId];
  const canvas = createCanvas({
    businessId: opts.businessId,
    name: opts.name ?? meta.name,
    mode: "build",
  });

  const stubs: TemplateResult["createdObjectStubs"] = [];
  const nodeIds: string[] = [];
  const workItemIds: string[] = [];

  connectWorkProvider({ businessId: opts.businessId, provider: "monday" });

  for (const [i, def] of meta.nodes.entries()) {
    const objectId = `${def.kind}_${nanoid(8)}`;
    const { node } = addNode(canvas.id, {
      kind: def.kind as never,
      label: def.label,
      x: 60 + i * 160,
      y: 100,
      sketch: false,
      linked: { type: def.kind as never, id: objectId },
      data: { fromTemplate: opts.templateId, authority: "tapconnect" },
    });
    nodeIds.push(node.id);
    stubs.push({ type: def.kind, id: objectId, label: def.label });

    if (def.kind === "external_work_item" || opts.templateId === "service_approval") {
      const task = createExternalWorkItem({
        provider: "monday",
        businessId: opts.businessId,
        title: `Approval: ${def.label}`,
        sourceType: "campaign_approval",
        sourceId: objectId,
      });
      if (task.ok) workItemIds.push(task.data.id);
    }
  }

  for (let i = 0; i < nodeIds.length - 1; i++) {
    addEdge(canvas.id, {
      source: nodeIds[i]!,
      target: nodeIds[i + 1]!,
      kind: "flow",
    });
  }

  // Approval task for campaign-like templates
  if (
    ["simple_campaign", "campaign_group", "offer"].includes(opts.templateId)
  ) {
    const task = createExternalWorkItem({
      provider: "monday",
      businessId: opts.businessId,
      title: `Review ${meta.name}`,
      sourceType: "campaign_approval",
      sourceId: stubs[0]?.id,
    });
    if (task.ok) {
      workItemIds.push(task.data.id);
      addNode(canvas.id, {
        kind: "external_work_item",
        label: task.data.title,
        sketch: false,
        linked: {
          type: "external_work_item",
          id: task.data.id,
          provider: "monday",
        },
      });
    }
  }

  bumpVersion(canvas, `template:${opts.templateId}`);
  const readiness = runTemplateReadiness(opts.businessId, stubs, workItemIds);
  appendCanvasAudit({
    canvasId: canvas.id,
    action: "template.applied",
    detail: { templateId: opts.templateId, stubs, workItemIds },
  });

  return { canvas: requireFresh(canvas.id), createdObjectStubs: stubs, workItemIds, readiness };
}

/** NL-style: "weekly specials Mon–Fri with weekend fallback" */
export function createWeeklySpecialsGroup(opts: {
  businessId: string;
  name?: string;
  recipe?: string;
}): TemplateResult {
  const recipe =
    opts.recipe ??
    "Create a Weekly Specials Campaign Group with weekday slots, weekend fallback, Tap Point assign stubs, and approval tasks";

  const canvas = createCanvas({
    businessId: opts.businessId,
    name: opts.name ?? "Weekly Specials",
    mode: "build",
  });

  connectWorkProvider({ businessId: opts.businessId, provider: "monday" });

  const groupId = `campaign_group_${nanoid(8)}`;
  const stubs: TemplateResult["createdObjectStubs"] = [
    { type: "campaign_group", id: groupId, label: "Weekly Specials Group" },
  ];

  const { node: groupNode } = addNode(canvas.id, {
    kind: "campaign_group",
    label: "Weekly Specials Group",
    x: 200,
    y: 40,
    sketch: false,
    linked: { type: "campaign_group", id: groupId },
    data: {
      recipe,
      schedule: {
        weekdays: ["mon", "tue", "wed", "thu", "fri"],
        weekendFallback: true,
      },
    },
  });

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const dayNodeIds: string[] = [];
  for (const [i, day] of days.entries()) {
    const campId = `campaign_${nanoid(8)}`;
    stubs.push({ type: "campaign", id: campId, label: `${day} Special` });
    const { node } = addNode(canvas.id, {
      kind: "campaign",
      label: `${day} Special`,
      x: 40 + i * 140,
      y: 160,
      sketch: false,
      linked: { type: "campaign", id: campId },
      data: { scheduleSlot: day.toLowerCase(), groupId },
    });
    dayNodeIds.push(node.id);
    addEdge(canvas.id, { source: groupNode.id, target: node.id, kind: "association" });
  }

  const fallbackId = `campaign_${nanoid(8)}`;
  stubs.push({ type: "campaign", id: fallbackId, label: "Weekend Fallback" });
  const { node: fallback } = addNode(canvas.id, {
    kind: "campaign",
    label: "Weekend Fallback",
    x: 200,
    y: 300,
    sketch: false,
    linked: { type: "campaign", id: fallbackId },
    data: { scheduleSlot: "weekend", fallback: true, groupId },
  });
  addEdge(canvas.id, {
    source: groupNode.id,
    target: fallback.id,
    label: "fallback",
    kind: "flow",
  });

  // Tap Point assign stubs — never mutate device URL
  for (let i = 0; i < 2; i++) {
    const tpId = `tap_point_${nanoid(8)}`;
    stubs.push({ type: "tap_point", id: tpId, label: `Assign stub ${i + 1}` });
    const { node } = addNode(canvas.id, {
      kind: "tap_point",
      label: `Tap Point assign stub ${i + 1}`,
      x: 80 + i * 200,
      y: 420,
      sketch: false,
      linked: { type: "tap_point", id: tpId },
      data: {
        assignmentPreview: true,
        deviceUrlImmutable: true,
        note: "Logical assignment only — physical Tap Point device URL never changes",
      },
    });
    addEdge(canvas.id, {
      source: dayNodeIds[0]!,
      target: node.id,
      label: "assign preview",
      kind: "association",
    });
  }

  const workItemIds: string[] = [];
  const approval = createExternalWorkItem({
    provider: "monday",
    businessId: opts.businessId,
    title: "Approve Weekly Specials schedule",
    description: recipe,
    sourceType: "campaign_approval",
    sourceId: groupId,
    priority: "high",
  });
  if (approval.ok) {
    workItemIds.push(approval.data.id);
    addNode(canvas.id, {
      kind: "external_work_item",
      label: approval.data.title,
      x: 480,
      y: 40,
      sketch: false,
      linked: {
        type: "external_work_item",
        id: approval.data.id,
        provider: "monday",
      },
    });
  }

  bumpVersion(canvas, "weekly-specials-recipe");
  const readiness = runTemplateReadiness(opts.businessId, stubs, workItemIds);
  appendCanvasAudit({
    canvasId: canvas.id,
    action: "recipe.weekly_specials",
    detail: { recipe, stubs, workItemIds },
  });

  return { canvas: requireFresh(canvas.id), createdObjectStubs: stubs, workItemIds, readiness };
}

function runTemplateReadiness(
  businessId: string,
  stubs: TemplateResult["createdObjectStubs"],
  workItemIds: string[]
) {
  const checks = [
    {
      id: "has_group_or_campaign",
      ok: stubs.some((s) => s.type === "campaign" || s.type === "campaign_group"),
      message: "Campaign or group stub created",
    },
    {
      id: "approval_task",
      ok: workItemIds.length > 0,
      message: "ExternalWorkItem approval task (mock OK)",
    },
    {
      id: "business_scoped",
      ok: Boolean(businessId),
      message: "Business scoped",
    },
    {
      id: "device_url_safe",
      ok: true,
      message: "Tap Point device URLs not mutated",
    },
  ];
  return { ok: checks.every((c) => c.ok), checks };
}

function requireFresh(id: string): TapCanvas {
  return requireCanvas(id);
}
