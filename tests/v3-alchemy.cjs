'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../web/engine.js'),K=require('../web/core.js'),Q=require('../web/economy.js'),C=require('../web/data.js');
const NOW=1700000000000,copy=x=>JSON.parse(JSON.stringify(x));
function stock(tier=0){const s=E.createState(NOW);s.stones=1000000;for(const k of Object.keys(s.materials))s.materials[k]=10000;s.paths.magic.realm=tier;s.paths.magic.layer=10;return s;}
function act(s,type,args={}){const r=E.act(s,Object.assign({type},args),NOW);assert.equal(r.ok,true,r.message);assert.equal(K.validate(s).ok,true);return r;}
function queue(s,id='heal0',count=10){return act(s,'queuePill',{id,count}).data.job.id;}
function current(s,id){return s.alchemy.jobs.find(j=>j.id===id);}
function control(s,id,score=3){act(s,'startAlchemyControl',{jobId:id});for(let i=0;i<3;i++){const j=current(s,id);const expected=j.rhythm[j.round],fire=i<score?expected:['low','medium','high'].find(f=>f!==expected);act(s,'stokeAlchemy',{jobId:id,fire});}}
function failsUnchanged(s,type,args={}){const before=copy(s),r=E.act(s,Object.assign({type},args),NOW);assert.equal(r.ok,false,r.message);assert.deepEqual(s,before);return r;}
function money(s){return {stones:s.stones,materials:copy(s.materials)};}

test('ordinary immediate crafting keeps compatibility and charges only the explicit base cost',()=>{
 const s=stock(),before=money(s),cost=Q.costs(s,'craftPill',{id:'heal0',count:3,control:2});
 const r=act(s,'craftPill',{id:'heal0',count:3,control:2});
 assert.deepEqual(cost,{stones:24,materials:{herb:9}});
 assert.equal(s.pills.heal0,5);assert.equal(s.stats.crafted,3);assert.equal(s.stats.craftedTier0,3);
 assert.equal(s.stones,before.stones-24);assert.equal(s.materials.herb,before.materials.herb-9);assert.equal(r.data.bonus,0);
});

test('queue prepays the exact recipe cost and grants nothing until a single explicit finish',()=>{
 const s=stock(),before=money(s),pill=s.pills.heal0,id=queue(s,'heal0',10);
 assert.equal(s.stones,before.stones-80);assert.equal(s.materials.herb,before.materials.herb-30);
 assert.equal(s.pills.heal0,pill);assert.equal(s.stats.crafted,0);
 assert.equal(current(s,id).status,'queued');assert.equal(current(s,id).routeTier,0);
 const r=act(s,'finishAlchemyJob',{jobId:id});
 assert.equal(r.data.count,10);assert.equal(s.pills.heal0,pill+10);assert.equal(s.stats.crafted,10);
 assert.equal(s.stats.craftedTier0,10);assert.equal(s.alchemy.jobs.length,0);
 failsUnchanged(s,'finishAlchemyJob',{jobId:id});failsUnchanged(s,'cancelAlchemyJob',{jobId:id});
 assert.equal(queue(s,'heal0',1),'a2','stable IDs must not be reused');
});

test('queue capacity follows furnace upgrades, and a rejected full queue does not spend or advance RNG',()=>{
 const s=stock();assert.equal(Q.alchemyCapacity(s),2);queue(s);queue(s);
 failsUnchanged(s,'queuePill',{id:'heal0',count:1});
 act(s,'upgradeFacility',{id:'furnace'});assert.equal(Q.alchemyCapacity(s),3);queue(s);
 failsUnchanged(s,'queuePill',{id:'heal0',count:1});
 s.facilities.furnace=10;assert.equal(Q.alchemyCapacity(s),7);
 for(let i=0;i<4;i++)queue(s);failsUnchanged(s,'queuePill',{id:'heal0',count:1});
});

test('control charges an explicit surcharge, allows one active furnace, and requires three real choices',()=>{
 const s=stock(),a=queue(s),b=queue(s),before=s.stones;
 assert.deepEqual(Q.costs(s,'startAlchemyControl',{jobId:a}),{stones:100});
 act(s,'startAlchemyControl',{jobId:a});assert.equal(s.stones,before-100);
 assert.equal(Q.alchemyView(s).activeJobId,a);
 failsUnchanged(s,'startAlchemyControl',{jobId:a});failsUnchanged(s,'startAlchemyControl',{jobId:b});
 failsUnchanged(s,'finishAlchemyJob',{jobId:a});failsUnchanged(s,'stokeAlchemy',{jobId:a,fire:'instant'});
 const view=Q.alchemyView(s).jobs.find(j=>j.id===a);assert.equal(view.expectedFire,current(s,a).rhythm[0]);assert.ok(view.hint.length>10);
 for(let i=0;i<3;i++)act(s,'stokeAlchemy',{jobId:a,fire:current(s,a).rhythm[i]});
 assert.equal(current(s,a).status,'ready');assert.equal(current(s,a).round,3);assert.equal(current(s,a).score,3);
 assert.equal(current(s,a).bonus,2);failsUnchanged(s,'stokeAlchemy',{jobId:a,fire:'low'});
 act(s,'startAlchemyControl',{jobId:b});const r=act(s,'finishAlchemyJob',{jobId:a});
 assert.equal(r.data.count,12);assert.equal(s.stats.crafted,12);assert.equal(s.stats.craftedTier0,12);
});

