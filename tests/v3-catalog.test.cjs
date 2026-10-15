'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../web/data.js'),K=require('../web/core.js'),E=require('../web/economy.js');
const values=x=>Array.isArray(x)?x:Object.values(x);
const byId=x=>Object.fromEntries(values(x).map(i=>[i.id,i]));
function sourceExists(source){
 assert.ok(source&&source.type&&source.id&&source.label);
 if(source.type==='dungeon')assert.ok(C.dungeons[source.id],'missing dungeon source '+source.id);
 if(source.type==='sidequest')assert.ok(byId(C.sidequests)[source.id],'missing quest source '+source.id);
 if(source.type==='chapter')assert.ok(byId(C.chapters)[source.id],'missing chapter source '+source.id);
}
test('release catalog has actual promised content with stable unique identities',()=>{
 assert.equal(Object.keys(C.routes).length,2);
 for(const r of values(C.routes))assert.equal(r.realmNames.length,6);
 assert.equal(C.realms.length,6);assert.equal(C.layerXp.length,10);
 const techniques=values(C.techniques);assert.equal(techniques.length,48);
 assert.equal(techniques.filter(t=>t.kind==='heart').length,12);
 assert.equal(techniques.filter(t=>t.kind==='skill').length,24);
 assert.equal(techniques.filter(t=>t.kind==='secret').length,12);
 assert.equal(new Set(techniques.map(t=>t.id)).size,48);
 assert.equal(new Set(techniques.map(t=>t.name)).size,48);
 for(const school of Object.keys(C.schools))assert.equal(techniques.filter(t=>t.school===school).length,8);
 assert.equal(values(C.treasures).length,12);assert.equal(values(C.recipes).length,18);
 assert.equal(values(C.facilities).length,5);assert.equal(values(C.sets).length,6);
 assert.equal(values(C.bosses).length,12);assert.equal(values(C.towerFloors).length,60);
 assert.equal(values(C.caveRooms).length,12);assert.equal(values(C.caves).length,3);
 assert.equal(values(C.chapters).length,6);assert.equal(values(C.sidequests).length,18);
 assert.equal(values(C.companions).length,3);assert.equal(values(C.regions).length,6);
 assert.equal(C.regions.reduce((n,r)=>n+r.mapKeys.length,0),12);
 assert.deepEqual([...new Set(values(C.dungeons).map(d=>d.type))].sort(),['arena','ascension','boss','cave','resource','sect','tower','trial']);
});
test('all techniques have meaningful numeric rules, explanatory source and legal upgrade metadata',()=>{
 for(const t of values(C.techniques)){
  assert.ok(t.name&&t.description.length>12&&t.effect&&t.rules&&typeof t.rules==='object',t.id);
  assert.ok(Number.isInteger(t.realm)&&t.realm>=0&&t.realm<=5,t.id);
  assert.ok(Number.isInteger(t.layer)&&t.layer>=1&&t.layer<=10,t.id);
  assert.equal(t.maxLevel,20);assert.ok(t.mp>=0&&t.cooldown>=0&&t.power>=0);
  sourceExists(t.source);
  if(t.kind==='skill')assert.ok(t.cooldown>0&&t.mp>0,t.id);
 }
});
test('boss mechanics have timings, damage and at least two alternative counters',()=>{
 for(const boss of C.bosses){
  assert.ok(boss.mechanics.length>=2,boss.id);
  for(const m of boss.mechanics){
   assert.ok(m.id&&m.trigger&&m.counter.length>=2,boss.id);
   for(const field of ['interval','castTime','damage'])assert.ok(Number.isFinite(m[field])&&m[field]>=0,boss.id+' '+field);
  }
 }
});
test('source graph resolves and no red equipment target is exclusive to gacha',()=>{
 assert.equal(values(C.gearTargets).length,36);
 for(const g of values(C.gearTargets)){
  assert.ok(C.slots[g.slot]&&C.sets[g.set],g.id);sourceExists(g.source);sourceExists(g.alternateSource);
  assert.equal(g.alternateSource.type,'sidequest');assert.equal(g.alternateSource.id,'world_forge');
 }
 for(const t of values(C.treasures))sourceExists(t.source);
 for(const r of values(C.recipes))sourceExists(r.source);
 for(const m of values(C.materials))sourceExists(m.source);
});
test('public probability and storage metadata match live economy',()=>{
 for(const row of E.gachaTable)assert.deepEqual(row.weights,C.gacha.jointWeights[row.category]);
 assert.equal(C.gacha.highGuarantee,10);assert.equal(C.gacha.redGuarantee,80);
 assert.equal(C.rarities.length,6);assert.equal(C.rarities[5].label,'红色');
 assert.equal(C.limits.bag,E.limits.bag);assert.equal(C.limits.overflow,E.limits.overflow);
 assert.equal(C.limits.saveBytes,1048576);
 const s=K.createState(1700000000000);assert.equal(K.validate(s).ok,true);
});
