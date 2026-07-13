import { ScanModePanel } from "@/components/scan/scan-mode-panel";

export const dynamic = "force-dynamic";

export default function ScanModePage() {
  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-bold">Scan Mode</h1>
        <p className="text-muted-foreground">
          Identify a physical Tap Connect tag without guessing codes. Start a session, tap the tag,
          and jump straight to its device profile.
        </p>
      </div>
      <ScanModePanel />
    </div>
  );
}
