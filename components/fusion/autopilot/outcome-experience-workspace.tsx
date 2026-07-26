"use client";

import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, type ReactNode, type RefObject } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  assembleCardOfferMeasurableOutcome,
  OUTCOME_CHOICES,
  suggestOutcomes,
  type AssemblerCampaignInput,
  type OutcomeChoiceId,
  type OutcomeExperienceResult,
} from "@/lib/fusion/autopilot/outcome-assembler";
import type { KnowledgeFact } from "@/lib/fusion/autopilot/knowledge-fact";
import type { AutopilotPlan } from "@/lib/fusion/autopilot/plan";
import type { PreparedExecution } from "@/lib/fusion/autopilot/prepared-execution";
import {
  markPreparedExecutionStaleIfNeeded,
  prepareCardOfferMeasurableOutcome,
  rollbackPreparedOutcome,
  takeManualControl,
  applyPreparedSpotlightDraft,
  type OrchestratorCampaignInput,
} from "@/lib/fusion/autopilot/prepared-orchestrator";
import type { TapCardSection } from "@/lib/brand/tap-card";
import { PreparedOutcomeWorkspace } from "@/components/fusion/autopilot/prepared-outcome-workspace";
import { cn } from "@/lib/utils";

export type OutcomeExperienceWorkspaceProps = {
  businessName: string;
  brandAccent?: string;
  brandVoice?: string;
  logoUrl?: string | null;
  cardId: string;
  cardRetired?: boolean;
  hasSpotlight?: boolean;
  boundCampaignId?: string | null;
  campaigns: AssemblerCampaignInput[];
  /** Richer campaign rows for F2 draft preparation (status required) */
  prepareCampaigns?: OrchestratorCampaignInput[];
  cardSections?: TapCardSection[];
  facts?: KnowledgeFact[];
  emailConnected?: boolean;
  consentPathAvailable?: boolean;
  tapPointAssigned?: boolean;
  askQuestionAvailable?: boolean;
  keepCardAvailable?: boolean;
  featureOfferEnabled?: boolean;
  featureAutopilotEnabled?: boolean;
  deviceCode?: string;
  className?: string;
};

type Phase = "intake" | "experience" | "prepared";

/**
 * Autopilot F1+F2 outcome experience —
 * plan (local) → prepare drafts (local, reversible) → focused prepared workspace.
 * No publish, send, spend, or model calls.
 */
