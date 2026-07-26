"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { Maximize2, Minus, Plus, LocateFixed } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  GRAPH_NODE_SIZE,
  alignGuides,
  autoLayoutGraph,
  edgeLabelPoint,
  edgePath,
  snapPoint,
  type Point,
} from "@/lib/fusion/graph/layout";

export type VisualBoardNode = {
  id: string;
  label: string;
  subtitle?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  tone?: "default" | "entry" | "exit" | "warning" | "error" | "sketch" | "executable" | "highlight";
  badge?: string;
  finding?: boolean;
};

export type VisualBoardEdge = {
  id: string;
  from: string;
  to: string;
  label?: string;
  blocked?: boolean;
  highlight?: boolean;
  sketch?: boolean;
};

type DragState = {
  ids: string[];
  origin: Point;
  starts: Record<string, Point>;
};

export function VisualBoard({
  nodes,
  edges,
  selectedIds = [],
  onSelect,
  onMoveNodes,
  onMoveEnd,
  onConnect,
  connectFromId,
  highlightedNodeIds = [],
  highlightedEdgeIds = [],
  className,
  testId = "visual-board",
  testIdPrefix = "visual-node",
  readOnly = false,
  children,
  emptyLabel = "Add objects to the board",
}: {
  nodes: VisualBoardNode[];
  edges: VisualBoardEdge[];
  selectedIds?: string[];
  onSelect?: (ids: string[], additive?: boolean) => void;
  /** Live drag updates — may fire often; do not push history here. */
  onMoveNodes?: (positions: Record<string, Point>) => void;
  /** Fired once when a drag (or keyboard nudge) completes — one history entry. */
  onMoveEnd?: (positions: Record<string, Point>) => void;
  onConnect?: (fromId: string, toId: string) => void;
  connectFromId?: string | null;
  highlightedNodeIds?: string[];
  highlightedEdgeIds?: string[];
  className?: string;
  testId?: string;
  /** Prefix for node button test ids — e.g. "tapcanvas-node" → tapcanvas-node-{id} */
  testIdPrefix?: string;
  readOnly?: boolean;
  children?: ReactNode;
  emptyLabel?: string;
}) {
  const boardId = useId();
  const viewportRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [drag, setDrag] = useState<DragState | null>(null);
  const [panning, setPanning] = useState<{ start: Point; origin: Point } | null>(null);
  const [guides, setGuides] = useState<Array<{ axis: "x" | "y"; value: number }>>([]);
  const lastDragPositions = useRef<Record<string, Point> | null>(null);

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  const fitView = useCallback(() => {
    if (!viewportRef.current || nodes.length === 0) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      return;
    }
    const pad = 48;
    const xs = nodes.map((n) => n.x);
    const ys = nodes.map((n) => n.y);
    const minX = Math.min(...xs) - pad;
    const minY = Math.min(...ys) - pad;
    const maxX = Math.max(...xs.map((x, i) => x + (nodes[i]!.width ?? GRAPH_NODE_SIZE.width))) + pad;
    const maxY = Math.max(...ys.map((y, i) => y + (nodes[i]!.height ?? GRAPH_NODE_SIZE.height))) + pad;
    const w = viewportRef.current.clientWidth;
    const h = viewportRef.current.clientHeight;
    const scale = Math.min(1.2, Math.max(0.35, Math.min(w / (maxX - minX), h / (maxY - minY))));
    setZoom(scale);
    setPan({
      x: (w - (maxX - minX) * scale) / 2 - minX * scale,
      y: (h - (maxY - minY) * scale) / 2 - minY * scale,
    });
  }, [nodes]);

  useEffect(() => {
    fitView();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fit once when first nodes appear
  }, [nodes.length === 0]);

  function clientToWorld(clientX: number, clientY: number): Point {
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top - pan.y) / zoom,
    };
  }

  function onNodePointerDown(e: ReactPointerEvent, nodeId: string) {
    if (readOnly) return;
    if (e.button !== 0) return;
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const additive = e.shiftKey || e.metaKey;
    const nextSelected =
      additive && selectedIds.includes(nodeId)
        ? selectedIds
        : additive
          ? [...selectedIds, nodeId]
          : [nodeId];
    onSelect?.(nextSelected, additive);
    if (connectFromId && connectFromId !== nodeId) {
      onConnect?.(connectFromId, nodeId);
      return;
    }
    const ids = nextSelected.includes(nodeId) ? nextSelected : [nodeId];
    const starts: Record<string, Point> = {};
    for (const id of ids) {
      const n = nodeMap.get(id);
      if (n) starts[id] = { x: n.x, y: n.y };
    }
    setDrag({
      ids,
      origin: clientToWorld(e.clientX, e.clientY),
      starts,
    });
  }

  function onViewportPointerDown(e: ReactPointerEvent) {
    if (e.button === 1 || e.button === 2 || e.altKey || e.button === 0) {
      if ((e.target as HTMLElement).closest("[data-board-node]")) return;
      if (e.button === 0 && !e.altKey) {
        onSelect?.([]);
        return;
      }
      setPanning({ start: { x: e.clientX, y: e.clientY }, origin: pan });
    }
  }

  function onPointerMove(e: ReactPointerEvent) {
    if (panning) {
      setPan({
        x: panning.origin.x + (e.clientX - panning.start.x),
        y: panning.origin.y + (e.clientY - panning.start.y),
      });
      return;
    }
    if (!drag || readOnly) return;
    const world = clientToWorld(e.clientX, e.clientY);
    const dx = world.x - drag.origin.x;
    const dy = world.y - drag.origin.y;
    const positions: Record<string, Point> = {};
    const others = nodes
      .filter((n) => !drag.ids.includes(n.id))
      .map((n) => ({ x: n.x, y: n.y }));
    for (const id of drag.ids) {
      const start = drag.starts[id];
      if (!start) continue;
      const raw = { x: start.x + dx, y: start.y + dy };
      const aligned = alignGuides(raw, others);
      setGuides(aligned.guides);
      positions[id] = snapPoint(aligned.point);
    }
    lastDragPositions.current = positions;
    onMoveNodes?.(positions);
  }

  function onPointerUp() {
    if (drag && lastDragPositions.current) {
      const moved = Object.entries(lastDragPositions.current).some(([id, p]) => {
        const start = drag.starts[id];
        return !start || start.x !== p.x || start.y !== p.y;
      });
      if (moved) onMoveEnd?.(lastDragPositions.current);
    }
    lastDragPositions.current = null;
    setDrag(null);
    setPanning(null);
    setGuides([]);
  }

  function onWheel(e: React.WheelEvent) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    setZoom((z) => Math.min(2, Math.max(0.35, z + delta)));
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "=" || e.key === "+") {
      e.preventDefault();
      setZoom((z) => Math.min(2, z + 0.1));
    } else if (e.key === "-") {
      e.preventDefault();
      setZoom((z) => Math.max(0.35, z - 0.1));
    } else if (e.key === "0") {
      e.preventDefault();
      fitView();
    }
  }

  const bounds = (() => {
    if (nodes.length === 0) return { w: 800, h: 480 };
    const maxX = Math.max(
      ...nodes.map((n) => n.x + (n.width ?? GRAPH_NODE_SIZE.width)),
      400
    );
    const maxY = Math.max(
      ...nodes.map((n) => n.y + (n.height ?? GRAPH_NODE_SIZE.height)),
      300
    );
    return { w: maxX + 120, h: maxY + 120 };
  })();

  const miniScale = 0.12;

  return (
    <div
      className={cn("relative flex min-h-[360px] flex-col overflow-hidden rounded-xl border border-white/10 bg-[#070b12]", className)}
      data-testid={testId}
    >
      <div
        className="flex shrink-0 items-center gap-1 border-b border-white/8 px-2 py-1.5"
        role="toolbar"
        aria-label="Board view controls"
      >
        <button
          type="button"
          className="rounded-md p-1.5 text-white/60 hover:bg-white/5 hover:text-white"
          aria-label="Zoom out"
          onClick={() => setZoom((z) => Math.max(0.35, z - 0.1))}
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="min-w-[3rem] text-center font-mono text-[10px] text-white/45">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          className="rounded-md p-1.5 text-white/60 hover:bg-white/5 hover:text-white"
          aria-label="Zoom in"
          onClick={() => setZoom((z) => Math.min(2, z + 0.1))}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          className="rounded-md p-1.5 text-white/60 hover:bg-white/5 hover:text-white"
          aria-label="Fit to view"
          onClick={fitView}
        >
          <LocateFixed className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          className="rounded-md p-1.5 text-white/60 hover:bg-white/5 hover:text-white"
          aria-label="Reset zoom"
          onClick={() => {
            setZoom(1);
            setPan({ x: 24, y: 24 });
          }}
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
        <span className="ml-2 text-[10px] text-white/55">
          Drag nodes · Alt-drag pan · ⌘/Ctrl+scroll zoom · Shift-click multi-select
        </span>
        {children}
      </div>

      <div
        ref={viewportRef}
        role="application"
        aria-label="Visual board"
        tabIndex={0}
        id={boardId}
        className="relative min-h-[320px] flex-1 cursor-grab overflow-hidden active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)",
          backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
        onPointerDown={onViewportPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onWheel={onWheel}
        onKeyDown={onKeyDown}
      >
        {nodes.length === 0 ? (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-white/35">
            {emptyLabel}
          </p>
        ) : null}

        <div
          className="absolute origin-top-left will-change-transform"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            width: bounds.w,
            height: bounds.h,
          }}
        >
          <svg
            className="pointer-events-none absolute inset-0 overflow-visible"
            width={bounds.w}
            height={bounds.h}
            aria-hidden
          >
            <defs>
              <marker
                id={`${boardId}-arrow`}
                markerWidth="8"
                markerHeight="8"
                refX="6"
                refY="3"
                orient="auto"
              >
                <path d="M0,0 L6,3 L0,6 Z" fill="rgba(163,230,53,0.85)" />
              </marker>
              <marker
                id={`${boardId}-arrow-muted`}
                markerWidth="8"
                markerHeight="8"
                refX="6"
                refY="3"
                orient="auto"
              >
                <path d="M0,0 L6,3 L0,6 Z" fill="rgba(255,255,255,0.35)" />
              </marker>
              <marker
                id={`${boardId}-arrow-blocked`}
                markerWidth="8"
                markerHeight="8"
                refX="6"
                refY="3"
                orient="auto"
              >
                <path d="M0,0 L6,3 L0,6 Z" fill="rgba(248,113,113,0.9)" />
              </marker>
            </defs>
            {edges.map((edge) => {
              const from = nodeMap.get(edge.from);
              const to = nodeMap.get(edge.to);
              if (!from || !to) return null;
              const w = from.width ?? GRAPH_NODE_SIZE.width;
              const h = from.height ?? GRAPH_NODE_SIZE.height;
              const path = edgePath(
                { x: from.x, y: from.y },
                { x: to.x, y: to.y },
                w,
                h
              );
              const labelAt = edgeLabelPoint(
                { x: from.x, y: from.y },
                { x: to.x, y: to.y },
                w,
                h
              );
              const hi =
                edge.highlight ||
                highlightedEdgeIds.includes(edge.id);
              const marker = edge.blocked
                ? `url(#${boardId}-arrow-blocked)`
                : hi
                  ? `url(#${boardId}-arrow)`
                  : `url(#${boardId}-arrow-muted)`;
              return (
                <g key={edge.id} data-edge-id={edge.id}>
                  <path
                    d={path}
                    fill="none"
                    stroke={
                      edge.blocked
                        ? "rgba(248,113,113,0.85)"
                        : hi
                          ? "rgba(163,230,53,0.9)"
                          : edge.sketch
                            ? "rgba(255,255,255,0.25)"
                            : "rgba(255,255,255,0.35)"
                    }
                    strokeWidth={hi ? 2.5 : 1.75}
                    strokeDasharray={edge.sketch || edge.blocked ? "6 4" : undefined}
                    markerEnd={marker}
                  />
                  {edge.label ? (
                    <text
                      x={labelAt.x}
                      y={labelAt.y}
                      textAnchor="middle"
                      className="fill-white/70"
                      style={{ fontSize: 10 }}
                    >
                      {edge.label}
                    </text>
                  ) : null}
                </g>
              );
            })}
            {guides.map((g, i) =>
              g.axis === "x" ? (
                <line
                  key={`gx-${i}`}
                  x1={g.value}
                  y1={0}
                  x2={g.value}
                  y2={bounds.h}
                  stroke="rgba(163,230,53,0.45)"
                  strokeDasharray="4 4"
                />
              ) : (
                <line
                  key={`gy-${i}`}
                  x1={0}
                  y1={g.value}
                  x2={bounds.w}
                  y2={g.value}
                  stroke="rgba(163,230,53,0.45)"
                  strokeDasharray="4 4"
                />
              )
            )}
          </svg>

          {nodes.map((node) => {
            const selected = selectedIds.includes(node.id);
            const highlighted =
              highlightedNodeIds.includes(node.id) || node.tone === "highlight";
            const w = node.width ?? GRAPH_NODE_SIZE.width;
            const h = node.height ?? GRAPH_NODE_SIZE.height;
            return (
              <button
                key={node.id}
                type="button"
                data-board-node
                data-testid={`${testIdPrefix}-${node.id}`}
                aria-pressed={selected}
                aria-label={`${node.label}${node.subtitle ? `, ${node.subtitle}` : ""}`}
                onPointerDown={(e) => onNodePointerDown(e, node.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect?.([node.id]);
                  }
                  if (!readOnly && (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "ArrowUp" || e.key === "ArrowDown")) {
                    e.preventDefault();
                    const step = e.shiftKey ? 32 : 16;
                    const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
                    const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
                    const next = {
                      [node.id]: snapPoint({ x: node.x + dx, y: node.y + dy }),
                    };
                    onMoveNodes?.(next);
                    onMoveEnd?.(next);
                  }
                }}
                className={cn(
                  "absolute flex flex-col justify-center rounded-xl border px-3 py-2 text-left shadow-lg transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                  selected && "ring-2 ring-primary",
                  highlighted && "ring-2 ring-sky-400/70",
                  node.finding && "ring-2 ring-amber-400/70",
                  toneClass(node.tone)
                )}
                style={{
                  left: node.x,
                  top: node.y,
                  width: w,
                  minHeight: h,
                }}
              >
                {node.badge ? (
                  <span className="mb-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/45">
                    {node.badge}
                  </span>
                ) : null}
                <span className="text-sm font-semibold leading-tight text-white">{node.label}</span>
                {node.subtitle ? (
                  <span className="mt-0.5 truncate text-[10px] text-white/50">{node.subtitle}</span>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Minimap */}
        <div
          className="absolute bottom-3 right-3 overflow-hidden rounded-lg border border-white/15 bg-black/70"
          aria-hidden
          data-testid="visual-board-minimap"
          style={{ width: 140, height: 96 }}
        >
          <div
            className="relative"
            style={{
              width: bounds.w * miniScale,
              height: bounds.h * miniScale,
              transform: "scale(1)",
            }}
          >
            {edges.map((edge) => {
              const from = nodeMap.get(edge.from);
              const to = nodeMap.get(edge.to);
              if (!from || !to) return null;
              return (
                <svg
                  key={`mm-${edge.id}`}
                  className="absolute inset-0 overflow-visible"
                  width={bounds.w * miniScale}
                  height={bounds.h * miniScale}
                >
                  <line
                    x1={(from.x + GRAPH_NODE_SIZE.width / 2) * miniScale}
                    y1={(from.y + GRAPH_NODE_SIZE.height / 2) * miniScale}
                    x2={(to.x + GRAPH_NODE_SIZE.width / 2) * miniScale}
                    y2={(to.y + GRAPH_NODE_SIZE.height / 2) * miniScale}
                    stroke="rgba(163,230,53,0.4)"
                    strokeWidth={1}
                  />
                </svg>
              );
            })}
            {nodes.map((n) => (
              <div
                key={`mm-${n.id}`}
                className={cn(
                  "absolute rounded-[2px]",
                  selectedIds.includes(n.id) ? "bg-primary" : "bg-white/40"
                )}
                style={{
                  left: n.x * miniScale,
                  top: n.y * miniScale,
                  width: Math.max(4, (n.width ?? GRAPH_NODE_SIZE.width) * miniScale),
                  height: Math.max(3, (n.height ?? GRAPH_NODE_SIZE.height) * miniScale),
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function toneClass(
  tone: VisualBoardNode["tone"]
): string {
  switch (tone) {
    case "entry":
      return "border-primary/50 bg-primary/15";
    case "exit":
      return "border-sky-400/40 bg-sky-500/10";
    case "warning":
      return "border-amber-400/50 bg-amber-500/10";
    case "error":
      return "border-red-400/50 bg-red-500/10";
    case "sketch":
      return "border-dashed border-white/30 bg-black/40";
    case "executable":
      return "border-primary/35 bg-[#0f1720]";
    case "highlight":
      return "border-sky-300/60 bg-sky-500/15";
    default:
      return "border-white/15 bg-[#0f141d]";
  }
}

export function applyAutoLayoutToPositions(
  nodes: Array<{ id: string; width?: number; height?: number }>,
  edges: Array<{ id: string; from: string; to: string }>,
  entryId?: string
): Record<string, Point> {
  return autoLayoutGraph(nodes, edges, { entryId });
}
