import { cookies, headers } from "next/headers";
import { createHash } from "crypto";
import Link from "next/link";
import type { Metadata } from "next";
import { CampaignPageRenderer } from "@/components/tap/campaign-renderer";
import { PoweredByTapTheMagic } from "@/components/brand/powered-by";
import {
  getDeviceWithActiveCampaign,
  isCampaignLive,
  logTapEvent,
  shouldShowInactiveDevice,
} from "@/lib/services/devices";
import { resolveTapContent } from "@/lib/services/tap-resolve";
import { claimScanSession } from "@/lib/services/scan";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type TapPageProps = {
  params: Promise<{ deviceCode: string }>;
  searchParams: Promise<{ public?: string }>;
};

export async function generateMetadata({ params }: TapPageProps): Promise<Metadata> {
  const { deviceCode } = await params;
  const result = await getDeviceWithActiveCampaign(deviceCode);
  const business = result?.device.business;
  const logo = business?.logoUrl;
  const title = business?.name ? `${business.name} · Tap Connect` : "Tap Connect";
  return {
    title,
    icons: logo
      ? { icon: [{ url: logo }], apple: [{ url: logo }] }
      : { icon: "/tap-connect-logo.png", apple: "/tap-connect-logo.png" },
  };
}

export default async function TapPage({ params, searchParams }: TapPageProps) {
  const { deviceCode } = await params;
  const { public: forcePublic } = await searchParams;

  // If dashboard Scan Mode is waiting, claim this tap for the owner
  // Skip when ?public=1 so a real visitor can still open the campaign
  if (forcePublic !== "1") {
    const jar = await cookies();
    const accessCode = jar.get("tc_scan")?.value ?? null;
    const claim = await claimScanSession({ deviceCode, accessCode });
    if (claim.claimed) {
      return (
        <TapStatusPage
          title="Device identified"
          message="You're all set — the Tap Connect dashboard has this device. You can close this tab."
          code={deviceCode}
          variant="scan"
          businessName={claim.device.nickname ?? undefined}
          deviceId={claim.device.id}
        />
      );
    }
  }

  const result = await getDeviceWithActiveCampaign(deviceCode);

  if (!result) {
    return (
      <TapStatusPage
        title="Device not found"
        message="This Tap Connect URL is not registered."
        code={deviceCode}
        variant="error"
      />
    );
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
    const brandKit = device.business?.brandKit;
    const resolved = await resolveTapContent({
      campaign,
      campaignGroupId: device.campaignGroupId,
      brandKit,
    });

    if (!resolved) {
      return (
        <TapStatusPage
          title="No active campaign"
          message={
            device.status === "UNASSIGNED"
              ? "This Tap Connect device has not been assigned a campaign yet."
              : "This device does not have a live campaign right now."
          }
          code={deviceCode}
          variant="waiting"
          businessName={device.business?.name}
        />
      );
    }

    if (resolved.redirectUrl) {
      redirect(resolved.redirectUrl);
    }

    const { parseBrandContactProfile } = await import("@/lib/brand/contact-profile");
    const contactProfile = {
      ...parseBrandContactProfile(brandKit?.socialLinks),
      organization:
        parseBrandContactProfile(brandKit?.socialLinks).organization ||
        device.business?.name ||
        undefined,
      phone:
        parseBrandContactProfile(brandKit?.socialLinks).phone ||
        device.business?.phone ||
        undefined,
      email:
        parseBrandContactProfile(brandKit?.socialLinks).email ||
        device.business?.email ||
        undefined,
      website:
        parseBrandContactProfile(brandKit?.socialLinks).website ||
        device.business?.website ||
        undefined,
    };

    const themeOverrides = resolved.themeOverrides;
    const theme = {
      primaryColor: themeOverrides.primaryColor ?? brandKit?.primaryColor ?? "#a3e635",
      secondaryColor: themeOverrides.secondaryColor ?? brandKit?.secondaryColor ?? "#0ea5e9",
      backgroundColor: themeOverrides.backgroundColor ?? brandKit?.backgroundColor ?? "#0b0f19",
      textColor: themeOverrides.textColor ?? brandKit?.textColor ?? "#f8fafc",
      backgroundImage: themeOverrides.backgroundImage,
      backgroundOverlayOpacity: themeOverrides.backgroundOverlayOpacity
        ? Number(themeOverrides.backgroundOverlayOpacity)
        : undefined,
      fontStyle: themeOverrides.fontStyle,
      fontFamily: themeOverrides.fontFamily,
    };

    return (
      <CampaignPageRenderer
        blocks={resolved.blocks}
        theme={theme}
        campaignId={resolved.campaign?.id ?? campaign?.id ?? "end"}
        deviceSlotId={device.id}
        businessId={device.businessId!}
        businessName={device.business?.name ?? "Business"}
        brandKit={brandKit}
        logoUrl={device.business?.logoUrl ?? null}
        contactProfile={contactProfile}
      />
    );
  }

  const brandKit = device.business?.brandKit;
  const themeOverrides = (campaign.themeOverrides as Record<string, string>) ?? {};
  const { parseContentBlocks } = await import("@/lib/services/devices");
  const blocks = parseContentBlocks(campaign.contentBlocks);
  const { parseBrandContactProfile } = await import("@/lib/brand/contact-profile");
  const contactProfile = {
    ...parseBrandContactProfile(brandKit?.socialLinks),
    organization:
      parseBrandContactProfile(brandKit?.socialLinks).organization ||
      device.business?.name ||
      undefined,
    phone:
      parseBrandContactProfile(brandKit?.socialLinks).phone ||
      device.business?.phone ||
      undefined,
    email:
      parseBrandContactProfile(brandKit?.socialLinks).email ||
      device.business?.email ||
      undefined,
    website:
      parseBrandContactProfile(brandKit?.socialLinks).website ||
      device.business?.website ||
      undefined,
  };

  let upcomingItems: { label: string; whenLabel: string; scheduleLabel?: string; campaignTitle?: string }[] = [];
  let showUpcomingStrip = false;
  if (result.campaignGroup?.id) {
    const { getUpcomingForGroup } = await import("@/lib/services/groups");
    upcomingItems = await getUpcomingForGroup(result.campaignGroup.id);
    showUpcomingStrip = result.campaignGroup.showUpcomingOnPages !== false;
  }

  const theme = {
    primaryColor: themeOverrides.primaryColor ?? brandKit?.primaryColor ?? "#a3e635",
    secondaryColor: themeOverrides.secondaryColor ?? brandKit?.secondaryColor ?? "#0ea5e9",
    backgroundColor: themeOverrides.backgroundColor ?? brandKit?.backgroundColor ?? "#0b0f19",
    textColor: themeOverrides.textColor ?? brandKit?.textColor ?? "#f8fafc",
    backgroundImage: themeOverrides.backgroundImage,
    backgroundOverlayOpacity: themeOverrides.backgroundOverlayOpacity
      ? Number(themeOverrides.backgroundOverlayOpacity)
      : undefined,
    fontStyle: themeOverrides.fontStyle,
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
      logoUrl={device.business?.logoUrl ?? null}
      contactProfile={contactProfile}
      upcomingItems={upcomingItems}
      showUpcomingStrip={showUpcomingStrip}
    />
  );
}

