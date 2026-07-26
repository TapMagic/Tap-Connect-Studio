"use client";

import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import type { AutopilotPlan } from "@/lib/fusion/autopilot/plan";
import type { PreparedExecution } from "@/lib/fusion/autopilot/prepared-execution";
import { F2_HONESTY_STATEMENT, readinessHostLabel } from "@/lib/fusion/autopilot/prepared-host";
import type { LiveActivation } from "@/lib/fusion/autopilot/live-activation";
import type { LiveObservationSummary } from "@/lib/fusion/autopilot/live-observation";
import { visibleObservationStatements } from "@/lib/fusion/autopilot/live-observation";
import { F3_EXTERNAL_BOUNDARY } from "@/lib/fusion/autopilot/live-host";
import { cn } from "@/lib/utils";

export type PreparedOutcomeWorkspaceProps = {
  execution: PreparedExecution;
  plan: AutopilotPlan;
  focused?: boolean;
  /** F3 live activation when present */
  activation?: LiveActivation | null;
  observation?: LiveObservationSummary | null;
  finalApprovalChecked?: boolean;
  onFinalApprovalChange?: (checked: boolean) => void;
  goLiveAvailable?: boolean;
  goLiveBlockedReason?: string | null;
  approvalCopy?: {
    readyTitle: string;
    whatCustomersSee: string;
    whoFor: string;
    whereAppears: string;
    when: string;
    whatMeasured: string;
    notIncluded: string;
    ifActivationFails: string;
    approvalLabel: string;
    primaryAction: string;
  } | null;
  publicPreviewHref?: string | null;
  activating?: boolean;
  onMakeLive?: () => void;
  onStop?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onUndoGoLive?: () => void;
  onUndo: () => void;
  onReprepare: () => void;
  onEditGoal: () => void;
  onManualControl: () => void;
  onReturnToStudio: () => void;
  className?: string;
};

/**
 * Focused Autopilot F2+F3 workspace — one prepared / live outcome.
 * Escape / focused mode; not a permanent primary-nav destination.
 */
