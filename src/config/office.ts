import type { PlannerConfig } from './types';

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
    { id: 'desk', name: 'L-shaped corner desk', kind: 'desk', dimensions: { width: 1.5, height: 0.76, depth: 1.8 }, cornerDesk: { worktopDepth: .72 }, position: { x: -1.02, y: 0, z: -.17 }, rotation: 0, color: '#bf9b72', visible: true },
    { id: 'chair', name: 'Ergonomic chair', kind: 'chair', dimensions: { width: .64, height: 1.15, depth: .64 }, position: { x: -.55, y: 0, z: .18 }, rotation: -135, color: '#535c52', visible: true },
    { id: 'pc', name: 'Desktop PC', kind: 'pc', parentId: 'desk', dimensions: { width: .22, height: .45, depth: .42 }, position: { x: -.55, y: 0, z: .56 }, rotation: -90, color: '#383e3d', visible: true },
    // Independent wall attachments. Positions are WORLD bottom-centers; dimensions enclose
    // the panel/case only. Arms reach from fixed wall anchors to each VESA plate.
    // Generic Samsung 27-inch 16:9 panels; no exact product/casing/arm model is asserted.
    { id: 'monitor-left', name: 'Samsung 27 · left', kind: 'monitor', dimensions: { width: .611, height: .35, depth: .05 }, monitor: { brand: 'Samsung', diagonalInches: 27, orientation: 'landscape', mount: 'wall', bezel: .006, wallMount: { wall: 'south', offset: -.71, height: 1.295, maxReach: .65 } }, position: { x: -.71, y: 1.12, z: -.982 }, rotation: -170, color: '#343c3b', visible: true },
    { id: 'monitor-center', name: 'Samsung 27 · center', kind: 'monitor', dimensions: { width: .611, height: .35, depth: .05 }, monitor: { brand: 'Samsung', diagonalInches: 27, orientation: 'landscape', mount: 'wall', bezel: .006, wallMount: { wall: 'south', offset: -1.24, height: 1.295, maxReach: .8 } }, position: { x: -1.24, y: 1.12, z: -.7 }, rotation: -135, color: '#343c3b', visible: true },
    { id: 'monitor-right', name: 'Samsung 27 · right', kind: 'monitor', dimensions: { width: .611, height: .35, depth: .05 }, monitor: { brand: 'Samsung', diagonalInches: 27, orientation: 'landscape', mount: 'wall', bezel: .006, wallMount: { wall: 'west', offset: -.17, height: 1.295, maxReach: .65 } }, position: { x: -1.522, y: 1.12, z: -.17 }, rotation: -100, color: '#343c3b', visible: true },
    { id: 'monitor-portrait', name: 'Samsung 27 · portrait', kind: 'monitor', dimensions: { width: .35, height: .611, depth: .05 }, monitor: { brand: 'Samsung', diagonalInches: 27, orientation: 'portrait', mount: 'wall', bezel: .006, wallMount: { wall: 'west', offset: .331, height: 1.295, maxReach: .65 } }, position: { x: -1.525, y: .9895, z: .331 }, rotation: -75, color: '#343c3b', visible: true },
  ],
};

export const freshConfig = (): PlannerConfig => structuredClone(OFFICE_CONFIG);
