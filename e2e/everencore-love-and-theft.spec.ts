import { expect, test } from "@playwright/test";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import type { CreativeCompositionBlock } from "@/lib/fusion/creative-studio/composition";
import type { TapConnectCardConfig } from "@/lib/brand/tap-card";
import { canonicalizeExperienceConfig, projectExperiencePage } from "@/lib/fusion/card/experience-pages";
import { CANONICAL_PLATFORM_ICON_ASSETS } from "@/lib/fusion/creative-studio/icon-asset";
import { compositionBackgroundFromMaterialRecipe, getMaterialRecipe } from "@/lib/fusion/creative-studio/material-engine";
import { setCardEdgeMode } from "@/lib/fusion/creative-studio/platform/edge-layout";
import {
  compileSignatureAuthoringState,
  createSignatureAssemblyAuthoringState,
  setSignatureActionCount,
  setSignatureAppearanceOption,
  updateSignatureAction,
} from "@/lib/fusion/creative-studio/signature-assets/authoring";
import { LOVE_AND_THEFT_APPEARANCE_OPTION_IDS } from "@/lib/fusion/creative-studio/signature-assets/everencore-love-and-theft-appearance";
import {
  EVERENCORE_LOVE_AND_THEFT_ASSEMBLY_RECIPES,
  EVERENCORE_LOVE_AND_THEFT_FAMILY_ID,
  EVERENCORE_LOVE_AND_THEFT_VISUAL_ACCEPTANCE,
} from "@/lib/fusion/creative-studio/signature-assets/everencore-love-and-theft";

const enabled=process.env.EVERENCORE_LOVE_AND_THEFT_ACCEPTANCE==="1";
const proofRoot=path.join("docs","product-reconstitution","creative-studio-platform","proofs","everencore-love-and-theft");
type RootNode=Record<string,unknown>&{siblingOrder?:number};

const presentations = [
  { id:"everencore-love-and-theft-hero", label:"Love & Theft Hero Action", count:1, treatment:LOVE_AND_THEFT_APPEARANCE_OPTION_IDS.burgundyPlum },
  { id:"everencore-love-and-theft-standard-left", label:"Love & Theft Standard Left", count:1, treatment:LOVE_AND_THEFT_APPEARANCE_OPTION_IDS.smokyBlack },
  { id:"everencore-love-and-theft-standard-right", label:"Love & Theft Standard Right", count:1, treatment:LOVE_AND_THEFT_APPEARANCE_OPTION_IDS.deepBlue },
  { id:"everencore-love-and-theft-standard-utility", label:"Love & Theft Utility Mini Insert", count:1, treatment:LOVE_AND_THEFT_APPEARANCE_OPTION_IDS.deepBlue },
  { id:"everencore-love-and-theft-standard-body", label:"Love & Theft Body Only", count:1, treatment:LOVE_AND_THEFT_APPEARANCE_OPTION_IDS.smokyBlack },
  { id:"everencore-love-and-theft-single-stack", label:"Love & Theft Bound Single Stack", count:4, treatment:LOVE_AND_THEFT_APPEARANCE_OPTION_IDS.frostedCharcoal },
  { id:"everencore-love-and-theft-twin-rail", label:"Love & Theft Twin Rail", count:4, treatment:LOVE_AND_THEFT_APPEARANCE_OPTION_IDS.smokyBlack },
] as const;

function compilePresentation(definition:typeof presentations[number]) {
  let sequence=0;
  const created=createSignatureAssemblyAuthoringState(EVERENCORE_LOVE_AND_THEFT_FAMILY_ID,{presentationId:definition.id},{idFactory:()=>`${definition.id}-${++sequence}`});
  if(!created) throw new Error(`${definition.id} is unavailable.`);
  let state=setSignatureActionCount(created,definition.count,()=>`${definition.id}-${++sequence}`);
  state=setSignatureAppearanceOption(state,"text-bar-surface",definition.treatment);
  if(definition.id==="everencore-love-and-theft-hero") {
    state=updateSignatureAction(state,state.input.actions[0].id,{
      label:"Stream the new single",
      sublabel:"Love & Theft · official release",
      accessibilityLabel:"Stream the new Love & Theft single",
      semanticIconRef:CANONICAL_PLATFORM_ICON_ASSETS.find((icon)=>icon.canonicalId==="simple-icons:apple-music"),
      semanticLabel:"Apple Music",
      plugSide:"left",
    });
  }
  if(definition.id==="everencore-love-and-theft-single-stack"||definition.id==="everencore-love-and-theft-twin-rail") {
    const treatments=[LOVE_AND_THEFT_APPEARANCE_OPTION_IDS.burgundyPlum,LOVE_AND_THEFT_APPEARANCE_OPTION_IDS.deepBlue,LOVE_AND_THEFT_APPEARANCE_OPTION_IDS.frostedCharcoal,LOVE_AND_THEFT_APPEARANCE_OPTION_IDS.smokyBlack];
    const labels=definition.id==="everencore-love-and-theft-single-stack"?["Listen Now","Call Now","Buy Tickets","Directions"]:["Music","Tour","Tickets","Contact"];
    state.input.actions.forEach((action,index)=>{
      state=updateSignatureAction(state,action.id,{label:labels[index]??action.label,appearanceOptionIds:{"text-bar-surface":treatments[index%treatments.length]}});
    });
  }
  const compiled=compileSignatureAuthoringState(state,{blockId:`proof-${definition.id}`,label:definition.label});
  if(!compiled.ok) throw new Error(compiled.errors.map((error)=>error.message).join(" "));
  return {state,composition:compiled.composition};
}

