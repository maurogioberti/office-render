import type { FurnitureConfig } from '../config/types';

/** Visual power state is independent of visibility: powered-off screens stay in the room. */
export function isDisplayPowered(item: FurnitureConfig, furniture: FurnitureConfig[]) {
  if (item.laptop) return item.laptop.poweredOn !== false;
  const source = furniture.find(f => f.id === item.monitor?.sourceId);
  return source?.laptop?.poweredOn !== false;
}
