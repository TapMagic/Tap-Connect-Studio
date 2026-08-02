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
};

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

export function buttonElementDefaults(actionType: ButtonActionType = "website"): Record<string, unknown> {
  return {
    elementKind: "button",
    label: actionType === "directions" ? "Get directions" : actionType === "call" ? "Call" : "Learn more",
    description: "",
    showLabel: true,
    showDescription: false,
    icon: actionType === "directions" ? "map-pin" : actionType === "call" ? "phone" : "arrow-up-right",
    iconPosition: "before",
    iconSize: 22,
    iconColor: "#0b0f19",
    iconBackground: "#22c55e",
    presentation: "rounded" satisfies ButtonPresentation,
    actionType,
    accessibleLabel: actionType === "directions" ? "Get directions" : actionType === "call" ? "Call this business" : "Learn more",
    fill: "#22c55e",
    textColor: "#0b0f19",
    radius: 14,
    padding: 10,
    fontSize: 14,
    descriptionSize: 11,
    spacing: 6,
    touchTargetPx: 44,
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
  };
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

export function buildButtonHref(props: Record<string, unknown>): string | undefined {
  const action = typeof props.actionType === "string" ? props.actionType : "website";
  const destination = typeof props.href === "string" ? props.href.trim() : "";
  if (action === "directions") return buildMapHref(props as MapElementProps);
  if (action === "call") {
    const phone = destination.replace(/[^+\d]/g, "");
    return phone ? `tel:${phone}` : undefined;
  }
  if (action === "email") return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destination) ? `mailto:${destination}` : undefined;
  if (action === "tapsave") return "#save-card";
  return safeHttpUrl(destination);
}
