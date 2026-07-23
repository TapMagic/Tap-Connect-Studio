import Link from "next/link";
import { requireBusiness } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { FeatureDisabledState } from "@/components/fusion/features/feature-disabled-state";
import { listFeatureOverrides, toResolveOverrides } from "@/lib/fusion/features/overrides";
import { isFeatureEnabled } from "@/lib/fusion/features/resolve";
import { JourneyEditorShell } from "@/components/fusion/journey/journey-editor-shell";

export const dynamic = "force-dynamic";

export default async function JourneysPage() {
  const { business } = await requireBusiness();
  const overrides = toResolveOverrides(await listFeatureOverrides());
  const featureEnabled = isFeatureEnabled("journey.tapflow", { overrides });

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
          Beginner stage list and expert graph share one engine. Drafts persist; publish/activate/pause
          write audit + outbox.{" "}
          <Link href="/dashboard/settings" className="text-primary underline-offset-4 hover:underline">
            Settings
          </Link>
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
      />
    </div>
  );
}
