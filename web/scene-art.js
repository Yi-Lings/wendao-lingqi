(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.WendaoSceneArt=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ids=Object.freeze(['bridge_lantern','village_well','mountain_bell','lake_ferry','cloud_garden','old_sundial','mist_archive','stone_echo','ash_letter','root_crossing','forge_oath','red_spring','star_watch','moon_mirror','furnace_seal','deep_river','last_disciple','quiet_sky']);
const sheets=Object.freeze(['v10-encounters-a.png','v10-encounters-b.png','v10-encounters-c.png']);
function single(file){return Object.freeze({file,cols:1,rows:1,col:0,row:0,crop:Object.freeze([0,0,1,1])});}
function event(id){
 const index=ids.indexOf(id);if(index<0)return null;
 const cell=index%6,col=cell%3,row=Math.floor(cell/3),inset=.009;
 return Object.freeze({file:sheets[Math.floor(index/6)],cols:3,rows:2,col,row,aspect:index>=12?'1':'4/3',crop:Object.freeze([(col+inset)/3,(row+inset)/2,(1-2*inset)/3,(1-2*inset)/2])});
}
const companions=Object.freeze({qinglan:single('v10-qinglan-lantern.png'),yueheng:single('v10-yueheng-medicine.png'),suyan:single('v10-suyan-records.png')});
function hero(page,realm=0,chapter=0){
 if(page==='cultivation')return single('v10-cloud-retreat.png');
 if(page==='character')return single('v10-artifact-atelier.png');
 if(page==='heaven')return single('v10-star-observatory.png');
 if(page==='cave')return single('v9-furnace-inspection.png');
 if(page==='fate')return single(chapter===0?'v9-snow-village.png':chapter===1?'v9-furnace-inspection.png':'v9-archive-chamber.png');
 if(page==='adventure')return event(ids[Math.max(0,Math.min(5,Math.floor(realm)))*3]);
 return null;
}
function render(art,label,classes=''){
 if(!art)return '';
 const position=(art.cols>1?art.col*100/(art.cols-1):50)+'% '+(art.rows>1?art.row*100/(art.rows-1):50)+'%';
 return `<div class="scene-art ${esc(classes)}" role="img" aria-label="${esc(label)}" data-scene-file="${esc(art.file)}" data-art-crop="${art.crop.join(',')}" data-art-fit="cover" style="--scene-native-ratio:${art.aspect||'3/2'};background-image:url(assets/${art.file});background-size:${art.cols*100}% ${art.rows*100}%;background-position:${position}"></div>`;
}
return Object.freeze({ids,sheets,event,hero,companions,render});
});
