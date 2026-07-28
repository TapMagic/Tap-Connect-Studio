import { Suspense } from "react";
import { requireBusiness } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CAMPAIGN_TEMPLATES } from "@/lib/campaign-templates";
import { WorkbenchStart } from "@/components/workbench/template-gallery";

export default async function WorkbenchPage() {
  const { business } = await requireBusiness();
  const brandKit = await prisma.brandKit.findUnique({
    where: { businessId: business.id },
  });

  return (
    <div className="space-y-8 p-6 lg:p-8">
      <div className="space-y-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Campaign · serves your Tap Card
        </p>
        <h1 className="text-2xl font-bold tracking-tight">Campaign Workbench</h1>
        <p className="max-w-2xl text-muted-foreground">
          Start with an outcome, not a blank page. Each template becomes a live page your Card
          points to when someone taps — pick the result you want, and we&rsquo;ll create a draft in
          your brand colors.
        </p>
        <p className="text-sm text-muted-foreground">
          <span className="text-foreground">What&rsquo;s next:</span> choose a template below → we
          create a draft campaign → edit and assign it to a device so taps go live.
        </p>
      </div>

      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading templates…</p>}>
        <WorkbenchStart
          templates={CAMPAIGN_TEMPLATES}
          brandColors={{
            primaryColor: brandKit?.primaryColor ?? "#22c55e",
            secondaryColor: brandKit?.secondaryColor ?? "#0ea5e9",
            backgroundColor: brandKit?.backgroundColor ?? "#0b0f19",
            textColor: brandKit?.textColor ?? "#f8fafc",
            logoUrl: business.logoUrl,
          }}
        />
      </Suspense>
    </div>
  );
}
