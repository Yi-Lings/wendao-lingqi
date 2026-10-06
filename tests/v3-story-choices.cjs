'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../web/engine.js');
const NOW=1791244800000;
function ready(){
 const s=E.createState(NOW);
 s.paths.magic.layer=5;s.progress.dungeonWins.resource_herb=1;
 return s;
}
function claim(s,choice){
 const r=E.act(s,{type:'claimChapter',choice},NOW);
 assert.equal(r.ok,true,r.message);assert.equal(E.validate(E.serialize(s)).ok,true);
 return r;
}
test('chapter choices give distinct companion reactions with equal core rewards',()=>{
 const a=ready(),b=ready();claim(a,'protect');claim(b,'seek');
 for(const key of ['stones','tickets','materials','pills','techniques','paths'])assert.deepEqual(a[key],b[key],key);
 assert.equal(a.companions.qinglan.affinity,3);assert.equal(a.companions.suyan.affinity,1);
 assert.equal(b.companions.qinglan.affinity,1);assert.equal(b.companions.suyan.affinity,3);
 assert(Object.values(a.companions).every(x=>!x.bond));
 assert.equal(E.view(a).storyDirection,'protect');assert.equal(E.view(b).storyDirection,'seek');
});
test('story-aware commissions preserve requirements rewards and claimed counters',()=>{
 const a=ready(),b=ready();claim(a,'protect');claim(b,'seek');
 for(const s of [a,b])assert(E.act(s,{type:'joinSect',school:'sword'},NOW).ok);
 const av=E.view(a).commissions,bv=E.view(b).commissions;
 for(let i=0;i<av.length;i++){
  assert.notEqual(av[i].name,bv[i].name);
  assert.equal(av[i].required,bv[i].required);
  assert.deepEqual(av[i].reward,bv[i].reward);
 }
 assert.deepEqual(a.sect.taskCounts,b.sect.taskCounts);
});
test('companion talk refers to saved story direction without locking endings or romance',()=>{
 const s=ready();claim(s,'seek');
 const expected=E.view(s).companionAttitudes.suyan.text;
 const r=E.act(s,{type:'talk',companion:'suyan'},NOW+60000);
 assert(r.ok,r.message);assert(r.message.includes(expected));
 assert.equal(s.companions.suyan.bond,false);
 const saved=E.validate(E.serialize(s)).state;
 assert.equal(E.view(saved).recommendedEnding,'wanderer');
 assert.equal(E.view(saved).companionAttitudes.suyan.text,expected);
});
test('chapter trust is capped and unavailable choice does not award twice',()=>{
 const s=ready();for(const r of Object.values(s.companions))r.affinity=99;
 const r=claim(s,'protect');assert(r.data.reactions.every(x=>x.affinity===1));
 assert(Object.values(s.companions).every(x=>x.affinity===100&&!x.bond));
 const before=JSON.stringify(s),again=E.act(s,{type:'claimChapter',choice:'protect'},NOW);
 assert.equal(again.ok,false);assert.equal(JSON.stringify(s),before);
});
