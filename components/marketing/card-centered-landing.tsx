"use client";

import Link from "next/link";
import Image from "next/image";
import { Show } from "@clerk/nextjs";
import { ArrowRight } from "lucide-react";
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { AuthLinks } from "@/components/auth/auth-controls";
import { TapConnectLogo } from "@/components/brand/tap-connect-logo";
import { PoweredByTapTheMagic } from "@/components/brand/powered-by";
import { StudioAssembly } from "@/components/fusion/studio-assembly/studio-assembly";
import { TapConnectIcon } from "@/components/fusion/icons/tapconnect-icons";
import { IntegrationTicker } from "@/components/marketing/integration-ticker";
import { ProductExplorer } from "@/components/marketing/product-explorer";
import {
  TapConnectStudioSelector,
  type ProductSelectorMode,
} from "@/components/marketing/tapconnect-studio-selector";
import { StaticPlatformMap } from "@/components/marketing/static-platform-map";
import {
  demoCardSnapshot,
  isAssemblyActive,
  trackAssemblyEvent,
  type AssemblyPhase,
} from "@/lib/fusion/studio-assembly";
import {
  AUTOPILOT_SECTION,
  FINAL_CTA,
  INTEGRATIONS_SECTION,
  LANDING_HERO,
  OPERATING_IDEAS,
  TAPPROOF_SECTION,
  USE_CASES,
} from "@/lib/marketing/landing-card-centered";
import { DEEP_DIVES, TIER_CARD_VIEWS } from "@/lib/marketing/landing-deep-dives";
import {
  SIBLING_PRODUCTS,
  siblingProductHref,
} from "@/lib/marketing/offer-catalog";
import { MATURITY_GROUP_META } from "@/lib/fusion/studio/integration-maturity";
import { ZONE_TOKENS, type StudioZoneId } from "@/lib/fusion/studio/zone-tokens";
import { TAP_THE_MAGIC_LOGO } from "@/lib/brand/assets";
import { isClerkClientConfigured } from "@/lib/utils/clerk-client";
import { cn } from "@/lib/utils";
import type { TapConnectIconId } from "@/lib/fusion/icons/registry";
import "./card-centered-landing.css";
import "./landing-material.css";

/** Sets --tc-edge / --tc-bloom for the shared `tc-surface` material system from a Studio zone. */
function zoneSurfaceStyle(zone: StudioZoneId): CSSProperties {
  const tokens = ZONE_TOKENS[zone];
  return {
    "--tc-edge": tokens.neonEdge,
    "--tc-bloom": tokens.bloom,
  } as CSSProperties;
}

/** Warm, non-zone atmospheres for sibling-product cross-sell — never Studio green/zone colors. */
const PET_FINDER_ATMOSPHERE = {
  "--tc-edge": "oklch(0.74 0.14 55 / 0.55)",
  "--tc-bloom": "oklch(0.6 0.13 55 / 0.32)",
} as CSSProperties;

const TAPSTAY_ATMOSPHERE = {
  "--tc-edge": "oklch(0.72 0.1 195 / 0.5)",
  "--tc-bloom": "oklch(0.58 0.1 195 / 0.3)",
} as CSSProperties;

const LANDING_ICON_NAV: Array<{
  id: string;
  label: string;
  href: string;
  icon: TapConnectIconId;
  zone: StudioZoneId;
}> = [
  { id: "home", label: "Home", href: "#interactive-map", icon: "home", zone: "home" },
  { id: "experiences", label: "Experiences", href: "#operating", icon: "campaigns", zone: "card" },
  { id: "tap-points", label: "Tap Points", href: "#tappoints-campaigns", icon: "tap_points", zone: "tap_points" },
  { id: "audience", label: "Audience", href: "#tapsave-relationships", icon: "audience", zone: "audience" },
  { id: "insights", label: "Insights", href: "#tapproof-deep", icon: "insights", zone: "insights" },
  { id: "assets", label: "Assets", href: "#assets-deep", icon: "assets", zone: "assets" },
  { id: "ask", label: "Ask TapConnect", href: "#autopilot-deep", icon: "autopilot", zone: "autopilot" },
  { id: "settings", label: "Settings", href: "#integrations", icon: "settings", zone: "settings" },
];

function revealFromPhase(phase: AssemblyPhase): "opening" | "pullback" | "settled" {
  if (
    phase === "complete" ||
    phase === "skipped" ||
    phase === "icons_settle" ||
    phase === "idle"
  ) {
    return "settled";
  }
  if (phase === "pullback") return "pullback";
  return "opening";
}

