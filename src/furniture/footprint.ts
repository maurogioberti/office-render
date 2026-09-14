import type { FurnitureConfig } from '../config/types';

/** Shared by visible worktops and walking collisions: never fill the L's chair bay. */
export function furnitureFootprints(item: FurnitureConfig) {
  const { width, depth } = item.dimensions;
  if (!item.cornerDesk) return [{ x: 0, z: 0, width, depth }];
  const t = item.cornerDesk.worktopDepth;
  return [
    { x: -width / 2 + t / 2, z: 0, width: t, depth },
    { x: t / 2, z: -depth / 2 + t / 2, width: width - t, depth: t },
  ];
}

/** 16:9 visible panel from the stated diagonal; housing size is provisional. */
export function monitorPanel(item: FurnitureConfig) {
  const spec = item.monitor!;
  const diagonal = spec.diagonalInches * .0254;
  const long = diagonal * 16 / Math.hypot(16, 9), short = diagonal * 9 / Math.hypot(16, 9);
  return spec.orientation === 'portrait' ? { width: short, height: long } : { width: long, height: short };
}
