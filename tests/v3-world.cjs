'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../web/engine.js'),C=E.catalog,K=E.modules.core;
const NOW=1792022400000,copy=x=>JSON.parse(JSON.stringify(x));
function fixture(route='magic',rank=59){const s=E.createState(NOW);s.route=route;s.paths[route]={realm:Math.floor(rank/10),layer:rank%10+1,xp:0,reserve:0};s.progress.dungeonWins.resource_herb=1;s.materials.herb=1000;s.stones=100000;return s;}
function valid(s){const r=E.validate(s);assert(r.ok,r.error);return r.state;}
function act(s,type,args={}){const r=E.act(s,{type,...args},s.lastAt);assert(r.ok,r.message);valid(s);return r;}
function fail(s,type,args={}){const before=JSON.stringify(s),r=E.act(s,{type,...args},s.lastAt);assert.equal(r.ok,false);assert.equal(JSON.stringify(s),before);return r;}

test('world catalog contains six original regions, eighteen unique events and three explicit choices each',()=>{
 assert.equal(C.regions.length,6);assert.equal(C.worldEvents.length,18);assert.equal(new Set(C.worldEvents.map(x=>x.id)).size,18);
 for(const e of C.worldEvents){assert.equal(e.choices.length,3);assert.equal(new Set(e.choices.map(x=>x.id)).size,3);assert(e.description.length>10);
  assert(e.choices.some(x=>Object.keys(x.cost).length===0),'at least one resource-free path');
  for(const c of e.choices){assert(c.label&&c.outcome);assert(C.daoPaths[c.id]);assert(Object.keys(c.reward).length);}
 }
});
test('world view and preparation are pure across 120 progression nodes on both routes',()=>{
 for(const route of ['magic','body'])for(let rank=0;rank<60;rank++){
  const s=fixture(route,rank),before=JSON.stringify(s),v=E.worldView(s),p=E.preparation(s);
  assert.equal(JSON.stringify(s),before);assert.equal(v.events.length,18);assert.equal(v.regions.length,6);assert.equal(p.roles.length,4);
  assert(v.events.filter(x=>x.available).every(x=>x.realm*10+x.layer-1<=rank));
 }
});
test('each of the 54 event choices resolves on both routes with exact costs, rewards and single marks',()=>{
 for(const route of ['body','magic'])for(const event of C.worldEvents)for(const choice of event.choices){
  const s=fixture(route);for(const previous of C.worldEvents.filter(x=>x.realm===event.realm&&x.id!==event.id)){
   if(previous.id===event.id)break;
   if(C.worldEvents.indexOf(previous)>=C.worldEvents.indexOf(event))break;
   act(s,'resolveEncounter',{id:previous.id,choice:'insight'});
  }
  const before=copy(s),r=act(s,'resolveEncounter',{id:event.id,choice:choice.id});
  assert.equal(s.stones,before.stones-(choice.cost.stones||0)+(choice.reward.stones||0));
  for(const id of Object.keys(s.materials))assert.equal(s.materials[id],before.materials[id]-(choice.cost.materials?.[id]||0)+(choice.reward.materials?.[id]||0),event.id+' '+id);
  assert.equal(s.paths[route].xp+s.paths[route].reserve-before.paths[route].xp-before.paths[route].reserve,choice.reward.xp);
  assert.equal(s.wanderings.records.length,before.wanderings.records.length+1);assert.equal(E.daoInsight(s).marks[choice.id],E.daoInsight(before).marks[choice.id]+1);
  assert.deepEqual(s.rngStreams,before.rngStreams);assert.equal(r.data.mark,choice.id);
  fail(s,'resolveEncounter',{id:event.id,choice:choice.id});
 }
});
test('event eligibility checks active route, exact layer, predecessor and actual first-dungeon win',()=>{
 const s=fixture('magic',1);s.progress.dungeonWins={};
 fail(s,'resolveEncounter',{id:'bridge_lantern',choice:'insight'});s.paths.magic.layer=3;
 fail(s,'resolveEncounter',{id:'bridge_lantern',choice:'insight'});s.progress.dungeonWins.resource_herb=1;
 act(s,'resolveEncounter',{id:'bridge_lantern',choice:'insight'});fail(s,'resolveEncounter',{id:'village_well',choice:'insight'});
 s.paths.magic.layer=5;act(s,'resolveEncounter',{id:'village_well',choice:'insight'});
 s.paths.magic.layer=8;act(s,'resolveEncounter',{id:'mountain_bell',choice:'insight'});
 s.route='body';s.paths.magic={realm:5,layer:10,xp:0,reserve:0};fail(s,'resolveEncounter',{id:'lake_ferry',choice:'insight'});
});
test('poor players retain a legal free path and failed paid choices are atomic',()=>{
 const s=fixture('magic',2);s.stones=0;s.materials.herb=0;
 fail(s,'resolveEncounter',{id:'bridge_lantern',choice:'resolve'});fail(s,'resolveEncounter',{id:'bridge_lantern',choice:'compassion'});
 act(s,'resolveEncounter',{id:'bridge_lantern',choice:'insight'});assert.equal(s.wanderings.records.length,1);
});
test('all 18 events can be completed once, records survive serialization and late revisits stay at event-tier rewards',()=>{
 const s=fixture();for(const event of C.worldEvents)act(s,'resolveEncounter',{id:event.id,choice:'insight'});
 const v=E.worldView(s);assert.equal(v.completed,18);assert.equal(v.available,0);assert(v.regions.every(x=>x.completed===3));
 assert.deepEqual(JSON.parse(E.serialize(s)).wanderings,s.wanderings);assert.equal(E.daoInsight(s).marks.insight,18);
 assert.equal(C.worldEvents[0].choices[2].reward.materials.insight,3);assert(!C.worldEvents.some(e=>e.choices.some(c=>Object.keys(c.reward.materials||{}).some(id=>id.startsWith('crystal')))));
});
test('dao stance preserves all choices and activates only the selected mark bonuses in actual attributes',()=>{
 const s=fixture('magic',7),base=E.attributes(s);
 act(s,'resolveEncounter',{id:'bridge_lantern',choice:'resolve'});
 act(s,'resolveEncounter',{id:'village_well',choice:'compassion'});
 act(s,'resolveEncounter',{id:'mountain_bell',choice:'insight'});
 const marks=copy(E.daoInsight(s).marks),records=copy(s.wanderings.records);
 act(s,'setDaoStance',{id:'resolve'});let a=E.attributes(s);assert(a.attack>=base.attack);assert.equal(a.crit,base.crit+.001);assert.equal(a.mpRegen,base.mpRegen);
 act(s,'setDaoStance',{id:'compassion'});a=E.attributes(s);assert(a.maxHp>=base.maxHp);assert.equal(a.crit,base.crit);
 act(s,'setDaoStance',{id:'insight'});a=E.attributes(s);assert.equal(a.mpRegen,base.mpRegen+.04);assert.equal(a.penetration,base.penetration+.002);
 assert.deepEqual(E.daoInsight(s).marks,marks);assert.deepEqual(s.wanderings.records,records);
});
test('real battles receive active dao bonuses and do not allow switching or event rewards mid-fight',()=>{
 const s=fixture('magic',2);act(s,'resolveEncounter',{id:'bridge_lantern',choice:'insight'});
 const a=E.attributes(s);act(s,'startDungeon',{id:'resource_herb'});
 assert.equal(s.battle.player.mpRegen,a.mpRegen);assert.equal(s.battle.player.penetration,a.penetration);
 fail(s,'setDaoStance',{id:'resolve'});fail(s,'resolveEncounter',{id:'village_well',choice:'insight'});
});
test('exploration and joint practice also block stance and world resolution',()=>{
 for(const key of ['exploration','joint']){const s=fixture();s[key]={};fail(s,'setDaoStance',{id:'resolve'});fail(s,'resolveEncounter',{id:'bridge_lantern',choice:'insight'});}
});
test('legacy V3 saves with no world extension load unchanged in attributes and receive an empty journal',()=>{
 const s=fixture('magic',2),before=E.attributes(s);delete s.wanderings;
 const loaded=valid(s);assert.deepEqual(loaded.wanderings,{stance:'insight',records:[]});assert.deepEqual(E.attributes(loaded),before);
});
test('malformed journals, illegal IDs, duplicates, impossible ranks and broken event order cannot import',()=>{
 const s=fixture();act(s,'resolveEncounter',{id:'bridge_lantern',choice:'insight'});
 const mutations=[x=>x.wanderings=null,x=>x.wanderings.stance='__proto__',x=>x.wanderings.extra=1,x=>x.wanderings.records[0].choice='none',x=>x.wanderings.records[0].reward=999,x=>x.wanderings.records.push(copy(x.wanderings.records[0])),x=>x.wanderings.records[0].rank=1,x=>x.wanderings.records[0].rank=60,x=>x.wanderings.records[0].at=-1,x=>x.wanderings.records[0].route='other',x=>x.wanderings.records[0].id='village_well',x=>x.progress.dungeonWins.resource_herb=0];
 for(const mutate of mutations){const candidate=copy(s);mutate(candidate);assert.equal(E.validate(candidate).ok,false);}
 const low=copy(s);low.paths.magic={realm:0,layer:3,xp:0,reserve:0};assert.equal(E.validate(low).ok,false,'history cannot exceed recorded route progression');
});
test('unknown event IDs, options and dao identities never mutate resources or RNG',()=>{
 const s=fixture();for(const id of ['none','__proto__',null])fail(s,'resolveEncounter',{id,choice:'insight'});
 fail(s,'resolveEncounter',{id:'bridge_lantern',choice:'none'});fail(s,'setDaoStance',{id:'constructor'});fail(s,'setDaoStance',{id:'insight'});
});
test('world rewards respect inventory caps and still cannot be replayed',()=>{
 const s=fixture('magic',2);s.paths.magic.xp=K.xpNeeded(s);s.paths.magic.reserve=1e12;s.materials.insight=1e12;
 act(s,'resolveEncounter',{id:'bridge_lantern',choice:'insight'});assert.equal(s.materials.insight,1e12);assert(s.paths.magic.xp+s.paths.magic.reserve<=1e12);
 fail(s,'resolveEncounter',{id:'bridge_lantern',choice:'insight'});
});
test('preparation distinguishes equipped skills, owned usable pills and unavailable inventory',()=>{
 const s=fixture('magic',2);let p=E.preparation(s);assert.equal(p.roles.find(x=>x.id==='heal').ready,true);assert.equal(p.roles.find(x=>x.id==='purify').ready,false);
 s.pills.purify0=2;p=E.preparation(s);assert(p.roles.find(x=>x.id==='purify').ready);
 s.loadouts.magic.skills=['body_skill_1','array_skill_0'];assert(E.preparation(s).roles.find(x=>x.id==='shield').ready);
 s.pills.purify0=0;assert(!E.preparation(s).roles.find(x=>x.id==='purify').ready);
});
test('journey exposes an available world encounter without replacing the immediate growth action',()=>{
 const s=fixture('magic',2),j=E.journey(s);assert(j.goals.some(g=>g.id==='world:bridge_lantern'));assert.notEqual(j.primary.id,'world:bridge_lantern');
 act(s,'resolveEncounter',{id:'bridge_lantern',choice:'insight'});assert(!E.journey(s).goals.some(g=>g.id==='world:bridge_lantern'));
});
test('a real new account can reach and resolve its first encounter with legal growth and combat actions',()=>{
 const s=E.createState(NOW);act(s,'usePill',{id:'qi0'});act(s,'levelUp');
 E.advance(s,s.lastAt+120000);act(s,'levelUp');assert.equal(s.paths.magic.layer,3);
 act(s,'startDungeon',{id:'resource_herb'});let steps=0;while(s.battle&&steps++<400)E.tick(s,2);
 assert(s.lastBattleResult.win,'first real battle wins');act(s,'resolveEncounter',{id:'bridge_lantern',choice:'insight'});
 assert.equal(s.wanderings.records.length,1);assert.equal(s.stats.manualWins,1);valid(s);
});
