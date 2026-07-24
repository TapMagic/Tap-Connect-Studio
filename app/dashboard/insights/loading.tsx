export default function InsightsLoading() {
  return (
    <div className="space-y-8 p-5 lg:p-8" data-testid="insights-loading" aria-busy="true">
      <div className="space-y-2 border-b border-white/8 pb-6">
        <div className="h-3 w-40 animate-pulse rounded bg-white/10" />
        <div className="h-9 w-56 animate-pulse rounded bg-white/10" />
        <div className="h-4 w-full max-w-xl animate-pulse rounded bg-white/5" />
      </div>
      <p className="text-sm text-muted-foreground">Loading Insights aggregations…</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-xl border border-border/40 bg-card/20"
          />
        ))}
      </div>
    </div>
  );
}
