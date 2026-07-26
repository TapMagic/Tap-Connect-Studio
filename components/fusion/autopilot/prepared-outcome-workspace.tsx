"use client";

import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from "react";
import Link from "next/link";
import type { AutopilotPlan } from "@/lib/fusion/autopilot/plan";
import type { PreparedExecution } from "@/lib/fusion/autopilot/prepared-execution";
import { F2_HONESTY_STATEMENT } from "@/lib/fusion/autopilot/prepared-host";
import { readinessHostLabel } from "@/lib/fusion/autopilot/prepared-host";
import { cn } from "@/lib/utils";

export type PreparedOutcomeWorkspaceProps = {
  execution: PreparedExecution;
  plan: AutopilotPlan;
  focused?: boolean;
  onUndo: () => void;
  onReprepare: () => void;
  onEditGoal: () => void;
  onManualControl: () => void;
  onReturnToStudio: () => void;
  className?: string;
};

/**
 * Focused Autopilot F2 workspace — one prepared outcome, not a mutation log.
 * Escape / focused mode; not a permanent primary-nav destination.
 */
export function PreparedOutcomeWorkspace({
  execution,
  plan,
  focused = true,
  onUndo,
  onReprepare,
  onEditGoal,
  onManualControl,
  onReturnToStudio,
  className,
}: PreparedOutcomeWorkspaceProps) {
  const formId = useId();
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  useEffect(() => {
    headingRef.current?.focus();
  }, [execution.executionId, execution.status]);

  const canUndo =
    execution.status === "prepared" ||
    execution.status === "needs_attention" ||
    execution.status === "failed";
  const isStale = execution.readiness.stale || execution.readiness.outcome === "stale_prepare_again";
  const isUndone = execution.status === "rolled_back";
  const summary = execution.hostSummary;

  return (
    <section
      className={cn(
        "rounded-xl border border-primary/30 bg-gradient-to-b from-primary/[0.09] to-[#080d18] p-4 sm:p-5",
        focused && "min-h-[70vh]",
        className
      )}
      data-testid="autopilot-prepared-outcome"
      data-status={execution.status}
      data-focused={focused ? "true" : "false"}
      data-stale={isStale ? "true" : "false"}
      aria-labelledby={`${formId}-heading`}
    >
      <header className="space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
            Autopilot · prepared outcome
          </p>
          <button
            type="button"
            onClick={onReturnToStudio}
            className="min-h-10 rounded-lg border border-white/15 px-3 text-xs text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            data-testid="autopilot-return-studio"
          >
            Return to Studio
          </button>
        </div>
        <h2
          id={`${formId}-heading`}
          ref={headingRef}
          tabIndex={-1}
          className="text-lg font-semibold text-white outline-none focus-visible:ring-2 focus-visible:ring-primary sm:text-xl"
          data-testid="autopilot-prepared-heading"
        >
          {execution.hostStateDetail}
        </h2>
        <div
          className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/70"
          data-testid="autopilot-prepared-state"
          data-state={execution.status}
          data-readiness={execution.readiness.outcome}
          role="status"
          aria-live="polite"
        >
          {readinessHostLabel(execution.readiness.outcome)}
        </div>
        <p className="text-xs text-white/45" data-testid="autopilot-honesty">
          {execution.honestyStatement || F2_HONESTY_STATEMENT}
        </p>
      </header>

      <div className="mt-5 space-y-5">
        <Section title="Goal" testId="autopilot-prepared-goal">
          <p className="text-sm text-white/85">{plan.objective}</p>
        </Section>

        <Section title="Prepared result" testId="autopilot-prepared-result">
          {summary ? (
            <dl className="space-y-3 text-sm">
              <SummaryRow label="On your Card" value={summary.onCard} />
              <SummaryRow label="Who it’s for" value={summary.audience} />
              <SummaryRow label="When" value={summary.when} />
              <SummaryRow label="Customers can" value={summary.customerCanDo} />
              <SummaryRow label="Follow-up" value={summary.followUp} />
              <SummaryRow label="Measured" value={summary.measured} />
              <SummaryRow label="Still needs approval" value={summary.stillNeedsApproval} />
              <SummaryRow label="When go live arrives" value={summary.afterGoLive} />
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
                  className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary"
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
          !execution.failure ? (
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

        <Section title="Ready to go live" testId="autopilot-prepared-golive">
          <p className="text-sm text-white/70">
            Go live comes after final approval — not available in this step.
          </p>
          <button
            type="button"
            disabled
            className="mt-3 inline-flex min-h-11 w-full cursor-not-allowed items-center justify-center rounded-lg border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white/35"
            data-testid="autopilot-go-live-disabled"
            aria-disabled="true"
            title="Coming after final approval"
          >
            Go live — coming after final approval
          </button>
        </Section>

        <Section title="Next step" testId="autopilot-prepared-next">
          <p className="text-sm text-white/70">{execution.nextSafeAction}</p>
          {execution.manualControl.active ? (
            <p
              className="mt-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/75"
              data-testid="autopilot-manual-frozen"
            >
              {execution.manualControl.note}
            </p>
          ) : null}
          <div className="mt-3 flex flex-col gap-2">
            {isStale || isUndone ? (
              <button
                type="button"
                onClick={onReprepare}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                data-testid="autopilot-reprepare"
              >
                Prepare again
              </button>
            ) : null}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={onUndo}
                disabled={!canUndo || isUndone || execution.manualControl.active}
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/20 px-3 text-sm text-white/85 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                data-testid="autopilot-undo-preparation"
              >
                Undo preparation
              </button>
              <button
                type="button"
                onClick={onEditGoal}
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/20 px-3 text-sm text-white/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                data-testid="autopilot-prepared-edit-goal"
              >
                Edit goal
              </button>
              <button
                type="button"
                onClick={onManualControl}
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/15 px-3 text-sm text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                data-testid="autopilot-prepared-manual"
              >
                Take manual control
              </button>
              <Link
                href="/dashboard"
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/15 px-3 text-sm text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
            className="text-xs font-medium text-white/45 underline-offset-2 hover:text-white/70 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-expanded={advancedOpen}
            data-testid="autopilot-prepared-advanced-toggle"
          >
            {advancedOpen ? "Hide advanced details" : "Advanced / Audit"}
          </button>
          {advancedOpen ? (
            <AdvancedPanel execution={execution} plan={plan} />
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
}: {
  execution: PreparedExecution;
  plan: AutopilotPlan;
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

/** @internal exported for tests */
export type { RefObject };
