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
import {doorLeaf,route} from '../src/study/analysis';
import {validateConfig} from '../src/config/storage';
import {tvPose,tvMotionObstacles,solveTV,TV_MOUNT,TV_STOPS} from '../src/furniture/tvMotion';

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

test('TV mount remains on solid wall and every guided pose clears both trial inward door sweeps',()=>{
  const config=freshConfig();config.lounge=freshLounge();const tv=LOUNGE.tv;
  assert.ok(tv.anchor.x-tv.plateWidth/2>1.175);
  const leaves=(['south','north'] as const).flatMap(h=>Array.from({length:361},(_,i)=>doorLeaf(config,h,i/4)));
  const fixed=obstacles(freshConfig());
  for(let i=0;i<=900;i++){
    const pose=tvPose(i/900),{end,elbow,reach}=solveTV(pose),parts=tvMotionObstacles(pose);
    assert.ok(reach<=1.05+1e-8);
    assert.ok(Math.abs(Math.hypot(elbow.x-TV_MOUNT.anchor.x,elbow.z-TV_MOUNT.anchor.z)-.70)<1e-8);
    assert.ok(Math.abs(Math.hypot(elbow.x-end.x,elbow.z-end.z)-.35)<1e-8);
    for(const o of parts){const r=o.rotation*Math.PI/180,halfZ=(Math.abs(Math.sin(r))*o.width+Math.abs(Math.cos(r))*o.depth)/2;
      assert.ok(o.z-halfZ>=-config.room.width/2-1e-8,'Do not swing into the wall');
      assert.ok(leaves.every(leaf=>!rectanglesOverlap({...o,width:o.width+.02,depth:o.depth+.02},leaf)),`Door needs 10 mm additional clearance at pose ${i}`);
      assert.ok(fixed.every(item=>!rectanglesOverlap(o,item)),`Existing furniture conflict at pose ${i}`);
    }
    assert.ok(parts.slice(1).every(link=>!rectanglesOverlap(parts[0],link)),'Arm must stay behind the screen');
  }
  const engine=new NullEngine(),scene=new Scene(engine);
  try{
    const materials=createMaterials(scene,config.room,false),room=createRoom(scene,config.room,materials);
    const architecture=createArchitecture(scene,config.room,materials,room),lounge=createLounge(scene,config);
    for(let i=0;i<=90;i++){lounge.updateTV(i/90);
      for(const a of architecture.filter(m=>m.parent?.name==='window'))for(const b of lounge.meshes.filter(m=>m.name.startsWith('Lounge TV'))){
        a.computeWorldMatrix(true);b.computeWorldMatrix(true);assert.equal(a.intersectsMesh(b,true),false,`${a.name} / ${b.name} at ${i}`);
      }
    }
  }finally{scene.dispose();engine.dispose();}
});

test('Walk Mode collides with visible sofa and TV; hiding lounge removes those obstacles',()=>{
  const config=freshConfig();config.lounge=freshLounge();
  assert.equal(canStand(.5,.8,config.room,obstacles(config)),false);
  assert.equal(canStand(.55,-.6,config.room,obstacles(config),.10),false);
  assert.equal(canStand(.1,-.4,config.room,obstacles(config),.15),true);
  config.lounge.state='sleeping';assert.equal(canStand(.5,.05,config.room,obstacles(config)),false);
  config.lounge.visible=false;assert.equal(canStand(.5,.8,config.room,obstacles(config)),true);
  assert.ok(!obstacles(config).some(o=>o.id.startsWith('lounge')));
});

test('window-access pose provides a walkable approach behind the angled screen',()=>{
  const config=freshConfig();config.lounge={...freshLounge(),tvProgress:TV_STOPS.access};
  for(const hinge of ['south','north'] as const){
    const objects=[...obstacles(config).filter(o=>o.bottom<1.8&&o.top>.08),doorLeaf(config,hinge,90)];
    const access=route(config,objects,{x:.30,z:-1.0});
    assert.ok(access.width>=.55,`Window approach: ${access.width}`);
  }
});
