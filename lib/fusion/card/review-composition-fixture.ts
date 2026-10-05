import type { TapConnectCardConfig, TapExperienceConfig, TapExperiencePage } from "@/lib/brand/tap-card";
import type { CreativeCompositionBlock, CreativeCompositionNode } from "@/lib/fusion/creative-studio/composition";
import { resolveSignatureAssembly, type SignatureAssemblyActionSelection, type SignatureAssemblyLayoutMode } from "@/lib/fusion/creative-studio/signature-assets/assembly";
import { adaptSignatureAssemblyResult } from "@/lib/fusion/creative-studio/signature-assets/composition-adapter";
import { CABINET_NOIR_FAMILY_ID, CABINET_NOIR_FAMILY_VERSION } from "@/lib/fusion/creative-studio/signature-assets/cabinet-noir";
import { SIGNATURE_ASSEMBLY_AUTHORING_CONTRACT } from "@/lib/fusion/creative-studio/signature-assets/authoring";
import type { StudioSemanticResource } from "@/lib/fusion/creative-studio/platform/semantic-resource-slot";
import { canonicalizeExperienceConfig, TAP_EXPERIENCE_CONTRACT } from "@/lib/fusion/card/experience-pages";
import { compactActionGridNodeProps, compactActionGridProofFixture, createCompactActionGrid, createCompactActionTile } from "@/lib/fusion/creative-studio/platform/compact-action-grid";
import { DEFAULT_MAP_LOCATION_DISPLAY, type MapLocationItem } from "@/lib/fusion/card/designer-elements";

/** The local review route rebuilds this exact Card before redirecting. */
export const STUDIO_SLICE_1_REVIEW_FIXTURE_VERSION = "phase-2-2-public-shell-v1";

const action = (id: string, label: string, destination: string, plugComponentId: string): SignatureAssemblyActionSelection => ({
  id, label, destination,
  actionType: destination.startsWith("tel:") ? "call" : destination.startsWith("mailto:") ? "email" : "website",
  plugComponentId, accessibilityLabel: label, state: "default", analyticsId: `review-${id}`, textAlign: "center", textSize: "medium",
});

const REVIEW_ACTIONS = [
  action("call", "Call the studio", "tel:+13524332833", "CN-013"),
  action("website", "Visit our website", "https://example.com", "CN-014"),
  action("email", "Send an email", "mailto:hello@example.com", "CN-015"),
  action("directions", "Get directions", "https://maps.google.com", "CN-016"),
] as const;

function curatedModule(layoutMode: Extract<SignatureAssemblyLayoutMode, "single-stack" | "twin-rail">, order: number, identitySrc?: string): CreativeCompositionNode {
  const label = `Cabinet Noir ${layoutMode === "single-stack" ? "Single Stack" : "Twin Rail"}`;
  const blockId = `review-cabinet-noir-${layoutMode}`;
  const input = {
    familyId: CABINET_NOIR_FAMILY_ID, familyVersion: CABINET_NOIR_FAMILY_VERSION,
    recipeId: layoutMode === "single-stack" ? "cabinet-noir-single-stack" : "cabinet-noir-twin-rail",
    recipeVersion: "1.0.0" as const, layoutMode, requestedActionCount: 4,
    actions: [...REVIEW_ACTIONS], decorativeFurniture: {},
  };
  const adapted = adaptSignatureAssemblyResult(resolveSignatureAssembly(input), {
    blockId, label,
    fixtureContent: identitySrc ? { identity: { src: identitySrc, alt: "The Monkey Cage identity" } } : undefined,
  });
  if (!adapted.ok) throw new Error(`The deterministic ${label} fixture failed to compile: ${adapted.errors.map((error)=>error.message).join("; ")}`);
  const identity: StudioSemanticResource | undefined = identitySrc ? {
    src: identitySrc,
    alt: "The Monkey Cage identity",
    source: "brand",
    sourceLabel: "Brand identity",
    provenance: "brand",
  } : undefined;
  const composition = { ...adapted.composition.block, signatureAssembly: { contractId:SIGNATURE_ASSEMBLY_AUTHORING_CONTRACT, input, identityContent: identity, identityDefault: identity } };
  return {
    id:`review-module-${layoutMode}`, primitive:"frame", compositionKind:"module", parentId:null, siblingOrder:order,
    x:0,y:0,width:1,height:1,zIndex:order+1,minHeightPx:Math.ceil(composition.pageHeightPx ?? 56),name:label,
    props:{label,componentKind:"curated-system",elementKind:"curated-system",curatedFamilyId:CABINET_NOIR_FAMILY_ID,curatedLayoutMode:layoutMode,spacingAbovePx:0,spacingBelowPx:0},
    moduleComposition:composition,
  };
}

