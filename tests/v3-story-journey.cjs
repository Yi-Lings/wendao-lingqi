'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const E=require('../web/engine.js');
const S=require('../web/story.js');
const C=require('../web/data.js');
const N=require('../web/story-scenes.js');
const NOW=1791331200000;
const copy=x=>JSON.parse(JSON.stringify(x));
function act(s,a){const result=E.act(s,a,NOW);assert.equal(result.ok,true,a.type+': '+result.message);return result;}
function denied(s,a){const before=JSON.stringify(s),r=E.act(s,a,NOW);assert.equal(r.ok,false,a.type+' must reject');assert.equal(JSON.stringify(s),before,'rejection remains atomic');}
function metric(s,r,n){
 if(r.key==='rank'){if(S.value(s,r)<n)s.paths[s.route]={realm:Math.floor(n/10),layer:n%10+1,xp:0,reserve:0};}
 else if(r.key==='sect'){s.sect.joined=true;s.sect.school='sword';}
 else if(r.key==='tower')s.progress.tower=n;
 else if(r.key==='dungeonWins'||r.key==='bossWins'){if(r.id)s.progress[r.key][r.id]=n;else s.stats.bosses=n;}
 else if(r.key==='endingTrial'){s.progress.endingTrials[s.route]=true;if(!s.ritualHistory.some(h=>h.route===s.route&&h.realm===5))s.ritualHistory.push({route:s.route,realm:5,choice:'promise',at:NOW});}
 else if(r.key==='affinity')s.companions[r.id].affinity=n;
 else if(r.key==='sectTrialCount')s.progress.sectTrials=Object.values(C.dungeons).filter(d=>d.type==='sect').slice(0,n).map(d=>d.id);
 else if(r.key==='study')s.stats.studyTier0=n;
 else if(r.key==='maxRealm')s.paths[s.route]={realm:n,layer:1,xp:0,reserve:0};
 else s.stats[r.key]=n;
}
function meet(s,rs){for(const r of rs||[])if(S.value(s,r)<r.count)metric(s,r,r.count);}
function toMission(s,id,choice='protect'){
 act(s,{type:'beginStory',episode:id});
 let steps=0;while(S.journeyView(s,id).stage==='intro'){assert(++steps<200);act(s,{type:'advanceStory',episode:id});}
 for(const clue of S.episode(id).clues)act(s,{type:'inspectStory',episode:id,clue:clue.id});
 act(s,{type:'advanceStory',episode:id});act(s,{type:'chooseStory',episode:id,choice});
 while(S.journeyView(s,id).stage==='reply'){assert(++steps<300);act(s,{type:'advanceStory',episode:id});}
 assert.equal(S.journeyView(s,id).stage,'mission');
}
function freshGoal(s,id){const v=S.journeyView(s,id);metric(s,v.mission.goal,v.entry.baseline+v.mission.required);}
function toReady(s,id){let steps=0;while(S.journeyView(s,id).stage==='mission'){act(s,{type:'advanceStory',episode:id});while(S.journeyView(s,id).stage==='interlude'){assert(++steps<500);act(s,{type:'advanceStory',episode:id});}if(S.journeyView(s,id).stage==='mission')freshGoal(s,id);}while(S.journeyView(s,id).stage==='outro'){assert(++steps<700);act(s,{type:'advanceStory',episode:id});}assert.equal(S.journeyView(s,id).ready,true);}
function stock(){const s=E.createState(NOW);s.paths.magic={realm:5,layer:10,xp:0,reserve:0};s.stones=1000000;for(const id of Object.keys(s.materials))s.materials[id]=10000;return s;}

