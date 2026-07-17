import Link from "next/link";
import {
  Building2,
  Layers3,
  Nfc,
  PenTool,
  Shield,
  Users,
  Zap,
} from "lucide-react";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { LandingTilesEditor } from "@/components/admin/landing-tiles-editor";
import { LandingDemosEditor } from "@/components/admin/landing-demos-editor";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthControls } from "@/components/auth/auth-controls";
import { DevModeBanner } from "@/components/dev-mode-banner";
import { requirePlatformAdmin } from "@/lib/auth";
import { PLATFORM_ADMIN_EMAILS } from "@/lib/config/admins";
import { isMediaUploadReady, isStockImagesReady } from "@/lib/config/integrations";
import { prisma } from "@/lib/db";
import { isClerkConfigured } from "@/lib/utils/app";
import { ensurePlatformAdminUsers } from "@/lib/services/admins";
import { listLandingUseCases } from "@/lib/services/landing-use-cases";
import { listLandingDemoSlots } from "@/lib/services/landing-demos";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  await ensurePlatformAdminUsers();
  const { user, business } = await requirePlatformAdmin();

  const [
    businessCount,
    userCount,
    campaignCount,
    deviceCount,
    recentBusinesses,
    landingTiles,
    demoSlots,
    demoCampaigns,
  ] = await Promise.all([
      prisma.business.count(),
      prisma.user.count(),
      prisma.campaign.count(),
      prisma.deviceSlot.count(),
      prisma.business.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          name: true,
          slug: true,
          subscriptionTier: true,
          createdAt: true,
          _count: { select: { campaigns: true, devices: true, users: true } },
        },
      }),
      listLandingUseCases(),
      listLandingDemoSlots(),
      prisma.campaign.findMany({
        where: { status: { notIn: ["ARCHIVED", "CLOSED"] } },
        select: {
          id: true,
          title: true,
          status: true,
          campaignType: true,
          business: { select: { name: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 200,
      }),
    ]);

  const stats = [
    { label: "Businesses", value: businessCount, icon: Building2 },
    { label: "Users", value: userCount, icon: Users },
    { label: "Campaigns", value: campaignCount, icon: Layers3 },
    { label: "Devices", value: deviceCount, icon: Nfc },
  ];

  const overview = (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="border-border/60 bg-card/60">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardDescription>{stat.label}</CardDescription>
                <Icon className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold">{stat.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/60 bg-card/60">
          <CardHeader>
            <CardTitle className="text-lg">Admin access</CardTitle>
            <CardDescription>
              Same Clerk login for everyone. These emails land here automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {PLATFORM_ADMIN_EMAILS.map((email) => (
              <div
                key={email}
                className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2 text-sm"
              >
                <span>{email}</span>
                <span className="text-xs text-primary">
                  {normalizeMatch(user.email, email) ? "you" : "seeded"}
                </span>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              Danny can sign in whenever Clerk is ready — Stripe billing auth can come later.
              User rows are pre-seeded for routing.
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60">
          <CardHeader>
            <CardTitle className="text-lg">Next (not built yet)</CardTitle>
            <CardDescription>Queued after this lean Admin foundation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>· Team invites & business roles</p>
            <p>· Shared vs private Admin campaigns</p>
            <p>· Branding media library (tier-gated)</p>
            <p>· Stripe billing for customers</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60 bg-card/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="h-4 w-4 text-primary" />
            Recent businesses
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentBusinesses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No businesses yet.</p>
          ) : (
            <div className="divide-y divide-border/50">
              {recentBusinesses.map((b) => (
                <div
                  key={b.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium">{b.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {b.slug} · {b.subscriptionTier}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {b._count.users} users · {b._count.campaigns} campaigns ·{" "}
                    {b._count.devices} devices
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <DevModeBanner />
      {isClerkConfigured() && (
        <div className="flex justify-end border-b border-border/40 px-4 py-2 lg:px-6">
          <AuthControls />
        </div>
      )}

      <div className="mx-auto max-w-6xl space-y-8 px-6 py-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Shield className="h-3.5 w-3.5" />
              Platform Admin
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
            <p className="mt-1 text-muted-foreground">
              Signed in as {user.email}. Unlimited campaigns on workspace{" "}
              <span className="text-foreground">{business.name}</span>.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/workbench" className={buttonVariants()}>
              <PenTool className="mr-2 h-4 w-4" />
              Campaign Workbench
            </Link>
            <Link href="/dashboard/card" className={buttonVariants({ variant: "outline" })}>
              <Zap className="mr-2 h-4 w-4" />
              Landing demo card
            </Link>
            <Link href="/dashboard" className={buttonVariants({ variant: "outline" })}>
              Business view
            </Link>
          </div>
        </div>

        <AdminTabs
          overview={overview}
          landingTiles={
            <LandingTilesEditor
              initialTiles={landingTiles}
              mediaUploadReady={isMediaUploadReady()}
              stockReady={isStockImagesReady()}
            />
          }
          liveDemos={
            <LandingDemosEditor
              initialSlots={demoSlots}
              campaigns={demoCampaigns.map((c) => ({
                id: c.id,
                title: c.title,
                status: c.status,
                campaignType: c.campaignType,
                businessName: c.business.name,
              }))}
              mediaUploadReady={isMediaUploadReady()}
              stockReady={isStockImagesReady()}
            />
          }
        />
      </div>
    </div>
  );
}

function normalizeMatch(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}
