"use client";

/**
 * Card Adaptive Task Drawer bodies — one tool topic at a time.
 * Hosted via portal into AdaptiveTaskDrawer from TapCardBuilder (shellHosted).
 */

import type { ReactNode } from "react";
import Link from "next/link";
import { Columns2, Rows3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MediaPicker } from "@/components/media/media-picker";
import { FinishPicker, TextFormatControls } from "@/components/design/format-controls";
import { BrandInheritanceBar } from "@/components/fusion/authoring/brand-inheritance-bar";
import { KeywordsSuggestPanel } from "@/components/fusion/keywords/keywords-suggest-panel";
import { cn } from "@/lib/utils";
import {
  TAP_CARD_ACTION_CATALOG,
  TAP_CARD_LAYOUT_OPTIONS,
  TAP_CARD_SHAPE_OPTIONS,
  type TapCardButtonShape,
  type TapCardSection,
  type TapCardSurfaceFill,
  type TapConnectCardConfig,
} from "@/lib/brand/tap-card";
import type { BrandInheritanceState } from "@/lib/fusion/authoring/brand-inheritance";

export type CardShellToolDrawerProps = {
  toolId: string;
  config: TapConnectCardConfig;
  selected: TapCardSection | null;
  sorted: TapCardSection[];
  brandState: BrandInheritanceState;
  mediaUploadReady: boolean;
  stockReady: boolean;
  freeformEnabled: boolean;
  showFreeform: boolean;
  isAdmin: boolean;
  demoPublished: boolean;
  versions: { id: string; version: number; label: string; publishedAt: string }[];
  logoUrl?: string | null;
  brandKitId?: string | null;
  message: string | null;
  onBrandStateChange: (next: BrandInheritanceState) => void;
  patchConfig: (patch: Partial<TapConnectCardConfig>) => void;
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
  patchSection: (id: string, patch: Partial<TapCardSection>) => void;
  onAddSection: (type: string) => void;
  onAddAction: (kind: string) => void;
  setSelectedId: (id: string | null) => void;
  setShowFreeform: (v: boolean) => void;
  onRetireToggle: () => void;
  onPublishDemo: (publish: boolean) => void;
  onRollback: (snapshotId: string) => void;
  strInherited: (key: string) => string | undefined;
};

function HonestNote({ children }: { children: ReactNode }) {
  return (
    <p
      className="rounded-md border border-white/10 bg-white/5 px-2.5 py-2 text-[11px] text-white/55"
      data-testid="card-honest-note"
    >
      {children}
    </p>
  );
}

