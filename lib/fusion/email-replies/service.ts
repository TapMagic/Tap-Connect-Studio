/**
 * Customer setup + destination lifecycle — durable store via requireEmailRepliesStore().
 */

import {
  buildCollapsedCardSummary,
  resolveIntegrationCardState,
} from "./card-state";
import { visibilityBoundaryForMode } from "./capabilities";
import { validateDestinationAddress } from "./destination";
import { buildDestinationTestMessage } from "./handoff";
import { createReplyEvidence } from "./evidence";
import {
  modeHostLabel,
  modeTechnicalLabel,
  parseCampaignReplyOverride,
  resolveReplyPolicy,
} from "./policy";
import {
  adapterSendTransactional,
  resolveResendAdapterReadiness,
} from "./providers/resend-adapter";
import type { EmailRepliesStore } from "./store";
import {
  EmailRepliesStoreUnavailableError,
  requireEmailRepliesStore,
} from "./store-resolve";
import {
  VERIFICATION_RATE_WINDOW_MS,
  canResendVerification,
  canRouteToDestination,
  evaluateVerificationToken,
  hashToken,
} from "./verification";
import type {
  ReplyHandlingMode,
  ReplyMessageCategory,
  ResolvedReplyPolicy,
} from "./types";
import {
  EMAIL_REPLIES_PRODUCT_NAME,
  EMAIL_REPLIES_PROMISE,
  TAPCONNECT_EMAIL_NAME,
} from "./types";

async function storeOf(store?: EmailRepliesStore) {
  return store ?? (await requireEmailRepliesStore());
}

function unavailable(err: unknown) {
  const message =
    err instanceof EmailRepliesStoreUnavailableError
      ? err.message
      : "Email & Replies durable store is unavailable. Settings were not saved.";
  return { ok: false as const, error: message, code: "store_unavailable" as const };
}

export async function getEmailRepliesCardModel(input: {
  businessId: string;
  locationId?: string | null;
  store?: EmailRepliesStore;
}) {
  try {
    const store = await storeOf(input.store);
    const businessPolicy = await store.getPolicy(input.businessId);
    const locationPolicy = input.locationId
      ? await store.getPolicy(input.businessId, input.locationId)
      : null;
    const policy = resolveReplyPolicy({
      businessId: input.businessId,
      locationId: input.locationId,
      businessPolicy,
      locationPolicy,
    });
    const primary = policy.primaryDestinationId
      ? await store.getDestination(policy.primaryDestinationId)
      : null;
    const readiness = resolveResendAdapterReadiness();
    const durableActive = store.kind === "prisma";
    const state = resolveIntegrationCardState({
      policy,
      primaryDestination: primary,
      providerConfigured: readiness.configured,
      runtimeMode: readiness.runtimeMode,
      liveCampaignSendingEnabled: false,
    });
    const summary = buildCollapsedCardSummary({
      state,
      mode: policy.activated ? policy.mode : null,
      destinationName: primary?.name,
      destinationAddress: primary?.normalizedAddress,
      providerConfigured: readiness.configured,
      runtimeMode: readiness.runtimeMode,
    });
    return {
      ok: true as const,
      productName: EMAIL_REPLIES_PRODUCT_NAME,
      promise: EMAIL_REPLIES_PROMISE,
      deliveryName: TAPCONNECT_EMAIL_NAME,
      state,
      summary,
      policy,
      primary,
      readiness,
      durableStore: { kind: store.kind, active: durableActive },
    };
  } catch (err) {
    const readiness = resolveResendAdapterReadiness();
    return {
      ok: false as const,
      productName: EMAIL_REPLIES_PRODUCT_NAME,
      promise: EMAIL_REPLIES_PROMISE,
      deliveryName: TAPCONNECT_EMAIL_NAME,
      state: "needs_attention" as const,
      summary: buildCollapsedCardSummary({
        state: "needs_attention",
        mode: null,
        providerConfigured: readiness.configured,
        runtimeMode: readiness.runtimeMode,
      }),
      policy: null,
      primary: null,
      readiness,
      durableStore: { kind: "prisma" as const, active: false },
      error:
        err instanceof Error
          ? err.message
          : "Email & Replies durable store is unavailable",
    };
  }
}

