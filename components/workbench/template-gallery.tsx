"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Bookmark, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { CampaignTemplate, ContentBlock } from "@/lib/types/campaign";

const TEMPLATE_PREVIEWS: Record<
  string,
  { product: string; price?: string; offer?: string; tone: string; accent: string }
> = {
  "product-story": {
    product: "Midnight Reserve Cigar",
    price: "$28",
    offer: "VIP 10% off",
    tone: "Product showcase + unlockable offer",
    accent: "from-emerald-500/40 via-green-700/20",
  },
  "video-demo": {
    product: "Smart Humidor Demo",
    tone: "Video-led explanation + CTA",
    accent: "from-sky-500/40 via-cyan-700/20",
  },
  "coupon-offer": {
    product: "Weekend Bundle",
    price: "Save $15",
    offer: "CODE: WEEKEND15",
    tone: "Contact first → then unlock coupon",
    accent: "from-amber-500/40 via-orange-700/20",
  },
  "review-request": {
    product: "Thank-you + Google review",
    tone: "Ask for reviews after a visit",
    accent: "from-violet-500/40 via-purple-700/20",
  },
  "contact-vcard": {
    product: "Alex Rivera · Sales Lead",
    tone: "Digital business card + save contact",
    accent: "from-slate-400/40 via-zinc-700/20",
  },
  "event-announcement": {
    product: "Friday Tasting Night",
    offer: "RSVP required",
    tone: "Event details + signup",
    accent: "from-rose-500/40 via-pink-700/20",
  },
  "lead-capture": {
    product: "VIP list signup",
    tone: "Collect name, email, phone",
    accent: "from-teal-500/40 via-emerald-700/20",
  },
  "link-hub": {
    product: "All your important links",
    tone: "Link-in-bio style hub",
    accent: "from-indigo-500/40 via-blue-700/20",
  },
};

function PhonePreview({
  template,
  brandColors,
  large = false,
}: {
  template: CampaignTemplate;
  brandColors?: TemplateGalleryProps["brandColors"];
  large?: boolean;
}) {
  const preview = TEMPLATE_PREVIEWS[template.id];
  const primary = brandColors?.primaryColor ?? "#22c55e";
  const bg = brandColors?.backgroundColor ?? "#0b0f19";
  const text = brandColors?.textColor ?? "#f8fafc";
  const sampleBlocks = template.defaultBlocks.filter((b) => b.enabled).slice(0, large ? 5 : 3);

  return (
    <div
      className={cn(
        "relative mx-auto overflow-hidden rounded-[1.5rem] border border-white/10 shadow-xl",
        large ? "w-full max-w-sm" : "h-40 w-full"
      )}
      style={{ backgroundColor: bg, color: text }}
    >
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-80", preview?.accent)} />
      <div className={cn("relative z-10 flex flex-col", large ? "gap-3 p-5" : "h-full justify-between p-3")}>
        <div className="flex items-center gap-2">
          {brandColors?.logoUrl ? (
            <img src={brandColors.logoUrl} alt="" className="h-7 w-7 rounded object-cover" />
          ) : (
            <div className="h-7 w-7 rounded-lg" style={{ backgroundColor: primary }} />
          )}
          <div className="min-w-0">
            <p className={cn("truncate font-semibold", large ? "text-sm" : "text-[11px]")}>
              {preview?.product ?? template.name}
            </p>
            {preview?.price && (
              <p className="text-[10px] opacity-70">{preview.price}</p>
            )}
          </div>
        </div>

        {large && (
          <p className="text-xs opacity-75">{preview?.tone ?? template.description}</p>
        )}

        <div className="space-y-1.5">
          {sampleBlocks.map((block) => (
            <SampleBlock key={block.id} block={block} primary={primary} compact={!large} />
          ))}
        </div>

        {preview?.offer && (
          <div
            className={cn(
              "rounded-lg border border-dashed px-2 py-1 text-center font-mono",
              large ? "text-sm" : "text-[10px]"
            )}
            style={{ borderColor: primary, color: primary }}
          >
            {preview.offer}
          </div>
        )}
      </div>
    </div>
  );
}

function SampleBlock({
  block,
  primary,
  compact,
}: {
  block: ContentBlock;
  primary: string;
  compact: boolean;
}) {
  const data = block.data as Record<string, unknown>;
  if (block.type === "headline") {
    return (
      <div className={cn("text-center", compact ? "text-[10px]" : "text-sm")}>
        <p className="font-semibold">{(data.headline as string) || block.label}</p>
      </div>
    );
  }
  if (block.type === "email_capture") {
    return (
      <div className={cn("rounded-md bg-white/10 px-2 py-1", compact ? "text-[9px]" : "text-xs")}>
        {(data.headline as string) || "Contact form"} · email
      </div>
    );
  }
  if (block.type === "offer_coupon") {
    return (
      <div
        className={cn("rounded-md border border-dashed px-2 py-1 text-center", compact ? "text-[9px]" : "text-xs")}
        style={{ borderColor: primary }}
      >
        {(data.code as string) || "OFFER"} locked until contact
      </div>
    );
  }
  return (
    <div className={cn("rounded-md bg-white/5 px-2 py-1 opacity-80", compact ? "text-[9px]" : "text-xs")}>
      {block.label}
    </div>
  );
}

