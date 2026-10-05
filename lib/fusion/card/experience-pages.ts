import { nanoid } from "nanoid";
import type {
  TapConnectCardConfig,
  TapExperienceConfig,
  TapExperiencePage,
  TapExperiencePageComposition,
} from "@/lib/brand/tap-card";
import type { CreativeCompositionBlock, CreativeCompositionNode } from "@/lib/fusion/creative-studio/composition";

export const TAP_EXPERIENCE_CONTRACT = "tapExperience@1.0.0" as const;
export const LEGACY_CARD_PAGE_ID = "card-page";

export type ExperienceAnalyticsEventType =
  | "experience_opened"
  | "page_viewed"
  | "nav_clicked"
  | "component_clicked"
  | "external_destination_clicked"
  | "locked_attempted"
  | "locked_opened"
  | "repeat_visit";

/** Stable Phase 1 analytics envelope. Optional identities are populated later by their owning systems. */
export type ExperienceAnalyticsEnvelope = {
  eventType: ExperienceAnalyticsEventType | (string & {});
  timestamp: string;
  experienceId: string;
  pageId?: string;
  componentId?: string;
  actionId?: string;
  destinationType?: "internal_page" | "external" | (string & {});
  destinationRef?: string;
  artistClientId?: string;
  sessionId?: string;
  fanId?: string;
  accessTier?: string;
  campaignId?: string;
  collectibleId?: string;
  collectibleSerial?: string;
};

const PAGE_COMPOSITION_KEYS = [
  "rootComposition",
  "rootCanvasMinHeightPx",
  "rootCanvasPaddingPx",
  "rootBackgroundImageUrl",
  "rootBackgroundFit",
  "rootBackgroundPosition",
  "rootOverlayColor",
  "rootOverlayOpacity",
] as const;

export function pageCompositionFromCard(config: TapConnectCardConfig): TapExperiencePageComposition {
  return {
    rootComposition: config.rootComposition,
    sections: config.sections,
    rootCanvasMinHeightPx: config.rootCanvasMinHeightPx,
    rootCanvasPaddingPx: config.rootCanvasPaddingPx,
    rootBackgroundImageUrl: config.rootBackgroundImageUrl,
    rootBackgroundFit: config.rootBackgroundFit,
    rootBackgroundPosition: config.rootBackgroundPosition,
    rootOverlayColor: config.rootOverlayColor,
    rootOverlayOpacity: config.rootOverlayOpacity,
  };
}

export function projectExperiencePage(config: TapConnectCardConfig, requestedPageId?: string | null): TapConnectCardConfig {
  const experience = config.experience;
  if (!experience) return config;
  const page = resolveExperiencePage(experience, requestedPageId);
  if (!page) return config;
  return {
    ...config,
    rootComposition: page.composition.rootComposition,
    sections: page.composition.sections,
    rootCanvasMinHeightPx: page.composition.rootCanvasMinHeightPx,
    rootCanvasPaddingPx: page.composition.rootCanvasPaddingPx,
    rootBackgroundImageUrl: page.composition.rootBackgroundImageUrl,
    rootBackgroundFit: page.composition.rootBackgroundFit,
    rootBackgroundPosition: page.composition.rootBackgroundPosition,
    rootOverlayColor: page.composition.rootOverlayColor,
    rootOverlayOpacity: page.composition.rootOverlayOpacity,
  };
}

/**
 * Commits the active editor projection back into its Page, then removes the
 * legacy root projection. The returned document is the only persisted source
 * of truth for a multi-page Experience.
 */
export function canonicalizeExperienceConfig(config: TapConnectCardConfig, activePageId?: string | null): TapConnectCardConfig {
  if (!config.experience) return config;
  const resolved = resolveExperiencePage(config.experience, activePageId);
  const pageId = resolved?.pageId ?? config.experience.defaultPageId;
  const composition = pageCompositionFromCard(config);
  const pages = config.experience.pages.map((page) => page.pageId === pageId
    ? { ...page, composition, updatedAt: page.updatedAt }
    : page);
  const stripped = { ...config, experience: { ...config.experience, pages }, sections: [] } as TapConnectCardConfig;
  for (const key of PAGE_COMPOSITION_KEYS) delete stripped[key];
  return stripped;
}

export function resolveExperiencePage(experience: TapExperienceConfig, requestedPageId?: string | null): TapExperiencePage | null {
  const requested = requestedPageId
    ? experience.pages.find((page) => page.pageId === requestedPageId || page.slug === requestedPageId)
    : null;
  if (requested?.pageVisible) return requested;
  return experience.pages.find((page) => page.pageId === experience.defaultPageId && page.pageVisible)
    ?? experience.pages.find((page) => page.pageVisible)
    ?? experience.pages[0]
    ?? null;
}

