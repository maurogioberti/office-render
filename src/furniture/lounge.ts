import { Mesh, MeshBuilder, Scene, Vector3 } from '@babylonjs/core';
import type { PlannerConfig } from '../config/types';
import { LOUNGE } from '../config/lounge';
import { solid } from '../materials';
import { box } from '../room/geometry';
import { SLEEPERS } from '../study/config';
import { createSleeper } from '../study/geometry';
import { solveTV, tvPose, TV_MOUNT } from './tvMotion';

export function createLounge(scene:Scene,config:PlannerConfig) {
  const meshes:Mesh[]=[];
  if(!config.lounge?.visible)return {meshes,updateTV:(_progress:number)=>{},dispose:()=>{}};
  const sofa=createSleeper(scene,SLEEPERS.find(s=>s.id===LOUNGE.sofaId)!,'north',config.lounge.state,config);
  // Measurement envelopes belong in the study; the main scene shows actual furniture.
  sofa.meshes.filter(m=>!m.name.startsWith('Sleeper')).forEach(m=>m.setEnabled(false));
  meshes.push(...sofa.meshes);
  const tv=LOUNGE.tv,a=tv.anchor;
  const finish=solid(scene,'Lounge TV case',tv.color,.12),display=solid(scene,'Lounge TV screen',tv.screenColor,.08),steel=solid(scene,'Lounge TV arm','#444d48',.2);
  display.emissiveColor=display.diffuseColor.scale(.10);
  const part=(name:string,w:number,h:number,d:number,x:number,y:number,z:number,material=finish)=>{
    const mesh=box(scene,`Lounge TV ${name}`,w,h,d,x,y,z,material);meshes.push(mesh);return mesh;
  };
  const screenRoot=new Mesh('TV articulated screen pivot',scene);meshes.push(screenRoot);
  const housing=part('50-inch housing',tv.width,tv.height,tv.depth,0,0,0);housing.parent=screenRoot;
  const screen=part('50-inch display',tv.width-.018,tv.height-.022,.002,0,.002,tv.depth/2+.001,display);screen.parent=screenRoot;
  part('wall plate',tv.plateWidth,tv.plateHeight,.025,a.x,a.y,-config.room.width/2+.0125,steel);
  const vesa=part('VESA plate',.20,.20,.03,0,0,-TV_MOUNT.vesaOffset,steel);vesa.parent=screenRoot;
  const links=[-.085,.085].flatMap(y=>[0,1].map(i=>({y,i,mesh:part('articulated link',.020,.025,tv.links[i],0,a.y+y,0,steel)})));
  const pivots=[0,1,2].map(()=>{const m=MeshBuilder.CreateCylinder('Lounge TV hinge',{diameter:.035,height:.22,tessellation:16},scene);m.material=steel;meshes.push(m);return m;});
  // Cable follows both rigid links, with service loops at moving joints.
  let cable:Mesh|undefined;
  const updateTV=(progress:number)=>{
    const p=tvPose(progress),{end,elbow}=solveTV(p),points=[a,elbow,end];
    screenRoot.position.set(p.x,a.y,p.z);screenRoot.rotation.y=p.yaw*Math.PI/180;
    links.forEach(({i,y,mesh})=>{const s=points[i],e=points[i+1];mesh.position.set((s.x+e.x)/2,a.y+y,(s.z+e.z)/2);mesh.rotation.y=Math.atan2(e.x-s.x,e.z-s.z);});
    pivots.forEach((m,i)=>m.position.set(points[i].x,a.y,points[i].z));
    const path=points.flatMap((q,i)=>[new Vector3(q.x,a.y-.13,q.z),new Vector3(q.x-.02,a.y-.19,q.z+.012),new Vector3(q.x+(i===2?0:.02),a.y-.13,q.z)]);
    cable=MeshBuilder.CreateTube('Lounge TV articulated service cable',{path,radius:.004,tessellation:6,updatable:true,instance:cable},scene);
    cable.material=steel;if(!meshes.includes(cable))meshes.push(cable);
  };
  updateTV(config.lounge.tvProgress??7/9);
  return {meshes,updateTV,dispose:()=>{sofa.dispose();meshes.filter(m=>!sofa.meshes.includes(m)).forEach(m=>m.dispose());finish.dispose();display.dispose();steel.dispose();}};
}
