'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../web/engine'),S=require('../web/story'),N=require('../web/story-scenes');
const {toMission,creditMissionFixture,finishJourney,readyJourneyFixture}=require('./story-fixtures.cjs');
const I=E.modules.investigation,NOW=1800000000000,copy=x=>JSON.parse(JSON.stringify(x));
function stock(route='magic'){const s=E.createState(NOW);s.training=false;s.route=route;s.paths[route]={realm:5,layer:10,xp:0,reserve:0};s.stones=1000000;for(const id of Object.keys(s.materials))s.materials[id]=10000;for(const c of Object.values(s.companions))c.affinity=100;return s;}
function act(s,a){const r=E.act(s,a,NOW);assert(r.ok,a.type+': '+r.message);return r;}
function denied(s,a){const before=copy(s),r=E.act(s,a,NOW);assert.equal(r.ok,false,JSON.stringify(a));assert.deepEqual(s,before);return r;}
function mission(id='bell_flow',route='magic'){
 const c=I.cases[id],s=stock(route);if(c.episode==='chapter_1'){s.story.chapter=1;s.story.completed=[0];s.story.truth=1;}
 toMission(s,c.episode,'seek',NOW);
 while(S.journeyView(s,c.episode).mission.index<c.missionIndex){creditMissionFixture(s,c.episode);finishJourney(s,c.episode,NOW);}
 assert.equal(S.journeyView(s,c.episode).mission.goal.id,id);return s;
}
function select(s,id,pair){const n=s.investigations[id];for(const evidence of [...n.selected])act(s,{type:'selectEvidence',id,evidence});for(const evidence of pair){act(s,{type:'readEvidence',id,evidence});act(s,{type:'selectEvidence',id,evidence});}}
function solve(s,id){const c=I.cases[id];act(s,{type:'beginInvestigation',id});select(s,id,c.answer);act(s,{type:'submitInvestigation',id,hypothesis:c.conclusion});}
function clear(s,id,practice=false){act(s,{type:'startDungeon',id,practice,difficulty:0});for(let n=0;n<610&&s.battle;n++)E.modules.combat.advanceBattle(s,1);assert.equal(s.battle,null);assert(s.lastBattleResult.win,'high-rank combat fixture wins through the real battle engine');}
const wealth=s=>copy({stones:s.stones,materials:s.materials,pills:s.pills,tickets:s.tickets,rng:s.rngStreams,production:s.production,revision:s.revision});

