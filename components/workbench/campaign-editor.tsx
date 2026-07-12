"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  Mail,
  Calendar,
  QrCode,
  Save,
  Send,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CampaignPageRenderer } from "@/components/tap/campaign-renderer";
import { MediaPicker } from "@/components/media/media-picker";
import { QrPanel } from "@/components/campaign/qr-panel";
import { SchedulePanel } from "@/components/campaign/schedule-panel";
import { EmailTemplatePanel } from "@/components/campaign/email-template-panel";
import { AiAssistPanel } from "@/components/campaign/ai-assist-panel";
import { CampaignActions } from "@/components/campaign/campaign-actions";
import { cn } from "@/lib/utils";
import type { ContentBlock } from "@/lib/types/campaign";

type EditorTab = "content" | "qr" | "schedule" | "email" | "ai";

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
  integrations,
  subscriptionTier,
}: CampaignEditorProps) {
  const router = useRouter();
  const [tab, setTab] = useState<EditorTab>("content");
  const [title, setTitle] = useState(campaign.title);
  const [blocks, setBlocks] = useState<ContentBlock[]>(campaign.contentBlocks);
  const [theme, setTheme] = useState({
    primaryColor: campaign.themeOverrides?.primaryColor ?? brandKit.primaryColor,
    secondaryColor: campaign.themeOverrides?.secondaryColor ?? brandKit.secondaryColor,
    backgroundColor: campaign.themeOverrides?.backgroundColor ?? brandKit.backgroundColor,
    textColor: campaign.themeOverrides?.textColor ?? brandKit.textColor,
  });
  const [selectedDevice, setSelectedDevice] = useState(devices[0]?.id ?? "");
  const [showPreview, setShowPreview] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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

  async function saveCampaign(publish = false) {
    setSaving(true);
    setMessage(null);

    const res = await fetch("/api/campaigns/assign", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: campaign.id,
        title,
        contentBlocks: blocks,
        themeOverrides: theme,
        status: publish ? "READY" : "DRAFT",
      }),
    });

    if (!res.ok) {
      setMessage("Failed to save");
      setSaving(false);
      return;
    }

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
    }

    setMessage(publish ? "Published to device!" : "Saved — revisit anytime to edit.");
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
                <h3 className="text-sm font-semibold">Content blocks</h3>
                {sortedBlocks.map((block, index) => (
                  <div
                    key={block.id}
                    className={`rounded-lg border p-4 transition-opacity ${block.enabled ? "border-border/60" : "border-border/30 opacity-50"}`}
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={block.enabled}
                          onChange={(e) => updateBlock(block.id, { enabled: e.target.checked })}
                        />
                        <span className="font-medium">{block.label}</span>
                        <span className="text-xs text-muted-foreground">({block.type.replace(/_/g, " ")})</span>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => moveBlock(block.id, "up")} disabled={index === 0}>
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => moveBlock(block.id, "down")} disabled={index === sortedBlocks.length - 1}>
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <BlockFields
                      block={block}
                      onUpdate={(key, value) => updateBlockData(block.id, key, value)}
                      mediaUploadReady={integrations.mediaUpload}
                      stockReady={integrations.stockImages}
                    />
                  </div>
                ))}
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

          {tab === "schedule" && <SchedulePanel campaignId={campaign.id} />}

          {tab === "email" && <EmailTemplatePanel emailReady={integrations.email} />}

          {tab === "ai" && (
            <AiAssistPanel
              aiReady={integrations.ai}
              tier={subscriptionTier}
              onApplyDraft={({ title: nextTitle, blocks: nextBlocks }) => {
                if (nextTitle) setTitle(nextTitle);
                setBlocks(nextBlocks);
                setShowPreview(true);
                setTab("content");
                setMessage("AI draft applied — review blocks, then Save.");
              }}
            />
          )}
        </div>
      </div>

      {showPreview && tab === "content" && (
        <div className="w-full shrink-0 overflow-hidden bg-black/40 lg:w-[400px]">
          <div className="border-b border-border/60 px-4 py-2 text-center text-xs text-muted-foreground">
            Mobile preview {brandKit.logoUrl ? "· brand applied" : ""}
          </div>
          <div className="h-full overflow-y-auto">
            <CampaignPageRenderer
              blocks={blocks}
              theme={theme}
              campaignId={campaign.id}
              deviceSlotId="preview"
              businessId={businessId}
              businessName="Preview"
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
  mediaUploadReady,
  stockReady,
}: {
  block: ContentBlock;
  onUpdate: (key: string, value: unknown) => void;
  mediaUploadReady: boolean;
  stockReady: boolean;
}) {
  const data = block.data as Record<string, unknown>;

  if (block.type === "hero_image") {
    return (
      <MediaPicker
        label="Hero image"
        value={(data.imageUrl as string) ?? ""}
        onChange={(url) => onUpdate("imageUrl", url)}
        mediaUploadReady={mediaUploadReady}
        stockReady={stockReady}
      />
    );
  }

  const textFields: Record<string, { key: string; label: string; multiline?: boolean }[]> = {
    headline: [
      { key: "headline", label: "Headline" },
      { key: "subheadline", label: "Subheadline" },
    ],
    rich_text: [{ key: "body", label: "Body text", multiline: true }],
    hero_video: [
      { key: "videoUrl", label: "Video URL (YouTube — free embed)" },
      { key: "title", label: "Title" },
    ],
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
      { key: "successMessage", label: "Success message" },
    ],
    feedback_form: [
      { key: "headline", label: "Headline" },
      { key: "description", label: "Description" },
      { key: "buttonLabel", label: "Button label" },
      { key: "successMessage", label: "Success message" },
    ],
    google_review: [
      { key: "headline", label: "Headline" },
      { key: "reviewUrl", label: "Google Review URL" },
      { key: "buttonLabel", label: "Button label" },
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
    return <p className="text-xs text-muted-foreground">More field options coming for this block type.</p>;
  }

  return (
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
  );
}