function ordinaryNode(id: string, primitive: CreativeCompositionNode["primitive"], order: number, name: string, props: Record<string, unknown>, minHeightPx: number): CreativeCompositionNode {
  return { id, primitive, compositionKind:"module", parentId:null, siblingOrder:order, x:0,y:0,width:1,height:1,zIndex:order+1,minHeightPx,name,props:{...props,spacingAbovePx:0,spacingBelowPx:0} };
}

function buildReviewRoot(config: TapConnectCardConfig): CreativeCompositionBlock {
  const text = ordinaryNode("review-text", "text", 0, "Welcome text", {elementKind:"text",text:"Welcome to The Monkey Cage — choose how you would like to connect.",textRole:"body",fontFamily:"Inter, system-ui, sans-serif",fontSize:18,fontWeight:600,lineHeight:1.25,align:"center",color:"#f8fafc",flowWidthPercent:92,flowAlignment:"center"}, 54);
  const button = ordinaryNode("review-standard-button", "button", 1, "Open off-nav Page", {elementKind:"button",componentKind:"button",label:"Open Afterparty",actionType:"internal_page",internalPageId:"page-afterparty",destinationRef:"page-afterparty",href:"",accessibleLabel:"Open the Afterparty Page",fill:"#b8ff2c",color:"#07100a",radius:14,flowWidthPercent:86,flowAlignment:"center"}, 58);
  const divider = ordinaryNode("review-divider", "border", 2, "Champagne glow Divider", {elementKind:"divider",componentKind:"divider",color:"#d6b36a",opacity:.92,thickness:3,style:"double",decorativeTreatment:"metallic",flowWidthPercent:72,flowAlignment:"center",flowInsetPx:10}, 16);
  const container: CreativeCompositionNode = { id:"review-container",primitive:"frame",compositionKind:"container",parentId:null,siblingOrder:3,x:0,y:0,width:1,height:1,zIndex:4,name:"Smoked Glass Container",props:{componentKind:"container",elementKind:"container",layout:"flow",autoHeight:true,surfaceTreatment:"smoked_glass",fill:"#101923",opacity:.78,blurPx:14,borderWidthPx:1,borderColor:"#8bdcff",radiusPx:18,shadowPx:18,padding:12,gap:6,spacingAbovePx:0,spacingBelowPx:0} };
  const containerText = ordinaryNode("review-container-text", "text", 0, "Container text", {elementKind:"text",text:"This Container accepts ordinary Modules without becoming a fixed Curated assembly.",fontSize:15,fontWeight:500,lineHeight:1.25,align:"left",color:"#dbeafe"}, 46);
  containerText.parentId=container.id;
  return {
    version:1,id:`studio-review:${STUDIO_SLICE_1_REVIEW_FIXTURE_VERSION}`,label:"Product Owner Slice 1 Review Card",
    parentAuthority:{version:1,layout:"flow",cardGapPx:6},
    nodes:[text,button,divider,container,containerText,curatedModule("single-stack",4,config.headerLogoUrl),curatedModule("twin-rail",5,config.headerLogoUrl)],
    background:{kind:"solid",value:"#070b10"},mobileFallback:"scale",safeAreaPaddingPx:8,pageHeightPx:520,
  };
}

function compactGridNode(id: string, order: number, label: string, state: ReturnType<typeof createCompactActionGrid>, minHeightPx: number): CreativeCompositionNode {
  return ordinaryNode(id, "button", order, label, compactActionGridNodeProps(state), minHeightPx);
}

