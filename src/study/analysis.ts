import { freshConfig } from '../config/office';
import type { PlannerConfig } from '../config/types';
import { obstacles, rectanglesOverlap, type Obstacle } from '../navigation/collision';
import { STUDY, type SleeperSpec, type StudyState, type StudyWall } from './config';

export type Point = {x:number;z:number};
export type Rect = {x0:number;x1:number;z0:number;z1:number};
export const obstacle = (r:Rect,id:string,top=.85):Obstacle => ({id,x:(r.x0+r.x1)/2,z:(r.z0+r.z1)/2,width:r.x1-r.x0,depth:r.z1-r.z0,rotation:0,bottom:0,top});
export function placement(spec:SleeperSpec,wall:StudyWall,config:PlannerConfig) {
  const east=config.room.length/2-STUDY.wallGap,north=config.room.width/2-STUDY.wallGap;
  // u follows the long back; v projects forward into the room. Left chaise as seated.
  const point=(u:number,v:number):Point=>wall==='north'?{x:east-spec.width+u,z:north-v}:{x:east-v,z:north-u};
  const rect=(u0:number,u1:number,v0:number,v1:number):Rect=>{
    const a=point(u0,v0),b=point(u1,v1);return {x0:Math.min(a.x,b.x),x1:Math.max(a.x,b.x),z0:Math.min(a.z,b.z),z1:Math.max(a.z,b.z)};
  };
  const closed=[rect(0,spec.width,0,spec.depth)];
  if(spec.chaiseWidth) closed.push(rect(spec.width-spec.chaiseWidth,spec.width,spec.depth,spec.chaiseDepth));
  const envelope=rect(0,spec.width,0,spec.openDepth);
  return {point,rect,closed,envelope};
}
export function doorLeaf(config:PlannerConfig,hinge:'south'|'north',angle:number):Obstacle {
  const door=config.room.openings.find(o=>o.kind==='door')!;
  const length=door.width-.10,sign=hinge==='south'?1:-1,r=angle*Math.PI/180;
  return {id:`trial-${hinge}-hinged-door`,x:config.room.length/2+config.room.wallThickness/2-Math.sin(r)*length/2,
    z:door.offset-sign*length/2+sign*Math.cos(r)*length/2,width:.045,depth:length,
    bottom:0,top:door.height-.05,rotation:-sign*angle};
}
function corners(o:Obstacle):Point[] {
  const r=o.rotation*Math.PI/180;
  return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([a,b])=>({x:o.x+a*o.width/2*Math.cos(r)+b*o.depth/2*Math.sin(r),z:o.z-a*o.width/2*Math.sin(r)+b*o.depth/2*Math.cos(r)}));
}
export function pointDistance(p:Point,o:Obstacle) {
  const r=o.rotation*Math.PI/180,dx=p.x-o.x,dz=p.z-o.z;
  return Math.hypot(Math.max(0,Math.abs(dx*Math.cos(r)-dz*Math.sin(r))-o.width/2),Math.max(0,Math.abs(dx*Math.sin(r)+dz*Math.cos(r))-o.depth/2));
}
function pointSegment(p:Point,a:Point,b:Point) {
  const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz||1)));
  return Math.hypot(p.x-a.x-t*dx,p.z-a.z-t*dz);
}
function segmentDistance(a:Point,b:Point,c:Point,d:Point) {
  const cross=(p:Point,q:Point,r:Point)=>(q.x-p.x)*(r.z-p.z)-(q.z-p.z)*(r.x-p.x);
  if(cross(a,b,c)*cross(a,b,d)<0 && cross(c,d,a)*cross(c,d,b)<0)return 0;
  return Math.min(pointSegment(a,c,d),pointSegment(b,c,d),pointSegment(c,a,b),pointSegment(d,a,b));
}
function rectDistance(a:Obstacle,b:Obstacle) {
  if(rectanglesOverlap({...a,bottom:0,top:1},{...b,bottom:0,top:1}))return 0;
  const ac=corners(a),bc=corners(b);
  return Math.min(...ac.flatMap((p,i)=>bc.map((q,j)=>segmentDistance(p,ac[(i+1)%4],q,bc[(j+1)%4]))));
}
function boundary(config:PlannerConfig) {
  const x=config.room.length/2,z=config.room.width/2,door=config.room.openings.find(o=>o.kind==='door')!;
  const lo=door.offset-door.width/2+.065,hi=door.offset+door.width/2-.065;
  return [obstacle({x0:-x-.2,x1:-x,z0:-z-.2,z1:z+.2},'west',3),obstacle({x0:-x,x1:x+.3,z0:z,z1:z+.2},'north',3),
    obstacle({x0:-x,x1:x+.3,z0:-z-.2,z1:-z},'south',3),
    obstacle({x0:x,x1:x+.3,z0:-z,z1:lo},'east-south-jamb',3),obstacle({x0:x,x1:x+.3,z0:hi,z1:z},'east-north-jamb',3)];
}

