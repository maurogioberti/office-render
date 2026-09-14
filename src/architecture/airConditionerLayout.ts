import type { RoomConfig } from '../config/types';

/** A small fitting gap is hidden by the sleeve trim; this is a real hole through plaster. */
export function airConditionerOpening(room: RoomConfig) {
  const ac=room.airConditioner;
  return ac?.enabled ? {kind:'appliance' as const,wall:ac.wall,offset:ac.offset,width:ac.width+.008,height:ac.height+.008,sill:ac.bottom-.004} : undefined;
}

/** Interior projection only: the exterior casing is intentionally outside the room. */
export function airConditionerObstacle(room: RoomConfig, includeTrim=false) {
  const ac=room.airConditioner;
  if(!ac?.enabled) return undefined;
  const long=ac.wall==='north' || ac.wall==='south',trim=includeTrim?ac.trimWidth:0;
  return {id:'wall-ac',rotation:0,
    x:long ? ac.offset : (ac.wall==='east'?1:-1)*(room.length/2-ac.interiorProjection/2),
    z:long ? (ac.wall==='north'?1:-1)*(room.width/2-ac.interiorProjection/2) : ac.offset,
    bottom:ac.bottom-trim,top:ac.bottom+ac.height+trim,
    width:long?ac.width+2*trim:ac.interiorProjection,
    depth:long?ac.interiorProjection:ac.width+2*trim,
  };
}
