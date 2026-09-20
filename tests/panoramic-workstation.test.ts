import test from 'node:test';
import assert from 'node:assert/strict';
import { freshConfig } from '../src/config/office';
import { isDisplayPowered } from '../src/furniture/displayPower';
import { desktopItemPlacementIssue } from '../src/furniture/workZonePlacement';
import { obstacles, rectanglesOverlap, worldTransform } from '../src/navigation/collision';
import { validateConfig } from '../src/config/storage';

const ids=['monitor-portrait','monitor-left','monitor-center','monitor-right','work-monitor-left','work-monitor-right'];

test('full-size displays retain aligned centers and separate four-plus-two sources with close casing gaps', () => {
  const config=validateConfig(freshConfig());
  const screens=ids.map(id=>config.furniture.find(f=>f.id===id)!);
  const edge=(index:number,side:number)=>{
    const screen=screens[index],t=worldTransform(screen,config.furniture),r=t.rotation*Math.PI/180;
    return {x:t.position.x+side*screen.dimensions.width/2*Math.cos(r),z:t.position.z-side*screen.dimensions.width/2*Math.sin(r)};
  };
  const bodies=obstacles(config).filter(o=>ids.includes(o.id)&&!o.support);
  for(let i=0;i<screens.length;i++) {
    const screen=screens[i],t=worldTransform(screen,config.furniture);
    assert.ok(Math.abs(t.position.y+screen.dimensions.height/2-1.295)<.0001,'Screen centers align, including the portrait');
    assert.equal(screen.monitor!.sourceId,i<4?'pc':'work-laptop');
    if(i===0) continue;
    const a=edge(i-1,1),b=edge(i,-1);
    assert.ok(Math.abs(Math.hypot(a.x-b.x,a.z-b.z)-.04)<.001,`Gap ${i}/${i+1} preserves edge-center separation (nearest casing gaps verified by the geometry audit)`);
  }
  for(let i=0;i<bodies.length;i++) for(let j=i+1;j<bodies.length;j++) assert.equal(rectanglesOverlap(bodies[i],bodies[j]),false,'No case overlap');
  const laptop=config.furniture.find(f=>f.id==='work-laptop')!,chair=config.furniture.find(f=>f.id==='chair')!;
  const p=worldTransform(laptop,config.furniture);
  assert.ok(laptop.position.x>.4 && laptop.position.z>.9,'Laptop occupies the far-right desktop return');
  const chairYaw=Math.atan2(p.position.x-chair.position.x,p.position.z-chair.position.z)*180/Math.PI;
  assert.ok(Math.abs(p.rotation-chairYaw)<10,'Keyboard and webcam face the fixed chair');
  assert.equal(desktopItemPlacementIssue(laptop,config),undefined);
  assert.ok(bodies.filter(o=>o.id!=='monitor-portrait').every(o=>o.bottom>p.position.y+laptop.dimensions.height),'Laptop never interrupts the upper row');
});

test('work power drives only its laptop and two screens, without changing visibility, inventory or transforms', () => {
  const config=freshConfig(),before=structuredClone(config);
  config.furniture.find(f=>f.id==='work-laptop')!.laptop!.poweredOn=false;
  validateConfig(config);
  for(const id of [...ids,'work-laptop']) {
    const item=config.furniture.find(f=>f.id===id)!;
    assert.equal(isDisplayPowered(item,config.furniture),!id.startsWith('work-'));
    assert.equal(item.visible,true);
    const old=before.furniture.find(f=>f.id===id)!;
    assert.deepEqual(item.position,old.position);assert.equal(item.rotation,old.rotation);
  }
  assert.equal(config.furniture.filter(f=>f.kind==='monitor').length,6);
  assert.equal(config.furniture.filter(f=>f.kind==='laptop').length,1);
  const invalid=freshConfig();invalid.furniture.find(f=>f.id==='monitor-center')!.monitor!.sourceId='chair';
  assert.throws(()=>validateConfig(invalid),/source must identify/);
});
