"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  NestedPanelShell,
  PanelNavRow,
} from "@/components/fusion/creative-studio/nested-panel-shell";
import type { TapCardSection } from "@/lib/brand/tap-card";
import { cardBlockSourceLabel } from "@/lib/fusion/card/block-model";

type Level = "root" | "fields" | "hint";

export type SelectionPanelStackProps = {
  selected: TapCardSection | null;
  patchSection: (
    id: string,
    patch: Partial<TapCardSection>,
    label?: string
  ) => void;
  onOpenTool: (toolId: string) => void;
  campaigns?: Array<{ id: string; title: string; status: string; campaignType: string; features: string[]; devices: { code: string; label: string }[]; scheduledStart?: string | null; scheduledEnd?: string | null; group?: { id: string; title: string } | null }>;
  campaignGroups?: Array<{ id: string; title: string; status: string; defaultCampaignTitle?: string | null; slotCount: number }>;
  experiences?: Array<{ id: string; name: string; status: string }>;
  locations?: Array<{ id: string; name: string; address?: string | null; mapUrl?: string | null; isDefault?: boolean }>;
  onClose?: () => void;
};

/**
 * Level-0 Selection Hub for the Content / Inspector tool.
 * Object-specific deep editors slide in via onOpenTool (typography, buttons, …).
 */
