import Link from "next/link";
import { formatEvidenceCaption } from "@/lib/fusion/insights/evidence-display";
import type { InsightDrillRow } from "@/lib/fusion/insights/drilldown";
import type { TapProofRecord } from "@/lib/fusion/insights/tapproof";
import { labelEvidence } from "@/lib/fusion/insights/tapproof";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function InsightsDrillTable({
  rows,
  kpiKey,
}: {
  rows: InsightDrillRow[];
  kpiKey: string;
}) {
  if (rows.length === 0) {
    return (
      <Card className="border-dashed border-border/60" data-testid="insights-drill-empty">
        <CardHeader>
          <CardTitle>No drill-down rows</CardTitle>
          <CardDescription>
            KPI <code className="text-xs">{kpiKey}</code> has no grouped rows in this range. Try
            another KPI or widen the date range.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-border/60" data-testid="insights-drill-table">
      <CardHeader>
        <CardTitle>Drill-down · {kpiKey}</CardTitle>
        <CardDescription>
          Grouped rows from confirmed stores. Use Open to drill through to the underlying record.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">
              Drill-down breakdown for {kpiKey} with evidence class and drill-through links
            </caption>
            <thead>
              <tr className="border-b border-border/60 text-xs text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Label</th>
                <th className="py-2 pr-3 font-medium">Value</th>
                <th className="py-2 pr-3 font-medium">Evidence</th>
                <th className="py-2 pr-3 font-medium">Source</th>
                <th className="py-2 font-medium">Drill-through</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border/40" data-testid="insights-drill-row">
                  <td className="py-2 pr-3 text-white">
                    {r.label}
                    {r.secondary ? (
                      <span className="block text-[10px] text-muted-foreground">{r.secondary}</span>
                    ) : null}
                  </td>
                  <td className="py-2 pr-3 tabular-nums">{r.value}</td>
                  <td className="py-2 pr-3 text-xs text-primary">
                    {formatEvidenceCaption({
                      evidenceClass: r.evidenceClass,
                      source: "",
                    })}
                  </td>
                  <td className="py-2 pr-3 text-xs text-muted-foreground">{r.source}</td>
                  <td className="py-2">
                    <Link
                      href={r.drillThroughHref}
                      className="text-primary hover:underline text-xs"
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export function InsightsProvenancePanel({
  records,
}: {
  records: TapProofRecord[];
}) {
  if (records.length === 0) {
    return (
      <Card className="border-dashed border-border/60" data-testid="insights-provenance-empty">
        <CardHeader>
          <CardTitle>TapProof provenance</CardTitle>
          <CardDescription>No claims in the current filtered view.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-border/60" data-testid="insights-provenance">
      <CardHeader>
        <CardTitle>TapProof provenance</CardTitle>
        <CardDescription>
          Every KPI claim carries evidence class + source refs. Modeled is never presented as fact.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul
          className="space-y-3 max-h-80 overflow-y-auto"
          tabIndex={0}
          aria-label="TapProof provenance records"
        >
          {records.map((p) => (
            <li
              key={p.id}
              className="rounded-lg border border-border/50 bg-muted/10 p-3"
              data-testid="insights-proof-row"
            >
              <p className="text-sm text-white">{p.claim}</p>
              <p className="mt-1 text-[11px] text-primary">
                {labelEvidence(p.evidenceClass)} · confidence{" "}
                {Math.round(p.confidence * 100)}%
                {p.humanVerified ? " · human verified" : " · not human verified"}
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {p.sources.map((s) => s.ref).join(" · ")}
              </p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
