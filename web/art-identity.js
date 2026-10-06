(function(root,factory){
  const api=factory(typeof module==='object'&&module.exports?require('./data.js'):root.WendaoData);
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.WendaoArtIdentity=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(C){
'use strict';
const SETS=['sword','body','thunder','elements','shadow','array'],SLOTS=['weapon','armor','head','bracer','boots','charm'];
const own=(o,k)=>!!o&&Object.prototype.hasOwnProperty.call(o,k);
const TONES={
  iron:['#a6aeb6','#ddd6c8','none'],cloth:['#c5b9a3','#8f969a','none'],leather:['#a57a52','#ceb58d','none'],bronze:['#a99c64','#d4c695','none'],
  jade:['#89dfb8','#e2fff4','wind'],cloud:['#c5e9f7','#f4ffff','wind'],earth:['#c9a76a','#e9d8ad','shield'],
  lightning:['#83caff','#c3a5ff','lightning'],wood:['#83dfa3','#d6ffe1','leaf'],water:['#84dcff','#e5fcff','frost'],
  fire:['#ffa15c','#ffdb9d','flame'],violet:['#c6a0ef','#e5d4ff','mist'],moon:['#cfdae8','#93c7ca','mist'],tortoise:['#8bbfa5','#d6d4a7','shield'],
  soul:['#ba9aff','#8cdddc','mist'],star:['#96bfff','#d9f1ff','star'],lotus:['#b0ecd1','#f5fff1','leaf'],
  amber:['#e8ba73','#fff1bf','halo'],elements:['#96d8ba','#8ecfff','elements']
};
// Each named Dao-quality item has its own material and magic identity. Quality
// controls the frame and ceremony, never a global colour filter on the object.
const DAO={
  sword:['jade','cloud','jade','moon','cloud','jade'],
  body:['earth','tortoise','earth','earth','earth','earth'],
  thunder:['lightning','lightning','lightning','lightning','lightning','lightning'],
  elements:['elements','fire','wood','water','earth','elements'],
  shadow:['soul','moon','soul','moon','moon','soul'],
  array:['star','lotus','lotus','star','lotus','amber']
};
const SCHOOL={sword:'jade',body:'earth',thunder:'lightning',elements:'elements',shadow:'soul',array:'star'};
const TREASURE=['wood','jade','amber','water','cloud','earth','soul','lotus','lightning','lotus','star','jade'];
const PILL={qi0:'amber',qi1:'jade',qi2:'violet',heal0:'wood',heal1:'lotus',heal2:'amber',shield0:'earth',shield1:'earth',shield2:'tortoise',purify0:'cloud',purify1:'soul',purify2:'lotus',break0:'jade',break1:'earth',break2:'moon',break3:'jade',break4:'lightning',break5:'lotus'};
const UTILITY={herb:'wood',ore:'iron',lotus:'lotus',insight:'amber',essence:'jade',soul:'soul',crystal0:'jade',crystal1:'water',crystal2:'amber',crystal3:'violet',crystal4:'lotus',crystal5:'lightning',stones:'jade',tickets:'amber',dust:'star',jade:'jade',contribution:'bronze',universal:'cloud',blueprint:'bronze',field:'wood',furnace:'fire',forge:'earth',library:'cloud',array:'star',battle:'iron',elite:'soul','herb-room':'wood','ore-room':'iron',healing:'lotus','insight-room':'amber',boon:'jade',curse:'soul',merchant:'amber',escort:'cloud',relic:'star',exit:'cloud'};
function quality(value){const n=Number(value);return Number.isInteger(n)&&n>=0&&n<=5?n:0;}
function descriptor(identity,name,rarity,tone){
  const palette=own(TONES,tone)?tone:'iron',[aura,auraSecondary,effect]=TONES[palette];
  return {identity,name:typeof name==='string'?name:'',rarity:quality(rarity),palette,aura,auraSecondary,effect:quality(rarity)>=2?effect:'none'};
}
function gear(value,name=''){
  const raw=value&&typeof value==='object'?value:{},set=SETS.includes(raw.set)?raw.set:'sword',slot=SLOTS.includes(raw.slot)?raw.slot:'weapon',rarity=quality(raw.rarity);
  let tone=SCHOOL[set];
  if(rarity===0)tone=['armor','head','boots'].includes(slot)&&!(set==='body'&&slot==='armor')?'cloth':'iron';
  else if(rarity===1)tone=slot==='bracer'||slot==='boots'||set==='body'&&slot==='armor'?'leather':slot==='head'||slot==='charm'||set==='array'&&slot==='weapon'?'bronze':slot==='armor'?'cloud':set==='elements'?'wood':'iron';
  else if(rarity===5)tone=DAO[set][SLOTS.indexOf(slot)];
  else if(slot==='boots'&&rarity===2)tone='cloud';
  else if(slot==='charm'&&rarity===2)tone='jade';
  else if(rarity===3&&slot!=='weapon')tone='violet';
  else if(rarity===3&&slot==='weapon'&&set==='sword')tone='violet';
  else if(slot==='weapon'&&set==='elements')tone=rarity>=3?'fire':'wood';
  else if(slot==='weapon'&&set==='shadow'&&rarity>=3)tone='moon';
  return descriptor('gear-'+set+'-'+slot+'-'+rarity,name,rarity,tone);
}
function technique(value){
  const t=typeof value==='string'&&own(C.techniques,value)?C.techniques[value]:value;
  if(!t||!own(C.techniques,t.id))return null;
  const item=C.techniques[t.id];let tone=SCHOOL[item.school]||'iron';
  if(item.school==='elements')tone=({elements_skill_0:'wood',elements_skill_1:'fire',elements_skill_2:'water',elements_skill_3:'earth',elements_secret_0:'wood'})[item.id]||'elements';
  if(item.school==='array')tone=/星罗/.test(item.name)?'star':/清心|净尘|回春/.test(item.name)?'lotus':'jade';
  if(item.school==='shadow'&&/残烬/.test(item.name))tone='violet';
  return descriptor(item.id,item.name,item.rarity,tone);
}
function treasure(id){if(!own(C.treasures,id))return null;const t=C.treasures[id],d=descriptor(id,t.name,t.rarity,TREASURE[Number(id.slice(1))]);if(id==='t11')d.auraSecondary=TONES.star[0];return d;}
function pill(id){if(!own(C.recipes,id))return null;const p=C.recipes[id];return descriptor(id,p.name,p.rarity,PILL[id]);}
function utility(id){if(!own(UTILITY,id))return null;return descriptor('utility-'+id,C.materials[id]?.name||C.facilities[id]?.name||id,0,UTILITY[id]);}
function decorate(value){
  const a=value&&typeof value==='object'?value:{},hex=v=>typeof v==='string'&&/^#[\da-f]{6}$/i.test(v)?v:'#a6aeb6';
  const effect=['none','wind','shield','lightning','leaf','frost','flame','mist','star','halo','elements'].includes(a.effect)?a.effect:'none';
  const identity=typeof a.identity==='string'&&/^[a-z0-9_-]{1,80}$/i.test(a.identity)?a.identity:'item',rarity=quality(a.rarity);
  return {className:'named-item art-fx-'+effect,attrs:'data-art-identity="'+identity+'" data-art-palette="'+(own(TONES,a.palette)?a.palette:'iron')+'" data-art-effect="'+effect+'" data-art-rarity="'+rarity+'"',style:'--item-aura:'+hex(a.aura)+';--item-aura-secondary:'+hex(a.auraSecondary)+';'};
}
return Object.freeze({gear,technique,treasure,pill,utility,decorate});
});
