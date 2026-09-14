import { Color3, DynamicTexture, Mesh, MeshBuilder, Scene, StandardMaterial, Vector3 } from '@babylonjs/core';
import type { FurnitureConfig, RoomConfig } from '../config/types';
import { solid, type Materials } from '../materials';
import { box } from '../room/geometry';
import { furnitureFootprints, monitorPanel } from './footprint';
import { createWallMonitorArm } from './wallMounts';
import { createSharedDeskArm } from './deskArm';

export type FurnitureObject = { config: FurnitureConfig; root: Mesh; meshes: Mesh[]; materials: StandardMaterial[] };

export function createFurniture(scene: Scene, configs: FurnitureConfig[], mats: Materials, room?: RoomConfig) {
  const objects = new Map<string, FurnitureObject>();
  for (const config of configs) {
    const root = new Mesh(config.id, scene); root.isPickable = false;
    root.position.set(config.position.x, config.position.y, config.position.z);
    root.rotation.y = config.rotation * Math.PI / 180;
    const body = solid(scene, `${config.id} finish`, config.color, .09);
    const object = { config, root, meshes: [] as Mesh[], materials: [body] };
    objects.set(config.id, object);
    const { width: w, height: h, depth: d } = config.dimensions;
    const b = (name: string, width: number, height: number, depth: number, x: number, y: number, z: number, material = body) => {
      const mesh = box(scene, `${config.id} · ${name}`, width, height, depth, x, y, z, material, root);
      object.meshes.push(mesh); return mesh;
    };
    const cylinder = (name: string, diameter: number, height: number, x: number, y: number, z: number, material = mats.dark) => {
      const mesh = MeshBuilder.CreateCylinder(`${config.id} · ${name}`, { diameter, height, tessellation: 20 }, scene);
      mesh.position.set(x, y, z); mesh.parent = root; mesh.material = material;
      mesh.receiveShadows = true; object.meshes.push(mesh); return mesh;
    };
    switch (config.kind) {
      case 'desk': {
        if (config.cornerDesk) {
          for (const [index, part] of furnitureFootprints(config).entries()) {
            b(`L worktop ${index}`, part.width, .035, part.depth, part.x, h - .0175, part.z);
            for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
              b('corner desk leg', .045, h - .035, .045, part.x + sx * (part.width / 2 - .065), (h - .035) / 2, part.z + sz * (part.depth / 2 - .065), mats.dark);
            }
          }
          break;
        }
        b('oak worktop', w, h * .045, d, 0, h * .9775, 0);
        for (const x of [-1, 1]) for (const z of [-1, 1]) b('steel leg', w * .025, h * .955, d * .058, x * w * .455, h * .4775, z * d * .41, mats.dark);
        b('rear frame', w * .93, h * .065, d * .045, 0, h * .83, d * .41, mats.dark);
        break;
      }
      case 'chair': {
        cylinder('gas lift', w * .085, h * .32, 0, h * .235, 0, mats.metal);
        for (let i = 0; i < 5; i++) {
          const a = i * Math.PI * 2 / 5;
          const spoke = b('base spoke', w * .043, h * .03, d * .44, Math.sin(a) * w * .2, h * .065, Math.cos(a) * d * .2, mats.dark);
          spoke.rotation.y = a;
          cylinder('castor', w * .09, h * .05, Math.sin(a) * w * .43, h * .025, Math.cos(a) * d * .43);
        }
        b('seat cushion', w * .78, h * .08, d * .77, 0, h * .41, 0);
        b('back support', w * .17, h * .55, d * .07, 0, h * .62, -d * .4, mats.dark);
        b('ergonomic backrest', w * .72, h * .46, d * .095, 0, h * .705, -d * .38);
        b('headrest', w * .42, h * .09, d * .12, 0, h * .955, -d * .38);
        for (const side of [-1, 1]) {
          b('arm support', w * .04, h * .16, d * .05, side * w * .46, h * .47, 0, mats.dark);
          b('arm pad', w * .08, h * .035, d * .4, side * w * .46, h * .5675, 0, mats.dark);
        }
        break;
      }
      case 'pc': {
        b('tower case', w, h, d, 0, h / 2, 0);
        b('front panel', w * .9, h * .89, .003, 0, h * .5, -d / 2 + .002, mats.dark);
        const led = solid(scene, `${config.id} status LED`, '#adcca4'); led.emissiveColor = Color3.FromHexString('#a7cda0'); object.materials.push(led);
        b('power indicator', w * .1, h * .015, .004, w * .28, h * .88, -d / 2 + .002, led);
        for (let i = 0; i < 8; i++) b('vent', w * .58, h * .009, .004, 0, h * .2 + i * h * .04, -d / 2 + .002, mats.dark);
        break;
      }
      case 'monitor': {
        if (config.monitor) {
          const panel = monitorPanel(config), bezel = config.monitor.bezel;
          const panelW = panel.width + 2 * bezel, panelH = panel.height + 2 * bezel;
          const wallMounted = config.monitor.mount === 'wall';
          const panelMounted = wallMounted || config.monitor.mount === 'shared-arm';
          const centerY = panelMounted ? h / 2 : h - panelH / 2, screenZ = panelMounted ? 0 : -d * .18;
          b('display shell', panelW, panelH, .035, 0, centerY, screenZ);
          const display = solid(scene, `${config.id} screen`, '#54716f', .15);
          display.emissiveColor = Color3.FromHexString('#789a98').scale(.18); object.materials.push(display);
          b('27 inch active panel', panel.width, panel.height, .002, 0, centerY, screenZ - .018, display);
          if (panelMounted) {
            if (wallMounted && room && config.monitor.wallMount) object.meshes.push(...createWallMonitorArm(scene, config, room, root, mats.dark));
            // Use a canvas label in the browser; NullEngine tests need no DOM or raster assets.
            if (scene.getEngine().getRenderingCanvas()) {
              const label = new DynamicTexture(`${config.id} brand label`, { width: 256, height: 32 }, scene, false);
              label.hasAlpha = true;
              label.drawText(config.monitor.brand.toUpperCase(), null, 25, '600 26px sans-serif', '#bbc1c4', 'transparent', true);
              const ink = solid(scene, `${config.id} brand ink`, '#ffffff');
              ink.diffuseTexture = label; ink.opacityTexture = label;
              object.materials.push(ink);
              b('brand label', Math.min(panelW * .13, .065), bezel * .6, .0005, 0, centerY - panelH / 2 + bezel / 2, -.018, ink);
            }
          } else if (config.monitor.mount === 'arm') {
            b('arm clamp', .065, .025, .07, 0, .0125, d * .32, mats.dark);
            cylinder('arm post', .027, centerY * .78, 0, centerY * .39 + .025, d * .32, mats.dark);
            b('articulated arm', .03, .035, d * .5, 0, centerY * .78, d * .07, mats.dark);
            b('VESA support', .07, centerY * .22 + .025, .025, 0, centerY * .89, screenZ + .035, mats.dark);
          } else {
            b('stand foot', w * .45, .025, d, 0, .0125, 0);
            b('stand post', .035, centerY, .035, 0, centerY / 2, screenZ + .035);
          }
          break;
        }
        b('stand foot', w * .34, h * .025, d, 0, h * .0125, 0);
        b('stand', w * .045, h * .31, d * .09, 0, h * .16, d * .08);
        b('display shell', w, h * .76, d * .14, 0, h * .62, d * .14);
        const display = solid(scene, `${config.id} screen`, '#617f80', .2);
        display.emissiveColor = Color3.FromHexString('#789a98').scale(.23); object.materials.push(display);
        b('screen', w * .953, h * .69, .002, 0, h * .627, d * .069, display);
        break;
      }
      case 'work-zone': {
        // Its clamp/column/branches are built after all monitor roots have their real parents.
        break;
      }
      case 'laptop': {
        const tilt = ((config.laptop?.openingAngle ?? 105) - 90) * Math.PI / 180;
        const thickness = Math.min(.014, h * .08), lidThickness = .008;
        const cosine = Math.cos(tilt), sine = Math.sin(tilt);
        const lidWidth = w * .95;
        // Keep a plausible 16:9 display inside the complete open-laptop envelope.
        const lidHeight = Math.min(lidWidth * 9 / 16 + .022,
          (h - thickness - lidThickness) / Math.max(cosine, .1),
          (d * .46 - lidThickness) / Math.max(sine, .0001));
        const hingeZ = d / 2 - lidThickness - Math.max(0, lidHeight * sine);
        const baseDepth = hingeZ + d / 2 + lidThickness / 2;
        const baseZ = -d / 2 + baseDepth / 2;
        b('laptop base', w, thickness, baseDepth, 0, thickness / 2, baseZ);
        b('keyboard deck', w * .88, .002, baseDepth * .48, 0, thickness + .001, baseZ + baseDepth * .13, mats.dark);
        for (let row = 0; row < 4; row++) for (let key = 0; key < 11; key++) {
          b('keyboard key', w * .068, .0015, baseDepth * .082,
            (key - 5) * w * .076, thickness + .0025, baseZ + baseDepth * .31 - row * baseDepth * .108, mats.metal);
        }
        b('touchpad', w * .27, .001, baseDepth * .20, 0, thickness + .001, baseZ - baseDepth * .28, mats.dark);
        const lidY = thickness + lidHeight * cosine / 2, lidZ = hingeZ + lidHeight * sine / 2;
        const lid = b('laptop screen shell', lidWidth, lidHeight, lidThickness, 0, lidY, lidZ);
        lid.rotation.x = tilt;
        const display = solid(scene, `${config.id} laptop display`, '#587373', .12);
        display.emissiveColor = Color3.FromHexString('#789a98').scale(.18); object.materials.push(display);
        const inset = lidThickness / 2 + .0008;
        const screen = b('laptop active screen', lidWidth - .014, lidHeight - .017, .001,
          0, lidY + sine * inset, lidZ - cosine * inset, display);
        screen.rotation.x = tilt;
        break;
      }
      case 'storage': {
        b('cabinet body', w, h * .96, d, 0, h * .52, 0);
        for (const side of [-1, 1]) b('short foot', w * .07, h * .04, d * .76, side * w * .4, h * .02, 0, mats.dark);
        for (let i = 0; i < 3; i++) {
          b('drawer front', w * .95, h * .298, .02, 0, h * .205 + i * h * .315, -d / 2 + .01);
          b('drawer reveal', w * .96, .003, .004, 0, h * .359 + i * h * .315, -d / 2 + .002, mats.dark);
          b('drawer pull', w * .2, h * .013, .026, 0, h * .28 + i * h * .315, -d / 2 + .013, mats.dark);
        }
        break;
      }
      case 'divider': {
        // Three folding panels; alternating plan angles stay within the configured envelope.
        const panels = 3, gap = .008 * w, pw = (w - 2 * gap) / panels;
        const frame = solid(scene, `${config.id} ash frame`, '#ab9779'); object.materials.push(frame);
        for (let i = 0; i < panels; i++) {
          const x = (i - 1) * (pw + gap), z = (i % 2 ? 1 : -1) * d * .16;
          b('fabric panel', pw * .89, h * .92, d * .16, x, h * .515, z);
          for (const side of [-1, 1]) b('timber stile', pw * .055, h, d * .24, x + side * pw * .4725, h / 2, z, frame);
          for (const y of [h * .045, h * .981]) b('timber rail', pw, h * .038, d * .24, x, y, z, frame);
          b('foot', pw * .3, h * .02, d, x, h * .01, 0, frame);
          for (let line = 1; line < 17; line++) b('subtle textile rib', .001, h * .9, .001, x - pw * .44 + line * pw * .052, h * .515, z - d * .081, frame);
        }
        break;
      }
    }
    for (const mesh of object.meshes) { mesh.isPickable = true; mesh.metadata = { ...mesh.metadata, furnitureId: config.id }; }
    root.setEnabled(config.visible);
  }
  for (const object of objects.values()) {
    if (object.config.parentId) object.root.parent = objects.get(object.config.parentId)!.root;
  }
  for (const object of objects.values()) {
    if (object.config.kind !== 'work-zone' || !object.config.workZone) continue;
    const monitors = [...objects.values()].filter(child => child.config.parentId === object.config.id && child.config.monitor?.mount === 'shared-arm');
    object.meshes.push(...createSharedDeskArm(scene, object.config, object.root, monitors, mats.dark));
  }
  // Compute parents first so picking, dimensions, and gizmos have valid initial world matrices.
  for (const object of objects.values()) { object.root.computeWorldMatrix(true); for (const mesh of object.meshes) mesh.computeWorldMatrix(true); }
  return objects;
}

export function disposeFurniture(objects: Map<string, FurnitureObject>) {
  for (const object of objects.values()) { object.root.dispose(false, false); object.materials.forEach(m => m.dispose(false, true)); }
}

export function worldPosition(object: FurnitureObject) { return object.root.getAbsolutePosition().clone(); }
