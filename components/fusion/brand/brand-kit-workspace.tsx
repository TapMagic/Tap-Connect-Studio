"use client";

/**
 * Focused Brand Kit workspace — Shared Visual Authoring Core V0 host.
 * Topics rail · contextual drawer · large preview · mobile bottom sheet.
 * IMPLEMENTED BUT NOT OWNER-READY.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Redo2,
  Undo2,
} from "lucide-react";
import {
  AdaptiveWorkspaceShell,
  openAdaptiveTool,
} from "@/components/fusion/authoring/adaptive-workspace-shell";
import { SharedCardPreview } from "@/components/fusion/brand/shared-card-preview";
import { LogoLibrary, type LogoLibraryItem } from "@/components/fusion/brand/logo-library";
import { MediaPicker } from "@/components/media/media-picker";
import { cn } from "@/lib/utils";
import {
  BRAND_COLOR_ROLE_LABELS,
  brandColorsFromKit,
  COLOR_ROLE_TO_BRAND_FIELD,
  resolveFontFamily,
  writeColorRole,
  type BrandKitVisualFields,
} from "@/lib/fusion/authoring/brand-kit-adapter";
import {
  approveStarterItem,
  createBrandStarterKitFixture,
  ignoreStarterItem,
  keepStarterItem,
  replaceStarterItem,
  STARTER_PROVENANCE_LABELS,
  type BrandStarterKit,
} from "@/lib/fusion/authoring/brand-starter-kit";
import {
  applyBackgroundToSimilarOnCard,
  buildCardVisualModel,
  overrideCardItemProperty,
  promoteButtonBackgroundToBrand,
  resetCardItem,
  resetCardItemProperty,
  resolvedBackgroundSource,
  syncCardVisualFromBrand,
  type CardVisualModel,
} from "@/lib/fusion/authoring/card-visual-resolve";
import { checkBrandContrast, readableOn } from "@/lib/fusion/authoring/contrast";
import {
  createLabeledHistory,
  pushLabeledHistory,
  redoLabeledHistory,
  undoLabeledHistory,
  type LabeledEditorHistory,
} from "@/lib/fusion/authoring/session-history";
import {
  intakeFromAssetUrl,
  intakeFromPastedHex,
  intakeFromPastedText,
  intakeFromWebsiteUrl,
} from "@/lib/fusion/authoring/intake";
import {
  BRAND_TOPIC_LABELS,
  loadBrandWorkspaceState,
  saveBrandWorkspaceState,
  type BrandPreviewSurface,
  type BrandWorkspaceTopic,
} from "@/lib/fusion/authoring/workspace-state";
import {
  createShellSnapshot,
  rememberToolDrawer,
  type ToolDrawerMemory,
  type WorkspaceShellSnapshot,
} from "@/lib/fusion/authoring/workspace-shell";
import {
  SESSION_RESTORE_LABEL,
} from "@/lib/fusion/authoring/workspace-shell-persist";
import {
  ensureDefaultToolRegistries,
  getWorkspaceTool,
} from "@/lib/fusion/authoring/workspace-tools";
import type { BrandColorRole } from "@/lib/fusion/authoring/visual-property";
import { PREMIUM_FONT_OPTIONS, type PremiumFontFamily } from "@/lib/design/premium-finish";
import type { TapConnectCardConfig } from "@/lib/brand/tap-card";

ensureDefaultToolRegistries();

export type BrandKitWorkspaceProps = {
  businessName: string;
  initialBrand: BrandKitVisualFields & {
    logoUrl?: string | null;
    website?: string | null;
  };
  cardConfig: TapConnectCardConfig | null;
  mediaUploadReady?: boolean;
  stockReady?: boolean;
  logoOptions?: string[];
};

type WorkspaceDraft = {
  brand: BrandKitVisualFields & { logoUrl?: string | null; website?: string | null };
  cardVisual: CardVisualModel;
  starter: BrandStarterKit;
  logos: LogoLibraryItem[];
  images: Array<{
    id: string;
    url: string;
    role: string;
    fit: "contain" | "cover";
    alt: string;
  }>;
  fontRoles: { display: PremiumFontFamily; body: PremiumFontFamily; accent: PremiumFontFamily };
};

const TOPICS = Object.keys(BRAND_TOPIC_LABELS) as BrandWorkspaceTopic[];

const FONT_STYLE_FROM_PREMIUM: Record<PremiumFontFamily, string> = {
  sans: "MODERN",
  serif: "CLASSIC",
  rounded: "PLAYFUL",
  display: "PREMIUM",
  mono: "MINIMAL",
  script: "CLASSIC",
};

export function BrandKitWorkspace({
  businessName,
  initialBrand,
  cardConfig,
  mediaUploadReady = false,
  stockReady = false,
  logoOptions = [],
}: BrandKitWorkspaceProps) {
  const router = useRouter();
  const restoredRef = useMemo(() => loadBrandWorkspaceState(), []);
  const [toolMemory, setToolMemory] = useState<Record<string, ToolDrawerMemory>>(
    () => restoredRef.toolMemory ?? {}
  );
  const [shell, setShell] = useState<WorkspaceShellSnapshot>(() =>
    createShellSnapshot("brand-kit", {
      workspaceMode: restoredRef.focusMode ? "focus" : "browse",
      shadePreference: restoredRef.shadePreference ?? "auto",
      priorShadeDisplay: "open",
      drawerOpen: restoredRef.drawerOpen,
      selectedToolId: restoredRef.topic,
      drawerSizeMode:
        restoredRef.drawerSizeMode ??
        getWorkspaceTool("brand-kit", restoredRef.topic ?? "overview")
          ?.recommendedDrawerMode ??
        "balanced",
      customDrawerWidthPct: restoredRef.customDrawerWidthPct ?? null,
      selectedObjectId: restoredRef.selectedAssetId,
      previewSurface: restoredRef.previewSurface,
      previewZoom: restoredRef.zoom,
      focusMode: restoredRef.focusMode,
      dirty: false,
      saved: true,
      blockingWarning: null,
      modalOpen: false,
    })
  );
  const topic = (shell.selectedToolId as BrandWorkspaceTopic | null) ?? null;
  const drawerOpen = shell.drawerOpen;
  const selectedAssetId = shell.selectedObjectId;
  const zoom = typeof shell.previewZoom === "number" ? shell.previewZoom : 1;
  const previewSurface = (shell.previewSurface as BrandPreviewSurface) || "brand";
  const focusMode = shell.focusMode;
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [intakeMsg, setIntakeMsg] = useState<string | null>(null);
  const [websiteInput, setWebsiteInput] = useState(initialBrand.website || "");
  const [hexInput, setHexInput] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [textInput, setTextInput] = useState("");
  const [sessionRestoreNotice] = useState(
    () => Boolean(restoredRef.sessionDraftRestored)
  );

  const setSelectedAssetId = useCallback((id: string | null) => {
    setShell((s) => {
      const next = { ...s, selectedObjectId: id };
      if (s.selectedToolId) {
        setToolMemory((m) =>
          rememberToolDrawer(m, s.selectedToolId!, { selectedItemId: id })
        );
      }
      return next;
    });
  }, []);
  const setZoom = useCallback((z: number | ((prev: number) => number)) => {
    setShell((s) => {
      const cur = typeof s.previewZoom === "number" ? s.previewZoom : 1;
      const next = typeof z === "function" ? z(cur) : z;
      return { ...s, previewZoom: next };
    });
  }, []);
  const setPreviewSurface = useCallback((surface: BrandPreviewSurface) => {
    setShell((s) => ({ ...s, previewSurface: surface }));
  }, []);

  const initialDraft = useMemo(() => createInitialDraft(initialBrand, cardConfig, logoOptions, businessName), [
    initialBrand,
    cardConfig,
    logoOptions,
    businessName,
  ]);

  const [history, setHistory] = useState<LabeledEditorHistory<WorkspaceDraft>>(() =>
    createLabeledHistory(initialDraft)
  );
  const draft = history.present;

  useEffect(() => {
    saveBrandWorkspaceState({
      topic,
      drawerOpen,
      selectedAssetId,
      zoom,
      previewSurface,
      focusMode,
      shadePreference: shell.shadePreference,
      drawerSizeMode: shell.drawerSizeMode,
      customDrawerWidthPct: shell.customDrawerWidthPct,
      toolMemory,
      sessionDraftRestored: sessionRestoreNotice,
    });
  }, [
    topic,
    drawerOpen,
    selectedAssetId,
    zoom,
    previewSurface,
    focusMode,
    shell.shadePreference,
    shell.drawerSizeMode,
    shell.customDrawerWidthPct,
    toolMemory,
    sessionRestoreNotice,
  ]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const shellForUi = useMemo(
    () => ({ ...shell, dirty, saved: !dirty }),
    [shell, dirty]
  );

  const onShellChange = useCallback(
    (next: WorkspaceShellSnapshot) => {
      if (!next.modalOpen && promoteOpen) setPromoteOpen(false);
      setShell(next);
    },
    [promoteOpen]
  );

  const openPromote = useCallback(() => {
    setPromoteOpen(true);
    setShell((s) => ({ ...s, modalOpen: true }));
  }, []);

  const closePromote = useCallback(() => {
    setPromoteOpen(false);
    setShell((s) => ({ ...s, modalOpen: false }));
  }, []);

  const commit = useCallback((next: WorkspaceDraft, label: string) => {
    setHistory((h) => pushLabeledHistory(h, next, label));
    setDirty(true);
    setSaveMsg(null);
  }, []);

  const undo = useCallback(() => {
    setHistory((h) => {
      const next = undoLabeledHistory(h);
      if (!next) return h;
      const brandSnapshot = next.present.brand;
      queueMicrotask(() => {
        setDirty(true);
        void persistBrandScalars(brandSnapshot);
      });
      return next;
    });
    // persistBrandScalars is a stable function declaration in this component
    // eslint-disable-next-line react-hooks/exhaustive-deps -- session undo re-saves Brand scalars
  }, []);

  const redo = useCallback(() => {
    setHistory((h) => {
      const next = redoLabeledHistory(h);
      if (!next) return h;
      const brandSnapshot = next.present.brand;
      queueMicrotask(() => {
        setDirty(true);
        void persistBrandScalars(brandSnapshot);
      });
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- session redo re-saves Brand scalars
  }, []);

  async function persistBrandScalars(
    brand: BrandKitVisualFields & { logoUrl?: string | null }
  ) {
    await saveBrand({
      primaryColor: brand.primaryColor ?? undefined,
      secondaryColor: brand.secondaryColor ?? undefined,
      accentColor: brand.accentColor ?? undefined,
      backgroundColor: brand.backgroundColor ?? undefined,
      textColor: brand.textColor ?? undefined,
      fontStyle: brand.fontStyle ?? undefined,
      buttonStyle: brand.buttonStyle ?? undefined,
      logoUrl: brand.logoUrl ?? null,
    });
  }

  const openTopic = useCallback(
    (t: BrandWorkspaceTopic) => {
      if (topic === t && drawerOpen) {
        setShell((s) => ({ ...s, drawerOpen: false }));
        return;
      }
      setShell((s) => {
        const { snapshot, memory } = openAdaptiveTool(s, "brand-kit", t, toolMemory);
        setToolMemory(memory);
        return snapshot;
      });
    },
    [topic, drawerOpen, toolMemory]
  );

  // Promote modal Esc is handled via shell.modalOpen + AdaptiveWorkspaceShell priority.
  const colors = brandColorsFromKit(draft.brand);
  const contrast = checkBrandContrast({
    background: colors.background,
    surface: colors.surface,
    headline: colors.headline,
    body: colors.body,
    ctaBg: colors.cta,
    ctaText: readableOn(colors.cta),
    link: colors.link,
  });

  async function saveBrand(patch: Partial<BrandKitVisualFields & { logoUrl?: string | null }>) {
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch("/api/brand", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error("Save failed");
      setDirty(false);
      setSaveMsg("Brand Kit saved.");
    } catch {
      setSaveMsg("Could not save Brand Kit. Try again.");
    } finally {
      setSaving(false);
    }
  }

  function setColorRole(role: BrandColorRole, value: string) {
    const nextBrand = writeColorRole(draft.brand, role, value);
    const field = COLOR_ROLE_TO_BRAND_FIELD[role];
    const cardVisual = syncCardVisualFromBrand(draft.cardVisual, nextBrand);
    commit(
      { ...draft, brand: { ...draft.brand, ...nextBrand }, cardVisual },
      `Brand color · ${BRAND_COLOR_ROLE_LABELS[role]}`
    );
    void saveBrand({ [field]: value });
  }

  function approveStarter(itemId: string) {
    const starter = approveStarterItem(draft.starter, itemId);
    const item = starter.items.find((i) => i.id === itemId);
    if (!item) return;
    let next = { ...draft, starter };
    if (item.kind === "color_primary") {
      const brand = { ...next.brand, primaryColor: item.value };
      next = {
        ...next,
        brand,
        cardVisual: syncCardVisualFromBrand(next.cardVisual, brand),
      };
      void saveBrand({ primaryColor: item.value });
    } else if (item.kind === "color_secondary") {
      const brand = { ...next.brand, secondaryColor: item.value };
      next = {
        ...next,
        brand,
        cardVisual: syncCardVisualFromBrand(next.cardVisual, brand),
      };
      void saveBrand({ secondaryColor: item.value });
    } else if (item.kind === "logo_primary") {
      next = {
        ...next,
        brand: { ...next.brand, logoUrl: item.value },
        logos: upsertLogo(next.logos, {
          id: "logo-primary",
          url: item.value,
          role: "primary",
          approval: "approved",
          source: STARTER_PROVENANCE_LABELS[item.provenance],
          format: "svg",
        }),
      };
      void saveBrand({ logoUrl: item.value });
    } else if (item.kind === "font_body") {
      const body = (item.value as PremiumFontFamily) || "sans";
      next = {
        ...next,
        fontRoles: { ...next.fontRoles, body },
        brand: { ...next.brand, fontStyle: FONT_STYLE_FROM_PREMIUM[body] || "MODERN" },
      };
      void saveBrand({ fontStyle: FONT_STYLE_FROM_PREMIUM[body] || "MODERN" });
    } else if (item.kind === "image_hero") {
      next = {
        ...next,
        images: [
          {
            id: "hero-1",
            url: item.value,
            role: "hero",
            fit: "cover",
            alt: "Hero image",
          },
          ...next.images.filter((im) => im.id !== "hero-1"),
        ],
      };
    }
    commit(next, `Approved Starter Kit · ${item.label}`);
  }

  function onOverrideBackground(value: string) {
    const id = draft.cardVisual.selectedItemId || draft.cardVisual.items[0]?.id;
    if (!id) return;
    commit(
      {
        ...draft,
        cardVisual: overrideCardItemProperty(draft.cardVisual, id, "background", value),
      },
      "Card button background · Custom"
    );
  }

  function onResetBackground() {
    const id = draft.cardVisual.selectedItemId || draft.cardVisual.items[0]?.id;
    if (!id) return;
    commit(
      {
        ...draft,
        cardVisual: resetCardItemProperty(draft.cardVisual, id, "background"),
      },
      "Reset button background to Brand"
    );
  }

  function onResetItem() {
    const id = draft.cardVisual.selectedItemId || draft.cardVisual.items[0]?.id;
    if (!id) return;
    commit(
      { ...draft, cardVisual: resetCardItem(draft.cardVisual, id) },
      "Reset item to Brand"
    );
  }

  function onApplySimilar() {
    const id = draft.cardVisual.selectedItemId || draft.cardVisual.items[0]?.id;
    if (!id) return;
    const bg = resolvedBackgroundSource(draft.cardVisual, id);
    if (!bg?.value) return;
    commit(
      {
        ...draft,
        cardVisual: applyBackgroundToSimilarOnCard(draft.cardVisual, id, bg.value),
      },
      "Apply background to similar Card buttons"
    );
  }

  function confirmPromote() {
    const id = draft.cardVisual.selectedItemId || draft.cardVisual.items[0]?.id;
    if (!id) return;
    const { result, nextBrand, nextModel } = promoteButtonBackgroundToBrand(
      draft.cardVisual,
      id
    );
    if (!result.ok || !nextBrand || !nextModel) {
      setSaveMsg(result.ok ? null : result.reason);
      closePromote();
      return;
    }
    commit(
      { ...draft, brand: { ...draft.brand, ...nextBrand }, cardVisual: nextModel },
      "Promote button background → Brand CTA"
    );
    void saveBrand({ primaryColor: result.value });
    closePromote();
    setSaveMsg(result.impact);
  }

  const selectedBg = resolvedBackgroundSource(draft.cardVisual);

  const outline = (
    <nav aria-label="Brand Kit topics" data-testid="brand-topic-rail" className="space-y-1">
      {TOPICS.map((t) => {
        const active = topic === t && drawerOpen;
        return (
          <button
            key={t}
            type="button"
            data-testid={`brand-topic-${t}`}
            data-active={active ? "true" : "false"}
            onClick={() => openTopic(t)}
            className={cn(
              "flex min-h-11 w-full items-center rounded-md px-3 text-left text-sm",
              active
                ? "bg-primary/15 text-primary"
                : "text-white/75 hover:bg-white/5 hover:text-white"
            )}
          >
            {BRAND_TOPIC_LABELS[t]}
          </button>
        );
      })}
    </nav>
  );

  const drawerBody = topic ? renderDrawer() : null;

  const recommendedDrawerMode =
    getWorkspaceTool("brand-kit", topic ?? "overview")?.recommendedDrawerMode ??
    "balanced";

  const canvas = (
    <div
      className="brand-zone-glow relative flex h-full min-h-0 flex-col"
      data-testid="brand-preview-canvas"
      data-preview-surface={previewSurface}
    >
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-white/10 px-3 py-2">
        {(
          [
            ["brand", "Brand"],
            ["card", "Card"],
            ["typography", "Type"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            data-testid={`brand-preview-surface-${id}`}
            onClick={() => setPreviewSurface(id)}
            className={cn(
              "min-h-11 rounded-md px-3 text-xs font-medium",
              previewSurface === id
                ? "bg-white/10 text-white"
                : "text-white/55 hover:bg-white/5"
            )}
          >
            {label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            className="min-h-11 min-w-11 rounded-md border border-white/15 text-xs"
            data-testid="brand-zoom-out"
            onClick={() => setZoom((z) => Math.max(0.7, Number((z - 0.1).toFixed(2))))}
          >
            −
          </button>
          <span className="min-w-[3rem] text-center text-xs text-white/55" data-testid="brand-zoom-label">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            className="min-h-11 min-w-11 rounded-md border border-white/15 text-xs"
            data-testid="brand-zoom-in"
            onClick={() => setZoom((z) => Math.min(1.4, Number((z + 0.1).toFixed(2))))}
          >
            +
          </button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 items-start justify-center overflow-auto p-6">
        <div
          style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}
          data-testid="brand-preview-scaled"
        >
          {previewSurface === "card" ? (
            <SharedCardPreview
              model={draft.cardVisual}
              businessName={businessName}
              logoUrl={draft.brand.logoUrl}
              onSelectItem={(id) =>
                commit(
                  { ...draft, cardVisual: { ...draft.cardVisual, selectedItemId: id } },
                  "Select Card action"
                )
              }
            />
          ) : previewSurface === "typography" ? (
            <TypographyPreview brand={draft.brand} fontRoles={draft.fontRoles} colors={colors} />
          ) : (
            <BrandMarkPreview
              businessName={businessName}
              logoUrl={draft.brand.logoUrl}
              colors={colors}
              fontRoles={draft.fontRoles}
            />
          )}
        </div>
      </div>
    </div>
  );

  const shadeExtras = (
    <div className="flex flex-wrap items-center gap-2" data-testid="brand-workspace-toolbar">
      <button
        type="button"
        data-testid="brand-undo"
        disabled={!history.past.length}
        onClick={undo}
        className="inline-flex min-h-11 items-center gap-1 rounded-md border border-white/15 px-2.5 text-xs disabled:opacity-40"
      >
        <Undo2 className="h-3.5 w-3.5" aria-hidden /> Undo
      </button>
      <button
        type="button"
        data-testid="brand-redo"
        disabled={!history.future.length}
        onClick={redo}
        className="inline-flex min-h-11 items-center gap-1 rounded-md border border-white/15 px-2.5 text-xs disabled:opacity-40"
      >
        <Redo2 className="h-3.5 w-3.5" aria-hidden /> Redo
      </button>
      {dirty ? (
        <span
          className="text-[10px] uppercase tracking-wider text-amber-200/80"
          data-testid="brand-dirty-indicator"
          data-dirty="true"
        >
          Unsaved session
        </span>
      ) : null}
    </div>
  );

  const mobileToolRail = (
    <div
      className="relative z-50 flex shrink-0 gap-1 overflow-x-auto border-t border-white/10 bg-[#050814] p-2 lg:hidden"
      data-testid="brand-mobile-toolbar"
      role="toolbar"
      aria-label="Brand topics"
    >
      {TOPICS.map((t) => (
        <button
          key={t}
          type="button"
          data-testid={`brand-mobile-topic-${t}`}
          onClick={() => openTopic(t)}
          className={cn(
            "min-h-11 shrink-0 rounded-md px-3 text-xs",
            topic === t && drawerOpen
              ? "bg-primary/20 text-primary"
              : "border border-white/10 text-white/70"
          )}
        >
          {BRAND_TOPIC_LABELS[t]}
        </button>
      ))}
    </div>
  );

  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-hidden bg-[#050814]"
      data-testid="brand-kit-workspace"
      data-dirty={dirty ? "true" : "false"}
      data-maturity="implemented-not-owner-ready"
      data-adaptive-shell="v1"
    >
      {sessionRestoreNotice ? (
        <p className="sr-only" role="status" data-testid="brand-session-restore-notice">
          {SESSION_RESTORE_LABEL}
        </p>
      ) : null}

      <div className="min-h-0 flex-1">
        <AdaptiveWorkspaceShell
          identity={{
            id: "brand-kit",
            label: "Brand Kit",
            objectLabel: businessName,
            zone: "brand",
          }}
          outline={outline}
          canvas={canvas}
          drawerContent={drawerOpen && topic ? drawerBody : undefined}
          drawerTitle={topic ? BRAND_TOPIC_LABELS[topic] : undefined}
          toolMemory={toolMemory}
          onToolMemoryChange={setToolMemory}
          snapshot={shellForUi}
          onSnapshotChange={onShellChange}
          recommendedDrawerMode={recommendedDrawerMode}
          shadeExtras={shadeExtras}
          mobileToolRail={mobileToolRail}
          desktopDrawerCloseTestId="brand-drawer-collapse"
          mobileDrawerCloseTestId="brand-mobile-sheet-close"
          mobileSheetTestId="brand-mobile-sheet"
          drawerRootTestId="brand-contextual-drawer"
          returnAction={
            <Link
              href="/dashboard/brand"
              className="inline-flex min-h-11 items-center rounded-md border border-white/15 px-2.5 text-xs text-white/75"
              data-testid="brand-return-studio"
            >
              Return to Studio
            </Link>
          }
          openInNewTab={
            <a
              href="/dashboard/brand/edit"
              target="_blank"
              rel="noopener noreferrer"
              data-testid="brand-open-detached"
              className="inline-flex min-h-11 items-center rounded-md border border-primary/35 bg-primary/10 px-2.5 text-xs font-medium text-primary"
            >
              Open in new tab ↗
            </a>
          }
          primaryAction={
            <button
              type="button"
              data-testid="brand-done-editing"
              className="inline-flex min-h-11 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground"
              onClick={() => {
                if (dirty && !window.confirm("Leave with unsaved session changes?")) return;
                router.push("/dashboard/brand");
              }}
            >
              Done
            </button>
          }
          className="brand-kit-shell h-full"
        />
      </div>

      {/* Legacy compact toolbar testid — shade owns controls; keep host marker for proofs */}
      <div className="sr-only" data-testid="brand-edit-compact-toolbar" aria-hidden>
        Command Shade owns Brand Kit chrome
      </div>

      {promoteOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
          data-testid="brand-promote-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="promote-title"
        >
          <div className="w-full max-w-md rounded-xl border border-white/15 bg-[#0a0f1c] p-4 shadow-xl">
            <h2 id="promote-title" className="text-sm font-semibold text-white">
              Promote to Brand CTA?
            </h2>
            <p className="mt-2 text-xs text-white/60" data-testid="brand-promote-impact">
              Role: <strong className="text-white">{BRAND_COLOR_ROLE_LABELS.cta}</strong> (maps to
              primary Brand color). Saves to Brand Kit now. Brand Kit previews and{" "}
              <strong className="text-white">new</strong> inheriting defaults will use it. Existing
              saved and public Cards keep their stored button colors until you edit or re-save those
              Cards — this is not live linked sync. Intentional Custom overrides in this session stay
              as they are. Session Undo can re-save the prior Brand Kit color; durable Brand revision
              history is deferred.
            </p>
            <div
              className="mt-3 h-10 rounded-md border border-white/10"
              style={{ backgroundColor: selectedBg?.value || colors.cta }}
            />
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                data-testid="brand-promote-confirm"
                className="min-h-11 rounded-md bg-primary px-4 text-xs font-medium text-primary-foreground"
                onClick={confirmPromote}
              >
                Apply to Brand
              </button>
              <button
                type="button"
                data-testid="brand-promote-cancel"
                className="min-h-11 rounded-md border border-white/15 px-4 text-xs"
                onClick={closePromote}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {saveMsg ? (
        <p className="sr-only" role="status" data-testid="brand-save-status">
          {saveMsg}
        </p>
      ) : null}
      {saving ? <p className="sr-only" role="status">Saving</p> : null}
    </div>
  );

  function renderDrawer(): ReactNode {
    switch (topic) {
      case "overview":
        return (
          <div className="space-y-3 text-sm text-white/70" data-testid="brand-drawer-overview">
            <p>
              Brand Kit is the visual and verbal source of truth for new work. Saved Cards keep
              stored colors until re-saved — not live linked sync. Property-level overrides stay
              local.
            </p>
            <p className="text-xs text-white/60">
              Maturity: implemented but not Owner-ready — local Discover fixtures only; no live
              crawl, durable sync, or full application matrix.
            </p>
            <button
              type="button"
              className="min-h-11 w-full rounded-md bg-primary text-xs font-medium text-primary-foreground"
              onClick={() => openTopic("discover")}
            >
              Review Brand Starter Kit
            </button>
          </div>
        );
      case "discover":
        return (
          <div className="space-y-4" data-testid="brand-drawer-discover">
            <div>
              <h3 className="text-base font-semibold text-white">{draft.starter.headline}</h3>
              <p className="mt-1 text-xs text-white/60">
                Prepared locally for {draft.starter.websiteHint}. Nothing becomes Brand truth until
                you approve it.
              </p>
            </div>
            <ul className="space-y-3">
              {draft.starter.items.map((item) => (
                <li
                  key={item.id}
                  className="rounded-lg border border-white/10 bg-white/[0.02] p-3"
                  data-testid={`starter-item-${item.id}`}
                  data-state={item.state}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-white">{item.label}</p>
                      <p className="text-[11px] text-white/60">
                        {STARTER_PROVENANCE_LABELS[item.provenance]}
                        {item.note ? ` · ${item.note}` : ""}
                      </p>
                    </div>
                    {item.kind.startsWith("color") ? (
                      <span
                        className="h-8 w-8 rounded-md border border-white/15"
                        style={{ backgroundColor: item.value }}
                      />
                    ) : item.kind.startsWith("logo") || item.kind === "image_hero" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.value} alt="" className="h-10 w-16 object-contain" />
                    ) : (
                      <span className="text-xs text-white/70">{item.altValue || item.value}</span>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      data-testid={`starter-approve-${item.id}`}
                      className="min-h-11 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground"
                      onClick={() => approveStarter(item.id)}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      data-testid={`starter-keep-${item.id}`}
                      className="min-h-11 rounded-md border border-white/15 px-3 text-xs"
                      onClick={() =>
                        commit(
                          { ...draft, starter: keepStarterItem(draft.starter, item.id) },
                          `Keep suggestion · ${item.label}`
                        )
                      }
                    >
                      Keep
                    </button>
                    <button
                      type="button"
                      data-testid={`starter-ignore-${item.id}`}
                      className="min-h-11 rounded-md border border-white/15 px-3 text-xs"
                      onClick={() =>
                        commit(
                          { ...draft, starter: ignoreStarterItem(draft.starter, item.id) },
                          `Ignore suggestion · ${item.label}`
                        )
                      }
                    >
                      Ignore
                    </button>
                    <button
                      type="button"
                      data-testid={`starter-replace-${item.id}`}
                      className="min-h-11 rounded-md border border-white/15 px-3 text-xs"
                      onClick={() => {
                        const next = window.prompt("Replacement value (hex, URL, or font id)", item.value);
                        if (!next) return;
                        commit(
                          {
                            ...draft,
                            starter: replaceStarterItem(draft.starter, item.id, next),
                          },
                          `Replace suggestion · ${item.label}`
                        );
                      }}
                    >
                      Replace
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <IntakePanel />
          </div>
        );
      case "brand":
        return (
          <div className="space-y-3 text-sm" data-testid="brand-drawer-brand">
            <p className="text-white/70">{businessName}</p>
            <p className="text-xs text-white/60">
              Logo, colors, and type below update Brand Kit. Existing saved Cards keep stored values
              until re-saved. Classic form remains at Brand Kit for contact and compliance.
            </p>
            <Link href="/dashboard/brand" className="text-xs text-primary underline">
              Open classic Brand Kit form
            </Link>
          </div>
        );
      case "logos":
        return (
          <div className="space-y-4" data-testid="brand-drawer-logos">
            <LogoLibrary
              items={draft.logos}
              selectedId={selectedAssetId}
              onSelect={setSelectedAssetId}
              onSetPrimary={(id) => {
                const logo = draft.logos.find((l) => l.id === id);
                if (!logo) return;
                commit(
                  {
                    ...draft,
                    brand: { ...draft.brand, logoUrl: logo.url },
                    logos: draft.logos.map((l) => ({
                      ...l,
                      role: l.id === id ? "primary" : l.role === "primary" ? "alternate" : l.role,
                    })),
                  },
                  "Logo selection · primary"
                );
                void saveBrand({ logoUrl: logo.url });
              }}
              onApprove={(id) => {
                commit(
                  {
                    ...draft,
                    logos: draft.logos.map((l) =>
                      l.id === id ? { ...l, approval: "approved" } : l
                    ),
                  },
                  "Approve logo"
                );
              }}
              onIgnore={(id) => {
                commit(
                  {
                    ...draft,
                    logos: draft.logos.map((l) =>
                      l.id === id ? { ...l, approval: "ignored" } : l
                    ),
                  },
                  "Ignore logo"
                );
              }}
              onReplace={() => openTopic("discover")}
            />
            <div data-testid="brand-logo-media-picker">
              <p className="mb-2 text-xs text-white/60">Upload or pick from library</p>
              <MediaPicker
                value={draft.brand.logoUrl || ""}
                onChange={(url) => {
                  commit(
                    {
                      ...draft,
                      brand: { ...draft.brand, logoUrl: url },
                      logos: upsertLogo(draft.logos, {
                        id: `upload-${Date.now()}`,
                        url,
                        role: "primary",
                        approval: "approved",
                        source: "Upload",
                        format: guessFormat(url),
                      }),
                    },
                    "Logo upload / replace"
                  );
                  void saveBrand({ logoUrl: url });
                }}
                mediaUploadReady={mediaUploadReady}
                stockReady={stockReady}
              />
            </div>
          </div>
        );
      case "images":
        return (
          <div className="space-y-4" data-testid="brand-drawer-images">
            {draft.images.length === 0 ? (
              <p className="text-sm text-white/55">No images yet — upload below.</p>
            ) : (
              <ul className="space-y-3">
                {draft.images.map((im) => (
                  <li
                    key={im.id}
                    className={cn(
                      "rounded-lg border p-2",
                      selectedAssetId === im.id
                        ? "border-primary/40"
                        : "border-white/10"
                    )}
                    data-testid={`image-tile-${im.id}`}
                  >
                    <button type="button" className="w-full text-left" onClick={() => setSelectedAssetId(im.id)}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={im.url}
                        alt={im.alt}
                        className={cn(
                          "h-28 w-full rounded-md",
                          im.fit === "cover" ? "object-cover" : "object-contain bg-black/30"
                        )}
                      />
                      <p className="mt-2 text-xs text-white/60">
                        Role: {im.role} · Fit: {im.fit}
                      </p>
                    </button>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="min-h-11 rounded-md border border-white/15 px-3 text-xs"
                        onClick={() =>
                          commit(
                            {
                              ...draft,
                              images: draft.images.map((x) =>
                                x.id === im.id
                                  ? { ...x, fit: x.fit === "cover" ? "contain" : "cover" }
                                  : x
                              ),
                            },
                            "Image fit toggle"
                          )
                        }
                      >
                        Toggle contain/cover
                      </button>
                      <label className="flex min-h-11 items-center gap-2 text-xs text-white/60">
                        Alt
                        <input
                          className="min-h-11 flex-1 rounded-md border border-white/15 bg-transparent px-2"
                          value={im.alt}
                          onChange={(e) =>
                            commit(
                              {
                                ...draft,
                                images: draft.images.map((x) =>
                                  x.id === im.id ? { ...x, alt: e.target.value } : x
                                ),
                              },
                              "Image alt text"
                            )
                          }
                        />
                      </label>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <MediaPicker
              value=""
              onChange={(url) => {
                const id = `img-${Date.now()}`;
                commit(
                  {
                    ...draft,
                    images: [
                      { id, url, role: "general", fit: "contain", alt: "" },
                      ...draft.images,
                    ],
                  },
                  "Image upload"
                );
                setSelectedAssetId(id);
              }}
              mediaUploadReady={mediaUploadReady}
              stockReady={stockReady}
            />
          </div>
        );
      case "colors":
        return (
          <div className="space-y-4" data-testid="brand-drawer-colors">
            {(Object.keys(BRAND_COLOR_ROLE_LABELS) as BrandColorRole[])
              .filter((role) => role !== "surface")
              .map((role) => (
              <label key={role} className="block text-xs text-white/60">
                {BRAND_COLOR_ROLE_LABELS[role]}
                <div className="mt-1 flex min-h-11 items-center gap-2">
                  <input
                    type="color"
                    data-testid={`brand-color-${role}`}
                    value={normalizeHex(colors[role])}
                    onChange={(e) => setColorRole(role, e.target.value)}
                    className="h-11 w-14 cursor-pointer rounded border border-white/15 bg-transparent"
                  />
                  <input
                    type="text"
                    value={colors[role]}
                    onChange={(e) => setColorRole(role, e.target.value)}
                    className="min-h-11 flex-1 rounded-md border border-white/15 bg-transparent px-2 text-sm text-white"
                  />
                </div>
              </label>
            ))}
            <div
              className="rounded-md border border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-white/55"
              data-testid="brand-color-surface-derived"
            >
              Surface plate uses Background ({colors.surface}) — not Secondary, so bright accents
              never become the Card plate by accident.
            </div>
            <div data-testid="brand-contrast-checks" className="space-y-2">
              <p className="text-xs font-medium text-white/80">Contrast</p>
              {contrast.map((c) => (
                <p
                  key={c.id}
                  data-testid={`contrast-${c.id}`}
                  data-severity={c.severity}
                  className={cn(
                    "text-[11px]",
                    c.severity === "fail"
                      ? "text-red-300"
                      : c.severity === "warn"
                        ? "text-amber-200/90"
                        : "text-white/60"
                  )}
                >
                  {c.label}: {c.ratio}:1 — {c.message}
                </p>
              ))}
            </div>
          </div>
        );
      case "fonts":
        return (
          <div className="space-y-4" data-testid="brand-drawer-fonts">
            {(["display", "body", "accent"] as const).map((role) => (
              <label key={role} className="block text-xs text-white/60">
                {role === "display" ? "Display / heading" : role === "body" ? "Body" : "Accent"}
                <select
                  data-testid={`brand-font-${role}`}
                  className="mt-1 min-h-11 w-full rounded-md border border-white/15 bg-[#0a0f1c] px-2 text-sm text-white"
                  value={draft.fontRoles[role]}
                  onChange={(e) => {
                    const id = e.target.value as PremiumFontFamily;
                    const fontRoles = { ...draft.fontRoles, [role]: id };
                    const brand =
                      role === "body"
                        ? {
                            ...draft.brand,
                            fontStyle: FONT_STYLE_FROM_PREMIUM[id] || "MODERN",
                          }
                        : draft.brand;
                    commit({ ...draft, fontRoles, brand }, `Font role · ${role}`);
                    if (role === "body") {
                      void saveBrand({ fontStyle: FONT_STYLE_FROM_PREMIUM[id] || "MODERN" });
                    }
                  }}
                >
                  {PREMIUM_FONT_OPTIONS.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            <TypographyPreview brand={draft.brand} fontRoles={draft.fontRoles} colors={colors} compact />
          </div>
        );
      case "applications":
        return (
          <div className="space-y-4" data-testid="brand-drawer-applications">
            <p className="text-xs text-white/55">
              Card preview here uses the same shared resolver as TapConnectCard action pills.
              Overrides in this panel are a <strong className="text-white">session proof</strong> —
              they do not rewrite the saved Card JSON. Promote updates Brand Kit only; public Cards
              keep stored colors until you edit the Card.
            </p>
            <button
              type="button"
              className="min-h-11 w-full rounded-md border border-white/15 text-xs"
              data-testid="brand-show-card-preview"
              onClick={() => setPreviewSurface("card")}
            >
              Inspect Card preview
            </button>
            <label className="block text-xs text-white/60">
              Selected button background
              <div className="mt-1 flex gap-2">
                <input
                  type="color"
                  data-testid="card-override-background"
                  value={normalizeHex(selectedBg?.value || colors.cta)}
                  onChange={(e) => onOverrideBackground(e.target.value)}
                  className="h-11 w-14 rounded border border-white/15 bg-transparent"
                />
                <span className="self-center text-[11px] text-white/60" data-testid="card-override-source">
                  Source: {selectedBg?.source ?? "brand"}
                </span>
              </div>
            </label>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                data-testid="card-reset-property"
                className="min-h-11 rounded-md border border-white/15 text-xs"
                onClick={onResetBackground}
              >
                Reset this property to Brand
              </button>
              <button
                type="button"
                data-testid="card-reset-item"
                className="min-h-11 rounded-md border border-white/15 text-xs"
                onClick={onResetItem}
              >
                Reset item to Brand
              </button>
              <button
                type="button"
                data-testid="card-keep-only"
                className="min-h-11 rounded-md border border-white/15 text-xs"
                onClick={() =>
                  setSaveMsg("Kept only on this Card — other buttons unchanged.")
                }
              >
                Keep only on this Card
              </button>
              <button
                type="button"
                data-testid="card-apply-similar"
                className="min-h-11 rounded-md border border-white/15 text-xs"
                onClick={onApplySimilar}
              >
                Apply to similar items on this Card
              </button>
              <button
                type="button"
                data-testid="card-promote-background"
                className="min-h-11 rounded-md bg-primary text-xs font-medium text-primary-foreground disabled:opacity-40"
                disabled={selectedBg?.source !== "custom"}
                onClick={openPromote}
              >
                Promote to Brand CTA
              </button>
            </div>
          </div>
        );
      case "history":
        return (
          <div className="space-y-3" data-testid="brand-drawer-history">
            <p className="text-xs text-white/60">
              Current-session history. Closing the tab clears Undo. Brand Kit color/logo saves from
              this session are re-written when you Undo/Redo those steps — durable Brand revision
              history is deferred.
            </p>
            <ul className="space-y-1">
              {history.past.length === 0 ? (
                <li className="text-sm text-white/50">No session actions yet.</li>
              ) : (
                history.past
                  .slice()
                  .reverse()
                  .map((entry, i) => (
                    <li key={`${entry.label}-${i}`} className="text-xs text-white/70">
                      {entry.label}
                    </li>
                  ))
              )}
            </ul>
            <div className="flex gap-2">
              <button
                type="button"
                className="min-h-11 flex-1 rounded-md border border-white/15 text-xs disabled:opacity-40"
                disabled={!history.past.length}
                onClick={undo}
              >
                Undo
              </button>
              <button
                type="button"
                className="min-h-11 flex-1 rounded-md border border-white/15 text-xs disabled:opacity-40"
                disabled={!history.future.length}
                onClick={redo}
              >
                Redo
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  }

  function IntakePanel() {
    return (
      <div
        className="space-y-3 rounded-lg border border-dashed border-white/15 p-3"
        data-testid="brand-intake-stubs"
      >
        <p className="text-xs font-medium text-white/80">Add Brand material</p>
        <p className="text-[11px] text-white/55">
          Prepared locally in this Studio session — website addresses use fixture shortlists, not a
          live crawl.
        </p>
        <label className="block text-xs text-white/55">
          Website URL
          <div className="mt-1 flex gap-2">
            <input
              data-testid="intake-website-url"
              className="min-h-11 flex-1 rounded-md border border-white/15 bg-transparent px-2 text-sm"
              value={websiteInput}
              onChange={(e) => setWebsiteInput(e.target.value)}
              placeholder="https://yourbrand.com"
            />
            <button
              type="button"
              data-testid="intake-website-submit"
              className="min-h-11 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground"
              onClick={() => {
                const result = intakeFromWebsiteUrl(websiteInput, {
                  businessName,
                  logoUrl: draft.brand.logoUrl,
                });
                setIntakeMsg(result.message);
                if (result.ok && result.starter) {
                  commit({ ...draft, starter: result.starter }, "Discover from website (local)");
                }
              }}
            >
              Prepare
            </button>
          </div>
        </label>
        <label className="block text-xs text-white/55">
          Exact asset URL
          <div className="mt-1 flex gap-2">
            <input
              data-testid="intake-asset-url"
              className="min-h-11 flex-1 rounded-md border border-white/15 bg-transparent px-2 text-sm"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
            />
            <button
              type="button"
              data-testid="intake-asset-submit"
              className="min-h-11 rounded-md border border-white/15 px-3 text-xs"
              onClick={() => {
                const result = intakeFromAssetUrl(urlInput);
                setIntakeMsg(result.message);
                if (result.ok && result.assetUrl) {
                  commit(
                    {
                      ...draft,
                      logos: upsertLogo(draft.logos, {
                        id: `url-${Date.now()}`,
                        url: result.assetUrl,
                        role: "other",
                        approval: "suggested",
                        source: "Exact URL",
                        format: guessFormat(result.assetUrl),
                      }),
                    },
                    "Intake asset URL"
                  );
                }
              }}
            >
              Add
            </button>
          </div>
        </label>
        <label className="block text-xs text-white/55">
          Paste hex colors
          <div className="mt-1 flex gap-2">
            <input
              data-testid="intake-hex"
              className="min-h-11 flex-1 rounded-md border border-white/15 bg-transparent px-2 text-sm"
              value={hexInput}
              onChange={(e) => setHexInput(e.target.value)}
              placeholder="#1a5f4a #c4a35a"
            />
            <button
              type="button"
              data-testid="intake-hex-submit"
              className="min-h-11 rounded-md border border-white/15 px-3 text-xs"
              onClick={() => {
                const result = intakeFromPastedHex(hexInput);
                setIntakeMsg(result.message);
                if (result.ok && result.colors?.[0]) {
                  setColorRole("primary", result.colors[0]);
                  if (result.colors[1]) setColorRole("secondary", result.colors[1]);
                }
              }}
            >
              Use
            </button>
          </div>
        </label>
        <label className="block text-xs text-white/55">
          Paste text
          <textarea
            data-testid="intake-text"
            className="mt-1 min-h-[88px] w-full rounded-md border border-white/15 bg-transparent px-2 py-2 text-sm"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
          />
          <button
            type="button"
            data-testid="intake-text-submit"
            className="mt-2 min-h-11 rounded-md border border-white/15 px-3 text-xs"
            onClick={() => {
              const result = intakeFromPastedText(textInput);
              setIntakeMsg(result.message);
            }}
          >
            Capture notes
          </button>
        </label>
        {intakeMsg ? (
          <p className="text-[11px] text-white/55" data-testid="intake-message" role="status">
            {intakeMsg}
          </p>
        ) : null}
      </div>
    );
  }
}

function createInitialDraft(
  initialBrand: BrandKitWorkspaceProps["initialBrand"],
  cardConfig: TapConnectCardConfig | null,
  logoOptions: string[],
  businessName: string
): WorkspaceDraft {
  const brand: WorkspaceDraft["brand"] = {
    primaryColor: initialBrand.primaryColor,
    secondaryColor: initialBrand.secondaryColor,
    accentColor: initialBrand.accentColor,
    backgroundColor: initialBrand.backgroundColor,
    textColor: initialBrand.textColor,
    fontStyle: initialBrand.fontStyle,
    buttonStyle: initialBrand.buttonStyle,
    logoUrl: initialBrand.logoUrl,
    website: initialBrand.website,
  };
  const starter = createBrandStarterKitFixture({
    businessName,
    website: initialBrand.website,
    logoUrl: initialBrand.logoUrl,
    primaryColor: initialBrand.primaryColor,
    secondaryColor: initialBrand.secondaryColor,
  });
  const logos: LogoLibraryItem[] = [];
  if (initialBrand.logoUrl) {
    logos.push({
      id: "current-logo",
      url: initialBrand.logoUrl,
      role: "primary",
      approval: "approved",
      source: "Brand Kit",
      format: guessFormat(initialBrand.logoUrl),
    });
  }
  for (const url of logoOptions) {
    if (url && url !== initialBrand.logoUrl) {
      logos.push({
        id: `opt-${logos.length}`,
        url,
        role: "alternate",
        approval: "none",
        source: "Library",
        format: guessFormat(url),
      });
    }
  }
  const bodyFont = resolveFontFamily(brand, "body");
  return {
    brand,
    cardVisual: buildCardVisualModel(brand, cardConfig),
    starter,
    logos,
    images: [],
    fontRoles: {
      display: resolveFontFamily(brand, "display").id,
      body: bodyFont.id,
      accent: resolveFontFamily(brand, "accent").id,
    },
  };
}

function upsertLogo(list: LogoLibraryItem[], item: LogoLibraryItem): LogoLibraryItem[] {
  const idx = list.findIndex((l) => l.id === item.id || l.url === item.url);
  if (idx >= 0) {
    const next = [...list];
    next[idx] = { ...next[idx], ...item };
    return next;
  }
  return [item, ...list];
}

function guessFormat(url: string): string {
  if (url.startsWith("data:image/svg")) return "svg";
  if (/\.png(\?|$)/i.test(url)) return "png";
  if (/\.jpe?g(\?|$)/i.test(url)) return "jpeg";
  if (/\.webp(\?|$)/i.test(url)) return "webp";
  return "image";
}

function normalizeHex(v: string): string {
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v;
  if (/^#[0-9a-fA-F]{3}$/.test(v)) {
    const r = v[1];
    const g = v[2];
    const b = v[3];
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return "#22c55e";
}

function BrandMarkPreview({
  businessName,
  logoUrl,
  colors,
  fontRoles,
}: {
  businessName: string;
  logoUrl?: string | null;
  colors: ReturnType<typeof brandColorsFromKit>;
  fontRoles: WorkspaceDraft["fontRoles"];
}) {
  const display = PREMIUM_FONT_OPTIONS.find((f) => f.id === fontRoles.display)!;
  return (
    <div
      className="w-[320px] overflow-hidden rounded-2xl border border-white/10 p-6"
      style={{ backgroundColor: colors.background, color: colors.headline }}
      data-testid="brand-mark-preview"
    >
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" className="mb-4 h-12 w-auto max-w-[180px] object-contain" />
      ) : null}
      <p className="text-2xl font-semibold" style={{ fontFamily: display.css }}>
        {businessName}
      </p>
      <div className="mt-4 flex gap-2">
        {(["primary", "secondary", "cta", "link"] as const).map((r) => (
          <span
            key={r}
            className="h-8 w-8 rounded-full border border-white/20"
            style={{ backgroundColor: colors[r] }}
            title={r}
          />
        ))}
      </div>
      <button
        type="button"
        className="mt-5 min-h-11 w-full rounded-xl text-sm font-medium"
        style={{
          backgroundColor: colors.cta,
          color: readableOn(colors.cta),
        }}
        data-testid="brand-preview-cta"
      >
        Continue
      </button>
    </div>
  );
}

function TypographyPreview({
  brand,
  fontRoles,
  colors,
  compact,
}: {
  brand: BrandKitVisualFields;
  fontRoles: WorkspaceDraft["fontRoles"];
  colors: ReturnType<typeof brandColorsFromKit>;
  compact?: boolean;
}) {
  const display = PREMIUM_FONT_OPTIONS.find((f) => f.id === fontRoles.display)!;
  const body = PREMIUM_FONT_OPTIONS.find((f) => f.id === fontRoles.body)!;
  const accent = PREMIUM_FONT_OPTIONS.find((f) => f.id === fontRoles.accent)!;
  return (
    <div
      className={cn("space-y-3 rounded-xl border border-white/10 p-4", compact ? "" : "w-[320px]")}
      style={{ backgroundColor: colors.background, color: colors.headline }}
      data-testid="brand-typography-preview"
    >
      <p className="text-2xl font-semibold" style={{ fontFamily: display.css }}>
        Headline sample
      </p>
      <p className="text-sm leading-relaxed" style={{ fontFamily: body.css, color: colors.body }}>
        Body paragraph uses your Brand body role with available Studio fonts only.
      </p>
      <p className="text-sm" style={{ fontFamily: accent.css, color: colors.link }}>
        Accent / link sample
      </p>
      <button
        type="button"
        className="min-h-11 rounded-lg px-4 text-sm font-medium"
        style={{
          backgroundColor: colors.cta,
          color: readableOn(colors.cta),
          fontFamily: body.css,
        }}
      >
        CTA sample
      </button>
      <p className="text-lg font-medium" style={{ fontFamily: display.css, color: colors.offerEmphasis }}>
        $24 · Sat Jul 26
      </p>
      <p className="text-[10px] text-white/50">fontStyle: {brand.fontStyle || "MODERN"}</p>
    </div>
  );
}
