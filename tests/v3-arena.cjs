'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../web/data.js'),K=require('../web/core.js'),B=require('../web/combat.js'),Q=require('../web/economy.js'),A=require('../web/ascension.js');
const NOW=1700000000000,copy=x=>JSON.parse(JSON.stringify(x));
function state(layer=10){const s=K.createState(NOW);s.paths.magic.layer=layer;return s;}
function start(s,id,extra={}){const r=B.handle(s,{type:'startDungeon',id,...extra},NOW);assert.equal(r.ok,true,r.message);return s.battle;}
function victory(s){s.battle.enemies.forEach(e=>e.hp=0);B.advanceBattle(s,.1);assert.equal(s.lastBattleResult.win,true);assert.equal(s.battle,null);return s.lastBattleResult;}
function fails(s,id){const before=copy(s),r=B.handle(s,{type:'startDungeon',id},NOW);assert.equal(r.ok,false);assert.deepEqual(s,before);return r;}
function winsBefore(s,id){const n=Number(id.slice(-1)),base=id.split('_')[0];for(let i=0;i<n;i++){start(s,base+'_'+i);victory(s);}}

test('two tournaments preserve the original boss, resource and teaching trial catalogs',()=>{
 const contests=Object.values(C.dungeons).filter(d=>d.type==='arena');
 assert.equal(contests.length,6);assert.equal(new Set(contests.map(d=>d.enemy.name)).size,6);
 assert.equal(Object.values(C.dungeons).filter(d=>d.type==='sect').length,12);
 assert.equal(Object.values(C.dungeons).filter(d=>d.type==='resource').length,5);assert.equal(C.bosses.length,12);
 assert.deepEqual(contests.map(d=>d.layer),[3,4,5,7,8,9]);
 for(const d of contests){assert.equal(d.realm,0);assert.ok(d.opening.length>20&&d.closing.length>20);assert.ok(d.enemy.mechanic.name&&d.enemy.mechanic.hint);}
});

test('realm gates and real previous wins guard each tournament independently without mutation',()=>{
 const s=state(2);assert.match(fails(s,'arena_0').message,/3层/);s.paths.magic.layer=10;
 assert.match(fails(s,'arena_1').message,/初试锋芒/);assert.match(fails(s,'arena_2').message,/百席争名/);
 start(s,'arena_0');victory(s);assert.equal(B.dungeonView(s,'arena_1').locked,false);
 assert.match(fails(s,'secret_1').message,/破雾争先/);start(s,'secret_0');victory(s);
 assert.equal(B.dungeonView(s,'secret_1').locked,false);assert.equal(B.dungeonView(s,'secret_2').locked,true);
 assert.equal(B.dungeonView(s,'arena_2').locked,true,'a secret-realm win cannot skip arena semifinal');
});

test('free practice and defeat give no advancement, trophy, equipment or reward',()=>{
 const s=state(),before=copy({stones:s.stones,tickets:s.tickets,bag:s.bag,progress:s.progress});
 start(s,'arena_0',{practice:true});victory(s);
 assert.deepEqual({stones:s.stones,tickets:s.tickets,bag:s.bag,progress:s.progress},before);
 assert.equal(B.competitionsView(s)[0].earned,false);assert.match(fails(s,'arena_1').message,/正式/);
 start(s,'arena_0');s.battle.auto=false;s.battle.player.hp=1;s.battle.enemies[0].attack=1e6;s.battle.enemies[0].attackTimer=0;B.advanceBattle(s,.1);
 assert.equal(s.lastBattleResult.win,false);assert.deepEqual({stones:s.stones,tickets:s.tickets,bag:s.bag,progress:s.progress},before);
});

test('both finals grant one real guaranteed sword and derive titles from persisted wins',()=>{
 const s=state();
 for(const [base,title] of [['arena','冲霄魁首'],['secret','秘境第一']]){
  winsBefore(s,base+'_2');const bag=s.bag.length,tickets=s.tickets;
  const preview=B.previewDungeon(s,{id:base+'_2'});assert.equal(preview.allowed,true);assert.equal(preview.firstRewards.gearCount,1);assert.equal(preview.rewards.gearCount,0);
  start(s,base+'_2');const r=victory(s);assert.equal(r.first,true);assert.equal(r.trophy,title);assert.equal(r.rewards.gear.length,1);
  const g=r.rewards.gear[0];assert.equal(g.rarity,2);assert.equal(g.set,'sword');assert.equal(g.slot,'weapon');assert.equal(g.tier,0);
  assert.equal(s.bag.length,bag+1);assert.ok(s.bag.some(x=>x.uid===g.uid));assert.ok(s.tickets>tickets);
  assert.equal(B.competitionsView(s).find(x=>x.id===base).earned,true);
  const restored=K.validate(JSON.stringify(s));assert.equal(restored.ok,true,restored.error);assert.equal(B.dungeonView(restored.state,base+'_2').titleEarned,true);
  const same=copy(s);B.advanceBattle(s,30);assert.deepEqual(s,same,'repeated settlement cannot repeat trophies');
  start(s,base+'_2');const replay=victory(s);assert.equal(replay.first,false);assert.equal(replay.rewards.gear.length,0);assert.equal(replay.rewards.tickets,0);
  start(s,base+'_2',{difficulty:1});assert.equal(victory(s).rewards.gear.length,0,'higher difficulty must not repeat the unique first championship sword');
 }
});

