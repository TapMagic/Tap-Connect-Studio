import type { LandingUseCaseTile } from "@/lib/marketing/use-case-types";

export function UseCaseImageCards({ tiles }: { tiles: LandingUseCaseTile[] }) {
  return (
    <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {tiles.map((u) => {
        const panel = Math.min(55, Math.max(20, u.imagePanelPercent ?? 38));
        const fit = u.imageFit === "contain" ? "contain" : "cover";
        const scale = Math.min(3, Math.max(0.5, u.imageScale ?? 1));
        const posX = u.imagePositionX ?? 50;
        const posY = u.imagePositionY ?? 50;

        return (
          <article
            key={u.id}
            className="lp-card-hover lp-usecase-stair group flex min-h-[168px] overflow-hidden rounded-3xl bg-[#0f172a]/95"
          >
            <div className="flex min-w-0 flex-1 flex-col justify-center p-4 sm:p-5">
              <h3 className="font-semibold text-[var(--lp-gold-bright,#f3c96b)]">
                {u.industry}
              </h3>
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
            <div
              className="relative shrink-0 overflow-hidden"
              style={{ width: `${panel}%` }}
            >
              {u.image ? (
                // eslint-disable-next-line @next/next/no-img-element -- admin may use R2, data URLs, or local paths
                <img
                  src={u.image}
                  alt={u.imageAlt || u.industry}
                  className="absolute inset-0 h-full w-full transition duration-500 group-hover:brightness-110"
                  style={{
                    objectFit: fit,
                    objectPosition: `${posX}% ${posY}%`,
                    transform: `scale(${scale})`,
                    transformOrigin: `${posX}% ${posY}%`,
                  }}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-800/80 text-[10px] text-slate-500">
                  No image
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-l from-transparent to-[#0f172a]/55" />
            </div>
          </article>
        );
      })}
    </div>
  );
}
