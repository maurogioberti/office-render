import test from 'node:test';
import assert from 'node:assert/strict';
import { Color3, NullEngine, Scene, Vector3 } from '@babylonjs/core';
import { freshConfig } from '../src/config/office';
import { createLighting, aimDaylight } from '../src/lighting';
import { createMaterials } from '../src/materials';

test('unshadowed plaster retains highlight headroom for every window wall assignment', () => {
  const engine=new NullEngine(), scene=new Scene(engine), config=freshConfig();
  const materials=createMaterials(scene,config.room,false), lights=createLighting(scene);
  const normals={north:new Vector3(0,0,-1),south:new Vector3(0,0,1),east:new Vector3(-1,0,0),west:new Vector3(1,0,0)};
  try {
    for (const wall of ['north','south','east','west'] as const) {
      config.room.openings.find(o=>o.kind==='window')!.wall=wall;
      aimDaylight(lights.sun,config.room);
      const towardSun=lights.sun.direction.negate().normalize();
      for (const side of ['north','south','east','west'] as const) {
        const normal=normals[side], material=materials.walls[side];
        // StandardMaterial's hemisphere + Lambert diffuse terms, before its [0,1]
        // clamp. No shadows: this also covers Edit mode's exposed cutaway walls.
        const hemisphere=Color3.Lerp(lights.ambient.groundColor,lights.ambient.diffuse,Vector3.Dot(normal,lights.ambient.direction.normalizeToNew())*.5+.5).scale(lights.ambient.intensity);
        const direct=lights.sun.diffuse.scale(Math.max(0,Vector3.Dot(normal,towardSun))*lights.sun.intensity);
        const diffuse=hemisphere.add(direct).multiply(material.diffuseColor);
        const maxSpecular=lights.ambient.specular.scale(lights.ambient.intensity).add(lights.sun.specular.scale(lights.sun.intensity)).multiply(material.specularColor);
        const brightest=diffuse.add(maxSpecular);
        for (const channel of ['r','g','b'] as const) {
          assert.ok(brightest[channel]<.96,`${side} wall clips with daylight from ${wall}: ${brightest[channel]}`);
          assert.ok(diffuse[channel]>.45,`${side} wall must stay readable`);
        }
      }
    }
  } finally { scene.dispose();engine.dispose(); }
});
