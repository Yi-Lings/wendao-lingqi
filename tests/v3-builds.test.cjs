'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../web/data.js');
const K=require('../web/core.js');
const Q=require('../web/economy.js');
const E=require('../web/engine.js');
const B=require('../web/builds.js');
const Combat=require('../web/combat.js');
const Preview=require('../web/preview.js');
const NOW=1700000000000;
const clone=value=>JSON.parse(JSON.stringify(value));
const slots=Object.keys(C.slots),schools=Object.keys(C.schools);
function state(realm=1,layer=4){const s=K.createState(NOW);s.paths.magic={realm,layer,xp:0,reserve:0};s.stones=100000;s.materials.insight=10000;return s;}
function learn(s,school,level=1){Object.values(C.techniques).filter(t=>t.school===school).forEach(t=>s.techniques[t.id]={level,branch:0,spent:0,resetUsed:false});}
function gear(s,slot,set,rarity=0,tier=s.paths[s.route].realm,affixes=[]){const g={uid:'g'+s.nextUid++,slot,set,rarity,tier,affixes,special:rarity===5?set:null,awakening:0,locked:false,rerolls:0,targetMisses:0,targetId:null};s.bag.push(g);return g;}
function wearSet(s,set,count=6,rarity=2){return slots.slice(0,count).map(slot=>{const g=gear(s,slot,set,rarity);s.equipped[slot]=g.uid;return g;});}
function apply(s,plan){s.equipped=clone(plan.equipped);s.loadouts[s.route]=clone(plan.loadout);return s;}
function assertUsable(s,p){
  const u=K.unlocks(s),path=s.paths[s.route];
  slots.forEach(slot=>{if(p.equipped[slot]===null)return;const g=s.bag.find(g=>g.uid===p.equipped[slot]);assert.ok(g,'every recommendation comes from the bag');assert.equal(g.slot,slot);assert.ok(g.tier<=path.realm||s.equipped[slot]===g.uid,'new high-tier gear is never equipped');});
  for(const [field,kind,limit] of [['skills','skill',u.skillSlots],['secrets','secret',u.secretSlots]]){assert.ok(p.loadout[field].length<=limit);assert.equal(new Set(p.loadout[field]).size,p.loadout[field].length);p.loadout[field].forEach(id=>{assert.ok(s.techniques[id]);assert.equal(C.techniques[id].kind,kind);assert.ok(B.available(s,C.techniques[id]));});}
  if(p.loadout.heart){assert.ok(s.techniques[p.loadout.heart]);assert.equal(C.techniques[p.loadout.heart].kind,'heart');assert.ok(B.available(s,C.techniques[p.loadout.heart]));}
  assert.deepEqual(p.loadout.treasures,s.loadouts[s.route].treasures);assert.deepEqual(p.loadout.pills,s.loadouts[s.route].pills);
  const next=apply(clone(s),p);assert.deepEqual(p.after,K.attributes(next));assert.equal(E.validate(next).ok,true);
}

test('new player recommendation retains the actual thunder build and every owned item',()=>{
  const s=K.createState(NOW),before=clone(s),p=B.plan(s);
  assert.equal(p.school,'thunder');assert.equal(p.changed,false);assert.equal(p.canUpgrade,false);
  assert.deepEqual(p.loadout,s.loadouts.magic);assert.ok(p.summary.rotation.length>0);assert.deepEqual(p.summary.rotation,p.loadout.skills.map(id=>C.techniques[id].name));
  assert.ok(p.scoreAfter>=p.scoreBefore);assertUsable(s,p);assert.deepEqual(s,before);
});

test('every named school uses owned, unlocked heart/skills/secrets and real attributes',()=>{
  const s=state(2,4);schools.forEach(school=>{learn(s,school);slots.forEach(slot=>gear(s,slot,school,3));});
  s.ownedTreasures.t10={level:2,count:1,awakening:0};s.ownedTreasures.t1={level:1,count:1,awakening:0};s.ownedTreasures.t11={level:1,count:1,awakening:0};
  s.loadouts.magic.treasures=['t10','t1','t11'];
  const before=clone(s);
  schools.forEach(school=>{const p=B.plan(s,school);assert.equal(p.school,school);assert.equal(C.techniques[p.loadout.heart].school,school);assert.ok(p.loadout.skills.filter(id=>C.techniques[id].school===school).length>=3);assert.equal(p.gear.length,6);assertUsable(s,p);});
  assertUsable(s,B.plan(s));assert.deepEqual(s,before);
});