export function CardShellToolDrawer(props: CardShellToolDrawerProps) {
  const {
    toolId,
    config,
    selected,
    sorted,
    brandState,
    mediaUploadReady,
    stockReady,
    freeformEnabled,
    showFreeform,
    isAdmin,
    demoPublished,
    versions,
    logoUrl,
    brandKitId,
    patchConfig,
    patchConfigColor,
    patchSection,
    onAddSection,
    onAddAction,
    setSelectedId,
    setShowFreeform,
    onBrandStateChange,
    onRetireToggle,
    onPublishDemo,
    onRollback,
    strInherited,
  } = props;

  const resolved =
    toolId === "format" ? "colors" : toolId === "inspector" ? "content" : toolId;

  if (resolved === "outline") {
    return (
      <div className="space-y-2" data-testid="card-drawer-outline">
        <p className="text-xs text-white/55">
          Segments on this Card. Select one to edit in Content.
        </p>
        <ul className="space-y-1">
          {sorted.map((section) => (
            <li key={section.id}>
              <button
                type="button"
                className={cn(
                  "flex min-h-11 w-full items-center rounded-md px-3 text-left text-xs",
                  selected?.id === section.id
                    ? "bg-primary/20 text-primary"
                    : "text-white/75 hover:bg-white/5"
                )}
                onClick={() => setSelectedId(section.id)}
              >
                {section.label || section.type}
              </button>
            </li>
          ))}
        </ul>
        <div className="space-y-2 border-t border-white/10 pt-3" data-testid="card-drawer-add">
          <Label className="text-[10px] text-white/55">Add block</Label>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ["special_offer", "Offer"],
                ["promo_header", "Promo"],
                ["image", "Image"],
                ["logo_block", "Logo"],
                ["text", "Text"],
                ["spacer", "Spacer"],
              ] as const
            ).map(([type, label]) => (
              <Button
                key={type}
                type="button"
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                data-testid={`card-drawer-add-${type}`}
                onClick={() => onAddSection(type)}
              >
                {label}
              </Button>
            ))}
          </div>
          <Label className="text-[10px] text-white/55">Add action</Label>
          <select
            aria-label="Action kind to add"
            className="flex h-9 w-full rounded-lg border border-white/15 bg-black/40 px-2 text-sm"
            defaultValue="vcard"
            data-testid="card-drawer-add-action-kind"
          >
            {TAP_CARD_ACTION_CATALOG.map((c) => (
              <option key={c.kind} value={c.kind}>
                {c.label}
              </option>
            ))}
          </select>
          <Button
            type="button"
            size="sm"
            className="w-full"
            data-testid="card-drawer-add-action"
            onClick={(e) => {
              const select = (e.currentTarget.parentElement?.querySelector(
                "select[aria-label='Action kind to add']"
              ) ?? null) as HTMLSelectElement | null;
              onAddAction(select?.value || "vcard");
            }}
          >
            Add action
          </Button>
        </div>
      </div>
    );
  }

  if (resolved === "brand") {
    return (
      <div className="space-y-3" data-testid="card-drawer-brand">
        <BrandInheritanceBar state={brandState} onChange={onBrandStateChange} />
        <HonestNote>
          Brand values are copied into this Card session. Durable live-linked Brand sync is
          Phase 2 — Card formatting remains available locally.
        </HonestNote>
      </div>
    );
  }

  if (resolved === "colors") {
    return (
      <div className="space-y-3" data-testid="card-drawer-colors">
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
              patchConfig({ surfaceFill: e.target.value as TapCardSurfaceFill })
            }
          >
            <option value="solid">Solid</option>
            <option value="gradient">Gradient</option>
          </select>
        </div>
        {selected ? (
          <div className="space-y-2 border-t border-white/10 pt-3">
            <p className="text-xs font-semibold">Selected segment colors</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Fill</Label>
                <Input
                  type="color"
                  value={selected.backgroundColor || config.pillColor || "#0c0a07"}
                  onChange={(e) =>
                    patchSection(selected.id, { backgroundColor: e.target.value })
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
          </div>
        ) : null}
      </div>
    );
  }

  if (resolved === "typography") {
    return (
      <div className="space-y-4" data-testid="card-drawer-typography">
        <TextFormatControls
          title="Card title"
          value={config.titleFormat}
          onChange={(titleFormat) => patchConfig({ titleFormat })}
        />
        <TextFormatControls
          title="Card body"
          value={config.bodyFormat}
          onChange={(bodyFormat) => patchConfig({ bodyFormat })}
        />
        {selected ? (
          <TextFormatControls
            title="Selected block"
            value={selected.format ?? {}}
            onChange={(format) => patchSection(selected.id, { format })}
          />
        ) : (
          <HonestNote>Select a segment for block-level typography.</HonestNote>
        )}
      </div>
    );
  }

  if (resolved === "buttons") {
    return (
      <div className="space-y-3" data-testid="card-drawer-buttons">
        <div className="space-y-1">
          <Label className="text-[10px] font-semibold uppercase tracking-wide text-primary">
            Actions layout
          </Label>
          <div className="flex flex-wrap gap-1 rounded-lg border border-border/60 p-1">
            {TAP_CARD_LAYOUT_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={cn(
                  "inline-flex min-h-11 items-center gap-1.5 rounded-md px-3 text-xs font-medium",
                  config.actionsLayout === opt.id
                    ? "bg-primary/20 text-primary"
                    : "hover:bg-muted"
                )}
                onClick={() => patchConfig({ actionsLayout: opt.id })}
              >
                {opt.id === "grid_2" ? (
                  <Columns2 className="h-3.5 w-3.5" />
                ) : (
                  <Rows3 className="h-3.5 w-3.5" />
                )}
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px]">Default button shape</Label>
          <select
            aria-label="Button shape"
            className="flex h-9 w-full rounded-lg border border-input bg-background px-2 text-xs"
            value={config.defaultShape}
            onChange={(e) =>
              patchConfig({ defaultShape: e.target.value as TapCardButtonShape })
            }
          >
            {TAP_CARD_SHAPE_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <FinishPicker
          label="Tile / finish"
          value={config.defaultFinish}
          allowNone={false}
          onChange={(defaultFinish) => {
            if (defaultFinish) patchConfig({ defaultFinish });
          }}
        />
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={Boolean(config.view3d)}
            onChange={(e) => patchConfig({ view3d: e.target.checked })}
          />
          3-D raised buttons
        </label>
        {selected?.type === "action" ? (
          <div className="space-y-2 border-t border-white/10 pt-3">
            <p className="text-xs font-semibold">Selected action</p>
            <Input
              value={selected.label ?? ""}
              onChange={(e) => patchSection(selected.id, { label: e.target.value })}
              placeholder="Label"
              aria-label="Segment label"
            />
            <Input
              value={selected.href ?? ""}
              onChange={(e) => patchSection(selected.id, { href: e.target.value })}
              placeholder="https://…"
            />
          </div>
        ) : (
          <HonestNote>Select an action segment for per-button overrides.</HonestNote>
        )}
      </div>
    );
  }

  if (resolved === "media") {
    return (
      <div className="space-y-3" data-testid="card-drawer-media">
        {!mediaUploadReady ? (
          <HonestNote>
            Media upload provider is not configured. Card formatting is available; stock search
            and upload require credentials.
          </HonestNote>
        ) : null}
        {!stockReady ? (
          <HonestNote>Media search provider is not configured.</HonestNote>
        ) : null}
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={config.showHeaderLogo === true}
            onChange={(e) => patchConfig({ showHeaderLogo: e.target.checked })}
          />
          Logo above card
        </label>
        {config.showHeaderLogo === true ? (
          <MediaPicker
            label="Header logo"
            value={
              config.headerLogoUrl ||
              (brandState.useBrandKit ? strInherited("logoUrl") : undefined) ||
              logoUrl ||
              ""
            }
            onChange={(url) => {
              patchConfig({
                headerLogoUrl: url,
                ...(url ? {} : { showHeaderLogo: false }),
              });
            }}
            mediaUploadReady={mediaUploadReady}
            stockReady={stockReady}
          />
        ) : null}
        {selected?.type === "image" || selected?.type === "logo_block" ? (
          <HonestNote>Use Content drawer for the selected image/logo block.</HonestNote>
        ) : null}
      </div>
    );
  }

  if (resolved === "layout") {
    return (
      <div className="space-y-3" data-testid="card-drawer-layout">
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
            onChange={(e) => patchConfig({ surfaceOpacity: Number(e.target.value) })}
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
            onChange={(e) => patchConfig({ compactActionsOnly: e.target.checked })}
          />
          Buttons only
        </label>
      </div>
    );
  }

  if (resolved === "offer") {
    const offer = sorted.find((s) => s.type === "special_offer");
    return (
      <div className="space-y-3" data-testid="card-drawer-offer">
        <HonestNote>
          Offer Spotlight binds Campaign offers to the Card. Expand wiring on Card assembly;
          edit the offer segment here.
        </HonestNote>
        {offer ? (
          <button
            type="button"
            className="min-h-11 w-full rounded-md border border-primary/30 bg-primary/10 px-3 text-left text-xs text-primary"
            onClick={() => setSelectedId(offer.id)}
          >
            Edit offer segment · {offer.label || "Special offer"}
          </button>
        ) : (
          <p className="text-xs text-white/55">No offer segment on this Card yet.</p>
        )}
        <Link
          href="/dashboard/card"
          className="inline-flex min-h-11 items-center text-xs text-primary underline-offset-2 hover:underline"
        >
          Open Offer Fuse on assembly →
        </Link>
      </div>
    );
  }

  if (resolved === "tapsave") {
    return (
      <div className="space-y-3" data-testid="card-drawer-tapsave">
        <p className="text-xs font-semibold">Persistent utilities</p>
        <HonestNote>
          TapSave / Keep stays on public Tap Points even when a Campaign is active. Local Card
          editing is available.
        </HonestNote>
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={config.utilityLayer?.enabled !== false}
            onChange={(e) =>
              patchConfig({
                utilityLayer: {
                  ...(config.utilityLayer ?? {
                    presentation: "compact_row",
                    utilities: [],
                  }),
                  enabled: e.target.checked,
                },
              })
            }
          />
          Enable utility layer
        </label>
        <div className="space-y-1">
          {(
            [
              ["keep", "Keep this Card"],
              ["support", "Ask a Question"],
              ["vcard", "Save Contact"],
              ["map", "Directions"],
              ["book", "Book"],
              ["shop", "Pay"],
            ] as const
          ).map(([kind, label]) => {
            const toggles = config.utilityLayer?.utilities ?? [];
            const current = toggles.find((t) => t.kind === kind);
            const on = current ? current.enabled !== false : true;
            return (
              <label key={kind} className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={on}
                  data-testid={`utility-toggle-${kind}`}
                  onChange={(e) => {
                    const next = [
                      ...toggles.filter((t) => t.kind !== kind),
                      { kind, enabled: e.target.checked, label },
                    ];
                    patchConfig({
                      utilityLayer: {
                        enabled: config.utilityLayer?.enabled !== false,
                        presentation:
                          config.utilityLayer?.presentation ?? "compact_row",
                        utilities: next,
                      },
                    });
                  }}
                />
                {label}
              </label>
            );
          })}
        </div>
      </div>
    );
  }

  if (resolved === "history") {
    return (
      <div className="space-y-3" data-testid="card-drawer-history">
        <p className="text-xs font-semibold">Publication versions</p>
        {!brandKitId ? (
          <HonestNote>Version history requires a saved Brand Kit subject.</HonestNote>
        ) : versions.length === 0 ? (
          <HonestNote>No publication snapshots yet. Save Card to create history.</HonestNote>
        ) : (
          <ul className="space-y-2" data-testid="card-versions">
            {versions.slice(0, 8).map((v) => (
              <li
                key={v.id}
                className="flex items-center justify-between gap-2 rounded-md border border-white/10 px-2 py-2 text-xs"
              >
                <span>
                  v{v.version} · {v.label || "Snapshot"}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onRollback(v.id)}
                >
                  Restore
                </Button>
              </li>
            ))}
          </ul>
        )}
        <HonestNote>
          Segment Undo/Redo (⌘Z) is session-local and lives in the Command Shade.
        </HonestNote>
      </div>
    );
  }

  if (resolved === "lifecycle") {
    return (
      <div className="space-y-3" data-testid="card-drawer-lifecycle">
        <p className="text-xs font-semibold">
          Status:{" "}
          <span className="text-primary">
            {config.lifecycleStatus === "retired" ? "Retired" : "Active"}
          </span>
        </p>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-full"
          data-testid="card-retire-toggle"
          onClick={onRetireToggle}
        >
          {config.lifecycleStatus === "retired" ? "Restore card" : "Retire card"}
        </Button>
        <HonestNote>
          Retire marks the Card retired after Save. Where-used still lists Tap Point
          assignments — open assembly for the full where-used panel.
        </HonestNote>
        <Link
          href="/dashboard/card"
          className="inline-flex min-h-11 items-center text-xs text-primary underline-offset-2 hover:underline"
          data-testid="card-where-used-link"
        >
          Where used on assembly →
        </Link>
      </div>
    );
  }

  if (resolved === "advanced") {
    return (
      <div className="space-y-3" data-testid="card-drawer-advanced">
        <HonestNote>
          Advanced / compatibility controls. Prefer Content, Colors, Typography, and Buttons
          for everyday editing.
        </HonestNote>
        {freeformEnabled ? (
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-full"
            data-testid="card-freeform-toggle"
            onClick={() => setShowFreeform(!showFreeform)}
          >
            {showFreeform ? "Hide freeform" : "Freeform canvas"}
          </Button>
        ) : (
          <span data-testid="freeform-honest-disabled" className="text-xs text-white/40">
            Freeform off for this workspace
          </span>
        )}
        {isAdmin ? (
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-full"
            onClick={() => onPublishDemo(!demoPublished)}
          >
            {demoPublished ? "Unpublish landing demo" : "Publish landing demo"}
          </Button>
        ) : null}
        <KeywordsSuggestPanel surface="card" defaultChannel="instagram" compact />
        <HonestNote>
          Keyword suggestions require an AI provider. Card formatting does not.
        </HonestNote>
      </div>
    );
  }

  // content (default) — selected segment essentials + open hint
  return (
    <div className="space-y-3" data-testid="card-drawer-content">
      <p className="text-sm font-semibold">
        {selected ? `Edit: ${selected.label || selected.type}` : "Select a segment"}
      </p>
      {!selected ? (
        <HonestNote>
          Pick a segment from Outline or the live Card. Use Colors, Typography, Buttons, and
          Media tools for design — Content edits the selected block.
        </HonestNote>
      ) : (
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selected.enabled}
              onChange={(e) => patchSection(selected.id, { enabled: e.target.checked })}
            />
            Enabled
          </label>
          <Input
            value={selected.label ?? ""}
            onChange={(e) => patchSection(selected.id, { label: e.target.value })}
            placeholder="Label"
            aria-label="Segment label"
            data-testid="card-content-label"
          />
          {selected.type === "action" ? (
            <Input
              value={selected.href ?? ""}
              onChange={(e) => patchSection(selected.id, { href: e.target.value })}
              placeholder="https://…"
              data-testid="card-content-href"
            />
          ) : null}
          {selected.type === "text" ? (
            <Input
              value={selected.text ?? ""}
              onChange={(e) => patchSection(selected.id, { text: e.target.value })}
              placeholder="Text"
              data-testid="card-content-text"
            />
          ) : null}
          {selected.type === "special_offer" ? (
            <HonestNote>
              Offer fields — open Offer Spotlight for Campaign bind, or edit title/CTA on the
              segment after selecting it here.
            </HonestNote>
          ) : null}
          <p className="text-[11px] text-white/45">
            Full segment editors remain available for every block type via Outline selection.
            Compatibility inspector path: Advanced.
          </p>
        </div>
      )}
    </div>
  );
}
