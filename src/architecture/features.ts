import { Mesh, Scene, TransformNode } from '@babylonjs/core';
import type { RoomConfig } from '../config/types';
import type { Materials } from '../materials';
import { box, wallPoint, type RoomGeometry } from '../room/geometry';

export function createArchitecture(scene: Scene, room: RoomConfig, mats: Materials, geometry: RoomGeometry) {
  const meshes: Mesh[] = [];
  for (const opening of room.openings) {
    const root = new TransformNode(opening.id, scene);
    root.parent = geometry.groups[opening.wall];
    root.position.copyFrom(wallPoint(room, opening.wall, opening.offset, opening.sill));
    // Local -Z always faces the interior, including a wooden door handle.
    root.rotation.y = { north: 0, south: Math.PI, east: Math.PI / 2, west: -Math.PI / 2 }[opening.wall];
    const { width: w, height: h } = opening;
    const isWindow = opening.kind === 'window';
    const frame = isWindow ? mats.trim : mats.wood;
    for (const side of [-1, 1]) meshes.push(box(scene, `${opening.id} jamb ${side}`, .065, h, .17, side * (w / 2 - .0325), h / 2, 0, frame, root));
    meshes.push(box(scene, `${opening.id} head`, w, .065, .17, 0, h - .0325, 0, frame, root));
    if (isWindow) {
      meshes.push(box(scene, 'Window sill', w + .1, .035, .24, 0, .015, -.035, mats.trim, root));
      meshes.push(box(scene, 'Window center mullion', .045, h, .065, 0, h / 2, -.02, mats.trim, root));
      meshes.push(box(scene, 'Window glazing', w - .08, h - .08, .018, 0, h / 2, .045, mats.glass, root));
      for (const side of [-1, 1]) meshes.push(box(scene, `Window latch ${side}`, .014, .09, .028, side * .065, h * .48, -.065, mats.metal, root));
    } else {
      meshes.push(box(scene, 'Existing wooden door leaf', w - .1, h - .05, .045, 0, (h - .05) / 2, 0, mats.wood, root));
      for (const y of [.5, 1.45]) meshes.push(box(scene, `Door inset ${y}`, w - .24, .64, .01, 0, y, -.028, mats.wood, root));
      meshes.push(box(scene, 'Door lever', .11, .022, .07, -w * .32, 1.02, -.06, mats.metal, root));
      meshes.push(box(scene, 'Door escutcheon', .035, .14, .02, -w * .37, 1.02, -.033, mats.metal, root));
    }
  }
  for (const beam of room.beams.filter(b => b.enabled)) {
    const alongX = beam.wall === 'north' || beam.wall === 'south';
    const p = wallPoint(room, beam.wall, beam.offset, room.height - beam.drop / 2, room.wallThickness / 2 + beam.projection / 2);
    meshes.push(box(scene, beam.id, alongX ? beam.length : beam.projection, beam.drop, alongX ? beam.projection : beam.length, p.x, p.y, p.z, mats.wall, geometry.groups[beam.wall]));
  }
  for (const feature of room.cornerFeatures.filter(f => f.enabled)) {
    const x = (feature.corner.endsWith('east') ? 1 : -1) * (room.length / 2 - feature.width / 2);
    const z = (feature.corner.startsWith('north') ? 1 : -1) * (room.width / 2 - feature.depth / 2);
    meshes.push(box(scene, feature.id, feature.width, feature.height, feature.depth, x, feature.height / 2, z, mats.wall));
  }
  return meshes;
}
