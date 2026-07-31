export type EntitlementLayer = {
  source: string;
  enabled?: boolean | null;
  allowance?: number | null;
  startsAt?: Date | string | null;
  expiresAt?: Date | string | null;
};

export type EffectiveEntitlement = {
  enabled: boolean;
  allowance: number | null;
  explanation: string[];
};

function layerActive(layer: EntitlementLayer, now: Date): boolean {
  return (
    (!layer.startsAt || new Date(layer.startsAt) <= now) &&
    (!layer.expiresAt || new Date(layer.expiresAt) > now)
  );
}

export function calculateEffectiveEntitlement(input: {
  plan?: EntitlementLayer | null;
  addOns?: EntitlementLayer[];
  overrides?: EntitlementLayer[];
  restrictions?: EntitlementLayer[];
  now?: Date;
}): EffectiveEntitlement {
  const now = input.now ?? new Date();
  const positive = [input.plan, ...(input.addOns ?? []), ...(input.overrides ?? [])]
    .filter((layer): layer is EntitlementLayer => Boolean(layer))
    .filter((layer) => layerActive(layer, now));
  const restrictions = (input.restrictions ?? []).filter((layer) =>
    layerActive(layer, now),
  );
  let enabled = positive.some((layer) => layer.enabled === true);
  let allowance: number | null = null;
  for (const layer of positive) {
    if (layer.allowance !== null && layer.allowance !== undefined) {
      allowance = Math.max(allowance ?? 0, layer.allowance);
    }
  }
  const explanation = positive.map(
    (layer) =>
      `${layer.source}: ${layer.enabled === false ? "removed" : "granted"}${
        layer.allowance == null ? "" : ` (${layer.allowance})`
      }`,
  );
  for (const restriction of restrictions) {
    enabled = false;
    if (restriction.allowance !== null && restriction.allowance !== undefined) {
      allowance = Math.min(allowance ?? restriction.allowance, restriction.allowance);
    }
    explanation.push(`${restriction.source}: restriction blocks final access`);
  }
  if (positive.length === 0) explanation.push("No plan, add-on, or override grants access.");
  return { enabled, allowance, explanation };
}

