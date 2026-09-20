import test from 'node:test';
import assert from 'node:assert/strict';
import {NullEngine,Scene} from '@babylonjs/core';
import {freshConfig} from '../src/config/office';
import {LOUNGE,freshLounge} from '../src/config/lounge';
import {createLounge} from '../src/furniture/lounge';
import {createRoom} from '../src/room/geometry';
import {createArchitecture} from '../src/architecture/features';
import {createMaterials} from '../src/materials';
import {obstacles,canStand,rectanglesOverlap} from '../src/navigation/collision';
import {doorLeaf} from '../src/study/analysis';
import {validateConfig} from '../src/config/storage';

test('main lounge renders a full-size TV and sofa without changing the locked office',()=>{
  const config=freshConfig(),before=structuredClone(config);config.lounge=freshLounge();
  const engine=new NullEngine(),scene=new Scene(engine);
  try{
    const lounge=createLounge(scene,config),tv=lounge.meshes.find(m=>m.name==='Lounge TV 50-inch housing')!;
    assert.ok(tv);tv.computeWorldMatrix(true);const bounds=tv.getBoundingInfo().boundingBox;
    assert.ok(Math.abs(bounds.maximumWorld.x-bounds.minimumWorld.x-1.12)<1e-6);
    assert.ok(Math.abs(bounds.maximumWorld.y-bounds.minimumWorld.y-.65)<1e-6);
    assert.ok(Math.abs(bounds.maximumWorld.z-bounds.minimumWorld.z-.07)<1e-6);
    assert.equal(config.furniture.filter(f=>f.kind==='monitor').length,6);
    const {lounge:_,...office}=config;assert.deepEqual(office,before);
    assert.deepEqual(validateConfig(config),config);
    lounge.dispose();assert.equal(scene.meshes.length,0);
  }finally{scene.dispose();engine.dispose();}
});

test('parked TV and plate clear the window, room and both trial inward door sweeps',()=>{
  const config=freshConfig();config.lounge=freshLounge();const tv=LOUNGE.tv;
  assert.ok(tv.anchor.x-tv.plateWidth/2>1.175);
  assert.ok(tv.center.x+tv.width/2<config.room.length/2);
  assert.ok(Math.abs(config.room.openings[0].sill-(tv.center.y+tv.height/2)-.055)<1e-8);
  const added=obstacles(config).filter(o=>o.id.startsWith('lounge-tv'));
  for(const hinge of ['south','north'] as const)for(let angle=0;angle<=90;angle+=.25)
    for(const o of added)assert.equal(rectanglesOverlap(o,doorLeaf(config,hinge,angle)),false,`${hinge} door ${angle}`);
  const engine=new NullEngine(),scene=new Scene(engine);
  try{
    const materials=createMaterials(scene,config.room,false),room=createRoom(scene,config.room,materials);
    const architecture=createArchitecture(scene,config.room,materials,room),lounge=createLounge(scene,config);
    for(const a of architecture.filter(m=>m.parent?.name==='window'))for(const b of lounge.meshes.filter(m=>m.name.startsWith('Lounge TV'))){
      a.computeWorldMatrix(true);b.computeWorldMatrix(true);assert.equal(a.intersectsMesh(b,true),false,`${a.name} / ${b.name}`);
    }
  }finally{scene.dispose();engine.dispose();}
});

test('Walk Mode collides with visible sofa and TV; hiding lounge removes those obstacles',()=>{
  const config=freshConfig();config.lounge=freshLounge();
  assert.equal(canStand(.5,.8,config.room,obstacles(config)),false);
  assert.equal(canStand(1.28,-1.08,config.room,obstacles(config),.10),false);
  assert.equal(canStand(.5,-.6,config.room,obstacles(config)),true);
  config.lounge.state='sleeping';assert.equal(canStand(.5,.05,config.room,obstacles(config)),false);
  config.lounge.visible=false;assert.equal(canStand(.5,.8,config.room,obstacles(config)),true);
  assert.ok(!obstacles(config).some(o=>o.id.startsWith('lounge')));
});
