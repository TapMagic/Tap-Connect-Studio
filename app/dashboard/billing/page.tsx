import { requireBusiness } from "@/lib/auth";
import { evaluateBillingReadiness } from "@/lib/fusion/billing";
import { BillingDashboard } from "@/components/fusion/billing/billing-dashboard";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const { business } = await requireBusiness();
  const readiness = evaluateBillingReadiness();

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-bold">Billing</h1>
        <p className="text-muted-foreground">
          Stripe-ready billing domain — plans, entitlements, and usage ledger contracts. Checkout
          stays disabled until Platform Admin enables billing.stripe and supplies keys.
        </p>
      </div>

      <BillingDashboard
        tier={business.subscriptionTier}
        billingStatus={business.billingStatus}
        stripeCustomerId={business.stripeCustomerId}
        readiness={readiness}
      />
    </div>
  );
}
