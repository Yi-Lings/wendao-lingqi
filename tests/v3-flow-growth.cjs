'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../web/engine.js'),K=E.modules.core,Q=E.modules.economy;
const {stockRitualFixture,toTrial}=require('./ritual-fixtures.cjs');
const NOW=1800000000000,copy=x=>JSON.parse(JSON.stringify(x));
function act(s,a){const r=E.act(s,a,NOW);assert(r.ok,r.message);return r;}
function afterFirstPill(route='magic'){
 const s=E.createState(NOW);if(route!=='magic')act(s,{type:'switchRoute',route});
 act(s,{type:'usePill',id:'qi0'});act(s,{type:'levelUp'});return s;
}
function fullTenth(route='magic'){
 const s=stockRitualFixture(E.createState(NOW));s.route=route;s.paths[route].layer=10;s.paths[route].xp=K.xpNeeded(s);return s;
}
function readOnly(s,fn){const before=copy(s),out=fn();assert.deepEqual(s,before);return out;}
function entryAgrees(s,a,allowed){
 const before=copy(s),v=readOnly(s,()=>E.previewDungeon(s,a));assert.equal(v.allowed,allowed);
 const candidate=copy(s),r=E.act(candidate,{type:'startDungeon',...a},NOW);assert.equal(r.ok,allowed,r.message);
 if(!allowed){assert.deepEqual(candidate,before);assert(v.requirements.includes(r.message),r.message);}
 return {v,r,candidate};
}

