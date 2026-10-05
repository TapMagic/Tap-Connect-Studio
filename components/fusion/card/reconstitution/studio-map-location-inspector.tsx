"use client";

import { nanoid } from "nanoid";
import type { ReactNode } from "react";
import type { CardEditorLiveModel } from "@/components/fusion/card/card-editor-live";
import type { CreativeCompositionNode } from "@/lib/fusion/creative-studio/composition";
import {
  DEFAULT_MAP_LOCATION_DISPLAY,
  MAP_HEIGHT_PRESETS,
  MAP_LOCATION_LAYOUTS,
  buildLocationItemHref,
  normalizeMapLocationActions,
  normalizeMapLocationItems,
  readMapLocationDisplay,
  type MapElementProps,
  type MapLocationDisplay,
  type MapLocationAction,
  type MapLocationItem,
} from "@/lib/fusion/card/designer-elements";

const fieldClass = "mt-1 h-10 w-full rounded-lg border border-white/12 bg-black/20 px-2.5 text-xs text-white outline-none focus:border-[#b8ff2c]";
const areaClass = "mt-1 min-h-16 w-full rounded-lg border border-white/12 bg-black/20 p-2.5 text-xs text-white outline-none focus:border-[#b8ff2c]";
const buttonClass = "min-h-10 rounded-xl border border-white/12 bg-white/[.04] px-3 text-[10px] font-semibold text-white/78 disabled:opacity-25 aria-pressed:border-[#b8ff2c]/55 aria-pressed:bg-[#b8ff2c]/12 aria-pressed:text-[#dfff9b]";

const DISPLAY_OPTIONS: Array<[keyof MapLocationDisplay, string]> = [
  ["map", "Map"], ["name", "Location name"], ["address", "Address"],
  ["marker", "Location marker"], ["markerLabels", "Marker labels"],
  ["locationTiles", "Location tiles"], ["description", "Description"],
  ["image", "Image"], ["timeNote", "Date / time note"],
  ["directions", "Directions"], ["phone", "Phone"], ["website", "Website"],
  ["customButtons", "Custom buttons"], ["zoomControls", "Zoom controls"],
  ["recenterControl", "Recenter control"],
];

