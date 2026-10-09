import { createButtonContentComposition } from "@/lib/fusion/creative-studio/button-composition";

export type ButtonPresentation =
  | "rectangle"
  | "rounded"
  | "pill"
  | "square"
  | "circle"
  | "icon_circle"
  | "icon_label"
  | "icon_description"
  | "custom";

export type ButtonActionType =
  | "call"
  | "email"
  | "website"
  | "directions"
  | "reviews"
  | "social"
  | "custom"
  | "claim_offer"
  | "tapsave"
  | "campaign";

export type MapSourceMode =
  | "workspace_default"
  | "workspace_location"
  | "custom_address"
  | "coordinates"
  | "pasted_url"
  | "event_location";

export type MapDisplayMode =
  | "interactive"
  | "static"
  | "location_card"
  | "map_directions"
  | "directions_only"
  | "pin_only"
  | "text_link";

export type MapOpenApp = "default" | "apple" | "google" | "waze" | "browser" | "custom";
export type MapOpenAction = "show" | "directions" | "routes";

export type MapLocationCategory =
  | "venue"
  | "parking"
  | "vip"
  | "merch"
  | "food"
  | "hotel"
  | "sponsor"
  | "other";

/** Provider-neutral authored location. Providers are renderer/destination adapters only. */
export type MapLocationItem = {
  locationId: string;
  name: string;
  category: MapLocationCategory;
  address?: string;
  latitude?: number;
  longitude?: number;
  description?: string;
  imageUrl?: string;
  phone?: string;
  website?: string;
  directionsIntent?: "show" | "directions";
  timeNote?: string;
  iconRef?: string;
  visible: boolean;
  order: number;
  primary: boolean;
};

/** Canonical action intent associated with a Map / Location Container. */
export type MapLocationAction = {
  actionId: string;
  label: string;
  actionType: ButtonActionType | "internal_page";
  destinationRef: string;
  iconRef?: string;
  accessibleLabel?: string;
  analyticsId?: string;
  visible: boolean;
  order: number;
};

export type MapLocationDisplay = {
  map: boolean;
  name: boolean;
  address: boolean;
  marker: boolean;
  markerLabels: boolean;
  locationTiles: boolean;
  description: boolean;
  image: boolean;
  timeNote: boolean;
  directions: boolean;
  phone: boolean;
  website: boolean;
  customButtons: boolean;
  zoomControls: boolean;
  recenterControl: boolean;
};

export type MapLocationLayout =
  | "map_only"
  | "map_details_below"
  | "details_above_map"
  | "map_tiles_below"
  | "tiles_above_map"
  | "map_left_details_right"
  | "details_left_map_right";

export type MapHeightPreset = "compact" | "standard" | "tall" | "custom";

export type WorkspaceLocationOption = {
  id: string;
  name: string;
  address?: string | null;
  mapUrl?: string | null;
  isDefault?: boolean;
};

export type MapElementProps = Record<string, unknown> & {
  mapSourceMode?: MapSourceMode;
  locationId?: string;
  locationName?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  mapUrl?: string;
  mapDisplayMode?: MapDisplayMode;
  mapOpenApp?: MapOpenApp;
  mapOpenAction?: MapOpenAction;
  customDirectionsUrl?: string;
  locationItems?: MapLocationItem[];
  mapActions?: MapLocationAction[];
  mapDisplay?: Partial<MapLocationDisplay>;
  mapLayout?: MapLocationLayout;
  mapHeightPreset?: MapHeightPreset;
  mapCustomHeightPx?: number;
  mapTitle?: string;
  mapIntro?: string;
  mapSurfaceTreatment?: "transparent" | "solid" | "glass";
};

export const DEFAULT_MAP_LOCATION_DISPLAY: MapLocationDisplay = {
  map: true,
  name: true,
  address: true,
  marker: true,
  markerLabels: false,
  locationTiles: true,
  description: true,
  image: true,
  timeNote: true,
  directions: true,
  phone: false,
  website: false,
  customButtons: true,
  zoomControls: false,
  recenterControl: true,
};

export const MAP_LOCATION_LAYOUTS: ReadonlyArray<{ value: MapLocationLayout; label: string }> = [
  { value: "map_only", label: "Map only" },
  { value: "map_details_below", label: "Map + details below" },
  { value: "details_above_map", label: "Details above + map" },
  { value: "map_tiles_below", label: "Map + location tiles below" },
  { value: "tiles_above_map", label: "Location tiles above + map" },
  { value: "map_left_details_right", label: "Map left / details right" },
  { value: "details_left_map_right", label: "Details left / map right" },
];

