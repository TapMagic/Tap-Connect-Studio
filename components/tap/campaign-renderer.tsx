"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import type { BrandKit } from "@prisma/client";
import type { ButtonItem, ContentBlock } from "@/lib/types/campaign";
import { blockStyleToCss } from "@/components/workbench/block-style-controls";
import { extractYouTubeId } from "@/lib/utils/app";
import { CampaignLeadForm } from "@/components/tap/lead-form";
import { TapActionButton } from "@/components/tap/action-button";
import { PoweredByTapTheMagic } from "@/components/brand/powered-by";

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
}

const PAGE_FONT: Record<string, string> = {
  sans: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
  serif: "ui-serif, Georgia, Cambria, 'Times New Roman', serif",
  display: "'Segoe UI', 'Helvetica Neue', Impact, sans-serif",
};

function ButtonIcon({ icon }: { icon?: ButtonItem["icon"] }) {
  if (!icon || icon === "none") return null;
  const common = "tap-btn-icon";
  switch (icon) {
    case "phone":
      return <span className={common} aria-hidden>☎</span>;
    case "mail":
      return <span className={common} aria-hidden>✉</span>;
    case "map":
      return <span className={common} aria-hidden>⌖</span>;
    case "star":
      return <span className={common} aria-hidden>★</span>;
    case "cart":
      return <span className={common} aria-hidden>▣</span>;
    case "calendar":
      return <span className={common} aria-hidden>▣</span>;
    case "play":
      return <span className={common} aria-hidden>▶</span>;
    case "external":
      return <span className={common} aria-hidden>↗</span>;
    case "link":
    default:
      return <span className={common} aria-hidden>↗</span>;
  }
}

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
}: CampaignPageProps) {
  const enabledBlocks = [...blocks]
    .filter((b) => b.enabled)
    .sort((a, b) => a.order - b.order);

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
          />
        ))}
        <footer className="px-4 py-10">
          <PoweredByTapTheMagic />
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
      const mapUrl =
        (data.mapUrl as string) ||
        `https://maps.google.com/?q=${encodeURIComponent((data.address as string) ?? "")}`;
      return (
        <StyledBlockShell block={block} className="px-4 pt-4">
          <h3 className="mb-2 text-lg font-semibold">{data.headline as string}</h3>
          <p className="mb-4 text-sm opacity-80">{data.address as string}</p>
          <TapActionButton
            eventType="map_click"
            campaignId={campaignId}
            deviceSlotId={deviceSlotId}
            businessId={businessId}
            blockId={block.id}
            href={mapUrl}
            openInNewTab
            className="tap-btn tap-btn-secondary w-full"
          >
            {data.buttonLabel as string}
          </TapActionButton>
        </StyledBlockShell>
      );
    }

    case "button_group": {
      const buttons = (data.buttons as ButtonItem[]) ?? [];
      const layout = (data.layout as string) ?? "stack";
      if (!buttons.length) return null;
      return (
        <StyledBlockShell
          block={block}
          className={`px-4 pt-4 ${layout === "row" ? "tap-btn-row" : "tap-btn-stack"}`}
        >
          {buttons.map((btn) => {
            const styleClass =
              btn.style === "primary"
                ? "tap-btn-primary"
                : btn.style === "outline"
                  ? "tap-btn-outline"
                  : btn.style === "ghost"
                    ? "tap-btn-ghost"
                    : btn.style === "soft"
                      ? "tap-btn-soft"
                      : "tap-btn-secondary";
            const sizeClass =
              btn.size === "sm" ? "tap-btn-sm" : btn.size === "lg" ? "tap-btn-lg" : "";
            const widthClass = btn.fullWidth === false ? "" : "w-full";
            return (
              <TapActionButton
                key={btn.id}
                eventType="button_click"
                campaignId={campaignId}
                deviceSlotId={deviceSlotId}
                businessId={businessId}
                blockId={block.id}
                href={btn.url || undefined}
                openInNewTab={btn.openInNewTab}
                className={`tap-btn ${styleClass} ${sizeClass} ${widthClass}`.trim()}
              >
                <ButtonIcon icon={btn.icon} />
                {btn.label}
              </TapActionButton>
            );
          })}
        </StyledBlockShell>
      );
    }

    case "social_links": {
      const links = (data.links as { platform: string; url: string }[]) ?? [];
      if (!links.length) return null;
      return (
        <StyledBlockShell block={block} className="px-4 pt-4">
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
        </StyledBlockShell>
      );
    }

    case "action_block": {
      const actions = (data.actions as { id: string; type: string; label: string; url?: string }[]) ?? [];
      if (!actions.length) return null;
      return (
        <StyledBlockShell block={block} className="px-4 pt-4">
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

    case "vcard_download":
      return (
        <StyledBlockShell block={block} className="px-4 pt-4">
          <TapActionButton
            eventType="vcard_download"
            campaignId={campaignId}
            deviceSlotId={deviceSlotId}
            businessId={businessId}
            blockId={block.id}
            className="tap-btn tap-btn-secondary w-full"
          >
            {(data.buttonLabel as string) || "Save contact"}
          </TapActionButton>
        </StyledBlockShell>
      );

    case "image_gallery": {
      const images = (data.images as { id: string; url: string; caption?: string }[]) ?? [];
      if (!images.length) return null;
      return (
        <StyledBlockShell block={block} className="px-4 pt-4">
          <div className="grid grid-cols-2 gap-2">
            {images.map((img) => (
              <figure key={img.id} className="overflow-hidden rounded-xl">
                <img src={img.url} alt={img.caption ?? ""} className="aspect-square w-full object-cover" />
                {img.caption ? (
                  <figcaption className="px-1 py-1 text-xs opacity-70">{img.caption}</figcaption>
                ) : null}
              </figure>
            ))}
          </div>
        </StyledBlockShell>
      );
    }

    default:
      return null;
  }
}
