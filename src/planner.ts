import { BoundingInfo, Color3, Color4, Engine, GizmoManager, Mesh, MeshBuilder, PointerEventTypes, Scene, Vector3 } from '@babylonjs/core';
import { createWorkZone, freshConfig } from './config/office';
import { History, loadConfig, saveConfig, validateConfig } from './config/storage';
import type { FurnitureConfig, Mode, PlannerConfig, TransformTool } from './config/types';
import { createRoom, type RoomGeometry } from './room/geometry';
import { createArchitecture } from './architecture/features';
import { createFurniture, disposeFurniture, type FurnitureObject } from './furniture';
import { createMaterials, disposeMaterials, type Materials } from './materials';
import { createLighting, aimDaylight } from './lighting';
import { createBaseboardLighting } from './lighting/baseboards';
import { placeScreenBehindChair } from './furniture/placement';
import { removeFurnitureTree, resizeCornerDesk } from './furniture/deskLayout';
import { worldTransform } from './navigation/collision';
import { Navigation } from './navigation/cameras';
import { createMeasurements } from './room/measurements';
import { UI } from './ui/panel';

export class Planner {
  private config: PlannerConfig;
  private ui: UI;
  private engine: Engine;
  private scene: Scene;
  private materials!: Materials;
  private room!: RoomGeometry;
  private architecture: Mesh[] = [];
  private furniture = new Map<string, FurnitureObject>();
  private measurement!: ReturnType<typeof createMeasurements>;
  private lights: ReturnType<typeof createLighting>;
  private baseboards!: ReturnType<typeof createBaseboardLighting>;
  private navigation: Navigation;
  private gizmos: GizmoManager;
  private selectedId: string | null = 'desk';
  private tool: TransformTool = 'move';
  private selection: Mesh | null = null;
  private grid = false;
  private dimensions = true;
  private cutaway = true;
  private snap = true;
  private top = false;
  private history = new History();
  private dragBefore: PlannerConfig | null = null;
  private dragging = false;
  private saved = true;
  private abort = new AbortController();
  private resizeObserver: ResizeObserver;

