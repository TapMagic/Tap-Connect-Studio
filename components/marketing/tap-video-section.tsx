/** YouTube Short embedded on-page — original tap interaction */

const SHORT_ID = "QgcTZmgA0sk";

export function TapVideoSection() {
  return (
    <section id="video" className="border-y border-white/8 bg-[#07111f] py-20">
      <div className="mx-auto max-w-5xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--lp-gold,#d6a84f)]">
            See the tap in action
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Watch the Tap Experience
          </h2>
          <p className="mt-4 text-lg leading-8 text-slate-300">
            This short shows the original tap interaction in action. Studio takes that same instant
            connection and expands it into campaigns, contact capture, scheduling, automation, and
            analytics.
          </p>
        </div>

        <div className="lp-video-shell mx-auto mt-10 max-w-md">
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
          <p className="mt-4 text-center text-sm leading-6 text-slate-400">
            Captioned: earlier Tap Card version demonstrating the physical tap. The mechanic is the
            same — Studio builds the full journey behind it.
          </p>
        </div>
      </div>
    </section>
  );
}
