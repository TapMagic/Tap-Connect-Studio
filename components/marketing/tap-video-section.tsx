/** YouTube Short — original tap interaction (Daniel’s early card version) */

const SHORT_ID = "QgcTZmgA0sk";

export function TapVideoSection() {
  return (
    <section id="video" className="border-y border-white/8 bg-[#07111f] py-20">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--lp-gold,#d6a84f)]">
            See the tap in action
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Watch the Tap Experience
          </h2>
          <p className="mt-4 max-w-xl text-lg leading-8 text-slate-300">
            This short shows the original tap interaction in action. Studio takes that same instant
            connection and expands it into campaigns, contact capture, scheduling, automation, and
            analytics.
          </p>
          <p className="mt-4 text-sm text-slate-500">
            The first chapter was the card. Inside Studio, you control the full journey behind every
            Tap Device.
          </p>
          <a
            href={`https://youtube.com/shorts/${SHORT_ID}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex text-sm font-medium text-[var(--lp-gold,#d6a84f)] hover:underline"
          >
            Open on YouTube →
          </a>
        </div>
        <div className="lp-video-frame">
          <iframe
            src={`https://www.youtube.com/embed/${SHORT_ID}?rel=0`}
            title="TapConnect tap experience"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
          />
        </div>
      </div>
    </section>
  );
}
