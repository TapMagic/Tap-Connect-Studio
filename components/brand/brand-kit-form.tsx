"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  ExternalLink,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MediaPicker } from "@/components/media/media-picker";
import { IconPicker } from "@/components/design/icon-picker";
import { PremiumIcon } from "@/components/design/premium-icon";
import {
  SOCIAL_PLATFORM_OPTIONS,
  saveContactWithUserGesture,
  buildVCard,
  type BrandContactProfile,
  type SocialPlatform,
} from "@/lib/brand/contact-profile";
import { defaultEndExperience, parseEndExperience, type EndExperience } from "@/lib/end-experience";
import { cn } from "@/lib/utils";

export type BrandLinkItem = {
  id: string;
  title: string;
  description?: string;
  href: string;
  /** Preferred: uploaded/pasted logo mark */
  logoUrl?: string;
  /** Legacy / fallback image */
  iconUrl?: string;
  icon?: string;
  iconColor?: string;
  platform?: string;
};

type LinkDisplay = "pill" | "tile" | "compact";

interface BrandKitFormProps {
  brandKit: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    backgroundColor: string;
    textColor: string;
    fontStyle: string;
    buttonStyle: string;
    defaultLanguage: string;
    tone: string;
    defaultDisclaimer: string | null;
    ageGateEnabled: boolean;
    ageGateMinAge: number;
    website: string | null;
    phone: string | null;
    googleReviewUrl: string | null;
    logoUrl: string | null;
    email: string | null;
    contactProfile: BrandContactProfile;
    otherLinks?: BrandLinkItem[];
    endExperience?: unknown;
  };
  mediaUploadReady?: boolean;
  stockReady?: boolean;
}

function asLinksFromLegacy(
  other: BrandLinkItem[],
  socials?: BrandContactProfile["socials"]
): BrandLinkItem[] {
  const fromOther = other.map((l) => ({
    ...l,
    logoUrl: l.logoUrl || l.iconUrl,
  }));
  const existingPlatforms = new Set(
    fromOther.map((l) => l.platform).filter(Boolean)
  );
  const fromSocials: BrandLinkItem[] = SOCIAL_PLATFORM_OPTIONS.filter(
    (opt) => socials?.[opt.id] && !existingPlatforms.has(opt.id)
  ).map((opt) => ({
    id: `social-${opt.id}`,
    title: opt.label,
    href: socials?.[opt.id] || "",
    platform: opt.id,
    icon: opt.id,
  }));
  return [...fromSocials, ...fromOther];
}