  constructor(engineFactory?: (canvas: HTMLCanvasElement) => Engine) {
    const loaded = loadConfig(); this.config = loaded.config;
    this.ui = new UI({
      mode: mode => this.setMode(mode), select: id => this.select(id), action: action => this.action(action),
      toggleVisible: id => this.change(config => { const item = config.furniture.find(f=>f.id === id)!; item.visible = !item.visible; }),
      field: (group, field, value) => this.editField(group, field, value),
      color: color => this.change(config => { const item = config.furniture.find(f=>f.id === this.selectedId); if(item) item.color = color; }),
      speed: speed => { this.navigation.speed = speed; },
      room: room => { const next = structuredClone(this.config); next.room = room; this.apply(next, true); },
      import: json => { try { const next = validateConfig(JSON.parse(json)); this.setMode('edit'); this.apply(next, true); this.ui.toast('Layout imported and saved on this device.'); } catch(error) { this.ui.toast(`Import failed: ${(error as Error).message}`); } },
    });
    this.engine = engineFactory ? engineFactory(this.ui.canvas) : new Engine(this.ui.canvas, true, { stencil: true, preserveDrawingBuffer: false });
    this.engine.setHardwareScalingLevel(1 / Math.min(window.devicePixelRatio || 1, 1.75));
    this.scene = new Scene(this.engine); this.scene.clearColor = Color4.FromHexString('#e9ede8ff');
    this.scene.ambientColor = Color3.FromHexString('#41453a'); this.scene.imageProcessingConfiguration.contrast = 1.06;
    this.lights = createLighting(this.scene);
    this.navigation = new Navigation(this.scene, this.ui.canvas, this.config);
    this.navigation.onMessage = message => this.ui.toast(message);
    this.navigation.onLockChange = locked => this.ui.lockChanged(locked);
    this.gizmos = new GizmoManager(this.scene);
    this.gizmos.usePointerToAttachGizmos = false; this.gizmos.clearGizmoOnEmptyPointerEvent = false;
    this.gizmos.positionGizmoEnabled = true; this.gizmos.rotationGizmoEnabled = true;
    const position = this.gizmos.gizmos.positionGizmo!;
    position.planarGizmoEnabled = true; position.scaleRatio = .72; position.updateGizmoRotationToMatchAttachedMesh = false;
    const rotation = this.gizmos.gizmos.rotationGizmo!;
    rotation.xGizmo.isEnabled = false; rotation.zGizmo.isEnabled = false; rotation.scaleRatio = .78;
    for (const gizmo of [position, rotation]) {
      gizmo.onDragStartObservable.add(() => { this.dragging = true; this.dragBefore = structuredClone(this.config); this.navigation.edit.detachControl(); });
      gizmo.onDragEndObservable.add(() => this.endDrag());
    }
    this.buildRoom(); this.buildFurniture();
    let pointerDown = { x: 0, y: 0 };
    this.scene.onPointerObservable.add(info => {
      if (info.type === PointerEventTypes.POINTERDOWN) pointerDown = { x: this.scene.pointerX, y: this.scene.pointerY };
      if (info.type !== PointerEventTypes.POINTERPICK || this.navigation.mode !== 'edit' || this.dragging || (info.event as PointerEvent).button !== 0) return;
      if (Math.hypot(this.scene.pointerX-pointerDown.x,this.scene.pointerY-pointerDown.y)>5) return;
      const id = info.pickInfo?.pickedMesh?.metadata?.furnitureId; if (id) this.select(id);
    });
    this.scene.onBeforeRenderObservable.add(() => this.updateDisplay());
    this.resizeObserver = new ResizeObserver(() => this.engine.resize()); this.resizeObserver.observe(this.ui.canvas);
    window.addEventListener('keydown', e => this.keyboard(e), { signal: this.abort.signal });
    this.engine.onContextLostObservable.add(() => this.ui.toast('Graphics connection interrupted. Waiting for the browser to restore it…'));
    this.engine.onContextRestoredObservable.add(() => this.ui.toast('Graphics restored. Your layout is safe.'));
    this.select(this.selectedId); this.engine.runRenderLoop(() => this.scene.render());
    if (loaded.warning) this.ui.toast(loaded.warning);
  }

