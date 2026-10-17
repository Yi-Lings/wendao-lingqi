(function(root,factory){
 const node=typeof module==='object'&&module.exports;
 const api=factory(node?require('./data.js'):root.WendaoData,node?require('./story-scenes.js'):root.WendaoStoryScenes);
 if(node)module.exports=api;else root.WendaoInvestigation=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(C,N){
'use strict';
const copy=x=>JSON.parse(JSON.stringify(x)),own=(o,k)=>!!o&&Object.prototype.hasOwnProperty.call(o,k);
const cases={
 bell_flow:{id:'bell_flow',episode:'chapter_0',missionIndex:0,title:'雪下的热息',place:'青岚村 · 药圃',question:'村中热息为何在雪夜消失？找出两条能互相印证流向的证据。',source:'resource_herb',sourceLabel:'药谷取样',speaker:'qinglan',
  evidence:[...N.episodes.chapter_0.clues.map(c=>({id:c.id,title:c.label,text:c.text,origin:'现场亲见'})),
   {id:'surface_frost',title:'石阶上的薄霜',text:'背阴处结着薄霜，向阳处已融化。它能说明昨夜寒冷，却看不出热息去了哪里。',origin:'药圃补察'},
   {id:'old_ledger',title:'去年的采药簿',text:'旧簿记着往年霜期也会减产，但没有今年钟鸣、草叶倒伏或村屋失温的记录。',origin:'村中旧簿'}],
  hypotheses:[{id:'siphon',text:'汲灵回路将药圃与村屋的热息引向山顶'},{id:'weather',text:'只是寻常霜寒，钟片与枯草并无关联'},{id:'harvest',text:'往年采药过度，才让今年村屋失温'}],answer:['warm_shard','bent_herbs'],conclusion:'siphon',
  hint:'薄霜与旧簿只能说明背景。试着寻找同一方向、同一纹路的两条当下痕迹。',reason:'钟片向山上牵动，枯草也朝山顶倒伏；两者纹路相同，流向与回路互相印证。',response:'不是雪把村里的火吹灭了，是有人把热息引上了山。你把流向证清了，我便能沿着它护住回村的路。'},
 furnace_seal:{id:'furnace_seal',episode:'chapter_1',missionIndex:2,title:'封炉之后',place:'试剑台 · 公开验炉旁席',question:'赢得旁席后，核对封签与值炉记录：炉况究竟在哪一步发生了变化？',source:'arena_2',sourceLabel:'试剑决胜',speaker:'yueheng',
  evidence:[{id:'intact_seal',title:'封炉时的原签',text:'原签由两名值守共同落款：封炉时火候平稳，炉门完好。签上时刻早于试剑开场，蜡印与封存副本一致。',origin:'公开验炉 · 原件核对'},
   {id:'shift_log',title:'封签后的值炉簿',text:'值炉簿在封签之后记下一次增火，所用钥令已换作另一名值守。增火时刻晚于原签，早于炉内焦痕被发现。',origin:'公开验炉 · 当班记录'},
   {id:'old_matchmarks',title:'台沿的旧战痕',text:N.episodes.chapter_1.clues.find(c=>c.id==='old_matchmarks').text,origin:'试剑台亲见'},
   {id:'rival_rumour',title:'场外的传言',text:'有人把焦炉归咎于丹方，也有人埋怨试剑兵器。说话者未见过原炉，拿不出时刻与落款。',origin:'场外转述'}],
  hypotheses:[{id:'after_seal',text:'封炉后有人更换钥令增火，需追查当班交接'},{id:'recipe',text:'原丹方必有错误，封签后并无变化'},{id:'weapon',text:'试剑兵器的品质直接造成了焦炉'}],answer:['intact_seal','shift_log'],conclusion:'after_seal',
  hint:'战痕能解释比试，传言没有时刻。将封炉前后的原始记录排在一起，再核对钥令。',reason:'共同落款的原签确认封炉时正常，值炉簿则记录了封签后换令增火；变化发生在封炉之后。',response:'旁席是你赢来的，判断则由这两份记录撑住。先查封签后的钥令交接，再问是谁借丹方替自己遮掩。'}
};
function freeze(x){if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;}freeze(cases);
function active(s,c){const j=s.story.journeys?.[c.episode];return !!(j&&j.rulesVersion===3&&j.choice==='seek'&&j.stage==='mission'&&j.missionIndex===c.missionIndex);}
const sourceReady=(s,c)=>(s.progress.dungeonWins[c.source]||0)>0;
function view(s,id){const c=own(cases,id)?cases[id]:null;if(!c)return null;const note=s.investigations?.[id]||null;if(!active(s,c)&&!note)return null;return {case:c,note:note?copy(note):null,active:active(s,c),sourceReady:sourceReady(s,c),resolved:note?.status==='resolved',sourceNav:{page:'adventure',modal:'dungeon',payload:{id:c.source}},companion:C.companions[c.speaker].name};}
function validate(s){
 if(s.investigations===undefined)s.investigations={};
 const notes=s.investigations,fail=()=>{throw Error('证据札记记录无效');},obj=x=>x&&typeof x==='object'&&!Array.isArray(x),integer=(x,min,max)=>Number.isSafeInteger(x)&&x>=min&&x<=max;
 if(!obj(notes)||Object.keys(notes).length>2)fail();
 for(const [id,n]of Object.entries(notes)){
  if(!own(cases,id)||!obj(n))fail();const c=cases[id],j=s.story.journeys?.[c.episode];
  if(Object.keys(n).some(k=>!['status','read','selected','attempts','hypothesis','verdict','startedAt','resolvedAt'].includes(k)))fail();
  if(!['open','resolved'].includes(n.status)||!integer(n.attempts,0,100)||!integer(n.startedAt,0,8640000000000000))fail();
  for(const [key,max]of [['read',4],['selected',2]])if(!Array.isArray(n[key])||n[key].length>max||new Set(n[key]).size!==n[key].length||n[key].some(e=>!c.evidence.some(x=>x.id===e)))fail();
  if(n.selected.some(e=>!n.read.includes(e))||n.hypothesis!==null&&!c.hypotheses.some(h=>h.id===n.hypothesis)||!['resolved','contradiction',null].includes(n.verdict))fail();
  if(n.verdict===null&&n.hypothesis!==null)fail();
  if(!j||j.rulesVersion!==3||j.choice!=='seek'||j.missionIndex<c.missionIndex||['intro','survey','decision','reply'].includes(j.stage))fail();
  if(n.status==='open'){
   if(!active(s,c)||n.resolvedAt!==null||n.verdict==='resolved'||n.verdict==='contradiction'&&(!n.attempts||n.hypothesis===null||n.selected.length!==2||n.hypothesis===c.conclusion&&c.answer.every(x=>n.selected.includes(x))))fail();
  }else if(!integer(n.resolvedAt,n.startedAt,8640000000000000)||n.attempts<1||n.verdict!=='resolved'||n.hypothesis!==c.conclusion||n.selected.length!==2||!c.answer.every(x=>n.selected.includes(x))||!sourceReady(s,c))fail();
 }
 // A later story checkpoint cannot survive deleting its proof record on import.
 for(const c of Object.values(cases)){
  const j=s.story.journeys?.[c.episode];if(j?.rulesVersion!==3||j.choice!=='seek')continue;
  const passed=j.missionIndex>c.missionIndex||j.missionIndex===c.missionIndex&&['interlude','outro','ready','completed'].includes(j.stage);
  if(passed&&notes[c.id]?.status!=='resolved')fail();
  if(j.missionIndex===c.missionIndex&&j.baseline!==0)fail();
 }
}
function handle(s,a,now){
 if(!['beginInvestigation','readEvidence','selectEvidence','submitInvestigation'].includes(a.type))return null;
 const no=message=>({ok:false,message}),yes=(message,data={})=>({ok:true,message,data});
 const c=own(cases,a.id)?cases[a.id]:null;if(!c||!active(s,c))return no('请在对应求证约定中查阅证据');
 if(s.battle||s.exploration||s.joint||s.ritual&&s.ritual.phase!=='complete')return no('先结束当前历练、闭关或共修，再核验证据');
 let n=s.investigations[c.id];if(n?.status==='resolved')return no('这份判断已经入册，可以只读重看');
 if(a.type==='beginInvestigation'){
  if(n)return yes('回到未完的求证');
  s.investigations[c.id]={status:'open',read:c.evidence.filter(e=>s.story.journeys[c.episode].clues.includes(e.id)).map(e=>e.id),selected:[],attempts:0,hypothesis:null,verdict:null,startedAt:now,resolvedAt:null};return yes('把证据摊开，再作判断');
 }
 if(!n)return no('请先展开证据札记');
 if(a.type==='readEvidence'||a.type==='selectEvidence'){
  if(!c.evidence.some(e=>e.id===a.evidence))return no('这条证据不在札记中');
  if(a.type==='readEvidence'){if(!n.read.includes(a.evidence))n.read.push(a.evidence);return yes('已经核对这条证据');}
  if(!n.read.includes(a.evidence))return no('先阅读证据，再将它列入判断');
  if(n.selected.includes(a.evidence))n.selected=n.selected.filter(e=>e!==a.evidence);
  else{if(n.selected.length===2)return no('已有两条证据，请先撤下一条再更换');n.selected.push(a.evidence);}
  n.hypothesis=null;n.verdict=null;return yes('已更新相互印证的两条证据');
 }
 if(!sourceReady(s,c))return no('先完成'+c.sourceLabel+'；试阵记录不作为取证履历');
 if(n.selected.length!==2)return no('请先选择两条已经读过的证据');
 if(!c.hypotheses.some(h=>h.id===a.hypothesis))return no('请选择札记中的一个判断');
 n.attempts=Math.min(100,n.attempts+1);n.hypothesis=a.hypothesis;
 const correct=a.hypothesis===c.conclusion&&c.answer.every(e=>n.selected.includes(e));n.verdict=correct?'resolved':'contradiction';
 if(correct){n.status='resolved';n.resolvedAt=now;}
 return yes(correct?'判断已入册，同行者等你归来':c.hint,{correct,investigation:c.id});
}
return Object.freeze({cases,active,view,sourceReady,validate,handle});
});
