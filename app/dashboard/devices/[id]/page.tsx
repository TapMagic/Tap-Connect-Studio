import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireBusiness } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatRelativeDate, getDevicePath } from "@/lib/utils/app";
import { DeviceAssignForm } from "@/components/devices/assign-form";
import { DeviceStatusActions } from "@/components/devices/device-status-actions";
import { DeviceScheduleGroup } from "@/components/devices/device-schedule-group";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function DeviceDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { business } = await requireBusiness();

  const device = await prisma.deviceSlot.findFirst({
    where: { id, businessId: business.id },
    include: {
      location: true,
      assignments: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { campaign: { select: { id: true, title: true, status: true } } },
      },
    },
  });

  if (!device) notFound();

  const campaigns = await prisma.campaign.findMany({
    where: {
      businessId: business.id,
      status: { in: ["DRAFT", "READY", "LIVE", "SCHEDULED"] },
    },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, status: true },
  });

  const activeAssignment = device.assignments.find((a) => a.status === "ACTIVE");
  const tapPath = getDevicePath(device.deviceCode);
  const deviceLabel = device.nickname ?? device.deviceCode;

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{deviceLabel}</h1>
            <Badge variant="outline">{device.status.toLowerCase()}</Badge>
          </div>
          <p className="mt-1 font-mono text-sm text-muted-foreground">{tapPath}</p>
        </div>
        <a
          href={tapPath}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ variant: "outline" })}
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          Preview Public Page
        </a>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Taps</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{device.totalTapCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Last Tapped</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{formatRelativeDate(device.lastTappedAt)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Default Campaign</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">
              {activeAssignment?.campaign?.title ?? "None assigned"}
            </p>
          </CardContent>
        </Card>
      </div>

      <DeviceAssignForm
        deviceId={device.id}
        campaigns={campaigns}
        currentCampaignId={activeAssignment?.campaign?.id}
      />

      <DeviceScheduleGroup
        deviceId={device.id}
        deviceLabel={deviceLabel}
        campaigns={campaigns}
      />

      <DeviceStatusActions deviceId={device.id} currentStatus={device.status} />

      <Card>
        <CardHeader>
          <CardTitle>Assignment History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {device.assignments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No assignment history yet.</p>
          ) : (
            device.assignments.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between rounded-lg border border-border/40 px-3 py-2 text-sm"
              >
                <div>
                  <Link
                    href={`/dashboard/campaigns/${a.campaign.id}`}
                    className="font-medium hover:text-primary"
                  >
                    {a.campaign.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {a.startsAt.toLocaleDateString()} — {a.status.toLowerCase()}
                  </p>
                </div>
                <Badge variant="outline">{a.campaign.status.toLowerCase()}</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
