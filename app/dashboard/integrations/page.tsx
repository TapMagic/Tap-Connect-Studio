import { integrations, getConfiguredCount, nativeFeatures } from "@/lib/config/integrations";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Circle, ExternalLink } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ProductivityWorkPanel } from "@/components/fusion/connectors/productivity-work-panel";
import { TapCastChannelsPanelServer } from "@/components/fusion/tapcast/tapcast-channels-panel-server";

export default function IntegrationsPage() {
  const configured = getConfiguredCount();

  return (
    <div className="space-y-10 p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-bold">Integrations</h1>
        <p className="text-muted-foreground">
          {configured} of {integrations.length} channel/media keys configured. Productivity & Work
          Management adapters are listed below with mock connect and live credential gates.
        </p>
      </div>

      <section id="productivity-work" className="scroll-mt-24 space-y-3">
        <h2
          data-testid="productivity-work-heading"
          className="text-xl font-semibold"
        >
          Productivity & Work Management
        </h2>
        <p
          data-testid="productivity-live-badge"
          className="text-xs font-medium text-sky-300"
        >
          VERIFIED — CREDENTIALS REQUIRED (live)
        </p>
        <ProductivityWorkPanel />
      </section>

      <section id="tapcast-channels" className="scroll-mt-24 space-y-3">
        <TapCastChannelsPanelServer />
      </section>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-lg">Works now (no accounts needed)</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          {Object.entries(nativeFeatures).map(([key]) => (
            <div key={key} className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-primary" />
              <span className="capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Other channel & media providers
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {integrations.map((integration) => (
            <Card
              key={integration.id}
              className={cn("border-border/60", integration.configured && "border-primary/30")}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{integration.name}</CardTitle>
                  <Badge variant={integration.configured ? "default" : "outline"}>
                    {integration.configured ? (
                      <>
                        <Check className="mr-1 h-3 w-3" /> Active
                      </>
                    ) : (
                      <>
                        <Circle className="mr-1 h-3 w-3" /> Pending
                      </>
                    )}
                  </Badge>
                </div>
                <CardDescription>{integration.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-primary/80">{integration.costNote}</p>
                {!integration.configured && (
                  <>
                    <div className="rounded bg-black/20 p-2 font-mono text-xs text-muted-foreground">
                      {integration.envVars.join(", ")}
                    </div>
                    <a
                      href={integration.signupUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                    >
                      Set up free account <ExternalLink className="ml-1 h-3.5 w-3.5" />
                    </a>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
