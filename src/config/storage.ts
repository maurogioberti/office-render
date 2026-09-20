import { freshConfig } from './office';
import type { PlannerConfig } from './types';
import { monitorPanel } from '../furniture/footprint';
import { createWorkZone } from './office';
import { resizeCornerDesk } from '../furniture/deskLayout';
import { desktopItemPlacementIssue, workZonePlacementIssue } from '../furniture/workZonePlacement';
import { monitorMountGeometry, wallMountFootprints } from '../furniture/wallMounts';
import { architectureConflict, itemFitsRoom, obstacles, rectanglesOverlap } from '../navigation/collision';
import { airConditionerObstacle } from '../architecture/airConditionerLayout';

// Revision 8 restores both workstations on a floating desk; architecture stays as saved.
export const STORAGE_KEY = 'roomwork.office.v8';
export const CORRECTION_PREVIOUS_STORAGE_KEY = 'roomwork.office.v7';
export const WORKSTATION_PREVIOUS_STORAGE_KEY = 'roomwork.office.v6';
export const AC_PREVIOUS_STORAGE_KEY = 'roomwork.office.v5';
export const PREVIOUS_STORAGE_KEY = 'roomwork.office.v4';
export const LEGACY_STORAGE_KEY = 'roomwork.office.v1';
const WALLS = ['north', 'south', 'east', 'west'];
const finite = (n: unknown, min: number, max: number): n is number => typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max;
const fail = (message: string): never => { throw new Error(message); };

