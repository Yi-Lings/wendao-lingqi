(function(root,factory){
  const api=factory(typeof module==='object'&&module.exports?require('./data.js'):root.WendaoData);
  if(typeof module==='object'&&module.exports)module.exports=api;else root.WendaoCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(C){
'use strict';
const CAP=1e12,MAX_TIME=8640000000000000,DAY=86400000,HOUR=3600000,TICK=3000,PRODUCTION=60000;
const CULT_CAP=DAY,PROD_CAP=7*DAY,SWEEP_CAP=8*HOUR;
const own=(o,k)=>!!o&&Object.prototype.hasOwnProperty.call(o,k);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const routes=['body','magic'],slots=['weapon','armor','head','bracer','boots','charm'];
const materialIds=['herb','ore','lotus','insight','essence','soul','crystal0','crystal1','crystal2','crystal3','crystal4','crystal5'];
const statIds=['kills','bosses','crafted','breakthroughs','gifts','joints','gearDrops','failed','manualWins','skillCasts','pillsUsed'];
const affixIds=['attack','defense','hp','crit','critDamage','dodge','cooldownReduction','healing','penetration','mpRegen'];
const ranks=['一','二','三','四','五','六','七','八','九','十'];
const table=(o)=>Array.isArray(o)?o:Object.values(o||{});
const routeOk=(r)=>routes.includes(r);
function time(n){if(n===undefined)n=Date.now();if(typeof n!=='number'||!Number.isSafeInteger(n)||n<0||n>MAX_TIME)throw Error('时间参数无效');return n;}
function cleanText(v,length){return String(v===undefined?'':v).replace(/[<>&\u0000-\u001f]/g,'').slice(0,length||300);}
function integer(v,min,max,label){if(typeof v!=='number'||!Number.isSafeInteger(v)||v<min||v>max)throw Error('存档字段无效：'+label);return v;}
function number(v,min,max,label){if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw Error('存档数值无效：'+label);return v;}
function boolean(v,label){if(typeof v!=='boolean')throw Error('存档布尔值无效：'+label);return v;}
function object(v,label){if(!v||typeof v!=='object'||Array.isArray(v))throw Error('存档结构无效：'+label);return v;}
function array(v,max,label){if(!Array.isArray(v)||v.length>max)throw Error('存档列表无效：'+label);return v;}
function safeKey(k){return typeof k==='string'&&k!=='__proto__'&&k!=='prototype'&&k!=='constructor';}
function safeJson(v){
  let nodes=0;
  function visit(x,depth){
    if(++nodes>100000||depth>22)throw Error('存档结构过于复杂');
    if(x===null||typeof x==='boolean')return x;
    if(typeof x==='number'){number(x,-CAP,MAX_TIME,'嵌套数值');return x;}
    if(typeof x==='string'){if(x.length>6000)throw Error('存档文字过长');return x;}
    if(Array.isArray(x)){array(x,1200,'嵌套列表');return x.map(y=>visit(y,depth+1));}
    object(x,'嵌套对象');
    const proto=Object.getPrototypeOf(x);
    if(proto!==Object.prototype&&proto!==null)throw Error('存档包含非 JSON 对象');
    const keys=Object.keys(x);if(keys.length>1000)throw Error('存档字段过多');
    const out={};
    for(const k of keys){if(!safeKey(k)||k.length>100)throw Error('存档包含非法字段');out[k]=visit(x[k],depth+1);}
    return out;
  }
  return visit(v,0);
}
function add(o,k,amount){
  if(!safeKey(k)||!Number.isFinite(amount)||amount<0)throw Error('奖励数量无效');
  const current=typeof o[k]==='number'&&Number.isFinite(o[k])?o[k]:0;
  o[k]=Math.min(CAP,current+Math.floor(amount));return o[k];
}
function rng(s,stream){
  stream=stream||'loot';if(!['gacha','loot','world'].includes(stream))throw Error('未知随机流');
  s.rngStreams[stream]=(Math.imul(s.rngStreams[stream],1664525)+1013904223)>>>0;
  return s.rngStreams[stream]/4294967296;
}
function log(s,message,now){
  if(!Array.isArray(s.logs))s.logs=[];
  s.logs.push({at:now===undefined?s.lastAt:time(now),text:cleanText(message,360)});
  if(s.logs.length>60)s.logs.splice(0,s.logs.length-60);
}
function pathRank(s,route){route=route||s.route;const p=s.paths[route];return p.realm*10+p.layer-1;}
function maxRank(s){return Math.max(pathRank(s,'body'),pathRank(s,'magic'));}
function unlocks(s,route){
  const rank=pathRank(s,route);
  return {skillSlots:rank>=10?4:rank>=4?3:2,secretSlots:rank>=13?2:rank>=4?1:0,
    treasureSlots:rank>=16?3:rank>=13?2:rank>=10?1:0,gacha:rank>=10,
    resources:rank>=2,sect:rank>=4,tower:rank>=6,cave:rank>=8};
}
function xpNeeded(s,route){
  const p=s.paths[route||s.route];
  return Math.round((C.layerXp||[100,160,240,360,520,740,1000,1340,1740,2200])[p.layer-1]*(C.realmXpFactors||[1,3,8,20,50,125])[p.realm]);
}
function absorbReserve(s,route){
  const p=s.paths[route],room=Math.max(0,xpNeeded(s,route)-p.xp);
  const taken=Math.min(room,p.reserve);p.xp+=taken;p.reserve-=taken;return taken;
}
function levelUp(s,route){
  route=route||s.route;if(!routeOk(route))return {ok:false,message:'未知修炼路线。'};
  const p=s.paths[route];absorbReserve(s,route);
  if(p.layer===10)return {ok:false,message:'已至圆满，请完成大境试炼后主动突破。'};
  const needed=xpNeeded(s,route);if(p.xp<needed)return {ok:false,message:'修为尚未达到下一层。'};
  p.xp-=needed;p.layer++;absorbReserve(s,route);
  return {ok:true,message:realmLabel(s,route)+'，道基更稳。'};
}
function addXp(s,amount,route){
  route=route||s.route;if(!routeOk(route)||!Number.isFinite(amount)||amount<0)throw Error('修为奖励无效');
  const p=s.paths[route],total=Math.min(CAP,p.xp+p.reserve+Math.floor(amount));
  p.xp=Math.min(total,xpNeeded(s,route));p.reserve=total-p.xp;
  if(s.autoSmall&&p.layer>=3){for(let guard=0;guard<9&&p.layer<10&&p.xp>=xpNeeded(s,route);guard++)levelUp(s,route);}
  return p;
}
function costList(s,cost){
  object(cost,'cost');const list=[];
  for(const key of ['stones','tickets','dust'])if(own(cost,key))list.push([s,key,cost[key]]);
  if(own(cost,'contribution'))list.push([s.sect,'contribution',cost.contribution]);
  for(const field of ['materials','pills'])if(own(cost,field)){
    object(cost[field],field);
    for(const [id,q] of Object.entries(cost[field])){
      if(field==='materials'?!materialIds.includes(id):!own(C.recipes,id))throw Error('未知消耗物品');
      list.push([s[field],id,q]);
    }
  }
  for(const [o,k,q] of list)integer(q,0,CAP,'消耗 '+k);
  return list;
}
function spend(s,cost){
  try{const list=costList(s,cost);if(list.some(([o,k,q])=>(o[k]||0)<q))return false;for(const [o,k,q] of list)o[k]=(o[k]||0)-q;return true;}
  catch(e){return false;}
}
function grant(s,reward,route){
  object(reward,'reward');
  for(const key of ['stones','tickets','dust'])if(own(reward,key))add(s,key,reward[key]);
  if(own(reward,'contribution'))add(s.sect,'contribution',reward.contribution);
  for(const field of ['materials','pills'])if(own(reward,field)){
    object(reward[field],field);
    for(const [id,q] of Object.entries(reward[field])){
      if(field==='materials'?!materialIds.includes(id):!own(C.recipes,id))throw Error('未知奖励物品');
      add(s[field],id,q);
    }
  }
  if(own(reward,'xp'))addXp(s,reward.xp,route);
}
function starterGear(uid,slot){return {uid,slot,rarity:0,tier:0,set:slot==='armor'?'body':'thunder',affixes:[],special:null,awakening:0,locked:false,rerolls:0,targetMisses:0,targetId:null};}
function defaultLoadout(){return {heart:'thunder_heart_0',skills:['thunder_skill_0','array_skill_0'],secrets:[],treasures:[null,null,null],pills:['heal0','shield0','purify0']};}
function createState(now){
  now=time(now);const seed=(now>>>0)||1;
  const s={version:3,contentVersion:3,revision:0,player:{name:'无名行者',age:26},route:'magic',
    paths:{body:{realm:0,layer:1,xp:0,reserve:0},magic:{realm:0,layer:1,xp:0,reserve:0}},
    stones:120,tickets:10,dust:0,materials:Object.fromEntries(materialIds.map(id=>[id,0])),
    pills:Object.fromEntries(Object.keys(C.recipes||{}).map(id=>[id,0])),
    techniques:{},fragments:{universal:0},loadouts:{body:defaultLoadout(),magic:defaultLoadout()},
    presets:{body:[null,null,null],magic:[null,null,null]},bag:[starterGear('g1','weapon'),starterGear('g2','armor')],
    equipped:{weapon:'g1',armor:'g2',head:null,bracer:null,boots:null,charm:null},
    slotLevels:Object.fromEntries(slots.map(id=>[id,0])),nextUid:3,ownedTreasures:{},blueprints:[],
    facilities:{field:1,furnace:1,forge:1,library:1,array:1},
    alchemy:{nextId:1,jobs:[]},
    progress:{firstClears:[],stars:{},tower:0,sectTrials:[],trialWins:{},bossWins:{},dungeonWins:{},endingTrials:{body:false,magic:false}},
    stats:Object.fromEntries(statIds.map(id=>[id,0])),
    sect:{joined:false,school:null,contribution:0,rank:0,claimed:[],taskCounts:{}},
    companions:Object.fromEntries(Object.keys(C.companions||{}).map(id=>[id,{affinity:0,bond:false,cooldownUntil:0,lastTalkAt:-60000,questStep:0}])),
    story:{chapter:0,mercy:0,truth:0,ending:null,completed:[],sideCompleted:[]},
    joint:null,battle:null,exploration:null,
    gacha:{highPity:0,redPity:0,target:null,fateGuarantee:false,history:[],total:0},
    rngStreams:{gacha:seed^0x9e3779b9,loot:seed^0x85ebca6b,world:seed^0xc2b2ae35},
    lastAt:now,carryMs:0,productionCarryMs:0,wisdomCarryMs:0,wisdomTickets:0,sweepMs:0,
    productionRemainders:{stones:0,herb:0,ore:0,lotus:0,insight:0,essence:0},
    autoSmall:false,training:true,logs:[],lastSettlement:null,rewardOverflow:[],rerollPending:null,
    migrationCompensation:{body:{attack:0,defense:0,maxHp:0},magic:{attack:0,defense:0,maxHp:0}}};
  s.rngStreams.gacha>>>=0;s.rngStreams.loot>>>=0;s.rngStreams.world>>>=0;
  Object.assign(s.materials,{herb:12,ore:8,lotus:3,insight:8});
  for(const id of ['thunder_heart_0','thunder_skill_0','array_skill_0','body_skill_1'])if(own(C.techniques,id))s.techniques[id]={level:1,branch:0,spent:0,resetUsed:false};
  s.pills.heal0=2;s.pills.qi0=1;
  log(s,'你已26岁，青岚山麓的洞府向你开启。先修炼至炼气二层，再选择自己的道途。',now);
  return s;
}
function gearStats(s,g,route){
  route=route||s.route;const tier=Math.min(g.tier,s.paths[route].realm),rarity=(C.rarities||[])[g.rarity]||{multiplier:1};
  const level=(s.slotLevels&&s.slotLevels[g.slot])||0,m=(rarity.multiplier||1)*(1+level*.05)*(1+(g.awakening||0)*.03);
  const bases={
    weapon:{attack:10+tier*9,defense:0,hp:0},armor:{attack:0,defense:3+tier*3,hp:25+tier*26},
    head:{attack:0,defense:2+tier*2,hp:20+tier*20},bracer:{attack:4+tier*4,defense:1+tier,hp:0},
    boots:{attack:0,defense:2+tier*2,hp:10+tier*12},charm:{attack:4+tier*4,defense:2+tier*2,hp:15+tier*15}};
  const b=bases[g.slot]||{attack:0,defense:0,hp:0};
  const a={attack:Math.floor(b.attack*m),defense:Math.floor(b.defense*m),hp:Math.floor(b.hp*m),crit:0,critDamage:0,dodge:0,cooldownReduction:0,healing:0,penetration:0,mpRegen:0};
  for(const f of g.affixes||[]){if(!affixIds.includes(f.id))continue;const scale=['attack','defense','hp','mpRegen'].includes(f.id)?(tier+1)/(g.tier+1):1;a[f.id]=(a[f.id]||0)+f.value*scale;}
  a.maxHp=a.hp;return a;
}
function gearName(g){
  const rarity=(C.rarities||[])[g.rarity]||{name:'凡品'},set=(C.sets||{})[g.set];
  return rarity.name+'·'+(set?set.name:g.set)+'·'+((C.slots||{})[g.slot]||g.slot)+' '+(g.tier+1)+'阶'+(g.awakening?' 觉醒'+g.awakening:'');
}
function protectedGear(s,uid){
  const g=s.bag.find(x=>x.uid===uid)||(s.rewardOverflow||[]).find(x=>x.uid===uid);
  if(!g)return false;if(g.locked||Object.values(s.equipped).includes(uid))return true;
  return routes.some(route=>(s.presets[route]||[]).some(p=>p&&p.equipped&&Object.values(p.equipped).includes(uid)));
}
function attributes(s,route){
  route=route||s.route;const p=s.paths[route],rank=pathRank(s,route),body=route==='body',load=s.loadouts[route]||defaultLoadout(),u=unlocks(s,route);
  const a={attack:(body?18:22)+rank*(body?2.6:3),defense:(body?8:5)+rank*(body?1.25:.9),
    maxHp:(body?140:110)+rank*(body?16:13),maxMp:100+rank*3,
    crit:.05,critDamage:1.5,dodge:.02,cooldownReduction:0,damageReduction:0,healing:0,penetration:0,
    attackSpeed:1,mpRegen:3+s.facilities.array*.15,lifesteal:0,dotDamage:0,elementalDamage:0,
    sets:{},redEffects:[],heart:load.heart,secrets:(load.secrets||[]).slice(0,u.secretSlots),treasures:(load.treasures||[]).slice(0,u.treasureSlots).filter(Boolean)};
  for(const slot of slots){const g=s.bag.find(x=>x.uid===s.equipped[slot]);if(!g)continue;const t=gearStats(s,g,route);
    for(const [k,v] of Object.entries(t))if(k==='hp')a.maxHp+=v;else if(k!=='maxHp')a[k]=(a[k]||0)+v;
    a.sets[g.set]=(a.sets[g.set]||0)+1;if(g.rarity===5&&g.special&&!a.redEffects.includes(g.special))a.redEffects.push(g.special);}
  const percent={attack:0,defense:0,maxHp:0,maxMp:0};
  function stats(values){for(const [key,val] of Object.entries(values||{})){const k=key==='hp'?'maxHp':key;if(own(percent,k))percent[k]+=val;else if(typeof a[k]==='number')a[k]+=val;}}
  const heart=C.techniques[load.heart],heartInfo=s.techniques[load.heart];
  if(heart&&heartInfo){const level=heartInfo.level;a.attack+=level;a.maxHp+=level*3;
    if(heart.school==='sword'){percent.attack+=.08;a.crit+=.04;}
    if(heart.school==='body'){percent.maxHp+=.08;percent.defense+=.10;}
    if(heart.school==='thunder'){percent.attack+=.10;percent.maxMp+=.05;}
    if(heart.school==='elements')a.elementalDamage+=.12;
    if(heart.school==='shadow')a.dotDamage+=.15;
    if(heart.school==='array'){a.healing+=.15;a.mpRegen+=.5;}}
  for(const [school,count] of Object.entries(a.sets)){const set=(C.sets||{})[school];if(!set)continue;if(count>=2)stats(set.twoStats);if(count>=4)stats(set.fourStats);}
  for(const id of a.treasures){const item=C.treasures[id],owned=s.ownedTreasures[id];if(item&&owned){const values=item.rules&&item.rules.stats||item.stats||{};stats(Object.fromEntries(Object.entries(values).map(([k,v])=>[k,v*(1+(owned.level-1)*.05)])));}}
  a.attack=Math.floor(a.attack*(1+percent.attack));a.defense=Math.floor(a.defense*(1+percent.defense));
  a.maxHp=Math.floor(a.maxHp*(1+percent.maxHp));a.maxMp=Math.floor(a.maxMp*(1+percent.maxMp));
  const comp=s.migrationCompensation&&s.migrationCompensation[route];if(comp){a.attack+=comp.attack;a.defense+=comp.defense;a.maxHp+=comp.maxHp;}
  a.crit=clamp(a.crit,0,.70);a.critDamage=clamp(a.critDamage,1,2.5);a.dodge=clamp(a.dodge,0,.35);
  a.cooldownReduction=clamp(a.cooldownReduction,0,.4);a.damageReduction=clamp(a.damageReduction,0,.5);
  a.penetration=clamp(a.penetration,0,.4);a.healing=clamp(a.healing,0,1);a.lifesteal=clamp(a.lifesteal,0,.2);a.attackSpeed=clamp(a.attackSpeed,.5,2);
  a.attack=Math.max(1,Math.floor(a.attack));a.defense=Math.max(0,Math.floor(a.defense));a.maxHp=Math.max(1,Math.floor(a.maxHp));a.maxMp=Math.max(20,Math.floor(a.maxMp));
  a.power=Math.round(a.attack*5+a.defense*4+a.maxHp);return a;
}
function realmLabel(s,route){
  route=route||s.route;const p=s.paths[route],name=C.routes[route].realmNames[p.realm],phase=p.layer===10?'圆满':p.layer>=7?'后期':p.layer>=4?'中期':'初期';
  return name+ranks[p.layer-1]+'层·'+phase;
}
function trainingPerTick(s,route){
  const p=s.paths[route||s.route],load=s.loadouts[route||s.route],heart=s.techniques[load.heart];
  return Math.floor((3+s.facilities.array+Math.floor(s.facilities.library/3)+Math.floor((heart?heart.level:1)/5))*(C.realmXpFactors||[1,3,8,20,50,125])[p.realm]);
}
function advance(s,now){
  now=time(now);if(now<=s.lastAt)return {ok:true,summary:{elapsedMs:0,xp:0,stones:0,materials:{},wisdomTickets:0,sweepAddedMs:0}};
  const elapsed=now-s.lastAt,cult=Math.min(elapsed,CULT_CAP),prod=Math.min(elapsed,PROD_CAP),beforeSweep=s.sweepMs;
  const ticks=Math.floor((cult+s.carryMs)/TICK);s.carryMs=(cult+s.carryMs)%TICK;
  const xp=s.training?ticks*trainingPerTick(s,s.route):0;if(xp)addXp(s,xp,s.route);
  const minutes=Math.floor((prod+s.productionCarryMs)/PRODUCTION);s.productionCarryMs=(prod+s.productionCarryMs)%PRODUCTION;
  const tier=Math.max(s.paths.body.realm,s.paths.magic.realm);
  const rates={stones:100*(1+tier)*(1+(s.facilities.array-1)*.1)/60,herb:s.facilities.field/30,
    ore:s.facilities.forge/60,lotus:s.facilities.field/360,insight:s.facilities.library/60,essence:s.facilities.furnace/360};
  if(!s.productionRemainders)s.productionRemainders={stones:0,herb:0,ore:0,lotus:0,insight:0,essence:0};
  const output={};
  for(const [id,rate] of Object.entries(rates)){
    const units=(s.productionRemainders[id]||0)+minutes*rate,q=Math.floor(units+1e-9);
    s.productionRemainders[id]=clamp(units-q,0,.999999999999);output[id]=q;
    if(id==='stones')add(s,id,q);else add(s.materials,id,q);
  }
  const oldWisdom=s.wisdomTickets,wisdom=Math.min(7*DAY,s.wisdomTickets*DAY+s.wisdomCarryMs+prod);
  s.wisdomTickets=Math.floor(wisdom/DAY);s.wisdomCarryMs=wisdom%DAY;
  s.sweepMs=Math.min(SWEEP_CAP,s.sweepMs+elapsed);s.lastAt=now;
  const summary={elapsedMs:elapsed,cultivationMs:cult,productionMs:prod,xp,stones:output.stones,
    materials:Object.fromEntries(Object.entries(output).filter(([k])=>k!=='stones')),wisdomTickets:s.wisdomTickets-oldWisdom,
    sweepAddedMs:s.sweepMs-beforeSweep,cappedCultivation:elapsed>CULT_CAP,cappedProduction:elapsed>PROD_CAP};
  s.lastSettlement=summary;if(elapsed>=60000)log(s,'洞府结算：修为+'+xp+'，灵石+'+output.stones+'；尚未领取悟道券'+s.wisdomTickets+'张。',now);
  return {ok:true,summary};
}
function view(s){
  const a=attributes(s,s.route),p=s.paths[s.route],paths={};
  for(const route of routes)paths[route]=Object.assign({},s.paths[route],attributes(s,route),{realmName:C.routes[route].realmNames[s.paths[route].realm],realmLabel:realmLabel(s,route),xpNeeded:xpNeeded(s,route)});
  return Object.assign({},a,{realmName:C.routes[s.route].realmNames[p.realm],realmLabel:realmLabel(s,s.route),xpNeeded:xpNeeded(s),unlocks:unlocks(s),
    path:p,paths,loadout:s.loadouts[s.route],maxRealm:Math.max(s.paths.body.realm,s.paths.magic.realm),maxRank:maxRank(s),
    hp:s.battle&&s.battle.player?s.battle.player.hp:a.maxHp,mp:s.battle&&s.battle.player?s.battle.player.mp:a.maxMp,
    trainingPerMinute:trainingPerTick(s)*20,facilityCost:Object.fromEntries(Object.entries(s.facilities).map(([id,level])=>[id,{stones:250*level*level,ore:8*level,herb:4*level}])),
    techniqueCost:Object.fromEntries(Object.entries(s.techniques).map(([id,item])=>[id,{stones:80*(item.level+1)*(p.realm+1),insight:2+item.level}])),
    equipmentNames:Object.fromEntries(s.bag.map(g=>[g.uid,gearName(g)])),equipmentStats:Object.fromEntries(s.bag.map(g=>[g.uid,gearStats(s,g)])),
    lastSettlement:s.lastSettlement,wisdomTickets:s.wisdomTickets,sweepMs:s.sweepMs});
}
function catalogKey(c,id,label){if(typeof id!=='string'||!safeKey(id)||!own(c||{},id))throw Error('存档物品 ID 无效：'+label);return id;}
function gearUid(uid){if(typeof uid==='string'&&/^g[1-9]\d{0,11}$/.test(uid)&&Number(uid.slice(1))<=CAP)return uid;if(typeof uid==='number'&&Number.isSafeInteger(uid)&&uid>=1&&uid<=CAP)return uid;throw Error('装备 UID 无效');}
function validateGear(g,label){
  object(g,label);gearUid(g.uid);if(!slots.includes(g.slot))throw Error('装备部位无效');
  integer(g.rarity,0,5,'装备品质');integer(g.tier,0,5,'装备阶位');catalogKey(C.schools,g.set,'装备套装');
  array(g.affixes,4,'装备词条');const used=new Set();
  for(const a of g.affixes){object(a,'词条');if(!affixIds.includes(a.id)||used.has(a.id))throw Error('装备词条类型无效');used.add(a.id);number(a.value,0,['attack','defense','hp'].includes(a.id)?50000:a.id==='mpRegen'?100:2,'词条值');}
  if(g.special!==null&&g.special!==undefined)catalogKey(C.schools,g.special,'红装机制');
  if(g.rarity!==5&&g.special)throw Error('非红装备不能带红装机制');
  integer(g.awakening,0,5,'觉醒');boolean(g.locked,'锁定');integer(g.rerolls,0,CAP,'洗炼次数');integer(g.targetMisses,0,9,'词条定向计数');
  if(g.targetId!==undefined&&g.targetId!==null&&!affixIds.includes(g.targetId))throw Error('词条目标无效');
  if(g.legacy){object(g.legacy,'旧装备记录');integer(g.legacy.tier,1,25,'旧装备阶位');integer(g.legacy.level,0,10,'旧强化');}
  return g;
}
function validateLoadout(s,l,route,pre){
  object(l,'功法配置');if(l.heart!==null){catalogKey(C.techniques,l.heart,'心法');if(C.techniques[l.heart].kind!=='heart'||!own(s.techniques,l.heart))throw Error('未学会配置心法');}
  const u=unlocks(s,route);for(const [field,kind,limit] of [['skills','skill',u.skillSlots],['secrets','secret',u.secretSlots]]){
    array(l[field],pre?4:limit,field);if(new Set(l[field]).size!==l[field].length)throw Error('功法配置重复');
    for(const id of l[field]){catalogKey(C.techniques,id,field);if(C.techniques[id].kind!==kind||!own(s.techniques,id))throw Error('配置了未学会或类型错误的功法');}}
  array(l.treasures,3,'灵宝配置');if(l.treasures.length!==3)throw Error('灵宝槽数错误');
  const seen=new Set();l.treasures.forEach((id,index)=>{if(id===null)return;catalogKey(C.treasures,id,'灵宝');if(!own(s.ownedTreasures,id)||seen.has(id))throw Error('灵宝未获得或重复装备');seen.add(id);
    if(!pre&&index>=u.treasureSlots)throw Error('灵宝槽未解锁');
    if(index===0&&C.treasures[id].kind!=='active'||index>0&&C.treasures[id].kind!=='passive')throw Error('灵宝槽类型无效');});
  array(l.pills,3,'携丹');if(new Set(l.pills).size!==l.pills.length)throw Error('重复携丹');for(const id of l.pills){catalogKey(C.recipes,id,'携丹');if(C.recipes[id].kind==='qi')throw Error('携带了非战斗丹药');}
}
function validClearKey(id){return typeof id==='string'&&id.length<=100&&/^[a-zA-Z0-9_:\-]+$/.test(id);}
function targetOk(id){if(id===null)return true;if(typeof id!=='string')return false;if(own(C.techniques,id))return C.techniques[id].rarity===5;if(own(C.treasures,id))return C.treasures[id].rarity===5;
  return slots.some(slot=>Object.keys(C.schools||{}).some(school=>id==='gear_'+school+'_'+slot));}
function validateAlchemy(s){
  if(s.alchemy===undefined)s.alchemy={nextId:1,jobs:[]};
  const a=object(s.alchemy,'炼丹队列');integer(a.nextId,1,CAP,'炼丹编号');
  if(Object.keys(a).some(k=>!['nextId','jobs'].includes(k)))throw Error('炼丹队列包含未知字段');
  const capacity=2+Math.floor(s.facilities.furnace/2);array(a.jobs,capacity,'炼丹队列');
  const ids=new Set();let active=0;
  for(const j of a.jobs){
    object(j,'炼丹计划');
    if(typeof j.id!=='string'||!/^a[1-9]\d{0,11}$/.test(j.id)||Number(j.id.slice(1))>=a.nextId||ids.has(j.id))throw Error('炼丹计划编号无效');
    ids.add(j.id);catalogKey(C.recipes,j.recipe,'炼丹丹方');const r=C.recipes[j.recipe];
    integer(j.count,1,100,'炼丹炉数');if(!routeOk(j.route))throw Error('炼丹路线无效');integer(j.routeTier,r.realm,5,'炼丹阶位');
    integer(j.createdAt,0,MAX_TIME,'炼丹创建时间');
    if(!['queued','control','ready'].includes(j.status))throw Error('炼丹状态无效');
    array(j.rhythm,3,'控火节律');if(j.rhythm.length!==3||j.rhythm.some(f=>!['low','medium','high'].includes(f)))throw Error('控火节律无效');
    integer(j.round,0,3,'控火轮次');integer(j.score,0,j.round,'控火得分');integer(j.bonus,0,20,'控火产量');
    array(j.choices,3,'控火操作');if(j.choices.length!==j.round||j.choices.some(f=>!['low','medium','high'].includes(f))||j.score!==j.choices.reduce((n,f,i)=>n+Number(f===j.rhythm[i]),0))throw Error('控火操作与得分不符');
    const cost=object(j.cost,'炼丹预付成本'),m=object(cost.materials,'炼丹预付药材');
    if(Object.keys(cost).some(k=>!['stones','materials'].includes(k)))throw Error('炼丹预付成本字段无效');
    integer(cost.stones,(r.stones||0)*j.count,(r.stones||0)*j.count,'炼丹预付灵石');
    if(Object.keys(m).length!==Object.keys(r.materials).length||Object.keys(m).some(k=>!own(r.materials,k)))throw Error('炼丹预付药材字段无效');
    for(const [id,n] of Object.entries(r.materials))integer(m[id],n*j.count,n*j.count,'炼丹预付药材');
    const ctrl=object(j.controlCost,'控火预付');
    if(Object.keys(ctrl).length!==1||!own(ctrl,'stones'))throw Error('控火预付字段无效');
    const expected=j.status==='queued'?0:10*j.count*(r.realm+1);
    integer(ctrl.stones,expected,expected,'控火预付灵石');
    if(j.status==='queued'&&(j.round!==0||j.score!==0||j.bonus!==0))throw Error('未控火计划进度无效');
    if(j.status==='control'){active++;if(j.round>2||j.bonus!==0)throw Error('控火中计划进度无效');}
    if(j.status==='ready'){
      const bonus=j.score<2?0:Math.max(1,Math.floor(j.count*(j.score===3?.2:.1)));
      if(j.round!==3||j.bonus!==bonus)throw Error('控火完成产量无效');
    }
  }
  if(active>1)throw Error('同时控火的炉数超过上限');
}
function validateV3(raw){
  if(raw.version!==3)throw Error('存档版本不兼容');const s=raw;
  integer(s.contentVersion,3,3,'内容版本');integer(s.revision,0,CAP,'事务序号');
  object(s.player,'player');integer(s.player.age,23,150,'成年角色年龄');if(typeof s.player.name!=='string'||!cleanText(s.player.name,16).trim())throw Error('道号无效');s.player.name=cleanText(s.player.name,16).trim();
  if(!routeOk(s.route))throw Error('修炼路线无效');object(s.paths,'双路线');
  for(const route of routes){const p=object(s.paths[route],route);integer(p.realm,0,5,'大境');integer(p.layer,1,10,'小层');integer(p.xp,0,xpNeeded(s,route),'修为');integer(p.reserve,0,CAP,'储备修为');}
  for(const key of ['stones','tickets','dust','nextUid'])integer(s[key],key==='nextUid'?1:0,CAP,key);
  object(s.materials,'materials');for(const id of materialIds)integer(s.materials[id]===undefined?(s.materials[id]=0):s.materials[id],0,CAP,id);for(const id of Object.keys(s.materials))if(!materialIds.includes(id))throw Error('未知材料 ID');
  object(s.pills,'pills');for(const [id,n] of Object.entries(s.pills)){catalogKey(C.recipes,id,'丹药');integer(n,0,CAP,'丹药数');}for(const id of Object.keys(C.recipes))if(!own(s.pills,id))s.pills[id]=0;
  object(s.techniques,'techniques');for(const [id,item] of Object.entries(s.techniques)){catalogKey(C.techniques,id,'功法');object(item,'功法记录');integer(item.level,1,20,'功法等级');integer(item.branch,0,2,'功法分支');integer(item.spent,0,CAP,'参悟投入');if(item.resetUsed===undefined)item.resetUsed=false;boolean(item.resetUsed,'重置记录');}
  object(s.fragments,'残页');for(const [id,n] of Object.entries(s.fragments)){if(id!=='universal')catalogKey(C.techniques,id,'残页');integer(n,0,CAP,'残页数量');}
  array(s.bag,300,'背包');if(s.rewardOverflow===undefined)s.rewardOverflow=[];array(s.rewardOverflow,1000,'待领取');
  const all=s.bag.concat(s.rewardOverflow),uids=new Set();for(const g of all){validateGear(g,'装备');if(uids.has(g.uid))throw Error('装备 UID 重复');uids.add(g.uid);const numeric=typeof g.uid==='number'?g.uid:Number(g.uid.slice(1));if(numeric>=s.nextUid)throw Error('装备编号与下次编号冲突');}
  object(s.equipped,'equipped');for(const slot of slots){const uid=s.equipped[slot];if(uid!==null){const g=s.bag.find(g=>g.uid===uid&&g.slot===slot);if(!g)throw Error('穿戴装备无效');}}
  object(s.slotLevels,'部位强化');for(const slot of slots)integer(s.slotLevels[slot],0,20,'部位强化');
  object(s.ownedTreasures,'灵宝');for(const [id,t] of Object.entries(s.ownedTreasures)){catalogKey(C.treasures,id,'灵宝');object(t,'灵宝记录');integer(t.level,1,20,'灵宝等级');integer(t.count,1,CAP,'灵宝数量');integer(t.awakening,0,5,'灵宝觉醒');}
  array(s.blueprints,100,'蓝图');if(new Set(s.blueprints).size!==s.blueprints.length)throw Error('蓝图重复');for(const id of s.blueprints){if(typeof id!=='string'||!Object.keys(C.schools).some(school=>id===school||slots.some(slot=>id==='gear_'+school+'_'+slot)))throw Error('蓝图 ID 无效');}
  object(s.loadouts,'loadouts');object(s.presets,'presets');for(const route of routes){validateLoadout(s,s.loadouts[route],route,false);array(s.presets[route],3,'预设');if(s.presets[route].length!==3)throw Error('预设槽错误');
    for(const p of s.presets[route])if(p){if(p.loadout){validateLoadout(s,p.loadout,route,true);object(p.equipped,'预设装备');for(const slot of slots){const uid=p.equipped[slot];if(uid!==null&&!s.bag.some(g=>g.uid===uid&&g.slot===slot))throw Error('预设使用不存在装备');}}else validateLoadout(s,p,route,true);}}
  object(s.facilities,'facilities');for(const id of ['field','furnace','forge','library','array'])integer(s.facilities[id],1,10,'设施');
  validateAlchemy(s);
  object(s.progress,'progress');for(const field of ['firstClears','sectTrials']){array(s.progress[field],1000,field);if(new Set(s.progress[field]).size!==s.progress[field].length)throw Error('首通重复');for(const id of s.progress[field])if(!validClearKey(id))throw Error('通关记录 ID 无效');}
  integer(s.progress.tower,0,60,'塔层');object(s.progress.stars,'三星');for(const [id,n] of Object.entries(s.progress.stars)){if(!validClearKey(id))throw Error('三星 ID 无效');integer(n,0,3,'星数');}
  object(s.progress.trialWins,'试炼');for(const [id,b] of Object.entries(s.progress.trialWins)){if(!/^(body|magic):[0-5]$/.test(id))throw Error('突破试炼 ID 无效');boolean(b,'试炼胜利');}
  for(const field of ['bossWins','dungeonWins']){object(s.progress[field],field);for(const [id,n] of Object.entries(s.progress[field])){if(!validClearKey(id))throw Error('挑战 ID 无效');integer(n,0,CAP,'胜利次数');}}
  object(s.progress.endingTrials,'终境试炼');for(const route of routes)boolean(s.progress.endingTrials[route],'终境记录');
  object(s.stats,'stats');for(const id of statIds)integer(s.stats[id],0,CAP,'统计 '+id);for(const [id,n] of Object.entries(s.stats)){if(!/^[a-zA-Z][a-zA-Z0-9_]{0,40}$/.test(id))throw Error('统计字段无效');integer(n,0,CAP,'统计 '+id);}
  object(s.sect,'sect');boolean(s.sect.joined,'宗门加入');if(s.sect.school!==null)catalogKey(C.schools,s.sect.school,'宗门');if(s.sect.joined&&!s.sect.school)throw Error('加入宗门缺少流派');integer(s.sect.contribution,0,CAP,'贡献');integer(s.sect.rank,0,10,'宗门等级');
  array(s.sect.claimed,100,'委托');for(const id of s.sect.claimed)if(!validClearKey(id))throw Error('委托 ID 无效');object(s.sect.taskCounts,'委托轮次');for(const [id,n] of Object.entries(s.sect.taskCounts)){if(!validClearKey(id))throw Error('委托 ID 无效');integer(n,0,CAP,'委托次数');}
  object(s.companions,'companions');for(const id of Object.keys(C.companions)){const r=object(s.companions[id],'伙伴');integer(r.affinity,0,100,'好感');boolean(r.bond,'结契');if(r.bond&&r.affinity<40)throw Error('结契关系无效');integer(r.cooldownUntil,0,MAX_TIME,'共修冷却');integer(r.lastTalkAt,-60000,MAX_TIME,'交谈时间');integer(r.questStep,0,4,'伙伴任务');}
  object(s.story,'story');integer(s.story.chapter,0,6,'章节');integer(s.story.mercy,0,6,'仁心');integer(s.story.truth,0,6,'求真');if(s.story.mercy+s.story.truth!==s.story.chapter)throw Error('剧情选择数错误');
  if(s.story.ending!==null){if(s.story.chapter!==6)throw Error('未完成剧情不能结局');const id=typeof s.story.ending==='string'?s.story.ending:s.story.ending.id;if(!['guardian','wanderer','teacher'].includes(id))throw Error('结局 ID 无效');}
  array(s.story.completed,6,'已完成章节');for(const id of s.story.completed)if(!table(C.chapters).some(c=>c.id===id))throw Error('章节 ID 无效');
  array(s.story.sideCompleted,18,'支线');for(const id of s.story.sideCompleted)if(!table(C.sidequests).some(q=>q.id===id))throw Error('支线 ID 无效');
  object(s.gacha,'gacha');integer(s.gacha.highPity,0,9,'橙保底');integer(s.gacha.redPity,0,79,'红保底');integer(s.gacha.total,0,CAP,'累计感应');boolean(s.gacha.fateGuarantee,'定向');if(!targetOk(s.gacha.target))throw Error('感应目标无效');
  array(s.gacha.history,200,'感应历史');for(const h of s.gacha.history){object(h,'感应记录');integer(h.at,0,MAX_TIME,'抽取时间');integer(h.rarity,0,5,'抽取品质');if(!['gear','equipment','treasure','technique','pill','material','materials'].includes(h.category))throw Error('抽取类别无效');
    if(h.category==='gear'||h.category==='equipment'){if(!targetOk(h.id)||!String(h.id).startsWith('gear_'))throw Error('历史装备 ID 无效');if(h.uid!==undefined)gearUid(h.uid);}else if(h.category==='treasure')catalogKey(C.treasures,h.id,'历史灵宝');else if(h.category==='technique')catalogKey(C.techniques,h.id,'历史功法');else if(h.category==='pill')catalogKey(C.recipes,h.id,'历史丹药');else if(!materialIds.includes(h.id))throw Error('历史材料 ID 无效');
    for(const field of ['highBefore','highAfter'])integer(h[field],0,9,field);for(const field of ['redBefore','redAfter'])integer(h[field],0,79,field);boolean(h.fateBefore,'定向前');boolean(h.fateAfter,'定向后');integer(h.drawIndex,1,CAP,'抽取序号');if(!targetOk(h.target))throw Error('历史目标无效');}
  object(s.rngStreams,'随机流');for(const id of ['gacha','loot','world'])integer(s.rngStreams[id],0,4294967295,'随机流 '+id);
  integer(s.lastAt,0,MAX_TIME,'lastAt');integer(s.carryMs,0,TICK-1,'修为余时');integer(s.productionCarryMs,0,PRODUCTION-1,'生产余时');integer(s.wisdomCarryMs,0,DAY-1,'悟道余时');integer(s.wisdomTickets,0,7,'悟道券');integer(s.sweepMs,0,SWEEP_CAP,'扫荡储备');
  if(s.wisdomTickets===7&&s.wisdomCarryMs!==0)throw Error('悟道储藏超限');boolean(s.autoSmall,'自动小层');boolean(s.training,'修炼开关');
  if(s.productionRemainders===undefined)s.productionRemainders={stones:0,herb:0,ore:0,lotus:0,insight:0,essence:0};object(s.productionRemainders,'生产余量');for(const id of ['stones','herb','ore','lotus','insight','essence'])number(s.productionRemainders[id],0,.999999999999,'生产余量');
  array(s.logs,60,'日志');for(const l of s.logs){object(l,'日志');integer(l.at,0,MAX_TIME,'日志时间');if(typeof l.text!=='string'||l.text.length>360)throw Error('日志文字无效');l.text=cleanText(l.text,360);}
  object(s.migrationCompensation,'传承补偿');for(const route of routes){object(s.migrationCompensation[route],'传承补偿');for(const key of ['attack','defense','maxHp'])integer(s.migrationCompensation[route][key],0,CAP,'传承属性');}
  if(s.joint!==null){const j=object(s.joint,'共修');catalogKey(C.companions,j.companion,'共修伙伴');if(!s.companions[j.companion].bond||s.companions[j.companion].affinity<55)throw Error('共修关系不足');integer(j.round,0,2,'共修轮次');integer(j.score,j.round,j.round*3,'共修得分');array(j.techniques,3,'共修功法');if(j.techniques.length!==3)throw Error('共修功法数');for(const id of j.techniques)catalogKey(C.techniques,id,'共修功法');array(j.rhythm,3,'共修节律');if(j.rhythm.length!==3||j.rhythm.some(x=>!['sun','moon','star'].includes(x)))throw Error('共修节律无效');if(j.route!==undefined&&!routeOk(j.route))throw Error('共修路线无效');}
  validateBattle(s);validateExploration(s);
  if(s.rerollPending!==null&&s.rerollPending!==undefined){const p=object(s.rerollPending,'待选词条');if(!s.bag.some(g=>g.uid===p.uid))throw Error('洗炼装备不存在');const affixes=p.affixes||p.newAffixes;array(affixes,4,'待选词条');for(const f of affixes){if(!affixIds.includes(f.id))throw Error('待选词条 ID');number(f.value,0,50000,'待选词条值');}}
  return s;
}
function validateBattle(s){
  if(s.battle===null)return;const b=object(s.battle,'battle');catalogKey(C.dungeons,b.id,'战斗副本');if(!routeOk(b.route)||b.route!==s.route)throw Error('战斗路线无效');
  integer(b.tier,0,5,'战斗阶位');integer(b.difficulty,0,2,'战斗难度');number(b.time,0,36000,'战斗时间');boolean(b.paused,'战术暂停');boolean(b.auto,'自动战斗');integer(b.target,0,11,'战斗目标');
  const p=object(b.player,'战斗角色');for(const key of ['hp','maxHp','mp','maxMp','shield','attack','defense'])number(p[key],0,CAP,'战斗角色 '+key);if(p.maxHp<1||p.maxMp<1||p.hp>p.maxHp||p.mp>p.maxMp)throw Error('战斗气血真元无效');
  array(p.statuses,80,'玩家状态');array(b.enemies,12,'敌人');if(b.enemies.length<1||b.target>=b.enemies.length)throw Error('敌人列表无效');
  for(const e of b.enemies){object(e,'敌人');for(const key of ['hp','maxHp','attack','defense','shield'])number(e[key],0,CAP,'敌人 '+key);if(e.maxHp<1||e.hp>e.maxHp)throw Error('敌人气血无效');boolean(e.dead,'敌人生死');array(e.statuses,80,'敌人状态');
    if(e.bossIndex!==undefined&&e.bossIndex!==null)integer(e.bossIndex,0,11,'妖王');if(e.casting!==null&&e.casting!==undefined){const cast=object(e.casting,'读条');number(cast.remaining,0,3600,'读条时间');number(cast.duration,0,3600,'读条长度');boolean(cast.interruptible,'打断状态');}}
  object(b.cooldowns,'冷却');for(const [id,n] of Object.entries(b.cooldowns)){catalogKey(C.techniques,id,'神通冷却');number(n,0,3600,'冷却');}
  for(const key of ['treasureCooldown','potionCooldown','attackTimer','accumulator'])number(b[key],0,3600,'战斗 '+key);
  if(b.rng!==undefined)integer(b.rng,0,4294967295,'战斗随机流');
  array(b.queue,80,'战斗行动');array(b.log,100,'战斗日志');
  if(b.lastSkill!==null&&b.lastSkill!==undefined)catalogKey(C.techniques,b.lastSkill,'上一神通');
}
function validateExploration(s){
  if(s.exploration===null)return;const e=object(s.exploration,'exploration');catalogKey(C.dungeons,e.id,'洞天');if(C.dungeons[e.id].type!=='cave'||!routeOk(e.route)||e.route!==s.route)throw Error('洞天路线无效');
  integer(e.tier,0,5,'洞天阶位');integer(e.difficulty,0,2,'洞天难度');integer(e.total,1,12,'洞天节点数');integer(e.node,0,e.total,'洞天节点');
  boolean(e.awaiting,'路线选择');if(!['choosing','battle','cleared'].includes(e.status))throw Error('洞天状态无效');integer(e.seed,0,4294967295,'洞天随机流');array(e.choices,6,'洞天选项');array(e.history,20,'洞天记录');
  for(const field of ['pending','banked']){const r=object(e[field],'洞天奖励');for(const key of ['stones','xp'])if(own(r,key))integer(r[key],0,CAP,'洞天奖励');if(r.materials)for(const [id,n] of Object.entries(r.materials)){if(!materialIds.includes(id))throw Error('洞天材料 ID');integer(n,0,CAP,'洞天材料');}if(r.fragments)for(const [id,n] of Object.entries(r.fragments)){if(id!=='universal')catalogKey(C.techniques,id,'洞天残页');integer(n,0,CAP,'洞天残页');}}
}
function oldAttributes(v,route){
  const p=v.paths[route],body=route==='body';let attack=(body?18:22)+p.realm*(body?15:19)+v.techniques[body?'sword':'thunder']*(body?2:3),defense=(body?8:5)+p.realm*(body?6:4)+v.techniques.guard*2,maxHp=(body?140:110)+p.realm*(body?75:60)+v.techniques.breath*5;
  const mult=[1,1.45,2.15,3.2];for(const slot of ['weapon','armor','charm']){const g=v.bag.find(g=>g.uid===v.equipped[slot]);if(!g)continue;const m=mult[g.rarity]*(1+g.level*.12);
    attack+=Math.floor((slot==='weapon'?7+g.tier*3:slot==='charm'?2+g.tier*2:0)*m);
    defense+=Math.floor((slot==='armor'?2+g.tier:slot==='charm'?1+g.tier:0)*m);
    maxHp+=Math.floor((slot==='armor'?14+g.tier*11:slot==='charm'?8+g.tier*7:0)*m);}
  defense+=Object.values(v.companions).filter(c=>c.bond).length*2;attack+=v.sect.rank*2;defense+=v.sect.rank;maxHp+=v.sect.rank*10;return {attack,defense,maxHp};
}
function legacyPlayer(p){object(p,'旧角色');integer(p.age,23,150,'旧角色年龄');if(typeof p.name!=='string'||!cleanText(p.name,16).trim())throw Error('旧道号无效');return {name:cleanText(p.name,16).trim(),age:p.age};}
function validateLegacyV2(v){
  object(v,'旧存档');legacyPlayer(v.player);integer(v.lastAt,0,MAX_TIME,'旧结算时间');if(!routeOk(v.route))throw Error('旧路线无效');object(v.paths,'旧路线');for(const r of routes){object(v.paths[r],'旧路线');integer(v.paths[r].realm,0,5,'旧境界');integer(v.paths[r].xp,0,CAP,'旧修为');}
  integer(v.stones,0,CAP,'旧灵石');object(v.materials,'旧材料');for(const id of ['herb','ore','lotus'])integer(v.materials[id],0,CAP,'旧材料');object(v.pills,'旧丹药');for(const id of ['heal','qi','breakthrough'])integer(v.pills[id],0,CAP,'旧丹药');
  object(v.techniques,'旧功法');for(const id of ['sword','breath','thunder','guard'])integer(v.techniques[id],1,15,'旧功法');
  array(v.activeSkills,2,'旧神通');if(v.activeSkills.length!==2||new Set(v.activeSkills).size!==2||v.activeSkills.some(id=>!['sword','breath','thunder','guard'].includes(id)))throw Error('旧神通配置错误');
  array(v.bag,80,'旧背包');const used=new Set();for(const g of v.bag){object(g,'旧装备');gearUid(g.uid);if(used.has(g.uid)||!['weapon','armor','charm'].includes(g.slot))throw Error('旧装备无效');used.add(g.uid);integer(g.rarity,0,3,'旧品质');integer(g.tier,1,25,'旧阶位');integer(g.level,0,10,'旧强化');}
  object(v.equipped,'旧穿戴');for(const slot of ['weapon','armor','charm'])if(v.equipped[slot]!==null&&!v.bag.some(g=>g.uid===v.equipped[slot]&&g.slot===slot))throw Error('旧穿戴无效');
  integer(v.nextUid,1,CAP,'旧装备编号');for(const g of v.bag)if(Number(String(g.uid).replace(/^g/,''))>=v.nextUid)throw Error('旧装备编号冲突');
  object(v.facilities,'旧设施');for(const id of ['field','mine','array'])integer(v.facilities[id],1,10,'旧设施');
  object(v.stats,'旧统计');for(const id of ['kills','bosses','crafted','breakthroughs','gifts','joints','gearDrops','failed'])integer(v.stats[id],0,CAP,'旧统计');
  object(v.companions,'旧关系');for(const id of Object.keys(C.companions)){const r=object(v.companions[id],'旧关系');integer(r.affinity,0,100,'旧好感');boolean(r.bond,'旧结契');if(r.bond&&r.affinity<40)throw Error('旧关系无效');integer(r.cooldownUntil,0,MAX_TIME,'旧冷却');integer(r.lastTalkAt,-60000,MAX_TIME,'旧交谈');}
  object(v.sect,'旧宗门');boolean(v.sect.joined,'旧宗门');integer(v.sect.contribution,0,CAP,'旧贡献');integer(v.sect.rank,0,10,'旧宗门级别');
  object(v.story,'旧剧情');integer(v.story.chapter,0,6,'旧章节');integer(v.story.mercy,0,6,'旧仁心');integer(v.story.truth,0,6,'旧求真');if(v.story.mercy+v.story.truth!==v.story.chapter)throw Error('旧剧情选择错误');
  if(v.story.ending!==null){if(v.story.chapter!==6||!v.story.ending||!['guardian','wanderer','teacher'].includes(v.story.ending.id))throw Error('旧结局无效');}
  integer(v.stage,1,200,'旧关卡');integer(v.bestStage,0,200,'旧通关');integer(v.totalTicks,0,CAP,'旧总轮数');integer(v.productionTicks,0,199,'旧生产轮数');integer(v.carryMs,0,TICK-1,'旧余时');integer(v.seed,0,4294967295,'旧种子');boolean(v.auto,'旧自动');boolean(v.training,'旧修行');
  if(v.joint!==null){const j=object(v.joint,'旧共修');catalogKey(C.companions,j.companion,'旧共修伙伴');integer(j.round,0,2,'旧共修轮次');integer(j.score,j.round,j.round*3,'旧共修得分');array(j.techniques,3,'旧共修功法');if(j.techniques.length!==3||j.techniques.some(id=>!own(v.techniques,id)))throw Error('旧共修功法无效');array(j.rhythm,3,'旧共修节律');if(j.rhythm.length!==3||j.rhythm.some(x=>!['sun','moon','star'].includes(x)))throw Error('旧共修节律无效');}
  return v;
}
function migrateV2(v,from){
  validateLegacyV2(v);const s=createState(v.lastAt),mapping={sword:'sword_skill_0',breath:'array_skill_0',thunder:'thunder_skill_0',guard:'body_skill_1'},quality=[0,1,3,4],before={body:oldAttributes(v,'body'),magic:oldAttributes(v,'magic')};
  s.player=legacyPlayer(v.player);s.route=v.route;s.stones=v.stones;s.training=v.training;s.carryMs=v.carryMs;
  for(const route of routes)s.paths[route]={realm:v.paths[route].realm,layer:1,xp:0,reserve:v.paths[route].xp};
  for(const id of ['herb','ore','lotus'])s.materials[id]=v.materials[id];
  s.pills.heal0=v.pills.heal;s.pills.qi0=v.pills.qi;s.pills.break0=v.pills.breakthrough;
  s.facilities.field=v.facilities.field;s.facilities.forge=v.facilities.mine;s.facilities.array=v.facilities.array;
  s.legacyTechniques=Object.assign({},v.techniques);
  for(const [old,id] of Object.entries(mapping))s.techniques[id]={level:v.techniques[old],branch:0,spent:0,resetUsed:false};
  for(const route of routes){s.loadouts[route].skills=v.activeSkills.map(id=>mapping[id]);}
  s.bag=v.bag.map(g=>({uid:g.uid,slot:g.slot,rarity:quality[g.rarity],tier:Math.min(5,Math.floor((g.tier-1)/4)),set:g.slot==='armor'?'body':g.slot==='weapon'?'sword':'array',affixes:[],special:null,awakening:0,locked:false,rerolls:0,targetMisses:0,targetId:null,legacy:{tier:g.tier,level:g.level}}));
  s.equipped=Object.assign({},s.equipped,v.equipped);s.nextUid=v.nextUid;
  const refund={stones:0,ore:0};
  function invested(g){let stones=0,ore=0;for(let l=0;l<g.level;l++){stones+=Math.floor((20+l*15)*(1+g.rarity*.5));ore+=2+Math.floor(l/3);}return {stones,ore};}
  for(const slot of ['weapon','armor','charm']){const gs=v.bag.filter(g=>g.slot===slot),best=gs.reduce((a,g)=>!a||g.level>a.level?g:a,null);s.slotLevels[slot]=best?best.level:0;for(const g of gs)if(g!==best){const q=invested(g);refund.stones+=q.stones;refund.ore+=q.ore;}}
  add(s,'stones',refund.stones);add(s.materials,'ore',refund.ore);
  for(const id of statIds)if(own(v.stats,id))s.stats[id]=v.stats[id];
  s.sect.joined=v.sect.joined;s.sect.school=v.sect.joined?'sword':null;s.sect.contribution=v.sect.contribution;s.sect.rank=v.sect.rank;
  for(const id of Object.keys(C.companions))s.companions[id]=Object.assign({},v.companions[id],{questStep:0});
  s.story=Object.assign({},s.story,v.story);s.story.completed=table(C.chapters).filter((c,i)=>i<s.story.chapter).map(c=>c.id);s.story.sideCompleted=[];
  s.joint=v.joint?Object.assign({},v.joint,{techniques:v.joint.techniques.map(id=>mapping[id]),route:v.route,cost:{stones:30,materials:{herb:2}}}):null;
  s.rngStreams={gacha:(v.seed^0x9e3779b9)>>>0,loot:v.seed>>>0,world:(v.seed^0xc2b2ae35)>>>0};
  s.legacyProgress={stage:v.stage,bestStage:v.bestStage,totalTicks:v.totalTicks,productionTicks:v.productionTicks,auto:v.auto,battle:v.battle||null};
  const notes=['旧修为完整保存在储备；晋级时自动释放。','原三部位映射保留，最高强化转为部位强化；其余重复投入返还。'];
  if(v.battle)notes.push('旧版即时战斗已安全结束，原记录保留，可在新历练重新挑战。');
  for(const route of routes){const a=attributes(s,route);for(const key of ['attack','defense','maxHp'])s.migrationCompensation[route][key]=Math.max(0,before[route][key]-a[key]);}
  s.migrationReport={from:from||2,to:3,qualityMap:{0:0,1:1,2:3,3:4},preserved:{gearCount:s.bag.length,chapter:s.story.chapter,jointActive:!!s.joint,resources:true,relationships:true},
    refunded:refund,attributes:Object.fromEntries(routes.map(r=>[r,{before:before[r],after:{attack:attributes(s,r).attack,defense:attributes(s,r).defense,maxHp:attributes(s,r).maxHp},compensation:s.migrationCompensation[r]}])),notes};
  s.logs=[];log(s,'传承完成：原境界、修为、装备、强化、剧情和道侣关系均保留。详细变化见迁移报告。',s.lastAt);
  return s;
}
function migrateV1(raw){
  const last=integer(raw.lastTick,0,MAX_TIME,'旧结算'),realm=integer(raw.realm,0,5,'旧境界'),xp=integer(raw.xp,0,CAP,'旧修为'),player=legacyPlayer(raw.player);
  object(raw.inventory,'旧物品');object(raw.techniques,'旧功法');object(raw.relations,'旧关系');object(raw.story,'旧剧情');object(raw.stats,'旧统计');object(raw.stats.wins,'旧胜利');
  const oldDay=integer(raw.day,1,1000000,'旧天数'),oldNeeds=[90,180,300,440,620,1],newNeeds=[360,900,2000,4200,8500,0];
  const map={wood_sword:['weapon',0,1],cloth_robe:['armor',0,1],iron_sword:['weapon',1,2],silver_robe:['armor',1,3],lake_blade:['weapon',2,4],water_seal:['charm',2,4],mirror_robe:['armor',2,6],star_blade:['weapon',3,8],dawn_seal:['charm',3,10]};
  array(raw.gear,120,'旧装备');object(raw.equipment,'旧穿戴');const seen=new Set();
  const bag=raw.gear.map(g=>{object(g,'旧装备');gearUid(g.uid);if(seen.has(g.uid)||!own(map,g.id))throw Error('旧装备 ID 无效');seen.add(g.uid);const [slot,rarity,tier]=map[g.id];return {uid:g.uid,slot,rarity,tier,level:integer(g.level,0,10,'旧强化')};});
  const wearing=[raw.equipment.weapon,raw.equipment.armor,raw.equipment.talisman];bag.sort((a,b)=>Number(wearing.includes(b.uid))-Number(wearing.includes(a.uid)));
  if(bag.length>80)throw Error('旧背包超过可安全迁移容量，请先整理旧版背包');
  const companions={};for(const id of Object.keys(C.companions)){const r=object(raw.relations[id],'旧关系');companions[id]={affinity:integer(r.affinity,0,100,'旧好感'),bond:boolean(r.bond,'旧結契'),cooldownUntil:Math.min(MAX_TIME,last+Math.max(0,integer(r.cooldown,0,1000000,'旧冷却')-oldDay)*1800000),lastTalkAt:r.lastTalkAt===undefined?-60000:integer(r.lastTalkAt,-60000,MAX_TIME,'旧交谈')};}
  const chapter=integer(raw.story.chapter,0,6,'旧章节'),mercy=integer(raw.story.mercy===undefined?chapter:raw.story.mercy,0,chapter,'旧仁心');
  const kills=Math.min(CAP,['mist','lake','ruin','summit'].reduce((n,id)=>n+integer(raw.stats.wins[id],0,CAP,'旧胜利'),0)),bestStage=Math.min(200,Math.max(realm*15,kills?5:0));
  const v={version:2,lastAt:last,player,route:'magic',paths:{body:{realm:0,xp:0},magic:{realm,xp:Math.min(CAP,Math.floor(xp*(realm===5?10:newNeeds[realm]/oldNeeds[realm])))}},
    stones:integer(raw.stones,0,CAP,'旧灵石'),materials:{},pills:{},techniques:{sword:integer(raw.techniques.sword,1,15,'旧剑诀'),breath:integer(raw.techniques.breath,1,15,'旧吐纳'),thunder:raw.techniques.sword,guard:integer(raw.techniques.harmony,1,15,'旧同心')},
    activeSkills:['sword','breath'],bag,equipped:{weapon:null,armor:null,charm:null},nextUid:Math.max(3,...bag.map(g=>Number(String(g.uid).replace(/^g/,''))+1)),facilities:{field:1,mine:1,array:1},
    companions,stats:{kills,bosses:Math.max(Math.floor(bestStage/5),Math.floor(kills/5)),crafted:integer(raw.stats.crafted,0,CAP,'旧炼丹'),breakthroughs:realm,gifts:0,joints:integer(raw.stats.jointSessions,0,CAP,'旧共修'),gearDrops:0,failed:0},
    story:{chapter,mercy,truth:chapter-mercy,ending:raw.story.ending||null},sect:{joined:chapter>=3,contribution:chapter>=3?chapter*25:0,rank:chapter>=3?Math.floor(chapter*25/100):0},
    stage:Math.min(200,bestStage+1),bestStage,totalTicks:oldDay*20,productionTicks:0,carryMs:0,seed:(last>>>0)||1,auto:true,training:true,joint:null,battle:null};
  for(const id of ['herb','ore','lotus'])v.materials[id]=integer(raw.inventory[id],0,CAP,'旧材料');for(const id of ['heal','qi','breakthrough'])v.pills[id]=integer(raw.inventory[id],0,CAP,'旧丹药');
  for(const slot of ['weapon','armor','charm']){const uid=raw.equipment[slot==='charm'?'talisman':slot];if(uid!==null&&uid!==undefined){if(!bag.some(g=>g.uid===uid&&g.slot===slot))throw Error('旧装备穿戴无效');v.equipped[slot]=uid;}}
  return migrateV2(v,1);
}
function utf8Length(value){let bytes=0;for(let i=0;i<value.length;i++){const c=value.charCodeAt(i);if(c<128)bytes++;else if(c<2048)bytes+=2;else if(c>=0xd800&&c<=0xdbff&&i+1<value.length&&value.charCodeAt(i+1)>=0xdc00&&value.charCodeAt(i+1)<=0xdfff){bytes+=4;i++;}else bytes+=3;if(bytes>1048576)return bytes;}return bytes;}
function validate(raw){
  let migrated=false;
  try{
    if(typeof raw==='string'){if(utf8Length(raw)>1048576)throw Error('存档超过 1 MiB');try{raw=JSON.parse(raw);}catch(e){throw Error('存档不是有效 JSON');}}
    else{object(raw,'root');let serialized;try{serialized=JSON.stringify(raw);}catch(e){throw Error('存档无法序列化');}if(utf8Length(serialized)>1048576)throw Error('存档超过 1 MiB');raw=JSON.parse(serialized);}
    raw=safeJson(raw);object(raw,'root');
    let state;if(raw.version===1){state=migrateV1(raw);migrated=true;}else if(raw.version===2){state=migrateV2(raw,2);migrated=true;}else state=raw;
    state=validateV3(state);return {ok:true,state,migrated,error:null,migrationReport:state.migrationReport||null};
  }catch(e){return {ok:false,state:null,migrated:false,error:cleanText(e.message,200)};}
}
return {catalog:C,createState,validate,attributes,view,rng,add,log,spend,grant,pathRank,maxRank,unlocks,xpNeeded,addXp,levelUp,advance,gearStats,gearName,protectedGear,realmLabel,trainingPerTick,CAP,cultivationCapMs:CULT_CAP,productionCapMs:PROD_CAP,sweepCapMs:SWEEP_CAP};
});
