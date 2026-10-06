(() => {
'use strict';
const E=window.IdleEngine, C=E.catalog||window.WendaoData, K=window.WendaoCore, Q=window.WendaoEconomy, A=window.WendaoEquipmentArt, G=window.WendaoGameArt, Sound=window.LingqiAudio;
const PREVIEW=new URLSearchParams(location.search).get('preview')==='1';
const KEY=PREVIEW?'lingqi-preview-save-v1':'lingqi-save-v2', OLD=PREVIEW?'lingqi-preview-save-v1':'lingqi-save-v1', AGE=PREVIEW?'lingqi-preview-age-confirmed':'lingqi-age-confirmed', MAX=1048576;
const app=document.getElementById('app'), layer=document.getElementById('modal-layer'), toastEl=document.getElementById('toast'), fileInput=document.getElementById('import-file');
let s=null,page='cultivation',modal=null,recovery=null,mounted=false,lastFrame=Date.now(),lastPassive=Date.now(),lastPersist=0,timer=null,toastTimer=null,busy=false,pointerHeld=false,previousBattleFrame=null,summonTimer=null,summonPulseTimer=null,redRevealTimer=null;
const uiState={techSchool:'all',techKind:'all',dungeonType:'resource',gearSlot:'all',gearRarity:'all',gearSet:'all',sideTab:'story',selectedDungeon:null,drawResults:[],redRevealIndex:0,poolCategory:'gear',poolRarity:5,modalPages:{},shopTab:'resources',resourceCount:1,buildTab:'techniques'};
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=x=>Number.isFinite(Number(x))?Number(x).toLocaleString('zh-CN',{maximumFractionDigits:1}):'0';
const pct=(x,m)=>Math.max(0,Math.min(100,m?x/m*100:0));
const mat={jade:'灵玉',gearCount:'随机装备',herb:'灵草',ore:'玄铁',lotus:'灵莲',insight:'参悟',essence:'炼器精华',soul:'器魂',stones:'灵石',tickets:'感应券',dust:'天道尘',contribution:'贡献',xp:'修为',crystal:'同阶天命晶',crystal0:'一阶天命晶',crystal1:'二阶天命晶',crystal2:'三阶天命晶',crystal3:'四阶天命晶',crystal4:'五阶天命晶',crystal5:'六阶天命晶'};
const kindName={heart:'心法',skill:'神通',secret:'秘术'},typeName={resource:'资源秘境',sect:'宗门试炼',boss:'妖王讨伐',tower:'问道塔',cave:'洞天探索',trial:'突破试炼'};
const rar=n=>C.rarities[n]||C.rarities[0], routeName=id=>C.routes[id].name, realmName=(route=s.route,realm=s.paths[route].realm)=>C.routes[route].realmNames[realm]||'终境';
const act=(label,type,p={},cls='secondary',disabled=false)=>`<button class="btn ${cls}" data-action="${esc(type)}" data-payload="${esc(JSON.stringify(p))}"${disabled?' disabled':''}>${esc(label)}</button>`;
const ui=(label,id,p={},cls='ghost',disabled=false)=>`<button class="btn ${cls}" data-ui="${esc(id)}" data-payload="${esc(JSON.stringify(p))}"${disabled?' disabled':''}>${esc(label)}</button>`;
const bar=(value,max,cls='',id='')=>`<div class="progress ${cls}"><div class="fill"${id?` id="${esc(id)}"`:''} style="width:${pct(value,max)}%"></div></div>`;
const select=(id,items,value)=>`<select id="${esc(id)}">${items.map(x=>`<option value="${esc(x.id)}"${String(x.id)===String(value)?' selected':''}>${esc(x.name)}</option>`).join('')}</select>`;
const panel=(title,body,extra='')=>`<section class="panel"><div class="panel-head"><h3>${esc(title)}</h3>${extra}</div>${body}</section>`;
const badge=(text,cls='')=>`<span class="tag ${cls}">${esc(text)}</span>`;
const price=x=>{
 if(!x||typeof x!=='object')return '';const out=[];
 for(const [key,value] of Object.entries(x)){
  if(Array.isArray(value)){for(const id of value){if(typeof id==='string')out.push(C.techniques[id]?.name||C.treasures[id]?.name||C.sets[id]?.name||id);else if(id&&typeof id==='object'&&id.slot)out.push(gearName(id));}continue;}
  if(value&&typeof value==='object'){for(const [id,count] of Object.entries(value)){if(Number(count)>0)out.push((key==='fragments'?(C.techniques[id]?.name||'通用')+'残页':mat[id]||C.recipes[id]?.name||routeNameSafe(id)||id)+' '+num(count));}continue;}
  if(Number(value)>0)out.push((mat[key]||key)+' '+num(value));
 }
 return out.join(' · ');
};
const routeNameSafe=id=>C.routes[id]?.name||'';
const affixValue=x=>Q?.affixes?.[x.id]?.kind==='ratio'?num(x.value*100)+'%':num(x.value);
const costing=(type,p={})=>{try{return E.costs?E.costs(s,type,p):Q&&Q.costs?Q.costs(s,type,p):null;}catch(e){return null;}};
const costLine=(type,p={})=>{const x=price(costing(type,p));return x?`<p class="cost">消耗：${esc(x)}</p>`:'';};
const currentView=()=>E.view(s);
const atlasPosition=(index,cols,rows)=>((index%cols)*100/(cols-1))+'% '+(Math.floor(index/cols)*100/(rows-1))+'%';
function artworkIcon(art,label='',cls=''){
 if(!art)return '';
 return `<div class="item-icon art-icon game-art ${esc(cls)}" style="background-image:url(assets/${art.file});background-size:${art.size};background-position:${art.position}" role="img" aria-label="${esc(label)}"></div>`;
}
function utilityIcon(id,label='',cls=''){return artworkIcon(G.utility(id),label||mat[id]||id,'utility-icon '+cls);}
const techniqueIcon=t=>artworkIcon(G.technique(t),t.name,'tech-art art-rarity-'+t.rarity);
const gearIcon=g=>{const art=A.gearArt(g);return `<div class="item-icon art-icon equipment-art art-rarity-${art.rarity}" data-art-rarity="${art.rarity}" data-art-slot="${esc(art.slot)}" data-art-set="${esc(art.set)}" style="background-image:url(assets/${art.file});background-size:${art.size};background-position:${art.position}" role="img" aria-label="${esc(A.gearLabel(g))}"></div>`;};
const itemIcon=(kind,id,label)=>artworkIcon(kind==='treasure'?G.treasure(id):kind==='pill'?G.pill(id):G.utility(id),label,(kind==='pill'?'round ':'')+'art-rarity-'+(kind==='treasure'?C.treasures[id]?.rarity:kind==='pill'?C.recipes[id]?.rarity:0));
const dungeonArt=d=>{if(d.type==='boss'){const n=Number(d.bossIndex??d.id.split('_').pop());return {file:'v3-boss-atlas.png',position:atlasPosition(n,3,4),size:'300% 400%'};}let n=Number(String(d.artKey||'map_'+d.realm*2).replace('map_',''));if(!Number.isFinite(n))n=d.realm*2;n=Math.max(0,Math.min(11,n));return {file:'v3-map-atlas-'+(n<6?'a':'b')+'.png',position:atlasPosition(n%6,3,2),size:'300% 200%'};};
const monsterIndex=(x,b)=>{const ids={boar:0,golem:1,water:2,thunder:3,shadow:4,armor:5,flower:6,star:7};if(ids[x.species]!==undefined)return ids[x.species];const label=(x.name||'')+' '+(x.id||'');if(/花|莲|flower/.test(label))return 6;if(/矿|傀|golem/.test(label))return 1;if(/雷|隼|thunder/.test(label))return 3;if(/影|狼|shadow/.test(label))return 4;if(/水|潮|water/.test(label))return 2;if(/星|阵灵|star/.test(label))return 7;if(/古甲|甲卫|armor/.test(label))return 5;const resource={resource_herb:0,resource_ore:1,resource_insight:2,resource_essence:5,resource_fate:7};if(resource[b.id]!==undefined)return resource[b.id];return (x.index+(b.tier||0))%8;};
const monsterPortrait=(x,b)=>{const n=monsterIndex(x,b);return '<div class="monster-portrait" style="background-image:url(assets/v3-monster-atlas.png);background-position:'+atlasPosition(n,4,2)+'"></div>';};
const dungeonBanner=d=>{const a=dungeonArt(d);if(d.type==='boss')return '<div class="dungeon-banner boss-banner"><div class="boss-banner-art" style="background-image:url(assets/'+a.file+');background-size:'+a.size+';background-position:'+a.position+'"></div><span>'+esc(d.name)+'</span></div>';return '<div class="dungeon-banner" style="background-image:linear-gradient(0deg,#08232b80,#08232b05),url(assets/'+a.file+');background-size:100% 100%,'+a.size+';background-position:center,'+a.position+'"><span>'+esc(d.name)+'</span></div>';};
const techniqueMilestones=(t,own)=>{const level=own?.level||0;return (t.milestones||[]).length?'<div class="tech-milestones gap-top">'+t.milestones.map(m=>'<div class="milestone'+(level>=m.level?' achieved':'')+'"><strong>'+esc(m.level+'级 · '+m.name)+' '+(level>=m.level?'✓ 已达成':'待参悟')+'</strong><small>'+esc(m.description)+'</small></div>').join('')+'</div>':'';};
const reportOutcome=r=>r.practice?'试阵 · '+(r.win?'完成':r.outcome==='exit'?'退出':'未通关'):r.win||r.victory?'胜利':r.outcome==='exit'?'退出':'未通关';
const reportContext=r=>[r.entryLabel||typeName[r.type],r.route?routeNameSafe(r.route):'',r.tierLabel||(Number.isInteger(r.tier)&&r.route?C.routes[r.route]?.realmNames[r.tier]:'')||'',Number.isInteger(r.difficulty)?['普通','困难','极境'][r.difficulty]:''].filter(Boolean).join(' · ');
const reportDate=r=>Number.isFinite(r.at)?new Date(r.at).toLocaleString('zh-CN',{hour12:false}):'';
const highestRealmLabel=()=>{const id=Object.keys(C.routes).reduce((best,id)=>K.pathRank(s,id)>K.pathRank(s,best)?id:best,s.route);return currentView().paths[id].realmLabel;};
const progressText=q=>{if(!Array.isArray(q.progress))return q.progressText||q.requirementText||'';const parts=q.progress.map(x=>x.key==='rank'?x.label+' · 当前'+highestRealmLabel():x.label+' '+num(x.current)+'/'+num(x.required));if(q.previous&&!s.story.sideCompleted.includes(q.previous))parts.unshift('先完成前置任务');return parts.join(' · ');};
const source=(item)=>{const a=item.source||{};return `<div class="source-link"><span>来源：${esc(a.label||'剧情与对应挑战')}</span>${a.id&&C.dungeons[a.id]?ui('前往','source',{id:a.id},'ghost small'):''}</div>`;};
const gearName=g=>A.gearLabel(g);
const rewardName=x=>A.rewardLabel(x);
const equipmentStats=g=>{try{return K.gearStats(s,g);}catch(e){return{};}};
const affixName=id=>Q?.affixes?.[id]?.name||({attack:'攻击',defense:'防御',hp:'气血',crit:'暴击',critDamage:'暴伤',dodge:'闪避',cooldownReduction:'冷却缩减',healing:'治疗',penetration:'穿透',mpRegen:'真元恢复'})[id]||id;
function toast(message){clearTimeout(toastTimer);toastEl.hidden=false;toastEl.textContent=String(message||'操作完成');toastTimer=setTimeout(()=>{toastEl.hidden=true;},3500);}
function persist(candidate=s,quiet=false){
 try{
  const raw=JSON.stringify(candidate);if(new Blob([raw]).size>MAX)throw new Error('存档超过 1 MiB');
  if(!PREVIEW&&window.Native&&typeof window.Native.persistSave==='function'){
   if(!window.Native.persistSave(raw))throw new Error('原生存档写入失败');
   try{localStorage.setItem(KEY,raw);}catch(e){}
  }else localStorage.setItem(KEY,raw);
  lastPersist=Date.now();return true;
 }catch(e){if(!quiet)toast('保存未成功，操作已撤回。请导出备份并检查可用空间。');return false;}
}
function load(){
 let raw=null;try{if(!PREVIEW&&window.Native&&typeof window.Native.loadSave==='function')raw=window.Native.loadSave()||null;}catch(e){}
 try{if(!raw)raw=localStorage.getItem(KEY)||localStorage.getItem(OLD);}catch(e){}
 if(!raw)return;const r=E.validate(raw);
 if(r.ok){s=r.state;if(r.migrated){try{localStorage.setItem(KEY+'-before-v3',raw);}catch(e){}persist(s);setTimeout(()=>toast('旧仙途已迁移：境界、装备与投入均已保留。'),700);}}
 else{recovery={raw,error:r.error};try{localStorage.setItem(KEY+'-recovery',raw);}catch(e){}}
}
function gate(){
 mounted=false;app.innerHTML=`<section class="age-gate"><div class="modal"><div class="modal-header"><h2>问道 · 灵契</h2></div><div class="modal-body"><p class="eyebrow">山海万象 · 自证大道</p><div class="gate-seal">一念入仙</div><p>逐层修行，问剑山河。选择流派、探索洞天、打造道品灵装，于天道之间寻找自己的道路。</p><p class="muted gap-top">离线单机 · 原创修仙 · 成年角色</p><label class="check-line"><input type="checkbox" id="accept-age">我已年满 23 岁</label>${recovery?'<p class="section-note">检测到无法载入的存档，原文已保留备份。可导出恢复文件后另开仙途。</p>':''}</div><div class="modal-footer">${ui(recovery?'另开仙途':'踏入仙途','enter',{},'primary')}</div>${recovery?`<div class="modal-footer">${ui('导出恢复备份','export-recovery')}${ui('导入有效存档','import-save')}</div>`:''}</div></section>`;
}
function recoveryScreen(){mounted=false;app.innerHTML=`<section class="age-gate"><div class="modal"><div class="modal-header"><h2>仙途恢复</h2></div><div class="modal-body"><p>${esc(recovery.error||'存档内容不完整')}</p><p class="muted">原始数据已保留。有效进度不会被新存档自动覆盖。</p></div><div class="modal-footer">${ui('导出恢复备份','export-recovery')}${ui('导入有效存档','import-save')}</div><div class="modal-footer">${ui('另开仙途','new-game',{},'primary')}</div></div></section>`;}
const layoutState={characterTab:'gear',caveTab:'workshop',heavenTab:'draw',techniqueTab:'skill',lists:{}};
const pages={cultivation:['修行','M12 3v4m-5-2 2 3m8-3-2 3M6 11h12l-2 4H8l-2-4Zm2 4-2 5h12l-2-5M10 11V8h4v3'],character:['角色','M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-8 9v-2a8 8 0 0 1 16 0v2M8 17l4 3 4-3'],adventure:['历练','m3 20 7-15 4 8 3-5 4 12H3Zm7-15 2 5'],cave:['洞府','m3 13 9-10 9 10M5 11v10h14V11M9 21v-7h6v7'],fate:['仙缘','M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8 1a3 3 0 1 0 0-6M1 21v-3a7 7 0 0 1 14 0v3m1-7a5 5 0 0 1 7 4v3'],heaven:['天道','M12 2 15 8l7 4-7 4-3 6-3-6-7-4 7-4 3-6Zm0 6v8m-4-4h8']};
function layoutTabs(section,entries,value){return `<div class="tabs compact-tabs" role="tablist">${entries.map(([id,label])=>`<button class="btn small ${value===id?'active':'ghost'}" role="tab" aria-selected="${value===id}" data-ui="layout-tab" data-payload="${esc(JSON.stringify({section,tab:id}))}">${esc(label)}</button>`).join('')}</div>`;}
function layoutSlice(values,key,size){const count=Math.max(1,Math.ceil(values.length/size)),index=Math.max(0,Math.min(count-1,layoutState.lists[key]||0));layoutState.lists[key]=index;return values.slice(index*size,(index+1)*size);}
function layoutPager(key,total,size){if(total<=size)return '';const count=Math.ceil(total/size),index=layoutState.lists[key]||0;return `<nav class="list-pagination" aria-label="目录分页">${ui('上一页','layout-page',{key,index:index-1},'ghost small',index===0)}<span>${index+1} / ${count} · ${total} 项</span>${ui('下一页','layout-page',{key,index:index+1},'ghost small',index>=count-1)}</nav>`;}
document.addEventListener('click',event=>{
 const button=event.target.closest('button[data-ui="layout-tab"],button[data-ui="layout-page"]');if(!button||button.disabled||!app.contains(button))return;
 const value=JSON.parse(button.dataset.payload||'{}');
 if(button.dataset.ui==='layout-page'){layoutState.lists[value.key]=Math.max(0,Number(value.index)||0);}
 else if(['character','cave','heaven','technique'].includes(value.section)){layoutState[value.section+'Tab']=value.tab;}
 renderPage();
});
function pageNodeKey(node){
 if(node.nodeType!==1)return '';if(node.id)return 'id:'+node.id;
 for(const attribute of ['data-action','data-ui','data-page','data-selection'])if(node.hasAttribute(attribute)){
  const action=node.getAttribute(attribute);let payload={};try{payload=JSON.parse(node.getAttribute('data-payload')||'{}');}catch(e){}
  delete payload.enabled;delete payload.paused;
  if(action==='layout-page'){delete payload.index;payload.direction=node.textContent;}
  return node.tagName+':'+attribute+':'+action+':'+JSON.stringify(payload)+':'+(node.getAttribute('data-inspect-id')||'');
 }
 return '';
}
function patchPageNode(current,fresh){
 if(current.nodeType!==fresh.nodeType||current.nodeType===1&&current.tagName!==fresh.tagName){current.replaceWith(fresh.cloneNode(true));return;}
 if(current.nodeType!==1){if(current.nodeValue!==fresh.nodeValue)current.nodeValue=fresh.nodeValue;return;}
 const editing=current===document.activeElement&&['INPUT','TEXTAREA','SELECT'].includes(current.tagName);
 for(const attribute of [...current.attributes])if(!fresh.hasAttribute(attribute.name)&&!(current.tagName==='DETAILS'&&attribute.name==='open'))current.removeAttribute(attribute.name);
 for(const attribute of [...fresh.attributes])if(current.getAttribute(attribute.name)!==attribute.value&&!(editing&&['value','checked','selected'].includes(attribute.name)))current.setAttribute(attribute.name,attribute.value);
 patchPageChildren(current,fresh);
}
function patchPageChildren(current,fresh){
 const existing=[...current.childNodes],used=new Set(),desired=[...fresh.childNodes];
 desired.forEach((next,index)=>{
  const key=pageNodeKey(next);let node=key?existing.find(candidate=>!used.has(candidate)&&pageNodeKey(candidate)===key):existing[index];
  if(!node||used.has(node)||pageNodeKey(node)||node.nodeType!==next.nodeType||node.nodeType===1&&node.tagName!==next.tagName){if(!key)node=existing.find(candidate=>!used.has(candidate)&&!pageNodeKey(candidate)&&candidate.nodeType===next.nodeType&&(candidate.nodeType!==1||candidate.tagName===next.tagName));}
  if(!node||used.has(node)||key&&pageNodeKey(node)!==key||node.nodeType!==next.nodeType||node.nodeType===1&&node.tagName!==next.tagName)node=next.cloneNode(true);else patchPageNode(node,next);
  used.add(node);if(current.childNodes[index]!==node)current.insertBefore(node,current.childNodes[index]||null);
 });
 for(const node of [...current.childNodes])if(!used.has(node))node.remove();
}
function mount(){
 mounted=true;app.innerHTML=`<div class="game-shell"><header class="topbar"><div class="brand">问道 · 灵契<small>山海万象 · 自证大道</small></div><div class="top-actions"><button class="icon-btn" data-ui="help" aria-label="修行指引">?</button><button class="icon-btn" data-ui="settings" aria-label="设置">⚙</button></div></header><div class="resource-bar"><div class="resource"><i class="gem">◇</i><span>灵石</span><strong id="hud-stones"></strong></div><div class="resource"><i class="gem">✧</i><span>感应券</span><strong id="hud-tickets"></strong></div><div class="resource"><i class="gem">◈</i><span>天道尘</span><strong id="hud-dust"></strong></div></div><section class="hero-scene" id="hero-scene"><div class="scene-stars"></div><div class="scene-copy"><p class="eyebrow" id="scene-kicker"></p><h1 id="scene-heading"></h1><p id="scene-description"></p></div><div class="scene-path"><strong id="scene-name"></strong><small id="scene-power"></small></div><div class="realm-orb"><strong id="scene-realm"></strong><small id="scene-layer"></small></div></section><div id="encounter-container"></div><main class="page-content" id="page-content"></main><nav class="nav-bottom">${Object.entries(pages).map(([id,[label,path]])=>`<button data-page="${id}" aria-label="${label}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="${path}"/></svg><span>${label}</span></button>`).join('')}</nav></div>`;
 app.querySelector('.top-actions').insertAdjacentHTML('afterbegin',`<button class="icon-btn sound-toggle" data-ui="audio-toggle" aria-label="游戏声音" aria-pressed="${!Sound?.getPreferences().muted}">${Sound?.getPreferences().muted?'🔇':'♫'}</button>`);
 for(const [index,id] of ['stones','tickets','dust'].entries()){const icon=app.querySelectorAll('.resource .gem')[index];if(icon)icon.outerHTML=utilityIcon(id,'','hud-resource-art');}
 updateChrome();renderPage();renderEncounter();
}
function text(id,value){const el=document.getElementById(id);if(el)el.textContent=value;}
function updateChrome(){
 if(!mounted||!s)return;const v=currentView(),p=s.paths[s.route];
 text('hud-stones',num(s.stones));text('hud-tickets',num(s.tickets));text('hud-dust',num(s.dust));text('scene-name',s.player.name+' · '+routeName(s.route));text('scene-power','战力 '+num(v.power)+'  /  '+v.realmLabel);text('scene-realm',realmName());text('scene-layer',p.layer===10?'十层 · 圆满':p.layer+' 层 · '+(p.layer<4?'初期':p.layer<7?'中期':'后期'));
 const scenes={cultivation:['一念入道 · 万法归心','灵气归元','修炼与突破，自证此身大道。'],character:['道体天成 · 万法随身','角色与配装','点选灵装与功法，长按图标查看详情。'],adventure:['云海无涯 · 自选仙途','山海历练','自由选境，首通与机缘皆可追寻。'],cave:['炉火不息 · 百炼成器','云栖洞府','炼丹、打造与洞府设施。'],fate:['山河相逢 · 同道同行','尘缘山海','宗门、山海故事与同行者。'],heaven:['万象生辉 · 天道感应','感应天道','宝物各有归处，机缘皆有记录。']};
 const a=scenes[page];text('scene-kicker',a[0]);text('scene-heading',a[1]);text('scene-description',a[2]);
 const scene=document.getElementById('hero-scene');scene.className='hero-scene'+(page==='cave'?' forge-scene':page==='fate'?' romance-scene':'');
 app.querySelectorAll('[data-page]').forEach(el=>{el.classList.toggle('active',el.dataset.page===page);el.setAttribute('aria-current',el.dataset.page===page?'page':'false');});
 text('cult-xp',`${num(p.xp)} / ${num(v.xpNeeded)}`);text('cult-reserve','储备 '+num(p.reserve));const xpBar=document.getElementById('cult-xp-fill');if(xpBar)xpBar.style.width=pct(p.xp,v.xpNeeded)+'%';
 if(page==='cultivation'){
  for(const b of document.querySelectorAll('[data-action="levelUp"]'))b.disabled=p.xp<v.xpNeeded;
  for(const b of document.querySelectorAll('[data-action="breakthrough"]'))b.disabled=!v.canBreakthrough;
  if(p.realm===5&&p.layer===10)for(const b of document.querySelectorAll('[data-action="startDungeon"]'))if(b.textContent.includes('自证大道试炼'))b.disabled=p.xp<v.xpNeeded||!!s.battle;
 }
 for(const b of document.querySelectorAll('[data-action="draw"]')){try{const a=JSON.parse(b.dataset.payload);b.disabled=!K.unlocks(s).gacha||s.tickets<a.count;}catch(e){}}
 for(const b of document.querySelectorAll('[data-action="claimWisdom"]'))b.disabled=!s.wisdomTickets;
 const audioToggle=app.querySelector('[data-ui="audio-toggle"]');if(audioToggle){const muted=!!Sound?.getPreferences().muted;audioToggle.setAttribute('aria-pressed',String(!muted));audioToggle.setAttribute('aria-label',muted?'开启游戏声音':'静音游戏声音');audioToggle.textContent=muted?'🔇':'♫';}
 updateAudioScene();
}
function navigate(id){if(!pages[id]||s?.battle||s?.exploration)return;const changed=page!==id;page=id;closeModal();updateChrome();renderPage({navigation:changed});updateAudioScene();}
function renderPage({navigation=false}={}){
 if(!mounted)return;const functions={cultivation:renderCultivation,character:renderCharacter,adventure:renderAdventure,cave:renderCave,fate:renderFate,heaven:renderHeaven},content=document.getElementById('page-content');
 const scroll=content.scrollTop,windowPosition=window.scrollY,focused=content.contains(document.activeElement)?document.activeElement:null,key=focused?pageNodeKey(focused):'',selection=focused&&typeof focused.selectionStart==='number'?[focused.selectionStart,focused.selectionEnd,focused.selectionDirection]:null,input=focused&&['INPUT','TEXTAREA','SELECT'].includes(focused.tagName)?{value:focused.value,checked:focused.checked}:null;
 const template=document.createElement('template');template.innerHTML=functions[page]();
 if(navigation)content.replaceChildren(template.content);else patchPageChildren(content,template.content);
 content.dataset.page=page;content.scrollTop=navigation?0:scroll;
 if(focused&&!navigation){const control=focused.isConnected?focused:key?[...content.querySelectorAll('button,input,select,textarea')].find(node=>pageNodeKey(node)===key):null;if(control&&!control.disabled){if(input){control.value=input.value;if(input.checked!==undefined)control.checked=input.checked;}if(document.activeElement!==control)control.focus({preventScroll:true});if(selection&&typeof control.setSelectionRange==='function')try{control.setSelectionRange(...selection);}catch(e){}}}
 if(navigation){if(window.scrollY)window.scrollTo({top:0,behavior:'instant'});}else if(window.scrollY!==windowPosition)window.scrollTo({top:windowPosition,behavior:'instant'});
}
function heading(title,sub=''){return `<div class="page-heading"><h2>${esc(title)}</h2><small>${esc(sub)}</small></div>`;}
function renderCultivation(){
 const v=currentView(),p=s.paths[s.route];
 const routes=Object.keys(C.routes).map(id=>{const x=s.paths[id],vv=v.paths?.[id];return `<div class="route-card${s.route===id?' active':''}"><strong>${esc(routeName(id))}</strong><small>${esc(vv?.realmLabel||realmName(id)+' '+x.layer+'层')}</small><div class="gap-top">${act(s.route===id?'当前主修':'切换主修','switchRoute',{route:id},'small secondary',s.route===id||!!s.battle)}</div></div>`;}).join('');
 const trialKey=s.route+':'+p.realm,canTrial=p.layer===10,full=p.xp>=v.xpNeeded,won=!!s.progress.trialWins?.[trialKey];
 const advancement=p.layer<10?act('晋升下一层','levelUp',{},'primary',!full):p.realm===5?(s.progress.endingTrials[s.route]?ui('前往终章','ending-story',{},'primary'):act('自证大道试炼','startDungeon',{id:'trial',tier:5,difficulty:0},'primary',!full||!!s.battle)):act('突破下一境','breakthrough',{},'primary',!full||!won);
 return `<div class="page-heading"><h2>修行</h2><button class="btn secondary small" data-page="character">角色 · 配置</button></div>`+panel(v.realmLabel,`<div class="row spaced tiny"><span>当前修为</span><span id="cult-xp">${num(p.xp)} / ${num(v.xpNeeded)}</span></div>${bar(p.xp,v.xpNeeded,'gold','cult-xp-fill')}<div class="row spaced tiny cultivation-auto"><span id="cult-reserve">储备 ${num(p.reserve)}</span>${act(s.autoSmall?'自动小层：开':'自动小层：关','setAutoSmall',{enabled:!s.autoSmall},'ghost small',K.maxRank(s)<2)}</div><div class="grid-2 gap-top">${advancement}${act(s.training?'暂停修行':'开始修行','setTraining',{enabled:!s.training},'secondary')}</div>${canTrial?`<div class="gap-top">${act('进入境界试炼','startDungeon',{id:'trial',tier:p.realm,difficulty:0},'small secondary',!!s.battle||!!s.exploration)}</div><p class="section-note">${p.realm===5?'终境圆满后自证大道，完成山海终章。':won?'试炼已通过，修为与材料齐全即可突破。':'先通过圆满试炼，再提交突破材料。'}</p>`:''}${canTrial&&p.realm<5?costLine('breakthrough'):''}`)+`<div class="grid-2 cultivation-routes">${routes}</div><details class="compact-details"><summary>近期仙途</summary><div class="list">${(s.logs||[]).slice(-5).reverse().map(x=>`<p class="tiny">${esc(typeof x==='string'?x:x.message||x.text||'')}</p>`).join('')||'<p class="muted">第一步，修行与配置你的功法。</p>'}</div></details>`;
}
function renderCharacter(){
 const v=currentView(),u=v.unlocks||K.unlocks(s),selection=window.WendaoSelection,tab=layoutState.characterTab;
 const tabs=layoutTabs('character',[['gear','灵装'],['techniques','功法'],['loadout','配装']],tab);
 let body='';
 if(tab==='gear'){
  const slots=Object.entries(C.slots).map(([id,label])=>{const gear=s.bag.find(x=>x.uid===s.equipped[id]),payload=gear?{uid:gear.uid}:{slot:id};return `<button class="character-slot rarity-${gear?.rarity||0}" data-ui="equipment" data-payload="${esc(JSON.stringify(payload))}"${gear?` data-inspect-kind="gear" data-inspect-id="${esc(gear.uid)}"`:''}><span class="slot-label">${esc(label)} +${num(s.slotLevels[id])}</span>${gear?(selection?.equipmentIcon?selection.equipmentIcon(gear):gearIcon(gear)):'<span class="empty-slot">＋</span>'}<strong>${gear?esc(gearName(gear)):'未装配'}</strong></button>`;}).join('');
  const key='character-gear',gears=layoutSlice(s.bag,key,6),grid=selection?.renderEquipment?selection.renderEquipment(s,{slot:'all',page:layoutState.lists[key],pageSize:6,includePager:false}):`<div class="grid-3">${gears.map(gear=>`<button class="character-slot rarity-${gear.rarity}" data-action="equipGear" data-payload="${esc(JSON.stringify({uid:gear.uid}))}"${Object.values(s.equipped).includes(gear.uid)?' disabled':''}>${gearIcon(gear)}<strong>${esc(gearName(gear))}</strong></button>`).join('')}</div>`;
  body=panel('六部位灵装',`<div class="character-slots">${slots}</div><div class="grid-2 gap-top">${ui('推荐配装','build-recommendations',{},'primary')}${ui('成套装备','equipment-sets',{},'secondary')}</div><div class="row wrap gap-top">${ui('装备背包','equipment',{slot:'all'},'ghost small')}${ui('灵宝图鉴','treasures',{},'ghost small')}</div>`)+panel('背包 · 点选装配',grid+layoutPager(key,s.bag.length,6),`<span class="tiny">长按看详情</span>`);
 }
 if(tab==='techniques'){
  const kind=layoutState.techniqueTab,key='character-techniques-'+kind,known=Object.keys(s.techniques).filter(id=>C.techniques[id]?.kind===kind);layoutSlice(known,key,6);
  const grid=selection?.renderTechnique?selection.renderTechnique(s,{kind,page:layoutState.lists[key],pageSize:6,includePager:false}):`<div class="grid-3">${layoutSlice(known,key,6).map(id=>`<button class="character-slot" data-ui="loadout" data-payload="${esc(JSON.stringify({kind,id}))}">${techniqueIcon(C.techniques[id])}<strong>${esc(C.techniques[id].name)}</strong><small>${num(s.techniques[id].level)} 级</small></button>`).join('')}</div>`;
  body=layoutTabs('technique',[['heart','心法'],['skill','神通'],['secret','秘术']],kind)+`<div class="build-entry">${ui('流派推荐 · 一键配装','build-recommendations',{},'primary')}<small>装备、心法、神通协同搭配</small></div>`+panel('已学功法 · 点选配置',grid||'<div class="empty">此类功法尚未习得，前往图鉴寻找获取途径。</div>',`<span class="tiny">${known.length} 门</span>`)+layoutPager(key,known.length,6)+`<div class="grid-2">${ui('功法图鉴 · 学习养成','techniques',{},'primary')}${ui('出战配置','loadout',{},'secondary')}</div><p class="compact-note">心法 1 · 神通 ${u.skillSlots} · 秘术 ${u.secretSlots} · 长按查看功法说明</p>`;
 }
 if(tab==='loadout'){
  const loadout=s.loadouts[s.route],active=[loadout.heart,...loadout.skills,...loadout.secrets].filter(Boolean),cards=active.map(id=>selection?.techniqueCard?selection.techniqueCard(s,id,{equipped:true}):`<div class="active-technique">${techniqueIcon(C.techniques[id])}<span>${esc(C.techniques[id]?.name||id)}</span></div>`).join('');
  const attributes=[['attack','攻击'],['defense','防御'],['maxHp','气血'],['maxMp','真元'],['crit','暴击'],['power','战力']].map(([id,name])=>`<div><small>${name}</small><strong>${id==='crit'?num(v[id]*100)+'%':num(v[id])}</strong></div>`).join('');
  body=`<div class="grid-2 build-entry">${ui('推荐配装','build-recommendations',{},'primary')}${ui('成套装备','equipment-sets',{},'secondary')}</div>`+panel('当前出战 · '+routeName(s.route),`<div class="selection-grid active-loadout">${cards}</div><div class="gap-top">${ui('调整神通 · 灵宝 · 丹药','loadout',{},'primary wide')}</div>`)+panel('流派预设',`<div class="grid-3">${[0,1,2].map(index=>ui('预设 '+(index+1),'preset',{index},s.presets[s.route][index]?'secondary small':'ghost small')).join('')}</div>`)+`<details class="compact-details"><summary>道体属性 · 战力 ${num(v.power)}</summary><div class="stat-grid">${attributes}</div></details>`;
 }
 return heading('角色配置',s.player.name+' · '+routeName(s.route))+tabs+body;
}
function dungeonUnlocked(d){
 if(d.id==='resource_herb')return true;
 const p=s.paths[s.route],rank=p.realm*10+p.layer-1,u=K.unlocks(s);
 if(d.type==='trial')return p.layer===10;
 const system={resource:u.resources,sect:u.sect,boss:rank>=6,tower:u.tower,cave:u.cave};
 return system[d.type]!==false&&rank>=d.realm*10+(d.layer||1)-1;
}
function renderAdventure(){
 const entries=Object.values(C.dungeons).filter(x=>x.type===uiState.dungeonType);
 const tabs=Object.entries(typeName).map(([id,name])=>ui(name,'dungeon-type',{id},'small '+(uiState.dungeonType===id?'active':'ghost'))).join('');
 const key='adventure-'+uiState.dungeonType,items=layoutSlice(entries,key,2).map(d=>{const art=dungeonArt(d),unlocked=dungeonUnlocked(d),done=s.progress.firstClears.some(k=>k===d.id||k.startsWith(d.id+':'))||d.type==='tower'&&s.progress.tower>0,stars=Math.max(0,...Object.entries(s.progress.stars).filter(([k])=>k===d.id||k.startsWith(d.id+':')).map(([,n])=>n));return `<article class="item compact-dungeon"><div class="item-icon art-icon" style="background-image:url(assets/${art.file});background-size:${art.size};background-position:${art.position}"><span>${esc(d.type==='boss'?'妖':d.type==='tower'?'塔':d.type==='cave'?'洞':d.type==='trial'?'劫':d.type==='sect'?'宗':'境')}</span></div><div class="item-main"><div class="row spaced"><strong>${esc(d.name)}</strong>${badge(done?'已首通':unlocked?'可挑战':'待开启',done?'gold':'')}</div><small>${d.type==='trial'?realmName()+'十层':esc(realmName(s.route,d.realm))+(d.layer||1)+'层'}${stars?' · '+stars+'星':''}</small><p>${esc(d.description)}</p><div class="item-actions">${ui('奖励与挑战','dungeon',{id:d.id},unlocked?'primary small':'ghost small')}${d.type==='resource'&&stars>=3?ui('扫荡','sweep',{id:d.id},'secondary small'):''}</div></div></article>`;}).join('');
 return heading('山海历练','选择目标，独立进入战斗')+`<div class="tabs dungeon-tabs">${tabs}</div>`+panel(typeName[uiState.dungeonType],items?`<div class="list">${items}</div>`+layoutPager(key,entries.length,2):'<div class="empty">此类入口由当前境界试炼提供。</div>')+`<div class="adventure-record"><span>胜利 ${num(s.stats.manualWins)} · 塔 ${num(s.progress.tower)}/60 · 储备 ${num(s.sweepMs/3600000)}h</span><div class="row wrap">${s.lastBattleResult||s.battleReports?.length?ui('战报历史','battle-history',{},'secondary small'):''}${ui('自动规则','battle-settings',{},'ghost small')}</div></div>`;
}
function renderCave(){
 const tab=layoutState.caveTab,tabs=layoutTabs('cave',[['workshop','炼造'],['materials','材料'],['facilities','设施']],tab);let body='';
 if(tab==='workshop')body=panel('炉火与百炼',`<div class="workshop-grid"><button class="workshop-entry" data-ui="alchemy">${utilityIcon('furnace','丹炉')}<strong>炼丹</strong><small>18 丹方 · 备料与控火</small></button><button class="workshop-entry" data-ui="forge">${utilityIcon('forge','炼器坊')}<strong>定向打造</strong><small>套装 · 品质 · 部位</small></button></div><div class="grid-2 gap-top">${ui('装备整理','recycle',{},'secondary')}${ui('灵宝图鉴','treasures',{},'ghost')}</div><p class="compact-note">装备和功法在「角色」中点选配置，打造与材料在洞府管理。</p>${s.overflow?.length||s.rewardOverflow?.length?act('领取奖励盒','claimOverflow',{},'primary wide'):''}`);
 if(tab==='materials'){const materials=Object.entries(s.materials).filter(([,amount])=>amount>0),key='cave-materials',chips=layoutSlice(materials,key,8).map(([id,amount])=>`<span>${utilityIcon(id)}<small>${esc(mat[id]||id)}</small><strong>${num(amount)}</strong></span>`).join('');body=panel('储物匣',`<div class="material-chips material-inventory">${chips||'<span>暂未积累材料</span>'}</div>`+layoutPager(key,materials.length,8)+`<div class="grid-2 gap-top">${ui('炼丹 · 18丹方','alchemy',{},'primary')}${ui('定向打造','forge',{},'secondary')}</div><p class="compact-note">材料来源与配方在对应炼造界面查看。</p>`);}
 if(tab==='facilities'){const entries=Object.entries(C.facilities),key='cave-facilities',facilities=layoutSlice(entries,key,2).map(([id,f])=>`<article class="item facility-card">${utilityIcon(id,f.name)}<div class="item-main"><strong>${esc(f.name)} · ${num(s.facilities[id])} 级</strong><p>${esc(f.description)}</p>${costLine('upgradeFacility',{id})}<div class="item-actions">${act('升级设施','upgradeFacility',{id},'secondary small',s.facilities[id]>=f.maxLevel)}</div></div></article>`).join('');body=panel('洞府设施',`<div class="list">${facilities}</div>`+layoutPager(key,entries.length,2));}
 return heading('云栖洞府','炼造 · 材料 · 设施')+tabs+body;
}
const chapterImpact=(choice,v)=>{const values=v.chapterChoices?.[choice]||[];return values.length?'<p class="tiny choice-impact">'+esc(values.map(x=>x.name+' 信任 +'+x.affinity).join(' · '))+'</p>':'';};
const endingHint=v=>{const r=v.recommendedEnding,id=typeof r==='string'?r:r?.id,label=typeof r==='object'?(r.title||r.name||r.label):({guardian:'守山护世',wanderer:'逍遥远游',teacher:'开宗传道'})[id];return label?'<p class="section-note">此行选择倾向 '+esc(label)+'。终章仍可自由选择任一去向。</p>':'';};
function renderFate(){
 const tabs=[['story','山海卷'],['sect','宗门'],['companions','同行者'],['side','支线']].map(([id,name])=>ui(name,'fate-tab',{id},'small '+(uiState.sideTab===id?'active':'ghost'))).join('');
 let body='';const v=currentView();
 if(uiState.sideTab==='story'){const ch=v.currentChapter||C.chapters[s.story.chapter];body=ch?panel('第 '+(s.story.chapter+1)+' 卷 · '+(ch.title||ch.name),`<div class="chapter-art" style="background-position:${atlasPosition(ch.id,3,2)}"></div><p>${esc(ch.description||ch.text)}</p><div class="gap-top">${(v.chapterProgress||[]).map(x=>`<div class="quest-line"><span>${esc(x.label)}</span><span>${x.key==='rank'?esc(highestRealmLabel()):num(x.current)+' / '+num(x.required)}</span></div>${bar(x.current,x.required,'gold')}`).join('')}</div><p class="muted gap-top">章节奖励：${esc(price(ch.reward||ch.rewards))}</p><div class="grid-2 gap-top"><div>${act('守护同行','claimChapter',{choice:'protect'},'primary wide',!v.chapterReady)}${chapterImpact('protect',v)}</div><div>${act('追寻真相','claimChapter',{choice:'seek'},'secondary wide',!v.chapterReady)}${chapterImpact('seek',v)}</div></div>`):panel('山海终章',s.story.ending?`<h3>${esc(s.story.ending.title||s.story.ending)}</h3><p>${esc(s.story.ending.text||'大道已成，山海仍可自由游历。')}</p>`:`<p>终境圆满，历经心魔与雷劫后，选择此后如何行走。</p>${endingHint(v)}<div class="stack gap-top">${act('守山护世','ending',{choice:'guardian'},'primary')}${act('逍遥远游','ending',{choice:'wanderer'},'secondary')}${act('开宗传道','ending',{choice:'teacher'},'secondary')}</div>`);body+=panel('仙途档案',`<div class="list">${C.chapters.map((x,i)=>`<div class="quest-line"><span>${i+1}. ${esc(x.title||x.name)}</span>${badge(i<s.story.chapter?'已完成':i===s.story.chapter?'当前卷':'未完',i<s.story.chapter?'gold':'')}</div>`).join('')}</div>`);}
 if(uiState.sideTab==='sect'){const sch=s.sect.school&&C.schools[s.sect.school];body=panel(s.sect.joined?(sch?.name||'宗门')+' · 门下':'选择宗门',s.sect.joined?`<p class="muted">宗门位阶 ${num(s.sect.rank)} · 贡献 ${num(s.sect.contribution)}</p><div class="item-actions">${act('提升位阶','upgradeSect',{},'primary')}${ui('宗门试炼','source',{type:'sect'},'secondary')}</div>${costLine('upgradeSect')}`:`<p class="muted">宗门提供定向秘籍与贡献委托。加入条件为首境五层。</p><div class="grid-2 gap-top">${Object.entries(C.schools).map(([id,x])=>act(x.name,'joinSect',{school:id},'secondary',!K.unlocks(s).sect)).join('')}</div>`);if(s.sect.joined)body+=panel('委托 · 按行动完成',`<div class="list">${(v.commissions||[]).map(x=>`<article class="item"><div class="item-main"><strong>${esc(x.name||x.title||x.id)}</strong><p>${esc(x.description||'完成对应历练后领取贡献。')}</p><small>${num(x.current)} / ${num(x.required)} · ${esc(price(x.reward||x.rewards))}</small><div class="item-actions">${act('领取委托','claimCommission',{id:x.id},'primary small',!x.ready)}</div></div></article>`).join('')||'<p class="muted">进行宗门试炼、妖王与资源挑战可累计委托进度。</p>'}</div>`);}
 if(uiState.sideTab==='companions')body=Object.entries(C.companions).map(([id,c],i)=>{const r=s.companions[id];return `<section class="panel companion-card"><div class="row" style="align-items:stretch"><div class="companion-art" style="background-image:url(assets/v3-heroes.png),url(assets/v3-heroes.png);background-position:${i*50}% center"></div><div class="item-main"><strong>${esc(c.name)}</strong><small>${esc(c.title||c.role||'同道')} · ${num(c.age)} 岁</small><p>${esc(c.description||c.bio||c.intro)}</p>${v.companionAttitudes?.[id]?badge(v.companionAttitudes[id].label,'gold'):''}<small>好感 ${num(r.affinity)} / 100 · ${r.bond?'已结契':'同行相识'}</small>${bar(r.affinity,100,'gold')}<div class="item-actions">${act('问候','talk',{companion:id},'secondary small')}${ui('赠礼','gift',{companion:id},'ghost small')}${r.bond?ui('邀约共修','joint-invite',{companion:id},'primary small'):act('结契','bond',{companion:id},'primary small',r.affinity<(C.bondThreshold||40))}</div></div></div></section>`;}).join('')+panel('同道共修',`<p class="muted">结契、好感 ${num(C.jointThreshold)} 后可邀约。选择三门已学功法，依日月星节律凝息。合作收益也能通过普通历练取得。</p>${s.joint?ui('继续共修','joint',{},'primary'):''}`);
 if(uiState.sideTab==='side'){const list=v.sidequestProgress||C.sidequests.map(x=>({...x,ready:false,completed:s.story.sideCompleted.includes(x.id)})),key='fate-side';body=panel('山海支线 · 18项',`<div class="list">${layoutSlice(list,key,2).map(x=>`<article class="item"><div class="item-main"><strong>${esc(x.title||x.name||x.id)}</strong><p>${esc(x.description||x.text||'完成对应人物与历练条件。')}</p><small>${esc(progressText(x))}${x.current!==undefined?' '+num(x.current)+' / '+num(x.required):''}</small><small>奖励 ${esc(price(x.reward||x.rewards))}</small><div class="item-actions">${act(x.completed?'已完成':'领取支线','claimSidequest',{id:x.id},'primary small',x.completed||!x.ready)}</div></div></article>`).join('')}</div>`+layoutPager(key,list.length,2));}
 if(uiState.sideTab==='story'){const archive=document.createElement('template');archive.innerHTML=body;const panels=archive.content.querySelectorAll('section.panel'),last=panels[panels.length-1];if(last?.querySelector('.panel-head h3')?.textContent==='仙途档案'){const details=document.createElement('details');details.className='compact-details';details.innerHTML='<summary>仙途档案 · 全部六卷</summary>'+last.querySelector('.list').outerHTML;last.replaceWith(details);body=archive.innerHTML;}}
 return heading('仙缘山海','修行，也有同行者')+`<div class="tabs compact-tabs">${tabs}</div>`+body;
}
function targetList(){try{return Q.targets(s).map(x=>({...x,name:rewardName({...x,rarity:5})}));}catch(e){return[];}}
function renderHeaven(){
 const g=s.gacha,unlocked=K.unlocks(s).gacha,target=targetList().find(x=>x.id===g.target);
 const tabs=layoutTabs('heaven',[['draw','感应'],['exchange','悟道 · 兑换']],layoutState.heavenTab),shop=`<div class="compact-shop"><span>${utilityIcon('jade','','inline-art')} ${num(s.jade)} 灵玉</span>${ui('瑶台集市','shop',{},'primary small')}</div>`;
 const draw=`<div class="gacha-sanctum compact-sanctum"><div class="gacha-ring"><strong>天道</strong></div><span class="gacha-caption">万象有因 · 机缘有归</span></div>`+panel('感应天道',`<div class="row wrap">${badge('橙红保底 '+num(g.highPity)+' / 10','gold')}${badge('红保底 '+num(g.redPity)+' / 80','red')}</div><p class="section-note compact-target">${g.target?'定向：'+esc(target?.name||g.target)+' · '+(g.fateGuarantee?'下一红必定命中':'首红50%，未中则下一红必定向'):'选择已开放的红装、红灵宝或红功法，保底与定向永久保存。'}</p><div class="grid-2">${act('感应一次 · 1券','draw',{count:1},'secondary',!unlocked||s.tickets<1)}${act('十次感应 · 10券','draw',{count:10},'primary',!unlocked||s.tickets<10)}</div>${!unlocked?'<p class="compact-note">任一路第二境一层开放；起步券已保存在库存。</p>':''}<div class="row wrap gap-top heaven-tools">${ui('选择定向','gacha-target',{},'secondary small',!unlocked)}${ui('概率规则','gacha-odds',{},'ghost small')}${ui('当前物品池','gacha-pool',{},'ghost small')}${ui('感应记录','gacha-history',{},'ghost small')}</div>`);
 const exchange=panel('悟道与天道尘',`<div class="heaven-balances"><div>${utilityIcon('tickets')}<small>待领取悟道券</small><strong>${num(s.wisdomTickets)} / 7</strong></div><div>${utilityIcon('dust')}<small>天道尘</small><strong>${num(s.dust)}</strong></div></div><div class="grid-2 gap-top">${act('领取悟道券','claimWisdom',{},'primary',!s.wisdomTickets)}${ui('天道尘兑换','dust',{},'secondary')}</div><p class="compact-note">悟道累计24小时一券；每抽给2天道尘。兑换目录与所需材料可在兑换中查看。</p>`);
 return heading('天道万象','常驻感应 · 概率公开')+tabs+(layoutState.heavenTab==='draw'?draw:exchange)+shop;
}
function statusTags(values){return `<div class="status-tags">${(values||[]).map(x=>`<span>${esc(typeof x==='string'?x:(x.name||x.id)+(x.stacks?' ×'+x.stacks:''))}</span>`).join('')}</div>`;}
function dungeonPreview(a){try{return E.previewDungeon?E.previewDungeon(s,a):window.WendaoCombat?.previewDungeon(s,a);}catch(e){return null;}}
function battleView(){try{return E.battleView?E.battleView(s):window.WendaoCombat.battleView(s);}catch(e){return{active:false};}}
function renderEncounter(){
 if(!mounted||pointerHeld)return;
 const el=document.getElementById('encounter-container'),shell=app.querySelector('.game-shell'),content=document.getElementById('page-content'),b=battleView(),active=!!b.active||!!s.exploration,scroll=el.scrollTop;
 if(active&&!shell.classList.contains('battle-screen'))layoutState.encounterScroll=content.scrollTop;
 shell.classList.toggle('battle-screen',active);shell.dataset.screen=b.active?'battle':s.exploration?'exploration':page;updateAudioScene();
 let body='';
 if(b.active){
  const p=b.player,oldFrame=previousBattleFrame&&previousBattleFrame.id===b.id?previousBattleFrame:null,dungeon=C.dungeons[b.id]||{type:'resource',realm:b.tier||0},background=dungeonArt({...dungeon,type:dungeon.type==='boss'?'resource':dungeon.type}),difficulty=['普通','困难','极境'][b.difficulty]||'普通',bossEncounter=b.type==='boss';
  const bossHit=!!(bossEncounter&&oldFrame&&b.enemies[0]?.hp<(oldFrame.enemies[0]??b.enemies[0]?.hp)),bossAura=['#74dbc8','#dbb579','#e8756e','#ae92e8','#e49f69','#b495f2'][b.tier||0]||'#e5be78';
  const bossAtmosphere=bossEncounter?`<div class="boss-atmosphere" aria-hidden="true"><div class="boss-halo"></div><div class="boss-rune-ring">${Array.from('山海镇魂万象').map((rune,index)=>`<span style="--boss-rune-angle:${index*60}deg">${rune}</span>`).join('')}</div><div class="boss-mist mist-left"></div><div class="boss-mist mist-right"></div><div class="boss-entry-wave"></div><div class="boss-hit-flare"></div></div>`:'';
  const enemies=b.enemies.map(enemy=>{
   const primaryBoss=bossEncounter&&enemy.index===0,portrait=primaryBoss?`<div class="boss-portrait boss-main-art" style="background-image:url(assets/v3-boss-atlas.png);background-size:300% 400%;background-position:${atlasPosition(Number(dungeon.bossIndex??String(b.id).split('_').pop())||0,3,4)}"></div>`:monsterPortrait(enemy,b);
   const vitality=`<strong>${esc(enemy.name)}</strong><small>${num(enemy.hp)} / ${num(enemy.maxHp)}${enemy.shield?' · 盾'+num(enemy.shield):''}</small>${bar(enemy.hp,enemy.maxHp,'red')}${statusTags(enemy.statuses)}`;
   return `<button class="enemy-card${primaryBoss?' boss-target':''}${b.target===enemy.index?' target':''}${!enemy.alive?' dead':''}${oldFrame&&enemy.hp<(oldFrame.enemies[enemy.index]??enemy.hp)?' hurt':''}" data-action="targetEnemy" data-payload="${esc(JSON.stringify({index:enemy.index}))}" aria-label="锁定${esc(enemy.name)}"${!enemy.alive?' disabled':''}>${portrait}${primaryBoss?`<div class="boss-nameplate"><span class="boss-rank">山海妖王 · ${difficulty}</span>${vitality}</div>`:vitality}${enemy.casting?`<div class="casting">${esc(enemy.casting.name)} · ${num(enemy.casting.remaining)}s${bar(enemy.casting.duration-enemy.casting.remaining,enemy.casting.duration,'gold')}<small>${esc(enemy.casting.hint)}${enemy.casting.interruptible?' · 可打断':''}</small></div>`:''}</button>`;
  }).join('');
  const skills=b.skills.map(skill=>combatIconButton(skill.name,'useSkill',{id:skill.id},'technique',skill.id,techniqueIcon(C.techniques[skill.id]),skill.remaining>0?num(skill.remaining)+'s':skill.mp+'真元',!skill.ready||b.paused)).join('');
  const treasure=b.treasure?combatIconButton(b.treasure.name,'useTreasure',{},'treasure',b.treasure.id,itemIcon('treasure',b.treasure.id,b.treasure.name),b.treasure.remaining>0?num(b.treasure.remaining)+'s':'灵宝',!b.treasure.ready||b.paused):'<span class="empty-combat-slot">未配灵宝</span>';
  const pills=(b.pills||[]).map(pill=>combatIconButton(pill.name,'battlePill',{id:pill.id},'pill',pill.id,itemIcon('pill',pill.id,pill.name),'×'+num(pill.count),!pill.ready||b.paused)).join('');
  body=`<section class="encounter battle-arena${bossEncounter?' boss-arena':''}">
   <header class="battle-topbar"><div><strong>${esc(b.name)}</strong><small>${difficulty} · ${num(b.time)}s${b.practice?' · 试阵':''}${b.paused?' · 战术暂停':''}</small></div>${act(b.paused?'继续':'暂停','pauseBattle',{paused:!b.paused},'ghost small pauseGhost')}${ui('退出','encounter-exit',{},'ghost small exitGhost')}</header>
   <div class="battle-stage${bossEncounter?' boss-stage':''}${bossHit?' boss-hit':''}"${bossEncounter?` id="boss-stage-${esc(b.id)}-${s.battle?.startedAt||0}" data-boss-id="${esc(b.id)}"`:''} style="--boss-aura:${bossAura};background-image:linear-gradient(0deg,#07141dd9,#102b3230),url(assets/${background.file});background-size:100% 100%,${background.size};background-position:center,${background.position}">${bossAtmosphere}<div class="stage-label">${badge(b.paused?'战术暂停':bossEncounter?'妖王降临':'锁定目标',bossEncounter?'gold':'')}<span>${bossEncounter?'威压临身 · 正面迎战':'点选敌人 · 长按神通查看说明'}</span></div><div class="enemy-grid${bossEncounter?' boss-enemy-grid':''}">${enemies}</div></div>
   <div class="battle-player player-hud${oldFrame&&p.hp<oldFrame.hp?' player-hit':''}"><div class="row spaced"><strong>${esc(s.player.name)}</strong><span>气血 ${num(p.hp)} / ${num(p.maxHp)}${p.shield?' · 盾'+num(p.shield):''}</span></div>${bar(p.hp,p.maxHp,'red')}<div class="row spaced"><span>真元 ${num(p.mp)} / ${num(p.maxMp)}</span><span>${esc(p.resourceName||'灵势')} ${num(p.resource)}</span></div>${bar(p.mp,p.maxMp,'blue')}${statusTags(p.statuses)}</div>
   <div class="combat-loadout"><div class="combat-group"><span class="label">神通</span><div class="combat-icons">${skills}</div></div><div class="combat-group"><span class="label">灵宝</span><div class="combat-icons">${treasure}</div></div><div class="combat-group"><span class="label">丹药</span><div class="combat-icons">${pills}</div></div></div>
   <footer class="battle-controls">${act(b.auto?'自动：开':'自动：关','setBattleAuto',{enabled:!b.auto},'secondary small')}${ui('战斗规则','battle-settings',{},'ghost small')}${ui('战报历史','battle-history',{},'ghost small')}</footer><details class="battle-feed"><summary>战斗记录</summary><div class="battle-log">${(b.log||[]).slice(-6).map(entry=>esc(typeof entry==='string'?entry:entry.message||entry.text||'')).join('<br>')}</div></details>
  </section>`;
  previousBattleFrame={id:b.id,hp:p.hp,enemies:Object.fromEntries(b.enemies.map(enemy=>[enemy.index,enemy.hp]))};
 }else if(s.exploration){
  previousBattleFrame=null;const x=s.exploration,dungeon=C.dungeons[x.id]||{type:'cave',realm:x.tier||0},background=dungeonArt(dungeon);
  const rooms=Array.from({length:x.total},(_,index)=>{const history=x.history?.find(room=>room.node===index),type=history?.type||x.choices?.[0]?.roomId||'relic',state=index<x.node?'passed':index===x.node?'current':'upcoming';return `<span class="room-node ${state}">${artworkIcon(G.room(index<x.node?type:index===x.node?type:'relic'),'洞天第'+(index+1)+'节点')}<small>${index+1}</small></span>`;}).join('');
  const choices=(x.choices||[]).map(choice=>`<button class="btn explore-choice secondary" data-action="chooseCave" data-payload="${esc(JSON.stringify({choice:choice.id}))}">${artworkIcon(G.room(choice.roomId||choice.id),choice.label)}<span><strong>${esc(choice.label)}</strong><small>${esc(choice.description)}</small>${price(choice.cost)?`<small>消耗 ${esc(price(choice.cost))}</small>`:''}</span></button>`).join('');
  body=`<section class="encounter exploration-screen"><header class="battle-topbar"><div><strong>${esc(x.name)} · 洞天</strong><small>${num(x.node)} / ${num(x.total)} 节点 · ${['普通','困难','极境'][x.difficulty]||'普通'}</small></div>${ui('结束探索','encounter-exit',{},'ghost small exitGhost')}</header><div class="exploration-stage" style="background-image:linear-gradient(0deg,#0a1d23cc,#12332c30),url(assets/${background.file});background-size:100% 100%,${background.size};background-position:center,${background.position}"><p class="room-heading">${x.status==='cleared'?'洞天已通 · 开启最后的机缘':'自由选路 · 第 '+(x.node+1)+' 节点'}</p><div class="exploration-route">${rooms}</div></div><div class="exploration-bank"><span>已携出：${esc(price(x.banked))||'无'}</span><span>待通关：${esc(price(x.pending))||'无'}</span></div><div class="stack exploration-choices">${choices}</div><footer class="exploration-footer">${x.status==='cleared'?act('开启最终宝箱','finishCave',{},'primary wide'):ui('结束探索 · 取已携出','encounter-exit',{},'ghost wide')}</footer></section>`;
 }else previousBattleFrame=null;
 const template=document.createElement('template');template.innerHTML=body;patchPageChildren(el,template.content);el.scrollTop=scroll;
 if(!active&&layoutState.encounterScroll!==undefined){content.scrollTop=layoutState.encounterScroll;delete layoutState.encounterScroll;}
}
function combatIconButton(name,action,payload,kind,id,art,note,disabled){return `<button class="btn skill-button combat-icon${disabled?' cooldown':''}" data-action="${esc(action)}" data-payload="${esc(JSON.stringify(payload))}" data-inspect-kind="${kind}" data-inspect-id="${esc(id)}" aria-label="${esc(name+' · '+note)}"${disabled?' disabled':''}>${art}<span class="name">${esc(name)}</span><small class="cooldown">${esc(note)}</small></button>`;}
function requestEncounterExit(){
 if(s?.battle){if(!s.battle.paused){const paused=run('pauseBattle',{paused:true});if(paused&&!paused.ok)return;}return showModal('confirm',{type:'leaveBattle',label:s.exploration?'退出洞天战斗':'退出本场战斗',text:s.exploration?'战斗暂停。退出后仅保留已确认携出的战利品，已使用丹药不返还。':'战斗暂停。本场未结算奖励不会发放，已使用丹药不返还。'});}
 if(s?.exploration){const cleared=s.exploration.status==='cleared';return showModal('confirm',{type:'finishCave',label:cleared?'领取洞天宝箱':'结束洞天探索',text:cleared?'洞天已经通关，将结算已携出与宝箱中的全部奖励。':'保留已确认携出的战利品；尚待通关的奖励不会领取。'});}
}
function updateAudioScene(){Sound?.setScene({battle:!!s?.battle||!!s?.exploration,heaven:page==='heaven'||modal?.type==='red-reveal'||modal?.type==='summoning'});}
function modalSlice(values,key,size=4){const count=Math.max(1,Math.ceil(values.length/size)),index=Math.max(0,Math.min(count-1,uiState.modalPages[key]||0));uiState.modalPages[key]=index;return values.slice(index*size,(index+1)*size);}
function modalPager(key,total,size=4){if(total<=size)return '';const count=Math.ceil(total/size),index=uiState.modalPages[key]||0;return `<nav class="list-pagination" aria-label="图鉴分页">${ui('上一页','modal-page',{key,index:index-1},'ghost small',index===0)}<span>${index+1} / ${count} · ${total} 项</span>${ui('下一页','modal-page',{key,index:index+1},'ghost small',index>=count-1)}</nav>`;}
function clearDrawTimers(){clearTimeout(summonTimer);clearTimeout(summonPulseTimer);clearTimeout(redRevealTimer);summonTimer=summonPulseTimer=redRevealTimer=null;for(const name of ['summon-rise','red-awaken','red-impact'])Sound?.stopEffect(name);}
function closeModal(){clearDrawTimers();window.WendaoSelection?.cancelHold();window.WendaoSelection?.hideDetail();app.inert=false;modal=null;layer.hidden=true;layer.innerHTML='';updateAudioScene();}
function frame(title,body,footer=''){
 const previous=layer.querySelector('.modal'),same=previous?.getAttribute('aria-label')===title,oldBody=previous?.querySelector('.modal-body'),scroll=same?oldBody?.scrollTop||0:0;
 const focused=same&&layer.contains(document.activeElement)?document.activeElement:null,key=focused?pageNodeKey(focused):'';
 const template=document.createElement('template');template.innerHTML=`<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="modal-header"><h2>${esc(title)}</h2>${ui('×','close',{},'ghost small')}</div><div class="modal-body">${body}</div>${footer?`<div class="modal-footer">${footer}</div>`:''}</section></div>`;
 layer.hidden=false;if(same)patchPageChildren(layer,template.content);else layer.replaceChildren(template.content);
 const nextBody=layer.querySelector('.modal-body');if(nextBody)nextBody.scrollTop=scroll;
 if(focused){const control=focused.isConnected?focused:key?[...layer.querySelectorAll('button,input,select,textarea')].find(node=>pageNodeKey(node)===key):null;if(control&&!control.disabled)control.focus({preventScroll:true});}
}
function showModal(type,p={}){
 clearDrawTimers();window.WendaoSelection?.cancelHold();window.WendaoSelection?.hideDetail();app.inert=false;
 modal={type,p};const fn={techniques:techniquesModal,loadout:loadoutModal,preset:presetModal,dungeon:dungeonModal,sweep:sweepModal,equipment:equipmentModal,'gear-detail':gearDetail,'equipment-sets':equipmentSetsModal,'build-recommendations':buildRecommendationsModal,forge:forgeModal,alchemy:alchemyModal,treasures:treasuresModal,recycle:recycleModal,'gacha-target':targetModal,'gacha-odds':oddsModal,'gacha-history':historyModal,'draw-results':drawModal,'red-reveal':redRevealModal,dust:dustModal,gift:giftModal,'joint-invite':inviteModal,joint:jointModal,settings:settingsModal,help:helpModal,'battle-report':battleReportModal,confirm:confirmModal,offline:offlineModal,reroll:rerollModal,'battle-settings':battleSettingsModal,'gacha-pool':poolModal,conversation:conversationModal,'battle-history':battleHistoryModal,shop:shopModal,summoning:summoningModal};
 (fn[type]||helpModal)(p);
 updateAudioScene();
}
function techniqueBuildHint(t){
 const role=window.WendaoBuilds.techniqueRole(t.id,s);
 return `<p class="build-tech-hint"><strong>${esc(role.buildName)}</strong> · ${esc(role.tags.join(' · '))}<small>${esc(role.reason)}</small></p><div class="item-actions">${ui('查看流派推荐','build-recommendations',{school:t.school},'secondary small')}</div>`;
}
function techniquesModal(){
 const items=Object.values(C.techniques).filter(t=>(uiState.techSchool==='all'||t.school===uiState.techSchool)&&(uiState.techKind==='all'||t.kind===uiState.techKind));
 frame('功法图鉴 · 48部',`<div class="grid-2"><label>流派${select('filter-tech-school',[{id:'all',name:'全部六流派'},...Object.entries(C.schools).map(([id,x])=>({id,name:x.name}))],uiState.techSchool)}</label><label>类型${select('filter-tech-kind',[{id:'all',name:'全部类型'},...Object.entries(kindName).map(([id,name])=>({id,name}))],uiState.techKind)}</label></div><div class="list gap-top">${modalSlice(items,'techniques',4).map(t=>{const own=s.techniques[t.id];return `<article class="item rarity-${t.rarity}">${techniqueIcon(t)}<div class="item-main"><span class="skill-kind">${esc(C.schools[t.school].name)} · ${esc(kindName[t.kind])} · ${esc(rar(t.rarity).name)}</span><strong>${esc(t.name)}${own?' · '+own.level+'级':''}</strong><p>${esc(t.description)}</p>${techniqueBuildHint(t)}<small>${esc(realmName(s.route,t.realm))}${t.layer}层可习${t.kind==='skill'?' · 真元'+t.mp+' · 冷却'+t.cooldown+'s':''}</small>${source(t)}${techniqueMilestones(t,own)}${own?costLine('upgradeTechnique',{id:t.id}):`<small>指定残页 ${num(s.fragments[t.id])} / 20 · 通用 ${num(s.fragments.universal)}</small>`}<div class="item-actions">${own?act('参悟升级','upgradeTechnique',{id:t.id},'primary small',own.level>=20):act('残页学习','learnTechnique',{id:t.id},'secondary small')}${own?ui('分支与重置','tech-branch',{id:t.id},'ghost small'):''}</div></div></article>`;}).join('')}</div>${modalPager('techniques',items.length,4)}`,ui('出战配置','loadout',{},'primary'));
}
function ownedOptions(kind){return[{id:'',name:'空槽'},...Object.keys(s.techniques).filter(id=>C.techniques[id]?.kind===kind).map(id=>({id,name:C.techniques[id].name+' · '+s.techniques[id].level+'级'}))];}
function loadoutModal(p={}){
 frame('出战配置 · '+routeName(s.route),window.WendaoSelection.renderLoadout(s,p),act('保存出战配置','setLoadout',{},'primary',!!s.battle));
}
function presetModal(p){const x=s.presets[s.route][p.index];frame('预设 '+(p.index+1),`<p>${x?'已保存一套配置，可直接切换。预设引用的装备受到分解保护。':'此槽尚未保存配置。'}</p><p class="muted">保存当前装备、心法、神通顺序、秘术、灵宝和携丹。</p>`,act('保存当前配置','savePreset',{index:p.index},'primary',!!s.battle)+act('载入预设','loadPreset',{index:p.index},'secondary',!x||!!s.battle));}
function dungeonModal(p){
 const d=C.dungeons[p.id];if(!d)return closeModal();uiState.selectedDungeon=d.id;const tier=d.type==='resource'||d.type==='trial'?s.paths[s.route].realm:d.realm,done=s.progress.firstClears.includes(d.id+':'+tier+':0')||d.type==='tower'&&s.progress.tower>=Math.min(60,s.progress.tower+1);
 const rewards=d.rewards||{},first=d.firstRewards||{};let preview='';try{const x=dungeonPreview({id:d.id,tier,difficulty:0,floor:Math.min(60,s.progress.tower+1)});if(x)preview=`<p id="dungeon-live-preview" class="cost">当前预览：${esc(price(x.rewards))}</p>`;}catch(e){}
 const controls=d.type==='trial'?`<p class="section-note">当前 ${esc(currentView().realmLabel)}。试炼胜利记录会保存，成功突破时才消耗准备材料。</p>`:`<div class="grid-2">${d.type==='resource'?'<label>挑战阶位'+select('dungeon-tier',Array.from({length:s.paths[s.route].realm+1},(_,i)=>({id:i,name:realmName(s.route,i)})),tier)+'</label>':'<div class="route-card"><small>固定阶位</small><strong>'+esc(d.type==='tower'?'随所选塔层':realmName(s.route,d.realm))+'</strong></div>'}<label>难度${select('dungeon-difficulty',[{id:0,name:'普通'},{id:1,name:'困难'},{id:2,name:'极境'}],0)}</label></div>`;
 const mechanics=(d.mechanics||[]).map(x=>`<div class="section-note">${esc(typeof x==='string'?x:(x.name||x.id))}${typeof x==='object'?'<br>'+esc(x.description||x.trigger||'')+'<br>应对：'+esc((x.counter||[]).join(' / ')):''}</div>`).join('');
 frame(d.name,`${dungeonBanner(d)}<p>${esc(d.description)}</p><div class="row wrap gap-top">${badge(typeName[d.type])}${badge(done?'首通已领':'首次挑战','gold')}${badge(dungeonUnlocked(d)?'入口已开放':'需 '+realmName(s.route,d.realm)+(d.layer||1)+'层')}</div><h3>自由选择</h3>${controls}${d.type==='tower'?`<label class="gap-top">问道塔层数${select('dungeon-floor',Array.from({length:60},(_,i)=>({id:i+1,name:'第'+(i+1)+'层'+(i+1<=s.progress.tower?' · 已通关':'')})),Math.min(60,Math.max(1,Number(p.floor)||s.progress.tower+1)))}</label>`:''}<label class="check-line"><input id="dungeon-practice" type="checkbox">免费试阵：不耗战斗丹药，不发奖励或首通</label><h3>奖励</h3><p class="muted">基础产物：${esc(price(rewards))||'按当前挑战阶位结算'}</p>${preview}<p class="muted">首次奖励：${esc(price(first))||'对应秘籍、蓝图或一次性解锁'}${done?'（已领取）':''}</p>${d.type==='boss'?'<div class="table-wrap gap-top"><table><tr><th>难度</th><th>蓝</th><th>紫</th><th>橙</th><th>红</th></tr><tr><td>普通</td><td>65%</td><td>25%</td><td>9.5%</td><td>0.5%</td></tr><tr><td>困难</td><td>50%</td><td>35%</td><td>14%</td><td>1%</td></tr><tr><td>极境</td><td>35%</td><td>45%</td><td>18%</td><td>2%</td></tr></table></div>':''}<p class="safe-note">当前最高阶的有效挑战可得同阶天命晶与感应资源。回刷低阶保留基础产物。失败和退出不发关键奖励。</p><h3>敌人机制</h3>${mechanics||'<p class="muted">观察敌人前摇，使用护盾、治疗、打断与转火应对。</p>'}`,act(d.type==='cave'?'踏入洞天':'开始挑战','startDungeon',{id:d.id},'primary',!dungeonUnlocked(d)||!!s.battle||!!s.exploration));
}
function sweepModal(p){const best=Array.from({length:s.paths[s.route].realm+1},(_,i)=>i).filter(i=>(s.progress.stars[p.id+':'+i+':0']||0)>=3).pop()??s.paths[s.route].realm;frame('资源扫荡',`<p>历练储备 ${num(s.sweepMs/3600000)} 小时，最多储存八小时。</p><p class="muted">三星资源秘境可扫荡，仅得基础材料；不给券、晶、红装或首通。</p><div class="grid-2 gap-top"><label>阶位${select('sweep-tier',Array.from({length:s.paths[s.route].realm+1},(_,i)=>({id:i,name:realmName(s.route,i)})),best)}</label><label>次数${select('sweep-count',[{id:1,name:'1次'},{id:5,name:'5次'},{id:10,name:'10次'}],1)}</label></div>`,act('结算扫荡','sweepDungeon',{id:p.id},'primary'));}
function gearItem(g,full=false){
 const worn=Object.values(s.equipped).includes(g.uid),stats=equipmentStats(g);
 const attributes=Object.entries(stats).filter(([id,n])=>['attack','defense','hp'].includes(id)&&n>0).map(([id,n])=>`${({attack:'攻击',defense:'防御',hp:'气血'})[id]||id} +${num(n)}`).join(' · ');
 return `<article class="item rarity-${g.rarity}">${gearIcon(g)}<div class="item-main"><strong>${esc(gearName(g))}</strong><small>${esc(rar(g.rarity).name)} · ${esc(realmName(s.route,g.tier))}阶 · ${worn?'已装配 · ':''}${g.locked?'保护中 · ':''}觉醒 ${num(g.awakening)}</small><small>${esc(attributes)}</small><small>${esc((g.affixes||[]).map(x=>affixName(x.id)+' '+affixValue(x)).join(' · '))}</small>${g.rarity===5?`<p>${esc(C.sets[g.set]?.redEffect||'道品专属机制')}</p>`:''}<div class="item-actions">${act(worn?'已装配':'装配','equipGear',{uid:g.uid},'secondary small',worn||!!s.battle)}${act(g.locked?'解除保护':'保护','lockGear',{uid:g.uid},'ghost small')}${full?'':ui('养成详情','gear-detail',{uid:g.uid},'primary small')}</div></div></article>`;
}
function equipmentModal(p={}){
 if(p.uid)return gearDetail(p);
 if(p.slot)uiState.gearSlot=p.slot;
 modal={type:'equipment',p:{slot:uiState.gearSlot}};
 const slot=C.slots[uiState.gearSlot]?uiState.gearSlot:null;
 const filters=`<div class="grid-3"><label>部位${select('filter-gear-slot',[{id:'all',name:'全部部位'},...Object.entries(C.slots).map(([id,name])=>({id,name}))],p.slot||uiState.gearSlot)}</label><label>品质${select('filter-gear-rarity',[{id:'all',name:'全部品质'},...C.rarities.map((x,i)=>({id:i,name:x.name}))],uiState.gearRarity)}</label><label>套装${select('filter-gear-set',[{id:'all',name:'全部套装'},...Object.entries(C.sets).map(([id,x])=>({id,name:x.name}))],uiState.gearSet)}</label></div>`;
 const options={slot:slot||'all',rarity:uiState.gearRarity,set:uiState.gearSet,page:uiState.modalPages.equipment||0,pageSize:6};
 frame(slot?C.slots[slot]+'配装':'灵装背包 · '+s.bag.length+' / 300',filters+window.WendaoSelection.renderEquipment(s,options),ui('成套装备','equipment-sets',{},'secondary')+ui('定向打造','forge',{},'primary'));
}
function buildGearTile(g,reason=''){
 return `<button class="build-gear-tile rarity-${g.rarity}" data-ui="gear-detail" data-payload="${esc(JSON.stringify({uid:g.uid}))}" data-inspect-kind="gear" data-inspect-id="${esc(g.uid)}">${gearIcon(g)}<strong>${esc(gearName(g))}</strong><small>${esc(C.slots[g.slot])}${s.equipped[g.slot]===g.uid?' · 当前穿戴':''}</small>${reason?`<span>${esc(reason)}</span>`:''}</button>`;
}
function equipmentSetsModal(p={}){
 const sets=Q.equipmentSetView(s),active=p.set&&C.sets[p.set]?p.set:sets.slice().sort((a,b)=>b.equippedCount-a.equippedCount||b.availableSlots.length-a.availableSlots.length)[0].id;
 modal={type:'equipment-sets',p:{set:active}};
 const chosen=sets.find(x=>x.id===active),rec=chosen.recommendation;
 const tabs=sets.map(x=>`<button class="build-school-tab${x.id===active?' active':''}" data-ui="equipment-sets" data-payload="${esc(JSON.stringify({set:x.id}))}" aria-pressed="${x.id===active}"><strong>${esc(x.name)}</strong><small>${esc(C.schools[x.id].name)} · ${x.equippedCount}/6</small></button>`).join('');
 const effects=chosen.effects.map(x=>`<div class="build-effect${x.active?' active':''}"><strong>${x.pieces}件 · ${x.active?'已激活':'未激活'}</strong><p>${esc(x.description)}</p></div>`).join('');
 const slots=chosen.slots.map(x=>{const g=s.bag.find(g=>g.uid===x.candidateUid);return g?buildGearTile(g):`<button class="build-gear-tile empty" data-ui="gear-change" data-payload="${esc(JSON.stringify({slot:x.slot}))}"><span class="empty-slot">＋</span><strong>${esc(C.slots[x.slot])}</strong><small>待获取 ${esc(chosen.name)}</small></button>`;}).join('');
 frame('成套装备',`<div class="build-school-tabs">${tabs}</div><div class="build-overview"><span class="eyebrow">${esc(C.schools[active].name)} · ${esc(chosen.name)}</span><h3>${esc(chosen.description)}</h3><p>当前穿戴 ${chosen.equippedCount} 件 · 背包可组成 ${rec.setCount} 件</p></div><div class="build-effects">${effects}</div><p class="build-synergy">${esc(chosen.synergy.description)}</p><details class="build-detail"><summary>六部位成套方案 · ${rec.replaceCount} 处可更换</summary><div class="build-gear-grid">${slots}</div></details><p class="compact-note">${esc(rec.reason||'仅装配已拥有且当前境界可用的装备，缺少的部位保留当前穿戴。')}</p>`,act('一键装配 '+chosen.name,'equipSet',{set:active},'primary',!rec.canEquip||!!s.battle||!!s.exploration)+ui('查看搭配功法','build-recommendations',{school:active},'secondary'));
}
function buildGoalAction(goal,plan){
 const source=goal.source||{};
 if(source.type==='upgrade')return costLine('upgradeTechnique',{id:source.id})+act('参悟升级','upgradeTechnique',{id:source.id},'primary small',!goal.available);
 if(source.type==='forge')return ui('定向打造','source',{type:'forge',set:plan.school,slot:plan.summary.set.missingSlots[0]},'secondary small');
 if(source.id&&C.dungeons[source.id])return ui(goal.available?'前往获取':'查看开启条件','source',{id:source.id,floor:source.floor},'secondary small');
 return ui('查看功法图鉴','techniques',{},'ghost small');
}
function buildRecommendationsModal(p={}){
 const requested=p.school&&C.schools[p.school]?p.school:'auto',plan=window.WendaoBuilds.plan(s,requested),summary=plan.summary;
 modal={type:'build-recommendations',p:{school:requested}};
 const schools=[['auto','综合推荐'],...Object.entries(C.schools).map(([id,x])=>[id,x.name])];
 const schoolTabs=schools.map(([id,name])=>ui(name,'build-recommendations',{school:id},'small '+(id===requested?'active':'ghost'))).join('');
 const tabs=[['techniques','功法神通'],['gear','装备方案'],['goals','提升目标']].map(([id,name])=>ui(name,'build-tab',{tab:id},'small '+(id===uiState.buildTab?'active':'ghost'))).join('');
 const statPreview=`<div class="build-power"><div><small>当前战力</small><strong>${num(plan.before.power)}</strong></div><span aria-hidden="true">→</span><div><small>推荐方案</small><strong>${num(plan.after.power)}</strong></div></div>`;
 let body='';
 if(uiState.buildTab==='techniques'){
  const entries=[plan.heart,...plan.skills,...plan.secrets].filter(Boolean);
  body=`<p class="build-rotation">${esc(summary.rotation.join(' → '))}</p><div class="build-technique-grid">${entries.map(x=>`<article class="build-technique">${window.WendaoSelection.techniqueCard(s,x.id)}<p>${esc(x.reason)}</p></article>`).join('')||'<p class="empty">当前还没有可用功法，先在功法图鉴学习入门功法。</p>'}</div>`;
 }
 if(uiState.buildTab==='gear'){
  body=`<p class="build-synergy">${esc(summary.set.name)} ${summary.set.count}件 · ${esc(summary.set.count>=4?summary.set.fourEffect:summary.set.count>=2?summary.set.twoEffect:'继续收集可激活两件效果')}</p><div class="build-gear-grid">${plan.gear.map(x=>{const g=s.bag.find(g=>g.uid===x.uid);return g?buildGearTile(g,x.reason):'';}).join('')}</div>`;
 }
 if(uiState.buildTab==='goals'){
  body=`<div class="build-goals">${plan.goals.map(x=>`<article><small>${esc(kindName[x.kind]|| ({gear:'套装装备',set:'套装收集',upgrade:'功法养成'})[x.kind]||'成长目标')}</small><h3>${esc(x.name)}</h3>${Number.isInteger(x.level)&&Number.isInteger(x.target)?`<div class="build-goal-progress"><small>当前 ${x.level} 重 → 目标 ${x.target} 重</small>${bar(x.level,x.target,'gold')}</div>`:''}<p>${esc(x.reason)}</p>${x.requirements?.length?`<p class="cost">${esc(x.requirements.join(' · '))}</p>`:''}<div class="row spaced"><small>${esc(x.source?.label||'修炼提升与装备养成')}</small>${buildGoalAction(x,plan)}</div></article>`).join('')||'<p class="empty">当前流派已具备核心搭配，可以挑战更高阶妖王并参悟功法。</p>'}</div>`;
 }
 frame('流派推荐与配装',`<div class="tabs build-school-switch">${schoolTabs}</div><div class="build-overview"><span class="eyebrow">${requested==='auto'?'当前综合推荐':'流派搭配'} · ${esc(summary.schoolName)}</span><h3>${esc(summary.name)} · ${esc(summary.position)}</h3><p>${esc(summary.description)}</p>${statPreview}</div><div class="tabs build-content-tabs">${tabs}</div>${body}${plan.warnings.length?`<p class="compact-note">${esc(plan.warnings.join(' · '))}</p>`:''}<p class="compact-note">根据当前背包、已学功法与境界搭配；装备、心法、神通和秘术一并装配。</p>`,act(plan.changed?'一键装配推荐方案':'已装配此方案','equipRecommendedBuild',{school:requested},'primary',!plan.changed||!!s.battle||!!s.exploration)+ui('手动配置','loadout',{},'secondary'));
}
function gearDetail(p){
 const g=s.bag.find(x=>x.uid===p.uid);if(!g)return equipmentModal({});
 modal={type:'gear-detail',p};frame('灵装养成',gearItem(g,true)+`<h3>部位强化 · +${num(s.slotLevels[g.slot])}</h3><p class="muted">强化保存在部位，换装继承。成功确定，不碎装。</p>${costLine('enhanceSlot',{slot:g.slot})}<div class="item-actions">${act('强化部位','enhanceSlot',{slot:g.slot},'primary')}${act('跨境重铸','recastGear',{uid:g.uid},'secondary',g.tier>=s.paths[s.route].realm)}${ui('词条洗炼','reroll',{uid:g.uid},'secondary')}${act('道品觉醒','awakenGear',{uid:g.uid},'primary',g.rarity!==5)}</div>${costLine('recastGear',{uid:g.uid})}${costLine('awakenGear',{uid:g.uid})}<p class="safe-note">重铸保留品质、套装、专属效果与词条。已穿戴、锁定和预设引用的装备受到保护。</p><div class="item-actions">${ui('分解此装备','confirm',{type:'recycleGear',payload:{uid:g.uid,confirm:g.rarity===5},label:'分解 '+gearName(g),text:g.rarity===5?'这是红色道品装备。分解会永久移除该实例，请确认已有替代。':'分解返还材料与天道尘。'},'danger small',K.protectedGear(s,g.uid))}</div>`,ui('更换装备','gear-change',{slot:g.slot},'primary')+ui('返回当前部位','equipment',{slot:g.slot},'secondary'));
}
function rerollModal(p){
 const g=s.bag.find(x=>x.uid===p.uid);if(!g)return closeModal();const pending=s.rerollPending;
 if(pending&&pending.uid===g.uid){frame('洗炼结果 · 二选一',`<p class="muted">本次费用已结算。保留旧词条或采用新词条，关闭窗口不会丢失待选结果。</p><h3>原词条</h3><p>${esc((pending.old||g.affixes).map(x=>affixName(x.id)+' '+affixValue(x)).join(' · '))}</p><h3>新词条</h3><p>${esc((pending.affixes||pending.next||[]).map(x=>affixName(x.id)+' '+affixValue(x)).join(' · '))}</p>`,act('采用新词条','acceptReroll',{uid:g.uid,accept:true},'primary')+act('保留原词条','acceptReroll',{uid:g.uid,accept:false},'secondary'));return;}
 const ids=['attack','defense','hp','crit','critDamage','dodge','cooldownReduction','healing','penetration','mpRegen'];
 frame('灵装洗炼',`<p class="muted">选择希望出现的类型，九次未中，第十次保证出现。类型保底不保证最高数值。</p><label class="gap-top">定向词条${select('reroll-target',ids.map(id=>({id,name:affixName(id)})),ids[0])}</label><h3>锁定词条</h3><div class="stack">${(g.affixes||[]).map((x,i)=>`<label class="check-line"><input class="reroll-lock" type="checkbox" value="${i}">${esc(affixName(x.id))} ${affixValue(x)}</label>`).join('')||'<p class="muted">此品质无词条，先打造更高品质。</p>'}</div><p class="cost">最多锁定总数减一条。锁定越多成本越高。</p><p id="reroll-live-cost" class="cost">消耗：${esc(price(costing('rerollGear',{uid:g.uid,target:'attack',locks:[]})))}</p><p id="reroll-live-odds" class="tiny">普通态目标出现概率 ${num(g.affixes.length/10*100)}%；第十次保证目标类型。数值范围按基础值的80%–120%随机。</p><p class="tiny">连续未中 ${num(g.targetMisses)} 次。</p>`,act('洗炼并查看结果','rerollGear',{uid:g.uid},'primary',!g.affixes?.length));
}
function forgePreview(g){
 const copy=['铁器与粗布，朴素耐用。','精工锻造，初蕴灵意。','灵纹铭刻，锋芒初显。','紫气流转，玄光护身。','橙金辉耀，宝光凝聚。','赤金道纹，万象共鸣。'];
 return `<div class="forge-art-preview rarity-${g.rarity}">${gearIcon(g)}<div><strong>${esc(gearName(g))}</strong><p>${copy[g.rarity]}</p><small>${esc(C.sets[g.set].name)}套装 · ${esc(C.slots[g.slot])}</small></div></div>`;
}
function updateForgePreview(){
 const g={slot:read('forge-slot'),set:read('forge-set'),rarity:Number(read('forge-rarity')),tier:s.paths[s.route].realm};
 const preview=document.getElementById('forge-art-preview');if(preview)preview.innerHTML=forgePreview(g);
 text('forge-live-cost',price(costing('forgeGear',g)));
}
function forgeModal(p={}){
 const sl=Object.entries(C.slots).map(([id,name])=>({id,name})),sets=Object.entries(C.sets).map(([id,x])=>({id,name:x.name}));
 const initial={slot:C.slots[p.slot]?p.slot:'weapon',set:C.sets[p.set]?p.set:'sword',rarity:Number.isInteger(p.rarity)&&p.rarity>=0&&p.rarity<=5?p.rarity:5,tier:s.paths[s.route].realm};
 frame('定向打造 · 最高红色',`<p class="muted">当前阶位：${esc(realmName())}。红装需对应永久蓝图和当前阶晶。</p><div class="grid-2 gap-top"><label>部位${select('forge-slot',sl,initial.slot)}</label><label>套装${select('forge-set',sets,initial.set)}</label><label>品质${select('forge-rarity',C.rarities.map((x,i)=>({id:i,name:x.name})),initial.rarity)}</label></div><div id="forge-art-preview" class="gap-top">${forgePreview(initial)}</div><p id="forge-live-cost" class="cost">${esc(price(costing('forgeGear',initial)))}</p><h3>蓝图与套装</h3><p class="tiny">已学蓝图：${esc(s.blueprints.map(id=>C.sets[id]?.name||id).join('、'))||'通过妖王首通和器道任务获得'}</p><div class="list gap-top">${Object.entries(C.sets).map(([id,x])=>`<div class="chapter-card"><strong>${esc(x.name)}</strong><p class="tiny">两件：${esc(x.twoEffect)}<br>四件：${esc(x.fourEffect)}<br>道品：${esc(x.redEffect)}</p></div>`).join('')}</div><p class="safe-note">打造完整成本随品质、套装与当前阶位显示。先取得永久蓝图，再积累对应阶材料。</p>`,act('确认打造','forgeGear',{},'primary'));
}
function alchemyModal(){
 let view={capacity:2,jobs:[]};try{view=Q.alchemyView(s);}catch(e){}
 const names={low:'文火',medium:'中火',high:'武火'},recipes=Object.entries(C.recipes);
 const recipeCard=(id,r)=>{
  const known=!Array.isArray(s.learnedRecipes)||s.learnedRecipes.includes(id),rank=s.paths[s.route].realm*10+s.paths[s.route].layer-1,canLearn=rank>=r.realm*10+(r.layer||1)-1;
  const provenance=s.recipeProvenance?.[id],origin=provenance?.source&&(C.dungeons[provenance.source]?.name||provenance.source);
  const learnCost=costing('researchRecipe',{id})||r.researchCost;
  return '<article class="item recipe-card" data-recipe="'+esc(id)+'">'+itemIcon('pill',id,'丹')+'<div class="item-main"><strong>'+esc(r.name)+' · 库存 '+num(s.pills[id])+'</strong><p>'+esc(r.description)+'</p><small>适用 '+esc(realmName(s.route,r.realm))+' · 每炉 '+esc(price({materials:r.materials,stones:r.stones}))+'</small>'+source(r)+(known?'<small class="recipe-provenance">丹方已收藏'+(origin?' · '+esc(origin):'')+'</small>':'<p class="cost">研究丹方：'+esc(price(learnCost))+'</p><small>需 '+esc(realmName(s.route,r.realm))+(r.layer||1)+'层，或通过对应历练收集。</small>')+'<div class="item-actions">'+(known?act('备料入队','queuePill',{id},'primary small',view.jobs.length>=view.capacity)+act('普通快捷成丹','craftPill',{id},'secondary small'):act('研究并收藏丹方','researchRecipe',{id},'primary small',!canLearn))+(['qi','xp'].includes(r.kind)?act('服用','usePill',{id},'ghost small',!s.pills[id]):'')+'</div></div></article>';
 };
 const jobs=view.jobs.map(j=>'<article class="item">'+itemIcon('pill',j.recipe,'丹')+'<div class="item-main"><strong>'+esc(j.name||C.recipes[j.recipe]?.name||'丹炉队列')+' ×'+num(j.count)+'</strong><small>'+(j.status==='queued'?'已备料':j.status==='control'?'控火 '+j.round+'/3 · 共鸣 '+j.score:'已成丹 · 额外 '+num(j.bonus))+'</small>'+(j.status==='control'?'<p class="section-note">'+esc(j.hint||'观察炉息，以对应火候调息。')+'</p><div class="grid-3">'+Object.entries(names).map(([fire,name])=>act(name,'stokeAlchemy',{jobId:j.id,fire},'primary small')).join('')+'</div>':'<div class="item-actions">'+(j.status==='queued'?act('开始三轮控火','startAlchemyControl',{jobId:j.id},'secondary small',!!view.activeJobId):'')+act(j.status==='queued'?'领取基础成丹':'领取成丹与额外','finishAlchemyJob',{jobId:j.id},'primary small')+'</div>')+(j.status==='queued'?'<p class="cost">控火额外费用：'+esc(price(j.controlCostPreview))+'</p>':'')+'<div class="item-actions">'+ui('取消此炉并退款','confirm',{type:'cancelAlchemyJob',payload:{jobId:j.id},label:'取消此炉',text:'未领取丹药的预付材料与控火费用将全额退还。'},'ghost small')+'</div></div></article>').join('');
 frame('洞府丹炉 · 18丹方','<div class="panel-head"><h3>丹炉队列</h3>'+badge(view.jobs.length+' / '+view.capacity,'gold')+'</div><p class="muted">先备料入队，再选择普通成丹或三轮控火。进度即时保存，退出后可以继续。</p><div class="list gap-top">'+(jobs||'<div class="empty">丹炉尚空。选丹方与批量，备料开炉。</div>')+'</div><h3>配方与批量 · 已收藏 '+num(s.learnedRecipes?.length??Object.keys(C.recipes).length)+' / 18</h3><label>每次炉数'+select('pill-count',[{id:1,name:'1炉'},{id:3,name:'3炉'},{id:10,name:'10炉'},{id:20,name:'20炉'},{id:50,name:'50炉'},{id:100,name:'100炉'}],1)+'</label><div class="list gap-top">'+modalSlice(recipes,'alchemy',4).map(([id,r])=>recipeCard(id,r)).join('')+'</div>'+modalPager('alchemy',recipes.length,4)+'<p class="safe-note">三轮控火按当前炉息选择文火、中火或武火。至少两轮正确有额外产量，三轮全部正确收益更高；普通成丹保证基础数量。</p>');
}
function treasuresModal(){
 const items=Object.entries(C.treasures);
 frame('灵宝图鉴 · 12件',`<div class="list">${modalSlice(items,'treasures',4).map(([id,t])=>{const own=s.ownedTreasures[id];return `<article class="item rarity-${t.rarity}">${itemIcon('treasure',id,t.name.slice(0,1))}<div class="item-main"><strong>${esc(t.name)}${own?' · '+own.level+'级':''}</strong><small>${esc(rar(t.rarity).name)} · ${t.kind==='active'?'主动':'被动'}${own?' · 持有'+num(own.count):' · 未获得'}</small><p>${esc(t.description)}</p>${source(t)}${own?costLine('upgradeTreasure',{id}):''}<div class="item-actions">${own?act('灵宝升级','upgradeTreasure',{id},'primary small'):''}${own?act('装配','equipTreasure',{id,index:t.kind==='active'?0:1},'secondary small',!K.unlocks(s).treasureSlots):''}${own?ui('分解一件','confirm',{type:'recycleTreasure',payload:{id,confirm:t.rarity===5},label:'分解 '+t.name,text:'会移除一件灵宝并回收天道尘，配置和预设中的最后一件受到保护。'},'ghost small'):''}</div></div></article>`;}).join('')}</div>${modalPager('treasures',items.length,4)}`,ui('调整灵宝槽','loadout',{},'primary'));
}
function recycleModal(){frame('整理与分解',`<p>已穿戴、锁定与预设引用的物品自动保护。红装只能逐件明确确认。</p><p class="muted gap-top">建议先保护准备保留的装备，再批量整理低品质。</p><div class="grid-3 gap-top">${[0,1,2].map(i=>act('分解至'+rar(i).name,'bulkRecycle',{maxRarity:i},'secondary')).join('')}</div><p class="safe-note">红、橙、紫默认不参加此处批量整理。分解回收可用于强化与洗炼。</p>`,ui('查看背包','equipment',{},'primary'));}
function targetModal(){const list=targetList();frame('选择红色定向',`<p class="muted">更换目标保留红计数及“下一红必定向”。保证基础物品身份，不保证随机词条。</p><label class="gap-top">当前可用目标${select('gacha-target',[{id:'',name:'取消定向'},...list],s.gacha.target||'')}</label><p class="section-note">${s.gacha.fateGuarantee?'已积累下一红必定向状态。':'首红50%目标；若未中，下红必定目标。'}</p>`,act('保存定向','setGachaTarget',{},'primary'));}
function oddsModal(){
 const rows=Q?.gachaTable||[{category:'equipment',weights:[4,8,9,5,3.5,.5]},{category:'treasure',weights:[0,3,4,5,2.7,.3]},{category:'technique',weights:[3,7,6,3,.8,.2]},{category:'pill',weights:[10,8,1,1,0,0]},{category:'material',weights:[8,4,2,1,0,0]}],names={equipment:'装备',gear:'装备',treasure:'灵宝',technique:'功法',pill:'丹药',material:'材料'};
 frame('天道概率与规则',`<p class="muted">普通状态联合概率。每抽先判红，未中后处理橙保底。十连与连续单抽完全同规则。</p><div class="table-wrap gap-top"><table><tr><th>类别</th>${C.rarities.map(x=>`<th>${esc(x.name)}</th>`).join('')}</tr>${rows.map(x=>`<tr><th>${esc(names[x.category]||x.category)}</th>${x.weights.map(n=>`<td>${num(n)}%</td>`).join('')}</tr>`).join('')}<tr><th>合计</th>${[25,30,22,15,7,1].map(n=>`<td>${n}%</td>`).join('')}</tr></table></div><h3>保底</h3><p>连续9次未出橙或红，第10次至少橙。红色前50次1%；第51次1.5%，以后每次增加0.5个百分点，第80次必红。</p><h3>定向</h3><p>首个红有50%命中目标，未中则下一红必定命中。定向最坏160抽获得基础物品。外部获得红色不清感应计数。</p><h3>重复与记录</h3><p>每抽固定2尘，重复秘籍转残页。结果与保底先保存再播放动画，跳过动画不影响奖励。</p><h3>当前可选红色目录</h3><div class="list">${targetList().map(x=>`<p class="tiny">${esc(x.name)} · ${esc(names[x.category]||x.category||'红色目标')}</p>`).join('')||'<p class="muted">第二境一层后显示当前可用目标。</p>'}</div>`,ui('返回感应','close',{},'primary'));
}
function poolModal(){
 if(!K.unlocks(s).gacha)return frame('当前物品池','<p>任一路第二境一层开放感应。届时会按当前境界显示全部合法奖励与内部概率。</p>',ui('查看保底规则','gacha-odds',{},'secondary'));
 let cells=[];try{cells=Q.gachaPool(s);}catch(e){}
 const names={gear:'装备',treasure:'灵宝',technique:'功法',pill:'丹药',material:'材料'},cell=cells.find(x=>x.category===uiState.poolCategory&&x.rarity===Number(uiState.poolRarity));
 frame('当前物品池与内部权重','<p class="muted">当前主修境界决定合法目录。此处为普通态联合概率，软保底、橙保底与定向会按公示规则改变当次分配。</p><div class="grid-2 gap-top"><label>类别'+select('pool-category',Object.entries(names).map(([id,name])=>({id,name})),uiState.poolCategory)+'</label><label>品质'+select('pool-rarity',C.rarities.map((x,i)=>({id:i,name:x.name})),uiState.poolRarity)+'</label></div>'+(cell&&cell.items.length?'<p class="section-note">此格总概率 '+cell.weight+'%。格内'+cell.items.length+'个物品等权，每项普通态基础概率约 '+(cell.weight/cell.items.length).toFixed(6).replace(/0+$/,'').replace(/\.$/,'')+'%。</p><div class="list">'+cell.items.map(x=>'<div class="quest-line"><span>'+esc(rewardName({...x,category:cell.category,rarity:cell.rarity}))+'</span>'+badge(rar(cell.rarity).name)+'</div>').join('')+'</div>':'<div class="empty gap-top">此类别和品质的概率为0，不参与当前抽取。</div>'),ui('保底与定向规则','gacha-odds',{},'secondary'));
}
function historyModal(){frame('感应记录 · 最近200次',`<div class="list">${(s.gacha.history||[]).slice().reverse().map(x=>`<div class="history-row rarity-${x.rarity}"><strong>${esc(rewardName(x))} · ${esc(rar(x.rarity).name)}</strong><small>${esc(x.category)} · 橙计数 ${num(x.highBefore)}→${num(x.highAfter)} · 红计数 ${num(x.redBefore)}→${num(x.redAfter)}${x.target?' · 定向 '+esc(x.target):''}${x.duplicate?' · 重复已转换':''}</small></div>`).join('')||'<div class="empty">第一份机缘，尚待感应。</div>'}</div>`);}
function drawArt(x){
 if(x.category==='gear'){const parts=String(x.id).split('_'),g=(s?.bag||[]).concat(s?.rewardOverflow||[]).find(g=>g.uid===x.uid);return gearIcon(g||{set:parts[1],slot:parts[2],rarity:x.rarity});}
 if(x.category==='treasure')return itemIcon('treasure',x.id,'宝');
 if(x.category==='technique'&&C.techniques[x.id])return techniqueIcon(C.techniques[x.id]);
 if(x.category==='pill')return itemIcon('pill',x.id,'丹');
 return utilityIcon(x.id,rewardName(x))||utilityIcon('universal',rewardName(x));
}
function drawModal(p={}){
 const highest=Math.max(0,...uiState.drawResults.map(x=>x.rarity));
 frame('天道回应','<p class="muted">机缘已入囊，保底已保存。重复功法化为残页。</p><div class="reward-grid gap-top reveal-grid'+(p.animated?' animated-reveal':' all-revealed')+'" data-highest-rarity="'+highest+'">'+uiState.drawResults.map((x,i)=>'<div class="reward-card rarity-'+x.rarity+'" style="--reveal-delay:'+(i*.17)+'s"><div class="reveal-card-face">'+drawArt(x)+'<strong>'+esc(rewardName(x))+'</strong><small>'+esc(rar(x.rarity).name)+(x.duplicate?' · 重复转换':'')+'</small></div><div class="reveal-card-back" aria-hidden="true"></div></div>').join('')+'</div>',ui('立即揭开全部','reveal-all',{},'secondary')+ui('收下机缘','close',{},'primary'));
 Sound?.play('reveal');
}
function startDrawAnimation(){
 closeModal();
 uiState.redRevealIndex=0;toastEl.hidden=true;
 if(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)return revealNextRed();
 showModal('summoning');
 Sound?.play('summon-rise');
 summonPulseTimer=setTimeout(()=>{const text=document.getElementById('summon-caption');if(text)text.textContent=uiState.drawResults.some(x=>x.rarity===5)?'天道异象 · 赤霄将开':'天道回应 · 万象将现';},1100);
 summonTimer=setTimeout(revealNextRed,2400);
}
function revealNextRed(){
 const red=uiState.drawResults.filter(x=>x.rarity===5);
 if(uiState.redRevealIndex<red.length){const index=uiState.redRevealIndex++;return showModal('red-reveal',{index});}
 const reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 showModal('draw-results',reduced?{skip:true}:{animated:true});
}
function redRevealModal(p={}){
 const red=uiState.drawResults.filter(x=>x.rarity===5),index=Number.isInteger(p.index)?p.index:0,x=red[index];
 if(!x)return showModal('draw-results',{skip:true});
 const reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const category={gear:'灵装',treasure:'灵宝',technique:'功法',pill:'丹药',material:'材料'}[x.category]||'机缘';
 const detail=x.category==='gear'?C.gearTargets?.[x.id]?.redEffect:x.category==='treasure'?C.treasures[x.id]?.description:x.category==='technique'?C.techniques[x.id]?.description:'';
 layer.hidden=false;app.inert=true;
 layer.innerHTML=`<div class="modal-backdrop red-reveal-backdrop"><section class="modal red-reveal" role="dialog" aria-modal="true" aria-labelledby="red-reveal-title" data-animation="red-reveal" data-red-index="${index}" data-phase="${reduced?'revealed':'awakening'}">
 <div class="red-cosmos" aria-hidden="true"><div class="red-nebula"></div><div class="red-eclipse"></div><div class="red-rays">${Array.from({length:24},(_,i)=>`<i style="--ray-angle:${i*15}deg"></i>`).join('')}</div><div class="red-mandala red-mandala-outer"></div><div class="red-mandala red-mandala-inner"></div><div class="red-runes">${Array.from('天地玄黄万象归一道法自然').map((c,i)=>`<span style="--rune-angle:${i*30}deg">${c}</span>`).join('')}</div><div class="red-shockwave wave-one"></div><div class="red-shockwave wave-two"></div><div class="red-flash"></div><div class="red-sparks">${Array.from({length:36},(_,i)=>`<i style="--spark-x:${Math.round(Math.cos(i*Math.PI/18)*(100+i%5*18))}px;--spark-y:${Math.round(Math.sin(i*Math.PI/18)*(140+i%5*20))}px;--spark-delay:${i%6*.065}s"></i>`).join('')}</div></div>
 <header class="red-topline"><span>天道感应 · 红色道品</span>${ui('跳过演出','summon-skip',{},'ghost small red-skip')}</header>
 <div class="red-content"><p class="red-eyebrow">万象俯首 · 道品降世</p><h2 class="red-title" id="red-reveal-title">天赐道品</h2><div class="red-card-stage"><div class="red-card reward-card rarity-5" data-prize-id="${esc(x.id)}" data-prize-uid="${esc(x.uid||'')}"><div class="red-card-art">${drawArt(x)}</div><div class="red-card-seal" aria-hidden="true">道</div><small class="red-card-category">${esc(category)}</small></div></div><h3 class="red-prize-name">${esc(rewardName(x))}</h3><p class="red-prize-detail">${esc(x.duplicate?'已拥有的功法，已转为对应残页。':detail||'赤霄为证，独属于你的天道机缘。')}</p>${red.length>1?`<p class="red-reveal-count">第 ${index+1} / ${red.length} 件道品</p>`:''}</div>
 <footer class="red-actions">${ui(index<red.length-1?'下一件道品':'收下道品 · 查看全部','red-reveal-next',{},'primary red-continue')}<span class="red-keepsake">机缘已入囊</span></footer></section></div>`;
 layer.querySelector('.red-skip')?.focus({preventScroll:true});
 Sound?.play(reduced?'red-impact':'red-awaken');
 if(!reduced){
  summonPulseTimer=setTimeout(()=>{layer.querySelector('.red-reveal')?.setAttribute('data-phase','impact');Sound?.stopEffect('red-awaken');Sound?.play('red-impact');},900);
  redRevealTimer=setTimeout(()=>{layer.querySelector('.red-reveal')?.setAttribute('data-phase','revealed');},1800);
 }
 summonTimer=setTimeout(revealNextRed,4200);
}
function summoningModal(){
 const highest=Math.max(0,...uiState.drawResults.map(x=>x.rarity));
 frame('感应天道','<div class="summon-ritual rarity-'+highest+'" data-animation="summoning"><div class="ritual-orbit orbit-one"></div><div class="ritual-orbit orbit-two"></div><div class="ritual-flare"></div><div class="ritual-symbol">◇</div><div class="ritual-stars">'+Array.from({length:12},(_,i)=>'<i style="--particle:'+i+'"></i>').join('')+'</div><div class="ritual-copy"><strong id="summon-caption">灵玉共鸣 · 星门初启</strong><span>'+uiState.drawResults.length+' 道机缘正在显现</span></div></div>',ui('跳过演出 · 立即揭卡','summon-skip',{},'primary'));
}
function shopPreview(){
 return panel('瑶台商城','<div class="row spaced"><div><strong class="jade-balance">◇ '+num(s.jade)+' 灵玉</strong><p class="tiny">个人娱乐 · 模拟购入即到账</p></div>'+ui('进入商城','shop',{},'primary small')+'</div>');
}
function shopModal(){
 const unlocked=K.unlocks(s).gacha,packName=id=>C.shop.packages.find(x=>x.id===id)?.name||id,tab=uiState.shopTab;
 const tabs=`<div class="tabs compact-tabs">${[['resources','常规资源'],['jade','灵玉玉藏'],['exchange','感应 · 兑换']].map(([id,label])=>ui(label,'shop-tab',{tab:id},'small '+(tab===id?'active':'ghost'))).join('')}</div>`;
 const balances=`<div class="market-balances"><span>${utilityIcon('jade','灵玉')}<strong class="shop-balance">${num(s.jade)}</strong><small>灵玉</small></span><span>${utilityIcon('dust','天道尘')}<strong>${num(s.dust)}</strong><small>天道尘</small></span></div>`;
 let body='';
 if(tab==='resources'){
  const goods=Q.resourceMarket||[],count=uiState.resourceCount;
  body=`<label class="gap-top">购买批数${select('resource-count',[{id:1,name:'1批'},{id:5,name:'5批'},{id:10,name:'10批'}],count)}</label><div class="list gap-top">${modalSlice(goods,'shop-resources',3).map(g=>{const inventory=g.id==='stones'?s.stones:s.materials[g.id],quantity=g.reward.stones||g.reward.materials?.[g.id]||0;return `<article class="item resource-market-card" data-resource="${esc(g.id)}">${utilityIcon(g.id,g.name)}<div class="item-main"><strong>${esc(g.name)} ×${num(quantity*count)}</strong><small>库存 ${num(inventory)} · ${count}批</small><div class="grid-2 item-actions">${act(num(g.price.jade*count)+'灵玉购买','buyResource',{item:g.id,currency:'jade'},'primary small',s.jade<g.price.jade*count)}${act(num(g.price.dust*count)+'天道尘购买','buyResource',{item:g.id,currency:'dust'},'secondary small',s.dust<g.price.dust*count)}</div></div></article>`;}).join('')}</div>${modalPager('shop-resources',goods.length,3)}<p class="compact-note">两种货币任选其一，购买即入库。</p>`;
 }
 if(tab==='jade')body=`<div class="shop-banner"><span>瑶台玉藏 · 万象随心</span></div><p class="safe-note">个人单机模拟礼包，点击直接到账，无实际扣款。</p><div class="shop-packages gap-top">${C.shop.packages.map(x=>`<article class="shop-package"><span class="shop-gem">${utilityIcon('jade','灵玉')}</span><strong>${esc(x.name)}</strong><span class="shop-amount">${num(x.jade)} 灵玉</span><small>¥${x.priceYuan} 档 · 模拟礼包</small>${act('立即购入','buyJade',{packageId:x.id},'primary small')}</article>`).join('')}</div>`;
 if(tab==='exchange')body=`<h3>灵玉感应</h3><p class="muted">${C.shop.jadePerDraw}灵玉 = 1次感应，与券共用保底和定向。</p><div class="grid-2 gap-top">${act('感应一次 · 60灵玉','drawWithJade',{count:1},'secondary',!unlocked||s.jade<60||!!s.battle)}${act('十次感应 · 600灵玉','drawWithJade',{count:10},'primary',!unlocked||s.jade<600||!!s.battle)}</div>${!unlocked?'<p class="safe-note">第二境一层开启感应，灵玉可提前保存。</p>':''}<h3>兑换感应券</h3><div class="grid-2">${act('兑换1券 · 60灵玉','exchangeJade',{count:1},'secondary',s.jade<60)}${act('兑换10券 · 600灵玉','exchangeJade',{count:10},'secondary',s.jade<600)}</div><h3>最近玉藏</h3><div class="shop-history">${s.shop.history.slice(-5).reverse().map(x=>`<div class="row spaced"><span>${esc(packName(x.packageId))}</span><span>+${num(x.amount)}灵玉</span></div>`).join('')||'<p class="muted">尚无购入记录</p>'}</div>`;
 frame('瑶台集市',tabs+balances+body,ui('离开集市','close',{},'ghost'));
}
function dustModal(){const x=Q?.exchangeList||[{id:'insight',name:'10参悟',cost:20},{id:'universal',name:'5通用残页',cost:20},{id:'lotus',name:'3灵莲',cost:15},{id:'orangeGear',name:'当前阶随机橙装',cost:120},{id:'orangeTreasure',name:'当前可用橙灵宝',cost:150}];frame('天道尘兑换',`<p class="muted">当前天道尘 ${num(s.dust)}</p><div class="list gap-top">${x.map(a=>{const id=a.id||a.item,icon=id==='orangeGear'?gearIcon({set:'sword',slot:'weapon',rarity:4}):id==='orangeTreasure'?itemIcon('treasure','t9','橙色灵宝'):utilityIcon(id);return `<article class="item">${icon}<div class="item-main"><strong>${esc(a.name||a.label||id)}</strong><small>${num(a.cost?.dust||a.cost||a.dust)} 天道尘</small>${costLine('exchangeDust',{item:id})}<div class="item-actions">${act('兑换','exchangeDust',{item:id},'primary small')}</div></div></article>`;}).join('')}</div>`);}
function giftModal(p){const c=C.companions[p.companion];frame('赠礼 · '+c.name,`<p class="muted">心仪之物：${esc(mat[c.favorite]||C.recipes[c.favorite]?.name||c.favorite)}。赠礼消耗真实库存。</p><div class="list gap-top">${['herb','ore','lotus','qi0'].map(id=>`<article class="item">${id==='qi0'?itemIcon('pill',id,C.recipes[id].name):utilityIcon(id)}<div class="item-main"><strong>${esc(mat[id]||C.recipes[id]?.name||id)}</strong><small>库存 ${num(id==='qi0'?s.pills[id]:s.materials[id])}</small><div class="item-actions">${act('赠送','gift',{companion:p.companion,item:id},'primary small')}</div></div></article>`).join('')}</div>`);}
function inviteModal(p){
 if(s.joint)return showModal('joint');const c=C.companions[p.companion],r=s.companions[p.companion],own=Object.keys(s.techniques).map(id=>({id,name:C.techniques[id].name})),left=Math.max(0,r.cooldownUntil-Date.now());
 frame('共修邀约 · '+c.name,`<p>${esc(c.jointText||'月下调息，彼此信任，以功法共引天地灵气。')}</p><p class="muted gap-top">结契且好感${num(C.jointThreshold)}。完成后冷却${num(C.jointCooldownMs/60000)}分钟，未完成进度会保存。</p><div class="stack gap-top">${[0,1,2].map(i=>`<label>第${i+1}回合功法${select('joint-tech-'+i,own,own[i%own.length]?.id)}</label>`).join('')}</div><p class="cost">消耗：${esc(price(currentView().jointCost||C.jointCost))}。取消按未进行回合退还。</p>${left?`<p class="muted">还需冷却 ${Math.ceil(left/60000)} 分钟。</p>`:''}`,act('邀约共修','jointInvite',{companion:p.companion},'primary',!r.bond||r.affinity<(C.jointThreshold||55)||left>0));
}
function jointModal(){const j=s.joint;if(!j)return closeModal();const rhythms={sun:'日',moon:'月',star:'星'},seq=j.rhythm||j.rhythms||['sun','moon','star'],round=j.round||0;frame('灵息共修 · '+C.companions[j.companion].name,`<p>${esc(C.companions[j.companion].jointText||'你们并肩凝息，灵气随共同的节律流转。')}</p><div class="joint-rhythm">${seq.map((r,i)=>`<span class="${i===round?'current':''}">${i<round?'已凝息':i===round?rhythms[r]:'待凝息'}</span>`).join('')}</div><h3>第${round+1}回合 · ${esc(C.techniques[j.techniques?.[round]]?.name||'灵息相和')}</h3><p>以 <strong>${esc(rhythms[seq[round]])}</strong> 引息 · 共鸣 ${num(j.score)}</p><div class="grid-3 gap-top">${Object.entries(rhythms).map(([choice,name])=>act(name+' · 引息','jointStep',{choice},'primary')).join('')}</div>`,act('取消并退还剩余费用','jointCancel',{},'ghost'));}
function battleSettingsModal(){
 const rules=s.battleRules||{healBelow:.35,reserveInterrupt:true,shieldBeforeBurst:true},retry=s.autoRetry||{enabled:false,maxRuns:1,stopOnRed:true,stopOnDefeat:true};
 frame('战斗规则与逐场重战','<h3>自动神通条件</h3><label>血量低于此比例优先治疗'+select('battle-heal-threshold',[{id:.25,name:'25%'},{id:.35,name:'35%'},{id:.5,name:'50%'},{id:.65,name:'65%'}],rules.healBelow)+'</label><label class="check-line"><input id="battle-reserve-interrupt" type="checkbox"'+(rules.reserveInterrupt?' checked':'')+'>保留打断，等待敌人关键读条</label><label class="check-line"><input id="battle-shield-burst" type="checkbox"'+(rules.shieldBeforeBurst?' checked':'')+'>蓄力爆发优先等护盾保护</label><div class="item-actions">'+act('保存神通规则','setBattleRules',{},'primary')+'</div><h3>妖王自动重战</h3><label class="check-line"><input id="battle-retry-enabled" type="checkbox"'+(retry.enabled?' checked':'')+'>胜利后逐场再战，前台真实运行</label><label>本轮最多场数'+select('battle-retry-runs',Array.from({length:10},(_,i)=>({id:i+1,name:(i+1)+'场'})),retry.maxRuns||1)+'</label><label class="check-line"><input id="battle-retry-red" type="checkbox"'+(retry.stopOnRed?' checked':'')+'>获得红装立即停止</label><p class="safe-note">仅妖王可自动重战。战败、空间不足、达到上限均停止；后台暂停，不离线领奖。</p><div class="item-actions">'+act('保存重战设置','setAutoRetry',{},'secondary')+'</div>',ui('返回','close',{},'ghost'));
}
function settingsModal(){
 const audio=Sound.getPreferences();
 frame('洞府设置',`<h3>声音与音乐</h3><div class="sound-settings"><label class="check-line"><input type="checkbox" id="audio-muted"${audio.muted?' checked':''}>静音</label><label for="audio-music">背景音乐 <output id="audio-music-output">${Math.round(audio.music*100)}%</output></label><input id="audio-music" type="range" min="0" max="100" step="1" value="${Math.round(audio.music*100)}"><label for="audio-effects">操作音效 <output id="audio-effects-output">${Math.round(audio.effects*100)}%</output></label><input id="audio-effects" type="range" min="0" max="100" step="1" value="${Math.round(audio.effects*100)}"><p class="muted">修行、历练与天道各有配乐；后台自动暂停。</p></div><h3>道号</h3><label>道号<input id="rename-input" maxlength="16" value="${esc(s.player.name)}" autocomplete="off"></label><div class="form-actions">${act('更改道号','rename',{},'secondary')}</div><h3>存档与迁移</h3><p class="muted">关键操作先保存再展示结果。旧版本进度保留备份；导入前校验完整结构，文件上限1 MiB。</p><div class="grid-2 gap-top">${ui('导出备份','export-save',{},'primary')}${ui('导入存档','import-save',{},'secondary')}</div><h3>离线单机</h3><p class="muted">修为最多补算24小时，设施储藏七天。后台战斗暂停，返回后手动继续，不离线完成首次挑战。</p><p class="safe-note">版本 V3 · 无支付 · 无每日登录门槛。请定期导出备份。</p>`,ui('玩法指引','help',{},'secondary'));
}
function helpModal(){frame('修行指引',`<div class="stack">${[['01','逐层修行','每境一至十层，修为满后晋级。十层圆满需完成试炼，再主动突破。两路线分别保存进度。'],['02','功法与配装','1心法、4神通、2秘术逐步开放。调整出招顺序、治疗、净化和打断，寻找适合妖王的配置。'],['03','自由历练','资源、宗门、妖王、塔、洞天、突破六类。查看来源与奖励后自选挑战，已开放内容可以回刷。'],['04','灵装与炼丹','六部位强化跟随部位。最高红色可通过蓝图定向打造。普通炼丹必成，控火争取额外数量。'],['05','天道与机缘','第二境一层开放抽取。橙红10次保底、红80次保底、目标最坏160次。公开概率与历史记录。'],['06','山海与同行','六章主线、18支线、三结局。宗门委托按行动完成，成年伙伴关系与共修不强制主线。'],['07','存档与后台','后台暂停战斗，离线只补基础修行与设施。安卓可用系统文件选择器导出备份。']].map(([n,title,desc])=>`<div class="guide-step"><span>${n}</span><div><strong>${esc(title)}</strong><p>${esc(desc)}</p></div></div>`).join('')}</div>`,ui('继续仙途','close',{},'primary'));}
function conversationModal(p){
 const c=C.companions[p.companion],r=s.companions[p.companion];if(!c||!r)return closeModal();
 const expression=r.bond||r.affinity>=C.jointThreshold?1:r.questStep===1?3:r.questStep>=2?2:0;
 const mood=['平静','欢欣','肃然','担忧'][expression],col=Object.keys(C.companions).indexOf(p.companion);
 const attitude=currentView().companionAttitudes?.[p.companion];
 const extra=expression===3?'望向远处的山门，你们希望把尚未解决的旧事说清。':expression===2?'你们认真交换接下来要走的路，各自保留自己的决定。':expression===1?'熟悉的灵息让交谈轻松起来，彼此都愿意多停留片刻。':'你们在洞府外停步，山风把最初的拘谨轻轻吹散。';
 frame(c.name+' · '+mood,'<div class="conversation-portrait" style="background-image:url(assets/v3-hero-expressions.png);background-position:'+col*50+'% '+expression*100/3+'%"></div><p>'+esc(p.text||c.quote||c.dialogues?.[0]||c.description)+'</p><p class="muted gap-top">'+esc(extra)+'</p>'+(attitude?'<p class="section-note"><strong>'+esc(attitude.label)+'</strong><br>'+esc(attitude.text)+'</p>':'')+'<p class="safe-note">好感 '+num(r.affinity)+' / 100 · '+(r.bond?'同道已结契':'相识同行')+'</p>',ui('赠礼','gift',{companion:p.companion},'secondary')+ui('继续同行','close',{},'primary'));
}
function battleHistoryModal(){
 const reports=s.battleReports?.length?s.battleReports:s.lastBattleResult?[s.lastBattleResult]:[];
 frame('历练战报 · 最近20场','<p class="muted">最近20场结算会随仙途保存。试阵、退出与正式胜利各有标记，选择一场查看机制和收益。</p><div class="list gap-top">'+(reports.map((r,i)=>({r,i})).reverse().map(({r,i})=>'<article class="item battle-history-row"><div class="item-main"><strong>'+esc(r.name||'山海历练')+' · '+esc(reportOutcome(r))+'</strong><small>'+esc(reportContext(r))+'</small><small>'+esc(reportDate(r))+' · 用时 '+num(r.duration??r.time)+' 秒</small><p>'+esc(r.reason||r.message||'历练已结算')+'</p><div class="item-actions">'+ui('查看战报','battle-report',{index:i},'secondary small')+'</div></div></article>').join('')||'<div class="empty">完成或退出一次历练后，战报会保存在这里。</div>')+'</div>',ui('返回历练','close',{},'primary'));
}
function battleReportModal(p={}){
 const r=Number.isInteger(p.index)?s.battleReports?.[p.index]||s.lastBattleResult:s.lastBattleResult;
 if(!r)return frame('最近战报','<p>完成一次挑战后，可查看战报。</p>');
 const details=(title,items)=>Array.isArray(items)&&items.length?'<h3>'+esc(title)+'</h3><div class="list gap-top">'+items.map(x=>'<p class="section-note">'+esc(typeof x==='string'?x:x.message||x.text||x.label||'')+'</p>').join('')+'</div>':'';
 const rewardText=price(r.rewards||r.reward),legacy=r.reasons||r.advice||r.report;
 frame(r.win||r.victory||r.ok?'挑战胜利':'挑战战报','<h3>'+esc(r.name||r.id||'山海历练')+'</h3><p class="muted">'+esc(reportOutcome(r))+' · '+esc(reportContext(r))+'</p><p class="tiny">'+esc(reportDate(r))+'</p><p class="gap-top">'+esc(r.reason||r.message||r.summary||'战斗已结算。')+'</p><p class="muted">用时 '+num(r.duration??r.time)+' 秒 · 处理机制 '+num(r.performance?.handled)+' · 错失机制 '+num(r.performance?.missed)+'</p><p class="cost">奖励：'+esc(r.rewardsPending?'暂存待携出：'+(rewardText||'常规收益'):rewardText||(r.practice?'试阵不发奖励':'本场无奖励'))+'</p>'+details('敌人机制',r.mechanisms)+details('应对建议',r.failures)+details('战斗回顾',legacy)+details('战斗记录',r.log),ui('战报历史','battle-history',{},'secondary')+ui('调整功法','loadout',{},'secondary')+ui('继续历练','close',{},'primary'));
}
function confirmModal(p){frame('确认'+p.label,`<p>${esc(p.text)}</p>`,act('确认'+p.label,p.type,p.payload||{},'danger')+ui('返回','close',{},'secondary'));}
function offlineModal(p){const x=p.summary||{};frame('归来 · 灵气仍在',`<p>基础修行与洞府产出已结算并保存。</p><p class="muted gap-top">离线 ${num(x.elapsedMs?x.elapsedMs/3600000:(x.seconds||x.elapsedSeconds||0)/3600)} 小时 · 修为上限24小时 · 生产上限七天</p><p class="cost">${esc(price(x.reward||x.rewards||x.gains||{xp:x.xp,stones:x.stones,materials:x.materials}))}</p><p class="muted">新增悟道券储备 ${num(x.wisdomTickets)} · 历练储备 +${num((x.sweepAddedMs||0)/3600000)}h</p><p class="safe-note">新副本、剧情与大境突破仍由你主动完成。战斗已暂停，可继续或调整准备。</p>`,ui('继续仙途','close',{},'primary'));}
function techBranch(p){const t=C.techniques[p.id],x=s.techniques[p.id];if(!t||!x)return;modal={type:'tech-branch',p};frame(t.name+' · 参悟分支',`<p>${esc(t.description)}</p><p class="muted gap-top">五级后可以选择分支，洞府切换免费。当前分支 ${esc(t.branches?.[x.branch]?.name||String(x.branch+1))}。</p>${techniqueMilestones(t,x)}<div class="stack gap-top">${(t.branches||[]).map(b=>'<p class="section-note">'+esc(b.name)+'：'+esc(b.description)+'</p>').join('')}</div><div class="grid-2 gap-top">${act(t.branches?.[0]?.name||'凝练','setTechniqueBranch',{id:p.id,branch:0},'secondary')}${act(t.branches?.[1]?.name||'通明','setTechniqueBranch',{id:p.id,branch:1},'secondary',x.level<5)}</div><p class="safe-note">重置返还90%参悟投入，教学首次重置全额返还。等级记录仅在主动重置时清除。</p>${costLine('resetTechnique',{id:p.id})}`,ui('重置此功法','confirm',{type:'resetTechnique',payload:{id:p.id},label:'重置 '+t.name,text:'功法等级退回初始，返还规则按实际投入结算。'},'ghost'));}
function read(id){return document.getElementById(id)?.value??'';}
function payload(type,p){
 const q={...p};
 if(type==='rename')q.name=read('rename-input');
 if(type==='setBattleRules'){q.healBelow=Number(read('battle-heal-threshold'));q.reserveInterrupt=!!document.getElementById('battle-reserve-interrupt')?.checked;q.shieldBeforeBurst=!!document.getElementById('battle-shield-burst')?.checked;}
 if(type==='setAutoRetry'){q.enabled=!!document.getElementById('battle-retry-enabled')?.checked;q.maxRuns=Number(read('battle-retry-runs')||1);q.stopOnRed=!!document.getElementById('battle-retry-red')?.checked;q.stopOnDefeat=true;}
 if(type==='setLoadout'){const u=K.unlocks(s);q.heart=read('load-heart')||null;q.skills=Array.from({length:u.skillSlots},(_,i)=>read('load-skill-'+i)).filter(Boolean);q.secrets=Array.from({length:u.secretSlots},(_,i)=>read('load-secret-'+i)).filter(Boolean);q.treasures=Array.from({length:3},(_,i)=>read('load-treasure-'+i)||null);q.pills=[0,1,2].map(i=>read('load-pill-'+i)).filter(Boolean);}
 if(type==='startDungeon'){q.practice=!!document.getElementById('dungeon-practice')?.checked;q.tier=C.dungeons[q.id]?.type==='resource'||C.dungeons[q.id]?.type==='trial'?Number(read('dungeon-tier')||s.paths[s.route].realm):C.dungeons[q.id]?.realm;q.difficulty=Number(read('dungeon-difficulty')||0);if(C.dungeons[q.id]?.type==='tower')q.floor=Number(read('dungeon-floor')||Math.min(60,s.progress.tower+1));}
 if(type==='sweepDungeon'){q.tier=Number(read('sweep-tier')||s.paths[s.route].realm);q.count=Number(read('sweep-count')||1);}
 if(type==='forgeGear'){q.slot=read('forge-slot');q.set=read('forge-set');q.rarity=Number(read('forge-rarity'));}
 if(type==='craftPill'){q.count=Number(read('pill-count')||1);q.control=0;}
 if(type==='queuePill')q.count=Number(read('pill-count')||1);
 if(type==='buyResource')q.count=Number(read('resource-count')||uiState.resourceCount||1);
 if(type==='setGachaTarget')q.target=read('gacha-target')||null;
 if(type==='jointInvite')q.techniques=[0,1,2].map(i=>read('joint-tech-'+i));
 if(type==='rerollGear'){q.target=read('reroll-target');q.locks=Array.from(document.querySelectorAll('.reroll-lock:checked')).map(x=>Number(x.value));}
 return q;
}
function run(type,p={},interactive=true){
 if(!s||busy)return{ok:false,message:'操作进行中'};
 if(modal?.type==='equipment'){const library=layer.querySelector('[data-selection-library=gear]');try{if(library)uiState.modalPages.equipment=JSON.parse(library.dataset.selectionOptions).page||0;}catch(e){}}
 busy=true;const before=JSON.stringify(s);let r;
 try{
  r=E.act(s,{type,...p},Date.now());
  if(!r?.ok){if(interactive){toast(r?.message||'当前条件尚未满足。');Sound?.play('error');}return r||{ok:false};}
  if(!persist(s)){s=JSON.parse(before);updateChrome();renderPage();renderEncounter();return{ok:false,message:'存档未成功，已撤回'};}
  if(interactive){toast(r.message);if(['useSkill','useTreasure'].includes(type))Sound?.play('battle-skill');else if(type==='targetEnemy')Sound?.play('ui');else if(!['draw','drawWithJade','pauseBattle','setBattleAuto'].includes(type))Sound?.play('success');}
  updateChrome();renderPage();renderEncounter();
  if(type==='draw'||type==='drawWithJade'){uiState.drawResults=r.data?.results||[];startDrawAnimation();}
  else if(type==='buyJade'||type==='exchangeJade'||type==='buyResource'){showModal('shop');}
  else if(type==='startDungeon'){closeModal();}
  else if(type==='talk'){showModal('conversation',{companion:p.companion,text:r.message});}
  else if(['researchRecipe','queuePill','startAlchemyControl','stokeAlchemy','finishAlchemyJob','cancelAlchemyJob'].includes(type)){showModal('alchemy');}
  else if(type==='rerollGear'||type==='acceptReroll'){showModal('reroll',{uid:p.uid});}
  else if(type==='jointInvite'||type==='jointStep'){s.joint?showModal('joint'):closeModal();}
  else if(type==='jointCancel'||type==='setLoadout'||type==='loadPreset'||type==='leaveBattle'||type==='recycleGear'||type==='resetTechnique'){closeModal();}
  else if(modal&&['upgradeTechnique','learnTechnique','queuePill','startAlchemyControl','stokeAlchemy','finishAlchemyJob','cancelAlchemyJob','craftPill','usePill','equipGear','equipSet','equipRecommendedBuild','lockGear','enhanceSlot','recastGear','awakenGear','upgradeTreasure','equipTreasure','recycleTreasure','exchangeDust','talk','gift','savePreset','setTechniqueBranch'].includes(type)){const m=modal;if(m.type==='tech-branch')techBranch(m.p);else showModal(m.type,m.p);}
  if(type==='setGachaTarget')closeModal();
  return r;
 }catch(e){s=JSON.parse(before);if(interactive){toast('操作未完成，进度已恢复。');Sound?.play('error');}console.error(e);return{ok:false,message:'操作异常'};}
 finally{busy=false;}
}
function settle(show=false){
 if(!s)return;const before=JSON.stringify(s);try{const r=E.advance(s,Date.now());if(!persist(s)){s=JSON.parse(before);return;}updateChrome();if(show){const x=r.offlineSummary||r.summary;if(x&&(x.elapsedMs||(x.seconds||x.elapsedSeconds||0)*1000)>60000)showModal('offline',{summary:x});}}catch(e){s=JSON.parse(before);}
}
function boot(){
 if(!s)s=PREVIEW&&window.WendaoPreview?window.WendaoPreview.createState(Date.now()):E.createState(Date.now());try{localStorage.setItem(AGE,'yes');}catch(e){}
 if(s.battle)E.act(s,{type:'pauseBattle',paused:true},Date.now());
 persist(s);mounted=true;mount();lastFrame=lastPassive=Date.now();clearInterval(timer);
 timer=setInterval(()=>{
  if(!s||!mounted||document.hidden||busy)return;const now=Date.now(),seconds=Math.min(1,(now-lastFrame)/1000);lastFrame=now;
  if(s.battle){const before=JSON.stringify(s),beforeBattle=!!s.battle,beforeView=battleView();try{E.tick(s,seconds);if((beforeBattle&&!s.battle)||now-lastPersist>1000){if(!persist(s)){s=JSON.parse(before);if(s.battle)E.act(s,{type:'pauseBattle',paused:true},now);}}}catch(e){s=JSON.parse(before);}const afterView=battleView();if(afterView.active&&beforeView.active&&(afterView.player.hp<beforeView.player.hp||afterView.enemies.some(x=>x.hp<(beforeView.enemies.find(y=>y.index===x.index)?.hp??x.hp))))Sound?.play('battle-hit');renderEncounter();if(beforeBattle&&!s.battle){renderPage();if(s.lastBattleResult){Sound?.play(s.lastBattleResult.win||s.lastBattleResult.victory?'victory':'defeat');showModal('battle-report');}}}
  if(now-lastPassive>=1000){const priorRank=K.pathRank(s),before=JSON.stringify(s);try{E.advance(s,now);if(now-lastPersist>5000&&!persist(s,true))s=JSON.parse(before);}catch(e){s=JSON.parse(before);}lastPassive=now;updateChrome();if(K.pathRank(s)!==priorRank)renderPage();}
 },250);
 settle(true);
}
function download(raw,name,type='application/json'){const blob=new Blob([raw],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function exportSave(){if(!s)return;settle();const raw=JSON.stringify(s,null,2);try{if(window.Native&&typeof window.Native.exportSave==='function')window.Native.exportSave(raw);else download(raw,'wendao-lingqi-'+new Date().toISOString().slice(0,10)+'.json');toast('已打开备份导出。');}catch(e){toast('导出未成功，请重试。');}}
function importPicker(){try{if(window.Native&&typeof window.Native.importSave==='function')window.Native.importSave();else{fileInput.value='';fileInput.click();}}catch(e){toast('无法打开文件选择器。');}}
function acceptImport(raw){
 if(typeof raw!=='string'||new Blob([raw]).size>MAX){toast('导入文件无效或超过1 MiB。');return false;}
 const r=E.validate(raw);if(!r.ok){toast('导入失败：'+r.error);return false;}
 const old=s;try{if(old)localStorage.setItem(KEY+'-before-import',JSON.stringify(old));}catch(e){}
 if(!persist(r.state)){s=old;return false;}s=r.state;recovery=null;closeModal();page='cultivation';boot();toast(r.migrated?'旧存档已迁移并载入。':'存档已载入。');return true;
}
function handleUi(id,p){
 if(id==='layout-tab'||id==='layout-page')return;
 if(id==='encounter-exit')return requestEncounterExit();
 if(id==='shop-tab'){if(!['resources','jade','exchange'].includes(p.tab))return;uiState.shopTab=p.tab;showModal('shop');const body=layer.querySelector('.modal-body');if(body)body.scrollTop=0;return;}
 if(id==='modal-page'){uiState.modalPages[p.key]=Math.max(0,Number(p.index)||0);if(modal)showModal(modal.type,modal.p);const body=layer.querySelector('.modal-body');if(body)body.scrollTop=0;return;}
 if(id==='close')return closeModal();
 if(id==='audio-toggle'){const muted=!Sound.getPreferences().muted;Sound.setPreferences({muted});updateChrome();return;}
 if(id==='red-reveal-next')return revealNextRed();
 if(id==='summon-skip'||id==='reveal-all'){closeModal();return showModal('draw-results',{skip:true});}
 if(id==='enter'){if(!document.getElementById('accept-age')?.checked)return toast('请确认年满23岁。');if(recovery)s=E.createState(Date.now());recovery=null;return boot();}
 if(id==='new-game'){s=E.createState(Date.now());recovery=null;return boot();}
 if(id==='export-save')return exportSave();if(id==='import-save')return importPicker();if(id==='export-recovery'){let raw=recovery?.raw;try{raw=raw||localStorage.getItem(KEY+'-recovery');}catch(e){}if(raw){try{if(window.Native&&typeof window.Native.exportRecovery==='function')window.Native.exportRecovery(raw);else download(raw,'wendao-recovery.txt','text/plain');}catch(e){toast('恢复备份导出未成功，请重试。');}}return;}
 if(id==='dungeon-type'){uiState.dungeonType=p.id;return renderPage();}
 if(id==='ending-story'){uiState.sideTab='story';return navigate('fate');}
 if(id==='fate-tab'){uiState.sideTab=p.id;return renderPage();}
 if(id==='source'){if(p.type==='forge'){navigate('cave');return showModal('forge',{set:p.set,slot:p.slot,rarity:3});}if(p.id&&C.dungeons[p.id]){uiState.dungeonType=C.dungeons[p.id].type;navigate('adventure');return showModal('dungeon',{id:p.id,floor:p.floor});}uiState.dungeonType=p.type||'resource';return navigate('adventure');}
 if(id==='gear-change'){if(!C.slots[p.slot])return;uiState.gearSlot=p.slot;uiState.gearRarity=uiState.gearSet='all';uiState.modalPages.equipment=0;return showModal('equipment',{slot:p.slot});}
 if(id==='build-tab'){if(!['techniques','gear','goals'].includes(p.tab))return;uiState.buildTab=p.tab;return showModal('build-recommendations',modal?.p||{});}
 if(id==='gear-detail')return showModal('gear-detail',p);if(id==='tech-branch')return techBranch(p);
 return showModal(id,p);
}
document.addEventListener('pointerdown',()=>{pointerHeld=true;Sound?.unlock();},{passive:true});
document.addEventListener('pointerup',()=>{pointerHeld=false;});
document.addEventListener('pointercancel',()=>{pointerHeld=false;});
document.addEventListener('click',event=>{
 const b=event.target.closest('button');if(!b){if(event.target.classList.contains('modal-backdrop'))closeModal();return;}if(b.disabled)return;
 Sound?.unlock();if(b.dataset.ui||b.dataset.page)Sound?.play('ui');
 if(b.dataset.page)return navigate(b.dataset.page);
 let p={};try{p=JSON.parse(b.dataset.payload||'{}');}catch(e){return toast('参数无效。');}
 if(b.dataset.ui)return handleUi(b.dataset.ui,p);
 if(b.dataset.action){const type=b.dataset.action;return run(type,payload(type,p));}
});
function changeAudio(event){
 const id=event.target.id;if(!['audio-muted','audio-music','audio-effects'].includes(id))return false;
 const key=id.slice(6),value=key==='muted'?event.target.checked:Number(event.target.value)/100;Sound?.setPreferences({[key]:value});
 if(key!=='muted')text(id+'-output',Math.round(value*100)+'%');updateChrome();return true;
}
document.addEventListener('input',changeAudio);
document.addEventListener('change',event=>{
 if(changeAudio(event))return;
 const id=event.target.id;
 if(id==='resource-count'){uiState.resourceCount=Number(read(id));shopModal();}
 if((id==='reroll-target'||event.target.classList.contains('reroll-lock'))&&modal?.type==='reroll'){const uid=modal.p.uid,g=s.bag.find(x=>x.uid===uid),target=read('reroll-target'),locks=Array.from(document.querySelectorAll('.reroll-lock:checked')).map(x=>Number(x.value));text('reroll-live-cost','消耗：'+price(costing('rerollGear',{uid,target,locks})));const chance=locks.some(i=>g.affixes[i].id===target)?1:(g.affixes.length-locks.length)/(10-locks.length);text('reroll-live-odds','普通态目标出现概率 '+num(chance*100)+'%；第十次保证目标类型。数值范围按基础值的80%–120%随机。');}

 if(id==='pool-category'){uiState.poolCategory=read(id);poolModal();}
 if(id==='pool-rarity'){uiState.poolRarity=Number(read(id));poolModal();}
 if(id==='filter-tech-school'){uiState.techSchool=read(id);uiState.modalPages.techniques=0;techniquesModal();}
 if(id==='filter-tech-kind'){uiState.techKind=read(id);uiState.modalPages.techniques=0;techniquesModal();}
 if(id==='filter-gear-slot'){uiState.gearSlot=read(id);uiState.modalPages.equipment=0;equipmentModal();}
 if(id==='filter-gear-rarity'){uiState.gearRarity=read(id);uiState.modalPages.equipment=0;equipmentModal();}
 if(id==='filter-gear-set'){uiState.gearSet=read(id);uiState.modalPages.equipment=0;equipmentModal();}
 if(['dungeon-tier','dungeon-difficulty','dungeon-floor','dungeon-practice'].includes(id)&&uiState.selectedDungeon){const x=dungeonPreview({id:uiState.selectedDungeon,tier:Number(read('dungeon-tier')||s.paths[s.route].realm),difficulty:Number(read('dungeon-difficulty')||0),floor:Number(read('dungeon-floor')||1),practice:!!document.getElementById('dungeon-practice')?.checked});if(x)text('dungeon-live-preview',(x.practice?'试阵无奖励':'当前预览：'+price(x.rewards))+(x.requirements?' · '+(Array.isArray(x.requirements)?x.requirements.join('、'):x.requirements):''));}
 if(['forge-slot','forge-set','forge-rarity'].includes(id))updateForgePreview();
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!e.defaultPrevented)closeModal();else if(e.key==='Enter'||e.key===' ')Sound?.unlock();});
fileInput.addEventListener('change',async()=>{const f=fileInput.files?.[0];if(!f)return;try{if(f.size>MAX)return toast('存档超过1 MiB。');acceptImport(await f.text());}catch(e){toast('无法读取存档。');}finally{fileInput.value='';}});
function lifecycle(state){
 if(state==='pause')Sound?.pause();else Sound?.resume();
 if(!s||!mounted)return;if(state==='pause'){const before=JSON.stringify(s);try{E.advance(s,Date.now());if(s.battle)E.act(s,{type:'pauseBattle',paused:true},Date.now());if(!persist(s,true))s=JSON.parse(before);}catch(e){s=JSON.parse(before);}}
 else{lastFrame=lastPassive=Date.now();settle(true);renderEncounter();}
}
document.addEventListener('visibilitychange',()=>lifecycle(document.hidden?'pause':'resume'));
window.addEventListener('pagehide',()=>lifecycle('pause'));
window.onNativeLifecycle=lifecycle;window.onNativeImport=acceptImport;window.onNativeMessage=message=>toast(String(message));
window.onNativeBack=()=>{if(!mounted)return false;if(window.WendaoSelection?.hideDetail())return true;if(!layer.hidden){closeModal();return true;}if(s?.battle||s?.exploration){requestEncounterExit();return true;}if(page!=='cultivation'){navigate('cultivation');return true;}return false;};
window.Lingqi={state:()=>s?JSON.parse(JSON.stringify(s)):null,view:()=>s?currentView():null,act:(type,p)=>run(type,p||{}),navigate,showModal,save:()=>persist(s),import:acceptImport};
load();let age=false;try{age=localStorage.getItem(AGE)==='yes';}catch(e){}
if(!age)gate();else if(recovery)recoveryScreen();else boot();
})();
