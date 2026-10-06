'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../web/engine.js'),K=require('../web/core.js'),Q=require('../web/economy.js'),C=require('../web/data.js'),R=require('../web/activity-rewards.js');
const NOW=1700000000000,copy=x=>JSON.parse(JSON.stringify(x));
function stock(tier=0){const s=E.createState(NOW);s.stones=1000000;for(const id of Object.keys(s.materials))s.materials[id]=10000;s.paths.magic.realm=tier;s.paths.magic.layer=10;s.blueprints=Object.keys(C.sets);return s;}
function settle(s,action){const before=copy(s),result=E.act(s,action,NOW);assert.equal(result.ok,true,result.message);const after=copy(s),view=R.model(action,result,before,s);assert.deepEqual(s,after,'presenting cannot mutate the committed state');return {view,result,before};}
function act(s,action){const result=E.act(s,action,NOW);assert.equal(result.ok,true,result.message);return result;}
function item(view,kind,id){return view.items.find(x=>x.kind===kind&&x.id===id);}

test('sweeping reports actual materials and spent reserve without first-clear, tickets, crystals or fabricated loot',()=>{
 const s=stock(2),id='resource_herb';s.sweepMs=45000*10;s.progress.stars[id+':2:0']=3;
 const {view,result,before}=settle(s,{type:'sweepDungeon',id,tier:2,count:5});
 assert.equal(view.title,'扫荡完成');assert.equal(view.count,5);assert.ok(view.subtitle.includes('5次'));assert.equal(s.sweepMs,before.sweepMs-result.data.costMs);
 for(const [id,count] of Object.entries(result.data.reward.materials))assert.equal(item(view,'material',id).count,count);
 assert.equal(item(view,'currency','stones').count,s.stones-before.stones);
 assert.ok(view.items.every(x=>x.kind!=='gear'&&x.kind!=='blueprint'&&x.id!=='tickets'&&!x.id.startsWith('crystal')));
 assert.deepEqual(s.progress.firstClears,before.progress.firstClears);
 const raw=JSON.stringify(s);R.render(view,{state:s});R.render(view,{state:s});assert.equal(JSON.stringify(s),raw,'viewing and closing never regrant a sweep');
});

test('capped sweep quantities show actual capped gains and can report no increase honestly',()=>{
 const s=stock(),id='resource_ore';s.sweepMs=45000*3;s.progress.stars[id+':0:0']=3;s.stones=K.CAP;for(const id of Object.keys(C.dungeons.resource_ore.rewards.materials))s.materials[id]=K.CAP-1;
 let {view}=settle(s,{type:'sweepDungeon',id,tier:0,count:1});assert.ok(!item(view,'currency','stones'));assert.ok(view.items.every(x=>x.count===1));
 ({view}=settle(s,{type:'sweepDungeon',id,tier:0,count:1}));assert.equal(view.items.length,0);assert.ok(view.status.includes('没有新增'));assert.ok(R.render(view).includes('本次没有新增物品'));
});

test('immediate alchemy shows the selected recipe and batch with real expenses only',()=>{
 const s=stock(),{view,result,before}=settle(s,{type:'craftPill',id:'heal0',count:10});
 assert.equal(view.type,'craftPill');assert.equal(view.count,result.data.count);assert.equal(view.bonus,0);assert.equal(item(view,'pill','heal0').count,s.pills.heal0-before.pills.heal0);assert.equal(view.items.length,1);
 assert.ok(view.costs.some(x=>x.id==='stones'&&x.count===80));assert.ok(view.costs.some(x=>x.id==='herb'&&x.count===30));assert.ok(R.render(view).includes('data-reward-kind="pill"'));
});

test('queued alchemy and partial control grant no celebration until its single real finish, including the bonus',()=>{
 const s=stock(),action={type:'queuePill',id:'heal0',count:10},before=copy(s),result=act(s,action),jobId=result.data.job.id;
 assert.equal(R.model(action,result,before,s),null);
 act(s,{type:'startAlchemyControl',jobId});for(let round=0;round<3;round++){const before=copy(s),fire=s.alchemy.jobs[0].rhythm[round],action={type:'stokeAlchemy',jobId,fire},result=act(s,action);assert.equal(R.model(action,result,before,s),null);}
 const {view,result:finish,before:paid}=settle(s,{type:'finishAlchemyJob',jobId});assert.equal(view.count,12);assert.equal(view.bonus,2);assert.equal(item(view,'pill','heal0').count,finish.data.count);assert.equal(view.items.length,1);assert.equal(view.costs.length,0);assert.ok(view.note.includes('基础成丹 10枚'));assert.ok(view.note.includes('火候契合 3/3轮'));assert.equal(s.pills.heal0-paid.pills.heal0,12);
 const duplicate=E.act(s,{type:'finishAlchemyJob',jobId},NOW);assert.equal(duplicate.ok,false);assert.equal(R.model({type:'finishAlchemyJob',jobId},duplicate,paid,s),null);
});

