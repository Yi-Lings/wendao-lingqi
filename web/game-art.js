(function(root,factory){
  const api=factory(typeof module==='object'&&module.exports?require('./data.js'):root.WendaoData);
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.WendaoGameArt=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(C){
'use strict';
const UTILITIES=['herb','ore','lotus','insight','essence','soul','crystal0','crystal1','crystal2','crystal3','crystal4','crystal5','stones','tickets','dust','jade','contribution','universal','blueprint','field','furnace','forge','library','array','battle','elite','herb-room','ore-room','healing','insight-room','boon','curse','merchant','escort','relic','exit'];
const PILLS=Object.keys(C.recipes),SCHOOLS=Object.keys(C.schools);
const LEGACY_PILLS={qi2:[2,3],shield1:[2,5],purify1:[4,4],break2:[2,3],heal2:[5,3],purify2:[5,4],break3:[5,5],shield2:[2,4],break4:[4,5]};
const own=(obj,key)=>Object.prototype.hasOwnProperty.call(obj,key);
function cell(file,col,row,cols=6,rows=6){return {file,size:cols*100+'% '+rows*100+'%',position:col*100/(cols-1)+'% '+row*100/(rows-1)+'%'};}
function utility(id){const index=UTILITIES.indexOf(id);return index<0?null:cell('v4-utilities-atlas.png',index%6,Math.floor(index/6));}
function room(id){
 const type=String(id||'').split(':')[0];
 const aliases={herb:'herb-room',ore:'ore-room',insight:'insight-room',final:'battle',fight:'battle',finish:'relic'};
 return utility(aliases[type]||type);
}
function treasure(id){
 if(!own(C.treasures,id))return null;
 const n=Number(id.slice(1));
 if(C.treasures[id].rarity>=3)return cell('v3-items-atlas.png',n%6,1+Math.floor(n/6));
 return cell('v4-treasures-atlas.png',n%6,Math.floor(n/6),6,2);
}
function pill(id){
 const index=PILLS.indexOf(id);if(index<0)return null;
 if(own(LEGACY_PILLS,id)){const [col,row]=LEGACY_PILLS[id];return cell('v3-items-atlas.png',col,row);}
 return cell('v4-pills-atlas.png',index%6,Math.floor(index/6),6,3);
}
function technique(value){
 const t=typeof value==='string'&&own(C.techniques,value)?C.techniques[value]:value;
 if(!t||!own(C.techniques,t.id)||!SCHOOLS.includes(t.school))return null;
 const n=Number(t.id.split('_').pop()),col=t.kind==='heart'?n:t.kind==='skill'?n+2:n+6;
 if(!Number.isInteger(col)||col<0||col>7)return null;
 return cell(t.rarity<=2?'v4-basic-skills-atlas.png':'v3-skills-atlas.png',col,SCHOOLS.indexOf(t.school),8,6);
}
return Object.freeze({utility,room,treasure,pill,technique});
});
