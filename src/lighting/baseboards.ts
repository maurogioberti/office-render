import { Color3, GlowLayer, Mesh, PointLight, Scene } from '@babylonjs/core';
import type { RoomConfig, Wall } from '../config/types';
import { box, wallPoint, type RoomGeometry } from '../room/geometry';
import { solid } from '../materials';

/** Only solid baseboard spans receive LEDs: never bridge a doorway. */
export function baseboardSpans(room: RoomConfig, wall: Wall) {
  const span = wall === 'north' || wall === 'south' ? room.length : room.width;
  const doors = room.openings.filter(o => o.wall === wall && o.sill === 0).sort((a,b)=>a.offset-b.offset);
  const result: { start: number; end: number }[] = []; let start = -span / 2;
  for (const door of doors) {
    if (door.offset-door.width/2 > start) result.push({start,end:door.offset-door.width/2});
    start = Math.max(start,door.offset+door.width/2);
  }
  if (start < span / 2) result.push({start,end:span/2});
  return result;
}

export function createBaseboardLighting(scene: Scene, config: RoomConfig, geometry: RoomGeometry) {
  const setting = config.baseboardLED, meshes: Mesh[] = [], lights: PointLight[] = [];
  const material = solid(scene,'LED baseboard diffuser',setting.color,0);
  material.disableLighting = true; material.emissiveColor = Color3.FromHexString(setting.color);
  const glow = new GlowLayer('Subtle baseboard glow', scene, { blurKernelSize: 24 });
  glow.intensity = setting.glow; glow.isEnabled = setting.enabled;
  for (const wall of ['north','south','east','west'] as const) {
    const alongX = wall === 'north' || wall === 'south';
    for (const [i,span] of baseboardSpans(config,wall).entries()) {
      const offset = (span.start+span.end)/2, length = span.end-span.start;
      const p = wallPoint(config,wall,offset,.025,config.wallThickness/2+.027);
      const mesh = box(scene,`${wall} LED ${i}`,alongX?length:.008,.008,alongX?.008:length,p.x,p.y,p.z,material,geometry.groups[wall]);
      mesh.setEnabled(setting.enabled); glow.addIncludedOnlyMesh(mesh); meshes.push(mesh);
      // Low-range spill affects only the adjacent wall and floor, not the whole office.
      const light = new PointLight(`${wall} LED spill ${i}`,wallPoint(config,wall,offset,.08,config.wallThickness/2+.1),scene);
      light.diffuse = Color3.FromHexString(setting.color); light.specular = Color3.Black(); light.intensity = setting.intensity; light.range = .65;
      light.includedOnlyMeshes = [geometry.tile,...geometry.groups[wall].getChildMeshes()];
      light.setEnabled(setting.enabled); lights.push(light);
    }
  }
  return {
    meshes, lights, material, glow,
    sync: () => lights.forEach((light,i)=>light.setEnabled(setting.enabled && meshes[i].isEnabled())),
    dispose: () => { glow.dispose(); lights.forEach(l=>l.dispose()); meshes.forEach(m=>m.dispose()); material.dispose(); },
  };
}
