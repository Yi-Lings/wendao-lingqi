'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const K=require('../web/core.js'),Q=require('../web/economy.js'),B=require('../web/combat.js'),E=require('../web/engine.js'),C=require('../web/data.js');
const NOW=1700000000000,slots=Object.keys(C.slots),clone=x=>JSON.parse(JSON.stringify(x));
function add(s,slot,set,options={}){const g=Q.createGear(s,{slot,set,rarity:0,tier:s.paths[s.route].realm,...options});Q.addGear(s,g);return g;}
function wearing(school,count){
  const s=K.createState(NOW),other=Object.keys(C.sets).filter(id=>id!==school);s.bag=[];s.loadouts[s.route].heart=null;
  slots.forEach((slot,i)=>{const g=add(s,slot,i<count?school:other[i-count]);s.equipped[slot]=g.uid;});return s;
}
function close(actual,expected){assert.ok(Math.abs(actual-expected)<1e-9,`${actual} ≠ ${expected}`);}
function money(s){return clone({stones:s.stones,jade:s.jade,dust:s.dust,tickets:s.tickets,materials:s.materials,pills:s.pills,paths:s.paths,bag:s.bag,rngStreams:s.rngStreams,nextUid:s.nextUid,loadouts:s.loadouts});}

test('six real sets activate exact two/four-piece attributes once at their thresholds',()=>{
  for(const school of Object.keys(C.sets)){
    const one=wearing(school,1),two=wearing(school,2),three=wearing(school,3),four=wearing(school,4);
    const a=K.attributes(one),b=K.attributes(two),c=K.attributes(three),d=K.attributes(four),definition=C.sets[school];
    const bStats={...b},cStats={...c};delete bStats.sets;delete cStats.sets;
    assert.deepEqual(bStats,cStats,school+' three pieces must not reapply two-piece effect');
    assert.deepEqual(Q.equipmentSetView(one,school).effects.map(x=>x.active),[false,false]);
    assert.deepEqual(Q.equipmentSetView(two,school).effects.map(x=>x.active),[true,false]);
    assert.deepEqual(Q.equipmentSetView(four,school).effects.map(x=>x.active),[true,true]);
    for(const [key,value] of Object.entries(definition.twoStats)){
      const field=key==='hp'?'maxHp':key;
      close(b[field],['attack','defense','hp'].includes(key)?Math.floor(a[field]*(1+value)):a[field]+value);
    }
    for(const [key,value] of Object.entries(definition.fourStats)){
      const field=key==='hp'?'maxHp':key;
      close(d[field],['attack','defense','hp'].includes(key)?Math.floor(c[field]*(1+value)):c[field]+value);
    }
    assert.equal(d.sets[school],4);
    const prior=clone(four);Q.equipmentSetView(four);assert.deepEqual(four,prior,'view must never change inventory, RNG or state');
  }
});

test('玄武 four-piece effect truly increases 镇骨甲 shield and cooperates with 不动金身诀',()=>{
  const s=wearing('body',4);s.paths[s.route].layer=7;
  for(const id of ['body_heart_0','body_skill_2'])s.techniques[id]={level:1,branch:0,spent:0,resetUsed:false};
  s.loadouts[s.route].heart='body_heart_0';s.loadouts[s.route].skills=['body_skill_1','body_skill_2'];
  assert.equal(B.handle(s,{type:'startDungeon',id:'boss_0',difficulty:0,practice:true},NOW).ok,true);
  const b=s.battle;b.auto=false;b.attackTimer=999;
  assert.equal(b.player.shieldPower,.15);
  assert.equal(B.handle(s,{type:'useSkill',id:'body_skill_1'},NOW).ok,true);
  close(b.player.shield,b.player.maxHp*.3*1.15);
  const enemy=b.enemies[0];enemy.attack=b.player.shield+b.player.defense*.5+5;enemy.attackTimer=0;enemy.mechanicTimer=999;enemy.casting=null;b.player.dodge=0;
  const shield=b.player.shield;
  B.advanceBattle(s,.1);
  assert.ok(b.player.shield<shield,'enemy must actually hit the shield');
  assert.ok(b.player.resource>0,'shield absorption must grant heart resource');
  assert.ok(b.player.statuses.some(x=>x.id==='guard'&&x.amount===.12),'four-piece broken-shield guard must occur');
  assert.equal(B.handle(s,{type:'useSkill',id:'body_skill_2'},NOW).ok,true);
  assert.equal(b.player.resource,0,'回山震 must consume accrued 震劲');
});

