"use client";

import type { CSSProperties } from "react";
import type { ButtonItem } from "@/lib/types/campaign";
import type { SocialPlatform } from "@/lib/brand/contact-profile";

const size = 18;

/** Official-ish brand colors for social platforms */
export const SOCIAL_BRAND: Record<
  string,
  { bg: string; fg: string; label: string }
> = {
  instagram: {
    bg: "linear-gradient(135deg, #f58529 0%, #dd2a7b 45%, #8134af 75%, #515bd4 100%)",
    fg: "#ffffff",
    label: "Instagram",
  },
  facebook: { bg: "#1877F2", fg: "#ffffff", label: "Facebook" },
  tiktok: { bg: "#010101", fg: "#ffffff", label: "TikTok" },
  youtube: { bg: "#FF0000", fg: "#ffffff", label: "YouTube" },
  linkedin: { bg: "#0A66C2", fg: "#ffffff", label: "LinkedIn" },
  x: { bg: "#000000", fg: "#ffffff", label: "X" },
  twitter: { bg: "#000000", fg: "#ffffff", label: "X" },
  whatsapp: { bg: "#25D366", fg: "#ffffff", label: "WhatsApp" },
  threads: { bg: "#000000", fg: "#ffffff", label: "Threads" },
  snapchat: { bg: "#FFFC00", fg: "#000000", label: "Snapchat" },
  pinterest: { bg: "#E60023", fg: "#ffffff", label: "Pinterest" },
  yelp: { bg: "#FF1A1A", fg: "#ffffff", label: "Yelp" },
  spotify: { bg: "#1DB954", fg: "#ffffff", label: "Spotify" },
  phone: { bg: "#34C759", fg: "#ffffff", label: "Call" },
  mail: { bg: "#5AC8FA", fg: "#0b0f19", label: "Email" },
  email: { bg: "#5AC8FA", fg: "#0b0f19", label: "Email" },
  map: { bg: "#FF9500", fg: "#ffffff", label: "Maps" },
  apple_maps: { bg: "#FF9500", fg: "#ffffff", label: "Maps" },
  google: { bg: "#ffffff", fg: "#4285F4", label: "Google" },
  review: { bg: "#ffffff", fg: "#4285F4", label: "Review" },
  square: { bg: "#000000", fg: "#ffffff", label: "Square" },
  vcard: {
    bg: "linear-gradient(135deg,#1a1a1a 0%,#3d3420 45%,#c9a227 100%)",
    fg: "#f5e6a8",
    label: "vCard",
  },
  calendar: { bg: "#5856D6", fg: "#ffffff", label: "Calendar" },
  homescreen: { bg: "#0b0f19", fg: "#a3e635", label: "Home" },
  bookmark: { bg: "#0b0f19", fg: "#fbbf24", label: "Bookmark" },
  sms: { bg: "#34C759", fg: "#ffffff", label: "SMS" },
};

export function socialBrandStyle(platform?: string | null): CSSProperties | undefined {
  if (!platform || platform === "none") return undefined;
  const key = platform.toLowerCase().replace(/\s+/g, "_");
  const brand = SOCIAL_BRAND[key];
  if (!brand) return undefined;
  return {
    background: brand.bg,
    color: brand.fg,
    borderColor: "transparent",
  };
}

