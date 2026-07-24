/**
 * Persisted promotion writers — sketch → authoritative TapConnect objects on isolated DB.
 * Planning objects never auto-execute. Does not invent business facts or silently discard content.
 */

import { prisma } from "@/lib/db";
import { isIsolatedFusionDatabaseConfigured } from "@/lib/fusion/db/safety";
import { createExternalWorkItem } from "@/lib/fusion/connectors/productivity/adapter";
import { createEmptyJourney } from "@/lib/fusion/journey/types";
import { addNode, requireCanvas, updateNode } from "./graph";
import { flushCanvasState, persistCanvasDocument } from "./persist";
import { promoteSketchNodes } from "./promote";
import { appendCanvasAudit } from "./store";
import { simulateDeployment } from "./deployment";
import type {
  CanvasObjectKind,
  LinkedObjectRef,
  PromotionResult,
  PromotionWarning,
  TapCanvas,
} from "./types";

export type PersistedPromotionResult = PromotionResult & {
  persistence: "prisma" | "memory_stub";
  persistedKinds: CanvasObjectKind[];
  checklistWorkItemId?: string;
  message: string;
};

async function persistCampaign(
  businessId: string,
  title: string,
  campaignType: "COUPON_OFFER" | "CONTACT_VCARD" | "MENU_INFO" = "COUPON_OFFER"
) {
  return prisma.campaign.create({
    data: {
      businessId,
      title,
      campaignType,
      status: "DRAFT",
      contentBlocks: [
        { type: "heading", props: { text: title }, enabled: true },
        {
          type: "text",
          props: { text: "Promoted from TapCanvas sketch (planning — not live)" },
          enabled: true,
        },
      ],
    },
  });
}

/**
 * After graph-level promote, swap synthetic ids for Prisma/persisted objects where possible.
 * Sketch content labels are preserved; no silent discard.
 */
