import type { PlannerConfig } from './types';

/** Meters, degrees, and bottom-center origins. X = length, Z = width, Y = up.
 * North = +Z. Corrected window: SOUTH long wall, toward EAST door side.
 * Left corner interpreted as SOUTHWEST in plan view. All offsets are provisional.
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
      { id: 'window', kind: 'window', wall: 'south', offset: 0.8, width: 1.3, height: 1.1, sill: 1.05, confirmed: false },
      { id: 'door', kind: 'door', wall: 'east', offset: -0.66, width: 0.82, height: 2.05, sill: 0, confirmed: false },
    ],
    beams: [{ id: 'ceiling-beam', enabled: false, wall: 'north', offset: 0, length: 3.8, projection: 0.4, drop: 0.4 }],
    cornerFeatures: [{ id: 'corner-feature', enabled: false, corner: 'north-west', width: 0.2, depth: 0.2, height: 2.65 }],
  },
  furniture: [
    { id: 'desk', name: 'L-shaped corner desk', kind: 'desk', dimensions: { width: 1.5, height: 0.76, depth: 1.8 }, cornerDesk: { worktopDepth: .72 }, position: { x: -1.1, y: 0, z: -.3 }, rotation: 0, color: '#bf9b72', visible: true },
    { id: 'chair', name: 'Ergonomic chair', kind: 'chair', dimensions: { width: .64, height: 1.15, depth: .64 }, position: { x: -.57, y: 0, z: .08 }, rotation: -90, color: '#535c52', visible: true },
    { id: 'pc', name: 'Desktop PC', kind: 'pc', parentId: 'desk', dimensions: { width: .22, height: .45, depth: .42 }, position: { x: -.55, y: 0, z: .56 }, rotation: -90, color: '#383e3d', visible: true },
    // Generic Samsung 27-inch 16:9 panels. Exact model/casing/arm dimensions are provisional.
    { id: 'monitor-left', name: 'Samsung 27 · left', kind: 'monitor', parentId: 'desk', dimensions: { width: .615, height: .56, depth: .24 }, monitor: { brand: 'Samsung', diagonalInches: 27, orientation: 'landscape', mount: 'arm', bezel: .006 }, position: { x: -.45, y: .76, z: -.62 }, rotation: -100, color: '#343c3b', visible: true },
    { id: 'monitor-center', name: 'Samsung 27 · center', kind: 'monitor', parentId: 'desk', dimensions: { width: .615, height: .56, depth: .24 }, monitor: { brand: 'Samsung', diagonalInches: 27, orientation: 'landscape', mount: 'arm', bezel: .006 }, position: { x: -.48, y: .76, z: 0 }, rotation: -90, color: '#343c3b', visible: true },
    { id: 'monitor-right', name: 'Samsung 27 · right', kind: 'monitor', parentId: 'desk', dimensions: { width: .615, height: .56, depth: .24 }, monitor: { brand: 'Samsung', diagonalInches: 27, orientation: 'landscape', mount: 'arm', bezel: .006 }, position: { x: -.45, y: .76, z: .62 }, rotation: -80, color: '#343c3b', visible: true },
    { id: 'monitor-portrait', name: 'Samsung 27 · portrait', kind: 'monitor', parentId: 'desk', dimensions: { width: .36, height: .80, depth: .24 }, monitor: { brand: 'Samsung', diagonalInches: 27, orientation: 'portrait', mount: 'arm', bezel: .006 }, position: { x: .48, y: .76, z: -.60 }, rotation: 180, color: '#343c3b', visible: true },
  ],
};

export const freshConfig = (): PlannerConfig => structuredClone(OFFICE_CONFIG);
