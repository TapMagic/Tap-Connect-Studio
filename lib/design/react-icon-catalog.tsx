"use client";

import type { IconType } from "react-icons";
import type { SVGProps } from "react";
import * as Si from "react-icons/si";
import * as Fi from "react-icons/fi";
import { FaSlack, FaAmazon, FaShopify, FaLinkedin } from "react-icons/fa";

export type ReactIconCategory = "brand" | "ui";

export type ReactIconItem = {
  id: string;
  name: string;
  category: ReactIconCategory;
  Icon: IconType;
  keywords: string[];
};

function humanizeIconKey(key: string): string {
  return key
    .replace(/^(Si|Fi|Fa)/, "")
    .replace(/dot/gi, ".")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
}

function slugFromKey(key: string): string {
  return key
    .replace(/^(Si|Fi|Fa)/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/-+/g, "-");
}

/** Missing from current react-icons/si trademark set — local supplements */
function SiMondaydotcom(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M12.012 4c1.12 0 2.028.907 2.028 2.028 0 .374-.104.725-.282 1.03L18.5 18h-3.24l-3.25-8.12L8.75 18H5.5l4.74-10.94c-.178-.306-.283-.657-.283-1.032C9.957 4.907 10.865 4 11.985 4h.027zM4.2 18.5a1.7 1.7 0 1 1 0-3.4 1.7 1.7 0 0 1 0 3.4zm15.6 0a1.7 1.7 0 1 1 0-3.4 1.7 1.7 0 0 1 0 3.4z" />
    </svg>
  );
}

function SiVrbo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M3.2 5.2h5.1l2.4 8.4L13.2 5.2h5.1L12.6 18.8H8.9L3.2 5.2zm14.4 7.3c1.9 0 3.4 1.5 3.4 3.35S19.5 19.2 17.6 19.2s-3.4-1.5-3.4-3.35 1.5-3.35 3.4-3.35z" />
    </svg>
  );
}

function SiPoshmark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.1 14.4h-2.3V9.7H8.3V7.6h7.4v2.1h-2.6v8.7z" />
    </svg>
  );
}

function isIconComponent(value: unknown): value is IconType {
  return typeof value === "function" || typeof value === "object";
}

function collectPrefix(
  mod: Record<string, unknown>,
  prefix: "Si" | "Fi" | "Fa",
  category: ReactIconCategory
): ReactIconItem[] {
  const out: ReactIconItem[] = [];
  for (const [key, value] of Object.entries(mod)) {
    if (!key.startsWith(prefix) || !isIconComponent(value)) continue;
    const name = humanizeIconKey(key);
    const slug = slugFromKey(key);
    out.push({
      id: key,
      name,
      category,
      Icon: value as IconType,
      keywords: [name.toLowerCase(), slug, key.toLowerCase(), category],
    });
  }
  return out;
}

const EXTRA_BRANDS: ReactIconItem[] = [
  {
    id: "FaSlack",
    name: "Slack",
    category: "brand",
    Icon: FaSlack,
    keywords: ["slack", "chat", "workspace", "brand"],
  },
  {
    id: "SiMondaydotcom",
    name: "Monday.com",
    category: "brand",
    Icon: SiMondaydotcom as IconType,
    keywords: ["monday", "monday.com", "work os", "brand"],
  },
  {
    id: "SiVrbo",
    name: "Vrbo",
    category: "brand",
    Icon: SiVrbo as IconType,
    keywords: ["vrbo", "vacation", "rental", "brand"],
  },
  {
    id: "SiPoshmark",
    name: "Poshmark",
    category: "brand",
    Icon: SiPoshmark as IconType,
    keywords: ["poshmark", "resale", "fashion", "brand"],
  },
  {
    id: "FaLinkedin",
    name: "LinkedIn",
    category: "brand",
    Icon: FaLinkedin,
    keywords: ["linkedin", "jobs", "career", "brand"],
  },
  {
    id: "FaAmazon",
    name: "Amazon",
    category: "brand",
    Icon: FaAmazon,
    keywords: ["amazon", "shop", "brand"],
  },
  {
    id: "FaShopify",
    name: "Shopify (FA)",
    category: "brand",
    Icon: FaShopify,
    keywords: ["shopify", "shop", "brand"],
  },
];

/**
 * Full searchable library: Simple Icons brands + Feather UI + a few FA/local supplements.
 * Search filters this catalog; the grid only renders the current matches.
 */
