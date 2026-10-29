'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const K=require('../web/core.js'),B=require('../web/combat.js'),FX=require('../web/combat-fx.js');
const NOW=1700000000000,copy=x=>JSON.parse(JSON.stringify(x));
const KINDS=['hit','crit','dot','kill','heal','player'];
function state(layer=7,realm=0){const s=K.createState(NOW);s.paths[s.route].layer=layer;s.paths[s.route].realm=realm;return s;}
function action(s,type,fields={}){const r=B.handle(s,{type,...fields},NOW);assert.ok(r&&r.ok,type+': '+(r&&r.message));return r;}

test('floating text keeps every feedback kind distinguishable',()=>{
  const out=FX.translate([
    {t:1,kind:'hit',target:0,amount:1234,overkill:0,crit:false},
    {t:1.1,kind:'crit',target:1,amount:15678,overkill:0,crit:true},
    {t:1.2,kind:'kill',target:1,amount:20,overkill:900,crit:false},
    {t:1.3,kind:'heal',target:null,amount:320},
    {t:1.4,kind:'dot',target:0,amount:45},
    {t:1.5,kind:'player',target:null,amount:0,absorbed:88}
  ]);
  assert.deepEqual(out.entries.map(entry=>entry.tone),['normal','crit','kill','heal','dot','player']);
  assert.equal(out.entries[0].text,'-1234');
  assert.equal(out.entries[1].text,'-1.6万','large numbers compact so the float stays readable');
  assert.equal(out.entries[1].big,true);
  assert.equal(out.entries[2].text,'击破 · 溢伤 900','a kill reports the damage that went past zero');
  assert.equal(out.entries[3].text,'+320');
  assert.equal(out.entries[5].text,'护盾 -88','a fully absorbed hit is labelled as shield damage');
});

test('floating text never floods the stage',()=>{
  const events=Array.from({length:80},(_,n)=>({t:n*.1,kind:'hit',target:n%3,amount:10,overkill:0,crit:false}));
  const out=FX.translate(events);
  assert.equal(out.entries.length,FX.MAX_ENTRIES);
  assert.equal(FX.translate(null).entries.length,0);
  assert.equal(FX.translate([null,7,{kind:'unknown',amount:5}]).entries.length,1,'only objects with a known kind are rendered');
  assert.equal(FX.translate([{kind:'unknown',amount:5}]).entries[0].kind,'hit','unknown kinds fall back to a normal hit');
});

test('streak labels stay presentation only and reset below three hits',()=>{
  assert.equal(FX.streakLabel(0).tier,0);
  assert.equal(FX.streakLabel(2).tier,0);
  assert.equal(FX.streakLabel(3).tier,1);
  assert.equal(FX.streakLabel(6).tier,2);
  assert.equal(FX.streakLabel(12).tier,3);
  assert.equal(FX.streakLabel(Number.NaN).tier,0);
});

test('a real battle emits bounded, well-formed feedback and metrics',()=>{
  const s=state();action(s,'startDungeon',{id:'boss_0',difficulty:0});
  let sawHit=false,sawPlayer=false;
  for(let step=0;step<400&&s.battle;step++){
    B.advanceBattle(s,.1);
    if(!s.battle)break;
    const events=s.battle.feedback||[];
    assert.ok(events.length<=32,'feedback ring must stay bounded');
    for(const event of events){
      assert.ok(KINDS.includes(event.kind),'unexpected kind '+event.kind);
      if(event.target!==null)assert.ok(Number.isInteger(event.target)&&event.target>=0&&event.target<12);
      assert.ok(Number.isFinite(event.amount)&&event.amount>=0);
      assert.equal(typeof event.crit,'boolean');
      if(event.kind==='hit')sawHit=true;
      if(event.kind==='player')sawPlayer=true;
    }
  }
  assert.ok(sawHit,'a live battle must produce enemy hits');
  assert.ok(sawPlayer,'a live battle must produce incoming damage');
});

