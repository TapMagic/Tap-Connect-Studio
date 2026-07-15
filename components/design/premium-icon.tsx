"use client";

import { BrandSvg } from "@/components/design/brand-svg";
import { SocialGlyph } from "@/components/tap/social-icons";
import { BRAND_ICON_BY_ID } from "@/lib/design/brand-icons";
import { LUCIDE_ICON_LIBRARY } from "@/lib/design/lucide-icon-registry";

/** Renders a library icon id (Lucide or brand), or a custom image URL. */
export function PremiumIcon({
  icon,
  customUrl,
  sizePx = 18,
  color,
  className = "",
}: {
  icon?: string | null;
  customUrl?: string | null;
  sizePx?: number;
  /** Custom tint — omit to keep brand schemes (Google Reviews, etc.) */
  color?: string | null;
  className?: string;
}) {
  if (customUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={customUrl}
        alt=""
        width={sizePx}
        height={sizePx}
        className={`object-contain ${className}`.trim()}
        style={{ width: sizePx, height: sizePx }}
      />
    );
  }

  const id = (icon || "link").toLowerCase();
  const item = LUCIDE_ICON_LIBRARY.find((i) => i.id === id);
  const tint = color || undefined;

  if (item?.brand && BRAND_ICON_BY_ID[item.brand]) {
    return (
      <BrandSvg id={item.brand} sizePx={sizePx} color={tint} className={className} />
    );
  }
  if (item?.brand) {
    return (
      <span className={className} style={{ color: tint || "currentColor" }}>
        <SocialGlyph platform={item.brand} sizePx={sizePx} />
      </span>
    );
  }
  if (item?.Icon) {
    const Icon = item.Icon;
    return (
      <Icon
        className={className}
        color={tint || "currentColor"}
        style={{ width: sizePx, height: sizePx, color: tint || "currentColor" }}
        aria-hidden
      />
    );
  }

  if (BRAND_ICON_BY_ID[id]) {
    return <BrandSvg id={id} sizePx={sizePx} color={tint} className={className} />;
  }

  return (
    <span className={className} style={{ color: tint || "currentColor" }}>
      <SocialGlyph platform={id} sizePx={sizePx} />
    </span>
  );
}
