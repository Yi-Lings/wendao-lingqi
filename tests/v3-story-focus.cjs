'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../web/engine.js'),S=require('../web/story.js'),F=require('../web/story-focus.js');
const {toMission,creditMissionFixture,finishJourney,readyJourneyFixture}=require('./story-fixtures.cjs');
const NOW=1800000000000;
function stock(){const s=E.createState(NOW);s.paths.magic={realm:5,layer:10,xp:0,reserve:0};s.stones=1000000;for(const id of Object.keys(s.materials))s.materials[id]=1000;return s;}
function act(s,a){const r=E.act(s,a,NOW);assert(r.ok,r.message);return r;}
function readonly(s,preferred){const before=E.serialize(s),v=F.view(s,preferred);assert.equal(E.serialize(s),before);return v;}

test('story focus opens the fresh chapter without starting it or inventing old memories',()=>{
 const s=E.createState(NOW),v=readonly(s,'__proto__');
 assert.equal(v.episode,'chapter_0');assert.equal(v.stage,'not-started');assert.equal(v.progress,undefined);
 assert.deepEqual(v.target,{type:'story-open',payload:{episode:'chapter_0'}});assert.deepEqual(s.story.journeys,{});
 s.story.chapter=1;s.story.completed=[0];s.story.mercy=1;
 assert.equal(readonly(s,'chapter_0').episode,'chapter_1');assert(!s.story.journeys.chapter_0);
});

test('intro, clues and a permanent decision expose the next read-only step and survive reload',()=>{
 const s=E.createState(NOW);act(s,{type:'beginStory',episode:'chapter_0'});
 assert.match(readonly(s).summary,/听完相遇/);
 while(S.journeyView(s,'chapter_0').stage==='intro')act(s,{type:'advanceStory',episode:'chapter_0'});
 const clue=S.episode('chapter_0').clues[0];act(s,{type:'inspectStory',episode:'chapter_0',clue:clue.id});
 const v=readonly(s);assert.equal(v.progress.current,1);assert.equal(v.progress.required,2);assert(!v.progress.done);
 const reload=E.validate(E.serialize(s));assert(reload.ok,reload.error);assert.deepEqual(F.view(reload.state),v);
 act(s,{type:'inspectStory',episode:'chapter_0',clue:S.episode('chapter_0').clues[1].id});assert(readonly(s).progress.done);
 act(s,{type:'advanceStory',episode:'chapter_0'});assert.equal(readonly(s).stage,'decision');assert.equal(s.story.journeys.chapter_0.choice,null);
});

test('accepted side stories can be preferred and real fresh crafting changes their next step',()=>{
 const s=stock();s.companions.yueheng.affinity=8;toMission(s,'chapter_0','protect',NOW);toMission(s,'yueheng_0','protect',NOW);
 assert.equal(readonly(s).episode,'chapter_0');
 const before=readonly(s,'yueheng_0');assert.equal(before.progress.current,0);assert.equal(before.target.type,'story-mission');
 act(s,{type:'craftPill',id:'heal0',count:1});const after=readonly(s,'yueheng_0');
 assert.equal(after.progress.current,1);assert(after.progress.done);assert.equal(after.target.type,'story-open');assert.match(after.summary,/约定已完成/);
 assert.equal(after.progress.index,1);assert.equal(after.progress.total,1);assert(!s.story.sideCompleted.includes('yueheng_0'));
 const r=E.validate(E.serialize(s));assert(r.ok,r.error);assert.deepEqual(F.view(r.state,'yueheng_0'),after);
});

