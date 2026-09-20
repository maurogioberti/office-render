import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { Matrix, Mesh, NullEngine, Scene, Vector3 } from '@babylonjs/core';
import { freshConfig } from '../src/config/office';
import { validateConfig } from '../src/config/storage';
import { createFurniture } from '../src/furniture';
import { createMaterials } from '../src/materials';
import { obstacles, rectanglesOverlap, worldTransform } from '../src/navigation/collision';
import type { FurnitureConfig, PlannerConfig } from '../src/config/types';

const mainIds=['monitor-portrait','monitor-left','monitor-center','monitor-right'];
const workIds=['work-monitor-left','work-monitor-right'];
type Point={x:number;z:number};
function footprint(item:FurnitureConfig,config:PlannerConfig):Point[] {
  const t=worldTransform(item,config.furniture),r=t.rotation*Math.PI/180;
  return [[-1,-1],[-1,1],[1,1],[1,-1]].map(([sx,sz])=>{
    const x=sx*item.dimensions.width/2,z=sz*item.dimensions.depth/2;
    return {x:t.position.x+x*Math.cos(r)+z*Math.sin(r),z:t.position.z-x*Math.sin(r)+z*Math.cos(r)};
  });
}
function range(points:Point[]) {
  return {minX:Math.min(...points.map(p=>p.x)),maxX:Math.max(...points.map(p=>p.x)),minZ:Math.min(...points.map(p=>p.z)),maxZ:Math.max(...points.map(p=>p.z))};
}
function segmentDistance(p:Point,a:Point,b:Point) {
  const x=b.x-a.x,z=b.z-a.z,t=Math.max(0,Math.min(1,((p.x-a.x)*x+(p.z-a.z)*z)/(x*x+z*z)));
  return Math.hypot(p.x-a.x-t*x,p.z-a.z-t*z);
}
function gap(a:Point[],b:Point[]) {
  return Math.min(...a.flatMap(p=>b.map((v,i)=>segmentDistance(p,v,b[(i+1)%4]))),...b.flatMap(p=>a.map((v,i)=>segmentDistance(p,v,a[(i+1)%4]))));
}
function meshBounds(mesh:Mesh) {
  mesh.computeWorldMatrix(true);
  const b=mesh.getBoundingInfo().boundingBox;
  return {minX:b.minimumWorld.x,maxX:b.maximumWorld.x,minY:b.minimumWorld.y,maxY:b.maximumWorld.y,minZ:b.minimumWorld.z,maxZ:b.maximumWorld.z};
}

