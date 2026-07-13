"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import type { BrandKit } from "@prisma/client";
import type { ButtonItem, ContentBlock } from "@/lib/types/campaign";
import { blockStyleToCss } from "@/components/workbench/block-style-controls";
import { extractYouTubeId } from "@/lib/utils/app";
import { CampaignLeadForm } from "@/components/tap/lead-form";
import { TapActionButton } from "@/components/tap/action-button";
import { RichTapButton, resolveActionHref } from "@/components/tap/rich-button";
import {
  ContactCardSurface,
  SocialIconRow,
} from "@/components/tap/save-contact";
import { SocialGlyph, socialBrandStyle } from "@/components/tap/social-icons";
import { PoweredByTapTheMagic } from "@/components/brand/powered-by";
import {
  parseBrandContactProfile,
  type BrandContactProfile,
} from "@/lib/brand/contact-profile";

interface CampaignTheme {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  backgroundImage?: string;
  backgroundOverlayOpacity?: number;
  fontStyle?: string;
}

interface CampaignPageProps {
  blocks: ContentBlock[];
  theme: CampaignTheme;
  campaignId: string;
  deviceSlotId: string;
  businessId: string;
  businessName: string;
  brandKit?: BrandKit | null;
  logoUrl?: string | null;
  contactProfile?: BrandContactProfile;
  upcomingItems?: { label: string; whenLabel: string; scheduleLabel?: string; campaignTitle?: string }[];
  showUpcomingStrip?: boolean;
}

const PAGE_FONT: Record<string, string> = {
  sans: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
  serif: "ui-serif, Georgia, Cambria, 'Times New Roman', serif",
  display: "'Segoe UI', 'Helvetica Neue', Impact, sans-serif",
};

function GoogleMark({ variant }: { variant: string }) {
  if (variant === "stars") {
    return (
      <div className="tap-google-stars" aria-hidden>
        {"★★★★★"}
      </div>
    );
  }
  if (variant === "badge") {
    return (
      <div className="tap-google-badge" aria-hidden>
        <span className="tap-google-g">G</span>
        <span>Google Reviews</span>
      </div>
    );
  }
  if (variant === "pill") {
    return (
      <div className="tap-google-pill" aria-hidden>
        <span className="tap-google-g">G</span> Google
      </div>
    );
  }
  // google_g + outline share the colored G
  return (
    <div className="tap-google-g-large" aria-hidden title="Google">
      <span style={{ color: "#4285F4" }}>G</span>
      <span style={{ color: "#EA4335" }}>o</span>
      <span style={{ color: "#FBBC05" }}>o</span>
      <span style={{ color: "#4285F4" }}>g</span>
      <span style={{ color: "#34A853" }}>l</span>
      <span style={{ color: "#EA4335" }}>e</span>
    </div>
  );
}

function StyledBlockShell({
  block,
  children,
  className = "",
}: {
  block: ContentBlock;
  children: ReactNode;
  className?: string;
}) {
  const style = block.style;
  const css = blockStyleToCss(style);
  const card = style?.card === true;
  return (
    <div
      className={`tap-block ${card ? "tap-block-card" : ""} ${className}`.trim()}
      style={css}
    >
      {children}
    </div>
  );
}

