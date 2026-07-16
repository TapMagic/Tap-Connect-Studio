import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Bookmark,
  CalendarClock,
  Check,
  CreditCard,
  LayoutGrid,
  Library,
  Mail,
  MapPin,
  MapPinned,
  MessageSquare,
  Palette,
  Radio,
  Sparkles,
  Store,
  TabletSmartphone,
  Tags,
  Users,
} from "lucide-react";
import { AuthLinks } from "@/components/auth/auth-controls";
import { HeroCtas } from "@/components/auth/hero-ctas";
import { TapConnectLogo } from "@/components/brand/tap-connect-logo";
import { LiveDemoPhone } from "@/components/marketing/live-demo-phone";
import { FeatureComparisonChart } from "@/components/marketing/feature-comparison";
import { PlatformCollageGraphic } from "@/components/marketing/platform-collage";
import { TapVideoSection } from "@/components/marketing/tap-video-section";
import { DeviceManagerShowcase } from "@/components/marketing/device-manager-showcase";
import { TapCardLaunchpadGraphic } from "@/components/marketing/tap-card-launchpad";
import { UseCaseImageCards } from "@/components/marketing/use-case-image-cards";
import { buttonVariants } from "@/components/ui/button";
import {
  BLOCK_LIBRARY_GROUPS,
  BOUTIQUE_SCHEDULE,
  BRAND_LIBRARY_FEATURES,
  CAPTURE_FEATURES,
  CARD_LAUNCHPAD_FEATURES,
  DEVICE_FEATURES,
  EMAIL_FEATURES,
  EVOLUTION_CARDS,
  FAQS,
  HERO_PILLS,
  PRICING_PREVIEW,
  ANALYTICS_FEATURES,
  WORKBENCH_FEATURES,
  WORKFLOW_STEPS,
} from "@/lib/marketing/landing-content";
import { getPublicLandingUseCases } from "@/lib/services/landing-use-cases";
import { cn } from "@/lib/utils";
import "@/app/t/tap.css";
import "@/components/marketing/landing.css";

export const dynamic = "force-dynamic";

const EVOLUTION_ICONS = [
  CreditCard,
  LayoutGrid,
  Tags,
  Radio,
  MessageSquare,
  Users,
  TabletSmartphone,
  CalendarClock,
  BarChart3,
  Library,
  Mail,
  Store,
] as const;

const EVOLUTION_TONES = [
  "lp-icon-gold",
  "lp-icon-blue",
  "lp-icon-green",
  "lp-icon-violet",
] as const;

const VALUE_BLOCKS = [
  {
    title: "Every Tap Can Become a Contact.",
    items: CAPTURE_FEATURES,
    Icon: Users,
    tone: "lp-icon-green",
  },
  {
    title: "Follow Up Before They Forget You.",
    items: EMAIL_FEATURES,
    Icon: Mail,
    tone: "lp-icon-gold",
  },
  {
    title: "Know What Gets Tapped. Know What Converts.",
    items: ANALYTICS_FEATURES,
    Icon: BarChart3,
    tone: "lp-icon-blue",
  },
  {
    title: "Your Brand Kit, Ready for Every Campaign.",
    items: BRAND_LIBRARY_FEATURES,
    Icon: Palette,
    tone: "lp-icon-violet",
  },
] as const;

function SectionEyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--lp-gold,#d6a84f)]">
      {children}
    </p>
  );
}

function DeviceChip({ label }: { label: string }) {
  return (
    <div className="lp-card-hover rounded-2xl bg-[#0b1020]/90 px-3 py-2 text-center text-[11px] font-medium text-slate-200">
      {label}
    </div>
  );
}

