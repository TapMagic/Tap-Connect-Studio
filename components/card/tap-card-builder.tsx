"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Columns2,
  Copy,
  ExternalLink,
  GripVertical,
  ImageIcon,
  Link2,
  Plus,
  Redo2,
  Rows3,
  Save,
  Upload,
  Type,
  Trash2,
  Undo2,
  Unlink,
} from "lucide-react";
import Link from "next/link";
import { nanoid } from "nanoid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MediaPicker } from "@/components/media/media-picker";
import { TapConnectCard } from "@/components/tap/tap-connect-card";
import { CardUtilityLayer } from "@/components/tap/card-utility-layer";
import { IconPicker } from "@/components/design/icon-picker";
import { FinishPicker, TextFormatControls } from "@/components/design/format-controls";
import {
  FormatWorkspace,
  FormatWorkspaceTrigger,
} from "@/components/design/format-workspace";
import { ExpandedTextField } from "@/components/design/expanded-text-field";
import { ButtonLayoutControls } from "@/components/design/button-layout-controls";
import { ColorSwatchPicker } from "@/components/design/color-swatch-picker";
import { KeywordsSuggestPanel } from "@/components/fusion/keywords/keywords-suggest-panel";
import { BrandInheritanceBar } from "@/components/fusion/authoring/brand-inheritance-bar";
import { publishCardEditorLive } from "@/components/fusion/card/card-editor-live";
import { CardOutlineRow } from "@/components/fusion/card/card-outline-row";
import { QrPanel } from "@/components/campaign/qr-panel";
import { FreeformCanvasPanel } from "@/components/fusion/builder/freeform-canvas-panel";
import {
  BuilderPreviewEmpty,
  tapCardPreviewEmptyReason,
} from "@/components/workbench/builder-preview-empty";
import { useLabeledUndoRedo } from "@/lib/hooks/use-labeled-undo-redo";
import {
  describeConfigChange,
  describeSectionsChange,
  describeSectionReorder,
  sectionDisplayName,
} from "@/lib/fusion/creative-studio/history-labels";
import {
  moveByDelta,
  moveToExtreme,
  reorderById,
} from "@/lib/fusion/authoring/reorder-list";
import type { BrandContactProfile } from "@/lib/brand/contact-profile";
import {
  createInheritanceState,
  overrideField,
  resolveInheritedValue,
  type BrandFieldKey,
  type BrandInheritanceState,
  type BrandKitSnapshot,
} from "@/lib/fusion/authoring/brand-inheritance";
import { cn } from "@/lib/utils";
import {
  COMMON_SOCIAL_KINDS,
  TAP_CARD_ACTION_CATALOG,
  TAP_CARD_LAYOUT_OPTIONS,
  TAP_CARD_SHAPE_OPTIONS,
  resolveActionHref,
  type TapCardActionKind,
  type TapCardButtonShape,
  type TapCardHeroFill,
  type TapCardOfferMode,
  type TapCardSection,
  type TapCardSectionType,
  type TapCardSpecialStyle,
  type TapCardSurfaceFill,
  type CardPropertySources,
  type TapConnectCardConfig,
} from "@/lib/brand/tap-card";
import {
  createCardBlock,
  type CardBlockKind,
} from "@/lib/fusion/card/block-model";
import { resolveCardUtilityLayer } from "@/lib/fusion/card/utility-layer";
import {
  addElementToCardRoot,
  addElementToSurface,
  createCardSurface,
  ensureRootComposition,
  moveCardElements,
  removeSectionKeepElements,
  resolveComposerSelectedObject,
  wrapCardElementsInSection,
  type CardElementKind,
  type CardSurfaceKind,
} from "@/lib/fusion/card/composer-model";

type CampaignLinkOption = {
  id: string;
  title: string;
  status: string;
  campaignType: string;
  features: string[];
  devices: { code: string; label: string }[];
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  group?: { id: string; title: string } | null;
};

type CampaignGroupLinkOption = {
  id: string;
  title: string;
  status: string;
  defaultCampaignTitle?: string | null;
  slotCount: number;
};

export type CardBuilderShellApi = {
  save: () => Promise<void>;
  publish: () => Promise<void>;
  undo: () => void;
  redo: () => void;
  setFocusMode: (next: boolean) => void;
  retireToggle: () => void;
  selectSection: (id: string | null) => void;
};

export type CardBuilderShellPanels = {
  outline: ReactNode;
  drawer: ReactNode;
};

export type CardBuilderShellStatus = {
  dirty: boolean;
  saving: boolean;
  focusMode: boolean;
  canUndo: boolean;
  canRedo: boolean;
  message: string | null;
  lifecycleStatus: string;
  brandSource: string;
  selectedId: string | null;
  sectionCount: number;
  cardName: string;
  pastLabels: string[];
  futureLabels: string[];
  canPublish: boolean;
  publicationLabel: string;
};

type Props = {
  initialConfig: TapConnectCardConfig;
  initialDraftRevision?: number;
  profile: BrandContactProfile;
  businessName: string;
  logoUrl?: string | null;
  reviewUrl?: string | null;
  mediaUploadReady: boolean;
  stockReady: boolean;
  isAdmin?: boolean;
  isLandingDemo?: boolean;
  devices?: { id: string; nickname: string | null; deviceCode: string }[];
  campaigns?: CampaignLinkOption[];
  campaignGroups?: CampaignGroupLinkOption[];
  experiences?: Array<{ id: string; name: string; status: string }>;
  locations?: Array<{ id: string; name: string; address?: string | null; mapUrl?: string | null; isDefault?: boolean }>;
  /** Platform feature: card.builder.freeform */
  freeformEnabled?: boolean;
  /** BrandKit id for publication snapshots / rollback */
  brandKitId?: string | null;
  /** Brand Kit colors (existing SoT) for inheritance — optional when already on config */
  brandColors?: {
    primaryColor?: string | null;
    secondaryColor?: string | null;
    accentColor?: string | null;
    backgroundColor?: string | null;
    textColor?: string | null;
  } | null;
  /** Dedicated /dashboard/card/edit full-screen workspace */
  workspaceMode?: boolean;
  /** True authoring escape — no competing page scroll; pane collapses; dirty guard */
  escapeMode?: boolean;
  /** After Done editing */
  doneHref?: string;
  /** Hosted by AdaptiveWorkspaceShell — hide duplicate chrome / permanent inspector. */
  shellHosted?: boolean;
  activeToolId?: string | null;
  shellFocusMode?: boolean;
  publicCode?: string | null;
  tapPointCount?: number;
  activeSpotlightTitle?: string | null;
  onShellApi?: (api: CardBuilderShellApi) => void;
  onShellOutline?: (outline: ReactNode) => void;
  onShellStatus?: (status: CardBuilderShellStatus) => void;
  onRequestTool?: (toolId: string) => void;
  /** Creative Studio Edit vs Preview — defaults to edit when hosted */
  interactionMode?: "edit" | "preview";
  compositionForceMobile?: boolean;
  previewMotion?: boolean;
  reducedMotionSimulation?: boolean;
  motionRevision?: number;
};

const COMMON_ACTION_KINDS: TapCardActionKind[] = [
  "vcard",
  "call",
  "email",
  "sms",
  "support",
  "website",
  "map",
  "review",
  "calendar",
  "shop",
  "book",
  "homescreen",
  "bookmark",
  ...COMMON_SOCIAL_KINDS,
  "custom",
];

function buildBrandKitSnapshot(params: {
  logoUrl?: string | null;
  businessName: string;
  profile: BrandContactProfile;
  reviewUrl?: string | null;
  brandColors?: Props["brandColors"];
  config: TapConnectCardConfig;
}): BrandKitSnapshot {
  return {
    logoUrl: params.logoUrl || params.config.headerLogoUrl || undefined,
    businessName: params.businessName || params.profile.displayName || undefined,
    phone: params.profile.phone || undefined,
    email: params.profile.email || undefined,
    website: params.profile.website || undefined,
    address: params.profile.address || undefined,
    reviewUrl: params.reviewUrl || undefined,
    primaryColor: params.brandColors?.primaryColor || undefined,
    secondaryColor: params.brandColors?.secondaryColor || undefined,
    accentColor:
      params.brandColors?.accentColor || params.config.accentColor || undefined,
    backgroundColor: params.brandColors?.backgroundColor || params.config.surfaceColor || undefined,
    textColor: params.brandColors?.textColor || params.config.textColor || undefined,
  };
}

function createInitialBrandState(
  state: BrandInheritanceState,
  propertySources?: CardPropertySources,
): BrandInheritanceState {
  const fields = { ...state.fields };
  const mappings = [
    ["accentColor", "accentColor"],
    ["surfaceColor", "backgroundColor"],
    ["textColor", "textColor"],
  ] as const;
  for (const [cardKey, brandKey] of mappings) {
    const source = propertySources?.[cardKey];
    const field = fields[brandKey];
    if (!field || !source) continue;
    fields[brandKey] = {
      ...field,
      mode: source.mode === "CUSTOM" ? "overridden" : "linked",
    };
  }
  return { ...state, fields };
}

function strInherited(
  state: BrandInheritanceState,
  key: BrandFieldKey
): string | undefined {
  const v = resolveInheritedValue(state, key);
  return typeof v === "string" && v.trim() ? v : undefined;
}

