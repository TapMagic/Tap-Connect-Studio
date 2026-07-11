import { headers } from "next/headers";
import { createHash } from "crypto";
import { CampaignPageRenderer } from "@/components/tap/campaign-renderer";
import {
  getDeviceWithActiveCampaign,
  isCampaignLive,
  logTapEvent,
  parseContentBlocks,
  shouldShowInactiveDevice,
} from "@/lib/services/devices";

export const dynamic = "force-dynamic";

type TapPageProps = {
  params: Promise<{ deviceCode: string }>;
};

export default async function TapPage({ params }: TapPageProps) {
  const { deviceCode } = await params;
  const result = await getDeviceWithActiveCampaign(deviceCode);

  if (!result) {
    return <TapStatusPage title="Device not found" message="This TapConnect URL is not registered." code={deviceCode} variant="error" />;
  }

  const { device, campaign } = result;
  const requestHeaders = await headers();
  const userAgent = requestHeaders.get("user-agent");
  const referrer = requestHeaders.get("referer");
  const visitorHash = createHash("sha256")
    .update(`${userAgent ?? ""}-${requestHeaders.get("x-forwarded-for") ?? "unknown"}`)
    .digest("hex")
    .slice(0, 16);

  await logTapEvent({
    deviceSlotId: device.id,
    businessId: device.businessId,
    campaignId: campaign?.id,
    visitorHash,
    userAgent,
    referrer,
  });

  if (shouldShowInactiveDevice(device.status)) {
    return (
      <TapStatusPage
        title="This device is not active"
        message={`Status: ${device.status.replace(/_/g, " ").toLowerCase()}`}
        code={deviceCode}
        variant="inactive"
        businessName={device.business?.name}
      />
    );
  }

  if (!campaign || !isCampaignLive(campaign)) {
    return (
      <TapStatusPage
        title="No active campaign"
        message={
          device.status === "UNASSIGNED"
            ? "This TapConnect device has not been assigned a campaign yet."
            : "This device does not have a live campaign right now."
        }
        code={deviceCode}
        variant="waiting"
        businessName={device.business?.name}
      />
    );
  }

  const brandKit = device.business?.brandKit;
  const themeOverrides = (campaign.themeOverrides as Record<string, string>) ?? {};
  const blocks = parseContentBlocks(campaign.contentBlocks);

  const theme = {
    primaryColor: themeOverrides.primaryColor ?? brandKit?.primaryColor ?? "#22c55e",
    secondaryColor: themeOverrides.secondaryColor ?? brandKit?.secondaryColor ?? "#0ea5e9",
    backgroundColor: themeOverrides.backgroundColor ?? brandKit?.backgroundColor ?? "#0b0f19",
    textColor: themeOverrides.textColor ?? brandKit?.textColor ?? "#f8fafc",
  };

  return (
    <CampaignPageRenderer
      blocks={blocks}
      theme={theme}
      campaignId={campaign.id}
      deviceSlotId={device.id}
      businessId={device.businessId!}
      businessName={device.business?.name ?? "Business"}
      brandKit={brandKit}
    />
  );
}

function TapStatusPage({
  title,
  message,
  code,
  variant,
  businessName,
}: {
  title: string;
  message: string;
  code: string;
  variant: "error" | "inactive" | "waiting";
  businessName?: string;
}) {
  const colors = {
    error: "from-red-500/20",
    inactive: "from-amber-500/20",
    waiting: "from-blue-500/20",
  };

  return (
    <div className={`flex min-h-screen items-center justify-center bg-gradient-to-b ${colors[variant]} to-[#0b0f19] px-6`}>
      <div className="max-w-md text-center">
        <p className="text-sm uppercase tracking-widest text-white/50">TapConnect</p>
        {businessName && <p className="mt-2 text-lg font-medium text-white/80">{businessName}</p>}
        <h1 className="mt-4 text-2xl font-bold text-white">{title}</h1>
        <p className="mt-3 text-white/70">{message}</p>
        <p className="mt-6 font-mono text-xs text-white/40">Device: {code}</p>
      </div>
    </div>
  );
}
