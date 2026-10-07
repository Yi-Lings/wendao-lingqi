(function(root,factory){
  const api=factory(root);
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.WendaoArtLayout=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(root){
'use strict';
/* An atlas cell is a crop of an image, never an image stretched to fit its box.
   Read actual image dimensions, then uniformly cover only the selected cell. */
function geometry({width,height,imageWidth,imageHeight,cols,rows,col,row,crop,fit='cover'}){
 const values=[width,height,imageWidth,imageHeight,cols,rows,col,row];
 if(values.some(x=>!Number.isFinite(x))||width<=0||height<=0||imageWidth<=0||imageHeight<=0||cols<1||rows<1||col<0||row<0||col>cols-1+.001||row>rows-1+.001)return null;
 const box=crop||[col/cols,row/rows,1/cols,1/rows];
 if(!Array.isArray(box)||box.length!==4||box.some(x=>!Number.isFinite(x))||box[0]<0||box[1]<0||box[2]<=0||box[3]<=0||box[0]+box[2]>1.000001||box[1]+box[3]>1.000001)return null;
 const cellWidth=imageWidth*box[2],cellHeight=imageHeight*box[3],scale=(fit==='contain'?Math.min:Math.max)(width/cellWidth,height/cellHeight);
 const renderedCellWidth=cellWidth*scale,renderedCellHeight=cellHeight*scale;
 return {width:imageWidth*scale,height:imageHeight*scale,x:-box[0]*imageWidth*scale+(width-renderedCellWidth)/2,y:-box[1]*imageHeight*scale+(height-renderedCellHeight)/2,cellWidth,cellHeight,scale};
}
const doc=root.document;
if(!doc)return Object.freeze({geometry});
const SELECTOR='.art-icon,.monster-portrait,.boss-portrait,.boss-banner-art,.chapter-art,.dungeon-banner:not(.boss-banner),.battle-stage,.exploration-stage,.conversation-portrait,.companion-art';
const profiles=new WeakMap(),tracked=new Set(),images=new Map();
let pending=0;
const clean=n=>Number(n.toFixed(5))+'px';
function imageDimensions(url){
 if(!images.has(url))images.set(url,new Promise(resolve=>{const image=new root.Image();image.onload=()=>resolve({width:image.naturalWidth,height:image.naturalHeight});image.onerror=()=>resolve(null);image.src=url;}));
 return images.get(url);
}
function layerList(value){return value.split(',').map(x=>x.trim());}
function readProfile(node){
 const old=profiles.get(node),style=root.getComputedStyle(node);
 const size=node.style.backgroundSize||(old?.sourceSize)||style.backgroundSize;
 const position=node.style.backgroundPosition||(old?.sourcePosition)||style.backgroundPosition;
 const sizes=layerList(size),positions=layerList(position),lastSize=sizes[sizes.length-1].split(/\s+/),lastPosition=positions[positions.length-1].split(/\s+/);
 const urls=Array.from(style.backgroundImage.matchAll(/url\(["']?([^"')]+)["']?\)/g));
 if(!urls.length||!/^\d+(\.\d+)?%$/.test(lastSize[0]))return null;
 const cols=parseFloat(lastSize[0])/100,rows=lastSize[1]==='auto'?1:parseFloat(lastSize[1]||'100%')/100;
 if(!Number.isInteger(cols)||!Number.isInteger(rows)||cols<1||rows<1)return null;
 const fraction=x=>x==='left'||x==='top'?0:x==='right'||x==='bottom'?1:x==='center'?.5:/^-?\d+(\.\d+)?%$/.test(x)?parseFloat(x)/100:null;
 const x=fraction(lastPosition[0]),y=fraction(lastPosition[1]||'50%');
 if(x===null||y===null)return null;
 const url=urls[urls.length-1][1],col=cols===1?0:x*(cols-1),row=rows===1?0:y*(rows-1);
 if(col<0||row<0||col>cols-1+.001||row>rows-1+.001)return null;
 const crop=node.dataset.artCrop?.split(',').map(Number);
 return {url,cols,rows,col,row,crop,fit:crop?'contain':'cover',background:style.backgroundImage,sourceSize:size,sourcePosition:position,sizes,positions,dimensions:old?.url===url?old.dimensions:null};
}
function apply(node,profile){
 if(!node.isConnected||profiles.get(node)!==profile||!profile.dimensions)return;
 const fitted=geometry({width:node.clientWidth,height:node.clientHeight,imageWidth:profile.dimensions.width,imageHeight:profile.dimensions.height,...profile});
 if(!fitted)return;
 // Generated atlas separators need not fall on equal sixths. Isolate the
 // measured rectangle in its own window, then contain it inside the quality
 // frame. Letterboxing must never expose the adjacent atlas illustration.
 if(profile.crop){
  let picture=node.querySelector(':scope > [data-atlas-picture]');
  if(!picture){picture=doc.createElement('span');picture.dataset.atlasPicture='';picture.setAttribute('aria-hidden','true');node.append(picture);}
  const width=fitted.cellWidth*fitted.scale,height=fitted.cellHeight*fitted.scale,left=(node.clientWidth-width)/2,top=(node.clientHeight-height)/2;
  const values={width:clean(width),height:clean(height),left:clean(left),top:clean(top),'background-image':profile.background,'background-size':clean(fitted.width)+' '+clean(fitted.height),'background-position':clean(fitted.x-left)+' '+clean(fitted.y-top)};
  for(const [name,value] of Object.entries(values))if(picture.style.getPropertyValue(name)!==value)picture.style.setProperty(name,value);
  if(!node.classList.contains('atlas-crop-fit'))node.classList.add('atlas-crop-fit');
 }else{
  node.querySelector(':scope > [data-atlas-picture]')?.remove();
  if(node.classList.contains('atlas-crop-fit'))node.classList.remove('atlas-crop-fit');
 }
 const sizes=profile.sizes.slice(),positions=profile.positions.slice();
 sizes[sizes.length-1]=clean(fitted.width)+' '+clean(fitted.height);
 positions[positions.length-1]=clean(fitted.x)+' '+clean(fitted.y);
 const set=(name,value)=>{if(node.style.getPropertyValue(name)!==value)node.style.setProperty(name,value);};
 set('--atlas-fit-size',sizes.join(', '));set('--atlas-fit-position',positions.join(', '));
 if(!node.classList.contains('atlas-fit'))node.classList.add('atlas-fit');
 const metadata=[profile.cols,profile.rows,profile.col,profile.row,profile.dimensions.width,profile.dimensions.height].join(',');
 if(node.dataset.atlasFit!==metadata)node.dataset.atlasFit=metadata;
}
const resize=typeof root.ResizeObserver==='function'?new root.ResizeObserver(entries=>{for(const entry of entries){const p=profiles.get(entry.target);if(p)apply(entry.target,p);}}):null;
function refresh(){
 pending=0;
 for(const node of tracked){if(!node.isConnected){tracked.delete(node);resize?.unobserve(node);}}
 for(const node of doc.querySelectorAll(SELECTOR)){
  const profile=readProfile(node);if(!profile)continue;
  profiles.set(node,profile);
  if(!tracked.has(node)){tracked.add(node);resize?.observe(node);}
  if(profile.dimensions)apply(node,profile);
  else imageDimensions(profile.url).then(dimensions=>{profile.dimensions=dimensions;apply(node,profile);});
 }
}
function schedule(){if(!pending){pending=1;(root.queueMicrotask||((callback)=>Promise.resolve().then(callback)))(refresh);}}
const observer=new root.MutationObserver(records=>{
 if(records.some(record=>record.type==='childList'||record.type==='attributes'&&record.target.matches?.(SELECTOR)))schedule();
});
observer.observe(doc.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['style','class','data-art-crop']});
root.addEventListener('resize',schedule,{passive:true});
if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
return Object.freeze({geometry,refresh});
});