test('recommendations keep beneficial four-piece synergy despite a stronger isolated piece',()=>{
  const s=state(1,4);learn(s,'sword');s.loadouts.magic.heart='sword_heart_0';s.loadouts.magic.skills=['sword_skill_0','sword_skill_1','sword_skill_3','array_skill_0'];
  const set=wearSet(s,'sword',4,0),solo=gear(s,'head','shadow',1);
  assert.ok(K.gearStats(s,solo).maxHp>=K.gearStats(s,set[2]).maxHp);
  const p=B.plan(s,'sword');assert.ok(p.after.sets.sword>=4,'four-piece effect survives isolated quality increase');
  assert.equal(p.summary.set.count,p.after.sets.sword);assert.equal(p.summary.set.fourEffect,C.sets.sword.fourEffect);assertUsable(s,p);
});

test('small inventories can use a real two-piece set and leave truly missing slots empty',()=>{
  const s=state(0,4);s.bag=[];s.equipped=Object.fromEntries(slots.map(slot=>[slot,null]));
  const first=gear(s,'weapon','sword'),second=gear(s,'armor','sword');learn(s,'sword');
  const p=B.plan(s,'sword');assert.equal(p.equipped.weapon,first.uid);assert.equal(p.equipped.armor,second.uid);assert.equal(p.after.sets.sword,2);assert.equal(p.equipped.boots,null);assert.equal(p.summary.set.ownedSlots.length,2);assert.equal(p.summary.set.missingSlots.length,4);assertUsable(s,p);
});

test('future and overflow equipment are excluded, while an already worn scaled piece may be retained',()=>{
  const s=state(0,4);learn(s,'body');const future=gear(s,'head','body',5,5),overflow=gear(s,'boots','body',5,0);
  s.bag=s.bag.filter(g=>g.uid!==overflow.uid);s.rewardOverflow.push(overflow);
  const p=B.plan(s,'body');assert.notEqual(p.equipped.head,future.uid);assert.notEqual(p.equipped.boots,overflow.uid);assertUsable(s,p);
  s.equipped.head=future.uid;const kept=B.plan(s,'body');assert.equal(kept.equipped.head,future.uid);assert.match(kept.warnings.join(' '),/缩放/);assertUsable(s,kept);
});

test('current route, realm and layer restrictions apply to learned high-tier techniques',()=>{
  const s=state(2,4);schools.forEach(id=>learn(s,id));const future=gear(s,'weapon','sword',5,2);
  s.route='body';s.paths.body={realm:0,layer:1,xp:0,reserve:0};
  schools.forEach(id=>{const p=B.plan(s,id);assert.notEqual(p.equipped.weapon,future.uid);assertUsable(s,p);assert.equal(p.loadout.skills.length,2);assert.equal(p.loadout.secrets.length,0);});
  const p=B.plan(s,'shadow'),setGoal=p.goals.find(goal=>goal.kind==='set');
  assert.ok(setGoal,'the lower route still has a real set-completion goal');
  assert.equal(setGoal.source.type,'forge');assert.equal(setGoal.available,true,'ordinary equipment forging is allowed before red blueprints unlock');
  assert.ok(!setGoal.requirements.some(text=>/蓝图/.test(text)));
});

test('null hearts and zero learned techniques are safe and provide an honest acquisition goal',()=>{
  const s=state(0,1);s.techniques={};for(const route of ['magic','body'])Object.assign(s.loadouts[route],{heart:null,skills:[],secrets:[]});
  const before=clone(s);for(const school of schools){const p=B.plan(s,school);assert.equal(p.heart,null);assert.deepEqual(p.loadout.skills,[]);assert.deepEqual(p.loadout.secrets,[]);assert.ok(p.warnings.some(text=>/过渡构筑/.test(text)));assert.ok(p.goals.some(goal=>goal.kind==='heart'));assertUsable(s,p);}assert.deepEqual(s,before);
});

