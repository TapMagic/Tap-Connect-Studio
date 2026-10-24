"use client";

import { readFlowPasteOverflow, revealCompositionSelection, readRenderedCompositionFrames, readRenderedLayeredParentSize } from "@/components/fusion/creative-studio/use-layered-parent-size";
import { editableControlOwnsKeyboard, studioEditableOwner } from "@/lib/fusion/creative-studio/platform/keyboard-ownership";
import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState, useSyncExternalStore, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { ClipboardPaste, Copy, Eye, FileText, Layers3, ListChecks, MoreHorizontal, Move, Plus, QrCode, Redo2, Save, Smartphone, Tablet, Monitor, Trash2, Undo2, X } from "lucide-react";
import { TapCardBuilder, type CardBuilderShellApi, type CardBuilderShellStatus } from "@/components/card/tap-card-builder";
import { LiveDeviceQrPanel } from "@/components/fusion/creative-studio/live-device-qr-panel";
import { PublicQrCredentialPanel } from "@/components/fusion/card/public-qr-credential-panel";
import { getCardEditorLive, subscribeCardEditorLive } from "@/components/fusion/card/card-editor-live";
import type { CardAuthoringWorkspaceProps } from "@/components/fusion/card/card-authoring-workspace";
import { StudioEditorRail } from "./studio-editor-rail";
import { StudioDiscoveryDrawer, type StandardButtonDiscoveryResource } from "./studio-discovery-drawer";
import { StudioSelectionInspector } from "./studio-selection-inspector";
import { StudioSelectionToolbar, type ButtonInspectorSection, type ButtonPositionCommand } from "./studio-selection-toolbar";
import { StudioAssemblyInspector } from "./studio-assembly-inspector";
import { StudioCompositionInspector } from "./studio-composition-inspector";
import { StudioCardSurfaceInspector } from "./studio-card-surface-inspector";
import { INITIAL_STUDIO_DRAWER_STATE, studioDrawerReducer, type StudioDrawerEvent } from "@/lib/fusion/creative-studio/reconstitution/drawer-controller";
import { resolveStudioRail, type StudioRailReadinessOverrides } from "@/lib/fusion/creative-studio/reconstitution/studio-rail-registry";
import type { BrandPreviewContext } from "@/lib/fusion/creative-studio/reconstitution/standard-button-catalog";
import { standardButtonDiscoveryResources } from "@/lib/fusion/creative-studio/reconstitution/standard-button-discovery";
import type { StudioRecentResource, StudioResourceUsageOperation } from "@/lib/fusion/creative-studio/platform/activity";
import { studioPresentationProvenance } from "@/lib/fusion/creative-studio/platform/presentation-application";
import type { StudioResourceReference } from "@/lib/fusion/creative-studio/platform/discovery";
import type { PreviewViewport } from "@/lib/fusion/creative-studio/modes";
import type { StudioButtonFamilyCatalog } from "@/lib/fusion/creative-studio/platform/button-family-discovery";
import { selectedStructuredAssembly } from "@/lib/fusion/creative-studio/reconstitution/signature-assembly-entry";
import { cn } from "@/lib/utils";
import { loadStudioShellSession, saveStudioShellSession } from "@/lib/fusion/creative-studio/reconstitution/studio-shell-state";
import { resolveStudioSelectionTarget } from "@/lib/fusion/creative-studio/platform/studio-selection-target";
import { StudioTransientMenu } from "./studio-transient-overlay";
import {
  EMPTY_STUDIO_CONTEXT,
  INITIAL_STUDIO_WORKSPACE_STATE,
  resolveStudioContextRestoreTarget,
  resolveStudioWorkspaceChoreography,
  studioWorkspaceReducer,
  type StudioAuthoringContextSnapshot,
  type StudioTransientTaskLifecycle,
  type StudioWorkspaceTaskId,
} from "@/lib/fusion/creative-studio/platform/adaptive-workspace";
import { buttonFamilyCatalogAdapter } from "@/lib/fusion/creative-studio/reconstitution/studio-catalog-adapters";
import { STUDIO_SEMANTIC_UI } from "@/lib/fusion/creative-studio/platform/studio-semantic-ui";
import { resolveStudioPlacementContext } from "@/lib/fusion/creative-studio/platform/add-discover";
import { studioAddCatalogAdapter } from "@/lib/fusion/creative-studio/reconstitution/studio-catalog-adapters";
import { useSharedMediaBrowser } from "@/components/media/shared-media-browser-provider";
import type { MediaAssetCandidate } from "@/lib/media/asset-browser";
import { expandFlowPasteDestination, compositionChildren, copyCompositionNodeSubtree, pasteCompositionNodeSubtree, type CompositionNodeClipboardPayload } from "@/lib/fusion/card/composition-parent-authority";
import { expandSelectionToGroups, type AlignMode, type CreativeCompositionBlock } from "@/lib/fusion/creative-studio/composition";
import { synchronizeCompositionGroups, groupCompositionBlock, groupMembers, resolveActiveGroupId, ungroupCompositionBlock } from "@/lib/fusion/creative-studio/group-authority";
import { StudioPagesManager } from "./studio-pages-manager";
import { canonicalizeExperienceConfig } from "@/lib/fusion/card/experience-pages";
import { compactActionGridNodeProps, compactActionGridProofFixture } from "@/lib/fusion/creative-studio/platform/compact-action-grid";
import { applySelectionGeometryOperation, selectionGeometryCompatibility, selectionOperationAvailability, selectionOperationHistoryLabel, type StudioSelectionGeometryOperation } from "@/lib/fusion/creative-studio/platform/selection-geometry";
import type { StudioGeometryUnit } from "@/lib/fusion/creative-studio/platform/geometry-units";

type Props = CardAuthoringWorkspaceProps & {
  brandPreviewContext: BrandPreviewContext;
  buttonFamilyCatalog: StudioButtonFamilyCatalog;
  railReadiness?: StudioRailReadinessOverrides;
};

const INITIAL_STATUS: CardBuilderShellStatus = {
  dirty: false, saving: false, focusMode: false, canUndo: false, canRedo: false,
  message: null, lifecycleStatus: "active", brandSource: "Brand Kit", selectedId: null,
  sectionCount: 0, cardName: "Card", pastLabels: [], futureLabels: [], canPublish: false,
  clientName: "Workspace",
  publicationLabel: "Not published", saveState: "saved", savedAt: null, recoveryState: "none",
  activeDocumentId: "main-card", openDocuments: [],
};

