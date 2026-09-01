export const STUDIO_CATALOG_BROWSER_CONTRACT = "studioCatalogBrowser@1.0.0" as const;

export type StudioCatalogReadiness = "ready" | "preview" | "hidden";
export type StudioCatalogProjection = "inline-drawer" | "focused-gallery";

export type StudioCatalogCategory = {
  id: string;
  label: string;
  parentId: string | null;
  readiness: StudioCatalogReadiness;
  projection?: StudioCatalogProjection;
  searchTerms?: readonly string[];
};

export type StudioCatalogResult = {
  id: string;
  label: string;
  description?: string;
  categoryId: string;
  readiness: StudioCatalogReadiness;
  searchText: string;
  stableResourceId: string;
  previewAuthority: string;
  compatibility?: readonly string[];
  entitlementKeys?: readonly string[];
  preview?: Readonly<Record<string, unknown>>;
  application?: Readonly<Record<string, unknown>>;
};

export type StudioCatalogConsumerAdapter = {
  contractId: typeof STUDIO_CATALOG_BROWSER_CONTRACT;
  id: string;
  domainLabel: string;
  resultKind: string;
  categories: readonly StudioCatalogCategory[];
  results: readonly StudioCatalogResult[];
  previewAdapterId: string;
  application: "place" | "apply" | "replace" | "assign";
  supports: {
    brand: boolean;
    recent: boolean;
    saved: boolean;
    favorites: boolean;
    pagination: boolean;
  };
  returnBehavior: "restore-context";
};

export function registerStudioCatalogAdapters(adapters: readonly StudioCatalogConsumerAdapter[]) {
  const registry = new Map<string, StudioCatalogConsumerAdapter>();
  for (const adapter of adapters) {
    if (adapter.contractId !== STUDIO_CATALOG_BROWSER_CONTRACT) throw new Error(`Invalid catalog contract for ${adapter.id}`);
    if (registry.has(adapter.id)) throw new Error(`Duplicate Studio Catalog adapter: ${adapter.id}`);
    const categoryIds = new Set<string>();
    for (const category of adapter.categories) {
      if (categoryIds.has(category.id)) throw new Error(`Duplicate category ${category.id} in ${adapter.id}`);
      categoryIds.add(category.id);
    }
    for (const category of adapter.categories) {
      if (category.parentId && !categoryIds.has(category.parentId)) throw new Error(`Unknown parent ${category.parentId} in ${adapter.id}`);
      studioCatalogCategoryPath(adapter, category.id);
    }
    for (const result of adapter.results) {
      if (!categoryIds.has(result.categoryId)) throw new Error(`Unknown category ${result.categoryId} for result ${result.id}`);
    }
    registry.set(adapter.id, adapter);
  }
  return registry;
}

export function studioCatalogCategoryPath(adapter: StudioCatalogConsumerAdapter, categoryId: string): readonly StudioCatalogCategory[] {
  const byId = new Map(adapter.categories.map((category) => [category.id, category]));
  const path: StudioCatalogCategory[] = [];
  const seen = new Set<string>();
  let current = byId.get(categoryId);
  while (current) {
    if (seen.has(current.id)) throw new Error(`Catalog category cycle at ${current.id}`);
    seen.add(current.id);
    path.unshift(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return path;
}

export type StudioCatalogSearchHit = {
  result: StudioCatalogResult;
  path: readonly StudioCatalogCategory[];
  pathLabel: string;
};

export function searchStudioCatalog(adapter: StudioCatalogConsumerAdapter, query: string): readonly StudioCatalogSearchHit[] {
  const needle = query.trim().toLocaleLowerCase("en-US");
  return adapter.results.flatMap((result) => {
    if (result.readiness !== "ready") return [];
    const path = studioCatalogCategoryPath(adapter, result.categoryId);
    if (path.some((category) => category.readiness === "hidden")) return [];
    const categoryText = path.flatMap((category) => [category.label, ...(category.searchTerms ?? [])]).join(" ");
    if (needle && !`${result.label} ${result.searchText} ${categoryText}`.toLocaleLowerCase("en-US").includes(needle)) return [];
    return [{ result, path, pathLabel: path.map((category) => category.label).join(" / ") }];
  });
}

export function visibleStudioCatalogChildren(adapter: StudioCatalogConsumerAdapter, parentId: string | null) {
  return adapter.categories.filter((category) => category.parentId === parentId && category.readiness === "ready");
}

export function studioCatalogBrowserEvent(name: "open" | "close", adapterId: string) {
  return new CustomEvent("tapconnect:studio-catalog-browser", { detail: { name, adapterId } });
}
