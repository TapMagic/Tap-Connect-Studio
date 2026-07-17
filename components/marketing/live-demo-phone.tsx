"use client";

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { CampaignPageRenderer } from "@/components/tap/campaign-renderer";
import { TapConnectCard } from "@/components/tap/tap-connect-card";
import type { ContentBlock } from "@/lib/types/campaign";
import { nanoid } from "nanoid";
import {
  defaultTapConnectCard,
  type TapConnectCardConfig,
} from "@/lib/brand/tap-card";
import type { BrandContactProfile } from "@/lib/brand/contact-profile";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  LANDING_DEMO_MODE_META,
  type LandingDemoMode,
} from "@/lib/marketing/landing-demo-types";

const DEMO_THEME = {
  primaryColor: "#d6a84f",
  secondaryColor: "#72ff8a",
  backgroundColor: "#0b0f19",
  textColor: "#f8fafc",
};

const FALLBACK_PROFILE: BrandContactProfile = {
  displayName: "Alex Rivera",
  jobTitle: "Owner · Demo Studio",
  organization: "Demo Studio",
  phone: "+1 (555) 123-4567",
  email: "alex@demo.studio",
  website: "https://tapthemagic.com",
  address: "Orlando, FL",
  socials: {
    instagram: "https://instagram.com/",
    facebook: "https://facebook.com/",
    linkedin: "https://linkedin.com/",
  },
};

type DemoMode = LandingDemoMode;

function buildOfferBlocks(): ContentBlock[] {
  return [
    {
      id: nanoid(6),
      type: "headline",
      order: 0,
      enabled: true,
      label: "Headline",
      data: {
        headline: "VIP 15% Off Denim",
        subheadline: "Wed–Thu · same Tap Device, scheduled offer.",
        alignment: "center",
      },
    },
    {
      id: nanoid(6),
      type: "banner",
      order: 1,
      enabled: true,
      label: "Banner",
      data: {
        text: "Weekly Store Promotions · rotates by day/time",
        backgroundColor: "#d6a84f",
        textColor: "#0b0f19",
      },
    },
    {
      id: nanoid(6),
      type: "email_capture",
      order: 2,
      enabled: true,
      label: "Capture",
      data: {
        headline: "Unlock your VIP code",
        description: "Enter your email — we'll send the offer & notify the owner.",
        buttonLabel: "Get my offer",
        fields: ["name", "email"],
        successMessage: "You're in — check your email for the code.",
      },
    },
    {
      id: nanoid(6),
      type: "offer_coupon",
      order: 3,
      enabled: true,
      label: "Offer",
      data: {
        title: "VIP Denim",
        description: "Show this in store this week.",
        code: "DENIM15",
        lockedUntilContact: true,
      },
    },
  ];
}

function buildProductBlocks(): ContentBlock[] {
  return [
    {
      id: nanoid(6),
      type: "headline",
      order: 0,
      enabled: true,
      label: "Headline",
      data: {
        headline: "Heritage Leather Tote",
        subheadline: "Full-grain · hand-finished · built to last.",
        alignment: "center",
      },
    },
    {
      id: nanoid(6),
      type: "product_details",
      order: 1,
      enabled: true,
      label: "Details",
      data: {
        name: "Heritage Leather Tote",
        price: "$189",
        description:
          "Tap the shelf tag to open the product story, specs, care tips, and a claimable intro offer.",
        features: ["Full-grain leather", "14 × 11 × 5 in", "Made in USA"],
      },
    },
    {
      id: nanoid(6),
      type: "offer_coupon",
      order: 2,
      enabled: true,
      label: "Offer",
      data: {
        title: "First tote perk",
        description: "10% off your first tote this month.",
        code: "TOTE10",
        lockedUntilContact: false,
      },
    },
  ];
}

