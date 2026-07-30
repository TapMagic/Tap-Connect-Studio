"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { TapConnectCard } from "@/components/tap/tap-connect-card";
import { CardUtilityLayer } from "@/components/tap/card-utility-layer";
import { CampaignPageRenderer } from "@/components/tap/campaign-renderer";
import { CompositionFontLoader } from "@/components/fusion/creative-studio/composition-font-loader";
import type { BrandContactProfile } from "@/lib/brand/contact-profile";
import type { TapConnectCardConfig } from "@/lib/brand/tap-card";
import {
  resolveCardUtilityLayer,
  type ResolvedUtilityLayer,
} from "@/lib/fusion/card/utility-layer";
import type { ContentBlock } from "@/lib/types/campaign";
import { cn } from "@/lib/utils";

type PreviewMode = "card" | "campaign" | "personalized";
type Viewport = "phone" | "tablet" | "desktop";
type PreviewZoom = "fit" | number;
type SurfaceState = "default" | "empty" | "success" | "error";

export type CardPreviewWorkspaceProps = {
  config: TapConnectCardConfig;
  profile: BrandContactProfile;
  businessName: string;
  businessId: string;
  logoUrl?: string | null;
  reviewUrl?: string | null;
  publicHref: string | null;
  campaignBlocks?: ContentBlock[];
  campaignId?: string | null;
  deviceSlotId?: string | null;
  theme?: {
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    textColor: string;
  };
  featureFlags?: Record<string, boolean>;
  keepCardEnabled?: boolean;
  personalizedLabel?: string | null;
};

const VIEWPORT_WIDTH: Record<Viewport, string> = {
  phone: "max-w-[390px]",
  tablet: "max-w-[768px]",
  desktop: "max-w-[1024px]",
};

/**
 * Dedicated view-only Card preview — Product Owner review surface.
 * No editing controls. Large customer-facing render with zoom + states.
 */
