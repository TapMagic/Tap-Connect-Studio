/**
 * Routing selection + pipeline decision helpers (V1 simple rules).
 */

import { categoryAccepts } from "./destination";
import { canRouteToDestination, shouldPauseAfterFailures } from "./verification";
import type {
  ReplyDestinationRecord,
  ReplyMessageCategory,
  ResolvedReplyPolicy,
} from "./types";

export type RouteSelection =
  | {
      ok: true;
      destination: ReplyDestinationRecord;
      role: "primary" | "fallback" | "tapinbox";
      reason: string;
    }
  | {
      ok: false;
      code:
        | "direct_external"
        | "no_destination"
        | "destination_blocked"
        | "category_mismatch"
        | "all_blocked";
      reason: string;
      useTapInboxFallback: boolean;
    };

export function selectRouteDestination(input: {
  policy: ResolvedReplyPolicy;
  category: ReplyMessageCategory;
  primary?: ReplyDestinationRecord | null;
  fallback?: ReplyDestinationRecord | null;
}): RouteSelection {
  if (input.policy.mode === "DIRECT_EXTERNAL") {
    return {
      ok: false,
      code: "direct_external",
      reason: "Direct external Reply-To — TapConnect does not receive replies.",
      useTapInboxFallback: false,
    };
  }

  if (input.policy.mode === "TAP_INBOX") {
    return {
      ok: true,
      destination: syntheticTapInboxDestination(input.policy.businessId),
      role: "tapinbox",
      reason: "Policy mode is TapInbox.",
    };
  }

  const tryDest = (
    dest: ReplyDestinationRecord | null | undefined,
    role: "primary" | "fallback"
  ): RouteSelection | null => {
    if (!dest) return null;
    if (!categoryAccepts(dest.selectedCategories, input.category)) {
      return {
        ok: false,
        code: "category_mismatch",
        reason: "Destination does not accept this message category.",
        useTapInboxFallback: input.policy.useTapInboxFallback,
      };
    }
    if (shouldPauseAfterFailures(dest.consecutiveFailureCount) || dest.paused) {
      return null;
    }
    const gate = canRouteToDestination(dest);
    if (!gate.ok) return null;
    return {
      ok: true,
      destination: dest,
      role,
      reason: role === "primary" ? "Primary destination selected." : "Fallback destination selected.",
    };
  };

  const primaryTry = tryDest(input.primary, "primary");
  if (primaryTry?.ok) return primaryTry;

  const fallbackTry = tryDest(input.fallback, "fallback");
  if (fallbackTry?.ok) return fallbackTry;

  if (input.policy.useTapInboxFallback || input.policy.mode === "TAP_ROUTE_EXTERNAL") {
    return {
      ok: true,
      destination: syntheticTapInboxDestination(input.policy.businessId),
      role: "tapinbox",
      reason: "Primary/fallback unavailable — using TapInbox fallback.",
    };
  }

  return {
    ok: false,
    code: "all_blocked",
    reason: "No valid destination available.",
    useTapInboxFallback: false,
  };
}

export function syntheticTapInboxDestination(
  businessId: string
): ReplyDestinationRecord {
  const now = new Date().toISOString();
  return {
    id: `tapinbox:${businessId}`,
    businessId,
    name: "TapInbox",
    destinationType: "TAP_INBOX",
    verificationStatus: "VERIFIED",
    enabled: true,
    role: "FALLBACK",
    selectedCategories: ["all"],
    keepCopyInTap: true,
    capabilities: [
      "receive_initial_handoff",
      "receive_original_message",
      "receive_normalized_context",
      "receive_attachments",
      "return_full_thread",
      "supports_reply",
      "supports_bidirectional_sync",
    ],
    consecutiveFailureCount: 0,
    paused: false,
    createdAt: now,
    updatedAt: now,
  };
}

export function buildIdempotencyKey(parts: {
  providerMessageId: string;
  destinationId: string;
  attemptNumber: number;
}): string {
  return `route:${parts.providerMessageId}:${parts.destinationId}:${parts.attemptNumber}`;
}