test('雷霄 four pieces and 天罚 consume actual 雷印 and produce the extra strike',()=>{
  const s=wearing('thunder',4);s.paths[s.route].realm=1;
  for(const id of ['thunder_heart_1','thunder_skill_3'])s.techniques[id]={level:1,branch:0,spent:0,resetUsed:false};
  s.loadouts[s.route].heart='thunder_heart_1';s.loadouts[s.route].skills=['thunder_skill_0','thunder_skill_3'];
  assert.equal(B.handle(s,{type:'startDungeon',id:'resource_herb',tier:1,difficulty:0,practice:true},NOW).ok,true);
  const b=s.battle;b.auto=false;b.player.crit=0;b.player.penetration=0;b.enemies[0].defense=0;
  assert.equal(B.handle(s,{type:'useSkill',id:'thunder_skill_0'},NOW).ok,true);
  assert.equal(b.enemies[0].statuses.find(x=>x.id==='mark').stacks,1);
  const hp=b.enemies[0].hp,attack=b.player.attack;
  assert.equal(B.handle(s,{type:'useSkill',id:'thunder_skill_3'},NOW).ok,true);
  close(hp-b.enemies[0].hp,attack*(1.9+.22+.4));
  assert.equal(b.temporary.thunderSetGate,5);
  assert.ok(!b.enemies[0].statuses.some(x=>x.id==='mark'));
});

test('legacy red gear without special retains its set effect in attributes, battle and save',()=>{
  const s=wearing('thunder',4);s.paths[s.route].realm=1;
  const red=s.bag.find(g=>g.slot==='weapon');red.rarity=5;red.special=null;
  for(const id of ['thunder_heart_1','thunder_skill_2','thunder_skill_3'])s.techniques[id]={level:1,branch:0,spent:0,resetUsed:false};
  s.loadouts[s.route].heart='thunder_heart_1';s.loadouts[s.route].skills=['thunder_skill_0','thunder_skill_2','thunder_skill_3'];
  assert.deepEqual(K.attributes(s).redEffects,['thunder']);assert.equal(Q.equipmentSetView(s,'thunder').redActive,true);
  const restored=K.validate(E.serialize(s));assert.equal(restored.ok,true,restored.error);assert.equal(restored.state.bag.find(g=>g.uid===red.uid).special,null);assert.deepEqual(K.attributes(restored.state).redEffects,['thunder']);
  assert.equal(B.handle(s,{type:'startDungeon',id:'resource_herb',tier:1,difficulty:0,practice:true},NOW).ok,true);
  const b=s.battle;b.auto=false;b.attackTimer=999;b.enemies.forEach(e=>{e.attackTimer=999;e.mechanicTimer=999;});
  assert.equal(b.red.thunder,true);
  for(const id of ['thunder_skill_0','thunder_skill_2','thunder_skill_3'])assert.equal(B.handle(s,{type:'useSkill',id},NOW).ok,true);
  assert.ok(b.player.statuses.some(x=>x.id==='thunderRefund'),'actual three-mark detonation must grant red refund');
  B.advanceBattle(s,8.1);const mp=b.player.mp;
  assert.equal(B.handle(s,{type:'useSkill',id:'thunder_skill_0'},NOW).ok,true);
  close(mp-b.player.mp,C.techniques.thunder_skill_0.mp*.7);assert.ok(!b.player.statuses.some(x=>x.id==='thunderRefund'));
});

