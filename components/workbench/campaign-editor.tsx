"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
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
import { IconPicker } from "@/components/design/icon-picker";
import { FinishPicker } from "@/components/design/format-controls";
import { QrPanel } from "@/components/campaign/qr-panel";
import { SchedulePanel } from "@/components/campaign/schedule-panel";
import { EmailTemplatePanel } from "@/components/campaign/email-template-panel";
import { AiAssistPanel } from "@/components/campaign/ai-assist-panel";
import { CampaignActions } from "@/components/campaign/campaign-actions";
import { cn } from "@/lib/utils";
import {
  scrollChildIntoNearestView,
  scrollChildToContainerCenter,
} from "@/lib/utils/builder-scroll";
import { nanoid } from "nanoid";
import type { BlockStyle, BlockType, ButtonItem, ContentBlock } from "@/lib/types/campaign";
import { TAP_CARD_SHAPE_OPTIONS, type TapCardButtonShape } from "@/lib/brand/tap-card";
import {
  defaultEndExperience,
  parseEndExperience,
  type EndExperience,
} from "@/lib/end-experience";

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
    type: "vcard_download",
    label: "Save contact",
    data: { useBrandProfile: true, buttonLabel: "Save to contacts" },
  },
  {
    type: "digital_card",
    label: "Digital card",
    data: {
      useBrandProfile: true,
      showSaveContact: true,
      showShare: true,
      showSocials: true,
      buttonLabel: "Save contact",
    },
  },
  {
    type: "social_links",
    label: "Social icons",
    data: { headline: "Follow us", links: [], layout: "row" },
  },
  {
    type: "map_location",
    label: "Map / directions",
    data: { headline: "Find us", address: "", buttonLabel: "Get directions" },
  },
  { type: "spacer", label: "Spacer", data: { height: "md" } },
  {
    type: "columns",
    label: "2 columns",
    data: {
      columns: [
        { id: nanoid(6), body: "Left column" },
        { id: nanoid(6), body: "Right column" },
      ],
      gap: "md",
    },
  },
  {
    type: "banner",
    label: "Banner",
    data: { text: "Limited time — tap to learn more", backgroundColor: "#a3e635", textColor: "#0b0f19" },
  },
];

