"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CampaignTemplate } from "@/lib/types/campaign";

export function TemplatePicker({ templates }: { templates: CampaignTemplate[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState(templates[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!title.trim()) {
      setError("Enter a campaign title");
      return;
    }
    setLoading(true);
    setError(null);

    const res = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ templateId: selected, title: title.trim() }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to create campaign");
      setLoading(false);
      return;
    }

    const { campaign } = await res.json();
    router.push(`/dashboard/campaigns/${campaign.id}`);
  }

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-6">
      <h2 className="text-lg font-semibold">Quick Start</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Choose what you&apos;re promoting and we&apos;ll set up the right blocks for you.
      </p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Campaign type</Label>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="flex h-10 w-full rounded-lg border border-input bg-background/50 px-3 text-sm"
          >
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Campaign title</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Summer Vape Accessory Promo"
          />
        </div>
      </div>
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      <Button onClick={handleCreate} disabled={loading} className="mt-4">
        {loading ? "Creating..." : "Create Campaign Draft"}
      </Button>
    </div>
  );
}
