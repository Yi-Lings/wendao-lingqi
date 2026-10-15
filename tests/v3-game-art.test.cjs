'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const C=require('../web/data.js'),A=require('../web/game-art.js');
const file=art=>path.join(__dirname,'../web/assets',art.file);
test('all currencies, materials, facilities and cave room types have distinct real sprite cells',()=>{
 const ids=[...Object.keys(C.materials),'stones','tickets','dust','jade','contribution','universal','blueprint',...Object.keys(C.facilities),'battle','elite','herb-room','ore-room','healing','insight-room','boon','curse','merchant','escort','relic','exit'];
 const unique=new Set();for(const id of ids){const a=A.utility(id);assert(a,id);unique.add(a.file+':'+a.position);assert.equal(a.file,'v6-utilities-atlas.png');assert.equal(a.identity,'utility-'+id);}
 assert.equal(unique.size,36);assert.equal(A.utility('unknown'),null);
 assert.equal(A.room('herb:1').position,A.utility('herb-room').position);
 assert.equal(A.room('ore:2').position,A.utility('ore-room').position);
 assert.equal(A.room('insight:3').position,A.utility('insight-room').position);
});
test('every treasure and pill has its own named cell, including the formerly shared purple pills',()=>{
 const cells=new Set();
 for(const [id,t] of Object.entries(C.treasures)){const a=A.treasure(id);assert(a);assert.equal(a.file,'v6-treasures-atlas.png');assert.equal(a.name,t.name);assert.equal(a.rarity,t.rarity);assert(!cells.has(a.file+':'+a.position));cells.add(a.file+':'+a.position);}
 for(const [id,p] of Object.entries(C.recipes)){const a=A.pill(id);assert(a);assert.equal(a.file,'v6-pills-atlas.png');assert.equal(a.name,p.name);assert.equal(a.rarity,p.rarity);assert(!cells.has(a.file+':'+a.position));cells.add(a.file+':'+a.position);}
 assert.equal(cells.size,30);assert.notEqual(A.pill('qi2').position,A.pill('break2').position,'紫府丹 and 归藏丹 must never share an image');
 assert.equal(A.pill('missing'),null);assert.equal(A.treasure('__proto__'),null);
});
test('48 distinct technique identities use exact school and kind coordinates with name-based effects',()=>{
 const cells=new Set();for(const t of Object.values(C.techniques)){const a=A.technique(t);assert(a,t.id);assert.equal(a.file,'v6-techniques-atlas.png');assert.equal(a.name,t.name);assert.equal(a.rarity,t.rarity);cells.add(a.file+a.position);}
 assert.equal(cells.size,48);assert.equal(A.technique('unknown'),null);
 assert.equal(A.technique('elements_skill_0').palette,'wood');assert.equal(A.technique('elements_skill_1').palette,'fire');
 assert.equal(A.technique('elements_skill_2').palette,'water');assert.equal(A.technique('elements_skill_3').palette,'earth');
 assert.deepEqual(A.technique({...C.techniques.elements_skill_2,name:'红火术',rarity:5,school:'shadow'}),A.technique('elements_skill_2'),'stable catalog identity wins over stale display snapshots');
});
test('all four named item atlases are shipped as separate PNG assets',()=>{
 const hashes=new Set();
 for(const art of [A.utility('ore'),A.treasure('t0'),A.pill('qi0'),A.technique('sword_heart_0')]){
  const bytes=fs.readFileSync(file(art));assert.deepEqual([...bytes.subarray(0,8)],[137,80,78,71,13,10,26,10]);
  assert(bytes.readUInt32BE(16)>=1000&&bytes.readUInt32BE(20)>=400,'sufficient detail for the atlas cells');
  hashes.add(crypto.createHash('sha256').update(bytes).digest('hex'));
 }
 assert.equal(hashes.size,4);
});
test('art presentation leaves all catalog names, gameplay rules and input snapshots unchanged',()=>{
 const before=JSON.stringify(C),technique={...C.techniques.thunder_heart_1},snapshot=JSON.stringify(technique);
 for(const t of Object.values(C.techniques))A.technique(t);
 for(const id of Object.keys(C.treasures))A.treasure(id);
 for(const id of Object.keys(C.recipes))A.pill(id);
 for(const id of Object.keys(C.materials))A.utility(id);
 A.technique(technique);assert.equal(JSON.stringify(C),before);assert.equal(JSON.stringify(technique),snapshot);
});
