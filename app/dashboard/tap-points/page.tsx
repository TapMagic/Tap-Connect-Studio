import Link from "next/link";
import { requireBusiness } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { listTapPointsForBusiness } from "@/lib/fusion/devices/tap-point-bridge";
import {
  computeTapPointHealth,
  summarizeFleetHealth,
} from "@/lib/fusion/devices/health";
import { getDevicePath } from "@/lib/utils/app";
import { buttonVariants } from "@/components/ui/button";
import { StudioHubSections } from "@/components/studio/hub-sections";
import { OpenInTapCanvasLink } from "@/components/fusion/canvas/open-in-tap-canvas";

export const dynamic = "force-dynamic";

function toneClass(tone: string) {
  switch (tone) {
    case "healthy":
      return "bg-primary/20 text-primary";
    case "warning":
      return "bg-amber-500/20 text-amber-200";
    case "critical":
      return "bg-red-500/20 text-red-200";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export default async function TapPointsHubPage() {
  const { business } = await requireBusiness();

  const [devices, tapPoints, waitingScans] = await Promise.all([
    prisma.deviceSlot.findMany({
      where: { businessId: business.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        deviceCode: true,
        nickname: true,
        status: true,
        totalTapCount: true,
      },
    }),
    listTapPointsForBusiness(business.id).catch(() => []),
    prisma.scanSession.count({
      where: { businessId: business.id, status: "WAITING" },
    }),
  ]);

  const deviceById = new Map(devices.map((d) => [d.id, d]));
  const bridgedCount = tapPoints.length;
  const activeDevices = devices.filter((d) => d.status === "ACTIVE").length;

  // Unbridged devices still shown with warning badges
  const unbridged = devices.filter((d) => !tapPoints.some((tp) => tp.deviceSlotId === d.id));

  const fleetBadges = [
    ...tapPoints.map((tp) => {
      const device = tp.deviceSlotId ? deviceById.get(tp.deviceSlotId) : undefined;
      return computeTapPointHealth({
        status: tp.status,
        hasAddress: Boolean(tp.address?.code),
        totalTapCount: device?.totalTapCount,
        deviceStatus: device?.status,
        bridged: true,
      });
    }),
    ...unbridged.map((d) =>
      computeTapPointHealth({
        status: d.status,
        hasAddress: Boolean(d.deviceCode),
        totalTapCount: d.totalTapCount,
        deviceStatus: d.status,
        bridged: false,
      })
    ),
  ];
  const fleet = summarizeFleetHealth(fleetBadges);
  const nearCapacity = fleetBadges.filter((b) => b.errors.includes("near_capacity")).length;
  const withErrors = fleetBadges.filter((b) => b.errors.length > 0).length;

  return (
    <div className="space-y-8 p-5 lg:p-8" data-testid="tap-points-workspace">
      <header className="space-y-2 border-b border-white/8 pb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
          Tap Points
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-white">Devices & fleet</h1>
        <p className="max-w-2xl text-sm text-white/55">
          Register devices, assign experiences, scan in the field — health and recovery stay visible.
        </p>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-white">Live registry</h2>
          <p className="mt-1 text-sm text-white/50">
            Permanent addresses and health badges — public /t/ URLs stay stable.{" "}
            <OpenInTapCanvasLink objectType="tap_point" objectId="hub" />
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/devices" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Device inventory
          </Link>
          <Link href="/dashboard/scan" className={buttonVariants({ size: "sm" })}>
            Scan Mode
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Devices", value: devices.length },
          { label: "Active", value: activeDevices },
          { label: "Tap Points bridged", value: bridgedCount },
          {
            label: "Fleet health",
            value: `${fleet.healthy}ok / ${fleet.warning}warn / ${fleet.critical}crit`,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-border/60 bg-card/40 px-4 py-3"
          >
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className="text-2xl font-bold text-primary">{stat.value}</p>
          </div>
        ))}
      </div>
      {(nearCapacity > 0 || withErrors > 0) && (
        <p className="text-sm text-amber-200/90">
          Operational badges: {withErrors} with errors · {nearCapacity} near capacity soft limit
        </p>
      )}

      {waitingScans > 0 ? (
        <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
          <span className="font-medium text-primary">{waitingScans}</span> scan session
          {waitingScans === 1 ? "" : "s"} waiting —{" "}
          <Link href="/dashboard/scan" className="underline hover:text-primary">
            open Scan Mode
          </Link>
        </div>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Tap Point registry
        </h2>
        {tapPoints.length === 0 && unbridged.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Tap Points appear when devices are created, activated, or tapped. V1 device codes remain
            the public resolver during bridge rollout.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border/60">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Label</th>
                  <th className="px-4 py-2 font-medium">Address code</th>
                  <th className="px-4 py-2 font-medium">Health</th>
                  <th className="px-4 py-2 font-medium">Taps</th>
                  <th className="px-4 py-2 font-medium">Public URL</th>
                </tr>
              </thead>
              <tbody>
                {tapPoints.map((tp) => {
                  const code = tp.address?.code ?? "";
                  const device = tp.deviceSlotId ? deviceById.get(tp.deviceSlotId) : undefined;
                  const health = computeTapPointHealth({
                    status: tp.status,
                    hasAddress: Boolean(code),
                    totalTapCount: device?.totalTapCount,
                    deviceStatus: device?.status,
                    bridged: true,
                  });
                  return (
                    <tr key={tp.id} className="border-t border-border/40">
                      <td className="px-4 py-2">{tp.name ?? "Tap Point"}</td>
                      <td className="px-4 py-2 font-mono text-xs">
                        {code ? `${code.slice(0, 12)}…` : "—"}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${toneClass(health.tone)}`}
                          title={health.detail}
                        >
                          {health.label}
                        </span>
                      </td>
                      <td className="px-4 py-2">{device?.totalTapCount ?? "—"}</td>
                      <td className="px-4 py-2">
                        {code ? (
                          <Link
                            href={getDevicePath(code)}
                            className="text-primary hover:underline"
                            target="_blank"
                          >
                            /t/…
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
                {unbridged.map((d) => {
                  const health = computeTapPointHealth({
                    status: d.status,
                    hasAddress: Boolean(d.deviceCode),
                    totalTapCount: d.totalTapCount,
                    deviceStatus: d.status,
                    bridged: false,
                  });
                  return (
                    <tr key={`dev-${d.id}`} className="border-t border-border/40 opacity-90">
                      <td className="px-4 py-2">{d.nickname ?? d.deviceCode}</td>
                      <td className="px-4 py-2 font-mono text-xs">
                        {d.deviceCode.slice(0, 12)}…
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${toneClass(health.tone)}`}
                          title={health.detail}
                        >
                          {health.label}
                        </span>
                      </td>
                      <td className="px-4 py-2">{d.totalTapCount}</td>
                      <td className="px-4 py-2">
                        <Link
                          href={getDevicePath(d.deviceCode)}
                          className="text-primary hover:underline"
                          target="_blank"
                        >
                          /t/…
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <StudioHubSections
        destinationId="tap_points"
        title="Tap Points"
        subtitle="Devices, Scan Mode, Pulse, and provisioning"
        collapsible
        defaultOpen={false}
      />
    </div>
  );
}
