'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const K=require('../web/core.js'),B=require('../web/combat.js'),C=require('../web/data.js');
const NOW=1700000000000,copy=x=>JSON.parse(JSON.stringify(x));
function state(layer=7,realm=0){const s=K.createState(NOW);s.paths[s.route].layer=layer;s.paths[s.route].realm=realm;return s;}
function action(s,type,fields={}){const r=B.handle(s,{type,...fields},NOW);assert.ok(r&&r.ok,type+': '+(r&&r.message));return r;}
function victory(s){assert.ok(s.battle);s.battle.enemies.forEach(e=>{e.hp=0;});B.advanceBattle(s,.1);assert.equal(s.battle,null);assert.equal(s.lastBattleResult.win,true);return s.lastBattleResult;}
function snapshotMoney(s){return copy({stones:s.stones,tickets:s.tickets,materials:s.materials,pills:s.pills,paths:s.paths,bag:s.bag});}
function stable(s){s=copy(s);delete s.logs;delete s.lastSettlement;return s;}

test('pause freezes both sides, cooldowns, statuses, RNG and queued costs',()=>{
  const s=state();action(s,'startDungeon',{id:'boss_0',difficulty:0});
  B.advanceBattle(s,2);
  action(s,'pauseBattle',{paused:true});
  const before=copy(s);
  B.advanceBattle(s,60);assert.deepEqual(s,before);
  const skill=s.loadouts[s.route].skills[1],mp=s.battle.player.mp;
  action(s,'useSkill',{id:skill});
  assert.equal(s.battle.player.mp,mp,'queue must not consume until resumed');
  const valid=K.validate(s);assert.equal(valid.ok,true,valid.error);
  const queued=copy(s);B.advanceBattle(s,60);assert.deepEqual(s,queued);
  action(s,'pauseBattle',{paused:false});B.advanceBattle(s,.1);
  assert.equal(s.battle.queue.length,0);
  assert.ok(s.battle.player.mp<mp);
});

test('passive offline settlement cannot run or complete live battles',()=>{
  const s=state();action(s,'startDungeon',{id:'boss_0',difficulty:0});
  const battle=copy(s.battle),first=copy(s.progress.firstClears),wins=s.stats.manualWins;
  K.advance(s,NOW+24*3600000);
  assert.deepEqual(s.battle,battle);
  assert.deepEqual(s.progress.firstClears,first);assert.equal(s.stats.manualWins,wins);
});

test('battle save restores identical simulation and rewards from the same state',()=>{
  const a=state();action(a,'startDungeon',{id:'resource_herb',tier:0,difficulty:0});
  B.advanceBattle(a,3);
  const restored=K.validate(JSON.stringify(a));
  assert.equal(restored.ok,true,restored.error);const b=restored.state;
  for(let i=0;i<200&&a.battle;i++){B.advanceBattle(a,1);B.advanceBattle(b,1);}
  assert.equal(a.battle,null);assert.equal(b.battle,null);
  assert.deepEqual(stable(a),stable(b));
});

test('first clear reward commits once, while legitimate repeat gives only repeat loot',()=>{
  const s=state();action(s,'startDungeon',{id:'boss_0',difficulty:0});
  const first=victory(s);assert.equal(first.first,true);
  assert.ok(first.rewards.techniques.length>0);assert.ok(first.rewards.blueprints.length>0);
  const once=copy(s);B.advanceBattle(s,60);assert.deepEqual(s,once);
  action(s,'startDungeon',{id:'boss_0',difficulty:0});const repeat=victory(s);
  assert.equal(repeat.first,false);assert.equal(repeat.rewards.techniques.length,0);
  assert.equal(repeat.rewards.blueprints.length,0);assert.equal(repeat.rewards.treasures.length,0);
  assert.equal(s.progress.firstClears.filter(k=>k==='boss_0:0:0').length,1);
  assert.equal(s.progress.bossWins.boss_0,2);
});