test('heart choice considers the actual generator/consumer mechanism instead of red rarity alone',()=>{
  const s=state(1,4);learn(s,'thunder');delete s.techniques.thunder_skill_3;
  const p=B.plan(s,'thunder');assert.equal(p.loadout.heart,'thunder_heart_0','automatic chain is useful before the consuming finisher is learned');assertUsable(s,p);
  assert.match(B.techniqueRole('thunder_heart_1').role,/天罚/);assert.ok(B.techniqueRole('thunder_heart_1').partners.includes('thunder_skill_3'));
});

test('periodic star-array estimates follow combat: no critical hit and no level-only damage scaling',()=>{
  const s=state(1,4);s.techniques={array_heart_0:{level:1,branch:0,spent:0,resetUsed:false},array_skill_3:{level:1,branch:0,spent:0,resetUsed:false}};
  for(const route of ['body','magic'])Object.assign(s.loadouts[route],{heart:'array_heart_0',skills:['array_skill_3'],secrets:[]});
  const ordinary=B.plan(s,'array');assertUsable(s,ordinary);
  s.techniques.array_skill_3.level=5;const leveled=B.plan(s,'array');assert.equal(leveled.scoreAfter,ordinary.scoreAfter,'starArray damage does not use skillPower level scaling');
  s.bag.find(g=>g.uid===s.equipped.weapon).affixes=[{id:'crit',value:.1}];const critical=B.plan(s,'array');
  assert.equal(critical.after.power,leveled.after.power);
  const basicAttackGain=Math.round(critical.after.attack*.1*(critical.after.critDamage-1)*5);
  assert.equal(critical.scoreAfter-leveled.scoreAfter,basicAttackGain,'critical chance increases basic-attack expectations but not periodic star-array damage');
});

test('a full recommendation commits gear and techniques together without fees, RNG or other route changes',()=>{
  const s=state(1,4);learn(s,'body');wearSet(s,'body',4);const p=B.plan(s,'body'),before=clone(s);
  const result=E.act(s,{type:'equipRecommendedBuild',school:'body'},NOW);assert.equal(result.ok,true,result.message);
  assert.deepEqual(s.equipped,p.equipped);assert.deepEqual(s.loadouts.magic,p.loadout);assert.deepEqual(s.loadouts.body,before.loadouts.body);
  for(const field of ['stones','jade','dust','tickets','materials','pills','techniques','bag','ownedTreasures','rngStreams'])assert.deepEqual(s[field],before[field],field+' is unchanged');
  assert.equal(E.validate(s).ok,true);
});

test('all technique labels describe existing mechanics, partners and honest transition builds',()=>{
  const s=K.createState(NOW);Object.keys(C.techniques).forEach(id=>{const role=B.techniqueRole(id,s);assert.equal(role.school,C.techniques[id].school);assert.ok(role.tags.length>=2);assert.ok(role.role.length>8);role.partners.forEach(partner=>assert.ok(C.techniques[partner]));});
  assert.match(B.techniqueRole('shadow_skill_0').role,/侵蚀/);assert.ok(!B.techniqueRole('shadow_skill_0').tags.includes('暴击'));
  assert.match(B.techniqueRole('array_skill_3').role,/布阵/);assert.ok(!B.techniqueRole('array_skill_3').tags.includes('召唤'));
  const p=B.plan(s,'sword');assert.match(p.warnings.join(' '),/过渡构筑/);assert.equal(B.techniqueRole('sword_heart_1',s).recommended,false);
});

test('acquisition guidance points to real dungeon rewards and respects current route locks',()=>{
  const s=state(0,5),p=B.plan(s,'sword');
  const missing=p.goals.find(goal=>goal.kind==='heart');assert.equal(missing.id,'sword_heart_0');assert.equal(missing.source.id,'sect_sword_0');assert.equal(missing.available,true);
  assert.ok(C.dungeons[missing.source.id].firstRewards.techniques.includes(missing.id));
  p.goals.filter(goal=>goal.source.type==='dungeon').forEach(goal=>{const actual=Combat.previewDungeon(s,{id:goal.source.id,floor:goal.source.floor});assert.equal(goal.available,actual.allowed,goal.id);if(!goal.available)assert.ok(goal.requirements.length);});
  const starter=K.createState(NOW),locked=B.plan(starter,'sword').goals.find(goal=>goal.kind==='heart');assert.equal(locked.available,false);assert.match(locked.requirements.join(' '),/炼气5层/);
});

