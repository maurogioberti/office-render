import type { Obstacle } from '../navigation/collision';
import {LOUNGE} from '../config/lounge';
export type TVPose={x:number;z:number;yaw:number};
export const TV_MOUNT={anchor:LOUNGE.tv.anchor,links:LOUNGE.tv.links,vesaOffset:.055};
// Guided path first turns the screen diagonally around the doorway, then aims it
// at the sofa. Every intermediate pose uses the same two rigid arm lengths.
export const TV_PATH:TVPose[]=[
  {x:.9430233,z:-1.1454657,yaw:0},{x:.95,z:-1.09,yaw:5},
  {x:.9,z:-1.02,yaw:15},{x:.85,z:-.94,yaw:25},{x:.8,z:-.86,yaw:35},
  {x:.7,z:-.8,yaw:30},{x:.6,z:-.70,yaw:15},{x:.55,z:-.6,yaw:0},
  {x:.65,z:-.67,yaw:25},{x:.75,z:-.74,yaw:45},
];
export const TV_STOPS={stored:0,viewing:7/9,access:1};
export function tvPose(progress=TV_STOPS.viewing):TVPose {
  const t=Math.max(0,Math.min(1,progress))*(TV_PATH.length-1),i=Math.min(TV_PATH.length-2,Math.floor(t)),f=t-i,a=TV_PATH[i],b=TV_PATH[i+1];
  return {x:a.x+(b.x-a.x)*f,z:a.z+(b.z-a.z)*f,yaw:a.yaw+(b.yaw-a.yaw)*f};
}
export function solveTV(pose:TVPose){
  const yaw=pose.yaw*Math.PI/180,a=TV_MOUNT.anchor;
  const end={x:pose.x-Math.sin(yaw)*TV_MOUNT.vesaOffset,z:pose.z-Math.cos(yaw)*TV_MOUNT.vesaOffset};
  const dx=end.x-a.x,dz=end.z-a.z,d=Math.hypot(dx,dz),[l1,l2]=TV_MOUNT.links;
  if(d>l1+l2+1e-8||d<Math.abs(l1-l2)-1e-8)throw Error('TV pose is outside the articulated arm reach.');
  const angle=Math.atan2(dz,dx)+Math.acos(Math.max(-1,Math.min(1,(l1*l1+d*d-l2*l2)/(2*l1*d))));
  const elbow={x:a.x+l1*Math.cos(angle),z:a.z+l1*Math.sin(angle)};
  return {end,elbow,reach:d};
}
export function tvMotionObstacles(p:TVPose):Obstacle[]{
  const {end,elbow}=solveTV(p),a=TV_MOUNT.anchor;
  const link=(s:{x:number;z:number},e:{x:number;z:number},id:string):Obstacle=>({id,x:(s.x+e.x)/2,z:(s.z+e.z)/2,width:.020,depth:Math.hypot(e.x-s.x,e.z-s.z),rotation:Math.atan2(e.x-s.x,e.z-s.z)*180/Math.PI,bottom:a.y-.12,top:a.y+.12});
  const tv=LOUNGE.tv;
  return [{id:'lounge-tv',x:p.x,z:p.z,width:tv.width,depth:tv.depth,rotation:p.yaw,bottom:a.y-tv.height/2,top:a.y+tv.height/2},link(a,elbow,'lounge-tv-arm-1'),link(elbow,end,'lounge-tv-arm-2')];
}
