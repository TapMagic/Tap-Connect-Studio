"use client";

import { useMemo, useState, type CSSProperties } from "react";
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

  const style = {
    "--tcc-accent": config.accentColor,
    "--tcc-surface": config.surfaceColor,
    "--tcc-text": config.textColor,
    "--tcc-neon": config.neonColor || config.accentColor,
    "--tcc-energy": String(config.headerEnergy / 100),
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

  const promo = sections.find((s) => s.type === "promo_header");
  const hero = sections.find((s) => s.type === "hero");
  const identity = sections.find((s) => s.type === "identity");
  const actions = sections.filter((s) => s.type === "action");
  const footer = sections.find((s) => s.type === "footer_cta");
  const compact = config.compactActionsOnly;

  const peekActions = actions.slice(0, config.actionsLayout === "grid_2" ? 2 : 2);
  const visibleActions = collapsed ? peekActions : actions;
  const actionRows = groupActionsForLayout(visibleActions, config.actionsLayout);

  return (
    <div
      className={cn(
        "tcc",
        finishClass(config.cardFinish, "tcc-shell-finish"),
        className
      )}
      style={style}
    >
      {!compact && promo ? (
        <a
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
      ) : null}

      <div className="tcc-shell">
        {!compact && hero ? (
          <div className="tcc-hero">
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

            <a
              href={hero.href || profile.website || "#"}
              className="tcc-seal"
              onClick={(e) => {
                if (!hero.href && !profile.website) e.preventDefault();
              }}
            >
              {mark ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mark} alt={businessName} className="tcc-seal-img" />
              ) : (
                <span className="tcc-seal-initial">{initial}</span>
              )}
            </a>

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
        ) : null}

        {!compact && identity ? (
          <div className="tcc-identity" style={textFormatToCss(config.titleFormat)}>
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
        ) : null}

        {config.collapsible && !forceExpanded && !compact ? (
          <button
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
        ) : null}

        <div
          className={cn(
            "tcc-actions",
            config.actionsLayout === "grid_2" && "tcc-actions-grid",
            collapsed && "tcc-actions-peek"
          )}
        >
          {actionRows.map((row, ri) => (
            <div
              key={ri}
              className={cn(
                "tcc-action-row",
                row.length === 2 && "tcc-action-row-2"
              )}
            >
              {row.map((section) => (
                <ActionPill
                  key={section.id}
                  section={section}
                  defaultFinish={config.defaultFinish}
                  avatarUrl={mark}
                  onActivate={() => void handleAction(section)}
                />
              ))}
            </div>
          ))}
        </div>

        {!collapsed && !compact && footer ? (
          <div
            className={cn(
              "tcc-footer-cta",
              finishClass(sectionFinish(footer, "neon"), "tcc-pill")
            )}
          >
            <div className="tcc-footer-brand">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={TAP_CONNECT_LOGO} alt="" className="tcc-footer-logo" />
              <div>
                <p className="tcc-footer-title" style={textFormatToCss(footer.format)}>
                  {footer.text || "Want a card like this?"}
                </p>
                <p className="tcc-footer-body">
                  {footer.description ||
                    "Offers, reviews, and follow-up — one tap."}
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
        ) : null}

        {toast ? <p className="tcc-toast">{toast}</p> : null}
      </div>
    </div>
  );
}

function ActionPill({
  section,
  defaultFinish,
  avatarUrl,
  onActivate,
}: {
  section: TapCardSection;
  defaultFinish: TapConnectCardConfig["defaultFinish"];
  avatarUrl?: string | null;
  onActivate: () => void;
}) {
  const kind = section.actionKind || "custom";
  const icon = section.icon || kind;
  const finish = sectionFinish(section, defaultFinish);
  const brand = !section.iconUrl ? socialBrandStyle(icon) : undefined;

  return (
    <button
      type="button"
      className={cn("tcc-pill", finishClass(finish, "tcc-pill"))}
      style={
        {
          "--tcc-accent": section.accentColor || undefined,
          backgroundColor: section.backgroundColor,
          color: section.textColor,
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
