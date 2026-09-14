import { Matrix, Mesh, MeshBuilder, Quaternion, Scene, StandardMaterial, Vector3 } from '@babylonjs/core';
import type { FurnitureConfig } from '../config/types';
import { box } from '../room/geometry';

type MonitorObject = { config: FurnitureConfig; root: Mesh };

function columnGeometry(config: FurnitureConfig) {
  const spec = config.workZone!;
  const clamp = new Vector3(0, spec.surfaceOffset, config.dimensions.depth / 2 - .07);
  return {
    clamp,
    columnBase: clamp.clone(),
    columnTop: clamp.add(new Vector3(0, spec.columnHeight, 0)),
  };
}

function solveBranch(config: FurnitureConfig, target: Vector3, side: number) {
  const column = columnGeometry(config), maxReach = config.workZone!.armReach;
  // Each branch pivots from the same column; collars are staggered vertically to avoid overlap.
  const start = column.columnTop.add(new Vector3(0, side < 0 ? -.044 : 0, 0));
  const reach = Vector3.Distance(start, target);
  const bend = Math.min(.055, Math.sqrt(Math.max(0, maxReach ** 2 - reach ** 2)) / 2);
  const elbow = Vector3.Center(start, target).add(new Vector3(0, bend, 0));
  return { ...column, start, elbow, target, reach };
}

/** All coordinates are local to the shared work-zone root, including each child's VESA joint. */
export function sharedArmGeometry(workZone: FurnitureConfig, child: FurnitureConfig) {
  const target = Vector3.TransformCoordinates(new Vector3(0, child.dimensions.height / 2, .035),
    Matrix.RotationY(child.rotation * Math.PI / 180)).add(new Vector3(child.position.x, child.position.y, child.position.z));
  return solveBranch(workZone, target, child.position.x);
}

/** One desk clamp and column carry both displays; the children never receive separate stands. */
export function createSharedDeskArm(scene: Scene, config: FurnitureConfig, root: Mesh, monitors: MonitorObject[], material: StandardMaterial) {
  const meshes: Mesh[] = [], spec = config.workZone!, column = columnGeometry(config);
  const support = (mesh: Mesh, parent = root) => {
    mesh.parent = parent; mesh.material = material; mesh.receiveShadows = true; mesh.isPickable = true;
    mesh.metadata = { furnitureId: config.id, sharedArmSupport: true };
    meshes.push(mesh); return mesh;
  };
  const block = (name: string, width: number, height: number, depth: number, position: Vector3) =>
    support(box(scene, `${config.id} · ${name}`, width, height, depth, position.x, position.y, position.z, material));
  block('shared desk clamp top jaw', .105, .012, .10, new Vector3(0, spec.surfaceOffset + .006, column.clamp.z - .009));
  block('shared desk clamp lower jaw', .075, .006, .085, new Vector3(0, .003, column.clamp.z - .008));
  block('shared desk clamp spine', .045, spec.surfaceOffset + .018, .014, new Vector3(0, (spec.surfaceOffset + .018) / 2, column.clamp.z + .036));
  const post = support(MeshBuilder.CreateCylinder(`${config.id} · common monitor column`, { diameter: .035, height: spec.columnHeight, tessellation: 18 }, scene));
  post.position = Vector3.Center(column.columnBase, column.columnTop);

  const branches = monitors.map(monitor => {
    const link = (name: string) => support(MeshBuilder.CreateCylinder(`${monitor.config.id} · shared arm ${name}`, {
      diameter: .027, height: 1, tessellation: 12,
    }, scene));
    const inner = link('inner link'), outer = link('outer link');
    const joints = ['column collar', 'elbow', 'VESA joint'].map(name =>
      support(MeshBuilder.CreateSphere(`${monitor.config.id} · shared arm ${name}`, { diameter: .047, segments: 8 }, scene)));
    const plate = support(box(scene, `${monitor.config.id} · shared arm VESA plate`, .075, .075, .012,
      0, monitor.config.dimensions.height / 2, .0235, material), monitor.root);
    plate.metadata.monitorId = monitor.config.id;
    return { monitor, inner, outer, joints };
  });

  const update = () => {
    const inverse = Matrix.Invert(root.computeWorldMatrix(true));
    for (const branch of branches) {
      const { monitor, inner, outer, joints } = branch;
      const targetWorld = Vector3.TransformCoordinates(new Vector3(0, monitor.config.dimensions.height / 2, .035), monitor.root.computeWorldMatrix(true));
      const target = Vector3.TransformCoordinates(targetWorld, inverse);
      const geometry = solveBranch(config, target, monitor.config.position.x);
      const placeLink = (mesh: Mesh, from: Vector3, to: Vector3) => {
        const direction = to.subtract(from), length = direction.length();
        mesh.position = Vector3.Center(from, to); mesh.scaling.y = length;
        mesh.rotationQuaternion = Quaternion.FromUnitVectorsToRef(Vector3.Up(), direction.scale(1 / Math.max(length, .000001)), Quaternion.Identity());
      };
      placeLink(inner, geometry.start, geometry.elbow); placeLink(outer, geometry.elbow, geometry.target);
      [geometry.start, geometry.elbow, geometry.target].forEach((point, index) => { joints[index].position = point; });
    }
  };
  update();
  const observer = scene.onBeforeRenderObservable.add(update);
  root.onDisposeObservable.addOnce(() => { scene.onBeforeRenderObservable.remove(observer); });
  return meshes;
}
