"use client";

import type { CSSProperties } from "react";

interface TapActionButtonProps {
  children: React.ReactNode;
  href?: string;
  className?: string;
  style?: CSSProperties;
  eventType: string;
  campaignId: string;
  deviceSlotId: string;
  businessId: string;
  blockId?: string;
  openInNewTab?: boolean;
  "aria-label"?: string;
  "data-icon-placement"?: string;
  "data-appearance"?: string;
}

function isHttpUrl(href: string) {
  return /^https?:\/\//i.test(href);
}

function isAppScheme(href: string) {
  return /^(tel|mailto|sms|geo):/i.test(href);
}

export function TapActionButton({
  children,
  href,
  className,
  style,
  eventType,
  campaignId,
  deviceSlotId,
  businessId,
  blockId,
  openInNewTab,
  "aria-label": ariaLabel,
  "data-icon-placement": dataIconPlacement,
  "data-appearance": dataAppearance,
}: TapActionButtonProps) {
  async function logClick() {
    try {
      await fetch("/api/tap/click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventType, campaignId, deviceSlotId, businessId, blockId }),
      });
    } catch {
      // Non-blocking analytics
    }
  }

  const dataAttrs = {
    ...(dataIconPlacement ? { "data-icon-placement": dataIconPlacement } : {}),
    ...(dataAppearance ? { "data-appearance": dataAppearance } : {}),
  };

  if (href) {
    // Never force a new tab for phone/email — breaks dialers on mobile
    const targetBlank =
      !isAppScheme(href) &&
      isHttpUrl(href) &&
      (openInNewTab === true || openInNewTab === undefined);

    return (
      <a
        href={href}
        className={className}
        style={style}
        onClick={() => void logClick()}
        target={targetBlank ? "_blank" : undefined}
        rel={targetBlank ? "noopener noreferrer" : undefined}
        aria-label={ariaLabel}
        {...dataAttrs}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      type="button"
      className={className}
      style={style}
      onClick={() => void logClick()}
      aria-label={ariaLabel}
      {...dataAttrs}
    >
      {children}
    </button>
  );
}
