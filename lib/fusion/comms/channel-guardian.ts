/**
 * Channel Guardian — deterministic eligibility. Never an AI decision.
 */

export type MessageChannel =
  | "email"
  | "messenger"
  | "instagram_dm"
  | "whatsapp"
  | "telegram"
  | "manychat"
  | "sms";

export type GuardianPurpose =
  | "transactional"
  | "service"
  | "promo"
  | "loyalty"
  | "support";

export type GuardianContext = {
  channel: MessageChannel;
  businessId?: string;
  recipientId?: string;
  purpose?: GuardianPurpose;
  consentGiven?: boolean;
  suppressed?: boolean;
  quietHours?: { start: string; end: string; timezone: string };
  now?: Date;
  featureEnabled?: boolean;
  providerReady?: boolean;
  planAllows?: boolean;
  userInitiated?: boolean;
  withinProviderWindow?: boolean;
  templateApproved?: boolean;
  frequencyExceeded?: boolean;
};

export type GuardianDecision = {
  allowed: boolean;
  reason: string;
  code:
    | "ok"
    | "feature_off"
    | "provider_missing"
    | "no_consent"
    | "quiet_hours"
    | "channel_blocked"
    | "missing_recipient"
    | "suppressed"
    | "plan_blocked"
    | "frequency"
    | "window_closed"
    | "template_required";
};

function inQuietHours(
  now: Date,
  quiet: { start: string; end: string; timezone: string }
): boolean {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: quiet.timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
    const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
    const current = `${hour}:${minute}`;
    const { start, end } = quiet;
    if (start <= end) return current >= start && current < end;
    return current >= start || current < end;
  } catch {
    return false;
  }
}

export function evaluateChannelGuardian(ctx: GuardianContext): GuardianDecision {
  if (ctx.featureEnabled === false) {
    return { allowed: false, code: "feature_off", reason: "Messaging feature is disabled" };
  }
  if (ctx.planAllows === false) {
    return { allowed: false, code: "plan_blocked", reason: "Plan does not include this channel" };
  }
  if (ctx.providerReady === false) {
    return {
      allowed: false,
      code: "provider_missing",
      reason: `Provider not certified for ${ctx.channel}`,
    };
  }
  if (ctx.suppressed) {
    return { allowed: false, code: "suppressed", reason: "Address is on suppression list" };
  }
  if (ctx.channel !== "email" && !ctx.recipientId) {
    return {
      allowed: false,
      code: "missing_recipient",
      reason: "Recipient required for direct messaging channels",
    };
  }

  const purpose = ctx.purpose ?? "promo";
  const needsConsent = purpose === "promo" || purpose === "loyalty" || ctx.channel !== "email";
  if (needsConsent && ctx.consentGiven === false) {
    return {
      allowed: false,
      code: "no_consent",
      reason: "Explicit opt-in required for this purpose/channel",
    };
  }

  if (ctx.quietHours && ctx.now && purpose === "promo" && inQuietHours(ctx.now, ctx.quietHours)) {
    return { allowed: false, code: "quiet_hours", reason: "Quiet hours active for promotional sends" };
  }
  if (ctx.frequencyExceeded && purpose === "promo") {
    return { allowed: false, code: "frequency", reason: "Frequency cap exceeded" };
  }

  const windowed: MessageChannel[] = ["whatsapp", "messenger", "instagram_dm"];
  if (
    windowed.includes(ctx.channel) &&
    !ctx.userInitiated &&
    ctx.withinProviderWindow === false &&
    ctx.templateApproved !== true
  ) {
    return {
      allowed: false,
      code: "window_closed",
      reason: "Outside provider interaction window and no approved template",
    };
  }

  return { allowed: true, code: "ok", reason: "Eligible to send" };
}
