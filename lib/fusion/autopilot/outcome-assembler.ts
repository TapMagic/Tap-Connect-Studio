/**
 * Deterministic local assembler for card.offer.measurable@1.0.0 (F1).
 * No model calls, no live publish/send/spend, no Card/Campaign mutation.
 */

import {
  AUTOPILOT_PLAN_SCHEMA_VERSION,
  type AutopilotPlan,
  type MissingInformation,
  type ObjectMutation,
} from "./plan";
import {
  CARD_OFFER_MEASURABLE_MUTATIONS,
  CARD_OFFER_MEASURABLE_RECIPE,
  CARD_OFFER_MEASURABLE_RECIPE_ID,
  CARD_OFFER_MEASURABLE_VERSION,
  assertOfferFuseSourceOfTruth,
} from "./outcome-recipe";
import {
  CARD_OFFER_MEASURABLE_POLICY,
  decideApprovals,
  type ApprovalPolicy,
} from "./approval-policy";
import {
  evaluateFactUsability,
  isFactAuthoritative,
  type KnowledgeFact,
} from "./knowledge-fact";
import { createHumanIntervention, type HumanIntervention } from "./intervention";
import {
  buildHostQuestions,
  blockingQuestionsRemain,
  type HostQuestion,
} from "./host-questions";
import {
  assertNoForbiddenPrimaryTerminology,
  experienceStateLabel,
  groupApprovalsForHost,
  type GroupedPlainApproval,
} from "./plain-language";

export type OutcomeExperienceState =
  | "preparing"
  | "needs_detail"
  | "ready_to_review"
  | "approved_locally"
  | "cannot_continue"
  | "provider_unavailable"
  | "feature_disabled";

export type OutcomeChoiceId =
  | "measurable_card_offer"
  | "returning_weekend"
  | "custom_brief";

export const OUTCOME_CHOICES: Array<{
  id: OutcomeChoiceId;
  label: string;
  description: string;
  defaultBrief: string;
}> = [
  {
    id: "measurable_card_offer",
    label: "Create a measurable offer on my Card",
    description: "Spotlight on your Card, claim path, and Insights — prepared locally.",
    defaultBrief: "Create a measurable offer on my Card",
  },
  {
    id: "returning_weekend",
    label: "Bring returning customers back this weekend",
    description: "Returning-customer focus with a weekend window.",
    defaultBrief: "Bring returning customers back this weekend",
  },
  {
    id: "custom_brief",
    label: "Describe what you want",
    description: "Write a short outcome in your own words.",
    defaultBrief: "",
  },
];

export type AssemblerCampaignInput = {
  id: string;
  title: string;
  hasOffer: boolean;
  offerTitle?: string | null;
  offerDescription?: string | null;
  offerCode?: string | null;
  offerBlockId?: string | null;
  boundToThisCard?: boolean;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
};

export type OutcomeAssemblerInput = {
  brief: string;
  outcomeChoiceId?: OutcomeChoiceId;
  facts: KnowledgeFact[];
  brand: {
    businessName?: string;
    accentColor?: string;
    voice?: string;
    logoUrl?: string;
  };
  card: {
    id: string;
    hasSpotlight?: boolean;
    boundCampaignId?: string | null;
    retired?: boolean;
  };
  campaigns: AssemblerCampaignInput[];
  readiness: {
    featureOfferEnabled: boolean;
    featureAutopilotEnabled?: boolean;
    emailConnected: boolean;
    consentPathAvailable: boolean;
    tapPointAssigned: boolean;
    askQuestionAvailable?: boolean;
    keepCardAvailable?: boolean;
  };
  /** Host answers keyed by question id */
  answers?: Record<string, string>;
  /** Local plan status override after host approval */
  localApprovalStatus?: "draft" | "ready_for_review" | "approved";
  policy?: ApprovalPolicy;
  now?: Date;
  planId?: string;
};

export type CustomerPreviewStep = {
  id: string;
  title: string;
  description: string;
};

