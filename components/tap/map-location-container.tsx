"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Globe2, LocateFixed, MapPin, Navigation, Phone } from "lucide-react";
import { PremiumIcon } from "@/components/design/premium-icon";
import {
  buildLocationItemHref,
  buildMapEmbedHref,
  buildButtonHref,
  mapLocationHeight,
  normalizeMapLocationActions,
  normalizeMapLocationItems,
  readMapLocationDisplay,
  resolveRuntimeMapOpenApp,
  type MapElementProps,
  type MapLocationCategory,
  type MapLocationItem,
} from "@/lib/fusion/card/designer-elements";
import { cn } from "@/lib/utils";

const CATEGORY_ICON: Record<MapLocationCategory, string> = {
  venue: "map",
  parking: "car",
  vip: "star",
  merch: "cart",
  food: "utensils",
  hotel: "map",
  sponsor: "star",
  other: "pin",
};

function locationIcon(item: MapLocationItem): string {
  return item.iconRef?.replace(/^lucide:/, "") || CATEGORY_ICON[item.category];
}

export function MapLocationContainer({ props, editMode = false }: { props: MapElementProps; editMode?: boolean }) {
  const locations = useMemo(() => normalizeMapLocationItems(props).filter((item) => item.visible), [props]);
  const customActions = useMemo(() => normalizeMapLocationActions(props).filter((item) => item.visible), [props]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mapActive, setMapActive] = useState(false);
  const primary = locations.find((item) => item.primary) || locations[0];
  const selected = locations.find((item) => item.locationId === selectedId) || primary;
  const display = readMapLocationDisplay(props);
  const layout = props.mapLayout || "map_details_below";
  const mapHeight = mapLocationHeight(props);
  const showMap = display.map && !["directions_only", "pin_only", "text_link", "location_card"].includes(String(props.mapDisplayMode));
  const showTiles = display.locationTiles && locations.length > 1 && layout.includes("tiles");
  const showDetails = layout !== "map_only";
  const mapFirst = !layout.startsWith("details_") && !layout.startsWith("tiles_");
  const split = layout === "map_left_details_right" || layout === "details_left_map_right";
  const surface = props.mapSurfaceTreatment || "glass";

  if (!selected) return <MapFallback props={props} editMode={editMode} />;

  const embedHref = buildMapEmbedHref(selected);
  const directionsHref = buildLocationItemHref(selected, props.mapOpenApp || "default");
  const map = showMap ? <div
    className="relative min-h-[140px] overflow-hidden rounded-[inherit] bg-[#d8dfd2]"
    style={{ height: mapHeight }}
    data-map-layer="base-map"
    data-map-interaction={mapActive ? "active" : "scroll-safe"}
  >
    {embedHref ? <iframe
      key={embedHref}
      src={embedHref}
      title={`Map showing ${selected.name}`}
      className="absolute inset-0 h-full w-full border-0"
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      style={{ pointerEvents: mapActive && !editMode ? "auto" : "none" }}
      data-testid="map-location-embed"
    /> : <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_50%_34%,#e7ede3,#b9c7b4)] p-6 text-center text-[#1c2a20]"><div><MapPin className="mx-auto h-8 w-8" /><p className="mt-2 text-xs font-semibold">Map unavailable for this address</p></div></div>}
    {display.marker ? <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full" data-map-layer="location-markers"><span className="grid h-9 w-9 place-items-center rounded-full border-2 border-[#f4d38b] bg-[#2b1a0c] text-[#f4d38b] shadow-xl"><PremiumIcon icon={locationIcon(selected)} sizePx={18} /></span>{display.markerLabels ? <span className="mt-1 block whitespace-nowrap rounded bg-black/75 px-2 py-1 text-[9px] font-semibold text-white">{selected.name}</span> : null}</div> : null}
    {!editMode && !mapActive ? <button type="button" className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/40 via-transparent to-transparent pb-3 text-[10px] font-semibold text-white" onClick={() => setMapActive(true)} data-testid="map-activate-interaction"><span className="rounded-full bg-black/72 px-3 py-2 shadow-lg">Tap to explore map</span></button> : null}
    {display.recenterControl && mapActive ? <button type="button" className="absolute right-2 top-2 grid h-10 w-10 place-items-center rounded-full border border-white/50 bg-black/72 text-white shadow-lg" onClick={() => { setMapActive(false); window.setTimeout(() => setMapActive(true), 0); }} aria-label="Recenter map"><LocateFixed className="h-4 w-4" /></button> : null}
    {display.zoomControls && !mapActive ? <span className="absolute left-2 top-2 rounded bg-black/68 px-2 py-1 text-[8px] text-white">Zoom after activation</span> : null}
  </div> : null;

  const details = showDetails ? <LocationDetails item={selected} display={display} directionsHref={directionsHref} mapApp={props.mapOpenApp || "default"} customActions={customActions} editMode={editMode} /> : null;
  const tiles = showTiles ? <LocationTiles items={locations} activeId={selected.locationId} mapApp={props.mapOpenApp || "default"} editMode={editMode} onSelect={(id) => { setSelectedId(id); setMapActive(false); }} /> : null;
  const supporting = showDetails ? <div className="space-y-3">{showTiles ? tiles : null}{details}</div> : showTiles ? tiles : null;
  const first = mapFirst ? map : supporting;
  const second = mapFirst ? supporting : map;

  return <section
    className={cn(
      "h-full w-full overflow-hidden border text-white",
      surface === "transparent" && "border-transparent bg-transparent",
      surface === "solid" && "border-[#9b743c]/45 bg-[#120c08]",
      surface === "glass" && "border-[#d8ae5b]/38 bg-[linear-gradient(145deg,rgba(35,24,17,.9),rgba(6,8,11,.92))] shadow-[inset_0_1px_0_rgba(255,225,160,.16),0_14px_34px_rgba(0,0,0,.34)] backdrop-blur-xl",
    )}
    style={{ borderRadius: Math.max(0, Number(props.radius) || 18), opacity: Number(props.opacity) || 1 }}
    data-testid="map-location-container"
    data-map-presentation={props.mapDisplayMode || "map_directions"}
    data-map-layout={layout}
    data-map-height-preset={props.mapHeightPreset || "standard"}
    data-map-location-count={locations.length}
    data-map-primary-location={primary?.locationId}
    data-map-selected-location={selected.locationId}
  >
    {(props.mapTitle || props.mapIntro) ? <header className="px-4 pb-2 pt-4" data-map-layer="custom-content-overlay">{props.mapTitle ? <h2 className="font-serif text-xl font-semibold text-[#fff0cc]">{props.mapTitle}</h2> : null}{props.mapIntro ? <p className="mt-1 text-xs leading-5 text-white/68">{props.mapIntro}</p> : null}</header> : null}
    <div className={cn("gap-3 p-3", split ? "grid grid-cols-1 sm:grid-cols-2" : "flex flex-col", layout === "details_left_map_right" && "sm:[&>*:first-child]:order-1")}>
      {first}
      {second}
    </div>
  </section>;
}

function LocationTiles({ items, activeId, mapApp, editMode, onSelect }: { items: MapLocationItem[]; activeId: string; mapApp: NonNullable<MapElementProps["mapOpenApp"]>; editMode: boolean; onSelect: (id: string) => void }) {
  return <div className="grid grid-cols-2 gap-2" data-map-layer="location-list"><>{items.map((item) => <article key={item.locationId} className={cn("overflow-hidden rounded-xl border border-white/12 bg-white/[.055] text-white shadow-sm", item.locationId === activeId && "border-[#e2bd70]/62 bg-[#e2bd70]/12")} data-testid={`map-location-tile-${item.locationId}`}><button type="button" onClick={() => onSelect(item.locationId)} aria-pressed={item.locationId === activeId} className="flex min-h-12 w-full items-center gap-2 px-2.5 py-2 text-left"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[#d8ae5b]/38 bg-black/38 text-[#e7c57e]"><PremiumIcon icon={locationIcon(item)} sizePx={15} /></span><span className="min-w-0"><span className="block text-[8px] font-bold uppercase tracking-[.14em] text-[#d8ae5b]">{item.category}</span><span className="block truncate text-[11px] font-semibold">{item.name}</span></span></button><LocationNavigateAction item={item} mapApp={mapApp} editMode={editMode} compact onBeforeNavigate={() => onSelect(item.locationId)} /></article>)}</></div>;
}

function LocationDetails({ item, display, directionsHref, mapApp, customActions, editMode }: { item: MapLocationItem; display: ReturnType<typeof readMapLocationDisplay>; directionsHref?: string; mapApp: NonNullable<MapElementProps["mapOpenApp"]>; customActions: ReturnType<typeof normalizeMapLocationActions>; editMode: boolean }) {
  const phone = item.phone?.replace(/[^+\d]/g, "");
  return <article className="flex min-w-0 flex-col justify-center p-1" data-map-layer="details" data-location-id={item.locationId}>
    <div className="flex items-start gap-2.5"><span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#d8ae5b]/42 bg-[#d8ae5b]/12 text-[#ebca83]"><PremiumIcon icon={locationIcon(item)} sizePx={18} /></span><div className="min-w-0">{display.name ? <h3 className="font-serif text-lg font-semibold leading-tight text-[#fff0cc]">{item.name}</h3> : null}{display.address && item.address ? <p className="mt-1 text-[11px] leading-4 text-white/66">{item.address}</p> : null}{display.timeNote && item.timeNote ? <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[.1em] text-[#d8ae5b]">{item.timeNote}</p> : null}</div></div>
    {display.description && item.description ? <p className="mt-3 text-[11px] leading-5 text-white/72">{item.description}</p> : null}
    {display.image && item.imageUrl ? <div className="relative mt-3 h-24 w-full overflow-hidden rounded-xl"><Image src={item.imageUrl} alt="" fill sizes="(max-width: 640px) 100vw, 50vw" className="object-cover" unoptimized /></div> : null}
    <div className="mt-3 flex flex-wrap gap-2" data-map-layer="route-actions">
      {display.directions ? <LocationNavigateAction item={item} mapApp={mapApp} editMode={editMode} fallbackHref={directionsHref} /> : null}
      {display.phone && phone ? <a href={editMode ? undefined : `tel:${phone}`} data-destination-policy="external" data-location-action="phone" data-analytics-event="phone_clicked" data-location-id={item.locationId} onClick={(event) => { if (editMode) event.preventDefault(); }} className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-white/18 bg-white/[.06] px-4 text-[10px] font-semibold text-white"><Phone className="h-3.5 w-3.5" />Call</a> : null}
      {display.website && item.website ? <a href={editMode ? undefined : item.website} target="_blank" rel="noopener noreferrer" data-destination-policy="external" data-location-action="website" data-analytics-event="website_clicked" data-location-id={item.locationId} onClick={(event) => { if (editMode) event.preventDefault(); }} className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-white/18 bg-white/[.06] px-4 text-[10px] font-semibold text-white"><Globe2 className="h-3.5 w-3.5" />Website</a> : null}
      {display.customButtons ? customActions.map((action) => <MapAssociatedAction key={action.actionId} action={action} editMode={editMode} />) : null}
    </div>
  </article>;
}

function LocationNavigateAction({ item, mapApp, editMode, compact = false, fallbackHref, onBeforeNavigate }: { item: MapLocationItem; mapApp: NonNullable<MapElementProps["mapOpenApp"]>; editMode: boolean; compact?: boolean; fallbackHref?: string; onBeforeNavigate?: () => void }) {
  const authoredHref = fallbackHref || buildLocationItemHref(item, mapApp);
  const navigable = Boolean(authoredHref);
  return <a
    href={editMode ? undefined : authoredHref}
    aria-disabled={!navigable}
    data-destination-policy="external"
    data-location-action="navigate"
    data-analytics-event="directions_clicked"
    data-location-id={item.locationId}
    data-location-role={item.category}
    data-runtime-map-adapter={mapApp === "default" ? "device" : mapApp}
    onClick={(event) => {
      onBeforeNavigate?.();
      if (editMode || !authoredHref) {
        event.preventDefault();
        return;
      }
      const runtimeApp = resolveRuntimeMapOpenApp(mapApp, window.navigator.userAgent);
      const runtimeHref = buildLocationItemHref(item, runtimeApp);
      if (!runtimeHref) {
        event.preventDefault();
        return;
      }
      event.currentTarget.href = runtimeHref;
      if (runtimeHref.startsWith("http")) {
        event.currentTarget.target = "_blank";
        event.currentTarget.rel = "noopener noreferrer";
      } else {
        event.currentTarget.removeAttribute("target");
      }
    }}
    className={cn(compact ? "flex min-h-10 items-center justify-center gap-1.5 border-t border-white/10 px-2 text-[9px] font-semibold text-[#f0cf87]" : "inline-flex min-h-11 items-center gap-1.5 rounded-full bg-[#d8ae5b] px-4 text-[10px] font-bold text-[#1c1208] shadow-lg", !navigable && "pointer-events-none opacity-40")}
  ><Navigation className="h-3.5 w-3.5" />Navigate</a>;
}

function MapAssociatedAction({ action, editMode }: { action: ReturnType<typeof normalizeMapLocationActions>[number]; editMode: boolean }) {
  const internalPageId = action.actionType === "internal_page" ? action.destinationRef : undefined;
  const href = internalPageId ? undefined : buildButtonHref({ actionType: action.actionType, href: action.destinationRef, destinationRef: action.destinationRef });
  return <a
    href={editMode ? undefined : href}
    data-internal-page-id={internalPageId}
    data-destination-policy={internalPageId ? "internal" : "external"}
    data-map-associated-action={action.actionId}
    data-analytics-id={action.analyticsId || action.actionId}
    target={!internalPageId && href?.startsWith("http") ? "_blank" : undefined}
    rel={!internalPageId && href?.startsWith("http") ? "noopener noreferrer" : undefined}
    aria-label={action.accessibleLabel || action.label}
    onClick={(event) => { if (editMode || (!internalPageId && !href)) event.preventDefault(); }}
    className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-[#d8ae5b]/38 bg-[#d8ae5b]/10 px-4 text-[10px] font-semibold text-[#f3d99e]"
  >{action.iconRef ? <PremiumIcon icon={action.iconRef} sizePx={14} /> : null}{action.label}</a>;
}

function MapFallback({ props, editMode }: { props: MapElementProps; editMode: boolean }) {
  const name = typeof props.locationName === "string" && props.locationName.trim() ? props.locationName : "Location setup required";
  const address = typeof props.address === "string" && props.address.trim() ? props.address : "Add a place or address in Map Setup.";
  return <div className="grid h-full min-h-36 place-items-center rounded-2xl border border-amber-200/25 bg-[#17100b] p-5 text-center text-white" data-testid="map-location-fallback" data-map-error="unresolved-location"><div><MapPin className="mx-auto h-7 w-7 text-[#d8ae5b]" /><strong className="mt-2 block text-sm">{name}</strong><p className="mt-1 text-xs text-white/60">{address}</p>{editMode ? <p className="mt-3 text-[10px] text-amber-200">Choose a workspace location or enter an address.</p> : null}</div></div>;
}
