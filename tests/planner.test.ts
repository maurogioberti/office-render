import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ArcRotateCamera, Matrix, NullEngine, Ray, Scene, Vector3 } from '@babylonjs/core';
import { freshConfig } from '../src/config/office';
import { History, validateConfig, upgradeSavedLayout, removeRetiredFurniture } from '../src/config/storage';
import { canStand, circleIntersects, findWalkStart, itemFitsRoom, moveWithCollisions, obstacles, worldTransform } from '../src/navigation/collision';
import { createMaterials } from '../src/materials';
import { createRoom } from '../src/room/geometry';
import { createArchitecture } from '../src/architecture/features';
import { createFurniture } from '../src/furniture';
import { monitorPanel } from '../src/furniture/footprint';
import { baseboardSpans } from '../src/lighting/baseboards';

test('default layout preserves the measured footprint and uses only photographed architectural features', () => {
  const config = validateConfig(freshConfig());
  assert.equal(config.room.length, 3.8); assert.equal(config.room.width, 2.6);
  assert.equal(config.room.openings.find(o=>o.kind === 'door')!.wall, 'east');
  assert.equal(config.room.openings.find(o=>o.kind === 'window')!.wall, 'south');
  assert.ok(config.room.openings.find(o=>o.kind === 'window')!.offset > 0);
  assert.equal(config.room.heightConfirmed, false);
  assert.deepEqual(config.room.beams.filter(b=>b.enabled).map(b=>b.wall), ['south','west']);
  assert.equal(config.room.cornerFeatures[0].corner,'south-west'); assert.ok(config.room.cornerFeatures[0].enabled);
  assert.ok(config.furniture.every(f=>itemFitsRoom(f, config)));
  assert.equal(config.furniture.length,11);
  assert.ok(!config.furniture.some(f=>f.kind==='divider' || f.kind==='storage'));
});

test('invalid imports reject NaN, negative sizes, duplicate IDs, parent cycles and wall openings outside the room', () => {
  const mutate = (fn: (config: ReturnType<typeof freshConfig>)=>void) => { const config=freshConfig(); fn(config); assert.throws(()=>validateConfig(config)); };
  mutate(c=>{c.furniture[0].position.x=NaN;});
  mutate(c=>{c.furniture[0].dimensions.width=-1;});
  mutate(c=>{c.furniture[1].id=c.furniture[0].id;});
  mutate(c=>{c.furniture[0].parentId='pc';});
  mutate(c=>{c.room.openings[0].offset=10;});
  mutate(c=>{c.room.openings[1].sill=.1;});
  mutate(c=>{c.room.beams[0].enabled=true; c.room.beams[0].length=10;});
  mutate(c=>{c.room.openings[0].windowDetail!.frameWidth=.1;c.room.openings[0].windowDetail!.housingHeight=.08;});
  mutate(c=>{c.furniture[0].position.z-=.08;});
  mutate(c=>{c.furniture[0].position.x=20;});
  mutate(c=>{c.furniture.find(f=>f.id==='monitor-left')!.monitor!.wallMount!.offset=.7;});
});

test('undo/redo is lossless and a new edit clears the redo branch', () => {
  const history = new History(), original = freshConfig(), moved = freshConfig(); moved.furniture[0].position.x+=.1;
  history.push(original);
  assert.deepEqual(history.undo(moved),original); assert.deepEqual(history.redo(original),moved);
  history.undo(moved); history.push(original); assert.equal(history.canRedo,false);
});

test('walking starts at an unobstructed eye-height point and detects a fully blocked layout', () => {
  const config=freshConfig(), point=findWalkStart(config)!;
  assert.ok(point); assert.equal(point.y,1.7); assert.ok(canStand(point.x,point.z,config.room,obstacles(config)));
  config.furniture=[{...config.furniture[0],position:{x:0,y:0,z:0},dimensions:{width:3.8,height:2,depth:2.6}}];
  delete config.furniture[0].cornerDesk;
  assert.equal(findWalkStart(config),null);
});

test('swept movement cannot tunnel through a thin obstacle, including a large step', () => {
  const config=freshConfig(), divider={id:'test-obstacle',x:.18,z:-.1,bottom:0,top:1.65,width:1.65,depth:.14,rotation:90};
  const end=moveWithCollisions({x:1,y:1.7,z:divider.z},-2,0,config.room,[divider]);
  assert.ok(end.x>=divider.x+divider.depth/2+.2-.001);
  assert.equal(end.y,1.7);
  const wall=moveWithCollisions({x:0,y:1.7,z:0},10,0,config.room,[]);
  assert.ok(wall.x<=1.7); assert.ok(wall.x>1.65);
});

