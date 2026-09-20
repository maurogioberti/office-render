import test from 'node:test';
import assert from 'node:assert/strict';
import { Mesh, NullEngine, Scene } from '@babylonjs/core';
import { freshConfig } from '../src/config/office';
import type { FurnitureConfig } from '../src/config/types';
import { createFurniture } from '../src/furniture';
import { furnitureFootprints } from '../src/furniture/footprint';
import { createMaterials } from '../src/materials';
import { architectureConflict, canStand, obstacles, rectanglesOverlap, type Obstacle } from '../src/navigation/collision';

const near = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < .00001, `${actual} should equal ${expected}`);

function fixtureDesk(): FurnitureConfig {
  return {
    id: 'desk', name: 'Short-return corner desk', kind: 'desk', visible: true, color: '#bb926a',
    dimensions: { width: 1.45, depth: 2.2, height: .76 }, position: { x: -1.135, y: 0, z: -.16 }, rotation: 0,
    cornerDesk: { worktopDepth: .72, mainRun: 'depth', cornerNotch: { width: .23, depth: .19 } },
  };
}

function meshObstacle(mesh: Mesh): Obstacle {
  mesh.computeWorldMatrix(true);
  const { minimumWorld: min, maximumWorld: max } = mesh.getBoundingInfo().boundingBox;
  return { id: mesh.name, x: (min.x + max.x) / 2, z: (min.z + max.z) / 2, bottom: min.y, top: max.y,
    width: max.x - min.x, depth: max.z - min.z, rotation: 0 };
}

test('the corner cut removes only the measured notch and has no overlapping worktop pieces', () => {
  const desk = fixtureDesk(), parts = furnitureFootprints(desk), { width, depth } = desk.dimensions;
  const { worktopDepth: t, cornerNotch: notch } = desk.cornerDesk!;
  near(parts.reduce((sum, part) => sum + part.width * part.depth, 0), t * (width + depth - t) - notch!.width * notch!.depth);
  assert.equal(parts.length, 3, 'The two L runs need just one additional rectangle around the corner cut');
  const toObstacle = (part: (typeof parts)[number]): Obstacle => ({ ...part, id: 'part', rotation: 0, bottom: 0, top: .76 });
  for (const [i, part] of parts.entries()) {
    assert.ok(part.width > 0 && part.depth > 0);
    assert.ok(Math.abs(part.x) + part.width / 2 <= width / 2 + .000001);
    assert.ok(Math.abs(part.z) + part.depth / 2 <= depth / 2 + .000001);
    for (const other of parts.slice(i + 1)) assert.equal(rectanglesOverlap(toObstacle(part), toObstacle(other)), false);
  }
  // A wider configurable notch crosses the original two-piece seam; subtract its union once.
  desk.cornerDesk!.cornerNotch = { width: .81, depth: .19 };
  near(furnitureFootprints(desk).reduce((sum, part) => sum + part.width * part.depth, 0), t * (width + depth - t) - .81 * .19);
});

test('the fitted desk reaches both rear walls while clearing the fixed corner step', () => {
  const config = freshConfig(), desk = fixtureDesk();
  config.furniture = [desk];
  const parts = obstacles(config).filter(item => item.id === desk.id);
  assert.equal(architectureConflict(desk, config), undefined);
  near(desk.position.x - desk.dimensions.width / 2 + config.room.length / 2, .04);
  near(desk.position.z - desk.dimensions.depth / 2 + config.room.width / 2, .04);
  const step = obstacles(config).find(item => item.id === 'corner-step')!;
  assert.ok(parts.every(part => !rectanglesOverlap(part, step)));
  const notch = desk.cornerDesk!.cornerNotch!;
  near(desk.position.x - desk.dimensions.width / 2 + notch.width - (step.x + step.width / 2), .03);
  near(desk.position.z - desk.dimensions.depth / 2 + notch.depth - (step.z + step.depth / 2), .03);
  assert.ok(canStand(-.62, -.1, config.room, parts, .32), 'The chair has a clear bay beside the main work surface');
  desk.cornerDesk!.cornerNotch = { width: .15, depth: .12 };
  assert.equal(architectureConflict(desk, config), 'corner-step', 'Shrinking the relief too far must restore a real collision');
});

