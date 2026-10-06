'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const A=require('../web/equipment-art.js');
const C=require('../web/data.js');
const K=require('../web/core.js');
const Q=require('../web/economy.js');
const SETS=['sword','body','thunder','elements','shadow','array'];
const WEARABLES=['armor','head','bracer','boots','charm'];
const LEGACY_RED_WEAPONS={sword:0,thunder:2,elements:5,shadow:4};

test('weapon artwork selects all 36 rarity and weapon-family identities including suitable legacy red art',()=>{
  const cells=new Set();
  for(const [row,set] of SETS.entries())for(let rarity=0;rarity<6;rarity++){
    const art=A.gearArt({slot:'weapon',set,rarity});
    const legacy=rarity===5&&Object.hasOwn(LEGACY_RED_WEAPONS,set);
    assert.deepEqual(art,{file:legacy?'v3-items-atlas.png':'v4-weapons-atlas.png',position:legacy?LEGACY_RED_WEAPONS[set]*20+'% 0%':rarity*20+'% '+row*20+'%',size:'600% 600%',rarity,slot:'weapon',set});
    cells.add(art.file+':'+art.position);
  }
  assert.equal(cells.size,36);
});

test('wearables use their own slot and rarity artwork rather than the weapon image',()=>{
  const cells=new Set();
  for(const [row,slot] of WEARABLES.entries())for(let rarity=0;rarity<6;rarity++)for(const set of SETS){
    const art=A.gearArt({slot,set,rarity});
    const legacy=rarity===5&&slot==='armor'&&set==='body';
    assert.equal(art.file,legacy?'v3-items-atlas.png':'v4-armor-atlas.png');
    const visualRow=slot==='armor'&&set!=='body'?5:row;
    assert.equal(art.position,legacy?'20% 0%':rarity*20+'% '+visualRow*20+'%');
    assert.equal(art.size,'600% 600%');
    assert.equal(art.slot,slot);assert.equal(art.set,set);assert.equal(art.rarity,rarity);
    cells.add(art.file+':'+art.position);
  }
  assert.equal(cells.size,36,'robes and body armor have separate silhouettes at every quality');
});

test('robe names use the robe row while body armor uses the armor row and matching material names',()=>{
  for(const set of SETS)for(let rarity=0;rarity<6;rarity++){
    const art=A.gearArt({set,slot:'armor',rarity});
    assert.equal(art.position,set==='body'?(rarity===5?'20% 0%':rarity*20+'% 0%'):rarity*20+'% 100%');
    const name=A.rewardLabel({category:'gear',id:'gear_'+set+'_armor',rarity});
    assert.match(name,set==='body'?/甲$/u:/衣$/u);
  }
  assert.equal(A.rewardLabel({category:'gear',id:'gear_body_armor',rarity:0}),'粗布铁甲');
  assert.equal(A.rewardLabel({category:'gear',id:'gear_body_armor',rarity:1}),'精制皮甲');
  assert.equal(A.rewardLabel({category:'gear',id:'gear_sword_armor',rarity:1}),'青布衣');
});

test('legacy ornamental assets are reserved for their matching red equipment shapes',()=>{
  const actual=[];
  for(const set of SETS)for(const slot of ['weapon',...WEARABLES])for(let rarity=0;rarity<6;rarity++){
    const art=A.gearArt({set,slot,rarity});
    if(art.file==='v3-items-atlas.png')actual.push({set,slot,rarity,position:art.position});
    else if(rarity<5)assert.equal(art.position.split(' ')[0],rarity*20+'%','low qualities sample their own column');
  }
  assert.deepEqual(actual,[
    {set:'sword',slot:'weapon',rarity:5,position:'0% 0%'},
    {set:'body',slot:'armor',rarity:5,position:'20% 0%'},
    {set:'thunder',slot:'weapon',rarity:5,position:'40% 0%'},
    {set:'elements',slot:'weapon',rarity:5,position:'100% 0%'},
    {set:'shadow',slot:'weapon',rarity:5,position:'80% 0%'}
  ]);
  assert.equal(A.gearArt({set:'body',slot:'weapon',rarity:5}).file,'v4-weapons-atlas.png','a hammer cannot use the dragon-armor art');
  assert.equal(A.gearArt({set:'array',slot:'weapon',rarity:5}).file,'v4-weapons-atlas.png','a ruler cannot use the decorative fan art');
});