async function expectAcceptedGolden(current:Buffer,goldenPath:string) {
  if(process.env.LOVE_AND_THEFT_UPDATE_GOLDENS==="1") {
    writeFileSync(goldenPath,current);
    return;
  }
  // Candidate proofs are always captured, but only a Product Owner-approved
  // baseline may become an enforced golden. Stale/rejected rasters are evidence,
  // not an authority that production geometry must preserve.
  if(process.env.LOVE_AND_THEFT_ENFORCE_GOLDENS!=="1") return;
  expect(existsSync(goldenPath),`Missing accepted golden: ${goldenPath}`).toBeTruthy();
  const [actual,expected]=await Promise.all([
    sharp(current).ensureAlpha().raw().toBuffer({resolveWithObject:true}),
    sharp(goldenPath).ensureAlpha().raw().toBuffer({resolveWithObject:true}),
  ]);
  expect(actual.info.width).toBe(expected.info.width);
  expect(actual.info.height).toBe(expected.info.height);
  let changedPixels=0;
  for(let offset=0;offset<actual.data.length;offset+=4) {
    const changed=Math.max(...[0,1,2,3].map((channel)=>Math.abs(actual.data[offset+channel]-expected.data[offset+channel])))>12;
    if(changed) changedPixels+=1;
  }
  expect(changedPixels/(actual.info.width*actual.info.height)).toBeLessThanOrEqual(.01);
}

async function writeQualityComparison(cabinetNoir:Buffer,loveAndTheft:Buffer,outputPath:string) {
  const [cabinet,love]=await Promise.all([
    sharp(cabinetNoir).resize(460,270,{fit:"contain",background:{r:8,g:10,b:13,alpha:1}}).png().toBuffer(),
    sharp(loveAndTheft).resize(460,270,{fit:"contain",background:{r:8,g:10,b:13,alpha:1}}).png().toBuffer(),
  ]);
  const labels=Buffer.from(`<svg width="1040" height="390" xmlns="http://www.w3.org/2000/svg">
    <style>.k{font:700 18px system-ui;letter-spacing:2px;fill:#e7c878}.s{font:500 12px system-ui;letter-spacing:1px;fill:#9da5b2}</style>
    <text class="k" x="20" y="28">CABINET NOIR</text><text class="s" x="20" y="49">MANUFACTURING QUALITY BENCHMARK</text>
    <text class="k" x="560" y="28">LOVE &amp; THEFT</text><text class="s" x="560" y="49">GUITAR-PICK ARTIST CONSTRUCTION</text>
    <rect x="10" y="62" width="480" height="292" rx="18" fill="none" stroke="#3a414b"/>
    <rect x="550" y="62" width="480" height="292" rx="18" fill="none" stroke="#7f6030"/>
  </svg>`);
  await sharp({create:{width:1040,height:390,channels:4,background:{r:5,g:7,b:10,alpha:1}}})
    .composite([{input:labels,left:0,top:0},{input:cabinet,left:20,top:72},{input:love,left:560,top:72}])
    .png()
    .toFile(outputPath);
}

async function writeBeforeAfter(before:Buffer,after:Buffer,outputPath:string) {
  const [beforePanel,afterPanel]=await Promise.all([
    sharp(before).resize(460,270,{fit:"contain",background:{r:8,g:10,b:13,alpha:1}}).png().toBuffer(),
    sharp(after).resize(460,270,{fit:"contain",background:{r:8,g:10,b:13,alpha:1}}).png().toBuffer(),
  ]);
  const labels=Buffer.from(`<svg width="1040" height="390" xmlns="http://www.w3.org/2000/svg">
    <style>.k{font:700 18px system-ui;letter-spacing:2px;fill:#e7c878}.s{font:500 12px system-ui;letter-spacing:1px;fill:#9da5b2}</style>
    <text class="k" x="20" y="28">BEFORE · REJECTED</text><text class="s" x="20" y="49">FLAT PICK / GENERIC GLASS / WEAK RELIEF</text>
    <text class="k" x="560" y="28">AFTER · CORRECTED</text><text class="s" x="560" y="49">MANUFACTURED BRASS / MATERIAL DEPTH / RECESSED ICON</text>
    <rect x="10" y="62" width="480" height="292" rx="18" fill="none" stroke="#513b28"/>
    <rect x="550" y="62" width="480" height="292" rx="18" fill="none" stroke="#a37b37"/>
  </svg>`);
  await sharp({create:{width:1040,height:390,channels:4,background:{r:5,g:7,b:10,alpha:1}}})
    .composite([{input:labels,left:0,top:0},{input:beforePanel,left:20,top:72},{input:afterPanel,left:560,top:72}])
    .png()
    .toFile(outputPath);
}

async function writeAuthorityComparison(target:Buffer,cabinetNoir:Buffer,loveAndTheft:Buffer,outputPath:string) {
  const [targetPanel,cabinetPanel,lovePanel]=await Promise.all([
    sharp(target).resize(440,300,{fit:"contain",background:{r:8,g:10,b:13,alpha:1}}).png().toBuffer(),
    sharp(cabinetNoir).resize(440,300,{fit:"contain",background:{r:8,g:10,b:13,alpha:1}}).png().toBuffer(),
    sharp(loveAndTheft).resize(440,300,{fit:"contain",background:{r:8,g:10,b:13,alpha:1}}).png().toBuffer(),
  ]);
  const labels=Buffer.from(`<svg width="1480" height="420" xmlns="http://www.w3.org/2000/svg">
    <style>.k{font:700 17px system-ui;letter-spacing:2px;fill:#e7c878}.s{font:500 11px system-ui;letter-spacing:1px;fill:#9da5b2}</style>
    <text class="k" x="20" y="28">BINDING CUT SHEET</text><text class="s" x="20" y="48">PRIMARY VISUAL AUTHORITY</text>
    <text class="k" x="510" y="28">CABINET NOIR</text><text class="s" x="510" y="48">MANUFACTURING QUALITY BENCHMARK</text>
    <text class="k" x="1000" y="28">LOVE &amp; THEFT RUNTIME</text><text class="s" x="1000" y="48">GOVERNED BODY + OPTIONAL SIGNATURE PLUG</text>
    <rect x="10" y="62" width="460" height="330" rx="18" fill="none" stroke="#5c4930"/>
    <rect x="500" y="62" width="460" height="330" rx="18" fill="none" stroke="#3a414b"/>
    <rect x="990" y="62" width="460" height="330" rx="18" fill="none" stroke="#a37b37"/>
  </svg>`);
  await sharp({create:{width:1480,height:420,channels:4,background:{r:5,g:7,b:10,alpha:1}}})
    .composite([{input:labels,left:0,top:0},{input:targetPanel,left:20,top:77},{input:cabinetPanel,left:510,top:77},{input:lovePanel,left:1000,top:77}])
    .png()
    .toFile(outputPath);
}

