import Link from "next/link";
import { AlertTriangle, CalendarClock, Radio, WifiOff } from "lucide-react";

/**
 * Honest Pulse field outcomes when ops.pulse is enabled.
 * Claim / offline queue / PWA sync are not shipped — operators get real exits
 * (Scan Mode, Campaign Groups, Tap Points) instead of stub UIs that look live.
 */
export function PulseFieldHonestyPanel() {
  return (
    <section
      className="space-y-3"
      data-testid="pulse-field-honesty"
      aria-label="Pulse field capabilities"
    >
      <div className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-200" aria-hidden />
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium text-amber-50">
            Pulse field claim, offline queue, and installable PWA are not shipped
          </p>
          <p className="text-xs text-amber-100/80">
            This shell shows live fleet health and waiting scan counts only. Use Scan Mode for
            activate/claim, Campaign Groups for rotations, and Tap Points for the studio fleet
            list. Enabling <code className="font-mono text-[10px]">ops.pulse</code> does not unlock
            a separate field claim API.
          </p>
        </div>
      </div>

      <ul className="grid gap-2">
        <li className="rounded-xl border border-border/60 bg-card/40 px-4 py-3">
          <div className="flex items-start gap-3">
            <Radio className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            <div>
              <p className="text-sm font-medium">Claim session</p>
              <p className="text-xs text-muted-foreground">
                Not available in Pulse — open Scan Mode for live WAITING → CLAIMED sessions.
              </p>
              <Link
                href="/dashboard/scan"
                className="mt-2 inline-block text-xs font-medium text-primary underline-offset-4 hover:underline"
              >
                Open Scan Mode →
              </Link>
            </div>
          </div>
        </li>
        <li className="rounded-xl border border-border/60 bg-card/40 px-4 py-3">
          <div className="flex items-start gap-3">
            <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            <div>
              <p className="text-sm font-medium">Campaign rotation</p>
              <p className="text-xs text-muted-foreground">
                Not available in Pulse — schedule and preview rotations in Campaign Groups.
              </p>
              <Link
                href="/dashboard/groups"
                className="mt-2 inline-block text-xs font-medium text-primary underline-offset-4 hover:underline"
              >
                Open Campaign Groups →
              </Link>
            </div>
          </div>
        </li>
        <li className="rounded-xl border border-border/60 bg-card/40 px-4 py-3">
          <div className="flex items-start gap-3">
            <WifiOff className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            <div>
              <p className="text-sm font-medium">Offline queue / service worker</p>
              <p className="text-xs text-muted-foreground">
                Not wired — Pulse does not queue field actions offline. Stay online and use Studio
                or Scan Mode.
              </p>
            </div>
          </div>
        </li>
      </ul>
    </section>
  );
}
