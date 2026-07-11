"use client";

import type { CampaignTemplate } from "@/lib/types/campaign";
import Link from "next/link";
import { ArrowRight, Bookmark } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TemplateGalleryProps {
  templates: CampaignTemplate[];
  brandColors?: {
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    textColor: string;
    logoUrl?: string | null;
  };
}

const TEMPLATE_ACCENTS: Record<string, string> = {
  "product-story": "from-emerald-500/30 via-green-600/10",
  "video-demo": "from-blue-500/30 via-cyan-600/10",
  "coupon-offer": "from-amber-500/30 via-orange-600/10",
  "review-request": "from-violet-500/30 via-purple-600/10",
  "contact-vcard": "from-slate-500/30 via-gray-600/10",
  "event-announcement": "from-rose-500/30 via-pink-600/10",
  "lead-capture": "from-teal-500/30 via-emerald-600/10",
  "link-hub": "from-indigo-500/30 via-blue-600/10",
};

export function TemplateGallery({ templates, brandColors }: TemplateGalleryProps) {
  const primary = brandColors?.primaryColor ?? "#22c55e";
  const bg = brandColors?.backgroundColor ?? "#0b0f19";

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {templates.map((template) => (
        <Card key={template.id} className="group overflow-hidden border-border/60 transition-colors hover:border-primary/30">
          {/* Visual preview mockup */}
          <div
            className={cn("relative h-36 bg-gradient-to-br", TEMPLATE_ACCENTS[template.id] ?? "from-primary/20 to-transparent")}
            style={{ backgroundColor: bg }}
          >
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
              {brandColors?.logoUrl ? (
                <img src={brandColors.logoUrl} alt="" className="mb-2 h-8 w-8 rounded object-cover" />
              ) : (
                <div
                  className="mb-2 h-8 w-8 rounded-lg"
                  style={{ backgroundColor: primary }}
                />
              )}
              <p className="text-xs font-semibold text-white/90">{template.name}</p>
              <p className="mt-1 line-clamp-2 text-[10px] text-white/60">
                {template.defaultBlocks.filter((b) => b.enabled).slice(0, 3).map((b) => b.label).join(" · ")}
              </p>
            </div>
            <div
              className="absolute bottom-0 left-0 right-0 h-1"
              style={{ backgroundColor: primary }}
            />
          </div>

          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-base">{template.name}</CardTitle>
              {template.industry && (
                <Badge variant="outline" className="shrink-0 text-[10px] capitalize">
                  {template.industry}
                </Badge>
              )}
            </div>
            <CardDescription className="text-sm">{template.description}</CardDescription>
          </CardHeader>

          <CardContent className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {template.suggestedBlocks.length} blocks
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                title="Save as user template (coming soon)"
                className="rounded p-1 text-muted-foreground opacity-50 hover:opacity-100"
                disabled
              >
                <Bookmark className="h-4 w-4" />
              </button>
              <Link
                href={`/dashboard/workbench?template=${template.id}`}
                className={cn(buttonVariants({ size: "sm" }), "h-7")}
              >
                Use <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
