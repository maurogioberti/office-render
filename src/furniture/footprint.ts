import type { FurnitureConfig } from '../config/types';

/** Shared by visible worktops and walking collisions: never fill the L's chair bay. */
export function furnitureFootprints(item: FurnitureConfig) {
  const { width, depth } = item.dimensions;
  // The assembly envelope is an editing aid, not a solid wall across the desk.
  if (item.workZone) return [{ x: 0, z: depth/2-.07, width: .1, depth: .12 }];
  if (!item.cornerDesk) return [{ x: 0, z: 0, width, depth }];
  const t = item.cornerDesk.worktopDepth;
  const runs = [
    { x: -width / 2 + t / 2, z: 0, width: t, depth },
    { x: t / 2, z: -depth / 2 + t / 2, width: width - t, depth: t },
  ];
  const notch = item.cornerDesk.cornerNotch;
  if (!notch || notch.width <= 0 || notch.depth <= 0) return runs;
  const cut = { minX: -width / 2, maxX: -width / 2 + notch.width, minZ: -depth / 2, maxZ: -depth / 2 + notch.depth };
  return runs.flatMap(run => {
    const x0 = run.x - run.width / 2, x1 = run.x + run.width / 2;
    const z0 = run.z - run.depth / 2, z1 = run.z + run.depth / 2;
    const ix0 = Math.max(x0, cut.minX), ix1 = Math.min(x1, cut.maxX);
    const iz0 = Math.max(z0, cut.minZ), iz1 = Math.min(z1, cut.maxZ);
    if (ix1 <= ix0 || iz1 <= iz0) return [run];
    // Four disjoint bands partition a rectangle around the removed area. At this rear
    // corner, only two normally remain; the same rule also handles a wider custom notch.
    return [
      { minX: x0, maxX: ix0, minZ: z0, maxZ: z1 },
      { minX: ix1, maxX: x1, minZ: z0, maxZ: z1 },
      { minX: ix0, maxX: ix1, minZ: z0, maxZ: iz0 },
      { minX: ix0, maxX: ix1, minZ: iz1, maxZ: z1 },
    ].filter(part => part.maxX - part.minX > .000001 && part.maxZ - part.minZ > .000001)
      .map(part => ({ x: (part.minX + part.maxX) / 2, z: (part.minZ + part.maxZ) / 2,
        width: part.maxX - part.minX, depth: part.maxZ - part.minZ }));
  });
}

/** 16:9 visible panel from the stated diagonal; housing size is provisional. */
export function monitorPanel(item: FurnitureConfig) {
  const spec = item.monitor!;
  const diagonal = spec.diagonalInches * .0254;
  const long = diagonal * 16 / Math.hypot(16, 9), short = diagonal * 9 / Math.hypot(16, 9);
  return spec.orientation === 'portrait' ? { width: short, height: long } : { width: long, height: short };
}
