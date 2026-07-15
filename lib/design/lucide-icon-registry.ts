"use client";

import type { LucideIcon } from "lucide-react";
import {
  AtSign,
  Bell,
  Bookmark,
  Briefcase,
  Building2,
  Calendar,
  Camera,
  Car,
  Check,
  CircleHelp,
  Clock,
  Coffee,
  CreditCard,
  Crown,
  Download,
  Dumbbell,
  ExternalLink,
  Gift,
  Globe,
  GraduationCap,
  Handshake,
  Heart,
  Home,
  Image as ImageIcon,
  Info,
  KeyRound,
  Leaf,
  Link as LinkIcon,
  Mail,
  MapPin,
  MessageCircle,
  MessageSquare,
  Mic,
  Music,
  Nfc,
  PawPrint,
  Phone,
  Pin,
  Plane,
  Play,
  Plus,
  QrCode,
  Scissors,
  Search,
  Settings,
  Share2,
  Shield,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Square,
  Star,
  Stethoscope,
  Tag,
  Ticket,
  Trash2,
  Upload,
  User,
  Users,
  Utensils,
  Wallet,
  Zap,
} from "lucide-react";
import { BRAND_ICON_DEFS } from "@/lib/design/brand-icons";

export type LucideLibraryItem = {
  id: string;
  label: string;
  keywords: string[];
  category: "common" | "social" | "commerce" | "media" | "places" | "actions";
  /** Lucide component — social brands may be null and rendered via BrandSvg */
  Icon?: LucideIcon;
  /** Use simple-icons / brand glyph id when set */
  brand?: string;
  /** Official brand hex (for preview defaults) */
  brandHex?: string;
};

/**
 * Curated Lucide + simple-icons library.
 * Social brands use BrandSvg (simple-icons paths).
 */
