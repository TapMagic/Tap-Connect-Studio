"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { LockKeyhole } from "lucide-react";
import { TapConnectCard, type TapConnectCardProps } from "@/components/tap/tap-connect-card";
import { CardSurfaceViewportBackdrop } from "@/components/tap/card-surface-viewport-backdrop";
import { PremiumIcon } from "@/components/design/premium-icon";
import type { TapConnectCardConfig, TapExperiencePage } from "@/lib/brand/tap-card";
import {
  projectExperiencePage,
  resolveExperiencePage,
  visibleExperienceNavPages,
} from "@/lib/fusion/card/experience-pages";
import { cn } from "@/lib/utils";
import { LoveAndTheftPickVisual } from "@/components/tap/compact-action-grid";
import {
  destinationPolicyForElement,
  ensureExperienceSession,
  prepareExternalAnchor,
  preserveExperienceReturnContext,
  readExperienceReturnContext,
} from "@/lib/fusion/card/destination-opening-policy";

export type TapConnectExperienceProps = Omit<TapConnectCardProps, "config" | "onInternalPageNavigate"> & {
  config: TapConnectCardConfig;
  activePageId?: string;
  onActivePageChange?: (pageId: string) => void;
  routingMode?: "none" | "history";
  /** Stable public shell base. Page slugs are pushed beneath this path. */
  routeBasePath?: string;
  /** Server-resolved direct Page id or slug for the first render. */
  directPageRef?: string;
  viewportBackdrop?: boolean;
  /** Experience-level furniture rendered above the persistent Page navigation. */
  persistentContent?: ReactNode;
};

const EXPERIENCE_SHELL_LAYERS = {
  content: 1,
  persistent: 20,
  navigation: 1200,
} as const;