test('forge presents the actual UID and overflow location rather than a prospective picture',()=>{
 const s=stock(1),action={type:'forgeGear',set:'array',slot:'charm',rarity:5};
 const {view,result}=settle(s,action),gear=item(view,'gear',result.data.gear.uid);assert.deepEqual(gear.gear,result.data.gear);assert.ok(s.bag.some(x=>x.uid===gear.id));assert.equal(view.rare,true);assert.equal(view.items.length,1);assert.ok(R.render(view,{state:s}).includes('data-inspect-snapshot="'));
 while(s.bag.length<300)act(s,{type:'forgeGear',set:'body',slot:'head',rarity:0});
 const overflow=settle(s,{type:'forgeGear',set:'thunder',slot:'boots',rarity:4});assert.equal(overflow.view.overflow,true);assert.ok(s.rewardOverflow.some(x=>x.uid===overflow.result.data.gear.uid));assert.ok(R.render(overflow.view,{state:s}).includes('奖励暂存'));
});

test('failed forge or alchemy actions never present loot or mutate their original state',()=>{
 const s=E.createState(NOW),before=copy(s);
 for(const action of [{type:'forgeGear',set:'sword',slot:'weapon',rarity:5},{type:'craftPill',id:'heal0',count:100},{type:'sweepDungeon',id:'resource_herb',count:1,tier:0}]){const result=E.act(s,action,NOW);assert.equal(result.ok,false);assert.deepEqual(s,before);assert.equal(R.model(action,result,before,s),null);}
});

test('wisdom and commission collections report only the real capped or tier-specific proceeds',()=>{
 const s=stock(1);s.wisdomTickets=6;s.tickets=K.CAP-2;
 let {view}=settle(s,{type:'claimWisdom'});assert.equal(item(view,'currency','tickets').count,2);assert.equal(s.wisdomTickets,0);
 act(s,{type:'joinSect',school:'sword'});s.stats.craftedTier1=20;
 ({view}=settle(s,{type:'claimCommission',id:'alchemy'}));assert.ok(item(view,'material','crystal1'));assert.ok(!item(view,'material','crystal0'));assert.ok(item(view,'currency','contribution'));assert.ok(view.items.every(x=>x.count>0));
});

test('chapter reward duplicates turn into actual fragments rather than falsely displayed new techniques',()=>{
 const s=stock(),ch=C.chapters[0];s.paths.magic.layer=5;s.progress.dungeonWins.resource_herb=1;for(const id of ch.reward.techniques)s.techniques[id]={level:1,branch:0,spent:0,resetUsed:false};
 const before=copy(s),action={type:'claimChapter',choice:'protect'},result=E.act(s,action,NOW);assert.equal(result.ok,true,result.message);
 const view=R.model(action,result,before,s);assert.equal(view.type,'claimChapter');assert.equal(view.subtitle,ch.name);
 for(const id of result.data.reward.techniques||[])if(before.techniques[id])assert.ok(!item(view,'technique',id));
 const gained=s.fragments.universal-before.fragments.universal;assert.equal(item(view,'fragment','universal')?.count||0,gained);
 assert.ok(!view.items.some(x=>x.kind==='blueprint'&&before.blueprints.includes(x.id)));
});