export function createExperienceFromLegacyCard(config: TapConnectCardConfig, title = "Home"): TapConnectCardConfig {
  if (config.experience) return canonicalizeExperienceConfig(config, config.experience.defaultPageId);
  const experienceId = `experience-${nanoid(10)}`;
  const pageId = `page-${nanoid(10)}`;
  const now = new Date().toISOString();
  const experience: TapExperienceConfig = {
    contractId: TAP_EXPERIENCE_CONTRACT,
    experienceId,
    analyticsId: `experience:${experienceId}`,
    defaultPageId: pageId,
    pages: [{
      pageId,
      experienceId,
      title,
      slug: pageId,
      navLabel: title,
      navIconRef: "house",
      navOrder: 0,
      navigationSlot: 0,
      navVisible: true,
      pageVisible: true,
      navDestinationPageId: pageId,
      access: { state: "public" },
      composition: pageCompositionFromCard(config),
      analyticsId: `page:${pageId}`,
      createdAt: now,
      updatedAt: now,
    }],
    navigation: { maxVisibleSlots: 5, presentation: "edge" },
    createdAt: now,
    updatedAt: now,
  };
  return canonicalizeExperienceConfig({ ...config, experience }, pageId);
}

export function createBlankExperiencePage(experience: TapExperienceConfig, title = "New Page"): TapExperiencePage {
  const pageId = `page-${nanoid(10)}`;
  const now = new Date().toISOString();
  const maxOrder = experience.pages.reduce((max, page) => Math.max(max, page.navOrder), -1);
  return {
    pageId,
    experienceId: experience.experienceId,
    title,
    slug: pageId,
    navLabel: title,
    navIconRef: "star",
    navOrder: maxOrder + 1,
    navVisible: false,
    pageVisible: true,
    navDestinationPageId: pageId,
    access: { state: "public" },
    analyticsId: `page:${pageId}`,
    createdAt: now,
    updatedAt: now,
    composition: {
      sections: [],
      rootCanvasMinHeightPx: 520,
      rootCanvasPaddingPx: 12,
      rootBackgroundFit: "cover",
      rootBackgroundPosition: "50% 50%",
      rootOverlayColor: "#000000",
      rootOverlayOpacity: 0,
      rootComposition: {
        version: 1,
        id: `page-root-${nanoid(9)}`,
        label: `${title} composition`,
        nodes: [],
        parentAuthority: { version: 1, layout: "flow", cardGapPx: 12 },
        background: { kind: "none" },
        mobileFallback: "scale",
        safeAreaPaddingPx: 12,
        pageHeightPx: 520,
      },
    },
  };
}

export function duplicateExperiencePage(experience: TapExperienceConfig, sourcePageId: string): TapExperiencePage | null {
  const source = experience.pages.find((page) => page.pageId === sourcePageId);
  if (!source) return null;
  const pageId = `page-${nanoid(10)}`;
  const now = new Date().toISOString();
  const composition = clonePageComposition(source.composition);
  return {
    ...structuredClone(source),
    pageId,
    experienceId: experience.experienceId,
    title: `${source.title} Copy`,
    slug: pageId,
    navLabel: `${source.navLabel} Copy`.slice(0, 24),
    navOrder: experience.pages.reduce((max, page) => Math.max(max, page.navOrder), -1) + 1,
    navigationSlot: undefined,
    navVisible: false,
    navDestinationPageId: pageId,
    analyticsId: `page:${pageId}`,
    access: source.access ? { ...structuredClone(source.access), ruleRef: undefined } : { state: "public" },
    composition,
    createdAt: now,
    updatedAt: now,
  };
}

function clonePageComposition(source: TapExperiencePageComposition): TapExperiencePageComposition {
  const composition = structuredClone(source);
  if (composition.rootComposition) composition.rootComposition = cloneCompositionBlock(composition.rootComposition);
  composition.sections = composition.sections.map((section) => ({
    ...section,
    id: nanoid(9),
    linkedObjectId: undefined,
    linkedCampaignId: undefined,
    offerBlockId: undefined,
    composition: section.composition ? cloneCompositionBlock(section.composition) : undefined,
  }));
  return composition;
}

