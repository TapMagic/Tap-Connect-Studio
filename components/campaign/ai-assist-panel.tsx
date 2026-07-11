"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { FeaturePlaceholder } from "@/components/integrations/feature-placeholder";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface AiAssistPanelProps {
  aiReady?: boolean;
  tier?: string;
}

export function AiAssistPanel({ aiReady = false, tier = "BASIC" }: AiAssistPanelProps) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setMessage(null);
    const res = await fetch("/api/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    const data = await res.json();
    if (data.placeholder) {
      setMessage(data.message);
    }
    setLoading(false);
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
        disabled={!tierAllowsAi}
      />
      <Button onClick={handleGenerate} disabled={loading || !prompt || !tierAllowsAi}>
        {loading ? "Generating..." : "Generate campaign draft"}
      </Button>
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}
