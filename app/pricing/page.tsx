import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { TapConnectLogo } from "@/components/brand/tap-connect-logo";
import { PoweredByTapTheMagic } from "@/components/brand/powered-by";
import { PLANS } from "@/lib/plans";

export const metadata: Metadata = {
  title: "TapConnect pricing",
  description:
    "Current TapConnect plan names, monthly prices, and enforced active Tap Point and Campaign limits.",
};

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[oklch(0.105_0.018_255)] px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/15 pb-6">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--studio-go)]"
          >
            <TapConnectLogo variant="mark" priority imgClassName="h-10 w-10" />
            <span className="font-semibold">TapConnect</span>
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm text-white/75 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--studio-go)]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to product
          </Link>
        </header>

        <section className="py-16 sm:py-24" aria-labelledby="pricing-heading">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--studio-go)]">
            Current application plan catalog
          </p>
          <h1
            id="pricing-heading"
            className="mt-4 max-w-4xl text-5xl font-semibold tracking-[-0.055em] sm:text-7xl"
          >
            The living Card first. Studio capacity as you grow.
          </h1>
          <p className="mt-6 max-w-3xl text-base leading-7 text-white/70">
            These plan names, monthly prices, and active Tap Point and Campaign limits come from
            TapConnect&apos;s enforced plan source. Specific Studio capabilities can also depend on
            plan, role, configuration, provider readiness, and release status.
          </p>
        </section>

        <section aria-label="TapConnect plans" className="grid border-y border-white/15 md:grid-cols-2 xl:grid-cols-4">
          {PLANS.map((plan) => (
            <article
              key={plan.tier}
              className="border-white/15 px-5 py-8 max-md:border-b md:nth-[2n]:border-l xl:border-l xl:first:border-l-0"
              data-testid={`pricing-plan-${plan.tier.toLowerCase()}`}
            >
              <h2 className="text-sm font-bold uppercase tracking-[0.12em]">{plan.name}</h2>
              <p className="mt-5 flex items-baseline gap-2">
                <span className="text-5xl font-semibold tracking-[-0.05em]">${plan.priceMonthly}</span>
                <span className="text-xs text-white/60">per month</span>
              </p>
              <p className="mt-5 min-h-16 text-sm leading-6 text-white/65">{plan.description}</p>
              <ul className="mt-6 space-y-3 border-t border-white/15 pt-5 text-sm text-white/80">
                <li className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 text-[var(--studio-go)]" aria-hidden />
                  {plan.activeDeviceLimit} active Tap {plan.activeDeviceLimit === 1 ? "Point" : "Points"}
                </li>
                <li className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 text-[var(--studio-go)]" aria-hidden />
                  {plan.activeCampaignLimit} active{" "}
                  {plan.activeCampaignLimit === 1 ? "Campaign" : "Campaigns"}
                </li>
              </ul>
            </article>
          ))}
        </section>

        <section className="grid gap-8 py-14 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <h2 className="text-2xl font-semibold">What this comparison does not imply</h2>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-white/65">
              No free trial, annual discount, hardware inclusion, Email volume, Campaign sending
              volume, or guarantee is represented here. Live checkout and subscription activation
              are not enabled by this page. See the product experience for qualified capability
              details.
            </p>
          </div>
          <Link
            href="/sign-up"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[var(--studio-go)] px-5 text-sm font-bold text-[var(--studio-go-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            Create my first Card
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </section>

        <footer className="border-t border-white/15 py-10">
          <PoweredByTapTheMagic />
          <p className="mt-5 text-xs text-white/55">
            TapConnect is the Card. TapConnect Studio capabilities surround it and vary by plan.
          </p>
        </footer>
      </div>
    </main>
  );
}
