"use client";

import Image from "next/image";
import Link from "next/link";
import { Show } from "@clerk/nextjs";
import {
  ArrowRight,
  Check,
  ChevronDown,
  ExternalLink,
  Mail,
  MapPin,
  Menu,
  Phone,
  Star,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { TapConnectLogo } from "@/components/brand/tap-connect-logo";
import { PoweredByTapTheMagic } from "@/components/brand/powered-by";
import { TapConnectIcon } from "@/components/fusion/icons/tapconnect-icons";
import { PLANS } from "@/lib/plans";
import { isClerkClientConfigured } from "@/lib/utils/clerk-client";
import type { TapConnectIconId } from "@/lib/fusion/icons/registry";
import "./public-experience-landing.css";

const NAV_ITEMS: Array<{
  href: string;
  label: string;
  shortLabel: string;
  icon: TapConnectIconId;
}> = [
  { href: "#how-it-works", label: "How it works", shortLabel: "How", icon: "card" },
  { href: "#solutions", label: "Uses", shortLabel: "Uses", icon: "audience" },
  { href: "#pricing", label: "Pricing", shortLabel: "Pricing", icon: "insights" },
];

const CARD_ACTIONS = [
  { label: "Call", icon: Phone },
  { label: "Email", icon: Mail },
  { label: "Directions", icon: MapPin },
  { label: "Reviews", icon: Star },
];

const JOURNEY = [
  {
    number: "01",
    title: "Tell us about your business",
    body: "Share the essentials and, if you choose, a website. TapConnect organizes what it finds as suggestions.",
    note: "Nothing discovered is silently approved.",
    icon: "home" as const,
  },
  {
    number: "02",
    title: "We found your Brand",
    body: "Review proposed business facts, logo candidates, colors, and the foundation that will shape your Card.",
    note: "You approve the facts and Brand assets.",
    icon: "brand" as const,
  },
  {
    number: "03",
    title: "Here is your first Card",
    body: "Start with a useful living Card draft, then Preview and refine it before anything becomes public.",
    note: "Preview does not publish.",
    icon: "card" as const,
  },
];

const USE_CASES = [
  {
    title: "Local services",
    action: "Call, directions, or a common answer",
    retention: "Keep the Card for the next service need",
  },
  {
    title: "Restaurants & hospitality",
    action: "Current details, directions, or an approved offer",
    retention: "Return to the same Card when information changes",
  },
  {
    title: "Beauty & wellness",
    action: "Contact, review, or configured booking link",
    retention: "Keep a direct path back to the business",
  },
  {
    title: "Professional services",
    action: "Save Contact, website, Email, or support question",
    retention: "Continue from a consent-aware relationship",
  },
];

const FAQS = [
  {
    question: "Is TapConnect just a digital business card?",
    answer:
      "No. TapConnect is a living Card: a durable customer destination that can carry approved business information, configured actions, TapSave, and timely experiences. TapConnect Studio is the wider operating system around that Card.",
  },
  {
    question: "Do I need design experience?",
    answer:
      "No. Card-first onboarding prepares a useful first draft from confirmed Business Knowledge and approved Brand decisions. You can refine it with guided Brand and creative tools instead of starting from a blank canvas.",
  },
  {
    question: "Does TapConnect publish automatically?",
    answer:
      "No. Discovery, approval, draft, Preview, and public state are separate. Preview does not publish, and setup does not send Email or Campaigns.",
  },
  {
    question: "Can I edit my Card later?",
    answer:
      "Yes. The Owner Card workspace supports ongoing draft editing and Preview. The public Card remains separate from unfinished draft work.",
  },
  {
    question: "What happens after someone taps?",
    answer:
      "They reach the current public Card and can use the actions you configured—such as Save Contact, phone, Email, website, directions, reviews, an approved offer, or a support question.",
  },
  {
    question: "What is TapSave?",
    answer:
      "TapSave creates a return path so a customer can keep the business easy to find after the first tap. It does not grant permission for spam or uncontrolled messaging.",
  },
  {
    question: "What does Autopilot do?",
    answer:
      "Autopilot helps organize knowledge, identify gaps or contradictions, prepare recommendations and safe drafts, and surface readiness issues. The Owner keeps approval and activation control.",
  },
  {
    question: "Is a Tap Point required during setup?",
    answer:
      "No. You can prepare and Preview the Card before assigning a physical or digital Tap Point.",
  },
  {
    question: "Can Brand and creative assets be reused?",
    answer:
      "Yes. Approved assets and creative resources can support Card, Email, and Campaign work. Some advanced creative and provider-backed tools remain verification- or setup-dependent.",
  },
  {
    question: "Are Email and Campaigns sent automatically?",
    answer:
      "No. Authoring does not equal sending, and setup does not contact customers. Sending requires the appropriate plan, consent, provider configuration, permissions, and an explicit action.",
  },
  {
    question: "Which features are included in each plan?",
    answer:
      "Plan names, current monthly prices, and enforced Tap Point and Campaign limits appear below and on the Pricing page. Studio capabilities vary by plan and can also depend on role, configuration, and provider readiness.",
  },
];

function AcquisitionLink({
  className,
  testId,
  children = (
    <>
      Create my first Card
      <ArrowRight aria-hidden />
    </>
  ),
}: {
  className: string;
  testId: string;
  children?: ReactNode;
}) {
  const clerkConfigured = isClerkClientConfigured();

  if (!clerkConfigured) {
    return (
      <Link
        href="/auth/continue"
        className={className}
        data-testid={testId}
        data-route-contract="development-continuation"
      >
        {children}
      </Link>
    );
  }

  return (
    <>
      <Show when="signed-out">
        <Link
          href="/sign-up"
          className={className}
          data-testid={testId}
          data-route-contract="signed-out-account-creation"
        >
          {children}
        </Link>
      </Show>
      <Show when="signed-in">
        <Link
          href="/auth/continue"
          className={className}
          data-testid={testId}
          data-route-contract="signed-in-continuation"
        >
          {children}
        </Link>
      </Show>
    </>
  );
}

function LivingCardVisual() {
  return (
    <div className="public-hero-visual" data-testid="living-card-visual">
      <div className="public-tap-origin" aria-hidden>
        <span className="public-tap-origin__dot" />
        <span className="public-tap-origin__ring public-tap-origin__ring--one" />
        <span className="public-tap-origin__ring public-tap-origin__ring--two" />
        <span className="public-tap-origin__label">tap</span>
      </div>
      <div className="public-signal-line" aria-hidden />

      <article className="public-living-card" aria-label="Example TapConnect living Card">
        <div className="public-living-card__brand">
          <span className="public-living-card__mark">TC</span>
          <span>Northstar Studio</span>
          <span className="public-live-state">Card draft</span>
        </div>
        <div className="public-living-card__portrait" aria-hidden>
          <span />
        </div>
        <p className="public-living-card__eyebrow">Your business, ready to tap</p>
        <h2>Useful in the moment. Easy to keep.</h2>
        <p>
          One living destination for the details and next steps your customer needs.
        </p>
        <ul className="public-card-actions" aria-label="Example configured Card actions">
          {CARD_ACTIONS.map(({ label, icon: Icon }) => (
            <li key={label}>
              <Icon aria-hidden />
              <span>{label}</span>
            </li>
          ))}
        </ul>
        <div className="public-card-save">
          <TapConnectIcon id="tapsave" decorative />
          <span>
            <strong>Keep this Card</strong>
            <small>Return when you need it</small>
          </span>
          <ArrowRight aria-hidden />
        </div>
      </article>

      <div className="public-outcome public-outcome--action" aria-hidden>
        <TapConnectIcon id="campaigns" decorative />
        <span>useful action</span>
      </div>
      <div className="public-outcome public-outcome--relationship" aria-hidden>
        <TapConnectIcon id="relationships" decorative />
        <span>retained relationship</span>
      </div>
    </div>
  );
}

function PublicHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const clerkConfigured = isClerkClientConfigured();

  return (
    <header className="public-header" data-testid="public-header">
      <div className="public-header__inner">
        <Link href="/" className="public-brand-zone" aria-label="TapConnect home">
          <TapConnectLogo variant="mark" priority imgClassName="public-brand-zone__logo" />
          <span>
            <strong>TapConnect</strong>
            <small>Powered by Tap The Magic</small>
          </span>
        </Link>

        <nav className="public-desktop-nav" aria-label="Primary navigation">
          {NAV_ITEMS.map((item) => (
            <a key={item.href} href={item.href} className="public-icon-link">
              <TapConnectIcon id={item.icon} decorative />
              <span>{item.label}</span>
            </a>
          ))}
          <Link href="/sign-in" className="public-sign-in">
            Sign in
          </Link>
          <AcquisitionLink className="public-nav-cta" testId="nav-primary-cta">
            <>
              <span className="public-nav-cta__wide">Create my first Card</span>
              <span className="public-nav-cta__compact">Create Card</span>
            </>
          </AcquisitionLink>
        </nav>

        <button
          type="button"
          className="public-menu-button"
          aria-expanded={menuOpen}
          aria-controls="public-mobile-menu"
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X aria-hidden /> : <Menu aria-hidden />}
        </button>
      </div>

      <nav
        id="public-mobile-menu"
        className="public-mobile-nav"
        data-open={menuOpen}
        aria-label="Mobile navigation"
      >
        {NAV_ITEMS.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="public-icon-link"
            onClick={() => setMenuOpen(false)}
          >
            <TapConnectIcon id={item.icon} decorative />
            <span>{item.label}</span>
          </a>
        ))}
        <Link href="/sign-in" className="public-sign-in" onClick={() => setMenuOpen(false)}>
          Sign in
        </Link>
        <AcquisitionLink className="public-nav-cta" testId="mobile-nav-primary-cta" />
        {!clerkConfigured ? (
          <p className="public-dev-note">Local development continues through the onboarding router.</p>
        ) : null}
      </nav>
    </header>
  );
}

