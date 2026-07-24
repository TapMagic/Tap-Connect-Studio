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
  bindKeywordTriggerFromBrandPack,
  canvasPersistenceEnabled,
  compareCanvasVersions,
  connectSketch,
  createSimpleCampaignViaCanvas,
  createSketchBoard,
  createWeeklySpecialsGroup,
  createWeeklySpecialsViaCanvas,
  detectIssues,
  detectScheduleConflicts,
  duplicateCanvasDocument,
  evaluateCanvasAction,
  flushCanvasState,
  getCanvas,
  getOpenInTapCanvasHref,
  hydrateCanvasSession,
  hydrateProposalSession,
  listCanvasAudit,
  listCanvasesFromDb,
  listCanvasTemplates,
  listPendingProposals,
  listVersions,
  openObjectInTapCanvas,
  previewAutomationProposal,
  previewPromotion,
  primaryKeywordForBinding,
  promoteSketchNodes,
  refreshOperateOverlay,
  renameCanvasDocument,
  resolveAutomationProposal,
  restoreVersion,
  reverseEngineerIntoCanvas,
  saveCanvasIssues,
  saveExecutionOverlay,
  setCanvasMode,
  simulateDeployment,
  undoPromotion,
  addCanvasCommentDb,
  ACTION_CATALOG,
  TRIGGER_CATALOG,
} from "@/lib/fusion/canvas";
import {
  buildCampaignDistributionGraph,
  DISTRIBUTION_ACTIONS,
  runDistributionAction,
} from "@/lib/fusion/tapcast/omnichannel";
import {
  detectAndBindTrigger,
  loadVocabularyPack,
} from "@/lib/fusion/keywords";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { business } = await requireBusiness();
  const url = new URL(req.url);
  const canvasId = url.searchParams.get("canvasId");

  if (canvasId) {
    const canvas = await hydrateCanvasSession(canvasId, business.id);
    if (!canvas || canvas.businessId !== business.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({
      canvas,
      versions: listVersions(canvasId),
      proposals: listPendingProposals(canvasId),
      audit: listCanvasAudit(canvasId),
      sketchGuard: assertSketchNonExecuting(canvas),
      persistence: canvasPersistenceEnabled() ? "prisma" : "memory",
      openHref: getOpenInTapCanvasHref({
        objectType: "canvas",
        objectId: canvasId,
        canvasId,
      }),
      catalogs: { triggers: TRIGGER_CATALOG, actions: ACTION_CATALOG },
      distributionActions: DISTRIBUTION_ACTIONS,
      templates: listCanvasTemplates(),
    });
  }

  const canvases = await listCanvasesFromDb(business.id);
  return NextResponse.json({
    canvases,
    templates: listCanvasTemplates(),
    catalogs: { triggers: TRIGGER_CATALOG, actions: ACTION_CATALOG },
    distributionActions: DISTRIBUTION_ACTIONS,
    persistence: canvasPersistenceEnabled() ? "prisma" : "memory",
    displayStatus: canvasPersistenceEnabled()
      ? "implemented_not_owner_ready"
      : "functional_prototype_memory_only",
    note: canvasPersistenceEnabled()
      ? "TapCanvas documents persist on tapconnect_fusion_dev. Live TikTok/social remain credential-gated."
      : "DATABASE_URL not isolated — memory fallback for unit tests only.",
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
    canvasId: z.string().optional(),
  }),
  z.object({
    action: z.literal("proposal_resolve"),
    proposalId: z.string(),
    decision: z.enum(["accept", "reject"]),
    canvasId: z.string().optional(),
  }),
  z.object({
    action: z.literal("restore_version"),
    canvasId: z.string(),
    versionId: z.string(),
  }),
  z.object({
    action: z.literal("compare_versions"),
    canvasId: z.string(),
    leftVersionId: z.string(),
    rightVersionId: z.string(),
  }),
  z.object({
    action: z.literal("open_from_object"),
    objectType: z.string().min(1).max(64),
    objectId: z.string().min(1).max(120),
    label: z.string().max(160).optional(),
    canvasId: z.string().optional(),
    provider: z.string().max(64).optional(),
    status: z.string().max(64).optional(),
  }),
  z.object({
    action: z.literal("bind_keyword_trigger"),
    canvasId: z.string(),
    extraTriggers: z.array(z.string().max(80)).max(24).optional(),
    bindVocabulary: z.boolean().optional(),
    canonicalValue: z.string().max(80).optional(),
  }),
  z.object({
    action: z.literal("add_comment"),
    canvasId: z.string(),
    body: z.string().min(1).max(2000),
    nodeId: z.string().optional(),
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
  z.object({
    action: z.literal("create_simple_campaign"),
    title: z.string().min(1).max(160),
  }),
  z.object({
    action: z.literal("create_weekly_specials_persisted"),
    name: z.string().optional(),
    timezone: z.string().optional(),
  }),
  z.object({
    action: z.literal("rename"),
    canvasId: z.string(),
    name: z.string().min(1).max(120),
  }),
  z.object({
    action: z.literal("duplicate"),
    canvasId: z.string(),
    name: z.string().optional(),
  }),
  z.object({
    action: z.literal("flush"),
    canvasId: z.string(),
  }),
  z.object({
    action: z.literal("distribution_graph"),
    campaignId: z.string(),
    campaignTitle: z.string(),
    channelIds: z.array(z.string()).min(1),
    source: z.object({
      title: z.string().min(1),
      body: z.string().optional(),
      offerText: z.string().optional(),
      cta: z.string().optional(),
      hashtags: z.array(z.string()).optional(),
      mediaUrl: z.string().optional(),
      tapPointId: z.string().optional(),
      cardId: z.string().optional(),
    }),
    canvasId: z.string().optional(),
    canvasName: z.string().optional(),
  }),
  z.object({
    action: z.literal("distribution_action"),
    canvasId: z.string(),
    distributionAction: z.enum([
      "create_variant",
      "adapt",
      "approve",
      "schedule",
      "publish",
      "retry",
      "open_provider",
      "performance",
    ]),
    variantId: z.string().optional(),
    channelId: z.string().optional(),
    campaignId: z.string().optional(),
    scheduledAt: z.string().optional(),
    decision: z.enum(["approve", "reject"]).optional(),
    source: z
      .object({
        title: z.string().min(1),
        body: z.string().optional(),
        offerText: z.string().optional(),
        cta: z.string().optional(),
        hashtags: z.array(z.string()).optional(),
      })
      .optional(),
  }),
]);

async function afterMutate(canvasId: string) {
  await flushCanvasState(canvasId);
}

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
        await afterMutate(canvas.id);
        return NextResponse.json({
          ok: true,
          canvas,
          persistence: canvasPersistenceEnabled() ? "prisma" : "memory",
        });
      }
      case "set_mode": {
        await hydrateCanvasSession(body.canvasId, business.id);
        const canvas = setCanvasMode(body.canvasId, body.mode);
        await afterMutate(canvas.id);
        return NextResponse.json({ ok: true, canvas });
      }
      case "add_sticky": {
        await hydrateCanvasSession(body.canvasId, business.id);
        const result = addStickyNote(body.canvasId, body.label);
        await afterMutate(body.canvasId);
        return NextResponse.json({ ok: true, ...result });
      }
      case "add_note": {
        await hydrateCanvasSession(body.canvasId, business.id);
        const result = addSketchNote(body.canvasId, body.label);
        await afterMutate(body.canvasId);
        return NextResponse.json({ ok: true, ...result });
      }
      case "connect_sketch": {
        await hydrateCanvasSession(body.canvasId, business.id);
        const result = connectSketch(
          body.canvasId,
          body.source,
          body.target,
          body.label
        );
        await afterMutate(body.canvasId);
        return NextResponse.json({ ok: true, ...result });
      }
      case "preview_promote":
        await hydrateCanvasSession(body.canvasId, business.id);
        return NextResponse.json({
          ok: true,
          ...previewPromotion(body.canvasId, body.nodeIds),
        });
      case "promote": {
        await hydrateCanvasSession(body.canvasId, business.id);
        const result = promoteSketchNodes({
          canvasId: body.canvasId,
          nodeIds: body.nodeIds,
          confirm: body.confirm,
          createApprovalTasks: body.createApprovalTasks,
          businessId: business.id,
        });
        await afterMutate(body.canvasId);
        return NextResponse.json(result);
      }
      case "undo_promote": {
        await hydrateCanvasSession(body.canvasId, business.id);
        const canvas = undoPromotion(body.canvasId, body.undoVersionId);
        await afterMutate(body.canvasId);
        return NextResponse.json({ ok: true, canvas });
      }
      case "operate_refresh": {
        await hydrateCanvasSession(body.canvasId, business.id);
        const overlay = refreshOperateOverlay(body.canvasId, business.id);
        await saveExecutionOverlay(body.canvasId, overlay as never);
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
        await afterMutate(canvas.id);
        return NextResponse.json({ ok: true, canvas });
      }
      case "detect_issues": {
        await hydrateCanvasSession(body.canvasId, business.id);
        const proposals = detectIssues(body.canvasId);
        await saveCanvasIssues(
          body.canvasId,
          proposals.map((p) => ({
            code: p.title,
            severity: p.severity,
            message: p.description,
          }))
        );
        await afterMutate(body.canvasId);
        return NextResponse.json({ ok: true, proposals });
      }
      case "proposal_preview": {
        if (body.canvasId) {
          await hydrateCanvasSession(body.canvasId, business.id);
        } else {
          await hydrateProposalSession(body.proposalId, business.id);
        }
        const result = previewAutomationProposal(body.proposalId);
        if (result.proposal.canvasId) {
          await afterMutate(result.proposal.canvasId);
        }
        return NextResponse.json({ ok: true, ...result, applied: false });
      }
      case "proposal_resolve": {
        if (body.canvasId) {
          await hydrateCanvasSession(body.canvasId, business.id);
        } else {
          await hydrateProposalSession(body.proposalId, business.id);
        }
        const result = resolveAutomationProposal({
          proposalId: body.proposalId,
          decision: body.decision,
        });
        if (result.canvas) await afterMutate(result.canvas.id);
        else if (result.proposal.canvasId) await afterMutate(result.proposal.canvasId);
        return NextResponse.json({
          ok: true,
          ...result,
          persistence: canvasPersistenceEnabled() ? "prisma" : "memory",
          message:
            body.decision === "accept"
              ? "Repair accepted — authoritative graph + version/audit persisted"
              : "Repair rejected — no graph mutation",
        });
      }
      case "restore_version": {
        await hydrateCanvasSession(body.canvasId, business.id);
        const canvas = restoreVersion(body.canvasId, body.versionId);
        await afterMutate(body.canvasId);
        return NextResponse.json({
          ok: true,
          canvas,
          versions: listVersions(body.canvasId),
          message: "Version restored — new snapshot recorded",
          persistence: canvasPersistenceEnabled() ? "prisma" : "memory",
        });
      }
      case "compare_versions": {
        await hydrateCanvasSession(body.canvasId, business.id);
        const diff = compareCanvasVersions(
          body.canvasId,
          body.leftVersionId,
          body.rightVersionId
        );
        return NextResponse.json({ ok: true, diff });
      }
      case "open_from_object": {
        if (body.canvasId) {
          await hydrateCanvasSession(body.canvasId, business.id);
        }
        const canvas = openObjectInTapCanvas({
          businessId: business.id,
          objectType: body.objectType,
          objectId: body.objectId,
          label: body.label,
          canvasId: body.canvasId,
          provider: body.provider,
          status: body.status,
        });
        await afterMutate(canvas.id);
        return NextResponse.json({
          ok: true,
          canvas,
          persistence: canvasPersistenceEnabled() ? "prisma" : "memory",
          message: "Reverse visualization projected from linked object",
          openHref: getOpenInTapCanvasHref({
            objectType: body.objectType,
            objectId: body.objectId,
            canvasId: canvas.id,
          }),
        });
      }
      case "bind_keyword_trigger": {
        await hydrateCanvasSession(body.canvasId, business.id);
        const pack = await loadVocabularyPack(business.id);
        const bound = bindKeywordTriggerFromBrandPack(
          body.canvasId,
          pack,
          body.extraTriggers ?? []
        );
        let vocabularyBinding: unknown = null;
        if (body.bindVocabulary !== false) {
          const canonical =
            body.canonicalValue ??
            primaryKeywordForBinding(pack, body.extraTriggers ?? []);
          if (canonical) {
            vocabularyBinding = await detectAndBindTrigger({
              businessId: business.id,
              binding: {
                flowId: body.canvasId,
                flowLabel: getCanvas(body.canvasId)?.name ?? "TapCanvas",
                canonicalValue: canonical,
                channel: "tapcanvas",
                matchMode: "case_insensitive",
              },
            });
          }
        }
        await afterMutate(body.canvasId);
        return NextResponse.json({
          ok: true,
          ...bound,
          vocabularyBinding,
          persistence: canvasPersistenceEnabled() ? "prisma" : "memory",
          message: "Keyword trigger bound from Brand Vocabulary",
        });
      }
      case "add_comment": {
        await hydrateCanvasSession(body.canvasId, business.id);
        const comment = await addCanvasCommentDb({
          documentId: body.canvasId,
          body: body.body,
          nodeId: body.nodeId,
        });
        return NextResponse.json({ ok: true, comment });
      }
      case "apply_template": {
        const result = applyCanvasTemplate({
          businessId: business.id,
          templateId: body.templateId,
          name: body.name,
        });
        await afterMutate(result.canvas.id);
        return NextResponse.json({ ok: true, ...result });
      }
      case "weekly_specials": {
        const result = createWeeklySpecialsGroup({
          businessId: business.id,
          name: body.name,
          recipe: body.recipe,
        });
        await afterMutate(result.canvas.id);
        return NextResponse.json({ ok: true, ...result });
      }
      case "create_simple_campaign": {
        const result = await createSimpleCampaignViaCanvas({
          businessId: business.id,
          title: body.title,
        });
        return NextResponse.json(result);
      }
      case "create_weekly_specials_persisted": {
        const result = await createWeeklySpecialsViaCanvas({
          businessId: business.id,
          name: body.name,
          timezone: body.timezone,
        });
        return NextResponse.json(result);
      }
      case "rename": {
        const canvas = await renameCanvasDocument(
          body.canvasId,
          business.id,
          body.name
        );
        if (!canvas) return NextResponse.json({ error: "Not found" }, { status: 404 });
        return NextResponse.json({ ok: true, canvas });
      }
      case "duplicate": {
        const canvas = await duplicateCanvasDocument(
          body.canvasId,
          business.id,
          body.name
        );
        if (!canvas) return NextResponse.json({ error: "Not found" }, { status: 404 });
        return NextResponse.json({ ok: true, canvas });
      }
      case "flush": {
        await hydrateCanvasSession(body.canvasId, business.id);
        await afterMutate(body.canvasId);
        return NextResponse.json({
          ok: true,
          persistence: canvasPersistenceEnabled() ? "prisma" : "memory",
        });
      }
      case "distribution_graph": {
        const graph = buildCampaignDistributionGraph({
          businessId: business.id,
          campaignId: body.campaignId,
          campaignTitle: body.campaignTitle,
          channelIds: body.channelIds,
          source: { ...body.source, id: body.campaignId },
          canvasId: body.canvasId,
          canvasName: body.canvasName,
        });
        await afterMutate(graph.canvas.id);
        return NextResponse.json({
          ok: true,
          ...graph,
          persistence: canvasPersistenceEnabled() ? "prisma" : "memory",
        });
      }
      case "distribution_action": {
        await hydrateCanvasSession(body.canvasId, business.id);
        const result = runDistributionAction({
          canvasId: body.canvasId,
          action: body.distributionAction,
          variantId: body.variantId,
          channelId: body.channelId,
          campaignId: body.campaignId,
          businessId: business.id,
          source: body.source
            ? { ...body.source, id: body.campaignId ?? "campaign" }
            : undefined,
          scheduledAt: body.scheduledAt,
          decision: body.decision,
        });
        await afterMutate(body.canvasId);
        return NextResponse.json(result);
      }
      case "add_trigger": {
        await hydrateCanvasSession(body.canvasId, business.id);
        const result = addConversationalTrigger(body.canvasId, body.triggerId);
        await afterMutate(body.canvasId);
        return NextResponse.json({ ok: true, ...result });
      }
      case "add_action": {
        await hydrateCanvasSession(body.canvasId, business.id);
        const result = addConversationalAction(body.canvasId, body.actionId, {
          businessId: business.id,
          consentGiven: body.consentGiven,
          providerReady: body.providerReady,
        });
        await afterMutate(body.canvasId);
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
        await hydrateCanvasSession(body.canvasId, business.id);
        const result = simulateDeployment({
          canvasId: body.canvasId,
          placements: body.placements,
          createChecklistTask: body.createChecklistTask,
        });
        await afterMutate(body.canvasId);
        return NextResponse.json({ ok: true, ...result });
      }
      case "schedule_conflicts": {
        const conflicts = detectScheduleConflicts({ slots: body.slots });
        return NextResponse.json({ ok: true, conflicts });
      }
      case "node_edit_authoritative": {
        await hydrateCanvasSession(body.canvasId, business.id);
        const result = applyNodeEditToAuthoritative({
          canvasId: body.canvasId,
          nodeId: body.nodeId,
          patch: body.patch,
          confirm: body.confirm,
        });
        await afterMutate(body.canvasId);
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