test('equipSet equips only owned eligible slots, retains missing slots and charges nothing',()=>{
  const s=K.createState(NOW),weapon=add(s,'weapon','sword',{rarity:1}),head=add(s,'head','sword',{rarity:2});
  add(s,'weapon','sword',{rarity:5,tier:3});
  const prior=money(s),armor=s.equipped.armor,preview=Q.equipmentSetView(s,'sword');
  assert.equal(preview.ownedCount,3);assert.deepEqual(preview.ownedSlots,['weapon','head']);assert.deepEqual(preview.availableSlots,['weapon','head']);
  assert.equal(preview.recommendation.setCount,2);assert.equal(preview.recommendation.replaceCount,2);
  assert.ok(preview.missingSlots.includes('armor'));
  const r=E.act(s,{type:'equipSet',set:'sword'},NOW);
  assert.equal(r.ok,true,r.message);assert.equal(r.data.equippedCount,2);assert.equal(s.equipped.weapon,weapon.uid);assert.equal(s.equipped.head,head.uid);assert.equal(s.equipped.armor,armor);
  assert.deepEqual(money(s),prior);assert.deepEqual(E.costs(s,'equipSet',{set:'sword'}),{});
  const restored=K.validate(E.serialize(s));assert.equal(restored.ok,true,restored.error);assert.deepEqual(restored.state.equipped,s.equipped);
  assert.equal(s.version,3);assert.equal(s.contentVersion,3);
  assert.equal(E.act(s,{type:'equipSet',set:'sword'},NOW).data.changed,0);
});

test('set selection prefers actual current-tier power including affixes and retains worn ties',()=>{
  const s=K.createState(NOW),rare=add(s,'weapon','sword',{rarity:5}),strong=add(s,'weapon','sword',{rarity:2});
  strong.affixes=[{id:'attack',value:60}];rare.affixes=[];
  assert.equal(Q.equipmentSetView(s,'sword').recommendation.equipped.weapon,strong.uid,'must not pick rarity alone');
  s.equipped.weapon=strong.uid;
  const tie=add(s,'weapon','sword',{rarity:2});tie.affixes=clone(strong.affixes);
  assert.equal(Q.equipmentSetView(s,'sword').recommendation.equipped.weapon,strong.uid,'equal strength must retain worn item');
  const future=add(s,'head','sword',{tier:4,rarity:5});s.equipped.head=future.uid;
  assert.equal(Q.equipmentSetView(s,'sword').recommendation.equipped.head,future.uid,'existing scaled high-tier equipment can remain');
});

test('invalid, unowned, overflow-only and future-only sets fail without mutation',()=>{
  for(const value of ['missing','__proto__',null,{},1]){
    const s=K.createState(NOW),prior=clone(s);assert.equal(E.act(s,{type:'equipSet',set:value},NOW).ok,false);assert.deepEqual(s,prior);
  }
  const s=K.createState(NOW);add(s,'weapon','sword',{tier:1});const overflow=Q.createGear(s,{slot:'head',set:'sword',tier:0});s.rewardOverflow.push(overflow);
  const prior=clone(s);assert.equal(Q.equipmentSetView(s,'sword').recommendation.canEquip,false);assert.equal(E.act(s,{type:'equipSet',set:'sword'},NOW).ok,false);assert.deepEqual(s,prior);
});

test('set and full recommended build share battle lock, including paused battles',()=>{
  const s=K.createState(NOW);s.paths[s.route].layer=7;add(s,'head','sword');
  assert.equal(B.handle(s,{type:'startDungeon',id:'boss_0',difficulty:0},NOW).ok,true);
  s.battle.paused=true;const prior=clone(s);let called=false;
  assert.equal(Q.equipmentSetView(s,'sword').recommendation.canEquip,false);
  assert.equal(E.act(s,{type:'equipSet',set:'sword'},NOW).ok,false);
  assert.equal(Q.handle(s,{type:'equipRecommendedBuild',school:'auto'},NOW,{plan(){called=true;}}).ok,false);
  assert.equal(called,false);assert.deepEqual(s,prior);
});