export function PublicExperienceLanding() {
  return (
    <div className="public-experience" data-testid="card-centered-landing">
      <a href="#main" className="public-skip-link">
        Skip to content
      </a>
      <PublicHeader />

      <main id="main" tabIndex={-1}>
        <section className="public-hero" aria-labelledby="hero-heading" data-testid="landing-hero">
          <div className="public-hero__copy">
            <p className="public-kicker">TapConnect is the living Card</p>
            <h1 id="hero-heading">Your business, ready to tap.</h1>
            <p className="public-hero__lead">
              TapConnect learns about your business, prepares your Brand, and creates your first
              living Card—so every tap can become a useful customer relationship.
            </p>
            <p className="public-hero__next">
              Start by telling us about your business. You will review what we find, approve the
              Brand foundation, and Preview a useful Card draft before anything is public.
            </p>
            <div className="public-hero__actions">
              <AcquisitionLink className="public-primary-cta" testId="landing-primary-cta" />
              <a href="#how-it-works" className="public-secondary-cta" data-testid="landing-secondary-cta">
                See how it works
                <ChevronDown aria-hidden />
              </a>
            </div>
            <p className="public-plan-note">
              TapConnect Studio capabilities surround the same Card and vary by plan.
            </p>
          </div>
          <LivingCardVisual />
        </section>

        <section
          id="how-it-works"
          className="public-journey public-section"
          aria-labelledby="journey-heading"
          data-testid="onboarding-journey"
        >
          <div className="public-section-heading">
            <p className="public-kicker">Your first Card, without the blank canvas</p>
            <h2 id="journey-heading">
              Tell us about your business <span aria-hidden>→</span> we found your Brand{" "}
              <span aria-hidden>→</span> here is your first Card
            </h2>
          </div>
          <ol className="public-journey__steps">
            {JOURNEY.map((step) => (
              <li key={step.number}>
                <div className="public-journey__number">{step.number}</div>
                <TapConnectIcon id={step.icon} decorative />
                <h3>{step.title}</h3>
                <p>{step.body}</p>
                <small>
                  <Check aria-hidden />
                  {step.note}
                </small>
              </li>
            ))}
          </ol>
        </section>

        <section className="public-card-story public-section" aria-labelledby="card-story-heading">
          <div className="public-card-story__visual">
            <Image
              src="/marketing/product/public-card.webp"
              alt="Scrubbed demonstration of the actual public TapConnect Card"
              width={1200}
              height={750}
              sizes="(max-width: 900px) 100vw, 52vw"
            />
            <p>Actual public Card renderer · scrubbed demonstration business</p>
          </div>
          <div className="public-card-story__copy">
            <p className="public-kicker">A destination, not a disposable link</p>
            <h2 id="card-story-heading">The Card stays useful as the business changes.</h2>
            <p>
              The public Card can bring together the approved details and configured actions a
              customer needs now—while the Owner keeps drafts and unfinished changes separate.
            </p>
            <ul className="public-action-list">
              {[
                "Save Contact",
                "Phone and Email",
                "Website and directions",
                "Google review link",
                "Approved offer or Spotlight",
                "Support question",
                "TapSave return path",
              ].map((item) => (
                <li key={item}>
                  <Check aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
            <p className="public-qualification">
              Actions appear when the Owner configures them. Availability can vary by plan and
              setup.
            </p>
          </div>
        </section>

        <section className="public-tapsave" aria-labelledby="tapsave-heading" data-testid="tapsave-section">
          <div className="public-tapsave__trail" aria-hidden>
            <span>first tap</span>
            <i />
            <span>kept Card</span>
            <i />
            <span>useful return</span>
          </div>
          <div className="public-tapsave__content public-section">
            <div>
              <TapConnectIcon id="tapsave" decorative />
              <p className="public-kicker">TapSave</p>
              <h2 id="tapsave-heading">The relationship does not have to end with the tap.</h2>
            </div>
            <div>
              <p>
                TapSave helps a customer keep the business in their pocket and return to the same
                living Card later. The business can keep approved information and experiences
                useful without forcing an app download.
              </p>
              <p className="public-qualification">
                TapSave is not permission for spam, surveillance, or automatic Campaign sending.
                Consent and explicit Owner controls remain part of the relationship.
              </p>
            </div>
          </div>
        </section>

        <section className="public-autopilot public-section" aria-labelledby="autopilot-heading" data-testid="autopilot-section">
          <div className="public-autopilot__copy">
            <p className="public-kicker">Operational assistance, with the Owner in control</p>
            <h2 id="autopilot-heading">Autopilot turns unfinished information into clearer next steps.</h2>
            <p>
              Autopilot can organize Business Knowledge, flag gaps or contradictions, prepare a
              Brand foundation, recommend a first Card, create safe drafts, and identify readiness
              problems.
            </p>
            <p className="public-qualification">
              It does not invent approved facts, silently replace decisions, publish, send, or
              spend on its own.
            </p>
          </div>
          <div className="public-autopilot__sequence" aria-label="Autopilot assistance sequence">
            {[
              ["knowledge", "Organize confirmed knowledge"],
              ["readiness", "Surface what needs attention"],
              ["draft", "Prepare a safe draft"],
              ["approval", "Wait for the permitted decision"],
            ].map(([id, label], index) => (
              <div key={id}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <p>{label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="public-creative" aria-labelledby="creative-heading" data-testid="creative-platform-section">
          <div className="public-section public-creative__inner">
            <div className="public-creative__copy">
              <p className="public-kicker">Professional creative, serving the Card</p>
              <h2 id="creative-heading">Create once. Stay on Brand. Reuse the work.</h2>
              <p>
                Approved Brand and creative resources can support the Card and extend into Email
                and Campaign authoring. TapConnect is not a generic design tool—the creative
                platform exists to keep the customer journey coherent.
              </p>
              <ul className="public-creative__features">
                {[
                  "Shared Media and Asset Browser",
                  "Pexels and Logo.dev provider paths",
                  "Gradients, image and textured backgrounds",
                  "Masks, frames, image treatment, and shapes",
                  "Typography, layers, and precision controls",
                  "Reusable creative resources",
                ].map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="public-qualification">
                Visible Owner workflows are implemented; advanced tools and live providers remain
                verification- or configuration-dependent.
              </p>
            </div>
            <figure className="public-creative__visual">
              <Image
                src="/marketing/product/campaign-workbench.webp"
                alt="Scrubbed TapConnect Campaign Workbench demonstrating reusable creative around the Card"
                width={1400}
                height={900}
                sizes="(max-width: 900px) 100vw, 52vw"
                loading="lazy"
              />
              <figcaption>Actual Campaign Workbench · scrubbed demonstration business</figcaption>
            </figure>
          </div>
        </section>

        <section
          id="solutions"
          className="public-solutions public-section"
          aria-labelledby="solutions-heading"
          data-testid="use-cases-section"
        >
          <div className="public-section-heading public-section-heading--split">
            <div>
              <p className="public-kicker">Focused uses</p>
              <h2 id="solutions-heading">One Card. Different useful moments.</h2>
            </div>
            <p>
              Each path starts with a tap, gives the customer a practical next step, and can leave
              a manageable return path.
            </p>
          </div>
          <div className="public-use-case-list">
            {USE_CASES.map((useCase, index) => (
              <article key={useCase.title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{useCase.title}</h3>
                <p>
                  <strong>Useful action:</strong> {useCase.action}
                </p>
                <p>
                  <strong>Afterward:</strong> {useCase.retention}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="public-trust" aria-labelledby="trust-heading" data-testid="trust-section">
          <div className="public-section public-trust__inner">
            <div>
              <TapConnectIcon id="trust_fabric" decorative />
              <p className="public-kicker">Owner control is part of the product</p>
              <h2 id="trust-heading">Suggested is not approved. Preview is not public.</h2>
            </div>
            <ul>
              {[
                "Discovered facts remain suggestions until confirmed.",
                "Imported Brand assets require Owner approval.",
                "Provider source, rights, and usage context remain visible where captured.",
                "Permitted roles control approvals and locks.",
                "Draft editing remains separate from the public Card.",
                "Setup does not send Email, Campaigns, or customer communication.",
              ].map((item) => (
                <li key={item}>
                  <Check aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section
          id="pricing"
          className="public-pricing public-section"
          aria-labelledby="pricing-heading"
          data-testid="pricing-section"
        >
          <div className="public-section-heading public-section-heading--split">
            <div>
              <p className="public-kicker">Current plan source</p>
              <h2 id="pricing-heading">Start with the Card. Add the Studio capacity you need.</h2>
            </div>
            <p>
              Current monthly prices and enforced active Tap Point and Campaign limits come from
              the application plan catalog. Capability availability still varies by tier,
              permission, and configuration.
            </p>
          </div>
          <div className="public-plan-grid">
            {PLANS.map((plan) => (
              <article key={plan.tier} data-testid={`public-plan-${plan.tier.toLowerCase()}`}>
                <p className="public-plan-grid__name">{plan.name}</p>
                <p className="public-plan-grid__price">
                  <span>${plan.priceMonthly}</span>
                  <small>/ month</small>
                </p>
                <p>{plan.description}</p>
                <dl>
                  <div>
                    <dt>Active Tap Points</dt>
                    <dd>{plan.activeDeviceLimit}</dd>
                  </div>
                  <div>
                    <dt>Active Campaigns</dt>
                    <dd>{plan.activeCampaignLimit}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
          <div className="public-pricing__footer">
            <p>
              Billing activation and live checkout are not enabled by this page. No trial, annual
              discount, hardware inclusion, or sending volume is implied.
            </p>
            <Link href="/pricing">
              View pricing details
              <ArrowRight aria-hidden />
            </Link>
          </div>
        </section>

        <section className="public-faq public-section" aria-labelledby="faq-heading" data-testid="faq-section">
          <div className="public-faq__heading">
            <p className="public-kicker">Questions before the first Card</p>
            <h2 id="faq-heading">Clear answers, before you start.</h2>
          </div>
          <div className="public-faq__items">
            {FAQS.map((faq) => (
              <details key={faq.question}>
                <summary>{faq.question}</summary>
                <p>{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="public-final-cta" aria-labelledby="final-cta-heading" data-testid="final-cta">
          <div className="public-final-cta__signal" aria-hidden />
          <div>
            <TapConnectIcon id="card" decorative />
            <p className="public-kicker">Your first living Card</p>
            <h2 id="final-cta-heading">
              Tell us about your business. We’ll help prepare the Brand and create your first Card.
            </h2>
            <p>
              After you click, signed-out visitors create an account. Returning Owners resume
              onboarding or continue to the correct Studio destination.
            </p>
            <AcquisitionLink className="public-primary-cta" testId="final-primary-cta" />
          </div>
        </section>
      </main>

      <footer className="public-footer" data-testid="landing-footer">
        <div className="public-footer__inner">
          <PoweredByTapTheMagic />
          <nav aria-label="Footer navigation">
            <a href="#how-it-works">How it works</a>
            <a href="#solutions">Uses</a>
            <Link href="/pricing">Pricing</Link>
            <Link href="/sign-in">Sign in</Link>
            <span>Privacy (not published)</span>
            <span>Terms (not published)</span>
            <a href="mailto:info@tapthemagic.com">Contact</a>
            <a href="https://tapthemagic.com" rel="noopener noreferrer">
              Tap The Magic
              <ExternalLink aria-hidden />
            </a>
          </nav>
          <p>
            TapConnect is the Card. TapConnect Studio is the operating system and capabilities
            surrounding it. Capability availability varies by plan.
          </p>
        </div>
      </footer>
    </div>
  );
}

