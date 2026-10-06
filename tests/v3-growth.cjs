'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../web/engine.js'),K=require('../web/core.js'),Q=require('../web/economy.js'),C=require('../web/data.js');
const NOW=1700000000000,copy=x=>JSON.parse(JSON.stringify(x));
function stocked(realm=0){const s=E.createState(NOW);s.paths.magic.realm=realm;s.paths.magic.layer=10;s.stones=1000000;for(const id of Object.keys(s.materials))s.materials[id]=10000;return s;}
function act(s,type,args={}){const r=E.act(s,Object.assign({type},args),NOW);assert.equal(r.ok,true,r.message);const v=K.validate(s);assert.equal(v.ok,true,v.error);return r;}
function denied(s,type,args={}){const before=copy(s),r=E.act(s,Object.assign({type},args),NOW);assert.equal(r.ok,false);assert.deepEqual(s,before);return r;}
function win(s,id,practice=false){act(s,'startDungeon',{id,tier:s.paths[s.route].realm,difficulty:0,practice});s.battle.player.attack=100000;s.battle.player.hp=s.battle.player.maxHp=100000;s.battle.player.crit=0;s.battle.player.dodge=0;for(let i=0;i<10&&s.battle;i++)E.tick(s,2);assert.equal(s.battle,null);assert.equal(s.lastBattleResult.win,true);}

test('all 48 techniques expose meaningful 5/10/15 milestones and retain old V3 growth records',()=>{
 assert.equal(Object.keys(C.techniques).length,48);
 const s=stocked(5);
 for(const t of Object.values(C.techniques)){
  assert.deepEqual(t.milestones.map(m=>m.level),[5,10,15]);assert(t.milestones.every(m=>m.description.length>20));
  for(const [level,effect,power,period] of [[4,1,1,1],[5,1,1,1],[9,1,1,1],[10,1.1,1,1],[14,1.1,1,1],[15,1.1,1.1,.9],[20,1.1,1.1,.9]]){
   s.techniques[t.id]={level,branch:0,spent:10,resetUsed:false};const m=K.techniqueEffects(s,t.id);
   assert.equal(m.effectMultiplier,effect);assert.equal(m.powerMultiplier,power);assert.equal(m.intervalMultiplier,period);
  }
 }
 const old=copy(s);delete old.learnedRecipes;delete old.recipeProvenance;delete old.battleReports;
 const v=K.validate(old);assert.equal(v.ok,true,v.error);assert.equal(v.state.techniques.thunder_skill_0.level,20);assert.deepEqual(v.state.battleReports,[]);
 act(s,'setTechniqueBranch',{id:'thunder_skill_0',branch:1});act(s,'resetTechnique',{id:'thunder_skill_0'});
 assert.equal(K.techniqueEffects(s,'thunder_skill_0').effectMultiplier,1);assert.equal(K.techniqueEffects(s,'thunder_skill_0').powerMultiplier,1);
});

test('recipe research is a deterministic paid action and unlearned craft/queue requests are atomic',()=>{
 const s=stocked(),cost=C.recipes.purify0.researchCost,before=copy(s);
 assert.deepEqual(s.learnedRecipes,['qi0','heal0']);
 denied(s,'craftPill',{id:'purify0',count:1});denied(s,'queuePill',{id:'purify0',count:1});
 assert.deepEqual(Q.costs(s,'researchRecipe',{id:'purify0'}),cost);
 act(s,'researchRecipe',{id:'purify0'});
 assert.equal(s.stones,before.stones-cost.stones);assert.equal(s.materials.insight,before.materials.insight-cost.materials.insight);
 assert.deepEqual(s.recipeProvenance.purify0,{type:'research',source:'furnace',at:NOW});
 denied(s,'researchRecipe',{id:'purify0'});act(s,'craftPill',{id:'purify0',count:1});
 assert.equal(s.pills.purify0,1);const restored=E.validate(E.serialize(s));assert.equal(restored.ok,true);assert.deepEqual(restored.state.recipeProvenance,s.recipeProvenance);
});

