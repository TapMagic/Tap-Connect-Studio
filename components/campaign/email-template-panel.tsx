"use client";

import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { FeaturePlaceholder } from "@/components/integrations/feature-placeholder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  defaultEmailPromo,
  parseEmailPromo,
  type EmailPromoTemplate,
} from "@/lib/email-promo";
import { nanoid } from "nanoid";

interface EmailTemplatePanelProps {
  emailReady?: boolean;
  businessName?: string;
  campaignId?: string;
}

export function EmailTemplatePanel({
  emailReady = false,
  businessName = "your business",
  campaignId,
}: EmailTemplatePanelProps) {
  const [template, setTemplate] = useState<EmailPromoTemplate>(() =>
    defaultEmailPromo(businessName)
  );
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [logoOptions, setLogoOptions] = useState<string[]>([]);

  useEffect(() => {
    void fetch("/api/brand")
      .then((r) => r.json())
      .then((d) => {
        if (d.brandKit?.emailPromo) {
          setTemplate(parseEmailPromo(d.brandKit.emailPromo, d.businessName ?? businessName));
        }
        const logos: string[] = [];
        if (d.logoUrl) logos.push(d.logoUrl);
        if (Array.isArray(d.logoOptions)) logos.push(...d.logoOptions);
        setLogoOptions([...new Set(logos.filter(Boolean))]);
      })
      .catch(() => undefined);
  }, [businessName]);

  async function saveTemplate() {
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/brand", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emailPromo: template }),
    });
    setSaving(false);
    setMessage(res.ok ? "Promo email saved to Brand Kit (used after contact capture)." : "Save failed");
  }

  async function sendTest() {
    setLoading(true);
    setMessage(null);
    const res = await fetch("/api/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to,
        subject: template.subject,
        usePromoTemplate: true,
        campaignId,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setMessage(data.error ?? data.message ?? "Send failed");
      return;
    }
    setMessage("Test promo email sent.");
  }

  const bodyBlock = template.blocks.find((b) => b.type === "rich_text");
  const headBlock = template.blocks.find((b) => b.type === "headline");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Mail className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Follow-up promo email</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        Sent after someone submits a contact form. Includes logo / header / footer toggles and
        buildable content.
      </p>

      {!emailReady && (
        <FeaturePlaceholder
          title="Resend email (not configured)"
          description="Branded emails require Resend. Free tier: 100 emails/day."
          envVars={["RESEND_API_KEY", "RESEND_FROM_EMAIL"]}
          signupUrl="https://resend.com"
          costNote="Use a verified Resend domain."
          comingSoon
        />
      )}

      <div className={`space-y-3 ${!emailReady ? "opacity-60 pointer-events-none" : ""}`}>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={template.enabled}
            onChange={(e) => setTemplate((t) => ({ ...t, enabled: e.target.checked }))}
          />
          Send promo after contact capture
        </label>

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

        {logoOptions.length > 0 && (
          <div className="space-y-1">
            <Label className="text-xs">Logo for email</Label>
            <div className="flex flex-wrap gap-2">
              {logoOptions.map((url) => (
                <label
                  key={url}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2 ${
                    template.logoUrl === url ? "border-primary bg-primary/10" : "border-border/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="email-logo"
                    checked={template.logoUrl === url}
                    onChange={() => setTemplate((t) => ({ ...t, logoUrl: url }))}
                  />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-8 w-auto max-w-[80px] object-contain" />
                </label>
              ))}
            </div>
          </div>
        )}

        <div>
          <Label>Subject</Label>
          <Input
            value={template.subject}
            onChange={(e) => setTemplate((t) => ({ ...t, subject: e.target.value }))}
          />
        </div>
        <div>
          <Label>Headline</Label>
          <Input
            value={(headBlock?.data as { headline?: string })?.headline ?? ""}
            onChange={(e) => {
              setTemplate((t) => {
                const blocks = [...t.blocks];
                const idx = blocks.findIndex((b) => b.type === "headline");
                if (idx >= 0) {
                  blocks[idx] = {
                    ...blocks[idx],
                    data: { ...blocks[idx].data, headline: e.target.value },
                  };
                } else {
                  blocks.unshift({
                    id: nanoid(6),
                    type: "headline",
                    order: 0,
                    enabled: true,
                    label: "Headline",
                    data: { headline: e.target.value, alignment: "center" },
                  });
                }
                return { ...t, blocks };
              });
            }}
          />
        </div>
        <div>
          <Label>Email body (use {"{{name}}"})</Label>
          <Textarea
            value={(bodyBlock?.data as { body?: string })?.body ?? ""}
            onChange={(e) => {
              setTemplate((t) => {
                const blocks = [...t.blocks];
                const idx = blocks.findIndex((b) => b.type === "rich_text");
                if (idx >= 0) {
                  blocks[idx] = {
                    ...blocks[idx],
                    data: { ...blocks[idx].data, body: e.target.value },
                  };
                }
                return { ...t, blocks };
              });
            }}
            rows={6}
          />
        </div>
        <Button type="button" variant="outline" onClick={() => void saveTemplate()} disabled={saving}>
          {saving ? "Saving…" : "Save promo template"}
        </Button>
        <div>
          <Label>Send test to</Label>
          <div className="flex gap-2">
            <Input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="you@example.com"
            />
            <Button onClick={() => void sendTest()} disabled={loading || !to || !emailReady}>
              {loading ? "Sending..." : "Send test"}
            </Button>
          </div>
        </div>
        {message && <p className="text-sm text-primary">{message}</p>}
      </div>
    </div>
  );
}
