"use client";

import { useState } from "react";
import { Bot, Check, RotateCcw, X } from "lucide-react";
import { FeaturePlaceholder } from "@/components/integrations/feature-placeholder";
import { ProposalCompareSnippet } from "@/components/fusion/autopilot/proposal-compare";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ContentBlock } from "@/lib/types/campaign";
import type { ComparableProposal } from "@/lib/fusion/autopilot/budget";

interface AiAssistPanelProps {
  /** Legacy: OpenAI configured */
  aiReady?: boolean;
  /** Autopilot feature executable (ai.autopilot + credentials) */
  autopilotReady?: boolean;
  tier?: string;
  onApplyDraft?: (draft: {
    title?: string;
    blocks: ContentBlock[];
    theme?: {
      primaryColor: string;
      secondaryColor: string;
      backgroundColor: string;
      textColor: string;
    };
  }) => void;
}

type ProposalState = {
  id: string;
  status: string;
  summary: string;
  recipeId?: string;
  recipeVersion?: string;
  artifacts?: { kind: string; label: string }[];
  autoApplied: boolean;
  draft: {
    title?: string;
    blocks: ContentBlock[];
    theme?: {
      primaryColor: string;
      secondaryColor: string;
      backgroundColor: string;
      textColor: string;
    };
  };
};

