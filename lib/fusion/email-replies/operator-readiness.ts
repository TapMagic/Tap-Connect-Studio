/**
 * TapConnect operator readiness checklist — secrets never exposed.
 */

import {
  getReceivingSubdomain,
  getResendCredentialRef,
  getResendWebhookSecretRefs,
  resolveResendAdapterReadiness,
} from "./providers/resend-adapter";
import { getEmailRepliesStore, isMemoryStoreForced } from "./store-resolve";
import type { OperatorRequirementStatus } from "./types";

export type OperatorChecklistItem = {
  id: string;
  label: string;
  status: OperatorRequirementStatus;
  detail: string;
};

export async function buildOperatorReadinessChecklist(input?: {
  lastInboundAt?: string | null;
  lastSuccessfulRouteAt?: string | null;
  currentFailure?: string | null;
  webhookLastVerifiedAt?: string | null;
}): Promise<{
  items: OperatorChecklistItem[];
  liveReady: boolean;
  liveCampaignSendingEnabled: false;
  runtimeMode: ReturnType<typeof resolveResendAdapterReadiness>["runtimeMode"];
  durableStore: { schemaPresent: true; active: boolean; kind: string };
}> {
  const readiness = resolveResendAdapterReadiness();
  const cred = getResendCredentialRef();
  const webhookRefs = getResendWebhookSecretRefs();
  const subdomain = getReceivingSubdomain();

  let durableActive = false;
  let durableKind = isMemoryStoreForced() ? "memory" : "prisma";
  try {
    const store = getEmailRepliesStore();
    durableKind = store.kind;
    await store.ping();
    durableActive = store.kind === "prisma";
  } catch {
    durableActive = false;
  }

  const items: OperatorChecklistItem[] = [
    {
      id: "schema_present",
      label: "Email & Replies schema present",
      status: "configured",
      detail:
        "ReplyDestination / ReplyPolicy / ReplyAlias / ReplyProviderEvent / ReplyInitialMessage / ReplyRoutingAttempt",
    },
    {
      id: "durable_store",
      label: "Durable store active",
      status: durableActive
        ? "verified"
        : durableKind === "memory"
          ? "test_only"
          : "failing",
      detail: durableActive
        ? "Prisma store active — configuration survives restart"
        : durableKind === "memory"
          ? "Memory test adapter only — not for normal runtime"
          : "Prisma store unavailable — do not claim settings saved",
    },
    {
      id: "resend_account",
      label: "Resend account",
      status: readiness.configured ? "configured" : "not_configured",
      detail: readiness.configured
        ? `Credential reference: ${cred}`
        : "Set RESEND_API_KEY (value never shown).",
    },
    {
      id: "credential_ref",
      label: "Secure Resend credential reference",
      status: cred ? "configured" : "not_configured",
      detail: cred ? cred : "Missing env credential reference",
    },
    {
      id: "sending_domain",
      label: "TapConnect sending domain",
      status: readiness.fromConfigured
        ? process.env.TAPCONNECT_SENDING_DOMAIN_VERIFIED === "1"
          ? "verified"
          : "configured"
        : "not_configured",
      detail: readiness.fromConfigured
        ? "From address configured — DNS verification is an operator production step"
        : "Set RESEND_FROM_EMAIL",
    },
    {
      id: "receiving_subdomain",
      label: "TapConnect receiving subdomain",
      status: subdomain
        ? process.env.TAPCONNECT_RECEIVING_DOMAIN_VERIFIED === "1"
          ? "verified"
          : "configured"
        : "not_configured",
      detail: subdomain
        ? subdomain
        : "Set TAPCONNECT_RECEIVING_SUBDOMAIN (does not replace business MX)",
    },
    {
      id: "inbound_webhook",
      label: "Inbound webhook endpoint",
      status: process.env.TAPCONNECT_RESEND_WEBHOOK_URL?.trim()
        ? "configured"
        : "not_configured",
      detail:
        process.env.TAPCONNECT_RESEND_WEBHOOK_URL?.trim() ||
        "/api/webhooks/resend/inbound (register in Resend dashboard for production)",
    },
    {
      id: "webhook_secret",
      label: "Webhook signing secret",
      status: webhookRefs.length ? "configured" : "not_configured",
      detail: webhookRefs.length
        ? `References: ${webhookRefs.join(", ")} (values never shown)`
        : "Set RESEND_WEBHOOK_SECRET (+ optional PREVIOUS for rotation)",
    },
    {
      id: "provider_test_mode",
      label: "Provider / runtime mode",
      status:
        readiness.runtimeMode === "local_mock"
          ? "test_only"
          : readiness.runtimeMode === "provider_test"
            ? "test_only"
            : "configured",
      detail: readiness.runtimeMode,
    },
    {
      id: "live_ready",
      label: "Live-ready state",
      status:
        durableActive &&
        readiness.configured &&
        readiness.webhookSecretConfigured &&
        readiness.receivingSubdomainConfigured &&
        readiness.runtimeMode === "live_ready"
          ? "live_ready"
          : readiness.configured
            ? "test_only"
            : "not_configured",
      detail:
        "Prisma persistence alone does not make the system live ready. DNS and production webhook remain deferred. Campaign sending stays disabled.",
    },
    {
      id: "campaign_sending",
      label: "Campaign sending disabled state",
      status: "configured",
      detail: "Live Campaign sending remains disabled (no-send contract).",
    },
    {
      id: "last_inbound",
      label: "Last inbound message",
      status: input?.lastInboundAt ? "verified" : "not_configured",
      detail: input?.lastInboundAt ?? "None yet",
    },
    {
      id: "last_route",
      label: "Last successful route",
      status: input?.lastSuccessfulRouteAt ? "verified" : "not_configured",
      detail: input?.lastSuccessfulRouteAt ?? "None yet",
    },
    {
      id: "failure_state",
      label: "Current failure state",
      status: input?.currentFailure ? "failing" : "configured",
      detail: input?.currentFailure ?? "None",
    },
  ];

  const liveReady =
    items.find((i) => i.id === "live_ready")?.status === "live_ready";

  return {
    items,
    liveReady: Boolean(liveReady),
    liveCampaignSendingEnabled: false,
    runtimeMode: readiness.runtimeMode,
    durableStore: {
      schemaPresent: true,
      active: durableActive,
      kind: durableKind,
    },
  };
}
