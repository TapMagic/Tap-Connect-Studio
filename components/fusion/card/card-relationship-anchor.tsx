import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  CARD_RELATIONSHIP_ROLE_COPY,
  type CardRelationshipContext,
  type CardRelationshipRole,
} from "@/lib/fusion/studio/card-relationship";

export type CardRelationshipAnchorProps = {
  card: Pick<
    CardRelationshipContext,
    | "cardName"
    | "publicStateLabel"
    | "publicHref"
    | "returnToCardHref"
    | "spotlightTitle"
    | "tapPointCount"
    | "tapSaveEnabled"
    | "brandSource"
    | "needsAttention"
    | "openHref"
  >;
  role: CardRelationshipRole;
  /** Optional override for "Supports X Card" line */
  supportsLabel?: string;
  roleLabel?: string;
  className?: string;
  showReturn?: boolean;
  showView?: boolean;
  compact?: boolean;
  extras?: React.ReactNode;
};

/**
 * Compact reusable Card relationship anchor for supporting workspaces.
 * Not a second Card state model — reads from CardRelationshipContext.
 */
export function CardRelationshipAnchor({
  card,
  role,
  supportsLabel,
  roleLabel,
  className,
  showReturn = true,
  showView = true,
  compact = false,
  extras,
}: CardRelationshipAnchorProps) {
  const copy = CARD_RELATIONSHIP_ROLE_COPY[role];
  const supports =
    supportsLabel ??
    (role === "home_command"
      ? card.cardName
      : role === "integrations_ecosystem"
        ? `Supports ${card.cardName} Card ecosystem`
        : role === "audience_relationships"
          ? `Supports ${card.cardName} Card relationships`
          : role === "brand_identity"
            ? `Defines identity for ${card.cardName} Card`
            : `Supports ${card.cardName} Card`);
  const roleText = roleLabel ?? copy.role;

  return (
    <div
      className={cn(
        "shrink-0 border-b border-white/10 bg-white/[0.02] px-4 py-2.5",
        compact ? "py-2" : "",
        className
      )}
      data-testid="card-relationship-anchor"
      data-card-role={role}
      role="region"
      aria-label="Card relationship"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-white/60">
        <span className="font-semibold text-white/90" data-testid="card-anchor-name">
          {supports}
        </span>
        <span
          className="rounded px-1.5 py-0.5 bg-white/8 text-white/75"
          data-testid="card-anchor-state"
        >
          {card.publicStateLabel}
        </span>
        <span data-testid="card-anchor-role" className="text-white/55">
          Role: {roleText}
        </span>
        {card.spotlightTitle ? (
          <span data-testid="card-anchor-spotlight">Spotlight · {card.spotlightTitle}</span>
        ) : null}
        <span data-testid="card-anchor-tappoints">
          {card.tapPointCount} Tap Point{card.tapPointCount === 1 ? "" : "s"}
        </span>
        <span data-testid="card-anchor-tapsave">
          {card.tapSaveEnabled ? "TapSave on" : "TapSave off"}
        </span>
        <span data-testid="card-anchor-brand">
          {card.brandSource === "brand_kit" ? "Brand Kit" : "Custom"}
        </span>
        {card.needsAttention ? (
          <span
            className="rounded px-1.5 py-0.5 bg-amber-500/15 text-amber-100"
            data-testid="card-anchor-attention"
          >
            Needs attention
          </span>
        ) : null}
        {extras}
        <span className="ml-auto flex flex-wrap items-center gap-2">
          {showView ? (
            <Link
              href={card.openHref || card.returnToCardHref}
              className="inline-flex min-h-11 items-center rounded-md border border-white/15 px-2.5 text-xs text-white/85 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              data-testid="card-anchor-view"
            >
              View Card
            </Link>
          ) : null}
          {card.publicHref ? (
            <a
              href={card.publicHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center rounded-md border border-white/10 px-2.5 text-xs text-white/70 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              data-testid="card-anchor-public"
            >
              Public ↗
            </a>
          ) : null}
          {showReturn ? (
            <Link
              href={card.returnToCardHref}
              className="inline-flex min-h-11 items-center rounded-md bg-primary/15 px-2.5 text-xs font-medium text-primary hover:bg-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              data-testid="card-anchor-return"
            >
              Return to Card
            </Link>
          ) : null}
        </span>
      </div>
    </div>
  );
}