function loveAndTheftCompactProofRoot(): CreativeCompositionBlock {
  const social = compactActionGridProofFixture();
  const music = createCompactActionGrid({
    componentId: "review-compact-music-grid",
    analyticsId: "review:compact-music-grid",
    presentation: "everencore-love-and-theft-pick",
    columns: 2,
    density: "standard",
    tiles: [
      ["Easy To Be Lonely", "Play the single"],
      ["Farm Truck", "Listen now"],
      ["Angel Eyes", "Fan favorite"],
    ].map(([label, sublabel], index) => createCompactActionTile({ componentId:`review-music-tile-${index+1}`, actionId:`review-music-action-${index+1}`, analyticsId:`review:music:${index+1}`, label, sublabel, iconAssetRef:"lucide:play", actionType:"website", destinationRef:"https://example.com/music" })),
  });
  const locked = createCompactActionGrid({ componentId:"review-compact-locked-grid", analyticsId:"review:compact-locked-grid", presentation:"everencore-love-and-theft-pick", columns:2, density:"compact", tiles:[
    createCompactActionTile({ componentId:"review-exclusive-tile", actionId:"review-exclusive-action", analyticsId:"review:exclusive", label:"Exclusive", sublabel:"Members access", iconAssetRef:"lucide:lock", actionType:"internal_page", destinationRef:"page-exclusives", locked:true, lockedBehavior:{mode:"cta",message:"Join the artist community to unlock this exclusive.",ctaLabel:"Join",ctaDestinationType:"external",ctaDestinationRef:"https://example.com/join"} }),
    createCompactActionTile({ componentId:"review-afterparty-tile", actionId:"review-afterparty-action", analyticsId:"review:afterparty", label:"Afterparty", sublabel:"Hidden Page", iconAssetRef:"lucide:star", actionType:"internal_page", destinationRef:"page-afterparty" }),
  ] });
  const fresh = createCompactActionGrid({ componentId:"review-compact-new-grid", analyticsId:"review:compact-new-grid", presentation:"everencore-love-and-theft-pick", columns:4, density:"compact", columnGapPx:4, tiles:[
    createCompactActionTile({ componentId:"review-new-release-tile", actionId:"review-new-release-action", analyticsId:"review:new-release", label:"New Release", sublabel:"Just dropped", iconAssetRef:"simple-icons:spotify", actionType:"website", destinationRef:"https://open.spotify.com/", new:true, active:true }),
    createCompactActionTile({ componentId:"review-tour-tile", actionId:"review-tour-action", analyticsId:"review:tour", label:"Tour Dates", sublabel:"See the schedule", iconAssetRef:"lucide:calendar-days", actionType:"internal_page", destinationRef:"page-live" }),
    createCompactActionTile({ componentId:"review-merch-tile", actionId:"review-merch-action", analyticsId:"review:merch", label:"Merch", sublabel:"Shop", iconAssetRef:"lucide:shirt", actionType:"website", destinationRef:"https://example.com/merch" }),
    createCompactActionTile({ componentId:"review-contact-tile", actionId:"review-contact-action", analyticsId:"review:contact", label:"Contact", sublabel:"Call", iconAssetRef:"lucide:phone", actionType:"call", destinationRef:"+13524332833" }),
  ] });
  const heading = (id:string, order:number, text:string) => ordinaryNode(id,"text",order,text,{elementKind:"text",text,fontFamily:"Cormorant Garamond, Georgia, serif",fontSize:24,fontWeight:700,lineHeight:1.05,align:"center",color:"#fff1d2",letterSpacingEm:.02,flowWidthPercent:96,flowAlignment:"center"},44);
  return {
    version:1,
    id:"review-love-theft-compact-root-v4",
    label:"Love & Theft Compact Action Tile proof",
    parentAuthority:{version:1,layout:"flow",cardGapPx:10},
    edgeLayout:{version:1,mode:"full_bleed"},
    compositionDensity:{version:1,mode:"dense"},
    nodes:[
      heading("review-social-heading",0,"Follow & Listen"), compactGridNode("review-social-grid",1,"Social destinations",social,232),
      heading("review-music-heading",2,"Songs"), compactGridNode("review-music-grid",3,"Music destinations",music,250),
      heading("review-access-heading",4,"Access"), compactGridNode("review-locked-grid",5,"Locked and internal destinations",locked,154),
      heading("review-new-heading",6,"Just Added"), compactGridNode("review-new-grid",7,"New actions",fresh,154),
    ],
    background:{kind:"image",opacity:1,saturation:.9,brightness:.72,contrast:1.14,image:{src:"/visual-parts/materials/surfaces/worn-saddle-leather/v1/SURFACE-LEATHER-001_worn-saddle-leather.png",fit:"cover",focalX:.5,focalY:.5,scale:1.08,repeat:"no-repeat",blur:0,brightness:.72,contrast:1.14,overlayColor:"#100906",overlayOpacity:.16,blendMode:"normal"}},
    mobileFallback:"scale",safeAreaPaddingPx:12,pageHeightPx:1050,
  };
}

