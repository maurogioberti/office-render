import { mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { NullEngine, Scene, Vector3 } from '@babylonjs/core';
import { freshConfig } from '../src/config/office';
import { createMaterials } from '../src/materials';
import { createRoom } from '../src/room/geometry';
import { createArchitecture } from '../src/architecture/features';
import { createFurniture } from '../src/furniture';
import { SLEEPERS } from '../src/study/config';
import { analyze } from '../src/study/analysis';
import { studyPlan } from '../src/study/plan';
import { createSleeper } from '../src/study/geometry';
import { geometryPreview } from './geometry-preview';

const config=freshConfig(),snapshot=JSON.stringify(config),out='docs/lounge-study';mkdirSync(out,{recursive:true});
const reports=[];
for(const spec of SLEEPERS)for(const wall of ['north','east'] as const)for(const state of ['daily','seating','sleeping'] as const){
  const r=analyze(spec,wall,state,config);reports.push(r);
  const svg=studyPlan(config,spec,r),name=`${spec.id}-${wall}-${state}`;
  writeFileSync(`${out}/${name}.svg`,svg);
  const canvas=createCanvas(1400,970),image=await loadImage(Buffer.from(svg));canvas.getContext('2d').drawImage(image,0,0);
  writeFileSync(`${out}/${name}.png`,canvas.toBuffer('image/png'));
}
for(const state of ['daily','sleeping'] as const){
  const engine=new NullEngine(),scene=new Scene(engine);
  try{
    const materials=createMaterials(scene,config.room,false),room=createRoom(scene,config.room,materials);
    createArchitecture(scene,config.room,materials,room);createFurniture(scene,config.furniture,materials,config.room);
    createSleeper(scene,SLEEPERS[0],'north',state,config);room.ceiling.setEnabled(false);
    // North/east cutaway, viewed from the sofa side; same geometry in both states.
    room.groups.north.setEnabled(false);room.groups.east.setEnabled(false);
    const png=geometryPreview(scene,{title:`Compact L sleeper · ${state} mode`,subtitle:'2.00 m wide · 1.30 m chaise · 1.90 × 1.40 m bed · north-wall assumption',eye:new Vector3(4.8,4.8,5.5),target:new Vector3(0,.55,0),up:Vector3.Up(),ortho:0});
    writeFileSync(`${out}/perspective-${state}.png`,png);
  }finally{scene.dispose();engine.dispose();}
}
if(JSON.stringify(config)!==snapshot)throw Error('Locked scene changed');
// Plans retain the route polylines. Keep the report reviewable by omitting tens of
// thousands of intermediate grid coordinates, while preserving all measurements.
writeFileSync(`${out}/study.json`,JSON.stringify({generated:'2026-09-20',lockedOfficeCommit:'6967b8e',officeSha256:createHash('sha256').update(snapshot).digest('hex'),candidates:SLEEPERS,reports},(key,value)=>key==='points'?undefined:value,2)+'\n');
console.log(`Generated ${reports.length} dimensioned state plans and two actual-mesh perspective previews. Office unchanged.`);
