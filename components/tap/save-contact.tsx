"use client";

import { useState } from "react";
import {
  buildVCard,
  downloadVCardFile,
  type BrandContactProfile,
} from "@/lib/brand/contact-profile";
import { SocialGlyph } from "@/components/tap/social-icons";
import { SOCIAL_PLATFORM_OPTIONS } from "@/lib/brand/contact-profile";

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
      profile.fullName ||
      profile.displayName ||
      profile.organization ||
      "Contact";
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
      <SocialGlyph platform="link" />
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
          className="tap-social-chip"
          aria-label={e.label}
          title={e.label}
        >
          <SocialGlyph platform={e.id} />
        </a>
      ))}
    </div>
  );
}
