import Link from "next/link";
import { requireBusiness } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { listTapPointsForBusiness } from "@/lib/fusion/devices/tap-point-bridge";
import {
  computeTapPointHealth,
  summarizeFleetHealth,
  type TapPointHealthTone,
} from "@/lib/fusion/devices/health";
import { getDevicePath } from "@/lib/utils/app";
import { buttonVariants } from "@/components/ui/button";
import { StudioHubSections } from "@/components/studio/hub-sections";
import { OpenInTapCanvasLink } from "@/components/fusion/canvas/open-in-tap-canvas";
import { TruthfulEmptyStatePanel } from "@/components/studio/truthful-empty-state";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * Health tones map to STATUS tokens only — GREEN (--studio-go) is reserved for
 * primary actions. Health/selected/health pills use statusOk/warn/critical/neutral.
 */
function healthPillStyle(tone: TapPointHealthTone): {
  className: string;
  style: React.CSSProperties;
} {
  switch (tone) {
    case "healthy":
      return {
        className: "border",
        style: {
          color: "var(--studio-status-ok)",
          borderColor: "color-mix(in oklch, var(--studio-status-ok) 45%, transparent)",
          backgroundColor: "color-mix(in oklch, var(--studio-status-ok) 14%, transparent)",
        },
      };
    case "warning":
      return {
        className: "border",
        style: {
          color: "var(--studio-status-warn)",
          borderColor: "color-mix(in oklch, var(--studio-status-warn) 45%, transparent)",
          backgroundColor: "color-mix(in oklch, var(--studio-status-warn) 14%, transparent)",
        },
      };
    case "critical":
      return {
        className: "border",
        style: {
          color: "var(--studio-status-critical)",
          borderColor: "color-mix(in oklch, var(--studio-status-critical) 45%, transparent)",
          backgroundColor: "color-mix(in oklch, var(--studio-status-critical) 14%, transparent)",
        },
      };
    default:
      return {
        className: "border",
        style: {
          color: "var(--studio-status-neutral)",
          borderColor: "color-mix(in oklch, var(--studio-status-neutral) 40%, transparent)",
          backgroundColor: "color-mix(in oklch, var(--studio-status-neutral) 12%, transparent)",
        },
      };
  }
}

