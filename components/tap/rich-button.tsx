"use client";

import type { CSSProperties } from "react";
import { TapActionButton } from "@/components/tap/action-button";
import { socialBrandStyle, SOCIAL_BRAND } from "@/components/tap/social-icons";
import { PremiumIcon } from "@/components/design/premium-icon";
import { finishClass } from "@/lib/design/premium-finish";
import { shapeRadius } from "@/lib/brand/tap-card";
import {
  buttonLayoutClassNames,
  buttonLayoutInlineStyle,
  iconSizePx,
  isIconAfterPlacement,
  normalizeIconPlacement,
  resolveAppearance,
} from "@/lib/design/button-layout";
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

function renderIcon(btn: ButtonItem, sizePx: number) {
  if (btn.imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={btn.imageUrl} alt="" className="tap-btn-custom-icon" />
    );
  }
  if (btn.icon && btn.icon !== "none") {
    return <PremiumIcon icon={btn.icon} color={btn.iconColor} sizePx={sizePx} />;
  }
  return null;
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
  const appearance = resolveAppearance({
    appearance: btn.appearance,
    iconPosition: btn.iconPosition,
    hasImage: Boolean(btn.imageUrl),
  });
  const place = normalizeIconPlacement(btn.iconPosition);
  const href = normalizeButtonHref(btn, contact);
  const brand = socialBrandStyle(btn.icon);
  const useBrand =
    isSocialIcon(btn.icon) &&
    !btn.imageUrl &&
    !btn.iconColor &&
    (appearance === "icon_only" || appearance === "icon_text" || appearance === "text");

  const styleClass = btn.finish
    ? finishClass(btn.finish, "tap-finish")
    : useBrand
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
  const layoutClasses = buttonLayoutClassNames({
    iconPosition: btn.iconPosition,
    iconSize: btn.iconSize,
    textSize: btn.textSize,
    contentAlign: btn.contentAlign,
    verticalAlign: btn.verticalAlign,
    wrap: btn.wrap,
    fullWidth: btn.fullWidth,
  });
  const layoutStyle = buttonLayoutInlineStyle({
    iconGap: btn.iconGap,
    paddingX: btn.paddingX,
    paddingY: btn.paddingY,
    minHeight: btn.minHeight,
  });
  const customStyle: CSSProperties | undefined = {
    ...layoutStyle,
    ...(btn.backgroundColor ? { background: btn.backgroundColor } : {}),
    ...(btn.textColor ? { color: btn.textColor } : {}),
    ...(btn.neonColor ? ({ ["--tcc-neon"]: btn.neonColor } as CSSProperties) : {}),
    ...(btn.shape ? { borderRadius: shapeRadius(btn.shape) } : {}),
    ...(typeof btn.opacity === "number" ? { opacity: btn.opacity / 100 } : {}),
    ...(btn.italic ? { fontStyle: "italic" } : {}),
    ...(btn.bold ? { fontWeight: 700 } : {}),
  };
  const combinedStyle = useBrand && !btn.finish
    ? { ...brand, ...customStyle }
    : Object.keys(customStyle).length
      ? customStyle
      : undefined;

  const sizePx = iconSizePx(btn.iconSize);

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
          widthClass,
          ...layoutClasses
        )}
        data-icon-placement={place}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={btn.imageUrl} alt={btn.label || "Link"} className="tap-image-btn-img" />
        {appearance === "image_label" && btn.label ? (
          <span className="tap-btn-label">{btn.label}</span>
        ) : null}
      </TapActionButton>
    );
  }

  if (appearance === "icon_only" || place === "only") {
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
          "tap-btn tap-btn-icon-only tap-btn-pressable",
          styleClass,
          sizeClass,
          cardClass,
          ...layoutClasses
        )}
        aria-label={btn.label}
        style={combinedStyle}
        data-icon-placement="only"
      >
        {renderIcon(btn, sizePx) || (
          <PremiumIcon icon="link" color={btn.iconColor} sizePx={sizePx} />
        )}
      </TapActionButton>
    );
  }

  // Text-only: never render icon art (Look=text / iconPosition=none)
  const showIcon =
    appearance !== "text" &&
    place !== "none" &&
    Boolean(btn.imageUrl || (btn.icon && btn.icon !== "none"));
  const iconEl = showIcon ? (
    <span className="tap-btn-icon-slot" aria-hidden>
      {renderIcon(btn, sizePx)}
    </span>
  ) : null;
  const labelEl = <span className="tap-btn-label">{btn.label}</span>;
  const after = isIconAfterPlacement(place);

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
        "tap-btn tap-btn-pressable",
        styleClass,
        sizeClass,
        widthClass,
        cardClass,
        ...layoutClasses
      )}
      style={combinedStyle}
      data-icon-placement={place}
      data-appearance={appearance}
    >
      {after ? (
        <>
          {labelEl}
          {iconEl}
        </>
      ) : (
        <>
          {iconEl}
          {labelEl}
        </>
      )}
    </TapActionButton>
  );
}
