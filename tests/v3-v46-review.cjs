'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../web/engine.js'),A=require('../web/ascension.js'),Art=require('../web/scene-art.js');
const Review=require('../web/wayfarer-review.js'),Companion=require('../web/companion-records.js'),Collection=require('../web/art-collection.js');
const {terminalFixture,toReady}=require('./ascension-fixtures.cjs');
const {readyJourneyFixture}=require('./story-fixtures.cjs');
const NOW=1800000000000,copy=x=>JSON.parse(JSON.stringify(x));
function immortal(){const s=terminalFixture({rich:true});toReady(s);assert(E.act(s,{type:'completeAscension'},NOW).ok);return s;}
function wanderer(){const s=E.createState(NOW);s.training=false;s.paths.magic.layer=3;s.progress.dungeonWins.resource_herb=1;s.stones=1000;s.materials.herb=20;return s;}
function joint(s){for(const id of ['thunder_skill_0','array_skill_0'])s.techniques[id]={level:1,branch:0,spent:0,resetUsed:false};s.companions.qinglan.affinity=100;s.companions.qinglan.bond=true;assert(E.act(s,{type:'jointInvite',companion:'qinglan',techniques:['thunder_skill_0','array_skill_0','thunder_skill_0']},NOW).ok);}
test('eighteen world encounters have unique isolated illustration cells, all six pages have contextual art',()=>{
 const cells=new Set();for(const event of E.catalog.worldEvents){const art=Art.event(event.id);assert(art);const [x,y,w,h]=art.crop;assert(x>=0&&y>=0&&w>0&&h>0&&x+w<=1&&y+h<=1);cells.add(art.file+':'+art.col+':'+art.row);}
 assert.equal(cells.size,18);assert.equal(new Set(E.catalog.worldEvents.map(e=>Art.event(e.id).file)).size,3);
 assert.equal(new Set(['cultivation','character','adventure','cave','fate','heaven'].map(p=>JSON.stringify(Art.hero(p)))).size,6);
 assert.equal(Art.event('__proto__'),null);assert.equal(Art.hero('unknown'),null);
 assert(!Art.render(Art.event('bridge_lantern'),'<script>','').includes('<script>'));
});
test('a read-only decision preview agrees with actual spending and never consumes randomness',()=>{
 const s=wanderer(),event=E.worldView(s).events[0],before=E.serialize(s);
 const view=Review.view(s,event,'compassion');assert(view.canCommit);assert.equal(view.costs[0].required,3);assert.equal(E.serialize(s),before);
 assert(E.act(s,{type:'resolveEncounter',id:event.id,choice:view.choice.id},NOW).ok);
 assert.equal(s.materials.herb,17);assert.equal(s.wanderings.records.length,1);assert.deepEqual(s.rngStreams,JSON.parse(before).rngStreams);
 assert.equal(Review.view(s,E.worldView(s).events[0],'compassion').canCommit,false);
 const saved=E.serialize(s);assert(!E.act(s,{type:'resolveEncounter',id:event.id,choice:'compassion'},NOW).ok);assert.equal(E.serialize(s),saved);
});
test('an unaffordable preview allows switching to the free route and describes only the active stance effect',()=>{
 const s=wanderer();s.stones=0;s.materials.herb=0;const event=E.worldView(s).events[0],before=E.serialize(s);
 for(const choice of ['resolve','compassion']){const v=Review.view(s,event,choice);assert(!v.canCommit);assert(v.missing[0].shortage>0);assert(!v.active);assert(!E.act(s,{type:'resolveEncounter',id:event.id,choice},NOW).ok);assert.equal(E.serialize(s),before);}
 const free=Review.view(s,event,'insight');assert(free.active&&free.canCommit);assert.deepEqual(free.costs,[]);assert.equal(Review.view(s,event,'constructor'),null);
});
test('locked and busy encounters remain unavailable even if their selected cost is affordable',()=>{
 const s=wanderer();assert(!Review.view(s,E.worldView(s).events[1],'insight').canCommit);joint(s);assert(!Review.view(s,E.worldView(s).events[0],'insight').canCommit);
});
test('companion records list actual completed memories and do not create choices in an unplayed save',()=>{
 const s=wanderer(),before=E.serialize(s);for(const id of Object.keys(E.catalog.companions)){const v=Companion.view(s,id);assert.equal(v.memories.length,0);assert.equal(v.name,E.catalog.companions[id].name);assert(Companion.render(s,id).includes('尚无已完成'));}assert.equal(E.serialize(s),before);assert.equal(Companion.view(s,'__proto__'),null);
 s.paths.magic={realm:5,layer:10,xp:0,reserve:0};s.stones=1000000;for(const k of Object.keys(s.materials))s.materials[k]=1000;
 readyJourneyFixture(s,'chapter_0','protect',NOW);assert(E.act(s,{type:'claimChapter',choice:'protect'},NOW).ok);
 const saved=E.serialize(s),v=Companion.view(s,'qinglan');assert(v.memories.some(m=>m.id==='chapter_0'));assert(!Companion.view(s,'suyan').memories.some(m=>m.id==='chapter_0'));assert.equal(E.serialize(s),saved);
});
test('an old completed chapter without saved choice stays unaltered when opened in companion records',()=>{
 const s=wanderer();s.story.chapter=1;s.story.completed=[0];s.story.mercy=1;const before=E.serialize(s);assert(Companion.view(s,'qinglan').memories.some(m=>m.id==='chapter_0'));assert.equal(E.serialize(s),before);assert(!s.story.choices?.chapter_0);
});
test('batch meditation uses the minimum whole rounds for this layer and matches single-round settlement',()=>{
 const s=immortal(),before=copy(s),plan=A.meditationPlan(s);assert.equal(plan.count,3);assert(plan.fillsLayer&&plan.allowed);assert.equal(plan.xp,660);
 assert(E.act(s,{type:'celestialMeditate',count:plan.count},NOW).ok);
 for(let n=0;n<plan.count;n++)assert(E.act(before,{type:'celestialMeditate',count:1},NOW).ok);
 assert.deepEqual(s.ascension,before.ascension);assert.equal(s.stones,before.stones);assert.deepEqual(s.materials,before.materials);assert.equal(s.ascension.xp,480);assert.equal(s.ascension.reserve,180);
});
test('all thirty immortal layers produce bounded plans and stop planning at a full layer',()=>{
 const seed=immortal();for(let realm=0;realm<3;realm++)for(let layer=1;layer<=10;layer++){
  const s=copy(seed);Object.assign(s.ascension,{realm,layer,xp:0});const p=A.meditationPlan(s);assert(p.count>=1&&p.count<=10);assert(p.xp>0);assert.equal(p.fillsLayer,p.count===p.roundsToFill);
  s.ascension.xp=A.xpNeeded(s.ascension);assert.equal(A.meditationPlan(s).count,0);
 }
});
test('full-plan affordability never hides an affordable single round and failed batch spending is atomic',()=>{
 const s=immortal();s.stones=3000;const p=A.meditationPlan(s);assert(!p.allowed&&!p.affordable);assert(A.view(s).canMeditate);const before=E.serialize(s);assert(!E.act(s,{type:'celestialMeditate',count:p.count},NOW).ok);assert.equal(E.serialize(s),before);assert(E.act(s,{type:'celestialMeditate',count:1},NOW).ok);
});
test('storage saturation disables both planned and single-round meditation before charging resources',()=>{
 for(const key of ['yuan','meditations','reserve']){const s=immortal();s.ascension[key]=1e12;if(key==='reserve')s.ascension.xp=A.xpNeeded(s.ascension);assert(!A.meditationPlan(s,1).allowed);assert(!A.view(s).canMeditate);const before=E.serialize(s);assert(!E.act(s,{type:'celestialMeditate',count:1},NOW).ok);assert.equal(E.serialize(s),before);}
 const s=immortal();s.ascension.perfected=true;s.ascension.realm=2;s.ascension.layer=10;s.ascension.xp=A.xpNeeded(s.ascension);assert(!A.meditationPlan(s).allowed);
});
test('active joint cultivation prevents every ascension mutation and hides all actionable celestial controls',()=>{
 const s=immortal();joint(s);const before=E.serialize(s),v=A.view(s);assert(!v.canMeditate&&!v.canLevelUp&&!v.canBreakthrough);assert(v.challenges.every(c=>!c.allowed));assert(!v.meditationPlan.allowed);
 for(const type of ['beginAscension','advanceAscension','chooseAscension','completeAscension','celestialMeditate','advanceCelestial','celestialHunt','celestialBreakthrough']){assert(!E.act(s,{type,count:1,choice:'promise'},NOW).ok,type);assert.equal(E.serialize(s),before,type);}
});
test('the expanded painting directory preserves old identities and can jump without exposing reward actions',()=>{
 assert.equal(Collection.records.length,26);for(let n=0;n<26;n++)assert.equal(Collection.view(n).id,'painting_'+n);assert.equal(Collection.view(13).file,'v9-snow-village.png');assert.equal(Collection.view(16).file,'v9-evidence-atlas.png');assert.equal(Collection.view(25).file,'v10-suyan-records.png');
 const html=Collection.render(25,{directory:true});assert(html.includes('class="art-directory" open'));assert(html.includes('aria-current="true"'));assert(!html.includes('data-action='));
});
