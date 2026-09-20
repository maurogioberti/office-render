import test from 'node:test';
import assert from 'node:assert/strict';
import { Mesh, NullEngine, Scene } from '@babylonjs/core';
import { freshConfig } from '../src/config/office';
import { createArchitecture } from '../src/architecture/features';
import { createMaterials } from '../src/materials';
import { createRoom } from '../src/room/geometry';
import { architectureConflict, canStand, findWalkStart, moveWithCollisions, obstacles, rectanglesOverlap, type Obstacle } from '../src/navigation/collision';

const near = (actual: number, expected: number, message?: string) => assert.ok(Math.abs(actual - expected) < .00001, message ?? `${actual} should equal ${expected}`);

function fixture(config = freshConfig()) {
  const engine = new NullEngine(), scene = new Scene(engine);
  const materials = createMaterials(scene, config.room, false);
  const room = createRoom(scene, config.room, materials);
  const meshes = createArchitecture(scene, config.room, materials, room);
  meshes.forEach(mesh => mesh.computeWorldMatrix(true));
  return { config, scene, materials, meshes, dispose: () => { scene.dispose(); engine.dispose(); } };
}

function bounds(mesh: Mesh) {
  const box = mesh.getBoundingInfo().boundingBox;
  return { min: box.minimumWorld, max: box.maximumWorld };
}

function assertSeparateSolids(meshes: Mesh[]) {
  for (let i = 0; i < meshes.length; i++) for (let j = i + 1; j < meshes.length; j++) {
    const a = bounds(meshes[i]), b = bounds(meshes[j]);
    const overlap = (['x', 'y', 'z'] as const).map(axis => Math.min(a.max[axis], b.max[axis]) - Math.max(a.min[axis], b.min[axis]));
    assert.ok(overlap.some(length => length < .00001), `${meshes[i].name} overlaps ${meshes[j].name}`);
  }
}

function volume(meshes: Mesh[]) {
  return meshes.reduce((sum, mesh) => {
    const b = bounds(mesh);
    return sum + (b.max.x - b.min.x) * (b.max.y - b.min.y) * (b.max.z - b.min.z);
  }, 0);
}

test('photographed window is tall, bronze and raised, with its housing inside the opening below the soffit', () => {
  const f = fixture();
  try {
    const window = f.config.room.openings.find(o => o.kind === 'window')!;
    const jambs = f.meshes.filter(m => m.name.startsWith('window jamb'));
    const lowX = Math.min(...jambs.map(m => bounds(m).min.x)), highX = Math.max(...jambs.map(m => bounds(m).max.x));
    const lowY = Math.min(...jambs.map(m => bounds(m).min.y)), highY = Math.max(...jambs.map(m => bounds(m).max.y));
    near(highX - lowX, .95); near(highY - lowY, 1.35); near(lowY, 1.12);
    near((lowX + highX) / 2, window.offset);
    assert.equal(window.wall, 'south'); assert.ok(window.offset > 0, 'Window stays toward the door end');
    assert.equal(f.materials.windowFrames.window.diffuseColor.toHexString(), '#4C4636');
    assert.notEqual(f.materials.windowFrames.window, f.materials.trim);
    const housing = bounds(f.meshes.find(m => m.name === 'window roller housing face')!);
    assert.ok(housing.min.y > lowY && housing.max.y <= highY);
    near(housing.min.y, window.sill + window.height - window.windowDetail!.housingHeight);
    const soffit = f.config.room.beams.find(b => b.wall === window.wall)!;
    near(f.config.room.height - soffit.drop - highY, .02);
    assert.equal(f.meshes.filter(m => m.name.startsWith('window glazing ')).length, 2);
    assert.ok(f.meshes.filter(m => m.name.startsWith('window shutter slat ')).length >= 20);
  } finally { f.dispose(); }
});

test('window frame finish and shutter state remain configurable without changing skirting or removing glazing', () => {
  const config = freshConfig(), window = config.room.openings.find(o => o.kind === 'window')!;
  window.windowDetail!.shutterClosed = false;
  window.windowDetail!.frameColor = '#625347';
  const f = fixture(config);
  try {
    assert.equal(f.materials.windowFrames.window.diffuseColor.toHexString(), '#625347');
    assert.equal(f.materials.trim.diffuseColor.toHexString(), '#EEECE3');
    assert.ok(!f.meshes.some(m => m.name.startsWith('window shutter slat ') || m.name === 'window shutter backing'));
    assert.equal(f.meshes.filter(m => m.name.startsWith('window glazing ')).length, 2);
    assert.ok(f.meshes.some(m => m.name === 'window roller housing face'));
  } finally { f.dispose(); }
});

test('only the photographed two walls receive soffits and their shared corner has no overlapping solids', () => {
  const f = fixture();
  try {
    const beams = f.meshes.filter(m => m.metadata?.architectureId);
    assert.deepEqual([...new Set(beams.map(m => m.metadata.wall))].sort(), ['south', 'west']);
    assert.equal(f.config.room.beams.filter(b => b.enabled).length, 2);
    assertSeparateSolids(beams);
    near(volume(beams), (3.8 * .4 + 2.6 * .4 - .4 * .4) * .16);
    for (const beam of beams) near(bounds(beam).min.y, f.config.room.height - .16);
    const step = bounds(f.meshes.find(m => m.name === 'corner-step')!);
    near(step.min.x, -1.9); near(step.min.z, -1.3);
    near(step.max.x - step.min.x, .24); near(step.max.z - step.min.z, .2);
    near(step.min.y, 0); near(step.max.y, 2.49);
  } finally { f.dispose(); }
});

