"use client";

import { TapActionButton } from "@/components/tap/action-button";
import { SocialGlyph } from "@/components/tap/social-icons";
import type { ButtonItem } from "@/lib/types/campaign";
import { cn } from "@/lib/utils";

export function RichTapButton({
  btn,
  campaignId,
  deviceSlotId,
  businessId,
  blockId,
}: {
  btn: ButtonItem;
  campaignId: string;
  deviceSlotId: string;
  businessId: string;
  blockId: string;
}) {
  const appearance = btn.appearance ?? (btn.imageUrl ? "image_label" : "icon_text");
  const styleClass =
    btn.style === "primary"
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

  if (appearance === "image" || appearance === "image_label") {
    if (!btn.imageUrl) {
      // fall through to text button
    } else {
      return (
        <TapActionButton
          eventType="button_click"
          campaignId={campaignId}
          deviceSlotId={deviceSlotId}
          businessId={businessId}
          blockId={blockId}
          href={btn.url || undefined}
          openInNewTab={btn.openInNewTab}
          className={cn(
            "tap-image-btn",
            appearance === "image" && "tap-image-btn-bare",
            widthClass
          )}
        >
          <img src={btn.imageUrl} alt={btn.label || "Link"} className="tap-image-btn-img" />
          {appearance === "image_label" && btn.label ? (
            <span className="tap-image-btn-label">{btn.label}</span>
          ) : null}
        </TapActionButton>
      );
    }
  }

  if (appearance === "icon_only") {
    return (
      <TapActionButton
        eventType="button_click"
        campaignId={campaignId}
        deviceSlotId={deviceSlotId}
        businessId={businessId}
        blockId={blockId}
        href={btn.url || undefined}
        openInNewTab={btn.openInNewTab}
        className={cn("tap-btn tap-btn-icon-only", styleClass, sizeClass)}
        aria-label={btn.label}
      >
        {btn.imageUrl ? (
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
      href={btn.url || undefined}
      openInNewTab={btn.openInNewTab}
      className={cn("tap-btn", styleClass, sizeClass, widthClass)}
    >
      {btn.imageUrl ? (
        <img src={btn.imageUrl} alt="" className="tap-btn-custom-icon" />
      ) : btn.icon && btn.icon !== "none" ? (
        <SocialGlyph platform={btn.icon} />
      ) : null}
      {btn.label}
    </TapActionButton>
  );
}