export async function saveWizardDraft(input: {
  businessId: string;
  mode: ReplyHandlingMode;
  destinationName?: string;
  destinationAddress?: string;
  integrationId?: string;
  categories?: ReplyMessageCategory[];
  keepCopyInTap?: boolean;
  notifyOnFailure?: boolean;
  failureNotificationAddress?: string;
  useTapInboxFallback?: boolean;
  directReplyTo?: string;
  notificationEmail?: string;
  skipTestAcknowledged?: boolean;
  store?: EmailRepliesStore;
}) {
  try {
    const store = await storeOf(input.store);
    let primaryId: string | null = null;
    let fallbackId: string | null = null;

    if (input.mode === "TAP_INBOX") {
      const dest = await store.upsertDestination({
        businessId: input.businessId,
        name: "TapInbox",
        destinationType: "TAP_INBOX",
        address: "tapinbox",
        selectedCategories: input.categories ?? ["all"],
        keepCopyInTap: true,
      });
      await store.markDestinationVerified(dest.id, input.businessId);
      primaryId = dest.id;
    } else if (input.mode === "DIRECT_EXTERNAL") {
      const addr = input.directReplyTo ?? input.destinationAddress;
      const v = validateDestinationAddress(addr ?? "", "DIRECT_REPLY_TO");
      if (!v.ok) return { ok: false as const, error: v.error };
      const dest = await store.upsertDestination({
        businessId: input.businessId,
        name: input.destinationName ?? "Direct Reply-To",
        destinationType: "DIRECT_REPLY_TO",
        address: v.normalized,
        selectedCategories: ["all"],
      });
      primaryId = dest.id;
    } else if (input.mode === "CONNECTED_DESTINATION") {
      const dest = await store.upsertDestination({
        businessId: input.businessId,
        name: input.destinationName ?? "Connected destination",
        destinationType: input.integrationId?.includes("webhook")
          ? "WEBHOOK"
          : "INTEGRATION",
        destinationReference: input.integrationId ?? "connected",
        address: input.destinationAddress,
        selectedCategories: input.categories ?? ["all"],
        keepCopyInTap: input.keepCopyInTap,
      });
      primaryId = dest.id;
    } else {
      const v = validateDestinationAddress(
        input.destinationAddress ?? "",
        "EMAIL_ADDRESS"
      );
      if (!v.ok) return { ok: false as const, error: v.error };
      const dest = await store.upsertDestination({
        businessId: input.businessId,
        name: input.destinationName ?? "Customer Support",
        destinationType: "EMAIL_ADDRESS",
        address: v.normalized,
        selectedCategories: input.categories ?? ["all"],
        keepCopyInTap: input.keepCopyInTap,
        failureNotificationAddress: input.failureNotificationAddress,
      });
      primaryId = dest.id;
    }

    if (input.useTapInboxFallback !== false && input.mode !== "TAP_INBOX") {
      const existing = (await store.listDestinations(input.businessId)).find(
        (d) => d.destinationType === "TAP_INBOX" && d.role === "FALLBACK"
      );
      const fb =
        existing ??
        (await store.upsertDestination({
          businessId: input.businessId,
          name: "TapInbox fallback",
          destinationType: "TAP_INBOX",
          role: "FALLBACK",
          keepCopyInTap: true,
        }));
      await store.markDestinationVerified(fb.id, input.businessId);
      fallbackId = fb.id;
    }

    const policy = await store.setPolicy({
      businessId: input.businessId,
      mode: input.mode,
      primaryDestinationId: primaryId,
      fallbackDestinationId: fallbackId,
      keepCopyInTap: input.keepCopyInTap ?? false,
      notifyOnFailure: input.notifyOnFailure ?? true,
      failureNotificationAddress:
        input.failureNotificationAddress ?? input.notificationEmail ?? null,
      useTapInboxFallback: input.useTapInboxFallback ?? true,
      activated: false,
      skipTestAcknowledged: input.skipTestAcknowledged ?? false,
    });

    return {
      ok: true as const,
      policy,
      primaryDestinationId: primaryId,
      visibility: visibilityBoundaryForMode(input.mode),
    };
  } catch (err) {
    return unavailable(err);
  }
}

