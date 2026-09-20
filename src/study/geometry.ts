import { Color3, Mesh, MeshBuilder, Scene, Vector3 } from '@babylonjs/core';
import type { PlannerConfig } from '../config/types';
import { solid } from '../materials';
import { box } from '../room/geometry';
import { placement, type Rect } from './analysis';
import type { SleeperSpec, StudyState, StudyWall } from './config';

/** Real-scale study meshes; internal upholstery / linkage are schematic, not CAD. */
export function createSleeper(scene:Scene,spec:SleeperSpec,wall:StudyWall,state:StudyState,config:PlannerConfig) {
  const p=placement(spec,wall,config),fabric=solid(scene,'Study upholstery','#9bada9'),base=solid(scene,'Study frame','#576862'),mattress=solid(scene,'Study sleep surface','#dad7c7');
  const meshes:Mesh[]=[];
  const part=(name:string,u0:number,u1:number,v0:number,v1:number,y:number,h:number,material=fabric)=>{
    const r=p.rect(u0,u1,v0,v1);meshes.push(box(scene,`Sleeper ${name}`,r.x1-r.x0,h,r.z1-r.z0,(r.x0+r.x1)/2,y+h/2,(r.z0+r.z1)/2,material));
  };
  const leg=(u:number,v:number)=>part('foot',u-.025,u+.025,v-.025,v+.025,0,.08,base);
  leg(.08,.08);leg(spec.width-.08,.08);leg(.08,spec.depth-.08);leg(spec.width-.08,spec.chaiseDepth-.08);
  if(state!=='sleeping'){
    part('storage base',.02,spec.width-.02,.02,spec.depth-.02,.08,.20,base);
    part('seat',.05,spec.width-.05,.15,spec.depth,.28,spec.seatHeight-.28);
    part('back',0,spec.width,0,.16,spec.seatHeight,spec.height-spec.seatHeight);
    if(spec.chaiseWidth)part('chaise with storage',spec.width-spec.chaiseWidth,spec.width,.16,spec.chaiseDepth,.08,spec.seatHeight-.08);
    if(!spec.chaiseWidth){part('left arm',0,.07,.12,spec.depth,.08,.45,base);part('right arm',spec.width-.07,spec.width,.12,spec.depth,.08,.45,base);}
  }else{
    part('extended support',.02,spec.width-.02,.02,spec.openDepth-.02,.08,.18,base);
    leg(.08,spec.openDepth-.08);leg(spec.width-.08,spec.openDepth-.08);
    // Exact usable mattress rectangle, not the whole bounding box. The Mini sleeps
    // along its long back; smaller forward-fold products sleep perpendicular to it.
    const w=spec.mechanism==='dl'?spec.bedLength:spec.bedWidth,d=spec.mechanism==='dl'?spec.bedWidth:spec.bedLength;
    const u=(spec.width-w)/2,v=(spec.openDepth-d)/2;
    part('open mattress',u,u+w,v,v+d,spec.seatHeight-.12,.12,mattress);
    part('pillow',u+.12,u+Math.min(w-.12,.65),v+.08,v+.35,spec.seatHeight,.08,mattress);
  }
  const outline=(r:Rect,name:string,color:string)=>{
    const line=MeshBuilder.CreateDashedLines(name,{points:[new Vector3(r.x0,.02,r.z0),new Vector3(r.x1,.02,r.z0),new Vector3(r.x1,.02,r.z1),new Vector3(r.x0,.02,r.z1),new Vector3(r.x0,.02,r.z0)],dashSize:.04,gapSize:.025,dashNb:100},scene);
    line.color=Color3.FromHexString(color);meshes.push(line);
  };
  p.closed.forEach(r=>outline(r,'Closed footprint','#456f68'));outline(p.envelope,'Complete pull-out planning envelope','#a56538');
  return {meshes,dispose:()=>{meshes.forEach(m=>m.dispose());fabric.dispose();base.dispose();mattress.dispose();}};
}
