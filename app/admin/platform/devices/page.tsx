import { requirePlatformAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminDevicesListPage() {
  await requirePlatformAdmin();
  let rows: {
    id: string;
    nickname: string | null;
    deviceCode: string;
    status: string;
    deviceType: string;
  }[] = [];
  let error: string | null = null;
  try {
    rows = await prisma.deviceSlot.findMany({
      orderBy: { updatedAt: "desc" },
      take: 100,
      select: { id: true, nickname: true, deviceCode: true, status: true, deviceType: true },
    });
  } catch (e) {
    error = e instanceof Error ? e.message : "DB unavailable";
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 px-4 py-8">
      <Link href="/admin/platform" className="text-sm text-primary hover:underline">
        ← Platform Admin
      </Link>
      <h1 className="text-xl font-semibold">Devices</h1>
      {error ? (
        <p className="text-sm text-amber-200">{error}</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No device slots yet.</p>
      ) : (
        <ul className="divide-y divide-border/40 rounded-xl border border-border/60">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap justify-between gap-2 px-4 py-3 text-sm">
              <span className="font-medium">{r.nickname || r.deviceCode}</span>
              <span className="font-mono text-xs text-muted-foreground">
                {r.deviceType} · {r.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
