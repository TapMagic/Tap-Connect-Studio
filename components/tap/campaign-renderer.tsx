"use client";

import { useState } from "react";
import type { BrandKit } from "@prisma/client";
import type { ContentBlock } from "@/lib/types/campaign";
import { extractYouTubeId } from "@/lib/utils/app";
import { CampaignLeadForm } from "@/components/tap/lead-form";
import { TapActionButton } from "@/components/tap/action-button";

interface CampaignTheme {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
}

interface CampaignPageProps {
  blocks: ContentBlock[];
  theme: CampaignTheme;
  campaignId: string;
  deviceSlotId: string;
  businessId: string;
  businessName: string;
  brandKit?: BrandKit | null;
}

export function CampaignPageRenderer({
  blocks,
  theme,
  campaignId,
  deviceSlotId,
  businessId,
  businessName,
  brandKit,
}: CampaignPageProps) {
  const enabledBlocks = [...blocks]
    .filter((b) => b.enabled)
    .sort((a, b) => a.order - b.order);

  const hasEmailCapture = enabledBlocks.some((b) => b.type === "email_capture");
  const [contactUnlocked, setContactUnlocked] = useState(false);

  const style = {
    "--tap-primary": theme.primaryColor,
    "--tap-secondary": theme.secondaryColor,
    "--tap-bg": theme.backgroundColor,
    "--tap-text": theme.textColor,
  } as React.CSSProperties;

  return (
    <div className="tap-page min-h-screen" style={style}>
      <div className="mx-auto max-w-lg">
        {enabledBlocks.map((block) => (
          <BlockRenderer
            key={block.id}
            block={block}
            campaignId={campaignId}
            deviceSlotId={deviceSlotId}
            businessId={businessId}
            businessName={businessName}
            brandKit={brandKit}
            contactUnlocked={contactUnlocked}
            hasEmailCapture={hasEmailCapture}
            onContactCaptured={() => setContactUnlocked(true)}
          />
        ))}
        <footer className="px-4 py-8 text-center text-xs opacity-50">
          Powered by TapConnect Studio
        </footer>
      </div>
    </div>
  );
}

