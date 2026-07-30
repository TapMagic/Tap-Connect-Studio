import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Info,
  CircleDot,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  OWNER_STATUS_META,
  ownerSeverityFromOps,
  type OwnerStatusSeverity,
} from "@/lib/fusion/ux/owner-status";
import { withDetachMarker } from "@/lib/fusion/ux/same-tab-navigation";

/**
 * Reusable Operations Console — one honest pattern for every operational surface:
 * provider health, Tap Point health, routing failures, readiness, items that need review.
 *
 * Status semantics use Owner severity (success/attention/error/info).
 * GREEN (--studio-go) is reserved for primary Create/next actions — never used
 * here for decorative health coloring on every card.
 */

export type OperationsStatus = "ok" | "warn" | "critical" | "info" | "neutral";

export type OperationsRow = {
  id: string;
  /** Short human label for what this row is */
  label: string;
  /** Current honest state (one line) */
  detail: string;
  status: OperationsStatus;
  /** Optional numeric badge (e.g. count of failures / devices) */
  count?: number;
  /** Optional recovery / open action */
  action?: {
    label: string;
    href: string;
    /** external link — must show ↗ */
    external?: boolean;
    primary?: boolean;
  };
  /** Optional secondary meta (timestamp, provenance) */
  meta?: string;
  /** Optional testid for the meta line (e.g. decision-item-meta) */
  metaTestId?: string;
  /** Optional raw technical detail, shown behind a collapsed disclosure */
  technicalDetail?: string;
  /** Optional stable domain id emitted as data-decision-id for deep-linking */
  decisionId?: string;
  testId?: string;
};

export type OperationsGroup = {
  id: string;
  title: string;
  /** Sub-explanation of what this group covers and its scope/limits */
  description?: string;
  rows: OperationsRow[];
  /** Honest empty message when rows is empty */
  emptyLabel?: string;
  testId?: string;
};

const OPS_ICON: Record<
  OperationsStatus,
  typeof CheckCircle2
> = {
  ok: CheckCircle2,
  warn: AlertTriangle,
  critical: XCircle,
  info: Info,
  neutral: CircleDot,
};

function severityFor(status: OperationsStatus): OwnerStatusSeverity {
  return ownerSeverityFromOps(status);
}

export function OperationsStatusPill({
  status,
  children,
  testId,
}: {
  status: OperationsStatus;
  children?: React.ReactNode;
  testId?: string;
}) {
  const severity = severityFor(status);
  const meta = OWNER_STATUS_META[severity];
  const Icon = OPS_ICON[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
        meta.pillClass
      )}
      data-testid={testId}
      data-ops-status={status}
      data-owner-severity={severity}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {children ?? meta.defaultLabel}
    </span>
  );
}

function OperationsRowItem({ row }: { row: OperationsRow }) {
  const severity = severityFor(row.status);
  const meta = OWNER_STATUS_META[severity];
  const Icon = OPS_ICON[row.status];
  const actionLabel = row.action
    ? row.action.external
      ? withDetachMarker(row.action.label)
      : row.action.label
    : null;

  return (
    <li
      className="flex flex-col gap-2 px-4 py-3"
      data-testid={row.testId ?? `ops-row-${row.id}`}
      data-ops-status={row.status}
      data-owner-severity={severity}
      {...(row.decisionId ? { "data-decision-id": row.decisionId } : {})}
    >
      <div className="flex min-w-0 items-start gap-2.5">
        <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", meta.iconClass)} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-sm text-white/90">
            <span>{row.label}</span>
            {typeof row.count === "number" ? (
              <span
                className={cn(
                  "rounded-full border px-1.5 py-0.5 text-[10px] tabular-nums",
                  meta.pillClass
                )}
              >
                {row.count}
              </span>
            ) : null}
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-white/55">{row.detail}</p>
          {row.meta ? (
            <p
              className="mt-0.5 font-mono text-[10px] text-white/35"
              {...(row.metaTestId ? { "data-testid": row.metaTestId } : {})}
            >
              {row.meta}
            </p>
          ) : null}
          {row.technicalDetail ? (
            <details className="mt-1">
              <summary className="cursor-pointer text-[10px] text-white/40">
                Technical detail
              </summary>
              <p className="mt-0.5 break-all font-mono text-[10px] text-white/40">
                {row.technicalDetail}
              </p>
            </details>
          ) : null}
        </div>
      </div>
      {row.action && actionLabel ? (
        row.action.external ? (
          <a
            href={row.action.href}
            target="_blank"
            rel="noopener noreferrer"
            data-nav-detached="1"
            className={cn(
              "inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 self-start rounded-lg px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
              row.action.primary
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "border border-white/15 bg-white/[0.04] text-white/90 hover:border-white/30"
            )}
          >
            {actionLabel}
          </a>
        ) : (
          <Link
            href={row.action.href}
            className={cn(
              "inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 self-start rounded-lg px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
              row.action.primary
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "border border-white/15 bg-white/[0.04] text-white/90 hover:border-white/30"
            )}
          >
            {actionLabel}
            {!row.action.primary ? (
              <ArrowRight className="h-3.5 w-3.5 opacity-70" aria-hidden />
            ) : null}
          </Link>
        )
      ) : null}
    </li>
  );
}

