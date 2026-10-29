'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const R=require('../web/rewards.js');
function report(rewards){return {win:true,outcome:'win',name:'青岚灵圃',type:'resource',time:42,entry:'resource_herb',tier:0,difficulty:0,rewards};}

test('rare loot gets its own reveal beat, common loot does not',()=>{
  const rare=report({stones:800,materials:{crystal1:2}});
  const model=R.model(rare);
  assert.equal(model.rare,true,'a fourth-tier crystal is rare');
  const html=R.render(rare,{state:{rewardOverflow:[]}});
  assert.match(html,/settlement-rare-beat/,'rare cards opt into the extra beat');
  assert.equal((html.match(/settlement-rare-beat/g)||[]).length,1,'only the rare card is marked');

  const common=report({stones:800,materials:{herb:12,ore:6}});
  const plain=R.model(common);
  assert.equal(plain.rare,false);
  assert.doesNotMatch(R.render(common,{state:{rewardOverflow:[]}}),/settlement-rare-beat/,'common loot stays a plain list');
});

test('the reveal beat never changes the reward payload',()=>{
  const withRare=report({stones:800,materials:{crystal1:2}});
  const before=JSON.parse(JSON.stringify(withRare));
  R.render(withRare,{state:{rewardOverflow:[]}});
  assert.deepEqual(withRare,before,'presentation must not mutate the report');
});
