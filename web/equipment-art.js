(function(root,factory){
  const api=factory(typeof module==='object'&&module.exports?require('./data.js'):root.WendaoData,typeof module==='object'&&module.exports?require('./art-identity.js'):root.WendaoArtIdentity);
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.WendaoEquipmentArt=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(C,I){
'use strict';
const SETS=['sword','body','thunder','elements','shadow','array'];
const SLOTS=['weapon','armor','head','bracer','boots','charm'];
const QUALITY=['凡品','灵品','玄品','地品','天品','道品'];
const SET_NAMES={sword:'青锋',body:'玄武',thunder:'雷霄',elements:'离火',shadow:'太虚',array:'回春'};
const RED_LEGACY_WEAPONS={sword:0,elements:5,shadow:4};
const WEAPONS={
  sword:['铁剑','精钢剑','灵纹剑','紫玄剑','天锋剑','青锋剑'],
  body:['铁锤','精钢锤','玄铁锤','撼山锤','伏岳锤','镇岳锤'],
  thunder:['铁枪','精铁长枪','引雷枪','紫电杖','九霄雷杖','雷霄杖'],
  elements:['素扇','竹骨扇','灵木扇','离火扇','天焰扇','四象扇'],
  shadow:['铁刀','精钢刀','幽纹刀','玄冥刃','吞夜刃','蚀魄刃'],
  array:['铁尺','青铜尺','灵纹尺','玄星尺','天衡尺','星罗尺']
};
const ARMOR={
  armor:['粗布衣','青布衣','灵纹衣','紫玄衣','天灵宝衣'],
  head:['布帽','铜箍布冠','灵纹冠','紫玄冠','天灵宝冠'],
  bracer:['铁护腕','皮护腕','灵纹护腕','紫玄护腕','天灵宝腕'],
  boots:['旧布靴','皮革靴','云纹靴','紫玄靴','天灵宝履'],
  charm:['绳结石佩','青铜佩','灵玉佩','紫玄佩','天灵宝佩']
};
const BODY_ARMOR=['粗布铁甲','精制皮甲','灵纹铁甲','紫玄重甲','天灵宝甲'];
const own=(obj,key)=>!!obj&&Object.prototype.hasOwnProperty.call(obj,key);
const record=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
function integer(value,min,max){
  if(typeof value!=='number'&&typeof value!=='string'||typeof value==='string'&&!value.trim())return null;
  const n=Number(value);
  return Number.isInteger(n)&&n>=min&&n<=max?n:null;
}
function normalize(value){
  const g=record(value),rarity=integer(g.rarity,0,5);
  return {rarity:rarity===null?0:rarity,slot:SLOTS.includes(g.slot)?g.slot:'weapon',set:SETS.includes(g.set)?g.set:'sword'};
}
function qualityName(rarity){return C&&C.rarities&&C.rarities[rarity]?.name||QUALITY[rarity];}
function baseName(value){
  const g=normalize(value),id='gear_'+g.set+'_'+g.slot;
  if(g.rarity===5&&own(C&&C.gearTargets,id)&&typeof C.gearTargets[id].name==='string'&&C.gearTargets[id].name)return C.gearTargets[id].name;
  if(g.slot==='weapon')return WEAPONS[g.set][g.rarity];
  if(g.rarity===5){
    const setName=own(C&&C.sets,g.set)?C.sets[g.set].name:'道藏';
    return setName+({armor:'宝衣',head:'宝冠',bracer:'宝腕',boots:'宝履',charm:'宝佩'}[g.slot]);
  }
  const name=g.slot==='armor'&&g.set==='body'?BODY_ARMOR[g.rarity]:ARMOR[g.slot][g.rarity];
  return SET_NAMES[g.set]+'·'+name;
}
function gearArt(value){
  const g=normalize(value),row=SETS.indexOf(g.set),col=SLOTS.indexOf(g.slot),identity=I.gear(g,baseName(g));
  if(g.rarity===5&&(g.slot==='weapon'&&own(RED_LEGACY_WEAPONS,g.set)||g.slot==='armor'&&g.set==='body')){
    const legacyColumn=g.slot==='weapon'?RED_LEGACY_WEAPONS[g.set]:1;
    return {...identity,file:'v3-items-atlas.png',position:legacyColumn*20+'% 0%',size:'600% 600%',rarity:g.rarity,slot:g.slot,set:g.set};
  }
  return {...identity,file:'v6-gear-quality-'+g.rarity+'.png',position:col*20+'% '+row*20+'%',size:'600% 600%',rarity:g.rarity,slot:g.slot,set:g.set};
}
function gearLabel(value){
  const raw=record(value),g=normalize(raw),tier=integer(raw.tier,0,5),awakening=integer(raw.awakening,1,5);
  return qualityName(g.rarity)+'·'+baseName(g)+(tier===null?'':' '+(tier+1)+'阶')+(awakening===null?'':' 觉醒'+awakening);
}
function rewardLabel(value){
  const x=record(value);
  if(x.category==='gear'||x.category==='equipment'){
    const id=typeof x.id==='string'&&x.id?x.id:x.itemId;
    const match=typeof id==='string'?/^gear_([a-z]+)_([a-z]+)$/.exec(id):null;
    if(match&&SETS.includes(match[1])&&SLOTS.includes(match[2]))return baseName({set:match[1],slot:match[2],rarity:x.rarity});
    if(SETS.includes(x.set)&&SLOTS.includes(x.slot))return baseName(x);
    return '装备';
  }
  if(typeof x.name==='string'&&x.name.trim())return x.name;
  const id=typeof x.id==='string'&&x.id?x.id:x.itemId;
  for(const kind of ['techniques','treasures','recipes','materials'])if(own(C&&C[kind],id)&&typeof C[kind][id].name==='string')return C[kind][id].name;
  return typeof id==='string'&&id?id:'机缘';
}
return Object.freeze({gearArt,gearLabel,rewardLabel});
});
