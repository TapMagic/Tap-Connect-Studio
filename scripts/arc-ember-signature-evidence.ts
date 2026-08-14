import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { SIGNATURE_ASSETS, SIGNATURE_FAMILIES, SIGNATURE_SUBGROUPS } from "../lib/fusion/creative-studio/signature-assets/registry";
import { SIGNATURE_LAYOUT_RECIPES } from "../lib/fusion/creative-studio/signature-assets/layout-recipes";

const output=path.join(process.cwd(),"tmp/arc-ember-complete-signature-family");
mkdirSync(output,{recursive:true});
const write=(name:string,value:unknown)=>writeFileSync(path.join(output,name),`${JSON.stringify(value,null,2)}\n`);
write("asset-map.json",{
  generatedFrom:"generic Signature asset registry",
  family:SIGNATURE_FAMILIES[0],
  assets:SIGNATURE_ASSETS,
  referenceExclusions:{
    combinedDoubleStack:"99_review_not_production/double-stack_combined-reference_DO-NOT-INGEST.png",
    reason:"Double Stack is STACK-2 over independent stack-row actions; baked combined reference is not customer selectable."
  },
  pairedRodsClarification:{stableId:"master/arc-ember/divider/paired-rods/v1",classification:"approved production asset",originalFilename:"a6ebc5dd-c542-44ae-a78b-0d183f0c6794.png"}
});
write("socket-map.json",{
  familyId:SIGNATURE_FAMILIES[0].id,
  sockets:SIGNATURE_ASSETS.map(({id,assetKind,safeInsets,glowPadding,socketContract,nestingCapabilities,responsiveContract})=>({id,assetKind,safeInsets,glowPadding,socketContract,nestingCapabilities,responsiveContract})),
  layoutRecipes:SIGNATURE_LAYOUT_RECIPES,
});
write("drawer-map.json",{
  root:"Visual Parts",
  branches:[{id:"buttons",label:"Buttons",scope:"Foundation / functional controls only"},{id:"signature",label:"Signature",families:SIGNATURE_FAMILIES.map((family)=>({id:family.id,label:family.label,subgroups:SIGNATURE_SUBGROUPS}))}],
  referenceVisible:false,
});
