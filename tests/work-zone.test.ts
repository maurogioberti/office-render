import test from 'node:test';
import assert from 'node:assert/strict';
import { Matrix, Mesh, NullEngine, Quaternion, Scene, Vector3 } from '@babylonjs/core';
import { freshConfig } from '../src/config/office';
import { validateConfig } from '../src/config/storage';
import { createFurniture, disposeFurniture, type FurnitureObject } from '../src/furniture';
import { sharedArmGeometry } from '../src/furniture/deskArm';
import { workZonePlacementIssue } from '../src/furniture/workZonePlacement';
import { createMaterials } from '../src/materials';
import { architectureConflict, itemFitsRoom, obstacles, rectanglesOverlap, worldTransform } from '../src/navigation/collision';

const near = (actual: Vector3, expected: Vector3, message: string) =>
  assert.ok(Vector3.Distance(actual, expected) < .00001, message);
const endpoint = (link: Mesh, upper: boolean) =>
  Vector3.TransformCoordinates(new Vector3(0, upper ? .5 : -.5, 0), link.computeWorldMatrix(true));

function assertEnvelope(object: FurnitureObject) {
  const inverse = Matrix.Invert(object.root.computeWorldMatrix(true)), d = object.config.dimensions;
  for (const mesh of object.meshes) {
    mesh.computeWorldMatrix(true);
    for (const point of mesh.getBoundingInfo().boundingBox.vectorsWorld) {
      const p = Vector3.TransformCoordinates(point, inverse);
      assert.ok(Math.abs(p.x) <= d.width / 2 + .001 && Math.abs(p.z) <= d.depth / 2 + .001
        && p.y >= -.001 && p.y <= d.height + .001, `${mesh.name} must fit its metric envelope: ${p}`);
    }
  }
}

test('the work displays share one desk clamp and column, with two complete selectable arm branches', () => {
  const config = freshConfig(), engine = new NullEngine(), scene = new Scene(engine);
  try {
    const objects = createFurniture(scene, config.furniture, createMaterials(scene, config.room, false), config.room);
    const zone = objects.get('work-zone')!;
    const displays = [...objects.values()].filter(object => object.config.monitor?.mount === 'shared-arm');
    assert.equal(displays.length, 2);
    assert.equal(zone.meshes.filter(mesh => mesh.name.includes('clamp top jaw')).length, 1);
    assert.equal(zone.meshes.filter(mesh => mesh.name.includes('clamp lower jaw')).length, 1);
    assert.equal(zone.meshes.filter(mesh => mesh.name.includes('common monitor column')).length, 1);
    assert.equal(zone.meshes.filter(mesh => mesh.name.includes('inner link')).length, 2);
    assert.equal(zone.meshes.filter(mesh => mesh.name.includes('outer link')).length, 2);
    assert.ok(zone.meshes.every(mesh => mesh.isPickable && mesh.metadata.sharedArmSupport && mesh.metadata.furnitureId === zone.config.id));
    assertEnvelope(zone);
    const matrix = zone.root.computeWorldMatrix(true);
    for (const display of displays) {
      assert.equal(display.root.parent, zone.root);
      assert.ok(display.meshes.every(mesh => mesh.isPickable && mesh.metadata.furnitureId === display.config.id));
      assert.ok(!display.meshes.some(mesh => /clamp|stand foot|arm post/.test(mesh.name)), 'Individual displays cannot acquire separate desk stands');
      assertEnvelope(display);
      const geometry = sharedArmGeometry(zone.config, display.config);
      assert.ok(geometry.reach < zone.config.workZone!.armReach);
      const inner = zone.meshes.find(mesh => mesh.name.startsWith(display.config.id) && mesh.name.includes('inner link'))!;
      const outer = zone.meshes.find(mesh => mesh.name.startsWith(display.config.id) && mesh.name.includes('outer link'))!;
      near(endpoint(inner, false), Vector3.TransformCoordinates(geometry.start, matrix), 'Inner arm starts on the common column');
      near(endpoint(inner, true), endpoint(outer, false), 'The two links meet at one elbow');
      near(endpoint(outer, true), Vector3.TransformCoordinates(geometry.target, matrix), 'The outer link reaches the screen VESA joint');
    }
    assertEnvelope(objects.get('work-laptop')!);
  } finally { scene.dispose(); engine.dispose(); }
});

