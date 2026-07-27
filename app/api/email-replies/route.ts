import { NextResponse } from "next/server";
import { requireBusiness } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  acknowledgeConfiguredButUntested,
  activateReplyRouting,
  confirmDestinationVerification,
  getCampaignReplyPolicyView,
  getEmailRepliesCardModel,
  listRoutingActivity,
  revokeDestination,
  saveWizardDraft,
  sendDestinationRouteTest,
  sendDestinationVerification,
  setDestinationEnabledState,
} from "@/lib/fusion/email-replies/service";
import { listConnectedReplyDestinations } from "@/lib/fusion/email-replies/connected-destinations";
import { buildOperatorReadinessChecklist } from "@/lib/fusion/email-replies/operator-readiness";
import { parseEmailDocument } from "@/lib/fusion/email/document";
import type {
  ReplyHandlingMode,
  ReplyMessageCategory,
} from "@/lib/fusion/email-replies/types";
import { EmailRepliesStoreUnavailableError } from "@/lib/fusion/email-replies/store-resolve";

function storeError(err: unknown) {
  const message =
    err instanceof EmailRepliesStoreUnavailableError
      ? err.message
      : err instanceof Error
        ? err.message
        : "Email & Replies durable store is unavailable";
  return NextResponse.json(
    { ok: false, error: message, code: "store_unavailable" },
    { status: 503 }
  );
}

export async function GET(req: Request) {
  try {
    const { business } = await requireBusiness();
    const url = new URL(req.url);
    const view = url.searchParams.get("view") ?? "card";

    if (view === "operator") {
      return NextResponse.json({
        checklist: await buildOperatorReadinessChecklist(),
      });
    }
    if (view === "connected") {
      return NextResponse.json({
        destinations: listConnectedReplyDestinations(),
      });
    }
    if (view === "activity") {
      return NextResponse.json(
        await listRoutingActivity({ businessId: business.id })
      );
    }
    if (view === "campaign") {
      const campaignId = url.searchParams.get("campaignId") ?? "unknown";
      let campaignOverride: unknown = null;
      if (campaignId !== "unknown") {
        const campaign = await prisma.campaign.findFirst({
          where: { id: campaignId, businessId: business.id },
          select: { formSettings: true, title: true },
        });
        if (campaign) {
          const doc = parseEmailDocument(
            (campaign.formSettings as Record<string, unknown> | null)
              ?.emailResponse ?? campaign.formSettings,
            business.name
          );
          campaignOverride = doc.replyHandling ?? null;
        }
      }
      return NextResponse.json(
        await getCampaignReplyPolicyView({
          businessId: business.id,
          campaignId,
          campaignOverride,
        })
      );
    }

    return NextResponse.json(
      await getEmailRepliesCardModel({ businessId: business.id })
    );
  } catch (err) {
    return storeError(err);
  }
}

export async function POST(req: Request) {
  try {
    const { business } = await requireBusiness();
    const body = (await req.json()) as Record<string, unknown>;
    const action = typeof body.action === "string" ? body.action : "";

    switch (action) {
      case "wizard_save": {
        const result = await saveWizardDraft({
          businessId: business.id,
          mode: body.mode as ReplyHandlingMode,
          destinationName:
            typeof body.destinationName === "string"
              ? body.destinationName
              : undefined,
          destinationAddress:
            typeof body.destinationAddress === "string"
              ? body.destinationAddress
              : undefined,
          integrationId:
            typeof body.integrationId === "string"
              ? body.integrationId
              : undefined,
          categories: Array.isArray(body.categories)
            ? (body.categories as ReplyMessageCategory[])
            : undefined,
          keepCopyInTap: body.keepCopyInTap === true,
          notifyOnFailure: body.notifyOnFailure !== false,
          failureNotificationAddress:
            typeof body.failureNotificationAddress === "string"
              ? body.failureNotificationAddress
              : undefined,
          useTapInboxFallback: body.useTapInboxFallback !== false,
          directReplyTo:
            typeof body.directReplyTo === "string"
              ? body.directReplyTo
              : undefined,
          notificationEmail:
            typeof body.notificationEmail === "string"
              ? body.notificationEmail
              : undefined,
          skipTestAcknowledged: body.skipTestAcknowledged === true,
        });
        return NextResponse.json(result, { status: result.ok ? 200 : 400 });
      }
      case "send_verification": {
        const result = await sendDestinationVerification({
          businessId: business.id,
          destinationId: String(body.destinationId ?? ""),
        });
        return NextResponse.json(result, { status: result.ok ? 200 : 400 });
      }
      case "confirm_verification": {
        const result = await confirmDestinationVerification({
          businessId: business.id,
          destinationId: String(body.destinationId ?? ""),
          token: String(body.token ?? ""),
        });
        return NextResponse.json(result, { status: result.ok ? 200 : 400 });
      }
      case "send_test": {
        const result = await sendDestinationRouteTest({
          businessId: business.id,
          destinationId: String(body.destinationId ?? ""),
        });
        return NextResponse.json(result, { status: result.ok ? 200 : 400 });
      }
      case "skip_test": {
        const result = await acknowledgeConfiguredButUntested({
          businessId: business.id,
        });
        return NextResponse.json(result, { status: result.ok ? 200 : 400 });
      }
      case "activate": {
        const result = await activateReplyRouting({ businessId: business.id });
        return NextResponse.json(result, { status: result.ok ? 200 : 400 });
      }
      case "revoke": {
        const result = await revokeDestination({
          businessId: business.id,
          destinationId: String(body.destinationId ?? ""),
        });
        return NextResponse.json(result, { status: result.ok ? 200 : 400 });
      }
      case "set_enabled": {
        const result = await setDestinationEnabledState({
          businessId: business.id,
          destinationId: String(body.destinationId ?? ""),
          enabled: body.enabled !== false,
        });
        return NextResponse.json(result, { status: result.ok ? 200 : 400 });
      }
      default:
        return NextResponse.json(
          { ok: false, error: "Unknown action" },
          { status: 400 }
        );
    }
  } catch (err) {
    return storeError(err);
  }
}
