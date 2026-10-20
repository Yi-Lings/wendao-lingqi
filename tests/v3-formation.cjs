'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const E=require('../web/engine'),S=require('../web/story'),N=require('../web/story-scenes'),F=E.modules.formation,Screen=require('../web/formation-screen');
const {toMission,creditMissionFixture,finishJourney,readyJourneyFixture}=require('./story-fixtures.cjs');
const NOW=1800000000000,copy=x=>JSON.parse(JSON.stringify(x));
function stock(route='magic'){const s=E.createState(NOW);s.training=false;s.route=route;s.paths[route]={realm:5,layer:10,xp:0,reserve:0};s.stones=1000000;for(const id of Object.keys(s.materials))s.materials[id]=10000;for(const c of Object.values(s.companions))c.affinity=100;s.migrationCompensation[route]={attack:50000,defense:10000,maxHp:100000};return s;}
function act(s,a){const r=E.act(s,a,NOW);assert(r.ok,a.type+': '+r.message);return r;}
function denied(s,a){const before=copy(s),r=E.act(s,a,NOW);assert.equal(r.ok,false,JSON.stringify(a));assert.deepEqual(s,before);return r;}
function mission(id='village_lamp',route='magic'){
 const s=stock(route),c=F.catalog[id];if(c.episode==='chapter_2'){s.story.chapter=2;s.story.completed=[0,1];s.story.mercy=2;}
 toMission(s,c.episode,c.choice,NOW);while(S.journeyView(s,c.episode).mission.index<c.missionIndex){creditMissionFixture(s,c.episode);finishJourney(s,c.episode,NOW);}assert.equal(S.journeyView(s,c.episode).mission.goal.id,id);return s;
}
function align(s,id){const c=F.catalog[id];for(let tile=0;tile<9;tile++)if(c.tiles[tile])while(s.formations[id].rotations[tile])act(s,{type:'turnFormation',id,tile,step:1});}
function battle(s,id,practice=false){act(s,{type:'startDungeon',id,practice,difficulty:0});for(let n=0;n<400&&s.battle;n++){const r=E.tick(s,2);assert(r.ok,r.message);}assert.equal(s.battle,null);assert(s.lastBattleResult.win);}
function wealth(s){return copy({stones:s.stones,materials:s.materials,pills:s.pills,tickets:s.tickets,rng:s.rngStreams,production:s.production});}

