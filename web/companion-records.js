(function(root,factory){
 const node=typeof module==='object'&&module.exports;
 const api=factory(node?require('./data.js'):root.WendaoData,node?require('./story-scenes.js'):root.WendaoStoryScenes,node?require('./story.js'):root.WendaoStory,node?require('./scene-art.js'):root.WendaoSceneArt);
 if(node)module.exports=api;else root.WendaoCompanionRecords=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(C,N,S,A){
'use strict';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const payload=x=>esc(JSON.stringify(x));
const descriptions=Object.freeze({
 qinglan:'她记得巡山路上的每一个岔口，也记得哪些人还没有回来。剑是她的手段，回村的灯才是她总要检查的事。',
 yueheng:'他习惯把药簿摊在灯下，让材料、火候与救治时辰都可以核对。医者的疲惫无需藏起，下一炉药也不该靠谁独自撑住。',
 suyan:'她绘阵时总会多看一次出口。记载中的缺页、被凿掉的阵口和没有署名的人，都值得留一处能再问下去的空白。'
});
function view(s,id){
 if(!Object.hasOwn(C.companions,id))return null;
 const person=C.companions[id],relationship=s.companions[id];
 const episodes=Object.values(N.episodes).filter(e=>e.cast?.includes(id));
 const memories=episodes.map(e=>{const replay=S.replayView(s,e.id);return replay?{id:e.id,title:e.title,legacy:!!replay.legacy}:null;}).filter(Boolean);
 const current=episodes.map(e=>S.journeyView(s,e.id)).find(j=>j?.accessible&&!j.completed);
 return {id,name:person.name,role:person.role,age:person.age,quote:person.quote,description:descriptions[id],art:A.companions[id],affinity:relationship.affinity,bond:relationship.bond,memories,current:current?{id:current.episode.id,title:current.episode.title,started:current.stage!=='not-started'}:null};
}
function render(s,id){
 const v=view(s,id);if(!v)return '';
 const memories=v.memories.map(m=>`<button type="button" class="btn secondary" data-ui="story-memory" data-payload="${payload({episode:m.id})}"><span>${esc(m.title)}</span><small>重读已留存的故事</small></button>`).join('');
 const next=v.current?`<div class="companion-next"><p>仍在路上 · ${esc(v.current.title)}</p><button type="button" class="btn primary" data-ui="story-open" data-payload="${payload({episode:v.current.id})}">${v.current.started?'继续同行':'走入这一卷'}</button></div>`:'';
 return `<article class="companion-record" data-companion-record="${id}">${A.render(v.art,v.name+' · '+v.role,'companion-record-art')}<div class="companion-record-copy"><p class="eyebrow">${esc(v.role)} · ${v.age} 岁</p><h3>${esc(v.name)}</h3><blockquote>${esc(v.quote)}</blockquote><p>${esc(v.description)}</p><p class="muted">好感 ${v.affinity} / 100 · ${v.bond?'已结同道之契':'同行相识'}</p></div>${next}<section class="companion-memory"><h3>一同走过</h3>${memories?`<div class="companion-memory-list">${memories}</div>`:'<p class="muted">尚无已完成的相关故事。眼前的相遇，等你亲自走完。</p>'}<p class="tiny muted">仅列出实际完成的篇章；旧档缺失的选择由全文页明确标记，不补写经历。</p></section></article>`;
}
return Object.freeze({view,render});
});
