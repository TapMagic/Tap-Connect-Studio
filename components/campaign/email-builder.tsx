"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Copy,
  GripVertical,
  Mail,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MediaPicker } from "@/components/media/media-picker";
import { nanoid } from "nanoid";
import type { BlockType, ContentBlock } from "@/lib/types/campaign";
import {
  defaultCampaignEmailResponse,
  parseCampaignEmailResponse,
  type CampaignEmailResponse,
} from "@/lib/campaign-email";
import { renderEmailPromoHtml } from "@/lib/email-promo";
import { cn } from "@/lib/utils";

const EMAIL_BLOCKS: { type: BlockType; label: string; data: Record<string, unknown> }[] = [
  {
    type: "headline",
    label: "Headline",
    data: { headline: "Your offer", subheadline: "", alignment: "center" },
  },
  { type: "rich_text", label: "Text", data: { body: "Hi {{name}},\n\n…" } },
  { type: "hero_image", label: "Image", data: { imageUrl: "", widthPercent: 100 } },
  {
    type: "offer_coupon",
    label: "Offer / code",
    data: {
      title: "Special offer",
      description: "Show this code",
      code: "SAVE10",
      lockedUntilContact: false,
    },
  },
  {
    type: "banner",
    label: "Banner",
    data: { text: "Limited time", backgroundColor: "#f97316", textColor: "#0b0f19" },
  },
  {
    type: "button_group",
    label: "Button",
    data: {
      layout: "stack",
      buttons: [
        {
          id: nanoid(6),
          label: "Visit us",
          url: "https://",
          style: "primary",
          icon: "link",
          fullWidth: true,
        },
      ],
    },
  },
  { type: "spacer", label: "Spacer", data: { height: "md" } },
];

interface EmailBuilderProps {
  campaign: {
    id: string;
    title: string;
    formSettings?: unknown;
  };
  businessName: string;
  logoUrl?: string | null;
  primaryColor: string;
  mediaUploadReady: boolean;
  stockReady: boolean;
  emailReady: boolean;
}