test('all twenty-four episodes provide distinct scenes, two inspectable clues and actionable branches',()=>{
 const ids=[...C.chapters.map(ch=>'chapter_'+ch.id),...C.sidequests.map(q=>q.id)];
 assert.equal(Object.keys(N.episodes).length,24);
 const fingerprints=new Set();
 for(const id of ids){const ep=S.episode(id);assert(ep,id);assert(ep.intro.length>=3,id+' scene has a conversation');assert.equal(ep.clues.length,2,id+' has two evidence sources');assert.equal(new Set(ep.clues.map(x=>x.id)).size,2);assert(ep.clues.every(x=>x.title&&x.text));
  const text=ep.intro.map(x=>typeof x==='string'?x:x.text).join(' ');assert(!fingerprints.has(text),id+' original introduction');fingerprints.add(text);
  for(const choice of ['protect','seek']){assert(ep.choices[choice].reply.length>=2);assert(ep.outro[choice].length>=2);const goals=S.missionGoals(ep.choices[choice]);assert.equal(goals.length,ep.kind==='chapter'?3:1);assert.deepEqual(ep.choices[choice].goal,goals[0]);if(ep.kind==='chapter'){assert.equal(ep.choices[choice].interludes.length,2);assert(ep.choices[choice].interludes.every(lines=>lines.length>=3));}for(const goal of goals){assert(Number.isSafeInteger(goal.count)&&goal.count>0);assert(goal.key&&goal.label&&goal.nav);}}
 }
});

test('reading and investigating persist at exact dialogue position and require both clues before decision',()=>{
 let s=E.createState(NOW),id='chapter_0';act(s,{type:'beginStory',episode:id});
 const wealth=copy({stones:s.stones,materials:s.materials,tickets:s.tickets});
 act(s,{type:'advanceStory',episode:id});assert.equal(s.story.journeys[id].line,1);
 const restored=E.validate(E.serialize(s));assert.equal(restored.ok,true,restored.error);s=restored.state;assert.equal(S.journeyView(s,id).entry.line,1);
 denied(s,{type:'inspectStory',episode:id,clue:S.episode(id).clues[0].id});
 denied(s,{type:'chooseStory',episode:id,choice:'protect'});
 while(S.journeyView(s,id).stage==='intro')act(s,{type:'advanceStory',episode:id});
 denied(s,{type:'advanceStory',episode:id});
 const clues=S.episode(id).clues;act(s,{type:'inspectStory',episode:id,clue:clues[0].id});act(s,{type:'inspectStory',episode:id,clue:clues[0].id});assert.equal(s.story.journeys[id].clues.length,1);
 denied(s,{type:'inspectStory',episode:id,clue:'invented-evidence'});denied(s,{type:'advanceStory',episode:id});
 act(s,{type:'inspectStory',episode:id,clue:clues[1].id});act(s,{type:'advanceStory',episode:id});assert.equal(S.journeyView(s,id).stage,'decision');
 assert.deepEqual({stones:s.stones,materials:s.materials,tickets:s.tickets},wealth,'dialogue and clues award no resources');
});

test('pre-existing accomplishments cannot finish a story, while actual new alchemy can fulfil an agreed action',()=>{
 const pair=['chapter_0',...C.sidequests.filter(q=>!q.previous).map(q=>q.id)].flatMap(id=>['protect','seek'].map(choice=>({id,choice,ep:S.episode(id)}))).find(x=>x.ep.choices[x.choice].goal.key==='crafted');assert(pair,'at least one medicinal story uses actual crafting');
 const s=stock();meet(s,pair.ep.requirements);s.stats.crafted=Math.max(s.stats.crafted,37);toMission(s,pair.id,pair.choice);
 const view=S.journeyView(s,pair.id);assert.equal(view.entry.baseline,37);assert.equal(view.mission.current,0);assert.equal(view.mission.done,false);denied(s,{type:'advanceStory',episode:pair.id});
 act(s,{type:'craftPill',id:'heal0',count:view.mission.required});assert.equal(S.journeyView(s,pair.id).mission.done,true);assert.equal(S.journeyView(s,pair.id).stage,'mission','new action still needs a return conversation');
 toReady(s,pair.id);const result=pair.ep.kind==='chapter'?act(s,{type:'claimChapter',choice:pair.choice}):act(s,{type:'claimSidequest',id:pair.id});assert(result.data.reward);
 denied(s,{type:'beginStory',episode:pair.id});
});

