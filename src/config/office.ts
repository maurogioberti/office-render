import type { PlannerConfig } from './types';

/** All distances are METERS; rotations are DEGREES. One Babylon unit = one meter.
 * X = 3.80 m length, Z = 2.60 m width, Y = up. Origin = floor center.
 * North = +Z. Object positions are bottom-center, relative to parent when specified.
 * Footprint follows the supplied approximate measurements. Height and opening
 * sizes/offsets are provisional. Door = east short wall, window = north long wall:
 * the window is on the right when entering through the door, as confirmed.
 * Beam and corner feature are deliberately OFF until their locations are known.
 */
export const OFFICE_CONFIG: PlannerConfig = {
  version: 1,
  room: {
    length: 3.8, width: 2.6, height: 2.65, heightConfirmed: false, wallThickness: 0.12,
    openings: [
      { id: 'window', kind: 'window', wall: 'north', offset: -0.55, width: 1.3, height: 1.1, sill: 1.05, confirmed: false },
      { id: 'door', kind: 'door', wall: 'east', offset: -0.66, width: 0.82, height: 2.05, sill: 0, confirmed: false },
    ],
    beams: [{ id: 'ceiling-beam', enabled: false, wall: 'north', offset: 0, length: 3.8, projection: 0.4, drop: 0.4 }],
    cornerFeatures: [{ id: 'corner-feature', enabled: false, corner: 'north-west', width: 0.2, depth: 0.2, height: 2.65 }],
  },
  furniture: [
    { id: 'desk', name: 'Work desk', kind: 'desk', dimensions: { width: 1.6, height: 0.75, depth: 0.7 }, position: { x: -0.48, y: 0, z: 0.79 }, rotation: 0, color: '#bf9b72', visible: true },
    { id: 'chair', name: 'Ergonomic chair', kind: 'chair', dimensions: { width: 0.64, height: 1.15, depth: 0.64 }, position: { x: -0.48, y: 0, z: -0.05 }, rotation: 0, color: '#535c52', visible: true },
    { id: 'pc', name: 'Desktop PC', kind: 'pc', parentId: 'desk', dimensions: { width: 0.22, height: 0.45, depth: 0.42 }, position: { x: 0.48, y: 0, z: 0.04 }, rotation: 0, color: '#383e3d', visible: true },
    { id: 'monitor-left', name: 'Monitor · left', kind: 'monitor', parentId: 'desk', dimensions: { width: 0.59, height: 0.44, depth: 0.2 }, position: { x: -0.33, y: 0.75, z: 0.09 }, rotation: -8, color: '#343c3b', visible: true },
    { id: 'monitor-right', name: 'Monitor · right', kind: 'monitor', parentId: 'desk', dimensions: { width: 0.59, height: 0.44, depth: 0.2 }, position: { x: 0.3, y: 0.75, z: 0.09 }, rotation: 8, color: '#343c3b', visible: true },
    { id: 'storage', name: 'Storage cabinet', kind: 'storage', dimensions: { width: 0.64, height: 1.12, depth: 0.4 }, position: { x: 1.34, y: 0, z: 0.92 }, rotation: 0, color: '#d2c3aa', visible: true },
    { id: 'divider', name: 'Privacy screen', kind: 'divider', dimensions: { width: 1.65, height: 1.55, depth: 0.14 }, position: { x: -0.5, y: 0, z: -0.79 }, rotation: 0, color: '#c4c6ad', visible: true },
  ],
};

export const freshConfig = (): PlannerConfig => structuredClone(OFFICE_CONFIG);