test('visible tops match collision pieces and six supports leave the working knee space open', () => {
  const config = freshConfig(), desk = fixtureDesk(), engine = new NullEngine(), scene = new Scene(engine);
  config.furniture = [desk];
  try {
    const object = createFurniture(scene, [desk], createMaterials(scene, config.room, false), config.room).get(desk.id)!;
    const tops = object.meshes.filter(mesh => mesh.name.includes('L worktop'));
    const legs = object.meshes.filter(mesh => mesh.name.includes('corner desk leg'));
    const rails = object.meshes.filter(mesh => mesh.name.includes('rear rail'));
    assert.equal(legs.length, 6, 'Supports belong to the two real runs, not every cut rectangle');
    assert.equal(rails.length, 2);
    const colliders = obstacles(config).filter(item => item.id === desk.id);
    assert.equal(tops.length, colliders.length);
    tops.forEach((mesh, index) => {
      const top = meshObstacle(mesh), collision = colliders[index];
      near(top.x, collision.x); near(top.z, collision.z);
      near(top.width, collision.width); near(top.depth, collision.depth);
      near(top.top, .76); near(top.bottom, .725);
    });
    const step = obstacles(config).find(item => item.id === 'corner-step')!;
    const kneeSpace: Obstacle = { id: 'knees', x: -1.375, z: -.1, width: .55, depth: .70, bottom: .08, top: .65, rotation: 0 };
    for (const mesh of object.meshes) {
      const piece = meshObstacle(mesh);
      assert.equal(rectanglesOverlap(piece, step), false, `${mesh.name} must clear the real step`);
      assert.equal(rectanglesOverlap(piece, kneeSpace), false, `${mesh.name} must keep the main seat's knee space open`);
      assert.ok(Math.abs(piece.x - desk.position.x) + piece.width / 2 <= desk.dimensions.width / 2 + .00001);
      assert.ok(Math.abs(piece.z - desk.position.z) + piece.depth / 2 <= desk.dimensions.depth / 2 + .00001);
      assert.ok(piece.bottom >= -.00001 && piece.top <= desk.dimensions.height + .00001);
    }
    // All four corners of each support remain under actual worktop, including around the relief.
    const contains = (x: number, z: number) => colliders.some(part => Math.abs(x - part.x) <= part.width / 2 + .00001
      && Math.abs(z - part.z) <= part.depth / 2 + .00001);
    for (const mesh of [...legs, ...rails]) {
      const support = meshObstacle(mesh);
      for (const x of [-1, 1]) for (const z of [-1, 1]) assert.ok(contains(support.x + x * support.width / 2,
        support.z + z * support.depth / 2), `${mesh.name} must support the worktop from underneath`);
    }
  } finally { scene.dispose(); engine.dispose(); }
});

test('older desks without a corner relief keep their original two runs and supports', () => {
  const desk = fixtureDesk(), config = freshConfig(), engine = new NullEngine(), scene = new Scene(engine);
  delete desk.cornerDesk!.cornerNotch;
  try {
    const parts = furnitureFootprints(desk);
    assert.equal(parts.length, 2);
    near(parts.reduce((sum, part) => sum + part.width * part.depth, 0), .72 * (1.45 + 2.2 - .72));
    const object = createFurniture(scene, [desk], createMaterials(scene, config.room, false), config.room).get(desk.id)!;
    assert.equal(object.meshes.filter(mesh => mesh.name.includes('L worktop')).length, 2);
    assert.equal(object.meshes.filter(mesh => mesh.name.includes('corner desk leg')).length, 8);
    assert.ok(!object.meshes.some(mesh => mesh.name.includes('rear rail')));
  } finally { scene.dispose(); engine.dispose(); }
});