export function CampaignEmailBuilder({
  campaign,
  businessName,
  logoUrl,
  primaryColor,
  mediaUploadReady,
  stockReady,
  emailReady,
}: EmailBuilderProps) {
  const router = useRouter();
  const [template, setTemplate] = useState<CampaignEmailResponse>(() =>
    parseCampaignEmailResponse(
      (campaign.formSettings as { emailResponse?: unknown } | null)?.emailResponse,
      businessName
    )
  );
  const [addType, setAddType] = useState<BlockType>("offer_coupon");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [testTo, setTestTo] = useState("");
  const previewRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const selected = template.blocks.find((b) => b.id === selectedId) ?? null;
  const sorted = [...template.blocks].sort((a, b) => a.order - b.order);

  useEffect(() => {
    if (!selectedId) return;
    previewRefs.current[selectedId]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [selectedId]);

  function setBlocks(updater: (blocks: ContentBlock[]) => ContentBlock[]) {
    setTemplate((t) => ({ ...t, blocks: updater(t.blocks) }));
  }

  function patchBlock(id: string, patch: Partial<ContentBlock>) {
    setBlocks((blocks) => blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }

  function patchBlockData(id: string, key: string, value: unknown) {
    setBlocks((blocks) =>
      blocks.map((b) => (b.id === id ? { ...b, data: { ...b.data, [key]: value } } : b))
    );
  }

  function addBlock() {
    const preset = EMAIL_BLOCKS.find((b) => b.type === addType) ?? EMAIL_BLOCKS[0];
    const id = nanoid(8);
    const order = template.blocks.length
      ? Math.max(...template.blocks.map((b) => b.order)) + 1
      : 0;
    setBlocks((blocks) => [
      ...blocks,
      {
        id,
        type: preset.type,
        label: preset.label,
        order,
        enabled: true,
        channel: "email",
        data: structuredClone(preset.data),
      },
    ]);
    setSelectedId(id);
  }

  function removeBlock(id: string) {
    setBlocks((blocks) =>
      blocks
        .filter((b) => b.id !== id)
        .sort((a, b) => a.order - b.order)
        .map((b, i) => ({ ...b, order: i }))
    );
    if (selectedId === id) setSelectedId(null);
  }

  function duplicateBlock(id: string) {
    const ordered = [...template.blocks].sort((a, b) => a.order - b.order);
    const index = ordered.findIndex((b) => b.id === id);
    if (index < 0) return;
    const source = ordered[index];
    const clone: ContentBlock = {
      ...structuredClone(source),
      id: nanoid(8),
      label: `${source.label} copy`,
      order: source.order + 1,
    };
    const next = [...ordered];
    next.splice(index + 1, 0, clone);
    setBlocks(() => next.map((b, i) => ({ ...b, order: i })));
    setSelectedId(clone.id);
    setMessage("Block duplicated");
  }

  function moveBlock(id: string, direction: "up" | "down") {
    const ordered = [...template.blocks].sort((a, b) => a.order - b.order);
    const index = ordered.findIndex((b) => b.id === id);
    if (index < 0) return;
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= ordered.length) return;
    const next = ordered.map((b, i) => {
      if (i === index) return { ...b, order: swapIndex };
      if (i === swapIndex) return { ...b, order: index };
      return b;
    });
    setBlocks(() => next);
  }

  function reorderBlocks(fromId: string, toId: string) {
    if (fromId === toId) return;
    const ordered = [...template.blocks].sort((a, b) => a.order - b.order);
    const fromIndex = ordered.findIndex((b) => b.id === fromId);
    const toIndex = ordered.findIndex((b) => b.id === toId);
    if (fromIndex < 0 || toIndex < 0) return;
    const next = [...ordered];
    const [item] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, item);
    setBlocks(() => next.map((b, i) => ({ ...b, order: i })));
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/campaigns/assign", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: campaign.id,
        formSettings: {
          ...((campaign.formSettings && typeof campaign.formSettings === "object"
            ? campaign.formSettings
            : {}) as object),
          emailResponse: template,
        },
      }),
    });
    setSaving(false);
    if (!res.ok) {
      setMessage("Save failed");
      return;
    }
    setMessage("Email offer saved — sent when someone submits contact capture.");
    router.refresh();
  }

  async function sendTest() {
    setMessage(null);
    const res = await fetch("/api/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: testTo,
        subject: template.subject,
        html: renderEmailPromoHtml({
          template,
          businessName,
          leadName: "Alex",
          logoUrl: template.logoUrl || logoUrl,
          primaryColor,
        }),
      }),
    });
    const data = await res.json().catch(() => ({}));
    setMessage(res.ok ? "Test email sent." : data.error ?? "Send failed");
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-background/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/campaigns/${campaign.id}`}
            className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Campaign
          </Link>
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-orange-400">
              <Mail className="h-4 w-4" />
              Email offer builder
            </p>
            <p className="text-xs text-muted-foreground">{campaign.title}</p>
          </div>
        </div>
        <Button size="sm" onClick={() => void save()} disabled={saving}>
          <Save className="mr-1 h-4 w-4" />
          {saving ? "Saving…" : "Save email"}
        </Button>
      </div>

      {message && <p className="border-b border-border/40 px-4 py-2 text-sm text-primary">{message}</p>}

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside className="w-full shrink-0 overflow-y-auto border-r border-border/60 p-4 lg:w-[300px]">
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={template.enabled && template.sendOnCapture}
                onChange={(e) =>
                  setTemplate((t) => ({
                    ...t,
                    enabled: e.target.checked,
                    sendOnCapture: e.target.checked,
                  }))
                }
              />
              Send on contact submit
            </label>
            <div className="space-y-1">
              <Label className="text-xs">Subject</Label>
              <Input
                value={template.subject}
                onChange={(e) => setTemplate((t) => ({ ...t, subject: e.target.value }))}
              />
            </div>
            <div className="flex flex-wrap gap-3 text-xs">
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={template.showHeader}
                  onChange={(e) => setTemplate((t) => ({ ...t, showHeader: e.target.checked }))}
                />
                Header
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={template.showLogo}
                  onChange={(e) => setTemplate((t) => ({ ...t, showLogo: e.target.checked }))}
                />
                Logo
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={template.showFooter}
                  onChange={(e) => setTemplate((t) => ({ ...t, showFooter: e.target.checked }))}
                />
                Footer
              </label>
            </div>

            <div className="rounded-lg border border-dashed border-orange-500/50 bg-orange-500/10 p-3">
              <Label className="text-xs text-orange-300">Add email block</Label>
              <select
                className="mt-1 flex h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
                value={addType}
                onChange={(e) => setAddType(e.target.value as BlockType)}
              >
                {EMAIL_BLOCKS.map((b) => (
                  <option key={b.type} value={b.type}>
                    {b.label}
                  </option>
                ))}
              </select>
              <Button type="button" size="sm" className="mt-2 w-full" onClick={addBlock}>
                <Plus className="mr-1 h-4 w-4" />
                Add
              </Button>
            </div>

            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Blocks
            </p>
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className={cn(
                "w-full rounded-lg border px-2 py-1.5 text-left text-xs",
                !selectedId
                  ? "border-orange-500 bg-orange-500/15 text-orange-300"
                  : "border-border/50 text-muted-foreground hover:border-orange-500/40"
              )}
            >
              Email settings
            </button>

            {sorted.map((block, index) => (
              <div
                key={block.id}
                draggable
                onDragStart={() => setDragId(block.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragId) reorderBlocks(dragId, block.id);
                  setDragId(null);
                }}
                onDragEnd={() => setDragId(null)}
                onClick={() => setSelectedId(block.id)}
                className={cn(
                  "cursor-pointer rounded-lg border px-2 py-2 text-sm transition",
                  selectedId === block.id
                    ? "border-orange-500 bg-orange-500/15"
                    : "border-border/50 hover:border-orange-500/40",
                  !block.enabled && "opacity-50",
                  dragId === block.id && "opacity-60"
                )}
              >
                <div className="flex items-center gap-1.5">
                  <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate font-medium">{block.label}</span>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      moveBlock(block.id, "up");
                    }}
                    disabled={index === 0}
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      moveBlock(block.id, "down");
                    }}
                    disabled={index === sorted.length - 1}
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      duplicateBlock(block.id);
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    className="text-red-400 hover:text-red-300"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeBlock(block.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="mt-0.5 pl-5 text-[10px] text-muted-foreground">
                  {block.type.replace(/_/g, " ")}
                  {!block.enabled ? " · hidden" : ""}
                </p>
              </div>
            ))}

            <div className="space-y-2 border-t border-border/40 pt-3">
              <Label className="text-xs">Send test</Label>
              <Input
                type="email"
                value={testTo}
                onChange={(e) => setTestTo(e.target.value)}
                placeholder="you@example.com"
                disabled={!emailReady}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                disabled={!emailReady || !testTo}
                onClick={() => void sendTest()}
              >
                Send test email
              </Button>
            </div>
          </div>
        </aside>

        <div className="flex min-h-0 flex-1 flex-col items-center overflow-hidden bg-black/30 p-4">
          <p className="mb-2 text-center text-[11px] text-muted-foreground">
            Live email preview · tap a section to edit · scroll for full layout
          </p>
          <div className="builder-email">
            <div className="builder-email-chrome">
              <p className="truncate text-[11px] text-slate-400">Subject</p>
              <p className="truncate text-sm font-medium text-slate-100">
                {template.subject || "(no subject)"}
              </p>
            </div>
            <div className="builder-email-screen">
              <div
                className="email-preview-sheet"
                onClick={() => setSelectedId(null)}
              >
                {template.showHeader ? (
                  <div className="mb-5 border-b border-slate-200 pb-4 text-center">
                    {template.showLogo && (template.logoUrl || logoUrl) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={template.logoUrl || logoUrl || ""}
                        alt={businessName}
                        className="mx-auto mb-2 max-h-12 max-w-[160px] object-contain"
                      />
                    ) : null}
                    <p className="text-sm font-semibold" style={{ color: primaryColor }}>
                      {businessName}
                    </p>
                  </div>
                ) : null}

                {sorted.map((block) => (
                  <div
                    key={block.id}
                    ref={(el) => {
                      previewRefs.current[block.id] = el;
                    }}
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedId(block.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedId(block.id);
                      }
                    }}
                    className={cn(
                      "email-preview-block",
                      selectedId === block.id && "email-preview-block-selected",
                      !block.enabled && "opacity-40"
                    )}
                  >
                    {selectedId === block.id ? (
                      <span className="email-preview-block-label">{block.label}</span>
                    ) : null}
                    <EmailBlockPreview block={block} primaryColor={primaryColor} />
                  </div>
                ))}

                {template.showFooter ? (
                  <div className="mt-7 border-t border-slate-200 pt-4 text-center text-xs text-slate-400">
                    Sent by {businessName} · Powered by Tap The Magic
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <aside className="w-full shrink-0 overflow-y-auto border-l border-border/60 p-4 lg:w-[320px]">
          <p className="mb-3 text-sm font-semibold">
            {selected ? `Edit: ${selected.label}` : "Email settings"}
          </p>
          {!selected && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Build the email the visitor gets after contact capture. Drag blocks to reorder,
                click the preview to select, use {"{{name}}"} for personalization.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setTemplate(defaultCampaignEmailResponse(businessName))}
              >
                Reset to default offer email
              </Button>
            </div>
          )}
          {selected && (
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selected.enabled}
                  onChange={(e) => patchBlock(selected.id, { enabled: e.target.checked })}
                />
                Enabled
              </label>
              <Input
                value={selected.label}
                onChange={(e) => patchBlock(selected.id, { label: e.target.value })}
              />
              {selected.type === "headline" && (
                <>
                  <Input
                    value={(selected.data as { headline?: string }).headline ?? ""}
                    onChange={(e) => patchBlockData(selected.id, "headline", e.target.value)}
                    placeholder="Headline"
                  />
                  <Input
                    value={(selected.data as { subheadline?: string }).subheadline ?? ""}
                    onChange={(e) => patchBlockData(selected.id, "subheadline", e.target.value)}
                    placeholder="Subheadline"
                  />
                  <select
                    className="flex h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
                    value={(selected.data as { alignment?: string }).alignment ?? "center"}
                    onChange={(e) => patchBlockData(selected.id, "alignment", e.target.value)}
                  >
                    <option value="left">Align left</option>
                    <option value="center">Align center</option>
                    <option value="right">Align right</option>
                  </select>
                </>
              )}
              {selected.type === "rich_text" && (
                <Textarea
                  rows={6}
                  value={(selected.data as { body?: string }).body ?? ""}
                  onChange={(e) => patchBlockData(selected.id, "body", e.target.value)}
                />
              )}
              {selected.type === "hero_image" && (
                <>
                  <MediaPicker
                    label="Image"
                    value={(selected.data as { imageUrl?: string }).imageUrl ?? ""}
                    onChange={(url) => patchBlockData(selected.id, "imageUrl", url)}
                    mediaUploadReady={mediaUploadReady}
                    stockReady={stockReady}
                    campaignId={campaign.id}
                  />
                  <Label className="text-xs">
                    Width (
                    {(selected.data as { widthPercent?: number }).widthPercent ?? 100}
                    %)
                  </Label>
                  <input
                    type="range"
                    min={40}
                    max={100}
                    value={(selected.data as { widthPercent?: number }).widthPercent ?? 100}
                    onChange={(e) =>
                      patchBlockData(selected.id, "widthPercent", Number(e.target.value))
                    }
                    className="w-full"
                  />
                </>
              )}
              {selected.type === "offer_coupon" && (
                <>
                  <Input
                    value={(selected.data as { title?: string }).title ?? ""}
                    onChange={(e) => patchBlockData(selected.id, "title", e.target.value)}
                    placeholder="Offer title"
                  />
                  <Textarea
                    value={(selected.data as { description?: string }).description ?? ""}
                    onChange={(e) => patchBlockData(selected.id, "description", e.target.value)}
                    placeholder="Description"
                  />
                  <Input
                    value={(selected.data as { code?: string }).code ?? ""}
                    onChange={(e) => patchBlockData(selected.id, "code", e.target.value)}
                    placeholder="Code"
                  />
                </>
              )}
              {selected.type === "banner" && (
                <>
                  <Input
                    value={(selected.data as { text?: string }).text ?? ""}
                    onChange={(e) => patchBlockData(selected.id, "text", e.target.value)}
                  />
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={
                        (selected.data as { backgroundColor?: string }).backgroundColor ??
                        "#f97316"
                      }
                      onChange={(e) =>
                        patchBlockData(selected.id, "backgroundColor", e.target.value)
                      }
                    />
                    <input
                      type="color"
                      value={(selected.data as { textColor?: string }).textColor ?? "#0b0f19"}
                      onChange={(e) => patchBlockData(selected.id, "textColor", e.target.value)}
                    />
                  </div>
                </>
              )}
              {selected.type === "button_group" && (
                <>
                  <Input
                    value={
                      ((selected.data as { buttons?: { label: string }[] }).buttons?.[0]
                        ?.label as string) ?? ""
                    }
                    onChange={(e) => {
                      const buttons =
                        (selected.data as { buttons?: Record<string, unknown>[] }).buttons ?? [];
                      const next = [...buttons];
                      next[0] = { ...next[0], label: e.target.value };
                      patchBlockData(selected.id, "buttons", next);
                    }}
                    placeholder="Button label"
                  />
                  <Input
                    value={
                      ((selected.data as { buttons?: { url: string }[] }).buttons?.[0]
                        ?.url as string) ?? ""
                    }
                    onChange={(e) => {
                      const buttons =
                        (selected.data as { buttons?: Record<string, unknown>[] }).buttons ?? [];
                      const next = [...buttons];
                      next[0] = { ...next[0], url: e.target.value };
                      patchBlockData(selected.id, "buttons", next);
                    }}
                    placeholder="Button URL"
                  />
                </>
              )}
              {selected.type === "spacer" && (
                <select
                  className="flex h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
                  value={(selected.data as { height?: string }).height ?? "md"}
                  onChange={(e) => patchBlockData(selected.id, "height", e.target.value)}
                >
                  <option value="sm">Small</option>
                  <option value="md">Medium</option>
                  <option value="lg">Large</option>
                  <option value="xl">Extra large</option>
                </select>
              )}
              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => duplicateBlock(selected.id)}
                >
                  <Copy className="mr-1 h-3.5 w-3.5" />
                  Duplicate
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1 text-red-400"
                  onClick={() => removeBlock(selected.id)}
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5" />
                  Delete
                </Button>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function EmailBlockPreview({
  block,
  primaryColor,
}: {
  block: ContentBlock;
  primaryColor: string;
}) {
  const data = block.data as Record<string, unknown>;
  const name = "Alex";

  switch (block.type) {
    case "headline": {
      const align = (data.alignment as string) || "center";
      return (
        <div style={{ textAlign: align as "left" | "center" | "right" }}>
          <h1 className="m-0 text-[22px] font-semibold text-slate-900">
            {String(data.headline || "").replaceAll("{{name}}", name) || "Headline"}
          </h1>
          {data.subheadline ? (
            <p className="mt-2 mb-0 text-slate-500">
              {String(data.subheadline).replaceAll("{{name}}", name)}
            </p>
          ) : null}
        </div>
      );
    }
    case "rich_text":
      return (
        <p className="m-0 whitespace-pre-wrap text-slate-800">
          {String(data.body || "").replaceAll("{{name}}", name)}
        </p>
      );
    case "hero_image": {
      const url = String(data.imageUrl || "");
      const width = Number(data.widthPercent) || 100;
      if (!url) {
        return (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-xs text-slate-400">
            Add an image
          </div>
        );
      }
      return (
        <div className="text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt=""
            style={{ width: `${width}%`, maxWidth: "100%" }}
            className="inline-block rounded-xl"
          />
        </div>
      );
    }
    case "offer_coupon":
      return (
        <div
          className="rounded-2xl border-2 border-dashed bg-slate-50 p-5 text-center"
          style={{ borderColor: primaryColor }}
        >
          <p className="m-0 text-lg font-bold text-slate-900">
            {String(data.title || "Your offer")}
          </p>
          {data.description ? (
            <p className="mt-2 mb-3 text-sm text-slate-500">{String(data.description)}</p>
          ) : null}
          {data.code ? (
            <span
              className="inline-block rounded-lg px-4 py-2 text-xl font-extrabold tracking-wider text-slate-950"
              style={{ background: primaryColor }}
            >
              {String(data.code)}
            </span>
          ) : null}
        </div>
      );
    case "banner":
      return (
        <div
          className="rounded-[10px] px-4 py-3.5 text-center font-semibold"
          style={{
            background: String(data.backgroundColor || primaryColor),
            color: String(data.textColor || "#0b0f19"),
          }}
        >
          {String(data.text || "Banner")}
        </div>
      );
    case "button_group": {
      const buttons = (data.buttons as { label: string; url: string }[]) ?? [];
      return (
        <div className="space-y-3 text-center">
          {buttons.map((btn, i) => (
            <div key={i}>
              <span
                className="inline-block rounded-[10px] px-5 py-3 font-semibold text-slate-950"
                style={{ background: primaryColor }}
              >
                {btn.label || "Button"}
              </span>
            </div>
          ))}
        </div>
      );
    }
    case "spacer": {
      const h =
        data.height === "sm" ? 12 : data.height === "lg" ? 36 : data.height === "xl" ? 48 : 20;
      return (
        <div
          className="flex items-center justify-center border border-dashed border-slate-200 text-[10px] text-slate-400"
          style={{ height: h }}
        >
          spacer
        </div>
      );
    }
    default:
      return (
        <p className="m-0 text-xs text-slate-400">{block.type.replace(/_/g, " ")}</p>
      );
  }
}
