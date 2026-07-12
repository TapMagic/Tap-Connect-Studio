import {
  ArrowRight,
  BarChart3,
  Check,
  Globe,
  Layers3,
  QrCode,
  Sparkles,
  TabletSmartphone,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { AuthLinks } from "@/components/auth/auth-controls";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const featureCards = [
  {
    title: "Instant mini-pages",
    description:
      "Turn every NFC tap or QR scan into a polished, mobile-first destination with no app required.",
    icon: TabletSmartphone,
  },
  {
    title: "Smart touchpoint routing",
    description:
      "Serve different offers, menus, forms, or links based on campaign, venue, or device context.",
    icon: Layers3,
  },
  {
    title: "Live performance signals",
    description:
      "Track scans, taps, conversions, and dwell time so each physical interaction can be optimized.",
    icon: BarChart3,
  },
];

const pricingTiers = [
  {
    name: "Basic",
    price: "$19",
    description: "One TapConnect profile with essential mini pages.",
    callout: "Best for getting started",
    cta: "Start free",
    accent: "from-primary/18 via-emerald-400/6 to-transparent",
    featured: false,
    features: [
      "1 active device",
      "3 mini pages",
      "QR codes",
      "Basic analytics",
      "Email capture",
    ],
  },
  {
    name: "Studio",
    price: "$49",
    description: "For businesses running multiple tap campaigns.",
    callout: "Most popular",
    cta: "Get started",
    accent: "from-primary/24 via-cyan-400/8 to-transparent",
    featured: true,
    features: [
      "10 active devices",
      "10 active campaigns",
      "Campaign Workbench",
      "Company templates",
      "Coupons & offers",
    ],
  },
  {
    name: "Pro",
    price: "$99",
    description: "Advanced tools for growing businesses.",
    callout: "For serious marketers",
    cta: "Get started",
    accent: "from-emerald-400/18 via-cyan-400/8 to-transparent",
    featured: false,
    features: [
      "50 active devices",
      "Scan mode & staff roles",
      "Auto-reply emails",
      "Lead export",
      "Multi-location lite",
    ],
  },
  {
    name: "Growth",
    price: "$199",
    description: "For multi-location brands scaling tap marketing.",
    callout: "Built for scale",
    cta: "Talk to sales",
    accent: "from-cyan-400/18 via-primary/8 to-transparent",
    featured: false,
    features: [
      "150 active devices",
      "Team users",
      "Campaign scheduling",
      "Advanced analytics",
      "Priority support",
    ],
  },
];

const conversionPoints = [
  "Launch branded pages in minutes",
  "Update live destinations without reprinting",
  "Measure each real-world interaction",
];

export default function Home() {
  return (
    <main className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 -z-10 h-[40rem] bg-[radial-gradient(circle_at_top,rgba(98,255,151,0.18),transparent_34%),radial-gradient(circle_at_15%_18%,rgba(74,222,128,0.1),transparent_22%),radial-gradient(circle_at_80%_20%,rgba(56,189,248,0.12),transparent_28%),linear-gradient(to_bottom,rgba(9,14,20,0.9),rgba(9,14,20,0))]" />

      <section className="mx-auto max-w-7xl px-6 pt-6 pb-20 lg:px-8 lg:pt-8 lg:pb-24">
        <div className="mb-14 flex items-center justify-between rounded-full border border-primary/15 bg-background/75 px-4 py-3 shadow-[0_0_0_1px_rgba(115,255,162,0.06),0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_0_24px_rgba(115,255,162,0.35)]">
              <QrCode className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight">
                Tap Connect Studio
              </p>
              <p className="text-xs text-muted-foreground">
                NFC and QR mini-page platform
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="#pricing"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "hidden sm:inline-flex",
              )}
            >
              View pricing
            </a>
            <AuthLinks />
          </div>
        </div>

        <div className="grid items-center gap-14 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-8">
            <Badge
              variant="outline"
              className="h-auto rounded-full border-primary/30 bg-primary/10 px-3 py-1 text-primary"
            >
              <Sparkles className="size-3.5" />
              Built for premium offline-to-online journeys
            </Badge>

            <div className="space-y-6">
              <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-balance sm:text-6xl lg:text-7xl">
                Turn every tap or scan into a high-converting branded mini-page.
              </h1>

              <p className="max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl">
                Tap Connect Studio helps modern brands transform physical NFC and
                QR touchpoints into dynamic mobile experiences that capture
                leads, launch campaigns, and prove real-world ROI.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <a
                href="/sign-up"
                className={cn(buttonVariants({ size: "lg" }), "px-6")}
              >
                Start building
                <ArrowRight className="size-4" />
              </a>
              <a
                href="#preview"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "px-6",
                )}
              >
                Explore the platform
              </a>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: "Launch time", value: "< 10 min" },
                { label: "Campaign lift", value: "+32%" },
                { label: "Touchpoints managed", value: "12k+" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-3xl border border-border/80 bg-card/80 p-5 shadow-[0_16px_40px_rgba(0,0,0,0.22)] backdrop-blur"
                >
                  <p className="text-2xl font-semibold tracking-tight">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <Card className="relative overflow-hidden border-primary/15 bg-card/90 shadow-[0_24px_80px_rgba(3,8,15,0.55)] backdrop-blur">
            <div className="absolute inset-x-8 top-0 h-32 rounded-b-full bg-[radial-gradient(circle,rgba(98,255,151,0.16),transparent_68%)]" />
            <CardHeader className="relative gap-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-xl">
                    Campaign control center
                  </CardTitle>
                  <CardDescription>
                    Preview how a single touchpoint becomes a branded mobile
                    destination.
                  </CardDescription>
                </div>
                <Badge className="rounded-full">Live preview</Badge>
              </div>
            </CardHeader>

            <CardContent className="relative space-y-5">
              <div className="rounded-3xl border border-border/80 bg-background/55 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                    <Globe className="size-5" />
                  </div>
                  <div>
                    <p className="font-medium">Spring launch mini-page</p>
                    <p className="text-sm text-muted-foreground">
                      Triggered by NFC tag on in-store display
                    </p>
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-primary/20 bg-[linear-gradient(180deg,rgba(13,22,31,0.98),rgba(10,16,24,0.98))] p-5 text-slate-50 shadow-[0_0_0_1px_rgba(115,255,162,0.08),0_0_40px_rgba(115,255,162,0.08)]">
                  <Badge className="mb-4 rounded-full border-primary/30 bg-primary/12 text-primary hover:bg-primary/12">
                    Featured experience
                  </Badge>
                  <p className="max-w-xs text-2xl font-semibold tracking-tight">
                    Tap for early access, product walkthroughs, and exclusive
                    launch drops.
                  </p>
                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-primary/10 bg-white/4 p-3">
                      <p className="text-sm text-slate-300">Today&apos;s taps</p>
                      <p className="mt-1 text-xl font-semibold">1,284</p>
                    </div>
                    <div className="rounded-2xl border border-primary/10 bg-white/4 p-3">
                      <p className="text-sm text-slate-300">Lead conversion</p>
                      <p className="mt-1 text-xl font-semibold">18.6%</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {conversionPoints.map((point) => (
                  <div
                    key={point}
                    className="rounded-2xl border border-border/70 bg-background/45 p-4"
                  >
                    <div className="mb-3 flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Zap className="size-4" />
                    </div>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {point}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section
        id="preview"
        className="border-y border-border/60 bg-background/35 py-20"
      >
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <Badge
              variant="outline"
              className="mb-4 rounded-full border-border/70 bg-background px-3 py-1"
            >
              Feature preview
            </Badge>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Everything needed to connect physical presence with digital
              performance.
            </h2>
            <p className="mt-4 text-lg leading-8 text-muted-foreground">
              Designed for digital teams that need speed, beautiful experiences,
              and measurable attribution across every tap and scan.
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-1">
              {featureCards.map((feature) => {
                const Icon = feature.icon;

                return (
                  <Card
                    key={feature.title}
                    className="border-border/80 bg-card/82 shadow-[0_14px_36px_rgba(0,0,0,0.24)] backdrop-blur transition-transform duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-[0_20px_50px_rgba(0,0,0,0.34)]"
                  >
                    <CardHeader>
                      <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Icon className="size-5" />
                      </div>
                      <CardTitle>{feature.title}</CardTitle>
                      <CardDescription className="text-base leading-7">
                        {feature.description}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>

            <Card className="overflow-hidden border-primary/15 bg-[linear-gradient(180deg,rgba(16,24,34,0.96),rgba(11,18,27,0.98))] text-slate-50 shadow-[0_28px_80px_rgba(2,6,12,0.55)]">
              <CardHeader className="border-b border-white/8">
                <CardTitle className="text-slate-50">
                  See the customer journey at a glance
                </CardTitle>
                <CardDescription className="text-slate-300">
                  From scan source to conversion, every touchpoint tells a
                  measurable story.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                {[
                  {
                    label: "NFC business card",
                    value: "241 taps this week",
                  },
                  {
                    label: "Retail shelf QR",
                    value: "12.8% coupon capture rate",
                  },
                  {
                    label: "Event booth handoff",
                    value: "83 qualified leads synced",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-primary/10 bg-white/4 p-4"
                  >
                    <div className="mb-2 flex items-center justify-between gap-4">
                      <p className="font-medium">{item.label}</p>
                      <span className="text-xs uppercase tracking-[0.2em] text-primary">
                        Live
                      </span>
                    </div>
                    <p className="text-sm text-slate-300">{item.value}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section id="pricing" className="py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <Badge
              variant="outline"
              className="mb-4 rounded-full border-border/70 bg-background px-3 py-1"
            >
              Pricing
            </Badge>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Flexible plans for ambitious physical-to-digital growth.
            </h2>
            <p className="mt-4 text-lg leading-8 text-muted-foreground">
              Start with a focused pilot or scale across locations, brands, and
              agency clients with a plan built for performance teams.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {pricingTiers.map((tier) => (
              <Card
                key={tier.name}
                className={cn(
                  "relative overflow-hidden border-border/80 bg-card/88 shadow-[0_18px_44px_rgba(0,0,0,0.24)] backdrop-blur transition-all duration-300 hover:-translate-y-2 hover:border-primary/20 hover:shadow-[0_22px_56px_rgba(0,0,0,0.34)]",
                  tier.featured &&
                    "border-primary/35 shadow-[0_0_0_1px_rgba(115,255,162,0.08),0_24px_60px_rgba(0,0,0,0.35),0_0_30px_rgba(115,255,162,0.12)] ring-1 ring-primary/20",
                )}
              >
                <div
                  className={cn(
                    "absolute inset-x-0 top-0 h-36 bg-gradient-to-b opacity-90",
                    tier.accent,
                  )}
                />
                <CardHeader className="relative gap-4">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-2xl">{tier.name}</CardTitle>
                    <Badge
                      variant={tier.featured ? "default" : "outline"}
                      className="rounded-full"
                    >
                      {tier.callout}
                    </Badge>
                  </div>
                  <CardDescription className="text-base leading-7">
                    {tier.description}
                  </CardDescription>
                  <div className="flex items-end gap-2">
                    <span className="text-5xl font-semibold tracking-tight">
                      {tier.price}
                    </span>
                    <span className="pb-2 text-sm text-muted-foreground">
                      per month
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="relative">
                  <ul className="space-y-4">
                    {tier.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-3 text-sm leading-6 text-muted-foreground"
                      >
                        <div className="mt-0.5 flex size-5 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <Check className="size-3.5" />
                        </div>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter className="relative flex-col items-stretch gap-3 border-t border-border/60 bg-background/55">
                  <a
                    href="/onboarding"
                    className={cn(
                      buttonVariants({
                        variant: tier.featured ? "default" : "outline",
                        size: "lg",
                      }),
                      "w-full justify-center",
                    )}
                  >
                    {tier.cta}
                    <ArrowRight className="size-4" />
                  </a>
                  <p className="text-center text-sm text-muted-foreground">
                    No long-term contract. Upgrade anytime.
                  </p>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60 py-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p className="text-lg font-semibold tracking-tight">
              Tap Connect Studio
            </p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Premium infrastructure for brands that want every NFC or QR moment
              to feel intentional, measurable, and beautifully on-brand.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
            <a href="#preview" className="transition-colors hover:text-foreground">
              Features
            </a>
            <a href="#pricing" className="transition-colors hover:text-foreground">
              Pricing
            </a>
            <a href="#" className="transition-colors hover:text-foreground">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
