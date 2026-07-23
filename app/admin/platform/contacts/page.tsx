import { requirePlatformAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminContactsListPage() {
  await requirePlatformAdmin();
  let rows: { id: string; email: string | null; name: string | null; businessId: string }[] = [];
  let error: string | null = null;
  try {
    rows = await prisma.contact.findMany({
      orderBy: { updatedAt: "desc" },
      take: 100,
      select: { id: true, email: true, name: true, businessId: true },
    });
  } catch (e) {
    error = e instanceof Error ? e.message : "DB unavailable — run fusion audience migration";
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 px-4 py-8">
      <Link href="/admin/platform" className="text-sm text-primary hover:underline">
        ← Platform Admin
      </Link>
      <h1 className="text-xl font-semibold">Contacts</h1>
      {error ? (
        <p className="text-sm text-amber-200">{error}</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No contacts yet.</p>
      ) : (
        <ul className="divide-y divide-border/40 rounded-xl border border-border/60">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap justify-between gap-2 px-4 py-3 text-sm">
              <span>{r.name || r.email || r.id.slice(0, 8)}</span>
              <span className="font-mono text-[10px] text-muted-foreground">{r.businessId.slice(0, 10)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