export function SocialGlyph({
  platform,
  className = "",
  sizePx = size,
}: {
  platform: string;
  className?: string;
  sizePx?: number;
}) {
  const p = platform.toLowerCase().replace(/\s+/g, "_") as SocialPlatform | string;
  const common = {
    width: sizePx,
    height: sizePx,
    viewBox: "0 0 24 24",
    fill: "currentColor",
    className,
    "aria-hidden": true as const,
  };

  switch (p) {
    case "instagram":
      return (
        <svg {...common}>
          <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm5 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm6.5-.9a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2zM12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6z" />
        </svg>
      );
    case "facebook":
      return (
        <svg {...common}>
          <path d="M14 8h3V4h-3c-2.8 0-5 2.2-5 5v2H7v4h2v7h4v-7h3l1-4h-4V9c0-.6.4-1 1-1z" />
        </svg>
      );
    case "tiktok":
      return (
        <svg {...common}>
          <path d="M14 3h3c.2 1.7 1.3 3.2 3 4v3c-1.3-.1-2.5-.5-3.5-1.2V16a6 6 0 1 1-6-6c.3 0 .7 0 1 .1V13a3 3 0 1 0 2 2.8V3z" />
        </svg>
      );
    case "youtube":
      return (
        <svg {...common}>
          <path d="M23 7.5s-.2-1.6-.9-2.3c-.8-.9-1.7-.9-2.1-1C17.1 4 12 4 12 4s-5.1 0-7.9.2c-.5.1-1.3.1-2.1 1C1.2 5.9 1 7.5 1 7.5S.8 9.4.8 11.2v1.6C.8 14.6 1 16.5 1 16.5s.2 1.6.9 2.3c.8.9 1.9.8 2.4.9 1.7.2 7.7.2 7.7.2s5.1 0 7.9-.2c.5-.1 1.3-.1 2.1-1 .7-.7.9-2.3.9-2.3s.2-1.9.2-3.7v-1.6C23.2 9.4 23 7.5 23 7.5zM9.8 14.8V8.7l6.2 3.1-6.2 3z" />
        </svg>
      );
    case "linkedin":
      return (
        <svg {...common}>
          <path d="M6 9H2v13h4V9zm.2-4.5A2.2 2.2 0 1 1 4 2.3a2.2 2.2 0 0 1 2.2 2.2zM22 15.3V22h-4v-6.2c0-1.5-.5-2.5-1.8-2.5-1 0-1.5.7-1.8 1.3-.1.2-.1.6-.1.9V22h-4s.1-11.6 0-12.8h4v1.8c.5-.8 1.5-2 3.7-2 2.7 0 4.7 1.8 4.7 5.5z" />
        </svg>
      );
    case "x":
    case "twitter":
      return (
        <svg {...common}>
          <path d="M18.2 2H21l-6.6 7.5L22 22h-6.2l-4.9-6.4L5.5 22H2.7l7-8L2 2h6.3l4.4 5.8L18.2 2zm-1.1 18h1.7L7 3.9H5.2L17.1 20z" />
        </svg>
      );
    case "whatsapp":
      return (
        <svg {...common}>
          <path d="M12 2a10 10 0 0 0-8.7 15L2 22l5.2-1.3A10 10 0 1 0 12 2zm0 2a8 8 0 0 1 6.7 12.3l-.3.4.8 2.9-3-.8-.4.2A8 8 0 1 1 12 4zm4.4 9.6c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.6.1-.2.2-.7.8-.8 1-.1.2-.3.2-.5.1-1.4-.7-2.3-1.2-3.2-2.8-.2-.4 0-.5.2-.7.2-.2.4-.4.5-.6.1-.2.1-.4 0-.6-.1-.2-.6-1.4-.8-1.9-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.1s.9 2.4 1 2.6c.1.2 1.8 2.8 4.4 3.9 1.6.7 2.2.7 3 .6.5-.1 1.4-.6 1.6-1.1.2-.5.2-1 .1-1.1-.1-.1-.3-.2-.5-.3z" />
        </svg>
      );
    case "threads":
      return (
        <svg {...common}>
          <path d="M16.5 11.2c-.2-2.3-1.4-3.8-3.8-3.8-1.4 0-2.5.6-3.2 1.5l1.3 1c.4-.6 1-.9 1.8-.9 1.3 0 2 .8 2.1 2.2-1-.1-2.1 0-3.1.4-1.5.6-2.5 1.8-2.4 3.4.1 1.4 1.1 2.5 2.7 2.5 1.2 0 2.1-.5 2.8-1.4.4.8 1 1.2 1.9 1.4l.5-1.5c-.5-.1-.8-.4-1-.9.8-.9 1.2-2.1 1.1-3.5zm-3.5 4c-.7 0-1.2-.5-1.2-1.2 0-1.1.9-1.7 2.4-1.9.1 1.8-.5 3.1-1.2 3.1zM12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" />
        </svg>
      );
    case "snapchat":
      return (
        <svg {...common}>
          <path d="M12 2c2.5 0 4.2 1.8 4.5 4.3.1.7.1 2.4.1 2.4s1.4-.3 2.1.4c.6.6.2 1.5-.2 1.8-.7.5-1.3.3-1.8.7-.3.3 0 1.1.6 1.8 1 .9 2.4 1.1 2.7 1.5.4.5-.2 1.3-1 1.4-1.1.1-1.8-.4-2.5 0-.9.5-.6 2-2.5 2.7-1.1.4-2 .3-2.5.3s-1.4.1-2.5-.3c-1.9-.7-1.6-2.2-2.5-2.7-.7-.4-1.4.1-2.5 0-.8-.1-1.4-.9-1-1.4.3-.4 1.7-.6 2.7-1.5.6-.7.9-1.5.6-1.8-.5-.4-1.1-.2-1.8-.7-.4-.3-.8-1.2-.2-1.8.7-.7 2.1-.4 2.1-.4s0-1.7.1-2.4C7.8 3.8 9.5 2 12 2z" />
        </svg>
      );
    case "pinterest":
      return (
        <svg {...common}>
          <path d="M12 2a10 10 0 0 0-3.6 19.3c-.1-.8-.2-2.1 0-3l1.3-5.5s-.3-.7-.3-1.6c0-1.5.9-2.6 2-2.6.9 0 1.4.7 1.4 1.5 0 .9-.6 2.3-.9 3.5-.3 1.1.5 1.9 1.5 1.9 1.8 0 3.2-1.9 3.2-4.7 0-2.4-1.8-4.1-4.3-4.1-2.9 0-4.7 2.2-4.7 4.5 0 .9.3 1.8.8 2.3.1.1.1.2.1.3l-.3 1.2c0 .2-.2.2-.3.1-1.3-.6-2.1-2.5-2.1-4 0-3.3 2.4-6.3 6.8-6.3 3.6 0 6.3 2.5 6.3 5.9 0 3.5-2.2 6.4-5.3 6.4-1 0-2-.5-2.3-1.2l-.6 2.4c-.2.9-.8 2-1.2 2.7A10 10 0 1 0 12 2z" />
        </svg>
      );
    case "yelp":
      return (
        <svg {...common}>
          <path d="M12.2 14.5 9 21.2c-.3.7-1.2.9-1.8.4L4.4 19c-.6-.5-.5-1.4.2-1.7l5.6-2.3c.8-.3 1.6.4 1.4 1.2l.6-1.7zm1.3-1.5 7.1 1.3c.7.1 1.1.9.7 1.5l-2.5 3.4c-.4.6-1.3.6-1.7 0l-3.7-5.2c-.5-.7.2-1.6 1.1-1zM11.5 11 4.8 8.4c-.7-.3-.9-1.2-.4-1.8L6.7 3.6c.4-.6 1.3-.6 1.7 0l3.5 5.8c.4.7-.3 1.6-1.2 1.2l.8.4zm1.2-.8 2.2-7c.2-.7 1-.9 1.6-.5l3.2 2.3c.6.4.6 1.3.1 1.7L14 10.8c-.6.5-1.6-.1-1.3-1z" />
        </svg>
      );
    case "spotify":
      return (
        <svg {...common}>
          <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm4.6 14.4a.7.7 0 0 1-1 .2c-2.6-1.6-5.9-2-9.8-1.1a.7.7 0 1 1-.3-1.4c4.2-1 7.9-.5 10.8 1.2a.7.7 0 0 1 .3 1.1zm1.2-2.7a.9.9 0 0 1-1.2.3c-3-1.8-7.5-2.4-11-1.3a.9.9 0 1 1-.5-1.7c4-.1 9 .6 12.4 2.6a.9.9 0 0 1 .3 1.1zm.1-2.8c-3.5-2.1-9.3-2.3-12.6-1.3a1 1 0 1 1-.6-2c3.8-1.1 10.2-.9 14.3 1.5a1 1 0 1 1-1.1 1.8z" />
        </svg>
      );
    case "phone":
      return (
        <svg {...common}>
          <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1.1-.3 1.2.4 2.5.6 3.8.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.6.6 3.8.1.4 0 .8-.3 1.1l-2.2 2.9z" />
        </svg>
      );
    case "mail":
    case "email":
      return (
        <svg {...common}>
          <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5L4 8V6l8 5 8-5v2z" />
        </svg>
      );
    case "map":
    case "apple_maps":
      return (
        <svg {...common}>
          <path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z" />
        </svg>
      );
    case "star":
      return (
        <svg {...common}>
          <path d="M12 2l2.9 6.3 6.9.6-5.2 4.6 1.5 6.8L12 16.9 5.9 20.3l1.5-6.8L2.2 8.9l6.9-.6L12 2z" />
        </svg>
      );
    case "play":
      return (
        <svg {...common}>
          <path d="M8 5v14l11-7L8 5z" />
        </svg>
      );
    case "cart":
      return (
        <svg {...common}>
          <path d="M7 18a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm10 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM3 2h2l3.6 8H18l2-6H7.2L6.4 2H3zm5 10-.8 2H18v2H6l1.6-4H8z" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...common}>
          <path d="M7 2v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7zm12 8H5v10h14V10z" />
        </svg>
      );
    case "google":
    case "review":
      return (
        <svg {...common} viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
      );
    case "square":
      return (
        <svg {...common}>
          <path d="M4.5 4.5h15v15h-15v-15zm2 2v11h11v-11h-11z" />
        </svg>
      );
    case "vcard":
      return (
        <svg {...common}>
          <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm8 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm-5 9.2c.9-1.5 2.7-2.2 5-2.2s4.1.7 5 2.2V18H7v-1.8z" />
        </svg>
      );
    case "homescreen":
      return (
        <svg {...common}>
          <path d="M12 3 3 10h2v9h5v-5h4v5h5v-9h2L12 3zm0 2.4 6 4.6v8h-1v-5H7v5H6v-8l6-4.6z" />
        </svg>
      );
    case "bookmark":
      return (
        <svg {...common}>
          <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z" />
        </svg>
      );
    case "sms":
      return (
        <svg {...common}>
          <path d="M4 3h16a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2zm2 4v2h12V7H6zm0 4v2h8v-2H6z" />
        </svg>
      );
    case "external":
    case "link":
    default:
      return (
        <svg {...common}>
          <path d="M14 3h7v7h-2V6.4l-9.3 9.3-1.4-1.4L17.6 5H14V3zM5 5h6v2H7v10h10v-4h2v6H5V5z" />
        </svg>
      );
  }
}

export function buttonIconKey(btn: ButtonItem): string {
  if (btn.icon && btn.icon !== "none") return btn.icon;
  return "link";
}
