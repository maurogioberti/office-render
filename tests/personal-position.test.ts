import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshConfig } from '../src/config/office';
import { loadConfig, POSITION_PREVIOUS_STORAGE_KEY, relocatePersonalWorkstation, STORAGE_KEY } from '../src/config/storage';
import { monitorMountGeometry } from '../src/furniture/wallMounts';
import { auditWorkstation } from '../scripts/workstation-audit';

const previous=()=>JSON.parse(readFileSync(new URL('./fixtures/layout-v12.json',import.meta.url),'utf8')) as ReturnType<typeof freshConfig>;
const personal=['monitor-portrait','monitor-left','monitor-center','monitor-right'];

test('AC-return correction changes only personal poses and wall anchor locations',()=>{
  const before=previous(),after=relocatePersonalWorkstation(before);
  assert.deepEqual(after.room,before.room);
  assert.equal(after.furniture.length,before.furniture.length);
  for(const old of before.furniture) {
    const item=after.furniture.find(f=>f.id===old.id)!;
    if(!personal.includes(old.id)) {assert.deepEqual(item,old,`${old.id} must not change`);continue;}
    const restored=structuredClone(item);
    restored.position.x=old.position.x;restored.position.z=old.position.z;restored.rotation=old.rotation;
    restored.monitor!.wallMount!.wall=old.monitor!.wallMount!.wall;restored.monitor!.wallMount!.offset=old.monitor!.wallMount!.offset;
    assert.deepEqual(restored,old,'Dimensions, heights, source, finish and arm capacity remain unchanged');
    assert.ok(monitorMountGeometry(item,after.room).reach<=.65);
  }
  const report=auditWorkstation(after);
  assert.ok(Math.abs(report.main.returnTipClearance-.075)<.000001);
  assert.ok(report.nearestHousingGaps.every(g=>g>=.02&&g<=.03));
  assert.deepEqual(after.furniture.filter(f=>personal.includes(f.id)).map(f=>f.monitor!.wallMount!.wall),['south','west','west','south']);
});

test('v12 migration is position-only, preserves its backup and power, and refuses insufficient arm reach',()=>{
  const before=previous();before.furniture.find(f=>f.id==='work-laptop')!.laptop!.poweredOn=false;
  const json=JSON.stringify(before),expected=relocatePersonalWorkstation(before);
  assert.equal(JSON.stringify(before),json);
  for(const old of before.furniture.filter(f=>!personal.includes(f.id))) assert.deepEqual(expected.furniture.find(f=>f.id===old.id),old);
  assert.deepEqual(expected.room,before.room);
  const data=new Map([[POSITION_PREVIOUS_STORAGE_KEY,json]]),descriptor=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>data.set(key,value)}});
  try {
    assert.deepEqual(loadConfig().config,expected);assert.equal(data.get(POSITION_PREVIOUS_STORAGE_KEY),json);
    assert.ok(data.has(STORAGE_KEY));assert.deepEqual(loadConfig().config,expected);
    const shortArm=previous();shortArm.furniture.find(f=>f.id==='monitor-left')!.monitor!.wallMount!.maxReach=.20;
    data.delete(STORAGE_KEY);data.set(POSITION_PREVIOUS_STORAGE_KEY,JSON.stringify(shortArm));
    const failed=loadConfig();assert.deepEqual(failed.config,shortArm);assert.match(failed.warning!,/wall arm reach/);assert.equal(data.has(STORAGE_KEY),false);
  } finally {
    if(descriptor) Object.defineProperty(globalThis,'localStorage',descriptor);else delete (globalThis as any).localStorage;
  }
});