export type OutcomePreviewModel = {
  steps: CustomerPreviewStep[];
  spotlightTitle?: string;
  offerDescription?: string;
  emailSubject?: string;
  tapcastCaption?: string;
  metrics: string[];
  keepCardAvailable: boolean;
  askQuestionAvailable: boolean;
};

export type OutcomeExperienceResult = {
  plan: AutopilotPlan;
  state: OutcomeExperienceState;
  stateLabel: string;
  understood: string;
  preparedSummary: string;
  strategy: string;
  preparedComponents: string[];
  questions: HostQuestion[];
  plainApprovals: GroupedPlainApproval[];
  warnings: string[];
  journeySummary: string;
  preview: OutcomePreviewModel;
  readinessNotes: string[];
  nextSafeAction: string;
  /** Honesty: F1 never executes live */
  liveExecution: false;
  inventsPriceOrDiscount: false;
  duplicateOfferSourceOfTruth: false;
  primaryCopyCheck: ReturnType<typeof assertNoForbiddenPrimaryTerminology>;
  advanced: {
    recipeId: string;
    recipeVersion: string;
    factsUsed: string[];
    assumptions: string[];
    missingInformation: MissingInformation[];
    objectMutations: ObjectMutation[];
    policyDecisions: AutopilotPlan["approvalsRequired"];
    interventions: HumanIntervention[];
    providersRequired: string[];
    sourceOfTruth: typeof CARD_OFFER_MEASURABLE_RECIPE.sourceOfTruth;
  };
};

function parseBriefHints(brief: string) {
  const lower = brief.toLowerCase();
  return {
    returning: /returning|come back|bring .+ back|loyal/.test(lower),
    weekend: /weekend|saturday|sunday|this week/.test(lower),
    measurable: /measurable|measure|insights|track/.test(lower),
    /** Detect attempts to invent pricing — we still refuse to invent */
    mentionsDiscount: /%\s*off|discount|\$\d+|free\s+with/.test(lower),
  };
}

function authoritativeFactsByKind(facts: KnowledgeFact[], now: Date): Map<string, KnowledgeFact> {
  const map = new Map<string, KnowledgeFact>();
  for (const fact of facts) {
    if (isFactAuthoritative(fact, now)) {
      map.set(fact.kind, fact);
    }
  }
  return map;
}

function pickCampaign(
  campaigns: AssemblerCampaignInput[],
  boundCampaignId?: string | null
): AssemblerCampaignInput | null {
  if (boundCampaignId) {
    const bound = campaigns.find((c) => c.id === boundCampaignId && c.hasOffer);
    if (bound) return bound;
  }
  const boundFlag = campaigns.find((c) => c.boundToThisCard && c.hasOffer);
  if (boundFlag) return boundFlag;
  const withOffer = campaigns.filter((c) => c.hasOffer);
  if (withOffer.length === 1) return withOffer[0];
  return null;
}

function valueFromAnswers(
  answers: Record<string, string>,
  keys: string[]
): string | undefined {
  for (const key of keys) {
    const v = answers[key]?.trim();
    if (v) return v;
  }
  return undefined;
}

/**
 * Assemble a complete AutopilotPlan + host experience package.
 */
