"use client";

/**
 * Card Adaptive Task Drawer bodies — one tool topic at a time.
 * Hosted via portal into AdaptiveTaskDrawer from TapCardBuilder (shellHosted).
 */

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Columns2, Rows3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MediaPicker } from "@/components/media/media-picker";
import { FinishPicker } from "@/components/design/format-controls";
import { ButtonPanelStack } from "@/components/fusion/creative-studio/button-panel-stack";
import { TextPanelStack } from "@/components/fusion/creative-studio/text-panel-stack";
import { ImagePanelStack } from "@/components/fusion/creative-studio/image-panel-stack";
import { CompositionPanelStack } from "@/components/fusion/creative-studio/composition-panel-stack";
import { AppearancePanelStack } from "@/components/fusion/creative-studio/appearance-panel-stack";
import { SelectionPanelStack } from "@/components/fusion/creative-studio/selection-panel-stack";
import { HistoryPanel } from "@/components/fusion/creative-studio/history-panel";
import { CardOutlineRow } from "@/components/fusion/card/card-outline-row";
import { AskTapConnectDrawer } from "@/components/fusion/ask/ask-tapconnect-drawer";
import {
  createStarterCreativeComposition,
  parseCreativeComposition,
} from "@/lib/fusion/creative-studio/composition";
import type { BrandContactProfile } from "@/lib/brand/contact-profile";
import { KeywordsSuggestPanel } from "@/components/fusion/keywords/keywords-suggest-panel";
import { cn } from "@/lib/utils";
import {
  TAP_CARD_LAYOUT_OPTIONS,
  type TapCardSection,
  type TapConnectCardConfig,
} from "@/lib/brand/tap-card";
import type { BrandInheritanceState } from "@/lib/fusion/authoring/brand-inheritance";
import {
  CARD_BLOCK_CATEGORIES,
  CARD_BLOCK_LIBRARY,
} from "@/lib/fusion/card/block-model";

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
  versions: {
    id: string;
    version: number;
    label?: string;
    publishedAt: string;
    current?: boolean;
    status?: string;
    comparisonSummary?: { summary?: string };
  }[];
  logoUrl?: string | null;
  brandKitId?: string | null;
  message: string | null;
  profile: BrandContactProfile;
  reviewUrl?: string | null;
  businessName: string;
  campaigns?: Array<{ id: string; title: string; status: string; campaignType: string; features: string[]; devices: { code: string; label: string }[]; scheduledStart?: string | null; scheduledEnd?: string | null; group?: { id: string; title: string } | null }>;
  campaignGroups?: Array<{ id: string; title: string; status: string; defaultCampaignTitle?: string | null; slotCount: number }>;
  experiences?: Array<{ id: string; name: string; status: string }>;
  locations?: Array<{ id: string; name: string; address?: string | null; mapUrl?: string | null; isDefault?: boolean }>;
  pastLabels: string[];
  futureLabels: string[];
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onBrandStateChange: (next: BrandInheritanceState) => void;
  patchConfig: (
    patch: Partial<TapConnectCardConfig>,
    label?: string,
    batch?: boolean
  ) => void;
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
  onAddSection: (type: string) => void;
  onAddAction: (kind: string) => void;
  onStartPoint?: (kind: "blank" | "brand" | "template" | "clone") => void;
  setSelectedId: (id: string | null) => void;
  setShowFreeform: (v: boolean) => void;
  onRetireToggle: () => void;
  onPublishDemo: (publish: boolean) => void;
  onRollback: (snapshotId: string) => void;
  strInherited: (key: string) => string | undefined;
  onTestAction: (section: TapCardSection) => void;
  onCloseTool?: () => void;
  onRequestTool?: (toolId: string) => void;
  appearanceInitialLevel?: "root" | "colors" | "brand" | "layout" | "segment";
  selectedCompositionNodeIds?: string[];
  setSelectedCompositionNodeIds?: (ids: string[]) => void;
  reorderSections?: (fromId: string, toId: string) => void;
  moveSectionBy?: (id: string, delta: number) => void;
  moveSectionTo?: (id: string, edge: "top" | "bottom") => void;
  duplicateSection?: (id: string) => void;
  copySection?: (id: string) => void;
  deleteSection?: (id: string) => void;
  toggleSectionVisible?: (id: string) => void;
  toggleSectionLocked?: (id: string) => void;
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
    onStartPoint,
    setSelectedId,
    setShowFreeform,
    onBrandStateChange,
    onRetireToggle,
    onPublishDemo,
    onRollback,
    strInherited,
    selectedCompositionNodeIds = [],
    setSelectedCompositionNodeIds,
    reorderSections,
    moveSectionBy,
    moveSectionTo,
    duplicateSection,
    copySection,
    deleteSection,
    toggleSectionVisible,
    toggleSectionLocked,
  } = props;

  const [outlineDragId, setOutlineDragId] = useState<string | null>(null);

  const resolved =
    toolId === "format" || toolId === "colors" || toolId === "brand" || toolId === "layout"
      ? "appearance"
      : toolId === "inspector"
        ? "content"
        : toolId;

  const appearanceInitial =
    props.appearanceInitialLevel ||
    (toolId === "colors"
      ? ("colors" as const)
      : toolId === "brand"
        ? ("brand" as const)
        : toolId === "layout"
          ? ("layout" as const)
          : ("root" as const));

  if (resolved === "composition") {
    const block =
      selected?.type === "creative_composition"
        ? parseCreativeComposition(selected.composition) ||
          createStarterCreativeComposition(selected.id)
        : null;
    if (!block || !selected) {
      return (
        <div className="space-y-3" data-testid="card-drawer-composition">
          <HonestNote>
            Add a Creative Composition block, then select it on the Card to edit
            layered text, frames, and images.
          </HonestNote>
          <Button
            type="button"
            className="min-h-11 w-full"
            data-testid="composition-drawer-add"
            onClick={() => onAddSection("creative_composition")}
          >
            Add Creative Composition
          </Button>
        </div>
      );
    }
    return (
      <div className="min-h-0" data-testid="card-drawer-composition">
        <CompositionPanelStack
          block={block}
          selectedNodeIds={selectedCompositionNodeIds}
          onSelectNodes={(ids) => setSelectedCompositionNodeIds?.(ids)}
          onChangeBlock={(next, label) =>
            patchSection(selected.id, { composition: next }, label)
          }
          onClose={props.onCloseTool}
          mediaUploadReady={mediaUploadReady}
          stockReady={stockReady}
          brandColors={[
            config.accentColor,
            config.surfaceColor,
            config.textColor,
            config.neonColor,
          ].filter((color): color is string => Boolean(color))}
          defaultForegroundColor={config.textColor}
        />
      </div>
    );
  }

  if (resolved === "ask-tapconnect" || resolved === "ask") {
    return (
      <AskTapConnectDrawer
        workspace="Card"
        selectionLabel={selected ? selected.label || selected.type : null}
        aiLive={false}
        canUndo={props.canUndo}
        onUndo={props.onUndo}
        onReject={() => props.setSelectedId(null)}
        onApplyDraft={() => {
          /* Draft apply stays host-owned; Card uses Undo for reversibility. */
        }}
      />
    );
  }

  if (resolved === "outline") {
    const blocks = sorted.filter((s) => s.type !== "action");
    const actions = sorted.filter((s) => s.type === "action");
    const renderOutlineList = (items: TapCardSection[], listTestId: string) => (
      <ul className="space-y-1.5" data-testid={listTestId}>
        {items.map((section) => {
          const index = sorted.findIndex((s) => s.id === section.id);
          return (
            <CardOutlineRow
              key={section.id}
              section={section}
              index={index}
              total={sorted.length}
              selected={selected?.id === section.id}
              dragging={outlineDragId === section.id}
              onSelect={() => setSelectedId(section.id)}
              onDragStart={() => setOutlineDragId(section.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (outlineDragId && reorderSections) {
                  reorderSections(outlineDragId, section.id);
                }
                setOutlineDragId(null);
              }}
              onDragEnd={() => setOutlineDragId(null)}
              onToggleVisible={() => toggleSectionVisible?.(section.id)}
              onToggleLock={() => toggleSectionLocked?.(section.id)}
              onMoveUp={() => moveSectionBy?.(section.id, -1)}
              onMoveDown={() => moveSectionBy?.(section.id, 1)}
              onMoveTop={() => moveSectionTo?.(section.id, "top")}
              onMoveBottom={() => moveSectionTo?.(section.id, "bottom")}
              onDuplicate={() => duplicateSection?.(section.id)}
              onCopy={() => copySection?.(section.id)}
              onDelete={() => deleteSection?.(section.id)}
            />
          );
        })}
      </ul>
    );

    return (
      <div className="space-y-3" data-testid="card-drawer-outline">
        <p className="text-xs leading-relaxed text-white/55">
          Document structure for this Card. Drag to reorder. Hide, lock, duplicate,
          or delete from each row.
        </p>
        <div className="grid grid-cols-2 gap-1.5" data-testid="card-starting-points">
          {([
            ["blank", "Start blank"],
            ["brand", "Use Brand defaults"],
            ["template", "Choose a template"],
            ["clone", "Clone existing Card"],
          ] as const).map(([kind, label]) => (
            <Button key={kind} type="button" size="sm" variant="outline" className="h-auto min-h-10 whitespace-normal text-xs" onClick={() => onStartPoint?.(kind)} data-testid={`card-start-${kind}`}>
              {label}
            </Button>
          ))}
        </div>
        <div className="space-y-2">
          <Label className="text-[11px] text-white/60">Blocks</Label>
          {blocks.length > 0 ? (
            renderOutlineList(blocks, "card-outline-blocks")
          ) : (
            <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3" data-testid="card-empty-builder-state">
              <p className="text-sm font-medium text-white">Your Card is ready to build.</p>
              <p className="mt-1 text-[11px] text-white/50">Choose Start blank, Brand defaults, a template, or clone — then add only what you need.</p>
            </div>
          )}
        </div>
        <div className="space-y-2">
          <Label className="text-[11px] text-white/60">Action buttons</Label>
          {actions.length > 0 ? (
            renderOutlineList(actions, "card-outline-actions")
          ) : (
            <p className="text-xs text-white/40">No action buttons yet.</p>
          )}
        </div>
        <div className="space-y-3 border-t border-white/10 pt-3" data-testid="card-drawer-add">
          <div>
            <Label className="text-xs font-semibold text-white">Add block</Label>
            <p className="mt-1 text-[11px] text-white/45">All choices create a usable block directly on this Card.</p>
          </div>
          {CARD_BLOCK_CATEGORIES.map((category) => (
            <div key={category} className="space-y-1.5" data-testid={`card-block-category-${category.toLowerCase()}`}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">{category}</p>
              <div className="grid grid-cols-2 gap-1.5">
                {CARD_BLOCK_LIBRARY.filter((item) => item.category === category).map((item) => (
                  <Button
                    key={item.kind}
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-auto min-h-10 justify-start whitespace-normal px-2 py-2 text-left text-xs"
                    title={item.description}
                    data-testid={`card-drawer-add-${item.kind.replace(":", "-")}`}
                    onClick={() => {
                      if (item.kind.startsWith("action:")) onAddAction(item.kind.slice(7));
                      else onAddSection(item.kind);
                    }}
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (resolved === "appearance") {
    return (
      <div className="min-h-0" data-testid="card-drawer-appearance">
        <AppearancePanelStack
          key={`appearance-${appearanceInitial}`}
          config={config}
          selected={selected}
          brandState={brandState}
          onBrandStateChange={onBrandStateChange}
          patchConfig={patchConfig}
          patchConfigColor={patchConfigColor}
          patchSection={patchSection}
          strInherited={strInherited}
          onClose={props.onCloseTool}
          initialLevel={appearanceInitial}
        />
      </div>
    );
  }

  if (resolved === "typography") {
    return (
      <div className="min-h-0" data-testid="card-drawer-typography">
        <TextPanelStack
          selected={selected}
          config={config}
          onPatchSection={patchSection}
          onPatchConfig={patchConfig}
          onClose={props.onCloseTool}
          brandColors={[
            (brandState.useBrandKit
              ? strInherited("accentColor") || config.accentColor
              : config.accentColor) || "#22c55e",
            config.surfaceColor || "#0b0f19",
            config.textColor || "#f8fafc",
            "#22c55e",
            "#0ea5e9",
            "#f59e0b",
          ]}
        />
      </div>
    );
  }

  if (resolved === "buttons") {
    if (selected?.type === "action") {
      return (
        <ButtonPanelStack
          selected={selected}
          config={config}
          profile={props.profile}
          reviewUrl={props.reviewUrl}
          onPatch={(patch, label) => patchSection(selected.id, patch, label)}
          onPatchConfig={patchConfig}
          onClose={props.onCloseTool}
          onTestAction={() => props.onTestAction(selected)}
        />
      );
    }
    return (
      <div className="space-y-3" data-testid="card-drawer-buttons">
        <HonestNote>
          Select a button on the Card to open the nested Button panel. Layout defaults
          below apply to all actions.
        </HonestNote>
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
                    ? "border border-white/30 bg-white/10 text-white"
                    : "hover:bg-muted"
                )}
                onClick={() =>
                  patchConfig({ actionsLayout: opt.id }, "Changed actions layout")
                }
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
        <FinishPicker
          label="Default finish"
          value={config.defaultFinish}
          allowNone={false}
          onChange={(defaultFinish) => {
            if (defaultFinish) patchConfig({ defaultFinish }, "Changed button finish");
          }}
        />
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
        <ImagePanelStack
          selected={selected}
          onPatchSection={patchSection}
          onClose={props.onCloseTool}
          headerLogoUrl={
            config.headerLogoUrl ||
            (brandState.useBrandKit ? strInherited("logoUrl") : undefined) ||
            logoUrl ||
            ""
          }
          showHeaderLogo={config.showHeaderLogo === true}
          onToggleHeaderLogo={(on) => patchConfig({ showHeaderLogo: on })}
          mediaUploadReady={mediaUploadReady}
          stockReady={stockReady}
          onPatchHeaderLogo={(url) =>
            patchConfig({
              headerLogoUrl: url,
              ...(url ? {} : { showHeaderLogo: false }),
            })
          }
        />
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
        <HistoryPanel
          pastLabels={props.pastLabels || []}
          futureLabels={props.futureLabels || []}
          canUndo={props.canUndo}
          canRedo={props.canRedo}
          onUndo={props.onUndo}
          onRedo={props.onRedo}
          onClose={props.onCloseTool}
        />
        <p className="text-xs font-semibold">Publication versions</p>
        {!brandKitId ? (
          <HonestNote>Version history requires a saved Brand Kit subject.</HonestNote>
        ) : versions.length === 0 ? (
          <HonestNote>No published revisions yet. Publish a saved draft to create history.</HonestNote>
        ) : (
          <ul className="space-y-2" data-testid="card-versions">
            {versions.slice(0, 8).map((v) => (
              <li
                key={v.id}
                className="flex items-center justify-between gap-2 rounded-md border border-white/10 px-2 py-2 text-xs"
              >
                <span>
                  Revision {v.version}{v.current ? " · Published" : ""} · {v.comparisonSummary?.summary || v.label || "Card revision"}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onRollback(v.id)}
                  disabled={v.current || v.status === "ARCHIVED"}
                >
                  Roll back
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

  // content (default) — Selection Hub with horizontal drill-ins
  return (
    <div className="min-h-0" data-testid="card-drawer-content">
      <SelectionPanelStack
        selected={selected}
        patchSection={patchSection}
        campaigns={props.campaigns ?? []}
        campaignGroups={props.campaignGroups ?? []}
        experiences={props.experiences ?? []}
        locations={props.locations ?? []}
        onOpenTool={(id) => props.onRequestTool?.(id)}
        onClose={props.onCloseTool}
      />
    </div>
  );
}
