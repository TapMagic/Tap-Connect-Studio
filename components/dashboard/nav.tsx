"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { TapConnectLogo } from "@/components/brand/tap-connect-logo";
import { TapConnectIcon } from "@/components/fusion/icons/tapconnect-icons";
import { NAV_DESTINATION_ICON } from "@/lib/fusion/icons/registry";
import { cn } from "@/lib/utils";
import {
  STUDIO_NAV,
  groupSections,
  resolveStudioDestination,
  sectionsForDestination,
} from "@/lib/fusion/studio/ia";
import {
  resolveZoneTokens,
  zoneForStudioDestination,
} from "@/lib/fusion/studio/zone-tokens";
import {
  resolveSectionReadiness,
  type DisplayReadiness,
} from "@/lib/fusion/readiness/display-status";
import type { ResolveContext } from "@/lib/fusion/features/resolve";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";

const NAV_PREF_KEY = "tapconnect.studio.navExpanded";

function displayTone(d: DisplayReadiness) {
  // Status tokens only — never green (--studio-go). Green is reserved for + Create.
  switch (d) {
    case "owner_ready":
    case "functional_final_verification_required":
      return "text-[color:var(--studio-status-ok)] border-[color:var(--studio-status-ok)]/30";
    case "integrated_incomplete_workflow":
      return "text-[color:var(--studio-status-warn)] border-[color:var(--studio-status-warn)]/40";
    case "verified_credentials_required":
      return "text-[color:var(--studio-status-info)] border-[color:var(--studio-status-info)]/40";
    case "blocked":
      return "text-[color:var(--studio-status-critical)] border-[color:var(--studio-status-critical)]/40";
    case "development":
    case "disabled":
    default:
      return "text-[color:var(--studio-status-neutral)] border-white/12";
  }
}

