"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  FRAME_MASK_CATALOG,
  accessibleReadingOrder,
  frameMaskPath,
  sortCompositionNodes,
  type CreativeCompositionBlock,
  type CreativeCompositionNode,
  type FrameMaskId,
} from "@/lib/fusion/creative-studio/composition";

export type CreativeCompositionCanvasProps = {
  block: CreativeCompositionBlock;
  editMode?: boolean;
  selectedNodeIds?: string[];
  onSelectNodes?: (ids: string[]) => void;
  onChangeBlock?: (next: CreativeCompositionBlock, label?: string) => void;
  /** Force mobile fallback layout (narrow preview). */
  forceMobileFallback?: boolean;
  className?: string;
  aspectRatio?: number;
};

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function num(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function NodeVisual({
  node,
  editMode,
}: {
  node: CreativeCompositionNode;
  editMode?: boolean;
}) {
  if (node.primitive === "text") {
    return (
      <div
        className="flex h-full w-full items-center overflow-hidden px-1"
        style={{
          color: str(node.props.color, "#f8fafc"),
          fontSize: num(node.props.fontSize, 18),
          fontFamily: str(node.props.fontFamily, "Inter, system-ui, sans-serif"),
          fontWeight: num(node.props.fontWeight, 600),
          textAlign: (str(node.props.align, "center") as "left" | "center" | "right"),
          justifyContent:
            str(node.props.align, "center") === "left"
              ? "flex-start"
              : str(node.props.align, "center") === "right"
                ? "flex-end"
                : "center",
        }}
      >
        <span className="w-full leading-tight">{str(node.props.text, "Text")}</span>
      </div>
    );
  }

  if (node.primitive === "image") {
    const src = str(node.props.src);
    const fit = str(node.props.fit, "cover") as "cover" | "contain";
    return (
      <div
        className="h-full w-full overflow-hidden rounded-md bg-white/10"
        style={{ opacity: num(node.props.opacity, 1) }}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={str(node.props.alt, "Image")}
            className="h-full w-full"
            style={{ objectFit: fit }}
            draggable={false}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[10px] text-white/40">
            {editMode ? "Add image URL in inspector" : "Image"}
          </div>
        )}
      </div>
    );
  }

  if (node.primitive === "frame") {
    const mask = str(node.props.mask, "rounded") as FrameMaskId;
    const clipId = `mask-${node.id}`;
    const src = str(node.props.mediaSrc) || str(node.props.src);
    const fit = str(node.props.fit, "cover");
    const fx = num(node.props.focalX, 0.5) * 100;
    const fy = num(node.props.focalY, 0.5) * 100;
    const borderW = num(node.props.borderWidth, 0);
    const borderColor = str(node.props.borderColor, "#ffffff");
    return (
      <div className="relative h-full w-full">
        <svg className="absolute h-0 w-0" aria-hidden>
          <defs>
            <clipPath id={clipId} clipPathUnits="objectBoundingBox">
              <path
                d={frameMaskPath(mask)}
                transform="scale(0.01 0.01)"
              />
            </clipPath>
          </defs>
        </svg>
        <div
          className="h-full w-full overflow-hidden bg-white/10"
          style={{
            clipPath: `url(#${clipId})`,
            WebkitClipPath: `url(#${clipId})`,
            boxShadow: borderW ? `inset 0 0 0 ${borderW}px ${borderColor}` : undefined,
          }}
        >
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={str(node.props.alt, "Framed media")}
              className="h-full w-full"
              style={{
                objectFit: fit as "cover" | "contain",
                objectPosition: `${fx}% ${fy}%`,
              }}
              draggable={false}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-1 text-[10px] text-white/45">
              <span>{FRAME_MASK_CATALOG.find((m) => m.id === mask)?.label || "Frame"}</span>
              {editMode ? <span>Set media in inspector</span> : null}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (node.primitive === "shape") {
    const shape = str(node.props.shape, "rounded");
    const radius =
      shape === "circle" ? "50%" : shape === "square" ? "0" : "0.75rem";
    return (
      <div
        className="h-full w-full"
        style={{
          background: str(node.props.fill, "#22c55e"),
          opacity: num(node.props.opacity, 1),
          borderRadius: radius,
          border:
            num(node.props.strokeWidth, 0) > 0
              ? `${num(node.props.strokeWidth, 0)}px solid ${str(node.props.stroke, "#fff")}`
              : undefined,
        }}
      />
    );
  }

  if (node.primitive === "border") {
    return (
      <div
        className="h-full w-full"
        style={{
          borderTop: `${num(node.props.thickness, 2)}px ${str(node.props.style, "solid")} ${str(node.props.color, "#fff")}`,
        }}
      />
    );
  }

  if (node.primitive === "button") {
    return (
      <div
        className="flex h-full w-full items-center justify-center rounded-full px-2 text-sm font-semibold"
        style={{
          background: str(node.props.fill, "#22c55e"),
          color: str(node.props.textColor, "#0b0f19"),
        }}
      >
        {str(node.props.label, "Button")}
      </div>
    );
  }

  return null;
}

export function CreativeCompositionCanvas({
  block,
  editMode = false,
  selectedNodeIds = [],
  onSelectNodes,
  onChangeBlock,
  forceMobileFallback = false,
  className,
  aspectRatio = 4 / 5,
}: CreativeCompositionCanvasProps) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [narrow, setNarrow] = useState(false);
  const [draftNodes, setDraftNodes] = useState<CreativeCompositionNode[] | null>(
    null
  );
  const [drag, setDrag] = useState<{
    id: string;
    mode: "move" | "resize";
    startX: number;
    startY: number;
    orig: CreativeCompositionNode;
  } | null>(null);

  useEffect(() => {
    const el = surfaceRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      setNarrow(w > 0 && w < 420);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const selectedSet = useMemo(() => new Set(selectedNodeIds), [selectedNodeIds]);
  /** Edit keeps freeform; phone fallback applies in preview/public when narrow. */
  const applyFallback = !editMode && (forceMobileFallback || narrow);
  const useStack = applyFallback && block.mobileFallback === "stack";
  const hideDecorative =
    applyFallback && block.mobileFallback === "hide_decorative";

  const workingNodes = draftNodes ?? block.nodes;

  const visibleNodes = useMemo(() => {
    let nodes = sortCompositionNodes(workingNodes).filter((n) => n.visible !== false);
    if (hideDecorative) {
      nodes = nodes.filter((n) => n.primitive === "text" || n.primitive === "button");
    }
    return nodes;
  }, [workingNodes, hideDecorative]);

  const readingOrder = useMemo(
    () => accessibleReadingOrder(visibleNodes),
    [visibleNodes]
  );

  const commitNodes = useCallback(
    (nodes: CreativeCompositionNode[], label: string) => {
      onChangeBlock?.({ ...block, nodes }, label);
    },
    [block, onChangeBlock]
  );

  const onPointerDownNode = (
    e: React.PointerEvent,
    node: CreativeCompositionNode,
    mode: "move" | "resize"
  ) => {
    if (!editMode || node.locked) return;
    e.stopPropagation();
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const multi = e.metaKey || e.ctrlKey || e.shiftKey;
    if (multi) {
      const next = selectedSet.has(node.id)
        ? selectedNodeIds.filter((id) => id !== node.id)
        : [...selectedNodeIds, node.id];
      onSelectNodes?.(next);
    } else if (!selectedSet.has(node.id)) {
      onSelectNodes?.([node.id]);
    }
    setDrag({
      id: node.id,
      mode,
      startX: e.clientX,
      startY: e.clientY,
      orig: { ...node },
    });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag || !surfaceRef.current || !editMode) return;
    const rect = surfaceRef.current.getBoundingClientRect();
    const dx = (e.clientX - drag.startX) / rect.width;
    const dy = (e.clientY - drag.startY) / rect.height;
    const nodes = (draftNodes ?? block.nodes).map((n) => {
      if (n.id !== drag.id) return n;
      if (drag.mode === "move") {
        return {
          ...n,
          x: Math.min(1 - n.width, Math.max(0, drag.orig.x + dx)),
          y: Math.min(1 - n.height, Math.max(0, drag.orig.y + dy)),
        };
      }
      return {
        ...n,
        width: Math.min(1 - n.x, Math.max(0.08, drag.orig.width + dx)),
        height: Math.min(1 - n.y, Math.max(0.08, drag.orig.height + dy)),
      };
    });
    setDraftNodes(nodes);
  };

  const onPointerUp = () => {
    if (!drag) return;
    const nodes = draftNodes ?? block.nodes;
    const mode = drag.mode;
    setDrag(null);
    setDraftNodes(null);
    commitNodes(
      nodes,
      mode === "resize" ? "Resized composition item" : "Moved composition item"
    );
  };

  const bg =
    block.background?.kind === "solid"
      ? block.background.value || "#0b0f19"
      : block.background?.kind === "gradient"
        ? block.background.value || "linear-gradient(180deg,#0b0f19,#1a2332)"
        : "transparent";

  if (useStack) {
    return (
      <div
        ref={surfaceRef}
        className={cn(
          "flex flex-col gap-3 rounded-xl border border-white/10 p-3",
          className
        )}
        style={{ background: bg }}
        data-testid="creative-composition-canvas"
        data-mobile-fallback="stack"
        role="group"
        aria-label={block.label}
      >
        <ol className="sr-only" data-testid="composition-reading-order">
          {readingOrder.map((n) => (
            <li key={n.id}>
              {n.primitive}:{" "}
              {str(n.props.text) ||
                str(n.props.alt) ||
                str(n.props.label) ||
                n.id}
            </li>
          ))}
        </ol>
        {readingOrder.map((node) => (
          <div
            key={node.id}
            className="relative min-h-[72px] w-full"
            data-composition-node={node.id}
            data-primitive={node.primitive}
            data-selected={selectedSet.has(node.id) ? "true" : "false"}
            onClick={(e) => {
              if (!editMode) return;
              e.stopPropagation();
              onSelectNodes?.([node.id]);
            }}
          >
            <NodeVisual node={node} editMode={editMode} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      ref={surfaceRef}
      className={cn(
        "relative w-full overflow-hidden rounded-xl border border-white/10",
        editMode && "touch-none",
        className
      )}
      style={{
        background: bg,
        aspectRatio: String(aspectRatio),
        padding: block.safeAreaPaddingPx ?? 12,
      }}
      data-testid="creative-composition-canvas"
      data-mobile-fallback={forceMobileFallback ? block.mobileFallback : "desktop"}
      role="group"
      aria-label={block.label}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      onClick={() => {
        if (editMode) onSelectNodes?.([]);
      }}
    >
      {/* Accessible reading order (visually hidden list for SR) */}
      <ol className="sr-only" data-testid="composition-reading-order">
        {readingOrder.map((n) => (
          <li key={n.id}>
            {n.primitive}: {str(n.props.text) || str(n.props.alt) || str(n.props.label) || n.id}
          </li>
        ))}
      </ol>

      {visibleNodes.map((node) => {
        const selected = selectedSet.has(node.id);
        return (
          <div
            key={node.id}
            className={cn(
              "absolute",
              editMode && !node.locked && "cursor-move",
              selected && editMode && "ring-2 ring-white/70 ring-offset-1 ring-offset-transparent"
            )}
            style={{
              left: `${node.x * 100}%`,
              top: `${node.y * 100}%`,
              width: `${node.width * 100}%`,
              height: `${node.height * 100}%`,
              zIndex: node.zIndex,
              transform: node.rotationDeg
                ? `rotate(${node.rotationDeg}deg)`
                : undefined,
              opacity: node.visible === false ? 0 : 1,
            }}
            data-composition-node={node.id}
            data-primitive={node.primitive}
            data-selected={selected ? "true" : "false"}
            data-locked={node.locked ? "true" : "false"}
            data-group={node.groupId || undefined}
            onPointerDown={(e) => onPointerDownNode(e, node, "move")}
            role={editMode ? "button" : undefined}
            tabIndex={editMode ? 0 : undefined}
            aria-label={`${node.primitive}${node.locked ? " locked" : ""}`}
          >
            <NodeVisual node={node} editMode={editMode} />
            {editMode && selected && !node.locked ? (
              <button
                type="button"
                className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-sm border border-white/80 bg-white/90"
                data-testid={`composition-resize-${node.id}`}
                aria-label="Resize"
                onPointerDown={(e) => onPointerDownNode(e, node, "resize")}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