/** Widest grid route, then exact distance from its segments to each OBB edge.
 * The grid locates a route; it is not a proof that no better continuous route exists. */
export function route(config:PlannerConfig,items:Obstacle[],target:Point) {
  const step=STUDY.gridStep,x0=-config.room.length/2,z0=-config.room.width/2;
  const nx=Math.round((config.room.length+.2)/step)+1,nz=Math.round(config.room.width/step)+1;
  const at=(i:number):Point=>({x:x0+(i%nx)*step,z:z0+Math.floor(i/nx)*step});
  const index=(p:Point)=>Math.round((p.z-z0)/step)*nx+Math.round((p.x-x0)/step);
  const door=config.room.openings.find(o=>o.kind==='door')!,start=index({x:config.room.length/2+.1,z:door.offset}),end=index(target);
  const obs=[...items,...boundary(config)],clearance=new Float64Array(nx*nz);
  for(let i=0;i<clearance.length;i++)clearance[i]=Math.min(...obs.map(o=>pointDistance(at(i),o)));
  const best=new Float64Array(nx*nz),previous=new Int32Array(nx*nz).fill(-1),heap:{i:number;s:number}[]=[];
  const push=(i:number,s:number)=>{heap.push({i,s});let n=heap.length-1;while(n){const p=(n-1)>>1;if(heap[p].s>=s)break;[heap[p],heap[n]]=[heap[n],heap[p]];n=p;}};
  const pop=()=>{const top=heap[0],last=heap.pop()!;if(heap.length){heap[0]=last;let n=0;while(n*2+1<heap.length){let c=n*2+1;if(c+1<heap.length&&heap[c+1].s>heap[c].s)c++;if(heap[n].s>=heap[c].s)break;[heap[n],heap[c]]=[heap[c],heap[n]];n=c;}}return top;};
  best[start]=clearance[start];push(start,best[start]);
  while(heap.length){const {i,s}=pop();if(s<best[i])continue;if(i===end)break;
    for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const x=i%nx+dx,z=Math.floor(i/nx)+dz;if(x<0||x>=nx||z<0||z>=nz)continue;
      const j=z*nx+x,value=Math.min(s,clearance[j]-step/2);if(value<=best[j])continue;
      best[j]=value;previous[j]=i;push(j,value);
    }
  }
  if(best[end]<=0)return {width:0,points:[] as Point[],qualification:'No route to this target on the 20 mm grid.'};
  const points:Point[]=[];for(let i=end;i!==-1;i=previous[i]){points.push(at(i));if(i===start)break;}points.reverse();
  let radius=Infinity;
  for(let i=1;i<points.length;i++) for(const o of obs){const c=corners(o);radius=Math.min(radius,pointDistance(points[i-1],o),...c.map((p,j)=>segmentDistance(points[i-1],points[i],p,c[(j+1)%4])));}
  return {width:radius*2,points,qualification:'Exact clearance of the computed polyline in this model; 20 mm search grid, not a global optimum or safety certification.'};
}