export const LUCIDE_ICON_LIBRARY: LucideLibraryItem[] = [
  // Common
  { id: "home", label: "Home", keywords: ["house", "main"], category: "common", Icon: Home },
  { id: "settings", label: "Settings", keywords: ["gear", "prefs", "cog"], category: "common", Icon: Settings },
  { id: "user", label: "User", keywords: ["person", "profile", "account"], category: "common", Icon: User },
  { id: "trash", label: "Trash", keywords: ["delete", "remove", "bin"], category: "common", Icon: Trash2 },
  { id: "search", label: "Search", keywords: ["find", "magnify"], category: "common", Icon: Search },
  { id: "users", label: "Users", keywords: ["team", "people", "group"], category: "common", Icon: Users },
  { id: "bell", label: "Notifications", keywords: ["alert", "bell"], category: "common", Icon: Bell },
  { id: "heart", label: "Heart", keywords: ["love", "favorite", "like"], category: "common", Icon: Heart },
  { id: "star", label: "Star", keywords: ["favorite", "rating", "review"], category: "common", Icon: Star },
  { id: "check", label: "Check", keywords: ["done", "ok", "success"], category: "common", Icon: Check },
  { id: "plus", label: "Plus", keywords: ["add", "new", "create"], category: "common", Icon: Plus },
  { id: "info", label: "Info", keywords: ["about", "details"], category: "common", Icon: Info },
  { id: "help", label: "Help", keywords: ["faq", "question", "support"], category: "common", Icon: CircleHelp },
  { id: "link", label: "Link", keywords: ["url", "web", "href"], category: "common", Icon: LinkIcon },
  { id: "external", label: "External", keywords: ["open", "new tab"], category: "common", Icon: ExternalLink },
  { id: "globe", label: "Globe / Website", keywords: ["web", "www", "internet"], category: "common", Icon: Globe },
  { id: "phone", label: "Phone", keywords: ["call", "tel", "mobile"], category: "common", Icon: Phone },
  { id: "mail", label: "Email", keywords: ["email", "inbox", "message"], category: "common", Icon: Mail },
  { id: "sms", label: "SMS / Chat", keywords: ["text", "message"], category: "common", Icon: MessageSquare },
  { id: "map", label: "Map", keywords: ["location", "directions", "gps"], category: "common", Icon: MapPin },
  { id: "calendar", label: "Calendar", keywords: ["schedule", "book", "date"], category: "common", Icon: Calendar },
  { id: "clock", label: "Clock", keywords: ["time", "hours"], category: "common", Icon: Clock },
  { id: "download", label: "Download", keywords: ["save", "file"], category: "common", Icon: Download },
  { id: "upload", label: "Upload", keywords: ["file", "import"], category: "common", Icon: Upload },
  { id: "share", label: "Share", keywords: ["send", "forward"], category: "common", Icon: Share2 },
  { id: "bookmark", label: "Bookmark", keywords: ["save", "favorite"], category: "common", Icon: Bookmark },
  { id: "smartphone", label: "Phone device", keywords: ["mobile", "app"], category: "common", Icon: Smartphone },
  { id: "homescreen", label: "Add to Home", keywords: ["install", "shortcut"], category: "common", Icon: Home },
  { id: "nfc", label: "NFC / Tap", keywords: ["tap", "wireless"], category: "common", Icon: Nfc },
  { id: "qr", label: "QR Code", keywords: ["scan", "code"], category: "common", Icon: QrCode },
  { id: "sparkles", label: "Sparkles", keywords: ["magic", "new", "special"], category: "common", Icon: Sparkles },
  { id: "zap", label: "Zap", keywords: ["energy", "fast", "power"], category: "common", Icon: Zap },
  { id: "shield", label: "Shield", keywords: ["secure", "safe", "trust"], category: "common", Icon: Shield },
  { id: "key", label: "Key", keywords: ["access", "vip", "login"], category: "common", Icon: KeyRound },
  { id: "at", label: "Mention", keywords: ["email", "handle", "@"], category: "common", Icon: AtSign },
  { id: "chat", label: "Message", keywords: ["chat", "support"], category: "common", Icon: MessageCircle },

  // Social — simple-icons brands
  ...BRAND_ICON_DEFS.map(
    (b): LucideLibraryItem => ({
      id: b.id,
      label: b.label,
      keywords: b.keywords,
      category: "social",
      brand: b.id,
      brandHex: b.hex,
    })
  ),

  // Commerce
  { id: "cart", label: "Cart / Shop", keywords: ["buy", "store", "ecommerce"], category: "commerce", Icon: ShoppingCart },
  { id: "square", label: "Square / Pay", keywords: ["pay", "checkout", "trade"], category: "commerce", Icon: Square },
  { id: "tag", label: "Offer / Tag", keywords: ["deal", "sale", "coupon"], category: "commerce", Icon: Tag },
  { id: "gift", label: "Gift", keywords: ["present", "reward"], category: "commerce", Icon: Gift },
  { id: "ticket", label: "Ticket", keywords: ["event", "pass"], category: "commerce", Icon: Ticket },
  { id: "wallet", label: "Wallet", keywords: ["pay", "money"], category: "commerce", Icon: Wallet },
  { id: "creditcard", label: "Credit card", keywords: ["pay", "billing"], category: "commerce", Icon: CreditCard },
  { id: "crown", label: "VIP / Crown", keywords: ["premium", "membership"], category: "commerce", Icon: Crown },
  { id: "briefcase", label: "Briefcase", keywords: ["work", "business"], category: "commerce", Icon: Briefcase },
  { id: "handshake", label: "Handshake", keywords: ["deal", "partner"], category: "commerce", Icon: Handshake },
  { id: "vcard", label: "vCard / Contact", keywords: ["download", "vcf", "card"], category: "commerce", Icon: CreditCard },

  // Media
  { id: "play", label: "Play", keywords: ["video", "watch"], category: "media", Icon: Play },
  { id: "camera", label: "Camera", keywords: ["photo", "picture"], category: "media", Icon: Camera },
  { id: "image", label: "Image", keywords: ["photo", "gallery"], category: "media", Icon: ImageIcon },
  { id: "music", label: "Music", keywords: ["audio", "song"], category: "media", Icon: Music },
  { id: "mic", label: "Microphone", keywords: ["podcast", "speak"], category: "media", Icon: Mic },

  // Places
  { id: "pin", label: "Pin", keywords: ["location", "place"], category: "places", Icon: Pin },
  { id: "building", label: "Building", keywords: ["office", "store"], category: "places", Icon: Building2 },
  { id: "car", label: "Car", keywords: ["drive", "ride"], category: "places", Icon: Car },
  { id: "plane", label: "Plane", keywords: ["travel", "flight"], category: "places", Icon: Plane },
  { id: "coffee", label: "Coffee", keywords: ["cafe", "drink"], category: "places", Icon: Coffee },
  { id: "utensils", label: "Restaurant", keywords: ["food", "dining"], category: "places", Icon: Utensils },
  { id: "scissors", label: "Salon", keywords: ["hair", "barber"], category: "places", Icon: Scissors },
  { id: "dumbbell", label: "Fitness", keywords: ["gym", "workout"], category: "places", Icon: Dumbbell },
  { id: "stethoscope", label: "Medical", keywords: ["doctor", "clinic"], category: "places", Icon: Stethoscope },
  { id: "graduation", label: "Education", keywords: ["school", "learn"], category: "places", Icon: GraduationCap },
  { id: "paw", label: "Pet", keywords: ["dog", "cat", "animal"], category: "places", Icon: PawPrint },
  { id: "leaf", label: "Leaf", keywords: ["eco", "nature"], category: "places", Icon: Leaf },
];

export const LUCIDE_ICON_CATEGORIES = [
  "common",
  "social",
  "commerce",
  "media",
  "places",
  "actions",
] as const;

export function searchLucideIcons(query: string, limit = 96): LucideLibraryItem[] {
  const q = query.trim().toLowerCase();
  const pool = LUCIDE_ICON_LIBRARY;
  if (!q) {
    // Prefer common + social first when empty
    const preferred = [
      ...pool.filter((i) => i.category === "common"),
      ...pool.filter((i) => i.category === "social"),
      ...pool.filter((i) => i.category !== "common" && i.category !== "social"),
    ];
    return preferred.slice(0, limit);
  }
  return pool
    .map((item) => {
      const hay = `${item.id} ${item.label} ${item.keywords.join(" ")} ${item.category}`.toLowerCase();
      let score = 0;
      if (item.id === q) score += 100;
      if (item.label.toLowerCase().startsWith(q)) score += 50;
      if (hay.includes(q)) score += 20;
      for (const part of q.split(/\s+/)) {
        if (hay.includes(part)) score += 5;
      }
      return { item, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.item);
}