test('all 18 recipes have stable same-realm research without prior trials or random drops',()=>{
 for(const r of Object.values(C.recipes)){
  const s=stocked(r.realm),before=copy(s);
  if(s.learnedRecipes.includes(r.id))continue;
  assert.equal(Q.costs(s,'researchRecipe',{id:r.id}).stones,100*(r.realm+1));
  act(s,'researchRecipe',{id:r.id});assert(s.learnedRecipes.includes(r.id));
  assert.equal(s.stones,before.stones-r.researchCost.stones);
  assert.equal(s.materials.insight,before.materials.insight-r.researchCost.materials.insight);
  assert.deepEqual(s.rngStreams,before.rngStreams);assert.equal(Object.keys(s.progress.trialWins).length,0);
  act(s,'queuePill',{id:r.id,count:1});
 }
});

test('unopened recipes, invalid IDs, insufficient research materials and battle requests preserve state',()=>{
 const s=stocked();denied(s,'researchRecipe',{id:'qi1'});denied(s,'researchRecipe',{id:'missing'});denied(s,'researchRecipe',{id:'__proto__'});
 s.materials.insight=0;denied(s,'researchRecipe',{id:'purify0'});s.materials.insight=100;s.stones=0;denied(s,'researchRecipe',{id:'purify0'});
 s.stones=10000;act(s,'startDungeon',{id:'resource_herb',tier:0,difficulty:0});denied(s,'researchRecipe',{id:'purify0'});
});

test('source dungeon first clear learns its recipe, while practice and repeat rewards preserve provenance',()=>{
 const s=stocked();win(s,'resource_herb',true);assert(!s.learnedRecipes.includes('purify0'));
 win(s,'resource_herb');assert(s.learnedRecipes.includes('purify0'));assert.deepEqual(s.recipeProvenance.purify0,{type:'dungeon',source:'resource_herb',at:NOW});
 assert(s.lastBattleResult.rewards.recipes.includes('purify0'));
 const source=copy(s.recipeProvenance.purify0);win(s,'resource_herb');assert.deepEqual(s.recipeProvenance.purify0,source);
 assert.equal(s.learnedRecipes.filter(id=>id==='purify0').length,1);
});

test('owned pills can be used independently of recipe learning and gacha does not grant recipe ownership',()=>{
 const s=stocked(1);s.pills.qi1=1;assert(!s.learnedRecipes.includes('qi1'));act(s,'usePill',{id:'qi1'});assert(!s.learnedRecipes.includes('qi1'));
 const before=copy(s.learnedRecipes);s.tickets=100;act(s,'draw',{count:10});assert.deepEqual(s.learnedRecipes,before);
});

test('old V3 recipe compatibility preserves all formerly available recipes across both routes',()=>{
 const s=stocked(0);s.paths.body={realm:2,layer:1,xp:0,reserve:0};delete s.learnedRecipes;delete s.recipeProvenance;
 const v=K.validate(s);assert.equal(v.ok,true,v.error);
 const expected=Object.values(C.recipes).filter(r=>r.realm<=2).map(r=>r.id);
 assert.deepEqual(v.state.learnedRecipes,expected);for(const id of expected)assert.deepEqual(v.state.recipeProvenance[id],{type:'legacy',source:'v3',at:NOW});
 assert(!v.state.learnedRecipes.includes('heal2'));
});

test('malformed recipe IDs, duplicates, provenance and illegal job fields are rejected',()=>{
 const s=stocked();act(s,'researchRecipe',{id:'purify0'});const id=act(s,'queuePill',{id:'purify0',count:2}).data.job.id;
 for(const mutate of [
  t=>t.learnedRecipes.push('purify0'),t=>t.learnedRecipes.push('missing'),t=>delete t.recipeProvenance.purify0,
  t=>t.recipeProvenance.purify0.type='random',t=>t.recipeProvenance.purify0.source='arbitrary',t=>t.recipeProvenance.purify0.at=-1,
  t=>t.recipeProvenance.purify0.hidden=true,t=>t.recipeProvenance.shield0={type:'research',source:'furnace',at:NOW},
  t=>t.alchemy.jobs[0].hidden=1,t=>t.alchemy.jobs[0].choices=['low'],t=>t.alchemy.jobs[0].cost.stones++
 ]){const t=copy(s);mutate(t);assert.equal(K.validate(t).ok,false);}
 assert.equal(s.alchemy.jobs[0].id,id);
});

