import type { FurnitureConfig, PlannerConfig, RoomConfig, Vec3 } from '../config/types';
import { furnitureFootprints } from '../furniture/footprint';
import { wallMountFootprints } from '../furniture/wallMounts';

export type Obstacle = { x: number; z: number; bottom: number; top: number; width: number; depth: number; rotation: number; id: string; support?: boolean };

/** World-space footprint, including all parent rotations and translations. */
export function worldTransform(item: FurnitureConfig, furniture: FurnitureConfig[]): { position: Vec3; rotation: number; visible: boolean } {
  if (!item.parentId) return { position: { ...item.position }, rotation: item.rotation, visible: item.visible };
  const parent = furniture.find(f => f.id === item.parentId)!;
  const p = worldTransform(parent, furniture), r = p.rotation * Math.PI / 180;
  return {
    position: { x: p.position.x + item.position.x * Math.cos(r) + item.position.z * Math.sin(r), y: p.position.y + item.position.y, z: p.position.z - item.position.x * Math.sin(r) + item.position.z * Math.cos(r) },
    rotation: p.rotation + item.rotation, visible: p.visible && item.visible,
  };
}

export function obstacles(config: PlannerConfig): Obstacle[] {
  const result: Obstacle[] = config.furniture.flatMap(item => {
    const t = worldTransform(item, config.furniture);
    const r = t.rotation * Math.PI / 180;
    return t.visible ? furnitureFootprints(item).map(part => ({ id: item.id,
      x: t.position.x + part.x * Math.cos(r) + part.z * Math.sin(r),
      z: t.position.z - part.x * Math.sin(r) + part.z * Math.cos(r),
      bottom: t.position.y, top: t.position.y + item.dimensions.height,
      width: part.width, depth: part.depth, rotation: t.rotation,
    })) : [];
  });
  const room = config.room;
  for (const item of config.furniture) {
    if (item.monitor?.mount === 'wall' && item.monitor.wallMount && worldTransform(item,config.furniture).visible) result.push(...wallMountFootprints(item,room));
  }
  for (const f of room.cornerFeatures.filter(f => f.enabled)) result.push({ id: f.id, x: (f.corner.endsWith('east') ? 1 : -1) * (room.length / 2 - f.width / 2), z: (f.corner.startsWith('north') ? 1 : -1) * (room.width / 2 - f.depth / 2), bottom: 0, top: f.height, width: f.width, depth: f.depth, rotation: 0 });
  for (const b of room.beams.filter(b => b.enabled)) {
    const alongX = b.wall === 'north' || b.wall === 'south';
    result.push({ id: b.id, x: alongX ? b.offset : (b.wall === 'east' ? 1 : -1) * (room.length / 2 - b.projection / 2), z: alongX ? (b.wall === 'north' ? 1 : -1) * (room.width / 2 - b.projection / 2) : b.offset, bottom: room.height - b.drop, top: room.height, width: alongX ? b.length : b.projection, depth: alongX ? b.projection : b.length, rotation: 0 });
  }
  return result;
}

export function circleIntersects(x: number, z: number, radius: number, obstacle: Obstacle) {
  const r = obstacle.rotation * Math.PI / 180;
  const dx = x - obstacle.x, dz = z - obstacle.z;
  const localX = dx * Math.cos(r) - dz * Math.sin(r), localZ = dx * Math.sin(r) + dz * Math.cos(r);
  const nearX = Math.max(-obstacle.width / 2, Math.min(obstacle.width / 2, localX));
  const nearZ = Math.max(-obstacle.depth / 2, Math.min(obstacle.depth / 2, localZ));
  return (nearX - localX) ** 2 + (nearZ - localZ) ** 2 < radius ** 2;
}

export function canStand(x: number, z: number, room: RoomConfig, items: Obstacle[], radius = .2, eyeHeight = 1.7) {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return false;
  if (eyeHeight + .1 > room.height || Math.abs(x) > room.length / 2 - radius || Math.abs(z) > room.width / 2 - radius) return false;
  return !items.some(o => o.bottom < eyeHeight + .1 && o.top > .08 && circleIntersects(x, z, radius, o));
}

