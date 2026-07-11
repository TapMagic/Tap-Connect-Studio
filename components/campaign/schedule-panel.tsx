"use client";

import { useEffect, useState } from "react";
import { Calendar, Clock, Download } from "lucide-react";
import { FeaturePlaceholder } from "@/components/integrations/feature-placeholder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ScheduleRule {
  id: string;
  label: string;
  days: string[];
  startTime: string;
  endTime: string;
  campaignTitle: string;
}

interface SchedulePanelProps {
  campaignId: string;
}

export function SchedulePanel({ campaignId }: SchedulePanelProps) {
  const [rules, setRules] = useState<ScheduleRule[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Load placeholder rules from localStorage until DB schedule engine is wired
    const key = `schedule-draft-${campaignId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        setRules(JSON.parse(stored));
      } catch {
        setRules([]);
      }
    }
  }, [campaignId]);

  function addRule() {
    setRules((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        label: "New schedule rule",
        days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
        startTime: "00:00",
        endTime: "23:59",
        campaignTitle: "",
      },
    ]);
  }

  function saveDraft() {
    localStorage.setItem(`schedule-draft-${campaignId}`, JSON.stringify(rules));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold">Flexible scheduling</h3>
        <p className="text-sm text-muted-foreground">
          Run different campaigns on the same device URL by day, time, or date range.
          Example: Mon–Fri wing special, Sat $1 beer night.
        </p>
      </div>

      <FeaturePlaceholder
        title="Schedule engine (coming next)"
        description="UI is ready for rule building. Full auto-switching activates after schedule service is wired to device assignments."
        comingSoon
        costNote="No extra cost — uses your existing database."
      />

      <div className="space-y-3">
        {rules.map((rule, i) => (
          <div key={rule.id} className="rounded-lg border border-border/60 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <Input
                value={rule.label}
                onChange={(e) => {
                  const next = [...rules];
                  next[i] = { ...rule, label: e.target.value };
                  setRules(next);
                }}
                className="font-medium"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Days</Label>
                <Input
                  value={rule.days.join(", ")}
                  onChange={(e) => {
                    const next = [...rules];
                    next[i] = { ...rule, days: e.target.value.split(",").map((d) => d.trim()) };
                    setRules(next);
                  }}
                  placeholder="Mon, Tue, Wed, Thu, Fri"
                />
              </div>
              <div>
                <Label className="text-xs">Campaign to show</Label>
                <Input
                  value={rule.campaignTitle}
                  onChange={(e) => {
                    const next = [...rules];
                    next[i] = { ...rule, campaignTitle: e.target.value };
                    setRules(next);
                  }}
                  placeholder="e.g. Free Wings M-F"
                />
              </div>
              <div>
                <Label className="text-xs flex items-center gap-1"><Clock className="h-3 w-3" /> Start time</Label>
                <Input type="time" value={rule.startTime} onChange={(e) => {
                  const next = [...rules];
                  next[i] = { ...rule, startTime: e.target.value };
                  setRules(next);
                }} />
              </div>
              <div>
                <Label className="text-xs">End time</Label>
                <Input type="time" value={rule.endTime} onChange={(e) => {
                  const next = [...rules];
                  next[i] = { ...rule, endTime: e.target.value };
                  setRules(next);
                }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={addRule}>Add schedule rule</Button>
        <Button onClick={saveDraft}>{saved ? "Saved (draft)" : "Save draft"}</Button>
      </div>
    </div>
  );
}
