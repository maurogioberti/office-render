import test from 'node:test';
import assert from 'node:assert/strict';
import { ArcRotateCamera, Matrix, NullEngine, Ray, Scene, Vector3 } from '@babylonjs/core';
import { freshConfig } from '../src/config/office';
import { History, validateConfig } from '../src/config/storage';
import { canStand, circleIntersects, findWalkStart, itemFitsRoom, moveWithCollisions, obstacles, worldTransform } from '../src/navigation/collision';
import { createMaterials } from '../src/materials';
import { createRoom } from '../src/room/geometry';
import { createArchitecture } from '../src/architecture/features';
import { createFurniture } from '../src/furniture';

test('default layout has the stated footprint and door/window orientation; unlocated features stay disabled', () => {
  const config = validateConfig(freshConfig());
  assert.equal(config.room.length, 3.8); assert.equal(config.room.width, 2.6);
  assert.equal(config.room.openings.find(o=>o.kind === 'door')!.wall, 'east');
  assert.equal(config.room.openings.find(o=>o.kind === 'window')!.wall, 'north');
  assert.equal(config.room.heightConfirmed, false);
  assert.ok(config.room.beams.every(b=>!b.enabled)); assert.ok(config.room.cornerFeatures.every(f=>!f.enabled));
  assert.ok(config.furniture.every(f=>itemFitsRoom(f, config)));
});

test('invalid imports reject NaN, negative sizes, duplicate IDs, parent cycles and wall openings outside the room', () => {
  const mutate = (fn: (config: ReturnType<typeof freshConfig>)=>void) => { const config=freshConfig(); fn(config); assert.throws(()=>validateConfig(config)); };
  mutate(c=>{c.furniture[0].position.x=NaN;});
  mutate(c=>{c.furniture[0].dimensions.width=-1;});
  mutate(c=>{c.furniture[1].id=c.furniture[0].id;});
  mutate(c=>{c.furniture[0].parentId='monitor-left';});
  mutate(c=>{c.room.openings[0].offset=10;});
  mutate(c=>{c.room.openings[1].sill=.1;});
  mutate(c=>{c.room.beams[0].enabled=true; c.room.beams[0].length=10;});
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
  assert.equal(findWalkStart(config),null);
});

test('swept movement cannot tunnel through the thin privacy screen, including a large step', () => {
  const config=freshConfig(), divider=obstacles(config).find(o=>o.id==='divider')!;
  const end=moveWithCollisions({x:-.5,y:1.7,z:-.2},0,-2,config.room,[divider]);
  assert.ok(end.z>=divider.z+divider.depth/2+.2-.001);
  assert.equal(end.y,1.7);
  const wall=moveWithCollisions({x:0,y:1.7,z:0},10,0,config.room,[]);
  assert.ok(wall.x<=1.7); assert.ok(wall.x>1.65);
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
  assert.ok(!obstacles(config).some(o=>o.id==='corner-feature' || o.id==='ceiling-beam'));
  config.furniture.find(f=>f.id==='desk')!.visible=false;
  assert.ok(!obstacles(config).some(o=>['desk','pc','monitor-left','monitor-right'].includes(o.id)));
  config.room.cornerFeatures[0].enabled=true;
  assert.ok(!canStand(-1.6,1.05,config.room,obstacles(config)));
  config.room.beams[0].enabled=true; config.room.beams[0].drop=1;
  assert.ok(!canStand(0,1,config.room,obstacles(config)));
});

test('nested transforms match Babylon world matrices after a desk rotation', () => {
  const engine = new NullEngine(), scene = new Scene(engine), config=freshConfig();
  config.furniture.find(f=>f.id==='desk')!.rotation=37;
  const mats=createMaterials(scene,config.room,false), objects=createFurniture(scene,config.furniture,mats);
  for(const item of config.furniture) {
    const computed=worldTransform(item,config.furniture), actual=objects.get(item.id)!.root.getAbsolutePosition();
    assert.ok(Vector3.Distance(actual,new Vector3(computed.position.x,computed.position.y,computed.position.z))<.00001,item.id);
  }
  scene.dispose(); engine.dispose();
});

test('room meshes have exact interior dimensions, real window/door holes, and no default beams', () => {
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
  const engine=new NullEngine(), scene=new Scene(engine), config=freshConfig(), mats=createMaterials(scene,config.room,false), objects=createFurniture(scene,config.furniture,mats);
  for(const object of objects.values()) {
    const {width:w,height:h,depth:d}=object.config.dimensions;
    const inverse=Matrix.Invert(object.root.computeWorldMatrix(true));
    for(const mesh of object.meshes) {
      mesh.computeWorldMatrix(true); assert.equal(mesh.metadata.furnitureId,object.config.id); assert.ok(mesh.isPickable);
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
