import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductivityWorkPanel } from "@/components/fusion/connectors/productivity-work-panel";
import { TapCastChannelsPanelServer } from "@/components/fusion/tapcast/tapcast-channels-panel-server";
import { EmailRepliesIntegrationCard } from "@/components/fusion/email-replies/email-replies-integration-card";
import { CardRelationshipAnchor } from "@/components/fusion/card/card-relationship-anchor";
import { getIntegration } from "@/lib/config/integrations";
import {
  MATURITY_GROUP_META,
  buildIntegrationMaturityCatalog,
} from "@/lib/fusion/studio/integration-maturity";
import { loadCardRelationshipContext } from "@/lib/fusion/studio/load-card-relationship";
import { requireBusiness } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  const { business } = await requireBusiness();
  const card = await loadCardRelationshipContext(business.id, business.name, {
    logoUrl: business.logoUrl,
  });
  const resendConfigured = getIntegration("resend").configured;
  const catalog = buildIntegrationMaturityCatalog({ resendConfigured });

  return (
    <div
      className="zone-integrations space-y-10 p-6 lg:p-8"
      data-testid="integrations-workspace"
    >
      <CardRelationshipAnchor card={card} role="integrations_ecosystem" />

      <div>
        <p className="zone-label-integrations text-[11px] font-semibold uppercase tracking-[0.18em]">
          Integrations
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white">Connections with honest maturity</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/55">
          Logos do not imply working behavior. Each tile states what TapConnect receives, sends,
          and knows — plus who must set it up.
        </p>
      </div>

      <section id="email-replies-section" className="scroll-mt-24 space-y-3">
        <h2 className="text-lg font-semibold text-white/90">Email & Replies (detail)</h2>
        <EmailRepliesIntegrationCard />
      </section>

      {catalog.map(({ group, cards }) => {
        const meta = MATURITY_GROUP_META[group];
        return (
          <section
            key={group}
            className="scroll-mt-24 space-y-3"
            data-testid={meta.testId}
            aria-labelledby={`${group}-heading`}
          >
            <div>
              <h2 id={`${group}-heading`} className="text-lg font-semibold text-white/90">
                {meta.title}
              </h2>
              <p className="text-xs text-white/45">{meta.description}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {cards.map((c) => (
                <Card
                  key={c.id}
                  className={cn(
                    "border-white/10 bg-white/[0.02]",
                    c.configured && "border-primary/25"
                  )}
                  data-testid={`integration-card-${c.id}`}
                  data-maturity-group={group}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base text-white/90">{c.name}</CardTitle>
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        {c.maturityLabel.split("·")[0]?.trim()}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs text-white/50">
                      {c.maturityLabel}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs text-white/60">
                    <p>
                      <span className="text-white/40">Receives:</span> {c.receives}
                    </p>
                    <p>
                      <span className="text-white/40">Sends:</span> {c.sends}
                    </p>
                    <p>
                      <span className="text-white/40">Direction:</span>{" "}
                      {c.direction === "bidirectional"
                        ? "Bidirectional"
                        : c.direction === "one_way"
                          ? "One-way"
                          : "None (native)"}
                    </p>
                    <p>
                      <span className="text-white/40">Knows afterward:</span> {c.knowsAfterward}
                    </p>
                    <p>
                      <span className="text-white/40">Setup:</span>{" "}
                      {c.customerSetupRequired ? "Customer" : "No customer"}
                      {" · "}
                      {c.operatorSetupRequired ? "Operator" : "No operator"}
                    </p>
                    <p data-testid={`integration-runtime-${c.id}`}>
                      <span className="text-white/40">Runtime:</span> {c.runtimeState}
                    </p>
                    {c.envVars && c.envVars.length > 0 && !c.configured ? (
                      <div className="rounded bg-black/30 p-2 font-mono text-[10px] text-white/40">
                        {c.envVars.join(", ")}
                      </div>
                    ) : null}
                    {c.signupUrl && !c.configured ? (
                      <a
                        href={c.signupUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-11 items-center gap-1 text-primary hover:underline"
                      >
                        Set up account <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        );
      })}

      <section id="productivity-work" className="scroll-mt-24 space-y-3">
        <h2 data-testid="productivity-work-heading" className="text-lg font-semibold">
          Productivity adapters (detail)
        </h2>
        <p data-testid="productivity-live-badge" className="text-xs font-medium text-sky-300">
          VERIFIED — CREDENTIALS REQUIRED (live) · capability shown honestly above
        </p>
        <ProductivityWorkPanel />
      </section>

      <section id="tapcast-channels" className="scroll-mt-24 space-y-3">
        <TapCastChannelsPanelServer />
      </section>

      <p className="text-xs text-white/40">
        Need Brand identity for this Card?{" "}
        <Link href="/dashboard/brand/edit" className="text-primary hover:underline">
          Open focused Brand workspace
        </Link>
      </p>
    </div>
  );
}
