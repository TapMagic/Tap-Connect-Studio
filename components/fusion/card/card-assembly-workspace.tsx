"use client";

import Link from "next/link";
import {
  ExternalLink,
  Pencil,
  Eye,
  FlaskConical,
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
} from "lucide-react";
import { TapConnectCard } from "@/components/tap/tap-connect-card";
import { CardFuseBoxPanel } from "@/components/fusion/card/card-fuse-box-panel";
import { CardOfferWirePanel } from "@/components/fusion/card/card-offer-wire-panel";
import { OutcomeExperienceWorkspace } from "@/components/fusion/autopilot/outcome-experience-workspace";
import { WhereUsedPanel } from "@/components/fusion/studio/where-used-panel";
import type { BrandContactProfile } from "@/lib/brand/contact-profile";
import type { TapConnectCardConfig } from "@/lib/brand/tap-card";
import type { FuseBoxConnection } from "@/lib/fusion/card/fuse-box";
import type { CampaignWhereUsedHit } from "@/lib/fusion/studio/where-used";
import type { OfferCampaignCandidate } from "@/components/fusion/card/card-offer-wire-panel";
import type { KnowledgeFact } from "@/lib/fusion/autopilot/knowledge-fact";
import { cn } from "@/lib/utils";

export type CardAssemblyWorkspaceProps = {
  config: TapConnectCardConfig;
  profile: BrandContactProfile;
  businessName: string;
  logoUrl?: string | null;
  reviewUrl?: string | null;
  connections: FuseBoxConnection[];
  whereUsedHits: CampaignWhereUsedHit[];
  publicPreviewHref: string | null;
  activeCampaign?: { id: string; title: string; status: string } | null;
  tapPointCount: number;
  /** Preferred public device code for customer preview / entry path */
  deviceCode?: string | null;
  utilitySummary: string;
  supportConnected: boolean;
  readinessNotes: string[];
  nextActions: { label: string; href: string; primary?: boolean }[];
  showOfferWire?: boolean;
  offerCampaigns?: OfferCampaignCandidate[];
  offerSectionId?: string;
  boundOfferCampaignId?: string | null;
  /** F1 Autopilot outcome experience (local plan only) */
  showAutopilotOutcome?: boolean;
  brandAccent?: string;
  brandVoice?: string;
  emailConnected?: boolean;
  consentPathAvailable?: boolean;
  featureOfferEnabled?: boolean;
  featureAutopilotEnabled?: boolean;
  keepCardAvailable?: boolean;
  autopilotFacts?: KnowledgeFact[];
};

/**
 * Card assembly / fuse-box workspace — what the customer sees, what is connected,
 * what needs attention. Editing happens on /dashboard/card/edit.
 */
