import Link from "next/link";
import { Lock } from "lucide-react";

export function FeatureDisabledState({
  featureId,
  title,
  description,
  alternateHref,
  alternateLabel,
}: {
  featureId: string;
  title: string;
  description?: string;
  alternateHref?: string;
  alternateLabel?: string;
}) {
  return (
    <div
      className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-10 text-center"
      role="status"
    >
      <Lock className="mx-auto mb-3 h-8 w-8 text-white/35" aria-hidden />
      <h2 className="text-lg font-semibold tracking-tight text-white/90">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-white/50">
        {description ??
          "This surface is controlled by the Feature Registry. Platform Admin can enable it when you are ready."}
      </p>
      <p className="mt-3 font-mono text-xs text-primary">
        Feature: <code>{featureId}</code>
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-sm">
        <Link
          href="/admin/platform"
          className="rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 text-primary hover:bg-primary/15"
        >
          Open Feature Registry
        </Link>
        {alternateHref && alternateLabel ? (
          <Link href={alternateHref} className="text-white/55 underline-offset-4 hover:underline">
            {alternateLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
