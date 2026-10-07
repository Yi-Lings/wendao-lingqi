'use strict';
// Shared journey driver uses the public facade for every dialogue transition.
// Only `creditMissionFixture` changes metrics directly: callers are explicit
// unit fixtures, not reachability/playthrough evidence. Campaigns must execute
// the declared fresh activity through ordinary engine actions.
const assert=require('node:assert/strict');
const E=require('../web/engine.js'),S=require('../web/story.js'),C=require('../web/data.js');
const NOW=1791244800000;
const actAt=(s,now)=>(a)=>{const r=E.act(s,a,now);assert.equal(r.ok,true,JSON.stringify(a)+': '+r.message);return r;};
function toMission(s,id,choice='protect',now=NOW,dispatch=actAt(s,now)){
 let v=S.journeyView(s,id);assert(v&&v.accessible,id+' is accessible');
 if(v.stage==='not-started')dispatch({type:'beginStory',episode:id});
 for(let guard=0;guard<100;guard++){
  v=S.journeyView(s,id);
  if(['mission','outro','ready','completed'].includes(v.stage))return v;
  if(v.stage==='survey')for(const clue of v.episode.clues)if(!v.entry.clues.includes(clue.id))dispatch({type:'inspectStory',episode:id,clue:clue.id});
  if(v.stage==='decision')dispatch({type:'chooseStory',episode:id,choice});
  else dispatch({type:'advanceStory',episode:id});
 }
 throw Error('Journey dialogue did not converge: '+id);
}
function creditMissionFixture(s,id){
 const v=S.journeyView(s,id),g=v.mission&&v.mission.goal;assert(g,id+' has a real mission');
 const count=Math.max(0,v.mission.required-v.mission.current);if(!count)return;
 if(g.key==='dungeonWins')s.progress.dungeonWins[g.id]=(s.progress.dungeonWins[g.id]||0)+count;
 else if(g.key==='bossWins'){
  if(g.id)s.progress.bossWins[g.id]=(s.progress.bossWins[g.id]||0)+count;
  s.stats.bosses=(s.stats.bosses||0)+count;
 }else if(g.key==='study')s.stats.studyTier0=(s.stats.studyTier0||0)+count;
 else if(g.key==='tower')s.progress.tower+=count;
 else if(g.key==='knownTechniques'){
  for(const id of Object.keys(C.techniques).filter(id=>!s.techniques[id]).slice(0,count))s.techniques[id]={level:1,branch:0,spent:0,resetUsed:false};
 }else if(g.key==='sectTrialCount'){
  const next=Object.values(C.dungeons).filter(x=>x.type==='sect'&&!s.progress.sectTrials.includes(x.id)).slice(0,count);s.progress.sectTrials.push(...next.map(x=>x.id));
 }else if(g.key==='affinity')s.companions[g.id].affinity+=count;
 else s.stats[g.key]=(s.stats[g.key]||0)+count;
 assert.equal(S.journeyView(s,id).mission.done,true,'explicit fixture credits actual declared metric '+g.key);
 assert.equal(E.validate(E.serialize(s)).ok,true,'mission unit fixture remains valid');
}
function finishJourney(s,id,now=NOW,dispatch=actAt(s,now)){
 for(let guard=0;guard<100;guard++){
  const v=S.journeyView(s,id);assert(v,id+' exists');if(v.stage==='ready'||v.stage==='completed')return v;
  assert(['mission','interlude','outro'].includes(v.stage),id+' has reached mission before return dialogue');
  if(v.stage==='mission'&&(!v.mission.done||v.mission.canReturn===false))return v;
  dispatch({type:'advanceStory',episode:id});
 }
 throw Error('Journey return dialogue did not converge: '+id);
}
function readyJourneyFixture(s,id,choice='protect',now=NOW){
 toMission(s,id,choice,now);
 for(let guard=0;guard<20;guard++){const v=S.journeyView(s,id);if(v.stage==='ready'||v.stage==='completed')return v;creditMissionFixture(s,id);finishJourney(s,id,now);}
 throw Error('Fixture did not complete every fresh chapter mission: '+id);
}
module.exports={toMission,creditMissionFixture,finishJourney,readyJourneyFixture};
