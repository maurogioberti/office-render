import {mkdirSync,writeFileSync} from 'node:fs';
import {ArcRotateCamera,NullEngine,Scene,Vector3} from '@babylonjs/core';
import {freshConfig} from '../src/config/office';
import {freshLounge} from '../src/config/lounge';
import {createMaterials} from '../src/materials';
import {createRoom} from '../src/room/geometry';
import {createArchitecture} from '../src/architecture/features';
import {createFurniture} from '../src/furniture';
import {createLounge} from '../src/furniture/lounge';
import {geometryPreview} from './geometry-preview';

mkdirSync('docs/main-lounge',{recursive:true});
for(const state of ['daily','sleeping'] as const){
  const config=freshConfig();config.lounge={...freshLounge(),state};
  const engine=new NullEngine(),scene=new Scene(engine);
  try{
    const mats=createMaterials(scene,config.room,false),room=createRoom(scene,config.room,mats);
    createArchitecture(scene,config.room,mats,room);createFurniture(scene,config.furniture,mats,config.room);createLounge(scene,config);
    room.ceiling.setEnabled(false);room.groups.north.setEnabled(false);room.groups.east.setEnabled(false);
    const camera=new ArcRotateCamera('Main comparison',Math.PI/3,Math.PI/3.2,6.5,new Vector3(0,.62,0),scene);camera.getViewMatrix(true);
    writeFileSync(`docs/main-lounge/${state}.png`,geometryPreview(scene,{title:`Main planner · compact L sofa + 50-inch TV · ${state}`,subtitle:'Original office camera · TV parked below window · office geometry and equipment unchanged',eye:camera.position.clone(),target:camera.target.clone(),up:Vector3.Up(),ortho:0}));
  }finally{scene.dispose();engine.dispose();}
}
