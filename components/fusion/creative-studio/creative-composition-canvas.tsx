"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  FRAME_MASK_CATALOG,
  accessibleReadingOrder,
  compositionAppliesMobileFallback,
  deleteNodes,
  duplicateNodes,
  expandSelectionToGroups,
  frameMaskPath,
  resolveNodeBox,
  sortCompositionNodes,
  translateNodes,
  type CreativeCompositionBlock,
  type CreativeCompositionNode,
  type FrameMaskId,
} from "@/lib/fusion/creative-studio/composition";
import {
  DEFAULT_GRADIENT,
  gradientToCss,
} from "@/lib/fusion/creative-studio/gradient";
import { surfacePatternStyle } from "@/lib/fusion/creative-studio/patterns";
import {
  snapCompositionNodes,
  type CompositionGuide,
} from "@/lib/fusion/creative-studio/composition-snap";

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
          fontStyle: node.props.italic === true ? "italic" : "normal",
          textDecoration: [
            node.props.underline === true ? "underline" : "",
            node.props.strikethrough === true ? "line-through" : "",
          ]
            .filter(Boolean)
            .join(" ") || undefined,
          letterSpacing: `${num(node.props.letterSpacingEm, 0)}em`,
          lineHeight: num(node.props.lineHeight, 1.2),
          textTransform: str(node.props.textTransform, "none") as
            | "none"
            | "uppercase"
            | "lowercase"
            | "capitalize",
          textAlign: (str(node.props.align, "center") as
            | "left"
            | "center"
            | "right"
            | "justify"),
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
    const fit = str(node.props.fit, "cover") as "cover" | "contain" | "fill" | "none";
    const flipX = node.props.flipX === true ? -1 : 1;
    const flipY = node.props.flipY === true ? -1 : 1;
    const mediaRotation = num(node.props.mediaRotation, 0);
    return (
      <div
        className="h-full w-full overflow-hidden rounded-md bg-white/10"
        style={{ opacity: num(node.props.opacity, 1) }}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={node.props.decorative === true ? "" : str(node.props.alt, "Image")}
            className="h-full w-full"
            style={{
              objectFit: fit,
              objectPosition: `${num(node.props.focalX, 0.5) * 100}% ${
                num(node.props.focalY, 0.5) * 100
              }%`,
              opacity: num(node.props.opacity, 1),
              transform: `scale(${flipX}, ${flipY}) rotate(${mediaRotation}deg)`,
              filter: [
                `brightness(${num(node.props.brightness, 1)})`,
                `contrast(${num(node.props.contrast, 1)})`,
                `saturate(${num(node.props.saturation, 1)})`,
                `blur(${num(node.props.blur, 0)}px)`,
                node.props.grayscale === true ? "grayscale(1)" : "",
                node.props.sepia === true ? "sepia(1)" : "",
              ]
                .filter(Boolean)
                .join(" "),
            }}
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
    const borderOpacity = num(node.props.borderOpacity, 1);
    const borderStyle = str(node.props.borderStyle, "solid");
    const borderAlignment = str(node.props.borderAlignment, "center");
    const scaleStroke = node.props.scaleStroke !== false;
    const borderGlow = num(node.props.borderGlow, 0);
    const borderShadow = num(node.props.borderShadow, 0);
    const mediaScale = num(node.props.mediaScale, 1);
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
            padding: num(node.props.padding, 0),
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
                transform: mediaScale !== 1 ? `scale(${mediaScale})` : undefined,
                transformOrigin: `${fx}% ${fy}%`,
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
        {borderW > 0 ? (
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
            aria-hidden
            style={{
              clipPath:
                borderAlignment === "inside" ? `url(#${clipId})` : undefined,
              filter:
                borderGlow > 0
                  ? `drop-shadow(0 0 ${borderGlow}px ${borderColor})`
                  : borderShadow > 0
                    ? `drop-shadow(0 ${Math.max(1, borderShadow / 2)}px ${borderShadow}px rgba(0,0,0,.55))`
                    : undefined,
            }}
          >
            <path
              d={frameMaskPath(mask)}
              fill="none"
              stroke={borderColor}
              strokeOpacity={borderOpacity}
              strokeWidth={
                borderAlignment === "inside" || borderAlignment === "outside"
                  ? borderW * 2
                  : borderW
              }
              strokeDasharray={
                borderStyle === "dashed"
                  ? "8 5"
                  : borderStyle === "dotted"
                    ? "1 5"
                    : undefined
              }
              strokeLinecap={borderStyle === "dotted" ? "round" : "butt"}
              strokeLinejoin="round"
              vectorEffect={scaleStroke ? undefined : "non-scaling-stroke"}
            />
          </svg>
        ) : null}
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
    const style = str(node.props.style, "solid");
    const thickness = num(node.props.thickness, 2);
    const color = str(node.props.color, "#fff");
    const opacity = num(node.props.opacity, 1);
    const cap = str(node.props.cap, "round");
    const startMarker = str(node.props.startMarker, "none");
    const endMarker = str(node.props.endMarker, "none");
    const markerId = (side: "start" | "end", type: string) =>
      `divider-${node.id}-${side}-${type}`;
    const dash =
      style === "dashed"
        ? "10 7"
        : style === "dotted"
          ? "1 7"
          : style === "custom"
            ? str(node.props.customDash, "12 5 3 5")
            : undefined;
    const linePath =
      style === "wavy"
        ? "M2 10 C8 1 14 19 20 10 S32 1 38 10 S50 19 56 10 S68 1 74 10 S86 19 98 10"
        : "M2 10 H98";
    const markerShape = (type: string) => {
      if (type === "arrow") return <path d="M0 0 L10 5 L0 10 Z" fill={color} />;
      if (type === "diamond")
        return <path d="M0 5 L5 0 L10 5 L5 10 Z" fill={color} />;
      if (type === "circle") return <circle cx="5" cy="5" r="4" fill={color} />;
      if (type === "square") return <rect x="1" y="1" width="8" height="8" fill={color} />;
      return null;
    };
    return (
      <svg
        viewBox="0 0 100 20"
        preserveAspectRatio="none"
        className="h-full w-full overflow-visible"
        data-border-style={style}
        role="img"
        aria-label={str(node.props.label, "Divider")}
      >
        <defs>
          {(["start", "end"] as const).map((side) => {
            const type = side === "start" ? startMarker : endMarker;
            return type === "none" ? null : (
              <marker
                key={side}
                id={markerId(side, type)}
                viewBox="0 0 10 10"
                refX={side === "start" ? 1 : 9}
                refY="5"
                markerWidth="5"
                markerHeight="5"
                orient="auto-start-reverse"
              >
                {markerShape(type)}
              </marker>
            );
          })}
        </defs>
        {style === "double" ? (
          <>
            <path
              d="M2 7 H98"
              fill="none"
              stroke={color}
              strokeOpacity={opacity}
              strokeWidth={Math.max(1, thickness / 2)}
              vectorEffect="non-scaling-stroke"
            />
            <path
              d="M2 13 H98"
              fill="none"
              stroke={color}
              strokeOpacity={opacity}
              strokeWidth={Math.max(1, thickness / 2)}
              vectorEffect="non-scaling-stroke"
            />
          </>
        ) : (
          <path
            d={linePath}
            fill="none"
            stroke={color}
            strokeOpacity={opacity}
            strokeWidth={thickness}
            strokeDasharray={dash}
            strokeLinecap={cap === "square" ? "square" : "round"}
            vectorEffect="non-scaling-stroke"
            markerStart={
              startMarker === "none"
                ? undefined
                : `url(#${markerId("start", startMarker)})`
            }
            markerEnd={
              endMarker === "none"
                ? undefined
                : `url(#${markerId("end", endMarker)})`
            }
          />
        )}
      </svg>
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
  const [guides, setGuides] = useState<CompositionGuide[]>([]);
  const [drag, setDrag] = useState<{
    id: string;
    mode: "move" | "resize";
    startX: number;
    startY: number;
    orig: CreativeCompositionNode;
    /** Snapshot of all nodes at drag start (for group/multi move). */
    origNodes: CreativeCompositionNode[];
    moveIds: string[];
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
  const applyFallback = compositionAppliesMobileFallback({
    editMode,
    forceMobileFallback,
  });
  const useStack = applyFallback && block.mobileFallback === "stack";
  const hideDecorative =
    applyFallback && block.mobileFallback === "hide_decorative";
  /** scale (default) keeps freeform relative layout — same renderer as edit */

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

  useEffect(() => {
    if (!editMode) return;
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target?.closest?.("input, textarea, select, [contenteditable=true]")) {
        return;
      }
      if (!selectedNodeIds.length) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        commitNodes(
          deleteNodes(block.nodes, selectedNodeIds),
          "Deleted composition items"
        );
        onSelectNodes?.([]);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        const { nodes, newIds } = duplicateNodes(block.nodes, selectedNodeIds);
        commitNodes(nodes, "Duplicated composition items");
        if (newIds.length) onSelectNodes?.(newIds);
      }
      // Arrow nudge — responsive relative units
      const step = e.shiftKey ? 0.02 : 0.005;
      let dx = 0;
      let dy = 0;
      if (e.key === "ArrowLeft") dx = -step;
      if (e.key === "ArrowRight") dx = step;
      if (e.key === "ArrowUp") dy = -step;
      if (e.key === "ArrowDown") dy = step;
      if (dx || dy) {
        e.preventDefault();
        const ids = expandSelectionToGroups(block.nodes, selectedNodeIds);
        commitNodes(
          translateNodes(block.nodes, ids, dx, dy),
          "Nudged composition items"
        );
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editMode, selectedNodeIds, block.nodes, commitNodes, onSelectNodes]);

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
    let nextIds: string[];
    if (multi) {
      nextIds = selectedSet.has(node.id)
        ? selectedNodeIds.filter((id) => id !== node.id)
        : [...selectedNodeIds, node.id];
    } else if (!selectedSet.has(node.id)) {
      nextIds = expandSelectionToGroups(block.nodes, [node.id]);
    } else {
      nextIds = expandSelectionToGroups(block.nodes, selectedNodeIds);
    }
    onSelectNodes?.(nextIds);
    const moveIds =
      mode === "move"
        ? expandSelectionToGroups(block.nodes, nextIds)
        : [node.id];
    setDrag({
      id: node.id,
      mode,
      startX: e.clientX,
      startY: e.clientY,
      orig: { ...node },
      origNodes: block.nodes.map((n) => ({ ...n, props: { ...n.props } })),
      moveIds,
    });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag || !surfaceRef.current || !editMode) return;
    const rect = surfaceRef.current.getBoundingClientRect();
    const dx = (e.clientX - drag.startX) / rect.width;
    const dy = (e.clientY - drag.startY) / rect.height;
    if (drag.mode === "move") {
      const translated = translateNodes(drag.origNodes, drag.moveIds, dx, dy);
      const snapped = snapCompositionNodes({
        nodes: translated,
        movingIds: drag.moveIds,
      });
      setDraftNodes(snapped.nodes);
      setGuides(snapped.guides);
      return;
    }
    const nodes = drag.origNodes.map((n) => {
      if (n.id !== drag.id) return n;
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
    const groupMove = mode === "move" && drag.moveIds.length > 1;
    setDrag(null);
    setDraftNodes(null);
    setGuides([]);
    commitNodes(
      nodes,
      mode === "resize"
        ? "Resized composition item"
        : groupMove
          ? "Moved composition group"
          : "Moved composition item"
    );
  };

  const bg =
    block.background?.kind === "solid"
      ? block.background.value || "#0b0f19"
      : block.background?.kind === "gradient"
        ? block.background.gradient
          ? gradientToCss(block.background.gradient)
          : block.background.value || gradientToCss(DEFAULT_GRADIENT)
        : "transparent";
  const backgroundImage = block.background?.image;
  const backgroundStyle =
    block.background?.kind === "image" && backgroundImage?.src
      ? {
          backgroundColor: "#0b0f19",
          backgroundImage: `${
            backgroundImage.overlayColor && (backgroundImage.overlayOpacity || 0) > 0
              ? `linear-gradient(${backgroundImage.overlayColor}${Math.round(
                  (backgroundImage.overlayOpacity || 0) * 255
                )
                  .toString(16)
                  .padStart(2, "0")}, ${backgroundImage.overlayColor}${Math.round(
                  (backgroundImage.overlayOpacity || 0) * 255
                )
                  .toString(16)
                  .padStart(2, "0")}), `
              : ""
          }url("${backgroundImage.src.replaceAll('"', "%22")}")`,
          backgroundSize:
            backgroundImage.fit === "fill"
              ? "100% 100%"
              : backgroundImage.fit === "original"
                ? `${Math.round(backgroundImage.scale * 100)}% auto`
                : backgroundImage.fit,
          backgroundPosition: `${backgroundImage.focalX * 100}% ${
            backgroundImage.focalY * 100
          }%`,
          backgroundRepeat: backgroundImage.repeat,
        }
      : (block.background?.kind === "pattern" ||
            block.background?.kind === "texture") &&
          block.background.pattern
        ? surfacePatternStyle(block.background.pattern)
        : { background: bg };

  if (useStack) {
    return (
      <div
        ref={surfaceRef}
        className={cn(
          "flex flex-col gap-3 rounded-xl border border-white/10 p-3",
          className
        )}
        style={backgroundStyle}
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
        ...backgroundStyle,
        aspectRatio: String(aspectRatio),
        padding: block.safeAreaPaddingPx ?? 12,
      }}
      data-testid="creative-composition-canvas"
      data-mobile-fallback={
        applyFallback ? block.mobileFallback : "freeform"
      }
      data-surface-narrow={narrow ? "true" : "false"}
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

      {editMode
        ? guides.map((guide, index) => (
            <div
              key={`${guide.axis}-${guide.value}-${index}`}
              className="pointer-events-none absolute z-[999] bg-[#b8ff2c] shadow-[0_0_6px_rgba(184,255,44,.65)]"
              style={
                guide.axis === "x"
                  ? {
                      left: `${guide.value * 100}%`,
                      top: 0,
                      bottom: 0,
                      width: 1,
                    }
                  : {
                      top: `${guide.value * 100}%`,
                      left: 0,
                      right: 0,
                      height: 1,
                    }
              }
              data-testid={`composition-guide-${guide.axis}`}
              data-guide-kind={guide.kind}
              aria-hidden
            />
          ))
        : null}

      {visibleNodes.map((node) => {
        const selected = selectedSet.has(node.id);
        const box = resolveNodeBox(node);
        return (
          <div
            key={node.id}
            className={cn(
              "absolute",
              editMode && !node.locked && "cursor-move",
              selected && editMode && "ring-2 ring-white/70 ring-offset-1 ring-offset-transparent"
            )}
            style={{
              left: `${box.left * 100}%`,
              top: `${box.top * 100}%`,
              width: `${box.width * 100}%`,
              height: `${box.height * 100}%`,
              zIndex: node.zIndex,
              minWidth: node.minWidthPx,
              maxWidth: node.maxWidthPx,
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
            data-anchor={node.anchor || "top-left"}
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
