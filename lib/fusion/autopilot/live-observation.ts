/**
 * F3 observation summary — reports through existing Insights / Offer Fuse evidence.
 * Does not optimize or adapt the live outcome.
 */

export type ObservationEvidenceClass =
  | "confirmed"
  | "derived"
  | "modeled"
  | "incomplete";

export type ObservationMetricKey =
  | "tap_point_activity"
  | "card_views"
  | "spotlight_views"
  | "claims"
  | "leads"
  | "keeps"
  | "ask_question"
  | "schedule_state"
  | "expiry"
  | "resolver_failures"
  | "feature_disablement"
  | "follow_up_readiness"
  | "external_distribution";

export type ObservationMetric = {
  key: ObservationMetricKey;
  label: string;
  /** Host-safe sentence; null when incomplete and no fake zero should show */
  statement: string | null;
  value: number | null;
  evidenceClass: ObservationEvidenceClass;
};

export type LiveObservationSummary = {
  activationId: string;
  campaignId: string;
  statusLabel: string;
  headline: string;
  metrics: ObservationMetric[];
  attention: string[];
  externalBoundary: string;
  observationActive: boolean;
  disclosedIncomplete: boolean;
};

export type ObservationEventCounts = {
  tapPointActivity?: number;
  cardViews?: number;
  spotlightViews?: number;
  claims?: number;
  leads?: number;
  keeps?: number;
  askQuestion?: number;
  resolverFailures?: number;
};

/**
 * Build a calm observation summary from authoritative counts.
 * Never displays fake confirmed zeros before evidence exists.
 */
