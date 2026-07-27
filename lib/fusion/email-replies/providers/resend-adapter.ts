/**
 * Resend provider adapter — single choke-point for SDK / HTTP.
 * Does not invent SDK methods. Campaign live send remains disabled.
 */

import { Resend } from "resend";
import { listEmailProviderReadiness } from "@/lib/fusion/comms/email-readiness";
import type { RuntimeDeliveryMode } from "../types";
import { RESEND_PROVIDER_DISCLOSURE, TAPCONNECT_EMAIL_NAME } from "../types";

export type ResendAdapterReadiness = {
  configured: boolean;
  fromConfigured: boolean;
  missingEnvVars: string[];
  webhookSecretConfigured: boolean;
  receivingSubdomainConfigured: boolean;
  runtimeMode: RuntimeDeliveryMode;
  disclosure: typeof RESEND_PROVIDER_DISCLOSURE;
  productSendName: typeof TAPCONNECT_EMAIL_NAME;
  liveCampaignSendingEnabled: false;
};

export function getResendCredentialRef(): string | null {
  return process.env.RESEND_API_KEY?.trim() ? "env:RESEND_API_KEY" : null;
}

export function getResendWebhookSecretRefs(): string[] {
  const refs: string[] = [];
  if (process.env.RESEND_WEBHOOK_SECRET?.trim()) refs.push("env:RESEND_WEBHOOK_SECRET");
  if (process.env.RESEND_WEBHOOK_SECRET_PREVIOUS?.trim()) {
    refs.push("env:RESEND_WEBHOOK_SECRET_PREVIOUS");
  }
  return refs;
}

export function getReceivingSubdomain(): string | null {
  return process.env.TAPCONNECT_RECEIVING_SUBDOMAIN?.trim() || null;
}

export function resolveResendAdapterReadiness(
  override?: Partial<{
    configured: boolean;
    runtimeMode: RuntimeDeliveryMode;
  }>
): ResendAdapterReadiness {
  const base = listEmailProviderReadiness();
  const webhookSecretConfigured = getResendWebhookSecretRefs().length > 0;
  const receivingSubdomainConfigured = Boolean(getReceivingSubdomain());
  let runtimeMode: RuntimeDeliveryMode = "local_mock";
  if (base.ready) {
    runtimeMode =
      process.env.TAPCONNECT_EMAIL_RUNTIME === "live_ready"
        ? "live_ready"
        : "provider_test";
  }
  if (override?.runtimeMode) runtimeMode = override.runtimeMode;

  return {
    configured: override?.configured ?? base.ready,
    fromConfigured: base.fromConfigured,
    missingEnvVars: base.missingEnvVars,
    webhookSecretConfigured,
    receivingSubdomainConfigured,
    runtimeMode,
    disclosure: RESEND_PROVIDER_DISCLOSURE,
    productSendName: TAPCONNECT_EMAIL_NAME,
    liveCampaignSendingEnabled: false,
  };
}

function clientOrNull(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;
  return new Resend(key);
}

export type AdapterSendResult =
  | { ok: true; id: string; mock: boolean }
  | { ok: false; error: string; mock: boolean };

/** Transactional / routing-test send only — never Campaign audience blast */
export async function adapterSendTransactional(input: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  idempotencyKey?: string;
  forceMock?: boolean;
}): Promise<AdapterSendResult> {
  const readiness = resolveResendAdapterReadiness();
  if (input.forceMock || !readiness.configured) {
    return {
      ok: true,
      id: `mock_tx_${Date.now().toString(36)}`,
      mock: true,
    };
  }
  const resend = clientOrNull();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  if (!resend || !from) {
    return { ok: false, error: "Resend not configured", mock: false };
  }
  try {
    const { data, error } = await resend.emails.send(
      {
        from,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
        replyTo: input.replyTo,
      },
      input.idempotencyKey
        ? { idempotencyKey: input.idempotencyKey }
        : undefined
    );
    if (error) return { ok: false, error: error.message, mock: false };
    return { ok: true, id: data?.id ?? "unknown", mock: false };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Send failed",
      mock: false,
    };
  }
}

export type WebhookVerifyResult =
  | { ok: true; event: { type: string; data: Record<string, unknown>; created_at?: string } }
  | { ok: false; error: string };

/**
 * Verify Resend/Svix signature using official SDK webhooks.verify.
 * Supports secret rotation via previous secret env.
 */
export function adapterVerifyWebhook(input: {
  rawBody: string;
  headers: { id: string; timestamp: string; signature: string };
}): WebhookVerifyResult {
  const secrets = [
    process.env.RESEND_WEBHOOK_SECRET?.trim(),
    process.env.RESEND_WEBHOOK_SECRET_PREVIOUS?.trim(),
  ].filter(Boolean) as string[];

  if (secrets.length === 0) {
    // Local mock path — accept fixture events only when explicitly labeled
    try {
      const parsed = JSON.parse(input.rawBody) as {
        type?: string;
        data?: Record<string, unknown>;
        created_at?: string;
        __tapconnect_mock?: boolean;
      };
      if (parsed.__tapconnect_mock && parsed.type && parsed.data) {
        return {
          ok: true,
          event: {
            type: parsed.type,
            data: parsed.data,
            created_at: parsed.created_at,
          },
        };
      }
    } catch {
      /* fall through */
    }
    return { ok: false, error: "Webhook secret not configured" };
  }

  const resend = clientOrNull() ?? new Resend("re_webhook_verify_only");
  for (const webhookSecret of secrets) {
    try {
      const event = resend.webhooks.verify({
        payload: input.rawBody,
        headers: input.headers,
        webhookSecret,
      });
      return {
        ok: true,
        event: {
          type: event.type,
          data: event.data as unknown as Record<string, unknown>,
          created_at: "created_at" in event ? String((event as { created_at?: string }).created_at ?? "") : undefined,
        },
      };
    } catch {
      /* try next secret */
    }
  }
  return { ok: false, error: "Invalid webhook signature" };
}

