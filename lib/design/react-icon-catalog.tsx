"use client";

import type { IconType } from "react-icons";
import type { SVGProps } from "react";
import {
  SiAirbnb,
  SiGit,
  SiGoogle,
  SiIcloud,
} from "react-icons/si";
import { FaSlack } from "react-icons/fa";
import {
  FiArrowRight,
  FiCalendar,
  FiCamera,
  FiCheck,
  FiDownload,
  FiExternalLink,
  FiFolder,
  FiGlobe,
  FiHeart,
  FiHome,
  FiImage,
  FiLink,
  FiMail,
  FiMapPin,
  FiPhone,
  FiSearch,
  FiSettings,
  FiShare2,
  FiStar,
  FiTrash2,
  FiUser,
} from "react-icons/fi";

export type ReactIconCategory = "brand" | "ui";

export type ReactIconItem = {
  /** Stable pick id used in Tap Card / campaign config */
  id: string;
  name: string;
  category: ReactIconCategory;
  Icon: IconType;
};

/** Monday.com — mark removed from Simple Icons; local path for picker catalog */
function SiMondaydotcom(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M12.012 4.0c1.12 0 2.028.907 2.028 2.028 0 .374-.104.725-.282 1.03L18.5 18.0h-3.24l-3.25-8.12L8.75 18H5.5l4.74-10.94c-.178-.306-.283-.657-.283-1.032C9.957 4.907 10.865 4 11.985 4h.027zM4.2 18.5a1.7 1.7 0 1 1 0-3.4 1.7 1.7 0 0 1 0 3.4zm15.6 0a1.7 1.7 0 1 1 0-3.4 1.7 1.7 0 0 1 0 3.4z" />
    </svg>
  );
}

/** Vrbo — mark not shipped in current react-icons/si; local brand path */
function SiVrbo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M3.2 5.2h5.1l2.4 8.4L13.2 5.2h5.1L12.6 18.8H8.9L3.2 5.2zm14.4 7.3c1.9 0 3.4 1.5 3.4 3.35S19.5 19.2 17.6 19.2s-3.4-1.5-3.4-3.35 1.5-3.35 3.4-3.35z" />
    </svg>
  );
}

/**
 * Hardcoded searchable icon collection.
 * Brands: react-icons/si (+ fa for Slack; Monday/Vrbo local when SI exports missing).
 * UI: react-icons/fi (Feather).
 */
export const REACT_ICON_COLLECTION: ReactIconItem[] = [
  // Brand category (exact set requested)
  { id: "git", name: "Git", category: "brand", Icon: SiGit },
  { id: "slack", name: "Slack", category: "brand", Icon: FaSlack },
  { id: "monday", name: "Monday.com", category: "brand", Icon: SiMondaydotcom as IconType },
  { id: "google", name: "Google", category: "brand", Icon: SiGoogle },
  { id: "icloud", name: "iCloud", category: "brand", Icon: SiIcloud },
  { id: "vrbo", name: "Vrbo", category: "brand", Icon: SiVrbo as IconType },
  { id: "airbnb", name: "Airbnb", category: "brand", Icon: SiAirbnb },

  // UI utilities (15–20+)
  { id: "home", name: "Home", category: "ui", Icon: FiHome },
  { id: "settings", name: "Settings", category: "ui", Icon: FiSettings },
  { id: "user", name: "User", category: "ui", Icon: FiUser },
  { id: "trash", name: "Trash", category: "ui", Icon: FiTrash2 },
  { id: "search", name: "Search", category: "ui", Icon: FiSearch },
  { id: "external", name: "ExternalLink", category: "ui", Icon: FiExternalLink },
  { id: "calendar", name: "Calendar", category: "ui", Icon: FiCalendar },
  { id: "mail", name: "Mail", category: "ui", Icon: FiMail },
  { id: "phone", name: "Phone", category: "ui", Icon: FiPhone },
  { id: "camera", name: "Camera", category: "ui", Icon: FiCamera },
  { id: "folder", name: "Folder", category: "ui", Icon: FiFolder },
  { id: "map", name: "MapPin", category: "ui", Icon: FiMapPin },
  { id: "heart", name: "Heart", category: "ui", Icon: FiHeart },
  { id: "star", name: "Star", category: "ui", Icon: FiStar },
  { id: "check", name: "Check", category: "ui", Icon: FiCheck },
  { id: "arrow-right", name: "ArrowRight", category: "ui", Icon: FiArrowRight },
  { id: "link", name: "Link", category: "ui", Icon: FiLink },
  { id: "globe", name: "Globe", category: "ui", Icon: FiGlobe },
  { id: "download", name: "Download", category: "ui", Icon: FiDownload },
  { id: "share", name: "Share", category: "ui", Icon: FiShare2 },
  { id: "image", name: "Image", category: "ui", Icon: FiImage },
];

export function searchReactIcons(query: string, limit = 96): ReactIconItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return REACT_ICON_COLLECTION.slice(0, limit);
  return REACT_ICON_COLLECTION.filter(
    (item) =>
      item.name.toLowerCase().includes(q) ||
      item.id.includes(q) ||
      item.category.includes(q)
  ).slice(0, limit);
}

export function getReactIconById(id?: string | null): ReactIconItem | undefined {
  if (!id) return undefined;
  const key = id.toLowerCase();
  return REACT_ICON_COLLECTION.find((i) => i.id === key || i.name.toLowerCase() === key);
}
