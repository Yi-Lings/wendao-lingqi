'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../web/data.js'),A=require('../web/game-art.js');
test('all currencies, materials, facilities and cave room types have distinct real sprite cells',()=>{
 const ids=[...Object.keys(C.materials),'stones','tickets','dust','jade','contribution','universal','blueprint',...Object.keys(C.facilities),'battle','elite','herb-room','ore-room','healing','insight-room','boon','curse','merchant','escort','relic','exit'];
 const unique=new Set();for(const id of ids){const a=A.utility(id);assert(a,id);unique.add(a.position);assert.equal(a.file,'v4-utilities-atlas.png');}
 assert.equal(unique.size,36);assert.equal(A.utility('unknown'),null);
 assert.equal(A.room('herb:1').position,A.utility('herb-room').position);
});
test('every treasure and pill has artwork; low qualities never borrow ornate old assets',()=>{
 for(const [id,t] of Object.entries(C.treasures)){assert(A.treasure(id));assert.equal(A.treasure(id).file,t.rarity>=3?'v3-items-atlas.png':'v4-treasures-atlas.png');}
 for(const [id,p] of Object.entries(C.recipes)){assert(A.pill(id));if(p.rarity<=2)assert.equal(A.pill(id).file,'v4-pills-atlas.png');}
 assert.equal(A.pill('shield2').file,'v3-items-atlas.png');assert.equal(A.pill('missing'),null);
});
test('48 distinct technique identities use low-quality art or their preserved high-quality image',()=>{
 const cells=new Set();for(const t of Object.values(C.techniques)){const a=A.technique(t);assert(a,t.id);assert.equal(a.file,t.rarity<=2?'v4-basic-skills-atlas.png':'v3-skills-atlas.png');cells.add(a.file+a.position);}
 assert.equal(cells.size,48);assert.equal(A.technique('unknown'),null);
});
