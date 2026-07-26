/**
 * Convert structured interventions / missing facts into concise host questions (F1).
 */

import type { HumanIntervention } from "./intervention";
import type { MissingInformation } from "./plan";
import type { KnowledgeFact } from "./knowledge-fact";
import { evaluateFactUsability } from "./knowledge-fact";
import { plainInterventionTitle } from "./plain-language";

export type HostQuestionChoice = {
  value: string;
  label: string;
};

export type HostQuestion = {
  id: string;
  prompt: string;
  whyItMatters?: string;
  choices?: HostQuestionChoice[];
  allowDecideLater: boolean;
  blocking: boolean;
  mapsToFactKind?: string;
  relatedInterventionCodes: string[];
};

const FACT_KIND_QUESTIONS: Record<
  string,
  { prompt: string; whyItMatters?: string; choices?: HostQuestionChoice[] }
> = {
  "offer.value": {
    prompt: "What should customers receive?",
    whyItMatters: "This becomes the offer on your Card — Autopilot will not invent it.",
  },
  "offer.title": {
    prompt: "What should customers receive?",
    whyItMatters: "This becomes the offer title on your Card.",
  },
  "offer.description": {
    prompt: "What should customers receive?",
    whyItMatters: "A short description helps customers understand the offer.",
  },
  "offer.cta": {
    prompt: "What should the button say?",
    choices: [
      { value: "Claim offer", label: "Claim offer" },
      { value: "Get this deal", label: "Get this deal" },
      { value: "Save for later", label: "Save for later" },
    ],
    whyItMatters: "Customers tap this to act on the offer.",
  },
  "offer.expires_at": {
    prompt: "When should this offer end?",
    choices: [
      { value: "this_weekend", label: "End of this weekend" },
      { value: "next_friday", label: "Next Friday" },
      { value: "no_end", label: "No end date yet" },
    ],
  },
  "offer.audience": {
    prompt: "Should this be available to everyone or returning customers?",
    choices: [
      { value: "everyone", label: "Everyone" },
      { value: "returning", label: "Returning customers" },
    ],
  },
  "campaign.id": {
    prompt: "Which campaign offer should appear on your Card?",
    whyItMatters: "Your Card shows a projection of one Campaign offer — not a second copy.",
  },
  "card.id": {
    prompt: "Which Card should show this offer?",
  },
};

/**
 * Build a minimal set of host questions from missing info + unusable facts + interventions.
 * Groups related offer-value prompts into one question.
 */
