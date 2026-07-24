/**
 * Provider / connector health KPIs for Insights provider view.
 * Counts come from connector registry + env readiness — labeled honestly.
 */

import { CONNECTOR_DEFINITIONS, connectorReady } from "@/lib/fusion/connectors/registry";
import { listEmailProviderReadiness } from "@/lib/fusion/comms/email-readiness";
import type { InsightKpi } from "./types";

export function buildProviderInsightKpis(): InsightKpi[] {
  const catalog = CONNECTOR_DEFINITIONS.length;
  let liveReady = 0;
  let mockOnly = 0;
  for (const c of CONNECTOR_DEFINITIONS) {
    if (connectorReady(c.id)) liveReady += 1;
    else if (c.supportsMock !== false) mockOnly += 1;
  }
  const email = listEmailProviderReadiness();

  return [
    {
      key: "providers_catalog",
      label: "Providers in catalog",
      value: catalog,
      evidenceClass: "confirmed",
      source: "CONNECTOR_DEFINITIONS",
      seeded: false,
      drillThroughHref: "/dashboard/integrations",
    },
    {
      key: "providers_live_ready",
      label: "Live credentials ready",
      value: liveReady,
      evidenceClass: liveReady > 0 ? "derived" : "incomplete",
      source: "connectorReady(env)",
      seeded: false,
      drillThroughHref: "/dashboard/integrations",
    },
    {
      key: "providers_mock_only",
      label: "Mock-capable (no live)",
      value: mockOnly,
      evidenceClass: "derived",
      source: "connectorReady + supportsMock",
      seeded: false,
      drillThroughHref: "/dashboard/integrations",
    },
    {
      key: "email_ready",
      label: "Email live ready",
      value: email.ready ? 1 : 0,
      evidenceClass: email.ready ? "confirmed" : "incomplete",
      source: email.ready
        ? "RESEND_* configured"
        : `Missing: ${email.missingEnvVars.join(",") || "RESEND_*"}`,
      seeded: false,
      drillThroughHref: "/dashboard/integrations",
    },
  ];
}