test('three authored formation puzzles have different routes, seven stones, three checkpoints and an unsolved start',()=>{
 const signatures=new Set();for(const c of Object.values(F.catalog)){assert.equal(c.tiles.filter(Boolean).length,7);assert.equal(c.targets.length,3);assert.equal(F.circuit(c,c.initial).solved,false);const solved=F.circuit(c,Array(9).fill(0));assert(solved.solved);assert.equal(solved.leaks,0);assert.equal(solved.lit.length,7);signatures.add(c.tiles.map(t=>t?t.ports.join(''):'.').join('/'));assert(c.rule.includes('退口')||c.rule.includes('退'));}assert.equal(signatures.size,3);
});
test('a rotation changes actual connectivity; reciprocal edges and boundaries determine the lit path',()=>{
 const c=F.catalog.village_lamp,zero=Array(9).fill(0);let f=F.circuit(c,zero);assert(f.solved);for(const tile of [3,0,1,7,8,5]){const r=[...zero];r[tile]=1;const changed=F.circuit(c,r);assert.equal(changed.solved,false,'turning a corner breaks the route');assert(changed.leaks||!changed.fed||!changed.sink);}const half=[...zero];half[4]=2;assert.equal(F.circuit(c,half).solved,true,'a straight channel is symmetric');
});
test('viewing an active diagram or renderer never creates progress or writes a record',()=>{
 const s=mission(),before=copy(s),v=F.view(s,'village_lamp');assert.equal(v.note,null);const html=Screen.render(v);assert(html.body.includes('展开护阵图'));assert.deepEqual(s,before);assert.equal(S.journeyView(s,'chapter_0').mission.done,false);
});
for(const route of ['magic','body'])for(const id of Object.keys(F.catalog))test(route+' / '+id+' requires a real victory and a connected return route, with no extra economic reward',()=>{
 const s=mission(id,route),c=F.catalog[id];battle(s,c.source);const before=wealth(s);act(s,{type:'beginFormation',id});align(s,id);assert.equal(S.journeyView(s,c.episode).mission.done,false,'a connected graph still requires deliberate verification');const result=act(s,{type:'testFormation',id});assert.equal(result.data.correct,true);assert.equal(S.journeyView(s,c.episode).mission.current,1);assert.deepEqual(wealth(s),before);assert.equal(E.validate(E.serialize(s)).ok,true);denied(s,{type:'turnFormation',id,tile:c.sourcePort.tile,step:1});denied(s,{type:'testFormation',id});
});
test('clock-free inspection and rotations remain usable before the actual combat; practice does not satisfy provenance',()=>{
 const s=mission(),id='village_lamp';battle(s,'resource_herb',true);assert.equal(s.progress.dungeonWins.resource_herb||0,0);act(s,{type:'beginFormation',id});align(s,id);assert.match(denied(s,{type:'testFormation',id}).message,/正式取药/);assert.equal(s.formations[id].attempts,0);assert.equal(F.view(s,id).flow.solved,true);assert.equal(F.view(s,id).resolved,false);
});
test('a failed test is recoverable without resources or RNG changes; inverse rotation restores exact channels',()=>{
 const s=mission(),id='village_lamp',c=F.catalog[id];s.progress.dungeonWins[c.source]=1;act(s,{type:'beginFormation',id});const before=wealth(s),r=act(s,{type:'testFormation',id});assert.equal(r.data.correct,false);assert(s.formations[id].verdict);const rotations=[...s.formations[id].rotations];act(s,{type:'turnFormation',id,tile:3,step:1});act(s,{type:'turnFormation',id,tile:3,step:-1});assert.deepEqual(s.formations[id].rotations,rotations);assert.equal(s.formations[id].verdict,null);align(s,id);assert.equal(act(s,{type:'testFormation',id}).data.correct,true);assert.deepEqual(wealth(s),before);assert.equal(s.formations[id].attempts,2);
});
test('invalid stone indices, sealed stones, directions and out-of-order requests are atomic',()=>{
 const s=mission(),id='village_lamp';denied(s,{type:'turnFormation',id,tile:0,step:1});denied(s,{type:'beginFormation',id:'archive_exit'});denied(s,{type:'beginFormation',id:'__proto__'});act(s,{type:'beginFormation',id});for(const [tile,step]of [[2,1],[6,1],[-1,1],[9,1],[0,0],[0,2],[0,'1'],['0',1],[1.5,1]])denied(s,{type:'turnFormation',id,tile,step});
});
test('partial direction and the last failed judgment survive an exact save round trip',()=>{
 const s=mission('archive_exit'),id='archive_exit';s.progress.dungeonWins.secret_2=1;act(s,{type:'beginFormation',id});act(s,{type:'turnFormation',id,tile:6,step:-1});act(s,{type:'testFormation',id});const r=E.validate(E.serialize(s));assert(r.ok,r.error);assert.deepEqual(r.state.formations,s.formations);assert.equal(F.view(r.state,id).resolved,false);
});
test('every active battle, cave, joint practice or unfinished ritual blocks the whole formation transaction',()=>{
 const original=mission();act(original,{type:'beginFormation',id:'village_lamp'});for(const overlay of [{battle:{}},{exploration:{}},{joint:{}},{ritual:{phase:'array'}}])for(const action of [{type:'beginFormation'},{type:'turnFormation',tile:3,step:1},{type:'testFormation'}]){const s=copy(original);Object.assign(s,overlay);const before=copy(s);assert.equal(F.handle(s,{...action,id:'village_lamp'},NOW).ok,false);assert.deepEqual(s,before);}
});
test('malformed arrays, unknown notes, forged verdicts and inconsistent chapter or choice cannot import',()=>{
 const s=mission(),id='village_lamp';act(s,{type:'beginFormation',id});const mutations=[t=>t.formations=[],t=>t.formations.fake=copy(t.formations[id]),t=>t.formations[id].extra=1,t=>t.formations[id].rotations.pop(),t=>t.formations[id].rotations[2]=1,t=>t.formations[id].rotations[0]=4,t=>t.formations[id].rotations[0]='1',t=>t.formations[id].moves=-1,t=>t.formations[id].attempts=101,t=>t.formations[id].startedAt=-1,t=>t.formations[id].resolvedAt=NOW,t=>t.formations[id].verdict='resolved',t=>t.story.journeys.chapter_0.rulesVersion=3,t=>t.story.journeys.chapter_0.choice='seek'];for(const mutate of mutations){const t=copy(s);mutate(t);assert.equal(E.validate(t).ok,false,mutate.toString());}
});
test('a resolved record requires actual ports, nonzero moves, formal victory, valid time and the saved original branch',()=>{
 const s=mission(),id='village_lamp';s.progress.dungeonWins.resource_herb=1;act(s,{type:'beginFormation',id});align(s,id);act(s,{type:'testFormation',id});for(const mutate of [t=>t.formations[id].rotations[3]=1,t=>t.formations[id].moves=0,t=>t.formations[id].attempts=0,t=>t.formations[id].resolvedAt=NOW-1,t=>t.progress.dungeonWins.resource_herb=0,t=>t.story.journeys.chapter_0.choice='seek']){const t=copy(s);mutate(t);assert.equal(E.validate(t).ok,false);}
});
test('later story checkpoints keep their actual proof, and the completed diagram is immutable in full replay',()=>{
 const s=stock();readyJourneyFixture(s,'chapter_0','protect',NOW);act(s,{type:'claimChapter',choice:'protect'});const before=copy(s),v=F.view(s,'village_lamp'),html=Screen.render(v);assert(v.resolved);assert(!html.body.includes('data-action='));assert(!html.footer.includes('data-action='));assert.match(html.body,/回村的路也没有封死/);assert(S.replayView(s,'chapter_0').sections.some(x=>x.id==='formation_village_lamp'));assert.deepEqual(s,before);const t=copy(s);delete t.formations.village_lamp;assert.equal(E.validate(t).ok,false);
});
for(const version of [1,2,3])test('accepted V'+version+' protect promises restore every phase without acquiring a new puzzle',()=>{
 const s=stock(),id='chapter_0';act(s,{type:'beginStory',episode:id});if(version===1)delete s.story.journeys[id].rulesVersion;else s.story.journeys[id].rulesVersion=version;const seen=new Set();
 for(let guard=0;guard<120;guard++){const j=S.journeyView(s,id);seen.add(j.stage);assert.deepEqual(j.episode.choices.protect.goals,N.missionGoals(id,'protect',version));assert.equal(E.validate(E.serialize(s)).ok,true);if(j.stage==='completed')break;if(j.stage==='survey'){for(const c of j.episode.clues)if(!j.entry.clues.includes(c.id))act(s,{type:'inspectStory',episode:id,clue:c.id});act(s,{type:'advanceStory',episode:id});}else if(j.stage==='decision')act(s,{type:'chooseStory',episode:id,choice:'protect'});else if(j.stage==='mission'){creditMissionFixture(s,id);act(s,{type:'advanceStory',episode:id});}else if(j.stage==='ready')act(s,{type:'claimChapter',choice:'protect'});else act(s,{type:'advanceStory',episode:id});}
 assert.equal(seen.size,9);assert.deepEqual(s.formations,{});
});
test('old saves get an empty diagram journal; no new prior rescue or repair is invented',()=>{
 const s=stock();delete s.formations;s.story.chapter=1;s.story.completed=[0];s.story.truth=1;const r=E.validate(s);assert(r.ok,r.error);assert.deepEqual(r.state.formations,{});assert.equal(S.replayView(r.state,'chapter_0').sections.some(x=>x.id.startsWith('formation_')),false);
});
test('attempt and movement counters saturate while both rotation directions and a later correct result remain available',()=>{
 const s=mission(),id='village_lamp';s.progress.dungeonWins.resource_herb=1;act(s,{type:'beginFormation',id});s.formations[id].moves=9999;s.formations[id].attempts=100;act(s,{type:'testFormation',id});align(s,id);act(s,{type:'testFormation',id});assert.equal(s.formations[id].moves,9999);assert.equal(s.formations[id].attempts,100);assert.equal(s.formations[id].status,'resolved');
});
test('new game art has documented native sizes and distinct exact bytes, with all prior PNG and MP3 files retained',()=>{
 const record=require('../docs/art/V4_5_GENERATED_ASSETS.json'),old=require('../docs/validation/v44/summary.json');assert.equal(Object.keys(record.files).length,4);const hashes=new Set();for(const [name,r]of Object.entries(record.files)){const data=fs.readFileSync(path.join(__dirname,'..',name));assert.equal(crypto.createHash('sha256').update(data).digest('hex'),r.sha256);assert.equal(data.readUInt32BE(16),r.width);assert.equal(data.readUInt32BE(20),r.height);assert.equal(data.length,r.bytes);hashes.add(r.sha256);}assert.equal(hashes.size,4);for(const [name,hash]of Object.entries(old.webFileSha256))if(/\.(png|mp3)$/.test(name))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'..',name))).digest('hex'),hash,name);
});
test('new players can find the current story without a resource or rank gate; the lead remains pure and respects busy scenes',()=>{
 const s=E.createState(NOW),before=copy(s),j=E.journey(s);assert.equal(j.storyLead.episode,'chapter_0');assert.equal(j.storyLead.label,'走进这一卷');assert.deepEqual(s,before);const busy=stock();act(busy,{type:'startDungeon',id:'resource_herb'});assert.equal(E.journey(busy).storyLead,null);
});

test('the next volume uses a new-journey invitation rather than reusing the first snow-night introduction',()=>{
 const s=stock();s.story.chapter=2;s.story.completed=[0,1];s.story.mercy=2;const before=copy(s),lead=E.journey(s).storyLead;assert.equal(lead.episode,'chapter_2');assert(!lead.status.includes('雪夜'));assert.deepEqual(s,before);
});
