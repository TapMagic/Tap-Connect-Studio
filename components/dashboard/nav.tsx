"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  LayoutDashboard,
  Layers3,
  Nfc,
  Palette,
  Settings,
  Users,
} from "lucide-react";
import { TapConnectLogo } from "@/components/brand/tap-connect-logo";
import { cn } from "@/lib/utils";
import {
  STUDIO_NAV,
  groupSections,
  resolveStudioDestination,
  sectionsForDestination,
} from "@/lib/fusion/studio/ia";
import {
  resolveSectionReadiness,
  type DisplayReadiness,
} from "@/lib/fusion/readiness/display-status";
import type { ResolveContext } from "@/lib/fusion/features/resolve";

const ICONS = {
  home: LayoutDashboard,
  experiences: Layers3,
  tap_points: Nfc,
  audience: Users,
  insights: BarChart3,
  assets: Palette,
  settings: Settings,
} as const;

function displayTone(d: DisplayReadiness) {
  switch (d) {
    case "owner_ready":
      return "text-primary border-primary/40";
    case "functional_final_verification_required":
      return "text-emerald-300/90 border-emerald-500/30";
    case "integrated_incomplete_workflow":
      return "text-amber-200 border-amber-500/40";
    case "verified_credentials_required":
      return "text-sky-200 border-sky-500/40";
    case "blocked":
      return "text-red-200 border-red-500/40";
    case "development":
    case "disabled":
    default:
      return "text-muted-foreground border-border/60";
  }
}

export function DashboardNav({
  businessName,
  featureCtx,
}: {
  businessName: string;
  featureCtx?: ResolveContext;
  /** @deprecated Platform Admin lives under Settings — ignored */
  showAdminLink?: boolean;
}) {
  const pathname = usePathname();
  const destination = resolveStudioDestination(pathname);
  const sections = sectionsForDestination(destination.id);
  const grouped = groupSections(sections);

  return (
    <aside
      aria-label="Studio navigation"
      className="hidden h-full w-[17.5rem] shrink-0 flex-col self-stretch border-r border-white/8 bg-[#070b14] lg:flex"
    >
      <div className="shrink-0 border-b border-white/8 px-4 py-4">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <TapConnectLogo variant="mark" priority />
          <div className="min-w-0">
            <p className="text-[13px] font-semibold tracking-tight text-white">
              Tap Connect Studio
            </p>
            <p className="truncate text-[11px] text-white/45">{businessName}</p>
          </div>
        </Link>
      </div>

      <nav
        className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 py-3"
        aria-label="Studio primary"
      >
        {STUDIO_NAV.map((item) => {
          const active = destination.id === item.id;
          const Icon = ICONS[item.id as keyof typeof ICONS] ?? LayoutDashboard;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
                active
                  ? "bg-primary/15 text-primary"
                  : "text-white/55 hover:bg-white/5 hover:text-white"
              )}
              {...(active ? { "aria-current": "page" as const } : {})}
            >
              <Icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
              {item.label}
            </Link>
          );
        })}

        {grouped.length > 0 ? (
          <div className="mt-4 space-y-3 border-t border-white/8 pt-4">
            <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/55">
              {destination.label}
            </p>
            {grouped.map(({ group, items }) => (
              <div key={group} className="space-y-0.5">
                <p className="px-3 pb-1 text-[10px] font-medium uppercase tracking-wide text-white/55">
                  {group}
                </p>
                {items.map((s) => {
                  const readiness = resolveSectionReadiness(s, featureCtx);
                  const sectionActive =
                    pathname === s.href.split("#")[0] ||
                    (s.href.includes("#") === false &&
                      pathname.startsWith(s.href) &&
                      s.href !== destination.href);
                  return (
                    <Link
                      key={s.id}
                      href={s.href}
                      className={cn(
                        "block rounded-md px-3 py-1.5 text-[12px] transition-colors",
                        sectionActive
                          ? "bg-white/8 text-white"
                          : "text-white/50 hover:bg-white/5 hover:text-white/85"
                      )}
                      title={`${readiness.label}: ${readiness.nextAction}`}
                      {...(sectionActive ? { "aria-current": "page" as const } : {})}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate">{s.label}</span>
                        <span
                          className={cn(
                            "shrink-0 rounded border px-1 py-px text-[9px] uppercase tracking-wide",
                            displayTone(readiness.display)
                          )}
                        >
                          {readiness.label.split("—")[0].trim().split(" ")[0]}
                        </span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>
        ) : null}
      </nav>

      <div className="shrink-0 border-t border-white/8 px-4 py-3">
        <p className="text-[10px] leading-snug text-white/55">
          V1 routes remain available inside hubs. Platform Admin is under Settings.
        </p>
      </div>
    </aside>
  );
}

export function MobileDashboardNav({
  businessName,
}: {
  businessName: string;
  featureCtx?: ResolveContext;
  showAdminLink?: boolean;
}) {
  const pathname = usePathname();
  const destination = resolveStudioDestination(pathname);

  return (
    <div className="border-b border-white/8 bg-[#070b14] lg:hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <Link href="/dashboard" className="flex items-center gap-2">
          <TapConnectLogo variant="mark" imgClassName="h-8 w-8 rounded-md" />
          <div>
            <p className="text-sm font-semibold text-white">Tap Connect</p>
            <p className="text-xs text-white/45">{businessName}</p>
          </div>
        </Link>
      </div>
      <nav
        className="flex gap-1 overflow-x-auto px-3 pb-3"
        aria-label="Studio primary"
      >
        {STUDIO_NAV.map((item) => {
          const active = destination.id === item.id;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "inline-flex min-h-11 items-center whitespace-nowrap rounded-full px-3 py-2.5 text-xs font-medium",
                active
                  ? "bg-primary text-primary-foreground"
                  : "bg-white/5 text-white/60"
              )}
              {...(active ? { "aria-current": "page" as const } : {})}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