export function assembleCardOfferMeasurableOutcome(
  input: OutcomeAssemblerInput
): OutcomeExperienceResult {
  const now = input.now ?? new Date();
  const nowIso = now.toISOString();
  const policy = input.policy ?? CARD_OFFER_MEASURABLE_POLICY;
  const answers = input.answers ?? {};
  const hints = parseBriefHints(input.brief || "");
  const brief =
    input.brief?.trim() ||
    OUTCOME_CHOICES.find((c) => c.id === input.outcomeChoiceId)?.defaultBrief ||
    "Create a measurable offer on my Card";

  const sotCheck = assertOfferFuseSourceOfTruth(CARD_OFFER_MEASURABLE_RECIPE);
  const warnings: string[] = [];
  const interventions: HumanIntervention[] = [];
  const missingInformation: MissingInformation[] = [];
  const assumptions: string[] = [];

  if (!input.readiness.featureOfferEnabled) {
    return blockedResult({
      state: "feature_disabled",
      brief,
      nowIso,
      message: "Offers on Card are turned off for this workspace.",
      nextSafeAction: "Ask an admin to enable Card offers, or open the Card editor manually.",
      answers,
      policy,
      input,
    });
  }

  if (input.card.retired) {
    return blockedResult({
      state: "cannot_continue",
      brief,
      nowIso,
      message: "This Card is retired. Restore it before preparing an offer.",
      nextSafeAction: "Open Edit Card and restore, then try again.",
      answers,
      policy,
      input,
    });
  }

  const byKind = authoritativeFactsByKind(input.facts, now);

  // Contradictions / low confidence from provided facts
  for (const fact of input.facts) {
    const u = evaluateFactUsability(fact, { now });
    if (!u.usable) {
      interventions.push(u.intervention);
      if (u.reason === "confirmed_contradiction") {
        missingInformation.push({
          key: fact.kind,
          explanation: "Offer details disagree and must be resolved.",
          relatedFactId: fact.id,
          relatedInterventionCode: "contradiction",
        });
      }
      if (u.reason === "low_confidence") {
        missingInformation.push({
          key: fact.kind,
          explanation: "Please confirm this offer detail.",
          relatedFactId: fact.id,
          relatedInterventionCode: "low_confidence",
        });
      }
    }
  }

  const campaign = pickCampaign(input.campaigns, input.card.boundCampaignId);
  if (!campaign) {
    const eligible = input.campaigns.filter((c) => c.hasOffer);
    if (eligible.length === 0) {
      missingInformation.push({
        key: "campaign.id",
        explanation: "Create or choose a campaign offer for your Card.",
        relatedInterventionCode: "missing_fact",
      });
    } else {
      missingInformation.push({
        key: "campaign.id",
        explanation: "Which campaign offer should appear on your Card?",
        relatedInterventionCode: "missing_fact",
      });
    }
  }

  if (!input.card.id?.trim()) {
    missingInformation.push({
      key: "card.id",
      explanation: "Which Card should show this offer?",
      relatedInterventionCode: "missing_fact",
    });
  }

  // Offer value — never invent
  const offerValueFromFact =
    (byKind.get("offer.value")?.value as string | undefined) ||
    (byKind.get("offer.title")?.value as string | undefined) ||
    campaign?.offerTitle ||
    undefined;
  const offerValueFromAnswer = valueFromAnswers(answers, [
    "missing_offer.value",
    "missing_offer.title",
    "fact_offer.value",
    "fact_offer.title",
    "missing_offer.description",
    "confirm_offer.title",
    "confirm_offer.value",
  ]);
  const offerValue = offerValueFromAnswer || offerValueFromFact;

  if (!offerValue) {
    missingInformation.push({
      key: "offer.value",
      explanation: "What should customers receive?",
      relatedInterventionCode: "missing_fact",
    });
    interventions.push(
      createHumanIntervention({
        code: "missing_fact",
        affectedObjectOrStep: "offer.value",
        explanation: "What should customers receive?",
      })
    );
  } else if (hints.mentionsDiscount && !offerValueFromFact && offerValueFromAnswer) {
    assumptions.push("Host confirmed the offer value explicitly — Autopilot did not invent it.");
  } else if (hints.mentionsDiscount && !offerValueFromFact && !offerValueFromAnswer) {
    // brief mentioned discount language but no approved fact — already covered by missing
  }

  // Refuse invented price/discount mutations
  if (
    answers.invent_price === "true" ||
    answers.invent_discount === "true"
  ) {
    interventions.push(
      createHumanIntervention({
        code: "policy_prohibited",
        affectedObjectOrStep: "offer.value",
        explanation: "Autopilot will not invent a price or discount.",
      })
    );
  }

  const audienceAnswer =
    valueFromAnswers(answers, ["missing_offer.audience", "fact_offer.audience"]) ||
    (byKind.get("offer.audience")?.value as string | undefined) ||
    (hints.returning ? "returning" : "everyone");

  if (hints.returning) {
    assumptions.push("Audience focus: returning customers (from your request).");
  }
  if (hints.weekend) {
    assumptions.push("Timing: this weekend (from your request).");
  }
  if (input.brand.voice) {
    assumptions.push("Presentation follows your Brand Kit voice.");
  } else if (input.brand.accentColor) {
    assumptions.push("Presentation follows your Brand Kit colors.");
  }

  const expiresAnswer = valueFromAnswers(answers, [
    "missing_offer.expires_at",
    "fact_offer.expires_at",
  ]);

  // Build mutations from certified recipe — strip live/prohibited noise from primary execution set
  // but keep forbid mutations for policy encoding
  const objectMutations: ObjectMutation[] = CARD_OFFER_MEASURABLE_MUTATIONS.map((m) => {
    if (m.id === "mutate.campaign.offer_coupon") {
      return {
        ...m,
        payload: {
          ...m.payload,
          publish: true,
          campaignId: campaign?.id,
          offerBlockId: campaign?.offerBlockId,
          // Never set invent flags
          inventPrice: false,
          inventDiscount: false,
        },
      };
    }
    if (m.id === "mutate.card.spotlight.project") {
      return {
        ...m,
        payload: {
          ...m.payload,
          presentationOnly: true,
          cardId: input.card.id,
          brandAccent: input.brand.accentColor,
        },
      };
    }
    if (m.id === "mutate.distribution.email.variant") {
      const cardOnly =
        answers.email_not_connected === "card_only" ||
        answers.email_not_connected === "connect_later" ||
        !input.readiness.emailConnected;
      return {
        ...m,
        payload: {
          ...m.payload,
          mock: true,
          liveSend: false,
          customerContact: !cardOnly,
          consentPathValid:
            input.readiness.consentPathAvailable && input.readiness.emailConnected,
          deferred: cardOnly,
        },
      };
    }
    if (m.id === "mutate.follow_up.gate") {
      return {
        ...m,
        payload: {
          ...m.payload,
          consentPathValid: input.readiness.consentPathAvailable,
        },
      };
    }
    return { ...m };
  });

  // If host tried to invent via answers, attach a prohibited mutation for policy engine
  if (answers.invent_discount === "true" || answers.invent_price === "true") {
    objectMutations.push({
      id: "attempt.invent.price",
      kind: "update",
      target: "campaign.offer_coupon",
      ownership: "authoritative",
      description: "Rejected attempt to invent price/discount",
      payload: { inventDiscount: true },
    });
  }

  const factsUsed = [
    ...input.facts.filter((f) => isFactAuthoritative(f, now)).map((f) => f.id),
  ];
  if (campaign?.id) factsUsed.push(`campaign:${campaign.id}`);
  if (offerValue) factsUsed.push("offer.value:resolved");

  const providersRequired = input.readiness.emailConnected
    ? ["mock.distribution"]
    : ["mock.distribution"];

  // Email live provider never required in F1
  const scheduleNotes = [
    hints.weekend ? "Suggested window: this weekend" : null,
    expiresAnswer === "this_weekend"
      ? "Offer ends end of weekend"
      : expiresAnswer === "next_friday"
        ? "Offer ends next Friday"
        : expiresAnswer === "no_end"
          ? "No end date yet"
          : campaign?.scheduledEnd
            ? `Campaign end: ${campaign.scheduledEnd}`
            : null,
  ]
    .filter(Boolean)
    .join(" · ");

  let plan: AutopilotPlan = {
    id: input.planId ?? `plan_card_offer_${now.getTime().toString(36)}`,
    schemaVersion: AUTOPILOT_PLAN_SCHEMA_VERSION,
    recipeId: CARD_OFFER_MEASURABLE_RECIPE_ID,
    recipeVersion: CARD_OFFER_MEASURABLE_VERSION,
    objective: brief,
    strategy:
      "Use your Campaign offer as the source of truth, show it as Spotlight on your Card, prepare follow-up only when allowed, and measure views, claims, Keep Card, and follow-up readiness.",
    reason: "Host asked for a measurable Card offer outcome",
    audience: {
      summary:
        audienceAnswer === "returning"
          ? "Returning customers"
          : "Everyone who taps your Card",
      segments: audienceAnswer === "returning" ? ["returning"] : ["all"],
      contactTypes: ["customer"],
    },
    journeySummary:
      "Tap Point → Card Spotlight → claim or Keep Card → optional Ask a Question → Insights evidence",
    objectMutations,
    factsUsed,
    assumptions,
    missingInformation,
    providersRequired,
    costEstimate: {
      currency: "USD",
      amount: 0,
      basis: "Local preparation only — no live spend in F1",
    },
    riskEstimate: {
      level: "low",
      rationale: "Local plan preparation; publish and send remain gated",
    },
    approvalsRequired: [],
    schedule: {
      notes: scheduleNotes || "Host-controlled timing",
      startsAt: campaign?.scheduledStart ?? undefined,
      endsAt: campaign?.scheduledEnd ?? undefined,
    },
    successMetrics: CARD_OFFER_MEASURABLE_RECIPE.successMetrics.map((m) => ({
      id: m.id,
      name: m.name,
      measure: m.measure,
    })),
    fallback: CARD_OFFER_MEASURABLE_RECIPE.fallback,
    rollback: CARD_OFFER_MEASURABLE_RECIPE.rollback,
    policyAutoApproved: [],
    humanInterventions: [],
    status: input.localApprovalStatus === "approved" ? "approved" : "draft",
    createdAt: nowIso,
    updatedAt: nowIso,
    planVersion: 1,
  };

  const decision = decideApprovals(plan, policy);
  plan = {
    ...plan,
    approvalsRequired: decision.approvalsRequired,
    policyAutoApproved: decision.autoApproved,
    humanInterventions: [...interventions, ...decision.interventions],
  };

  // Soften provider_unavailable for mock path — email not connected is a choice, not hard block
  const emailConnected = input.readiness.emailConnected;
  if (!emailConnected) {
    warnings.push("Email is not connected yet. Your Card offer can still be prepared.");
  }
  if (!input.readiness.tapPointAssigned) {
    warnings.push("No Tap Point is assigned yet — customers cannot reach the Card until one is.");
  }
  if (!sotCheck.ok) {
    warnings.push("Offer source-of-truth encoding needs attention (advanced).");
  }

  const questions = buildHostQuestions({
    missingInformation,
    facts: input.facts,
    interventions: plan.humanInterventions,
    answeredKeys: Object.keys(answers).filter((k) => answers[k]?.trim()),
    emailConnected,
    now,
  });

  const hasBlockingContradiction = plan.humanInterventions.some(
    (i) => i.code === "contradiction" && i.blocking
  );
  const hasProhibitedInvent = decision.prohibited.includes("attempt.invent.price");
  const needsDetail = blockingQuestionsRemain(questions, answers);

  let state: OutcomeExperienceState = "ready_to_review";
  if (hasBlockingContradiction || hasProhibitedInvent) {
    state = "cannot_continue";
  } else if (needsDetail) {
    state = "needs_detail";
  } else if (input.localApprovalStatus === "approved") {
    state = "approved_locally";
  } else if (!emailConnected && answers.email_not_connected !== "card_only" && answers.email_not_connected !== "connect_later") {
    // still ready — email question is non-blocking
    state = "ready_to_review";
  }

  if (state === "needs_detail") {
    plan = { ...plan, status: "draft" };
  } else if (state === "approved_locally") {
    plan = { ...plan, status: "approved" };
  } else if (state === "ready_to_review") {
    plan = { ...plan, status: "ready_for_review" };
  }

  const businessName = input.brand.businessName || "your business";
  const understood = buildUnderstood({
    brief,
    audienceAnswer,
    hints,
    offerValue,
    campaignTitle: campaign?.title,
    weekend: hints.weekend,
  });

  const preparedComponents = [
    campaign
      ? `Campaign offer “${campaign.offerTitle || campaign.title}” as the source of truth`
      : "A Campaign offer (once you choose one)",
    "Card Spotlight projection using your Brand style",
    emailConnected
      ? "Email and TapCast presentation prepared for review (not sent)"
      : "Card-only path for now — email can be added when connected",
    "Insights for views, claims, Keep Card, and follow-up readiness",
    input.readiness.askQuestionAvailable !== false
      ? "Ask a Question stays available on the Card"
      : "Ask a Question can be enabled from Card utilities",
  ];

  const preparedSummary = offerValue
    ? `I prepared a ${audienceAnswer === "returning" ? "returning-customer " : ""}offer for your Card${hints.weekend ? ", scheduled for this weekend" : ""}. It will appear as a Spotlight, use your current Brand style, and measure views, claims, retained Cards, and follow-up readiness.`
    : `I started a measurable Card offer plan from “${brief}”. One detail is still needed before it’s ready to review.`;

  const plainApprovals = groupApprovalsForHost(
    decision.approvalsRequired.filter((a) => {
      // Don't scare with hard provider prohibits when mock path is fine
      if (a.id.startsWith("provider_") && a.level === "prohibited") return false;
      if (a.id.startsWith("forbid_") || a.id.startsWith("live_provider_")) return false;
      if (a.id === "forbid_live.sending" || a.scope === "wallet" || a.scope === "tapflow") return false;
      // Follow-up gates stay advanced while Card-only / deferred path is active
      if (
        a.level === "mandatory_human" &&
        (a.scope === "guardian" || a.scope === "consent") &&
        (!emailConnected ||
          answers.email_not_connected === "card_only" ||
          answers.email_not_connected === "connect_later")
      ) {
        return false;
      }
      // Keep meaningful host gates
      return (
        a.level === "review_before_publish" ||
        a.level === "review_before_send" ||
        a.level === "review_before_spend" ||
        a.level === "mandatory_human" ||
        (a.level === "prohibited" && a.id.includes("invent"))
      );
    })
  );

  // Ensure publish approval shows when ready
  if (
    state === "ready_to_review" ||
    state === "approved_locally" ||
    state === "needs_detail"
  ) {
    if (!plainApprovals.some((p) => p.label.includes("appears on your Card"))) {
      plainApprovals.unshift({
        id: "group_review_before_publish",
        label: "Review before this appears on your Card",
        blocking: true,
        sourceIds: ["publish_gate"],
      });
    }
  }

  const preview = buildPreviewModel({
    offerValue,
    offerDescription: campaign?.offerDescription || undefined,
    businessName,
    emailConnected,
    keepCardAvailable: input.readiness.keepCardAvailable !== false,
    askQuestionAvailable: input.readiness.askQuestionAvailable !== false,
    audienceAnswer,
  });

  const nextSafeAction =
    state === "needs_detail"
      ? "Answer the question below, then review your plan."
      : state === "cannot_continue"
        ? "Resolve the blocking issue, or take manual control."
        : state === "approved_locally"
          ? "Plan approved locally — no live publish or send has occurred."
          : "Review the plan, preview the customer experience, then approve locally when ready.";

  const readinessNotes = [
    ...warnings,
    !input.readiness.consentPathAvailable
      ? "Follow-up stays gated until consent permissions allow it."
      : null,
  ].filter(Boolean) as string[];

  const primaryTexts = [
    understood,
    preparedSummary,
    ...preparedComponents,
    ...questions.map((q) => q.prompt),
    ...plainApprovals.map((a) => a.label),
    preview.steps.map((s) => `${s.title} ${s.description}`).join(" "),
    nextSafeAction,
    experienceStateLabel(state),
  ];

  return {
    plan,
    state,
    stateLabel: experienceStateLabel(state),
    understood,
    preparedSummary,
    strategy: plan.strategy,
    preparedComponents,
    questions,
    plainApprovals,
    warnings,
    journeySummary: plan.journeySummary,
    preview,
    readinessNotes,
    nextSafeAction,
    liveExecution: false,
    inventsPriceOrDiscount: false,
    duplicateOfferSourceOfTruth: false,
    primaryCopyCheck: assertNoForbiddenPrimaryTerminology(primaryTexts),
    advanced: {
      recipeId: plan.recipeId,
      recipeVersion: plan.recipeVersion,
      factsUsed: plan.factsUsed,
      assumptions: plan.assumptions,
      missingInformation: plan.missingInformation,
      objectMutations: plan.objectMutations,
      policyDecisions: plan.approvalsRequired,
      interventions: plan.humanInterventions,
      providersRequired: plan.providersRequired,
      sourceOfTruth: CARD_OFFER_MEASURABLE_RECIPE.sourceOfTruth,
    },
  };
}