function HealthPill({
  tone,
  label,
  detail,
}: {
  tone: TapPointHealthTone;
  label: string;
  detail: string;
}) {
  const { className, style } = healthPillStyle(tone);
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${className}`}
      style={style}
      title={detail}
      data-testid={`tap-health-${tone}`}
    >
      {label}
    </span>
  );
}

export default async function TapPointsHubPage() {
  const { business } = await requireBusiness();

  const [devices, tapPoints, waitingScans, assignments] = await Promise.all([
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
    prisma.deviceAssignment
      .findMany({
        where: { businessId: business.id, status: "ACTIVE" },
        select: {
          deviceSlotId: true,
          campaign: {
            select: { id: true, title: true, status: true, campaignType: true },
          },
        },
      })
      .catch(() => []),
  ]);

  const deviceById = new Map(devices.map((d) => [d.id, d]));
  // Serving-context: which Campaign / Card each device currently serves.
  const assignmentByDevice = new Map(
    assignments
      .filter((a) => a.deviceSlotId && a.campaign)
      .map((a) => [a.deviceSlotId as string, a.campaign!])
  );
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
  const totalPoints = fleetBadges.length;
  const assignedPoints = assignmentByDevice.size;

  // Fleet health hierarchy: worst-first, status tokens never green.
  const fleetTiles: {
    label: string;
    value: number;
    total: number;
    token: string;
    note: string;
    severity: "success" | "attention" | "error" | "info";
  }[] = [
    {
      label: "Needs attention",
      value: fleet.critical,
      total: totalPoints,
      token: "var(--studio-status-critical)",
      note: "Not serving — no address, lost, or retired",
      severity: "error",
    },
    {
      label: "Watch",
      value: fleet.warning + fleet.unknown,
      total: totalPoints,
      token: "var(--studio-status-warn)",
      note: "Paused, unbridged, or near capacity",
      severity: "attention",
    },
    {
      label: "Healthy",
      value: fleet.healthy,
      total: totalPoints,
      token: "var(--studio-status-ok)",
      note: "Live and resolving public taps",
      severity: "success",
    },
    {
      label: "Serving a Campaign",
      value: assignedPoints,
      total: totalPoints,
      token: "var(--studio-status-info)",
      note: "Bound to a Card experience right now",
      severity: "info",
    },
  ];

  return (
    <div className="zone-tap-points space-y-8 p-5 lg:p-8" data-testid="tap-points-workspace">
      <header className="space-y-2 border-b border-white/8 pb-6">
        <p className="zone-label-tap-points text-[11px] font-semibold uppercase tracking-[0.18em]">
          Tap Points
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-white">Devices & fleet</h1>
        <p className="max-w-2xl text-sm text-white/55">
          Tap Points are how customers reach your Card in the field. Register devices, assign the
          Card experience they serve, and keep health and recovery visible at a glance.
        </p>
      </header>

      {/* Fleet health at a glance — worst-first, status tokens only. */}
      <section aria-label="Fleet health" data-testid="tap-fleet-health" className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-white">Fleet health</h2>
            <p className="mt-1 text-sm text-white/50">
              {totalPoints === 0
                ? "No Tap Points registered yet."
                : `${totalPoints} Tap Point${totalPoints === 1 ? "" : "s"} · ${assignedPoints} serving a Card experience.`}{" "}
              <OpenInTapCanvasLink objectType="tap_point" objectId="hub" />
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/devices"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Device inventory
            </Link>
            <Link href="/dashboard/scan" className={buttonVariants({ size: "sm" })}>
              Scan Mode
            </Link>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {fleetTiles.map((tile) => (
            <div
              key={tile.label}
              className="owner-status-frame rounded-xl px-4 py-3"
              data-owner-severity={tile.severity}
              data-testid={`fleet-tile-${tile.label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <div className="flex items-center gap-2">
                {tile.severity === "success" ? (
                  <CheckCircle2 className="h-4 w-4" style={{ color: tile.token }} aria-hidden />
                ) : tile.severity === "attention" ? (
                  <AlertTriangle className="h-4 w-4" style={{ color: tile.token }} aria-hidden />
                ) : tile.severity === "error" ? (
                  <XCircle className="h-4 w-4" style={{ color: tile.token }} aria-hidden />
                ) : (
                  <Info className="h-4 w-4" style={{ color: tile.token }} aria-hidden />
                )}
                <p className="text-xs text-white/60">{tile.label}</p>
              </div>
              <p className="mt-1 text-2xl font-bold" style={{ color: tile.token }}>
                {tile.value}
                {tile.total > 0 ? (
                  <span className="ml-1 text-sm font-normal text-white/40">/ {tile.total}</span>
                ) : null}
              </p>
              <p className="mt-1 text-[11px] text-white/40">{tile.note}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-3 text-xs text-white/45 sm:grid-cols-3">
          <span>Devices registered: {devices.length}</span>
          <span>Active devices: {activeDevices}</span>
          <span>Bridged to registry: {bridgedCount}</span>
        </div>

        {(nearCapacity > 0 || withErrors > 0) && (
          <p
            className="text-sm"
            style={{ color: "var(--studio-status-warn)" }}
            data-testid="tap-fleet-warnings"
          >
            {withErrors} Tap Point{withErrors === 1 ? "" : "s"} with operational errors ·{" "}
            {nearCapacity} near capacity soft limit
          </p>
        )}
      </section>

      {waitingScans > 0 ? (
        <div
          className="rounded-xl border px-4 py-3 text-sm"
          style={{
            borderColor: "color-mix(in oklch, var(--studio-status-info) 35%, transparent)",
            backgroundColor: "color-mix(in oklch, var(--studio-status-info) 8%, transparent)",
          }}
        >
          <span className="font-medium" style={{ color: "var(--studio-status-info)" }}>
            {waitingScans}
          </span>{" "}
          scan session{waitingScans === 1 ? "" : "s"} waiting —{" "}
          <Link href="/dashboard/scan" className="underline hover:text-white">
            open Scan Mode
          </Link>
        </div>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-white/60">
          Tap Point registry
        </h2>
        {tapPoints.length === 0 && unbridged.length === 0 ? (
          <TruthfulEmptyStatePanel
            testId="tap-points-empty"
            state={{
              id: "empty_tap_points",
              title: "No Tap Points yet",
              whatMissing: "No devices are registered, activated, or tapped.",
              whyEmpty:
                "Tap Points appear once you create a device or a customer taps one in the field.",
              isNormal: true,
              normalNote:
                "Normal for a new workspace. V1 device codes remain the public resolver during bridge rollout.",
              actionLabel: "Register a device",
              actionHref: "/dashboard/devices",
            }}
          />
        ) : (
          <div className="overflow-hidden rounded-xl border border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.03] text-left text-xs text-white/50">
                <tr>
                  <th className="px-4 py-2 font-medium">Label</th>
                  <th className="px-4 py-2 font-medium">Serving</th>
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
                  const serving = tp.deviceSlotId
                    ? assignmentByDevice.get(tp.deviceSlotId)
                    : undefined;
                  const health = computeTapPointHealth({
                    status: tp.status,
                    hasAddress: Boolean(code),
                    totalTapCount: device?.totalTapCount,
                    deviceStatus: device?.status,
                    bridged: true,
                  });
                  return (
                    <tr key={tp.id} className="border-t border-white/8">
                      <td className="px-4 py-2 text-white/85">{tp.name ?? "Tap Point"}</td>
                      <td className="px-4 py-2">
                        {serving ? (
                          <Link
                            href={`/dashboard/campaigns/${serving.id}`}
                            className="text-white/75 hover:text-white hover:underline"
                            title={`Serving Campaign “${serving.title}”`}
                          >
                            {serving.title}
                          </Link>
                        ) : (
                          <span
                            className="text-[11px]"
                            style={{ color: "var(--studio-status-neutral)" }}
                            title="No active Card experience — falls back to the base Card"
                          >
                            Base Card
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 font-mono text-xs text-white/60">
                        {code ? `${code.slice(0, 12)}…` : "—"}
                      </td>
                      <td className="px-4 py-2">
                        <HealthPill tone={health.tone} label={health.label} detail={health.detail} />
                      </td>
                      <td className="px-4 py-2 text-white/70">{device?.totalTapCount ?? "—"}</td>
                      <td className="px-4 py-2">
                        {code ? (
                          <Link
                            href={getDevicePath(code)}
                            className="text-white/70 hover:text-white hover:underline"
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
                  const serving = assignmentByDevice.get(d.id);
                  const health = computeTapPointHealth({
                    status: d.status,
                    hasAddress: Boolean(d.deviceCode),
                    totalTapCount: d.totalTapCount,
                    deviceStatus: d.status,
                    bridged: false,
                  });
                  return (
                    <tr key={`dev-${d.id}`} className="border-t border-white/8 opacity-90">
                      <td className="px-4 py-2 text-white/85">{d.nickname ?? d.deviceCode}</td>
                      <td className="px-4 py-2">
                        {serving ? (
                          <Link
                            href={`/dashboard/campaigns/${serving.id}`}
                            className="text-white/75 hover:text-white hover:underline"
                          >
                            {serving.title}
                          </Link>
                        ) : (
                          <span
                            className="text-[11px]"
                            style={{ color: "var(--studio-status-neutral)" }}
                          >
                            Base Card
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 font-mono text-xs text-white/60">
                        {d.deviceCode.slice(0, 12)}…
                      </td>
                      <td className="px-4 py-2">
                        <HealthPill tone={health.tone} label={health.label} detail={health.detail} />
                      </td>
                      <td className="px-4 py-2 text-white/70">{d.totalTapCount}</td>
                      <td className="px-4 py-2">
                        <Link
                          href={getDevicePath(d.deviceCode)}
                          className="text-white/70 hover:text-white hover:underline"
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
