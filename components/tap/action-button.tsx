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

  if (href) {
    const isHttp = /^https?:\/\//i.test(href);
    const targetBlank = openInNewTab === true || (openInNewTab !== false && isHttp);
    return (
      <a
        href={href}
        className={className}
        style={style}
        onClick={() => void logClick()}
        target={targetBlank ? "_blank" : undefined}
        rel={targetBlank ? "noopener noreferrer" : undefined}
        aria-label={ariaLabel}
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
    >
      {children}
    </button>
  );
}
