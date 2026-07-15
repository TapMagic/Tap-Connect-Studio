"use client";

import {
  Bell,
  Briefcase,
  Building2,
  Camera,
  Car,
  Check,
  CircleHelp,
  Clock,
  Coffee,
  Crown,
  Download,
  Dumbbell,
  Gift,
  Globe,
  GraduationCap,
  Handshake,
  Heart,
  Home,
  Info,
  KeyRound,
  Leaf,
  Mic,
  Music,
  Nfc,
  PawPrint,
  Pin,
  Plane,
  Plus,
  QrCode,
  Scissors,
  Settings,
  Share2,
  Shield,
  Sparkles,
  Stethoscope,
  Tag,
  Ticket,
  Utensils,
  User,
  Users,
  Wallet,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { SocialGlyph } from "@/components/tap/social-icons";

const LUCIDE_MAP: Record<string, LucideIcon> = {
  tag: Tag,
  gift: Gift,
  ticket: Ticket,
  wallet: Wallet,
  camera: Camera,
  music: Music,
  mic: Mic,
  image: Camera,
  globe: Globe,
  pin: Pin,
  building: Building2,
  home: Home,
  car: Car,
  plane: Plane,
  coffee: Coffee,
  utensils: Utensils,
  scissors: Scissors,
  heart: Heart,
  sparkles: Sparkles,
  zap: Zap,
  shield: Shield,
  users: Users,
  user: User,
  clock: Clock,
  download: Download,
  share: Share2,
  qr: QrCode,
  nfc: Nfc,
  bell: Bell,
  chat: Mic,
  help: CircleHelp,
  info: Info,
  check: Check,
  plus: Plus,
  settings: Settings,
  key: KeyRound,
  crown: Crown,
  paw: PawPrint,
  leaf: Leaf,
  dumbbell: Dumbbell,
  stethoscope: Stethoscope,
  graduation: GraduationCap,
  briefcase: Briefcase,
  handshake: Handshake,
};

/** Renders a library icon id, or a custom image URL. */
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
  const Lucide = LUCIDE_MAP[id];
  if (Lucide) {
    return <Lucide className={className} style={{ width: sizePx, height: sizePx }} />;
  }
  return <SocialGlyph platform={id} sizePx={sizePx} className={className} />;
}
