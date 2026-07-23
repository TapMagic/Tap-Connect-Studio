/**
 * Dependency-aware feature resolution.
 * A toggle may activate a ready feature — never unfinished plumbing.
 */

import {
  FEATURE_DEFINITIONS,
  type FeatureDefinition,
  type FeatureReadiness,
} from "./registry";

export type FeatureOverride = {
  featureId: string;
  enabled: boolean;
  scope: string;
  reason?: string;
  actor?: string;
  updatedAt?: string;
};

export type ResolveContext = {
  env?: Record<string, string | undefined>;
  plan?: string;
  overrides?: FeatureOverride[];
  /** When true, allow internal_only features for platform staff */
  internalOperator?: boolean;
};

function envHas(env: Record<string, string | undefined> | undefined, key: string) {
  const fromArg = env?.[key]?.trim();
  if (fromArg) return true;
  return Boolean(process.env[key]?.trim());
}

export function evaluateReadiness(
  feature: FeatureDefinition,
  ctx: ResolveContext = {}
): { readiness: FeatureReadiness; blockers: string[] } {
  const blockers: string[] = [];

  for (const dep of feature.dependencies) {
    const parent = FEATURE_DEFINITIONS.find((f) => f.id === dep);
    if (!parent) {
      blockers.push(`Missing dependency definition: ${dep}`);
      continue;
    }
    if (!isFeatureEnabled(dep, ctx)) blockers.push(`Dependency disabled: ${dep}`);
  }

  for (const key of feature.requiredEnvVars) {
    if (!envHas(ctx.env, key)) blockers.push(`Missing env: ${key}`);
  }

  for (const provider of feature.requiredProviders) {
    if (provider === "stripe" && !envHas(ctx.env, "STRIPE_SECRET_KEY")) {
      blockers.push("Provider disconnected: stripe");
    } else if (provider === "resend" && !envHas(ctx.env, "RESEND_API_KEY")) {
      blockers.push("Credentials missing: resend");
    } else if (provider === "openai" && !envHas(ctx.env, "OPENAI_API_KEY")) {
      blockers.push("Credentials missing: openai");
    } else if (
      ["apple_wallet", "google_wallet", "meta", "telegram", "monday"].includes(provider)
    ) {
      const ready = feature.requiredEnvVars.some((k) => envHas(ctx.env, k));
      if (!ready) blockers.push(`Certification pending: ${provider}`);
    }
  }

  if (feature.requiredPlan?.length && ctx.plan) {
    if (!feature.requiredPlan.includes(ctx.plan)) {
      blockers.push(`Plan blocked: need ${feature.requiredPlan.join("|")}`);
    }
  }

  if (feature.maturity === "retired" || feature.maturity === "deprecated") {
    return { readiness: "security_blocked", blockers: ["Feature retired/deprecated"] };
  }

  if (blockers.some((b) => b.startsWith("Missing env") || b.startsWith("Credentials"))) {
    return { readiness: "credentials_missing", blockers };
  }
  if (blockers.some((b) => b.startsWith("Provider") || b.startsWith("Certification"))) {
    return { readiness: "certification_pending", blockers };
  }
  if (blockers.some((b) => b.startsWith("Plan"))) {
    return { readiness: "plan_blocked", blockers };
  }
  if (blockers.some((b) => b.startsWith("Dependency") || b.startsWith("Missing dependency"))) {
    return { readiness: "missing_dependency", blockers };
  }

  if (
    feature.implementation === "specified" ||
    feature.implementation === "scaffolded"
  ) {
    return {
      readiness: blockers.length ? "ready_with_warning" : "ready_with_warning",
      blockers: blockers.length
        ? blockers
        : ["Implementation not production_ready — safe for internal/preview only"],
    };
  }

  if (blockers.length) return { readiness: "ready_with_warning", blockers };
  return { readiness: "ready", blockers: [] };
}

/** Admin / registry "on" switch (ignores credential executability). */
export function isFeatureEnabled(featureId: string, ctx: ResolveContext = {}): boolean {
  const feature = FEATURE_DEFINITIONS.find((f) => f.id === featureId);
  if (!feature) return false;
  if (feature.maturity === "retired") return false;

  const override = ctx.overrides?.find((o) => o.featureId === featureId);
  const enabled = override ? override.enabled : feature.defaultEnabled;
  if (!enabled) return false;

  if (feature.maturity === "internal_only" && !ctx.internalOperator) return false;
  return true;
}

/** Host-visible runtime: enabled AND not hard-blocked by credentials/security/deps/plan. */
export function isFeatureExecutable(featureId: string, ctx: ResolveContext = {}): boolean {
  if (!isFeatureEnabled(featureId, ctx)) return false;
  const feature = FEATURE_DEFINITIONS.find((f) => f.id === featureId);
  if (!feature) return false;
  const { readiness } = evaluateReadiness(feature, ctx);
  return (
    readiness === "ready" ||
    readiness === "ready_with_warning" ||
    readiness === "temporarily_degraded"
  );
}

export function listRegistryStatus(ctx: ResolveContext = {}) {
  return FEATURE_DEFINITIONS.map((feature) => {
    const { readiness, blockers } = evaluateReadiness(feature, ctx);
    return {
      id: feature.id,
      name: feature.name,
      pillar: feature.pillar,
      maturity: feature.maturity,
      implementation: feature.implementation,
      defaultEnabled: feature.defaultEnabled,
      enabled: isFeatureEnabled(feature.id, ctx),
      executable: isFeatureExecutable(feature.id, ctx),
      readiness,
      blockers,
    };
  });
}