function buildReviewBlocks(): ContentBlock[] {
  return [
    {
      id: nanoid(6),
      type: "headline",
      order: 0,
      enabled: true,
      label: "Headline",
      data: {
        headline: "How was your visit?",
        subheadline: "Leave a review — then grab a thank-you offer.",
        alignment: "center",
      },
    },
    {
      id: nanoid(6),
      type: "email_capture",
      order: 1,
      enabled: true,
      label: "Capture",
      data: {
        headline: "Join the list",
        description: "Get a thank-you offer after you leave a review.",
        buttonLabel: "Save my contact",
        fields: ["name", "email", "phone"],
        successMessage: "Thanks — check your email for a thank-you offer.",
      },
    },
    {
      id: nanoid(6),
      type: "google_review",
      order: 2,
      enabled: true,
      label: "Review",
      data: {
        headline: "Leave a Google review",
        description: "A 30-second review helps neighbors find us.",
        reviewUrl: "https://g.page/r/",
        buttonLabel: "Open Google Reviews",
        badgeStyle: "google_g",
      },
    },
  ];
}

type ModePayload = {
  mode: DemoMode;
  label: string;
  description: string;
  enabled: boolean;
  published: boolean;
  businessName: string;
  showLogo: boolean;
  logoUrl: string | null;
  reviewUrl: string | null;
  profile?: BrandContactProfile;
  tapCard?: TapConnectCardConfig;
  theme?: Record<string, unknown>;
  contentBlocks?: ContentBlock[];
  campaignTitle?: string | null;
};

type DemoPayload = {
  published?: boolean;
  modes?: ModePayload[];
};

const MODE_ORDER: DemoMode[] = ["card", "offer", "product", "review"];

