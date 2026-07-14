"use client";

import type { CSSProperties } from "react";
import { TapActionButton } from "@/components/tap/action-button";
import { SocialGlyph, socialBrandStyle, SOCIAL_BRAND } from "@/components/tap/social-icons";
import type { ButtonItem } from "@/lib/types/campaign";
import { cn } from "@/lib/utils";

function isSocialIcon(icon?: ButtonItem["icon"]) {
  if (!icon || icon === "none") return false;
  return Boolean(SOCIAL_BRAND[icon] || SOCIAL_BRAND[icon.toLowerCase()]);
}

export type ContactHrefFallback = {
  phone?: string;
  email?: string;
  address?: string;
};

function telHref(phone: string): string | undefined {
  const digits = phone.replace(/^tel:/i, "").replace(/[^\d+]/g, "");
  if (digits.length < 7) return undefined;
  return `tel:${digits}`;
}

/** Make Call / Maps / Email work; fill gaps from brand contact when presets are incomplete */
export function normalizeButtonHref(
  btn: ButtonItem,
  contact?: ContactHrefFallback
): string | undefined {
  const raw = (btn.url || "").trim();
  const icon = btn.icon;
  const looksCall =
    icon === "phone" || /^tel:/i.test(raw) || /^call\b/i.test(btn.label || "");
  const looksMail =
    icon === "mail" || /^mailto:/i.test(raw) || /^e-?mail\b/i.test(btn.label || "");
  const looksMap =
    icon === "map" ||
    /maps\.google|goo\.gl\/maps|maps\.app|get directions|directions/i.test(
      `${raw} ${btn.label || ""}`
    );

  if (looksCall) {
    return telHref(raw) || (contact?.phone ? telHref(contact.phone) : undefined);
  }

  if (looksMail) {
    const email = raw.replace(/^mailto:/i, "").trim();
    if (email.includes("@")) return `mailto:${email}`;
    if (contact?.email?.includes("@")) return `mailto:${contact.email.trim()}`;
    return undefined;
  }

  if (looksMap) {
    if (/^https?:\/\//i.test(raw) && !/[?&]q=$/.test(raw) && raw.length > 28) return raw;
    const q = raw
      .replace(/^https?:\/\/(www\.)?maps\.google\.com\/?\?q=/i, "")
      .replace(/^https?:\/\//i, "")
      .trim();
    const query = q || contact?.address?.trim() || "";
    if (query) return `https://maps.google.com/?q=${encodeURIComponent(query)}`;
    return undefined;
  }

  if (!raw || raw === "https://" || raw === "http://") return undefined;
  if (/^https?:\/\//i.test(raw) || /^(tel|mailto|sms):/i.test(raw)) return raw;
  if (/^[\w.-]+\.[a-z]{2,}/i.test(raw)) return `https://${raw}`;
  return raw;
}

export function resolveActionHref(
  action: { type: string; label: string; url?: string },
  contact?: ContactHrefFallback
): string | undefined {
  const asBtn: ButtonItem = {
    id: "action",
    label: action.label,
    url: action.url || "",
    style: "outline",
    icon:
      action.type === "call"
        ? "phone"
        : action.type === "email"
          ? "mail"
          : action.type === "directions" || action.type === "map"
            ? "map"
            : "link",
  };
  return normalizeButtonHref(asBtn, contact);
}

export function RichTapButton({
  btn,
  campaignId,
  deviceSlotId,
  businessId,
  blockId,
  contact,
}: {
  btn: ButtonItem;
  campaignId: string;
  deviceSlotId: string;
  businessId: string;
  blockId: string;
  contact?: ContactHrefFallback;
}) {
  const appearance = btn.appearance ?? (btn.imageUrl ? "image_label" : "icon_text");
  const href = normalizeButtonHref(btn, contact);
  const brand = socialBrandStyle(btn.icon);
  const useBrand =
    isSocialIcon(btn.icon) &&
    !btn.imageUrl &&
    (appearance === "icon_only" || appearance === "icon_text" || appearance === "text");

  const styleClass = useBrand
    ? "tap-btn-social"
    : btn.style === "primary"
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
  const cardClass = btn.card ? "tap-btn-card" : "";
  const customStyle: CSSProperties | undefined =
    btn.backgroundColor || btn.textColor
      ? {
          ...(btn.backgroundColor ? { background: btn.backgroundColor } : {}),
          ...(btn.textColor ? { color: btn.textColor } : {}),
        }
      : undefined;
  const combinedStyle = useBrand
    ? { ...brand, ...customStyle }
    : customStyle;

  // Phone / maps / mailto never open in a new tab
  const openInNewTab =
    href && /^(tel|mailto|sms):/i.test(href) ? false : btn.openInNewTab;

  if ((appearance === "image" || appearance === "image_label") && btn.imageUrl) {
    return (
      <TapActionButton
        eventType="button_click"
        campaignId={campaignId}
        deviceSlotId={deviceSlotId}
        businessId={businessId}
        blockId={blockId}
        href={href}
        openInNewTab={openInNewTab}
        className={cn(
          "tap-image-btn",
          appearance === "image" && "tap-image-btn-bare",
          cardClass,
          widthClass
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={btn.imageUrl} alt={btn.label || "Link"} className="tap-image-btn-img" />
        {appearance === "image_label" && btn.label ? (
          <span className="tap-image-btn-label">{btn.label}</span>
        ) : null}
      </TapActionButton>
    );
  }

  if (appearance === "icon_only") {
    return (
      <TapActionButton
        eventType="button_click"
        campaignId={campaignId}
        deviceSlotId={deviceSlotId}
        businessId={businessId}
        blockId={blockId}
        href={href}
        openInNewTab={openInNewTab}
        className={cn("tap-btn tap-btn-icon-only tap-btn-pressable", styleClass, sizeClass, cardClass)}
        aria-label={btn.label}
        style={combinedStyle}
      >
        {btn.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={btn.imageUrl} alt="" className="tap-btn-custom-icon" />
        ) : (
          <SocialGlyph platform={btn.icon && btn.icon !== "none" ? btn.icon : "link"} />
        )}
      </TapActionButton>
    );
  }

  return (
    <TapActionButton
      eventType="button_click"
      campaignId={campaignId}
      deviceSlotId={deviceSlotId}
      businessId={businessId}
      blockId={blockId}
      href={href}
      openInNewTab={openInNewTab}
      className={cn("tap-btn tap-btn-pressable", styleClass, sizeClass, widthClass, cardClass)}
      style={combinedStyle}
    >
      {btn.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={btn.imageUrl} alt="" className="tap-btn-custom-icon" />
      ) : btn.icon && btn.icon !== "none" ? (
        <SocialGlyph platform={btn.icon} />
      ) : null}
      <span className="tap-btn-label">{btn.label}</span>
    </TapActionButton>
  );
}