export function OutcomeExperienceWorkspace({
  businessName,
  brandAccent,
  brandVoice,
  logoUrl,
  cardId,
  cardRetired,
  hasSpotlight,
  boundCampaignId,
  campaigns,
  prepareCampaigns,
  cardSections = [],
  facts = [],
  emailConnected = false,
  consentPathAvailable = false,
  tapPointAssigned = false,
  askQuestionAvailable = true,
  keepCardAvailable = true,
  featureOfferEnabled = true,
  featureAutopilotEnabled = true,
  deviceCode,
  className,
}: OutcomeExperienceWorkspaceProps) {
  const formId = useId();
  const router = useRouter();
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const [phase, setPhase] = useState<Phase>("intake");
  const [choiceId, setChoiceId] = useState<OutcomeChoiceId>("measurable_card_offer");
  const [brief, setBrief] = useState(
    OUTCOME_CHOICES.find((c) => c.id === "measurable_card_offer")?.defaultBrief ?? ""
  );
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [localApproved, setLocalApproved] = useState(false);
  const [rejected, setRejected] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState(false);
  const [preparedExecution, setPreparedExecution] = useState<PreparedExecution | null>(null);
  const [preparedPlan, setPreparedPlan] = useState<AutopilotPlan | null>(null);
  const [draftSections, setDraftSections] = useState<TapCardSection[] | null>(null);
  const [focusedEscape, setFocusedEscape] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const reviewHeadingRef = useRef<HTMLHeadingElement | null>(null);

  const workingSections = draftSections ?? cardSections;

  useEffect(() => {
    if (phase === "experience" && !editingGoal) {
      reviewHeadingRef.current?.focus();
    }
  }, [phase, editingGoal]);

  const suggestions = useMemo(
    () =>
      suggestOutcomes({
        hasCard: Boolean(cardId),
        hasEligibleCampaignOffer: campaigns.some((c) => c.hasOffer),
        boundOffer: Boolean(boundCampaignId),
      }),
    [cardId, campaigns, boundCampaignId]
  );

  const result: OutcomeExperienceResult | null = useMemo(() => {
    if (phase === "intake" && !localApproved) return null;
    return assembleCardOfferMeasurableOutcome({
      brief,
      outcomeChoiceId: choiceId,
      facts,
      brand: {
        businessName,
        accentColor: brandAccent,
        voice: brandVoice,
        logoUrl: logoUrl ?? undefined,
      },
      card: {
        id: cardId,
        hasSpotlight,
        boundCampaignId,
        retired: cardRetired,
      },
      campaigns,
      readiness: {
        featureOfferEnabled,
        featureAutopilotEnabled,
        emailConnected,
        consentPathAvailable,
        tapPointAssigned,
        askQuestionAvailable,
        keepCardAvailable,
      },
      answers,
      localApprovalStatus: localApproved ? "approved" : undefined,
    });
  }, [
    phase,
    brief,
    choiceId,
    facts,
    businessName,
    brandAccent,
    brandVoice,
    logoUrl,
    cardId,
    hasSpotlight,
    boundCampaignId,
    cardRetired,
    campaigns,
    featureOfferEnabled,
    featureAutopilotEnabled,
    emailConnected,
    consentPathAvailable,
    tapPointAssigned,
    askQuestionAvailable,
    keepCardAvailable,
    answers,
    localApproved,
  ]);

  // Stale only when the prepared plan snapshot or live facts change — not on every
  // assembler re-render (which allocates a new plan id/updatedAt each time).
  const displayExecution = useMemo(() => {
    if (phase !== "prepared" || !preparedExecution || !preparedPlan) {
      return preparedExecution;
    }
    return markPreparedExecutionStaleIfNeeded({
      execution: preparedExecution,
      plan: preparedPlan,
      facts,
    });
  }, [phase, preparedExecution, preparedPlan, facts]);

  function resolvePrepareCampaign(
    plan: AutopilotPlan
  ): OrchestratorCampaignInput | null {
    const fromPlan = plan.objectMutations.find(
      (m) => m.id === "mutate.campaign.offer_coupon"
    )?.payload?.campaignId as string | undefined;
    const rich = prepareCampaigns?.length ? prepareCampaigns : null;
    if (rich) {
      const hit =
        rich.find((c) => c.id === fromPlan) ||
        rich.find((c) => c.id === boundCampaignId) ||
        rich.find((c) => c.id === campaigns.find((x) => x.boundToThisCard)?.id) ||
        rich.filter((c) => c.offerTitle || c.offerDescription).find((c) =>
          campaigns.some((a) => a.id === c.id && a.hasOffer)
        ) ||
        rich[0];
      return hit ?? null;
    }
    const assembler =
      campaigns.find((c) => c.id === fromPlan) ||
      campaigns.find((c) => c.id === boundCampaignId) ||
      campaigns.find((c) => c.boundToThisCard && c.hasOffer) ||
      campaigns.find((c) => c.hasOffer);
    if (!assembler) return null;
    return {
      id: assembler.id,
      title: assembler.title,
      status: "DRAFT",
      offerTitle: assembler.offerTitle,
      offerDescription: assembler.offerDescription,
      offerCode: assembler.offerCode,
      offerBlockId: assembler.offerBlockId,
      scheduledStart: assembler.scheduledStart,
      scheduledEnd: assembler.scheduledEnd,
    };
  }

  function preparePlan() {
    setRejected(false);
    setLocalApproved(false);
    setEditingGoal(false);
    // Keep prior prepared execution so goal edits can surface stale → re-prepare
    setPhase("experience");
    setFocusedEscape(false);
    setIsPreparing(false);
  }

  function startOver() {
    setPhase("intake");
    setAnswers({});
    setLocalApproved(false);
    setRejected(false);
    setAdvancedOpen(false);
    setEditingGoal(false);
    setPreparedExecution(null);
    setPreparedPlan(null);
    setFocusedEscape(false);
    setDraftSections(null);
    setIsPreparing(false);
  }

  function selectChoice(id: OutcomeChoiceId) {
    setChoiceId(id);
    const preset = OUTCOME_CHOICES.find((c) => c.id === id);
    if (preset && id !== "custom_brief") {
      setBrief(preset.defaultBrief);
    }
  }

  function runPrepareOutcome() {
    if (!result || result.plan.status !== "approved") return;
    const campaign = resolvePrepareCampaign(result.plan);
    const planSnapshot = result.plan;
    const sectionsSnapshot = workingSections;
    setIsPreparing(true);
    setFocusedEscape(true);
    setPhase("prepared");
    // Paint Preparing before synchronous prepare completes
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const prepared = prepareCardOfferMeasurableOutcome({
          plan: planSnapshot,
          campaign,
          card: {
            id: cardId,
            sections: sectionsSnapshot,
            retired: cardRetired,
          },
          businessName,
          facts,
          readiness: {
            featureOfferEnabled,
            featureAutopilotEnabled,
            emailConnected,
            consentPathAvailable,
            askQuestionAvailable,
            keepCardAvailable,
          },
          prepareApproved: true,
          deviceCode,
          preservePresentation: true,
        });
        setPreparedExecution(prepared.execution);
        setPreparedPlan(prepared.plan);
        if (prepared.ok) {
          setDraftSections(
            applyPreparedSpotlightDraft(sectionsSnapshot, prepared.execution)
          );
        }
        setIsPreparing(false);
      });
    });
  }

  function undoPreparation() {
    if (!preparedExecution || !preparedPlan) return;
    const rolled = rollbackPreparedOutcome({
      execution: preparedExecution,
      plan: preparedPlan,
      cardSections: workingSections,
    });
    setPreparedExecution(rolled.execution);
    setPreparedPlan(rolled.plan);
    setDraftSections(rolled.cardSections);
  }

  function reprepare() {
    setDraftSections(null);
    setIsPreparing(true);
    setFocusedEscape(true);
    setPhase("prepared");
    if (result?.plan.status === "approved" || localApproved) {
      const assembled = assembleCardOfferMeasurableOutcome({
        brief,
        outcomeChoiceId: choiceId,
        facts,
        brand: {
          businessName,
          accentColor: brandAccent,
          voice: brandVoice,
          logoUrl: logoUrl ?? undefined,
        },
        card: {
          id: cardId,
          hasSpotlight,
          boundCampaignId,
          retired: cardRetired,
        },
        campaigns,
        readiness: {
          featureOfferEnabled,
          featureAutopilotEnabled,
          emailConnected,
          consentPathAvailable,
          tapPointAssigned,
          askQuestionAvailable,
          keepCardAvailable,
        },
        answers,
        localApprovalStatus: "approved",
      });
      const campaign = resolvePrepareCampaign(assembled.plan);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const prepared = prepareCardOfferMeasurableOutcome({
            plan: assembled.plan,
            campaign,
            card: {
              id: cardId,
              sections: cardSections,
              retired: cardRetired,
            },
            businessName,
            facts,
            readiness: {
              featureOfferEnabled,
              featureAutopilotEnabled,
              emailConnected,
              consentPathAvailable,
              askQuestionAvailable,
              keepCardAvailable,
            },
            prepareApproved: true,
            deviceCode,
            preservePresentation: true,
          });
          setPreparedExecution(prepared.execution);
          setPreparedPlan(prepared.plan);
          if (prepared.ok) {
            setDraftSections(
              applyPreparedSpotlightDraft(cardSections, prepared.execution)
            );
          }
          setIsPreparing(false);
        });
      });
    } else {
      setIsPreparing(false);
      setPhase("experience");
    }
  }

  function handleManualControl() {
    if (preparedExecution) {
      setPreparedExecution(
        takeManualControl({
          execution: preparedExecution,
          editorHref: "/dashboard/card/edit",
        })
      );
    }
    router.push("/dashboard/card/edit");
  }

  function returnToStudio() {
    setFocusedEscape(false);
    router.push("/dashboard");
  }

  function beginEditGoal() {
    if (preparedExecution && preparedPlan) {
      const bumped = {
        ...preparedPlan,
        objective: `${brief.trim() || preparedPlan.objective} · revised`,
        updatedAt: new Date().toISOString(),
      };
      setPreparedExecution(
        markPreparedExecutionStaleIfNeeded({
          execution: preparedExecution,
          plan: bumped,
          facts,
        })
      );
      setPreparedPlan(bumped);
    }
    setEditingGoal(true);
    setPhase("experience");
    setFocusedEscape(false);
  }

  function cancelEditGoal() {
    setEditingGoal(false);
    if (preparedExecution) {
      setPhase("prepared");
      setFocusedEscape(true);
    }
  }

  if (isPreparing) {
    return (
      <section
        className={cn(
          "min-h-[70vh] rounded-xl border border-primary/30 bg-gradient-to-b from-primary/[0.09] to-[#080d18] p-4 sm:p-5",
          className
        )}
        data-testid="autopilot-prepared-outcome"
        data-status="preparing"
        aria-busy="true"
        aria-labelledby={`${formId}-preparing-heading`}
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
          Autopilot · prepared outcome
        </p>
        <h2
          id={`${formId}-preparing-heading`}
          className="mt-1 text-lg font-semibold text-white sm:text-xl"
          data-testid="autopilot-prepared-heading"
        >
          Autopilot is preparing your Card offer.
        </h2>
        <div
          className="mt-2 inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/70"
          data-testid="autopilot-prepared-state"
          data-state="preparing"
          data-readiness="preparing"
          role="status"
          aria-live="polite"
        >
          Preparing
        </div>
        <p className="mt-3 text-sm text-white/55" data-testid="autopilot-honesty">
          Prepared locally — not published, not sent, and no customers were contacted.
        </p>
      </section>
    );
  }

  if (phase === "prepared" && displayExecution && preparedPlan && focusedEscape) {
    return (
      <div
        className={cn("space-y-3", className)}
        data-testid="autopilot-prepared-escape"
      >
        <PreparedOutcomeWorkspace
          execution={displayExecution}
          plan={preparedPlan}
          focused
          onUndo={undoPreparation}
          onReprepare={reprepare}
          onEditGoal={beginEditGoal}
          onManualControl={handleManualControl}
          onReturnToStudio={returnToStudio}
        />
      </div>
    );
  }

  return (
    <section
      className={cn(
        "rounded-xl border border-primary/25 bg-gradient-to-b from-primary/[0.07] to-[#080d18] p-4 sm:p-5",
        className
      )}
      data-testid="autopilot-outcome-experience"
      data-ready={hydrated ? "true" : "false"}
      aria-labelledby={`${formId}-heading`}
    >
      <header className="space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
          Autopilot · local preparation
        </p>
        <h2 id={`${formId}-heading`} className="text-lg font-semibold text-white sm:text-xl">
          Create a measurable offer on your Card
        </h2>
        <p className="max-w-2xl text-sm text-white/60">
          Describe the outcome. Autopilot prepares a safe plan from your approved facts and Brand
          Kit — then prepares reversible drafts when you approve. Nothing is published or sent.
        </p>
      </header>

      {phase === "intake" || editingGoal ? (
        <IntakePanel
          formId={formId}
          choiceId={choiceId}
          brief={brief}
          suggestions={suggestions}
          ready={hydrated}
          onSelectChoice={selectChoice}
          onBriefChange={setBrief}
          onPrepare={preparePlan}
          onCancelEdit={editingGoal ? cancelEditGoal : undefined}
        />
      ) : null}

      {phase === "experience" && result && !editingGoal ? (
        <ExperiencePanel
          formId={formId}
          result={result}
          answers={answers}
          rejected={rejected}
          advancedOpen={advancedOpen}
          reviewHeadingRef={reviewHeadingRef}
          onAnswer={(id, value) => setAnswers((prev) => ({ ...prev, [id]: value }))}
          onApprove={() => {
            setLocalApproved(true);
            setRejected(false);
          }}
          onReject={() => {
            setRejected(true);
            setLocalApproved(false);
          }}
          onPrepareOutcome={runPrepareOutcome}
          onEditGoal={() => setEditingGoal(true)}
          onStartOver={startOver}
          onToggleAdvanced={() => setAdvancedOpen((v) => !v)}
        />
      ) : null}

      {phase === "prepared" && displayExecution && preparedPlan && !focusedEscape ? (
        <PreparedOutcomeWorkspace
          execution={displayExecution}
          plan={preparedPlan}
          focused={false}
          onUndo={undoPreparation}
          onReprepare={reprepare}
          onEditGoal={beginEditGoal}
          onManualControl={handleManualControl}
          onReturnToStudio={returnToStudio}
        />
      ) : null}
    </section>
  );
}