test('new seek goals require evidence; accepted V1 and V2 promises retain exact original goals',()=>{
 for(const [id,index]of [['chapter_0',0],['chapter_1',2]]){
  assert.equal(N.missionGoals(id,'seek',3)[index].key,'investigation');assert.equal(N.missionGoals(id,'seek',2)[index].key,'dungeonWins');assert.equal(N.missionGoals(id,'seek',1)[index].key,'dungeonWins');
  for(const v of [1,2]){const s=stock();if(id==='chapter_1'){s.story.chapter=1;s.story.truth=1;s.story.completed=[0];}act(s,{type:'beginStory',episode:id});s.story.journeys[id].rulesVersion=v;toMission(s,id,'seek',NOW);const j=S.journeyView(s,id);assert.equal(j.entry.rulesVersion,v);assert.deepEqual(j.episode.choices.seek.goals,N.missionGoals(id,'seek',v));assert.equal(I.view(s,id==='chapter_0'?'bell_flow':'furnace_seal'),null);denied(s,{type:'beginInvestigation',id:'bell_flow'});}
 }
});
test('opening and inspecting the notebook is pure; starting imports only personally read scene clues',()=>{
 const s=mission(),before=copy(s),v=I.view(s,'bell_flow');assert.equal(v.note,null);assert(v.active);assert.deepEqual(s,before);
 act(s,{type:'beginInvestigation',id:'bell_flow'});assert.deepEqual(s.investigations.bell_flow.read,I.cases.bell_flow.answer);assert.deepEqual(s.investigations.bell_flow.selected,[]);assert.equal(S.journeyView(s,'chapter_0').mission.done,false);
});
test('unread and third evidence selections are rejected atomically; selection can be changed and restored',()=>{
 const s=mission(),id='bell_flow',c=I.cases[id];act(s,{type:'beginInvestigation',id});denied(s,{type:'selectEvidence',id,evidence:'surface_frost'});select(s,id,c.answer);act(s,{type:'readEvidence',id,evidence:'surface_frost'});denied(s,{type:'selectEvidence',id,evidence:'surface_frost'});act(s,{type:'selectEvidence',id,evidence:c.answer[0]});act(s,{type:'selectEvidence',id,evidence:'surface_frost'});assert.equal(E.validate(E.serialize(s)).ok,true);assert.equal(s.investigations[id].selected.length,2);
});
for(const route of ['magic','body'])for(const id of Object.keys(I.cases))test(route+' / '+id+' uses actual non-practice combat, accepts proof and cannot reward or resubmit',()=>{
 const s=mission(id,route),c=I.cases[id];clear(s,c.source);assert(I.sourceReady(s,c));const before=wealth(s);solve(s,id);const after=wealth(s);delete before.revision;delete after.revision;assert.deepEqual(after,before);assert.equal(S.journeyView(s,c.episode).mission.current,1);assert.equal(s.investigations[id].attempts,1);assert.equal(I.view(s,id).resolved,true);assert.equal(E.validate(E.serialize(s)).ok,true);
 denied(s,{type:'submitInvestigation',id,hypothesis:c.conclusion});denied(s,{type:'selectEvidence',id,evidence:c.answer[0]});
});
test('practice victory supplies no evidence provenance and missing real source blocks a correct judgment',()=>{
 const s=mission(),id='bell_flow',c=I.cases[id];clear(s,c.source,true);assert.equal(s.progress.dungeonWins[c.source]||0,0);act(s,{type:'beginInvestigation',id});select(s,id,c.answer);assert.match(denied(s,{type:'submitInvestigation',id,hypothesis:c.conclusion}).message,/药谷取样/);assert.equal(s.investigations[id].attempts,0);assert.equal(S.journeyView(s,c.episode).mission.done,false);
});
test('wrong evidence or conclusion yields useful feedback and can be retried without resource or RNG changes',()=>{
 const s=mission(),id='bell_flow',c=I.cases[id];s.progress.dungeonWins[c.source]=1;act(s,{type:'beginInvestigation',id});select(s,id,['surface_frost','old_ledger']);let r=act(s,{type:'submitInvestigation',id,hypothesis:c.conclusion});assert.equal(r.data.correct,false);assert.match(r.message,/同一方向/);assert.equal(S.journeyView(s,c.episode).mission.done,false);
 select(s,id,c.answer);const before=wealth(s);r=act(s,{type:'submitInvestigation',id,hypothesis:'weather'});assert.equal(r.data.correct,false);const after=wealth(s);delete before.revision;delete after.revision;assert.deepEqual(after,before);act(s,{type:'submitInvestigation',id,hypothesis:c.conclusion});assert.equal(s.investigations[id].attempts,3);assert.equal(s.investigations[id].status,'resolved');
});
test('missing pair, invented evidence, invalid hypotheses and unrelated chapters cannot mutate a save',()=>{
 const s=mission(),id='bell_flow';denied(s,{type:'beginInvestigation',id:'furnace_seal'});denied(s,{type:'readEvidence',id,evidence:'warm_shard'});act(s,{type:'beginInvestigation',id});s.progress.dungeonWins.resource_herb=1;denied(s,{type:'submitInvestigation',id,hypothesis:'siphon'});select(s,id,I.cases[id].answer);denied(s,{type:'submitInvestigation',id,hypothesis:'invented'});denied(s,{type:'readEvidence',id,evidence:'__proto__'});denied(s,{type:'selectEvidence',id,evidence:'shift_log'});
});
test('read and selection persist exactly across valid save restore',()=>{
 const s=mission('furnace_seal'),id='furnace_seal';act(s,{type:'beginInvestigation',id});act(s,{type:'readEvidence',id,evidence:'intact_seal'});act(s,{type:'selectEvidence',id,evidence:'intact_seal'});const r=E.validate(E.serialize(s));assert(r.ok,r.error);assert.deepEqual(r.state.investigations,s.investigations);assert.equal(I.view(r.state,id).resolved,false);
});
test('busy battles, exploration, joint cultivation and unfinished ritual block every proof mutation',()=>{
 const original=mission();act(original,{type:'beginInvestigation',id:'bell_flow'});for(const overlay of [{battle:{}},{exploration:{}},{joint:{}},{ritual:{phase:'breath'}}])for(const a of [{type:'beginInvestigation'},{type:'readEvidence',evidence:'surface_frost'},{type:'selectEvidence',evidence:'warm_shard'},{type:'submitInvestigation',hypothesis:'siphon'}]){const s=copy(original);Object.assign(s,overlay);const before=copy(s),r=I.handle(s,{...a,id:'bell_flow'},NOW);assert.equal(r.ok,false);assert.deepEqual(s,before);}
});
test('malformed note IDs, arrays, cursors, verdicts and times are rejected on import',()=>{
 const s=mission(),id='bell_flow';act(s,{type:'beginInvestigation',id});
 const mutations=[t=>t.investigations=[],t=>t.investigations.unknown=copy(t.investigations[id]),t=>t.investigations[id].extra=1,t=>t.investigations[id].selected=['surface_frost'],t=>t.investigations[id].read=['warm_shard','warm_shard'],t=>t.investigations[id].read=['no'],t=>t.investigations[id].attempts=101,t=>t.investigations[id].attempts=-1,t=>t.investigations[id].hypothesis='no',t=>t.investigations[id].hypothesis='siphon',t=>t.investigations[id].startedAt=-1,t=>t.investigations[id].resolvedAt=NOW,t=>t.investigations[id].verdict='resolved',t=>t.story.journeys.chapter_0.rulesVersion=2,t=>t.story.journeys.chapter_0.choice='protect'];
 for(const mutate of mutations){const t=copy(s);mutate(t);assert.equal(E.validate(t).ok,false,mutate.toString());}
});
test('resolved records reject forged pair, missing victory and backwards time',()=>{
 const s=mission(),id='bell_flow';s.progress.dungeonWins.resource_herb=1;solve(s,id);
 for(const mutate of [t=>t.investigations[id].hypothesis='weather',t=>t.investigations[id].selected=['surface_frost','old_ledger'],t=>t.investigations[id].attempts=0,t=>t.investigations[id].resolvedAt=NOW-1,t=>t.progress.dungeonWins.resource_herb=0]){const t=copy(s);mutate(t);assert.equal(E.validate(t).ok,false);}
});
test('later checkpoints require their saved proof; remembered judgment carries into the next volume',()=>{
 const s=stock();readyJourneyFixture(s,'chapter_0','seek',NOW);act(s,{type:'claimChapter',choice:'seek'});const j=S.journeyView(s,'chapter_1');assert.match(j.continuity,/热息回路/);assert.equal(S.journeyView(s,'chapter_0').stage,'completed');const replay=S.replayView(s,'chapter_0'),section=replay.sections.find(x=>x.id==='proof_bell_flow');assert(section);assert.equal(section.lines.length,4);assert.match(section.lines[3].text,/流向证清/);
 const before=copy(s);I.view(s,'bell_flow');S.replayView(s,'chapter_0',{section:'proof_bell_flow'});assert.deepEqual(s,before);const t=copy(s);delete t.investigations.bell_flow;assert.equal(E.validate(t).ok,false);
});
test('old records migrate an empty notebook and do not invent a remembered investigation',()=>{
 const s=stock();delete s.investigations;s.story.chapter=1;s.story.truth=1;s.story.completed=[0];const r=E.validate(s);assert(r.ok,r.error);assert.deepEqual(r.state.investigations,{});assert.equal(S.journeyView(r.state,'chapter_1').continuity,null);assert.equal(S.replayView(r.state,'chapter_0').sections.some(x=>x.id.startsWith('proof_')),false);
});
test('wrong attempts saturate at 100 while a later correct submission remains possible',()=>{
 const s=mission(),id='bell_flow';s.progress.dungeonWins.resource_herb=1;act(s,{type:'beginInvestigation',id});select(s,id,I.cases[id].answer);s.investigations[id].attempts=100;act(s,{type:'submitInvestigation',id,hypothesis:'weather'});assert.equal(s.investigations[id].attempts,100);act(s,{type:'submitInvestigation',id,hypothesis:'siphon'});assert.equal(s.investigations[id].attempts,100);
});
for(const version of [1,2])test('accepted V'+version+' seek chapter restores every saved phase with its original promises',()=>{
 const s=stock(),id='chapter_0';act(s,{type:'beginStory',episode:id});if(version===1)delete s.story.journeys[id].rulesVersion;else s.story.journeys[id].rulesVersion=2;
 const stages=new Set();for(let guard=0;guard<120;guard++){
  const j=S.journeyView(s,id);stages.add(j.stage);const r=E.validate(E.serialize(s));assert(r.ok,r.error);assert.deepEqual(r.state,s);assert.deepEqual(j.episode.choices.seek.goals,N.missionGoals(id,'seek',version));
  if(j.stage==='completed')break;
  if(j.stage==='survey'){for(const c of j.episode.clues)if(!j.entry.clues.includes(c.id))act(s,{type:'inspectStory',episode:id,clue:c.id});act(s,{type:'advanceStory',episode:id});}
  else if(j.stage==='decision')act(s,{type:'chooseStory',episode:id,choice:'seek'});
  else if(j.stage==='mission'){creditMissionFixture(s,id);act(s,{type:'advanceStory',episode:id});}
  else if(j.stage==='ready')act(s,{type:'claimChapter',choice:'seek'});
  else act(s,{type:'advanceStory',episode:id});
 }
 assert.equal(stages.size,9);assert.deepEqual(s.investigations,{});assert.equal(s.story.chapter,1);
});
