"use client";

import { useState } from "react";
import {
  buildVCard,
  downloadVCardFile,
  SOCIAL_PLATFORM_OPTIONS,
  type BrandContactProfile,
} from "@/lib/brand/contact-profile";
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

/** Full contact-card chrome — Tap The Magic style digital card / vCard layout */
export function ContactCardSurface({
  profile,
  logoUrl,
  businessName,
  headline,
  buttonLabel,
  showSave = true,
  showShare = true,
  showSocials = true,
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
  onSaved?: () => void;
}) {
  const name = profile.displayName || profile.organization || businessName;
  const initial = (name.trim()[0] || "?").toUpperCase();
  const phoneHref = profile.phone
    ? `tel:${profile.phone.replace(/[^\d+]/g, "")}`
    : undefined;
  const mapsHref = profile.address
    ? `https://maps.google.com/?q=${encodeURIComponent(profile.address)}`
    : undefined;

  return (
    <div className="tap-contact-card">
      <div className="tap-contact-card-banner">
        <div className="tap-contact-card-banner-glow" />
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" className="tap-contact-card-banner-mark" />
        ) : null}
      </div>

      <div className="tap-contact-card-avatar-wrap">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" className="tap-contact-card-avatar" />
        ) : (
          <div className="tap-contact-card-avatar tap-contact-card-initial">{initial}</div>
        )}
      </div>

      <div className="tap-contact-card-body">
        <p className="tap-contact-card-name">{name}</p>
        {profile.jobTitle ? <p className="tap-contact-card-role">{profile.jobTitle}</p> : null}
        {profile.organization && profile.organization !== name ? (
          <p className="tap-contact-card-org">{profile.organization}</p>
        ) : null}
        {headline ? <p className="tap-contact-card-headline">{headline}</p> : null}

        <div className="tap-contact-action-grid">
          {phoneHref ? (
            <a href={phoneHref} className="tap-contact-action">
              <SocialGlyph platform="phone" sizePx={18} />
              <span>Call</span>
            </a>
          ) : null}
          {profile.email ? (
            <a href={`mailto:${profile.email}`} className="tap-contact-action">
              <SocialGlyph platform="mail" sizePx={18} />
              <span>Email</span>
            </a>
          ) : null}
          {profile.website ? (
            <a
              href={profile.website}
              target="_blank"
              rel="noopener noreferrer"
              className="tap-contact-action"
            >
              <SocialGlyph platform="link" sizePx={18} />
              <span>Web</span>
            </a>
          ) : null}
          {mapsHref ? (
            <a
              href={mapsHref}
              target="_blank"
              rel="noopener noreferrer"
              className="tap-contact-action"
            >
              <SocialGlyph platform="map" sizePx={18} />
              <span>Map</span>
            </a>
          ) : null}
        </div>

        <ul className="tap-contact-card-facts">
          {profile.phone ? (
            <li>
              <a href={phoneHref}>
                <SocialGlyph platform="phone" sizePx={14} />
                {profile.phone}
              </a>
            </li>
          ) : null}
          {profile.email ? (
            <li>
              <a href={`mailto:${profile.email}`}>
                <SocialGlyph platform="mail" sizePx={14} />
                {profile.email}
              </a>
            </li>
          ) : null}
          {profile.website ? (
            <li>
              <a href={profile.website} target="_blank" rel="noopener noreferrer">
                <SocialGlyph platform="link" sizePx={14} />
                {profile.website.replace(/^https?:\/\//, "")}
              </a>
            </li>
          ) : null}
          {profile.address ? (
            <li>
              <span>
                <SocialGlyph platform="map" sizePx={14} />
                {profile.address}
              </span>
            </li>
          ) : null}
        </ul>

        {showSocials ? <SocialIconRow socials={profile.socials} /> : null}

        <div className="tap-contact-card-actions">
          {showSave ? (
            <SaveContactButton
              profile={profile}
              logoUrl={logoUrl}
              buttonLabel={buttonLabel || "Add to contacts"}
              className="tap-btn tap-btn-primary tap-btn-pressable w-full"
              onSaved={onSaved}
            />
          ) : null}
          {showShare ? (
            <SharePageButton
              title={name}
              text={`Connect with ${name}`}
              className="tap-btn tap-btn-outline w-full"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