export function SelectionPanelStack({
  selected,
  patchSection,
  onOpenTool,
  campaigns = [],
  campaignGroups = [],
  experiences = [],
  locations = [],
  onClose,
}: SelectionPanelStackProps) {
  const [level, setLevel] = useState<Level>("root");
  const [convertingOffer, setConvertingOffer] = useState(false);
  const [conversionError, setConversionError] = useState<string | null>(null);
  const [linkingGroup, setLinkingGroup] = useState(false);

  async function convertOfferToCampaign(section: TapCardSection) {
    setConvertingOffer(true);
    setConversionError(null);
    try {
      const response = await fetch("/api/card/offer/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section }),
      });
      const result = await response.json() as { ok?: boolean; error?: string; campaign?: { id: string; title: string; status: string } };
      if (!response.ok || !result.ok || !result.campaign) throw new Error(result.error || "Campaign creation failed");
      patchSection(section.id, {
        sourceMode: "LINKED",
        linkedObjectType: "CAMPAIGN",
        linkedObjectId: result.campaign.id,
        linkedObjectName: result.campaign.title,
        linkedObjectStatus: result.campaign.status,
        linkedCampaignId: result.campaign.id,
        linkedCampaignTitle: result.campaign.title,
        offerMode: "campaign",
        fallbackMode: section.fallbackMode || "LOCAL",
        fallbackText: section.fallbackText || section.headline || section.offerTitle,
      }, `Linked ${section.label || "Offer"} to Campaign`);
    } catch (error) {
      setConversionError(error instanceof Error ? error.message : "Campaign creation failed");
    } finally {
      setConvertingOffer(false);
    }
  }

  async function setCampaignGroup(section: TapCardSection, groupId: string) {
    if (!section.linkedCampaignId) return;
    setLinkingGroup(true);
    setConversionError(null);
    try {
      const response = await fetch("/api/card/offer/group", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ campaignId: section.linkedCampaignId, groupId: groupId || null }) });
      const result = await response.json() as { ok?: boolean; error?: string; group?: { id: string; title: string } | null };
      if (!response.ok || !result.ok) throw new Error(result.error || "Campaign Group link failed");
      patchSection(section.id, { linkedCampaignGroupId: result.group?.id, linkedCampaignGroupTitle: result.group?.title }, result.group ? `Added Campaign to ${result.group.title}` : "Removed Campaign from Campaign Group");
    } catch (error) {
      setConversionError(error instanceof Error ? error.message : "Campaign Group link failed");
    } finally {
      setLinkingGroup(false);
    }
  }

  const crumbs = useMemo(() => {
    const name = selected ? selected.label || selected.type : "Inspector";
    if (level === "root") return [name];
    if (level === "fields") return [name, "Fields"];
    return [name, "How editing works"];
  }, [level, selected]);

  const depth = level === "root" ? 0 : 1;

  const typeTool =
    selected?.type === "action"
      ? "buttons"
      : selected?.type === "text" || selected?.type === "identity"
        ? "typography"
        : selected?.type === "hero" ||
            selected?.type === "logo_block" ||
            selected?.type === "image" ||
            selected?.type === "image_gallery" ||
            selected?.type === "special_offer" ||
            selected?.type === "coupon" ||
            selected?.type === "ticket" ||
            selected?.type === "announcement" ||
            selected?.type === "special_event"
          ? "media"
          : selected?.type === "creative_composition"
              ? "composition"
              : null;

  return (
    <NestedPanelShell
      title={
        level === "root"
          ? selected
            ? selected.label || selected.type
            : "Inspector"
          : crumbs[crumbs.length - 1]
      }
      breadcrumbs={crumbs}
      depth={depth}
      onBack={level === "root" ? undefined : () => setLevel("root")}
      onClose={onClose}
      testId="selection-panel-stack"
    >
      {level === "root" ? (
        <div className="space-y-2" data-testid="selection-panel-hub">
          <p className="text-[10px] uppercase tracking-wide text-white/40">
            Selection Hub
          </p>
          {!selected ? (
            <p
              className="rounded-md border border-white/10 bg-white/5 px-2.5 py-2 text-[11px] text-white/55"
              data-testid="selection-hub-empty"
            >
              Select a segment on the Card or Outline. Design tools open from this
              hub — Colors, Typography, Buttons, and Media stay one decision away.
            </p>
          ) : (
            <>
              <p className="text-sm text-white/90" data-testid="selection-hub-label">
                {selected.label || selected.type}
              </p>
              <p className="text-[11px] text-white/45">{selected.type}</p>
              <div className="rounded-md border border-white/10 bg-white/[0.04] p-2" data-testid="selection-source-summary">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">Source</p>
                <p className="mt-1 text-xs text-white/80">{cardBlockSourceLabel(selected)}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <button type="button" className="rounded border border-white/15 px-2 py-1 text-[10px] hover:bg-white/5" onClick={() => patchSection(selected.id, { sourceMode: "LOCAL", brandResourceId: undefined, brandResourceName: undefined }, "Made block custom on this Card")}>Use custom value here</button>
                  <button type="button" className="rounded border border-white/15 px-2 py-1 text-[10px] hover:bg-white/5" onClick={() => onOpenTool("brand")}>Open Brand</button>
                </div>
              </div>
              <PanelNavRow
                label="Fields"
                hint="Label, enable, destinations"
                testId="selection-open-fields"
                onClick={() => setLevel("fields")}
              />
              {typeTool ? (
                <PanelNavRow
                  label={
                    typeTool === "buttons"
                      ? "Button editor"
                      : typeTool === "typography"
                        ? "Typography"
                        : typeTool === "media"
                          ? "Image & media"
                          : "Composition"
                  }
                  hint="Opens the specialized sliding editor"
                  testId={`selection-open-${typeTool}`}
                  onClick={() => onOpenTool(typeTool)}
                />
              ) : null}
              <PanelNavRow
                label="Appearance"
                hint="Colors, Brand, Layout"
                testId="selection-open-appearance"
                onClick={() => onOpenTool("appearance")}
              />
            </>
          )}
          <PanelNavRow
            label="How editing works"
            testId="selection-open-hint"
            onClick={() => setLevel("hint")}
          />
        </div>
      ) : null}

      {level === "fields" && selected ? (
        <div className="space-y-3" data-testid="selection-panel-fields">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selected.enabled}
              onChange={(e) =>
                patchSection(selected.id, { enabled: e.target.checked })
              }
            />
            Enabled
          </label>
          <Input
            value={selected.label ?? ""}
            onChange={(e) =>
              patchSection(selected.id, { label: e.target.value })
            }
            placeholder="Label"
            aria-label="Segment label"
            data-testid="card-content-label"
          />
          <div className="space-y-1">
            <label className="text-[11px] text-white/55" htmlFor={`source-${selected.id}`}>Source mode</label>
            <select
              id={`source-${selected.id}`}
              value={selected.sourceMode || "LOCAL"}
              className="flex h-10 w-full rounded-lg border border-white/15 bg-black/40 px-2 text-sm"
              data-testid="card-content-source-mode"
              onChange={(event) => patchSection(selected.id, { sourceMode: event.target.value as TapCardSection["sourceMode"] }, `Changed ${selected.label || selected.type} source`)}
            >
              <option value="LOCAL">Custom on this Card</option>
              <option value="BRAND">From Brand</option>
              <option value="LINKED">Linked</option>
            </select>
          </div>
          {selected.type === "action" ? (
            <Input
              value={selected.href ?? ""}
              onChange={(e) =>
                patchSection(selected.id, { href: e.target.value })
              }
              placeholder="https://…"
              data-testid="card-content-href"
            />
          ) : null}
          {[
            "text", "business_name", "tagline", "hours", "map", "video",
            "contact_form", "newsletter_signup", "tapsave_prompt",
          ].includes(selected.type) ? (
            <textarea
              value={selected.text ?? ""}
              onChange={(e) => patchSection(selected.id, { text: e.target.value })}
              placeholder="Heading or text"
              className="min-h-24 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm"
              data-testid="card-content-text"
            />
          ) : null}
          {selected.type === "identity" ? (
            <div className="space-y-2">
              <Input value={selected.name ?? ""} onChange={(e) => patchSection(selected.id, { name: e.target.value })} placeholder="Name" aria-label="Identity name" />
              <Input value={selected.title ?? ""} onChange={(e) => patchSection(selected.id, { title: e.target.value })} placeholder="Role or title" aria-label="Identity title" />
              <Input value={selected.organization ?? ""} onChange={(e) => patchSection(selected.id, { organization: e.target.value })} placeholder="Organization" aria-label="Identity organization" />
              <Input value={selected.headline ?? ""} onChange={(e) => patchSection(selected.id, { headline: e.target.value })} placeholder="Headline" aria-label="Identity headline" />
            </div>
          ) : null}
          {selected.type === "hours" ? (
            <textarea value={(selected.hoursLines || []).join("\n")} onChange={(e) => patchSection(selected.id, { hoursLines: e.target.value.split("\n") })} placeholder="One hours line per row" className="min-h-24 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm" data-testid="card-content-hours" />
          ) : null}
          {(selected.type === "map" || selected.type === "location") ? (
            <Input value={selected.address ?? ""} onChange={(e) => patchSection(selected.id, { address: e.target.value })} placeholder="Street address" aria-label="Address" data-testid="card-content-address" />
          ) : null}
          {selected.type === "video" ? (
            <Input value={selected.videoUrl ?? ""} onChange={(e) => patchSection(selected.id, { videoUrl: e.target.value })} placeholder="https://…/video.mp4" aria-label="Video URL" data-testid="card-content-video-url" />
          ) : null}
          {selected.type === "image_gallery" ? (
            <textarea value={(selected.imageUrls || []).join("\n")} onChange={(e) => patchSection(selected.id, { imageUrls: e.target.value.split("\n").map((url) => url.trim()).filter(Boolean) })} placeholder="One image URL per line, or use Image & media" className="min-h-28 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm" data-testid="card-content-gallery-urls" />
          ) : null}
          {["special_offer", "coupon", "ticket", "announcement", "special_event"].includes(selected.type) ? (
            <div className="space-y-2" data-testid="card-local-offer-fields">
              <Input value={selected.headline ?? ""} onChange={(e) => patchSection(selected.id, { headline: e.target.value })} placeholder="Heading" aria-label="Offer heading" />
              <textarea value={selected.description ?? ""} onChange={(e) => patchSection(selected.id, { description: e.target.value })} placeholder="Short description" className="min-h-20 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm" aria-label="Offer description" />
              <Input value={selected.offerCode ?? ""} onChange={(e) => patchSection(selected.id, { offerCode: e.target.value })} placeholder="Code (optional)" aria-label="Offer code" />
              <Input value={selected.offerValue ?? ""} onChange={(e) => patchSection(selected.id, { offerValue: e.target.value })} placeholder="Value or benefit" aria-label="Offer value" />
              <div className="grid grid-cols-2 gap-2"><Input type="date" value={selected.offerStart ?? ""} onChange={(e) => patchSection(selected.id, { offerStart: e.target.value })} aria-label="Offer start date" /><Input type="date" value={selected.offerExpires ?? ""} onChange={(e) => patchSection(selected.id, { offerExpires: e.target.value })} aria-label="Offer end date" /></div>
              <Input value={selected.offerCta ?? ""} onChange={(e) => patchSection(selected.id, { offerCta: e.target.value })} placeholder="Button label" aria-label="Offer button label" />
              <Input value={selected.href ?? ""} onChange={(e) => patchSection(selected.id, { href: e.target.value })} placeholder="Button destination" aria-label="Offer button action" />
              <textarea value={selected.offerTerms ?? ""} onChange={(e) => patchSection(selected.id, { offerTerms: e.target.value })} placeholder="Terms" className="min-h-16 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm" aria-label="Offer terms" />
              <textarea value={selected.redemptionInstructions ?? ""} onChange={(e) => patchSection(selected.id, { redemptionInstructions: e.target.value })} placeholder="Redemption instructions" className="min-h-16 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm" aria-label="Redemption instructions" />
              {selected.linkedCampaignId ? (
                <div className="rounded-lg border border-primary/25 bg-primary/10 p-2" data-testid="card-offer-campaign-link">
                  <p className="text-xs font-medium text-primary">Linked to Campaign — {selected.linkedCampaignTitle}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <a href={`/dashboard/workbench?campaignId=${encodeURIComponent(selected.linkedCampaignId)}`} className="rounded border border-primary/30 px-2 py-1 text-[10px] text-primary">Open Campaign</a>
                    <button type="button" className="rounded border border-white/15 px-2 py-1 text-[10px]" onClick={() => patchSection(selected.id, { sourceMode: "LOCAL", linkedObjectType: undefined, linkedObjectId: undefined, linkedObjectName: undefined, linkedCampaignId: undefined, linkedCampaignTitle: undefined, offerMode: "expand" }, "Unlinked Campaign and kept local Offer content")}>Use locally instead / Unlink</button>
                  </div>
                  <label className="mt-2 block text-[10px] text-white/55">Campaign Group (optional)
                    <select disabled={linkingGroup} value={selected.linkedCampaignGroupId || ""} onChange={(event) => void setCampaignGroup(selected, event.target.value)} className="mt-1 flex h-9 w-full rounded border border-white/15 bg-black/40 px-2 text-xs" data-testid="card-offer-group-picker">
                      <option value="">No Campaign Group</option>
                      {campaignGroups.map((group) => <option key={group.id} value={group.id}>{group.title} · {group.status}</option>)}
                    </select>
                  </label>
                </div>
              ) : (
                <button type="button" disabled={convertingOffer} className="min-h-10 w-full rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground disabled:opacity-50" data-testid="card-offer-convert-campaign" onClick={() => void convertOfferToCampaign(selected)}>{convertingOffer ? "Creating draft Campaign…" : "Turn this into a Campaign"}</button>
              )}
              {conversionError ? <p role="alert" className="text-xs text-red-300">{conversionError}</p> : null}
            </div>
          ) : null}
          {selected.sourceMode === "LINKED" ? (
            <div className="space-y-2 rounded-lg border border-white/10 p-2" data-testid="card-linked-fields">
              {selected.linkedObjectType === "CAMPAIGN" ? (
                <label className="block text-[11px] text-white/55">Campaign
                  <select value={selected.linkedObjectId || selected.linkedCampaignId || ""} className="mt-1 flex h-10 w-full rounded-lg border border-white/15 bg-black/40 px-2 text-sm" data-testid="card-linked-campaign-picker" onChange={(event) => {
                    const campaign = campaigns.find((item) => item.id === event.target.value);
                    patchSection(selected.id, campaign ? { linkedObjectId: campaign.id, linkedObjectName: campaign.title, linkedObjectStatus: campaign.status, linkedStartsAt: campaign.scheduledStart || undefined, linkedEndsAt: campaign.scheduledEnd || undefined, linkedCampaignId: campaign.id, linkedCampaignTitle: campaign.title, offerMode: selected.type === "special_offer" ? "campaign" : selected.offerMode, linkedCampaignGroupId: campaign.group?.id, linkedCampaignGroupTitle: campaign.group?.title } : { linkedObjectId: undefined, linkedObjectName: undefined, linkedObjectStatus: undefined, linkedStartsAt: undefined, linkedEndsAt: undefined, linkedCampaignId: undefined, linkedCampaignTitle: undefined }, campaign ? `Linked to Campaign ${campaign.title}` : "Cleared Campaign link");
                  }}>
                    <option value="">Choose a Campaign…</option>
                    {campaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.title} · {campaign.status}{campaign.group ? ` · ${campaign.group.title}` : ""}</option>)}
                  </select>
                </label>
              ) : null}
              {selected.linkedObjectType === "CAMPAIGN_GROUP" ? (
                <label className="block text-[11px] text-white/55">Campaign Group
                  <select value={selected.linkedObjectId || selected.linkedCampaignGroupId || ""} className="mt-1 flex h-10 w-full rounded-lg border border-white/15 bg-black/40 px-2 text-sm" data-testid="card-linked-group-picker" onChange={(event) => {
                    const group = campaignGroups.find((item) => item.id === event.target.value);
                    patchSection(selected.id, group ? { linkedObjectId: group.id, linkedObjectName: group.title, linkedObjectStatus: group.status, linkedCampaignGroupId: group.id, linkedCampaignGroupTitle: group.title } : { linkedObjectId: undefined, linkedObjectName: undefined, linkedObjectStatus: undefined, linkedCampaignGroupId: undefined, linkedCampaignGroupTitle: undefined }, group ? `Linked to Campaign Group ${group.title}` : "Cleared Campaign Group link");
                  }}>
                    <option value="">Choose a Campaign Group…</option>
                    {campaignGroups.map((group) => <option key={group.id} value={group.id}>{group.title} · {group.status} · {group.slotCount} slots{group.defaultCampaignTitle ? ` · default ${group.defaultCampaignTitle}` : ""}</option>)}
                  </select>
                </label>
              ) : null}
              {selected.linkedObjectType === "EXPERIENCE" ? (
                <label className="block text-[11px] text-white/55">Experience
                  <select value={selected.linkedObjectId || ""} className="mt-1 flex h-10 w-full rounded-lg border border-white/15 bg-black/40 px-2 text-sm" data-testid="card-linked-experience-picker" onChange={(event) => {
                    const experience = experiences.find((item) => item.id === event.target.value);
                    patchSection(selected.id, experience ? { linkedObjectId: experience.id, linkedObjectName: experience.name, linkedObjectStatus: experience.status, href: `/dashboard/experiences/journeys?draft=${encodeURIComponent(experience.id)}` } : { linkedObjectId: undefined, linkedObjectName: undefined, linkedObjectStatus: undefined, href: undefined }, experience ? `Linked to Experience ${experience.name}` : "Cleared Experience link");
                  }}>
                    <option value="">Choose an Experience…</option>
                    {experiences.map((experience) => <option key={experience.id} value={experience.id}>{experience.name} · {experience.status}</option>)}
                  </select>
                </label>
              ) : null}
              {selected.linkedObjectType === "LOCATION" ? (
                <label className="block text-[11px] text-white/55">Location
                  <select value={selected.linkedObjectId || ""} className="mt-1 flex h-10 w-full rounded-lg border border-white/15 bg-black/40 px-2 text-sm" data-testid="card-linked-location-picker" onChange={(event) => {
                    const location = locations.find((item) => item.id === event.target.value);
                    patchSection(selected.id, location ? { linkedObjectId: location.id, linkedObjectName: location.name, linkedObjectStatus: "ACTIVE", address: location.address || undefined, href: location.mapUrl || undefined, text: location.name } : { linkedObjectId: undefined, linkedObjectName: undefined, linkedObjectStatus: undefined, address: undefined, href: undefined }, location ? `Linked to Location ${location.name}` : "Cleared Location link");
                  }}>
                    <option value="">Choose a Location…</option>
                    {locations.map((location) => <option key={location.id} value={location.id}>{location.name}{location.isDefault ? " · Default" : ""}{location.address ? ` · ${location.address}` : ""}</option>)}
                  </select>
                </label>
              ) : null}
              <Input value={selected.linkedObjectName ?? ""} onChange={(e) => patchSection(selected.id, { linkedObjectName: e.target.value })} placeholder="Linked object name" aria-label="Linked object name" />
              <label className="block text-[11px] text-white/55">When unavailable
                <select value={selected.fallbackMode || "LOCAL"} onChange={(e) => patchSection(selected.id, { fallbackMode: e.target.value as TapCardSection["fallbackMode"] })} className="mt-1 flex h-10 w-full rounded-lg border border-white/15 bg-black/40 px-2 text-sm" data-testid="card-linked-fallback">
                  <option value="HIDE">Hide this block</option><option value="LOCAL">Show local fallback</option><option value="GROUP_DEFAULT">Show Group default</option><option value="LINKED_CAMPAIGN">Show another linked Campaign</option>
                </select>
              </label>
              <textarea value={selected.fallbackText ?? ""} onChange={(e) => patchSection(selected.id, { fallbackText: e.target.value })} placeholder="Visible local fallback" className="min-h-16 w-full rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm" />
            </div>
          ) : null}
        </div>
      ) : null}

      {level === "hint" ? (
        <p
          className="rounded-md border border-white/10 bg-white/5 px-2.5 py-2 text-[11px] text-white/55"
          data-testid="selection-panel-hint"
        >
          Level 0 is this Selection Hub. Level 1 slides in for fields and specialized
          editors. Back reverses the motion; Close returns space to the canvas.
        </p>
      ) : null}
    </NestedPanelShell>
  );
}
