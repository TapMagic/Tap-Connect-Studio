import { requirePlatformAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { OutboxDeadLetterPanel } from "@/components/fusion/outbox/dead-letter-panel";
import { listDeadLetters } from "@/lib/fusion/publication/events";

export const dynamic = "force-dynamic";

export default async function AdminOutboxListPage() {
  await requirePlatformAdmin();
  let rows: {
    id: string;
    topic: string;
    status: string;
    aggregateType: string;
    aggregateId: string;
    createdAt: Date;
  }[] = [];
  let error: string | null = null;
  try {
    rows = await prisma.fusionOutboxEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        topic: true,
        status: true,
        aggregateType: true,
        aggregateId: true,
        createdAt: true,
      },
    });
  } catch (e) {
    error = e instanceof Error ? e.message : "Outbox table unavailable";
  }

  const deadLetters = await listDeadLetters({ limit: 50 }).catch(() => []);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <Link href="/admin/platform" className="text-sm text-primary hover:underline">
        ← Platform Admin
      </Link>
      <h1 className="text-xl font-semibold">Outbox</h1>
      <p className="text-sm text-muted-foreground">
        Durable publication queue · retry / discard dead letters · process tick
      </p>

      <OutboxDeadLetterPanel
        initialRecords={deadLetters.map((d) => ({
          id: d.id,
          topic: d.topic,
          status: d.status,
          attempts: d.attempts,
          lastError: d.lastError,
          availableAt: d.availableAt,
        }))}
      />

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Recent events
        </h2>
        {error ? (
          <p className="text-sm text-amber-200">{error}</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No outbox events.</p>
        ) : (
          <ul className="divide-y divide-border/40 rounded-xl border border-border/60">
            {rows.map((r) => (
              <li key={r.id} className="space-y-1 px-4 py-3 text-sm">
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="font-medium">{r.topic}</span>
                  <span className="font-mono text-xs text-primary">{r.status}</span>
                </div>
                <p className="font-mono text-[10px] text-muted-foreground">
                  {r.aggregateType}/{r.aggregateId.slice(0, 12)} · {r.createdAt.toISOString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