export function CardAssemblyWorkspace({
  config,
  profile,
  businessName,
  logoUrl,
  reviewUrl,
  connections,
  whereUsedHits,
  publicPreviewHref,
  activeCampaign,
  tapPointCount,
  deviceCode = null,
  utilitySummary,
  supportConnected,
  readinessNotes,
  nextActions,
  showOfferWire = false,
  offerCampaigns = [],
  offerSectionId,
  boundOfferCampaignId,
  showAutopilotOutcome = false,
  brandAccent,
  brandVoice,
  emailConnected = false,
  consentPathAvailable = false,
  featureOfferEnabled = true,
  featureAutopilotEnabled = true,
  keepCardAvailable = true,
  autopilotFacts = [],
}: CardAssemblyWorkspaceProps) {
  const retired = config.lifecycleStatus === "retired";

  return (
    <div
      className="mx-auto max-w-6xl space-y-8 px-4 py-6 lg:px-6 lg:py-8"
      data-testid="card-assembly-workspace"
    >
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
            Card assembly
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">
            Your Tap Card hub
          </h1>
          <p className="mt-1 max-w-xl text-sm text-white/60">
            See what customers see, what is connected, and what needs attention. Edit the Card
            in the full-screen workspace — this page stays the assembly view.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/card/edit"
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            data-testid="card-edit-open"
          >
            <Pencil className="h-4 w-4" aria-hidden />
            Edit Card
          </Link>
          <Link
            href="/dashboard/card/preview"
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
            data-testid="card-open-preview-workspace"
          >
            <Eye className="h-4 w-4" aria-hidden />
            View-only preview
          </Link>
          {publicPreviewHref ? (
            <a
              href={publicPreviewHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
              data-testid="card-preview-public"
            >
              <Eye className="h-4 w-4" aria-hidden />
              Preview public
              <ExternalLink className="h-3.5 w-3.5 opacity-60" aria-hidden />
            </a>
          ) : null}
          <Link
            href="/dashboard/tap-points"
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/15 px-4 py-2 text-sm text-white/80 hover:bg-white/5"
            data-testid="card-test-tappoints"
          >
            <FlaskConical className="h-4 w-4" aria-hidden />
            Test
          </Link>
        </div>
      </header>

      {retired ? (
        <p
          className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
          data-testid="card-retired-banner"
        >
          This Tap Card is retired — open Edit Card and restore it to publish again.
        </p>
      ) : null}

      {showAutopilotOutcome ? (
        <OutcomeExperienceWorkspace
          businessName={businessName}
          brandAccent={brandAccent}
          brandVoice={brandVoice}
          logoUrl={logoUrl}
          cardId="brand_kit_card"
          cardRetired={retired}
          hasSpotlight={Boolean(
            config.sections?.some((s) => s.type === "special_offer")
          )}
          boundCampaignId={boundOfferCampaignId}
          campaigns={offerCampaigns.map((c) => ({
            id: c.id,
            title: c.title,
            hasOffer: c.hasOffer,
            offerTitle: c.offerTitle,
            offerDescription: c.offerValueSummary,
            offerCode: c.offerCode,
            boundToThisCard: c.boundToThisCard,
            scheduledStart: c.scheduledStart,
            scheduledEnd: c.scheduledEnd,
          }))}
          prepareCampaigns={offerCampaigns.map((c) => ({
            id: c.id,
            title: c.title,
            status: c.status,
            offerTitle: c.offerTitle,
            offerDescription: c.offerValueSummary,
            offerCode: c.offerCode,
            scheduledStart: c.scheduledStart,
            scheduledEnd: c.scheduledEnd,
          }))}
          cardSections={config.sections ?? []}
          facts={autopilotFacts}
          emailConnected={emailConnected}
          consentPathAvailable={consentPathAvailable}
          tapPointAssigned={tapPointCount > 0}
          askQuestionAvailable={supportConnected}
          keepCardAvailable={keepCardAvailable}
          featureOfferEnabled={featureOfferEnabled}
          featureAutopilotEnabled={featureAutopilotEnabled}
          deviceCode={deviceCode || undefined}
        />
      ) : featureOfferEnabled ? (
        <div
          className="rounded-xl border border-primary/20 bg-primary/[0.05] px-4 py-3"
          data-testid="autopilot-outcome-entry"
        >
          <p className="text-sm font-medium text-white">Create a measurable offer on your Card</p>
          <p className="mt-1 text-xs text-white/55">
            Autopilot prepares a local plan and reversible drafts from your Campaign and Brand Kit —
            no publish or send.
          </p>
          <Link
            href="/dashboard/card?wire=offer"
            className="mt-3 inline-flex min-h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            data-testid="autopilot-outcome-entry-cta"
          >
            Prepare my plan
          </Link>
        </div>
      ) : null}

      {showOfferWire ? (
        <details
          className="rounded-xl border border-white/10 bg-white/[0.02] p-3"
          data-testid="card-offer-manual-wire"
          open={showAutopilotOutcome ? undefined : true}
        >
          <summary className="cursor-pointer text-sm font-medium text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            Manual Offer wire (bind, preview, distribution)
          </summary>
          <div className="mt-3">
            <CardOfferWirePanel
              campaigns={offerCampaigns}
              sectionId={offerSectionId}
              boundCampaignId={boundOfferCampaignId}
            />
          </div>
        </details>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)]">
        <section
          className="rounded-xl border border-white/10 bg-[#080d18] p-4"
          data-testid="card-assembly-preview"
          aria-label="Completed Card preview"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                Customer view
              </p>
              <h2 className="text-sm font-semibold text-white">Completed Card preview</h2>
            </div>
            <Link
              href="/dashboard/card/edit"
              className="text-xs text-primary hover:underline"
            >
              Open editor ↗
            </Link>
          </div>
          <div className="mx-auto max-h-[min(70vh,640px)] max-w-[360px] overflow-y-auto rounded-[1.5rem] border border-white/10 bg-[#1a1a1a] p-3">
            <TapConnectCard
              config={config}
              profile={profile}
              businessName={businessName}
              logoUrl={logoUrl}
              reviewUrl={reviewUrl}
              forceExpanded
            />
          </div>
        </section>

        <aside className="space-y-4" data-testid="card-assembly-status">
          <StatusCard
            title="Public Experience"
            body={
              activeCampaign
                ? `${activeCampaign.title} · ${activeCampaign.status}`
                : "No active Campaign on Tap Points — Card is the default hub."
            }
            tone={activeCampaign ? "ok" : "warn"}
            href="/dashboard/experiences"
          />
          <StatusCard
            title="Persistent utilities"
            body={utilitySummary}
            tone={supportConnected ? "ok" : "warn"}
            href="/dashboard/card/edit"
            testId="card-assembly-utilities"
          />
          <StatusCard
            title="Tap Points"
            body={
              tapPointCount > 0
                ? `${tapPointCount} active assignment(s)`
                : "Assign a Campaign or Card experience to a Tap Point."
            }
            tone={tapPointCount > 0 ? "ok" : "warn"}
            href="/dashboard/tap-points"
          />
          <StatusCard
            title="Publish / deploy"
            body={
              retired
                ? "Card retired — not the active public hub."
                : "Brand Kit Card is the living public hub (Studio publish, not Railway)."
            }
            tone={retired ? "warn" : "ok"}
          />
        </aside>
      </div>

      {(readinessNotes.length > 0 || nextActions.length > 0) ? (
        <section
          className="rounded-xl border border-white/10 bg-[#080d18] p-4"
          data-testid="card-assembly-readiness"
        >
          <h2 className="text-sm font-semibold text-white">Needs attention</h2>
          {readinessNotes.length > 0 ? (
            <ul className="mt-2 space-y-1.5">
              {readinessNotes.map((n) => (
                <li key={n} className="flex gap-2 text-sm text-amber-100/90">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden />
                  {n}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 flex items-center gap-2 text-sm text-emerald-200/90">
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              No blocking readiness issues on this Card.
            </p>
          )}
          {nextActions.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {nextActions.map((a) => (
                <Link
                  key={a.href + a.label}
                  href={a.href}
                  className={cn(
                    "inline-flex min-h-9 items-center rounded-md px-3 py-1.5 text-xs font-medium",
                    a.primary
                      ? "bg-primary text-primary-foreground"
                      : "border border-white/15 text-white/80 hover:bg-white/5"
                  )}
                >
                  {a.label}
                </Link>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      <CardFuseBoxPanel connections={connections} className="!mt-0" />

      <WhereUsedPanel
        title="Where this Tap Card appears"
        emptyLabel="No CONTACT_VCARD / digital_card campaigns currently reference this card."
        hits={whereUsedHits}
        testId="card-where-used"
      />
    </div>
  );
}

function StatusCard({
  title,
  body,
  tone,
  href,
  testId,
}: {
  title: string;
  body: string;
  tone: "ok" | "warn" | "neutral";
  href?: string;
  testId?: string;
}) {
  const Icon = tone === "ok" ? CheckCircle2 : tone === "warn" ? CircleDashed : CircleDashed;
  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/45">{title}</p>
        <Icon
          className={cn(
            "h-4 w-4 shrink-0",
            tone === "ok" ? "text-emerald-400" : "text-amber-400/80"
          )}
          aria-hidden
        />
      </div>
      <p className="mt-1.5 text-sm leading-snug text-white/80">{body}</p>
    </>
  );
  const className =
    "block rounded-lg border border-white/10 bg-[#0a1020] p-3 transition hover:border-white/20";
  if (href) {
    return (
      <Link href={href} className={className} data-testid={testId}>
        {content}
      </Link>
    );
  }
  return (
    <div className={className} data-testid={testId}>
      {content}
    </div>
  );
}
