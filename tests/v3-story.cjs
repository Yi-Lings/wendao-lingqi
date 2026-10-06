'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const E=require('../web/engine.js');
const C=require('../web/data.js');
const S=require('../web/story.js');
const NOW=1791244800000;
const clone=x=>JSON.parse(JSON.stringify(x));
function valid(s,label){
 const checked=E.validate(E.serialize(s));
 assert.equal(checked.ok,true,(label||'roundtrip')+': '+checked.error);
 return checked.state;
}
function fixture(route='magic',tier=0,layer=1){
 const s=E.createState(NOW);s.route=route;
 s.paths[route]={realm:tier,layer,xp:0,reserve:0};
 return s;
}
function meet(s,requirements){
 for(const r of requirements||[]){
  if(r.key==='rank'){const old=E.modules.core.pathRank(s);if(old<r.count)s.paths[s.route]={realm:Math.floor(r.count/10),layer:r.count%10+1,xp:0,reserve:0};}
  else if(r.key==='sect'){s.sect.joined=true;s.sect.school='sword';}
  else if(r.key==='bossWins'){s.progress.bossWins[r.id]=r.count;s.stats.bosses=Math.max(s.stats.bosses,r.count);}
  else if(r.key==='dungeonWins')s.progress.dungeonWins[r.id]=r.count;
  else if(r.key==='tower')s.progress.tower=Math.max(s.progress.tower,r.count);
  else if(r.key==='endingTrial')s.progress.endingTrials[s.route]=true;
  else if(r.key==='affinity')s.companions[r.id].affinity=Math.max(s.companions[r.id].affinity,r.count);
  else if(r.key==='sectTrialCount')s.progress.sectTrials=Object.values(C.dungeons).filter(x=>x.type==='sect').slice(0,r.count).map(x=>x.id);
  else s.stats[r.key]=Math.max(s.stats[r.key]||0,r.count);
 }
 return valid(s,'fixture meets requirements');
}
function rewardCheck(before,after,r,label){
 for(const key of ['stones','tickets','dust'])if(r[key])assert.equal(after[key]-before[key],r[key],label+' '+key);
 if(r.contribution)assert.equal(after.sect.contribution-before.sect.contribution,r.contribution,label+' contribution');
 for(const field of ['materials','pills','fragments'])for(const [id,n]of Object.entries(r[field]||{}))assert.equal((after[field][id]||0)-(before[field][id]||0),n,label+' '+field+'.'+id);
 if(r.xp){const a=after.paths[after.route],b=before.paths[before.route];assert.equal((a.xp+a.reserve)-(b.xp+b.reserve),r.xp,label+' xp');}
 let expectedDup=0;
 for(const id of r.techniques||[]){assert(after.techniques[id],label+' technique '+id);if(before.techniques[id])expectedDup+=C.duplicateTechniqueFragments;}
 if(expectedDup)assert.equal((after.fragments.universal||0)-(before.fragments.universal||0),(r.fragments?.universal||0)+expectedDup,label+' duplicate fragments');
 for(const id of r.treasures||[])assert.equal(after.ownedTreasures[id].count-(before.ownedTreasures[id]?.count||0),1,label+' treasure '+id);
 for(const id of r.blueprints||[])assert(after.blueprints.includes(id),label+' blueprint '+id);
}
function deniedUnchanged(s,action,label){
 const before=JSON.stringify(s),result=E.act(s,action,NOW);
 assert.equal(result.ok,false,label+' should fail: '+result.message);
 assert.equal(JSON.stringify(s),before,label+' must not mutate save');
}

