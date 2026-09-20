import type { FurnitureConfig, PlannerConfig } from './types';

const DEFAULT_DESK: FurnitureConfig = { id: 'desk', name: 'Floating wraparound desk', kind: 'desk', dimensions: { width: 1.30, height: .76, depth: 2.50 }, cornerDesk: { worktopDepth: .72, mainRun: 'depth', shape: 'rect-c', returnWidth: .62, floating: true, cornerNotch: { width: .23, depth: .19 } }, position: { x: -1.21, y: 0, z: -.01 }, rotation: 0, color: '#bf9b72', visible: true };

/** Removable provisional work station. Children use coordinates relative to the common arm.
 * Both displays share ONE desktop clamp/column. The laptop is an independent desk child.
 */
const WORK_ZONE_CONFIG: FurnitureConfig[] = [
  { id: 'work-zone', name: 'Work zone · dual monitor arm', kind: 'work-zone', parentId: 'desk', onDesktop: true, dimensions: { width: 1.18, height: .76, depth: .74 }, position: { x: .41, y: .72, z: .91 }, rotation: 0, color: '#383e3d', visible: true, workZone: { surfaceOffset: .04, columnHeight: .46, armReach: .65 } },
  { id: 'work-monitor-left', name: 'Work · Samsung 27 · left', kind: 'monitor', parentId: 'work-zone', dimensions: { width: .611, height: .35, depth: .05 }, position: { x: .29, y: .36, z: .05 }, rotation: 30, color: '#343c3b', visible: true, monitor: { brand: 'Samsung', diagonalInches: 27, orientation: 'landscape', mount: 'shared-arm', bezel: .006 } },
  { id: 'work-monitor-right', name: 'Work · Samsung 27 · right', kind: 'monitor', parentId: 'work-zone', dimensions: { width: .611, height: .35, depth: .05 }, position: { x: -.29, y: .36, z: .05 }, rotation: -30, color: '#343c3b', visible: true, monitor: { brand: 'Samsung', diagonalInches: 27, orientation: 'landscape', mount: 'shared-arm', bezel: .006 } },
];

export function createWorkZone(desk: FurnitureConfig): FurnitureConfig[] {
  const items = structuredClone(WORK_ZONE_CONFIG);
  items[0].parentId = desk.id;
  items[0].position = { x: desk.dimensions.width / 2 - .24, y: desk.dimensions.height - .04, z: desk.dimensions.depth / 2 - .34 };
  return items;
}

/** Meters, degrees, and bottom-center origins. X = length, Z = width, Y = up.
 * North = +Z. Corrected window: SOUTH long wall, toward EAST door side.
 * Photos show soffits on SOUTH and WEST, and a vertical step at their SOUTHWEST corner.
 * Feature profiles and opening measurements are provisional, not measured from pixels.
 * No decorative wall treatment is finalized; each wall has an independent finish.
 */
