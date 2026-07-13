import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type OnboardingStep = {
  id: string;
  label: string;
  href: string;
  done: boolean;
};

export function OnboardingChecklist({
  steps,
  businessName,
}: {
  steps: OnboardingStep[];
  businessName: string;
}) {
  const doneCount = steps.filter((s) => s.done).length;
  if (doneCount === steps.length) return null;

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Get {businessName} live</CardTitle>
        <CardDescription>
          {doneCount} of {steps.length} setup steps complete
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="mb-3 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${(doneCount / steps.length) * 100}%` }}
          />
        </div>
        {steps.map((step) => (
          <div
            key={step.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-border/40 px-3 py-2"
          >
            <div className="flex items-center gap-2">
              {step.done ? (
                <CheckCircle2 className="h-4 w-4 text-primary" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground" />
              )}
              <span
                className={cn(
                  "text-sm",
                  step.done && "text-muted-foreground line-through"
                )}
              >
                {step.label}
              </span>
            </div>
            {!step.done && (
              <Link
                href={step.href}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Go
              </Link>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
