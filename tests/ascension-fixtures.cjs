'use strict';
// Rich terminal/UI fixtures are explicit; every ceremony and new-realm stage is
// reached through public actions, with an actual simulated gate/trial victory.
const assert=require('node:assert/strict'),E=require('../web/engine.js'),A=require('../web/ascension.js');
const NOW=1791244800000,copy=x=>JSON.parse(JSON.stringify(x));
function terminalFixture(o={}){
 const s=E.createState(NOW);s.training=false;s.paths.magic={realm:5,layer:10,xp:0,reserve:0};s.paths.magic.xp=E.modules.core.xpNeeded(s);
 s.story.chapter=6;s.story.mercy=6;s.story.completed=[0,1,2,3,4,5];
 s.progress.endingTrials.magic=true;s.ritualLegacyWins['magic:5']=true;
 s.progress.dungeonWins.heaven_gate=2;
 s.stones=o.rich?1000000000:1000000;for(const id of Object.keys(s.materials))s.materials[id]=o.rich?1000000:1000;
 s.migrationCompensation.magic={attack:50000,defense:10000,maxHp:100000};
 const v=E.validate(s);assert(v.ok,v.error);return v.state;
}
function dispatch(s,a){const r=E.act(s,a,NOW);assert(r.ok,JSON.stringify(a)+': '+r.message);return r;}
function victory(s,id){dispatch(s,{type:'startDungeon',id,difficulty:0});for(let n=0;n<100&&s.battle;n++)E.tick(s,2);assert(!s.battle,id+' settled');assert(s.lastBattleResult.win,id+' actual simulation win');return s.lastBattleResult;}
function toReady(s){
 for(let n=0;n<120;n++){
  const v=A.view(s);if(v.stage==='ready')return;
  if(v.stage==='preparation')dispatch(s,{type:'beginAscension'});
  else if(v.stage==='vow'&&!s.ascension.choice)dispatch(s,{type:'chooseAscension',choice:'promise'});
  else if(v.stage==='trial'&&s.ascension.line===v.trialLines.length-1&&!v.mission.done)victory(s,'heaven_gate');
  else dispatch(s,{type:'advanceAscension'});
 }
 throw Error('Ascension fixture did not reach its complete return dialogue');
}
function stageFixtures(){
 const s=terminalFixture({rich:true}),views=[];const capture=name=>{assert(E.validate(s).ok);views.push({name,state:copy(s)});};
 capture('preparation');dispatch(s,{type:'beginAscension'});capture('invitation');
 while(A.view(s).stage==='invitation')dispatch(s,{type:'advanceAscension'});capture('vow');dispatch(s,{type:'chooseAscension',choice:'promise'});capture('vow-reply');
 while(A.view(s).stage==='vow')dispatch(s,{type:'advanceAscension'});capture('condense');
 while(A.view(s).stage==='condense')dispatch(s,{type:'advanceAscension'});capture('trial-reading');
 while(s.ascension.line<A.view(s).trialLines.length-1)dispatch(s,{type:'advanceAscension'});capture('trial-challenge');victory(s,'heaven_gate');dispatch(s,{type:'advanceAscension'});capture('return');
 while(A.view(s).stage==='return')dispatch(s,{type:'advanceAscension'});capture('ready');dispatch(s,{type:'completeAscension'});
 for(let realm=0;realm<3;realm++){
  capture('ascended-'+realm+'-1');
  for(let layer=1;layer<=10;layer++){
   while(s.ascension.xp<A.xpNeeded(s.ascension))dispatch(s,{type:'celestialMeditate',count:10});
   if(layer<10)dispatch(s,{type:'advanceCelestial'});
  }
  capture('ascended-'+realm+'-10');victory(s,'immortal_'+realm);capture('trial-won-'+realm);dispatch(s,{type:'celestialBreakthrough'});
 }
 capture('perfected');return views;
}
module.exports={terminalFixture,toReady,stageFixtures};