test('chapter prerequisites reject without changing state',()=>{
 const s=fixture();deniedUnchanged(s,{type:'claimChapter',choice:'protect'},'initial gate');
 deniedUnchanged(s,{type:'claimChapter',choice:'bad'},'invalid choice');
});
for(const route of ['magic','body']){
 test('all six chapters and ending on '+route+' with untouched secondary path and no romance',()=>{
  let s=fixture(route);
  for(const ch of C.chapters){
   s=meet(s,ch.requirements);const before=clone(s),result=E.act(s,{type:'claimChapter',choice:ch.id%2?'seek':'protect'},NOW);
   assert.equal(result.ok,true,ch.name+': '+result.message);
   assert.equal(result.data.chapter,ch.id);
   assert.equal(s.story.chapter,ch.id+1);
   assert(s.story.completed.includes(ch.id));rewardCheck(before,s,ch.reward,ch.name);
   assert(Object.values(s.companions).every(x=>!x.bond));
   assert.equal(s.paths[route==='magic'?'body':'magic'].realm,0);
   assert.equal(s.paths[route==='magic'?'body':'magic'].layer,1);
   s=valid(s,ch.name+' save');
   deniedUnchanged(s,{type:'claimChapter',choice:'protect'},'next chapter is still gated after '+ch.name);
  }
  assert.equal(s.story.completed.length,6);
  const result=E.act(s,{type:'ending',choice:'guardian'},NOW);assert.equal(result.ok,true,result.message);
  assert.equal(s.story.ending.id,'guardian');s=valid(s,'ending save');
  deniedUnchanged(s,{type:'ending',choice:'wanderer'},'ending cannot duplicate');
 });
}
for(const quest of C.sidequests){
 test('sidequest '+quest.id+' grants complete rewards once and validates',()=>{
  let s=fixture();
  if(quest.previous){
   const ids=C.companions[quest.companion].questIds;
   s.story.sideCompleted=ids.slice(0,quest.step);s.companions[quest.companion].questStep=quest.step;
  }
  s=meet(s,quest.requirements);
  const before=clone(s),result=E.act(s,{type:'claimSidequest',id:quest.id},NOW);
  assert.equal(result.ok,true,result.message);assert(s.story.sideCompleted.includes(quest.id));
  rewardCheck(before,s,quest.reward,quest.id);
  if(quest.companion){assert.equal(s.companions[quest.companion].questStep,quest.step+1);assert.equal(s.companions[quest.companion].bond,false);}
  s=valid(s,quest.id+' save');deniedUnchanged(s,{type:'claimSidequest',id:quest.id},quest.id+' duplicate');
 });
}
test('personal followups require actual predecessor despite high affinity',()=>{
 for(const id of Object.keys(C.companions)){
  let s=fixture('magic',5,10);for(const c of Object.values(s.companions))c.affinity=100;
  const q=C.sidequests.find(q=>q.id===id+'_1');s=meet(s,q.requirements);
  deniedUnchanged(s,{type:'claimSidequest',id:q.id},q.id+' missing predecessor');
 }
});
test('all eighteen sidequests can complete together with no bond',()=>{
 let s=fixture('magic',5,10);
 for(const q of C.sidequests){s=meet(s,q.requirements);const r=E.act(s,{type:'claimSidequest',id:q.id},NOW);assert.equal(r.ok,true,q.id+': '+r.message);}
 assert.equal(s.story.sideCompleted.length,18);assert.equal(new Set(s.story.sideCompleted).size,18);
 assert.equal(s.blueprints.filter(x=>C.schools[x]).length,6);assert(Object.values(s.companions).every(x=>x.questStep===4&&!x.bond));
 valid(s,'complete sidequests');
});
const metrics={hunt:'winsTier',boss:'bossesTier',alchemy:'craftedTier',explore:'caveTier',study:'studyTier'};
test('six commissions consume current tier counters, preserve other tiers, and validate',()=>{
 for(let tier=0;tier<6;tier++){
  for(const id of ['hunt','alchemy','boss','explore','study','tower']){
   let s=fixture('magic',tier,7);s.sect.joined=true;s.sect.school='sword';
   const q=S.commissionView(s).find(x=>x.id===id);assert(q,id+' definition');
   if(id==='tower')s.progress.tower=tier*10+q.required;else s.stats[metrics[id]+tier]=q.required;
   if(tier>0&&id!=='tower')s.stats[metrics[id]+(tier-1)]=100;
   s=valid(s,id+' fixture '+tier);const before=clone(s),r=E.act(s,{type:'claimCommission',id},NOW);
   assert.equal(r.ok,true,id+' tier'+tier+': '+r.message);
   const def=S.commissionView(before).find(x=>x.id===id);rewardCheck(before,s,def.reward,id+' tier'+tier);
   assert.equal(s.sect.taskCounts[id+':'+tier],q.required);
   assert.equal(s.materials['crystal'+tier]-before.materials['crystal'+tier],q.rewards.crystal);
   if(tier>0&&id!=='tower')assert.equal(s.stats[metrics[id]+(tier-1)],100);
   s=valid(s,id+' saved '+tier);deniedUnchanged(s,{type:'claimCommission',id},id+' already consumed '+tier);
  }
 }
});
test('old tier activity cannot satisfy any of the six new tier commissions',()=>{
 for(const id of ['hunt','alchemy','boss','explore','study','tower']){
  const s=fixture('magic',2,1);s.sect.joined=true;s.sect.school='body';
  if(id==='tower')s.progress.tower=20;else{s.stats[metrics[id]+'0']=100;s.stats[metrics[id]+'1']=100;}
  deniedUnchanged(s,{type:'claimCommission',id},id+' old tier blocked');
 }
});
test('repeatable commission needs additional activity and keeps consumed tally across tiers',()=>{
 let s=fixture('magic',1,7);s.sect.joined=true;s.sect.school='thunder';s.stats.winsTier1=5;
 assert(E.act(s,{type:'claimCommission',id:'hunt'},NOW).ok);assert.equal(s.sect.taskCounts['hunt:1'],5);
 deniedUnchanged(s,{type:'claimCommission',id:'hunt'},'no additional wins');
 s.stats.winsTier1+=5;assert(E.act(s,{type:'claimCommission',id:'hunt'},NOW).ok);assert.equal(s.sect.taskCounts['hunt:1'],10);
 s.paths.magic={realm:2,layer:1,xp:0,reserve:0};s.stats.winsTier2=5;
 assert(E.act(s,{type:'claimCommission',id:'hunt'},NOW).ok);assert.equal(s.sect.taskCounts['hunt:2'],5);assert.equal(s.sect.taskCounts['hunt:1'],10);
 valid(s,'commission tier history');
});
test('all three endings have valid save roundtrips and reject repeat selection',()=>{
 for(const id of Object.keys(C.endings)){let s=fixture('magic',5,10);s.story.chapter=6;s.story.mercy=3;s.story.truth=3;s.story.completed=C.chapters.map(c=>c.id);
  const r=E.act(s,{type:'ending',choice:id},NOW);assert(r.ok,r.message);s=valid(s,id);
  assert.equal(s.story.ending.id,id);deniedUnchanged(s,{type:'ending',choice:id},id+' duplicate');
 }
});
test('source catalogs point to actual declared reward routes and retain first-level tutorial',()=>{
 assert.equal(C.dungeons.resource_herb.realm,0);assert.equal(C.dungeons.resource_herb.layer,1);
 assert.equal(C.limits.overflow,1000);
 for(const t of Object.values(C.techniques))if(t.source.type==='dungeon'){
  const d=C.dungeons[t.source.id];assert(d,t.id+' source');
  const books=(d.firstRewards.techniques||[]).concat(t.source.id==='tower'?C.towerFloors.flatMap(f=>f.firstRewards.techniques||[]):[]);
  assert(books.includes(t.id)||d.rewards.fragments?.[t.id],t.id+' deterministic source');
 }
 for(const t of Object.values(C.treasures))if(t.source.type==='dungeon')assert(C.dungeons[t.source.id].firstRewards.treasures?.includes(t.id),t.id+' treasure source');
 else if(t.source.type==='sidequest')assert(C.sidequests.find(q=>q.id===t.source.id).reward.treasures?.includes(t.id),t.id+' quest source');
});

