import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { Mesh, NullEngine, Ray, Scene, Vector3 } from '@babylonjs/core';
import { freshConfig } from '../src/config/office';
import { createMaterials } from '../src/materials';
import { createRoom } from '../src/room/geometry';
import { createArchitecture } from '../src/architecture/features';
import { createFurniture } from '../src/furniture';
import { airConditionerObstacle } from '../src/architecture/airConditionerLayout';
import { obstacles, rectanglesOverlap } from '../src/navigation/collision';

const near = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < .00001, `${actual} should equal ${expected}`);

function fixture(config = freshConfig()) {
  const engine = new NullEngine(), scene = new Scene(engine);
  const materials = createMaterials(scene, config.room, false), room = createRoom(scene, config.room, materials);
  const existingMaterials = new Set(scene.materials);
  const architecture = createArchitecture(scene, config.room, materials, room);
  const ownedMaterials = scene.materials.filter(material => !existingMaterials.has(material));
  scene.meshes.forEach(mesh => mesh.computeWorldMatrix(true));
  const acMeshes = architecture.filter(mesh => mesh.metadata?.fixtureId === 'wall-ac');
  return { config, engine, scene, materials, room, architecture, acMeshes, ownedMaterials, dispose: () => { scene.dispose(); engine.dispose(); } };
}

function enclosure(meshes: Mesh[]) {
  assert.ok(meshes.length > 0, 'The casing must contain visible geometry');
  const boxes = meshes.map(mesh => mesh.getBoundingInfo().boundingBox);
  return {
    min: new Vector3(Math.min(...boxes.map(b => b.minimumWorld.x)), Math.min(...boxes.map(b => b.minimumWorld.y)), Math.min(...boxes.map(b => b.minimumWorld.z))),
    max: new Vector3(Math.max(...boxes.map(b => b.maximumWorld.x)), Math.max(...boxes.map(b => b.maximumWorld.y)), Math.max(...boxes.map(b => b.maximumWorld.z))),
  };
}

test('the workstation redesign preserves the approved room and installed A/C verbatim', () => {
  const current = freshConfig();
  assert.ok(current.room.airConditioner?.enabled);
  // Independent room snapshot exported from approved commit f1e10a0, including its A/C.
  // Furniture is intentionally redesigned; walls, openings, soffits and installation stay fixed.
  const checksum = createHash('sha256').update(JSON.stringify(current.room)).digest('hex');
  assert.equal(checksum, 'a0fe5c0a79998cc20d16783a1b9dcc6e0063ac8cf1618cfd1fb2892390d9797e');
});

test('the box casing crosses a real wall opening with the specified indoor and outdoor depths', () => {
  const f = fixture();
  try {
    const ac = f.config.room.airConditioner!;
    assert.equal(ac.wall, 'south');
    const casing = enclosure(f.acMeshes.filter(mesh => mesh.metadata.acPart === 'case'));
    near(casing.max.x - casing.min.x, .66); near(casing.max.y - casing.min.y, .43); near(casing.max.z - casing.min.z, .60);
    near(casing.min.x, -.63); near(casing.max.x, .03);
    near(casing.min.y, 1.85); near(casing.max.y, 2.28);
    near(casing.max.z, -1.12); near(casing.min.z, -1.72);
    near(casing.max.z + f.config.room.width / 2, .18);
    near(-f.config.room.width / 2 - f.config.room.wallThickness - casing.min.z, .30);
    const towardWall = new Vector3(0, 0, -1);
    for (const [x, y] of [[ac.offset, ac.bottom + ac.height / 2], [ac.offset - ac.width / 2 + .02, ac.bottom + .02], [ac.offset + ac.width / 2 - .02, ac.bottom + ac.height - .02]]) {
      const ray = new Ray(new Vector3(x, y, 0), towardWall, 3);
      assert.equal(f.scene.pickWithRay(ray, mesh => mesh.name.includes('plaster'))?.hit, false, 'No hidden solid plaster may remain through the appliance sleeve');
    }
    for (const x of [ac.offset - ac.width / 2 - ac.trimWidth - .02, ac.offset + ac.width / 2 + ac.trimWidth + .02]) {
      const ray = new Ray(new Vector3(x, ac.bottom + ac.height / 2, 0), towardWall, 3);
      assert.equal(f.scene.pickWithRay(ray, mesh => mesh.name.includes('plaster'))?.hit, true, 'Wall outside the trim must remain solid');
    }
  } finally { f.dispose(); }
});

