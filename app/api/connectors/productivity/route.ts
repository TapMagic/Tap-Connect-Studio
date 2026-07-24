import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusiness } from "@/lib/auth";
import {
  checkFeatureGate,
  checkLiveProviderExecution,
  featureGateJsonBody,
} from "@/lib/fusion/features/gate";
import { loadFeatureContext } from "@/lib/fusion/features/server";
import {
  connectWorkProvider,
  disconnectWorkProvider,
  createExternalWorkItem,
  updateExternalWorkItem,
  getProductivitySnapshot,
  ingestKnowledgeMock,
  postCollabAlert,
  workBridges,
  setDefaultWorkProvider,
  getDefaultWorkProvider,
  PRODUCTIVITY_PROVIDERS,
  discoverWorkspaces,
  addWorkItemComment,
  addWorkItemAttachment,
  pollProviderSync,
  applyInboundWebhook,
  resolveWorkItemConflict,
  retryWorkItemSync,
  postCollabApproval,
  postCollabInteractiveAction,
  postCollabHandoff,
  runAutomationAction,
  runProductivityCloseoutWorkflow,
  applyExternalCompletionToTapConnect,
  type WorkBridgeSourceType,
} from "@/lib/fusion/connectors/productivity";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  action: z.literal("create_item"),
  provider: z.string().optional(),
  title: z.string().min(1).max(240),
  description: z.string().max(4000).optional(),
  sourceType: z
    .enum([
      "tapcase",
      "campaign_approval",
      "agent_finding",
      "provider_failure",
      "tap_point_failure",
      "inbox_followup",
      "booking_order",
      "loyalty_commerce_exception",
      "manual",
      "other",
    ])
    .default("manual"),
  sourceId: z.string().optional(),
  dueAt: z.string().nullable().optional(),
  priority: z.string().optional(),
  deepLinkBack: z.string().optional(),
  notifyCollab: z.boolean().optional(),
});

const bridgeSchema = z.object({
  action: z.literal("bridge"),
  bridge: z.enum([
    "tapCaseToTask",
    "campaignApprovalToReviewTask",
    "agentFindingToTask",
    "providerFailureToIncident",
    "tapPointFailureToServiceTask",
    "inboxFollowUpToTask",
    "bookingOrderToChecklist",
    "loyaltyCommerceExceptionToReview",
    "manualCreate",
  ]),
  title: z.string().min(1).max(240),
  description: z.string().max(4000).optional(),
  provider: z.string().optional(),
  sourceId: z.string().optional(),
  dueAt: z.string().nullable().optional(),
  priority: z.string().optional(),
  deepLinkBack: z.string().optional(),
  notifyCollab: z.boolean().optional(),
});

const connectSchema = z.object({
  action: z.literal("connect"),
  provider: z.string().min(1),
  preferLive: z.boolean().optional(),
});

const disconnectSchema = z.object({
  action: z.literal("disconnect"),
  provider: z.string().min(1),
});

const defaultSchema = z.object({
  action: z.literal("set_default"),
  provider: z.string().min(1),
});

const updateSchema = z.object({
  action: z.literal("update_item"),
  id: z.string().min(1),
  patch: z.object({
    title: z.string().optional(),
    status: z.string().optional(),
    priority: z.string().optional(),
    dueAt: z.string().nullable().optional(),
    description: z.string().optional(),
    assigneeExternalIds: z.array(z.string()).optional(),
    customFields: z.record(z.string(), z.unknown()).optional(),
  }),
});

const knowledgeSchema = z.object({
  action: z.literal("ingest_knowledge"),
  provider: z.enum(["notion", "google_drive", "onedrive", "microsoft_outlook"]),
  title: z.string().min(1),
  excerpt: z.string().min(1),
  url: z.string().optional(),
});

const alertSchema = z.object({
  action: z.literal("collab_alert"),
  provider: z.enum(["slack", "microsoft_teams"]),
  text: z.string().min(1),
  severity: z.enum(["info", "warning", "critical"]).optional(),
  deepLink: z.string().optional(),
});