function neutralCompactProofRoot(): CreativeCompositionBlock {
  const neutral = createCompactActionGrid({ componentId:"review-neutral-compact-grid", analyticsId:"review:neutral-compact-grid", presentation:"neutral-icon", columns:3, density:"standard", tiles:[
    createCompactActionTile({componentId:"review-neutral-call",actionId:"review-neutral-call-action",analyticsId:"review:neutral:call",label:"Call",iconAssetRef:"lucide:phone",actionType:"call",destinationRef:"+13524332833"}),
    createCompactActionTile({componentId:"review-neutral-map",actionId:"review-neutral-map-action",analyticsId:"review:neutral:map",label:"Directions",iconAssetRef:"lucide:map-pin",actionType:"map",destinationRef:"https://maps.google.com"}),
    createCompactActionTile({componentId:"review-neutral-site",actionId:"review-neutral-site-action",analyticsId:"review:neutral:site",label:"Website",iconAssetRef:"lucide:globe",actionType:"website",destinationRef:"https://example.com"}),
  ]});
  return {version:1,id:"review-neutral-compact-root",label:"Neutral Compact Action Grid proof",parentAuthority:{version:1,layout:"flow",cardGapPx:14},nodes:[ordinaryNode("review-neutral-heading","text",0,"Neutral presentation",{elementKind:"text",text:"Neutral Compact Actions",fontSize:30,fontWeight:800,align:"center",color:"#ffffff",flowWidthPercent:94,flowAlignment:"center"},60),compactGridNode("review-neutral-grid",1,"Neutral Compact Action Grid",neutral,170)],background:{kind:"gradient",value:"linear-gradient(145deg,#182433,#070b10)"},mobileFallback:"scale",safeAreaPaddingPx:18,pageHeightPx:520};
}

