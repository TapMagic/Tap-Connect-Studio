"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { listTapCastChannels } from "@/lib/fusion/tapcast/registry/channels";
import { cn } from "@/lib/utils";

const OVERVIEW_HREF = "/dashboard/experiences/tapcast";
const TIKTOK_HREF = "/dashboard/experiences/tapcast/tiktok";

/**
 * TapCast workspace channel subnav — Overview + registry channels.
 * TikTok is featured/first-class inside TapCast; not an Experiences sibling.
 */
export function TapCastChannelNav() {
  const pathname = usePathname();
  const [hash, setHash] = useState("");

  useEffect(() => {
    const sync = () => setHash(window.location.hash.replace(/^#/, ""));
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [pathname]);

  const channels = useMemo(() => {
    const list = listTapCastChannels();
    return [...list].sort((a, b) => Number(b.firstClass) - Number(a.firstClass));
  }, []);

  const onHub = pathname === OVERVIEW_HREF || pathname === `${OVERVIEW_HREF}/`;
  const onTikTok =
    pathname === TIKTOK_HREF || pathname.startsWith(`${TIKTOK_HREF}/`);

  return (
    <nav
      aria-label="TapCast channels"
      data-testid="tapcast-channel-nav"
      className="border-b border-white/8 bg-black/20"
    >
      <div className="flex gap-1 overflow-x-auto px-5 py-2.5 lg:px-8">
        <Link
          href={OVERVIEW_HREF}
          data-testid="tapcast-nav-overview"
          className={cn(
            "shrink-0 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
            onHub && !hash
              ? "bg-primary/20 text-primary"
              : "text-white/50 hover:bg-white/5 hover:text-white/85"
          )}
          {...(onHub && !hash ? { "aria-current": "page" as const } : {})}
        >
          Overview
        </Link>
        {channels.map((c) => {
          const channelHash = c.href.includes("#") ? c.href.split("#")[1] : "";
          const isTikTok = c.id === "tiktok";
          const active = isTikTok
            ? onTikTok
            : onHub && channelHash
              ? hash === channelHash
              : onHub && !channelHash && hash === c.id;

          return (
            <Link
              key={c.id}
              href={c.href}
              data-testid={`tapcast-nav-${c.id}`}
              className={cn(
                "shrink-0 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                c.firstClass && "ring-1 ring-primary/35",
                active
                  ? "bg-primary/20 text-primary"
                  : "text-white/50 hover:bg-white/5 hover:text-white/85"
              )}
              title={
                c.firstClass
                  ? `${c.name} · first-class TapCast channel`
                  : c.name
              }
              {...(active ? { "aria-current": "page" as const } : {})}
            >
              {c.name}
              {c.firstClass ? (
                <span className="ml-1 text-[9px] uppercase tracking-wide text-primary/80">
                  ★
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
      <p className="px-5 pb-2 text-[10px] text-white/30 lg:px-8">
        TapCast channels · TikTok first-class inside this workspace · Powered by Tap The
        Magic
      </p>
    </nav>
  );
}
