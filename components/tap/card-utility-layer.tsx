"use client";

/**
 * Persistent Card utility layer — page-level actions that survive Campaign resolution.
 * Presentation modes: sticky_bar | bottom_sheet | compact_row | action_deck.
 * Does not cover primary Campaign content; sits below blocks / above powered-by.
 */

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { HelpCircle, BookmarkPlus, Contact, MapPin, Calendar, ShoppingBag } from "lucide-react";
import { KeepCardCta } from "@/components/tap/keep-card-cta";
import { CardSupportForm } from "@/components/fusion/card/card-support-form";
import { SaveContactButton } from "@/components/tap/save-contact";
import type { BrandContactProfile } from "@/lib/brand/contact-profile";
import type { RetentionWalletMode } from "@/lib/fusion/card/retention";
import type {
  ResolvedCardUtility,
  ResolvedUtilityLayer,
} from "@/lib/fusion/card/utility-layer";
import { cn } from "@/lib/utils";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const ICONS: Record<ResolvedCardUtility["kind"], typeof HelpCircle> = {
  keep: BookmarkPlus,
  support: HelpCircle,
  vcard: Contact,
  map: MapPin,
  book: Calendar,
  shop: ShoppingBag,
};

export type CardUtilityLayerProps = {
  layer: ResolvedUtilityLayer;
  businessId: string;
  businessName: string;
  campaignId?: string;
  deviceSlotId?: string;
  profile?: BrandContactProfile | null;
  previewMode?: boolean;
  walletMode?: RetentionWalletMode;
  walletFeatureOn?: boolean;
  /** Brand styling from Card */
  accentColor?: string;
  surfaceColor?: string;
  textColor?: string;
  className?: string;
};

export function CardUtilityLayer({
  layer,
  businessId,
  businessName,
  campaignId,
  deviceSlotId,
  profile = null,
  previewMode = false,
  walletMode = "preview",
  walletFeatureOn = true,
  accentColor = "#a3e635",
  surfaceColor = "#121826",
  textColor = "#f8fafc",
  className,
}: CardUtilityLayerProps) {
  const [supportOpen, setSupportOpen] = useState(false);
  const supportPanelRef = useRef<HTMLDivElement>(null);
  const supportTriggerRef = useRef<HTMLElement | null>(null);
  const eligible = layer.utilities.filter((u) => u.eligible);
  const layerVisible = layer.enabled && layer.visible && eligible.length > 0;

  useEffect(() => {
    if (!supportOpen || !layerVisible) return;
    const panel = supportPanelRef.current;
    if (!panel) return;

    const focusables = () =>
      Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true"
      );

    const previouslyFocused =
      supportTriggerRef.current ?? (document.activeElement as HTMLElement | null);
    const initial = focusables()[0];
    initial?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setSupportOpen(false);
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [supportOpen, layerVisible]);

  if (!layerVisible) return null;

  const keep = eligible.find((u) => u.kind === "keep");
  const others = eligible.filter((u) => u.kind !== "keep");

  const presentation = layer.presentation;
  const shellClass =
    presentation === "sticky_bar"
      ? "sticky bottom-0 z-20 border-t border-white/15 bg-[var(--util-surface)]/95 backdrop-blur-md"
      : presentation === "bottom_sheet"
        ? "mt-4 rounded-t-2xl border border-white/12 bg-[var(--util-surface)] px-3 pb-6 pt-4 shadow-[0_-8px_32px_rgba(0,0,0,0.35)]"
        : presentation === "action_deck"
          ? "mt-4 rounded-xl border border-white/12 bg-[var(--util-surface)] p-3"
          : "mt-4 px-4";

  return (
    <div
      className={cn("tap-utility-layer", shellClass, className)}
      style={
        {
          "--util-accent": accentColor,
          "--util-surface": surfaceColor,
          "--util-text": textColor,
        } as CSSProperties
      }
      data-testid="card-utility-layer"
      data-presentation={presentation}
      aria-label="Card utilities"
    >
      {keep ? (
        <KeepCardCta
          businessId={businessId}
          businessName={businessName}
          campaignId={campaignId}
          deviceSlotId={deviceSlotId}
          enabled
          previewMode={previewMode}
          walletMode={walletMode}
          walletFeatureOn={walletFeatureOn}
          profile={profile}
          className={presentation === "compact_row" ? "!pt-2" : undefined}
        />
      ) : null}

      {others.length > 0 ? (
        <div
          className={cn(
            "flex flex-wrap gap-2",
            presentation === "action_deck" ? "flex-col" : "justify-center",
            keep ? "px-4 pb-3 pt-1" : "py-2"
          )}
          data-testid="card-utility-actions"
        >
          {others.map((u) => (
            <UtilityActionButton
              key={u.kind}
              utility={u}
              onSupport={(el) => {
                supportTriggerRef.current = el;
                setSupportOpen(true);
              }}
              profile={profile}
              businessName={businessName}
            />
          ))}
        </div>
      ) : null}

      {supportOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="Ask a Question"
          data-testid="card-utility-support-sheet"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSupportOpen(false);
          }}
        >
          <div
            ref={supportPanelRef}
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-white/15 bg-[#0b0f19] p-4 shadow-xl"
          >
            <CardSupportForm
              context={{
                businessId,
                campaignId,
                deviceSlotId,
                businessName,
              }}
              onClose={() => setSupportOpen(false)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function UtilityActionButton({
  utility,
  onSupport,
  profile,
  businessName,
}: {
  utility: ResolvedCardUtility;
  onSupport: (trigger: HTMLElement) => void;
  profile: BrandContactProfile | null;
  businessName: string;
}) {
  const Icon = ICONS[utility.kind];
  const baseClass =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[var(--util-accent)]/45 bg-[var(--util-accent)]/12 px-4 py-2 text-sm font-medium text-[var(--util-text)] transition hover:bg-[var(--util-accent)]/22 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--util-accent)]/50";

  if (utility.kind === "support") {
    return (
      <button
        type="button"
        className={baseClass}
        onClick={(e) => onSupport(e.currentTarget)}
        data-testid="card-utility-support"
        data-utility="support"
      >
        <Icon className="h-4 w-4" aria-hidden />
        {utility.label}
      </button>
    );
  }

  if (utility.kind === "vcard" && profile) {
    return (
      <span data-testid="card-utility-vcard" data-utility="vcard">
        <SaveContactButton
          profile={{
            ...profile,
            organization: profile.organization || businessName,
            displayName: profile.displayName || businessName,
          }}
          className={baseClass}
          buttonLabel={utility.label}
        />
      </span>
    );
  }

  if (utility.href) {
    return (
      <a
        href={utility.href}
        className={baseClass}
        data-testid={`card-utility-${utility.kind}`}
        data-utility={utility.kind}
        target={utility.href.startsWith("http") ? "_blank" : undefined}
        rel={utility.href.startsWith("http") ? "noopener noreferrer" : undefined}
      >
        <Icon className="h-4 w-4" aria-hidden />
        {utility.label}
      </a>
    );
  }

  return null;
}