export function CampaignPageRenderer({
  blocks,
  theme,
  campaignId,
  deviceSlotId,
  businessId,
  businessName,
  brandKit,
  logoUrl,
  contactProfile: contactProfileProp,
  upcomingItems = [],
  showUpcomingStrip = false,
}: CampaignPageProps) {
  const contactProfile: BrandContactProfile = {
    ...parseBrandContactProfile(brandKit?.socialLinks),
    ...contactProfileProp,
    organization:
      contactProfileProp?.organization ||
      parseBrandContactProfile(brandKit?.socialLinks).organization ||
      businessName,
    displayName:
      contactProfileProp?.displayName ||
      parseBrandContactProfile(brandKit?.socialLinks).displayName ||
      businessName,
  };
  const enabledBlocks = [...blocks]
    .filter((b) => b.enabled)
    .sort((a, b) => a.order - b.order);

  const hasUpcomingBlock = enabledBlocks.some((b) => b.type === "upcoming_schedule");
  const hasEmailCapture = enabledBlocks.some((b) => b.type === "email_capture");
  const [contactUnlocked, setContactUnlocked] = useState(false);
  const mark = logoUrl;
  const overlay =
    typeof theme.backgroundOverlayOpacity === "number"
      ? theme.backgroundOverlayOpacity
      : theme.backgroundImage
        ? 55
        : 0;

  const style = {
    "--tap-primary": theme.primaryColor,
    "--tap-secondary": theme.secondaryColor,
    "--tap-bg": theme.backgroundColor,
    "--tap-text": theme.textColor,
    fontFamily: PAGE_FONT[theme.fontStyle ?? "sans"] ?? PAGE_FONT.sans,
    ...(theme.backgroundImage
      ? {
          backgroundImage: `linear-gradient(rgba(0,0,0,${overlay / 100}), rgba(0,0,0,${overlay / 100})), url(${theme.backgroundImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        }
      : {}),
  } as CSSProperties;

  return (
    <div className="tap-page min-h-screen" style={style}>
      <div className="tap-page-inner mx-auto max-w-lg">
        {mark && (
          <div className="flex justify-center px-4 pt-6">
            <img src={mark} alt={businessName} className="h-10 w-auto object-contain" />
          </div>
        )}
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
            upcomingItems={upcomingItems}
            contactProfile={contactProfile}
            logoUrl={logoUrl}
          />
        ))}
        {showUpcomingStrip && !hasUpcomingBlock && upcomingItems.length > 0 && (
          <UpcomingStrip
            headline="Coming up"
            items={upcomingItems}
          />
        )}
        <footer className="px-4 py-10">
          <PoweredByTapTheMagic />
        </footer>
      </div>
    </div>
  );
}

function UpcomingStrip({
  headline,
  items,
}: {
  headline: string;
  items: { label: string; whenLabel: string; scheduleLabel?: string; campaignTitle?: string }[];
}) {
  if (!items.length) return null;
  return (
    <div className="tap-block px-4 pt-5">
      <div className="tap-upcoming">
        <p className="tap-upcoming-title">{headline}</p>
        <ul className="tap-upcoming-list">
          {items.map((item, i) => (
            <li key={`${item.label}-${i}`}>
              <span className="tap-upcoming-when">{item.whenLabel}</span>
              <span className="tap-upcoming-label">{item.label}</span>
              {item.campaignTitle && item.campaignTitle !== item.label ? (
                <span className="tap-upcoming-sub">{item.campaignTitle}</span>
              ) : null}
            </li>
          ))}
        </ul>
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
  upcomingItems = [],
  contactProfile = {},
  logoUrl,
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
  upcomingItems?: { label: string; whenLabel: string; scheduleLabel?: string; campaignTitle?: string }[];
  contactProfile?: BrandContactProfile;
  logoUrl?: string | null;
}) {
  const data = block.data as Record<string, unknown>;

  switch (block.type) {
    case "hero_image": {
      const imageUrl = data.imageUrl as string;
      if (!imageUrl) return null;
      const aspect = (data.aspect as string) ?? "4/3";
      const fit = (data.objectFit as string) ?? "cover";
      const focalY = typeof data.focalY === "number" ? data.focalY : 50;
      const aspectClass =
        aspect === "16/9"
          ? "aspect-video"
          : aspect === "1/1"
            ? "aspect-square"
            : aspect === "21/9"
              ? "aspect-[21/9]"
              : aspect === "auto"
                ? ""
                : "aspect-[4/3]";
      return (
        <StyledBlockShell block={block} className={`tap-hero-image relative w-full overflow-hidden ${aspectClass}`}>
          <img
            src={imageUrl}
            alt={(data.altText as string) ?? ""}
            className={`h-full w-full ${fit === "contain" ? "object-contain" : "object-cover"}`}
            style={{ objectPosition: `center ${focalY}%` }}
          />
          {data.overlayText ? (
            <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 to-transparent p-6">
              <p className="text-lg font-semibold text-white">{data.overlayText as string}</p>
            </div>
          ) : null}
        </StyledBlockShell>
      );
    }

    case "hero_video": {
      const videoUrl = data.videoUrl as string;
      if (!videoUrl) return null;
      const ytId = extractYouTubeId(videoUrl);
      const autoplay = data.autoplay === true;
      const embedSrc = ytId
        ? `https://www.youtube.com/embed/${ytId}?${new URLSearchParams({
            ...(autoplay
              ? { autoplay: "1", mute: "1", playsinline: "1" }
              : {}),
            rel: "0",
          }).toString()}`
        : null;
      return (
        <StyledBlockShell block={block} className="px-4 pt-4">
          {embedSrc ? (
            <div className="aspect-video overflow-hidden rounded-xl shadow-lg">
              <iframe
                src={embedSrc}
                title={(data.title as string) ?? "Video"}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <a
              href={videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="tap-btn tap-btn-primary block text-center"
            >
              Watch Video
            </a>
          )}
        </StyledBlockShell>
      );
    }

    case "headline": {
      const alignment = (data.alignment as string) ?? "center";
      const alignClass =
        alignment === "left" ? "text-left" : alignment === "right" ? "text-right" : "text-center";
      return (
        <StyledBlockShell block={block} className={`px-5 pt-8 ${alignClass}`}>
          <h1 className="tap-headline tracking-tight">{data.headline as string}</h1>
          {data.subheadline ? (
            <p className="tap-subheadline mt-2 opacity-80">{data.subheadline as string}</p>
          ) : null}
        </StyledBlockShell>
      );
    }

    case "rich_text":
      return (
        <StyledBlockShell block={block} className="px-5 pt-3">
          <p className="tap-body whitespace-pre-wrap leading-relaxed opacity-90">
            {data.body as string}
          </p>
        </StyledBlockShell>
      );

    case "product_details":
      return (
        <StyledBlockShell block={block} className="px-4 pt-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
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
        </StyledBlockShell>
      );

    case "offer_coupon": {
      const lockedUntilContact = data.lockedUntilContact !== false;
      const isLocked = lockedUntilContact && hasEmailCapture && !contactUnlocked;

      if (isLocked) {
        return (
          <StyledBlockShell block={block} className="px-4 pt-4">
            <div
              className="rounded-2xl border border-dashed border-white/20 bg-white/5 p-5 text-center"
              id={`offer-${block.id}`}
            >
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
          </StyledBlockShell>
        );
      }

      return (
        <StyledBlockShell block={block} className="px-4 pt-4">
          <div
            className="rounded-2xl border-2 border-dashed border-[var(--tap-primary)] bg-[var(--tap-primary)]/10 p-5 text-center"
            id={`offer-${block.id}`}
          >
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
        </StyledBlockShell>
      );
    }

    case "email_capture":
      return (
        <StyledBlockShell block={block}>
          <CampaignLeadForm
            block={block}
            campaignId={campaignId}
            deviceSlotId={deviceSlotId}
            businessId={businessId}
            type="email_capture"
            onSuccess={onContactCaptured}
          />
        </StyledBlockShell>
      );

    case "feedback_form":
      return (
        <StyledBlockShell block={block}>
          <CampaignLeadForm
            block={block}
            campaignId={campaignId}
            deviceSlotId={deviceSlotId}
            businessId={businessId}
            type="feedback"
          />
        </StyledBlockShell>
      );

    case "google_review": {
      const reviewUrl = data.reviewUrl as string;
      if (!reviewUrl) return null;
      const badgeStyle = (data.badgeStyle as string) ?? "google_g";
      const outline = badgeStyle === "outline";
      return (
        <StyledBlockShell block={block} className="px-4 pt-5">
          <div className={`tap-google-card ${outline ? "tap-google-card-outline" : ""}`}>
            <GoogleMark variant={badgeStyle} />
            <h3 className="mt-3 text-lg font-semibold">{data.headline as string}</h3>
            {data.description ? (
              <p className="mt-2 text-sm opacity-80">{data.description as string}</p>
            ) : null}
            <TapActionButton
              eventType="review_click"
              campaignId={campaignId}
              deviceSlotId={deviceSlotId}
              businessId={businessId}
              blockId={block.id}
              href={reviewUrl}
              openInNewTab
              className={`tap-btn mt-4 w-full ${outline ? "tap-btn-outline" : "tap-btn-primary"}`}
            >
              {data.buttonLabel as string}
            </TapActionButton>
          </div>
        </StyledBlockShell>
      );
    }

    case "map_location": {
      const address =
        ((data.address as string) || "").trim() || contactProfile.address?.trim() || "";
      const rawMap = ((data.mapUrl as string) || "").trim();
      const mapUrl =
        rawMap && !/[?&]q=$/.test(rawMap)
          ? rawMap
          : address
            ? `https://maps.google.com/?q=${encodeURIComponent(address)}`
            : undefined;
      return (
        <StyledBlockShell block={block} className="px-4 pt-4">
          <h3 className="mb-2 text-lg font-semibold">{data.headline as string}</h3>
          {address ? <p className="mb-4 text-sm opacity-80">{address}</p> : null}
          <TapActionButton
            eventType="map_click"
            campaignId={campaignId}
            deviceSlotId={deviceSlotId}
            businessId={businessId}
            blockId={block.id}
            href={mapUrl}
            openInNewTab
            className="tap-btn tap-btn-pressable tap-btn-secondary w-full"
          >
            {(data.buttonLabel as string) || "Get directions"}
          </TapActionButton>
        </StyledBlockShell>
      );
    }

    case "button_group": {
      const buttons = (data.buttons as ButtonItem[]) ?? [];
      const layout = (data.layout as string) ?? "stack";
      if (!buttons.length) return null;
      const layoutClass =
        layout === "cards_2"
          ? "tap-btn-cards-2"
          : layout === "grid_2"
            ? "tap-btn-grid-2"
            : layout === "icon_row"
              ? "tap-btn-icon-row"
              : layout === "row"
                ? "tap-btn-row"
                : "tap-btn-stack";
      return (
        <StyledBlockShell block={block} className={`px-4 pt-4 ${layoutClass}`}>
          {buttons.map((btn) => (
            <RichTapButton
              key={btn.id}
              btn={
                layout === "icon_row" && !btn.appearance
                  ? { ...btn, appearance: "icon_only", fullWidth: false }
                  : layout === "cards_2"
                    ? { ...btn, card: true, fullWidth: true }
                    : layout === "grid_2"
                      ? { ...btn, fullWidth: true }
                      : btn
              }
              campaignId={campaignId}
              deviceSlotId={deviceSlotId}
              businessId={businessId}
              blockId={block.id}
              contact={contactProfile}
            />
          ))}
        </StyledBlockShell>
      );
    }

    case "social_links": {
      const links = (data.links as { platform: string; url: string; label?: string }[]) ?? [];
      const layout = (data.layout as string) ?? "row";
      if (!links.length) {
        return (
          <StyledBlockShell block={block} className="px-4 pt-4">
            {data.headline ? (
              <h3 className="mb-3 text-lg font-semibold">{data.headline as string}</h3>
            ) : null}
            <SocialIconRow socials={contactProfile.socials} />
          </StyledBlockShell>
        );
      }
      return (
        <StyledBlockShell block={block} className="px-4 pt-4">
          {data.headline ? <h3 className="mb-3 text-lg font-semibold">{data.headline as string}</h3> : null}
          <div className={layout === "stack" ? "tap-btn-stack" : "tap-social-row"}>
            {links.map((link, i) =>
              layout === "stack" ? (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tap-btn tap-btn-social w-full"
                  style={socialBrandStyle(link.platform)}
                >
                  <SocialGlyph platform={link.platform} />
                  {link.label || link.platform}
                </a>
              ) : (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tap-social-chip tap-social-brand"
                  aria-label={link.label || link.platform}
                  title={link.label || link.platform}
                  style={socialBrandStyle(link.platform)}
                >
                  <SocialGlyph platform={link.platform} />
                </a>
              )
            )}
          </div>
        </StyledBlockShell>
      );
    }

    case "action_block": {
      const actions = (data.actions as { id: string; type: string; label: string; url?: string }[]) ?? [];
      if (!actions.length) return null;
      return (
        <StyledBlockShell block={block} className="px-4 pt-4">
          {data.headline ? <h3 className="mb-3 text-lg font-semibold">{data.headline as string}</h3> : null}
          <div className="tap-btn-grid-2">
            {actions.map((action) => {
              const href = resolveActionHref(action, contactProfile);
              const icon =
                action.type === "call"
                  ? "phone"
                  : action.type === "email"
                    ? "mail"
                    : action.type === "directions" || action.type === "map"
                      ? "map"
                      : "link";
              return (
                <RichTapButton
                  key={action.id}
                  btn={{
                    id: action.id,
                    label: action.label,
                    url: href || action.url || "",
                    style: "outline",
                    icon,
                    appearance: "icon_text",
                    size: "md",
                    fullWidth: true,
                    card: true,
                    openInNewTab:
                      action.type === "call" || action.type === "email" ? false : undefined,
                  }}
                  campaignId={campaignId}
                  deviceSlotId={deviceSlotId}
                  businessId={businessId}
                  blockId={block.id}
                  contact={contactProfile}
                />
              );
            })}
          </div>
        </StyledBlockShell>
      );
    }

    case "faq": {
      const items = (data.items as { id: string; question: string; answer: string }[]) ?? [];
      return (
        <StyledBlockShell block={block} className="px-4 pt-4">
          {data.headline ? <h3 className="mb-3 text-lg font-semibold">{data.headline as string}</h3> : null}
          <div className="space-y-3">
            {items.map((item) => (
              <details key={item.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                <summary className="cursor-pointer font-medium">{item.question}</summary>
                <p className="mt-2 text-sm opacity-80">{item.answer}</p>
              </details>
            ))}
          </div>
        </StyledBlockShell>
      );
    }

    case "disclaimer":
      return (
        <StyledBlockShell block={block} className="px-5 pt-4">
          <p className="text-xs leading-relaxed opacity-50">{data.text as string}</p>
        </StyledBlockShell>
      );

    case "upcoming_schedule": {
      const manual = (data.items as { label: string; whenLabel: string; scheduleLabel?: string }[]) ?? [];
      const items = manual.length ? manual : upcomingItems;
      return (
        <StyledBlockShell block={block}>
          <UpcomingStrip
            headline={(data.headline as string) || "Coming up"}
            items={items}
          />
        </StyledBlockShell>
      );
    }

    case "age_gate":
      return (
        <StyledBlockShell block={block} className="px-4 pt-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center">
            <p className="font-semibold">{(data.headline as string) || "Age verification"}</p>
            <p className="mt-2 text-sm opacity-80">
              {(data.description as string) || "You must be of legal age to continue."}
            </p>
          </div>
        </StyledBlockShell>
      );

    case "vcard_download": {
      const useBrand = data.useBrandProfile !== false;
      const profile: BrandContactProfile = useBrand
        ? {
            ...contactProfile,
            displayName: (data.name as string) || contactProfile.displayName,
            jobTitle: (data.title as string) || contactProfile.jobTitle,
            phone: (data.phone as string) || contactProfile.phone,
            email: (data.email as string) || contactProfile.email,
            website: (data.website as string) || contactProfile.website,
            organization: (data.organization as string) || contactProfile.organization,
            address: (data.address as string) || contactProfile.address,
          }
        : {
            displayName: (data.name as string) || businessName,
            jobTitle: data.title as string | undefined,
            phone: data.phone as string | undefined,
            email: data.email as string | undefined,
            website: data.website as string | undefined,
            organization: data.organization as string | undefined,
            address: data.address as string | undefined,
          };
      return (
        <StyledBlockShell block={block} className="px-4 pt-4">
          <ContactCardSurface
            profile={profile}
            logoUrl={logoUrl}
            businessName={businessName}
            buttonLabel={(data.buttonLabel as string) || "Add to contacts"}
            showShare={false}
            showSocials={Boolean(profile.socials && Object.values(profile.socials).some(Boolean))}
            onSaved={() => {
              void fetch("/api/tap/click", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  eventType: "vcard_download",
                  campaignId,
                  deviceSlotId,
                  businessId,
                  blockId: block.id,
                }),
              });
            }}
          />
        </StyledBlockShell>
      );
    }

    case "digital_card": {
      return (
        <StyledBlockShell block={block} className="px-4 pt-5">
          <ContactCardSurface
            profile={contactProfile}
            logoUrl={logoUrl}
            businessName={businessName}
            headline={data.headline as string | undefined}
            buttonLabel={(data.buttonLabel as string) || "Add to contacts"}
            showSave={data.showSaveContact !== false}
            showShare={data.showShare !== false}
            showSocials={data.showSocials !== false}
            onSaved={() => {
              void fetch("/api/tap/click", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  eventType: "vcard_download",
                  campaignId,
                  deviceSlotId,
                  businessId,
                  blockId: block.id,
                }),
              });
            }}
          />
        </StyledBlockShell>
      );
    }

    case "image_gallery": {
      const images =
        (data.images as { id: string; url: string; caption?: string; linkUrl?: string }[]) ??
        [];
      if (!images.length) return null;
      return (
        <StyledBlockShell block={block} className="px-4 pt-4">
          <div className="grid grid-cols-2 gap-2">
            {images.map((img) => {
              const body = (
                <>
                  <img
                    src={img.url}
                    alt={img.caption ?? ""}
                    className="aspect-square w-full object-cover"
                  />
                  {img.caption ? (
                    <figcaption className="px-1 py-1 text-xs opacity-70">{img.caption}</figcaption>
                  ) : null}
                </>
              );
              return (
                <figure key={img.id} className="overflow-hidden rounded-xl">
                  {img.linkUrl ? (
                    <a href={img.linkUrl} target="_blank" rel="noopener noreferrer">
                      {body}
                    </a>
                  ) : (
                    body
                  )}
                </figure>
              );
            })}
          </div>
        </StyledBlockShell>
      );
    }

    default:
      return null;
  }
}
