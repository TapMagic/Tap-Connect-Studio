"use client";

/**
 * Campaign Format Migration — Adaptive Task Drawer panels for shared visual tools.
 * Host copy uses Brand / Campaign / Preset / Custom — never raw enums.
 */

import type { ReactNode } from "react";
import { MediaPicker } from "@/components/media/media-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  campaignProvenanceLabel,
  checkCampaignContrast,
  classifyCampaignInheritance,
  resolveCampaignSurface,
  resolveSelectedCampaignCta,
  type CampaignVisualModel,
} from "@/lib/fusion/authoring/campaign-visual-resolve";
import { BRAND_COLOR_ROLE_LABELS } from "@/lib/fusion/authoring/brand-kit-adapter";
import { cn } from "@/lib/utils";

export type CampaignVisualDrawerProps = {
  toolId: string | null;
  model: CampaignVisualModel;
  historyLabels?: string[];
  mediaUploadReady?: boolean;
  stockReady?: boolean;
  campaignId?: string;
  onOverrideSurface: (propertyKey: string, value: string) => void;
  onResetSurface: (propertyKey: string) => void;
  onResetThemeToBrand: () => void;
  onOverrideCta: (itemId: string, propertyKey: string, value: string) => void;
  onResetCtaProperty: (itemId: string, propertyKey: string) => void;
  onResetCtaItem: (itemId: string) => void;
  onSelectCta: (itemId: string) => void;
  onApplySimilarCtaBackground: (itemId: string, value: string) => void;
  onThemeExtraChange: (
    patch: Partial<CampaignVisualModel["themeExtras"]>
  ) => void;
  onPreviewBrandChange?: () => void;
  /** Legacy block inspector — kept secondary during migration. */
  legacyInspector?: ReactNode;
  blockOutline?: ReactNode;
};

function ProvenanceChip({ source }: { source: string }) {
  const label = campaignProvenanceLabel(
    source as "brand" | "surface" | "preset" | "custom"
  );
  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        source === "custom" && "bg-amber-500/20 text-amber-200",
        source === "surface" && "bg-[oklch(0.55_0.07_75/0.25)] text-[oklch(0.85_0.06_85)]",
        source === "brand" && "bg-primary/15 text-primary",
        source === "preset" && "bg-white/10 text-white/70"
      )}
      data-testid={`campaign-provenance-${source}`}
    >
      {label}
    </span>
  );
}