test('shared arms remain linked during nested desk, zone and live screen quaternion edits, and clean up render observers', async () => {
  const config = freshConfig(), engine = new NullEngine(), scene = new Scene(engine);
  try {
    const baseline = scene.onBeforeRenderObservable.observers.length;
    const objects = createFurniture(scene, config.furniture, createMaterials(scene, config.room, false), config.room);
    const desk = objects.get('desk')!, zone = objects.get('work-zone')!;
    const displays = [...objects.values()].filter(object => object.config.monitor?.mount === 'shared-arm');
    const wallScreens = [...objects.values()].filter(object => object.config.monitor?.mount === 'wall');
    const wallPositions = wallScreens.map(object => object.root.getAbsolutePosition().clone());
    const column = zone.meshes.find(mesh => mesh.name.includes('common monitor column'))!;
    const columnLocal = column.position.clone();
    for (const yaw of [.15, -.22, .31]) {
      desk.root.position.x += .03;
      desk.root.rotationQuaternion = Quaternion.RotationYawPitchRoll(yaw, 0, 0);
      zone.root.position.z += .01;
      zone.root.rotationQuaternion = Quaternion.RotationYawPitchRoll(Math.PI - yaw / 2, 0, 0);
      for (const display of displays) {
        display.root.position.x += .005;
        display.root.rotationQuaternion = Quaternion.RotationYawPitchRoll(display.config.rotation * Math.PI / 180 + yaw, 0, 0);
      }
      scene.onBeforeRenderObservable.notifyObservers(scene);
      column.computeWorldMatrix(true);
      near(column.getAbsolutePosition(), Vector3.TransformCoordinates(columnLocal, zone.root.computeWorldMatrix(true)), 'The common column follows its desk attachment');
      for (const display of displays) {
        const inner = zone.meshes.find(mesh => mesh.name.startsWith(display.config.id) && mesh.name.includes('inner link'))!;
        const outer = zone.meshes.find(mesh => mesh.name.startsWith(display.config.id) && mesh.name.includes('outer link'))!;
        const target = Vector3.TransformCoordinates(new Vector3(0, display.config.dimensions.height / 2, .035), display.root.computeWorldMatrix(true));
        near(endpoint(inner, true), endpoint(outer, false), 'The shared elbow stays connected while editing');
        near(endpoint(outer, true), target, 'The arm follows live screen translation and quaternion rotation');
      }
      wallScreens.forEach((object, i) => near(object.root.getAbsolutePosition(), wallPositions[i], 'The separate personal wall array stays fixed'));
    }
    const allSupports = [...objects.values()].flatMap(object => object.meshes).filter(mesh => mesh.metadata.wallMountSupport || mesh.metadata.sharedArmSupport);
    disposeFurniture(objects);
    assert.ok(allSupports.every(mesh => mesh.isDisposed()));
    await new Promise(resolve => setTimeout(resolve, 10));
    assert.equal(scene.onBeforeRenderObservable.observers.length, baseline);
  } finally { scene.dispose(); engine.dispose(); }
});

test('both zones are visible by default with six separate cases and a supported laptop', () => {
  const initial = freshConfig();
  assert.equal(initial.furniture.find(item => item.id === 'work-zone')!.visible, true);
  assert.equal(obstacles(initial).filter(item => item.id.startsWith('work-monitor') && !item.support).length, 2);
  initial.furniture.find(item => item.id === 'work-zone')!.visible = true;
  const config = validateConfig(initial), desk = config.furniture.find(item => item.id === 'desk')!;
  const zone = config.furniture.find(item => item.id === 'work-zone')!, laptop = config.furniture.find(item => item.kind === 'laptop')!;
  assert.equal(workZonePlacementIssue(zone, config), undefined);
  assert.equal(architectureConflict(desk, config), undefined);
  assert.ok(config.furniture.every(item => itemFitsRoom(item, config)));
  const monitorIds = new Set(config.furniture.filter(item => item.kind === 'monitor').map(item => item.id));
  const cases = obstacles(config).filter(item => monitorIds.has(item.id) && !item.support);
  assert.equal(cases.length, 6);
  for (let i = 0; i < cases.length; i++) for (let j = i + 1; j < cases.length; j++) {
    assert.equal(rectanglesOverlap(cases[i], cases[j]), false, `${cases[i].id} must clear ${cases[j].id}`);
  }
  const desktopY = worldTransform(desk, config.furniture).position.y + desk.dimensions.height;
  const laptopY = worldTransform(laptop, config.furniture).position.y;
  assert.equal(laptop.parentId, desk.id, 'Removing the optional dual arm cannot remove the laptop');
  assert.equal(laptop.onDesktop, true);
  assert.ok(Math.abs(laptopY - desktopY) < .00001, 'The laptop base rests on the desktop');
  assert.ok(cases.filter(item => item.id.startsWith('work-')).every(item => item.bottom > laptopY + laptop.dimensions.height), 'Both work monitors clear the open laptop');
  const unsupported = structuredClone(config);
  unsupported.furniture.find(item => item.id === laptop.id)!.position.x += .2;
  assert.throws(() => validateConfig(unsupported), /laptop must fit on the desktop/i);
});

test('laptop keyboard, touchpad and open screen stay within the envelope throughout the supported angle range', () => {
  for (const angle of [85, 105, 120]) {
    const config = freshConfig(), laptop = config.furniture.find(item => item.kind === 'laptop')!;
    laptop.laptop!.openingAngle = angle;
    const engine = new NullEngine(), scene = new Scene(engine);
    try {
      const objects = createFurniture(scene, config.furniture, createMaterials(scene, config.room, false), config.room);
      const object = objects.get(laptop.id)!;
      assertEnvelope(object);
      assert.ok(object.meshes.some(mesh => mesh.name.includes('keyboard key')));
      assert.ok(object.meshes.some(mesh => mesh.name.includes('touchpad')));
      assert.ok(object.meshes.some(mesh => mesh.name.includes('laptop active screen')));
      assert.ok(object.meshes.every(mesh => mesh.isPickable && mesh.metadata.furnitureId === laptop.id));
    } finally { scene.dispose(); engine.dispose(); }
  }
});
