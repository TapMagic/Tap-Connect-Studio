import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusiness } from "@/lib/auth";
import { isFeatureEnabled } from "@/lib/fusion/features";
import {
  assignCase,
  closeCase,
  closeThread,
  createThreadFromEmail,
  createThreadFromLead,
  getThreadDetail,
  listInboxThreads,
  openCase,
  replyToThread,
} from "@/lib/fusion/inbox";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { business } = await requireBusiness();
    const url = new URL(request.url);
    const threadId = url.searchParams.get("threadId");

    if (threadId) {
      const detail = await getThreadDetail({ businessId: business.id, threadId });
      if (!detail) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({ ok: true, ...detail });
    }

    const threads = await listInboxThreads({ businessId: business.id });
    return NextResponse.json({ ok: true, threads });
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
]);

export async function POST(request: Request) {
  try {
    const { business, user } = await requireBusiness();
    const featureEnabled =
      isFeatureEnabled("comms.inbox", {}) || isFeatureEnabled("comms.email", {});
    if (!featureEnabled) {
      return NextResponse.json({ error: "Inbox feature disabled", code: "feature_off" }, { status: 403 });
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
          return NextResponse.json({ error: result.error, code: result.code }, { status: 400 });
        }
        return NextResponse.json({ ok: true, message: result.message, mock: result.mock });
      }
      case "close_thread": {
        const thread = await closeThread({ businessId: business.id, threadId: body.threadId });
        if (!thread) return NextResponse.json({ error: "Not found" }, { status: 404 });
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
