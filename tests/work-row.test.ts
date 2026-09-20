import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {freshConfig} from '../src/config/office';
import {freshLounge} from '../src/config/lounge';
import {joinWorkMonitorRow,loadConfig,STORAGE_KEY,WORK_ROW_PREVIOUS_STORAGE_KEY} from '../src/config/storage';
import {sharedArmGeometry} from '../src/furniture/deskArm';

const previous=()=>JSON.parse(readFileSync(new URL('./fixtures/layout-v13.json',import.meta.url),'utf8')) as ReturnType<typeof freshConfig>;
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