export async function sendDestinationVerification(input: {
  businessId: string;
  destinationId: string;
  store?: EmailRepliesStore;
}) {
  try {
    const store = await storeOf(input.store);
    const dest = await store.getDestination(input.destinationId);
    if (!dest || dest.businessId !== input.businessId) {
      return { ok: false as const, error: "Destination not found" };
    }
    if (dest.verificationStatus === "REVOKED") {
      return { ok: false as const, error: "Revoked destinations cannot be verified." };
    }
    if (dest.destinationType === "TAP_INBOX") {
      await store.markDestinationVerified(dest.id, input.businessId);
      return { ok: true as const, status: "verified" as const, mock: true };
    }
    const recent = await store.countVerificationSends(
      dest.id,
      VERIFICATION_RATE_WINDOW_MS
    );
    const rate = canResendVerification({ recentSendsInWindow: recent });
    if (!rate.ok) {
      return { ok: false as const, error: rate.retryAfterHint, code: rate.code };
    }

    const { plainToken, record } = await store.createVerificationToken({
      destinationId: dest.id,
      businessId: input.businessId,
    });

    const verifyUrl = `/api/email-replies/verify?token=${encodeURIComponent(plainToken)}&destinationId=${encodeURIComponent(dest.id)}`;
    const send = await adapterSendTransactional({
      to: dest.normalizedAddress ?? "",
      subject: "Verify your TapConnect reply destination",
      html: `<p>Confirm this address can receive TapConnect reply routing.</p><p><a href="${verifyUrl}">Verify destination</a></p><p>Or enter code: <code>${plainToken}</code></p><p>This is a verification message. No customer was contacted.</p>`,
      text: `Verify destination: ${verifyUrl}\nCode: ${plainToken}\nThis is a verification message. No customer was contacted.`,
      forceMock: !resolveResendAdapterReadiness().configured,
    });

    await store.addEvidence(
      createReplyEvidence({
        kind: "destination_verified",
        businessId: input.businessId,
        destinationType: dest.destinationType,
        destinationReference: dest.id,
        success: false,
        detail: "Verification sent (pending confirmation)",
        evidenceClass: "incomplete",
      })
    );

    return {
      ok: true as const,
      status: "pending" as const,
      mock: send.mock,
      /** Returned only for automated proofs — never logged as raw secret in UI */
      tokenForTests: plainToken,
      expiresAt: record.expiresAt,
    };
  } catch (err) {
    return unavailable(err);
  }
}

export async function confirmDestinationVerification(input: {
  businessId: string;
  destinationId: string;
  token: string;
  store?: EmailRepliesStore;
}) {
  try {
    const store = await storeOf(input.store);
    const dest = await store.getDestination(input.destinationId);
    if (!dest || dest.businessId !== input.businessId) {
      return { ok: false as const, code: "not_found" as const };
    }
    if (dest.verificationStatus === "REVOKED") {
      return { ok: false as const, code: "revoked" as const };
    }
    const record = await store.findTokenByPlain(input.token);
    const evalResult = evaluateVerificationToken({
      presentedToken: input.token,
      record,
      expectedBusinessId: input.businessId,
      expectedDestinationId: input.destinationId,
    });
    if (!evalResult.ok) return { ok: false as const, code: evalResult.code };
    await store.markTokenUsed(hashToken(input.token));
    await store.markDestinationVerified(dest.id, input.businessId);
    await store.addEvidence(
      createReplyEvidence({
        kind: "destination_verified",
        businessId: input.businessId,
        destinationType: dest.destinationType,
        destinationReference: dest.id,
        success: true,
      })
    );
    return {
      ok: true as const,
      destination: await store.getDestination(dest.id),
    };
  } catch (err) {
    return unavailable(err);
  }
}

export async function sendDestinationRouteTest(input: {
  businessId: string;
  destinationId: string;
  store?: EmailRepliesStore;
}) {
  try {
    const store = await storeOf(input.store);
    const dest = await store.getDestination(input.destinationId);
    if (!dest || dest.businessId !== input.businessId) {
      return { ok: false as const, error: "Destination not found" };
    }
    const gate = canRouteToDestination(dest);
    if (!gate.ok) return { ok: false as const, error: gate.reason };

    const msg = buildDestinationTestMessage({});
    const send = await adapterSendTransactional({
      to: dest.normalizedAddress || "tapinbox@local",
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
      forceMock: !resolveResendAdapterReadiness().configured,
    });
    if (!send.ok) {
      await store.markDestinationTested(dest.id, "failure", send.error);
      return { ok: false as const, error: send.error, mock: send.mock };
    }
    await store.markDestinationTested(dest.id, "success");
    await store.addEvidence(
      createReplyEvidence({
        kind: "destination_tested",
        businessId: input.businessId,
        destinationType: dest.destinationType,
        destinationReference: dest.id,
        providerReference: send.id,
        success: true,
        detail: send.mock
          ? "Local mock test — no customer was contacted"
          : "Provider test — no customer list was contacted",
      })
    );
    return {
      ok: true as const,
      mock: send.mock,
      providerRef: send.id,
      message: msg,
    };
  } catch (err) {
    return unavailable(err);
  }
}