export function PreparedOutcomeWorkspace({
  execution,
  plan,
  focused = true,
  activation = null,
  observation = null,
  finalApprovalChecked = false,
  onFinalApprovalChange,
  goLiveAvailable = false,
  goLiveBlockedReason = null,
  approvalCopy = null,
  publicPreviewHref = null,
  activating = false,
  onMakeLive,
  onStop,
  onPause,
  onResume,
  onUndoGoLive,
  onUndo,
  onReprepare,
  onEditGoal,
  onManualControl,
  onReturnToStudio,
  className,
}: PreparedOutcomeWorkspaceProps) {
  const formId = useId();
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const liveHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const makeLiveRef = useRef<HTMLButtonElement | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const isLivePhase =
    activation != null &&
    (activation.status === "live" ||
      activation.status === "scheduled" ||
      activation.status === "paused" ||
      activation.status === "stopped" ||
      activation.status === "manual_control");

  useEffect(() => {
    if (isLivePhase) {
      liveHeadingRef.current?.focus();
    } else {
      headingRef.current?.focus();
    }
  }, [execution.executionId, execution.status, activation?.status, activation?.activationId, isLivePhase]);

  const canUndoPrep =
    !isLivePhase &&
    (execution.status === "prepared" ||
      execution.status === "needs_attention" ||
      execution.status === "failed");
  const isStale = execution.readiness.stale || execution.readiness.outcome === "stale_prepare_again";
  const isUndone = execution.status === "rolled_back";
  const summary = execution.hostSummary;
  const liveSummary = activation?.hostSummary;

  return (
    <section
      className={cn(
        "rounded-xl border border-[color:var(--ap-border)] bg-gradient-to-b from-[color:var(--ap-from)] to-[#080d18] p-4 sm:p-5",
        focused && "min-h-[70vh]",
        className
      )}
      style={
        {
          "--ap-border": "color-mix(in oklab, #3d4f66 55%, transparent)",
          "--ap-from": "color-mix(in oklab, #1a2332 70%, transparent)",
        } as CSSProperties
      }
      data-testid={isLivePhase ? "autopilot-live-outcome" : "autopilot-prepared-outcome"}
      data-status={activation?.status ?? execution.status}
      data-focused={focused ? "true" : "false"}
      data-stale={isStale ? "true" : "false"}
      data-live={isLivePhase ? "true" : "false"}
      aria-labelledby={`${formId}-heading`}
    >
      <header className="space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8fa3b8]">
            Autopilot · {isLivePhase ? "live outcome" : "prepared outcome"}
          </p>
          <button
            type="button"
            onClick={onReturnToStudio}
            className="min-h-11 rounded-lg border border-white/15 px-3 text-xs text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8fa3b8]"
            data-testid="autopilot-return-studio"
          >
            Return to Studio
          </button>
        </div>
        <h2
          id={`${formId}-heading`}
          ref={isLivePhase ? liveHeadingRef : headingRef}
          tabIndex={-1}
          className="text-lg font-semibold text-white outline-none focus-visible:ring-2 focus-visible:ring-[#8fa3b8] sm:text-xl"
          data-testid={isLivePhase ? "autopilot-live-heading" : "autopilot-prepared-heading"}
        >
          {isLivePhase ? activation?.hostStateDetail : execution.hostStateDetail}
        </h2>
        <div
          className="inline-flex min-h-11 items-center rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/70"
          data-testid={isLivePhase ? "autopilot-live-state" : "autopilot-prepared-state"}
          data-state={activation?.status ?? execution.status}
          data-readiness={execution.readiness.outcome}
          role="status"
          aria-live="polite"
          aria-label={
            isLivePhase
              ? `Offer status: ${activation?.hostStateLabel}`
              : `Prepared status: ${readinessHostLabel(execution.readiness.outcome)}`
          }
        >
          {isLivePhase
            ? activation?.hostStateLabel
            : readinessHostLabel(execution.readiness.outcome)}
        </div>
        <p
          className="text-xs text-white/45"
          data-testid={isLivePhase ? "autopilot-live-honesty" : "autopilot-honesty"}
        >
          {isLivePhase
            ? activation?.honestyStatement || F3_EXTERNAL_BOUNDARY
            : execution.honestyStatement || F2_HONESTY_STATEMENT}
        </p>
      </header>

      <div className="mt-5 space-y-5">
        {!isLivePhase ? (
          <>
            <Section title="Goal" testId="autopilot-prepared-goal">
              <p className="text-sm text-white/85">{plan.objective}</p>
            </Section>

            <Section title="Your offer is ready" testId="autopilot-prepared-result">
              {approvalCopy ? (
                <dl className="space-y-3 text-sm">
                  <SummaryRow label="What customers will see" value={approvalCopy.whatCustomersSee} />
                  <SummaryRow label="Who it is for" value={approvalCopy.whoFor} />
                  <SummaryRow label="Where it will appear" value={approvalCopy.whereAppears} />
                  <SummaryRow label="When it starts and ends" value={approvalCopy.when} />
                  <SummaryRow label="What will be measured" value={approvalCopy.whatMeasured} />
                  <SummaryRow label="What is not included" value={approvalCopy.notIncluded} />
                  <SummaryRow label="If activation fails" value={approvalCopy.ifActivationFails} />
                </dl>
              ) : summary ? (
                <dl className="space-y-3 text-sm">
                  <SummaryRow label="On your Card" value={summary.onCard} />
                  <SummaryRow label="Who it’s for" value={summary.audience} />
                  <SummaryRow label="When" value={summary.when} />
                  <SummaryRow label="Customers can" value={summary.customerCanDo} />
                  <SummaryRow label="Follow-up" value={summary.followUp} />
                  <SummaryRow label="Measured" value={summary.measured} />
                  <SummaryRow label="Still needs approval" value={summary.stillNeedsApproval} />
                </dl>
              ) : (
                <p className="text-sm text-white/70">{execution.hostStateDetail}</p>
              )}
            </Section>

            <Section title="Customer experience preview" testId="autopilot-prepared-preview">
              <ol className="space-y-3" data-testid="autopilot-unified-preview-prepared">
                {execution.previewRefs.map((step, i) => (
                  <li key={step.id} className="flex gap-3">
                    <span
                      className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#3d4f66]/40 text-xs font-semibold text-[#c5d0dc]"
                      aria-hidden
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white">{step.title}</p>
                      <p className="text-xs text-white/55 break-words">{step.description}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </Section>

            <Section title="Anything needing attention" testId="autopilot-prepared-attention">
              {execution.interventions.length === 0 &&
              execution.warnings.length === 0 &&
              !isStale &&
              !execution.failure &&
              !goLiveBlockedReason ? (
                <p className="text-sm text-white/70">Nothing needs you right now.</p>
              ) : null}
              {isStale ? (
                <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-amber-50">
                  This preparation is out of date. Prepare again to refresh — your presentation edits stay
                  intact.
                </p>
              ) : null}
              {execution.failure ? (
                <p
                  className="rounded-lg border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-sm text-rose-50"
                  data-testid="autopilot-prepared-failure"
                >
                  {execution.failure.message}
                </p>
              ) : null}
              {goLiveBlockedReason ? (
                <p
                  className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-amber-50"
                  data-testid="autopilot-golive-blocked"
                >
                  {goLiveBlockedReason}
                </p>
              ) : null}
              {execution.interventions.map((i) => (
                <p
                  key={`${i.code}-${i.affectedObjectOrStep}`}
                  className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-amber-50"
                >
                  {i.explanation}
                </p>
              ))}
              {execution.warnings.map((w) => (
                <p key={w} className="mt-2 text-xs text-white/45">
                  {w}
                </p>
              ))}
            </Section>

            <Section title="Make it live" testId="autopilot-prepared-golive">
              <p className="text-sm text-white/70" data-testid="autopilot-external-boundary">
                {approvalCopy?.notIncluded || F3_EXTERNAL_BOUNDARY}
              </p>
              <label
                className="mt-3 flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border border-white/15 bg-white/[0.03] px-3 py-2"
                data-testid="autopilot-final-approval"
              >
                <input
                  type="checkbox"
                  className="mt-1 h-5 w-5 accent-[#8fa3b8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8fa3b8]"
                  checked={finalApprovalChecked}
                  onChange={(e) => onFinalApprovalChange?.(e.target.checked)}
                  disabled={!goLiveAvailable || activating || execution.manualControl.active}
                  data-testid="autopilot-final-approval-input"
                />
                <span className="text-sm text-white/85">
                  {approvalCopy?.approvalLabel || "Make this live"}
                  <span className="mt-0.5 block text-xs text-white/45">
                    Covers Campaign appearance, Card Spotlight, approved local customer entry, and Insights
                    observation. Email and social stay unsent.
                  </span>
                </span>
              </label>
              <button
                ref={makeLiveRef}
                type="button"
                disabled={
                  !goLiveAvailable ||
                  !finalApprovalChecked ||
                  activating ||
                  execution.manualControl.active
                }
                onClick={onMakeLive}
                className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[#c5d4a8] px-4 text-sm font-semibold text-[#1a2210] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8fa3b8]"
                data-testid="autopilot-make-live"
                aria-disabled={
                  !goLiveAvailable || !finalApprovalChecked || activating ? "true" : "false"
                }
              >
                {activating
                  ? "Autopilot is making your Card offer live…"
                  : approvalCopy?.primaryAction || "Make it live"}
              </button>
              {!goLiveAvailable ? (
                <p className="mt-2 text-xs text-white/45" data-testid="autopilot-go-live-disabled-hint">
                  {goLiveBlockedReason ||
                    "Go live opens after a current prepared outcome passes final checks."}
                </p>
              ) : null}
              {activation?.status === "failed" && activation.failure ? (
                <p
                  className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-sm text-rose-50"
                  data-testid="autopilot-activation-failure"
                  role="alert"
                >
                  {activation.failure.message}
                  <span className="mt-1 block text-xs text-rose-100/80">
                    {activation.failure.nextAction}
                  </span>
                </p>
              ) : null}
            </Section>
          </>
        ) : (
          <>
            <Section title="Live result" testId="autopilot-live-result">
              {liveSummary ? (
                <dl className="space-y-3 text-sm">
                  <SummaryRow label="Where" value={liveSummary.whereLive} />
                  <SummaryRow label="Schedule" value={liveSummary.schedule} />
                  <SummaryRow label="Measured" value={liveSummary.measured} />
                  <SummaryRow label="Needs attention" value={liveSummary.needsAttention} />
                  <SummaryRow label="Email and social" value={liveSummary.externalBoundary} />
                </dl>
              ) : (
                <p className="text-sm text-white/70">{activation?.hostStateDetail}</p>
              )}
            </Section>

            <Section title="Customer preview" testId="autopilot-live-preview">
              {publicPreviewHref ? (
                <Link
                  href={publicPreviewHref}
                  className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/20 px-4 text-sm text-white/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8fa3b8]"
                  data-testid="autopilot-inspect-customer"
                >
                  Inspect customer experience
                </Link>
              ) : (
                <p className="text-sm text-white/70">
                  Open your Tap Point or Card preview to see what customers see.
                </p>
              )}
            </Section>

            <Section title="First results" testId="autopilot-live-observation">
              {observation ? (
                <ul className="space-y-2" data-testid="autopilot-observation-list">
                  <li className="text-sm text-white/85">{observation.headline}</li>
                  {visibleObservationStatements(observation).map((line) => (
                    <li key={line} className="text-sm text-white/70">
                      {line}
                    </li>
                  ))}
                  {observation.attention.map((a) => (
                    <li
                      key={a}
                      className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-amber-50"
                    >
                      {a}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-white/70">Results will appear as customers respond.</p>
              )}
            </Section>

            <Section title="Controls" testId="autopilot-live-controls">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {activation?.status === "paused" ? (
                  <button
                    type="button"
                    onClick={onResume}
                    className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#c5d4a8] px-3 text-sm font-semibold text-[#1a2210] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8fa3b8]"
                    data-testid="autopilot-resume-live"
                  >
                    Resume
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onPause}
                    disabled={
                      activation?.status === "stopped" || activation?.status === "manual_control"
                    }
                    className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/20 px-3 text-sm text-white/85 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8fa3b8]"
                    data-testid="autopilot-pause-live"
                  >
                    Pause
                  </button>
                )}
                <button
                  type="button"
                  onClick={onStop}
                  disabled={activation?.status === "stopped"}
                  className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/20 px-3 text-sm text-white/85 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8fa3b8]"
                  data-testid="autopilot-stop-live"
                >
                  Stop now
                </button>
                <button
                  type="button"
                  onClick={onUndoGoLive}
                  disabled={activation?.status === "manual_control"}
                  className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/20 px-3 text-sm text-white/85 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8fa3b8]"
                  data-testid="autopilot-undo-golive"
                >
                  Undo go-live
                </button>
                <button
                  type="button"
                  onClick={onManualControl}
                  className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/15 px-3 text-sm text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8fa3b8]"
                  data-testid="autopilot-live-manual"
                >
                  Take manual control
                </button>
              </div>
            </Section>
          </>
        )}

        <Section title="Next step" testId="autopilot-prepared-next">
          <p className="text-sm text-white/70">
            {isLivePhase ? activation?.nextSafeAction : execution.nextSafeAction}
          </p>
          {execution.manualControl.active || activation?.status === "manual_control" ? (
            <p
              className="mt-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/75"
              data-testid="autopilot-manual-frozen"
            >
              {execution.manualControl.note || activation?.hostStateDetail}
            </p>
          ) : null}
          <div className="mt-3 flex flex-col gap-2">
            {!isLivePhase && (isStale || isUndone) ? (
              <button
                type="button"
                onClick={onReprepare}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[#c5d4a8] px-4 text-sm font-semibold text-[#1a2210] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8fa3b8]"
                data-testid="autopilot-reprepare"
              >
                Prepare again
              </button>
            ) : null}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {!isLivePhase ? (
                <button
                  type="button"
                  onClick={onUndo}
                  disabled={!canUndoPrep || isUndone || execution.manualControl.active}
                  className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/20 px-3 text-sm text-white/85 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8fa3b8]"
                  data-testid="autopilot-undo-preparation"
                >
                  Undo preparation
                </button>
              ) : null}
              <button
                type="button"
                onClick={onEditGoal}
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/20 px-3 text-sm text-white/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8fa3b8]"
                data-testid="autopilot-prepared-edit-goal"
              >
                Edit goal
              </button>
              {!isLivePhase ? (
                <button
                  type="button"
                  onClick={onManualControl}
                  className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/15 px-3 text-sm text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8fa3b8]"
                  data-testid="autopilot-prepared-manual"
                >
                  Take manual control
                </button>
              ) : null}
              <Link
                href="/dashboard"
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/15 px-3 text-sm text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8fa3b8]"
                data-testid="autopilot-prepared-studio-link"
              >
                Return to Studio
              </Link>
            </div>
          </div>
        </Section>

        <div className="border-t border-white/10 pt-3">
          <button
            type="button"
            onClick={() => setAdvancedOpen((v) => !v)}
            className="min-h-11 text-xs font-medium text-white/45 underline-offset-2 hover:text-white/70 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8fa3b8]"
            aria-expanded={advancedOpen}
            data-testid="autopilot-prepared-advanced-toggle"
          >
            {advancedOpen ? "Hide advanced details" : "Advanced / Audit"}
          </button>
          {advancedOpen ? (
            <AdvancedPanel execution={execution} plan={plan} activation={activation} />
          ) : null}
        </div>
      </div>
    </section>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/40">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-white/85 break-words">{value}</dd>
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

