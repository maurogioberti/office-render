export type Vec3 = { x: number; y: number; z: number };
export type Dimensions = { width: number; height: number; depth: number };
export type Wall = 'north' | 'south' | 'east' | 'west';
export type FurnitureKind = 'desk' | 'chair' | 'pc' | 'monitor' | 'storage' | 'divider' | 'work-zone' | 'laptop';
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
  /** Preserve the attachment's offset from its parent desk top when desk height changes. */
  onDesktop?: boolean;
  /** Legacy L or squared C, backed by local -X. Width/depth define the outer envelope. */
  cornerDesk?: { shape?: 'l' | 'rect-c'; returnWidth?: number; floating?: boolean; worktopDepth: number; mainRun?: 'width' | 'depth'; cornerNotch?: { width: number; depth: number } };
  workZone?: { surfaceOffset: number; columnHeight: number; armReach: number };
  laptop?: { openingAngle: number; poweredOn?: boolean };
  monitor?: { sourceId?: string; brand: string; diagonalInches: number; orientation: 'landscape' | 'portrait'; mount: 'arm' | 'stand' | 'wall' | 'shared-arm'; bezel: number;
    /** Wall attachment stays fixed when the monitor or desk moves. Coordinates in meters. */
    wallMount?: { wall: Wall; offset: number; height: number; maxReach: number };
  };
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
  /** Overall opening height includes the housing. Photographic proportions, not a surveyed product. */
  windowDetail?: { frameColor: string; frameWidth: number; frameDepth: number; housingHeight: number; slatPitch: number; shutterClosed: boolean };
};
export type AirConditionerConfig = {
  enabled: boolean;
  wall: Wall;
  /** Center along the wall, and casing bottom above the floor, in meters. */
  offset: number;
  bottom: number;
  width: number;
  height: number;
  /** Full casing depth = interior projection + wall thickness + exterior projection. */
  depth: number;
  interiorProjection: number;
  trimWidth: number;
  color: string;
  /** Outlet vanes turn around local Y; the casing remains square to the wall. */
  louverYaw: number;
};
export type RoomConfig = {
  length: number;
  width: number;
  height: number;
  heightConfirmed: boolean;
  wallThickness: number;
  wallFinishes: Record<Wall, { color: string; texture: 'plaster' | 'plain'; sheen: number }>;
  baseboardLED: { enabled: boolean; color: string; intensity: number; glow: number };
  airConditioner?: AirConditionerConfig;
  openings: OpeningConfig[];
  beams: { id: string; enabled: boolean; wall: Wall; offset: number; length: number; projection: number; drop: number }[];
  cornerFeatures: { id: string; enabled: boolean; corner: 'north-west' | 'north-east' | 'south-west' | 'south-east'; width: number; depth: number; height: number }[];
};
export type PlannerConfig = { version: 2; room: RoomConfig; furniture: FurnitureConfig[] };
export type Mode = 'edit' | 'walk';
export type TransformTool = 'move' | 'rotate';
