'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const K=require('../web/core.js'),C=require('../web/data.js');
const NOW=1700000000000,DAY=86400000,copy=x=>JSON.parse(JSON.stringify(x));
function oldV2(){return {
 version:2,player:{name:'旧道友',age:26},route:'body',
 paths:{body:{realm:2,xp:490},magic:{realm:1,xp:300}},stones:4321,
 materials:{herb:31,ore:29,lotus:9},pills:{heal:5,qi:4,breakthrough:2},
 bag:[{uid:'g1',slot:'weapon',rarity:2,tier:6,level:4},{uid:'g2',slot:'armor',rarity:3,tier:5,level:3},{uid:'g3',slot:'charm',rarity:1,tier:4,level:2},{uid:'g4',slot:'weapon',rarity:0,tier:1,level:0}],
 equipped:{weapon:'g1',armor:'g2',charm:'g3'},nextUid:5,
 facilities:{field:3,mine:2,array:4},techniques:{sword:6,breath:4,thunder:5,guard:3},
 activeSkills:['sword','breath'],stage:12,bestStage:14,auto:false,training:true,battle:null,totalTicks:20,productionTicks:20,
 stats:{kills:30,bosses:4,crafted:8,breakthroughs:3,gifts:6,joints:2,gearDrops:30,failed:1},
 sect:{joined:true,contribution:123,rank:2,daily:{day:Math.floor(NOW/DAY),kills:4,bosses:0,crafted:2,joints:0,claimed:[]}},
 companions:Object.fromEntries(['qinglan','yueheng','suyan'].map(id=>[id,{affinity:72,bond:true,cooldownUntil:0,lastTalkAt:0}])),
 story:{chapter:2,mercy:1,truth:1,ending:null},joint:null,lastAt:NOW,carryMs:0,seed:42,logs:[]
};}
function oldPower(v,route){
 const p=v.paths[route],body=route==='body';
 let attack=(body?18:22)+p.realm*(body?15:19)+v.techniques[body?'sword':'thunder']*(body?2:3);
 let defense=(body?8:5)+p.realm*(body?6:4)+v.techniques.guard*2;
 let maxHp=(body?140:110)+p.realm*(body?75:60)+v.techniques.breath*5;
 for(const slot of ['weapon','armor','charm']){
  const g=v.bag.find(g=>g.uid===v.equipped[slot]);if(!g)continue;
  const m=[1,1.45,2.15,3.2][g.rarity]*(1+g.level*.12);
  attack+=Math.floor((slot==='weapon'?7+g.tier*3:slot==='charm'?2+g.tier*2:0)*m);
  defense+=Math.floor((slot==='armor'?2+g.tier:slot==='charm'?1+g.tier:0)*m);
  maxHp+=Math.floor((slot==='armor'?14+g.tier*11:slot==='charm'?8+g.tier*7:0)*m);
 }
 defense+=6;attack+=v.sect.rank*2;defense+=v.sect.rank;maxHp+=v.sect.rank*10;
 return {attack,defense,maxHp};
}

test('realm labels show numeric layers and small advance preserves overflow exactly',()=>{
 const s=K.createState(NOW);assert.equal(K.view(s).realmLabel,'炼气一层·初期');
 K.addXp(s,500);assert.equal(s.paths.magic.xp,100);assert.equal(s.paths.magic.reserve,400);
 assert.equal(K.levelUp(s).ok,true);assert.equal(s.paths.magic.layer,2);
 assert.equal(s.paths.magic.xp,160);assert.equal(s.paths.magic.reserve,240);
 assert.equal(K.view(s).realmLabel,'炼气二层·初期');
 assert.equal(K.levelUp(s).ok,true);assert.equal(s.paths.magic.layer,3);
 assert.equal(s.paths.magic.xp,240);assert.equal(s.paths.magic.reserve,0);
 assert.equal(s.paths.magic.realm,0);
});

