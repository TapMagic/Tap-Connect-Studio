import { defaultTapConnectCard, type TapConnectCardConfig, type TapExperiencePage } from "@/lib/brand/tap-card";
import type { CreativeCompositionBlock, CreativeCompositionNode } from "@/lib/fusion/creative-studio/composition";
import type { BrandContactProfile } from "@/lib/brand/contact-profile";
import { compactActionGridNodeProps, createCompactActionGrid, createCompactActionTile } from "@/lib/fusion/creative-studio/platform/compact-action-grid";
import { TAP_EXPERIENCE_CONTRACT, canonicalizeExperienceConfig } from "@/lib/fusion/card/experience-pages";
import { DEFAULT_MAP_LOCATION_DISPLAY, type MapLocationItem } from "@/lib/fusion/card/designer-elements";

export const EVERENCORE_LOVE_AND_THEFT_PUBLIC_SLUG = "love-and-theft";
export const EVERENCORE_LOVE_AND_THEFT_ROUTE_BASE = "/everencore/love-and-theft";
export const EVERENCORE_LOVE_AND_THEFT_PUBLISHED_REVISION = "phase-2-2-public-shell-v1";

export type PublicExperiencePublication = {
  stableSlug: string;
  publishedRevision: string;
  config: TapConnectCardConfig;
  profile: BrandContactProfile;
  businessName: string;
};

const leather = "/visual-parts/materials/surfaces/worn-saddle-leather/v1/SURFACE-LEATHER-001_worn-saddle-leather.png";

function node(id: string, primitive: CreativeCompositionNode["primitive"], order: number, name: string, props: Record<string, unknown>, minHeightPx: number): CreativeCompositionNode {
  return { id, primitive, compositionKind: "module", parentId: null, siblingOrder: order, x: 0, y: 0, width: 1, height: 1, zIndex: order + 1, minHeightPx, name, props: { ...props, spacingAbovePx: 0, spacingBelowPx: 0 } };
}

function pageRoot(id: string, nodes: CreativeCompositionNode[], height: number): CreativeCompositionBlock {
  return {
    version: 1,
    id: `everencore-public-${id}-${EVERENCORE_LOVE_AND_THEFT_PUBLISHED_REVISION}`,
    label: `Love & Theft ${id}`,
    parentAuthority: { version: 1, layout: "flow", cardGapPx: 12 },
    edgeLayout: { version: 1, mode: "full_bleed" },
    compositionDensity: { version: 1, mode: "standard" },
    nodes,
    background: { kind: "image", opacity: 1, brightness: .54, contrast: 1.14, saturation: .84, image: { src: leather, fit: "cover", focalX: .5, focalY: .5, scale: 1.08, repeat: "no-repeat", blur: 0, brightness: .54, contrast: 1.14, overlayColor: "#090403", overlayOpacity: .3, blendMode: "normal" } },
    mobileFallback: "scale",
    safeAreaPaddingPx: 12,
    pageHeightPx: height,
  };
}

const heading = (id: string, order: number, text: string, size = 34) => node(id, "text", order, text, { elementKind: "text", text, textRole: "heading", fontFamily: "Cormorant Garamond, Georgia, serif", fontSize: size, fontWeight: 700, lineHeight: 1.02, align: "center", color: "#fff0cc", letterSpacingEm: .02, flowWidthPercent: 94, flowAlignment: "center" }, 58);
const body = (id: string, order: number, text: string) => node(id, "text", order, text, { elementKind: "text", text, textRole: "body", fontSize: 15, fontWeight: 500, lineHeight: 1.45, align: "center", color: "#ead9b6", flowWidthPercent: 88, flowAlignment: "center" }, 62);

