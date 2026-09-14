import test from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';

test('Walk navigation keeps the real Babylon camera renderable through movement, input and mode changes', async t => {
  const dom = new Window({ url: 'http://127.0.0.1:5173/' });
  for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'HTMLCanvasElement', 'Element', 'Node', 'Event', 'MouseEvent', 'KeyboardEvent', 'AbortController']) {
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value: key === 'window' ? dom : (dom as any)[key] });
  }
  const { MeshBuilder, NullEngine, Scene } = await import('@babylonjs/core');
  const { Navigation } = await import('../src/navigation/cameras');
  const { freshConfig } = await import('../src/config/office');
  const { canStand, obstacles } = await import('../src/navigation/collision');

  const fixture = () => {
    const canvas = dom.document.createElement('canvas'); dom.document.body.append(canvas);
    const engine = new NullEngine(), scene = new Scene(engine), config = freshConfig();
    engine.getDeltaTime = () => 16;
    const nav = new Navigation(scene, canvas as unknown as HTMLCanvasElement, config);
    const marker = MeshBuilder.CreateBox('Visible camera regression marker', { size: .2 }, scene);
    marker.position.set(0, 1.7, -.66);
    let locked = false;
    Object.defineProperty(dom.document, 'pointerLockElement', { configurable: true, get: () => locked ? canvas : null });
    const lockChanged = () => dom.document.dispatchEvent(new dom.Event('pointerlockchange'));
    (canvas as any).requestPointerLock = async () => { locked = true; lockChanged(); };
    (dom.document as any).exitPointerLock = async () => { locked = false; lockChanged(); };
    const key = (code: string, type: 'keydown' | 'keyup' = 'keydown') => dom.dispatchEvent(new dom.KeyboardEvent(type, { code }));
    const frame = (count = 1) => { for (let i = 0; i < count; i++) scene.render(); };
    const finite = () => {
      assert.ok(nav.walk.position.asArray().every(Number.isFinite), 'Camera position must stay finite');
      assert.ok(nav.walk.rotation.asArray().every(Number.isFinite), 'Camera rotation must stay finite');
      assert.ok(Array.from(nav.walk.getViewMatrix().m).every(Number.isFinite), 'Camera must have a renderable view matrix');
      assert.equal(nav.walk.position.y, 1.7);
    };
    const mouse = (x: unknown, y: unknown) => {
      const event = new dom.MouseEvent('mousemove');
      Object.defineProperties(event, { movementX: { value: x }, movementY: { value: y } });
      dom.document.dispatchEvent(event);
    };
    return { nav, scene, config, marker, key, frame, finite, mouse, dispose: () => { nav.dispose(); scene.dispose(); engine.dispose(); canvas.remove(); } };
  };
  const near = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < .00001, `${actual} should equal ${expected}`);

  try {
    await t.test('WASD advances the actual FreeCamera vector and continues rendering scene geometry', async () => {
      const f = fixture();
      try {
        assert.ok(f.nav.setMode('walk')); await f.nav.capturePointer();
        const start = f.nav.walk.position.clone();
        f.key('KeyW'); f.frame(); f.finite();
        assert.ok(f.scene.getActiveMeshes().data.includes(f.marker), 'A visible mesh must remain in the walk camera frustum after its first movement frame');
        f.frame(9); f.key('KeyW', 'keyup');
        near(f.nav.walk.position.x, start.x - 1.2 * .016 * 10);
        f.key('KeyS'); f.frame(10); f.key('KeyS', 'keyup');
        near(f.nav.walk.position.x, start.x);
        f.key('KeyA'); f.frame(8); f.key('KeyA', 'keyup');
        near(f.nav.walk.position.z, start.z - 1.2 * .016 * 8);
        f.key('KeyD'); f.frame(8); f.key('KeyD', 'keyup');
        near(f.nav.walk.position.z, start.z);
        f.key('KeyW'); f.key('KeyD'); f.frame(10);
        f.key('KeyW', 'keyup'); f.key('KeyD', 'keyup');
        near(Math.hypot(f.nav.walk.position.x - start.x, f.nav.walk.position.z - start.z), 1.2 * .016 * 10);
        f.mouse(25, -10); f.frame(); f.finite();
        near(f.nav.walk.rotation.y, -Math.PI / 2 + .05);
        near(f.nav.walk.rotation.x, -.02);
      } finally { f.dispose(); }
    });

    await t.test('walking stops at furniture, preserves safe re-entry, and clears held keys on blur and pointer release', async () => {
      const f = fixture();
      try {
        f.nav.setMode('walk'); await f.nav.capturePointer();
        f.key('KeyW'); f.frame(250); f.finite();
        const stopped = f.nav.walk.position.clone(); f.frame(10);
        near(f.nav.walk.position.x, stopped.x); near(f.nav.walk.position.z, stopped.z);
        assert.ok(canStand(stopped.x, stopped.z, f.config.room, obstacles(f.config)), 'Collision stopping point must remain outside furniture');
        f.key('KeyW', 'keyup'); f.key('KeyS'); f.frame(10); f.key('KeyS', 'keyup');
        const current = f.nav.walk.position.clone();
        assert.ok(f.nav.setMode('walk')); f.frame(); f.finite();
        near(f.nav.walk.position.x, current.x); near(f.nav.walk.position.z, current.z);

        f.key('KeyS'); dom.dispatchEvent(new dom.Event('blur')); f.frame(10);
        near(f.nav.walk.position.x, current.x);
        f.key('KeyS'); await (dom.document as any).exitPointerLock(); await f.nav.capturePointer(); f.frame(10);
        near(f.nav.walk.position.x, current.x);
        f.nav.setMode('edit'); assert.equal(f.scene.activeCamera, f.nav.edit);
        assert.ok(f.nav.setMode('walk')); f.frame(); f.finite();
        assert.equal(f.scene.activeCamera, f.nav.walk);
        const beforeUnlockedInput = f.nav.walk.position.clone();
        f.key('KeyW'); f.frame(10);
        near(f.nav.walk.position.x, beforeUnlockedInput.x);
      } finally { f.dispose(); }
    });

    await t.test('missing or non-finite mouse deltas cannot poison the walk camera matrix', async () => {
      const f = fixture();
      try {
        f.nav.setMode('walk'); await f.nav.capturePointer();
        for (const [x, y] of [[undefined, undefined], [NaN, 0], [0, Infinity]]) {
          f.mouse(x, y); f.frame(); f.finite();
        }
        f.key('KeyW'); f.frame(); f.finite();
        assert.ok(f.scene.getActiveMeshes().data.includes(f.marker));
      } finally { f.dispose(); }
    });
  } finally { await dom.happyDOM.close(); }
});