test('walking accepts Babylon camera vectors without losing coordinate accessors', () => {
  const config=freshConfig(), start=findWalkStart(config)!;
  const cameraPosition=new Vector3(start.x,start.y,start.z);
  const moved=moveWithCollisions(cameraPosition,-.06,0,config.room,obstacles(config));
  assert.ok(Number.isFinite(moved.x) && Number.isFinite(moved.y) && Number.isFinite(moved.z),'Camera coordinates must stay finite after the first walking frame');
  assert.ok(Math.abs(moved.x-(start.x-.06))<1e-8);
  assert.equal(moved.y,1.7); assert.equal(moved.z,start.z);
  assert.deepEqual(findWalkStart(config,cameraPosition),start,'Re-entering Walk mode must read the camera coordinates');
  assert.equal(canStand(NaN,start.z,config.room,[]),false,'Invalid coordinates are not valid standing positions');
  assert.equal(canStand(start.x,Infinity,config.room,[]),false);
  const recovered=findWalkStart(config,new Vector3(NaN,1.7,NaN))!;
  assert.deepEqual(recovered,start,'An invalid previous camera position falls back to the door');
});

test('rectilinear C desk leaves the chair bay open and its notched profile rotates with collisions', () => {
  const config = freshConfig(), desk = config.furniture.find(f=>f.id==='desk')!;
  const parts = obstacles(config).filter(o=>o.id==='desk');
  assert.equal(parts.length,4); assert.equal(desk.dimensions.depth,2.5); assert.equal(desk.dimensions.width,1.3);
  assert.equal(desk.cornerDesk!.mainRun,'depth');
  assert.ok(canStand(-.6,.1,config.room,parts),'Inner L corner is open');
  assert.ok(!canStand(-1.5,-.5,config.room,parts),'West worktop collides');
  assert.ok(!canStand(-.6,-.9,config.room,parts),'South return collides');
  desk.rotation=90; desk.position={x:0,y:0,z:0};
  const rotated = obstacles(config).filter(o=>o.id==='desk');
  assert.ok(rotated.every(o=>o.rotation===90));
  assert.ok(canStand(.4,-.3,config.room,rotated));
});

test('the room has a traversable route from the door into the workstation', () => {
  const config=freshConfig(), items=obstacles(config), step=.05;
  const chair=config.furniture.find(f=>f.id==='chair')!, angle=chair.rotation*Math.PI/180;
  const approach={x:chair.position.x-Math.sin(angle)*.74,z:chair.position.z-Math.cos(angle)*.74};
  // Flood fill of a 40 cm body on the interior grid, including the actual chair.
  const start=findWalkStart(config)!, queue=[[Math.round(start.x/step),Math.round(start.z/step)]], seen=new Set<string>();
  let reached=false;
  for(let i=0;i<queue.length;i++) {
    const [x,z]=queue[i], key=`${x},${z}`;
    if(seen.has(key))continue; seen.add(key);
    if(!canStand(x*step,z*step,config.room,items))continue;
    if(Math.hypot(x*step-approach.x,z*step-approach.z)<.09){reached=true;break;}
    queue.push([x+1,z],[x-1,z],[x,z+1],[x,z-1]);
  }
  assert.ok(reached,'Door-to-workstation path must stay open');
});

test('removing retired objects preserves room settings and unrelated furniture edits', () => {
  const config=freshConfig();
  config.room.baseboardLED.color='#44aaff'; config.furniture.find(f=>f.id==='chair')!.position.x=-.45;
  config.furniture.push(
    {id:'divider',name:'Privacy screen',kind:'divider',dimensions:{width:1.65,height:1.65,depth:.14},position:{x:.18,y:0,z:-.1},rotation:90,color:'#c4c6ad',visible:true},
    {id:'storage',name:'Drawer',kind:'storage',dimensions:{width:.55,height:.65,depth:.42},position:{x:1.32,y:0,z:.97},rotation:0,color:'#d2c3aa',visible:true},
  );
  const snapshot=JSON.stringify(config), migrated=removeRetiredFurniture(config);
  assert.equal(JSON.stringify(config),snapshot); assert.equal(migrated.furniture.length,11);
  assert.equal(migrated.room.baseboardLED.color,'#44aaff');
  assert.equal(migrated.furniture.find(f=>f.id==='chair')!.position.x,-.45);
  assert.ok(!obstacles(migrated).some(o=>['divider','storage'].includes(o.id)));
  assert.deepEqual(removeRetiredFurniture(migrated),migrated);
  const legacy=structuredClone(config); legacy.furniture=legacy.furniture.filter(f=>!f.id.startsWith('work-'));
  assert.ok(!upgradeSavedLayout(legacy).furniture.some(f=>['divider','storage'].includes(f.id)));
});