test('the saved choice is immutable and action progress cannot bypass original cultivation requirements',()=>{
 const s=E.createState(NOW),id='chapter_0';toMission(s,id,'seek');const baseline=s.story.journeys[id].baseline;
 denied(s,{type:'chooseStory',episode:id,choice:'protect'});assert.equal(s.story.journeys[id].choice,'seek');assert.equal(s.story.journeys[id].baseline,baseline);
 freshGoal(s,id);while(S.journeyView(s,id).mission.index<S.journeyView(s,id).mission.total-1){assert.equal(S.journeyView(s,id).mission.canReturn,true,'intermediate return does not require final cultivation');act(s,{type:'advanceStory',episode:id});while(S.journeyView(s,id).stage==='interlude')act(s,{type:'advanceStory',episode:id});freshGoal(s,id);}
 assert.equal(S.journeyView(s,id).mission.done,true);assert(S.journeyView(s,id).requirements.some(x=>!x.done));assert.equal(S.journeyView(s,id).mission.canReturn,false);denied(s,{type:'advanceStory',episode:id});
 meet(s,S.episode(id).requirements);toReady(s,id);denied(s,{type:'claimChapter',choice:'protect'});act(s,{type:'claimChapter',choice:'seek'});assert.equal(s.story.truth,1);assert.equal(s.story.mercy,0);
});

for(const choice of ['protect','seek'])test('all six chapters and eighteen side stories are reachable with '+choice+' and pay exactly once',()=>{
 const s=stock();
 for(const ch of C.chapters){const id='chapter_'+ch.id;meet(s,ch.requirements);toMission(s,id,choice);freshGoal(s,id);toReady(s,id);const before=s.stones;act(s,{type:'claimChapter',choice});assert.equal(s.stones-before,ch.reward.stones);assert.equal(S.journeyView(s,id).stage,'completed');denied(s,{type:'beginStory',episode:id});}
 for(const q of C.sidequests){meet(s,q.requirements);toMission(s,q.id,choice);freshGoal(s,q.id);toReady(s,q.id);const before=s.stones;act(s,{type:'claimSidequest',id:q.id});assert.equal(s.stones-before,q.reward.stones);denied(s,{type:'claimSidequest',id:q.id});}
 assert.equal(s.story.chapter,6);assert.equal(s.story.sideCompleted.length,18);assert.equal(Object.keys(s.story.journeys).length,24);assert(Object.values(s.companions).every(c=>!c.bond));
 assert.equal(s.story[choice==='protect'?'mercy':'truth'],6);assert.equal(E.validate(E.serialize(s)).ok,true);
 act(s,{type:'ending',choice:'teacher'});assert.equal(s.story.ending.id,'teacher','choices guide but do not force a specific ending');
});


test('interludes resume in place and each new mission counts actions only after its own conversation',()=>{
 let s=stock(),id='chapter_0';meet(s,S.episode(id).requirements);toMission(s,id,'protect');freshGoal(s,id);act(s,{type:'advanceStory',episode:id});
 assert.equal(S.journeyView(s,id).stage,'interlude');assert.equal(s.story.journeys[id].missionIndex,0);
 act(s,{type:'advanceStory',episode:id});const savedLine=s.story.journeys[id].line;const imported=E.validate(E.serialize(s));assert.equal(imported.ok,true,imported.error);s=imported.state;assert.equal(s.story.journeys[id].line,savedLine);
 const next=S.missionGoals(S.episode(id).choices.protect)[1];metric(s,next,S.value(s,next)+7);const alreadyEarned=S.value(s,next);
 while(S.journeyView(s,id).stage==='interlude')act(s,{type:'advanceStory',episode:id});
 assert.equal(s.story.journeys[id].missionIndex,1);assert.equal(s.story.journeys[id].baseline,alreadyEarned);assert.equal(S.journeyView(s,id).mission.current,0);assert.equal(S.journeyView(s,id).mission.done,false);denied(s,{type:'advanceStory',episode:id});
 freshGoal(s,id);toReady(s,id);assert.equal(s.story.journeys[id].missionIndex,2);
});

