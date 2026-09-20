import type { FurnitureConfig, Mode, PlannerConfig, TransformTool } from '../config/types';
import { escapeHTML as esc, furnitureIcon, icon, renderIcons } from './icons';

export type UIState = { config: PlannerConfig; selectedId: string | null; mode: Mode; tool: TransformTool; grid: boolean; dimensions: boolean; cutaway: boolean; snap: boolean; top: boolean; canUndo: boolean; canRedo: boolean };
export type UIActions = {
  mode: (mode: Mode) => void; select: (id: string | null) => void;
  action: (action: string) => void; toggleVisible: (id: string) => void;
  field: (group: string, field: string, value: number) => void;
  color: (color: string) => void; speed: (value: number) => void;
  room: (room: PlannerConfig['room']) => void; import: (json: string) => void;
};

export class UI {
  private state!: UIState;
  private toastTimer = 0;
  private abort = new AbortController();
  readonly canvas: HTMLCanvasElement;

  constructor(private actions: UIActions) {
    document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
      <header class="app-header">
        <div class="brand"><span class="brand-icon">${icon('box')}</span>roomwork<span class="brand-divider"></span><span class="project-title">Home office <span class="pill">PERSONAL SPACE</span></span></div>
        <div class="mode-switch" aria-label="Navigation mode"><button data-mode="edit" class="active" aria-pressed="true">${icon('mouse-pointer-2')}<span>Edit mode</span></button><button data-mode="walk" aria-pressed="false">${icon('footprints')}<span>Walk mode</span></button></div>
        <div class="header-actions"><span id="save-state" class="save-state">${icon('check')}Saved locally</span><a class="export-button study-link" href="/sofa-study.html" title="Open the separate sofa feasibility study" aria-label="Sofa feasibility study">${icon('armchair')}<span>Sofa study</span></a><button class="icon-button" data-action="import" title="Import layout JSON" aria-label="Import layout JSON">${icon('upload')}</button><button class="export-button" data-action="export">${icon('download')}<span>Export layout</span></button></div>
      </header>
      <div class="workspace">
        <aside class="sidebar" id="scene-panel" aria-label="Scene objects"></aside>
        <main class="viewport">
          <div class="viewport-heading"><span class="eyebrow">OFFICE <span class="slash">/</span> LAYOUT 01</span><h1>A little room. Plenty of possibility.</h1><span class="view-subtitle">Your home office, one-to-one.</span></div>
          <div class="view-controls"><button data-action="view" id="view-button" title="Switch between perspective and top view">${icon('box')}<span>Perspective</span>${icon('chevron-down')}</button><button class="icon-button" data-action="home" title="Reset camera view" aria-label="Reset camera view">${icon('maximize')}</button></div>
          <canvas id="scene-canvas" tabindex="0" aria-label="Interactive 3D office. Use the scene list to select furniture. In Walk mode click to capture the mouse, use WASD to move, and Escape to release."></canvas>
          <div class="tool-rail" aria-label="Edit tools"><button data-action="move" data-tool="move" title="Move selected object (G)" aria-label="Move selected object">${icon('move')}</button><button data-action="rotate" data-tool="rotate" title="Rotate selected object (R)" aria-label="Rotate selected object">${icon('rotate-cw')}</button><span class="rail-divider"></span><button data-action="undo" id="undo" title="Undo (Ctrl+Z)" aria-label="Undo">${icon('undo-2')}</button><button data-action="redo" id="redo" title="Redo (Ctrl+Shift+Z)" aria-label="Redo">${icon('redo-2')}</button></div>
          <div class="display-tools"><button data-action="grid" title="Toggle 10 cm floor grid" aria-label="Toggle grid">${icon('grid-2x2')}</button><button data-action="dimensions" title="Toggle room dimensions" aria-label="Toggle dimensions">${icon('ruler')}</button><button data-action="cutaway" title="Toggle cutaway walls" aria-label="Toggle cutaway walls">${icon('layers-2')}</button><span></span><button data-action="help" title="Keyboard and navigation help" aria-label="Keyboard and navigation help">${icon('circle-help')}</button></div>
          <div class="canvas-help" id="canvas-help">${icon('mouse-pointer-2')} Drag to orbit <span>·</span> Scroll to zoom <span>·</span> Click to select</div>
          <div class="orientation"><span>N</span>${icon('corner-up-right')}<small>METERS</small></div>
          <div class="walk-overlay" id="walk-overlay" hidden><div class="walk-card"><span class="walk-icon">${icon('footprints')}</span><p class="eyebrow">A NEW PERSPECTIVE</p><h2>Step into your office.</h2><p>Explore at a natural eye height of 1.70 m.</p><button class="primary-button" data-action="capture">Start walking ${icon('arrow-up-right')}</button><span class="walk-key-guide"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> to move <span>·</span> Mouse to look</span><small>Press Esc to release the mouse.</small></div></div>
          <div class="crosshair" id="crosshair" hidden></div>
          <div class="toast" id="toast" role="status" aria-live="polite" hidden></div>
        </main>
        <aside class="inspector" id="inspector" aria-label="Object properties"></aside>
      </div>
      <footer class="status-bar"><span><i class="status-dot"></i>Real-time 3D <span class="status-divider">/</span><span id="mode-status">Edit mode</span></span><span>1 unit = 1 meter <span class="status-divider">·</span> ${icon('save')}Stored on this device</span><span id="object-status">11 furniture objects</span></footer>
      <input type="file" id="import-file" accept=".json,application/json" hidden />
      <dialog id="settings-dialog" class="settings-dialog"></dialog>
      <dialog id="help-dialog" class="help-dialog"><div class="dialog-header"><div><p class="eyebrow">FIND YOUR WAY</p><h2>A few helpful shortcuts.</h2></div><button class="icon-button" data-action="close-help" aria-label="Close help">${icon('x')}</button></div><div class="help-content"><h3>Edit mode</h3><p><span>Orbit / pan / zoom</span><b>Left drag / right drag / scroll</b></p><p><span>Select furniture</span><b>Click an object or scene row</b></p><p><span>Move / rotate gizmo</span><b><kbd>G</kbd> / <kbd>R</kbd></b></p><p><span>Nudge on the floor</span><b>Arrow keys · 5 cm</b></p><p><span>Focus selected object</span><kbd>F</kbd></p><p><span>Undo / redo</span><b>Ctrl Z / Ctrl Shift Z</b></p><h3>Walk mode</h3><p><span>Capture mouse</span><b>Click inside the room</b></p><p><span>Move / look</span><b>WASD / mouse</b></p><p><span>Release mouse</span><kbd>Esc</kbd></p><div class="notice">Objects use bottom-center positions. Personal wall-mounted screens stay independent of the desk. The PC, laptop, and work monitor pair move with the desk. The laptop stays in place when you hide or remove the work pair. Select the pair to test both positions of the shared chair. All measurements are in meters.</div></div></dialog>`;
    this.canvas = document.querySelector<HTMLCanvasElement>('#scene-canvas')!;
    const { signal } = this.abort;
    document.querySelector('#app')!.addEventListener('click', event => {
      const target = event.target as HTMLElement;
      const mode = target.closest<HTMLButtonElement>('[data-mode]');
      if (mode) return this.actions.mode(mode.dataset.mode as Mode);
      const visibility = target.closest<HTMLButtonElement>('[data-visibility]');
      if (visibility) return this.actions.toggleVisible(visibility.dataset.visibility!);
      const select = target.closest<HTMLButtonElement>('[data-select]');
      if (select) return this.actions.select(select.dataset.select!);
      const color = target.closest<HTMLButtonElement>('[data-color]');
      if (color) return this.actions.color(color.dataset.color!);
      const action = target.closest<HTMLButtonElement>('[data-action]');
      if (!action || action.disabled) return;
      const name = action.dataset.action!;
      if (name === 'settings') return this.openSettings();
      if (name === 'help') return document.querySelector<HTMLDialogElement>('#help-dialog')!.showModal();
      if (name === 'close-help') return document.querySelector<HTMLDialogElement>('#help-dialog')!.close();
      if (name === 'close-settings') return document.querySelector<HTMLDialogElement>('#settings-dialog')!.close();
      if (name === 'import') return document.querySelector<HTMLInputElement>('#import-file')!.click();
      this.actions.action(name);
    }, { signal });
    document.querySelector('#app')!.addEventListener('change', event => {
      const input = event.target as HTMLInputElement;
      if (input.matches('[data-field]')) this.actions.field(input.dataset.group!, input.dataset.field!, input.valueAsNumber);
    }, { signal });
    document.querySelector('#app')!.addEventListener('input', event => {
      const input = event.target as HTMLInputElement;
      if (input.id === 'walk-speed') { this.actions.speed(input.valueAsNumber); document.querySelector('#speed-value')!.textContent = `${input.valueAsNumber.toFixed(1)} m/s`; }
    }, { signal });
    document.querySelector<HTMLInputElement>('#import-file')!.addEventListener('change', async event => {
      const input = event.target as HTMLInputElement, file = input.files?.[0];
      try { if (file) { if (file.size > 500_000) throw new Error('Layout files must be smaller than 500 KB.'); this.actions.import(await file.text()); } } catch (error) { this.toast((error as Error).message); }
      input.value = '';
    }, { signal });
  }

  render(state: UIState) {
    this.state = state;
    document.querySelector('#app')!.classList.toggle('walking', state.mode === 'walk');
    document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(button => { const active = button.dataset.mode === state.mode; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); });
    document.querySelectorAll<HTMLButtonElement>('[data-tool]').forEach(button => { const active = button.dataset.tool === state.tool; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); });
    for (const name of ['grid','dimensions','cutaway'] as const) {
      const button = document.querySelector<HTMLButtonElement>(`[data-action="${name}"]`)!; button.classList.toggle('active',state[name]); button.setAttribute('aria-pressed',String(state[name]));
    }
    document.querySelector<HTMLButtonElement>('#undo')!.disabled = !state.canUndo;
    document.querySelector<HTMLButtonElement>('#redo')!.disabled = !state.canRedo;
    document.querySelector('#mode-status')!.textContent = state.mode === 'edit' ? 'Edit mode' : 'Walk mode · Eye height 1.70 m';
    document.querySelector('#object-status')!.textContent = `${state.config.furniture.length+(state.config.lounge?.visible?2:0)} furniture objects`;
    document.querySelector('#view-button')!.innerHTML = `${icon(state.top ? 'grid-2x2' : 'box')}<span>${state.top ? 'Top view' : 'Perspective'}</span>${icon('chevron-down')}`;
    document.querySelector('#canvas-help')!.innerHTML = state.mode === 'edit' ? `${icon('mouse-pointer-2')} Drag to orbit <span>·</span> Scroll to zoom <span>·</span> Click to select` : `<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> Move <span>·</span> Mouse to look <span>·</span> Esc to release`;
    this.scenePanel(); this.inspector(); renderIcons();
    this.lockChanged(document.pointerLockElement === this.canvas);
  }

  private scenePanel() {
    const { config, selectedId } = this.state;
    const room = config.room;
    const workLaptop = config.furniture.find(f => f.id === 'work-laptop');
    const workPowered = workLaptop?.laptop?.poweredOn !== false;
    const workRoot = config.furniture.find(f => f.kind === 'work-zone');
    const workIds = new Set(config.furniture.filter(f => f.kind === 'work-zone').map(f => f.id));
    // Imported layouts can reorder children or contain nested attachments.
    for (let pass = 0; pass < config.furniture.length; pass++) {
      for (const item of config.furniture) if (item.parentId && workIds.has(item.parentId)) workIds.add(item.id);
    }
    if (config.furniture.some(f => f.id === 'work-laptop')) workIds.add('work-laptop');
    const row = (f: FurnitureConfig) => {
      const parent = config.furniture.find(item => item.id === f.parentId);
      let ancestor = parent, visible = f.visible;
      while (ancestor) { visible = visible && ancestor.visible; ancestor = config.furniture.find(item => item.id === ancestor!.parentId); }
      const grouped = f.kind === 'work-zone', nested = workIds.has(f.id) && !grouped;
      const label = `${f.name}${grouped ? ' and its contents' : ''}`;
      return `<div class="object-row ${selectedId === f.id ? 'selected' : ''} ${!visible ? 'hidden-object' : ''}" ${nested ? 'style="margin-left:10px"' : ''}><button data-select="${esc(f.id)}" class="object-select" aria-pressed="${selectedId === f.id}" title="${esc(grouped ? 'Select the entire work setup' : f.name)}">${icon(furnitureIcon(f.kind))}<span>${esc(f.name)}</span>${parent ? `<span class="attached-dot" title="Moves with ${esc(parent.name)}"></span>` : ''}</button><button class="visibility-button" data-visibility="${esc(f.id)}" title="${f.visible ? 'Hide' : 'Show'} ${esc(label)}" aria-label="${f.visible ? 'Hide' : 'Show'} ${esc(label)}">${icon(f.visible ? 'eye' : 'eye-off')}</button></div>`;
    };
    const section = (title: string, items: FurnitureConfig[]) => `<div class="scene-section furniture-section"><div class="section-label"><span class="eyebrow">${title}</span><span class="count">${items.length}</span></div><div class="object-list">${items.map(row).join('')}</div></div>`;
    document.querySelector('#scene-panel')!.innerHTML = `
      <div class="panel-title"><h2>Your space</h2><button class="icon-button small-icon" data-action="settings" title="Room settings" aria-label="Room settings">${icon('sliders-horizontal')}</button></div>
      <div class="scene-section"><div class="section-label"><span class="eyebrow">ARCHITECTURE</span><span class="count">${room.airConditioner ? 5 : 4}</span></div>
        <button class="architecture-row" data-action="settings">${icon('box')}<span>Room shell</span><span class="row-tag">FIXED</span></button>
        <button class="architecture-row" data-action="settings">${icon('app-window')}<span>Existing window</span><i class="provisional-dot" title="Provisional measurements"></i></button>
        <button class="architecture-row" data-action="settings">${icon('door-open')}<span>Wooden door</span><i class="provisional-dot" title="Provisional measurements"></i></button>
        <button class="architecture-row" data-action="settings">${icon('sun')}<span>Baseboard LEDs</span><span class="led-dot" style="background:${room.baseboardLED.color}" title="${room.baseboardLED.enabled ? 'Enabled' : 'Disabled'}"></span></button>
        ${room.airConditioner ? `<button class="architecture-row" data-action="settings">${icon('panels-top-left')}<span>Window-style A/C</span><span class="row-tag">${room.airConditioner.enabled ? 'ON' : 'OFF'}</span></button>` : ''}
        <div class="features-note">${icon('info')}Soffits & corner step ${room.beams.some(b=>b.enabled) || room.cornerFeatures.some(f=>f.enabled) ? 'provisional' : 'off'}</div>
      </div>
      ${section('SHARED FURNITURE',config.furniture.filter(f => !workIds.has(f.id) && f.kind !== 'monitor'))}
      ${section('ZONE A / PERSONAL SETUP',config.furniture.filter(f => !workIds.has(f.id) && f.kind === 'monitor'))}
      ${section('ZONE B / WORK SETUP',config.furniture.filter(f => workIds.has(f.id)))}
      <div class="scene-section"><div class="section-label"><span class="eyebrow">LOUNGE / SOFA + TV</span><span class="count">2</span></div>
        <button class="architecture-row" data-action="toggle-lounge" aria-pressed="${!!config.lounge?.visible}">${icon(config.lounge?.visible?'eye-off':'eye')}<span>${config.lounge?.visible?'Hide':'Show'} sofa + 50-inch TV</span></button>
        <button class="architecture-row" data-action="lounge-daily" aria-pressed="${config.lounge?.state==='daily'}">${icon('armchair')}<span>Compact L · closed</span></button>
        <button class="architecture-row" data-action="lounge-sleeping" aria-pressed="${config.lounge?.state==='sleeping'}">${icon('bed-double')}<span>Extend sleeper bed</span></button>
        <p class="features-note">2.00 m sofa · TV parked below sill. Extended TV position not verified.</p>
      </div>
      ${workLaptop ? `<button class="architecture-row" data-action="toggle-work-power" aria-pressed="${workPowered}">${icon('power')}<span>${workPowered ? 'Turn work setup off' : 'Turn work setup on'}</span></button><p class="features-note">Laptop + 2 work monitors. Personal PC stays on.</p>` : ''}
      ${workRoot ? `<button class="architecture-row" data-visibility="${esc(workRoot.id)}">${icon(workRoot.visible ? 'eye-off' : 'eye')}<span>${workRoot.visible ? 'Hide work monitor pair' : 'Show work monitor pair'}</span></button>` : ''}
      <button class="architecture-row" data-action="toggle-work-zone">${icon(workRoot ? 'minus' : 'plus')}<span>${workRoot ? 'Remove work monitor pair' : 'Add work monitor pair'}</span></button>
      <div class="sidebar-bottom"><button class="text-button settings-link" data-action="settings">${icon('settings-2')}Room measurements ${icon('chevron-right')}</button><div class="room-card"><p class="eyebrow">YOUR ROOM AT A GLANCE</p><strong>${room.length.toFixed(2)} <span>×</span> ${room.width.toFixed(2)} <small>m</small></strong><div class="room-card-bottom"><span>${(room.length * room.width).toFixed(2)} m² floor area</span><span>${room.height.toFixed(2)} m high*</span></div></div><p class="measurement-note"><span>*</span> ${room.heightConfirmed ? 'Ceiling height confirmed.' : 'Ceiling height is provisional.'} Opening measurements are editable.</p></div>`;
  }

  private inspector() {
    const { config, selectedId, mode, snap } = this.state;
    const node = document.querySelector('#inspector')!;
    if (mode === 'walk') {
      node.innerHTML = `<p class="eyebrow">WALK THROUGH</p><div class="selected-object-icon walk-selected">${icon('footprints')}</div><h2>Your space, at eye level.</h2><p class="muted">Take a look around and get a feel for the room.</p><div class="property-section"><div class="property-title"><h3>Walking speed</h3><span id="speed-value">1.2 m/s</span></div><input id="walk-speed" type="range" min="0.4" max="2.4" step="0.1" value="1.2" aria-label="Walking speed"><div class="range-labels"><span>Slow</span><span>Brisk</span></div></div><div class="walk-detail"><span>Eye height</span><strong>1.70 m</strong></div><div class="walk-detail"><span>Wall & furniture collisions</span><strong class="green">On</strong></div><div class="inspector-tip">${icon('info')}<p>Click the room to capture your mouse. Press <kbd>Esc</kbd> to use the panels again.</p></div><button class="secondary-button" data-mode="edit">${icon('mouse-pointer-2')}Back to editing</button>`;
      return;
    }
    const object = config.furniture.find(f => f.id === selectedId);
    if (!object) { node.innerHTML = `<p class="eyebrow">SPACE OVERVIEW</p><div class="selected-object-icon">${icon('mouse-pointer-2')}</div><h2>Make room for focus.</h2><p class="muted">Select an object in the room or scene list to adjust its dimensions, position, and finish.</p><div class="inspector-tip">${icon('info')}<p>Four full-size personal screens occupy the main span; two work screens stay on the right return. The laptop sits in the inside corner below them and controls the work pair power.</p></div>`; return; }
    const parent = config.furniture.find(f => f.id === object.parentId);
    const numberField = (group: string, field: string, label: string, value: number, min?: number, max?: number, unit = 'm') => `<label class="number-field"><span>${label}</span><div><input type="number" aria-label="${group} ${field}" data-group="${group}" data-field="${field}" value="${value.toFixed(2)}" step="${unit === '°' ? '1' : '0.01'}" ${min !== undefined ? `min="${min}"` : ''} ${max !== undefined ? `max="${max}"` : ''}><small>${unit}</small></div></label>`;
    const mainRun = object.cornerDesk?.mainRun ?? 'width';
    const dimensionOrder = object.cornerDesk && mainRun === 'depth' ? ['depth','width','height'] as const : ['width','depth','height'] as const;
    const dimensions = dimensionOrder.map(key => numberField('dimensions',key, key === 'height' ? 'Height' : object.cornerDesk?.shape === 'rect-c' ? key === 'depth' ? 'Main span' : 'Overall depth' : object.cornerDesk ? key === mainRun ? 'Main run' : 'Return run' : key === 'width' ? 'Width' : 'Depth',object.dimensions[key],.05,10)).join('');
    node.innerHTML = `
      <div class="inspector-topline"><p class="eyebrow">OBJECT PROPERTIES</p><button class="icon-button small-icon" data-action="deselect" title="Deselect object" aria-label="Deselect object">${icon('x')}</button></div>
      <div class="object-title"><span class="selected-object-icon">${icon(furnitureIcon(object.kind))}</span><div><span class="object-category">${object.kind === 'divider' ? 'FOLDING ROOM DIVIDER' : object.kind === 'work-zone' ? 'WORK MONITOR PAIR' : object.kind === 'laptop' ? 'WORK LAPTOP' : object.monitor?.mount === 'wall' ? 'WALL-MOUNTED DISPLAY' : object.kind === 'monitor' ? 'DESK ACCESSORY' : 'OFFICE ESSENTIAL'}</span><h2>${esc(object.name)}</h2></div></div>
      ${object.monitor ? `<p class="object-description">${esc(object.monitor.brand)} ${object.monitor.diagonalInches}″ · ${object.monitor.orientation} · ${object.monitor.mount === 'wall' ? 'Wall-mounted arm' : object.monitor.mount === 'shared-arm' ? 'Shared dual-monitor arm' : object.monitor.mount === 'arm' ? 'Desk-mounted arm' : 'Stand'}<br>16:9 panel · casing and mount provisional</p>` : object.kind === 'work-zone' ? `<p class="object-description">Two work monitors on one shared arm. Move, rotate, show, or hide this pair together. The laptop is a separate desk object.</p>` : object.kind === 'laptop' ? `<p class="object-description">The laptop sits below the transition between the personal and work screens, angled toward the chair. It moves with the desk and can be adjusted independently.</p>` : object.kind === 'divider' ? `<p class="object-description">A rear backdrop for your workstation.</p>` : `<p class="object-description">Simple geometry. Real-world proportions.</p>`}
      ${parent?.kind === 'work-zone' ? `<button class="text-button" data-select="${esc(parent.id)}">${icon('panels-top-left')}Select entire monitor pair</button>` : ''}
      <div class="property-section"><div class="property-title"><h3>${icon('ruler')}Dimensions</h3><span>METERS</span></div><div class="number-grid">${dimensions}</div>${object.monitor ? `<p class="field-hint">${object.monitor.mount === 'wall' || object.monitor.mount === 'shared-arm' ? 'Screen enclosure only. The support arm extends behind it.' : 'Overall envelope, including the monitor arm.'}</p>` : ''}</div>
      ${object.cornerDesk ? `<div class="property-section">${numberField('cornerDesk','worktopDepth',object.cornerDesk.shape === 'rect-c' ? 'Main surface depth' : 'Worktop depth · both runs',object.cornerDesk.worktopDepth,.3,1.3)}<p class="field-hint">Straight short returns frame the open chair bay. Overall depth controls how far they project.</p></div>` : ''}
      ${object.cornerDesk?.shape === 'rect-c' ? `<div class="property-section">${numberField('cornerDesk','returnWidth','Return width',object.cornerDesk.returnWidth ?? .62,.3,1)}<p class="field-hint">Width of each short end surface along the main wall.</p></div>` : ''}
      ${object.cornerDesk?.cornerNotch ? `<div class="property-section"><div class="property-title"><h3>Corner cutout</h3></div><div class="number-grid">${numberField('cornerNotch','width','Cutout width',object.cornerDesk.cornerNotch.width,.01,1)}${numberField('cornerNotch','depth','Cutout depth',object.cornerDesk.cornerNotch.depth,.01,1)}</div><p class="field-hint">The outer corner wraps around the room's vertical step. Keep clearance when changing the desk position or cutout dimensions.</p></div>` : ''}
      ${object.workZone ? `<div class="property-section"><div class="property-title"><h3>Shared monitor arm</h3></div><div class="number-grid">${numberField('workZone','columnHeight','Column height',object.workZone.columnHeight,.15,.8)}${numberField('workZone','armReach','Arm reach',object.workZone.armReach,.15,1)}</div><p class="field-hint">One desktop attachment supports both work monitors. Keep its clamp on a desk edge. Select a child screen to adjust its position or angle.</p></div><div class="inspector-tip">${icon('armchair')}<p>Both setups share the existing chair. Move it between zones to test the workspace and circulation.</p></div><div class="object-list"><button class="architecture-row" data-action="chair-work">${icon('armchair')}Chair at work setup</button><button class="architecture-row" data-action="chair-personal">${icon('armchair')}Chair at personal setup</button></div>` : ''}
      ${object.laptop ? `<div class="property-section">${numberField('laptop','openingAngle','Screen opening angle',object.laptop.openingAngle,85,120,'°')}</div>` : ''}
      <div class="property-section"><div class="property-title"><h3>${icon('move')}Position</h3><button data-action="focus" class="subtle-button" title="Focus selected object (F)">${icon('focus')}</button></div><div class="number-grid">${numberField('position','x','X',object.position.x)}${numberField('position','y','Y',object.position.y,0)}${numberField('position','z','Z',object.position.z)}</div><p class="field-hint">${parent ? `Relative to ${esc(parent.name)} · moves with its parent` : 'Bottom center · relative to room center'}</p></div>
      ${object.monitor?.mount === 'wall' && object.monitor.wallMount ? `<div class="property-section"><div class="property-title"><h3>Wall attachment</h3><span>${object.monitor.wallMount.wall.toUpperCase()}</span></div><div class="number-grid">${numberField('wallMount','offset','Wall offset',object.monitor.wallMount.offset)}${numberField('wallMount','height','Anchor height',object.monitor.wallMount.height,.1)}${numberField('wallMount','maxReach','Arm reach',object.monitor.wallMount.maxReach,.1,2)}</div><p class="field-hint">The attachment stays fixed when the screen or desk moves. Screen Y is its bottom edge. Keep the screen within arm reach and clear of walls and openings.</p></div>` : ''}
      <div class="property-section rotation-section"><div class="property-title"><h3>${icon('rotate-cw')}Rotation</h3><span>Y AXIS</span></div><div class="rotation-controls"><label class="rotation-field"><input type="number" aria-label="Rotation in degrees" data-group="transform" data-field="rotation" step="15" value="${Math.round(object.rotation * 10) / 10}"><span>°</span></label><button class="secondary-button" data-action="rotate90">${icon('rotate-cw')}90°</button></div></div>
      <div class="property-section finish-section"><div class="property-title"><h3>Finish</h3><span>PLACEHOLDER</span></div><div class="swatches">${['#c4c6ad','#bf9b72','#d2c3aa','#eeeae0','#535c52','#383e3d'].map((color,i) => `<button class="swatch ${object.color === color ? 'selected' : ''}" style="--swatch:${color}" data-color="${color}" aria-label="Set finish to ${['sage linen','natural oak','sand','warm white','olive','graphite'][i]}" aria-pressed="${object.color === color}">${object.color === color ? icon('check') : ''}</button>`).join('')}</div></div>
      <button class="snap-row" data-action="snap" role="switch" aria-checked="${snap}"><span>${icon('grid-2x2')}Snap to grid <small>5 cm / 15°</small></span><span class="toggle ${snap ? 'on' : ''}"></span></button>
      ${object.kind === 'divider' ? `<div class="inspector-tip divider-tip">${icon('info')}<p>Designed to sit behind your desk. Move or rotate it to find your ideal backdrop.</p></div><button class="primary-button place-divider" data-action="behind-desk">Place behind desk ${icon('arrow-up-right')}</button>` : `<div class="inspector-tip">${icon('info')}<p>Use the colored handles to move this object, or enter precise values above.</p></div>`}
      <button class="text-button reset-object" data-action="reset-object">${icon('rotate-ccw')}Reset this object</button>`;
  }

  openSettings() {
    if (this.state.mode !== 'edit') return;
    const room = this.state.config.room;
    const input = (name: string, label: string, value: number, min = 0, max = 30) => `<label class="settings-field">${label}<div><input name="${name}" type="number" step="0.001" min="${min}" max="${max}" value="${value}" required><span>m</span></div></label>`;
    const wallSelect = (name: string, value: string) => `<label class="settings-field">Wall<select name="${name}">${['north','east','south','west'].map(w => `<option value="${w}" ${w === value ? 'selected' : ''}>${w[0].toUpperCase()+w.slice(1)}</option>`).join('')}</select></label>`;
    const dialog = document.querySelector<HTMLDialogElement>('#settings-dialog')!;
    dialog.innerHTML = `<form id="room-form"><div class="dialog-header"><div><p class="eyebrow">THE REAL ROOM</p><h2>Room measurements</h2></div><button type="button" class="icon-button" data-action="close-settings" aria-label="Close room settings">${icon('x')}</button></div><div class="settings-content"><p class="muted">One unit is one meter. X runs along the 3.80 m walls; Z runs along the 2.60 m walls. North is +Z.</p><div class="settings-grid">${input('length','Length · X',room.length,1)}${input('width','Width · Z',room.width,1)}${input('height','Ceiling height*',room.height,1.9,8)}</div><label class="check-label"><input type="checkbox" name="heightConfirmed" ${room.heightConfirmed ? 'checked' : ''}>Ceiling height has been measured</label>
      ${room.openings.map((o,i)=>`<section class="settings-section"><h3>${icon(o.kind === 'window' ? 'app-window' : 'door-open')}${o.kind === 'window' ? 'Existing window' : 'Wooden door'}<span class="pill">EDITABLE</span></h3><div class="settings-grid">${wallSelect(`opening.${i}.wall`,o.wall)}${input(`opening.${i}.offset`,'Offset from wall center',o.offset,-15,15)}${input(`opening.${i}.width`,'Width',o.width,.3,10)}${input(`opening.${i}.height`,o.windowDetail ? 'Height including shutter housing' : 'Height',o.height,.3,8)}${o.kind === 'window' ? input(`opening.${i}.sill`,'Sill above floor',o.sill,0,8) : ''}</div>${o.windowDetail ? `<div class="settings-grid"><label class="settings-field">Frame color<input type="color" name="opening.${i}.detail.frameColor" value="${o.windowDetail.frameColor}" aria-label="Window frame color"></label>${input(`opening.${i}.detail.frameWidth`,'Frame face width',o.windowDetail.frameWidth,.01,.2)}${input(`opening.${i}.detail.frameDepth`,'Frame depth',o.windowDetail.frameDepth,.01,.3)}${input(`opening.${i}.detail.housingHeight`,'Shutter housing height',o.windowDetail.housingHeight,.05,.6)}${input(`opening.${i}.detail.slatPitch`,'Shutter slat spacing',o.windowDetail.slatPitch,.01,.12)}</div><label class="check-label"><input name="opening.${i}.detail.shutterClosed" type="checkbox" ${o.windowDetail.shutterClosed ? 'checked' : ''}>Close roller shutter</label><p class="field-hint">Sill + total opening height sets the top of the frame. The starting frame sits directly beneath the south soffit; recheck this clearance after changing ceiling or soffit dimensions.</p>` : ''}<label class="check-label"><input name="opening.${i}.confirmed" type="checkbox" ${o.confirmed ? 'checked' : ''}>Opening measurements confirmed</label></section>`).join('')}
      ${room.airConditioner ? `<section class="settings-section"><h3>${icon('panels-top-left')}Window-style air conditioner<span class="pill">PROVISIONAL</span></h3><label class="check-label"><input type="checkbox" name="ac.enabled" ${room.airConditioner.enabled ? 'checked' : ''}>Show air conditioner</label><div class="settings-grid">${wallSelect('ac.wall',room.airConditioner.wall)}${input('ac.offset','Offset from wall center',room.airConditioner.offset,-15,15)}${input('ac.bottom','Bottom above floor',room.airConditioner.bottom,0,8)}${input('ac.width','Unit width',room.airConditioner.width,.3,1.5)}${input('ac.height','Unit height',room.airConditioner.height,.3,1)}${input('ac.depth','Total unit depth',room.airConditioner.depth,.3,1.2)}${input('ac.interiorProjection','Projection into room',room.airConditioner.interiorProjection,.06,.35)}<label class="settings-field">Case color<input type="color" name="ac.color" value="${room.airConditioner.color}" aria-label="Air conditioner color"></label><label class="settings-field">Grille direction<div><input type="number" name="ac.louverYaw" min="-30" max="30" step="1" value="${room.airConditioner.louverYaw}" required><span>°</span></div></label></div><p class="field-hint">The box passes through the wall, with its rear outside. Total depth includes the indoor projection, wall thickness, and exterior portion. Measurements are approximate.</p></section>` : ''}
      <section class="settings-section"><h3>${icon('sun')}Baseboard LEDs</h3><label class="check-label"><input type="checkbox" name="led.enabled" ${room.baseboardLED.enabled ? 'checked' : ''}>Enable baseboard lighting</label><div class="settings-grid"><label class="settings-field">LED color<input type="color" name="led.color" value="${room.baseboardLED.color}" aria-label="LED color"></label><label class="settings-field">Light intensity (0–1)<div><input type="number" name="led.intensity" min="0" max="1" step="0.01" value="${room.baseboardLED.intensity}" required></div></label><label class="settings-field">Soft glow (0–1)<div><input type="number" name="led.glow" min="0" max="1" step="0.01" value="${room.baseboardLED.glow}" required></div></label></div><p class="field-hint">Strips stop at the door. Walls remain neutral and individually configurable.</p></section>
      <div class="notice">The photos support soffits on the south window wall and west short wall opposite the door, plus a southwest corner step. Their starting proportions are approximate and remain editable. Projection into the room and vertical drop are separate measurements.</div>
      ${room.beams.map((b,i)=>`<details class="feature-details"><summary>${b.wall[0].toUpperCase()+b.wall.slice(1)} wall soffit <span>${b.enabled ? 'Enabled · provisional' : 'Disabled'}</span></summary><label class="check-label"><input name="beam.${i}.enabled" type="checkbox" ${b.enabled ? 'checked' : ''}>Enable this individual soffit</label><div class="settings-grid">${wallSelect(`beam.${i}.wall`,b.wall)}${input(`beam.${i}.offset`,'Center offset',b.offset,-15,15)}${input(`beam.${i}.length`,'Length along wall',b.length,.1)}${input(`beam.${i}.projection`,'Projection into room',b.projection,.01,2)}${input(`beam.${i}.drop`,'Vertical drop below ceiling',b.drop,.01,8)}</div></details>`).join('')}
      ${room.cornerFeatures.map((f,i)=>`<details class="feature-details"><summary>Vertical corner step <span>${f.enabled ? 'Enabled · provisional' : 'Disabled'}</span></summary><label class="check-label"><input name="corner.${i}.enabled" type="checkbox" ${f.enabled ? 'checked' : ''}>Enable this corner feature</label><div class="settings-grid"><label class="settings-field">Corner<select name="corner.${i}.corner">${['north-west','north-east','south-west','south-east'].map(c=>`<option ${c === f.corner ? 'selected' : ''}>${c}</option>`).join('')}</select></label>${input(`corner.${i}.width`,'Width · X',f.width,.01)}${input(`corner.${i}.depth`,'Depth · Z',f.depth,.01)}${input(`corner.${i}.height`,'Height',f.height,.01,8)}</div></details>`).join('')}
      <p class="form-error" id="settings-error" role="alert"></p></div><div class="dialog-footer"><button type="button" class="secondary-button" data-action="close-settings">Cancel</button><button type="submit" class="primary-button">Apply measurements ${icon('check')}</button></div></form>`;
    // Set live select values as well as default attributes when reopening the form.
    dialog.querySelectorAll<HTMLSelectElement>('select').forEach(select => {
      const option = select.querySelector<HTMLOptionElement>('option[selected]');
      if (option) select.value = option.value;
    });
    dialog.querySelector('form')!.addEventListener('submit', event => {
      event.preventDefault(); const data = new FormData(event.target as HTMLFormElement), updated = structuredClone(room);
      const n = (name: string) => Number(data.get(name));
      updated.length = n('length'); updated.width = n('width'); updated.height = n('height'); updated.heightConfirmed = data.has('heightConfirmed');
      updated.baseboardLED = { enabled: data.has('led.enabled'), color: String(data.get('led.color')), intensity: n('led.intensity'), glow: n('led.glow') };
      if (updated.airConditioner) {
        updated.airConditioner.enabled = data.has('ac.enabled');
        updated.airConditioner.wall = data.get('ac.wall') as typeof updated.airConditioner.wall;
        updated.airConditioner.color = String(data.get('ac.color'));
        for (const k of ['offset','bottom','width','height','depth','interiorProjection','louverYaw'] as const) updated.airConditioner[k] = n(`ac.${k}`);
      }
      updated.openings.forEach((o,i)=>{
        o.wall = data.get(`opening.${i}.wall`) as typeof o.wall;
        for (const k of ['offset','width','height'] as const) o[k] = n(`opening.${i}.${k}`);
        if(o.kind === 'window') o.sill = n(`opening.${i}.sill`);
        if(o.windowDetail) {
          o.windowDetail.frameColor = String(data.get(`opening.${i}.detail.frameColor`));
          for (const k of ['frameWidth','frameDepth','housingHeight','slatPitch'] as const) o.windowDetail[k] = n(`opening.${i}.detail.${k}`);
          o.windowDetail.shutterClosed = data.has(`opening.${i}.detail.shutterClosed`);
        }
        o.confirmed = data.has(`opening.${i}.confirmed`);
      });
      updated.beams.forEach((b,i)=>{ b.enabled = data.has(`beam.${i}.enabled`); b.wall = data.get(`beam.${i}.wall`) as typeof b.wall; for(const k of ['offset','length','projection','drop'] as const) b[k] = n(`beam.${i}.${k}`); });
      updated.cornerFeatures.forEach((f,i)=>{ f.enabled = data.has(`corner.${i}.enabled`); f.corner = data.get(`corner.${i}.corner`) as typeof f.corner; for(const k of ['width','depth','height'] as const) f[k] = n(`corner.${i}.${k}`); });
      try { this.actions.room(updated); dialog.close(); } catch(error) { dialog.querySelector('#settings-error')!.textContent = (error as Error).message; }
    });
    renderIcons(); dialog.showModal();
  }

  lockChanged(locked: boolean) {
    document.querySelector<HTMLElement>('#walk-overlay')!.hidden = this.state?.mode !== 'walk' || locked;
    document.querySelector<HTMLElement>('#crosshair')!.hidden = !locked;
  }
  saved(success: boolean) {
    document.querySelector('#save-state')!.innerHTML = `${icon(success ? 'check' : 'info')}${success ? 'Saved locally' : 'Session only'}`; renderIcons();
  }
  toast(message: string) {
    const toast = document.querySelector<HTMLElement>('#toast')!;
    toast.textContent = message; toast.hidden = false; window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => { toast.hidden = true; }, 4500);
  }
  dispose() { this.abort.abort(); window.clearTimeout(this.toastTimer); }
}
