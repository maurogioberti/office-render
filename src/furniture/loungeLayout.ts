import { LOUNGE } from '../config/lounge';
import type { PlannerConfig } from '../config/types';
import type { Obstacle } from '../navigation/collision';
import { SLEEPERS } from '../study/config';

export function loungeObstacles(config:PlannerConfig):Obstacle[] {
  if(!config.lounge?.visible)return [];
  const spec=SLEEPERS.find(s=>s.id===LOUNGE.sofaId)!,east=config.room.length/2-LOUNGE.wallGap,north=config.room.width/2-LOUNGE.wallGap;
  const depth=config.lounge.state==='sleeping'?spec.openDepth:spec.depth;
  const result:Obstacle[]=[{id:'lounge-sofa',x:east-spec.width/2,z:north-depth/2,width:spec.width,depth,rotation:0,bottom:0,top:spec.height}];
  if(config.lounge.state!=='sleeping')result.push({id:'lounge-chaise',x:east-spec.chaiseWidth/2,z:north-(spec.depth+spec.chaiseDepth)/2,width:spec.chaiseWidth,depth:spec.chaiseDepth-spec.depth,rotation:0,bottom:0,top:spec.seatHeight});
  const tv=LOUNGE.tv;
  result.push({id:'lounge-tv',x:tv.center.x,z:tv.center.z,width:tv.width,depth:tv.depth,rotation:0,bottom:tv.center.y-tv.height/2,top:tv.center.y+tv.height/2});
  // Parked arm packet is behind the case, fully below the window opening.
  result.push({id:'lounge-tv-arm',x:tv.anchor.x-.15,z:(tv.anchor.z+tv.center.z-tv.depth/2)/2,width:.34,depth:.10,rotation:0,bottom:tv.anchor.y-.15,top:tv.anchor.y+.15});
  return result;
}
