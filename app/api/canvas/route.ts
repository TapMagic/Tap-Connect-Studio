import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusiness } from "@/lib/auth";
import {
  addConversationalAction,
  addConversationalTrigger,
  addSketchNote,
  addStickyNote,
  applyCanvasTemplate,
  applyNodeEditToAuthoritative,
  assertSketchNonExecuting,
  connectSketch,
  createSketchBoard,
  createWeeklySpecialsGroup,
  detectIssues,
  detectScheduleConflicts,
  evaluateCanvasAction,
  getCanvas,
  getOpenInTapCanvasHref,
  listCanvasAudit,
  listCanvases,
  listCanvasTemplates,
  listPendingProposals,
  listVersions,
  previewAutomationProposal,
  previewPromotion,
  promoteSketchNodes,
  refreshOperateOverlay,
  resolveAutomationProposal,
  reverseEngineerIntoCanvas,
  setCanvasMode,
  simulateDeployment,
  undoPromotion,
  ACTION_CATALOG,
  TRIGGER_CATALOG,
} from "@/lib/fusion/canvas";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { business } = await requireBusiness();
  const url = new URL(req.url);
  const canvasId = url.searchParams.get("canvasId");

  if (canvasId) {
    const canvas = getCanvas(canvasId);
    if (!canvas || canvas.businessId !== business.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({
      canvas,
      versions: listVersions(canvasId),
      proposals: listPendingProposals(canvasId),
      audit: listCanvasAudit(canvasId),
      sketchGuard: assertSketchNonExecuting(canvas),
      openHref: getOpenInTapCanvasHref({
        objectType: "canvas",
        objectId: canvasId,
        canvasId,
      }),
      catalogs: { triggers: TRIGGER_CATALOG, actions: ACTION_CATALOG },
      templates: listCanvasTemplates(),
    });
  }

  return NextResponse.json({
    canvases: listCanvases(business.id),
    templates: listCanvasTemplates(),
    catalogs: { triggers: TRIGGER_CATALOG, actions: ACTION_CATALOG },
    displayStatus: "development",
    note: "TapCanvas — linked projections of TapConnect objects. In-memory store (Prisma follow-up).",
  });
}

const bodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    name: z.string().min(1).max(120).optional(),
  }),
  z.object({
    action: z.literal("set_mode"),
    canvasId: z.string(),
    mode: z.enum(["sketch", "build", "operate", "analyze"]),
  }),
  z.object({
    action: z.literal("add_sticky"),
    canvasId: z.string(),
    label: z.string().min(1),
  }),
  z.object({
    action: z.literal("add_note"),
    canvasId: z.string(),
    label: z.string().min(1),
  }),
  z.object({
    action: z.literal("connect_sketch"),
    canvasId: z.string(),
    source: z.string(),
    target: z.string(),
    label: z.string().optional(),
  }),
  z.object({
    action: z.literal("preview_promote"),
    canvasId: z.string(),
    nodeIds: z.array(z.string()).min(1),
  }),
  z.object({
    action: z.literal("promote"),
    canvasId: z.string(),
    nodeIds: z.array(z.string()).min(1),
    confirm: z.boolean(),
    createApprovalTasks: z.boolean().optional(),
  }),
  z.object({
    action: z.literal("undo_promote"),
    canvasId: z.string(),
    undoVersionId: z.string(),
  }),
  z.object({
    action: z.literal("operate_refresh"),
    canvasId: z.string(),
  }),
  z.object({
    action: z.literal("reverse_viz"),
    name: z.string().optional(),
    objects: z.array(
      z.object({
        type: z.string(),
        id: z.string(),
        label: z.string(),
        provider: z.string().optional(),
        status: z.string().optional(),
      })
    ),
    associations: z
      .array(
        z.object({
          fromId: z.string(),
          toId: z.string(),
          label: z.string().optional(),
        })
      )
      .optional(),
  }),
  z.object({
    action: z.literal("detect_issues"),
    canvasId: z.string(),
  }),
  z.object({
    action: z.literal("proposal_preview"),
    proposalId: z.string(),
  }),
  z.object({
    action: z.literal("proposal_resolve"),
    proposalId: z.string(),
    decision: z.enum(["accept", "reject"]),
  }),
  z.object({
    action: z.literal("apply_template"),
    templateId: z.enum([
      "simple_campaign",
      "weekly_specials",
      "campaign_group",
      "card",
      "offer",
      "funnel",
      "email_sequence",
      "tapflow",
      "loyalty",
      "deployment_map",
      "service_approval",
    ]),
    name: z.string().optional(),
  }),
  z.object({
    action: z.literal("weekly_specials"),
    name: z.string().optional(),
    recipe: z.string().optional(),
  }),
  z.object({
    action: z.literal("add_trigger"),
    canvasId: z.string(),
    triggerId: z.enum([
      "tap_scan",
      "keep_card",
      "keyword",
      "schedule",
      "work_item_completed",
      "tiktok_engagement",
    ]),
  }),
  z.object({
    action: z.literal("add_action"),
    canvasId: z.string(),
    actionId: z.enum([
      "send_email",
      "send_dm",
      "send_sms",
      "create_work_item",
      "assign_tap_point",
      "wait",
      "tag_contact",
      "open_wallet",
    ]),
    consentGiven: z.boolean().optional(),
    providerReady: z.boolean().optional(),
  }),
  z.object({
    action: z.literal("evaluate_action"),
    actionId: z.enum([
      "send_email",
      "send_dm",
      "send_sms",
      "create_work_item",
      "assign_tap_point",
      "wait",
      "tag_contact",
      "open_wallet",
    ]),
    consentGiven: z.boolean().optional(),
    providerReady: z.boolean().optional(),
  }),
  z.object({
    action: z.literal("deploy_simulate"),
    canvasId: z.string(),
    placements: z.array(
      z.object({
        slotId: z.string(),
        label: z.string(),
        locationHint: z.string(),
        tapPointId: z.string().optional(),
        campaignId: z.string().optional(),
        deviceUrl: z.string().optional(),
      })
    ),
    createChecklistTask: z.boolean().optional(),
  }),
  z.object({
    action: z.literal("schedule_conflicts"),
    slots: z.array(
      z.object({
        id: z.string(),
        start: z.string(),
        end: z.string(),
        campaignId: z.string(),
      })
    ),
  }),
  z.object({
    action: z.literal("node_edit_authoritative"),
    canvasId: z.string(),
    nodeId: z.string(),
    patch: z.object({
      label: z.string().optional(),
      status: z.string().optional(),
      description: z.string().optional(),
    }),
    confirm: z.boolean(),
  }),
]);

