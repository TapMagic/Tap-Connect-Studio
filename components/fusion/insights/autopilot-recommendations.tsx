import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AutopilotProposal } from "@/lib/fusion/autopilot/types";

/**
 * Contextual Autopilot recommendations surface for Audience & Insights.
 *
 * This surfaces EXISTING AutopilotProposal records and the Card's prepared suggestion
 * — it does not create a parallel proposal system and does not approve anything here.
 * Approval stays at the authoritative review location (the Card wiring flow), preserved
 * via the review link. Uses the Autopilot zone accent (oklch 168 hue), never GO green.
 */

export type AutopilotSuggestion = {
  title: string;
  href: string;
  detail: string;
} | null;

const AUTOPILOT_ACCENT = "oklch(0.74 0.12 165)";
const AUTOPILOT_ACCENT_TEXT = "oklch(0.86 0.08 168)";

export function AutopilotRecommendations({
  proposals,
  cardSuggestion,
  cardName,
  reviewHref = "/dashboard/card?wire=offer",
  emptyHint,
}: {
  proposals: AutopilotProposal[];
  cardSuggestion: AutopilotSuggestion;
  cardName: string;
  reviewHref?: string;
  /** Optional contextual hint about stale content / incomplete setup detection. */
  emptyHint?: string;
}) {
  const pending = proposals.filter((p) => p.status === "pending");
  const hasAnything = pending.length > 0 || Boolean(cardSuggestion);

  return (
    <Card
      className="border-[oklch(0.62_0.11_168_/_0.28)] bg-card/40"
      data-testid="autopilot-recommendations"
    >
      <CardHeader>
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.16em]"
          style={{ color: AUTOPILOT_ACCENT_TEXT }}
        >
          Autopilot · prepared for {cardName}
        </p>
        <CardTitle className="text-lg text-white">
          {hasAnything ? "Recommendations ready to review" : "No recommendations right now"}
        </CardTitle>
        <CardDescription className="text-white/60">
          Autopilot prepares work for your Card. Nothing is applied until you approve it in the
          Card wiring flow.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {cardSuggestion ? (
          <div
            className="rounded-lg border p-3"
            style={{ borderColor: "oklch(0.62 0.11 168 / 0.35)" }}
            data-testid="autopilot-card-suggestion"
          >
            <p className="text-sm font-medium text-white">{cardSuggestion.title}</p>
            <p className="mt-1 text-xs text-white/60">{cardSuggestion.detail}</p>
            <Link
              href={cardSuggestion.href}
              className="mt-2 inline-flex text-xs font-medium underline-offset-4 hover:underline"
              style={{ color: AUTOPILOT_ACCENT_TEXT }}
            >
              Review recommendation →
            </Link>
          </div>
        ) : null}

        {pending.length > 0 ? (
          <ul className="space-y-2" data-testid="autopilot-proposal-list">
            {pending.map((p) => (
              <li
                key={p.id}
                className="rounded-lg border border-white/8 bg-white/[0.02] p-3"
                data-testid="autopilot-proposal-row"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">{p.summary}</p>
                    <p className="mt-0.5 text-[11px] text-white/50">
                      {p.artifacts.length} artifact{p.artifacts.length === 1 ? "" : "s"} ·
                      prepared {p.createdAt.slice(0, 10)}
                    </p>
                    {p.warnings.length > 0 ? (
                      <p className="mt-1 text-[11px]" style={{ color: "var(--studio-status-warn)" }}>
                        {p.warnings.length} warning{p.warnings.length === 1 ? "" : "s"} to review
                      </p>
                    ) : null}
                  </div>
                  <span
                    className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide"
                    style={{ borderColor: AUTOPILOT_ACCENT, color: AUTOPILOT_ACCENT_TEXT }}
                  >
                    Pending review
                  </span>
                </div>
                <Link
                  href={reviewHref}
                  className="mt-2 inline-flex text-xs font-medium underline-offset-4 hover:underline"
                  style={{ color: AUTOPILOT_ACCENT_TEXT }}
                >
                  Open to approve or reject →
                </Link>
              </li>
            ))}
          </ul>
        ) : null}

        {!hasAnything ? (
          <p className="text-sm text-white/55" data-testid="autopilot-recommendations-empty">
            {emptyHint ??
              "Autopilot has nothing prepared. Recommendations appear when it detects stale content or an incomplete Card setup — none detected in scope."}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