export const MAP_HEIGHT_PRESETS: ReadonlyArray<{ value: MapHeightPreset; label: string; heightPx: number }> = [
  { value: "compact", label: "Compact", heightPx: 180 },
  { value: "standard", label: "Standard", heightPx: 260 },
  { value: "tall", label: "Tall", heightPx: 360 },
  { value: "custom", label: "Custom", heightPx: 260 },
];

export const BUTTON_PRESENTATIONS: ReadonlyArray<{ value: ButtonPresentation; label: string }> = [
  { value: "rectangle", label: "Rectangle" },
  { value: "rounded", label: "Rounded rectangle" },
  { value: "pill", label: "Pill" },
  { value: "square", label: "Square" },
  { value: "circle", label: "Circle" },
  { value: "icon_circle", label: "Icon-only circle" },
  { value: "icon_label", label: "Icon with label beneath" },
  { value: "icon_description", label: "Icon with label and description" },
  { value: "custom", label: "Custom style" },
];

export const MAP_DISPLAY_MODES: ReadonlyArray<{ value: MapDisplayMode; label: string }> = [
  { value: "interactive", label: "Embedded interactive map" },
  { value: "static", label: "Static map preview" },
  { value: "location_card", label: "Branded location card" },
  { value: "map_directions", label: "Map plus Directions button" },
  { value: "directions_only", label: "Directions button only" },
  { value: "pin_only", label: "Map-pin icon only" },
  { value: "text_link", label: "Text link only" },
];

export function buttonElementDefaults(actionType: ButtonActionType = "website", buttonId = "button"): Record<string, unknown> {
  const label = actionType === "directions" ? "Get directions" : actionType === "call" ? "Call" : "Learn more";
  const icon = actionType === "directions" ? "map-pin" : actionType === "call" ? "phone" : "arrow-up-right";
  return {
    elementKind: "button",
    label,
    description: "",
    showLabel: true,
    showDescription: false,
    icon,
    iconPosition: "before",
    iconSize: 22,
    iconColor: "#0b0f19",
    iconBackground: "#22c55e",
    presentation: "rounded" satisfies ButtonPresentation,
    actionType,
    accessibleLabel: actionType === "directions" ? "Get directions" : actionType === "call" ? "Call this business" : "Learn more",
    fill: "#22c55e",
    buttonSurfaceKind: "solid",
    gradientStart: "#22c55e",
    gradientEnd: "#a3e635",
    gradientAngle: 120,
    textColor: "#0b0f19",
    radius: 14,
    cornersLinked: true,
    radiusTopLeft: 14,
    radiusTopRight: 14,
    radiusBottomRight: 14,
    radiusBottomLeft: 14,
    padding: 10,
    borderWidth: 0,
    borderColor: "#ffffff",
    boxShadow: 0,
    boxGlow: 0,
    shine: false,
    contentEditing: false,
    labelOffsetX: 0,
    labelOffsetY: 0,
    textAlign: "center",
    fontSize: 14,
    descriptionSize: 11,
    spacing: 6,
    touchTargetPx: 44,
    motionPreset: "none",
    motionIntensity: 50,
    motionSpeedSeconds: 2.4,
    motionDelaySeconds: 0,
    motionPlay: "gentle_repeat",
    motionTrigger: "load",
    reducedMotionFallback: "none",
    contentComposition: createButtonContentComposition({ buttonId, label, icon }),
  };
}

export function mapElementDefaults(): MapElementProps {
  return {
    elementKind: "map",
    mapSourceMode: "workspace_default",
    mapDisplayMode: "location_card",
    mapOpenApp: "default",
    mapOpenAction: "directions",
    marker: true,
    markerLabel: "Destination",
    zoom: 15,
    radius: 14,
    accessibleLabel: "Open directions",
    responsiveMapBehavior: "full_width",
    locationItems: [],
    mapDisplay: DEFAULT_MAP_LOCATION_DISPLAY,
    mapLayout: "map_details_below",
    mapHeightPreset: "standard",
    mapCustomHeightPx: 260,
    mapSurfaceTreatment: "glass",
  };
}

function isLocationCategory(value: unknown): value is MapLocationCategory {
  return ["venue", "parking", "vip", "merch", "food", "hotel", "sponsor", "other"].includes(String(value));
}

