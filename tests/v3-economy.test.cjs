'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const K=require('../web/core.js');
const E=require('../web/economy.js');
const C=require('../web/data.js');
const NOW=1700000000000;
const clone=x=>JSON.parse(JSON.stringify(x));
function unlocked(){const s=K.createState(NOW);s.paths[s.route].realm=1;s.paths[s.route].layer=1;s.tickets=1000;return s;}
function forced(fn){const old=K.rng;K.rng=(s,stream)=>stream==='gacha'?0.999999:0.49;try{return fn();}finally{K.rng=old;}}
function draw(s,count=1){const r=E.draw(s,count,NOW);assert.equal(r.ok,true,r.message);return r.data.results;}

test('joint probability table totals 100 and every nonzero cell has legal reward at unlock',()=>{
  const s=unlocked(),rows=E.gachaTable;
  assert.equal(rows.reduce((sum,row)=>sum+row.weights.reduce((a,b)=>a+b,0),0),100);
  assert.deepEqual(rows.map(r=>r.weights.reduce((a,b)=>a+b,0)),[30,15,20,20,15]);
  const rarities=Array.from({length:6},(_,i)=>rows.reduce((sum,row)=>sum+row.weights[i],0));
  assert.deepEqual(rarities,[25,30,22,15,7,1]);
  for(const cell of E.gachaPool(s)){
    assert.ok(cell.items.length>0,cell.category+' rarity '+cell.rarity+' cannot silently lose weight');
    if(cell.rarity>=4)assert.ok(['gear','treasure','technique'].includes(cell.category));
  }
});

test('ten draws are exactly ten singles including loot RNG, resources, UID and pity',()=>{
  const a=unlocked(),b=clone(a),one=[];
  const batch=draw(a,10);
  for(let i=0;i<10;i++)one.push(...draw(b,1));
  assert.deepEqual(batch,one);
  assert.deepEqual(a,b);
  assert.equal(a.tickets,990);
  assert.equal(a.dust,20);
  assert.equal(a.rngStreams.loot,unlocked().rngStreams.loot);
  assert.equal(a.rngStreams.world,unlocked().rngStreams.world);
});

test('orange guarantee and red guarantee share one award without losing red priority',()=>forced(()=>{
  const s=unlocked();s.gacha.highPity=9;s.gacha.redPity=79;
  const r=draw(s)[0];
  assert.equal(r.rarity,5);
  assert.equal(s.gacha.highPity,0);assert.equal(s.gacha.redPity,0);
  assert.equal(s.gacha.total,1);
  s.gacha.highPity=9;s.gacha.redPity=0;
  assert.equal(draw(s)[0].rarity,4);
  assert.equal(s.gacha.highPity,0);assert.equal(s.gacha.redPity,1);
}));

test('worst random sequence obtains designated red item within exactly 160 draws',()=>forced(()=>{
  const s=unlocked(),target='gear_sword_weapon';
  assert.equal(E.handle(s,{type:'setGachaTarget',target},NOW).ok,true);
  let first,second;
  for(let i=1;i<=160;i++){
    const r=draw(s)[0];
    if(i<80)assert.notEqual(r.rarity,5);
    if(i===80){first=r;assert.equal(r.rarity,5);assert.notEqual(r.itemId,target);assert.equal(s.gacha.fateGuarantee,true);}
    if(i===160)second=r;
  }
  assert.ok(first);assert.equal(second.rarity,5);assert.equal(second.itemId,target);
  assert.equal(s.gacha.fateGuarantee,false);
  assert.equal(s.gacha.total,160);assert.equal(s.tickets,840);
  const g=s.bag.find(x=>x.uid===second.uid)||s.rewardOverflow.find(x=>x.uid===second.uid);
  assert.ok(g);assert.equal(g.rarity,5);assert.equal(g.tier,1);assert.equal(g.slot,'weapon');
}));

test('changing targets and obtaining red outside gacha preserve accumulated fate',()=>forced(()=>{
  const s=unlocked();s.gacha.redPity=57;s.gacha.highPity=7;s.gacha.fateGuarantee=true;
  const before=clone(s.gacha);
  assert.equal(E.handle(s,{type:'setGachaTarget',target:'gear_thunder_armor'},NOW).ok,true);
  assert.equal(s.gacha.redPity,before.redPity);
  assert.equal(s.gacha.highPity,before.highPity);
  assert.equal(s.gacha.fateGuarantee,true);
  E.addGear(s,E.createGear(s,{slot:'armor',set:'thunder',rarity:5,tier:1}));
  assert.equal(s.gacha.redPity,57);assert.equal(s.gacha.fateGuarantee,true);
  s.gacha.redPity=79;
  assert.equal(draw(s)[0].itemId,'gear_thunder_armor');
}));

test('failed or malformed draw cannot spend tickets, change RNG or advance pity',()=>{
  for(const count of [0,2,9,11,-1,NaN]){
    const s=unlocked(),before=clone(s);assert.equal(E.draw(s,count,NOW).ok,false);assert.deepEqual(s,before);
  }
  const s=unlocked();s.tickets=9;const before=clone(s);
  assert.equal(E.draw(s,10,NOW).ok,false);assert.deepEqual(s,before);
  s.tickets=10;s.paths[s.route].realm=0;const locked=clone(s);
  assert.equal(E.draw(s,1,NOW).ok,false);assert.deepEqual(s,locked);
});

test('soft red probability matches disclosed cycle and hard cap',()=>{
  assert.equal(E.redChance(0),0.01);assert.equal(E.redChance(49),0.01);
  assert.ok(Math.abs(E.redChance(50)-0.015)<1e-12);
  assert.ok(Math.abs(E.redChance(78)-0.155)<1e-12);
  assert.equal(E.redChance(79),1);
  let survival=1,expected=0;
  for(let pity=0;pity<80;pity++){expected+=survival;survival*=1-E.redChance(pity);}
  assert.ok(Math.abs(expected-48.7571029651528)<0.00001,'expected red cycle '+expected);
  assert.equal(survival,0);
});

test('red reward goes to overflow when bag is full and cannot be lost on reload',()=>forced(()=>{
  const s=unlocked();
  while(s.bag.length<300)E.addGear(s,E.createGear(s,{rarity:0,slot:'head',set:'body',tier:1}));
  s.gacha.redPity=79;s.gacha.target='gear_sword_weapon';s.gacha.fateGuarantee=true;
  const award=draw(s)[0];
  assert.equal(s.bag.length,300);
  assert.ok(s.rewardOverflow.some(x=>x.uid===award.uid&&x.rarity===5));
  const restored=K.validate(JSON.stringify(s));
  assert.equal(restored.ok,true,restored.error);
  assert.ok(restored.state.rewardOverflow.some(x=>x.uid===award.uid));
}));

test('equipped, locked and preset red equipment cannot be bulk recycled',()=>{
  const s=unlocked(),g=E.createGear(s,{rarity:5,slot:'weapon',set:'sword',tier:1});
  E.addGear(s,g);s.equipped.weapon=g.uid;
  assert.equal(E.handle(s,{type:'recycleGear',uid:g.uid,confirm:true},NOW).ok,false);
  E.handle(s,{type:'bulkRecycle',maxRarity:5,confirm:true},NOW);
  assert.ok(s.bag.some(x=>x.uid===g.uid));
});
