"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PLANS } from "@/lib/plans";
import type { BillingReadiness } from "@/lib/fusion/billing";
import { listSupportedWebhookEvents, STRIPE_WEBHOOK_EVENT_MAP } from "@/lib/fusion/billing";
import { getPlanByTier } from "@/lib/plans";
import type { PlanTier, SubscriptionStatus } from "@prisma/client";

const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  ACTIVE: "Active",
  TRIALING: "Trialing",
  PAST_DUE: "Past due",
  CANCELED: "Canceled",
  INCOMPLETE: "Incomplete",
};

export function BillingDashboard({
  tier,
  billingStatus,
  stripeCustomerId,
  readiness,
}: {
  tier: PlanTier;
  billingStatus: SubscriptionStatus;
  stripeCustomerId: string | null;
  readiness: BillingReadiness;
}) {
  const current = getPlanByTier(tier);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border/60 bg-card/40 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Badge
            variant={readiness.stripeConfigured ? "default" : "outline"}
            className={readiness.stripeConfigured ? "bg-primary" : ""}
          >
            Stripe {readiness.stripeConfigured ? "configured" : "mock mode"}
          </Badge>
          <Badge variant="outline">{STATUS_LABEL[billingStatus]}</Badge>
          {stripeCustomerId ? (
            <span className="font-mono text-xs text-muted-foreground">
              cus …{stripeCustomerId.slice(-8)}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">No Stripe customer linked</span>
          )}
        </div>
        {!readiness.featureExecutable && (
          <p className="mt-3 text-sm text-amber-400/90">
            billing.stripe is disabled or missing credentials — plans shown for reference; checkout
            uses mock boundary until Platform Admin enables Stripe.
          </p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {PLANS.map((plan) => {
          const isCurrent = plan.tier === tier;
          return (
            <Card
              key={plan.tier}
              className={
                isCurrent
                  ? "border-primary/50 bg-primary/5 shadow-[0_0_24px_rgba(34,197,94,0.12)]"
                  : "border-border/60"
              }
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  {plan.name}
                  {isCurrent ? (
                    <Badge className="bg-primary text-primary-foreground">Current</Badge>
                  ) : null}
                </CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  ${plan.priceMonthly}
                  <span className="text-sm font-normal text-muted-foreground">/mo</span>
                </p>
                <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
                  {plan.features.slice(0, 5).map((f) => (
                    <li key={f}>• {f}</li>
                  ))}
                </ul>
                <p className="mt-4 text-xs text-muted-foreground">
                  {readiness.stripeConfigured
                    ? "Upgrade via Stripe Checkout when billing.stripe is enabled"
                    : "Mock checkout — add STRIPE_* keys to go live"}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-border/60 bg-card/30">
        <CardHeader>
          <CardTitle>Entitlements ({current.name})</CardTitle>
          <CardDescription>PlanVersion v1 — no card data stored in Tap Connect</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg bg-muted/30 px-3 py-2 text-sm">
            <p className="text-muted-foreground">Active devices</p>
            <p className="font-semibold">{current.activeDeviceLimit}</p>
          </div>
          <div className="rounded-lg bg-muted/30 px-3 py-2 text-sm">
            <p className="text-muted-foreground">Active campaigns</p>
            <p className="font-semibold">{current.activeCampaignLimit}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/30">
        <CardHeader>
          <CardTitle>Stripe webhook event map</CardTitle>
          <CardDescription>{listSupportedWebhookEvents().length} handled event types</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {Object.entries(STRIPE_WEBHOOK_EVENT_MAP)
            .slice(0, 5)
            .map(([event, meta]) => (
              <div key={event} className="rounded-lg bg-muted/20 px-3 py-2">
                <p className="font-mono text-xs text-primary">{event}</p>
                <p className="text-muted-foreground">{meta.description}</p>
              </div>
            ))}
        </CardContent>
      </Card>
    </div>
  );
}
