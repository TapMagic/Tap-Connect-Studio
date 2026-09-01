"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { StudioSemanticResource, StudioVisualResourceFitContract, StudioVisualResourceMetadata } from "@/lib/fusion/creative-studio/platform/semantic-resource-slot";
import { inspectStudioVisualResource } from "@/lib/fusion/creative-studio/platform/visual-resource-fit-browser";
import { resolveStudioVisualResourceBackingPlate, resolveStudioVisualResourcePlacement } from "@/lib/fusion/creative-studio/platform/visual-resource-fit";
import { cn } from "@/lib/utils";

export function StudioVisualResourceProjection({ resource, contract, className, style, debug = false, onAssetLoad, onAssetError }: {
  resource: Pick<StudioSemanticResource, "src" | "alt" | "visual">;
  contract: StudioVisualResourceFitContract;
  className?: string;
  style?: CSSProperties;
  debug?: boolean;
  onAssetLoad?: (intrinsic: { width: number; height: number }) => void;
  onAssetError?: () => void;
}) {
  const slotRef = useRef<HTMLSpanElement>(null);
  const [inspection, setInspection] = useState<{ src: string; metadata?: StudioVisualResourceMetadata }>({ src: resource.src, metadata: resource.visual });
  const [intrinsic, setIntrinsic] = useState({ width: resource.visual?.intrinsicWidth || 1, height: resource.visual?.intrinsicHeight || 1 });
  const [slot, setSlot] = useState({ width: 1, height: 1 });
  const [queryDebug] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("studioResourceFitDebug") === "1");
  const [assetStatus, setAssetStatus] = useState<{ src: string; state: "loading" | "ready" | "error" }>({ src: resource.src, state: "loading" });
  useEffect(() => {
    if (!resource.visual?.visibleBounds || !resource.visual.intrinsicWidth || !resource.visual.intrinsicHeight) {
      let active = true;
      void inspectStudioVisualResource(resource.src).then((result) => { if (active) setInspection({ src: resource.src, metadata: result }); });
      return () => { active = false; };
    }
  }, [resource.src, resource.visual]);
  useLayoutEffect(() => {
    const element = slotRef.current;
    if (!element) return;
    const update = () => setSlot({ width: Math.max(1, element.clientWidth), height: Math.max(1, element.clientHeight) });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const inspected = inspection.src === resource.src ? inspection.metadata : undefined;
  const visual = resource.visual?.visibleBounds ? resource.visual : inspected ?? resource.visual;
  const assetLoadState = assetStatus.src === resource.src ? assetStatus.state : "loading";
  const bounds = visual?.visibleBounds;
  const crop = visual?.crop;
  const backingPlate = visual?.backingPlate ?? resolveStudioVisualResourceBackingPlate({ metadata: visual, contract });
  const placement = useMemo(() => resolveStudioVisualResourcePlacement({
    slotWidth: contract.maskShape === "circle" ? Math.min(slot.width, slot.height) : slot.width,
    slotHeight: contract.maskShape === "circle" ? Math.min(slot.width, slot.height) : slot.height,
    intrinsicWidth: visual?.intrinsicWidth || intrinsic.width,
    intrinsicHeight: visual?.intrinsicHeight || intrinsic.height,
    visibleBounds: bounds,
    requestedScale: crop?.zoom,
    offsetX: crop?.offsetX,
    offsetY: crop?.offsetY,
    contract,
  }), [bounds, contract, crop?.offsetX, crop?.offsetY, crop?.zoom, intrinsic.height, intrinsic.width, slot.height, slot.width, visual?.intrinsicHeight, visual?.intrinsicWidth]);
  const visible = bounds ?? { x: 0, y: 0, width: 1, height: 1 };
  const maskStyle: CSSProperties = contract.maskShape === "circle"
    ? { borderRadius: "50%", clipPath: "circle(50% at 50% 50%)", WebkitClipPath: "circle(50% at 50% 50%)" }
    : contract.maskShape === "rounded-rectangle"
      ? { borderRadius: "18%", clipPath: "inset(0 round 18%)", WebkitClipPath: "inset(0 round 18%)" }
      : {};
  const maskWidth = contract.maskShape === "circle" ? Math.min(slot.width, slot.height) : slot.width;
  const maskHeight = contract.maskShape === "circle" ? Math.min(slot.width, slot.height) : slot.height;
  return <span
    ref={slotRef}
    className={cn("relative block h-full w-full", className)}
    style={style}
    role="img"
    aria-label={resource.alt}
    data-visual-fit-contract={contract.contractId}
    data-mask-shape={contract.maskShape}
    data-visual-bounds-source={visual?.boundsSource || "pending"}
    data-visual-compatibility={visual?.compatibility || "pending"}
    data-visible-utilization={placement.visibleUtilization.toFixed(3)}
    data-governed-zoom={placement.scale.toFixed(2)}
    data-focal-x={placement.offsetX.toFixed(3)}
    data-focal-y={placement.offsetY.toFixed(3)}
    data-persisted-mask={visual?.treatment?.maskShape || "slot-contract"}
    data-backing-mode={backingPlate.mode}
    data-backing-color={backingPlate.resolvedColor}
    data-source-background={visual?.legibility?.opaqueBackground ?? "unknown"}
    data-asset-load-state={assetLoadState}
  >
    <span className="absolute block overflow-hidden" data-semantic-mask-viewport={contract.maskShape} style={{
      ...maskStyle,
      width: maskWidth,
      height: maskHeight,
      left: (slot.width - maskWidth) / 2,
      top: (slot.height - maskHeight) / 2,
      backgroundColor: backingPlate.resolvedColor,
    }} aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={resource.src}
        alt=""
        draggable={false}
        onLoad={(event) => {
          const next = { width: event.currentTarget.naturalWidth || 1, height: event.currentTarget.naturalHeight || 1 };
          setIntrinsic(next);
          setAssetStatus({ src: resource.src, state: "ready" });
          onAssetLoad?.(next);
        }}
        onError={() => {
          setAssetStatus({ src: resource.src, state: "error" });
          onAssetError?.();
        }}
        className="pointer-events-none absolute block max-h-none max-w-none select-none"
        style={{ left: placement.leftPx, top: placement.topPx, width: placement.widthPx, height: placement.heightPx }}
      />
      {debug || queryDebug ? <>
        <span className="pointer-events-none absolute z-20 rounded-full border border-dashed border-sky-300" style={{ inset: `${contract.safeInset * 100}%` }} />
        <span className="pointer-events-none absolute z-20 border border-[#b8ff2c]" style={{
          left: placement.leftPx + visible.x * placement.widthPx,
          top: placement.topPx + visible.y * placement.heightPx,
          width: visible.width * placement.widthPx,
          height: visible.height * placement.heightPx,
        }} />
      </> : null}
    </span>
  </span>;
}
