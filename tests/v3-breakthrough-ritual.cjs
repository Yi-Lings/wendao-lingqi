'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const K=require('../web/core.js'),C=require('../web/data.js'),R=require('../web/breakthrough-ritual.js');
const NOW=1791244800000,copy=x=>JSON.parse(JSON.stringify(x));
function prepared(realm=0,route='magic'){
 const s=K.createState(NOW);s.route=route;s.paths[route]={realm,layer:10,xp:C.layerXp[9]*C.realmXpFactors[realm],reserve:0};
 for(const id of Object.keys(s.materials))s.materials[id]=1000;
 s.pills['break'+realm]=2;R.normalize(s);R.validate(s);return s;
}
function act(s,type,args={}){const r=R.handle(s,{type,...args},NOW);assert(r&&r.ok,JSON.stringify({type,...args})+': '+(r&&r.message));R.validate(s);return r;}
function denied(s,type,args={}){const before=copy(s),r=R.handle(s,{type,...args},NOW);assert(r&&!r.ok);assert.deepEqual(s,before);return r;}
function advanceToHeart(s){
 act(s,'beginRitual');
 for(let i=0;i<3;i++)act(s,'ritualBreath',{choice:R.view(s).cue.expected});
 for(let i=0;i<3;i++)act(s,'ritualRune',{choice:R.view(s).cue.expected});
 assert.equal(R.view(s).stage,'heart');
}
function advanceToTrial(s,choice='protect'){advanceToHeart(s);act(s,'ritualResolve',{choice});act(s,'continueRitual');assert.equal(R.view(s).stage,'trial');}
function win(s){s.progress.trialWins[s.route+':'+s.paths[s.route].realm]=true;if(s.paths[s.route].realm===5)s.progress.endingTrials[s.route]=true;}
function wallet(s){return copy({stones:s.stones,materials:s.materials,pills:s.pills,rngStreams:s.rngStreams});}

test('mandatory breakthrough pill and every array material are checked before any payment',()=>{
 const s=prepared(),before=wallet(s);s.pills.break0=0;s.stones=1e12;
 const fail=denied(s,'beginRitual');assert.match(fail.message,new RegExp(C.recipes.break0.name));assert.equal(s.ritual,null);
 s.pills.break0=2;s.materials.ore=2;denied(s,'beginRitual');assert.equal(s.pills.break0,2);assert.equal(s.materials.lotus,before.materials.lotus);
 s.materials.ore=1000;s.materials.lotus=2;denied(s,'beginRitual');assert.equal(s.pills.break0,2);
 s.materials.lotus=1000;const money=wallet(s),r=act(s,'beginRitual');
 assert.deepEqual(r.data.cost,{pills:{break0:1},materials:{lotus:3,ore:3}});
 assert.equal(s.pills.break0,money.pills.break0-1);assert.equal(s.materials.lotus,money.materials.lotus-3);assert.equal(s.materials.ore,money.materials.ore-3);
 assert.equal(s.stones,money.stones);assert.deepEqual(s.rngStreams,money.rngStreams);denied(s,'beginRitual');
});

test('nonfull cultivation and active activity cannot begin or advance an immersion ritual',()=>{
 for(const change of [s=>s.paths.magic.layer=9,s=>s.paths.magic.xp--,s=>s.battle={active:true},s=>s.exploration={active:true}]){
  const s=prepared();change(s);denied(s,'beginRitual');
 }
 const s=prepared();act(s,'beginRitual');s.battle={active:true};denied(s,'ritualBreath',{choice:'inhale'});denied(s,'cancelRitual');
 s.battle=null;s.exploration={active:true};denied(s,'cancelRitual');
});

test('guided breathing and rune reading require their own sequences; mistakes only reset the current exercise',()=>{
 const s=prepared();act(s,'beginRitual');const paid=wallet(s);
 denied(s,'ritualRune',{choice:'wood'});denied(s,'ritualResolve',{choice:'protect'});denied(s,'continueRitual');
 act(s,'ritualBreath',{choice:'inhale'});assert.equal(s.ritual.breathStep,1);
 assert.equal(act(s,'ritualBreath',{choice:'exhale'}).data.correct,false);assert.equal(s.ritual.breathStep,0);
 for(const choice of ['inhale','hold','exhale'])act(s,'ritualBreath',{choice});
 assert.equal(s.ritual.phase,'array');assert.equal(s.ritual.breathStep,3);
 const v=R.view(s);assert.match(v.cue.text,/青木.*雨水.*厚土/);
 act(s,'ritualRune',{choice:'wood'});assert.equal(s.ritual.arrayStep,1);
 assert.equal(act(s,'ritualRune',{choice:'metal'}).data.correct,false);assert.equal(s.ritual.arrayStep,0);assert.equal(s.ritual.breathStep,3);
 for(const choice of ['wood','water','earth'])act(s,'ritualRune',{choice});
 assert.equal(s.ritual.phase,'heart');assert.deepEqual(wallet(s),paid);
});

