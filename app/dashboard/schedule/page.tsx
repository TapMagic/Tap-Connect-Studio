import { requireBusiness } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { resolveCampaignSchedule } from "@/lib/services/schedule";

export const dynamic = "force-dynamic";

export default async function SchedulePage({ searchParams }: { searchParams: Promise<{ at?: string }> }) {
  const { business } = await requireBusiness();
  const query = await searchParams;
  const parsedAt = query.at ? new Date(query.at) : new Date();
  const at = Number.isNaN(parsedAt.getTime()) ? new Date() : parsedAt;
  const devices = await prisma.deviceSlot.findMany({
    where: { businessId: business.id },
    include: {
      assignments: { where: { status: "ACTIVE" }, orderBy: { startsAt: "desc" }, take: 1, include: { campaign: true } },
      scheduleRules: { where: { enabled: true }, include: { campaign: true }, orderBy: [{ priority: "desc" }, { createdAt: "asc" }] },
      campaignGroup: true,
    },
    orderBy: { createdAt: "desc" },
  });
  const rows = await Promise.all(devices.map(async (device) => ({
    device,
    resolution: await resolveCampaignSchedule({
      deviceSlotId: device.id,
      groupId: device.campaignGroupId,
      assignmentCampaign: device.assignments[0]?.campaign ?? null,
      timezone: business.timezone,
      at,
    }),
  })));
  return (
    <main className="zone-experiences min-w-0 space-y-6 overflow-x-hidden p-6 lg:p-8" data-testid="schedule-page">
      <header><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">Campaigns</p><h1 className="text-2xl font-bold text-white">Scheduled Campaigns</h1><p className="text-sm text-white/55">See what is scheduled, where, when, why it wins, and what appears as fallback.</p></header>
      <form className="flex min-w-0 flex-wrap items-end gap-2 rounded-xl border border-white/10 p-4"><label className="min-w-0 max-w-full text-xs text-white/60">Inspect at<input name="at" type="datetime-local" defaultValue={at.toISOString().slice(0, 16)} className="mt-2 block max-w-full rounded-md border border-white/15 bg-black/20 px-2 py-2 sm:ml-2 sm:mt-0 sm:inline-block" /></label><button className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">Resolve</button><span className="break-all text-xs text-white/45">Timezone: {business.timezone}</span></form>
      <div className="grid min-w-0 gap-4">{rows.map(({ device, resolution }) => <article key={device.id} className="min-w-0 overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] p-4" data-testid={`schedule-decision-${device.id}`}><div className="flex min-w-0 flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h2 className="break-words font-semibold text-white">{device.nickname ?? device.deviceCode}</h2><p className="break-all text-xs text-white/45">Tap Point {device.deviceCode}</p></div><span className="rounded-full border border-white/15 px-2 py-1 text-xs">{resolution.decision.normalizedStatus}</span></div><dl className="mt-4 grid min-w-0 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4"><div className="min-w-0"><dt className="text-xs text-white/40">Selected Campaign</dt><dd className="break-words">{resolution.campaign?.title ?? "Published Card"}</dd></div><div className="min-w-0"><dt className="text-xs text-white/40">Source</dt><dd>{resolution.decision.source.replaceAll("_", " ")}</dd></div><div className="min-w-0"><dt className="text-xs text-white/40">Window</dt><dd className="break-all">{resolution.decision.activeWindow ? `${resolution.decision.activeWindow.start ?? "Open"}–${resolution.decision.activeWindow.end ?? "Open"} ${resolution.decision.activeWindow.timezone}` : "No active window"}</dd></div><div className="min-w-0"><dt className="text-xs text-white/40">Fallback</dt><dd className="break-words">{resolution.decision.fallback}</dd></div></dl><p className="mt-3 break-words rounded-lg bg-black/20 p-3 text-sm text-white/65"><strong className="text-white">Why:</strong> {resolution.decision.selectionReason}</p>{resolution.decision.rejectedCandidates.length ? <ul className="mt-2 list-disc break-words pl-5 text-xs text-white/45">{resolution.decision.rejectedCandidates.map((candidate, index) => <li key={`${candidate.source}-${index}`}>{candidate.source}: {candidate.reason}</li>)}</ul> : null}</article>)}</div>
      {!rows.length ? <p className="rounded-xl border border-white/10 p-8 text-center text-sm text-white/50">Add a Tap Point to inspect its schedule.</p> : null}
    </main>
  );
}
