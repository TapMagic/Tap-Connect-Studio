"use client";

import { useMemo, type ReactNode } from "react";
import { CosmicGlassDivider, CosmicGlassStudioAction } from "@/lib/fusion/creative-studio/visual-parts/packages/cosmic-glass/CosmicGlassStudioBridge";
import { applyCosmicGlassSignature, type CosmicGlassParams } from "@/lib/fusion/creative-studio/visual-parts/packages/cosmic-glass/recipe";
import { buttonElementDefaults } from "@/lib/fusion/card/designer-elements";
import { updateButtonLabel } from "@/lib/fusion/creative-studio/button-composition";

type SpecimenProps = Pick<CosmicGlassParams, "ringFinish" | "ringShape" | "dividerCenter" | "identityBezel"> & {
  view: "hero" | "divider" | "full";
  phone: boolean;
  detailedIdentity: boolean;
};

function useSpecimenProps(options: SpecimenProps) {
  return useMemo(() => {
    const id = "btn-cosmic-glass-specimen";
    let next: Record<string, unknown> = {
      ...buttonElementDefaults("website" as never, id),
      label: "Shop The Monkey Cage",
      description: "One tap. Your world, connected.",
      eyebrow: "SIGNATURE ACTION",
      iconMediaUrl: options.detailedIdentity ? "/marketing/use-cases/pet-businesses.jpg" : "/tap-connect-logo.png",
      actionType: "website",
      href: "https://example.com/the-monkey-cage",
      accessibleLabel: "Shop The Monkey Cage",
      showIcon: true,
      showLabel: true,
      showDescription: true,
    };
    next = updateButtonLabel(next, "Shop The Monkey Cage", id);
    return applyCosmicGlassSignature(next, "button", {
      ringFinish: options.ringFinish,
      ringShape: options.ringShape,
      dividerCenter: options.dividerCenter,
      identityBezel: options.identityBezel,
      identityScale: options.detailedIdentity ? 1.08 : 1,
      identityFit: options.detailedIdentity ? "cover" : "contain",
      descriptionVisible: options.view === "full",
    });
  }, [options.detailedIdentity, options.dividerCenter, options.identityBezel, options.ringFinish, options.ringShape, options.view]);
}

function Hero({ props, phone = false, width }: { props: Record<string, unknown>; phone?: boolean; width?: number }) {
  return (
    <a
      href="https://example.com/the-monkey-cage"
      aria-label="Shop The Monkey Cage"
      data-testid="cosmic-glass-hero"
      data-vp-cosmic-glass-host="true"
      data-action-type="website"
      data-action-href="https://example.com/the-monkey-cage"
      style={{ display: "block", width: phone ? 390 : width || 920, height: 284, textDecoration: "none" }}
    >
      <CosmicGlassStudioAction props={props} label="Shop The Monkey Cage" description="One tap. Your world, connected." />
    </a>
  );
}

function UtilityCard({ title, detail, wide = false }: { title: string; detail: string; wide?: boolean }) {
  return <div style={{ gridColumn: wide ? "1 / -1" : undefined, height: wide ? 142 : 150, border:"1px solid #0b459c", borderRadius:30, background:"linear-gradient(145deg,#091321,#02060d 52%,#00040a)", display:"flex", alignItems:"center", gap:26, padding:"0 28px", color:"#f7f3e9", boxShadow:"inset 0 1px rgba(255,255,255,.13)" }}><span style={{ width:78,height:78,borderRadius:24,border:"1px solid #0d72ff",display:"grid",placeItems:"center",color:"#087cff",fontSize:34,boxShadow:"inset 0 0 18px #06142b" }}>◉</span><span style={{ display:"flex",flexDirection:"column",fontFamily:"Georgia,serif",fontSize:30 }}>{title}<small style={{ color:"#0d72ff",fontSize:18,marginTop:8 }}>{detail}</small></span><span style={{ marginLeft:"auto",color:"#0d72ff",fontSize:28 }}>→</span></div>;
}

function FullSection({ props, heroWidth }: { props: Record<string, unknown>; heroWidth: number }) {
  return <section style={{ width:1152, margin:"0 auto", display:"grid", gridTemplateColumns:"1fr 1fr", gap:26 }}><div style={{ gridColumn:"1 / -1", display:"grid", placeItems:"center" }}><Hero props={props} width={heroWidth} /></div><UtilityCard wide title="View Studio" detail="Build, manage, and publish."/><UtilityCard title="Website" detail="Visit online"/><UtilityCard title="Save Contact" detail="Add to contacts"/><div style={{ gridColumn:"1 / -1", height:72 }}><CosmicGlassDivider props={props}/></div></section>;
}

export function CosmicGlassSpecimenClient(options: SpecimenProps) {
  const props = useSpecimenProps(options);
  let content: ReactNode;
  if (options.view === "divider") {
    content = <div data-testid="cosmic-glass-divider" style={{ width:1032,height:72 }}><CosmicGlassDivider props={props}/></div>;
  } else if (options.view === "full") {
    content = <div data-testid="cosmic-glass-full-desktop" style={{ width:1200,height:1834,padding:"56px 24px",display:"flex",flexDirection:"column",gap:82,background:"#00040b" }}><FullSection props={props} heroWidth={1050}/><FullSection props={props} heroWidth={1150}/></div>;
  } else {
    content = <Hero props={props} phone={options.phone}/>;
  }
  return <main style={{ margin:0,minHeight:"100vh",background:"#00040b",display:"grid",placeItems:"center",overflow:"hidden" }}>{content}</main>;
}
