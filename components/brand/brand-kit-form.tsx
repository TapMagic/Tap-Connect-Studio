"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MediaPicker } from "@/components/media/media-picker";
import {
  SOCIAL_PLATFORM_OPTIONS,
  type BrandContactProfile,
} from "@/lib/brand/contact-profile";

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
  };
  mediaUploadReady?: boolean;
  stockReady?: boolean;
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
    organization: brandKit.contactProfile.organization ?? brandKit.contactProfile.displayName ?? "",
    phone: brandKit.contactProfile.phone ?? brandKit.phone ?? "",
    email: brandKit.contactProfile.email ?? brandKit.email ?? "",
    website: brandKit.contactProfile.website ?? brandKit.website ?? "",
    address: brandKit.contactProfile.address ?? "",
    note: brandKit.contactProfile.note ?? "",
    socials: brandKit.contactProfile.socials ?? {},
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/brand", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        phone: contact.phone || null,
        website: contact.website || null,
        email: form.email,
        contactProfile: contact,
      }),
    });
    if (!res.ok) {
      setMessage("Failed to save");
      setSaving(false);
      return;
    }
    setMessage("Brand kit saved — Save Contact buttons can use this profile");
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Logo & assets</CardTitle>
        </CardHeader>
        <CardContent>
          <MediaPicker
            label="Brand logo (also used as vCard photo)"
            value={form.logoUrl ?? ""}
            onChange={(url) => setForm((f) => ({ ...f, logoUrl: url }))}
            mediaUploadReady={mediaUploadReady}
            stockReady={stockReady}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact card (vCard)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Fill this once. Tap pages can offer “Save to contacts” with one click — branded with your
            logo.
          </p>
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
                  onChange={(e) => setContact((c) => ({ ...c, [key]: e.target.value }))}
                />
              </div>
            ))}
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">Note on contact card</Label>
              <Input
                value={contact.note ?? ""}
                onChange={(e) => setContact((c) => ({ ...c, note: e.target.value }))}
                placeholder="Optional note guests see in their address book"
              />
            </div>
          </div>
          <div className="space-y-2 pt-2">
            <Label className="text-xs">Social links</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {SOCIAL_PLATFORM_OPTIONS.map((opt) => (
                <div key={opt.id} className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">{opt.label}</Label>
                  <Input
                    value={contact.socials?.[opt.id] ?? ""}
                    onChange={(e) =>
                      setContact((c) => ({
                        ...c,
                        socials: { ...c.socials, [opt.id]: e.target.value },
                      }))
                    }
                    placeholder={opt.placeholder}
                  />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Colors</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(["primaryColor", "secondaryColor", "accentColor", "backgroundColor", "textColor"] as const).map(
            (key) => (
              <div key={key} className="space-y-2">
                <Label className="capitalize">{key.replace("Color", " color")}</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={form[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    className="h-10 w-12 cursor-pointer rounded"
                  />
                  <Input
                    value={form[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    className="font-mono text-xs"
                  />
                </div>
              </div>
            )
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Typography & Style</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Font style</Label>
            <Select
              value={form.fontStyle}
              onChange={(e) => setForm((f) => ({ ...f, fontStyle: e.target.value }))}
            >
              <option value="MODERN">Modern</option>
              <option value="CLASSIC">Classic</option>
              <option value="PLAYFUL">Playful</option>
              <option value="PREMIUM">Premium</option>
              <option value="MINIMAL">Minimal</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Button style</Label>
            <Select
              value={form.buttonStyle}
              onChange={(e) => setForm((f) => ({ ...f, buttonStyle: e.target.value }))}
            >
              <option value="ROUNDED">Rounded</option>
              <option value="PILL">Pill</option>
              <option value="SHARP">Sharp</option>
              <option value="SOFT">Soft</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Default language</Label>
            <Select
              value={form.defaultLanguage}
              onChange={(e) => setForm((f) => ({ ...f, defaultLanguage: e.target.value }))}
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="pt">Portuguese</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Brand tone</Label>
            <Select
              value={form.tone}
              onChange={(e) => setForm((f) => ({ ...f, tone: e.target.value }))}
            >
              <option value="professional">Professional</option>
              <option value="friendly">Friendly</option>
              <option value="premium">Premium</option>
              <option value="playful">Playful</option>
              <option value="urgent">Urgent</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Compliance & alerts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={form.ageGateEnabled}
              onChange={(e) => setForm((f) => ({ ...f, ageGateEnabled: e.target.checked }))}
            />
            <Label>Enable age gate on campaigns</Label>
            {form.ageGateEnabled && (
              <Input
                type="number"
                value={form.ageGateMinAge}
                onChange={(e) =>
                  setForm((f) => ({ ...f, ageGateMinAge: parseInt(e.target.value) || 21 }))
                }
                className="w-20"
              />
            )}
          </div>
          <div className="space-y-2">
            <Label>Default disclaimer</Label>
            <Input
              value={form.defaultDisclaimer ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, defaultDisclaimer: e.target.value }))}
              placeholder="e.g. Must be 21+ with valid ID. Availability varies."
            />
          </div>
          <div className="space-y-2">
            <Label>Lead notification email</Label>
            <Input
              type="email"
              value={form.email ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value || null }))}
              placeholder="you@yourbusiness.com"
            />
          </div>
          <div className="space-y-2">
            <Label>Google Review URL</Label>
            <Input
              value={form.googleReviewUrl ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, googleReviewUrl: e.target.value }))}
              placeholder="https://g.page/..."
            />
          </div>
        </CardContent>
      </Card>

      {message && <p className="text-sm text-primary">{message}</p>}
      <Button onClick={handleSave} disabled={saving}>
        {saving ? "Saving..." : "Save Brand Kit"}
      </Button>
    </div>
  );
}
