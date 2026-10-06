(() => {
'use strict';
const C=window.WendaoData,K=window.WendaoCore,A=window.WendaoEquipmentArt;
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=value=>Number(value||0).toLocaleString('zh-CN',{maximumFractionDigits:1});
const json=value=>esc(JSON.stringify(value));
const kinds={heart:'心法',skill:'神通',secret:'秘术',treasure:'灵宝',pill:'丹药'};
const stats={attack:'攻击',defense:'防御',hp:'气血',maxHp:'气血',maxMp:'真元',crit:'暴击',critDamage:'暴伤',dodge:'闪避',cooldownReduction:'冷却缩减',healing:'治疗',penetration:'穿透',mpRegen:'真元恢复'};
const ratios=new Set(['crit','critDamage','dodge','cooldownReduction','healing','penetration']);
const quality=item=>C.rarities[item.rarity]?.name||'凡品';
const currentState=()=>window.Lingqi?.state();
const currentLoadout=state=>state.loadouts[state.route];
function equipmentIcon(gear){
 const art=A.gearArt(gear);
 return `<span class="item-icon art-icon equipment-art art-rarity-${art.rarity}" data-art-rarity="${art.rarity}" data-art-slot="${esc(art.slot)}" data-art-set="${esc(art.set)}" style="background-image:url(assets/${art.file});background-size:${art.size};background-position:${art.position}" aria-hidden="true"></span>`;
}
function techniqueIcon(technique){
 const art=window.WendaoGameArt?.technique(technique);
 if(art)return `<span class="item-icon art-icon" style="background-image:url(assets/${art.file});background-size:${art.size};background-position:${art.position}" aria-hidden="true"></span>`;
 const row=['sword','body','thunder','elements','shadow','array'].indexOf(technique.school),n=Number(technique.id.split('_').pop()),col=technique.kind==='heart'?n:technique.kind==='skill'?n+2:n+6;
 return `<span class="item-icon art-icon" style="background-image:url(assets/v3-skills-atlas.png);background-size:800% 600%;background-position:${col*100/7}% ${row*100/5}%" aria-hidden="true"></span>`;
}
function itemIcon(kind,id){
 const art=kind==='treasure'?window.WendaoGameArt?.treasure(id):window.WendaoGameArt?.pill(id);
 if(art)return `<span class="item-icon art-icon${kind==='pill'?' round':''}" style="background-image:url(assets/${art.file});background-size:${art.size};background-position:${art.position}" aria-hidden="true"></span>`;
 const n=kind==='treasure'?Number(id.slice(1)):Object.keys(C.recipes).indexOf(id),row=kind==='treasure'?1+Math.floor(n/6):3+Math.floor(n/6),col=n%6;
 return `<span class="item-icon art-icon${kind==='pill'?' round':''}" style="background-image:url(assets/v3-items-atlas.png);background-size:600% 600%;background-position:${col*20}% ${row*20}%" aria-hidden="true"></span>`;
}
const inspectAttrs=(kind,id)=>`data-inspect-kind="${esc(kind)}" data-inspect-id="${esc(id)}"`;
function card({kind,id,name,rarity,icon,subtitle='',status='',selected=false,blocked=false,action='',payload={},selection='',value='',extra=''}){
 const command=selection?`data-selection="${selection}" data-selection-value="${esc(value)}"`:action?`data-${action==='equipGear'?'action':'ui'}="${esc(action)}" data-payload="${json(payload)}"`:'';
 return `<article class="selection-cell rarity-${rarity}${selected?' is-selected':''}${blocked?' is-unavailable':''}" ${extra}><button type="button" class="selection-tile" ${command} ${inspectAttrs(kind,id)} aria-label="${esc(name+' · '+quality({rarity})+' · '+subtitle+(status?' · '+status:'')+'；点击选择，长按查看详情')}" aria-pressed="${selected}"${blocked?' aria-disabled="true"':''}>${icon}<strong>${esc(name)}</strong><small>${esc(subtitle)}</small>${status?`<span class="selection-status">${esc(status)}</span>`:''}</button><button type="button" class="selection-info" data-selection="inspect" ${inspectAttrs(kind,id)} aria-label="查看${esc(name)}详情">详情</button></article>`;
}
function equipmentCard(state,gear,options={}){
 const equipped=Object.values(state.equipped).includes(gear.uid),detail=options.action==='equipment',blocked=!detail&&(equipped||!!state.battle);
 return card({kind:'gear',id:gear.uid,name:A.gearLabel(gear),rarity:gear.rarity,icon:equipmentIcon(gear),subtitle:C.slots[gear.slot]+' · '+(gear.tier+1)+'阶',status:equipped?'已装配':state.battle&&!detail?'战斗中锁定':'',selected:equipped,blocked,action:detail?'equipment':blocked?'':'equipGear',payload:{uid:gear.uid},extra:`data-gear-uid="${esc(gear.uid)}"`});
}
function techniqueCard(state,id,options={}){
 const t=C.techniques[id];if(!t)return '';
 const l=currentLoadout(state),equipped=options.equipped??(l.heart===id||l.skills.includes(id)||l.secrets.includes(id));
 return card({kind:'technique',id,name:t.name,rarity:t.rarity,icon:techniqueIcon(t),subtitle:C.schools[t.school].name+' · '+(state.techniques[id]?.level||1)+'级',status:equipped?'出战中':'选择出战槽',selected:equipped,action:'loadout',payload:{kind:t.kind,id}});
}
function pageItems(items,options){
 const size=Math.max(1,Math.min(12,Number(options.pageSize)||9)),pages=Math.max(1,Math.ceil(items.length/size)),page=Math.max(0,Math.min(pages-1,Number(options.page)||0));
 return {size,pages,page,items:items.slice(page*size,(page+1)*size)};
}
function pager(p){return p.pages>1?`<div class="selection-pagination"><button type="button" data-selection="page" data-selection-value="${p.page-1}"${p.page===0?' disabled':''} aria-label="上一页">‹</button><span>${p.page+1} / ${p.pages}</span><button type="button" data-selection="page" data-selection-value="${p.page+1}"${p.page===p.pages-1?' disabled':''} aria-label="下一页">›</button></div>`:'';}
function equipmentItems(state,options={}){return state.bag.filter(g=>!options.slot||options.slot==='all'||g.slot===options.slot).slice().reverse();}
function techniqueItems(state,options={}){return Object.keys(state.techniques).filter(id=>C.techniques[id]&&(!options.kind||options.kind==='all'||C.techniques[id].kind===options.kind));}
function renderEquipment(state,options={}){
 const p=pageItems(equipmentItems(state,options),options);
 return `<section class="selection-library" data-selection-library="gear" data-selection-options="${json({...options,page:p.page})}"><div class="selection-grid">${p.items.map(g=>equipmentCard(state,g,options)).join('')||'<p class="selection-empty">此部位尚无灵装。</p>'}</div>${options.includePager===false?'':pager(p)}</section>`;
}
function renderTechnique(state,options={}){
 const p=pageItems(techniqueItems(state,options),options);
 return `<section class="selection-library" data-selection-library="technique" data-selection-options="${json({...options,page:p.page})}"><div class="selection-grid">${p.items.map(id=>techniqueCard(state,id,options)).join('')||'<p class="selection-empty">尚未习得此类功法，可在图鉴查看来源。</p>'}</div>${options.includePager===false?'':pager(p)}</section>`;
}
const categories=['heart','skill','secret','treasure','pill'];
const capacities={heart:1,skill:4,secret:2,treasure:3,pill:3};
function field(kind,index){return 'load-'+kind+(kind==='heart'?'':'-'+index);}
function draftFromState(state){
 const l=currentLoadout(state);
 return {heart:[l.heart||''],skill:Array.from({length:4},(_,i)=>l.skills[i]||''),secret:Array.from({length:2},(_,i)=>l.secrets[i]||''),treasure:Array.from({length:3},(_,i)=>l.treasures[i]||''),pill:Array.from({length:3},(_,i)=>l.pills[i]||'')};
}
function limits(state){const u=K.unlocks(state);return {heart:1,skill:u.skillSlots,secret:u.secretSlots,treasure:u.treasureSlots,pill:3};}
function slotName(kind,index){return kind==='heart'?'主心法':kind==='skill'?'第'+(index+1)+'招':kind==='secret'?'秘术'+(index+1):kind==='treasure'?index===0?'主动灵宝':'被动灵宝'+index:'药格'+(index+1);}
function lockedReason(kind,index){
 if(kind==='skill')return index===2?'当前仙途首境五层解锁第三招。':'当前仙途第二境一层解锁第四招。';
 if(kind==='secret')return index===0?'当前仙途首境五层开启秘术槽。':'当前仙途第二境四层开启第二秘术槽。';
 return ['当前仙途第二境一层开启主动灵宝槽。','当前仙途第二境四层开启第一被动灵宝槽。','当前仙途第二境七层开启第二被动灵宝槽。'][index];
}
function isAvailable(state,item){const p=state.paths[state.route];return p.realm>item.realm||p.realm===item.realm&&p.layer>=(item.layer||1);}
function pickItems(state,kind,index){
 if(kind==='treasure')return Object.keys(state.ownedTreasures).filter(id=>C.treasures[id]?.kind===(index===0?'active':'passive')).map(id=>C.treasures[id]);
 if(kind==='pill')return Object.values(C.recipes).filter(t=>['heal','shield','purify'].includes(t.kind));
 return Object.keys(state.techniques).map(id=>C.techniques[id]).filter(t=>t?.kind===kind);
}
function pickCard(state,item,model,locked){
 const kind=model.kind,chosen=model.draft[kind][model.index]===item.id,other=model.draft[kind].findIndex((id,i)=>id===item.id&&i!==model.index),duplicate=other>=0,available=isAvailable(state,item),equipped=kind==='heart'?currentLoadout(state).heart===item.id:(currentLoadout(state)[{skill:'skills',secret:'secrets',treasure:'treasures',pill:'pills'}[kind]]||[]).includes(item.id);
 const status=chosen?'已选择':duplicate?'已在'+slotName(kind,other):!available?'境界未开放':equipped?'当前出战':'';
 const detailKind=kind==='treasure'||kind==='pill'?kind:'technique';
 const subtitle=kind==='treasure'?(item.kind==='active'?'主动':'被动')+' · '+(state.ownedTreasures[item.id]?.level||1)+'级':kind==='pill'?'库存 '+number(state.pills[item.id]):C.schools[item.school].name+' · '+state.techniques[item.id].level+'级';
 return card({kind:detailKind,id:item.id,name:item.name,rarity:item.rarity,icon:detailKind==='technique'?techniqueIcon(item):itemIcon(detailKind,item.id),subtitle,status,selected:chosen,blocked:locked||duplicate||!available,selection:'pick',value:item.id});
}
function editorBody(state,model){
 const kind=model.kind,lim=limits(state),locked=model.index>=lim[kind]||!!state.battle,items=pickItems(state,kind,model.index),p=pageItems(items,{page:model.page,pageSize:6});model.page=p.page;
 const name=id=>C.techniques[id]?.name||C.treasures[id]?.name||C.recipes[id]?.name||'空槽';
 const inputs=categories.map(k=>model.draft[k].map((v,i)=>`<input type="hidden" id="${field(k,i)}" value="${esc(v)}">`).join('')).join('');
 const tabs=categories.map(k=>`<button type="button" data-selection="category" data-selection-value="${k}" role="tab" aria-selected="${kind===k}" class="${kind===k?'active':''}">${kinds[k]}</button>`).join('');
 const slots=Array.from({length:capacities[kind]},(_,i)=>`<button type="button" data-selection="slot" data-selection-value="${i}" class="${i===model.index?'active':''}${i>=lim[kind]?' locked':''}" aria-pressed="${i===model.index}" aria-label="${esc(slotName(kind,i)+(i>=lim[kind]?' · 未解锁':' · '+name(model.draft[kind][i])))}"><span>${esc(slotName(kind,i))}</span><small>${i>=lim[kind]?'未解锁':esc(name(model.draft[kind][i]))}</small></button>`).join('');
 const note=state.battle?'战斗中配置锁定，结束战斗后可调整。':model.index>=lim[kind]?lockedReason(kind,model.index):kind==='skill'?'按槽位顺序释放；同一神通只能占一个槽。':kind==='treasure'?(model.index===0?'此槽仅可装配主动灵宝。':'此槽仅可装配被动灵宝。'):kind==='pill'?'每种丹药只占一个药格，携带不消耗库存。':kind==='secret'?'秘术自动生效；同一秘术只能占一个槽。':'心法决定战斗中的资源运转。';
 return `${inputs}<div class="selection-category-tabs" role="tablist" aria-label="配置类别">${tabs}</div><div class="selection-slot-tabs" style="--selection-slots:${capacities[kind]}" aria-label="选择出战槽">${slots}</div><p class="selection-hint">${esc(note)}</p><div class="selection-editor-heading"><strong>${esc(slotName(kind,model.index))} · ${esc(name(model.draft[kind][model.index]))}</strong><button type="button" data-selection="clear"${locked?' disabled':''} aria-label="清空${esc(slotName(kind,model.index))}">清空</button></div><div class="selection-grid">${model.index>=lim[kind]?`<div class="selection-empty">${esc(lockedReason(kind,model.index))}</div>`:p.items.map(t=>pickCard(state,t,model,locked)).join('')||'<div class="selection-empty">尚未获得可用的'+kinds[kind]+'，在图鉴中查看获取来源。</div>'}</div>${model.index>=lim[kind]?'':pager(p)}<p class="selection-hint">点图片选择 · 长按或点详情查看说明</p><p class="selection-draft-status" role="status">${model.changed?'配置已调整，点击「保存出战配置」生效。':'配置选择后需保存生效。'}</p>`;
}
function renderLoadout(state,options={}){
 const kind=categories.includes(options.kind)?options.kind:'skill',model={kind,index:0,page:0,draft:draftFromState(state),changed:false};
 if(options.id){const i=model.draft[kind].indexOf(options.id);model.index=i>=0?i:Math.max(0,model.draft[kind].findIndex(id=>!id));const items=pickItems(state,kind,model.index);model.page=Math.max(0,Math.floor(items.findIndex(t=>t.id===options.id)/6));}
 const body=editorBody(state,model);
 return `<div class="selection-loadout" data-selection-model="${json(model)}">${body}</div>`;
}
function updateEditor(root,model,state){const scroll=document.querySelector('#modal-layer .modal-body'),top=scroll?.scrollTop;cancelHold();root.innerHTML=editorBody(state,model);root.dataset.selectionModel=JSON.stringify(model);if(scroll&&Number.isFinite(top))scroll.scrollTop=top;}
let inspectLayer=null,returnFocus=null;
function statLines(values){return Object.entries(values||{}).filter(([id,v])=>stats[id]&&Number(v)!==0).map(([id,v])=>`<div><dt>${esc(stats[id])}</dt><dd>${ratios.has(id)?number(v*100)+'%':number(v)}</dd></div>`).join('');}
function detailContent(state,kind,id,origin){
 if(kind==='gear'){
  const g=state.bag.find(item=>item.uid===id);if(!g)return null;const set=C.sets[g.set],equipped=Object.values(state.equipped).includes(id),attrs=K.gearStats(state,g);
  return {name:A.gearLabel(g),rarity:g.rarity,icon:equipmentIcon(g),body:`<p class="selection-detail-meta">${esc(quality(g))} · ${esc(C.slots[g.slot])} · ${g.tier+1}阶 · ${equipped?'已装配':'背包中'}</p><dl class="selection-detail-stats">${statLines(attrs)}</dl><p>部位强化 +${number(state.slotLevels[g.slot])} · 觉醒 ${number(g.awakening)}${g.locked?' · 已保护':''}</p>${g.affixes?.length?'<p class="selection-hint">词条：'+g.affixes.map(x=>esc((window.WendaoEconomy?.affixes?.[x.id]?.name||stats[x.id]||x.id)+' '+(ratios.has(x.id)?number(x.value*100)+'%':number(x.value)))).join(' · ')+'</p>':''}<h3>${esc(set?.name||'灵装')}套装</h3><p>两件：${esc(set?.twoEffect||'无')}</p><p>四件：${esc(set?.fourEffect||'无')}</p>${g.rarity===5?'<p class="selection-red-effect">道品：'+esc(set?.redEffect||'道品专属机制')+'</p>':''}<p class="selection-hint">强化保存在部位，更换灵装继承强化。</p>`};
 }
 const item=(kind==='technique'?C.techniques:kind==='treasure'?C.treasures:C.recipes)[id];if(!item)return null;
 const own=kind==='technique'?state.techniques[id]:kind==='treasure'?state.ownedTreasures[id]:null,l=currentLoadout(state),equipped=kind==='technique'?l.heart===id||l.skills.includes(id)||l.secrets.includes(id):kind==='treasure'?l.treasures.includes(id):l.pills.includes(id),modelRoot=origin?.closest('.selection-loadout'),model=modelRoot?JSON.parse(modelRoot.dataset.selectionModel):null,draftSelected=model&&model.draft[model.kind][model.index]===id;
 const activeKind=kind==='technique'?kinds[item.kind]:kind==='treasure'?item.kind==='active'?'主动灵宝':'被动灵宝':'战斗丹药',realm=C.routes[state.route].realmNames[item.realm];
 const body=`<p class="selection-detail-meta">${esc(quality(item))} · ${esc(activeKind)}${own?' · '+number(own.level)+'级':''} · ${draftSelected?'本槽已选择':equipped?'当前出战':'未出战'}</p><p>${esc(item.description)}</p>${kind==='technique'&&item.kind==='skill'?`<dl class="selection-detail-stats"><div><dt>真元消耗</dt><dd>${number(item.mp)}</dd></div><div><dt>基础冷却</dt><dd>${number(item.cooldown)}秒</dd></div>${item.power?`<div><dt>基础倍率</dt><dd>${number(item.power*100)}%</dd></div>`:''}</dl>`:kind==='treasure'&&item.cooldown?`<p>基础冷却 ${number(item.cooldown)}秒</p>`:''}${kind==='pill'?`<p>当前库存 ${number(state.pills[id])} · 战斗中使用时消耗</p>`:''}${kind==='technique'&&own?.level>=5?`<h3>当前分支 · ${esc(item.branches?.[own.branch]?.name||'凝练')}</h3><p>${esc(item.branches?.[own.branch]?.description||'')}</p>`:''}${kind==='technique'?`<div class="selection-detail-milestones">${(item.milestones||[]).map(m=>`<p class="${own?.level>=m.level?'achieved':''}">${number(m.level)}级 · ${esc(m.name)}${own?.level>=m.level?' ✓':''}<small>${esc(m.description)}</small></p>`).join('')}</div>`:''}<p class="selection-hint">开放条件：${esc(realm)}${number(item.layer||1)}层</p><p class="selection-detail-source">来源：${esc(item.source?.label||'修行与历练')}</p>`;
 return {name:item.name,rarity:item.rarity,icon:kind==='technique'?techniqueIcon(item):itemIcon(kind,id),body};
}
function hideDetail(){if(!inspectLayer)return false;inspectLayer.remove();inspectLayer=null;const focus=returnFocus;returnFocus=null;if(focus?.isConnected)focus.focus({preventScroll:true});return true;}
function showDetail(origin){
 const state=currentState();if(!state)return;const detail=detailContent(state,origin.dataset.inspectKind,origin.dataset.inspectId,origin);if(!detail)return;
 hideDetail();returnFocus=origin;inspectLayer=document.createElement('div');inspectLayer.className='selection-inspect-layer';inspectLayer.innerHTML=`<div class="selection-inspect-backdrop" data-selection="dismiss-inspect"></div><section class="selection-inspect-card rarity-${detail.rarity}" role="dialog" aria-modal="true" aria-label="${esc(detail.name)}详情"><header>${detail.icon}<h2>${esc(detail.name)}</h2><button type="button" data-selection="dismiss-inspect" aria-label="关闭物品详情">×</button></header><div class="selection-inspect-body">${detail.body}</div><footer><button type="button" data-selection="dismiss-inspect">返回选择</button></footer></section>`;document.body.append(inspectLayer);inspectLayer.querySelector('header button').focus({preventScroll:true});
}
let hold=null,suppressed=null;
function cancelHold(suppressClick=false){if(!hold)return;clearTimeout(hold.timer);if(suppressClick)suppressed={target:hold.target,until:performance.now()+1000};hold=null;}
document.addEventListener('pointerdown',event=>{
 if(event.button!==0||!event.isPrimary)return;
 cancelHold();suppressed=null;const target=event.target.closest('[data-inspect-kind]');if(!target||target.dataset.selection==='inspect')return;
 hold={target,id:event.pointerId,x:event.clientX,y:event.clientY,timer:setTimeout(()=>{if(!hold||!target.isConnected)return;hold.timer=null;suppressed={target,until:performance.now()+1600};showDetail(target);},450)};
},{capture:true,passive:true});
document.addEventListener('pointermove',event=>{if(hold&&event.pointerId===hold.id&&Math.hypot(event.clientX-hold.x,event.clientY-hold.y)>8)cancelHold(true);},{capture:true,passive:true});
document.addEventListener('pointerup',event=>{if(hold&&event.pointerId===hold.id){if(hold.timer===null)suppressed={target:hold.target,until:performance.now()+1000};cancelHold();}},{capture:true,passive:true});
document.addEventListener('pointercancel',()=>cancelHold(true),{capture:true,passive:true});
document.addEventListener('scroll',()=>cancelHold(true),{capture:true,passive:true});
document.addEventListener('contextmenu',event=>{const target=event.target.closest('[data-inspect-kind]');if(!target)return;event.preventDefault();cancelHold();showDetail(target);},{capture:true});
document.addEventListener('click',event=>{
 const target=event.target.closest('button,[data-selection]');if(!target)return;
 if(suppressed&&event.detail>0&&performance.now()<suppressed.until&&(target===suppressed.target||suppressed.target.contains(target))){event.preventDefault();event.stopImmediatePropagation();suppressed=null;return;}
 const control=target.dataset.selection;if(!control){if(target.classList.contains('selection-tile')&&target.getAttribute('aria-disabled')==='true'){event.preventDefault();event.stopImmediatePropagation();}return;}
 event.preventDefault();event.stopImmediatePropagation();cancelHold();
 if(control==='dismiss-inspect'){hideDetail();return;}
 if(control==='inspect'){showDetail(target);return;}
 const root=target.closest('.selection-loadout'),state=currentState();if(!state)return;
 if(root){
  const model=JSON.parse(root.dataset.selectionModel),value=target.dataset.selectionValue;
  if(control==='category'){model.kind=value;model.index=0;model.page=0;}
  else if(control==='slot'){model.index=Number(value);model.page=0;}
  else if(control==='page')model.page=Number(value);
  else if(control==='clear'||control==='pick'){
   if(state.battle||model.index>=limits(state)[model.kind]||target.getAttribute('aria-disabled')==='true')return;
   if(control==='pick'){const item=pickItems(state,model.kind,model.index).find(t=>t.id===value);if(!item||!isAvailable(state,item)||model.draft[model.kind].some((id,i)=>id===value&&i!==model.index))return;}
   model.draft[model.kind][model.index]=control==='clear'?'':value;model.changed=true;
  }
  updateEditor(root,model,state);return;
 }
 const library=target.closest('[data-selection-library]');if(control==='page'&&library){const options={...JSON.parse(library.dataset.selectionOptions),page:Number(target.dataset.selectionValue)},top=window.scrollY;library.outerHTML=library.dataset.selectionLibrary==='gear'?renderEquipment(state,options):renderTechnique(state,options);window.scrollTo({top,behavior:'instant'});}
},{capture:true});
document.addEventListener('keydown',event=>{
 if(!inspectLayer)return;
 if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();hideDetail();}
 else if(event.key==='Tab'){const buttons=Array.from(inspectLayer.querySelectorAll('button')),first=buttons[0],last=buttons.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}
},{capture:true});
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelHold();hideDetail();}});
window.addEventListener('pagehide',()=>{cancelHold();hideDetail();});
window.WendaoSelection=Object.freeze({equipmentIcon,techniqueIcon,equipmentCard,techniqueCard,renderEquipment,renderTechnique,renderLoadout,equipmentCount:(state,options)=>equipmentItems(state,options).length,techniqueCount:(state,options)=>techniqueItems(state,options).length,cancelHold,hideDetail});
})();
