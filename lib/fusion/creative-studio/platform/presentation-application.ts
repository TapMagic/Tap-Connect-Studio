import type { StudioDiscoveryResource, StudioResourceReference } from "./discovery";
import { evaluateStudioResourceCompatibility, type StudioDiscoveryContext } from "./discovery";

export type StudioPresentationOperation = "apply" | "replace" | "convert";

export type StudioPresentationProvenance = {
  resource: StudioResourceReference;
  sourceAuthority: string;
  sourceProvenance: string;
  brandRelationship: "none" | "compatible" | "derived" | "required";
  generated: boolean;
};

export type StudioPresentationTarget = {
  id: string;
  kind: string;
  familyId?: string;
  capabilities?: readonly string[];
  props: Readonly<Record<string, unknown>>;
};

export type StudioProtectedFieldPolicy = {
  identity: readonly string[];
  content: readonly string[];
  behavior: readonly string[];
  accessibility: readonly string[];
  analytics: readonly string[];
  children: readonly string[];
  brand: readonly string[];
  provenance: readonly string[];
};

export const DEFAULT_STUDIO_PROTECTED_FIELD_POLICY: StudioProtectedFieldPolicy = {
  identity: ["objectId", "resourceRef", "sourceId"],
  content: ["label", "text", "content", "contentComposition"],
  behavior: ["actionType", "href", "destination", "actionId"],
  accessibility: ["accessibleLabel", "accessibleName", "ariaLabel", "alt"],
  analytics: ["trackingName", "trackingId", "analyticsId"],
  children: ["childIds", "children"],
  brand: ["brandId", "brandRole", "brandLinkage"],
  provenance: ["contentProvenance", "behaviorProvenance"],
};

export type StudioPresentationApplication = {
  presentation: Readonly<Record<string, unknown>>;
  supportedOperations: readonly StudioPresentationOperation[];
  destructiveFields?: readonly string[];
};

export type StudioPresentationApplicationResult =
  | { ok: true; operation: Exclude<StudioPresentationOperation, "convert">; props: Record<string, unknown>; provenance: StudioPresentationProvenance }
  | { ok: false; code: "incompatible" | "conflict" | "conversion_required"; conflicts: readonly string[] };

function protectedKeys(policy: StudioProtectedFieldPolicy) {
  return new Set(Object.values(policy).flat());
}

export function studioPresentationProvenance(resource: StudioDiscoveryResource): StudioPresentationProvenance {
  return {
    resource: resource.ref,
    sourceAuthority: resource.source.authority,
    sourceProvenance: resource.source.provenance,
    brandRelationship: resource.brand.relationship,
    generated: Boolean(resource.source.generated),
  };
}

export function applyStudioPresentation(
  input: {
    operation: StudioPresentationOperation;
    target: StudioPresentationTarget;
    resource: StudioDiscoveryResource<StudioPresentationApplication>;
    context: StudioDiscoveryContext;
    policy?: StudioProtectedFieldPolicy;
  }
): StudioPresentationApplicationResult {
  if (input.operation === "convert") {
    return { ok: false, code: "conversion_required", conflicts: ["Conversion requires an explicit family conversion contract."] };
  }
  if (!input.resource.application.supportedOperations.includes(input.operation)) {
    return { ok: false, code: "incompatible", conflicts: [`Resource does not support ${input.operation}.`] };
  }
  const compatibility = evaluateStudioResourceCompatibility(input.resource, input.context);
  if (!compatibility.compatible) return { ok: false, code: "incompatible", conflicts: compatibility.reasons };
  const protectedSet = protectedKeys(input.policy ?? DEFAULT_STUDIO_PROTECTED_FIELD_POLICY);
  const destructiveConflicts = (input.resource.application.destructiveFields ?? []).filter((field) => protectedSet.has(field) && Object.hasOwn(input.target.props, field));
  if (destructiveConflicts.length) return { ok: false, code: "conflict", conflicts: destructiveConflicts.map((field) => `Protected field would be destroyed: ${field}`) };

  const props: Record<string, unknown> = { ...input.target.props, ...input.resource.application.presentation };
  for (const key of protectedSet) {
    if (Object.hasOwn(input.target.props, key)) props[key] = input.target.props[key];
    else delete props[key];
  }
  const provenance = studioPresentationProvenance(input.resource);
  props.presentationProvenance = provenance;
  return { ok: true, operation: input.operation, props, provenance };
}
