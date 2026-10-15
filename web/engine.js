(function(root,factory){
  const node=typeof module==='object'&&module.exports;
  const api=factory(node?require('./data.js'):root.WendaoData,node?require('./core.js'):root.WendaoCore,node?require('./economy.js'):root.WendaoEconomy,node?require('./combat.js'):root.WendaoCombat,node?require('./story.js'):root.WendaoStory,node?require('./builds.js'):root.WendaoBuilds,node?require('./breakthrough-ritual.js'):root.WendaoBreakthroughRitual,node?require('./ascension.js'):root.WendaoAscension);
  if(node)module.exports=api;else root.IdleEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(C,K,Q,B,S,R,T,A){
'use strict';
const copy=x=>JSON.parse(JSON.stringify(x));
const no=message=>({ok:false,message,error:message});
const yes=(message,data)=>({ok:true,message,data:data||{}});
function breakthroughCost(s,route){
 route=route||s.route;const p=s.paths[route],r=p.realm;
 if(s.ritual&&s.ritual.route===route&&s.ritual.realm===r&&s.ritual.phase==='trial')return {};
 if(r===5)return {};
 if(T.view(s,route).legacyReady){const cost={stones:50*Math.pow(r+1,2),materials:{lotus:3+r*2,ore:3+r*3}};if((s.pills['break'+r]||0)>0){cost.pills={['break'+r]:1};cost.stones=0;}return cost;}
 return {pills:{['break'+r]:1},materials:{lotus:3+r*2,ore:3+r*3}};
}
function worldView(s){
  const w=s.wanderings||{stance:'insight',records:[]},seen=new Map(w.records.map(x=>[x.id,x]));
  const events=C.worldEvents.map(event=>{
    const record=seen.get(event.id),reasons=[];
    if(K.pathRank(s)<event.realm*10+event.layer-1)reasons.push('需要当前主修达到'+C.routes[s.route].realmNames[event.realm]+event.layer+'层');
    if(event.previous&&!seen.has(event.previous))reasons.push('先完成《'+C.worldEvents.find(x=>x.id===event.previous).name+'》');
    if(event.requiredDungeon&&!(s.progress.dungeonWins[event.requiredDungeon]>0))reasons.push('先通关'+C.dungeons[event.requiredDungeon].name);
    return {...event,completed:!!record,record:record?copy(record):null,available:!record&&!reasons.length,reasons};
  });
  const insight=K.daoInsight(s);
  return {...insight,events,available:events.filter(x=>x.available).length,completed:seen.size,total:events.length,regions:C.regions.map(region=>({...region,completed:events.filter(x=>x.realm===region.realm&&x.completed).length,total:3,available:events.filter(x=>x.realm===region.realm&&x.available).length})),paths:Object.values(C.daoPaths).map(path=>({...path,marks:insight.marks[path.id],active:insight.stance===path.id}))};
}
function worldHandle(s,a,now){
  if(!['resolveEncounter','setDaoStance'].includes(a.type))return null;
  if(s.battle||s.exploration||s.joint||(s.ritual&&s.ritual.phase!=='complete'))return no('先结束当前历练、闭关或共修，再处理历世与道心');
  if(!s.wanderings)s.wanderings={stance:'insight',records:[]};
  if(a.type==='setDaoStance'){
    if(!Object.prototype.hasOwnProperty.call(C.daoPaths,a.id))return no('道心主张无效');
    if(s.wanderings.stance===a.id)return no('已在参悟此道心');
    s.wanderings.stance=a.id;K.log(s,'道心转向'+C.daoPaths[a.id].name+'，已获得的印记全部保留。',now);
    return yes('已参悟'+C.daoPaths[a.id].name+'道心');
  }
  const event=worldView(s).events.find(x=>x.id===a.id);if(!event)return no('历世事件不存在');
  if(event.completed)return no('此番机缘已经记入手札，不会重复结算');
  if(!event.available)return no(event.reasons.join('；'));
  const choice=event.choices.find(x=>x.id===a.choice);if(!choice)return no('请选择当前事件中的道路');
  if(!K.spend(s,choice.cost))return no('历世所需材料不足，可先准备或选择求真道路');
  K.grant(s,choice.reward,s.route);
  s.wanderings.records.push({id:event.id,choice:choice.id,route:s.route,rank:K.pathRank(s),at:now});
  K.log(s,'历世《'+event.name+'》：'+choice.outcome+' 获得'+C.daoPaths[choice.id].name+'印记。',now);
  return yes(choice.outcome,{eventId:event.id,choiceId:choice.id,reward:copy(choice.reward),mark:choice.id});
}
function preparation(s){
  const load=s.loadouts[s.route],p=s.paths[s.route],skills=load.skills.map(id=>C.techniques[id]).filter(Boolean);
  const pills=load.pills.map(id=>C.recipes[id]).filter(x=>x&&s.pills[x.id]>0&&(x.realm<p.realm||x.realm===p.realm&&(x.layer||1)<=p.layer));
  return {dao:K.daoInsight(s),roles:[['interrupt','打断'],['purify','净化'],['shield','护盾'],['heal','回复']].map(([id,name])=>{
    const techniques=skills.filter(x=>!!x.rules?.[id]).map(x=>x.name),consumables=pills.filter(x=>!!x.effect?.[id]).map(x=>x.name+' ×'+s.pills[x.id]);
    return {id,name,ready:techniques.length+consumables.length>0,techniques,pills:consumables};
  })};
}
function journey(s){
  const p=s.paths[s.route],needed=K.xpNeeded(s),full=p.xp>=needed,terminal=p.realm===5;
  const cost=p.layer===10&&!terminal?breakthroughCost(s):{},missing=[];
  for(const [key,value] of Object.entries(cost)){
    if(typeof value==='number'&&value>(s[key]||0))missing.push({id:key,have:s[key]||0,need:value,shortage:value-(s[key]||0)});
    else if(value&&typeof value==='object')for(const [id,count] of Object.entries(value))if(count>(s[key][id]||0))missing.push({id,have:s[key][id]||0,need:count,shortage:count-(s[key][id]||0)});
  }
  const trial=terminal?s.progress.endingTrials[s.route]:!!s.progress.trialWins[s.route+':'+p.realm];
  const checks=[{id:'xp',label:p.layer===10?'圆满修为':'本层修为',done:full,current:p.xp,required:needed}];
  if(p.layer===10){checks.push({id:'trial',label:terminal?'自证大道试炼':'境界试炼',done:trial});if(!terminal)checks.push({id:'materials',label:'突破材料',done:!missing.length});}
  const goals=[];
  function goal(id,title,description,label,target){return {id,title,description,label,target};}
  const action=(type,payload={})=>({kind:'action',type,payload}),ui=(type,payload={})=>({kind:'ui',type,payload});
  const dungeon=id=>ui('source',{id});
  let next;
  if(s.battle||s.exploration||s.joint)next=goal('encounter','继续当前历练',s.battle?'战斗进行中。先完成本场，再调整成长与配装。':s.joint?'共修灵息仍在流转，完成或取消后继续修行。':'洞天尚有未完成的节点，奖励按归途结算。','返回历练',{kind:'encounter'});
  else if(s.ritual&&s.ritual.phase!=='complete')next=goal('ritual','继续闭关 · 护道破境','闭关的准备与问心尚未完成，先回到当前仪式。','继续闭关',{kind:'ui',type:'ritual-open',payload:{route:s.route}});
  else if(s.ascension?.stage==='ascended')next=goal('ascension','仙途再启 · 继续修行','仙界境界、天路与真意由你继续探索。','进入仙界',{kind:'ui',type:'ascension-open',payload:{}});
  else if(p.layer===10&&terminal&&trial)next=goal('finale',s.story.ending?'大道已证 · 自由游历':'书写山海归途',s.story.ending?'可继续探索两条仙途、六流派与未完成的故事。':'完成山海卷的剩余章节，再亲自选择结局。',s.story.ending?'自由历练':'前往山海卷',s.story.ending?{kind:'page',type:'adventure'}:ui('ending-story'));
  else if(p.layer===10&&full&&!T.view(s).legacyReady&&!T.view(s).canBreakthrough)next=goal('ritual','道基圆满 · 闭关护道','备好主药与阵材，完成吐纳、护阵与问心，再亲自迎接试炼。','进入闭关',{kind:'ui',type:'ritual-open',payload:{route:s.route}});
  else if(full&&p.layer<10)next=goal('level-up','道基已稳 · 可以晋级','本层修为已满，晋级保留溢出的修为。','晋升下一层',action('levelUp'));
  else if(full&&!trial)next=goal('trial',terminal?'终境圆满 · 自证大道':'十层圆满 · 迎接试炼','修为已满。先查看试炼，再开始正式挑战。','查看境界试炼',dungeon('trial'));
  else if(full&&!missing.length)next=goal('breakthrough','诸事齐备 · 突破下一境','圆满修为、境界试炼和材料全部就绪。','突破下一境',action('breakthrough'));
  else if(full&&missing.length){
    const item=missing[0],name=C.materials[item.id]?.name||({stones:'灵石'})[item.id]||C.recipes[item.id]?.name||item.id;
    const source=C.materials[item.id]?.source?.id||'resource_herb';
    next=goal('material:'+item.id,'备齐突破材料',name+' '+item.have+' / '+item.need+'，尚缺 '+item.shortage+'。前往对应秘境补齐。','前往材料来源',dungeon(source));
  }else if(!s.training)next=goal('training','灵息已停 · 继续修行','开启洞府静修后，离线也会积累基础修为。','开始修行',action('setTraining',{enabled:true}));
  else{
    const pills=Object.values(C.recipes).filter(r=>r.kind==='qi'&&s.pills[r.id]>0&&(r.realm<p.realm||r.realm===p.realm&&(r.layer||1)<=p.layer)).sort((a,b)=>a.effect.xp-b.effect.xp);
    const pill=pills.find(r=>r.effect.xp>=needed-p.xp)||pills[pills.length-1];
    next=pill?goal('pill:'+pill.id,'丹香入道 · 加速修行','可服用'+pill.name+'，获得 '+pill.effect.xp+' 修为；溢出转为储备。','服用'+pill.name,action('usePill',{id:pill.id})):goal('cultivate','灵息运转 · 积累修为','洞府持续静修。也可历练赚取材料，或开炉炼制修为丹。','前往灵草秘境',dungeon('resource_herb'));
  }
  goals.push(next);
  if(!s.battle&&!s.exploration&&!s.joint){
    if(s.wisdomTickets)goals.push(goal('wisdom','悟道已凝成',s.wisdomTickets+'张感应券等待领取。','领取悟道券',action('claimWisdom')));
    if(s.rewardOverflow.length)goals.push(goal('overflow','奖励盒待整理',s.rewardOverflow.length+'件装备等待入囊。','整理背包',ui('equipment')));
    const story=S.view(s);
    if(story.chapterReady)goals.push(goal('chapter:'+s.story.chapter,'山海卷 · '+story.currentChapter.name,'章节目标已完成，亲自选择剧情方向。','前往山海卷',ui('ending-story')));
    if(story.sidequestProgress.some(q=>q.ready)||story.commissions.some(q=>q.ready))goals.push(goal('quests','同行回响 · 奖励可领取','支线或宗门委托已完成，前往仙缘查看。','查看仙缘',ui('ending-story')));
    if(K.maxRank(s)>=2&&!s.autoSmall&&p.layer<10)goals.push(goal('auto-small','让修行更从容','开启自动小层晋级。大境突破仍由你主动完成。','开启自动小层',action('setAutoSmall',{enabled:true})));
    const event=worldView(s).events.find(x=>x.available);
    if(event)goals.push(goal('world:'+event.id,'历世机缘 · '+event.name,'山海有新的抉择，奖励与道心印记随选择确定。','前往历世',ui('world-event',{id:event.id})));
  }
  const milestones=[{rank:2,label:'资源秘境'},{rank:4,label:'宗门 · 三神通 · 秘术'},{rank:6,label:'问道塔'},{rank:8,label:'洞天探索'},{rank:10,label:'天道感应 · 四神通 · 灵宝'},{rank:13,label:'第二秘术 · 被动灵宝'},{rank:16,label:'完整灵宝槽'}];
  return {realmLabel:K.realmLabel(s),checks,missing,goals,primary:next,trainingPerMinute:K.trainingPerTick(s)*20,etaSeconds:s.training&&!full?Math.ceil((needed-p.xp)/K.trainingPerTick(s))*3:null,nextUnlock:milestones.find(x=>x.rank>K.pathRank(s))||null};
}
function baseHandle(s,a,now){
  const route=a.route||s.route;
  if(a.type==='switchRoute'){
    if(!C.routes[a.route])return no('修炼路线无效');
    if(s.battle||s.exploration)return no('结束当前历练后再切换路线');
    if(s.ritual&&s.ritual.phase!=='complete')return no('先完成当前闭关，或收阵取回丹材后再转修');
    if(s.route===a.route)return no('当前已在此路线');
    s.route=a.route;K.log(s,'转修'+C.routes[a.route].name+'，另一条路线进度保留。',now);
    return yes('已切换至'+C.routes[a.route].name);
  }
  if(a.type==='levelUp'){
    if(!C.routes[route])return no('修炼路线无效');
    return K.levelUp(s,route);
  }
  if(a.type==='setAutoSmall'){
    if(typeof a.enabled!=='boolean')return no('自动晋级选项无效');
    if(K.maxRank(s)<2&&a.enabled)return no('首境三层之后可开启自动小层晋级');
    s.autoSmall=a.enabled;if(a.enabled)for(const r of Object.keys(C.routes))K.addXp(s,0,r);
    return yes(a.enabled?'已开启自动小层晋级':'已关闭自动小层晋级');
  }
  if(a.type==='setTraining'){
    if(typeof a.enabled!=='boolean')return no('修炼选项无效');s.training=a.enabled;
    return yes(a.enabled?'洞府继续静修':'静修已暂停');
  }
  if(a.type==='rename'){
    if(typeof a.name!=='string')return no('请输入道号');
    const name=a.name.replace(/[<>&\u0000-\u001f]/g,'').trim().slice(0,16);if(!name)return no('道号不能为空');
    s.player.name=name;return yes('道号已更改');
  }
  if(a.type==='claimWisdom'){
    if(!s.wisdomTickets)return no('暂无已凝成的悟道券');
    const count=s.wisdomTickets;K.add(s,'tickets',count);s.wisdomTickets=0;
    return yes('领取感应券×'+count,{count});
  }
  if(a.type==='breakthrough'){
    if(!C.routes[route])return no('修炼路线无效');
    if(s.battle||s.exploration)return no('先完成当前历练');
    const p=s.paths[route];if(p.layer!==10||p.xp<K.xpNeeded(s,route))return no('达到十层并填满圆满修为后才能突破');
    if(p.realm===5)return no(s.progress.endingTrials[route]?'已完成终境圆满，可推进终章':'终境圆满需要完成自证大道试炼');
    if(!s.progress.trialWins[route+':'+p.realm])return no('先完成当前大境突破试炼');
    if(!T.view(s,route).canBreakthrough)return no('先备齐主药与阵材，完成闭关吐纳、护阵与问心');
    const cost=breakthroughCost(s,route);if(!K.spend(s,cost))return no('突破材料不足，可前往药圃与矿石秘境');
    T.remember(s,now);if(s.ritual&&s.ritual.route===route)s.ritual=null;
    p.realm++;p.layer=1;p.xp=0;K.addXp(s,0,route);K.add(s.stats,'breakthroughs',1);
    K.log(s,'突破成功：'+C.routes[route].realmNames[p.realm]+'一层。',now);
    return yes('突破成功，进入'+C.routes[route].realmNames[p.realm]+'一层',{route,realm:p.realm,layer:1});
  }
  return null;
}
function act(state,action,now){
  if(!state||state.version!==3)return no('存档尚未正确载入');
  if(!action||typeof action.type!=='string')return no('操作无效');
  now=now===undefined?Date.now():now;
  if(!Number.isSafeInteger(now)||now<0||now>8640000000000000)return no('操作时间无效');
  const candidate=copy(state);
  try{
    let result=null;
    if(action.type==='startDungeon'&&action.id==='trial'&&!action.practice){if(action.route&&action.route!==candidate.route)return no('先转修对应路线再进入其护道试炼');const ritual=T.view(candidate,action.route||candidate.route);if(!ritual.canTrial&&!ritual.legacyReady)return no('先在修行页进入闭关，备丹、吐纳、护阵与问心后再入劫');}
    result=baseHandle(candidate,action,now);
    if(result===null)result=worldHandle(candidate,action,now);
    if(result===null)result=T.handle(candidate,action,now);
    if(result===null){result=A.handle(candidate,action,now);if(result?.ok&&result.data?.battleRequest){const started=B.handle(candidate,{type:'startDungeon',...result.data.battleRequest},now);if(!started?.ok)return started||no('仙界出征未能开始');result.data=Object.assign({},result.data,started.data||{});}}
    if(result===null)result=Q.handle(candidate,action,now,R);
    if(result===null)result=B.handle(candidate,action,now);
    if(result===null)result=S.handle(candidate,action,now);
    if(result===null)return no('未识别的操作');
    if(!result.ok)return Object.assign({},result,{error:result.error||result.message});
    candidate.revision=Math.min(1e12,candidate.revision+1);
    const verified=K.validate(candidate);
    if(!verified.ok)return no('操作未提交：'+verified.error);
    for(const key of Object.keys(state))delete state[key];Object.assign(state,verified.state);
    return result;
  }catch(error){return no('操作未提交：'+(error&&error.message||'状态异常'));}
}
function view(s){
  const core=K.view(s),story=S.view(s);
  return Object.assign({},core,story,{battle:B.battleView(s),breakthroughCost:breakthroughCost(s),canBreakthrough:T.view(s).canBreakthrough,ritual:T.view(s),ascension:A.view(s),competitions:B.competitionsView?B.competitionsView(s):[],gachaTargets:Q.targets?Q.targets(s):[],rewardOverflow:s.rewardOverflow||[]});
}
function tick(s,seconds){
  if(typeof seconds!=='number'||!Number.isFinite(seconds)||seconds<0)return no('战斗时间无效');
  return B.advanceBattle(s,Math.min(seconds,2));
}
function serialize(s){const result=K.validate(s);if(!result.ok)throw Error(result.error);return JSON.stringify(result.state);}
return {catalog:C,createState:K.createState,validate:K.validate,attributes:K.attributes,gearStats:K.gearStats,gearName:K.gearName,view,act,advance:K.advance,tick,serialize,breakthroughCost,
  journey,worldView,preparation,daoInsight:K.daoInsight,compareEquipment:Q.compareEquipment,recommendEquipment:Q.recommendEquipment,recyclePreview:Q.recyclePreview,
  battleView:B.battleView,dungeonView:B.dungeonView,previewDungeon:function(s,a){return B.previewDungeon?B.previewDungeon(s,a):B.dungeonView(s,a.id,a.tier,a.difficulty,a.floor);},
  costs:function(s,type,args){if(type==='breakthrough')return breakthroughCost(s,args&&args.route);if(type==='upgradeSect')return {stones:300*Math.pow(s.sect.rank+1,2),contribution:60*(s.sect.rank+1)};return Q.costs(s,type,args||{});},
  modules:{core:K,economy:Q,combat:B,story:S,builds:R,ritual:T,ascension:A}};
});
