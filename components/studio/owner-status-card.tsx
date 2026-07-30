import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  OWNER_STATUS_META,
  type OwnerStatusCardModel,
  type OwnerStatusSeverity,
} from "@/lib/fusion/ux/owner-status";

const ICONS: Record<OwnerStatusSeverity, typeof CheckCircle2> = {
  success: CheckCircle2,
  attention: AlertTriangle,
  error: XCircle,
  info: Info,
};

function ActionLink({
  action,
}: {
  action: NonNullable<OwnerStatusCardModel["actions"]>[number];
}) {
  const className = cn(
    "inline-flex min-h-10 items-center justify-center rounded-lg px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
    action.primary
      ? "bg-primary text-primary-foreground hover:bg-primary/90"
      : "border border-white/15 bg-white/[0.04] text-white/90 hover:border-white/30"
  );
  const label = action.external
    ? action.label.includes("↗")
      ? action.label
      : `${action.label} ↗`
    : action.label;

  if (action.external) {
    return (
      <a
        href={action.href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        data-nav-detached="1"
      >
        {label}
      </a>
    );
  }

  return (
    <Link href={action.href} className={className}>
      {label}
    </Link>
  );
}

/** One coherent Owner status card — severity frame, icon, label, consequence, actions. */
export function OwnerStatusCard({
  model,
  className,
}: {
  model: OwnerStatusCardModel;
  className?: string;
}) {
  const meta = OWNER_STATUS_META[model.severity];
  const Icon = ICONS[model.severity];
  const primaryActions = model.actions?.filter((a) => a.primary) ?? [];
  const secondaryActions = model.actions?.filter((a) => !a.primary) ?? [];

  return (
    <article
      className={cn(
        "rounded-xl border px-4 py-3.5",
        meta.frameClass,
        className
      )}
      data-testid={model.testId ?? `owner-status-${model.id}`}
      data-owner-severity={model.severity}
      data-owner-status-label={model.label}
    >
      <div className="flex items-start gap-3">
        <Icon
          className={cn("mt-0.5 h-5 w-5 shrink-0", meta.iconClass)}
          aria-hidden
        />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-white/95">{model.title}</h3>
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
                meta.pillClass
              )}
            >
              {model.label}
            </span>
          </div>
          <p className="text-sm leading-relaxed text-white/75">{model.summary}</p>
          {model.consequence ? (
            <p className="text-xs leading-relaxed text-white/55">{model.consequence}</p>
          ) : null}
          {model.meta ? (
            <p className="font-mono text-[10px] text-white/35">{model.meta}</p>
          ) : null}
          {model.actions && model.actions.length > 0 ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {primaryActions.map((action) => (
                <ActionLink key={`${action.href}-${action.label}`} action={action} />
              ))}
              {secondaryActions.map((action) => (
                <ActionLink key={`${action.href}-${action.label}`} action={action} />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function OwnerStatusCardGrid({
  cards,
  className,
  testId,
}: {
  cards: OwnerStatusCardModel[];
  className?: string;
  testId?: string;
}) {
  return (
    <div
      className={cn("grid gap-3 lg:grid-cols-2", className)}
      data-testid={testId ?? "owner-status-grid"}
    >
      {cards.map((card) => (
        <OwnerStatusCard key={card.id} model={card} />
      ))}
    </div>
  );
}
