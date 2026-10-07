(function(root,factory){
 const api=factory(typeof module==='object'&&module.exports?require('./data.js'):root.WendaoData);
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.WendaoMonsterArt=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(C){
'use strict';
// Original portrait frames are cropped out at native pixel coordinates. New
// atlases are isolated on neutral backgrounds; measured boundaries, rather
// than a stretched background, define each complete figure.
const definitions={
 'v3-monster-atlas.png':{width:1774,height:887,x:[4,447,891,1336,1770],y:[5,447,883],inset:4},
 'v3-boss-atlas.png':{width:1086,height:1448,x:[0,362,724,1086],y:[0,362,724,1086,1448],inset:0},
 'v7-rivals-atlas.png':{width:1536,height:1024,x:[0,512,1024,1536],y:[0,512,1024],inset:0},
 'v7-encounters-atlas.png':{width:1774,height:887,x:[0,443,887,1330,1774],y:[0,444,887],inset:1}
};
Object.values(definitions).forEach(d=>{Object.freeze(d.x);Object.freeze(d.y);Object.freeze(d);});Object.freeze(definitions);
const own=(object,key)=>Object.hasOwn(object||{},key);
function cell(art,name,kind){
 if(!art||!own(definitions,art.file)||!Number.isInteger(art.index)||art.index<0||art.index>=art.cols*art.rows)return null;
 const native=definitions[art.file],col=art.index%art.cols,row=Math.floor(art.index/art.cols),inset=native.inset;
 const left=native.x[col]+inset,top=native.y[row]+inset,right=native.x[col+1]-inset,bottom=native.y[row+1]-inset;
 return Object.freeze({file:art.file,cols:art.cols,rows:art.rows,col,row,name,kind,
  size:art.cols*100+'% '+art.rows*100+'%',position:(art.cols>1?col*100/(art.cols-1):50)+'% '+(art.rows>1?row*100/(art.rows-1):50)+'%',
  crop:Object.freeze([left/native.width,top/native.height,(right-left)/native.width,(bottom-top)/native.height])});
}
function speciesArt(id){return own(C.monsters,id)?cell(C.monsters[id].art,C.monsters[id].name,'monster'):null;}
function rivalArt(id){return own(C.rivals,id)?cell(C.rivals[id].art,C.rivals[id].name,'rival'):null;}
function bossArt(value){
 const d=typeof value==='string'?C.dungeons[value]:value;
 const index=typeof value==='number'?value:d&&Number.isInteger(d.bossIndex)?d.bossIndex:typeof d?.id==='string'?C.bosses.findIndex(b=>b.id===d.id):-1;
 if(!Number.isInteger(index)||index<0||index>=C.bosses.length)return null;
 return cell({file:'v3-boss-atlas.png',index,cols:3,rows:4},C.bosses[index].name,'boss');
}
function enemyArt(enemy,battle){
 enemy=enemy||{};battle=battle||{};
 if(own(C.rivals,enemy.rivalId))return rivalArt(enemy.rivalId);
 if(own(C.monsters,enemy.species))return speciesArt(enemy.species);
 if(Number.isInteger(enemy.bossIndex))return bossArt(enemy.bossIndex);
 // Migration fallbacks use stable encounter IDs/roles only. Human names and
 // their incidental words (雷、影、莲) never select animal illustrations.
 const role={flower:'flower',root:'root_tendril',guard:'armor',clone:'mirror_phantom'}[enemy.role];
 if(role)return speciesArt(role);
 if(enemy.role==='twin'||enemy.id==='twin')return bossArt(7);
 const d=C.dungeons[battle.id];if(!d)return null;
 const index=Number.isInteger(enemy.index)?enemy.index:0;
 if(d.type==='arena')return rivalArt(d.enemy.rivalId);
 if(d.type==='resource')return speciesArt(d.enemySpecies[index%d.enemySpecies.length]);
 if(d.type==='boss'&&index===0)return bossArt(d);
 if(d.type==='trial'&&index===0)return bossArt([0,2,5,6,8,11][battle.tier||0]);
 if(d.type==='sect'){
  const rival={sword:'luojingxing',body:'hanyue',thunder:'jilingchuan',elements:'yejinghong',array:'xuzhao'}[d.school];
  return rival?rivalArt(rival):speciesArt('mirror_phantom');
 }
 if(d.type==='tower'){
  const floor=C.towerFloors[(battle.floor||1)-1];if(!floor)return null;
  if(Number.isInteger(floor.bossIndex)&&index===0)return bossArt(floor.bossIndex);
  const species={sword:['armor','bronze_sentinel'],body:['golem','bronze_sentinel'],thunder:['thunder','ember_golem'],elements:['flower','spring_wraith'],shadow:['shadow','mirror_phantom'],array:['tablet_spirit','star']}[floor.school];
  return species?speciesArt(species[index%species.length]):null;
 }
 if(d.type==='cave')return speciesArt({cave_0:'bronze_sentinel',cave_1:'ember_golem',cave_2:'mirror_phantom'}[d.id]);
 return null;
}
return Object.freeze({enemyArt,bossArt,speciesArt,rivalArt,definitions});
});
