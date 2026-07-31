"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Bookmark,
  CheckCircle2,
  ClipboardList,
  Footprints,
  Sparkles,
  Target,
  Users,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { CampaignTemplate, ContentBlock } from "@/lib/types/campaign";
import { KeywordsSuggestPanel } from "@/components/fusion/keywords/keywords-suggest-panel";
import {
  TEMPLATE_OUTCOMES,
  type TemplateOutcomeMeta,
} from "@/lib/fusion/studio/template-outcomes";

/** Sample preview seeds — enriched from TEMPLATE_OUTCOMES for gallery cards */
export const TEMPLATE_PREVIEWS: Record<
  string,
  {
    product: string;
    price?: string;
    offer?: string;
    tone: string;
    accent: string;
    mediaKind: TemplateOutcomeMeta["media"]["kind"];
    mediaLabel: string;
  }
> = Object.fromEntries(
  Object.values(TEMPLATE_OUTCOMES).map((o) => [
    o.id,
    {
      product: o.sampleTitle,
      price: o.price,
      offer: o.offer,
      tone: o.scenario,
      accent: o.media.gradient,
      mediaKind: o.media.kind,
      mediaLabel: o.media.mediaLabel,
    },
  ])
);

function MediaPlaceholder({
  kind,
  label,
  large,
}: {
  kind: TemplateOutcomeMeta["media"]["kind"];
  label: string;
  large?: boolean;
}) {
  const shapes: Record<TemplateOutcomeMeta["media"]["kind"], string> = {
    product: "rounded-xl",
    video: "rounded-lg aspect-video",
    coupon: "rounded-2xl border-2 border-dashed border-white/40",
    review: "rounded-full aspect-square max-w-[4.5rem] mx-auto",
    vcard: "rounded-2xl",
    event: "rounded-md skew-y-[-1deg]",
    lead: "rounded-lg",
    hub: "rounded-3xl",
  };

  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden bg-black/25",
        shapes[kind],
        large ? "min-h-[7.5rem] w-full" : "h-16 w-full"
      )}
      data-testid={`template-media-${kind}`}
    >
      {kind === "video" ? (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm">
          <span className="ml-0.5 text-[10px] font-bold tracking-wide">PLAY</span>
        </div>
      ) : kind === "coupon" ? (
        <div className="px-3 text-center font-mono text-[11px] font-semibold tracking-wide text-white/90">
          {label}
        </div>
      ) : kind === "review" ? (
        <span className="text-lg font-semibold tracking-wide text-amber-200/90">
          Review
        </span>
      ) : kind === "hub" ? (
        <div className="flex w-full flex-col gap-1 px-3 py-2">
          <div className="h-2 rounded-full bg-white/35" />
          <div className="h-2 rounded-full bg-white/25" />
          <div className="h-2 rounded-full bg-white/20" />
        </div>
      ) : kind === "lead" ? (
        <div className="w-[70%] space-y-1.5 px-2">
          <div className="h-2 rounded bg-white/30" />
          <div className="h-2 rounded bg-white/20" />
          <div className="mx-auto mt-1 h-5 w-16 rounded-md bg-primary/70" />
        </div>
      ) : kind === "event" ? (
        <div className="text-center">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/70">Fri</p>
          <p className={cn("font-bold text-white", large ? "text-2xl" : "text-lg")}>26</p>
        </div>
      ) : kind === "vcard" ? (
        <div className="flex items-center gap-2 px-3">
          <div className={cn("rounded-full bg-white/30", large ? "h-12 w-12" : "h-8 w-8")} />
          <div className="space-y-1">
            <div className="h-2 w-16 rounded bg-white/40" />
            <div className="h-1.5 w-10 rounded bg-white/25" />
          </div>
        </div>
      ) : (
        <div className="flex h-full w-full items-end justify-center pb-2">
          <div
            className={cn(
              "rounded-t-md bg-gradient-to-t from-black/50 to-white/20",
              large ? "h-16 w-12" : "h-10 w-8"
            )}
          />
        </div>
      )}
      {kind !== "coupon" && kind !== "hub" && kind !== "lead" ? (
        <span className="absolute bottom-1 left-2 text-[9px] font-medium text-white/70">
          {label}
        </span>
      ) : null}
    </div>
  );
}