export function StudioMapLocationInspector({ node, model }: { node: CreativeCompositionNode; model: CardEditorLiveModel }) {
  const props = node.props as MapElementProps;
  const items = normalizeMapLocationItems(props);
  const display = readMapLocationDisplay(props);
  const actions = normalizeMapLocationActions(props);
  const patch = (values: Partial<MapElementProps>, label: string) => model.patchCompositionNode(node.id, { props: { ...node.props, ...values } }, label);
  const updateItems = (next: MapLocationItem[], label: string) => {
    const ordered = next.map((item, order) => ({ ...item, order }));
    const visiblePrimary = ordered.find((item) => item.visible && item.primary) || ordered.find((item) => item.visible);
    const canonical = ordered.map((item) => ({ ...item, primary: item.locationId === visiblePrimary?.locationId }));
    patch({
      locationItems: canonical,
      locationId: visiblePrimary?.locationId,
      locationName: visiblePrimary?.name || "",
      address: visiblePrimary?.address || "",
      latitude: visiblePrimary?.latitude,
      longitude: visiblePrimary?.longitude,
    }, label);
  };
  const updateItem = (locationId: string, values: Partial<MapLocationItem>, label: string) => updateItems(items.map((item) => item.locationId === locationId ? { ...item, ...values } : item), label);
  const add = () => updateItems([...items, {
    locationId: `location-${nanoid(7)}`,
    name: items.length ? "New location" : "Venue",
    category: items.length ? "other" : "venue",
    address: "",
    visible: true,
    order: items.length,
    primary: items.length === 0,
    directionsIntent: "directions",
  }], "Added Map location");
  const move = (locationId: string, delta: number) => {
    const index = items.findIndex((item) => item.locationId === locationId);
    const target = Math.max(0, Math.min(items.length - 1, index + delta));
    if (index < 0 || index === target) return;
    const next = [...items];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved!);
    updateItems(next, "Reordered Map locations");
  };
  const testDirections = () => {
    const item = items.find((candidate) => candidate.primary) || items[0];
    const href = item ? buildLocationItemHref(item, props.mapOpenApp || "default") : undefined;
    model.notify?.(href ? `Test Action: directions → ${href}` : "Test Action: add an address before opening directions");
  };
  const updateActions = (next: MapLocationAction[], label: string) => patch({ mapActions: next.map((action, order) => ({ ...action, order })) }, label);
  const updateAction = (actionId: string, values: Partial<MapLocationAction>, label: string) => updateActions(actions.map((action) => action.actionId === actionId ? { ...action, ...values } : action), label);
  const addAction = () => updateActions([...actions, { actionId: `map-action-${nanoid(7)}`, label: "Tickets", actionType: "website", destinationRef: "", iconRef: "ticket", visible: true, order: actions.length, analyticsId: `map:action:${nanoid(6)}` }], "Added Map action");

  return <div className="space-y-5" data-testid="map-location-authoring-controls">
    <section className="rounded-xl border border-[#b8ff2c]/12 bg-[#b8ff2c]/[.035] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#dfff9b]">Map / Location Container</p>
      <p className="mt-1 text-[9px] leading-4 text-white/44">Provider-neutral location state. Preview and public rendering use the same canonical element.</p>
    </section>

    <ControlGroup label="Content">
      <label>Title<input className={fieldClass} value={String(props.mapTitle || "")} onChange={(event) => patch({ mapTitle: event.target.value }, "Changed Map title")} /></label>
      <label>Intro text<textarea className={areaClass} value={String(props.mapIntro || "")} onChange={(event) => patch({ mapIntro: event.target.value }, "Changed Map intro")} /></label>
      <label>Workspace place or custom location<select className={fieldClass} value="custom" onChange={(event) => {
        const source = model.locations?.find((location) => location.id === event.target.value);
        if (!source || items.some((item) => item.locationId === source.id)) return;
        updateItems([...items, { locationId: source.id, name: source.name, category: "venue", address: source.address || "", visible: true, order: items.length, primary: items.length === 0, directionsIntent: "directions" }], "Selected workspace Map location");
      }}><option value="custom">Enter location below</option>{model.locations?.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label>
    </ControlGroup>

    <ControlGroup label="Presentation">
      <label>Layout<select className={fieldClass} value={props.mapLayout || "map_details_below"} onChange={(event) => patch({ mapLayout: event.target.value as MapElementProps["mapLayout"] }, "Changed Map layout")}>{MAP_LOCATION_LAYOUTS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      <div className="grid grid-cols-2 gap-2"><label>Height<select className={fieldClass} value={props.mapHeightPreset || "standard"} onChange={(event) => patch({ mapHeightPreset: event.target.value as MapElementProps["mapHeightPreset"] }, "Changed Map height preset")}>{MAP_HEIGHT_PRESETS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label><label>Surface<select className={fieldClass} value={props.mapSurfaceTreatment || "glass"} onChange={(event) => patch({ mapSurfaceTreatment: event.target.value as MapElementProps["mapSurfaceTreatment"] }, "Changed Map surface")}><option value="transparent">Transparent</option><option value="solid">Solid</option><option value="glass">Glass</option></select></label></div>
      {props.mapHeightPreset === "custom" ? <label>Custom map height<input className={fieldClass} type="number" min={140} max={720} value={props.mapCustomHeightPx || 260} onChange={(event) => patch({ mapCustomHeightPx: Number(event.target.value) }, "Changed custom Map height")} /></label> : null}
      <div className="grid grid-cols-2 gap-2"><label>Preferred map app<select className={fieldClass} value={props.mapOpenApp || "default"} onChange={(event) => patch({ mapOpenApp: event.target.value as MapElementProps["mapOpenApp"] }, "Changed preferred Map app")}>{["default", "apple", "google", "waze", "browser", "custom"].map((value) => <option key={value}>{value}</option>)}</select></label><label>Open action<select className={fieldClass} value={props.mapOpenAction || "directions"} onChange={(event) => patch({ mapOpenAction: event.target.value as MapElementProps["mapOpenAction"] }, "Changed Map open action")}>{["show", "directions", "routes"].map((value) => <option key={value}>{value}</option>)}</select></label></div>
    </ControlGroup>

    <ControlGroup label="Locations" action={<button type="button" className={buttonClass} onClick={add} data-testid="map-add-location">Add location</button>}>
      {items.length ? items.map((item, index) => <fieldset key={item.locationId} className="rounded-xl border border-white/12 bg-white/[.025] p-2.5" data-testid={`map-location-editor-${item.locationId}`}>
        <legend className="px-1 text-[9px] font-semibold uppercase tracking-[.1em] text-[#dfff9b]">{item.primary ? "Primary · " : ""}{item.category}</legend>
        <div className="grid grid-cols-2 gap-2">
          <label className="col-span-2">Display name<input className={fieldClass} value={item.name} onChange={(event) => updateItem(item.locationId, { name: event.target.value }, "Changed Map location name")} /></label>
          <label className="col-span-2">Display address<input className={fieldClass} value={item.address || ""} onChange={(event) => updateItem(item.locationId, { address: event.target.value }, "Changed Map location address")} /></label>
          <label>Type<select className={fieldClass} value={item.category} onChange={(event) => updateItem(item.locationId, { category: event.target.value as MapLocationItem["category"] }, "Changed Map location type")}>{["venue", "parking", "vip", "merch", "food", "hotel", "sponsor", "other"].map((category) => <option key={category}>{category}</option>)}</select></label>
          <label>Date / time note<input className={fieldClass} value={item.timeNote || ""} onChange={(event) => updateItem(item.locationId, { timeNote: event.target.value }, "Changed Map location time note")} /></label>
          <label className="col-span-2">Description<textarea className={areaClass} value={item.description || ""} onChange={(event) => updateItem(item.locationId, { description: event.target.value }, "Changed Map location description")} /></label>
          <label>Phone<input className={fieldClass} value={item.phone || ""} onChange={(event) => updateItem(item.locationId, { phone: event.target.value }, "Changed Map location phone")} /></label>
          <label>Website<input className={fieldClass} value={item.website || ""} onChange={(event) => updateItem(item.locationId, { website: event.target.value }, "Changed Map location website")} /></label>
          <label className="col-span-2">Image URL<input className={fieldClass} value={item.imageUrl || ""} onChange={(event) => updateItem(item.locationId, { imageUrl: event.target.value }, "Changed Map location image")} /></label>
        </div>
        <div className="mt-2 flex flex-wrap gap-1"><button type="button" className={buttonClass} aria-pressed={item.primary} onClick={() => updateItems(items.map((candidate) => ({ ...candidate, primary: candidate.locationId === item.locationId })), "Changed Primary Map location")}>Primary</button><button type="button" className={buttonClass} aria-pressed={item.visible} onClick={() => updateItem(item.locationId, { visible: !item.visible }, item.visible ? "Hid Map location" : "Showed Map location")}>{item.visible ? "Shown" : "Hidden"}</button><button type="button" className={buttonClass} disabled={index === 0} onClick={() => move(item.locationId, -1)}>Up</button><button type="button" className={buttonClass} disabled={index === items.length - 1} onClick={() => move(item.locationId, 1)}>Down</button><button type="button" className={`${buttonClass} text-red-200`} onClick={() => updateItems(items.filter((candidate) => candidate.locationId !== item.locationId), "Removed Map location")}>Remove</button></div>
      </fieldset>) : <p className="rounded-xl border border-amber-200/20 p-3 text-[10px] text-amber-100">Add a venue, select a workspace place, or enter an address.</p>}
    </ControlGroup>

    <ControlGroup label="Visible layers">
      <div className="grid grid-cols-2 gap-2">{DISPLAY_OPTIONS.map(([key, label]) => <label key={key} className="flex min-h-10 items-center gap-2 rounded-xl border border-white/10 px-2 text-[9px] text-white/72"><input type="checkbox" checked={display[key] ?? DEFAULT_MAP_LOCATION_DISPLAY[key]} onChange={(event) => patch({ mapDisplay: { ...display, [key]: event.target.checked } }, `Changed Map ${label} visibility`)} />{label}</label>)}</div>
    </ControlGroup>

    <ControlGroup label="Associated actions" action={<button type="button" className={buttonClass} onClick={addAction} data-testid="map-add-action">Add action</button>}>
      {actions.length ? actions.map((action) => <fieldset key={action.actionId} className="rounded-xl border border-white/12 bg-white/[.025] p-2.5" data-testid={`map-action-editor-${action.actionId}`}><div className="grid grid-cols-2 gap-2"><label>Label<input className={fieldClass} value={action.label} onChange={(event) => updateAction(action.actionId, { label: event.target.value }, "Changed Map action label")} /></label><label>Action<select className={fieldClass} value={action.actionType} onChange={(event) => updateAction(action.actionId, { actionType: event.target.value as MapLocationAction["actionType"] }, "Changed Map action type")}>{["website", "call", "email", "internal_page"].map((value) => <option key={value} value={value}>{value.replace("_", " ")}</option>)}</select></label><label className="col-span-2">Destination{action.actionType === "internal_page" ? <select className={fieldClass} value={action.destinationRef} onChange={(event) => updateAction(action.actionId, { destinationRef: event.target.value }, "Changed Map internal Page action")}><option value="">Choose Page</option>{model.config.experience?.pages.filter((page) => page.pageVisible !== false).map((page) => <option key={page.pageId} value={page.pageId}>{page.title}</option>)}</select> : <input className={fieldClass} value={action.destinationRef} placeholder={action.actionType === "call" ? "+1…" : action.actionType === "email" ? "hello@example.com" : "https://…"} onChange={(event) => updateAction(action.actionId, { destinationRef: event.target.value }, "Changed Map action destination")} />}</label></div><div className="mt-2 flex gap-1"><button type="button" className={buttonClass} aria-pressed={action.visible} onClick={() => updateAction(action.actionId, { visible: !action.visible }, action.visible ? "Hid Map action" : "Showed Map action")}>{action.visible ? "Shown" : "Hidden"}</button><button type="button" className={`${buttonClass} text-red-200`} onClick={() => updateActions(actions.filter((candidate) => candidate.actionId !== action.actionId), "Removed Map action")}>Remove</button></div></fieldset>) : <p className="text-[9px] leading-4 text-white/42">Add canonical website, call, email, or internal Page actions such as Tickets or VIP Instructions.</p>}
    </ControlGroup>

    <ControlGroup label="Actions and readiness">
      <button type="button" className={`${buttonClass} w-full`} data-testid="map-setup-test-directions" onClick={testDirections}>Test Directions</button>
      <p className="text-[9px] leading-4 text-white/42">Public actions retain canonical location IDs and analytics event IDs. External destinations preserve Experience return context and open safely.</p>
    </ControlGroup>
  </div>;
}

function ControlGroup({ label, action, children }: { label: string; action?: ReactNode; children: ReactNode }) {
  return <section className="space-y-3 text-[10px] text-white/62"><div className="flex items-center justify-between gap-2"><h3 className="font-semibold uppercase tracking-[.14em] text-[#a9e7ff]/72">{label}</h3>{action}</div>{children}</section>;
}
