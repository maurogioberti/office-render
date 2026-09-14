import { Matrix, Mesh, MeshBuilder, Quaternion, Scene, StandardMaterial, Vector3 } from '@babylonjs/core';
import type { FurnitureConfig, RoomConfig } from '../config/types';
import { box } from '../room/geometry';

type WallMount = NonNullable<NonNullable<FurnitureConfig['monitor']>['wallMount']>;

/** Mount coordinates are measured on the room's interior wall face, independently of furniture. */
export function wallMountAnchor(room: RoomConfig, mount: WallMount) {
  if (mount.wall === 'north') return new Vector3(mount.offset, mount.height, room.width / 2);
  if (mount.wall === 'south') return new Vector3(mount.offset, mount.height, -room.width / 2);
  if (mount.wall === 'east') return new Vector3(room.length / 2, mount.height, mount.offset);
  return new Vector3(-room.length / 2, mount.height, mount.offset);
}

/** Shared with placement checks: the requested reach is from the wall bracket to the VESA joint. */
export function monitorMountGeometry(config: FurnitureConfig, room: RoomConfig) {
  const mount = config.monitor!.wallMount!;
  const anchor = wallMountAnchor(room, mount);
  const normal = mount.wall === 'north' ? new Vector3(0, 0, -1)
    : mount.wall === 'south' ? new Vector3(0, 0, 1)
    : mount.wall === 'east' ? new Vector3(-1, 0, 0) : new Vector3(1, 0, 0);
  const rotation = Matrix.RotationY(config.rotation * Math.PI / 180);
  const target = Vector3.TransformCoordinates(new Vector3(0, config.dimensions.height / 2, .035), rotation)
    .add(new Vector3(config.position.x, config.position.y, config.position.z));
  return solveArm(anchor, normal, target, mount.maxReach);
}

function solveArm(anchor: Vector3, normal: Vector3, target: Vector3, maxReach: number) {
  const start = anchor.add(normal.scale(.035));
  const reach = Vector3.Distance(start, target);
  // A shallow raised elbow resembles an articulated gas arm and avoids a long desk support post.
  const bend = Math.min(.075, Math.sqrt(Math.max(0, maxReach ** 2 - reach ** 2)) / 2);
  const elbow = Vector3.Center(start, target).add(new Vector3(0, bend, 0));
  return { anchor, normal, start, target, elbow, reach };
}

/** Conservative joint/link footprints shared by walking and architecture clearance checks. */
export function wallMountFootprints(config: FurnitureConfig, room: RoomConfig) {
  const arm = monitorMountGeometry(config, room), mount = config.monitor!.wallMount!;
  const alongX = mount.wall === 'north' || mount.wall === 'south';
  return [{
    id: config.id, support: true, x: arm.anchor.x + arm.normal.x * .008, z: arm.anchor.z + arm.normal.z * .008,
    bottom: mount.height - .073, top: mount.height + .073, width: .1, depth: .016, rotation: alongX ? 0 : 90,
  }, ...[[arm.start,arm.elbow],[arm.elbow,arm.target]].map(([a,b]) => ({
    id: config.id, support: true, x: (a.x+b.x)/2, z: (a.z+b.z)/2, bottom: Math.min(a.y,b.y)-.024, top: Math.max(a.y,b.y)+.024,
    width: Math.hypot(b.x-a.x,b.z-a.z)+.048, depth: .048, rotation: Math.atan2(a.z-b.z,b.x-a.x)*180/Math.PI,
  }))];
}

/** Supports remain selectable with their screen, but do not count towards its panel dimensions. */
export function createWallMonitorArm(scene: Scene, config: FurnitureConfig, room: RoomConfig, root: Mesh, material: StandardMaterial) {
  const mount = config.monitor!.wallMount!;
  const initial = monitorMountGeometry(config, room);
  const meshes: Mesh[] = [];
  const support = (mesh: Mesh) => {
    mesh.metadata = { furnitureId: config.id, wallMountSupport: true, wall: mount.wall };
    mesh.material = material; mesh.receiveShadows = true; mesh.parent = root;
    meshes.push(mesh); return mesh;
  };
  const plate = support(box(scene, `${config.id} · wall mounting plate`, .10, .145, .016,
    0, 0, 0, material, root));

  const link = (name: string) => support(MeshBuilder.CreateCylinder(`${config.id} · ${name}`, {
      diameter: .027, height: 1, tessellation: 12,
    }, scene));
  const inner = link('wall arm inner link'), outer = link('wall arm outer link');
  const joints = ['wall pivot', 'arm elbow', 'VESA joint'].map(name =>
    support(MeshBuilder.CreateSphere(`${config.id} · ${name}`, { diameter: .047, segments: 8 }, scene)));
  support(box(scene, `${config.id} · VESA mounting plate`, .075, .075, .012, 0, config.dimensions.height / 2, .0235, material, root));

  const update = () => {
    // Read the live transform instead of the saved config so a gizmo never pulls the wall plate away.
    const matrix = root.computeWorldMatrix(true), inverse = Matrix.Invert(matrix);
    const local = (point: Vector3) => Vector3.TransformCoordinates(point, inverse);
    const target = Vector3.TransformCoordinates(new Vector3(0, config.dimensions.height / 2, .035), matrix);
    const geometry = solveArm(initial.anchor, initial.normal, target, mount.maxReach);
    plate.position = local(geometry.anchor.add(geometry.normal.scale(.008)));
    const localNormal = Vector3.TransformNormal(initial.normal, inverse);
    plate.rotation.y = Math.atan2(localNormal.x, localNormal.z);
    const placeLink = (mesh: Mesh, a: Vector3, b: Vector3) => {
      const from = local(a), to = local(b), direction = to.subtract(from), length = direction.length();
      mesh.position = Vector3.Center(from, to); mesh.scaling.y = length;
      mesh.rotationQuaternion = Quaternion.FromUnitVectorsToRef(Vector3.Up(), direction.scale(1 / Math.max(length, .000001)), Quaternion.Identity());
    };
    placeLink(inner, geometry.start, geometry.elbow); placeLink(outer, geometry.elbow, geometry.target);
    [geometry.start, geometry.elbow, geometry.target].forEach((point, index) => { joints[index].position = local(point); });
  };
  update();
  const observer = scene.onBeforeRenderObservable.add(update);
  root.onDisposeObservable.addOnce(() => { scene.onBeforeRenderObservable.remove(observer); });
  return meshes;
}
