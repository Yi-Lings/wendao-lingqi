'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const E=require('../web/engine.js'),Q=require('../web/economy.js'),R=require('../web/activity-rewards.js');
const Collection=require('../web/art-collection.js');
const NOW=1791244800000,copy=x=>JSON.parse(JSON.stringify(x));
function stock(){const s=E.createState(NOW);s.training=false;s.paths.magic={realm:5,layer:10,xp:0,reserve:0};s.dust=1000;return s;}
for(const [id,kind,cost] of [['orangeGear','gear',120],['orangeTreasure','treasure',150]]){
 test('dust exchange '+id+' presents the committed item once and charges its real cost',()=>{
  const s=stock(),before=copy(s),action={type:'exchangeDust',item:id},result=E.act(s,action,NOW);
  assert.equal(result.ok,true,result.message);assert.equal(before.dust-s.dust,cost);
  const saved=copy(s),view=R.model(action,result,before,s);
  assert.equal(view.title,'天道尘兑换完成');assert.equal(view.items.length,1);
  const prize=view.items[0];assert.equal(prize.kind,kind);assert.equal(prize.rarity,4);assert.equal(prize.count,1);
  if(kind==='gear'){
   assert.equal(prize.id,result.data.gear.uid);assert.deepEqual(prize.gear,result.data.gear);
   assert(s.bag.some(g=>g.uid===prize.id));assert(!before.bag.some(g=>g.uid===prize.id));
  }else{assert.equal(prize.id,result.data.id);assert.equal(s.ownedTreasures[prize.id].count-(before.ownedTreasures[prize.id]?.count||0),1);}
  assert.deepEqual(view.costs,[{id:'dust',name:'天道尘',count:cost}]);
  for(let i=0;i<3;i++)assert(R.render(view,{state:s}).includes('data-reward-id="'+prize.id+'"'));
  assert.deepEqual(s,saved,'presenting the same result cannot charge, consume RNG or grant again');
 });
 test('unaffordable '+id+' grants nothing and does not advance RNG',()=>{
  const s=stock();s.dust=cost-1;const before=copy(s),action={type:'exchangeDust',item:id},result=E.act(s,action,NOW);
  assert.equal(result.ok,false);assert.deepEqual(s,before);assert.equal(R.model(action,result,before,s),null);
 });
}
test('all thirteen retained illustration archives are reachable one at a time without becoming item grants',()=>{
 assert.equal(Collection.records.length,13);assert.equal(new Set(Collection.records.map(x=>x.file)).size,13);
 const old=fs.readdirSync(path.join(__dirname,'../web/assets')).filter(f=>/^v5-gear-quality-[0-5]\.png$/.test(f));
 assert.equal(old.length,6);for(const file of old)assert(Collection.records.some(x=>x.file===file));
 const before=JSON.stringify(Collection.records);
 for(let i=0;i<13;i++){
  const record=Collection.view(i),html=Collection.render(i),bytes=fs.readFileSync(path.join(__dirname,'../web/assets',record.file));
  assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert(html.includes('assets/'+record.file));assert.equal((html.match(/art-collection-painting/g)||[]).length,1);
  assert(html.includes((i+1)+' / 13'));assert(!html.includes('data-action='),'archive has no reward-producing actions');
 }
 assert.equal(Collection.view(-1).index,0);assert.equal(Collection.view(100).index,12);
 assert.equal(JSON.stringify(Collection.records),before);
});
