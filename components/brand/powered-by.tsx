import Image from "next/image";

/** Public / marketing credit — parent brand, not product name. */
export function PoweredByTapTheMagic({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center gap-2 opacity-70 ${className}`}>
      <p className="text-[10px] uppercase tracking-[0.25em] text-white/60">Powered by</p>
      <Image
        src="/tap-the-magic-logo.png"
        alt="Tap The Magic"
        width={140}
        height={48}
        className="h-10 w-auto object-contain"
      />
    </div>
  );
}
