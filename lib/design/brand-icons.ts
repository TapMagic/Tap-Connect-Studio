import {
  siDiscord,
  siFacebook,
  siGithub,
  siGoogle,
  siInstagram,
  siPinterest,
  siSnapchat,
  siSpotify,
  siThreads,
  siTiktok,
  siWhatsapp,
  siX,
  siYelp,
  siYoutube,
  type SimpleIcon,
} from "simple-icons";

/** Major brand logos from simple-icons (path + brand hex). */
export type BrandIconDef = {
  id: string;
  label: string;
  keywords: string[];
  path: string;
  hex: string;
  /** Multi-color marks (e.g. Google) keep official colors unless overridden */
  preserveBrandColors?: boolean;
};

function fromSi(
  id: string,
  label: string,
  keywords: string[],
  icon: SimpleIcon,
  preserveBrandColors = false
): BrandIconDef {
  return {
    id,
    label,
    keywords,
    path: icon.path,
    hex: `#${icon.hex}`,
    preserveBrandColors,
  };
}

/** LinkedIn was removed from simple-icons — local path kept for Tap Connect. */
const LINKEDIN_PATH =
  "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z";

export const BRAND_ICON_DEFS: BrandIconDef[] = [
  fromSi("x", "X / Twitter", ["twitter", "tweet", "social"], siX),
  fromSi("facebook", "Facebook", ["fb", "meta", "social"], siFacebook),
  fromSi("instagram", "Instagram", ["ig", "photo", "reels", "social"], siInstagram),
  {
    id: "linkedin",
    label: "LinkedIn",
    keywords: ["job", "career", "biz", "social"],
    path: LINKEDIN_PATH,
    hex: "#0A66C2",
  },
  fromSi("youtube", "YouTube", ["video", "watch", "social"], siYoutube),
  fromSi("tiktok", "TikTok", ["video", "short", "social"], siTiktok),
  fromSi("github", "GitHub", ["code", "git", "dev", "social"], siGithub),
  fromSi("discord", "Discord", ["chat", "community", "social"], siDiscord),
  fromSi("whatsapp", "WhatsApp", ["chat", "wa", "social"], siWhatsapp),
  fromSi("threads", "Threads", ["meta", "social"], siThreads),
  fromSi("snapchat", "Snapchat", ["snap", "ghost", "social"], siSnapchat),
  fromSi("pinterest", "Pinterest", ["pin", "social"], siPinterest),
  fromSi("yelp", "Yelp", ["review", "social"], siYelp),
  fromSi("spotify", "Spotify", ["music", "audio", "social"], siSpotify),
  fromSi("google", "Google / Reviews", ["g", "review", "maps"], siGoogle, true),
];

export const BRAND_ICON_BY_ID = Object.fromEntries(
  BRAND_ICON_DEFS.map((b) => [b.id, b])
) as Record<string, BrandIconDef>;
