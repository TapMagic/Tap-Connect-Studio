"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Columns2,
  Copy,
  ExternalLink,
  GripVertical,
  ImageIcon,
  Link2,
  Plus,
  Rows3,
  Save,
  Type,
  Trash2,
  Unlink,
} from "lucide-react";
import Link from "next/link";
import { nanoid } from "nanoid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MediaPicker } from "@/components/media/media-picker";
import { TapConnectCard } from "@/components/tap/tap-connect-card";
import { IconPicker } from "@/components/design/icon-picker";
import { FinishPicker, TextFormatControls } from "@/components/design/format-controls";
import { QrPanel } from "@/components/campaign/qr-panel";
import type { BrandContactProfile } from "@/lib/brand/contact-profile";
import {
  COMMON_SOCIAL_KINDS,
  TAP_CARD_ACTION_CATALOG,
  TAP_CARD_LAYOUT_OPTIONS,
  TAP_CARD_SHAPE_OPTIONS,
  type TapCardActionKind,
  type TapCardButtonShape,
  type TapCardHeroFill,
  type TapCardOfferMode,
  type TapCardSection,
  type TapCardSectionType,
  type TapCardSpecialStyle,
  type TapCardSurfaceFill,
  type TapConnectCardConfig,
} from "@/lib/brand/tap-card";
import type { PremiumFinish } from "@/lib/design/premium-finish";
import { cn } from "@/lib/utils";

type CampaignLinkOption = {
  id: string;
  title: string;
  status: string;
  campaignType: string;
  features: string[];
  devices: { code: string; label: string }[];
};

type Props = {
  initialConfig: TapConnectCardConfig;
  profile: BrandContactProfile;
  businessName: string;
  logoUrl?: string | null;
  reviewUrl?: string | null;
  mediaUploadReady: boolean;
  stockReady: boolean;
  isAdmin?: boolean;
  isLandingDemo?: boolean;
  devices?: { id: string; nickname: string | null; deviceCode: string }[];
  campaigns?: CampaignLinkOption[];
};

const COMMON_ACTION_KINDS: TapCardActionKind[] = [
  "vcard",
  "call",
  "email",
  "sms",
  "website",
  "map",
  "review",
  "calendar",
  "shop",
  "book",
  "homescreen",
  "bookmark",
  ...COMMON_SOCIAL_KINDS,
  "custom",
];