export function normalizeMapLocationItems(props: MapElementProps): MapLocationItem[] {
  const authored = Array.isArray(props.locationItems) ? props.locationItems : [];
  const normalized = authored.flatMap((candidate, index): MapLocationItem[] => {
    if (!candidate || typeof candidate !== "object") return [];
    const item = candidate as MapLocationItem;
    const name = typeof item.name === "string" ? item.name.trim() : "";
    if (!name) return [];
    const number = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : undefined;
    return [{
      locationId: typeof item.locationId === "string" && item.locationId.trim() ? item.locationId : `location-${index + 1}`,
      name,
      category: isLocationCategory(item.category) ? item.category : "other",
      address: typeof item.address === "string" ? item.address : undefined,
      latitude: number(item.latitude),
      longitude: number(item.longitude),
      description: typeof item.description === "string" ? item.description : undefined,
      imageUrl: safeHttpUrl(item.imageUrl) || (typeof item.imageUrl === "string" && item.imageUrl.startsWith("/") ? item.imageUrl : undefined),
      phone: typeof item.phone === "string" ? item.phone : undefined,
      website: safeHttpUrl(item.website),
      directionsIntent: item.directionsIntent === "show" ? "show" : "directions",
      timeNote: typeof item.timeNote === "string" ? item.timeNote : undefined,
      iconRef: typeof item.iconRef === "string" ? item.iconRef : undefined,
      visible: item.visible !== false,
      order: typeof item.order === "number" ? item.order : index,
      primary: item.primary === true,
    }];
  }).sort((a, b) => a.order - b.order);
  if (normalized.length) {
    const primaryIndex = normalized.findIndex((item) => item.primary && item.visible);
    const fallbackIndex = normalized.findIndex((item) => item.visible);
    const winner = primaryIndex >= 0 ? primaryIndex : fallbackIndex;
    return normalized.map((item, index) => ({ ...item, primary: index === winner }));
  }
  const legacy = resolveMapLocation({ ...props, locationItems: undefined });
  if (!legacy) return [];
  return [{
    locationId: props.locationId || "primary-location",
    name: legacy.name,
    category: "venue",
    address: legacy.address,
    latitude: legacy.latitude,
    longitude: legacy.longitude,
    visible: true,
    order: 0,
    primary: true,
    directionsIntent: "directions",
  }];
}

export function normalizeMapLocationActions(props: MapElementProps): MapLocationAction[] {
  if (!Array.isArray(props.mapActions)) return [];
  return props.mapActions.flatMap((candidate, index): MapLocationAction[] => {
    if (!candidate || typeof candidate !== "object") return [];
    const action = candidate as MapLocationAction;
    const label = typeof action.label === "string" ? action.label.trim() : "";
    if (!label) return [];
    return [{
      actionId: typeof action.actionId === "string" && action.actionId.trim() ? action.actionId : `map-action-${index + 1}`,
      label,
      actionType: action.actionType || "website",
      destinationRef: typeof action.destinationRef === "string" ? action.destinationRef : "",
      iconRef: typeof action.iconRef === "string" ? action.iconRef : undefined,
      accessibleLabel: typeof action.accessibleLabel === "string" ? action.accessibleLabel : undefined,
      analyticsId: typeof action.analyticsId === "string" ? action.analyticsId : undefined,
      visible: action.visible !== false,
      order: typeof action.order === "number" ? action.order : index,
    }];
  }).sort((a, b) => a.order - b.order);
}

export function readMapLocationDisplay(props: MapElementProps): MapLocationDisplay {
  const authored = props.mapDisplay && typeof props.mapDisplay === "object" ? props.mapDisplay : {};
  return Object.fromEntries(Object.entries(DEFAULT_MAP_LOCATION_DISPLAY).map(([key, fallback]) => [
    key,
    typeof (authored as Record<string, unknown>)[key] === "boolean" ? (authored as Record<string, boolean>)[key] : fallback,
  ])) as MapLocationDisplay;
}

export function mapLocationHeight(props: MapElementProps): number {
  const preset = MAP_HEIGHT_PRESETS.find((item) => item.value === props.mapHeightPreset) || MAP_HEIGHT_PRESETS[1]!;
  return preset.value === "custom"
    ? Math.max(140, Math.min(720, Number(props.mapCustomHeightPx) || preset.heightPx))
    : preset.heightPx;
}

