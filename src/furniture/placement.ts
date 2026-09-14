import type { FurnitureConfig, PlannerConfig } from '../config/types';
import { worldTransform } from '../navigation/collision';

export function placeScreenBehindChair(config: PlannerConfig, screen: FurnitureConfig) {
  const chair = config.furniture.find(f => f.kind === 'chair');
  if (!chair) throw new Error('Add a chair to define the workstation backdrop position.');
  const t = worldTransform(chair, config.furniture), r = t.rotation * Math.PI / 180;
  const distance = chair.dimensions.depth / 2 + .36 + screen.dimensions.depth / 2;
  screen.parentId = undefined;
  screen.position = { x: t.position.x - Math.sin(r) * distance, y: 0, z: t.position.z - Math.cos(r) * distance };
  screen.rotation = t.rotation;
  // With a west-facing workstation, leave a 55 cm passage around the north end.
  if (Math.abs(Math.sin(r)) > .9) {
    const halfZ = (Math.abs(Math.sin(r))*screen.dimensions.width + Math.abs(Math.cos(r))*screen.dimensions.depth)/2;
    screen.position.z = Math.min(screen.position.z, config.room.width/2 - halfZ - .55);
  }
}
