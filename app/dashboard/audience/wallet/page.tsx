import Link from "next/link";
import { requireBusiness } from "@/lib/auth";
import { FeatureDisabledState } from "@/components/fusion/features/feature-disabled-state";
import { WalletPassManager } from "@/components/fusion/wallet/wallet-pass-manager";
import { loadFeatureContext } from "@/lib/fusion/features/server";
import { isFeatureEnabled } from "@/lib/fusion/features/resolve";
import { listPassesForBusiness, listWalletCredentialBlockers } from "@/lib/fusion/wallet";

export const dynamic = "force-dynamic";

export default async function AudienceWalletPage() {
  const { business } = await requireBusiness();
  const featureCtx = await loadFeatureContext();
  const featureEnabled = isFeatureEnabled("wallet.apple_google", featureCtx);
  const blockers = listWalletCredentialBlockers();

  let passes: Awaited<ReturnType<typeof listPassesForBusiness>> = [];
  if (featureEnabled) {
    try {
      passes = await listPassesForBusiness(business.id);
    } catch {
      passes = [];
    }
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">
            <Link href="/dashboard/audience" className="hover:text-primary hover:underline">
              Audience
            </Link>{" "}
            / Wallet
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Wallet passes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Draft → preview → issue → update → revoke / replace. Mock adapter is functional without
            Apple/Google credentials.
          </p>
        </div>
      </div>

      {!featureEnabled ? (
        <FeatureDisabledState
          featureId="wallet.apple_google"
          title="Wallet passes are disabled"
          description="Apple / Google Wallet projection is off for this environment. Enable wallet.apple_google in Platform Admin when you are ready to issue passes."
          alternateHref="/dashboard/audience"
          alternateLabel="Back to Audience →"
        />
      ) : (
        <WalletPassManager
          initialPasses={passes}
          featureEnabled={featureEnabled}
          credentialBlockers={blockers}
        />
      )}
    </div>
  );
}
