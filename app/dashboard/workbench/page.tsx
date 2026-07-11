import { requireBusiness } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CAMPAIGN_TEMPLATES } from "@/lib/campaign-templates";
import { TemplatePicker } from "@/components/workbench/template-picker";
import { TemplateGallery } from "@/components/workbench/template-gallery";

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
          Start with an intent, not a blank page. Templates show your brand colors when saved in Brand Kit.
        </p>
      </div>

      <TemplatePicker templates={CAMPAIGN_TEMPLATES} />

      <div>
        <h2 className="mb-4 text-lg font-semibold">Template gallery</h2>
        <TemplateGallery
          templates={CAMPAIGN_TEMPLATES}
          brandColors={{
            primaryColor: brandKit?.primaryColor ?? "#22c55e",
            secondaryColor: brandKit?.secondaryColor ?? "#0ea5e9",
            backgroundColor: brandKit?.backgroundColor ?? "#0b0f19",
            textColor: brandKit?.textColor ?? "#f8fafc",
            logoUrl: business.logoUrl,
          }}
        />
      </div>
    </div>
  );
}