test('actual pill crafting credits recipe tier and cannot satisfy a higher tier with cheap pills',()=>{
 let s=fixture('magic',1,7);s.sect.joined=true;s.sect.school='array';s.stones=100000;
 for(const id of Object.keys(s.materials))s.materials[id]=10000;
 let r=E.act(s,{type:'craftPill',id:'qi0',count:5,control:0},NOW);assert.equal(r.ok,true,r.message);
 assert((s.stats.craftedTier0||0)>=5);assert.equal(s.stats.craftedTier1||0,0);
 deniedUnchanged(s,{type:'claimCommission',id:'alchemy'},'low recipe is not current tier');
 r=E.act(s,{type:'craftPill',id:'qi1',count:5,control:0},NOW);assert.equal(r.ok,true,r.message);
 assert((s.stats.craftedTier1||0)>=5);r=E.act(s,{type:'claimCommission',id:'alchemy'},NOW);assert.equal(r.ok,true,r.message);
 assert.equal(s.sect.taskCounts['alchemy:1'],5);valid(s,'actual alchemy commission');
});
test('actual research credits training route tier and switching retains separate counters',()=>{
 let s=fixture('magic',2,1);s.paths.body={realm:1,layer:7,xp:0,reserve:0};s.route='body';s.sect.joined=true;s.sect.school='thunder';
 s.stones=100000;s.materials.insight=10000;
 for(let i=0;i<3;i++){const r=E.act(s,{type:'upgradeTechnique',id:'thunder_skill_0'},NOW);assert.equal(r.ok,true,r.message);}
 assert.equal(s.stats.studyTier1,3);assert.equal(s.stats.studyTier2||0,0);
 deniedUnchanged(s,{type:'claimCommission',id:'study'},'lower route research cannot pay higher tier');
 assert(E.act(s,{type:'switchRoute',route:'magic'},NOW).ok);
 for(let i=0;i<3;i++){const r=E.act(s,{type:'upgradeTechnique',id:'thunder_skill_0'},NOW);assert.equal(r.ok,true,r.message);}
 assert.equal(s.stats.studyTier2,3);assert.equal(s.stats.studyTier1,3);
 const r=E.act(s,{type:'claimCommission',id:'study'},NOW);assert.equal(r.ok,true,r.message);valid(s,'actual research commission');
});
