'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../web/engine.js'),K=require('../web/core.js'),Guidance=require('../web/battle-guidance.js');
const {stockRitualFixture,toTrial}=require('./ritual-fixtures.cjs');
const NOW=1800000000000,copy=x=>JSON.parse(JSON.stringify(x));
function state(){return E.createState(NOW);}
function report(overrides={}){return {entry:'resource_herb',route:'magic',tier:0,difficulty:0,type:'resource',win:false,practice:false,outcome:'defeat',performance:{handled:2,missed:3},failures:['守阵蓄力未打断且护盾不足'],...overrides};}
test('battle guidance exposes at most two recorded failures and keeps advice distinct from evidence',()=>{
 const s=state(),r=report({failures:['未净化雷印且护盾不足，雷劫引爆3层印记','未净化雷印且护盾不足，雷劫引爆3层印记','反射期间仍使用直接攻击，受到镜壳反伤','未打断复制且上一神通为攻击，受到复制伤害']});
 const v=Guidance.model(s,r);assert.equal(v.evidence.length,2);assert.equal(v.handled,2);assert.equal(v.missed,3);assert.match(v.evidence[0].advice,/净化雷印/);assert.match(v.evidence[1].advice,/持续伤害/);
 const html=Guidance.render(s,r);assert.match(html,/本场记录/);assert.match(html,/下次可尝试/);assert(!html.includes('data-action='));assert(!html.includes('details'));
});
test('a historic report can be read repeatedly without changing save, RNG, rewards or report bytes',()=>{
 const s=state();assert(E.act(s,{type:'startDungeon',id:'resource_herb'},NOW).ok);assert(E.act(s,{type:'leaveBattle'},NOW).ok);
 const r=s.battleReports[0],before=E.serialize(s),savedReport=JSON.stringify(r);
 for(let i=0;i<4;i++){const v=Guidance.model(s,r);assert.equal(v.retry.id,'resource_herb');assert.equal(v.outcome,'exit');Guidance.render(s,r);}
 assert.equal(E.serialize(s),before);assert.equal(JSON.stringify(r),savedReport);
});
test('practice and intentional exits are labelled accurately instead of inventing a defeat cause',()=>{
 const s=state(),v=Guidance.model(s,report({practice:true,outcome:'exit',failures:[]}));
 assert.equal(v.outcome,'exit');assert.match(v.generalAdvice,/主动退出不代表战败/);assert.match(v.practiceNote,/不消耗战斗丹药/);assert.match(v.practiceNote,/不发奖励/);assert.equal(v.retry.practice,true);
 assert.equal(v.practiceTarget.practice,true);assert.equal(Guidance.model(s,report({win:true,outcome:'win',failures:[],performance:{handled:0,missed:0}})).outcome,'win');
});
test('missing or unrecognised evidence stays explicitly general and HTML is escaped',()=>{
 const s=state(),v=Guidance.model(s,report({failures:[],performance:{}}));assert.equal(v.handled,null);assert.equal(v.missed,null);assert.match(v.generalAdvice,/没有记录具体机制失误/);
 const r=report({failures:['<img src=x onerror=alert(1)>']});assert.equal(Guidance.model(s,r).evidence[0].advice,null);assert(!Guidance.render(s,r).includes('<img'));assert(Guidance.render(s,r).includes('&lt;img'));
 assert.equal(Guidance.model(s,null),null);assert.equal(Guidance.render(s,null),'');
});
test('retry preserves exact unlocked resource tier and difficulty, and is still legal through the engine',()=>{
 const s=state();s.paths.magic={realm:1,layer:4,xp:0,reserve:0};s.progress.firstClears.push('resource_herb:1:0');
 const v=Guidance.model(s,report({tier:1,difficulty:1}));assert.deepEqual(v.retry,{id:'resource_herb',tier:1,difficulty:1,floor:null,practice:false});assert(E.act(s,{type:'startDungeon',...v.retry},NOW).ok);assert.equal(s.battle.tier,1);assert.equal(s.battle.difficulty,1);
});
test('other routes, busy states and unfinished rituals do not offer an unsafe retry',()=>{
 for(const patch of [{route:'body'},{battle:{}},{exploration:{}},{joint:{}},{ritual:{phase:'breath',route:'magic',realm:0}}]){
  const s=Object.assign(state(),patch),before=JSON.stringify(s),v=Guidance.model(s,report());assert.equal(v.retry,null);assert.equal(v.practiceTarget,null);assert(v.blockedReason);assert.equal(JSON.stringify(s),before);
 }
});
test('locked rank, difficulty, previous arena round and invalid report parameters suppress replay targets',()=>{
 const cases=[report({entry:'boss_0',type:'boss'}),report({difficulty:1}),report({entry:'arena_1',type:'arena'}),report({tier:9}),report({difficulty:4}),report({entry:'__proto__'})];
 for(const r of cases){const v=Guidance.model(state(),r);assert.equal(v.retry,null,JSON.stringify(r));assert.equal(v.practiceTarget,null);}
});
test('cave and ascension reports use their original progression instead of fabricating ordinary retries',()=>{
 for(const type of ['cave','ascension']){const d=Object.values(E.catalog.dungeons).find(x=>x.type===type),v=Guidance.model(state(),report({entry:d.id,type,tier:d.realm}));assert.equal(v.retry,null);assert.equal(v.practiceTarget,null);assert.match(v.blockedReason,/原有天路或洞天/);}
});
test('tower replay requires a recorded exact floor and never infers one from current progress',()=>{
 const s=state();s.paths.magic.layer=7;s.progress.tower=3;const r=report({entry:'tower',type:'tower',floor:2}),v=Guidance.model(s,r);assert.equal(v.retry.floor,2);
 for(const floor of [undefined,0,61,2.5,11]){assert.equal(Guidance.model(s,{...r,floor}).retry,null);}
 assert(E.act(s,{type:'startDungeon',...v.retry},NOW).ok);assert.equal(s.battle.floor,2);
});
test('formal trial retry requires current realm and ritual readiness while free practice can remain available',()=>{
 const s=state();s.paths.magic.layer=10;s.paths.magic.xp=K.xpNeeded(s);
 const r=report({entry:'trial',type:'trial'}),v=Guidance.model(s,r);assert.equal(v.retry,null);assert(v.practiceTarget);assert(E.act(copy(s),{type:'startDungeon',...v.practiceTarget},NOW).ok);
 const ready=copy(s);stockRitualFixture(ready);toTrial(ready,NOW);const prepared=Guidance.model(ready,r);assert(prepared.retry);assert(E.act(ready,{type:'startDungeon',...prepared.retry},NOW).ok);
 s.paths.magic.realm=1;assert.equal(Guidance.model(s,r).retry,null);assert.equal(Guidance.model(s,r).practiceTarget,null);
});
