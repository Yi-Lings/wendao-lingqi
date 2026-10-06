'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../web/engine.js'),C=E.catalog,K=E.modules.core;
const NOW=1700000000000,copy=x=>JSON.parse(JSON.stringify(x));
const act=(s,type,p={})=>{const r=E.act(s,{type,...p},NOW);assert(r.ok,r.message);assert(E.validate(E.serialize(s)).ok);return r;};
const denied=(s,type,p={})=>{const before=JSON.stringify(s),r=E.act(s,{type,...p},NOW);assert.equal(r.ok,false);assert.equal(JSON.stringify(s),before);};
function ready(){const s=E.createState(NOW);s.paths.magic={realm:1,layer:1,xp:0,reserve:0};return s;}
test('six simulated shop packages credit exactly their listed jade with no money or RNG change',()=>{
 assert.equal(C.shop.packages.length,6);const s=E.createState(NOW),rng=copy(s.rngStreams),stones=s.stones;
 let total=0;for(const p of C.shop.packages){const r=act(s,'buyJade',{packageId:p.id});total+=p.jade;assert.equal(r.data.jade,p.jade);assert.equal(s.jade,total);}
 assert.equal(s.shop.totalJade,total);assert.equal(s.shop.purchases,6);assert.equal(s.stones,stones);assert.deepEqual(s.rngStreams,rng);
 assert.equal(s.shop.history[5].sequence,6);assert.equal(s.shop.history[5].at,NOW);
});
test('exchange jade adds one or ten draw tickets and insufficient or invalid requests are atomic',()=>{
 const s=ready();act(s,'buyJade',{packageId:'p68'});const tickets=s.tickets;
 act(s,'exchangeJade',{count:10});assert.equal(s.jade,180);assert.equal(s.tickets,tickets+10);
 act(s,'exchangeJade',{count:1});assert.equal(s.jade,120);assert.equal(s.tickets,tickets+11);
 denied(s,'exchangeJade',{count:10});denied(s,'exchangeJade',{count:0});denied(s,'exchangeJade',{count:-1});denied(s,'exchangeJade',{count:100});
});
test('jade ten-pull shares exact prize stream pity and targets with ticket ten-pull',()=>{
 const a=ready();act(a,'buyJade',{packageId:'p648'});act(a,'setGachaTarget',{target:'gear_sword_weapon'});
 a.gacha.redPity=79;const b=copy(a),jade=a.jade,tickets=a.tickets;
 const x=act(a,'drawWithJade',{count:10}),y=act(b,'draw',{count:10});
 assert.deepEqual(x.data.results,y.data.results);assert.equal(a.jade,jade-600);assert.equal(a.tickets,tickets);
 for(const key of ['gacha','rngStreams','bag','ownedTreasures','techniques','materials','pills','dust'])assert.deepEqual(a[key],b[key],key);
});
test('jade ten-pull is ten jade single pulls and does not reset pity on purchase or conversion',()=>{
 const a=ready();act(a,'buyJade',{packageId:'p648'});a.gacha.redPity=70;a.gacha.highPity=9;
 const b=copy(a);act(a,'drawWithJade',{count:10});for(let i=0;i<10;i++)act(b,'drawWithJade',{count:1});
 a.revision=b.revision;assert.deepEqual(a,b);
 const prior=copy(a.gacha);act(a,'buyJade',{packageId:'p6'});act(a,'exchangeJade',{count:1});assert.deepEqual(a.gacha,prior);
});
test('locked pool, battle, full inventory and insufficient jade leave purchases and RNG unchanged',()=>{
 const initial=E.createState(NOW);act(initial,'buyJade',{packageId:'p648'});denied(initial,'drawWithJade',{count:10});
 const s=ready();denied(s,'drawWithJade',{count:1});act(s,'buyJade',{packageId:'p648'});
 act(s,'startDungeon',{id:'resource_herb',tier:1,difficulty:0});denied(s,'drawWithJade',{count:10});act(s,'leaveBattle');
 for(let i=s.bag.length+s.rewardOverflow.length;i<1300;i++)E.modules.economy.addGear(s,E.modules.economy.createGear(s,{rarity:0,tier:1}));
 denied(s,'drawWithJade',{count:10});denied(s,'drawWithJade',{count:3});denied(s,'buyJade',{packageId:'__proto__'});
});
test('old V3 gains zero jade while purchases survive export import and last fifty history is bounded',()=>{
 const s=ready();delete s.jade;delete s.shop;const v=E.validate(s);assert(v.ok,v.error);assert.equal(v.state.jade,0);assert.equal(v.state.shop.purchases,0);
 const saved=v.state;for(let i=0;i<60;i++)act(saved,'buyJade',{packageId:'p6'});
 assert.equal(saved.shop.history.length,50);assert.equal(saved.shop.history[0].sequence,11);assert.equal(saved.shop.history[49].sequence,60);
 const imported=E.validate(E.serialize(saved));assert(imported.ok);assert.equal(imported.state.jade,3600);assert.deepEqual(imported.state.shop,saved.shop);
});
test('malformed currency receipts and overflow credits are rejected without truncating balances',()=>{
 const s=ready();act(s,'buyJade',{packageId:'p6'});
 for(const change of [t=>t.jade=-1,t=>t.jade=1.5,t=>t.jade=61,t=>t.shop.history[0].amount=600,t=>t.shop.history[0].packageId='invalid',t=>t.shop.history[0].at=-1,t=>t.shop.history.push(copy(t.shop.history[0]))]){
  const t=copy(s);change(t);assert.equal(E.validate(t).ok,false);
 }
 s.jade=s.shop.totalJade=K.CAP;denied(s,'buyJade',{packageId:'p648'});
});