test('defeat keeps realm and unspent consumables, and awards no currency or crystal',()=>{
  const s=state();action(s,'startDungeon',{id:'boss_0',difficulty:0});
  s.battle.auto=false;s.battle.player.hp=1;s.battle.player.shield=0;
  s.battle.enemies[0].attack=1e6;s.battle.enemies[0].attackTimer=0;
  const before=snapshotMoney(s),first=copy(s.progress.firstClears),failed=s.stats.failed;
  B.advanceBattle(s,.1);
  assert.equal(s.battle,null);assert.equal(s.lastBattleResult.win,false);
  assert.equal(s.lastBattleResult.rewards,null);assert.equal(s.stats.failed,failed+1);
  assert.deepEqual(snapshotMoney(s),before);assert.deepEqual(s.progress.firstClears,first);
});

test('repeat breakthrough practice has no economic reward and cannot itself change realm',()=>{
  const s=state(10);const before=snapshotMoney(s);
  for(let i=0;i<2;i++){
    action(s,'startDungeon',{id:'trial',difficulty:0});victory(s);
    assert.equal(s.lastBattleResult.rewards,null);
  }
  assert.equal(s.progress.trialWins[s.route+':0'],true);
  assert.deepEqual(snapshotMoney(s),before);assert.equal(s.paths[s.route].realm,0);
  assert.equal(s.stats.manualWins,0,'practice must not fund sect commission tickets or crystals');
});

test('three-star resource sweep spends exact reserve and emits only baseline rewards',()=>{
  const s=state();const key='resource_herb:0:0';s.progress.stars[key]=3;s.sweepMs=90000;
  const tickets=s.tickets,crystal=s.materials.crystal0,bag=s.bag.length,first=copy(s.progress.firstClears);
  const r=action(s,'sweepDungeon',{id:'resource_herb',tier:0,count:2});
  assert.equal(s.sweepMs,0);assert.equal(r.data.costMs,90000);
  assert.ok(r.data.reward.materials.herb>0);
  assert.equal(s.tickets,tickets);assert.equal(s.materials.crystal0,crystal);
  assert.equal(s.bag.length,bag);assert.deepEqual(s.progress.firstClears,first);
  const before=copy(s);assert.equal(B.handle(s,{type:'sweepDungeon',id:'resource_herb',tier:0,count:1},NOW).ok,false);
  assert.deepEqual(s,before);
});

test('backtracking old-tier resources cannot farm current-tier crystals or tickets',()=>{
  const s=state(1,1);action(s,'startDungeon',{id:'resource_ore',tier:0,difficulty:0});
  const tickets=s.tickets,c0=s.materials.crystal0,c1=s.materials.crystal1;
  victory(s);
  assert.equal(s.tickets,tickets);assert.equal(s.materials.crystal0,c0);assert.equal(s.materials.crystal1,c1);
  assert.ok(s.lastBattleResult.rewards.materials.ore>0);
});

test('exiting an incomplete cave does not refresh final rewards or first clear',()=>{
  const s=state(9);action(s,'startDungeon',{id:'cave_0',difficulty:0});
  const before=snapshotMoney(s),first=copy(s.progress.firstClears);
  action(s,'finishCave');
  assert.equal(s.exploration,null);assert.equal(s.lastBattleResult.win,false);
  assert.deepEqual(snapshotMoney(s),before);assert.deepEqual(s.progress.firstClears,first);
  const settled=copy(s);
  assert.equal(B.handle(s,{type:'finishCave'},NOW).ok,false);assert.deepEqual(s,settled);
});

test('full inventory rejects new gear-awarding battle before consuming RNG or progress',()=>{
 const E=require('../web/economy.js'),s=state();
 while(s.bag.length<300)E.addGear(s,E.createGear(s,{rarity:0,slot:'head',set:'body',tier:0}));
 while(s.rewardOverflow.length<1000)E.addGear(s,E.createGear(s,{rarity:0,slot:'head',set:'body',tier:0}));
 const before=copy(s),r=B.handle(s,{type:'startDungeon',id:'boss_0',difficulty:0},NOW);
 assert.equal(r.ok,false);assert.deepEqual(s,before,'full inventory should stop before entering a reward-losing fight');
});