export function TapCardBuilder({
  initialConfig,
  profile,
  businessName,
  logoUrl,
  reviewUrl,
  mediaUploadReady,
  stockReady,
  isAdmin = false,
  isLandingDemo = false,
  devices = [],
  campaigns = [],
}: Props) {
  const router = useRouter();
  const [config, setConfig] = useState(initialConfig);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [addKind, setAddKind] = useState<TapCardActionKind>("instagram");
  const [actionSearch, setActionSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [demoPublished, setDemoPublished] = useState(isLandingDemo);
  const inspectorRef = useRef<HTMLDivElement>(null);
  const previewScrollRef = useRef<HTMLDivElement>(null);

  const sorted = [...config.sections].sort((a, b) => a.order - b.order);
  const selected = sorted.find((s) => s.id === selectedId) ?? null;

  useEffect(() => {
    if (!selectedId || !previewScrollRef.current) return;
    const container = previewScrollRef.current;
    const el = container.querySelector(
      `[data-section-id="${typeof CSS !== "undefined" && CSS.escape ? CSS.escape(selectedId) : selectedId}"]`
    );
    if (!(el instanceof HTMLElement)) return;
    requestAnimationFrame(() => {
      const cRect = container.getBoundingClientRect();
      const eRect = el.getBoundingClientRect();
      const delta =
        eRect.top - cRect.top - container.clientHeight / 2 + eRect.height / 2;
      container.scrollBy({ top: delta, behavior: "smooth" });
    });
  }, [selectedId]);

  const catalogFiltered = TAP_CARD_ACTION_CATALOG.filter((c) => {
    if (!actionSearch.trim()) return COMMON_ACTION_KINDS.includes(c.kind);
    const q = actionSearch.toLowerCase();
    return c.label.toLowerCase().includes(q) || c.kind.includes(q);
  });

  function patchConfig(patch: Partial<TapConnectCardConfig>) {
    setConfig((c) => ({ ...c, ...patch }));
  }

  function setSections(next: TapCardSection[]) {
    setConfig((c) => ({
      ...c,
      sections: next.map((s, i) => ({ ...s, order: i })),
    }));
  }

  function patchSection(id: string, patch: Partial<TapCardSection>) {
    setSections(sorted.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function linkCampaignToSection(sectionId: string, campaignId: string) {
    const campaign = campaigns.find((c) => c.id === campaignId);
    if (!campaign) return;
    const current = sorted.find((s) => s.id === sectionId);
    const deviceCode = campaign.devices[0]?.code || devices[0]?.deviceCode || "";
    const href = deviceCode ? `/t/${deviceCode}?public=1` : "";
    patchSection(sectionId, {
      offerMode: "campaign",
      linkedCampaignId: campaign.id,
      linkedCampaignTitle: campaign.title,
      linkedDeviceCode: deviceCode || undefined,
      href,
      offerCta: current?.offerCta || "Open campaign",
      headline: current?.headline?.trim() ? current.headline : campaign.title,
      description: current?.description?.trim()
        ? current.description
        : campaign.features.length
          ? `Includes: ${campaign.features.slice(0, 3).join(" · ")}`
          : "Opens this campaign page",
    });
  }

  function unlinkCampaignFromSection(sectionId: string) {
    patchSection(sectionId, {
      offerMode: "link",
      linkedCampaignId: undefined,
      linkedCampaignTitle: undefined,
      linkedDeviceCode: undefined,
    });
  }

  function reorder(fromId: string, toId: string) {
    if (fromId === toId) return;
    const from = sorted.findIndex((s) => s.id === fromId);
    const to = sorted.findIndex((s) => s.id === toId);
    if (from < 0 || to < 0) return;
    const next = [...sorted];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setSections(next);
  }

  function addSection(type: Exclude<TapCardSectionType, "action_row">) {
    const id = nanoid(8);
    const base: TapCardSection = {
      id,
      type,
      enabled: true,
      order: sorted.length,
      label:
        type === "image"
          ? "Image block"
          : type === "logo_block"
            ? "Logo block"
            : type === "special_offer"
              ? "Special offer"
              : type === "promo_header"
                ? "Hottest Deal banner"
                : type === "text"
                  ? "Text box"
                  : type === "spacer"
                    ? "Spacer"
                    : type,
    };
    if (type === "image") {
      base.imageWidthPercent = 100;
      base.imageRadius = "rounded_md";
      base.opacity = 100;
    }
    if (type === "logo_block") {
      base.logoBlockLayout = "columns";
      base.columnLeft = "logo";
      base.columnRight = "text";
      base.logoUrl = logoUrl || undefined;
      base.columnRightText = businessName;
      base.logoScale = 100;
      base.href = "";
      base.columnRightHref = "";
    }
    if (type === "special_offer") {
      base.specialStyle = "banner";
      base.offerMode = "expand";
      base.text = "Limited time";
      base.headline = "Hottest Deal";
      base.description = "Tap to reveal today's offer";
      base.offerTitle = "Featured offer";
      base.offerDescription = "Mention this card when you visit.";
      base.offerCode = "TAPSAVE";
      base.offerCta = "Claim offer";
      base.href = devices[0]?.deviceCode ? `/t/${devices[0].deviceCode}` : "";
      base.finish = "neon";
      base.offerDefaultOpen = false;
    }
    if (type === "promo_header") {
      base.text = "Click Here to";
      base.textRight = "Hottest Deal!!!";
      base.href = "";
      base.pinTop = false;
      base.format = { fontFamily: "script", italic: true, fontSize: "base" };
    }
    if (type === "text") {
      base.text = "Your message here";
      base.format = { fontFamily: "sans", fontSize: "lg", align: "center" };
    }
    if (type === "spacer") base.height = "md";
    setSections([...sorted, base]);
    setSelectedId(id);
  }

  function addAction() {
    const catalog = TAP_CARD_ACTION_CATALOG.find((c) => c.kind === addKind);
    const id = nanoid(8);
    setSections([
      ...sorted,
      {
        id,
        type: "action",
        enabled: true,
        order: sorted.length,
        actionKind: addKind,
        label: catalog?.label ?? addKind,
        icon: catalog?.icon ?? addKind,
        finish: addKind === "review" ? "soft" : config.defaultFinish,
        style: addKind === "review" ? "soft" : config.defaultFinish,
        shape: config.defaultShape,
        backgroundColor: config.pillColor,
        textColor: config.pillTextColor,
        neonColor: config.neonColor,
        opacity: 100,
        href: "",
      },
    ]);
    setSelectedId(id);
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/brand", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tapCard: config }),
    });
    setSaving(false);
    if (!res.ok) {
      setMessage("Save failed");
      return;
    }
    setMessage("Tap Connect Card saved");
    router.refresh();
  }

  async function publishDemo(publish: boolean) {
    setMessage(null);
    const res = await fetch("/api/admin/landing-demo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publish, tapCard: config }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(data.error ?? "Demo publish failed");
      return;
    }
    setDemoPublished(publish);
    setMessage(publish ? "Published to landing page demo" : "Unpublished from landing demo");
    router.refresh();
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden max-lg:h-auto max-lg:min-h-[100dvh] max-lg:overflow-y-auto">
      <div className="z-30 flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-background px-4 py-3">
        <div>
          <p className="text-sm font-semibold">Tap Connect Card builder</p>
          <p className="text-xs text-muted-foreground">
            Blocks scroll left · card &amp; editor stay fixed · select a block to snap the preview
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isAdmin ? (
            <Button
              type="button"
              variant={demoPublished ? "outline" : "default"}
              size="sm"
              onClick={() => void publishDemo(!demoPublished)}
            >
              {demoPublished ? "Unpublish landing demo" : "Publish landing demo"}
            </Button>
          ) : null}
          <Button size="sm" onClick={() => void save()} disabled={saving}>
            <Save className="mr-1 h-4 w-4" />
            {saving ? "Saving…" : "Save card"}
          </Button>
        </div>
      </div>

      {/* Design menus — fixed chrome, scrolls if tall */}
      <div className="z-20 max-h-[28vh] shrink-0 space-y-3 overflow-y-auto border-b border-border/60 bg-background px-4 py-3">
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1">
            <Label className="text-[10px] font-semibold uppercase tracking-wide text-primary">
              Layout
            </Label>
            <div className="flex gap-1 rounded-lg border border-border/60 p-1">
              {TAP_CARD_LAYOUT_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium",
                    config.actionsLayout === opt.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  )}
                  onClick={() => patchConfig({ actionsLayout: opt.id })}
                >
                  {opt.id === "stack" ? (
                    <Rows3 className="h-3.5 w-3.5" />
                  ) : opt.id === "grid_2" ? (
                    <Columns2 className="h-3.5 w-3.5" />
                  ) : (
                    <Rows3 className="h-3.5 w-3.5 rotate-90" />
                  )}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] font-semibold uppercase tracking-wide">
              Button shape
            </Label>
            <select
              className="flex h-9 min-w-[11rem] rounded-lg border border-input bg-background px-2 text-xs"
              value={config.defaultShape}
              onChange={(e) =>
                patchConfig({ defaultShape: e.target.value as TapCardButtonShape })
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
            label="Tile / finish"
            value={config.defaultFinish}
            onChange={(defaultFinish) => patchConfig({ defaultFinish })}
          />
          <FinishPicker
            label="Card shell"
            value={config.cardFinish}
            onChange={(cardFinish) => patchConfig({ cardFinish })}
          />

          <label className="flex items-center gap-2 pb-1 text-xs font-medium">
            <input
              type="checkbox"
              checked={Boolean(config.view3d)}
              onChange={(e) => patchConfig({ view3d: e.target.checked })}
            />
            3-D raised buttons
          </label>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          {(
            [
              ["accentColor", "Accent"],
              ["surfaceColor", "Surface"],
              ["textColor", "Text"],
              ["pillColor", "Pill fill"],
              ["pillTextColor", "Pill text"],
              ["neonColor", "Neon glow"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="space-y-1">
              <Label className="text-[10px]">{label}</Label>
              <Input
                type="color"
                className="h-9 w-14 cursor-pointer p-1"
                value={
                  (config[key] as string | undefined) ||
                  (key === "pillColor"
                    ? "#0c0a07"
                    : key === "pillTextColor"
                      ? "#f5e6a8"
                      : config.accentColor)
                }
                onChange={(e) => patchConfig({ [key]: e.target.value })}
              />
            </div>
          ))}
          <div className="space-y-1">
            <Label className="text-[10px]">Card background</Label>
            <select
              className="flex h-9 min-w-[8rem] rounded-lg border border-input bg-background px-2 text-xs"
              value={config.surfaceFill || "solid"}
              onChange={(e) =>
                patchConfig({ surfaceFill: e.target.value as TapCardSurfaceFill })
              }
            >
              <option value="solid">Solid</option>
              <option value="gradient">Gradient</option>
            </select>
          </div>
          {config.surfaceFill === "gradient" ? (
            <>
              <div className="space-y-1">
                <Label className="text-[10px]">Gradient start</Label>
                <Input
                  type="color"
                  className="h-9 w-14 cursor-pointer p-1"
                  value={config.surfaceGradientStart || config.surfaceColor}
                  onChange={(e) => patchConfig({ surfaceGradientStart: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px]">Gradient end</Label>
                <Input
                  type="color"
                  className="h-9 w-14 cursor-pointer p-1"
                  value={config.surfaceGradientEnd || config.accentColor}
                  onChange={(e) => patchConfig({ surfaceGradientEnd: e.target.value })}
                />
              </div>
              <div className="min-w-[140px] flex-1 space-y-1">
                <Label className="text-[10px]">
                  Direction {config.surfaceGradientAngle ?? 160}°
                </Label>
                <input
                  type="range"
                  min={0}
                  max={360}
                  value={config.surfaceGradientAngle ?? 160}
                  onChange={(e) =>
                    patchConfig({ surfaceGradientAngle: Number(e.target.value) })
                  }
                  className="w-full"
                />
              </div>
            </>
          ) : null}
          <div className="min-w-[140px] flex-1 space-y-1">
            <Label className="text-[10px]">
              Transparency {config.surfaceOpacity ?? 100}%
            </Label>
            <input
              type="range"
              min={35}
              max={100}
              value={config.surfaceOpacity ?? 100}
              onChange={(e) => patchConfig({ surfaceOpacity: Number(e.target.value) })}
              className="w-full"
            />
          </div>
          <label className="flex items-center gap-2 pb-1 text-xs">
            <input
              type="checkbox"
              checked={config.collapsible}
              onChange={(e) => patchConfig({ collapsible: e.target.checked })}
            />
            Collapsible
          </label>
          <label className="flex items-center gap-2 pb-1 text-xs">
            <input
              type="checkbox"
              checked={Boolean(config.compactActionsOnly)}
              onChange={(e) => patchConfig({ compactActionsOnly: e.target.checked })}
            />
            Buttons only
          </label>
          <label className="flex items-center gap-2 pb-1 text-xs">
            <input
              type="checkbox"
              checked={config.showHeaderLogo === true}
              onChange={(e) => patchConfig({ showHeaderLogo: e.target.checked })}
            />
            Logo above card
          </label>
          {config.showHeaderLogo === true ? (
            <div className="flex w-full flex-wrap items-end gap-3">
              <div className="min-w-[200px] flex-1">
                <MediaPicker
                  label="Header logo"
                  value={config.headerLogoUrl ?? logoUrl ?? ""}
                  onChange={(url) =>
                    patchConfig({
                      headerLogoUrl: url,
                      ...(url ? {} : { showHeaderLogo: false }),
                    })
                  }
                  mediaUploadReady={mediaUploadReady}
                  stockReady={stockReady}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="mt-1 h-7 px-2 text-xs"
                  onClick={() =>
                    patchConfig({ headerLogoUrl: "", showHeaderLogo: false })
                  }
                >
                  Reset header logo
                </Button>
              </div>
              <div className="min-w-[140px] flex-1 space-y-1">
                <Label className="text-[10px]">
                  Logo size {config.headerLogoScale ?? 100}%
                </Label>
                <input
                  type="range"
                  min={40}
                  max={180}
                  value={config.headerLogoScale ?? 100}
                  onChange={(e) =>
                    patchConfig({ headerLogoScale: Number(e.target.value) })
                  }
                  className="w-full"
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {message ? (
        <p className="shrink-0 border-b border-border/40 px-4 py-2 text-sm text-primary">{message}</p>
      ) : null}

      <div className="grid min-h-0 flex-1 grid-cols-1 max-lg:flex-none lg:grid-cols-[300px_minmax(0,1fr)_320px]">
        {/* Left — blocks / add (independent scroll) */}
        <aside className="min-h-0 overflow-y-auto overscroll-contain border-r border-border/60 bg-background max-lg:max-h-[50vh] lg:h-auto">
          <div className="space-y-3 p-4">
            <TextFormatControls
              title="Title typography"
              value={config.titleFormat}
              onChange={(titleFormat) => patchConfig({ titleFormat })}
            />
            <TextFormatControls
              title="Body typography"
              value={config.bodyFormat}
              onChange={(bodyFormat) => patchConfig({ bodyFormat })}
            />

            <div className="rounded-lg border border-border/50 bg-muted/10 p-3">
              <QrPanel
                title="Tap Card · Device / QR"
                campaignTitle={businessName}
                filenamePrefix="tap-card"
                devices={devices}
                deviceCode={devices[0]?.deviceCode}
                allowCustomUrl
              />
            </div>

            <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3 space-y-2">
              <Label className="text-xs font-semibold">Add block</Label>
              <div className="grid grid-cols-2 gap-1.5">
                <Button type="button" size="sm" variant="outline" onClick={() => addSection("special_offer")}>
                  Special
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => addSection("promo_header")}>
                  Deal banner
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => addSection("image")}>
                  <ImageIcon className="mr-1 h-3.5 w-3.5" />
                  Image
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => addSection("logo_block")}
                >
                  Logo
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => addSection("text")}>
                  <Type className="mr-1 h-3.5 w-3.5" />
                  Text
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => addSection("spacer")}>
                  Spacer
                </Button>
              </div>
              <Label className="text-[10px] text-muted-foreground">Common actions + socials</Label>
              <Input
                value={actionSearch}
                onChange={(e) => setActionSearch(e.target.value)}
                placeholder="Search icons / actions…"
                className="h-8 text-xs"
              />
              <select
                className="flex h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
                value={addKind}
                onChange={(e) => setAddKind(e.target.value as TapCardActionKind)}
              >
                {catalogFiltered.map((c) => (
                  <option key={c.kind} value={c.kind}>
                    {c.label}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-muted-foreground">
                Custom link: URL format https://… · Socials need profile URL in Brand Kit or paste
                below after adding.
              </p>
              <Button type="button" size="sm" className="w-full" onClick={addAction}>
                <Plus className="mr-1 h-4 w-4" />
                Add action
              </Button>
            </div>

            <p className="text-[11px] font-semibold uppercase text-muted-foreground">Segments</p>
            {sorted.map((section, index) => (
              <div
                key={section.id}
                draggable
                onDragStart={() => setDragId(section.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragId) reorder(dragId, section.id);
                  setDragId(null);
                }}
                onDragEnd={() => setDragId(null)}
                onClick={() => setSelectedId(section.id)}
                className={cn(
                  "cursor-pointer rounded-lg border px-2 py-2 text-sm",
                  selectedId === section.id
                    ? "border-primary bg-primary/10"
                    : "border-border/50 hover:border-primary/40",
                  !section.enabled && "opacity-50",
                  dragId === section.id && "opacity-60"
                )}
              >
                <div className="flex items-center gap-1.5">
                  <GripVertical className="h-3.5 w-3.5 cursor-grab text-muted-foreground active:cursor-grabbing" />
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {section.label || section.type}
                  </span>
                  {section.linkedCampaignId ? (
                    <span
                      className="inline-flex items-center text-primary"
                      title={section.linkedCampaignTitle || "Linked campaign"}
                    >
                      <Link2 className="h-3.5 w-3.5" aria-hidden />
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const clone = {
                        ...structuredClone(section),
                        id: nanoid(8),
                        label: `${section.label || section.type} copy`,
                      };
                      const next = [...sorted];
                      next.splice(index + 1, 0, clone);
                      setSections(next);
                      setSelectedId(clone.id);
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    className="text-red-400"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSections(sorted.filter((s) => s.id !== section.id));
                      if (selectedId === section.id) setSelectedId(null);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="pl-5 text-[10px] text-muted-foreground">
                  {section.type}
                  {section.actionKind ? ` · ${section.actionKind}` : ""}
                  {section.linkedCampaignId
                    ? ` · → ${section.linkedCampaignTitle || "campaign"}`
                    : ""}
                </p>
              </div>
            ))}
          </div>
        </aside>

        {/* Center — always in view; scroll to review full / snap to selection */}
        <div
          ref={previewScrollRef}
          className="min-h-0 min-w-0 overflow-y-auto overscroll-contain border-x border-border/40 bg-black/30 max-lg:min-h-[55vh] lg:h-auto"
        >
          <div className="p-4 pb-12">
            <p className="mb-2 text-center text-[11px] text-muted-foreground">
              Scroll to review · selecting a block snaps the preview
            </p>
            <div className="builder-phone builder-phone-natural mx-auto w-full max-w-[390px]">
              <div className="builder-phone-notch" />
              <div className="builder-phone-screen !bg-[#1a1a1a] p-3 pb-8">
                <TapConnectCard
                  config={config}
                  profile={profile}
                  businessName={businessName}
                  logoUrl={logoUrl}
                  reviewUrl={reviewUrl}
                  forceExpanded
                  builderChrome
                  selectedSectionId={selectedId}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right — editor always visible */}
        <aside className="min-h-0 overflow-y-auto overscroll-contain border-l border-border/60 bg-background max-lg:max-h-[50vh] lg:h-auto">
          <div ref={inspectorRef} className="p-4">
          <p className="mb-3 text-sm font-semibold">
            {selected ? `Edit: ${selected.label || selected.type}` : "Select a segment"}
          </p>
          {!selected ? (
            <p className="text-xs text-muted-foreground">
              Use the Design bar for Two columns, shapes, pill colors, neon glow, 3-D, and
              transparency. Add Image / Logo / Text blocks from the left. Top logos are opt-in:
              Design bar → <span className="text-foreground">Logo above card</span>, or select
              Hero → <span className="text-foreground">Show logo on hero</span>.
            </p>
          ) : (
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selected.enabled}
                  onChange={(e) => patchSection(selected.id, { enabled: e.target.checked })}
                />
                Enabled
              </label>
              <Input
                value={selected.label ?? ""}
                onChange={(e) => patchSection(selected.id, { label: e.target.value })}
                placeholder="Label"
              />

              {selected.type === "action" && (
                <>
                  <select
                    className="flex h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
                    value={selected.actionKind ?? "custom"}
                    onChange={(e) => {
                      const kind = e.target.value as TapCardActionKind;
                      const cat = TAP_CARD_ACTION_CATALOG.find((c) => c.kind === kind);
                      patchSection(selected.id, {
                        actionKind: kind,
                        icon: cat?.icon ?? kind,
                        label: selected.label || cat?.label,
                      });
                    }}
                  >
                    {TAP_CARD_ACTION_CATALOG.map((c) => (
                      <option key={c.kind} value={c.kind}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <Input
                    value={selected.href ?? ""}
                    onChange={(e) => patchSection(selected.id, { href: e.target.value })}
                    placeholder="https://… (URL format)"
                  />
                  <FinishPicker
                    value={selected.finish || selected.style || config.defaultFinish}
                    onChange={(finish: PremiumFinish) =>
                      patchSection(selected.id, { finish, style: finish })
                    }
                  />
                  <div className="space-y-1">
                    <Label className="text-xs">Shape</Label>
                    <select
                      className="flex h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
                      value={selected.shape || config.defaultShape}
                      onChange={(e) =>
                        patchSection(selected.id, {
                          shape: e.target.value as TapCardButtonShape,
                        })
                      }
                    >
                      {TAP_CARD_SHAPE_OPTIONS.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <IconPicker
                    icon={selected.icon || selected.actionKind || "FiLink"}
                    customUrl={selected.iconUrl}
                    color={selected.iconColor || "#f8fafc"}
                    onChange={({ icon, customUrl, color }) =>
                      patchSection(selected.id, {
                        icon: icon || selected.icon,
                        iconUrl: customUrl,
                        iconColor: color,
                      })
                    }
                    mediaUploadReady={mediaUploadReady}
                    stockReady={stockReady}
                    showLogoPicker
                  />
                  <TextFormatControls
                    title="Button label — font & size"
                    value={selected.format}
                    onChange={(format) => patchSection(selected.id, { format })}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Pill fill</Label>
                      <Input
                        type="color"
                        value={
                          selected.backgroundColor || config.pillColor || "#0c0a07"
                        }
                        onChange={(e) =>
                          patchSection(selected.id, { backgroundColor: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Pill text</Label>
                      <Input
                        type="color"
                        value={selected.textColor || config.pillTextColor || "#f5e6a8"}
                        onChange={(e) =>
                          patchSection(selected.id, { textColor: e.target.value })
                        }
                      />
                    </div>
                    {(selected.finish || config.defaultFinish) === "neon" ? (
                      <div className="col-span-2">
                        <Label className="text-xs">Neon glow color</Label>
                        <Input
                          type="color"
                          value={selected.neonColor || config.neonColor || config.accentColor}
                          onChange={(e) =>
                            patchSection(selected.id, { neonColor: e.target.value })
                          }
                        />
                      </div>
                    ) : null}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">
                      Transparency {selected.opacity ?? 100}%
                    </Label>
                    <input
                      type="range"
                      min={20}
                      max={100}
                      value={selected.opacity ?? 100}
                      onChange={(e) =>
                        patchSection(selected.id, { opacity: Number(e.target.value) })
                      }
                      className="w-full"
                    />
                  </div>
                </>
              )}

              {selected.type === "promo_header" && (
                <>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selected.pinTop !== false}
                      onChange={(e) =>
                        patchSection(selected.id, { pinTop: e.target.checked })
                      }
                    />
                    Pin to top of card (uncheck to place anywhere in the stack)
                  </label>
                  <Input
                    value={selected.text ?? ""}
                    onChange={(e) => patchSection(selected.id, { text: e.target.value })}
                    placeholder="Left text"
                  />
                  <Input
                    value={selected.textRight ?? ""}
                    onChange={(e) => patchSection(selected.id, { textRight: e.target.value })}
                    placeholder="Right text"
                  />
                  <Input
                    value={selected.href ?? ""}
                    onChange={(e) => patchSection(selected.id, { href: e.target.value })}
                    placeholder="Link URL or /t/DEVICECODE"
                  />
                  {devices.length > 0 ? (
                    <div className="space-y-1">
                      <Label className="text-xs">Quick link to device / camppage</Label>
                      <select
                        className="flex h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
                        value=""
                        onChange={(e) => {
                          if (!e.target.value) return;
                          patchSection(selected.id, { href: `/t/${e.target.value}` });
                        }}
                      >
                        <option value="">Select a tap device…</option>
                        {devices.map((d) => (
                          <option key={d.id} value={d.deviceCode}>
                            {d.nickname || d.deviceCode} → /t/{d.deviceCode}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                  <TextFormatControls
                    title="Promo — font & size"
                    value={selected.format}
                    onChange={(format) => patchSection(selected.id, { format })}
                  />
                </>
              )}

              {selected.type === "special_offer" && (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs">Format (not just a button)</Label>
                    <select
                      className="flex h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
                      value={selected.specialStyle || "banner"}
                      onChange={(e) =>
                        patchSection(selected.id, {
                          specialStyle: e.target.value as TapCardSpecialStyle,
                        })
                      }
                    >
                      <option value="banner">Banner strip</option>
                      <option value="ribbon">Ribbon</option>
                      <option value="tile">Tile</option>
                      <option value="card">Offer card</option>
                    </select>
                  </div>
                  <Input
                    value={selected.text ?? ""}
                    onChange={(e) => patchSection(selected.id, { text: e.target.value })}
                    placeholder="Kicker (e.g. Limited time)"
                  />
                  <Input
                    value={selected.headline ?? ""}
                    onChange={(e) => patchSection(selected.id, { headline: e.target.value })}
                    placeholder="Headline"
                  />
                  <textarea
                    className="min-h-[72px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    value={selected.description ?? ""}
                    onChange={(e) =>
                      patchSection(selected.id, { description: e.target.value })
                    }
                    placeholder="Supporting line"
                  />
                  <TextFormatControls
                    title="Special — typography"
                    value={selected.format}
                    onChange={(format) => patchSection(selected.id, { format })}
                  />
                  <FinishPicker
                    label="Finish"
                    value={selected.finish || config.defaultFinish}
                    onChange={(finish) => patchSection(selected.id, { finish })}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Fill</Label>
                      <Input
                        type="color"
                        value={selected.backgroundColor || "#1a1208"}
                        onChange={(e) =>
                          patchSection(selected.id, { backgroundColor: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Text</Label>
                      <Input
                        type="color"
                        value={selected.textColor || "#f5e6a8"}
                        onChange={(e) =>
                          patchSection(selected.id, { textColor: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">When tapped</Label>
                    <select
                      className="flex h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
                      value={selected.offerMode || "link"}
                      onChange={(e) => {
                        const mode = e.target.value as TapCardOfferMode;
                        if (mode !== "campaign") {
                          patchSection(selected.id, {
                            offerMode: mode,
                            ...(mode === "expand"
                              ? {
                                  linkedCampaignId: undefined,
                                  linkedCampaignTitle: undefined,
                                  linkedDeviceCode: undefined,
                                }
                              : {}),
                          });
                          return;
                        }
                        patchSection(selected.id, { offerMode: mode });
                      }}
                    >
                      <option value="link">Open a page / URL</option>
                      <option value="expand">Expand offer on this card</option>
                      <option value="campaign">Open linked campaign</option>
                    </select>
                  </div>

                  {selected.offerMode === "campaign" && (
                    <div className="space-y-2 rounded-xl border border-primary/40 bg-primary/5 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                          <Link2 className="size-4 shrink-0" aria-hidden />
                          {selected.linkedCampaignId ? "Linked campaign" : "Link a campaign"}
                        </div>
                        {selected.linkedCampaignId ? (
                          <span
                            className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-background px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary"
                            title="Linked to a campaign"
                          >
                            <Link2 className="size-3" aria-hidden />
                            Linked
                          </span>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Send people to contact capture, coupons, banners, or anything you built in
                        Campaign builder.
                      </p>

                      {selected.linkedCampaignId ? (
                        <>
                          <div className="rounded-lg border border-border bg-background px-3 py-2">
                            <p className="text-sm font-medium">
                              {selected.linkedCampaignTitle || "Campaign"}
                            </p>
                            {(() => {
                              const linked = campaigns.find(
                                (c) => c.id === selected.linkedCampaignId
                              );
                              if (!linked?.features.length) return null;
                              return (
                                <div className="mt-1.5 flex flex-wrap gap-1">
                                  {linked.features.map((f) => (
                                    <span
                                      key={f}
                                      className="rounded-md border border-border bg-muted/50 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                                    >
                                      {f}
                                    </span>
                                  ))}
                                </div>
                              );
                            })()}
                            {selected.linkedDeviceCode || selected.href ? (
                              <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
                                {selected.href || `/t/${selected.linkedDeviceCode}`}
                              </p>
                            ) : (
                              <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
                                No device on this campaign yet — pick a tap URL below or assign one
                                in Campaign builder.
                              </p>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Link
                              href={`/dashboard/campaigns/${selected.linkedCampaignId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex h-7 items-center gap-1 rounded-lg border border-primary/20 bg-background/70 px-2.5 text-[0.8rem] font-medium hover:border-primary/45 hover:bg-primary/10 hover:text-primary"
                            >
                              <ExternalLink className="size-3.5" />
                              Open campaign
                            </Link>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => unlinkCampaignFromSection(selected.id)}
                            >
                              <Unlink className="size-3.5" />
                              Unlink
                            </Button>
                          </div>
                          {(() => {
                            const linked = campaigns.find(
                              (c) => c.id === selected.linkedCampaignId
                            );
                            const deviceChoices =
                              linked?.devices.length
                                ? linked.devices
                                : devices.map((d) => ({
                                    code: d.deviceCode,
                                    label: d.nickname || d.deviceCode,
                                  }));
                            if (!deviceChoices.length) return null;
                            return (
                              <div className="space-y-1">
                                <Label className="text-xs">Tap page that opens this campaign</Label>
                                <select
                                  className="flex h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
                                  value={selected.linkedDeviceCode || ""}
                                  onChange={(e) => {
                                    const code = e.target.value;
                                    patchSection(selected.id, {
                                      linkedDeviceCode: code || undefined,
                                      href: code ? `/t/${code}?public=1` : selected.href,
                                    });
                                  }}
                                >
                                  <option value="">Select device…</option>
                                  {deviceChoices.map((d) => (
                                    <option key={d.code} value={d.code}>
                                      {d.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            );
                          })()}
                        </>
                      ) : (
                        <div className="space-y-2">
                          <select
                            className="flex h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
                            value=""
                            onChange={(e) => {
                              if (!e.target.value) return;
                              linkCampaignToSection(selected.id, e.target.value);
                            }}
                          >
                            <option value="">
                              {campaigns.length ? "Choose a campaign…" : "No campaigns yet"}
                            </option>
                            {campaigns.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.title}
                                {c.features.length
                                  ? ` — ${c.features.slice(0, 2).join(", ")}`
                                  : ""}
                              </option>
                            ))}
                          </select>
                          <Link
                            href="/dashboard/campaigns"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-7 items-center gap-1 rounded-lg border border-primary/20 bg-background/70 px-2.5 text-[0.8rem] font-medium hover:border-primary/45 hover:bg-primary/10 hover:text-primary"
                          >
                            <Plus className="size-3.5" />
                            Campaign builder
                          </Link>
                        </div>
                      )}
                    </div>
                  )}

                  {(selected.offerMode || "link") === "link" ? (
                    <>
                      <Input
                        value={selected.href ?? ""}
                        onChange={(e) => patchSection(selected.id, { href: e.target.value })}
                        placeholder="https://… or /t/DEVICECODE"
                      />
                      <Input
                        value={selected.offerCta ?? ""}
                        onChange={(e) =>
                          patchSection(selected.id, { offerCta: e.target.value })
                        }
                        placeholder="CTA label (e.g. Open offer)"
                      />
                      {devices.length > 0 ? (
                        <div className="space-y-1">
                          <Label className="text-xs">Or pick a tap device page</Label>
                          <select
                            className="flex h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
                            value=""
                            onChange={(e) => {
                              if (!e.target.value) return;
                              patchSection(selected.id, { href: `/t/${e.target.value}` });
                            }}
                          >
                            <option value="">Select device → /t/…</option>
                            {devices.map((d) => (
                              <option key={d.id} value={d.deviceCode}>
                                {d.nickname || d.deviceCode}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : null}
                    </>
                  ) : null}

                  {selected.offerMode === "campaign" ? (
                    <Input
                      value={selected.offerCta ?? ""}
                      onChange={(e) =>
                        patchSection(selected.id, { offerCta: e.target.value })
                      }
                      placeholder="CTA label (e.g. Claim deal)"
                    />
                  ) : null}

                  {selected.offerMode === "expand" ? (
                    <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
                      <p className="text-xs font-semibold text-primary">Build the offer</p>
                      <Input
                        value={selected.offerTitle ?? ""}
                        onChange={(e) =>
                          patchSection(selected.id, { offerTitle: e.target.value })
                        }
                        placeholder="Offer title"
                      />
                      <textarea
                        className="min-h-[72px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                        value={selected.offerDescription ?? ""}
                        onChange={(e) =>
                          patchSection(selected.id, { offerDescription: e.target.value })
                        }
                        placeholder="Offer details"
                      />
                      <Input
                        value={selected.offerCode ?? ""}
                        onChange={(e) =>
                          patchSection(selected.id, { offerCode: e.target.value })
                        }
                        placeholder="Coupon / code (optional)"
                      />
                      <Input
                        value={selected.offerExpires ?? ""}
                        onChange={(e) =>
                          patchSection(selected.id, { offerExpires: e.target.value })
                        }
                        placeholder="Expires (optional text)"
                      />
                      <Input
                        value={selected.offerCta ?? ""}
                        onChange={(e) =>
                          patchSection(selected.id, { offerCta: e.target.value })
                        }
                        placeholder="Claim button label"
                      />
                      <Input
                        value={selected.href ?? ""}
                        onChange={(e) => patchSection(selected.id, { href: e.target.value })}
                        placeholder="Claim link (optional) — campaign or page URL"
                      />
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={Boolean(selected.offerDefaultOpen)}
                          onChange={(e) =>
                            patchSection(selected.id, {
                              offerDefaultOpen: e.target.checked,
                            })
                          }
                        />
                        Start with offer open
                      </label>
                    </div>
                  ) : null}
                </>
              )}

              {selected.type === "identity" && (
                <>
                  <Input
                    value={selected.name ?? ""}
                    onChange={(e) => patchSection(selected.id, { name: e.target.value })}
                    placeholder="Name"
                  />
                  <Input
                    value={selected.title ?? ""}
                    onChange={(e) => patchSection(selected.id, { title: e.target.value })}
                    placeholder="Title"
                  />
                  <Input
                    value={selected.organization ?? ""}
                    onChange={(e) =>
                      patchSection(selected.id, { organization: e.target.value })
                    }
                    placeholder="Organization"
                  />
                  <Input
                    value={selected.headline ?? ""}
                    onChange={(e) => patchSection(selected.id, { headline: e.target.value })}
                    placeholder="Headline"
                  />
                  <TextFormatControls
                    title="Identity — font & size"
                    value={selected.format}
                    onChange={(format) => patchSection(selected.id, { format })}
                  />
                </>
              )}

              {selected.type === "hero" && (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs">Hero layout</Label>
                    <select
                      className="flex h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
                      value={selected.heroLayout || "classic"}
                      onChange={(e) =>
                        patchSection(selected.id, {
                          heroLayout: e.target.value as
                            | "classic"
                            | "logo_top"
                            | "columns",
                        })
                      }
                    >
                      <option value="classic">Classic — photo hero</option>
                      <option value="logo_top">Logo above photo</option>
                      <option value="columns">Two columns — image &amp; text</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Hero background</Label>
                    <select
                      className="flex h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
                      value={selected.heroFill || "photo"}
                      onChange={(e) =>
                        patchSection(selected.id, {
                          heroFill: e.target.value as TapCardHeroFill,
                        })
                      }
                    >
                      <option value="photo">Photo</option>
                      <option value="gradient">Gradient</option>
                      <option value="photo_gradient">Photo + gradient overlay</option>
                    </select>
                  </div>
                  {(selected.heroFill || "photo") !== "photo" ? (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Gradient start</Label>
                          <Input
                            type="color"
                            className="h-9 w-full cursor-pointer p-1"
                            value={selected.gradientStart || config.accentColor}
                            onChange={(e) =>
                              patchSection(selected.id, { gradientStart: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Gradient end</Label>
                          <Input
                            type="color"
                            className="h-9 w-full cursor-pointer p-1"
                            value={selected.gradientEnd || "#0b0f19"}
                            onChange={(e) =>
                              patchSection(selected.id, { gradientEnd: e.target.value })
                            }
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">
                          Gradient direction {selected.gradientAngle ?? 160}°
                        </Label>
                        <input
                          type="range"
                          min={0}
                          max={360}
                          value={selected.gradientAngle ?? 160}
                          onChange={(e) =>
                            patchSection(selected.id, {
                              gradientAngle: Number(e.target.value),
                            })
                          }
                          className="w-full"
                        />
                      </div>
                    </>
                  ) : null}
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selected.showOutline !== false}
                      onChange={(e) =>
                        patchSection(selected.id, { showOutline: e.target.checked })
                      }
                    />
                    Card outline around hero
                  </label>
                  <MediaPicker
                    label="Hero photo / background"
                    value={selected.imageUrl ?? ""}
                    onChange={(url) => patchSection(selected.id, { imageUrl: url })}
                    mediaUploadReady={mediaUploadReady}
                    stockReady={stockReady}
                  />

                  <div className="space-y-2 rounded-lg border border-border/50 bg-muted/10 p-3">
                    <label className="flex items-center gap-2 text-sm font-medium">
                      <input
                        type="checkbox"
                        checked={selected.showHeroLogo === true}
                        onChange={(e) =>
                          patchSection(selected.id, {
                            showHeroLogo: e.target.checked,
                            showLogoWindow: e.target.checked,
                          })
                        }
                      />
                      Show logo on hero
                    </label>
                    <p className="text-[10px] text-muted-foreground">
                      Off by default. Turn on for a logo on the hero photo, then adjust size below.
                    </p>
                    {selected.showHeroLogo === true ? (
                      <>
                        <MediaPicker
                          label="Hero logo"
                          value={selected.logoUrl ?? logoUrl ?? ""}
                          onChange={(url) =>
                            patchSection(selected.id, {
                              logoUrl: url,
                              ...(url
                                ? {}
                                : { showHeroLogo: false, showLogoWindow: false }),
                            })
                          }
                          mediaUploadReady={mediaUploadReady}
                          stockReady={stockReady}
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          onClick={() =>
                            patchSection(selected.id, {
                              logoUrl: "",
                              showHeroLogo: false,
                              showLogoWindow: false,
                            })
                          }
                        >
                          Reset hero logo
                        </Button>
                        <div className="space-y-1">
                          <Label className="text-xs">
                            Logo size {selected.logoScale ?? 100}%
                          </Label>
                          <input
                            type="range"
                            min={40}
                            max={180}
                            value={selected.logoScale ?? 100}
                            onChange={(e) =>
                              patchSection(selected.id, {
                                logoScale: Number(e.target.value),
                              })
                            }
                            className="w-full"
                          />
                        </div>
                        {(selected.heroLayout || "classic") === "classic" ||
                        selected.heroLayout === "logo_top" ? (
                          <>
                            <div className="space-y-1">
                              <Label className="text-xs">
                                Move X {selected.logoOffsetX ?? 0}px
                              </Label>
                              <input
                                type="range"
                                min={-80}
                                max={80}
                                value={selected.logoOffsetX ?? 0}
                                onChange={(e) =>
                                  patchSection(selected.id, {
                                    logoOffsetX: Number(e.target.value),
                                  })
                                }
                                className="w-full"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">
                                Move Y {selected.logoOffsetY ?? 0}px
                              </Label>
                              <input
                                type="range"
                                min={-80}
                                max={80}
                                value={selected.logoOffsetY ?? 0}
                                onChange={(e) =>
                                  patchSection(selected.id, {
                                    logoOffsetY: Number(e.target.value),
                                  })
                                }
                                className="w-full"
                              />
                            </div>
                          </>
                        ) : null}
                      </>
                    ) : null}
                  </div>

                  {(selected.heroLayout || "classic") === "classic" ? (
                    <>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={Boolean(selected.showCallBadge)}
                          onChange={(e) =>
                            patchSection(selected.id, {
                              showCallBadge: e.target.checked,
                            })
                          }
                        />
                        Show Call badge
                      </label>
                    </>
                  ) : null}

                  {selected.heroLayout === "columns" ? (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Left column</Label>
                          <select
                            className="flex h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
                            value={selected.columnLeft || "image"}
                            onChange={(e) =>
                              patchSection(selected.id, {
                                columnLeft: e.target.value as
                                  | "logo"
                                  | "text"
                                  | "image"
                                  | "empty",
                              })
                            }
                          >
                            <option value="logo">Logo</option>
                            <option value="text">Text</option>
                            <option value="image">Image</option>
                            <option value="empty">Empty</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Right column</Label>
                          <select
                            className="flex h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
                            value={selected.columnRight || "text"}
                            onChange={(e) =>
                              patchSection(selected.id, {
                                columnRight: e.target.value as
                                  | "logo"
                                  | "text"
                                  | "image"
                                  | "empty",
                              })
                            }
                          >
                            <option value="logo">Logo</option>
                            <option value="text">Text</option>
                            <option value="image">Image</option>
                            <option value="empty">Empty</option>
                          </select>
                        </div>
                      </div>
                      {(selected.columnLeft === "text" || selected.columnRight === "text") && (
                        <div className="grid grid-cols-2 gap-2">
                          {selected.columnLeft === "text" ? (
                            <Input
                              value={selected.columnLeftText ?? selected.columnText ?? ""}
                              onChange={(e) =>
                                patchSection(selected.id, { columnLeftText: e.target.value })
                              }
                              placeholder="Left column text"
                            />
                          ) : (
                            <span />
                          )}
                          {selected.columnRight === "text" ? (
                            <Input
                              value={selected.columnRightText ?? selected.columnText ?? ""}
                              onChange={(e) =>
                                patchSection(selected.id, { columnRightText: e.target.value })
                              }
                              placeholder="Right column text"
                            />
                          ) : null}
                        </div>
                      )}
                      {(selected.columnLeft === "image" || selected.columnRight === "image") && (
                        <div className="space-y-2">
                          {selected.columnLeft === "image" ? (
                            <MediaPicker
                              label="Left column image"
                              value={
                                selected.columnLeftImageUrl ??
                                selected.columnImageUrl ??
                                ""
                              }
                              onChange={(url) =>
                                patchSection(selected.id, { columnLeftImageUrl: url })
                              }
                              mediaUploadReady={mediaUploadReady}
                              stockReady={stockReady}
                            />
                          ) : null}
                          {selected.columnRight === "image" ? (
                            <MediaPicker
                              label="Right column image"
                              value={
                                selected.columnRightImageUrl ??
                                selected.columnImageUrl ??
                                ""
                              }
                              onChange={(url) =>
                                patchSection(selected.id, { columnRightImageUrl: url })
                              }
                              mediaUploadReady={mediaUploadReady}
                              stockReady={stockReady}
                            />
                          ) : null}
                        </div>
                      )}
                      <TextFormatControls
                        title="Column text format"
                        value={selected.format}
                        onChange={(format) => patchSection(selected.id, { format })}
                      />
                    </>
                  ) : null}

                  <Input
                    value={selected.href ?? ""}
                    onChange={(e) => patchSection(selected.id, { href: e.target.value })}
                    placeholder="Logo / hero link"
                  />
                </>
              )}

              {selected.type === "image" && (
                <>
                  <MediaPicker
                    label="Image"
                    value={selected.imageUrl ?? ""}
                    onChange={(url) => patchSection(selected.id, { imageUrl: url })}
                    mediaUploadReady={mediaUploadReady}
                    stockReady={stockReady}
                  />
                  <Input
                    value={selected.href ?? ""}
                    onChange={(e) => patchSection(selected.id, { href: e.target.value })}
                    placeholder="Optional link https://…"
                  />
                  <Input
                    value={selected.altText ?? ""}
                    onChange={(e) => patchSection(selected.id, { altText: e.target.value })}
                    placeholder="Alt text"
                  />
                  <div className="space-y-1">
                    <Label className="text-xs">
                      Width {selected.imageWidthPercent ?? 100}%
                    </Label>
                    <input
                      type="range"
                      min={40}
                      max={100}
                      value={selected.imageWidthPercent ?? 100}
                      onChange={(e) =>
                        patchSection(selected.id, {
                          imageWidthPercent: Number(e.target.value),
                        })
                      }
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Corners</Label>
                    <select
                      className="flex h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
                      value={selected.imageRadius || "rounded_md"}
                      onChange={(e) =>
                        patchSection(selected.id, {
                          imageRadius: e.target.value as TapCardButtonShape,
                        })
                      }
                    >
                      {TAP_CARD_SHAPE_OPTIONS.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">
                      Transparency {selected.opacity ?? 100}%
                    </Label>
                    <input
                      type="range"
                      min={20}
                      max={100}
                      value={selected.opacity ?? 100}
                      onChange={(e) =>
                        patchSection(selected.id, { opacity: Number(e.target.value) })
                      }
                      className="w-full"
                    />
                  </div>
                </>
              )}

              {selected.type === "logo_block" && (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs">Layout</Label>
                    <select
                      className="flex h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
                      value={selected.logoBlockLayout || "columns"}
                      onChange={(e) =>
                        patchSection(selected.id, {
                          logoBlockLayout: e.target.value as "stack" | "columns",
                        })
                      }
                    >
                      <option value="columns">Two columns</option>
                      <option value="stack">Stack (vertical)</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Left</Label>
                      <select
                        className="flex h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
                        value={selected.columnLeft || "logo"}
                        onChange={(e) =>
                          patchSection(selected.id, {
                            columnLeft: e.target.value as "logo" | "text" | "empty",
                          })
                        }
                      >
                        <option value="logo">Logo</option>
                        <option value="text">Text</option>
                        <option value="empty">Empty</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Right</Label>
                      <select
                        className="flex h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
                        value={selected.columnRight || "text"}
                        onChange={(e) =>
                          patchSection(selected.id, {
                            columnRight: e.target.value as "logo" | "text" | "empty",
                          })
                        }
                      >
                        <option value="logo">Logo</option>
                        <option value="text">Text</option>
                        <option value="empty">Empty</option>
                      </select>
                    </div>
                  </div>

                  {(selected.columnLeft === "logo" ||
                    selected.columnRight === "logo" ||
                    !selected.columnLeft) && (
                    <MediaPicker
                      label="Logo image"
                      value={selected.logoUrl ?? logoUrl ?? ""}
                      onChange={(url) => patchSection(selected.id, { logoUrl: url })}
                      mediaUploadReady={mediaUploadReady}
                      stockReady={stockReady}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={() => patchSection(selected.id, { logoUrl: "" })}
                    >
                      Clear logo (no brand fallback)
                    </Button>
                  )}

                  {(selected.columnLeft === "text" || selected.columnRight === "text") && (
                    <div className="grid grid-cols-2 gap-2">
                      {selected.columnLeft === "text" ? (
                        <Input
                          value={selected.columnLeftText ?? ""}
                          onChange={(e) =>
                            patchSection(selected.id, { columnLeftText: e.target.value })
                          }
                          placeholder="Left text"
                        />
                      ) : (
                        <span />
                      )}
                      {selected.columnRight === "text" ? (
                        <Input
                          value={selected.columnRightText ?? ""}
                          onChange={(e) =>
                            patchSection(selected.id, { columnRightText: e.target.value })
                          }
                          placeholder="Right text"
                        />
                      ) : null}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={selected.columnLeftHref ?? selected.href ?? ""}
                      onChange={(e) =>
                        patchSection(selected.id, {
                          columnLeftHref: e.target.value,
                          href: e.target.value,
                        })
                      }
                      placeholder="Left link https://…"
                    />
                    <Input
                      value={selected.columnRightHref ?? ""}
                      onChange={(e) =>
                        patchSection(selected.id, { columnRightHref: e.target.value })
                      }
                      placeholder="Right link https://…"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Logo scale {selected.logoScale ?? 100}%</Label>
                    <input
                      type="range"
                      min={40}
                      max={180}
                      value={selected.logoScale ?? 100}
                      onChange={(e) =>
                        patchSection(selected.id, { logoScale: Number(e.target.value) })
                      }
                      className="w-full"
                    />
                  </div>
                  <TextFormatControls
                    title="Text format"
                    value={selected.format}
                    onChange={(format) => patchSection(selected.id, { format })}
                  />
                </>
              )}

              {selected.type === "text" && (
                <>
                  <textarea
                    className="min-h-[100px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    value={selected.text ?? ""}
                    onChange={(e) => patchSection(selected.id, { text: e.target.value })}
                    placeholder="Text content"
                  />
                  <TextFormatControls
                    title="Full font & size"
                    value={selected.format}
                    onChange={(format) => patchSection(selected.id, { format })}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Text color</Label>
                      <Input
                        type="color"
                        value={selected.textColor || config.textColor}
                        onChange={(e) =>
                          patchSection(selected.id, { textColor: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Background</Label>
                      <Input
                        type="color"
                        value={selected.backgroundColor || "#00000000"}
                        onChange={(e) =>
                          patchSection(selected.id, { backgroundColor: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </>
              )}

              {selected.type === "spacer" && (
                <div className="space-y-1">
                  <Label className="text-xs">Height</Label>
                  <select
                    className="flex h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
                    value={selected.height || "md"}
                    onChange={(e) =>
                      patchSection(selected.id, {
                        height: e.target.value as "sm" | "md" | "lg",
                      })
                    }
                  >
                    <option value="sm">Small</option>
                    <option value="md">Medium</option>
                    <option value="lg">Large</option>
                  </select>
                </div>
              )}

              {selected.type === "footer_cta" && (
                <>
                  <Input
                    value={selected.text ?? ""}
                    onChange={(e) => patchSection(selected.id, { text: e.target.value })}
                    placeholder="Headline"
                  />
                  <Input
                    value={selected.description ?? ""}
                    onChange={(e) =>
                      patchSection(selected.id, { description: e.target.value })
                    }
                    placeholder="Supporting line"
                  />
                  <Input
                    value={selected.buttonLabel ?? ""}
                    onChange={(e) =>
                      patchSection(selected.id, { buttonLabel: e.target.value })
                    }
                    placeholder="Button label"
                  />
                  <Input
                    value={selected.href ?? ""}
                    onChange={(e) => patchSection(selected.id, { href: e.target.value })}
                    placeholder="/sign-up"
                  />
                </>
              )}
            </div>
          )}
          </div>
        </aside>
      </div>
    </div>
  );
}
