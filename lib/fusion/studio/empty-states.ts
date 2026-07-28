/**
 * Truthful empty-state copy — what is missing, why, whether normal, one action.
 */

export type TruthfulEmptyState = {
  id: string;
  title: string;
  whatMissing: string;
  whyEmpty: string;
  isNormal: boolean;
  normalNote: string;
  actionLabel: string;
  actionHref: string;
  evidenceNote?: string;
};

export const EMPTY_STATES = {
  routing: {
    id: "empty_routing",
    title: "No routing activity yet",
    whatMissing: "No replies have been routed yet.",
    whyEmpty: "Inbound Email & Replies only appear after a real or test reply is received.",
    isNormal: true,
    normalNote: "This is normal for a new or untested setup.",
    actionLabel: "Send a test reply to confirm your setup",
    actionHref: "/dashboard/integrations#email-replies-section",
    evidenceNote: "Campaign sending remains disabled until provider production setup.",
  },
  insights: {
    id: "empty_insights",
    title: "No customer taps in this period",
    whatMissing: "No customer taps were recorded in this period.",
    whyEmpty: "Proof metrics only appear after Tap Points receive traffic.",
    isNormal: true,
    normalNote: "Normal when the Card is not yet live or the date range is quiet.",
    actionLabel: "Open the test Tap Point",
    actionHref: "/dashboard/tap-points",
  },
  campaign_spotlight: {
    id: "empty_campaign_spotlight",
    title: "No Spotlight is active",
    whatMissing: "No Campaign Spotlight is projected on the Card.",
    whyEmpty: "Spotlight appears when a Campaign offer is bound to the Card.",
    isNormal: true,
    normalNote: "Normal for a Card that is identity-only so far.",
    actionLabel: "Let Autopilot prepare one",
    actionHref: "/dashboard/card?wire=offer",
  },
  audience: {
    id: "empty_audience",
    title: "No contacts match this segment",
    whatMissing: "No contacts match the current segment or filters.",
    whyEmpty: "Audience lists reflect consent, capture, and eligibility rules.",
    isNormal: true,
    normalNote: "Normal for a new workspace or a narrow segment.",
    actionLabel: "Review consent or broaden the audience",
    actionHref: "/dashboard/audience#workspace",
  },
  leads: {
    id: "empty_leads",
    title: "No leads captured yet",
    whatMissing: "No contacts have submitted a capture form on your Card yet.",
    whyEmpty:
      "Leads appear after someone taps a live Tap Point and submits a capture block — with consent recorded at the moment of capture.",
    isNormal: true,
    normalNote: "Normal for a new Card or one not yet live on a Tap Point.",
    actionLabel: "Add a capture block on the Card",
    actionHref: "/dashboard/workbench",
    evidenceNote:
      "Every lead stores its consent state and the Tap Point / Campaign it came from — attribution is confirmed, never inferred.",
  },
  campaigns: {
    id: "empty_campaigns",
    title: "No campaigns yet",
    whatMissing: "No campaigns are available to resume.",
    whyEmpty: "Campaigns appear after you start one from Create or Experiences.",
    isNormal: true,
    normalNote: "Normal for a fresh workspace.",
    actionLabel: "Start a Campaign",
    actionHref: "/dashboard/workbench",
  },
} as const satisfies Record<string, TruthfulEmptyState>;

export function getEmptyState(
  id: keyof typeof EMPTY_STATES
): TruthfulEmptyState {
  return EMPTY_STATES[id];
}
