import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { freshConfig } from '../src/config/office';
import { applyDimensionalAudit, AUDIT_PREVIOUS_STORAGE_KEY, loadConfig, STORAGE_KEY } from '../src/config/storage';
import { auditWorkstation } from '../scripts/workstation-audit';

const before=()=>JSON.parse(readFileSync(new URL('./fixtures/layout-v11.json',import.meta.url),'utf8')) as ReturnType<typeof freshConfig>;

test('real-size audit preserves the exact desk and architecture and measures supported 4+2 fit',()=>{
  const previous=before(),config=freshConfig(),report=auditWorkstation(config);
  assert.deepEqual(config.room,previous.room);
  for(const id of ['desk','chair']) assert.deepEqual(config.furniture.find(f=>f.id===id),previous.furniture.find(f=>f.id===id));
  for(const id of ['work-zone','pc','work-laptop']) {
    const current=config.furniture.find(f=>f.id===id)!,old=previous.furniture.find(f=>f.id===id)!;
    assert.deepEqual(current.dimensions,old.dimensions);assert.equal(current.color,old.color);
    assert.deepEqual(current.workZone,old.workZone,'Arm clamp, column and reach remain unchanged');
  }
  assert.equal(config.furniture.filter(f=>f.monitor?.orientation==='portrait').length,1);
  assert.equal(config.furniture.filter(f=>f.monitor?.orientation==='landscape').length,5);
  for(const m of config.furniture.filter(f=>f.monitor)) assert.equal(m.monitor!.sourceId,m.id.startsWith('work-')?'work-laptop':'pc');
  assert.ok(report.main.projectedSpan<2.50);
  assert.ok(report.main.rightClearance>.50);
  assert.ok(Math.abs(report.main.returnTipClearance-.075)<.000001);
  assert.ok(report.work.joined);
  assert.ok(report.work.span>.98 && report.work.span<1.00);
  assert.ok(report.laptop.clearCorner.width>.45 && report.laptop.clearCorner.depth>.50);
  assert.ok(report.tower.position.z<-.7,'Tower stays under the left/south return');
  assert.ok(report.tower.ventilation.rear>=.10 && report.tower.ventilation.frontToChair>=.30);
  assert.ok(report.tower.ventilation.topToNearestSupport>.219);
  assert.ok(report.tower.acTrimLateralClearance>.15);
});

test('audit refuses undersized screens and a laptop placed below an arm instead of forcing a fit',()=>{
  const resized=freshConfig();resized.furniture.find(f=>f.id==='work-monitor-left')!.dimensions.width=.610;
  assert.throws(()=>auditWorkstation(resized));
  const historical=()=>JSON.parse(readFileSync(new URL('./fixtures/layout-v13.json',import.meta.url),'utf8')) as ReturnType<typeof freshConfig>;
  const obstructed=historical();obstructed.furniture.find(f=>f.id==='work-laptop')!.position.z+=.06;
  assert.throws(()=>auditWorkstation(obstructed),/Laptop lies beneath|No usable laptop corner/);
  const postCollision=historical();
  for(const item of postCollision.furniture.filter(f=>f.monitor?.mount==='shared-arm')) item.position.z+=.02;
  assert.throws(()=>auditWorkstation(postCollision),/common monitor column.*intersects/);
});

test('v11 audit migration keeps an exact backup, preserves the locked desk and power state, and refuses custom geometry',()=>{
  const original=before();original.room.wallFinishes.north.color='#dedbd4';original.furniture.find(f=>f.id==='work-laptop')!.laptop!.poweredOn=false;
  const json=JSON.stringify(original),expected=applyDimensionalAudit(original);
  assert.equal(JSON.stringify(original),json);
  assert.deepEqual(expected.room,original.room);
  for(const id of ['desk','chair']) assert.deepEqual(expected.furniture.find(f=>f.id===id),original.furniture.find(f=>f.id===id));
  assert.equal(expected.furniture.find(f=>f.id==='work-laptop')!.laptop!.poweredOn,false);
  auditWorkstation(expected);
  const data=new Map([[AUDIT_PREVIOUS_STORAGE_KEY,json]]),descriptor=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>data.set(key,value)}});
  try {
    assert.deepEqual(loadConfig().config,expected);assert.equal(data.get(AUDIT_PREVIOUS_STORAGE_KEY),json);
    assert.ok(data.has(STORAGE_KEY));assert.deepEqual(loadConfig().config,expected);
    const customized=before();customized.furniture.find(f=>f.id==='desk')!.dimensions.depth=2.52;
    data.delete(STORAGE_KEY);data.set(AUDIT_PREVIOUS_STORAGE_KEY,JSON.stringify(customized));
    const fallback=loadConfig();assert.deepEqual(fallback.config,customized);assert.match(fallback.warning!,/kept unchanged/);assert.equal(data.has(STORAGE_KEY),false);
  } finally {
    if(descriptor) Object.defineProperty(globalThis,'localStorage',descriptor);else delete (globalThis as any).localStorage;
  }
});
