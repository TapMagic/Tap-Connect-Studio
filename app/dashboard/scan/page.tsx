import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ScanModePage() {
  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-bold">Scan Mode</h1>
        <p className="text-muted-foreground">
          Tap a physical device to identify and manage it. Coming in Phase 4 with polling-based sync.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            title: "Local Scan",
            description: "Tap an NFC tag with your phone to open the device profile.",
          },
          {
            title: "Desktop + Phone",
            description: "Wait on desktop while you scan with your phone.",
          },
          {
            title: "Remote Staff Scan",
            description: "Send a temporary link to staff so they can tap a tag for you.",
          },
        ].map((mode) => (
          <Card key={mode.title} className="border-border/60">
            <CardHeader>
              <CardTitle className="text-lg">{mode.title}</CardTitle>
              <CardDescription>{mode.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Phase 4</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
