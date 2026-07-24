import type { WalletPassRecord } from "@/lib/fusion/wallet/service";
import { isInstallable, type WalletPassStatus } from "@/lib/fusion/wallet/lifecycle";

type Props = {
  pass: Pick<
    WalletPassRecord,
    "serialNumber" | "platform" | "status" | "mock" | "installUrl" | "previewUrl"
  >;
  businessName: string;
  cardTitle?: string;
  evidenceLabel?: string;
  compact?: boolean;
};

export function WalletMockPassCard({
  pass,
  businessName,
  cardTitle,
  evidenceLabel,
  compact = false,
}: Props) {
  const installable = isInstallable(pass.status as WalletPassStatus);
  const title = cardTitle ?? `${businessName} Card`;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-[#0d1117] via-[#0b0f19] to-black shadow-[0_0_24px_rgba(190,255,0,0.08)] ${
        compact ? "p-4" : "p-5"
      }`}
      data-testid="wallet-mock-pass-card"
    >
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/10 blur-2xl"
        aria-hidden
      />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/80">
            {pass.platform === "apple" ? "Apple Wallet" : "Google Wallet"}
            {pass.mock ? " · Mock" : ""}
          </p>
          <h3 className={`mt-1 font-semibold text-white ${compact ? "text-base" : "text-lg"}`}>
            {title}
          </h3>
          <p className="mt-1 text-sm text-white/60">{businessName}</p>
        </div>
        <div className="rounded-lg bg-primary/15 px-2 py-1 text-[10px] font-medium uppercase text-primary">
          {pass.status}
        </div>
      </div>

      <dl className={`mt-4 space-y-1 text-xs ${compact ? "text-white/50" : "text-white/60"}`}>
        <div className="flex justify-between gap-3">
          <dt>Serial</dt>
          <dd className="font-mono text-white/80">{pass.serialNumber.slice(0, 20)}…</dd>
        </div>
        {evidenceLabel ? (
          <div className="flex justify-between gap-3">
            <dt>Evidence</dt>
            <dd className="text-primary">{evidenceLabel}</dd>
          </div>
        ) : null}
      </dl>

      {installable && pass.installUrl ? (
        <a
          href={pass.installUrl}
          className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-black transition hover:brightness-110"
        >
          {pass.mock ? "Open mock pass" : "Add to Wallet"}
        </a>
      ) : pass.previewUrl ? (
        <p className="mt-4 text-xs text-white/50">
          Preview ready — issue step completes on MyTap.
        </p>
      ) : null}

      {pass.mock ? (
        <p className="mt-3 text-[10px] leading-relaxed text-white/40">
          Mock adapter — no live Apple/Google credentials. Live wallet remains{" "}
          <span className="text-primary/80">VERIFIED — CREDENTIALS REQUIRED</span>.
        </p>
      ) : null}
    </div>
  );
}
