"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  Layers3,
  Lock,
  MoreHorizontal,
  Trash2,
  Unlock,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MediaPicker } from "@/components/media/media-picker";
import {
  NestedPanelShell,
  PanelNavRow,
} from "@/components/fusion/creative-studio/nested-panel-shell";
import { ProfessionalTypographyPanel } from "@/components/fusion/creative-studio/professional-typography-panel";
import { GradientStudio } from "@/components/fusion/creative-studio/gradient-studio";
import { PatternTextureStudio } from "@/components/fusion/creative-studio/pattern-texture-studio";
import { FrameMaskBrowser } from "@/components/fusion/creative-studio/frame-mask-browser";
import { ShapeStudio } from "@/components/fusion/creative-studio/shape-studio";
import { ReusableDesignBrowser } from "@/components/fusion/creative-studio/reusable-design-browser";
import { DEFAULT_GRADIENT } from "@/lib/fusion/creative-studio/gradient";
import { DEFAULT_SURFACE_PATTERN } from "@/lib/fusion/creative-studio/patterns";
import {
  compositionBlockToRenderDocument,
  compositionBackgroundToFill,
  creativeFillToCompositionBackground,
  renderDocumentToCompositionBlock,
} from "@/lib/fusion/creative-platform/composition-adapter";
import type { CreativeRenderDocument } from "@/lib/fusion/creative-platform/model";
import {
  alignNodes,
  alignNodesToCanvas,
  bringForward,
  bringToFront,
  copyCompositionNodes,
  createCompositionNode,
  deleteNodes,
  distanceBetweenNodes,
  distributeNodes,
  duplicateNodes,
  expandSelectionToGroups,
  groupNodes,
  pasteCompositionNodes,
  sendBackward,
  sendToBack,
  setNodeLocked,
  tidyNodes,
  ungroupNodes,
  type AlignMode,
  type CreativeCompositionAnchor,
  type CreativeCompositionBlock,
  type CreativeCompositionNode,
  type CreativeCompositionPrimitive,
  type FrameMaskId,
} from "@/lib/fusion/creative-studio/composition";

type Level =
  | "root"
  | "add"
  | "text"
  | "typography"
  | "image"
  | "frame"
  | "shape"
  | "border"
  | "layering"
  | "align"
  | "group"
  | "fallback"
  | "masks"
  | "background"
  | "responsive";

export type CompositionPanelStackProps = {
  block: CreativeCompositionBlock;
  selectedNodeIds: string[];
  onSelectNodes: (ids: string[]) => void;
  onChangeBlock: (next: CreativeCompositionBlock, label?: string) => void;
  onClose?: () => void;
  mediaUploadReady?: boolean;
  stockReady?: boolean;
  brandColors?: string[];
  defaultForegroundColor?: string;
};

const MEMORY_KEY = "tc.composition.panel.level";

function primaryNode(
  block: CreativeCompositionBlock,
  ids: string[]
): CreativeCompositionNode | null {
  if (!ids.length) return null;
  return block.nodes.find((n) => n.id === ids[0]) || null;
}

function readRememberedLevel(blockId: string): Level {
  if (typeof window === "undefined") return "root";
  try {
    const raw = sessionStorage.getItem(`${MEMORY_KEY}.${blockId}`);
    if (!raw) return "root";
    return raw as Level;
  } catch {
    return "root";
  }
}

