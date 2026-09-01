"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { Copy, Eye, Layers3, MoreHorizontal, Move, Plus, QrCode, Redo2, Save, Smartphone, Tablet, Monitor, Trash2, Undo2, X } from "lucide-react";
import { TapCardBuilder, type CardBuilderShellApi, type CardBuilderShellStatus } from "@/components/card/tap-card-builder";
import { LiveDeviceQrPanel } from "@/components/fusion/creative-studio/live-device-qr-panel";
import { getCardEditorLive, subscribeCardEditorLive } from "@/components/fusion/card/card-editor-live";
import type { CardAuthoringWorkspaceProps } from "@/components/fusion/card/card-authoring-workspace";
import { StudioEditorRail } from "./studio-editor-rail";
import { StudioDiscoveryDrawer, type StandardButtonDiscoveryResource } from "./studio-discovery-drawer";
import { StudioSelectionInspector } from "./studio-selection-inspector";
import { StudioSelectionToolbar, type ButtonInspectorSection, type ButtonPositionCommand } from "./studio-selection-toolbar";
import { StudioAssemblyInspector } from "./studio-assembly-inspector";
import { StudioCompositionInspector } from "./studio-composition-inspector";
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
import { compositionChildren } from "@/lib/fusion/card/composition-parent-authority";

type Props = CardAuthoringWorkspaceProps & {
  brandPreviewContext: BrandPreviewContext;
  buttonFamilyCatalog: StudioButtonFamilyCatalog;
  railReadiness?: StudioRailReadinessOverrides;
};

