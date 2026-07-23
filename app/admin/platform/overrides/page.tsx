import { requirePlatformAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminOverridesListPage() {
  await requirePlatformAdmin();
  let rows: {
    id: string;
    featureId: string;
    scope: string;
    enabled: boolean;
    reason: string | null;
    updatedAt: Date;
  }[] = [];
  let error: string | null = null;
  try {
    rows = await prisma.featureFlagOverride.findMany({
      orderBy: { updatedAt: "desc" },
      take: 100,
    });
  } catch (e) {
    error = e instanceof Error ? e.message : "Overrides unavailable";
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 px-4 py-8">
      <Link href="/admin/platform" className="text-sm text-primary hover:underline">
        ← Platform Admin
      </Link>
      <h1 className="text-xl font-semibold">Feature overrides</h1>
      {error ? (
        <p className="text-sm text-amber-200">{error}</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No persisted overrides (defaults apply).</p>
      ) : (
        <ul className="divide-y divide-border/40 rounded-xl border border-border/60">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap justify-between gap-2 px-4 py-3 text-sm">
              <div>
                <p className="font-mono text-primary">{r.featureId}</p>
                <p className="text-xs text-muted-foreground">
                  {r.scope} · {r.reason || "no reason"}
                </p>
              </div>
              <span className={r.enabled ? "text-primary" : "text-muted-foreground"}>
                {r.enabled ? "ON" : "OFF"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
