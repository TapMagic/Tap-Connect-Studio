"use client";

import { SocialGlyph } from "@/components/tap/social-icons";
import { LUCIDE_ICON_LIBRARY } from "@/lib/design/lucide-icon-registry";

/** Renders a library icon id (Lucide or brand), or a custom image URL. */
export function PremiumIcon({
  icon,
  customUrl,
  sizePx = 18,
  className = "",
}: {
  icon?: string | null;
  customUrl?: string | null;
  sizePx?: number;
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

  if (item?.brand) {
    return <SocialGlyph platform={item.brand} sizePx={sizePx} className={className} />;
  }
  if (item?.Icon) {
    const Icon = item.Icon;
    return <Icon className={className} style={{ width: sizePx, height: sizePx }} aria-hidden />;
  }

  // Fallback: treat unknown ids as brand/social glyph keys
  return <SocialGlyph platform={id} sizePx={sizePx} className={className} />;
}
