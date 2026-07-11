import { isClerkConfigured } from "@/lib/utils/app";

export function DevModeBanner() {
  if (isClerkConfigured()) return null;

  return (
    <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-xs text-amber-200">
      Dev mode: Clerk auth not configured. Using local dev session. Add Clerk keys to{" "}
      <code className="rounded bg-black/20 px-1">.env</code> when ready.
    </div>
  );
}
