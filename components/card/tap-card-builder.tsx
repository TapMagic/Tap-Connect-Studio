"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  GripVertical,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { nanoid } from "nanoid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MediaPicker } from "@/components/media/media-picker";
import { TapConnectCard } from "@/components/tap/tap-connect-card";
import { IconPicker } from "@/components/design/icon-picker";
import { FinishPicker, TextFormatControls } from "@/components/design/format-controls";
import type { BrandContactProfile } from "@/lib/brand/contact-profile";
import {
  TAP_CARD_ACTION_CATALOG,
  type TapCardActionKind,
  type TapCardSection,
  type TapConnectCardConfig,
} from "@/lib/brand/tap-card";
import type { PremiumFinish } from "@/lib/design/premium-finish";
import { cn } from "@/lib/utils";

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
};

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
}: Props) {
  const router = useRouter();
  const [config, setConfig] = useState(initialConfig);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [addKind, setAddKind] = useState<TapCardActionKind>("calendar");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [demoPublished, setDemoPublished] = useState(isLandingDemo);

  const sorted = [...config.sections].sort((a, b) => a.order - b.order);
  const selected = sorted.find((s) => s.id === selectedId) ?? null;

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

  function move(id: string, dir: "up" | "down") {
    const i = sorted.findIndex((s) => s.id === id);
    const j = dir === "up" ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= sorted.length) return;
    const next = [...sorted];
    [next[i], next[j]] = [next[j], next[i]];
    setSections(next);
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
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-background/95 px-4 py-3 backdrop-blur">
        <div>
          <p className="text-sm font-semibold">Tap Connect Card builder</p>
          <p className="text-xs text-muted-foreground">
            Real preview · drag segments · infinite action types
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

      {message ? (
        <p className="border-b border-border/40 px-4 py-2 text-sm text-primary">{message}</p>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside className="w-full shrink-0 overflow-y-auto border-r border-border/60 p-4 lg:w-[300px]">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Accent</Label>
                <Input
                  type="color"
                  value={config.accentColor}
                  onChange={(e) => patchConfig({ accentColor: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Surface</Label>
                <Input
                  type="color"
                  value={config.surfaceColor}
                  onChange={(e) => patchConfig({ surfaceColor: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Text</Label>
                <Input
                  type="color"
                  value={config.textColor}
                  onChange={(e) => patchConfig({ textColor: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Neon</Label>
                <Input
                  type="color"
                  value={config.neonColor || config.accentColor}
                  onChange={(e) => patchConfig({ neonColor: e.target.value })}
                />
              </div>
            </div>
            <FinishPicker
              label="Card shell finish"
              value={config.cardFinish}
              onChange={(cardFinish) => patchConfig({ cardFinish })}
            />
            <FinishPicker
              label="Default button finish"
              value={config.defaultFinish}
              onChange={(defaultFinish) => patchConfig({ defaultFinish })}
            />
            <div className="space-y-1">
              <Label className="text-xs">Actions layout</Label>
              <select
                className="flex h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
                value={config.actionsLayout}
                onChange={(e) =>
                  patchConfig({
                    actionsLayout: e.target.value as TapConnectCardConfig["actionsLayout"],
                  })
                }
              >
                <option value="stack">Stack (full width)</option>
                <option value="grid_2">Two columns</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={config.collapsible}
                onChange={(e) => patchConfig({ collapsible: e.target.checked })}
              />
              Collapsible in campaigns
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={config.defaultCollapsed}
                onChange={(e) => patchConfig({ defaultCollapsed: e.target.checked })}
              />
              Start collapsed
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={Boolean(config.compactActionsOnly)}
                onChange={(e) => patchConfig({ compactActionsOnly: e.target.checked })}
              />
              Compact — buttons only (no hero)
            </label>
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

            <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3">
              <Label className="text-xs">Add action</Label>
              <select
                className="mt-1 flex h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
                value={addKind}
                onChange={(e) => setAddKind(e.target.value as TapCardActionKind)}
              >
                {TAP_CARD_ACTION_CATALOG.map((c) => (
                  <option key={c.kind} value={c.kind}>
                    {c.label}
                  </option>
                ))}
              </select>
              <Button type="button" size="sm" className="mt-2 w-full" onClick={addAction}>
                <Plus className="mr-1 h-4 w-4" />
                Add
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
                  <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {section.label || section.type}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      move(section.id, "up");
                    }}
                    disabled={index === 0}
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      move(section.id, "down");
                    }}
                    disabled={index === sorted.length - 1}
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
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
                </p>
              </div>
            ))}
          </div>
        </aside>

        <div className="flex min-h-0 flex-1 flex-col items-center overflow-auto bg-black/30 p-4">
          <p className="mb-2 text-[11px] text-muted-foreground">
            Live card · same renderer as production taps
          </p>
          <div className="builder-phone">
            <div className="builder-phone-notch" />
            <div className="builder-phone-screen !bg-[#1a1a1a] p-3">
              <TapConnectCard
                config={config}
                profile={profile}
                businessName={businessName}
                logoUrl={logoUrl}
                reviewUrl={reviewUrl}
                forceExpanded
              />
            </div>
          </div>
        </div>

        <aside className="w-full shrink-0 overflow-y-auto border-l border-border/60 p-4 lg:w-[320px]">
          <p className="mb-3 text-sm font-semibold">
            {selected ? `Edit: ${selected.label || selected.type}` : "Select a segment"}
          </p>
          {!selected ? (
            <p className="text-xs text-muted-foreground">
              Promo header is a clickable deal strip. Hero supports photo + logo seal. Actions
              support Square, calendar, email, socials, homescreen tips, and more. Downloaded .vcf
              stays contact-only — live actions are the magic.
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
                  <p className="text-[10px] text-muted-foreground">
                    Use &quot;Any custom link&quot; for Square, Shopify, Calendly, TikTok shops —
                    any URL.
                  </p>
                  <Input
                    value={selected.href ?? ""}
                    onChange={(e) => patchSection(selected.id, { href: e.target.value })}
                    placeholder="https://… (any link)"
                  />
                  <FinishPicker
                    value={selected.finish || selected.style || config.defaultFinish}
                    onChange={(finish: PremiumFinish) =>
                      patchSection(selected.id, { finish, style: finish })
                    }
                  />
                  <IconPicker
                    icon={selected.icon || selected.actionKind || "link"}
                    customUrl={selected.iconUrl}
                    onChange={({ icon, customUrl }) =>
                      patchSection(selected.id, {
                        icon: icon || selected.icon,
                        iconUrl: customUrl,
                      })
                    }
                    mediaUploadReady={mediaUploadReady}
                  />
                  <TextFormatControls
                    title="Button label format"
                    value={selected.format}
                    onChange={(format) => patchSection(selected.id, { format })}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Fill color</Label>
                      <Input
                        type="color"
                        value={selected.backgroundColor || "#0c0a07"}
                        onChange={(e) =>
                          patchSection(selected.id, { backgroundColor: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Label color</Label>
                      <Input
                        type="color"
                        value={selected.textColor || config.textColor}
                        onChange={(e) =>
                          patchSection(selected.id, { textColor: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </>
              )}
              {selected.type === "promo_header" && (
                <>
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
                    placeholder="Click URL"
                  />
                  <TextFormatControls
                    title="Promo typography"
                    value={selected.format}
                    onChange={(format) => patchSection(selected.id, { format })}
                  />
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
                    title="Identity typography"
                    value={selected.format}
                    onChange={(format) => patchSection(selected.id, { format })}
                  />
                </>
              )}
              {selected.type === "hero" && (
                <>
                  <MediaPicker
                    label="Hero photo"
                    value={selected.imageUrl ?? ""}
                    onChange={(url) => patchSection(selected.id, { imageUrl: url })}
                    mediaUploadReady={mediaUploadReady}
                    stockReady={stockReady}
                  />
                  <MediaPicker
                    label="Logo seal"
                    value={selected.logoUrl ?? logoUrl ?? ""}
                    onChange={(url) => patchSection(selected.id, { logoUrl: url })}
                    mediaUploadReady={mediaUploadReady}
                    stockReady={stockReady}
                  />
                  <Input
                    value={selected.href ?? ""}
                    onChange={(e) => patchSection(selected.id, { href: e.target.value })}
                    placeholder="Logo / hero link"
                  />
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={Boolean(selected.showCallBadge)}
                      onChange={(e) =>
                        patchSection(selected.id, { showCallBadge: e.target.checked })
                      }
                    />
                    Show Call badge
                  </label>
                </>
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
        </aside>
      </div>
    </div>
  );
}
