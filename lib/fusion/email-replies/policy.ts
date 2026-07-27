/**
 * Business → Location → Campaign reply policy resolution.
 * One canonical hierarchy — no competing mode systems.
 */

import type {
  CampaignReplyHandlingOverride,
  ReplyHandlingMode,
  ReplyPolicyRecord,
  ResolvedReplyPolicy,
} from "./types";

export function defaultResolvedPolicy(businessId: string): ResolvedReplyPolicy {
  return {
    mode: "TAP_ROUTE_EXTERNAL",
    source: "fallback",
    businessId,
    keepCopyInTap: false,
    notifyOnFailure: true,
    useTapInboxFallback: true,
    activated: false,
    skipTestAcknowledged: false,
  };
}

export function resolveReplyPolicy(input: {
  businessId: string;
  locationId?: string | null;
  campaignId?: string | null;
  businessPolicy?: ReplyPolicyRecord | null;
  locationPolicy?: ReplyPolicyRecord | null;
  campaignOverride?: CampaignReplyHandlingOverride | null;
}): ResolvedReplyPolicy {
  const base =
    (input.locationId && input.locationPolicy) ||
    input.businessPolicy ||
    null;

  let resolved: ResolvedReplyPolicy = base
    ? {
        mode: base.mode,
        source: input.locationId && input.locationPolicy ? "location" : "business",
        businessId: input.businessId,
        locationId: base.locationId ?? input.locationId ?? null,
        campaignId: input.campaignId ?? null,
        primaryDestinationId: base.primaryDestinationId,
        fallbackDestinationId: base.fallbackDestinationId,
        keepCopyInTap: base.keepCopyInTap,
        notifyOnFailure: base.notifyOnFailure,
        failureNotificationAddress: base.failureNotificationAddress,
        useTapInboxFallback: base.useTapInboxFallback,
        activated: base.activated,
        skipTestAcknowledged: base.skipTestAcknowledged,
      }
    : defaultResolvedPolicy(input.businessId);

  resolved = {
    ...resolved,
    campaignId: input.campaignId ?? null,
  };

  const override = input.campaignOverride;
  if (override?.override) {
    resolved = {
      ...resolved,
      source: "campaign",
      mode: override.mode ?? resolved.mode,
      primaryDestinationId:
        override.primaryDestinationId !== undefined
          ? override.primaryDestinationId
          : resolved.primaryDestinationId,
      fallbackDestinationId:
        override.fallbackDestinationId !== undefined
          ? override.fallbackDestinationId
          : resolved.fallbackDestinationId,
      keepCopyInTap:
        override.keepCopyInTap !== undefined
          ? override.keepCopyInTap
          : resolved.keepCopyInTap,
      useTapInboxFallback:
        override.useTapInboxFallback !== undefined
          ? override.useTapInboxFallback
          : resolved.useTapInboxFallback,
      directReplyTo: override.directReplyTo ?? resolved.directReplyTo,
    };
  }

  return resolved;
}

export function parseCampaignReplyOverride(
  raw: unknown
): CampaignReplyHandlingOverride | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.override !== true) return null;
  const modes: ReplyHandlingMode[] = [
    "TAP_ROUTE_EXTERNAL",
    "TAP_INBOX",
    "DIRECT_EXTERNAL",
    "CONNECTED_DESTINATION",
  ];
  const mode =
    typeof o.mode === "string" && modes.includes(o.mode as ReplyHandlingMode)
      ? (o.mode as ReplyHandlingMode)
      : undefined;
  return {
    override: true,
    mode,
    primaryDestinationId:
      o.primaryDestinationId === null
        ? null
        : typeof o.primaryDestinationId === "string"
          ? o.primaryDestinationId
          : undefined,
    fallbackDestinationId:
      o.fallbackDestinationId === null
        ? null
        : typeof o.fallbackDestinationId === "string"
          ? o.fallbackDestinationId
          : undefined,
    keepCopyInTap:
      typeof o.keepCopyInTap === "boolean" ? o.keepCopyInTap : undefined,
    useTapInboxFallback:
      typeof o.useTapInboxFallback === "boolean"
        ? o.useTapInboxFallback
        : undefined,
    directReplyTo:
      o.directReplyTo === null
        ? null
        : typeof o.directReplyTo === "string"
          ? o.directReplyTo
          : undefined,
    updatedAt: typeof o.updatedAt === "string" ? o.updatedAt : undefined,
  };
}

export function resetCampaignReplyOverride(): null {
  return null;
}

export function modeHostLabel(mode: ReplyHandlingMode): string {
  switch (mode) {
    case "TAP_ROUTE_EXTERNAL":
      return "My existing email or system";
    case "TAP_INBOX":
      return "TapInbox";
    case "DIRECT_EXTERNAL":
      return "Directly outside TapConnect";
    case "CONNECTED_DESTINATION":
      return "Connected integration";
  }
}

export function modeTechnicalLabel(mode: ReplyHandlingMode): string {
  switch (mode) {
    case "TAP_ROUTE_EXTERNAL":
      return "Tap receives first and routes externally";
    case "TAP_INBOX":
      return "TapInbox retains the conversation";
    case "DIRECT_EXTERNAL":
      return "Replies go directly outside TapConnect";
    case "CONNECTED_DESTINATION":
      return "Connected destination handoff";
  }
}