export function buildLiveObservationSummary(input: {
  activationId: string;
  campaignId: string;
  statusLabel: string;
  entryPathCount: number;
  entryKind: "tap_point" | "card_first" | "mixed";
  scheduleLabel: string;
  scheduleExpired?: boolean;
  featureDisabled?: boolean;
  resolverFailures?: number;
  followUpReady?: boolean;
  observationActive: boolean;
  disclosedIncomplete?: boolean;
  events?: ObservationEventCounts;
}): LiveObservationSummary {
  const events = input.events ?? {};
  const metrics: ObservationMetric[] = [];

  const where =
    input.entryKind === "card_first"
      ? "Your offer is live on your Card."
      : input.entryPathCount > 0
        ? `Your offer is live at ${input.entryPathCount} Tap Point${input.entryPathCount === 1 ? "" : "s"}.`
        : "Your offer is live on your Card.";

  metrics.push(
    metricFromCount({
      key: "tap_point_activity",
      label: "Tap Point activity",
      count: events.tapPointActivity,
      singular: (n) => `${n} Tap Point visit`,
      plural: (n) => `${n} Tap Point visits`,
      emptyConfirmed: false,
    })
  );
  metrics.push(
    metricFromCount({
      key: "card_views",
      label: "Card views",
      count: events.cardViews,
      singular: (n) => `${n} person viewed your Card`,
      plural: (n) => `${n} people viewed your Card`,
    })
  );
  metrics.push(
    metricFromCount({
      key: "spotlight_views",
      label: "Offer views",
      count: events.spotlightViews,
      singular: (n) => `${n} person viewed it`,
      plural: (n) => `${n} people viewed it`,
    })
  );
  metrics.push(
    metricFromCount({
      key: "claims",
      label: "Claims",
      count: events.claims,
      singular: (n) => `${n} person claimed it`,
      plural: (n) => `${n} people claimed it`,
    })
  );
  metrics.push(
    metricFromCount({
      key: "leads",
      label: "Leads",
      count: events.leads,
      singular: (n) => `${n} lead`,
      plural: (n) => `${n} leads`,
    })
  );
  metrics.push(
    metricFromCount({
      key: "keeps",
      label: "Keeps",
      count: events.keeps,
      singular: (n) => `${n} Keep`,
      plural: (n) => `${n} Keeps`,
    })
  );
  metrics.push(
    metricFromCount({
      key: "ask_question",
      label: "Ask a Question",
      count: events.askQuestion,
      singular: (n) => `${n} question`,
      plural: (n) => `${n} questions`,
    })
  );

  metrics.push({
    key: "schedule_state",
    label: "Schedule",
    statement: input.scheduleLabel,
    value: null,
    evidenceClass: "confirmed",
  });

  metrics.push({
    key: "expiry",
    label: "Expiry",
    statement: input.scheduleExpired
      ? "The approved schedule has ended."
      : null,
    value: null,
    evidenceClass: input.scheduleExpired ? "confirmed" : "incomplete",
  });

  const resolverFails = events.resolverFailures ?? input.resolverFailures;
  metrics.push({
    key: "resolver_failures",
    label: "Customer path issues",
    statement:
      resolverFails != null && resolverFails > 0
        ? `${resolverFails} customer path issue${resolverFails === 1 ? "" : "s"} need attention.`
        : null,
    value: resolverFails ?? null,
    evidenceClass:
      resolverFails != null && resolverFails > 0 ? "confirmed" : "incomplete",
  });

  metrics.push({
    key: "feature_disablement",
    label: "Features",
    statement: input.featureDisabled
      ? "Offers on Card are turned off — customers may not see this offer."
      : null,
    value: null,
    evidenceClass: input.featureDisabled ? "confirmed" : "incomplete",
  });

  metrics.push({
    key: "follow_up_readiness",
    label: "Follow-up",
    statement:
      input.followUpReady === true
        ? "Follow-up drafts are ready — not sent."
        : input.followUpReady === false
          ? "Follow-up is not ready yet."
          : null,
    value: null,
    evidenceClass:
      input.followUpReady == null ? "incomplete" : "derived",
  });

  metrics.push({
    key: "external_distribution",
    label: "Email and social",
    statement: "Email was prepared but has not been sent.",
    value: 0,
    evidenceClass: "confirmed",
  });

  const attention: string[] = [];
  if (input.featureDisabled) {
    attention.push("Offers on Card are turned off.");
  }
  if (input.scheduleExpired) {
    attention.push("The approved schedule has ended.");
  }
  if (resolverFails != null && resolverFails > 0) {
    attention.push("A customer path needs attention.");
  }
  if (input.disclosedIncomplete || !input.observationActive) {
    attention.push("Some measurements are temporarily incomplete.");
  }

  return {
    activationId: input.activationId,
    campaignId: input.campaignId,
    statusLabel: input.statusLabel,
    headline: where,
    metrics,
    attention,
    externalBoundary: "Email and social are prepared but have not been sent.",
    observationActive: input.observationActive,
    disclosedIncomplete: Boolean(input.disclosedIncomplete) || !input.observationActive,
  };
}

function metricFromCount(input: {
  key: ObservationMetricKey;
  label: string;
  count: number | undefined;
  singular: (n: number) => string;
  plural: (n: number) => string;
  /** When false, zero is not confirmed — leave incomplete */
  emptyConfirmed?: boolean;
}): ObservationMetric {
  if (input.count == null) {
    return {
      key: input.key,
      label: input.label,
      statement: null,
      value: null,
      evidenceClass: "incomplete",
    };
  }
  if (input.count === 0 && input.emptyConfirmed === false) {
    return {
      key: input.key,
      label: input.label,
      statement: null,
      value: 0,
      evidenceClass: "incomplete",
    };
  }
  return {
    key: input.key,
    label: input.label,
    statement:
      input.count === 1 ? input.singular(1) : input.plural(input.count),
    value: input.count,
    evidenceClass: "confirmed",
  };
}

/** Visible primary observation lines (skip incomplete empties) */
export function visibleObservationStatements(
  summary: LiveObservationSummary
): string[] {
  return summary.metrics
    .map((m) => m.statement)
    .filter((s): s is string => Boolean(s?.trim()));
}
