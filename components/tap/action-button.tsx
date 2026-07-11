"use client";

import Link from "next/link";

interface TapActionButtonProps {
  children: React.ReactNode;
  href?: string;
  className?: string;
  eventType: string;
  campaignId: string;
  deviceSlotId: string;
  businessId: string;
  blockId?: string;
}

export function TapActionButton({
  children,
  href,
  className,
  eventType,
  campaignId,
  deviceSlotId,
  businessId,
  blockId,
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
    return (
      <a href={href} className={className} onClick={() => void logClick()} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noopener noreferrer" : undefined}>
        {children}
      </a>
    );
  }

  return (
    <button type="button" className={className} onClick={() => void logClick()}>
      {children}
    </button>
  );
}