test('a heart choice opens a consequence scene and requires conscious continuation before trial readiness',()=>{
 const s=prepared();advanceToHeart(s);const v=R.view(s);assert.equal(v.choices.length,3);assert.match(v.narration[0],/山路.*呼救.*道基/);
 for(const c of v.choices)assert(c.label.length>3&&c.description.length>10);
 denied(s,'continueRitual');act(s,'ritualResolve',{choice:'truth'});
 const consequence=R.view(s);assert.equal(consequence.stage,'heart');assert.equal(consequence.canTrial,false);assert.equal(consequence.canContinue,true);
 assert.equal(consequence.narration.length,2);assert(consequence.narration.every(p=>p.length>35));assert.equal(consequence.choices.length,0);
 denied(s,'ritualResolve',{choice:'protect'});act(s,'continueRitual');assert.equal(R.view(s).canTrial,true);assert.equal(s.ritual.heartRead,true);
 assert.equal(R.view(s).canBreakthrough,false,'the narrative preparation is not a fabricated trial win');
});

test('all six realms and both routes retain distinct immersive scenes, rune clues and target labels',()=>{
 const titles=new Set(),hints=new Set(),questions=new Set(),sequences=new Set();
 for(let realm=0;realm<6;realm++)for(const route of ['magic','body']){
  const s=prepared(realm,route),v=R.view(s);assert(v.canBegin);assert.equal(v.mandatoryPill.id,'break'+realm);
  assert.equal(v.currentLabel,C.routes[route].realmNames[realm]);assert.equal(v.targetLabel,C.routes[route].realmNames[Math.min(5,realm+1)]);
  assert.equal(v.terminal,realm===5);assert.equal(v.introduction.length,3);assert(v.introduction.every(p=>p.length>30));
  titles.add(v.title);advanceToHeart(s);const h=R.view(s);hints.add(R.view(s).sequenceLabels.join('/'));questions.add(h.narration[0]);sequences.add(h.sequence.join('/'));
  assert.equal(s.ritual.reserved.materials.lotus,3+realm*2);assert.equal(s.ritual.reserved.materials.ore,3+realm*3);
 }
 assert.equal(titles.size,6);assert.equal(hints.size,6);assert.equal(questions.size,6);assert.equal(sequences.size,6);
});

test('actual recipe, resource and market guidance avoids requiring the not-yet-accessible trial for its own pill',()=>{
 for(let realm=0;realm<6;realm++){
  const s=prepared(realm);s.pills['break'+realm]=0;const v=R.view(s),recipe=C.recipes['break'+realm];
  assert.deepEqual(v.mandatoryPill.researchCost,recipe.researchCost);assert.deepEqual(v.mandatoryPill.craftCost,{stones:recipe.stones,materials:recipe.materials});
  assert.match(v.requirements[0].source.description,/无需先通过突破试炼/);
  for(const req of v.requirements.filter(x=>x.kind==='material'))assert.equal(req.name,C.materials[req.id].name);
  for(const row of v.craftingMaterials){
   const research=s.learnedRecipes.includes(recipe.id)?0:recipe.researchCost.materials[row.id]||0;
   assert.equal(row.required,recipe.materials[row.id]+research+(s.ritual?.reserved.materials[row.id]||{lotus:3+realm*2,ore:3+realm*3}[row.id]||0));
   assert(C.dungeons[row.source.id]);
  }
  assert(v.materialGuide.some(g=>g.type==='market'&&/灵玉.*天道尘/.test(g.description)));
 }
});