export function TapConnectExperience({
  config,
  activePageId: controlledPageId,
  onActivePageChange,
  routingMode = "none",
  routeBasePath,
  directPageRef,
  viewportBackdrop = false,
  persistentContent,
  onNotify,
  ...cardProps
}: TapConnectExperienceProps) {
  const experience = config.experience;
  const initialPageId = useMemo(() => {
    if (!experience) return null;
    if (controlledPageId) return resolveExperiencePage(experience, controlledPageId)?.pageId ?? experience.defaultPageId;
    if (directPageRef) return resolveExperiencePage(experience, directPageRef)?.pageId ?? experience.defaultPageId;
    if (routingMode === "history" && typeof window !== "undefined") {
      const direct = new URL(window.location.href).searchParams.get("page");
      return resolveExperiencePage(experience, direct)?.pageId ?? experience.defaultPageId;
    }
    return experience.defaultPageId;
  }, [controlledPageId, directPageRef, experience, routingMode]);
  const [uncontrolledPageId, setUncontrolledPageId] = useState(initialPageId);
  const requestedPageId = controlledPageId ?? uncontrolledPageId;
  const activePage = experience ? resolveExperiencePage(experience, requestedPageId) : null;
  const pageConfig = experience && activePage ? projectExperiencePage(config, activePage.pageId) : config;
  const navPages = experience ? visibleExperienceNavPages(experience) : [];
  const navigationIsLoveAndTheft = experience?.navigation.itemPresentation === "everencore-love-and-theft-mini-pick";
  const navigationIsFloating = experience?.navigation.presentation === "floating";
  const navigationClearance = navigationIsLoveAndTheft
    ? navigationIsFloating
      ? "calc(6rem + env(safe-area-inset-bottom, 0px))"
      : "calc(5.75rem + env(safe-area-inset-bottom, 0px))"
    : navigationIsFloating
      ? "calc(4.75rem + env(safe-area-inset-bottom, 0px))"
      : "calc(4rem + env(safe-area-inset-bottom, 0px))";

  const selectPage = useCallback((pageId: string, source: "nav" | "action" | "cta" = "nav") => {
    if (!experience) return;
    const target = experience.pages.find((page) => page.pageId === pageId || page.slug === pageId);
    if (!target || !target.pageVisible || target.access?.lockedBehavior?.mode === "hidden") {
      onNotify?.("That Page is not available in this Experience.");
      return;
    }
    const nextPageId = target.pageId;
    if (controlledPageId == null) setUncontrolledPageId(nextPageId);
    onActivePageChange?.(nextPageId);
    if (routingMode === "history" && typeof window !== "undefined") {
      const url = new URL(window.location.href);
      window.history.replaceState({ ...(window.history.state ?? {}), tapExperiencePageId: activePage?.pageId, tapScrollY: window.scrollY }, "", window.location.href);
      if (routeBasePath) {
        const base = routeBasePath.replace(/\/$/, "");
        url.pathname = nextPageId === experience.defaultPageId ? base : `${base}/${target.slug}`;
        url.searchParams.delete("page");
      } else if (nextPageId === experience.defaultPageId) url.searchParams.delete("page");
      else url.searchParams.set("page", nextPageId);
      window.history.pushState({ ...(window.history.state ?? {}), tapExperiencePageId: nextPageId, tapScrollY: 0, source }, "", url);
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [activePage?.pageId, controlledPageId, experience, onActivePageChange, onNotify, routeBasePath, routingMode]);

  useEffect(() => {
    if (!experience || routingMode !== "history") return;
    const onPopState = (event: PopStateEvent) => {
      const url = new URL(window.location.href);
      const base = routeBasePath?.replace(/\/$/, "");
      const requested = base && url.pathname.startsWith(`${base}/`)
        ? decodeURIComponent(url.pathname.slice(base.length + 1).split("/")[0] || "")
        : url.searchParams.get("page");
      const target = resolveExperiencePage(experience, requested);
      if (!target) return;
      if (controlledPageId == null) setUncontrolledPageId(target.pageId);
      onActivePageChange?.(target.pageId);
      window.setTimeout(() => window.scrollTo({ top: Number(event.state?.tapScrollY) || 0, behavior: "instant" }), 0);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [controlledPageId, experience, onActivePageChange, routeBasePath, routingMode]);

  useEffect(() => {
    if (!experience) return;
    ensureExperienceSession(experience.experienceId);
    const onPageShow = () => {
      const saved = readExperienceReturnContext(experience.experienceId);
      if (saved && saved.pageId === activePage?.pageId && saved.url === window.location.href) {
        window.scrollTo({ top: saved.scrollY, behavior: "instant" });
      }
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [activePage?.pageId, experience]);

  const handleDestinationCapture = useCallback((event: MouseEvent<HTMLDivElement>) => {
    if (!experience || !activePage) return;
    const element = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-internal-page-id],[data-destination-policy],a[href]") || null;
    const policy = destinationPolicyForElement(element);
    if (!element || !policy) return;
    if (policy === "internal") {
      const destination = element.dataset.internalPageId;
      if (!destination) return;
      event.preventDefault();
      event.stopPropagation();
      selectPage(destination, "action");
      return;
    }
    preserveExperienceReturnContext({
      experienceId: experience.experienceId,
      pageId: activePage.pageId,
      pageSlug: activePage.slug,
      selectedContentId: element.dataset.locationId || element.dataset.actionId || element.dataset.immersiveContentId,
    });
    if (policy === "external" && element instanceof HTMLAnchorElement) prepareExternalAnchor(element);
  }, [activePage, experience, selectPage]);

  if (!experience || !activePage) return <><TapConnectCard config={config} onNotify={onNotify} {...cardProps} />{persistentContent}</>;

  const locked = activePage.access?.state === "locked";
  return (
    <div
      className={cn("relative min-h-0 w-full", navPages.length && "pb-[var(--experience-shell-nav-clearance)]")}
      style={navPages.length ? {
        "--experience-shell-nav-clearance": navigationClearance,
        "--experience-shell-content-z": EXPERIENCE_SHELL_LAYERS.content,
        "--experience-shell-persistent-z": EXPERIENCE_SHELL_LAYERS.persistent,
        "--experience-shell-navigation-z": EXPERIENCE_SHELL_LAYERS.navigation,
      } as CSSProperties : undefined}
      data-testid="tap-experience-renderer"
      data-experience-id={experience.experienceId}
      data-experience-contract={experience.contractId}
      data-active-page-id={activePage.pageId}
      data-page-analytics-id={activePage.analyticsId}
      data-experience-session-authority="session-storage"
      data-experience-routing={routeBasePath ? "stable-path" : routingMode}
      data-navigation-placement={navPages.length ? "viewport-fixed" : "none"}
      data-navigation-content-clearance={navPages.length ? "automatic" : "none"}
      onClickCapture={handleDestinationCapture}
    >
      {viewportBackdrop ? <CardSurfaceViewportBackdrop config={pageConfig} viewportFixed /> : null}
      <div className="relative z-[var(--experience-shell-content-z)]" key={activePage.pageId} data-testid={`experience-page-${activePage.pageId}`} data-page-transition="instant-preserve-session">
        {locked ? <LockedPage page={activePage} onNavigate={(pageId) => selectPage(pageId, "cta")} /> : <TapConnectCard
          config={pageConfig}
          onNotify={onNotify}
          onInternalPageNavigate={(pageId) => selectPage(pageId, "action")}
          {...cardProps}
        />}
      </div>
      {persistentContent ? <div className="relative z-[var(--experience-shell-persistent-z)]" data-experience-shell-layer="persistent">{persistentContent}</div> : null}
      {navPages.length ? <ExperienceBottomNavigation
        pages={navPages}
        activePageId={activePage.pageId}
        config={experience.navigation}
        onSelect={(page) => selectPage(page.navDestinationPageId || page.pageId, "nav")}
      /> : null}
    </div>
  );
}

function ExperienceBottomNavigation({ pages, activePageId, config, onSelect }: {
  pages: TapExperiencePage[];
  activePageId: string;
  config: NonNullable<TapConnectCardConfig["experience"]>["navigation"];
  onSelect: (page: TapExperiencePage) => void;
}) {
  const loveAndTheft = config.itemPresentation === "everencore-love-and-theft-mini-pick";
  const certifiedPickRange = pages.length <= 3
    ? { min: 52, max: 58, tier: "large" }
    : pages.length === 4
      ? { min: 46, max: 52, tier: "medium" }
      : { min: 40, max: 46, tier: "compact" };
  const style = {
    "--experience-nav-surface": config.surfaceColor || "rgba(7, 11, 16, .92)",
    "--experience-nav-text": config.textColor || "rgba(255,255,255,.62)",
    "--experience-nav-active": config.activeColor || "#b8ff2c",
    "--experience-nav-border": config.borderColor || "rgba(255,255,255,.12)",
    "--experience-nav-blur": `${Math.max(0, Math.min(30, config.blurPx ?? 18))}px`,
    "--experience-nav-pick-min": `${certifiedPickRange.min}px`,
    "--experience-nav-pick-max": `${certifiedPickRange.max}px`,
  } as CSSProperties;
  return <nav
    className={cn(
      "fixed inset-x-0 bottom-0 z-[var(--experience-shell-navigation-z)] mx-auto w-full max-w-lg border-t border-[var(--experience-nav-border)] px-1 pt-1",
      config.presentation === "floating" ? "inset-x-auto left-1/2 bottom-[max(.5rem,env(safe-area-inset-bottom,0px))] w-[calc(100%-16px)] max-w-[calc(32rem-16px)] -translate-x-1/2 pb-2" : "pb-[max(.3rem,env(safe-area-inset-bottom,0px))]",
      (config.surfaceTreatment || "solid") === "solid" && "bg-[var(--experience-nav-surface)]",
      config.surfaceTreatment === "smoky-glass" && "bg-[linear-gradient(180deg,rgba(31,27,22,.78),rgba(4,5,7,.94))] shadow-[inset_0_1px_0_rgba(239,203,125,.2),0_-12px_32px_rgba(0,0,0,.3)] backdrop-blur-[var(--experience-nav-blur)]",
      config.surfaceTreatment === "transparent" && "bg-transparent",
      config.presentation === "floating" && "rounded-2xl border shadow-[0_16px_40px_rgba(0,0,0,.42)]",
    )}
    style={style}
    aria-label="Experience pages"
    data-testid="experience-bottom-navigation"
    data-visible-slots={pages.length}
    data-item-presentation={config.itemPresentation || "standard-icon"}
    data-surface-treatment={config.surfaceTreatment || "solid"}
    data-pick-size-tier={loveAndTheft ? certifiedPickRange.tier : undefined}
    data-shell-layer="navigation"
    data-safe-area="bottom"
  >
    <div className="grid" style={{ gridTemplateColumns: `repeat(${pages.length}, minmax(0, 1fr))` }}>
      {pages.map((page) => {
        const destination = page.navDestinationPageId || page.pageId;
        const active = destination === activePageId;
        const locked = page.access?.state === "locked";
        return <button
          key={page.pageId}
          type="button"
          onClick={() => onSelect(page)}
          aria-current={active ? "page" : undefined}
          aria-label={`${page.navLabel}${locked ? " (locked)" : ""}`}
          className={cn("group flex min-h-12 min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[9px] font-medium tracking-[.01em] text-[var(--experience-nav-text)] transition-colors aria-[current=page]:text-[var(--experience-nav-active)]", !loveAndTheft && "aria-[current=page]:bg-white/[.07]", loveAndTheft && "min-h-[68px]")}
          style={loveAndTheft ? { containerType: "inline-size" } : undefined}
          data-testid={`experience-nav-${page.pageId}`}
          data-nav-destination={destination}
          data-nav-active={active ? "true" : "false"}
        >
          <span className={cn("relative grid place-items-center overflow-visible", loveAndTheft ? "shrink-0" : "h-5 w-6")} aria-hidden style={loveAndTheft ? { width: "clamp(var(--experience-nav-pick-min), 58cqi, var(--experience-nav-pick-max))", aspectRatio: "1.06 / 1" } : undefined}>
            <NavIcon iconRef={page.navIconRef} presentation={config.itemPresentation} active={active} />
            {locked ? <LockKeyhole className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-[var(--experience-nav-surface)] p-px" /> : null}
          </span>
          <span className="max-w-full truncate">{page.navLabel}</span>
          <span className={cn("h-0.5 w-5 rounded-full bg-transparent", active && "bg-[var(--experience-nav-active)]")} aria-hidden />
        </button>;
      })}
    </div>
  </nav>;
}

function NavIcon({ iconRef, presentation, active }: { iconRef?: string; presentation?: NonNullable<TapConnectCardConfig["experience"]>["navigation"]["itemPresentation"]; active?: boolean }) {
  const value = iconRef || "circle";
  if (presentation === "everencore-love-and-theft-mini-pick") {
    return <LoveAndTheftPickVisual iconAssetRef={value.includes(":") ? value : `lucide:${value}`} active={active} compact className="h-full w-full" />;
  }
  if (/^(?:https?:\/\/|\/)/.test(value)) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={value} alt="" className="h-4 w-4 object-contain" />;
  }
  return <PremiumIcon icon={value} sizePx={17} />;
}

function LockedPage({ page, onNavigate }: { page: TapExperiencePage; onNavigate: (pageId: string) => void }) {
  const policy = page.access?.lockedBehavior ?? { mode: "none" as const };
  return <section className="grid min-h-[520px] place-items-center px-6 py-16 text-center" data-testid="experience-locked-page" data-locked-mode={policy.mode}>
    <div className="max-w-xs rounded-3xl border border-white/12 bg-black/45 p-6 text-white shadow-2xl backdrop-blur-xl">
      <LockKeyhole className="mx-auto h-8 w-8 opacity-70" aria-hidden />
      <h1 className="mt-4 text-xl font-semibold">{page.title}</h1>
      {policy.mode === "message" || policy.mode === "cta" ? <p className="mt-2 text-sm text-white/68">{policy.message || "This Page is available with additional access."}</p> : null}
      {policy.mode === "cta" && policy.ctaLabel ? policy.ctaDestinationType === "internal_page" && policy.ctaDestinationRef
        ? <button type="button" onClick={() => onNavigate(policy.ctaDestinationRef!)} className="mt-5 min-h-11 rounded-full bg-white px-5 text-sm font-semibold text-black">{policy.ctaLabel}</button>
        : <a href={policy.ctaDestinationRef || undefined} className="mt-5 inline-flex min-h-11 items-center rounded-full bg-white px-5 text-sm font-semibold text-black">{policy.ctaLabel}</a>
        : null}
    </div>
  </section>;
}
