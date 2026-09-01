import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function StudioControlGroup({ label, semantic = "neutral", summary, children, className }: {
  label: string;
  semantic?: "neutral" | "structure" | "governance";
  summary?: string;
  children: ReactNode;
  className?: string;
}) {
  return <section className={cn("rounded-2xl border bg-[#101722]/72 p-3", semantic === "structure" ? "border-[#8bdcff]/18" : semantic === "governance" ? "border-[#f0bf62]/22" : "border-white/8", className)} data-control-group={label.toLowerCase()} data-semantic-state={semantic === "neutral" ? undefined : semantic}>
    <header className="mb-3 flex items-baseline justify-between gap-3"><h3 className={cn("text-[10px] font-semibold uppercase tracking-[.14em]", semantic === "structure" ? "text-[#a9e7ff]/78" : semantic === "governance" ? "text-[#f7d896]/82" : "text-white/48")}>{label}</h3>{summary ? <span className="truncate text-[9px] text-white/32">{summary}</span> : null}</header>
    <div className="space-y-3">{children}</div>
  </section>;
}
