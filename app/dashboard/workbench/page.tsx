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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Campaign Workbench</h1>
        <p className="text-muted-foreground">
          Start with an intent, not a blank page. Preview templates, then create a draft with your brand colors.
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