interface TemplateGalleryProps {
  templates: CampaignTemplate[];
  brandColors?: {
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    textColor: string;
    logoUrl?: string | null;
  };
  selectedId: string;
  onSelect: (id: string) => void;
  onUse: (id: string) => void;
}

export function TemplateGallery({
  templates,
  brandColors,
  selectedId,
  onSelect,
  onUse,
}: TemplateGalleryProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {templates.map((template) => {
        const preview = TEMPLATE_PREVIEWS[template.id];
        const selected = selectedId === template.id;
        return (
          <Card
            key={template.id}
            className={cn(
              "group overflow-hidden border-border/60 transition-colors hover:border-primary/30",
              selected && "border-primary/50 ring-1 ring-primary/30"
            )}
          >
            <button type="button" className="w-full text-left" onClick={() => onSelect(template.id)}>
              <PhonePreview template={template} brandColors={brandColors} />
            </button>

            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base">{template.name}</CardTitle>
                {template.industry && (
                  <Badge variant="outline" className="shrink-0 text-[10px] capitalize">
                    {template.industry}
                  </Badge>
                )}
              </div>
              <CardDescription className="text-sm">
                {preview?.tone ?? template.description}
              </CardDescription>
            </CardHeader>

            <CardContent className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">
                Example: {preview?.product ?? `${template.suggestedBlocks.length} blocks`}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  title="Save as user template (coming soon)"
                  className="rounded p-1 text-muted-foreground opacity-50"
                  disabled
                >
                  <Bookmark className="h-4 w-4" />
                </button>
                <Button size="sm" className="h-7" onClick={() => onUse(template.id)}>
                  Use <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export function WorkbenchStart({
  templates,
  brandColors,
}: {
  templates: CampaignTemplate[];
  brandColors?: TemplateGalleryProps["brandColors"];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initial = searchParams.get("template") ?? templates[0]?.id ?? "";
  const [selected, setSelected] = useState(initial);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);

  useEffect(() => {
    const fromUrl = searchParams.get("template");
    if (fromUrl && templates.some((t) => t.id === fromUrl)) {
      setSelected(fromUrl);
    }
  }, [searchParams, templates]);

  const previewTemplate = useMemo(
    () => templates.find((t) => t.id === (previewId ?? selected)) ?? templates[0],
    [templates, previewId, selected]
  );

  function selectTemplate(id: string) {
    setSelected(id);
    router.replace(`/dashboard/workbench?template=${id}`, { scroll: false });
  }

  function openUse(id: string) {
    selectTemplate(id);
    setPreviewId(id);
    const sample = TEMPLATE_PREVIEWS[id]?.product;
    if (sample && !title.trim()) setTitle(sample);
  }

  async function handleCreate() {
    if (!title.trim()) {
      setError("Enter a campaign title");
      return;
    }
    setLoading(true);
    setError(null);

    const res = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateId: selected, title: title.trim() }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to create campaign");
      setLoading(false);
      return;
    }

    const { campaign } = await res.json();
    router.push(`/dashboard/campaigns/${campaign.id}`);
  }

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-6">
        <h2 className="text-lg font-semibold">Quick Start</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose a template (or tap Use on a card). Preview opens large so you can confirm before creating.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Campaign type</Label>
            <select
              value={selected}
              onChange={(e) => selectTemplate(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-input bg-background/50 px-3 text-sm"
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Campaign title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Summer Accessory Promo"
            />
          </div>
        </div>
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={handleCreate} disabled={loading}>
            {loading ? "Creating..." : "Create Campaign Draft"}
          </Button>
          <Button variant="outline" onClick={() => setPreviewId(selected)}>
            Preview template
          </Button>
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold">Template gallery</h2>
        <TemplateGallery
          templates={templates}
          brandColors={brandColors}
          selectedId={selected}
          onSelect={selectTemplate}
          onUse={openUse}
        />
      </div>

      {previewId && previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-background p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold">{previewTemplate.name}</h3>
                <p className="text-sm text-muted-foreground">{previewTemplate.description}</p>
              </div>
              <button type="button" onClick={() => setPreviewId(null)} className="rounded p-1 text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <PhonePreview template={previewTemplate} brandColors={brandColors} large />
            <div className="mt-4 space-y-2">
              <Label>Campaign title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Name this campaign"
              />
            </div>
            {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
            <div className="mt-4 flex gap-2">
              <Button onClick={handleCreate} disabled={loading}>
                {loading ? "Creating..." : "Use this template"}
              </Button>
              <Button variant="outline" onClick={() => setPreviewId(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
