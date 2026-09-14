import { Color3, DirectionalLight, HemisphericLight, Scene, ShadowGenerator, Vector3 } from '@babylonjs/core';
import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent';
import type { RoomConfig } from '../config/types';

export function aimDaylight(sun: DirectionalLight, room: RoomConfig) {
  const window = room.openings.find(o => o.kind === 'window');
  if (!window) return;
  const side = { north: new Vector3(0,0,1), south: new Vector3(0,0,-1), east: new Vector3(1,0,0), west: new Vector3(-1,0,0) }[window.wall];
  const alongX = window.wall === 'north' || window.wall === 'south';
  sun.position.copyFrom(side.scale(5).add(new Vector3(alongX ? window.offset : 0,7,alongX ? 0 : window.offset)));
  sun.direction.copyFrom(new Vector3(0,.5,0).subtract(sun.position).normalize());
}

export function createLighting(scene: Scene) {
  const ambient = new HemisphericLight('Soft ambient daylight', new Vector3(0, 1, 0), scene);
  ambient.intensity = .82; ambient.diffuse = Color3.FromHexString('#fff8e9');
  ambient.groundColor = Color3.FromHexString('#aba793');
  ambient.specular = Color3.Black();
  const sun = new DirectionalLight('Window daylight', new Vector3(-.65, -1, -.75), scene);
  // StandardMaterial clamps diffuse light before tone mapping. Leave headroom above
  // the ambient fill so the wall facing the window retains its plaster color/detail.
  sun.position.set(3.5, 7, 5); sun.intensity = .35;
  sun.diffuse = Color3.FromHexString('#fff6e3');
  sun.shadowMinZ = .1; sun.shadowMaxZ = 18;
  sun.autoCalcShadowZBounds = true;
  const shadows = new ShadowGenerator(2048, sun);
  shadows.usePercentageCloserFiltering = true;
  shadows.filteringQuality = ShadowGenerator.QUALITY_MEDIUM;
  shadows.bias = .0005; shadows.normalBias = .015;
  shadows.darkness = .24;
  return { sun, ambient, shadows };
}