function cloneCompositionBlock(source: CreativeCompositionBlock): CreativeCompositionBlock {
  const clone = structuredClone(source);
  const idMap = new Map<string, string>();
  for (const node of clone.nodes) idMap.set(node.id, nanoid(10));
  const groupMap = new Map((clone.groups ?? []).map((group) => [group.id, nanoid(10)]));
  const nodes = clone.nodes.map((node): CreativeCompositionNode => {
    const nextId = idMap.get(node.id)!;
    const props = cloneNestedActionIdentities({ ...node.props });
    delete props.analyticsId;
    delete props.trackingId;
    return {
      ...node,
      id: nextId,
      parentId: node.parentId ? idMap.get(node.parentId) ?? node.parentId : node.parentId,
      groupId: node.groupId ? groupMap.get(node.groupId) : undefined,
      props,
      moduleComposition: node.moduleComposition ? cloneCompositionBlock(node.moduleComposition) : undefined,
    };
  });
  return {
    ...clone,
    id: `composition-${nanoid(10)}`,
    nodes,
    groups: clone.groups?.map((group) => ({ ...group, id: groupMap.get(group.id)! })),
    signatureAssembly: clone.signatureAssembly ? {
      ...clone.signatureAssembly,
      input: {
        ...clone.signatureAssembly.input,
        actions: clone.signatureAssembly.input.actions.map((action) => ({
          ...action,
          id: `action-${nanoid(9)}`,
          analyticsId: `action:${nanoid(10)}`,
        })),
      },
    } : undefined,
  };
}

export type ExperiencePageReference = {
  sourcePageId: string;
  sourceLabel: string;
  kind: "action" | "navigation" | "locked_cta";
};

export function findExperiencePageReferences(experience: TapExperienceConfig, targetPageId: string): ExperiencePageReference[] {
  const references: ExperiencePageReference[] = [];
  for (const page of experience.pages) {
    if (page.pageId !== targetPageId && page.navDestinationPageId === targetPageId) references.push({ sourcePageId: page.pageId, sourceLabel: page.title, kind: "navigation" });
    if (page.pageId !== targetPageId && page.access?.lockedBehavior?.ctaDestinationType === "internal_page" && page.access.lockedBehavior.ctaDestinationRef === targetPageId) references.push({ sourcePageId: page.pageId, sourceLabel: page.title, kind: "locked_cta" });
    visitComposition(page.composition.rootComposition, (node) => {
      if (internalPageDestination(node.props) === targetPageId) references.push({ sourcePageId: page.pageId, sourceLabel: node.name || page.title, kind: "action" });
      for (const tile of compactActionTiles(node.props)) {
        if (internalPageDestination(tile) === targetPageId) references.push({ sourcePageId: page.pageId, sourceLabel: String(tile.label || node.name || page.title), kind: "action" });
        if (compactTileLockedDestination(tile) === targetPageId) references.push({ sourcePageId: page.pageId, sourceLabel: String(tile.label || node.name || page.title), kind: "locked_cta" });
      }
    });
    for (const section of page.composition.sections) visitComposition(section.composition, (node) => {
      if (internalPageDestination(node.props) === targetPageId) references.push({ sourcePageId: page.pageId, sourceLabel: node.name || section.label || page.title, kind: "action" });
      for (const tile of compactActionTiles(node.props)) {
        if (internalPageDestination(tile) === targetPageId) references.push({ sourcePageId: page.pageId, sourceLabel: String(tile.label || node.name || section.label || page.title), kind: "action" });
        if (compactTileLockedDestination(tile) === targetPageId) references.push({ sourcePageId: page.pageId, sourceLabel: String(tile.label || node.name || section.label || page.title), kind: "locked_cta" });
      }
    });
  }
  return references;
}

export function clearExperiencePageReferences(experience: TapExperienceConfig, targetPageId: string): TapExperienceConfig {
  return {
    ...experience,
    pages: experience.pages.map((page) => ({
      ...page,
      navDestinationPageId: page.navDestinationPageId === targetPageId ? page.pageId : page.navDestinationPageId,
      access: page.access?.lockedBehavior?.ctaDestinationType === "internal_page" && page.access.lockedBehavior.ctaDestinationRef === targetPageId
        ? { ...page.access, lockedBehavior: { ...page.access.lockedBehavior, ctaDestinationRef: undefined } }
        : page.access,
      composition: {
        ...page.composition,
        rootComposition: clearBlockReference(page.composition.rootComposition, targetPageId),
        sections: page.composition.sections.map((section) => section.composition
          ? { ...section, composition: clearBlockReference(section.composition, targetPageId)! }
          : section),
      },
    })),
  };
}

