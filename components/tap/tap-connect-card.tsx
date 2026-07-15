"use client";

import { useMemo, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, Link2 } from "lucide-react";
import {
  buildVCard,
  saveContactWithUserGesture,
  type BrandContactProfile,
} from "@/lib/brand/contact-profile";
import {
  buildGradientCss,
  groupActionsForLayout,
  normalizeShape,
  resolveActionHref,
  sectionFinish,
  shapeRadius,
  sortTapCardSections,
  type TapCardSection,
  type TapConnectCardConfig,
} from "@/lib/brand/tap-card";
import { PremiumIcon } from "@/components/design/premium-icon";
import { finishClass, textFormatToCss } from "@/lib/design/premium-finish";
import { socialBrandStyle } from "@/components/tap/social-icons";
import { TAP_CONNECT_LOGO } from "@/lib/brand/assets";
import { cn } from "@/lib/utils";

type TapConnectCardProps = {
  config: TapConnectCardConfig;
  profile: BrandContactProfile;
  businessName: string;
  logoUrl?: string | null;
  reviewUrl?: string | null;
  forceExpanded?: boolean;
  /** Highlight + scroll anchor for builder selection */
  selectedSectionId?: string | null;
  /** Builder-only chrome (e.g. Linked badge) — hidden on live taps */
  builderChrome?: boolean;
  className?: string;
  onAction?: (kind: string, sectionId: string) => void;
};

function sectionDomProps(id: string, selectedSectionId?: string | null) {
  return {
    id: `tap-section-${id}`,
    "data-section-id": id,
    "data-selected": selectedSectionId === id ? "true" : undefined,
  } as const;
}

