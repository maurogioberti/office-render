import { LOUNGE } from '../config/lounge';
import type { PlannerConfig } from '../config/types';
import type { Obstacle } from '../navigation/collision';
import { SLEEPERS } from '../study/config';
import {tvMotionObstacles,tvPose} from './tvMotion';

export function loungeObstacles(config:PlannerConfig):Obstacle[] {
  if(!config.lounge?.visible)return [];
  const spec=SLEEPERS.find(s=>s.id===LOUNGE.sofaId)!,east=config.room.length/2-LOUNGE.wallGap,north=config.room.width/2-LOUNGE.wallGap;
  const depth=config.lounge.state==='sleeping'?spec.openDepth:spec.depth;
  const result:Obstacle[]=[{id:'lounge-sofa',x:east-spec.width/2,z:north-depth/2,width:spec.width,depth,rotation:0,bottom:0,top:spec.height}];
  if(config.lounge.state!=='sleeping')result.push({id:'lounge-chaise',x:east-spec.chaiseWidth/2,z:north-(spec.depth+spec.chaiseDepth)/2,width:spec.chaiseWidth,depth:spec.chaiseDepth-spec.depth,rotation:0,bottom:0,top:spec.seatHeight});
  result.push(...tvMotionObstacles(tvPose(config.lounge.tvProgress)));
  return result;
}
