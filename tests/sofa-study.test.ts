import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { NullEngine, Scene } from '@babylonjs/core';
import { freshConfig } from '../src/config/office';
import { SLEEPERS } from '../src/study/config';
import { analyze, placement, pointDistance, doorLeaf } from '../src/study/analysis';
import { createSleeper } from '../src/study/geometry';
import { obstacles } from '../src/navigation/collision';
import { obstacle } from '../src/study/analysis';

test('every study state preserves the committed workstation and architecture',()=>{
  const config=freshConfig(),baseline=JSON.parse(readFileSync('docs/workstation-position/layout.json','utf8'));
  const fixed=(c:typeof config)=>({...c,furniture:c.furniture.filter(f=>!['work-zone','work-monitor-left','work-monitor-right','work-laptop'].includes(f.id))});
  assert.deepEqual(fixed(config),fixed(baseline));
  const current=structuredClone(config);
  for(const state of ['daily','seating','sleeping'] as const){
    analyze(SLEEPERS[0],'north',state,config);
    assert.deepEqual(config,current);
  }
  assert.equal(config.furniture.filter(f=>f.kind==='monitor').length,6);
});

test('north-wall L sleeper distinguishes a clear exit from an obstructed chair approach',()=>{
  const daily=analyze(SLEEPERS[0],'north','daily'),sleep=analyze(SLEEPERS[0],'north','sleeping');
  assert.deepEqual(daily.collisions,[]);assert.deepEqual(sleep.collisions,[]);
  assert.ok(Math.abs(sleep.clearances.sofaToDesk-.43)<1e-8);
  assert.ok(Math.abs(sleep.clearances.sofaToDoorOpening-.02)<1e-8);
  assert.ok(daily.clearances.chairRearwardTravelTested>=.59);
  for(const t of sleep.doorTrials){assert.equal(t.firstCollisionDegrees,null);assert.ok(t.exit.width>=.60);assert.equal(t.work.width,0);assert.ok(t.window.width>=.60);}
});

test('door-wall overlap and smaller forward-fold door conflicts are never approved',()=>{
  const bad=analyze(SLEEPERS[0],'east','daily');assert.equal(bad.verdict,'conflict');assert.equal(bad.doorOverlap,true);
  assert.ok(Math.abs(bad.clearances.doorWallWidthShortfall-.48)<1e-8);
  for(const spec of SLEEPERS.slice(1)){
    const r=analyze(spec,'north','sleeping');assert.equal(r.verdict,'conflict');assert.equal(r.doorOverlap,true);
    assert.ok(r.doorTrials.every(t=>t.firstCollisionDegrees!==null));
  }
});

test('reported routes clear the sofa, fixed equipment and trial door along segment samples',()=>{
  const r=analyze(SLEEPERS[0],'north','sleeping'),config=freshConfig();
  for(const t of r.doorTrials){
    const items=[doorLeaf(config,t.hinge,90),...obstacles(config).filter(o=>o.bottom<1.8&&o.top>.08),...r.footprint.map((p,i)=>obstacle(p,String(i)))];
    for(let i=1;i<t.exit.points.length;i++)for(const fraction of [0,.5,1]){
      const a=t.exit.points[i-1],b=t.exit.points[i],p={x:a.x+(b.x-a.x)*fraction,z:a.z+(b.z-a.z)*fraction};
      for(const item of items)assert.ok(pointDistance(p,item)>=t.exit.width/2-1e-8);
    }
    assert.ok(t.exit.width<=r.clearances.doorJamb);
  }
});

test('sofa meshes retain published scale and fit their conservative open envelope',()=>{
  const config=freshConfig(),engine=new NullEngine(),scene=new Scene(engine);
  try{for(const spec of SLEEPERS)for(const wall of ['north','east'] as const)for(const state of ['daily','sleeping'] as const){
    const result=createSleeper(scene,spec,wall,state,config),p=placement(spec,wall,config);
    const bounds=result.meshes.filter(m=>m.name.startsWith('Sleeper')).map(m=>{m.computeWorldMatrix(true);return m.getBoundingInfo().boundingBox;});
    const actual={x0:Math.min(...bounds.map(b=>b.minimumWorld.x)),x1:Math.max(...bounds.map(b=>b.maximumWorld.x)),z0:Math.min(...bounds.map(b=>b.minimumWorld.z)),z1:Math.max(...bounds.map(b=>b.maximumWorld.z))};
    const envelope=state==='sleeping'?p.envelope:{x0:Math.min(...p.closed.map(r=>r.x0)),x1:Math.max(...p.closed.map(r=>r.x1)),z0:Math.min(...p.closed.map(r=>r.z0)),z1:Math.max(...p.closed.map(r=>r.z1))};
    assert.ok(actual.x0>=envelope.x0-1e-6&&actual.x1<=envelope.x1+1e-6&&actual.z0>=envelope.z0-1e-6&&actual.z1<=envelope.z1+1e-6);
    if(state==='daily'){assert.ok(Math.abs(actual.x1-actual.x0-(envelope.x1-envelope.x0))<1e-6);assert.ok(Math.abs(actual.z1-actual.z0-(envelope.z1-envelope.z0))<1e-6);}
    result.dispose();
  }}finally{scene.dispose();engine.dispose();}
});
