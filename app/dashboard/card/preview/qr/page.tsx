import QRCode from "qrcode";
import { LanPreviewReachability } from "@/components/fusion/creative-studio/lan-preview-reachability";
import { buildPreviewAbsoluteUrl, resolvePreviewBaseUrl } from "@/lib/fusion/creative-studio/preview/url";

export const dynamic = "force-dynamic";

const PREVIEW_PATH = "/dashboard/card/preview";

export default async function CardLanQrPage() {
  const assessment = resolvePreviewBaseUrl({ preferLanPort: 3142 });
  const { url: previewUrl } = buildPreviewAbsoluteUrl(PREVIEW_PATH, assessment);
  const qrDataUrl = await QRCode.toDataURL(previewUrl, {
    margin: 2,
    width: 320,
    errorCorrectionLevel: "M",
    color: { dark: "#05070a", light: "#ffffff" },
  });

  return (
    <main className="min-h-full bg-[#05070a] px-4 py-10 text-white">
      <section className="mx-auto max-w-xl space-y-6 rounded-3xl border border-white/10 bg-[#0a0e16] p-6 shadow-2xl">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-lime-300">
            Local-network Product Owner test
          </p>
          <h1 className="mt-2 text-2xl font-semibold">Arc Ember iPhone Preview</h1>
          <p className="mt-2 text-sm text-white/65">
            Owner Private Demo ms8jfzoi · actual Card Preview renderer
          </p>
        </div>

        <LanPreviewReachability url={previewUrl} />

        <div className="mx-auto w-fit rounded-2xl bg-white p-3 shadow-[0_0_35px_rgba(184,255,44,0.14)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrDataUrl}
            alt={`QR code for ${previewUrl}`}
            width={320}
            height={320}
            className="block h-auto max-w-full"
            data-testid="lan-preview-qr"
          />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-white/50">
            Phone-reachable Preview URL
          </p>
          <a
            href={previewUrl}
            className="block break-all rounded-xl border border-lime-300/25 bg-black/30 p-3 text-sm text-lime-200 underline decoration-lime-300/40 underline-offset-4"
            data-testid="lan-preview-url"
          >
            {previewUrl}
          </a>
        </div>

        <div className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-4 text-xs text-white/60">
          <p>Keep this Mac awake and TapConnect Studio running.</p>
          <p>Connect the iPhone to the same Wi-Fi and scan with the Camera app.</p>
          <p>
            This dashboard Preview route requires the same TapConnect owner sign-in on the iPhone.
          </p>
          <p>
            LAN candidacy is not physical-phone verification; the successful iPhone open completes that check.
          </p>
        </div>
      </section>
    </main>
  );
}
