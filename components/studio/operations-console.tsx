import Link from "next/link";
import { ArrowRight, CheckCircle2, AlertTriangle, Info, CircleDot } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Reusable Operations Console — one honest pattern for every operational surface:
 * provider health, Tap Point health, routing failures, readiness, unresolved
 * decisions, integration status.
 *
 * Status semantics use status tokens ONLY (ok/warn/critical/info/neutral).
 * GREEN (--studio-go) is reserved for primary Create/next actions — never used
 * here for status or health. Recovery links are neutral/quiet, not green CTAs.
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
    /** external link */
    external?: boolean;
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

const STATUS_META: Record<
  OperationsStatus,
  {
    icon: typeof CheckCircle2;
    /** text color via status token */
    color: string;
    /** subtle border/background via status token */
    ring: string;
    label: string;
  }
> = {
  ok: {
    icon: CheckCircle2,
    color: "text-[color:var(--studio-status-ok)]",
    ring: "border-[color:var(--studio-status-ok)]/25",
    label: "Healthy",
  },
  warn: {
    icon: AlertTriangle,
    color: "text-[color:var(--studio-status-warn)]",
    ring: "border-[color:var(--studio-status-warn)]/30",
    label: "Needs attention",
  },
  critical: {
    icon: AlertTriangle,
    color: "text-[color:var(--studio-status-critical)]",
    ring: "border-[color:var(--studio-status-critical)]/35",
    label: "Blocked",
  },
  info: {
    icon: Info,
    color: "text-[color:var(--studio-status-info)]",
    ring: "border-[color:var(--studio-status-info)]/30",
    label: "Info",
  },
  neutral: {
    icon: CircleDot,
    color: "text-[color:var(--studio-status-neutral)]",
    ring: "border-white/10",
    label: "Neutral",
  },
};

export function OperationsStatusPill({
  status,
  children,
  testId,
}: {
  status: OperationsStatus;
  children?: React.ReactNode;
  testId?: string;
}) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
        meta.ring,
        meta.color
      )}
      data-testid={testId}
      data-ops-status={status}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {children ?? meta.label}
    </span>
  );
}

function OperationsRowItem({ row }: { row: OperationsRow }) {
  const meta = STATUS_META[row.status];
  const Icon = meta.icon;
  return (
    <li
      className="flex flex-col gap-1.5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
      data-testid={row.testId ?? `ops-row-${row.id}`}
      data-ops-status={row.status}
      {...(row.decisionId ? { "data-decision-id": row.decisionId } : {})}
    >
      <div className="flex min-w-0 items-start gap-2.5">
        <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", meta.color)} aria-hidden />
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm text-white/90">
            <span className="truncate">{row.label}</span>
            {typeof row.count === "number" ? (
              <span
                className={cn(
                  "rounded-full border px-1.5 py-0.5 text-[10px] tabular-nums",
                  meta.ring,
                  meta.color
                )}
              >
                {row.count}
              </span>
            ) : null}
          </p>
          <p className="mt-0.5 text-xs text-white/50">{row.detail}</p>
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
      {row.action ? (
        row.action.external ? (
          <a
            href={row.action.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 shrink-0 items-center gap-1 self-start text-xs text-white/70 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 sm:self-center"
          >
            {row.action.label} <ArrowRight className="h-3 w-3" aria-hidden />
          </a>
        ) : (
          <Link
            href={row.action.href}
            className="inline-flex min-h-11 shrink-0 items-center gap-1 self-start text-xs text-white/70 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 sm:self-center"
          >
            {row.action.label} <ArrowRight className="h-3 w-3" aria-hidden />
          </Link>
        )
      ) : null}
    </li>
  );
}

/**
 * Full multi-group console. Use on Settings / Integrations and Home
 * needs-attention / decision surfaces so operators read one consistent pattern.
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
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-white/40">
            {title}
          </h2>
          {subtitle ? <p className="mt-1 text-sm text-white/50">{subtitle}</p> : null}
        </div>
      ) : null}
      <div className="grid gap-3 lg:grid-cols-2">
        {groups.map((group) => (
          <div
            key={group.id}
            className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]"
            data-testid={group.testId ?? `ops-group-${group.id}`}
          >
            <div className="flex items-start justify-between gap-3 border-b border-white/8 px-4 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-medium text-white/90">{group.title}</p>
                {group.description ? (
                  <p className="mt-0.5 text-xs text-white/45">{group.description}</p>
                ) : null}
              </div>
              <OperationsStatusPill status={worstStatus(group.rows)}>
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
              <p className="px-4 py-4 text-xs text-white/40">
                {group.emptyLabel ?? "Nothing to report — this area is calm."}
              </p>
            )}
          </div>
        ))}
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
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]",
        className
      )}
      data-testid={group.testId ?? `ops-group-${group.id}`}
    >
      <div className="flex items-start justify-between gap-3 border-b border-white/8 px-4 py-2.5">
        <div className="min-w-0">
          <p className="text-sm font-medium text-white/90">{group.title}</p>
          {group.description ? (
            <p className="mt-0.5 text-xs text-white/45">{group.description}</p>
          ) : null}
        </div>
        <OperationsStatusPill status={worstStatus(group.rows)}>
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
        <p className="px-4 py-4 text-xs text-white/40">
          {group.emptyLabel ?? "Nothing to report — this area is calm."}
        </p>
      )}
    </div>
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
  if (rows.length === 0) return "Calm";
  const critical = rows.filter((r) => r.status === "critical").length;
  const warn = rows.filter((r) => r.status === "warn").length;
  if (critical > 0) return `${critical} blocked`;
  if (warn > 0) return `${warn} to review`;
  return "Healthy";
}