function PhonePreview({
  template,
  brandColors,
  large = false,
  outcome,
}: {
  template: CampaignTemplate;
  brandColors?: TemplateGalleryProps["brandColors"];
  large?: boolean;
  outcome?: TemplateOutcomeMeta;
}) {
  const preview = TEMPLATE_PREVIEWS[template.id];
  const meta = outcome ?? TEMPLATE_OUTCOMES[template.id];
  const primary = brandColors?.primaryColor ?? "#22c55e";
  const bg = brandColors?.backgroundColor ?? "#0b0f19";
  const text = brandColors?.textColor ?? "#f8fafc";
  const sampleBlocks = template.defaultBlocks.filter((b) => b.enabled).slice(0, large ? 5 : 3);
  const gradient = preview?.accent ?? meta?.media.gradient ?? "from-primary/40 via-emerald-900/20";

  return (
    <div
      className={cn(
        "relative mx-auto overflow-hidden rounded-[1.65rem] border border-white/10 shadow-xl",
        large ? "w-full max-w-sm" : "h-52 w-full"
      )}
      style={{ backgroundColor: bg, color: text }}
      data-testid={`template-phone-${template.id}`}
    >
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-90", gradient)} />
      <div
        className={cn(
          "relative z-10 flex flex-col",
          large ? "gap-3 p-5" : "h-full justify-between gap-2 p-3"
        )}
      >
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
            {preview?.price ? <p className="text-[10px] opacity-70">{preview.price}</p> : null}
          </div>
        </div>

        <MediaPlaceholder
          kind={preview?.mediaKind ?? meta?.media.kind ?? "product"}
          label={preview?.mediaLabel ?? meta?.media.mediaLabel ?? "Preview"}
          large={large}
        />

        {large && meta ? (
          <p className="text-xs leading-snug opacity-80">{meta.firstScreen}</p>
        ) : null}

        <div className="space-y-1.5">
          {sampleBlocks.map((block) => (
            <SampleBlock key={block.id} block={block} primary={primary} compact={!large} />
          ))}
        </div>

        {(preview?.offer || meta?.primaryAction) && (
          <div
            className={cn(
              "rounded-lg border border-dashed px-2 py-1.5 text-center font-medium",
              large ? "text-sm" : "text-[10px]"
            )}
            style={{ borderColor: primary, color: primary }}
          >
            {preview?.offer ?? meta?.primaryAction}
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
        className={cn(
          "rounded-md border border-dashed px-2 py-1 text-center",
          compact ? "text-[9px]" : "text-xs"
        )}
        style={{ borderColor: primary }}
      >
        {(data.code as string) || "OFFER"} locked until contact
      </div>
    );
  }
  if (block.type === "hero_video") {
    return (
      <div className={cn("rounded-md bg-sky-500/20 px-2 py-1", compact ? "text-[9px]" : "text-xs")}>
        Video block
      </div>
    );
  }
  if (block.type === "google_review") {
    return (
      <div
        className={cn("rounded-md bg-violet-500/20 px-2 py-1", compact ? "text-[9px]" : "text-xs")}
      >
        Review CTA
      </div>
    );
  }
  return (
    <div
      className={cn("rounded-md bg-white/5 px-2 py-1 opacity-80", compact ? "text-[9px]" : "text-xs")}
    >
      {block.label}
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-[11px] leading-snug">
      <span className="w-[5.5rem] shrink-0 font-medium text-muted-foreground">{label}</span>
      <span className="min-w-0 text-foreground/90">{value}</span>
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
        const outcome = TEMPLATE_OUTCOMES[template.id];
        const selected = selectedId === template.id;
        return (
          <Card
            key={template.id}
            className={cn(
              "group overflow-hidden border-border/60 transition-colors hover:border-primary/30",
              selected && "border-primary/50 ring-1 ring-primary/30"
            )}
            data-testid={`template-card-${template.id}`}
          >
            <button type="button" className="w-full text-left" onClick={() => onSelect(template.id)}>
              <PhonePreview
                template={template}
                brandColors={brandColors}
                outcome={outcome}
              />
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
              <CardDescription className="text-sm" data-testid="template-scenario">
                {outcome?.scenario ?? preview?.tone ?? template.description}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
              {outcome ? (
                <div className="space-y-1.5 rounded-lg border border-border/40 bg-muted/15 p-2.5">
                  <MetaRow label="First screen" value={outcome.firstScreen} />
                  <MetaRow label="Primary action" value={outcome.primaryAction} />
                  <MetaRow label="Data captured" value={outcome.dataCaptured} />
                  <MetaRow label="Follow-up" value={outcome.followUp} />
                  <MetaRow label="Outcome" value={outcome.finalOutcome} />
                  <MetaRow
                    label="Setup"
                    value={outcome.setupRequirements.slice(0, 2).join(" · ")}
                  />
                  <MetaRow
                    label="Est. steps"
                    value={`${outcome.estimatedSteps} guided steps`}
                  />
                  <div className="flex flex-wrap gap-1 pt-1">
                    {outcome.pillars.map((p) => (
                      <Badge key={p} variant="secondary" className="text-[9px]">
                        {p}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">
                  Example: {preview?.product ?? `${template.suggestedBlocks.length} blocks`}
                </span>
              )}

              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  title="Save as user template (coming soon)"
                  aria-label="Save as user template (coming soon)"
                  className="rounded p-1 text-muted-foreground opacity-50"
                  disabled
                >
                  <Bookmark className="h-4 w-4" />
                </button>
                <Button
                  size="sm"
                  className="h-7"
                  data-testid={`template-use-${template.id}`}
                  onClick={() => onUse(template.id)}
                >
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

function ModalSection({
  icon: Icon,
  title,
  items,
}: {
  icon: typeof Sparkles;
  title: string;
  items: string[];
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-muted/10 p-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <Icon className="h-4 w-4 text-primary" aria-hidden />
        {title}
      </div>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/80" aria-hidden />
            <span>{item}</span>
          </li>
        ))}
      </ul>
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
  const fromUrl = searchParams.get("template");
  const urlTemplate =
    fromUrl && templates.some((t) => t.id === fromUrl) ? fromUrl : null;
  const initial = urlTemplate ?? templates[0]?.id ?? "";
  const [selected, setSelected] = useState(initial);
  const [prevUrlTemplate, setPrevUrlTemplate] = useState(urlTemplate);
  if (urlTemplate !== prevUrlTemplate) {
    setPrevUrlTemplate(urlTemplate);
    if (urlTemplate) setSelected(urlTemplate);
  }
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingTemplateId, setLoadingTemplateId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastAttempt, setLastAttempt] = useState<{ templateId: string; title: string } | null>(
    null
  );
  const [previewId, setPreviewId] = useState<string | null>(null);

  const previewTemplate = useMemo(
    () => templates.find((t) => t.id === (previewId ?? selected)) ?? templates[0],
    [templates, previewId, selected]
  );
  const previewOutcome = previewTemplate
    ? TEMPLATE_OUTCOMES[previewTemplate.id]
    : undefined;

  function selectTemplate(id: string) {
    setSelected(id);
    router.replace(`/dashboard/workbench?template=${id}`, { scroll: false });
  }

  function openUse(id: string) {
    selectTemplate(id);
    setPreviewId(id);
    const sample = TEMPLATE_PREVIEWS[id]?.product ?? TEMPLATE_OUTCOMES[id]?.sampleTitle;
    if (sample && !title.trim()) setTitle(sample);
  }

  async function handleCreate(templateId = selected, requestedTitle = title.trim()) {
    if (!requestedTitle) {
      setError("Enter a campaign title");
      return;
    }
    setLoading(true);
    setLoadingTemplateId(templateId);
    setError(null);
    setLastAttempt({ templateId, title: requestedTitle });

    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId, title: requestedTitle }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "The template could not be loaded into a Campaign draft.");
        return;
      }

      const data = (await res.json()) as {
        campaign?: { id?: string; contentBlocks?: unknown };
        template?: { id?: string; blockCount?: number };
      };
      const blockCount =
        data.template?.blockCount ??
        (Array.isArray(data.campaign?.contentBlocks) ? data.campaign.contentBlocks.length : 0);
      if (!data.campaign?.id || blockCount < 1) {
        setError(
          "The Campaign draft was not opened because its template blocks were missing. Retry safely."
        );
        return;
      }

      // A document navigation guarantees the newly persisted server record is
      // read before the editor hydrates; no stale client route snapshot can
      // present an empty canvas as success.
      window.location.assign(
        `/dashboard/campaigns/${data.campaign.id}?template=${encodeURIComponent(
          data.template?.id ?? templateId
        )}&loaded=${blockCount}`
      );
    } catch {
      setError("The template could not be loaded. Check the connection and retry.");
    } finally {
      setLoading(false);
      setLoadingTemplateId(null);
    }
  }

  return (
    <div className="space-y-8">
      <KeywordsSuggestPanel surface="templates" defaultChannel="instagram" />
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-6">
        <h2 className="text-lg font-semibold">Quick Start</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose a template (or tap Use on a card). Preview opens large so you can confirm before
          creating.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Campaign type</Label>
            <select
              value={selected}
              onChange={(e) => selectTemplate(e.target.value)}
              className="flex h-10 w-full rounded-lg border border-input bg-background/50 px-3 text-sm"
              aria-label="Campaign type"
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
        {loading ? (
          <div
            className="owner-status-frame mt-3 rounded-lg px-3 py-2 text-sm"
            data-owner-severity="info"
            data-testid="campaign-template-loading"
            role="status"
          >
            Loading the selected template, applying Brand styling, and opening its editable blocks…
          </div>
        ) : null}
        {error && !previewId ? (
          <div
            className="owner-status-frame mt-3 rounded-lg px-3 py-3"
            data-owner-severity="error"
            data-testid="campaign-template-error"
            role="alert"
          >
            <p className="text-sm font-medium text-red-100">Template did not load</p>
            <p className="mt-1 text-xs text-white/65">{error}</p>
            {lastAttempt ? (
              <Button
                type="button"
                variant="outline"
                className="mt-3"
                data-testid="campaign-template-retry"
                disabled={loading}
                onClick={() => void handleCreate(lastAttempt.templateId, lastAttempt.title)}
              >
                Retry template
              </Button>
            ) : null}
          </div>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => void handleCreate(selected)} disabled={loading}>
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
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-background p-5 shadow-2xl"
            data-testid="template-preview-modal"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold">{previewTemplate.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {previewOutcome?.scenario ?? previewTemplate.description}
                </p>
                {previewOutcome ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {previewOutcome.pillars.map((p) => (
                      <Badge key={p} variant="outline" className="text-[10px]">
                        {p}
                      </Badge>
                    ))}
                    <Badge variant="secondary" className="text-[10px]">
                      ~{previewOutcome.estimatedSteps} steps
                    </Badge>
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setPreviewId(null)}
                className="rounded p-1 text-muted-foreground hover:text-foreground"
                aria-label="Close preview"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_14rem]">
              <div className="space-y-3">
                {previewOutcome ? (
                  <>
                    <ModalSection
                      icon={Sparkles}
                      title="What this creates"
                      items={previewOutcome.whatThisCreates}
                    />
                    <ModalSection
                      icon={Users}
                      title="What the customer experiences"
                      items={previewOutcome.customerExperience}
                    />
                    <ModalSection
                      icon={ClipboardList}
                      title="What you need"
                      items={previewOutcome.whatYouNeed}
                    />
                    <div className="grid gap-2 rounded-xl border border-border/50 bg-muted/10 p-3 text-[11px] sm:grid-cols-2">
                      <MetaRow label="First screen" value={previewOutcome.firstScreen} />
                      <MetaRow label="Primary action" value={previewOutcome.primaryAction} />
                      <MetaRow label="Data captured" value={previewOutcome.dataCaptured} />
                      <MetaRow label="Follow-up" value={previewOutcome.followUp} />
                      <MetaRow label="Final outcome" value={previewOutcome.finalOutcome} />
                      <div className="flex gap-2 sm:col-span-2">
                        <Footprints className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                        <span>
                          Setup: {previewOutcome.setupRequirements.join(" · ")}
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="rounded-xl border border-border/50 p-3 text-sm text-muted-foreground">
                    <Target className="mb-2 h-4 w-4 text-primary" />
                    {previewTemplate.description}
                  </div>
                )}
              </div>
              <PhonePreview
                template={previewTemplate}
                brandColors={brandColors}
                large
                outcome={previewOutcome}
              />
            </div>

            <div className="mt-4 space-y-2">
              <Label>Campaign title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Name this campaign"
              />
            </div>
            {error ? (
              <div
                className="owner-status-frame mt-3 rounded-lg px-3 py-3"
                data-owner-severity="error"
                data-testid="campaign-template-error"
                role="alert"
              >
                <p className="text-sm font-medium text-red-100">
                  Template did not load
                </p>
                <p className="mt-1 text-xs text-white/65">{error}</p>
                {lastAttempt ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-3"
                    data-testid="campaign-template-retry"
                    disabled={loading}
                    onClick={() =>
                      void handleCreate(lastAttempt.templateId, lastAttempt.title)
                    }
                  >
                    Retry template
                  </Button>
                ) : null}
              </div>
            ) : null}
            <div className="mt-4 flex gap-2">
              <Button
                onClick={() => void handleCreate(previewTemplate.id)}
                disabled={loading}
                data-loading-template={loadingTemplateId ?? undefined}
              >
                {loading ? "Loading template…" : "Use this template"}
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