export function CardPreviewWorkspace({
  config,
  profile,
  businessName,
  businessId,
  logoUrl,
  reviewUrl,
  publicHref,
  campaignBlocks = [],
  campaignId,
  deviceSlotId,
  theme,
  featureFlags,
  keepCardEnabled = true,
  personalizedLabel,
}: CardPreviewWorkspaceProps) {
  const [mode, setMode] = useState<PreviewMode>(
    campaignBlocks.length > 0 ? "campaign" : "card"
  );
  const [viewport, setViewport] = useState<Viewport>("phone");
  const [zoom, setZoom] = useState<PreviewZoom>("fit");
  const [surface, setSurface] = useState<SurfaceState>("default");

  const featureGate = (id: string) => {
    if (featureFlags && Object.prototype.hasOwnProperty.call(featureFlags, id)) {
      return Boolean(featureFlags[id]);
    }
    return true;
  };

  const utilityLayer: ResolvedUtilityLayer = useMemo(
    () =>
      resolveCardUtilityLayer({
        card: config,
        profile,
        reviewUrl,
        featureEnabled: featureGate,
        keepCardEnabled,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- featureFlags identity
    [config, profile, reviewUrl, keepCardEnabled, featureFlags]
  );

  const widthClass =
    zoom === "fit" ? VIEWPORT_WIDTH[viewport] : "w-[390px] max-w-none";

  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-hidden"
      data-testid="card-preview-workspace"
    >
      <CompositionFontLoader config={config} />
      <header
        className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-2"
        data-testid="card-preview-toolbar"
      >
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
            View-only preview
          </p>
          <p className="truncate text-xs text-white/55">
            Customer-facing review · no editing · Fit / zoom · Campaign + utilities
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/dashboard/card"
            className="rounded-md border border-white/15 px-2.5 py-1 text-xs text-white/80 hover:bg-white/5"
            data-testid="card-preview-back-assembly"
          >
            Assembly
          </Link>
          <Link
            href="/dashboard/card/edit"
            className="rounded-md border border-white/15 px-2.5 py-1 text-xs text-white/80 hover:bg-white/5"
            data-testid="card-preview-open-edit"
          >
            Edit Card
          </Link>
          {publicHref ? (
            <a
              href={publicHref}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
              data-testid="card-preview-open-public"
            >
              Open public URL ↗
            </a>
          ) : null}
          <a
            href="/dashboard/card/preview"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-white/15 px-2.5 py-1 text-xs text-white/70 hover:bg-white/5"
            data-testid="card-preview-detached"
          >
            Detached tab ↗
          </a>
        </div>
      </header>

      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-white/8 px-3 py-2">
        <Segmented
          label="State"
          testId="card-preview-mode"
          value={mode}
          options={[
            { id: "card", label: "Public Card" },
            { id: "campaign", label: "Active Campaign", disabled: campaignBlocks.length === 0 },
            {
              id: "personalized",
              label: personalizedLabel ? "Personalized" : "Personalized (no test data)",
              disabled: !personalizedLabel,
            },
          ]}
          onChange={(v) => setMode(v as PreviewMode)}
        />
        <Segmented
          label="Viewport"
          testId="card-preview-viewport"
          value={viewport}
          options={[
            { id: "phone", label: "Phone" },
            { id: "tablet", label: "Tablet" },
            { id: "desktop", label: "Desktop" },
          ]}
          onChange={(v) => setViewport(v as Viewport)}
        />
        <Segmented
          label="Zoom"
          testId="card-preview-zoom"
          value={zoom === "fit" ? "fit" : zoom === 1 ? "100" : "custom"}
          options={[
            { id: "fit", label: "Fit full Card" },
            { id: "100", label: "100%" },
            { id: "out", label: "−" },
            { id: "in", label: "+" },
          ]}
          onChange={(v) => {
            if (v === "fit") setZoom("fit");
            else if (v === "100") setZoom(1);
            else if (v === "out")
              setZoom((z) =>
                z === "fit" ? 0.85 : Math.max(0.6, Math.round((Number(z) - 0.15) * 100) / 100)
              );
            else
              setZoom((z) =>
                z === "fit" ? 1.15 : Math.min(1.6, Math.round((Number(z) + 0.15) * 100) / 100)
              );
          }}
        />
        <Segmented
          label="Surface"
          testId="card-preview-surface"
          value={surface}
          options={[
            { id: "default", label: "Default" },
            { id: "empty", label: "Empty" },
            { id: "success", label: "Success" },
            { id: "error", label: "Error" },
          ]}
          onChange={(v) => setSurface(v as SurfaceState)}
        />
      </div>

      <div
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4"
        data-testid="card-preview-canvas"
      >
        <div className="mx-auto flex justify-center pb-16">
          <div
            className={cn(
              "origin-top rounded-[1.5rem] border border-white/10 bg-[#0b0f19] shadow-2xl",
              widthClass,
              zoom === "fit" ? "w-full" : undefined
            )}
            style={
              zoom === "fit"
                ? undefined
                : { transform: `scale(${zoom})`, marginBottom: `${(Number(zoom) - 1) * 30}%` }
            }
            data-testid="card-preview-frame"
            data-viewport={viewport}
            data-zoom={zoom === "fit" ? "fit" : String(zoom)}
            data-mode={mode}
          >
            {surface === "empty" ? (
              <EmptyPreview />
            ) : surface === "error" ? (
              <ErrorPreview />
            ) : surface === "success" ? (
              <SuccessPreview />
            ) : mode === "campaign" && campaignBlocks.length > 0 ? (
              <div className="overflow-hidden rounded-[1.4rem]">
                <CampaignPageRenderer
                  blocks={campaignBlocks}
                  theme={
                    theme ?? {
                      primaryColor: config.accentColor,
                      secondaryColor: "#0ea5e9",
                      backgroundColor: config.surfaceColor,
                      textColor: config.textColor,
                    }
                  }
                  campaignId={campaignId ?? "preview"}
                  deviceSlotId={deviceSlotId ?? "preview"}
                  businessId={businessId}
                  businessName={businessName}
                  brandKit={
                    {
                      tapCard: config,
                      primaryColor: theme?.primaryColor ?? config.accentColor,
                      secondaryColor: theme?.secondaryColor ?? "#0ea5e9",
                      accentColor: config.accentColor,
                      backgroundColor: theme?.backgroundColor ?? config.surfaceColor,
                      textColor: theme?.textColor ?? config.textColor,
                      socialLinks: profile,
                    } as never
                  }
                  logoUrl={logoUrl}
                  contactProfile={profile}
                  reviewUrl={reviewUrl}
                  previewMode
                  keepCardEnabled={keepCardEnabled}
                  featureFlags={featureFlags}
                  utilityLayerEnabled
                />
              </div>
            ) : (
              <div className="space-y-3 p-3">
                {mode === "personalized" && personalizedLabel ? (
                  <p
                    className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary"
                    data-testid="card-preview-personalized-banner"
                  >
                    Personalized preview · {personalizedLabel}
                  </p>
                ) : null}
                <TapConnectCard
                  config={config}
                  profile={profile}
                  businessName={businessName}
                  logoUrl={logoUrl}
                  reviewUrl={reviewUrl}
                  forceExpanded
                />
                {utilityLayer.visible ? (
                  <CardUtilityLayer
                    layer={utilityLayer}
                    businessId={businessId}
                    businessName={businessName}
                    campaignId={campaignId ?? undefined}
                    deviceSlotId={deviceSlotId ?? undefined}
                    profile={profile}
                    previewMode
                    accentColor={config.accentColor}
                    surfaceColor={config.surfaceColor}
                    textColor={config.textColor}
                  />
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Segmented({
  label,
  testId,
  value,
  options,
  onChange,
}: {
  label: string;
  testId: string;
  value: string;
  options: { id: string; label: string; disabled?: boolean }[];
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1" data-testid={testId}>
      <span className="text-[10px] font-semibold uppercase tracking-wide text-white/55">
        {label}
      </span>
      <div className="flex flex-wrap gap-1 rounded-md border border-white/10 p-0.5">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            disabled={o.disabled}
            className={cn(
              "rounded px-2 py-1 text-[11px]",
              value === o.id || (o.id === "100" && value === "100")
                ? "bg-primary text-primary-foreground"
                : "text-white/70 hover:bg-white/5",
              o.disabled && "cursor-not-allowed opacity-40"
            )}
            onClick={() => onChange(o.id)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function EmptyPreview() {
  return (
    <div className="space-y-3 p-8 text-center" data-testid="card-preview-empty">
      <p className="text-sm font-medium text-white">Nothing to show yet</p>
      <p className="text-xs text-white/55">
        Add Card sections or publish a Campaign to preview the customer experience.
      </p>
    </div>
  );
}

function SuccessPreview() {
  return (
    <div className="space-y-3 p-8 text-center" data-testid="card-preview-success">
      <p className="text-sm font-medium text-emerald-200">Action completed</p>
      <p className="text-xs text-white/55">
        Example success state — Keep confirmation, support sent, or offer unlocked.
      </p>
    </div>
  );
}

function ErrorPreview() {
  return (
    <div className="space-y-3 p-8 text-center" data-testid="card-preview-error">
      <p className="text-sm font-medium text-red-200">Something went wrong</p>
      <p className="text-xs text-white/55">
        Example error state — network or validation. Customers see plain language, not codes.
      </p>
    </div>
  );
}
