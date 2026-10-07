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
  battleView:B.battleView,dungeonView:B.dungeonView,previewDungeon:function(s,a){return B.previewDungeon?B.previewDungeon(s,a):B.dungeonView(s,a.id,a.tier,a.difficulty,a.floor);},
  costs:function(s,type,args){if(type==='breakthrough')return breakthroughCost(s,args&&args.route);if(type==='upgradeSect')return {stones:300*Math.pow(s.sect.rank+1,2),contribution:60*(s.sect.rank+1)};return Q.costs(s,type,args||{});},
  modules:{core:K,economy:Q,combat:B,story:S,builds:R,ritual:T,ascension:A}};
});
