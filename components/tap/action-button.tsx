"use client";

interface TapActionButtonProps {
  children: React.ReactNode;
  href?: string;
  className?: string;
  eventType: string;
  campaignId: string;
  deviceSlotId: string;
  businessId: string;
  blockId?: string;
  /** Override default: http(s) opens in new tab */
  openInNewTab?: boolean;
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
  openInNewTab,
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
        onClick={() => void logClick()}
        target={targetBlank ? "_blank" : undefined}
        rel={targetBlank ? "noopener noreferrer" : undefined}
      >
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