export function LiveDemoPhone({
  className = "",
  framed = true,
}: {
  className?: string;
  framed?: boolean;
}) {
  const [mode, setMode] = useState<DemoMode>("card");
  const [demo, setDemo] = useState<DemoPayload | null>(null);
  const offerBlocks = useMemo(() => buildOfferBlocks(), []);
  const productBlocks = useMemo(() => buildProductBlocks(), []);
  const reviewBlocks = useMemo(() => buildReviewBlocks(), []);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/public/landing-demo")
      .then((r) => r.json())
      .then((data: DemoPayload) => {
        if (!cancelled) setDemo(data);
      })
      .catch(() => {
        if (!cancelled) setDemo({ published: false, modes: [] });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const modesUi = MODE_ORDER.map((id) => {
    const fromApi = demo?.modes?.find((m) => m.mode === id);
    const meta = LANDING_DEMO_MODE_META[id];
    return {
      id,
      label: fromApi?.label ?? meta.label,
      description: fromApi?.description ?? meta.description,
      enabled: fromApi?.enabled !== false,
    };
  }).filter((m) => m.enabled);

  const activeModeId = modesUi.some((m) => m.id === mode) ? mode : modesUi[0]?.id ?? "card";
  const activeMeta = modesUi.find((m) => m.id === activeModeId) ?? modesUi[0];
  const activePayload = demo?.modes?.find((m) => m.mode === activeModeId);

  const profile = activePayload?.profile ?? FALLBACK_PROFILE;
  const businessName = activePayload?.businessName ?? "Demo Studio";
  const showLogo = activePayload?.showLogo !== false;
  const logoUrl = showLogo ? activePayload?.logoUrl ?? null : null;

  const tapCard =
    activePayload?.tapCard ??
    defaultTapConnectCard({
      businessName,
      profile,
      logoUrl: logoUrl ?? undefined,
      accentColor: "#d6a84f",
      reviewUrl: activePayload?.reviewUrl,
    });

  const fallbackBlocks =
    activeModeId === "offer"
      ? offerBlocks
      : activeModeId === "product"
        ? productBlocks
        : reviewBlocks;

  const campaignBlocks =
    Array.isArray(activePayload?.contentBlocks) && activePayload.contentBlocks.length
      ? activePayload.contentBlocks
      : fallbackBlocks;

  const theme = {
    ...DEMO_THEME,
    ...(activePayload?.theme ?? {}),
    showPageLogo: showLogo && Boolean(logoUrl),
  };

  const phoneInner: ReactNode =
    activeModeId === "card" ? (
      <div
        className="tap-page min-h-full px-3 pb-8 pt-4"
        style={
          {
            "--tap-primary": String(theme.primaryColor ?? DEMO_THEME.primaryColor),
            "--tap-secondary": String(theme.secondaryColor ?? DEMO_THEME.secondaryColor),
            "--tap-bg": String(theme.backgroundColor ?? DEMO_THEME.backgroundColor),
            "--tap-text": String(theme.textColor ?? DEMO_THEME.textColor),
            background: "#1a1a1a",
            color: String(theme.textColor ?? DEMO_THEME.textColor),
          } as CSSProperties
        }
      >
        <TapConnectCard
          config={tapCard}
          profile={profile}
          businessName={businessName}
          logoUrl={logoUrl}
          reviewUrl={activePayload?.reviewUrl}
          forceExpanded
        />
      </div>
    ) : (
      <CampaignPageRenderer
        blocks={campaignBlocks}
        theme={theme}
        campaignId="demo"
        deviceSlotId="demo"
        businessId="demo"
        businessName={businessName}
        previewMode
        logoUrl={logoUrl}
        contactProfile={profile}
        reviewUrl={activePayload?.reviewUrl}
      />
    );

  const phone = (
    <div className="builder-phone mx-auto w-full max-w-[300px] sm:max-w-[320px]">
      <div className="builder-phone-notch" />
      <div className="builder-phone-screen">{phoneInner}</div>
    </div>
  );

  const scenarioPicker = (
    <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-1">
      {modesUi.map((m) => {
        const selected = activeModeId === m.id;
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => setMode(m.id)}
            aria-pressed={selected}
            className={cn("lp-demo-scenario text-left", selected && "lp-demo-scenario-active")}
          >
            <span className="block text-sm font-semibold text-white">{m.label}</span>
            <span className="mt-1 block text-xs leading-5 text-slate-400">{m.description}</span>
          </button>
        );
      })}
    </div>
  );

  const ctas = (
    <div className="flex flex-wrap gap-2">
      <Link href="/sign-up" className={cn(buttonVariants({ size: "sm" }))}>
        Build Your First Campaign
      </Link>
      <Link
        href="/dashboard"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-slate-300")}
      >
        See Dashboard
      </Link>
    </div>
  );

  if (framed) {
    return (
      <div
        className={cn(
          "grid items-start gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(280px,360px)] lg:gap-12",
          className
        )}
      >
        <div className="space-y-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--lp-gold,#d6a84f)]">
              Live demo
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Same campaign engine customers use inside Studio.
            </h2>
            <p className="mt-3 max-w-xl text-base leading-7 text-slate-300">
              Pick a journey on the left. The phone updates instantly — scroll inside the device to
              explore without stretching the page.
            </p>
          </div>

          {activePayload?.published ? (
            <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--lp-signal,#72ff8a)]">
              Live admin demo · {businessName}
              {activePayload.campaignTitle ? ` · ${activePayload.campaignTitle}` : ""}
            </p>
          ) : null}

          {scenarioPicker}
          {ctas}
        </div>

        <div className="lp-demo-frame mx-auto w-full max-w-[360px] lg:mx-0 lg:max-w-none">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/8 px-3 py-2.5 sm:px-4">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--lp-gold-bright,#f3c96b)]">
              <span className="lp-live-dot" aria-hidden />
              Preview
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-[rgba(214,168,79,0.4)] bg-[rgba(214,168,79,0.12)] px-2.5 py-0.5 text-[10px] font-semibold text-[var(--lp-gold-bright,#f3c96b)]">
                {activeMeta?.label}
              </span>
              <p className="text-[11px] text-slate-400">Scroll inside</p>
            </div>
          </div>
          <div className="lp-demo-scroll px-3 py-3 sm:px-4">{phone}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="mb-4 flex flex-wrap justify-center gap-2">
        {modesUi.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMode(m.id)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-semibold transition",
              activeModeId === m.id
                ? "bg-[var(--lp-gold,#d6a84f)] text-[#0b0f19] shadow-[0_0_20px_rgba(214,168,79,0.35)]"
                : "border border-white/10 bg-white/5 text-slate-300 hover:border-[rgba(214,168,79,0.45)]"
            )}
          >
            {m.label}
          </button>
        ))}
      </div>
      {phone}
      <div className="mt-4 flex flex-wrap justify-center gap-2">{ctas}</div>
    </div>
  );
}