function subscribeNavPref(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

function getNavExpandedSnapshot() {
  try {
    return window.localStorage.getItem(NAV_PREF_KEY) === "1";
  } catch {
    return false;
  }
}

function useNavExpandedPreference() {
  const expanded = useSyncExternalStore(
    subscribeNavPref,
    getNavExpandedSnapshot,
    () => false
  );

  function persist(next: boolean) {
    try {
      window.localStorage.setItem(NAV_PREF_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
    // Same-tab listeners: storage event does not fire for own writes
    window.dispatchEvent(new Event("storage"));
  }

  return { expanded, setExpanded: persist, ready: true };
}

/**
 * Compact icon rail (default) with remembered expand-to-labels preference.
 * Contextual secondary tray — readiness detail on demand, not chip spam.
 */
export function DashboardNav({
  businessName,
  featureCtx,
}: {
  businessName: string;
  featureCtx?: ResolveContext;
  showAdminLink?: boolean;
}) {
  const pathname = usePathname();
  const destination = resolveStudioDestination(pathname);
  const sections = sectionsForDestination(destination.id);
  const grouped = groupSections(sections);
  const { expanded, setExpanded, ready } = useNavExpandedPreference();
  const [trayOpen, setTrayOpen] = useState(true);
  const [trayFor, setTrayFor] = useState(destination.id);
  if (destination.id !== trayFor) {
    setTrayFor(destination.id);
    setTrayOpen(true);
  }

  return (
    <div className="hidden h-full shrink-0 self-stretch lg:flex" data-nav-ready={ready ? "1" : "0"}>
      <aside
        aria-label="Studio navigation"
        data-testid="studio-nav-rail"
        data-nav-expanded={expanded ? "1" : "0"}
        className={cn(
          "flex h-full flex-col border-r border-white/8 bg-[#070b14] transition-[width] duration-200",
          expanded ? "w-[14rem]" : "w-[3.5rem]"
        )}
      >
        <div
          className={cn(
            "flex shrink-0 items-center border-b border-white/8 py-3",
            expanded ? "justify-between gap-2 px-3" : "flex-col gap-2 px-1.5"
          )}
        >
          <Link
            href="/dashboard"
            className={cn(
              "flex items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
              expanded ? "min-w-0" : "justify-center"
            )}
            title="Tap Connect Studio home"
          >
            <TapConnectLogo variant="mark" priority />
            {expanded ? (
              <div className="min-w-0">
                <p className="text-[13px] font-semibold tracking-tight text-white">
                  Tap Connect
                </p>
                <p className="truncate text-[11px] text-white/45">{businessName}</p>
              </div>
            ) : null}
          </Link>
          <button
            type="button"
            data-testid="studio-nav-expand-toggle"
            aria-label={expanded ? "Collapse navigation labels" : "Expand navigation labels"}
            aria-pressed={expanded}
            className="rounded-md border border-white/10 p-1.5 text-white/50 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            )}
          </button>
        </div>

        <nav
          className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-1.5 py-3"
          aria-label="Studio primary"
        >
          {STUDIO_NAV.map((item) => {
            const active = destination.id === item.id;
            const iconId = NAV_DESTINATION_ICON[item.id] ?? "home";
            const zone = zoneForStudioDestination(item.id);
            const tokens = zone ? resolveZoneTokens(zone) : null;
            // Zone atmosphere on the ACTIVE item only — restrained rail accent,
            // never green (green is reserved for + Create).
            const activeStyle =
              active && tokens
                ? {
                    color: tokens.labelColor,
                    boxShadow: `inset 2px 0 0 0 ${tokens.railAccent}`,
                    background: "rgba(255,255,255,0.05)",
                  }
                : undefined;
            return (
              <Link
                key={item.id}
                href={item.href}
                title={item.description}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg py-2 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                  expanded ? "px-2.5" : "justify-center px-0",
                  active
                    ? "text-white"
                    : "text-white/55 hover:bg-white/5 hover:text-white"
                )}
                style={activeStyle}
                data-nav-zone={item.id}
                data-nav-active={active ? "1" : "0"}
                data-assembly-dest={item.id}
                data-testid={`nav-icon-${item.id}`}
                {...(active ? { "aria-current": "page" as const } : {})}
              >
                <TapConnectIcon
                  id={iconId}
                  className="h-4 w-4 shrink-0 opacity-90"
                  style={active && tokens ? { color: tokens.iconAccent } : undefined}
                  decorative
                />
                {expanded ? <span className="truncate">{item.label}</span> : (
                  <span className="sr-only">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-white/8 p-2">
          <button
            type="button"
            data-testid="studio-nav-tray-toggle"
            aria-expanded={trayOpen && sections.length > 0}
            aria-controls="studio-secondary-tray"
            disabled={sections.length === 0}
            className={cn(
              "flex w-full items-center justify-center gap-1 rounded-md border border-white/10 px-2 py-2 text-[10px] font-medium text-white/55 hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-40",
              expanded ? "justify-between" : null
            )}
            onClick={() => setTrayOpen((v) => !v)}
            title={`${destination.label} tools`}
          >
            {expanded ? (
              <>
                <span className="truncate">{destination.label} tools</span>
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 shrink-0 transition-transform",
                    trayOpen ? "rotate-180" : null
                  )}
                  aria-hidden
                />
              </>
            ) : (
              <Menu className="h-3.5 w-3.5" aria-hidden />
            )}
          </button>
        </div>
      </aside>

      {trayOpen && grouped.length > 0 ? (
        <aside
          id="studio-secondary-tray"
          data-testid="studio-secondary-tray"
          aria-label={`${destination.label} tools`}
          className="flex w-[13.5rem] shrink-0 flex-col border-r border-white/8 bg-[#080c16]"
        >
          <div className="flex items-center justify-between border-b border-white/8 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/55">
              {destination.label}
            </p>
            <button
              type="button"
              className="rounded p-1 text-white/40 hover:bg-white/5 hover:text-white"
              aria-label="Hide tools tray"
              onClick={() => setTrayOpen(false)}
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
          <nav className="min-h-0 flex-1 space-y-3 overflow-y-auto px-2 py-3">
            {grouped.map(({ group, items }) => (
              <div key={group} className="space-y-0.5">
                <p className="px-2 pb-1 text-[10px] font-medium uppercase tracking-wide text-white/55">
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
                        "block rounded-md px-2 py-1.5 text-[12px] transition-colors",
                        sectionActive
                          ? "bg-white/8 text-white"
                          : "text-white/55 hover:bg-white/5 hover:text-white/85"
                      )}
                      title={`${readiness.label}: ${readiness.nextAction}`}
                      {...(sectionActive ? { "aria-current": "page" as const } : {})}
                    >
                      <span className="truncate">{s.label}</span>
                      <span className="mt-0.5 block truncate text-[10px] text-white/50">
                        {s.description}
                      </span>
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
          <p className="shrink-0 border-t border-white/8 px-3 py-2 text-[10px] leading-snug text-white/50">
            Platform Admin is under Settings. Readiness details open from each workspace.
          </p>
        </aside>
      ) : null}
    </div>
  );
}

export function MobileDashboardNav({
  businessName,
  featureCtx,
}: {
  businessName: string;
  featureCtx?: ResolveContext;
  showAdminLink?: boolean;
}) {
  const pathname = usePathname();
  const destination = resolveStudioDestination(pathname);
  const sections = sectionsForDestination(destination.id);
  const grouped = groupSections(sections);
  const panelId = useId();
  const drawerId = useId();
  const moreBtnRef = useRef<HTMLButtonElement>(null);
  const drawerBtnRef = useRef<HTMLButtonElement>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!moreOpen && !drawerOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        if (drawerOpen) {
          setDrawerOpen(false);
          drawerBtnRef.current?.focus();
        } else {
          setMoreOpen(false);
          moreBtnRef.current?.focus();
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moreOpen, drawerOpen]);

  return (
    <div className="border-b border-white/8 bg-[#070b14] lg:hidden">
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <Link href="/dashboard" className="flex min-w-0 items-center gap-2">
          <TapConnectLogo variant="mark" imgClassName="h-8 w-8 rounded-md" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">Tap Connect</p>
            <p className="truncate text-xs text-white/45">{businessName}</p>
          </div>
        </Link>
        <button
          ref={drawerBtnRef}
          type="button"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-white/10 text-white/70 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          aria-expanded={drawerOpen}
          aria-controls={drawerId}
          aria-label="Open navigation menu"
          data-testid="mobile-nav-drawer-toggle"
          onClick={() => setDrawerOpen((v) => !v)}
        >
          {drawerOpen ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
        </button>
      </div>

      {drawerOpen ? (
        <nav
          id={drawerId}
          data-testid="mobile-nav-drawer"
          aria-label="Studio destinations"
          className="space-y-1 border-t border-white/8 px-3 py-3"
        >
          {STUDIO_NAV.map((item) => {
            const active = destination.id === item.id;
            const iconId = NAV_DESTINATION_ICON[item.id] ?? "home";
            const zone = zoneForStudioDestination(item.id);
            const tokens = zone ? resolveZoneTokens(zone) : null;
            const activeStyle =
              active && tokens
                ? {
                    color: tokens.labelColor,
                    boxShadow: `inset 2px 0 0 0 ${tokens.railAccent}`,
                  }
                : undefined;
            return (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
                  active ? "bg-white/[0.07] text-white" : "bg-white/5 text-white/75"
                )}
                style={activeStyle}
                onClick={() => setDrawerOpen(false)}
                data-assembly-dest={item.id}
                data-nav-active={active ? "1" : "0"}
                {...(active ? { "aria-current": "page" as const } : {})}
              >
                <TapConnectIcon
                  id={iconId}
                  className="h-4 w-4 shrink-0"
                  style={active && tokens ? { color: tokens.iconAccent } : undefined}
                  decorative
                />
                <span>
                  <span className="block">{item.label}</span>
                  <span className="block text-[11px] font-normal opacity-70">
                    {item.description}
                  </span>
                </span>
              </Link>
            );
          })}
        </nav>
      ) : null}

      <nav
        className="flex gap-1 overflow-x-auto px-3 pb-2"
        aria-label="Studio primary"
      >
        {STUDIO_NAV.map((item) => {
          const active = destination.id === item.id;
          const zone = zoneForStudioDestination(item.id);
          const tokens = zone ? resolveZoneTokens(zone) : null;
          const activeStyle =
            active && tokens
              ? { color: tokens.labelColor, boxShadow: `inset 0 -2px 0 0 ${tokens.railAccent}` }
              : undefined;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "inline-flex min-h-11 items-center whitespace-nowrap rounded-full px-3 py-2.5 text-xs font-medium",
                active ? "bg-white/[0.07] text-white" : "bg-white/5 text-white/60"
              )}
              style={activeStyle}
              data-nav-active={active ? "1" : "0"}
              {...(active ? { "aria-current": "page" as const } : {})}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {grouped.length > 0 ? (
        <div className="border-t border-white/6 px-3 py-2">
          <button
            ref={moreBtnRef}
            type="button"
            className="flex min-h-11 w-full items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-left text-xs font-medium text-white/80 hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            aria-expanded={moreOpen}
            aria-controls={panelId}
            data-testid="mobile-secondary-nav-toggle"
            onClick={() => setMoreOpen((v) => !v)}
          >
            <span>
              More in {destination.label}
              <span className="ml-1.5 font-normal text-white/45">
                ({sections.length})
              </span>
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 text-white/50 transition-transform",
                moreOpen ? "rotate-180" : null
              )}
              aria-hidden
            />
          </button>
          {moreOpen ? (
            <nav
              id={panelId}
              aria-label={`${destination.label} sections`}
              data-testid="mobile-secondary-nav"
              className="mt-2 max-h-[50vh] space-y-3 overflow-y-auto rounded-xl border border-white/8 bg-black/30 p-2"
            >
              {grouped.map(({ group, items }) => (
                <div key={group} className="space-y-0.5">
                  <p className="px-2 pb-1 text-[10px] font-medium uppercase tracking-wide text-white/45">
                    {group}
                  </p>
                  {items.map((s) => {
                    const readiness = resolveSectionReadiness(s, featureCtx);
                    return (
                      <Link
                        key={s.id}
                        href={s.href}
                        className="block rounded-md px-2 py-2.5 text-[12px] text-white/75 hover:bg-white/5 hover:text-white"
                        title={`${readiness.label}: ${readiness.nextAction}`}
                        onClick={() => setMoreOpen(false)}
                      >
                        <span className="flex items-start justify-between gap-2">
                          <span>
                            <span className="block font-medium text-white/90">{s.label}</span>
                            <span className="mt-0.5 block text-[11px] text-white/40">
                              {s.description}
                            </span>
                          </span>
                          <span
                            className={cn(
                              "mt-0.5 shrink-0 rounded border px-1 py-px text-[9px] uppercase tracking-wide",
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
            </nav>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