const discoverSchema = z.object({
  action: z.literal("discover"),
  provider: z.string().min(1),
});

const commentSchema = z.object({
  action: z.literal("add_comment"),
  workItemId: z.string().min(1),
  body: z.string().min(1).max(4000),
});

const attachmentSchema = z.object({
  action: z.literal("add_attachment"),
  workItemId: z.string().min(1),
  name: z.string().min(1),
  url: z.string().min(1),
  mimeType: z.string().optional(),
});

const pollSchema = z.object({
  action: z.literal("poll_sync"),
  provider: z.string().min(1),
});

const webhookSchema = z.object({
  action: z.literal("inbound_webhook"),
  provider: z.string().min(1),
  eventType: z.string().min(1),
  externalId: z.string().optional(),
  patch: z
    .object({
      status: z.string().optional(),
      priority: z.string().optional(),
      dueAt: z.string().nullable().optional(),
      assigneeExternalIds: z.array(z.string()).optional(),
    })
    .optional(),
  comment: z.string().optional(),
  idempotencyKey: z.string().optional(),
  signature: z.string().optional(),
  rawBody: z.string().optional(),
});

const conflictSchema = z.object({
  action: z.literal("resolve_conflict"),
  workItemId: z.string().min(1),
  strategy: z.enum(["prefer_provider", "prefer_local", "merge"]),
  providerStatus: z.string().optional(),
  localStatus: z.string().optional(),
});

const retrySchema = z.object({
  action: z.literal("retry_sync"),
  workItemId: z.string().min(1),
});

const approvalSchema = z.object({
  action: z.literal("collab_approval"),
  provider: z.enum(["slack", "microsoft_teams"]),
  text: z.string().min(1),
  deepLink: z.string().optional(),
});

const interactiveSchema = z.object({
  action: z.literal("collab_interactive"),
  provider: z.enum(["slack", "microsoft_teams"]),
  actionId: z.string().min(1),
  text: z.string().min(1),
  deepLink: z.string().optional(),
});

const handoffSchema = z.object({
  action: z.literal("collab_handoff"),
  provider: z.enum(["slack", "microsoft_teams"]),
  text: z.string().min(1),
  deepLink: z.string().optional(),
});

const automationSchema = z.object({
  action: z.literal("automation_action"),
  provider: z.enum(["zapier", "make", "n8n"]),
  automationAction: z.string().min(1),
  payload: z.record(z.string(), z.unknown()).optional(),
  idempotencyKey: z.string().optional(),
});

const completeSchema = z.object({
  action: z.literal("complete_item"),
  id: z.string().min(1),
});

const closeoutSchema = z.object({
  action: z.literal("run_closeout"),
});

const postSchema = z.discriminatedUnion("action", [
  createSchema,
  bridgeSchema,
  connectSchema,
  disconnectSchema,
  defaultSchema,
  updateSchema,
  knowledgeSchema,
  alertSchema,
  discoverSchema,
  commentSchema,
  attachmentSchema,
  pollSchema,
  webhookSchema,
  conflictSchema,
  retrySchema,
  approvalSchema,
  interactiveSchema,
  handoffSchema,
  automationSchema,
  completeSchema,
  closeoutSchema,
]);