/** Headless, meter-based fit audit of the current fixed desk. Throws on a dimensional conflict. */
export function auditWorkstation(input:PlannerConfig=freshConfig()) {
  const config=validateConfig(input),get=(id:string)=>config.furniture.find(f=>f.id===id)!;
  const desk=get('desk'),main=mainIds.map(get),work=workIds.map(get),laptop=get('work-laptop'),pc=get('pc');
  assert.equal(desk.rotation,0,'Audit axes require the locked desk orientation');
  assert.equal(config.furniture.filter(f=>f.kind==='monitor').length,6);
  assert.equal(config.furniture.filter(f=>f.kind==='laptop').length,1);
  for(const item of [...main,...work]) {
    assert.deepEqual(item.dimensions,item.monitor!.orientation==='portrait'?{width:.36,height:.612,depth:.052}:{width:.612,height:.36,depth:.052});
  }
  const deskBounds=range(footprint(desk,config)),mainBounds=range(main.flatMap(m=>footprint(m,config))),workBounds=range(work.flatMap(m=>footprint(m,config)));
  const mainEndX=deskBounds.minX+desk.cornerDesk!.worktopDepth,returnStartZ=deskBounds.maxZ-desk.cornerDesk!.returnWidth!;
  assert.ok(mainBounds.minZ>=deskBounds.minZ && mainBounds.maxZ<=deskBounds.maxZ && mainBounds.minX>=deskBounds.minX && mainBounds.maxX<=mainEndX,'Main four must fit the actual main strip');
  assert.ok(workBounds.minX>=deskBounds.minX && workBounds.maxX<=deskBounds.maxX && workBounds.minZ>=returnStartZ && workBounds.maxZ<=deskBounds.maxZ,'Work pair must remain above the right return');
  const gaps=[...main.slice(1).map((m,i)=>gap(footprint(main[i],config),footprint(m,config))),gap(footprint(work[0],config),footprint(work[1],config))];
  assert.ok(gaps.every(g=>g>=.02 && g<=.03),'Actual nearest casing gaps, including thickness, must be 20–30 mm');
  const cases=obstacles(config).filter(o=>[...mainIds,...workIds,'work-laptop','pc','chair'].includes(o.id)&&!o.support);
  for(let i=0;i<cases.length;i++) for(let j=i+1;j<cases.length;j++) assert.equal(rectanglesOverlap(cases[i],cases[j]),false,`${cases[i].id}/${cases[j].id} intersect`);
  const engine=new NullEngine(),scene=new Scene(engine);
  try {
    const objects=createFurniture(scene,config.furniture,createMaterials(scene,config.room,false),config.room);
    // Check the rendered bodies, not merely their configured selection envelopes.
    for(const item of [...main,...work]) {
      const object=objects.get(item.id)!,inverse=Matrix.Invert(object.root.computeWorldMatrix(true));
      assert.deepEqual(object.root.scaling.asArray(),[1,1,1],'No automatic screen rescaling');
      const points=object.meshes.filter(m=>/display shell|27 inch active panel/.test(m.name)).flatMap(m=>{
        m.computeWorldMatrix(true);return m.getBoundingInfo().boundingBox.vectorsWorld.map(p=>Vector3.TransformCoordinates(p,inverse));
      });
      for(const [axis,size] of [['x',item.dimensions.width],['y',item.dimensions.height],['z',item.dimensions.depth]] as const) {
        assert.ok(Math.abs(Math.max(...points.map(p=>p[axis]))-Math.min(...points.map(p=>p[axis]))-size)<.000001,`${item.id}: rendered ${axis} differs from casing dimensions`);
      }
    }
    const arms=[...objects.values()].flatMap(o=>o.meshes).filter(m=>m.metadata?.wallMountSupport||m.metadata?.sharedArmSupport);
    const renderedCases=[...main,...work].map(item=>({id:item.id,mesh:objects.get(item.id)!.meshes.find(m=>m.name.includes('display shell'))!}));
    for(const arm of arms) {
      arm.computeWorldMatrix(true);
      for(const body of renderedCases) {
        body.mesh.computeWorldMatrix(true);
        // A screen's own VESA plate intentionally contacts its case; other supports may not.
        if(!arm.name.startsWith(body.id+' ')) assert.equal(arm.intersectsMesh(body.mesh,true),false,`${arm.name} intersects ${body.id}`);
      }
    }
    const laptopBounds=range(footprint(laptop,config));
    for(const arm of arms) {
      const b=meshBounds(arm);
      assert.ok(b.maxX<=laptopBounds.minX || b.minX>=laptopBounds.maxX || b.maxZ<=laptopBounds.minZ || b.minZ>=laptopBounds.maxZ,`Laptop lies beneath/intersects ${arm.name}`);
    }
    // Natural inside corner, reserving 20 mm beyond the nearest rendered arm bounds.
    const wallArmEnd=Math.max(...arms.filter(m=>m.metadata?.wallMountSupport).map(meshBounds).filter(b=>b.maxZ>returnStartZ).map(b=>b.maxX));
    const workArmFront=Math.min(...arms.filter(m=>m.metadata?.sharedArmSupport).map(meshBounds).filter(b=>b.minX<mainEndX).map(b=>b.minZ));
    const corner={minX:Math.max(deskBounds.minX,wallArmEnd+.02),maxX:mainEndX,minZ:returnStartZ,maxZ:Math.min(deskBounds.maxZ,workArmFront-.02)};
    assert.ok(laptopBounds.minX>=corner.minX && laptopBounds.maxX<=corner.maxX && laptopBounds.minZ>=corner.minZ && laptopBounds.maxZ<=corner.maxZ,`No usable laptop corner: ${JSON.stringify({corner,laptopBounds})}`);
    const pcBounds=range(footprint(pc,config)),pcWorld=worldTransform(pc,config.furniture).position,chairBounds=range(footprint(get('chair'),config));
    const overhead=Math.min(...objects.get('desk')!.meshes.map(meshBounds).filter(b=>b.maxX>pcBounds.minX&&b.minX<pcBounds.maxX&&b.maxZ>pcBounds.minZ&&b.minZ<pcBounds.maxZ).map(b=>b.minY))-pcWorld.y-pc.dimensions.height;
    const step=obstacles(config).find(o=>o.id==='corner-step')!;
    const ventilation={rear:pcBounds.minZ+config.room.width/2,westSide:pcBounds.minX-(step.x+step.width/2),eastSide:config.room.length/2-pcBounds.maxX,frontToChair:chairBounds.minZ-pcBounds.maxZ,topToNearestSupport:overhead,topToWorktop:desk.dimensions.height-.045-pc.dimensions.height};
    assert.ok(ventilation.rear>=.10 && ventilation.westSide>=.05 && ventilation.eastSide>=.05 && ventilation.frontToChair>=.10 && overhead>=.10,'Tower ventilation clearance conflict');
    const ac=config.room.airConditioner!;
    return {
      units:'meters',monitors:[...main,...work].map(m=>({id:m.id,...m.dimensions,position:worldTransform(m,config.furniture).position,rotation:worldTransform(m,config.furniture).rotation})),
      main:{straightSum:main.reduce((n,m)=>n+m.dimensions.width,0)+.025*3,projectedSpan:mainBounds.maxZ-mainBounds.minZ,remaining:desk.dimensions.depth-(mainBounds.maxZ-mainBounds.minZ),leftClearance:mainBounds.minZ-deskBounds.minZ,rightClearance:deskBounds.maxZ-mainBounds.maxZ},
      work:{span:workBounds.maxX-workBounds.minX,returnSpan:desk.dimensions.width,endClearances:[workBounds.minX-deskBounds.minX,deskBounds.maxX-workBounds.maxX]},
      nearestHousingGaps:gaps,
      laptop:{rawCorner:{width:desk.cornerDesk!.worktopDepth,depth:desk.cornerDesk!.returnWidth},clearCorner:{...corner,width:corner.maxX-corner.minX,depth:corner.maxZ-corner.minZ},rotatedEnvelope:{width:laptopBounds.maxX-laptopBounds.minX,depth:laptopBounds.maxZ-laptopBounds.minZ},position:worldTransform(laptop,config.furniture).position,openingAngle:laptop.laptop!.openingAngle,verticalMonitorClearance:work[0].position.y+worldTransform(get('work-zone'),config.furniture).position.y-(worldTransform(laptop,config.furniture).position.y+laptop.dimensions.height)},
      tower:{position:pcWorld,dimensions:pc.dimensions,ventilation,acCasingLateralClearance:ac.offset-ac.width/2-pcBounds.maxX,acTrimLateralClearance:ac.offset-ac.width/2-ac.trimWidth-pcBounds.maxX},
      desk:{dimensions:desk.dimensions,position:desk.position,profile:desk.cornerDesk},room:{length:config.room.length,width:config.room.width,height:config.room.height},
    };
  } finally {scene.dispose();engine.dispose();}
}

if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) console.log(JSON.stringify(auditWorkstation(),null,2));
