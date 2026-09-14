import test from 'node:test';
import assert from 'node:assert/strict';
import { freshConfig } from '../src/config/office';
import { AC_PREVIOUS_STORAGE_KEY, loadConfig, STORAGE_KEY, upgradeAirConditionerLayout, validateConfig } from '../src/config/storage';

function previousScene() {
  const config=freshConfig(); delete config.room.airConditioner;
  config.furniture.find(f=>f.id==='chair')!.position.x=-.45;
  config.room.openings[0].windowDetail!.frameColor='#514839';
  config.room.baseboardLED.color='#bb3344';
  return validateConfig(config);
}

test('the AC upgrade adds only the fixture and preserves every approved room and furniture value', () => {
  const previous=previousScene(),snapshot=structuredClone(previous),next=upgradeAirConditionerLayout(previous);
  assert.deepEqual(previous,snapshot,'Never mutate the previous browser save');
  assert.deepEqual(next.room.airConditioner,freshConfig().room.airConditioner);
  const withoutAC=structuredClone(next);delete withoutAC.room.airConditioner;
  assert.deepEqual(withoutAC,previous,'Adding the AC cannot move or restyle existing items');
  assert.deepEqual(upgradeAirConditionerLayout(next),next);
  next.room.airConditioner!.enabled=false;next.room.airConditioner!.offset=-.4;
  assert.deepEqual(upgradeAirConditionerLayout(next),next,'A configured/disabled AC keeps its settings');
  assert.equal(validateConfig(previous).room.airConditioner,undefined,'Explicit old imports stay as imported');
});

test('browser upgrade backs up v5 and safely retains custom layouts that cannot fit the AC', () => {
  const descriptor=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  const saved=new Map<string,string>();
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(key:string)=>saved.get(key)??null,setItem:(key:string,value:string)=>saved.set(key,value)}});
  try {
    const previous=previousScene(),json=JSON.stringify(previous);
    saved.set(AC_PREVIOUS_STORAGE_KEY,json);
    const result=loadConfig();assert.ok(result.config.room.airConditioner?.enabled);
    assert.equal(saved.get(AC_PREVIOUS_STORAGE_KEY),json);assert.ok(saved.has(STORAGE_KEY));
    saved.clear();
    // A customized thick exterior wall needs a deeper casing; do not alter that wall
    // or force the default unit to end inside it during the automatic upgrade.
    previous.room.wallThickness=.4;
    validateConfig(previous);
    saved.set(AC_PREVIOUS_STORAGE_KEY,JSON.stringify(previous));
    const kept=loadConfig();
    assert.deepEqual(kept.config,previous);assert.match(kept.warning!,/scene was kept unchanged/);
    assert.equal(saved.has(STORAGE_KEY),false,'Do not replace an approved layout with a conflicting installation');
  } finally {
    if(descriptor) Object.defineProperty(globalThis,'localStorage',descriptor);
    else delete (globalThis as any).localStorage;
  }
});

test('AC validation rejects window/soffit collisions and casings that do not pass through the wall', () => {
  const invalid=(edit:(config:ReturnType<typeof freshConfig>)=>void,pattern:RegExp)=>{
    const config=freshConfig();edit(config);assert.throws(()=>validateConfig(config),pattern);
  };
  invalid(c=>{c.room.airConditioner!.offset=.4;},/clear of the existing window/);
  invalid(c=>{c.room.airConditioner!.bottom=2.08;},/soffit/);
  invalid(c=>{c.room.airConditioner!.depth=.32;},/rear casing extending outside/);
  invalid(c=>{c.room.airConditioner!.louverYaw=NaN;},/outlet angle/);
  invalid(c=>{c.room.airConditioner!.bottom=1.1;c.room.airConditioner!.interiorProjection=.35;},/air conditioner|corner step or soffit/);
});
