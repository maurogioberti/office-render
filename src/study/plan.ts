import type { PlannerConfig } from '../config/types';
import { deskOutline } from '../furniture/deskProfile';
import { worldTransform } from '../navigation/collision';
import { analyze, doorLeaf, type Rect } from './analysis';
import type { SleeperSpec } from './config';

export function studyPlan(config:PlannerConfig,spec:SleeperSpec,r:ReturnType<typeof analyze>) {
  const s=220,X=(x:number)=>80+(x+1.9)*s,Z=(z:number)=>120+(1.3-z)*s;
  const esc=(t:string)=>t.replaceAll('&','&amp;').replaceAll('<','&lt;');
  const text=(x:number,y:number,t:string,size=15,color='#34443c')=>`<text x="${x}" y="${y}" font-size="${size}" fill="${color}">${esc(t)}</text>`;
  const rect=(a:Rect,fill:string,stroke:string,dash='')=>`<rect x="${X(a.x0)}" y="${Z(a.z1)}" width="${(a.x1-a.x0)*s}" height="${(a.z1-a.z0)*s}" fill="${fill}" stroke="${stroke}" stroke-width="2" stroke-dasharray="${dash}"/>`;
  const line=(x:number,z:number,x2:number,z2:number,color='#667b71',dash='')=>`<line x1="${X(x)}" y1="${Z(z)}" x2="${X(x2)}" y2="${Z(z2)}" stroke="${color}" stroke-width="2" stroke-dasharray="${dash}"/>`;
  const metric=(v:number)=>(v*100).toFixed(1)+' cm';
  const desk=config.furniture.find(f=>f.id==='desk')!;
  const furniture=config.furniture.filter(f=>['monitor','laptop','chair','pc'].includes(f.kind)).map(f=>{
    const t=worldTransform(f,config.furniture),a=t.rotation*Math.PI/180;
    const pts=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([u,v])=>`${X(t.position.x+u*f.dimensions.width/2*Math.cos(a)+v*f.dimensions.depth/2*Math.sin(a))},${Z(t.position.z-u*f.dimensions.width/2*Math.sin(a)+v*f.dimensions.depth/2*Math.cos(a))}`);
    return `<polygon points="${pts.join(' ')}" fill="${f.kind==='chair'?'#687863':'#345755'}" stroke="#263e38"/>`;
  }).join('');
  const trial=r.doorTrials[0],leaf=doorLeaf(config,'south',90),a=leaf.rotation*Math.PI/180;
  const doorPts=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([u,v])=>`${X(leaf.x+u*leaf.width/2*Math.cos(a)+v*leaf.depth/2*Math.sin(a))},${Z(leaf.z-u*leaf.width/2*Math.sin(a)+v*leaf.depth/2*Math.cos(a))}`);
  const route=trial.exit.points.map(p=>`${X(p.x)},${Z(p.z)}`).join(' ');
  const window=config.room.openings.find(o=>o.kind==='window')!,door=config.room.openings.find(o=>o.kind==='door')!;
  const dim=(x:number,z:number,x2:number,z2:number,label:string)=>line(x,z,x2,z2)+text((X(x)+X(x2))/2+8,(Z(z)+Z(z2))/2-8,label,14);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="970" viewBox="0 0 1400 970"><rect width="1400" height="970" fill="#f7f8f3"/><g font-family="Arial,sans-serif">
  ${text(30,35,`${spec.name} / ${r.state} / back on ${r.wall} wall`,25)}${text(30,65,`${r.verdict.toUpperCase()} · fixed office · provisional wall assignment and door swing`,16,'#97542e')}
  ${rect({x0:-1.9,x1:1.9,z0:-1.3,z1:1.3},'#ece6d7','#6c7469')}
  <polygon points="${deskOutline(desk).map(p=>`${X(p.x+desk.position.x)},${Z(p.z+desk.position.z)}`).join(' ')}" fill="#c5a276" stroke="#98774e"/>${furniture}
  ${r.footprint.map(a=>rect(a,r.doorOverlap?'#dfaaa0':'#a2b8ae','#546f63')).join('')}
  ${r.closed.map(a=>rect(a,'none','#456f68','4 4')).join('')}${rect(r.openEnvelope,'none','#ad673a','10 5')}
  ${rect({x0:-1.9,x1:-1.66,z0:-1.3,z1:-1.1},'#cecbbf','#88887c')}
  ${rect({x0:-.63,x1:.03,z0:-1.3,z1:-1.12},'#babbb0','#7f8378')}
  ${line(window.offset-window.width/2,-1.3,window.offset+window.width/2,-1.3,'#3d96a7')}
  ${line(1.9,door.offset-door.width/2,1.9,door.offset+door.width/2,'#d28e58')}
  <polygon points="${doorPts.join(' ')}" fill="#b89570" stroke="#896743"/>
  <polyline points="${route}" fill="none" stroke="#318078" stroke-width="3" opacity=".8"/>
  ${dim(-1.9,1.43,1.9,1.43,'3.80 m')}${dim(-2.04,-1.3,-2.04,1.3,'2.60 m')}
  ${dim(2.07,r.openEnvelope.z0,2.07,r.openEnvelope.z1,`${(r.openEnvelope.z1-r.openEnvelope.z0).toFixed(2)} m`)}
  ${text(87,745,'SOUTH · window / AC wall',17)}${text(87,778,'Green dashed: closed footprint     Orange dashed: full opening allowance',16)}
  ${text(87,808,'Teal route: standing landing to doorway; south-hinged 90° trial shown.',15)}
  ${text(87,836,'Both inward handings checked at 0.25° steps. Existing door geometry unchanged.',15)}
  ${text(1010,140,'CLEARANCES',18)}
  ${['Door jamb: '+metric(r.clearances.doorJamb),'Sofa → opening: '+metric(r.clearances.sofaToDoorOpening),'Sofa → desk: '+metric(r.clearances.sofaToDesk),'Sofa → chair: '+metric(r.clearances.sofaToChair),'South aisle: '+metric(r.clearances.southAisle),'Exit route: '+metric(trial.exit.width),'Desk approach route: '+metric(trial.work.width),'Window route: '+metric(trial.window.width)].map((t,i)=>text(1010,177+i*34,t)).join('')}
  ${text(1010,487,'SOFA / BED',18)}${text(1010,522,`Closed ${spec.width.toFixed(2)} × ${spec.depth.toFixed(2)} m`)}
  ${text(1010,553,`Chaise ${spec.chaiseDepth.toFixed(2)} m`)}${text(1010,584,`Bed ${spec.bedLength.toFixed(2)} × ${spec.bedWidth.toFixed(2)} m`)}
  ${text(1010,615,`Open depth ${spec.openDepth.toFixed(2)} m`)}
  ${text(30,907,'Study envelopes, not a purchase approval. Mini / LYCKSELE outer bed allowances and sofa internals require supplier confirmation.',15,'#8b5435')}
  ${text(30,936,'Chair has not been tucked or moved. Room, desk, all six monitors, laptop, arms, tower, AC and window are unchanged.',15)}
  </g></svg>`;
}