export function TapCardBuilder({
  initialConfig,
  initialDraftRevision = 0,
  profile,
  businessName,
  logoUrl,
  reviewUrl,
  mediaUploadReady,
  stockReady,
  isAdmin = false,
  isLandingDemo = false,
  devices = [],
  campaigns = [],
  campaignGroups = [],
  experiences = [],
  locations = [],
  freeformEnabled = false,
  brandKitId = null,
  brandColors = null,
  workspaceMode = false,
  escapeMode = false,
  doneHref = "/dashboard/card",
  shellHosted = false,
  activeToolId = null,
  shellFocusMode,
  publicCode = null,
  tapPointCount = 0,
  activeSpotlightTitle = null,
  onShellApi,
  onShellOutline,
  onShellStatus,
  onRequestTool,
  interactionMode = "edit",
  compositionForceMobile = false,
  previewMotion = false,
  reducedMotionSimulation = false,
  motionRevision = 0,
}: Props) {
  const router = useRouter();
  const {
    state: config,
    setState: setConfigHistory,
    undo: undoEditor,
    redo: redoEditor,
    canUndo: canUndoEditor,
    canRedo: canRedoEditor,
    pastLabels,
    futureLabels,
  } = useLabeledUndoRedo<TapConnectCardConfig>(initialConfig, { maxDepth: 50, batchMs: 350 });
  const sectionsHistory = config.sections;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedCompositionNodeIds, setSelectedCompositionNodeIds] = useState<
    string[]
  >([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [addKind, setAddKind] = useState<TapCardActionKind>("instagram");
  const [actionSearch, setActionSearch] = useState("");
  const [showFreeform, setShowFreeform] = useState(false);
  const [formatOpen, setFormatOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [previewZoom, setPreviewZoom] = useState<"fit" | number>(workspaceMode ? "fit" : 1);
  const [previewPan, setPreviewPan] = useState(false);
  const [zoomToolbarCollapsed, setZoomToolbarCollapsed] = useState(false);
  const [designChromeCollapsed, setDesignChromeCollapsed] = useState(true);
  const [outlineCollapsed, setOutlineCollapsed] = useState(false);
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false);
  const [preFocusPanes, setPreFocusPanes] = useState<{
    outline: boolean;
    inspector: boolean;
    design: boolean;
  } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draftRevision, setDraftRevision] = useState(initialDraftRevision);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingSectionDelete, setPendingSectionDelete] = useState<TapCardSection | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const [demoPublished, setDemoPublished] = useState(isLandingDemo);
  const [versions, setVersions] = useState<
    {
      id: string;
      publicRevisionId: string;
      version: number;
      sourceDraftRevision: number;
      status: "PUBLISHED" | "ARCHIVED";
      current: boolean;
      publishedAt: string;
      comparisonSummary?: { summary?: string };
    }[]
  >([]);
  const [currentPublicationId, setCurrentPublicationId] = useState<string | null>(null);
  const [brandState, setBrandState] = useState<BrandInheritanceState>(() =>
    createInitialBrandState(createInheritanceState(buildBrandKitSnapshot({
      logoUrl,
      businessName,
      profile,
      reviewUrl,
      brandColors,
      config: initialConfig,
    })), initialConfig.propertySources)
  );
  const inspectorRef = useRef<HTMLDivElement>(null);
  const previewScrollRef = useRef<HTMLDivElement>(null);

  const sorted = [...sectionsHistory].sort((a, b) => a.order - b.order);
  const selected = sorted.find((s) => s.id === selectedId) ?? null;
  const selectedObject = resolveComposerSelectedObject(config, selectedId, selectedCompositionNodeIds);
  const cardEmptyReason = config.rootComposition?.nodes.length
    ? null
    : tapCardPreviewEmptyReason(sorted);
  const previewUtilityLayer = resolveCardUtilityLayer({
    card: config,
    profile,
    reviewUrl,
    featureEnabled: () => true,
    keepCardEnabled: true,
  });

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (e.key === "Escape" && !target?.closest("input, textarea, select, [contenteditable=true]")) {
        if (selectedCompositionNodeIds.length) {
          e.preventDefault();
          setSelectedCompositionNodeIds([]);
          return;
        }
        if (selectedId) {
          e.preventDefault();
          setSelectedId(null);
          return;
        }
      }
      if (!(e.metaKey || e.ctrlKey)) return;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undoEditor();
      } else if ((e.key === "z" && e.shiftKey) || e.key === "y") {
        e.preventDefault();
        redoEditor();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undoEditor, redoEditor, selectedCompositionNodeIds.length, selectedId]);

  useEffect(() => {
    if (!selectedId || !previewScrollRef.current) return;
    const container = previewScrollRef.current;
    const el = container.querySelector(
      `[data-section-id="${typeof CSS !== "undefined" && CSS.escape ? CSS.escape(selectedId) : selectedId}"]`
    );
    if (!(el instanceof HTMLElement)) return;
    requestAnimationFrame(() => {
      const cRect = container.getBoundingClientRect();
      const eRect = el.getBoundingClientRect();
      const delta =
        eRect.top - cRect.top - container.clientHeight / 2 + eRect.height / 2;
      container.scrollBy({ top: delta, behavior: "smooth" });
    });
  }, [selectedId]);

  useEffect(() => {
    if (!escapeMode || !dirty) return;
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [escapeMode, dirty]);

  function toggleFocusMode() {
    setFocusMode((wasFocused) => {
      if (!wasFocused) {
        setPreFocusPanes({
          outline: outlineCollapsed,
          inspector: inspectorCollapsed,
          design: designChromeCollapsed,
        });
        setOutlineCollapsed(true);
        setInspectorCollapsed(true);
        setDesignChromeCollapsed(true);
        return true;
      }
      if (preFocusPanes) {
        setOutlineCollapsed(preFocusPanes.outline);
        setInspectorCollapsed(preFocusPanes.inspector);
        setDesignChromeCollapsed(preFocusPanes.design);
        setPreFocusPanes(null);
      } else {
        setOutlineCollapsed(false);
        setInspectorCollapsed(false);
      }
      return false;
    });
  }

  const catalogFiltered = TAP_CARD_ACTION_CATALOG.filter((c) => {
    if (!actionSearch.trim()) return COMMON_ACTION_KINDS.includes(c.kind);
    const q = actionSearch.toLowerCase();
    return c.label.toLowerCase().includes(q) || c.kind.includes(q);
  });

  function patchConfig(
    patch: Partial<TapConnectCardConfig>,
    label?: string,
    batch = false
  ) {
    setDirty(true);
    setConfigHistory(
      (c) => {
        const next = { ...c, ...patch };
        return next;
      },
      {
        label:
          label ||
          describeConfigChange(config, { ...config, ...patch }),
        batch,
      }
    );
  }

  function applyInheritedColors(state: BrandInheritanceState) {
    if (!state.useBrandKit) return;
    const accent =
      strInherited(state, "accentColor") || strInherited(state, "primaryColor");
    const surface = strInherited(state, "backgroundColor");
    const text = strInherited(state, "textColor");
    const logo = strInherited(state, "logoUrl");
    setConfigHistory(
      (c) => {
        const next = { ...c };
        if (accent && !c.accentColor?.trim()) next.accentColor = accent;
        if (accent && !c.neonColor?.trim()) next.neonColor = accent;
        if (surface && !c.surfaceColor?.trim()) next.surfaceColor = surface;
        if (text && !c.textColor?.trim()) next.textColor = text;
        if (logo && !c.headerLogoUrl?.trim()) {
          next.headerLogoUrl = logo;
          next.showHeaderLogo = true;
        }
        return next;
      },
      { label: "Applied Brand colors" }
    );
    setDirty(true);
  }

  function handleBrandStateChange(next: BrandInheritanceState) {
    const prev = brandState;
    setBrandState(next);

    // Restore overridden colors into the card config
    const colorKeys: BrandFieldKey[] = [
      "accentColor",
      "primaryColor",
      "backgroundColor",
      "textColor",
      "logoUrl",
    ];
    const patch: Partial<TapConnectCardConfig> = {};
    for (const key of colorKeys) {
      const wasOverridden = prev.fields[key]?.mode === "overridden";
      const nowRestored =
        next.fields[key]?.mode === "linked" || next.fields[key]?.mode === "copied";
      if (!(wasOverridden && nowRestored)) continue;
      const value = strInherited(next, key);
      if (!value) continue;
      if (key === "accentColor" || key === "primaryColor") {
        patch.accentColor = value;
        patch.neonColor = value;
      } else if (key === "backgroundColor") {
        patch.surfaceColor = value;
      } else if (key === "textColor") {
        patch.textColor = value;
      } else if (key === "logoUrl") {
        patch.headerLogoUrl = value;
        patch.showHeaderLogo = true;
      }
    }
    if (Object.keys(patch).length) {
      const propertySources = { ...config.propertySources };
      if (patch.accentColor) propertySources.accentColor = { mode: "BRAND", source: "BRAND", sourceValue: patch.accentColor };
      if (patch.surfaceColor) propertySources.surfaceColor = { mode: "BRAND", source: "BRAND", sourceValue: patch.surfaceColor };
      if (patch.textColor) propertySources.textColor = { mode: "BRAND", source: "BRAND", sourceValue: patch.textColor };
      patchConfig({ ...patch, propertySources });
    }
    if (next.useBrandKit && !prev.useBrandKit) {
      applyInheritedColors(next);
      const identityPrefill = sectionsHistory.map((s) => {
        if (s.type !== "identity") return s;
        const idPatch: Partial<TapCardSection> = {};
        if (!s.name?.trim()) {
          const name =
            strInherited(next, "businessName") ||
            profile.displayName ||
            businessName;
          if (name) idPatch.name = name;
        }
        if (!s.organization?.trim()) {
          const org =
            profile.organization ||
            strInherited(next, "businessName") ||
            businessName;
          if (org) idPatch.organization = org;
        }
        if (!s.title?.trim() && profile.jobTitle) idPatch.title = profile.jobTitle;
        return Object.keys(idPatch).length ? { ...s, ...idPatch } : s;
      });
      if (identityPrefill.some((s, i) => s !== sectionsHistory[i])) {
        setSections(identityPrefill, false);
      }
    }
  }

  function patchConfigColor(
    key: "accentColor" | "surfaceColor" | "textColor" | "pillColor" | "pillTextColor" | "neonColor",
    value: string
  ) {
    const sourceKey = key === "neonColor" ? "accentColor" : key;
    const propertySources = {
      ...config.propertySources,
      [sourceKey]: { mode: "CUSTOM", source: "BRAND", sourceValue: brandValueForConfigKey(sourceKey) },
    } as CardPropertySources;
    patchConfig({ [key]: value, propertySources });
    const brandKey: BrandFieldKey | null =
      key === "accentColor" || key === "neonColor"
        ? "accentColor"
        : key === "surfaceColor"
          ? "backgroundColor"
          : key === "textColor"
            ? "textColor"
            : null;
    if (brandKey) setBrandState((s) => overrideField(s, brandKey, value));
  }

  function brandValueForConfigKey(key: keyof CardPropertySources): string | undefined {
    if (key === "accentColor") {
      return strInherited(brandState, "accentColor") || strInherited(brandState, "primaryColor") || undefined;
    }
    if (key === "surfaceColor") return strInherited(brandState, "backgroundColor") || undefined;
    if (key === "textColor") return strInherited(brandState, "textColor") || undefined;
    return undefined;
  }

  function identityValue(
    key: "name" | "title" | "organization" | "headline",
    local: string | undefined
  ): string {
    if (local?.trim()) return local;
    if (!brandState.useBrandKit) return local ?? "";
    if (key === "name") {
      return (
        strInherited(brandState, "businessName") ||
        profile.displayName ||
        businessName ||
        ""
      );
    }
    if (key === "title") return profile.jobTitle || "";
    if (key === "organization") {
      return (
        profile.organization ||
        strInherited(brandState, "businessName") ||
        businessName ||
        ""
      );
    }
    return local ?? "";
  }

  function setSections(
    next: TapCardSection[],
    record = true,
    label = "Updated Card sections"
  ) {
    const ordered = next.map((s, i) => ({ ...s, order: i }));
    setDirty(true);
    setConfigHistory(
      (c) => ({ ...c, sections: ordered }),
      record
        ? { label: label || describeSectionsChange(config.sections, ordered) }
        : { record: false }
    );
  }

  function patchSection(
    id: string,
    patch: Partial<TapCardSection>,
    label?: string
  ) {
    const current = sorted.find((s) => s.id === id);
    if (current?.locked) {
      const keys = Object.keys(patch);
      const onlyLockToggle =
        keys.length === 1 && keys[0] === "locked";
      const onlyVisibility =
        keys.length === 1 && keys[0] === "enabled";
      if (!onlyLockToggle && !onlyVisibility) {
        setMessage("Unlock this block before editing it.");
        return;
      }
    }
    const next = sorted.map((s) => (s.id === id ? { ...s, ...patch } : s));
    setSections(
      next,
      true,
      label || describeSectionsChange(sorted, next)
    );
  }

  function linkCampaignToSection(sectionId: string, campaignId: string) {
    const campaign = campaigns.find((c) => c.id === campaignId);
    if (!campaign) return;
    const current = sorted.find((s) => s.id === sectionId);
    const deviceCode = campaign.devices[0]?.code || devices[0]?.deviceCode || "";
    const href = deviceCode ? `/t/${deviceCode}?public=1` : "";
    // Prefer durable bind API so Campaign offer_coupon becomes authoritative SoT
    void fetch("/api/card/offer/bind", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaignId: campaign.id,
        sectionId,
        preservePresentation: Boolean(current?.headline?.trim() || current?.description?.trim()),
        deviceCode: deviceCode || undefined,
      }),
    })
      .then(async (res) => {
        const data = (await res.json()) as {
          ok?: boolean;
          offer?: {
            title?: string;
            description?: string;
            code?: string;
            expiresAt?: string;
            ctaLabel?: string;
          };
          offerBlockId?: string;
          factsFingerprint?: string;
        };
        if (!res.ok || !data.ok) {
          // Fallback: metadata link without authoritative sync
          patchSection(sectionId, {
            sourceMode: "LINKED",
            linkedObjectType: "CAMPAIGN",
            linkedObjectId: campaign.id,
            linkedObjectName: campaign.title,
            linkedObjectStatus: campaign.status,
            linkedStartsAt: campaign.scheduledStart || undefined,
            linkedEndsAt: campaign.scheduledEnd || undefined,
            fallbackMode: current?.fallbackMode || "LOCAL",
            fallbackText: current?.fallbackText || current?.headline || current?.offerTitle,
            offerMode: "campaign",
            linkedCampaignId: campaign.id,
            linkedCampaignTitle: campaign.title,
            linkedDeviceCode: deviceCode || undefined,
            href,
            offerCta: current?.offerCta || "Claim offer",
            headline: current?.headline?.trim() ? current.headline : campaign.title,
            description: current?.description?.trim()
              ? current.description
              : campaign.features.length
                ? `Includes: ${campaign.features.slice(0, 3).join(" · ")}`
                : "Opens this campaign page",
          });
          return;
        }
        patchSection(sectionId, {
          sourceMode: "LINKED",
          linkedObjectType: "CAMPAIGN",
          linkedObjectId: campaign.id,
          linkedObjectName: campaign.title,
          linkedObjectStatus: campaign.status,
          linkedStartsAt: campaign.scheduledStart || undefined,
          linkedEndsAt: campaign.scheduledEnd || undefined,
          fallbackMode: current?.fallbackMode || "LOCAL",
          fallbackText: current?.fallbackText || current?.headline || current?.offerTitle,
          offerMode: "campaign",
          linkedCampaignId: campaign.id,
          linkedCampaignTitle: campaign.title,
          linkedDeviceCode: deviceCode || undefined,
          href,
          offerBlockId: data.offerBlockId,
          offerFactsFingerprint: data.factsFingerprint,
          offerTitle: data.offer?.title,
          offerDescription: data.offer?.description,
          offerCode: data.offer?.code,
          offerExpires: data.offer?.expiresAt,
          offerCta: data.offer?.ctaLabel || current?.offerCta || "Claim offer",
          headline: current?.headline?.trim() ? current.headline : data.offer?.title || campaign.title,
          description: current?.description?.trim()
            ? current.description
            : data.offer?.description ||
              (campaign.features.length
                ? `Includes: ${campaign.features.slice(0, 3).join(" · ")}`
                : "Special offer"),
          offerDefaultOpen: current?.offerDefaultOpen ?? true,
        });
      })
      .catch(() => {
        patchSection(sectionId, {
          sourceMode: "LINKED",
          linkedObjectType: "CAMPAIGN",
          linkedObjectId: campaign.id,
          linkedObjectName: campaign.title,
          linkedObjectStatus: campaign.status,
          linkedStartsAt: campaign.scheduledStart || undefined,
          linkedEndsAt: campaign.scheduledEnd || undefined,
          fallbackMode: current?.fallbackMode || "LOCAL",
          fallbackText: current?.fallbackText || current?.headline || current?.offerTitle,
          offerMode: "campaign",
          linkedCampaignId: campaign.id,
          linkedCampaignTitle: campaign.title,
          linkedDeviceCode: deviceCode || undefined,
          href,
          offerCta: current?.offerCta || "Claim offer",
          headline: current?.headline?.trim() ? current.headline : campaign.title,
        });
      });
  }

  function unlinkCampaignFromSection(sectionId: string) {
    patchSection(sectionId, {
      offerMode: "link",
      sourceMode: "LOCAL",
      linkedObjectType: undefined,
      linkedObjectId: undefined,
      linkedObjectName: undefined,
      linkedObjectStatus: undefined,
      linkedStartsAt: undefined,
      linkedEndsAt: undefined,
      linkedCampaignId: undefined,
      linkedCampaignTitle: undefined,
      linkedDeviceCode: undefined,
    });
  }

  function reorder(fromId: string, toId: string) {
    const next = reorderById(sorted, fromId, toId);
    if (!next) return;
    setSections(next, true, describeSectionReorder(sorted, next));
  }

  function moveSectionBy(id: string, delta: number) {
    const next = moveByDelta(sorted, id, delta);
    if (!next) return;
    setSections(next, true, describeSectionReorder(sorted, next));
  }

  function moveSectionTo(id: string, edge: "top" | "bottom") {
    const next = moveToExtreme(sorted, id, edge);
    if (!next) return;
    const name = sectionDisplayName(sorted.find((s) => s.id === id));
    setSections(
      next,
      true,
      edge === "top" ? `Moved "${name}" to top` : `Moved "${name}" to bottom`
    );
  }

  function duplicateSection(id: string) {
    const index = sorted.findIndex((s) => s.id === id);
    if (index < 0) return;
    const section = sorted[index]!;
    const clone: TapCardSection = {
      ...structuredClone(section),
      id: nanoid(8),
      locked: false,
      label: `${section.label || section.type} copy`,
    };
    const next = [...sorted];
    next.splice(index + 1, 0, clone);
    setSections(next, true, `Duplicated ${sectionDisplayName(section)}`);
    setSelectedId(clone.id);
  }

  function copySection(id: string) {
    const section = sorted.find((s) => s.id === id);
    if (!section) return;
    try {
      void navigator.clipboard?.writeText(
        JSON.stringify({ tapCardSection: section }, null, 2)
      );
      setMessage(`Copied “${sectionDisplayName(section)}”`);
    } catch {
      setMessage("Clipboard unavailable — use Duplicate instead.");
    }
  }

  function performSectionDelete(section: TapCardSection) {
    setSections(
      sorted.filter((s) => s.id !== section.id),
      true,
      `Deleted ${sectionDisplayName(section)}`
    );
    if (selectedId === section.id) setSelectedId(null);
    setPendingSectionDelete(null);
  }

  function deleteSection(id: string) {
    const section = sorted.find((s) => s.id === id);
    if (!section) return;
    if (section.locked) {
      setMessage("This Section is locked. Unlock it before deleting it.");
      return;
    }
    if ((section.composition?.nodes.length ?? 0) > 0) {
      setPendingSectionDelete(section);
      return;
    }
    performSectionDelete(section);
  }

  function toggleSectionVisible(id: string) {
    const section = sorted.find((s) => s.id === id);
    if (!section) return;
    const nextEnabled = !section.enabled;
    patchSection(
      id,
      { enabled: nextEnabled },
      nextEnabled
        ? `Showed ${sectionDisplayName(section)}`
        : `Hid ${sectionDisplayName(section)}`
    );
  }

  function toggleSectionLocked(id: string) {
    const section = sorted.find((s) => s.id === id);
    if (!section) return;
    const nextLocked = !section.locked;
    patchSection(
      id,
      { locked: nextLocked },
      nextLocked
        ? `Locked ${sectionDisplayName(section)}`
        : `Unlocked ${sectionDisplayName(section)}`
    );
  }

  function addSection(type: Exclude<TapCardSectionType, "action_row"> | CardBlockKind) {
    const block = createCardBlock(type as CardBlockKind, {
      order: sorted.length,
      businessName,
      logoUrl,
      defaultFinish: config.defaultFinish,
      defaultShape: config.defaultShape,
      pillColor: config.pillColor,
      pillTextColor: config.pillTextColor,
      neonColor: config.neonColor,
    });
    setSections([...sorted, block]);
    setSelectedId(block.id);
    onRequestTool?.("content");
  }

  function addComposerSurface(kind: CardSurfaceKind) {
    const surface = createCardSurface(kind, sorted.length);
    setSections([...sorted, surface], true, `Added ${surface.label}`);
    setSelectedId(surface.id);
    setSelectedCompositionNodeIds([]);
    onRequestTool?.("content");
  }

  function addComposerElement(kind: CardElementKind, targetSectionId?: string, initialProps?: Record<string, unknown>) {
    const target = sorted.find((section) => section.id === targetSectionId && section.type === "surface")
      ?? sorted.find((section) => section.id === selectedId && section.type === "surface");
    if (!target) {
      let nextConfig = addElementToCardRoot(config, kind);
      const root = ensureRootComposition(nextConfig);
      const addedId = root.nodes.at(-1)?.id;
      if (addedId && initialProps) {
        nextConfig = {
          ...nextConfig,
          rootComposition: {
            ...root,
            nodes: root.nodes.map((node) => node.id === addedId ? { ...node, props: { ...node.props, ...initialProps } } : node),
          },
        };
      }
      if (kind === "map" && addedId) {
        const location = locations.find((item) => item.isDefault) || locations[0];
        if (location) {
          const activeRoot = ensureRootComposition(nextConfig);
          nextConfig = {
            ...nextConfig,
            rootComposition: {
              ...activeRoot,
              nodes: activeRoot.nodes.map((node) => node.id === addedId ? {
                ...node,
                props: { ...node.props, locationId: location.id, locationName: location.name, address: location.address || "", mapUrl: location.mapUrl || "" },
              } : node),
            },
          };
        }
      }
      setConfigHistory(nextConfig, { label: `Added ${kind} to Card root` });
      setDirty(true);
      setSelectedId(null);
      if (addedId) setSelectedCompositionNodeIds([addedId]);
      setMessage(`Added ${kind} directly to the Card root. No Section was created.`);
      return;
    }
    let next = addElementToSurface(target, kind);
    if (initialProps && next.composition) {
      const addedId = next.composition.nodes.at(-1)?.id;
      next = {
        ...next,
        composition: {
          ...next.composition,
          nodes: next.composition.nodes.map((node) => node.id === addedId ? { ...node, props: { ...node.props, ...initialProps } } : node),
        },
      };
    }
    if (kind === "map") {
      const location = locations.find((item) => item.isDefault) || locations[0];
      if (location && next.composition) {
        const addedId = next.composition.nodes.at(-1)?.id;
        next = { ...next, composition: { ...next.composition, nodes: next.composition.nodes.map((node) => node.id === addedId ? { ...node, props: { ...node.props, locationId: location.id, locationName: location.name, address: location.address || "", mapUrl: location.mapUrl || "" } } : node) } };
      }
    }
    setSections(sorted.map((section) => section.id === target.id ? next : section), true, `Added ${kind} to ${target.label}`);
    setSelectedId(target.id);
    setSelectedCompositionNodeIds([next.composition!.nodes.at(-1)!.id]);
  }

  function moveComposerElement(elementId: string, targetSectionId: string | null) {
    const sourceSection = sorted.find((section) => section.composition?.nodes.some((node) => node.id === elementId));
    const sourceId = sourceSection?.id ?? (config.rootComposition?.nodes.some((node) => node.id === elementId) ? null : undefined);
    if (sourceId === undefined || sourceId === targetSectionId) return;
    const next = moveCardElements(config, [elementId], sourceId, targetSectionId);
    if (next === config) return;
    setConfigHistory(next, { label: targetSectionId ? "Moved Element into Section" : "Moved Element to Card root" });
    setDirty(true);
    setSelectedId(targetSectionId);
    setSelectedCompositionNodeIds([elementId]);
  }

  function addAction() {
    addActionOfKind(addKind);
  }

  function addActionOfKind(kind: TapCardActionKind) {
    addSection(`action:${kind}` as CardBlockKind);
  }

  function startCardFrom(kind: "blank" | "brand" | "template" | "clone") {
    if (kind === "blank") {
      setConfigHistory({ ...config, sections: [], rootComposition: undefined }, { label: "Started a blank Card" });
      setDirty(true);
      setSelectedId(null);
      setMessage("Your Card is ready to build.");
      return;
    }
    if (kind === "clone") {
      const cloned = initialConfig.sections.map((section, order) => ({
        ...structuredClone(section),
        id: nanoid(8),
        order,
        locked: false,
      }));
      setSections(cloned, true, "Cloned existing Card");
      setSelectedId(cloned[0]?.id ?? null);
      setMessage("Cloned into this draft. The published Card is unchanged until Publish.");
      return;
    }
    const kinds: CardBlockKind[] = kind === "brand"
      ? ["logo_block", "identity", "action:call", "action:website"]
      : ["identity", "text", "image", "action:call", "action:website"];
    const next = kinds.map((blockKind, order) => {
      const block = createCardBlock(blockKind, {
        order,
        businessName,
        logoUrl,
        defaultFinish: config.defaultFinish,
        defaultShape: config.defaultShape,
        pillColor: config.pillColor,
        pillTextColor: config.pillTextColor,
        neonColor: config.neonColor,
      });
      if (kind === "brand" && (block.type === "logo_block" || block.type === "identity")) {
        block.sourceMode = "BRAND";
        block.brandResourceId = block.type === "logo_block" ? "brand-primary-logo" : "brand-business-identity";
        block.brandResourceName = block.type === "logo_block" ? "Primary logo" : "Business identity";
      }
      return block;
    });
    setSections(next, true, kind === "brand" ? "Started with Brand defaults" : "Started from Card template");
    setSelectedId(next[0]?.id ?? null);
    setMessage(kind === "brand" ? "Brand defaults added. Every block can still be made custom." : "Starter template added to this draft.");
  }

  async function refreshVersions() {
    if (!brandKitId) return;
    try {
      const res = await fetch("/api/card/publication");
      if (res.ok) {
        const data = (await res.json()) as {
          currentPublicationId?: string | null;
          revisions?: typeof versions;
        };
        setVersions(data.revisions ?? []);
        setCurrentPublicationId(data.currentPublicationId ?? null);
      }
    } catch {
      // non-blocking
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      void refreshVersions();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per brand kit
  }, [brandKitId]);

  async function rollbackToVersion(publicationId: string) {
    if (!brandKitId) return;
    setSaving(true);
    setMessage(null);
    setSaveFailed(false);
    const res = await fetch("/api/card/publication", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "rollback",
        publicationId,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage(data.error ?? "Rollback failed");
      setSaveFailed(true);
      return;
    }
    const data = (await res.json()) as { publication?: { version?: number } };
    setMessage(`Published Card rolled back to revision ${data.publication?.version ?? "?"}. Your saved draft was not changed.`);
    await refreshVersions();
    router.refresh();
  }

  async function publishSavedDraft() {
    if (dirty) {
      setMessage("Save this draft before publishing.");
      return;
    }
    if (typeof draftRevision !== "number" || draftRevision < 1) {
      setMessage("Save a valid draft before publishing.");
      return;
    }
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/card/publication", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "publish", expectedDraftRevision: draftRevision }),
    });
    setSaving(false);
    const data = (await res.json().catch(() => ({}))) as {
      error?: string;
      publication?: { version?: number };
    };
    if (!res.ok) {
      setMessage(data.error ?? "Publish failed.");
      return;
    }
    setMessage(`Published revision ${data.publication?.version ?? "?"}.`);
    await refreshVersions();
    router.refresh();
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    setSaveFailed(false);
    const res = await fetch("/api/card/draft", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draft: config, expectedRevision: draftRevision }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage(data.error || "Save failed");
      setSaveFailed(true);
      return;
    }
    const data = (await res.json()) as { revision?: number };
    if (typeof data.revision === "number") setDraftRevision(data.revision);
    setDirty(false);
    setMessage("Saved draft · Draft changes not published");
    router.refresh();
  }

  async function publishDemo(publish: boolean) {
    setMessage(null);
    const res = await fetch("/api/admin/landing-demo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publish, tapCard: config }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(data.error ?? "Demo publish failed");
      return;
    }
    setDemoPublished(publish);
    setMessage(publish ? "Published to landing page demo" : "Unpublished from landing demo");
    router.refresh();
  }

  function retireToggle() {
    const retired = config.lifecycleStatus === "retired";
    setConfigHistory(
      (c) => ({
        ...c,
        lifecycleStatus: retired ? "active" : "retired",
        retiredAt: retired ? undefined : new Date().toISOString(),
      }),
      { label: retired ? "Restored Card lifecycle" : "Retired Card" }
    );
    setDirty(true);
    setMessage(
      retired
        ? "Marked active — Save to restore the Tap Card"
        : "Marked retired — Save to retire (where-used still lists assignments)"
    );
  }

  // Adaptive shell: focus is owned by Command Shade when hosted.
  const effectiveFocus = shellHosted
    ? Boolean(shellFocusMode)
    : focusMode;

  useEffect(() => {
    if (!shellHosted || !onShellApi) return;
    onShellApi({
      save,
      publish: publishSavedDraft,
      undo: undoEditor,
      redo: redoEditor,
      setFocusMode: (next) => {
        if (shellHosted) return; // shell owns focus
        if (next === focusMode) return;
        toggleFocusMode();
      },
      retireToggle,
      selectSection: (id) => {
        setSelectedId(id);
        setSelectedCompositionNodeIds([]);
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- API bridge refresh on undo capability
  }, [shellHosted, onShellApi, canUndoEditor, canRedoEditor, focusMode, config, dirty, saving, draftRevision, currentPublicationId, versions]);

  useEffect(() => {
    if (!shellHosted || !onShellStatus) return;
    onShellStatus({
      dirty,
      saving,
      focusMode: effectiveFocus,
      canUndo: canUndoEditor,
      canRedo: canRedoEditor,
      message,
      lifecycleStatus: config.lifecycleStatus || "active",
      brandSource: brandState.useBrandKit ? "Brand Kit" : "Custom Card",
      selectedId,
      sectionCount: sorted.length,
      cardName: businessName || "Card",
      pastLabels,
      futureLabels,
      canPublish: !dirty && !saving && draftRevision >= 1,
      publicationLabel: currentPublicationId ? `Published revision ${versions.find((version) => version.current)?.version ?? ""}` : "Not published",
    });
  }, [
    shellHosted,
    onShellStatus,
    dirty,
    saving,
    effectiveFocus,
    canUndoEditor,
    canRedoEditor,
    message,
    config.lifecycleStatus,
    brandState.useBrandKit,
    selectedId,
    sorted.length,
    businessName,
    pastLabels,
    futureLabels,
    draftRevision,
    currentPublicationId,
    versions,
  ]);

  const outlineHashRef = useRef("");
  useEffect(() => {
    if (!shellHosted || !onShellOutline) return;
    const ordered = sectionsHistory.slice().sort((a, b) => a.order - b.order);
    const hash = `${selectedId ?? ""}::${dragId ?? ""}::${dragOverId ?? ""}::${ordered
      .map(
        (s) =>
          `${s.id}:${s.label || s.type}:${s.enabled !== false ? "visible" : "hidden"}:${s.locked ? "locked" : "unlocked"}`
      )
      .join("|")}`;
    if (outlineHashRef.current === hash) return;
    outlineHashRef.current = hash;
    onShellOutline(
      <div
        className="space-y-3"
        data-testid="card-shell-outline-segments"
        data-segments={hash}
      >
        <p className="px-1 text-[10px] font-semibold uppercase tracking-wide text-white/55">
          Document structure
        </p>
        <p className="px-1 text-[11px] leading-relaxed text-white/45">
          Drag the visible grip, or use Alt/⌘ + arrow. Every row also includes
          visibility, lock, and more actions.
        </p>
        {(
          [
            ["Blocks", ordered.filter((section) => section.type !== "action")],
            ["Action buttons", ordered.filter((section) => section.type === "action")],
          ] as const
        ).map(([label, items]) => (
          <div key={label} className="space-y-1.5">
            <p className="px-1 text-[10px] font-medium uppercase tracking-[0.12em] text-white/40">
              {label}
            </p>
            <ul className="space-y-1.5" data-testid={`card-shell-${label === "Blocks" ? "blocks" : "actions"}`}>
              {items.map((section) => {
                const index = ordered.findIndex((item) => item.id === section.id);
                return (
                  <CardOutlineRow
                    key={section.id}
                    section={section}
                    index={index}
                    total={ordered.length}
                    selected={selectedId === section.id}
                    dragging={dragId === section.id}
                    dropTarget={Boolean(dragId && dragOverId === section.id && dragId !== section.id)}
                    onSelect={() => {
                      setSelectedId(section.id);
                      onRequestTool?.("content");
                    }}
                    onDragStart={() => setDragId(section.id)}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setDragOverId(section.id);
                    }}
                    onDrop={() => {
                      if (dragId) reorder(dragId, section.id);
                      setDragId(null);
                      setDragOverId(null);
                    }}
                    onDragEnd={() => {
                      setDragId(null);
                      setDragOverId(null);
                    }}
                    onToggleVisible={() => toggleSectionVisible(section.id)}
                    onToggleLock={() => toggleSectionLocked(section.id)}
                    onMoveUp={() => moveSectionBy(section.id, -1)}
                    onMoveDown={() => moveSectionBy(section.id, 1)}
                    onMoveTop={() => moveSectionTo(section.id, "top")}
                    onMoveBottom={() => moveSectionTo(section.id, "bottom")}
                    onDuplicate={() => duplicateSection(section.id)}
                    onCopy={() => copySection(section.id)}
                    onDelete={() => deleteSection(section.id)}
                  />
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    );
  // The command callbacks intentionally close over the current document. The
  // data hash above governs republishing this external outline React tree.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    shellHosted,
    onShellOutline,
    sectionsHistory,
    selectedId,
    onRequestTool,
    dragId,
    dragOverId,
  ]);

  useEffect(() => {
    if (!shellHosted) {
      publishCardEditorLive(null);
      return () => publishCardEditorLive(null);
    }
    publishCardEditorLive({
      config,
      selected,
      selectedObject,
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
      message,
      notify: setMessage,
      profile,
      reviewUrl,
      businessName,
      campaigns,
      campaignGroups,
      experiences,
      locations,
      pastLabels,
      futureLabels,
      canUndo: canUndoEditor,
      canRedo: canRedoEditor,
      onUndo: undoEditor,
      onRedo: redoEditor,
      onBrandStateChange: handleBrandStateChange,
      patchConfig,
      patchConfigColor,
      patchSection,
      onAddSection: (type) =>
        addSection(type as Exclude<TapCardSectionType, "action_row">),
      onAddAction: (kind) => {
        setAddKind(kind as TapCardActionKind);
        addActionOfKind(kind as TapCardActionKind);
      },
      onAddSurface: addComposerSurface,
      onAddElement: addComposerElement,
      moveElementsTo: (ids, fromSectionId, toSectionId) => {
        const next = moveCardElements(config, ids, fromSectionId, toSectionId);
        setConfigHistory(next, { label: toSectionId ? "Moved Elements into Section" : "Moved Elements to Card root" });
        setDirty(true);
        setSelectedId(toSectionId);
        setSelectedCompositionNodeIds(ids);
      },
      wrapElements: (ids, fromSectionId, kind) => {
        const wrapped = wrapCardElementsInSection(config, ids, fromSectionId, kind);
        setConfigHistory(wrapped.config, { label: "Wrapped Elements in Section" });
        setDirty(true);
        setSelectedId(wrapped.sectionId);
        setSelectedCompositionNodeIds(ids);
      },
      removeSectionKeepElements: (sectionId) => {
        const section = config.sections.find((candidate) => candidate.id === sectionId);
        const ids = section?.composition?.nodes.map((node) => node.id) ?? [];
        const next = removeSectionKeepElements(config, sectionId);
        setConfigHistory(next, { label: "Removed Section and kept Elements" });
        setDirty(true);
        setSelectedId(null);
        setSelectedCompositionNodeIds(ids);
      },
      onStartPoint: startCardFrom,
      setSelectedId: (id) => {
        setSelectedId(id);
        if (id !== selectedId) setSelectedCompositionNodeIds([]);
      },
      setShowFreeform,
      onRetireToggle: retireToggle,
      onPublishDemo: (p) => void publishDemo(p),
      onRollback: (id) => void rollbackToVersion(id),
      strInherited: (key) => strInherited(brandState, key as BrandFieldKey),
      onTestAction: (section) => {
        const kind = section.actionKind;
        if (kind === "support" || kind === "vcard") {
          setMessage(
            kind === "support"
              ? "Test Action: Ask a Question is visible in Preview, but no live message will be sent."
              : "Test Action: Save Contact opens a contact file on this device — it does not publish."
          );
          return;
        }
        const href = resolveActionHref(section, profile, reviewUrl) || section.href;
        if (!href) {
          setMessage("Test Action: no destination is set for this button.");
          return;
        }
        window.open(
          href,
          href.startsWith("http") ? "_blank" : "_self",
          "noopener,noreferrer"
        );
        setMessage("Test Action opened the destination safely (Edit mode does not activate Card taps).");
      },
      selectedCompositionNodeIds,
      setSelectedCompositionNodeIds,
      reorderSections: reorder,
      moveSectionBy,
      moveSectionTo,
      duplicateSection,
      copySection,
      deleteSection,
      toggleSectionVisible,
      toggleSectionLocked,
    });
    return () => publishCardEditorLive(null);
    // Publish after paint when Card model inputs change — avoid blank-deps notify storms.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- live model bridge
  }, [
    shellHosted,
    config,
    selected,
    sectionsHistory,
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
    message,
    pastLabels,
    futureLabels,
    canUndoEditor,
    canRedoEditor,
    selectedCompositionNodeIds,
  ]);

  return (
    <div
      className={cn(
        "builder-studio flex h-full min-h-0 flex-col overflow-hidden",
        escapeMode || shellHosted
          ? "h-full max-h-full"
          : workspaceMode
            ? "max-lg:min-h-[calc(100dvh-4rem)]"
            : "max-lg:h-auto max-lg:min-h-[100dvh] max-lg:overflow-y-auto"
      )}
      data-testid="tap-card-builder"
      data-workspace-mode={workspaceMode ? "true" : "false"}
      data-escape-mode={escapeMode ? "true" : "false"}
      data-shell-hosted={shellHosted ? "true" : "false"}
      data-focus-mode={effectiveFocus ? "true" : "false"}
      data-dirty={dirty ? "true" : "false"}
      data-active-tool={activeToolId ?? ""}
    >

      {pendingSectionDelete ? (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/65 p-4" role="presentation" data-testid="section-delete-confirmation">
          <section className="w-full max-w-sm rounded-xl border border-white/15 bg-[#0c1220] p-5 text-white shadow-2xl" role="alertdialog" aria-modal="true" aria-labelledby="section-delete-title" aria-describedby="section-delete-description">
            <h2 id="section-delete-title" className="text-base font-semibold">Delete {sectionDisplayName(pendingSectionDelete)} and its {pendingSectionDelete.composition?.nodes.length ?? 0} Elements?</h2>
            <p id="section-delete-description" className="mt-2 text-xs text-white/65">The Section and all nested Elements will be removed from this draft. You can Undo afterward.</p>
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setPendingSectionDelete(null)}>Cancel</Button>
              <Button type="button" variant="destructive" onClick={() => performSectionDelete(pendingSectionDelete)}>Delete Section</Button>
            </div>
          </section>
        </div>
      ) : null}

      {!shellHosted ? (
      <div className="builder-studio-toolbar z-30 flex shrink-0 flex-wrap items-center justify-between gap-3 px-4 py-2.5">
        <div>
          <h1 className="text-sm font-semibold">
            {workspaceMode ? "Card editor" : "Tap Connect Card builder"}
          </h1>
          <p className="text-xs text-muted-foreground">
            {workspaceMode
              ? "Large live preview · zoom Fit / 100% · Format for design · Done returns to assembly"
              : "Blocks scroll left · card & editor stay fixed · select a block to snap the preview"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {workspaceMode ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              data-testid="card-done-editing"
              onClick={() => router.push(doneHref)}
            >
              Done editing
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={undoEditor}
            disabled={!canUndoEditor}
            title="Undo (⌘Z / Ctrl+Z)"
            aria-label="Undo"
            data-testid="card-undo"
          >
            <Undo2 className="h-4 w-4" />
            <span className="ml-1 hidden sm:inline">
              {pastLabels[0] ? `Undo ${pastLabels[0]}` : "Undo"}
            </span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={redoEditor}
            disabled={!canRedoEditor}
            title="Redo (⌘⇧Z / Ctrl+Shift+Z)"
            aria-label="Redo"
            data-testid="card-redo"
          >
            <Redo2 className="h-4 w-4" />
            <span className="ml-1 hidden sm:inline">
              {futureLabels[0] ? `Redo ${futureLabels[0]}` : "Redo"}
            </span>
          </Button>
          {workspaceMode ? (
            <Button
              type="button"
              variant={focusMode ? "default" : "outline"}
              size="sm"
              data-testid="card-focus-mode"
              onClick={toggleFocusMode}
            >
              {focusMode ? "Exit focus" : "Focus"}
            </Button>
          ) : null}
          {escapeMode || workspaceMode ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                data-testid="card-toggle-outline"
                aria-pressed={!outlineCollapsed}
                onClick={() => setOutlineCollapsed((v) => !v)}
              >
                {outlineCollapsed ? "Show outline" : "Hide outline"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                data-testid="card-toggle-inspector"
                aria-pressed={!inspectorCollapsed}
                onClick={() => setInspectorCollapsed((v) => !v)}
              >
                {inspectorCollapsed ? "Show inspector" : "Hide inspector"}
              </Button>
            </>
          ) : null}
          {dirty ? (
            <span className="text-[10px] text-amber-200/90" data-testid="card-dirty-indicator">
              Unsaved changes
            </span>
          ) : null}
          {freeformEnabled ? (
            <Button
              type="button"
              variant={showFreeform ? "default" : "outline"}
              size="sm"
              data-testid="card-freeform-toggle"
              onClick={() => setShowFreeform((v) => !v)}
            >
              {showFreeform ? "Hide freeform" : "Freeform"}
            </Button>
          ) : (
            <span
              className="hidden text-[10px] text-white/35 sm:inline"
              data-testid="freeform-honest-disabled"
              title="Freeform canvas is not enabled for this workspace"
            >
              Freeform off
            </span>
          )}
          <FormatWorkspaceTrigger
            active={formatOpen}
            onClick={() => setFormatOpen((v) => !v)}
          />
          {isAdmin ? (
            <Button
              type="button"
              variant={demoPublished ? "outline" : "default"}
              size="sm"
              onClick={() => void publishDemo(!demoPublished)}
            >
              {demoPublished ? "Unpublish landing demo" : "Publish landing demo"}
            </Button>
          ) : null}
          <Button size="sm" onClick={() => void save()} disabled={saving} data-testid="card-save">
            <Save className="mr-1 h-4 w-4" />
            {saving ? "Saving…" : "Save draft"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={saving}
            data-testid="card-retire-toggle"
            onClick={() => {
              const retired = config.lifecycleStatus === "retired";
              setConfigHistory(
                (c) => ({
                  ...c,
                  lifecycleStatus: retired ? "active" : "retired",
                  retiredAt: retired ? undefined : new Date().toISOString(),
                }),
                { label: retired ? "Restored Card lifecycle" : "Retired Card" }
              );
              setDirty(true);
              setMessage(
                retired
                  ? "Marked active — Save to restore the Tap Card"
                  : "Marked retired — Save to retire (where-used still lists assignments)"
              );
            }}
          >
            {config.lifecycleStatus === "retired" ? "Restore card" : "Retire card"}
          </Button>
          {saveFailed ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              data-testid="card-save-retry"
              onClick={() => void save()}
              disabled={saving}
            >
              Retry
            </Button>
          ) : null}
        </div>
      </div>
      ) : null}

      {shellHosted && interactionMode === "edit" ? (
        <div
          className="shrink-0 border-b border-white/10 px-4 py-2"
          data-testid="card-relationship-status"
        >
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/60">
            <span className="font-semibold text-white/90">{businessName || "Card"}</span>
            <span
              className={cn(
                "rounded px-1.5 py-0.5",
                config.lifecycleStatus === "retired"
                  ? "bg-amber-500/15 text-amber-200"
                  : "bg-primary/15 text-primary"
              )}
              data-testid="card-status-public"
            >
              {config.lifecycleStatus === "retired" ? "Retired" : "Active"}
            </span>
            <span data-testid="card-status-tappoints">
              {tapPointCount} Tap Point{tapPointCount === 1 ? "" : "s"}
            </span>
            <span data-testid="card-status-spotlight">
              {activeSpotlightTitle
                ? `Spotlight · ${activeSpotlightTitle}`
                : "No Campaign Spotlight"}
            </span>
            <span data-testid="card-status-tapsave">
              {config.utilityLayer?.enabled === false ? "TapSave off" : "TapSave on"}
            </span>
            <span data-testid="card-status-brand">
              {brandState.useBrandKit ? "Brand Kit" : "Custom"}
            </span>
            {dirty ? (
              <span className="text-amber-200" data-testid="card-status-next">
                Unsaved changes
              </span>
            ) : (
              <span data-testid="card-status-next">
                {versions.some(
                  (version) => version.current && version.sourceDraftRevision === draftRevision,
                )
                  ? "Saved draft · Published"
                  : "Saved draft · Draft changes not published"}
              </span>
            )}
            <span data-testid="card-publication-state">
              {currentPublicationId
                ? `Published revision ${versions.find((version) => version.current)?.version ?? ""}`
                : "Not published"}
            </span>
            <Button
              type="button"
              size="sm"
              className="h-7 px-2 text-[10px]"
              disabled={
                saving || dirty || typeof draftRevision !== "number" || draftRevision < 1
              }
              data-testid="card-publish"
              onClick={() => void publishSavedDraft()}
            >
              <Upload className="mr-1 h-3 w-3" />
              Publish
            </Button>
            {publicCode ? (
              <a
                href={`/t/${publicCode}?public=1`}
                className="text-primary hover:underline"
              >
                Open public Card
              </a>
            ) : null}
          </div>
        </div>
      ) : null}

      {showFreeform && freeformEnabled ? (
        <div className="z-20 shrink-0 border-b border-border/60 bg-background px-4 py-3">
          <FreeformCanvasPanel
            enabled={freeformEnabled}
            sectionLabels={sorted.map((s) => ({
              id: s.id,
              label: s.label || s.type,
            }))}
            onConvertToStructured={(orderedIds) => {
              const byId = new Map(sorted.map((s) => [s.id, s]));
              const next = orderedIds
                .map((id) => byId.get(id))
                .filter((s): s is TapCardSection => Boolean(s));
              const leftovers = sorted.filter((s) => !orderedIds.includes(s.id));
              setSections([...next, ...leftovers]);
              setShowFreeform(false);
              setMessage("Converted freeform order into structured stack");
            }}
          />
        </div>
      ) : null}

      {/* Design menus — collapsible to free preview height */}
      {!shellHosted ? (
      <div className="z-20 shrink-0 border-b border-border/60 bg-background">
        <div className="flex items-center justify-between gap-2 px-4 py-2">
          <BrandInheritanceBar
            state={brandState}
            onChange={handleBrandStateChange}
            saved={!dirty}
            compact
            className="min-w-0 flex-1 border-primary/20"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0 text-xs"
            data-testid="card-design-chrome-toggle"
            aria-expanded={!designChromeCollapsed}
            onClick={() => setDesignChromeCollapsed((v) => !v)}
          >
            {designChromeCollapsed ? "Show design" : "Hide design"}
          </Button>
        </div>
        {!designChromeCollapsed ? (
        <div className="max-h-[22vh] space-y-3 overflow-y-auto px-4 pb-3">
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1">
            <Label className="text-[10px] font-semibold uppercase tracking-wide text-primary">
              Layout
            </Label>
            <div className="flex gap-1 rounded-lg border border-border/60 p-1">
              {TAP_CARD_LAYOUT_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium",
                    config.actionsLayout === opt.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  )}
                  onClick={() => patchConfig({ actionsLayout: opt.id })}
                >
                  {opt.id === "stack" ? (
                    <Rows3 className="h-3.5 w-3.5" />
                  ) : opt.id === "grid_2" ? (
                    <Columns2 className="h-3.5 w-3.5" />
                  ) : (
                    <Rows3 className="h-3.5 w-3.5 rotate-90" />
                  )}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] font-semibold uppercase tracking-wide">
              Button shape
            </Label>
            <select
              aria-label="Button shape"
              className="flex h-9 min-w-[11rem] rounded-lg border border-input bg-background px-2 text-xs"
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
          <FinishPicker
            label="Card shell"
            value={config.cardFinish}
            allowNone={false}
            onChange={(cardFinish) => {
              if (cardFinish) patchConfig({ cardFinish });
            }}
          />

          <label className="flex items-center gap-2 pb-1 text-xs font-medium">
            <input
              type="checkbox"
              checked={Boolean(config.view3d)}
              onChange={(e) => patchConfig({ view3d: e.target.checked })}
            />
            3-D raised buttons
          </label>
        </div>

        <div className="flex flex-wrap items-end gap-3">
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
                value={
                  (config[key] as string | undefined) ||
                  (key === "pillColor"
                    ? "#0c0a07"
                    : key === "pillTextColor"
                      ? "#f5e6a8"
                      : key === "accentColor" || key === "neonColor"
                        ? strInherited(brandState, "accentColor") ||
                          strInherited(brandState, "primaryColor") ||
                          config.accentColor
                        : key === "surfaceColor"
                          ? strInherited(brandState, "backgroundColor") ||
                            config.surfaceColor ||
                            config.accentColor
                          : key === "textColor"
                            ? strInherited(brandState, "textColor") ||
                              config.textColor ||
                              config.accentColor
                            : config.accentColor)
                }
                onChange={(e) => patchConfigColor(key, e.target.value)}
              />
            </div>
          ))}
          <div className="space-y-1">
            <Label className="text-[10px]">Card background</Label>
            <select
              aria-label="Card background fill"
              className="flex h-9 min-w-[8rem] rounded-lg border border-input bg-background px-2 text-xs"
              value={config.surfaceFill || "solid"}
              onChange={(e) =>
                patchConfig({ surfaceFill: e.target.value as TapCardSurfaceFill })
              }
            >
              <option value="solid">Solid</option>
              <option value="gradient">Gradient</option>
            </select>
          </div>
          {config.surfaceFill === "gradient" ? (
            <>
              <div className="space-y-1">
                <Label className="text-[10px]">Gradient start</Label>
                <Input
                  type="color"
                  aria-label="Gradient start color"
                  className="h-9 w-14 cursor-pointer p-1"
                  value={config.surfaceGradientStart || config.surfaceColor}
                  onChange={(e) => patchConfig({ surfaceGradientStart: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Gradient end</Label>
                <Input
                  type="color"
                  aria-label="Gradient end color"
                  className="h-9 w-14 cursor-pointer p-1"
                  value={config.surfaceGradientEnd || config.accentColor}
                  onChange={(e) => patchConfig({ surfaceGradientEnd: e.target.value })}
                />
              </div>
              <div className="min-w-[140px] flex-1 space-y-1">
                <Label className="text-[10px]">
                  Direction {config.surfaceGradientAngle ?? 160}°
                </Label>
                <input
                  type="range"
                  min={0}
                  max={360}
                  aria-label="Surface gradient direction"
                  value={config.surfaceGradientAngle ?? 160}
                  onChange={(e) =>
                    patchConfig({ surfaceGradientAngle: Number(e.target.value) })
                  }
                  className="w-full"
                />
              </div>
            </>
          ) : null}
          <div className="min-w-[140px] flex-1 space-y-1">
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
          <label className="flex items-center gap-2 pb-1 text-xs">
            <input
              type="checkbox"
              checked={config.collapsible}
              onChange={(e) => patchConfig({ collapsible: e.target.checked })}
            />
            Collapsible
          </label>
          <label className="flex items-center gap-2 pb-1 text-xs">
            <input
              type="checkbox"
              checked={Boolean(config.compactActionsOnly)}
              onChange={(e) => patchConfig({ compactActionsOnly: e.target.checked })}
            />
            Buttons only
          </label>
          <label className="flex items-center gap-2 pb-1 text-xs">
            <input
              type="checkbox"
              checked={config.showHeaderLogo === true}
              onChange={(e) => patchConfig({ showHeaderLogo: e.target.checked })}
            />
            Logo above card
          </label>
          {config.showHeaderLogo === true ? (
            <div className="flex w-full flex-wrap items-end gap-3">
              <div className="min-w-[200px] flex-1">
                <MediaPicker
                  label="Header logo"
                  value={
                    config.headerLogoUrl ||
                    (brandState.useBrandKit
                      ? strInherited(brandState, "logoUrl")
                      : undefined) ||
                    logoUrl ||
                    ""
                  }
                  onChange={(url) => {
                    patchConfig({
                      headerLogoUrl: url,
                      ...(url ? {} : { showHeaderLogo: false }),
                    });
                    setBrandState((s) => overrideField(s, "logoUrl", url || null));
                  }}
                  mediaUploadReady={mediaUploadReady}
                  stockReady={stockReady}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="mt-1 h-7 px-2 text-xs"
                  onClick={() =>
                    patchConfig({ headerLogoUrl: "", showHeaderLogo: false })
                  }
                >
                  Reset header logo
                </Button>
              </div>
              <div className="min-w-[140px] flex-1 space-y-1">
                <Label className="text-[10px]">
                  Logo size {config.headerLogoScale ?? 100}%
                </Label>
                <input
                  type="range"
                  min={40}
                  max={180}
                  aria-label="Header logo size"
                  value={config.headerLogoScale ?? 100}
                  onChange={(e) =>
                    patchConfig({ headerLogoScale: Number(e.target.value) })
                  }
                  className="w-full"
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>
        ) : null}
      </div>
      ) : null}

      {message && interactionMode === "edit" ? (
        <p className="shrink-0 border-b border-border/40 px-4 py-2 text-sm text-primary" role="status">
          {message}
        </p>
      ) : null}

      <div
        className={cn(
          "grid min-h-0 flex-1 grid-cols-1 max-lg:flex-none",
          shellHosted || focusMode || (outlineCollapsed && inspectorCollapsed)
            ? "lg:grid-cols-1"
            : outlineCollapsed
              ? formatOpen
                ? "lg:grid-cols-[minmax(0,1fr)_minmax(14rem,18rem)_minmax(16rem,22rem)]"
                : "lg:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)]"
              : inspectorCollapsed
                ? formatOpen
                  ? "lg:grid-cols-[minmax(12rem,16rem)_minmax(0,1fr)_minmax(16rem,22rem)]"
                  : "lg:grid-cols-[minmax(12rem,16rem)_minmax(0,1fr)]"
                : formatOpen
                  ? "lg:grid-cols-[minmax(12rem,16rem)_minmax(0,1fr)_minmax(14rem,18rem)_minmax(16rem,22rem)]"
                  : escapeMode || workspaceMode
                    ? "lg:grid-cols-[minmax(12rem,16rem)_minmax(0,1fr)_minmax(16rem,20rem)]"
                    : "lg:grid-cols-[300px_minmax(0,1fr)_320px]"
        )}
        data-testid="card-builder-panes"
        data-shell-canvas={shellHosted ? "true" : "false"}
      >
        {/* Left — blocks / add (independent scroll) */}
        <aside
          className={cn(
            "builder-studio-rail min-h-0 overflow-y-auto overscroll-contain border-r border-border/60 max-lg:max-h-[40vh] lg:h-auto",
            (shellHosted || focusMode || outlineCollapsed) && "hidden"
          )}
          data-testid="card-outline-rail"
        >
          <div className="space-y-3 p-4">
            <TextFormatControls
              title="Title typography"
              value={config.titleFormat}
              onChange={(titleFormat) => patchConfig({ titleFormat })}
            />
            <TextFormatControls
              title="Body typography"
              value={config.bodyFormat}
              onChange={(bodyFormat) => patchConfig({ bodyFormat })}
            />

            <div className="rounded-lg border border-border/50 bg-muted/10 p-3" data-testid="card-utility-layer-editor">
              <p className="text-xs font-semibold">Persistent utilities</p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Stay visible on public Tap Points even when a Campaign is active.
              </p>
              <label className="mt-2 flex items-center gap-2 text-xs">
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
              <div className="mt-2 space-y-1">
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
              <Label className="mt-2 text-[10px]">Presentation</Label>
              <select
                className="mt-1 flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                aria-label="Utility layer presentation"
                data-testid="utility-presentation"
                value={config.utilityLayer?.presentation ?? "compact_row"}
                onChange={(e) =>
                  patchConfig({
                    utilityLayer: {
                      enabled: config.utilityLayer?.enabled !== false,
                      presentation: e.target.value as
                        | "sticky_bar"
                        | "bottom_sheet"
                        | "compact_row"
                        | "action_deck",
                      utilities: config.utilityLayer?.utilities,
                    },
                  })
                }
              >
                <option value="compact_row">Compact action row</option>
                <option value="sticky_bar">Sticky action bar</option>
                <option value="bottom_sheet">Bottom utility sheet</option>
                <option value="action_deck">Contextual action deck</option>
              </select>
            </div>

            <div className="rounded-lg border border-border/50 bg-muted/10 p-3">
              <QrPanel
                title="Tap Card · Device / QR"
                campaignTitle={businessName}
                filenamePrefix="tap-card"
                devices={devices}
                deviceCode={devices[0]?.deviceCode}
                allowCustomUrl
              />
            </div>

            <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3 space-y-2">
              <Label className="text-xs font-semibold">Add block</Label>
              <div className="grid grid-cols-2 gap-1.5">
                <Button type="button" size="sm" variant="outline" onClick={() => addSection("special_offer")}>
                  Special
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => addSection("promo_header")}>
                  Deal banner
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => addSection("image")}>
                  <ImageIcon className="mr-1 h-3.5 w-3.5" />
                  Image
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => addSection("logo_block")}
                >
                  Logo
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => addSection("text")}>
                  <Type className="mr-1 h-3.5 w-3.5" />
                  Text
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  data-testid="add-creative-composition"
                  onClick={() => addSection("creative_composition")}
                >
                  Composition
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => addSection("spacer")}>
                  Spacer
                </Button>
              </div>
              <Label className="text-[10px] text-muted-foreground">Common actions + socials</Label>
              <Input
                value={actionSearch}
                onChange={(e) => setActionSearch(e.target.value)}
                placeholder="Search icons / actions…"
                className="h-8 text-xs"
                aria-label="Search icons and actions"
              />
              <select
                aria-label="Action kind to add"
                className="flex h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
                value={addKind}
                onChange={(e) => setAddKind(e.target.value as TapCardActionKind)}
              >
                {catalogFiltered.map((c) => (
                  <option key={c.kind} value={c.kind}>
                    {c.label}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-muted-foreground">
                Custom link: URL format https://… · Socials need profile URL in Brand Kit or paste
                below after adding.
              </p>
              <Button type="button" size="sm" className="w-full" onClick={addAction}>
                <Plus className="mr-1 h-4 w-4" />
                Add action
              </Button>
            </div>

            {brandKitId ? (
              <div
                className="rounded-lg border border-border/50 bg-muted/20 p-3"
                data-testid="card-versions"
              >
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Versions
                </p>
                {versions.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground">Publish a saved draft to create a revision.</p>
                ) : (
                  <ul className="max-h-28 space-y-1.5 overflow-y-auto">
                    {versions.slice(0, 6).map((v) => (
                      <li
                        key={v.id}
                        className="flex items-center justify-between gap-2 text-[11px]"
                        data-testid={`card-version-${v.version}`}
                      >
                        <span className="truncate text-muted-foreground">
                          Revision {v.version}{v.current ? " · Published" : ""} · {v.comparisonSummary?.summary ?? "Card revision"}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 shrink-0 px-2 text-[10px]"
                          data-testid={`card-rollback-${v.version}`}
                          disabled={saving || v.current || v.status === "ARCHIVED"}
                          onClick={() => void rollbackToVersion(v.id)}
                        >
                          Rollback
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}

            <p className="text-[11px] font-semibold uppercase text-muted-foreground">Segments</p>
            {sorted.map((section, index) => (
              <div
                key={section.id}
                data-testid={`card-segment-${section.id}`}
                draggable
                onDragStart={() => setDragId(section.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragId) reorder(dragId, section.id);
                  setDragId(null);
                }}
                onDragEnd={() => setDragId(null)}
                className={cn(
                  "rounded-lg border px-2 py-2 text-sm",
                  selectedId === section.id
                    ? "border-primary bg-primary/10"
                    : "border-border/50 hover:border-primary/40",
                  !section.enabled && "opacity-50",
                  dragId === section.id && "opacity-60"
                )}
              >
                <div className="flex items-center gap-1.5">
                  <GripVertical
                    className="h-3.5 w-3.5 cursor-grab text-muted-foreground active:cursor-grabbing"
                    aria-hidden
                  />
                  <button
                    type="button"
                    className="min-w-0 flex-1 truncate text-left font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    aria-pressed={selectedId === section.id}
                    aria-label={`Select segment ${section.label || section.type}`}
                    onClick={() => setSelectedId(section.id)}
                  >
                    {section.label || section.type}
                  </button>
                  {section.linkedCampaignId ? (
                    <span
                      className="inline-flex items-center text-primary"
                      title={section.linkedCampaignTitle || "Linked campaign"}
                    >
                      <Link2 className="h-3.5 w-3.5" aria-hidden />
                    </span>
                  ) : null}
                  <button
                    type="button"
                    className="min-h-8 min-w-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    aria-label={`Move ${section.label || section.type} up`}
                    data-testid={`card-segment-move-up-${section.id}`}
                    disabled={index === 0}
                    onClick={(e) => {
                      e.stopPropagation();
                      moveSectionBy(section.id, -1);
                    }}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="min-h-8 min-w-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    aria-label={`Move ${section.label || section.type} down`}
                    data-testid={`card-segment-move-down-${section.id}`}
                    disabled={index === sorted.length - 1}
                    onClick={(e) => {
                      e.stopPropagation();
                      moveSectionBy(section.id, 1);
                    }}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="min-h-8 min-w-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    aria-label={`Duplicate ${section.label || section.type}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      const clone = {
                        ...structuredClone(section),
                        id: nanoid(8),
                        label: `${section.label || section.type} copy`,
                      };
                      const next = [...sorted];
                      next.splice(index + 1, 0, clone);
                      setSections(next);
                      setSelectedId(clone.id);
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="min-h-8 min-w-8 text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    aria-label={`Delete ${section.label || section.type}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSections(sorted.filter((s) => s.id !== section.id));
                      if (selectedId === section.id) setSelectedId(null);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
                <p className="pl-5 text-[10px] text-muted-foreground">
                  {section.type}
                  {section.actionKind ? ` · ${section.actionKind}` : ""}
                  {section.linkedCampaignId
                    ? ` · → ${section.linkedCampaignTitle || "campaign"}`
                    : ""}
                </p>
              </div>
            ))}
          </div>
        </aside>

        {/* Center — phone preview scrolls independently; never collapses to zero */}
        <div
          ref={previewScrollRef}
          className={cn(
            "builder-studio-canvas min-w-0 overflow-y-auto overscroll-contain border-x border-border/40",
            shellHosted
              ? "min-h-0 flex-1 lg:h-auto"
              : "min-h-[min(55vh,420px)] lg:min-h-0 lg:h-auto"
          )}
          data-testid="card-preview-canvas"
        >
          {interactionMode === "edit" ? <div className={cn("sticky top-0 z-10 flex flex-wrap items-center justify-center gap-2 border-b border-border/40 bg-background/95 px-3 py-2 backdrop-blur", zoomToolbarCollapsed && "[&>*:not(:last-child)]:hidden")}>
            <span className="min-w-10 text-center text-[10px] font-semibold tabular-nums text-muted-foreground" data-testid="card-zoom-percent">
              {previewZoom === "fit" ? "Fit" : `${Math.round(previewZoom * 100)}%`}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className={cn(
                "h-7 text-xs",
                previewZoom === "fit" && "border-primary/50 bg-primary/10 text-primary"
              )}
              data-testid="card-zoom-fit"
              onClick={() => setPreviewZoom("fit")}
            >
              Fit Card
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className={cn(
                "h-7 text-xs",
                previewZoom === 1 && "border-primary/50 bg-primary/10 text-primary"
              )}
              data-testid="card-zoom-100"
              onClick={() => setPreviewZoom(1)}
            >
              100%
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              data-testid="card-zoom-out"
              aria-label="Zoom out"
              onClick={() =>
                setPreviewZoom((z) =>
                  z === "fit" ? 0.85 : Math.max(0.6, Math.round((Number(z) - 0.15) * 100) / 100)
                )
              }
            >
              −
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              data-testid="card-zoom-in"
              aria-label="Zoom in"
              onClick={() =>
                setPreviewZoom((z) =>
                  z === "fit" ? 1.15 : Math.min(1.6, Math.round((Number(z) + 0.15) * 100) / 100)
                )
              }
            >
              +
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              data-testid="card-zoom-fit-selection"
              disabled={!selectedId}
              onClick={() => {
                setPreviewZoom(1);
                document.getElementById(`tap-section-${selectedId}`)?.scrollIntoView({ block: "center" });
              }}
            >
              Fit selection
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className={cn("h-7 text-xs", previewPan && "border-primary/50 bg-primary/10 text-primary")}
              aria-pressed={previewPan}
              data-testid="card-pan-tool"
              onClick={() => setPreviewPan((active) => !active)}
            >
              Pan
            </Button>
            {!shellHosted ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className={cn(
                "h-7 text-xs",
                focusMode && "border-primary/50 bg-primary/10 text-primary"
              )}
              data-testid="card-preview-focus"
              onClick={() => toggleFocusMode()}
            >
              {focusMode ? "Full overview" : "Focus preview"}
            </Button>
            ) : (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              data-testid="card-preview-focus"
              onClick={() => onRequestTool?.("content")}
            >
              Edit selection
            </Button>
            )}
            <Button type="button" size="sm" variant="outline" className="h-7 text-xs" aria-expanded={!zoomToolbarCollapsed} data-testid="card-zoom-toolbar-toggle" onClick={() => setZoomToolbarCollapsed((collapsed) => !collapsed)}>
              {zoomToolbarCollapsed ? "View controls" : "Hide"}
            </Button>
          </div> : null}
          <div className={cn("flex justify-center p-4 pb-12", previewPan && "cursor-grab overflow-auto")}>
            <div
              className={cn(
                "builder-phone builder-phone-natural origin-top",
                previewZoom === "fit" ? "w-full max-w-[min(390px,100%)]" : "w-[390px]"
              )}
              style={
                previewZoom === "fit"
                  ? undefined
                  : { transform: `scale(${previewZoom})`, marginBottom: `${(Number(previewZoom) - 1) * 40}%` }
              }
              data-testid="card-preview-phone"
              data-zoom={previewZoom === "fit" ? "fit" : String(previewZoom)}
            >
              <div className="builder-phone-notch" />
              <div className="builder-phone-screen !bg-[#1a1a1a] p-3 pb-8">
                {cardEmptyReason && interactionMode === "edit" ? (
                  <div className="space-y-3" data-testid="blank-card-composer">
                    <BuilderPreviewEmpty reason={cardEmptyReason} variant="card" />
                    <div className="rounded-xl border border-dashed border-white/20 bg-white/5 p-4 text-center">
                      <p className="text-sm font-semibold text-white">Your Card is ready to build.</p>
                      <div className="mt-3 grid gap-2">
                        <Button type="button" size="sm" onClick={() => addComposerSurface("blank")}>Add a Section</Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => startCardFrom("template")}>Choose a template</Button>
                        <Button type="button" size="sm" variant="outline" onClick={() => startCardFrom("brand")}>Use Brand defaults</Button>
                      </div>
                    </div>
                  </div>
                ) : null}
                <TapConnectCard
                  config={{ ...config, sections: sectionsHistory }}
                  profile={profile}
                  businessName={businessName}
                  logoUrl={logoUrl}
                  reviewUrl={reviewUrl}
                  forceExpanded
                  builderChrome={interactionMode === "edit"}
                  interactionMode={interactionMode}
                  previewSafe={interactionMode === "preview"}
                  compositionForceMobile={compositionForceMobile}
                  previewMotion={previewMotion}
                  reducedMotionSimulation={reducedMotionSimulation}
                  motionRevision={motionRevision}
                  selectedSectionId={interactionMode === "edit" ? selectedId : null}
                  selectedCompositionNodeIds={
                    interactionMode === "edit" ? selectedCompositionNodeIds : []
                  }
                  onCompositionNodeSelect={
                    interactionMode === "edit"
                      ? (sectionId, ids) => {
                          setSelectedId(sectionId);
                          setSelectedCompositionNodeIds(ids);
                        }
                      : undefined
                  }
                  onCompositionChange={
                    interactionMode === "edit"
                      ? (sectionId, composition, label) => {
                          if (sectionId) patchSection(sectionId, { composition }, label || "Edited composition");
                          else patchConfig({ rootComposition: composition }, label || "Edited Card root Elements");
                        }
                      : undefined
                  }
                  onComposerDrop={
                    interactionMode === "edit"
                      ? (payload, sectionId) => {
                          if (payload.level === "section") addComposerSurface(payload.kind as CardSurfaceKind);
                          else addComposerElement(payload.kind as CardElementKind, sectionId);
                        }
                      : undefined
                  }
                  onSectionReorder={interactionMode === "edit" ? reorder : undefined}
                  onSectionResize={interactionMode === "edit" ? (sectionId, heightPx) => patchSection(sectionId, { surfaceMinHeightPx: heightPx, surfaceHeightMode: "fixed" }, "Resized Section height") : undefined}
                  onElementMove={interactionMode === "edit" ? moveComposerElement : undefined}
                  onElementWrap={interactionMode === "edit" ? (elementId, fromSectionId) => {
                    const wrapped = wrapCardElementsInSection(config, [elementId], fromSectionId, "blank");
                    setConfigHistory(wrapped.config, { label: "Wrapped Element in Section" });
                    setDirty(true);
                    setSelectedId(wrapped.sectionId);
                    setSelectedCompositionNodeIds([elementId]);
                  } : undefined}
                  onSectionSelect={
                    interactionMode === "edit"
                      ? (id) => {
                          setSelectedId(id);
                          if (id !== selectedId) setSelectedCompositionNodeIds([]);
                          if (id && onRequestTool) {
                            const section = sectionsHistory.find((s) => s.id === id);
                            if (section?.type === "action") onRequestTool("buttons");
                            else if (
                              section?.type === "text" ||
                              section?.type === "identity"
                            )
                              onRequestTool("typography");
                            else if (
                              section?.type === "hero" ||
                              section?.type === "logo_block" ||
                              section?.type === "image"
                            )
                              onRequestTool("media");
                            else if (section?.type === "special_offer")
                              onRequestTool("offer");
                            else if (section?.type === "creative_composition" || section?.type === "surface")
                              onRequestTool("composition");
                            else onRequestTool("content");
                          }
                        }
                      : undefined
                  }
                />
                {previewUtilityLayer.visible ? (
                  <CardUtilityLayer
                    layer={previewUtilityLayer}
                    businessId={brandKitId || "card-preview"}
                    businessName={businessName}
                    profile={profile}
                    previewMode
                    walletMode="preview"
                    accentColor={config.accentColor}
                    surfaceColor={config.surfaceColor}
                    textColor={config.textColor}
                    className="mt-3"
                  />
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {/* Right — editor always visible */}
        <aside
          className={cn(
            "builder-studio-inspector min-h-0 overflow-y-auto overscroll-contain border-l border-border/60 max-lg:max-h-[40vh] lg:h-auto",
            (shellHosted || focusMode || inspectorCollapsed) && "hidden"
          )}
          data-testid="card-inspector-rail"
        >
          <div ref={inspectorRef} className="p-4">
          <div className="mb-3">
            <KeywordsSuggestPanel surface="card" defaultChannel="instagram" />
          </div>
          <p className="mb-3 text-sm font-semibold">
            {selected ? `Edit: ${selected.label || selected.type}` : "Select a segment"}
          </p>
          {!selected ? (
            <p className="text-xs text-muted-foreground">
              Use the Design bar for Two columns, shapes, pill colors, neon glow, 3-D, and
              transparency. Add Image / Logo / Text blocks from the left. Top logos are opt-in:
              Design bar → <span className="text-foreground">Logo above card</span>, or select
              Hero → <span className="text-foreground">Show logo on hero</span>.
            </p>
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
              />

              {selected.type === "action" && (
                <>
                  <select
                    aria-label="Action type"
                    className="flex h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
                    value={selected.actionKind ?? "custom"}
                    onChange={(e) => {
                      const kind = e.target.value as TapCardActionKind;
                      const cat = TAP_CARD_ACTION_CATALOG.find((c) => c.kind === kind);
                      patchSection(selected.id, {
                        actionKind: kind,
                        icon: cat?.icon ?? kind,
                        label: selected.label || cat?.label,
                      });
                    }}
                  >
                    {TAP_CARD_ACTION_CATALOG.map((c) => (
                      <option key={c.kind} value={c.kind}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <Input
                    value={selected.href ?? ""}
                    onChange={(e) => patchSection(selected.id, { href: e.target.value })}
                    placeholder="https://… (URL format)"
                  />
                  <FinishPicker
                    allowNone={false}
                    value={selected.finish || selected.style || config.defaultFinish}
                    onChange={(finish) => {
                      if (!finish) return;
                      patchSection(selected.id, {
                        finish,
                        style: finish,
                      });
                    }}
                  />
                  <div className="space-y-1">
                    <Label className="text-xs">Shape</Label>
                    <select
                      aria-label="Action button shape"
                      className="flex h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
                      value={selected.shape || config.defaultShape}
                      onChange={(e) =>
                        patchSection(selected.id, {
                          shape: e.target.value as TapCardButtonShape,
                        })
                      }
                    >
                      {TAP_CARD_SHAPE_OPTIONS.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <IconPicker
                    icon={selected.icon || selected.actionKind || "FiLink"}
                    customUrl={selected.iconUrl}
                    color={selected.iconColor || "#f8fafc"}
                    onChange={({ icon, customUrl, color }) =>
                      patchSection(selected.id, {
                        icon: icon || selected.icon,
                        iconUrl: customUrl,
                        iconColor: color,
                      })
                    }
                    mediaUploadReady={mediaUploadReady}
                    stockReady={stockReady}
                    showLogoPicker
                  />
                  <ButtonLayoutControls
                    value={{
                      iconPosition: selected.iconPosition,
                      iconSize: selected.iconSize,
                      textSize: selected.textSize,
                      iconGap: selected.iconGap,
                      contentAlign: selected.contentAlign,
                      verticalAlign: selected.verticalAlign,
                      paddingX: selected.paddingX,
                      paddingY: selected.paddingY,
                      minHeight: selected.minHeight,
                      fullWidth: selected.fullWidth,
                      wrap: selected.wrap,
                    }}
                    onChange={(patch) => {
                      const next: Partial<typeof selected> = { ...patch };
                      if (patch.iconPosition === "only") next.appearance = "icon_only";
                      if (patch.iconPosition === "none") next.appearance = "text";
                      if (
                        patch.iconPosition &&
                        patch.iconPosition !== "only" &&
                        patch.iconPosition !== "none"
                      ) {
                        next.appearance = "icon_text";
                      }
                      patchSection(selected.id, next);
                    }}
                  />
                  <TextFormatControls
                    title="Button label — font & size"
                    value={selected.format}
                    onChange={(format) => patchSection(selected.id, { format })}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Pill fill</Label>
                      <Input
                        type="color"
                        aria-label="Pill fill color"
                        value={
                          selected.backgroundColor || config.pillColor || "#0c0a07"
                        }
                        onChange={(e) =>
                          patchSection(selected.id, { backgroundColor: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Pill text</Label>
                      <Input
                        type="color"
                        aria-label="Pill text color"
                        value={selected.textColor || config.pillTextColor || "#f5e6a8"}
                        onChange={(e) =>
                          patchSection(selected.id, { textColor: e.target.value })
                        }
                      />
                    </div>
                    {(selected.finish || config.defaultFinish) === "neon" ? (
                      <div className="col-span-2">
                        <Label className="text-xs">Neon glow color</Label>
                        <Input
                          type="color"
                          value={selected.neonColor || config.neonColor || config.accentColor}
                          onChange={(e) =>
                            patchSection(selected.id, { neonColor: e.target.value })
                          }
                        />
                      </div>
                    ) : null}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">
                      Transparency {selected.opacity ?? 100}%
                    </Label>
                    <input
                      type="range"
                      min={20}
                      max={100}
                      value={selected.opacity ?? 100}
                      onChange={(e) =>
                        patchSection(selected.id, { opacity: Number(e.target.value) })
                      }
                      className="w-full"
                    />
                  </div>
                </>
              )}

              {selected.type === "promo_header" && (
                <>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selected.pinTop !== false}
                      onChange={(e) =>
                        patchSection(selected.id, { pinTop: e.target.checked })
                      }
                    />
                    Pin to top of card (uncheck to place anywhere in the stack)
                  </label>
                  <Input
                    value={selected.text ?? ""}
                    onChange={(e) => patchSection(selected.id, { text: e.target.value })}
                    placeholder="Left text"
                  />
                  <Input
                    value={selected.textRight ?? ""}
                    onChange={(e) => patchSection(selected.id, { textRight: e.target.value })}
                    placeholder="Right text"
                  />
                  <Input
                    value={selected.href ?? ""}
                    onChange={(e) => patchSection(selected.id, { href: e.target.value })}
                    placeholder="Link URL or /t/DEVICECODE"
                  />
                  {devices.length > 0 ? (
                    <div className="space-y-1">
                      <Label className="text-xs">Quick link to device / camppage</Label>
                      <select
                        className="flex h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
                        value=""
                        onChange={(e) => {
                          if (!e.target.value) return;
                          patchSection(selected.id, { href: `/t/${e.target.value}` });
                        }}
                      >
                        <option value="">Select a tap device…</option>
                        {devices.map((d) => (
                          <option key={d.id} value={d.deviceCode}>
                            {d.nickname || d.deviceCode} → /t/{d.deviceCode}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                  <TextFormatControls
                    title="Promo — font & size"
                    value={selected.format}
                    onChange={(format) => patchSection(selected.id, { format })}
                  />
                </>
              )}

              {selected.type === "special_offer" && (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs">Format (not just a button)</Label>
                    <select
                      className="flex h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
                      value={selected.specialStyle || "banner"}
                      onChange={(e) =>
                        patchSection(selected.id, {
                          specialStyle: e.target.value as TapCardSpecialStyle,
                        })
                      }
                    >
                      <option value="banner">Banner strip</option>
                      <option value="ribbon">Ribbon</option>
                      <option value="tile">Tile</option>
                      <option value="card">Offer card</option>
                    </select>
                  </div>
                  <Input
                    value={selected.text ?? ""}
                    onChange={(e) => patchSection(selected.id, { text: e.target.value })}
                    placeholder="Kicker (e.g. Limited time)"
                  />
                  <ExpandedTextField
                    label="Headline"
                    value={selected.headline ?? ""}
                    onChange={(headline) => patchSection(selected.id, { headline })}
                    placeholder="Headline"
                    recommendedMax={80}
                    data-testid="special-headline"
                  />
                  <ExpandedTextField
                    label="Description"
                    value={selected.description ?? ""}
                    onChange={(description) =>
                      patchSection(selected.id, { description })
                    }
                    placeholder="Supporting line"
                    recommendedMax={200}
                    data-testid="special-description"
                  />
                  <TextFormatControls
                    title="Special — typography"
                    value={selected.format}
                    onChange={(format) => patchSection(selected.id, { format })}
                  />
                  <FinishPicker
                    label="Finish"
                    allowNone={false}
                    value={selected.finish || config.defaultFinish}
                    onChange={(finish) => {
                      if (!finish) return;
                      patchSection(selected.id, { finish });
                    }}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Fill</Label>
                      <Input
                        type="color"
                        value={selected.backgroundColor || "#1a1208"}
                        onChange={(e) =>
                          patchSection(selected.id, { backgroundColor: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Text</Label>
                      <Input
                        type="color"
                        value={selected.textColor || "#f5e6a8"}
                        onChange={(e) =>
                          patchSection(selected.id, { textColor: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">When tapped</Label>
                    <select
                      className="flex h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
                      value={selected.offerMode || "link"}
                      onChange={(e) => {
                        const mode = e.target.value as TapCardOfferMode;
                        if (mode !== "campaign") {
                          patchSection(selected.id, {
                            offerMode: mode,
                            ...(mode === "expand"
                              ? {
                                  linkedCampaignId: undefined,
                                  linkedCampaignTitle: undefined,
                                  linkedDeviceCode: undefined,
                                }
                              : {}),
                          });
                          return;
                        }
                        patchSection(selected.id, { offerMode: mode });
                      }}
                    >
                      <option value="link">Open a page / URL</option>
                      <option value="expand">Expand offer on this card</option>
                      <option value="campaign">Bind Campaign offer (Spotlight fuse)</option>
                    </select>
                  </div>

                  {selected.offerMode === "campaign" && (
                    <div className="space-y-2 rounded-xl border border-primary/40 bg-primary/5 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                          <Link2 className="size-4 shrink-0" aria-hidden />
                          {selected.linkedCampaignId ? "Linked campaign" : "Link a campaign"}
                        </div>
                        {selected.linkedCampaignId ? (
                          <span
                            className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-background px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary"
                            title="Linked to a campaign"
                          >
                            <Link2 className="size-3" aria-hidden />
                            Linked
                          </span>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Campaign owns the offer. Spotlight projects title, code, and terms — change
                        once on the Campaign, then refresh projection here.
                      </p>

                      {selected.linkedCampaignId ? (
                        <>
                          <div className="rounded-lg border border-border bg-background px-3 py-2">
                            <p className="text-sm font-medium">
                              {selected.linkedCampaignTitle || "Campaign"}
                            </p>
                            {(() => {
                              const linked = campaigns.find(
                                (c) => c.id === selected.linkedCampaignId
                              );
                              if (!linked?.features.length) return null;
                              return (
                                <div className="mt-1.5 flex flex-wrap gap-1">
                                  {linked.features.map((f) => (
                                    <span
                                      key={f}
                                      className="rounded-md border border-border bg-muted/50 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                                    >
                                      {f}
                                    </span>
                                  ))}
                                </div>
                              );
                            })()}
                            {selected.linkedDeviceCode || selected.href ? (
                              <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
                                {selected.href || `/t/${selected.linkedDeviceCode}`}
                              </p>
                            ) : (
                              <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
                                No device on this campaign yet — pick a tap URL below or assign one
                                in Campaign builder.
                              </p>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Link
                              href={`/dashboard/campaigns/${selected.linkedCampaignId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex h-7 items-center gap-1 rounded-lg border border-primary/20 bg-background/70 px-2.5 text-[0.8rem] font-medium hover:border-primary/45 hover:bg-primary/10 hover:text-primary"
                            >
                              <ExternalLink className="size-3.5" />
                              Open campaign
                            </Link>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => unlinkCampaignFromSection(selected.id)}
                            >
                              <Unlink className="size-3.5" />
                              Unlink
                            </Button>
                          </div>
                          {(() => {
                            const linked = campaigns.find(
                              (c) => c.id === selected.linkedCampaignId
                            );
                            const deviceChoices =
                              linked?.devices.length
                                ? linked.devices
                                : devices.map((d) => ({
                                    code: d.deviceCode,
                                    label: d.nickname || d.deviceCode,
                                  }));
                            if (!deviceChoices.length) return null;
                            return (
                              <div className="space-y-1">
                                <Label className="text-xs">Tap page that opens this campaign</Label>
                                <select
                                  aria-label="Tap page that opens this campaign"
                                  className="flex h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
                                  value={selected.linkedDeviceCode || ""}
                                  onChange={(e) => {
                                    const code = e.target.value;
                                    patchSection(selected.id, {
                                      linkedDeviceCode: code || undefined,
                                      href: code ? `/t/${code}?public=1` : selected.href,
                                    });
                                  }}
                                >
                                  <option value="">Select device…</option>
                                  {deviceChoices.map((d) => (
                                    <option key={d.code} value={d.code}>
                                      {d.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            );
                          })()}
                        </>
                      ) : (
                        <div className="space-y-2">
                          <select
                            aria-label="Choose a campaign to link"
                            className="flex h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
                            value=""
                            onChange={(e) => {
                              if (!e.target.value) return;
                              linkCampaignToSection(selected.id, e.target.value);
                            }}
                          >
                            <option value="">
                              {campaigns.length ? "Choose a campaign…" : "No campaigns yet"}
                            </option>
                            {campaigns.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.title}
                                {c.features.length
                                  ? ` — ${c.features.slice(0, 2).join(", ")}`
                                  : ""}
                              </option>
                            ))}
                          </select>
                          <Link
                            href="/dashboard/campaigns"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-7 items-center gap-1 rounded-lg border border-primary/20 bg-background/70 px-2.5 text-[0.8rem] font-medium hover:border-primary/45 hover:bg-primary/10 hover:text-primary"
                          >
                            <Plus className="size-3.5" />
                            Campaign builder
                          </Link>
                        </div>
                      )}
                    </div>
                  )}

                  {(selected.offerMode || "link") === "link" ? (
                    <>
                      <Input
                        value={selected.href ?? ""}
                        onChange={(e) => patchSection(selected.id, { href: e.target.value })}
                        placeholder="https://… or /t/DEVICECODE"
                      />
                      <Input
                        value={selected.offerCta ?? ""}
                        onChange={(e) =>
                          patchSection(selected.id, { offerCta: e.target.value })
                        }
                        placeholder="CTA label (e.g. Open offer)"
                      />
                      {devices.length > 0 ? (
                        <div className="space-y-1">
                          <Label className="text-xs">Or pick a tap device page</Label>
                          <select
                            className="flex h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
                            value=""
                            onChange={(e) => {
                              if (!e.target.value) return;
                              patchSection(selected.id, { href: `/t/${e.target.value}` });
                            }}
                          >
                            <option value="">Select device → /t/…</option>
                            {devices.map((d) => (
                              <option key={d.id} value={d.deviceCode}>
                                {d.nickname || d.deviceCode}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : null}
                    </>
                  ) : null}

                  {selected.offerMode === "campaign" ? (
                    <Input
                      value={selected.offerCta ?? ""}
                      onChange={(e) =>
                        patchSection(selected.id, { offerCta: e.target.value })
                      }
                      placeholder="CTA label (e.g. Claim deal)"
                    />
                  ) : null}

                  {selected.offerMode === "expand" ? (
                    <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
                      <p className="text-xs font-semibold text-primary">Build the offer</p>
                      <Input
                        value={selected.offerTitle ?? ""}
                        onChange={(e) =>
                          patchSection(selected.id, { offerTitle: e.target.value })
                        }
                        placeholder="Offer title"
                      />
                      <ExpandedTextField
                        label="Offer details"
                        value={selected.offerDescription ?? ""}
                        onChange={(offerDescription) =>
                          patchSection(selected.id, { offerDescription })
                        }
                        placeholder="Offer details"
                        recommendedMax={280}
                        data-testid="special-offer-description"
                      />
                      <Input
                        value={selected.offerCode ?? ""}
                        onChange={(e) =>
                          patchSection(selected.id, { offerCode: e.target.value })
                        }
                        placeholder="Coupon / code (optional)"
                      />
                      <Input
                        value={selected.offerExpires ?? ""}
                        onChange={(e) =>
                          patchSection(selected.id, { offerExpires: e.target.value })
                        }
                        placeholder="Expires (optional text)"
                      />
                      <Input
                        value={selected.offerCta ?? ""}
                        onChange={(e) =>
                          patchSection(selected.id, { offerCta: e.target.value })
                        }
                        placeholder="Claim button label"
                      />
                      <Input
                        value={selected.href ?? ""}
                        onChange={(e) => patchSection(selected.id, { href: e.target.value })}
                        placeholder="Claim link (optional) — campaign or page URL"
                      />
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={Boolean(selected.offerDefaultOpen)}
                          onChange={(e) =>
                            patchSection(selected.id, {
                              offerDefaultOpen: e.target.checked,
                            })
                          }
                        />
                        Start with offer open
                      </label>
                    </div>
                  ) : null}
                </>
              )}

              {selected.type === "identity" && (
                <>
                  {(
                    [
                      ["name", "Name", identityValue("name", selected.name)],
                      ["title", "Title", identityValue("title", selected.title)],
                      [
                        "organization",
                        "Organization",
                        identityValue("organization", selected.organization),
                      ],
                    ] as const
                  ).map(([key, placeholder, value]) => (
                    <div key={key} className="flex items-center gap-2">
                      <Input
                        value={value}
                        onChange={(e) =>
                          patchSection(selected.id, { [key]: e.target.value })
                        }
                        placeholder={placeholder}
                        className="min-w-0 flex-1"
                      />
                      <ColorSwatchPicker
                        title={`${placeholder} color`}
                        value={selected.lineColors?.[key]}
                        defaultColor={
                          key === "name"
                            ? selected.format?.color ||
                              strInherited(brandState, "textColor") ||
                              config.textColor ||
                              "#f8fafc"
                            : strInherited(brandState, "textColor") ||
                              config.textColor ||
                              "#f8fafc"
                        }
                        onChange={(color) =>
                          patchSection(selected.id, {
                            lineColors: {
                              ...selected.lineColors,
                              [key]: color,
                            },
                          })
                        }
                      />
                    </div>
                  ))}
                  <div className="flex items-start gap-2">
                    <ExpandedTextField
                      className="min-w-0 flex-1"
                      label="Headline"
                      value={selected.headline ?? ""}
                      onChange={(headline) =>
                        patchSection(selected.id, { headline })
                      }
                      placeholder="Headline"
                      recommendedMax={120}
                      data-testid="identity-headline"
                    />
                    <ColorSwatchPicker
                      title="Headline color"
                      value={selected.lineColors?.headline}
                      defaultColor={
                        strInherited(brandState, "textColor") ||
                        config.textColor ||
                        "#f8fafc"
                      }
                      onChange={(color) =>
                        patchSection(selected.id, {
                          lineColors: {
                            ...selected.lineColors,
                            headline: color,
                          },
                        })
                      }
                    />
                  </div>
                  <TextFormatControls
                    title="Identity — font (all lines) & name size"
                    value={selected.format}
                    onChange={(format) => patchSection(selected.id, { format })}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Font family applies to every line. Size/weight mainly style the name. Use the
                    color square beside each field for per-line color. Empty name/org pull from
                    Empty name/org pull from Brand Kit when Use current Brand Kit values is on
                    (copied into this Card — not a durable sync).
                  </p>
                </>
              )}

              {selected.type === "hero" && (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs">Hero layout</Label>
                    <select
                      className="flex h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
                      value={selected.heroLayout || "classic"}
                      onChange={(e) =>
                        patchSection(selected.id, {
                          heroLayout: e.target.value as
                            | "classic"
                            | "logo_top"
                            | "columns",
                        })
                      }
                    >
                      <option value="classic">Classic — photo hero</option>
                      <option value="logo_top">Logo above photo</option>
                      <option value="columns">Two columns — image &amp; text</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Hero background</Label>
                    <select
                      aria-label="Hero fill mode"
                      className="flex h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
                      value={selected.heroFill || "photo"}
                      onChange={(e) =>
                        patchSection(selected.id, {
                          heroFill: e.target.value as TapCardHeroFill,
                        })
                      }
                    >
                      <option value="photo">Photo</option>
                      <option value="gradient">Gradient</option>
                      <option value="photo_gradient">Photo + gradient overlay</option>
                    </select>
                  </div>
                  {(selected.heroFill || "photo") !== "photo" ? (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Gradient start</Label>
                          <Input
                            type="color"
                            aria-label="Hero gradient start color"
                            className="h-9 w-full cursor-pointer p-1"
                            value={selected.gradientStart || config.accentColor}
                            onChange={(e) =>
                              patchSection(selected.id, { gradientStart: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Gradient end</Label>
                          <Input
                            type="color"
                            aria-label="Hero gradient end color"
                            className="h-9 w-full cursor-pointer p-1"
                            value={selected.gradientEnd || "#0b0f19"}
                            onChange={(e) =>
                              patchSection(selected.id, { gradientEnd: e.target.value })
                            }
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">
                          Gradient direction {selected.gradientAngle ?? 160}°
                        </Label>
                        <input
                          type="range"
                          min={0}
                          max={360}
                          aria-label="Hero gradient direction"
                          value={selected.gradientAngle ?? 160}
                          onChange={(e) =>
                            patchSection(selected.id, {
                              gradientAngle: Number(e.target.value),
                            })
                          }
                          className="w-full"
                        />
                      </div>
                    </>
                  ) : null}
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selected.showOutline !== false}
                      onChange={(e) =>
                        patchSection(selected.id, { showOutline: e.target.checked })
                      }
                    />
                    Card outline around hero
                  </label>
                  <MediaPicker
                    label="Hero photo / background"
                    value={selected.imageUrl ?? ""}
                    onChange={(url) => patchSection(selected.id, { imageUrl: url })}
                    mediaUploadReady={mediaUploadReady}
                    stockReady={stockReady}
                  />

                  <div className="space-y-2 rounded-lg border border-border/50 bg-muted/10 p-3">
                    <label className="flex items-center gap-2 text-sm font-medium">
                      <input
                        type="checkbox"
                        checked={selected.showHeroLogo === true}
                        onChange={(e) =>
                          patchSection(selected.id, {
                            showHeroLogo: e.target.checked,
                            showLogoWindow: e.target.checked,
                          })
                        }
                      />
                      Show logo on hero
                    </label>
                    <p className="text-[10px] text-muted-foreground">
                      Off by default. Turn on for a logo on the hero photo, then adjust size below.
                    </p>
                    {selected.showHeroLogo === true ? (
                      <>
                        <MediaPicker
                          label="Hero logo"
                          value={selected.logoUrl ?? logoUrl ?? ""}
                          onChange={(url) =>
                            patchSection(selected.id, {
                              logoUrl: url,
                              ...(url
                                ? {}
                                : { showHeroLogo: false, showLogoWindow: false }),
                            })
                          }
                          mediaUploadReady={mediaUploadReady}
                          stockReady={stockReady}
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          onClick={() =>
                            patchSection(selected.id, {
                              logoUrl: "",
                              showHeroLogo: false,
                              showLogoWindow: false,
                            })
                          }
                        >
                          Reset hero logo
                        </Button>
                        <div className="space-y-1">
                          <Label className="text-xs">
                            Logo size {selected.logoScale ?? 100}%
                          </Label>
                          <input
                            type="range"
                            min={40}
                            max={180}
                            value={selected.logoScale ?? 100}
                            onChange={(e) =>
                              patchSection(selected.id, {
                                logoScale: Number(e.target.value),
                              })
                            }
                            className="w-full"
                          />
                        </div>
                        {(selected.heroLayout || "classic") === "classic" ||
                        selected.heroLayout === "logo_top" ? (
                          <>
                            <div className="space-y-1">
                              <Label className="text-xs">
                                Move X {selected.logoOffsetX ?? 0}px
                              </Label>
                              <input
                                type="range"
                                min={-80}
                                max={80}
                                value={selected.logoOffsetX ?? 0}
                                onChange={(e) =>
                                  patchSection(selected.id, {
                                    logoOffsetX: Number(e.target.value),
                                  })
                                }
                                className="w-full"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">
                                Move Y {selected.logoOffsetY ?? 0}px
                              </Label>
                              <input
                                type="range"
                                min={-80}
                                max={80}
                                value={selected.logoOffsetY ?? 0}
                                onChange={(e) =>
                                  patchSection(selected.id, {
                                    logoOffsetY: Number(e.target.value),
                                  })
                                }
                                className="w-full"
                              />
                            </div>
                          </>
                        ) : null}
                      </>
                    ) : null}
                  </div>

                  {(selected.heroLayout || "classic") === "classic" ? (
                    <>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={Boolean(selected.showCallBadge)}
                          onChange={(e) =>
                            patchSection(selected.id, {
                              showCallBadge: e.target.checked,
                            })
                          }
                        />
                        Show Call badge
                      </label>
                    </>
                  ) : null}

                  {selected.heroLayout === "columns" ? (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Left column</Label>
                          <select
                            className="flex h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
                            value={selected.columnLeft || "image"}
                            onChange={(e) =>
                              patchSection(selected.id, {
                                columnLeft: e.target.value as
                                  | "logo"
                                  | "text"
                                  | "image"
                                  | "empty",
                              })
                            }
                          >
                            <option value="logo">Logo</option>
                            <option value="text">Text</option>
                            <option value="image">Image</option>
                            <option value="empty">Empty</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Right column</Label>
                          <select
                            className="flex h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
                            value={selected.columnRight || "text"}
                            onChange={(e) =>
                              patchSection(selected.id, {
                                columnRight: e.target.value as
                                  | "logo"
                                  | "text"
                                  | "image"
                                  | "empty",
                              })
                            }
                          >
                            <option value="logo">Logo</option>
                            <option value="text">Text</option>
                            <option value="image">Image</option>
                            <option value="empty">Empty</option>
                          </select>
                        </div>
                      </div>
                      {(selected.columnLeft === "text" || selected.columnRight === "text") && (
                        <div className="grid grid-cols-2 gap-2">
                          {selected.columnLeft === "text" ? (
                            <Input
                              value={selected.columnLeftText ?? selected.columnText ?? ""}
                              onChange={(e) =>
                                patchSection(selected.id, { columnLeftText: e.target.value })
                              }
                              placeholder="Left column text"
                            />
                          ) : (
                            <span />
                          )}
                          {selected.columnRight === "text" ? (
                            <Input
                              value={selected.columnRightText ?? selected.columnText ?? ""}
                              onChange={(e) =>
                                patchSection(selected.id, { columnRightText: e.target.value })
                              }
                              placeholder="Right column text"
                            />
                          ) : null}
                        </div>
                      )}
                      {(selected.columnLeft === "image" || selected.columnRight === "image") && (
                        <div className="space-y-2">
                          {selected.columnLeft === "image" ? (
                            <MediaPicker
                              label="Left column image"
                              value={
                                selected.columnLeftImageUrl ??
                                selected.columnImageUrl ??
                                ""
                              }
                              onChange={(url) =>
                                patchSection(selected.id, { columnLeftImageUrl: url })
                              }
                              mediaUploadReady={mediaUploadReady}
                              stockReady={stockReady}
                            />
                          ) : null}
                          {selected.columnRight === "image" ? (
                            <MediaPicker
                              label="Right column image"
                              value={
                                selected.columnRightImageUrl ??
                                selected.columnImageUrl ??
                                ""
                              }
                              onChange={(url) =>
                                patchSection(selected.id, { columnRightImageUrl: url })
                              }
                              mediaUploadReady={mediaUploadReady}
                              stockReady={stockReady}
                            />
                          ) : null}
                        </div>
                      )}
                      <TextFormatControls
                        title="Column text format"
                        value={selected.format}
                        onChange={(format) => patchSection(selected.id, { format })}
                      />
                    </>
                  ) : null}

                  <Input
                    value={selected.href ?? ""}
                    onChange={(e) => patchSection(selected.id, { href: e.target.value })}
                    placeholder="Logo / hero link"
                  />
                </>
              )}

              {selected.type === "image" && (
                <>
                  <MediaPicker
                    label="Image"
                    value={selected.imageUrl ?? ""}
                    onChange={(url) => patchSection(selected.id, { imageUrl: url })}
                    mediaUploadReady={mediaUploadReady}
                    stockReady={stockReady}
                  />
                  <Input
                    value={selected.href ?? ""}
                    onChange={(e) => patchSection(selected.id, { href: e.target.value })}
                    placeholder="Optional link https://…"
                  />
                  <Input
                    value={selected.altText ?? ""}
                    onChange={(e) => patchSection(selected.id, { altText: e.target.value })}
                    placeholder="Alt text"
                  />
                  <div className="space-y-1">
                    <Label className="text-xs">
                      Width {selected.imageWidthPercent ?? 100}%
                    </Label>
                    <input
                      type="range"
                      min={40}
                      max={100}
                      value={selected.imageWidthPercent ?? 100}
                      onChange={(e) =>
                        patchSection(selected.id, {
                          imageWidthPercent: Number(e.target.value),
                        })
                      }
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Corners</Label>
                    <select
                      className="flex h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
                      value={selected.imageRadius || "rounded_md"}
                      onChange={(e) =>
                        patchSection(selected.id, {
                          imageRadius: e.target.value as TapCardButtonShape,
                        })
                      }
                    >
                      {TAP_CARD_SHAPE_OPTIONS.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">
                      Transparency {selected.opacity ?? 100}%
                    </Label>
                    <input
                      type="range"
                      min={20}
                      max={100}
                      value={selected.opacity ?? 100}
                      onChange={(e) =>
                        patchSection(selected.id, { opacity: Number(e.target.value) })
                      }
                      className="w-full"
                    />
                  </div>
                </>
              )}

              {selected.type === "logo_block" && (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs">Layout</Label>
                    <select
                      className="flex h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
                      value={selected.logoBlockLayout || "columns"}
                      onChange={(e) =>
                        patchSection(selected.id, {
                          logoBlockLayout: e.target.value as "stack" | "columns",
                        })
                      }
                    >
                      <option value="columns">Two columns</option>
                      <option value="stack">Stack (vertical)</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Left</Label>
                      <select
                        className="flex h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
                        value={selected.columnLeft || "logo"}
                        onChange={(e) =>
                          patchSection(selected.id, {
                            columnLeft: e.target.value as "logo" | "text" | "empty",
                          })
                        }
                      >
                        <option value="logo">Logo</option>
                        <option value="text">Text</option>
                        <option value="empty">Empty</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Right</Label>
                      <select
                        className="flex h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
                        value={selected.columnRight || "text"}
                        onChange={(e) =>
                          patchSection(selected.id, {
                            columnRight: e.target.value as "logo" | "text" | "empty",
                          })
                        }
                      >
                        <option value="logo">Logo</option>
                        <option value="text">Text</option>
                        <option value="empty">Empty</option>
                      </select>
                    </div>
                  </div>

                  {(selected.columnLeft === "logo" ||
                    selected.columnRight === "logo" ||
                    !selected.columnLeft) && (
                    <>
                      <MediaPicker
                        label="Logo image"
                        value={selected.logoUrl ?? logoUrl ?? ""}
                        onChange={(url) => patchSection(selected.id, { logoUrl: url })}
                        mediaUploadReady={mediaUploadReady}
                        stockReady={stockReady}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() => patchSection(selected.id, { logoUrl: "" })}
                      >
                        Clear logo (no brand fallback)
                      </Button>
                    </>
                  )}

                  {(selected.columnLeft === "text" || selected.columnRight === "text") && (
                    <div className="grid grid-cols-2 gap-2">
                      {selected.columnLeft === "text" ? (
                        <Input
                          value={selected.columnLeftText ?? ""}
                          onChange={(e) =>
                            patchSection(selected.id, { columnLeftText: e.target.value })
                          }
                          placeholder="Left text"
                        />
                      ) : (
                        <span />
                      )}
                      {selected.columnRight === "text" ? (
                        <Input
                          value={selected.columnRightText ?? ""}
                          onChange={(e) =>
                            patchSection(selected.id, { columnRightText: e.target.value })
                          }
                          placeholder="Right text"
                        />
                      ) : null}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={selected.columnLeftHref ?? selected.href ?? ""}
                      onChange={(e) =>
                        patchSection(selected.id, {
                          columnLeftHref: e.target.value,
                          href: e.target.value,
                        })
                      }
                      placeholder="Left link https://…"
                    />
                    <Input
                      value={selected.columnRightHref ?? ""}
                      onChange={(e) =>
                        patchSection(selected.id, { columnRightHref: e.target.value })
                      }
                      placeholder="Right link https://…"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Logo scale {selected.logoScale ?? 100}%</Label>
                    <input
                      type="range"
                      min={40}
                      max={180}
                      value={selected.logoScale ?? 100}
                      onChange={(e) =>
                        patchSection(selected.id, { logoScale: Number(e.target.value) })
                      }
                      className="w-full"
                    />
                  </div>
                  <TextFormatControls
                    title="Text format"
                    value={selected.format}
                    onChange={(format) => patchSection(selected.id, { format })}
                  />
                </>
              )}

              {selected.type === "text" && (
                <>
                  <ExpandedTextField
                    label="Text content"
                    value={selected.text ?? ""}
                    onChange={(text) => patchSection(selected.id, { text })}
                    placeholder="Text content"
                    recommendedMax={400}
                    data-testid="section-text-body"
                  />
                  <TextFormatControls
                    title="Full font & size"
                    value={selected.format}
                    onChange={(format) => patchSection(selected.id, { format })}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Text color</Label>
                      <Input
                        type="color"
                        value={selected.textColor || config.textColor}
                        onChange={(e) =>
                          patchSection(selected.id, { textColor: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Background</Label>
                      <Input
                        type="color"
                        value={selected.backgroundColor || "#00000000"}
                        onChange={(e) =>
                          patchSection(selected.id, { backgroundColor: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </>
              )}

              {selected.type === "spacer" && (
                <div className="space-y-1">
                  <Label className="text-xs">Height</Label>
                  <select
                    className="flex h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
                    value={selected.height || "md"}
                    onChange={(e) =>
                      patchSection(selected.id, {
                        height: e.target.value as "sm" | "md" | "lg",
                      })
                    }
                  >
                    <option value="sm">Small</option>
                    <option value="md">Medium</option>
                    <option value="lg">Large</option>
                  </select>
                </div>
              )}

              {selected.type === "footer_cta" && (
                <>
                  <Input
                    value={selected.text ?? ""}
                    onChange={(e) => patchSection(selected.id, { text: e.target.value })}
                    placeholder="Headline"
                  />
                  <Input
                    value={selected.description ?? ""}
                    onChange={(e) =>
                      patchSection(selected.id, { description: e.target.value })
                    }
                    placeholder="Supporting line"
                  />
                  <Input
                    value={selected.buttonLabel ?? ""}
                    onChange={(e) =>
                      patchSection(selected.id, { buttonLabel: e.target.value })
                    }
                    placeholder="Button label"
                  />
                  <Input
                    value={selected.href ?? ""}
                    onChange={(e) => patchSection(selected.id, { href: e.target.value })}
                    placeholder="/sign-up"
                  />
                </>
              )}
            </div>
          )}
          </div>
        </aside>
        <FormatWorkspace
          open={formatOpen && !shellHosted}
          onClose={() => setFormatOpen(false)}
          title={selected ? `Format · ${selected.label || selected.type}` : "Format · Card"}
          subtitle="Expanded Format workspace — typography, style, layout, and appearance. Quick controls remain in the inspector."
        >
          {(tab) => {
            if (tab === "typography") {
              return (
                <div className="space-y-4">
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
                    <p className="text-xs text-muted-foreground">
                      Select a block for block-level typography.
                    </p>
                  )}
                </div>
              );
            }
            if (tab === "style") {
              return (
                <div className="space-y-4">
                  {selected ? (
                    <>
                      <FinishPicker
                        value={selected.finish || selected.style || config.defaultFinish}
                        onChange={(finish) => patchSection(selected.id, { finish })}
                        label="Block finish"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Fill</Label>
                          <Input
                            type="color"
                            aria-label="Block fill color"
                            value={
                              selected.backgroundColor || config.pillColor || "#0c0a07"
                            }
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
                            aria-label="Block text color"
                            value={selected.textColor || config.pillTextColor || "#f5e6a8"}
                            onChange={(e) =>
                              patchSection(selected.id, { textColor: e.target.value })
                            }
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Select a block to apply finish and color styles.
                    </p>
                  )}
                </div>
              );
            }
            if (tab === "layout") {
              return (
                <div className="space-y-4">
                  {selected?.type === "action" ? (
                    <ButtonLayoutControls
                      value={{
                        iconPosition: selected.iconPosition,
                        iconSize: selected.iconSize,
                        textSize: selected.textSize,
                        iconGap: selected.iconGap,
                        contentAlign: selected.contentAlign,
                        verticalAlign: selected.verticalAlign,
                        paddingX: selected.paddingX,
                        paddingY: selected.paddingY,
                        minHeight: selected.minHeight,
                        fullWidth: selected.fullWidth,
                        wrap: selected.wrap,
                      }}
                      onChange={(patch) => {
                        const next: Partial<typeof selected> = { ...patch };
                        if (patch.iconPosition === "only") next.appearance = "icon_only";
                        if (patch.iconPosition === "none") next.appearance = "text";
                        if (
                          patch.iconPosition &&
                          patch.iconPosition !== "only" &&
                          patch.iconPosition !== "none"
                        ) {
                          next.appearance = "icon_text";
                        }
                        patchSection(selected.id, next);
                      }}
                    />
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Select an action button for layout, shape, and arrangement controls.
                    </p>
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    Two-column and freeform arrangement remain on the Design bar and Freeform
                    panel when enabled.
                  </p>
                </div>
              );
            }
            if (tab === "appearance") {
              return (
                <div className="space-y-3 text-xs text-muted-foreground">
                  <p>
                    Neon glow, 3-D depth, transparency, and pill colors live on the Design bar
                    so the canvas stays visible while you tune atmosphere.
                  </p>
                  <p>
                    Brand Kit colors can be copied into this Card from the Brand Kit bar. Future
                    Brand Kit changes do not automatically update this Card yet — durable linked
                    inheritance is Phase 2. Edit Brand Kit under Assets for the workspace palette.
                  </p>
                </div>
              );
            }
            return (
              <div className="space-y-3 text-xs text-muted-foreground">
                <p>
                  Advanced: responsive visibility rules, conditions, animation, and design-token
                  overrides expand here as those models ship — capability is not removed to look
                  simple.
                </p>
                <p>
                  Layers and grouping for freeform objects are available when Freeform is enabled
                  for this workspace.
                </p>
              </div>
            );
          }}
        </FormatWorkspace>
      </div>
    </div>
  );
}