test('common equipment has plain names and red equipment matches the existing target identity',()=>{
  const weapons=['铁剑','铁锤','铁枪','素扇','铁刀','铁尺'];
  const wearables=['粗布衣','布帽','铁护腕','旧布靴','绳结石佩'];
  for(const [i,set] of SETS.entries()){
    assert.equal(A.gearLabel({slot:'weapon',set,rarity:0,tier:0}),'凡品·'+weapons[i]+' 1阶');
    const names=new Set();
    for(let rarity=0;rarity<6;rarity++)names.add(A.rewardLabel({category:'gear',id:'gear_'+set+'_weapon',rarity}));
    assert.equal(names.size,6,'each rarity has a distinct weapon name for '+set);
    for(const [j,slot] of WEARABLES.entries())assert.equal(A.rewardLabel({category:'gear',id:'gear_'+set+'_'+slot,rarity:0}),set==='body'&&slot==='armor'?'粗布铁甲':wearables[j]);
    for(const slot of ['weapon',...WEARABLES]){
      const id='gear_'+set+'_'+slot;
      assert.equal(A.rewardLabel({category:'gear',id,rarity:5}),C.gearTargets[id].name);
      assert.equal(A.gearLabel({set,slot,rarity:5,tier:5,awakening:3}),'道品·'+C.gearTargets[id].name+' 6阶 觉醒3');
    }
  }
});

test('new rewards and old saved history use their stable identity rather than stale name snapshots',()=>{
  assert.equal(A.rewardLabel({category:'gear',id:'gear_sword_weapon',rarity:0,name:'道品·金光神剑 6阶'}),'铁剑');
  assert.equal(A.rewardLabel({category:'equipment',id:'gear_body_armor',rarity:5,name:'凡品·玄武·衣甲 1阶'}),'玄武甲');
  assert.equal(A.rewardLabel({category:'gear',itemId:'gear_thunder_weapon',rarity:5,name:'旧名称'}),'雷霄杖');
  assert.equal(A.rewardLabel({category:'gear',id:'gear_shadow_boots',rarity:5,name:'太虚武器'}),'夜行履');
  assert.equal(A.rewardLabel({category:'material',id:'ore',name:'灵矿×8'}),'灵矿×8','quantity-bearing non-gear names remain intact');
  assert.equal(A.rewardLabel({category:'treasure',id:'t0'}),C.treasures.t0.name);
});

test('missing or invalid presentation arguments fall back without invalid atlas coordinates or labels',()=>{
  for(const value of [undefined,null,[],{}, {rarity:-1,slot:'nope',set:'__proto__'}, {rarity:NaN,tier:Infinity,awakening:999}, {rarity:'bad',tier:'bad'}]){
    assert.deepEqual(A.gearArt(value),{file:'v4-weapons-atlas.png',position:'0% 0%',size:'600% 600%',rarity:0,slot:'weapon',set:'sword'});
    const label=A.gearLabel(value);
    assert.equal(label,'凡品·铁剑');
    assert(!/undefined|NaN|Infinity/.test(label));
  }
  assert.equal(A.gearLabel({set:'sword',slot:'weapon',rarity:'2',tier:'1'}),'玄品·灵纹剑 2阶');
  assert.equal(A.rewardLabel({category:'gear',id:'gear_bad_weapon',rarity:5,name:'不可信名称'}),'装备');
  assert.equal(A.rewardLabel(null),'机缘');
  assert.equal(A.rewardLabel({category:'gear',id:'gear_sword_weapon',rarity:null}),'铁剑');
});

test('rendering all qualities and slots leaves a valid save and every random stream unchanged',()=>{
  const s=K.createState(1700000000000);
  for(const set of SETS)for(const slot of ['weapon',...WEARABLES])for(let rarity=0;rarity<6;rarity++)Q.addGear(s,Q.createGear(s,{set,slot,rarity,tier:0}));
  assert.equal(K.validate(s).ok,true);
  const before=JSON.stringify(s),rewards=s.bag.map(g=>({category:'gear',id:'gear_'+g.set+'_'+g.slot,uid:g.uid,rarity:g.rarity,name:'旧品级名字'})),rewardBefore=JSON.stringify(rewards);
  for(const g of s.bag){A.gearArt(g);A.gearLabel(g);}
  for(const x of rewards)A.rewardLabel(x);
  assert.equal(JSON.stringify(s),before,'labels must never migrate or mutate equipment, UID, pity, or RNG');
  assert.equal(JSON.stringify(rewards),rewardBefore,'saved reward snapshots remain untouched');
  assert.equal(K.validate(JSON.stringify(s)).ok,true);
});
