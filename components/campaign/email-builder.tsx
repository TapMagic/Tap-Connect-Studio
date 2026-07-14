"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mail, Plus, Save, Trash2 } from "lucide-react";
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
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [testTo, setTestTo] = useState("");

  const selected = template.blocks.find((b) => b.id === selectedId) ?? null;
  const sorted = [...template.blocks].sort((a, b) => a.order - b.order);

  function patchBlock(id: string, patch: Partial<ContentBlock>) {
    setTemplate((t) => ({
      ...t,
      blocks: t.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    }));
  }

  function patchBlockData(id: string, key: string, value: unknown) {
    setTemplate((t) => ({
      ...t,
      blocks: t.blocks.map((b) =>
        b.id === id ? { ...b, data: { ...b.data, [key]: value } } : b
      ),
    }));
  }

  function addBlock() {
    const preset = EMAIL_BLOCKS.find((b) => b.type === addType) ?? EMAIL_BLOCKS[0];
    const id = nanoid(8);
    const order = template.blocks.length
      ? Math.max(...template.blocks.map((b) => b.order)) + 1
      : 0;
    setTemplate((t) => ({
      ...t,
      blocks: [
        ...t.blocks,
        {
          id,
          type: preset.type,
          label: preset.label,
          order,
          enabled: true,
          channel: "email",
          data: structuredClone(preset.data),
        },
      ],
    }));
    setSelectedId(id);
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

  const previewHtml = renderEmailPromoHtml({
    template,
    businessName,
    leadName: "Alex",
    logoUrl: template.logoUrl || logoUrl,
    primaryColor,
  });

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
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

            <p className="text-[11px] font-semibold uppercase text-muted-foreground">Blocks</p>
            {sorted.map((block) => (
              <button
                key={block.id}
                type="button"
                onClick={() => setSelectedId(block.id)}
                className={`flex w-full items-center justify-between rounded-lg border px-2 py-2 text-left text-sm ${
                  selectedId === block.id
                    ? "border-orange-500 bg-orange-500/15"
                    : "border-border/50 hover:border-orange-500/40"
                }`}
              >
                <span className="truncate">{block.label}</span>
                <span
                  role="button"
                  tabIndex={0}
                  className="text-red-400"
                  onClick={(e) => {
                    e.stopPropagation();
                    setTemplate((t) => ({
                      ...t,
                      blocks: t.blocks.filter((b) => b.id !== block.id),
                    }));
                    if (selectedId === block.id) setSelectedId(null);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </span>
              </button>
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

        <div className="flex min-h-0 flex-1 flex-col items-center overflow-auto bg-zinc-200/10 p-4">
          <p className="mb-2 text-xs text-muted-foreground">Email layout preview</p>
          <div
            className="w-full max-w-xl overflow-hidden rounded-xl border border-border bg-white shadow-xl"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </div>

        <aside className="w-full shrink-0 overflow-y-auto border-l border-border/60 p-4 lg:w-[320px]">
          <p className="mb-3 text-sm font-semibold">
            {selected ? `Edit: ${selected.label}` : "Select a block"}
          </p>
          {!selected && (
            <p className="text-xs text-muted-foreground">
              Build the email the visitor gets after contact capture — offer code, images, banners,
              buttons. Use {"{{name}}"} for personalization.
            </p>
          )}
          {selected && (
            <div className="space-y-3">
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
                      value={(selected.data as { backgroundColor?: string }).backgroundColor ?? "#f97316"}
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
            </div>
          )}
          {!selected && (
            <div className="mt-4">
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
        </aside>
      </div>
    </div>
  );
}
