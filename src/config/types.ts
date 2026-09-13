export type Vec3 = { x: number; y: number; z: number };
export type Dimensions = { width: number; height: number; depth: number };
export type Wall = 'north' | 'south' | 'east' | 'west';
export type FurnitureKind = 'desk' | 'chair' | 'pc' | 'monitor' | 'storage' | 'divider';
export type FurnitureConfig = {
  id: string;
  name: string;
  kind: FurnitureKind;
  dimensions: Dimensions;
  position: Vec3;
  rotation: number;
  color: string;
  visible: boolean;
  parentId?: string;
};
export type OpeningConfig = {
  id: string;
  kind: 'window' | 'door';
  wall: Wall;
  offset: number;
  width: number;
  height: number;
  sill: number;
  confirmed: boolean;
};
export type RoomConfig = {
  length: number;
  width: number;
  height: number;
  heightConfirmed: boolean;
  wallThickness: number;
  openings: OpeningConfig[];
  beams: { id: string; enabled: boolean; wall: Wall; offset: number; length: number; projection: number; drop: number }[];
  cornerFeatures: { id: string; enabled: boolean; corner: 'north-west' | 'north-east' | 'south-west' | 'south-east'; width: number; depth: number; height: number }[];
};
export type PlannerConfig = { version: 1; room: RoomConfig; furniture: FurnitureConfig[] };
export type Mode = 'edit' | 'walk';
export type TransformTool = 'move' | 'rotate';
