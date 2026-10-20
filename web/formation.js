(function(root,factory){const node=typeof module==='object'&&module.exports,api=factory(node?require('./data.js'):root.WendaoData);if(node)module.exports=api;else root.WendaoFormation=api;})(typeof globalThis!=='undefined'?globalThis:this,function(C){
'use strict';
const own=(o,k)=>!!o&&Object.prototype.hasOwnProperty.call(o,k),copy=x=>JSON.parse(JSON.stringify(x));
const directions=['北','东','南','西'],opposite=d=>(d+2)%4;
function neighbor(i,d){const row=Math.floor(i/3),col=i%3;return d===0?(row?i-3:null):d===1?(col<2?i+1:null):d===2?(row<2?i+3:null):(col?i-1:null);}
function toward(a,b){for(let d=0;d<4;d++)if(neighbor(a,d)===b)return d;throw Error('阵石路线不相邻');}
function tiles(path,source,sink,labels){return Array.from({length:9},(_,i)=>{const n=path.indexOf(i);if(n<0)return null;return {label:labels[n],ports:[n?toward(i,path[n-1]):source.dir,n<path.length-1?toward(i,path[n+1]):sink.dir]};});}
const catalog={
 village_lamp:{id:'village_lamp',episode:'chapter_0',choice:'protect',missionIndex:0,title:'雪夜接脉',place:'青岚村 · 回村护灯阵',art:'v9-snow-village.png',source:'resource_herb',sourceLabel:'青岚灵圃正式取药',sourcePort:{tile:3,dir:3},sinkPort:{tile:5,dir:1},path:[3,0,1,4,7,8,5],labels:['承泉','引息','温药','缓流','退口','护灯','回村'],initial:[1,3,0,2,1,2,0,3,1],targets:[1,4,7],brief:'药叶还在，旧护阵却把热息送错了方向。接通来息、温药与退口，让回村的灯留在村里。',rule:'灵泉由左侧进入，沿铜槽经过「温药」「缓流」「退口」，从右侧回村。每块阵石都可正转或逆转，断口必须相接。',speaker:'qinglan',response:'这回暖意没有被引上山，回村的路也没有封死。药材交给我，你把每一处阵口记下，后来的人也能接着守灯。'},
 archive_exit:{id:'archive_exit',episode:'chapter_2',choice:'protect',missionIndex:2,title:'把退路接回来',place:'雾海古府 · 第七退阵口',art:'v9-archive-chamber.png',source:'secret_2',sourceLabel:'秘境争魁终关正式胜绩',sourcePort:{tile:3,dir:3},sinkPort:{tile:5,dir:1},path:[3,6,7,4,1,2,5],labels:['稳泉','护人','退口','缓流','避纸','引路','归门'],initial:[0,1,3,2,1,2,1,3,0],targets:[7,4,1],brief:'终关的封印已可解除。把灵息从人身旁引开，让抄档人能沿第七阵口离开。',rule:'灵息从左侧稳泉进入，先经过「退口」，再经「缓流」「避纸」回到右侧归门。让来息成路，不能留悬空断口。',speaker:'yueheng',response:'他的呼吸稳住了。你先把退路接回来，我们才有余地照看人和纸。阵图会跟着他一起出去，不会再藏在谁的私印后面。'},
 archive_seal:{id:'archive_seal',episode:'chapter_2',choice:'seek',missionIndex:2,title:'护住原档的印痕',place:'雾海古府 · 原档护纸阵',art:'v9-archive-chamber.png',source:'secret_2',sourceLabel:'秘境争魁终关正式胜绩',sourcePort:{tile:6,dir:3},sinkPort:{tile:2,dir:1},path:[6,7,4,3,0,1,2],labels:['引泉','沉息','缓流','护纸','退口','泄压','原档'],initial:[2,3,1,2,1,0,3,1,0],targets:[4,3,0],brief:'原档不能用火烘，封阵也不能把人锁住。绕开纸脊分压，把护纸与退口接在同一条回路上。',rule:'灵息从左下角引泉进入，经过「缓流」「护纸」「退口」，由右上角原档引出。退口必须接通，原印才不会再靠封人来保全。',speaker:'suyan',response:'原印与退口都亮着。纸上的日期保住了，人的名字也该留在同一页。我们能带走证据，不必再把后来的人封在这张图里。'}
};
for(const c of Object.values(catalog)){c.tiles=tiles(c.path,c.sourcePort,c.sinkPort,c.labels);delete c.path;delete c.labels;}
function freeze(x){if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;}freeze(catalog);
function active(s,c){const j=s.story.journeys?.[c.episode];return !!(j&&j.rulesVersion===4&&j.choice===c.choice&&j.stage==='mission'&&j.missionIndex===c.missionIndex);}
const sourceReady=(s,c)=>(s.progress.dungeonWins[c.source]||0)>0;
function circuit(c,rotations){
 const ports=c.tiles.map((t,i)=>t?t.ports.map(d=>(d+rotations[i])%4):[]),fed=ports[c.sourcePort.tile].includes(c.sourcePort.dir),lit=new Set(fed?[c.sourcePort.tile]:[]),queue=[...lit];let leaks=0;
 for(let q=0;q<queue.length;q++){
  const i=queue[q];for(const d of ports[i]){
   if(i===c.sourcePort.tile&&d===c.sourcePort.dir||i===c.sinkPort.tile&&d===c.sinkPort.dir)continue;
   const n=neighbor(i,d);if(n===null||!ports[n].includes(opposite(d))){leaks++;continue;}
   if(!lit.has(n)){lit.add(n);queue.push(n);}
  }
 }
 const sink=lit.has(c.sinkPort.tile)&&ports[c.sinkPort.tile].includes(c.sinkPort.dir),targets=c.targets.map(tile=>({tile,label:c.tiles[tile].label,lit:lit.has(tile)}));
 return {ports,lit:[...lit],fed,sink,leaks,targets,solved:fed&&sink&&leaks===0&&targets.every(t=>t.lit)};
}
function view(s,id){const c=own(catalog,id)?catalog[id]:null;if(!c)return null;const note=s.formations?.[id]||null;if(!active(s,c)&&!note)return null;const rotations=note?.rotations||c.initial;return {case:c,note:note?copy(note):null,active:active(s,c),sourceReady:sourceReady(s,c),resolved:note?.status==='resolved',flow:circuit(c,rotations),rotations:[...rotations],companion:C.companions[c.speaker].name};}
function validate(s){
 if(s.formations===undefined)s.formations={};const notes=s.formations,fail=()=>{throw Error('护阵札记记录无效');},obj=x=>x&&typeof x==='object'&&!Array.isArray(x),integer=(x,a,b)=>Number.isSafeInteger(x)&&x>=a&&x<=b;
 if(!obj(notes)||Object.keys(notes).length>3)fail();
 for(const [id,n]of Object.entries(notes)){
  if(!own(catalog,id)||!obj(n))fail();const c=catalog[id],j=s.story.journeys?.[c.episode];
  if(Object.keys(n).some(k=>!['status','rotations','moves','attempts','verdict','startedAt','resolvedAt'].includes(k)))fail();
  if(!['working','resolved'].includes(n.status)||!Array.isArray(n.rotations)||n.rotations.length!==9||n.rotations.some((r,i)=>!integer(r,0,3)||!c.tiles[i]&&r!==0))fail();
  if(!integer(n.moves,0,9999)||!integer(n.attempts,0,100)||!integer(n.startedAt,0,8640000000000000)||![null,'blocked','leak','path','resolved'].includes(n.verdict))fail();
  if(!j||j.rulesVersion!==4||j.choice!==c.choice||j.missionIndex<c.missionIndex||['intro','survey','decision','reply'].includes(j.stage))fail();
  const f=circuit(c,n.rotations);
  if(n.status==='resolved'){if(!integer(n.resolvedAt,n.startedAt,8640000000000000)||!n.moves||!n.attempts||n.verdict!=='resolved'||!f.solved||!sourceReady(s,c))fail();}
  else{
   if(!active(s,c)||n.resolvedAt!==null||n.verdict==='resolved')fail();
   if(n.verdict!==null&&(!n.attempts||n.verdict!==(f.fed?(f.leaks?'leak':'path'):'blocked')||f.solved))fail();
   if(!n.moves&&n.rotations.some((r,i)=>r!==c.initial[i]))fail();
  }
 }
 for(const c of Object.values(catalog)){
  const j=s.story.journeys?.[c.episode];if(j?.rulesVersion!==4||j.choice!==c.choice)continue;
  const passed=j.missionIndex>c.missionIndex||j.missionIndex===c.missionIndex&&['interlude','outro','ready','completed'].includes(j.stage);
  if(passed&&notes[c.id]?.status!=='resolved')fail();
  if(j.missionIndex===c.missionIndex&&j.baseline!==0)fail();
 }
}
function handle(s,a,now){
 if(!['beginFormation','turnFormation','testFormation'].includes(a.type))return null;
 const no=message=>({ok:false,message}),yes=(message,data={})=>({ok:true,message,data}),c=own(catalog,a.id)?catalog[a.id]:null;
 if(!c||!active(s,c))return no('请在对应护阵约定中接续灵脉');
 if(s.battle||s.exploration||s.joint||s.ritual&&s.ritual.phase!=='complete')return no('先结束当前历练、闭关或共修，再接续护阵');
 let n=s.formations[c.id];if(n?.status==='resolved')return no('护阵已验通，可在札记中只读重看');
 if(a.type==='beginFormation'){if(n)return yes('回到未完的护阵');s.formations[c.id]={status:'working',rotations:[...c.initial],moves:0,attempts:0,verdict:null,startedAt:now,resolvedAt:null};return yes('铜槽已展开，先看来息与归处');}
 if(!n)return no('请先展开护阵图');
 if(a.type==='turnFormation'){
  if(!Number.isInteger(a.tile)||a.tile<0||a.tile>8||!c.tiles[a.tile]||![-1,1].includes(a.step))return no('请选择可转动的阵石与方向');
  n.rotations[a.tile]=(n.rotations[a.tile]+a.step+4)%4;n.moves=Math.min(9999,n.moves+1);n.verdict=null;return yes('阵石已转，灵息随铜槽重新流动');
 }
 if(!sourceReady(s,c))return no('先取得'+c.sourceLabel+'；试阵不能作为正式履历');
 const f=circuit(c,n.rotations);n.attempts=Math.min(100,n.attempts+1);n.verdict=f.solved?'resolved':!f.fed?'blocked':f.leaks?'leak':'path';
 if(f.solved){n.status='resolved';n.resolvedAt=now;return yes('来息有路，退口仍开。护阵已验通',{correct:true,formation:c.id});}
 const message=!f.fed?'来息尚未接入。先让起阵石的铜槽朝向来息一侧。':f.leaks?'亮起的灵路还有 '+f.leaks+' 处悬空断口。沿亮线检查相邻阵石，断口应正面对接。':'归处与关键阵口尚未同时接通。对照护阵口诀，沿来息逐段核验。';
 return yes(message,{correct:false,formation:c.id});
}
return Object.freeze({catalog,directions,neighbor,circuit,active,sourceReady,view,validate,handle});
});
