'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../web/engine.js'),C=E.catalog,K=E.modules.core,Q=E.modules.economy;
const NOW=1791993600000,copy=x=>JSON.parse(JSON.stringify(x));
function full(s){s.paths[s.route].xp=K.xpNeeded(s);return s;}
function tenth(route='magic',realm=0){const s=E.createState(NOW);s.route=route;s.paths[route]={realm,layer:10,xp:0,reserve:0};return full(s);}
function checked(s){const v=E.validate(s);assert.equal(v.ok,true,v.error);return v.state;}
function addGear(s,slot,set,rarity=0,tier=0){const g=Q.createGear(s,{slot,set,rarity,tier});assert.equal(Q.addGear(s,g),true);return g;}

test('journey is read-only and gives a legal next target at all 120 growth nodes',()=>{
 for(const route of ['body','magic'])for(let realm=0;realm<6;realm++)for(let layer=1;layer<=10;layer++){
  const s=E.createState(NOW);s.route=route;s.paths[route]={realm,layer,xp:0,reserve:0};checked(s);
  const before=JSON.stringify(s),j=E.journey(s);
  assert.equal(JSON.stringify(s),before,route+' '+realm+':'+layer+' leaves save and RNG unchanged');
  assert(j.primary.title&&j.primary.label);
  assert(j.goals.some(g=>g.id===j.primary.id));assert.equal(new Set(j.goals.map(g=>g.id)).size,j.goals.length);
  const t=j.primary.target;
  if(t.kind==='action'){const candidate=copy(s),r=E.act(candidate,{type:t.type,...t.payload},NOW);assert.equal(r.ok,true,r.message);}
  if(t.kind==='ui'&&t.type==='source'){const entry=E.dungeonView(s,t.payload.id);assert.equal(entry.locked,false,entry.lockReason);}
  assert(j.nextUnlock===null||j.nextUnlock.rank>K.pathRank(s));
 }
});
test('journey shows an earned layer advance and uses the active route only',()=>{
 const s=full(E.createState(NOW));assert.equal(E.journey(s).primary.id,'level-up');
 s.paths.body={realm:4,layer:10,xp:0,reserve:0};s.paths.body.xp=K.xpNeeded(s,'body');
 assert.equal(E.journey(s).primary.id,'level-up');
 s.route='body';assert.equal(E.journey(s).primary.id,'trial');
 assert.equal(E.journey(s).checks.length,3);
});
test('tenth-layer guidance requires full XP, then trial, then exact materials, then breakthrough',()=>{
 const s=tenth();s.paths.magic.xp=0;assert.notEqual(E.journey(s).primary.id,'trial');
 full(s);assert.equal(E.journey(s).primary.id,'trial');
 s.progress.trialWins['magic:0']=true;s.stones=0;s.materials.ore=0;s.materials.lotus=0;
 let j=E.journey(s);assert.equal(j.primary.id,'material:stones');
 assert.deepEqual(j.missing.map(x=>[x.id,x.shortage]),[['stones',50],['lotus',3],['ore',3]]);
 s.stones=50;s.materials.lotus=3;s.materials.ore=3;
 j=E.journey(s);assert.equal(j.primary.id,'breakthrough');assert(j.checks.every(x=>x.done));
 assert.equal(E.act(s,{type:'breakthrough'},NOW).ok,true);assert.equal(s.paths.magic.realm,1);
 assert.notEqual(E.journey(s).primary.id,'breakthrough');
});
test('breakthrough guidance respects the alternative pill cost and never spends it in a preview',()=>{
 const s=tenth();s.progress.trialWins['magic:0']=true;s.stones=0;s.pills.break0=1;
 const before=JSON.stringify(s),j=E.journey(s);assert.equal(j.missing.length,0);
 assert.equal(j.primary.id,'breakthrough');assert.equal(JSON.stringify(s),before);
});
test('terminal guidance uses endingTrials and cannot propose a seventh realm',()=>{
 for(const route of ['body','magic']){
  const s=tenth(route,5);s.progress.trialWins[route+':5']=true;
  assert.equal(E.journey(s).primary.id,'trial');assert.equal(E.journey(s).checks.length,2);
  s.progress.endingTrials[route]=true;
  assert.equal(E.journey(s).primary.id,'finale');assert.equal(E.journey(s).nextUnlock,null);
  assert(!E.journey(s).goals.some(g=>g.target.type==='breakthrough'));
  s.story.chapter=6;s.story.completed=[0,1,2,3,4,5];s.story.ending=copy(C.endings.guardian);
  assert.equal(E.journey(s).primary.target.kind,'page');
 }
});
test('ongoing battles, exploration and joint practice override growth actions',()=>{
 const s=full(E.createState(NOW));assert.equal(E.act(s,{type:'startDungeon',id:'resource_herb'},NOW).ok,true);
 assert.equal(E.journey(s).primary.target.kind,'encounter');assert.equal(E.journey(s).goals.length,1);
 s.battle=null;s.exploration={};assert.equal(E.journey(s).primary.id,'encounter');
 s.exploration=null;s.joint={};assert.equal(E.journey(s).primary.id,'encounter');
});
test('paused cultivation gives a restart action and supplemental goals reflect real rewards',()=>{
 const s=E.createState(NOW);s.training=false;s.wisdomTickets=2;s.paths.magic.layer=3;
 const j=E.journey(s);assert.equal(j.primary.target.type,'setTraining');assert.equal(j.etaSeconds,null);
 assert(j.goals.some(x=>x.id==='wisdom'));assert(j.goals.some(x=>x.id==='auto-small'));
 s.autoSmall=true;s.wisdomTickets=0;assert(!E.journey(s).goals.some(x=>['wisdom','auto-small'].includes(x.id)));
});
test('pill guidance chooses an owned legal pill and leaves high-realm pills out of early growth',()=>{
 const s=E.createState(NOW);s.pills.qi0=0;s.pills.qi2=2;
 assert.equal(E.journey(s).primary.id,'cultivate');
 s.pills.qi0=1;assert.equal(E.journey(s).primary.target.payload.id,'qi0');
 assert.equal(E.journey(s).etaSeconds,75);
});
test('equipment recommendation finds a two-piece synergy that single-piece scoring misses',()=>{
 const s=E.createState(NOW),g=addGear(s,'weapon','body');
 assert.deepEqual(K.gearStats(s,g),K.gearStats(s,s.bag[0]));
 const before=JSON.stringify(s),plan=E.recommendEquipment(s);
 assert.equal(JSON.stringify(s),before);assert.equal(plan.equipped.weapon,g.uid);
 assert(plan.delta.power>0);assert(plan.gained.some(x=>x.id==='body:2'));
 const r=E.act(s,{type:'autoEquip',expected:{from:plan.from,equipped:plan.equipped}},NOW);
 assert.equal(r.ok,true,r.message);assert.equal(K.attributes(s).power,plan.after.power);checked(s);
});
test('equal-power alternatives keep the existing equipment identity',()=>{
 const s=E.createState(NOW);addGear(s,'weapon','thunder');addGear(s,'armor','body');
 const plan=E.recommendEquipment(s);assert.deepEqual(plan.equipped,s.equipped);assert.equal(plan.changes.length,0);
});
test('recommendations do not reduce whole-build panel power across mixed bags and both routes',()=>{
 for(const route of ['body','magic'])for(let realm=0;realm<6;realm++){
  const s=E.createState(NOW);s.route=route;s.paths[route].realm=realm;
  for(const slot of Object.keys(C.slots))for(const set of Object.keys(C.sets))addGear(s,slot,set,(realm+Object.keys(C.sets).indexOf(set))%6,(realm+2)%6);
  const before=JSON.stringify(s),plan=E.recommendEquipment(s);
  assert.equal(JSON.stringify(s),before);assert(plan.after.power>=K.attributes(s).power);
  const r=E.act(s,{type:'autoEquip'},NOW);assert.equal(r.ok,true,r.message);checked(s);
  assert.equal(K.attributes(s).power,plan.after.power);
 }
});
test('stale reviewed recommendations reject changes atomically',()=>{
 const s=E.createState(NOW);addGear(s,'weapon','body');const plan=E.recommendEquipment(s);
 addGear(s,'weapon','sword',5,0);const before=JSON.stringify(s);
 const r=E.act(s,{type:'autoEquip',expected:{from:plan.from,equipped:plan.equipped}},NOW);
 assert.equal(r.ok,false);assert.match(r.message,/重新/);assert.equal(JSON.stringify(s),before);
});
test('equipment comparisons include lost set bonuses and red effects without modifying state',()=>{
 const s=E.createState(NOW),body=addGear(s,'weapon','body'),red=addGear(s,'head','sword',5),other=addGear(s,'head','array',5);
 s.equipped.weapon=body.uid;s.equipped.head=red.uid;const replacement=addGear(s,'weapon','thunder');
 const before=JSON.stringify(s),c=E.compareEquipment(s,replacement.uid);
 assert(c.lost.some(x=>x.id==='body:2'));assert.equal(c.after.power,K.attributes({...s,equipped:c.equipped}).power);
 assert(E.compareEquipment(s,other.uid).lost.some(x=>x.id==='red:sword'));assert.equal(JSON.stringify(s),before);
 assert.equal(E.compareEquipment(s,'missing'),null);
});
test('bulk recycle preview protects equipment, locks, both-route presets, pending rolls and reds',()=>{
 const s=E.createState(NOW),lock=addGear(s,'head','body',1),preset=addGear(s,'boots','sword',2),pending=addGear(s,'charm','array',2),free=addGear(s,'bracer','shadow',2);
 addGear(s,'weapon','sword',5);lock.locked=true;
 s.presets.body[0]={loadout:copy(s.loadouts.body),equipped:{...s.equipped,boots:preset.uid}};
 s.rerollPending={uid:pending.uid,affixes:copy(pending.affixes),target:null,targetMisses:0};checked(s);
 const before=JSON.stringify(s),preview=E.recyclePreview(s,4);
 assert.equal(JSON.stringify(s),before);assert.deepEqual(preview.uids,[free.uid]);assert.equal(preview.count,1);
 const old={stones:s.stones,dust:s.dust};const r=E.act(s,{type:'bulkRecycle',maxRarity:4,uids:preview.uids},NOW);
 assert.equal(r.ok,true,r.message);assert.equal(s.stones-old.stones,preview.rewards.stones);assert.equal(s.dust-old.dust,preview.rewards.dust);checked(s);
});
test('recycle previews report currency caps accurately and empty previews remain safe',()=>{
 const s=E.createState(NOW);addGear(s,'head','sword',2);s.stones=1e12-4;s.dust=1e12-1;
 const preview=E.recyclePreview(s,2);assert.deepEqual(preview.rewards,{stones:4,dust:1});
 assert.equal(E.act(s,{type:'bulkRecycle',maxRarity:2,uids:preview.uids},NOW).ok,true);assert.equal(s.stones,1e12);assert.equal(s.dust,1e12);
 assert.equal(E.recyclePreview(s,2).count,0);assert.equal(E.recyclePreview(s,5),null);
});
test('locking an item after review rejects an outdated recycle list without spending or deleting',()=>{
 const s=E.createState(NOW),g=addGear(s,'boots','body',1),preview=E.recyclePreview(s,2);
 assert.equal(E.act(s,{type:'lockGear',uid:g.uid},NOW).ok,true);const before=JSON.stringify(s);
 const r=E.act(s,{type:'bulkRecycle',maxRarity:2,uids:preview.uids},NOW);
 assert.equal(r.ok,false);assert.match(r.message,/重新预览/);assert.equal(JSON.stringify(s),before);
});
test('battle-time recommendation application remains blocked and existing V3 saves roundtrip',()=>{
 const s=E.createState(NOW);assert.equal(E.act(s,{type:'startDungeon',id:'resource_herb'},NOW).ok,true);
 const before=JSON.stringify(s);assert.equal(E.act(s,{type:'autoEquip'},NOW).ok,false);assert.equal(JSON.stringify(s),before);
 assert.equal(JSON.parse(E.serialize(s)).version,3);checked(s);
});
