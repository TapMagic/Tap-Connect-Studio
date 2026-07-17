/** Tap Connect Card demo — landscape YouTube embed with supporting copy */

const VIDEO_ID = "4vgWLYHdasY";

export function TapVideoSection() {
  return (
    <section id="video" className="border-y border-white/8 bg-[#07111f] py-16">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-12">
          <div className="lp-video-shell w-full">
            <div className="lp-video-frame lp-video-frame--landscape">
              <iframe
                src={`https://www.youtube.com/embed/${VIDEO_ID}?rel=0&modestbranding=1`}
                title="The Marketing Card That Turns Conversations Into Customers — Tap Connect Card"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
          </div>

          <div className="text-center lg:text-left">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--lp-gold,#d6a84f)]">
              Tap Connect Card
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Stop letting good conversations disappear.
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-300">
              The Tap Connect Card turns real-life conversations into reviews, bookings,
              followers, leads, and customers — with one simple tap.
            </p>
            <ul className="mt-6 space-y-3 text-left text-sm leading-6 text-slate-400">
              <li className="flex gap-3">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--lp-gold,#d6a84f)]" />
                Instantly share your offer, reviews, booking, socials, website, and contact info
              </li>
              <li className="flex gap-3">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--lp-gold,#d6a84f)]" />
                No app. No searching. No confusion — just tap and show up
              </li>
              <li className="flex gap-3">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--lp-gold,#d6a84f)]" />
                Give people a clear next step the moment they&apos;re already interested
              </li>
            </ul>
            <p className="mt-6 text-sm leading-6 text-slate-500">
              Your conversations are already happening. Tap Connect helps make them count.
              Powered by Tap The Magic.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
