"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Eye,
  GripVertical,
  Mail,
  Calendar,
  Plus,
  QrCode,
  Save,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CampaignPageRenderer } from "@/components/tap/campaign-renderer";
import { MediaPicker } from "@/components/media/media-picker";
import { BlockStyleControls } from "@/components/workbench/block-style-controls";
import { QrPanel } from "@/components/campaign/qr-panel";
import { SchedulePanel } from "@/components/campaign/schedule-panel";
import { EmailTemplatePanel } from "@/components/campaign/email-template-panel";
import { AiAssistPanel } from "@/components/campaign/ai-assist-panel";
import { CampaignActions } from "@/components/campaign/campaign-actions";
import { cn } from "@/lib/utils";
import { nanoid } from "nanoid";
import type { BlockStyle, BlockType, ButtonItem, ContentBlock } from "@/lib/types/campaign";

type EditorTab = "content" | "qr" | "schedule" | "email" | "ai";

const ADDABLE_BLOCKS: { type: BlockType; label: string; data: Record<string, unknown> }[] = [
  {
    type: "headline",
    label: "Headline",
    data: { headline: "New headline", subheadline: "", alignment: "center" },
  },
  { type: "rich_text", label: "Text", data: { body: "Add your story here." } },
  { type: "hero_image", label: "Hero image", data: { imageUrl: "", altText: "", aspect: "4/3", objectFit: "cover", focalY: 50 } },
  {
    type: "hero_video",
    label: "Hero video",
    data: { videoUrl: "", title: "", provider: "youtube", autoplay: true },
  },
  {
    type: "product_details",
    label: "Product details",
    data: { name: "Product", description: "", features: [], price: "" },
  },
  {
    type: "email_capture",
    label: "Contact capture",
    data: {
      headline: "Unlock your offer",
      description: "Enter your info to reveal the coupon below.",
      buttonLabel: "Unlock",
      fields: ["name", "email"],
      requireName: true,
      successMessage: "You're in — your coupon is below.",
    },
  },
  {
    type: "offer_coupon",
    label: "Offer / Coupon",
    data: {
      title: "Special offer",
      description: "Show this code in store.",
      code: "SAVE10",
      ctaLabel: "Got it",
      lockedUntilContact: true,
    },
  },
  {
    type: "button_group",
    label: "Link buttons",
    data: {
      layout: "stack",
      buttons: [
        {
          id: nanoid(6),
          label: "Visit website",
          url: "https://",
          style: "primary",
          icon: "link",
          size: "md",
          fullWidth: true,
          openInNewTab: true,
        },
      ],
    },
  },
  {
    type: "action_block",
    label: "Quick actions",
    data: {
      actions: [
        { id: nanoid(6), type: "call", label: "Call" },
        { id: nanoid(6), type: "directions", label: "Directions" },
      ],
    },
  },
  { type: "faq", label: "FAQ", data: { headline: "FAQ", items: [{ id: nanoid(6), question: "Question?", answer: "Answer." }] } },
  { type: "disclaimer", label: "Disclaimer", data: { text: "Offer terms apply." } },
  {
    type: "google_review",
    label: "Google review",
    data: {
      headline: "Enjoyed your visit?",
      description: "Your review helps others find us.",
      reviewUrl: "",
      buttonLabel: "Review us on Google",
      badgeStyle: "google_g",
    },
  },
  {
    type: "upcoming_schedule",
    label: "Coming up",
    data: { headline: "Coming up" },
  },
  {
    type: "map_location",
    label: "Map / directions",
    data: { headline: "Find us", address: "", buttonLabel: "Get directions" },
  },
];

interface CampaignEditorProps {
  campaign: {
    id: string;
    title: string;
    status: string;
    contentBlocks: ContentBlock[];
    themeOverrides: Record<string, string>;
  };
  brandKit: {
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    textColor: string;
    logoUrl?: string | null;
  };
  businessId: string;
  devices: { id: string; nickname: string | null; deviceCode: string }[];
  siblingCampaigns: { id: string; title: string; status: string }[];
  integrations: {
    mediaUpload: boolean;
    stockImages: boolean;
    ai: boolean;
    email: boolean;
  };
  subscriptionTier: string;
}

