(function(root,factory){
  const api=factory(typeof module==='object'&&module.exports?require('./data.js'):root.WendaoData);
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.WendaoStoryScreen=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(C){
'use strict';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const payload=value=>esc(JSON.stringify(value||{}));
const act=(label,type,params,kind='primary',disabled=false)=>`<button type="button" class="narrative-button ${kind}" data-action="${esc(type)}" data-payload="${payload(params)}"${disabled?' disabled':''}>${esc(label)}</button>`;
const ui=(label,id,params,kind='quiet')=>`<button type="button" class="narrative-button ${kind}" data-ui="${esc(id)}" data-payload="${payload(params)}">${esc(label)}</button>`;
const safeFile=(file,fallback)=>typeof file==='string'&&/^[a-zA-Z0-9_.-]+\.png$/.test(file)?file:fallback;
const stageLabels={'not-started':'入境',intro:'相遇',survey:'探察',decision:'抉择',reply:'回应',mission:'践行',interlude:'途中',outro:'归来',ready:'收束',completed:'回忆'};
const companionNames={qinglan:'沈青岚',yueheng:'陆月衡',suyan:'闻素衍'};
function position(n,cols,rows){return n%cols*100/(cols-1)+'% '+Math.floor(n/cols)*100/(rows-1)+'%';}
function background(episode){
 const n=Math.max(0,Math.min(5,Number(episode.chapter??episode.chapterId??String(episode.id||'').replace('chapter_',''))||0));
 const supplied=episode.background||episode.art;
 const art={file:safeFile(typeof supplied==='string'?supplied:supplied?.file,'v3-chapter-atlas.png')};
 const cols=typeof supplied==='object'?Math.max(1,Math.min(12,Math.floor(Number(supplied.cols)||1))):art.file==='v3-chapter-atlas.png'?3:1;
 const rows=typeof supplied==='object'?Math.max(1,Math.min(12,Math.floor(Number(supplied.rows)||1))):art.file==='v3-chapter-atlas.png'?2:1;
 const col=typeof supplied==='object'?Math.max(0,Math.min(cols-1,Math.floor(Number(supplied.col)||0))):n%3;
 const row=typeof supplied==='object'?Math.max(0,Math.min(rows-1,Math.floor(Number(supplied.row)||0))):Math.floor(n/3);
 const atlas=cols>1||rows>1;
 const pos=(cols>1?col*100/(cols-1):50)+'% '+(rows>1?row*100/(rows-1):50)+'%';
 return `<div class="chapter-art narrative-backdrop story-backdrop" aria-hidden="true" style="background-image:url(assets/${art.file});background-size:${atlas?cols*100+'% '+rows*100+'%':'cover'};background-position:${atlas?pos:'center'}"></div>`;
}
function speakerView(line,state){
 const raw=line&&typeof line==='object'?line:{};
 const speaker=raw.speaker||'山海记';
 const id=typeof raw.portrait==='string'&&Object.hasOwn(companionNames,raw.portrait)?raw.portrait:Object.keys(companionNames).find(id=>speaker===id||speaker===companionNames[id]);
 const name=companionNames[speaker]||({narrator:'山海记',player:state.player?.name||state.name||'我'})[speaker]||speaker;
 if(!id)return {name,portrait:'<div class="narrative-narrator" aria-hidden="true">卷</div>'};
 const expressionNames={calm:0,thoughtful:1,worried:1,smile:2,joy:2,determined:3,serious:3};
 const emotion=raw.expression??raw.emotion??0;
 const row=typeof emotion==='number'?Math.max(0,Math.min(3,Math.floor(emotion))):expressionNames[emotion]??0;
 const col=Object.keys(companionNames).indexOf(id);
 return {name,portrait:`<div class="conversation-portrait narrative-portrait" role="img" aria-label="${esc(companionNames[id])}" style="background-image:url(assets/v3-hero-expressions.png);background-size:300% 400%;background-position:${col*50}% ${row*100/3}%"></div>`};
}
function rewardLine(reward){
 if(!reward||typeof reward!=='object')return '';
 const names={stones:'灵石',xp:'修为',tickets:'感应券',jade:'灵玉',dust:'天道尘'};
 const parts=[];
 for(const [id,n] of Object.entries(reward)){
  if(names[id]&&Number(n)>0)parts.push(names[id]+' '+n);
  else if(id==='materials')for(const [key,count] of Object.entries(n||{}))if(count>0)parts.push((C.materials[key]?.name||C.materials[key]||key)+' '+count);
  else if(Array.isArray(n))for(const key of n)parts.push(C.techniques[key]?.name||C.treasures[key]?.name||C.sets?.[key]?.name||key);
 }
 return parts.slice(0,4).join(' · ')+(parts.length>4?' · …':'');
}
function examined(entry,clue){return (entry?.clues||entry?.inspected||entry?.examined||[]).includes(clue.id);}
function missionView(view,episode){
 const mission=view.mission||{},goal=mission.goal;
 const text=typeof goal==='string'?goal:goal?.label||goal?.description||goal?.title||episode.mission?.label||episode.mission?.description||episode.goal||'循着线索，完成眼前的一件事';
 const current=Number(mission.current)||0,required=Math.max(0,Number(mission.required)||0);
 const total=Math.max(1,Number(mission.total)||1),index=Math.max(0,Number(mission.index)||0);
 return `<div class="story-objective" data-story-objective data-story-mission="${index}"><span class="narrative-overline">此刻要做${total>1?' · 第 '+(index+1)+' / '+total+' 幕':''}</span><strong>${esc(text)}</strong><div class="story-objective-progress"><span>${mission.done?'已践行':`进度 ${Math.min(current,required)} / ${required}`}</span><div role="progressbar" aria-label="当前剧情目标" aria-valuemin="0" aria-valuemax="${required}" aria-valuenow="${Math.min(current,required)}"><i style="width:${required?Math.min(100,current/required*100):0}%"></i></div></div></div>`;
}
function lineText(view,episode){
 const line=view.line;
 if(typeof line==='string')return line;
 if(line&&typeof line==='object')return line.text||line.body||'';
 if(view.completed)return episode.summary||episode.memory||episode.after||'此段经历已记入山海札记。再读时，你仍记得当初作出的决定。';
 if(view.stage==='not-started')return episode.teaser||episode.stakes||episode.description||episode.introduction||'循着远处的钟声，你来到这一段新的旅途。';
 if(view.stage==='mission')return '把刚才答应的事落到实处。回来时，同行者会在这里等你。';
 if(view.stage==='ready')return episode.after||'同行者记住了你的选择。把这一段经历记入札记，再继续上路。';
 return '风声渐歇，眼前的线索仍在等候你的回应。';
}
function footnote(view,episode){
 if(view.completed||view.stage==='completed')return '往事已经留存，重读不会再次领取奖励。';
 if(view.stage==='survey')return '轻触场景中的线索，听完它们留下的故事。';
 if(view.stage==='decision')return '同行者会记住这一次决定。';
 if(view.stage==='mission')return (view.requirements||[]).every(x=>x.done)?'完成当前约定后，回到此处继续对话。':'修行与约定一同前行；完整进度可在札记中查看。';
 if(view.stage==='ready')return rewardLine(episode.reward||episode.rewards)||'此卷经历已完整走过，收束后保留选择与进度。';
 return '阅读位置自动保留，随时可以离开再继续。';
}
function controls(view,episode,id){
 const params={episode:id},stage=view.stage;
 if(view.accessible===false)return ui('先回到眼前的旅途','story-exit',params,'primary');
 if(view.completed||stage==='completed')return ui('合上札记','story-exit',params,'primary');
 if(stage==='not-started')return act('走入这一幕','beginStory',params);
 if(stage==='decision'){
  const choices=episode.choices||{};
  return `<div class="story-decisions">${['protect','seek'].map(choice=>{
   const option=(Array.isArray(choices)?choices.find(option=>option.id===choice):choices[choice])||{};
   return act(typeof option==='string'?option:option.label||option.title||option.text||(choice==='protect'?'先守住眼前的人':'追查灾厄的源头'),'chooseStory',{episode:id,choice},choice==='protect'?'primary':'secondary');
  }).join('')}</div>`;
 }
 if(stage==='mission'){
  const done=view.mission?.canReturn??(!!view.mission?.done&&(view.requirements||[]).every(x=>x.done));
  return done?act('带着经历回来','advanceStory',params):ui('前往当前目标','story-mission',params,'primary');
 }
 if(stage==='ready')return /^chapter_\d+$/.test(id)?act('记下此卷 · 继续仙途','claimChapter',{choice:view.entry?.choice},'primary',!view.entry?.choice):act('记下这段经历','claimSidequest',{id});
 const clues=episode.clues||[],seen=clues.filter(clue=>examined(view.entry,clue)).length;
 return act(stage==='survey'?'整理发现，继续前行':stage==='outro'?'留住这一刻':'继续听下去','advanceStory',params,'primary',stage==='survey'&&seen<clues.length);
}
function render(state,view){
 view=view||{};
 const episode=view.episode&&typeof view.episode==='object'?view.episode:{};
 const id=String(episode.id||view.id||view.entry?.episode||'chapter_'+(state.story?.chapter||0));
 const stage=view.completed?'completed':view.stage||'not-started',entry=view.entry||{};
 const title=episode.title||episode.name||'山海旧事',location=episode.location?.name||episode.location||episode.place||'山海之间';
 const displayLine=typeof view.line==='object'?view.line:{};
 const speaker=speakerView(displayLine,state);
 const clues=episode.clues||[],seen=clues.filter(clue=>examined(entry,clue)).length;
 const weather=episode.atmosphere||episode.weather||'';
 const lineIndex=Math.max(0,Number(entry.line)||0);
 const params={episode:id};
 let world='';
 if(stage==='survey')world=`<div class="story-survey-caption"><span>${seen?'已记下 '+seen+' / '+clues.length+' 处线索':'风声里藏着两段未说尽的往事'}</span></div><div class="story-hotspots">${clues.map((clue,i)=>{
  const x=Number.isFinite(Number(clue.x))?Math.max(12,Math.min(88,Number(clue.x))):i%2?72:26,y=Number.isFinite(Number(clue.y))?Math.max(14,Math.min(86,Number(clue.y))):i%2?63:37;
  const label=clue.title||clue.label||clue.name||'遗留线索';
  return `<button type="button" class="story-hotspot ${examined(entry,clue)?'examined':''}" data-action="inspectStory" data-payload="${payload({episode:id,clue:clue.id})}" style="--hotspot-x:${x}%;--hotspot-y:${y}%" aria-label="调查${esc(label)}"><span class="story-hotspot-mark" aria-hidden="true">${examined(entry,clue)?'✓':'✧'}</span><span>${esc(label)}</span></button>`;
 }).join('')}</div>`;
 else if(stage==='mission')world=missionView(view,episode);
 else if(stage==='decision')world='<div class="story-moment"><span>有些决定，会成为此后前行的方向。</span></div>';
 else if(stage==='completed')world='<div class="story-moment story-memory"><span>山海依旧，往事长明</span></div>';
 else world=`<div class="story-atmosphere"><span>${esc(typeof weather==='string'?weather:weather.text||'')}</span></div>`;
 const inaccessible=view.accessible===false;
 const text=inaccessible?'这一幕仍在远处。先把当前旅途走完，新的相遇便会自然到来。':lineText({...view,stage},episode);
 return `<section class="narrative-screen story-screen" data-narrative="story" data-story-episode="${esc(id)}" data-story-stage="${esc(stage)}" aria-label="${esc(title)}">${background(episode)}<div class="narrative-shade" aria-hidden="true"></div><header class="narrative-hud"><div class="narrative-hud-copy"><span class="narrative-overline">${esc(location)} · ${esc(stageLabels[stage]||'同行')}</span><h1>${esc(title)}</h1></div><div class="narrative-tools">${ui('札记','story-journal',params)}${ui('暂别','story-exit',params)}</div></header><div class="story-world" aria-label="当前剧情场景">${world}</div><section class="narrative-dialogue" aria-live="polite" aria-atomic="true" data-story-line="${lineIndex}">${speaker.portrait}<div class="narrative-dialogue-copy"><div class="narrative-speaker"><strong>${esc(speaker.name)}</strong><span>${esc(stageLabels[stage]||'')} ${['intro','reply','interlude','outro'].includes(stage)?'· '+(lineIndex+1):''}</span></div><div class="narrative-paragraph"><p>${esc(text)}</p></div></div></section><footer class="narrative-footer"><p class="narrative-hint">${esc(footnote({...view,stage},episode))}</p><div class="narrative-actions">${controls({...view,stage},episode,id)}</div></footer></section>`;
}
return Object.freeze({render});
});
