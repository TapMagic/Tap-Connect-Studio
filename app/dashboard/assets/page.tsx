import Link from "next/link";
import { ArrowRight, ImageIcon, Palette } from "lucide-react";
import { requireBusiness } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { FILE_FORMAT_REGISTRY } from "@/lib/fusion/formats/registry";
import { StudioHubSections } from "@/components/studio/hub-sections";
import { KeywordsSuggestPanel } from "@/components/fusion/keywords/keywords-suggest-panel";

export const dynamic = "force-dynamic";

export default async function AssetsHubPage() {
  const { business } = await requireBusiness();
  const brandKit = await prisma.brandKit
    .findUnique({ where: { businessId: business.id } })
    .catch(() => null);
  const imageFormats = FILE_FORMAT_REGISTRY.filter((f) => f.kind === "image" && f.upload).length;
  const hasBrand = Boolean(business.logoUrl || brandKit);

  return (
    <div className="space-y-8 p-5 lg:p-8" data-testid="assets-workspace">
      <header className="space-y-3 border-b border-white/8 pb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
          Assets
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-white">Brand & media</h1>
        <p className="max-w-2xl text-sm text-white/55">
          Keep Brand Kit as the single source of truth. Media and templates inherit — never a
          second brand system.
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Link
            href="/dashboard/brand/edit"
            data-testid="assets-cta-brand"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Palette className="h-4 w-4" aria-hidden />
            {hasBrand ? "Open Brand Kit" : "Set up Brand Kit"}
          </Link>
          <Link
            href="/dashboard/workbench"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/15 bg-white/[0.04] px-4 text-sm font-medium text-white/90 hover:border-primary/40"
          >
            <ImageIcon className="h-4 w-4" aria-hidden />
            Templates in workbench
          </Link>
        </div>
      </header>

      <section
        className="grid gap-3 lg:grid-cols-2"
        aria-label="Asset status"
        data-testid="assets-status"
      >
        <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-4">
          <p className="text-sm font-medium text-white/90">Brand Kit</p>
          <p className="mt-2 text-xs text-white/50">
            {hasBrand
              ? "Logo or kit present — builders can inherit colors and marks."
              : "Not set yet — start here so Cards and campaigns look like you."}
          </p>
          <Link
            href="/dashboard/brand/edit"
            className="mt-3 inline-flex items-center gap-1 text-xs text-primary hover:underline"
            data-testid="assets-edit-brand"
          >
            {hasBrand ? "Edit Brand Kit" : "Create Brand Kit"}{" "}
            <ArrowRight className="h-3 w-3" />
          </Link>
          <Link
            href="/dashboard/brand"
            className="mt-2 block text-[11px] text-white/40 hover:text-white/60"
            data-testid="assets-classic-brand"
          >
            Legacy Brand administration
          </Link>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-4">
          <p className="text-sm font-medium text-white/90">Media formats</p>
          <p className="mt-2 text-xs text-white/50">
            {imageFormats}+ image formats registered · Pexels / Unsplash / Logo.dev / R2 when
            configured.
          </p>
          <p className="mt-3 text-[11px] text-white/35">
            Upload and stock search live inside Card and Campaign builders.
          </p>
        </div>
      </section>

      <details className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
        <summary className="cursor-pointer text-sm font-medium text-white/80">
          Keyword suggestions (optional)
        </summary>
        <p className="mt-2 text-xs text-white/45">
          Channel keyword ideas — secondary to Brand Kit. Opens Automation Team assistance when
          enabled.
        </p>
        <div className="mt-3">
          <KeywordsSuggestPanel surface="assets" defaultChannel="instagram" />
        </div>
      </details>

      <StudioHubSections
        destinationId="assets"
        title="Assets"
        subtitle="Full asset tool catalog"
        collapsible
        defaultOpen={false}
      />
    </div>
  );
}