export function analyze(spec:SleeperSpec,wall:StudyWall,state:StudyState,config=freshConfig()) {
  if(config.room.openings.find(o=>o.kind==='door')?.wall!=='east')throw Error('Study requires the locked east-door layout.');
  const p=placement(spec,wall,config),footprint=state==='sleeping'?[p.envelope]:p.closed;
  const sofa=footprint.map((r,i)=>obstacle(r,`sofa-${i}`,state==='sleeping'?.45:spec.height));
  const fixed=obstacles(config).filter(o=>o.bottom<1.8 && o.top>.08);
  const collisions=[...new Set(sofa.flatMap(s=>fixed.filter(o=>rectanglesOverlap(s,o)).map(o=>o.id)))];
  const door=config.room.openings.find(o=>o.kind==='door')!;
  const portal=obstacle({x0:config.room.length/2-.12,x1:config.room.length/2+.12,z0:door.offset-door.width/2,z1:door.offset+door.width/2},'doorway',door.height);
  const doorOverlap=sofa.some(s=>rectanglesOverlap(s,portal));
  const swing=(['south','north'] as const).map(hinge=>{
    let firstCollision:number|null=null,minGap=Infinity;
    for(let angle=0;angle<=90;angle+=.25){const leaf=doorLeaf(config,hinge,angle);minGap=Math.min(minGap,...sofa.map(s=>rectDistance(s,leaf)));if(firstCollision===null&&sofa.some(s=>rectanglesOverlap(s,leaf)))firstCollision=angle;}
    const all=[...fixed,...sofa,doorLeaf(config,hinge,90)];
    const work=route(config,all,{x:.06,z:-.1}),window=route(config,all,{x:.7,z:-.9});
    // Test front AND exposed side landings. Do not declare a bed trapped just because
    // its foot is narrow when a long side provides a usable way out.
    const depth=state==='sleeping'?spec.openDepth:spec.depth;
    const landings=[{edge:'front',point:p.point(spec.width*.45,depth+.40)},
      {edge:'left side',point:p.point(spec.width+.40,depth*.55)},
      {edge:'right side',point:p.point(-.40,depth*.55)}];
    const exits=landings.filter(l=>Math.abs(l.point.x)<config.room.length/2 && Math.abs(l.point.z)<config.room.width/2)
      .map(l=>({...route(config,all,l.point),edge:l.edge}));
    const exit=exits.sort((a,b)=>b.width-a.width)[0] ?? {width:0,points:[],edge:'none',qualification:'No in-room landing.'};
    return {hinge,firstCollisionDegrees:firstCollision,minimumSofaGap:minGap,work,window,exit};
  });
  const nearest=(id:string)=>Math.min(...sofa.flatMap(s=>fixed.filter(o=>o.id===id).map(o=>rectDistance(s,o))));
  const doorClear=config.room.width/2-(door.offset+door.width/2);
  const chair=fixed.find(o=>o.id==='chair')!;
  let chairRearwardTravel=0;
  for(let d=.01;d<=.601;d+=.01){if([...sofa,...fixed.filter(o=>o.id!=='chair')].some(o=>rectanglesOverlap({...chair,x:chair.x+d},o)))break;chairRearwardTravel=d;}
  return {candidate:spec.id,wall,state,units:'m',assumptions:{wallConfirmed:false,doorHandingConfirmed:false,wallGap:STUDY.wallGap},
    closed:p.closed,openEnvelope:p.envelope,footprint,collisions,doorOverlap,
    clearances:{doorJamb:door.width-.13,sofaToDoorOpening:Math.min(...sofa.map(s=>rectDistance(s,portal))),sofaToDesk:nearest('desk'),sofaToChair:nearest('chair'),
      southAisle:Math.min(...footprint.map(r=>r.z0))+config.room.width/2,chairRearwardTravelTested:chairRearwardTravel,doorWallRun:doorClear,doorWallWidthShortfall:Math.max(0,spec.width+STUDY.wallGap-doorClear)},
    doorTrials:swing,
    verdict:collisions.length||doorOverlap?'conflict':swing.some(t=>t.firstCollisionDegrees!==null||t.exit.width<STUDY.desiredRouteWidth||t.window.width<STUDY.desiredRouteWidth||(state!=='sleeping'&&t.work.width<STUDY.desiredRouteWidth))?'restricted / conditional':'conditional geometric fit',
    qualification:'Fixed office unchanged. Unknown real door handing and supplier mechanism tolerances prevent final installation approval.',
  };
}
