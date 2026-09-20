import { ArcRotateCamera, Color4, Engine, Scene, Vector3 } from '@babylonjs/core';
import { freshConfig } from '../config/office';
import { createMaterials } from '../materials';
import { createRoom } from '../room/geometry';
import { createArchitecture } from '../architecture/features';
import { createFurniture } from '../furniture';
import { aimDaylight, createLighting } from '../lighting';
import { SLEEPERS, type StudyState, type StudyWall } from './config';
import { analyze } from './analysis';
import { createSleeper } from './geometry';
import { studyPlan } from './plan';
import './style.css';

const host=document.querySelector<HTMLDivElement>('#study')!;
host.innerHTML=`<header><a href="/">◇ roomwork</a><span>Sofa-bed feasibility <small>Separate study · office locked</small></span><a href="/">Back to planner ↗</a></header>
<main><aside><h1>A place to stay.</h1><p>Real-scale sleepers in the existing room. No workstation objects move between states.</p>
<label>Candidate<select id="candidate">${SLEEPERS.map(s=>`<option value="${s.id}">${s.name}</option>`).join('')}</select></label>
<label>Back wall · provisional<select id="wall"><option value="north">North · opposite the window</option><option value="east">East · door wall / conflict trial</option></select></label>
<label>State<select id="state"><option value="daily">01 · Daily / closed</option><option value="seating">02 · Seating / chair access</option><option value="sleeping">03 · Sleeping / fully extended</option></select></label>
<div class="buttons"><button id="perspective">Perspective</button><button id="top">3D top view</button><button id="plan">Dimensioned plan</button></div>
<div id="metrics" aria-live="polite"></div><button id="download">Download this study report</button>
<p class="notice">Placement and door handing are unconfirmed. The study checks both inward handings; it does not change the room’s static door. Dashed floor outlines show closed and fully open envelopes.</p>
<a id="source" target="_blank" rel="noreferrer">Product dimensions ↗</a></aside>
<section id="viewport"><canvas id="scene" aria-label="Interactive sofa feasibility scene"></canvas><div id="plan-view" hidden></div><div class="caption">Drag to orbit · scroll to zoom · all dimensions in meters</div></section></main>`;
const config=freshConfig(),locked=JSON.stringify(config),canvas=document.querySelector<HTMLCanvasElement>('#scene')!;
const engine=new Engine(canvas,true),scene=new Scene(engine);scene.clearColor=new Color4(.92,.935,.91,1);
const materials=createMaterials(scene,config.room),room=createRoom(scene,config.room,materials);
const architecture=createArchitecture(scene,config.room,materials,room);createFurniture(scene,config.furniture,materials,config.room);
const lighting=createLighting(scene);aimDaylight(lighting.sun,config.room);
room.ceiling.setEnabled(false);
const camera=new ArcRotateCamera('Study orbit',-.9,1.0,6.7,new Vector3(0,.5,0),scene);
camera.minZ=.05;camera.lowerRadiusLimit=2;camera.upperRadiusLimit=10;camera.wheelPrecision=35;camera.attachControl(canvas,true);
let sleeper:ReturnType<typeof createSleeper>|undefined,mode:'perspective'|'top'|'plan'='perspective';
let current:ReturnType<typeof analyze>;
const select=(id:string)=>(document.getElementById(id) as HTMLSelectElement).value;
const cache=new Map<string,ReturnType<typeof analyze>>();
function view(next:typeof mode){mode=next;document.getElementById('plan-view')!.hidden=mode!=='plan';canvas.hidden=mode==='plan';
  for(const wall of ['north','south','east','west'] as const)room.groups[wall].setEnabled(mode==='top'||wall==='south'||wall==='west');
  room.meshes.filter(m=>m.parent).forEach(m=>m.setEnabled(mode!=='top'));
  architecture.filter(m=>m.metadata?.architectureId).forEach(m=>m.setEnabled(mode!=='top'));
  if(mode==='top'){camera.setTarget(Vector3.Zero());camera.alpha=-Math.PI/2;camera.beta=.001;camera.radius=5.8;}
  if(mode==='perspective'){camera.setTarget(new Vector3(0,.5,0));camera.alpha=.85;camera.beta=.85;camera.radius=7.7;}
  engine.resize();
}
function update(){
  const spec=SLEEPERS.find(s=>s.id===select('candidate'))!,wall=select('wall') as StudyWall,state=select('state') as StudyState,key=`${spec.id}-${wall}-${state}`;
  current=cache.get(key)??analyze(spec,wall,state,config);cache.set(key,current);
  sleeper?.dispose();sleeper=createSleeper(scene,spec,wall,state,config);
  lighting.shadows.getShadowMap()!.renderList=[];
  for(const mesh of scene.meshes)if(mesh.isVisible)lighting.shadows.addShadowCaster(mesh);
  const c=current.clearances,cm=(n:number)=>(n*100).toFixed(1)+' cm',trials=current.doorTrials;
  document.getElementById('metrics')!.innerHTML=`<h2 class="${current.verdict==='conflict'?'conflict':''}">${current.verdict}</h2><dl>
  <dt>Closed / chaise</dt><dd>${spec.width.toFixed(2)} × ${spec.depth.toFixed(2)} / ${spec.chaiseDepth.toFixed(2)} m</dd>
  <dt>Sleeping surface</dt><dd>${spec.bedLength.toFixed(2)} × ${spec.bedWidth.toFixed(2)} m</dd>
  <dt>Full open depth</dt><dd>${spec.openDepth.toFixed(2)} m</dd>
  <dt>Desk clearance</dt><dd>${cm(c.sofaToDesk)}</dd><dt>Chair clearance</dt><dd>${cm(c.sofaToChair)}</dd>
  <dt>Door opening gap</dt><dd>${cm(c.sofaToDoorOpening)}</dd><dt>Existing jamb opening</dt><dd>${cm(c.doorJamb)}</dd>
  <dt>Exit route · worst handing</dt><dd>${cm(Math.min(...trials.map(t=>t.exit.width)))}</dd>
  <dt>Desk approach route</dt><dd>${cm(Math.min(...trials.map(t=>t.work.width)))}</dd>
  <dt>Window approach route</dt><dd>${cm(Math.min(...trials.map(t=>t.window.width)))}</dd>
  <dt>Chair rearward travel tested</dt><dd>${cm(c.chairRearwardTravelTested)}</dd></dl>
  <p>${trials.every(t=>t.firstCollisionDegrees===null)?'Both trial door handings clear the sofa through 90°.':'Door sweep conflicts: '+trials.map(t=>`${t.hinge} hinge ${t.firstCollisionDegrees===null?'clear':`first collision at ${t.firstCollisionDegrees}°`}`).join('; ')+'.'}</p>
  <p>${state==='sleeping'&&trials.some(t=>t.work.width===0)?'Sleeping blocks the normal chair approach. The chair remains fixed; the bed exit is checked separately.':''}</p>
  <p>${state==='seating'?'Sofa faces '+(wall==='north'?'the window wall':'the desk wall')+'. Future TV position is unconfirmed; viewing comfort is not yet validated.':''}</p>
  <p class="notice">${spec.qualification}</p><p>Route figures are clear widths along computed paths, not a global maximum or a safety certification. Door trials use 0.25° increments.</p>`;
  (document.getElementById('source') as HTMLAnchorElement).href=spec.source;
  document.getElementById('plan-view')!.innerHTML=studyPlan(config,spec,current);
  if(JSON.stringify(config)!==locked)throw Error('Study mutated the locked office');
  view(mode);
}
for(const id of ['candidate','wall','state'])document.getElementById(id)!.addEventListener('change',update);
for(const id of ['perspective','top','plan'] as const)document.getElementById(id)!.addEventListener('click',()=>view(id));
document.getElementById('download')!.addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(current,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=`${current.candidate}-${current.wall}-${current.state}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
const resize=()=>engine.resize();window.addEventListener('resize',resize);update();engine.runRenderLoop(()=>scene.render());
if(import.meta.hot)import.meta.hot.dispose(()=>{window.removeEventListener('resize',resize);sleeper?.dispose();scene.dispose();engine.dispose();});
