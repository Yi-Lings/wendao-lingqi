(function(root,factory){
  const node=typeof module==='object'&&module.exports;
  const api=factory(node?require('./data.js'):root.WendaoData,node?require('./ascension-scenes.js'):root.WendaoAscensionScenes,node?require('./mentor-art.js'):root.WendaoMentorArt);
  if(node)module.exports=api;else root.WendaoAscensionScreen=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(C,N,M){
'use strict';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const payload=value=>esc(JSON.stringify(value||{}));
const amount=value=>Number.isSafeInteger(value)&&value>=0?value:0;
const act=(label,type,params={},disabled=false,kind='primary')=>`<button type="button" class="narrative-button ${kind}" data-action="${esc(type)}" data-payload="${payload(params)}"${disabled?' disabled':''}>${esc(label)}</button>`;
const ui=(label,id,params={},kind='quiet',disabled=false)=>`<button type="button" class="narrative-button ${kind}" data-ui="${esc(id)}" data-payload="${payload(params)}"${disabled?' disabled':''}>${esc(label)}</button>`;
const stageNames={preparation:'人界归来',invitation:'天门来信',vow:'为道立誓',condense:'凝道开门',trial:'天门自证',return:'越过云海',ready:'升仙落定',ascended:'仙界修行'};
const companionNames={qinglan:'沈青岚',yueheng:'陆月衡',suyan:'闻素衍'};
function owned(s,id,kind){if(kind==='materials'||kind==='pills')return amount(s[kind]?.[id]);if(id==='yuan')return amount(s.ascension?.yuan);return amount(s[id]);}
function costRows(s,cost){
 const rows=[];if(!cost||typeof cost!=='object')return rows;
 const names={stones:'灵石',tickets:'感应券',jade:'灵玉',dust:'天道尘',yuan:'仙元'};
 for(const [id,count] of Object.entries(cost)){
  if(['materials','pills'].includes(id)&&count&&typeof count==='object')for(const [key,q] of Object.entries(count)){
   if(amount(q)>0)rows.push({id:key,kind:id,name:(id==='materials'?C.materials[key]?.name:C.recipes[key]?.name)||key,required:amount(q),owned:owned(s,key,id)});
  }
  else if(names[id]&&amount(count)>0)rows.push({id,kind:'currency',name:names[id],required:amount(count),owned:owned(s,id)});
 }
 return rows;
}
function costList(s,cost){return costRows(s,cost).map(row=>`<li class="${row.owned<row.required?'missing':''}" data-ascension-cost="${esc(row.id)}">${esc(row.name)} ${row.required} <span>（已有 ${row.owned}）</span></li>`).join('');}
function costPanel(s,cost,title,explanation){
 const rows=costRows(s,cost),missing=rows.filter(row=>row.owned<row.required);
 if(!rows.length)return '';
 const material=missing.find(row=>row.kind==='materials');
 return `<section class="ascension-cost" aria-label="${esc(title)}"><h2>${esc(title)}</h2><ul>${costList(s,cost)}</ul><div class="ascension-source-link"><p>${esc(explanation)}</p>${material?ui('材料去处','ascension-source',{id:material.id,kind:'material'},'quiet'):''}</div></section>`;
}
function requirementPanel(v){
 const rows=v.requirements||[];if(!rows.length)return '';
 return `<div class="ascension-requirements" aria-label="飞升准备">${rows.map(row=>`<div class="ascension-requirement ${row.done?'done':'missing'}"><div><strong>${esc(row.label)}</strong><small>${amount(row.current)} / ${amount(row.required)}</small></div><span aria-label="${row.done?'已完成':'尚待修行'}">${row.done?'✓':'待'}</span></div>`).join('')}</div>`;
}
function speaker(line,s){
 const entry=typeof line==='object'&&line?line:{text:typeof line==='string'?line:''};
 const art=M?.portrait(entry.speaker,entry.expression??entry.emotion??0);
 if(art)return {name:art.name,portrait:`<div class="conversation-portrait narrative-portrait ascension-mentor-portrait" data-mentor-speaker="${esc(art.speakerId)}" data-mentor-expression="${art.expression}" data-art-crop="${art.crop.join(',')}" role="img" aria-label="${esc(art.name+' · '+art.expressionName)}" style="background-image:url(assets/${art.file});background-size:${art.size};background-position:${art.position}"></div>`,text:entry.text||''};
 const name=companionNames[entry.speaker]||({narrator:'天门札记',player:s.player?.name||'我'})[entry.speaker]||entry.speaker||'天门札记';
 const id=Object.hasOwn(companionNames,entry.speaker)?entry.speaker:Object.keys(companionNames).find(id=>companionNames[id]===entry.speaker);
 if(!id)return {name,portrait:'<div class="narrative-narrator" aria-hidden="true">天</div>',text:entry.text||''};
 const expressions={calm:0,thoughtful:1,worried:1,smile:2,joy:2,determined:3,serious:3},raw=entry.expression??entry.emotion??0;
 const row=typeof raw==='number'?Math.max(0,Math.min(3,Math.floor(raw))):expressions[raw]??0,col=Object.keys(companionNames).indexOf(id);
 return {name,portrait:`<div class="conversation-portrait narrative-portrait" role="img" aria-label="${esc(companionNames[id])}" style="background-image:url(assets/v3-hero-expressions.png);background-size:300% 400%;background-position:${col*50}% ${row*100/3}%"></div>`,text:entry.text||''};
}
function sky(v){
 const name=v.stage==='ascended'?v.realmName||v.current||'登仙':'天门';
 const description=v.stage==='ascended'?v.realmNarrative?.title||'新境界、新的同路人，也有需要亲手完成的事':v.stage==='trial'?'灯火在身后，答案要亲手走到门前':v.stage==='return'||v.stage==='ready'?'越过云海，也把来处带在身边':'山海尽头，天门并不替你选择道途';
 return `<div class="ascension-sky" aria-label="${esc(name)}"><div class="ascension-gate-ring" aria-hidden="true"></div><div class="ascension-gate" aria-hidden="true"></div><div class="ascension-stair" aria-hidden="true"></div><div class="ascension-light" aria-hidden="true"></div><div class="ascension-sky-inscription"><strong>${esc(name)}</strong><small>${esc(description)}</small></div><div class="ascension-particles" aria-hidden="true">${Array.from({length:12},(_,n)=>`<i style="--particle-x:${10+n*7}%;--particle-delay:${n%4*.13}s"></i>`).join('')}</div></div>`;
}
function roadmap(v){
 const realms=v.realms||N?.realms||[];
 return `<div class="celestial-roadmap" aria-label="仙界三阶">${realms.map((realm,index)=>`<span class="${index===v.realm?'current':index<v.realm?'done':'pending'}"${index===v.realm?' aria-current="step"':''}>${esc(realm.name)}</span>`).join('')}</div>`;
}
function celestialProgress(s,v){
 const xp=amount(v.xp),needed=Math.max(1,amount(v.xpNeeded)),percent=Math.max(0,Math.min(100,xp/needed*100));
 const trainingCost=costRows(s,v.meditationCost).map(row=>`<li class="${row.owned<row.required?'missing':''}" title="${esc(row.name)}已有 ${row.owned}" aria-label="${esc(row.name)}需 ${row.required}，已有 ${row.owned}">${esc(row.name)} ${row.required}${row.owned<row.required?'（缺 '+(row.required-row.owned)+'）':''}</li>`).join('');
 return `<section class="celestial-progress" aria-label="仙界修为"><div class="celestial-progress-top"><strong>${esc(v.realmLabel||v.realmName+' · '+amount(v.layer)+'层')}</strong><span>仙元 ${amount(v.yuan)}</span></div><div class="celestial-xp-bar" role="progressbar" aria-label="本层仙界修为" aria-valuemin="0" aria-valuemax="${needed}" aria-valuenow="${Math.min(xp,needed)}" style="--celestial-xp:${percent}%"><i></i></div><p>本层修为 ${xp} / ${needed}${amount(v.reserve)?' · 储备 '+amount(v.reserve):''}</p><ul class="celestial-training-cost" aria-label="静修一周天实际投入">${trainingCost}</ul></section>`;
}
function challenges(s,v){
 const entries=v.challenges||[];if(!entries.length)return '';
 return `<div class="celestial-challenges" aria-label="当前仙界挑战">${entries.map(challenge=>{
  const dungeon=C.dungeons[challenge.id]||{},kind=challenge.kind==='hunt'?'历练猎场':challenge.id==='heaven_gate'?'天门自证':'本阶道劫';
  const cost=costRows(s,challenge.cost).map(row=>row.name+' '+row.required).join(' · ');
  return `<article class="celestial-challenge" data-celestial-challenge="${esc(challenge.id)}"><div class="celestial-challenge-head"><h2>${esc(challenge.name||dungeon.name||challenge.id)}</h2><span>${esc(kind)}</span></div><p>${esc(challenge.reason||dungeon.description||'亲自进入独立战场，检验当前的准备与道心。')}</p><div class="celestial-challenge-footer"><small>${cost?'入场实际消耗：'+esc(cost):'入场不额外扣费'}${challenge.rewardSummary?' · '+esc(challenge.rewardSummary):''}</small>${ui(challenge.allowed?'亲自入阵':'准备尚未完成','ascension-challenge',{id:challenge.id},'secondary',!challenge.allowed)}</div></article>`;
 }).join('')}</div>${entries.length>1?'<p class="celestial-challenge-note">左右轻滑，选择历练猎场或本阶道劫。</p>':''}`;
}
function celestialLetters(s,v){
 const narrative=v.realmNarrative;if(!narrative||!Array.isArray(narrative.arrival)||!narrative.arrival.length)return '';
 const sections=[['arrival','初入此境 · 同行者来信']];
 if(narrative.unlockedSections?.includes('trial'))sections.push(['trial','道劫之前 · 护道叮咛']);
 if(narrative.unlockedSections?.includes('after'))sections.push(['after','道劫之后 · 归途回响']);
 return `<div class="celestial-letters">${sections.map(([id,title])=>`<details><summary>${esc(title)}</summary><div>${(narrative[id]||[]).map(line=>`<p><strong>${esc(speaker(line,s).name)}</strong><span>${esc(line.text||'')}</span></p>`).join('')}</div></details>`).join('')}</div>`;
}
function dialogue(s,v){
 let raw=v.line;
 if(!raw)raw={speaker:'narrator',text:v.stage==='ascended'?v.realmNarrative?.currentSummary||v.realmNarrative?.description||'天門之外的仙界并非修行的句点。继续凝炼仙元、修满当前小层，并亲自走过本阶的历练与道劫。':v.stage==='preparation'?'六境走过的每一次选择都在身后留下灯火。先完成自己的道途，把终境圆满与主线的经历带到天门，再决定如何踏进新的世界。':'循着眼前的声音继续。阅读位置与已经完成的准备都会保存。'};
 const talk=speaker(raw,s);
 return `<section class="narrative-dialogue ascension-dialogue" aria-live="polite" aria-atomic="true">${talk.portrait}<div class="narrative-dialogue-copy"><div class="narrative-speaker"><strong>${esc(talk.name)}</strong><span>${esc(stageNames[v.stage]||'仙途')}</span></div><div class="narrative-paragraph"><p>${esc(talk.text)}</p></div></div></section>`;
}
function controls(s,v){
 if(v.stage==='preparation')return act('赴天门 · 读来信','beginAscension',{},!v.canBegin);
 if(v.stage==='vow'&&!s.ascension?.choice)return `<div class="ascension-choices">${(v.choices||[]).map(choice=>`<button type="button" class="narrative-button secondary" data-action="chooseAscension" data-payload="${payload({choice:choice.id})}"><strong>${esc(choice.label)}</strong><small>${esc(choice.text)}</small></button>`).join('')}</div>`;
 if(v.stage==='ready')return act('飞升仙界 · 留下人界灯火','completeAscension',{},!v.canComplete);
 if(v.stage==='ascended'){
  const canLevel=!!v.canLevelUp,canBreak=!!v.canBreakthrough;
  const restingLabel=v.perfected?'道心已凝 · 金仙圆满':amount(v.layer)===10?v.trialFresh?'备齐阵材再凝道':v.realmFull?'先完成本阶道劫':'修满十层后入劫':'修满后晋升小层';
  return act('凝炼仙元 · 静修一周天','celestialMeditate',{count:1},!v.canMeditate,'secondary')+(canLevel?act('晋升下一小层','advanceCelestial',{},false):canBreak?act(amount(v.realm)===2?'自证金仙圆满':'凝定下一仙阶','celestialBreakthrough',{},false):act(restingLabel,'advanceCelestial',{},true));
 }
 return act(v.advanceLabel||'继续听下去','advanceAscension',{},!v.canAdvance);
}
function hint(v){
 if(v.stage==='preparation')return v.canBegin?'人界经历与终境圆满已经准备妥当。天门的来信在等你。':'先完成下方真实目标；飞升会延续原有角色、配装与故事。';
 if(v.stage==='vow')return '道誓会留下回应，也会陪你进入之后的仙界故事。';
 if(v.stage==='condense')return '读完凝道指引后再投入阵材；材料不足时可暂歇获取，阅读进度保留。';
 if(v.stage==='trial')return '守门自证在独立战场进行；完成之后回到这里，读完飞升回应。';
 if(v.stage==='return'||v.stage==='ready')return '越过天门的回响会写进来处，真正飞升后开启仙界三阶修炼。';
 if(v.stage==='ascended')return amount(v.realm)===2&&amount(v.layer)===10?'金仙道劫与当地历练仍可继续；修为与仙元均按真实行动保存。':'静修凝炼、逐层晋升、历练准备，再亲自通过当前仙阶道劫。';
 return '阅读与准备自动保存；不用一次走完全部仙途。';
}
function render(s,view){
 const v={...(view||{}),stage:view?.stage||'preparation'},celestial=v.stage==='ascended';
 const title=celestial?(v.realmNarrative?.title||'仙界 · '+(v.realmName||'登仙')):'云海天门 · 飞升';
 const backgroundArt={file:typeof v.background==='string'&&/^[a-zA-Z0-9_.-]+\.png$/.test(v.background)?v.background:'story-heaven.png'};
 const finalRealm=amount(v.realm)===2;
 const breakthroughTitle=finalRealm?'金仙圆满的实际投入':'凝定下一仙阶的实际投入';
 const breakthroughExplanation=finalRealm?'本阶道劫已经完成；确认后扣除阵材，落定金仙圆满。':'本阶道劫已经完成；确认后扣除这些材料，进入新的仙阶。';
 const body=celestial?`${roadmap(v)}${celestialProgress(s,v)}<div class="ascension-panel">${challenges(s,v)}${v.realmFull&&v.trialFresh&&!v.perfected?costPanel(s,v.breakthroughCost,breakthroughTitle,breakthroughExplanation):''}${celestialLetters(s,v)}</div>`:`<div class="ascension-panel">${['preparation','invitation','condense'].includes(v.stage)?costPanel(s,v.preparationCost,'凝道入天门 · 阵材准备','阵材只在凝道读完并确认入劫时投入；先看清费用与缺口。'):''}${v.stage==='preparation'?requirementPanel(v):v.stage==='trial'?challenges(s,v):''}</div>`;
 return `<section class="narrative-screen ascension-screen" data-narrative="ascension" data-ascension-stage="${esc(v.stage)}" data-celestial-realm="${amount(v.realm)}" aria-label="${esc(title)}"><div class="narrative-backdrop ascension-backdrop" aria-hidden="true" style="background-image:url(assets/${backgroundArt.file})"></div><div class="narrative-shade ascension-shade" aria-hidden="true"></div><header class="narrative-hud"><div class="narrative-hud-copy"><span class="narrative-overline">${esc(stageNames[v.stage])} · ${celestial?'仙界三阶':'人界六境之后'}</span><h1>${esc(title)}</h1></div><div class="narrative-tools">${ui('暂歇','ascension-exit')}</div></header><div class="ascension-world">${sky(v)}${body}</div>${dialogue(s,v)}<footer class="narrative-footer ascension-footer"><p class="narrative-hint">${esc(hint(v))}</p><div class="narrative-actions">${controls(s,v)}</div></footer></section>`;
}
return Object.freeze({render});
});
