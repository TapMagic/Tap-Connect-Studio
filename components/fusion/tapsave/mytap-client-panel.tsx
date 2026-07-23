"use client";

import { useState } from "react";
import Link from "next/link";
import {
  TAPSAVE_MOMENT_LABELS,
  type TapSaveMoment,
  type TapSavePreference,
} from "@/lib/fusion/tapsave/moments";

type Props = {
  publicToken: string;
  initialPreferences: TapSavePreference;
  initialMoments: TapSaveMoment[];
  reopenCardUrl: string | null;
  tapSaveEnabled: boolean;
};

export function MyTapClientPanel({
  publicToken,
  initialPreferences,
  initialMoments,
  reopenCardUrl,
  tapSaveEnabled,
}: Props) {
  const [preferences, setPreferences] = useState(initialPreferences);
  const [moments, setMoments] = useState(initialMoments);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function patchPrefs(partial: Partial<TapSavePreference>) {
    const next = { ...preferences, ...partial };
    setPreferences(next);
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/tapsave/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicToken, preferences: partial }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Could not update preferences");
        setPreferences(preferences);
        return;
      }
      setPreferences(data.preferences);
      if (data.moment) {
        setMoments((prev) => [data.moment as TapSaveMoment, ...prev]);
      }
      setMessage("Preferences saved");
    } catch {
      setMessage("Could not update preferences");
      setPreferences(preferences);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {reopenCardUrl ? (
        <section className="rounded-xl border border-primary/30 bg-primary/10 p-4 text-center">
          <p className="text-sm text-white/80">Reopen the live Tap Connect card</p>
          <Link
            href={reopenCardUrl}
            className="mt-3 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-black"
          >
            Open card
          </Link>
        </section>
      ) : null}

      <section className="rounded-xl border border-white/10 bg-white/5 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-white/50">
          Channel preferences
        </h2>
        {!tapSaveEnabled ? (
          <p className="mt-2 text-sm text-white/50">TapSave is not fully enabled for this relationship yet.</p>
        ) : null}
        <ul className="mt-3 space-y-3 text-sm">
          {(
            [
              { key: "emailOptIn" as const, label: "Email updates" },
              { key: "smsOptIn" as const, label: "SMS updates" },
              { key: "walletOptIn" as const, label: "Wallet pass" },
            ] as const
          ).map((row) => (
            <li key={row.key} className="flex items-center justify-between gap-3">
              <span>{row.label}</span>
              <button
                type="button"
                disabled={saving}
                onClick={() => patchPrefs({ [row.key]: !preferences[row.key] })}
                className={`rounded-md px-3 py-1 text-xs font-medium ${
                  preferences[row.key]
                    ? "bg-primary text-black"
                    : "border border-white/20 text-white/50"
                }`}
                aria-pressed={preferences[row.key]}
              >
                {preferences[row.key] ? "On" : "Off"}
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-4">
          <p className="text-xs text-white/50">Update frequency</p>
          <select
            className="mt-1 w-full rounded-md border border-white/15 bg-black/40 px-3 py-2 text-sm"
            value={preferences.frequency}
            disabled={saving}
            onChange={(e) =>
              patchPrefs({
                frequency: e.target.value as TapSavePreference["frequency"],
              })
            }
          >
            <option value="immediate">Immediate</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="off">Off</option>
          </select>
        </div>
        {message ? <p className="mt-3 text-xs text-primary">{message}</p> : null}
      </section>

      <section className="rounded-xl border border-white/10 bg-white/5 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-white/50">Moments</h2>
        {moments.length === 0 ? (
          <p className="mt-3 text-sm text-white/50">No saved moments yet.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {moments.map((m) => (
              <li key={m.id} className="flex justify-between gap-3 border-b border-white/5 pb-2">
                <span>{TAPSAVE_MOMENT_LABELS[m.kind] ?? m.kind}</span>
                <span className="text-white/40">
                  {new Date(m.occurredAt).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