function IntakePanel({
  formId,
  choiceId,
  brief,
  suggestions,
  ready,
  onSelectChoice,
  onBriefChange,
  onPrepare,
  onCancelEdit,
}: {
  formId: string;
  choiceId: OutcomeChoiceId;
  brief: string;
  suggestions: Array<{ id: OutcomeChoiceId; label: string; reason: string }>;
  ready: boolean;
  onSelectChoice: (id: OutcomeChoiceId) => void;
  onBriefChange: (v: string) => void;
  onPrepare: () => void;
  onCancelEdit?: () => void;
}) {
  return (
    <div className="mt-5 space-y-4" data-testid="autopilot-outcome-intake">
      {suggestions.length > 0 ? (
        <div>
          <p className="text-xs font-medium text-white/50">Suggested for you</p>
          <ul className="mt-2 flex flex-col gap-2">
            {suggestions.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => onSelectChoice(s.id)}
                  className={cn(
                    "flex w-full min-h-11 flex-col rounded-lg border px-3 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    choiceId === s.id
                      ? "border-primary/50 bg-primary/10 text-white"
                      : "border-white/10 bg-white/[0.03] text-white/85 hover:border-white/25"
                  )}
                  data-testid={`autopilot-outcome-choice-${s.id}`}
                  aria-pressed={choiceId === s.id}
                >
                  <span className="text-sm font-medium">{s.label}</span>
                  <span className="text-xs text-white/45">{s.reason}</span>
                </button>
              </li>
            ))}
            <li>
              <button
                type="button"
                onClick={() => onSelectChoice("custom_brief")}
                className={cn(
                  "flex w-full min-h-11 items-center rounded-lg border px-3 py-2.5 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  choiceId === "custom_brief"
                    ? "border-primary/50 bg-primary/10 text-white"
                    : "border-white/10 bg-white/[0.03] text-white/85 hover:border-white/25"
                )}
                data-testid="autopilot-outcome-choice-custom_brief"
                aria-pressed={choiceId === "custom_brief"}
              >
                Describe what you want
              </button>
            </li>
          </ul>
        </div>
      ) : null}

      <div>
        <label htmlFor={`${formId}-brief`} className="text-xs font-medium text-white/50">
          Short brief
        </label>
        <textarea
          id={`${formId}-brief`}
          value={brief}
          onChange={(e) => onBriefChange(e.target.value)}
          rows={3}
          className="mt-1.5 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          placeholder="Example: Bring returning customers back this weekend"
          data-testid="autopilot-outcome-brief"
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          onClick={onPrepare}
          disabled={!ready || !brief.trim()}
          className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-40 sm:flex-none"
          data-testid="autopilot-prepare-plan"
        >
          Prepare my plan
        </button>
        {onCancelEdit ? (
          <button
            type="button"
            onClick={onCancelEdit}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/20 px-4 text-sm text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </div>
  );
}

