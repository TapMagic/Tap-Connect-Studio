"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { FeaturePlaceholder } from "@/components/integrations/feature-placeholder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface EmailTemplatePanelProps {
  emailReady?: boolean;
  businessName?: string;
}

export function EmailTemplatePanel({
  emailReady = false,
  businessName = "your business",
}: EmailTemplatePanelProps) {
  const [subject, setSubject] = useState(`Thanks for joining ${businessName}`);
  const [body, setBody] = useState(
    `Hi {{name}},\n\nThanks for tapping in. Here's your offer details and next step.\n\nSee you soon,\n${businessName}`
  );
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function sendTest() {
    setLoading(true);
    setMessage(null);
    const html = `<div style="font-family:sans-serif;line-height:1.5"><h2>${subject}</h2><p>${body
      .replace(/\n/g, "<br/>")
      .replaceAll("{{name}}", "there")}</p></div>`;
    const res = await fetch("/api/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, subject, html, previewText: body.slice(0, 120) }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setMessage(data.error ?? data.message ?? "Send failed");
      return;
    }
    setMessage("Test email sent via Resend.");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Mail className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Branded email templates</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        Draft thank-you / coupon emails. Auto-send on lead capture can hook here next.
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
        <div>
          <Label>Subject line</Label>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>
        <div>
          <Label>Email body</Label>
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} />
        </div>
        <div>
          <Label>Send test to</Label>
          <div className="flex gap-2">
            <Input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="you@example.com"
            />
            <Button onClick={sendTest} disabled={loading || !to || !emailReady}>
              {loading ? "Sending..." : "Send test"}
            </Button>
          </div>
        </div>
        {message && <p className="text-sm text-primary">{message}</p>}
      </div>
    </div>
  );
}