export function TapConnectCard({
  config,
  profile,
  businessName,
  logoUrl,
  reviewUrl,
  forceExpanded = false,
  selectedSectionId = null,
  builderChrome = false,
  className = "",
  onAction,
}: TapConnectCardProps) {
  const [collapsed, setCollapsed] = useState(
    !forceExpanded && config.collapsible && config.defaultCollapsed
  );
  const [toast, setToast] = useState<string | null>(null);
  const [openOffers, setOpenOffers] = useState<Record<string, boolean>>({});

  const sections = useMemo(
    () => sortTapCardSections(config.sections).filter((s) => s.enabled),
    [config.sections]
  );

  const name = profile.displayName || profile.organization || businessName;
  const initial = (name.trim()[0] || "?").toUpperCase();
  const mark = logoUrl || sections.find((s) => s.type === "hero")?.logoUrl;

  const surfaceAlpha = Math.min(100, Math.max(35, config.surfaceOpacity ?? 100)) / 100;

  const shellBackground =
    config.surfaceFill === "gradient"
      ? buildGradientCss(
          config.surfaceGradientStart || config.surfaceColor,
          config.surfaceGradientEnd || config.accentColor,
          config.surfaceGradientAngle ?? 160
        )
      : undefined;

  const style = {
    "--tcc-accent": config.accentColor,
    "--tcc-surface": config.surfaceColor,
    "--tcc-text": config.textColor,
    "--tcc-neon": config.neonColor || config.accentColor,
    "--tcc-pill": config.pillColor || "#0c0a07",
    "--tcc-pill-text": config.pillTextColor || "#f5e6a8",
    "--tcc-energy": String(config.headerEnergy / 100),
    "--tcc-surface-alpha": String(surfaceAlpha),
  } as CSSProperties;

  async function downloadVcf() {
    let photoBase64: string | undefined;
    let photoType: "JPEG" | "PNG" | undefined;
    const photoSrc = profile.photoUrl || mark;
    if (photoSrc) {
      try {
        if (photoSrc.startsWith("data:")) {
          const m = /^data:image\/(png|jpeg|jpg);base64,(.+)$/i.exec(photoSrc);
          if (m) {
            photoType = m[1].toLowerCase() === "png" ? "PNG" : "JPEG";
            photoBase64 = m[2];
          }
        } else {
          const res = await fetch(
            `/api/public/vcard-photo?url=${encodeURIComponent(photoSrc)}`
          );
          if (res.ok) {
            const data = (await res.json()) as { base64?: string; type?: "JPEG" | "PNG" };
            photoBase64 = data.base64;
            photoType = data.type;
          }
        }
      } catch {
        /* optional */
      }
    }
    const vcf = buildVCard({
      fullName: name,
      organization: profile.organization || businessName,
      title: profile.jobTitle,
      phone: profile.phone,
      email: profile.email,
      website: profile.website,
      address: profile.address,
      note: profile.note,
      photoBase64,
      photoType,
    });
    await saveContactWithUserGesture({
      filename: `${name.replace(/\s+/g, "-").toLowerCase()}.vcf`,
      content: vcf,
      title: name,
    }).then((result) => {
      if (result === "cancelled") {
        setToast("Save cancelled");
        window.setTimeout(() => setToast(null), 2200);
      } else if (result === "downloaded") {
        setToast("Contact file saved — open it to add to Contacts");
        window.setTimeout(() => setToast(null), 4200);
      } else if (result === "shared") {
        setToast("Pick Contacts to finish saving");
        window.setTimeout(() => setToast(null), 3200);
      }
      // "opened" navigates away on mobile — no toast needed
    });
    onAction?.("vcard", "download");
  }

  async function handleAction(section: TapCardSection) {
    const kind = section.actionKind;
    onAction?.(kind || section.type, section.id);

    if (kind === "vcard") {
      await downloadVcf();
      return;
    }
    if (kind === "bookmark") {
      try {
        await navigator.clipboard.writeText(window.location.href);
        setToast("Link copied — bookmark it from your browser menu");
      } catch {
        setToast("Use your browser’s bookmark menu to save this page");
      }
      window.setTimeout(() => setToast(null), 3200);
      return;
    }
    if (kind === "homescreen") {
      setToast(
        "On iPhone: Share → Add to Home Screen. On Android: Menu → Install / Add to Home screen."
      );
      window.setTimeout(() => setToast(null), 5200);
      return;
    }

    const href = resolveActionHref(section, profile, reviewUrl);
    if (href) window.open(href, href.startsWith("http") ? "_blank" : "_self", "noopener,noreferrer");
  }

  const compact = config.compactActionsOnly;
  const peekCount = config.actionsLayout === "grid_2" ? 2 : 2;

  function renderPromo(promo: TapCardSection, inline = false) {
    return (
      <a
        key={promo.id}
        href={promo.href || "#"}
        className={cn(
          "tcc-promo",
          inline && "tcc-promo-inline",
          selectedSectionId === promo.id && "tcc-section-selected"
        )}
        {...sectionDomProps(promo.id, selectedSectionId)}
        style={{
          backgroundColor: promo.backgroundColor,
          ...textFormatToCss(promo.format),
        }}
        onClick={(e) => {
          if (!promo.href || promo.href === "#") e.preventDefault();
          onAction?.("promo_header", promo.id);
        }}
      >
        <span className="tcc-promo-left" style={textFormatToCss(promo.format)}>
          {promo.text || "Click Here to"}
        </span>
        <span
          className="tcc-promo-right"
          style={{
            color: promo.textColor || undefined,
            ...textFormatToCss({
              ...promo.format,
              italic: true,
              fontWeight: "black",
            }),
          }}
        >
          {promo.textRight || "Hottest Deal!!!"}
        </span>
        <span className="tcc-promo-sheen" aria-hidden />
      </a>
    );
  }

  function renderSpecialOffer(section: TapCardSection) {
    const styleKind = section.specialStyle || "banner";
    const rawMode = section.offerMode || "link";
    const mode = rawMode === "campaign" ? "link" : rawMode;
    const href = section.href?.trim();
    const campaignLinked = Boolean(section.linkedCampaignId);
    const open =
      openOffers[section.id] !== undefined
        ? openOffers[section.id]
        : Boolean(section.offerDefaultOpen);

    function activate(e: MouseEvent) {
      onAction?.("special_offer", section.id);
      if (mode === "expand") {
        e.preventDefault();
        setOpenOffers((prev) => ({
          ...prev,
          [section.id]: !(prev[section.id] !== undefined ? prev[section.id] : open),
        }));
        return;
      }
      if (!href || href === "#") {
        e.preventDefault();
        return;
      }
    }

    const teaser = (
      <>
        <div className="tcc-special-copy">
          {builderChrome && campaignLinked ? (
            <span className="tcc-special-linked" title={section.linkedCampaignTitle || "Campaign"}>
              <Link2 className="size-3.5" aria-hidden />
              Linked
            </span>
          ) : null}
          <p className="tcc-special-kicker" style={textFormatToCss(section.format)}>
            {section.text || "Special"}
          </p>
          <p
            className="tcc-special-headline"
            style={textFormatToCss({
              ...config.titleFormat,
              ...section.format,
              fontWeight: "bold",
            })}
          >
            {section.headline || section.textRight || "Hottest Deal"}
          </p>
          {section.description ? (
            <p className="tcc-special-desc" style={textFormatToCss(config.bodyFormat)}>
              {section.description}
            </p>
          ) : null}
          {builderChrome && campaignLinked && section.linkedCampaignTitle ? (
            <p className="tcc-special-campaign-name">{section.linkedCampaignTitle}</p>
          ) : null}
        </div>
        <span className="tcc-special-cta">
          {mode === "expand"
            ? open
              ? "Hide offer"
              : section.offerCta || "View offer"
            : section.offerCta || (campaignLinked ? "Open campaign" : "Open")}
          <ChevronRight className={cn("size-4", open && mode === "expand" && "rotate-90")} />
        </span>
      </>
    );

    const offerPanel =
      mode === "expand" && open ? (
        <div className="tcc-special-offer-panel">
          <p className="tcc-special-offer-title">
            {section.offerTitle || section.headline || "Your offer"}
          </p>
          {section.offerDescription ? (
            <p className="tcc-special-offer-body">{section.offerDescription}</p>
          ) : null}
          {section.offerCode ? (
            <p className="tcc-special-offer-code">{section.offerCode}</p>
          ) : null}
          {section.offerExpires ? (
            <p className="tcc-special-offer-exp">Expires {section.offerExpires}</p>
          ) : null}
          {href && href !== "#" ? (
            <a
              href={href}
              className="tcc-special-offer-btn"
              target={href.startsWith("http") ? "_blank" : undefined}
              rel="noopener noreferrer"
              onClick={() => onAction?.("special_offer_cta", section.id)}
            >
              {section.offerCta || "Claim offer"}
            </a>
          ) : null}
        </div>
      ) : null;

    const shellStyle = {
      backgroundColor: section.backgroundColor,
      color: section.textColor,
      borderRadius: shapeRadius(section.shape, config.defaultShape),
      opacity: (section.opacity ?? 100) / 100,
      ["--tcc-accent" as string]: section.accentColor || undefined,
    } as CSSProperties;

    const className = cn(
      "tcc-special",
      `tcc-special-${styleKind}`,
      finishClass(sectionFinish(section, config.defaultFinish), "tcc-special"),
      selectedSectionId === section.id && "tcc-section-selected"
    );

    if (mode === "link" && href && href !== "#") {
      return (
        <div
          key={section.id}
          className="tcc-special-wrap"
          {...sectionDomProps(section.id, selectedSectionId)}
        >
          <a
            href={href}
            className={className}
            style={shellStyle}
            target={href.startsWith("http") ? "_blank" : undefined}
            rel="noopener noreferrer"
            onClick={() => onAction?.("special_offer", section.id)}
          >
            {teaser}
          </a>
        </div>
      );
    }

    return (
      <div
        key={section.id}
        className="tcc-special-wrap"
        {...sectionDomProps(section.id, selectedSectionId)}
      >
        <button type="button" className={className} style={shellStyle} onClick={activate}>
          {teaser}
        </button>
        {offerPanel}
      </div>
    );
  }

  function renderHero(hero: TapCardSection) {
    const logoSrc = hero.logoUrl || logoUrl || profile.photoUrl;
    const scale = (hero.logoScale ?? 100) / 100;
    const ox = hero.logoOffsetX ?? 0;
    const oy = hero.logoOffsetY ?? 0;
    const showLogo = hero.showHeroLogo === true;
    const layout = hero.heroLayout || "classic";
    const outlined = hero.showOutline !== false;
    const heroFill = hero.heroFill || (hero.imageUrl ? "photo" : "gradient");
    const gradientCss = buildGradientCss(
      hero.gradientStart || config.accentColor,
      hero.gradientEnd || "#0b0f19",
      hero.gradientAngle ?? 160
    );
    const showPhoto = heroFill !== "gradient" && Boolean(hero.imageUrl);
    const showGradient = heroFill !== "photo";
    const gradientOverlay = heroFill === "photo_gradient";

    function cell(
      kind: "logo" | "text" | "image" | "empty" | undefined,
      side: "left" | "right"
    ) {
      if (kind === "logo" && logoSrc) {
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoSrc}
            alt={businessName}
            className="tcc-hero-col-logo"
            style={{ transform: `scale(${scale})` }}
          />
        );
      }
      if (kind === "image") {
        const url =
          side === "left"
            ? hero.columnLeftImageUrl || hero.columnImageUrl || hero.imageUrl
            : hero.columnRightImageUrl || hero.columnImageUrl || hero.imageUrl;
        if (!url) return <span className="tcc-hero-col-empty" aria-hidden />;
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="tcc-hero-col-img" />
        );
      }
      if (kind === "text") {
        const text =
          side === "left"
            ? hero.columnLeftText || hero.columnText || hero.text || name
            : hero.columnRightText || hero.columnText || hero.text || name;
        return (
          <p className="tcc-hero-col-text" style={textFormatToCss(hero.format)}>
            {text}
          </p>
        );
      }
      return <span className="tcc-hero-col-empty" aria-hidden />;
    }

    function heroBackdrop(photoClass: string, fallbackClass?: string) {
      const fallback = fallbackClass || photoClass.replace("tcc-hero-photo", "tcc-hero-fallback");
      return (
        <>
          {showGradient ? (
            <div
              className={cn("tcc-hero-gradient", gradientOverlay && "tcc-hero-gradient-overlay")}
              style={{ background: gradientCss }}
              aria-hidden
            />
          ) : null}
          {showPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={hero.imageUrl} alt="" className={photoClass} />
          ) : !showGradient ? (
            <div className={fallback} />
          ) : null}
        </>
      );
    }

    if (layout === "logo_top") {
      return (
        <div
          key={hero.id}
          className={cn(
            "tcc-hero tcc-hero-logo-top",
            outlined && "tcc-hero-outlined",
            selectedSectionId === hero.id && "tcc-section-selected"
          )}
          {...sectionDomProps(hero.id, selectedSectionId)}
        >
          {showLogo && logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoSrc}
              alt={businessName}
              className="tcc-top-logo"
              style={{
                transform: `translate(${ox}px, ${oy}px) scale(${scale})`,
                width: `${Math.round(72 * scale)}px`,
                height: `${Math.round(72 * scale)}px`,
              }}
            />
          ) : null}
          {heroBackdrop(
            "tcc-hero-photo tcc-hero-photo-under",
            "tcc-hero-fallback tcc-hero-photo-under"
          )}
        </div>
      );
    }

    if (layout === "columns") {
      return (
        <div
          key={hero.id}
          className={cn(
            "tcc-hero tcc-hero-columns",
            outlined && "tcc-hero-outlined",
            selectedSectionId === hero.id && "tcc-section-selected"
          )}
          {...sectionDomProps(hero.id, selectedSectionId)}
          style={showGradient && !showPhoto ? { background: gradientCss } : undefined}
        >
          {showPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={hero.imageUrl} alt="" className="tcc-hero-columns-bg" aria-hidden />
          ) : null}
          {gradientOverlay && showPhoto ? (
            <div
              className="tcc-hero-gradient tcc-hero-gradient-overlay"
              style={{ background: gradientCss }}
              aria-hidden
            />
          ) : null}
          <div className="tcc-hero-col">{cell(hero.columnLeft || "image", "left")}</div>
          <div className="tcc-hero-col">{cell(hero.columnRight || "text", "right")}</div>
        </div>
      );
    }

    return (
      <div
        key={hero.id}
        className={cn(
          "tcc-hero",
          outlined && "tcc-hero-outlined",
          selectedSectionId === hero.id && "tcc-section-selected"
        )}
        {...sectionDomProps(hero.id, selectedSectionId)}
      >
        {!showPhoto && showGradient ? null : (
          <div className="tcc-hero-mesh" aria-hidden>
            <span className="tcc-orb tcc-orb-a" />
            <span className="tcc-orb tcc-orb-b" />
            <span className="tcc-orb tcc-orb-c" />
          </div>
        )}
        {heroBackdrop("tcc-hero-photo")}
        {showPhoto || gradientOverlay ? <div className="tcc-hero-veil" /> : null}

        {showLogo ? (
          <a
            href={hero.href || profile.website || "#"}
            className="tcc-seal tcc-logo-window"
            style={{
              transform: `translate(calc(-50% + ${ox}px), calc(-50% + ${oy}px)) scale(${scale})`,
            }}
            onClick={(e) => {
              if (!hero.href && !profile.website) e.preventDefault();
            }}
          >
            {logoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoSrc} alt={businessName} className="tcc-seal-img" />
            ) : (
              <span className="tcc-seal-initial">{initial}</span>
            )}
          </a>
        ) : null}

        {hero.showCallBadge && profile.phone ? (
          <a
            href={`tel:${profile.phone.replace(/[^\d+]/g, "")}`}
            className="tcc-call-fab"
            onClick={() => onAction?.("call", "fab")}
          >
            <PremiumIcon icon="phone" sizePx={22} />
            <span>Click to Call</span>
          </a>
        ) : null}
      </div>
    );
  }

  function renderIdentity(identity: TapCardSection) {
    return (
      <div
        key={identity.id}
        className={cn("tcc-identity", selectedSectionId === identity.id && "tcc-section-selected")}
        style={textFormatToCss(config.titleFormat)}
        {...sectionDomProps(identity.id, selectedSectionId)}
      >
        <p
          className="tcc-name"
          style={textFormatToCss({ ...config.titleFormat, ...identity.format })}
        >
          {identity.name || name}
        </p>
        {identity.title ? (
          <p className="tcc-role" style={textFormatToCss(config.bodyFormat)}>
            {identity.title}
          </p>
        ) : null}
        {identity.organization ? (
          <p className="tcc-org" style={textFormatToCss(config.bodyFormat)}>
            {identity.organization}
          </p>
        ) : null}
        {identity.headline ? (
          <p
            className="tcc-headline"
            style={textFormatToCss({
              ...config.bodyFormat,
              italic: true,
              ...identity.format,
            })}
          >
            {identity.headline}
          </p>
        ) : null}
      </div>
    );
  }

  function renderImage(section: TapCardSection) {
    if (!section.imageUrl) return null;
    const width = `${section.imageWidthPercent ?? 100}%`;
    const radius = shapeRadius(section.imageRadius, "rounded_md");
    const opacity = (section.opacity ?? 100) / 100;
    const img = (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={section.imageUrl}
        alt={section.altText || ""}
        className="tcc-image-block"
        style={{ width, borderRadius: radius, opacity }}
      />
    );
    if (section.href) {
      return (
        <a
          key={section.id}
          href={section.href}
          className={cn(
            "tcc-image-wrap",
            selectedSectionId === section.id && "tcc-section-selected"
          )}
          {...sectionDomProps(section.id, selectedSectionId)}
          target="_blank"
          rel="noopener noreferrer"
        >
          {img}
        </a>
      );
    }
    return (
      <div
        key={section.id}
        className={cn(
          "tcc-image-wrap",
          selectedSectionId === section.id && "tcc-section-selected"
        )}
        {...sectionDomProps(section.id, selectedSectionId)}
      >
        {img}
      </div>
    );
  }

  function renderLogoBlock(section: TapCardSection) {
    const scale = (section.logoScale ?? 100) / 100;
    const layout = section.logoBlockLayout || "columns";
    const leftKind = section.columnLeft || "logo";
    const rightKind = section.columnRight || "text";

    function cell(
      kind: "logo" | "text" | "image" | "empty" | undefined,
      side: "left" | "right"
    ) {
      const href =
        side === "left"
          ? section.columnLeftHref || (kind === "logo" ? section.href : undefined)
          : section.columnRightHref || undefined;
      const wrap = (node: ReactNode) => {
        if (!href?.trim()) return node;
        return (
          <a
            href={href.trim()}
            className="tcc-logo-block-link"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onAction?.("logo_block", section.id)}
          >
            {node}
          </a>
        );
      };

      if (kind === "logo" || kind === "image") {
        const src =
          side === "left"
            ? section.logoUrl ||
              section.columnLeftImageUrl ||
              section.imageUrl ||
              logoUrl
            : section.columnRightImageUrl || section.logoUrl || section.imageUrl || logoUrl;
        if (!src) return <span className="tcc-logo-block-empty" aria-hidden />;
        return wrap(
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={section.altText || businessName}
            className="tcc-logo-block-img"
            style={{
              transform: `scale(${scale})`,
              maxWidth: `${Math.round(120 * scale)}px`,
              maxHeight: `${Math.round(72 * scale)}px`,
            }}
          />
        );
      }

      if (kind === "text") {
        const text =
          side === "left"
            ? section.columnLeftText || section.text || name
            : section.columnRightText || section.textRight || section.text || "";
        if (!text) return <span className="tcc-logo-block-empty" aria-hidden />;
        return wrap(
          <p
            className="tcc-logo-block-text"
            style={{
              color: section.textColor,
              ...textFormatToCss(section.format || config.bodyFormat),
            }}
          >
            {text}
          </p>
        );
      }

      return <span className="tcc-logo-block-empty" aria-hidden />;
    }

    if (layout === "stack") {
      return (
        <div
          key={section.id}
          className={cn(
            "tcc-logo-block tcc-logo-block-stack",
            selectedSectionId === section.id && "tcc-section-selected"
          )}
          style={{ backgroundColor: section.backgroundColor }}
          {...sectionDomProps(section.id, selectedSectionId)}
        >
          {leftKind !== "empty" ? cell(leftKind, "left") : null}
          {rightKind !== "empty" ? cell(rightKind, "right") : null}
        </div>
      );
    }

    return (
      <div
        key={section.id}
        className={cn(
          "tcc-logo-block tcc-logo-block-columns",
          selectedSectionId === section.id && "tcc-section-selected"
        )}
        style={{ backgroundColor: section.backgroundColor }}
        {...sectionDomProps(section.id, selectedSectionId)}
      >
        <div className="tcc-logo-block-col">{cell(leftKind, "left")}</div>
        <div className="tcc-logo-block-col">{cell(rightKind, "right")}</div>
      </div>
    );
  }

  function renderText(section: TapCardSection) {
    return (
      <div
        key={section.id}
        className={cn("tcc-text-block", selectedSectionId === section.id && "tcc-section-selected")}
        style={{
          backgroundColor: section.backgroundColor,
          color: section.textColor,
          ...textFormatToCss(section.format),
        }}
        {...sectionDomProps(section.id, selectedSectionId)}
      >
        {section.text}
      </div>
    );
  }

  function renderSpacer(section: TapCardSection) {
    const h = section.height === "sm" ? 12 : section.height === "lg" ? 36 : 22;
    return (
      <div
        key={section.id}
        className={cn("tcc-spacer", selectedSectionId === section.id && "tcc-section-selected")}
        style={{ height: h }}
        {...sectionDomProps(section.id, selectedSectionId)}
      />
    );
  }

  function renderFooter(footer: TapCardSection) {
    return (
      <div
        key={footer.id}
        className={cn(
          "tcc-footer-cta",
          finishClass(sectionFinish(footer, "neon"), "tcc-pill"),
          selectedSectionId === footer.id && "tcc-section-selected"
        )}
        {...sectionDomProps(footer.id, selectedSectionId)}
      >
        <div className="tcc-footer-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={TAP_CONNECT_LOGO} alt="" className="tcc-footer-logo" />
          <div>
            <p className="tcc-footer-title" style={textFormatToCss(footer.format)}>
              {footer.text || "Want a card like this?"}
            </p>
            <p className="tcc-footer-body">
              {footer.description || "Offers, reviews, and follow-up — one tap."}
            </p>
          </div>
        </div>
        <Link
          href={footer.href || "/sign-up"}
          className="tcc-footer-btn"
          onClick={() => onAction?.("footer_cta", footer.id)}
        >
          {footer.buttonLabel || "Get Tap Connect"}
          <ChevronRight className="size-4" />
        </Link>
      </div>
    );
  }

  function renderActionBatch(actions: TapCardSection[], peekOnly: boolean) {
    const visible = peekOnly ? actions.slice(0, peekCount) : actions;
    const rows = groupActionsForLayout(visible, config.actionsLayout);
    return (
      <div
        key={`actions-${actions[0]?.id ?? "batch"}`}
        className={cn(
          "tcc-actions",
          config.actionsLayout === "grid_2" && "tcc-actions-grid",
          config.actionsLayout === "icon_row" && "tcc-actions-icon-row",
          peekOnly && "tcc-actions-peek"
        )}
      >
        {rows.map((row, ri) => (
          <div
            key={ri}
            className={cn(
              "tcc-action-row",
              row.length === 2 && config.actionsLayout === "grid_2" && "tcc-action-row-2"
            )}
          >
            {row.map((section) => (
              <ActionPill
                key={section.id}
                section={section}
                selected={selectedSectionId === section.id}
                defaultFinish={config.defaultFinish}
                defaultShape={config.defaultShape}
                actionsLayout={config.actionsLayout}
                defaultPill={config.pillColor}
                defaultPillText={config.pillTextColor}
                defaultNeon={config.neonColor}
                avatarUrl={mark}
                onActivate={() => void handleAction(section)}
              />
            ))}
          </div>
        ))}
      </div>
    );
  }

  const outerNodes: ReactNode[] = [];
  const bodyNodes: ReactNode[] = [];
  let i = 0;
  let collapseShown = false;

  while (i < sections.length) {
    const s = sections[i];

    if (compact && (s.type === "promo_header" || s.type === "hero" || s.type === "identity")) {
      i++;
      continue;
    }

    if (s.type === "promo_header") {
      const pinTop = s.pinTop !== false;
      if (pinTop) outerNodes.push(renderPromo(s, false));
      else bodyNodes.push(renderPromo(s, true));
      i++;
      continue;
    }

    if (s.type === "action") {
      const batch: TapCardSection[] = [];
      while (i < sections.length && sections[i].type === "action") {
        batch.push(sections[i]);
        i++;
      }

      if (config.collapsible && !forceExpanded && !compact && !collapseShown) {
        bodyNodes.push(
          <button
            key="collapse-toggle"
            type="button"
            className="tcc-collapse-toggle"
            onClick={() => setCollapsed((c) => !c)}
          >
            {collapsed ? (
              <>
                Expand card <ChevronDown className="inline size-4" />
              </>
            ) : (
              <>
                Collapse card <ChevronDown className="inline size-4 rotate-180" />
              </>
            )}
          </button>
        );
        collapseShown = true;
      }

      bodyNodes.push(renderActionBatch(batch, collapsed && !forceExpanded));
      continue;
    }

    if (s.type === "footer_cta" && collapsed && !forceExpanded && !compact) {
      i++;
      continue;
    }

    switch (s.type) {
      case "hero":
        bodyNodes.push(renderHero(s));
        break;
      case "identity":
        bodyNodes.push(renderIdentity(s));
        break;
      case "image":
        bodyNodes.push(renderImage(s));
        break;
      case "logo_block":
        bodyNodes.push(renderLogoBlock(s));
        break;
      case "special_offer":
        bodyNodes.push(renderSpecialOffer(s));
        break;
      case "text":
        bodyNodes.push(renderText(s));
        break;
      case "spacer":
        bodyNodes.push(renderSpacer(s));
        break;
      case "footer_cta":
        bodyNodes.push(renderFooter(s));
        break;
      default:
        break;
    }
    i++;
  }

  return (
    <div
      className={cn(
        "tcc",
        finishClass(config.cardFinish, "tcc-shell-finish"),
        config.view3d && "tcc-view-3d",
        className
      )}
      style={style}
    >
      {config.showHeaderLogo === true && (config.headerLogoUrl || logoUrl) ? (
        <div className="tcc-header-logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={config.headerLogoUrl || logoUrl || ""}
            alt={businessName}
            className="tcc-header-logo-img"
            style={{
              maxHeight: `${Math.round(2.75 * ((config.headerLogoScale ?? 100) / 100))}rem`,
              maxWidth: `${Math.round(4.25 * ((config.headerLogoScale ?? 100) / 100))}rem`,
            }}
          />
        </div>
      ) : null}
      {outerNodes}
      <div
        className="tcc-shell"
        style={
          shellBackground
            ? {
                background: shellBackground,
              }
            : undefined
        }
      >
        {bodyNodes}
      </div>
      {toast ? <p className="tcc-toast">{toast}</p> : null}
    </div>
  );
}

