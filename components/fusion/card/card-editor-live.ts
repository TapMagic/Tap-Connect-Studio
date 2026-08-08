/**
 * Live Card editor model bridge — Adaptive Task Drawer reads latest builder state
 * without portal setState loops.
 *
 * Publication notifies only when material editor state changes (signature).
 * Callback identity churn from parent re-renders must not notify subscribers.
 */

import type { BrandInheritanceState } from "@/lib/fusion/authoring/brand-inheritance";
import type {
  TapCardSection,
  TapConnectCardConfig,
} from "@/lib/brand/tap-card";
import type { CardElementKind, CardSurfaceKind, ComposerSelectedObject, SectionPresetId } from "@/lib/fusion/card/composer-model";
import type { CreativeCompositionNode } from "@/lib/fusion/creative-studio/composition";
import type { SelectionRef } from "@/lib/fusion/creative-studio/selection-ref";

export type CardEditorLiveModel = {
  documentId: string;
  pageId: string;
  revision: number;
  selectionRef: SelectionRef;
  activeDocumentId: string;
  documents: Array<{ id: string; name: string; type: "MAIN_CARD" | "CARD_VARIATION" }>;
  config: TapConnectCardConfig;
  selected: TapCardSection | null;
  selectedObject?: ComposerSelectedObject;
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
  notify?: (message: string | null) => void;
  profile: import("@/lib/brand/contact-profile").BrandContactProfile;
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
  openDocument: (id: string) => Promise<boolean>;
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
  patchCompositionNode: (
    nodeId: string,
    patch: Partial<CreativeCompositionNode>,
    label: string
  ) => void;
  patchSelection: (
    selection: SelectionRef,
    patch: Partial<CreativeCompositionNode> | Partial<TapCardSection>,
    label: string
  ) => boolean;
  onAddSection: (type: string) => void;
  onAddAction: (kind: string) => void;
  onAddSurface?: (kind: CardSurfaceKind) => void;
  onAddSectionPreset?: (presetId: SectionPresetId) => void;
  onAddElement?: (kind: CardElementKind, targetSectionId: string | null, initialProps?: Record<string, unknown>) => void;
  onAddObjects?: (objects: Array<{ kind: CardElementKind; initialProps?: Record<string, unknown> }>, targetSectionId: string | null, label: string) => void;
  moveElementsTo?: (
    ids: string[],
    fromSectionId: string | null,
    toSectionId: string | null
  ) => void;
  duplicateElements?: (ids: string[], parentId: string | null) => void;
  deleteElements?: (ids: string[], parentId: string | null) => void;
  wrapElements?: (
    ids: string[],
    fromSectionId: string | null,
    kind: CardSurfaceKind
  ) => void;
  removeSectionKeepElements?: (sectionId: string) => void;
  onStartPoint?: (kind: "blank" | "brand" | "template" | "clone") => void;
  setSelectedId: (id: string | null) => void;
  setShowFreeform: (v: boolean) => void;
  onRetireToggle: () => void;
  onPublishDemo: (publish: boolean) => void;
  onRollback: (snapshotId: string) => void;
  strInherited: (key: string) => string | undefined;
  onTestAction: (section: TapCardSection) => void;
  onCloseTool?: () => void;
  selectedCompositionNodeIds?: string[];
  setSelectedCompositionNodeIds?: (ids: string[]) => void;
  /** True only after an explicit Card Root selection — never inferred from deselection. */
  explicitCardRootSelected?: boolean;
  selectCardRoot?: () => void;
  clearStudioSelection?: () => void;
  /** Outline document-structure ops */
  reorderSections: (fromId: string, toId: string) => void;
  moveSectionBy: (id: string, delta: number) => void;
  moveSectionTo: (id: string, edge: "top" | "bottom") => void;
  duplicateSection: (id: string) => void;
  copySection: (id: string) => void;
  deleteSection: (id: string) => void;
  toggleSectionVisible: (id: string) => void;
  toggleSectionLocked: (id: string) => void;
};

const live: { current: CardEditorLiveModel | null } = { current: null };
const listeners = new Set<() => void>();
let materialSignature = "null";
let notifyGeneration = 0;

/** Material fields only — excludes callback identity. */
export function cardEditorLiveMaterialSignature(
  model: CardEditorLiveModel | null
): string {
  if (!model) return "null";
  return JSON.stringify({
    documentId: model.documentId,
    pageId: model.pageId,
    revision: model.revision,
    selectionRef: model.selectionRef,
    activeDocumentId: model.activeDocumentId,
    documents: model.documents,
    config: model.config,
    selectedId: model.selected?.id ?? null,
    selectedObject: model.selectedObject,
    sortedIds: model.sorted.map((s) => s.id),
    brandState: model.brandState,
    mediaUploadReady: model.mediaUploadReady,
    stockReady: model.stockReady,
    freeformEnabled: model.freeformEnabled,
    showFreeform: model.showFreeform,
    isAdmin: model.isAdmin,
    demoPublished: model.demoPublished,
    versions: model.versions,
    logoUrl: model.logoUrl ?? null,
    brandKitId: model.brandKitId ?? null,
    message: model.message,
    businessName: model.businessName,
    pastLabels: model.pastLabels,
    futureLabels: model.futureLabels,
    canUndo: model.canUndo,
    canRedo: model.canRedo,
    reviewUrl: model.reviewUrl ?? null,
    selectedCompositionNodeIds: model.selectedCompositionNodeIds ?? [],
    explicitCardRootSelected: Boolean(model.explicitCardRootSelected),
  });
}

export function publishCardEditorLive(model: CardEditorLiveModel | null): void {
  live.current = model;
  const nextSig = cardEditorLiveMaterialSignature(model);
  if (nextSig === materialSignature) {
    // Keep latest callbacks on `live.current` without notifying — prevents
    // reciprocal setState storms when effect deps churn on new array identity.
    return;
  }
  materialSignature = nextSig;
  notifyGeneration += 1;
  listeners.forEach((l) => l());
}

export function getCardEditorLive(): CardEditorLiveModel | null {
  return live.current;
}

export function getCardEditorLiveGeneration(): number {
  return notifyGeneration;
}

export function subscribeCardEditorLive(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Test-only: reset module store between cases. */
export function __resetCardEditorLiveForTests(): void {
  live.current = null;
  materialSignature = "null";
  notifyGeneration = 0;
  listeners.clear();
}
