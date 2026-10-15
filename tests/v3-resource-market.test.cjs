'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../web/engine.js'),K=require('../web/core.js'),Q=require('../web/economy.js');
const NOW=1700000000000;
const clone=x=>JSON.parse(JSON.stringify(x));
function ready(){const s=E.createState(NOW);s.dust=10000;const r=E.act(s,{type:'buyJade',packageId:'p648'},NOW);assert(r.ok,r.message);return s;}
function buy(s,item,currency,count=1){const r=E.act(s,{type:'buyResource',item,currency,count},NOW);assert.equal(r.ok,true,r.error||r.message);return r;}
function denied(s,action){const before=clone(s),r=E.act(s,Object.assign({type:'buyResource'},action),NOW);assert.equal(r.ok,false);assert.deepEqual(s,before,'failed purchase must preserve the complete save');}

test('the published resource market has seven fixed dual-currency products and no permanent blueprints or tier crystals',()=>{
  assert.deepEqual(Q.resourceMarket.map(x=>x.id),['herb','ore','lotus','insight','essence','soul','stones']);
  const expected=[['herb',50,40,20],['ore',50,40,20],['lotus',3,40,15],['insight',10,40,20],['essence',10,60,30],['soul',3,80,40],['stones',5000,60,30]];
  for(const [id,quantity,jade,dust] of expected){
    const product=Q.resourceMarket.find(x=>x.id===id);
    assert.deepEqual(product.price,{jade,dust});
    assert.deepEqual(product.reward,id==='stones'?{stones:quantity}:{materials:{[id]:quantity}});
  }
  for(const id of ['lotus','insight']){
    const prior=Q.exchangeList.find(x=>x.id===id),current=Q.resourceMarket.find(x=>x.id===id);
    assert.deepEqual(current.reward,prior.reward);assert.equal(current.price.dust,prior.cost.dust);
  }
});

test('both currencies and batch counts deduct the quoted cost and deliver the full published resource quantity',()=>{
  for(const product of Q.resourceMarket)for(const currency of ['jade','dust'])for(const count of [1,3,99]){
    const s=ready(),before=clone(s),action={item:product.id,currency,count},quote=E.costs(s,'buyResource',action),r=buy(s,product.id,currency,count);
    assert.deepEqual(quote,{[currency]:product.price[currency]*count});assert.deepEqual(r.data.cost,quote);
    assert.equal(s[currency],before[currency]-quote[currency]);
    assert.equal(s[currency==='jade'?'dust':'jade'],before[currency==='jade'?'dust':'jade']);
    if(product.id==='stones')assert.equal(s.stones,before.stones+product.reward.stones*count);
    else assert.equal(s.materials[product.id],before.materials[product.id]+product.reward.materials[product.id]*count);
    assert.equal(s.revision,before.revision+1);assert.deepEqual(s.gacha,before.gacha);assert.deepEqual(s.rngStreams,before.rngStreams);
    assert.equal(E.validate(s).ok,true);
  }
});

test('unknown products, unsupported currency, malformed counts and insufficient balances fail atomically',()=>{
  const s=ready(),valid={item:'herb',currency:'jade',count:1};
  for(const item of ['unknown','__proto__','blueprint','crystal0','crystal5',null]){
    const action=Object.assign({},valid,{item});denied(s,action);assert.equal(E.costs(s,'buyResource',action),null);
  }
  for(const currency of ['stones','tickets','Jade','__proto__',null,undefined]){
    const action=Object.assign({},valid,{currency});denied(s,action);assert.equal(E.costs(s,'buyResource',action),null);
  }
  for(const count of [0,-1,100,1.5,'1',NaN,Infinity,null,undefined]){
    const action=Object.assign({},valid,{count});denied(s,action);assert.equal(E.costs(s,'buyResource',action),null);
  }
  const poor=E.createState(NOW);poor.dust=19;
  denied(poor,{item:'herb',currency:'jade',count:1});denied(poor,{item:'herb',currency:'dust',count:1});
  const direct=clone(poor),before=clone(direct);
  assert.equal(Q.handle(direct,{type:'buyResource',item:'herb',currency:'dust',count:1},NOW).ok,false);
  assert.deepEqual(direct,before,'direct economy failures also never deduct currency');
});

test('resource limits reject excess rewards before charging and allow purchases that exactly fill storage',()=>{
  const s=ready();s.materials.herb=K.CAP-49;
  denied(s,{item:'herb',currency:'jade',count:1});
  s.materials.herb=K.CAP-50;buy(s,'herb','jade');assert.equal(s.materials.herb,K.CAP);
  s.stones=K.CAP-4999;denied(s,{item:'stones',currency:'dust',count:1});
  s.stones=K.CAP-5000;buy(s,'stones','dust');assert.equal(s.stones,K.CAP);
});

test('market resources survive save round trips and can be used by actual crafting actions immediately',()=>{
  const s=ready();buy(s,'herb','jade',2);buy(s,'lotus','dust',2);buy(s,'stones','dust',1);
  const before=clone(s),crafted=E.act(s,{type:'craftPill',id:'qi0',count:2},NOW);
  assert.equal(crafted.ok,true,crafted.message);assert.equal(s.pills.qi0,before.pills.qi0+2);
  assert.equal(s.materials.herb,before.materials.herb-8);assert.equal(s.materials.lotus,before.materials.lotus-2);
  const restored=E.validate(E.serialize(s));assert.equal(restored.ok,true,restored.error);assert.deepEqual(restored.state,s);
  assert.equal(restored.state.jade,8920);assert.equal(restored.state.dust,9940);
});
