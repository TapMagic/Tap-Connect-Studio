import { NextResponse } from "next/server";
import { processInboundEmailReceived } from "@/lib/fusion/email-replies/pipeline";
import { adapterVerifyWebhook } from "@/lib/fusion/email-replies/providers/resend-adapter";
import { recordOperatorAlert } from "@/lib/fusion/studio/operator-alerts";
import { requireEmailRepliesStore } from "@/lib/fusion/email-replies/store-resolve";

/**
 * Resend inbound webhook — email.received
 * Reads raw body before parsing; verifies Svix/Resend signature.
 */
export async function POST(req: Request) {
  const rawBody = await req.text();
  const id = req.headers.get("svix-id") ?? req.headers.get("webhook-id") ?? "";
  const timestamp =
    req.headers.get("svix-timestamp") ?? req.headers.get("webhook-timestamp") ?? "";
  const signature =
    req.headers.get("svix-signature") ?? req.headers.get("webhook-signature") ?? "";

  const verified = adapterVerifyWebhook({
    rawBody,
    headers: { id, timestamp, signature },
  });

  if (!verified.ok) {
    return NextResponse.json({ ok: false, error: verified.error }, { status: 401 });
  }

  if (verified.event.type !== "email.received") {
    return NextResponse.json({
      ok: true,
      ignored: true,
      type: verified.event.type,
    });
  }

  const data = verified.event.data;
  const emailId = String(data.email_id ?? "");
  const eventId = id || `evt_${emailId}_${verified.event.created_at ?? Date.now()}`;

  if (!emailId) {
    return NextResponse.json({ ok: false, error: "Missing email_id" }, { status: 400 });
  }

  let store;
  try {
    store = await requireEmailRepliesStore();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Email & Replies durable store is unavailable. Inbound routing cannot proceed.",
      },
      { status: 503 }
    );
  }

  const result = await processInboundEmailReceived({
    eventId,
    emailId,
    store,
  });

  if (result.decisionQueueSuggested && result.initialMessageId) {
    const reply = await store.getInitialReply(result.initialMessageId);
    const businessId = reply?.businessId;
    if (businessId) {
      await recordOperatorAlert({
        businessId,
        kind: "save_failed",
        title: "Reply routing needs attention",
        detail:
          result.reason ??
          "A customer reply could not be routed. TapInbox fallback may apply.",
        href: "/dashboard/integrations#email-replies",
        aggregateType: "reply_routing",
        aggregateId: `reply_route_fail:${businessId}:${reply?.routingDestinationId ?? "none"}`,
      });
    }
  }

  return NextResponse.json({
    ok: Boolean(result.ok || result.duplicate || result.skipped),
    duplicate: result.duplicate,
    skipped: result.skipped,
    reason: result.reason,
    initialMessageId: result.initialMessageId,
    threadId: result.threadId,
    inboxMessageId: result.inboxMessageId,
    routingStatus: result.routingStatus,
    mock: result.mock,
    retainedInTap: result.retainedInTap,
    decisionQueueSuggested: result.decisionQueueSuggested,
  });
}