export function buildHostQuestions(input: {
  missingInformation: MissingInformation[];
  facts: KnowledgeFact[];
  interventions: HumanIntervention[];
  /** Keys already answered by the host */
  answeredKeys?: Set<string> | string[];
  emailConnected?: boolean;
  now?: Date;
}): HostQuestion[] {
  const answered = new Set(
    input.answeredKeys instanceof Set
      ? input.answeredKeys
      : input.answeredKeys ?? []
  );
  const questions: HostQuestion[] = [];
  const seenPrompts = new Set<string>();

  const push = (q: HostQuestion) => {
    if (answered.has(q.id) || answered.has(q.mapsToFactKind ?? "")) return;
    if (seenPrompts.has(q.prompt)) {
      // Merge related codes into existing
      const existing = questions.find((x) => x.prompt === q.prompt);
      if (existing) {
        for (const code of q.relatedInterventionCodes) {
          if (!existing.relatedInterventionCodes.includes(code)) {
            existing.relatedInterventionCodes.push(code);
          }
        }
        existing.blocking = existing.blocking || q.blocking;
      }
      return;
    }
    seenPrompts.add(q.prompt);
    questions.push(q);
  };

  // Unusable / missing facts → questions
  for (const fact of input.facts) {
    const usability = evaluateFactUsability(fact, { now: input.now });
    if (usability.usable) continue;
    if (usability.reason === "confirmed_contradiction") {
      push({
        id: `contradiction_${fact.id}`,
        prompt: "Two offer details disagree. Which should we keep?",
        whyItMatters: plainInterventionTitle("contradiction"),
        allowDecideLater: false,
        blocking: true,
        mapsToFactKind: fact.kind,
        relatedInterventionCodes: ["contradiction"],
      });
      continue;
    }
    if (usability.reason === "low_confidence") {
      push({
        id: `confirm_${fact.kind}`,
        prompt: FACT_KIND_QUESTIONS[fact.kind]?.prompt ?? `Please confirm: ${fact.kind.replace(/^offer\./, "")}`,
        whyItMatters: "Please confirm before Autopilot uses this detail.",
        allowDecideLater: false,
        blocking: true,
        mapsToFactKind: fact.kind,
        relatedInterventionCodes: ["low_confidence"],
        choices: FACT_KIND_QUESTIONS[fact.kind]?.choices,
      });
      continue;
    }
    if (
      usability.reason === "unapproved" ||
      usability.reason === "rejected" ||
      usability.reason === "retired" ||
      usability.reason === "stale"
    ) {
      const spec = FACT_KIND_QUESTIONS[fact.kind];
      push({
        id: `fact_${fact.kind}`,
        prompt: spec?.prompt ?? "What should customers receive?",
        whyItMatters: spec?.whyItMatters,
        choices: spec?.choices,
        allowDecideLater: usability.reason === "stale",
        blocking: usability.reason !== "stale",
        mapsToFactKind: fact.kind,
        relatedInterventionCodes: [usability.intervention.code],
      });
    }
  }

  for (const miss of input.missingInformation) {
    const kind = miss.key;
    const spec = FACT_KIND_QUESTIONS[kind];
    push({
      id: `missing_${kind}`,
      prompt: spec?.prompt ?? (miss.explanation || "What should customers receive?"),
      whyItMatters: spec?.whyItMatters ?? (miss.explanation !== spec?.prompt ? miss.explanation : undefined),
      choices: spec?.choices,
      allowDecideLater: kind === "offer.expires_at",
      blocking: kind !== "offer.expires_at",
      mapsToFactKind: kind,
      relatedInterventionCodes: miss.relatedInterventionCode
        ? [miss.relatedInterventionCode]
        : ["missing_fact"],
    });
  }

  // Consent / provider interventions that need a host choice
  for (const intervention of input.interventions) {
    if (intervention.code === "consent_required") {
      push({
        id: "consent_follow_up",
        prompt: "Continue with the Card only? Follow-up needs permission for this audience.",
        choices: [
          { value: "card_only", label: "Card only for now" },
          { value: "fix_consent", label: "I’ll fix permissions first" },
        ],
        allowDecideLater: true,
        blocking: false,
        relatedInterventionCodes: ["consent_required"],
      });
    }
    if (intervention.code === "provider_unavailable" || (!input.emailConnected && intervention.code === "send_approval")) {
      push({
        id: "email_not_connected",
        prompt: "Email is not connected. Continue with the Card only?",
        choices: [
          { value: "card_only", label: "Yes — Card only" },
          { value: "connect_later", label: "I’ll connect email later" },
        ],
        allowDecideLater: true,
        blocking: false,
        relatedInterventionCodes: ["provider_unavailable"],
      });
    }
  }

  if (!input.emailConnected) {
    push({
      id: "email_not_connected",
      prompt: "Email is not connected. Continue with the Card only?",
      choices: [
        { value: "card_only", label: "Yes — Card only" },
        { value: "connect_later", label: "I’ll connect email later" },
      ],
      allowDecideLater: true,
      blocking: false,
      relatedInterventionCodes: ["provider_unavailable"],
    });
  }

  // Prefer a single grouped offer question
  return questions.slice(0, 4);
}

export function blockingQuestionsRemain(
  questions: HostQuestion[],
  answers: Record<string, string>
): boolean {
  return questions.some((q) => q.blocking && !answers[q.id]?.trim());
}
