"use client";

/**
 * Studio chrome that can enter Authoring Escape mode on focused routes.
 * Hides primary/secondary nav and top bar so edit/preview own the viewport.
 */

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { PanelLeft, X } from "lucide-react";
import { cn } from "@/lib/utils";

const ESCAPE_PREFIXES = [
  "/dashboard/card/edit",
  "/dashboard/card/preview",
  "/dashboard/brand/edit",
];

export function isAuthoringEscapePath(pathname: string | null): boolean {
  if (!pathname) return false;
  return ESCAPE_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

export type DashboardChromeProps = {
  businessName: string;
  children: ReactNode;
  nav: ReactNode;
  mobileNav: ReactNode;
  topBar: ReactNode;
  banner?: ReactNode;
};

export function DashboardChrome({
  businessName,
  children,
  nav,
  mobileNav,
  topBar,
  banner,
}: DashboardChromeProps) {
  const pathname = usePathname();
  const router = useRouter();
  const escapeDefault = isAuthoringEscapePath(pathname);
  const [restoredForPath, setRestoredForPath] = useState<string | null>(null);
  const escapeActive = escapeDefault && restoredForPath !== pathname;

  const exitEscape = useCallback(() => {
    if (pathname?.startsWith("/dashboard/card/edit")) {
      router.push("/dashboard/card");
      return;
    }
    if (pathname?.startsWith("/dashboard/card/preview")) {
      router.push("/dashboard/card");
      return;
    }
    if (pathname?.startsWith("/dashboard/brand/edit")) {
      router.push("/dashboard/brand");
      return;
    }
    if (pathname) setRestoredForPath(pathname);
  }, [pathname, router]);

  useEffect(() => {
    if (!escapeActive) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        exitEscape();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [escapeActive, exitEscape]);

  return (
    <div
      className={cn(
        "flex min-h-screen flex-col bg-[#050814] text-foreground",
        escapeActive
          ? "h-[100dvh] max-h-[100dvh] overflow-hidden"
          : "lg:h-[100dvh] lg:max-h-[100dvh] lg:overflow-hidden"
      )}
      data-testid="dashboard-chrome"
      data-escape-mode={escapeActive ? "true" : "false"}
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to main content
      </a>
      {banner}
      {!escapeActive ? mobileNav : null}
      {!escapeActive ? topBar : null}

      {escapeActive ? (
        <div
          className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-[#050814] px-3 py-1.5"
          data-testid="authoring-escape-bar"
        >
          <div className="min-w-0">
            <p className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
              Focused workspace
            </p>
            <p className="truncate text-xs text-white/55">{businessName}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-white/15 px-2.5 py-1 text-xs text-white/80 hover:bg-white/5"
              data-testid="authoring-restore-nav"
              onClick={() => pathname && setRestoredForPath(pathname)}
              title="Show Studio navigation"
            >
              <PanelLeft className="h-3.5 w-3.5" aria-hidden />
              Show nav
            </button>
            <button
              type="button"
              className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-white/15 px-2.5 py-1 text-xs text-white/80 hover:bg-white/5"
              data-testid="authoring-exit-escape"
              onClick={exitEscape}
              title={
                pathname?.startsWith("/dashboard/card/edit")
                  ? "Return to Card assembly (Esc) — Command Shade Done is primary"
                  : "Exit focused workspace (Esc)"
              }
            >
              <X className="h-3.5 w-3.5" aria-hidden />
              {pathname?.startsWith("/dashboard/card/edit") ? "Assembly" : "Exit"}
            </button>
          </div>
        </div>
      ) : null}

      <div
        className={cn(
          "mx-auto flex min-h-0 w-full flex-1",
          escapeActive ? "max-w-none" : "max-w-[1680px]"
        )}
      >
        {!escapeActive ? nav : null}
        <main
          id="main-content"
          tabIndex={-1}
          className={cn(
            "min-h-0 min-w-0 flex-1 focus:outline-none",
            escapeActive
              ? "overflow-hidden bg-[#050814]"
              : "overflow-x-hidden overflow-y-auto bg-gradient-to-br from-[#050814] via-[#070b14] to-[#0a1220]"
          )}
          data-testid="dashboard-main"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
