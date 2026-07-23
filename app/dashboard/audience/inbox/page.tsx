import Link from "next/link";
import { requireBusiness } from "@/lib/auth";
import { isFeatureEnabled } from "@/lib/fusion/features";
import { listInboxThreads } from "@/lib/fusion/inbox";
import { InboxShell } from "@/components/fusion/inbox/inbox-shell";

export const dynamic = "force-dynamic";

export default async function AudienceInboxPage() {
  const { business } = await requireBusiness();
  const featureEnabled =
    isFeatureEnabled("comms.inbox", {}) || isFeatureEnabled("comms.email", {});

  let threads: Awaited<ReturnType<typeof listInboxThreads>> = [];
  try {
    threads = await listInboxThreads({ businessId: business.id });
  } catch {
    threads = [];
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

      <InboxShell initialThreads={threads} featureEnabled={featureEnabled} />
    </div>
  );
}
