(function(root,factory){
 const node=typeof module==='object'&&module.exports;
 const api=factory(node?require('./engine.js'):root.IdleEngine,node?require('./equipment-art.js'):root.WendaoEquipmentArt);
 if(node)module.exports=api;else root.WendaoEquipmentSources=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(E,A){
'use strict';
const C=E.catalog,K=E.modules.core,Q=E.modules.economy;
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
function shortages(s,cost){
 const result=[];
 for(const [key,value] of Object.entries(cost||{})){
  if(value&&typeof value==='object'){for(const [id,n] of Object.entries(value)){const have=Number(s[key]?.[id]||0);if(have<n)result.push({key,id,have,need:n,missing:n-have});}}
  else{const have=Number(s[key]||0);if(have<value)result.push({key,have,need:value,missing:value-have});}
 }
 return result;
}
function forge(s,set,slot,rarity){
 const cost=Q.costs(s,'forgeGear',{set,slot,rarity}),missing=shortages(s,cost),requirements=[];
 if(s.battle||s.exploration)requirements.push('先结束当前历练');
 if(rarity===5&&!s.blueprints.includes(set))requirements.push('道品需要'+C.sets[set].name+'永久蓝图');
 if(s.bag.length+(s.rewardOverflow||[]).length>=1300)requirements.push('先整理背包与奖励暂存');
 return {rarity,cost,missing,requirements,allowed:requirements.length===0&&missing.length===0};
}
function view(s,{set,slot,rarity}={}){
 if(!own(C.sets,set)||!own(C.slots,slot))throw Error('套装或部位无效');
 const choices=Array.from({length:6},(_,i)=>forge(s,set,slot,i));
 if(!Number.isInteger(rarity)||rarity<0||rarity>5)rarity=choices[2].allowed?2:choices[1].allowed?1:0;
 const gear={set,slot,rarity,tier:s.paths[s.route].realm},target='gear_'+set+'_'+slot;
 const owned=s.bag.filter(g=>g.set===set&&g.slot===slot),eligible=owned.filter(g=>g.tier<=s.paths[s.route].realm||s.equipped[slot]===g.uid),overflow=(s.rewardOverflow||[]).filter(g=>g.set===set&&g.slot===slot);
 const bosses=Object.values(C.dungeons).filter(d=>d.type==='boss'&&d.school===set).map(d=>{
  const p=E.previewDungeon(s,{id:d.id,tier:d.realm,difficulty:0,practice:false});
  const requirements=(p.requirements||[]).slice();if(s.battle||s.exploration)requirements.push('先结束当前历练');
  return {id:d.id,name:d.name,realm:d.realm,layer:d.layer,allowed:!!p.allowed&&requirements.length===0,requirements,firstClear:!s.progress.firstClears.includes(d.id+':'+d.realm+':0'),blueprint:(d.firstRewards.blueprints||[]).includes(set),drop:'每胜一件本套装备，六个部位随机；品质随难度变化。'};
 }).sort((a,b)=>Number(b.allowed)-Number(a.allowed)||a.realm-b.realm||a.layer-b.layer);
 const gachaAllowed=Q.targets(s).some(t=>t.id===target);
 const gacha={target,allowed:gachaAllowed,current:s.gacha.target===target,tickets:s.tickets,requirements:gachaAllowed?[]:['达到'+C.routes[s.route].realmNames[1]+'一层，解锁天道感应'],description:'选择此道品部位作为定向目标；首次红品50%命中，未命中后下一红必定向。普通感应装备仍随机。'};
 return {set,slot,rarity,gear,name:A.gearLabel(gear),owned,eligible,overflow,status:eligible.length?'已拥有可用装备':overflow.length?'奖励暂存中已有':owned.length?'已拥有，当前阶位不可用':'待获取',forge:choices[rarity],forgeChoices:choices,bosses,gacha,blueprintOwned:s.blueprints.includes(set),blueprintSources:[{type:'dungeon',id:'sect_'+set+'_1',label:C.schools[set].name+'进阶宗门首通'},{type:'sidequest',id:'world_forge',label:'器道修复：第二境与矿石秘境三胜'}]};
}
return Object.freeze({view,shortages});
});