export function CardStudioReconstitutionWorkspace({
  brandPreviewContext,
  buttonFamilyCatalog,
  railReadiness,
  doneHref = "/dashboard/card",
  publicCode,
  ...builderProps
}: Props) {
  const router = useRouter();
  const apiRef = useRef<CardBuilderShellApi | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState(INITIAL_STATUS);
  const [drawer, dispatch] = useReducer(studioDrawerReducer, INITIAL_STUDIO_DRAWER_STATE);
  const [adaptiveWorkspace, workspaceDispatch] = useReducer(studioWorkspaceReducer, INITIAL_STUDIO_WORKSPACE_STATE);
  const [studioMode, setStudioMode] = useState<"edit" | "preview">("edit");
  const [viewport, setViewport] = useState<PreviewViewport>("desktop");
  const [inspectorSection, setInspectorSection] = useState<ButtonInspectorSection>("content");
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [assemblyInspectorOpen, setAssemblyInspectorOpen] = useState(false);
  const [compositionInspectorOpen, setCompositionInspectorOpen] = useState(false);
  const [compositionSelectionMode, setCompositionSelectionMode] = useState<"single" | "multiple">("single");
  const [geometryUnit, setGeometryUnit] = useState<StudioGeometryUnit>("percent");
  const [frameDiagnostics, setFrameDiagnostics] = useState(false);
  const [liveDeviceOpen, setLiveDeviceOpen] = useState(false);
  const [devicePanelTab, setDevicePanelTab] = useState<"preview" | "public">("preview");
  const [pagesOpen, setPagesOpen] = useState(false);
  const [liveDeviceInitialized, setLiveDeviceInitialized] = useState(false);
  const [liveDeviceActivation, setLiveDeviceActivation] = useState(0);
  const [recents, setRecents] = useState<StudioRecentResource[]>([]);
  const [recentsState, setRecentsState] = useState<"loading" | "ready" | "error">("loading");
  const [sessionRestored, setSessionRestored] = useState(false);
  const [pendingPostInsert, setPendingPostInsert] = useState<{ id: string; refine: "button" | "composition" | "curated" } | null>(null);
  const [compositionClipboard, setCompositionClipboard] = useState<CompositionNodeClipboardPayload | null>(null);
  const [pasteReview, setPasteReview] = useState<null | {
    result: Extract<ReturnType<typeof pasteCompositionNodeSubtree>, { ok: true }>;
    parentId: string | null; targetLabel: string; label: string; previousIds: string[];
    expansion?: ReturnType<typeof expandFlowPasteDestination>; explanation?: string;
  }>(null);
  const pasteDialog = useRef<HTMLDialogElement | null>(null);
  const lastPaste = useRef<{ parentId: string | null; ids: string[] } | null>(null);
  const [workspaceWidth, setWorkspaceWidth] = useState(1440);
  const consumedCatalogBoundary = useRef<"open" | "close" | null>(null);
  const sharedMediaBrowser = useSharedMediaBrowser();
  const liveModel = useSyncExternalStore(subscribeCardEditorLive, getCardEditorLive, getCardEditorLive);
  const selectedNode = liveModel?.selectedCompositionNode ?? null;
  const selectedButton = selectedNode?.primitive === "button" ? selectedNode : null;
  const selectedBlock = selectedNode
    ? liveModel?.config.rootComposition?.nodes.some((node) => node.id === selectedNode.id)
      ? liveModel.config.rootComposition
      : liveModel?.sorted.find((section) => section.composition?.nodes.some((node) => node.id === selectedNode.id))?.composition ?? null
    : null;
  const selectionTarget = liveModel ? resolveStudioSelectionTarget({
    selection: liveModel.selectionRef,
    root: liveModel.config.rootComposition,
    selectedNode,
    selectedBlock,
  }) : null;
  const selectedCanonicalNode = selectionTarget?.ownership === "card-flow" || selectionTarget?.ownership === "curated-recipe"
    ? selectionTarget.node
    : null;
  const selectedAssembly = useMemo(() => selectedStructuredAssembly([
    liveModel?.config.rootComposition,
    ...(liveModel?.sorted.map((section) => section.composition) ?? []),
  ], selectedNode), [liveModel, selectedNode]);
  const selectedCompositionIds = liveModel?.selectedCompositionNodeIds ?? (selectedCanonicalNode ? [selectedCanonicalNode.id] : []);
  const selectedBlockSection = liveModel?.sorted.find((section) => section.composition && selectedCompositionIds.some((id) => section.composition!.nodes.some((node) => node.id === id))) ?? null;
  const activeCompositionGroupId = selectedBlock ? resolveActiveGroupId(selectedBlock.nodes, selectedCompositionIds) : null;
  const multiCompositionSelection = Boolean(selectedBlock && !activeCompositionGroupId && selectedCompositionIds.length > 1);
  const multiSelectionCompatibility = selectedBlock
    ? selectionGeometryCompatibility(selectedBlock, selectedCompositionIds)
    : { compatible: false, reason: "Select sibling objects inside one Layered parent.", nodes: [], parentId: null };
  const replaceSelectedBlock = (next: NonNullable<typeof selectedBlock>, label: string) => {
    if (!liveModel) return;
    if (selectedBlockSection) liveModel.patchSection(selectedBlockSection.id, { composition: next }, label);
    else liveModel.patchConfig({ rootComposition: next }, label);
  };
  const groupSelectedComposition = () => {
    if (!selectedBlock || !liveModel) return;
    const next = groupCompositionBlock(selectedBlock, selectedCompositionIds);
    if (next === selectedBlock) {
      liveModel.notify?.("Group compatible sibling Modules inside the same Card or Container parent.");
      return;
    }
    replaceSelectedBlock(next, "Grouped Elements");
    liveModel.setSelectedCompositionNodeIds?.(expandSelectionToGroups(next.nodes, selectedCompositionIds));
    setCompositionSelectionMode("single");
  };
  const applyMultiSelectionOperation = (operation: StudioSelectionGeometryOperation) => {
    if (!selectedBlock || !liveModel) return;
    const availability = selectionOperationAvailability(selectedBlock, selectedCompositionIds, operation);
    if (!availability.enabled) {
      liveModel.notify?.(availability.reason || "That operation is not available for this selection.");
      return;
    }
    const next = applySelectionGeometryOperation(selectedBlock, selectedCompositionIds, operation, id => readRenderedLayeredParentSize(selectedBlock, id));
    if (next === selectedBlock) return;
    replaceSelectedBlock(next, selectionOperationHistoryLabel(operation));
    liveModel.setSelectedCompositionNodeIds?.([...selectedCompositionIds]);
  };
  const cancelMultipleSelection = () => {
    liveModel?.setSelectedCompositionNodeIds?.([]);
    setCompositionSelectionMode("single");
  };
  const ungroupSelectedComposition = () => {
    if (!selectedBlock || !activeCompositionGroupId || !liveModel) return;
    const memberIds = groupMembers(selectedBlock.nodes, activeCompositionGroupId).map((member) => member.id);
    replaceSelectedBlock(ungroupCompositionBlock(selectedBlock, activeCompositionGroupId), "Ungrouped Elements");
    liveModel.setSelectedCompositionNodeIds?.(memberIds);
  };
  const lockSelectedGroup = () => {
    if (!selectedBlock || !activeCompositionGroupId) return;
    replaceSelectedBlock({ ...selectedBlock, nodes: selectedBlock.nodes.map((node) => node.groupId === activeCompositionGroupId ? { ...node, locked: true } : node), groups: (selectedBlock.groups ?? []).map((group) => group.id === activeCompositionGroupId ? { ...group, locked: true } : group) }, "Locked composition Group");
  };
  const rail = useMemo(() => resolveStudioRail(railReadiness, Boolean(builderProps.isAdmin)), [builderProps.isAdmin, railReadiness]);
  const buttonResources = useMemo(() => standardButtonDiscoveryResources(brandPreviewContext), [brandPreviewContext]);
  const buttonCatalogAdapter = useMemo(() => buttonFamilyCatalogAdapter(buttonFamilyCatalog, buttonResources), [buttonFamilyCatalog, buttonResources]);
  const addCatalogAdapter = useMemo(() => studioAddCatalogAdapter(), []);
  const activeCatalogAdapter = drawer.path[0] === "buttons" || drawer.path[0] === "curated" ? buttonCatalogAdapter : addCatalogAdapter;
  const activeCatalogAdapterId = activeCatalogAdapter.id;
  const selectedCanonicalId = selectedCanonicalNode?.id ?? null;
  const selectedCanonicalParentId = selectedCanonicalNode?.parentId ?? null;
  const selectedCanonicalInternalId = typeof selectedCanonicalNode?.props.activeButtonContentNodeId === "string" ? selectedCanonicalNode.props.activeButtonContentNodeId : null;
  const selectedSectionId = liveModel?.selected?.id ?? null;
  const placementContext = useMemo(() => resolveStudioPlacementContext(liveModel?.config.rootComposition, liveModel?.selectedCompositionNode), [liveModel?.config.rootComposition, liveModel?.selectedCompositionNode]);
  const choreography = useMemo(() => resolveStudioWorkspaceChoreography(adaptiveWorkspace, workspaceWidth), [adaptiveWorkspace, workspaceWidth]);
  const devicePreviewRevision = liveModel?.revision ?? builderProps.initialDraftRevision ?? 1;
  const contextSource = {
    activeCatalogAdapterId,
    activeTaskId: adaptiveWorkspace.activeTaskId,
    assemblyInspectorOpen,
    compositionInspectorOpen,
    drawer,
    inspectorOpen,
    inspectorSection,
    selectedCanonicalId,
    selectedCanonicalInternalId,
    selectedCanonicalParentId,
    selectedSectionId,
  };
  const contextSourceRef = useRef(contextSource);
  useEffect(() => { contextSourceRef.current = contextSource; });

  const captureContext = useCallback((taskId?: StudioWorkspaceTaskId): StudioAuthoringContextSnapshot => {
    const source = contextSourceRef.current;
    const active = document.activeElement instanceof HTMLElement ? activeElementIdentity(document.activeElement) : null;
    const selectedId = source.selectedCanonicalId ?? source.selectedSectionId;
    const semanticAncestors = source.selectedCanonicalParentId ? [source.selectedCanonicalParentId] : [];
    return {
      ...EMPTY_STUDIO_CONTEXT,
      taskId: taskId ?? source.activeTaskId,
      selectedObjectId: selectedId,
      selectedInternalItemId: source.selectedCanonicalInternalId,
      semanticAncestors,
      cardScroll: { left: canvasRef.current?.scrollLeft ?? 0, top: canvasRef.current?.scrollTop ?? 0 },
      outline: { expandedIds: [], scrollOffset: source.drawer.activeRailId === "layers" ? source.drawer.scrollOffset : 0 },
      inspectorGroup: source.inspectorOpen || source.assemblyInspectorOpen || source.compositionInspectorOpen ? source.inspectorSection : null,
      browser: {
        adapterId: source.drawer.activeRailId === "add" ? source.activeCatalogAdapterId : null,
        path: source.drawer.path,
        query: source.drawer.query,
        filters: {},
        scrollOffset: source.drawer.scrollOffset,
        candidateResultId: null,
      },
      focusTarget: active,
      returnDestination: source.drawer.mode !== "closed" ? "drawer" : source.inspectorOpen || source.assemblyInspectorOpen || source.compositionInspectorOpen ? "inspector" : "canvas",
    };
  }, []);

  const restoreContext = useCallback((snapshot: StudioAuthoringContextSnapshot | undefined) => {
    if (!snapshot || !liveModel) return;
    const nodes = [
      ...(liveModel.config.rootComposition?.nodes ?? []),
      ...liveModel.sorted.flatMap((section) => section.composition?.nodes ?? []),
    ];
    const index = {
      existingObjectIds: new Set<string>([
        ...nodes.map((node) => node.id),
        ...liveModel.sorted.map((section) => section.id),
        liveModel.pageId,
      ]),
      parentByObjectId: Object.fromEntries([
        ...nodes.map((node) => [node.id, node.parentId ?? liveModel.pageId]),
        ...liveModel.sorted.map((section) => [section.id, liveModel.pageId]),
      ]),
      cardSurfaceId: liveModel.pageId,
    };
    const target = resolveStudioContextRestoreTarget(snapshot, index);
    if (target.objectId === liveModel.pageId || !target.objectId) liveModel.selectCardRoot?.();
    else if (nodes.some((node) => node.id === target.objectId)) {
      liveModel.setSelectedId(null);
      liveModel.setSelectedCompositionNodeIds?.([target.objectId]);
    } else {
      liveModel.setSelectedId(target.objectId);
      liveModel.setSelectedCompositionNodeIds?.([]);
    }
    requestAnimationFrame(() => {
      if (canvasRef.current) canvasRef.current.scrollTo(snapshot.cardScroll);
      if (snapshot.focusTarget) document.querySelector<HTMLElement>(`[data-studio-focus="${CSS.escape(snapshot.focusTarget)}"]`)?.focus();
    });
  }, [liveModel]);

  const beginTask = useCallback((taskId: StudioWorkspaceTaskId) => {
    workspaceDispatch({ type: "BEGIN_EXPLICIT_TASK", taskId, context: captureContext() });
  }, [captureContext]);

  const beginNestedTask = useCallback((taskId: StudioWorkspaceTaskId) => {
    workspaceDispatch({ type: "BEGIN_NESTED_TASK", taskId, context: captureContext() });
  }, [captureContext]);

  const handoffTask = useCallback((taskId: StudioWorkspaceTaskId, consumeCatalogBoundary?: "open" | "close") => {
    consumedCatalogBoundary.current = consumeCatalogBoundary ?? null;
    workspaceDispatch({ type: "HANDOFF_TRANSIENT_TASK", taskId });
  }, []);

  const beginContextualTask = useCallback((taskId: Extract<StudioWorkspaceTaskId, "refine-selection" | "tune-selection" | "arrange-card" | "edit-contents">) => {
    // Refining a selection is a focused task surface. Discovery/Outline must
    // yield before an Inspector opens so the canvas is never trapped between
    // two substantial side surfaces.
    beginTask(taskId);
    dispatch({ type: "CLOSE" });
  }, [beginTask]);

  const finishTask = useCallback((cancel = false) => {
    const snapshot = adaptiveWorkspace.returnStack.at(-1);
    workspaceDispatch({ type: cancel ? "CANCEL_TRANSIENT_TASK" : "COMPLETE_TRANSIENT_TASK" });
    restoreContext(snapshot);
  }, [adaptiveWorkspace.returnStack, restoreContext]);
  const transientTaskLifecycle = useMemo<StudioTransientTaskLifecycle>(() => ({
    enter: (taskId, transition) => {
      if (transition.mode === "nested") beginNestedTask(taskId);
      else handoffTask(taskId, transition.consumeBoundary === "catalog-open" ? "open" : transition.consumeBoundary === "catalog-close" ? "close" : undefined);
    },
    exit: (outcome) => finishTask(outcome === "cancel"),
  }), [beginNestedTask, finishTask, handoffTask]);
  const completeTaskWithoutRestore = useCallback(() => {
    workspaceDispatch({ type: "COMPLETE_TRANSIENT_TASK" });
  }, []);

  const copySelectedComposition = () => {
    if (!liveModel || !selectedBlock || !selectedCanonicalNode) return;
    const payload = copyCompositionNodeSubtree(selectedBlock, selectedCompositionIds.length ? selectedCompositionIds : [selectedCanonicalNode.id], readRenderedLayeredParentSize(selectedBlock, selectedCanonicalNode.parentId ?? null), readRenderedCompositionFrames(selectedBlock));
    if (!payload) {
      liveModel.notify?.("Select sibling objects in one parent to copy; Container children are included automatically.");
      return;
    }
    setCompositionClipboard(payload);
    void navigator.clipboard?.writeText(`tapconnect-studio-selection:${payload.rootIds?.join(",") ?? payload.rootId}`).catch(() => liveModel.notify?.("Clipboard permission unavailable. Use the Studio Paste button."));
    lastPaste.current = null;
    liveModel.notify?.(`Copied ${payload.label}. Select a destination Container or a sibling, then Paste.`);
  };

  const finishPaste = (review: NonNullable<typeof pasteReview>, expand = false) => {
    if (!liveModel) return;
    const candidate = expand && review.expansion?.ok ? review.expansion.block : review.result.block;
    liveModel.previewCompositionBlock?.(synchronizeCompositionGroups(candidate));
    liveModel.commitLiveAdjustment?.(`Pasted ${review.label}${expand ? " and expanded destination" : ""}`);
    const ids = review.result.selectedNodeIds ?? [];
    liveModel.setSelectedId(null);
    liveModel.setSelectedCompositionNodeIds?.(ids);
    lastPaste.current = { parentId: review.parentId, ids };
    setPasteReview(null);
    liveModel.notify?.(`Pasted ${review.label} into ${review.targetLabel}. ${expand ? "Container and required ancestor bounds expanded. " : ""}${(review.result.notices ?? []).join(" ")}`);
    requestAnimationFrame(() => revealCompositionSelection(candidate.id, ids));
  };
  const cancelPaste = () => {
    pasteDialog.current?.close();
    liveModel?.cancelLiveAdjustment?.();
    liveModel?.setSelectedCompositionNodeIds?.(pasteReview?.previousIds ?? []);
    setPasteReview(null);
    liveModel?.notify?.("Paste cancelled. Choose a different Container or adjust its Position bounds before pasting.");
  };
  useLayoutEffect(() => {
    if (!pasteReview || !liveModel?.config.rootComposition) return;
    if (pasteReview.explanation) { pasteDialog.current?.showModal(); return; }
    const block = liveModel.config.rootComposition;
    if (!pasteReview.result.selectedNodeIds?.every((id) => block.nodes.some((node) => node.id === id))) return;
    const overflow = readFlowPasteOverflow(block, pasteReview.parentId);
    if (!overflow) { finishPaste(pasteReview); return; }
    const expansion = expandFlowPasteDestination(block, overflow.parentId, overflow.requiredHeightPx, (id) => readRenderedLayeredParentSize(block, id));
    liveModel.cancelLiveAdjustment?.();
    setPasteReview({ ...pasteReview, expansion, explanation: `${overflow.name} uses Flow inside a ${Math.round(overflow.heightPx)}px Placement frame. Its content needs ${Math.ceil(overflow.requiredHeightPx)}px after this paste. Expand the Container and required ancestor bounds to keep it visible, or cancel and choose another destination. Existing objects retain their physical size and placement.` });
  // The candidate is measured only after the canonical preview reaches the renderer.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pasteReview, liveModel?.config.rootComposition]);

  const pasteCopiedComposition = () => {
    const root = liveModel?.config.rootComposition;
    if (!liveModel || !root || !compositionClipboard || pasteReview) return;
    const parents = new Set(selectedCompositionIds.map((id) => root.nodes.find((node) => node.id === id)?.parentId ?? null));
    if (!placementContext || parents.size > 1 || selectedCompositionIds.some((id) => !root.nodes.some((node) => node.id === id)) || liveModel.selectedObject?.type === "section") {
      liveModel.notify?.("Choose one destination: select a Container to paste inside it, a child to paste after it, or Card Surface for the page.");
      dispatch({ type: "OPEN_RAIL", railId: "layers" });
      return;
    }
    const repeat = lastPaste.current && selectedCompositionIds.length === lastPaste.current.ids.length && selectedCompositionIds.every((id) => lastPaste.current!.ids.includes(id));
    const parentId = repeat ? lastPaste.current!.parentId : placementContext.parentId;
    const siblings = compositionChildren(root, parentId);
    const insertionIndex = repeat ? Math.max(...selectedCompositionIds.map((id) => siblings.findIndex((node) => node.id === id))) + 1 : placementContext.insertionIndex;
    const targetLabel = parentId ? root.nodes.find((node) => node.id === parentId)?.name || "Container" : "Card Surface";
    const result = pasteCompositionNodeSubtree(root, compositionClipboard, parentId, insertionIndex, readRenderedLayeredParentSize(root, parentId));
    if (!result.ok) { liveModel.notify?.(result.issues.map((issue) => issue.message).join(" ")); return; }
    liveModel.beginLiveAdjustment?.();
    liveModel.previewCompositionBlock?.(synchronizeCompositionGroups(result.block));
    setPasteReview({ result, parentId, targetLabel, label: compositionClipboard.label, previousIds: [...selectedCompositionIds] });
  };

  const openLiveDevice = useCallback(() => {
    beginTask("live-device");
    setDevicePanelTab("preview");
    setViewport("phone");
    setLiveDeviceInitialized(true);
    setLiveDeviceActivation((activation) => activation + 1);
    setLiveDeviceOpen(true);
  }, [beginTask]);

  const openPublicQr = useCallback(() => {
    beginTask("live-device");
    setDevicePanelTab("public");
    setLiveDeviceInitialized(true);
    setLiveDeviceOpen(true);
  }, [beginTask]);

  // Session storage is an external shell authority. Restore it before paint so
  // the first Host gesture cannot race a later drawer/inspector replacement.
  /* eslint-disable react-hooks/set-state-in-effect */
  useLayoutEffect(() => {
    const restored = loadStudioShellSession(window.sessionStorage);
    dispatch({ type: "RESTORE", state: restored.drawer });
    setInspectorOpen(restored.inspectorOpen);
    setAssemblyInspectorOpen(Boolean(restored.assemblyInspectorOpen));
    setCompositionInspectorOpen(Boolean(restored.compositionInspectorOpen));
    setInspectorSection(restored.inspectorSection);
    setViewport(restored.viewport);
    workspaceDispatch({ type: "RESTORE", state: restored.adaptiveWorkspace ?? INITIAL_STUDIO_WORKSPACE_STATE });
    setSessionRestored(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!liveDeviceOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setLiveDeviceOpen(false); finishTask(true); }
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [finishTask, liveDeviceOpen]);

  useEffect(() => {
    if (!sessionRestored) return;
    saveStudioShellSession(window.sessionStorage, {
      version: 2,
      drawer,
      inspectorOpen,
      assemblyInspectorOpen,
      compositionInspectorOpen,
      inspectorSection,
      viewport,
      adaptiveWorkspace,
    });
  }, [adaptiveWorkspace, assemblyInspectorOpen, compositionInspectorOpen, drawer, inspectorOpen, inspectorSection, sessionRestored, viewport]);

  useEffect(() => {
    const update = () => setWorkspaceWidth(window.innerWidth);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    const handleCatalogBrowser = (event: Event) => {
      const detail = (event as CustomEvent<{ name?: string; adapterId?: string }>).detail;
      if (!detail?.adapterId) return;
      if (detail.name === consumedCatalogBoundary.current) {
        consumedCatalogBoundary.current = null;
        return;
      }
      if (detail.name === "close") { finishTask(); return; }
      if (detail.name !== "open") return;
      const task = detail.adapterId.startsWith("curated-plugs:") ? "browse-curated-plugs" : detail.adapterId === "surface-treatments" ? "browse-surface" : "browse-assets";
      if (drawer.activeRailId === "add") beginNestedTask(task);
      else beginTask(task);
    };
    window.addEventListener("tapconnect:studio-catalog-browser", handleCatalogBrowser);
    return () => window.removeEventListener("tapconnect:studio-catalog-browser", handleCatalogBrowser);
  }, [beginNestedTask, beginTask, drawer.activeRailId, finishTask]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/studio/activity?consumer=card-composer&context=button-presentation&resourceKind=button-presentation&limit=8")
      .then(async (response) => {
        if (!response.ok) throw new Error("recent read failed");
        const body = await response.json() as { recents?: StudioRecentResource[] };
        if (!cancelled) { setRecents(body.recents ?? []); setRecentsState("ready"); }
      })
      .catch(() => { if (!cancelled) setRecentsState("error"); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (pendingPostInsert && selectedCanonicalNode?.id === pendingPostInsert.id) {
      let cancelled = false;
      queueMicrotask(() => {
        if (cancelled) return;
        if (pendingPostInsert.refine === "button") {
          beginTask("refine-selection");
          setInspectorOpen(true);
          setInspectorSection("content");
        } else if (pendingPostInsert.refine === "composition") {
          beginTask("refine-selection");
          setCompositionInspectorOpen(true);
        }
        setPendingPostInsert(null);
      });
      return () => { cancelled = true; };
    }
    if (!selectedButton && !pendingPostInsert) {
      let cancelled = false;
      queueMicrotask(() => { if (!cancelled) setInspectorOpen(false); });
      return () => { cancelled = true; };
    }
  }, [beginTask, pendingPostInsert, selectedButton, selectedCanonicalNode?.id]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      if (!selectedAssembly) setAssemblyInspectorOpen(false);
    });
    return () => { cancelled = true; };
  }, [selectedAssembly]);

  useEffect(() => {
    if (selectedCanonicalNode || selectionTarget?.semanticKind === "card-surface") return;
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) setCompositionInspectorOpen(false); });
    return () => { cancelled = true; };
  }, [selectedCanonicalNode, selectionTarget?.semanticKind]);

  const markRecent = useCallback((resource: StandardButtonDiscoveryResource, operation: StudioResourceUsageOperation) => {
    fetch("/api/studio/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resource: resource.ref, resourceKind: resource.kind, consumer: "card-composer", context: "button-presentation", operation }),
    }).then(async (response) => {
      if (!response.ok) return;
      const body = await response.json() as { recent?: StudioRecentResource };
      if (!body.recent) return;
      setRecents((current) => [body.recent!, ...current.filter((item) => item.resource.provider !== resource.ref.provider || item.resource.resourceId !== resource.ref.resourceId)].slice(0, 8));
      setRecentsState("ready");
    }).catch(() => undefined);
  }, []);

  const applyResource = useCallback((resource: StandardButtonDiscoveryResource, frame?: { x?: number; y?: number; width: number; height: number }) => {
    if (!liveModel) return;
    const props: Record<string, unknown> = { ...resource.application.presentation, presentationProvenance: studioPresentationProvenance(resource) };
    if (drawer.placementMode === "apply" && drawer.applyTargetId) {
      const applied = liveModel.onApplyPresentationResource?.(drawer.applyTargetId, resource, "apply");
      if (applied?.ok) {
        markRecent(resource, "apply");
        dispatch({ type: "END_APPLY" });
        dispatch({ type: "CLOSE" });
        completeTaskWithoutRestore();
        workspaceDispatch({ type: "BEGIN_EXPLICIT_TASK", taskId: "tune-selection", context: captureContext("compose-card") });
        setInspectorOpen(true);
        setInspectorSection("appearance");
      }
      return;
    }
    const placementFrame = frame ?? { width: Number(props.width ?? 0.52), height: Number(props.height ?? 0.09) };
    const parentId = placementContext?.parentId ?? null;
    const addedId = liveModel.config.rootComposition?.parentAuthority
      ? liveModel.onAddCompositionModule?.("button", parentId, props, placementContext?.insertionIndex, placementFrame)
      : liveModel.onAddElement?.("button", null, props, placementFrame);
    if (!addedId) return;
    markRecent(resource, "place");
    setPendingPostInsert({ id: addedId, refine: "button" });
    dispatch({ type: "CLOSE" });
    workspaceDispatch({ type: "COMPLETE_AUTHORING_TRANSACTION" });
  }, [captureContext, completeTaskWithoutRestore, drawer.applyTargetId, drawer.placementMode, liveModel, markRecent, placementContext]);

  const completePlacement = useCallback((id: string, refine: "button" | "composition" | "curated") => {
    setPendingPostInsert({ id, refine });
    dispatch({ type: "CLOSE" });
    workspaceDispatch({ type: "COMPLETE_AUTHORING_TRANSACTION" });
  }, []);

  const placeOrdinaryModule = useCallback((kind: "text" | "image" | "video" | "map" | "divider", initialProps: Record<string, unknown> = {}) => {
    if (!liveModel || !placementContext) return;
    const id = liveModel.onAddCompositionModule?.(kind, placementContext.parentId, initialProps, placementContext.insertionIndex);
    if (id) {
      completePlacement(id, "composition");
      if (kind === "text" && typeof initialProps.textRole === "string") void fetch("/api/studio/activity", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ resource: { provider: "tapconnect-text", resourceId: `role:${initialProps.textRole}`, version: 1 }, resourceKind: "text-role", consumer: "card-composer", context: "text-role", operation: "place" }) }).catch(() => undefined);
    }
  }, [completePlacement, liveModel, placementContext]);

  const placeCompactGrid = useCallback(() => {
    if (!liveModel || !placementContext) return;
    const state = compactActionGridProofFixture();
    const id = liveModel.onAddCompositionModule?.(
      "button",
      placementContext.parentId,
      compactActionGridNodeProps(state),
      placementContext.insertionIndex,
      { width: 1, height: 0.42 },
    );
    if (id) completePlacement(id, "button");
  }, [completePlacement, liveModel, placementContext]);

  const chooseImageForPlacement = useCallback(() => {
    if (!sharedMediaBrowser) {
      liveModel?.notify?.("The shared Asset browser is unavailable in this workspace.");
      return;
    }
    sharedMediaBrowser.openBrowser({
      mediaUploadReady: Boolean(liveModel?.mediaUploadReady),
      stockReady: Boolean(liveModel?.stockReady),
      selectionKind: "photo",
      title: "Choose an image for your Card",
      onSelect: (asset: MediaAssetCandidate) => {
        consumedCatalogBoundary.current = "close";
        placeOrdinaryModule("image", {
          elementKind: "image",
          src: asset.url,
          mediaSrc: asset.url,
          mediaAssetId: asset.mediaAssetId || asset.id,
          alt: asset.label || "Card image",
          fit: "cover",
          assetProvenance: { source: asset.source, sourceLabel: asset.sourceLabel, sourceUrl: asset.sourceUrl },
        });
      },
    });
  }, [liveModel, placeOrdinaryModule, sharedMediaBrowser]);

  const placeContainer = useCallback((treatment: "transparent" | "solid" | "smoked_glass" | "image") => {
    if (!liveModel?.config.rootComposition) return;
    const selected = liveModel.selectedCompositionNode;
    const parentId = selected?.compositionKind === "container" ? selected.id : selected?.parentId ?? null;
    const siblings = compositionChildren(liveModel.config.rootComposition, parentId);
    const selectedSibling = selected && (selected.parentId ?? null) === parentId ? selected : null;
    const insertionIndex = selectedSibling ? siblings.findIndex((node) => node.id === selectedSibling.id) + 1 : siblings.length;
    const id = liveModel.onAddCompositionContainer?.(treatment, parentId, Math.max(0, insertionIndex));
    if (id) completePlacement(id, "composition");
  }, [completePlacement, liveModel]);

  const placeCurated = useCallback((familyId: string, presentationId: string) => {
    if (!liveModel || !placementContext) return;
    const result = liveModel.onInsertCuratedAssembly?.(familyId, presentationId, placementContext.parentId, placementContext.insertionIndex);
    if (!result?.ok) {
      if (result) liveModel.notify?.(result.message);
      return;
    }
    completePlacement(result.selectedNodeId, "curated");
  }, [completePlacement, liveModel, placementContext]);

  const onDrop = (event: React.DragEvent<HTMLDivElement>) => {
    const raw = event.dataTransfer.getData("application/x-tapconnect-studio-resource");
    let ref: StudioResourceReference | null = null;
    try { ref = JSON.parse(raw) as StudioResourceReference; } catch { return; }
    if (!ref) return;
    const resource = buttonResources.find((candidate) => candidate.ref.provider === ref.provider && candidate.ref.resourceId === ref.resourceId);
    if (!resource) return;
    event.preventDefault();
    const bounds = canvasRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const resolved = resource.application.presentation;
    const width = Number(resolved.width ?? 0.52);
    const height = Number(resolved.height ?? 0.09);
    applyResource(resource, {
      x: Math.max(0, Math.min(1 - width, (event.clientX - bounds.left) / bounds.width - width / 2)),
      y: Math.max(0, Math.min(1 - height, (event.clientY - bounds.top) / bounds.height - height / 2)),
      width,
      height,
    });
  };

  const openInspector = (section: ButtonInspectorSection) => {
    beginContextualTask(section === "appearance" || section === "layout" || section === "advanced" ? "tune-selection" : "refine-selection");
    setAssemblyInspectorOpen(false);
    setCompositionInspectorOpen(false);
    setInspectorSection(section);
    setInspectorOpen(true);
  };
  const openAssemblyInspector = () => {
    beginContextualTask("edit-contents");
    setInspectorOpen(false);
    setCompositionInspectorOpen(false);
    setAssemblyInspectorOpen(true);
  };
  const openCompositionInspector = (task: "refine-selection" | "tune-selection" | "arrange-card" | "edit-contents" = "refine-selection") => {
    beginContextualTask(task);
    setInspectorOpen(false);
    setAssemblyInspectorOpen(false);
    setCompositionInspectorOpen(true);
  };
  const openCardSurfaceAppearance = () => {
    liveModel?.selectCardRoot?.();
    openCompositionInspector("tune-selection");
  };
  const closeContextualSurface = () => {
    setInspectorOpen(false);
    setAssemblyInspectorOpen(false);
    setCompositionInspectorOpen(false);
    finishTask();
  };
  const handleDrawerEvent = (event: StudioDrawerEvent) => {
    if (event.type === "OPEN_RAIL") {
      const togglingClosed = drawer.activeRailId === event.railId && drawer.mode !== "closed";
      if (togglingClosed) finishTask();
      else beginTask(event.railId === "layers" ? "arrange-card" : "browse-add");
      setInspectorOpen(false);
      setAssemblyInspectorOpen(false);
      setCompositionInspectorOpen(false);
    } else if (event.type === "NAVIGATE" && event.path[0] === "buttons") {
      beginTask("browse-buttons");
    } else if (event.type === "CLOSE" || (event.type === "BACK" && drawer.path.length === 0)) {
      // Outline is an object navigator, not a cancelable editor. Preserve the
      // object the Host chose there when the drawer yields back to the canvas;
      // restoring the pre-Outline snapshot made Container selection appear to
      // jump back to Card Surface and broke the hierarchy-to-canvas handoff.
      if (drawer.activeRailId === "layers") completeTaskWithoutRestore();
      else finishTask(event.type === "CLOSE");
    }
    dispatch(event);
  };
  const openPhoneRail = (railId: "add" | "layers") => {
    handleDrawerEvent({ type: "OPEN_RAIL", railId });
  };
  const positionSelection = (command: ButtonPositionCommand) => {
    if (!liveModel || !selectedButton) return;
    const patch = command === "center-x" ? { x: (1 - selectedButton.width) / 2 }
      : command === "center-y" ? { y: (1 - selectedButton.height) / 2 }
        : command === "backward" ? { zIndex: selectedButton.zIndex - 1 }
          : { zIndex: selectedButton.zIndex + 1 };
    liveModel.patchSelection(liveModel.selectionRef, patch, `Changed Button position: ${command.replaceAll("-", " ")}`);
  };

  const outlineYielding = drawer.activeRailId === "layers" && !choreography.outlineVisible;
  const activeRailId = drawer.mode === "closed" || outlineYielding ? null : drawer.activeRailId;
  // A compact authoring viewport has no desktop preview-size controls, so it
  // must render the phone canvas rather than preserve an unreachable desktop mode.
  const effectiveViewport: PreviewViewport = workspaceWidth < 640 ? "phone" : viewport;
  const canvasMaxWidth = effectiveViewport === "phone" ? 390 : effectiveViewport === "tablet" ? 768 : undefined;
  const activePageTitle = liveModel?.experiencePages?.find((page) => page.pageId === liveModel.activeExperiencePageId)?.title || "Card";
  const phonePreviewPage = liveModel?.experience && liveModel.activeExperiencePageId
    ? {
        pageId: liveModel.activeExperiencePageId,
        title: activePageTitle,
        homePageId: liveModel.experience.defaultPageId,
        homeTitle: liveModel.experience.pages.find((page) => page.pageId === liveModel.experience?.defaultPageId)?.title || "Home",
      }
    : null;
  const phonePreviewExperienceName = liveModel?.documentId && liveModel.documentId !== "main-card"
    ? builderProps.initialOpenDocuments?.find((document) => document.id === liveModel.documentId)?.name
      ?? status.cardName
    : status.cardName;
  const semanticStyles = {
    "--studio-semantic-active": STUDIO_SEMANTIC_UI.active.color,
    "--studio-semantic-structure": STUDIO_SEMANTIC_UI.structure.color,
    "--studio-semantic-governance": STUDIO_SEMANTIC_UI.governance.color,
    "--studio-semantic-destructive": STUDIO_SEMANTIC_UI.destructive.color,
  } as CSSProperties;
  const handleClipboardShortcut = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (pasteReview) return;
    if (studioMode !== "edit" || !(event.metaKey || event.ctrlKey) || event.altKey) return;
    if (editableControlOwnsKeyboard(event.nativeEvent)) return;
    if (event.key.toLowerCase() === "c" && selectedCanonicalNode) {
      event.preventDefault();
      copySelectedComposition();
    }

  };

  return (
    <div
      className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-[#060a10] text-white"
      data-testid="studio-reconstitution-shell"
      data-session-restored={sessionRestored ? "true" : "false"}
      data-workspace-contract={adaptiveWorkspace.contractId}
      data-workspace-composition={choreography.composition}
      data-workspace-task={adaptiveWorkspace.activeTaskId}
      data-card-visibility={choreography.cardVisibility}
      data-task-surface={choreography.taskSurface}
      onKeyDownCapture={handleClipboardShortcut}
      onPasteCapture={(event) => {
        if (pasteReview || studioMode !== "edit" || studioEditableOwner(event.target) || !compositionClipboard) return;
        if ([...event.clipboardData.items].some((item) => item.type.startsWith("image/"))) return;
        const token = `tapconnect-studio-selection:${compositionClipboard.rootIds?.join(",") ?? compositionClipboard.rootId}`;
        if (event.clipboardData.getData("text/plain") !== token) return;
        event.preventDefault(); event.stopPropagation(); pasteCopiedComposition();
      }}
      style={semanticStyles}
    >
      <header className="flex min-h-14 shrink-0 items-center gap-2 bg-[#090e16]/96 px-2 shadow-[0_1px_0_rgba(255,255,255,.05)] backdrop-blur-xl md:px-3" data-testid="studio-shell-header">
        <button type="button" onClick={async () => { if (status.dirty && !(await apiRef.current?.save())) return; router.push(doneHref); }} className="grid h-10 w-10 place-items-center rounded-lg hover:bg-white/7" aria-label="Close editor"><X className="h-5 w-5" /></button>
        <div className="min-w-0 flex-1" data-testid="studio-context"><div className="grid min-w-0 grid-cols-3 gap-2"><p className="min-w-0"><span className="block truncate text-[8px] font-semibold uppercase tracking-[.12em] text-white/35">Client / Artist</span><strong className="block truncate text-[11px] font-semibold" data-testid="studio-context-client">{status.clientName}</strong></p><p className="min-w-0"><span className="block truncate text-[8px] font-semibold uppercase tracking-[.12em] text-white/35">Experience</span><strong className="block truncate text-[11px] font-semibold" data-testid="studio-context-experience">{status.cardName || builderProps.businessName}</strong></p><p className="min-w-0"><span className="block truncate text-[8px] font-semibold uppercase tracking-[.12em] text-white/35">Current Page</span><strong className="block truncate text-[11px] font-semibold text-white/72" data-testid="studio-context-page">{activePageTitle}</strong></p></div><p className="mt-0.5 text-[9px] text-white/38">{status.saveState === "saved" ? "Saved" : status.saving ? "Saving…" : status.saveState === "conflict" ? "Recovery needs review" : status.saveState === "failed" ? "Save needs attention" : "Unsaved changes"}</p></div>
        <button type="button" onClick={() => { if (!liveModel?.experience) liveModel?.ensureExperience?.(); setPagesOpen(true); }} className={headerButton} aria-label="Pages" aria-expanded={pagesOpen} data-testid="studio-pages-open"><FileText className="h-4 w-4" /><span className="hidden lg:inline">Pages</span></button>
        <button type="button" disabled={!liveModel} onClick={openCardSurfaceAppearance} className={headerButton} aria-label="Open Card Surface appearance" data-testid="studio-card-surface-open"><Layers3 className="h-4 w-4" /><span className="hidden lg:inline">Surface</span></button>
        <button type="button" disabled={!selectedCanonicalNode || !selectedBlock} onClick={copySelectedComposition} className={headerButton} aria-label="Copy selected Module or Container" title="Copy selected (⌘C)" data-testid="studio-copy-selection"><Copy className="h-4 w-4" /><span className="hidden xl:inline">Copy</span></button>
        <button type="button" disabled={!compositionClipboard || !liveModel?.config.rootComposition} onClick={pasteCopiedComposition} className={headerButton} aria-label="Paste copied Module or Container" title={`Paste into ${placementContext?.targetLabel ?? "selected destination"} (⌘V)`} data-testid="studio-paste-selection"><ClipboardPaste className="h-4 w-4" /><span className="hidden xl:inline">Paste</span></button>
        <button type="button" disabled={!status.canUndo} onClick={() => apiRef.current?.undo()} className={headerButton} aria-label="Undo"><Undo2 className="h-4 w-4" /></button>
        <button type="button" disabled={!status.canRedo} onClick={() => apiRef.current?.redo()} className={headerButton} aria-label="Redo"><Redo2 className="h-4 w-4" /></button>
        <button type="button" aria-label={compositionSelectionMode === "multiple" ? `Cancel Select Multiple · ${selectedCompositionIds.length} selected` : "Select multiple"} aria-pressed={compositionSelectionMode === "multiple"} onClick={() => compositionSelectionMode === "multiple" ? cancelMultipleSelection() : setCompositionSelectionMode("multiple")} className={cn(headerButton, "hidden md:inline-flex", compositionSelectionMode === "multiple" && "bg-[#8bdcff]/14 text-[#c9efff]")} data-testid="studio-select-multiple"><ListChecks className="h-4 w-4" /><span>{compositionSelectionMode === "multiple" ? `${selectedCompositionIds.length} selected` : "Select multiple"}</span></button>
        <button type="button" disabled={status.saving || !status.dirty} onClick={() => void apiRef.current?.save()} className={headerButton} aria-label="Save" data-testid="studio-save"><Save className="h-4 w-4" /><span className="hidden lg:inline">Save</span></button>
        <div className="hidden items-center rounded-lg border border-white/10 p-0.5 sm:flex" role="group" aria-label="Preview size">
          {([['desktop',Monitor],['tablet',Tablet],['phone',Smartphone]] as const).map(([id, Icon]) => <button key={id} type="button" aria-pressed={viewport === id} onClick={() => setViewport(id)} className="grid h-8 w-8 place-items-center rounded aria-pressed:bg-white/10" aria-label={`${id} preview`}><Icon className="h-3.5 w-3.5" /></button>)}
        </div>
        <button type="button" onClick={openLiveDevice} className={headerButton} data-testid="preview-live-device" aria-label="Phone Preview" title="Temporary saved-Draft Phone Preview" aria-expanded={liveDeviceOpen && devicePanelTab === "preview"} aria-controls="studio-live-device-panel"><Smartphone className="h-4 w-4" /><span className="hidden md:inline">Phone Preview</span></button>
        <button type="button" onClick={openPublicQr} className={headerButton} data-testid="studio-public-qr" aria-label="Public QR" title="Permanent published Experience QR" aria-expanded={liveDeviceOpen && devicePanelTab === "public"} aria-controls="studio-live-device-panel"><QrCode className="h-4 w-4" /><span className="hidden md:inline">Public QR</span></button>
        <button type="button" onClick={() => { if (studioMode === "edit") { beginTask("preview-card"); setStudioMode("preview"); } else { setStudioMode("edit"); finishTask(); } }} className={headerButton} data-testid="studio-preview"><Eye className="h-4 w-4" /><span className="hidden lg:inline">{studioMode === "edit" ? "Preview" : "Edit"}</span></button>
        <button type="button" disabled={!status.canPublish || status.dirty} onClick={() => void apiRef.current?.publish()} className="min-h-9 rounded-lg bg-[#b8ff2c] px-3 text-xs font-semibold text-[#07100a] disabled:cursor-not-allowed disabled:opacity-40" data-testid="studio-publish">Publish</button>
      </header>

      {studioMode === "edit" ? <div className="flex min-h-10 shrink-0 items-center justify-between border-b border-white/6 bg-[#0b111b]/88 px-3 md:hidden" data-testid="studio-mobile-selection-strip"><button type="button" aria-pressed={compositionSelectionMode === "multiple"} onClick={() => compositionSelectionMode === "multiple" ? cancelMultipleSelection() : setCompositionSelectionMode("multiple")} className={cn("inline-flex min-h-8 items-center gap-2 rounded-lg px-3 text-[10px] font-semibold", compositionSelectionMode === "multiple" ? "bg-[#8bdcff]/14 text-[#c9efff]" : "text-white/64")} data-testid="studio-select-multiple-mobile"><ListChecks className="h-4 w-4" />{compositionSelectionMode === "multiple" ? `${selectedCompositionIds.length} selected` : "Select multiple"}</button>{compositionSelectionMode === "multiple" ? <button type="button" onClick={cancelMultipleSelection} className="min-h-8 rounded-lg px-3 text-[10px] text-white/58">Cancel</button> : <span className="text-[9px] text-white/32">Canvas + Outline</span>}</div> : null}

      {studioMode === "edit" && status.recoveryState !== "none" ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-amber-300/20 bg-amber-300/[.08] px-4 py-2 text-[11px] text-amber-50" role="status" data-testid="studio-recovery-banner">
          <span className="min-w-0 flex-1">{status.recoveryState === "conflict" ? "A local recovery copy predates the saved Card. Choose which version to continue with." : status.recoveryState === "recoverable" ? "A newer local recovery copy is available." : "An expired local recovery copy can be discarded safely."}</span>
          {status.recoveryState !== "stale" ? <button type="button" onClick={() => apiRef.current?.restoreRecovery()} className="min-h-8 rounded-lg bg-amber-200 px-3 font-semibold text-[#231805]">Restore local copy</button> : null}
          <button type="button" onClick={() => apiRef.current?.discardRecovery()} className="min-h-8 rounded-lg border border-amber-100/25 px-3 font-semibold">Discard local copy</button>
        </div>
      ) : null}

      {status.message ? <div className="shrink-0 border-b border-white/8 bg-white/[.035] px-4 py-2 text-center text-xs text-white/65" role="status">{status.message}</div> : null}

      <div className="relative flex min-h-0 flex-1">
        {studioMode === "edit" && pagesOpen && liveModel?.experience ? <StudioPagesManager model={liveModel} onClose={() => setPagesOpen(false)} /> : null}
        {studioMode === "edit" ? <StudioEditorRail destinations={rail} activeId={activeRailId} onActivate={(id) => handleDrawerEvent({ type: "OPEN_RAIL", railId: id })} /> : null}
        {studioMode === "edit" && !outlineYielding ? <StudioDiscoveryDrawer state={drawer} dispatch={handleDrawerEvent} model={liveModel} brand={brandPreviewContext} familyCatalog={buttonFamilyCatalog} recents={recents} recentsState={recentsState} onUseResource={applyResource} catalogAdapter={activeCatalogAdapter} workspaceComposition={choreography.composition} placementContext={placementContext} onPlaceOrdinary={placeOrdinaryModule} onChooseImage={chooseImageForPlacement} onPlaceContainer={placeContainer} onPlaceCurated={placeCurated} onPlaceCompactGrid={placeCompactGrid} selectMultipleMode={compositionSelectionMode === "multiple"} onToggleSelectMultiple={() => setCompositionSelectionMode((current) => current === "multiple" ? "single" : "multiple")} onCancelSelectMultiple={cancelMultipleSelection} /> : null}

        <main className="relative z-0 isolate flex min-w-0 flex-1 flex-col bg-[radial-gradient(circle_at_50%_18%,#202a38_0%,#151b24_42%,#10151d_100%)]" aria-label="Card canvas">
          {studioMode === "edit" && (multiCompositionSelection || Boolean(activeCompositionGroupId) || selectionTarget?.capabilities.includes("edit-content") || selectionTarget?.capabilities.includes("edit-appearance")) ? (
            <div className={cn("relative z-[2000] min-h-12 shrink-0 items-center border-b border-white/6 bg-[#0b111b]/78 px-3 py-1.5 backdrop-blur", multiCompositionSelection ? "flex overflow-x-auto" : "hidden md:flex")} data-chrome-placement="task-bar">{multiCompositionSelection && selectedBlock ? <CompositionMultiToolbar block={selectedBlock} selectedIds={selectedCompositionIds} compatibility={multiSelectionCompatibility} onOperate={applyMultiSelectionOperation} onGroup={groupSelectedComposition} onCancel={cancelMultipleSelection} /> : selectionTarget?.semanticKind === "card-surface" ? <CardSurfaceToolbar onEdit={() => openCompositionInspector("tune-selection")} /> : activeCompositionGroupId ? <CompositionGroupToolbar count={selectedBlock ? groupMembers(selectedBlock.nodes, activeCompositionGroupId).length : selectedCompositionIds.length} onEdit={() => openCompositionInspector("arrange-card")} onLock={lockSelectedGroup} onUngroup={ungroupSelectedComposition} /> : selectedAssembly ? <CuratedObjectToolbar
              label={selectedAssembly.familyLabel}
              onEdit={openAssemblyInspector}
              onArrange={() => { if (selectedCanonicalNode) openCompositionInspector("arrange-card"); }}
              onCopy={copySelectedComposition}
              onDuplicate={() => { if (selectedCanonicalNode) liveModel?.onDuplicateCompositionNode?.(selectedCanonicalNode.id); else { const sectionId = liveModel?.selectedObject?.sectionId ?? liveModel?.selected?.id; if (sectionId) liveModel?.duplicateSection(sectionId); } }}
              onDelete={() => { if (selectedCanonicalNode) liveModel?.onDeleteCompositionNode?.(selectedCanonicalNode.id); else { const sectionId = liveModel?.selectedObject?.sectionId ?? liveModel?.selected?.id; if (sectionId) liveModel?.deleteSection(sectionId); } }}
            /> : selectedCanonicalNode ? <CompositionObjectToolbar
              label={selectedCanonicalNode.name || (selectedCanonicalNode.compositionKind === "container" ? "Container" : String(selectedCanonicalNode.props.elementKind || selectedCanonicalNode.primitive))}
              editLabel={selectedCanonicalNode.compositionKind === "container" ? "Surface" : undefined}
              onEdit={() => { if (selectedCanonicalNode.primitive === "button") openInspector("content"); else openCompositionInspector("refine-selection"); }}
              onArrange={() => openCompositionInspector("arrange-card")}
              onContents={selectedCanonicalNode.compositionKind === "container" ? () => openCompositionInspector("edit-contents") : undefined}
              onCopy={copySelectedComposition}
              onDuplicate={() => liveModel?.onDuplicateCompositionNode?.(selectedCanonicalNode.id)}
              onDelete={() => { const destructive = selectedCanonicalNode.compositionKind === "container"; if (!destructive || window.confirm("Delete this Container and every Module inside it?")) liveModel?.onDeleteCompositionNode?.(selectedCanonicalNode.id, destructive); }}
            /> : selectedButton ? <StudioSelectionToolbar
              onOpenSection={openInspector}
              onApplyPresentation={() => { dispatch({ type: "CLOSE" }); beginTask("browse-buttons"); dispatch({ type: "OPEN_RAIL", railId: "add" }); dispatch({ type: "NAVIGATE", path: ["buttons"] }); dispatch({ type: "START_APPLY", targetId: selectedButton.id }); }}
              onDuplicate={() => liveModel?.duplicateElements?.([selectedButton.id], liveModel.selectedObject?.sectionId ?? null)}
              onDelete={() => liveModel?.deleteElements?.([selectedButton.id], liveModel.selectedObject?.sectionId ?? null)}
              onPosition={positionSelection}
            /> : null}</div>
          ) : null}
          <div ref={canvasRef} className="flex min-h-0 flex-1 justify-center overflow-auto p-3 md:p-6" onDragOver={(event) => { if (event.dataTransfer.types.includes("application/x-tapconnect-studio-resource")) { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; } }} onDrop={onDrop} data-testid="studio-canvas-drop-zone" data-card-visibility={choreography.cardVisibility}>
            <div className={cn("h-full min-h-[520px] w-full transition-[max-width]", effectiveViewport === "tablet" && "rounded-2xl border border-white/10 shadow-2xl")} style={{ maxWidth: canvasMaxWidth }} data-studio-viewport={effectiveViewport}>
              <TapCardBuilder
                {...builderProps}
                doneHref={doneHref}
                publicCode={publicCode}
                workspaceMode
                escapeMode
                shellHosted
                interactionMode={studioMode}
                compositionSelectionMode={compositionSelectionMode}
                compositionFrameDiagnostics={frameDiagnostics}
                compositionForceMobile={effectiveViewport === "phone"}
                shellFocusMode={studioMode === "preview"}
                onShellApi={(api) => { apiRef.current = api; }}
                onShellStatus={setStatus}
                onRequestTool={() => undefined}
              />
            </div>
          </div>
        </main>

        {studioMode === "edit" && compositionInspectorOpen && selectionTarget?.semanticKind === "card-surface" && liveModel ? <StudioCardSurfaceInspector task={adaptiveWorkspace.activeTaskId === "arrange-card" ? "layout" : "surface"} onTaskChange={task => openCompositionInspector(task === "layout" ? "arrange-card" : "tune-selection")} model={liveModel} brand={brandPreviewContext} onClose={closeContextualSurface} /> : studioMode === "edit" && compositionInspectorOpen && selectedCanonicalNode && liveModel ? <StudioCompositionInspector task={adaptiveWorkspace.activeTaskId === "arrange-card" ? "placement" : adaptiveWorkspace.activeTaskId === "edit-contents" ? "contents" : "surface"} onTaskChange={task => openCompositionInspector(task === "placement" ? "arrange-card" : task === "contents" ? "edit-contents" : "tune-selection")} model={liveModel} node={selectedCanonicalNode} brand={brandPreviewContext} geometryUnit={geometryUnit} onGeometryUnitChange={setGeometryUnit} frameDiagnostics={frameDiagnostics} onFrameDiagnosticsChange={setFrameDiagnostics} onClose={closeContextualSurface} /> : studioMode === "edit" && assemblyInspectorOpen && selectedAssembly && selectedNode ? <StudioAssemblyInspector assembly={selectedAssembly} selectedNodeId={selectedNode.id} mediaUploadReady={liveModel?.mediaUploadReady} stockReady={liveModel?.stockReady} experiencePages={liveModel?.experiencePages} transientTaskLifecycle={transientTaskLifecycle} onBeginLiveAdjustment={liveModel?.beginLiveAdjustment} onCommitLiveAdjustment={(label) => liveModel?.commitLiveAdjustment?.(label)} onCancelLiveAdjustment={liveModel?.cancelLiveAdjustment} onPreviewCommand={(command, mutation) => {
          if (!liveModel || !selectedNode) return;
          const result = liveModel.previewCuratedAssembly?.(selectedNode.id, mutation);
          if (result && !result.ok) liveModel.notify?.(result.message);
        }} onCommand={(command, mutation) => {
          if (!liveModel || !selectedNode) return;
          const label = command.provenance === "tapit" ? `tApIt · ${command.historyLabel}` : command.historyLabel;
          const result = liveModel.onMutateCuratedAssembly?.(selectedNode.id, mutation, label);
          if (result && !result.ok) liveModel.notify?.(result.message);
        }} onClose={closeContextualSurface} /> : studioMode === "edit" && inspectorOpen && selectedButton && liveModel ? (
          <StudioSelectionInspector model={liveModel} node={selectedButton} section={inspectorSection} onSectionChange={setInspectorSection} brandPrimary={brandPreviewContext.primaryColor || brandPreviewContext.accentColor || "#b8ff2c"} onClose={closeContextualSurface} />
        ) : null}

        <dialog ref={pasteDialog} onCancel={(event) => { event.preventDefault(); cancelPaste(); }} aria-labelledby="paste-destination-title" className="fixed inset-0 m-auto max-h-[85dvh] w-[min(440px,calc(100vw-24px))] overflow-auto rounded-2xl border border-white/20 bg-[#0b111b] p-5 text-white shadow-2xl backdrop:bg-black/70" onKeyDown={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}>
          <h2 id="paste-destination-title" className="text-base font-semibold">Make room in {pasteReview?.targetLabel}</h2>
          <p className="my-4 text-sm leading-relaxed text-white/75">{pasteReview?.explanation}</p>
          {pasteReview?.expansion && !pasteReview.expansion.ok ? <p role="alert" className="mb-4 text-sm text-amber-200">{pasteReview.expansion.issues.map((issue) => issue.message).join(" ")}</p> : null}
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => { pasteDialog.current?.close(); cancelPaste(); }} className="min-h-11 rounded-lg border border-white/20 px-4">Cancel paste</button>
            <button type="button" disabled={!pasteReview?.expansion?.ok} onClick={() => { if (pasteReview) { finishPaste(pasteReview, true); pasteDialog.current?.close(); } }} className="min-h-11 rounded-lg bg-[#b8ff2c] px-4 font-semibold text-black disabled:opacity-40">Expand and paste</button>
          </div>
        </dialog>
        {liveDeviceInitialized ? <div className={cn("absolute inset-0 z-[3200] justify-end bg-black/58 backdrop-blur-[2px]", liveDeviceOpen ? "flex" : "hidden")} data-testid="live-device-dock" aria-hidden={!liveDeviceOpen} onPointerDown={(event) => { if (event.target === event.currentTarget) { setLiveDeviceOpen(false); finishTask(); } }}><section id="studio-live-device-panel" role="dialog" aria-modal="true" aria-labelledby="studio-live-device-title" className="flex h-full w-[min(430px,calc(100vw-12px))] flex-col overflow-hidden border-l border-white/10 bg-[#090e16] shadow-[-24px_0_70px_rgba(0,0,0,.5)]" data-testid="studio-live-device-panel"><header className="border-b border-white/8 px-4 py-3"><div className="flex items-center gap-3"><div className="min-w-0 flex-1"><h2 id="studio-live-device-title" className="text-sm font-semibold">Phone / QR</h2><p className="text-[10px] text-white/48">Draft preview and public credential are separate authorities</p></div><button type="button" onClick={() => { setLiveDeviceOpen(false); finishTask(); }} className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/8" aria-label="Close Phone and QR panel"><X className="h-4 w-4" /></button></div><div className="mt-3 grid grid-cols-2 gap-1 rounded-xl border border-white/8 bg-black/20 p-1" role="tablist" aria-label="Phone and QR modes"><button type="button" role="tab" aria-selected={devicePanelTab === "preview"} onClick={() => { setDevicePanelTab("preview"); setViewport("phone"); setLiveDeviceActivation((activation) => activation + 1); }} className="min-h-9 rounded-lg px-3 text-xs text-white/55 aria-selected:bg-white/10 aria-selected:text-white" data-testid="studio-phone-preview-tab">Phone Preview<span className="block text-[8px] opacity-55">Temporary Draft</span></button><button type="button" role="tab" aria-selected={devicePanelTab === "public"} onClick={() => setDevicePanelTab("public")} className="min-h-9 rounded-lg px-3 text-xs text-white/55 aria-selected:bg-[#b8ff2c]/10 aria-selected:text-[#d9ff8e]" data-testid="studio-public-qr-tab">Public QR<span className="block text-[8px] opacity-55">Permanent / published</span></button></div></header><div className="min-h-0 flex-1 overflow-y-auto">{devicePanelTab === "preview" ? <LiveDeviceQrPanel config={liveModel?.experience ? canonicalizeExperienceConfig(liveModel.config, liveModel.activeExperiencePageId) : liveModel?.config || builderProps.initialConfig} profile={builderProps.profile} businessName={builderProps.businessName} cardName={phonePreviewExperienceName} brandKitId={builderProps.brandKitId} logoUrl={builderProps.logoUrl} reviewUrl={builderProps.reviewUrl} revision={devicePreviewRevision} documentId={liveModel?.documentId} currentPage={phonePreviewPage} draftSaved={!status.dirty && !status.saving} activationKey={liveDeviceActivation} /> : <PublicQrCredentialPanel experienceId={liveModel?.documentId ?? status.activeDocumentId} experienceName={phonePreviewExperienceName} />}</div></section></div> : null}
      </div>

      {studioMode === "edit" ? (
        <nav className="z-50 grid h-16 shrink-0 grid-cols-6 border-t border-white/10 bg-[#0b111b] md:hidden" aria-label="Phone editor tools" data-testid="studio-phone-toolbar">
          <PhoneTool icon={Plus} label="Add" onClick={() => openPhoneRail("add")} />
          <PhoneTool icon={ListChecks} label={compositionSelectionMode === "multiple" ? `${selectedCompositionIds.length} selected` : "Select"} onClick={() => compositionSelectionMode === "multiple" ? cancelMultipleSelection() : setCompositionSelectionMode("multiple")} />
          {multiCompositionSelection ? <PhoneTool icon={Layers3} label="Group" onClick={groupSelectedComposition} /> : <PhoneTool icon={Eye} label={activeCompositionGroupId ? "Group" : selectedCanonicalNode?.compositionKind === "container" || selectionTarget?.semanticKind === "card-surface" ? "Surface" : "Edit"} disabled={!activeCompositionGroupId && !selectionTarget?.capabilities.includes("edit-content") && !selectionTarget?.capabilities.includes("edit-appearance")} onClick={() => { if (activeCompositionGroupId) openCompositionInspector("arrange-card"); else if (selectionTarget?.semanticKind === "card-surface") openCompositionInspector("tune-selection"); else if (selectedAssembly) openAssemblyInspector(); else if (selectedCanonicalNode && selectedCanonicalNode.primitive !== "button") openCompositionInspector("refine-selection"); else openInspector("content"); }} />}
          <PhoneTool icon={Layers3} label="Outline" onClick={() => openPhoneRail("layers")} />
          <PhoneTool icon={Eye} label="Preview" onClick={() => { beginTask("preview-card"); setStudioMode("preview"); }} />
          <PhoneTool icon={activeCompositionGroupId || selectionTarget?.capabilities.includes("move-directly") ? Move : MoreHorizontal} label="Position" disabled={!activeCompositionGroupId && !selectionTarget?.capabilities.includes("position")} onClick={() => activeCompositionGroupId || selectedCanonicalNode ? openCompositionInspector("arrange-card") : selectedButton ? openInspector("layout") : undefined} />
        </nav>
      ) : (
        <nav className="z-50 flex h-16 shrink-0 items-center justify-between gap-3 border-t border-white/10 bg-[#0b111b] px-3 md:hidden" aria-label="Phone preview tools">
          <span className="text-xs text-white/55">Draft Preview</span>
          <button type="button" onClick={() => { setStudioMode("edit"); finishTask(); }} className="min-h-11 rounded-xl bg-white/10 px-4 text-sm font-semibold text-white hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#b8ff2c]" data-testid="studio-phone-exit-preview">Back to editing</button>
        </nav>
      )}
    </div>
  );
}