interface CampaignEditorProps {
  campaign: {
    id: string;
    title: string;
    status: string;
    contentBlocks: ContentBlock[];
    themeOverrides: Record<string, unknown>;
    scheduledStart?: string | null;
    scheduledEnd?: string | null;
    endExperience?: unknown;
  };
  brandKit: {
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    textColor: string;
    logoUrl?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    website?: string | null;
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
  const [theme, setTheme] = useState<{
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    textColor: string;
    backgroundImage: string;
    backgroundOverlayOpacity: number;
    fontStyle: string;
    showPageLogo: boolean;
    defaultButtonShape: TapCardButtonShape;
    defaultButtonFinish: string;
  }>({
    primaryColor: String(campaign.themeOverrides?.primaryColor ?? brandKit.primaryColor),
    secondaryColor: String(campaign.themeOverrides?.secondaryColor ?? brandKit.secondaryColor),
    backgroundColor: String(campaign.themeOverrides?.backgroundColor ?? brandKit.backgroundColor),
    textColor: String(campaign.themeOverrides?.textColor ?? brandKit.textColor),
    backgroundImage: String(campaign.themeOverrides?.backgroundImage ?? ""),
    backgroundOverlayOpacity: Number(
      campaign.themeOverrides?.backgroundOverlayOpacity ?? 55
    ),
    fontStyle: String(campaign.themeOverrides?.fontStyle ?? "sans"),
    showPageLogo:
      campaign.themeOverrides?.showPageLogo === true ||
      campaign.themeOverrides?.showPageLogo === "true",
    defaultButtonShape: (String(
      campaign.themeOverrides?.defaultButtonShape ?? "pill"
    ) || "pill") as TapCardButtonShape,
    defaultButtonFinish: String(campaign.themeOverrides?.defaultButtonFinish ?? "flat"),
  });
  const [selectedDevice, setSelectedDevice] = useState(devices[0]?.id ?? "");
  const [showPreview, setShowPreview] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [addType, setAddType] = useState<BlockType>("offer_coupon");
  const [dragId, setDragId] = useState<string | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [selectedButtonId, setSelectedButtonId] = useState<string | null>(null);
  const phoneScreenRef = useRef<HTMLDivElement>(null);
  const listRailRef = useRef<HTMLDivElement>(null);
  const [scheduledStart, setScheduledStart] = useState(
    campaign.scheduledStart ? campaign.scheduledStart.slice(0, 16) : ""
  );
  const [scheduledEnd, setScheduledEnd] = useState(
    campaign.scheduledEnd ? campaign.scheduledEnd.slice(0, 16) : ""
  );
  const [endExperience, setEndExperience] = useState<EndExperience>(() =>
    parseEndExperience(campaign.endExperience ?? defaultEndExperience())
  );

  const selectedDeviceCode = devices.find((d) => d.id === selectedDevice)?.deviceCode;
  const selectedBlock = blocks.find((b) => b.id === selectedBlockId) ?? null;

  useEffect(() => {
    if (!selectedBlockId) return;
    const escaped =
      typeof CSS !== "undefined" && CSS.escape
        ? CSS.escape(selectedBlockId)
        : selectedBlockId;

    requestAnimationFrame(() => {
      const phone = phoneScreenRef.current;
      if (phone) {
        const previewEl = phone.querySelector(`[data-block-id="${escaped}"]`);
        if (previewEl instanceof HTMLElement) {
          scrollChildToContainerCenter(phone, previewEl);
        }
      }
      const listRow = listRailRef.current?.querySelector(
        `[data-editor-block-id="${escaped}"]`
      );
      if (listRow instanceof HTMLElement) {
        scrollChildIntoNearestView(listRow);
      }
    });
  }, [selectedBlockId]);

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
    const id = nanoid(8);
    let data = structuredClone(preset.data);
    if (preset.type === "button_group" && Array.isArray(data.buttons)) {
      data = {
        ...data,
        buttons: (data.buttons as ButtonItem[]).map((btn) => ({
          ...btn,
          shape: theme.defaultButtonShape,
          finish: theme.defaultButtonFinish,
        })),
      };
    }
    setBlocks((prev) => [
      ...prev,
      {
        id,
        type: preset.type,
        label: preset.label,
        order: nextOrder,
        enabled: true,
        data,
      },
    ]);
    setSelectedBlockId(id);
    setSelectedButtonId(null);
    setTab("content");
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
        scheduledStart: scheduledStart ? new Date(scheduledStart).toISOString() : null,
        scheduledEnd: scheduledEnd ? new Date(scheduledEnd).toISOString() : null,
        endExperience,
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
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-background/95 px-4 py-2.5 backdrop-blur">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="max-w-md font-semibold"
        />
        <div className="flex flex-wrap items-center gap-2">
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

      {message && <p className="border-b border-border/40 px-4 py-2 text-sm text-primary">{message}</p>}

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Left rail */}
        <aside className="flex w-full shrink-0 flex-col border-r border-border/60 lg:w-[280px]">
          <div className="flex gap-1 overflow-x-auto border-b border-border/50 p-2">
            {TABS.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "flex items-center gap-1 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs transition-colors",
                    tab === t.id ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-accent"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>

          <div className="flex-1 overflow-y-auto p-3" ref={listRailRef}>
            {tab === "content" && (
              <div className="space-y-3">
                <p className="text-[10px] text-muted-foreground">
                  Blocks scroll here · preview &amp; inspector stay in their columns · select to
                  highlight &amp; snap
                </p>
                <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3">
                  <Label className="text-xs text-primary">Add block</Label>
                  <select
                    value={addType}
                    onChange={(e) => setAddType(e.target.value as BlockType)}
                    className="mt-1 flex h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
                  >
                    {ADDABLE_BLOCKS.map((b) => (
                      <option key={b.type} value={b.type}>
                        {b.label}
                      </option>
                    ))}
                  </select>
                  <Button type="button" size="sm" className="mt-2 w-full" onClick={() => addBlock()}>
                    <Plus className="mr-1 h-4 w-4" />
                    Add
                  </Button>
                </div>

                {devices.length > 0 && (
                  <div className="space-y-1">
                    <Label className="text-xs">Publish device</Label>
                    <select
                      value={selectedDevice}
                      onChange={(e) => setSelectedDevice(e.target.value)}
                      className="flex h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
                    >
                      {devices.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.nickname ?? d.deviceCode}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Blocks
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBlockId(null);
                    setSelectedButtonId(null);
                  }}
                  className={cn(
                    "w-full rounded-lg border px-2 py-1.5 text-left text-xs",
                    !selectedBlockId
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/50 text-muted-foreground hover:border-primary/40"
                  )}
                >
                  Page theme
                </button>
                {sortedBlocks.map((block) => (
                  <div
                    key={block.id}
                    data-editor-block-id={block.id}
                    draggable
                    onDragStart={() => setDragId(block.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (dragId) reorderBlocks(dragId, block.id);
                      setDragId(null);
                    }}
                    onDragEnd={() => setDragId(null)}
                    onClick={() => {
                      setSelectedBlockId(block.id);
                      setSelectedButtonId(null);
                    }}
                    className={cn(
                      "cursor-pointer rounded-lg border px-2 py-2 text-sm transition",
                      selectedBlockId === block.id
                        ? "border-primary bg-primary/10 ring-1 ring-primary/40"
                        : "border-border/50 hover:border-primary/40",
                      block.channel === "email" &&
                        "border-orange-500/50 bg-orange-500/10 shadow-[0_0_12px_rgba(249,115,22,0.2)]",
                      !block.enabled && "opacity-50",
                      dragId === block.id && "opacity-60"
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-muted-foreground active:cursor-grabbing" />
                      <span className="min-w-0 flex-1 truncate font-medium">{block.label}</span>
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
                          if (selectedBlockId === block.id) setSelectedBlockId(null);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="mt-0.5 pl-5 text-[10px] text-muted-foreground">
                      {block.type.replace(/_/g, " ")}
                      {block.channel === "email"
                        ? " · email only"
                        : block.channel === "both"
                          ? " · page + email"
                          : ""}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {tab === "qr" && (
              <QrPanel
                campaignId={campaign.id}
                campaignTitle={title}
                deviceCode={selectedDeviceCode}
                devices={devices.map((d) => ({
                  id: d.id,
                  nickname: d.nickname,
                  deviceCode: d.deviceCode,
                }))}
                allowCustomUrl
              />
            )}

            {tab === "schedule" && (
              <div className="space-y-4">
                <div className="space-y-2 rounded-lg border border-border/50 p-3">
                  <h3 className="text-sm font-semibold">Campaign window</h3>
                  <p className="text-[11px] text-muted-foreground">
                    Runs only between these times. After it ends, the end page collects contacts.
                  </p>
                  <div className="space-y-1">
                    <Label className="text-xs">Start</Label>
                    <Input
                      type="datetime-local"
                      value={scheduledStart}
                      onChange={(e) => setScheduledStart(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">End</Label>
                    <Input
                      type="datetime-local"
                      value={scheduledEnd}
                      onChange={(e) => setScheduledEnd(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2 rounded-lg border border-border/50 p-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">After this ends</h3>
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={endExperience.enabled}
                        onChange={(e) =>
                          setEndExperience((x) => ({ ...x, enabled: e.target.checked }))
                        }
                      />
                      On
                    </label>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Default on — orphan tags still get a contact opportunity.
                  </p>
                  <select
                    className="flex h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
                    value={endExperience.mode}
                    onChange={(e) =>
                      setEndExperience((x) => ({
                        ...x,
                        mode: e.target.value as EndExperience["mode"],
                      }))
                    }
                  >
                    <option value="blocks">Custom blocks (message + form)</option>
                    <option value="link">Single link / CTA</option>
                    <option value="redirect">Redirect URL</option>
                  </select>
                  {endExperience.mode === "link" && (
                    <>
                      <Input
                        placeholder="Link URL"
                        value={endExperience.linkUrl ?? ""}
                        onChange={(e) =>
                          setEndExperience((x) => ({ ...x, linkUrl: e.target.value }))
                        }
                      />
                      <Input
                        placeholder="Button label"
                        value={endExperience.linkLabel ?? ""}
                        onChange={(e) =>
                          setEndExperience((x) => ({ ...x, linkLabel: e.target.value }))
                        }
                      />
                    </>
                  )}
                  {endExperience.mode === "redirect" && (
                    <Input
                      placeholder="https://…"
                      value={endExperience.redirectUrl ?? ""}
                      onChange={(e) =>
                        setEndExperience((x) => ({ ...x, redirectUrl: e.target.value }))
                      }
                    />
                  )}
                  {endExperience.mode === "blocks" && (
                    <p className="text-[11px] text-muted-foreground">
                      Uses a default “offer ended + contact capture” page. Customize blocks in a
                      dedicated end campaign from Groups, or replace via link/redirect.
                    </p>
                  )}
                </div>

                <SchedulePanel
                  campaignId={campaign.id}
                  devices={devices}
                  campaigns={
                    siblingCampaigns.length
                      ? siblingCampaigns
                      : [{ id: campaign.id, title, status }]
                  }
                />
              </div>
            )}

            {tab === "email" && (
              <div className="space-y-4">
                <div className="rounded-xl border border-orange-500/40 bg-orange-500/10 p-4 shadow-[0_0_24px_rgba(249,115,22,0.15)]">
                  <p className="flex items-center gap-2 font-semibold text-orange-300">
                    <Mail className="h-4 w-4" />
                    Email Response
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Build the offer email sent when someone submits contact capture — same block
                    idea as the page, laid out for email.
                  </p>
                  <a
                    href={`/dashboard/campaigns/${campaign.id}/email`}
                    className="mt-3 inline-flex h-8 w-full items-center justify-center rounded-lg border border-primary/20 bg-background/70 text-sm font-medium hover:border-primary/45 hover:bg-primary/10"
                  >
                    Open email builder
                  </a>
                </div>
                <EmailTemplatePanel emailReady={integrations.email} campaignId={campaign.id} />
              </div>
            )}

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
        </aside>

        {/* Center phone preview — independent scroll column */}
        {showPreview && tab === "content" && (
          <div className="flex min-h-0 flex-1 flex-col items-center overflow-hidden bg-black/30 p-3">
            <p className="mb-2 shrink-0 text-center text-[11px] text-muted-foreground">
              Live preview · scroll inside phone · tap a block to edit · {status.toLowerCase()}
            </p>
            <div className="builder-phone min-h-0 w-full max-w-[390px] flex-1">
              <div className="builder-phone-notch" />
              <div className="builder-phone-screen" ref={phoneScreenRef}>
                <a
                  href={`/dashboard/campaigns/${campaign.id}/email`}
                  className="mx-3 mt-3 block rounded-xl border border-orange-500/50 bg-orange-500/15 px-3 py-3 text-center shadow-[0_0_20px_rgba(249,115,22,0.25)] transition hover:bg-orange-500/25"
                >
                  <p className="text-xs font-semibold text-orange-300">Email Response</p>
                  <p className="mt-0.5 text-[10px] text-orange-200/80">
                    Contact submit → offer email · click to edit
                  </p>
                </a>
                <CampaignPageRenderer
                  blocks={blocks}
                  theme={theme}
                  campaignId={campaign.id}
                  deviceSlotId="preview"
                  businessId={businessId}
                  businessName="Preview"
                  logoUrl={brandKit.logoUrl}
                  contactProfile={{
                    phone: brandKit.phone ?? undefined,
                    email: brandKit.email ?? undefined,
                    address: brandKit.address ?? undefined,
                    website: brandKit.website ?? undefined,
                  }}
                  selectedBlockId={selectedBlockId}
                  editMode
                  onSelectBlock={(id) => {
                    setSelectedBlockId(id || null);
                    setSelectedButtonId(null);
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Right inspector — independent scroll column */}
        {tab === "content" && (
          <aside className="flex w-full shrink-0 flex-col border-l border-border/60 lg:w-[340px]">
            <div className="sticky top-0 z-10 border-b border-border/50 bg-background/95 px-4 py-2.5 text-sm font-semibold backdrop-blur">
              {selectedBlock ? `Edit: ${selectedBlock.label}` : "Page & design"}
            </div>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
              {!selectedBlock && (
                <>
                  <h3 className="text-sm font-semibold">Theme & branding</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {(["primaryColor", "secondaryColor", "backgroundColor", "textColor"] as const).map(
                      (key) => (
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
                      )
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Page font</Label>
                    <select
                      className="flex h-9 w-full rounded-lg border border-input bg-background/50 px-2 text-sm"
                      value={theme.fontStyle ?? "sans"}
                      onChange={(e) => setTheme((t) => ({ ...t, fontStyle: e.target.value }))}
                    >
                      <option value="sans">Modern sans</option>
                      <option value="serif">Classic serif</option>
                      <option value="display">Display / bold</option>
                      <option value="rounded">Friendly rounded</option>
                      <option value="mono">Mono</option>
                    </select>
                  </div>
                  <MediaPicker
                    label="Page background image"
                    value={theme.backgroundImage}
                    onChange={(url) => setTheme((t) => ({ ...t, backgroundImage: url }))}
                    mediaUploadReady={integrations.mediaUpload}
                    stockReady={integrations.stockImages}
                    campaignId={campaign.id}
                  />
                  {theme.backgroundImage ? (
                    <div className="space-y-1">
                      <Label className="text-xs">
                        Overlay ({theme.backgroundOverlayOpacity}%)
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
                    </div>
                  ) : null}
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={Boolean(theme.showPageLogo)}
                      onChange={(e) =>
                        setTheme((t) => ({ ...t, showPageLogo: e.target.checked }))
                      }
                    />
                    Show business logo at top of page
                  </label>
                  <p className="text-[11px] text-muted-foreground">
                    Off by default so Tap Card / hero logos aren’t doubled. Turn on for a small
                    brand mark above all blocks.
                  </p>
                  <div className="space-y-1">
                    <Label className="text-xs">Default button shape</Label>
                    <select
                      className="flex h-9 w-full rounded-lg border border-input bg-background/50 px-2 text-sm"
                      value={theme.defaultButtonShape}
                      onChange={(e) =>
                        setTheme((t) => ({
                          ...t,
                          defaultButtonShape: e.target.value as TapCardButtonShape,
                        }))
                      }
                    >
                      {TAP_CARD_SHAPE_OPTIONS.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <FinishPicker
                    label="Default button finish"
                    value={theme.defaultButtonFinish}
                    onChange={(finish) =>
                      setTheme((t) => ({ ...t, defaultButtonFinish: finish }))
                    }
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Applied to new buttons you add. Existing buttons keep their own shape/finish
                    until you change them.
                  </p>
                </>
              )}

              {selectedBlock && (
                <>
                  {(selectedBlock.channel ?? "page") === "email" && (
                    <div className="rounded-lg border border-orange-500/50 bg-orange-500/15 px-3 py-2 text-xs text-orange-200 shadow-[0_0_16px_rgba(249,115,22,0.2)]">
                      <strong>Email only</strong> — this block will not display on the tap page. It
                      can feed the follow-up offer email.
                    </div>
                  )}
                  <div className="space-y-1">
                    <Label className="text-xs">Show on</Label>
                    <select
                      className="flex h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
                      value={selectedBlock.channel ?? "page"}
                      onChange={(e) =>
                        updateBlock(selectedBlock.id, {
                          channel: e.target.value as "page" | "email" | "both",
                        })
                      }
                    >
                      <option value="page">Tap page only</option>
                      <option value="email">Email only (hidden on page)</option>
                      <option value="both">Page + email offer</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedBlock.enabled}
                      onChange={(e) =>
                        updateBlock(selectedBlock.id, { enabled: e.target.checked })
                      }
                    />
                    <Input
                      value={selectedBlock.label}
                      onChange={(e) => updateBlock(selectedBlock.id, { label: e.target.value })}
                      className="h-8 font-medium"
                    />
                  </div>
                  <BlockFields
                    block={selectedBlock}
                    onUpdate={(key, value) => updateBlockData(selectedBlock.id, key, value)}
                    onStyleChange={(style) => updateBlock(selectedBlock.id, { style })}
                    mediaUploadReady={integrations.mediaUpload}
                    stockReady={integrations.stockImages}
                    campaignId={campaign.id}
                    contact={{
                      phone: brandKit.phone ?? undefined,
                      email: brandKit.email ?? undefined,
                      address: brandKit.address ?? undefined,
                      website: brandKit.website ?? undefined,
                    }}
                    selectedButtonId={selectedButtonId}
                    onSelectButton={setSelectedButtonId}
                  />
                </>
              )}
            </div>
          </aside>
        )}

        {tab !== "content" && (
          <div className="flex-1 overflow-y-auto p-6 text-sm text-muted-foreground lg:hidden" />
        )}
      </div>
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
  contact,
  selectedButtonId,
  onSelectButton,
}: {
  block: ContentBlock;
  onUpdate: (key: string, value: unknown) => void;
  onStyleChange: (style: BlockStyle) => void;
  mediaUploadReady: boolean;
  stockReady: boolean;
  campaignId: string;
  contact?: { phone?: string; email?: string; address?: string; website?: string };
  selectedButtonId?: string | null;
  onSelectButton?: (id: string | null) => void;
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
          <Label className="text-xs">
            Width ({typeof data.widthPercent === "number" ? data.widthPercent : 100}%)
          </Label>
          <input
            type="range"
            min={30}
            max={100}
            value={typeof data.widthPercent === "number" ? data.widthPercent : 100}
            onChange={(e) => onUpdate("widthPercent", Number(e.target.value))}
            className="w-full"
          />
          <p className="text-[10px] text-muted-foreground">Auto fits the page; slide to shrink.</p>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Max height (px, optional)</Label>
          <Input
            type="number"
            min={80}
            max={800}
            placeholder="Auto"
            value={typeof data.maxHeight === "number" ? data.maxHeight : ""}
            onChange={(e) =>
              onUpdate("maxHeight", e.target.value ? Number(e.target.value) : undefined)
            }
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
          Text buttons, social icons, or custom art (beer stein, logo mark, photo) — any button can
          be an image with a link.
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
            <option value="grid_2">2-column grid</option>
            <option value="cards_2">2-column cards</option>
            <option value="icon_row">Icon row (circles)</option>
          </select>
        </div>
        {buttons.map((btn, index) => (
          <div
            key={btn.id}
            className={cn(
              "space-y-2 rounded-lg border bg-background/40 p-3",
              selectedButtonId === btn.id
                ? "border-primary ring-1 ring-primary/40"
                : "border-border/50"
            )}
            onClick={() => onSelectButton?.(btn.id)}
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
                <Label className="text-[10px]">Look</Label>
                <select
                  className="flex h-9 w-full rounded-lg border border-input bg-background/50 px-2 text-sm"
                  value={btn.appearance ?? "icon_text"}
                  onChange={(e) =>
                    patchBtn(btn.id, {
                      appearance: e.target.value as ButtonItem["appearance"],
                    })
                  }
                >
                  <option value="icon_text">Icon + text</option>
                  <option value="text">Text only</option>
                  <option value="icon_only">Icon only</option>
                  <option value="image_label">Custom image + label</option>
                  <option value="image">Image only (picture is the button)</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Style (legacy)</Label>
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
              <div className="sm:col-span-2">
                <FinishPicker
                  label="Premium finish"
                  value={btn.finish}
                  onChange={(finish) => patchBtn(btn.id, { finish })}
                />
              </div>
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-[10px]">Shape (pill / square / corners)</Label>
                <select
                  className="flex h-9 w-full rounded-lg border border-input bg-background/50 px-2 text-sm"
                  value={btn.shape ?? "pill"}
                  onChange={(e) =>
                    patchBtn(btn.id, { shape: e.target.value as TapCardButtonShape })
                  }
                >
                  {TAP_CARD_SHAPE_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              {(btn.finish === "neon") && (
                <div className="space-y-1">
                  <Label className="text-[10px]">Neon glow color</Label>
                  <input
                    type="color"
                    value={btn.neonColor ?? "#a3e635"}
                    onChange={(e) => patchBtn(btn.id, { neonColor: e.target.value })}
                    className="h-9 w-10 cursor-pointer rounded border-0"
                  />
                </div>
              )}
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-[10px]">Transparency {btn.opacity ?? 100}%</Label>
                <input
                  type="range"
                  min={25}
                  max={100}
                  value={btn.opacity ?? 100}
                  onChange={(e) => patchBtn(btn.id, { opacity: Number(e.target.value) })}
                  className="w-full"
                />
              </div>
              <div className="sm:col-span-2">
                <IconPicker
                  icon={(btn.icon as string) || "FiLink"}
                  customUrl={btn.imageUrl && (btn.appearance === "icon_text" || btn.appearance === "icon_only") ? "" : undefined}
                  color={btn.iconColor || "#f8fafc"}
                  onChange={({ icon, customUrl, color }) =>
                    patchBtn(btn.id, {
                      icon: (icon as ButtonItem["icon"]) || "link",
                      iconColor: color,
                      ...(customUrl
                        ? { imageUrl: customUrl, appearance: btn.appearance ?? "icon_text" }
                        : {}),
                    })
                  }
                  mediaUploadReady={mediaUploadReady}
                  stockReady={stockReady}
                  showLogoPicker
                />
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
              <div className="space-y-1">
                <Label className="text-[10px]">Button color</Label>
                <div className="flex gap-1">
                  <input
                    type="color"
                    value={btn.backgroundColor ?? "#a3e635"}
                    onChange={(e) => patchBtn(btn.id, { backgroundColor: e.target.value })}
                    className="h-9 w-10 cursor-pointer rounded border-0"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 text-[10px]"
                    onClick={() =>
                      patchBtn(btn.id, { backgroundColor: undefined, textColor: undefined })
                    }
                  >
                    Reset
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Label color</Label>
                <input
                  type="color"
                  value={btn.textColor ?? "#0b0f19"}
                  onChange={(e) => patchBtn(btn.id, { textColor: e.target.value })}
                  className="h-9 w-10 cursor-pointer rounded border-0"
                />
              </div>
            </div>
            <MediaPicker
              label="Custom button art (optional — beer stein, photo, logo…)"
              value={btn.imageUrl ?? ""}
              onChange={(url) => patchBtn(btn.id, { imageUrl: url || undefined })}
              mediaUploadReady={mediaUploadReady}
              stockReady={stockReady}
              campaignId={campaignId}
            />
            <div className="flex flex-wrap gap-3 text-xs">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={btn.fullWidth !== false}
                  onChange={(e) => patchBtn(btn.id, { fullWidth: e.target.checked })}
                />
                Full width
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={Boolean(btn.card)}
                  onChange={(e) => patchBtn(btn.id, { card: e.target.checked })}
                />
                Card look
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={btn.openInNewTab !== false}
                  onChange={(e) => patchBtn(btn.id, { openInNewTab: e.target.checked })}
                />
                Open in new tab
              </label>
            </div>
            <div className="flex flex-wrap gap-1">
              {(
                [
                  {
                    label: "Call",
                    url: contact?.phone
                      ? `tel:${contact.phone.replace(/[^\d+]/g, "")}`
                      : "tel:",
                    icon: "phone" as const,
                    hint: contact?.phone ? undefined : "Add phone in Brand Kit",
                  },
                  {
                    label: "Email",
                    url: contact?.email ? `mailto:${contact.email}` : "mailto:",
                    icon: "mail" as const,
                    hint: contact?.email ? undefined : "Add email in Brand Kit",
                  },
                  {
                    label: "Maps",
                    url: contact?.address
                      ? `https://maps.google.com/?q=${encodeURIComponent(contact.address)}`
                      : "https://maps.google.com/?q=",
                    icon: "map" as const,
                    hint: contact?.address ? undefined : "Add address in Brand Kit",
                  },
                  {
                    label: "Instagram",
                    url: "https://instagram.com/",
                    icon: "instagram" as const,
                  },
                ] as const
              ).map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  title={"hint" in preset ? preset.hint : undefined}
                  className="rounded border border-border/50 px-2 py-0.5 text-[10px] text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  onClick={() =>
                    patchBtn(btn.id, {
                      label: preset.label,
                      url: preset.url,
                      icon: preset.icon,
                      openInNewTab: preset.icon === "phone" || preset.icon === "mail" ? false : true,
                    })
                  }
                >
                  {preset.label}
                </button>
              ))}
            </div>
            {contact && (contact.phone || contact.address || contact.email) ? (
              <p className="text-[10px] text-muted-foreground">
                Call / Email / Maps presets use Brand Kit contact when available.
              </p>
            ) : (
              <p className="text-[10px] text-amber-500/90">
                Set phone, email, and address in Brand Kit so Call and Maps work automatically.
              </p>
            )}
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
                appearance: "icon_text",
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

  if (block.type === "vcard_download" || block.type === "digital_card") {
    return (
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Uses your Brand Kit → Contact card by default. Set that up once under Brand Kit.
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={data.useBrandProfile !== false}
            onChange={(e) => onUpdate("useBrandProfile", e.target.checked)}
          />
          Use Brand Kit contact profile
        </label>
        <div className="space-y-1">
          <Label className="text-xs">Button label</Label>
          <Input
            value={(data.buttonLabel as string) ?? "Save to contacts"}
            onChange={(e) => onUpdate("buttonLabel", e.target.value)}
          />
        </div>
        {block.type === "digital_card" && (
          <>
            <div className="space-y-1">
              <Label className="text-xs">Optional headline</Label>
              <Input
                value={(data.headline as string) ?? ""}
                onChange={(e) => onUpdate("headline", e.target.value)}
              />
            </div>
            <MediaPicker
              label="Card / vCard logo at top (preferred)"
              value={(data.logoUrl as string) ?? ""}
              onChange={(url) => onUpdate("logoUrl", url)}
              mediaUploadReady={mediaUploadReady}
              stockReady={stockReady}
              campaignId={campaignId}
            />
            <div className="space-y-1">
              <Label className="text-xs">Social display</Label>
              <select
                className="flex h-9 w-full rounded-lg border border-input bg-background/50 px-2 text-sm"
                value={(data.socialDisplay as string) ?? "pill"}
                onChange={(e) => onUpdate("socialDisplay", e.target.value)}
              >
                <option value="pill">Pills</option>
                <option value="tile">Tiles</option>
                <option value="row">Icon row</option>
              </select>
            </div>
            {(
              [
                ["showSaveContact", "Show Save contact"],
                ["showShare", "Show Share this page"],
                ["showSocials", "Show social icons"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={data[key] !== false}
                  onChange={(e) => onUpdate(key, e.target.checked)}
                />
                {label}
              </label>
            ))}
          </>
        )}
        {block.type === "vcard_download" && (
          <MediaPicker
            label="vCard photo / logo at top"
            value={(data.logoUrl as string) ?? ""}
            onChange={(url) => onUpdate("logoUrl", url)}
            mediaUploadReady={mediaUploadReady}
            stockReady={stockReady}
            campaignId={campaignId}
          />
        )}
        {data.useBrandProfile === false && (
          <div className="grid gap-2 sm:grid-cols-2">
            {(["name", "title", "phone", "email", "website", "organization", "address"] as const).map(
              (key) => (
                <div key={key} className="space-y-1">
                  <Label className="text-xs capitalize">{key}</Label>
                  <Input
                    value={(data[key] as string) ?? ""}
                    onChange={(e) => onUpdate(key, e.target.value)}
                  />
                </div>
              )
            )}
          </div>
        )}
        {styleControls}
      </div>
    );
  }

  if (block.type === "social_links") {
    const links =
      (data.links as { platform: string; url: string; label?: string }[]) ?? [];
    return (
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Leave empty to use Brand Kit socials automatically. Or add overrides below.
        </p>
        <div className="space-y-1">
          <Label className="text-xs">Headline</Label>
          <Input
            value={(data.headline as string) ?? ""}
            onChange={(e) => onUpdate("headline", e.target.value)}
          />
        </div>
        <select
          className="flex h-9 w-full rounded-lg border border-input bg-background/50 px-2 text-sm"
          value={(data.layout as string) ?? "row"}
          onChange={(e) => onUpdate("layout", e.target.value)}
        >
          <option value="row">Icon row</option>
          <option value="stack">Stacked with labels</option>
        </select>
        {links.map((link, i) => (
          <div key={i} className="grid gap-2 rounded-lg border border-border/40 p-2 sm:grid-cols-2">
            <Input
              placeholder="platform (instagram)"
              value={link.platform}
              onChange={(e) => {
                const next = [...links];
                next[i] = { ...link, platform: e.target.value };
                onUpdate("links", next);
              }}
            />
            <Input
              placeholder="https://…"
              value={link.url}
              onChange={(e) => {
                const next = [...links];
                next[i] = { ...link, url: e.target.value };
                onUpdate("links", next);
              }}
            />
          </div>
        ))}
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() =>
            onUpdate("links", [...links, { platform: "instagram", url: "https://" }])
          }
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add link
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

  if (block.type === "spacer") {
    return (
      <div className="space-y-3">
        <div className="space-y-1">
          <Label className="text-xs">Height</Label>
          <select
            className="flex h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
            value={(data.height as string) ?? "md"}
            onChange={(e) => onUpdate("height", e.target.value)}
          >
            <option value="sm">Small</option>
            <option value="md">Medium</option>
            <option value="lg">Large</option>
            <option value="xl">XL</option>
          </select>
        </div>
        {styleControls}
      </div>
    );
  }

  if (block.type === "columns") {
    const cols =
      (data.columns as {
        id: string;
        body: string;
        imageUrl?: string;
        linkUrl?: string;
        cellType?: "text" | "image" | "text_image";
      }[]) ?? [];
    return (
      <div className="space-y-3">
        {cols.map((col, i) => (
          <div key={col.id} className="space-y-2 rounded-lg border border-border/50 p-3">
            <Label className="text-xs">Column {i + 1}</Label>
            <select
              className="flex h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
              value={col.cellType ?? (col.imageUrl ? "text_image" : "text")}
              onChange={(e) => {
                const cellType = e.target.value as "text" | "image" | "text_image";
                const next = cols.map((c) =>
                  c.id === col.id ? { ...c, cellType } : c
                );
                onUpdate("columns", next);
              }}
            >
              <option value="text">Text</option>
              <option value="image">Image</option>
              <option value="text_image">Image + text</option>
            </select>
            {(col.cellType ?? (col.imageUrl ? "text_image" : "text")) !== "image" ? (
              <Textarea
                value={col.body}
                onChange={(e) => {
                  const next = cols.map((c) =>
                    c.id === col.id ? { ...c, body: e.target.value } : c
                  );
                  onUpdate("columns", next);
                }}
                rows={3}
              />
            ) : null}
            {(col.cellType === "image" ||
              col.cellType === "text_image" ||
              Boolean(col.imageUrl)) && (
              <MediaPicker
                label="Column image"
                value={col.imageUrl ?? ""}
                onChange={(url) => {
                  const next = cols.map((c) =>
                    c.id === col.id ? { ...c, imageUrl: url } : c
                  );
                  onUpdate("columns", next);
                }}
                mediaUploadReady={mediaUploadReady}
                stockReady={stockReady}
                campaignId={campaignId}
              />
            )}
            <Input
              placeholder="Optional link URL"
              value={col.linkUrl ?? ""}
              onChange={(e) => {
                const next = cols.map((c) =>
                  c.id === col.id ? { ...c, linkUrl: e.target.value } : c
                );
                onUpdate("columns", next);
              }}
            />
          </div>
        ))}
        {styleControls}
      </div>
    );
  }

  if (block.type === "banner") {
    return (
      <div className="space-y-3">
        <Input
          placeholder="Banner text"
          value={(data.text as string) ?? ""}
          onChange={(e) => onUpdate("text", e.target.value)}
        />
        <Input
          placeholder="Optional link URL"
          value={(data.linkUrl as string) ?? ""}
          onChange={(e) => onUpdate("linkUrl", e.target.value)}
        />
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Background</Label>
            <input
              type="color"
              value={(data.backgroundColor as string) ?? "#a3e635"}
              onChange={(e) => onUpdate("backgroundColor", e.target.value)}
              className="h-9 w-full cursor-pointer rounded border-0"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Text</Label>
            <input
              type="color"
              value={(data.textColor as string) ?? "#0b0f19"}
              onChange={(e) => onUpdate("textColor", e.target.value)}
              className="h-9 w-full cursor-pointer rounded border-0"
            />
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