test('after the starter pill and level-up, guidance uses affordable learned medicine before another material run',()=>{
 const s=afterFirstPill(),g=readOnly(s,()=>E.journey(s)).primary;
 assert.equal(g.id,'cultivate');assert.deepEqual(g.target,{kind:'ui',type:'alchemy',payload:{id:'qi0'}});
 assert.match(g.description,/灵石 16（已有 120）/);assert.match(g.description,/灵草 4（已有 12）/);assert.match(g.description,/本层尚缺 140/);
 const wallet=copy({stones:s.stones,materials:s.materials}),cost=Q.costs(s,'craftPill',{id:g.target.payload.id,count:1});
 act(s,{type:'craftPill',id:g.target.payload.id,count:1});assert.equal(s.stones,wallet.stones-cost.stones);
 for(const [id,n] of Object.entries(cost.materials))assert.equal(s.materials[id],wallet.materials[id]-n);
 assert.equal(E.journey(s).primary.id,'pill:qi0');act(s,{type:'usePill',id:'qi0'});assert.equal(s.paths.magic.xp,140);
});
test('material shortages give exact deficits and an actually open source without spending or rolling randomness',()=>{
 const s=afterFirstPill();s.stones=5;s.materials.herb=1;s.materials.lotus=0;
 const g=readOnly(s,()=>E.journey(s)).primary;assert.equal(g.id,'cultivate');assert.equal(g.target.type,'source');
 assert.match(g.description,/灵石 11（5 \/ 16）/);assert.match(g.description,/灵草 3（1 \/ 4）/);assert.match(g.description,/灵莲 1（0 \/ 1）/);
 assert(E.previewDungeon(s,{id:g.target.payload.id,tier:0,difficulty:0}).allowed);
});
test('guidance respects current-route realm and recipe research rather than a higher alternate route or inventory',()=>{
 const s=afterFirstPill();s.paths.body={realm:5,layer:10,xp:0,reserve:0};s.pills.qi2=2;
 s.learnedRecipes=['heal0','qi2'];s.recipeProvenance={heal0:s.recipeProvenance.heal0,qi2:{type:'research',source:'furnace',at:NOW}};
 const g=readOnly(s,()=>E.journey(s)).primary;assert.equal(g.target.type,'source');assert.equal(g.target.payload.id,'resource_herb');
 assert(!E.previewDungeon(s,{id:'resource_insight',tier:0,difficulty:0}).allowed);
 assert(E.previewDungeon(s,{id:g.target.payload.id,tier:0,difficulty:0}).allowed);
 s.paths.magic={realm:1,layer:1,xp:0,reserve:0};s.stones=10000;s.materials.herb=100;s.materials.lotus=100;s.materials.insight=100;
 assert.notEqual(E.journey(s).primary.target.type,'alchemy','unlearned qi1 is not offered as ready to craft');
 act(s,{type:'researchRecipe',id:'qi1'});assert.equal(E.journey(s).primary.target.payload.id,'qi1');
});
test('a queued cultivation pill is resumed and claimed before guidance suggests spending another recipe',()=>{
 const s=afterFirstPill();act(s,{type:'queuePill',id:'qi0',count:1});const job=s.alchemy.jobs[0];
 const g=readOnly(s,()=>E.journey(s)).primary;assert.equal(g.id,'alchemy:'+job.id);assert.deepEqual(g.target.payload,{id:'qi0',jobId:job.id});assert.match(g.description,/无需再次备料/);
 act(s,{type:'finishAlchemyJob',jobId:job.id});assert.equal(s.alchemy.jobs.length,0);assert.equal(E.journey(s).primary.id,'pill:qi0');
});
test('active control and a full queue lead to existing work; an owned usable pill remains the fastest next step',()=>{
 const s=afterFirstPill();act(s,{type:'queuePill',id:'heal0'});act(s,{type:'queuePill',id:'heal0'});
 const first=s.alchemy.jobs[0];assert.equal(E.journey(s).primary.target.payload.jobId,first.id);
 act(s,{type:'startAlchemyControl',jobId:first.id});const g=readOnly(s,()=>E.journey(s)).primary;
 assert.equal(g.target.payload.jobId,first.id);assert.match(g.description,/0 \/ 3 轮控火/);
 s.pills.qi0=1;assert.equal(E.journey(s).primary.id,'pill:qi0');
});
test('completed layers, paused cultivation and ongoing activities retain their original priority',()=>{
 const s=afterFirstPill();s.training=false;assert.equal(E.journey(s).primary.id,'training');
 s.paths.magic.xp=K.xpNeeded(s);assert.equal(E.journey(s).primary.id,'level-up');
 for(const field of ['battle','exploration','joint']){const busy=copy(s);busy[field]={};assert.equal(readOnly(busy,()=>E.journey(busy)).primary.id,'encounter');}
 const ritual=fullTenth();act(ritual,{type:'researchRecipe',id:'break0'});act(ritual,{type:'craftPill',id:'break0'});act(ritual,{type:'beginRitual'});
 assert.equal(readOnly(ritual,()=>E.journey(ritual)).primary.id,'ritual');
});
test('body cultivation follows the same affordable medicine loop and a validated legacy save stays unchanged',()=>{
 const s=afterFirstPill('body'),g=readOnly(s,()=>E.journey(s)).primary;assert.equal(g.target.payload.id,'qi0');
 act(s,{type:'craftPill',id:g.target.payload.id});act(s,{type:'usePill',id:'qi0'});assert.equal(s.paths.body.xp,140);assert.equal(s.paths.magic.xp,0);
 const old=copy(s);delete old.learnedRecipes;delete old.recipeProvenance;delete old.alchemy;delete old.production;
 const loaded=E.validate(old);assert(loaded.ok,loaded.error);readOnly(loaded.state,()=>E.journey(loaded.state));
});
test('available medicine chooses the smallest useful effect and never proposes a recipe with insufficient stock',()=>{
 const s=afterFirstPill();s.paths.magic={realm:2,layer:2,xp:0,reserve:0};s.stones=10000;s.materials.herb=100;s.materials.lotus=100;s.materials.insight=100;
 for(const id of ['qi1','qi2'])act(s,{type:'researchRecipe',id});
 assert.equal(E.journey(s).primary.target.payload.id,'qi2','1280 XP gap selects an affordable 5000 XP medicine');
 s.materials.insight=2;assert.equal(E.journey(s).primary.target.payload.id,'qi1','uses the strongest affordable smaller dose when qi2 cannot be made');
 s.pills.qi0=1;s.pills.qi1=1;s.pills.qi2=1;s.paths.magic.xp=K.xpNeeded(s)-100;
 assert.equal(E.journey(s).primary.id,'pill:qi0','a 100 XP gap uses the smallest sufficient owned dose');
});
test('the public preview refuses an unprepared formal trial exactly as the public action does',()=>{
 for(const route of ['magic','body']){const s=fullTenth(route),{v}=entryAgrees(s,{id:'trial',difficulty:0},false);assert.match(v.requirements[0],/闭关/);}
});
test('a free trial practice remains legal before the ceremony and formal entry opens after real preparation',()=>{
 for(const route of ['magic','body']){
  const s=fullTenth(route);entryAgrees(s,{id:'trial',difficulty:0,practice:true},true);
  toTrial(s,NOW);assert(E.modules.ritual.view(s).canTrial);entryAgrees(s,{id:'trial',difficulty:0},true);
  entryAgrees(s,{id:'trial',route:route==='magic'?'body':'magic',difficulty:0},false);
 }
});
test('trial preview preserves legacy trial eligibility and rejects incomplete ceremony phases',()=>{
 const legacy=fullTenth();legacy.progress.trialWins['magic:0']=true;legacy.ritualLegacyWins['magic:0']=true;
 assert(E.modules.ritual.view(legacy).legacyReady);entryAgrees(legacy,{id:'trial'},true);
 const s=fullTenth();act(s,{type:'researchRecipe',id:'break0'});act(s,{type:'craftPill',id:'break0'});act(s,{type:'beginRitual'});
 for(const action of [null,{type:'ritualBreath',choice:'inhale'}]){if(action)act(s,action);entryAgrees(s,{id:'trial'},false);}
});
test('public entry previews and commits agree while battle, exploration or joint practice is active',()=>{
 const battle=E.createState(NOW);act(battle,{type:'startDungeon',id:'resource_herb'});entryAgrees(battle,{id:'resource_herb'},false);
 const exploration=E.createState(NOW);exploration.paths.magic.layer=9;act(exploration,{type:'startDungeon',id:'cave_0'});entryAgrees(exploration,{id:'resource_herb'},false);
 const joint=E.createState(NOW);joint.companions.qinglan.affinity=100;joint.companions.qinglan.bond=true;
 act(joint,{type:'jointInvite',companion:'qinglan',techniques:['thunder_skill_0','array_skill_0','thunder_skill_0']});
 entryAgrees(joint,{id:'resource_herb'},false);entryAgrees(joint,{id:'trial',practice:true},false);
});
