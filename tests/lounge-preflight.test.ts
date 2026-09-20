import test from 'node:test';
import assert from 'node:assert/strict';
import { NullEngine, Scene } from '@babylonjs/core';
import { freshConfig } from '../src/config/office';
import { createMaterials } from '../src/materials';
import { createRoom } from '../src/room/geometry';
import { createArchitecture } from '../src/architecture/features';
import { loungePreflight, preflightPlan } from '../scripts/lounge-preflight';

test('lounge preflight preserves all locked objects and distinguishes necessary failures from unverified states',()=>{
  const config=freshConfig(),snapshot=structuredClone(config),report=loungePreflight(config);
  assert.ok(Math.abs(report.tv.solidStripWidth-.725)<1e-9);
  assert.ok(Math.abs(report.tv.flatParkingShortfall-.395)<1e-9);
  assert.ok(report.tv.minimumBare43InchPanelWidth>report.tv.solidStripWidth,'43 inches is not a solution to this wall-strip constraint');
  assert.ok(Math.abs(report.tv.highestCenterBelowWindowWith50mmGap-.745)<1e-9);
  assert.equal(report.sofa.bestDoorWallRun,1.55);
  assert.ok(Math.abs(report.sofa.minimumDoorOverlapIfBackOnDoorWall-.35)<1e-9);
  assert.equal(report.door.openingDirection,null,'Do not invent an existing swing direction');
  assert.ok(report.states.every(s=>s.doorAngle===null && s.narrowestCirculation===null && s.status==='not certified'));
  assert.match(preflightPlan(config),/failed door-wall trial/);
  assert.deepEqual(config,snapshot);
});

test('reported passage clearance agrees with the actual rendered jambs, not nominal opening width',()=>{
  const config=freshConfig(),engine=new NullEngine(),scene=new Scene(engine);
  try {
    const materials=createMaterials(scene,config.room,false),room=createRoom(scene,config.room,materials);
    const meshes=createArchitecture(scene,config.room,materials,room);
    const jambs=meshes.filter(m=>m.name.startsWith('door jamb')).map(m=>{
      m.computeWorldMatrix(true);const b=m.getBoundingInfo().boundingBox;return {min:b.minimumWorld.z,max:b.maximumWorld.z};
    }).sort((a,b)=>a.min-b.min);
    assert.equal(jambs.length,2);
    assert.ok(Math.abs(jambs[1].min-jambs[0].max-loungePreflight(config).door.renderedJambClearWidth)<.000001);
  } finally {scene.dispose();engine.dispose();}
});