test('legacy completed stories migrate without replay or duplicate rewards',()=>{
 const s=stock();s.story.chapter=2;s.story.mercy=1;s.story.truth=1;s.story.completed=[0,1];s.story.sideCompleted=['qinglan_0'];s.companions.qinglan.questStep=1;delete s.story.journeys;
 const imported=E.validate(s);assert.equal(imported.ok,true,imported.error);assert.deepEqual(imported.state.story.journeys,{});
 assert.equal(S.journeyView(imported.state,'chapter_0').completed,true);assert.equal(S.journeyView(imported.state,'qinglan_0').completed,true);assert.equal(S.journeyView(imported.state,'chapter_2').stage,'not-started');
 denied(imported.state,{type:'beginStory',episode:'chapter_0'});denied(imported.state,{type:'claimSidequest',id:'qinglan_0'});
});

test('a final trial win awaits the final oath, while actual old terminal records remain compatible',()=>{
 const s=stock();s.story.chapter=6;s.story.mercy=3;s.story.truth=3;s.story.completed=C.chapters.map(ch=>ch.id);s.progress.endingTrials.magic=true;
 assert.equal(S.value(s,{key:'endingTrial'}),0,'new terminal win alone does not resolve the oath');denied(s,{type:'ending',choice:'guardian'});
 const legacy=copy(s);delete legacy.ritualLegacyWins;const imported=E.validate(legacy);assert.equal(imported.ok,true,imported.error);assert.equal(imported.state.ritualLegacyWins['magic:5'],true);assert.equal(S.value(imported.state,{key:'endingTrial'}),1);act(imported.state,{type:'ending',choice:'wanderer'});
 s.ritualHistory.push({route:'magic',realm:5,choice:'promise',at:NOW});assert.equal(S.value(s,{key:'endingTrial'}),1);act(s,{type:'ending',choice:'guardian'});assert.equal(s.story.ending.id,'guardian');
});

test('future chapters and missing personal predecessors cannot be opened even with endgame resources',()=>{
 const s=stock();denied(s,{type:'beginStory',episode:'chapter_1'});denied(s,{type:'beginStory',episode:'qinglan_1'});denied(s,{type:'beginStory',episode:'unknown'});denied(s,{type:'advanceStory',episode:'chapter_0'});
});

test('malformed journey positions, skipped clues, premature ready states and duplicate completion records are rejected',()=>{
 const s=stock(),id='chapter_0';meet(s,S.episode(id).requirements);toMission(s,id,'protect');
 const mutants=[
  t=>t.story.journeys[id].stage='invented',t=>t.story.journeys[id].missionIndex=-1,t=>t.story.journeys[id].missionIndex=.5,t=>t.story.journeys[id].missionIndex=3,t=>delete t.story.journeys[id].missionIndex,t=>t.story.journeys[id].line=-1,t=>t.story.journeys[id].line=.5,t=>t.story.journeys[id].line=999,
  t=>t.story.journeys[id].choice='invented',t=>t.story.journeys[id].choice=null,t=>t.story.journeys[id].baseline=-1,t=>t.story.journeys[id].baseline=1e12+1,
  t=>t.story.journeys[id].baseline+=1,t=>t.story.journeys[id].clues=['invented'],t=>t.story.journeys[id].clues=[t.story.journeys[id].clues[0],t.story.journeys[id].clues[0]],
  t=>t.story.journeys[id].clues=[],t=>t.story.journeys[id].stage='ready',t=>t.story.journeys[id].stage='completed',t=>t.story.journeys[id].grant=true,
  t=>t.story.journeys.unknown=copy(t.story.journeys[id]),t=>t.story.journeys.chapter_1=copy(t.story.journeys[id]),t=>t.story.journeys.qinglan_1=copy(t.story.journeys[id]),
  t=>t.story.completed=[0],t=>t.story.sideCompleted=['qinglan_0','qinglan_0'],t=>t.story.journeys=null
 ];
 for(const mutate of mutants){const t=copy(s);mutate(t);const checked=E.validate(t);assert.equal(checked.ok,false,mutate.toString());assert.equal(checked.state,null);}
});