export function CompositionPanelStack({
  block,
  selectedNodeIds,
  onSelectNodes,
  onChangeBlock,
  onClose,
  mediaUploadReady = false,
  stockReady = false,
  brandColors = [],
  defaultForegroundColor = "#ffffff",
}: CompositionPanelStackProps) {
  const [level, setLevel] = useState<Level>(() => readRememberedLevel(block.id));
  const [clipboard, setClipboard] = useState<CreativeCompositionNode[]>([]);
  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);
  const [layerDropId, setLayerDropId] = useState<string | null>(null);
  const node = primaryNode(block, selectedNodeIds);
  const multi = selectedNodeIds.length > 1;
  const measurementNodes = selectedNodeIds
    .map((id) => block.nodes.find((item) => item.id === id))
    .filter((item): item is CreativeCompositionNode => Boolean(item));
  const distanceMeasurement =
    measurementNodes.length === 2
      ? distanceBetweenNodes(measurementNodes[0], measurementNodes[1], {
          widthPx: 400,
          heightPx: 500,
        })
      : null;

  useEffect(() => {
    try {
      sessionStorage.setItem(`${MEMORY_KEY}.${block.id}`, level);
    } catch {
      /* ignore */
    }
  }, [block.id, level]);

  const crumbs = useMemo(() => {
    const base = ["Composition"];
    if (level === "root") return base;
    const labels: Record<Level, string> = {
      root: "Composition",
      add: "Add",
      text: "Text",
      typography: "Typography & Formatting",
      image: "Image & Media",
      frame: "Frame",
      shape: "Shape",
      border: "Border / Divider",
      layering: "Layering",
      align: "Align & Distribute",
      group: "Group",
      fallback: "Phone fallback",
      masks: "Masking Shape",
      background: "Background",
      responsive: "Responsive",
    };
    if (level === "masks") return [...base, "Frame", labels.masks];
    if (level === "typography") return [...base, "Text", labels.typography];
    return [...base, labels[level]];
  }, [level]);

  function patchNodes(nodes: CreativeCompositionNode[], label: string) {
    onChangeBlock({ ...block, nodes }, label);
  }

  function patchNode(
    id: string,
    patch: Partial<CreativeCompositionNode>,
    label: string
  ) {
    patchNodes(
      block.nodes.map((n) =>
        n.id === id
          ? {
              ...n,
              ...patch,
              props: patch.props ? { ...n.props, ...patch.props } : n.props,
            }
          : n
      ),
      label
    );
  }

  function moveLayer(id: string, targetIndex: number) {
    const ordered = [...block.nodes].sort((a, b) => b.zIndex - a.zIndex);
    const from = ordered.findIndex((item) => item.id === id);
    if (from < 0 || ordered[from].locked) return;
    const [moved] = ordered.splice(from, 1);
    const nextIndex = Math.max(0, Math.min(targetIndex, ordered.length));
    ordered.splice(nextIndex, 0, moved);
    const zById = new Map(
      ordered.map((item, index) => [item.id, ordered.length - index])
    );
    patchNodes(
      block.nodes.map((item) => ({
        ...item,
        zIndex: zById.get(item.id) ?? item.zIndex,
      })),
      `Moved ${moved.name || moved.primitive} layer`
    );
  }

  function moveLayerToTarget(id: string, targetId: string) {
    const ordered = [...block.nodes].sort((a, b) => b.zIndex - a.zIndex);
    const targetIndex = ordered.findIndex((item) => item.id === targetId);
    if (targetIndex >= 0 && id !== targetId) moveLayer(id, targetIndex);
  }

  function patchBackgroundImage(
    patch: Partial<NonNullable<CreativeCompositionBlock["background"]>["image"]>,
    label: string
  ) {
    if (block.background?.kind !== "image" || !block.background.image) return;
    onChangeBlock(
      {
        ...block,
        background: {
          ...block.background,
          image: { ...block.background.image, ...patch },
        },
      },
      label
    );
  }

  function addPrimitive(primitive: CreativeCompositionPrimitive) {
    const maxZ = block.nodes.reduce((m, n) => Math.max(m, n.zIndex), 0);
    const created = createCompositionNode(primitive, { zIndex: maxZ + 1 });
    patchNodes([...block.nodes, created], `Added ${primitive}`);
    onSelectNodes([created.id]);
    if (primitive === "text") setLevel("text");
    else if (primitive === "image") setLevel("image");
    else if (primitive === "frame") setLevel("frame");
    else if (primitive === "shape") setLevel("shape");
    else if (primitive === "border") setLevel("border");
    else setLevel("root");
  }

  const title =
    level === "root"
      ? multi
        ? `${selectedNodeIds.length} selected`
        : node
          ? `${node.primitive}`
          : block.label
      : crumbs[crumbs.length - 1];

  return (
    <NestedPanelShell
      title={title}
      breadcrumbs={crumbs}
      depth={
        level === "root"
          ? 0
          : level === "masks" || level === "typography"
            ? 2
            : 1
      }
      onBack={
        level === "root"
          ? undefined
          : () =>
              setLevel(
                level === "masks"
                  ? "frame"
                  : level === "typography"
                    ? "text"
                    : "root"
              )
      }
      onClose={onClose}
      testId="composition-panel-stack"
    >
      {level === "root" ? (
        <div className="space-y-3" data-testid="composition-panel-root">
          <div
            className="rounded-md border border-white/10 bg-white/[0.03] p-3 space-y-2"
            data-testid="composition-panel-hub"
          >
            <p className="text-[10px] uppercase tracking-wide text-white/65">
              Creative Composition
            </p>
            <p className="text-xs text-white/60">
              {block.nodes.length} items · fallback {block.mobileFallback}
              {node ? ` · selected ${node.primitive}` : ""}
            </p>
            <div className="flex flex-wrap gap-1">
              {(
                [
                  ["text", "Text"],
                  ["image", "Image"],
                  ["frame", "Frame"],
                  ["shape", "Shape"],
                  ["border", "Border"],
                  ["button", "Button"],
                ] as const
              ).map(([id, label]) => (
                <Button
                  key={id}
                  type="button"
                  variant="outline"
                  className="min-h-9"
                  data-testid={`composition-add-${id}`}
                  onClick={() => addPrimitive(id)}
                >
                  + {label}
                </Button>
              ))}
            </div>

            {/* Level 0 — selection hub: common controls before deeper groups */}
            {node?.primitive === "text" ? (
              <div className="space-y-2 border-t border-white/10 pt-2" data-testid="composition-hub-text">
                <Input
                  value={String(node.props.text || "")}
                  data-testid="composition-hub-text-input"
                  onChange={(e) =>
                    patchNode(node.id, { props: { text: e.target.value } }, "Edited composition text")
                  }
                />
                <div className="flex gap-2">
                  <Input
                    type="number"
                    className="w-20"
                    min={8}
                    max={96}
                    value={Number(node.props.fontSize || 18)}
                    data-testid="composition-hub-text-size"
                    onChange={(e) =>
                      patchNode(
                        node.id,
                        { props: { fontSize: Number(e.target.value) || 18 } },
                        "Changed composition text size"
                      )
                    }
                  />
                  <Input
                    type="color"
                    className="h-10 w-14"
                    value={String(node.props.color || "#f8fafc")}
                    data-testid="composition-hub-text-color"
                    onChange={(e) =>
                      patchNode(
                        node.id,
                        { props: { color: e.target.value } },
                        "Changed composition text color"
                      )
                    }
                  />
                </div>
              </div>
            ) : null}
            {node?.primitive === "frame" ? (
              <div className="space-y-2 border-t border-white/10 pt-2" data-testid="composition-hub-frame">
                <p className="text-[11px] text-white/50">
                  Mask · {String(node.props.mask || "rounded")}
                </p>
                <div className="flex flex-wrap gap-1">
                  {(["rounded", "circle", "shirt", "ticket"] as FrameMaskId[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      className={`min-h-9 rounded-md border px-2 text-[11px] capitalize ${
                        node.props.mask === m
                          ? "border-white/40 bg-white/10"
                          : "border-white/10"
                      }`}
                      data-testid={`composition-hub-mask-${m}`}
                      onClick={() =>
                        patchNode(node.id, { props: { mask: m } }, `Applied ${m} mask`)
                      }
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {node?.primitive === "image" ? (
              <div className="space-y-2 border-t border-white/10 pt-2" data-testid="composition-hub-image">
                <p className="truncate text-[11px] text-white/50" data-testid="composition-hub-image-src">
                  {node.props.mediaAssetId
                    ? `Studio asset · ${String(node.props.mediaAssetId)}`
                    : node.props.src
                      ? "Legacy image URL"
                      : "No image selected"}
                </p>
              </div>
            ) : null}
            {node?.primitive === "border" ? (
              <div className="flex gap-2 border-t border-white/10 pt-2" data-testid="composition-hub-border">
                <Input
                  type="color"
                  className="h-10 w-14"
                  value={String(node.props.color || "#ffffff")}
                  data-testid="composition-hub-border-color"
                  onChange={(e) =>
                    patchNode(node.id, { props: { color: e.target.value } }, "Changed border color")
                  }
                />
                <Input
                  type="number"
                  className="w-20"
                  min={1}
                  max={12}
                  value={Number(node.props.thickness || 2)}
                  data-testid="composition-hub-border-thickness"
                  onChange={(e) =>
                    patchNode(
                      node.id,
                      { props: { thickness: Number(e.target.value) || 2 } },
                      "Changed border thickness"
                    )
                  }
                />
              </div>
            ) : null}
            {multi || node ? (
              <div className="flex flex-wrap gap-1 border-t border-white/10 pt-2" data-testid="composition-hub-actions">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-9"
                  disabled={!selectedNodeIds.length}
                  data-testid="composition-duplicate"
                  onClick={() => {
                    const { nodes, newIds } = duplicateNodes(
                      block.nodes,
                      selectedNodeIds
                    );
                    patchNodes(nodes, "Duplicated composition items");
                    if (newIds.length) onSelectNodes(newIds);
                  }}
                >
                  Duplicate
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-9"
                  disabled={!selectedNodeIds.length}
                  onClick={() => {
                    setClipboard(
                      copyCompositionNodes(block.nodes, selectedNodeIds)
                    );
                  }}
                  data-testid="composition-copy"
                >
                  Copy
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-9"
                  disabled={!clipboard.length}
                  onClick={() => {
                    const pasted = pasteCompositionNodes(block.nodes, clipboard);
                    patchNodes(pasted.nodes, "Pasted composition items");
                    onSelectNodes(pasted.newIds);
                  }}
                  data-testid="composition-paste"
                >
                  Paste
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-9"
                  disabled={!selectedNodeIds.length}
                  data-testid="composition-delete"
                  onClick={() => {
                    patchNodes(
                      deleteNodes(block.nodes, selectedNodeIds),
                      "Deleted composition items"
                    );
                    onSelectNodes([]);
                  }}
                >
                  Delete
                </Button>
              </div>
            ) : null}
            {node && !multi ? (
              <div
                className="grid grid-cols-5 gap-1 border-t border-white/10 pt-2"
                data-testid="composition-precision-inputs"
              >
                {(
                  [
                    ["x", "X", Math.round(node.x * 100)],
                    ["y", "Y", Math.round(node.y * 100)],
                    ["width", "W", Math.round(node.width * 100)],
                    ["height", "H", Math.round(node.height * 100)],
                    ["rotationDeg", "°", Math.round(node.rotationDeg || 0)],
                  ] as const
                ).map(([key, label, value]) => (
                  <label key={key} className="space-y-1 text-[9px] text-white/65">
                    <span>{label}</span>
                    <Input
                      type="number"
                      className="h-9 px-1 text-xs"
                      value={value}
                      min={key === "rotationDeg" ? -180 : 0}
                      max={key === "rotationDeg" ? 180 : 100}
                      onChange={(event) => {
                        const raw = Number(event.target.value);
                        patchNode(
                          node.id,
                          key === "rotationDeg"
                            ? { rotationDeg: raw }
                            : { [key]: Math.max(0, Math.min(100, raw)) / 100 },
                          `Set composition ${label}`
                        );
                      }}
                      aria-label={`Exact ${label}`}
                    />
                  </label>
                ))}
              </div>
            ) : null}
            {multi ? (
              <div className="flex flex-wrap gap-1 border-t border-white/10 pt-2" data-testid="composition-hub-multi">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-9"
                  data-testid="composition-hub-group"
                  onClick={() => {
                    const next = groupNodes(block.nodes, selectedNodeIds);
                    const gid = next.find((n) => n.id === selectedNodeIds[0])?.groupId;
                    patchNodes(next, "Grouped items");
                    if (gid) {
                      onSelectNodes(
                        expandSelectionToGroups(
                          next,
                          next.filter((n) => n.groupId === gid).map((n) => n.id)
                        )
                      );
                    }
                  }}
                >
                  Group
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-9"
                  data-testid="composition-hub-lock"
                  onClick={() =>
                    patchNodes(setNodeLocked(block.nodes, selectedNodeIds, true), "Locked items")
                  }
                >
                  Lock
                </Button>
              </div>
            ) : null}
          </div>

          {node?.primitive === "text" ? (
            <PanelNavRow
              label="Typography & Formatting"
              hint="Full text studio"
              testId="composition-open-text"
              onClick={() => setLevel("text")}
            />
          ) : null}
          {node?.primitive === "image" ? (
            <PanelNavRow
              label="Image & Media"
              hint="Fit, alt, opacity"
              testId="composition-open-image"
              onClick={() => setLevel("image")}
            />
          ) : null}
          {node?.primitive === "frame" ? (
            <PanelNavRow
              label="Frame & Mask Studio"
              hint="Media fitting and masks"
              testId="composition-open-frame"
              onClick={() => setLevel("frame")}
            />
          ) : null}
          {node?.primitive === "shape" ? (
            <PanelNavRow
              label="Shape Appearance"
              testId="composition-open-shape"
              onClick={() => setLevel("shape")}
            />
          ) : null}
          {node?.primitive === "border" ? (
            <PanelNavRow
              label="Border / Divider"
              hint="Style, caps, thickness"
              testId="composition-open-border"
              onClick={() => setLevel("border")}
            />
          ) : null}

          <PanelNavRow
            label="Background"
            hint={block.background?.kind || "none"}
            testId="composition-open-background"
            onClick={() => setLevel("background")}
          />
          <PanelNavRow
            label="Layering"
            hint="Forward / back / front / back"
            testId="composition-open-layering"
            onClick={() => setLevel("layering")}
          />
          <PanelNavRow
            label="Align & Distribute"
            testId="composition-open-align"
            onClick={() => setLevel("align")}
          />
          <PanelNavRow
            label="Group & Lock"
            testId="composition-open-group"
            onClick={() => setLevel("group")}
          />
          {node ? (
            <PanelNavRow
              label="Responsive"
              hint={node.anchor || "top-left"}
              testId="composition-open-responsive"
              onClick={() => setLevel("responsive")}
            />
          ) : null}
          <PanelNavRow
            label="Phone fallback"
            hint={block.mobileFallback}
            testId="composition-open-fallback"
            onClick={() => setLevel("fallback")}
          />

          <div className="space-y-1" data-testid="composition-layers-list">
            <Label className="text-[10px] text-white/65">Layers</Label>
            {[...block.nodes]
              .sort((a, b) => b.zIndex - a.zIndex)
              .map((n, layerIndex, orderedLayers) => (
                <div
                  key={n.id}
                  className={`relative rounded-md border p-2 ${
                    selectedNodeIds.includes(n.id)
                      ? "border-white/35 bg-white/10"
                      : "border-white/10"
                  }`}
                  data-testid={`composition-layer-${n.id}`}
                  data-layer-name={n.name || n.primitive}
                  data-drop-target={layerDropId === n.id ? "true" : "false"}
                  onDragOver={(event) => {
                    if (!draggedLayerId || draggedLayerId === n.id) return;
                    event.preventDefault();
                    setLayerDropId(n.id);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    if (draggedLayerId) moveLayerToTarget(draggedLayerId, n.id);
                    setDraggedLayerId(null);
                    setLayerDropId(null);
                  }}
                >
                  {layerDropId === n.id ? (
                    <span
                      aria-hidden
                      className="absolute -top-0.5 left-2 right-2 h-0.5 rounded-full bg-[#9cff57] shadow-[0_0_10px_#9cff57]"
                    />
                  ) : null}
                  <button
                    type="button"
                    className="flex min-h-10 w-full items-center gap-2 text-left text-xs"
                    onClick={(event) => {
                      if (event.shiftKey || event.metaKey || event.ctrlKey) {
                        onSelectNodes(
                          selectedNodeIds.includes(n.id)
                            ? selectedNodeIds.filter((id) => id !== n.id)
                            : [...selectedNodeIds, n.id]
                        );
                        return;
                      }
                      onSelectNodes(expandSelectionToGroups(block.nodes, [n.id]));
                    }}
                  >
                    <span
                      role="button"
                      tabIndex={n.locked ? -1 : 0}
                      draggable={!n.locked}
                      aria-label={`Drag ${n.name || n.primitive} layer to reorder`}
                      aria-disabled={n.locked}
                      className="grid min-h-9 min-w-9 cursor-grab place-items-center rounded-md border border-white/20 bg-white/[0.06] text-white active:cursor-grabbing"
                      onClick={(event) => event.stopPropagation()}
                      onDragStart={(event) => {
                        setDraggedLayerId(n.id);
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", n.id);
                      }}
                      onDragEnd={() => {
                        setDraggedLayerId(null);
                        setLayerDropId(null);
                      }}
                      onKeyDown={(event) => {
                        if (!event.altKey && !event.metaKey) return;
                        if (event.key === "ArrowUp") {
                          event.preventDefault();
                          moveLayer(n.id, layerIndex - 1);
                        }
                        if (event.key === "ArrowDown") {
                          event.preventDefault();
                          moveLayer(n.id, layerIndex + 1);
                        }
                      }}
                    >
                      <GripVertical className="h-5 w-5" aria-hidden />
                    </span>
                    <Layers3 className="h-4 w-4 shrink-0 text-white/70" aria-hidden />
                    <span className="min-w-0 flex-1 truncate">
                      {n.name || n.primitive}
                      {n.groupId ? " · grouped" : ""}
                    </span>
                    <span className="shrink-0 text-white/65">z{n.zIndex}</span>
                  </button>
                  <div className="grid grid-cols-[1fr_auto_auto_auto] gap-1">
                    <Input
                      value={n.name || ""}
                      placeholder={n.primitive}
                      aria-label={`Rename ${n.primitive} layer`}
                      className="h-9 text-xs"
                      onChange={(event) =>
                        patchNode(
                          n.id,
                          { name: event.target.value },
                          `Renamed ${n.primitive} layer`
                        )
                      }
                    />
                    <button
                      type="button"
                      className="grid min-h-9 min-w-9 place-items-center rounded border border-white/10 px-2 text-[10px]"
                      aria-pressed={n.visible !== false}
                      aria-label={n.visible === false ? `Show ${n.name || n.primitive}` : `Hide ${n.name || n.primitive}`}
                      onClick={() =>
                        patchNode(
                          n.id,
                          { visible: n.visible === false },
                          n.visible === false ? "Showed layer" : "Hid layer"
                        )
                      }
                    >
                      {n.visible === false ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    <button
                      type="button"
                      className="grid min-h-9 min-w-9 place-items-center rounded border border-white/10 px-2 text-[10px]"
                      aria-pressed={Boolean(n.locked)}
                      aria-label={n.locked ? `Unlock ${n.name || n.primitive}` : `Lock ${n.name || n.primitive}`}
                      onClick={() =>
                        patchNode(
                          n.id,
                          { locked: !n.locked },
                          n.locked ? "Unlocked layer" : "Locked layer"
                        )
                      }
                    >
                      {n.locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                    </button>
                    <details className="relative">
                      <summary
                        className="grid min-h-9 min-w-9 cursor-pointer list-none place-items-center rounded border border-white/10"
                        aria-label={`More actions for ${n.name || n.primitive}`}
                      >
                        <MoreHorizontal className="h-4 w-4" aria-hidden />
                      </summary>
                      <div className="absolute right-0 z-20 mt-1 grid min-w-40 gap-1 rounded-md border border-white/15 bg-[#111827] p-1 shadow-xl">
                        {[
                          ["Move to top", () => moveLayer(n.id, 0), layerIndex === 0],
                          ["Move up", () => moveLayer(n.id, layerIndex - 1), layerIndex === 0],
                          ["Move down", () => moveLayer(n.id, layerIndex + 1), layerIndex === orderedLayers.length - 1],
                          ["Move to bottom", () => moveLayer(n.id, orderedLayers.length - 1), layerIndex === orderedLayers.length - 1],
                        ].map(([label, action, disabled]) => (
                          <button
                            key={label as string}
                            type="button"
                            className="min-h-9 rounded px-2 text-left text-xs hover:bg-white/10 disabled:opacity-40"
                            disabled={Boolean(disabled) || Boolean(n.locked)}
                            onClick={action as () => void}
                          >
                            {label as string}
                          </button>
                        ))}
                        <button
                          type="button"
                          className="flex min-h-9 items-center gap-2 rounded px-2 text-left text-xs hover:bg-white/10 disabled:opacity-40"
                          disabled={Boolean(n.locked)}
                          onClick={() => {
                            const result = duplicateNodes(block.nodes, [n.id]);
                            patchNodes(result.nodes, `Duplicated ${n.name || n.primitive} layer`);
                            onSelectNodes(result.newIds);
                          }}
                        >
                          <Copy className="h-4 w-4" /> Duplicate
                        </button>
                        <button
                          type="button"
                          className="flex min-h-9 items-center gap-2 rounded px-2 text-left text-xs text-red-300 hover:bg-red-500/10 disabled:opacity-40"
                          disabled={Boolean(n.locked)}
                          onClick={() =>
                            patchNodes(
                              deleteNodes(block.nodes, [n.id]),
                              `Deleted ${n.name || n.primitive} layer`
                            )
                          }
                        >
                          <Trash2 className="h-4 w-4" /> Delete
                        </button>
                      </div>
                    </details>
                  </div>
                </div>
              ))}
          </div>
          <ReusableDesignBrowser
            kind="COMPOSITION"
            value={compositionBlockToRenderDocument(block)}
            title="Reusable compositions"
            onInsert={(document: CreativeRenderDocument, label, resource) => {
              const next = renderDocumentToCompositionBlock(document, {
                  id: block.id,
                  label: block.label,
                });
              onChangeBlock(
                {
                  ...next,
                  resourceRef:
                    resource.currentRevisionId && resource.currentRevision
                      ? {
                          resourceId: resource.id,
                          revisionId: resource.currentRevision.id,
                          resourceName: resource.name,
                        }
                      : undefined,
                },
                label
              );
            }}
          />
        </div>
      ) : null}

      {level === "text" && node?.primitive === "text" ? (
        <div className="space-y-3" data-testid="composition-panel-text">
          <Label className="text-xs">Text</Label>
          <Input
            value={String(node.props.text || "")}
            data-testid="composition-text-input"
            onChange={(e) =>
              patchNode(node.id, { props: { text: e.target.value } }, "Edited composition text")
            }
          />
          <PanelNavRow
            label="Open font catalog"
            hint={String(node.props.fontFamily || "Inter")}
            testId="composition-open-typography"
            onClick={() => setLevel("typography")}
          />
          <Label className="text-xs">Point size</Label>
          <Input
            type="number"
            min={8}
            max={96}
            value={Number(node.props.fontSize || 18)}
            data-testid="composition-text-size"
            onChange={(e) =>
              patchNode(
                node.id,
                { props: { fontSize: Number(e.target.value) || 18 } },
                "Changed composition text size"
              )
            }
          />
          <Label className="text-xs">Color</Label>
          <Input
            type="color"
            value={String(node.props.color || "#f8fafc")}
            data-testid="composition-text-color"
            onChange={(e) =>
              patchNode(node.id, { props: { color: e.target.value } }, "Changed composition text color")
            }
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              aria-pressed={node.props.strikethrough === true}
              onClick={() =>
                patchNode(
                  node.id,
                  {
                    props: {
                      strikethrough: node.props.strikethrough !== true,
                    },
                  },
                  "Changed composition strikethrough"
                )
              }
            >
              Strikethrough
            </Button>
          </div>
          <Label className="text-xs">Text case</Label>
          <select
            value={String(node.props.textTransform || "none")}
            onChange={(e) =>
              patchNode(
                node.id,
                { props: { textTransform: e.target.value } },
                "Changed composition text case"
              )
            }
            className="min-h-10 w-full rounded-lg border border-white/15 bg-black/30 px-3 text-xs"
          >
            <option value="none">As typed</option>
            <option value="uppercase">UPPERCASE</option>
            <option value="lowercase">lowercase</option>
            <option value="capitalize">Title Case</option>
          </select>
        </div>
      ) : null}

      {level === "typography" && node?.primitive === "text" ? (
        <div data-testid="composition-panel-typography">
          <ProfessionalTypographyPanel
            sampleText={String(node.props.text || "Composition text")}
            brandFontIds={["inter", "source-serif-4", "playfair"]}
            value={{
              customFontFamily: String(node.props.fontFamily || ""),
              fontSizePx: Number(node.props.fontSize || 18),
              fontWeight:
                Number(node.props.fontWeight || 600) >= 700
                  ? "bold"
                  : Number(node.props.fontWeight || 600) >= 600
                    ? "semibold"
                    : "normal",
              italic: Boolean(node.props.italic),
              underline: Boolean(node.props.underline),
              letterSpacingEm: Number(node.props.letterSpacingEm || 0),
              lineHeight: Number(node.props.lineHeight || 1.35),
              color: String(node.props.color || "#f8fafc"),
              align: (String(node.props.align || "center") as
                | "left"
                | "center"
                | "right"
                | "justify"),
            }}
            onChange={(f) =>
              patchNode(
                node.id,
                {
                  props: {
                    fontFamily: f.customFontFamily || node.props.fontFamily,
                    fontSize: f.fontSizePx ?? node.props.fontSize,
                    fontWeight: f.fontWeight
                      ? ({
                          normal: 400,
                          medium: 500,
                          semibold: 600,
                          bold: 700,
                          black: 900,
                        } as const)[f.fontWeight]
                      : node.props.fontWeight,
                    italic: f.italic ?? false,
                    underline: f.underline ?? false,
                    letterSpacingEm:
                      f.letterSpacingEm ?? node.props.letterSpacingEm,
                    lineHeight: f.lineHeight ?? node.props.lineHeight,
                    color: f.color ?? node.props.color,
                    align: f.align ?? node.props.align,
                  },
                },
                "Changed composition typography"
              )
            }
          />
        </div>
      ) : null}

      {level === "image" && node?.primitive === "image" ? (
        <div className="space-y-3" data-testid="composition-panel-image">
          <MediaPicker
            value={String(node.props.src || "")}
            valueAssetId={String(node.props.mediaAssetId || "") || undefined}
            label="Composition image"
            mediaUploadReady={mediaUploadReady}
            stockReady={stockReady}
            onAssetChange={(asset) =>
              patchNode(
                node.id,
                {
                  props: {
                    src: asset?.url || "",
                    fallbackUrl: asset?.url || "",
                    mediaAssetId: asset?.mediaAssetId,
                    originalSrc: node.props.originalSrc || asset?.url || "",
                  },
                },
                "Selected composition image"
              )
            }
          />
          <Label className="text-xs">Alt text</Label>
          <Input
            value={String(node.props.alt || "")}
            data-testid="composition-image-alt"
            onChange={(e) =>
              patchNode(node.id, { props: { alt: e.target.value } }, "Set image alt text")
            }
          />
          <Label className="text-xs">Fit</Label>
          <div className="flex gap-1">
            {(["cover", "contain", "fill", "none"] as const).map((fit) => (
              <button
                key={fit}
                type="button"
                className={`min-h-9 rounded-md border px-3 text-xs ${
                  node.props.fit === fit ? "border-white/35 bg-white/10" : "border-white/10"
                }`}
                data-testid={`composition-image-fit-${fit}`}
                onClick={() =>
                  patchNode(node.id, { props: { fit } }, "Changed image fit")
                }
              >
                {fit === "none" ? "original" : fit}
              </button>
            ))}
          </div>
          <Label className="text-xs">
            Opacity {Math.round(Number(node.props.opacity ?? 1) * 100)}%
          </Label>
          <input
            type="range"
            min={10}
            max={100}
            value={Math.round(Number(node.props.opacity ?? 1) * 100)}
            data-testid="composition-image-opacity"
            className="w-full"
            onChange={(e) =>
              patchNode(
                node.id,
                { props: { opacity: Number(e.target.value) / 100 } },
                "Changed image opacity"
              )
            }
          />
          <div className="space-y-3 rounded-lg border border-white/10 p-3" data-testid="composition-image-outline">
            <p className="text-xs font-medium">Object outline</p>
            <div className="grid grid-cols-[1fr_64px] gap-2">
              <Input
                type="number"
                min={0}
                max={48}
                value={Number(node.props.outlineWidth || 0)}
                aria-label="Object outline width"
                onChange={(event) =>
                  patchNode(
                    node.id,
                    { props: { outlineWidth: Number(event.target.value) || 0 } },
                    "Changed object outline width"
                  )
                }
              />
              <Input
                type="color"
                value={String(node.props.outlineColor || "#ffffff")}
                aria-label="Object outline color"
                onChange={(event) =>
                  patchNode(
                    node.id,
                    { props: { outlineColor: event.target.value } },
                    "Changed object outline color"
                  )
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={String(node.props.outlineStyle || "solid")}
                aria-label="Object outline style"
                onChange={(event) =>
                  patchNode(
                    node.id,
                    { props: { outlineStyle: event.target.value } },
                    "Changed object outline style"
                  )
                }
                className="min-h-10 rounded-lg border border-white/15 bg-black/30 px-2 text-xs"
              >
                <option value="solid">Solid</option>
                <option value="dashed">Dashed</option>
                <option value="dotted">Dotted</option>
              </select>
              <select
                value={String(node.props.outlinePlacement || "center")}
                aria-label="Object outline placement"
                onChange={(event) =>
                  patchNode(
                    node.id,
                    { props: { outlinePlacement: event.target.value } },
                    "Changed object outline placement"
                  )
                }
                className="min-h-10 rounded-lg border border-white/15 bg-black/30 px-2 text-xs"
              >
                <option value="inside">Inside</option>
                <option value="center">Center</option>
                <option value="outside">Outside</option>
              </select>
            </div>
            <label className="space-y-1 text-xs">
              <span>
                Outline opacity{" "}
                {Math.round(Number(node.props.outlineOpacity ?? 1) * 100)}%
              </span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(Number(node.props.outlineOpacity ?? 1) * 100)}
                className="w-full"
                onChange={(event) =>
                  patchNode(
                    node.id,
                    {
                      props: {
                        outlineOpacity: Number(event.target.value) / 100,
                      },
                    },
                    "Changed object outline opacity"
                  )
                }
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                min={0}
                max={500}
                value={Number(node.props.outlineRadius || 6)}
                aria-label="Object outline radius"
                onChange={(event) =>
                  patchNode(
                    node.id,
                    { props: { outlineRadius: Number(event.target.value) || 0 } },
                    "Changed object outline radius"
                  )
                }
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  patchNode(
                    node.id,
                    {
                      props: {
                        outlineWidth: 0,
                        outlineColor: "#ffffff",
                        outlineOpacity: 1,
                        outlineStyle: "solid",
                        outlinePlacement: "center",
                        outlineRadius: 6,
                      },
                    },
                    "Reset object outline"
                  )
                }
              >
                Reset outline
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1 text-xs">
              <span>Focal X {Math.round(Number(node.props.focalX ?? 0.5) * 100)}%</span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(Number(node.props.focalX ?? 0.5) * 100)}
                onChange={(e) =>
                  patchNode(
                    node.id,
                    { props: { focalX: Number(e.target.value) / 100 } },
                    "Changed image focal point"
                  )
                }
              />
            </label>
            <label className="space-y-1 text-xs">
              <span>Focal Y {Math.round(Number(node.props.focalY ?? 0.5) * 100)}%</span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(Number(node.props.focalY ?? 0.5) * 100)}
                onChange={(e) =>
                  patchNode(
                    node.id,
                    { props: { focalY: Number(e.target.value) / 100 } },
                    "Changed image focal point"
                  )
                }
              />
            </label>
          </div>
          <Label className="text-xs">Crop</Label>
          <div className="grid grid-cols-3 gap-1">
            {(
              [
                ["original", 1, 1],
                ["1:1", 0.8, 0.8],
                ["4:3", 0.9, 0.675],
                ["16:9", 0.94, 0.529],
                ["3:4", 0.675, 0.9],
              ] as const
            ).map(([label, width, height]) => (
              <button
                key={label}
                type="button"
                className="min-h-10 rounded-lg border border-white/10 px-2 text-xs"
                onClick={() =>
                  patchNode(
                    node.id,
                    {
                      props: {
                        cropAspect: label,
                        cropX: (1 - width) / 2,
                        cropY: (1 - height) / 2,
                        cropWidth: width,
                        cropHeight: height,
                      },
                    },
                    label === "original" ? "Reset image crop" : `Cropped image to ${label}`
                  )
                }
                data-testid={`composition-image-crop-${label.replace(":", "-")}`}
              >
                {label === "original" ? "No crop" : label}
              </button>
            ))}
            <button
              type="button"
              className="min-h-10 rounded-lg border border-white/10 px-2 text-xs"
              onClick={() =>
                patchNode(
                  node.id,
                  { props: { cropAspect: "free" } },
                  "Enabled free crop"
                )
              }
            >
              Free crop
            </button>
          </div>
          {node.props.cropAspect === "free" ? (
            <div className="grid grid-cols-2 gap-3" data-testid="composition-image-free-crop">
              {(
                [
                  ["cropX", "Crop left", 0],
                  ["cropY", "Crop top", 0],
                  ["cropWidth", "Crop width", 1],
                  ["cropHeight", "Crop height", 1],
                ] as const
              ).map(([key, label, fallback]) => (
                <label key={key} className="space-y-1 text-xs">
                  <span>
                    {label} {Math.round(Number(node.props[key] ?? fallback) * 100)}%
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(Number(node.props[key] ?? fallback) * 100)}
                    onChange={(event) =>
                      patchNode(
                        node.id,
                        { props: { [key]: Number(event.target.value) / 100 } },
                        "Adjusted free crop"
                      )
                    }
                  />
                </label>
              ))}
            </div>
          ) : null}
          <label className="space-y-1 text-xs">
            <span>Image scale {Math.round(Number(node.props.mediaScale ?? 1) * 100)}%</span>
            <input
              type="range"
              min={25}
              max={300}
              value={Math.round(Number(node.props.mediaScale ?? 1) * 100)}
              className="w-full"
              onChange={(event) =>
                patchNode(
                  node.id,
                  { props: { mediaScale: Number(event.target.value) / 100 } },
                  "Scaled image content"
                )
              }
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                ["positionX", "Position X"],
                ["positionY", "Position Y"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="space-y-1 text-xs">
                <span>
                  {label} {Math.round(Number(node.props[key] ?? 0.5) * 100)}%
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(Number(node.props[key] ?? 0.5) * 100)}
                  onChange={(event) =>
                    patchNode(
                      node.id,
                      { props: { [key]: Number(event.target.value) / 100 } },
                      "Positioned image content"
                    )
                  }
                />
              </label>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              aria-pressed={node.props.flipX === true}
              onClick={() =>
                patchNode(
                  node.id,
                  { props: { flipX: node.props.flipX !== true } },
                  "Flipped image horizontally"
                )
              }
            >
              Flip horizontal
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              aria-pressed={node.props.flipY === true}
              onClick={() =>
                patchNode(
                  node.id,
                  { props: { flipY: node.props.flipY !== true } },
                  "Flipped image vertically"
                )
              }
            >
              Flip vertical
            </Button>
          </div>
          <Label className="text-xs">
            Media rotation {Number(node.props.mediaRotation || 0)}°
          </Label>
          <input
            type="range"
            min={-180}
            max={180}
            value={Number(node.props.mediaRotation || 0)}
            className="w-full"
            onChange={(e) =>
              patchNode(
                node.id,
                { props: { mediaRotation: Number(e.target.value) } },
                "Rotated image content"
              )
            }
          />
          {(
            [
              ["brightness", "Brightness", 25, 200, 100],
              ["contrast", "Contrast", 25, 200, 100],
              ["saturation", "Saturation", 0, 200, 100],
              ["temperature", "Temperature", -100, 100, 0],
              ["tint", "Tint", -100, 100, 0],
              ["highlights", "Highlights", -100, 100, 0],
              ["shadows", "Shadows", -100, 100, 0],
              ["clarity", "Clarity", -100, 100, 0],
              ["vignette", "Vignette", 0, 100, 0],
              ["blur", "Blur", 0, 20, 0],
            ] as const
          ).map(([key, label, min, max, fallback]) => {
            const raw =
              key === "blur"
                ? Number(node.props[key] ?? fallback)
                : Math.round(Number(node.props[key] ?? fallback / 100) * 100);
            return (
              <label key={key} className="block space-y-1 text-xs">
                <span>
                  {label} {raw}
                  {key === "blur" ? "px" : "%"}
                </span>
                <input
                  type="range"
                  min={min}
                  max={max}
                  value={raw}
                  className="w-full"
                  onChange={(e) =>
                    patchNode(
                      node.id,
                      {
                        props: {
                          [key]:
                            key === "blur"
                              ? Number(e.target.value)
                              : Number(e.target.value) / 100,
                        },
                      },
                      `Changed image ${label.toLowerCase()}`
                    )
                  }
                />
              </label>
            );
          })}
          <div className="flex flex-wrap gap-3">
            {(["grayscale", "sepia"] as const).map((key) => (
              <label key={key} className="flex min-h-11 items-center gap-2 text-xs capitalize">
                <input
                  type="checkbox"
                  checked={node.props[key] === true}
                  onChange={(e) =>
                    patchNode(
                      node.id,
                      { props: { [key]: e.target.checked } },
                      `${e.target.checked ? "Applied" : "Removed"} image ${key}`
                    )
                  }
                />
                {key}
              </label>
            ))}
          </div>
          <div className="space-y-2 rounded-lg border border-white/10 p-3">
            <Label className="text-xs">Duotone</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="color"
                value={String(node.props.duotoneShadow || "#0b0f19")}
                aria-label="Duotone shadow color"
                onChange={(event) =>
                  patchNode(
                    node.id,
                    { props: { duotoneShadow: event.target.value } },
                    "Changed duotone shadow"
                  )
                }
              />
              <Input
                type="color"
                value={String(node.props.duotoneHighlight || "#9cff57")}
                aria-label="Duotone highlight color"
                onChange={(event) =>
                  patchNode(
                    node.id,
                    { props: { duotoneHighlight: event.target.value } },
                    "Changed duotone highlight"
                  )
                }
              />
            </div>
            <label className="space-y-1 text-xs">
              <span>
                Strength {Math.round(Number(node.props.duotoneStrength || 0) * 100)}%
              </span>
              <input
                type="range"
                min={0}
                max={100}
                className="w-full"
                value={Math.round(Number(node.props.duotoneStrength || 0) * 100)}
                onChange={(event) =>
                  patchNode(
                    node.id,
                    { props: { duotoneStrength: Number(event.target.value) / 100 } },
                    "Changed image duotone"
                  )
                }
              />
            </label>
          </div>
          <label className="flex min-h-11 items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={node.props.decorative === true}
              onChange={(e) =>
                patchNode(
                  node.id,
                  { props: { decorative: e.target.checked } },
                  "Changed image decorative semantics"
                )
              }
            />
            Decorative image
          </label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              patchNode(
                node.id,
                {
                  props: {
                    src: node.props.originalSrc || node.props.src,
                    fit: "cover",
                    focalX: 0.5,
                    focalY: 0.5,
                    opacity: 1,
                    flipX: false,
                    flipY: false,
                    mediaRotation: 0,
                    mediaScale: 1,
                    positionX: 0.5,
                    positionY: 0.5,
                    cropAspect: "original",
                    cropX: 0,
                    cropY: 0,
                    cropWidth: 1,
                    cropHeight: 1,
                    brightness: 1,
                    contrast: 1,
                    saturation: 1,
                    temperature: 0,
                    tint: 0,
                    highlights: 0,
                    shadows: 0,
                    clarity: 0,
                    vignette: 0,
                    blur: 0,
                    grayscale: false,
                    sepia: false,
                    duotoneStrength: 0,
                  },
                },
                "Reset image to original"
              )
            }
            data-testid="composition-image-reset"
          >
            Reset to original
          </Button>
        </div>
      ) : null}

      {level === "frame" && node?.primitive === "frame" ? (
        <div className="space-y-3" data-testid="composition-panel-frame">
          <MediaPicker
            value={String(node.props.mediaSrc || node.props.src || "")}
            valueAssetId={String(node.props.mediaAssetId || "") || undefined}
            label="Frame media"
            mediaUploadReady={mediaUploadReady}
            stockReady={stockReady}
            onAssetChange={(asset) =>
              patchNode(
                node.id,
                {
                  props: {
                    mediaSrc: asset?.url || "",
                    fallbackUrl: asset?.url || "",
                    mediaAssetId: asset?.mediaAssetId,
                  },
                },
                "Selected frame media"
              )
            }
          />
          <PanelNavRow
            label="Masking Shape"
            hint={String(node.props.mask || "rounded")}
            testId="composition-open-masks"
            onClick={() => setLevel("masks")}
          />
          <Label className="text-xs">Fit</Label>
          <div className="flex gap-1">
            {(["cover", "contain"] as const).map((fit) => (
              <button
                key={fit}
                type="button"
                className={`min-h-9 rounded-md border px-3 text-xs ${
                  node.props.fit === fit ? "border-white/35 bg-white/10" : "border-white/10"
                }`}
                data-testid={`composition-frame-fit-${fit}`}
                onClick={() =>
                  patchNode(node.id, { props: { fit } }, "Changed frame fit")
                }
              >
                {fit}
              </button>
            ))}
          </div>
          <Label className="text-xs">
            Focal X {Math.round(Number(node.props.focalX ?? 0.5) * 100)}%
          </Label>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(Number(node.props.focalX ?? 0.5) * 100)}
            data-testid="composition-frame-focal-x"
            className="w-full"
            onChange={(e) =>
              patchNode(
                node.id,
                { props: { focalX: Number(e.target.value) / 100 } },
                "Changed frame focal point"
              )
            }
          />
          <Label className="text-xs">
            Focal Y {Math.round(Number(node.props.focalY ?? 0.5) * 100)}%
          </Label>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(Number(node.props.focalY ?? 0.5) * 100)}
            data-testid="composition-frame-focal-y"
            className="w-full"
            onChange={(e) =>
              patchNode(
                node.id,
                { props: { focalY: Number(e.target.value) / 100 } },
                "Changed frame focal point"
              )
            }
          />
          <Label className="text-xs">
            Media scale {Number(node.props.mediaScale ?? 1).toFixed(2)}×
          </Label>
          <input
            type="range"
            min={50}
            max={200}
            value={Math.round(Number(node.props.mediaScale ?? 1) * 100)}
            data-testid="composition-frame-scale"
            className="w-full"
            onChange={(e) =>
              patchNode(
                node.id,
                { props: { mediaScale: Number(e.target.value) / 100 } },
                "Changed frame media scale"
              )
            }
          />
          <Label className="text-xs">Frame border width</Label>
          <Input
            type="number"
            min={0}
            max={12}
            value={Number(node.props.borderWidth || 0)}
            data-testid="composition-frame-border-width"
            onChange={(e) =>
              patchNode(
                node.id,
                { props: { borderWidth: Number(e.target.value) || 0 } },
                "Changed frame border"
              )
            }
          />
          <Label className="text-xs">Alt text</Label>
          <Input
            value={String(node.props.alt || "")}
            data-testid="composition-frame-alt"
            onChange={(e) =>
              patchNode(node.id, { props: { alt: e.target.value } }, "Set frame alt text")
            }
          />
          <Label className="text-xs">Border color</Label>
          <Input
            type="color"
            value={String(node.props.borderColor || "#ffffff")}
            data-testid="composition-frame-border-color"
            onChange={(e) =>
              patchNode(
                node.id,
                { props: { borderColor: e.target.value } },
                "Changed frame border color"
              )
            }
          />
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1 text-xs">
              <span>Pattern</span>
              <select
                value={String(node.props.borderStyle || "solid")}
                onChange={(e) =>
                  patchNode(
                    node.id,
                    { props: { borderStyle: e.target.value } },
                    "Changed frame outline pattern"
                  )
                }
                className="min-h-10 w-full rounded-lg border border-white/15 bg-black/30 px-2"
              >
                <option value="solid">Solid</option>
                <option value="dashed">Dashed</option>
                <option value="dotted">Dotted</option>
              </select>
            </label>
            <label className="space-y-1 text-xs">
              <span>Alignment</span>
              <select
                value={String(node.props.borderAlignment || "center")}
                onChange={(e) =>
                  patchNode(
                    node.id,
                    { props: { borderAlignment: e.target.value } },
                    "Changed frame outline alignment"
                  )
                }
                className="min-h-10 w-full rounded-lg border border-white/15 bg-black/30 px-2"
              >
                <option value="inside">Inside</option>
                <option value="center">Center</option>
                <option value="outside">Outside</option>
              </select>
            </label>
          </div>
          <label className="flex min-h-11 items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={node.props.scaleStroke !== false}
              onChange={(e) =>
                patchNode(
                  node.id,
                  { props: { scaleStroke: e.target.checked } },
                  e.target.checked
                    ? "Enabled scale stroke with frame"
                    : "Kept exact frame outline width"
                )
              }
              data-testid="composition-frame-scale-stroke"
            />
            Scale stroke with frame
          </label>
          <p className="text-[11px] text-white/65">
            {node.props.scaleStroke !== false
              ? "Outline scales proportionally as the frame is resized."
              : "Outline keeps the exact configured pixel width."}
          </p>
          <Label className="text-xs">
            Outline opacity{" "}
            {Math.round(Number(node.props.borderOpacity ?? 1) * 100)}%
          </Label>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(Number(node.props.borderOpacity ?? 1) * 100)}
            className="w-full"
            onChange={(e) =>
              patchNode(
                node.id,
                { props: { borderOpacity: Number(e.target.value) / 100 } },
                "Changed frame outline opacity"
              )
            }
          />
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1 text-xs">
              <span>Shadow {Number(node.props.borderShadow || 0)}px</span>
              <input
                type="range"
                min={0}
                max={24}
                value={Number(node.props.borderShadow || 0)}
                onChange={(e) =>
                  patchNode(
                    node.id,
                    { props: { borderShadow: Number(e.target.value) } },
                    "Changed frame outline shadow"
                  )
                }
              />
            </label>
            <label className="space-y-1 text-xs">
              <span>Glow {Number(node.props.borderGlow || 0)}px</span>
              <input
                type="range"
                min={0}
                max={24}
                value={Number(node.props.borderGlow || 0)}
                onChange={(e) =>
                  patchNode(
                    node.id,
                    { props: { borderGlow: Number(e.target.value) } },
                    "Changed frame outline glow"
                  )
                }
              />
            </label>
          </div>
          <Label className="text-xs">Padding {Number(node.props.padding || 0)}px</Label>
          <input
            type="range"
            min={0}
            max={32}
            value={Number(node.props.padding || 0)}
            data-testid="composition-frame-padding"
            className="w-full"
            onChange={(e) =>
              patchNode(
                node.id,
                { props: { padding: Number(e.target.value) } },
                "Changed frame padding"
              )
            }
          />
          <Label className="text-xs">
            Rotation {Number(node.rotationDeg || 0)}°
          </Label>
          <input
            type="range"
            min={-45}
            max={45}
            value={Number(node.rotationDeg || 0)}
            data-testid="composition-frame-rotation"
            className="w-full"
            onChange={(e) =>
              patchNode(
                node.id,
                { rotationDeg: Number(e.target.value) },
                "Rotated frame"
              )
            }
          />
        </div>
      ) : null}

      {level === "masks" && node?.primitive === "frame" ? (
        <FrameMaskBrowser
          value={(node.props.mask || "rectangle") as FrameMaskId}
          onChange={(mask) =>
            patchNode(
              node.id,
              { props: { mask } },
              `Applied ${mask} mask`
            )
          }
        />
      ) : null}

      {level === "shape" && node?.primitive === "shape" ? (
        <ShapeStudio
          node={node}
          mediaUploadReady={mediaUploadReady}
          stockReady={stockReady}
          brandColors={brandColors}
          onPatch={(patch, label) => patchNode(node.id, patch, label)}
          onConvertToFrame={() => {
            const geometryToMask: Record<string, FrameMaskId> = {
              rectangle: "rectangle",
              rounded: "rounded",
              ellipse: "oval",
              triangle: "polygon",
              polygon: "polygon",
              star: "star",
              arrow: "label",
              badge: "badge",
              speech: "cloud",
              organic: "organic",
            };
            patchNode(
              node.id,
              {
                primitive: "frame",
                props: {
                  mask: geometryToMask[String(node.props.shape || "rounded")] || "rounded",
                  mediaSrc:
                    String(node.props.fillKind) === "image"
                      ? String(node.props.imageSrc || "")
                      : "",
                  mediaAssetId: node.props.mediaAssetId,
                  fit: "cover",
                  focalX: 0.5,
                  focalY: 0.5,
                  borderWidth: Number(node.props.strokeWidth || 0),
                  borderColor: String(node.props.stroke || "#ffffff"),
                  scaleStroke: false,
                  alt: "Framed media",
                },
              },
              "Converted shape to frame"
            );
            setLevel("frame");
          }}
        />
      ) : null}

      {level === "border" && node?.primitive === "border" ? (
        <div className="space-y-3" data-testid="composition-panel-border">
          <Label className="text-xs">Color</Label>
          <Input
            type="color"
            value={String(node.props.color || "#ffffff")}
            data-testid="composition-border-color"
            onChange={(e) =>
              patchNode(node.id, { props: { color: e.target.value } }, "Changed border color")
            }
          />
          <Label className="text-xs">Thickness</Label>
          <Input
            type="number"
            min={1}
            max={16}
            value={Number(node.props.thickness || 2)}
            data-testid="composition-border-thickness"
            onChange={(e) =>
              patchNode(
                node.id,
                { props: { thickness: Number(e.target.value) || 2 } },
                "Changed border thickness"
              )
            }
          />
          <Label className="text-xs">Pattern</Label>
          <div className="flex flex-wrap gap-1">
            {(["solid", "dashed", "dotted", "wavy", "double", "custom"] as const).map((style) => (
              <button
                key={style}
                type="button"
                className={`min-h-9 rounded-md border px-3 text-xs capitalize ${
                  (node.props.style || "solid") === style
                    ? "border-white/35 bg-white/10"
                    : "border-white/10"
                }`}
                data-testid={`composition-border-style-${style}`}
                onClick={() =>
                  patchNode(node.id, { props: { style } }, `Border ${style}`)
                }
              >
                {style}
              </button>
            ))}
          </div>
          {node.props.style === "custom" ? (
            <label className="space-y-1 text-xs">
              <span>Custom dash pattern</span>
              <Input
                value={String(node.props.customDash || "12 5 3 5")}
                placeholder="12 5 3 5"
                onChange={(e) =>
                  patchNode(
                    node.id,
                    { props: { customDash: e.target.value } },
                    "Changed divider dash pattern"
                  )
                }
              />
            </label>
          ) : null}
          <Label className="text-xs">
            Opacity {Math.round(Number(node.props.opacity ?? 1) * 100)}%
          </Label>
          <input
            type="range"
            min={0}
            max={100}
            className="w-full"
            value={Math.round(Number(node.props.opacity ?? 1) * 100)}
            onChange={(e) =>
              patchNode(
                node.id,
                { props: { opacity: Number(e.target.value) / 100 } },
                "Changed divider opacity"
              )
            }
          />
          <div className="grid grid-cols-2 gap-2">
            {(["startMarker", "endMarker"] as const).map((key) => (
              <label key={key} className="space-y-1 text-xs">
                <span>{key === "startMarker" ? "Start marker" : "End marker"}</span>
                <select
                  value={String(node.props[key] || "none")}
                  onChange={(e) =>
                    patchNode(
                      node.id,
                      { props: { [key]: e.target.value } },
                      `Changed divider ${key === "startMarker" ? "start" : "end"} marker`
                    )
                  }
                  className="min-h-10 w-full rounded-lg border border-white/15 bg-black/30 px-2"
                >
                  <option value="none">None</option>
                  <option value="arrow">Arrow</option>
                  <option value="diamond">Diamond</option>
                  <option value="circle">Circle</option>
                  <option value="square">Square</option>
                </select>
              </label>
            ))}
          </div>
          <label className="space-y-1 text-xs">
            <span>Line caps</span>
            <select
              value={String(node.props.cap || "round")}
              onChange={(e) =>
                patchNode(
                  node.id,
                  { props: { cap: e.target.value } },
                  "Changed divider line caps"
                )
              }
              className="min-h-10 w-full rounded-lg border border-white/15 bg-black/30 px-2"
            >
              <option value="round">Round</option>
              <option value="square">Square</option>
            </select>
          </label>
          <div className="grid grid-cols-3 gap-2">
            <label className="space-y-1 text-xs">
              <span>Width %</span>
              <Input
                type="number"
                min={4}
                max={100}
                value={Math.round(node.width * 100)}
                onChange={(e) =>
                  patchNode(
                    node.id,
                    { width: Math.max(0.04, Number(e.target.value) / 100) },
                    "Changed divider width"
                  )
                }
              />
            </label>
            <label className="space-y-1 text-xs">
              <span>Height %</span>
              <Input
                type="number"
                min={2}
                max={100}
                value={Math.round(node.height * 100)}
                onChange={(e) =>
                  patchNode(
                    node.id,
                    { height: Math.max(0.02, Number(e.target.value) / 100) },
                    "Changed divider height"
                  )
                }
              />
            </label>
            <label className="space-y-1 text-xs">
              <span>Rotation</span>
              <Input
                type="number"
                min={-180}
                max={180}
                value={Number(node.rotationDeg || 0)}
                onChange={(e) =>
                  patchNode(
                    node.id,
                    { rotationDeg: Number(e.target.value) },
                    "Rotated divider"
                  )
                }
              />
            </label>
          </div>
        </div>
      ) : null}

      {level === "layering" ? (
        <div className="grid grid-cols-2 gap-2" data-testid="composition-panel-layering">
          {(
            [
              ["forward", "Bring forward", bringForward],
              ["backward", "Send backward", sendBackward],
              ["front", "Bring to front", bringToFront],
              ["back", "Send to back", sendToBack],
            ] as const
          ).map(([id, label, fn]) => (
            <Button
              key={id}
              type="button"
              variant="outline"
              className="min-h-11"
              disabled={!node}
              data-testid={`composition-layer-${id}`}
              onClick={() => {
                if (!node) return;
                patchNodes(fn(block.nodes, node.id), label);
              }}
            >
              {label}
            </Button>
          ))}
        </div>
      ) : null}

      {level === "align" ? (
        <div className="space-y-3" data-testid="composition-panel-align">
          <p className="text-[11px] text-white/65">
            Select two or more items (Shift-click on canvas) to align.
          </p>
          {distanceMeasurement ? (
            <p
              className="rounded-lg border border-[#9cff57]/25 bg-[#9cff57]/5 p-2 text-xs"
              data-testid="composition-distance-measurement"
            >
              Distance · {distanceMeasurement.horizontalPx}px horizontal ·{" "}
              {distanceMeasurement.verticalPx}px vertical
            </p>
          ) : null}
          <div className="grid grid-cols-3 gap-1">
            {(
              [
                "left",
                "center",
                "right",
                "top",
                "middle",
                "bottom",
              ] as AlignMode[]
            ).map((mode) => (
              <Button
                key={mode}
                type="button"
                variant="outline"
                className="min-h-10 capitalize"
                disabled={selectedNodeIds.length < 2}
                data-testid={`composition-align-${mode}`}
                onClick={() =>
                  patchNodes(
                    alignNodes(block.nodes, selectedNodeIds, mode),
                    `Aligned ${mode}`
                  )
                }
              >
                {mode}
              </Button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="min-h-10 flex-1"
              disabled={selectedNodeIds.length < 3}
              data-testid="composition-distribute-h"
              onClick={() =>
                patchNodes(
                  distributeNodes(block.nodes, selectedNodeIds, "horizontal"),
                  "Distributed horizontally"
                )
              }
            >
              Distribute H
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-10 flex-1"
              disabled={selectedNodeIds.length < 3}
              data-testid="composition-distribute-v"
              onClick={() =>
                patchNodes(
                  distributeNodes(block.nodes, selectedNodeIds, "vertical"),
                  "Distributed vertically"
                )
              }
            >
              Distribute V
            </Button>
          </div>
          <div className="space-y-2 border-t border-white/10 pt-3">
            <p className="text-[10px] uppercase tracking-wide text-white/65">
              Align to canvas
            </p>
            <div className="grid grid-cols-3 gap-1">
              {(
                ["left", "center", "right", "top", "middle", "bottom"] as AlignMode[]
              ).map((mode) => (
                <Button
                  key={`canvas-${mode}`}
                  type="button"
                  variant="outline"
                  className="min-h-10 capitalize"
                  disabled={!selectedNodeIds.length}
                  onClick={() =>
                    patchNodes(
                      alignNodesToCanvas(block.nodes, selectedNodeIds, mode),
                      `Aligned ${mode} to canvas`
                    )
                  }
                >
                  {mode}
                </Button>
              ))}
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-full"
            disabled={selectedNodeIds.length < 2}
            onClick={() =>
              patchNodes(
                tidyNodes(block.nodes, selectedNodeIds),
                "Tidied composition items"
              )
            }
            data-testid="composition-tidy"
          >
            Tidy up · equal spacing
          </Button>
        </div>
      ) : null}

      {level === "group" ? (
        <div className="space-y-2" data-testid="composition-panel-group">
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-full"
            disabled={selectedNodeIds.length < 2}
            data-testid="composition-group"
            onClick={() => {
              const next = groupNodes(block.nodes, selectedNodeIds);
              patchNodes(next, "Grouped items");
            }}
          >
            Group
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-full"
            disabled={!node?.groupId}
            data-testid="composition-ungroup"
            onClick={() => {
              if (!node?.groupId) return;
              patchNodes(ungroupNodes(block.nodes, node.groupId), "Ungrouped items");
            }}
          >
            Ungroup
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-full"
            disabled={!selectedNodeIds.length}
            data-testid="composition-lock"
            onClick={() =>
              patchNodes(
                setNodeLocked(block.nodes, selectedNodeIds, true),
                "Locked items"
              )
            }
          >
            Lock
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-full"
            disabled={!selectedNodeIds.length}
            data-testid="composition-unlock"
            onClick={() =>
              patchNodes(
                setNodeLocked(block.nodes, selectedNodeIds, false),
                "Unlocked items"
              )
            }
          >
            Unlock
          </Button>
        </div>
      ) : null}

      {level === "fallback" ? (
        <div className="space-y-2" data-testid="composition-panel-fallback">
          <p className="text-[11px] text-white/65">
            Live Device and customer phones keep the same freeform composition as the
            Studio canvas (scale). Stack / hide-decorative only apply when you explicitly
            preview the phone fallback in Studio.
          </p>
          {(
            [
              ["scale", "Scale (recommended — matches Studio)"],
              ["stack", "Stack (reading-order reflow when forced)"],
              ["hide_decorative", "Hide decorative (when forced)"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`flex min-h-11 w-full items-center rounded-md border px-3 text-left text-sm ${
                block.mobileFallback === id
                  ? "border-white/35 bg-white/10"
                  : "border-white/10"
              }`}
              data-testid={`composition-fallback-${id}`}
              onClick={() =>
                onChangeBlock(
                  { ...block, mobileFallback: id },
                  `Set phone fallback to ${id}`
                )
              }
            >
              {label}
            </button>
          ))}
          <Label className="text-xs">
            Safe area padding {block.safeAreaPaddingPx ?? 12}px
          </Label>
          <input
            type="range"
            min={0}
            max={40}
            value={block.safeAreaPaddingPx ?? 12}
            data-testid="composition-safe-area"
            className="w-full"
            onChange={(e) =>
              onChangeBlock(
                { ...block, safeAreaPaddingPx: Number(e.target.value) },
                "Changed composition safe area"
              )
            }
          />
        </div>
      ) : null}

      {level === "background" ? (
        <div className="space-y-3" data-testid="composition-panel-background">
          <Label className="text-xs">Background</Label>
          <div className="flex flex-wrap gap-1">
            {(
              [
                ["none", "None"],
                ["solid", "Solid"],
                ["gradient", "Gradient"],
                ["image", "Image"],
                ["pattern", "Pattern"],
                ["texture", "Texture"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`min-h-9 rounded-md border px-3 text-xs ${
                  (block.background?.kind || "none") === id
                    ? "border-white/35 bg-white/10"
                    : "border-white/10"
                }`}
                data-testid={`composition-bg-${id}`}
                onClick={() =>
                  onChangeBlock(
                    {
                      ...block,
                      background: {
                        kind: id,
                        value:
                          id === "solid"
                            ? block.background?.value || "#0b0f19"
                            : id === "gradient"
                              ? undefined
                              : undefined,
                        gradient:
                          id === "gradient"
                            ? block.background?.gradient ||
                              structuredClone(DEFAULT_GRADIENT)
                            : undefined,
                        image:
                          id === "image"
                            ? block.background?.image || {
                                src: "",
                                fit: "cover",
                                focalX: 0.5,
                                focalY: 0.5,
                                scale: 1,
                                repeat: "no-repeat",
                                blur: 0,
                                brightness: 1,
                                contrast: 1,
                                overlayOpacity: 0,
                                decorative: true,
                              }
                            : undefined,
                        pattern:
                          id === "pattern" || id === "texture"
                            ? {
                                ...structuredClone(DEFAULT_SURFACE_PATTERN),
                                kind: id,
                              }
                            : undefined,
                      },
                    },
                    `Set composition background to ${id}`
                  )
                }
              >
                {label}
              </button>
            ))}
          </div>
          {block.background?.kind === "solid" ? (
            <Input
              type="color"
              value={block.background.value || "#0b0f19"}
              data-testid="composition-bg-color"
              onChange={(e) =>
                onChangeBlock(
                  {
                    ...block,
                    background: { kind: "solid", value: e.target.value },
                  },
                  "Changed composition background color"
                )
              }
            />
          ) : null}
          {block.background?.kind === "gradient" ? (
            <GradientStudio
              value={block.background.gradient}
              brandColors={brandColors}
              foregroundColor={
                node?.primitive === "text"
                  ? String(node.props.color || defaultForegroundColor)
                  : defaultForegroundColor
              }
              onSuggestedTextColor={
                node?.primitive === "text"
                  ? (color) =>
                      patchNode(
                        node.id,
                        { props: { color } },
                        "Applied readable text color"
                      )
                  : undefined
              }
              onChange={(gradient, label) =>
                onChangeBlock(
                  {
                    ...block,
                    background: { kind: "gradient", gradient },
                  },
                  label
                )
              }
            />
          ) : null}
          {block.background?.kind === "image" ? (
            <div className="space-y-3" data-testid="composition-background-image-controls">
              <MediaPicker
                value={block.background.image?.src || ""}
                valueAssetId={block.background.image?.mediaAssetId}
                label="Composition background image"
                mediaUploadReady={mediaUploadReady}
                stockReady={stockReady}
                onAssetChange={(asset) =>
                  patchBackgroundImage(
                    {
                      src: asset?.url || "",
                      fallbackUrl: asset?.url || "",
                      mediaAssetId: asset?.mediaAssetId,
                    },
                    "Selected composition background image"
                  )
                }
              />
              <Label className="text-xs">Fit</Label>
              <div className="grid grid-cols-2 gap-1">
                {(["cover", "contain", "fill", "original"] as const).map((fit) => (
                  <button
                    key={fit}
                    type="button"
                    className={`min-h-10 rounded-lg border px-2 text-xs capitalize ${
                      block.background?.image?.fit === fit
                        ? "border-white/40 bg-white/10"
                        : "border-white/10"
                    }`}
                    onClick={() =>
                      patchBackgroundImage({ fit }, `Changed background fit to ${fit}`)
                    }
                  >
                    {fit}
                  </button>
                ))}
              </div>
              <Label className="text-xs">
                Horizontal position{" "}
                {Math.round((block.background.image?.focalX || 0.5) * 100)}%
              </Label>
              <input
                type="range"
                min={0}
                max={100}
                className="w-full"
                value={Math.round((block.background.image?.focalX || 0.5) * 100)}
                onChange={(event) =>
                  patchBackgroundImage(
                    { focalX: Number(event.target.value) / 100 },
                    "Changed background focal point"
                  )
                }
              />
              <Label className="text-xs">
                Vertical position{" "}
                {Math.round((block.background.image?.focalY || 0.5) * 100)}%
              </Label>
              <input
                type="range"
                min={0}
                max={100}
                className="w-full"
                value={Math.round((block.background.image?.focalY || 0.5) * 100)}
                onChange={(event) =>
                  patchBackgroundImage(
                    { focalY: Number(event.target.value) / 100 },
                    "Changed background focal point"
                  )
                }
              />
              <Label className="text-xs">Repeat / tile</Label>
              <select
                value={block.background.image?.repeat || "no-repeat"}
                onChange={(event) =>
                  patchBackgroundImage(
                    {
                      repeat: event.target.value as
                        | "no-repeat"
                        | "repeat"
                        | "repeat-x"
                        | "repeat-y",
                    },
                    "Changed background repeat"
                  )
                }
                className="min-h-10 w-full rounded-lg border border-white/15 bg-black/30 px-3 text-xs"
              >
                <option value="no-repeat">No repeat</option>
                <option value="repeat">Tile</option>
                <option value="repeat-x">Repeat horizontal</option>
                <option value="repeat-y">Repeat vertical</option>
              </select>
              <label className="space-y-1 text-xs">
                <span>
                  Scale {Math.round((block.background.image?.scale || 1) * 100)}%
                </span>
                <input
                  type="range"
                  min={25}
                  max={300}
                  value={Math.round((block.background.image?.scale || 1) * 100)}
                  className="w-full"
                  onChange={(event) =>
                    patchBackgroundImage(
                      { scale: Number(event.target.value) / 100 },
                      "Scaled background image"
                    )
                  }
                  data-testid="background-image-scale"
                />
              </label>
              <label className="space-y-1 text-xs">
                <span>Blur {Math.round(block.background.image?.blur || 0)} px</span>
                <input
                  type="range"
                  min={0}
                  max={40}
                  value={block.background.image?.blur || 0}
                  className="w-full"
                  onChange={(event) =>
                    patchBackgroundImage(
                      { blur: Number(event.target.value) },
                      "Changed background blur"
                    )
                  }
                  data-testid="background-image-blur"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1 text-xs">
                  <span>
                    Brightness{" "}
                    {Math.round((block.background.image?.brightness || 1) * 100)}%
                  </span>
                  <input
                    type="range"
                    min={25}
                    max={200}
                    value={Math.round(
                      (block.background.image?.brightness || 1) * 100
                    )}
                    className="w-full"
                    onChange={(event) =>
                      patchBackgroundImage(
                        { brightness: Number(event.target.value) / 100 },
                        "Changed background brightness"
                      )
                    }
                  />
                </label>
                <label className="space-y-1 text-xs">
                  <span>
                    Contrast{" "}
                    {Math.round((block.background.image?.contrast || 1) * 100)}%
                  </span>
                  <input
                    type="range"
                    min={25}
                    max={200}
                    value={Math.round(
                      (block.background.image?.contrast || 1) * 100
                    )}
                    className="w-full"
                    onChange={(event) =>
                      patchBackgroundImage(
                        { contrast: Number(event.target.value) / 100 },
                        "Changed background contrast"
                      )
                    }
                  />
                </label>
              </div>
              <Label className="text-xs">Blend mode</Label>
              <select
                value={block.background.image?.blendMode || "normal"}
                onChange={(event) =>
                  patchBackgroundImage(
                    {
                      blendMode: event.target.value as
                        | "normal"
                        | "multiply"
                        | "screen"
                        | "overlay"
                        | "soft-light",
                    },
                    "Changed background blend mode"
                  )
                }
                className="min-h-10 w-full rounded-lg border border-white/15 bg-black/30 px-3 text-xs"
                data-testid="background-image-blend-mode"
              >
                <option value="normal">Normal</option>
                <option value="multiply">Multiply</option>
                <option value="screen">Screen</option>
                <option value="overlay">Overlay</option>
                <option value="soft-light">Soft light</option>
              </select>
              <div className="grid grid-cols-[64px_1fr] items-center gap-2">
                <Input
                  type="color"
                  aria-label="Background overlay color"
                  value={block.background.image?.overlayColor || "#000000"}
                  onChange={(event) =>
                    patchBackgroundImage(
                      { overlayColor: event.target.value },
                      "Changed background overlay color"
                    )
                  }
                />
                <label className="space-y-1 text-xs">
                  <span>
                    Overlay{" "}
                    {Math.round((block.background.image?.overlayOpacity || 0) * 100)}%
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    className="w-full"
                    value={Math.round(
                      (block.background.image?.overlayOpacity || 0) * 100
                    )}
                    onChange={(event) =>
                      patchBackgroundImage(
                        { overlayOpacity: Number(event.target.value) / 100 },
                        "Changed background overlay opacity"
                      )
                    }
                  />
                </label>
              </div>
              <label className="flex min-h-11 items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={Boolean(block.background.image?.decorative)}
                  onChange={(event) =>
                    patchBackgroundImage(
                      {
                        decorative: event.target.checked,
                        alt: event.target.checked
                          ? ""
                          : block.background?.image?.alt || "",
                      },
                      event.target.checked
                        ? "Marked background decorative"
                        : "Marked background meaningful"
                    )
                  }
                />
                Decorative image
              </label>
              {!block.background.image?.decorative ? (
                <Input
                  value={block.background.image?.alt || ""}
                  placeholder="Describe this background"
                  aria-label="Background image alt text"
                  onChange={(event) =>
                    patchBackgroundImage(
                      { alt: event.target.value },
                      "Changed background alt text"
                    )
                  }
                />
              ) : null}
              <p className="rounded-lg border border-white/10 bg-white/[0.03] p-2 text-[11px] text-white/55">
                Contrast assistance: use the tint overlay when text loses clarity.
                Higher overlay opacity improves readability without changing the
                source asset.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  patchBackgroundImage(
                    {
                      fit: "cover",
                      focalX: 0.5,
                      focalY: 0.5,
                      scale: 1,
                      repeat: "no-repeat",
                      blur: 0,
                      brightness: 1,
                      contrast: 1,
                      overlayColor: "#000000",
                      overlayOpacity: 0,
                    },
                    "Reset background image treatment"
                  )
                }
              >
                Reset image treatment
              </Button>
            </div>
          ) : null}
          {block.background?.kind === "pattern" ||
          block.background?.kind === "texture" ? (
            <PatternTextureStudio
              kind={block.background.kind}
              value={block.background.pattern}
              onChange={(pattern, label) =>
                onChangeBlock(
                  {
                    ...block,
                    background: {
                      kind: pattern.kind,
                      pattern,
                    },
                  },
                  label
                )
              }
            />
          ) : null}
          <ReusableDesignBrowser
            kind="BACKGROUND"
            value={compositionBackgroundToFill(block.background)}
            title="Saved backgrounds"
            onInsert={(fill, label) =>
              onChangeBlock(
                {
                  ...block,
                  background: creativeFillToCompositionBackground(fill),
                },
                label
              )
            }
          />
        </div>
      ) : null}

      {level === "responsive" && node ? (
        <div className="space-y-3" data-testid="composition-panel-responsive">
          <Label className="text-xs">Anchor</Label>
          <div className="grid grid-cols-3 gap-1">
            {(
              [
                "top-left",
                "top",
                "top-right",
                "left",
                "center",
                "right",
                "bottom-left",
                "bottom",
                "bottom-right",
              ] as CreativeCompositionAnchor[]
            ).map((a) => (
              <button
                key={a}
                type="button"
                className={`min-h-9 rounded-md border px-1 text-[10px] ${
                  (node.anchor || "top-left") === a
                    ? "border-white/35 bg-white/10"
                    : "border-white/10"
                }`}
                data-testid={`composition-anchor-${a}`}
                onClick={() =>
                  patchNode(node.id, { anchor: a }, `Set anchor ${a}`)
                }
              >
                {a}
              </button>
            ))}
          </div>
          <Label className="text-xs">
            Width % {Math.round((node.widthPct ?? node.width) * 100)}
          </Label>
          <input
            type="range"
            min={8}
            max={100}
            value={Math.round((node.widthPct ?? node.width) * 100)}
            data-testid="composition-width-pct"
            className="w-full"
            onChange={(e) =>
              patchNode(
                node.id,
                {
                  widthPct: Number(e.target.value) / 100,
                  width: Number(e.target.value) / 100,
                },
                "Changed responsive width"
              )
            }
          />
          <Label className="text-xs">Min width (px)</Label>
          <Input
            type="number"
            min={0}
            max={480}
            value={Number(node.minWidthPx || 0)}
            data-testid="composition-min-width"
            onChange={(e) =>
              patchNode(
                node.id,
                { minWidthPx: Number(e.target.value) || undefined },
                "Changed min width"
              )
            }
          />
        </div>
      ) : null}
    </NestedPanelShell>
  );
}
