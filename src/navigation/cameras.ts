import { ArcRotateCamera, FreeCamera, Scene, Vector3 } from '@babylonjs/core';
import type { Mode, PlannerConfig } from '../config/types';
import { findWalkStart, moveWithCollisions, obstacles, type Obstacle } from './collision';

export class Navigation {
  readonly edit: ArcRotateCamera;
  readonly walk: FreeCamera;
  mode: Mode = 'edit';
  speed = 1.2;
  private keys = new Set<string>();
  private collisionObjects: Obstacle[] = [];
  private abort = new AbortController();
  onLockChange: (locked: boolean) => void = () => {};
  onMessage: (message: string) => void = () => {};

  constructor(private scene: Scene, private canvas: HTMLCanvasElement, private config: PlannerConfig) {
    this.edit = new ArcRotateCamera('Edit camera', Math.PI / 3, Math.PI / 3.2, 6.5, new Vector3(0, .62, 0), scene);
    this.edit.lowerRadiusLimit = 2; this.edit.upperRadiusLimit = 13;
    this.edit.lowerBetaLimit = .025; this.edit.upperBetaLimit = Math.PI / 2 - .06;
    this.edit.wheelDeltaPercentage = .012; this.edit.panningSensibility = 550;
    this.edit.minZ = .02; this.edit.inertia = .7;
    // Arrow keys belong to precise furniture nudges, not simultaneous camera orbit.
    this.edit.inputs.removeByType('ArcRotateCameraKeyboardMoveInput');
    this.edit.attachControl(canvas, true);
    this.walk = new FreeCamera('Walk camera · 1.70 m', new Vector3(1.4, 1.7, -.65), scene);
    this.walk.inputs.clear(); this.walk.minZ = .025; this.walk.fov = 1.2;
    this.walk.rotation.y = -Math.PI / 2;
    scene.activeCamera = this.edit;
    const { signal } = this.abort;
    window.addEventListener('keydown', e => {
      if (this.mode === 'walk' && document.pointerLockElement === canvas && ['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) { this.keys.add(e.code); e.preventDefault(); }
    }, { signal });
    window.addEventListener('keyup', e => this.keys.delete(e.code), { signal });
    window.addEventListener('blur', () => this.keys.clear(), { signal });
    document.addEventListener('visibilitychange', () => this.keys.clear(), { signal });
    document.addEventListener('pointerlockchange', () => { this.keys.clear(); this.onLockChange(document.pointerLockElement === canvas); }, { signal });
    document.addEventListener('pointerlockerror', () => this.onMessage('Mouse capture was blocked. Click the room to try again.'), { signal });
    document.addEventListener('mousemove', e => {
      if (this.mode !== 'walk' || document.pointerLockElement !== canvas) return;
      if (!Number.isFinite(e.movementX) || !Number.isFinite(e.movementY)) return;
      this.walk.rotation.y += e.movementX * .002;
      this.walk.rotation.x = Math.max(-1.45, Math.min(1.45, this.walk.rotation.x + e.movementY * .002));
    }, { signal });
    canvas.addEventListener('click', () => { if (this.mode === 'walk') void this.capturePointer(); }, { signal });
    scene.onBeforeRenderObservable.add(() => this.update());
    this.refreshCollisions();
  }
  refreshCollisions() { this.collisionObjects = obstacles(this.config); }
  setConfig(config: PlannerConfig) { this.config = config; this.refreshCollisions(); }
  setMode(mode: Mode): boolean {
    if (mode === 'walk') {
      const start = findWalkStart(this.config, this.mode === 'walk' ? this.walk.position : undefined);
      if (!start) { this.onMessage('There is no clear standing space. Move or hide some furniture before walking.'); return false; }
      this.walk.position.set(start.x, start.y, start.z); this.walk.rotation.set(0, -Math.PI / 2, 0);
      this.edit.detachControl(); this.scene.activeCamera = this.walk;
    } else {
      if (document.pointerLockElement === this.canvas) void document.exitPointerLock();
      this.scene.activeCamera = this.edit; this.edit.attachControl(this.canvas, true);
    }
    this.keys.clear(); this.mode = mode; return true;
  }
  async capturePointer() {
    if (document.pointerLockElement === this.canvas) return;
    if (!this.canvas.requestPointerLock) { this.onMessage('Pointer lock is unavailable in this browser. Open the localhost URL in a desktop browser.'); return; }
    try { await this.canvas.requestPointerLock(); } catch { this.onMessage('Click the room again to capture the mouse.'); }
  }
  view(top: boolean) {
    this.edit.alpha = Math.PI / 3; this.edit.beta = top ? .025 : Math.PI / 3.2;
    this.edit.radius = top ? 6.2 : 6.5; this.edit.target.set(0, top ? 0 : .62, 0);
  }
  focus(position: Vector3) { this.edit.setTarget(position.add(new Vector3(0,.5,0))); this.edit.radius = 4; }
  private update() {
    if (this.mode !== 'walk' || document.pointerLockElement !== this.canvas) return;
    const f = Number(this.keys.has('KeyW') || this.keys.has('ArrowUp')) - Number(this.keys.has('KeyS') || this.keys.has('ArrowDown'));
    const s = Number(this.keys.has('KeyD') || this.keys.has('ArrowRight')) - Number(this.keys.has('KeyA') || this.keys.has('ArrowLeft'));
    if (!f && !s) return;
    const distance = this.speed * Math.min(this.scene.getEngine().getDeltaTime() / 1000, .1) / Math.hypot(f, s);
    const yaw = this.walk.rotation.y;
    const dx = (Math.sin(yaw) * f + Math.cos(yaw) * s) * distance;
    const dz = (Math.cos(yaw) * f - Math.sin(yaw) * s) * distance;
    const next = moveWithCollisions(this.walk.position, dx, dz, this.config.room, this.collisionObjects);
    this.walk.position.set(next.x, 1.7, next.z);
  }
  dispose() { this.abort.abort(); }
}
