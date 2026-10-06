'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../web/engine.js'),C=require('../web/data.js');
const NOW=1791244800000;
const clone=x=>JSON.parse(JSON.stringify(x));
function checked(s,label){
 const parsed=JSON.parse(E.serialize(s)),r=E.validate(parsed);
 assert.equal(r.ok,true,(label||'validate')+': '+r.error);
 assert.deepEqual(r.state,parsed,label||'roundtrip state');
 return r.state;
}
function act(s,a,label){
 const revision=s.revision,r=E.act(s,a,NOW);
 assert.equal(r.ok,true,(label||a.type)+': '+r.message);
 assert.equal(s.revision,revision+1,(label||a.type)+' increments revision once');
 checked(s,label||a.type);
 return r;
}
function fail(s,a,label){
 const before=JSON.stringify(s),r=E.act(s,a,NOW);
 assert.equal(r.ok,false,(label||a.type)+' should reject: '+r.message);
 assert.equal(JSON.stringify(s),before,(label||a.type)+' failure must retain original save');
 return r;
}
function pillFill(s){
 let guard=0;
 while(s.paths[s.route].xp<E.modules.core.xpNeeded(s)){
  assert(++guard<1000,'pill filling converges');
  act(s,{type:'usePill',id:'qi0'},'cultivation pill');
 }
}
function raiseTo(s,layer){
 while(s.paths[s.route].layer<layer){pillFill(s);act(s,{type:'levelUp'},'small layer advance');}
}
function durableCombatFixture(s){
 s.migrationCompensation[s.route]={attack:50000,defense:10000,maxHp:100000};
 return checked(s,'durable combat fixture');
}
function win(s,id,args={}){
 act(s,{type:'startDungeon',id,...args},'enter '+id);
 assert(s.battle||s.exploration,'challenge begins');
 let steps=0;
 while(s.battle&&++steps<320){const r=E.tick(s,2);assert.equal(r.ok,true,r.message);}
 assert(steps<320,'fight settles before time cap');
 assert.equal(s.lastBattleResult?.win,true,id+' victory: '+s.lastBattleResult?.reason);
 checked(s,id+' settled save');
 return s.lastBattleResult;
}
test('facade failures retain state and successful actions increment revision exactly once',()=>{
 const s=E.createState(NOW);
 for(const a of [
  {type:'rename',name:''},{type:'switchRoute',route:'unknown'},{type:'levelUp'},
  {type:'draw',count:10},{type:'upgradeFacility',id:'not_a_facility'},
  {type:'forgeGear',slot:'weapon',set:'sword',rarity:5},
  {type:'claimSidequest',id:'world_forge'},{type:'unknown_action'}
 ])fail(s,a);
 assert.equal(s.revision,0);
 act(s,{type:'rename',name:'长明行者'});assert.equal(s.player.name,'长明行者');
 act(s,{type:'setTraining',enabled:false});assert.equal(s.training,false);
 act(s,{type:'switchRoute',route:'body'});assert.equal(s.route,'body');
 assert.equal(s.revision,3);
 const before=JSON.stringify(s);assert.equal(E.act(s,{type:'rename',name:'越时'},-1).ok,false);assert.equal(JSON.stringify(s),before);
});
test('facade rolls back multi-resource shortages and invalid candidate validation',()=>{
 const s=E.createState(NOW);s.stones=10000;s.materials.ore=0;s.materials.herb=100;
 fail(s,{type:'upgradeFacility',id:'forge'},'ore shortage retains all resources');
 const broken=clone(s);broken.paths.magic.layer=11;
 const result=fail(broken,{type:'rename',name:'不能提交'},'invalid candidate');
 assert.match(result.message,/未提交/);
});
for(const route of ['magic','body']){
 test(route+' reaches ten through actual pill and level actions, trial then transition retains surplus',()=>{
  let s=E.createState(NOW);if(route==='body')act(s,{type:'switchRoute',route});
  s.pills.qi0=1000;s=durableCombatFixture(s);
  for(let layer=1;layer<=10;layer++){
   assert.equal(s.paths[route].realm,0);assert.equal(s.paths[route].layer,layer);
   pillFill(s);if(layer<10){fail(s,{type:'breakthrough'},'small layer cannot skip realm');act(s,{type:'levelUp'});}
  }
  assert.equal(s.paths[route].xp,2200);
  for(let i=0;i<5;i++)act(s,{type:'usePill',id:'qi0'});
  const surplus=s.paths[route].reserve;assert(surplus>=600);
  fail(s,{type:'levelUp'},'ten stops small advance');fail(s,{type:'breakthrough'},'trial required');
  const beforeRewards={stones:s.stones,tickets:s.tickets,materials:clone(s.materials)};
  win(s,'trial');
  assert.equal(s.progress.trialWins[route+':0'],true);
  assert.equal(s.stones,beforeRewards.stones);assert.equal(s.tickets,beforeRewards.tickets);assert.deepEqual(s.materials,beforeRewards.materials,'trial creates no repeat economic rewards');
  const cost=E.breakthroughCost(s),stones=s.stones,lotus=s.materials.lotus,ore=s.materials.ore;
  act(s,{type:'breakthrough'});
  const p=s.paths[route];assert.equal(p.realm,1);assert.equal(p.layer,1);
  assert.equal(p.xp,Math.min(surplus,300));assert.equal(p.reserve,Math.max(0,surplus-300));
  assert.equal(p.xp+p.reserve,surplus,'only filled old realm requirement was consumed');
  assert.equal(s.stones,stones-cost.stones);assert.equal(s.materials.lotus,lotus-cost.materials.lotus);assert.equal(s.materials.ore,ore-cost.materials.ore);
  assert.equal(s.paths[route==='magic'?'body':'magic'].realm,0);
  assert.equal(s.paths[route==='magic'?'body':'magic'].layer,1);
  fail(s,{type:'breakthrough'},'next realm still requires its own ten layers');
 });
}
test('completed trial cannot commit breakthrough without all materials',()=>{
 const s=E.createState(NOW);s.paths.magic={realm:0,layer:10,xp:2200,reserve:600};s.progress.trialWins['magic:0']=true;
 s.stones=500;s.materials.lotus=3;s.materials.ore=0;
 fail(s,{type:'breakthrough'},'atomic missing ore');assert.equal(s.paths.magic.realm,0);
 s.materials.ore=3;act(s,{type:'breakthrough'});assert.equal(s.paths.magic.realm,1);assert.equal(s.paths.magic.layer,1);
});
test('terminal trial grants ending eligibility and does not create a seventh realm',()=>{
 let s=E.createState(NOW);s.paths.magic={realm:5,layer:10,xp:275000,reserve:1000};s=durableCombatFixture(s);
 win(s,'trial');assert.equal(s.progress.endingTrials.magic,true);
 fail(s,{type:'breakthrough'},'terminal realm remains terminal');assert.equal(s.paths.magic.realm,5);assert.equal(s.paths.magic.layer,10);
});
test('actual red forging obeys equip, lock, preset and explicit recycle protections',()=>{
 const s=E.createState(NOW);s.paths.magic={realm:1,layer:7,xp:0,reserve:0};s.stones=1000000;
 for(const k of Object.keys(s.materials))s.materials[k]=100000;s.blueprints=['sword'];
 const forged=act(s,{type:'forgeGear',slot:'weapon',set:'sword',rarity:5}),uid=forged.data.gear.uid;
 assert.equal(s.bag.find(g=>g.uid===uid).rarity,5);assert.equal(s.bag.find(g=>g.uid===uid).special,'sword');
 act(s,{type:'equipGear',uid});fail(s,{type:'recycleGear',uid,confirm:true},'equipped red protected');
 act(s,{type:'lockGear',uid});act(s,{type:'equipGear',uid:'g1'});fail(s,{type:'recycleGear',uid,confirm:true},'locked red protected');
 act(s,{type:'lockGear',uid});act(s,{type:'equipGear',uid});act(s,{type:'savePreset',index:0});act(s,{type:'equipGear',uid:'g1'});
 fail(s,{type:'recycleGear',uid,confirm:true},'preset red protected');act(s,{type:'bulkRecycle',maxRarity:4});
 assert(s.bag.some(g=>g.uid===uid),'bulk recycle never consumes red');
 act(s,{type:'savePreset',index:0});assert.equal(E.modules.core.protectedGear(s,uid),false);
 fail(s,{type:'recycleGear',uid},'red requires explicit confirmation');act(s,{type:'recycleGear',uid,confirm:true});
 assert(!s.bag.some(g=>g.uid===uid));assert(s.materials.soul>100000,'red recycle returns soul');checked(s,'red safeguards');
});
test('facade JSON import validates without modifying the live save and preserves domain state',()=>{
 const s=E.createState(NOW);act(s,{type:'rename',name:'存档道友'});s.fragments.universal=7;s.wisdomTickets=2;
 const save=E.serialize(s),before=JSON.stringify(s),r=E.validate(save);
 assert.equal(r.ok,true,r.error);assert.deepEqual(r.state,JSON.parse(save));assert.equal(JSON.stringify(s),before);
 for(const corrupt of ['{bad',JSON.stringify({...s,tickets:-1}),JSON.stringify({...s,version:999})]){
  const bad=E.validate(corrupt);assert.equal(bad.ok,false);assert.equal(JSON.stringify(s),before);
 }
 const invalid=clone(s);invalid.gacha.highPity=10;assert.throws(()=>E.serialize(invalid));assert.equal(JSON.stringify(s),before);
});
test('story, cultivation, combat, economy and gacha operate through one validated facade',()=>{
 let s=E.createState(NOW);s.pills.qi0=1000;s=durableCombatFixture(s);
 const herb=C.dungeons.resource_herb;
 assert.equal(herb.layer,1);const first=win(s,'resource_herb');assert(first.first);assert(s.progress.dungeonWins.resource_herb>=1);
 raiseTo(s,5);act(s,{type:'joinSect',school:'sword'});win(s,'sect_sword_0');
 for(const id of C.dungeons.sect_sword_0.firstRewards.techniques)assert(s.techniques[id],'declared sect reward '+id);
 act(s,{type:'claimChapter',choice:'protect'});assert.equal(s.story.chapter,1);
 act(s,{type:'craftPill',id:'heal0',count:3,control:0});assert(s.stats.crafted>=3);
 raiseTo(s,7);win(s,'boss_0');
 for(const id of C.dungeons.boss_0.firstRewards.blueprints)assert(s.blueprints.includes(id),'declared boss blueprint '+id);
 for(const id of C.dungeons.boss_0.firstRewards.treasures)assert(s.ownedTreasures[id],'declared boss treasure '+id);
 raiseTo(s,10);pillFill(s);win(s,'trial');act(s,{type:'breakthrough'});assert.equal(s.paths.magic.realm,1);
 act(s,{type:'claimChapter',choice:'seek'});assert.equal(s.story.chapter,2);assert.equal(s.companions.qinglan.bond,false);
 act(s,{type:'setGachaTarget',target:'gear_body_weapon'});s.gacha.redPity=79;s.gacha.fateGuarantee=true;
 const tickets=s.tickets,draw=act(s,{type:'draw',count:1}),item=draw.data.results[0];
 assert.equal(s.tickets,tickets-1);assert.equal(item.rarity,5);assert.equal(item.id,'gear_body_weapon');
 assert.equal(s.gacha.redPity,0);assert.equal(s.gacha.fateGuarantee,false);assert.equal(s.gacha.total,1);
 assert(s.bag.some(g=>g.uid===item.uid&&g.rarity===5));act(s,{type:'equipGear',uid:item.uid});
 act(s,{type:'enhanceSlot',slot:'weapon'});assert.equal(s.slotLevels.weapon,1);
 const imported=E.validate(E.serialize(s));assert(imported.ok,imported.error);assert.equal(imported.state.story.chapter,2);assert.equal(imported.state.gacha.history.length,1);
 assert.equal(imported.state.equipped.weapon,item.uid);assert.equal(imported.state.slotLevels.weapon,1);
});
test('battle pause and JSON recovery preserve action counters, clocks and rewards',()=>{
 let s=E.createState(NOW);s=durableCombatFixture(s);act(s,{type:'startDungeon',id:'resource_herb'});
 act(s,{type:'pauseBattle',paused:true});const paused=clone(s.battle),before=JSON.stringify(s);
 const tick=E.tick(s,2);assert.equal(tick.ok,true,tick.message);assert.deepEqual(s.battle,paused);
 s=E.validate(E.serialize(s)).state;assert(s.battle.paused);
 act(s,{type:'pauseBattle',paused:false});let i=0;while(s.battle&&i++<320)E.tick(s,2);
 assert.equal(s.lastBattleResult.win,true);assert.equal(s.progress.dungeonWins.resource_herb,1);checked(s,'recovered battle rewards');
 const saved=JSON.stringify(s);assert.equal(E.tick(s,Infinity).ok,false);assert.equal(JSON.stringify(s),saved);
 assert.notEqual(before,saved);
});

test('legitimate first clear combinations do not exhaust save capacity',()=>{
 const s=E.createState(NOW);s.paths.magic={realm:5,layer:10,xp:0,reserve:0};
 const keys=[];
 for(const d of Object.values(C.dungeons).filter(d=>!['tower','trial'].includes(d.type)))for(let tier=0;tier<6;tier++)for(let difficulty=0;difficulty<3;difficulty++)keys.push(d.id+':'+tier+':'+difficulty);
 for(let floor=1;floor<=60;floor++)keys.push('tower_'+floor);
 s.progress.firstClears=[...new Set(keys)];assert(s.progress.firstClears.length>300);
 act(s,{type:'rename',name:'百境游历者'},'large legitimate clear history');checked(s,'all clear combinations');
});
test('sect completion across two tiers keeps unique school trial records',()=>{
 let s=E.createState(NOW);s.paths.magic={realm:1,layer:7,xp:0,reserve:0};s=durableCombatFixture(s);
 win(s,'sect_sword_0',{tier:0,difficulty:0});win(s,'sect_sword_0',{tier:1,difficulty:0});
 assert.equal(s.progress.sectTrials.filter(id=>id==='sect_sword_0').length,1);
 checked(s,'sect unique across tiers');
});