function homeRoot(): CreativeCompositionBlock {
  return pageRoot("home", [
    node("ee-home-mark", "text", 0, "EverEncore", { elementKind: "text", text: "EVERENCORE × LOVE & THEFT", fontFamily: "Cormorant Garamond, Georgia, serif", fontSize: 17, fontWeight: 700, align: "center", color: "#e8c983", letterSpacingEm: .18, flowWidthPercent: 94, flowAlignment: "center" }, 42),
    heading("ee-home-heading", 1, "One tap. The whole story.", 40),
    body("ee-home-body", 2, "Music, live dates and the places that matter—kept together in one persistent artist Experience."),
    node("ee-home-music", "button", 3, "Explore Music", { elementKind: "button", componentKind: "button", label: "Explore Music", description: "Listen without leaving the Experience", showDescription: true, actionType: "internal_page", internalPageId: "page-music", destinationRef: "page-music", accessibleLabel: "Explore Love and Theft music", fill: "#d8ae5b", textColor: "#1b1007", radius: 999, flowWidthPercent: 82, flowAlignment: "center", minimumTouchTargetPx: 48 }, 64),
  ], 610);
}

function musicRoot(): CreativeCompositionBlock {
  const grid = createCompactActionGrid({
    componentId: "ee-public-music-grid",
    analyticsId: "everencore:love-and-theft:music-grid",
    presentation: "everencore-love-and-theft-pick",
    columns: 3,
    density: "compact",
    tiles: [
      createCompactActionTile({ componentId: "ee-listen", actionId: "ee-listen-action", analyticsId: "everencore:music:spotify", label: "Listen", sublabel: "Spotify", iconAssetRef: "simple-icons:spotify", actionType: "website", destinationRef: "https://open.spotify.com/artist/03a5eVjzFyQlR4XyVSwt4t" }),
      createCompactActionTile({ componentId: "ee-backstage", actionId: "ee-backstage-action", analyticsId: "everencore:music:backstage", label: "Backstage", sublabel: "Interview", iconAssetRef: "lucide:video", actionType: "internal_page", destinationRef: "page-backstage" }),
      createCompactActionTile({ componentId: "ee-live", actionId: "ee-live-action", analyticsId: "everencore:music:live", label: "Live", sublabel: "Show details", iconAssetRef: "lucide:calendar-days", actionType: "internal_page", destinationRef: "page-live" }),
    ],
  });
  return pageRoot("music", [
    heading("ee-music-heading", 0, "Music"),
    body("ee-music-body", 1, "A compact destination layer and an inline Video Feature share the same persistent shell."),
    node("ee-music-grid-node", "button", 2, "Music destinations", compactActionGridNodeProps(grid), 150),
    node("ee-music-video", "video", 3, "Video Feature", { elementKind: "video", componentKind: "video", videoPresentation: "feature", videoAspect: "16:9", aspectLocked: true, videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", src: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", videoProvider: "youtube", videoSourceId: "dQw4w9WgXcQ", playbackMode: "play_on_tap", muted: true, controls: true, playsInline: true, videoTitle: "Road session", videoSubtitle: "Love & Theft · EverEncore", videoDescription: "Inline playback preserves the Experience and Page context.", videoShowTitle: true, videoShowSubtitle: true, videoShowDescription: true, videoFrameTreatment: "artist-surface", videoFrameColor: "#160c08", videoFrameAccent: "#d8ae5b", videoFrameRadiusPx: 20, videoFrameBorderPx: 1, videoPlayPresentation: "accent", analyticsId: "everencore:video:road-session", flowWidthPercent: 94, flowAlignment: "center" }, 218),
  ], 780);
}

