import test from 'node:test';
import assert from 'node:assert/strict';
import { Mesh, NullEngine, Quaternion, Scene, Vector3 } from '@babylonjs/core';
import { freshConfig } from '../src/config/office';
import { createFurniture, disposeFurniture } from '../src/furniture';
import { monitorMountGeometry } from '../src/furniture/wallMounts';
import { createMaterials } from '../src/materials';

const near = (actual: Vector3, expected: Vector3, message: string) =>
  assert.ok(Vector3.Distance(actual, expected) < .00001, message);
const endpoint = (link: Mesh, upper: boolean) =>
  Vector3.TransformCoordinates(new Vector3(0, upper ? .5 : -.5, 0), link.computeWorldMatrix(true));

test('wall-mounted monitor arms connect solid-wall plates to VESA joints within their configured reach', () => {
  const config = freshConfig(), engine = new NullEngine(), scene = new Scene(engine);
  try {
    const objects = createFurniture(scene, config.furniture, createMaterials(scene, config.room, false), config.room);
    const monitors = [...objects.values()].filter(object => object.config.monitor?.mount === 'wall');
    assert.equal(monitors.length, 4);
    for (const object of monitors) {
      const geometry = monitorMountGeometry(object.config, config.room);
      assert.ok(geometry.reach > .1 && geometry.reach < object.config.monitor!.wallMount!.maxReach,
        'A compact folded wall arm must still have positive reach and stay within its configured extension');
      assert.equal(object.config.parentId, undefined);
      const plate = object.meshes.find(mesh => mesh.name.includes('wall mounting plate'))!;
      const inner = object.meshes.find(mesh => mesh.name.includes('wall arm inner link'))!;
      const outer = object.meshes.find(mesh => mesh.name.includes('wall arm outer link'))!;
      plate.computeWorldMatrix(true);
      near(plate.getAbsolutePosition(), geometry.anchor.add(geometry.normal.scale(.008)), `${object.config.id} wall plate`);
      near(endpoint(inner, false), geometry.start, 'Inner link starts at the fixed wall pivot');
      near(endpoint(inner, true), geometry.elbow, 'Inner link reaches the elbow');
      near(endpoint(outer, false), geometry.elbow, 'Outer link shares the same elbow');
      near(endpoint(outer, true), geometry.target, 'Outer link reaches the rear screen joint');
      const supports = object.meshes.filter(mesh => mesh.metadata.wallMountSupport);
      assert.equal(supports.length, 7);
      assert.ok(supports.every(mesh => mesh.isPickable && mesh.metadata.furnitureId === object.config.id));
      assert.ok(!object.meshes.some(mesh => /clamp|stand foot|arm post/.test(mesh.name)));
    }
  } finally { scene.dispose(); engine.dispose(); }
});

test('wall anchors stay fixed through desk edits and live monitor translation/quaternion rotation; observers are disposed', async () => {
  const config = freshConfig(), engine = new NullEngine(), scene = new Scene(engine);
  try {
    const baseline = scene.onBeforeRenderObservable.observers.length;
    const objects = createFurniture(scene, config.furniture, createMaterials(scene, config.room, false), config.room);
    const monitors = [...objects.values()].filter(object => object.config.monitor?.mount === 'wall');
    const original = new Map(monitors.map(object => [object.config.id, object.root.getAbsolutePosition().clone()]));
    const desk = objects.get('desk')!.root;
    desk.position.x += .2; desk.rotation.y += .2; desk.computeWorldMatrix(true);
    scene.onBeforeRenderObservable.notifyObservers(scene);
    for (const object of monitors) near(object.root.getAbsolutePosition(), original.get(object.config.id)!, 'Desk edits leave the wall-mounted screen in place');

    for (const object of monitors) {
      const geometry = monitorMountGeometry(object.config, config.room);
      object.root.position.x += .04;
      object.root.rotationQuaternion = Quaternion.RotationYawPitchRoll(object.config.rotation * Math.PI / 180 + .15, 0, 0);
      scene.onBeforeRenderObservable.notifyObservers(scene);
      const plate = object.meshes.find(mesh => mesh.name.includes('wall mounting plate'))!;
      const outer = object.meshes.find(mesh => mesh.name.includes('wall arm outer link'))!;
      plate.computeWorldMatrix(true);
      near(plate.getAbsolutePosition(), geometry.anchor.add(geometry.normal.scale(.008)), 'Live gizmo movement leaves the wall plate attached');
      const normal = Vector3.TransformNormal(Vector3.Forward(), plate.getWorldMatrix()).normalize();
      near(normal, geometry.normal, 'Wall plate orientation remains parallel to its wall during quaternion rotation');
      const liveTarget = Vector3.TransformCoordinates(new Vector3(0, object.config.dimensions.height / 2, .035), object.root.computeWorldMatrix(true));
      near(endpoint(outer, true), liveTarget, 'The moving screen remains linked to the fixed wall arm');
    }
    disposeFurniture(objects);
    // Babylon marks observers for removal immediately and unregisters them on the next timer turn.
    await new Promise(resolve => setTimeout(resolve, 10));
    assert.equal(scene.onBeforeRenderObservable.observers.length, baseline);
  } finally { scene.dispose(); engine.dispose(); }
});