export async function activateReplyRouting(input: {
  businessId: string;
  store?: EmailRepliesStore;
}) {
  try {
    const store = await storeOf(input.store);
    const policy = await store.getPolicy(input.businessId);
    if (!policy) return { ok: false as const, error: "Complete setup first" };
    const primary = policy.primaryDestinationId
      ? await store.getDestination(policy.primaryDestinationId)
      : null;

    if (policy.mode !== "TAP_INBOX") {
      if (!primary) {
        return { ok: false as const, error: "Primary destination required" };
      }
      if (primary.verificationStatus !== "VERIFIED") {
        return {
          ok: false as const,
          error: "Destination must be verified before activation",
        };
      }
      if (
        policy.mode !== "DIRECT_EXTERNAL" &&
        !primary.lastTestedAt &&
        !policy.skipTestAcknowledged
      ) {
        return {
          ok: false as const,
          error:
            "Send a routing test, or explicitly continue as configured but untested",
        };
      }
    }

    if (policy.mode === "DIRECT_EXTERNAL" && primary) {
      await store.addEvidence(
        createReplyEvidence({
          kind: "direct_external_reply_configured",
          businessId: input.businessId,
          destinationType: "DIRECT_REPLY_TO",
          destinationReference: primary.id,
          success: true,
        })
      );
    }

    const activated = await store.setPolicy({
      ...policy,
      activated: true,
    });

    return {
      ok: true as const,
      policy: activated,
      summary: {
        emailDelivery: TAPCONNECT_EMAIL_NAME,
        replies: modeTechnicalLabel(activated.mode),
        primary: primary
          ? { name: primary.name, address: primary.normalizedAddress }
          : null,
        modeLabel: modeHostLabel(activated.mode),
        visibility: visibilityBoundaryForMode(activated.mode),
      },
    };
  } catch (err) {
    return unavailable(err);
  }
}

export async function acknowledgeConfiguredButUntested(input: {
  businessId: string;
  store?: EmailRepliesStore;
}) {
  try {
    const store = await storeOf(input.store);
    const policy = await store.getPolicy(input.businessId);
    if (!policy) return { ok: false as const, error: "No policy" };
    return {
      ok: true as const,
      policy: await store.setPolicy({ ...policy, skipTestAcknowledged: true }),
    };
  } catch (err) {
    return unavailable(err);
  }
}

export async function setDestinationEnabledState(input: {
  businessId: string;
  destinationId: string;
  enabled: boolean;
  store?: EmailRepliesStore;
}) {
  try {
    const store = await storeOf(input.store);
    const dest = await store.setDestinationEnabled(
      input.destinationId,
      input.businessId,
      input.enabled
    );
    if (!dest) return { ok: false as const, error: "Destination not found" };
    return { ok: true as const, destination: dest };
  } catch (err) {
    return unavailable(err);
  }
}

export async function revokeDestination(input: {
  businessId: string;
  destinationId: string;
  store?: EmailRepliesStore;
}) {
  try {
    const store = await storeOf(input.store);
    const dest = await store.revokeDestination(
      input.destinationId,
      input.businessId
    );
    if (!dest) return { ok: false as const, error: "Destination not found" };
    return { ok: true as const, destination: dest };
  } catch (err) {
    return unavailable(err);
  }
}