export default async function Home() {
  const useCaseTiles = await getPublicLandingUseCases();

  return (
    <main className="lp relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[48rem]">
        <div className="lp-orb left-[10%] top-16 size-[28rem] bg-[rgba(214,168,79,0.14)]" />
        <div className="lp-orb right-[5%] top-32 size-[22rem] bg-[rgba(59,130,246,0.12)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(15,23,42,0.9),transparent_55%),linear-gradient(to_bottom,#050814,#07111f_40%,#050814)]" />
      </div>

      <div className="border-b border-[rgba(214,168,79,0.2)] bg-[rgba(214,168,79,0.08)] px-4 py-2 text-center text-xs font-medium text-[var(--lp-gold-bright,#f3c96b)] sm:text-sm">
        TapConnect started as a smart card · Studio turns every physical touchpoint into a live
        campaign surface
      </div>

      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-8">
        <div className="flex items-center gap-3">
          <TapConnectLogo variant="mark" priority imgClassName="h-11 w-11 rounded-xl" />
          <div>
            <p className="text-sm font-semibold tracking-tight">TapConnect Studio</p>
            <p className="text-[11px] text-slate-400">Powered by Tap The Magic</p>
          </div>
        </div>
        <nav className="flex items-center gap-2 sm:gap-3">
          <a
            href="#demo"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "hidden border-[rgba(214,168,79,0.35)] sm:inline-flex"
            )}
          >
            Live demo
          </a>
          <a
            href="#pricing"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "hidden md:inline-flex")}
          >
            Pricing
          </a>
          <a
            href="#compare"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "hidden lg:inline-flex")}
          >
            Compare
          </a>
          <AuthLinks />
        </nav>
      </header>

      {/* 1 · Hero */}
      <section className="mx-auto grid max-w-7xl items-center gap-12 px-6 pb-16 pt-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:pb-24 lg:pt-10">
        <div className="space-y-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(214,168,79,0.35)] bg-[rgba(214,168,79,0.1)] px-3 py-1 text-xs font-medium text-[var(--lp-gold-bright,#f3c96b)]">
            <Sparkles className="size-3.5" />
            Tap-to-campaign platform
          </div>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
            Every Tap Becomes a{" "}
            <span className="lp-gold-text">Customer Journey.</span>
          </h1>
          <p className="max-w-xl text-lg leading-8 text-slate-300">
            TapConnect Studio turns cards, Tap Devices, smart signs, product displays, and physical
            touchpoints into live campaigns — with offers, lead capture, reviews, maps, branded
            emails, scheduling, and analytics.
          </p>
          <HeroCtas />
          <div className="flex flex-wrap gap-2">
            {HERO_PILLS.map((t) => (
              <span
                key={t}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300"
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-md">
          <div className="absolute left-1/2 top-1/2 z-0 size-40 -translate-x-1/2 -translate-y-1/2">
            <span className="lp-signal-ring" />
            <span className="lp-signal-ring" />
            <span className="lp-signal-ring" />
          </div>
          <div className="lp-card-gold relative z-10 rounded-[2rem] bg-[#0b1020]/80 p-5 backdrop-blur">
            <div className="mb-4 flex items-center justify-center gap-2 text-xs text-slate-400">
              <TabletSmartphone className="size-4 text-[var(--lp-gold,#d6a84f)]" />
              Physical touchpoint → live mini page
            </div>
            <div className="mx-auto flex h-48 max-w-[200px] flex-col justify-between rounded-[1.75rem] border border-white/15 bg-gradient-to-b from-[#111827] to-[#050814] p-4 shadow-inner">
              <div className="mx-auto h-1.5 w-16 rounded-full bg-white/15" />
              <div className="space-y-2 text-center">
                <p className="text-[10px] uppercase tracking-widest text-[var(--lp-signal,#72ff8a)]">
                  Live
                </p>
                <p className="text-sm font-semibold">Campaign surface</p>
                <p className="text-[11px] text-slate-400">Offer · Collect · Follow up</p>
              </div>
              <div className="h-8 rounded-full bg-[var(--lp-gold,#d6a84f)]/90 text-center text-[11px] font-bold leading-8 text-[#0b0f19]">
                Save to contacts
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {["Tap Card", "Smart Display", "Review Sign", "Product Tag"].map((d) => (
                <DeviceChip key={d} label={d} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 2 · Not just a card */}
      <section id="features" className="border-y border-white/8 bg-[#07111f] py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <SectionEyebrow>Not just a card anymore</SectionEyebrow>
          <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
            From smart card to command center for every physical touchpoint.
          </h2>
          <p className="mt-4 max-w-3xl text-lg text-slate-300">
            TapConnect v1.0 helped people share a profile with one tap. Studio lets businesses
            control entire campaigns behind every card, smart sign, product display, and interactive
            touchpoint.
          </p>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {EVOLUTION_CARDS.map((c, i) => {
              const Icon = EVOLUTION_ICONS[i % EVOLUTION_ICONS.length];
              const tone = EVOLUTION_TONES[i % EVOLUTION_TONES.length];
              return (
                <div key={c.title} className="lp-card-hover rounded-2xl bg-[#0f172a]/90 p-5">
                  <div
                    className={cn(
                      "mb-3 flex size-10 items-center justify-center rounded-xl",
                      tone
                    )}
                  >
                    <Icon className="size-5" />
                  </div>
                  <h3 className="font-semibold text-white">{c.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{c.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3 · Live demo */}
      <section id="demo" className="py-20">
        <div className="mx-auto max-w-3xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <SectionEyebrow>Live demo</SectionEyebrow>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Same campaign engine customers use inside Studio.
            </h2>
            <p className="mt-4 text-slate-300">
              Change the campaign in the dashboard, and the tap experience changes instantly. Scroll
              inside the frame — the demo stays contained so the page never blows out.
            </p>
          </div>
          <div className="mt-10">
            <LiveDemoPhone framed />
          </div>
        </div>
      </section>

      {/* 4 · Workflow */}
      <section className="border-y border-white/8 bg-[#07111f] py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <h2 className="text-center text-3xl font-semibold tracking-tight sm:text-4xl">
            Build → Assign → Tap → Capture
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-300">
            The Studio loop: every physical interaction becomes a measurable customer journey.
          </p>
          <div className="relative mt-14">
            <div className="lp-workflow-line hidden md:block" aria-hidden />
            <div className="grid gap-6 md:grid-cols-4">
              {WORKFLOW_STEPS.map((s) => (
                <div
                  key={s.n}
                  className="lp-card-hover relative rounded-3xl bg-[#0f172a] p-5"
                >
                  <p className="text-sm font-bold text-[var(--lp-gold,#d6a84f)]">{s.n}</p>
                  <h3 className="mt-2 text-lg font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 5 · Visual break — platform collage */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <SectionEyebrow>The platform</SectionEyebrow>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Build here. Deploy there. Track results everywhere.
            </h2>
            <p className="mt-4 text-slate-300">
              Workbench, Tap Devices, collectors, and analytics — one system behind every physical
              touchpoint.
            </p>
          </div>
          <div className="mt-10">
            <PlatformCollageGraphic />
          </div>
        </div>
      </section>

      {/* Video break */}
      <TapVideoSection />

      {/* 6 · Workbench */}
      <section className="py-20">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <SectionEyebrow>Campaign Workbench</SectionEyebrow>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Build campaigns before you even know which device will run them.
            </h2>
            <p className="mt-4 text-lg text-slate-300">
              Can&apos;t sleep at 4:00 AM? Build tomorrow&apos;s campaign in Workbench, save it as a
              draft, and assign it to a device later when someone at the store taps the right tag.
            </p>
            <Link
              href="/dashboard/workbench"
              className={cn(buttonVariants({ size: "lg" }), "mt-8 inline-flex px-6")}
            >
              Open Workbench
              <ArrowRight className="size-4" />
            </Link>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {WORKBENCH_FEATURES.map((f, i) => (
              <li
                key={f}
                className="lp-card-hover flex gap-2 rounded-xl bg-white/[0.03] px-3 py-2.5 text-sm text-slate-300"
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg",
                    EVOLUTION_TONES[i % EVOLUTION_TONES.length]
                  )}
                >
                  <Check className="size-3.5" />
                </span>
                {f}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 7 · Scheduled offers — boutique */}
      <section className="border-y border-white/8 bg-[#07111f] py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <SectionEyebrow>Campaign groups · Weekly Store Promotions</SectionEyebrow>
          <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
            Schedule Offers Once. Let the Tap Device Rotate Them.
          </h2>
          <p className="mt-4 max-w-3xl text-lg text-slate-300">
            Boutique and retail weekly promos from the same Tap Device — automatically. Build in
            Workbench, schedule by day and time, and collect contacts with branded follow-up.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {BOUTIQUE_SCHEDULE.map((slot) => (
              <div key={slot.title} className="lp-card-gold rounded-3xl bg-[#0f172a] p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--lp-signal,#72ff8a)]">
                  {slot.when}
                </p>
                <h3 className="mt-2 text-lg font-semibold">{slot.title}</h3>
                <p className="mt-2 text-sm text-slate-400">{slot.body}</p>
              </div>
            ))}
          </div>
          <ul className="mt-8 grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
            {[
              "Same Tap Device rotates the correct offer by day/time",
              "No active campaign → branded fallback message",
              "Draft in Workbench, schedule, assign later",
              "Multi-location schedules · owner notified on contact claim",
            ].map((item) => (
              <li key={item} className="flex gap-2">
                <Check className="mt-0.5 size-4 text-[var(--lp-gold,#d6a84f)]" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 8 · Device manager */}
      <section className="py-20">
        <div className="mx-auto grid max-w-7xl items-start gap-10 px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
          <div>
            <SectionEyebrow>Tap Device Manager</SectionEyebrow>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Every Tap Device Has a Profile. Every Device Can Be Reused.
            </h2>
            <p className="mt-4 text-lg text-slate-300">
              An employee can tap a device in the store and the owner can immediately see exactly
              what it is assigned to and update it remotely — without replacing the physical device.
            </p>
            <ul className="mt-6 space-y-2.5">
              {DEVICE_FEATURES.slice(0, 6).map((f) => (
                <li key={f} className="flex gap-2 text-sm text-slate-300">
                  <Radio className="mt-0.5 size-4 shrink-0 text-[var(--lp-signal,#72ff8a)]" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
          <DeviceManagerShowcase />
        </div>
      </section>

      {/* 9 · Tap Card builder */}
      <section className="border-y border-white/8 bg-[#07111f] py-20">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 lg:grid-cols-[1fr_1fr] lg:px-8">
          <div>
            <SectionEyebrow>Tap Card Builder</SectionEyebrow>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              The Card Became a Launchpad.
            </h2>
            <p className="mt-4 text-lg text-slate-300">
              Meet someone in a grocery store. Tap their phone. The top action can open a contact
              collector and return a special offer you designed — then unlink or relink campaigns
              anytime.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {CARD_LAUNCHPAD_FEATURES.map((f, i) => {
                const tones = EVOLUTION_TONES;
                const Icons = [CreditCard, LayoutGrid, Users, Bookmark, Palette, MapPinned, Mail, Tags];
                const Icon = Icons[i % Icons.length];
                return (
                  <div
                    key={f}
                    className="lp-card-hover flex items-start gap-3 rounded-2xl bg-[#0f172a] p-3.5 text-sm text-slate-300"
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg",
                        tones[i % tones.length]
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                    <span>{f}</span>
                  </div>
                );
              })}
            </div>
            <Link
              href="/dashboard/card"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "mt-8 inline-flex px-6")}
            >
              Explore Tap Card Builder
              <ArrowRight className="size-4" />
            </Link>
          </div>
          <TapCardLaunchpadGraphic />
        </div>
      </section>

      {/* 10 · Block library */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <LayoutGrid className="mx-auto size-8 text-[var(--lp-gold,#d6a84f)]" />
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              What you can build
            </h2>
            <p className="mt-3 text-slate-300">
              See the original tap card for the first chapter. Inside Studio, you&apos;re only
              limited by how creatively you use physical touchpoints — retail, hospitality, events,
              service businesses, product education, networking, reviews, and promotions.
            </p>
          </div>
          <div className="mt-10 space-y-10">
            {BLOCK_LIBRARY_GROUPS.map((group, gi) => (
              <div key={group.title}>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--lp-gold,#d6a84f)]">
                  {group.title}
                </p>
                <div
                  className={cn(
                    "grid gap-2",
                    gi === 0
                      ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4"
                      : "grid-cols-2 sm:grid-cols-3 md:grid-cols-5"
                  )}
                >
                  {group.items.map((b, i) => (
                    <div
                      key={b}
                      className={cn(
                        "lp-card-hover flex items-center gap-2 rounded-xl bg-white/[0.03] px-3 py-3 text-left text-xs font-medium text-slate-300",
                        gi === 1 && i % 5 === 2 && "md:translate-y-2",
                        gi === 1 && i % 5 === 3 && "md:translate-y-1"
                      )}
                    >
                      <span
                        className={cn(
                          "size-1.5 shrink-0 rounded-full",
                          i % 4 === 0 && "bg-[var(--lp-gold,#d6a84f)]",
                          i % 4 === 1 && "bg-blue-400",
                          i % 4 === 2 && "bg-[var(--lp-signal,#72ff8a)]",
                          i % 4 === 3 && "bg-violet-400"
                        )}
                      />
                      {b}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 11–13 · Capture / Email / Analytics / Brand */}
      <section className="border-y border-white/8 bg-[#07111f] py-20">
        <div className="mx-auto grid max-w-7xl gap-6 px-6 md:grid-cols-2 lg:px-8">
          {VALUE_BLOCKS.map((block) => {
            const Icon = block.Icon;
            return (
              <div key={block.title} className="lp-card-hover rounded-3xl bg-[#0f172a] p-6">
                <div
                  className={cn(
                    "mb-3 flex size-11 items-center justify-center rounded-xl",
                    block.tone
                  )}
                >
                  <Icon className="size-5" />
                </div>
                <h3 className="text-xl font-semibold">{block.title}</h3>
                <ul className="mt-4 space-y-2">
                  {block.items.map((item) => (
                    <li key={item} className="flex gap-2 text-sm text-slate-400">
                      <Check className="mt-0.5 size-3.5 shrink-0 text-[var(--lp-gold,#d6a84f)]" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* 14 · Use cases */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <h2 className="text-center text-3xl font-semibold tracking-tight sm:text-4xl">
            Built for the physical world
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-300">
            Cards, smart display tags, review signs, booth tags, table tents, window signs, package
            inserts, and more — same visual language across every industry story.
          </p>
          <UseCaseImageCards tiles={useCaseTiles} />
        </div>
      </section>

      {/* 15 · Pricing — compact */}
      <section id="pricing" className="border-y border-white/8 bg-[#07111f] py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <SectionEyebrow>Pricing</SectionEyebrow>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Plans that scale with every tap.
            </h2>
            <p className="mt-3 text-sm text-slate-400">
              Device packs and premium setup sold separately.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {PRICING_PREVIEW.map((tier) => (
              <div
                key={tier.name}
                className={cn(
                  "lp-price-card relative",
                  tier.recommended ? "lp-price-gold" : "lp-price-blue"
                )}
              >
                {tier.recommended ? (
                  <span className="absolute -top-2.5 left-4 rounded-full bg-[var(--lp-gold,#d6a84f)] px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#0b0f19]">
                    Best Value
                  </span>
                ) : null}
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-lg font-semibold">{tier.name}</h3>
                  <p className="flex items-end gap-0.5">
                    <span className="text-2xl font-semibold tracking-tight">{tier.price}</span>
                    <span className="pb-0.5 text-[11px] text-slate-400">/mo</span>
                  </p>
                </div>
                <p className="mt-1 text-xs text-slate-400">{tier.blurb}</p>
                <ul className="mt-3 space-y-1.5">
                  {tier.features.map((f) => (
                    <li key={f} className="flex gap-1.5 text-xs text-slate-300">
                      <Check className="mt-0.5 size-3.5 shrink-0 text-[var(--lp-gold,#d6a84f)]" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/sign-up"
                  className={cn(
                    buttonVariants({
                      variant: tier.recommended ? "default" : "outline",
                      size: "sm",
                    }),
                    "mt-4 w-full justify-center",
                    tier.recommended &&
                      "bg-[var(--lp-gold,#d6a84f)] text-[#0b0f19] hover:bg-[var(--lp-gold-bright,#f3c96b)]"
                  )}
                >
                  Get started
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <a
              href="#compare"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "border-[rgba(214,168,79,0.35)] px-8"
              )}
            >
              Compare all features
              <ArrowRight className="size-4" />
            </a>
          </div>
        </div>
      </section>

      {/* 16 · Comparison */}
      <section id="compare" className="py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <SectionEyebrow>Feature comparison</SectionEyebrow>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Depth that matches the platform behind the page.
            </h2>
            <p className="mt-4 text-slate-300">
              Basic → Studio → Pro → Growth → Enterprise. Pro is the best value for serious retail
              and active campaign management.
            </p>
          </div>
          <div className="mt-12">
            <FeatureComparisonChart />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-white/8 bg-[#07111f] py-20">
        <div className="mx-auto max-w-3xl px-6 lg:px-8">
          <h2 className="text-center text-3xl font-semibold">Questions before you tap in</h2>
          <div className="mt-10 space-y-4">
            {FAQS.map((f) => (
              <details
                key={f.q}
                className="lp-card-hover rounded-2xl bg-[#050814]/70 px-5 py-4"
              >
                <summary className="cursor-pointer font-medium">{f.q}</summary>
                <p className="mt-3 text-sm leading-6 text-slate-400">{f.a}</p>
              </details>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-slate-400">
            <MapPin className="mr-1 inline size-3.5" />
            Questions?{" "}
            <a
              className="text-[var(--lp-gold,#d6a84f)] hover:underline"
              href="mailto:info@tapthemagic.com"
            >
              info@tapthemagic.com
            </a>
          </p>
        </div>
      </section>

      {/* 17 · Final CTA */}
      <section className="py-20">
        <div className="mx-auto max-w-4xl px-6 text-center lg:px-8">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-5xl">
            Start Building Tap Experiences
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-300">
            Turn every physical touchpoint into a measurable customer journey with live campaigns,
            reusable Tap Devices, contact capture, and analytics.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/sign-up"
              className={cn(
                buttonVariants({ size: "lg" }),
                "bg-[var(--lp-gold,#d6a84f)] px-8 text-[#0b0f19] hover:bg-[var(--lp-gold-bright,#f3c96b)]"
              )}
            >
              Get Started
              <ArrowRight className="size-4" />
            </Link>
            <a href="#demo" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "px-8")}>
              Launch Demo
            </a>
            <a href="#compare" className={cn(buttonVariants({ variant: "ghost", size: "lg" }), "px-8")}>
              Compare Plans
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 py-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 lg:flex-row lg:items-start lg:justify-between lg:px-8">
          <div>
            <p className="font-semibold">TapConnect Studio</p>
            <p className="mt-1 text-sm text-slate-400">
              Tap-to-campaign platform · Powered by Tap The Magic
            </p>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-400">
            <Link href="/sign-in" className="hover:text-[var(--lp-gold,#d6a84f)]">
              Login
            </Link>
            <a href="#demo" className="hover:text-[var(--lp-gold,#d6a84f)]">
              Demo
            </a>
            <a href="#video" className="hover:text-[var(--lp-gold,#d6a84f)]">
              Video
            </a>
            <a href="#pricing" className="hover:text-[var(--lp-gold,#d6a84f)]">
              Pricing
            </a>
            <a href="#features" className="hover:text-[var(--lp-gold,#d6a84f)]">
              Features
            </a>
            <a href="mailto:info@tapthemagic.com" className="hover:text-[var(--lp-gold,#d6a84f)]">
              Contact
            </a>
            <a href="https://tapthemagic.com" className="hover:text-[var(--lp-gold,#d6a84f)]">
              Tap The Magic
            </a>
            <span className="text-slate-600">Terms</span>
            <span className="text-slate-600">Privacy</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