export async function GET() {
  try {
    const { business } = await requireBusiness();
    const featureCtx = await loadFeatureContext();
    const gate = checkFeatureGate("connectors.productivity", featureCtx);
    if (!gate.ok) {
      return NextResponse.json(featureGateJsonBody(gate), { status: 503 });
    }

    const snapshot = getProductivitySnapshot(business.id);
    return NextResponse.json({
      ok: true,
      providers: PRODUCTIVITY_PROVIDERS.map((p) => ({
        id: p.id,
        name: p.name,
        kind: p.kind,
        oauth: p.oauth,
        supportsMock: p.supportsMock,
        requiredEnvVars: p.requiredEnvVars,
        capabilities: p.capabilities,
        notes: p.notes,
      })),
      ...snapshot,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 401 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { business } = await requireBusiness();
    const featureCtx = await loadFeatureContext();
    const gate = checkFeatureGate("connectors.productivity", featureCtx);
    if (!gate.ok) {
      return NextResponse.json(featureGateJsonBody(gate), { status: 503 });
    }

    const body = postSchema.parse(await request.json());

    if (body.action === "connect" && body.preferLive === true) {
      const liveGate = checkLiveProviderExecution(featureCtx);
      if (!liveGate.ok) {
        return NextResponse.json(featureGateJsonBody(liveGate), { status: 503 });
      }
    }

    switch (body.action) {
      case "connect": {
        const result = connectWorkProvider({
          businessId: business.id,
          provider: body.provider,
          preferLive: body.preferLive,
        });
        if (!result.ok) {
          return NextResponse.json(result, { status: 400 });
        }
        return NextResponse.json({
          ok: true,
          ...result.data,
          displayStatus:
            result.mode === "live"
              ? "ready"
              : "VERIFIED — CREDENTIALS REQUIRED for live OAuth",
        });
      }
      case "disconnect": {
        disconnectWorkProvider(business.id, body.provider);
        return NextResponse.json({ ok: true });
      }
      case "set_default": {
        setDefaultWorkProvider(business.id, body.provider);
        return NextResponse.json({ ok: true, defaultProvider: body.provider });
      }
      case "create_item": {
        const provider =
          body.provider || getDefaultWorkProvider(business.id) || "monday";
        const result = createExternalWorkItem({
          provider,
          businessId: business.id,
          title: body.title,
          description: body.description,
          sourceType: body.sourceType as WorkBridgeSourceType,
          sourceId: body.sourceId,
          dueAt: body.dueAt,
          priority: body.priority,
          deepLinkBack: body.deepLinkBack,
          idempotencyKey: body.sourceId
            ? `${body.sourceType}:${body.sourceId}:${provider}`
            : undefined,
        });
        if (!result.ok) return NextResponse.json(result, { status: 400 });
        return NextResponse.json({ ok: true, item: result.data, mode: result.mode });
      }
      case "bridge": {
        const fn = workBridges[body.bridge];
        const result = fn({
          businessId: business.id,
          title: body.title,
          description: body.description,
          provider: body.provider,
          sourceId: body.sourceId,
          dueAt: body.dueAt,
          priority: body.priority,
          deepLinkBack: body.deepLinkBack,
          notifyCollab: body.notifyCollab,
        });
        if (!result.ok) return NextResponse.json(result, { status: 400 });
        return NextResponse.json({ ok: true, item: result.data, mode: result.mode });
      }
      case "update_item": {
        const result = updateExternalWorkItem({
          id: body.id,
          businessId: business.id,
          patch: body.patch,
        });
        if (!result.ok) return NextResponse.json(result, { status: 404 });
        return NextResponse.json({ ok: true, item: result.data });
      }
      case "ingest_knowledge": {
        const result = ingestKnowledgeMock({
          businessId: business.id,
          provider: body.provider,
          title: body.title,
          excerpt: body.excerpt,
          url: body.url,
        });
        if (!result.ok) return NextResponse.json(result, { status: 400 });
        return NextResponse.json({ ok: true, ...result.data, mode: result.mode });
      }
      case "collab_alert": {
        const result = postCollabAlert({
          businessId: business.id,
          provider: body.provider,
          text: body.text,
          severity: body.severity,
          deepLink: body.deepLink,
        });
        if (!result.ok) return NextResponse.json(result, { status: 400 });
        return NextResponse.json({ ok: true, ...result.data });
      }
      case "discover": {
        const result = discoverWorkspaces({
          businessId: business.id,
          provider: body.provider,
        });
        if (!result.ok) return NextResponse.json(result, { status: 400 });
        return NextResponse.json({ ok: true, ...result.data, mode: result.mode });
      }
      case "add_comment": {
        const result = addWorkItemComment({
          businessId: business.id,
          workItemId: body.workItemId,
          body: body.body,
        });
        if (!result.ok) return NextResponse.json(result, { status: 400 });
        return NextResponse.json({ ok: true, ...result.data });
      }
      case "add_attachment": {
        const result = addWorkItemAttachment({
          businessId: business.id,
          workItemId: body.workItemId,
          name: body.name,
          url: body.url,
          mimeType: body.mimeType,
        });
        if (!result.ok) return NextResponse.json(result, { status: 400 });
        return NextResponse.json({ ok: true, ...result.data });
      }
      case "poll_sync": {
        const result = pollProviderSync({
          businessId: business.id,
          provider: body.provider,
        });
        if (!result.ok) return NextResponse.json(result, { status: 400 });
        return NextResponse.json({ ok: true, ...result.data });
      }
      case "inbound_webhook": {
        const result = applyInboundWebhook({
          businessId: business.id,
          provider: body.provider,
          eventType: body.eventType,
          externalId: body.externalId,
          patch: body.patch,
          comment: body.comment,
          idempotencyKey: body.idempotencyKey,
          signature: body.signature,
          rawBody: body.rawBody,
        });
        if (!result.ok) return NextResponse.json(result, { status: 400 });
        return NextResponse.json({ ok: true, ...result.data });
      }
      case "resolve_conflict": {
        const result = resolveWorkItemConflict({
          businessId: business.id,
          workItemId: body.workItemId,
          strategy: body.strategy,
          providerStatus: body.providerStatus,
          localStatus: body.localStatus,
        });
        if (!result.ok) return NextResponse.json(result, { status: 400 });
        return NextResponse.json({ ok: true, item: result.data });
      }
      case "retry_sync": {
        const result = retryWorkItemSync({
          businessId: business.id,
          workItemId: body.workItemId,
        });
        if (!result.ok) return NextResponse.json(result, { status: 400 });
        return NextResponse.json({ ok: true, item: result.data });
      }
      case "collab_approval": {
        const result = postCollabApproval({
          businessId: business.id,
          provider: body.provider,
          text: body.text,
          deepLink: body.deepLink,
        });
        if (!result.ok) return NextResponse.json(result, { status: 400 });
        return NextResponse.json({ ok: true, ...result.data });
      }
      case "collab_interactive": {
        const result = postCollabInteractiveAction({
          businessId: business.id,
          provider: body.provider,
          actionId: body.actionId,
          text: body.text,
          deepLink: body.deepLink,
        });
        if (!result.ok) return NextResponse.json(result, { status: 400 });
        return NextResponse.json({ ok: true, ...result.data });
      }
      case "collab_handoff": {
        const result = postCollabHandoff({
          businessId: business.id,
          provider: body.provider,
          text: body.text,
          deepLink: body.deepLink,
        });
        if (!result.ok) return NextResponse.json(result, { status: 400 });
        return NextResponse.json({ ok: true, ...result.data });
      }
      case "automation_action": {
        const result = runAutomationAction({
          businessId: business.id,
          provider: body.provider,
          action: body.automationAction,
          payload: body.payload,
          idempotencyKey: body.idempotencyKey,
        });
        if (!result.ok) return NextResponse.json(result, { status: 400 });
        return NextResponse.json({ ok: true, ...result.data });
      }
      case "complete_item": {
        const updated = updateExternalWorkItem({
          id: body.id,
          businessId: business.id,
          patch: { status: "done" },
        });
        if (!updated.ok) return NextResponse.json(updated, { status: 404 });
        const activity = applyExternalCompletionToTapConnect({
          businessId: business.id,
          workItem: updated.data,
        });
        return NextResponse.json({ ok: true, item: updated.data, activity });
      }
      case "run_closeout": {
        const result = runProductivityCloseoutWorkflow(business.id);
        return NextResponse.json({
          ok: result.ok,
          steps: result.steps,
          workItemId: result.workItemId,
          liveClassification: result.liveClassification,
        });
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload", details: error.flatten() }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}
