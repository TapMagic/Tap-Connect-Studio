import type { TapConnectCardConfig, TapCardSection } from "@/lib/brand/tap-card";
import type { CreativeCompositionBlock } from "@/lib/fusion/creative-studio/composition";
import {
  SIGNATURE_ASSETS,
  SIGNATURE_FAMILIES,
} from "@/lib/fusion/creative-studio/signature-assets/registry";
import {
  resolveSignatureAccess,
  type SignatureEntitlementKey,
  type SignatureFamilyDefinition,
  type SignatureVersion,
} from "@/lib/fusion/creative-studio/signature-assets/types";

export const SIGNATURE_FAMILY_NOT_PUBLISHABLE =
  "SIGNATURE_FAMILY_NOT_PUBLISHABLE" as const;

export type SignaturePublicationOperation = "card.publish" | "card.rollback";

export type SignaturePublicationFinding = {
  code: typeof SIGNATURE_FAMILY_NOT_PUBLISHABLE;
  severity: "error";
  operation: SignaturePublicationOperation;
  familyId: string;
  familyVersion?: SignatureVersion;
  familyName: string;
  entitlementKey: SignatureEntitlementKey;
  occurrenceCount: number;
  remediation: {
    action: "restore-entitlement-or-remove-content";
    message: string;
  };
};

export type SignaturePublicationValidationResult =
  | { ok: true; findings: readonly []; requiredEntitlementKeys: readonly SignatureEntitlementKey[] }
  | {
      ok: false;
      findings: readonly SignaturePublicationFinding[];
      requiredEntitlementKeys: readonly SignatureEntitlementKey[];
    };

type SignatureFamilyUse = {
  familyId: string;
  familyVersion?: SignatureVersion;
  occurrenceCount: number;
};

function version(value: unknown): SignatureVersion | undefined {
  return typeof value === "string" && /^\d+\.\d+\.\d+$/.test(value)
    ? (value as SignatureVersion)
    : undefined;
}

function familyUseFromProps(props: Record<string, unknown>) {
  let familyId = typeof props.signatureFamilyId === "string" ? props.signatureFamilyId : undefined;
  let familyVersion = version(props.signatureFamilyVersion);
  if (!familyId && typeof props.signatureAssetId === "string") {
    const asset = SIGNATURE_ASSETS.find((candidate) => candidate.id === props.signatureAssetId);
    familyId = asset?.familyId;
    familyVersion = asset?.normalizedContract?.familyVersion;
  }
  return familyId ? { familyId, familyVersion } : null;
}

function visitComposition(
  block: CreativeCompositionBlock | undefined,
  visit: (familyId: string, familyVersion?: SignatureVersion) => void,
  seen: Set<unknown>,
) {
  if (!block || seen.has(block)) return;
  seen.add(block);

  const assemblyInput = block.signatureAssembly?.input;
  if (assemblyInput?.familyId) visit(assemblyInput.familyId, assemblyInput.familyVersion);

  for (const node of block.nodes) {
    const use = familyUseFromProps(node.props);
    if (use) visit(use.familyId, use.familyVersion);
    const nested = node.props.contentComposition;
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      visitComposition(nested as CreativeCompositionBlock, visit, seen);
    }
  }
}

function visitSections(
  sections: readonly TapCardSection[],
  visit: (familyId: string, familyVersion?: SignatureVersion) => void,
  seen: Set<unknown>,
) {
  for (const section of sections) {
    visitComposition(section.composition, visit, seen);
    if (section.children?.length) visitSections(section.children, visit, seen);
  }
}

export function collectPublishedSignatureFamilyUses(
  card: TapConnectCardConfig,
): readonly SignatureFamilyUse[] {
  const uses = new Map<string, SignatureFamilyUse>();
  const visit = (familyId: string, familyVersion?: SignatureVersion) => {
    const key = `${familyId}@${familyVersion ?? "unknown"}`;
    const current = uses.get(key);
    uses.set(key, {
      familyId,
      familyVersion,
      occurrenceCount: (current?.occurrenceCount ?? 0) + 1,
    });
  };
  const seen = new Set<unknown>();
  visitComposition(card.rootComposition, visit, seen);
  visitSections(card.sections, visit, seen);
  return [...uses.values()];
}

export function validateSignaturePublication(
  card: TapConnectCardConfig,
  entitlementKeys: readonly SignatureEntitlementKey[],
  families: readonly SignatureFamilyDefinition[] = SIGNATURE_FAMILIES,
  operation: SignaturePublicationOperation = "card.publish",
): SignaturePublicationValidationResult {
  const entitled = new Set(entitlementKeys);
  const familyUses = collectPublishedSignatureFamilyUses(card);
  const findings = new Map<string, SignaturePublicationFinding>();

  for (const use of familyUses) {
    const family = families.find((candidate) => candidate.id === use.familyId);
    if (!family?.entitlement) continue;
    const access = resolveSignatureAccess(
      family.entitlement,
      entitled.has(family.entitlement.entitlementKey),
    );
    if (access.publishable) continue;
    const existing = findings.get(family.entitlement.entitlementKey);
    findings.set(family.entitlement.entitlementKey, {
      code: SIGNATURE_FAMILY_NOT_PUBLISHABLE,
      severity: "error",
      operation,
      familyId: family.id,
      familyVersion: use.familyVersion ?? family.version,
      familyName: family.label,
      entitlementKey: family.entitlement.entitlementKey,
      occurrenceCount: (existing?.occurrenceCount ?? 0) + use.occurrenceCount,
      remediation: {
        action: "restore-entitlement-or-remove-content",
        message: `Restore access to ${family.label} or remove its restricted Signature content before publishing.`,
      },
    });
  }

  const result = [...findings.values()].sort((a, b) => a.familyName.localeCompare(b.familyName));
  const requiredEntitlementKeys = result.map((finding) => finding.entitlementKey);
  return result.length
    ? { ok: false, findings: result, requiredEntitlementKeys }
    : { ok: true, findings: [], requiredEntitlementKeys: [] };
}