/**
 * Full multi-group console. Use on Settings / Integrations and Home
 * needs-attention surfaces so Owners read one consistent pattern.
 */
export function OperationsConsole({
  groups,
  className,
  testId = "operations-console",
  title,
  subtitle,
}: {
  groups: OperationsGroup[];
  className?: string;
  testId?: string;
  title?: string;
  subtitle?: string;
}) {
  return (
    <section
      className={cn("space-y-4", className)}
      data-testid={testId}
      aria-label={title ?? "Operations console"}
    >
      {title ? (
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-white/50">
            {title}
          </h2>
          {subtitle ? <p className="mt-1 text-sm text-white/55">{subtitle}</p> : null}
        </div>
      ) : null}
      <div className="grid gap-3 lg:grid-cols-2">
        {groups.map((group) => {
          const worst = worstStatus(group.rows);
          const severity = severityFor(worst);
          return (
            <div
              key={group.id}
              className={cn(
                "overflow-hidden rounded-xl border bg-white/[0.02]",
                OWNER_STATUS_META[severity].frameClass
              )}
              data-testid={group.testId ?? `ops-group-${group.id}`}
              data-owner-severity={severity}
            >
              <div className="flex items-start justify-between gap-3 border-b border-white/8 px-4 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white/90">{group.title}</p>
                  {group.description ? (
                    <p className="mt-0.5 text-xs leading-relaxed text-white/50">
                      {group.description}
                    </p>
                  ) : null}
                </div>
                <OperationsStatusPill status={worst}>
                  {statusSummaryLabel(group.rows)}
                </OperationsStatusPill>
              </div>
              {group.rows.length > 0 ? (
                <ul className="divide-y divide-white/6">
                  {group.rows.map((row) => (
                    <OperationsRowItem key={row.id} row={row} />
                  ))}
                </ul>
              ) : (
                <p className="px-4 py-4 text-sm leading-relaxed text-white/50">
                  {group.emptyLabel ??
                    "Nothing needs your attention. No approvals, failed deliveries, or publishing issues are blocking your work."}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** Single-group inline console (e.g. Home needs-attention). */
export function OperationsConsoleGroup({
  group,
  className,
}: {
  group: OperationsGroup;
  className?: string;
}) {
  return (
    <OperationsConsole
      groups={[group]}
      className={className}
      testId={group.testId ?? `ops-group-${group.id}`}
    />
  );
}

const STATUS_RANK: Record<OperationsStatus, number> = {
  critical: 4,
  warn: 3,
  info: 2,
  neutral: 1,
  ok: 0,
};

export function worstStatus(rows: OperationsRow[]): OperationsStatus {
  if (rows.length === 0) return "neutral";
  return rows.reduce<OperationsStatus>(
    (worst, row) => (STATUS_RANK[row.status] > STATUS_RANK[worst] ? row.status : worst),
    "ok"
  );
}

function statusSummaryLabel(rows: OperationsRow[]): string {
  if (rows.length === 0) return "Nothing needs your attention";
  const critical = rows.filter((r) => r.status === "critical").length;
  const warn = rows.filter((r) => r.status === "warn").length;
  if (critical > 0) {
    return critical === 1 ? "1 item blocked" : `${critical} items blocked`;
  }
  if (warn > 0) {
    return warn === 1 ? "1 item needs review" : `${warn} items need review`;
  }
  const hasNeutralOnly = rows.every(
    (r) => r.status === "neutral" || r.status === "info"
  );
  if (hasNeutralOnly) return "Setup needed";
  return "Healthy";
}
