import { Color3, DynamicTexture, Mesh, MeshBuilder, Scene, StandardMaterial, Vector3 } from '@babylonjs/core';
import type { RoomConfig } from '../config/types';

export function createMeasurements(scene: Scene, room: RoomConfig) {
  const dimensions: Mesh[] = [], grid: Mesh[] = [];
  const line = (name: string, points: Vector3[], group = dimensions, color = '#929e86') => {
    const mesh = MeshBuilder.CreateLines(name, { points }, scene); mesh.color = Color3.FromHexString(color); mesh.isPickable = false; group.push(mesh); return mesh;
  };
  const label = (text: string, position: Vector3) => {
    const texture = new DynamicTexture(`Label ${text}`, { width: 512, height: 128 }, scene, false);
    texture.hasAlpha = true;
    texture.drawText(text, null, 85, '500 52px sans-serif', '#78856e', 'transparent', true);
    const material = new StandardMaterial(`Label material ${text}`, scene);
    material.diffuseTexture = texture; material.opacityTexture = texture; material.disableLighting = true; material.emissiveColor = Color3.White(); material.backFaceCulling = false;
    const plane = MeshBuilder.CreatePlane(text, { width: .8, height: .2 }, scene);
    plane.material = material; plane.position = position; plane.billboardMode = Mesh.BILLBOARDMODE_ALL; plane.isPickable = false;
    dimensions.push(plane);
  };
  const lx = room.length / 2, wz = room.width / 2, y = .015;
  line('Length dimension', [new Vector3(-lx,y,-wz-.34),new Vector3(lx,y,-wz-.34)]);
  for (const x of [-lx,lx]) line('Length tick', [new Vector3(x,y,-wz-.25),new Vector3(x,y,-wz-.43)]);
  label(`${room.length.toFixed(2)} m`, new Vector3(0,.015,-wz-.43));
  line('Width dimension', [new Vector3(lx+.34,y,-wz),new Vector3(lx+.34,y,wz)]);
  for (const z of [-wz,wz]) line('Width tick', [new Vector3(lx+.25,y,z),new Vector3(lx+.43,y,z)]);
  label(`${room.width.toFixed(2)} m`,new Vector3(lx+.51,.06,0));
  for (let x = -lx; x <= lx+.001; x += .1) line('10 cm grid X', [new Vector3(x,.002,-wz),new Vector3(x,.002,wz)], grid, '#c3c3b5');
  for (let z = -wz; z <= wz+.001; z += .1) line('10 cm grid Z', [new Vector3(-lx,.002,z),new Vector3(lx,.002,z)], grid, '#c3c3b5');
  grid.forEach(m => m.setEnabled(false));
  return { dimensions, grid, dispose: () => [...dimensions,...grid].forEach(m => m.dispose(false, true)) };
}
