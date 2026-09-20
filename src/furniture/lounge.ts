import { Mesh, MeshBuilder, Scene, Vector3 } from '@babylonjs/core';
import type { PlannerConfig } from '../config/types';
import { LOUNGE } from '../config/lounge';
import { solid } from '../materials';
import { box } from '../room/geometry';
import { SLEEPERS } from '../study/config';
import { createSleeper } from '../study/geometry';

export function createLounge(scene:Scene,config:PlannerConfig) {
  const meshes:Mesh[]=[];
  if(!config.lounge?.visible)return {meshes,dispose:()=>{}};
  const sofa=createSleeper(scene,SLEEPERS.find(s=>s.id===LOUNGE.sofaId)!,'north',config.lounge.state,config);
  // Measurement envelopes belong in the study; the main scene shows actual furniture.
  sofa.meshes.filter(m=>!m.name.startsWith('Sleeper')).forEach(m=>m.setEnabled(false));
  meshes.push(...sofa.meshes);
  const tv=LOUNGE.tv,c=tv.center,a=tv.anchor;
  const finish=solid(scene,'Lounge TV case',tv.color,.12),display=solid(scene,'Lounge TV screen',tv.screenColor,.08),steel=solid(scene,'Lounge TV arm','#444d48',.2);
  display.emissiveColor=display.diffuseColor.scale(.10);
  const part=(name:string,w:number,h:number,d:number,x:number,y:number,z:number,material=finish)=>{
    const mesh=box(scene,`Lounge TV ${name}`,w,h,d,x,y,z,material);meshes.push(mesh);return mesh;
  };
  part('50-inch housing',tv.width,tv.height,tv.depth,c.x,c.y,c.z);
  part('50-inch display',tv.width-.018,tv.height-.022,.002,c.x,c.y+.002,c.z+tv.depth/2+.001,display);
  part('wall plate',tv.plateWidth,tv.plateHeight,.025,a.x,a.y,-config.room.width/2+.0125,steel);
  const end=new Vector3(c.x,c.y,c.z-tv.depth/2-.015),start=new Vector3(a.x,a.y,a.z);
  const distance=Vector3.Distance(start,end),mid=start.add(end).scale(.5);
  if(distance>tv.linkLength*2)throw Error('TV mount exceeds its configured reach.');
  const elbow=new Vector3(mid.x-Math.sqrt(tv.linkLength**2-(distance/2)**2),mid.y,mid.z);
  const link=(p:Vector3,q:Vector3)=>{
    const mesh=part('folded articulated link',.018,.025,Vector3.Distance(p,q),(p.x+q.x)/2,(p.y+q.y)/2,(p.z+q.z)/2,steel);
    mesh.rotation.y=Math.atan2(q.x-p.x,q.z-p.z);
  };
  for(const offset of [-.085,.085]){
    const p=start.add(new Vector3(0,offset,0)),q=elbow.add(new Vector3(0,offset,0)),r=end.add(new Vector3(0,offset,0));link(p,q);link(q,r);
  }
  part('VESA plate',.20,.20,.030,end.x,end.y,end.z,steel);
  const cable=MeshBuilder.CreateTube('Lounge TV service cable',{path:[start.add(new Vector3(0,-.10,.02)),new Vector3(a.x-.1,a.y-.29,a.z+.035),end.add(new Vector3(0,-.10,0))],radius:.004,tessellation:8},scene);
  cable.material=steel;meshes.push(cable);
  return {meshes,dispose:()=>{sofa.dispose();meshes.filter(m=>!sofa.meshes.includes(m)).forEach(m=>m.dispose());finish.dispose();display.dispose();steel.dispose();}};
}
