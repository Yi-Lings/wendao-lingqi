'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../web/data.js');
const N=require('../web/story-scenes.js');
const choices=e=>Object.fromEntries(e.choices.map(branch=>[branch.id,branch]));
const text=lines=>lines.map(line=>line.text).join('\n');
const rivalName=dungeon=>C.rivals[dungeon.enemy.rivalId].name.split('·')[0];

test('tournament decisions explain the actual chosen activity rather than an obsolete alchemy or boss mission',()=>{
 const arena=choices(N.episodes.chapter_1),secret=choices(N.episodes.chapter_2);
 for(const branch of Object.values(arena)){
  assert.match(branch.label,/斗技|应对|实战/,'the player agrees to participate in the actual tournament');
  assert.doesNotMatch(branch.label,/净炉成丹|查山君/,'the decision must not promise the removed mission');
  assert(branch.goals.every(goal=>C.dungeons[goal.id].competition==='arena'));
 }
 for(const branch of Object.values(secret)){
  assert.match(branch.label,/逐关|首席/,'the player agrees to progress through actual competition stages');
  assert.doesNotMatch(branch.label,/寒鸦/,'a separate cumulative boss prerequisite must not be presented as the chosen mission');
  assert(branch.goals.every(goal=>C.dungeons[goal.id].competition==='secret'));
 }
 assert.notEqual(arena.protect.label,arena.seek.label,'different motives remain readable');
 assert.notEqual(secret.protect.label,secret.seek.label,'different motives remain readable');
});

test('each tournament objective and its preceding narrative identify the rival actually fought in the dungeon catalog',()=>{
 const rivals=Object.values(C.dungeons).filter(d=>d.type==='arena').map(rivalName);
 for(const id of ['chapter_1','chapter_2']){
  const episode=N.episodes[id];
  for(const branch of episode.choices){
   for(const [index,goal] of branch.goals.entries()){
    const actual=C.dungeons[goal.id];
    assert(actual&&actual.type==='arena',id+' must point at a real competition battle');
    const name=rivalName(actual);
    assert(goal.label.includes(name),id+' stage '+(index+1)+' must name its catalog opponent '+name);
    for(const other of new Set(rivals))if(other!==name)assert(!goal.label.includes(other),'a stage must not claim a different opponent');
    const preceding=index===0?[...episode.intro,...branch.reply]:branch.interludes[index-1];
    assert(text(preceding).includes(name),id+' stage '+(index+1)+' prepares the player for '+name);
   }
  }
 }
});

test('the narrative after each of the first two competition victories names the defeated catalog opponent',()=>{
 for(const id of ['chapter_1','chapter_2'])for(const branch of N.episodes[id].choices){
  for(let index=0;index<2;index++){
   const actual=C.dungeons[branch.goals[index].id];
   const firstLine=branch.interludes[index][0];
   assert.equal(firstLine.speaker,'narrator');
   assert(firstLine.text.includes(rivalName(actual)),id+' stage '+(index+1)+' victory must follow the actual opponent');
  }
 }
 for(const episode of Object.values(N.episodes))for(const branch of episode.choices)for(const goal of branch.goals||[branch.goal]){
  if(goal.key==='bossWins')assert(goal.label.includes(C.dungeons[goal.id].name),'boss mission uses the catalog name: '+goal.id);
 }
});

test('revised locations use reviewed scenery and measured interior windows',()=>{
 const crop=(file,col,row)=>({file,cols:3,rows:2,col,row});
 const full=file=>({file,cols:1,rows:1,col:0,row:0});
 const expected={
  chapter_1:full('story-arena.png'),chapter_2:full('story-secret.png'),
  qinglan_1:crop('v3-map-atlas-a.png',0,0),
  yueheng_1:crop('v3-map-atlas-a.png',2,0),
  yueheng_0:{file:'v8-interiors-atlas.png',cols:2,rows:1,col:1,row:0,crop:[888/1774,0,886/1774,1]},
  yueheng_2:full('story-infirmary-night.png'),
  yueheng_3:{file:'v8-interiors-atlas.png',cols:2,rows:1,col:0,row:0,crop:[0,0,886/1774,1]},
  suyan_1:crop('v3-map-atlas-a.png',2,1),
  world_forge:crop('v3-map-atlas-a.png',2,0),
  world_tower:crop('v3-map-atlas-a.png',0,1)
 };
 for(const [id,art] of Object.entries(expected))assert.deepEqual(N.episodes[id].art,art,id+' scenery follows the actual described location');
 assert.match(N.episodes.yueheng_0.location,/炼丹房/,'the reviewed furnace interior is used for the actual alchemy room');
 assert.match(N.episodes.world_sect.location,/学舍外/,'the outdoor background is not claimed to be an interior');
 assert.match(N.episodes.yueheng_3.location,/书院.*试读桌/,'the reviewed library desk is used for reading the book');
 assert.match(N.episodes.yueheng_2.location,/医舍.*雨夜/,'the night ward illustration matches the actual scene');
});

test('aftermath letters describe a trial victory while unpaid realm advancement and perfection remain pending',()=>{
 const E=require('../web/engine.js'),A=require('../web/ascension.js');
 const Screen=require('../web/ascension-screen.js');
 const {stageFixtures}=require('./ascension-fixtures.cjs');
 const fixtures=stageFixtures().filter(fixture=>/^trial-won-[0-2]$/.test(fixture.name));
 assert.equal(fixtures.length,3,'all three real celestial trial wins are exercised');
 for(const fixture of fixtures){
  const s=fixture.state,realm=s.ascension.realm;
  s.materials.ore=0;s.materials.essence=0;s.ascension.yuan=0;
  assert(E.validate(s).ok,'the pending state is a valid saved character');
  const before=JSON.stringify(s),v=A.view(s);
  assert.equal(v.realmFull,true);assert.equal(v.trialFresh,true);
  assert.equal(v.canBreakthrough,false,'a trial win does not pay the actual advancement cost');
  assert.equal(s.ascension.perfected,false,'even the final won trial awaits an explicit payment');
  assert(v.realmNarrative.unlockedSections.includes('after'),'victory aftermath remains readable before payment');
  const after=text(v.realmNarrative.after),html=Screen.render(s,v);
  assert.match(after,/尚需|仍须/,'aftermath explains the remaining actual preparation');
  assert.match(after,/阵材.*炼化仙元/,'the player learns why winning was not the final advancement action');
  assert.doesNotMatch(after,/得到的是更坚实的仙元与真实进阶|进阶仙元沉入更深气海|金仙之名落定/,'the old premature completion claims do not render');
  assert(html.includes('道劫之后 · 归途回响'));
  for(const line of v.realmNarrative.after)assert(html.includes(line.text),'the pending-stage letter is actually rendered');
  assert.equal(JSON.stringify(s),before,'reading and rendering aftermath must not grant a realm');
  const result=E.act(s,{type:'celestialBreakthrough'},s.lastSavedAt||1791244800000);
  assert.equal(result.ok,false,'the backend still rejects an unpaid advancement');
  assert.equal(s.ascension.realm,realm);assert.equal(s.ascension.perfected,false);
 }
});