function liveRoot(): CreativeCompositionBlock {
  const locations: MapLocationItem[] = [
    { locationId: "wec-venue", name: "World Equestrian Center", category: "venue", address: "1750 NW 80th Ave, Ocala, FL 34482", description: "Main performance venue. Use the primary entrance unless your pass says otherwise.", timeNote: "Doors 6:30 PM", phone: "+13524145900", website: "https://worldequestriancenter.com/ocala-fl/", iconRef: "lucide:music", visible: true, order: 0, primary: true, directionsIntent: "directions" },
    { locationId: "wec-parking", name: "Lot B", category: "parking", address: "1750 NW 80th Ave, Ocala, FL 34482", description: "Fan parking. Follow event signage for Lot B after entering the property.", timeNote: "Open 5:30 PM", iconRef: "lucide:car", visible: true, order: 1, primary: false, directionsIntent: "directions" },
    { locationId: "wec-vip", name: "North Gate", category: "vip", address: "1750 NW 80th Ave, Ocala, FL 34482", description: "VIP and guest-list check-in. Have your confirmation ready.", timeNote: "Check-in 5:45–7:15 PM", iconRef: "lucide:star", visible: true, order: 2, primary: false, directionsIntent: "directions" },
  ];
  return pageRoot("live", [
    heading("ee-live-heading", 0, "Live in Ocala"),
    body("ee-live-body", 1, "Choose the venue, parking or VIP check-in. Directions opens your preferred map while this Page stays here."),
    node("ee-live-map", "image", 2, "Ocala Map / Location Container", { elementKind: "map", componentKind: "map", mapSourceMode: "custom_address", mapDisplayMode: "map_directions", mapOpenApp: "default", mapOpenAction: "directions", mapTitle: "Ocala · Show Day", mapIntro: "Venue, parking and VIP check-in", mapLayout: "map_tiles_below", mapHeightPreset: "compact", mapCustomHeightPx: 190, mapSurfaceTreatment: "glass", locationItems: locations, mapActions: [{ actionId: "ee-live-tickets", label: "Tickets", actionType: "website", destinationRef: "https://www.loveandtheft.com/", iconRef: "ticket", accessibleLabel: "Open Love and Theft ticket information", analyticsId: "everencore:live:tickets", visible: true, order: 0 }], mapDisplay: { ...DEFAULT_MAP_LOCATION_DISPLAY, phone: true, website: true, markerLabels: true }, radius: 20, opacity: 1, resizePolicy: "free", aspectLocked: false, flowWidthPercent: 100, flowAlignment: "stretch", accessibleLabel: "Ocala show locations", analyticsId: "everencore:live:map" }, 520),
  ], 900);
}