async function writeGeometryAcceptanceBoard(
  panels:readonly {label:string;detail:string;image:Buffer}[],
  outputPath:string,
) {
  const cellWidth=500;
  const cellHeight=230;
  const composites:sharp.OverlayOptions[]=[];
  for(let index=0;index<panels.length;index+=1) {
    const panel=panels[index];
    const left=(index%2)*cellWidth;
    const top=Math.floor(index/2)*cellHeight;
    const image=await sharp(panel.image).resize(460,160,{fit:"contain",background:{r:8,g:10,b:13,alpha:1}}).png().toBuffer();
    const label=Buffer.from(`<svg width="480" height="54" xmlns="http://www.w3.org/2000/svg"><style>.a{font:700 15px system-ui;letter-spacing:1.5px;fill:#e7c878}.b{font:500 10px system-ui;letter-spacing:1px;fill:#9da5b2}</style><text class="a" x="0" y="18">${panel.label}</text><text class="b" x="0" y="39">${panel.detail}</text></svg>`);
    composites.push({input:label,left:left+20,top:top+12},{input:image,left:left+20,top:top+60});
  }
  await sharp({create:{width:1000,height:cellHeight*Math.ceil(panels.length/2),channels:4,background:{r:5,g:7,b:10,alpha:1}}})
    .composite(composites)
    .png()
    .toFile(outputPath);
}

async function writeTreatmentAcceptanceBoard(
  panels: readonly { label: string; image: Buffer }[],
  outputPath: string,
) {
  const composites: sharp.OverlayOptions[] = [];
  for (let index = 0; index < panels.length; index += 1) {
    const left = (index % 2) * 440;
    const top = Math.floor(index / 2) * 180;
    const rendered = await sharp(panels[index].image).resize(400, 115, { fit: "contain", background: { r: 5, g: 7, b: 10, alpha: 1 } }).png().toBuffer();
    const label = Buffer.from(`<svg width="400" height="42" xmlns="http://www.w3.org/2000/svg"><style>.a{font:700 14px system-ui;letter-spacing:1.4px;fill:#e7c878}.b{font:500 9px system-ui;letter-spacing:1px;fill:#9da5b2}</style><text class="a" x="0" y="17">${panels[index].label}</text><text class="b" x="0" y="36">SAME ACTION · ACTUAL RUNTIME BODY</text></svg>`);
    composites.push({ input: label, left: left + 20, top: top + 12 }, { input: rendered, left: left + 20, top: top + 52 });
  }
  await sharp({ create: { width: 880, height: 360, channels: 4, background: { r: 5, g: 7, b: 10, alpha: 1 } } }).composite(composites).png().toFile(outputPath);
}

async function writePlugCorrectionBoard(
  rejected:Buffer,
  corrected:Buffer,
  suppliedMaster:Buffer,
  alignedOverlay:Buffer,
  outputPath:string,
) {
  const panels=await Promise.all([rejected,corrected,suppliedMaster,alignedOverlay].map((image)=>
    sharp(image).resize(560,260,{fit:"contain",background:{r:7,g:7,b:7,alpha:1}}).png().toBuffer(),
  ));
  const labels=[
    ["A · REJECTED RUNTIME","PHANTOM GOLD WINGS / SECONDARY CHASSIS"],
    ["B · CORRECTED RUNTIME","ONE BAR + ONE MASTERED PICK"],
    ["C · SUPPLIED SPOTIFY MASTER","IMMUTABLE PRODUCTION SOURCE"],
    ["D · RUNTIME / SOURCE OVERLAY","ALIGNED SILHOUETTE · NO ADDED FURNITURE"],
  ] as const;
  const composites:sharp.OverlayOptions[]=[];
  for(let index=0;index<panels.length;index+=1) {
    const left=(index%2)*600;
    const top=Math.floor(index/2)*340;
    const label=Buffer.from(`<svg width="570" height="58" xmlns="http://www.w3.org/2000/svg"><style>.a{font:700 16px system-ui;letter-spacing:1.5px;fill:#e7c878}.b{font:500 10px system-ui;letter-spacing:1px;fill:#a8afb9}</style><text class="a" x="0" y="19">${labels[index][0]}</text><text class="b" x="0" y="42">${labels[index][1]}</text></svg>`);
    composites.push({input:label,left:left+20,top:top+12},{input:panels[index],left:left+20,top:top+68});
  }
  await sharp({create:{width:1200,height:680,channels:4,background:{r:5,g:7,b:10,alpha:1}}}).composite(composites).png().toFile(outputPath);
}

