'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../web/engine.js'),K=require('../web/core.js'),C=require('../web/data.js'),R=require('../web/rewards.js');
const {stockRitualFixture,toTrial}=require('./ritual-fixtures.cjs');
const NOW=1700000000000,copy=x=>JSON.parse(JSON.stringify(x));
function account(){const s=K.createState(NOW);s.paths.magic.layer=10;s.paths.magic.realm=2;return s;}
function start(s,id,fields={}){const a=E.act(s,{type:'startDungeon',id,...fields},NOW);assert.ok(a.ok,a.message);return s.battle;}
function finish(s){for(const enemy of s.battle.enemies)enemy.hp=0;E.tick(s,.1);return s.lastBattleResult;}
function clearCave(s,practice=false){
 start(s,'cave_0',{practice});
 for(let step=0;s.exploration&&step<30;step++){
  if(s.battle){finish(s);continue;}
  const choice=s.exploration.choices.find(item=>!item.id.endsWith(':extract'))||s.exploration.choices[0];
  const result=E.act(s,{type:'chooseCave',choice:choice.id},NOW);assert.ok(result.ok,result.message);
 }
 assert.equal(s.exploration,null,'all chosen routes and the final guardian completed');return s.lastBattleResult;
}
test('boss presenter shows only the committed, real first-clear loot with equipment UID and unlocks',()=>{
 const s=account();start(s,'boss_0');const report=finish(s),before=JSON.stringify(s),view=R.model(report);
 assert.equal(view.first,true);assert.equal(view.outcome,'win');assert.ok(view.stars>0);
 const gear=view.items.find(item=>item.kind==='gear');assert.ok(gear);assert.equal(gear.id,report.rewards.gear[0].uid);assert.ok(s.bag.some(item=>item.uid===gear.id));
 for(const id of ['stones','xp','tickets']){const amount=report.rewards[id];const item=view.items.find(item=>item.kind==='currency'&&item.id===id);assert.equal(item?.count||0,amount);}
 for(const [id,count] of Object.entries(report.rewards.materials)){assert.equal(view.items.find(item=>item.kind==='material'&&item.id===id).count,count);}
 for(const id of report.rewards.techniques)assert.ok(view.items.some(item=>item.kind==='technique'&&item.id===id));
 for(const id of report.rewards.blueprints)assert.ok(view.items.some(item=>item.kind==='blueprint'&&item.id===id));
 const html=R.render(report,{state:s});assert.ok(html.includes('首次通关'));assert.ok(html.includes('data-inspect-snapshot="'));assert.ok(html.includes('战利品已自动入账'));
 R.render(copy(report),{state:s});R.model(report);assert.equal(JSON.stringify(s),before,'viewing or revisiting never grants a reward');
});
test('practice victories do not advertise loot, first clears or real stars',()=>{
 const s=account();start(s,'boss_0',{practice:true});const report=finish(s),view=R.model(report);
 assert.equal(view.outcome,'practice');assert.equal(view.items.length,0);assert.equal(view.first,false);assert.equal(view.stars,0);assert.ok(view.state.includes('不发奖励'));
 assert.equal(R.model({...report,first:true,stars:3,rewards:{stones:999,gear:s.bag}}).items.length,0,'practice stays rewardless even if legacy report has stale fields');
});
test('defeat and explicit withdrawal show their actual outcome without fake victory or loot',()=>{
 const s=account();start(s,'resource_herb');assert.ok(E.act(s,{type:'setBattleAuto',enabled:false},NOW).ok);s.battle.player.hp=0;E.tick(s,.1);assert.ok(s.lastBattleResult);assert.equal(s.battle,null);
 let view=R.model(s.lastBattleResult);assert.equal(view.outcome,'defeat');assert.equal(view.items.length,0);assert.ok(R.render(s.lastBattleResult).includes('重整旗鼓'));
 start(s,'boss_0');assert.ok(E.act(s,{type:'leaveBattle'},NOW).ok);view=R.model(s.lastBattleResult);assert.equal(view.outcome,'exit');assert.equal(view.items.length,0);assert.ok(view.title.includes('结束'));
});
test('cave pending loot and banked materials have distinct saved versus pending feedback',()=>{
 const pending={win:true,type:'cave',rewardsPending:true,rewards:{xp:100,materials:{ore:12}}};
 assert.equal(R.model(pending).pending,true);assert.ok(R.render(pending).includes('通关或归途阵门后携出'));assert.ok(!R.render(pending).includes('战利品已自动入账'));
 const saved={win:false,type:'cave',outcome:'exit',rewards:{materials:{ore:12}}};
 assert.equal(R.model(saved).pending,false);assert.equal(R.model(saved).items[0].count,12);assert.ok(R.render(saved).includes('已携出收益已保留'));
});
test('trial progress is positive feedback with no invented material rewards',()=>{
 const s=account();s.paths.magic.xp=K.xpNeeded(s);stockRitualFixture(s);toTrial(s,NOW);start(s,'trial');const report=finish(s);assert.equal(report.rewards,null);
 const view=R.model(report);assert.equal(view.outcome,'win');assert.equal(view.items.length,0);assert.equal(view.state,'试炼进度已记录');assert.ok(s.progress.trialWins['magic:2']);
});
test('actual cave completion records first-clear metadata once and never labels practice or withdrawal as first',()=>{
 const s=account();s.stones=1000000;
 let report=clearCave(s);assert.equal(report.win,true);assert.equal(report.first,true);assert.equal(R.model(report).first,true);assert.equal(s.battleReports.at(-1).first,true);
 const key='cave_0:0:0';assert.equal(s.progress.firstClears.filter(id=>id===key).length,1);assert.ok(s.bag.some(item=>item.uid===report.rewards.gear[0].uid));
 report=clearCave(s);assert.equal(report.win,true);assert.equal(report.first,false);assert.equal(R.model(report).first,false);assert.equal(s.progress.firstClears.filter(id=>id===key).length,1);
 const practice=account();report=clearCave(practice,true);assert.equal(report.practice,true);assert.equal(report.first,false);assert.deepEqual(R.model(report).items,[]);
 const exit=account();start(exit,'cave_0');assert.ok(E.act(exit,{type:'finishCave'},NOW).ok);assert.equal(exit.lastBattleResult.first,false);assert.equal(exit.lastBattleResult.outcome,'exit');
});
test('renderer escapes report text and preserves snapshots for historical or overflow gear inspection',()=>{
 const s=account();start(s,'boss_0');const report=finish(s),gear=report.rewards.gear[0];s.rewardOverflow=[gear];s.bag=s.bag.filter(item=>item.uid!==gear.uid);report.name='<img src=x onerror=alert(1)>';report.reason='<script>danger()</script>';
 const html=R.render(report,{state:s});assert.ok(!html.includes('<script>danger'));assert.ok(html.includes('&lt;script&gt;danger'));assert.ok(html.includes('奖励暂存'));assert.ok(html.includes('data-inspect-id="'+gear.uid+'"'));assert.ok(html.includes('data-inspect-snapshot="{&quot;uid&quot;'));
});
