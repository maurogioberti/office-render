import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { NullEngine, Ray, Scene, Vector3 } from '@babylonjs/core';
import { freshConfig } from '../src/config/office';
import { loadConfig, CORRECTION_PREVIOUS_STORAGE_KEY, STORAGE_KEY } from '../src/config/storage';
import { createFurniture } from '../src/furniture';
import { createMaterials } from '../src/materials';
import { deskOutline } from '../src/furniture/deskProfile';
import { desktopItemPlacementIssue } from '../src/furniture/workZonePlacement';

test('floating surface is one real rectilinear mesh with an open bay, corner relief and no floor legs', () => {
  const config = freshConfig(), desk = config.furniture[0], engine = new NullEngine(), scene = new Scene(engine);
  try {
    const object = createFurniture(scene, config.furniture, createMaterials(scene, config.room, false), config.room).get('desk')!;
    const top = object.meshes.find(m => m.name.includes('continuous straight worktop'))!;
    assert.ok(top && top.getTotalVertices() > 20);
    assert.equal(object.meshes.filter(m => m.name.includes('worktop')).length, 1, 'The wood surface has no segmented tops');
    assert.equal((top.material as any).diffuseTexture, null, 'The surface stays plain, without a stylized texture');
    assert.ok(object.meshes.every(m => !m.name.includes('desk leg') && !m.name.includes('steel leg')));
    for (const mesh of object.meshes) {
      mesh.computeWorldMatrix(true);
      assert.ok(mesh.getBoundingInfo().boundingBox.minimumWorld.y > .45, `${mesh.name} must leave floor and knee space open`);
    }
    const hit = (x: number, z: number) => scene.pickWithRay(new Ray(new Vector3(x, 2, z), Vector3.Down(), 2), m => m === top)?.hit;
    assert.equal(hit(-1.5, 0), true, 'The central work surface faces upward and is pickable');
    assert.equal(hit(-.85, 0), false, 'The rectangular chair bay is open');
    assert.equal(hit(-.8, 1.0), true, 'Short straight end frames the chair bay');
    assert.equal(hit(-1.8, -1.2), false, 'The actual mesh clears the corner step');
    assert.equal(hit(-1.5, -1.2), true, 'The top continues next to the corner relief');
    const outline = deskOutline(desk);
    for (let i=0;i<outline.length;i++) {
      const a=outline[i],b=outline[(i+1)%outline.length];
      assert.ok(a.x===b.x || a.z===b.z, 'Every profile edge must be straight and axis-aligned');
    }
    assert.ok(desk.dimensions.width - desk.cornerDesk!.worktopDepth <= .60, 'Ends must not become long L returns');
    assert.equal(desktopItemPlacementIssue(config.furniture.find(f => f.kind === 'laptop')!, config), undefined);
  } finally { scene.dispose(); engine.dispose(); }
});

test('v7 browser correction restores removed work screens and laptop without changing architecture or backup', () => {
  const original = JSON.parse(readFileSync(new URL('./fixtures/layout-v7.json', import.meta.url), 'utf8'));
  original.furniture = original.furniture.filter((f: {id: string}) => !f.id.startsWith('work-'));
  const json = JSON.stringify(original), data = new Map([[CORRECTION_PREVIOUS_STORAGE_KEY, json]]);
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value),
  } });
  try {
    const next = loadConfig().config;
    assert.deepEqual(next.room, original.room);
    assert.equal(next.furniture.filter(f => f.kind === 'monitor' && f.visible).length, 6);
    assert.equal(next.furniture.find(f => f.id === 'work-zone')!.visible, true);
    assert.equal(next.furniture.find(f => f.id === 'work-laptop')!.visible, true);
    assert.equal(next.furniture.find(f => f.id === 'desk')!.cornerDesk!.floating, true);
    assert.equal(data.get(CORRECTION_PREVIOUS_STORAGE_KEY), json);
    assert.ok(data.has(STORAGE_KEY));
    assert.deepEqual(loadConfig().config, next, 'Reload must keep both complete stations');
    const prototype=structuredClone(next) as any;
    prototype.furniture.find((f: {id: string})=>f.id==='desk').cornerDesk.shape='soft-c';
    prototype.room.baseboardLED.color='#55aa88';
    data.set(STORAGE_KEY,JSON.stringify(prototype));
    const corrected=loadConfig().config;
    assert.deepEqual(corrected.room,prototype.room,'An interrupted prototype must not reset room settings');
    assert.equal(corrected.furniture[0].cornerDesk!.shape,'rect-c');
    assert.ok(data.has(`${STORAGE_KEY}.prototype-backup`));

  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
    else delete (globalThis as any).localStorage;
  }
});


test('monitor correction preserves the approved desk, room, chair and PC exactly', () => {
  const previous = JSON.parse(readFileSync(new URL('./fixtures/layout-v8.json', import.meta.url), 'utf8'));
  const current = freshConfig();
  assert.deepEqual(current.room, previous.room);
  for (const id of ['desk','chair','pc']) {
    assert.deepEqual(current.furniture.find(f=>f.id===id),previous.furniture.find((f: {id: string})=>f.id===id));
  }
});