export function internalPageDestination(props: Record<string, unknown>): string | null {
  if (props.actionType !== "internal_page") return null;
  const value = props.internalPageId ?? props.destinationRef ?? props.href;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function compactActionTiles(props: Record<string, unknown>): Record<string, unknown>[] {
  const grid = props.compactActionGrid;
  if (!grid || typeof grid !== "object" || Array.isArray(grid)) return [];
  const tiles = (grid as Record<string, unknown>).tiles;
  return Array.isArray(tiles) ? tiles.filter((tile): tile is Record<string, unknown> => Boolean(tile) && typeof tile === "object" && !Array.isArray(tile)) : [];
}

function compactTileLockedDestination(tile: Record<string, unknown>): string | null {
  const behavior = tile.lockedBehavior;
  if (!behavior || typeof behavior !== "object" || Array.isArray(behavior)) return null;
  const value = behavior as Record<string, unknown>;
  return value.ctaDestinationType === "internal_page" && typeof value.ctaDestinationRef === "string" ? value.ctaDestinationRef : null;
}

function cloneNestedActionIdentities(props: Record<string, unknown>): Record<string, unknown> {
  const grid = props.compactActionGrid;
  if (!grid || typeof grid !== "object" || Array.isArray(grid)) return props;
  const value = grid as Record<string, unknown>;
  return {
    ...props,
    compactActionGrid: {
      ...value,
      componentId: `compact-grid-${nanoid(9)}`,
      analyticsId: `compact-grid:${nanoid(10)}`,
      tiles: compactActionTiles(props).map((tile) => ({
        ...tile,
        componentId: `compact-tile-${nanoid(9)}`,
        actionId: `action-${nanoid(9)}`,
        analyticsId: `compact-action:${nanoid(10)}`,
      })),
    },
  };
}

function visitComposition(block: CreativeCompositionBlock | undefined, visit: (node: CreativeCompositionNode) => void) {
  if (!block) return;
  for (const node of block.nodes) {
    visit(node);
    visitComposition(node.moduleComposition, visit);
  }
  for (const action of block.signatureAssembly?.input.actions ?? []) {
    if (action.actionType === "internal_page") {
      visit({ id: action.id, primitive: "button", x: 0, y: 0, width: 1, height: 1, zIndex: 0, name: action.label, props: { actionType: "internal_page", href: action.destination } });
    }
  }
}

function clearBlockReference(block: CreativeCompositionBlock | undefined, targetPageId: string): CreativeCompositionBlock | undefined {
  if (!block) return undefined;
  return {
    ...block,
    nodes: block.nodes.map((node) => ({
      ...node,
      props: clearNodeReferences(node.props, targetPageId),
      moduleComposition: clearBlockReference(node.moduleComposition, targetPageId),
    })),
    signatureAssembly: block.signatureAssembly ? {
      ...block.signatureAssembly,
      input: {
        ...block.signatureAssembly.input,
        actions: block.signatureAssembly.input.actions.map((action) => action.actionType === "internal_page" && action.destination === targetPageId
          ? { ...action, actionType: "none", destination: "" }
          : action),
      },
    } : undefined,
  };
}

function clearNodeReferences(props: Record<string, unknown>, targetPageId: string): Record<string, unknown> {
  const cleared: Record<string, unknown> = internalPageDestination(props) === targetPageId
    ? { ...props, actionType: "none", href: "", internalPageId: undefined, destinationRef: undefined }
    : { ...props };
  const grid = cleared.compactActionGrid;
  if (!grid || typeof grid !== "object" || Array.isArray(grid)) return cleared;
  return {
    ...cleared,
    compactActionGrid: {
      ...(grid as Record<string, unknown>),
      tiles: compactActionTiles(cleared).map((tile) => {
        const direct: Record<string, unknown> = internalPageDestination(tile) === targetPageId
          ? { ...tile, actionType:"website", destinationRef:"" }
          : { ...tile };
        if (compactTileLockedDestination(direct) !== targetPageId) return direct;
        return { ...direct, lockedBehavior: { ...(direct.lockedBehavior as Record<string, unknown>), ctaDestinationRef: undefined } };
      }),
    },
  };
}

export function visibleExperienceNavPages(experience: TapExperienceConfig): TapExperiencePage[] {
  return [...experience.pages]
    .filter((page) => page.navVisible && page.pageVisible && page.access?.lockedBehavior?.mode !== "hidden")
    .sort((a, b) => a.navOrder - b.navOrder)
    .slice(0, experience.navigation.maxVisibleSlots);
}

export function normalizeExperiencePageOrder(experience: TapExperienceConfig): TapExperienceConfig {
  const ordered = [...experience.pages].sort((a, b) => a.navOrder - b.navOrder);
  return {
    ...experience,
    pages: ordered.map((page, index) => ({ ...page, navOrder: index, navigationSlot: page.navVisible ? index : undefined })),
  };
}
