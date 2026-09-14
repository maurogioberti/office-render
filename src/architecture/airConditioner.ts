import { Mesh, MeshBuilder, Scene, StandardMaterial, TransformNode } from '@babylonjs/core';
import type { RoomConfig } from '../config/types';
import { solid, type Materials } from '../materials';
import { box, wallPoint, type RoomGeometry } from '../room/geometry';

/** A classic self-contained through-wall unit: the configured depth includes both room and exterior faces. */
export function createAirConditioner(scene: Scene, room: RoomConfig, mats: Materials, geometry: RoomGeometry): Mesh[] {
  const config = room.airConditioner;
  if (!config?.enabled) return [];
  const root = new TransformNode('wall-ac fixture', scene);
  root.parent = geometry.groups[config.wall];
  root.position.copyFrom(wallPoint(room, config.wall, config.offset, config.bottom));
  root.rotation.y = { north: 0, south: Math.PI, east: Math.PI / 2, west: -Math.PI / 2 }[config.wall];
  root.metadata = { fixtureId: 'wall-ac', wall: config.wall };

  const casing = solid(scene, 'wall-ac cream enamel', config.color, .12);
  const recess = solid(scene, 'wall-ac dark ventilation recesses', '#343a36', .03);
  const sleeve = solid(scene, 'wall-ac galvanized sleeve', '#97998f', .26);
  const seal = solid(scene, 'wall-ac perimeter seal', '#8c8e82', .03);
  const owned = [casing, recess, sleeve, seal];
  root.onDisposeObservable.addOnce(() => owned.forEach(material => material.dispose()));

  const meshes: Mesh[] = [];
  const add = (name: string, part: string, width: number, height: number, depth: number,
    x: number, y: number, z: number, material: StandardMaterial = casing) => {
    const mesh = box(scene, `wall-ac ${name}`, width, height, depth, x, y, z, material, root);
    mesh.metadata = { fixtureId: 'wall-ac', wall: config.wall, acPart: part };
    meshes.push(mesh); return mesh;
  };
  const w = config.width, h = config.height, d = config.depth;
  const front = -room.wallThickness / 2 - config.interiorProjection, rear = front + d;
  const frontDepth = Math.min(.023, d * .12), rearDepth = Math.min(.016, d * .08);
  const rim = Math.min(.017, w * .035, h * .04);
  add('rectangular case body', 'case', w, h, d - frontDepth - rearDepth,
    0, h / 2, front + frontDepth + (d - frontDepth - rearDepth) / 2);

  // Open face rails surround recessed vents; the case is never mistaken for a modern split unit.
  for (const side of [-1, 1]) {
    add(`front side rail ${side}`, 'case', rim, h, frontDepth, side * (w - rim) / 2, h / 2, front + frontDepth / 2);
    add(`front horizontal rail ${side}`, 'case', w - 2 * rim, rim, frontDepth,
      0, side < 0 ? rim / 2 : h - rim / 2, front + frontDepth / 2);
  }
  add('front center fascia', 'case', w - rim * 2, h * .085, frontDepth, 0, h * .605, front + frontDepth / 2);

  const intakeW = w * .90, intakeH = h * .49, intakeY = h * .30;
  add('front intake backing', 'intake', intakeW, intakeH, .006, 0, intakeY, front + .019, recess);
  const intakeCount = Math.max(5, Math.ceil(intakeH / .016)), intakePitch = intakeH / intakeCount;
  for (let i = 0; i < intakeCount; i++) {
    add(`front intake grille slat ${i}`, 'intake', intakeW, intakePitch * .36, .009,
      0, intakeY - intakeH / 2 + intakePitch * (i + .5), front + .006);
  }
  for (const side of [-1, 1]) add(`front intake grille rib ${side}`, 'intake', .004, intakeH, .004,
    side * intakeW * .26, intakeY, front + .003);

  const outletW = w * .68, outletH = h * .23, outletX = -w * .105, outletY = h * .795;
  add('front outlet recess', 'outlet', outletW, outletH, .006, outletX, outletY, front + .019, recess);
  const vaneCount = Math.max(4, Math.ceil(outletW / .035)), vanePitch = outletW / vaneCount;
  for (let i = 0; i < vaneCount; i++) {
    const vane = add(`front outlet directional vane ${i}`, 'outlet-vane', .005, outletH * .90, .021,
      outletX - outletW / 2 + vanePitch * (i + .5), outletY, front + .012);
    vane.rotation.y = config.louverYaw * Math.PI / 180;
  }
  for (const fraction of [-.3, .3]) {
    const guide = add(`front outlet horizontal guide ${fraction}`, 'outlet', outletW, .005, .016,
      outletX, outletY + outletH * fraction, front + .012);
    guide.rotation.x = Math.PI / 12;
  }

  const controlsX = w * .375;
  add('mechanical control panel', 'controls', w * .16, h * .255, .008, controlsX, outletY, front + .018, sleeve);
  for (const [index, y] of [h * .73, h * .865].entries()) {
    const diameter = Math.min(w * .047, h * .084);
    const knob = MeshBuilder.CreateCylinder(`wall-ac mechanical dial ${index}`, { diameter, height: .014, tessellation: 16 }, scene);
    knob.position.set(controlsX, y, front + .007); knob.rotation.x = Math.PI / 2;
    knob.parent = root; knob.material = mats.dark; knob.receiveShadows = true; knob.isPickable = false;
    knob.metadata = { fixtureId: 'wall-ac', wall: config.wall, acPart: 'controls' }; meshes.push(knob);
    add(`dial pointer ${index}`, 'controls', .003, diameter * .30, .001,
      controlsX, y + diameter * .18, front + .0005, mats.metal);
    for (const side of [-1, 1]) add(`dial scale ${index} ${side}`, 'controls', .002, .004, .001,
      controlsX + side * diameter * .70, y + diameter * .33, front + .0135, mats.dark);
  }

  // A 3 mm metal sleeve occupies the 4 mm construction clearance around the actual wall opening.
  const sleeveThickness = .003, sleeveDepth = Math.min(room.wallThickness, d - config.interiorProjection);
  const sleeveCenter = -room.wallThickness / 2 + sleeveDepth / 2;
  for (const side of [-1, 1]) {
    add(`wall sleeve side ${side}`, 'sleeve', sleeveThickness, h + sleeveThickness * 2, sleeveDepth,
      side * (w / 2 + sleeveThickness / 2), h / 2, sleeveCenter, sleeve);
    add(`wall sleeve horizontal ${side}`, 'sleeve', w, sleeveThickness, sleeveDepth,
      0, side < 0 ? -sleeveThickness / 2 : h + sleeveThickness / 2, sleeveCenter, sleeve);
  }
  const trim = config.trimWidth, trimDepth = .008;
  const trimZ = Math.max(front + trimDepth / 2, -room.wallThickness / 2 - trimDepth / 2);
  if (trim > 0) {
    for (const side of [-1, 1]) {
      add(`wall trim side ${side}`, 'trim', trim, h + 2 * trim, trimDepth,
        side * (w / 2 + trim / 2), h / 2, trimZ, casing);
      add(`wall trim horizontal ${side}`, 'trim', w, trim, trimDepth,
        0, side < 0 ? -trim / 2 : h + trim / 2, trimZ, casing);
      add(`wall seal side ${side}`, 'trim', .003, h, .003,
        side * (w / 2 + .0015), h / 2, trimZ - trimDepth / 2 + .0015, seal);
    }
  }

  // The exterior face remains visible in orbit views and shares the same exact total-depth envelope.
  const rearRim = Math.min(.015, rim);
  for (const side of [-1, 1]) {
    add(`rear case side ${side}`, 'case', rearRim, h, rearDepth,
      side * (w - rearRim) / 2, h / 2, rear - rearDepth / 2, sleeve);
    add(`rear case horizontal ${side}`, 'case', w - 2 * rearRim, rearRim, rearDepth,
      0, side < 0 ? rearRim / 2 : h - rearRim / 2, rear - rearDepth / 2, sleeve);
  }
  const rearW = w - 2 * rearRim, rearH = h - 2 * rearRim;
  add('exterior rear vent backing', 'rear-vent', rearW, rearH, .006, 0, h / 2, rear - .010, recess);
  const rearCount = Math.max(6, Math.ceil(rearH / .021)), rearPitch = rearH / rearCount;
  for (let i = 0; i < rearCount; i++) add(`exterior rear grille slat ${i}`, 'rear-vent', rearW, rearPitch * .20, .005,
    0, rearRim + rearPitch * (i + .5), rear - .0025, sleeve);
  for (const fraction of [-.30, 0, .30]) add(`exterior rear grille rib ${fraction}`, 'rear-vent', .004, rearH, .004,
    rearW * fraction, h / 2, rear - .002, sleeve);
  return meshes;
}