function buildUnderstood(input: {
  brief: string;
  audienceAnswer: string;
  hints: ReturnType<typeof parseBriefHints>;
  offerValue?: string;
  campaignTitle?: string;
  weekend: boolean;
}): string {
  const parts = [
    `You want: ${input.brief}.`,
    input.audienceAnswer === "returning"
      ? "Audience: returning customers."
      : "Audience: everyone who taps.",
    input.weekend ? "Timing: this weekend." : null,
    input.offerValue ? `Offer: ${input.offerValue}.` : "Offer value: still needed.",
    input.campaignTitle ? `Using campaign “${input.campaignTitle}”.` : null,
  ];
  return parts.filter(Boolean).join(" ");
}

function buildPreviewModel(input: {
  offerValue?: string;
  offerDescription?: string;
  businessName: string;
  emailConnected: boolean;
  keepCardAvailable: boolean;
  askQuestionAvailable: boolean;
  audienceAnswer: string;
}): OutcomePreviewModel {
  const title = input.offerValue || "Your offer";
  const steps: CustomerPreviewStep[] = [
    {
      id: "tap",
      title: "Someone taps your Tap Point",
      description: "They open your public experience on their phone.",
    },
    {
      id: "spotlight",
      title: "They see the offer on your Card",
      description: `${title} appears as Spotlight — the same offer your Campaign owns.`,
    },
    {
      id: "act",
      title: "They claim or save it",
      description: "Claim the offer, or Keep Card for later.",
    },
    {
      id: "confirm",
      title: "They get a clear confirmation",
      description: "Saved, requested, or available — without a maze of settings.",
    },
  ];
  if (input.askQuestionAvailable) {
    steps.push({
      id: "ask",
      title: "Ask a Question stays available",
      description: "Customers can still reach you from the Card utilities.",
    });
  }
  if (input.emailConnected) {
    steps.push({
      id: "email",
      title: "Optional email follow-up (prepared, not sent)",
      description: "A follow-up draft can use the same offer — only after you approve and connect email.",
    });
  }
  steps.push({
    id: "insights",
    title: "You see what happened",
    description: "Views, claims, Keep Card, and follow-up readiness show up in Insights.",
  });

  return {
    steps,
    spotlightTitle: title,
    offerDescription: input.offerDescription,
    emailSubject: input.emailConnected
      ? `${title} · from ${input.businessName}`
      : undefined,
    tapcastCaption: `${title} at ${input.businessName}. Tap to claim.`,
    metrics: ["Views", "Claims", "Keep Card", "Follow-up readiness"],
    keepCardAvailable: input.keepCardAvailable,
    askQuestionAvailable: input.askQuestionAvailable,
  };
}

