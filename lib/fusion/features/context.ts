/**
 * Server-only feature resolution context — loads Admin registry overrides.
 * Import from `@/lib/fusion/features/server`, not client bundles.
 */

import { listFeatureOverrides, toResolveOverrides } from "./overrides";
import { isFeatureEnabled, type ResolveContext } from "./resolve";

export async function loadFeatureContext(): Promise<ResolveContext> {
  const overrides = toResolveOverrides(await listFeatureOverrides());
  return { overrides };
}

export async function isRegistryFeatureEnabled(featureId: string): Promise<boolean> {
  return isFeatureEnabled(featureId, await loadFeatureContext());
}
