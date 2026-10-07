(function(root,factory){
  const node=typeof module==='object'&&module.exports;
  const api=factory(node?require('./data.js'):root.WendaoData,node?require('./equipment-art.js'):root.WendaoEquipmentArt,node?require('./game-art.js'):root.WendaoGameArt,node?require('./art-identity.js'):root.WendaoArtIdentity);
  if(node)module.exports=api;else root.WendaoActivityRewards=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(C,A,G,I){
'use strict';
const SUPPORTED=new Set(['sweepDungeon','craftPill','finishAlchemyJob','forgeGear','claimWisdom','claimCommission','claimChapter','claimSidequest','jointStep','claimOverflow','recycleGear','bulkRecycle','recycleTreasure','cancelAlchemyJob','jointCancel','chooseCave']);
const titles={sweepDungeon:'扫荡完成',craftPill:'丹药炼成',finishAlchemyJob:'丹药炼成',forgeGear:'灵装铸成',claimWisdom:'悟道所得',claimCommission:'委托完成',claimChapter:'卷章完成',claimSidequest:'机缘已得',jointStep:'共修完成',claimOverflow:'灵装归囊',recycleGear:'分解完成',bulkRecycle:'分解完成',recycleTreasure:'分解完成',cancelAlchemyJob:'药材已退还',jointCancel:'邀约费用已退还',chooseCave:'洞天采获'};
const labels={stones:'灵石',xp:'修为',tickets:'感应券',contribution:'宗门贡献',jade:'灵玉',dust:'天道尘',herb:'灵草',ore:'玄铁',lotus:'灵莲',insight:'参悟',essence:'炼器精华',soul:'器魂',crystal0:'一阶天命晶',crystal1:'二阶天命晶',crystal2:'三阶天命晶',crystal3:'四阶天命晶',crystal4:'五阶天命晶',crystal5:'六阶天命晶'};
const own=(o,k)=>!!o&&Object.prototype.hasOwnProperty.call(o,k),copy=x=>JSON.parse(JSON.stringify(x));
const n=x=>Number.isFinite(x)?x:0,esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=x=>Number(x).toLocaleString('zh-CN',{maximumFractionDigits:1});
// The difference includes XP spent on automatic small-layer advancement, but
// never treats a new major realm as reward XP. These activities cannot break through.
function pathXp(p){if(!p)return 0;return n(p.xp)+n(p.reserve)+C.layerXp.slice(0,Math.max(0,p.layer-1)).reduce((sum,value)=>sum+Math.round(value*C.realmXpFactors[p.realm]),0);}
function scope(s,pending){
  if(!pending)return {stones:n(s.stones),tickets:n(s.tickets),contribution:n(s.sect?.contribution),jade:n(s.jade),dust:n(s.dust),materials:s.materials||{},fragments:s.fragments||{},pills:s.pills||{},gear:[...(s.bag||[]),...(s.rewardOverflow||[])]};
  const a=s.exploration?.pending||{},b=s.exploration?.banked||{},r={};
  for(const key of ['stones','tickets','xp','contribution','jade','dust'])r[key]=n(a[key])+n(b[key]);
  for(const field of ['materials','fragments','pills'])r[field]=Object.fromEntries([...new Set([...Object.keys(a[field]||{}),...Object.keys(b[field]||{})])].map(id=>[id,n(a[field]?.[id])+n(b[field]?.[id])]));
  r.gear=[...(a.gear||[]),...(b.gear||[])];return r;
}
function blueprintName(id){const target=/^gear_([^_]+)_([^_]+)$/.exec(id);return C.sets[id]?C.sets[id].name+' · 套装蓝图':target&&C.sets[target[1]]&&C.slots[target[2]]?C.sets[target[1]].name+' · '+C.slots[target[2]]+'蓝图':null;}
// Read-only feedback after the action and its save commit. The engine remains
// the sole owner of all grants; repeated rendering cannot mint another reward.
function model(action,result,before,after){
  const type=typeof action==='string'?action:action?.type,a=typeof action==='string'?{type}:action||{};
  if(!SUPPORTED.has(type)||!result?.ok||!before||!after)return null;
  if(type==='jointStep'&&(after.joint||!before.joint))return null;
  const pending=type==='chooseCave';
  if(pending&&(!before.exploration||!after.exploration||after.battle||before.exploration.practice||after.exploration.practice))return null;
  const prev=scope(before,pending),next=scope(after,pending),items=[],costs=[];
  const add=(kind,id,name,count,rarity,extra={})=>{if(name&&Number.isFinite(count)&&count>0)items.push({kind,id,name,count,rarity,...extra});};
  for(const id of ['stones','tickets','contribution','jade','dust']){
    const difference=n(next[id])-n(prev[id]);
    add('currency',id,labels[id],difference,id==='tickets'?3:0);
    if(!pending&&difference<0)costs.push({id,name:labels[id],count:-difference});
  }
  if(pending)add('currency','xp',labels.xp,n(next.xp)-n(prev.xp),0);
  else for(const route of Object.keys(C.routes))if(before.paths?.[route]?.realm===after.paths?.[route]?.realm){const difference=pathXp(after.paths?.[route])-pathXp(before.paths?.[route]);add('currency','xp',labels.xp,difference,0,{route});}
  for(const [field,kind] of [['materials','material'],['fragments','fragment'],['pills','pill']])for(const id of new Set([...Object.keys(prev[field]||{}),...Object.keys(next[field]||{})])){
    const difference=n(next[field]?.[id])-n(prev[field]?.[id]);
    const name=field==='materials'?labels[id]:field==='pills'?C.recipes[id]?.name:id==='universal'?'通用功法残页':C.techniques[id]?.name+' · 残页';
    const rarity=field==='pills'?C.recipes[id]?.rarity:field==='fragments'?id==='universal'?2:C.techniques[id]?.rarity:id.startsWith('crystal')?4:id==='soul'?3:1;
    if(field==='fragments'&&id!=='universal'&&!own(C.techniques,id)||field==='pills'&&!own(C.recipes,id))continue;
    add(kind,id,name,difference,rarity||0);
    if(!pending&&difference<0&&name)costs.push({id,name,count:-difference});
  }
  if(pending){
    for(const id of ['stones','tickets','jade','dust']){const used=n(before[id])-n(after[id]);if(used>0)costs.push({id,name:labels[id],count:used});}
    for(const [field,catalog] of [['materials',labels],['pills',C.recipes]])for(const id of Object.keys(before[field]||{})){const used=n(before[field][id])-n(after[field]?.[id]),name=field==='materials'?catalog[id]:catalog[id]?.name;if(used>0&&name)costs.push({id,name,count:used});}
  }
  const oldUids=new Set((type==='claimOverflow'?before.bag||[]:prev.gear).map(g=>g.uid));
  for(const gear of type==='claimOverflow'?after.bag||[]:next.gear)if(!oldUids.has(gear.uid)&&own(C.sets,gear.set)&&own(C.slots,gear.slot))add('gear',gear.uid,A.gearLabel(gear),1,gear.rarity,{gear:copy(gear)});
  if(!pending){
    for(const id of Object.keys(after.techniques||{}))if(!own(before.techniques,id)&&own(C.techniques,id))add('technique',id,C.techniques[id].name,1,C.techniques[id].rarity);
    for(const id of Object.keys(after.ownedTreasures||{}))if(own(C.treasures,id))add('treasure',id,C.treasures[id].name,n(after.ownedTreasures[id].count)-n(before.ownedTreasures?.[id]?.count),C.treasures[id].rarity);
    for(const id of after.learnedRecipes||[])if(!(before.learnedRecipes||[]).includes(id)&&own(C.recipes,id))add('recipe',id,C.recipes[id].name+' · 丹方',1,C.recipes[id].rarity);
    for(const id of after.blueprints||[])if(!(before.blueprints||[]).includes(id))add('blueprint',id,blueprintName(id),1,5);
  }
  // Setting, preparing or advancing a partial job must never claim completion.
  if(!items.length&&!['sweepDungeon','claimWisdom','claimCommission','claimChapter','claimSidequest','jointStep'].includes(type))return null;
  const priorities={gear:10,pill:9,blueprint:8,technique:7,treasure:6,recipe:5,currency:3,fragment:2,material:1};
  items.sort((x,y)=>priorities[y.kind]-priorities[x.kind]||y.rarity-x.rarity);
  let subtitle='',note='',bonus=0,count=0;
  if(type==='sweepDungeon'){
    count=result.data?.costMs/45000||0;subtitle=(C.dungeons[a.id]?.name||'资源秘境')+' · '+number(count)+'次';
    note='历练储备消耗 '+number((result.data?.costMs||0)/1000)+'秒；仅有基础材料，不计首通。';
  }else if(type==='craftPill'||type==='finishAlchemyJob'){
    const id=result.data?.id||a.id,pill=items.find(item=>item.kind==='pill'&&item.id===id),job=before.alchemy?.jobs?.find(j=>j.id===a.jobId);
    count=pill?.count||0;bonus=Math.min(count,Math.max(0,n(result.data?.bonus)));
    subtitle=(C.recipes[id]?.name||'丹炉所得')+' · '+number(count)+'枚';
    note=bonus?'基础成丹 '+number(count-bonus)+'枚 · 控火额外 '+number(bonus)+'枚'+(job?' · 火候契合 '+number(job.score)+'/3轮':''):'普通成丹，实际产量已存入丹囊。';
  }else if(type==='forgeGear')subtitle=items.find(item=>item.kind==='gear')?.name||'定向打造';
  else if(type==='claimChapter')subtitle=C.chapters.find(ch=>ch.id===result.data?.chapter)?.name||'主线仙途';
  else if(type==='claimSidequest')subtitle=C.sidequests.find(q=>q.id===a.id)?.name||'山海机缘';
  else if(type==='claimCommission')subtitle=C.commissions[a.id]?.name||'宗门委托';
  else if(type==='jointStep'){subtitle=(C.companions[before.joint?.companion]?.name||'同道')+' · 灵息共修';note='灵息共鸣 '+number(result.data?.score||0)+' · 只展示本次实际增加的修为。';}
  else if(pending)subtitle=before.exploration?.choices?.find(choice=>choice.id===a.choice)?.label||'洞天机缘';
  const overflow=items.some(item=>item.kind==='gear'&&after.rewardOverflow?.some(g=>g.uid===item.id));
  const status=pending?'收益暂存洞天，通关或归途阵门后携出':type==='claimOverflow'?'已从奖励暂存移入背包，不重复发放装备':!items.length?'储存已达上限，本次没有新增物品':overflow?'所得已保存，部分灵装进入奖励暂存':'所得已自动入账并保存，无需再次领取';
  return {type,title:titles[type],subtitle,note,bonus,count,items,costs,pending,overflow,status,message:String(result.message||''),rare:items.some(item=>item.rarity>=4)};
}
function icon(item){const art=item.kind==='gear'?A.gearArt(item.gear):item.kind==='pill'||item.kind==='recipe'?G.pill(item.id):item.kind==='technique'||item.kind==='fragment'&&item.id!=='universal'?G.technique(item.id):item.kind==='treasure'?G.treasure(item.id):G.utility(item.kind==='blueprint'?'blueprint':item.id==='xp'?'insight':item.id),d=I?.decorate(art)||{className:'',attrs:'',style:''};return art?`<span class="item-icon art-icon settlement-icon ${d.className}" ${d.attrs} role="img" aria-label="${esc(item.name)}" style="${d.style}background-image:url(assets/${art.file});background-size:${esc(art.size)};background-position:${esc(art.position)}"></span>`:'<span class="settlement-icon settlement-fallback" aria-hidden="true">✦</span>';}
function inspect(item){const kind=['gear','technique','treasure','pill'].includes(item.kind)?item.kind:item.kind==='recipe'?'pill':item.kind==='fragment'&&item.id!=='universal'?'technique':null;return kind?`data-inspect-kind="${kind}" data-inspect-id="${esc(item.id)}"${item.kind==='gear'?` data-inspect-snapshot="${esc(JSON.stringify(item.gear))}"`:''}`:'';}
function card(item,index,state){const attrs=inspect(item),overflow=item.kind==='gear'&&state?.rewardOverflow?.some(g=>g.uid===item.id);return `<article class="settlement-card rarity-${item.rarity}${item.rarity>=4?' settlement-rare':''}" data-reward-kind="${item.kind}" data-reward-id="${esc(item.id)}" data-reward-count="${esc(item.count)}" style="--reward-order:${index};--rarity:${esc(C.rarities[item.rarity]?.color||'#d1d5db')}" ${attrs}>${icon(item)}<div class="settlement-item-copy"><small>${esc(C.rarities[item.rarity]?.name||'历练所得')}</small><strong>${esc(item.name)}</strong>${item.kind==='gear'?`<span>${overflow?'奖励暂存 · 整理背包后可取':esc(C.slots[item.gear.slot])+' · '+(item.gear.tier+1)+'阶'}</span>`:item.route?`<span>${esc(C.routes[item.route]?.name||'')}</span>`:''}${attrs?`<button type="button" class="btn ghost small settlement-inspect" data-selection="inspect" ${attrs}>查看${item.kind==='gear'?'属性':'详情'}</button>`:''}</div><b class="settlement-count">${['gear','treasure','technique','recipe','blueprint'].includes(item.kind)?'×':'+'}${number(item.count)}</b></article>`;}
function render(value,options={}){
  if(!value)return '';const v=value,refund=['cancelAlchemyJob','jointCancel'].includes(v.type),seal=v.type==='sweepDungeon'?'捷':v.type==='forgeGear'?'铸':v.type==='craftPill'||v.type==='finishAlchemyJob'?'丹':refund?'还':'得';
  return `<section class="activity-settlement${v.pending?' activity-pending':''}" data-activity-settlement="${esc(v.type)}" data-rewards-pending="${!!v.pending}"><div class="activity-hero"><span class="activity-seal" aria-hidden="true">${seal}</span><div class="activity-hero-copy"><small>${refund?'材料如数返还':v.pending?'洞天机缘 · 暂存所得':'修行有获 · 机缘入囊'}</small><h3>${esc(v.title)}</h3><p>${esc(v.subtitle||v.message)}</p></div></div><div class="settlement-status${v.pending?' is-pending':''}" role="status">${esc(v.status)}</div>${v.note?`<p class="activity-note">${esc(v.note)}</p>`:''}${v.items.length?`<div class="settlement-loot activity-loot">${v.items.map((item,i)=>card(item,i,options.state)).join('')}</div>`:'<div class="settlement-empty">本次没有新增物品。可先使用已有资源，腾出储存空间。</div>'}${v.costs.length?`<details class="activity-costs"><summary>查看本次材料消耗</summary><p>${v.costs.map(cost=>esc(cost.name)+' −'+number(cost.count)).join(' · ')}</p></details>`:''}${v.items.some(item=>inspect(item))?'<p class="settlement-touch-hint">长按物品查看详情</p>':''}</section>`;
}
return Object.freeze({model,render,supported:Object.freeze([...SUPPORTED])});
});
