"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { CampaignPageRenderer } from "@/components/tap/campaign-renderer";
import { ContactCardSurface } from "@/components/tap/save-contact";
import type { ContentBlock } from "@/lib/types/campaign";
import { nanoid } from "nanoid";
import "@/app/t/tap.css";

const DEMO_THEME = {
  primaryColor: "#a3e635",
  secondaryColor: "#22d3ee",
  backgroundColor: "#0b0f19",
  textColor: "#f8fafc",
};

function buildOfferBlocks(): ContentBlock[] {
  return [
    {
      id: nanoid(6),
      type: "headline",
      order: 0,
      enabled: true,
      label: "Headline",
      data: {
        headline: "Spring Special — 20% Off",
        subheadline: "Tap once. Unlock the offer. Book today.",
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
        text: "Limited time · ends Sunday",
        backgroundColor: "#a3e635",
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
        headline: "Unlock your code",
        description: "Enter your email — we'll send the offer & keep you posted.",
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
        title: "Welcome offer",
        description: "Show this in store or use online.",
        code: "TAP20",
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
    {
      id: nanoid(6),
      type: "google_review",
      order: 5,
      enabled: true,
      label: "Review",
      data: {
        headline: "Loved your visit?",
        description: "A 30-second review helps neighbors find us.",
        reviewUrl: "https://g.page/r/",
        buttonLabel: "Leave a Google review",
        badgeStyle: "google_g",
      },
    },
  ];
}

export function LiveDemoPhone({ className = "" }: { className?: string }) {
  const [mode, setMode] = useState<"offer" | "card">("offer");
  const offerBlocks = useMemo(() => buildOfferBlocks(), []);

  return (
    <div className={className}>
      <div className="mb-3 flex justify-center gap-2">
        {(
          [
            { id: "offer" as const, label: "Offer page" },
            { id: "card" as const, label: "Digital card" },
          ] as const
        ).map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMode(m.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              mode === m.id
                ? "bg-primary text-primary-foreground shadow-[0_0_20px_rgba(163,230,53,0.35)]"
                : "border border-border/60 bg-background/50 text-muted-foreground hover:border-primary/40"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="builder-phone mx-auto max-w-[360px]">
        <div className="builder-phone-notch" />
        <div className="builder-phone-screen">
          {mode === "offer" ? (
            <CampaignPageRenderer
              blocks={offerBlocks}
              theme={DEMO_THEME}
              campaignId="demo"
              deviceSlotId="demo"
              businessId="demo"
              businessName="Demo Studio"
              previewMode
              logoUrl="/tap-connect-logo.png"
              contactProfile={{
                displayName: "Demo Studio",
                phone: "+1 (555) 123-4567",
                email: "hello@demo.studio",
                address: "Orlando, FL",
                website: "https://tapthemagic.com",
              }}
            />
          ) : (
            <div
              className="tap-page min-h-full px-3 pb-8 pt-4"
              style={
                {
                  "--tap-primary": DEMO_THEME.primaryColor,
                  "--tap-secondary": DEMO_THEME.secondaryColor,
                  "--tap-bg": DEMO_THEME.backgroundColor,
                  "--tap-text": DEMO_THEME.textColor,
                  background: DEMO_THEME.backgroundColor,
                  color: DEMO_THEME.textColor,
                } as CSSProperties
              }
            >
              <ContactCardSurface
                profile={{
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
                }}
                logoUrl="/tap-connect-logo.png"
                businessName="Demo Studio"
                headline="Every conversation → a customer"
                buttonLabel="Add to contacts"
              />
              <p className="mt-4 text-center text-[11px] text-white/45">
                Live demo · Save Contact downloads a real .vcf
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
