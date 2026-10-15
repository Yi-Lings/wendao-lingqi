'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const E=require('../web/engine.js'),K=require('../web/core.js'),C=require('../web/data.js'),A=require('../web/ascension.js'),N=require('../web/ascension-scenes.js');
const NOW=1791331200000,copy=x=>JSON.parse(JSON.stringify(x));
function act(s,type,p={}){const r=E.act(s,{type,...p},NOW);assert.equal(r.ok,true,type+': '+r.message);return r;}
function denied(s,type,p={}){const before=JSON.stringify(s),r=E.act(s,{type,...p},NOW);assert.equal(r.ok,false,type+' must fail');assert.equal(JSON.stringify(s),before,type+' failure is atomic');}
function stock(route='magic'){
 const s=E.createState(NOW);s.route=route;s.paths[route]={realm:5,layer:10,xp:C.layerXp[9]*C.realmXpFactors[5],reserve:0};s.progress.endingTrials[route]=true;s.ritualHistory=[{route,realm:5,choice:'promise',at:NOW}];
 s.story.chapter=6;s.story.mercy=3;s.story.truth=3;s.story.completed=C.chapters.map(ch=>ch.id);s.stones=9000000;for(const id of Object.keys(s.materials))s.materials[id]=10000;
 s.migrationCompensation[route]={attack:50000,defense:30000,maxHp:200000};return s;
}
function toGate(s,choice='protect'){
 act(s,'beginAscension');let guard=0;while(s.ascension.stage==='invitation'){assert(++guard<100);act(s,'advanceAscension');}
 act(s,'chooseAscension',{choice});while(s.ascension.stage==='vow'||s.ascension.stage==='condense'){assert(++guard<150);act(s,'advanceAscension');}
 assert.equal(s.ascension.stage,'trial');while(!A.view(s).challenges.find(d=>d.id==='heaven_gate').allowed){assert(++guard<200);act(s,'advanceAscension');}
}
function win(s,id,practice=false){act(s,'startDungeon',{id,difficulty:0,practice});let frames=0;while(s.battle){assert(++frames<800,'real combat must end');E.tick(s,.25);}assert.equal(s.lastBattleResult.win,true,id+' real simulated victory');return s.lastBattleResult;}
function ascend(s){toGate(s);win(s,'heaven_gate');act(s,'advanceAscension');while(s.ascension.stage==='return')act(s,'advanceAscension');assert.equal(s.ascension.stage,'ready');act(s,'completeAscension');return s;}
function trainFull(s){let guard=0;while(!A.view(s).realmFull){assert(++guard<400);if(A.view(s).canLevelUp)act(s,'advanceCelestial');else act(s,'celestialMeditate',{count:10});}}

test('old saves retain both mortal routes and normalize missing ascension without granting仙元',()=>{
 const s=E.createState(NOW);delete s.ascension;const v=E.validate(s);assert.equal(v.ok,true,v.error);assert.equal(v.state.ascension,null);assert.equal(A.view(v.state).stage,'preparation');assert.equal(A.view(v.state).yuan,0);assert.deepEqual(v.state.paths,s.paths);
});

test('terminal cultivation, final oath and six lived chapters are each necessary, while completed legacy terminal wins remain valid',()=>{
 for(const mutate of [s=>s.paths.magic.layer=9,s=>s.paths.magic.xp--,s=>{s.ritualHistory=[];s.progress.endingTrials.magic=false;},s=>{s.story.chapter=5;s.story.mercy=3;s.story.truth=2;s.story.completed=s.story.completed.slice(0,5);}]){const s=stock();mutate(s);denied(s,'beginAscension');}
 const raw=stock();raw.ritualHistory=[];delete raw.ritualLegacyWins;const legacy=E.validate(raw);assert.equal(legacy.ok,true,legacy.error);assert.equal(A.view(legacy.state).canBegin,true);act(legacy.state,'beginAscension');
 const body=stock('body');body.route='magic';act(body,'beginAscension');assert.equal(body.route,'body','eligible secondary route becomes the real departure route');assert.equal(body.paths.magic.realm,0);assert.equal(body.ascension.route,'body');
});

