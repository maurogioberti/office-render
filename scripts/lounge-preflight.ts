import { mkdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { freshConfig } from '../src/config/office';
import type { PlannerConfig } from '../src/config/types';
import { deskOutline } from '../src/furniture/deskProfile';
import { worldTransform } from '../src/navigation/collision';

/** Necessary geometric conditions only. Does not invent a door swing or approve a layout. */
export function loungePreflight(config:PlannerConfig=freshConfig()) {
  const {room}=config,window=room.openings.find(o=>o.kind==='window')!,door=room.openings.find(o=>o.kind==='door')!;
  if(window.wall!=='south'||door.wall!=='east') throw new Error('Re-evaluate the study axes for the changed opening walls.');
  const tv={width:1.12,height:.65,depth:.07},sofa={minimumWidth:1.90,maximumWidth:2.05,minimumDepth:.80,minimumChaiseDepth:1.20};
  const windowStart=window.offset-window.width/2,windowEnd=window.offset+window.width/2;
  const doorStart=door.offset-door.width/2,doorEnd=door.offset+door.width/2;
  const windowLeftStrip=room.length/2-windowEnd;
  const doorWallRuns={south:doorStart+room.width/2,north:room.width/2-doorEnd};
  return {
    status:'preflight-only; wall assignment and door swing await confirmation',units:'meters',
    room:{length:room.length,width:room.width,height:room.height},
    interpretation:{tv:'Left when facing the south/window wall from inside = east/entrance side.',sofa:'Door-wall result is conditional: the requested front wall has not yet been identified.'},
    tv:{...tv,windowStart,windowEnd,solidStripWidth:windowLeftStrip,flatParkingShortfall:tv.width-windowLeftStrip,
      highestCenterBelowWindowWith50mmGap:window.sill-tv.height/2-.05,
      minimumBare43InchPanelWidth:43*.0254*16/Math.sqrt(16**2+9**2),
      qualification:'A low TV extending BELOW the opening is not excluded by the strip-width test; its arm, window access and full door sweep still need checking.'},
    sofa:{...sofa,doorStart,doorEnd,doorWallRuns,bestDoorWallRun:Math.max(...Object.values(doorWallRuns)),
      minimumDoorOverlapIfBackOnDoorWall:sofa.minimumWidth-Math.max(...Object.values(doorWallRuns)),
      qualification:'Minimum-size bounding box only, not a selected or verified sleeper product. No sofa is installed.'},
    door:{openingWidth:door.width,renderedJambClearWidth:door.width-2*.065,
      modeledLeafWidth:door.width-.10,hinge:null,openingDirection:null,maximumVerifiedAngle:null,
      qualification:'The current architecture uses 65 mm jambs and a static closed leaf; no hinge or opening state is configured. Nominal opening width is not clear passage width.'},
    fiber:{height:null,qualification:'Horizontal reference remains the AC center; the conflicting entry-height description is unresolved. No fiber object is moved or invented.'},
    states:['daily-office','tv','sleep'].map(id=>({id,status:'not certified',doorAngle:null,narrowestCirculation:null,viewingDistance:null,
      reason:'Requested wall assignment and door motion are unresolved. If the sofa backs onto the door wall, even its minimum width fails before any bed or TV movement is considered.'})),
    lockedSceneModified:false,
  };
}

export function preflightPlan(config:PlannerConfig=freshConfig()) {
  const report=loungePreflight(config),scale=180,X=(x:number)=>95+(x+config.room.length/2)*scale,Z=(z:number)=>120+(config.room.width/2-z)*scale;
  const esc=(s:string)=>s.replaceAll('&','&amp;').replaceAll('<','&lt;');
  const line=(x1:number,z1:number,x2:number,z2:number,color='#536150',width=2,dash='')=>`<line x1="${X(x1)}" y1="${Z(z1)}" x2="${X(x2)}" y2="${Z(z2)}" stroke="${color}" stroke-width="${width}" stroke-dasharray="${dash}"/>`;
  const label=(x:number,z:number,text:string,color='#263027',size=14)=>`<text x="${X(x)}" y="${Z(z)}" fill="${color}" font-size="${size}">${esc(text)}</text>`;
  const rect=(x:number,z:number,w:number,d:number,fill:string,stroke='#69715f',dash='')=>`<rect x="${X(x)}" y="${Z(z+d)}" width="${w*scale}" height="${d*scale}" fill="${fill}" stroke="${stroke}" stroke-dasharray="${dash}"/>`;
  const halfX=config.room.length/2,halfZ=config.room.width/2,desk=config.furniture.find(f=>f.id==='desk')!;
  const outline=deskOutline(desk).map(p=>`${X(p.x+desk.position.x)},${Z(p.z+desk.position.z)}`).join(' ');
  const furniture=config.furniture.filter(f=>['chair','pc','monitor','laptop'].includes(f.kind)).map(f=>{
    const t=worldTransform(f,config.furniture),r=t.rotation*Math.PI/180;
    const corners=[[-1,-1],[-1,1],[1,1],[1,-1]].map(([sx,sz])=>{const x=sx*f.dimensions.width/2,z=sz*f.dimensions.depth/2;return `${X(t.position.x+x*Math.cos(r)+z*Math.sin(r))},${Z(t.position.z-x*Math.sin(r)+z*Math.cos(r))}`;});
    return `<polygon points="${corners.join(' ')}" fill="${f.kind==='chair'?'#8b977f':f.kind==='pc'?'#58605c':'#648585'}" stroke="#35403b"/>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="820" viewBox="0 0 1100 820"><rect width="1100" height="820" fill="#fafbf7"/><g font-family="Arial, sans-serif">
  <text x="40" y="36" font-size="24" fill="#273027">TV / sleeper preflight — fixed room, no additions installed</text>
  <text x="40" y="65" font-size="15" fill="#8a3a2c">Red outline = failed door-wall trial, conditional on “front wall” meaning the door wall.</text>
  ${rect(-halfX,-halfZ,2*halfX,2*halfZ,'#f1ede0')}
  <polygon points="${outline}" fill="#c8aa7c" stroke="#8d704b"/>${furniture}
  ${rect(-halfX,-halfZ,.24,.20,'#d6d1c3')}
  ${rect(halfX-.80,halfZ-1.90,.80,1.90,'#f8e3dc','#b84f3d','7 5')}
  ${label(1.13,.34,'1.90 × 0.80 m', '#a43f31')}${label(1.13,.21,'minimum trial', '#a43f31')}
  ${line(report.tv.windowStart,-halfZ,report.tv.windowEnd,-halfZ,'#528da0',8)}
  ${line(halfX,report.sofa.doorStart,halfX,report.sofa.doorEnd,'#fafbf7',8)}
  ${line(halfX,report.sofa.doorStart,halfX,report.sofa.doorEnd,'#9b6343',3)}
  ${line(report.tv.windowEnd,-halfZ-.15,halfX,-halfZ-.15,'#b84f3d',3)}
  ${label(.89,-halfZ-.29,'0.725 m solid strip','#a43f31')}
  ${line(halfX+.16,report.sofa.doorEnd,halfX+.16,halfZ,'#b84f3d',3)}
  ${label(halfX+.23,.59,'1.550 m clear','#a43f31')}${label(halfX+.23,.43,'wall above door','#a43f31')}
  ${line(halfX-.08,halfZ-1.90,halfX-.08,report.sofa.doorEnd,'#b84f3d',9)}
  ${label(halfX+.23,-.47,'0.350 m overlap','#a43f31')}${label(halfX+.23,-.63,'with doorway','#a43f31')}
  ${label(-1.62,1.48,'NORTH — 3.80 m')}${label(-1.62,-1.73,'SOUTH — window / AC wall')}
  ${label(-1.70,.10,'Locked desk', '#473e2d')}${label(-.18,-1.43,'Window 0.95 m','#366b7b')}
  ${rect(config.room.airConditioner!.offset-.33,-halfZ,.66,.18,'#d9d8c8')}${label(-.53,-1.03,'AC projection', '#666653',12)}
  <text x="40" y="718" font-size="15">2.60 m between north/south walls. Window/door offsets and all workstation coordinates are unchanged.</text>
  <text x="40" y="746" font-size="15">Door opening: 0.82 m nominal; rendered jamb clearance: 0.69 m. Swing direction is not configured.</text>
  <text x="40" y="774" font-size="15">This is a necessary-condition study, not an approved installation or a completed movement-envelope analysis.</text>
  </g></svg>`;
}

if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  const config=freshConfig(),snapshot=JSON.stringify(config),report=loungePreflight(config);
  if(JSON.stringify(config)!==snapshot) throw new Error('Preflight changed the locked layout');
  mkdirSync('docs/lounge-study',{recursive:true});
  writeFileSync('docs/lounge-study/preflight.json',JSON.stringify(report,null,2)+'\n');
  const svg=preflightPlan(config);
  writeFileSync('docs/lounge-study/preflight-plan.svg',svg);
  const {createCanvas,loadImage}=await import('@napi-rs/canvas');
  const image=await loadImage(Buffer.from(svg)),canvas=createCanvas(1100,820);
  canvas.getContext('2d').drawImage(image,0,0);
  writeFileSync('docs/lounge-study/preflight-plan.png',canvas.toBuffer('image/png'));
  console.log(JSON.stringify(report,null,2));
}
