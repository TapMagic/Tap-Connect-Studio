"use client";

import { ExternalLink, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface FeaturePlaceholderProps {
  title: string;
  description: string;
  envVars?: string[];
  signupUrl?: string;
  costNote?: string;
  comingSoon?: boolean;
  children?: React.ReactNode;
}

export function FeaturePlaceholder({
  title,
  description,
  envVars,
  signupUrl,
  costNote,
  comingSoon = false,
  children,
}: FeaturePlaceholderProps) {
  return (
    <Card className="border-dashed border-amber-500/30 bg-amber-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-amber-400" />
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {children}
        {comingSoon && (
          <p className="text-xs text-muted-foreground">UI ready — activates when integration keys are added.</p>
        )}
        {costNote && (
          <p className="text-xs text-primary/80">{costNote}</p>
        )}
        {envVars && envVars.length > 0 && (
          <div className="rounded-lg bg-black/20 p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Add to Railway Variables:</p>
            <ul className="space-y-1 font-mono text-xs text-amber-200/80">
              {envVars.map((v) => (
                <li key={v}>{v}</li>
              ))}
            </ul>
          </div>
        )}
        {signupUrl && (
          <a
            href={signupUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-8 items-center justify-center rounded-lg border border-primary/20 bg-background/70 px-3 text-sm font-medium hover:border-primary/45 hover:bg-primary/10"
          >
            Create free account <ExternalLink className="ml-1 h-3.5 w-3.5" />
          </a>
        )}
      </CardContent>
    </Card>
  );
}