function BlockRenderer({
  block,
  campaignId,
  deviceSlotId,
  businessId,
  businessName,
  brandKit,
  contactUnlocked,
  hasEmailCapture,
  onContactCaptured,
}: {
  block: ContentBlock;
  campaignId: string;
  deviceSlotId: string;
  businessId: string;
  businessName: string;
  brandKit?: BrandKit | null;
  contactUnlocked: boolean;
  hasEmailCapture: boolean;
  onContactCaptured: () => void;
}) {
  const data = block.data as Record<string, unknown>;

  switch (block.type) {
    case "hero_image": {
      const imageUrl = data.imageUrl as string;
      if (!imageUrl) return null;
      return (
        <div className="tap-hero-image relative aspect-[4/3] w-full overflow-hidden">
          <img src={imageUrl} alt={(data.altText as string) ?? ""} className="h-full w-full object-cover" />
          {data.overlayText ? (
            <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 to-transparent p-6">
              <p className="text-lg font-semibold text-white">{data.overlayText as string}</p>
            </div>
          ) : null}
        </div>
      );
    }

    case "hero_video": {
      const videoUrl = data.videoUrl as string;
      if (!videoUrl) return null;
      const ytId = extractYouTubeId(videoUrl);
      return (
        <div className="tap-block px-4 pt-4">
          {ytId ? (
            <div className="aspect-video overflow-hidden rounded-xl">
              <iframe
                src={`https://www.youtube.com/embed/${ytId}`}
                title={(data.title as string) ?? "Video"}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="tap-btn tap-btn-primary block text-center">
              Watch Video
            </a>
          )}
        </div>
      );
    }

    case "headline": {
      const alignment = (data.alignment as string) ?? "center";
      const alignClass =
        alignment === "left" ? "text-left" : alignment === "right" ? "text-right" : "text-center";
      return (
        <div className={`tap-block px-4 pt-6 ${alignClass}`}>
          <h1 className="text-2xl font-bold tracking-tight">{data.headline as string}</h1>
          {data.subheadline ? (
            <p className="mt-2 text-base opacity-80">{data.subheadline as string}</p>
          ) : null}
        </div>
      );
    }

    case "rich_text":
      return (
        <div className="tap-block px-4 pt-4">
          <p className="whitespace-pre-wrap text-base leading-relaxed opacity-90">{data.body as string}</p>
        </div>
      );

    case "product_details":
      return (
        <div className="tap-block px-4 pt-4">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-lg font-semibold">{data.name as string}</h3>
            {data.price ? <p className="mt-1 text-sm opacity-70">{data.price as string}</p> : null}
            <p className="mt-3 text-sm leading-relaxed opacity-90">{data.description as string}</p>
            {Array.isArray(data.features) && data.features.length > 0 ? (
              <ul className="mt-4 space-y-2">
                {(data.features as string[]).map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-[var(--tap-primary)]">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      );

    case "offer_coupon": {
      const lockedUntilContact = data.lockedUntilContact !== false;
      const isLocked = lockedUntilContact && hasEmailCapture && !contactUnlocked;

      if (isLocked) {
        return (
          <div className="tap-block px-4 pt-4" id={`offer-${block.id}`}>
            <div className="rounded-xl border border-dashed border-white/20 bg-white/5 p-5 text-center">
              <h3 className="text-lg font-bold">{data.title as string}</h3>
              <p className="mt-2 text-sm opacity-80">
                Enter your contact info above to unlock this coupon.
              </p>
              <p className="mt-4 font-mono text-2xl font-bold tracking-widest text-white/20 blur-sm select-none">
                {(data.code as string) || "••••••"}
              </p>
              <button type="button" disabled className="tap-btn tap-btn-secondary mt-4 w-full opacity-50">
                Locked until contact info
              </button>
            </div>
          </div>
        );
      }

      return (
        <div className="tap-block px-4 pt-4" id={`offer-${block.id}`}>
          <div className="rounded-xl border-2 border-dashed border-[var(--tap-primary)] bg-[var(--tap-primary)]/10 p-5 text-center">
            <h3 className="text-lg font-bold">{data.title as string}</h3>
            <p className="mt-2 text-sm opacity-80">{data.description as string}</p>
            {data.code ? (
              <p className="mt-4 font-mono text-2xl font-bold tracking-widest text-[var(--tap-primary)]">
                {data.code as string}
              </p>
            ) : null}
            <TapActionButton
              eventType="coupon_claim"
              campaignId={campaignId}
              deviceSlotId={deviceSlotId}
              businessId={businessId}
              blockId={block.id}
              className="tap-btn tap-btn-primary mt-4 w-full"
            >
              {data.ctaLabel as string}
            </TapActionButton>
          </div>
        </div>
      );
    }

    case "email_capture":
      return (
        <CampaignLeadForm
          block={block}
          campaignId={campaignId}
          deviceSlotId={deviceSlotId}
          businessId={businessId}
          type="email_capture"
          onSuccess={onContactCaptured}
        />
      );

    case "feedback_form":
      return (
        <CampaignLeadForm
          block={block}
          campaignId={campaignId}
          deviceSlotId={deviceSlotId}
          businessId={businessId}
          type="feedback"
        />
      );

    case "google_review": {
      const reviewUrl = data.reviewUrl as string;
      if (!reviewUrl) return null;
      return (
        <div className="tap-block px-4 pt-4">
          <h3 className="mb-2 text-lg font-semibold">{data.headline as string}</h3>
          {data.description ? <p className="mb-4 text-sm opacity-80">{data.description as string}</p> : null}
          <TapActionButton
            eventType="review_click"
            campaignId={campaignId}
            deviceSlotId={deviceSlotId}
            businessId={businessId}
            blockId={block.id}
            href={reviewUrl}
            className="tap-btn tap-btn-primary w-full"
          >
            {data.buttonLabel as string}
          </TapActionButton>
        </div>
      );
    }

    case "map_location": {
      const mapUrl =
        (data.mapUrl as string) ||
        `https://maps.google.com/?q=${encodeURIComponent((data.address as string) ?? "")}`;
      return (
        <div className="tap-block px-4 pt-4">
          <h3 className="mb-2 text-lg font-semibold">{data.headline as string}</h3>
          <p className="mb-4 text-sm opacity-80">{data.address as string}</p>
          <TapActionButton
            eventType="map_click"
            campaignId={campaignId}
            deviceSlotId={deviceSlotId}
            businessId={businessId}
            blockId={block.id}
            href={mapUrl}
            className="tap-btn tap-btn-secondary w-full"
          >
            {data.buttonLabel as string}
          </TapActionButton>
        </div>
      );
    }

    case "button_group": {
      const buttons = (data.buttons as { id: string; label: string; url: string; style: string }[]) ?? [];
      if (!buttons.length) return null;
      return (
        <div className="tap-block space-y-3 px-4 pt-4">
          {buttons.map((btn) => (
            <TapActionButton
              key={btn.id}
              eventType="button_click"
              campaignId={campaignId}
              deviceSlotId={deviceSlotId}
              businessId={businessId}
              blockId={block.id}
              href={btn.url || undefined}
              className={`tap-btn w-full ${btn.style === "primary" ? "tap-btn-primary" : btn.style === "outline" ? "tap-btn-outline" : "tap-btn-secondary"}`}
            >
              {btn.label}
            </TapActionButton>
          ))}
        </div>
      );
    }

    case "social_links": {
      const links = (data.links as { platform: string; url: string }[]) ?? [];
      if (!links.length) return null;
      return (
        <div className="tap-block px-4 pt-4">
          {data.headline ? <h3 className="mb-3 text-lg font-semibold">{data.headline as string}</h3> : null}
          <div className="flex flex-wrap gap-2">
            {links.map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="tap-btn tap-btn-outline px-4 py-2 text-sm"
              >
                {link.platform}
              </a>
            ))}
          </div>
        </div>
      );
    }

    case "action_block": {
      const actions = (data.actions as { id: string; type: string; label: string; url?: string }[]) ?? [];
      if (!actions.length) return null;
      return (
        <div className="tap-block px-4 pt-4">
          {data.headline ? <h3 className="mb-3 text-lg font-semibold">{data.headline as string}</h3> : null}
          <div className="grid grid-cols-2 gap-2">
            {actions.map((action) => (
              <TapActionButton
                key={action.id}
                eventType={`action_${action.type}`}
                campaignId={campaignId}
                deviceSlotId={deviceSlotId}
                businessId={businessId}
                blockId={block.id}
                href={action.url}
                className="tap-btn tap-btn-outline text-sm"
              >
                {action.label}
              </TapActionButton>
            ))}
          </div>
        </div>
      );
    }

    case "disclaimer":
      return (
        <div className="tap-block px-4 pt-4">
          <p className="text-xs leading-relaxed opacity-50">{data.text as string}</p>
        </div>
      );

    case "faq": {
      const items = (data.items as { id: string; question: string; answer: string }[]) ?? [];
      return (
        <div className="tap-block px-4 pt-4">
          <h3 className="mb-4 text-lg font-semibold">{data.headline as string}</h3>
          <div className="space-y-3">
            {items.map((item) => (
              <details key={item.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                <summary className="cursor-pointer font-medium">{item.question}</summary>
                <p className="mt-2 text-sm opacity-80">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      );
    }

    default:
      return null;
  }
}
