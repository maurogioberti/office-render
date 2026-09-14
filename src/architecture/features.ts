import { Mesh, Scene, TransformNode } from '@babylonjs/core';
import type { RoomConfig } from '../config/types';
import type { Materials } from '../materials';
import { box, wallPoint, type RoomGeometry } from '../room/geometry';

type SolidBounds = { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number };

/** Keep adjacent soffits solid without drawing coincident undersides at their join. */
function subtractSolid(source: SolidBounds, occupied: SolidBounds): SolidBounds[] {
  const intersection = {
    minX: Math.max(source.minX, occupied.minX), maxX: Math.min(source.maxX, occupied.maxX),
    minY: Math.max(source.minY, occupied.minY), maxY: Math.min(source.maxY, occupied.maxY),
    minZ: Math.max(source.minZ, occupied.minZ), maxZ: Math.min(source.maxZ, occupied.maxZ),
  };
  if (intersection.maxX <= intersection.minX || intersection.maxY <= intersection.minY || intersection.maxZ <= intersection.minZ) return [source];
  const pieces: SolidBounds[] = [
    { ...source, maxX: intersection.minX },
    { ...source, minX: intersection.maxX },
    { ...source, minX: intersection.minX, maxX: intersection.maxX, maxY: intersection.minY },
    { ...source, minX: intersection.minX, maxX: intersection.maxX, minY: intersection.maxY },
    { ...intersection, minZ: source.minZ, maxZ: intersection.minZ },
    { ...intersection, minZ: intersection.maxZ, maxZ: source.maxZ },
  ];
  return pieces.filter(p => p.maxX - p.minX > .00001 && p.maxY - p.minY > .00001 && p.maxZ - p.minZ > .00001);
}

