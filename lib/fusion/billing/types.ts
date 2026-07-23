/**
 * Provider-neutral billing domain — no raw card data stored locally.
 */

import type { PlanTier } from "@prisma/client";

export type PlanVersion = {
  id: string;
  tier: PlanTier;
  version: number;
  name: string;
  priceMonthlyCents: number;
  stripePriceId?: string;
  entitlements: Entitlement[];
  effectiveFrom: string;
  effectiveTo?: string;
};

export type Entitlement = {
  key: string;
  label: string;
  limit?: number;
  unlimited?: boolean;
  metered?: boolean;
};

export type UsageLedgerEntry = {
  id: string;
  businessId: string;
  meterKey: string;
  quantity: number;
  periodStart: string;
  periodEnd: string;
  source: "stripe" | "internal" | "manual";
  metadata?: Record<string, unknown>;
  recordedAt: string;
};

export type BillingConnectionState =
  | "disconnected"
  | "credentials_partial"
  | "ready_mock"
  | "ready_live";

export type BillingReadiness = {
  state: BillingConnectionState;
  stripeConfigured: boolean;
  webhookConfigured: boolean;
  publishableConfigured: boolean;
  missingEnvVars: string[];
  featureEnabled: boolean;
  featureExecutable: boolean;
};
