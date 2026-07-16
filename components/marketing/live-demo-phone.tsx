"use client";

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { CampaignPageRenderer } from "@/components/tap/campaign-renderer";
import { TapConnectCard } from "@/components/tap/tap-connect-card";
import type { ContentBlock } from "@/lib/types/campaign";
import { nanoid } from "nanoid";
import { TAP_CONNECT_LOGO } from "@/lib/brand/assets";
import {
  defaultTapConnectCard,
  type TapConnectCardConfig,
} from "@/lib/brand/tap-card";
import type { BrandContactProfile } from "@/lib/brand/contact-profile";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

type DemoMode = "card" | "offer" | "product" | "review";

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
    {
      id: nanoid(6),
      type: "button_group",
      order: 4,
      enabled: true,
      label: "Actions",
      data: {
        layout: "grid_2",
        buttons: [
          {
            id: nanoid(4),
            label: "Call",
            url: "tel:+15551234567",
            style: "outline",
            icon: "phone",
            card: true,
            fullWidth: true,
          },
          {
            id: nanoid(4),
            label: "Directions",
            url: "https://maps.google.com/?q=Orlando+FL",
            style: "outline",
            icon: "map",
            card: true,
            fullWidth: true,
          },
        ],
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
        headline: "Product Story",
        subheadline: "Shelf tag → video, details, and buy link.",
        alignment: "center",
      },
    },
    {
      id: nanoid(6),
      type: "rich_text",
      order: 1,
      enabled: true,
      label: "Story",
      data: {
        body: "Tap a product disc on the shelf. Customers see the story, specs, and a CTA — without waiting for staff.",
      },
    },
    {
      id: nanoid(6),
      type: "product_details",
      order: 2,
      enabled: true,
      label: "Details",
      data: {
        name: "Signature Blend",
        price: "Limited drop",
        description: "Small-batch · in-store pickup · tap the shelf disc for the full story.",
        features: ["Origin story", "How to use", "Pairing ideas"],
      },
    },
    {
      id: nanoid(6),
      type: "button_group",
      order: 3,
      enabled: true,
      label: "Actions",
      data: {
        layout: "stack",
        buttons: [
          {
            id: nanoid(4),
            label: "Shop this product",
            url: "https://tapthemagic.com",
            style: "primary",
            icon: "shop",
            card: true,
            fullWidth: true,
          },
        ],
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
        headline: "Loved your visit?",
        subheadline: "Review station + contact collector in one tap.",
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

type DemoPayload = {
  published?: boolean;
  businessName?: string;
  logoUrl?: string | null;
  reviewUrl?: string | null;
  profile?: BrandContactProfile;
  tapCard?: TapConnectCardConfig;
  contentBlocks?: ContentBlock[];
};

const MODES: { id: DemoMode; label: string }[] = [
  { id: "card", label: "Tap Card" },
  { id: "offer", label: "Special Offer" },
  { id: "product", label: "Product Story" },
  { id: "review", label: "Contact Collector" },
];

export function LiveDemoPhone({
  className = "",
  framed = true,
}: {
  className?: string;
  /** Confines demo in fixed-height scrollable frame (landing requirement) */
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
        if (!cancelled) setDemo({ published: false });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const profile = demo?.profile ?? FALLBACK_PROFILE;
  const businessName = demo?.businessName ?? "Demo Studio";
  const logoUrl = demo?.logoUrl ?? TAP_CONNECT_LOGO;
  const tapCard =
    demo?.tapCard ??
    defaultTapConnectCard({
      businessName,
      profile,
      logoUrl,
      accentColor: "#d6a84f",
      reviewUrl: demo?.reviewUrl,
    });

  const campaignBlocks =
    mode === "offer"
      ? Array.isArray(demo?.contentBlocks) && demo.contentBlocks.length
        ? demo.contentBlocks
        : offerBlocks
      : mode === "product"
        ? productBlocks
        : reviewBlocks;

  const phoneInner: ReactNode =
    mode === "card" ? (
      <div
        className="tap-page min-h-full px-3 pb-8 pt-4"
        style={
          {
            "--tap-primary": DEMO_THEME.primaryColor,
            "--tap-secondary": DEMO_THEME.secondaryColor,
            "--tap-bg": DEMO_THEME.backgroundColor,
            "--tap-text": DEMO_THEME.textColor,
            background: "#1a1a1a",
            color: DEMO_THEME.textColor,
          } as CSSProperties
        }
      >
        <TapConnectCard
          config={tapCard}
          profile={profile}
          businessName={businessName}
          logoUrl={logoUrl}
          reviewUrl={demo?.reviewUrl}
          forceExpanded
        />
      </div>
    ) : (
      <CampaignPageRenderer
        blocks={campaignBlocks}
        theme={DEMO_THEME}
        campaignId="demo"
        deviceSlotId="demo"
        businessId="demo"
        businessName={businessName}
        previewMode
        logoUrl={logoUrl}
        contactProfile={profile}
        reviewUrl={demo?.reviewUrl}
      />
    );

  const phone = (
    <div className="builder-phone mx-auto max-w-[360px]">
      <div className="builder-phone-notch" />
      <div className="builder-phone-screen">{phoneInner}</div>
    </div>
  );

  return (
    <div className={className}>
      <div className="mb-4 flex flex-wrap justify-center gap-2">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMode(m.id)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-semibold transition",
              mode === m.id
                ? "bg-[var(--lp-gold,#d6a84f)] text-[#0b0f19] shadow-[0_0_20px_rgba(214,168,79,0.35)]"
                : "border border-white/10 bg-white/5 text-slate-300 hover:border-[rgba(214,168,79,0.45)]"
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      {demo?.published ? (
        <p className="mb-2 text-center text-[10px] uppercase tracking-[0.18em] text-[var(--lp-signal,#72ff8a)]">
          Live admin demo · {businessName}
        </p>
      ) : null}

      {framed ? (
        <div className="lp-demo-frame">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 px-4 py-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--lp-gold-bright,#f3c96b)]">
              <span className="lp-live-dot" aria-hidden />
              Live Demo
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-[rgba(214,168,79,0.4)] bg-[rgba(214,168,79,0.12)] px-2.5 py-0.5 text-[10px] font-semibold text-[var(--lp-gold-bright,#f3c96b)]">
                {MODES.find((m) => m.id === mode)?.label}
              </span>
              <p className="text-[11px] text-slate-400">Scroll inside</p>
            </div>
          </div>
          <div className="lp-demo-scroll px-3 py-4 sm:px-6">{phone}</div>
        </div>
      ) : (
        phone
      )}

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <a href="#demo" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Open Full Demo
        </a>
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
    </div>
  );
}