test('tower secret guidance retains the actual milestone floor and does not imply instant claiming',()=>{
  const s=state(2,10);schools.forEach(id=>learn(s,id,11));delete s.techniques.thunder_secret_1;wearSet(s,'thunder');s.progress.tower=29;
  const p=B.plan(s,'thunder'),goal=p.goals.find(goal=>goal.id==='thunder_secret_1');assert.ok(goal);assert.equal(goal.source.id,'tower');assert.equal(goal.source.floor,30);assert.equal(goal.available,true);assert.ok(C.towerFloors[29].firstRewards.techniques.includes(goal.id));
  s.progress.tower=10;const blocked=B.plan(s,'thunder').goals.find(goal=>goal.id==='thunder_secret_1');assert.equal(blocked.available,false);assert.match(blocked.requirements.join(' '),/逐层推进/);
});

test('complete core ownership still gives real upgrade milestones and exact payable next-step costs',()=>{
  const s=state(1,4);learn(s,'sword',4);wearSet(s,'sword');
  const p=B.plan(s,'sword'),goal=p.goals.find(goal=>goal.kind==='upgrade');assert.ok(goal);assert.equal(goal.target,5);assert.equal(goal.available,true);assert.equal(goal.level,4);assert.deepEqual(goal.cost,Q.costs(s,'upgradeTechnique',{id:goal.source.id}));
  assert.equal(goal.source.type,'upgrade');assert.match(goal.reason,/分支|五级/);
  s.stones=0;const poor=B.plan(s,'sword').goals.find(goal=>goal.kind==='upgrade');assert.equal(poor.available,false);assert.match(poor.requirements.join(' '),/灵石/);
  learn(s,'sword',8);const capped=B.plan(s,'sword');assert.ok(capped.goals.every(goal=>goal.kind!=='upgrade'||goal.level<8));assert.ok(capped.goals.length>0,'max current cap still has an actionable challenge');
});

test('cached planning ignores clock-only changes, cannot be poisoned and refreshes on relevant changes',()=>{
  const s=state(1,4);learn(s,'sword');wearSet(s,'sword',4);
  const first=B.plan(s,'sword'),saved=clone(first);first.loadout.skills.length=0;first.equipped.weapon=null;first.goals.length=0;
  s.lastAt+=3000;s.revision+=1;s.paths.magic.xp+=1;assert.deepEqual(B.plan(s,'sword'),saved);
  const stronger=gear(s,'weapon','sword',5,1,[{id:'attack',value:100}]);const refreshed=B.plan(s,'sword');assert.equal(refreshed.equipped.weapon,stronger.uid);assert.ok(refreshed.after.attack>saved.after.attack);
  s.techniques.sword_heart_0.level=5;const upgraded=B.plan(s,'sword');assert.notDeepEqual(upgraded.after,refreshed.after);
});

test('auto recommendation never lowers the comparison score of a legal owned build',()=>{
  const s=state(2,4);schools.forEach(id=>{learn(s,id,5);slots.forEach(slot=>gear(s,slot,id,2));});
  const rows=[];for(const school of schools){const p=B.plan(s,school);apply(s,p);const auto=B.plan(s);assert.ok(auto.scoreAfter>=auto.scoreBefore,school);assertUsable(s,auto);rows.push([school,p.scoreAfter,auto.scoreAfter]);}
  assert.equal(rows.length,6);
});