function DeepDiveVisualBlock({
  sectionId,
  visual,
  zone,
  icon,
  visualHint,
}: {
  sectionId: string;
  visual: (typeof DEEP_DIVES)[number]["visual"];
  zone: StudioZoneId;
  icon: TapConnectIconId;
  visualHint: string;
}) {
  const atmosphereClass = ZONE_TOKENS[zone].atmosphereClass;
  const style = zoneSurfaceStyle(zone);
  if (visual.kind === "screenshot") {
    return (
      <figure
        className={cn("landing-deep-shot tc-surface tc-surface-l2", atmosphereClass)}
        style={style}
        data-testid={`deep-dive-visual-${sectionId}`}
        data-visual-kind="screenshot"
        data-zone={zone}
      >
        <Image
          src={visual.src}
          alt={visual.alt}
          width={visual.width}
          height={visual.height}
          className="h-auto w-full object-cover object-top"
          sizes="(max-width: 1024px) 100vw, 560px"
          loading="lazy"
        />
        <figcaption className="border-t border-white/10 px-3 py-2 text-[11px] text-white/60">
          {visualHint} — scrubbed seed/demo capture
        </figcaption>
      </figure>
    );
  }
  return (
    <div
      className={cn("tc-surface tc-surface-l2 rounded-2xl p-6", atmosphereClass)}
      style={style}
      data-testid={`deep-dive-visual-${sectionId}`}
      data-visual-kind="illustration"
      data-zone={zone}
    >
      <div className="flex items-start gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-xl border border-white/15 bg-black/30">
          <TapConnectIcon id={icon} className="h-6 w-6" decorative />
        </span>
        <div>
          <p className="text-sm font-medium text-white">{visualHint}</p>
          <p className="mt-2 text-xs text-white/60">{visual.reason}</p>
        </div>
      </div>
    </div>
  );
}

