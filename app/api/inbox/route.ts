import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusiness } from "@/lib/auth";
import { checkAnyFeatureGate, featureGateJsonBody } from "@/lib/fusion/features/gate";
import { loadFeatureContext } from "@/lib/fusion/features/server";
import { isFeatureEnabled } from "@/lib/fusion/features/resolve";
import {
  addMessageAttachment,
  assignCase,
  closeCase,
  closeThread,
  createThreadFromEmail,
  createThreadFromLead,
  getThreadDetail,
  listInboxThreads,
  listInboxAudit,
  openCase,
  replyToThread,
  reopenThread,
  runInboxOperatorCloseout,
  summarizeInboxAnalytics,
  transitionCase,
} from "@/lib/fusion/inbox";

export const dynamic = "force-dynamic";

/** Seed IDs for operator closeout when not provided — local isolated DB only */
const LOCAL_SEED = {
  contactId: process.env.SEED_CONTACT_ID ?? "cmrx5wjn90002519khgib6nsd",
  relationshipId: process.env.SEED_RELATIONSHIP_ID ?? "cmrx5yojd0008bv9ksy0yachh",
  campaignId: process.env.SEED_CAMPAIGN_ID ?? "cmrx5wjn80001519kzayn9296",
  campaignTitle: process.env.SEED_CAMPAIGN_TITLE ?? "[SEED] Welcome Offer",
};

export async function GET(request: Request) {
  try {
    const { business } = await requireBusiness();
    const featureCtx = await loadFeatureContext();
    const gate = checkAnyFeatureGate(["comms.inbox", "comms.email"], featureCtx);
    if (!gate.ok) {
      return NextResponse.json(featureGateJsonBody(gate), { status: 503 });
    }

    const url = new URL(request.url);
    const threadId = url.searchParams.get("threadId");
    const view = url.searchParams.get("view");

    if (view === "operator") {
      return NextResponse.json({
        ok: true,
        analytics: summarizeInboxAnalytics(business.id),
        audit: listInboxAudit(business.id, 40),
        liveClassification: "VERIFIED — CREDENTIALS REQUIRED",
      });
    }

    if (threadId) {
      const detail = await getThreadDetail({ businessId: business.id, threadId });
      if (!detail) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({ ok: true, ...detail });
    }

    const threads = await listInboxThreads({ businessId: business.id });
    return NextResponse.json({
      ok: true,
      threads,
      analytics: summarizeInboxAnalytics(business.id),
      audit: listInboxAudit(business.id, 20),
      liveClassification: "VERIFIED — CREDENTIALS REQUIRED",
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

const postSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create_from_email"),
    email: z.string().email(),
    subject: z.string().min(1),
    body: z.string().min(1),
    contactId: z.string().optional(),
    relationshipId: z.string().optional(),
    campaignId: z.string().optional(),
    campaignTitle: z.string().optional(),
  }),
  z.object({
    action: z.literal("create_from_lead"),
    leadId: z.string(),
    email: z.string().email(),
    subject: z.string().optional(),
    body: z.string().optional(),
    contactId: z.string().optional(),
    relationshipId: z.string().optional(),
  }),
  z.object({
    action: z.literal("reply"),
    threadId: z.string(),
    body: z.string().min(1),
    purpose: z.enum(["transactional", "service", "promo", "loyalty", "support"]).optional(),
    consentGiven: z.boolean().optional(),
  }),
  z.object({
    action: z.literal("close_thread"),
    threadId: z.string(),
  }),
  z.object({
    action: z.literal("reopen_thread"),
    threadId: z.string(),
  }),
  z.object({
    action: z.literal("open_case"),
    subject: z.string().min(1),
    threadId: z.string().optional(),
    contactId: z.string().optional(),
    assigneeId: z.string().optional(),
  }),
  z.object({
    action: z.literal("close_case"),
    caseId: z.string(),
  }),
  z.object({
    action: z.literal("assign_case"),
    caseId: z.string(),
    assigneeId: z.string(),
  }),
  z.object({
    action: z.literal("transition_case"),
    caseId: z.string(),
    caseAction: z.enum(["assign", "start", "wait", "resolve", "close", "reopen"]),
    assigneeId: z.string().optional(),
  }),
  z.object({
    action: z.literal("add_attachment"),
    messageId: z.string(),
    name: z.string().min(1),
    url: z.string().min(1),
    mimeType: z.string().optional(),
  }),
  z.object({
    action: z.literal("run_operator_closeout"),
    contactId: z.string().optional(),
    relationshipId: z.string().optional(),
    campaignId: z.string().optional(),
    campaignTitle: z.string().optional(),
  }),
]);