test('damage metrics accumulate from real hits and survive save validation',()=>{
  const s=state();action(s,'startDungeon',{id:'boss_0',difficulty:0});
  B.advanceBattle(s,30);
  assert.ok(s.battle,'the boss must survive long enough to accumulate damage');
  const p=s.battle.performance;
  for(const key of ['damageDealt','maxHit','crits','kills','damageTaken'])assert.ok(Number.isFinite(p[key]),key+' must be numeric');
  assert.ok(p.damageDealt>0,'dealt damage must be recorded');
  assert.ok(p.maxHit>0&&p.maxHit<=p.damageDealt,'the biggest single hit cannot exceed the total');
  assert.ok(p.crits>=0);
  const saved=K.validate(JSON.stringify(s));
  assert.equal(saved.ok,true,saved.error);
  assert.equal(saved.state.battle.performance.damageDealt,p.damageDealt);
  assert.deepEqual(saved.state.battle.performance,p,'metrics must round-trip unchanged');
});

test('the biggest hit only counts direct damage, never damage over time',()=>{
  const s=state();action(s,'startDungeon',{id:'boss_0',difficulty:0});
  B.advanceBattle(s,.1);
  const b=s.battle,enemy=b.enemies[0];
  enemy.hp=enemy.maxHp=1e9;
  const before=b.performance.maxHit;
  B.__test.damageEnemy(s,b,enemy,5000,{dot:true});
  assert.equal(b.performance.maxHit,before,'a damage-over-time tick must not claim the biggest hit');
  B.__test.damageEnemy(s,b,enemy,7000,{});
  assert.ok(b.performance.maxHit>=1400,'direct damage sets the biggest hit after armour');
});

test('a kill reports overflow and is counted once',()=>{
  const s=state();action(s,'startDungeon',{id:'boss_0',difficulty:0});
  B.advanceBattle(s,.1);
  const b=s.battle,enemy=b.enemies[0];
  enemy.hp=enemy.maxHp=100;
  B.__test.damageEnemy(s,b,enemy,5000,{});
  const kill=(b.feedback||[]).filter(event=>event.kind==='kill');
  assert.equal(kill.length,1);
  assert.ok(kill[0].overkill>0,'overflow past zero is reported');
  assert.ok(kill[0].amount>=kill[0].overkill,'the reported hit covers the overflow it caused');
  assert.equal(b.performance.kills,1);
  B.__test.damageEnemy(s,b,enemy,5000,{});
  assert.equal(b.performance.kills,1,'a corpse cannot be killed twice');
});

test('legacy battles without a feedback field still validate and keep working',()=>{
  const s=state();action(s,'startDungeon',{id:'boss_0',difficulty:0});
  B.advanceBattle(s,.5);
  const legacy=copy(s);delete legacy.battle.feedback;delete legacy.battle.performance.damageDealt;delete legacy.battle.performance.maxHit;
  const restored=K.validate(JSON.stringify(legacy));
  assert.equal(restored.ok,true,restored.error);
  assert.deepEqual(restored.state.battle.feedback,[]);
  B.advanceBattle(restored.state,.5);
  assert.ok(restored.state.battle.feedback.length>0,'feedback resumes after an old save is upgraded in memory');
});

test('malformed feedback cannot enter the save',()=>{
  const s=state();action(s,'startDungeon',{id:'boss_0',difficulty:0});
  B.advanceBattle(s,.5);
  const broken=copy(s);broken.battle.feedback=[{t:1,kind:'explode',target:0,amount:5,crit:false}];
  assert.equal(K.validate(JSON.stringify(broken)).ok,false,'unknown kinds are rejected');
  const badTarget=copy(s);badTarget.battle.feedback=[{t:1,kind:'hit',target:99,amount:5,crit:false}];
  assert.equal(K.validate(JSON.stringify(badTarget)).ok,false,'targets must address a real enemy slot');
  const tooMany=copy(s);tooMany.battle.feedback=Array.from({length:33},(_,n)=>({t:n,kind:'hit',target:0,amount:1,crit:false}));
  assert.equal(K.validate(JSON.stringify(tooMany)).ok,false,'the ring is capped');
});

test('feedback never changes rewards or rules',()=>{
  const a=state(),b=state();
  for(const s of [a,b]){action(s,'startDungeon',{id:'boss_0',difficulty:0});B.advanceBattle(s,2);s.battle.enemies.forEach(enemy=>{enemy.hp=0;});B.advanceBattle(s,.1);}
  const withFeedback=copy(a.lastBattleResult),without=copy(b.lastBattleResult);
  delete withFeedback.performance;delete without.performance;
  assert.deepEqual(withFeedback,without,'the presentation layer must not touch the reward payload');
});