function ExperiencePanel({
  formId,
  result,
  answers,
  rejected,
  advancedOpen,
  reviewHeadingRef,
  onAnswer,
  onApprove,
  onReject,
  onPrepareOutcome,
  onEditGoal,
  onStartOver,
  onToggleAdvanced,
}: {
  formId: string;
  result: OutcomeExperienceResult;
  answers: Record<string, string>;
  rejected: boolean;
  advancedOpen: boolean;
  reviewHeadingRef: RefObject<HTMLHeadingElement | null>;
  onAnswer: (id: string, value: string) => void;
  onApprove: () => void;
  onReject: () => void;
  onPrepareOutcome: () => void;
  onEditGoal: () => void;
  onStartOver: () => void;
  onToggleAdvanced: () => void;
}) {
  const canApprove =
    result.state === "ready_to_review" || result.state === "approved_locally";
  const needsDetail = result.state === "needs_detail";
  const approved = result.state === "approved_locally" || result.plan.status === "approved";

  return (
    <div className="mt-5 space-y-5" data-testid="autopilot-outcome-review">
      <h3
        ref={reviewHeadingRef}
        tabIndex={-1}
        className="text-base font-semibold text-white outline-none focus-visible:ring-2 focus-visible:ring-primary"
        data-testid="autopilot-review-heading"
      >
        Your prepared plan
      </h3>
      <div
        className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/70"
        data-testid="autopilot-outcome-state"
        data-state={result.state}
      >
        {result.stateLabel}
      </div>

      {rejected ? (
        <p
          className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/70"
          data-testid="autopilot-outcome-rejected"
        >
          Plan rejected. Edit the goal or start over — nothing was published.
        </p>
      ) : null}

      <Section title="Your goal" testId="autopilot-section-goal">
        <p className="text-sm text-white/85">{result.understood}</p>
      </Section>

      <Section title="What Autopilot prepared" testId="autopilot-section-prepared">
        <p className="text-sm text-white/85">{result.preparedSummary}</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-white/65">
          {result.preparedComponents.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </Section>

      <Section title="What customers will experience" testId="autopilot-section-preview">
        <ol className="space-y-3" data-testid="autopilot-unified-preview">
          {result.preview.steps.map((step, i) => (
            <li key={step.id} className="flex gap-3">
              <span
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary"
                aria-hidden
              >
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-medium text-white">{step.title}</p>
                <p className="text-xs text-white/55">{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
        {result.preview.emailSubject ? (
          <p className="mt-3 text-xs text-white/45">
            Email draft subject: {result.preview.emailSubject}
          </p>
        ) : null}
      </Section>

      <Section title="What happens after they respond" testId="autopilot-section-after">
        <p className="text-sm text-white/70">
          {result.preview.keepCardAvailable
            ? "They can Keep Card for later. "
            : ""}
          {result.preview.askQuestionAvailable
            ? "Ask a Question stays available. "
            : ""}
          Follow-up only proceeds when permissions allow — never automatically in this step.
        </p>
      </Section>

      <Section title="What will be measured" testId="autopilot-section-metrics">
        <ul className="flex flex-wrap gap-2">
          {result.preview.metrics.map((m) => (
            <li
              key={m}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70"
            >
              {m}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Anything that needs you" testId="autopilot-section-needs-you">
        {result.questions.length === 0 && result.plainApprovals.length === 0 ? (
          <p className="text-sm text-white/70">No approval needed yet for preparation.</p>
        ) : null}

        {result.questions.map((q) => (
          <div
            key={q.id}
            className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3"
            data-testid={`autopilot-question-${q.id}`}
            data-answered={answers[q.id]?.trim() ? "true" : "false"}
          >
            <p className="text-sm font-medium text-amber-50">{q.prompt}</p>
            {q.whyItMatters ? (
              <p className="mt-1 text-xs text-amber-100/60">{q.whyItMatters}</p>
            ) : null}
            {q.choices?.length ? (
              <div className="mt-2 flex flex-col gap-2">
                {q.choices.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => onAnswer(q.id, c.value)}
                    className={cn(
                      "min-h-11 rounded-lg border px-3 py-2 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      answers[q.id] === c.value
                        ? "border-primary/50 bg-primary/15 text-white"
                        : "border-white/15 bg-black/20 text-white/80"
                    )}
                    data-testid={`autopilot-answer-${q.id}-${c.value}`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            ) : (
              <input
                type="text"
                value={answers[q.id] ?? ""}
                onChange={(e) => onAnswer(q.id, e.target.value)}
                className="mt-2 w-full min-h-11 rounded-lg border border-white/15 bg-black/30 px-3 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                placeholder="Type your answer"
                aria-label={q.prompt}
                data-testid={`autopilot-answer-input-${q.id}`}
              />
            )}
            {q.allowDecideLater ? (
              <button
                type="button"
                onClick={() => onAnswer(q.id, answers[q.id] || "later")}
                className="mt-2 text-xs text-white/50 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                data-testid={`autopilot-decide-later-${q.id}`}
              >
                I’ll decide later
              </button>
            ) : null}
          </div>
        ))}

        {result.plainApprovals.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {result.plainApprovals.map((a) => (
              <li
                key={a.id}
                className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/75"
                data-testid={`autopilot-approval-${a.id}`}
              >
                {a.label}
                {a.detail ? (
                  <span className="mt-0.5 block text-xs text-white/45">{a.detail}</span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}

        {result.warnings.map((w) => (
          <p key={w} className="mt-2 text-xs text-white/45">
            {w}
          </p>
        ))}
      </Section>

      <Section title="Ready when you are" testId="autopilot-section-ready">
        <p className="text-sm text-white/70">{result.nextSafeAction}</p>
        <div className="mt-3 flex flex-col gap-2">
          {!approved ? (
            <button
              type="button"
              onClick={onApprove}
              disabled={!canApprove || needsDetail || rejected}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              data-testid="autopilot-approve-plan"
            >
              Approve plan
            </button>
          ) : (
            <button
              type="button"
              onClick={onPrepareOutcome}
              disabled={rejected}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              data-testid="autopilot-prepare-outcome"
            >
              Prepare this outcome
            </button>
          )}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={onEditGoal}
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/20 px-3 text-sm text-white/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              data-testid="autopilot-edit-goal"
            >
              Edit goal
            </button>
            <button
              type="button"
              onClick={onReject}
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/20 px-3 text-sm text-white/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              data-testid="autopilot-reject-plan"
            >
              Reject
            </button>
            <button
              type="button"
              onClick={onStartOver}
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/15 px-3 text-sm text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              data-testid="autopilot-start-over"
            >
              Start over
            </button>
            <Link
              href="/dashboard/card/edit"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/15 px-3 text-sm text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              data-testid="autopilot-manual-control"
            >
              Take manual control
            </Link>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-white/35">
          {approved
            ? "Prepare this outcome builds reversible drafts only — not published, not sent."
            : "Local approval only — does not publish, send, or change live Card or Campaign objects yet."}
        </p>
      </Section>

      <div className="border-t border-white/10 pt-3">
        <button
          type="button"
          onClick={onToggleAdvanced}
          className="text-xs font-medium text-white/45 underline-offset-2 hover:text-white/70 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-expanded={advancedOpen}
          data-testid="autopilot-advanced-toggle"
        >
          {advancedOpen ? "Hide advanced details" : "Advanced details"}
        </button>
        {advancedOpen ? (
          <div
            className="mt-3 space-y-2 rounded-lg border border-white/10 bg-black/30 p-3 font-mono text-[11px] text-white/55"
            data-testid="autopilot-advanced-panel"
          >
            <p>
              Recipe: {result.advanced.recipeId}@{result.advanced.recipeVersion}
            </p>
            <p>Facts used: {result.advanced.factsUsed.join(", ") || "none"}</p>
            <p>Assumptions: {result.advanced.assumptions.join(" · ") || "none"}</p>
            <p>
              Missing:{" "}
              {result.advanced.missingInformation.map((m) => m.key).join(", ") || "none"}
            </p>
            <p>Mutations: {result.advanced.objectMutations.length}</p>
            <p>Policy decisions: {result.advanced.policyDecisions.length}</p>
            <p>
              Interventions:{" "}
              {result.advanced.interventions.map((i) => i.code).join(", ") || "none"}
            </p>
            <p>
              SoT owner: {result.advanced.sourceOfTruth.offerOwner} · Spotlight:{" "}
              {result.advanced.sourceOfTruth.cardSpotlight} · liveSending:{" "}
              {String(result.advanced.sourceOfTruth.liveSending)}
            </p>
            <p>liveExecution: {String(result.liveExecution)}</p>
            <p id={`${formId}-plan-status`}>Plan status: {result.plan.status}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Section({
  title,
  children,
  testId,
}: {
  title: string;
  children: ReactNode;
  testId: string;
}) {
  return (
    <section data-testid={testId} aria-label={title}>
      <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-white/40">
        {title}
      </h3>
      <div className="mt-2">{children}</div>
    </section>
  );
}
