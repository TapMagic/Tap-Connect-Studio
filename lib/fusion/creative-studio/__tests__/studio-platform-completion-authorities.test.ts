import assert from "node:assert/strict";
import test from "node:test";
import { resolveStudioControlAvailability, studioControlProps } from "../platform/control-availability";
import { editableControlOwnsKeyboard, studioModuleActivationMayRun, studioShortcutMayRun } from "../platform/keyboard-ownership";
import { resolveOrdinaryModuleCapability } from "../platform/ordinary-module-authoring";
import { createCompositionNode } from "../composition";
import { resolveStudioChromePlacement } from "../platform/workspace-collision";

test("unavailable controls require and expose a dependency reason", () => {
  assert.throws(() => resolveStudioControlAvailability({ availability:"disabled", governance:"direct" }));
  const state=resolveStudioControlAvailability({availability:"disabled",governance:"direct",dependency:"image-asset",disabledReason:"Choose an image first."});
  assert.equal(studioControlProps(state).disabled,true);
  assert.equal(studioControlProps(state)["data-disabled-reason"],"Choose an image first.");
});

test("editable targets own text entry, editing chords, and IME before Studio shortcuts", () => {
  const input=documentElement("input");
  assert.equal(editableControlOwnsKeyboard(event(input," ")),true);
  assert.equal(studioShortcutMayRun(event(input,"z",{metaKey:true})),false);
  assert.equal(studioShortcutMayRun(event(documentElement("div"),"z",{metaKey:true})),true);
  assert.equal(studioShortcutMayRun(event(documentElement("div"),"Process",{isComposing:true})),false);
});

test("module activation never steals Space or Enter from nested editable owners", () => {
  const wrapper = documentElement("div");
  for (const tag of ["input", "textarea", "select", "contenteditable", "textbox", "declared-owner"]) {
    const editable = documentElement(tag);
    for (const key of [" ", "Enter"]) assert.equal(studioModuleActivationMayRun(event(editable, key), wrapper), false, `${tag} owns ${key}`);
  }
  assert.equal(studioModuleActivationMayRun(event(wrapper, "Enter"), wrapper), true);
  assert.equal(studioModuleActivationMayRun(event(wrapper, " "), wrapper), true);
  assert.equal(studioModuleActivationMayRun(event(wrapper, "Process", { isComposing: true }), wrapper), false);
});

test("ordinary modules declare substantial shared capability groups", () => {
  const text=resolveOrdinaryModuleCapability(createCompositionNode("text",{props:{elementKind:"text"}}))!;
  const divider=resolveOrdinaryModuleCapability(createCompositionNode("border",{props:{elementKind:"divider"}}))!;
  const button=resolveOrdinaryModuleCapability(createCompositionNode("button",{props:{elementKind:"button",showIcon:false}}))!;
  assert.deepEqual(text.groups,["content","text","spacing","position","accessibility"]);
  assert.ok(divider.groups.includes("edge")&&divider.groups.includes("spacing"));
  assert.ok(button.groups.includes("action")&&button.groups.includes("icon")&&button.groups.includes("accessibility"));
  assert.equal(button.controls.iconPresentation.availability,"disabled");
});

test("selected chrome prefers external placement and falls back at viewport edges", () => {
  assert.equal(resolveStudioChromePlacement({objectTop:200,objectBottom:260,viewportTop:0,viewportBottom:700,requiredPx:44,inspectorOnEnd:false}),"outside-start");
  assert.equal(resolveStudioChromePlacement({objectTop:2,objectBottom:698,viewportTop:0,viewportBottom:700,requiredPx:44,inspectorOnEnd:true}),"edge-start");
});

function documentElement(tag:string) { const selectors:Record<string,string>={contenteditable:"contenteditable",textbox:"role='textbox'","declared-owner":"data-studio-keyboard-owner='text-entry'"}; return { tagName:tag.toUpperCase(), closest:(selector:string)=>selector.includes(selectors[tag] || tag)?true:null } as unknown as HTMLElement; }
function event(target:EventTarget,key:string,patch:Partial<{metaKey:boolean;ctrlKey:boolean;altKey:boolean;isComposing:boolean}>={}) { return {target,key,defaultPrevented:false,isComposing:false,metaKey:false,ctrlKey:false,altKey:false,...patch}; }