test('the departure is a resumable conversation, vow, prepared body and fresh real gate rather than a claim button',()=>{
 let s=stock();const before=copy(s),wealth=s.stones;act(s,'beginAscension');act(s,'advanceAscension');assert.equal(s.ascension.line,1);
 const imported=E.validate(E.serialize(s));assert.equal(imported.ok,true,imported.error);s=imported.state;assert.equal(s.ascension.line,1);denied(s,'completeAscension');denied(s,'startDungeon',{id:'heaven_gate'});
 while(s.ascension.stage==='invitation')act(s,'advanceAscension');act(s,'chooseAscension',{choice:'seek'});denied(s,'chooseAscension',{choice:'protect'});
 while(s.ascension.stage==='vow')act(s,'advanceAscension');while(s.ascension.line<N.condense.length-1)act(s,'advanceAscension');
 s.progress.dungeonWins.heaven_gate=3;act(s,'advanceAscension');assert.equal(s.ascension.baseline,3);assert.equal(A.view(s).gateWins,0);assert.equal(s.stones,wealth);for(const [id,n] of Object.entries(A.costs(s,'preparation').materials))assert.equal(before.materials[id]-s.materials[id],n);
 denied(s,'startDungeon',{id:'heaven_gate'});while(s.ascension.line<N.trial.length-1)act(s,'advanceAscension');denied(s,'advanceAscension');
 const prior=s.progress.dungeonWins.heaven_gate;win(s,'heaven_gate');assert.equal(s.progress.dungeonWins.heaven_gate,prior+1);assert.equal(s.ascension.stage,'trial','real victory waits for a personal return');assert.equal(s.ascension.yuan,0);
 act(s,'advanceAscension');while(s.ascension.stage==='return')act(s,'advanceAscension');assert.equal(s.ascension.stage,'ready');assert.equal(s.ascension.yuan,0);act(s,'completeAscension');
 assert.equal(s.ascension.stage,'ascended');assert.equal(s.ascension.yuan,100);assert.equal(s.ascension.realm,0);assert.equal(s.ascension.layer,1);assert.equal(s.ascension.choice,'seek');assert.deepEqual(s.paths,before.paths);assert(K.attributes(s).attack>K.attributes(before).attack);assert(K.attributes(s).maxHp>K.attributes(before).maxHp);
 denied(s,'completeAscension');assert.equal(s.ascension.yuan,100,'arrival reward occurs once');
});

test('insufficient preparation keeps the last scene and all resources intact',()=>{
 const s=stock();act(s,'beginAscension');while(s.ascension.stage==='invitation')act(s,'advanceAscension');act(s,'chooseAscension',{choice:'promise'});while(s.ascension.stage==='vow')act(s,'advanceAscension');while(s.ascension.line<N.condense.length-1)act(s,'advanceAscension');s.materials.essence=0;
 assert.equal(A.view(s).canAdvance,false);denied(s,'advanceAscension');assert.equal(s.ascension.stage,'condense');
});

test('practice and abandoning a gate cannot fabricate a victory or award ascension',()=>{
 const s=stock();toGate(s);const before=copy(s);win(s,'heaven_gate',true);assert.equal(s.progress.dungeonWins.heaven_gate||0,0);assert.equal(s.ascension.yuan,0);assert.equal(s.ascension.xp,0);assert.deepEqual(s.materials,before.materials);denied(s,'advanceAscension');
 act(s,'startDungeon',{id:'heaven_gate'});act(s,'leaveBattle');assert.equal(s.lastBattleResult.win,false);assert.equal(A.view(s).gateWins,0);denied(s,'completeAscension');
});

test('仙界 meditation spends real materials, unlocks actual layers and rejects caps or invalid batches atomically',()=>{
 const s=ascend(stock()),before=copy(s),result=act(s,'celestialMeditate',{count:3});const c=A.costs(before,'meditation',3);
 assert.equal(before.stones-s.stones,c.stones);for(const [id,q]of Object.entries(c.materials))assert.equal(before.materials[id]-s.materials[id],q);assert.equal(s.ascension.xp+s.ascension.reserve,660);assert.equal(s.ascension.yuan-before.ascension.yuan,24);assert.equal(result.data.reward.xp,660);
 const power=K.attributes(s).power;act(s,'advanceCelestial');assert.equal(s.ascension.layer,2);assert(K.attributes(s).power>power);
 for(const count of [0,-1,11,1.5,'2'])denied(s,'celestialMeditate',{count});s.ascension.yuan=K.CAP;denied(s,'celestialMeditate');s.ascension.yuan=100;s.materials.essence=0;denied(s,'celestialMeditate');
});

test('celestialHunt starts real combat, pays once and yields only on a real victory; free practice yields nothing',()=>{
 const s=ascend(stock()),before=copy(s),r=act(s,'celestialHunt');assert(s.battle,'facade opens a real hunt');assert.equal(s.battle.id,'immortal_hunt_0');assert.equal(before.stones-s.stones,1000);assert.equal(s.ascension.xp,0);assert.equal(s.ascension.yuan,100);
 while(s.battle)E.tick(s,.25);assert.equal(s.lastBattleResult.win,true);assert.equal(s.ascension.yuan,112);assert.equal(s.ascension.xp+s.ascension.reserve,180);assert.equal(s.ascension.huntWins,1);assert.equal(s.lastBattleResult.rewards.celestial.yuan,12);assert.equal(s.lastBattleResult.rewards.celestial.xp,180);assert(r.data);
 const stable=copy(s);win(s,'immortal_hunt_0',true);assert.equal(s.stones,stable.stones);assert.equal(s.ascension.yuan,stable.ascension.yuan);assert.equal(s.ascension.xp+s.ascension.reserve,stable.ascension.xp+stable.ascension.reserve);assert.equal(s.ascension.huntWins,1);
 s.stones=0;denied(s,'celestialHunt');act(s,'startDungeon',{id:'immortal_hunt_0',practice:true});act(s,'leaveBattle');assert.equal(s.stones,0);
});

