(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./data.js'),require('./core.js'));
  else root.WendaoBuilds=factory(root.WendaoData,root.WendaoCore);
})(typeof globalThis!=='undefined'?globalThis:this,function(C,K){
'use strict';
const SLOT_KEYS=Object.keys(C.slots),SCHOOL_KEYS=Object.keys(C.schools);
const clone=v=>JSON.parse(JSON.stringify(v));
const own=(o,k)=>!!o&&Object.prototype.hasOwnProperty.call(o,k);
const PLAN_CACHE=new Map();
const schools={
  sword:{id:'sword',name:'破甲剑意',position:'单体爆发 · 破甲连击',description:'先破甲，再用普攻与连击积累剑意或破绽，把资源交给归一斩。',strengths:['持续命中同一目标','把爆发放在破甲窗口'],order:[0,1,2,3],goals:[0,1,3,2]},
  body:{id:'body',name:'震劲金身',position:'护盾承伤 · 打断反击',description:'以镇骨甲吸收伤害积累震劲，用回山震打断并反击；百炼心法则依靠受击战意强化伏岳掌的回复。',strengths:['抵挡蓄力重击','护盾与反击互相配合'],order:[1,0,2,3],goals:[1,0,2,3]},
  thunder:{id:'thunder',name:'雷印连锁',position:'叠印爆发 · 雷术打断',description:'引雷与五雷积印；九霄自动连锁，藏雷保留印记交给天罚，惊电步留给敌人读条。',strengths:['叠加雷印创造爆发','保留打断应对机制'],order:[0,2,3,1],goals:[0,1,3,2]},
  elements:{id:'elements',name:'五行轮转',position:'元素反应 · 群体控制',description:'青藤接火莲触发燃生，火莲接寒潮触发蒸腾，寒潮接青藤触发束缚；四象心法另可积累同元素专精。',strengths:['按顺序切换元素','持续灼烧与范围控制'],order:[0,1,2,3],goals:[0,1,2,3]},
  shadow:{id:'shadow',name:'双蚀玄冥',position:'持续侵蚀 · 消耗结算',description:'先挂蚀魄与幽火维持双重持续伤害；断魂结算剩余伤害，摄魂心法与噬影秘术强化消耗负面状态后的收益。',strengths:['持续伤害应对反射','双重负面后集中结算'],order:[0,1,2,3],goals:[0,1,2,3]},
  array:{id:'array',name:'丹阵长生',position:'治疗续航 · 净化布阵',description:'聚灵阵补真元，星罗阵持续伤敌，回春与净尘稳定气血；星罗心法可主动收阵，把蓄积时间转成爆发。',strengths:['长战斗回复与真元循环','净化机制与主动收阵'],order:[2,3,0,1],goals:[0,2,3,1]}
};
SCHOOL_KEYS.forEach(id=>{schools[id].schoolName=C.schools[id].name;});
const ROLE_ROWS={
  sword:[[['积剑意','暴击积层'],'普攻与暴击积剑意，交给归一斩消耗。',[3]],[['连续命中','同目标破绽'],'连续命中同一目标叠破绽，换目标会重置。',[0,1,3]],[['破甲','爆发前置'],'先施加破甲，再衔接剑术爆发。',[1,3]],[['三段连击','独立暴击'],'三次独立剑击，适合连续命中与暴击收益。',[0,3]],[['范围剑域','压低敌攻'],'持续范围剑伤，并降低敌人攻击。',[0,1]],[['消耗剑意','单体爆发'],'消耗剑意或破绽，在破甲窗口集中伤害。',[0,1]],[['暴击触发','下次穿防'],'暴击后强化下一次剑术的防御穿透。',[1,3]],[['蓄势','攻击增伤'],'停用攻击神通蓄势，强化下一门攻击神通。',[3]]],
  body:[[['护盾积劲','震劲反击'],'护盾吸收伤害积震劲，由回山震消耗。',[1,2]],[['承伤战意','满层回血'],'承受直接伤害积战意，满层伏岳掌回复气血。',[0,1]],[['打断','战意回血'],'攻击并打断读条，百炼满战意时回血。',[1,3]],[['气血护盾','震劲前置'],'以最大气血生成护盾，为震劲与破盾效果起势。',[2,0]],[['范围反击','群体打断'],'消耗震劲增强范围震荡并打断敌人。',[1]],[['治疗','直接减伤'],'回复气血，并短时降低直接伤害。',[1,0]],[['破盾触发','范围震荡'],'敌人击破护盾时触发范围反击。',[1]],[['受击回元','续航'],'承受直接伤害时补充真元。',[1,3]]],
  thunder:[[['三印连锁','自动引爆'],'雷术叠到三印时自动连锁引爆。',[0,1,2]],[['保留雷印','天罚蓄势'],'雷印保留到天罚，每层强化这一击。',[0,2,3]],[['雷印生成','穿防'],'施加雷印并穿透部分防御。',[2,3]],[['打断','短时闪避'],'打断敌人读条，同时补雷印与闪避。',[0,3]],[['五段雷击','多目标'],'五次雷击并增加两印，多个敌人时分配命中。',[0,3]],[['消耗雷印','叠印爆发'],'消耗目标全部雷印，叠印后释放。',[0,2]],[['雷印转移','清场'],'带印目标死亡时把印记传给另一个敌人。',[0,2]],[['交替雷术','追加雷击'],'连续使用不同雷术触发追加雷击。',[0,2,3]]],
  elements:[[['元素轮转','顺序反应'],'木→火→水→木，切换元素触发不同反应。',[0,1,2]],[['同元素专精','切换强化'],'重复元素积专精，切换时强化新元素。',[0,1,2]],[['木印束缚','打断'],'施加木印，束缚并打断，为火莲起势。',[1]],[['火印燃烧','持续伤害'],'施加火印与燃烧，承接木印或衔接寒潮。',[0,2]],[['水印群攻','降低攻频'],'范围水伤与减速，承接火印或衔接青藤。',[1,0]],[['土盾','元素重置'],'生成护盾并重置自身元素，让下一术重新起势。',[0,1,2]],[['反应回元','轮转续航'],'元素反应后恢复真元，需要合道心法与轮转。',[0,1,2]],[['不同反应','削弱抗性'],'连续不同反应削弱敌人元素抗性。',[0,1,2]]],
  shadow:[[['双重持续伤害','侵蚀叠层'],'同时维持侵蚀与燃魂，强化持续伤害。',[0,1]],[['消耗负面','附伤回元'],'消耗负面状态时追加伤害并恢复真元。',[0,1,2]],[['侵蚀叠层','持续伤害'],'施加可叠层侵蚀，与幽火形成双重负面。',[1,2]],[['燃魂','压低回复'],'施加燃魂与回复削弱，与侵蚀共同维持。',[0,2]],[['消耗双蚀','打断结算'],'消耗侵蚀与燃魂，结算一部分剩余持续伤害。',[0,1]],[['伤害吸血','压低敌攻'],'把造成的伤害转成回复，并降低敌人攻击。',[0,1]],[['自然结束','追加余伤'],'持续伤害自然结束时追加余伤，主动引爆不触发。',[0,1]],[['消耗负面','气血回复'],'主动消耗负面状态后回复最大气血。',[2]]],
  array:[[['阵内治疗','运行回元'],'阵法存在时提高治疗并持续补充真元。',[2,3,0]],[['主动收阵','蓄时爆发'],'重复施放已运行的阵法，把蓄积时间转为伤害或回复。',[2,3]],[['即时治疗','持续回复'],'立即回复气血，之后持续调养。',[2,1]],[['净化','气血回复'],'清除自身负面状态并回复气血。',[0,2]],[['真元回复阵','治疗增益'],'布阵持续补真元并提高回复效率。',[0,3]],[['范围伤害阵','收阵爆发'],'布阵持续伤敌，星罗心法可主动收阵。',[2,0]],[['净化后免疫','状态防护'],'成功净化后短时免疫刚清除的状态。',[1]],[['溢疗转盾','阵内续航'],'阵法存在时，把溢出治疗转为护盾。',[0,2,3]]]
};
function rowFor(t){return ROLE_ROWS[t.school][t.kind==='heart'?Number(t.id.slice(-1)):t.kind==='skill'?2+Number(t.id.slice(-1)):6+Number(t.id.slice(-1))];}
function techniqueRole(id,s){
  const t=C.techniques[id];if(!t)return null;const row=rowFor(t),build=schools[t.school],load=s&&s.loadouts[s.route],heart=load&&C.techniques[load.heart];
  const partners=row[2].map(n=>t.school+'_skill_'+n);
  const paired=t.kind==='heart'?partners.some(p=>load&&(load.skills||[]).includes(p)):heart&&heart.school===t.school;
  return {id,school:t.school,schoolName:C.schools[t.school].name,buildName:build.name,tags:row[0].slice(),role:row[1],reason:build.name+'：'+row[1],partners,recommended:!!(s&&own(s.techniques,id)&&available(s,t)&&paired)};
}
function available(s,item){const p=s.paths[s.route];return !!item&&item.realm<=p.realm&&(item.realm<p.realm||(item.layer||1)<=p.layer);}
function eligible(s,kind){return Object.keys(s.techniques).filter(id=>C.techniques[id]&&C.techniques[id].kind===kind&&available(s,C.techniques[id]));}
function simulated(s,equipped,loadout){return Object.assign({},s,{equipped,loadouts:Object.assign({},s.loadouts,{[s.route]:loadout})});}
function combinations(items,n){const out=[];function visit(at,list){if(list.length===n){out.push(list.slice());return;}for(let i=at;i<=items.length-(n-list.length);i++){list.push(items[i]);visit(i+1,list);list.pop();}}visit(0,[]);return out;}
function skillDetails(s,id,a){
  const t=C.techniques[id],r=t.rules||{},i=s.techniques[id]||{},level=i.level||1,m=K.techniqueEffects(s,id),branch=i.branch===1?.95:1;
  const cd=Math.max(.8,(t.cooldown||10)*(i.branch===1?.88:1)*m.cooldownMultiplier*(1-a.cooldownReduction));
  const direct=(t.power||0)*(1+(level-1)*.035)*m.effectMultiplier*m.powerMultiplier*branch;
  const support=(1+(level-1)*.02)*m.effectMultiplier*m.powerMultiplier;
  let directDamage=direct,dotDamage=0,healing=(r.heal||0)+(r.hot||0)*Math.floor((r.duration||0)/(r.interval||2));
  if(r.dot)dotDamage=(r.dotPower||0)*m.effectMultiplier*(r.duration||0)*(1+a.dotDamage);
  if(id==='sword_skill_2'){directDamage=0;dotDamage=(t.power||0)*(1+(level-1)*.035)*m.effectMultiplier*m.powerMultiplier*Math.floor((r.duration||10)/(r.interval||2))*(1+a.dotDamage);}
  // combat.starArray uses the catalogue power and branch only, not skillPower.
  if(id==='array_skill_3'){directDamage=0;dotDamage=(t.power||.35)*branch*Math.floor((r.duration||10)/(r.interval||2))*(1+a.dotDamage);}
  return {id,t,r,cd,directDamage,dotDamage,damage:directDamage+dotDamage,healing:healing*support,shield:(r.shield||0)*support*(1+(a.shieldPower||0)),cost:(t.mp||0)/cd};
}
// A deterministic comparison estimate, not a claim about every boss or the displayed power.
// Attributes come from core; conditional bonuses only count when the matching skills exist.
function assess(s,load,a){
  const d=load.skills.map(id=>skillDetails(s,id,a)),has=id=>load.skills.includes(id),h=load.heart,crit=1+Math.min(.65,a.crit)*(Math.min(2.8,a.critDamage)-1);
  let dmg=0,heal=0,shield=0,mana=0,utility=0,cost=0;
  d.forEach(x=>{dmg+=a.attack*(x.directDamage*crit+x.dotDamage)/x.cd;heal+=a.maxHp*x.healing*(1+a.healing)/x.cd;shield+=a.maxHp*x.shield/x.cd;cost+=x.cost;if(x.r.interrupt)utility+=a.attack*.14;if(x.r.root||x.r.slow||x.r.attackDown)utility+=a.attack*.08;if(x.r.reduction)utility+=a.maxHp*x.r.reduction*(x.r.duration||6)/x.cd*.12;if(x.r.purify)utility+=a.maxHp*.04;if(x.r.array==='spirit')mana+=(x.r.mp||5)*Math.floor((x.r.duration||10)/(x.r.interval||2))/x.cd;});
  const get=id=>d.find(x=>x.id===id),heartScale=h?K.techniqueEffects(s,h).effectMultiplier*K.techniqueEffects(s,h).powerMultiplier:1;
  if(h==='sword_heart_0'&&has('sword_skill_3'))dmg+=a.attack*.9*heartScale/get('sword_skill_3').cd;
  if(h==='sword_heart_1'&&d.some(x=>x.t.school==='sword'))dmg*=1+.12*heartScale;
  if(h==='body_heart_0'&&has('body_skill_1')&&has('body_skill_2'))dmg+=a.attack*.6*heartScale/get('body_skill_2').cd;
  if(h==='body_heart_1'&&has('body_skill_0'))heal+=a.maxHp*.1*heartScale/get('body_skill_0').cd;
  const markRate=d.filter(x=>x.t.school==='thunder').reduce((n,x)=>n+(x.r.marks||0)/x.cd,0);
  if(h==='thunder_heart_0')dmg+=a.attack*.7*heartScale*markRate/3;
  if(h==='thunder_heart_1'&&has('thunder_skill_3')&&markRate>0)dmg+=a.attack*.66*heartScale/get('thunder_skill_3').cd;
  const reactions=h==='elements_heart_0'&&d.filter(x=>['wood','fire','water'].includes(x.r.element)).length>=2;
  if(reactions)dmg+=a.attack*.45*heartScale/6;
  if(h==='elements_heart_1'&&d.filter(x=>x.r.element).length>=2)dmg+=a.attack*.15*heartScale/8;
  const doubleDot=has('shadow_skill_0')&&has('shadow_skill_1');
  if(h==='shadow_heart_0'&&doubleDot)dmg+=a.attack*(.18+.14)*.2*heartScale;
  if(has('shadow_skill_2')&&doubleDot){dmg+=a.attack*(.18+.14)*4/get('shadow_skill_2').cd;if(h==='shadow_heart_1'){dmg+=a.attack*.4*heartScale/get('shadow_skill_2').cd;mana+=8*heartScale/get('shadow_skill_2').cd;}}
  const arrays=d.some(x=>x.r.array);
  if(h==='array_heart_0'&&arrays){heal*=1+.15*heartScale;mana+=.5*heartScale;}
  if(h==='array_heart_1'&&has('array_skill_3'))dmg+=a.attack*1.8*heartScale/20;
  if((a.sets.sword||0)>=4&&has('sword_skill_0'))dmg+=d.filter(x=>x.t.school==='sword').reduce((n,x)=>n+a.attack*x.damage*crit/x.cd*.15*.55,0);
  if((a.sets.thunder||0)>=4&&has('thunder_skill_3')&&markRate>0)dmg+=a.attack*.4/get('thunder_skill_3').cd;
  if((a.sets.elements||0)>=4&&reactions&&has('elements_skill_1'))dmg+=a.attack*.12*2/get('elements_skill_1').cd;
  if((a.sets.body||0)>=4&&shield>0)utility+=a.maxHp*.12*.2;
  if((a.sets.array||0)>=4&&d.some(x=>x.r.purify)){mana+=5/14;utility+=heal*.08;}
  if((a.sets.shadow||0)>=4&&load.treasures[0])utility+=a.attack*a.dodge*.5;
  // Red mechanisms trigger from their own gear, independently of 2/4-piece counts.
  const red=a.redEffects||[],attackSkills=d.filter(x=>x.t.power>0);
  if(red.includes('sword')&&has('sword_skill_0')&&attackSkills.length)mana+=attackSkills.reduce((n,x)=>n+x.t.mp,0)/attackSkills.length*.5/16;
  if(red.includes('body')&&has('body_skill_1')&&has('body_skill_2'))dmg+=a.attack*.3/get('body_skill_2').cd;
  if(red.includes('thunder')&&has('thunder_skill_3')&&markRate>0){const thunder=d.filter(x=>x.t.school==='thunder');mana+=thunder.reduce((n,x)=>n+x.t.mp,0)/thunder.length*.3/get('thunder_skill_3').cd;}
  if(red.includes('elements')&&reactions)dmg+=a.attack*.3/18;
  if(red.includes('shadow')&&has('shadow_skill_3')&&d.some(x=>x.r.interrupt))heal+=a.attack*get('shadow_skill_3').damage*.35*.2/get('shadow_skill_3').cd;
  if(red.includes('array')&&arrays&&heal>0&&load.treasures[0])utility+=a.attack*.04;
  load.secrets.forEach(id=>{const m=K.techniqueEffects(s,id),scale=(1+((s.techniques[id]||{}).level-1)*.02)*m.effectMultiplier*m.powerMultiplier;
    if(id==='sword_secret_0'&&d.some(x=>x.t.school==='sword'))utility+=a.attack*a.crit*.15*scale*2;
    if(id==='sword_secret_1'&&d.some(x=>x.t.power>0))dmg+=a.attack*.25*scale/10;
    if(id==='body_secret_0'&&shield>0)dmg+=a.attack*.6*scale/16;
    if(id==='body_secret_1')mana+=5*scale/6;
    if(id==='thunder_secret_0'&&markRate>0)utility+=a.attack*.06*scale;
    if(id==='thunder_secret_1'&&d.filter(x=>x.t.school==='thunder').length>=2)dmg+=a.attack*.45*scale/8;
    if(id==='elements_secret_0'&&reactions)mana+=6*scale/6;
    if(id==='elements_secret_1'&&reactions)utility+=a.attack*.15*scale;
    if(id==='shadow_secret_0'&&d.some(x=>x.r.dot)&&!has('shadow_skill_2'))dmg+=a.attack*.4*scale/10;
    if(id==='shadow_secret_1'&&has('shadow_skill_2')&&doubleDot)heal+=a.maxHp*.08*scale/get('shadow_skill_2').cd;
    if(id==='array_secret_0'&&d.some(x=>x.r.purify))utility+=a.maxHp*.04*scale;
    if(id==='array_secret_1'&&arrays&&heal>0)shield+=heal*.35*scale*.35;
  });
  const manaFactor=cost?Math.min(1,(a.mpRegen+a.maxMp/30+mana)/cost):1;
  return Math.round(a.power+a.attack*(crit-1)*5+a.attack*a.penetration*2+a.maxHp*a.dodge+dmg*10*manaFactor+(heal*.7+shield*.45)*5*manaFactor+utility+Math.min(6,mana)*10);
}
function localGearScore(s,g,school){const a=K.gearStats(s,g),attack=a.attack||0,hp=a.maxHp||0;return attack*5+(a.defense||0)*4+hp+(a.crit||0)*s.paths[s.route].realm*140+(a.critDamage||0)*60+(a.penetration||0)*120+(a.cooldownReduction||0)*170+(a.dodge||0)*150+(a.mpRegen||0)*25+(a.healing||0)*(school==='array'?180:70);}
function gearCandidates(s,school){
  const realm=s.paths[s.route].realm,groups={},best={},current={};
  SLOT_KEYS.forEach(slot=>{groups[slot]={};const list=s.bag.filter(g=>g.slot===slot&&(g.tier<=realm||s.equipped[slot]===g.uid));let winner=null;
    list.forEach(g=>{const score=localGearScore(s,g,school),prior=groups[slot][g.set];if(!prior||score>localGearScore(s,prior,school)||score===localGearScore(s,prior,school)&&s.equipped[slot]===g.uid)groups[slot][g.set]=g;if(!winner||score>localGearScore(s,winner,school)||score===localGearScore(s,winner,school)&&s.equipped[slot]===g.uid)winner=g;});
    best[slot]=winner?winner.uid:null;current[slot]=s.bag.some(g=>g.uid===s.equipped[slot]&&g.slot===slot)?s.equipped[slot]:null;
  });
  const candidates=[],seen=new Set();function add(eq){const key=SLOT_KEYS.map(slot=>eq[slot]||'').join('|');if(!seen.has(key)){seen.add(key);candidates.push(Object.fromEntries(SLOT_KEYS.map(slot=>[slot,eq[slot]])));}}
  add(current);add(best);
  SCHOOL_KEYS.forEach(set=>{[2,4,6].forEach(count=>combinations(SLOT_KEYS,count).forEach(parts=>{if(parts.some(slot=>!groups[slot][set]))return;const eq=Object.assign({},best);parts.forEach(slot=>{eq[slot]=groups[slot][set].uid;});add(eq);}));});
  // Compare complete 4+2 builds as well as every partial set and independent single pieces.
  SCHOOL_KEYS.forEach(four=>SCHOOL_KEYS.forEach(two=>{if(four===two)return;combinations(SLOT_KEYS,4).forEach(parts=>{const other=SLOT_KEYS.filter(slot=>!parts.includes(slot));if(parts.some(slot=>!groups[slot][four])||other.some(slot=>!groups[slot][two]))return;const eq={};parts.forEach(slot=>{eq[slot]=groups[slot][four].uid;});other.forEach(slot=>{eq[slot]=groups[slot][two].uid;});add(eq);});}));
  return candidates;
}
function orderSkills(ids,school){const order=schools[school].order.map(n=>school+'_skill_'+n);return ids.slice().sort((a,b)=>{const ai=order.indexOf(a),bi=order.indexOf(b);return (ai<0?100:ai)-(bi<0?100:bi)||a.localeCompare(b);});}
function chooseSkills(s,school,heart,eq){
  const u=K.unlocks(s),original=s.loadouts[s.route],base={heart,skills:[],secrets:[],treasures:original.treasures.slice(),pills:original.pills.slice()},a=K.attributes(simulated(s,eq,base));
  const learned=eligible(s,'skill'),same=learned.filter(id=>C.techniques[id].school===school);
  const utility=['array_skill_0','body_skill_1','array_skill_1','body_skill_3','thunder_skill_1','sword_skill_0'].filter(id=>learned.includes(id));
  const others=learned.filter(id=>!same.includes(id)).sort((x,y)=>{const lx=skillDetails(s,x,a),ly=skillDetails(s,y,a);return (ly.damage+a.maxHp/a.attack*(ly.healing+ly.shield)*.3)/ly.cd-(lx.damage+a.maxHp/a.attack*(lx.healing+lx.shield)*.3)/lx.cd||x.localeCompare(y);});
  // Candidate membership is independent of the currently equipped skill bar.
  // Otherwise an initial bar can crowd a useful owned skill out of the ten slots,
  // then expose it only after applying the first recommendation.
  const pool=Array.from(new Set(same.concat(utility,others))).slice(0,10);
  const coreCount=Math.min(same.length,u.skillSlots>=4?3:u.skillSlots);
  const choices=combinations(pool,Math.min(u.skillSlots,pool.length)).filter(ids=>ids.filter(id=>same.includes(id)).length>=coreCount);
  const secrets=eligible(s,'secret').sort((a,b)=>Number(C.techniques[b].school===school)-Number(C.techniques[a].school===school)||Number(original.secrets.includes(b))-Number(original.secrets.includes(a))||a.localeCompare(b));
  let winner=base,best=-Infinity;
  choices.forEach(skills=>{const load=Object.assign({},base,{skills:orderSkills(skills,school)});let top=load,secretBest=-Infinity;
    // Secret effects depend on the skill bar. Compare each marginal gain, then choose
    // the second against the first; this avoids every pair for every skill bar.
    secretBest=assess(s,load,a);top=load;
    for(let slot=0;slot<u.secretSlots;slot++){
      let bestNext=top,bestScore=secretBest;
      secrets.forEach(id=>{if(top.secrets.includes(id))return;const next=Object.assign({},top,{secrets:top.secrets.concat(id)}),score=assess(s,next,a);if(score>bestScore){bestScore=score;bestNext=next;}});
      if(bestNext===top)break;top=bestNext;secretBest=bestScore;
    }
    // Identical estimates favor existing choices and then the requested school.
    const tie=skills.filter(id=>C.techniques[id].school===school).length*.01+skills.filter(id=>original.skills.includes(id)).length*.001;
    if(secretBest+tie>best){best=secretBest+tie;winner=top;}
  });return winner;
}
function bestGear(s,school,load,candidates){let eq=candidates[0],attributes=K.attributes(simulated(s,eq,load)),score=assess(s,load,attributes);candidates.slice(1).forEach(next=>{const a=K.attributes(simulated(s,next,load)),n=assess(s,load,a);if(n>score){score=n;eq=next;attributes=a;}});return {equipped:eq,loadout:load,after:attributes,scoreAfter:score};}
function optimizeSchool(s,school){
  const hearts=eligible(s,'heart'),matching=hearts.filter(id=>C.techniques[id].school===school),original=s.loadouts[s.route];
  const options=matching.length?matching:hearts.includes(original.heart)?[original.heart]:hearts.length?[hearts.slice().sort((a,b)=>s.techniques[b].level-s.techniques[a].level||a.localeCompare(b))[0]]:[null];
  const candidates=gearCandidates(s,school);let winner=null;
  options.forEach(heart=>{let load=chooseSkills(s,school,heart,s.equipped),candidate=bestGear(s,school,load,candidates);load=chooseSkills(s,school,heart,candidate.equipped);candidate=bestGear(s,school,load,candidates);if(!winner||candidate.scoreAfter>winner.scoreAfter)winner=candidate;});
  // Preserve an already effective mixed skill bar when it beats the generated template.
  const u=K.unlocks(s),safe=Object.assign({},original,{heart:hearts.includes(original.heart)?original.heart:null,skills:original.skills.filter(id=>eligible(s,'skill').includes(id)).slice(0,u.skillSlots),secrets:original.secrets.filter(id=>eligible(s,'secret').includes(id)).slice(0,u.secretSlots)});
  if(!matching.length||safe.heart&&C.techniques[safe.heart].school===school){const candidate=bestGear(s,school,safe,candidates);if(candidate.scoreAfter>=winner.scoreAfter)winner=candidate;}
  winner.school=school;return winner;
}
function sourceStatus(s,source){
  const requirements=[],rank=K.pathRank(s),u=K.unlocks(s),p=s.paths[s.route];
  if(source.type==='dungeon'){
    const d=C.dungeons[source.id];if(!d)return {available:false,requirements:['来源尚未开放']};
    const req=d.realm*10+(d.layer||1)-1;if(rank<req)requirements.push('需要'+C.routes[s.route].realmNames[d.realm]+(d.layer||1)+'层');
    if(d.type==='sect'&&!u.sect)requirements.push('五层开放宗门试炼');if(d.type==='cave'&&!u.cave)requirements.push('九层开放洞天探索');if(d.type==='tower'&&!u.tower)requirements.push('七层开放问道塔');
    if(source.floor){if(source.floor>s.progress.tower+1)requirements.push('先逐层推进到第'+source.floor+'层');if(Math.floor((source.floor-1)/10)>p.realm)requirements.push('当前路线境界尚未开放目标楼层');}
    if((d.type==='boss'||d.type==='cave')&&s.bag.length+(s.rewardOverflow||[]).length>=1300)requirements.push('先整理背包与奖励暂存');
  }else if(source.type==='forge'){
    if(source.rarity===5&&!s.blueprints.includes(source.id))requirements.push('道品需要'+C.sets[source.id].name+'蓝图');
  }else if(source.type==='sidequest'){
    const quest=(C.sidequests||[]).find(q=>q.id===source.id);if(!quest)return {available:false,requirements:['请在任务页查看获取条件']};
    (quest.requirements||[]).forEach(r=>{if(r.key==='rank'&&K.maxRank(s)<r.count)requirements.push(r.label);if(r.key==='dungeonWins'&&((s.progress.dungeonWins||{})[r.id]||0)<r.count)requirements.push(r.label);});
  }
  if(s.battle||s.exploration)requirements.push('先结束当前历练');return {available:requirements.length===0,requirements:Array.from(new Set(requirements))};
}
function techniqueSource(id){const t=C.techniques[id];let source=Object.assign({},t.source);if(source.type==='tutorial')source=Object.assign({},C.dungeons['sect_'+t.school+'_0'],{type:'dungeon',id:'sect_'+t.school+'_0',label:C.dungeons['sect_'+t.school+'_0'].name});if(source.id==='tower'){const floor=C.towerFloors.find(f=>(f.firstRewards.techniques||[]).includes(id));if(floor){source.floor=floor.floor;source.label='问道塔 · 第'+floor.floor+'层';}}return {type:source.type,id:source.id,label:source.label,...(source.floor?{floor:source.floor}:{})};}
function goalsFor(s,school,selected){
  const goals=[],sameHearts=eligible(s,'heart').filter(id=>C.techniques[id].school===school),ids=[];
  if(!sameHearts.length)ids.push(school+'_heart_0');
  schools[school].goals.forEach(n=>{const id=school+'_skill_'+n;if(!own(s.techniques,id))ids.push(id);});
  if(sameHearts.length&&!own(s.techniques,school+'_heart_1'))ids.push(school+'_heart_1');
  ids.forEach(id=>{const t=C.techniques[id],source=techniqueSource(id),status=sourceStatus(s,source),role=techniqueRole(id);goals.push({id,name:t.name,kind:t.kind,reason:role.role,source,available:status.available,requirements:status.requirements});});
  const count=selected.after.sets[school]||0;
  if(count<4){const source={type:'forge',id:school,rarity:3,label:'炼器台 · '+C.sets[school].name+'定向打造'},status=sourceStatus(s,source);goals.push({id:'set_'+school,name:C.sets[school].name+'四件套',kind:'set',reason:'目前穿戴'+count+'件；补到四件可激活：'+C.sets[school].fourEffect+' 非道品无需蓝图，材料齐备即可定向打造。',source,available:status.available,requirements:status.requirements});}
  const secretOrder=school==='shadow'&&selected.loadout.skills.includes('shadow_skill_2')?[1,0]:[0,1];
  secretOrder.forEach(n=>{const secret=school+'_secret_'+n;if(!own(s.techniques,secret)){const source=techniqueSource(secret),status=sourceStatus(s,source);goals.push({id:secret,name:C.techniques[secret].name,kind:'secret',reason:techniqueRole(secret).role,source,available:status.available,requirements:status.requirements});}});
  const cap=C.realms[s.paths[s.route].realm].techniqueCap;
  [selected.loadout.heart].concat(selected.loadout.skills,selected.loadout.secrets).filter(Boolean).forEach(id=>{
    const t=C.techniques[id],level=s.techniques[id].level;if(level>=cap)return;const next=[5,10,15,20].find(n=>n>level),target=Math.min(next,cap),cost={stones:80*(level+1)*(s.paths[s.route].realm+1),materials:{insight:2+level}};
    const requirements=[];if(s.stones<cost.stones)requirements.push('下一重需要'+cost.stones+'灵石');if(s.materials.insight<cost.materials.insight)requirements.push('下一重需要'+cost.materials.insight+'参悟');if(s.battle||s.exploration)requirements.push('先结束当前历练');
    const milestone=(t.milestones||[]).find(m=>m.level===target);
    goals.push({id:'upgrade_'+id,name:t.name+' · '+target+'重目标',kind:'upgrade',target,level,cost,reason:milestone?milestone.description:'提升功法等级，当前境界最高'+cap+'重；更高里程碑随境界开放。',source:{type:'upgrade',id,label:'参悟功法 · '+t.name},available:requirements.length===0,requirements});
  });
  if(!goals.length){const source=Object.assign({},C.sets[school].source),status=sourceStatus(s,source);goals.push({id:'challenge_'+school,name:'检验'+schools[school].name+'构筑',kind:'challenge',reason:'挑战本流派妖王，观察机制与施法时机，争取更高品质的套装掉落。',source,available:status.available,requirements:status.requirements});}
  return goals.sort((a,b)=>Number(b.available)-Number(a.available)).slice(0,4);
}
function describe(s,school,result){
  const set=C.sets[school],ownedSlots=SLOT_KEYS.filter(slot=>s.bag.some(g=>g.slot===slot&&g.set===school&&g.tier<=s.paths[s.route].realm)),heart=result.loadout.heart;
  let name=schools[school].name;if(heart==='thunder_heart_1')name='藏雷天罚';if(heart==='sword_heart_1')name='太清破绽';if(heart==='body_heart_1')name='百炼战意';if(heart==='shadow_heart_1')name='摄魂结算';if(heart==='array_heart_1')name='星罗收阵';if(heart==='elements_heart_1')name='四象专精';
  return Object.assign({},schools[school],{name,rotation:result.loadout.skills.map(id=>C.techniques[id].name),set:{id:school,name:set.name,twoEffect:set.twoEffect,fourEffect:set.fourEffect,count:result.after.sets[school]||0,ownedSlots,missingSlots:SLOT_KEYS.filter(slot=>!ownedSlots.includes(slot))}});
}
function cacheKey(s){return JSON.stringify([s.route,s.paths[s.route].realm,s.paths[s.route].layer,s.facilities,s.slotLevels,s.bag,s.equipped,s.loadouts[s.route],s.techniques,s.ownedTreasures,s.blueprints,s.migrationCompensation&&s.migrationCompensation[s.route],s.progress.tower,s.progress.dungeonWins,s.story.sideCompleted,(s.rewardOverflow||[]).length,!!s.battle,!!s.exploration,s.stones,s.materials.insight]);}
function packagePlan(s,result){
  const before=K.attributes(s),scoreBefore=assess(s,s.loadouts[s.route],before);
  const school=result.school,load=result.loadout,warnings=[];
  const detail=id=>{const t=C.techniques[id],role=techniqueRole(id,s);return {id,name:t.name,reason:role.role,tags:role.tags,school:t.school};};
  const gear=SLOT_KEYS.map(slot=>{const uid=result.equipped[slot],g=s.bag.find(item=>item.uid===uid),count=g?(result.after.sets[g.set]||0):0;return {slot,uid,name:g?K.gearName(g):'未装备',reason:g?(count>=4?C.sets[g.set].name+'四件套已激活，配合现有神通。':count>=2?C.sets[g.set].name+'两件套已激活。':'以当前境界的实际属性补足该部位。'):'背包中还没有这个部位的装备。'};});
  if(!load.heart||C.techniques[load.heart].school!==school)warnings.push('尚未学会本流派可用心法，当前推荐为已学功法组成的过渡构筑。');
  if(gear.some(row=>{const g=s.bag.find(item=>item.uid===row.uid);return g&&g.tier>s.paths[s.route].realm;}))warnings.push('保留的高阶装备按当前境界缩放属性；不会自动穿上新的高阶装备。');
  if(!load.skills.length)warnings.push('还没有可用神通，先修炼并通关宗门入门试炼。');
  // JSON key insertion order can differ between a 4+2 candidate and the validated
  // committed state. Compare actual slot identities and ordered skill bars instead.
  const current=s.loadouts[s.route],changed=SLOT_KEYS.some(slot=>result.equipped[slot]!==s.equipped[slot])||load.heart!==current.heart||['skills','secrets','treasures','pills'].some(field=>load[field].length!==current[field].length||load[field].some((id,index)=>id!==current[field][index]));
  const goals=goalsFor(s,school,result),summary=describe(s,school,result);
  return {school,route:s.route,equipped:Object.assign({},result.equipped),loadout:clone(load),gear,heart:load.heart?detail(load.heart):null,skills:load.skills.map(detail),secrets:load.secrets.map(detail),before,after:result.after,scoreBefore,scoreAfter:result.scoreAfter,scoreLabel:'构筑评估',powerDelta:result.after.power-before.power,changed,canUpgrade:changed&&result.scoreAfter>=scoreBefore,summary,goals,warnings,method:'比较已拥有的装备、两件/四件套、心法与神通配合；战力取真实属性，构筑评估用于综合推荐。具体妖王仍需调整打断、净化与施法时机。'};
}
function plan(s,requested){
  if(!s||!C.routes[s.route])throw Error('当前修炼路线无效');if(requested!==undefined&&requested!==null&&requested!=='auto'&&!own(schools,requested))throw Error('推荐流派不存在');
  const auto=!requested||requested==='auto',key=cacheKey(s),cache=PLAN_CACHE.get(key)||{plans:{},raw:{}};
  if(!PLAN_CACHE.has(key)){if(PLAN_CACHE.size>=8)PLAN_CACHE.delete(PLAN_CACHE.keys().next().value);PLAN_CACHE.set(key,cache);}
  const cacheId=auto?'auto':requested;if(cache.plans[cacheId])return clone(cache.plans[cacheId]);
  const schoolIds=auto?SCHOOL_KEYS:[requested],currentHeart=C.techniques[s.loadouts[s.route].heart];let result=null;
  const tie=next=>Number(!!currentHeart&&next.school===currentHeart.school)*100+next.loadout.skills.filter(id=>C.techniques[id].school===next.school).length*5+(next.after.sets[next.school]||0);
  schoolIds.forEach(school=>{const next=cache.raw[school]||optimizeSchool(s,school);cache.raw[school]=next;if(!cache.plans[school])cache.plans[school]=packagePlan(s,next);if(!result||next.scoreAfter>result.scoreAfter||next.scoreAfter===result.scoreAfter&&tie(next)>tie(result))result=next;});
  cache.plans[cacheId]=packagePlan(s,result);return clone(cache.plans[cacheId]);
}
function buildSummary(s,school){const p=plan(s,school);return Object.assign({},p.summary,{goals:p.goals,before:p.before,after:p.after,changed:p.changed,canUpgrade:p.canUpgrade,warnings:p.warnings});}
return {plan,buildSummary,techniqueRole,techniqueInfo:techniqueRole,schools,available};
});