function backstageRoot(): CreativeCompositionBlock {
  return pageRoot("backstage", [
    heading("ee-backstage-heading", 0, "Backstage Interview"),
    body("ee-backstage-body", 1, "This off-navigation Page proves direct/internal hidden Page routing inside the full Experience shell."),
    node("ee-backstage-video", "video", 2, "Backstage Video", { elementKind: "video", componentKind: "video", videoPresentation: "feature", videoAspect: "16:9", aspectLocked: true, videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", videoProvider: "youtube", videoSourceId: "dQw4w9WgXcQ", playbackMode: "play_on_tap", muted: true, controls: true, playsInline: true, videoTitle: "Backstage Interview", videoSubtitle: "Off-nav Page", videoShowTitle: true, videoShowSubtitle: true, videoFrameTreatment: "artist-surface", videoFrameColor: "#160c08", videoFrameAccent: "#d8ae5b", videoFrameRadiusPx: 20, videoFrameBorderPx: 1, videoPlayPresentation: "accent", analyticsId: "everencore:video:backstage", flowWidthPercent: 94, flowAlignment: "center" }, 218),
  ], 650);
}

function lockedRoot(): CreativeCompositionBlock {
  return pageRoot("vault", [heading("ee-vault-heading", 0, "The Vault"), body("ee-vault-body", 1, "A deterministic locked demo state. Entitlement evaluation remains intentionally deferred.")], 540);
}

function buildPublication(): PublicExperiencePublication {
  const base = defaultTapConnectCard({ businessName: "Love & Theft", accentColor: "#d8ae5b" });
  const experienceId = "everencore-love-and-theft";
  const publishedAt = "2026-10-04T00:00:00.000Z";
  const makePage = (pageId: string, slug: string, title: string, navLabel: string, navIconRef: string, navOrder: number, composition: CreativeCompositionBlock, options: Partial<TapExperiencePage> = {}): TapExperiencePage => ({
    pageId, experienceId, slug, title, navLabel, navIconRef, navOrder, navigationSlot: options.navVisible === false ? undefined : navOrder, navVisible: options.navVisible !== false, pageVisible: true, navDestinationPageId: pageId, access: { state: "public" }, analyticsId: `everencore:love-and-theft:${slug}`, createdAt: publishedAt, updatedAt: publishedAt,
    composition: { sections: [], rootComposition: composition, rootCanvasMinHeightPx: composition.pageHeightPx || 520, rootCanvasPaddingPx: 0, rootBackgroundFit: "cover", rootBackgroundPosition: "50% 50%", rootOverlayColor: "#000000", rootOverlayOpacity: 0 },
    ...options,
  });
  const pages = [
    makePage("page-home", "home", "Home", "Home", "house", 0, homeRoot()),
    makePage("page-music", "music", "Music", "Music", "music", 1, musicRoot()),
    makePage("page-live", "live", "Live", "Live", "map-pin", 2, liveRoot()),
    makePage("page-vault", "vault", "Vault", "Vault", "lock", 3, lockedRoot(), { access: { state: "locked", ruleRef: "demo:everencore-vault", lockedBehavior: { mode: "cta", message: "Join the artist community to unlock the Vault.", ctaLabel: "Return Home", ctaDestinationType: "internal_page", ctaDestinationRef: "page-home" } } }),
    makePage("page-backstage", "backstage", "Backstage Interview", "Backstage", "video", 4, backstageRoot(), { navVisible: false, navigationSlot: undefined }),
  ];
  const config = canonicalizeExperienceConfig({
    ...base,
    version: 3,
    documentName: `Love & Theft · Published ${EVERENCORE_LOVE_AND_THEFT_PUBLISHED_REVISION}`,
    sections: [],
    rootComposition: pages[0]!.composition.rootComposition,
    rootCanvasMinHeightPx: pages[0]!.composition.rootCanvasMinHeightPx,
    rootCanvasPaddingPx: 0,
    utilityLayer: { enabled: false, presentation: "compact_row", utilities: [] },
    experience: { contractId: TAP_EXPERIENCE_CONTRACT, experienceId, analyticsId: `everencore:experience:${experienceId}`, defaultPageId: "page-home", pages, navigation: { maxVisibleSlots: 4, presentation: "edge", itemPresentation: "everencore-love-and-theft-mini-pick", surfaceTreatment: "smoky-glass", surfaceColor: "#070504f2", textColor: "#dcc69d", activeColor: "#f1c86f", borderColor: "#d6ad5b55", blurPx: 18 }, createdAt: publishedAt, updatedAt: publishedAt },
  }, "page-home");
  return {
    stableSlug: EVERENCORE_LOVE_AND_THEFT_PUBLIC_SLUG,
    publishedRevision: EVERENCORE_LOVE_AND_THEFT_PUBLISHED_REVISION,
    config,
    businessName: "Love & Theft",
    profile: { displayName: "Love & Theft", organization: "Love & Theft", website: "https://www.loveandtheft.com/", address: "1750 NW 80th Ave, Ocala, FL 34482", phone: "+13524145900", socials: { spotify: "https://open.spotify.com/artist/03a5eVjzFyQlR4XyVSwt4t" } },
  };
}

const publications: Record<string, PublicExperiencePublication> = {
  [EVERENCORE_LOVE_AND_THEFT_PUBLIC_SLUG]: buildPublication(),
};

/** Stable slug resolves the currently published immutable revision. */
export function resolvePublishedEverEncoreExperience(stableSlug: string): PublicExperiencePublication | null {
  return publications[stableSlug] || null;
}