export function CampaignVisualDrawer({
  toolId,
  model,
  historyLabels = [],
  mediaUploadReady = false,
  stockReady = false,
  campaignId,
  onOverrideSurface,
  onResetSurface,
  onResetThemeToBrand,
  onOverrideCta,
  onResetCtaProperty,
  onResetCtaItem,
  onSelectCta,
  onApplySimilarCtaBackground,
  onThemeExtraChange,
  onPreviewBrandChange,
  legacyInspector,
  blockOutline,
}: CampaignVisualDrawerProps) {
  const surface = resolveCampaignSurface(model);
  const cta = resolveSelectedCampaignCta(model);
  const selected =
    model.items.find((i) => i.id === model.selectedItemId) ?? model.items[0];
  const contrast = checkCampaignContrast(model);
  const inheritance = classifyCampaignInheritance();

  if (!toolId || toolId === "outline") {
    return (
      <div className="space-y-4" data-testid="campaign-drawer-outline">
        {blockOutline}
        {legacyInspector ? (
          <div
            className="border-t border-white/10 pt-4"
            data-testid="campaign-legacy-inspector"
          >
            <p className="mb-2 text-[10px] uppercase tracking-wide text-white/45">
              Block editor · compatibility
            </p>
            {legacyInspector}
          </div>
        ) : null}
      </div>
    );
  }

  if (toolId === "brand") {
    return (
      <div className="space-y-4" data-testid="campaign-drawer-brand">
        <p className="text-xs text-white/65">
          Brand Kit is the default starting point. This Campaign stores a snapshot —
          not live linked sync.
        </p>
        <p className="text-[11px] text-white/45" data-testid="campaign-inheritance-class">
          Inheritance: {inheritance.class} — {inheritance.summary}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          data-testid="campaign-reset-theme-brand"
          onClick={onResetThemeToBrand}
        >
          Reset entire theme to Brand
        </Button>
        {onPreviewBrandChange ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            data-testid="campaign-preview-brand-change"
            onClick={onPreviewBrandChange}
          >
            Preview Brand change
          </Button>
        ) : null}
        <p className="text-[10px] text-white/40">
          Promote-to-Brand is available from a Custom CTA background when safe.
        </p>
      </div>
    );
  }

  if (toolId === "colors") {
    const keys = [
      { key: "background", label: "Background" },
      { key: "headline", label: "Headline / text" },
      { key: "primary", label: BRAND_COLOR_ROLE_LABELS.primary },
      { key: "secondary", label: BRAND_COLOR_ROLE_LABELS.secondary },
    ] as const;
    return (
      <div className="space-y-4" data-testid="campaign-drawer-colors">
        {keys.map(({ key, label }) => {
          const resolved = surface[key];
          const value = resolved?.value ?? "#000000";
          return (
            <div key={key} className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs">{label}</Label>
                {resolved ? <ProvenanceChip source={resolved.source} /> : null}
              </div>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={value.startsWith("#") ? value.slice(0, 7) : "#000000"}
                  onChange={(e) => onOverrideSurface(key, e.target.value)}
                  className="h-9 w-10 cursor-pointer rounded border-0"
                  data-testid={`campaign-color-${key}`}
                  aria-label={label}
                />
                <Input
                  value={value}
                  onChange={(e) => onOverrideSurface(key, e.target.value)}
                  className="font-mono text-xs"
                  data-testid={`campaign-color-${key}-hex`}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-[10px]"
                data-testid={`campaign-reset-color-${key}`}
                onClick={() => onResetSurface(key)}
              >
                Reset to Brand
              </Button>
            </div>
          );
        })}
        <div className="space-y-2 border-t border-white/10 pt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-white/45">
            Contrast
          </p>
          {contrast.map((c) => (
            <p
              key={c.id + c.label}
              className={cn(
                "text-[11px]",
                c.severity === "fail" && "text-red-300",
                c.severity === "warn" && "text-amber-200",
                c.severity === "ok" && "text-white/55"
              )}
              data-testid={`campaign-contrast-${c.id}`}
            >
              {c.label}: {c.ratio}:1 — {c.message}
            </p>
          ))}
        </div>
      </div>
    );
  }

  if (toolId === "typography") {
    const font = surface.font;
    return (
      <div className="space-y-4" data-testid="campaign-drawer-typography">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Page font role</Label>
          {font ? <ProvenanceChip source={font.source} /> : null}
        </div>
        <select
          className="flex h-9 w-full rounded-lg border border-white/15 bg-black/40 px-2 text-sm"
          value={font?.value ?? "sans"}
          onChange={(e) => onOverrideSurface("font", e.target.value)}
          data-testid="campaign-font-style"
          aria-label="Page font"
        >
          <option value="sans">Modern sans (body)</option>
          <option value="serif">Classic serif</option>
          <option value="display">Display / heading</option>
          <option value="rounded">Friendly rounded</option>
          <option value="mono">Mono</option>
        </select>
        <p className="text-[11px] text-white/45">
          Uses licensed/installed font stacks only. Custom font uploads are not in this
          wave.
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          data-testid="campaign-reset-font"
          onClick={() => onResetSurface("font")}
        >
          Reset font to Brand
        </Button>
      </div>
    );
  }

  if (toolId === "buttons") {
    return (
      <div className="space-y-4" data-testid="campaign-drawer-buttons">
        {model.items.length === 0 ? (
          <p className="text-xs text-white/55">
            Add a Button group or Offer block to customize CTA backgrounds.
          </p>
        ) : (
          <>
            <div className="space-y-1">
              <Label className="text-xs">CTA / button</Label>
              <select
                className="flex h-9 w-full rounded-lg border border-white/15 bg-black/40 px-2 text-sm"
                value={selected?.id ?? ""}
                onChange={(e) => onSelectCta(e.target.value)}
                data-testid="campaign-cta-select"
              >
                {model.items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label} ({item.kind})
                  </option>
                ))}
              </select>
            </div>
            {selected && cta?.background ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Background</Label>
                  <ProvenanceChip source={cta.background.source} />
                </div>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={(cta.background.value ?? "#22c55e").slice(0, 7)}
                    onChange={(e) =>
                      onOverrideCta(selected.id, "background", e.target.value)
                    }
                    className="h-9 w-10 cursor-pointer rounded border-0"
                    data-testid="campaign-cta-bg"
                  />
                  <Input
                    value={cta.background.value ?? ""}
                    onChange={(e) =>
                      onOverrideCta(selected.id, "background", e.target.value)
                    }
                    className="font-mono text-xs"
                    data-testid="campaign-cta-bg-hex"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 w-full text-[11px]"
                  data-testid="campaign-cta-set-custom-proof"
                  onClick={() =>
                    onOverrideCta(selected.id, "background", "#ff00aa")
                  }
                >
                  Set custom proof color
                </Button>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[10px]"
                    data-testid="campaign-cta-reset-bg"
                    onClick={() => onResetCtaProperty(selected.id, "background")}
                  >
                    Reset background to Brand
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[10px]"
                    data-testid="campaign-cta-reset-item"
                    onClick={() => onResetCtaItem(selected.id)}
                  >
                    Reset button
                  </Button>
                  {cta.background.source === "custom" && cta.background.value ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-[10px]"
                      data-testid="campaign-cta-apply-similar"
                      onClick={() =>
                        onApplySimilarCtaBackground(
                          selected.id,
                          cta.background!.value!
                        )
                      }
                    >
                      Apply to similar
                    </Button>
                  ) : null}
                </div>
                <p className="text-[11px] text-white/45">
                  Text / radius / icon stay inherited unless you change them. One property
                  does not detach the whole button.
                </p>
                {cta.foreground ? (
                  <p className="text-[11px] text-white/50" data-testid="campaign-cta-fg-source">
                    Text: {campaignProvenanceLabel(cta.foreground.source)}
                  </p>
                ) : null}
                {cta.radius ? (
                  <p className="text-[11px] text-white/50" data-testid="campaign-cta-radius-source">
                    Radius: {campaignProvenanceLabel(cta.radius.source)}
                  </p>
                ) : null}
                {cta.icon ? (
                  <p className="text-[11px] text-white/50" data-testid="campaign-cta-icon-source">
                    Icon: {campaignProvenanceLabel(cta.icon.source)}
                  </p>
                ) : null}
              </div>
            ) : null}
          </>
        )}
      </div>
    );
  }

  if (toolId === "media") {
    return (
      <div className="space-y-4" data-testid="campaign-drawer-media">
        <MediaPicker
          label="Page background image"
          value={model.themeExtras.backgroundImage}
          onChange={(url) => onThemeExtraChange({ backgroundImage: url })}
          mediaUploadReady={mediaUploadReady}
          stockReady={stockReady}
          campaignId={campaignId}
        />
        {model.themeExtras.backgroundImage ? (
          <div className="space-y-1">
            <Label className="text-xs">
              Overlay ({model.themeExtras.backgroundOverlayOpacity}%)
            </Label>
            <input
              type="range"
              min={0}
              max={90}
              value={model.themeExtras.backgroundOverlayOpacity}
              onChange={(e) =>
                onThemeExtraChange({
                  backgroundOverlayOpacity: Number(e.target.value),
                })
              }
              className="w-full"
              data-testid="campaign-bg-overlay"
            />
          </div>
        ) : null}
        <p className="text-[11px] text-white/45">
          Reuses the shared media picker. Video DAM and background removal are not in this
          wave.
        </p>
      </div>
    );
  }

  if (toolId === "effects") {
    return (
      <div className="space-y-3" data-testid="campaign-drawer-effects">
        <p className="text-xs text-white/65">
          Effects shown here are only those the public Campaign renderer can honor: border
          radius, finish, opacity, spacing, glow/neon where already supported.
        </p>
        <ul className="space-y-1 text-[11px] text-white/50">
          <li>Basic — opacity, spacing, card chrome</li>
          <li>Contextual — finish, neon (when set on a block)</li>
          <li>Advanced — open Advanced for raw BlockStyle fields</li>
        </ul>
        <p className="text-[10px] text-white/40">
          Decorative controls that never appear publicly stay hidden.
        </p>
        {legacyInspector}
      </div>
    );
  }

  if (toolId === "layout") {
    return (
      <div className="space-y-3" data-testid="campaign-drawer-layout">
        <Label className="text-xs">Default button shape</Label>
        <select
          className="flex h-9 w-full rounded-lg border border-white/15 bg-black/40 px-2 text-sm"
          value={model.themeExtras.defaultButtonShape}
          onChange={(e) =>
            onThemeExtraChange({ defaultButtonShape: e.target.value })
          }
          data-testid="campaign-default-button-shape"
          aria-label="Default button shape"
        >
          <option value="pill">Pill</option>
          <option value="rounded_md">Rounded</option>
          <option value="rounded_lg">Rounded large</option>
          <option value="square">Square</option>
        </select>
        <Label className="text-xs">Default button finish</Label>
        <select
          className="flex h-9 w-full rounded-lg border border-white/15 bg-black/40 px-2 text-sm"
          value={model.themeExtras.defaultButtonFinish || "flat"}
          onChange={(e) =>
            onThemeExtraChange({ defaultButtonFinish: e.target.value })
          }
          data-testid="campaign-default-button-finish"
          aria-label="Default button finish"
        >
          <option value="flat">Flat</option>
          <option value="soft">Soft</option>
          <option value="glass">Glass</option>
          <option value="metallic">Metallic</option>
          <option value="neon">Neon</option>
          <option value="outline">Outline</option>
          <option value="brand">Brand</option>
        </select>
        <p className="text-[11px] text-white/45">
          Defaults apply to newly added buttons. Existing buttons keep their own shape/finish until
          changed. Finish is honored by the public Campaign renderer where set on a button.
        </p>
      </div>
    );
  }

  if (toolId === "templates") {
    return (
      <div className="space-y-3" data-testid="campaign-drawer-templates">
        <p className="text-xs text-white/65">
          Templates stay in Workbench create flow. This Campaign keeps its existing
          structure — open Workbench to start from another template.
        </p>
        <a
          href="/dashboard/workbench"
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-white/15 px-3 text-xs text-white/80 hover:bg-white/5"
          data-testid="campaign-open-workbench-templates"
        >
          Open Workbench templates
        </a>
      </div>
    );
  }

  if (toolId === "readiness") {
    const fails = contrast.filter((c) => c.severity === "fail");
    return (
      <div className="space-y-3" data-testid="campaign-drawer-readiness">
        <p className="text-xs text-white/65">
          Publication still uses the existing Save / Publish path. Contrast warnings do not
          block experimentation; only genuinely unusable pairs should block go-live.
        </p>
        {fails.length === 0 ? (
          <p className="text-sm text-primary" data-testid="campaign-readiness-ok">
            No blocking contrast failures on checked pairs.
          </p>
        ) : (
          <ul className="space-y-1 text-sm text-red-300">
            {fails.map((f) => (
              <li key={f.id}>{f.label}: {f.message}</li>
            ))}
          </ul>
        )}
        <p className="text-[11px] text-white/45">
          Existing published output stays until you republish. Brand Kit edits do not silently
          repaint live Campaigns.
        </p>
      </div>
    );
  }

  if (toolId === "history") {
    return (
      <div className="space-y-3" data-testid="campaign-drawer-history">
        <p className="text-[10px] uppercase tracking-wide text-white/45">
          Current-session visual history
        </p>
        {historyLabels.length === 0 ? (
          <p className="text-xs text-white/50">No visual edits in this session yet.</p>
        ) : (
          <ul className="max-h-48 space-y-1 overflow-y-auto text-xs text-white/70">
            {historyLabels.map((label, i) => (
              <li key={`${label}-${i}`} data-testid={`campaign-history-entry-${i}`}>
                {label}
              </li>
            ))}
          </ul>
        )}
        <p className="text-[11px] text-white/40">
          Session Undo is not the same as saved draft or published version history.
        </p>
      </div>
    );
  }

  if (toolId === "advanced") {
    const sources = Object.fromEntries(
      Object.entries(surface).map(([k, v]) => [k, v.source])
    );
    return (
      <div className="space-y-3" data-testid="campaign-drawer-advanced">
        <p className="text-xs text-white/65">
          Advanced · compatibility — resolved sources and legacy block inspector. Primary
          editing does not require raw JSON.
        </p>
        <pre
          className="max-h-40 overflow-auto rounded-md border border-white/10 bg-black/50 p-2 text-[10px] text-white/60"
          data-testid="campaign-resolved-sources"
        >
          {JSON.stringify(sources, null, 2)}
        </pre>
        {legacyInspector}
      </div>
    );
  }

  return (
    <div className="text-xs text-white/50" data-testid="campaign-drawer-fallback">
      Tool unavailable.
    </div>
  );
}