test('the A/C clears the window, soffit and all furniture while its outlet points into the room above the monitors', () => {
  const f = fixture();
  try {
    const casing = enclosure(f.acMeshes.filter(mesh => mesh.metadata.acPart === 'case'));
    const window = f.config.room.openings.find(o => o.kind === 'window')!;
    const soffit = enclosure(f.architecture.filter(mesh => mesh.metadata?.wall === 'south' && mesh.metadata?.architectureId));
    near(window.offset - window.width / 2 - casing.max.x, .195);
    near(soffit.min.y - casing.max.y, .21);
    const occupied = airConditionerObstacle(f.config.room, true)!;
    assert.ok(!obstacles(f.config).some(item => item.id !== 'wall-ac' && rectanglesOverlap(occupied, item)));

    const vanes = f.acMeshes.filter(mesh => mesh.metadata.acPart === 'outlet-vane');
    assert.ok(vanes.length > 1, 'The outlet must have adjustable directional vanes');
    for (const vane of vanes) {
      near(vane.rotation.y, 15 * Math.PI / 180);
      const flow = Vector3.TransformNormal(new Vector3(0, 0, -1), vane.computeWorldMatrix(true)).normalize();
      near(flow.x, Math.sin(15 * Math.PI / 180)); near(flow.y, 0); near(flow.z, Math.cos(15 * Math.PI / 180));
    }
    const objects = createFurniture(f.scene, f.config.furniture, f.materials, f.config.room);
    const monitorTop = Math.max(...[...objects.values()].filter(object => object.config.kind === 'monitor').flatMap(object => object.meshes.map(mesh => {
      mesh.computeWorldMatrix(true); return mesh.getBoundingInfo().boundingBox.maximumWorld.y;
    })));
    const outlet = enclosure(vanes), outletHeight = (outlet.min.y + outlet.max.y) / 2;
    assert.ok(outletHeight > monitorTop, 'The horizontal outlet must sit above all existing screens and arms');
    const direction = Vector3.TransformNormal(new Vector3(0, 0, -1), vanes[0].getWorldMatrix()).normalize();
    const ray = new Ray(new Vector3((casing.min.x + casing.max.x) / 2, outletHeight, casing.max.z + .025), direction, 2.3);
    assert.equal(f.scene.pickWithRay(ray, mesh => !!mesh.metadata?.furnitureId)?.hit, false, 'The outlet direction into the room must not pass through furniture');
  } finally { f.dispose(); }
});

test('the fixture follows wall cutaway visibility and disposes its own materials with the wall', () => {
  const f = fixture();
  try {
    assert.ok(f.acMeshes.length > 0); assert.ok(f.ownedMaterials.length > 0);
    assert.ok(f.acMeshes.every(mesh => mesh.isDescendantOf(f.room.groups.south)));
    f.room.groups.south.setEnabled(false);
    assert.ok(f.acMeshes.every(mesh => !mesh.isEnabled()));
    f.room.groups.south.setEnabled(true);
    assert.ok(f.acMeshes.every(mesh => mesh.isEnabled()));
    f.room.groups.south.dispose();
    assert.ok(f.acMeshes.every(mesh => mesh.isDisposed()));
    assert.ok(f.ownedMaterials.every(material => !f.scene.materials.includes(material)), 'Rebuilding architecture must not leak fixture materials');
    assert.ok(f.scene.materials.includes(f.materials.walls.north), 'Fixture cleanup must retain shared room materials');
  } finally { f.dispose(); }
});

test('disabled A/C and legacy layouts without the feature retain solid plaster and create no fixture', () => {
  for (const legacy of [false, true]) {
    const config = freshConfig();
    if (legacy) delete config.room.airConditioner;
    else config.room.airConditioner!.enabled = false;
    const f = fixture(config);
    try {
      assert.equal(f.acMeshes.length, 0);
      assert.equal(f.scene.getTransformNodeByName('wall-ac fixture'), null);
      const ray = new Ray(new Vector3(-.30, 1.85 + .43 / 2, 0), new Vector3(0, 0, -1), 3);
      assert.equal(f.scene.pickWithRay(ray, mesh => mesh.name.includes('plaster'))?.hit, true);
      assert.equal(airConditionerObstacle(config.room), undefined);
    } finally { f.dispose(); }
  }
});
