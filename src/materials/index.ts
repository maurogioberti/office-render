import { Color3, DynamicTexture, Scene, StandardMaterial, Texture } from '@babylonjs/core';
import type { RoomConfig, Wall } from '../config/types';

export function solid(scene: Scene, name: string, hex: string, sheen = 0.06) {
  const mat = new StandardMaterial(name, scene);
  mat.diffuseColor = Color3.FromHexString(hex);
  mat.specularColor = new Color3(sheen, sheen, sheen);
  mat.specularPower = 60;
  return mat;
}

export function createMaterials(scene: Scene, room: RoomConfig, textures = true) {
  const wall = solid(scene, 'Light textured plaster', '#eeeae0');
  const floor = solid(scene, 'Beige marble tile · 60 cm', '#ffffff', 0.17);
  const wood = solid(scene, 'Natural oak', '#bb926a', 0.1);
  const trim = solid(scene, 'Warm white joinery', '#eeece3');
  const dark = solid(scene, 'Graphite powder coat', '#3e4643', 0.2);
  const glass = solid(scene, 'Daylight glass', '#c8dedc', 0.2);
  glass.emissiveColor = Color3.FromHexString('#b8d6d9').scale(0.16);
  const metal = solid(scene, 'Brushed metal', '#a8aca3', 0.6);
  if (textures) {
    let seed = 714;
    const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    const plaster = new DynamicTexture('Fine plaster texture', 256, scene, false);
    const ctx = plaster.getContext();
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 18000; i++) {
      ctx.fillStyle = rand() > 0.5 ? 'rgba(114,108,95,.04)' : 'rgba(255,255,255,.16)';
      ctx.fillRect(rand() * 256, rand() * 256, 1, 1);
    }
    plaster.update(); plaster.uScale = 5; plaster.vScale = 4;
    wall.diffuseTexture = plaster;
    const px = Math.min(360, 2048 / Math.max(room.length, room.width));
    const w = Math.round(room.length * px), h = Math.round(room.width * px);
    const tile = new DynamicTexture('Metric marble flooring', { width: w, height: h }, scene, true);
    const fc = tile.getContext() as CanvasRenderingContext2D;
    fc.fillStyle = '#d8cdbc'; fc.fillRect(0, 0, w, h);
    for (let x = 0; x < room.length; x += 0.6) for (let z = 0; z < room.width; z += 0.6) {
      const tone = Math.floor(rand() * 9);
      fc.fillStyle = `rgb(${218 + tone},${208 + tone},${190 + tone})`;
      fc.fillRect(x * px + 1, z * px + 1, 0.6 * px - 2, 0.6 * px - 2);
    }
    for (let i = 0; i < 1400; i++) {
      const x = rand() * w, y = rand() * h;
      fc.strokeStyle = rand() > 0.3 ? 'rgba(155,136,115,.042)' : 'rgba(255,255,246,.13)';
      fc.lineWidth = rand() * 2 + 0.2; fc.beginPath(); fc.moveTo(x, y);
      fc.bezierCurveTo(x + 15, y - 10, x + 48, y + 14, x + 75, y - 20); fc.stroke();
    }
    tile.wrapU = Texture.CLAMP_ADDRESSMODE; tile.wrapV = Texture.CLAMP_ADDRESSMODE;
    tile.update(); floor.diffuseTexture = tile;
  } else floor.diffuseColor = Color3.FromHexString('#ded2c0');
  // Wall-specific materials are an extension point for later wall treatments.
  const walls = Object.fromEntries((['north','south','east','west'] as Wall[]).map(side => {
    const finish = room.wallFinishes[side];
    const material = solid(scene, `${side} wall finish`, finish.color, finish.sheen);
    if (finish.texture === 'plaster') material.diffuseTexture = wall.diffuseTexture;
    material.maxSimultaneousLights = 10;
    return [side, material];
  })) as Record<Wall, StandardMaterial>;
  floor.maxSimultaneousLights = 10;
  return { wall, walls, floor, wood, trim, dark, glass, metal };
}
export type Materials = ReturnType<typeof createMaterials>;

export function disposeMaterials(mats: Materials) {
  Object.values(mats.walls).forEach(m => m.dispose());
  [mats.wall,mats.floor,mats.wood,mats.trim,mats.dark,mats.glass,mats.metal].forEach(m => m.dispose(false, true));
}
