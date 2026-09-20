import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {freshConfig} from '../src/config/office';
import {freshLounge} from '../src/config/lounge';
import {joinWorkMonitorRow,retractWorkMonitorArm,loadConfig,STORAGE_KEY,WORK_ROW_PREVIOUS_STORAGE_KEY,ARM_PREVIOUS_STORAGE_KEY} from '../src/config/storage';
import {sharedArmGeometry} from '../src/furniture/deskArm';
import {worldTransform} from '../src/navigation/collision';

const previous=()=>JSON.parse(readFileSync(new URL('./fixtures/layout-v13.json',import.meta.url),'utf8')) as ReturnType<typeof freshConfig>;
test('v14 arm refinement reduces reach toward both walls and preserves the laptop and all unrelated objects',()=>{
  const before=JSON.parse(readFileSync(new URL('./fixtures/layout-v14.json',import.meta.url),'utf8')) as ReturnType<typeof freshConfig>;
  before.lounge={...freshLounge(),tvProgress:1};
  before.furniture.find(f=>f.id==='work-laptop')!.laptop!.poweredOn=false;
  const after=retractWorkMonitorArm(before),restored=structuredClone(after);
  const group=after.furniture.find(f=>f.id==='work-zone')!,oldGroup=before.furniture.find(f=>f.id==='work-zone')!;
  for(const id of ['work-monitor-left','work-monitor-right']) {
    const old=before.furniture.find(f=>f.id===id)!,item=after.furniture.find(f=>f.id===id)!;
    const a=worldTransform(old,before.furniture),b=worldTransform(item,after.furniture);
    assert.ok(b.position.x<a.position.x && b.position.z>a.position.z,'Move toward the west/north wall perimeter');
    assert.ok(sharedArmGeometry(group,item).reach<sharedArmGeometry(oldGroup,old).reach-.08,'Retract rather than extend the existing arm');
    assert.ok(sharedArmGeometry(group,item).reach<.53);
  }
  for(const id of ['work-zone','work-monitor-left','work-monitor-right']) {
    const old=before.furniture.find(f=>f.id===id)!,item=restored.furniture.find(f=>f.id===id)!;
    item.position={...old.position};item.rotation=old.rotation;
  }
  assert.deepEqual(restored,before,'Only shared support and two monitor poses may change');
  const raw=JSON.stringify(before),data=new Map([[ARM_PREVIOUS_STORAGE_KEY,raw]]),descriptor=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>data.set(k,v)}});
  try {
    assert.deepEqual(loadConfig().config,after);assert.equal(data.get(ARM_PREVIOUS_STORAGE_KEY),raw);
    assert.deepEqual(loadConfig().config,after);assert.ok(data.has(STORAGE_KEY));
    before.furniture.find(f=>f.id==='work-zone')!.workZone!.armReach=.64;
    data.delete(STORAGE_KEY);data.set(ARM_PREVIOUS_STORAGE_KEY,JSON.stringify(before));
    // The old pose may exceed this changed capacity, so exercise the refinement directly.
    assert.throws(()=>retractWorkMonitorArm(before));
  } finally {
    if(descriptor)Object.defineProperty(globalThis,'localStorage',descriptor);else delete (globalThis as any).localStorage;
  }
});
test('joining the work row changes only two screen poses, the existing clamp pose and laptop pose',()=>{
  const before=previous();before.lounge={...freshLounge(),tvProgress:1};
  before.furniture.find(f=>f.id==='work-laptop')!.laptop!.poweredOn=false;
  before.furniture.push({id:'cabinet',name:'Cabinet',kind:'storage',dimensions:{width:.4,height:.7,depth:.3},position:{x:1.2,y:0,z:-.3},rotation:0,color:'#665544',visible:true});
  const after=joinWorkMonitorRow(before),restored=structuredClone(after);
  for(const id of ['work-zone','work-monitor-left','work-monitor-right','work-laptop']) {
    const old=before.furniture.find(f=>f.id===id)!,item=restored.furniture.find(f=>f.id===id)!;
    item.position={...old.position};item.rotation=old.rotation;
  }
  assert.deepEqual(restored,before,'Architecture, cabinet, personal screens, dimensions, materials and TV state remain untouched');
  const group=after.furniture.find(f=>f.id==='work-zone')!;
  for(const screen of after.furniture.filter(f=>f.monitor?.mount==='shared-arm')) assert.ok(sharedArmGeometry(group,screen).reach<=.65);
  assert.deepEqual(joinWorkMonitorRow(after),after);
});

test('v13 saved-layout correction persists once, retains the backup and refuses to move a customized main array',()=>{
  const old=previous(),raw=JSON.stringify(old),data=new Map([[WORK_ROW_PREVIOUS_STORAGE_KEY,raw]]);
  const descriptor=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>data.set(k,v)}});
  try {
    const expected=joinWorkMonitorRow(old);
    assert.deepEqual(loadConfig().config,expected);assert.equal(data.get(WORK_ROW_PREVIOUS_STORAGE_KEY),raw);
    assert.deepEqual(loadConfig().config,expected);assert.ok(data.has(STORAGE_KEY));
    old.furniture.find(f=>f.id==='monitor-center')!.position.x+=.01;
    data.delete(STORAGE_KEY);data.set(WORK_ROW_PREVIOUS_STORAGE_KEY,JSON.stringify(old));
    const kept=loadConfig();assert.deepEqual(kept.config,old);assert.match(kept.warning!,/kept unchanged/);
    assert.equal(data.has(STORAGE_KEY),false);
  } finally {
    if(descriptor)Object.defineProperty(globalThis,'localStorage',descriptor);else delete (globalThis as any).localStorage;
  }
});
