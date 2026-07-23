import Link from "next/link";
import { Nfc, Radio, ScanLine, Activity } from "lucide-react";
import { PoweredByTapTheMagic } from "@/components/brand/powered-by";
import { TapConnectLogo } from "@/components/brand/tap-connect-logo";
import {
  PulseClaimSessionStub,
  PulseRotationPreviewStub,
} from "@/components/fusion/pulse/pulse-field-stubs";
import { requireBusiness } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { listFeatureOverrides, toResolveOverrides } from "@/lib/fusion/features/overrides";
import { isFeatureEnabled } from "@/lib/fusion/features/resolve";
import { listTapPointsForBusiness } from "@/lib/fusion/devices/tap-point-bridge";
import { computeTapPointHealth, summarizeFleetHealth } from "@/lib/fusion/devices/health";

export const dynamic = "force-dynamic";

export default async function PulseShellPage() {
  const { business } = await requireBusiness();
  const overrides = toResolveOverrides(await listFeatureOverrides());
  const enabled = isFeatureEnabled("ops.pulse", { overrides });

  if (!enabled) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-between px-4 py-10">
        <div className="space-y-4 text-center">
          <TapConnectLogo variant="mark" imgClassName="mx-auto h-12 w-12 rounded-lg" />
          <h1 className="text-xl font-semibold tracking-tight">Pulse</h1>
          <p className="text-sm text-muted-foreground">
            Field shell is feature-gated. Enable{" "}
            <code className="font-mono text-xs">ops.pulse</code> in Platform Admin to open this
            in-development PWA surface.
          </p>
          <Link
            href="/dashboard/scan"
            className="inline-block text-sm text-primary underline-offset-4 hover:underline"
          >
            Open Scan Mode instead →
          </Link>
        </div>
        <PoweredByTapTheMagic className="mt-10" />
      </div>
    );
  }

  const [devices, tapPoints, waitingScans] = await Promise.all([
    prisma.deviceSlot
      .findMany({
        where: { businessId: business.id },
        take: 50,
        select: { id: true, status: true, totalTapCount: true, deviceCode: true },
      })
      .catch(() => []),
    listTapPointsForBusiness(business.id).catch(() => []),
    prisma.scanSession
      .count({ where: { businessId: business.id, status: "WAITING" } })
      .catch(() => 0),
  ]);

  const deviceById = new Map(devices.map((d) => [d.id, d]));
  const unbridged = devices.filter((d) => !tapPoints.some((tp) => tp.deviceSlotId === d.id));
  const fleet = summarizeFleetHealth([
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
  ]);

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-lg flex-col px-4 py-6">
      <header className="flex items-center justify-between gap-3 border-b border-border/50 pb-4">
        <div className="flex items-center gap-2">
          <TapConnectLogo variant="mark" imgClassName="h-9 w-9 rounded-md" />
          <div>
            <p className="text-sm font-semibold leading-none">Pulse</p>
            <p className="mt-1 truncate text-[11px] text-muted-foreground">{business.name}</p>
          </div>
        </div>
        <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-100">
          In development
        </span>
      </header>

      <main className="flex flex-1 flex-col gap-4 py-8">
        <div className="space-y-2 text-center">
          <Radio className="mx-auto h-8 w-8 text-primary" aria-hidden />
          <h1 className="text-2xl font-semibold tracking-tight">Field shell</h1>
          <p className="text-sm text-muted-foreground">
            On-site ops surface. Fleet badges use the same Tap Point health model as Studio.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl border border-border/60 bg-card/40 px-2 py-3">
            <Activity className="mx-auto mb-1 h-4 w-4 text-primary" aria-hidden />
            <p className="text-lg font-semibold text-primary">{fleet.healthy}</p>
            <p className="text-[10px] text-muted-foreground">Healthy</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-card/40 px-2 py-3">
            <p className="text-lg font-semibold text-amber-200">{fleet.warning}</p>
            <p className="text-[10px] text-muted-foreground">Warning</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-card/40 px-2 py-3">
            <p className="text-lg font-semibold text-red-200">{fleet.critical}</p>
            <p className="text-[10px] text-muted-foreground">Critical</p>
          </div>
        </div>
        {waitingScans > 0 ? (
          <p className="text-center text-sm text-primary">
            {waitingScans} scan session{waitingScans === 1 ? "" : "s"} waiting
          </p>
        ) : null}

        <nav className="grid gap-2">
          <Link
            href="/dashboard/scan"
            className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/50 px-4 py-3 transition hover:border-primary/40"
          >
            <ScanLine className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium">Scan Mode</p>
              <p className="text-xs text-muted-foreground">Activate / claim Tap Points</p>
            </div>
          </Link>
          <Link
            href="/dashboard/tap-points"
            className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/50 px-4 py-3 transition hover:border-primary/40"
          >
            <Nfc className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium">Tap Points</p>
              <p className="text-xs text-muted-foreground">Studio device list</p>
            </div>
          </Link>
        </nav>

        <div className="space-y-3">
          <PulseClaimSessionStub />
          <PulseRotationPreviewStub />
        </div>

        <p className="rounded-lg border border-dashed border-border/50 px-3 py-2 text-center text-[11px] text-muted-foreground">
          Add to Home Screen on mobile for an installable feel. Service worker / offline cache not
          wired in this shell.
        </p>
      </main>

      <footer className="border-t border-border/40 pt-6">
        <PoweredByTapTheMagic />
      </footer>
    </div>
  );
}
