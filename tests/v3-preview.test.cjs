'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const E=require('../web/engine.js'),P=require('../web/preview.js'),A=require('../web/equipment-art.js');
const NOW=1700000000000;

test('preview prepares a valid unlocked fixture with real equipment forging and live training',()=>{
  const s=P.createState(NOW),checked=E.validate(JSON.stringify(s)),v=E.view(s);
  assert.equal(checked.ok,true,checked.error);
  assert.equal(s.training,true);assert.equal(s.autoSmall,false);
  assert(v.unlocks.gacha&&v.unlocks.cave&&v.unlocks.tower,'the preview can immediately explore and draw');
  assert.equal(s.stats.forged,40);
  assert.equal(s.bag.length,42,'two starter items plus forty genuine forge results');
  assert.equal(s.nextUid,43,'equipment IDs are allocated by the engine');
  assert.deepEqual(Object.keys(s.equipped).map(slot=>s.bag.find(g=>g.uid===s.equipped[slot]).rarity),[0,1,2,3,4,5]);
  for(const [set,slot,name] of [['sword','weapon','铁剑'],['thunder','weapon','铁枪'],['sword','armor','粗布衣']]){
    const gear=s.bag.find(g=>g.set===set&&g.slot===slot&&g.rarity===0&&Number(g.uid.slice(1))>=3);
    assert(gear,'a forged sample of '+name);assert(A.gearLabel(gear).includes(name));
  }
  assert.equal(s.blueprints.length,6);assert.equal(Object.keys(s.ownedTreasures).length,12);
  assert(Object.keys(s.techniques).some(id=>E.catalog.techniques[id].rarity===0));
  assert(Object.keys(s.techniques).some(id=>E.catalog.techniques[id].rarity===5));
  assert(s.pills.heal0>0&&s.pills.shield1>0,'low and higher quality pills are ready');
  assert.deepEqual(s.loadouts.magic.skills,['sword_skill_3','thunder_skill_3','body_skill_1','array_skill_0']);
  assert.deepEqual(s.loadouts.magic.treasures,['t10','t1','t11']);
  assert.deepEqual(s.loadouts.magic.pills,['heal1','shield1','purify1']);
  for(const set of Object.keys(E.catalog.sets)){
    const view=E.modules.economy.equipmentSetView(s,set);
    assert.equal(view.recommendation.setCount,6,'preview can try every complete '+set+' set');
    assert.deepEqual(view.missingSlots,[],'no preview set slot is missing');
    for(const slot of Object.keys(E.catalog.slots))assert(s.bag.some(g=>g.set===set&&g.slot===slot),'real '+set+' '+slot+' exists');
  }
  const additional=s.bag.filter(g=>Number(g.uid.slice(1))>=22);
  assert.equal(additional.length,21,'only originally missing set slots are forged');
  assert(additional.every(g=>g.rarity===2&&g.tier===2),'new set samples use ordinary blue quality at the actual preview realm');
  assert.deepEqual(Object.keys(s.equipped).map(slot=>s.equipped[slot]),['g3','g4','g5','g6','g7','g8'],'filling the backpack does not replace the six worn quality samples');
});

test('the first actual ten-pull saves multiple red rewards while leaving all game rules active',()=>{
  const s=P.createState(NOW),tickets=s.tickets;
  assert.equal(s.gacha.history.length,0);assert.equal(s.gacha.redPity,79);
  const result=E.act(s,{type:'draw',count:10},NOW);
  assert.equal(result.ok,true,result.error||result.message);
  const red=result.data.results.filter(x=>x.rarity===5);
  assert(red.length>=2,'seed 45 must exercise individual red reveals');
  assert.equal(red[0].id,'gear_sword_weapon');
  assert.notEqual(red[0].id,red[1].id);
  for(const x of red.filter(x=>x.category==='gear'))assert(s.bag.some(g=>g.uid===x.uid&&g.rarity===5));
  assert.equal(s.tickets,tickets-10);assert.equal(s.gacha.total,10);
  assert.equal(s.gacha.history.length,10);assert.equal(E.validate(JSON.stringify(s)).ok,true);
});

test('browser preview creation never accesses storage and returns independent valid states',()=>{
  let storageAccesses=0;
  const context={IdleEngine:E,localStorage:new Proxy({}, {get(){storageAccesses++;throw Error('Production storage must not be accessed');}})};
  vm.runInNewContext(fs.readFileSync(require.resolve('../web/preview.js'),'utf8'),context);
  const a=context.WendaoPreview.createState(NOW),b=context.WendaoPreview.createState(NOW);
  assert.deepEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)));
  a.bag[0].locked=true;a.tickets--;
  assert.equal(b.bag[0].locked,false);assert.equal(b.tickets,200);
  assert.equal(storageAccesses,0);assert.equal(E.validate(b).ok,true);
});
