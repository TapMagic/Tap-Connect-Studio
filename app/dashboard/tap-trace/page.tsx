import Link from "next/link";
import { requireBusiness } from "@/lib/auth";
import { getTapTraceDetail, listTapTrace } from "@/lib/services/tap-trace";

export const dynamic = "force-dynamic";

function asDate(value?: string, end = false) {
  if (!value) return undefined;
  const date = new Date(`${value}T${end ? "23:59:59.999" : "00:00:00.000"}`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export default async function TapTracePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { business } = await requireBusiness();
  const query = await searchParams;
  const fixture = query.evidence === "demo" ? true : query.evidence === "real" ? false : undefined;
  const [taps, detail] = await Promise.all([
    listTapTrace({
      businessId: business.id,
      filters: {
        from: asDate(query.from),
        to: asDate(query.to, true),
        tapPointId: query.tapPoint || undefined,
        cardPublicationId: query.card || undefined,
        campaignId: query.campaign || undefined,
        action: query.action || undefined,
        locationId: query.location || undefined,
        fixture,
        outcome: query.outcome as "successful" | "fallback" | "unresolved" | undefined,
      },
    }),
    query.tap ? getTapTraceDetail(business.id, query.tap) : Promise.resolve(null),
  ]);

  return (
    <main className="zone-insights space-y-6 p-6 lg:p-8" data-testid="tap-trace-page">
      <header>
        <p className="zone-label-insights text-[11px] font-semibold uppercase tracking-[0.18em]">Insights</p>
        <h1 className="text-2xl font-bold text-white">Tap Trace</h1>
        <p className="text-sm text-white/55">See what each Tap Point resolved and what happened next.</p>
      </header>

      <form className="grid gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-3 lg:grid-cols-6">
        <input name="from" type="date" defaultValue={query.from} aria-label="From date" className="rounded-md border border-white/10 bg-black/20 px-2 py-2 text-sm" />
        <input name="to" type="date" defaultValue={query.to} aria-label="To date" className="rounded-md border border-white/10 bg-black/20 px-2 py-2 text-sm" />
        <input name="tapPoint" defaultValue={query.tapPoint} placeholder="Tap Point" aria-label="Tap Point" className="rounded-md border border-white/10 bg-black/20 px-2 py-2 text-sm" />
        <input name="campaign" defaultValue={query.campaign} placeholder="Campaign" aria-label="Campaign" className="rounded-md border border-white/10 bg-black/20 px-2 py-2 text-sm" />
        <input name="action" defaultValue={query.action} placeholder="Action" aria-label="Action" className="rounded-md border border-white/10 bg-black/20 px-2 py-2 text-sm" />
        <select name="evidence" defaultValue={query.evidence ?? "all"} aria-label="Evidence type" className="rounded-md border border-white/10 bg-black/20 px-2 py-2 text-sm">
          <option value="all">All evidence</option><option value="real">Customer</option><option value="demo">Demo</option>
        </select>
        <select name="outcome" defaultValue={query.outcome ?? ""} aria-label="Outcome" className="rounded-md border border-white/10 bg-black/20 px-2 py-2 text-sm">
          <option value="">Any outcome</option><option value="successful">Successful</option><option value="fallback">Fallback</option><option value="unresolved">Unresolved</option>
        </select>
        <button className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">Apply filters</button>
      </form>

      {detail ? (
        <section className="rounded-xl border border-sky-300/20 bg-sky-300/[0.04] p-5" data-testid="tap-trace-detail">
          <div className="flex items-start justify-between gap-4"><div><h2 className="font-semibold text-white">Tap detail</h2><p className="text-xs text-white/50">{detail.createdAt.toLocaleString()}</p></div><Link href="/dashboard/tap-trace" className="text-sm text-sky-200">Close</Link></div>
          <ol className="mt-4 grid gap-3 md:grid-cols-4">
            <li><strong className="block text-sm text-white">1. Tap occurred</strong><span className="text-xs text-white/55">{detail.deviceSlot.nickname ?? detail.deviceSlot.deviceCode}</span></li>
            <li><strong className="block text-sm text-white">2. Destination selected</strong><span className="text-xs text-white/55">{detail.campaign?.title ?? "Published Card fallback"}</span></li>
            <li><strong className="block text-sm text-white">3. Customer saw</strong><span className="text-xs text-white/55">{detail.cardPublicationId ? `Card revision ${detail.cardPublicationId}` : "Legacy Card context"}</span></li>
            <li><strong className="block text-sm text-white">4. Action followed</strong><span className="text-xs text-white/55">{detail.clickEvents.map((click) => click.eventType).join(", ") || "No supported action recorded"}</span></li>
          </ol>
          <pre className="mt-4 overflow-x-auto rounded-lg bg-black/25 p-3 text-xs text-white/65">{JSON.stringify(detail.scheduleDecision ?? { source: "Legacy event", selectionReason: "Schedule detail was not recorded." }, null, 2)}</pre>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-white/10" data-testid="tap-trace-list">
        <table className="w-full text-left text-sm"><thead className="bg-white/[0.04] text-xs text-white/55"><tr><th className="p-3">Time</th><th className="p-3">Tap Point</th><th className="p-3">Resolved</th><th className="p-3">Action</th><th className="p-3">Evidence</th></tr></thead>
          <tbody>{taps.map((tap) => <tr key={tap.id} className="border-t border-white/8"><td className="p-3"><Link className="text-sky-200 hover:underline" href={`/dashboard/tap-trace?tap=${tap.id}`}>{tap.createdAt.toLocaleString()}</Link></td><td className="p-3">{tap.deviceSlot.nickname ?? tap.deviceSlot.deviceCode}<small className="block text-white/40">{tap.deviceSlot.location?.name}</small></td><td className="p-3">{tap.campaign?.title ?? "Published Card fallback"}<small className="block text-white/40">{tap.resolutionOutcome ?? "Legacy context"}</small></td><td className="p-3">{tap.clickEvents.map((click) => click.eventType).join(", ") || "—"}</td><td className="p-3">{tap.fixture ? "Demo" : "Customer"}</td></tr>)}</tbody>
        </table>
        {!taps.length ? <p className="p-8 text-center text-sm text-white/50">No taps match these filters.</p> : null}
      </section>
    </main>
  );
}
