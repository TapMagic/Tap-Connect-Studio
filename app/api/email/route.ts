import { NextResponse } from "next/server";
import { z } from "zod";
import { requireBusiness } from "@/lib/auth";
import {
  EmailLifecycleError,
  ensureCampaignEmailDocument,
  executeBlockedFixtureEmail,
  listEmails,
  saveEmailDocument,
  scheduleFixtureEmail,
} from "@/lib/fusion/email/lifecycle";

const saveSchema = z.object({
  emailId: z.string(),
  expectedRevision: z.number().int().min(1),
  document: z.unknown(),
});
const commandSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("ensure-campaign"), campaignId: z.string() }),
  z.object({ action: z.literal("schedule-fixture"), emailId: z.string(), scheduledFor: z.string().datetime() }),
  z.object({ action: z.literal("execute-fixture"), emailId: z.string() }),
]);

function errorResponse(error: unknown) {
  if (error instanceof EmailLifecycleError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }
  if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid Email request." }, { status: 400 });
  console.error("Email lifecycle error:", error);
  return NextResponse.json({ error: "Email request failed." }, { status: 500 });
}

export async function GET() {
  try {
    const { business } = await requireBusiness();
    return NextResponse.json({ emails: await listEmails(business.id) });
  } catch (error) { return errorResponse(error); }
}

export async function PUT(request: Request) {
  try {
    const { business, user } = await requireBusiness();
    const body = saveSchema.parse(await request.json());
    const email = await saveEmailDocument({ businessId: business.id, emailId: body.emailId, expectedRevision: body.expectedRevision, document: body.document, actorId: user.id });
    return NextResponse.json({ email, status: "Saved draft" });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  try {
    const { business, user } = await requireBusiness();
    const body = commandSchema.parse(await request.json());
    if (body.action === "ensure-campaign") {
      return NextResponse.json({ email: await ensureCampaignEmailDocument({ businessId: business.id, campaignId: body.campaignId, businessName: business.name, actorId: user.id }) });
    }
    if (body.action === "schedule-fixture") {
      const email = await scheduleFixtureEmail({ businessId: business.id, emailId: body.emailId, scheduledFor: new Date(body.scheduledFor), actorId: user.id });
      return NextResponse.json({ email, status: "Scheduled", safety: "No real send is authorized." });
    }
    const reason = business.workspaceKind === "DEMO" || business.workspaceKind === "TEST_FIXTURE" || business.workspaceKind === "PERSONAL_SANDBOX"
      ? "Demo and sandbox safety blocked real Email delivery."
      : "Real Email sending is disabled while provider and consent operation is reconnected.";
    const email = await executeBlockedFixtureEmail({ businessId: business.id, emailId: body.emailId, actorId: user.id, blockReason: reason });
    return NextResponse.json({ email, status: "Blocked", providerContacted: false, recipientContacted: false });
  } catch (error) { return errorResponse(error); }
}