test('independently edited soffit projection and drop still produce a complete union without double geometry', () => {
  const config = freshConfig();
  Object.assign(config.room.beams.find(b => b.wall === 'south')!, { projection: .32, drop: .10 });
  Object.assign(config.room.beams.find(b => b.wall === 'west')!, { projection: .25, drop: .16 });
  const f = fixture(config);
  try {
    const beams = f.meshes.filter(m => m.metadata?.architectureId);
    assertSeparateSolids(beams);
    near(volume(beams), 3.8 * .32 * .10 + 2.6 * .25 * .16 - .32 * .25 * .10);
    const west = beams.filter(m => m.metadata.wall === 'west');
    near(Math.min(...west.map(m => bounds(m).min.y)), config.room.height - .16);
  } finally { f.dispose(); }
});

test('the default desk clears the real corner step and moving it into the step is detected', () => {
  const config = freshConfig(), desk = config.furniture.find(f => f.id === 'desk')!;
  for (const item of config.furniture) assert.equal(architectureConflict(item, config), undefined, `${item.id} intersects architecture`);
  desk.position.z = -.3;
  assert.equal(architectureConflict(desk, config), 'corner-step');
});

test('a standing visitor can walk from the door through the free circulation area to behind the chair', () => {
  const config = freshConfig(), items = obstacles(config);
  let point = findWalkStart(config)!;
  assert.ok(point);
  // This route uses real swept collision movement and includes the chair, PC and step.
  for (const target of [{ x: .95, z: point.z }, { x: .95, z: .5 }, { x: .15, z: .5 }, { x: .15, z: -.1 }]) {
    point = moveWithCollisions(point, target.x - point.x, target.z - point.z, config.room, items);
    near(point.x, target.x); near(point.z, target.z);
    assert.ok(canStand(point.x, point.z, config.room, items));
  }
  near(point.y, 1.7);
});

type Point = { x: number; z: number };
function vertices(rectangle: Obstacle): Point[] {
  const angle = rectangle.rotation * Math.PI / 180, c = Math.cos(angle), s = Math.sin(angle);
  return [[-1, -1], [-1, 1], [1, 1], [1, -1]].map(([x, z]) => ({
    x: rectangle.x + x * rectangle.width / 2 * c + z * rectangle.depth / 2 * s,
    z: rectangle.z - x * rectangle.width / 2 * s + z * rectangle.depth / 2 * c,
  }));
}
function distanceToSegment(p: Point, a: Point, b: Point) {
  const x = b.x - a.x, z = b.z - a.z;
  const t = Math.min(1, Math.max(0, ((p.x - a.x) * x + (p.z - a.z) * z) / (x * x + z * z)));
  return Math.hypot(p.x - a.x - t * x, p.z - a.z - t * z);
}
function edgeGap(a: Obstacle, b: Obstacle) {
  const av = vertices(a), bv = vertices(b);
  return Math.min(...av.flatMap(p => bv.map((q, i) => distanceToSegment(p, q, bv[(i + 1) % 4]))), ...bv.flatMap(p => av.map((q, i) => distanceToSegment(p, q, av[(i + 1) % 4]))));
}

test('four monitor cases form a separate, inward-angled array on the main wall', () => {
  const config = freshConfig(), monitors = obstacles(config).filter(o => o.id.startsWith('monitor-') && !o.support);
  assert.equal(monitors.length, 4);
  for (let i = 0; i < monitors.length; i++) for (let j = i + 1; j < monitors.length; j++) {
    assert.equal(rectanglesOverlap(monitors[i], monitors[j]), false, `${monitors[i].id} intersects ${monitors[j].id}`);
  }
  const sequence = ['monitor-left', 'monitor-center', 'monitor-right', 'monitor-portrait'].map(id => monitors.find(m => m.id === id)!);
  for (let i = 1; i < sequence.length; i++) {
    const gap = edgeGap(sequence[i - 1], sequence[i]);
    assert.ok(gap > .001 && gap < .15, `${sequence[i-1].id} and ${sequence[i].id} should form one usable array; gap is ${gap} m`);
  }
  const landscape = config.furniture.filter(f => f.monitor?.mount === 'wall' && f.monitor.orientation === 'landscape');
  assert.ok(landscape.every(item => item.monitor!.wallMount!.wall === 'west'), 'The long right-side run holds the main array');
  assert.equal(landscape[1].rotation, -90, 'The center screen faces directly into the main chair bay');
  assert.ok(landscape[0].rotation < -90 && landscape[2].rotation > -90, 'The side screens angle inward around the centered workstation');
  assert.ok(Math.abs(landscape[0].rotation - landscape[2].rotation) >= 60);
});
