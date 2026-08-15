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
  pairedRodsClarification:{stableId:"master/arc-ember/divider/paired-rods/v1",classification:"approved production asset",originalFilename:"05-double-electic-rod.png",sourceSha256:"f1467a49addf1453fee647b3b48b2da199d65e97d00689ebd6780dd9fb0b7c73",replacesOpaqueAuthority:true}
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
