import Link from "next/link";
import { requireBusiness } from "@/lib/auth";
import { Palette, ImageIcon, LayoutTemplate } from "lucide-react";
import { FILE_FORMAT_REGISTRY } from "@/lib/fusion/formats/registry";

export const dynamic = "force-dynamic";

export default async function AssetsHubPage() {
  await requireBusiness();
  const imageFormats = FILE_FORMAT_REGISTRY.filter((f) => f.kind === "image" && f.upload).length;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Assets</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Brand Kit, media libraries, templates, and packs. Builder Brand mode inherits — never a second source of truth.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Link href="/dashboard/brand" className="rounded-xl border border-border/60 bg-card/40 p-4 hover:border-primary/50">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-primary" />
            <p className="font-medium">Brand Kit</p>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Identity, colors, logos, links, Tap Card defaults</p>
        </Link>
        <div className="rounded-xl border border-border/60 bg-card/40 p-4">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-primary" />
            <p className="font-medium">Media library</p>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {imageFormats}+ image formats registered · Pexels / Unsplash / Logo.dev / R2
          </p>
        </div>
        <div className="rounded-xl border border-border/60 bg-card/40 p-4">
          <div className="flex items-center gap-2">
            <LayoutTemplate className="h-4 w-4 text-primary" />
            <p className="font-medium">Templates & packs</p>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">SavedTemplate + marketplace readiness</p>
        </div>
      </div>
    </div>
  );
}
