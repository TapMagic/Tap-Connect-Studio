import Image from "next/image";
import { USE_CASES } from "@/lib/marketing/landing-content";

export function UseCaseImageCards() {
  return (
    <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {USE_CASES.map((u) => (
        <article
          key={u.industry}
          className="lp-card-hover lp-usecase-stair group flex min-h-[168px] overflow-hidden rounded-3xl bg-[#0f172a]/95"
        >
          <div className="flex min-w-0 flex-1 flex-col justify-center p-4 sm:p-5">
            <h3 className="font-semibold text-[var(--lp-gold-bright,#f3c96b)]">{u.industry}</h3>
            <dl className="mt-3 space-y-2 text-xs text-slate-400">
              <div>
                <dt className="inline font-semibold text-slate-300">Tap: </dt>
                <dd className="inline">{u.tap}</dd>
              </div>
              <div>
                <dt className="inline font-semibold text-slate-300">Opens: </dt>
                <dd className="inline">{u.opens}</dd>
              </div>
              <div>
                <dt className="inline font-semibold text-slate-300">Action: </dt>
                <dd className="inline">{u.action}</dd>
              </div>
              <div>
                <dt className="inline font-semibold text-slate-300">Captures: </dt>
                <dd className="inline">{u.captures}</dd>
              </div>
            </dl>
          </div>
          <div className="relative w-[34%] shrink-0 min-[420px]:w-[38%]">
            <Image
              src={u.image}
              alt={u.imageAlt}
              fill
              className="object-cover transition duration-500 group-hover:scale-[1.03]"
              sizes="(max-width: 640px) 34vw, 220px"
            />
            <div className="absolute inset-0 bg-gradient-to-l from-transparent to-[#0f172a]/55" />
          </div>
        </article>
      ))}
    </div>
  );
}