for(const [count,score,expected] of [[100,3,20],[100,2,10],[100,1,0],[100,0,0],[1,3,1],[1,2,1],[1,1,0]]){
 test('count '+count+' score '+score+' yields exactly '+expected+' bonus with base production guaranteed',()=>{
  const s=stock(),pill=s.pills.heal0,id=queue(s,'heal0',count);control(s,id,score);
  assert.equal(current(s,id).bonus,expected);const r=act(s,'finishAlchemyJob',{jobId:id});
  assert.equal(r.data.count,count+expected);assert.equal(s.pills.heal0,pill+count+expected);
  assert.equal(s.stats.crafted,count+expected);assert.equal(s.stats.craftedTier0,count+expected);
 });
}

for(const mode of ['queued','control','ready']){
 test('cancel '+mode+' plan returns base materials and every paid control stone without giving pills or stats',()=>{
  const s=stock(),before=money(s),pill=s.pills.heal0,id=queue(s,'heal0',10);
  if(mode==='control'){act(s,'startAlchemyControl',{jobId:id});act(s,'stokeAlchemy',{jobId:id,fire:current(s,id).rhythm[0]});}
  if(mode==='ready')control(s,id,3);
  act(s,'cancelAlchemyJob',{jobId:id});assert.deepEqual(money(s),before);
  assert.equal(s.pills.heal0,pill);assert.equal(s.stats.crafted,0);assert.equal(s.alchemy.jobs.length,0);
  failsUnchanged(s,'cancelAlchemyJob',{jobId:id});failsUnchanged(s,'finishAlchemyJob',{jobId:id});
 });
}

test('control round survives JSON export and refresh without repeating fee or payout',()=>{
 let s=stock(),id=queue(s,'heal0',50);act(s,'startAlchemyControl',{jobId:id});
 act(s,'stokeAlchemy',{jobId:id,fire:current(s,id).rhythm[0]});
 const paid=s.stones,restored=E.validate(E.serialize(s));assert.equal(restored.ok,true);s=restored.state;
 assert.equal(current(s,id).round,1);assert.equal(current(s,id).score,1);assert.equal(s.stones,paid);
 for(let i=1;i<3;i++)act(s,'stokeAlchemy',{jobId:id,fire:current(s,id).rhythm[i]});
 const ready=E.validate(E.serialize(s));assert.equal(ready.ok,true);s=ready.state;act(s,'finishAlchemyJob',{jobId:id});
 assert.equal(s.stats.crafted,60);const saved=E.serialize(s);s=E.validate(saved).state;
 failsUnchanged(s,'finishAlchemyJob',{jobId:id});assert.equal(s.stats.crafted,60);
});

test('one week of offline settlement keeps the same queue and control round, granting no automatic alchemy rewards',()=>{
 const s=stock(),id=queue(s);act(s,'startAlchemyControl',{jobId:id});
 act(s,'stokeAlchemy',{jobId:id,fire:current(s,id).rhythm[0]});
 const before=copy(s.alchemy),pills=copy(s.pills),crafted=s.stats.crafted;
 K.advance(s,NOW+8*86400000);assert.deepEqual(s.alchemy,before);assert.deepEqual(s.pills,pills);assert.equal(s.stats.crafted,crafted);
});

test('real battle blocks starting or continuing control while a queued plan stays safe',()=>{
 const s=stock(),id=queue(s);act(s,'startDungeon',{id:'resource_herb',tier:0,difficulty:0});
 failsUnchanged(s,'startAlchemyControl',{jobId:id});assert.ok(s.battle);assert.equal(current(s,id).status,'queued');
 let active=stock();const aid=queue(active);act(active,'startAlchemyControl',{jobId:aid});
 act(active,'startDungeon',{id:'resource_herb',tier:0,difficulty:0});
 failsUnchanged(active,'stokeAlchemy',{jobId:aid,fire:current(active,aid).rhythm[0]});
});

test('insufficient base or control funds, invalid count and unopened recipes leave state and RNG untouched',()=>{
 const s=stock();for(const count of [0,-1,101,1.5,'1'])failsUnchanged(s,'queuePill',{id:'heal0',count});
 failsUnchanged(s,'queuePill',{id:'heal2',count:1});failsUnchanged(s,'queuePill',{id:'missing',count:1});
 s.materials.herb=0;failsUnchanged(s,'queuePill',{id:'heal0',count:1});s.materials.herb=100;
 s.stones=8;const id=queue(s,'heal0',1);failsUnchanged(s,'startAlchemyControl',{jobId:id});
 assert.equal(current(s,id).status,'queued');act(s,'finishAlchemyJob',{jobId:id});assert.equal(s.stats.crafted,1);
});

