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
  resolveActionHref,
  sortTapCardSections,
  type TapCardSection,
  type TapConnectCardConfig,
} from "@/lib/brand/tap-card";
import { SocialGlyph, socialBrandStyle } from "@/components/tap/social-icons";
import { TAP_CONNECT_LOGO } from "@/lib/brand/assets";

type TapConnectCardProps = {
  config: TapConnectCardConfig;
  profile: BrandContactProfile;
  businessName: string;
  logoUrl?: string | null;
  reviewUrl?: string | null;
  /** Force expanded (builder) */
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

  const name =
    profile.displayName || profile.organization || businessName;
  const initial = (name.trim()[0] || "?").toUpperCase();
  const mark = logoUrl || sections.find((s) => s.type === "hero")?.logoUrl;

  const style = {
    "--tcc-accent": config.accentColor,
    "--tcc-surface": config.surfaceColor,
    "--tcc-text": config.textColor,
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
        /* photo optional */
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
    if (href) window.location.href = href;
  }

  const promo = sections.find((s) => s.type === "promo_header");
  const hero = sections.find((s) => s.type === "hero");
  const identity = sections.find((s) => s.type === "identity");
  const actions = sections.filter((s) => s.type === "action");
  const footer = sections.find((s) => s.type === "footer_cta");

  const peekActions = actions.slice(0, 2);
  const visibleActions = collapsed ? peekActions : actions;

  return (
    <div className={`tcc ${className}`.trim()} style={style}>
      {promo ? (
        <a
          href={promo.href || "#"}
          className="tcc-promo"
          onClick={(e) => {
            if (!promo.href || promo.href === "#") e.preventDefault();
            onAction?.("promo_header", promo.id);
          }}
        >
          <span className="tcc-promo-left">{promo.text || "Click Here to"}</span>
          <span className="tcc-promo-right">{promo.textRight || "Hottest Deal!!!"}</span>
          <span className="tcc-promo-sheen" aria-hidden />
        </a>
      ) : null}

      <div className="tcc-shell">
        {hero ? (
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
                <SocialGlyph platform="phone" sizePx={22} />
                <span>Click to Call</span>
              </a>
            ) : null}
          </div>
        ) : null}

        {identity ? (
          <div className="tcc-identity">
            <p className="tcc-name">{identity.name || name}</p>
            {identity.title ? <p className="tcc-role">{identity.title}</p> : null}
            {identity.organization ? (
              <p className="tcc-org">{identity.organization}</p>
            ) : null}
            {identity.headline ? (
              <p className="tcc-headline">{identity.headline}</p>
            ) : null}
          </div>
        ) : null}

        {config.collapsible && !forceExpanded ? (
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

        <div className={`tcc-actions ${collapsed ? "tcc-actions-peek" : ""}`}>
          {visibleActions.map((section) => (
            <ActionPill
              key={section.id}
              section={section}
              accent={config.accentColor}
              avatarUrl={mark}
              onActivate={() => void handleAction(section)}
            />
          ))}
        </div>

        {!collapsed && footer ? (
          <div className="tcc-footer-cta">
            <div className="tcc-footer-brand">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={TAP_CONNECT_LOGO} alt="" className="tcc-footer-logo" />
              <div>
                <p className="tcc-footer-title">{footer.text || "Want a card like this?"}</p>
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
  accent,
  avatarUrl,
  onActivate,
}: {
  section: TapCardSection;
  accent: string;
  avatarUrl?: string | null;
  onActivate: () => void;
}) {
  const kind = section.actionKind || "custom";
  const icon = section.icon || kind;
  const style = section.style || "metallic";
  const brand = socialBrandStyle(icon);

  return (
    <button
      type="button"
      className={`tcc-pill tcc-pill-${style}`}
      style={
        style === "metallic"
          ? ({ "--tcc-accent": accent } as CSSProperties)
          : style === "brand" && brand
            ? brand
            : undefined
      }
      onClick={onActivate}
    >
      <span className="tcc-pill-icon" style={brand}>
        {kind === "vcard" && avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="tcc-pill-avatar" />
        ) : (
          <SocialGlyph platform={icon} sizePx={18} />
        )}
      </span>
      <span className="tcc-pill-label">{section.label || kind}</span>
      <ChevronRight className="tcc-pill-chevron" />
    </button>
  );
}

