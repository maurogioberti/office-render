import test from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { createCanvas } from '@napi-rs/canvas';

test('planner integration: startup, numeric edits, undo, mode switch, room rebuild and persistence', async () => {
  // DOM and canvas test doubles exercise application wiring without claiming browser/WebGL QA.
  const dom = new Window({url:'http://127.0.0.1:5173/'});
  for(const key of ['window','document','navigator','HTMLElement','HTMLCanvasElement','Element','Node','Event','MouseEvent','KeyboardEvent','ResizeObserver','localStorage','FormData','AbortController']) {
    Object.defineProperty(globalThis,key,{configurable:true,writable:true,value:key==='window'?dom:(dom as any)[key]});
  }
  const canvases=new WeakMap<object,ReturnType<typeof createCanvas>>();
  dom.HTMLCanvasElement.prototype.getContext=function(type: string) {
    if(type!=='2d') return null;
    if(!canvases.has(this)) canvases.set(this,createCanvas(this.width || 300,this.height || 150));
    return canvases.get(this)!.getContext('2d') as any;
  } as any;
  dom.document.body.innerHTML='<div id="app"></div>';
  const {NullEngine}=await import('@babylonjs/core');
  const {Planner}=await import('../src/planner');
  const engine=new NullEngine(); engine.runRenderLoop=()=>{};
  const planner=new Planner(()=>engine);
  const button=(selector:string)=>{const element=dom.document.querySelector(selector); assert.ok(element,selector); (element as any).click();};
  const field=(selector:string,value:string)=>{
    const input=dom.document.querySelector(selector) as any; assert.ok(input,selector); input.value=value; input.dispatchEvent(new dom.Event('change',{bubbles:true}));
  };
  const saved=()=>JSON.parse(dom.localStorage.getItem('roomwork.office.v1')!);
  try {
    assert.equal(dom.document.querySelector('.object-title h2')!.textContent,'Privacy screen');
    assert.equal(dom.document.querySelectorAll('.object-row').length,7);
    assert.equal(dom.document.querySelectorAll('i[data-lucide]').length,0,'Lucide placeholders should have been replaced');
    field('[data-group="position"][data-field="x"]','-0.40');
    assert.equal(saved().furniture.find((f:any)=>f.id==='divider').position.x,-.4);
    button('[data-action="undo"]'); assert.equal(saved().furniture.find((f:any)=>f.id==='divider').position.x,-.5);
    button('[data-action="redo"]'); assert.equal(saved().furniture.find((f:any)=>f.id==='divider').position.x,-.4);
    const gizmo=(planner as any).gizmos.gizmos.positionGizmo;
    gizmo.onDragStartObservable.notifyObservers({});
    (planner as any).furniture.get('divider').root.position.x=-.35;
    gizmo.onDragEndObservable.notifyObservers({});
    assert.equal(saved().furniture.find((f:any)=>f.id==='divider').position.x,-.35,'Gizmo drag commits to centralized state');
    dom.document.querySelector('#scene-canvas')!.dispatchEvent(new dom.KeyboardEvent('keydown',{code:'ArrowRight',bubbles:true}));
    assert.ok(Math.abs(saved().furniture.find((f:any)=>f.id==='divider').position.x+.3)<1e-8,'Arrow keys nudge the selected object');
    assert.ok(!(planner as any).navigation.edit.inputs.attached.keyboard,'Arrow keys must not also orbit the camera');
    field('[data-group="dimensions"][data-field="width"]','10');
    assert.equal(saved().furniture.find((f:any)=>f.id==='divider').dimensions.width,1.65);
    assert.match(dom.document.querySelector('#toast')!.textContent!,/outside the room/);
    button('[data-mode="walk"]'); assert.ok(dom.document.querySelector('#app')!.classList.contains('walking'));
    assert.ok(!(dom.document.querySelector('#walk-overlay') as any).hidden);
    button('[data-mode="edit"]'); assert.ok(!dom.document.querySelector('#app')!.classList.contains('walking'));
    button('[data-select="desk"]'); field('[data-group="dimensions"][data-field="height"]','0.80');
    assert.equal(saved().furniture.find((f:any)=>f.id==='monitor-left').position.y,.8);
    button('[data-action="rotate"]'); assert.equal(dom.document.querySelector('[data-tool="rotate"]')!.getAttribute('aria-pressed'),'true');
    button('[data-action="settings"]');
    const form=dom.document.querySelector('#room-form')!;
    (form.querySelector('[name="height"]') as any).value='2.70';
    form.dispatchEvent(new dom.Event('submit',{bubbles:true,cancelable:true}));
    assert.equal(saved().room.height,2.7); assert.equal(saved().room.beams[0].enabled,false);
    assert.equal(saved().room.cornerFeatures[0].enabled,false);
    button('[data-visibility="desk"]'); assert.equal(saved().furniture.find((f:any)=>f.id==='desk').visible,false);
    // Exercise a scene frame: world matrices, active camera, shadows and gizmo setup.
    (planner as any).scene.render();
  } finally { planner.dispose(); await dom.happyDOM.close(); }
});
