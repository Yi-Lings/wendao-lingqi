'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../web/engine.js'),S=require('../web/equipment-sources.js'),B=require('../web/builds.js');
const C=E.catalog,NOW=1700000000000,clone=x=>JSON.parse(JSON.stringify(x));
function rich(){const s=E.createState(NOW);s.paths.magic={realm:2,layer:8,xp:0,reserve:0};s.stones=1e7;for(const id of Object.keys(s.materials))s.materials[id]=5000;return s;}
test('all 216 acquisition previews preserve state and match actual forge costs and blueprint rules',()=>{
 const s=rich(),before=clone(s);
 for(const set of Object.keys(C.sets))for(const slot of Object.keys(C.slots))for(let rarity=0;rarity<6;rarity++){
  const v=S.view(s,{set,slot,rarity}),copy=clone(s),r=E.act(copy,{type:'forgeGear',set,slot,rarity},NOW);
  assert.deepEqual(v.forge.cost,E.costs(s,'forgeGear',{set,slot,rarity}));
  assert.equal(v.forge.allowed,r.ok,`${set}/${slot}/${rarity}`);
  assert.equal(v.forge.allowed,rarity!==5);assert.equal(v.gacha.target,`gear_${set}_${slot}`);assert.equal(v.gacha.allowed,true);
  if(r.ok){assert.equal(r.data.gear.set,set);assert.equal(r.data.gear.slot,slot);assert.equal(r.data.gear.rarity,rarity);}
 }
 assert.deepEqual(s,before);
 s.blueprints=Object.keys(C.sets);assert.equal(S.view(s,{set:'body',slot:'armor',rarity:5}).forge.allowed,true);
});
test('source lists every real matching boss including earlier array and shadow encounters',()=>{
 const s=rich();
 for(const set of Object.keys(C.sets)){
  const v=S.view(s,{set,slot:'weapon'}),actual=Object.values(C.dungeons).filter(d=>d.type==='boss'&&d.school===set);
  assert.deepEqual(v.bosses.map(b=>b.id).sort(),actual.map(d=>d.id).sort());
  v.bosses.forEach(b=>{const p=E.previewDungeon(s,{id:b.id,tier:b.realm,difficulty:0});assert.equal(b.allowed,p.allowed);assert.deepEqual(b.requirements,p.requirements);assert.equal(b.blueprint,true);});
 }
 assert.equal(S.view(s,{set:'array',slot:'head'}).bosses[0].id,'boss_3');
 assert.equal(S.view(s,{set:'shadow',slot:'head'}).bosses[0].id,'boss_5');
});
test('missing-piece status distinguishes usable inventory, future tier and reward overflow',()=>{
 const s=rich(),Q=E.modules.economy,make=tier=>Q.createGear(s,{set:'array',slot:'boots',tier,rarity:2});
 assert.equal(S.view(s,{set:'array',slot:'boots'}).status,'待获取');
 s.bag.push(make(3));assert.equal(S.view(s,{set:'array',slot:'boots'}).status,'已拥有，当前阶位不可用');
 s.rewardOverflow.push(make(2));assert.equal(S.view(s,{set:'array',slot:'boots'}).status,'奖励暂存中已有');
 s.bag.push(make(2));assert.equal(S.view(s,{set:'array',slot:'boots'}).status,'已拥有可用装备');
});
test('shortages expose precise resources and early players get honest locked routes',()=>{
 const s=E.createState(NOW),v=S.view(s,{set:'thunder',slot:'weapon',rarity:5});
 assert.equal(v.gacha.allowed,false);assert.match(v.gacha.requirements.join(' '),/筑基/);
 assert(v.bosses.every(b=>!b.allowed&&b.requirements.length));assert.equal(v.forge.allowed,false);
 assert.deepEqual(S.shortages({stones:2,materials:{ore:3}},{stones:10,materials:{ore:5}}),[{key:'stones',have:2,need:10,missing:8},{key:'materials',id:'ore',have:3,need:5,missing:2}]);
 const s2=rich();s2.stones=0;assert.equal(S.view(s2,{set:'sword',slot:'weapon',rarity:0}).forge.allowed,false);
});
test('regular set completion recommends forge without falsely requiring a red blueprint',()=>{
 const s=rich(),g=B.plan(s,'array').goals.find(x=>x.kind==='set');
 assert(g);assert.equal(g.source.type,'forge');assert.equal(g.available,true);assert(!g.requirements.some(x=>/蓝图/.test(x)));
 s.battle={};const busy=S.view(s,{set:'array',slot:'boots'});assert.equal(busy.forge.allowed,false);assert(busy.bosses.every(b=>!b.allowed&&b.requirements.some(x=>/结束/.test(x))));
});