test('auto small advancement stops at ten, keeps surplus and cannot bypass trial',()=>{
 const s=K.createState(NOW);s.autoSmall=true;s.paths.magic.layer=3;
 K.addXp(s,50000);
 assert.equal(s.paths.magic.layer,10);assert.equal(s.paths.magic.realm,0);
 assert.equal(s.paths.magic.xp,2200);assert.ok(s.paths.magic.reserve>0);
 const before=copy(s.paths.magic);assert.equal(K.levelUp(s).ok,false);assert.deepEqual(s.paths.magic,before);
 assert.equal(K.view(s).realmLabel,'炼气十层·圆满');
});

test('body and magic progress and loadout remain independent',()=>{
 const s=K.createState(NOW),body=copy(s.paths.body),bodyLoad=copy(s.loadouts.body);
 K.addXp(s,500,'magic');K.levelUp(s,'magic');
 assert.deepEqual(s.paths.body,body);assert.deepEqual(s.loadouts.body,bodyLoad);
 const magic=copy(s.paths.magic);K.addXp(s,150,'body');K.levelUp(s,'body');
 assert.deepEqual(s.paths.magic,magic);assert.equal(s.paths.body.layer,2);
 assert.equal(K.unlocks(s,'body').resources,false);
 s.paths.magic.layer=7;assert.equal(K.unlocks(s,'magic').tower,true);assert.equal(K.unlocks(s,'body').tower,false);
});

test('offline caps are separate, same timestamp idempotent and rewind does not credit',()=>{
 const s=K.createState(NOW),before=copy(s),r=K.advance(s,NOW+21*DAY);
 assert.equal(r.summary.cultivationMs,DAY);assert.equal(r.summary.productionMs,7*DAY);
 assert.equal(r.summary.cappedCultivation,true);assert.equal(r.summary.cappedProduction,true);
 assert.equal(s.sweepMs,8*3600000);assert.equal(s.wisdomTickets,7);assert.equal(s.wisdomCarryMs,0);
 assert.equal(s.stones-before.stones,16800);assert.equal(s.materials.herb-before.materials.herb,336);
 assert.equal(s.materials.ore-before.materials.ore,168);assert.equal(s.materials.lotus-before.materials.lotus,28);
 assert.equal(s.paths.magic.xp+s.paths.magic.reserve,r.summary.xp);
 const committed=copy(s);K.advance(s,s.lastAt);assert.deepEqual(s,committed);
 K.advance(s,s.lastAt-DAY);assert.deepEqual(s,committed);
});

test('short repeated production settlements retain fractional output and tick phase',()=>{
 const a=K.createState(NOW),b=K.createState(NOW),end=NOW+65*60000+1377;
 K.advance(a,end);
 for(let t=NOW+7000;t<end;t+=7000)K.advance(b,t);
 K.advance(b,end);
 assert.equal(a.stones,b.stones);assert.deepEqual(a.materials,b.materials);assert.deepEqual(a.paths,b.paths);
 for(const key of ['carryMs','productionCarryMs','wisdomCarryMs','sweepMs'])assert.equal(a[key],b[key]);
 for(const key of Object.keys(a.productionRemainders))assert.ok(Math.abs(a.productionRemainders[key]-b.productionRemainders[key])<1e-7,key);
});

test('multi-resource spend prechecks entire transaction and rejects unknown keys',()=>{
 const s=K.createState(NOW),before=copy(s);
 assert.equal(K.spend(s,{stones:20,materials:{herb:2,ore:99999}}),false);assert.deepEqual(s,before);
 assert.equal(K.spend(s,{stones:20,materials:{unknown:1}}),false);assert.deepEqual(s,before);
 assert.equal(K.spend(s,{stones:-1}),false);assert.deepEqual(s,before);
 assert.equal(K.spend(s,{stones:20,materials:{herb:2,ore:3}}),true);
 assert.equal(s.stones,before.stones-20);assert.equal(s.materials.herb,before.materials.herb-2);
});

