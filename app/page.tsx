import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  Check,
  Mail,
  MapPin,
  MessageSquare,
  QrCode,
  Sparkles,
  Star,
  TabletSmartphone,
  Users,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { AuthLinks } from "@/components/auth/auth-controls";
import { HeroCtas } from "@/components/auth/hero-ctas";
import { TapConnectLogo } from "@/components/brand/tap-connect-logo";
import { LiveDemoPhone } from "@/components/marketing/live-demo-phone";
import { cn } from "@/lib/utils";
import "@/app/t/tap.css";

const trust = [
  "Works on iPhone & Android",
  "No app, ever",
  "Builder + email offers",
  "Ready to launch fast",
];

const problems = {
  without: [
    "Hand out a paper card",
    "“I’ll check you out”",
    "No follow-up",
    "No review",
    "No sale",
    "Forgotten forever",
  ],
  with: [
    "They tap / scan",
    "They see your live offer",
    "They leave a review",
    "They join your list",
    "They book or buy",
    "You own the lead",
  ],
};

const pillars = [
  {
    icon: Zap,
    title: "Offer front & center",
    body: "Coupons, seasonal deals, and CTAs update live — no reprinting tags.",
  },
  {
    icon: Star,
    title: "One-tap reviews",
    body: "Send them to Google while they’re still smiling. Reputation on autopilot.",
  },
  {
    icon: Mail,
    title: "Contact → email offer",
    body: "Capture the lead, then deliver the promo by email with your offer blocks.",
  },
  {
    icon: Calendar,
    title: "Schedules & end pages",
    body: "Run timed campaigns. When the sale ends, orphan tags still collect contacts.",
  },
  {
    icon: Users,
    title: "Groups & team reach",
    body: "Shared schedules across devices — front desk, trucks, tables, yard signs.",
  },
  {
    icon: MessageSquare,
    title: "Digital card / vCard",
    body: "Save contact, call, email, maps, and socials — wallet-ready branding.",
  },
];

const industries = [
  "Salons & barbers",
  "Home services",
  "Restaurants",
  "Real estate",
  "Retail",
  "Fitness",
  "Events & venues",
  "Medical & wellness",
];

const pricingTiers = [
  {
    name: "Basic",
    price: "$19",
    blurb: "Start turning taps into customers.",
    featured: false,
    features: ["1 active device", "3 campaigns", "QR codes", "Email capture", "Basic analytics"],
  },
  {
    name: "Studio",
    price: "$49",
    blurb: "Most popular for growing brands.",
    featured: true,
    features: [
      "10 devices",
      "Campaign Workbench",
      "Email offer builder",
      "Coupons & forms",
      "Brand kit + templates",
    ],
  },
  {
    name: "Pro",
    price: "$99",
    blurb: "Teams, scheduling, and scale.",
    featured: false,
    features: [
      "50 devices",
      "Groups & schedules",
      "Scan mode & roles",
      "Lead export",
      "Multi-location lite",
    ],
  },
  {
    name: "Growth",
    price: "$199",
    blurb: "Multi-location brands.",
    featured: false,
    features: [
      "150 devices",
      "Team users",
      "Advanced analytics",
      "Priority support",
      "Agency-ready workflows",
    ],
  },
];

const ecosystem = [
  {
    name: "Tap The Magic",
    href: "https://tapthemagic.com",
    desc: "Done-for-you NFC marketing cards that turn conversations into customers.",
  },
  {
    name: "Tap Stay Magic",
    href: "https://tapstaymagic.com",
    desc: "Guest hubs, messaging, reviews, and upsells for vacation rentals.",
  },
  {
    name: "Tap Pet Finder",
    href: "https://tapmagicpetfinder.com",
    desc: "Smart pet tags that help good people bring pets home faster.",
  },
];