function videoFeatureProofRoot(): CreativeCompositionBlock {
  const locations: MapLocationItem[] = [
    { locationId:"review-live-venue",name:"World Equestrian Center",category:"venue",address:"1750 NW 80th Ave, Ocala, FL 34482",description:"Main performance venue.",timeNote:"Doors 6:30 PM",phone:"+13524145900",website:"https://worldequestriancenter.com/ocala-fl/",visible:true,order:0,primary:true,directionsIntent:"directions" },
    { locationId:"review-live-parking",name:"Lot B",category:"parking",address:"1750 NW 80th Ave, Ocala, FL 34482",description:"Fan parking. Follow event signage for Lot B.",timeNote:"Open 5:30 PM",visible:true,order:1,primary:false,directionsIntent:"directions" },
    { locationId:"review-live-vip",name:"North Gate",category:"vip",address:"1750 NW 80th Ave, Ocala, FL 34482",description:"VIP and guest-list check-in.",timeNote:"Check-in 5:45–7:15 PM",visible:true,order:2,primary:false,directionsIntent:"directions" },
  ];
  return {
    version:1,
    id:"review-video-feature-root-v2",
    label:"Video Feature proof",
    parentAuthority:{version:1,layout:"flow",cardGapPx:12},
    edgeLayout:{version:1,mode:"full_bleed"},
    compositionDensity:{version:1,mode:"standard"},
    nodes:[
      ordinaryNode("review-video-heading","text",0,"Live video heading",{elementKind:"text",text:"Live from the road",textRole:"heading",fontFamily:"Cormorant Garamond, Georgia, serif",fontSize:32,fontWeight:700,lineHeight:1.05,align:"center",color:"#fff1d2",textHeightMode:"auto",textOverflow:"visible",flowWidthPercent:92,flowAlignment:"center"},58),
      ordinaryNode("review-video-feature","video",1,"Featured performance",{
        elementKind:"video",componentKind:"video",videoPresentation:"feature",videoAspect:"16:9",aspectLocked:true,
        videoUrl:"https://www.youtube.com/watch?v=dQw4w9WgXcQ",src:"https://www.youtube.com/watch?v=dQw4w9WgXcQ",videoProvider:"youtube",videoSourceId:"dQw4w9WgXcQ",
        playbackMode:"play_on_tap",muted:true,controls:true,playsInline:true,loop:false,playOnce:false,
        posterUrl:"/visual-parts/materials/surfaces/worn-saddle-leather/v1/SURFACE-LEATHER-001_worn-saddle-leather.png",posterFit:"cover",posterFocalX:.5,posterFocalY:.46,
        videoTitle:"Backstage acoustic session",videoSubtitle:"Love & Theft · EverEncore",videoDescription:"Tap to watch without leaving the Experience.",videoShowTitle:true,videoShowSubtitle:true,videoShowDescription:true,
        videoFrameTreatment:"artist-surface",videoFrameColor:"#160c08",videoFrameAccent:"#d8ae5b",videoFrameRadiusPx:20,videoFrameBorderPx:1,videoPlayPresentation:"accent",
        analyticsId:"review:video-feature",flowWidthPercent:94,flowAlignment:"center",
      },210),
      ordinaryNode("review-video-copy","text",2,"Video supporting copy",{elementKind:"text",text:"Poster-first playback keeps the visitor in the same Experience and preserves navigation state.",textRole:"body",fontSize:15,fontWeight:500,lineHeight:1.4,align:"center",color:"#ead9b6",textHeightMode:"minimum",textMinHeightPx:48,textOverflow:"visible",flowWidthPercent:86,flowAlignment:"center"},58),
      ordinaryNode("review-live-map","image",3,"Map / Location Container",{elementKind:"map",componentKind:"map",mapSourceMode:"custom_address",mapDisplayMode:"map_directions",mapOpenApp:"default",mapOpenAction:"directions",mapTitle:"Ocala · Show Day",mapIntro:"Venue, parking and VIP check-in",mapLayout:"map_tiles_below",mapHeightPreset:"compact",mapCustomHeightPx:190,mapSurfaceTreatment:"glass",locationItems:locations,mapActions:[{actionId:"review-map-tickets",label:"Tickets",actionType:"website",destinationRef:"https://example.com/tickets",iconRef:"ticket",accessibleLabel:"Open ticket information",analyticsId:"review:live:tickets",visible:true,order:0}],mapDisplay:{...DEFAULT_MAP_LOCATION_DISPLAY,phone:true,website:true,markerLabels:true},radius:20,opacity:1,resizePolicy:"free",aspectLocked:false,flowWidthPercent:100,flowAlignment:"stretch",accessibleLabel:"Ocala show locations",analyticsId:"review:live:map"},520),
    ],
    background:{kind:"image",opacity:1,brightness:.48,contrast:1.12,saturation:.75,image:{src:"/visual-parts/materials/surfaces/worn-saddle-leather/v1/SURFACE-LEATHER-001_worn-saddle-leather.png",fit:"cover",focalX:.5,focalY:.5,scale:1.05,repeat:"no-repeat",blur:0,brightness:.48,contrast:1.12,overlayColor:"#080403",overlayOpacity:.32,blendMode:"normal"}},
    mobileFallback:"scale",safeAreaPaddingPx:12,pageHeightPx:1140,
  };
}