test('old V3 backups missing the new queue receive an empty queue; malformed queue is rejected',()=>{
 const s=stock();delete s.alchemy;const v=K.validate(s);assert.equal(v.ok,true);assert.deepEqual(v.state.alchemy,{nextId:1,jobs:[]});
 for(const bad of [null,{}, {nextId:0,jobs:[]},{nextId:1,jobs:'x'},{nextId:1,jobs:[],hidden:1}]){
  const t=stock();t.alchemy=bad;assert.equal(K.validate(t).ok,false);
 }
});

test('corrupted queued cost, IDs, status, fire and control score cannot import or refund arbitrary resources',()=>{
 const s=stock(),id=queue(s),j=current(s,id);
 for(const mutate of [
  t=>t.alchemy.jobs[0].cost.stones++,
  t=>t.alchemy.jobs[0].cost.materials.herb++,
  t=>t.alchemy.jobs[0].cost.materials.ore=1,
  t=>t.alchemy.jobs[0].controlCost.stones=1000,
  t=>t.alchemy.jobs[0].id='a0',
  t=>t.alchemy.nextId=1,
  t=>t.alchemy.jobs.push(copy(j)),
  t=>t.alchemy.jobs[0].recipe='bad',
  t=>t.alchemy.jobs[0].status='finished',
  t=>t.alchemy.jobs[0].rhythm[0]='inferno',
  t=>t.alchemy.jobs[0].routeTier=-1,
  t=>t.alchemy.jobs[0].round=1,
  t=>t.alchemy.jobs[0].bonus=1
 ]){const t=copy(s);mutate(t);assert.equal(K.validate(t).ok,false);}
 control(s,id,3);const t=copy(s);t.alchemy.jobs[0].score=2;t.alchemy.jobs[0].bonus=1;assert.equal(K.validate(t).ok,false,'score must match the saved actual choices');
 const pair=stock(),a=queue(pair),b=queue(pair);act(pair,'startAlchemyControl',{jobId:a});
 const p=copy(pair),bj=p.alchemy.jobs.find(j=>j.id===b);bj.status='control';bj.controlCost={stones:100};assert.equal(K.validate(p).ok,false);
});

test('UTF8 byte limit and corrupt JSON validation also apply to saves containing queue state',()=>{
 const s=stock();queue(s);s.notes='汉'.repeat(350000);assert.equal(K.validate(s).ok,false);
 assert.equal(K.validate('{"version":3,"alchemy":').ok,false);
 const valid=E.serialize(stock());assert.equal(K.validate(valid).ok,true);
});

test('all 18 recipes queue and control with their own costs and count only the recipe tier for commissions',()=>{
 for(const [id,r] of Object.entries(C.recipes)){
  const s=stock(5);K.learnRecipe(s,id,{type:'research',source:'furnace',at:NOW});
  const before=money(s),pill=s.pills[id],job=queue(s,id,5),expected=Q.costs(s,'queuePill',{id,count:5});
  assert.equal(s.stones,before.stones-expected.stones);
  for(const [k,n] of Object.entries(expected.materials))assert.equal(s.materials[k],before.materials[k]-n);
  assert.equal(current(s,job).routeTier,5);control(s,job,3);act(s,'finishAlchemyJob',{jobId:job});
  assert.equal(s.pills[id],pill+6);assert.equal(s.stats.crafted,6);assert.equal(s.stats['craftedTier'+r.realm],6);
  for(let tier=0;tier<6;tier++)if(tier!==r.realm)assert.equal(s.stats['craftedTier'+tier]||0,0);
 }
});

test('full pill storage refuses completion without losing the paid job and allows full refund',()=>{
 const s=stock(),id=queue(s,'heal0',100),paid=money(s);s.pills.heal0=K.CAP;
 failsUnchanged(s,'finishAlchemyJob',{jobId:id});assert.deepEqual(money(s),paid);
 act(s,'cancelAlchemyJob',{jobId:id});assert.equal(s.alchemy.jobs.length,0);assert.equal(s.stats.crafted,0);
});


test('damaged runtime records cannot be laundered by claiming or cancelling them',()=>{
 const valid=stock(),id=queue(valid);
 for(const type of ['startAlchemyControl','finishAlchemyJob','cancelAlchemyJob']){
  const broken=copy(valid);broken.alchemy.jobs[0].cost.stones=999999;
  failsUnchanged(broken,type,{jobId:id});
  const direct=copy(broken),before=copy(direct),result=Q.handle(direct,{type,jobId:id},NOW);
  assert.equal(result.ok,false);assert.deepEqual(direct,before);
 }
});


test('late game first-clear histories above 300 remain valid and repeated clear IDs still reject',()=>{
 const s=stock(5),keys=[];
 for(const id of Object.keys(C.dungeons))for(let tier=0;tier<6;tier++)for(let diff=0;diff<3;diff++)keys.push(id+':'+tier+':'+diff);
 assert.ok(keys.length>300);assert.ok(keys.length<=1000);
 s.progress.firstClears=keys;assert.equal(K.validate(s).ok,true,'complete multi-tier history must fit the save contract');
 s.progress.firstClears.push(keys[0]);assert.equal(K.validate(s).ok,false,'raising capacity must not permit duplicate rewards');
});
