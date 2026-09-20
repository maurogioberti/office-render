import type { FurnitureConfig, PlannerConfig } from '../config/types';
import { furnitureFootprints } from './footprint';
import { sharedArmGeometry } from './deskArm';
import { obstacles, rectanglesOverlap } from '../navigation/collision';

/** Independent laptops remain supported when the optional screen pair is removed. */
export function desktopItemPlacementIssue(item: FurnitureConfig,config: PlannerConfig): string|undefined {
  if(!item.onDesktop || item.workZone) return;
  const desk=config.furniture.find(f=>f.id===item.parentId)!;
  if(Math.abs(item.position.y-desk.dimensions.height)>.001) return 'Keep the laptop base on the desktop.';
  const r=item.rotation*Math.PI/180;
  for(const sx of [-1,1]) for(const sz of [-1,1]) {
    const x=sx*item.dimensions.width/2,z=sz*item.dimensions.depth/2;
    const px=item.position.x+x*Math.cos(r)+z*Math.sin(r),pz=item.position.z-x*Math.sin(r)+z*Math.cos(r);
    if(!furnitureFootprints(desk).some(p=>Math.abs(px-p.x)<=p.width/2+.0001 && Math.abs(pz-p.z)<=p.depth/2+.0001)) return 'The laptop must fit on the desktop. Move it inward or enlarge the desk.';
  }
}

/** Check the real attachment and laptop support, rather than the group's empty envelope. */
export function workZonePlacementIssue(group: FurnitureConfig, config: PlannerConfig): string | undefined {
  const desk=config.furniture.find(f=>f.id===group.parentId)!;
  const spec=group.workZone!, r=group.rotation*Math.PI/180;
  const point=(x:number,z:number) => ({x:group.position.x+x*Math.cos(r)+z*Math.sin(r),z:group.position.z-x*Math.sin(r)+z*Math.cos(r)});
  const onSurface=(x:number,z:number) => furnitureFootprints(desk).some(p=>Math.abs(x-p.x)<=p.width/2+.0001 && Math.abs(z-p.z)<=p.depth/2+.0001);
  if (Math.abs(group.position.y+spec.surfaceOffset-desk.dimensions.height)>.001) return 'Keep the work-zone clamp on the desk surface. Adjust each screen’s position to change its height.';
  const clampZ=group.dimensions.depth/2-.07;
  for (const x of [-.045,.045]) {
    const jaw=point(x,clampZ-.02);
    if (!onSurface(jaw.x,jaw.z)) return 'The dual-arm clamp must grip the desktop. Move the work zone onto a desk edge.';
  }
  const behind=point(0,clampZ+.09);
  if (onSurface(behind.x,behind.z)) return 'Place the dual-arm clamp at a desk edge, not in the middle of the worktop.';
  for (const child of config.furniture.filter(f=>f.parentId===group.id)) {
    if (child.monitor?.mount==='shared-arm' && sharedArmGeometry(group,child).reach>spec.armReach+.0001) return `${child.name} exceeds the shared arm reach. Move the screen closer or increase arm reach.`;
    if (child.kind!=='laptop') continue;
    if (Math.abs(group.position.y+child.position.y-desk.dimensions.height)>.001) return 'Keep the laptop base on the desktop.';
    const c=child.rotation*Math.PI/180;
    for (const sx of [-1,1]) for (const sz of [-1,1]) {
      const x=sx*child.dimensions.width/2,z=sz*child.dimensions.depth/2;
      const p=point(child.position.x+x*Math.cos(c)+z*Math.sin(c),child.position.z-x*Math.sin(c)+z*Math.cos(c));
      if (!onSurface(p.x,p.z)) return 'The laptop must fit on the desktop. Move it inward or enlarge the desk.';
    }
  }
  // The attached clamp intentionally grips the desk; display/laptop cases must stay separate.
  const bodies=obstacles(config).filter(o=>!o.support && o.id!==group.id && o.id!==desk.id && config.furniture.some(f=>f.id===o.id));
  const children=new Set(config.furniture.filter(f=>f.parentId===group.id && (f.kind==='monitor' || f.kind==='laptop')).map(f=>f.id));
  for (const body of bodies.filter(o=>children.has(o.id))) {
    const hit=bodies.find(other=>other.id!==body.id && rectanglesOverlap(body,other));
    if (hit) return `${config.furniture.find(f=>f.id===body.id)!.name} would intersect ${config.furniture.find(f=>f.id===hit.id)!.name}. Move or angle the objects to keep the work setup clear.`;
  }
}