test('every preparation phase restores across serialization and cancelling refunds all reservations exactly once',()=>{
 for(const phase of ['breath','array','heart','trial']){
  let s=prepared(2),before=wallet(s);act(s,'beginRitual');
  if(phase!=='breath')for(let i=0;i<3;i++)act(s,'ritualBreath',{choice:R.view(s).cue.expected});
  if(['heart','trial'].includes(phase))for(let i=0;i<3;i++)act(s,'ritualRune',{choice:R.view(s).cue.expected});
  if(phase==='trial'){act(s,'ritualResolve',{choice:'promise'});act(s,'continueRitual');}
  const saved=copy(s);s=copy(saved);R.normalize(s);R.validate(s);assert.deepEqual(s,saved);assert.equal(R.view(s).stage,phase);
  const result=act(s,'cancelRitual');assert.deepEqual(result.data.refund,{pills:{break2:1},materials:{lotus:7,ore:9}});assert.deepEqual(wallet(s),before);
  denied(s,'cancelRitual');assert.equal(s.ritual,null);
 }
});

test('refund capacity is prechecked across all materials without truncation or partial refund',()=>{
 for(const field of ['pill','lotus','ore']){
  const s=prepared();act(s,'beginRitual');if(field==='pill')s.pills.break0=C.limits.number;else s.materials[field]=C.limits.number;
  denied(s,'cancelRitual');assert(s.ritual);if(field==='pill')s.pills.break0--;else s.materials[field]-=3;
  act(s,'cancelRitual');assert.equal(s.ritual,null);
 }
});

test('trial failure allows retry without another charge and real victory archives the actual heart answer',()=>{
 const s=prepared();advanceToTrial(s,'promise');const paid=wallet(s);assert(R.view(s).canTrial);
 s.lastBattleResult={win:false,type:'trial'};assert.equal(R.view(s).stage,'trial');assert(R.view(s).canTrial);assert.deepEqual(wallet(s),paid);
 win(s);assert.equal(R.view(s).stage,'ready');assert(R.view(s).canBreakthrough);assert.equal(R.remember(s,NOW+1000),true);
 assert.deepEqual(s.ritualHistory,[{route:'magic',realm:0,choice:'promise',at:NOW+1000}]);assert.equal(R.remember(s,NOW+2000),false);
 s.paths.magic={realm:1,layer:1,xp:0,reserve:0};s.ritual=null;R.validate(s);assert.match(R.view(s).history[0].answer,/约定/);assert.deepEqual(wallet(s),paid);
});

test('terminal realm needs the real final trial plus an epilogue and cannot fabricate a seventh realm or refund completed cost',()=>{
 const s=prepared(5);advanceToTrial(s,'truth');denied(s,'finishRitual');s.progress.trialWins['magic:5']=true;denied(s,'finishRitual');
 s.progress.endingTrials.magic=true;const v=R.view(s);assert(v.canFinish);assert.equal(v.canBreakthrough,false);assert.equal(v.narration.length,2);
 act(s,'finishRitual');assert.equal(R.view(s).stage,'complete');assert.equal(s.ritualHistory[0].choice,'truth');assert.equal(s.paths.magic.realm,5);
 denied(s,'finishRitual');denied(s,'cancelRitual');assert.equal(s.ritualHistory.length,1);
});

test('terminal completion can be archived for the other route only after its entire new reservation passes',()=>{
 const s=prepared(5);advanceToTrial(s,'protect');win(s);act(s,'finishRitual');const completed=copy(s.ritual);
 s.route='body';s.paths.body={realm:0,layer:10,xp:C.layerXp[9],reserve:0};s.pills.break0=0;
 assert.equal(R.view(s).stage,'preparation');denied(s,'beginRitual');assert.deepEqual(s.ritual,completed);
 s.pills.break0=1;assert(R.view(s).canBegin);act(s,'beginRitual');assert.equal(s.ritual.route,'body');assert.equal(s.ritual.realm,0);
 assert.deepEqual(s.ritualHistory,[{route:'magic',realm:5,choice:'protect',at:NOW}]);
 denied(s,'ritualBreath',{route:'magic',choice:'inhale'});
 const other=prepared();assert.equal(R.view(other,'body').canBegin,false);denied(other,'beginRitual',{route:'body'});
});

