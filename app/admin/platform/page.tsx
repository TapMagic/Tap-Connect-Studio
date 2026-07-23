import { requirePlatformAdmin } from "@/lib/auth";
import { FEATURE_DEFINITIONS } from "@/lib/fusion/features";
import { listFeatureOverrides, toResolveOverrides } from "@/lib/fusion/features/overrides";
import { isFeatureEnabled } from "@/lib/fusion/features/resolve";
import {
  emptyExecutiveKpis,
  fetchDeviceFleetSummary,
  fetchExecutiveKpis,
} from "@/lib/fusion/admin/dashboard-metrics";
import { fetchPlatformFailureRecovery } from "@/lib/fusion/insights/failure-recovery";
import { CONNECTOR_DEFINITIONS, connectorReady } from "@/lib/fusion/connectors/registry";
import { evaluateBillingReadiness } from "@/lib/fusion/billing";
import { evaluateCommerceStripeReadiness } from "@/lib/fusion/commerce";
import { listMessagingReadiness } from "@/lib/fusion/comms/providers";
import { listEmailProviderReadiness } from "@/lib/fusion/comms/email-readiness";
import { listWalletCredentialBlockers } from "@/lib/fusion/wallet";
import { PlatformAdminTabs } from "@/components/fusion/admin/platform-admin-tabs";
import Link from "next/link";
import type { DeviceStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function PlatformAdminPage() {
  await requirePlatformAdmin();
  const overrides = await listFeatureOverrides();
  const resolveOverrides = toResolveOverrides(overrides);
  const ctx = { overrides: resolveOverrides, internalOperator: true };

  const [kpis, fleet, failureRecovery] = await Promise.all([
    fetchExecutiveKpis().catch((err) =>
      emptyExecutiveKpis(err instanceof Error ? err.message : "KPI fetch failed")
    ),
    fetchDeviceFleetSummary().catch((err) => ({
      total: 0,
      byStatus: {} as Record<DeviceStatus, number>,
      unassigned: 0,
      active: 0,
      inactive: 0,
      archived: 0,
      lost: 0,
      topTypes: [] as { deviceType: string; count: number }[],
      dbConfigured: false,
      error: err instanceof Error ? err.message : "Fleet fetch failed",
    })),
    fetchPlatformFailureRecovery().catch(() => null),
  ]);

  const ga = FEATURE_DEFINITIONS.filter((f) => f.maturity === "ga").length;
  const gated = FEATURE_DEFINITIONS.filter((f) => !f.defaultEnabled).length;
  const billingReadiness = evaluateBillingReadiness(ctx);
  const commerceReadiness = evaluateCommerceStripeReadiness(ctx);
  const walletBlockers = listWalletCredentialBlockers();
  const email = listEmailProviderReadiness();

  const connectorRows = CONNECTOR_DEFINITIONS.map((c) => ({
    id: c.id,
    name: c.name,
    category: c.category,
    ready: connectorReady(c.id),
    missing: c.requiredEnvVars.filter((k) => !process.env[k]?.trim()),
  }));

  const messagingRows = listMessagingReadiness().map((p) => ({
    id: p.id,
    name: p.name,
    ready: p.ready,
    missingEnvVars: p.missingEnvVars,
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Tap Connect Platform Admin
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Control plane</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Build the capability → validate readiness → activate through Admin.{" "}
            {FEATURE_DEFINITIONS.length} registered features · {ga} GA · {gated} default-off ·{" "}
            {overrides.length} persisted overrides.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link
            href="/admin/platform/outbox"
            className="text-primary underline-offset-4 hover:underline"
          >
            Outbox / dead letters
          </Link>
          <Link
            href="/admin/platform/audit"
            className="text-primary underline-offset-4 hover:underline"
          >
            Audit / permissions
          </Link>
          <Link
            href="/admin"
            className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            ← Landing CMS admin
          </Link>
        </div>
      </div>

      <PlatformAdminTabs
        kpis={kpis}
        fleet={fleet}
        failureRecovery={failureRecovery}
        initialOverrides={resolveOverrides}
        connectorRows={connectorRows}
        messagingRows={messagingRows}
        billingReadiness={billingReadiness}
        commerceReadiness={commerceReadiness}
        walletBlockers={walletBlockers}
        emailReadiness={{
          ready: email.ready,
          mockAvailable: email.mockAvailable,
          missingEnvVars: email.missingEnvVars,
          mode: email.ready ? "live" : "mock",
        }}
        autopilotEnabled={isFeatureEnabled("ai.autopilot", ctx)}
      />
    </div>
  );
}