function TapStatusPage({
  title,
  message,
  code,
  variant,
  businessName,
  deviceId,
}: {
  title: string;
  message: string;
  code: string;
  variant: "error" | "inactive" | "waiting" | "scan";
  businessName?: string;
  deviceId?: string;
}) {
  const colors = {
    error: "from-red-500/20",
    inactive: "from-amber-500/20",
    waiting: "from-blue-500/20",
    scan: "from-primary/30",
  };

  return (
    <div
      className={`flex min-h-screen flex-col items-center justify-center bg-gradient-to-b ${colors[variant]} to-[#0b0f19] px-6`}
    >
      <div className="max-w-md text-center">
        <img
          src="/tap-connect-logo.png"
          alt="Tap Connect"
          className="mx-auto mb-6 h-16 w-auto object-contain opacity-90"
        />
        <p className="text-sm uppercase tracking-widest text-white/50">Tap Connect</p>
        {businessName && <p className="mt-2 text-lg font-medium text-white/80">{businessName}</p>}
        <h1 className="mt-4 text-2xl font-bold text-white">{title}</h1>
        <p className="mt-3 text-white/70">{message}</p>
        {variant === "scan" && deviceId && (
          <Link
            href={`/dashboard/devices/${deviceId}`}
            className="mt-6 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Open in dashboard
          </Link>
        )}
        <p className="mt-6 font-mono text-xs text-white/40">Device: {code}</p>
        <div className="mt-10">
          <PoweredByTapTheMagic />
        </div>
      </div>
    </div>
  );
}