test('all three仙阶 progress through ten real layers and new formal trials, preserving every mortal realm and reward record',()=>{
 const s=ascend(stock()),mortal=copy(s.paths),startPower=K.attributes(s).power;
 for(let realm=0;realm<3;realm++){
  assert.equal(s.ascension.realm,realm);denied(s,'startDungeon',{id:'immortal_'+realm});denied(s,'celestialBreakthrough');trainFull(s);assert.equal(s.ascension.layer,10);assert.equal(s.ascension.xp,A.xpNeeded(s.ascension));
  denied(s,'celestialBreakthrough');const yuan=s.ascension.yuan;win(s,'immortal_'+realm);assert.equal(s.ascension.yuan-yuan,15*(realm+1),'formal trial costs20 and yields35 perrealm');assert.equal(A.view(s).trialFresh,true);
  const before=s.ascension.yuan;act(s,'celestialBreakthrough');assert.equal(before-s.ascension.yuan,100*(realm+1));assert.equal(s.ascension.breakthroughs,realm+1);
  const saved=E.validate(E.serialize(s));assert.equal(saved.ok,true,saved.error);
 }
 assert.equal(s.ascension.realm,2);assert.equal(s.ascension.layer,10);assert.equal(s.ascension.perfected,true);assert.equal(A.view(s).realmLabel,'金仙 圆满');assert(K.attributes(s).power>startPower);assert.deepEqual(s.paths,mortal);assert.equal(s.story.chapter,6);assert.equal(s.ascension.meditations>0,true);
 denied(s,'celestialBreakthrough');const power=K.attributes(s).power;win(s,'immortal_hunt_2');assert.equal(K.attributes(s).power,power,'a hunt remains playable without repeatedly awarding a realm');
});

test('future仙阶 cannot be entered and failed realm advancement or storage-overflow battles preserve costs and gains',()=>{
 const s=ascend(stock());denied(s,'startDungeon',{id:'immortal_hunt_1'});denied(s,'startDungeon',{id:'immortal_0'});denied(s,'advanceCelestial');
 s.ascension.yuan=K.CAP;s.ascension.xp=A.xpNeeded(s.ascension);s.ascension.reserve=K.CAP;const before=copy(s);win(s,'immortal_hunt_0');assert.equal(s.ascension.yuan,K.CAP);assert.equal(s.ascension.reserve,K.CAP);assert.equal(s.lastBattleResult.rewards.celestial.yuan,0);assert.equal(s.lastBattleResult.rewards.celestial.xp,0);assert.equal(s.ascension.huntWins,before.ascension.huntWins+1);assert.equal(E.validate(s).ok,true);
});

test('ascended combat attributes respect the same numeric cap as saved battles',()=>{
 const s=ascend(stock());s.migrationCompensation.magic={attack:K.CAP,defense:K.CAP,maxHp:K.CAP};const attrs=K.attributes(s);assert.equal(attrs.attack,K.CAP);assert.equal(attrs.defense,K.CAP);assert.equal(attrs.maxHp,K.CAP);
 act(s,'startDungeon',{id:'immortal_hunt_0'});assert.equal(E.validate(s).ok,true);act(s,'leaveBattle');
});

test('malformed ascension fields, scene shortcuts, fake仙阶 and future trial histories are rejected',()=>{
 const s=ascend(stock());const changes=[t=>t.ascension.stage='unknown',t=>t.ascension.line=999,t=>t.ascension.choice='unknown',t=>t.ascension.route='unknown',t=>t.ascension.version=2,t=>t.ascension.realm=3,t=>t.ascension.layer=0,t=>t.ascension.xp=A.xpNeeded(t.ascension)+1,t=>t.ascension.yuan=-1,t=>t.ascension.reserve=K.CAP+1,t=>t.ascension.meditations=.5,t=>t.ascension.huntWins=99,t=>t.ascension.breakthroughs=1,t=>t.ascension.perfected=true,t=>t.ascension.trialBaseline=1,t=>t.ascension.baseline=t.progress.dungeonWins.heaven_gate,t=>t.ascension.ascendedAt=NOW-1,t=>t.ascension.extra=true,t=>delete t.ascension.choice,t=>t.ascension={stage:'ascended'},t=>{t.ascension.realm=1;t.ascension.breakthroughs=1;},t=>t.story.chapter=5];
 for(const mutate of changes){const snapshot=copy(s);mutate(snapshot);assert.equal(E.validate(snapshot).ok,false,mutate.toString());}
 const pending=stock();act(pending,'beginAscension');const shortcut=copy(pending);shortcut.ascension.stage='ascended';shortcut.ascension.ascendedAt=NOW;shortcut.ascension.choice='protect';assert.equal(E.validate(shortcut).ok,false);
});
