"use client";

import { CardSupportForm, type CardSupportContext } from "@/components/fusion/card/card-support-form";
import {
  CardOfferClaimForm,
  type CardOfferContext,
} from "@/components/fusion/card/card-offer-claim-form";
import { useMemo, useRef, useState, type CSSProperties, type DragEvent, type MouseEvent, type PointerEvent, type ReactNode } from "react";
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
import {
  buttonLayoutInlineStyle,
  iconSizePx,
  isIconAfterPlacement,
  normalizeIconPlacement,
} from "@/lib/design/button-layout";
import { socialBrandStyle } from "@/components/tap/social-icons";
import { updateButtonLabel } from "@/lib/fusion/creative-studio/button-composition";
import { TAP_CONNECT_LOGO } from "@/lib/brand/assets";
import { cn, firstImageUrl } from "@/lib/utils";
import {
  applyResolvedToSectionStyle,
  buildActionPropertyMap,
} from "@/lib/fusion/authoring/card-visual-resolve";
import { resolveItemProperties } from "@/lib/fusion/authoring/visual-property";
import {
  blocksCustomerActivation,
  type CreativeStudioMode,
} from "@/lib/fusion/creative-studio/modes";
import { CreativeCompositionCanvas } from "@/components/fusion/creative-studio/creative-composition-canvas";
import { CreativeDomRenderer } from "@/components/fusion/creative-platform/creative-dom-renderer";
import { compositionBlockToRenderDocument } from "@/lib/fusion/creative-platform/composition-adapter";
import {
  createStarterCreativeComposition,
  parseCreativeComposition,
  type CreativeCompositionBlock,
} from "@/lib/fusion/creative-studio/composition";
import { isCardBlockLinkEligible } from "@/lib/fusion/card/block-model";
import { fitRootCanvasToContent, rootCanvasAutoHeight } from "@/lib/fusion/card/composer-model";
import { autoScrollForPointer } from "@/lib/fusion/creative-studio/autoscroll";

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
  /**
   * Creative Studio interaction contract:
   * edit = select only · preview = safe activate · public = live.
   * Defaults to edit when builderChrome is set, otherwise public.
   */
  interactionMode?: CreativeStudioMode;
  /** Direct canvas selection — Edit mode only */
  onSectionSelect?: (sectionId: string | null) => void;
  /** Composition node selection (Edit) when a Creative Composition section is active */
  selectedCompositionNodeIds?: string[];
  onCompositionNodeSelect?: (sectionId: string | null, nodeIds: string[]) => void;
  onCompositionChange?: (
    sectionId: string | null,
    composition: CreativeCompositionBlock,
    label?: string
  ) => void;
  onComposerDrop?: (payload: { level: "section" | "element"; kind: string }, sectionId?: string) => void;
  onSectionReorder?: (fromSectionId: string, toSectionId: string) => void;
  onSectionResize?: (sectionId: string, heightPx: number) => void;
  onElementMove?: (elementId: string, toSectionId: string | null) => void;
  onElementWrap?: (elementId: string, fromSectionId: string | null) => void;
  /** Force composition phone fallback (narrow preview) */
  compositionForceMobile?: boolean;
  previewMotion?: boolean;
  reducedMotionSimulation?: boolean;
  motionRevision?: number;
  /** Public/runtime context for platform-bound actions (e.g. Ask a Question) */
  supportContext?: Omit<CardSupportContext, "sectionId" | "businessName"> | null;
  /** Public/runtime context for Offer fuse claim path */
  offerContext?: Omit<CardOfferContext, "sectionId" | "businessName" | "offerTitle" | "offerDescription" | "offerCode" | "offerExpires" | "offerCta" | "offerBlockId"> | null;
  /** When true, campaign-bound Spotlight uses claim form instead of bare link */
  offerFuseEnabled?: boolean;
  /** Preview-safe: consequential actions show honest messages instead of live side effects */
  previewSafe?: boolean;
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
  interactionMode,
  onSectionSelect,
  selectedCompositionNodeIds = [],
  onCompositionNodeSelect,
  onCompositionChange,
  onComposerDrop,
  onSectionReorder,
  onSectionResize,
  onElementMove,
  onElementWrap,
  compositionForceMobile = false,
  previewMotion = false,
  reducedMotionSimulation = false,
  motionRevision = 0,
  supportContext = null,
  offerContext = null,
  offerFuseEnabled = false,
  previewSafe = false,
  className = "",
  onAction,
}: TapConnectCardProps) {
  const mode: CreativeStudioMode =
    interactionMode ?? (builderChrome ? "edit" : "public");
  const editSelects = blocksCustomerActivation(mode);
  const [collapsed, setCollapsed] = useState(
    !forceExpanded && config.collapsible && config.defaultCollapsed
  );
  const [toast, setToast] = useState<string | null>(null);
  const [openOffers, setOpenOffers] = useState<Record<string, boolean>>({});
  const [supportSectionId, setSupportSectionId] = useState<string | null>(null);
  const [claimSectionId, setClaimSectionId] = useState<string | null>(null);
  const [sectionDropTargetId, setSectionDropTargetId] = useState<string | null>(null);
  const [sectionDragId, setSectionDragId] = useState<string | null>(null);
  const [rootHeightDraft, setRootHeightDraft] = useState<number | null>(null);
  const rootResizeRef = useRef<{ startY: number; startHeight: number; nextHeight: number; scale: number; moved: boolean } | null>(null);
  const suppressRootResizeClickRef = useRef(false);

  const sections = useMemo(
    () => sortTapCardSections(config.sections).filter((s) => s.enabled),
    [config.sections]
  );

  const name = profile.displayName || profile.organization || businessName;
  const initial = (name.trim()[0] || "?").toUpperCase();
  const mark = firstImageUrl(logoUrl, sections.find((s) => s.type === "hero")?.logoUrl);

  const surfaceAlpha = Math.min(100, Math.max(35, config.surfaceOpacity ?? 100)) / 100;

  const shellBackground =
    config.surfaceFill === "gradient"
      ? buildGradientCss(
          config.surfaceGradientStart || config.surfaceColor,
          config.surfaceGradientEnd || config.accentColor,
          config.surfaceGradientAngle ?? 160
        )
      : undefined;
  const rootImage = config.rootBackgroundImageUrl;
  const rootOverlay = config.rootOverlayColor || "#000000";
  const rootOverlayAlpha = Math.round(
    Math.max(0, Math.min(1, config.rootOverlayOpacity ?? 0)) * 255
  ).toString(16).padStart(2, "0");
  const rootBackground = rootImage
    ? `linear-gradient(${rootOverlay}${rootOverlayAlpha}, ${rootOverlay}${rootOverlayAlpha}), url("${rootImage.replaceAll('"', "%22")}")`
    : shellBackground;

  function commitRootCanvasHeight(heightPx: number, label: string) {
    const root = parseCreativeComposition(config.rootComposition) || {
      version: 1 as const,
      id: "card-root-composition",
      label: "Card root Elements",
      nodes: [],
      background: { kind: "none" as const },
      mobileFallback: "scale" as const,
      safeAreaPaddingPx: config.rootCanvasPaddingPx ?? 12,
    };
    onCompositionChange?.(null, { ...root, pageHeightPx: Math.max(240, Math.min(2400, Math.round(heightPx))) }, label);
  }

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
      livingCardUrl:
        typeof window !== "undefined" ? window.location.href.split("#")[0] : undefined,
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

  function selectSection(sectionId: string, e?: MouseEvent) {
    if (!editSelects) return false;
    e?.preventDefault();
    e?.stopPropagation();
    onSectionSelect?.(sectionId);
    return true;
  }

  async function handleAction(section: TapCardSection) {
    if (editSelects) {
      onSectionSelect?.(section.id);
      return;
    }

    const kind = section.actionKind;
    onAction?.(kind || section.type, section.id);

    if (kind === "vcard") {
      if (previewSafe || mode === "preview") {
        setToast("Save Contact is available in Preview — contact file opens on this device.");
        window.setTimeout(() => setToast(null), 3600);
      }
      await downloadVcf();
      return;
    }
    if (kind === "support") {
      if (!supportContext?.businessId) {
        setToast(
          mode === "preview" || previewSafe
            ? "This action is visible in Preview, but no live message will be sent."
            : builderChrome
              ? "Ask a Question is available on the public Card after publish"
              : "Support is temporarily unavailable"
        );
        window.setTimeout(() => setToast(null), 3600);
        return;
      }
      if (mode === "preview" || previewSafe) {
        setToast("This action is visible in Preview, but no live message will be sent.");
        window.setTimeout(() => setToast(null), 3600);
        return;
      }
      setSupportSectionId(section.id);
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
          if (selectSection(promo.id, e)) return;
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
    const linkedEligible = !section.linkedCampaignId || isCardBlockLinkEligible(section);
    const rawMode = section.offerMode === "campaign" && !linkedEligible ? "expand" : section.offerMode || "link";
    const fuseCampaign =
      offerFuseEnabled &&
      rawMode === "campaign" &&
      Boolean(section.linkedCampaignId) &&
      Boolean(offerContext?.businessId);
    const offerMode = fuseCampaign ? "fuse" : rawMode === "campaign" ? "link" : rawMode;
    const href = section.href?.trim();
    const campaignLinked = Boolean(section.linkedCampaignId);
    const open =
      openOffers[section.id] !== undefined
        ? openOffers[section.id]
        : Boolean(section.offerDefaultOpen);
    const claiming = claimSectionId === section.id;

    function activate(e: MouseEvent) {
      if (selectSection(section.id, e)) return;
      onAction?.("special_offer", section.id);
      if ((mode === "preview" || previewSafe) && offerMode === "fuse") {
        e.preventDefault();
        setToast("This offer is visible in Preview, but no live claim will be recorded.");
        window.setTimeout(() => setToast(null), 3600);
        return;
      }
      if (offerMode === "fuse") {
        e.preventDefault();
        setClaimSectionId((prev) => (prev === section.id ? null : section.id));
        return;
      }
      if (offerMode === "expand") {
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
        {section.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={section.imageUrl} alt={section.altText || ""} className="mr-3 h-16 w-16 shrink-0 rounded-lg object-cover" />
        ) : null}
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
          {offerMode === "fuse"
            ? claiming
              ? "Hide offer"
              : section.offerCta || "Claim offer"
            : offerMode === "expand"
              ? open
                ? "Hide offer"
                : section.offerCta || "View offer"
              : section.offerCta || (campaignLinked ? "Open campaign" : "Open")}
          <ChevronRight className={cn("size-4", (open || claiming) && (offerMode === "expand" || offerMode === "fuse") && "rotate-90")} />
        </span>
      </>
    );

    const offerPanel =
      offerMode === "expand" && open ? (
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
          {section.offerValue ? <p className="tcc-special-offer-body">Value: {section.offerValue}</p> : null}
          {section.offerTerms ? <p className="tcc-special-offer-body">Terms: {section.offerTerms}</p> : null}
          {section.redemptionInstructions ? <p className="tcc-special-offer-body">How to redeem: {section.redemptionInstructions}</p> : null}
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

    const fusePanel =
      offerMode === "fuse" && claiming && offerContext?.businessId && section.linkedCampaignId ? (
        <div className="mt-2 px-1">
          <CardOfferClaimForm
            context={{
              businessId: offerContext.businessId,
              campaignId: section.linkedCampaignId,
              deviceSlotId: offerContext.deviceSlotId,
              sectionId: section.id,
              offerBlockId: section.offerBlockId,
              businessName,
              offerTitle: section.offerTitle || section.headline,
              offerDescription: section.offerDescription || section.description,
              offerCode: section.offerCode,
              offerExpires: section.offerExpires,
              offerCta: section.offerCta,
              lockedUntilContact: true,
            }}
            onClose={() => setClaimSectionId(null)}
          />
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

    if (offerMode === "link" && href && href !== "#") {
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
        {fusePanel}
      </div>
    );
  }

  function renderHero(hero: TapCardSection) {
    const logoSrc = firstImageUrl(hero.logoUrl, logoUrl, profile.photoUrl);
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
    // Shared typeface / tracking / align from Identity controls — applied to every line.
    // Size/weight stay line-appropriate (name = title scale; others = body scale).
    const sharedType = {
      fontFamily: identity.format?.fontFamily,
      letterSpacing: identity.format?.letterSpacing,
      align: identity.format?.align,
      uppercase: identity.format?.uppercase,
    };
    const colors = identity.lineColors ?? {};

    return (
      <div
        key={identity.id}
        className={cn("tcc-identity", selectedSectionId === identity.id && "tcc-section-selected")}
        style={textFormatToCss({ ...config.titleFormat, ...sharedType })}
        {...sectionDomProps(identity.id, selectedSectionId)}
      >
        <p
          className="tcc-name"
          style={textFormatToCss({
            ...config.titleFormat,
            ...identity.format,
            color: colors.name ?? identity.format?.color,
          })}
        >
          {identity.name || name}
        </p>
        {identity.title ? (
          <p
            className="tcc-role"
            style={{
              ...textFormatToCss({
                ...config.bodyFormat,
                ...sharedType,
                color: colors.title,
              }),
              ...(colors.title ? { opacity: 1 } : {}),
            }}
          >
            {identity.title}
          </p>
        ) : null}
        {identity.organization ? (
          <p
            className="tcc-org"
            style={{
              ...textFormatToCss({
                ...config.bodyFormat,
                ...sharedType,
                color: colors.organization,
              }),
              ...(colors.organization ? { opacity: 1 } : {}),
            }}
          >
            {identity.organization}
          </p>
        ) : null}
        {identity.headline ? (
          <p
            className="tcc-headline"
            style={{
              ...textFormatToCss({
                ...config.bodyFormat,
                italic: true,
                ...sharedType,
                color: colors.headline,
              }),
              ...(colors.headline ? { opacity: 1 } : {}),
            }}
          >
            {identity.headline}
          </p>
        ) : null}
      </div>
    );
  }

  function renderImage(section: TapCardSection) {
    if (!section.imageUrl) {
      if (!builderChrome) return null;
      return (
        <button
          key={section.id}
          type="button"
          className={cn("mx-3 flex min-h-28 w-[calc(100%-1.5rem)] items-center justify-center rounded-xl border border-dashed border-black/20 bg-black/5 text-sm opacity-60", selectedSectionId === section.id && "tcc-section-selected")}
          {...sectionDomProps(section.id, selectedSectionId)}
          onClick={(event) => selectSection(section.id, event)}
        >
          Choose an image
        </button>
      );
    }
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

  function renderGallery(section: TapCardSection) {
    const images = (section.imageUrls || []).filter(Boolean);
    if (!images.length && !builderChrome) return null;
    return (
      <div key={section.id} className={cn("mx-3 grid grid-cols-2 gap-2", selectedSectionId === section.id && "tcc-section-selected")} {...sectionDomProps(section.id, selectedSectionId)}>
        {images.length ? images.map((url, index) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={`${url}-${index}`} src={url} alt={`${section.altText || "Gallery image"} ${index + 1}`} className="aspect-square w-full rounded-lg object-cover" />
        )) : <button type="button" className="col-span-2 min-h-28 rounded-xl border border-dashed border-black/20 bg-black/5 text-sm opacity-60" onClick={(event) => selectSection(section.id, event)}>Add gallery images</button>}
      </div>
    );
  }

  function renderVideo(section: TapCardSection) {
    const url = section.videoUrl?.trim();
    return (
      <div key={section.id} className={cn("mx-3 overflow-hidden rounded-xl border border-black/10 bg-black/5", selectedSectionId === section.id && "tcc-section-selected")} {...sectionDomProps(section.id, selectedSectionId)}>
        {url ? <video className="aspect-video w-full bg-black" src={url} controls preload="metadata" /> : builderChrome ? <button type="button" className="flex aspect-video w-full items-center justify-center text-sm opacity-60" onClick={(event) => selectSection(section.id, event)}>Add a video URL</button> : null}
        {section.text ? <p className="px-3 py-2 text-sm font-medium">{section.text}</p> : null}
      </div>
    );
  }

  function renderInfoBlock(section: TapCardSection) {
    const isMap = section.type === "map" || section.type === "location";
    const href = isMap && section.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(section.address)}` : section.href;
    const title = section.text || section.headline || section.label;
    return (
      <div key={section.id} className={cn("mx-3 rounded-xl border border-black/10 bg-white/55 p-4", selectedSectionId === section.id && "tcc-section-selected")} {...sectionDomProps(section.id, selectedSectionId)}>
        {title ? <p className="font-semibold">{title}</p> : null}
        {section.description ? <p className="mt-1 text-sm opacity-70">{section.description}</p> : null}
        {section.hoursLines?.length ? <ul className="mt-2 space-y-1 text-sm">{section.hoursLines.map((line, index) => <li key={`${line}-${index}`}>{line}</li>)}</ul> : null}
        {section.address ? <p className="mt-2 text-sm">{section.address}</p> : null}
        {href ? <a href={href} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex rounded-full bg-black px-4 py-2 text-xs font-semibold text-white" onClick={(event) => { if (selectSection(section.id, event)) return; onAction?.(section.type, section.id); }}>{section.buttonLabel || "Open"}</a> : null}
      </div>
    );
  }

  function renderRelationship(section: TapCardSection) {
    const tapSave = section.type === "tapsave_prompt";
    return (
      <div key={section.id} className={cn("mx-3 rounded-xl border border-black/10 bg-white/55 p-4", selectedSectionId === section.id && "tcc-section-selected")} {...sectionDomProps(section.id, selectedSectionId)}>
        <p className="font-semibold">{section.text || section.label}</p>
        {section.description ? <p className="mt-1 text-sm opacity-70">{section.description}</p> : null}
        {!tapSave ? section.fields?.map((field) => <label key={field.id} className="mt-3 block text-xs font-medium">{field.label}{field.required ? " *" : ""}<input type={field.type} disabled className="mt-1 block min-h-10 w-full rounded-lg border border-black/15 bg-white px-3" /></label>) : null}
        {section.consentText ? <p className="mt-3 text-[11px] opacity-60">{section.consentText}</p> : null}
        {tapSave ? <a href="#card-utility-layer" className="mt-3 inline-flex rounded-full bg-black px-4 py-2 text-xs font-semibold text-white" onClick={(event) => { if (selectSection(section.id, event)) return; onAction?.("tapsave", section.id); }}>{section.buttonLabel || "Save this Card"}</a> : <button type="button" disabled={!supportContext?.businessId} className="mt-3 rounded-full bg-black px-4 py-2 text-xs font-semibold text-white disabled:opacity-60" onClick={(event) => { if (selectSection(section.id, event)) return; if (mode === "preview" || previewSafe) { setToast("This form is visible in Preview, but no message will be sent."); window.setTimeout(() => setToast(null), 3200); return; } setSupportSectionId(section.id); }}>{section.buttonLabel || "Contact us"}</button>}
      </div>
    );
  }

  function renderConnected(section: TapCardSection) {
    const linked = Boolean(section.linkedObjectId || section.linkedCampaignId || section.linkedCampaignGroupId);
    const eligible = linked && isCardBlockLinkEligible(section);
    if (!eligible && section.fallbackMode === "HIDE" && !builderChrome) return null;
    return (
      <div key={section.id} className={cn("mx-3 rounded-xl border border-black/10 bg-white/55 p-4", selectedSectionId === section.id && "tcc-section-selected")} {...sectionDomProps(section.id, selectedSectionId)}>
        {builderChrome ? <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide opacity-50">{eligible ? `Linked to ${section.linkedObjectType?.replace(/_/g, " ")} — ${section.linkedObjectName || section.linkedCampaignTitle || section.linkedCampaignGroupTitle}` : `Fallback · ${section.fallbackMode || "LOCAL"}${section.linkedObjectStatus ? ` · linked ${section.linkedObjectStatus}` : ""}`}</p> : null}
        <p className="font-semibold">{eligible ? section.headline || section.linkedObjectName || section.label : section.fallbackText || section.headline || section.label}</p>
        {eligible && section.description ? <p className="mt-1 text-sm opacity-70">{section.description}</p> : null}
        {eligible && section.href ? <a href={section.href} className="mt-3 inline-flex rounded-full bg-black px-4 py-2 text-xs font-semibold text-white">{section.buttonLabel || "Open"}</a> : null}
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
            ? firstImageUrl(
                section.logoUrl,
                section.columnLeftImageUrl,
                section.imageUrl,
                logoUrl
              )
            : firstImageUrl(
                section.columnRightImageUrl,
                section.logoUrl,
                section.imageUrl,
                logoUrl
              );
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

  function renderCreativeComposition(section: TapCardSection) {
    const block =
      parseCreativeComposition(section.composition) ||
      createStarterCreativeComposition(section.id);
    return (
      <div
        key={section.id}
        className={cn(
          "tcc-creative-composition my-2",
          selectedSectionId === section.id && "tcc-section-selected"
        )}
        {...sectionDomProps(section.id, selectedSectionId)}
        data-testid={`creative-composition-section-${section.id}`}
      >
        {editSelects ? (
          <CreativeCompositionCanvas
            key={`${section.id}-motion-${motionRevision}`}
            block={block}
            editMode
            selectedNodeIds={
              selectedSectionId === section.id ? selectedCompositionNodeIds : []
            }
            forceMobileFallback={compositionForceMobile}
            previewMotion={previewMotion}
            reducedMotionSimulation={reducedMotionSimulation}
            onSelectNodes={(ids) => {
              onSectionSelect?.(section.id);
              onCompositionNodeSelect?.(section.id, ids);
            }}
            onChangeBlock={(next, label) =>
              onCompositionChange?.(section.id, next, label)
            }
          />
        ) : (
          <CreativeDomRenderer
            document={compositionBlockToRenderDocument(block)}
            label={block.label}
            forceMobileFallback={compositionForceMobile}
          />
        )}
      </div>
    );
  }

  function renderSurface(section: TapCardSection) {
    const block = parseCreativeComposition(section.composition) || {
      ...createStarterCreativeComposition(section.id),
      nodes: [],
    };
    const overlay = section.overlayColor || "#000000";
    const overlayAlpha = Math.round(Math.max(0, Math.min(1, section.overlayOpacity ?? 0)) * 255)
      .toString(16)
      .padStart(2, "0");
    const image = section.backgroundImageUrl;
    const shadow = section.surfaceShadow === "strong"
      ? "0 18px 45px rgba(0,0,0,.4)"
      : section.surfaceShadow === "medium"
        ? "0 10px 28px rgba(0,0,0,.3)"
        : section.surfaceShadow === "soft"
          ? "0 6px 18px rgba(0,0,0,.2)"
          : undefined;
    const padding = section.surfacePaddingPx ?? 24;
    const minHeight = section.surfaceMinHeightPx ?? 260;
    const exactHeight = section.surfaceExactHeightPx ?? minHeight;
    const coordinateHeight = section.surfaceCoordinateHeightPx ?? Math.max(80, minHeight - padding * 2);
    const backgroundKind = section.surfaceBackgroundKind || (image ? "image" : section.backgroundColor === "transparent" ? "transparent" : "solid");
    const surfaceBackgroundImage = backgroundKind === "image" && image
      ? `linear-gradient(${overlay}${overlayAlpha}, ${overlay}${overlayAlpha}), url("${image.replaceAll('"', "%22")}")`
      : backgroundKind === "gradient"
        ? `linear-gradient(${section.surfaceGradientAngle ?? 145}deg, ${section.surfaceGradientStart || section.backgroundColor || "#171b24"}, ${section.surfaceGradientEnd || "#0b0f19"})`
        : backgroundKind === "pattern"
          ? section.surfacePattern === "dots"
            ? `radial-gradient(circle, ${section.surfaceBorderColor || "#ffffff33"} 1.5px, transparent 1.5px)`
            : section.surfacePattern === "grid"
              ? `linear-gradient(${section.surfaceBorderColor || "#ffffff22"} 1px, transparent 1px), linear-gradient(90deg, ${section.surfaceBorderColor || "#ffffff22"} 1px, transparent 1px)`
              : `repeating-linear-gradient(135deg, ${section.backgroundColor || "#171b24"} 0 12px, ${section.surfaceGradientEnd || "#0b0f19"} 12px 24px)`
          : backgroundKind === "texture"
            ? section.surfaceTexture === "fabric"
              ? `repeating-linear-gradient(0deg, #ffffff08 0 1px, transparent 1px 4px), repeating-linear-gradient(90deg, #ffffff06 0 1px, transparent 1px 5px)`
              : section.surfaceTexture === "paper"
                ? `radial-gradient(circle at 20% 30%, #ffffff10 0 1px, transparent 2px), radial-gradient(circle at 70% 60%, #00000018 0 1px, transparent 2px)`
                : `repeating-radial-gradient(circle at 30% 40%, #ffffff08 0 1px, transparent 1px 3px)`
            : undefined;
    const glow = section.surfaceGlow === "strong" ? `0 0 34px ${section.surfaceBorderColor || "#b8ff2c"}` : section.surfaceGlow === "medium" ? `0 0 22px ${section.surfaceBorderColor || "#b8ff2c"}` : section.surfaceGlow === "soft" ? `0 0 12px ${section.surfaceBorderColor || "#b8ff2c"}` : undefined;
    const renderedBackgroundImage = (section.overlayOpacity ?? 0) > 0 && backgroundKind !== "image"
      ? [`linear-gradient(${overlay}${overlayAlpha}, ${overlay}${overlayAlpha})`, surfaceBackgroundImage].filter(Boolean).join(", ")
      : surfaceBackgroundImage;
    const beginSectionResize = (event: PointerEvent<HTMLButtonElement>, edge: "top" | "bottom" = "bottom") => {
      if (!editSelects || section.locked) return;
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.setPointerCapture?.(event.pointerId);
      const startY = event.clientY;
      const startHeight = section.surfaceHeightMode === "fixed" ? exactHeight : minHeight;
      const move = (moveEvent: globalThis.PointerEvent) => {
        const delta = moveEvent.clientY - startY;
        onSectionResize?.(section.id, Math.max(32, Math.min(2400, Math.round(startHeight + (edge === "bottom" ? delta : -delta)))));
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up, { once: true });
    };
    const beginSectionReorder = (event: PointerEvent<HTMLButtonElement>) => {
      if (!editSelects || section.locked) return;
      event.preventDefault();
      event.stopPropagation();
      setSectionDragId(section.id);
      const move = (moveEvent: globalThis.PointerEvent) => {
        const target = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY)?.closest<HTMLElement>("[data-section-id]");
        const targetId = target?.dataset.sectionId;
        setSectionDropTargetId(targetId && targetId !== section.id ? targetId : null);
        if (target) autoScrollForPointer(target, moveEvent.clientX, moveEvent.clientY);
      };
      const up = (upEvent: globalThis.PointerEvent) => {
        const target = document.elementFromPoint(upEvent.clientX, upEvent.clientY)?.closest<HTMLElement>("[data-section-id]");
        const targetId = target?.dataset.sectionId;
        if (targetId && targetId !== section.id) onSectionReorder?.(section.id, targetId);
        setSectionDragId(null);
        setSectionDropTargetId(null);
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up, { once: true });
    };
    return (
      <section
        key={section.id}
        className={cn("group/tcc-surface tcc-composer-surface relative my-2 overflow-hidden transition-[opacity,transform,box-shadow]", selectedSectionId === section.id && "tcc-section-selected", sectionDragId === section.id && "scale-[1.01] opacity-60 shadow-2xl")}
        style={{
          width: `${section.surfaceWidthPercent ?? 100}%`,
          minHeight,
          height: section.surfaceHeightMode === "fixed" ? exactHeight : undefined,
          padding,
          backgroundColor: backgroundKind === "transparent" ? "transparent" : section.backgroundColor || "transparent",
          backgroundImage: renderedBackgroundImage,
          backgroundRepeat: backgroundKind === "pattern" || backgroundKind === "texture" ? "repeat" : undefined,
          backgroundSize: backgroundKind === "pattern" ? "24px 24px" : backgroundKind === "texture" ? "8px 8px" : section.backgroundFit || "cover",
          backgroundPosition: section.backgroundPosition || "50% 50%",
          border: `${section.surfaceBorderWidthPx ?? 0}px solid ${section.surfaceBorderColor || "transparent"}`,
          borderRadius: section.surfaceRadiusPx ?? 18,
          boxShadow: [shadow, glow].filter(Boolean).join(", ") || undefined,
          opacity: (section.opacity ?? 100) / 100,
        }}
        {...sectionDomProps(section.id, selectedSectionId)}
        data-surface-kind={section.surfaceKind || "blank"}
        data-section-preset={section.sectionPresetId || undefined}
        data-surface-layout={section.surfaceLayout || "stack"}
        draggable={editSelects && !section.locked && selectedSectionId !== section.id}
        onDragStart={(event) => {
          if (event.target !== event.currentTarget) { event.preventDefault(); return; }
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("application/x-tap-card-section", section.id);
          setSectionDragId(section.id);
        }}
        onDragOver={(event) => {
          if (editSelects) { event.preventDefault(); setSectionDropTargetId(section.id); autoScrollForPointer(event.currentTarget, event.clientX, event.clientY); }
        }}
        onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setSectionDropTargetId(null); }}
        onDragEnd={() => { setSectionDragId(null); setSectionDropTargetId(null); }}
        onDrop={(event) => {
          if (!editSelects) return;
          event.preventDefault();
          event.stopPropagation();
          setSectionDropTargetId(null);
          const fromSectionId = event.dataTransfer.getData("application/x-tap-card-section");
          if (fromSectionId) {
            onSectionReorder?.(fromSectionId, section.id);
            return;
          }
          const elementId = event.dataTransfer.getData("application/x-composition-node");
          if (elementId) {
            onElementMove?.(elementId, section.id);
            return;
          }
          if (!onComposerDrop) return;
          try {
            const payload = JSON.parse(event.dataTransfer.getData("application/x-tap-card-composer"));
            onComposerDrop(payload, section.id);
          } catch {
            // Ignore unrelated drops.
          }
        }}
      >
        {editSelects && sectionDropTargetId === section.id ? <div className="pointer-events-none absolute -top-1 left-0 right-0 z-30 h-1 rounded-full bg-[#b8ff2c]" data-testid="section-drop-indicator" aria-hidden /> : null}
        {editSelects ? (
          <button
            type="button"
            draggable
            className={cn("absolute left-1/2 top-1 z-20 flex h-6 max-w-[70%] -translate-x-1/2 cursor-grab items-center justify-center gap-1 rounded bg-black/65 px-2 text-[9px] text-white/85 opacity-0 transition-opacity group-hover/tcc-surface:opacity-100 focus:opacity-100", selectedSectionId === section.id && "opacity-100")}
            aria-label={`Reorder ${section.label || "Section"}`}
            data-testid={`section-reorder-grip-${section.id}`}
            onPointerDown={beginSectionReorder}
            onClick={() => { onSectionSelect?.(section.id); onCompositionNodeSelect?.(section.id, []); }}
            onDragStart={(event) => {
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("application/x-tap-card-section", section.id);
              setSectionDragId(section.id);
            }}
            onDrag={(event) => {
              if (event.clientX || event.clientY) autoScrollForPointer(event.currentTarget, event.clientX, event.clientY);
            }}
            onDragEnd={() => { setSectionDragId(null); setSectionDropTargetId(null); }}
            onKeyDown={(event) => {
              if (event.key === "ArrowUp" || event.key === "ArrowDown") {
                event.preventDefault();
                const index = sections.findIndex((item) => item.id === section.id);
                const target = sections[index + (event.key === "ArrowUp" ? -1 : 1)];
                if (target) onSectionReorder?.(section.id, target.id);
              }
              if (event.key === "Home" && sections[0]) { event.preventDefault(); onSectionReorder?.(section.id, sections[0].id); }
              if (event.key === "End" && sections.at(-1)) { event.preventDefault(); onSectionReorder?.(section.id, sections.at(-1)!.id); }
            }}
          ><span aria-hidden>⋮⋮</span><span className="truncate">{section.label || "Section"}</span></button>
        ) : null}
        {editSelects && selectedSectionId === section.id ? (
          <details className="absolute right-1 top-1 z-20">
            <summary className="grid h-6 w-7 cursor-pointer list-none place-items-center rounded bg-black/65 text-xs text-white" aria-label="Section reorder menu">•••</summary>
            <div className="mt-1 grid w-28 gap-1 rounded bg-black/90 p-1 text-[10px] text-white shadow-xl">
              <button type="button" onClick={() => { const index = sections.findIndex((item) => item.id === section.id); if (sections[index - 1]) onSectionReorder?.(section.id, sections[index - 1]!.id); }}>Move up</button>
              <button type="button" onClick={() => { const index = sections.findIndex((item) => item.id === section.id); if (sections[index + 1]) onSectionReorder?.(section.id, sections[index + 1]!.id); }}>Move down</button>
              <button type="button" onClick={() => sections[0] && onSectionReorder?.(section.id, sections[0].id)}>Move to top</button>
              <button type="button" onClick={() => sections.at(-1) && onSectionReorder?.(section.id, sections.at(-1)!.id)}>Move to bottom</button>
            </div>
          </details>
        ) : null}
        <CreativeCompositionCanvas
          key={`${section.id}-surface-motion-${motionRevision}`}
          block={{ ...block, background: { kind: "none" } }}
          editMode={editSelects}
          selectedNodeIds={selectedSectionId === section.id ? selectedCompositionNodeIds : []}
          forceMobileFallback={compositionForceMobile}
          previewMotion={previewMotion}
          reducedMotionSimulation={reducedMotionSimulation}
          layoutMode={section.surfaceLayout || "stack"}
          gapPx={section.surfaceGapPx ?? 12}
          align={section.surfaceAlign || "stretch"}
          distribute={section.surfaceDistribute || "start"}
          minHeightPx={section.surfaceLayout === "free" ? coordinateHeight : Math.max(80, minHeight - padding * 2)}
          aspectRatio={section.surfaceLayout === "free" ? undefined : 390 / Math.max(120, minHeight - padding * 2)}
          className="!rounded-none !border-0"
          onSelectNodes={(ids) => {
            onSectionSelect?.(section.id);
            onCompositionNodeSelect?.(section.id, ids);
          }}
          onChangeBlock={(next, label) => onCompositionChange?.(section.id, next, label)}
          onEditNodeText={(nodeId, value) => {
            const nodes = block.nodes.map((node) => node.id === nodeId
              ? { ...node, props: node.primitive === "button" ? updateButtonLabel(node.props, value, node.id) : { ...node.props, text: value } }
              : node);
            onCompositionChange?.(section.id, { ...block, nodes }, nodeId && block.nodes.find((node) => node.id === nodeId)?.primitive === "button" ? "Edited Button label on canvas" : "Edited text on canvas");
          }}
          containerActions={{
            current: "section",
            sections: sections.filter((candidate) => candidate.type === "surface" && candidate.id !== section.id).map((candidate) => ({ id: candidate.id, label: candidate.label || "Section" })),
            onMoveToCard: (nodeId) => onElementMove?.(nodeId, null),
            onMoveToSection: (nodeId, sectionId) => onElementMove?.(nodeId, sectionId),
            onWrap: (nodeId) => onElementWrap?.(nodeId, section.id),
          }}
        />
        {editSelects && selectedSectionId === section.id ? <>
          <button
            type="button"
            className="absolute left-2 top-0 z-[1100] h-6 w-14 cursor-ns-resize rounded bg-transparent after:absolute after:left-1/2 after:top-1/2 after:h-2 after:w-10 after:-translate-x-1/2 after:-translate-y-1/2 after:rounded-full after:bg-white/90"
            aria-label="Resize Section from top edge"
            data-testid={`section-resize-top-handle-${section.id}`}
            onPointerDown={(event) => beginSectionResize(event, "top")}
            onDragStart={(event) => event.preventDefault()}
          />
          <button
            type="button"
            draggable={false}
            className="absolute bottom-0 left-1/2 z-[1100] h-6 w-20 -translate-x-1/2 cursor-ns-resize rounded bg-transparent after:absolute after:left-1/2 after:top-1/2 after:h-2 after:w-10 after:-translate-x-1/2 after:-translate-y-1/2 after:rounded-full after:bg-white/90"
            aria-label="Resize Section height"
            data-testid={`section-resize-handle-${section.id}`}
            onPointerDown={(event) => beginSectionResize(event, "bottom")}
            onDragStart={(event) => event.preventDefault()}
          />
        </> : null}
      </section>
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
                editSelects={editSelects}
                onActivate={() => void handleAction(section)}
                onSelect={(e) => selectSection(section.id, e)}
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
      case "image_gallery":
        bodyNodes.push(renderGallery(s));
        break;
      case "video":
        bodyNodes.push(renderVideo(s));
        break;
      case "hours":
      case "map":
      case "location":
        bodyNodes.push(renderInfoBlock(s));
        break;
      case "divider":
        bodyNodes.push(<hr key={s.id} className={cn("mx-4 border-0 border-t border-current opacity-20", selectedSectionId === s.id && "tcc-section-selected")} {...sectionDomProps(s.id, selectedSectionId)} />);
        break;
      case "logo_block":
        bodyNodes.push(renderLogoBlock(s));
        break;
      case "special_offer":
      case "coupon":
      case "ticket":
      case "announcement":
      case "special_event":
        bodyNodes.push(renderSpecialOffer(s));
        break;
      case "text":
      case "business_name":
      case "tagline":
        bodyNodes.push(renderText(s));
        break;
      case "contact_form":
      case "newsletter_signup":
      case "tapsave_prompt":
        bodyNodes.push(renderRelationship(s));
        break;
      case "campaign":
      case "campaign_group":
      case "experience":
        bodyNodes.push(renderConnected(s));
        break;
      case "creative_composition":
        bodyNodes.push(renderCreativeComposition(s));
        break;
      case "surface":
        bodyNodes.push(renderSurface(s));
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
        editSelects && "tcc-edit-selects",
        className
      )}
      style={style}
      data-interaction-mode={mode}
      data-edit-selects={editSelects ? "true" : "false"}
      onClickCapture={(e) => {
        if (!editSelects) return;
        if ((e.target as HTMLElement | null)?.closest?.("[data-composition-node], [data-testid=creative-composition-canvas], button, input, textarea, select")) return;
        const el = (e.target as HTMLElement | null)?.closest?.(
          "[data-section-id]"
        ) as HTMLElement | null;
        if (!el) return;
        const id = el.getAttribute("data-section-id");
        if (!id) return;
        const directText = (e.target as HTMLElement | null)?.closest?.("[contenteditable=true]");
        if (!directText) {
          e.preventDefault();
          e.stopPropagation();
        }
        onSectionSelect?.(id);
      }}
      onDragOver={(event: DragEvent<HTMLDivElement>) => {
        if (editSelects && onComposerDrop) {
          event.preventDefault();
          autoScrollForPointer(event.currentTarget, event.clientX, event.clientY);
        }
      }}
      onDrop={(event: DragEvent<HTMLDivElement>) => {
        if (!editSelects || !onComposerDrop) return;
        event.preventDefault();
        try {
          const payload = JSON.parse(event.dataTransfer.getData("application/x-tap-card-composer"));
          onComposerDrop(payload);
        } catch {
          // Ignore unrelated drops.
        }
      }}
      onClick={(e) => {
        if (!editSelects) return;
        const target = e.target as HTMLElement | null;
        if (target?.closest?.("[data-section-id]")) return;
        onSectionSelect?.(null);
      }}
    >
      {(() => {
        const headerSrc = firstImageUrl(config.headerLogoUrl, logoUrl);
        if (config.showHeaderLogo !== true || !headerSrc) return null;
        return (
          <div className="tcc-header-logo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={headerSrc}
              alt={businessName}
              className="tcc-header-logo-img"
              style={{
                maxHeight: `${Math.round(2.75 * ((config.headerLogoScale ?? 100) / 100))}rem`,
                maxWidth: `${Math.round(4.25 * ((config.headerLogoScale ?? 100) / 100))}rem`,
              }}
            />
          </div>
        );
      })()}
      {outerNodes}
      <div
        className="tcc-shell"
        style={
          rootBackground
            ? {
                backgroundImage: rootBackground,
                backgroundSize: config.rootBackgroundFit || "cover",
                backgroundPosition: config.rootBackgroundPosition || "50% 50%",
              }
            : undefined
        }
      >
        {(config.rootComposition || (editSelects && sections.length === 0)) ? (
          <div
            className="relative"
            data-testid="card-root-canvas"
            data-card-root="true"
            onDragOver={(event) => {
              if (!editSelects) return;
              event.preventDefault();
              autoScrollForPointer(event.currentTarget, event.clientX, event.clientY);
            }}
            onDrop={(event) => {
              if (!editSelects) return;
              const elementId = event.dataTransfer.getData("application/x-composition-node");
              if (elementId) {
                event.preventDefault();
                event.stopPropagation();
                onElementMove?.(elementId, null);
              }
            }}
          >
            <CreativeCompositionCanvas
              key={`card-root-motion-${motionRevision}`}
              block={parseCreativeComposition(config.rootComposition) || {
                version: 1,
                id: "card-root-composition",
                label: "Card root Elements",
                nodes: [],
                background: { kind: "none" },
                mobileFallback: "scale",
                safeAreaPaddingPx: config.rootCanvasPaddingPx ?? 12,
              }}
              editMode={editSelects}
              selectedNodeIds={!selectedSectionId ? selectedCompositionNodeIds : []}
              forceMobileFallback={compositionForceMobile}
              previewMotion={previewMotion}
              reducedMotionSimulation={reducedMotionSimulation}
              layoutMode="free"
              minHeightPx={rootHeightDraft ?? rootCanvasAutoHeight(config)}
              className="!rounded-none !border-0"
              onSelectNodes={(ids) => {
                onSectionSelect?.(null);
                onCompositionNodeSelect?.(null, ids);
              }}
              onChangeBlock={(next, label) => onCompositionChange?.(null, next, label)}
              onEditNodeText={(nodeId, value) => {
                const root = parseCreativeComposition(config.rootComposition);
                if (!root) return;
                onCompositionChange?.(null, {
                  ...root,
                  nodes: root.nodes.map((node) => node.id === nodeId
                    ? { ...node, props: node.primitive === "button" ? updateButtonLabel(node.props, value, node.id) : { ...node.props, text: value } }
                    : node),
                }, root.nodes.find((node) => node.id === nodeId)?.primitive === "button" ? "Edited Button label on canvas" : "Edited root text on canvas");
              }}
              containerActions={{
                current: "card",
                sections: sections.filter((candidate) => candidate.type === "surface").map((candidate) => ({ id: candidate.id, label: candidate.label || "Section" })),
                onMoveToSection: (nodeId, sectionId) => onElementMove?.(nodeId, sectionId),
                onWrap: (nodeId) => onElementWrap?.(nodeId, null),
              }}
            />
            {editSelects ? (
              <div className="relative z-40 flex h-9 items-center justify-center gap-2 border-t border-dashed border-[#b8ff2c]/45 bg-[#07100a]/90 text-[10px] text-white/70" data-testid="card-page-extension-controls">
                <button
                  type="button"
                  className="flex h-7 min-w-32 touch-none items-center justify-center rounded-md border border-[#b8ff2c]/55 bg-[#b8ff2c]/10 px-3 font-semibold text-[#dfff9a] cursor-ns-resize"
                  aria-label="Drag to extend Card page"
                  data-testid="card-page-extension-handle"
                  onClick={() => {
                    if (suppressRootResizeClickRef.current) {
                      suppressRootResizeClickRef.current = false;
                      return;
                    }
                    rootResizeRef.current = null;
                    const next = Math.min(2400, rootCanvasAutoHeight(config) + 240);
                    commitRootCanvasHeight(next, "Extended Card page");
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Escape" && rootResizeRef.current) {
                      event.preventDefault();
                      event.stopPropagation();
                      rootResizeRef.current = null;
                      setRootHeightDraft(null);
                      try { event.currentTarget.releasePointerCapture(Number(event.currentTarget.dataset.pointerId)); } catch { /* capture may already be released */ }
                      return;
                    }
                    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
                    event.preventDefault();
                    const delta = (event.shiftKey ? 96 : 24) * (event.key === "ArrowDown" ? 1 : -1);
                    commitRootCanvasHeight(Math.max(240, Math.min(2400, rootCanvasAutoHeight(config) + delta)), event.key === "ArrowDown" ? "Extended Card page" : "Shortened Card page");
                  }}
                  onPointerDown={(event) => {
                    const root = event.currentTarget.closest<HTMLElement>('[data-card-root="true"]');
                    const renderedHeight = rootHeightDraft ?? rootCanvasAutoHeight(config);
                    const scale = root ? Math.max(0.01, root.getBoundingClientRect().height / Math.max(1, root.offsetHeight)) : 1;
                    rootResizeRef.current = { startY: event.clientY, startHeight: renderedHeight, nextHeight: renderedHeight, scale, moved: false };
                    event.currentTarget.dataset.pointerId = String(event.pointerId);
                    event.currentTarget.focus();
                    event.currentTarget.setPointerCapture(event.pointerId);
                  }}
                  onPointerMove={(event) => {
                    const drag = rootResizeRef.current;
                    if (!drag || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
                    const delta = (event.clientY - drag.startY) / drag.scale;
                    if (Math.abs(delta) < 2) return;
                    const raw = Math.max(240, Math.min(2400, drag.startHeight + delta));
                    const next = Math.round(event.altKey ? raw : raw / 8) * (event.altKey ? 1 : 8);
                    drag.nextHeight = next;
                    drag.moved = true;
                    setRootHeightDraft(next);
                  }}
                  onPointerUp={(event) => {
                    const drag = rootResizeRef.current;
                    if (!drag) return;
                    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
                    rootResizeRef.current = null;
                    if (!drag.moved) return;
                    suppressRootResizeClickRef.current = true;
                    setRootHeightDraft(null);
                    commitRootCanvasHeight(drag.nextHeight, drag.nextHeight >= drag.startHeight ? "Extended Card page" : "Shortened Card page");
                  }}
                  onPointerCancel={() => {
                    rootResizeRef.current = null;
                    setRootHeightDraft(null);
                  }}
                >
                  ↕ Drag page edge · click +240
                </button>
                <span className="min-w-12 tabular-nums" data-testid="card-page-height">{rootHeightDraft ?? rootCanvasAutoHeight(config)}px</span>
                <label className="sr-only" htmlFor="card-page-exact-height">Exact page height</label>
                <input
                  id="card-page-exact-height"
                  aria-label="Exact Card page height"
                  type="number"
                  min={240}
                  max={2400}
                  step={8}
                  value={rootHeightDraft ?? rootCanvasAutoHeight(config)}
                  onChange={(event) => commitRootCanvasHeight(Number(event.target.value), "Changed exact Card page height")}
                  className="h-7 w-16 rounded border border-white/15 bg-transparent px-1 tabular-nums"
                  data-testid="card-page-exact-height"
                />
                <button
                  type="button"
                  className="h-7 rounded-md border border-white/15 px-2 hover:border-[#b8ff2c]/55"
                  onClick={() => commitRootCanvasHeight(fitRootCanvasToContent(config), "Fit Card page to content")}
                  data-testid="card-page-fit-content"
                >
                  Fit to content
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
        {bodyNodes}
      </div>
      {supportSectionId && supportContext?.businessId ? (
        <div className="mt-3 px-1">
          <CardSupportForm
            context={{
              businessId: supportContext.businessId,
              campaignId: supportContext.campaignId,
              deviceSlotId: supportContext.deviceSlotId,
              sectionId: supportSectionId,
              businessName,
            }}
            onClose={() => setSupportSectionId(null)}
          />
        </div>
      ) : null}
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
  editSelects = false,
  onActivate,
  onSelect,
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
  editSelects?: boolean;
  onActivate: () => void;
  onSelect?: (e: MouseEvent) => void;
}) {
  const kind = section.actionKind || "custom";
  const icon = section.icon || kind;
  const finish = sectionFinish(section, defaultFinish);
  const brand = !section.iconUrl && !section.iconColor ? socialBrandStyle(icon) : undefined;
  const shape = normalizeShape(section.shape, defaultShape);
  const radius = shapeRadius(shape);
  const neon = section.neonColor || defaultNeon;
  const opacity = (section.opacity ?? 100) / 100;
  const place = normalizeIconPlacement(section.iconPosition);
  const appearance =
    section.appearance ||
    (place === "only" || actionsLayout === "icon_row"
      ? "icon_only"
      : place === "none"
        ? "text"
        : "icon_text");
  const iconOnly = appearance === "icon_only" || place === "only" || actionsLayout === "icon_row";
  const textOnly = appearance === "text" || place === "none";
  const showIcon = !textOnly;
  const showLabel = !iconOnly;
  const showChevron = showLabel && place !== "above" && place !== "below";
  const sizePx = iconSizePx(section.iconSize);
  const layoutStyle = buttonLayoutInlineStyle({
    iconGap: section.iconGap,
    paddingX: section.paddingX,
    paddingY: section.paddingY,
    minHeight: section.minHeight,
  });
  const after = isIconAfterPlacement(place);

  /** Shared Visual Authoring Core — same resolver as Brand Kit Card preview. */
  const visualResolved = resolveItemProperties(
    buildActionPropertyMap(
      {
        primaryColor: defaultPill,
        textColor: defaultPillText,
        buttonStyle: shape === "pill" ? "PILL" : shape === "square" ? "SHARP" : "ROUNDED",
      },
      {
        ...section,
        // When section has no explicit bg, inherit Brand/default pill via brand layer
        backgroundColor: section.backgroundColor,
        textColor: section.textColor,
        shape,
        icon: section.icon || kind,
      }
    )
  );
  const visualStyle = applyResolvedToSectionStyle(visualResolved);

  const iconNode = showIcon ? (
    <span className="tcc-pill-icon" style={finish === "brand" ? brand : undefined}>
      {kind === "vcard" && avatarUrl && !section.iconUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="" className="tcc-pill-avatar" />
      ) : (
        <PremiumIcon
          icon={icon}
          customUrl={section.iconUrl}
          color={section.iconColor}
          sizePx={sizePx}
        />
      )}
    </span>
  ) : null;

  const labelNode = showLabel ? (
    <span
      className={cn("tcc-pill-label", iconOnly && "sr-only")}
      style={textFormatToCss(section.format)}
    >
      {section.label || kind}
    </span>
  ) : (
    <span className="sr-only">{section.label || kind}</span>
  );

  return (
    <button
      type="button"
      className={cn(
        "tcc-pill",
        finishClass(finish, "tcc-pill"),
        shape === "circle" && "tcc-pill-circle",
        iconOnly && "tcc-pill-icon-only",
        textOnly && "tcc-pill-text-only",
        `tcc-pill-place-${place}`,
        section.contentAlign && `tcc-pill-align-${section.contentAlign}`,
        section.verticalAlign && `tcc-pill-valign-${section.verticalAlign}`,
        section.textSize && `tcc-pill-text-${section.textSize}`,
        section.wrap && "tcc-pill-wrap",
        section.fullWidth === false && "tcc-pill-fit",
        selected && "tcc-section-selected"
      )}
      {...sectionDomProps(section.id, selected ? section.id : null)}
      data-icon-placement={place}
      data-appearance={appearance}
      data-resolver="shared-visual-core-v0"
      data-source-background={visualStyle.dataSources.background}
      data-source-foreground={visualStyle.dataSources.foreground}
      data-source-radius={visualStyle.dataSources.radius}
      data-source-icon={visualStyle.dataSources.icon}
      style={
        {
          "--tcc-accent": section.accentColor || undefined,
          "--tcc-neon": neon || undefined,
          borderRadius: radius,
          backgroundColor: visualStyle.backgroundColor || section.backgroundColor || defaultPill,
          color: visualStyle.color || section.textColor || defaultPillText,
          opacity,
          ...layoutStyle,
          ...(finish === "brand" && brand ? brand : {}),
        } as CSSProperties
      }
      onClick={(e) => {
        if (editSelects) {
          onSelect?.(e);
          return;
        }
        onActivate();
      }}
    >
      {after ? (
        <>
          {labelNode}
          {iconNode}
          {showChevron ? <ChevronRight className="tcc-pill-chevron" /> : null}
        </>
      ) : (
        <>
          {iconNode}
          {labelNode}
          {showChevron ? <ChevronRight className="tcc-pill-chevron" /> : null}
        </>
      )}
    </button>
  );
}