const faqs = [
  {
    q: "Is this different from a plain digital business card?",
    a: "Yes. Tap Connect Studio is a campaign system — offers, capture, email follow-up, reviews, schedules, and analytics — not just contact sharing.",
  },
  {
    q: "Do visitors need an app?",
    a: "Never. They tap or scan and your mini-page opens in their browser instantly.",
  },
  {
    q: "Can I change the page after printing tags?",
    a: "Anytime. Campaigns update live. End pages keep orphan tags collecting leads when a promo closes.",
  },
  {
    q: "What happens when someone submits their email?",
    a: "You get the lead, and they can receive your branded offer email — built with the same blocks you use on the page.",
  },
];

export default function Home() {
  return (
    <main className="relative overflow-hidden bg-[#070b12] text-slate-50">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[42rem] bg-[radial-gradient(ellipse_at_top,rgba(163,230,53,0.16),transparent_42%),radial-gradient(circle_at_85%_12%,rgba(34,211,238,0.12),transparent_28%),linear-gradient(to_bottom,#0b1220,#070b12)]" />

      {/* Announcement */}
      <div className="border-b border-primary/20 bg-primary/10 px-4 py-2 text-center text-xs font-medium text-primary sm:text-sm">
        ✦ Studio plans from $19/mo · Turn every tap into an offer, a lead, and a follow-up email ✦
      </div>

      {/* Nav */}
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-8">
        <div className="flex items-center gap-3">
          <TapConnectLogo variant="mark" priority imgClassName="h-11 w-11 rounded-xl" />
          <div>
            <p className="text-sm font-semibold tracking-tight">Tap Connect Studio</p>
            <p className="text-[11px] text-slate-400">Powered by Tap The Magic</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="#demo"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "hidden sm:inline-flex")}
          >
            Live demo
          </a>
          <a
            href="#pricing"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "hidden md:inline-flex")}
          >
            Pricing
          </a>
          <AuthLinks />
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-7xl items-center gap-12 px-6 pb-20 pt-8 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:pb-28 lg:pt-12">
        <div className="space-y-7">
          <Badge className="rounded-full border-primary/30 bg-primary/10 text-primary hover:bg-primary/10">
            <Sparkles className="mr-1 size-3.5" />
            The marketing page behind every Magic Tap
          </Badge>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
            Every conversation should turn into a{" "}
            <span className="text-primary">customer</span>.
          </h1>
          <p className="max-w-xl text-lg leading-8 text-slate-300">
            Tap Connect Studio builds high-converting mini-pages for NFC and QR — offers, contact
            capture, digital cards, schedules, and follow-up emails. Same energy as Tap The Magic.
            Built for teams that want control.
          </p>
          <HeroCtas />
          <div className="flex flex-wrap gap-2">
            {trust.map((t) => (
              <span
                key={t}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300"
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        <div id="demo" className="relative">
          <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-[radial-gradient(circle,rgba(163,230,53,0.12),transparent_65%)]" />
          <p className="mb-2 text-center text-xs uppercase tracking-[0.2em] text-primary/80">
            Try the live demo
          </p>
          <LiveDemoPhone />
          <p className="mt-3 text-center text-xs text-slate-400">
            Switch Offer page / Digital card · no login required
          </p>
        </div>
      </section>

      {/* Problem */}
      <section className="border-y border-white/8 bg-[#0a101c] py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary/80">
            The problem
          </p>
          <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
            You&apos;re not losing customers because they&apos;re not interested.
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-slate-300">
            You&apos;re losing them because there&apos;s no clear next step. Tap Connect puts the offer,
            the form, and the follow-up in their hand — instantly.
          </p>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-red-400/20 bg-red-500/5 p-6">
              <h3 className="text-lg font-semibold text-red-200">Without Tap Connect</h3>
              <ul className="mt-4 space-y-3">
                {problems.without.map((item) => (
                  <li key={item} className="flex gap-2 text-sm text-slate-300">
                    <span className="text-red-300">×</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl border border-primary/30 bg-primary/5 p-6 shadow-[0_0_40px_rgba(163,230,53,0.08)]">
              <h3 className="text-lg font-semibold text-primary">With Tap Connect Studio</h3>
              <ul className="mt-4 space-y-3">
                {problems.with.map((item) => (
                  <li key={item} className="flex gap-2 text-sm text-slate-200">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="mt-8 text-center text-sm font-medium text-slate-400">
            This is not a business card. This is a decision machine.
          </p>
        </div>
      </section>

      {/* Features */}
      <section id="preview" className="py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="outline" className="mb-4 rounded-full border-white/15 bg-white/5">
              Platform
            </Badge>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Built like Tap The Magic. Tuned for operators.
            </h2>
            <p className="mt-4 text-lg text-slate-300">
              Campaign Workbench, email offers, digital cards, groups, schedules, and analytics —
              everything in this build, ready to sell the moment.
            </p>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {pillars.map((p) => {
              const Icon = p.icon;
              return (
                <div
                  key={p.title}
                  className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 transition hover:-translate-y-1 hover:border-primary/35 hover:shadow-[0_20px_50px_rgba(0,0,0,0.35)]"
                >
                  <div className="mb-4 flex size-11 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="text-lg font-semibold">{p.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{p.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Card + industries */}
      <section className="border-y border-white/8 bg-[#0a101c] py-20">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary/80">
              The experience
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Sleek. Powerful. Built to make an impression.
            </h2>
            <p className="mt-4 text-lg text-slate-300">
              Digital cards look like premium branded profiles — Call, Email, Web, Map, Save Contact
              — then feed leads into your campaign and email offer pipeline.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-slate-300">
              {[
                "Save to contacts with photo — opens Contacts on phone",
                "Brand kit colors, logo, fonts, socials",
                "Reveal offers after contact capture",
                "QR + NFC share the same live page",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <Check className="mt-0.5 size-4 text-primary" />
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href="#demo"
              className={cn(buttonVariants({ size: "lg" }), "mt-8 inline-flex px-6")}
            >
              Play digital card demo
              <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/8 to-transparent p-6 shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <TabletSmartphone className="size-5 text-primary" />
              Real tap destination · same renderer as production
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {industries.map((i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-white/10 bg-[#070b12]/80 px-3 py-3 text-sm text-slate-200"
                >
                  {i}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <h2 className="text-center text-3xl font-semibold tracking-tight sm:text-4xl">
            We build the page. You just tap.
          </h2>
          <div className="mt-12 grid gap-6 md:grid-cols-4">
            {[
              {
                n: "01",
                t: "Create your campaign",
                d: "Pick a template or build blocks — offer, form, buttons, card.",
              },
              {
                n: "02",
                t: "Design the email offer",
                d: "Orange Email Response builder sends the promo after capture.",
              },
              {
                n: "03",
                t: "Publish to devices",
                d: "NFC tags and QR codes share one live destination.",
              },
              {
                n: "04",
                t: "Measure & iterate",
                d: "Taps, leads, clicks — update without reprinting.",
              },
            ].map((s) => (
              <div key={s.n} className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                <p className="text-sm font-bold text-primary">{s.n}</p>
                <h3 className="mt-2 font-semibold">{s.t}</h3>
                <p className="mt-2 text-sm text-slate-400">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-y border-white/8 bg-[#0a101c] py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <Badge className="mb-4 rounded-full bg-primary text-primary-foreground hover:bg-primary">
              Most popular · Studio
            </Badge>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Plans that grow with every tap.
            </h2>
            <p className="mt-4 text-slate-300">
              Pricing placeholders you already use — refine cards anytime. Cancel anytime. No long
              contracts.
            </p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {pricingTiers.map((tier) => (
              <div
                key={tier.name}
                className={cn(
                  "relative flex flex-col rounded-3xl border bg-[#070b12]/80 p-6",
                  tier.featured
                    ? "border-primary/50 shadow-[0_0_0_1px_rgba(163,230,53,0.2),0_24px_60px_rgba(0,0,0,0.45)]"
                    : "border-white/10"
                )}
              >
                {tier.featured ? (
                  <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
                    Most popular
                  </span>
                ) : null}
                <h3 className="text-xl font-semibold">{tier.name}</h3>
                <p className="mt-1 text-sm text-slate-400">{tier.blurb}</p>
                <p className="mt-5 flex items-end gap-1">
                  <span className="text-4xl font-semibold tracking-tight">{tier.price}</span>
                  <span className="pb-1 text-sm text-slate-400">/mo</span>
                </p>
                <ul className="mt-6 flex-1 space-y-3">
                  {tier.features.map((f) => (
                    <li key={f} className="flex gap-2 text-sm text-slate-300">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/onboarding"
                  className={cn(
                    buttonVariants({
                      variant: tier.featured ? "default" : "outline",
                      size: "lg",
                    }),
                    "mt-8 w-full justify-center"
                  )}
                >
                  Get started
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ecosystem */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <p className="text-center text-sm font-semibold uppercase tracking-[0.18em] text-primary/80">
            Also from Tap The Magic
          </p>
          <h2 className="mt-3 text-center text-3xl font-semibold">One ecosystem. More ways to tap.</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {ecosystem.map((e) => (
              <a
                key={e.name}
                href={e.href}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-primary/40 hover:bg-primary/5"
              >
                <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <QrCode className="size-5" />
                </div>
                <h3 className="font-semibold">{e.name}</h3>
                <p className="mt-2 text-sm text-slate-400">{e.desc}</p>
                <p className="mt-4 text-sm font-medium text-primary">Explore →</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-white/8 bg-[#0a101c] py-20">
        <div className="mx-auto max-w-3xl px-6 lg:px-8">
          <h2 className="text-center text-3xl font-semibold">Questions before you tap in</h2>
          <div className="mt-10 space-y-4">
            {faqs.map((f) => (
              <details
                key={f.q}
                className="rounded-2xl border border-white/10 bg-[#070b12]/70 px-5 py-4 open:border-primary/30"
              >
                <summary className="cursor-pointer font-medium">{f.q}</summary>
                <p className="mt-3 text-sm leading-6 text-slate-400">{f.a}</p>
              </details>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-slate-400">
            <MapPin className="mr-1 inline size-3.5" />
            Questions?{" "}
            <a className="text-primary hover:underline" href="mailto:info@tapthemagic.com">
              info@tapthemagic.com
            </a>
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20">
        <div className="mx-auto max-w-4xl px-6 text-center lg:px-8">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-5xl">
            Don&apos;t let another opportunity walk out the door.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-300">
            You already have their attention. Tap Connect Studio makes sure the moment turns into
            income — offer, lead, review, and email follow-up included.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/sign-up" className={cn(buttonVariants({ size: "lg" }), "px-8")}>
              Start turning conversations into customers
              <ArrowRight className="size-4" />
            </Link>
            <a href="#demo" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "px-8")}>
              See live demo again
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 py-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p className="font-semibold">Tap Connect Studio</p>
            <p className="mt-1 text-sm text-slate-400">
              NFC & QR campaign platform · Powered by Tap The Magic
            </p>
          </div>
          <div className="flex flex-wrap gap-5 text-sm text-slate-400">
            <a href="#demo" className="hover:text-primary">
              Demo
            </a>
            <a href="#pricing" className="hover:text-primary">
              Pricing
            </a>
            <a href="https://tapthemagic.com" className="hover:text-primary">
              Tap The Magic
            </a>
            <a href="https://tapstaymagic.com" className="hover:text-primary">
              Tap Stay
            </a>
            <a href="https://tapmagicpetfinder.com" className="hover:text-primary">
              Pet Finder
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