function ActionPill({
  section,
  selected,
  defaultFinish,
  defaultShape,
  actionsLayout,
  defaultPill,
  defaultPillText,
  defaultNeon,
  avatarUrl,
  onActivate,
}: {
  section: TapCardSection;
  selected?: boolean;
  defaultFinish: TapConnectCardConfig["defaultFinish"];
  defaultShape: TapConnectCardConfig["defaultShape"];
  actionsLayout: TapConnectCardConfig["actionsLayout"];
  defaultPill?: string;
  defaultPillText?: string;
  defaultNeon?: string;
  avatarUrl?: string | null;
  onActivate: () => void;
}) {
  const kind = section.actionKind || "custom";
  const icon = section.icon || kind;
  const finish = sectionFinish(section, defaultFinish);
  const brand = !section.iconUrl && !section.iconColor ? socialBrandStyle(icon) : undefined;
  const shape = normalizeShape(section.shape, defaultShape);
  const radius = shapeRadius(shape);
  const neon = section.neonColor || defaultNeon;
  const opacity = (section.opacity ?? 100) / 100;
  const iconOnly = actionsLayout === "icon_row";

  return (
    <button
      type="button"
      className={cn(
        "tcc-pill",
        finishClass(finish, "tcc-pill"),
        shape === "circle" && "tcc-pill-circle",
        iconOnly && "tcc-pill-icon-only",
        selected && "tcc-section-selected"
      )}
      {...sectionDomProps(section.id, selected ? section.id : null)}
      style={
        {
          "--tcc-accent": section.accentColor || undefined,
          "--tcc-neon": neon || undefined,
          borderRadius: radius,
          backgroundColor: section.backgroundColor || defaultPill,
          color: section.textColor || defaultPillText,
          opacity,
          ...(finish === "brand" && brand ? brand : {}),
        } as CSSProperties
      }
      onClick={onActivate}
    >
      <span className="tcc-pill-icon" style={finish === "brand" ? brand : undefined}>
        {kind === "vcard" && avatarUrl && !section.iconUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="tcc-pill-avatar" />
        ) : (
          <PremiumIcon
            icon={icon}
            customUrl={section.iconUrl}
            color={section.iconColor}
            sizePx={18}
          />
        )}
      </span>
      <span
        className={cn("tcc-pill-label", iconOnly && "sr-only")}
        style={textFormatToCss(section.format)}
      >
        {section.label || kind}
      </span>
      {!iconOnly ? <ChevronRight className="tcc-pill-chevron" /> : null}
    </button>
  );
}
