import { Mesh, MeshBuilder, Scene, StandardMaterial, TransformNode, Vector3 } from '@babylonjs/core';
import type { RoomConfig, Wall } from '../config/types';
import type { Materials } from '../materials';

export function box(scene: Scene, name: string, width: number, height: number, depth: number, x: number, y: number, z: number, material: StandardMaterial, parent?: TransformNode) {
  const mesh = MeshBuilder.CreateBox(name, { width, height, depth }, scene);
  mesh.position.set(x, y, z); mesh.material = material; mesh.receiveShadows = true;
  mesh.isPickable = false; if (parent) mesh.parent = parent;
  return mesh;
}

export function wallPoint(room: RoomConfig, wall: Wall, offset: number, y: number, inset = 0) {
  if (wall === 'north') return new Vector3(offset, y, room.width / 2 + room.wallThickness / 2 - inset);
  if (wall === 'south') return new Vector3(offset, y, -room.width / 2 - room.wallThickness / 2 + inset);
  if (wall === 'east') return new Vector3(room.length / 2 + room.wallThickness / 2 - inset, y, offset);
  return new Vector3(-room.length / 2 - room.wallThickness / 2 + inset, y, offset);
}

/** Split wall into rectangles around REAL openings; no hidden solid wall behind glazing. */
export function createRoom(scene: Scene, room: RoomConfig, mats: Materials) {
  const groups = {} as Record<Wall, TransformNode>;
  const meshes: Mesh[] = [];
  const floor = box(scene, 'Floor slab', room.length + 0.24, .1, room.width + .24, 0, -.051, 0, mats.trim);
  const tile = MeshBuilder.CreateGround('Interior floor · 3.80 × 2.60 m', { width: room.length, height: room.width }, scene);
  tile.material = mats.floor; tile.receiveShadows = true; tile.isPickable = false;
  meshes.push(floor, tile);
  for (const wall of ['north', 'south', 'east', 'west'] as const) {
    const group = new TransformNode(`Wall · ${wall}`, scene); groups[wall] = group;
    const long = wall === 'north' || wall === 'south';
    const span = long ? room.length : room.width;
    const openings = room.openings.filter(o => o.wall === wall);
    const xs = [...new Set([-span / 2, span / 2, ...openings.flatMap(o => [o.offset - o.width / 2, o.offset + o.width / 2])])].sort((a, b) => a - b);
    const ys = [...new Set([0, room.height, ...openings.flatMap(o => [o.sill, o.sill + o.height])])].sort((a, b) => a - b);
    for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < ys.length - 1; j++) {
      const x = (xs[i] + xs[i + 1]) / 2, y = (ys[j] + ys[j + 1]) / 2;
      if (openings.some(o => Math.abs(x - o.offset) < o.width / 2 && y > o.sill && y < o.sill + o.height)) continue;
      const p = wallPoint(room, wall, x, y);
      meshes.push(box(scene, `${wall} plaster ${i}:${j}`, long ? xs[i + 1] - xs[i] : room.wallThickness, ys[j + 1] - ys[j], long ? room.wallThickness : xs[i + 1] - xs[i], p.x, p.y, p.z, mats.wall, group));
    }
    for (let i = 0; i < xs.length - 1; i++) {
      const x = (xs[i] + xs[i + 1]) / 2;
      if (openings.some(o => o.kind === 'door' && Math.abs(x - o.offset) < o.width / 2)) continue;
      const p = wallPoint(room, wall, x, .045, room.wallThickness / 2 + .012);
      meshes.push(box(scene, `${wall} skirting ${i}`, long ? xs[i+1]-xs[i] : .024, .09, long ? .024 : xs[i+1]-xs[i], p.x,p.y,p.z,mats.trim,group));
    }
  }
  const ceiling = box(scene, 'Ceiling', room.length + .24, .12, room.width + .24, 0, room.height + .06, 0, mats.wall);
  return { groups, floor, tile, ceiling, meshes };
}
export type RoomGeometry = ReturnType<typeof createRoom>;
