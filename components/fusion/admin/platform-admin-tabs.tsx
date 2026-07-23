"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Bot,
  CreditCard,
  LayoutDashboard,
  MessageSquare,
  Plug,
  Radio,
  Shield,
  Sliders,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { BillingReadiness } from "@/lib/fusion/billing";
import type { CommerceStripeReadiness } from "@/lib/fusion/commerce";
import type { ExecutiveKpis, DeviceFleetSummary } from "@/lib/fusion/admin/dashboard-metrics";
import type { FailureRecoverySnapshot } from "@/lib/fusion/insights/failure-recovery";
import type { FeatureOverride } from "@/lib/fusion/features";
import { FeatureRegistryPanel } from "@/components/fusion/admin/feature-registry-panel";
import { StripeConnectionPanel } from "@/components/fusion/billing/stripe-connection-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type TabId =
  | "kpis"
  | "fleet"
  | "features"
  | "integrations"
  | "billing"
  | "autopilot"
  | "comms"
  | "wallet";

const TABS: { id: TabId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "kpis", label: "Executive KPIs", icon: LayoutDashboard },
  { id: "fleet", label: "Device fleet", icon: Radio },
  { id: "features", label: "Feature registry", icon: Sliders },
  { id: "integrations", label: "Connectors", icon: Plug },
  { id: "billing", label: "Billing readiness", icon: CreditCard },
  { id: "autopilot", label: "Automation Team", icon: Bot },
  { id: "comms", label: "Channel Guardian", icon: MessageSquare },
  { id: "wallet", label: "Wallet & TapSave", icon: Wallet },
];

function EvidenceBadge({ evidence }: { evidence: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[10px] uppercase",
        evidence === "confirmed" && "border-primary/50 text-primary",
        evidence === "derived" && "text-amber-300",
        evidence === "unavailable" && "text-muted-foreground"
      )}
    >
      {evidence}
    </Badge>
  );
}