export const OFFICE_CONFIG: PlannerConfig = {
  version: 2,
  room: {
    length: 3.8, width: 2.6, height: 2.65, heightConfirmed: false, wallThickness: 0.12,
    wallFinishes: {
      north: { color: '#eeeae0', texture: 'plaster', sheen: .06 },
      south: { color: '#eeeae0', texture: 'plaster', sheen: .06 },
      east: { color: '#eeeae0', texture: 'plaster', sheen: .06 },
      west: { color: '#eeeae0', texture: 'plaster', sheen: .06 },
    },
    baseboardLED: { enabled: true, color: '#ff3030', intensity: .18, glow: .3 },
    // Classic through-wall box: to the right when facing the window from inside.
    // 18 cm indoors + 12 cm wall + 30 cm outdoors; top is 21 cm below the soffit.
    airConditioner: { enabled: true, wall: 'south', offset: -.30, bottom: 1.85, width: .66, height: .43, depth: .60, interiorProjection: .18, trimWidth: .025, color: '#d8d5c8', louverYaw: 15 },
    openings: [
      { id: 'window', kind: 'window', wall: 'south', offset: .7, width: .95, height: 1.35, sill: 1.12, confirmed: false,
        windowDetail: { frameColor: '#4c4636', frameWidth: .055, frameDepth: .10, housingHeight: .24, slatPitch: .035, shutterClosed: true } },
      { id: 'door', kind: 'door', wall: 'east', offset: -0.66, width: 0.82, height: 2.05, sill: 0, confirmed: false },
    ],
    // Two photographed runs, never a perimeter soffit. 40 cm projection is NOT a 40 cm drop.
    beams: [
      { id: 'window-soffit', enabled: true, wall: 'south', offset: 0, length: 3.8, projection: .4, drop: .16 },
      { id: 'opposite-door-soffit', enabled: true, wall: 'west', offset: 0, length: 2.6, projection: .4, drop: .16 },
    ],
    cornerFeatures: [{ id: 'corner-step', enabled: true, corner: 'south-west', width: .24, depth: .2, height: 2.49 }],
  },
  furniture: [
    DEFAULT_DESK,
    { id: 'chair', name: 'Ergonomic chair', kind: 'chair', dimensions: { width: .64, height: 1.15, depth: .64 }, position: { x: -.62, y: 0, z: -.1 }, rotation: -90, color: '#535c52', visible: true },
    { id: 'pc', name: 'Desktop PC', kind: 'pc', parentId: 'desk', dimensions: { width: .22, height: .45, depth: .42 }, position: { x: -.37, y: 0, z: .66 }, rotation: -90, color: '#383e3d', visible: true },
    // Independent wall attachments. Positions are WORLD bottom-centers; dimensions enclose
    // the panel/case only. Arms reach from fixed wall anchors to each VESA plate.
    // In the comparison view: portrait at the AC end, then three landscape screens.
    // Generic Samsung 27-inch 16:9 panels; no exact product/casing/arm model is asserted.
    { id: 'monitor-left', name: 'Samsung 27 · left', kind: 'monitor', dimensions: { width: .611, height: .35, depth: .05 }, monitor: { brand: 'Samsung', diagonalInches: 27, orientation: 'landscape', mount: 'wall', bezel: .006, wallMount: { wall: 'south', offset: -1.1134, height: 1.295, maxReach: .65 } }, position: { x: -1.1134, y: 1.12, z: -1.0078 }, rotation: -145, color: '#343c3b', visible: true },
    { id: 'monitor-center', name: 'Samsung 27 · center', kind: 'monitor', dimensions: { width: .611, height: .35, depth: .05 }, monitor: { brand: 'Samsung', diagonalInches: 27, orientation: 'landscape', mount: 'wall', bezel: .006, wallMount: { wall: 'west', offset: -0.5137, height: 1.295, maxReach: .65 } }, position: { x: -1.4926, y: 1.12, z: -0.5137 }, rotation: -110, color: '#343c3b', visible: true },
    { id: 'monitor-right', name: 'Samsung 27 · right', kind: 'monitor', dimensions: { width: .611, height: .35, depth: .05 }, monitor: { brand: 'Samsung', diagonalInches: 27, orientation: 'landscape', mount: 'wall', bezel: .006, wallMount: { wall: 'west', offset: 0.1085, height: 1.295, maxReach: .65 } }, position: { x: -1.6198, y: 1.12, z: 0.1085 }, rotation: -75, color: '#343c3b', visible: true },
    { id: 'monitor-portrait', name: 'Samsung 27 · portrait', kind: 'monitor', dimensions: { width: .35, height: .611, depth: .05 }, monitor: { brand: 'Samsung', diagonalInches: 27, orientation: 'portrait', mount: 'wall', bezel: .006, wallMount: { wall: 'south', offset: -0.65, height: 1.295, maxReach: .65 } }, position: { x: -0.65, y: .9895, z: -1.195 }, rotation: 180, color: '#343c3b', visible: true },
    { id: 'work-laptop', name: 'Work zone · laptop', kind: 'laptop', parentId: 'desk', onDesktop: true, dimensions: { width: .36, height: .25, depth: .30 }, position: { x: .41, y: .76, z: .81 }, rotation: 0, color: '#697175', visible: true, laptop: { openingAngle: 105 } },
    ...createWorkZone(DEFAULT_DESK),
  ],
};

export const freshConfig = (): PlannerConfig => structuredClone(OFFICE_CONFIG);