test('one-click 4+2 recommendation is idempotent after real engine application and reload',()=>{
  // This exact public-UI failure seed generates a four-piece sword/two-piece body
  // candidate whose former object insertion order differed from validated save order.
  const s=K.createState(Date.parse('2026-10-06T13:29:20.416Z'));
  s.paths.magic={realm:2,layer:4,xp:0,reserve:0};s.paths.body={realm:1,layer:1,xp:0,reserve:0};s.training=false;s.stones=1200000;s.dust=5000;s.fragments.universal=5000;
  Object.keys(s.materials).forEach(id=>{s.materials[id]=5000;});schools.forEach(id=>learn(s,id,5));
  Object.keys(C.treasures).forEach(id=>{s.ownedTreasures[id]={level:1,count:1,awakening:0};});
  slots.forEach(slot=>{const g=Q.createGear(s,{slot,set:'body',rarity:1,tier:1});assert.ok(Q.addGear(s,g));assert.ok(E.act(s,{type:'equipGear',uid:g.uid},s.lastAt).ok);});
  schools.forEach(set=>slots.forEach(slot=>assert.ok(Q.addGear(s,Q.createGear(s,{slot,set,rarity:set==='sword'?5:3,tier:2})))));
  for(const set of ['body','thunder','shadow','array'])assert.ok(Q.addGear(s,Q.createGear(s,{slot:'weapon',set,rarity:2,tier:1})));
  assert.ok(E.act(s,{type:'setLoadout',heart:'body_heart_0',skills:['body_skill_0','body_skill_1','array_skill_0','array_skill_1'],secrets:['body_secret_0','array_secret_0'],treasures:['t10','t1','t11'],pills:['heal0','shield0','purify0']},s.lastAt).ok);
  const first=B.plan(s,'sword');assert.equal(first.changed,true);assert.equal(first.after.sets.sword,4);assert.equal(first.after.sets.body,2);
  assert.ok(E.act(s,{type:'equipRecommendedBuild',school:'sword'},s.lastAt).ok);const next=B.plan(s,'sword');
  assert.deepEqual(next.equipped,first.equipped);assert.deepEqual(next.loadout,first.loadout);assert.equal(next.scoreAfter,first.scoreAfter);assert.equal(next.changed,false);assert.equal(next.canUpgrade,false);
  const reloaded=E.validate(JSON.parse(E.serialize(s))).state,again=B.plan(reloaded,'sword');assert.equal(again.changed,false);assert.deepEqual(again.equipped,first.equipped);assert.deepEqual(again.loadout,first.loadout);
  // Property insertion order alone is never a reason to offer another commit.
  reloaded.equipped=Object.fromEntries(slots.slice().reverse().map(slot=>[slot,reloaded.equipped[slot]]));
  assert.equal(B.plan(reloaded,'sword').changed,false);
});

test('real playable-preview recommendations expose all owned candidates on the first application',()=>{
  const initial=Preview.createState(NOW);
  for(const school of ['auto',...schools]){
    const s=clone(initial),first=B.plan(s,school);assert.equal(first.changed,true);
    const result=E.act(s,{type:'equipRecommendedBuild',school},NOW);assert.equal(result.ok,true,result.message);
    const next=B.plan(s,school);assert.equal(next.changed,false,school+' must finish recommendation in one action');
    assert.deepEqual(next.equipped,first.equipped,school);assert.deepEqual(next.loadout,first.loadout,school);assert.equal(next.scoreAfter,first.scoreAfter,school);
    assertUsable(s,next);
  }
});

test('preview planning remains usable at full ownership and cached school switches',t=>{
  const s=state(2,4);schools.forEach(id=>{learn(s,id);slots.forEach(slot=>gear(s,slot,id,3));});
  const start=performance.now(),p=B.plan(s),firstMs=performance.now()-start,secondStart=performance.now();const again=B.plan(s),cachedMs=performance.now()-secondStart;
  assert.deepEqual(again,p);assertUsable(s,p);schools.forEach(id=>assertUsable(s,B.plan(s,id)));
  t.diagnostic('Full ownership planning: first '+firstMs.toFixed(1)+' ms; cached '+cachedMs.toFixed(2)+' ms (informational, no machine-dependent threshold).');
});

test('unknown school IDs fail before touching state or inventing recommendations',()=>{
  const s=state(),before=clone(s);assert.throws(()=>B.plan(s,'summoner'),/流派/);assert.throws(()=>B.plan(s,'__proto__'),/流派/);assert.equal(B.techniqueRole('missing'),null);assert.deepEqual(s,before);
});
