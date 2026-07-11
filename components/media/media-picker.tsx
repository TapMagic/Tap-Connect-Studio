"use client";

import { ImageIcon, Link2, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FeaturePlaceholder } from "@/components/integrations/feature-placeholder";

interface MediaPickerProps {
  value?: string;
  onChange?: (url: string) => void;
  label?: string;
  mediaUploadReady?: boolean;
  stockReady?: boolean;
}

export function MediaPicker({
  value = "",
  onChange,
  label = "Image",
  mediaUploadReady = false,
  stockReady = false,
}: MediaPickerProps) {
  return (
    <div className="space-y-3">
      <Label>{label}</Label>

      {/* URL — always works */}
      <div className="flex gap-2">
        <Link2 className="mt-2.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <Input
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder="Paste image URL (works now)"
        />
      </div>

      {value && (
        <div className="overflow-hidden rounded-lg border border-border/40">
          <img src={value} alt="Preview" className="max-h-32 w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
        </div>
      )}

      {!mediaUploadReady && (
        <FeaturePlaceholder
          title="Browse & paste uploads"
          description="Upload from your computer or paste images directly. Requires UploadThing + Cloudflare R2 (free tiers)."
          envVars={["UPLOADTHING_TOKEN", "R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME", "R2_PUBLIC_URL"]}
          signupUrl="https://dash.cloudflare.com"
          costNote="Stays $0 within free tier limits — hard caps enforced in app."
          comingSoon
        />
      )}

      {!stockReady && (
        <FeaturePlaceholder
          title="Stock image library"
          description="Search free clip art and photos from Unsplash and Pexels."
          envVars={["UNSPLASH_ACCESS_KEY", "PEXELS_API_KEY"]}
          signupUrl="https://unsplash.com/developers"
          costNote="Free API — no storage cost."
          comingSoon
        />
      )}

      {mediaUploadReady && (
        <div className="flex gap-2">
          <button type="button" className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-dashed border-border/60 py-3 text-sm text-muted-foreground hover:border-primary/40">
            <Upload className="h-4 w-4" /> Browse files
          </button>
          <button type="button" className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-dashed border-border/60 py-3 text-sm text-muted-foreground hover:border-primary/40">
            <ImageIcon className="h-4 w-4" /> Paste image
          </button>
        </div>
      )}
    </div>
  );
}