test('four personal Samsung 27 inch panels retain three landscape orientations, one portrait, and wall arms', () => {
  const monitors=freshConfig().furniture.filter(f=>f.monitor?.mount==='wall');
  assert.equal(monitors.length,4);
  assert.equal(monitors.filter(m=>m.monitor!.orientation==='landscape').length,3);
  assert.equal(monitors.filter(m=>m.monitor!.orientation==='portrait').length,1);
  for(const m of monitors) {
    assert.equal(m.monitor!.brand,'Samsung'); assert.equal(m.monitor!.mount,'wall');
    const p=monitorPanel(m); assert.ok(Math.abs(Math.hypot(p.width,p.height)-27*.0254)<1e-8);
    assert.equal(m.parentId,undefined); assert.equal(m.monitor!.wallMount!.wall,'west');
  }
  const invalid=freshConfig(); invalid.furniture.find(f=>f.kind==='monitor')!.dimensions.width=.1;
  assert.throws(()=>validateConfig(invalid),/monitor envelope/);
});

test('LED strips stop at the doorway and wall finishes are independent and neutral by default', () => {
  const config=freshConfig(), room=config.room, door=room.openings.find(o=>o.kind==='door')!;
  assert.equal(room.baseboardLED.color,'#ff3030'); assert.ok(room.baseboardLED.enabled);
  const spans=baseboardSpans(room,door.wall);
  assert.equal(spans.length,2);
  assert.ok(spans.every(s=>s.end<=door.offset-door.width/2 || s.start>=door.offset+door.width/2));
  assert.ok(Math.abs(spans.reduce((sum,s)=>sum+s.end-s.start,0)-(room.width-door.width))<1e-8);
  const engine=new NullEngine(), scene=new Scene(engine), mats=createMaterials(scene,room,false);
  assert.notEqual(mats.walls.north,mats.walls.south);
  assert.deepEqual(mats.walls.north.diffuseColor,mats.walls.south.diffuseColor);
  scene.dispose();engine.dispose();
});

test('legacy saved layouts get the correction while retaining measurements; old file imports retain their arrangement', () => {
  // The pre-redesign desk cleared the step without a relief. A real old snapshot avoids
  // manufacturing an invalid legacy import by stripping the new desk's required notch.
  const legacy:any=JSON.parse(readFileSync(new URL('./fixtures/layout-v6.json', import.meta.url),'utf8')); legacy.version=1;
  delete legacy.room.wallFinishes; delete legacy.room.baseboardLED;
  legacy.room.height=2.8; legacy.room.heightConfirmed=true;
  legacy.room.openings[0].wall='north'; legacy.room.openings[0].offset=-.55;
  legacy.furniture=legacy.furniture.filter((f:any)=>!['monitor-center','monitor-portrait'].includes(f.id) && !f.id.startsWith('work-'));
  delete legacy.furniture[0].cornerDesk;
  const snapshot=JSON.stringify(legacy), upgraded=upgradeSavedLayout(legacy);
  assert.equal(JSON.stringify(legacy),snapshot,'Do not mutate the backup');
  assert.equal(upgraded.version,2); assert.equal(upgraded.room.height,2.8); assert.equal(upgraded.room.heightConfirmed,true);
  assert.equal(upgraded.room.openings[0].wall,'south'); assert.equal(upgraded.furniture.filter(f=>f.monitor?.mount==='wall').length,4);
  assert.ok(upgraded.furniture[0].cornerDesk);
  const imported=validateConfig(legacy);
  assert.equal(imported.room.openings[0].wall,'north'); assert.ok(!imported.furniture[0].cornerDesk);
});

test('rotated furniture uses oriented collisions and the camera slides along obstacles', () => {
  const config=freshConfig(), screen={id:'test',x:0,z:0,bottom:0,top:1.5,width:1.6,depth:.1,rotation:90};
  assert.equal(circleIntersects(0,.7,.2,screen),true);
  assert.equal(circleIntersects(.7,0,.2,screen),false);
  const end=moveWithCollisions({x:-.5,y:1.7,z:0},1,.5,config.room,[screen]);
  assert.ok(end.x<-.24); assert.ok(end.z>.4);
});