function CuratedObjectToolbar({ label, onEdit, onArrange, onCopy, onDuplicate, onDelete }: {
  label: string;
  onEdit: () => void;
  onArrange: () => void;
  onCopy: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const iconButton = "grid h-9 w-9 place-items-center rounded-full text-white/62 transition hover:bg-white/8 hover:text-white";
  return <div className="flex items-center gap-1 rounded-full bg-[#0b111b]/92 p-1.5 shadow-[0_12px_36px_rgba(0,0,0,.35)] ring-1 ring-white/8 backdrop-blur-xl" data-testid="studio-curated-object-toolbar"><button type="button" onClick={onEdit} className="min-h-9 rounded-full bg-[#b8ff2c] px-4 text-xs font-semibold text-[#07100a]" data-testid="studio-curated-selection-identity">Edit Contents · {label}</button><button type="button" onClick={onArrange} className="flex min-h-11 items-center gap-2 rounded-full px-3 text-xs text-white/80 hover:bg-white/8" aria-label="Position and size Curated System"><Move className="h-4 w-4" />Position / Size</button><StudioTransientMenu label="More Curated System actions">{(close) => <><button type="button" role="menuitem" onClick={() => { close(); onCopy(); }} className="flex min-h-9 w-full items-center gap-2 rounded-lg px-3 text-left text-xs hover:bg-white/8" data-testid="studio-curated-copy"><Copy className="h-4 w-4" />Copy to another Page</button><button type="button" role="menuitem" onClick={() => { close(); onDuplicate(); }} className="flex min-h-9 w-full items-center gap-2 rounded-lg px-3 text-left text-xs hover:bg-white/8"><Copy className="h-4 w-4" />Duplicate here</button><button type="button" role="menuitem" onClick={() => { close(); onDelete(); }} className="flex min-h-9 w-full items-center gap-2 rounded-lg px-3 text-left text-xs text-rose-200 hover:bg-rose-300/10"><Trash2 className="h-4 w-4" />Delete</button></>}</StudioTransientMenu></div>;
}

function CardSurfaceToolbar({ onEdit }: { onEdit: () => void }) {
  return <div className="flex items-center gap-2 rounded-full bg-[#0b111b]/92 p-1.5 shadow-[0_12px_36px_rgba(0,0,0,.35)] ring-1 ring-white/8 backdrop-blur-xl" data-testid="studio-card-surface-toolbar"><span className="px-3 text-[10px] font-semibold uppercase tracking-[.12em] text-white/48">Card Surface</span><button type="button" onClick={onEdit} className="min-h-9 rounded-full bg-[#b8ff2c] px-4 text-xs font-semibold text-[#07100a]">Refine surface</button></div>;
}

function CompositionMultiToolbar({ block, selectedIds, compatibility, onOperate, onGroup, onCancel }: { block: CreativeCompositionBlock; selectedIds: string[]; compatibility: ReturnType<typeof selectionGeometryCompatibility>; onOperate: (operation: StudioSelectionGeometryOperation) => void; onGroup: () => void; onCancel: () => void }) {
  const count = selectedIds.length;
  const operation = (value: StudioSelectionGeometryOperation) => ({
    ...selectionOperationAvailability(block, selectedIds, value),
    run: () => onOperate(value),
  });
  const groupable = compatibility.compatible && compatibility.nodes.every((node) => node.compositionKind !== "container" && node.props.componentKind !== "container" && !node.props.containerId);
  const groupReason = groupable ? null : compatibility.reason || "Groups can contain compatible sibling Modules, not Containers or descendants.";
  const menuButton = "flex min-h-9 w-full items-center rounded-lg px-3 text-left text-xs hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-35";
  const alignModes: Array<{ mode: AlignMode; label: string }> = [
    { mode: "left", label: "Left" }, { mode: "center", label: "Center" }, { mode: "right", label: "Right" },
    { mode: "top", label: "Top" }, { mode: "middle", label: "Middle" }, { mode: "bottom", label: "Bottom" },
  ];
  return <div className="flex min-w-max items-center gap-1 rounded-full bg-[#0b111b]/92 p-1.5 shadow-[0_12px_36px_rgba(0,0,0,.35)] ring-1 ring-white/8 backdrop-blur-xl" data-testid="studio-composition-multi-toolbar">
    <span className="px-3 text-[10px] font-semibold uppercase tracking-[.12em] text-[#a9e7ff]" role="status" aria-live="polite">{count} selected · Reference: {block.nodes.find(n => n.id === selectedIds[0])?.name || selectedIds[0]}</span>
    <StudioTransientMenu label="Align selection">{(close) => <>{alignModes.map(({ mode, label }) => { const action = operation({ kind: "align", mode }); return <button key={mode} type="button" role="menuitem" disabled={!action.enabled} title={action.reason || `Align ${label} using selection placement bounds`} onClick={() => { close(); action.run(); }} className={menuButton} data-testid={`studio-multi-align-${mode}`}>{label}</button>; })}</>}</StudioTransientMenu>
    <StudioTransientMenu label="Distribute selection">{(close) => <>{(["horizontal", "vertical"] as const).map((axis) => { const action = operation({ kind: "distribute", axis }); return <button key={axis} type="button" role="menuitem" disabled={!action.enabled} title={action.reason || undefined} onClick={() => { close(); action.run(); }} className={menuButton} data-testid={`studio-multi-distribute-${axis}`}>{axis === "horizontal" ? "Horizontal" : "Vertical"}</button>; })}</>}</StudioTransientMenu>
    <StudioTransientMenu label="Match selection size">{(close) => <>{(["width", "height", "both"] as const).map((mode) => { const action = operation({ kind: "match", mode }); return <button key={mode} type="button" role="menuitem" disabled={!action.enabled} title={action.reason || undefined} onClick={() => { close(); action.run(); }} className={menuButton} data-testid={`studio-multi-match-${mode}`}>{mode === "both" ? "Width & height" : mode[0].toUpperCase() + mode.slice(1)}</button>; })}</>}</StudioTransientMenu>
    <StudioTransientMenu label="More selection actions">{(close) => <>{alignModes.map(({ mode, label }) => { const action = operation({ kind: "align-parent", mode }); return <button key={`parent-${mode}`} type="button" role="menuitem" disabled={!action.enabled} title={action.reason || `Align ${label} to the active parent`} onClick={() => { close(); action.run(); }} className={menuButton} data-testid={`studio-multi-align-parent-${mode}`}>Parent · {label}</button>; })}{(() => { const action = operation({ kind: "tidy" }); return <button type="button" role="menuitem" disabled={!action.enabled} title={action.reason || undefined} onClick={() => { close(); action.run(); }} className={menuButton} data-testid="studio-multi-tidy">Tidy</button>; })()}</>}</StudioTransientMenu>
    <button type="button" onClick={onGroup} disabled={!groupable} title={groupReason || undefined} className="min-h-9 rounded-full bg-[#b8ff2c] px-4 text-xs font-semibold text-[#07100a] disabled:opacity-35" data-testid="studio-composition-group-selected"><Layers3 className="mr-1 inline h-3.5 w-3.5" />Group</button>
    <button type="button" onClick={onCancel} className="min-h-9 rounded-full px-3 text-xs text-white/68 hover:bg-white/8">Cancel</button>
    {!compatibility.compatible ? <span className="max-w-52 px-2 text-[9px] text-amber-200/80" data-testid="studio-multi-selection-reason">{compatibility.reason}</span> : null}
  </div>;
}

function CompositionGroupToolbar({ count, onEdit, onLock, onUngroup }: { count: number; onEdit: () => void; onLock: () => void; onUngroup: () => void }) {
  return <div className="flex items-center gap-1 rounded-full bg-[#0b111b]/92 p-1.5 shadow-[0_12px_36px_rgba(0,0,0,.35)] ring-1 ring-white/8 backdrop-blur-xl" data-testid="studio-composition-group-toolbar"><span className="px-3 text-[10px] font-semibold uppercase tracking-[.12em] text-[#d8ff82]">Group · {count} Modules</span><button type="button" onClick={onEdit} className="min-h-9 rounded-full bg-[#b8ff2c] px-4 text-xs font-semibold text-[#07100a]">Move / Resize</button><button type="button" onClick={onEdit} className="min-h-9 rounded-full px-3 text-xs text-white/68 hover:bg-white/8">Layer</button><button type="button" onClick={onLock} className="min-h-9 rounded-full px-3 text-xs text-white/68 hover:bg-white/8">Lock</button><button type="button" onClick={onUngroup} className="min-h-9 rounded-full px-3 text-xs text-white/68 hover:bg-white/8">Ungroup</button></div>;
}

function CompositionObjectToolbar({ label, editLabel, onEdit, onArrange, onContents, onCopy, onDuplicate, onDelete }: {
  label: string;
  editLabel?: string;
  onEdit: () => void;
  onArrange: () => void;
  onContents?: () => void;
  onCopy: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const iconButton = "grid h-9 w-9 place-items-center rounded-full text-white/62 transition hover:bg-white/8 hover:text-white";
  return <div className="flex items-center gap-1 rounded-full bg-[#0b111b]/92 p-1.5 shadow-[0_12px_36px_rgba(0,0,0,.35)] ring-1 ring-white/8 backdrop-blur-xl" data-testid="studio-composition-object-toolbar"><button type="button" onClick={onEdit} className="min-h-9 rounded-full bg-[#b8ff2c] px-4 text-xs font-semibold text-[#07100a]">{editLabel || `Edit · ${label}`}</button><button type="button" onClick={onArrange} className="flex min-h-11 items-center gap-1.5 rounded-full px-3 text-xs text-white/80 hover:bg-white/10" aria-label={onContents ? "Open Placement" : "Open Position"}><Move className="h-4 w-4" /><span>{onContents ? "Placement" : "Position"}</span></button>{onContents ? <button type="button" onClick={onContents} className="min-h-11 rounded-full px-3 text-xs text-white/80 hover:bg-white/10">Contents</button> : null}<StudioTransientMenu label={`More actions for ${label}`}>{(close) => <><button type="button" role="menuitem" onClick={() => { close(); onCopy(); }} className="flex min-h-9 w-full items-center gap-2 rounded-lg px-3 text-left text-xs hover:bg-white/8" data-testid="studio-composition-copy"><Copy className="h-4 w-4" />Copy to another Page</button><button type="button" role="menuitem" onClick={() => { close(); onDuplicate(); }} className="flex min-h-9 w-full items-center gap-2 rounded-lg px-3 text-left text-xs hover:bg-white/8"><Copy className="h-4 w-4" />Duplicate here</button><button type="button" role="menuitem" onClick={() => { close(); onDelete(); }} className="flex min-h-9 w-full items-center gap-2 rounded-lg px-3 text-left text-xs text-rose-200 hover:bg-rose-300/10"><Trash2 className="h-4 w-4" />Delete</button></>}</StudioTransientMenu></div>;
}

function PhoneTool({ icon: Icon, label, onClick, disabled = false }: { icon: typeof Plus; label: string; onClick: () => void; disabled?: boolean }) {
  return <button type="button" disabled={disabled} onClick={onClick} className="flex flex-col items-center justify-center gap-1 text-[10px] text-white/65 disabled:opacity-35"><Icon className="h-5 w-5" /><span>{label}</span></button>;
}

const headerButton = "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl px-2 text-xs text-white/62 hover:bg-white/7 hover:text-white disabled:cursor-not-allowed disabled:opacity-30";

function activeElementIdentity(element: HTMLElement): string | null {
  const existing = element.dataset.studioFocus || element.dataset.testid || element.id;
  if (!existing) return null;
  element.dataset.studioFocus = existing;
  return existing;
}
