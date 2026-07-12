import { requireBusiness } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DevicesManager } from "@/components/devices/devices-manager";

export const dynamic = "force-dynamic";

export default async function DevicesPage() {
  const { business } = await requireBusiness();

  const devices = await prisma.deviceSlot.findMany({
    where: { businessId: business.id },
    orderBy: { createdAt: "desc" },
    include: {
      assignments: {
        where: { status: "ACTIVE" },
        take: 1,
        include: { campaign: { select: { title: true } } },
      },
    },
  });

  const rows = devices.map((d) => ({
    id: d.id,
    deviceCode: d.deviceCode,
    nickname: d.nickname,
    status: d.status,
    deviceType: d.deviceType,
    totalTapCount: d.totalTapCount,
    lastTappedAt: d.lastTappedAt?.toISOString() ?? null,
    campaignTitle: d.assignments[0]?.campaign?.title ?? null,
  }));

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-bold">Devices</h1>
        <p className="text-muted-foreground">
          Manage your NFC and QR touchpoints. URLs stay stable — change campaigns anytime.
        </p>
      </div>
      <DevicesManager devices={rows} limit={business.activeDeviceLimit} />
    </div>
  );
}