test('public engine commits paid preparation once, gates actual trials and advances only after the real battle report',()=>{
 const E=require('../web/engine.js'),{toTrial}=require('./ritual-fixtures.cjs');
 for(const route of ['magic','body']){
  const s=prepared(0,route),before=wallet(s);
  const dispatch=action=>{const result=E.act(s,action,NOW);assert(result.ok,result.message);assert(K.validate(s).ok);return result;};
  const deniedBefore=copy(s);assert.equal(E.act(s,{type:'startDungeon',id:'trial'},NOW).ok,false);assert.deepEqual(s,deniedBefore);
  dispatch({type:'startDungeon',id:'trial',practice:true});dispatch({type:'leaveBattle'});assert.equal(s.progress.trialWins[route+':0'],undefined);
  toTrial(s,NOW,dispatch);const paid=wallet(s);assert.equal(s.pills.break0,before.pills.break0-1);
  dispatch({type:'startDungeon',id:'trial'});for(const enemy of s.battle.enemies)enemy.hp=0;E.tick(s,.1);
  assert.equal(s.battle,null);assert.equal(s.progress.trialWins[route+':0'],true);assert.equal(E.view(s).ritual.stage,'ready');
  const afterBattle=wallet(s);for(const field of ['stones','materials','pills'])assert.deepEqual(afterBattle[field],paid[field]);
  assert.deepEqual(E.breakthroughCost(s),{});dispatch({type:'breakthrough'});assert.equal(s.paths[route].realm,1);assert.equal(s.ritual,null);
  assert.deepEqual(wallet(s),afterBattle);assert.equal(s.ritualHistory[0].choice,'protect');assert.equal(s.ritualHistory[0].route,route);
 }
});

test('fresh states cannot bypass preparation with a raw victory while older valid victories are grandfathered once',()=>{
 const fresh=prepared();win(fresh);R.normalize(fresh);assert.deepEqual(fresh.ritualLegacyWins,{});assert.equal(R.view(fresh).legacyReady,false);assert.equal(R.view(fresh).canBreakthrough,false);
 const legacy=prepared();delete legacy.ritual;delete legacy.ritualLegacyWins;delete legacy.ritualHistory;win(legacy);R.normalize(legacy);R.validate(legacy);
 assert.deepEqual(legacy.ritualLegacyWins,{'magic:0':true});assert(R.view(legacy).legacyReady);assert(R.view(legacy).canBreakthrough);denied(legacy,'beginRitual');
 legacy.progress.trialWins['magic:1']=true;legacy.paths.magic={realm:1,layer:10,xp:C.layerXp[9]*C.realmXpFactors[1],reserve:0};R.normalize(legacy);R.validate(legacy);
 assert.equal(R.view(legacy).legacyReady,false,'the migration snapshot cannot bless newly achieved future trials');
 legacy.pills.break1=0;denied(legacy,'beginRitual');
});

test('malformed phase, reservation, route, history and fabricated terminal completion are rejected',()=>{
 const base=prepared();advanceToTrial(base);
 for(const mutate of [
  s=>s.ritual.version=2,s=>s.ritual.realm=6,s=>s.ritual.route='missing',s=>s.ritual.phase='ready',s=>s.ritual.breathStep=2,
  s=>s.ritual.arrayStep=2,s=>s.ritual.heartChoice='money',s=>s.ritual.heartRead=false,s=>s.ritual.reserved.pills.break0=2,
  s=>s.ritual.reserved.materials.ore++,s=>s.ritual.reserved.materials.extra=1,s=>s.ritual.extra=true,s=>s.ritual.completedAt=NOW,
  s=>s.ritualLegacyWins['magic:0']=true,s=>s.ritualLegacyWins['magic:1']=true,
  s=>s.ritualHistory.push({route:'magic',realm:0,choice:'truth',at:NOW})
 ]){const s=copy(base);mutate(s);assert.throws(()=>R.validate(s));}
 const terminal=prepared(5);advanceToTrial(terminal);terminal.ritual.phase='complete';terminal.ritual.completedAt=NOW;assert.throws(()=>R.validate(terminal));
 win(base);R.remember(base,NOW);const duplicate=copy(base);duplicate.ritualHistory.push(copy(duplicate.ritualHistory[0]));assert.throws(()=>R.validate(duplicate));
});

test('unknown actions fall through and unsupported ritual choices remain atomic',()=>{
 const s=prepared();assert.equal(R.handle(s,{type:'draw',count:10},NOW),null);denied(s,'beginRitual',{route:'__proto__'});
 act(s,'beginRitual');denied(s,'ritualBreath',{choice:'skip'});denied(s,'ritualRune',{choice:'__proto__'});denied(s,'ritualResolve',{choice:'wealth'});
 const before=copy(s);assert.equal(R.handle(s,{type:'ritualBreath',choice:'inhale'},-1).ok,false);assert.deepEqual(s,before);
});