export const REACT_ICON_COLLECTION: ReactIconItem[] = (() => {
  const si = collectPrefix(Si as unknown as Record<string, unknown>, "Si", "brand");
  const fi = collectPrefix(Fi as unknown as Record<string, unknown>, "Fi", "ui");
  const byId = new Map<string, ReactIconItem>();
  for (const item of [...EXTRA_BRANDS, ...si, ...fi]) {
    if (!byId.has(item.id)) byId.set(item.id, item);
  }
  // Prefer curated extras first in empty search (aliases for missing SI marks)
  const extras = EXTRA_BRANDS.filter((e) => byId.get(e.id) === e);
  const rest = [...byId.values()].filter((i) => !extras.some((e) => e.id === i.id));
  return [...extras, ...rest];
})();

const BY_ID = new Map(REACT_ICON_COLLECTION.map((i) => [i.id.toLowerCase(), i]));
const BY_SLUG = new Map(
  REACT_ICON_COLLECTION.map((i) => [slugFromKey(i.id), i] as const)
);
const BY_NAME = new Map(
  REACT_ICON_COLLECTION.map((i) => [i.name.toLowerCase(), i] as const)
);

/** Friendly short ids used historically in Tap Card configs */
const LEGACY_ALIASES: Record<string, string> = {
  home: "FiHome",
  settings: "FiSettings",
  user: "FiUser",
  trash: "FiTrash2",
  search: "FiSearch",
  external: "FiExternalLink",
  calendar: "FiCalendar",
  mail: "FiMail",
  phone: "FiPhone",
  camera: "FiCamera",
  folder: "FiFolder",
  map: "FiMapPin",
  heart: "FiHeart",
  star: "FiStar",
  check: "FiCheck",
  "arrow-right": "FiArrowRight",
  link: "FiLink",
  globe: "FiGlobe",
  download: "FiDownload",
  share: "FiShare2",
  image: "FiImage",
  git: "SiGit",
  google: "SiGoogle",
  icloud: "SiIcloud",
  airbnb: "SiAirbnb",
  etsy: "SiEtsy",
  slack: "FaSlack",
  monday: "SiMondaydotcom",
  vrbo: "SiVrbo",
  poshmark: "SiPoshmark",
  facebook: "SiFacebook",
  instagram: "SiInstagram",
  tiktok: "SiTiktok",
  youtube: "SiYoutube",
  linkedin: "FaLinkedin",
  github: "SiGithub",
  discord: "SiDiscord",
  whatsapp: "SiWhatsapp",
  shopify: "SiShopify",
  ebay: "SiEbay",
};

export function getReactIconById(id?: string | null): ReactIconItem | undefined {
  if (!id) return undefined;
  const key = id.trim();
  const lower = key.toLowerCase();
  return (
    BY_ID.get(lower) ||
    BY_SLUG.get(lower) ||
    BY_NAME.get(lower) ||
    (LEGACY_ALIASES[lower] ? BY_ID.get(LEGACY_ALIASES[lower].toLowerCase()) : undefined)
  );
}

export function searchReactIcons(query: string, limit = 96): ReactIconItem[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    // Empty search: curated brands first, then a slice of UI essentials
    const featured = [
      "SiGit",
      "FaSlack",
      "SiMondaydotcom",
      "SiGoogle",
      "SiIcloud",
      "SiVrbo",
      "SiAirbnb",
      "SiEtsy",
      "SiPoshmark",
      "SiShopify",
      "SiEbay",
      "SiInstagram",
      "SiFacebook",
      "SiTiktok",
      "SiYoutube",
      "SiGithub",
      "SiDiscord",
      "FiHome",
      "FiSettings",
      "FiUser",
      "FiMail",
      "FiPhone",
      "FiCalendar",
      "FiMapPin",
      "FiSearch",
      "FiHeart",
      "FiStar",
      "FiLink",
      "FiGlobe",
    ]
      .map((id) => getReactIconById(id))
      .filter(Boolean) as ReactIconItem[];
    const featuredIds = new Set(featured.map((f) => f.id));
    const more = REACT_ICON_COLLECTION.filter((i) => !featuredIds.has(i.id)).slice(
      0,
      Math.max(0, limit - featured.length)
    );
    return [...featured, ...more].slice(0, limit);
  }

  const parts = q.split(/\s+/).filter(Boolean);
  return REACT_ICON_COLLECTION.map((item) => {
    const hay = `${item.id} ${item.name} ${item.keywords.join(" ")}`.toLowerCase();
    let score = 0;
    if (item.id.toLowerCase() === q || item.name.toLowerCase() === q) score += 100;
    if (item.name.toLowerCase().startsWith(q)) score += 60;
    if (hay.includes(q)) score += 30;
    for (const part of parts) {
      if (hay.includes(part)) score += 8;
    }
    return { item, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name))
    .slice(0, limit)
    .map((x) => x.item);
}

export const REACT_ICON_COUNT = REACT_ICON_COLLECTION.length;
