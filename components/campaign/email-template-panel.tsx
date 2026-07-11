"use client";

import { Mail } from "lucide-react";
import { FeaturePlaceholder } from "@/components/integrations/feature-placeholder";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface EmailTemplatePanelProps {
  emailReady?: boolean;
}

export function EmailTemplatePanel({ emailReady = false }: EmailTemplatePanelProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Mail className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Branded email templates</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        Auto-reply when leads submit forms — includes your logo, colors, coupon image, and custom copy.
      </p>

      {!emailReady && (
        <FeaturePlaceholder
          title="Resend email (not configured)"
          description="Branded emails with images require Resend. Free tier: 100 emails/day."
          envVars={["RESEND_API_KEY", "RESEND_FROM_EMAIL"]}
          signupUrl="https://resend.com"
          costNote="GetResponse reserved for future marketing campaigns add-on."
          comingSoon
        />
      )}

      <div className="space-y-3 opacity-60 pointer-events-none">
        <div>
          <Label>Subject line</Label>
          <Input placeholder="Thanks for joining our VIP list!" disabled />
        </div>
        <div>
          <Label>Email body</Label>
          <Textarea placeholder="Hi {{name}}, here's your 10% off coupon..." rows={4} disabled />
        </div>
        <div>
          <Label>Header image / logo</Label>
          <Input placeholder="Uses brand kit logo when configured" disabled />
        </div>
      </div>
    </div>
  );
}
