"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ReusableDesignBrowser } from "@/components/fusion/creative-studio/reusable-design-browser";
import { FinishPicker } from "@/components/design/format-controls";
import { IntelligentPrefillBar } from "@/components/fusion/authoring/intelligent-prefill-bar";
import {
  NestedPanelShell,
  PanelNavRow,
} from "@/components/fusion/creative-studio/nested-panel-shell";
import {
  type BrandFieldKey,
  type BrandInheritanceState,
  type BrandKitSnapshot,
} from "@/lib/fusion/authoring/brand-inheritance";
import {
  DEFAULT_PREFILL_POLICY,
  parsePrefillPolicy,
  type IntelligentPrefillPolicy,
} from "@/lib/fusion/authoring/intelligent-prefill";
import type {
  TapCardSection,
  TapCardSurfaceFill,
  TapConnectCardConfig,
} from "@/lib/brand/tap-card";
type Level = "root" | "colors" | "brand" | "layout" | "segment";
const CARD_PREFILL_POLICY_KEY = "tapconnect:card:intelligent-prefill-policy:v1";

export type AppearancePanelStackProps = {
  config: TapConnectCardConfig;
  selected: TapCardSection | null;
  brandState: BrandInheritanceState;
  onBrandStateChange: (next: BrandInheritanceState) => void;
  patchConfig: (patch: Partial<TapConnectCardConfig>, label?: string) => void;
  patchConfigColor: (
    key:
      | "accentColor"
      | "surfaceColor"
      | "textColor"
      | "pillColor"
      | "pillTextColor"
      | "neonColor",
    value: string
  ) => void;
  patchSection: (
    id: string,
    patch: Partial<TapCardSection>,
    label?: string
  ) => void;
  strInherited: (key: string) => string | undefined;
  onClose?: () => void;
  /** Open directly into a consolidated child when arriving from a legacy tool alias. */
  initialLevel?: Level;
};

