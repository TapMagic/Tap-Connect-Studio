import Link from "next/link";
import { requireBusiness } from "@/lib/auth";
import { listRegistryStatus } from "@/lib/fusion/features";
import { getAutopilotBudgetSummary } from "@/lib/fusion/autopilot/budget";
import { listCostLedger, listKnowledge } from "@/lib/fusion/autopilot/knowledge";
import { AUTOPILOT_CATALOG_VERSION } from "@/lib/fusion/autopilot/recipes";
import { integrations } from "@/lib/config/integrations";
import { listDeadLetters } from "@/lib/fusion/publication/events";
import { listEmailProviderReadiness } from "@/lib/fusion/comms/email-readiness";
import { listSuppressions } from "@/lib/fusion/comms/suppression";
import { isFeatureEnabled } from "@/lib/fusion/features";
import { OutboxDeadLetterPanel } from "@/components/fusion/outbox/dead-letter-panel";
import { SuppressionListPanel } from "@/components/fusion/comms/suppression-list-panel";
import { KnowledgeSnippetsPanel } from "@/components/fusion/autopilot/knowledge-snippets-panel";
import { listPermissionMatrix } from "@/lib/fusion/authz/permission-matrix";
import { StudioHubSections } from "@/components/studio/hub-sections";

export const dynamic = "force-dynamic";

export default async function SettingsHubPage() {
  const { business } = await requireBusiness();
  const features = listRegistryStatus();
  const configured = integrations.filter((i) => i.configured).length;
  const emailReady = listEmailProviderReadiness();
  const autopilotBudget = await getAutopilotBudgetSummary(business.id, business.subscriptionTier);
  const autopilotLedger = listCostLedger(business.id, 8);
  const knowledgeSnippets = listKnowledge(business.id);
  const permissionMatrix = listPermissionMatrix();
  const commsEnabled =
    isFeatureEnabled("comms.email", {}) || isFeatureEnabled("comms.messaging", {});

  let deadLetters: Awaited<ReturnType<typeof listDeadLetters>> = [];
  let suppressions: Awaited<ReturnType<typeof listSuppressions>> = [];
  try {
    deadLetters = await listDeadLetters({ businessId: business.id, limit: 30 });
    suppressions = await listSuppressions(business.id);
  } catch {
    deadLetters = [];
    suppressions = [];
  }

  return (
    <div className="space-y-8 p-5 lg:p-8">
      <StudioHubSections
        destinationId="settings"
        title="Settings"
        subtitle="Integrations, billing, team/roles, API/webhooks, Feature Registry, Automation Team, and Platform Admin — not in the primary host rail."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/dashboard/integrations"
          className="rounded-xl border border-white/8 bg-white/[0.02] p-4 transition hover:border-primary/40"
        >
          <p className="font-medium text-white/90">Integrations</p>
          <p className="mt-1 text-xs text-white/45">
            {configured}/{integrations.length} providers configured
          </p>
        </Link>
        <Link
          href="/dashboard/billing"
          className="rounded-xl border border-white/8 bg-white/[0.02] p-4 transition hover:border-primary/40"
        >
          <p className="font-medium text-white/90">Billing & plans</p>
          <p className="mt-1 text-xs text-white/45">Stripe-ready boundary · entitlements</p>
        </Link>
        <Link
          href="/admin/platform"
          className="rounded-xl border border-white/8 bg-white/[0.02] p-4 transition hover:border-primary/40"
        >
          <p className="font-medium text-white/90">Platform Admin</p>
          <p className="mt-1 text-xs text-white/45">
            {features.filter((f) => f.enabled).length} features enabled · authorized only
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

      <section className="rounded-xl border border-border/60 p-4">
        <h2 className="text-sm font-semibold">Automation Team budget</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Catalog v{AUTOPILOT_CATALOG_VERSION} · {autopilotBudget.used}/{autopilotBudget.limit}{" "}
          generations this month ({autopilotBudget.monthKey})
        </p>
        <p className="mt-1 font-mono text-[10px] text-muted-foreground">
          Est. spend (ledger): ${autopilotBudget.estimatedUsdMonth.toFixed(4)} USD ·{" "}
          {autopilotBudget.ledgerEntryCount} ledger entries
        </p>
        {!autopilotBudget.ok ? (
          <p className="mt-2 text-xs text-amber-400/90">
            Monthly budget exhausted — generation blocked until next month or plan upgrade.
          </p>
        ) : null}
        {autopilotLedger.length > 0 ? (
          <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
            {autopilotLedger.map((e) => (
              <li key={e.id} className="font-mono text-[10px]">
                {e.createdAt.slice(0, 10)} · {e.recipeId}@{String(e.recipeVersion)} · $
                {e.estimatedUsd.toFixed(5)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">No cost ledger entries yet.</p>
        )}
      </section>

      <section className="rounded-xl border border-border/60 p-4">
        <h2 className="text-sm font-semibold">Autopilot Knowledge</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Approved snippets used to ground Automation Team prompts (in-memory until Knowledge DB
          persistence).
        </p>
        <div className="mt-3">
          <KnowledgeSnippetsPanel initialSnippets={knowledgeSnippets} />
        </div>
      </section>

      <section className="rounded-xl border border-border/60 p-4">
        <h2 className="text-sm font-semibold">Email suppression list</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Channel Guardian blocks outbound sends to suppressed addresses across inbox and campaigns.
        </p>
        <div className="mt-3">
          <SuppressionListPanel initialRows={suppressions} featureEnabled={commsEnabled} />
        </div>
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
        <h2 className="text-sm font-semibold">Studio permission map</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Intended RBAC matrix — Clerk route guards still enforce access. Full table also on{" "}
          <Link href="/admin/platform/audit" className="text-primary underline-offset-4 hover:underline">
            Admin audit
          </Link>
          .
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-muted-foreground">
              <tr>
                <th className="py-1 font-medium">Action</th>
                <th className="py-1 font-medium">Roles</th>
              </tr>
            </thead>
            <tbody>
              {permissionMatrix.slice(0, 8).map((row) => (
                <tr key={row.action} className="border-t border-border/40">
                  <td className="py-1.5 font-mono">{row.action}</td>
                  <td className="py-1.5 text-muted-foreground">{row.roles.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