export function createArchitecture(scene: Scene, room: RoomConfig, mats: Materials, geometry: RoomGeometry) {
  const meshes: Mesh[] = [];
  for (const opening of room.openings) {
    const root = new TransformNode(opening.id, scene);
    root.parent = geometry.groups[opening.wall];
    root.position.copyFrom(wallPoint(room, opening.wall, opening.offset, opening.sill));
    // Local -Z always faces the interior, including a wooden door handle.
    root.rotation.y = { north: 0, south: Math.PI, east: Math.PI / 2, west: -Math.PI / 2 }[opening.wall];
    const { width: w, height: h } = opening;
    if (opening.kind === 'window') {
      const detail = opening.windowDetail;
      const frame = mats.windowFrames[opening.id];
      const fw = detail?.frameWidth ?? Math.min(.055, w / 5, h / 8);
      const fd = detail?.frameDepth ?? .1;
      const housing = detail?.housingHeight ?? Math.min(.24, h * .45);
      // The front lip sits just inside the room, independent of wall thickness.
      const frameZ = fd / 2 - room.wallThickness / 2 - .012;
      const add = (name: string, width: number, height: number, depth: number, x: number, y: number, z: number, material = frame) => {
        const mesh = box(scene, `${opening.id} ${name}`, width, height, depth, x, y, z, material, root);
        meshes.push(mesh); return mesh;
      };
      const innerWidth = w - fw * 2, sashTop = h - housing - fw * .4;
      for (const side of [-1, 1]) add(`jamb ${side}`, fw, h, fd, side * (w - fw) / 2, h / 2, frameZ);
      add('head', innerWidth, fw, fd, 0, h - fw / 2, frameZ);
      add('bottom track', innerWidth, fw, fd, 0, fw / 2, frameZ);
      add('roller housing face', innerWidth, housing - fw, .026, 0, h - housing / 2 - fw / 2, frameZ - fd / 2 + .013);
      add('roller housing underside', innerWidth, fw * .8, fd, 0, h - housing, frameZ);

      // Overlapping sliding leaves occupy separate depth tracks. The overall opening
      // includes the shutter housing, so it never appears as additional window height.
      const stile = fw * .57, leafWidth = innerWidth / 2 + stile / 2;
      const sashHeight = sashTop - fw;
      for (const side of [-1, 1]) {
        const x = side * (innerWidth - stile) / 4;
        const z = frameZ + (side < 0 ? -.1 : .17) * fd;
        for (const edge of [-1, 1]) {
          add(`sliding leaf ${side} stile ${edge}`, stile, sashHeight, .025, x + edge * (leafWidth - stile) / 2, fw + sashHeight / 2, z);
        }
        for (const y of [fw + stile / 2, sashTop - stile / 2]) add(`sliding leaf ${side} rail ${y}`, leafWidth - 2 * stile, stile, .025, x, y, z);
        add(`glazing ${side}`, leafWidth - 2 * stile, sashHeight - 2 * stile, .006, x, fw + sashHeight / 2, z + .007, mats.glass);
        add(`sliding latch ${side}`, .012, .09, .02, side * stile * .7, fw + sashHeight * .48, z - .022, mats.dark);
      }
      if (detail?.shutterClosed ?? true) {
        const count = Math.max(1, Math.ceil(sashHeight / (detail?.slatPitch ?? .035)));
        const pitch = sashHeight / count;
        const shutterZ = frameZ + fd / 2 - .005;
        add('shutter backing', innerWidth, sashHeight, .009, 0, fw + sashHeight / 2, shutterZ + .008, mats.trim);
        for (let i = 0; i < count; i++) {
          add(`shutter slat ${i}`, innerWidth, pitch * .94, .012, 0, fw + pitch * (i + .5), shutterZ, mats.shutter);
        }
      }
      // A slim strap beside the frame is visible in the reference photograph.
      add('shutter strap', .012, h - .12, .007, w / 2 + .045, h / 2, -room.wallThickness / 2 - .009, mats.shutter);
      for (const y of [.07, h - .07]) add(`strap guide ${y}`, .024, .032, .014, w / 2 + .045, y, -room.wallThickness / 2 - .014, mats.trim);
    } else {
      for (const side of [-1, 1]) meshes.push(box(scene, `${opening.id} jamb ${side}`, .065, h, .17, side * (w / 2 - .0325), h / 2, 0, mats.wood, root));
      meshes.push(box(scene, `${opening.id} head`, w, .065, .17, 0, h - .0325, 0, mats.wood, root));
      meshes.push(box(scene, 'Existing wooden door leaf', w - .1, h - .05, .045, 0, (h - .05) / 2, 0, mats.wood, root));
      for (const y of [.5, 1.45]) meshes.push(box(scene, `Door inset ${y}`, w - .24, .64, .01, 0, y, -.028, mats.wood, root));
      meshes.push(box(scene, 'Door lever', .11, .022, .07, -w * .32, 1.02, -.06, mats.metal, root));
      meshes.push(box(scene, 'Door escutcheon', .035, .14, .02, -w * .37, 1.02, -.033, mats.metal, root));
    }
  }
  const occupied: SolidBounds[] = [];
  for (const beam of room.beams.filter(b => b.enabled)) {
    const alongX = beam.wall === 'north' || beam.wall === 'south';
    const p = wallPoint(room, beam.wall, beam.offset, room.height - beam.drop / 2, room.wallThickness / 2 + beam.projection / 2);
    const width = alongX ? beam.length : beam.projection, depth = alongX ? beam.projection : beam.length;
    const bounds = { minX: p.x - width / 2, maxX: p.x + width / 2, minY: p.y - beam.drop / 2, maxY: p.y + beam.drop / 2, minZ: p.z - depth / 2, maxZ: p.z + depth / 2 };
    const pieces = occupied.reduce((remaining, solid) => remaining.flatMap(part => subtractSolid(part, solid)), [bounds]);
    for (const [index, part] of pieces.entries()) {
      const mesh = box(scene, index === 0 ? beam.id : `${beam.id} join ${index}`, part.maxX - part.minX, part.maxY - part.minY, part.maxZ - part.minZ, (part.minX + part.maxX) / 2, (part.minY + part.maxY) / 2, (part.minZ + part.maxZ) / 2, mats.walls[beam.wall], geometry.groups[beam.wall]);
      mesh.metadata = { architectureId: beam.id, wall: beam.wall };
      meshes.push(mesh);
    }
    occupied.push(bounds);
  }
  for (const feature of room.cornerFeatures.filter(f => f.enabled)) {
    const x = (feature.corner.endsWith('east') ? 1 : -1) * (room.length / 2 - feature.width / 2);
    const z = (feature.corner.startsWith('north') ? 1 : -1) * (room.width / 2 - feature.depth / 2);
    meshes.push(box(scene, feature.id, feature.width, feature.height, feature.depth, x, feature.height / 2, z, mats.wall));
  }
  return meshes;
}
