"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  NestedPanelShell,
  PanelNavRow,
} from "@/components/fusion/creative-studio/nested-panel-shell";
import {
  FRAME_MASK_CATALOG,
  alignNodes,
  bringForward,
  bringToFront,
  createCompositionNode,
  deleteNodes,
  distributeNodes,
  duplicateNodes,
  groupNodes,
  sendBackward,
  sendToBack,
  setNodeLocked,
  ungroupNodes,
  type AlignMode,
  type CreativeCompositionBlock,
  type CreativeCompositionNode,
  type CreativeCompositionPrimitive,
  type FrameMaskId,
} from "@/lib/fusion/creative-studio/composition";

type Level =
  | "root"
  | "add"
  | "text"
  | "image"
  | "frame"
  | "shape"
  | "border"
  | "layering"
  | "align"
  | "group"
  | "fallback"
  | "masks";

export type CompositionPanelStackProps = {
  block: CreativeCompositionBlock;
  selectedNodeIds: string[];
  onSelectNodes: (ids: string[]) => void;
  onChangeBlock: (next: CreativeCompositionBlock, label?: string) => void;
  onClose?: () => void;
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
}: CompositionPanelStackProps) {
  const [level, setLevel] = useState<Level>(() => readRememberedLevel(block.id));
  const node = primaryNode(block, selectedNodeIds);
  const multi = selectedNodeIds.length > 1;

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
      image: "Image",
      frame: "Frame",
      shape: "Shape",
      border: "Border / Divider",
      layering: "Layering",
      align: "Align & Distribute",
      group: "Group",
      fallback: "Phone fallback",
      masks: "Masking Shape",
    };
    if (level === "masks") return [...base, "Frame", labels.masks];
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
      onBack={level === "root" ? undefined : () => setLevel(level === "masks" ? "frame" : "root")}
      onClose={onClose}
      testId="composition-panel-stack"
    >
      {level === "root" ? (
        <div className="space-y-3" data-testid="composition-panel-root">
          <div
            className="rounded-md border border-white/10 bg-white/[0.03] p-3 space-y-2"
            data-testid="composition-panel-hub"
          >
            <p className="text-[10px] uppercase tracking-wide text-white/40">
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
                <Input
                  value={String(node.props.src || "")}
                  placeholder="Image URL"
                  data-testid="composition-hub-image-src"
                  onChange={(e) =>
                    patchNode(node.id, { props: { src: e.target.value } }, "Set composition image")
                  }
                />
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
            {multi ? (
              <div className="flex flex-wrap gap-1 border-t border-white/10 pt-2" data-testid="composition-hub-multi">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-9"
                  data-testid="composition-hub-group"
                  onClick={() => patchNodes(groupNodes(block.nodes, selectedNodeIds), "Grouped items")}
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
          <PanelNavRow
            label="Phone fallback"
            hint={block.mobileFallback}
            testId="composition-open-fallback"
            onClick={() => setLevel("fallback")}
          />

          <div className="space-y-1" data-testid="composition-layers-list">
            <Label className="text-[10px] text-white/45">Layers</Label>
            {[...block.nodes]
              .sort((a, b) => b.zIndex - a.zIndex)
              .map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className={`flex min-h-9 w-full items-center justify-between rounded-md border px-2 text-left text-xs ${
                    selectedNodeIds.includes(n.id)
                      ? "border-white/35 bg-white/10"
                      : "border-white/10"
                  }`}
                  data-testid={`composition-layer-${n.id}`}
                  onClick={() => onSelectNodes([n.id])}
                >
                  <span>
                    {n.primitive}
                    {n.locked ? " · locked" : ""}
                    {n.groupId ? " · grouped" : ""}
                    {n.visible === false ? " · hidden" : ""}
                  </span>
                  <span className="text-white/35">z{n.zIndex}</span>
                </button>
              ))}
          </div>
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
        </div>
      ) : null}

      {level === "image" && node?.primitive === "image" ? (
        <div className="space-y-3" data-testid="composition-panel-image">
          <Label className="text-xs">Image URL</Label>
          <Input
            value={String(node.props.src || "")}
            placeholder="https://…"
            data-testid="composition-image-src"
            onChange={(e) =>
              patchNode(node.id, { props: { src: e.target.value } }, "Set composition image")
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
            {(["cover", "contain"] as const).map((fit) => (
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
                {fit}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {level === "frame" && node?.primitive === "frame" ? (
        <div className="space-y-3" data-testid="composition-panel-frame">
          <Label className="text-xs">Media URL</Label>
          <Input
            value={String(node.props.mediaSrc || node.props.src || "")}
            data-testid="composition-frame-src"
            onChange={(e) =>
              patchNode(
                node.id,
                { props: { mediaSrc: e.target.value } },
                "Set frame media"
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
        </div>
      ) : null}

      {level === "masks" && node?.primitive === "frame" ? (
        <div className="grid grid-cols-2 gap-2" data-testid="composition-panel-masks">
          {FRAME_MASK_CATALOG.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`min-h-14 rounded-md border px-2 text-xs ${
                node.props.mask === m.id
                  ? "border-white/40 bg-white/10"
                  : "border-white/10"
              }`}
              data-testid={`composition-mask-${m.id}`}
              onClick={() =>
                patchNode(
                  node.id,
                  { props: { mask: m.id as FrameMaskId } },
                  `Applied ${m.label} mask`
                )
              }
            >
              {m.label}
            </button>
          ))}
        </div>
      ) : null}

      {level === "shape" && node?.primitive === "shape" ? (
        <div className="space-y-3" data-testid="composition-panel-shape">
          <Label className="text-xs">Fill</Label>
          <Input
            type="color"
            value={String(node.props.fill || "#22c55e")}
            data-testid="composition-shape-fill"
            onChange={(e) =>
              patchNode(node.id, { props: { fill: e.target.value } }, "Changed shape fill")
            }
          />
        </div>
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
            {(["solid", "dashed", "dotted"] as const).map((style) => (
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
          <p className="text-[11px] text-white/45">
            Select two or more items (Shift-click on canvas) to align.
          </p>
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
          <p className="text-[11px] text-white/45">
            On narrow screens, compositions must stay readable. Choose an honest fallback.
          </p>
          {(
            [
              ["stack", "Stack (recommended)"],
              ["scale", "Scale"],
              ["hide_decorative", "Hide decorative"],
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
        </div>
      ) : null}
    </NestedPanelShell>
  );
}
