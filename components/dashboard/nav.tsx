"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CreditCard,
  FolderKanban,
  LayoutDashboard,
  Layers3,
  MapPin,
  Nfc,
  Palette,
  PenTool,
  ScanLine,
  Shield,
  Users,
  Zap,
} from "lucide-react";
import { TapConnectLogo } from "@/components/brand/tap-connect-logo";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/workbench", label: "Workbench", icon: PenTool },
  { href: "/dashboard/campaigns", label: "Campaigns", icon: Layers3 },
  { href: "/dashboard/groups", label: "Groups", icon: FolderKanban },
  { href: "/dashboard/devices", label: "Devices", icon: Nfc },
  { href: "/dashboard/leads", label: "Leads", icon: Users },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/brand", label: "Brand Kit", icon: Palette },
  { href: "/dashboard/integrations", label: "Integrations", icon: Zap },
  { href: "/dashboard/scan", label: "Scan Mode", icon: ScanLine },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
];

export function DashboardNav({
  businessName,
  showAdminLink = false,
}: {
  businessName: string;
  showAdminLink?: boolean;
}) {
  const pathname = usePathname();
  const items = showAdminLink
    ? [{ href: "/admin", label: "Admin", icon: Shield }, ...navItems]
    : navItems;

  return (
    <aside className="hidden w-64 shrink-0 border-r border-border/60 bg-card/40 lg:flex lg:flex-col">
      <div className="border-b border-border/60 px-5 py-5">
        <Link href="/dashboard" className="flex items-center gap-2">
          <TapConnectLogo variant="mark" priority />
          <div>
            <p className="text-sm font-semibold">Tap Connect</p>
            <p className="truncate text-xs text-muted-foreground">{businessName}</p>
          </div>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border/60 p-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5" />
          <span>Multi-location ready</span>
        </div>
      </div>
    </aside>
  );
}

export function MobileDashboardNav({
  businessName,
  showAdminLink = false,
}: {
  businessName: string;
  showAdminLink?: boolean;
}) {
  const pathname = usePathname();
  const items = showAdminLink
    ? [{ href: "/admin", label: "Admin", icon: Shield }, ...navItems]
    : navItems;

  return (
    <div className="border-b border-border/60 bg-card/40 lg:hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <Link href="/dashboard" className="flex items-center gap-2">
          <TapConnectLogo variant="mark" imgClassName="h-8 w-8 rounded-md" />
          <div>
            <p className="text-sm font-semibold">Tap Connect</p>
            <p className="text-xs text-muted-foreground">{businessName}</p>
          </div>
        </Link>
      </div>
      <div className="flex gap-1 overflow-x-auto px-3 pb-3">
        {items.slice(0, 6).map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium",
                active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
