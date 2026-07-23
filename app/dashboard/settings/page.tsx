import Link from "next/link";
import { requireBusiness } from "@/lib/auth";
import { STUDIO_NAV } from "@/lib/fusion/studio/ia";
import { listRegistryStatus } from "@/lib/fusion/features";
import { integrations } from "@/lib/config/integrations";
import { listDeadLetters } from "@/lib/fusion/publication/events";
import { listEmailProviderReadiness } from "@/lib/fusion/comms/email-readiness";
import { OutboxDeadLetterPanel } from "@/components/fusion/outbox/dead-letter-panel";

export const dynamic = "force-dynamic";

export default async function SettingsHubPage() {
  const { business } = await requireBusiness();
  const features = listRegistryStatus();
  const configured = integrations.filter((i) => i.configured).length;
  const emailReady = listEmailProviderReadiness();

  let deadLetters: Awaited<ReturnType<typeof listDeadLetters>> = [];
  try {
    deadLetters = await listDeadLetters({ businessId: business.id, limit: 30 });
  } catch {
    deadLetters = [];
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Workspace admin hub — providers, plans, privacy, outbox recovery, and feature visibility.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/dashboard/integrations"
          className="rounded-xl border border-border/60 bg-card/40 p-4 transition hover:border-primary/50"
        >
          <p className="font-medium">Integrations</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {configured}/{integrations.length} providers configured
          </p>
        </Link>
        <Link
          href="/dashboard/billing"
          className="rounded-xl border border-border/60 bg-card/40 p-4 transition hover:border-primary/50"
        >
          <p className="font-medium">Billing & plans</p>
          <p className="mt-1 text-xs text-muted-foreground">Stripe-ready boundary · entitlements</p>
        </Link>
        <Link
          href="/admin/platform"
          className="rounded-xl border border-border/60 bg-card/40 p-4 transition hover:border-primary/50"
        >
          <p className="font-medium">Feature activation</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {features.filter((f) => f.enabled).length} enabled · platform admin
          </p>
        </Link>
      </div>

      <section className="rounded-xl border border-border/60 p-4">
        <h2 className="text-sm font-semibold">Email provider readiness</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Mode: {emailReady.ready ? "Live (Resend)" : "Mock adapter"} · mock always available
        </p>
        {!emailReady.ready ? (
          <p className="mt-2 font-mono text-[10px] text-muted-foreground">
            Missing: {emailReady.missingEnvVars.join(", ")}
          </p>
        ) : null}
      </section>

      <section id="outbox" className="scroll-mt-20 rounded-xl border border-border/60 p-4">
        <h2 className="text-sm font-semibold">Outbox dead letters</h2>
        <div className="mt-3">
          <OutboxDeadLetterPanel
            initialRecords={deadLetters.map((r) => ({
              id: r.id,
              topic: r.topic,
              status: r.status,
              attempts: r.attempts,
              lastError: r.lastError,
              availableAt: r.availableAt,
            }))}
          />
        </div>
      </section>

      <section className="rounded-xl border border-border/60 p-4">
        <h2 className="text-sm font-semibold">Studio destinations</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {STUDIO_NAV.map((item) => (
            <li key={item.id} className="rounded-lg bg-muted/30 px-3 py-2 text-sm">
              <p className="font-medium">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.description}</p>
              <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                {item.href} ← {item.aliases.join(", ")}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