test('gear recycling and reward-box transfer show real returns without recreating removed gear',()=>{
 const s=stock(),forged=act(s,{type:'forgeGear',set:'elements',slot:'head',rarity:3}).data.gear;
 let {view}=settle(s,{type:'recycleGear',uid:forged.uid});assert.equal(item(view,'currency','dust').count,8);assert.equal(item(view,'currency','stones').count,120);assert.ok(!item(view,'gear',forged.uid));assert.ok(!s.bag.some(x=>x.uid===forged.uid));
 const g=Q.createGear(s,{set:'shadow',slot:'bracer',rarity:2,tier:0});s.rewardOverflow.push(g);
 ({view}=settle(s,{type:'claimOverflow'}));assert.equal(view.items.length,1);assert.equal(item(view,'gear',g.uid).count,1);assert.ok(view.status.includes('不重复发放'));assert.equal(s.rewardOverflow.length,0);assert.ok(s.bag.some(x=>x.uid===g.uid));
 const zero=settle(s,{type:'bulkRecycle',maxRarity:0});assert.equal(zero.view,null,'protected starter gear is not a reward-producing operation');
});

test('cancelled prepaid alchemy presents a refund with no crafted pills or claimed bonus',()=>{
 const s=stock(),jobId=act(s,{type:'queuePill',id:'heal0',count:10}).data.job.id;act(s,{type:'startAlchemyControl',jobId});
 const {view}=settle(s,{type:'cancelAlchemyJob',jobId});assert.equal(view.title,'药材已退还');assert.equal(item(view,'currency','stones').count,180);assert.equal(item(view,'material','herb').count,30);assert.ok(!view.items.some(x=>x.kind==='pill'));assert.ok(R.render(view).includes('材料如数返还'));
});

test('partial joint steps never settle and final XP includes automatic layer advancement without overcounting',()=>{
 const s=stock();s.paths.magic.layer=3;s.autoSmall=true;s.companions.qinglan.affinity=100;s.companions.qinglan.bond=true;
 act(s,{type:'jointInvite',companion:'qinglan',techniques:['thunder_skill_0','array_skill_0','thunder_skill_0']});
 for(let step=0;step<2;step++){const before=copy(s),action={type:'jointStep',choice:s.joint.rhythm[step]},result=act(s,action);assert.equal(R.model(action,result,before,s),null);}
 const {view,result,before}=settle(s,{type:'jointStep',choice:s.joint.rhythm[2]});assert.equal(item(view,'currency','xp').count,result.data.xp);assert.ok(s.paths.magic.layer>before.paths.magic.layer);assert.equal(s.joint,null);assert.ok(view.subtitle.includes(C.companions.qinglan.name));
});

test('cave gathering clearly distinguishes real pending rewards from currency already in inventory',()=>{
 const s=stock(1);act(s,{type:'startDungeon',id:'cave_0'});
 s.exploration.choices=[{id:'herb:gather',label:'灵药园 · 采摘',description:'药香幽远',cost:{},reward:{},roomId:'herb',optionId:'gather'}];
 const {view,before}=settle(s,{type:'chooseCave',choice:'herb:gather'});assert.ok(view.pending);assert.ok(view.items.length);assert.ok(view.status.includes('暂存洞天'));assert.equal(s.materials.herb,before.materials.herb);assert.ok(R.render(view).includes('data-rewards-pending="true"'));
 const practice=stock(1);act(practice,{type:'startDungeon',id:'cave_0',practice:true});practice.exploration.choices=copy(before.exploration.choices);
 const tested=settle(practice,{type:'chooseCave',choice:'herb:gather'});assert.equal(tested.view,null,'practice must not advertise real gathered loot');
});

test('shopping, equipment settings and partial production stay in place and never open a harvest overlay',()=>{
 const s=stock(),before=copy(s),result={ok:true,data:{reward:{stones:9999}}};
 for(const type of ['buyResource','exchangeDust','buyJade','exchangeJade','draw','drawWithJade','equipGear','equipSet','equipRecommendedBuild','setLoadout','setGachaTarget','queuePill','startAlchemyControl','stokeAlchemy','upgradeFacility','enhanceSlot','recastGear','awakenGear'])assert.equal(R.model({type},result,before,s),null,type);
});

test('renderer escapes action text, retains equipment details, and uses exactly the earned quantities',()=>{
 const s=stock(),{view}=settle(s,{type:'forgeGear',set:'sword',slot:'weapon',rarity:4});view.subtitle='<img src=x onerror=alert(1)>';view.note='<script>alert(1)</script>';
 const html=R.render(view,{state:s});assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<img src=x'));assert.ok(html.includes('&lt;script&gt;'));assert.ok(html.includes('data-reward-count="1"'));assert.ok(html.includes('data-inspect-kind="gear"'));
});
