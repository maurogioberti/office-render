import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshConfig } from '../src/config/office';
import { loadConfig, WORKSTATION_PREVIOUS_STORAGE_KEY, STORAGE_KEY, rebalanceWorkstation, validateConfig } from '../src/config/storage';
import { removeFurnitureTree, resizeCornerDesk } from '../src/furniture/deskLayout';
import { worldTransform } from '../src/navigation/collision';

function approvedLayout() {
  const config:ReturnType<typeof freshConfig>=JSON.parse(readFileSync(new URL('./fixtures/layout-v6.json',import.meta.url),'utf8'));
  // Actual user edits to the approved room and independent personal station must survive.
  config.room.wallFinishes.north.color='#dedbd4';
  config.room.openings[0].windowDetail!.frameColor='#514839';
  config.room.baseboardLED.color='#bb3344';
  config.furniture.find(f=>f.id==='monitor-right')!.color='#3b403d';
  return validateConfig(config);
}

test('workstation redesign preserves architecture and finishes while restoring both zones on a floating wraparound', () => {
  const before=approvedLayout(), snapshot=structuredClone(before), after=rebalanceWorkstation(before);
  assert.deepEqual(before,snapshot,'Migration must not mutate the original backup');
  assert.deepEqual(after.room,before.room);
  assert.equal(after.furniture.find(f=>f.id==='monitor-right')!.color,'#3b403d');
  assert.ok(after.furniture.filter(f=>f.monitor?.mount==='wall').filter(f=>f.monitor!.wallMount!.wall==='west').length===4);
  const desk=after.furniture.find(f=>f.id==='desk')!;
  assert.deepEqual(desk.dimensions,{width:1.3,height:.76,depth:2.5});
  assert.equal(desk.cornerDesk!.mainRun,'depth');
  assert.equal(desk.cornerDesk!.worktopDepth,.72);
  assert.equal(after.furniture.length,11);
  assert.deepEqual(rebalanceWorkstation(after),after,'Already upgraded layouts do not duplicate the second setup');
  assert.equal(after.furniture.find(f=>f.id==='work-zone')!.visible,true);
  removeFurnitureTree(after,'work-zone');
  assert.equal(after.furniture.find(f=>f.id==='work-laptop')!.parentId,'desk','The laptop survives optional pair removal');
  const imported=validateConfig(before);
  assert.equal(imported.furniture.length,11); assert.equal(imported.furniture[0].dimensions.width,2.4,'Explicit old imports retain their desk size');
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
    const config=freshConfig();config.furniture.find(f=>f.id==='work-zone')!.visible=true;edit(config);assert.throws(()=>validateConfig(config),pattern);
  };
  invalid(c=>{c.furniture.find(f=>f.id==='work-zone')!.position.y+=.05;},/clamp on the desk surface/);
  invalid(c=>{c.furniture.find(f=>f.id==='work-zone')!.position.z-=.10;},/clamp at a desk edge/);
  invalid(c=>{c.furniture.find(f=>f.id==='work-zone')!.workZone!.armReach=.2;},/shared arm reach/);
  invalid(c=>{c.furniture.find(f=>f.id==='work-monitor-right')!.position.x=.29;},/would intersect/);
  invalid(c=>{const p=c.furniture.find(f=>f.id==='work-laptop')!.position;p.x+=.4;p.z-=.6;},/laptop must fit/i);
});

test('saved-layout upgrade falls back to the original scene if its corner feature needs a different cutout', () => {
  const original=approvedLayout();
  original.room.cornerFeatures[0].width=.4;
  validateConfig(original);
  assert.throws(()=>rebalanceWorkstation(original),/corner step/);
  const json=JSON.stringify(original), saved=new Map([[WORKSTATION_PREVIOUS_STORAGE_KEY,json]]);
  const descriptor=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(key:string)=>saved.get(key)??null,setItem:(key:string,value:string)=>saved.set(key,value)}});
  try {
    const loaded=loadConfig();
    assert.deepEqual(loaded.config,original);
    assert.match(loaded.warning!,/scene was kept unchanged/);
    assert.equal(saved.get(WORKSTATION_PREVIOUS_STORAGE_KEY),json);
    assert.equal(saved.has(STORAGE_KEY),false,'Do not persist an intersecting automatic upgrade');
  } finally {
    if(descriptor) Object.defineProperty(globalThis,'localStorage',descriptor);
    else delete (globalThis as any).localStorage;
  }
});