export function BrandKitForm({
  brandKit,
  mediaUploadReady = false,
  stockReady = false,
}: BrandKitFormProps) {
  const router = useRouter();
  const [form, setForm] = useState(brandKit);
  const [contact, setContact] = useState<BrandContactProfile>({
    displayName: brandKit.contactProfile.displayName ?? "",
    jobTitle: brandKit.contactProfile.jobTitle ?? "",
    organization:
      brandKit.contactProfile.organization ??
      brandKit.contactProfile.displayName ??
      "",
    phone: brandKit.contactProfile.phone ?? brandKit.phone ?? "",
    email: brandKit.contactProfile.email ?? brandKit.email ?? "",
    website: brandKit.contactProfile.website ?? brandKit.website ?? "",
    address: brandKit.contactProfile.address ?? "",
    note: brandKit.contactProfile.note ?? "",
    photoUrl: brandKit.contactProfile.photoUrl ?? brandKit.logoUrl ?? "",
    socials: brandKit.contactProfile.socials ?? {},
  });
  const [links, setLinks] = useState<BrandLinkItem[]>(() =>
    asLinksFromLegacy(
      Array.isArray(brandKit.otherLinks) ? brandKit.otherLinks : [],
      brandKit.contactProfile.socials
    )
  );
  const [linkDisplay, setLinkDisplay] = useState<LinkDisplay>("tile");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [endExperience, setEndExperience] = useState<EndExperience>(() =>
    parseEndExperience(brandKit.endExperience ?? defaultEndExperience())
  );
  const [testingVcard, setTestingVcard] = useState(false);

  const editing = useMemo(
    () => links.find((l) => l.id === editingId) ?? null,
    [links, editingId]
  );

  function patchLink(id: string, patch: Partial<BrandLinkItem>) {
    setLinks((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function addLink(preset?: SocialPlatform) {
    const opt = SOCIAL_PLATFORM_OPTIONS.find((o) => o.id === preset);
    const id = crypto.randomUUID();
    const item: BrandLinkItem = {
      id,
      title: opt?.label ?? "Custom link",
      href: "",
      platform: preset,
      icon: preset || "link",
    };
    setLinks((prev) => [...prev, item]);
    setEditingId(id);
  }

  function deleteLink(id: string) {
    setLinks((prev) => prev.filter((l) => l.id !== id));
    if (editingId === id) setEditingId(null);
  }

  function buildSocialsMap(): BrandContactProfile["socials"] {
    const socials: BrandContactProfile["socials"] = {};
    for (const l of links) {
      if (l.platform && l.href.trim()) {
        socials[l.platform as SocialPlatform] = l.href.trim();
      }
    }
    return socials;
  }

  function otherLinksPayload(): BrandLinkItem[] {
    return links
      .filter((l) => l.href.trim() || l.title.trim())
      .map((l) => ({
        id: l.id.startsWith("social-") ? crypto.randomUUID() : l.id,
        title: l.title,
        description: l.description,
        href: l.href,
        logoUrl: l.logoUrl || undefined,
        iconUrl: l.logoUrl || l.iconUrl || undefined,
        icon: l.icon,
        iconColor: l.iconColor,
        platform: l.platform,
      }));
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    const socials = buildSocialsMap();
    const res = await fetch("/api/brand", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        phone: contact.phone || null,
        website: contact.website || null,
        email: form.email,
        contactProfile: { ...contact, socials },
        otherLinks: otherLinksPayload(),
        endExperience,
      }),
    });
    if (!res.ok) {
      setMessage("Failed to save");
      setSaving(false);
      return;
    }
    setMessage("Brand kit saved");
    setSaving(false);
    router.refresh();
  }

  async function testVcardDownload() {
    setTestingVcard(true);
    const fullName =
      contact.displayName || contact.organization || "Contact";
    let photoBase64: string | undefined;
    let photoType: "JPEG" | "PNG" | undefined;
    const photo = contact.photoUrl || form.logoUrl;
    if (photo) {
      try {
        if (photo.startsWith("data:image/")) {
          const m = /^data:image\/(png|jpeg|jpg);base64,(.+)$/i.exec(photo);
          if (m) {
            photoType = m[1].toLowerCase() === "png" ? "PNG" : "JPEG";
            photoBase64 = m[2];
          }
        } else {
          const res = await fetch(
            `/api/public/vcard-photo?url=${encodeURIComponent(photo)}`
          );
          if (res.ok) {
            const data = (await res.json()) as {
              base64?: string;
              type?: string;
            };
            photoBase64 = data.base64;
            photoType = data.type === "PNG" ? "PNG" : "JPEG";
          }
        }
      } catch {
        /* optional */
      }
    }
    const vcf = buildVCard({
      fullName,
      organization: contact.organization,
      title: contact.jobTitle,
      phone: contact.phone,
      email: contact.email,
      website: contact.website,
      address: contact.address,
      note: contact.note,
      photoBase64,
      photoType,
    });
    await saveContactWithUserGesture({
      filename: fullName.replace(/\s+/g, "-"),
      content: vcf,
      title: fullName,
    });
    setTestingVcard(false);
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Quick actions header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/50 bg-muted/15 px-4 py-3">
        <div>
          <p className="text-sm font-semibold">Brand Kit workspace</p>
          <p className="text-xs text-muted-foreground">
            Logos preferred · icons + color when needed · compact link tiles
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="/dashboard/card">
            <Button type="button" variant="outline" size="sm">
              Edit Tap Card
            </Button>
          </a>
          <Button type="button" size="sm" onClick={() => void handleSave()} disabled={saving}>
            {saving ? "Saving…" : "Save Brand Kit"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Identity & vCard</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-border/50 bg-background/40 p-3">
                <MediaPicker
                  label="vCard photo / logo at top (preferred)"
                  value={contact.photoUrl ?? form.logoUrl ?? ""}
                  onChange={(url) => {
                    setContact((c) => ({ ...c, photoUrl: url }));
                    if (!form.logoUrl) setForm((f) => ({ ...f, logoUrl: url }));
                  }}
                  mediaUploadReady={mediaUploadReady}
                  stockReady={stockReady}
                />
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Embedded at the top of the downloaded contact card. One tap downloads or opens the
                  system share sheet — no extra confirmations.
                </p>
              </div>

              <MediaPicker
                label="Brand logo (campaigns & Tap Card)"
                value={form.logoUrl ?? ""}
                onChange={(url) => setForm((f) => ({ ...f, logoUrl: url }))}
                mediaUploadReady={mediaUploadReady}
                stockReady={stockReady}
              />

              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ["displayName", "Display name"],
                    ["jobTitle", "Title / role"],
                    ["organization", "Business / org"],
                    ["phone", "Phone"],
                    ["email", "Public email"],
                    ["website", "Website"],
                    ["address", "Address"],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key} className="space-y-1">
                    <Label className="text-xs">{label}</Label>
                    <Input
                      value={contact[key] ?? ""}
                      onChange={(e) =>
                        setContact((c) => ({ ...c, [key]: e.target.value }))
                      }
                    />
                  </div>
                ))}
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs">Note on contact card</Label>
                  <Input
                    value={contact.note ?? ""}
                    onChange={(e) =>
                      setContact((c) => ({ ...c, note: e.target.value }))
                    }
                    placeholder="Optional note guests see in their address book"
                  />
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={testingVcard}
                onClick={() => void testVcardDownload()}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                {testingVcard ? "Opening Contacts…" : "Test Save to contacts"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-3">
              <div>
                <CardTitle className="text-base">Links & socials</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Small pills or tiles · logo preferred · icon + color fallback
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border/50 p-0.5">
                {(["pill", "tile", "compact"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setLinkDisplay(mode)}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-[10px] font-medium capitalize",
                      linkDisplay === mode
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className={cn(
                  linkDisplay === "tile" &&
                    "grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4",
                  linkDisplay === "pill" && "flex flex-wrap gap-1.5",
                  linkDisplay === "compact" && "flex flex-col gap-1"
                )}
              >
                {links.map((link) => {
                  const art = link.logoUrl || link.iconUrl;
                  const selected = editingId === link.id;
                  return (
                    <div
                      key={link.id}
                      className={cn(
                        "group relative border border-border/50 bg-background/50 transition",
                        linkDisplay === "pill" &&
                          "inline-flex max-w-full items-center gap-1.5 rounded-full py-1 pl-1 pr-1.5",
                        linkDisplay === "tile" &&
                          "flex flex-col items-center gap-1.5 rounded-xl p-2.5 text-center",
                        linkDisplay === "compact" &&
                          "flex items-center gap-2 rounded-lg px-2 py-1.5",
                        selected && "border-primary bg-primary/10"
                      )}
                    >
                      <div
                        className={cn(
                          "flex shrink-0 items-center justify-center overflow-hidden bg-muted/40",
                          linkDisplay === "pill" && "size-7 rounded-full",
                          linkDisplay === "tile" && "size-10 rounded-lg",
                          linkDisplay === "compact" && "size-8 rounded-md"
                        )}
                        style={
                          !art && link.iconColor
                            ? { color: link.iconColor }
                            : undefined
                        }
                      >
                        {art ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={art}
                            alt=""
                            className="size-full object-contain p-0.5"
                          />
                        ) : (
                          <PremiumIcon
                            icon={link.icon || link.platform || "link"}
                            color={link.iconColor}
                            sizePx={linkDisplay === "tile" ? 20 : 16}
                          />
                        )}
                      </div>
                      <div
                        className={cn(
                          "min-w-0",
                          linkDisplay === "pill" && "max-w-[7rem]",
                          linkDisplay === "tile" && "w-full",
                          linkDisplay === "compact" && "flex-1"
                        )}
                      >
                        <p className="truncate text-[11px] font-medium leading-tight">
                          {link.title || "Untitled"}
                        </p>
                        {linkDisplay !== "pill" && link.href ? (
                          <p className="truncate text-[9px] text-muted-foreground">
                            {link.href}
                          </p>
                        ) : null}
                      </div>
                      <div
                        className={cn(
                          "flex shrink-0 gap-0.5",
                          linkDisplay === "tile" && "mt-0.5"
                        )}
                      >
                        <button
                          type="button"
                          title="Edit"
                          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                          onClick={() =>
                            setEditingId(selected ? null : link.id)
                          }
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        {link.href ? (
                          <a
                            href={link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open"
                            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                          >
                            <ExternalLink className="size-3.5" />
                          </a>
                        ) : null}
                        <button
                          type="button"
                          title="Delete"
                          className="rounded p-1 text-muted-foreground hover:bg-red-500/15 hover:text-red-400"
                          onClick={() => deleteLink(link.id)}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {editing ? (
                <div className="space-y-3 rounded-xl border border-primary/40 bg-primary/5 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold">Edit link</p>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => setEditingId(null)}
                    >
                      Done
                    </Button>
                  </div>
                  <Input
                    value={editing.title}
                    onChange={(e) =>
                      patchLink(editing.id, { title: e.target.value })
                    }
                    placeholder="Title"
                  />
                  <Input
                    value={editing.href}
                    onChange={(e) =>
                      patchLink(editing.id, { href: e.target.value })
                    }
                    placeholder="https://…"
                    className="font-mono text-xs"
                  />
                  <Input
                    value={editing.description ?? ""}
                    onChange={(e) =>
                      patchLink(editing.id, { description: e.target.value })
                    }
                    placeholder="Optional description"
                  />
                  <MediaPicker
                    label="Logo mark (preferred)"
                    value={editing.logoUrl || editing.iconUrl || ""}
                    onChange={(url) =>
                      patchLink(editing.id, { logoUrl: url, iconUrl: url })
                    }
                    mediaUploadReady={mediaUploadReady}
                    stockReady={stockReady}
                  />
                  <IconPicker
                    label="Icon (when no logo)"
                    icon={editing.icon || editing.platform || "FiLink"}
                    customUrl=""
                    color={editing.iconColor || "#f8fafc"}
                    onChange={({ icon, color }) =>
                      patchLink(editing.id, {
                        icon: icon || editing.icon,
                        iconColor: color,
                      })
                    }
                    mediaUploadReady={mediaUploadReady}
                    stockReady={stockReady}
                    hideCustom
                    showLogoPicker={false}
                    persist={
                      editing.id.startsWith("social-")
                        ? true
                        : { linkId: editing.id }
                    }
                  />
                  <div className="space-y-1">
                    <Label className="text-[10px]">Platform (optional)</Label>
                    <select
                      className="flex h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
                      value={editing.platform ?? ""}
                      onChange={(e) =>
                        patchLink(editing.id, {
                          platform: e.target.value || undefined,
                          icon: e.target.value || editing.icon || "link",
                          title:
                            editing.title ||
                            SOCIAL_PLATFORM_OPTIONS.find(
                              (o) => o.id === e.target.value
                            )?.label ||
                            editing.title,
                        })
                      }
                    >
                      <option value="">Custom</option>
                      {SOCIAL_PLATFORM_OPTIONS.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => addLink()}
                >
                  <Plus className="mr-1 size-3.5" />
                  Add link
                </Button>
                {SOCIAL_PLATFORM_OPTIONS.slice(0, 6).map((o) => (
                  <Button
                    key={o.id}
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 text-[10px]"
                    onClick={() => addLink(o.id)}
                  >
                    + {o.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Colors & style</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {(
                  [
                    "primaryColor",
                    "secondaryColor",
                    "accentColor",
                    "backgroundColor",
                    "textColor",
                  ] as const
                ).map((key) => (
                  <div key={key} className="space-y-1">
                    <Label className="text-xs capitalize">
                      {key.replace("Color", "")}
                    </Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={form[key]}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, [key]: e.target.value }))
                        }
                        className="h-9 w-10 cursor-pointer rounded border-0"
                      />
                      <Input
                        value={form[key]}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, [key]: e.target.value }))
                        }
                        className="font-mono text-xs"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Font</Label>
                  <Select
                    value={form.fontStyle}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, fontStyle: e.target.value }))
                    }
                  >
                    <option value="MODERN">Modern sans</option>
                    <option value="CLASSIC">Classic serif</option>
                    <option value="PLAYFUL">Playful rounded</option>
                    <option value="PREMIUM">Premium display</option>
                    <option value="MINIMAL">Minimal</option>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Button shape</Label>
                  <Select
                    value={form.buttonStyle}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, buttonStyle: e.target.value }))
                    }
                  >
                    <option value="ROUNDED">Rounded</option>
                    <option value="PILL">Pill</option>
                    <option value="SHARP">Sharp</option>
                    <option value="SOFT">Soft</option>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Language</Label>
                  <Select
                    value={form.defaultLanguage}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        defaultLanguage: e.target.value,
                      }))
                    }
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                    <option value="pt">Portuguese</option>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tone</Label>
                  <Select
                    value={form.tone}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, tone: e.target.value }))
                    }
                  >
                    <option value="professional">Professional</option>
                    <option value="friendly">Friendly</option>
                    <option value="premium">Premium</option>
                    <option value="playful">Playful</option>
                    <option value="urgent">Urgent</option>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Compliance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.ageGateEnabled}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        ageGateEnabled: e.target.checked,
                      }))
                    }
                  />
                  Age gate
                </label>
                {form.ageGateEnabled ? (
                  <Input
                    type="number"
                    value={form.ageGateMinAge}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        ageGateMinAge: parseInt(e.target.value) || 21,
                      }))
                    }
                    className="w-20"
                  />
                ) : null}
              </div>
              <Input
                value={form.defaultDisclaimer ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    defaultDisclaimer: e.target.value,
                  }))
                }
                placeholder="Default disclaimer"
              />
              <Input
                type="email"
                value={form.email ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    email: e.target.value || null,
                  }))
                }
                placeholder="Lead notification email"
              />
              <Input
                value={form.googleReviewUrl ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    googleReviewUrl: e.target.value,
                  }))
                }
                placeholder="Google Review URL"
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={endExperience.enabled}
                  onChange={(e) =>
                    setEndExperience((x) => ({
                      ...x,
                      enabled: e.target.checked,
                    }))
                  }
                />
                Enable brand default end experience
              </label>
            </CardContent>
          </Card>
        </div>

        {/* Sticky preview column */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Live link preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={cn(
                  "rounded-xl border p-3",
                  linkDisplay === "tile" && "grid grid-cols-2 gap-2",
                  linkDisplay === "pill" && "flex flex-wrap gap-1.5",
                  linkDisplay === "compact" && "flex flex-col gap-1"
                )}
                style={{
                  background: form.backgroundColor,
                  color: form.textColor,
                  borderColor: form.accentColor,
                }}
              >
                {(contact.photoUrl || form.logoUrl) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={contact.photoUrl || form.logoUrl || ""}
                    alt=""
                    className="mx-auto mb-2 size-14 rounded-full border-2 object-cover"
                    style={{ borderColor: form.accentColor }}
                  />
                )}
                <p className="col-span-full mb-1 text-center text-xs font-semibold">
                  {contact.displayName || contact.organization || "Your brand"}
                </p>
                {links.filter((l) => l.href).length === 0 ? (
                  <p className="col-span-full text-center text-[10px] opacity-60">
                    Add links to preview pills / tiles
                  </p>
                ) : (
                  links
                    .filter((l) => l.href)
                    .slice(0, 8)
                    .map((l) => {
                      const art = l.logoUrl || l.iconUrl;
                      return (
                        <div
                          key={l.id}
                          className={cn(
                            "flex items-center gap-1.5 bg-black/20",
                            linkDisplay === "pill" && "rounded-full px-2 py-1",
                            linkDisplay === "tile" &&
                              "flex-col rounded-lg p-2 text-center",
                            linkDisplay === "compact" && "rounded-md px-2 py-1"
                          )}
                        >
                          {art ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={art}
                              alt=""
                              className="size-5 object-contain"
                            />
                          ) : (
                            <PremiumIcon
                              icon={l.icon || l.platform || "link"}
                              color={l.iconColor || form.accentColor}
                              sizePx={14}
                            />
                          )}
                          <span className="truncate text-[10px]">{l.title}</span>
                        </div>
                      );
                    })
                )}
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>

      {message ? <p className="text-sm text-primary">{message}</p> : null}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-background/95 px-4 py-3 backdrop-blur lg:left-[var(--sidebar-width,0px)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Changes apply to Tap Cards, campaign buttons, and Save contact.
          </p>
          <Button onClick={() => void handleSave()} disabled={saving}>
            {saving ? "Saving…" : "Save Brand Kit"}
          </Button>
        </div>
      </div>
    </div>
  );
}
