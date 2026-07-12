"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { FeaturePlaceholder } from "@/components/integrations/feature-placeholder";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ContentBlock } from "@/lib/types/campaign";

interface AiAssistPanelProps {
  aiReady?: boolean;
  tier?: string;
  onApplyDraft?: (draft: { title?: string; blocks: ContentBlock[] }) => void;
}

export function AiAssistPanel({
  aiReady = false,
  tier = "BASIC",
  onApplyDraft,
}: AiAssistPanelProps) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [previewCount, setPreviewCount] = useState<number | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setMessage(null);
    setPreviewCount(null);

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();

      if (data.placeholder) {
        setMessage(data.message);
        return;
      }

      if (!res.ok) {
        setMessage(data.error ?? "Generation failed");
        return;
      }

      const blocks = (data.blocks ?? []) as ContentBlock[];
      if (!blocks.length) {
        setMessage("No blocks were generated. Try a more specific prompt.");
        return;
      }

      onApplyDraft?.({ title: data.title, blocks });
      setPreviewCount(blocks.length);
      setMessage(
        data.title
          ? `Applied “${data.title}” with ${blocks.length} blocks. Review on the Content tab, then Save.`
          : `Applied ${blocks.length} blocks. Review on the Content tab, then Save.`
      );
    } catch {
      setMessage("Generation failed. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  const tierAllowsAi = tier !== "BASIC";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">AI campaign assist</h3>
      </div>

      {!tierAllowsAi && (
        <p className="text-sm text-amber-400/90">AI builder available on Studio plan and above.</p>
      )}

      {!aiReady && (
        <FeaturePlaceholder
          title="OpenAI (not configured)"
          description="Describe your campaign and AI generates blocks, copy, and offers. Usage capped by plan tier."
          envVars={["OPENAI_API_KEY"]}
          signupUrl="https://platform.openai.com"
          costNote="Pay-per-use — tier limits prevent runaway cost."
          comingSoon
        />
      )}

      <Textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="e.g. Make a page for our new premium cigar with YouTube demo, VIP signup for 10% off, and directions..."
        rows={4}
        disabled={!tierAllowsAi || !aiReady || loading}
      />
      <Button
        onClick={handleGenerate}
        disabled={loading || !prompt || !tierAllowsAi || !aiReady}
      >
        {loading ? "Generating..." : "Generate campaign draft"}
      </Button>
      {previewCount != null && (
        <p className="text-xs text-muted-foreground">{previewCount} blocks ready in the editor</p>
      )}
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}
