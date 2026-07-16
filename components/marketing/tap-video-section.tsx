/** YouTube Short embedded beside copy — compact two-column layout */

const SHORT_ID = "QgcTZmgA0sk";

export function TapVideoSection() {
  return (
    <section id="video" className="border-y border-white/8 bg-[#07111f] py-16">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)] lg:gap-14">
          <div className="lp-video-shell mx-auto w-full max-w-[280px] lg:mx-0">
            <div className="lp-video-frame">
              <iframe
                src={`https://www.youtube.com/embed/${SHORT_ID}?rel=0&modestbranding=1`}
                title="TapConnect tap experience — original card interaction"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
          </div>

          <div className="text-center lg:text-left">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--lp-gold,#d6a84f)]">
              See the tap in action
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Watch the Tap Experience
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-300">
              This short shows the original tap interaction in action. Studio takes that same
              instant connection and expands it into campaigns, contact capture, scheduling,
              automation, and analytics.
            </p>
            <ul className="mt-6 space-y-3 text-left text-sm leading-6 text-slate-400">
              <li className="flex gap-3">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--lp-gold,#d6a84f)]" />
                Physical tap opens a branded experience on the visitor&apos;s phone
              </li>
              <li className="flex gap-3">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--lp-gold,#d6a84f)]" />
                Same mechanic powers campaigns, offers, reviews, and contact capture
              </li>
              <li className="flex gap-3">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--lp-gold,#d6a84f)]" />
                Update what the tap opens anytime — without replacing the device
              </li>
            </ul>
            <p className="mt-6 text-sm leading-6 text-slate-500">
              Captioned: earlier Tap Card version demonstrating the physical tap. The mechanic is
              the same — Studio builds the full journey behind it.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
