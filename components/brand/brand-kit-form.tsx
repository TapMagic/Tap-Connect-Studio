"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
    googleReviewUrl: string | null;
  };
}

export function BrandKitForm({ brandKit }: BrandKitFormProps) {
  const router = useRouter();
  const [form, setForm] = useState(brandKit);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/brand", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Colors</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(["primaryColor", "secondaryColor", "accentColor", "backgroundColor", "textColor"] as const).map((key) => (
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
          ))}
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
          <CardTitle>Compliance & Links</CardTitle>
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
                onChange={(e) => setForm((f) => ({ ...f, ageGateMinAge: parseInt(e.target.value) || 21 }))}
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