test('hidden furniture and disabled architecture do not block; enabled beam/corner features do', () => {
  const config=freshConfig();
  config.room.beams.forEach(b=>b.enabled=false); config.room.cornerFeatures.forEach(f=>f.enabled=false);
  assert.ok(!obstacles(config).some(o=>o.id==='corner-step' || o.id==='window-soffit'));
  config.furniture.find(f=>f.id==='desk')!.visible=false;
  assert.ok(!obstacles(config).some(o=>['desk','pc'].includes(o.id)));
  assert.ok(obstacles(config).some(o=>o.id==='monitor-left'),'Wall monitors are independent of desk visibility');
  config.room.cornerFeatures[0].enabled=true;
  assert.ok(!canStand(-1.65,-1.05,config.room,obstacles(config)));
  config.room.beams[0].enabled=true; config.room.beams[0].drop=1;
  assert.ok(!canStand(0,-1,config.room,obstacles(config)));
});

test('nested transforms match Babylon world matrices after a desk rotation', () => {
  const engine = new NullEngine(), scene = new Scene(engine), config=freshConfig();
  config.furniture.find(f=>f.id==='desk')!.rotation=37;
  const mats=createMaterials(scene,config.room,false), objects=createFurniture(scene,config.furniture,mats,config.room);
  for(const item of config.furniture) {
    const computed=worldTransform(item,config.furniture), actual=objects.get(item.id)!.root.getAbsolutePosition();
    assert.ok(Vector3.Distance(actual,new Vector3(computed.position.x,computed.position.y,computed.position.z))<.00001,item.id);
  }
  scene.dispose(); engine.dispose();
});

test('room meshes have exact interior dimensions and real window/door holes', () => {
  const engine=new NullEngine(), scene=new Scene(engine), config=freshConfig(), mats=createMaterials(scene,config.room,false);
  const room=createRoom(scene,config.room,mats), features=createArchitecture(scene,config.room,mats,room);
  scene.meshes.forEach(m=>m.computeWorldMatrix(true));
  const floor=room.tile.getBoundingInfo().boundingBox;
  assert.ok(Math.abs(floor.maximumWorld.x-floor.minimumWorld.x-3.8)<1e-6);
  assert.ok(Math.abs(floor.maximumWorld.z-floor.minimumWorld.z-2.6)<1e-6);
  for(const o of config.room.openings) {
    const horizontal=o.wall==='north' || o.wall==='south';
    const origin=horizontal ? new Vector3(o.offset,o.sill+o.height*.4,0) : new Vector3(0,o.sill+o.height*.4,o.offset);
    const direction=horizontal ? new Vector3(0,0,o.wall==='north'?1:-1) : new Vector3(o.wall==='east'?1:-1,0,0);
    const ray=new Ray(origin,direction,5);
    const plaster=scene.pickWithRay(ray,m=>m.name.includes('plaster'));
    assert.equal(plaster?.hit,false,`${o.kind} must have an actual hole in the plaster`);
    const joinery=scene.pickWithRay(ray,m=>features.includes(m as any));
    assert.equal(joinery?.hit,true,`${o.kind} must have visible joinery`);
  }
  assert.ok(!scene.meshes.some(m=>m.name==='ceiling-beam' || m.name==='corner-feature'));
  scene.dispose(); engine.dispose();
});

test('furniture geometry stays inside the configured metric envelopes and is selectable', () => {
  const engine=new NullEngine(), scene=new Scene(engine), config=freshConfig(), mats=createMaterials(scene,config.room,false), objects=createFurniture(scene,config.furniture,mats,config.room);
  for(const object of objects.values()) {
    const {width:w,height:h,depth:d}=object.config.dimensions;
    const inverse=Matrix.Invert(object.root.computeWorldMatrix(true));
    for(const mesh of object.meshes) {
      mesh.computeWorldMatrix(true); assert.equal(mesh.metadata.furnitureId,object.config.id); assert.ok(mesh.isPickable);
      if(mesh.metadata.wallMountSupport || mesh.metadata.deskWallSupport) continue; // Independent wall arms have their own reach envelope.
      for(const point of mesh.getBoundingInfo().boundingBox.vectorsWorld) {
        const p=Vector3.TransformCoordinates(point,inverse);
        assert.ok(Math.abs(p.x)<=w/2+.001,`${mesh.name}: X ${p.x}`);
        assert.ok(Math.abs(p.z)<=d/2+.001,`${mesh.name}: Z ${p.z}`);
        assert.ok(p.y>=-.001 && p.y<=h+.001,`${mesh.name}: Y ${p.y}`);
      }
    }
  }
  scene.dispose(); engine.dispose();
});