test('a completed final action directs to the missing chapter condition instead of a blocked return',()=>{
 const s=E.createState(NOW);toMission(s,'chapter_0','seek',NOW);
 for(let i=0;i<3;i++){
  creditMissionFixture(s,'chapter_0');
  const j=S.journeyView(s,'chapter_0');if(j.mission.index<j.mission.total-1)finishJourney(s,'chapter_0',NOW);
 }
 const j=S.journeyView(s,'chapter_0');assert(j.mission.done);assert(!j.mission.canReturn);
 const v=readonly(s);assert.equal(v.progress.kind,'requirement');assert.equal(v.progress.current,0);assert.equal(v.progress.required,4);
 assert.equal(v.target.type,'story-requirement');assert.equal(v.target.payload.key,'rank');assert.match(v.summary,/本幕行动已完成/);
 assert.equal(v.progress.index,3);assert.equal(v.progress.total,3);
});

test('saved V1 actions keep their actual metric and baseline in focused progress',()=>{
 const s=stock();act(s,{type:'beginStory',episode:'chapter_0'});s.story.journeys.chapter_0.rulesVersion=1;
 s.progress.dungeonWins.resource_herb=9;toMission(s,'chapter_0','protect',NOW);
 const v=readonly(s);assert.equal(v.progress.current,0);assert.match(v.progress.label,/取回救治药材/);assert(!v.progress.label.includes('护灯阵'));
 s.progress.dungeonWins.resource_herb=10;const next=readonly(s);assert(next.progress.done);assert.equal(next.target.type,'story-open');assert.equal(s.story.journeys.chapter_0.rulesVersion,1);
});

test('ready stories stay unclaimed and completed preferred stories do not displace a live chapter',()=>{
 const s=stock();s.progress.dungeonWins.resource_herb=1;readyJourneyFixture(s,'chapter_0','protect',NOW);
 const before=E.serialize(s),v=F.view(s);assert.equal(v.stage,'ready');assert.equal(v.target.type,'story-open');assert.equal(E.serialize(s),before);
 act(s,{type:'claimChapter',choice:'protect'});assert.equal(readonly(s,'chapter_0').episode,'chapter_1');
});

test('without an accepted main chapter, a reachable accepted side story is resumed first',()=>{
 const s=stock();toMission(s,'yueheng_0','protect',NOW);
 assert.equal(readonly(s).episode,'yueheng_0');assert.equal(readonly(s,'suyan_0').episode,'yueheng_0');
});

test('engaged activities and an ascended character never receive a competing story action',()=>{
 const seed=stock();toMission(seed,'chapter_0','protect',NOW);
 const battle=JSON.parse(JSON.stringify(seed));act(battle,{type:'startDungeon',id:'resource_herb',tier:0});assert(battle.battle);assert.equal(readonly(battle),null);
 const cave=JSON.parse(JSON.stringify(seed));act(cave,{type:'startDungeon',id:'cave_0'});assert(cave.exploration);assert.equal(readonly(cave),null);
 const joint=JSON.parse(JSON.stringify(seed));for(const id of ['thunder_skill_0','array_skill_0'])joint.techniques[id]={level:1,branch:0,spent:0,resetUsed:false};joint.companions.qinglan.affinity=100;joint.companions.qinglan.bond=true;
 act(joint,{type:'jointInvite',companion:'qinglan',techniques:['thunder_skill_0','array_skill_0','thunder_skill_0']});assert.equal(readonly(joint),null);
 const ritual=E.createState(NOW);ritual.paths.magic.layer=10;ritual.paths.magic.xp=E.modules.core.xpNeeded(ritual);require('./ritual-fixtures.cjs').stockRitualFixture(ritual);require('./ritual-fixtures.cjs').toTrial(ritual,NOW);assert.equal(readonly(ritual),null);
 const {terminalFixture,toReady}=require('./ascension-fixtures.cjs'),immortal=terminalFixture({rich:true});toReady(immortal);act(immortal,{type:'completeAscension'});assert.equal(readonly(immortal),null);
 const ended=E.createState(NOW);ended.story.chapter=6;ended.story.completed=[0,1,2,3,4,5];ended.story.mercy=6;assert.equal(readonly(ended),null);
});