/** Validate before touching the scene or local storage, including cyclic parent graphs. */
export function validateConfig(input: unknown): PlannerConfig {
  if (!input || typeof input !== 'object') fail('Expected a Roomwork layout object.');
  let config = structuredClone(input) as PlannerConfig;
  // Explicitly imported v1 files retain their original arrangement and straight desk.
  if ((config.version as number) === 1 && config.room) {
    const defaults = freshConfig();
    config = { ...config, version: 2, room: { ...config.room, wallFinishes: defaults.room.wallFinishes, baseboardLED: defaults.room.baseboardLED } };
  }
  const room = config.room;
  if (config.version !== 2 || !room || !Array.isArray(config.furniture)) fail('This is not a supported Roomwork layout.');
  if (!finite(room.length, 1, 30) || !finite(room.width, 1, 30) || !finite(room.height, 1.9, 8) || !finite(room.wallThickness, .05, .6)) fail('Room dimensions are outside the supported range.');
  if (typeof room.heightConfirmed !== 'boolean' || !Array.isArray(room.openings) || !Array.isArray(room.beams) || !Array.isArray(room.cornerFeatures)) fail('Architecture configuration is incomplete.');
  const led = room.baseboardLED;
  if (!led || typeof led.enabled !== 'boolean' || !/^#[0-9a-f]{6}$/i.test(led.color) || !finite(led.intensity, 0, 1) || !finite(led.glow, 0, 1)) fail('LED settings need a hex color and intensity/glow between 0 and 1.');
  for (const wall of WALLS) {
    const finish = room.wallFinishes?.[wall as keyof typeof room.wallFinishes];
    if (!finish || !/^#[0-9a-f]{6}$/i.test(finish.color) || !['plaster','plain'].includes(finish.texture) || !finite(finish.sheen, 0, 1)) fail('Each wall needs a valid neutral finish configuration.');
  }
  if (room.openings.length !== 2 || room.openings.filter(o => o.kind === 'window').length !== 1 || room.openings.filter(o => o.kind === 'door').length !== 1) fail('The office must have one window and one door.');
  const ids = new Set<string>();
  const id = (value: unknown) => {
    if (typeof value !== 'string' || !/^[a-z][a-z0-9-]{0,59}$/.test(value) || ids.has(value)) fail('Every object needs a unique, simple identifier.');
    ids.add(value as string);
  };
  for (const o of room.openings) {
    id(o.id);
    if (!WALLS.includes(o.wall) || typeof o.confirmed !== 'boolean' || !finite(o.width, .3, 10) || !finite(o.height, .3, room.height) || !finite(o.offset, -15, 15) || !finite(o.sill, 0, room.height)) fail('An opening has invalid dimensions.');
    const span = o.wall === 'north' || o.wall === 'south' ? room.length : room.width;
    if (Math.abs(o.offset) + o.width / 2 > span / 2 || o.height + o.sill > room.height || (o.kind === 'door' && o.sill !== 0)) fail('An opening extends outside its wall. Door sill must be zero.');
    const d = o.windowDetail;
    if (d && (o.kind !== 'window' || !/^#[0-9a-f]{6}$/i.test(d.frameColor) || !finite(d.frameWidth, .015, Math.min(o.width / 4, o.height / 4)) || !finite(d.frameDepth, .02, .3) || !finite(d.housingHeight, .08, o.height / 2) || !finite(d.slatPitch, .015, .1) || typeof d.shutterClosed !== 'boolean' || d.housingHeight < d.frameWidth + .01 || o.height - d.housingHeight - 2.54 * d.frameWidth < .05)) fail('Window frame, housing, or shutter measurements are invalid.');
  }
  const [a, b] = room.openings;
  if (a.wall === b.wall && Math.abs(a.offset - b.offset) < (a.width + b.width) / 2 && Math.max(a.sill, b.sill) < Math.min(a.sill + a.height, b.sill + b.height)) fail('Door and window openings overlap.');
  if (room.beams.length > 12 || room.cornerFeatures.length > 4) fail('Too many architectural features.');
  for (const beam of room.beams) {
    id(beam.id);
    if (!WALLS.includes(beam.wall) || typeof beam.enabled !== 'boolean' || !finite(beam.offset, -15, 15) || !finite(beam.length, .1, 30) || !finite(beam.projection, .01, 2) || !finite(beam.drop, .01, room.height)) fail('A beam has invalid dimensions.');
    const span = beam.wall === 'north' || beam.wall === 'south' ? room.length : room.width;
    const perpendicular = beam.wall === 'north' || beam.wall === 'south' ? room.width : room.length;
    if (beam.enabled && (Math.abs(beam.offset) + beam.length / 2 > span / 2 || beam.projection > perpendicular)) fail('An enabled beam extends outside the room.');
    if (beam.enabled && room.openings.some(o => o.wall === beam.wall && Math.abs(o.offset - beam.offset) < (o.width + beam.length) / 2 && o.sill + o.height > room.height - beam.drop + .0001)) fail('An opening intersects a soffit. Adjust its sill/height or the soffit drop.');
  }
  for (const f of room.cornerFeatures) {
    id(f.id);
    if (!['north-west','north-east','south-west','south-east'].includes(f.corner) || typeof f.enabled !== 'boolean' || !finite(f.width, .01, room.length) || !finite(f.depth, .01, room.width) || !finite(f.height, .01, 8) || (f.enabled && f.height > room.height)) fail('A corner feature has invalid dimensions.');
  }
  const ac=room.airConditioner;
  if(ac!==undefined) {
    if(!ac || typeof ac.enabled!=='boolean' || !WALLS.includes(ac.wall) || !finite(ac.offset,-15,15) || !finite(ac.bottom,0,8)
      || !finite(ac.width,.3,1.5) || !finite(ac.height,.3,1) || !finite(ac.depth,.3,1.2) || !finite(ac.interiorProjection,.06,.35)
      || !finite(ac.trimWidth,.01,.06) || !/^#[0-9a-f]{6}$/i.test(ac.color) || !finite(ac.louverYaw,-30,30)) fail('Air conditioner dimensions, finish, or outlet angle are invalid.');
    id('wall-ac');
    if(ac.enabled) {
      const span=ac.wall==='north' || ac.wall==='south'?room.length:room.width;
      if(Math.abs(ac.offset)+ac.width/2+ac.trimWidth>span/2 || ac.bottom<ac.trimWidth || ac.bottom+ac.height+ac.trimWidth>room.height) fail('The air conditioner and its trim must fit within the wall.');
      if(ac.depth-ac.interiorProjection-room.wallThickness<.08) fail('The through-wall air conditioner needs a rear casing extending outside the wall. Increase total depth or reduce interior projection.');
      if(room.openings.some(o=>o.wall===ac.wall && Math.abs(o.offset-ac.offset)<(o.width+ac.width)/2+ac.trimWidth+.04
        && o.sill+o.height>ac.bottom-ac.trimWidth && o.sill<ac.bottom+ac.height+ac.trimWidth)) fail('Keep the air conditioner and trim clear of the existing window and door.');
    }
  }
  if (config.furniture.length > 100) fail('Layouts support up to 100 furniture objects.');
  for (const item of config.furniture) {
    id(item.id);
    if (typeof item.name !== 'string' || !item.name.trim() || item.name.length > 100 || !['desk','chair','pc','monitor','storage','divider','work-zone','laptop'].includes(item.kind) || typeof item.visible !== 'boolean' || !/^#[0-9a-f]{6}$/i.test(item.color)) fail('A furniture object is invalid.');
    if (!item.dimensions || !Object.values(item.dimensions).every(n => finite(n, .05, 10)) || !['width','height','depth'].every(k => k in item.dimensions)) fail('Furniture dimensions must be between 0.05 and 10 meters.');
    if (!item.position || !['x','y','z'].every(k => finite(item.position[k as keyof typeof item.position], -30, 30)) || !finite(item.rotation, -36000, 36000)) fail('A furniture transform is invalid.');
    if (item.parentId !== undefined && (typeof item.parentId !== 'string' || !config.furniture.some(f => f.id === item.parentId))) fail('A furniture parent does not exist.');
    if (item.onDesktop !== undefined && (typeof item.onDesktop !== 'boolean' || config.furniture.find(f=>f.id===item.parentId)?.kind!=='desk')) fail('A desktop attachment needs a desk parent.');
    if (item.cornerDesk && (item.kind !== 'desk' || !finite(item.cornerDesk.worktopDepth, .3, Math.min(item.dimensions.width, item.dimensions.depth) - .15))) fail('Main surface depth must leave at least 15 cm for the short returns.');
    if(item.cornerDesk?.mainRun!==undefined && !['width','depth'].includes(item.cornerDesk.mainRun)) fail('The desk main run must be width or depth.');
    if(item.cornerDesk?.shape!==undefined && !['l','rect-c'].includes(item.cornerDesk.shape)) fail('Unknown desk profile.');
    if(item.cornerDesk?.floating!==undefined && typeof item.cornerDesk.floating!=='boolean') fail('Desk support must be floating or floor-supported.');
    if(item.cornerDesk?.shape==='rect-c' && !finite(item.cornerDesk.returnWidth,.3,(item.dimensions.depth-.7)/2)) fail('Return widths must leave at least 70 cm of open chair bay.');
    const notch=item.cornerDesk?.cornerNotch;
    if(notch && (!finite(notch.width,.01,item.cornerDesk!.worktopDepth-.1) || !finite(notch.depth,.01,item.cornerDesk!.worktopDepth-.1))) fail('The corner cutout must leave at least 10 cm of worktop on both sides.');
    if (item.kind==='work-zone' || item.workZone) {
      const s=item.workZone;
      if (item.kind!=='work-zone' || !item.onDesktop || !s || !finite(s.surfaceOffset,.025,.1) || !finite(s.columnHeight,.15,.8) || !finite(s.armReach,.15,1) || item.dimensions.depth<.2 || item.dimensions.width<.15 || item.dimensions.height<s.surfaceOffset+s.columnHeight+.03) fail('The work zone needs a valid desktop clamp, column, and arm reach.');
      if (config.furniture.filter(f=>f.parentId===item.id && f.kind==='monitor').length>2) fail('The shared dual arm supports at most two monitors.');
    }
    if (item.kind==='laptop' || item.laptop) {
      if (item.kind!=='laptop' || !item.laptop || !finite(item.laptop.openingAngle,85,120) || item.dimensions.width<.2 || item.dimensions.depth<.15 || item.dimensions.height<.12) fail('The laptop needs a supported envelope and opening angle between 85 and 120 degrees.');
    }
    if (item.monitor) {
      const m = item.monitor;
      if (item.kind !== 'monitor' || typeof m.brand !== 'string' || m.brand.length > 60 || !finite(m.diagonalInches, 10, 60) || !['landscape','portrait'].includes(m.orientation) || !['arm','stand','wall','shared-arm'].includes(m.mount) || !finite(m.bezel, .001, .04)) fail('Monitor specifications are invalid.');
      const p = monitorPanel(item);
      const externalArm=m.mount==='wall' || m.mount==='shared-arm';
      if (item.dimensions.width < p.width + 2*m.bezel || item.dimensions.height < p.height + 2*m.bezel + (externalArm ? 0 : .08) || item.dimensions.depth < (externalArm ? .05 : .16)) fail('The monitor envelope must fit its screen diagonal, bezel, and mount.');
      if (m.mount==='shared-arm' && config.furniture.find(f=>f.id===item.parentId)?.kind!=='work-zone') fail('A shared-arm screen must belong to the dual-arm work zone.');
      if (m.mount === 'wall') {
        const anchor = m.wallMount;
        if (item.parentId || !anchor || !WALLS.includes(anchor.wall) || !finite(anchor.offset, -15, 15) || !finite(anchor.height, .08, room.height - .08) || !finite(anchor.maxReach, .1, 1.5)) fail('A wall-mounted monitor needs an independent, valid wall anchor.');
        const alongX = anchor!.wall === 'north' || anchor!.wall === 'south';
        if (Math.abs(anchor!.offset) + .05 > (alongX ? room.length : room.width) / 2 || room.openings.some(o => o.wall === anchor!.wall && Math.abs(o.offset - anchor!.offset) < o.width / 2 + .05 && anchor!.height + .08 > o.sill && anchor!.height - .08 < o.sill + o.height)) fail('The monitor wall plate must attach to solid wall, clear of openings.');
        const arm = monitorMountGeometry(item, room);
        if (arm.reach > anchor!.maxReach + .0001) fail(`${item.name} exceeds its wall arm reach. Move it closer or increase the configured reach.`);
        const behind = arm.anchor.subtract(arm.target), angle = item.rotation * Math.PI / 180;
        if (behind.x * Math.sin(angle) + behind.z * Math.cos(angle) < .02) fail(`${item.name} must face away from its wall attachment.`);
        const supports = wallMountFootprints(item,room);
        const solids = obstacles({ version: 2, room, furniture: [] });
        if (solids.some(s => supports.some(p => rectanglesOverlap(s,p)))) fail(`${item.name}'s wall arm intersects a corner step or soffit.`);
      }
    }
  }
  for (const item of config.furniture) {
    const visited = new Set<string>(); let current: typeof item | undefined = item;
    while (current) { if (visited.has(current.id)) fail('Furniture cannot have cyclic parents.'); visited.add(current.id); current = config.furniture.find(f => f.id === current!.parentId); }
  }
  for (const item of config.furniture) {
    if (!itemFitsRoom(item,config)) fail(`${item.name} would extend outside the room. Adjust its position or dimensions first.`);
    if (architectureConflict(item,config)) fail(`${item.name} would intersect the corner step or soffit. Adjust its position or dimensions first.`);
    if (item.workZone) { const issue=workZonePlacementIssue(item,config); if(issue) fail(issue); }
    const desktopIssue=desktopItemPlacementIssue(item,config);if(desktopIssue) fail(desktopIssue);
  }
  const acSolid=airConditionerObstacle(room,true);
  if(acSolid && obstacles(config).some(o=>o.id!=='wall-ac' && rectanglesOverlap(acSolid,o))) fail('The air conditioner or its trim intersects existing furniture, a soffit, or a corner step. Adjust the AC placement.');
  // Return a detached plain-data copy, never the caller's mutable object.
  return structuredClone(config);
}

export function loadConfig(): { config: PlannerConfig; warning?: string } {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const input=JSON.parse(saved);
      // A live dev browser may have saved the interrupted curved prototype.
      // Correct its furniture without falling back to default room measurements.
      if (input?.furniture?.some((item: { cornerDesk?: { shape?: string } })=>item.cornerDesk?.shape==='soft-c')) {
        const config=rebalanceWorkstation(input);
        localStorage.setItem(`${STORAGE_KEY}.prototype-backup`,saved);
        saveConfig(config);
        return {config,warning:'Squared desk correction loaded. Your room settings and previous layout are preserved.'};
      }
      return { config: validateConfig(input) };
    }
    const previousWorkstation=localStorage.getItem(CORRECTION_PREVIOUS_STORAGE_KEY) ?? localStorage.getItem(WORKSTATION_PREVIOUS_STORAGE_KEY);
    if(previousWorkstation) {
      const original=validateConfig(JSON.parse(previousWorkstation));
      try {
        const config=rebalanceWorkstation(original),persisted=saveConfig(config);
        return {config,warning:persisted?'Both workstations restored on the floating wraparound desk. Your room is unchanged; the previous layout is backed up.':'Rebalanced desk loaded. Export to save; browser storage is unavailable.'};
      } catch {
        return {config:original,warning:'The revised desk does not fit your custom measurements. Your existing scene was kept unchanged.'};
      }
    }
    const previousAC=localStorage.getItem(AC_PREVIOUS_STORAGE_KEY);
    if(previousAC) {
      const original=validateConfig(JSON.parse(previousAC));
      try {
        const config=rebalanceWorkstation(upgradeAirConditionerLayout(original)),persisted=saveConfig(config);
        return {config,warning:persisted ? 'AC added and workstation rebalanced. Existing room architecture is preserved; the previous scene remains backed up.' : 'Updated scene loaded. Export to save; browser storage is unavailable.'};
      } catch {
        return {config:original,warning:'The updated workstation or AC does not fit the saved arrangement. Your existing scene was kept unchanged.'};
      }
    }
    const previous=localStorage.getItem(PREVIOUS_STORAGE_KEY);
    if (previous) {
      const original=validateConfig(JSON.parse(previous));
      try {
        const config=rebalanceWorkstation(upgradeAirConditionerLayout(upgradeWorkLayout(original))), persisted=saveConfig(config);
        return {config,warning:persisted ? 'Workstation rebalanced with a shorter window return. Existing room architecture is preserved; the previous layout is backed up.' : 'Updated desk loaded. Export to save; browser storage is unavailable.'};
      } catch {
        return {config:original,warning:'The larger setup does not fit your saved furniture arrangement. Your room and existing layout were kept; adjust the desk before adding the work zone.'};
      }
    }
    for (const key of ['roomwork.office.v3', 'roomwork.office.v2', LEGACY_STORAGE_KEY]) {
      const previous = localStorage.getItem(key);
      if (!previous) continue;
      const config = rebalanceWorkstation(upgradeAirConditionerLayout(upgradeSavedLayout(JSON.parse(previous)))), persisted = saveConfig(config);
      return { config, warning: persisted ? 'Photo-based room correction loaded. Your previous layout remains backed up on this device.' : 'Updated layout loaded. Export it to save; browser storage is unavailable.' };
    }
    return { config: freshConfig() };
  } catch { return { config: freshConfig(), warning: 'The saved layout could not be loaded. Starting with the original layout.' }; }
}

/** Furniture-only correction: preserve architecture, finishes and unrelated objects. */
export function rebalanceWorkstation(input: unknown): PlannerConfig {
  const config=structuredClone(input) as PlannerConfig,defaults=freshConfig();
  if(!config || config.version!==2 || !config.room || !Array.isArray(config.furniture)) fail('Expected a Roomwork layout object.');
  const dx=-(config.room.length-defaults.room.length)/2,dz=-(config.room.width-defaults.room.width)/2;
  const replacements=new Map(defaults.furniture.map(item=>[item.id,item]));
  config.furniture=config.furniture.map(current=>{
    const replacement=replacements.get(current.id);
    if(!replacement || replacement.kind!==current.kind) return current;
    const next={...structuredClone(replacement),color:current.color};
    next.visible=true;
    if(!next.parentId) { next.position.x+=dx;next.position.z+=dz; }
    if(next.monitor?.wallMount) next.monitor.wallMount.offset += ['north','south'].includes(next.monitor.wallMount.wall) ? dx : dz;
    return next;
  });
  // Restore every explicitly requested workstation element, including a previously removed pair.
  for (const item of defaults.furniture) {
    if (config.furniture.some(f=>f.id===item.id)) continue;
    const next=structuredClone(item);
    if (!next.parentId) { next.position.x+=dx; next.position.z+=dz; }
    if(next.monitor?.wallMount) next.monitor.wallMount.offset += ['north','south'].includes(next.monitor.wallMount.wall) ? dx : dz;
    config.furniture.push(next);
  }
  return validateConfig(config);
}

/** Add only the new fixture. Explicit imports remain untouched by this browser-save upgrade. */
export function upgradeAirConditionerLayout(input: unknown): PlannerConfig {
  const config=validateConfig(input);
  if(config.room.airConditioner!==undefined) return config;
  const window=config.room.openings.find(o=>o.kind==='window')!,ac=structuredClone(freshConfig().room.airConditioner!);
  ac.wall=window.wall;
  const right={north:1,south:-1,east:-1,west:1}[window.wall];
  ac.offset=+(window.offset+right*(window.width/2+.195+ac.width/2)).toFixed(6);
  const underside=Math.min(config.room.height,...config.room.beams.filter(b=>b.enabled && b.wall===ac.wall && Math.abs(b.offset-ac.offset)<(b.length+ac.width)/2).map(b=>config.room.height-b.drop));
  ac.bottom=+(underside-.21-ac.height).toFixed(6);
  config.room.airConditioner=ac;
  return validateConfig(config);
}

/** Enlarge the desk, preserving the approved room and the personal workstation verbatim. */
export function upgradeWorkLayout(input: unknown): PlannerConfig {
  const config=validateConfig(input), desk=config.furniture.find(f=>f.kind==='desk' && f.cornerDesk);
  if (!desk?.cornerDesk) fail('The larger work setup requires the corner desk.');
  resizeCornerDesk(config,desk!,2.4,1.9);
  if (!config.furniture.some(f=>f.kind==='work-zone')) config.furniture.push(...createWorkZone(desk!));
  return validateConfig(config);
}

/** Automatic one-time correction. Preserve the room survey, finishes, door and unrelated objects. */
export function upgradeSavedLayout(input: unknown): PlannerConfig {
  const old = validateConfig(input), next = freshConfig();
  const window = next.room.openings.find(o => o.kind === 'window')!, beams = next.room.beams, corners = next.room.cornerFeatures;
  const dx = -(old.room.length - next.room.length) / 2, dz = -(old.room.width - next.room.width) / 2;
  next.room = { ...old.room, openings: [window, old.room.openings.find(o => o.kind === 'door')!], beams, cornerFeatures: corners };
  window.offset = Math.min(.7, Math.max(0, next.room.length / 2 - window.width / 2 - .05));
  window.sill = +(next.room.height - beams[0].drop - .02 - window.height).toFixed(4);
  beams[0].length = next.room.length; beams[1].length = next.room.width;
  corners[0].height = next.room.height - beams[0].drop;
  for (const item of next.furniture) {
    if (item.parentId) continue;
    item.position.x += dx; item.position.z += dz;
    const mount = item.monitor?.wallMount;
    if (mount) mount.offset += mount.wall === 'south' || mount.wall === 'north' ? dx : dz;
  }
  const replaced = new Set(next.furniture.map(f => f.id));
  next.furniture.push(...old.furniture.filter(f => !replaced.has(f.id)));
  return validateConfig(removeRetiredFurniture(next));
}

/** Remove the two retired objects and anything attached to them, preserving other edits. */
export function removeRetiredFurniture(config: PlannerConfig): PlannerConfig {
  const next = structuredClone(config), removed = new Set(['divider', 'storage']);
  let changed = true;
  while (changed) {
    changed = false;
    for (const item of next.furniture) {
      if (item.parentId && removed.has(item.parentId) && !removed.has(item.id)) { removed.add(item.id); changed = true; }
    }
  }
  next.furniture = next.furniture.filter(item => !removed.has(item.id));
  return next;
}

export function saveConfig(config: PlannerConfig): boolean {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(config)); return true; } catch { return false; }
}

export class History {
  private past: string[] = [];
  private future: string[] = [];
  push(config: PlannerConfig) { this.past.push(JSON.stringify(config)); if (this.past.length > 60) this.past.shift(); this.future = []; }
  undo(current: PlannerConfig): PlannerConfig | null {
    const previous = this.past.pop(); if (!previous) return null;
    this.future.push(JSON.stringify(current)); return JSON.parse(previous);
  }
  redo(current: PlannerConfig): PlannerConfig | null {
    const next = this.future.pop(); if (!next) return null;
    this.past.push(JSON.stringify(current)); return JSON.parse(next);
  }
  get canUndo() { return this.past.length > 0; }
  get canRedo() { return this.future.length > 0; }
}
