import { isFeatureEnabled, isFeatureExecutable } from "@/lib/fusion/features/resolve";
import type { BillingReadiness } from "./types";
import { getStripeConnectorConfig, isStripeConfigured, isStripeWebhookReady } from "./stripe-connector";

const REQUIRED = [
  "STRIPE_SECRET_KEY",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "STRIPE_WEBHOOK_SECRET",
] as const;

export function evaluateBillingReadiness(ctx?: {
  overrides?: import("@/lib/fusion/features/resolve").FeatureOverride[];
}): BillingReadiness {
  const config = getStripeConnectorConfig();
  const missingEnvVars = REQUIRED.filter((k) => !process.env[k]?.trim());

  let state: BillingReadiness["state"] = "disconnected";
  if (isStripeConfigured() && isStripeWebhookReady()) {
    state = "ready_live";
  } else if (isStripeConfigured()) {
    state = "credentials_partial";
  } else if (missingEnvVars.length === REQUIRED.length) {
    state = "disconnected";
  } else {
    state = "credentials_partial";
  }

  if (state === "disconnected" || state === "credentials_partial") {
    state = "ready_mock";
  }

  return {
    state,
    stripeConfigured: isStripeConfigured(),
    webhookConfigured: isStripeWebhookReady(),
    publishableConfigured: Boolean(config.publishableKey),
    missingEnvVars: [...missingEnvVars],
    featureEnabled: isFeatureEnabled("billing.stripe", ctx),
    featureExecutable: isFeatureExecutable("billing.stripe", ctx),
  };
}