test('full inventory guards first trophy gear but ordinary arena repeats remain playable',()=>{
 const s=state();winsBefore(s,'arena_2');
 while(s.bag.length<300)Q.addGear(s,Q.createGear(s,{slot:'head',set:'body',rarity:0,tier:0}));
 while(s.rewardOverflow.length<1000)Q.addGear(s,Q.createGear(s,{slot:'head',set:'body',rarity:0,tier:0}));
 assert.match(fails(s,'arena_2').message,/奖励暂存已满/);s.rewardOverflow.pop();start(s,'arena_2');victory(s);
 assert.equal(s.rewardOverflow.length,1000);start(s,'arena_2');victory(s);assert.equal(s.rewardOverflow.length,1000);
});

test('rivals have actual named, interruptible combat mechanics and survive save restoration',()=>{
 const s=state();start(s,'arena_0');s.battle.auto=false;s.battle.player.hp=s.battle.player.maxHp=10000;s.battle.enemies[0].mechanicTimer=0;B.advanceBattle(s,.1);
 assert.equal(B.battleView(s).enemies[0].name,'外门师兄·韩岳');assert.equal(B.battleView(s).enemies[0].casting.name,'裂石掌');assert.equal(B.battleView(s).enemies[0].casting.interruptible,true);
 const restored=K.validate(JSON.stringify(s));assert.equal(restored.ok,true,restored.error);const b=restored.state;
 for(let i=0;i<60;i++){B.advanceBattle(s,.1);B.advanceBattle(b,.1);}assert.deepEqual(b.battle,s.battle);
 assert.ok(s.battle.log.some(x=>x.message.includes('裂石掌')));assert.ok(s.battle.performance.missed>0);
});

test('chapters require actual early championships and breakthrough recipes are reachable before trials',()=>{
 assert.ok(C.chapters[1].requirements.some(r=>r.key==='dungeonWins'&&r.id==='arena_2'));
 assert.ok(C.chapters[2].requirements.some(r=>r.key==='dungeonWins'&&r.id==='secret_2'));
 assert.deepEqual([0,1,2,3,4,5].map(i=>C.recipes['break'+i].name),['筑基丹','凝金丹','凝婴丹','化神丹','渡厄丹','道心丹']);
 assert.equal(Object.keys(C.recipes).length,18);
 const s=state(3);s.stones=1000;s.materials.insight=10;const result=Q.handle(s,{type:'researchRecipe',id:'break0'},NOW);
 assert.equal(result.ok,true,result.message);assert.ok(s.learnedRecipes.includes('break0'));assert.deepEqual(s.progress.trialWins,{});
 assert.equal(s.recipeProvenance.break0.type,'research');assert.match(C.recipes.break0.source.label,/药炉确定研究/);
});

test('the introductory duel can be won by an unboosted three-layer starting loadout',()=>{
 const s=state(3);start(s,'arena_0');for(let i=0;i<1200&&s.battle;i++)B.advanceBattle(s,.1);
 assert.equal(s.battle,null,'the duel has an actual finite outcome');assert.equal(s.lastBattleResult.win,true,JSON.stringify(s.lastBattleResult));
 assert.equal(s.progress.dungeonWins.arena_0,1);assert.ok(s.lastBattleResult.time>2,'real combat should take more than a button click');
});

function gateFixture(){
 const s=state();s.paths.magic.realm=5;s.paths.magic.xp=K.xpNeeded(s);s.progress.endingTrials.magic=true;s.ritualLegacyWins['magic:5']=true;
 s.story.chapter=6;s.story.completed=[0,1,2,3,4,5];s.story.ending='guardian';s.stones=1000000;Object.keys(s.materials).forEach(id=>s.materials[id]=10000);
 function act(type,extra={}){const r=A.handle(s,{type,...extra},NOW);assert.equal(r.ok,true,r.message);return r;}
 act('beginAscension');
 for(let i=0;i<100;i++){
  const p=s.ascension;if(p.stage==='trial'&&!A.dungeonRequirement(s,C.dungeons.heaven_gate))break;
  if(p.stage==='vow'&&!p.choice)act('chooseAscension',{choice:'promise'});else act('advanceAscension');
 }
 assert.equal(A.dungeonRequirement(s,C.dungeons.heaven_gate),null);return {s,act};
}
function immortalFixture(){const {s,act}=gateFixture();start(s,'heaven_gate');victory(s);for(let i=0;i<100&&s.ascension.stage!=='ready';i++)act('advanceAscension');act('completeAscension');return {s,act};}