export function AppearancePanelStack({
  config,
  selected,
  brandState,
  onBrandStateChange,
  patchConfig,
  patchConfigColor,
  patchSection,
  strInherited,
  onClose,
  initialLevel = "root",
}: AppearancePanelStackProps) {
  const [level, setLevel] = useState<Level>(initialLevel);
  const [prefillPolicy, setPrefillPolicy] =
    useState<IntelligentPrefillPolicy>(DEFAULT_PREFILL_POLICY);
  const [prefillPolicyLoaded, setPrefillPolicyLoaded] = useState(false);
  const approvedSnapshot = useMemo(() => {
    const snapshot: BrandKitSnapshot = {};
    for (const [key, field] of Object.entries(brandState.fields) as [
      BrandFieldKey,
      NonNullable<(typeof brandState.fields)[BrandFieldKey]>,
    ][]) {
      if (field.inheritedValue !== undefined && field.inheritedValue !== null) {
        snapshot[key] = field.inheritedValue;
      }
    }
    return snapshot;
  }, [brandState]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = window.localStorage.getItem(CARD_PREFILL_POLICY_KEY);
        setPrefillPolicy(parsePrefillPolicy(stored ? JSON.parse(stored) : null));
      } catch {
        setPrefillPolicy({ ...DEFAULT_PREFILL_POLICY });
      } finally {
        setPrefillPolicyLoaded(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!prefillPolicyLoaded) return;
    window.localStorage.setItem(CARD_PREFILL_POLICY_KEY, JSON.stringify(prefillPolicy));
  }, [prefillPolicy, prefillPolicyLoaded]);

  const crumbs = useMemo(() => {
    const base = ["Appearance"];
    if (level === "root") return base;
    const labels: Record<Level, string> = {
      root: "Appearance",
      colors: "Colors",
      brand: "Brand",
      layout: "Layout",
      segment: "Selected segment",
    };
    return [...base, labels[level]];
  }, [level]);

  const depth = level === "root" ? 0 : 1;

  return (
    <NestedPanelShell
      title={level === "root" ? "Appearance" : crumbs[crumbs.length - 1]}
      breadcrumbs={crumbs}
      depth={depth}
      onBack={level === "root" ? undefined : () => setLevel("root")}
      onClose={onClose}
      testId="appearance-panel-stack"
    >
      {level === "root" ? (
        <div className="space-y-2" data-testid="appearance-panel-hub">
          <p className="text-[10px] uppercase tracking-wide text-white/40">
            Selection Hub
          </p>
          <PanelNavRow
            label="Colors"
            hint="Accent, surface, text, pills, neon"
            testId="appearance-open-colors"
            onClick={() => setLevel("colors")}
          />
          <PanelNavRow
            label="Brand"
            hint="Brand Kit inheritance for this Card"
            testId="appearance-open-brand"
            onClick={() => setLevel("brand")}
          />
          <PanelNavRow
            label="Layout"
            hint="Shell finish, transparency, action layout"
            testId="appearance-open-layout"
            onClick={() => setLevel("layout")}
          />
          {selected ? (
            <PanelNavRow
              label="Selected segment colors"
              hint={selected.label || selected.type}
              testId="appearance-open-segment"
              onClick={() => setLevel("segment")}
            />
          ) : null}
        </div>
      ) : null}

      {level === "brand" ? (
        <div className="space-y-3" data-testid="appearance-panel-brand">
          <IntelligentPrefillBar
            state={brandState}
            onChange={onBrandStateChange}
            approvedSnapshot={approvedSnapshot}
            policy={prefillPolicy}
            onPolicyChange={setPrefillPolicy}
            sourceSummary="the Business and Brand Kit values loaded for this Card"
          />
          {selected ? (
            <div className="space-y-2 rounded-lg border border-white/10 bg-white/[0.03] p-3" data-testid="brand-library-for-selection">
              <p className="text-xs font-semibold text-white">Brand library · {selected.label || selected.type}</p>
              <p className="text-[11px] text-white/50">Choose an approved resource without leaving the Card editor.</p>
              {(selected.type === "logo_block" || selected.type === "image") && strInherited("logoUrl") ? (
                <Button type="button" size="sm" variant="outline" className="min-h-10 w-full justify-start text-xs" data-testid="brand-select-primary-logo" onClick={() => patchSection(selected.id, { sourceMode: "BRAND", brandResourceId: "brand-primary-logo", brandResourceName: "Primary logo", logoUrl: strInherited("logoUrl"), imageUrl: selected.type === "image" ? strInherited("logoUrl") : selected.imageUrl }, "Selected Brand primary logo")}>Primary logo</Button>
              ) : null}
              <div className="grid grid-cols-3 gap-1.5">
                {([
                  ["Primary", strInherited("primaryColor") || strInherited("accentColor")],
                  ["Background", strInherited("backgroundColor")],
                  ["Text", strInherited("textColor")],
                ] as const).filter((entry) => Boolean(entry[1])).map(([role, value]) => (
                  <button key={role} type="button" className="rounded-lg border border-white/15 p-2 text-left text-[10px]" data-testid={`brand-select-${role.toLowerCase()}`} onClick={() => patchSection(selected.id, { sourceMode: "BRAND", brandResourceId: `brand-${role.toLowerCase()}`, brandResourceName: `${role} color`, accentColor: value! }, `Selected Brand ${role} color`)}>
                    <span className="mb-1 block h-6 rounded" style={{ backgroundColor: value! }} />{role}
                  </button>
                ))}
              </div>
              <Button type="button" size="sm" variant="outline" className="min-h-10 w-full text-xs" onClick={() => patchSection(selected.id, { sourceMode: "LOCAL", brandResourceId: undefined, brandResourceName: undefined }, "Made block custom on this Card")}>Use custom value here</Button>
            </div>
          ) : null}
          <ReusableDesignBrowser<{ colors: { name: string; color: string }[] }>
            kind="PALETTE"
            title="Approved Brand palettes"
            compact
            value={{ colors: [
              { name: "Primary", color: config.accentColor },
              { name: "Background", color: config.surfaceColor },
              { name: "Text", color: config.textColor },
              { name: "Button", color: config.pillColor || "#0c0a07" },
            ] }}
            onInsert={(palette, _label, resource) => {
              const value = (name: string) => palette.colors.find((color) => color.name.toLowerCase() === name)?.color;
              patchConfig({
                accentColor: value("primary") || palette.colors[0]?.color || config.accentColor,
                surfaceColor: value("background") || config.surfaceColor,
                textColor: value("text") || config.textColor,
                pillColor: value("button") || config.pillColor,
              }, `Selected Brand palette ${resource.name}`);
              if (selected) patchSection(selected.id, { sourceMode: "BRAND", brandResourceId: resource.id, brandResourceName: resource.name }, `Selected Brand palette ${resource.name}`);
            }}
          />
          <ReusableDesignBrowser<{ fontFamily: string; fontSizePx: number; fontWeight: number; lineHeight: number; letterSpacingEm: number; color: string }>
            kind="TEXT_STYLE"
            title="Approved Brand typography"
            compact
            value={{
              fontFamily: config.titleFormat?.customFontFamily || config.titleFormat?.fontFamily || "sans",
              fontSizePx: config.titleFormat?.fontSizePx || 28,
              fontWeight: config.titleFormat?.fontWeight === "black" ? 900 : config.titleFormat?.fontWeight === "bold" ? 700 : config.titleFormat?.fontWeight === "semibold" ? 600 : config.titleFormat?.fontWeight === "medium" ? 500 : 400,
              lineHeight: typeof config.titleFormat?.lineHeight === "number" ? config.titleFormat.lineHeight : config.titleFormat?.lineHeight === "tight" ? 1 : config.titleFormat?.lineHeight === "relaxed" ? 1.5 : 1.2,
              letterSpacingEm: config.titleFormat?.letterSpacing === "tight" ? -0.02 : config.titleFormat?.letterSpacing === "wide" ? 0.08 : 0,
              color: config.titleFormat?.color || config.textColor,
            }}
            onInsert={(style, _label, resource) => {
              if (!selected) return;
              patchSection(selected.id, { sourceMode: "BRAND", brandResourceId: resource.id, brandResourceName: resource.name, format: { ...selected.format, customFontFamily: style.fontFamily, fontSizePx: style.fontSizePx, color: style.color } }, `Selected Brand typography ${resource.name}`);
            }}
          />
          <p className="rounded-md border border-white/10 bg-white/5 px-2.5 py-2 text-[11px] text-white/55">
            Brand is optional. “From Brand” records the selected role; “Custom on this Card” keeps later Brand changes from overwriting the block.
          </p>
        </div>
      ) : null}

      {level === "colors" || level === "segment" ? (
        <div className="space-y-3" data-testid="appearance-panel-colors">
          {level === "colors" ? (
            <>
              <p className="text-xs font-semibold text-white">Card colors</p>
              <div className="flex flex-wrap gap-3">
                {(
                  [
                    ["accentColor", "Accent"],
                    ["surfaceColor", "Surface"],
                    ["textColor", "Text"],
                    ["pillColor", "Pill fill"],
                    ["pillTextColor", "Pill text"],
                    ["neonColor", "Neon glow"],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key} className="space-y-1">
                    <Label className="text-[10px]">{label}</Label>
                    <Input
                      type="color"
                      aria-label={`${label} color`}
                      className="h-9 w-14 cursor-pointer p-1"
                      data-testid={`card-color-${key}`}
                      value={
                        (config[key] as string | undefined) ||
                        (key === "pillColor"
                          ? "#0c0a07"
                          : key === "pillTextColor"
                            ? "#f5e6a8"
                            : key === "accentColor" || key === "neonColor"
                              ? strInherited("accentColor") ||
                                strInherited("primaryColor") ||
                                config.accentColor
                              : key === "surfaceColor"
                                ? strInherited("backgroundColor") ||
                                  config.surfaceColor ||
                                  config.accentColor
                                : key === "textColor"
                                  ? strInherited("textColor") ||
                                    config.textColor ||
                                    config.accentColor
                                  : config.accentColor)
                      }
                      onChange={(e) => patchConfigColor(key, e.target.value)}
                    />
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Card background</Label>
                <select
                  aria-label="Card background fill"
                  className="flex h-9 w-full rounded-lg border border-input bg-background px-2 text-xs"
                  value={config.surfaceFill || "solid"}
                  onChange={(e) =>
                    patchConfig({
                      surfaceFill: e.target.value as TapCardSurfaceFill,
                    })
                  }
                >
                  <option value="solid">Solid</option>
                  <option value="gradient">Gradient</option>
                </select>
              </div>
            </>
          ) : null}
          {level === "segment" && selected ? (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Fill</Label>
                <Input
                  type="color"
                  value={selected.backgroundColor || config.pillColor || "#0c0a07"}
                  onChange={(e) =>
                    patchSection(selected.id, {
                      backgroundColor: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <Label className="text-xs">Text</Label>
                <Input
                  type="color"
                  value={selected.textColor || config.pillTextColor || "#f5e6a8"}
                  onChange={(e) =>
                    patchSection(selected.id, { textColor: e.target.value })
                  }
                />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {level === "layout" ? (
        <div className="space-y-3" data-testid="appearance-panel-layout">
          <FinishPicker
            label="Card shell"
            value={config.cardFinish}
            allowNone={false}
            onChange={(cardFinish) => {
              if (cardFinish) patchConfig({ cardFinish });
            }}
          />
          <div className="min-w-[140px] space-y-1">
            <Label className="text-[10px]">
              Transparency {config.surfaceOpacity ?? 100}%
            </Label>
            <input
              type="range"
              min={35}
              max={100}
              aria-label="Card surface transparency"
              value={config.surfaceOpacity ?? 100}
              onChange={(e) =>
                patchConfig({ surfaceOpacity: Number(e.target.value) })
              }
              className="w-full"
            />
          </div>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={config.collapsible}
              onChange={(e) => patchConfig({ collapsible: e.target.checked })}
            />
            Collapsible
          </label>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={Boolean(config.compactActionsOnly)}
              onChange={(e) =>
                patchConfig({ compactActionsOnly: e.target.checked })
              }
            />
            Buttons only
          </label>
        </div>
      ) : null}
    </NestedPanelShell>
  );
}
