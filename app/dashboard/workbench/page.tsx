import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CAMPAIGN_TEMPLATES } from "@/lib/campaign-templates";
import { TemplatePicker } from "@/components/workbench/template-picker";

export default function WorkbenchPage() {
  return (
    <div className="space-y-8 p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Campaign Workbench</h1>
        <p className="text-muted-foreground">
          Start with an intent, not a blank page. Pick a template and customize with guided blocks.
        </p>
      </div>

      <TemplatePicker templates={CAMPAIGN_TEMPLATES} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {CAMPAIGN_TEMPLATES.map((template) => (
          <Card key={template.id} className="border-border/60 bg-card/60">
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg">{template.name}</CardTitle>
                {template.industry && (
                  <Badge variant="outline" className="text-xs capitalize">
                    {template.industry}
                  </Badge>
                )}
              </div>
              <CardDescription>{template.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-xs text-muted-foreground">
                Includes: {template.suggestedBlocks.slice(0, 4).join(", ").replace(/_/g, " ")}...
              </p>
              <Link
                href={`/dashboard/workbench?template=${template.id}`}
                className="inline-flex items-center text-sm text-primary hover:underline"
              >
                Use template <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
