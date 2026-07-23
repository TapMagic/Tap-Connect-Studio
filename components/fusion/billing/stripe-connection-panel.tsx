"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { BillingReadiness } from "@/lib/fusion/billing";
import { STRIPE_WEBHOOK_EVENT_MAP } from "@/lib/fusion/billing";
import type { CommerceStripeReadiness } from "@/lib/fusion/commerce";

export function StripeConnectionPanel({
  readiness,
  commerceReadiness,
}: {
  readiness: BillingReadiness;
  commerceReadiness?: CommerceStripeReadiness;
}) {
  return (
    <div className="space-y-4">
      <Card className="border-border/60 bg-card/40">
        <CardHeader>
          <CardTitle>Stripe connection</CardTitle>
          <CardDescription>
            Admin readiness — secrets stay in env; never store raw card data in Tap Connect.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={readiness.stripeConfigured ? "default" : "outline"}
              className={readiness.stripeConfigured ? "bg-primary" : ""}
            >
              Secret + publishable keys
            </Badge>
            <Badge variant={readiness.webhookConfigured ? "default" : "outline"}>
              Webhook secret
            </Badge>
            <Badge variant={readiness.featureEnabled ? "default" : "outline"}>
              Billing feature {readiness.featureEnabled ? "enabled" : "disabled"}
            </Badge>
          </div>
          <p className="text-sm">
            State: <span className="font-medium text-primary">{readiness.state}</span>
          </p>
          {readiness.missingEnvVars.length > 0 ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
              <p className="text-xs font-medium text-amber-200/90">Missing environment variables</p>
              <ul className="mt-2 font-mono text-xs text-muted-foreground">
                {readiness.missingEnvVars.map((v) => (
                  <li key={v}>{v}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-primary">
              All Stripe env vars present — ready for certification.
            </p>
          )}
          <div className="space-y-2 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Webhook handlers (boundary map)</p>
            {Object.entries(STRIPE_WEBHOOK_EVENT_MAP).map(([event, meta]) => (
              <p key={event}>
                <span className="font-mono text-primary">{event}</span> → {meta.action}
              </p>
            ))}
          </div>
        </CardContent>
      </Card>

      {commerceReadiness ? (
        <Card className="border-border/60 bg-card/40">
          <CardHeader>
            <CardTitle>TapCommerce · Stripe readiness</CardTitle>
            <CardDescription>
              Order drafts and mock checkout work without live keys. Live Checkout requires the same
              Stripe env vars — still no PAN/CVC stored locally.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge
                variant={commerceReadiness.featureEnabled ? "default" : "outline"}
                className={commerceReadiness.featureEnabled ? "bg-primary" : ""}
              >
                commerce.tapcommerce {commerceReadiness.featureEnabled ? "on" : "off"}
              </Badge>
              <Badge variant="outline">
                Mock checkout {commerceReadiness.mockCheckoutAvailable ? "available" : "n/a"}
              </Badge>
              <Badge
                variant={commerceReadiness.stripeConfigured ? "default" : "outline"}
                className={commerceReadiness.stripeConfigured ? "bg-primary" : ""}
              >
                Keys {commerceReadiness.stripeConfigured ? "present" : "missing"}
              </Badge>
            </div>
            <p className="text-sm">
              Commerce state:{" "}
              <span className="font-medium text-primary">{commerceReadiness.state}</span>
            </p>
            {commerceReadiness.missingEnvVars.length > 0 ? (
              <p className="font-mono text-xs text-muted-foreground">
                Live blockers: {commerceReadiness.missingEnvVars.join(", ")}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