export async function POST(req: Request) {
  const { business } = await requireBusiness();
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const body = parsed.data;
  try {
    switch (body.action) {
      case "create": {
        const canvas = createSketchBoard({
          businessId: business.id,
          name: body.name,
        });
        return NextResponse.json({ ok: true, canvas });
      }
      case "set_mode": {
        const canvas = setCanvasMode(body.canvasId, body.mode);
        return NextResponse.json({ ok: true, canvas });
      }
      case "add_sticky": {
        const result = addStickyNote(body.canvasId, body.label);
        return NextResponse.json({ ok: true, ...result });
      }
      case "add_note": {
        const result = addSketchNote(body.canvasId, body.label);
        return NextResponse.json({ ok: true, ...result });
      }
      case "connect_sketch": {
        const result = connectSketch(
          body.canvasId,
          body.source,
          body.target,
          body.label
        );
        return NextResponse.json({ ok: true, ...result });
      }
      case "preview_promote":
        return NextResponse.json({
          ok: true,
          ...previewPromotion(body.canvasId, body.nodeIds),
        });
      case "promote": {
        const result = promoteSketchNodes({
          canvasId: body.canvasId,
          nodeIds: body.nodeIds,
          confirm: body.confirm,
          createApprovalTasks: body.createApprovalTasks,
          businessId: business.id,
        });
        return NextResponse.json(result);
      }
      case "undo_promote": {
        const canvas = undoPromotion(body.canvasId, body.undoVersionId);
        return NextResponse.json({ ok: true, canvas });
      }
      case "operate_refresh": {
        const overlay = refreshOperateOverlay(body.canvasId, business.id);
        return NextResponse.json({ ok: true, overlay });
      }
      case "reverse_viz": {
        const canvas = reverseEngineerIntoCanvas({
          businessId: business.id,
          name: body.name,
          objects: body.objects.map((o) => ({
            ...o,
            type: o.type as never,
          })),
          associations: body.associations,
        });
        return NextResponse.json({ ok: true, canvas });
      }
      case "detect_issues": {
        const proposals = detectIssues(body.canvasId);
        return NextResponse.json({ ok: true, proposals });
      }
      case "proposal_preview": {
        const result = previewAutomationProposal(body.proposalId);
        return NextResponse.json({ ok: true, ...result, applied: false });
      }
      case "proposal_resolve": {
        const result = resolveAutomationProposal({
          proposalId: body.proposalId,
          decision: body.decision,
        });
        return NextResponse.json({ ok: true, ...result });
      }
      case "apply_template": {
        const result = applyCanvasTemplate({
          businessId: business.id,
          templateId: body.templateId,
          name: body.name,
        });
        return NextResponse.json({ ok: true, ...result });
      }
      case "weekly_specials": {
        const result = createWeeklySpecialsGroup({
          businessId: business.id,
          name: body.name,
          recipe: body.recipe,
        });
        return NextResponse.json({ ok: true, ...result });
      }
      case "add_trigger": {
        const result = addConversationalTrigger(body.canvasId, body.triggerId);
        return NextResponse.json({ ok: true, ...result });
      }
      case "add_action": {
        const result = addConversationalAction(body.canvasId, body.actionId, {
          businessId: business.id,
          consentGiven: body.consentGiven,
          providerReady: body.providerReady,
        });
        return NextResponse.json({ ok: true, ...result });
      }
      case "evaluate_action": {
        const evaluation = evaluateCanvasAction({
          actionId: body.actionId,
          businessId: business.id,
          consentGiven: body.consentGiven,
          providerReady: body.providerReady,
        });
        return NextResponse.json({ ok: true, evaluation });
      }
      case "deploy_simulate": {
        const result = simulateDeployment({
          canvasId: body.canvasId,
          placements: body.placements,
          createChecklistTask: body.createChecklistTask,
        });
        return NextResponse.json({ ok: true, ...result });
      }
      case "schedule_conflicts": {
        const conflicts = detectScheduleConflicts({ slots: body.slots });
        return NextResponse.json({ ok: true, conflicts });
      }
      case "node_edit_authoritative": {
        const result = applyNodeEditToAuthoritative({
          canvasId: body.canvasId,
          nodeId: body.nodeId,
          patch: body.patch,
          confirm: body.confirm,
        });
        return NextResponse.json(result);
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Canvas error" },
      { status: 400 }
    );
  }
}