test('the celestial gate requires genuine prepared narrative and a fresh real victory',()=>{
 const empty=state(10);empty.paths.magic.realm=5;assert.match(fails(empty,'heaven_gate').message,/天门来信/);
 const {s,act}=gateFixture(),before=copy(s.ascension);start(s,'heaven_gate',{practice:true});victory(s);
 assert.deepEqual(s.ascension,before);assert.equal(s.progress.dungeonWins.heaven_gate,undefined);
 assert.equal(A.handle(s,{type:'advanceAscension'},NOW).ok,false,'dialogue cannot substitute for a gate win');
 const battle=start(s,'heaven_gate');assert.equal(battle.enemies[0].species,'gate_lion');assert.equal(battle.enemies[0].mechanicSpec.name,'天门洗尘');
 victory(s);assert.equal(s.progress.dungeonWins.heaven_gate,1);assert.equal(s.lastBattleResult.rewards.celestial,undefined,'mortal gate does not prematurely mint immortal currency');
 act('advanceAscension');assert.equal(s.ascension.stage,'return');assert.equal(A.validate(s),s);
});

test('immortal hunts prepay once and grant actual immortal resources exactly once after victory',()=>{
 const {s}=immortalFixture(),stones=s.stones,xp=s.ascension.xp,yuan=s.ascension.yuan,wins=s.ascension.huntWins;
 const preview=B.previewDungeon(s,{id:'immortal_hunt_0'});assert.equal(preview.allowed,true);assert.deepEqual(preview.consumption,{stones:1000});
 start(s,'immortal_hunt_0');assert.equal(s.stones,stones-1000);assert.equal(s.ascension.xp,xp);assert.equal(s.ascension.yuan,yuan);
 const r=victory(s);assert.equal(r.rewards.celestial.xp,180);assert.equal(r.rewards.celestial.yuan,12);assert.equal(s.ascension.xp,xp+180);assert.equal(s.ascension.yuan,yuan+12);
 assert.equal(s.ascension.huntWins,wins+1);assert.equal(s.progress.dungeonWins.immortal_hunt_0,1);assert.equal(A.validate(s),s);
 const settled=copy(s);B.advanceBattle(s,60);assert.deepEqual(s,settled);assert.match(fails(s,'immortal_hunt_1').message,/下一重仙界/);
});

test('immortal practice stays free with an empty wallet while failed formal hunts retain only their cost',()=>{
 const {s}=immortalFixture();s.stones=0;const before=copy(s.ascension),progress=copy(s.progress);start(s,'immortal_hunt_0',{practice:true});victory(s);
 assert.equal(s.stones,0);assert.deepEqual(s.ascension,before);assert.deepEqual(s.progress,progress);assert.match(fails(s,'immortal_hunt_0').message,/资源不足/);
 s.stones=3000;start(s,'immortal_hunt_0');s.battle.auto=false;s.battle.player.hp=1;s.battle.enemies[0].attack=1e6;s.battle.enemies[0].attackTimer=0;B.advanceBattle(s,.1);
 assert.equal(s.lastBattleResult.win,false);assert.equal(s.stones,2000);assert.deepEqual(s.ascension,before);assert.deepEqual(s.progress,progress);
});

test('each immortal promotion challenge needs current ten-layer fullness and charges immortal currency once',()=>{
 const {s}=immortalFixture();assert.match(fails(s,'immortal_0').message,/仙修圆满/);
 s.ascension.layer=10;s.ascension.xp=A.xpNeeded(s.ascension);const yuan=s.ascension.yuan;
 const preview=B.previewDungeon(s,{id:'immortal_0'});assert.equal(preview.allowed,true);assert.deepEqual(preview.consumption,{yuan:20});
 start(s,'immortal_0');assert.equal(s.ascension.yuan,yuan-20);victory(s);
 assert.equal(s.ascension.yuan,yuan-20+35);assert.equal(s.progress.dungeonWins.immortal_0,1);assert.equal(s.lastBattleResult.rewards.celestial.xp,400);
 assert.equal(A.view(s).trialFresh,true);assert.equal(A.validate(s),s);
});