const TABS: { id: EditorTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "content", label: "Content", icon: Eye },
  { id: "qr", label: "QR Code", icon: QrCode },
  { id: "schedule", label: "Schedule", icon: Calendar },
  { id: "email", label: "Email", icon: Mail },
  { id: "ai", label: "AI Assist", icon: Sparkles },
];

export function CampaignEditor({
  campaign,
  brandKit,
  businessId,
  devices,
  siblingCampaigns,
  integrations,
  subscriptionTier,
}: CampaignEditorProps) {
  const router = useRouter();
  const [tab, setTab] = useState<EditorTab>("content");
  const [title, setTitle] = useState(campaign.title);
  const [status, setStatus] = useState(campaign.status);
  const [blocks, setBlocks] = useState<ContentBlock[]>(campaign.contentBlocks);
  const [theme, setTheme] = useState({
    primaryColor: campaign.themeOverrides?.primaryColor ?? brandKit.primaryColor,
    secondaryColor: campaign.themeOverrides?.secondaryColor ?? brandKit.secondaryColor,
    backgroundColor: campaign.themeOverrides?.backgroundColor ?? brandKit.backgroundColor,
    textColor: campaign.themeOverrides?.textColor ?? brandKit.textColor,
    backgroundImage: campaign.themeOverrides?.backgroundImage ?? "",
    backgroundOverlayOpacity: Number(
      campaign.themeOverrides?.backgroundOverlayOpacity ?? 55
    ),
    fontStyle: campaign.themeOverrides?.fontStyle ?? "sans",
  });
  const [selectedDevice, setSelectedDevice] = useState(devices[0]?.id ?? "");
  const [showPreview, setShowPreview] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [addType, setAddType] = useState<BlockType>("offer_coupon");
  const [dragId, setDragId] = useState<string | null>(null);

  const selectedDeviceCode = devices.find((d) => d.id === selectedDevice)?.deviceCode;

  function updateBlock(id: string, updates: Partial<ContentBlock>) {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...updates } : b)));
  }

  function updateBlockData(id: string, key: string, value: unknown) {
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === id ? { ...b, data: { ...b.data, [key]: value } } : b
      )
    );
  }

  function removeBlock(id: string) {
    setBlocks((prev) =>
      prev
        .filter((b) => b.id !== id)
        .sort((a, b) => a.order - b.order)
        .map((b, i) => ({ ...b, order: i }))
    );
  }

  function duplicateBlock(id: string) {
    const sorted = [...blocks].sort((a, b) => a.order - b.order);
    const index = sorted.findIndex((b) => b.id === id);
    if (index < 0) return;
    const source = sorted[index];
    const clone: ContentBlock = {
      ...structuredClone(source),
      id: nanoid(8),
      label: `${source.label} copy`,
      order: source.order + 1,
    };
    const next = [...sorted];
    next.splice(index + 1, 0, clone);
    setBlocks(next.map((b, i) => ({ ...b, order: i })));
    setMessage("Block duplicated");
  }

  function addBlock(type: BlockType = addType) {
    const preset = ADDABLE_BLOCKS.find((b) => b.type === type) ?? ADDABLE_BLOCKS[0];
    const nextOrder = blocks.length ? Math.max(...blocks.map((b) => b.order)) + 1 : 0;
    setBlocks((prev) => [
      ...prev,
      {
        id: nanoid(8),
        type: preset.type,
        label: preset.label,
        order: nextOrder,
        enabled: true,
        data: structuredClone(preset.data),
      },
    ]);
  }

  function moveBlock(id: string, direction: "up" | "down") {
    const sorted = [...blocks].sort((a, b) => a.order - b.order);
    const index = sorted.findIndex((b) => b.id === id);
    if (index < 0) return;
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= sorted.length) return;
    const newBlocks = sorted.map((b, i) => {
      if (i === index) return { ...b, order: swapIndex };
      if (i === swapIndex) return { ...b, order: index };
      return b;
    });
    setBlocks(newBlocks);
  }

  function reorderBlocks(fromId: string, toId: string) {
    if (fromId === toId) return;
    const sorted = [...blocks].sort((a, b) => a.order - b.order);
    const fromIndex = sorted.findIndex((b) => b.id === fromId);
    const toIndex = sorted.findIndex((b) => b.id === toId);
    if (fromIndex < 0 || toIndex < 0) return;
    const next = [...sorted];
    const [item] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, item);
    setBlocks(next.map((b, i) => ({ ...b, order: i })));
  }

  async function saveCampaign(publish = false) {
    setSaving(true);
    setMessage(null);

    const nextStatus = publish
      ? "LIVE"
      : status === "LIVE" || status === "READY" || status === "SCHEDULED"
        ? status
        : "DRAFT";

    const res = await fetch("/api/campaigns/assign", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: campaign.id,
        title,
        contentBlocks: blocks,
        themeOverrides: theme,
        status: nextStatus,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage(data.error ?? "Failed to save");
      setSaving(false);
      return;
    }

    setStatus(nextStatus);

    if (publish && selectedDevice) {
      const assignRes = await fetch("/api/campaigns/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceSlotId: selectedDevice,
          campaignId: campaign.id,
        }),
      });
      if (!assignRes.ok) {
        setMessage("Saved but failed to assign to device");
        setSaving(false);
        return;
      }
      setStatus("LIVE");
    }

    setMessage(publish ? "Published to device!" : "Saved — live pages keep their status.");
    setSaving(false);
    router.refresh();
  }

  const sortedBlocks = [...blocks].sort((a, b) => a.order - b.order);

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col lg:flex-row">
      <div className="flex-1 overflow-y-auto border-r border-border/60">
        <div className="sticky top-0 z-10 border-b border-border/60 bg-background/95 px-6 py-3 backdrop-blur">
          <div className="mb-3 flex items-center justify-between gap-4">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="max-w-md font-semibold"
            />
            <div className="flex flex-wrap items-center justify-end gap-2">
              <CampaignActions campaignId={campaign.id} status={campaign.status} />
              <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)}>
                <Eye className="mr-1 h-4 w-4" />
                Preview
              </Button>
              <Button variant="outline" size="sm" onClick={() => saveCampaign(false)} disabled={saving}>
                <Save className="mr-1 h-4 w-4" />
                Save
              </Button>
              <Button size="sm" onClick={() => saveCampaign(true)} disabled={saving || !selectedDevice}>
                <Send className="mr-1 h-4 w-4" />
                Publish
              </Button>
            </div>
          </div>
          <div className="flex gap-1 overflow-x-auto">
            {TABS.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition-colors",
                    tab === t.id ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-accent"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-6">
          {message && <p className="mb-4 text-sm text-primary">{message}</p>}

          {tab === "content" && (
            <>
              <div className="mb-6 rounded-lg border border-border/60 p-4">
                <h3 className="mb-3 text-sm font-semibold">Theme & branding</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {(["primaryColor", "secondaryColor", "backgroundColor", "textColor"] as const).map((key) => (
                    <div key={key} className="space-y-1">
                      <Label className="text-xs capitalize">{key.replace("Color", "")}</Label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={theme[key]}
                          onChange={(e) => setTheme((t) => ({ ...t, [key]: e.target.value }))}
                          className="h-9 w-10 cursor-pointer rounded border-0"
                        />
                        <Input
                          value={theme[key]}
                          onChange={(e) => setTheme((t) => ({ ...t, [key]: e.target.value }))}
                          className="font-mono text-xs"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 space-y-1">
                  <Label className="text-xs">Page font</Label>
                  <select
                    className="flex h-9 w-full max-w-xs rounded-lg border border-input bg-background/50 px-2 text-sm"
                    value={theme.fontStyle ?? "sans"}
                    onChange={(e) =>
                      setTheme((t) => ({ ...t, fontStyle: e.target.value }))
                    }
                  >
                    <option value="sans">Modern sans</option>
                    <option value="serif">Classic serif</option>
                    <option value="display">Display / bold</option>
                  </select>
                </div>
                <div className="mt-4 space-y-3">
                  <MediaPicker
                    label="Page background image (optional)"
                    value={theme.backgroundImage}
                    onChange={(url) => setTheme((t) => ({ ...t, backgroundImage: url }))}
                    mediaUploadReady={integrations.mediaUpload}
                    stockReady={integrations.stockImages}
                    campaignId={campaign.id}
                  />
                  {theme.backgroundImage ? (
                    <div className="space-y-1">
                      <Label className="text-xs">
                        Background dim / transparency ({theme.backgroundOverlayOpacity}%)
                      </Label>
                      <input
                        type="range"
                        min={0}
                        max={90}
                        value={theme.backgroundOverlayOpacity}
                        onChange={(e) =>
                          setTheme((t) => ({
                            ...t,
                            backgroundOverlayOpacity: Number(e.target.value),
                          }))
                        }
                        className="w-full"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Higher = darker overlay so text stays readable over the photo.
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>

              {devices.length > 0 && (
                <div className="mb-6 space-y-2">
                  <Label>Publish to device</Label>
                  <select
                    value={selectedDevice}
                    onChange={(e) => setSelectedDevice(e.target.value)}
                    className="flex h-10 w-full rounded-lg border border-input bg-background/50 px-3 text-sm"
                  >
                    {devices.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.nickname ?? d.deviceCode}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-4">
                <div className="rounded-xl border-2 border-dashed border-primary/50 bg-primary/10 p-4 shadow-[0_0_24px_rgba(163,230,53,0.08)]">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-primary">Add a content block</p>
                      <p className="text-xs text-muted-foreground">
                        Buttons, links, images, offers, forms — drop them into your mini-page
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={addType}
                        onChange={(e) => setAddType(e.target.value as BlockType)}
                        className="flex h-10 min-w-[160px] rounded-lg border border-primary/30 bg-background px-3 text-sm"
                      >
                        {ADDABLE_BLOCKS.map((b) => (
                          <option key={b.type} value={b.type}>
                            {b.label}
                          </option>
                        ))}
                      </select>
                      <Button type="button" size="default" onClick={() => addBlock()}>
                        <Plus className="mr-1 h-4 w-4" />
                        Add block
                      </Button>
                      <Button
                        type="button"
                        size="default"
                        variant="outline"
                        className="border-primary/40"
                        onClick={() => addBlock("button_group")}
                      >
                        <Plus className="mr-1 h-4 w-4" />
                        Add link buttons
                      </Button>
                    </div>
                  </div>
                </div>

                <h3 className="text-sm font-semibold text-muted-foreground">Your blocks</h3>
                {sortedBlocks.map((block, index) => (
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
                    className={`rounded-lg border p-4 transition-opacity ${
                      block.enabled ? "border-border/60" : "border-border/30 opacity-50"
                    } ${dragId === block.id ? "opacity-60 ring-1 ring-primary/40" : ""}`}
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          className="cursor-grab text-muted-foreground active:cursor-grabbing"
                          title="Drag to reorder"
                          aria-label="Drag to reorder"
                        >
                          <GripVertical className="h-4 w-4" />
                        </button>
                        <input
                          type="checkbox"
                          checked={block.enabled}
                          onChange={(e) => updateBlock(block.id, { enabled: e.target.checked })}
                        />
                        <Input
                          value={block.label}
                          onChange={(e) => updateBlock(block.id, { label: e.target.value })}
                          className="h-8 max-w-[180px] font-medium"
                        />
                        <span className="text-xs text-muted-foreground">({block.type.replace(/_/g, " ")})</span>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => moveBlock(block.id, "up")} disabled={index === 0}>
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => moveBlock(block.id, "down")} disabled={index === sortedBlocks.length - 1}>
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => duplicateBlock(block.id)}
                          title="Duplicate block"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeBlock(block.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <BlockFields
                      block={block}
                      onUpdate={(key, value) => updateBlockData(block.id, key, value)}
                      onStyleChange={(style) => updateBlock(block.id, { style })}
                      mediaUploadReady={integrations.mediaUpload}
                      stockReady={integrations.stockImages}
                      campaignId={campaign.id}
                    />
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => addBlock()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 py-4 text-sm font-semibold text-primary transition hover:border-primary hover:bg-primary/15"
                >
                  <Plus className="h-5 w-5" />
                  Add another block
                </button>
              </div>
            </>
          )}

          {tab === "qr" && (
            <QrPanel
              campaignId={campaign.id}
              campaignTitle={title}
              deviceCode={selectedDeviceCode}
            />
          )}

          {tab === "schedule" && (
            <SchedulePanel
              campaignId={campaign.id}
              devices={devices}
              campaigns={siblingCampaigns.length ? siblingCampaigns : [{ id: campaign.id, title, status }]}
            />
          )}

          {tab === "email" && <EmailTemplatePanel emailReady={integrations.email} />}

          {tab === "ai" && (
            <AiAssistPanel
              aiReady={integrations.ai}
              tier={subscriptionTier}
              onApplyDraft={({ title: nextTitle, blocks: nextBlocks, theme: nextTheme }) => {
                if (nextTitle) setTitle(nextTitle);
                setBlocks(nextBlocks);
                if (nextTheme) {
                  setTheme((t) => ({
                    ...t,
                    ...nextTheme,
                    backgroundImage:
                      (nextTheme as { backgroundImage?: string }).backgroundImage ??
                      t.backgroundImage,
                    backgroundOverlayOpacity:
                      (nextTheme as { backgroundOverlayOpacity?: number })
                        .backgroundOverlayOpacity ?? t.backgroundOverlayOpacity,
                  }));
                }
                setShowPreview(true);
                setTab("content");
                setMessage("AI draft applied — review blocks & colors, then Save.");
              }}
            />
          )}
        </div>
      </div>

      {showPreview && tab === "content" && (
        <div className="w-full shrink-0 overflow-hidden bg-black/40 lg:w-[400px]">
          <div className="border-b border-border/60 px-4 py-2 text-center text-xs text-muted-foreground">
            Mobile preview {brandKit.logoUrl ? "· brand applied" : ""} · {status.toLowerCase()}
          </div>
          <div className="h-full overflow-y-auto">
            <CampaignPageRenderer
              blocks={blocks}
              theme={theme}
              campaignId={campaign.id}
              deviceSlotId="preview"
              businessId={businessId}
              businessName="Preview"
              logoUrl={brandKit.logoUrl}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function BlockFields({
  block,
  onUpdate,
  onStyleChange,
  mediaUploadReady,
  stockReady,
  campaignId,
}: {
  block: ContentBlock;
  onUpdate: (key: string, value: unknown) => void;
  onStyleChange: (style: BlockStyle) => void;
  mediaUploadReady: boolean;
  stockReady: boolean;
  campaignId: string;
}) {
  const data = block.data as Record<string, unknown>;

  const styleControls = (
    <BlockStyleControls style={block.style} onChange={onStyleChange} />
  );

  if (block.type === "hero_image") {
    return (
      <div className="space-y-3">
        <MediaPicker
          label="Hero image"
          value={(data.imageUrl as string) ?? ""}
          onChange={(url) => onUpdate("imageUrl", url)}
          mediaUploadReady={mediaUploadReady}
          stockReady={stockReady}
          campaignId={campaignId}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">Frame shape</Label>
            <select
              className="flex h-9 w-full rounded-lg border border-input bg-background/50 px-2 text-sm"
              value={(data.aspect as string) ?? "4/3"}
              onChange={(e) => onUpdate("aspect", e.target.value)}
            >
              <option value="4/3">4:3 classic</option>
              <option value="16/9">16:9 wide</option>
              <option value="1/1">1:1 square</option>
              <option value="21/9">21:9 cinematic</option>
              <option value="auto">Natural height</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Fit</Label>
            <select
              className="flex h-9 w-full rounded-lg border border-input bg-background/50 px-2 text-sm"
              value={(data.objectFit as string) ?? "cover"}
              onChange={(e) => onUpdate("objectFit", e.target.value)}
            >
              <option value="cover">Fill / crop (cover)</option>
              <option value="contain">Fit whole image (contain)</option>
            </select>
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">
            Vertical focus ({typeof data.focalY === "number" ? data.focalY : 50}%)
          </Label>
          <input
            type="range"
            min={0}
            max={100}
            value={typeof data.focalY === "number" ? data.focalY : 50}
            onChange={(e) => onUpdate("focalY", Number(e.target.value))}
            className="w-full"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Overlay text</Label>
          <Input
            value={(data.overlayText as string) ?? ""}
            onChange={(e) => onUpdate("overlayText", e.target.value)}
            placeholder="Optional caption on the image"
          />
        </div>
        {styleControls}
      </div>
    );
  }

  if (block.type === "hero_video") {
    return (
      <div className="space-y-3">
        <div className="space-y-1">
          <Label className="text-xs">YouTube URL</Label>
          <Input
            value={(data.videoUrl as string) ?? ""}
            onChange={(e) => onUpdate("videoUrl", e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Title</Label>
          <Input
            value={(data.title as string) ?? ""}
            onChange={(e) => onUpdate("title", e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={data.autoplay === true}
            onChange={(e) => onUpdate("autoplay", e.target.checked)}
          />
          Autoplay muted when page opens
        </label>
        <p className="text-[11px] text-muted-foreground">
          Browsers require muted autoplay. Sound stays off until the visitor unmutes on YouTube.
        </p>
        {styleControls}
      </div>
    );
  }

  if (block.type === "button_group") {
    const buttons = (data.buttons as ButtonItem[]) ?? [];
    const layout = (data.layout as string) ?? "stack";

    function setButtons(next: ButtonItem[]) {
      onUpdate("buttons", next);
    }

    function patchBtn(id: string, patch: Partial<ButtonItem>) {
      setButtons(buttons.map((b) => (b.id === id ? { ...b, ...patch } : b)));
    }

    return (
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Link buttons for website, menu, booking, Instagram, phone (<code>tel:</code>), email (
          <code>mailto:</code>), and more.
        </p>
        <div className="space-y-1">
          <Label className="text-xs">Layout</Label>
          <select
            className="flex h-9 w-full rounded-lg border border-input bg-background/50 px-2 text-sm"
            value={layout}
            onChange={(e) => onUpdate("layout", e.target.value)}
          >
            <option value="stack">Stacked (full width)</option>
            <option value="row">Side by side</option>
          </select>
        </div>
        {buttons.map((btn, index) => (
          <div
            key={btn.id}
            className="space-y-2 rounded-lg border border-border/50 bg-background/40 p-3"
          >
            <div className="flex items-center justify-between">
              <Label className="text-xs">Button {index + 1}</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-red-400"
                onClick={() => setButtons(buttons.filter((b) => b.id !== btn.id))}
              >
                Remove
              </Button>
            </div>
            <Input
              placeholder="Button label (e.g. Book now)"
              value={btn.label}
              onChange={(e) => patchBtn(btn.id, { label: e.target.value })}
            />
            <Input
              placeholder="https://… or tel:+15551234567 or mailto:hello@…"
              value={btn.url}
              onChange={(e) => patchBtn(btn.id, { url: e.target.value })}
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-[10px]">Style</Label>
                <select
                  className="flex h-9 w-full rounded-lg border border-input bg-background/50 px-2 text-sm"
                  value={btn.style}
                  onChange={(e) =>
                    patchBtn(btn.id, { style: e.target.value as ButtonItem["style"] })
                  }
                >
                  <option value="primary">Primary fill</option>
                  <option value="secondary">Secondary fill</option>
                  <option value="outline">Outline</option>
                  <option value="ghost">Ghost / text</option>
                  <option value="soft">Soft tint</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Icon</Label>
                <select
                  className="flex h-9 w-full rounded-lg border border-input bg-background/50 px-2 text-sm"
                  value={btn.icon ?? "none"}
                  onChange={(e) =>
                    patchBtn(btn.id, { icon: e.target.value as ButtonItem["icon"] })
                  }
                >
                  <option value="none">None</option>
                  <option value="link">Link</option>
                  <option value="phone">Phone</option>
                  <option value="mail">Email</option>
                  <option value="map">Map</option>
                  <option value="star">Star</option>
                  <option value="cart">Cart</option>
                  <option value="calendar">Calendar</option>
                  <option value="play">Play</option>
                  <option value="external">External</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Size</Label>
                <select
                  className="flex h-9 w-full rounded-lg border border-input bg-background/50 px-2 text-sm"
                  value={btn.size ?? "md"}
                  onChange={(e) =>
                    patchBtn(btn.id, { size: e.target.value as ButtonItem["size"] })
                  }
                >
                  <option value="sm">Small</option>
                  <option value="md">Medium</option>
                  <option value="lg">Large</option>
                </select>
              </div>
              <div className="flex flex-col justify-end gap-2 pb-1">
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={btn.fullWidth !== false}
                    onChange={(e) => patchBtn(btn.id, { fullWidth: e.target.checked })}
                  />
                  Full width
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={btn.openInNewTab !== false}
                    onChange={(e) => patchBtn(btn.id, { openInNewTab: e.target.checked })}
                  />
                  Open in new tab
                </label>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {[
                { label: "Call", url: "tel:+1", icon: "phone" as const },
                { label: "Email", url: "mailto:", icon: "mail" as const },
                { label: "Maps", url: "https://maps.google.com/?q=", icon: "map" as const },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  className="rounded border border-border/50 px-2 py-0.5 text-[10px] text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  onClick={() =>
                    patchBtn(btn.id, {
                      label: preset.label,
                      url: preset.url,
                      icon: preset.icon,
                    })
                  }
                >
                  {preset.label} preset
                </button>
              ))}
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            setButtons([
              ...buttons,
              {
                id: nanoid(6),
                label: "New link",
                url: "https://",
                style: "primary",
                icon: "link",
                size: "md",
                fullWidth: true,
                openInNewTab: true,
              },
            ])
          }
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add another button
        </Button>
        {styleControls}
      </div>
    );
  }

  if (block.type === "google_review") {
    return (
      <div className="space-y-3">
        <div className="space-y-1">
          <Label className="text-xs">Headline</Label>
          <Input
            value={(data.headline as string) ?? ""}
            onChange={(e) => onUpdate("headline", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Description</Label>
          <Textarea
            value={(data.description as string) ?? ""}
            onChange={(e) => onUpdate("description", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Google Review URL</Label>
          <Input
            value={(data.reviewUrl as string) ?? ""}
            onChange={(e) => onUpdate("reviewUrl", e.target.value)}
            placeholder="https://g.page/r/… or maps.google.com/…"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Button label</Label>
          <Input
            value={(data.buttonLabel as string) ?? ""}
            onChange={(e) => onUpdate("buttonLabel", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Badge / logo style</Label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(
              [
                { id: "google_g", label: "Google G" },
                { id: "stars", label: "5 stars" },
                { id: "badge", label: "Reviews badge" },
                { id: "pill", label: "Google pill" },
                { id: "outline", label: "Clean outline" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onUpdate("badgeStyle", opt.id)}
                className={cn(
                  "rounded-lg border px-2 py-2 text-left text-xs transition",
                  (data.badgeStyle ?? "google_g") === opt.id
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border/50 text-muted-foreground hover:border-primary/40"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        {styleControls}
      </div>
    );
  }

  const textFields: Record<string, { key: string; label: string; multiline?: boolean }[]> = {
    headline: [
      { key: "headline", label: "Headline" },
      { key: "subheadline", label: "Subheadline" },
    ],
    rich_text: [{ key: "body", label: "Body text", multiline: true }],
    product_details: [
      { key: "name", label: "Product name" },
      { key: "description", label: "Description", multiline: true },
      { key: "price", label: "Price" },
    ],
    offer_coupon: [
      { key: "title", label: "Offer title" },
      { key: "description", label: "Description", multiline: true },
      { key: "code", label: "Coupon code" },
      { key: "ctaLabel", label: "Button label" },
    ],
    email_capture: [
      { key: "headline", label: "Headline" },
      { key: "description", label: "Description" },
      { key: "buttonLabel", label: "Button label" },
      { key: "successMessage", label: "Success message (after contact submitted)" },
    ],
    feedback_form: [
      { key: "headline", label: "Headline" },
      { key: "description", label: "Description" },
      { key: "buttonLabel", label: "Button label" },
      { key: "successMessage", label: "Success message" },
    ],
    map_location: [
      { key: "headline", label: "Headline" },
      { key: "address", label: "Address" },
      { key: "buttonLabel", label: "Button label" },
    ],
    disclaimer: [{ key: "text", label: "Disclaimer text", multiline: true }],
  };

  const fields = textFields[block.type];
  if (!fields) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Content fields for this block type are limited — use Block design below to style it.
        </p>
        {styleControls}
      </div>
    );
  }

  const emailFields = ((data.fields as string[]) ?? ["email"]).filter(Boolean);
  const hasName = emailFields.includes("name");
  const hasPhone = emailFields.includes("phone");

  function setEmailField(field: "name" | "phone", enabled: boolean) {
    const next = new Set(emailFields);
    next.add("email");
    if (enabled) next.add(field);
    else next.delete(field);
    onUpdate("fields", Array.from(next));
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map((field) => (
          <div key={field.key} className={field.multiline ? "sm:col-span-2" : ""}>
            <Label className="text-xs">{field.label}</Label>
            {field.multiline ? (
              <Textarea
                value={(data[field.key] as string) ?? ""}
                onChange={(e) => onUpdate(field.key, e.target.value)}
                className="mt-1"
              />
            ) : (
              <Input
                value={(data[field.key] as string) ?? ""}
                onChange={(e) => onUpdate(field.key, e.target.value)}
                className="mt-1"
              />
            )}
          </div>
        ))}
        {block.type === "headline" && (
          <div className="space-y-1">
            <Label className="text-xs">Alignment</Label>
            <select
              className="mt-1 flex h-9 w-full rounded-lg border border-input bg-background/50 px-2 text-sm"
              value={(data.alignment as string) ?? "center"}
              onChange={(e) => onUpdate("alignment", e.target.value)}
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </div>
        )}
        {block.type === "email_capture" && (
          <div className="sm:col-span-2 space-y-3 rounded-lg border border-border/50 p-3">
            <p className="text-xs font-medium text-muted-foreground">Contact fields</p>
            <label className="flex items-center justify-between gap-3 text-sm">
              <span>Collect name</span>
              <input
                type="checkbox"
                checked={hasName}
                onChange={(e) => {
                  setEmailField("name", e.target.checked);
                  if (!e.target.checked) onUpdate("requireName", false);
                }}
              />
            </label>
            {hasName && (
              <label className="flex items-center justify-between gap-3 text-sm pl-2">
                <span>Require name</span>
                <input
                  type="checkbox"
                  checked={Boolean(data.requireName)}
                  onChange={(e) => onUpdate("requireName", e.target.checked)}
                />
              </label>
            )}
            <label className="flex items-center justify-between gap-3 text-sm">
              <span>Collect phone</span>
              <input
                type="checkbox"
                checked={hasPhone}
                onChange={(e) => {
                  setEmailField("phone", e.target.checked);
                  if (!e.target.checked) onUpdate("requirePhone", false);
                }}
              />
            </label>
            {hasPhone && (
              <label className="flex items-center justify-between gap-3 text-sm pl-2">
                <span>Require phone</span>
                <input
                  type="checkbox"
                  checked={Boolean(data.requirePhone)}
                  onChange={(e) => onUpdate("requirePhone", e.target.checked)}
                />
              </label>
            )}
            <p className="text-xs text-muted-foreground">
              Email is always collected. For coupon pages, put Contact Capture above the Coupon block —
              the code stays locked until they submit.
            </p>
          </div>
        )}
        {block.type === "offer_coupon" && (
          <div className="sm:col-span-2">
            <label className="flex items-center justify-between gap-3 rounded-lg border border-border/50 p-3 text-sm">
              <span>Lock coupon until contact info is submitted</span>
              <input
                type="checkbox"
                checked={data.lockedUntilContact !== false}
                onChange={(e) => onUpdate("lockedUntilContact", e.target.checked)}
              />
            </label>
          </div>
        )}
        {block.type === "product_details" && (
          <div className="sm:col-span-2">
            <Label className="text-xs">Features (one per line)</Label>
            <Textarea
              value={((data.features as string[]) ?? []).join("\n")}
              onChange={(e) => onUpdate("features", e.target.value.split("\n").filter(Boolean))}
              className="mt-1"
            />
          </div>
        )}
      </div>
      {styleControls}
    </div>
  );
}
