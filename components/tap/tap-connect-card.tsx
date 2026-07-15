"use client";

import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  buildVCard,
  downloadVCardFile,
  type BrandContactProfile,
} from "@/lib/brand/contact-profile";
import {
  groupActionsForLayout,
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
  className?: string;
  onAction?: (kind: string, sectionId: string) => void;
};

export function TapConnectCard({
  config,
  profile,
  businessName,
  logoUrl,
  reviewUrl,
  forceExpanded = false,
  className = "",
  onAction,
}: TapConnectCardProps) {
  const [collapsed, setCollapsed] = useState(
    !forceExpanded && config.collapsible && config.defaultCollapsed
  );
  const [toast, setToast] = useState<string | null>(null);

  const sections = useMemo(
    () => sortTapCardSections(config.sections).filter((s) => s.enabled),
    [config.sections]
  );

  const name = profile.displayName || profile.organization || businessName;
  const initial = (name.trim()[0] || "?").toUpperCase();
  const mark = logoUrl || sections.find((s) => s.type === "hero")?.logoUrl;

  const surfaceAlpha = Math.min(100, Math.max(35, config.surfaceOpacity ?? 100)) / 100;

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
    if (mark) {
      try {
        if (mark.startsWith("data:")) {
          const m = /^data:image\/(png|jpeg|jpg);base64,(.+)$/i.exec(mark);
          if (m) {
            photoType = m[1].toLowerCase() === "png" ? "PNG" : "JPEG";
            photoBase64 = m[2];
          }
        } else {
          const res = await fetch(
            `/api/public/vcard-photo?url=${encodeURIComponent(mark)}`
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
    downloadVCardFile(`${name.replace(/\s+/g, "-").toLowerCase()}.vcf`, vcf);
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

  function renderPromo(promo: TapCardSection) {
    return (
      <a
        key={promo.id}
        href={promo.href || "#"}
        className="tcc-promo"
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

  function renderHero(hero: TapCardSection) {
    const logoSrc = hero.logoUrl || logoUrl;
    const scale = (hero.logoScale ?? 100) / 100;
    const ox = hero.logoOffsetX ?? 0;
    const oy = hero.logoOffsetY ?? 0;
    const showLogo = hero.showLogoWindow !== false;

    return (
      <div key={hero.id} className="tcc-hero">
        <div className="tcc-hero-mesh" aria-hidden>
          <span className="tcc-orb tcc-orb-a" />
          <span className="tcc-orb tcc-orb-b" />
          <span className="tcc-orb tcc-orb-c" />
        </div>
        {hero.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={hero.imageUrl} alt="" className="tcc-hero-photo" />
        ) : (
          <div className="tcc-hero-fallback" />
        )}
        <div className="tcc-hero-veil" />

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
      <div key={identity.id} className="tcc-identity" style={textFormatToCss(config.titleFormat)}>
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
          className="tcc-image-wrap"
          target="_blank"
          rel="noopener noreferrer"
        >
          {img}
        </a>
      );
    }
    return (
      <div key={section.id} className="tcc-image-wrap">
        {img}
      </div>
    );
  }

  function renderText(section: TapCardSection) {
    return (
      <div
        key={section.id}
        className="tcc-text-block"
        style={{
          backgroundColor: section.backgroundColor,
          color: section.textColor,
          ...textFormatToCss(section.format),
        }}
      >
        {section.text}
      </div>
    );
  }

  function renderSpacer(section: TapCardSection) {
    const h = section.height === "sm" ? 12 : section.height === "lg" ? 36 : 22;
    return <div key={section.id} className="tcc-spacer" style={{ height: h }} />;
  }

  function renderFooter(footer: TapCardSection) {
    return (
      <div
        key={footer.id}
        className={cn("tcc-footer-cta", finishClass(sectionFinish(footer, "neon"), "tcc-pill"))}
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
          peekOnly && "tcc-actions-peek"
        )}
      >
        {rows.map((row, ri) => (
          <div
            key={ri}
            className={cn("tcc-action-row", row.length === 2 && "tcc-action-row-2")}
          >
            {row.map((section) => (
              <ActionPill
                key={section.id}
                section={section}
                defaultFinish={config.defaultFinish}
                defaultShape={config.defaultShape}
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
      outerNodes.push(renderPromo(s));
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
      {outerNodes}
      <div className={cn("tcc-shell", config.view3d && "tcc-shell-3d")}>{bodyNodes}</div>
      {toast ? <p className="tcc-toast">{toast}</p> : null}
    </div>
  );
}

function ActionPill({
  section,
  defaultFinish,
  defaultShape,
  defaultPill,
  defaultPillText,
  defaultNeon,
  avatarUrl,
  onActivate,
}: {
  section: TapCardSection;
  defaultFinish: TapConnectCardConfig["defaultFinish"];
  defaultShape: TapConnectCardConfig["defaultShape"];
  defaultPill?: string;
  defaultPillText?: string;
  defaultNeon?: string;
  avatarUrl?: string | null;
  onActivate: () => void;
}) {
  const kind = section.actionKind || "custom";
  const icon = section.icon || kind;
  const finish = sectionFinish(section, defaultFinish);
  const brand = !section.iconUrl ? socialBrandStyle(icon) : undefined;
  const radius = shapeRadius(section.shape, defaultShape);
  const neon = section.neonColor || defaultNeon;
  const opacity = (section.opacity ?? 100) / 100;

  return (
    <button
      type="button"
      className={cn("tcc-pill", finishClass(finish, "tcc-pill"))}
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
          <PremiumIcon icon={icon} customUrl={section.iconUrl} sizePx={18} />
        )}
      </span>
      <span className="tcc-pill-label" style={textFormatToCss(section.format)}>
        {section.label || kind}
      </span>
      <ChevronRight className="tcc-pill-chevron" />
    </button>
  );
}