/** Small swept steps prevent tunneling through thin dividers at low frame rates. */
export function moveWithCollisions(position: Vec3, dx: number, dz: number, room: RoomConfig, items: Obstacle[], radius = .2, eyeHeight = 1.7): Vec3 {
  // Babylon camera vectors expose x/y/z through accessors; object spread loses them.
  const next = { x: position.x, y: position.y, z: position.z }, steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / .025));
  const sx = dx / steps, sz = dz / steps;
  for (let i = 0; i < steps; i++) {
    if (canStand(next.x + sx, next.z, room, items, radius, eyeHeight)) next.x += sx;
    if (canStand(next.x, next.z + sz, room, items, radius, eyeHeight)) next.z += sz;
  }
  return next;
}

export function findWalkStart(config: PlannerConfig, previous?: Vec3): Vec3 | null {
  const items = obstacles(config), room = config.room;
  if (previous && canStand(previous.x, previous.z, room, items)) return { x: previous.x, y: 1.7, z: previous.z };
  // Start inside the door, facing into the room; search an unobstructed point if occupied.
  const door = room.openings.find(o => o.kind === 'door');
  if (door) {
    const long = door.wall === 'north' || door.wall === 'south';
    const x = long ? door.offset : (door.wall === 'east' ? 1 : -1) * (room.length / 2 - .4);
    const z = long ? (door.wall === 'north' ? 1 : -1) * (room.width / 2 - .4) : door.offset;
    if (canStand(x, z, room, items)) return { x, y: 1.7, z };
  }
  for (let x = room.length / 2 - .25; x > -room.length / 2 + .2; x -= .1) for (let z = -room.width / 2 + .25; z < room.width / 2 - .2; z += .1) {
    if (canStand(x, z, room, items)) return { x, y: 1.7, z };
  }
  return null;
}

export function itemFitsRoom(item: FurnitureConfig, config: PlannerConfig) {
  const t = worldTransform(item, config.furniture), r = t.rotation * Math.PI / 180;
  const halfX = (Math.abs(Math.cos(r)) * item.dimensions.width + Math.abs(Math.sin(r)) * item.dimensions.depth) / 2;
  const halfZ = (Math.abs(Math.sin(r)) * item.dimensions.width + Math.abs(Math.cos(r)) * item.dimensions.depth) / 2;
  return Math.abs(t.position.x) + halfX <= config.room.length / 2 + .0001 && Math.abs(t.position.z) + halfZ <= config.room.width / 2 + .0001 && t.position.y >= 0 && t.position.y + item.dimensions.height <= config.room.height + .0001;
}

/** Separating-axis test for actual rotated footprints, including the open L desk bay. */
export function rectanglesOverlap(a: Obstacle, b: Obstacle) {
  if (a.top <= b.bottom + .0001 || b.top <= a.bottom + .0001) return false;
  const axes = (angle: number) => { const r = angle * Math.PI / 180; return [[Math.cos(r), -Math.sin(r)], [Math.sin(r), Math.cos(r)]]; };
  const aa = axes(a.rotation), bb = axes(b.rotation);
  return [...aa, ...bb].every(([x, z]) => {
    const radius = (o: Obstacle, basis: number[][]) => Math.abs(x * basis[0][0] + z * basis[0][1]) * o.width / 2 + Math.abs(x * basis[1][0] + z * basis[1][1]) * o.depth / 2;
    return Math.abs((a.x - b.x) * x + (a.z - b.z) * z) < radius(a, aa) + radius(b, bb) - .0001;
  });
}

export function architectureConflict(item: FurnitureConfig, config: PlannerConfig) {
  const all = obstacles(config), furnitureIds = new Set(config.furniture.map(f => f.id));
  const architecture = all.filter(o => !furnitureIds.has(o.id));
  return architecture.find(a => all.some(o => o.id === item.id && rectanglesOverlap(o, a)))?.id;
}
