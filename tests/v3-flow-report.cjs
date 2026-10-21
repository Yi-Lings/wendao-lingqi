'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),E=require('../web/engine.js');
const NOW=1800000000000;
function tower(){const s=E.createState(NOW);s.paths.magic.layer=8;s.progress.tower=6;assert(E.act(s,{type:'startDungeon',id:'tower',floor:7,practice:true},NOW).ok);assert(E.act(s,{type:'leaveBattle'},NOW).ok);return s;}
test('a real tower exit records the exact floor and preserves it through export and reload',()=>{
 const s=tower();assert.equal(s.lastBattleResult.floor,7);assert.equal(s.battleReports.at(-1).floor,7);const imported=E.validate(E.serialize(s));assert(imported.ok,imported.error);assert.equal(imported.state.battleReports.at(-1).floor,7);
});
test('legacy tower history stays readable without inventing missing floor metadata',()=>{
 const s=tower();delete s.lastBattleResult.floor;delete s.battleReports[0].floor;const r=E.validate(E.serialize(s));assert(r.ok,r.error);assert.equal(r.state.battleReports[0].floor,undefined);
});
test('malformed new tower floors and floors attached to other encounter types are rejected',()=>{
 for(const floor of [0,61,1.5,'7',null]){const s=tower();s.battleReports[0].floor=floor;assert(!E.validate(JSON.stringify(s)).ok);}
 const s=tower();s.battleReports[0].entry='resource_herb';assert(!E.validate(JSON.stringify(s)).ok);
});
