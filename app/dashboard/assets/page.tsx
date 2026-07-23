import { requireBusiness } from "@/lib/auth";
import { FILE_FORMAT_REGISTRY } from "@/lib/fusion/formats/registry";
import { StudioHubSections } from "@/components/studio/hub-sections";

export const dynamic = "force-dynamic";

export default async function AssetsHubPage() {
  await requireBusiness();
  const imageFormats = FILE_FORMAT_REGISTRY.filter((f) => f.kind === "image" && f.upload).length;

  return (
    <div className="space-y-8 p-5 lg:p-8">
      <StudioHubSections
        destinationId="assets"
        title="Assets"
        subtitle="Brand Kit, media, logos, fonts, templates, and reusable sections — Builder Brand mode inherits; never a second source of truth."
      />

      <p className="text-sm text-white/45">
        {imageFormats}+ image formats registered · Pexels / Unsplash / Logo.dev / R2
      </p>
    </div>
  );
}