test('seven max-size alchemy jobs save real choices, refund exactly and preserve recipe-tier statistics',()=>{
 let s=stocked(5);s.facilities.furnace=10;act(s,'researchRecipe',{id:'heal2'});
 s.materials.herb=20000;
 const jobs=[];for(let i=0;i<7;i++)jobs.push(act(s,'queuePill',{id:'heal2',count:100}).data.job.id);
 denied(s,'queuePill',{id:'heal2',count:1});const first=jobs[0];act(s,'startAlchemyControl',{jobId:first});
 for(let i=0;i<3;i++){const job=s.alchemy.jobs.find(j=>j.id===first);act(s,'stokeAlchemy',{jobId:first,fire:job.rhythm[i]});}
 s=E.validate(E.serialize(s)).state;assert.equal(s.alchemy.jobs[0].choices.length,3);assert.equal(s.alchemy.jobs[0].score,3);
 act(s,'finishAlchemyJob',{jobId:first});assert.equal(s.stats.crafted,120);assert.equal(s.stats.craftedTier3,120);assert.equal(s.stats.craftedTier5||0,0);
 for(const id of jobs.slice(1)){const job=s.alchemy.jobs.find(j=>j.id===id),stones=s.stones;act(s,'cancelAlchemyJob',{jobId:id});assert.equal(s.stones,stones+job.cost.stones);}
 assert.equal(s.alchemy.jobs.length,0);assert.equal(s.stats.crafted,120);
});

test('refund capacity is checked before cancellation so prepaid materials are never silently discarded',()=>{
 const s=stocked(),id=act(s,'queuePill',{id:'heal0',count:1}).data.job.id;
 s.stones=K.CAP;denied(s,'cancelAlchemyJob',{jobId:id});s.stones-=8;s.materials.herb=K.CAP;denied(s,'cancelAlchemyJob',{jobId:id});
 s.materials.herb-=3;act(s,'cancelAlchemyJob',{jobId:id});assert.equal(s.stones,K.CAP);assert.equal(s.materials.herb,K.CAP);
});

test('complete legal clear history fits and exact 1 MiB UTF8 storage boundary is enforced',()=>{
 const s=stocked(5),keys=[];for(const id of Object.keys(C.dungeons))for(let tier=0;tier<6;tier++)for(let diff=0;diff<3;diff++)keys.push(id+':'+tier+':'+diff);
 assert(keys.length>300&&keys.length<=1000);s.progress.firstClears=keys;assert.equal(K.validate(s).ok,true);
 const duplicate=copy(s);duplicate.progress.firstClears.push(keys[0]);assert.equal(K.validate(duplicate).ok,false);
 const bytes=x=>Buffer.byteLength(JSON.stringify(x)),limit=C.limits.saveBytes;
 s.archivedNotes=[];while(bytes(s)+6003<=limit)s.archivedNotes.push('a'.repeat(6000));
 s.archivedNotes.push('');const room=limit-bytes(s);assert(room>=0&&room<=6000);s.archivedNotes[s.archivedNotes.length-1]='a'.repeat(room);
 assert.equal(bytes(s),limit);assert.equal(K.validate(s).ok,true);assert.equal(K.validate(JSON.stringify(s)).ok,true);
 s.archivedNotes[s.archivedNotes.length-1]+='a';assert.equal(bytes(s),limit+1);assert.equal(K.validate(s).ok,false);
});

test('battle reports validate their restored entry, rewards, mechanism text and latest-twenty invariant',()=>{
 const s=stocked();for(let i=0;i<21;i++){act(s,'startDungeon',{id:'resource_ore',tier:0,difficulty:0});act(s,'leaveBattle');}
 assert.equal(s.battleReports.length,20);const v=E.validate(E.serialize(s));assert.equal(v.ok,true,v.error);assert.equal(v.state.battleReports.length,20);
 const r=s.battleReports[0];assert.equal(r.outcome,'exit');assert.equal(r.entry,'resource_ore');assert.equal(r.rewards,null);
 for(const mutate of [t=>t.battleReports[0].entry='missing',t=>t.battleReports[0].at=-1,t=>t.battleReports[0].outcome='win',t=>t.battleReports[0].mechanisms=[4],t=>t.battleReports.push(copy(r))]){const t=copy(s);mutate(t);assert.equal(K.validate(t).ok,false);}
});
