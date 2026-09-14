import type { FurnitureConfig, PlannerConfig } from '../config/types';

/** Grow the L into the room while holding its rear corner and attached items in place. */
export function resizeCornerDesk(config: PlannerConfig, desk: FurnitureConfig, width: number, depth: number) {
  if (width===desk.dimensions.width && depth===desk.dimensions.depth) return;
  const dx=(width-desk.dimensions.width)/2, dz=(depth-desk.dimensions.depth)/2, r=desk.rotation*Math.PI/180;
  desk.position.x=+(desk.position.x+dx*Math.cos(r)+dz*Math.sin(r)).toFixed(6);
  desk.position.z=+(desk.position.z-dx*Math.sin(r)+dz*Math.cos(r)).toFixed(6);
  desk.dimensions.width=width; desk.dimensions.depth=depth;
  for (const child of config.furniture.filter(f=>f.parentId===desk.id)) {
    child.position.x=+(child.position.x-dx).toFixed(6); child.position.z=+(child.position.z-dz).toFixed(6);
  }
}

export function removeFurnitureTree(config: PlannerConfig, id: string) {
  const removed=new Set([id]); let changed=true;
  while (changed) {
    changed=false;
    for (const item of config.furniture) if (item.parentId && removed.has(item.parentId) && !removed.has(item.id)) { removed.add(item.id);changed=true; }
  }
  config.furniture=config.furniture.filter(f=>!removed.has(f.id));
}