function blockedResult(opts: {
  state: OutcomeExperienceState;
  brief: string;
  nowIso: string;
  message: string;
  nextSafeAction: string;
  answers: Record<string, string>;
  policy: ApprovalPolicy;
  input: OutcomeAssemblerInput;
}): OutcomeExperienceResult {
  const plan: AutopilotPlan = {
    id: opts.input.planId ?? `plan_blocked_${Date.now().toString(36)}`,
    schemaVersion: AUTOPILOT_PLAN_SCHEMA_VERSION,
    recipeId: CARD_OFFER_MEASURABLE_RECIPE_ID,
    recipeVersion: CARD_OFFER_MEASURABLE_VERSION,
    objective: opts.brief,
    strategy: "Cannot prepare safely until the blocking condition is cleared.",
    reason: opts.message,
    audience: { summary: "Not set" },
    journeySummary: "Blocked before customer journey preparation.",
    objectMutations: [],
    factsUsed: [],
    assumptions: [],
    missingInformation: [],
    providersRequired: [],
    costEstimate: { currency: "USD", amount: 0, basis: "none" },
    riskEstimate: { level: "high", rationale: opts.message },
    approvalsRequired: [],
    schedule: {},
    successMetrics: [],
    fallback: CARD_OFFER_MEASURABLE_RECIPE.fallback,
    rollback: CARD_OFFER_MEASURABLE_RECIPE.rollback,
    policyAutoApproved: [],
    humanInterventions: [
      createHumanIntervention({
        code: opts.state === "feature_disabled" ? "policy_prohibited" : "recovery_failed",
        affectedObjectOrStep: "outcome",
        explanation: opts.message,
      }),
    ],
    status: "draft",
    createdAt: opts.nowIso,
    updatedAt: opts.nowIso,
  };

  return {
    plan,
    state: opts.state,
    stateLabel: experienceStateLabel(opts.state),
    understood: opts.brief,
    preparedSummary: opts.message,
    strategy: plan.strategy,
    preparedComponents: [],
    questions: [],
    plainApprovals: [],
    warnings: [opts.message],
    journeySummary: plan.journeySummary,
    preview: {
      steps: [],
      metrics: [],
      keepCardAvailable: false,
      askQuestionAvailable: false,
    },
    readinessNotes: [opts.message],
    nextSafeAction: opts.nextSafeAction,
    liveExecution: false,
    inventsPriceOrDiscount: false,
    duplicateOfferSourceOfTruth: false,
    primaryCopyCheck: assertNoForbiddenPrimaryTerminology([
      opts.message,
      opts.nextSafeAction,
      opts.brief,
    ]),
    advanced: {
      recipeId: plan.recipeId,
      recipeVersion: plan.recipeVersion,
      factsUsed: [],
      assumptions: [],
      missingInformation: [],
      objectMutations: [],
      policyDecisions: [],
      interventions: plan.humanInterventions,
      providersRequired: [],
      sourceOfTruth: CARD_OFFER_MEASURABLE_RECIPE.sourceOfTruth,
    },
  };
}

/** Suggested outcomes when local state supports them */
export function suggestOutcomes(input: {
  hasCard: boolean;
  hasEligibleCampaignOffer: boolean;
  boundOffer?: boolean;
}): Array<{ id: OutcomeChoiceId; label: string; reason: string }> {
  const out: Array<{ id: OutcomeChoiceId; label: string; reason: string }> = [
    {
      id: "measurable_card_offer",
      label: "Create a measurable offer on my Card",
      reason: "Certified outcome — always available to prepare locally.",
    },
  ];
  if (input.hasCard && input.hasEligibleCampaignOffer) {
    out.push({
      id: "returning_weekend",
      label: "Bring returning customers back this weekend",
      reason: input.boundOffer
        ? "You already have a Card and a campaign offer ready."
        : "You have a Card and at least one campaign offer.",
    });
  }
  return out;
}
