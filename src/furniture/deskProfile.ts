import type { FurnitureConfig } from '../config/types';

/** Rectilinear C, backed against local -X, open toward +X. No arcs or seams. */
export function deskOutline(item: FurnitureConfig) {
  const { width: w, depth: d } = item.dimensions;
  const { worktopDepth: t, cornerNotch: notch, returnWidth = .62 } = item.cornerDesk!;
  const points = [
    { x: -w / 2 + (notch?.width ?? 0), z: -d / 2 },
    { x: w / 2, z: -d / 2 },
    { x: w / 2, z: -d / 2 + returnWidth },
    { x: -w / 2 + t, z: -d / 2 + returnWidth },
    { x: -w / 2 + t, z: d / 2 - returnWidth },
    { x: w / 2, z: d / 2 - returnWidth },
    { x: w / 2, z: d / 2 },
    { x: -w / 2, z: d / 2 },
    { x: -w / 2, z: -d / 2 + (notch?.depth ?? 0) },
  ];
  if (notch) points.push({ x: -w / 2 + notch.width, z: -d / 2 + notch.depth });
  return points;
}
