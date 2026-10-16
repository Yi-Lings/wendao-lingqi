'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../web/engine'),S=require('../web/story'),N=require('../web/story-scenes'),P=require('../web/preview'),Screen=require('../web/story-screen');
const {toMission,readyJourneyFixture,creditMissionFixture,finishJourney}=require('./story-fixtures.cjs');
const NOW=1800000000000,copy=x=>JSON.parse(JSON.stringify(x));
function stock(){const s=E.createState(NOW);s.training=false;s.paths.magic={realm:5,layer:10,xp:0,reserve:0};s.stones=10000000;for(const c of Object.values(s.companions))c.affinity=100;for(const id of Object.keys(s.materials))s.materials[id]=100000;return s;}
function act(s,a){const r=E.act(s,a,NOW);assert(r.ok,a.type+': '+r.message);return r;}
function denied(s,a){const before=copy(s);assert.equal(E.act(s,a,NOW).ok,false);assert.deepEqual(s,before);}

test('each of the 18 actual recipes records its own paid batch count and output',()=>{
 const s=stock();for(const [index,id] of Object.keys(E.catalog.recipes).entries()){
  if(!s.learnedRecipes.includes(id))act(s,{type:'researchRecipe',id});
  const count=index%3+1;act(s,{type:'craftPill',id,count});assert.deepEqual(s.production.pills[id],{batches:count,quantity:count});
 }
 assert.equal(Object.keys(s.production.pills).length,18);assert(E.validate(E.serialize(s)).ok);
});
test('queuing, extra fire and cancellation do not count; collecting bonus pills records one base batch',()=>{
 const s=stock();const job=act(s,{type:'queuePill',id:'heal0',count:1}).data.job;assert.deepEqual(s.production.pills,{});
 act(s,{type:'startAlchemyControl',jobId:job.id});for(let i=0;i<3;i++){const j=s.alchemy.jobs[0];act(s,{type:'stokeAlchemy',jobId:j.id,fire:j.rhythm[j.round]});}
 assert.deepEqual(s.production.pills,{});act(s,{type:'finishAlchemyJob',jobId:job.id});assert.deepEqual(s.production.pills.heal0,{batches:1,quantity:2});
 denied(s,{type:'finishAlchemyJob',jobId:job.id});
 const cancel=act(s,{type:'queuePill',id:'heal0',count:3}).data.job;act(s,{type:'cancelAlchemyJob',jobId:cancel.id});assert.deepEqual(s.production.pills.heal0,{batches:1,quantity:2});
 const many=act(s,{type:'queuePill',id:'heal0',count:7}).data.job;act(s,{type:'finishAlchemyJob',jobId:many.id});assert.deepEqual(s.production.pills.heal0,{batches:8,quantity:9});
});
test('full pill inventory rejects collection without advancing production, resources or RNG',()=>{
 const s=stock(),job=act(s,{type:'queuePill',id:'heal0',count:1}).data.job;s.pills.heal0=1e12;
 denied(s,{type:'finishAlchemyJob',jobId:job.id});assert.deepEqual(s.production.pills,{});assert.equal(s.alchemy.jobs.length,1);
});
test('all 36 set/slot forge identities are distinct and repeat manipulation is not another forge',()=>{
 const s=stock();for(const set of Object.keys(E.catalog.sets))for(const slot of Object.keys(E.catalog.slots))act(s,{type:'forgeGear',set,slot,rarity:0});
 assert.equal(Object.keys(s.production.gear).length,36);for(const n of Object.values(s.production.gear))assert.equal(n,1);
 const g=s.bag.find(g=>g.set==='array'&&g.slot==='charm'),before=copy(s.production);
 act(s,{type:'equipGear',uid:g.uid});act(s,{type:'lockGear',uid:g.uid,locked:true});assert.deepEqual(s.production,before);
});
test('preview supplies, gacha items and reward grants never credit personal production',()=>{
 const preview=P.createState(NOW);assert.deepEqual(preview.production,{pills:{},gear:{}});assert(preview.stats.forged>0&&preview.stats.crafted>0);
 const s=stock();s.tickets=100;S.grantReward(s,{pills:{heal0:5}});const before=copy(s.production);act(s,{type:'draw',count:10});assert.deepEqual(s.production,before);assert(s.pills.heal0>=5);
});
test('legacy saves do not invent recipe or forge history from totals or inventory',()=>{
 const s=stock();s.stats.crafted=999;s.stats.forged=321;s.pills.heal0=700;delete s.production;
 const r=E.validate(s);assert(r.ok,r.error);assert.deepEqual(r.state.production,{pills:{},gear:{}});assert.equal(r.state.stats.crafted,999);
});
test('unknown production IDs, extra fields, invalid numbers and impossible bonus ratios cannot import',()=>{
 const base=stock();for(const production of [null,[],{pills:{},gear:{},extra:0},{pills:{fake:{batches:1,quantity:1}},gear:{}},{pills:{heal0:{batches:1,quantity:3}},gear:{}},{pills:{heal0:{batches:0,quantity:1}},gear:{}},{pills:{heal0:{batches:1.2,quantity:2}},gear:{}},{pills:{heal0:{batches:1,quantity:1,claimed:1}},gear:{}},{pills:{heal0:{batches:1e12+1,quantity:1e12+1}},gear:{}},{pills:{},gear:{'array:fake':1}},{pills:{},gear:{'fake:charm':1}},{pills:{},gear:{'array:charm':-1}}]){
  const s=copy(base);s.production=production;const r=E.validate(s);assert.equal(r.ok,false,JSON.stringify(production));assert.equal(r.state,null);
 }
});
test('recipe production counters saturate safely at the same numerical cap as inventory',()=>{
 const s=stock();s.production.pills.heal0={batches:1e12,quantity:1e12};act(s,{type:'craftPill',id:'heal0',count:1});assert.deepEqual(s.production.pills.heal0,{batches:1e12,quantity:1e12});assert(E.validate(s).ok);
});
test('new promises name the exact recipe; wrong pills and old stock do not fulfil them',()=>{
 const s=stock();act(s,{type:'craftPill',id:'heal0',count:4});toMission(s,'yueheng_0','protect',NOW);
 let j=S.journeyView(s,'yueheng_0');assert.equal(j.entry.rulesVersion,2);assert.equal(j.mission.goal.key,'pillBatch');assert.equal(j.mission.goal.id,'heal0');assert.equal(j.entry.baseline,4);assert.equal(j.mission.current,0);
 act(s,{type:'craftPill',id:'qi0',count:5});assert.equal(S.journeyView(s,'yueheng_0').mission.done,false);denied(s,{type:'advanceStory',episode:'yueheng_0'});
 act(s,{type:'craftPill',id:'heal0',count:1});assert.equal(S.journeyView(s,'yueheng_0').mission.done,true);
});
test('the first chapter now gives the two choices different concrete medicinal preparation',()=>{
 const protect=S.episode('chapter_0').choices.protect.goals[1],seek=S.episode('chapter_0').choices.seek.goals[1];
 assert.equal(protect.id,'heal0');assert.equal(seek.id,'purify0');assert.equal(protect.key,'pillBatch');assert.equal(seek.key,'pillBatch');
 assert.equal(protect.nav.payload.id,protect.id);assert.equal(seek.nav.payload.id,seek.id);assert.equal(N.missionGoals('chapter_0','seek',1)[1].key,'crafted');
});
test('old accepted promises retain total-crafting rules and baselines across restore without clearing progress',()=>{
 let s=stock();s.stats.crafted=37;act(s,{type:'beginStory',episode:'yueheng_0'});delete s.story.journeys.yueheng_0.rulesVersion;
 toMission(s,'yueheng_0','protect',NOW);assert.equal(S.journeyView(s,'yueheng_0').mission.goal.key,'crafted');assert.equal(s.story.journeys.yueheng_0.baseline,37);
 act(s,{type:'craftPill',id:'qi0',count:1});const r=E.validate(E.serialize(s));assert(r.ok,r.error);s=r.state;assert.equal(S.journeyView(s,'yueheng_0').mission.done,true);assert.equal(s.story.journeys.yueheng_0.baseline,37);
 finishJourney(s,'yueheng_0',NOW);act(s,{type:'claimSidequest',id:'yueheng_0'});denied(s,{type:'claimSidequest',id:'yueheng_0'});
});
test('unknown story rule versions reject rather than silently replacing the accepted objective',()=>{
 const s=stock();toMission(s,'yueheng_0','protect',NOW);for(const v of [0,3,1.5,'2',null]){const t=copy(s);t.story.journeys.yueheng_0.rulesVersion=v;assert.equal(E.validate(t).ok,false);}
});
test('every phase of an already accepted legacy chapter restores without changing its cursor, promise or baseline',()=>{
 let s=stock();s.stats.crafted=50;act(s,{type:'beginStory',episode:'chapter_0'});delete s.story.journeys.chapter_0.rulesVersion;
 const stages=new Set();for(let guard=0;guard<120;guard++){
  const before=copy(s.story.journeys.chapter_0),old=copy(s);delete old.production;const loaded=E.validate(old);assert(loaded.ok,loaded.error);s=loaded.state;assert.deepEqual(s.story.journeys.chapter_0,before);assert.deepEqual(s.production,{pills:{},gear:{}});
  const j=S.journeyView(s,'chapter_0');stages.add(j.stage);if(j.stage==='completed')break;
  if(j.stage==='survey'){for(const c of j.episode.clues)act(s,{type:'inspectStory',episode:'chapter_0',clue:c.id});act(s,{type:'advanceStory',episode:'chapter_0'});}
  else if(j.stage==='decision')act(s,{type:'chooseStory',episode:'chapter_0',choice:'protect'});
  else if(j.stage==='mission'){creditMissionFixture(s,'chapter_0');act(s,{type:'advanceStory',episode:'chapter_0'});}
  else if(j.stage==='ready')act(s,{type:'claimChapter',choice:'protect'});
  else act(s,{type:'advanceStory',episode:'chapter_0'});
 }
 assert.deepEqual([...stages].sort(),['intro','survey','decision','reply','mission','interlude','outro','ready','completed'].sort());assert.equal(s.story.chapter,1);assert.equal(s.story.journeys.chapter_0.rulesVersion,undefined);
});
test('replay is locked until a real chapter completion and includes every line of the selected route',()=>{
 const s=stock();assert.equal(S.replayView(s,'chapter_0'),null);
 readyJourneyFixture(s,'chapter_0','seek',NOW);assert.equal(S.replayView(s,'chapter_0'),null);act(s,{type:'claimChapter',choice:'seek'});
 const before=copy(s),r=S.replayView(s,'chapter_0',{choice:'protect'}),ep=S.episode('chapter_0');assert.equal(r.choice,'seek');assert.equal(r.choiceKnown,true);assert.equal(r.sections.length,6);
 assert.deepEqual(r.sections.find(x=>x.id==='reply').lines,ep.choices.seek.reply);assert.deepEqual(r.sections.find(x=>x.id==='outro').lines,ep.outro.seek);
 assert.deepEqual(r.sections.find(x=>x.id==='interlude_1').lines,ep.choices.seek.interludes[1]);assert.equal(r.sections.find(x=>x.id==='clues').lines.length,2);
 for(const part of r.sections){const v=S.replayView(s,'chapter_0',{section:part.id});const html=Screen.renderMemory(s,v);assert(html.includes('data-narrative="memory"'));assert(!html.includes('data-action='),'memory has no economic action buttons');for(const line of part.lines)assert(html.includes(line.text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')));}
 assert.deepEqual(s,before,'all reading cursors are view-only');
});
test('all six chapters and eighteen side stories can be reread without choices being rewritten or rewards repeating',()=>{
 const s=stock();s.story.chapter=6;s.story.mercy=3;s.story.truth=3;s.story.completed=[0,1,2,3,4,5];s.story.sideCompleted=E.catalog.sidequests.map(q=>q.id);for(const c of Object.values(s.companions))c.questStep=4;
 // Legacy completed records deliberately have no saved branch.
 const before=copy(s);for(const id of ['chapter_0','chapter_1','chapter_2','chapter_3','chapter_4','chapter_5',...s.story.sideCompleted])for(const choice of ['protect','seek']){
  const r=S.replayView(s,id,{choice});assert(r,id);assert.equal(r.choiceKnown,false);assert.match(r.notice,/旧记录未保留抉择/);assert.equal(r.choice,choice);assert.equal(r.sections[0].lines.length,S.episode(id).intro.length);
 }
 assert.deepEqual(s,before);denied(s,{type:'beginStory',episode:'chapter_0'});denied(s,{type:'claimSidequest',id:'yueheng_0'});
});
test('body rituals use six authored physical-cultivation scenes while costs, sequences and magic scenes remain compatible',()=>{
 const titles=new Set();for(let realm=0;realm<6;realm++){
  const s=stock();s.route='body';s.paths.body={realm,layer:10,xp:0,reserve:0};s.paths.body.xp=E.modules.core.xpNeeded(s);s.pills['break'+realm]=1;
  const body=E.modules.ritual.view(s),magic=E.modules.ritual.view(s,'magic');titles.add(body.title);assert.notEqual(body.title,magic.title);assert.match(body.preparationText,/适合炼体护脉/);
  const before=copy(s);act(s,{type:'beginRitual'});assert.equal(s.pills['break'+realm],0);assert.equal(before.materials.lotus-s.materials.lotus,3+realm*2);
  assert.deepEqual(E.modules.ritual.view(s).introduction,body.introduction);for(const choice of ['inhale','hold','exhale']){const v=E.modules.ritual.view(s),r=act(s,{type:'ritualBreath',choice});assert.equal(r.message,body.introduction&&v.cue.text);}
  const v=E.modules.ritual.view(s),positions=v.sequenceLabels.map(label=>v.cue.text.indexOf(label.replace('纹','')));assert(positions.every((p,i)=>p>=0&&(!i||p>positions[i-1])),'written rune hints follow the actual accepted sequence');for(const rune of v.sequence)act(s,{type:'ritualRune',choice:rune});const heart=E.modules.ritual.view(s);assert(!/金丹|灵婴|化神|神识/.test(heart.narration.join('')));
  act(s,{type:'ritualResolve',choice:'protect'});assert(!/金丹|灵婴|化神|神识/.test(E.modules.ritual.view(s).narration.join('')));assert(E.validate(E.serialize(s)).ok);
 }
 assert.equal(titles.size,6);
});