test('v2 migration preserves both realms, reserve, quality identity, invested gear and relationships',()=>{
 const old=oldV2(),r=K.validate(JSON.stringify(old));assert.equal(r.ok,true,r.error);assert.equal(r.migrated,true);
 const s=r.state;assert.equal(s.version,3);assert.equal(s.paths.body.realm,2);assert.equal(s.paths.magic.realm,1);
 assert.equal(s.paths.body.layer,1);assert.equal(s.paths.magic.layer,1);
 assert.equal(s.paths.body.reserve,490);assert.equal(s.paths.magic.reserve,300);
 assert.equal(s.stones,4321);assert.equal(s.materials.herb,31);assert.equal(s.pills.heal0,5);assert.equal(s.pills.qi0,4);
 assert.deepEqual(s.bag.map(g=>g.rarity),[3,4,1,0]);assert.equal(s.equipped.charm,'g3');
 assert.equal(s.bag[0].legacy.level,4);assert.equal(s.companions.qinglan.bond,true);
 assert.equal(s.companions.qinglan.affinity,72);assert.equal(s.story.chapter,2);
 for(const route of ['body','magic'])for(const [key,value] of Object.entries(oldPower(old,route)))assert.ok(K.attributes(s,route)[key]>=value,route+' '+key+' investment lost');
 const again=K.validate(JSON.stringify(s));assert.equal(again.ok,true,again.error);
});

test('save validator rejects malformed progression, duplicate IDs, nonfinite currency and prototype payloads',()=>{
 const base=K.createState(NOW);
 for(const modify of [
  s=>s.paths.magic.layer=0,s=>s.paths.magic.layer=11,s=>s.paths.body.realm=6,
  s=>s.player.age=22,s=>s.stones=NaN,s=>s.tickets=-1,
  s=>s.bag.push(copy(s.bag[0])),s=>s.loadouts.magic.skills=[s.loadouts.magic.skills[0],s.loadouts.magic.skills[0]],
  s=>s.gacha.redPity=80,s=>s.wisdomTickets=8,s=>s.sweepMs=8*3600000+1
 ]){const s=copy(base);modify(s);assert.equal(K.validate(s).ok,false);}
 assert.equal(K.validate('{broken').ok,false);
 const poisoned=copy(base);poisoned.attackPayload=JSON.parse('{"__proto__":{"polluted":true}}');
 assert.equal(K.validate(poisoned).ok,false);assert.equal({}.polluted,undefined);
 const before=JSON.stringify(base);const restored=K.validate(base);assert.equal(restored.ok,true,restored.error);
 assert.equal(JSON.stringify(base),before,'validation must not mutate caller state');
});

test('migration matrix preserves investments across both routes and all six old realms',()=>{
 for(const route of ['body','magic'])for(let realm=0;realm<6;realm++){
  const old=oldV2();old.route=route;old.paths[route]={realm,xp:12345};
  for(const g of old.bag){g.tier=25;g.level=10;}
  for(const key of Object.keys(old.techniques))old.techniques[key]=15;
  const result=K.validate(old);assert.equal(result.ok,true,route+' realm '+realm+': '+result.error);
  const s=result.state;assert.equal(s.paths[route].realm,realm);assert.equal(s.paths[route].layer,1);
  assert.equal(s.paths[route].reserve,12345);
  for(const checkRoute of ['body','magic'])for(const [key,value] of Object.entries(oldPower(old,checkRoute)))assert.ok(K.attributes(s,checkRoute)[key]>=value,checkRoute+' '+key);
  assert.equal(K.validate(JSON.stringify(s)).ok,true);
 }
});

test('save byte cap counts Chinese UTF-8 bytes, not JavaScript character count',()=>{
 const raw=JSON.stringify({...K.createState(NOW),untrustedPadding:'汉'.repeat(350000)});
 assert.ok(raw.length<1048576);assert.ok(Buffer.byteLength(raw,'utf8')>1048576);
 const result=K.validate(raw);assert.equal(result.ok,false);assert.match(result.error,/1 MiB/);
});