function AdvancedPanel({
  execution,
  plan,
  activation,
}: {
  execution: PreparedExecution;
  plan: AutopilotPlan;
  activation: LiveActivation | null;
}) {
  return (
    <div
      className="mt-3 space-y-2 rounded-lg border border-white/10 bg-black/30 p-3 font-mono text-[11px] text-white/55"
      data-testid="autopilot-prepared-advanced"
    >
      <p>
        executionId: {execution.executionId} · schema: {execution.schemaVersion}
      </p>
      <p>
        plan: {execution.planId} v{execution.planVersion} · recipe: {execution.recipeId}@
        {execution.recipeVersion}
      </p>
      <p>status: {execution.status}</p>
      {activation ? (
        <>
          <p>
            activationId: {activation.activationId} · status: {activation.status}
          </p>
          <p>
            activationKey: {activation.activationKey.slice(0, 32)}…
          </p>
          <p>
            distributionSent={String(activation.distributionSent)} customerContact=
            {String(activation.customerContactOccurred)}
          </p>
          <p>
            live audit: {activation.auditRefs.map((a) => a.action).join(" → ") || "none"}
          </p>
        </>
      ) : null}
      <p>
        preparedObjects:{" "}
        {execution.preparedObjects.map((o) => `${o.kind}:${o.status}`).join(", ") || "none"}
      </p>
      <p>
        sourceFacts: {execution.sourceFacts.map((f) => f.kind).join(", ") || "none"}
      </p>
      <p>
        approvalsSatisfied: {execution.approvalsSatisfied.map((a) => a.id).join(", ") || "none"}
      </p>
      <p>
        approvalsOutstanding:{" "}
        {execution.approvalsOutstanding.map((a) => a.id).join(", ") || "none"}
      </p>
      <p>
        reversibleActions: {execution.reversibleActions.map((a) => a.kind).join(", ") || "none"}
      </p>
      <p>
        component readiness:{" "}
        {execution.readiness.components
          .map((c) => `${c.component}:${c.ready ? "ok" : "no"}`)
          .join(", ") || "none"}
      </p>
      <p>
        rollback: {execution.rollbackState.status} · restored:{" "}
        {execution.rollbackState.restoredObjectIds.length} · failed:{" "}
        {execution.rollbackState.failedObjectIds.length}
      </p>
      <p>
        fingerprints: plan={execution.planFingerprint.slice(0, 24)}… facts=
        {execution.factsFingerprint.slice(0, 24) || "(empty)"}…
      </p>
      <p>
        audit: {execution.auditRefs.map((a) => a.action).join(" → ") || "none"}
      </p>
      <p>
        livePublish={String(execution.livePublish)} liveSend={String(execution.liveSend)}{" "}
        liveSpend={String(execution.liveSpend)} customerContact=
        {String(execution.customerContactOccurred)}
      </p>
      <p>plan.status: {plan.status}</p>
      {execution.failure ? (
        <p>
          failure: {execution.failure.code} — {execution.failure.message}
        </p>
      ) : null}
    </div>
  );
}