export async function POST(request: Request) {
  try {
    const { business, user } = await requireBusiness();
    const featureCtx = await loadFeatureContext();
    const featureEnabled =
      isFeatureEnabled("comms.inbox", featureCtx) || isFeatureEnabled("comms.email", featureCtx);
    if (!featureEnabled) {
      const gate = checkAnyFeatureGate(["comms.inbox", "comms.email"], featureCtx);
      if (!gate.ok) {
        return NextResponse.json(featureGateJsonBody(gate), { status: 503 });
      }
    }

    const body = postSchema.parse(await request.json());

    switch (body.action) {
      case "create_from_email": {
        const thread = await createThreadFromEmail({
          businessId: business.id,
          email: body.email,
          subject: body.subject,
          body: body.body,
          contactId: body.contactId,
          relationshipId: body.relationshipId,
          campaignId: body.campaignId,
          campaignTitle: body.campaignTitle,
        });
        return NextResponse.json({ ok: true, thread });
      }
      case "create_from_lead": {
        const thread = await createThreadFromLead({
          businessId: business.id,
          leadId: body.leadId,
          email: body.email,
          subject: body.subject,
          body: body.body,
          contactId: body.contactId,
          relationshipId: body.relationshipId,
        });
        return NextResponse.json({ ok: true, thread });
      }
      case "reply": {
        const result = await replyToThread({
          businessId: business.id,
          threadId: body.threadId,
          body: body.body,
          purpose: body.purpose,
          consentGiven: body.consentGiven,
          actorId: user.id,
          featureEnabled: true,
        });
        if (!result.ok) {
          return NextResponse.json(
            {
              error: result.error,
              code: result.code,
              permittedFallback:
                result.code === "no_consent" || result.code === "suppressed"
                  ? {
                      hint:
                        result.code === "suppressed"
                          ? "Remove suppression, then retry as support reply."
                          : "Retry as support purpose (consent not required for email support).",
                      purpose: "support" as const,
                    }
                  : undefined,
            },
            { status: 400 }
          );
        }
        return NextResponse.json({ ok: true, message: result.message, mock: result.mock });
      }
      case "close_thread": {
        const thread = await closeThread({ businessId: business.id, threadId: body.threadId });
        if (!thread) return NextResponse.json({ error: "Not found" }, { status: 404 });
        return NextResponse.json({ ok: true, thread });
      }
      case "reopen_thread": {
        const thread = await reopenThread({ businessId: business.id, threadId: body.threadId });
        if (!thread) return NextResponse.json({ error: "Not found or not closed" }, { status: 404 });
        return NextResponse.json({ ok: true, thread });
      }
      case "open_case": {
        const tapCase = await openCase({
          businessId: business.id,
          subject: body.subject,
          threadId: body.threadId,
          contactId: body.contactId,
          assigneeId: body.assigneeId ?? user.id,
        });
        return NextResponse.json({ ok: true, case: tapCase });
      }
      case "close_case": {
        const tapCase = await closeCase({ businessId: business.id, caseId: body.caseId });
        if (!tapCase) return NextResponse.json({ error: "Not found" }, { status: 404 });
        return NextResponse.json({ ok: true, case: tapCase });
      }
      case "assign_case": {
        const tapCase = await assignCase({
          businessId: business.id,
          caseId: body.caseId,
          assigneeId: body.assigneeId,
        });
        if (!tapCase) return NextResponse.json({ error: "Not found" }, { status: 404 });
        return NextResponse.json({ ok: true, case: tapCase });
      }
      case "transition_case": {
        const result = await transitionCase({
          businessId: business.id,
          caseId: body.caseId,
          action: body.caseAction,
          assigneeId: body.assigneeId ?? user.id,
        });
        if (!result.ok) {
          return NextResponse.json({ error: result.error, code: result.code }, { status: 400 });
        }
        return NextResponse.json({ ok: true, case: result.case });
      }
      case "add_attachment": {
        const result = await addMessageAttachment({
          businessId: business.id,
          messageId: body.messageId,
          name: body.name,
          url: body.url,
          mimeType: body.mimeType,
        });
        if (!result.ok) {
          return NextResponse.json({ error: result.error }, { status: 404 });
        }
        return NextResponse.json({ ok: true, attachment: result.attachment });
      }
      case "run_operator_closeout": {
        const result = await runInboxOperatorCloseout({
          businessId: business.id,
          actorId: user.id,
          contactId: body.contactId ?? LOCAL_SEED.contactId,
          relationshipId: body.relationshipId ?? LOCAL_SEED.relationshipId,
          campaignId: body.campaignId ?? LOCAL_SEED.campaignId,
          campaignTitle: body.campaignTitle ?? LOCAL_SEED.campaignTitle,
        });
        return NextResponse.json({
          ...result,
          analytics: summarizeInboxAnalytics(business.id),
          audit: listInboxAudit(business.id, 40),
        });
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