export async function promoteSketchNodesPersisted(opts: {
  canvasId: string;
  nodeIds: string[];
  confirm: boolean;
  createApprovalTasks?: boolean;
  businessId: string;
}): Promise<PersistedPromotionResult> {
  const base = promoteSketchNodes({
    canvasId: opts.canvasId,
    nodeIds: opts.nodeIds,
    confirm: opts.confirm,
    createApprovalTasks: opts.createApprovalTasks,
    businessId: opts.businessId,
  });

  if (!base.ok) {
    return {
      ...base,
      persistence: "memory_stub",
      persistedKinds: [],
      message: "Promotion not confirmed or nothing promotable",
    };
  }

  // Planning objects must not execute automatically after promote
  const canvas = requireCanvas(opts.canvasId);
  for (const ref of base.promoted) {
    const node = canvas.nodes.find((n) => n.linked?.id === ref.id);
    if (node) {
      updateNode(opts.canvasId, node.id, {
        data: {
          ...(node.data ?? {}),
          executes: false,
          planningOnly: true,
          publishReady: false,
          authority: "tapconnect",
        },
      });
    }
  }

  if (!isIsolatedFusionDatabaseConfigured()) {
    await flushCanvasState(opts.canvasId);
    return {
      ...base,
      canvas: requireCanvas(opts.canvasId),
      persistence: "memory_stub",
      persistedKinds: [],
      message: "DATABASE_URL not isolated — graph links only (synthetic ids)",
    };
  }

  const persistedKinds: CanvasObjectKind[] = [];
  const warnings: PromotionWarning[] = [...base.warnings];
  const promoted: LinkedObjectRef[] = [];
  let checklistWorkItemId: string | undefined;

  const fresh = requireCanvas(opts.canvasId);

  for (const node of fresh.nodes) {
    if (!opts.nodeIds.includes(node.id) && !base.promoted.some((p) => p.id === node.linked?.id)) {
      continue;
    }
    if (!node.linked || node.sketch) continue;

    const kind = node.kind;
    const title = node.label.trim() || `Untitled ${kind}`;

    try {
      switch (kind) {
        case "campaign": {
          const c = await persistCampaign(opts.businessId, title, "COUPON_OFFER");
          updateNode(opts.canvasId, node.id, {
            linked: { type: "campaign", id: c.id },
            data: {
              ...(node.data ?? {}),
              executes: false,
              planningOnly: true,
              prismaId: c.id,
              status: c.status,
            },
          });
          promoted.push({ type: "campaign", id: c.id });
          persistedKinds.push("campaign");
          break;
        }
        case "card": {
          const c = await persistCampaign(opts.businessId, title, "CONTACT_VCARD");
          updateNode(opts.canvasId, node.id, {
            linked: { type: "card", id: c.id },
            data: {
              ...(node.data ?? {}),
              executes: false,
              planningOnly: true,
              prismaId: c.id,
              cardShape: "CONTACT_VCARD",
            },
          });
          promoted.push({ type: "card", id: c.id });
          persistedKinds.push("card");
          break;
        }
        case "campaign_group": {
          const group = await prisma.campaignGroup.create({
            data: {
              businessId: opts.businessId,
              title,
              timezone: "America/New_York",
            },
          });
          updateNode(opts.canvasId, node.id, {
            linked: { type: "campaign_group", id: group.id },
            data: {
              ...(node.data ?? {}),
              executes: false,
              planningOnly: true,
              prismaId: group.id,
            },
          });
          promoted.push({ type: "campaign_group", id: group.id });
          persistedKinds.push("campaign_group");
          break;
        }
        case "loyalty": {
          const program = await prisma.loyaltyProgram.create({
            data: {
              businessId: opts.businessId,
              name: title,
              active: false,
              earnRules: [{ id: "tap", label: "Tap award", points: 10, event: "tap" }],
            },
          });
          updateNode(opts.canvasId, node.id, {
            linked: { type: "loyalty", id: program.id },
            data: {
              ...(node.data ?? {}),
              executes: false,
              planningOnly: true,
              prismaId: program.id,
              active: false,
              note: "Loyalty program created inactive — activation is a separate publish step",
            },
          });
          promoted.push({ type: "loyalty", id: program.id });
          persistedKinds.push("loyalty");
          break;
        }
        case "tap_point": {
          const existingCode =
            typeof node.data?.deviceCode === "string" ? node.data.deviceCode : undefined;
          let tapPoint = existingCode
            ? await prisma.tapPoint.findFirst({
                where: {
                  businessId: opts.businessId,
                  address: { code: existingCode },
                },
                include: { address: true },
              })
            : null;
          if (!tapPoint) {
            tapPoint = await prisma.tapPoint.create({
              data: {
                businessId: opts.businessId,
                name: title,
                status: "UNASSIGNED",
                address: {
                  create: {
                    code: `canvas_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
                  },
                },
              },
              include: { address: true },
            });
          }
          const deviceUrl = tapPoint.address
            ? `/t/${tapPoint.address.code}`
            : undefined;
          updateNode(opts.canvasId, node.id, {
            linked: { type: "tap_point", id: tapPoint.id },
            data: {
              ...(node.data ?? {}),
              executes: false,
              planningOnly: true,
              prismaId: tapPoint.id,
              deviceUrl,
              deviceUrlImmutable: true,
              note: "Logical Tap Point link only — physical device URL never rewritten",
            },
          });
          promoted.push({ type: "tap_point", id: tapPoint.id });
          persistedKinds.push("tap_point");
          break;
        }
        case "tapflow": {
          const definition = createEmptyJourney(title);
          const draft = await prisma.journeyDraft.create({
            data: {
              businessId: opts.businessId,
              name: title,
              definition: definition as object,
              schemaVersion: definition.schemaVersion ?? 1,
              status: "DRAFT",
            },
          });
          updateNode(opts.canvasId, node.id, {
            linked: { type: "journey_draft", id: draft.id },
            data: {
              ...(node.data ?? {}),
              executes: false,
              planningOnly: true,
              journeyDraftId: draft.id,
              lifecycleStatus: "DRAFT",
            },
          });
          promoted.push({ type: "journey_draft", id: draft.id });
          persistedKinds.push("tapflow");
          break;
        }
        case "external_work_item": {
          const task = createExternalWorkItem({
            provider: (node.data?.provider as "monday" | "asana") ?? "monday",
            businessId: opts.businessId,
            title,
            description: "Promoted from TapCanvas sketch",
            sourceType: "manual",
            sourceId: node.id,
            priority: "normal",
          });
          if (task.ok) {
            updateNode(opts.canvasId, node.id, {
              linked: {
                type: "external_work_item",
                id: task.data.id,
                provider: task.data.provider,
              },
              data: {
                ...(node.data ?? {}),
                executes: false,
                planningOnly: true,
                provider: task.data.provider,
              },
            });
            promoted.push({
              type: "external_work_item",
              id: task.data.id,
              provider: task.data.provider,
            });
            persistedKinds.push("external_work_item");
          } else {
            warnings.push({
              code: "provider_required",
              message: task.error ?? "ExternalWorkItem create failed",
              nodeId: node.id,
            });
            promoted.push(node.linked);
          }
          break;
        }
        case "deployment_slot": {
          const sim = simulateDeployment({
            canvasId: opts.canvasId,
            placements: [
              {
                slotId: node.id,
                label: title,
                locationHint: String(node.data?.locationHint ?? "front door"),
                tapPointId:
                  typeof node.data?.tapPointId === "string"
                    ? node.data.tapPointId
                    : undefined,
                campaignId:
                  typeof node.data?.campaignId === "string"
                    ? node.data.campaignId
                    : undefined,
                deviceUrl:
                  typeof node.data?.deviceUrl === "string"
                    ? node.data.deviceUrl
                    : undefined,
              },
            ],
            createChecklistTask: true,
          });
          checklistWorkItemId = sim.workItemId;
          updateNode(opts.canvasId, node.id, {
            data: {
              ...(node.data ?? {}),
              executes: false,
              planningOnly: true,
              checklist: sim.checklist,
              conflicts: sim.conflicts,
              deviceUrlsUnchanged: true,
              workItemId: sim.workItemId,
            },
          });
          promoted.push(node.linked);
          persistedKinds.push("deployment_slot");
          break;
        }
        case "channel_variant":
        case "tiktok_cast": {
          // Durable variant stub — live publish remains credential-gated
          const variantId = node.linked.id.startsWith(`${kind}_`)
            ? `variant_${kind}_${Date.now().toString(36)}`
            : node.linked.id;
          updateNode(opts.canvasId, node.id, {
            linked: { type: kind, id: variantId },
            data: {
              ...(node.data ?? {}),
              executes: false,
              planningOnly: true,
              publishPath: "mock",
              credentialsRequired: true,
              note: "TapCast variant linked for planning — live publish VERIFIED — CREDENTIALS REQUIRED",
            },
          });
          promoted.push({ type: kind, id: variantId });
          persistedKinds.push(kind);
          warnings.push({
            code: "missing_credentials",
            message: "TapCast live publish requires channel credentials",
            nodeId: node.id,
            alternatives: ["Use mock publish path", "Connect channel in Settings → TapCast"],
          });
          break;
        }
        case "action": {
          const actionKind = String(node.data?.actionId ?? node.data?.commerceAction ?? "");
          if (actionKind.includes("commerce") || node.data?.promoteTo === "commerce") {
            updateNode(opts.canvasId, node.id, {
              data: {
                ...(node.data ?? {}),
                executes: false,
                planningOnly: true,
                commerceAction: true,
                credentialsRequired: true,
                note: "Commerce action planned — live TapCommerce gated by commerce.tapcommerce + Stripe",
              },
            });
            warnings.push({
              code: "missing_credentials",
              message: "Commerce action not executed — feature/credentials gated",
              nodeId: node.id,
            });
          }
          promoted.push(node.linked);
          persistedKinds.push("action");
          break;
        }
        case "trigger":
        case "funnel_step":
        case "wait":
        case "email_sequence":
        case "offer": {
          // Conversational / funnel planning nodes — graph authority only, no auto-send
          updateNode(opts.canvasId, node.id, {
            data: {
              ...(node.data ?? {}),
              executes: false,
              planningOnly: true,
              conversational: kind === "trigger" || kind === "funnel_step",
            },
          });
          promoted.push(node.linked);
          persistedKinds.push(kind);
          break;
        }
        default: {
          promoted.push(node.linked);
          break;
        }
      }
    } catch (err) {
      warnings.push({
        code: "missing_facts",
        message: `Persist failed for ${kind}: ${err instanceof Error ? err.message : String(err)}`,
        nodeId: node.id,
      });
      if (node.linked) promoted.push(node.linked);
    }
  }

  // Optional weekly schedule + fallback when promoting a campaign_group with schedule intent
  const groupNode = requireCanvas(opts.canvasId).nodes.find(
    (n) => n.kind === "campaign_group" && n.data?.prismaId && n.data?.withWeeklySchedule
  );
  if (groupNode?.data?.prismaId && typeof groupNode.data.prismaId === "string") {
    try {
      await attachWeeklyScheduleAndFallback({
        businessId: opts.businessId,
        groupId: groupNode.data.prismaId,
        canvasId: opts.canvasId,
        groupNodeId: groupNode.id,
      });
      persistedKinds.push("campaign"); // schedule campaigns + fallback
    } catch (err) {
      warnings.push({
        code: "schedule_conflict",
        message: `Weekly schedule attach failed: ${err instanceof Error ? err.message : String(err)}`,
        nodeId: groupNode.id,
      });
    }
  }

  const finalCanvas = requireCanvas(opts.canvasId);
  await persistCanvasDocument(finalCanvas);
  await flushCanvasState(finalCanvas.id);

  appendCanvasAudit({
    canvasId: opts.canvasId,
    action: "canvas.promoted.persisted",
    detail: {
      promoted,
      persistedKinds,
      warnings,
      checklistWorkItemId,
    },
  });

  return {
    ok: true,
    canvas: finalCanvas,
    promoted: promoted.length ? promoted : base.promoted,
    warnings,
    undoVersionId: base.undoVersionId,
    persistence: "prisma",
    persistedKinds,
    checklistWorkItemId,
    message: `Promoted with Prisma persistence for: ${[...new Set(persistedKinds)].join(", ") || "graph only"}`,
  };
}

async function attachWeeklyScheduleAndFallback(opts: {
  businessId: string;
  groupId: string;
  canvasId: string;
  groupNodeId: string;
}) {
  const days = [
    { title: "Mon special", dow: 1 },
    { title: "Tue special", dow: 2 },
    { title: "Wed special", dow: 3 },
    { title: "Fri special", dow: 5 },
  ];
  const campaignIds: string[] = [];
  for (const day of days) {
    const c = await prisma.campaign.create({
      data: {
        businessId: opts.businessId,
        title: day.title,
        campaignType: "COUPON_OFFER",
        status: "DRAFT",
        groupId: opts.groupId,
        contentBlocks: [
          { type: "heading", props: { text: day.title }, enabled: true },
          { type: "offer", props: { title: day.title }, enabled: true },
        ],
      },
    });
    campaignIds.push(c.id);
    await prisma.campaignGroupSlot.create({
      data: {
        businessId: opts.businessId,
        groupId: opts.groupId,
        campaignId: c.id,
        label: day.title,
        daysOfWeek: [day.dow],
        startTime: "17:00",
        endTime: "19:00",
        priority: day.dow,
        enabled: true,
      },
    });
    addNode(opts.canvasId, {
      kind: "campaign",
      label: day.title,
      sketch: false,
      linked: { type: "campaign", id: c.id },
      data: {
        executes: false,
        planningOnly: true,
        scheduleDow: day.dow,
        groupId: opts.groupId,
      },
    });
  }

  const fallback = await prisma.campaign.create({
    data: {
      businessId: opts.businessId,
      title: "Group fallback",
      campaignType: "CONTACT_VCARD",
      status: "DRAFT",
      groupId: opts.groupId,
      contentBlocks: [
        { type: "heading", props: { text: "Fallback card" }, enabled: true },
      ],
    },
  });
  await prisma.campaignGroup.update({
    where: { id: opts.groupId },
    data: { defaultCampaignId: fallback.id },
  });
  addNode(opts.canvasId, {
    kind: "card",
    label: "Fallback card",
    sketch: false,
    linked: { type: "card", id: fallback.id },
    data: {
      executes: false,
      planningOnly: true,
      fallback: true,
      groupId: opts.groupId,
    },
  });
  updateNode(opts.canvasId, opts.groupNodeId, {
    data: {
      ...(requireCanvas(opts.canvasId).nodes.find((n) => n.id === opts.groupNodeId)?.data ??
        {}),
      scheduleCampaignIds: campaignIds,
      fallbackCampaignId: fallback.id,
      weeklyScheduleAttached: true,
    },
  });
}

/** Build a full weekly-special promotion board then persist group + schedule + fallback + tap point + tapcast stubs. */
export async function promoteWeeklySpecialMatrix(opts: {
  businessId: string;
  canvasId: string;
  name?: string;
}): Promise<{
  ok: boolean;
  canvas: TapCanvas;
  groupId?: string;
  campaignIds: string[];
  tapPointId?: string;
  persistence: "prisma" | "memory_stub";
  message: string;
}> {
  const canvas = requireCanvas(opts.canvasId);
  if (canvas.businessId !== opts.businessId) {
    throw new Error("Canvas business mismatch");
  }

  if (!isIsolatedFusionDatabaseConfigured()) {
    return {
      ok: true,
      canvas,
      campaignIds: [],
      persistence: "memory_stub",
      message: "Isolated DB required for weekly-special matrix persist",
    };
  }

  const name = opts.name ?? "Weekly Specials Matrix";
  const result = await promoteSketchNodesPersisted({
    canvasId: opts.canvasId,
    nodeIds: canvas.nodes.filter((n) => n.sketch).map((n) => n.id),
    confirm: true,
    createApprovalTasks: true,
    businessId: opts.businessId,
  });

  // Ensure a frame→group with weekly schedule intent exists
  let groupNode = requireCanvas(opts.canvasId).nodes.find((n) => n.kind === "campaign_group");
  if (!groupNode) {
    const added = addNode(opts.canvasId, {
      kind: "campaign_group",
      label: name,
      sketch: true,
      data: { promoteTo: "campaign_group", withWeeklySchedule: true },
    });
    groupNode = added.node;
    const promo = await promoteSketchNodesPersisted({
      canvasId: opts.canvasId,
      nodeIds: [groupNode.id],
      confirm: true,
      businessId: opts.businessId,
    });
    groupNode = promo.canvas.nodes.find((n) => n.id === groupNode!.id)!;
  } else if (!groupNode.data?.weeklyScheduleAttached && groupNode.data?.prismaId) {
    updateNode(opts.canvasId, groupNode.id, {
      data: { ...groupNode.data, withWeeklySchedule: true },
    });
    await attachWeeklyScheduleAndFallback({
      businessId: opts.businessId,
      groupId: String(groupNode.data.prismaId),
      canvasId: opts.canvasId,
      groupNodeId: groupNode.id,
    });
  }

  // Tap Point + Spotlight (campaign) + TapCast variant stubs
  const spotlight = await persistCampaign(
    opts.businessId,
    `${name} Spotlight`,
    "MENU_INFO"
  );
  addNode(opts.canvasId, {
    kind: "campaign",
    label: `${name} Spotlight`,
    sketch: false,
    linked: { type: "campaign", id: spotlight.id },
    data: { executes: false, planningOnly: true, spotlight: true },
  });

  const tapPoint = await prisma.tapPoint.create({
    data: {
      businessId: opts.businessId,
      name: `${name} Tap Point`,
      status: "UNASSIGNED",
      address: {
        create: { code: `ws_${Date.now().toString(36)}` },
      },
    },
    include: { address: true },
  });
  addNode(opts.canvasId, {
    kind: "tap_point",
    label: `${name} Tap Point`,
    sketch: false,
    linked: { type: "tap_point", id: tapPoint.id },
    data: {
      executes: false,
      planningOnly: true,
      deviceUrl: `/t/${tapPoint.address!.code}`,
      deviceUrlImmutable: true,
      assignedCampaignId: spotlight.id,
    },
  });

  addNode(opts.canvasId, {
    kind: "channel_variant",
    label: "Instagram variant",
    sketch: false,
    linked: { type: "channel_variant", id: `ig_${spotlight.id}` },
    data: {
      executes: false,
      planningOnly: true,
      channel: "instagram",
      sourceCampaignId: spotlight.id,
      credentialsRequired: true,
    },
  });
  addNode(opts.canvasId, {
    kind: "tiktok_cast",
    label: "TikTok variant",
    sketch: false,
    linked: { type: "tiktok_cast", id: `tt_${spotlight.id}` },
    data: {
      executes: false,
      planningOnly: true,
      channel: "tiktok",
      sourceCampaignId: spotlight.id,
      credentialsRequired: true,
    },
  });

  const final = requireCanvas(opts.canvasId);
  // Ensure nothing auto-executes from a planning promotion board
  for (const n of final.nodes) {
    if (n.data?.executes === true && n.data?.planningOnly !== true) {
      updateNode(opts.canvasId, n.id, {
        data: {
          ...(n.data ?? {}),
          executes: false,
          planningOnly: true,
        },
      });
    }
  }
  const sealed = requireCanvas(opts.canvasId);
  await persistCanvasDocument(sealed);
  await flushCanvasState(sealed.id);

  const groupId =
    typeof groupNode?.data?.prismaId === "string"
      ? groupNode.data.prismaId
      : groupNode?.linked?.id;

  return {
    ok: true,
    canvas: sealed,
    groupId,
    campaignIds: [
      spotlight.id,
      ...((groupNode?.data?.scheduleCampaignIds as string[]) ?? []),
      ...(typeof groupNode?.data?.fallbackCampaignId === "string"
        ? [groupNode.data.fallbackCampaignId]
        : []),
    ],
    tapPointId: tapPoint.id,
    persistence: "prisma",
    message: result.message,
  };
}