test("Love & Theft persists seven Curated presentations and renders identical Preview and 390px Live Device authority",async({browser,page})=>{
  test.skip(!enabled,"Set EVERENCORE_LOVE_AND_THEFT_ACCEPTANCE=1 for the isolated local Studio runtime");
  test.setTimeout(180_000);
  page.setDefaultTimeout(15_000);
  mkdirSync(path.join(proofRoot,"golden"),{recursive:true});
  mkdirSync(path.join(proofRoot,"runtime"),{recursive:true});
  await page.setViewportSize({width:1440,height:960});
  await page.goto("/review/studio",{waitUntil:"networkidle"});
  await expect(page.getByTestId("studio-reconstitution-shell")).toBeVisible({timeout:60_000});
  const baselineResponse=await page.request.get("/api/card/draft");
  expect(baselineResponse.ok()).toBeTruthy();
  const baseline=await baselineResponse.json() as {draft:Record<string,unknown>;revision:number};
  const cabinetBefore=page.locator('[data-signature-family="cabinet-noir"]').first();
  await expect(cabinetBefore).toBeVisible();
  const cabinetAuthority={asset:await cabinetBefore.getAttribute("data-signature-asset-id"),sha:await cabinetBefore.getAttribute("data-signature-source-sha")};
  const entries=presentations.map(compilePresentation);
  const canonicalBaseline=structuredClone(baseline.draft) as TapConnectCardConfig;
  const activePageId=canonicalBaseline.experience?.defaultPageId;
  const draft=projectExperiencePage(canonicalBaseline,activePageId) as TapConnectCardConfig&{rootComposition?:{nodes?:RootNode[]}};
  if(!draft.rootComposition?.nodes) throw new Error("Review draft has no canonical root composition.");
  const leather=getMaterialRecipe("worn_saddle_leather");
  if(!leather) throw new Error("Worn Saddle Leather is unavailable.");
  draft.rootComposition=setCardEdgeMode({...(draft.rootComposition as unknown as CreativeCompositionBlock),background:compositionBackgroundFromMaterialRecipe(leather)},"full_bleed") as CreativeCompositionBlock & {nodes:RootNode[]};
  const rootNodes=draft.rootComposition.nodes!;
  const nextOrder=rootNodes.reduce((highest,node)=>Math.max(highest,Number(node.siblingOrder??-1)),-1)+1;
  entries.forEach((entry,index)=>{
    const density=EVERENCORE_LOVE_AND_THEFT_ASSEMBLY_RECIPES.find((recipe)=>recipe.presentation?.id===entry.state.input.presentationId)?.presentation?.density;
    rootNodes.push({
    id:`love-and-theft-proof-${index}`,primitive:"frame",compositionKind:"module",parentId:null,siblingOrder:nextOrder+index,x:0,y:0,width:1,height:1,
    minHeightPx:Math.ceil(entry.composition.phone390.heightPx),zIndex:nextOrder+index+1,name:presentations[index].label,visible:true,locked:false,anchor:"top-left",
    props:{componentKind:"curated-system",elementKind:"curated-system",curatedFamilyId:EVERENCORE_LOVE_AND_THEFT_FAMILY_ID,curatedLayoutMode:entry.state.input.layoutMode,curatedPresentationId:entry.state.input.presentationId,...(density?{curatedDensityMode:density.mode,flowWidthPercent:density.preferredFlowWidthPercent,flowAlignment:density.defaultFlowAlignment,minimumTouchTargetPx:density.minimumTouchTargetPx}:{})},
    moduleComposition:entry.composition.block,
    });
  });

  const mixedContainerId="love-and-theft-mixed-composition";
  const mixedEntry=entries.find((entry)=>entry.state.input.presentationId==="everencore-love-and-theft-standard-left")!;
  const mixedDensity=EVERENCORE_LOVE_AND_THEFT_ASSEMBLY_RECIPES.find((recipe)=>recipe.presentation?.id===mixedEntry.state.input.presentationId)!.presentation!.density!;
  rootNodes.push({
    id:mixedContainerId,primitive:"frame",compositionKind:"container",parentId:null,siblingOrder:nextOrder+entries.length,x:0,y:0,width:1,height:.4,zIndex:nextOrder+entries.length+1,name:"Love & Theft Mixed Composition",visible:true,locked:false,anchor:"top-left",
    props:{componentKind:"container",elementKind:"container",layout:"layered",layeredHeightPx:280,padding:8,gap:0,containerTreatment:"transparent",fill:"transparent",borderWidth:0,radius:0},
  });
  rootNodes.push({
    id:"love-and-theft-mixed-image",primitive:"image",compositionKind:"module",parentId:mixedContainerId,siblingOrder:0,x:.02,y:.04,width:.4,height:.92,zIndex:1,name:"Venue image",visible:true,locked:false,anchor:"top-left",
    props:{componentKind:"image",elementKind:"image",src:"/marketing/use-cases/venues.jpg",alt:"Concert venue atmosphere",fit:"cover",outlineRadius:18},
  });
  rootNodes.push({
    id:"love-and-theft-mixed-copy",primitive:"text",compositionKind:"module",parentId:mixedContainerId,siblingOrder:1,x:.47,y:.06,width:.5,height:.2,zIndex:2,name:"Artist action heading",visible:true,locked:false,anchor:"top-left",
    props:{componentKind:"text",elementKind:"text",text:"YOUR NIGHT. YOUR MUSIC.",color:"#f7e7cf",fontSize:17,fontWeight:700,letterSpacing:.12,textAlign:"left",textMinHeightPx:44},
  });
  rootNodes.push({
    id:"love-and-theft-mixed-action",primitive:"frame",compositionKind:"module",parentId:mixedContainerId,siblingOrder:2,x:.43,y:.32,width:.56,height:.38,zIndex:3,name:"Love & Theft Mixed Medium Action",visible:true,locked:false,anchor:"top-left",
    minHeightPx:Math.ceil(mixedEntry.composition.phone390.heightPx),
    props:{componentKind:"curated-system",elementKind:"curated-system",curatedFamilyId:EVERENCORE_LOVE_AND_THEFT_FAMILY_ID,curatedLayoutMode:mixedEntry.state.input.layoutMode,curatedPresentationId:mixedEntry.state.input.presentationId,curatedDensityMode:mixedDensity.mode,flowWidthPercent:mixedDensity.preferredFlowWidthPercent,flowAlignment:mixedDensity.defaultFlowAlignment,minimumTouchTargetPx:mixedDensity.minimumTouchTargetPx},
    moduleComposition:{...mixedEntry.composition.block,id:"proof-everencore-love-and-theft-mixed",label:"Love & Theft Mixed Medium Action"},
  });

  let phoneContext:Awaited<ReturnType<typeof browser.newContext>>|undefined;
  try {
    const save=await page.request.put("/api/card/draft",{data:{draft:canonicalizeExperienceConfig(draft,activePageId),expectedRevision:baseline.revision}});
    expect(save.ok()).toBeTruthy();
    await page.reload({waitUntil:"networkidle"});
    const cabinetAfter=page.locator('[data-signature-family="cabinet-noir"]').first();
    await expect(cabinetAfter).toBeVisible();
    expect({asset:await cabinetAfter.getAttribute("data-signature-asset-id"),sha:await cabinetAfter.getAttribute("data-signature-source-sha")}).toEqual(cabinetAuthority);

    await page.getByTestId("studio-rail-add").click();
    await page.getByTestId("studio-add-buttons").click();
    const family=page.getByTestId(`studio-button-family-${EVERENCORE_LOVE_AND_THEFT_FAMILY_ID}`);
    await expect(family).toBeVisible();
    await expect(family).toContainText("Love & Theft");
    await family.click();
    for(const recipe of EVERENCORE_LOVE_AND_THEFT_ASSEMBLY_RECIPES) await expect(page.getByText(recipe.presentation!.label,{exact:true})).toBeVisible();
    await page.getByRole("button",{name:"Close drawer",exact:true}).click();

    for(const definition of presentations) await expect(page.getByRole("group",{name:definition.label,exact:true})).toBeVisible();
    await expect(page.getByText("Stream the new single",{exact:true})).toBeVisible();
    await expect(page.getByText("Love & Theft · official release",{exact:true})).toBeVisible();
    await expect(page.locator('[data-signature-semantic-icon="simple-icons:apple-music"]')).toBeVisible();
    const productionMasters={
      smoky_black_glass:"smoky-black-glass.png",
      burgundy_plum_glass:"burgundy-plum.png",
      frosted_charcoal:"frosted-charcoal.png",
      deep_blue_glass:"deep-blue-glass.png",
    } as const;
    for(const [material,source] of Object.entries(productionMasters)) {
      const renderedMaster=page.locator(`[data-signature-material-source$="${source}"]`).filter({has:page.locator(`[data-signature-material-id="${material}"][data-material-fill-authority="production-master"]`)}).first();
      await expect(renderedMaster).toBeVisible();
    }
    const reflectedActions=page.locator(`[data-signature-family="${EVERENCORE_LOVE_AND_THEFT_FAMILY_ID}"][data-signature-classification="live-action"]`);
    expect(await reflectedActions.count()).toBeGreaterThan(0);
    for(let index=0;index<await reflectedActions.count();index+=1) await expect(reflectedActions.nth(index)).toHaveAttribute("data-signature-background-reflection","48");
    const treatmentJourney = [
      { label:"Smoky Black Glass", material:"smoky_black_glass" },
      { label:"Burgundy Plum", material:"burgundy_plum_glass" },
      { label:"Frosted Charcoal", material:"frosted_charcoal" },
      { label:"Deep Blue Glass", material:"deep_blue_glass" },
    ] as const;
    const treatmentBuffers: Array<{label:string;image:Buffer}> = [];
    for(let index=0;index<treatmentJourney.length;index+=1) {
      const treatment=treatmentJourney[index];
      let target=page.getByRole("group",{name:"Love & Theft Body Only Curated System",exact:true});
      await expect(target).toBeVisible();
      if(index>0) {
        await target.click();
        await page.getByTestId("studio-curated-selection-identity").click();
        const inspector=page.getByTestId("studio-assembly-inspector");
        await expect(inspector).toBeVisible();
        await inspector.getByTestId("studio-visual-browser-trigger").click();
        const treatmentBrowser=page.getByTestId("studio-visual-browser");
        await expect(treatmentBrowser).toBeVisible();
        await treatmentBrowser.getByRole("option",{name:treatment.label,exact:true}).click();
        await expect(treatmentBrowser).toHaveCount(0);
      }
      await expect(target.locator(`[data-signature-material-id="${treatment.material}"][data-material-fill-authority="production-master"]`).first()).toBeVisible();
      treatmentBuffers.push({ label:treatment.label, image:await target.screenshot({path:path.join(proofRoot,"runtime",`treatment-selection-${treatment.material}-studio.png`)}) });
      if(index>0) {
        if(await page.getByTestId("studio-save").isEnabled()) await page.getByTestId("studio-save").click();
        await expect(page.getByText("Saved",{exact:true}).first()).toBeVisible();
        await page.reload({waitUntil:"networkidle"});
        target=page.getByRole("group",{name:"Love & Theft Body Only Curated System",exact:true});
        await expect(target.locator(`[data-signature-material-id="${treatment.material}"][data-material-fill-authority="production-master"]`).first()).toBeVisible();
      }
    }
    await writeTreatmentAcceptanceBoard(treatmentBuffers,path.join(proofRoot,"runtime","same-action-four-treatment-runtime-board.png"));
    const editProof=await page.locator(`[data-signature-family="${EVERENCORE_LOVE_AND_THEFT_FAMILY_ID}"]`).evaluateAll((elements)=>elements.map((element)=>({asset:element.getAttribute("data-signature-asset-id"),presentation:element.getAttribute("data-signature-presentation-id"),material:element.querySelector("[data-signature-material-id]")?.getAttribute("data-signature-material-id")??element.getAttribute("data-signature-material-id"),icon:element.getAttribute("data-signature-icon")})));

    await page.getByTestId("studio-preview").click();
    await expect(page.getByTestId("studio-editor-rail")).toHaveCount(0);
    const previewProof=await page.locator(`[data-signature-family="${EVERENCORE_LOVE_AND_THEFT_FAMILY_ID}"]`).evaluateAll((elements)=>elements.map((element)=>({asset:element.getAttribute("data-signature-asset-id"),presentation:element.getAttribute("data-signature-presentation-id"),material:element.querySelector("[data-signature-material-id]")?.getAttribute("data-signature-material-id")??element.getAttribute("data-signature-material-id"),icon:element.getAttribute("data-signature-icon")})));
    expect(previewProof).toEqual(editProof);
    for(const definition of presentations) await page.getByRole("group",{name:definition.label,exact:true}).screenshot({path:path.join(proofRoot,"runtime",`${definition.id}-preview.png`)});
    await page.screenshot({path:path.join(proofRoot,"runtime","preview-gallery.png"),fullPage:true});
    await page.getByTestId("studio-preview").click();

    await page.getByTestId("preview-live-device").click();
    await expect(page.getByTestId("live-device-qr-panel")).toHaveAttribute("data-preview-status","ready",{timeout:15_000});
    const candidate=(await page.getByTestId("preview-url-text").getAttribute("href"))||"";
    const candidateUrl=new URL(candidate);
    phoneContext=await browser.newContext({viewport:{width:390,height:844}});
    expect(await phoneContext.cookies()).toEqual([]);
    const phone=await phoneContext.newPage();
    await phone.goto(`http://127.0.0.1:3050${candidateUrl.pathname}${candidateUrl.search}`,{waitUntil:"networkidle"});
    await expect(phone.getByTestId("preview-live-page")).toBeVisible();
    const phoneFamily=phone.locator(`[data-signature-family="${EVERENCORE_LOVE_AND_THEFT_FAMILY_ID}"]`);
    await expect(phoneFamily.first()).toBeVisible();
    const fullBleed=phone.locator('[data-card-surface-viewport-backdrop="true"]');
    await expect(fullBleed).toBeVisible();
    const bleedMetrics=await fullBleed.evaluate((element)=>{const rect=element.getBoundingClientRect();return{left:rect.left,right:rect.right,width:rect.width,backgroundImage:getComputedStyle(element).backgroundImage};});
    expect(bleedMetrics.left).toBe(0);
    expect(bleedMetrics.right).toBe(390);
    expect(bleedMetrics.width).toBe(390);
    expect(bleedMetrics.backgroundImage).toContain("SURFACE-LEATHER-001_worn-saddle-leather.png");
    const overflow=await phoneFamily.evaluateAll((elements)=>elements.some((element)=>{const rect=element.getBoundingClientRect();return rect.left < -1 || rect.right > window.innerWidth+1 || rect.width<1 || rect.height<1;}));
    expect(overflow).toBe(false);
    const actions=phone.locator(`[data-signature-family="${EVERENCORE_LOVE_AND_THEFT_FAMILY_ID}"][data-signature-classification="live-action"]`).locator("xpath=ancestor::a[1]");
    expect(await actions.count()).toBe(presentations.reduce((total,presentation)=>total+presentation.count,0)+1);
    for(let index=0;index<await actions.count();index+=1) expect((await actions.nth(index).boundingBox())?.height??0).toBeGreaterThanOrEqual(44);
    const masteredPicks=phone.locator(`[data-signature-family="${EVERENCORE_LOVE_AND_THEFT_FAMILY_ID}"][data-signature-role="semantic-plug"]`);
    expect(await masteredPicks.count()).toBeGreaterThan(0);
    for(let index=0;index<await masteredPicks.count();index+=1) {
      const pick=masteredPicks.nth(index);
      await expect(pick).toHaveAttribute("data-signature-plug-visual-mode","mastered-chassis");
      await expect(pick.locator(":scope > .signature-master__asset")).toHaveCount(1);
      await expect(pick.locator(":scope > .signature-master__depth")).toHaveCount(0);
      await expect(pick.locator(":scope > .signature-master__material-surface")).toHaveCount(0);
      await expect(pick.locator(":scope > .signature-master__semantic-icon")).toHaveCount(0);
    }

    for(const definition of presentations) {
      const group=phone.getByRole("group",{name:definition.label,exact:true});
      await expect(group).toHaveAttribute("data-curated-surface-shell","none");
      const shell=await group.evaluate((element)=>{const style=getComputedStyle(element);return{border:style.borderTopWidth,radius:style.borderTopLeftRadius,padding:style.paddingTop,overflow:style.overflow};});
      expect(shell).toEqual({border:"0px",radius:"0px",padding:"0px",overflow:"visible"});
    }
    const mediumLeft=phone.getByRole("group",{name:"Love & Theft Standard Left",exact:true});
    const [pickBox,barBox,assemblyBox]=await Promise.all([
      mediumLeft.locator('[data-signature-role="semantic-plug"]').first().boundingBox(),
      mediumLeft.locator('[data-signature-kind="action"]').first().boundingBox(),
      mediumLeft.boundingBox(),
    ]);
    expect(pickBox).not.toBeNull();
    expect(barBox).not.toBeNull();
    expect(assemblyBox).not.toBeNull();
    expect(pickBox!.x).toBeLessThan(barBox!.x+barBox!.width);
    expect(pickBox!.x+pickBox!.width).toBeGreaterThan(barBox!.x);
    expect(pickBox!.y).toBeLessThan(barBox!.y+barBox!.height);
    expect(pickBox!.y+pickBox!.height).toBeGreaterThan(barBox!.y);
    expect(assemblyBox!.width).toBeLessThan(390);

    const densityCounts=await phone.locator('[data-curated-density]').evaluateAll((elements)=>elements.reduce<Record<string,number>>((counts,element)=>{const key=element.getAttribute("data-curated-density")||"unknown";counts[key]=(counts[key]||0)+1;return counts;},{}));
    expect(densityCounts.full).toBeGreaterThanOrEqual(1);
    expect(densityCounts.medium).toBeGreaterThanOrEqual(5);
    expect(densityCounts.compact).toBeGreaterThanOrEqual(2);

    const cabinetBenchmark=phone.locator('[data-signature-family="cabinet-noir"][data-signature-kind="action"]').first();
    await expect(cabinetBenchmark).toBeVisible();
    const cabinetBuffer=readFileSync(path.join("docs","product-reconstitution","creative-studio-platform","proofs","cabinet-noir-compact-stacked","01-current-standalone-action.png"));
    await phone.getByTestId("live-device-debug-evidence").evaluate((element)=>{(element as HTMLElement).style.display="none";});
    let heroBuffer:Buffer|undefined;
    const presentationBuffers=new Map<string,Buffer>();
    for(const definition of presentations) {
      const group=phone.getByRole("group",{name:definition.label,exact:true});
      await expect(group).toBeVisible();
      const buffer=await group.screenshot({path:path.join(proofRoot,"runtime",`${definition.id}-phone390.png`)});
      presentationBuffers.set(definition.id,buffer);
      if(definition.id==="everencore-love-and-theft-hero") heroBuffer=buffer;
      await expectAcceptedGolden(buffer,path.join(proofRoot,"golden",`${definition.id}-phone390.png`));
    }
    const spotifyActionId=entries.find((entry)=>entry.state.input.presentationId==="everencore-love-and-theft-single-stack")!.state.input.actions[0].id;
    const spotifyBar=phone.locator(`[data-signature-action-id="${spotifyActionId}"][data-signature-classification="live-action"]`).first();
    const spotifyPick=phone.locator(`[data-signature-action-id="${spotifyActionId}"][data-signature-role="semantic-plug"]`).first();
    await spotifyBar.scrollIntoViewIfNeeded();
    const [spotifyBarBox,spotifyPickBox]=await Promise.all([spotifyBar.boundingBox(),spotifyPick.boundingBox()]);
    if(!spotifyBarBox||!spotifyPickBox) throw new Error("Spotify action proof geometry is unavailable.");
    const proofClip={
      x:Math.max(0,Math.min(spotifyBarBox.x,spotifyPickBox.x)),
      y:Math.max(0,Math.min(spotifyBarBox.y,spotifyPickBox.y)),
      width:Math.min(390,Math.max(spotifyBarBox.x+spotifyBarBox.width,spotifyPickBox.x+spotifyPickBox.width)-Math.min(spotifyBarBox.x,spotifyPickBox.x)),
      height:Math.max(spotifyBarBox.y+spotifyBarBox.height,spotifyPickBox.y+spotifyPickBox.height)-Math.min(spotifyBarBox.y,spotifyPickBox.y),
    };
    const correctedSpotifyBuffer=await phone.screenshot({clip:proofClip,path:path.join(proofRoot,"runtime","corrected-spotify-action-phone390.png")});
    const mixedBuffer=await phone.locator(`[data-composition-node="${mixedContainerId}"]`).screenshot({path:path.join(proofRoot,"runtime","love-and-theft-mixed-composition-phone390.png")});
    if(!heroBuffer) throw new Error("Love & Theft Hero proof was not captured.");
    await writeBeforeAfter(
      readFileSync(path.join(proofRoot,"before","everencore-love-and-theft-hero-phone390-before.png")),
      heroBuffer,
      path.join(proofRoot,"runtime","love-and-theft-hero-before-after-board.png"),
    );
    await writeQualityComparison(cabinetBuffer,heroBuffer,path.join(proofRoot,"runtime","love-and-theft-vs-cabinet-noir-quality-board.png"));
    const targetImage=process.env.LOVE_AND_THEFT_TARGET_IMAGE;
    if(targetImage&&existsSync(targetImage)) {
      await writeAuthorityComparison(readFileSync(targetImage),cabinetBuffer,heroBuffer,path.join(proofRoot,"runtime","love-and-theft-reference-cabinet-runtime-board.png"));
    }
    await phone.getByRole("group",{name:"Love & Theft Hero Action",exact:true}).scrollIntoViewIfNeeded();
    const phoneViewportBuffer=await phone.screenshot({path:path.join(proofRoot,"runtime","live-device-viewport-phone390.png")});
    await phone.screenshot({path:path.join(proofRoot,"runtime","live-device-gallery-phone390.png"),fullPage:true});
    await writeGeometryAcceptanceBoard([
      {label:"01 · FULL / HERO",detail:"NEAR-FULL WIDTH · INTEGRATED PICK",image:presentationBuffers.get("everencore-love-and-theft-hero")!},
      {label:"02 · MEDIUM / LEFT",detail:"PICK OVERLAPS BAR · NO OUTER CARD",image:presentationBuffers.get("everencore-love-and-theft-standard-left")!},
      {label:"03 · MEDIUM / RIGHT",detail:"RIGHT DOCK · LIVE TEXT SAFE AREA",image:presentationBuffers.get("everencore-love-and-theft-standard-right")!},
      {label:"04 · UTILITY / BODY ONLY",detail:"COMPLETE GLASS BODY · NO PICK",image:presentationBuffers.get("everencore-love-and-theft-standard-body")!},
      {label:"05 · COMPACT",detail:"BRASS INSERT · SECONDARY ACTION",image:presentationBuffers.get("everencore-love-and-theft-standard-utility")!},
      {label:"06 · TWIN / PAIRED",detail:"COMPACT RAIL · TOUCH-SAFE",image:presentationBuffers.get("everencore-love-and-theft-twin-rail")!},
      {label:"07 · MIXED COMPOSITION",detail:"EXISTING LAYERED CONTAINER · IMAGE + TEXT + ACTION",image:mixedBuffer},
      {label:"08 · 390PX PHONE",detail:"FULL-BLEED SURFACE · DENSE VISITOR FLOW",image:phoneViewportBuffer},
    ],path.join(proofRoot,"runtime","love-and-theft-binding-geometry-board.png"));
    const pickSize=Math.max(1,Math.round(spotifyPickBox.width));
    const runtimePickBuffer=await phone.evaluate(({actionId,size})=>{
      const original=document.querySelector<HTMLElement>(`[data-signature-action-id="${actionId}"][data-signature-role="semantic-plug"]`);
      if(!original) throw new Error("Spotify mastered pick is unavailable.");
      const probe=document.createElement("div");
      probe.id="mastered-pick-proof";
      Object.assign(probe.style,{position:"fixed",left:"0",top:"0",width:`${size}px`,height:`${size}px`,zIndex:"2147483647"});
      probe.append(original.cloneNode(true));
      document.body.replaceChildren(probe);
      document.documentElement.style.background="transparent";
      document.body.style.background="transparent";
      document.body.style.margin="0";
      return true;
    },{actionId:spotifyActionId,size:pickSize}).then(async()=>phone.locator("#mastered-pick-proof").screenshot({omitBackground:true,path:path.join(proofRoot,"runtime","corrected-runtime-spotify-pick-transparent.png")}));
    const suppliedMasterPath=path.join("public","visual-parts","signature","everencore","love-and-theft","v1","03-pick-plugs","EE-LT-PICK-002_spotify.png");
    const suppliedMaster=readFileSync(suppliedMasterPath);
    const sourceAtRuntime=await sharp(suppliedMaster).resize(pickSize,pickSize).png().toBuffer();
    const [sourcePixels,runtimePixels]=await Promise.all([
      sharp(sourceAtRuntime).ensureAlpha().raw().toBuffer({resolveWithObject:true}),
      sharp(runtimePickBuffer).resize(pickSize,pickSize).ensureAlpha().raw().toBuffer({resolveWithObject:true}),
    ]);
    const overlayPixels=Buffer.alloc(sourcePixels.data.length);
    let silhouetteUnionPixels=0;
    let silhouetteDifferencePixels=0;
    let rendererAddedPixels=0;
    let rendererAddedBeyondAntialiasPixels=0;
    for(let offset=0;offset<overlayPixels.length;offset+=4) {
      overlayPixels[offset]=Math.round((sourcePixels.data[offset]+runtimePixels.data[offset])/2);
      overlayPixels[offset+1]=Math.round((sourcePixels.data[offset+1]+runtimePixels.data[offset+1])/2);
      overlayPixels[offset+2]=Math.round((sourcePixels.data[offset+2]+runtimePixels.data[offset+2])/2);
      overlayPixels[offset+3]=Math.max(sourcePixels.data[offset+3],runtimePixels.data[offset+3]);
      const sourceVisible=sourcePixels.data[offset+3]>16;
      const runtimeVisible=runtimePixels.data[offset+3]>16;
      if(sourceVisible||runtimeVisible) silhouetteUnionPixels+=1;
      if(sourceVisible!==runtimeVisible) silhouetteDifferencePixels+=1;
      if(!sourceVisible&&runtimeVisible) {
        rendererAddedPixels+=1;
        const pixelIndex=offset/4;
        const x=pixelIndex%pickSize;
        const y=Math.floor(pixelIndex/pickSize);
        let sourceNeighborVisible=false;
        for(let neighborY=Math.max(0,y-1);neighborY<=Math.min(pickSize-1,y+1)&&!sourceNeighborVisible;neighborY+=1) {
          for(let neighborX=Math.max(0,x-1);neighborX<=Math.min(pickSize-1,x+1);neighborX+=1) {
            if(sourcePixels.data[(neighborY*pickSize+neighborX)*4+3]>16) {
              sourceNeighborVisible=true;
              break;
            }
          }
        }
        if(!sourceNeighborVisible) rendererAddedBeyondAntialiasPixels+=1;
      }
    }
    const rendererAddedPercent=rendererAddedPixels/Math.max(1,silhouetteUnionPixels);
    const rendererAddedBeyondAntialiasPercent=rendererAddedBeyondAntialiasPixels/Math.max(1,silhouetteUnionPixels);
    // Browser interpolation may add a one-device-pixel alpha fringe around a
    // resized transparent PNG. Pixels beyond that fringe would indicate actual
    // renderer-created furniture and remain prohibited.
    expect(rendererAddedBeyondAntialiasPercent).toBeLessThanOrEqual(.005);
    const alignedOverlay=await sharp(overlayPixels,{raw:{width:pickSize,height:pickSize,channels:4}}).png().toBuffer();
    writeFileSync(path.join(proofRoot,"runtime","spotify-pick-source-runtime-overlay.png"),alignedOverlay);
    writeFileSync(path.join(proofRoot,"runtime","spotify-pick-silhouette-proof.json"),`${JSON.stringify({
      source:"EE-LT-PICK-002_spotify.png",
      runtimeSizePx:pickSize,
      silhouetteUnionPixels,
      silhouetteDifferencePixels,
      rendererAddedPixels,
      rendererAddedPercent:Number((rendererAddedPercent*100).toFixed(3)),
      rendererAddedBeyondAntialiasPixels,
      rendererAddedBeyondAntialiasPercent:Number((rendererAddedBeyondAntialiasPercent*100).toFixed(3)),
      allowedBrowserAntialiasFringePx:1,
      thresholdAlpha:16,
      requiredMaximumRendererAddedPercent:.5,
    },null,2)}\n`);
    const rejectedInput=process.env.LOVE_AND_THEFT_REJECTED_IMAGE||path.join(proofRoot,"before","rejected-spotify-action.png");
    expect(existsSync(rejectedInput),"Provide LOVE_AND_THEFT_REJECTED_IMAGE for the first plug-correction proof run.").toBeTruthy();
    const rejected=readFileSync(rejectedInput);
    if(process.env.LOVE_AND_THEFT_REJECTED_IMAGE) writeFileSync(path.join(proofRoot,"before","rejected-spotify-action.png"),rejected);
    await writePlugCorrectionBoard(rejected,correctedSpotifyBuffer,suppliedMaster,alignedOverlay,path.join(proofRoot,"runtime","spotify-plug-before-after-source-overlay.png"));
    writeFileSync(path.join(proofRoot,"runtime","acceptance.json"),`${JSON.stringify({familyId:EVERENCORE_LOVE_AND_THEFT_FAMILY_ID,route:EVERENCORE_LOVE_AND_THEFT_VISUAL_ACCEPTANCE.deterministicRuntimeRoute,viewport:EVERENCORE_LOVE_AND_THEFT_VISUAL_ACCEPTANCE.viewport,presentations:EVERENCORE_LOVE_AND_THEFT_VISUAL_ACCEPTANCE.presentations,checks:{saveReload:true,actualTreatmentControlRoundTrip:true,certifiedTreatments:treatmentJourney.map((treatment)=>treatment.material),previewParity:true,liveDeviceCookieFree:true,noHorizontalOverflow:true,noOuterActionCard:true,pickBarOverlap:true,masteredChassisSourceOnly:true,secondaryPlugFurnitureCount:0,rendererAddedSilhouettePercent:Number((rendererAddedPercent*100).toFixed(3)),rendererAddedBeyondAntialiasPercent:Number((rendererAddedBeyondAntialiasPercent*100).toFixed(3)),semanticDensityModes:["full","medium","compact"],mixedLayeredComposition:true,minimumTouchTargetPx:44}},null,2)}\n`);
  } finally {
    await phoneContext?.close();
    const currentResponse=await page.request.get("/api/card/draft");
    if(currentResponse.ok()) {
      const current=await currentResponse.json() as {revision:number};
      const restore=await page.request.put("/api/card/draft",{data:{draft:baseline.draft,expectedRevision:current.revision}});
      expect(restore.ok()).toBeTruthy();
    }
  }
});
