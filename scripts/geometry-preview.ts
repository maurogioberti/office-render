import { existsSync } from 'node:fs';
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { Color3, LinesMesh, Mesh, Scene, StandardMaterial, Vector3, VertexBuffer } from '@babylonjs/core';
/** Software z-buffer preview of the same meshes used in the browser. */
export function geometryPreview(scene:Scene,view:{title:string;subtitle:string;eye:Vector3;target:Vector3;up:Vector3;ortho:number}) {
 const width=1440,height=1000,header=78,footer=42,viewHeight=height-header-footer;
 if(existsSync('C:/Windows/Fonts/arial.ttf'))GlobalFonts.registerFromPath('C:/Windows/Fonts/arial.ttf','Preview');
 if(existsSync('C:/Windows/Fonts/arialbd.ttf'))GlobalFonts.registerFromPath('C:/Windows/Fonts/arialbd.ttf','Preview Bold');
    const forward=view.target.subtract(view.eye).normalize(),right=Vector3.Cross(view.up,forward).normalize(),up=Vector3.Cross(forward,right).normalize();
    const focal=viewHeight/(2*Math.tan(.73/2));
    const project=(p:Vector3)=>{
      const v=p.subtract(view.eye),z=Vector3.Dot(v,forward),scale=view.ortho?width/view.ortho:focal/z;
      return {x:width/2+Vector3.Dot(v,right)*scale,y:viewHeight/2-Vector3.Dot(v,up)*scale,z};
    };
    const pixels=new Uint8ClampedArray(width*viewHeight*4),depth=new Float64Array(width*viewHeight);depth.fill(Infinity);
    for(let i=0;i<pixels.length;i+=4) {pixels[i]=233;pixels[i+1]=237;pixels[i+2]=232;pixels[i+3]=255;}
    const light=new Vector3(.4,1,.3).normalize();
    for(const mesh of scene.meshes) {
      if(!(mesh instanceof Mesh) || mesh instanceof LinesMesh || !mesh.isEnabled() || !mesh.isVisible) continue;
      const positions=mesh.getVerticesData(VertexBuffer.PositionKind),normals=mesh.getVerticesData(VertexBuffer.NormalKind),indices=mesh.getIndices();
      if(!positions || !indices) continue;
      const mat=mesh.material as StandardMaterial;
      if(mat?.alpha<.5) continue;
      const world=mesh.computeWorldMatrix(true),vertices:Vector3[]=[];
      for(let i=0;i<positions.length;i+=3) vertices.push(Vector3.TransformCoordinates(new Vector3(positions[i],positions[i+1],positions[i+2]),world));
      const projected=vertices.map(project),base=mat?.diffuseColor ?? Color3.Gray();
      // The production floor derives its beige color from a procedural texture. The preview
      // uses its neutral base tone and deliberately does not claim WebGL/shadow parity.
      const color=mesh.name.startsWith('Interior floor')?Color3.FromHexString('#e2d8bf'):base;
      for(let i=0;i<indices.length;i+=3) {
        const ia=indices[i],ib=indices[i+1],ic=indices[i+2],a=projected[ia],b=projected[ib],c=projected[ic];
        if(a.z<=.01 || b.z<=.01 || c.z<=.01) continue;
        const normal=normals?Vector3.TransformNormal(new Vector3(normals[ia*3],normals[ia*3+1],normals[ia*3+2]),world).normalize():Vector3.Up();
        const shade=.83+.17*Math.max(0,Vector3.Dot(normal,light));
        const rgb=[color.r,color.g,color.b].map(v=>Math.round(255*Math.min(1,v*shade)));
        const minX=Math.max(0,Math.floor(Math.min(a.x,b.x,c.x))),maxX=Math.min(width-1,Math.ceil(Math.max(a.x,b.x,c.x)));
        const minY=Math.max(0,Math.floor(Math.min(a.y,b.y,c.y))),maxY=Math.min(viewHeight-1,Math.ceil(Math.max(a.y,b.y,c.y)));
        const denominator=(b.y-c.y)*(a.x-c.x)+(c.x-b.x)*(a.y-c.y);
        if(Math.abs(denominator)<1e-10) continue;
        for(let y=minY;y<=maxY;y++) for(let x=minX;x<=maxX;x++) {
          const u=((b.y-c.y)*(x+.5-c.x)+(c.x-b.x)*(y+.5-c.y))/denominator;
          const v=((c.y-a.y)*(x+.5-c.x)+(a.x-c.x)*(y+.5-c.y))/denominator,w=1-u-v;
          if(u<0||v<0||w<0) continue;
          const z=view.ortho?u*a.z+v*b.z+w*c.z:1/(u/a.z+v/b.z+w/c.z),offset=y*width+x;
          if(z>=depth[offset]) continue;
          depth[offset]=z;pixels.set([...rgb,255],offset*4);
        }
      }
    }
    const canvas=createCanvas(width,height),ctx=canvas.getContext('2d');
    ctx.fillStyle='#f7f8f4';ctx.fillRect(0,0,width,height);
    const data=ctx.createImageData(width,viewHeight);data.data.set(pixels);ctx.putImageData(data,0,header);
    ctx.fillStyle='#26352b';ctx.font='26px "Preview Bold"';ctx.fillText(view.title,28,34);
    ctx.font='16px Preview';ctx.fillText(view.subtitle,28,61);
    ctx.fillStyle='#56614f';ctx.font='14px Preview';ctx.fillText('Actual Babylon meshes - flat-shaded preview, not a browser screenshot - provisional sofa study - office unchanged',28,height-16);
    return canvas.toBuffer('image/png');
}
