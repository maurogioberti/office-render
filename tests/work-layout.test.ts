import test from 'node:test';
import assert from 'node:assert/strict';
import { freshConfig } from '../src/config/office';
import { loadConfig, PREVIOUS_STORAGE_KEY, STORAGE_KEY, upgradeWorkLayout, validateConfig } from '../src/config/storage';
import { removeFurnitureTree, resizeCornerDesk } from '../src/furniture/deskLayout';
import { worldTransform } from '../src/navigation/collision';

function approvedLayout() {
  const config=freshConfig();
  removeFurnitureTree(config,'work-zone');
  resizeCornerDesk(config,config.furniture.find(f=>f.id==='desk')!,1.5,1.8);
  // Actual user edits to the approved room and independent personal station must survive.
  config.room.wallFinishes.north.color='#dedbd4';
  config.room.openings[0].windowDetail!.frameColor='#514839';
  config.room.baseboardLED.color='#bb3344';
  config.furniture.find(f=>f.id==='monitor-right')!.color='#3b403d';
  return validateConfig(config);
}

test('the larger desk upgrade preserves approved architecture and personal monitors exactly, and PC world position', () => {
  const before=approvedLayout(), snapshot=structuredClone(before), after=upgradeWorkLayout(before);
  assert.deepEqual(before,snapshot,'Migration must not mutate the original backup');
  assert.deepEqual(after.room,before.room);
  assert.deepEqual(after.furniture.filter(f=>f.monitor?.mount==='wall'),before.furniture.filter(f=>f.monitor?.mount==='wall'));
  assert.deepEqual(after.furniture.find(f=>f.id==='chair'),before.furniture.find(f=>f.id==='chair'));
  const pcBefore=worldTransform(before.furniture.find(f=>f.id==='pc')!,before.furniture);
  const pcAfter=worldTransform(after.furniture.find(f=>f.id==='pc')!,after.furniture);
  for(const axis of ['x','y','z'] as const) assert.ok(Math.abs(pcAfter.position[axis]-pcBefore.position[axis])<1e-8);
  const desk=after.furniture.find(f=>f.id==='desk')!;
  assert.deepEqual(desk.dimensions,{width:2.4,height:.76,depth:1.9});
  assert.equal(desk.cornerDesk!.worktopDepth,.72);
  assert.equal(after.furniture.length,11);
  assert.deepEqual(upgradeWorkLayout(after),after,'Already upgraded layouts do not duplicate the second setup');
  const imported=validateConfig(before);
  assert.equal(imported.furniture.length,7); assert.equal(imported.furniture[0].dimensions.width,1.5,'Explicit old imports retain their desk size');
});

test('desk resizing anchors the rear corner and preserves child world placement even for rotated desks', () => {
  const config=freshConfig(),desk=config.furniture.find(f=>f.id==='desk')!;
  desk.rotation=37;
  const before=config.furniture.filter(f=>f.parentId===desk.id).map(f=>({id:f.id,transform:worldTransform(f,config.furniture)}));
  const rear=()=>{
    const r=desk.rotation*Math.PI/180;
    return {x:desk.position.x-desk.dimensions.width/2*Math.cos(r)-desk.dimensions.depth/2*Math.sin(r),z:desk.position.z+desk.dimensions.width/2*Math.sin(r)-desk.dimensions.depth/2*Math.cos(r)};
  };
  const corner=rear();
  resizeCornerDesk(config,desk,2.5,2.1);
  assert.ok(Math.hypot(rear().x-corner.x,rear().z-corner.z)<.000001);
  for(const item of before) {
    const current=worldTransform(config.furniture.find(f=>f.id===item.id)!,config.furniture);
    for(const axis of ['x','y','z'] as const) assert.ok(Math.abs(current.position[axis]-item.transform.position[axis])<.000001);
  }
});

test('work-zone support and display separation reject floating clamps, excessive reach and overlapping cases', () => {
  const invalid=(edit:(config:ReturnType<typeof freshConfig>)=>void,pattern:RegExp)=>{
    const config=freshConfig();edit(config);assert.throws(()=>validateConfig(config),pattern);
  };
  invalid(c=>{c.furniture.find(f=>f.id==='work-zone')!.position.y+=.05;},/clamp on the desk surface/);
  invalid(c=>{c.furniture.find(f=>f.id==='work-zone')!.position.z+=.10;},/clamp at a desk edge/);
  invalid(c=>{c.furniture.find(f=>f.id==='work-zone')!.workZone!.armReach=.2;},/shared arm reach/);
  invalid(c=>{c.furniture.find(f=>f.id==='work-monitor-right')!.position.x=.29;},/would intersect/);
  invalid(c=>{c.furniture.find(f=>f.id==='monitor-left')!.position={x:-.65,y:1.12,z:-.70};},/would intersect/);
});

test('saved-layout upgrade falls back to the original approved layout if the new monitors would collide', () => {
  const original=approvedLayout();
  original.furniture.find(f=>f.id==='monitor-left')!.position={x:-.65,y:1.12,z:-.70};
  validateConfig(original);
  assert.throws(()=>upgradeWorkLayout(original),/would intersect/);
  const json=JSON.stringify(original), saved=new Map([[PREVIOUS_STORAGE_KEY,json]]);
  const descriptor=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(key:string)=>saved.get(key)??null,setItem:(key:string,value:string)=>saved.set(key,value)}});
  try {
    const loaded=loadConfig();
    assert.deepEqual(loaded.config,original);
    assert.match(loaded.warning!,/existing layout were kept/);
    assert.equal(saved.get(PREVIOUS_STORAGE_KEY),json);
    assert.equal(saved.has(STORAGE_KEY),false,'Do not persist an intersecting automatic upgrade');
  } finally {
    if(descriptor) Object.defineProperty(globalThis,'localStorage',descriptor);
    else delete (globalThis as any).localStorage;
  }
});