  private buildRoom() {
    this.materials = createMaterials(this.scene, this.config.room);
    this.room = createRoom(this.scene, this.config.room, this.materials);
    this.architecture = createArchitecture(this.scene, this.config.room, this.materials, this.room);
    this.baseboards = createBaseboardLighting(this.scene, this.config.room, this.room);
    aimDaylight(this.lights.sun, this.config.room);
    this.measurement = createMeasurements(this.scene, this.config.room);
  }
  private buildFurniture() {
    this.gizmos.attachToMesh(null); this.selection?.dispose(); this.selection = null;
    disposeFurniture(this.furniture); this.furniture = createFurniture(this.scene, this.config.furniture, this.materials, this.config.room);
    for (const o of this.furniture.values()) {
      const d = o.config.dimensions;
      o.root.setBoundingInfo(new BoundingInfo(new Vector3(-d.width/2,0,-d.depth/2),new Vector3(d.width/2,d.height,d.depth/2)));
    }
    this.lights.shadows.getShadowMap()!.renderList = [];
    [...this.room.meshes, this.room.ceiling, ...this.architecture, ...[...this.furniture.values()].flatMap(o=>o.meshes)].forEach(mesh => this.lights.shadows.addShadowCaster(mesh));
    this.navigation.setConfig(this.config); this.updateSelection();
  }
  private destroyRoom() {
    this.baseboards.dispose(); this.measurement.dispose(); this.architecture.forEach(m=>m.dispose()); Object.values(this.room.groups).forEach(g=>g.dispose());
    this.room.floor.dispose(); this.room.tile.dispose(); this.room.ceiling.dispose(); disposeMaterials(this.materials);
  }
  private render() {
    this.ui.render({ config:this.config,selectedId:this.selectedId,mode:this.navigation.mode,tool:this.tool,grid:this.grid,dimensions:this.dimensions,cutaway:this.cutaway,snap:this.snap,top:this.top,canUndo:this.history.canUndo,canRedo:this.history.canRedo });
    this.ui.saved(this.saved);
    const speed = document.querySelector<HTMLInputElement>('#walk-speed');
    if(speed) { speed.value = String(this.navigation.speed); document.querySelector('#speed-value')!.textContent = `${this.navigation.speed.toFixed(1)} m/s`; }
  }
  private select(id: string | null) {
    if (this.navigation.mode !== 'edit') return;
    this.selectedId = id && this.furniture.has(id) ? id : null; this.updateSelection(); this.render();
  }
  private updateSelection() {
    this.selection?.dispose(); this.selection = null; this.gizmos.attachToMesh(null);
    this.gizmos.positionGizmoEnabled = this.tool === 'move' && this.navigation.mode === 'edit';
    this.gizmos.rotationGizmoEnabled = this.tool === 'rotate' && this.navigation.mode === 'edit';
    this.gizmos.gizmos.positionGizmo!.snapDistance = this.snap ? .05 : 0;
    this.gizmos.gizmos.rotationGizmo!.snapDistance = this.snap ? Math.PI / 12 : 0;
    const o = this.selectedId ? this.furniture.get(this.selectedId) : undefined;
    if (!o || !o.root.isEnabled() || this.navigation.mode !== 'edit') return;
    const { width:w,depth:d } = o.config.dimensions, x = w/2+.012, z = d/2+.012;
    const t = o.config.cornerDesk?.worktopDepth;
    const points = t ? [new Vector3(-x,.008,-z),new Vector3(x,.008,-z),new Vector3(x,.008,-z+t),new Vector3(-x+t,.008,-z+t),new Vector3(-x+t,.008,z),new Vector3(-x,.008,z),new Vector3(-x,.008,-z)]
      : [new Vector3(-x,.008,-z),new Vector3(x,.008,-z),new Vector3(x,.008,z),new Vector3(-x,.008,z),new Vector3(-x,.008,-z)];
    const lines = MeshBuilder.CreateLines('Selected object footprint', { points }, this.scene);
    lines.color = Color3.FromHexString('#6c8555'); lines.isPickable = false; lines.parent = o.root; this.selection = lines;
    this.gizmos.attachToMesh(o.root);
  }
  private setMode(mode: Mode) { if (!this.navigation.setMode(mode)) return; this.updateSelection(); this.render(); this.engine.resize(); }
  private updateDisplay() {
    const editing = this.navigation.mode === 'edit', cut = this.cutaway && editing, cam = this.navigation.edit.position, overhead = this.navigation.edit.beta < .15;
    this.room.groups.north.setEnabled(!cut || (!overhead && cam.z <= 0));
    this.room.groups.south.setEnabled(!cut || (!overhead && cam.z >= 0));
    this.room.groups.east.setEnabled(!cut || (!overhead && cam.x <= 0));
    this.room.groups.west.setEnabled(!cut || (!overhead && cam.x >= 0));
    this.room.ceiling.setEnabled(!editing);
    this.baseboards.sync();
    this.measurement.dimensions.forEach(m=>m.setEnabled(editing && this.dimensions)); this.measurement.grid.forEach(m=>m.setEnabled(editing && this.grid));
  }
  private apply(next: PlannerConfig, rebuildRoom = false, record = true) {
    next = validateConfig(next);
    if (JSON.stringify(next) === JSON.stringify(this.config)) return;
    if (record) this.history.push(this.config); this.gizmos.attachToMesh(null);
    if (rebuildRoom) { this.selection?.dispose(); this.selection = null; disposeFurniture(this.furniture); this.furniture.clear(); this.destroyRoom(); }
    this.config = next; if (rebuildRoom) this.buildRoom(); this.buildFurniture();
    if (this.selectedId && !this.furniture.has(this.selectedId)) this.selectedId = null;
    this.saved = saveConfig(this.config); this.render();
    if (!this.saved) this.ui.toast('Browser storage is unavailable. Export the layout to keep your changes.');
  }
  private change(mutate: (config: PlannerConfig) => void) {
    if(this.navigation.mode !== 'edit') return;
    const next = structuredClone(this.config);
    try { mutate(next); this.apply(next); } catch(error) { this.ui.toast((error as Error).message); this.render(); }
  }
  private editField(group: string, field: string, value: number) {
    if (!Number.isFinite(value)) { this.ui.toast('Enter a valid measurement.'); this.render(); return; }
    this.change(config => {
      const item = config.furniture.find(f=>f.id === this.selectedId); if(!item) return;
      if(group === 'dimensions' && ['width','depth','height'].includes(field)) {
        const oldHeight = item.dimensions.height;
        if (item.cornerDesk && (field==='width' || field==='depth')) resizeCornerDesk(config,item,field==='width'?value:item.dimensions.width,field==='depth'?value:item.dimensions.depth);
        else item.dimensions[field as keyof FurnitureConfig['dimensions']] = value;
        if (item.kind === 'desk' && field === 'height') config.furniture.filter(f=>f.parentId === item.id && (f.onDesktop || f.kind === 'monitor')).forEach(f=>{ f.position.y += value-oldHeight; });
      } else if(group === 'position' && ['x','y','z'].includes(field)) item.position[field as keyof FurnitureConfig['position']] = value;
      else if(group === 'cornerDesk' && field === 'worktopDepth' && item.cornerDesk) item.cornerDesk.worktopDepth = value;
      else if(group === 'wallMount' && ['offset','height','maxReach'].includes(field) && item.monitor?.wallMount) item.monitor.wallMount[field as 'offset' | 'height' | 'maxReach'] = value;
      else if(group === 'workZone' && ['columnHeight','armReach'].includes(field) && item.workZone) item.workZone[field as 'columnHeight'|'armReach']=value;
      else if(group === 'laptop' && field==='openingAngle' && item.laptop) item.laptop.openingAngle=value;
      else if(group === 'transform' && field === 'rotation') item.rotation = ((value % 360) + 360) % 360;
    });
  }
  private endDrag() {
    const original = this.dragBefore; this.dragBefore = null;
    const o = this.selectedId ? this.furniture.get(this.selectedId) : undefined;
    this.navigation.edit.attachControl(this.ui.canvas, true); window.setTimeout(()=>{ this.dragging = false; },0);
    if (!o || !original) return;
    const next = structuredClone(original), item = next.furniture.find(f=>f.id === o.config.id)!;
    item.position = { x: +o.root.position.x.toFixed(3), y: +o.root.position.y.toFixed(3), z: +o.root.position.z.toFixed(3) };
    const radians = o.root.rotationQuaternion?.toEulerAngles().y ?? o.root.rotation.y;
    item.rotation = +(((radians * 180 / Math.PI) % 360 + 360) % 360).toFixed(2);
    try { this.apply(next); } catch(error) { this.buildFurniture(); this.render(); this.ui.toast((error as Error).message); }
  }
  private action(action: string) {
    if(action === 'export') {
      const blob = new Blob([JSON.stringify(this.config,null,2)], {type:'application/json'}), link = document.createElement('a');
      link.href = URL.createObjectURL(blob); link.download = 'home-office.layout.json'; link.click();
      window.setTimeout(()=>URL.revokeObjectURL(link.href),1000); this.ui.toast('Layout exported with all measurements and positions.'); return;
    }
    if(action === 'capture') { void this.navigation.capturePointer(); return; }
    if(this.navigation.mode !== 'edit') return;
    const selected = this.selectedId ? this.furniture.get(this.selectedId) : undefined;
    switch(action) {
      case 'toggle-work-zone': this.change(config=>{
        const group=config.furniture.find(f=>f.kind==='work-zone');
        if(group) removeFurnitureTree(config,group.id);
        else {
          const desk=config.furniture.find(f=>f.kind==='desk' && f.cornerDesk);
          if(!desk) throw new Error('Add the work zone to an L-shaped desk.');
          config.furniture.push(...createWorkZone(desk));
        }
      }); return;
      case 'chair-work': case 'chair-personal': this.change(config=>{
        const chair=config.furniture.find(f=>f.id==='chair'); if(!chair) return;
        if(action==='chair-personal') {
          const original=freshConfig().furniture.find(f=>f.id==='chair')!;
          chair.position={...original.position};chair.rotation=original.rotation;
        } else {
          const group=config.furniture.find(f=>f.kind==='work-zone' && f.id===this.selectedId) ?? config.furniture.find(f=>f.kind==='work-zone'); if(!group) return;
          const t=worldTransform(group,config.furniture),r=t.rotation*Math.PI/180;
          chair.position={x:t.position.x-.09*Math.cos(r)-.83*Math.sin(r),y:0,z:t.position.z+.09*Math.sin(r)-.83*Math.cos(r)};
          chair.rotation=t.rotation;
        }
      }); return;
      case 'move': case 'rotate': this.tool = action; this.updateSelection(); break;
      case 'grid': this.grid = !this.grid; break;
      case 'dimensions': this.dimensions = !this.dimensions; break;
      case 'cutaway': this.cutaway = !this.cutaway; break;
      case 'snap': this.snap = !this.snap; this.updateSelection(); break;
      case 'view': this.top = !this.top; this.navigation.view(this.top); break;
      case 'home': this.top = false; this.navigation.view(false); break;
      case 'focus': if(selected) { this.top = false; this.navigation.focus(selected.root.getAbsolutePosition()); } break;
      case 'deselect': this.select(null); return;
      case 'rotate90': this.change(config=>{ const item = config.furniture.find(f=>f.id === this.selectedId); if(item) item.rotation = (item.rotation+90)%360; }); return;
      case 'behind-desk': this.change(config=>{
        const screen = config.furniture.find(f=>f.id === this.selectedId); if(screen) placeScreenBehindChair(config,screen);
      }); return;
      case 'reset-object': this.change(config=>{
        const index = config.furniture.findIndex(f=>f.id === this.selectedId), original = freshConfig().furniture.find(f=>f.id === this.selectedId);
        if(index>=0 && original) {
          const current=config.furniture[index];
          if(original.kind==='desk') {
            if(current.cornerDesk) resizeCornerDesk(config,current,original.dimensions.width,original.dimensions.depth);
            config.furniture.filter(f=>f.parentId===original.id && (f.onDesktop || f.kind==='monitor')).forEach(f=>{f.position.y+=original.dimensions.height-current.dimensions.height;});
          }
          if(original.onDesktop) {
            const parent=config.furniture.find(f=>f.id===original.parentId);
            if(parent) original.position=original.workZone ? createWorkZone(parent)[0].position : {...original.position,y:parent.dimensions.height};
          }
          config.furniture[index]=original;
        }
      }); return;
      case 'undo': case 'redo': {
        const next = action === 'undo' ? this.history.undo(this.config) : this.history.redo(this.config);
        if(next) { const changedRoom = JSON.stringify(next.room)!==JSON.stringify(this.config.room); this.apply(next,changedRoom,false); this.ui.toast(action === 'undo' ? 'Change undone.' : 'Change restored.'); } return;
      }
    }
    this.render();
  }
  private keyboard(event: KeyboardEvent) {
    if (this.navigation.mode !== 'edit' || (event.target as HTMLElement).closest('input,select,textarea,[contenteditable="true"]') || document.querySelector('dialog[open]')) return;
    if ((event.ctrlKey || event.metaKey) && event.code === 'KeyZ') { event.preventDefault(); this.action(event.shiftKey ? 'redo':'undo'); return; }
    if ((event.ctrlKey || event.metaKey) && event.code === 'KeyY') { event.preventDefault(); this.action('redo'); return; }
    if(event.ctrlKey || event.metaKey || event.altKey) return;
    const actions: Record<string,string> = {KeyG:'move',KeyR:'rotate',KeyF:'focus',Escape:'deselect'};
    if(actions[event.code]) { event.preventDefault(); this.action(actions[event.code]); }
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.code) && this.selectedId) {
      event.preventDefault(); this.change(config=>{ const item=config.furniture.find(f=>f.id === this.selectedId)!, step=event.shiftKey ? .01 : .05; if(event.code==='ArrowLeft')item.position.x-=step; if(event.code==='ArrowRight')item.position.x+=step; if(event.code==='ArrowUp')item.position.z+=step; if(event.code==='ArrowDown')item.position.z-=step; });
    }
  }
  dispose() { this.abort.abort(); this.resizeObserver.disconnect(); this.ui.dispose(); this.navigation.dispose(); this.engine.stopRenderLoop(); this.scene.dispose(); this.engine.dispose(); }
}
