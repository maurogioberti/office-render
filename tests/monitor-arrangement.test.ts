import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ArcRotateCamera, NullEngine, Scene, Vector3, Matrix } from '@babylonjs/core';
import { freshConfig } from '../src/config/office';
import { alignWorkstations, loadConfig, MONITOR_PREVIOUS_STORAGE_KEY, PANORAMA_PREVIOUS_STORAGE_KEY, STORAGE_KEY } from '../src/config/storage';
import { worldTransform } from '../src/navigation/collision';

test('comparison viewpoint shows portrait first, three landscapes, then the joined work pair with the laptop below', () => {
  const config=freshConfig(),engine=new NullEngine(),scene=new Scene(engine);
  try {
    const camera=new ArcRotateCamera('Comparison',Math.PI/3,Math.PI/3.2,6.5,new Vector3(0,.62,0),scene);
    scene.activeCamera=camera;scene.render();
    const screenX=(id:string)=>{
      const item=config.furniture.find(f=>f.id===id)!;
      const p=worldTransform(item,config.furniture).position;
      return Vector3.Project(new Vector3(p.x,p.y+item.dimensions.height/2,p.z),Matrix.Identity(),scene.getTransformMatrix(),camera.viewport.toGlobal(1200,900)).x;
    };
    const order=['monitor-portrait','monitor-left','monitor-center','monitor-right'];
    for(let i=1;i<order.length;i++) assert.ok(screenX(order[i])>screenX(order[i-1]),'Main array must follow the reference left-to-right order');
    const personal=config.furniture.filter(f=>f.monitor?.mount==='wall');
    const ac=config.room.airConditioner!;
    const distance=(id:string)=>{const p=config.furniture.find(f=>f.id===id)!.position;return Math.hypot(p.x-ac.offset,p.z+config.room.width/2);};
    assert.ok(personal.filter(f=>f.monitor!.orientation==='landscape').every(f=>distance('monitor-portrait')<distance(f.id)),'Portrait is nearest the AC');
    const work=['work-monitor-left','work-monitor-right'].map(id=>config.furniture.find(f=>f.id===id)!);
    const laptop=config.furniture.find(f=>f.id==='work-laptop')!;
    const lp=worldTransform(laptop,config.furniture).position;
    const positions=work.map(f=>worldTransform(f,config.furniture).position);
    assert.ok(positions.every(p=>p.z>Math.max(...personal.map(f=>f.position.z))),'Work screens continue beyond the main four');
    assert.ok(lp.z>0 && lp.x<-1.1,'Laptop occupies the existing inside corner');
    assert.ok(positions.every(p=>p.y>lp.y+laptop.dimensions.height),'Open laptop does not cover either work screen');
    assert.equal(config.furniture.filter(f=>f.kind==='monitor').length,6);
    assert.equal(config.furniture.filter(f=>f.kind==='laptop').length,1);
    assert.equal(personal.filter(f=>f.monitor!.orientation==='portrait').length,1);
  } finally {scene.dispose();engine.dispose();}
});

test('v8 monitor-only upgrade preserves customized room, desk, chair and PC and keeps the old save', () => {
  const before:ReturnType<typeof freshConfig>=JSON.parse(readFileSync(new URL('./fixtures/layout-v8.json',import.meta.url),'utf8'));
  before.room.baseboardLED.color='#cc2222';
  before.furniture.find(f=>f.id==='desk')!.color='#ba9870';
  before.furniture.find(f=>f.id==='chair')!.position.x=-.58;
  const original=JSON.stringify(before),after=alignWorkstations(before);
  assert.equal(JSON.stringify(before),original);
  assert.deepEqual(after.room,before.room);
  for(const id of ['desk','chair','pc']) assert.deepEqual(after.furniture.find(f=>f.id===id),before.furniture.find(f=>f.id===id));
  assert.deepEqual(alignWorkstations(after),after);
  const data=new Map([[MONITOR_PREVIOUS_STORAGE_KEY,original]]),descriptor=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>data.set(key,value)}});
  try {
    assert.deepEqual(loadConfig().config,after);
    assert.equal(data.get(MONITOR_PREVIOUS_STORAGE_KEY),original);
    assert.ok(data.has(STORAGE_KEY));
    assert.deepEqual(loadConfig().config,after);
    data.delete(STORAGE_KEY);data.delete(MONITOR_PREVIOUS_STORAGE_KEY);
    data.set(PANORAMA_PREVIOUS_STORAGE_KEY,original);
    assert.deepEqual(loadConfig().config,after,'The most recent checkpoint also receives the arc and power bindings');
    assert.equal(data.get(PANORAMA_PREVIOUS_STORAGE_KEY),original);
  } finally {
    if(descriptor) Object.defineProperty(globalThis,'localStorage',descriptor);
    else delete (globalThis as any).localStorage;
  }
});