export function prepareCompositionParentReviewDraft(config: TapConnectCardConfig): { config: TapConnectCardConfig; changed: boolean } {
  if (config.experience?.contractId === TAP_EXPERIENCE_CONTRACT && config.experience.experienceId === "experience-studio-review") {
    const currentVersion = config.experience.pages.some((page) => page.composition.rootComposition?.nodes.some((node) => node.id === "review-live-map" && Array.isArray(node.props.mapActions)));
    if (currentVersion) return config.documentName === "The Monkey Cage · Slice 1 Review"
      ? { changed: false, config }
      : { changed: true, config: { ...config, documentName: "The Monkey Cage · Slice 1 Review" } };
  }
  const experienceId = "experience-studio-review";
  const now = new Date().toISOString();
  const makePage = (pageId: string, title: string, navIconRef: string, navOrder: number, rootComposition: CreativeCompositionBlock, options: Partial<TapExperiencePage> = {}): TapExperiencePage => ({
    pageId,
    experienceId,
    title,
    slug: pageId,
    navLabel: title,
    navIconRef,
    navOrder,
    navigationSlot: options.navVisible === false ? undefined : navOrder,
    navVisible: true,
    pageVisible: true,
    navDestinationPageId: pageId,
    access: { state: "public" },
    analyticsId: `review:${pageId}`,
    createdAt: now,
    updatedAt: now,
    composition: { sections: [], rootComposition, rootCanvasMinHeightPx: 520, rootCanvasPaddingPx: 8, rootBackgroundFit: "cover", rootBackgroundPosition: "50% 50%", rootOverlayColor: "#000000", rootOverlayOpacity: 0 },
    ...options,
  });
  const simpleRoot = (id: string, heading: string, body: string, accent: string): CreativeCompositionBlock => ({
    version: 1,
    id: `review-${id}-root`,
    label: `${heading} Page`,
    parentAuthority: { version: 1, layout: "flow", cardGapPx: 14 },
    nodes: [
      ordinaryNode(`${id}-heading`, "text", 0, `${heading} heading`, { elementKind: "text", text: heading, fontSize: 34, fontWeight: 820, align: "center", color: "#ffffff", flowWidthPercent: 92, flowAlignment: "center" }, 64),
      ordinaryNode(`${id}-body`, "text", 1, `${heading} copy`, { elementKind: "text", text: body, fontSize: 16, fontWeight: 500, lineHeight: 1.35, align: "center", color: "#dbeafe", flowWidthPercent: 88, flowAlignment: "center" }, 70),
    ],
    background: { kind: "solid", value: accent },
    mobileFallback: "scale",
    safeAreaPaddingPx: 18,
    pageHeightPx: 520,
  });
  const pages = [
    makePage("page-home", "Home", "house", 0, buildReviewRoot(config)),
    makePage("page-music", "Music", "music", 1, loveAndTheftCompactProofRoot()),
    makePage("page-live", "Live", "calendar-days", 2, videoFeatureProofRoot()),
    makePage("page-exclusives", "Exclusives", "lock", 3, simpleRoot("exclusive", "Exclusives", "A configurable locked-state proof. Entitlement evaluation is intentionally deferred.", "#38122f"), { navLabel:"Vault", access: { state: "locked", ruleRef: "demo:premium-member", lockedBehavior: { mode: "cta", message: "Join the artist community to unlock this Page.", ctaLabel: "Join", ctaDestinationType: "external", ctaDestinationRef: "https://example.com/join" } } }),
    makePage("page-profile", "Profile", "user", 4, neutralCompactProofRoot()),
    makePage("page-afterparty", "Afterparty", "sparkles", 5, simpleRoot("afterparty", "Afterparty", "This Page is intentionally off the bottom navigation and reached through an INTERNAL PAGE action.", "#2f1646"), { navVisible: false, navigationSlot: undefined }),
  ];
  const experience: TapExperienceConfig = {
    contractId: TAP_EXPERIENCE_CONTRACT,
    experienceId,
    analyticsId: `review:${experienceId}`,
    defaultPageId: "page-home",
    pages,
    navigation: { maxVisibleSlots: 5, presentation: "edge", itemPresentation:"everencore-love-and-theft-mini-pick", surfaceTreatment:"smoky-glass", surfaceColor: "#070b10ee", textColor: "#ead9b6", activeColor: "#f4cf7c", borderColor: "#d6ad5b55", blurPx: 18 },
    createdAt: now,
    updatedAt: now,
  };
  const projected = { ...config, version: Math.max(3, config.version ?? 1) as 3, documentName: "The Monkey Cage · Slice 1 Review", rootComposition: pages[0]!.composition.rootComposition, sections: [], rootCanvasMinHeightPx: 520, experience };
  return { changed: true, config: canonicalizeExperienceConfig(projected, "page-home") };
}
