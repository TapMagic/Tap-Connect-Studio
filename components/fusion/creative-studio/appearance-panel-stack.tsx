"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
          <p className="rounded-md border border-white/10 bg-white/5 px-2.5 py-2 text-[11px] text-white/55">
            Brand values are copied into this Card session. Durable live-linked Brand
            sync is Phase 2 — Card formatting remains available locally.
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