function MiniVerticalCard({ tier }: { tier: (typeof TIER_CARD_VIEWS)[number] }) {
  return (
    <article
      className="tc-surface tc-surface-l2 tc-interactive flex flex-col gap-5 p-5 sm:flex-row sm:items-start"
      data-testid={`tier-card-${tier.id}`}
      data-zone="card"
      style={zoneSurfaceStyle("card")}
    >
      <div
        className="mx-auto flex aspect-[3/4] w-full max-w-[9.5rem] shrink-0 flex-col justify-between rounded-2xl border border-white/15 bg-gradient-to-b from-white/10 via-black/20 to-black/50 p-3.5 sm:mx-0"
        aria-hidden
        data-testid="tier-mini-card"
      >
        <TapConnectIcon id="card" className="h-6 w-6 text-white/85" decorative />
        <div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-white/55">TapConnect</p>
          <p className="mt-1 text-sm font-semibold leading-tight text-white">{tier.name}</p>
        </div>
      </div>
      <div className="flex flex-1 flex-col">
        <h3 className="text-xl font-semibold">{tier.name}</h3>
        <p className="mt-2 text-sm text-white/70">{tier.whoFor}</p>
        <p className="mt-2 text-sm text-white/80">{tier.outcome}</p>
        <ul
          className="mt-4 flex flex-wrap gap-2"
          aria-label={`${tier.name} capabilities`}
        >
          {tier.icons.map((id) => (
            <li
              key={id}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-white/15 px-2.5 text-[11px] text-white/80"
            >
              <TapConnectIcon id={id} className="h-3.5 w-3.5" decorative />
              {id.replaceAll("_", " ")}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-white/60">{tier.allowance}</p>
        <p className="mt-1 text-xs text-white/60">{tier.continuity}</p>
        <p className="mt-2 text-xs text-white/65">{tier.priceNote}</p>
        <Link
          href={tier.href}
          data-testid={`tier-cta-${tier.id}`}
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--studio-go)] px-4 text-sm font-semibold text-[var(--studio-go-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          {tier.ctaLabel}
        </Link>
      </div>
    </article>
  );
}

export function CardCenteredLanding() {
  const [selector, setSelector] = useState<ProductSelectorMode>("studio");
  const [assemblyPhase, setAssemblyPhase] = useState<AssemblyPhase>("idle");
  const [accelerateSignal, setAccelerateSignal] = useState(0);
  const [activeStageId, setActiveStageId] = useState<string>(
    LANDING_ICON_NAV[0]?.id ?? ""
  );
  const [activeDeepDiveId, setActiveDeepDiveId] = useState<string>(
    DEEP_DIVES[0]?.id ?? ""
  );
  const clerkConfigured = isClerkClientConfigured();
  const demoCard = demoCardSnapshot();
  const petHref = siblingProductHref(SIBLING_PRODUCTS.petFinder);
  const stayHref = siblingProductHref(SIBLING_PRODUCTS.tapStay);
  const reveal = revealFromPhase(assemblyPhase);
  const activeDeepDive = DEEP_DIVES.find((d) => d.id === activeDeepDiveId) ?? DEEP_DIVES[0];
  const markerCopy = activeDeepDive
    ? `${activeDeepDive.title} — ${activeDeepDive.cardSupport}`
    : "";

  const onPhaseChange = useCallback((phase: AssemblyPhase) => {
    setAssemblyPhase(phase);
  }, []);

  useEffect(() => {
    function onScroll() {
      if (!isAssemblyActive(assemblyPhase)) return;
      if (window.scrollY < 24) return;
      setAccelerateSignal((n) => n + 1);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [assemblyPhase]);

  // Story rail scroll-spy — highlights the stage whose target section is in view.
  useEffect(() => {
    if (typeof window === "undefined" || typeof IntersectionObserver === "undefined") return;
    const targets: Array<{ id: string; el: HTMLElement }> = [];
    for (const stage of LANDING_ICON_NAV) {
      const el = document.getElementById(stage.href.replace("#", ""));
      if (el) targets.push({ id: stage.id, el });
    }
    if (targets.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length === 0) return;
        const top = visible.sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        const match = targets.find((t) => t.el === top.target);
        if (match) setActiveStageId(match.id);
      },
      { rootMargin: "-10% 0px -70% 0px", threshold: [0.1, 0.3, 0.6] }
    );
    targets.forEach((t) => observer.observe(t.el));
    return () => observer.disconnect();
  }, []);

  // Sticky Card marker — updates copy as each deep dive scrolls into view.
  useEffect(() => {
    if (typeof window === "undefined" || typeof IntersectionObserver === "undefined") return;
    const sections = DEEP_DIVES.map((d) => document.getElementById(d.id)).filter(
      (el): el is HTMLElement => Boolean(el)
    );
    if (sections.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length === 0) return;
        const top = visible.sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (top.target.id) setActiveDeepDiveId(top.target.id);
      },
      { rootMargin: "-20% 0px -55% 0px", threshold: [0.1, 0.25, 0.5, 0.75] }
    );
    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  function selectFromMap(id: TapConnectIconId) {
    if (typeof window !== "undefined") {
      window.location.hash = `explorer-${id === "campaigns" ? "campaigns" : id}`;
    }
  }

  return (
    <div
      className="landing-root min-h-screen bg-[oklch(0.11_0.02_260)] text-white"
      data-testid="card-centered-landing"
      data-landing-reveal={reveal}
      data-assembly-phase={assemblyPhase}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-black"
      >
        Skip to content
      </a>

      <nav
        className="tc-story-rail"
        data-testid="landing-story-rail"
        aria-label="TapConnect Studio story navigation"
      >
        {LANDING_ICON_NAV.map((stage) => {
          const zone = ZONE_TOKENS[stage.zone];
          const active = activeStageId === stage.id;
          return (
            <a
              key={stage.id}
              href={stage.href}
              aria-label={stage.label}
              data-testid={`landing-story-rail-${stage.id}`}
              data-active={active ? "true" : "false"}
              style={{ "--rail-zone": zone.railAccent } as CSSProperties}
              onClick={() => setActiveStageId(stage.id)}
            >
              <span className="tc-story-rail-icon" aria-hidden>
                <TapConnectIcon id={stage.icon} decorative />
              </span>
              <span className="tc-story-rail-label">{stage.label}</span>
            </a>
          );
        })}
      </nav>

      <header className="landing-chrome border-b border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <TapConnectLogo variant="mark" priority imgClassName="h-10 w-10" />
            <div>
              <p className="text-sm font-semibold tracking-tight">TapConnect</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/65">
                {LANDING_HERO.poweredBy}
              </p>
            </div>
          </div>
          <nav
            className="hidden items-center gap-4 text-sm text-white/70 md:flex"
            aria-label="Landing"
          >
            <a
              href="#platform-map"
              className="hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--studio-go)]"
            >
              Platform map
            </a>
            <a
              href="#explorer"
              className="hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--studio-go)]"
            >
              Explore
            </a>
            <a
              href="#offers"
              className="hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--studio-go)]"
            >
              Offers
            </a>
            <a
              href="#family"
              className="hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--studio-go)]"
            >
              Tap The Magic
            </a>
            <AuthLinks />
          </nav>
          <div className="md:hidden">
            <AuthLinks />
          </div>
        </div>
      </header>

      <main id="main">
        {/* A. CINEMATIC HERO — Assembly is the continuous product map */}
        <section
          className="relative border-b border-white/10"
          aria-labelledby="hero-heading"
          data-testid="landing-hero"
        >
          <div className="landing-hero-grid py-4 lg:py-8">
            <div
              className="landing-hero-copy landing-chrome space-y-4"
              data-testid="landing-hero-copy"
            >
              <TapConnectLogo variant="mark" imgClassName="h-12 w-12" />
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/65">
                {LANDING_HERO.poweredBy}
              </p>
              <h1
                id="hero-heading"
                className="text-4xl font-semibold tracking-tight text-white sm:text-5xl"
              >
                {LANDING_HERO.headline}
              </h1>
              <p className="max-w-xl text-base text-white/70 sm:text-lg">
                {LANDING_HERO.subhead}
              </p>
              <p className="max-w-xl text-sm text-white/65">{LANDING_HERO.note}</p>
              <div className="flex flex-col gap-3 sm:flex-row">
                {clerkConfigured ? (
                  <>
                    <Show when="signed-out">
                      <Link
                        href="/offer/tapconnect"
                        data-testid="landing-primary-cta"
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--studio-go)] px-5 text-sm font-semibold text-[var(--studio-go-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                        onClick={() =>
                          trackAssemblyEvent({ event: "landing_primary_cta" })
                        }
                      >
                        {LANDING_HERO.primaryCta}
                        <ArrowRight className="h-4 w-4" aria-hidden />
                      </Link>
                    </Show>
                    <Show when="signed-in">
                      <Link
                        href="/dashboard"
                        data-testid="landing-primary-cta"
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--studio-go)] px-5 text-sm font-semibold text-[var(--studio-go-fg)]"
                        onClick={() =>
                          trackAssemblyEvent({ event: "landing_primary_cta" })
                        }
                      >
                        Open Studio
                        <ArrowRight className="h-4 w-4" aria-hidden />
                      </Link>
                    </Show>
                  </>
                ) : (
                  <Link
                    href="/offer/tapconnect"
                    data-testid="landing-primary-cta"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--studio-go)] px-5 text-sm font-semibold text-[var(--studio-go-fg)]"
                    onClick={() =>
                      trackAssemblyEvent({ event: "landing_primary_cta" })
                    }
                  >
                    {LANDING_HERO.primaryCta}
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                )}
                <a
                  href="#explorer"
                  data-testid="landing-secondary-cta"
                  className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/20 px-5 text-sm text-white/85 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--studio-go)]"
                  onClick={() =>
                    trackAssemblyEvent({ event: "landing_secondary_cta" })
                  }
                >
                  {LANDING_HERO.secondaryCta}
                </a>
              </div>
            </div>

            <div
              className="landing-assembly-shell tc-surface tc-surface-l1"
              id="interactive-map"
              data-testid="landing-assembly-shell"
              data-zone="card"
              style={zoneSurfaceStyle("card")}
            >
              <StudioAssembly
                mode="LANDING_FULL"
                capabilityScope={selector}
                card={demoCard}
                autoStart
                showReplay
                accelerateSignal={accelerateSignal}
                onPhaseChange={onPhaseChange}
                onCapabilitySelect={(id) => {
                  if (typeof window !== "undefined") {
                    window.location.hash = `explorer-${id}`;
                  }
                }}
              />
            </div>
          </div>
          <div
            className="landing-chrome sr-only"
            data-testid="landing-page-beneath"
            aria-hidden={reveal === "opening" ? true : undefined}
          >
            Page content rendered beneath the opening stage.
          </div>
        </section>

        {/* B. Static platform map — study companion; Assembly remains the interactive map */}
        <section
          id="platform-map"
          className="landing-chrome border-b border-white/10 py-14"
          aria-labelledby="platform-map-heading"
          data-testid="landing-static-map-section"
        >
          <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center">
            <div className="space-y-3">
              <h2 id="platform-map-heading" className="text-2xl font-semibold sm:text-3xl">
                The Card-centered platform map
              </h2>
              <p className="text-sm text-white/70">
                After the cinematic opening, the same Assembly settles above as the interactive
                product map. This companion diagram is for study: Card central, zone-colored
                icons, Integrations outward, Trust Fabric beneath.
              </p>
            </div>
            <div
              className="tc-surface tc-surface-l2 p-4"
              data-zone="card"
              style={zoneSurfaceStyle("card")}
            >
              <StaticPlatformMap mode={selector} onSelect={selectFromMap} />
            </div>
          </div>
        </section>

        {/* C. Explorer */}
        <section className="landing-chrome mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <div
            className="tc-surface tc-surface-l2 p-4 sm:p-6"
            data-zone="card"
            style={zoneSurfaceStyle("card")}
          >
            <ProductExplorer mode={selector} />
          </div>
        </section>

        {/* D. Operating ideas */}
        <section
          id="operating"
          className="landing-chrome border-y border-white/10 bg-white/[0.02] py-14"
          aria-labelledby="operating-heading"
          data-testid="operating-ideas"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 id="operating-heading" className="text-2xl font-semibold sm:text-3xl">
              Create · Connect · Keep · Operate · Prove
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-white/70">
              Five operating ideas in ordinary language — the system around one Card.
            </p>
            <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {OPERATING_IDEAS.map((idea, i) => (
                <li
                  key={idea.id}
                  className="rounded-xl border border-white/10 bg-black/20 p-4"
                  data-testid={`operating-${idea.id}`}
                >
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/70">
                    {String(i + 1).padStart(2, "0")}
                  </p>
                  <h3 className="mt-2 text-base font-semibold">{idea.title}</h3>
                  <p className="mt-2 text-sm text-white/70">{idea.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* E. Deep dives with real product screenshots */}
        <section
          id="deep-dives"
          className="landing-chrome mx-auto max-w-6xl space-y-16 px-4 py-16 sm:px-6"
          aria-label="Product deep dives"
          data-testid="landing-deep-dives"
        >
          {activeDeepDive ? (
            <div
              className="tc-card-marker"
              data-testid="landing-card-marker"
              data-zone={activeDeepDive.zone}
              style={zoneSurfaceStyle(activeDeepDive.zone)}
            >
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/55">
                Card relationship
              </p>
              <p className="mt-1 text-sm font-medium text-white">{markerCopy}</p>
            </div>
          ) : null}

          {DEEP_DIVES.map((section, index) => {
            const zone = ZONE_TOKENS[section.zone];
            const reverse = index % 2 === 1;
            return (
              <article
                key={section.id}
                id={section.id}
                className={cn(
                  "grid scroll-mt-40 gap-8 lg:grid-cols-2 lg:items-center",
                  reverse && "lg:[&>*:first-child]:order-2"
                )}
                data-testid={`deep-dive-${section.id}`}
              >
                <div className="space-y-3">
                  <p
                    className="inline-flex min-h-11 items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em]"
                    style={{ color: zone.labelColor }}
                  >
                    <TapConnectIcon id={section.icon} className="h-4 w-4" decorative />
                    {zone.label}
                  </p>
                  {section.id === "card-brand" ? (
                    <span
                      data-testid="assets-zone-chip"
                      className="tc-interactive ml-2 inline-flex min-h-11 items-center gap-2 rounded-full border px-3 text-[11px] font-medium uppercase tracking-[0.14em]"
                      style={{
                        color: ZONE_TOKENS.assets.labelColor,
                        borderColor: ZONE_TOKENS.assets.mutedBorder,
                        ...zoneSurfaceStyle("assets"),
                      }}
                    >
                      <TapConnectIcon id="assets" className="h-3.5 w-3.5" decorative />
                      Assets — media &amp; creative library
                    </span>
                  ) : null}
                  <h2 className="text-2xl font-semibold sm:text-3xl">{section.title}</h2>
                  <p className="text-sm text-white/75">{section.what}</p>
                  <p className="text-sm text-white/70">
                    <span className="font-medium text-white">Card support: </span>
                    {section.cardSupport}
                  </p>
                  <p className="text-sm text-white/70">
                    <span className="font-medium text-white">Benefit: </span>
                    {section.benefit}
                  </p>
                  <ul className="space-y-1 text-sm text-white/70">
                    {section.functions.map((f) => (
                      <li key={f}>· {f}</li>
                    ))}
                  </ul>
                  <p className="text-xs text-white/60">{section.maturity}</p>
                  <a
                    href={section.ctaHref}
                    className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--studio-go)] px-4 text-sm font-semibold text-[var(--studio-go-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    {section.ctaLabel}
                  </a>
                </div>
                <div className="space-y-4">
                  <DeepDiveVisualBlock
                    sectionId={section.id}
                    visual={section.visual}
                    zone={section.zone}
                    icon={section.icon}
                    visualHint={section.visualHint}
                  />
                  {section.secondaryVisual ? (
                    <DeepDiveVisualBlock
                      sectionId={`${section.id}-secondary`}
                      visual={section.secondaryVisual}
                      zone={section.zone}
                      icon={section.icon}
                      visualHint={section.visualHint}
                    />
                  ) : null}
                </div>
              </article>
            );
          })}
        </section>

        {/* F. Selector */}
        <section className="landing-chrome mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <TapConnectStudioSelector value={selector} onChange={setSelector} />
        </section>

        {/* G. Tier / offer cards */}
        <section
          id="offers"
          className="landing-chrome border-y border-white/10 bg-white/[0.02] py-14"
          aria-labelledby="offers-heading"
          data-testid="landing-tier-cards"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 id="offers-heading" className="text-2xl font-semibold sm:text-3xl">
              Offer paths — without final pricing
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-white/70">
              Choose a path on a published TapConnect offer Card. Stripe only collects payment when
              configured — never as the storefront. Capacity and prices remain Owner decisions.
            </p>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {TIER_CARD_VIEWS.filter((t) =>
                selector === "tapconnect" ? t.id === "tapconnect" : true
              ).map((tier) => (
                <MiniVerticalCard key={tier.id} tier={tier} />
              ))}
            </div>
          </div>
        </section>

        {/* G2. Owned purchase journey — own the journey, delegate only the transaction */}
        <section
          id="purchase-journey"
          className="landing-chrome mx-auto max-w-6xl px-4 py-14 sm:px-6"
          aria-labelledby="purchase-journey-heading"
          data-testid="landing-purchase-journey"
        >
          <div
            className="tc-surface tc-surface-l2 p-6 sm:p-8"
            data-zone="card"
            style={zoneSurfaceStyle("card")}
          >
            <h2 id="purchase-journey-heading" className="text-2xl font-semibold sm:text-3xl">
              An owned purchase journey
            </h2>
            <p className="mt-3 max-w-3xl text-sm text-white/70">
              You stay inside TapConnect from the first tap to onboarding. Payment is the only
              step delegated — to Stripe, when it is production-configured. Landing CTAs never
              send you straight to a payment provider.
            </p>
            <ol
              className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
              aria-label="Purchase journey steps"
            >
              {[
                { n: "01", t: "Published offer Card", d: "Review the offer on a TapConnect-owned page — capabilities, terms, and billing choice." },
                { n: "02", t: "Secure checkout", d: "In this environment, checkout runs as an honestly labeled local simulation — no real charge." },
                { n: "03", t: "Return & verification", d: "You return to TapConnect. The session is verified server-side; cancel keeps your context." },
                { n: "04", t: "Confirmation & onboarding", d: "Confirmation leads into account claim and Studio Assembly reflecting your path." },
              ].map((step) => (
                <li
                  key={step.n}
                  className="rounded-xl border border-white/10 bg-black/20 p-4"
                  data-testid={`purchase-step-${step.n}`}
                >
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/60">
                    {step.n}
                  </p>
                  <h3 className="mt-2 text-base font-semibold">{step.t}</h3>
                  <p className="mt-2 text-sm text-white/70">{step.d}</p>
                </li>
              ))}
            </ol>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <Link
                href="/offer/tapconnect"
                data-testid="purchase-journey-cta"
                className="inline-flex min-h-11 items-center rounded-lg bg-[var(--studio-go)] px-5 text-sm font-semibold text-[var(--studio-go-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                Walk the journey
              </Link>
              <p className="text-xs text-white/60">
                Local checkout simulation — no live charges occur in this environment.
              </p>
            </div>
          </div>
        </section>

        {/* H. Integrations */}
        <section
          id="integrations"
          className="landing-chrome mx-auto max-w-6xl px-4 py-14 sm:px-6"
          aria-labelledby="integrations-heading"
          data-testid="integrations-section"
        >
          <h2 id="integrations-heading" className="text-2xl font-semibold sm:text-3xl">
            {INTEGRATIONS_SECTION.title}
          </h2>
          <p className="mt-3 max-w-3xl text-sm text-white/70">{INTEGRATIONS_SECTION.body}</p>
          <p className="mt-2 max-w-3xl text-sm text-white/65">{INTEGRATIONS_SECTION.honesty}</p>
          <div className="mt-6">
            <IntegrationTicker />
          </div>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(Object.keys(MATURITY_GROUP_META) as Array<keyof typeof MATURITY_GROUP_META>).map(
              (key) => (
                <li
                  key={key}
                  className="tc-surface tc-surface-l3 p-4"
                  data-testid={MATURITY_GROUP_META[key].testId}
                  data-zone="integrations"
                  style={zoneSurfaceStyle("integrations")}
                >
                  <h3 className="text-sm font-semibold">{MATURITY_GROUP_META[key].title}</h3>
                  <p className="mt-2 text-xs text-white/65">
                    {MATURITY_GROUP_META[key].description}
                  </p>
                </li>
              )
            )}
          </ul>
        </section>

        {/* I. Use cases */}
        <section
          id="use-cases"
          className="landing-chrome border-y border-white/10 bg-white/[0.02] py-14"
          data-testid="use-cases-section"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="text-2xl font-semibold sm:text-3xl">Two successful outcomes</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {USE_CASES.map((uc) => (
                <article
                  key={uc.id}
                  className="rounded-xl border border-white/10 p-5"
                  data-testid={`use-case-${uc.id}`}
                >
                  <h3 className="text-lg font-semibold">{uc.title}</h3>
                  <p className="mt-2 text-sm text-white/70">{uc.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* J. Autopilot */}
        <section
          id="autopilot"
          className="landing-chrome mx-auto max-w-6xl px-4 py-14 sm:px-6"
          data-testid="autopilot-section"
        >
          <div
            className="tc-surface tc-surface-l2 p-6 sm:p-8"
            data-zone="autopilot"
            style={zoneSurfaceStyle("autopilot")}
          >
            <h2 className="text-2xl font-semibold sm:text-3xl">{AUTOPILOT_SECTION.title}</h2>
            <p className="mt-3 max-w-3xl text-sm text-white/70">{AUTOPILOT_SECTION.body}</p>
          </div>
        </section>

        {/* K. TapProof */}
        <section
          id="tapproof"
          className="landing-chrome border-y border-white/10 bg-white/[0.02] py-14"
          data-testid="tapproof-section"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div
              className="tc-surface tc-surface-l2 p-6 sm:p-8"
              data-zone="insights"
              style={zoneSurfaceStyle("insights")}
            >
              <h2 className="text-2xl font-semibold sm:text-3xl">{TAPPROOF_SECTION.title}</h2>
              <p className="mt-3 max-w-3xl text-sm text-white/70">{TAPPROOF_SECTION.body}</p>
              <p
                className="mt-4 text-xs text-amber-100/90"
                data-testid="illustrative-metrics-note"
              >
                {TAPPROOF_SECTION.illustrativeNote}
              </p>
            </div>
          </div>
        </section>

        {/* L. Final CTA */}
        <section id="start" className="landing-chrome py-16" data-testid="final-cta">
          <div className="mx-auto max-w-3xl space-y-5 px-4 text-center sm:px-6">
            <div className="mx-auto w-fit rounded-2xl border border-white/15 px-8 py-6">
              <TapConnectIcon id="card" className="mx-auto h-10 w-10 text-white/85" decorative />
              <p className="mt-2 text-xl font-semibold">Your relationship hub</p>
            </div>
            <h2 className="text-3xl font-semibold tracking-tight">{FINAL_CTA.title}</h2>
            <p className="text-sm text-white/65">{FINAL_CTA.body}</p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/offer/tapconnect"
                className="inline-flex min-h-11 items-center rounded-lg bg-[var(--studio-go)] px-5 text-sm font-semibold text-[var(--studio-go-fg)]"
              >
                {FINAL_CTA.primaryCta}
              </Link>
              <Link
                href="/offer/studio"
                className="inline-flex min-h-11 items-center rounded-lg border border-white/20 px-5 text-sm text-white/85"
              >
                Explore Studio offer
              </Link>
            </div>
          </div>
        </section>

        {/* M. More from Tap The Magic — typographic sibling names (no invented logos) */}
        <section
          id="family"
          className="landing-chrome border-t border-white/10 bg-white/[0.02] py-14"
          aria-labelledby="family-heading"
          data-testid="landing-family-cross-sell"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <Image
                src={TAP_THE_MAGIC_LOGO}
                alt="Tap The Magic"
                width={140}
                height={48}
                className="h-8 w-auto object-contain"
                loading="lazy"
              />
              <h2 id="family-heading" className="text-2xl font-semibold sm:text-3xl">
                More from Tap The Magic
              </h2>
            </div>
            <p className="max-w-2xl text-sm text-white/65">
              Sibling products with their own owned journeys — not TapConnect pricing tiers. Official
              Pet Finder and TapStay logos are not present in this repository, so product names are
              shown typographically rather than with invented marks.
            </p>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <article
                className="tc-surface tc-surface-l2 p-5"
                data-testid="cross-sell-pet-finder"
                data-logo-status="typographic-missing-approved-asset"
                style={PET_FINDER_ATMOSPHERE}
              >
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/55">
                  Tap The Magic family
                </p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight">
                  {SIBLING_PRODUCTS.petFinder.name}
                </h3>
                <p className="mt-1 text-sm text-white/80">
                  {SIBLING_PRODUCTS.petFinder.concept}
                </p>
                <p className="mt-3 text-sm text-white/70">{SIBLING_PRODUCTS.petFinder.body}</p>
                <a
                  href={petHref}
                  data-testid="cross-sell-pet-finder-cta"
                  className="mt-5 inline-flex min-h-11 items-center text-sm font-medium text-[var(--studio-go)] underline-offset-4 hover:underline"
                  rel="noopener noreferrer"
                >
                  {SIBLING_PRODUCTS.petFinder.ctaLabel}
                </a>
              </article>
              <article
                className="tc-surface tc-surface-l2 p-5"
                data-testid="cross-sell-tapstay"
                data-logo-status="typographic-missing-approved-asset"
                style={TAPSTAY_ATMOSPHERE}
              >
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/55">
                  Tap The Magic family
                </p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight">
                  {SIBLING_PRODUCTS.tapStay.name}
                </h3>
                <p className="mt-1 text-sm text-white/80">
                  {SIBLING_PRODUCTS.tapStay.concept}
                </p>
                <p className="mt-3 text-sm text-white/70">{SIBLING_PRODUCTS.tapStay.body}</p>
                <a
                  href={stayHref}
                  data-testid="cross-sell-tapstay-cta"
                  className="mt-5 inline-flex min-h-11 items-center text-sm font-medium text-[var(--studio-go)] underline-offset-4 hover:underline"
                  rel="noopener noreferrer"
                >
                  {SIBLING_PRODUCTS.tapStay.ctaLabel}
                </a>
              </article>
            </div>
          </div>
        </section>
      </main>

      {/* N. Footer — honest non-links where routes do not exist */}
      <footer className="landing-chrome border-t border-white/10 py-10" data-testid="landing-footer">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 sm:px-6">
          <PoweredByTapTheMagic />
          <nav
            className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-white/70"
            aria-label="Product family"
          >
            <Link href="/" className="hover:text-white">
              TapConnect
            </Link>
            <Link href="/offer/studio" className="hover:text-white">
              TapConnect Studio
            </Link>
            <a href={petHref} className="hover:text-white" rel="noopener noreferrer">
              Tap Magic Pet Finder
            </a>
            <a href={stayHref} className="hover:text-white" rel="noopener noreferrer">
              TapStay
            </a>
            <a
              href="https://tapthemagic.com"
              className="hover:text-white"
              rel="noopener noreferrer"
            >
              Tap The Magic
            </a>
            <span className="text-white/55" data-testid="footer-privacy-unavailable">
              Privacy (page not published yet)
            </span>
            <span className="text-white/55" data-testid="footer-terms-unavailable">
              Terms (page not published yet)
            </span>
            <span className="text-white/55" data-testid="footer-accessibility-unavailable">
              Accessibility statement (not published yet)
            </span>
            <a href="mailto:info@tapthemagic.com" className="hover:text-white">
              Contact
            </a>
            <span className="text-white/55" data-testid="footer-support-unavailable">
              Support (use Contact until a support route ships)
            </span>
          </nav>
          <p className="text-center text-xs text-white/65">
            TapConnect is the Card. TapConnect Studio works around it. Sibling products keep their
            own accounts and journeys unless already unified elsewhere. Capability availability
            varies by plan.
          </p>
        </div>
      </footer>
    </div>
  );
}
