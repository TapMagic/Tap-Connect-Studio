import { CompactActionGrid } from "@/components/tap/compact-action-grid";
import { createCompactActionGrid, createCompactActionTile } from "@/lib/fusion/creative-studio/platform/compact-action-grid";

const proof = createCompactActionGrid({
  componentId: "love-theft-semantic-insert-proof",
  analyticsId: "review:love-theft-semantic-inserts",
  presentation: "everencore-love-and-theft-pick",
  columns: 3,
  density: "standard",
  tiles: [
    createCompactActionTile({ componentId: "proof-spotify", label: "Spotify", sublabel: "Listen", iconAssetRef: "LT-PICK-SPOTIFY" }),
    createCompactActionTile({ componentId: "proof-apple-music", label: "Apple Music", sublabel: "Stream", iconAssetRef: "LT-PICK-MUSIC" }),
    createCompactActionTile({ componentId: "proof-more-music", label: "More Music", sublabel: "Library", iconAssetRef: "LT-PICK-PLAYLIST" }),
  ],
});

/** Read-only deterministic proof surface; no Experience or Draft state is loaded or mutated. */
export default function LoveAndTheftPickProofPage() {
  return <main className="min-h-screen bg-[#070503] px-3 py-10 text-white" data-testid="love-theft-semantic-insert-proof">
    <div className="mx-auto w-full max-w-[390px]">
      <section className="overflow-hidden rounded-[28px] border border-[#d6ad5b]/20 bg-[radial-gradient(circle_at_50%_0%,rgba(114,60,24,.3),transparent_45%),linear-gradient(180deg,rgba(31,17,10,.98),rgba(9,6,4,.98))] px-3 pb-5 pt-4 shadow-[inset_0_1px_0_rgba(255,224,154,.12),0_24px_50px_rgba(0,0,0,.46)]" data-testid="easy-to-be-lonely-proof-container">
        <p className="text-center text-[10px] font-semibold tracking-[.24em] text-[#c99b54]">NEW SINGLE</p>
        <h1 className="mt-1 text-center font-serif text-3xl font-semibold text-[#fff1d2]">Easy To Be Lonely</h1>
        <p className="mb-3 mt-1 text-center text-[10px] font-semibold tracking-[.22em] text-[#d7b36e]">OUT NOW</p>
        <CompactActionGrid state={proof} />
      </section>
    </div>
  </main>;
}