const INITIAL_STATUS: CardBuilderShellStatus = {
  dirty: false, saving: false, focusMode: false, canUndo: false, canRedo: false,
  message: null, lifecycleStatus: "active", brandSource: "Brand Kit", selectedId: null,
  sectionCount: 0, cardName: "Card", pastLabels: [], futureLabels: [], canPublish: false,
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
  const [liveDeviceOpen, setLiveDeviceOpen] = useState(false);
  const [liveDeviceInitialized, setLiveDeviceInitialized] = useState(false);
  const [liveDeviceActivation, setLiveDeviceActivation] = useState(0);
  const [recents, setRecents] = useState<StudioRecentResource[]>([]);
  const [recentsState, setRecentsState] = useState<"loading" | "ready" | "error">("loading");
  const [sessionRestored, setSessionRestored] = useState(false);
  const [pendingPostInsert, setPendingPostInsert] = useState<{ id: string; refine: "button" | "composition" | "curated" } | null>(null);
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
  const devicePreviewRevision = (liveModel?.revision ?? builderProps.initialDraftRevision ?? 1) + (status.dirty ? 1 : 0);
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

  const openLiveDevice = useCallback(() => {
    beginTask("live-device");
    setViewport("phone");
    setLiveDeviceInitialized(true);
    setLiveDeviceActivation((activation) => activation + 1);
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
    if (selectedCanonicalNode) return;
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) setCompositionInspectorOpen(false); });
    return () => { cancelled = true; };
  }, [selectedCanonicalNode]);

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
      ? liveModel.onAddCompositionModule?.("button", parentId, props, placementContext?.insertionIndex)
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

  const placeOrdinaryModule = useCallback((kind: "text" | "image" | "divider", initialProps: Record<string, unknown> = {}) => {
    if (!liveModel || !placementContext) return;
    const id = liveModel.onAddCompositionModule?.(kind, placementContext.parentId, initialProps, placementContext.insertionIndex);
    if (id) completePlacement(id, "composition");
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
    const rootSiblings = compositionChildren(liveModel.config.rootComposition, null);
    const selectedRoot = selected?.parentId === null ? selected : selected?.parentId ? liveModel.config.rootComposition.nodes.find((node) => node.id === selected.parentId) : null;
    const rootIndex = selectedRoot ? rootSiblings.findIndex((node) => node.id === selectedRoot.id) + 1 : rootSiblings.length;
    const id = liveModel.onAddCompositionContainer?.(treatment, Math.max(0, rootIndex));
    if (id) completePlacement(id, "composition");
  }, [completePlacement, liveModel]);

  const placeCurated = useCallback((familyId: string, layoutMode: "standalone" | "single-stack" | "twin-rail") => {
    if (!liveModel || !placementContext) return;
    const result = liveModel.onInsertCuratedAssembly?.(familyId, layoutMode, placementContext.parentId, placementContext.insertionIndex);
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
  const openCompositionInspector = (task: "refine-selection" | "tune-selection" | "arrange-card" = "refine-selection") => {
    beginContextualTask(task);
    setInspectorOpen(false);
    setAssemblyInspectorOpen(false);
    setCompositionInspectorOpen(true);
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
      finishTask(event.type === "CLOSE");
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
  const canvasMaxWidth = viewport === "phone" ? 390 : viewport === "tablet" ? 768 : undefined;
  const semanticStyles = {
    "--studio-semantic-active": STUDIO_SEMANTIC_UI.active.color,
    "--studio-semantic-structure": STUDIO_SEMANTIC_UI.structure.color,
    "--studio-semantic-governance": STUDIO_SEMANTIC_UI.governance.color,
    "--studio-semantic-destructive": STUDIO_SEMANTIC_UI.destructive.color,
  } as CSSProperties;

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
      style={semanticStyles}
    >
      <header className="flex min-h-14 shrink-0 items-center gap-2 bg-[#090e16]/96 px-2 shadow-[0_1px_0_rgba(255,255,255,.05)] backdrop-blur-xl md:px-3" data-testid="studio-shell-header">
        <button type="button" onClick={async () => { if (status.dirty && !(await apiRef.current?.save())) return; router.push(doneHref); }} className="grid h-10 w-10 place-items-center rounded-lg hover:bg-white/7" aria-label="Close editor"><X className="h-5 w-5" /></button>
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{status.cardName || builderProps.businessName}</p><p className="text-[10px] text-white/45">{status.saveState === "saved" ? "Saved" : status.saving ? "Saving…" : status.saveState === "conflict" ? "Recovery needs review" : status.saveState === "failed" ? "Save needs attention" : "Unsaved changes"}</p></div>
        <button type="button" disabled={!status.canUndo} onClick={() => apiRef.current?.undo()} className={headerButton} aria-label="Undo"><Undo2 className="h-4 w-4" /></button>
        <button type="button" disabled={!status.canRedo} onClick={() => apiRef.current?.redo()} className={headerButton} aria-label="Redo"><Redo2 className="h-4 w-4" /></button>
        <button type="button" disabled={status.saving || !status.dirty} onClick={() => void apiRef.current?.save()} className={headerButton} aria-label="Save" data-testid="studio-save"><Save className="h-4 w-4" /><span className="hidden lg:inline">Save</span></button>
        <div className="hidden items-center rounded-lg border border-white/10 p-0.5 sm:flex" role="group" aria-label="Preview size">
          {([['desktop',Monitor],['tablet',Tablet],['phone',Smartphone]] as const).map(([id, Icon]) => <button key={id} type="button" aria-pressed={viewport === id} onClick={() => setViewport(id)} className="grid h-8 w-8 place-items-center rounded aria-pressed:bg-white/10" aria-label={`${id} preview`}><Icon className="h-3.5 w-3.5" /></button>)}
        </div>
        <button type="button" onClick={openLiveDevice} className={headerButton} data-testid="preview-live-device" aria-expanded={liveDeviceOpen} aria-controls="studio-live-device-panel"><QrCode className="h-4 w-4" /><span className="hidden lg:inline">View on phone</span></button>
        <button type="button" onClick={() => { if (studioMode === "edit") { beginTask("preview-card"); setStudioMode("preview"); } else { setStudioMode("edit"); finishTask(); } }} className={headerButton} data-testid="studio-preview"><Eye className="h-4 w-4" /><span className="hidden lg:inline">{studioMode === "edit" ? "Preview" : "Edit"}</span></button>
        <button type="button" disabled={!status.canPublish || status.dirty} onClick={() => void apiRef.current?.publish()} className="min-h-9 rounded-lg bg-[#b8ff2c] px-3 text-xs font-semibold text-[#07100a] disabled:cursor-not-allowed disabled:opacity-40" data-testid="studio-publish">Publish</button>
      </header>

      {studioMode === "edit" && status.recoveryState !== "none" ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-amber-300/20 bg-amber-300/[.08] px-4 py-2 text-[11px] text-amber-50" role="status" data-testid="studio-recovery-banner">
          <span className="min-w-0 flex-1">{status.recoveryState === "conflict" ? "A local recovery copy predates the saved Card. Choose which version to continue with." : status.recoveryState === "recoverable" ? "A newer local recovery copy is available." : "An expired local recovery copy can be discarded safely."}</span>
          {status.recoveryState !== "stale" ? <button type="button" onClick={() => apiRef.current?.restoreRecovery()} className="min-h-8 rounded-lg bg-amber-200 px-3 font-semibold text-[#231805]">Restore local copy</button> : null}
          <button type="button" onClick={() => apiRef.current?.discardRecovery()} className="min-h-8 rounded-lg border border-amber-100/25 px-3 font-semibold">Discard local copy</button>
        </div>
      ) : null}

      {status.message ? <div className="shrink-0 border-b border-white/8 bg-white/[.035] px-4 py-2 text-center text-xs text-white/65" role="status">{status.message}</div> : null}

      <div className="relative flex min-h-0 flex-1">
        {studioMode === "edit" ? <StudioEditorRail destinations={rail} activeId={activeRailId} onActivate={(id) => handleDrawerEvent({ type: "OPEN_RAIL", railId: id })} /> : null}
        {studioMode === "edit" && !outlineYielding ? <StudioDiscoveryDrawer state={drawer} dispatch={handleDrawerEvent} model={liveModel} brand={brandPreviewContext} familyCatalog={buttonFamilyCatalog} recents={recents} recentsState={recentsState} onUseResource={applyResource} catalogAdapter={activeCatalogAdapter} workspaceComposition={choreography.composition} placementContext={placementContext} onPlaceOrdinary={placeOrdinaryModule} onChooseImage={chooseImageForPlacement} onPlaceContainer={placeContainer} onPlaceCurated={placeCurated} /> : null}

        <main className="relative z-0 isolate flex min-w-0 flex-1 flex-col bg-[radial-gradient(circle_at_50%_18%,#202a38_0%,#151b24_42%,#10151d_100%)]" aria-label="Card canvas">
          {studioMode === "edit" && selectionTarget?.capabilities.includes("edit-content") ? (
            <div className="relative z-[2000] hidden min-h-12 shrink-0 items-center border-b border-white/6 bg-[#0b111b]/78 px-3 py-1.5 backdrop-blur md:flex" data-chrome-placement="task-bar">{selectedAssembly ? <CuratedObjectToolbar
              label={selectedAssembly.familyLabel}
              onEdit={openAssemblyInspector}
              onArrange={() => { if (selectedCanonicalNode) openCompositionInspector("arrange-card"); }}
              onDuplicate={() => { if (selectedCanonicalNode) liveModel?.onDuplicateCompositionNode?.(selectedCanonicalNode.id); else { const sectionId = liveModel?.selectedObject?.sectionId ?? liveModel?.selected?.id; if (sectionId) liveModel?.duplicateSection(sectionId); } }}
              onDelete={() => { if (selectedCanonicalNode) liveModel?.onDeleteCompositionNode?.(selectedCanonicalNode.id); else { const sectionId = liveModel?.selectedObject?.sectionId ?? liveModel?.selected?.id; if (sectionId) liveModel?.deleteSection(sectionId); } }}
            /> : selectedCanonicalNode ? <CompositionObjectToolbar
              label={selectedCanonicalNode.name || (selectedCanonicalNode.compositionKind === "container" ? "Container" : String(selectedCanonicalNode.props.elementKind || selectedCanonicalNode.primitive))}
              onEdit={() => { if (selectedCanonicalNode.primitive === "button") openInspector("content"); else openCompositionInspector("refine-selection"); }}
              onArrange={() => openCompositionInspector("arrange-card")}
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
            <div className={cn("h-full min-h-[520px] w-full transition-[max-width]", viewport === "tablet" && "rounded-2xl border border-white/10 shadow-2xl")} style={{ maxWidth: canvasMaxWidth }} data-studio-viewport={viewport}>
              <TapCardBuilder
                {...builderProps}
                doneHref={doneHref}
                publicCode={publicCode}
                workspaceMode
                escapeMode
                shellHosted
                interactionMode={studioMode}
                compositionForceMobile={viewport === "phone"}
                shellFocusMode={studioMode === "preview"}
                onShellApi={(api) => { apiRef.current = api; }}
                onShellStatus={setStatus}
                onRequestTool={() => undefined}
              />
            </div>
          </div>
        </main>

        {studioMode === "edit" && compositionInspectorOpen && selectedCanonicalNode && liveModel ? <StudioCompositionInspector model={liveModel} node={selectedCanonicalNode} onClose={closeContextualSurface} /> : studioMode === "edit" && assemblyInspectorOpen && selectedAssembly && selectedNode ? <StudioAssemblyInspector assembly={selectedAssembly} selectedNodeId={selectedNode.id} mediaUploadReady={liveModel?.mediaUploadReady} stockReady={liveModel?.stockReady} transientTaskLifecycle={transientTaskLifecycle} onBeginLiveAdjustment={liveModel?.beginLiveAdjustment} onCommitLiveAdjustment={(label) => liveModel?.commitLiveAdjustment?.(label)} onCancelLiveAdjustment={liveModel?.cancelLiveAdjustment} onPreviewCommand={(command, mutation) => {
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

        {liveDeviceInitialized ? <div className={cn("absolute inset-0 z-[3200] justify-end bg-black/58 backdrop-blur-[2px]", liveDeviceOpen ? "flex" : "hidden")} data-testid="live-device-dock" aria-hidden={!liveDeviceOpen} onPointerDown={(event) => { if (event.target === event.currentTarget) { setLiveDeviceOpen(false); finishTask(); } }}><section id="studio-live-device-panel" role="dialog" aria-modal="true" aria-labelledby="studio-live-device-title" className="flex h-full w-[min(430px,calc(100vw-12px))] flex-col overflow-hidden border-l border-white/10 bg-[#090e16] shadow-[-24px_0_70px_rgba(0,0,0,.5)]" data-testid="studio-live-device-panel"><header className="flex min-h-14 items-center gap-3 border-b border-white/8 px-4"><div className="min-w-0 flex-1"><h2 id="studio-live-device-title" className="text-sm font-semibold">Live Device Preview</h2><p className="text-[10px] text-white/48">Scan once. Reopen to reuse an active preview.</p></div><button type="button" onClick={() => { setLiveDeviceOpen(false); finishTask(); }} className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/8" aria-label="Close Live Device Preview"><X className="h-4 w-4" /></button></header><div className="min-h-0 flex-1 overflow-y-auto"><LiveDeviceQrPanel config={liveModel?.config || builderProps.initialConfig} profile={builderProps.profile} businessName={builderProps.businessName} cardName={status.cardName} brandKitId={builderProps.brandKitId} logoUrl={builderProps.logoUrl} reviewUrl={builderProps.reviewUrl} revision={devicePreviewRevision} activationKey={liveDeviceActivation} /></div></section></div> : null}
      </div>

      {studioMode === "edit" ? (
        <nav className="z-50 grid h-16 shrink-0 grid-cols-5 border-t border-white/10 bg-[#0b111b] md:hidden" aria-label="Phone editor tools" data-testid="studio-phone-toolbar">
          <PhoneTool icon={Plus} label="Add" onClick={() => openPhoneRail("add")} />
          <PhoneTool icon={Eye} label="Edit" disabled={!selectionTarget?.capabilities.includes("edit-content")} onClick={() => { if (selectedAssembly) openAssemblyInspector(); else if (selectedCanonicalNode && selectedCanonicalNode.primitive !== "button") openCompositionInspector("refine-selection"); else openInspector("content"); }} />
          <PhoneTool icon={Layers3} label="Outline" onClick={() => openPhoneRail("layers")} />
          <PhoneTool icon={Eye} label="Preview" onClick={() => { beginTask("preview-card"); setStudioMode("preview"); }} />
          <PhoneTool icon={selectionTarget?.capabilities.includes("move-directly") ? Move : MoreHorizontal} label={selectionTarget?.capabilities.includes("move-directly") ? "Move" : "More"} disabled={!selectionTarget?.capabilities.includes("position")} onClick={() => selectedCanonicalNode ? openCompositionInspector("arrange-card") : selectedButton ? openInspector("layout") : undefined} />
        </nav>
      ) : null}
    </div>
  );
}

function CuratedObjectToolbar({ label, onEdit, onArrange, onDuplicate, onDelete }: {
  label: string;
  onEdit: () => void;
  onArrange: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const iconButton = "grid h-9 w-9 place-items-center rounded-full text-white/62 transition hover:bg-white/8 hover:text-white";
  return <div className="flex items-center gap-1 rounded-full bg-[#0b111b]/92 p-1.5 shadow-[0_12px_36px_rgba(0,0,0,.35)] ring-1 ring-white/8 backdrop-blur-xl" data-testid="studio-curated-object-toolbar"><button type="button" onClick={onEdit} className="min-h-9 rounded-full bg-[#b8ff2c] px-4 text-xs font-semibold text-[#07100a]" data-testid="studio-curated-selection-identity">Edit Contents · {label}</button><button type="button" onClick={onArrange} className={iconButton} aria-label="Move Curated System"><Move className="h-4 w-4" /></button><StudioTransientMenu label="More Curated System actions">{(close) => <><button type="button" role="menuitem" onClick={() => { close(); onDuplicate(); }} className="flex min-h-9 w-full items-center gap-2 rounded-lg px-3 text-left text-xs hover:bg-white/8"><Copy className="h-4 w-4" />Duplicate</button><button type="button" role="menuitem" onClick={() => { close(); onDelete(); }} className="flex min-h-9 w-full items-center gap-2 rounded-lg px-3 text-left text-xs text-rose-200 hover:bg-rose-300/10"><Trash2 className="h-4 w-4" />Delete</button></>}</StudioTransientMenu></div>;
}

function CompositionObjectToolbar({ label, onEdit, onArrange, onDuplicate, onDelete }: {
  label: string;
  onEdit: () => void;
  onArrange: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const iconButton = "grid h-9 w-9 place-items-center rounded-full text-white/62 transition hover:bg-white/8 hover:text-white";
  return <div className="flex items-center gap-1 rounded-full bg-[#0b111b]/92 p-1.5 shadow-[0_12px_36px_rgba(0,0,0,.35)] ring-1 ring-white/8 backdrop-blur-xl" data-testid="studio-composition-object-toolbar"><button type="button" onClick={onEdit} className="min-h-9 rounded-full bg-[#b8ff2c] px-4 text-xs font-semibold text-[#07100a]">Edit · {label}</button><button type="button" onClick={onArrange} className={iconButton} aria-label="Open Position"><Move className="h-4 w-4" /></button><StudioTransientMenu label={`More actions for ${label}`}>{(close) => <><button type="button" role="menuitem" onClick={() => { close(); onDuplicate(); }} className="flex min-h-9 w-full items-center gap-2 rounded-lg px-3 text-left text-xs hover:bg-white/8"><Copy className="h-4 w-4" />Duplicate</button><button type="button" role="menuitem" onClick={() => { close(); onDelete(); }} className="flex min-h-9 w-full items-center gap-2 rounded-lg px-3 text-left text-xs text-rose-200 hover:bg-rose-300/10"><Trash2 className="h-4 w-4" />Delete</button></>}</StudioTransientMenu></div>;
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
