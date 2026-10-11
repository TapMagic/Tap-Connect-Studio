import { CompactActionGrid } from "@/components/tap/compact-action-grid";
import { createCompactActionGrid, createCompactActionTile } from "@/lib/fusion/creative-studio/platform/compact-action-grid";

const proof = createCompactActionGrid({
  componentId: "love-theft-semantic-insert-proof",
  analyticsId: "review:love-theft-semantic-inserts",
  presentation: "everencore-love-and-theft-pick",
  columns: 3,
  density: "standard",
  tiles: [
    createCompactActionTile({ componentId: "proof-spotify", label: "Spotify", sublabel: "Listen", iconAssetRef: "simple-icons:spotify" }),
    createCompactActionTile({ componentId: "proof-apple-music", label: "Apple Music", sublabel: "Stream", iconAssetRef: "simple-icons:apple-music" }),
    createCompactActionTile({ componentId: "proof-more-music", label: "More Music", sublabel: "Browse", iconAssetRef: "lucide:library-big" }),
  ],
});

/** Read-only deterministic proof surface; no Experience or Draft state is loaded or mutated. */
export default function LoveAndTheftPickProofPage() {
  return <main className="min-h-screen bg-[#070503] px-3 py-10 text-white" data-testid="love-theft-semantic-insert-proof">
    <div className="mx-auto w-full max-w-[390px]">
      <h1 className="mb-6 text-center font-serif text-2xl text-[#fff1d2]">Love &amp; Theft Pick Inserts</h1>
      <CompactActionGrid state={proof} />
    </div>
  </main>;
}
