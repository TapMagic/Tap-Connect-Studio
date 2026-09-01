export type StudioDiscoveryMode = "browse" | "recent" | "recommended" | "search";

export type StudioResourceReference = {
  provider: string;
  resourceId: string;
  version?: string | number;
  canonicalResourceId?: string;
};

export type StudioResourceCompatibility = {
  targetKinds?: readonly string[];
  requiredCapabilities?: readonly string[];
  prohibitedTargetKinds?: readonly string[];
  brandRelationships?: readonly ("none" | "compatible" | "derived" | "required")[];
  familyIds?: readonly string[];
};

export type StudioDiscoveryContext = {
  authoringJob: string;
  target: {
    kind: string;
    capabilities?: readonly string[];
    familyId?: string;
  };
  resourceKinds?: readonly string[];
  userId?: string;
  businessId?: string;
  brandRelationship?: "none" | "compatible" | "derived" | "required";
  entitlementKeys?: readonly string[];
  readiness?: readonly ("ready" | "preview" | "disabled" | "hidden")[];
  approval?: readonly ("approved" | "draft" | "rejected" | "not_required")[];
  query?: string;
  category?: string;
  filters?: Readonly<Record<string, readonly string[]>>;
  scope?: string;
  cursor?: string;
  limit?: number;
  mode?: StudioDiscoveryMode;
};

export type StudioDiscoveryResource<TApplication = unknown, TPreview = unknown> = {
  ref: StudioResourceReference;
  kind: string;
  label: string;
  description?: string;
  preview: { authority: string; payload: TPreview };
  taxonomy: { category: string; collections?: readonly string[]; tags?: readonly string[] };
  compatibility: StudioResourceCompatibility;
  source: { authority: string; provenance: string; generated?: boolean };
  brand: { relationship: "none" | "compatible" | "derived" | "required"; brandId?: string };
  governance: {
    readiness: "ready" | "preview" | "disabled" | "hidden";
    approval: "approved" | "draft" | "rejected" | "not_required";
    entitlementKeys?: readonly string[];
    available: boolean;
  };
  activity?: { lastUsedAt?: string; useCount?: number; favorite?: boolean };
  search: { text: string; keywords?: readonly string[] };
  application: TApplication;
  consumerCompatibility?: Readonly<Record<string, unknown>>;
};

export type StudioDiscoveryResult<TApplication = unknown, TPreview = unknown> = {
  resources: readonly StudioDiscoveryResource<TApplication, TPreview>[];
  nextCursor?: string;
  total?: number;
};

export type StudioResourceCompatibilityResult =
  | { compatible: true }
  | { compatible: false; reasons: readonly string[] };

export function evaluateStudioResourceCompatibility(
  resource: StudioDiscoveryResource,
  context: StudioDiscoveryContext
): StudioResourceCompatibilityResult {
  const reasons: string[] = [];
  const rule = resource.compatibility;
  const targetCapabilities = new Set(context.target.capabilities ?? []);
  if (rule.targetKinds?.length && !rule.targetKinds.includes(context.target.kind)) reasons.push(`Requires target kind: ${rule.targetKinds.join(", ")}`);
  if (rule.prohibitedTargetKinds?.includes(context.target.kind)) reasons.push(`Prohibited for target kind: ${context.target.kind}`);
  for (const capability of rule.requiredCapabilities ?? []) {
    if (!targetCapabilities.has(capability)) reasons.push(`Target lacks capability: ${capability}`);
  }
  if (rule.familyIds?.length && (!context.target.familyId || !rule.familyIds.includes(context.target.familyId))) reasons.push(`Requires compatible family: ${rule.familyIds.join(", ")}`);
  if (rule.brandRelationships?.length && !rule.brandRelationships.includes(context.brandRelationship ?? "none")) reasons.push("Brand relationship is incompatible");
  const entitlements = new Set(context.entitlementKeys ?? []);
  for (const key of resource.governance.entitlementKeys ?? []) {
    if (!entitlements.has(key)) reasons.push(`Missing entitlement: ${key}`);
  }
  if (!resource.governance.available) reasons.push("Resource is unavailable");
  return reasons.length ? { compatible: false, reasons } : { compatible: true };
}

export function filterStudioDiscoveryResources<TApplication, TPreview>(
  resources: readonly StudioDiscoveryResource<TApplication, TPreview>[],
  context: StudioDiscoveryContext
): StudioDiscoveryResult<TApplication, TPreview> {
  const query = context.query?.trim().toLocaleLowerCase("en-US") ?? "";
  const readiness = new Set(context.readiness ?? ["ready"]);
  const approval = new Set(context.approval ?? ["approved", "not_required"]);
  const kinds = context.resourceKinds ? new Set(context.resourceKinds) : null;
  const filtered = resources.filter((resource) => {
    if (resource.governance.readiness === "hidden" || !readiness.has(resource.governance.readiness)) return false;
    if (!approval.has(resource.governance.approval)) return false;
    if (kinds && !kinds.has(resource.kind)) return false;
    if (context.category && resource.taxonomy.category !== context.category) return false;
    if (!evaluateStudioResourceCompatibility(resource, context).compatible) return false;
    if (query && !resource.search.text.toLocaleLowerCase("en-US").includes(query)) return false;
    return true;
  });
  const offset = context.cursor ? Math.max(0, Number.parseInt(context.cursor, 10) || 0) : 0;
  const limit = Math.max(1, Math.min(100, context.limit ?? 40));
  const page = filtered.slice(offset, offset + limit);
  return { resources: page, total: filtered.length, nextCursor: offset + limit < filtered.length ? String(offset + limit) : undefined };
}
