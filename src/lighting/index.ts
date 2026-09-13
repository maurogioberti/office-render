import { Color3, DirectionalLight, HemisphericLight, Scene, ShadowGenerator, Vector3 } from '@babylonjs/core';
import '@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent';

export function createLighting(scene: Scene) {
  const ambient = new HemisphericLight('Soft ambient daylight', new Vector3(0, 1, 0), scene);
  ambient.intensity = .82; ambient.diffuse = Color3.FromHexString('#fff8e9');
  ambient.groundColor = Color3.FromHexString('#aba793');
  const sun = new DirectionalLight('Window daylight', new Vector3(-.65, -1, -.75), scene);
  sun.position.set(3.5, 7, 5); sun.intensity = 1.15;
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