export async function adapterGetReceivedEmail(emailId: string): Promise<
  | {
      ok: true;
      mock: boolean;
      email: {
        id: string;
        from: string;
        to: string[];
        subject: string;
        html: string | null;
        text: string | null;
        headers: Record<string, string> | null;
        message_id: string;
        attachments: Array<{
          id: string;
          filename: string | null;
          content_type: string;
          size?: number;
        }>;
      };
    }
  | { ok: false; error: string; mock: boolean }
> {
  const readiness = resolveResendAdapterReadiness();
  const forceMock =
    !readiness.configured ||
    emailId.startsWith("em_mock_") ||
    process.env.TAPCONNECT_EMAIL_FORCE_MOCK === "1";
  if (forceMock) {
    return {
      ok: true,
      mock: true,
      email: {
        id: emailId,
        from: "customer@example.com",
        to: [`reply+fixtureaaaaaaaaaaaa@${getReceivingSubdomain() ?? "reply.tapconnect.local"}`],
        subject: "Mock inbound reply",
        html: null,
        text: "This is a local mock inbound message. No external delivery occurred.",
        headers: { "auto-submitted": "no" },
        message_id: `<mock-${emailId}@tapconnect.local>`,
        attachments: [],
      },
    };
  }
  const resend = clientOrNull();
  if (!resend) return { ok: false, error: "Resend not configured", mock: false };
  try {
    const { data, error } = await resend.emails.receiving.get(emailId);
    if (error || !data) {
      return { ok: false, error: error?.message ?? "Not found", mock: false };
    }
    return {
      ok: true,
      mock: false,
      email: {
        id: data.id,
        from: data.from,
        to: data.to,
        subject: data.subject,
        html: data.html,
        text: data.text,
        headers: data.headers,
        message_id: data.message_id,
        attachments: (data.attachments ?? []).map((a) => ({
          id: a.id,
          filename: a.filename,
          content_type: a.content_type,
          size: a.size,
        })),
      },
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Retrieve failed",
      mock: false,
    };
  }
}

export async function adapterListAttachmentMeta(emailId: string): Promise<
  | {
      ok: true;
      mock: boolean;
      attachments: Array<{
        id: string;
        filename: string | null;
        content_type?: string;
        size?: number;
      }>;
    }
  | { ok: false; error: string; mock: boolean }
> {
  const readiness = resolveResendAdapterReadiness();
  if (!readiness.configured) {
    return { ok: true, mock: true, attachments: [] };
  }
  const resend = clientOrNull();
  if (!resend) return { ok: false, error: "Resend not configured", mock: false };
  try {
    const { data, error } = await resend.emails.receiving.attachments.list({
      emailId,
    });
    if (error || !data) {
      return { ok: false, error: error?.message ?? "List failed", mock: false };
    }
    return {
      ok: true,
      mock: false,
      attachments: (data.data ?? []).map((a) => ({
        id: a.id,
        filename: a.filename ?? null,
        content_type:
          "content_type" in a
            ? String((a as { content_type?: string }).content_type ?? "")
            : undefined,
        size:
          "size" in a ? Number((a as { size?: number }).size ?? 0) : undefined,
      })),
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "List failed",
      mock: false,
    };
  }
}

export async function adapterForwardReceived(input: {
  emailId: string;
  to: string;
  from: string;
  idempotencyKey?: string;
  /** When passthrough unsupported locally, send normalized body instead */
  normalized?: { text: string; html: string };
  forceMock?: boolean;
}): Promise<AdapterSendResult> {
  const readiness = resolveResendAdapterReadiness();
  if (input.forceMock || !readiness.configured) {
    return {
      ok: true,
      id: `mock_fwd_${Date.now().toString(36)}`,
      mock: true,
    };
  }
  const resend = clientOrNull();
  if (!resend) return { ok: false, error: "Resend not configured", mock: false };
  try {
    const { data, error } = await resend.emails.receiving.forward(
      input.normalized
        ? {
            emailId: input.emailId,
            to: input.to,
            from: input.from,
            passthrough: false,
            text: input.normalized.text,
            html: input.normalized.html,
          }
        : {
            emailId: input.emailId,
            to: input.to,
            from: input.from,
            passthrough: true,
          },
      input.idempotencyKey
        ? { idempotencyKey: input.idempotencyKey }
        : undefined
    );
    if (error) return { ok: false, error: error.message, mock: false };
    return { ok: true, id: data?.id ?? "unknown", mock: false };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Forward failed",
      mock: false,
    };
  }
}
