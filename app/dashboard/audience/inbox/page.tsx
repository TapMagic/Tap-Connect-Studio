import Link from "next/link";
import { requireBusiness } from "@/lib/auth";
import { FeatureDisabledState } from "@/components/fusion/features/feature-disabled-state";
import { InboxShell } from "@/components/fusion/inbox/inbox-shell";
import { checkAnyFeatureGate } from "@/lib/fusion/features/gate";
import { loadFeatureContext } from "@/lib/fusion/features/server";
import { listInboxThreads } from "@/lib/fusion/inbox";

export const dynamic = "force-dynamic";

export default async function AudienceInboxPage() {
  const { business } = await requireBusiness();
  const featureCtx = await loadFeatureContext();
  const gate = checkAnyFeatureGate(["comms.inbox", "comms.email"], featureCtx);
  const featureEnabled = gate.ok;

  let threads: Awaited<ReturnType<typeof listInboxThreads>> = [];
  if (featureEnabled) {
    try {
      threads = await listInboxThreads({ businessId: business.id });
    } catch {
      threads = [];
    }
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <p className="text-xs text-muted-foreground">
          <Link href="/dashboard/audience" className="hover:text-primary hover:underline">
            Audience
          </Link>{" "}
          / Inbox
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">TapInbox</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Threads, mock replies, and TapCase — Channel Guardian runs before every send.
        </p>
      </div>

      {!featureEnabled ? (
        <FeatureDisabledState
          featureId="comms.inbox"
          title="TapInbox is disabled"
          description="Enable comms.inbox or comms.email in Platform Admin to open unified threads and TapCase."
          alternateHref="/dashboard/audience"
          alternateLabel="Back to Audience →"
        />
      ) : (
        <InboxShell initialThreads={threads} featureEnabled={featureEnabled} />
      )}
    </div>
  );
}
