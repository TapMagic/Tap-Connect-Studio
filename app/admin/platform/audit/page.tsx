import { requirePlatformAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminAuditListPage() {
  await requirePlatformAdmin();
  let rows: {
    id: string;
    action: string;
    resourceType: string;
    resourceId: string;
    occurredAt: Date;
  }[] = [];
  let error: string | null = null;
  try {
    rows = await prisma.platformAuditEvent.findMany({
      orderBy: { occurredAt: "desc" },
      take: 100,
      select: {
        id: true,
        action: true,
        resourceType: true,
        resourceId: true,
        occurredAt: true,
      },
    });
  } catch (e) {
    error = e instanceof Error ? e.message : "Audit table unavailable";
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 px-4 py-8">
      <Link href="/admin/platform" className="text-sm text-primary hover:underline">
        ← Platform Admin
      </Link>
      <h1 className="text-xl font-semibold">Audit events</h1>
      {error ? (
        <p className="text-sm text-amber-200">{error}</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No audit events yet.</p>
      ) : (
        <ul className="divide-y divide-border/40 rounded-xl border border-border/60">
          {rows.map((r) => (
            <li key={r.id} className="space-y-1 px-4 py-3 text-sm">
              <p className="font-medium">{r.action}</p>
              <p className="font-mono text-[10px] text-muted-foreground">
                {r.resourceType}/{r.resourceId.slice(0, 14)} · {r.occurredAt.toISOString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