export function AiAssistPanel({
  aiReady = false,
  autopilotReady = false,
  tier = "BASIC",
  onApplyDraft,
}: AiAssistPanelProps) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [deciding, setDeciding] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [proposal, setProposal] = useState<ProposalState | null>(null);
  const [previousComparable, setPreviousComparable] = useState<ComparableProposal | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setMessage(null);
    setPreviewCount(null);
    const prior = proposal;
    setProposal(null);

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

      const draft = { title: data.title as string | undefined, blocks, theme: data.theme };
      const proposalId = data.autopilot?.proposalId as string | undefined;
      const status = (data.autopilot?.status as string) ?? "pending";
      const autoApplied = Boolean(data.autopilot?.autoApplied);

      if (prior) {
        setPreviousComparable({
          id: prior.id,
          recipeId: prior.recipeId ?? "unknown",
          recipeVersion: prior.recipeVersion,
          summary: prior.summary,
          status: prior.status,
          artifacts: prior.artifacts ?? [
            { kind: "campaign_draft", label: prior.draft.title ?? "Draft" },
          ],
        });
      }

      if (proposalId) {
        setProposal({
          id: proposalId,
          status,
          summary: data.autopilot?.summary ?? "",
          recipeId: data.autopilot?.recipeId,
          recipeVersion: data.autopilot?.recipeVersion,
          artifacts: data.autopilot?.artifacts,
          autoApplied,
          draft,
        });
      }

      if (autoApplied || status === "accepted") {
        onApplyDraft?.(draft);
        setPreviewCount(blocks.length);
        setMessage(
          data.title
            ? `Applied “${data.title}” with ${blocks.length} blocks${data.theme ? " and custom colors" : ""}. Review on Content, then Save.`
            : `Applied ${blocks.length} blocks. Review on the Content tab, then Save.`
        );
      } else {
        setPreviewCount(blocks.length);
        setMessage(
          `${data.autopilot?.summary ?? "Proposal ready"} — Accept to apply, or Reject to discard.`
        );
      }
    } catch {
      setMessage("Generation failed. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function decide(action: "accept" | "reject" | "undo" | "partial") {
    if (!proposal) return;
    setDeciding(true);
    setMessage(null);
    try {
      const res = await fetch("/api/ai/proposals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposalId: proposal.id,
          action,
          ...(action === "partial"
            ? { artifactKinds: ["campaign_draft"] }
            : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Could not update proposal");
        return;
      }

      const nextStatus = data.proposal?.status as string;
      setProposal({ ...proposal, status: nextStatus });

      if (action === "accept") {
        onApplyDraft?.(proposal.draft);
        setMessage(`Accepted — applied “${proposal.draft.title ?? "draft"}”. Review then Save.`);
      } else if (action === "partial") {
        onApplyDraft?.({
          title: proposal.draft.title,
          blocks: proposal.draft.blocks,
        });
        setMessage("Partial accept — campaign draft applied (theme skipped). Review then Save.");
      } else if (action === "reject") {
        setMessage("Proposal rejected — editor unchanged.");
      } else if (action === "undo") {
        setMessage("Decision undone — proposal is ready for review again.");
      }
    } catch {
      setMessage("Could not update proposal. Try again.");
    } finally {
      setDeciding(false);
    }
  }

  const tierAllowsAi = tier !== "BASIC";
  const canGenerate = tierAllowsAi && autopilotReady;
  const showReview =
    proposal &&
    (proposal.status === "pending" || proposal.status === "undone") &&
    !proposal.autoApplied;
  const showUndo =
    proposal &&
    (proposal.status === "accepted" ||
      proposal.status === "rejected" ||
      proposal.status === "partial");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Bot className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Automation Team</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Autopilot generates validated campaign artifacts — gated by{" "}
        <code className="text-primary">ai.autopilot</code> in the Feature Registry.
      </p>

      {!tierAllowsAi && (
        <p className="text-sm text-amber-400/90">Automation Team available on Studio plan and above.</p>
      )}

      {tierAllowsAi && !autopilotReady && (
        <FeaturePlaceholder
          title="Automation Team (not active)"
          description={
            aiReady
              ? "OpenAI is configured but ai.autopilot is disabled. Platform Admin can enable it in the Feature Registry."
              : "Describe your campaign and the Automation Team generates blocks, copy, and offers. Requires OpenAI + ai.autopilot."
          }
          envVars={["OPENAI_API_KEY"]}
          signupUrl="https://platform.openai.com"
          costNote="Pay-per-use — tier limits prevent runaway cost."
          comingSoon={!aiReady}
        />
      )}

      <Textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder={`Example: Weekend cigar lounge promo, Apr 18–20, 20% off reserve boxes, unlock coupon after name+email, blue premium palette, include tasting hours and FAQ.`}
        rows={5}
        disabled={!canGenerate || loading}
      />
      <p className="text-xs text-muted-foreground">
        Tip: mention industry, offer/dates/discount, required contact fields, and colors. The Automation
        Team fills gaps with specific products and copy — then review before Save.
      </p>
      <Button onClick={handleGenerate} disabled={loading || !prompt || !canGenerate}>
        {loading ? "Generating…" : "Run Automation Team"}
      </Button>

      {proposal ? (
        <div className="space-y-3 rounded-lg border border-border/60 bg-card/40 p-3">
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="font-medium">Proposal</span>
            <span className="rounded bg-primary/15 px-2 py-0.5 text-xs capitalize text-primary">
              {proposal.status}
            </span>
          </div>
          {proposal.summary ? (
            <p className="text-xs text-muted-foreground">{proposal.summary}</p>
          ) : null}
          {showReview ? (
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                className="bg-primary text-primary-foreground"
                disabled={deciding}
                onClick={() => decide("accept")}
              >
                <Check className="mr-1 h-3.5 w-3.5" />
                Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={deciding}
                onClick={() => decide("partial")}
              >
                Draft only
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={deciding}
                onClick={() => decide("reject")}
              >
                <X className="mr-1 h-3.5 w-3.5" />
                Reject
              </Button>
            </div>
          ) : null}
          {showUndo ? (
            <Button size="sm" variant="ghost" disabled={deciding} onClick={() => decide("undo")}>
              <RotateCcw className="mr-1 h-3.5 w-3.5" />
              Undo decision
            </Button>
          ) : null}
        </div>
      ) : null}

      {proposal && previousComparable ? (
        <ProposalCompareSnippet
          left={previousComparable}
          right={{
            id: proposal.id,
            recipeId: proposal.recipeId ?? "unknown",
            recipeVersion: proposal.recipeVersion,
            summary: proposal.summary,
            status: proposal.status,
            artifacts: proposal.artifacts ?? [
              { kind: "campaign_draft", label: proposal.draft.title ?? "Draft" },
            ],
          }}
        />
      ) : null}

      {previewCount != null && (
        <p className="text-xs text-muted-foreground">{previewCount} blocks ready in the editor</p>
      )}
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}
