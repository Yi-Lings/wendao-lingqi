(function(root,factory){
  const node=typeof module==='object'&&module.exports;
  const api=factory(node?require('./data.js'):root.WendaoData,node?require('./game-art.js'):root.WendaoGameArt,node?require('./art-identity.js'):root.WendaoArtIdentity);
  if(node)module.exports=api;else root.WendaoRitualScreen=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(C,G,I){
'use strict';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const payload=value=>esc(JSON.stringify(value||{}));
const act=(label,type,params={},kind='primary',disabled=false)=>`<button type="button" class="narrative-button ${kind}" data-action="${esc(type)}" data-payload="${payload(params)}"${disabled?' disabled':''}>${esc(label)}</button>`;
const ui=(label,id,params={},kind='quiet',disabled=false)=>`<button type="button" class="narrative-button ${kind}" data-ui="${esc(id)}" data-payload="${payload(params)}"${disabled?' disabled':''}>${esc(label)}</button>`;
const runeSymbols={wood:'木',fire:'火',earth:'土',metal:'金',water:'水',wind:'风'};
const breathingNames={inhale:'吸气',hold:'守息',exhale:'吐气'};
const stageNames={preparation:'备丹 · 养神',breath:'吐纳 · 归一',array:'布阵 · 护脉',heart:'问心 · 明志',trial:'入劫 · 自证',ready:'归元 · 破境',complete:'道途 · 长明'};
function itemArt(kind,id){
 const art=kind==='pill'?G.pill(id):G.utility(id);if(!art)return '';
 const identity=I.decorate(art);
 return `<span class="item-icon art-icon ritual-item-art ${identity.className}" ${identity.attrs} style="${identity.style}background-image:url(assets/${art.file});background-size:${art.size};background-position:${art.position}" role="img" aria-label="${esc(art.name||id)}"></span>`;
}
function preparation(view,route){
 const pill=view.mandatoryPill||{},requirements=view.requirements||[];
 const materials=requirements.filter(x=>x.kind!=='pill');
 const missing=materials.filter(x=>Number(x.deficit)>0);
 const ready=Number(pill.owned)>=Number(pill.count||1);
 return `<div class="ritual-preparation"><div class="ritual-pill-plinth">${itemArt('pill',pill.id)}<div><span class="narrative-overline">破境主药 · 必须备齐</span><h2>${esc(pill.name||'破境灵丹')}</h2><p>${pill.reserved?'已封存于本次仪式':`需要 ${Number(pill.count)||1} 枚 · 已备 ${Number(pill.owned)||0} 枚`}</p></div>${ready||pill.reserved?'<span class="ritual-check done" aria-label="已备齐">✓</span>':ui('去备丹','ritual-acquire',{route,id:pill.id,kind:'pill',source:'furnace'},'secondary ritual-pill-acquire')}</div><p class="ritual-preparation-lore">${esc(view.preparationText||'丹药护住经脉，阵材稳住灵息。先把退路和准备做足，再走向新的境界。')}</p><div class="ritual-materials" aria-label="破境阵材">${materials.map(req=>`<div class="ritual-material ${req.deficit>0?'missing':'done'}" data-ritual-material="${esc(req.id)}">${itemArt('material',req.id)}<span><strong>${esc(req.name||req.id)}</strong><small>${Number(req.owned)||0} / ${Number(req.required)||0}</small></span>${req.deficit>0?ui('去获取','ritual-acquire',{route,id:req.id,kind:'material',source:req.source}):'<span class="ritual-material-check" aria-label="材料齐备">✓</span>'}</div>`).join('')}</div><div class="ritual-preparation-links">${!ready&&!pill.reserved?ui(pill.learned?'前往丹房 · 炼制主药':'前往丹房 · 研习丹方','ritual-acquire',{route,id:pill.id,kind:'pill',source:'furnace'},'secondary'):''}${missing.length?'<span>材料来源已标注，获取后可回到此处。</span>':''}</div></div>`;
}
function sequence(view){
 const symbols=view.stage==='breath'?['inhale','hold','exhale']:Array.isArray(view.sequence)?view.sequence:[];
 const current=Math.max(0,Number(view.step)||0);
 const labels=view.stage==='breath'?['吸气','守息','吐气']:view.sequenceLabels||[];
 return `<div class="ritual-sequence" aria-label="仪式节律">${symbols.map((symbol,index)=>`<span class="${index<current?'done':index===current?'current':'pending'}"${index===current?' aria-current="step"':''}><i>${index<current?'✓':view.stage==='array'?runeSymbols[symbol]||symbol:index+1}</i><small>${esc(labels[index]||breathingNames[symbol]||runeSymbols[symbol]||symbol)}</small></span>`).join('')}</div>`;
}
function altar(view){
 const stage=view.stage,expected=view.cue?.expected||'';
 const sigil=stage==='breath'?breathingNames[expected]||'息':stage==='array'?runeSymbols[expected]||'阵':stage==='heart'?'心':stage==='trial'?'劫':stage==='ready'?'成':'道';
 return `<div class="ritual-altar ${esc(stage)}" data-ritual-cue="${esc(expected)}"><div class="ritual-circle outer" aria-hidden="true"></div><div class="ritual-circle middle" aria-hidden="true"></div><div class="ritual-circle inner" aria-hidden="true"></div><div class="ritual-axis" aria-hidden="true"></div><div class="ritual-sigil"><span>${esc(sigil)}</span><small>${esc(view.cue?.title||stageNames[stage]||'守住本心')}</small></div><div class="ritual-wisps" aria-hidden="true"><i></i><i></i><i></i><i></i></div></div>${['breath','array'].includes(stage)?sequence(view):''}`;
}
function dialogue(view){
 const list=view.narration||view.introduction||[];
 const lines=Array.isArray(list)?list:[list];
 let text=view.cue?.text||lines[0]||'收拢心神，倾听灵息在经脉间流动。';
 if(view.stage==='preparation'&&!view.fullCultivation)text='当前境界尚未圆满。先稳稳修炼到十层圆满，再以主药与阵材护住这次蜕变。';
 const responses=Array.isArray(view.heartResponse)?view.heartResponse:[];
 const paragraphs=view.stage==='heart'&&view.heartChoice?responses.length?responses:lines:['ready','complete'].includes(view.stage)&&lines.length?[...lines,text]:[text];
 return `<section class="narrative-dialogue ritual-dialogue" aria-live="polite" aria-atomic="true"><div class="narrative-narrator ritual-narrator" aria-hidden="true">${view.stage==='heart'?'心':'息'}</div><div class="narrative-dialogue-copy"><div class="narrative-speaker"><strong>${view.stage==='heart'?'心中回声':view.stage==='preparation'?'陆月衡 · 丹道指引':'护道札记'}</strong><span>${esc(stageNames[view.stage]||'修行')}</span></div><div class="narrative-paragraph">${paragraphs.map(line=>`<p>${esc(typeof line==='string'?line:line.text||'')}</p>`).join('')}</div></div></section>`;
}
function choices(view,route){
 const stage=view.stage,options=view.choices||[],expected=view.cue?.expected;
 if(stage==='preparation')return act('丹材俱备 · 静坐入境','beginRitual',{route},'primary',!view.canBegin);
 if(stage==='breath'||stage==='array'){
  const type=stage==='breath'?'ritualBreath':'ritualRune';
   return `<div class="ritual-choices ${stage==='array'?'rune-choices':'breath-choices'}">${options.map(option=>act(option.label||breathingNames[option.id]||runeSymbols[option.id]||option.id,type,{choice:option.id},option.id===expected?'primary ritual-expected':'secondary',!!view.busy)).join('')}</div>`;
 }
 if(stage==='heart'){
  if(view.heartChoice)return act('把这份回答带入试炼','continueRitual',{},'primary',view.canContinue===false);
  return `<div class="ritual-heart-choices">${options.map(option=>`<button type="button" class="narrative-button secondary" data-action="ritualResolve" data-payload="${payload({choice:option.id})}"><strong>${esc(option.label||option.id)}</strong><small>${esc(option.description||'')}</small></button>`).join('')}</div>`;
 }
 if(stage==='trial')return ui(view.trialAttempts>0?'再次入劫 · 稳住阵心':'走入护道试炼','ritual-trial',{route},'primary',view.canTrial===false);
 if(stage==='ready')return view.terminal?act('自证大道 · 留下道誓','finishRitual',{},'primary',!view.canFinish):act('归元破境','breakthrough',{},'primary',!view.canBreakthrough);
 return ui('回到洞府 · 继续修行','ritual-exit',{route},'primary');
}
function hint(view){
 if(view.stage==='preparation')return view.canBegin?'主药与阵材已经备齐。开始后会封存准备，进度可随时续上。':!view.fullCultivation?'先到十层圆满；主药与阵材可提前准备。':'缺少的主药或阵材均有获取指引。';
 if(view.stage==='breath')return '依照灵息提示吐纳，失误时可以调整，无须抢拍。';
 if(view.stage==='array')return '观察正在发亮的阵纹，再引入对应灵息。';
 if(view.stage==='heart')return '你的回答来自一路经历，并会留在这次破境的道誓里。';
 if(view.stage==='trial')return '丹药与仪式已为你护道；试炼失败可以重试，不重复扣材料。';
 if(view.stage==='ready')return view.legacyReady?'原有试炼胜利已承接，确认后稳固新境界。':'丹材已在入静时封存，确认破境不会再次扣除。';
 return '新境界已稳固，下一段仙途从这里继续。';
}
function progress(view){
 const stages=['preparation','breath','array','heart','trial','ready'];
 const active=view.stage==='complete'?stages.length:Math.max(0,stages.indexOf(view.stage));
 return `<nav class="ritual-step-track" aria-label="破境流程">${stages.map((stage,index)=>`<span class="${index<active?'done':index===active?'active':'pending'}"${index===active?' aria-current="step"':''}><i>${index<active?'✓':index+1}</i><small>${['备丹','吐纳','护脉','问心','入劫','破境'][index]}</small></span>`).join('')}</nav>`;
}
function render(state,view){
 view=view||{};
 const route=view.route||state.route||'magic',stage=view.stage||'preparation';
 const v={...view,stage};
 const title=view.title||'护道破境',subtitle=view.subtitle||C.routes[route]?.name||'静室护道';
 const backgroundArt={file:typeof view.background==='string'&&/^[a-zA-Z0-9_.-]+\.png$/.test(view.background)?view.background:'v3-world.png'};
 const memory=view.chapterMemory;
 return `<section class="narrative-screen ritual-screen" data-narrative="ritual" data-ritual-stage="${esc(stage)}" data-ritual-route="${esc(route)}" aria-label="${esc(title)}"><div class="narrative-backdrop ritual-backdrop" aria-hidden="true" style="background-image:url(assets/${backgroundArt.file});background-size:cover;background-position:center"></div><div class="narrative-shade ritual-shade" aria-hidden="true"></div><header class="narrative-hud"><div class="narrative-hud-copy"><span class="narrative-overline">${esc(subtitle)} · ${esc(stageNames[stage])}</span><h1>${esc(title)}</h1></div><div class="narrative-tools">${ui('暂歇','ritual-exit',{route})}</div></header><div class="ritual-world">${stage==='preparation'?preparation(v,route):altar(v)}${memory&&stage==='heart'?`<p class="ritual-chapter-memory">${esc(typeof memory==='string'?memory:memory.text||'')}</p>`:''}</div>${dialogue(v)}<footer class="narrative-footer ritual-footer">${progress(v)}<p class="narrative-hint">${esc(hint(v))}</p><div class="narrative-actions">${choices(v,route)}</div>${!['preparation','complete'].includes(stage)?`<div class="ritual-cancel">${act('收阵 · 取回封存丹材','cancelRitual',{},'quiet')}</div>`:''}</footer></section>`;
}
return Object.freeze({render});
});