function KillSwitchPanel({
  autopilotEnabled,
}: {
  initialOverrides: FeatureOverride[];
  autopilotEnabled: boolean;
}) {
  const [enabled, setEnabled] = useState(autopilotEnabled);
  const [reason, setReason] = useState("Emergency kill switch");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function toggle() {
    if (!reason.trim()) {
      setMessage("Reason required");
      return;
    }
    setPending(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/features", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          featureId: "ai.autopilot",
          enabled: !enabled,
          scope: "global",
          reason: reason.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setMessage(data.error ?? "Failed to update kill switch");
        return;
      }
      setEnabled(!enabled);
      setMessage(
        !enabled
          ? "Automation Team enabled — /api/ai/generate allowed when credentials ready"
          : "Automation Team paused — /api/ai/generate returns feature_disabled (503)"
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="border-border/60 bg-card/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="h-5 w-5 text-primary" />
          AI / Agent kill switch
        </CardTitle>
        <CardDescription>
          Emergency pause for ai.autopilot — blocks POST /api/ai/generate via isFeatureExecutable
          without removing registry entries.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant={enabled ? "default" : "outline"} className={enabled ? "bg-primary" : ""}>
            {enabled ? "Active" : "Paused"}
          </Badge>
          <span className="text-sm text-muted-foreground">
            Feature id: <code className="text-primary">ai.autopilot</code>
          </span>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Audit reason</p>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <Button
          variant={enabled ? "outline" : "default"}
          onClick={toggle}
          disabled={pending}
          className={!enabled ? "bg-primary text-primary-foreground" : ""}
        >
          {pending ? "Updating…" : enabled ? "Pause Automation Team" : "Enable Automation Team"}
        </Button>
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      </CardContent>
    </Card>
  );
}

export function PlatformAdminTabs({
  kpis,
  fleet,
  failureRecovery,
  initialOverrides,
  connectorRows,
  messagingRows,
  billingReadiness,
  commerceReadiness,
  walletBlockers,
  emailReadiness,
  autopilotEnabled,
  children,
}: {
  kpis: ExecutiveKpis;
  fleet: DeviceFleetSummary;
  failureRecovery?: FailureRecoverySnapshot | null;
  initialOverrides: FeatureOverride[];
  connectorRows: {
    id: string;
    name: string;
    category: string;
    ready: boolean;
    missing: string[];
  }[];
  messagingRows: {
    id: string;
    name: string;
    ready: boolean;
    missingEnvVars: string[];
  }[];
  billingReadiness: BillingReadiness;
  commerceReadiness?: CommerceStripeReadiness;
  walletBlockers: { apple: string[]; google: string[] };
  emailReadiness: {
    ready: boolean;
    mockAvailable: boolean;
    missingEnvVars: string[];
    mode: "live" | "mock";
  };
  autopilotEnabled: boolean;
  children?: ReactNode;
}) {
  const [tab, setTab] = useState<TabId>("kpis");

  return (
    <div className="space-y-6">
      <div
        role="tablist"
        aria-label="Platform admin sections"
        className="flex flex-wrap gap-1 rounded-xl border border-border/60 bg-card/40 p-1"
      >
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              id={`admin-tab-${id}`}
              aria-selected={active}
              aria-controls={`admin-panel-${id}`}
              onClick={() => setTab(id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              <span className="hidden sm:inline">{label}</span>
              <span className="sr-only sm:hidden">{label}</span>
            </button>
          );
        })}
      </div>

      {tab === "kpis" && (
        <section
          role="tabpanel"
          id="admin-panel-kpis"
          aria-labelledby="admin-tab-kpis"
          className="space-y-4"
        >
          {kpis.error ? (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
              <p className="font-medium">Database unavailable</p>
              <p className="mt-1 text-amber-100/80">{kpis.error}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Configure isolated fusion DATABASE_URL (tapconnect_fusion_dev) — see
                docs/fusion/LOCAL_DEV_DATABASE.md
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Live Prisma counts · evidence: confirmed = table count · fetched{" "}
              {new Date(kpis.fetchedAt).toLocaleString()}
              {!kpis.dbConfigured ? " · warning: DATABASE_URL may not be isolated fusion DB" : ""}
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(kpis.metrics.length
              ? kpis.metrics
              : [
                  { key: "b", label: "Businesses", value: kpis.businesses, evidence: "unavailable" as const },
                ]
            ).map((m) => (
              <Card key={m.key} className="border-border/60 bg-card/40">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardDescription>{m.label}</CardDescription>
                    <EvidenceBadge evidence={m.evidence} />
                  </div>
                  <CardTitle className="text-2xl tabular-nums">{m.value.toLocaleString()}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  {m.hint ? <p className="text-xs text-muted-foreground">{m.hint}</p> : null}
                  {"href" in m && m.href ? (
                    <Link
                      href={m.href}
                      className="text-xs font-medium text-primary underline-offset-4 hover:underline"
                    >
                      Open list →
                    </Link>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
          {failureRecovery ? (
            <Card className="border-border/60 bg-card/40">
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg">Failure &amp; recovery</CardTitle>
                    <CardDescription>
                      Platform-scoped dead letters and blocked journey runs (memory / outbox).
                    </CardDescription>
                  </div>
                  <Link
                    href="/admin/platform/outbox"
                    className="text-xs font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Outbox console →
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {failureRecovery.empty ? (
                  <p className="text-sm text-muted-foreground">
                    No dead letters or blocked runs in memory — counts below are zero with
                    incomplete evidence until failures occur or isolated DB proof runs.
                  </p>
                ) : null}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {failureRecovery.metrics.map((m) => (
                    <div key={m.key} className="rounded-lg border border-border/60 bg-muted/20 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-muted-foreground">{m.label}</p>
                        <EvidenceBadge evidence={m.evidenceClass} />
                      </div>
                      <p className="text-xl font-semibold tabular-nums">{m.value}</p>
                      {m.hint ? (
                        <p className="mt-1 text-[10px] text-muted-foreground">{m.hint}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Snapshot · {failureRecovery.scope} ·{" "}
                  {new Date(failureRecovery.fetchedAt).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
              <p className="font-medium">Failure recovery snapshot unavailable</p>
              <p className="mt-1 text-amber-100/80">
                Could not load outbox / journey run counts — check fusion DB or memory outbox.
              </p>
            </div>
          )}
        </section>
      )}

      {tab === "fleet" && (
        <section
          role="tabpanel"
          id="admin-panel-fleet"
          aria-labelledby="admin-tab-fleet"
          className="space-y-4"
        >
          {fleet.error ? (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
              {fleet.error}
            </div>
          ) : null}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border-border/60 bg-card/40">
              <CardHeader>
                <CardTitle>Status breakdown</CardTitle>
                <CardDescription>
                  {fleet.total} total device slots ·{" "}
                  <Link href="/admin/platform/devices" className="text-primary hover:underline">
                    full list
                  </Link>
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2 text-sm">
                {(
                  [
                    ["Active", fleet.active],
                    ["Unassigned", fleet.unassigned],
                    ["Inactive", fleet.inactive],
                    ["Archived", fleet.archived],
                    ["Lost", fleet.lost],
                  ] as const
                ).map(([label, count]) => (
                  <div key={label} className="rounded-lg bg-muted/30 px-3 py-2">
                    <p className="text-muted-foreground">{label}</p>
                    <p className="text-lg font-semibold tabular-nums">{count}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="border-border/60 bg-card/40">
              <CardHeader>
                <CardTitle>Top device types</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {fleet.topTypes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No devices yet</p>
                ) : (
                  fleet.topTypes.map((t) => (
                    <div key={t.deviceType} className="flex justify-between text-sm">
                      <span className="font-mono text-xs">{t.deviceType}</span>
                      <span className="tabular-nums font-medium">{t.count}</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {tab === "features" && (
        <section
          role="tabpanel"
          id="admin-panel-features"
          aria-labelledby="admin-tab-features"
          className="rounded-2xl border border-border/60 bg-card/30 p-4 sm:p-6"
        >
          <FeatureRegistryPanel initialOverrides={initialOverrides} internalOperator />
        </section>
      )}

      {tab === "integrations" && (
        <section
          role="tabpanel"
          id="admin-panel-integrations"
          aria-labelledby="admin-tab-integrations"
          className="space-y-4"
        >
          <Card className="border-border/60 bg-card/40">
            <CardHeader>
              <CardTitle>Productivity connectors</CardTitle>
              <CardDescription>From lib/fusion/connectors/registry.ts</CardDescription>
            </CardHeader>
            <CardContent className="divide-y divide-border/40">
              {connectorRows.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
                >
                  <div>
                    <p className="font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.category}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={c.ready ? "default" : "outline"} className={c.ready ? "bg-primary" : ""}>
                      {c.ready ? "Ready" : "Credentials missing"}
                    </Badge>
                    {!c.ready && c.missing.length > 0 ? (
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {c.missing.join(", ")}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      )}

      {tab === "billing" && (
        <section
          role="tabpanel"
          id="admin-panel-billing"
          aria-labelledby="admin-tab-billing"
          className="space-y-4"
        >
          <StripeConnectionPanel
            readiness={billingReadiness}
            commerceReadiness={commerceReadiness}
          />
        </section>
      )}

      {tab === "autopilot" && (
        <section
          role="tabpanel"
          id="admin-panel-autopilot"
          aria-labelledby="admin-tab-autopilot"
          className="space-y-4"
        >
          <KillSwitchPanel initialOverrides={initialOverrides} autopilotEnabled={autopilotEnabled} />
        </section>
      )}

      {tab === "comms" && (
        <section
          role="tabpanel"
          id="admin-panel-comms"
          aria-labelledby="admin-tab-comms"
          className="space-y-4"
        >
          <Card className="border-border/60 bg-card/40">
            <CardHeader>
              <CardTitle>Email provider (Resend)</CardTitle>
              <CardDescription>
                Mock adapter is always available. Live send requires credentials.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <Badge
                  variant={emailReadiness.ready ? "default" : "outline"}
                  className={
                    emailReadiness.ready
                      ? "bg-primary"
                      : "border-primary/40 text-primary"
                  }
                >
                  {emailReadiness.mode === "live"
                    ? "Live ready"
                    : "VERIFIED — CREDENTIALS REQUIRED"}
                </Badge>
                <p className="mt-2 text-xs text-muted-foreground">
                  Mock adapter: {emailReadiness.mockAvailable ? "active" : "unavailable"} · outbound
                  enqueues to outbox + Inbox + contact timeline
                </p>
              </div>
              {!emailReadiness.ready ? (
                <span className="font-mono text-[10px] text-muted-foreground">
                  Missing: {emailReadiness.missingEnvVars.join(", ")}
                </span>
              ) : null}
            </CardContent>
          </Card>
          <Card className="border-border/60 bg-card/40">
            <CardHeader>
              <CardTitle>Channel Guardian — messaging providers</CardTitle>
              <CardDescription>Deterministic eligibility before outbound send</CardDescription>
            </CardHeader>
            <CardContent className="divide-y divide-border/40">
              {messagingRows.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
                >
                  <p className="font-medium">{p.name}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={p.ready ? "default" : "outline"} className={p.ready ? "bg-primary" : ""}>
                      {p.ready ? "Certified ready" : "Pending"}
                    </Badge>
                    {!p.ready ? (
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {p.missingEnvVars.join(", ")}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      )}

      {tab === "wallet" && (
        <section
          role="tabpanel"
          id="admin-panel-wallet"
          aria-labelledby="admin-tab-wallet"
          className="space-y-4"
        >
          <Card className="border-border/60 bg-card/40">
            <CardHeader>
              <CardTitle>Wallet & TapSave credential blockers</CardTitle>
              <CardDescription>
                Mock lifecycle is functional without certs. Live install requires vars below.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="font-medium text-primary">Apple Wallet</p>
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  {walletBlockers.apple.length ? walletBlockers.apple.join(", ") : "All required vars present"}
                </p>
              </div>
              <div>
                <p className="font-medium text-primary">Google Wallet</p>
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  {walletBlockers.google.length
                    ? walletBlockers.google.join(", ")
                    : "All required vars present"}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Studio: /dashboard/audience/wallet · Feature: wallet.apple_google
              </p>
            </CardContent>
          </Card>
        </section>
      )}

      {children}
    </div>
  );
}
