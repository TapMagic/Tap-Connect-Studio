"use client";

import { useMemo, useState } from "react";
import {
  buildVCard,
  downloadVCardFile,
  SOCIAL_PLATFORM_OPTIONS,
  type BrandContactProfile,
} from "@/lib/brand/contact-profile";
import {
  defaultTapConnectCard,
  type TapConnectCardConfig,
} from "@/lib/brand/tap-card";
import { TapConnectCard } from "@/components/tap/tap-connect-card";
import { SocialGlyph, socialBrandStyle } from "@/components/tap/social-icons";

export function SaveContactButton({
  profile,
  logoUrl,
  buttonLabel = "Save to contacts",
  className = "tap-btn tap-btn-primary w-full",
  onSaved,
}: {
  profile: BrandContactProfile & { fullName?: string };
  logoUrl?: string | null;
  buttonLabel?: string;
  className?: string;
  onSaved?: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function save() {
    const fullName =
      profile.fullName || profile.displayName || profile.organization || "Contact";
    setBusy(true);
    let photoBase64: string | undefined;
    let photoType: "JPEG" | "PNG" | undefined;
    if (logoUrl && !logoUrl.startsWith("data:")) {
      try {
        const res = await fetch(
          `/api/public/vcard-photo?url=${encodeURIComponent(logoUrl)}`
        );
        if (res.ok) {
          const data = await res.json();
          photoBase64 = data.base64;
          photoType = data.type === "PNG" ? "PNG" : "JPEG";
        }
      } catch {
        /* skip photo */
      }
    } else if (logoUrl?.startsWith("data:image/")) {
      const match = /^data:image\/(png|jpeg|jpg);base64,(.+)$/i.exec(logoUrl);
      if (match) {
        photoType = match[1].toLowerCase() === "png" ? "PNG" : "JPEG";
        photoBase64 = match[2];
      }
    }

    const vcf = buildVCard({
      fullName,
      organization: profile.organization,
      title: profile.jobTitle,
      phone: profile.phone,
      email: profile.email,
      website: profile.website,
      address: profile.address,
      note: profile.note,
      photoBase64,
      photoType,
    });
    downloadVCardFile(fullName.replace(/\s+/g, "-"), vcf);
    onSaved?.();
    setBusy(false);
  }

  return (
    <button type="button" className={className} disabled={busy} onClick={() => void save()}>
      <SocialGlyph platform="mail" />
      {busy ? "Preparing…" : buttonLabel}
    </button>
  );
}

export function SharePageButton({
  title,
  text,
  className = "tap-btn tap-btn-outline w-full",
}: {
  title: string;
  text?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        /* fall through */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <button type="button" className={className} onClick={() => void share()}>
      {copied ? "Link copied" : "Share this page"}
    </button>
  );
}

export function SocialIconRow({
  socials,
}: {
  socials?: BrandContactProfile["socials"];
}) {
  if (!socials) return null;
  const entries = SOCIAL_PLATFORM_OPTIONS.map((opt) => ({
    ...opt,
    url: socials[opt.id],
  })).filter((e) => e.url);

  if (!entries.length) return null;

  return (
    <div className="tap-social-row">
      {entries.map((e) => (
        <a
          key={e.id}
          href={e.url}
          target="_blank"
          rel="noopener noreferrer"
          className="tap-social-chip tap-social-brand"
          aria-label={e.label}
          title={e.label}
          style={socialBrandStyle(e.id)}
        >
          <SocialGlyph platform={e.id} sizePx={18} />
        </a>
      ))}
    </div>
  );
}

/** Full contact-card chrome — premium Tap Connect Card */
export function ContactCardSurface({
  profile,
  logoUrl,
  businessName,
  headline,
  buttonLabel,
  showSave = true,
  showShare = true,
  showSocials = true,
  reviewUrl,
  cardConfig,
  forceExpanded,
  onSaved,
}: {
  profile: BrandContactProfile;
  logoUrl?: string | null;
  businessName: string;
  headline?: string;
  buttonLabel?: string;
  showSave?: boolean;
  showShare?: boolean;
  showSocials?: boolean;
  reviewUrl?: string | null;
  cardConfig?: TapConnectCardConfig | null;
  forceExpanded?: boolean;
  onSaved?: () => void;
}) {
  const config = useMemo(() => {
    const base =
      cardConfig ??
      defaultTapConnectCard({
        businessName,
        profile,
        logoUrl,
        reviewUrl,
      });
    let sections = [...base.sections];
    if (headline) {
      sections = sections.map((s) =>
        s.type === "identity" ? { ...s, headline } : s
      );
    }
    if (buttonLabel) {
      sections = sections.map((s) =>
        s.actionKind === "vcard" ? { ...s, label: buttonLabel } : s
      );
    }
    if (!showSave) {
      sections = sections.map((s) =>
        s.actionKind === "vcard" ? { ...s, enabled: false } : s
      );
    }
    if (!showShare) {
      sections = sections.map((s) =>
        s.actionKind === "bookmark" || s.actionKind === "homescreen"
          ? { ...s, enabled: false }
          : s
      );
    }
    if (!showSocials) {
      const socials = new Set([
        "instagram",
        "facebook",
        "tiktok",
        "snapchat",
        "x",
        "youtube",
        "linkedin",
        "whatsapp",
        "yelp",
      ]);
      sections = sections.map((s) =>
        s.actionKind && socials.has(s.actionKind) ? { ...s, enabled: false } : s
      );
    }
    return { ...base, sections };
  }, [
    cardConfig,
    businessName,
    profile,
    logoUrl,
    reviewUrl,
    headline,
    buttonLabel,
    showSave,
    showShare,
    showSocials,
  ]);

  return (
    <TapConnectCard
      config={config}
      profile={profile}
      businessName={businessName}
      logoUrl={logoUrl}
      reviewUrl={reviewUrl}
      forceExpanded={forceExpanded}
      onAction={(kind) => {
        if (kind === "vcard") onSaved?.();
      }}
    />
  );
}
