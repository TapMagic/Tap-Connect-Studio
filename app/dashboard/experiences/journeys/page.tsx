import Link from "next/link";
import { requireBusiness } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { FeatureDisabledState } from "@/components/fusion/features/feature-disabled-state";
import { OpenInTapCanvasLink } from "@/components/fusion/canvas/open-in-tap-canvas";
import { listFeatureOverrides, toResolveOverrides } from "@/lib/fusion/features/overrides";
import { isFeatureEnabled } from "@/lib/fusion/features/resolve";
import { JourneyEditorShell } from "@/components/fusion/journey/journey-editor-shell";
import { parseBrandContactProfile } from "@/lib/brand/contact-profile";

export const dynamic = "force-dynamic";

export default async function JourneysPage() {
  const { business } = await requireBusiness();
  const overrides = toResolveOverrides(await listFeatureOverrides());
  const featureEnabled = isFeatureEnabled("journey.tapflow", { overrides });

  const brandKitRow = await prisma.brandKit
    .findUnique({ where: { businessId: business.id } })
    .catch(() => null);
  const contact = parseBrandContactProfile(brandKitRow?.socialLinks);

  let drafts: { id: string; name: string; status?: string; updatedAt: string }[] = [];
  try {
    const rows = await prisma.journeyDraft.findMany({
      where: { businessId: business.id },
      orderBy: { updatedAt: "desc" },
      take: 20,
      select: { id: true, name: true, status: true, updatedAt: true },
    });
    drafts = rows.map((r) => ({
      id: r.id,
      name: r.name,
      status: r.status,
      updatedAt: r.updatedAt.toISOString(),
    }));
  } catch {
    drafts = [];
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">TapFlow</p>
        <h1 className="text-2xl font-semibold tracking-tight">Journeys</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Visual journey builder — Beginner and Expert share one engine. Drag steps, review with AI,
          simulate customer paths. Developer JSON stays under Advanced.{" "}
          <Link href="/dashboard/settings" className="text-primary underline-offset-4 hover:underline">
            Settings
          </Link>
          {" · "}
          <OpenInTapCanvasLink objectType="tapflow" objectId="hub" />
        </p>
      </div>

      {!featureEnabled ? (
        <FeatureDisabledState
          featureId="journey.tapflow"
          title="TapFlow lifecycle is disabled"
          description="You can still edit and save drafts locally. Publish, activate, resume, and server simulate stay blocked until journey.tapflow is enabled."
          alternateHref="/dashboard/experiences"
          alternateLabel="Back to Experiences →"
        />
      ) : null}

      <JourneyEditorShell
        businessId={business.id}
        initialDrafts={drafts}
        featureEnabled={featureEnabled}
        brandKit={{
          logoUrl: business.logoUrl,
          primaryColor: brandKitRow?.primaryColor ?? "#22c55e",
          secondaryColor: brandKitRow?.secondaryColor ?? undefined,
          tone: brandKitRow?.tone ?? undefined,
          businessName: business.name,
          phone: contact.phone ?? business.phone,
          email: contact.email ?? business.email,
          website: contact.website ?? business.website,
          address: contact.address ?? undefined,
          reviewUrl: business.googleReviewUrl,
          disclaimer: brandKitRow?.defaultDisclaimer ?? undefined,
        }}
      />
    </div>
  );
}
