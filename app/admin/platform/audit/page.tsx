import { requirePlatformAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { listPermissionMatrix } from "@/lib/fusion/authz/permission-matrix";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  await requirePlatformAdmin();
  let rows: {
    id: string;
    action: string;
    resourceType: string;
    resourceId: string;
    businessId: string | null;
    actorId: string | null;
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
        businessId: true,
        actorId: true,
        occurredAt: true,
      },
    });
  } catch (e) {
    error = e instanceof Error ? e.message : "Audit table unavailable";
  }

  const matrix = listPermissionMatrix();

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <Link href="/admin/platform" className="text-sm text-primary hover:underline">
        ← Platform Admin
      </Link>
      <div>
        <h1 className="text-xl font-semibold">Audit trail</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          PlatformAuditEvent (authoritative when isolated DB is up). Permission matrix below is the
          intended Studio RBAC map — Clerk role wiring still applies at route boundaries.
        </p>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Recent events
        </h2>
        {error ? (
          <p className="text-sm text-amber-200">{error}</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No audit events yet.</p>
        ) : (
          <ul className="divide-y divide-border/40 rounded-xl border border-border/60">
            {rows.map((r) => (
              <li key={r.id} className="space-y-1 px-4 py-3 text-sm">
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="font-medium">{r.action}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {r.occurredAt.toISOString()}
                  </span>
                </div>
                <p className="font-mono text-[10px] text-muted-foreground">
                  {r.resourceType}/{r.resourceId.slice(0, 14)} · biz {r.businessId?.slice(0, 10) ?? "—"} ·
                  actor {r.actorId?.slice(0, 12) ?? "system"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Permission matrix
        </h2>
        <div className="overflow-x-auto rounded-xl border border-border/60">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/30 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Action</th>
                <th className="px-3 py-2 font-medium">Roles</th>
              </tr>
            </thead>
            <tbody>
              {matrix.map((row) => (
                <tr key={row.action} className="border-t border-border/40">
                  <td className="px-3 py-2 font-mono text-xs">{row.action}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {row.roles.join(", ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
