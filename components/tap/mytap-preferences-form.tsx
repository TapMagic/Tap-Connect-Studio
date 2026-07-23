"use client";

import { useState } from "react";
import type { TapSavePreference } from "@/lib/fusion/tapsave/moments";

type Props = {
  publicToken: string;
  initial: TapSavePreference;
};

export function MyTapPreferencesForm({ publicToken, initial }: Props) {
  const [prefs, setPrefs] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save(next: TapSavePreference) {
    setPrefs(next);
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/tapsave", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicToken, ...next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Could not save preferences");
        return;
      }
      setPrefs(data.preferences);
      setMessage("Preferences saved");
    } catch {
      setMessage("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-white/10 bg-white/5 p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-white/50">
        Channel preferences
      </h2>
      <ul className="mt-3 space-y-3 text-sm">
        {(
          [
            { key: "emailOptIn" as const, label: "Email updates" },
            { key: "walletOptIn" as const, label: "Wallet pass" },
            { key: "smsOptIn" as const, label: "SMS" },
          ] as const
        ).map((row) => (
          <li key={row.key} className="flex items-center justify-between gap-3">
            <span>{row.label}</span>
            <button
              type="button"
              disabled={saving}
              onClick={() => save({ ...prefs, [row.key]: !prefs[row.key] })}
              className={`rounded-md px-3 py-1 text-xs font-medium ${
                prefs[row.key] ? "bg-primary text-black" : "bg-white/10 text-white/60"
              }`}
              aria-pressed={prefs[row.key]}
            >
              {prefs[row.key] ? "On" : "Off"}
            </button>
          </li>
        ))}
      </ul>
      <label className="mt-4 block text-xs text-white/50">
        Update frequency
        <select
          className="mt-1 w-full rounded-md border border-white/10 bg-black/40 px-2 py-2 text-sm text-white"
          value={prefs.frequency}
          disabled={saving}
          onChange={(e) =>
            save({
              ...prefs,
              frequency: e.target.value as TapSavePreference["frequency"],
            })
          }
        >
          <option value="immediate">Immediate</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="off">Off</option>
        </select>
      </label>
      {message ? <p className="mt-2 text-xs text-primary">{message}</p> : null}
    </section>
  );
}
