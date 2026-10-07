(function(root,factory){
  const node=typeof module==='object'&&module.exports;
  const api=factory(node?require('./data.js'):root.WendaoData,node?require('./equipment-art.js'):root.WendaoEquipmentArt,node?require('./game-art.js'):root.WendaoGameArt);
  if(node)module.exports=api;else root.WendaoRewards=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(C,A,G){
'use strict';
const labels={stones:'灵石',xp:'修为',tickets:'感应券',contribution:'宗门贡献',jade:'灵玉',dust:'天道尘',herb:'灵草',ore:'玄铁',lotus:'灵莲',insight:'参悟',essence:'炼器精华',soul:'器魂',crystal0:'一阶天命晶',crystal1:'二阶天命晶',crystal2:'三阶天命晶',crystal3:'四阶天命晶',crystal4:'五阶天命晶',crystal5:'六阶天命晶'};
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=x=>Number(x).toLocaleString('zh-CN',{maximumFractionDigits:1});
const positive=x=>typeof x==='number'&&Number.isFinite(x)&&x>0;
function blueprintName(id){
  if(C.sets[id])return C.sets[id].name+' · 套装蓝图';
  const found=/^gear_([^_]+)_([^_]+)$/.exec(id);
  return found&&C.sets[found[1]]&&C.slots[found[2]]?C.sets[found[1]].name+' · '+C.slots[found[2]]+'蓝图':'灵装蓝图';
}
// This presents an already committed report. It never creates or grants loot.
function model(report){
  const r=report||{},win=!!(r.win||r.victory),practice=!!r.practice,pending=!!r.rewardsPending&&!practice;
  const reward=practice?{}:r.rewards||r.reward||{},items=[];
  for(const id of ['stones','xp','tickets','contribution','jade','dust'])if(positive(reward[id]))items.push({kind:'currency',id,name:labels[id],count:reward[id],rarity:id==='tickets'?3:0});
  for(const [id,name] of [['xp','仙界修为'],['yuan','仙元']])if(positive(reward.celestial?.[id]))items.push({kind:'currency',id:id==='xp'?'celestialXp':'yuan',name,count:reward.celestial[id],rarity:3});
  for(const [id,count] of Object.entries(reward.materials||{}))if(labels[id]&&positive(count))items.push({kind:'material',id,name:labels[id],count,rarity:id.startsWith('crystal')?4:id==='soul'?3:1});
  for(const [id,count] of Object.entries(reward.fragments||{}))if(positive(count)&&(id==='universal'||C.techniques[id]))items.push({kind:'fragment',id,name:id==='universal'?'通用功法残页':C.techniques[id].name+' · 残页',count,rarity:id==='universal'?2:C.techniques[id].rarity});
  for(const [kind,field,catalog] of [['technique','techniques',C.techniques],['treasure','treasures',C.treasures],['recipe','recipes',C.recipes]])for(const id of reward[field]||[])if(catalog[id])items.push({kind,id,name:catalog[id].name+(kind==='recipe'?' · 丹方':''),count:1,rarity:catalog[id].rarity});
  for(const gear of reward.gear||[])if(gear&&typeof gear.uid==='string'&&C.slots[gear.slot]&&C.sets[gear.set])items.push({kind:'gear',id:gear.uid,name:A.gearLabel(gear),count:1,rarity:gear.rarity,gear:JSON.parse(JSON.stringify(gear))});
  for(const id of reward.blueprints||[]){const found=/^gear_([^_]+)_([^_]+)$/.exec(id);if(C.sets[id]||found&&C.sets[found[1]]&&C.slots[found[2]])items.push({kind:'blueprint',id,name:blueprintName(id),count:1,rarity:5});}
  const priority={gear:9,blueprint:8,technique:7,treasure:6,recipe:5,currency:3,fragment:2,material:1};
  items.sort((a,b)=>priority[b.kind]-priority[a.kind]||b.rarity-a.rarity);
  const outcome=practice?'practice':win?'win':r.outcome==='exit'?'exit':'defeat';
  const title=practice?(win?'试阵完成':'试阵结束'):win?'挑战胜利':outcome==='exit'?'历练已结束':'重整旗鼓';
  const state=practice?'试阵不发奖励':pending?'暂存洞天，通关或归途阵门后携出':items.length?(win?'战利品已自动入账':'已携出收益已保留'):win&&r.type==='trial'?'试炼进度已记录':'本场没有可领取的奖励';
  return {title,outcome,win,practice,pending,first:!!r.first&&win&&!practice,stars:win&&!practice?Math.max(0,Math.min(3,Math.floor(r.stars||0))):0,items,state,rare:items.some(item=>item.rarity>=4)};
}
function icon(item){
  const art=item.kind==='gear'?A.gearArt(item.gear):item.kind==='technique'||item.kind==='fragment'&&item.id!=='universal'?G.technique(item.id):item.kind==='treasure'?G.treasure(item.id):item.kind==='recipe'?G.pill(item.id):G.utility(item.kind==='blueprint'?'blueprint':['xp','celestialXp'].includes(item.id)?'insight':item.id==='yuan'?'crystal5':item.id);
  if(!art)return '<span class="settlement-icon settlement-fallback" aria-hidden="true">✦</span>';
  const I=typeof module==='object'&&module.exports?require('./art-identity.js'):globalThis.WendaoArtIdentity,d=I.decorate(art);
  return `<span class="item-icon art-icon settlement-icon ${d.className}" ${d.attrs} style="${d.style}background-image:url(assets/${art.file});background-size:${esc(art.size)};background-position:${esc(art.position)}" role="img" aria-label="${esc(item.name)}"></span>`;
}
function inspect(item){
  const kind=item.kind==='fragment'&&item.id!=='universal'?'technique':['gear','technique','treasure'].includes(item.kind)?item.kind:null;
  return kind?`data-inspect-kind="${kind}" data-inspect-id="${esc(item.id)}"${item.kind==='gear'?` data-inspect-snapshot="${esc(JSON.stringify(item.gear))}"`:''}`:'';
}
function card(item,index,state){
  const attrs=inspect(item),inOverflow=item.kind==='gear'&&state?.rewardOverflow?.some(gear=>gear.uid===item.id),status=item.kind==='gear'?(inOverflow?'背包已满 · 奖励暂存':C.slots[item.gear.slot]+' · '+(item.gear.tier+1)+'阶'):item.kind==='blueprint'?'蓝图机缘 · 可打造对应灵装':item.kind==='recipe'?'新丹方已记录':item.kind==='technique'?'功法机缘 · 重复时转为通用残页':item.kind==='treasure'?'灵宝入库':item.kind==='fragment'?'积攒残页，学习或参悟':null;
  return `<article class="settlement-card rarity-${item.rarity}${item.rarity>=4?' settlement-rare':''}" data-reward-kind="${item.kind}" data-reward-id="${esc(item.id)}" style="--reward-order:${index};--rarity:${esc(C.rarities[item.rarity]?.color||'#adc5bc')}" ${attrs}>${icon(item)}<div class="settlement-item-copy"><small>${esc(C.rarities[item.rarity]?.name||'历练所得')}${item.rarity===5?' · 道品机缘':''}</small><strong>${esc(item.name)}</strong>${status?`<span>${esc(status)}</span>`:''}${attrs?`<button type="button" class="btn ghost small settlement-inspect" data-selection="inspect" ${attrs}>查看${item.kind==='gear'?'属性':'详情'}</button>`:''}</div><b class="settlement-count">${['currency','material','fragment'].includes(item.kind)?'+':'×'}${number(item.count)}</b></article>`;
}
function render(report,options={}){
  const r=report||{},v=model(r),stars=v.stars?`<div class="settlement-stars" aria-label="${v.stars}星通关">${'★'.repeat(v.stars)}<span>${'☆'.repeat(3-v.stars)}</span></div>`:'';
  const header=`<div class="settlement-hero"><div class="settlement-orbit" aria-hidden="true"></div><span class="settlement-kicker">${v.practice?'战术演练':v.win?'山海历练 · 捷报':'每次历练，向道而行'}</span><div class="settlement-seal" aria-hidden="true">${v.win?'胜':v.outcome==='exit'?'归':'炼'}</div><h3>${esc(v.title)}</h3><p>${esc(r.name||r.entryLabel||'山海历练')}</p>${stars}${v.first?'<span class="settlement-first">首次通关 · 首通机缘已解锁</span>':''}<small>${esc(options.context||'')} · 用时 ${number(r.duration??r.time??0)} 秒</small></div>`;
  const loot=v.items.length?`<div class="settlement-loot">${v.items.map((item,i)=>card(item,i,options.state)).join('')}</div>`:`<div class="settlement-empty">${esc(v.practice?'本次仅检验配装与出招，不消耗正式战斗进度。':r.type==='trial'&&v.win?'境界试炼完成，可以继续修行与突破。':r.reason||'调整配装与神通顺序，再次挑战山海。')}</div>`;
  return `<section class="battle-settlement settlement-${v.outcome}${v.first?' settlement-first-clear':''}" data-settlement="${v.outcome}" data-rewards-pending="${v.pending}">${header}<div class="settlement-status${v.pending?' is-pending':''}" role="status"><span aria-hidden="true">${v.pending?'◇':v.items.length?'✓':'·'}</span>${esc(v.state)}</div>${loot}${v.items.some(item=>inspect(item))?`<p class="settlement-touch-hint">长按战利品查看详情 · ${v.pending?'待携出收益尚未入账':'已入账收益无需再次领取'}</p>`:''}<p class="settlement-reason">${esc(r.reason||r.message||'')}</p></section>`;
}
return Object.freeze({model,render});
});
