import Link from "next/link";
import { requireBusiness } from "@/lib/auth";
import { listFeatureOverrides, toResolveOverrides } from "@/lib/fusion/features/overrides";
import { isFeatureEnabled } from "@/lib/fusion/features/resolve";
import { listOrders, seedDemoCatalog } from "@/lib/fusion/commerce";
import { CommerceOrdersPanel } from "@/components/fusion/commerce/orders-list";

export const dynamic = "force-dynamic";

export default async function CommerceOrdersPage() {
  const { business } = await requireBusiness();
  const overrides = toResolveOverrides(await listFeatureOverrides());
  const featureEnabled = isFeatureEnabled("commerce.tapcommerce", { overrides });

  if (featureEnabled) {
    seedDemoCatalog(business.id);
  }
  const orders = listOrders(business.id);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">TapCommerce</p>
        <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Functional mock — draft orders, line items, totals, and provider-hosted mock checkout.
          Raw card data is refused. Live Stripe commerce remains credential-gated.{" "}
          <Link
            href="/dashboard/experiences"
            className="text-primary underline-offset-4 hover:underline"
          >
            Experiences
          </Link>
        </p>
      </div>

      <CommerceOrdersPanel
        businessId={business.id}
        featureEnabled={featureEnabled}
        initialOrders={orders}
      />
    </div>
  );
}
