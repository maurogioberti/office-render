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
        <div class="header-actions"><span id="save-state" class="save-state">${icon('check')}Saved locally</span><button class="icon-button" data-action="import" title="Import layout JSON" aria-label="Import layout JSON">${icon('upload')}</button><button class="export-button" data-action="export">${icon('download')}<span>Export layout</span></button></div>
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
      <footer class="status-bar"><span><i class="status-dot"></i>Real-time 3D <span class="status-divider">/</span><span id="mode-status">Edit mode</span></span><span>1 unit = 1 meter <span class="status-divider">·</span> ${icon('save')}Stored on this device</span><span id="object-status">7 furniture objects</span></footer>
      <input type="file" id="import-file" accept=".json,application/json" hidden />
      <dialog id="settings-dialog" class="settings-dialog"></dialog>
      <dialog id="help-dialog" class="help-dialog"><div class="dialog-header"><div><p class="eyebrow">FIND YOUR WAY</p><h2>A few helpful shortcuts.</h2></div><button class="icon-button" data-action="close-help" aria-label="Close help">${icon('x')}</button></div><div class="help-content"><h3>Edit mode</h3><p><span>Orbit / pan / zoom</span><b>Left drag / right drag / scroll</b></p><p><span>Select furniture</span><b>Click an object or scene row</b></p><p><span>Move / rotate gizmo</span><b><kbd>G</kbd> / <kbd>R</kbd></b></p><p><span>Nudge on the floor</span><b>Arrow keys · 5 cm</b></p><p><span>Focus selected object</span><kbd>F</kbd></p><p><span>Undo / redo</span><b>Ctrl Z / Ctrl Shift Z</b></p><h3>Walk mode</h3><p><span>Capture mouse</span><b>Click inside the room</b></p><p><span>Move / look</span><b>WASD / mouse</b></p><p><span>Release mouse</span><kbd>Esc</kbd></p><div class="notice">Objects use bottom-center positions. Attached monitors and the PC use coordinates relative to the desk. All measurements are in meters.</div></div></dialog>`;
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
    document.querySelector('#object-status')!.textContent = `${state.config.furniture.length} furniture objects`;
    document.querySelector('#view-button')!.innerHTML = `${icon(state.top ? 'grid-2x2' : 'box')}<span>${state.top ? 'Top view' : 'Perspective'}</span>${icon('chevron-down')}`;
    document.querySelector('#canvas-help')!.innerHTML = state.mode === 'edit' ? `${icon('mouse-pointer-2')} Drag to orbit <span>·</span> Scroll to zoom <span>·</span> Click to select` : `<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> Move <span>·</span> Mouse to look <span>·</span> Esc to release`;
    this.scenePanel(); this.inspector(); renderIcons();
    this.lockChanged(document.pointerLockElement === this.canvas);
  }

  private scenePanel() {
    const { config, selectedId } = this.state;
    const room = config.room;
    document.querySelector('#scene-panel')!.innerHTML = `
      <div class="panel-title"><h2>Your space</h2><button class="icon-button small-icon" data-action="settings" title="Room settings" aria-label="Room settings">${icon('sliders-horizontal')}</button></div>
      <div class="scene-section"><div class="section-label"><span class="eyebrow">ARCHITECTURE</span><span class="count">4</span></div>
        <button class="architecture-row" data-action="settings">${icon('box')}<span>Room shell</span><span class="row-tag">FIXED</span></button>
        <button class="architecture-row" data-action="settings">${icon('app-window')}<span>Existing window</span><i class="provisional-dot" title="Provisional measurements"></i></button>
        <button class="architecture-row" data-action="settings">${icon('door-open')}<span>Wooden door</span><i class="provisional-dot" title="Provisional measurements"></i></button>
        <button class="architecture-row" data-action="settings">${icon('sun')}<span>Baseboard LEDs</span><span class="led-dot" style="background:${room.baseboardLED.color}" title="${room.baseboardLED.enabled ? 'Enabled' : 'Disabled'}"></span></button>
        <div class="features-note">${icon('info')}Beam & corner feature ${room.beams.some(b=>b.enabled) || room.cornerFeatures.some(f=>f.enabled) ? 'configured' : 'off'}</div>
      </div>
      <div class="scene-section furniture-section"><div class="section-label"><span class="eyebrow">FURNITURE</span><span class="count">${config.furniture.length}</span></div>
        <div class="object-list">${config.furniture.map(f => `<div class="object-row ${selectedId === f.id ? 'selected' : ''} ${!f.visible ? 'hidden-object' : ''}"><button data-select="${esc(f.id)}" class="object-select" aria-pressed="${selectedId === f.id}">${icon(furnitureIcon(f.kind))}<span>${esc(f.name)}</span>${f.parentId ? '<span class="attached-dot" title="Moves with desk"></span>' : ''}</button><button class="visibility-button" data-visibility="${esc(f.id)}" title="${f.visible ? 'Hide' : 'Show'} ${esc(f.name)}" aria-label="${f.visible ? 'Hide' : 'Show'} ${esc(f.name)}">${icon(f.visible ? 'eye' : 'eye-off')}</button></div>`).join('')}</div>
      </div>
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
    if (!object) { node.innerHTML = `<p class="eyebrow">SPACE OVERVIEW</p><div class="selected-object-icon">${icon('mouse-pointer-2')}</div><h2>Make room for focus.</h2><p class="muted">Select an object in the room or scene list to adjust its dimensions, position, and finish.</p><div class="inspector-tip">${icon('info')}<p>Select the corner desk to adjust its runs, worktop depth, and attached monitor setup.</p></div>`; return; }
    const numberField = (group: string, field: string, label: string, value: number, min?: number, max?: number) => `<label class="number-field"><span>${label}</span><div><input type="number" aria-label="${group} ${field}" data-group="${group}" data-field="${field}" value="${value.toFixed(2)}" step="0.01" ${min !== undefined ? `min="${min}"` : ''} ${max !== undefined ? `max="${max}"` : ''}><small>m</small></div></label>`;
    node.innerHTML = `
      <div class="inspector-topline"><p class="eyebrow">OBJECT PROPERTIES</p><button class="icon-button small-icon" data-action="deselect" title="Deselect object" aria-label="Deselect object">${icon('x')}</button></div>
      <div class="object-title"><span class="selected-object-icon">${icon(furnitureIcon(object.kind))}</span><div><span class="object-category">${object.kind === 'divider' ? 'FOLDING ROOM DIVIDER' : object.kind === 'monitor' ? 'DESK ACCESSORY' : 'OFFICE ESSENTIAL'}</span><h2>${esc(object.name)}</h2></div></div>
      ${object.monitor ? `<p class="object-description">${esc(object.monitor.brand)} ${object.monitor.diagonalInches}″ · ${object.monitor.orientation} · ${object.monitor.mount === 'arm' ? 'Monitor arm' : 'Stand'}<br>16:9 panel · casing and mount provisional</p>` : object.kind === 'divider' ? `<p class="object-description">A rear backdrop for your workstation.</p>` : `<p class="object-description">Simple geometry. Real-world proportions.</p>`}
      <div class="property-section"><div class="property-title"><h3>${icon('ruler')}Dimensions</h3><span>METERS</span></div><div class="number-grid">${numberField('dimensions','width',object.cornerDesk ? 'Return run' : 'Width',object.dimensions.width,.05,10)}${numberField('dimensions','depth',object.cornerDesk ? 'Left run' : 'Depth',object.dimensions.depth,.05,10)}${numberField('dimensions','height','Height',object.dimensions.height,.05,10)}</div>${object.monitor ? '<p class="field-hint">Overall envelope, including the monitor arm.</p>' : ''}</div>
      ${object.cornerDesk ? `<div class="property-section">${numberField('cornerDesk','worktopDepth','Worktop depth · both runs',object.cornerDesk.worktopDepth,.3,1.3)}<p class="field-hint">The inner corner stays open for your chair.</p></div>` : ''}
      <div class="property-section"><div class="property-title"><h3>${icon('move')}Position</h3><button data-action="focus" class="subtle-button" title="Focus selected object (F)">${icon('focus')}</button></div><div class="number-grid">${numberField('position','x','X',object.position.x)}${numberField('position','y','Y',object.position.y,0)}${numberField('position','z','Z',object.position.z)}</div><p class="field-hint">${object.parentId ? 'Relative to desk · moves with its parent' : 'Bottom center · relative to room center'}</p></div>
      <div class="property-section rotation-section"><div class="property-title"><h3>${icon('rotate-cw')}Rotation</h3><span>Y AXIS</span></div><div class="rotation-controls"><label class="rotation-field"><input type="number" aria-label="Rotation in degrees" data-group="transform" data-field="rotation" step="15" value="${Math.round(object.rotation * 10) / 10}"><span>°</span></label><button class="secondary-button" data-action="rotate90">${icon('rotate-cw')}90°</button></div></div>
      <div class="property-section finish-section"><div class="property-title"><h3>Finish</h3><span>PLACEHOLDER</span></div><div class="swatches">${['#c4c6ad','#bf9b72','#d2c3aa','#eeeae0','#535c52','#383e3d'].map((color,i) => `<button class="swatch ${object.color === color ? 'selected' : ''}" style="--swatch:${color}" data-color="${color}" aria-label="Set finish to ${['sage linen','natural oak','sand','warm white','olive','graphite'][i]}" aria-pressed="${object.color === color}">${object.color === color ? icon('check') : ''}</button>`).join('')}</div></div>
      <button class="snap-row" data-action="snap" role="switch" aria-checked="${snap}"><span>${icon('grid-2x2')}Snap to grid <small>5 cm / 15°</small></span><span class="toggle ${snap ? 'on' : ''}"></span></button>
      ${object.kind === 'divider' ? `<div class="inspector-tip divider-tip">${icon('info')}<p>Designed to sit behind your desk. Move or rotate it to find your ideal backdrop.</p></div><button class="primary-button place-divider" data-action="behind-desk">Place behind desk ${icon('arrow-up-right')}</button>` : `<div class="inspector-tip">${icon('info')}<p>Use the colored handles to move this object, or enter precise values above.</p></div>`}
      <button class="text-button reset-object" data-action="reset-object">${icon('rotate-ccw')}Reset this object</button>`;
  }

  openSettings() {
    if (this.state.mode !== 'edit') return;
    const room = this.state.config.room;
    const input = (name: string, label: string, value: number, min = 0, max = 30) => `<label class="settings-field">${label}<div><input name="${name}" type="number" step="0.01" min="${min}" max="${max}" value="${value}" required><span>m</span></div></label>`;
    const wallSelect = (name: string, value: string) => `<label class="settings-field">Wall<select name="${name}">${['north','east','south','west'].map(w => `<option value="${w}" ${w === value ? 'selected' : ''}>${w[0].toUpperCase()+w.slice(1)}</option>`).join('')}</select></label>`;
    const dialog = document.querySelector<HTMLDialogElement>('#settings-dialog')!;
    dialog.innerHTML = `<form id="room-form"><div class="dialog-header"><div><p class="eyebrow">THE REAL ROOM</p><h2>Room measurements</h2></div><button type="button" class="icon-button" data-action="close-settings" aria-label="Close room settings">${icon('x')}</button></div><div class="settings-content"><p class="muted">One unit is one meter. X runs along the 3.80 m walls; Z runs along the 2.60 m walls. North is +Z.</p><div class="settings-grid">${input('length','Length · X',room.length,1)}${input('width','Width · Z',room.width,1)}${input('height','Ceiling height*',room.height,1.9,8)}</div><label class="check-label"><input type="checkbox" name="heightConfirmed" ${room.heightConfirmed ? 'checked' : ''}>Ceiling height has been measured</label>
      ${room.openings.map((o,i)=>`<section class="settings-section"><h3>${icon(o.kind === 'window' ? 'app-window' : 'door-open')}${o.kind === 'window' ? 'Existing window' : 'Wooden door'}<span class="pill">EDITABLE</span></h3><div class="settings-grid">${wallSelect(`opening.${i}.wall`,o.wall)}${input(`opening.${i}.offset`,'Offset from wall center',o.offset,-15,15)}${input(`opening.${i}.width`,'Width',o.width,.3,10)}${input(`opening.${i}.height`,'Height',o.height,.3,8)}${o.kind === 'window' ? input(`opening.${i}.sill`,'Sill above floor',o.sill,0,8) : ''}</div><label class="check-label"><input name="opening.${i}.confirmed" type="checkbox" ${o.confirmed ? 'checked' : ''}>Opening measurements confirmed</label></section>`).join('')}
      <section class="settings-section"><h3>${icon('sun')}Baseboard LEDs</h3><label class="check-label"><input type="checkbox" name="led.enabled" ${room.baseboardLED.enabled ? 'checked' : ''}>Enable baseboard lighting</label><div class="settings-grid"><label class="settings-field">LED color<input type="color" name="led.color" value="${room.baseboardLED.color}" aria-label="LED color"></label><label class="settings-field">Light intensity (0–1)<div><input type="number" name="led.intensity" min="0" max="1" step="0.01" value="${room.baseboardLED.intensity}" required></div></label><label class="settings-field">Soft glow (0–1)<div><input type="number" name="led.glow" min="0" max="1" step="0.01" value="${room.baseboardLED.glow}" required></div></label></div><p class="field-hint">Strips stop at the door. Walls remain neutral and individually configurable.</p></section>
      <div class="notice">The corrected window is on the south long wall toward the east door side. Assignment, sizes, and offsets remain editable. Enable the features below only once their locations are known.</div>
      ${room.beams.map((b,i)=>`<details class="feature-details"><summary>Ceiling beam / soffit <span>${b.enabled ? 'Enabled' : 'Disabled'}</span></summary><label class="check-label"><input name="beam.${i}.enabled" type="checkbox" ${b.enabled ? 'checked' : ''}>Enable this individual beam</label><div class="settings-grid">${wallSelect(`beam.${i}.wall`,b.wall)}${input(`beam.${i}.offset`,'Center offset',b.offset,-15,15)}${input(`beam.${i}.length`,'Length along wall',b.length,.1)}${input(`beam.${i}.projection`,'Projection into room',b.projection,.01,2)}${input(`beam.${i}.drop`,'Drop below ceiling',b.drop,.01,8)}</div></details>`).join('')}
      ${room.cornerFeatures.map((f,i)=>`<details class="feature-details"><summary>20 cm corner protrusion <span>${f.enabled ? 'Enabled' : 'Disabled'}</span></summary><label class="check-label"><input name="corner.${i}.enabled" type="checkbox" ${f.enabled ? 'checked' : ''}>Enable this corner feature</label><div class="settings-grid"><label class="settings-field">Corner<select name="corner.${i}.corner">${['north-west','north-east','south-west','south-east'].map(c=>`<option ${c === f.corner ? 'selected' : ''}>${c}</option>`).join('')}</select></label>${input(`corner.${i}.width`,'Width',f.width,.01)}${input(`corner.${i}.depth`,'Depth',f.depth,.01)}${input(`corner.${i}.height`,'Height',f.height,.01,8)}</div></details>`).join('')}
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
      updated.openings.forEach((o,i)=>{ o.wall = data.get(`opening.${i}.wall`) as typeof o.wall; for (const k of ['offset','width','height'] as const) o[k] = n(`opening.${i}.${k}`); if(o.kind === 'window') o.sill = n(`opening.${i}.sill`); o.confirmed = data.has(`opening.${i}.confirmed`); });
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