test('recommended build applies equipment and techniques together with no costs or unrelated changes',()=>{
  const s=K.createState(NOW),g=add(s,'head','thunder');
  const plan={school:'thunder',equipped:{...s.equipped,head:g.uid},loadout:{...clone(s.loadouts[s.route]),skills:['thunder_skill_0','body_skill_1']}};
  const prior=money(s),other=clone(s.loadouts.body),presets=clone(s.presets);
  const result=Q.handle(s,{type:'equipRecommendedBuild',school:'auto'},NOW,{plan(actual,school){assert.equal(actual,s);assert.equal(school,undefined);return plan;}});
  assert.equal(result.ok,true,result.message);assert.equal(result.data.changed,true);assert.equal(s.equipped.head,g.uid);assert.deepEqual(s.loadouts.magic.skills,plan.loadout.skills);
  const after=money(s);after.loadouts=prior.loadouts;assert.deepEqual(after,prior);assert.deepEqual(s.loadouts.body,other);assert.deepEqual(s.presets,presets);
  assert.equal(K.validate(s).ok,true);assert.deepEqual(E.costs(s,'equipRecommendedBuild',{school:'auto'}),{});
});

test('malformed or no-longer-usable recommended builds are rejected before any equipment changes',()=>{
  const base=K.createState(NOW),g=add(base,'head','thunder'),future=add(base,'boots','thunder',{tier:4});
  const valid={school:'thunder',equipped:{...base.equipped,head:g.uid},loadout:clone(base.loadouts.magic)};
  const cases=[null,{...valid,school:'constructor'},{...valid,equipped:{weapon:'g999'}},
    {...valid,equipped:{...valid.equipped,armor:null}}, {...valid,equipped:{...valid.equipped,boots:future.uid}},
    {...valid,loadout:{...valid.loadout,skills:['sword_skill_0']}},
    {...valid,loadout:{...valid.loadout,skills:['thunder_skill_0','array_skill_0','body_skill_1']}},
    {...valid,loadout:{...valid.loadout,pills:[]}}];
  for(const plan of cases){const s=clone(base),prior=clone(s),result=Q.handle(s,{type:'equipRecommendedBuild',school:'auto'},NOW,{plan(){return plan;}});assert.equal(result.ok,false,JSON.stringify(plan));assert.deepEqual(s,prior);}
});

test('legacy numeric gear UIDs remain supported by full build application',()=>{
  const s=K.createState(NOW),g=add(s,'head','thunder');g.uid=91;s.nextUid=92;
  const plan={school:'thunder',equipped:{...s.equipped,head:g.uid},loadout:clone(s.loadouts.magic)};
  assert.equal(Q.handle(s,{type:'equipRecommendedBuild'},NOW,{plan(){return plan;}}).ok,true);assert.equal(s.equipped.head,91);assert.equal(K.validate(s).ok,true);
});

test('real build planner and engine commit one complete persisted configuration without spending',()=>{
  const R=require('../web/builds.js'),P=require('../web/preview.js');
  for(const [s,school] of [[K.createState(NOW),'auto'],[P.createState(NOW),'auto'],[P.createState(NOW),'body'],[P.createState(NOW),'thunder']]){
    const plan=R.plan(s,school==='auto'?undefined:school),prior=money(s),revision=s.revision;
    const result=E.act(s,{type:'equipRecommendedBuild',school},NOW);
    assert.equal(result.ok,true,result.message);assert.equal(s.revision,revision+1);
    assert.deepEqual(s.equipped,plan.equipped);assert.deepEqual(s.loadouts[s.route],plan.loadout);
    const after=money(s);after.loadouts=prior.loadouts;assert.deepEqual(after,prior,'recommendation must not spend, acquire or reroll anything');
    const restored=K.validate(E.serialize(s));assert.equal(restored.ok,true,restored.error);assert.deepEqual(restored.state.equipped,s.equipped);assert.deepEqual(restored.state.loadouts,s.loadouts);
  }
});
test('equivalent six-slot ordering does not report a duplicate recommendation as changed',()=>{
  const state=E.createState(NOW),before=JSON.parse(JSON.stringify(state.equipped));
  const equipped=Object.fromEntries(Object.keys(state.equipped).reverse().map(slot=>[slot,state.equipped[slot]]));
  const planner={plan:()=>({school:'thunder',equipped,loadout:JSON.parse(JSON.stringify(state.loadouts[state.route]))})};
  const result=E.modules.economy.handle(state,{type:'equipRecommendedBuild',school:'thunder'},NOW,planner);
  assert.equal(result.ok,true,result.message);
  assert.equal(result.data.changed,false);
  assert.deepEqual(state.equipped,before);
});
