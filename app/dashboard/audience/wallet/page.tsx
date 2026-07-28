import Link from "next/link";
import { requireBusiness } from "@/lib/auth";
import { FeatureDisabledState } from "@/components/fusion/features/feature-disabled-state";
import { WalletPassManager } from "@/components/fusion/wallet/wallet-pass-manager";
import { WalletMockPassCard } from "@/components/tap/wallet-mock-pass-card";
import { prisma } from "@/lib/db";
import { loadFeatureContext } from "@/lib/fusion/features/server";
import { isFeatureEnabled } from "@/lib/fusion/features/resolve";
import { listPassesForBusiness, listWalletCredentialBlockers } from "@/lib/fusion/wallet";
import { shapeMyTapWalletSummary } from "@/lib/fusion/wallet/tapsave-wire";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ preview?: string; mock_install?: string }>;
};

export default async function AudienceWalletPage({ searchParams }: Props) {
  const { preview, mock_install: mockInstall } = await searchParams;
  const highlightSerial = mockInstall ?? preview ?? null;
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

  const focusedPass = highlightSerial
    ? passes.find((p) => p.serialNumber === highlightSerial) ?? null
    : null;

  const relationshipIds = [
    ...new Set(passes.map((p) => p.relationshipId).filter((id): id is string => Boolean(id))),
  ];
  let myTapTokenByRelationshipId = new Map<string, string>();
  if (relationshipIds.length > 0) {
    try {
      const rows = await prisma.customerRelationship.findMany({
        where: { id: { in: relationshipIds }, businessId: business.id },
        select: { id: true, publicToken: true },
      });
      myTapTokenByRelationshipId = new Map(rows.map((r) => [r.id, r.publicToken]));
    } catch {
      myTapTokenByRelationshipId = new Map();
    }
  }

  const managerPasses = passes.map((p) => ({
    ...p,
    myTapPublicToken: p.relationshipId
      ? (myTapTokenByRelationshipId.get(p.relationshipId) ?? null)
      : null,
  }));

  const focusedPublicToken =
    focusedPass?.relationshipId != null
      ? myTapTokenByRelationshipId.get(focusedPass.relationshipId) ?? null
      : null;
  const focusedSummary =
    focusedPass && focusedPublicToken
      ? shapeMyTapWalletSummary(focusedPass, focusedPublicToken)
      : focusedPass
        ? {
            pass: focusedPass,
            mock: focusedPass.mock,
            evidenceLabel: focusedPass.mock ? "Modeled — mock adapter" : "Confirmed",
            installUrl: focusedPass.installUrl,
            previewUrl: focusedPass.previewUrl,
          }
        : null;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">
            <Link href="/dashboard/audience" className="hover:text-[oklch(0.82_0.11_275)] hover:underline">
              Audience
            </Link>{" "}
            / Wallet
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Wallet passes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Draft → preview → issue → update → revoke / replace. Mock adapter is functional without
            Apple/Google credentials. Passes linked from Keep Card → MyTap show their relationship.
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
        <>
          {focusedSummary ? (
            <section className="rounded-xl border border-[oklch(0.64_0.12_275_/_0.22)] bg-[oklch(0.64_0.12_275_/_0.06)] p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-[oklch(0.82_0.09_275)]">
                  {mockInstall ? "Mock install preview" : "Pass preview"}
                </h2>
                {focusedPublicToken ? (
                  <Link
                    href={`/mytap/${focusedPublicToken}`}
                    className="text-xs text-[oklch(0.82_0.11_275)] hover:underline"
                  >
                    View linked MyTap →
                  </Link>
                ) : null}
              </div>
              <WalletMockPassCard
                pass={focusedSummary.pass}
                businessName={business.name}
                evidenceLabel={focusedSummary.evidenceLabel}
              />
            </section>
          ) : null}
          <WalletPassManager
            initialPasses={managerPasses}
            featureEnabled={featureEnabled}
            credentialBlockers={blockers}
            highlightSerial={highlightSerial}
          />
        </>
      )}
    </div>
  );
}