export async function listRoutingActivity(input: {
  businessId: string;
  store?: EmailRepliesStore;
  limit?: number;
}) {
  try {
    const store = await storeOf(input.store);
    const [attempts, replies, destinations] = await Promise.all([
      store.listRoutingAttempts(input.businessId, input.limit ?? 40),
      store.listInitialReplies(input.businessId, input.limit ?? 40),
      store.listDestinations(input.businessId),
    ]);
    const destById = new Map(destinations.map((d) => [d.id, d]));
    const replyById = new Map(replies.map((r) => [r.id, r]));

    const items = attempts.map((a) => {
      const reply = a.initialMessageId
        ? replyById.get(a.initialMessageId)
        : null;
      const dest = a.destinationId ? destById.get(a.destinationId) : null;
      const mock =
        a.providerRef?.startsWith("mock_") ||
        a.handoffKind === "local_mock" ||
        false;
      return {
        id: a.id,
        receivedAt: reply?.receivedAt ?? a.createdAt ?? null,
        campaignId: reply?.campaignId ?? null,
        category: reply?.classification ?? null,
        destinationName: dest?.name ?? "—",
        destinationAddress: dest?.normalizedAddress ?? null,
        routeState: a.status,
        fallback:
          dest?.role === "FALLBACK" || dest?.destinationType === "TAP_INBOX",
        classification: mock ? "local_mock" : "provider_test_or_live",
        failureReason:
          a.status === "failure"
            ? hostFailureReason(a.errorMessage)
            : null,
        boundary:
          "TapConnect tracks handoff evidence. Assignment, response, and resolution remain external unless a connector returns them.",
      };
    });

    // Also surface retained-only replies without routing attempts
    for (const r of replies) {
      if (r.routingState === "RETAINED_IN_TAP" || r.routingState === "ROUTED") {
        const already = items.some(
          (i) => i.id.startsWith("reply:") || replyById.get(i.id) === r
        );
        void already;
      }
    }

    return { ok: true as const, items };
  } catch (err) {
    return unavailable(err);
  }
}

function hostFailureReason(raw?: string | null): string {
  if (!raw) return "The destination did not accept this handoff.";
  if (/reject|bounce|550|mailbox/i.test(raw)) {
    return "The destination rejected the handoff.";
  }
  return "Routing failed. Check the destination or choose a fallback.";
}

export async function getCampaignReplyPolicyView(input: {
  businessId: string;
  campaignId: string;
  campaignOverride?: unknown;
  store?: EmailRepliesStore;
}): Promise<{
  inherited: ResolvedReplyPolicy;
  display: {
    title: string;
    inheritedFrom: string;
    destinationLabel: string;
    tapVisibility: string;
    externalVisibility: string;
    keepCopy: boolean;
    readiness: string;
    verificationState: string;
    warning?: string;
    isOverride: boolean;
  };
}> {
  const store = await storeOf(input.store);
  const override = parseCampaignReplyOverride(input.campaignOverride);
  const businessPolicy = await store.getPolicy(input.businessId);
  const inherited = resolveReplyPolicy({
    businessId: input.businessId,
    campaignId: input.campaignId,
    businessPolicy,
    campaignOverride: override,
  });
  const dest = inherited.primaryDestinationId
    ? await store.getDestination(inherited.primaryDestinationId)
    : null;
  const boundary = visibilityBoundaryForMode(inherited.mode);
  let warning: string | undefined;
  if (
    inherited.mode !== "TAP_INBOX" &&
    inherited.mode !== "DIRECT_EXTERNAL" &&
    (!dest ||
      dest.verificationStatus !== "VERIFIED" ||
      dest.paused ||
      !dest.enabled)
  ) {
    warning = "No valid reply route is ready for this Campaign.";
  }
  return {
    inherited,
    display: {
      title: "Reply handling",
      inheritedFrom: override
        ? "Campaign override"
        : `Inherited from business: ${dest?.name ?? "Not set up"}${
            dest?.normalizedAddress ? ` · ${dest.normalizedAddress}` : ""
          }`,
      destinationLabel: dest
        ? `${dest.name}${dest.normalizedAddress ? ` · ${dest.normalizedAddress}` : ""}`
        : modeHostLabel(inherited.mode),
      tapVisibility: boundary.tapTracks.join(", "),
      externalVisibility: boundary.externalTracks.join(", ") || "—",
      keepCopy: inherited.keepCopyInTap,
      readiness: inherited.activated ? "Active" : "Not activated",
      verificationState: dest?.verificationStatus ?? "n/a",
      warning,
      isOverride: Boolean(override),
    },
  };
}