export function resolveMapLocation(
  props: MapElementProps,
  locations: WorkspaceLocationOption[] = []
): { name: string; address: string; latitude?: number; longitude?: number; pastedUrl?: string } | null {
  const source = props.mapSourceMode || "workspace_default";
  if (source === "workspace_default" || source === "workspace_location") {
    const location = source === "workspace_default"
      ? locations.find((item) => item.isDefault) || locations[0]
      : locations.find((item) => item.id === props.locationId);
    if (!location) return null;
    return {
      name: location.name,
      address: location.address || "Address not available",
      pastedUrl: location.mapUrl || undefined,
    };
  }
  if (source === "coordinates") {
    if (!Number.isFinite(props.latitude) || !Number.isFinite(props.longitude)) return null;
    return {
      name: props.locationName || "Exact coordinates",
      address: `${props.latitude}, ${props.longitude}`,
      latitude: props.latitude,
      longitude: props.longitude,
    };
  }
  if (source === "pasted_url") {
    const pastedUrl = safeHttpUrl(props.mapUrl);
    return pastedUrl ? { name: props.locationName || "Linked map", address: props.address || "Open map", pastedUrl } : null;
  }
  const address = props.address?.trim();
  return address ? { name: props.locationName || (source === "event_location" ? "Event location" : "Card location"), address } : null;
}

export function safeHttpUrl(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

export function buildMapHref(
  props: MapElementProps,
  locations: WorkspaceLocationOption[] = []
): string | undefined {
  if (props.mapOpenApp === "custom") return safeHttpUrl(props.customDirectionsUrl);
  const resolved = resolveMapLocation(props, locations);
  if (!resolved) return undefined;
  if (props.mapSourceMode === "pasted_url" && resolved.pastedUrl) return resolved.pastedUrl;
  const destination = resolved.latitude != null && resolved.longitude != null
    ? `${resolved.latitude},${resolved.longitude}`
    : resolved.address;
  const encoded = encodeURIComponent(destination);
  const directions = (props.mapOpenAction || "directions") !== "show";
  switch (props.mapOpenApp || "default") {
    case "apple":
      return `https://maps.apple.com/?${directions ? "daddr" : "q"}=${encoded}`;
    case "google":
      return directions
        ? `https://www.google.com/maps/dir/?api=1&destination=${encoded}`
        : `https://www.google.com/maps/search/?api=1&query=${encoded}`;
    case "waze":
      return `https://www.waze.com/ul?q=${encoded}&navigate=${directions ? "yes" : "no"}`;
    case "browser":
      return `https://www.openstreetmap.org/search?query=${encoded}`;
    default:
      return `geo:0,0?q=${encoded}`;
  }
}

export function buildLocationItemHref(item: MapLocationItem, app: MapOpenApp = "default"): string | undefined {
  return buildMapHref({
    mapSourceMode: Number.isFinite(item.latitude) && Number.isFinite(item.longitude) ? "coordinates" : "custom_address",
    locationName: item.name,
    address: item.address,
    latitude: item.latitude,
    longitude: item.longitude,
    mapOpenApp: app,
    mapOpenAction: item.directionsIntent || "directions",
  });
}

/** Selects a device adapter at runtime without writing provider URLs into Card state. */
export function resolveRuntimeMapOpenApp(preference: MapOpenApp = "default", userAgent = ""): MapOpenApp {
  if (preference !== "default") return preference;
  if (/iPhone|iPad|iPod/i.test(userAgent)) return "apple";
  if (/Android/i.test(userAgent)) return "default";
  return "google";
}

/** Public renderer adapter. Canonical state never stores this provider URL. */
export function buildMapEmbedHref(item: MapLocationItem, zoom = 15): string | undefined {
  const destination = Number.isFinite(item.latitude) && Number.isFinite(item.longitude)
    ? `${item.latitude},${item.longitude}`
    : item.address?.trim();
  if (!destination) return undefined;
  const resolvedZoom = Math.max(1, Math.min(20, Math.round(Number(zoom) || 15)));
  return `https://maps.google.com/maps?q=${encodeURIComponent(destination)}&z=${resolvedZoom}&output=embed`;
}

export function buildButtonHref(props: Record<string, unknown>): string | undefined {
  const action = typeof props.actionType === "string" ? props.actionType : "website";
  const destination = typeof props.href === "string" ? props.href.trim() : "";
  if (action === "directions") return buildMapHref(props as MapElementProps);
  if (action === "map") {
    if (/^https?:\/\//i.test(destination)) return safeHttpUrl(destination);
    return destination
      ? `https://maps.google.com/?q=${encodeURIComponent(destination)}`
      : undefined;
  }
  if (action === "call") {
    const phone = destination.replace(/^tel:/i, "").replace(/[^+\d]/g, "");
    return phone ? `tel:${phone}` : undefined;
  }
  if (action === "email") {
    const email = destination.replace(/^mailto:/i, "");
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? `mailto:${email}` : undefined;
  }
  if (action === "sms" || action === "text") {
    const phone = destination.replace(/^(?:sms|smsto):/i, "").replace(/[^+\d]/g, "");
    return phone ? `sms:${phone}` : undefined;
  }
  if (action === "tapsave") return "#save-card";
  return safeHttpUrl(destination);
}
