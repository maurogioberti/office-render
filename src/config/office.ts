import type { FurnitureConfig, PlannerConfig } from './types';

const DEFAULT_DESK: FurnitureConfig = { id: 'desk', name: 'Floating wraparound desk', kind: 'desk', dimensions: { width: 1.30, height: .76, depth: 2.50 }, cornerDesk: { worktopDepth: .72, mainRun: 'depth', shape: 'rect-c', returnWidth: .62, floating: true, cornerNotch: { width: .23, depth: .19 } }, position: { x: -1.21, y: 0, z: -.01 }, rotation: 0, color: '#bf9b72', visible: true };

/** Removable provisional work station. Children use coordinates relative to the common arm.
 * Both displays share ONE desktop clamp/column. The laptop is an independent desk child.
 */
const WORK_ZONE_CONFIG: FurnitureConfig[] = [
  { id: 'work-zone', name: 'Work zone · dual monitor arm', kind: 'work-zone', parentId: 'desk', onDesktop: true, dimensions: { width: 1.18, height: 0.76, depth: 0.74 }, position: { x: 0, y: 0.72, z: 0.91 }, rotation: 0, color: '#383e3d', visible: true, workZone: { surfaceOffset: .04, columnHeight: .46, armReach: .65 } },
  { id: 'work-monitor-left', name: 'Work · Samsung 27 · left', kind: 'monitor', parentId: 'work-zone', dimensions: { width: 0.612, height: 0.36, depth: 0.052 }, position: { x: -0.3185, y: 0.395, z: 0.245 }, rotation: 0, color: '#343c3b', visible: true, monitor: { brand: 'Samsung', diagonalInches: 27, orientation: 'landscape', mount: 'shared-arm', sourceId: 'work-laptop', bezel: .006 } },
  { id: 'work-monitor-right', name: 'Work · Samsung 27 · right', kind: 'monitor', parentId: 'work-zone', dimensions: { width: 0.612, height: 0.36, depth: 0.052 }, position: { x: 0.3185, y: 0.395, z: 0.245 }, rotation: 0, color: '#343c3b', visible: true, monitor: { brand: 'Samsung', diagonalInches: 27, orientation: 'landscape', mount: 'shared-arm', sourceId: 'work-laptop', bezel: .006 } },
];

export function createWorkZone(desk: FurnitureConfig): FurnitureConfig[] {
  const items = structuredClone(WORK_ZONE_CONFIG);
  items[0].parentId = desk.id;
  items[0].position = { x: desk.dimensions.width / 2 - .65, y: desk.dimensions.height - .04, z: desk.dimensions.depth / 2 - .34 };
  return items;
}

/** Lower screen tucked into the existing inside corner, below the fourth/fifth-screen seam. */
export function workLaptopPosition(desk: FurnitureConfig) {
  return { x: -desk.dimensions.width / 2 + .46, y: desk.dimensions.height, z: desk.dimensions.depth / 2 - .355 };
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
    { id: 'pc', name: 'Desktop PC', kind: 'pc', parentId: 'desk', dimensions: { width: 0.22, height: 0.45, depth: 0.42 }, position: { x: 0.29, y: 0, z: -0.93 }, rotation: 180, color: '#383e3d', visible: true },
    // Independent wall attachments. Positions are WORLD bottom-centers; dimensions enclose
    // the panel/case only. Arms reach from fixed wall anchors to each VESA plate.
    // In the comparison view: portrait at the AC end, then three landscape screens.
    // Samsung SR356 reference: 611.7 x 359.9 x 51.3 mm without stand.
    // Conservative rounded housings: 612 x 360 x 52 mm; exact owned model unconfirmed.
    { id: 'monitor-left', name: 'Samsung 27 · left', kind: 'monitor', dimensions: { width: 0.612, height: 0.36, depth: 0.052 }, monitor: { brand: 'Samsung', diagonalInches: 27, orientation: 'landscape', mount: 'wall', sourceId: 'pc', bezel: .006, wallMount: { wall: 'south', offset: -1.283809204, height: 1.295, maxReach: .65 } }, position: { x: -1.283809204, y: 1.115, z: -0.982457378 }, rotation: -145, color: '#343c3b', visible: true },
    { id: 'monitor-center', name: 'Samsung 27 · center', kind: 'monitor', dimensions: { width: 0.612, height: 0.36, depth: 0.052 }, monitor: { brand: 'Samsung', diagonalInches: 27, orientation: 'landscape', mount: 'wall', sourceId: 'pc', bezel: .006, wallMount: { wall: 'west', offset: -0.478603604, height: 1.295, maxReach: .65 } }, position: { x: -1.636611414, y: 1.115, z: -0.478603604 }, rotation: -105, color: '#343c3b', visible: true },
    { id: 'monitor-right', name: 'Samsung 27 · right', kind: 'monitor', dimensions: { width: 0.612, height: 0.36, depth: 0.052 }, monitor: { brand: 'Samsung', diagonalInches: 27, orientation: 'landscape', mount: 'wall', sourceId: 'pc', bezel: .006, wallMount: { wall: 'west', offset: 0.134147669, height: 1.295, maxReach: .65 } }, position: { x: -1.583002624, y: 1.115, z: 0.134147669 }, rotation: -65, color: '#343c3b', visible: true },
    { id: 'monitor-portrait', name: 'Samsung 27 · portrait', kind: 'monitor', dimensions: { width: 0.36, height: 0.612, depth: 0.052 }, monitor: { brand: 'Samsung', diagonalInches: 27, orientation: 'portrait', mount: 'wall', sourceId: 'pc', bezel: .006, wallMount: { wall: 'south', offset: -0.815, height: 1.295, maxReach: .65 } }, position: { x: -0.815, y: 0.989, z: -1.17 }, rotation: -180, color: '#343c3b', visible: true },
    { id: 'work-laptop', name: 'Work zone · laptop', kind: 'laptop', parentId: 'desk', onDesktop: true, dimensions: { width: 0.36, height: 0.25, depth: 0.3 }, position: workLaptopPosition(DEFAULT_DESK), rotation: -35, color: '#697175', visible: true, laptop: { openingAngle: 120, poweredOn: true } },
    ...createWorkZone(DEFAULT_DESK),
  ],
};

export const freshConfig = (): PlannerConfig => structuredClone(OFFICE_CONFIG);
