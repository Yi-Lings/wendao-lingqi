(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  else root.WendaoData=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const schools={
  sword:{id:'sword',name:'剑意',description:'积累剑意或破绽，在破甲窗口集中爆发。',iconSchool:'sword'},
  body:{id:'body',name:'金身',description:'以护盾和战意承受攻击，反击并维持气血。',iconSchool:'body'},
  thunder:{id:'thunder',name:'雷法',description:'叠加雷印，选择连锁或保留印记集中引爆。',iconSchool:'thunder'},
  elements:{id:'elements',name:'五行',description:'木火水土有顺序地轮转，触发燃生、蒸腾和冻结反应。',iconSchool:'elements'},
  shadow:{id:'shadow',name:'玄冥',description:'维持侵蚀和燃魂，或者消耗负面状态获得爆发。',iconSchool:'shadow'},
  array:{id:'array',name:'丹阵',description:'布阵回复和净化，以续航或主动收阵创造窗口。',iconSchool:'array'}
};
const routes={
 body:{id:'body',name:'炼体',description:'锤炼肉身，气血、防御与承伤能力较高。',realmNames:['炼体','锻骨','凝血','通脉','金身','破虚']},
 magic:{id:'magic',name:'修法',description:'凝练灵识，神通伤害与真元恢复较高。',realmNames:['炼气','筑基','金丹','元婴','化神','渡劫']}
};
const layerXp=[100,160,240,360,520,740,1000,1340,1740,2200];
const realmXpFactors=[1,3,8,20,50,125];
const realms=routes.magic.realmNames.map((name,id)=>({id,name,bodyName:routes.body.realmNames[id],layers:10,xpFactor:realmXpFactors[id],techniqueCap:[5,8,11,14,17,20][id],enhanceCap:[5,8,12,16,20,20][id]}));
const rarities=[
{id:0,name:'凡品',label:'白色',color:'#d1d5db',multiplier:1,affixCount:0},
{id:1,name:'灵品',label:'绿色',color:'#62ddaa',multiplier:1.1,affixCount:1},
{id:2,name:'玄品',label:'蓝色',color:'#61b9ff',multiplier:1.2,affixCount:1},
{id:3,name:'地品',label:'紫色',color:'#ba8cff',multiplier:1.35,affixCount:2},
{id:4,name:'天品',label:'橙色',color:'#ffbf65',multiplier:1.5,affixCount:3},
{id:5,name:'道品',label:'红色',color:'#ff6577',multiplier:1.65,affixCount:4}
];
const slots={weapon:'武器',armor:'衣甲',head:'冠',bracer:'护腕',boots:'靴',charm:'佩饰'};
const src=(type,id,label)=>({type,id,label});
const techniques={};
function technique(school,kind,index,name,rarity,realm,layer,description,mp,cooldown,power,rules,source){
 const id=school+'_'+kind+'_'+index;
 techniques[id]={id,name,kind,school,rarity,realm,layer,description,mp,cooldown,power,effect:id,rules:rules||{},source,maxLevel:20,
 iconSchool:school,artKey:'skill_'+school,milestones:[
 {level:5,name:'分支参悟',description:'五级开放凝练与通明分支，可在洞府免费切换。'},
 {level:10,name:'融会贯通',description:'十级自动强化：'+(kind==='skill'?'神通伤害、状态、回复与护盾效能提高10%。':kind==='heart'?'心法伤害、资源运转与回复效能提高10%。':'秘术伤害、状态与回复效能提高10%。')},
 {level:15,name:'圆融精进',description:'十五级自动强化：'+(kind==='skill'?'神通伤害再提高10%，冷却缩短10%。':'条件伤害与资源运转再提高10%，有间隔的触发周期缩短10%。')}
 ],branches:[
 {id:0,name:'凝练',description:'该功法基础效果随参悟等级强化，真元消耗不变。'},
 {id:1,name:'通明',description:kind==='heart'?'五重后选择：普攻运转间隔缩短12%，更快积累心法资源。':kind==='secret'?'五重后选择：有间隔的秘术触发间隔缩短12%。':'五重后选择：伤害或回复倍率降低5%，神通冷却缩短12%。'}
 ]};
}
const sectSource=(school,advanced)=>src('dungeon','sect_'+school+'_'+(advanced?1:0),(advanced?'宗门进阶':'宗门入门')+' · '+schools[school].name+'试炼');
const bossSource=(n)=>src('dungeon','boss_'+n,'妖王讨伐 · '+['青甲山君','赤莲妖后','雷渊蛟','镜湖玄龟','寒鸦真人','无相心魔','缚灵树王','双生影卫','熔炉傀儡','月蚀灵狐','玄河守将','天隙劫兽'][n]);

technique('sword','heart',0,'归一剑经',1,0,1,'普攻获得1剑意，暴击额外获得1；剑意最多5层。归一斩每消耗一层剑意提高18%伤害。',0,0,0,{resource:'swordIntent',cap:5,onBasic:1,onCrit:1,spendBonus:.18},sectSource('sword',false));
technique('sword','heart',1,'太清剑谱',5,1,1,'连续命中同一目标获得破绽，最多4层，每层使其受到剑术伤害提高6%；换目标时破绽重置，8秒未命中消失。',0,0,0,{resource:'opening',cap:4,bonus:.06,duration:8,resetOnTarget:true},sectSource('sword',true));
technique('sword','skill',0,'裂空剑',0,0,1,'斩击当前目标，造成135%攻击伤害，附加25%破甲8秒。适合在爆发前释放。',9,9,1.35,{armorBreak:.25,duration:8},sectSource('sword',false));
technique('sword','skill',1,'追影剑',2,0,3,'连续三次剑击，每次造成60%攻击伤害；每次独立判定暴击，命中同一目标。',12,11,1.8,{hits:3,hitPower:.6},sectSource('sword',false));
technique('sword','skill',2,'剑域',3,0,7,'展开剑域10秒，每2秒对所有敌人造成35%攻击伤害并降低其攻击8%；阵域不能重复叠加。',16,18,.35,{duration:10,interval:2,attackDown:.08,aoe:true},bossSource(4));
technique('sword','skill',3,'归一斩',4,1,1,'造成210%攻击伤害，消耗全部剑意获得额外倍率；太清心法下消耗破绽强化这一击。',20,16,2.1,{consume:'swordIntent',stackBonus:.18,openingBonus:.12},sectSource('sword',true));
technique('sword','secret',0,'破锋录',2,0,5,'暴击后，下一次剑术额外忽略15%防御；8秒内有效，触发间隔6秒。',0,0,0,{penetration:.15,duration:8,interval:6},sectSource('sword',false));
technique('sword','secret',1,'藏锋诀',4,1,4,'6秒未使用攻击神通，下一次攻击神通伤害提高25%；释放后重新蓄势。治疗与护盾不打断蓄势。',0,0,0,{chargeSeconds:6,bonus:.25,interval:6},src('dungeon','cave_0','洞天探索 · 云隐古府'));

technique('body','heart',0,'不动金身诀',0,0,1,'护盾吸收伤害时获得震劲，最多5层；回山震每层额外造成15%攻击伤害。',0,0,0,{resource:'quake',cap:5,absorbThreshold:.06,stackBonus:.15},sectSource('body',false));
technique('body','heart',1,'百炼回山经',4,1,1,'每承受直接伤害获得1战意，最多5层；满层时下一次伏岳掌消耗战意并回复10%最大气血。',0,0,0,{resource:'fightingSpirit',cap:5,heal:.1,interval:1},sectSource('body',true));
technique('body','skill',0,'伏岳掌',1,0,1,'造成160%攻击伤害，敌人正在施法时打断读条；百炼心法满战意时额外恢复气血。',10,10,1.6,{interrupt:true},sectSource('body',false));
technique('body','skill',1,'镇骨甲',0,0,1,'获得30%最大气血护盾，持续10秒；护盾取较高值，不重复叠加。',11,16,0,{shield:.3,duration:10},src('tutorial','start','初入洞府教学；金身入门试炼也可获得'));
technique('body','skill',2,'回山震',3,0,7,'震荡所有敌人，造成120%攻击伤害并打断；消耗震劲，每层提高15%攻击倍率。',16,15,1.2,{aoe:true,interrupt:true,consume:'quake',stackBonus:.15},bossSource(0));
technique('body','skill',3,'护命诀',2,1,1,'恢复20%最大气血，并获得25%减伤6秒；只减直接伤害，不能取消机制判定。',17,20,0,{heal:.2,reduction:.25,duration:6},sectSource('body',true));
technique('body','secret',0,'山骨秘录',1,0,5,'护盾被敌人击破时，向所有敌人释放60%攻击震荡；触发间隔8秒，主动收盾不触发。',0,0,0,{power:.6,interval:8,aoe:true},sectSource('body',false));
technique('body','secret',1,'归元篇',3,1,4,'承受直接伤害恢复5真元，每3秒最多触发一次；持续伤害不触发。',0,0,0,{mp:5,interval:3},bossSource(3));

technique('thunder','heart',0,'九霄雷经',1,0,1,'雷术命中附加雷印，最多5层；第三层触发70%攻击连锁雷击并消耗3层，不能连锁触发自身。',0,0,0,{resource:'thunderMark',cap:5,threshold:3,consume:3,power:.7,interval:1},src('tutorial','start','初入洞府教学；雷法入门试炼也可获得'));
technique('thunder','heart',1,'藏雷真解',5,1,1,'雷印不会自动引爆；天罚消耗雷印，每层额外增加22%攻击倍率，最多保留5层。',0,0,0,{resource:'thunderMark',cap:5,stackBonus:.22},sectSource('thunder',true));
technique('thunder','skill',0,'引雷诀',0,0,1,'雷击造成125%攻击伤害，忽略10%防御，并施加1层雷印。',8,8,1.25,{marks:1,penetration:.1},src('tutorial','start','初入洞府教学；雷法入门试炼也可获得'));
technique('thunder','skill',1,'惊电步',2,0,3,'打断目标施法，同时获得20%闪避5秒，并对目标造成70%攻击雷伤。',12,13,.7,{interrupt:true,dodge:.2,duration:5,marks:1},sectSource('thunder',false));
technique('thunder','skill',2,'五雷印',3,0,7,'连续五次雷击，每次35%攻击伤害，共增加2层雷印；存在多个敌人时依次分配命中。',16,14,1.75,{hits:5,hitPower:.35,marks:2,distributed:true},bossSource(2));
technique('thunder','skill',3,'天罚',4,1,1,'造成190%攻击雷伤，消耗目标全部雷印，每层提高22%攻击倍率；适合积印后爆发。',20,18,1.9,{consume:'thunderMark',stackBonus:.22},sectSource('thunder',true));
technique('thunder','secret',0,'导雷篇',2,0,5,'带雷印目标死亡时，把最多2层雷印传给另一存活敌人，触发间隔1秒。',0,0,0,{transferCap:2,interval:1},sectSource('thunder',false));
technique('thunder','secret',1,'余雷诀',4,1,4,'连续使用两种不同雷术，追加45%攻击雷击；触发间隔5秒，追加伤害不再次触发。',0,0,0,{differentCasts:2,power:.45,interval:5},src('dungeon','tower','问道塔 · 雷霄主题里程碑'));

technique('elements','heart',0,'五行合道经',1,0,1,'8秒内切换元素触发反应：木转火造成燃生附伤，火转水造成蒸腾，水转木束缚；每次反应额外造成45%攻击伤害。',0,0,0,{duration:8,reactionPower:.45,reactionInterval:2},sectSource('elements',false));
technique('elements','heart',1,'四象轮转法',4,1,1,'重复同元素积累专精，最多3层；切换元素消耗专精，每层强化新元素伤害15%，随后开始新的专精。',0,0,0,{resource:'elementFocus',cap:3,stackBonus:.15},sectSource('elements',true));
technique('elements','skill',0,'青藤缚',0,0,1,'造成85%攻击木伤，束缚目标2秒并打断施法；留下木印8秒。',9,12,.85,{element:'wood',root:2,interrupt:true,duration:8},sectSource('elements',false));
technique('elements','skill',1,'火莲',2,0,3,'造成110%攻击火伤并燃烧6秒，每秒12%攻击；留下火印，适合接寒潮触发蒸腾。',12,10,1.1,{element:'fire',dot:'burn',dotPower:.12,duration:6},sectSource('elements',false));
technique('elements','skill',2,'寒潮',3,0,7,'对所有敌人造成105%攻击水伤，降低攻击频率20%共6秒；留下水印。',15,14,1.05,{element:'water',aoe:true,slow:.2,duration:6},bossSource(1));
technique('elements','skill',3,'地脉转',4,1,1,'获得25%最大气血土盾8秒，消除自身最后元素，使下一次元素神通必定可以重新起势。',14,18,0,{element:'earth',shield:.25,duration:8,resetElement:true},sectSource('elements',true));
technique('elements','secret',0,'化生诀',1,0,5,'触发元素反应恢复6真元，每3秒最多一次；不会由追加反应无限回元。',0,0,0,{mp:6,interval:3},sectSource('elements',false));
technique('elements','secret',1,'逆五行篇',3,1,4,'连续两次不同反应使目标元素抗性降低15%，持续6秒，触发间隔8秒。',0,0,0,{differentReactions:2,resistanceDown:.15,duration:6,interval:8},src('dungeon','cave_1','洞天探索 · 赤霄炉境'));

technique('shadow','heart',0,'玄冥蚀魄经',1,0,1,'同时存在侵蚀与燃魂时，持续伤害提高20%；每2秒叠加1层侵蚀，最多5层。',0,0,0,{dotBonus:.2,resource:'erosion',cap:5,interval:2},sectSource('shadow',false));
technique('shadow','heart',1,'摄魂归元诀',5,1,1,'主动消耗负面状态时，每个状态增加20%攻击附伤并恢复4真元；每次最多计3个状态。',0,0,0,{consumeBonus:.2,mp:4,consumeCap:3},sectSource('shadow',true));
technique('shadow','skill',0,'蚀魄印',0,0,1,'造成75%攻击伤害并施加侵蚀8秒，每秒18%攻击；侵蚀最多5层，续施刷新时间。',9,9,.75,{dot:'erosion',dotPower:.18,duration:8,cap:5},sectSource('shadow',false));
technique('shadow','skill',1,'幽火',2,0,3,'造成90%攻击伤害并施加燃魂8秒，每秒14%攻击，同时削弱目标回复25%。',12,11,.9,{dot:'soulfire',dotPower:.14,duration:8,healingDown:.25},sectSource('shadow',false));
technique('shadow','skill',2,'断魂',3,0,7,'造成150%攻击伤害，消耗目标侵蚀和燃魂，按剩余时间结算50%未发生的持续伤害，并打断施法。',16,16,1.5,{consumeDots:true,remainingDamage:.5,interrupt:true},bossSource(5));
technique('shadow','skill',3,'摄魄',4,1,1,'造成130%攻击伤害，将实际伤害的35%转为气血回复，并降低目标攻击10%共6秒。',15,14,1.3,{lifesteal:.35,attackDown:.1,duration:6},sectSource('shadow',true));
technique('shadow','secret',0,'残烬秘录',2,0,5,'持续伤害自然结束时追加40%攻击余伤；主动引爆不触发，余伤不能触发自身，间隔2秒。',0,0,0,{power:.4,interval:2,onlyNaturalEnd:true},sectSource('shadow',false));
technique('shadow','secret',1,'噬影篇',4,1,4,'主动消耗目标负面状态时回复8%最大气血，每6秒最多触发一次。',0,0,0,{heal:.08,interval:6},src('dungeon','cave_2','洞天探索 · 星桥裂隙'));

technique('array','heart',0,'太素丹阵经',1,0,1,'自身阵法存在时治疗提高15%；阵法每运行2秒恢复1真元，最多同时保留两种阵法。',0,0,0,{healing:.15,mp:1,interval:2,arrayCap:2},sectSource('array',false));
technique('array','heart',1,'星罗炼神法',5,1,1,'重复施放现有阵法时主动收阵，按已运行时间造成最高180%攻击伤害或回复最高20%气血；至少运行2秒才可收阵。',0,0,0,{chargeSeconds:10,minSeconds:2,maxPower:1.8,maxHeal:.2},sectSource('array',true));
technique('array','skill',0,'回春术',0,0,1,'立即恢复18%最大气血，再在6秒内每2秒回复4%；持续恢复取最新一次，不叠加。',10,13,0,{heal:.18,hot:.04,interval:2,duration:6},src('tutorial','start','初入洞府教学；丹阵入门试炼也可获得'));
technique('array','skill',1,'净尘诀',2,0,3,'驱散自身最多2个负面状态并恢复8%最大气血；成功净化时获得短时抗性可由清心诀强化。',12,14,0,{purify:2,heal:.08},sectSource('array',false));
technique('array','skill',2,'聚灵阵',3,0,7,'布置聚灵阵10秒，每2秒恢复5真元，并提高技能回复效率10%；重复施放刷新或按星罗心法收阵。',8,18,0,{array:'spirit',duration:10,interval:2,mp:5,healing:.1},bossSource(6));
technique('array','skill',3,'星罗阵',4,1,1,'布置星罗阵10秒，每2秒对所有敌人造成35%攻击伤害；可在星罗心法下主动收阵爆发。',16,18,.35,{array:'stars',duration:10,interval:2,aoe:true},sectSource('array',true));
technique('array','secret',0,'清心诀',1,0,5,'成功驱散后，4秒内免疫刚清除的状态；每8秒最多触发一次，已有状态不会自动消失。',0,0,0,{immunity:4,interval:8},sectSource('array',false));
technique('array','secret',1,'灵枢秘录',3,1,4,'阵法存在时，治疗溢出量的35%转为护盾，上限20%最大气血；不能触发新的治疗。',0,0,0,{overhealShield:.35,shieldCap:.2},bossSource(3));

const facilities={
 field:{id:'field',name:'灵田',description:'种植灵草与灵莲。升级提高草药产量，每级增加常规药材储量。生产最多积累七天。',maxLevel:10,source:src('tutorial','start','初入洞府'),effect:{herbPerHour:2,lotusPerHour:.25}},
 furnace:{id:'furnace',name:'药炉',description:'炼制18种丹药，批量与控火都保证基础成丹。升级提高额外产量并降低材料损耗。',maxLevel:10,source:src('realm','rank2','首境三层'),effect:{batchBase:20,extraYieldPerLevel:.02}},
 forge:{id:'forge',name:'炼器坊',description:'制造、重铸、洗炼与觉醒装备。强化保存在部位，贵重装备不会失败损毁。',maxLevel:10,source:src('realm','rank4','首境五层'),effect:{orePerHour:1,costReductionPerLevel:.015}},
 library:{id:'library',name:'藏经阁',description:'整理功法残页，产出参悟材料。三个免费预设支持快速切换流派。',maxLevel:10,source:src('realm','rank4','首境五层'),effect:{insightPerHour:1}},
 array:{id:'array',name:'聚灵阵',description:'改善洞府灵息与修为效率，并累计悟道；24小时一券，最多储存七券。',maxLevel:10,source:src('tutorial','start','初入洞府'),effect:{cultivationPerLevel:.08,wisdomHours:24}}
};

const recipes={};
function recipe(id,name,kind,rarity,realm,materials,stones,effect,description,source){
 recipes[id]={id,name,kind,rarity,realm,layer:1,materials,stones,effect,description,source,researchCost:{stones:100*(realm+1),materials:{insight:2*(realm+1)}},artKey:'pill_'+kind,iconSchool:kind==='heal'||kind==='purify'?'array':kind==='shield'?'body':'elements',yield:1};
}
recipe('qi0','聚气丹','qi',0,0,{herb:4,lotus:1},16,{xp:120},'服用后为当前路线增加120修为。溢出修为进入储备，不跳过大境试炼。',src('tutorial','start','洞府丹方教学'));
recipe('qi1','凝元丹','qi',1,1,{herb:10,lotus:2,insight:2},80,{xp:900},'为当前路线增加900修为，适合第二境参悟。',src('dungeon','resource_herb','第二境灵草秘境'));
recipe('qi2','紫府丹','qi',3,2,{herb:24,lotus:5,insight:6},360,{xp:5000},'为当前路线增加5000修为，材料可从灵草与参悟秘境稳定获得。',src('dungeon','resource_insight','第三境参悟秘境'));
recipe('heal0','回春丹','heal',0,0,{herb:3},8,{heal:.4},'战斗中恢复40%最大气血，与其他战斗丹药共享冷却。',src('tutorial','start','洞府丹方教学'));
recipe('heal1','续命丹','heal',2,1,{herb:8,lotus:1},40,{heal:.55},'战斗中恢复55%最大气血。没有额外副作用。',src('dungeon','sect_array_0','丹阵入门试炼'));
recipe('heal2','九转养元丹','heal',4,3,{herb:18,lotus:4,essence:3},200,{heal:.7,hot:.03,duration:6},'战斗中恢复70%气血，六秒内继续调养。',src('dungeon','boss_6','缚灵树王与第三境丹炉研究'));
recipe('shield0','护体丹','shield',1,0,{herb:3,ore:1},12,{shield:.3,duration:10},'获得30%最大气血护盾，持续10秒；相同护盾不相加。',src('dungeon','resource_ore','矿石秘境基础丹方'));
recipe('shield1','金石丹','shield',3,1,{herb:6,ore:3,lotus:1},52,{shield:.45,duration:12},'获得45%最大气血护盾，持续12秒。',src('dungeon','sect_body_0','金身入门试炼'));
recipe('shield2','玄武定身丹','shield',5,4,{herb:12,ore:8,lotus:4,essence:4},280,{shield:.6,reduction:.12,duration:12},'获得60%最大气血护盾与12%减伤，持续12秒。',src('dungeon','boss_8','熔炉傀儡炼器研究'));
recipe('purify0','清心散','purify',2,0,{herb:4,lotus:1},20,{purify:1,immunity:2},'清除一个负面状态，获得2秒短时抗性。',src('dungeon','resource_herb','灵草秘境基础丹方'));
recipe('purify1','涤魂丹','purify',3,1,{herb:8,lotus:2,insight:1},60,{purify:2,immunity:3},'清除两个负面状态，获得3秒短时抗性。',src('dungeon','sect_array_0','丹阵入门试炼'));
recipe('purify2','无垢明心丹','purify',4,3,{herb:16,lotus:4,insight:5},220,{purify:4,immunity:5},'清除四个负面状态，获得5秒抗性；核心状态机制仍以副本说明为准。',src('dungeon','boss_9','月蚀灵狐研究及宗门丹典'));
[
 ['筑基丹','将散乱灵息凝为第一重道基；炼体者以此温养骨髓。突破前先访药炉研究丹方，再采集灵草、玄铁与莲子。'],
 ['凝金丹','把道基中的灵息压入丹心；炼体者凝练心血。先以参悟砂校正丹方，再备齐同境药材。'],
 ['凝婴丹','滋养识海，在心魔问心之前为灵识留一盏归途灯；炼体者借药力贯通灵脉。'],
 ['化神丹','让神识与地脉相接，在守阵与择愿之前护住道心；炼体者借此锤炼金身。'],
 ['渡厄丹','调和雷火，在雷劫到来之前护住经脉；炼体者借此为破虚作最后准备。'],
 ['道心丹','在自证大道之前收束纷乱愿念，完成终境调息；不凭空开启额外境界。']
].forEach((row,i)=>recipe('break'+i,row[0],'break',Math.min(5,i+1),i,
 {herb:6+i*5,ore:3+i*2,lotus:2+i,insight:i*2},32+Math.pow(i+1,2)*30,
 {trialShield:.2,trialReduction:.1,heal:.15,duration:12},row[1]+'这是对应境界突破仪式的备料丹，药炉研究与炼制均有确定产出。',
 src('research','furnace','当前境药炉确定研究丹方；药材来自灵田、青岚灵圃、沉星矿洞与静悟石林')));

const treasureRows=[
 ['青木铃','active',1,1,'摇铃清除一个负面状态并恢复30%气血，冷却24秒。',{heal:.3,purify:1,cooldown:24},sectSource('array',false)],
 ['护脉佩','passive',1,1,'装备时最大气血提高12%；只由当前灵宝配置生效。',{stats:{hp:.12}},bossSource(0)],
 ['破障镜','active',2,1,'镜光造成180%攻击伤害，附加25%破甲8秒，冷却22秒。',{power:1.8,armorBreak:.25,duration:8,cooldown:22},bossSource(2)],
 ['静海珠','passive',2,1,'每秒真元恢复增加1.5，适合长战或高消耗神通。',{stats:{mpRegen:1.5}},src('dungeon','resource_essence','灵粹秘境；宗门贡献兑换')],
 ['御风翎','passive',2,1,'闪避概率提高8%；无法闪避明确标注必中机制。',{stats:{dodge:.08}},src('dungeon','cave_0','云隐古府最终宝箱')],
 ['镇岳印','active',3,1,'获得40%最大气血护盾并压制目标6秒，冷却28秒。',{shield:.4,taunt:6,cooldown:28},bossSource(3)],
 ['照魂灯','passive',3,1,'侵蚀、燃魂和燃烧的持续伤害提高20%，不强化直接引爆附伤。',{stats:{dotDamage:.2}},bossSource(5)],
 ['清心莲','passive',3,1,'成功净化后获得4秒状态抗性，每8秒最多触发一次。',{immunity:4,interval:8},sectSource('array',true)],
 ['雷池令','active',4,1,'雷池对所有敌人造成210%攻击伤害并增加2层雷印，冷却28秒。',{power:2.1,marks:2,aoe:true,cooldown:28},bossSource(2)],
 ['归元鼎','passive',4,1,'治疗效率提高15%；溢出治疗的20%转护盾，上限20%最大气血。',{stats:{healing:.15},overhealShield:.2,shieldCap:.2},bossSource(6)],
 ['天衡盘','active',5,1,'打断所有敌人，造成250%攻击伤害并获得20%气血护盾，冷却32秒。',{power:2.5,interrupt:true,aoe:true,shield:.2,cooldown:32},bossSource(3)],
 ['星桥玉','passive',5,1,'每施放第四次神通恢复12%最大真元并获得12%气血护盾，触发间隔10秒。',{casts:4,mpPercent:.12,shield:.12,interval:10},src('sidequest','world_forge','器道修复任务；终章妖王与天道感应')]
];
const treasures={};
treasureRows.forEach((r,i)=>{const id='t'+i;treasures[id]={id,name:r[0],kind:r[1],rarity:r[2],realm:r[3],layer:1,description:r[4],effect:id,rules:r[5],source:r[6],cooldown:r[5].cooldown||0,artKey:'treasure_'+(i%6),iconSchool:Object.keys(schools)[i%6],maxLevel:10};});

const sets={
 sword:{id:'sword',name:'青锋',description:'围绕破甲和连续命中构筑。',twoEffect:'攻击提高8%。',fourEffect:'破甲目标受到的剑术伤害提高15%。',redEffect:'破甲结束时返还下一门攻击神通的一半真元消耗，间隔8秒。',twoStats:{attack:.08},fourStats:{penetration:.08},rules:{armoredBonus:.15,refund:.5,interval:8},source:bossSource(4)},
 body:{id:'body',name:'玄武',description:'护盾吸收、减伤与反击。',twoEffect:'防御提高10%，最大气血提高5%。',fourEffect:'护盾吸收效率提高15%，破盾后获得短时减伤。',redEffect:'自身护盾被击破时，下次回山震额外获得两层震劲，间隔10秒。',twoStats:{defense:.1,hp:.05},fourStats:{shieldPower:.15},rules:{reduction:.12,duration:4,quake:2,interval:10},source:bossSource(0)},
 thunder:{id:'thunder',name:'雷霄',description:'雷印蓄势与连锁爆发。',twoEffect:'暴击概率提高5%。',fourEffect:'雷印被消耗时追加40%攻击雷击，间隔5秒。',redEffect:'引爆至少三层雷印后，下一门雷术消耗减少30%，間隔8秒。',twoStats:{crit:.05},fourStats:{critDamage:.12},rules:{detonatePower:.4,refund:.3,interval:8},source:bossSource(2)},
 elements:{id:'elements',name:'离火',description:'轮转元素、延续燃烧。',twoEffect:'攻击提高6%，持续伤害提高8%。',fourEffect:'元素反应延长已有燃烧2秒，最多延长到10秒。',redEffect:'触发不同元素反应后获得一层通明，三层时下次元素技能追加30%攻击伤害。',twoStats:{attack:.06,dotDamage:.08},fourStats:{dotDamage:.15},rules:{extend:2,durationCap:10,threshold:3,power:.3},source:bossSource(1)},
 shadow:{id:'shadow',name:'太虚',description:'以闪避、控制和侵蚀应对压迫。',twoEffect:'闪避概率提高5%，真元恢复增加0.5。',fourEffect:'闪避成功使主动灵宝剩余冷却减少1秒，间隔3秒。',redEffect:'打断敌人后，下次摄魄对其回复效率提高20%，间隔8秒。',twoStats:{dodge:.05,mpRegen:.5},fourStats:{cooldownReduction:.05},rules:{treasureRefund:1,interval:3,lifestealBonus:.2},source:bossSource(7)},
 array:{id:'array',name:'回春',description:'治疗、净化与阵法持久战。',twoEffect:'治疗效率提高10%。',fourEffect:'成功净化恢复5真元，并缩短回复神通1秒冷却，间隔6秒。',redEffect:'阵内治疗发生溢出时，主动灵宝冷却减少2秒，间隔10秒。',twoStats:{healing:.1},fourStats:{hp:.08},rules:{mp:5,cooldownRefund:1,treasureRefund:2,interval:10},source:bossSource(6)}
};
const gearTargets={};
const gearBaseNames={
 sword:['青锋剑','流云衣','藏锋冠','追影腕','逐风履','剑心佩'],
 body:['镇岳锤','玄武甲','山骨冠','承岳腕','定山履','不动佩'],
 thunder:['雷霄杖','鸣雷衣','九霄冠','引电腕','惊电履','藏雷佩'],
 elements:['四象扇','离火衣','木灵冠','寒潮腕','地脉履','五行佩'],
 shadow:['蚀魄刃','太虚衣','幽火冠','噬影腕','夜行履','摄魂佩'],
 array:['星罗尺','回春衣','清心冠','灵枢腕','归元履','丹心佩']
};
Object.keys(schools).forEach(school=>Object.keys(slots).forEach((slot,i)=>{
 const id='gear_'+school+'_'+slot;
 gearTargets[id]={id,name:gearBaseNames[school][i],slot,set:school,school,rarity:5,realm:1,layer:1,
 description:sets[school].name+'套装·'+slots[slot]+'。道品附带'+sets[school].redEffect,
 redEffect:sets[school].redEffect,effect:school,artKey:'gear_'+school,iconSchool:school,
 source:sets[school].source,alternateSource:src('sidequest','world_forge','器道修复学会蓝图后定向打造'),blueprint:school};
}));
const materials={
 herb:{id:'herb',name:'灵草',description:'炼丹与赠礼的基础材料。',source:src('dungeon','resource_herb','灵草秘境、灵田')},
 ore:{id:'ore',name:'玄铁',description:'制造、强化、重铸所用炼器矿。',source:src('dungeon','resource_ore','矿石秘境、炼器坊')},
 lotus:{id:'lotus',name:'灵莲',description:'高品质炼丹与突破准备，资源秘境稳定少量产出。',source:src('dungeon','resource_herb','灵草秘境与灵田')},
 insight:{id:'insight',name:'参悟砂',description:'功法升级与高阶丹药。',source:src('dungeon','resource_insight','参悟秘境、藏经阁')},
 essence:{id:'essence',name:'灵粹',description:'洗炼、灵宝升级与觉醒。',source:src('dungeon','resource_essence','灵粹秘境与妖王')},
 soul:{id:'soul',name:'器魂',description:'红装觉醒，重复红装可分解获得。',source:src('dungeon','boss_11','极境妖王与红装分解')}
};
for(let i=0;i<6;i++) materials['crystal'+i]={id:'crystal'+i,name:routes.magic.realmNames[i]+'天命晶',description:'对应阶位红装打造与重铸。低阶晶不能代替高阶晶。',realm:i,source:src('dungeon','resource_fate','对应境界有效挑战、宗门委托')};

const mechanic=(id,trigger,interval,castTime,damage,resist,counter,extra)=>Object.assign({id,trigger,interval,castTime,damage,resist,counter},extra||{});
// Explicit species replace name guessing: the original eight illustrations are
// retained as matching creatures, while newly drawn encounters fill real gaps.
const monsterRows=[
 ['boar','青岚灵獠','v3-monster-atlas.png',0,4,2,'药圃外围的灵獠，藤叶覆背，双獠外翻。'],
 ['golem','晶甲石傀','v3-monster-atlas.png',1,4,2,'矿脉凝成的石傀，胸肩嵌着绿色晶簇。'],
 ['water','镜湖灵鹿','v3-monster-atlas.png',2,4,2,'守护灵泉的白蓝灵鹿，角间托着一颗水珠。'],
 ['thunder','紫霄雷隼','v3-monster-atlas.png',3,4,2,'紫羽雷隼，振翼时显出金色雷纹。'],
 ['shadow','噬影幽狼','v3-monster-atlas.png',4,4,2,'黑紫幽狼沿破碎长廊出没，眼中燃着魂火。'],
 ['armor','古甲执戈卫','v3-monster-atlas.png',5,4,2,'披覆旧青铜甲的守卫，执一杆青玉长戈。'],
 ['flower','赤莲噬灵花','v3-monster-atlas.png',6,4,2,'花核燃金，赤红巨莲借根须汲取地脉。'],
 ['star','星桥灵螭','v3-monster-atlas.png',7,4,2,'白金灵螭盘绕星轨，身旁浮着蓝色阵珠。'],
 ['siphon_beetle','汲灵虫','v7-encounters-atlas.png',0,4,2,'六足翠甲灵虫，腹部会随汲取药圃灵息而发光。'],
 ['tablet_spirit','碑纹石灵','v7-encounters-atlas.png',1,4,2,'刻纹石碑所化的矮小石灵，头顶留着完整青蓝阵纹。'],
 ['spring_wraith','灵泉浊妖','v7-encounters-atlas.png',2,4,2,'被旧阵污染的水息聚成浊妖，净化后会还原清泉。'],
 ['blight_moth','蚀莲灵蛾','v7-encounters-atlas.png',3,4,2,'夜里掠过莲池的灵蛾，翅粉会侵蚀药草生机。'],
 ['bronze_sentinel','青铜门卫','v7-encounters-atlas.png',4,4,2,'古府门前的铜玉机关卫，持短枪与方盾。'],
 ['root_tendril','缚灵根须','v7-encounters-atlas.png',5,4,2,'树王分出的活根，木壳之下露出青色灵眼。'],
 ['mirror_phantom','镜月幻影','v7-encounters-atlas.png',6,4,2,'镜片聚成的无面衣影，与有实体的修士区分。'],
 ['ember_golem','碎焰石灵','v7-encounters-atlas.png',7,4,2,'火脉里诞生的浮石灵，黑岩裂隙间透出橙色熔焰。']
];
const monsters=Object.fromEntries(monsterRows.map(r=>[r[0],{id:r[0],name:r[1],art:{file:r[2],index:r[3],cols:r[4],rows:r[5]},description:r[6]}]));
const rivals=Object.fromEntries([
 ['hanyue','韩岳'],['yejinghong','叶惊鸿'],['luojingxing','骆景行'],['xuzhao','许照'],['jilingchuan','季凌川'],['luojingxing_plain','骆景行·守殿之约']
].map((r,index)=>[r[0],{id:r[0],name:r[1],art:{file:'v7-rivals-atlas.png',index,cols:3,rows:2}}]));
[
 ['gate_lion','天门镇界狮','玉白神狮镇守天门，金玉甲上留着历代飞升者的洗尘纹。'],
 ['frost_crane','霜天玄鹤','赤顶白羽的仙鹤，灵息化雪，守住初入仙域者的最后一道寒关。'],
 ['star_ocean_dragon','星海苍龙','苍蓝仙龙游过星海，潮汐随龙息起落，长角之间凝着一片澄澈星空。'],
 ['primordial_phoenix','太初玄凰','黑白双羽的玄凰收束阴阳，金焰不焚肉身，却照见修士最深的执念。']
].forEach((r,index)=>{monsters[r[0]]={id:r[0],name:r[1],description:r[2],art:{file:'v7-immortal-beasts-atlas.png',index,cols:2,rows:2}};});
const bosses=[
 {id:'boss_0',name:'青甲山君',realm:0,layer:7,school:'body',description:'守山妖虎以重甲抵挡正面攻击，重击后露出胸口阵纹。',mechanics:[
 mechanic('heavy','每12秒蓄力重击',12,3,2.1,{physical:.15},['伏岳掌或惊电步打断','镇骨甲或护体丹承伤后反击'],{armorBreakWindow:6}),
 mechanic('exposed','重击结束后破绽持续6秒',12,0,0,{},['保留归一斩在窗口爆发','持续侵蚀穿过重甲'],{defenseDown:.35,duration:6})]},
 {id:'boss_1',name:'赤莲妖后',realm:0,layer:9,school:'elements',description:'妖后以花核维持灼烧结界，花核可以优先击毁。',mechanics:[
 mechanic('lotusBurn','每10秒放出灼烧',10,2,.7,{fire:.25},['净尘诀或清心散净化','火抗与回春术稳定承伤'],{dotPower:.12,duration:6}),
 mechanic('flowerCore','气血低于70%与35%召唤花核',18,2,0,{},['转火摧毁花核','寒潮或范围灵宝同时压制'],{summonHp:.2,summonCount:1})]},
 {id:'boss_2',name:'雷渊蛟',realm:1,layer:3,school:'thunder',description:'蛟鳞积攒雷印，连续进攻会推动雷劫阈值。',mechanics:[
 mechanic('conduct','每次攻击向玩家附加雷印',6,0,.8,{thunder:.3},['净化印记再集中输出','以雷抗和护盾度过引爆'],{marks:1,markCap:5}),
 mechanic('overcharge','玩家雷印达到4层后蓄力引爆',8,2.5,2.4,{},['读条时使用打断','提前护盾并在冷却窗口回复'],{threshold:4})]},
 {id:'boss_3',name:'镜湖玄龟',realm:1,layer:6,school:'array',description:'镜壳周期反射直接伤害，持续侵蚀与阵法可渡过防守阶段。',mechanics:[
 mechanic('mirror','每14秒镜壳维持5秒',14,1,0,{physical:.2},['暂缓爆发，治疗与聚灵','施放侵蚀维持伤害'],{reflect:.25,duration:5}),
 mechanic('shell','镜壳结束后召出护壳',14,0,0,{},['破甲或破障镜破壳','将爆发留到护壳耗尽'],{shield:.18,duration:8})]},
 {id:'boss_4',name:'寒鸦真人',realm:2,layer:3,school:'sword',description:'借寒鸦分身掩护疗伤，只有本体会施放回生诀。',mechanics:[
 mechanic('recover','每13秒施放回生诀',13,3,0,{water:.2},['打断带绿色前摇的本体','以幽火降低回复后持续压血'],{heal:.15}),
 mechanic('clone','气血低于75%与40%生成分身',18,2,.6,{},['转火识别带本体标记的目标','范围神通清理分身'],{summonCount:2,summonHp:.13})]},
 {id:'boss_5',name:'无相心魔',realm:2,layer:7,school:'shadow',description:'记录玩家上一门神通并反用其效果，战斗顺序是破局线索。',mechanics:[
 mechanic('copy','每11秒复制玩家上一门神通',11,2,1.5,{shadow:.25},['先用低伤或辅助技诱导复制','打断复制读条'],{copyLastSkill:true}),
 mechanic('confusion','每16秒施加心魔侵蚀',16,2,.5,{},['净化和短时抗性','回复阵法抵消侵蚀'],{dotPower:.08,duration:8})]},
 {id:'boss_6',name:'缚灵树王',realm:3,layer:3,school:'array',description:'根须不断汲取真元，树心被根须保护时需要先清理枝根。',mechanics:[
 mechanic('drain','每8秒汲取真元',8,1,.7,{wood:.25},['聚灵阵补充真元','断魂打断树心'],{mpDrain:.18}),
 mechanic('roots','每15秒缠绕并召唤根须',15,2,.7,{},['净化束缚后转火枝根','范围技能加回复阵持续作战'],{root:3,summonCount:2,summonHp:.1})]},
 {id:'boss_7',name:'双生影卫',realm:3,layer:7,school:'shadow',description:'两名影卫共用阵法，在亮暗转换时轮流暴露弱点。',mechanics:[
 mechanic('twins','入场生成双目标，共生护盾',0,0,0,{shadow:.2},['切换攻击无护盾的一方','范围伤害同时削弱共生阵'],{enemyCount:2,shield:.18}),
 mechanic('swap','每12秒交替弱点',12,1,1.2,{},['按亮起的目标标记转火','预留范围爆发在换盾窗口'],{swapWeakness:true,duration:6})]},
 {id:'boss_8',name:'熔炉傀儡',realm:4,layer:3,school:'body',description:'攻击与火伤提高炉温，过载前有清晰的温度条。',mechanics:[
 mechanic('heat','每6秒升温并射出炉火',6,1,.9,{fire:.35},['寒潮冷却并控制输出时机','护盾反击积累震劲'],{heat:15,heatCap:100}),
 mechanic('overload','炉温满后3秒过载',16,3,2.6,{},['蓄力阶段打断降低炉温','盾丹加镇骨甲承受后反击'],{heatReset:true,exposedDuration:6})]},
 {id:'boss_9',name:'月蚀灵狐',realm:4,layer:7,school:'elements',description:'幻象状态与真实魅惑并存，真实施法有独立前摇标记。',mechanics:[
 mechanic('illusion','每10秒制造假状态',10,1,.7,{shadow:.3},['查看真状态图标再净化','使用清心诀提高容错'],{fakeStatus:true}),
 mechanic('charm','每15秒魅惑读条',15,3,1.5,{},['打断真实读条','净尘诀或涤魂丹抵消控制'],{silence:3})]},
 {id:'boss_10',name:'玄河守将',realm:5,layer:3,school:'sword',description:'守将封锁河桥，玩家须兼顾来袭敌人和运送阵心的同伴。',mechanics:[
 mechanic('escort','每12秒攻击阵心护送队',12,2,1.1,{physical:.2},['迅速转火封锁先锋','护盾和治疗支援护送目标'],{escortDamage:.08,escortHp:1}),
 mechanic('blockade','每18秒召唤封锁卫兵',18,2,.8,{},['范围技能清场','打断守将后优先击败卫兵'],{summonCount:2,summonHp:.12})]},
 {id:'boss_11',name:'天隙劫兽',realm:5,layer:7,school:'thunder',description:'三段雷劫与裂隙爆发交替，护盾和打断不能在同一时刻耗尽。',mechanics:[
 mechanic('tribulation','气血80%、50%、20%时雷劫',15,3,2.3,{thunder:.25},['为每段分别预留护盾','打断一段并用回复处理下一段'],{phases:[.8,.5,.2]}),
 mechanic('rift','每17秒裂隙，结束后弱点显露',17,2,1.5,{},['净化后保留爆发','阵法续航等破绽窗口'],{dotPower:.08,duration:5,defenseDown:.3})]}
];
const dungeons={};
const resourceRows=[
 ['herb','青岚灵圃','herb',0,1,'巡山教学：首境一层即可进入，学习攻击、回复与护盾。巡护药圃，清理汲灵虫、蚀莲灵蛾与闯入药圃的青岚灵獠，稳定获得炼丹药材。',{herb:12,lotus:1}],
 ['ore','沉星矿洞','ore',0,3,'击破晶甲石傀与古甲执戈卫，获得玄铁；重击有可打断前摇。',{ore:8,herb:3}],
 ['insight','静悟石林','insight',0,5,'辨识石碑与守碑灵，获得升级功法的参悟砂。',{insight:8,ore:2}],
 ['essence','流光灵泉','essence',0,7,'净化泉眼，清理不断聚集的灵污，获得灵粹。',{essence:5,herb:5,lotus:1}],
 ['fate','天衡遗坛','crystal',1,1,'守住古坛并击败汲运灵，获得同阶天命晶及感应资源。',{essence:3,ore:4,lotus:1}]
];
resourceRows.forEach((r,i)=>{
 const id='resource_'+r[0];
 dungeons[id]={id,type:'resource',name:r[1],resource:r[2],realm:r[3],layer:r[4],description:r[5],
 mechanics:[mechanic('resource_'+r[0],'资源守卫每10秒蓄力',10,2.5,1.5,{},['攻击神通打断','护盾吸收再恢复'])],
 rewards:{xp:100,stones:800,materials:r[6],crystal:3,tickets:2},
 firstRewards:{stones:160,materials:{lotus:2,insight:3},tickets:i===0?5:2},
 duration:45,enemyCount:3,difficultyUnlocks:[{realm:r[3],layer:r[4]},{realm:1,layer:4},{realm:2,layer:4}],
 enemySpecies:{herb:['siphon_beetle','blight_moth','boar'],ore:['golem','armor','ember_golem'],insight:['tablet_spirit','star','bronze_sentinel'],essence:['spring_wraith','water','flower'],fate:['star','thunder','shadow']}[r[0]],
 artKey:'map_'+Math.min(5,i)};
});
Object.keys(schools).forEach((school,i)=>{
 for(let advanced=0;advanced<2;advanced++){
  const id='sect_'+school+'_'+advanced;
  const required=advanced?'heart_1':'heart_0';
  const skillIds=advanced?[school+'_skill_3',school+'_secret_1']:[school+'_skill_0',school+'_skill_1',school+'_secret_0'];
  dungeons[id]={id,type:'sect',name:schools[school].name+(advanced?'·通明论道':'·入门问道'),school,
   realm:advanced?1:0,layer:advanced?7:5,
   description:advanced?'围绕'+schools[school].description+'完成进阶考验，稳定参悟替代心法与高阶神通。':'不限制入门配置。胜利后获得本流派基础秘籍和残页，自由搭配或转修。',
   mechanics:[mechanic('sect_'+school,advanced?'守关师兄每12秒使用流派招式':'师兄每14秒展示可打断招式',advanced?12:14,2,advanced?1.9:1.5,{},['针对'+schools[school].name+'特点配置护盾与控制','使用另一流派的回复或持续伤害'])],
   rewards:{xp:advanced?260:100,stones:advanced?1100:500,contribution:advanced?30:15,materials:{insight:advanced?8:4},fragments:Object.fromEntries(skillIds.map(x=>[x,advanced?4:3])),crystal:advanced?4:0,tickets:advanced?2:0},
   firstRewards:{techniques:[school+'_'+required].concat(skillIds),stones:advanced?1000:300,materials:{insight:6},blueprints:advanced?[school]:[]},
   duration:advanced?90:60,artKey:'map_'+i,requiredSect:false};
 }
});
// Story tournaments use the normal persisted combat pipeline. They are distinct
// from the twelve teaching trials and cannot be completed by choosing dialogue.
const tournamentRows=[
 {id:'arena_0',competition:'arena',round:1,name:'冲霄斗技 · 初试锋芒',layer:3,school:'body',rival:'外门师兄·韩岳',hp:480,attack:12,defense:5,
  description:'冲霄台第一次为无名散修敲钟。韩岳守住擂台正中，要你先承住他的一记裂石掌，才肯把通往正赛的铜签交出来。',
  move:'裂石掌',hint:'读条时用惊电步或伏岳掌打断；也可先开镇骨甲再回复。',opening:'韩岳把袖口卷至手肘：“台下无人记得你的名字，台上就用这一战告诉他们。”',closing:'韩岳退到台沿，认真抱拳：“这枚正赛铜签，你凭本事拿走。”',reward:{xp:90,stones:180,materials:{herb:4,insight:2}}},
 {id:'arena_1',competition:'arena',round:2,name:'冲霄斗技 · 百席争名',layer:4,school:'elements',rival:'丹霞峰·叶惊鸿',hp:650,attack:14,defense:6,
  description:'正赛看台第一次有人喊出你的名字。叶惊鸿以连绵火雨封住擂台退路，只有看清她收诀时短暂的空隙，才能踏入决赛。',
  move:'霞火连诀',hint:'火诀可以打断；灼烧用回春术、净尘诀或清心散应对。',opening:'叶惊鸿指尖点燃一朵火莲：“我不会留手。你也别因为台下那些人的话乱了自己的气息。”',closing:'叶惊鸿收去火莲，笑着看向贵宾席：“这一届决赛，终于不只是他们几家的独角戏。”',reward:{xp:120,stones:240,materials:{herb:5,lotus:1,insight:3}}},
 {id:'arena_2',competition:'arena',round:3,name:'冲霄斗技 · 一剑夺魁',layer:5,school:'sword',rival:'骆家少主·骆景行',hp:900,attack:17,defense:8,
  description:'骆景行的锦衣掠过台心。他身后是家族供给的丹药与名剑，你身后只有一路亲手练成的招式。最后一声铜钟响起，魁首要由这一场真战决定。',
  move:'惊鸿归鞘',hint:'打断蓄剑能打开短暂破绽；保留破甲与连击，在破绽期间集中爆发。',opening:'骆景行看了一眼你的旧剑：“荒山出来的人，也想在冲霄台留下名字？”',closing:'名剑落在台边，骆景行沉默片刻，第一次认真抱拳：“今日是我输了。下一次，我会用自己的剑来赢你。”看台呼声压过铜钟：冲霄魁首！',reward:{xp:150,stones:320,materials:{ore:4,insight:4}},first:{stones:600,tickets:3,materials:{lotus:2,insight:5}},title:'冲霄魁首',firstGear:{slot:'weapon',set:'sword',rarity:2,tier:0}},
 {id:'secret_0',competition:'secret',round:1,name:'云隐争魁 · 破雾争先',layer:7,school:'array',rival:'守碑阵师·许照',hp:850,attack:16,defense:8,
  description:'云隐古府只放出三十六枚入府玉符。许照封住雾桥，把星纹石碑化作最后一道门；带着完整玉符穿过这场阵斗，才算真正进入争魁。',
  move:'回环锁灵阵',hint:'许照借阵回血；打断布阵，或以持续伤害与回复维持压制。',opening:'许照敲了敲雾中石碑：“会打架的人很多，能从古阵里找到生路的人，才配往前走。”',closing:'石碑熄灭，许照递来半张古图：“你找到了阵心。别让那些抢先的人把府里真正的秘密毁了。”',reward:{xp:160,stones:300,materials:{ore:4,insight:4}}},
 {id:'secret_1',competition:'secret',round:2,name:'云隐争魁 · 灵泉夺印',layer:8,school:'thunder',rival:'惊雷宗·季凌川',hp:1080,attack:19,defense:9,
  description:'灵泉上方悬着第二枚古印。季凌川的雷索横断栈桥，先入府者回头堵路。你必须在雷印堆叠前压住他的攻势，才能携印攀上主殿。',
  move:'九霄截灵索',hint:'雷索读条时打断；净化雷印，保留护盾承接后续重击。',opening:'季凌川把古印藏到身后：“斗技场的名声，在这片雾里可换不来路。”',closing:'雷索碎裂，古印沿石桥滑到你的脚边。季凌川抹去嘴角的血：“好，主殿见。那里的阵法，可不会因为你赢过我就退开。”',reward:{xp:190,stones:360,materials:{herb:6,lotus:1,insight:5}}},
 {id:'secret_2',competition:'secret',round:3,name:'云隐争魁 · 古殿第一',layer:9,school:'sword',rival:'骆景行·守殿之约',hp:1400,attack:21,defense:11,
  description:'古殿前，骆景行把家传名剑留在阶下，举起一柄普通青钢剑。阵门只认可最后的胜者；你们约好，胜者先取传承，败者负责护住身后的同行者。',
  move:'破雾开天剑',hint:'连续蓄剑可以打断；盾与回复保留给重击，利用暴露破绽结束这场争魁。',opening:'骆景行横剑行礼：“冲霄台欠你的一战，我记着。今日不论出身，只论我们走到这里的本事。”',closing:'青钢剑终于垂下。骆景行扶住殿门，替你挡开最后一缕劫光：“进去吧，秘境第一。把你看见的真相带出来，别让我们这一战白打。”古印同时亮起，万年传承第一次回应了你的呼吸。',reward:{xp:220,stones:440,materials:{ore:6,lotus:2,insight:6}},first:{stones:900,tickets:5,materials:{lotus:3,insight:8}},title:'秘境第一',firstGear:{slot:'weapon',set:'sword',rarity:2,tier:0}}
];
tournamentRows.forEach((r)=>{
 const previous=r.round>1?r.competition+'_'+(r.round-2):null;
 dungeons[r.id]={id:r.id,type:'arena',competition:r.competition,round:r.round,name:r.name,realm:0,layer:r.layer,school:r.school,previous,
  description:r.description,enemy:{name:r.rival,rivalId:['hanyue','yejinghong','luojingxing','xuzhao','jilingchuan','luojingxing_plain'][tournamentRows.indexOf(r)],maxHp:r.hp,attack:r.attack,defense:r.defense,mechanic:{kind:'sect_'+r.school,name:r.move,duration:2.5,hint:r.hint},mechanicInterval:12},
  opening:r.opening,closing:r.closing,mechanics:[mechanic('sect_'+r.school,r.move+'：每12秒蓄力',12,2.5,1.5,{},['打断招式打开反击窗口','依流派准备回复、净化与护盾'])],
  rewards:r.reward,firstRewards:r.first||{stones:100,materials:{insight:2}},firstGear:r.firstGear||null,title:r.title||null,duration:90,
  storyArt:r.competition==='arena'?'story-arena.png':'story-secret.png',artKey:r.competition==='arena'?'map_1':'map_2'};
});
const immortalTrials=[
 {id:'heaven_gate',name:'叩开天门 · 洗尘三劫',species:'gate_lion',kind:'gate',tier:0,hp:75000,attack:75,defense:60,move:'天门洗尘',mechanic:'heaven_pressure',hint:'读条时打断天门灵压，或预留护盾承受；劫后有六秒洗尘破绽。',opening:'云海分开，玉白神狮低下头。它没有问你的出身，只问：“人间万盏灯火已在你身后。叩开此门，你还愿意记得它们吗？”',closing:'第三道洗尘光退去，神狮让开通天石阶。你的名字第一次被仙域的钟声念出。天门已开，走完归愿，便可真正跨入仙界。'},
 {id:'immortal_0',name:'登仙圆满 · 雪羽问途',species:'frost_crane',kind:'trial',tier:0,hp:85000,attack:82,defense:70,move:'雪羽封息',mechanic:'frost_feathers',hint:'可打断雪羽；束缚后净化，保留回复与真元继续反击。',opening:'玄鹤收拢翅翼，问你为何踏上这片仙土。寒意沿阶而来，只有由你亲手凝起的仙息能让雪羽散开。',closing:'玄鹤展开羽翼，寒云让出一条青金色的路。你握住了第一缕真仙气息，圆满后的这一战已记入仙域道籍。'},
 {id:'immortal_1',name:'真仙圆满 · 星潮归一',species:'star_ocean_dragon',kind:'trial',tier:1,hp:120000,attack:102,defense:90,move:'星潮噬灵',mechanic:'star_tide',hint:'星潮会抽取真元；打断读条，或准备聚灵阵与低耗神通维持节律。',opening:'星海苍龙在你的影子里看见两条来路。它问你能否在万千潮声中守住自己的呼吸，整片星海随即向你压来。',closing:'漫天星潮合为一线。苍龙把龙首垂向你的掌心，金仙之路不再是远处别人的传说。'},
 {id:'immortal_2',name:'金仙圆满 · 太初证道',species:'primordial_phoenix',kind:'trial',tier:2,hp:165000,attack:124,defense:110,move:'阴阳归火',mechanic:'primal_flame',hint:'打断阴阳火诀；净化灼烧，借玄凰收焰后的破绽完成最后反击。',opening:'黑白双羽照见你走过的每一场胜败。太初玄凰没有许诺一个更高的名字，只把最后的火光交到你面前：“把自己的道走完。”',closing:'阴阳火熄，仙域万钟齐鸣。你已经用真实的修行与最后一战自证金仙之道；重访人间时，那些最初的名字仍在你的心里。'}
];
immortalTrials.forEach((r,index)=>{
 dungeons[r.id]={id:r.id,type:'ascension',name:r.name,realm:5,layer:10,ascensionTier:r.tier,ascensionKind:r.kind,requiredImmortalLayer:r.kind==='gate'?null:10,
  description:monsters[r.species].description+' 这是正式仙途实战，剧情选择不能代替胜利。',enemy:{name:monsters[r.species].name,species:r.species,maxHp:r.hp,attack:r.attack,defense:r.defense,mechanic:{kind:r.mechanic,name:r.move,duration:3,hint:r.hint},mechanicInterval:13},
  opening:r.opening,closing:r.closing,mechanics:[mechanic(r.mechanic,r.move+'：每13秒蓄力',13,3,1.8,{},['观察具名招式并打断','预备回复、净化与护盾渡过劫后破绽'])],rewards:{},firstRewards:{},duration:240,storyArt:'story-heaven.png',artKey:'map_11'};
 if(index>0){const id='immortal_hunt_'+r.tier;dungeons[id]={...dungeons[r.id],id,name:['霜天巡猎 · 云阶练息','星海巡猎 · 逐潮炼神','太初巡猎 · 阴阳磨心'][r.tier],ascensionKind:'hunt',requiredImmortalLayer:1,
  description:'在仙域真战中磨炼仙息；只有胜利结算才获得仙修与仙元。'+monsters[r.species].description,
  enemy:{...dungeons[r.id].enemy,maxHp:Math.round(r.hp*.44),attack:r.attack*.85,defense:r.defense*.75},opening:'你离开仙域静修台，沿着已熟悉的云阶进入巡猎灵阵。眼前的仙兽灵相仍有真实锋芒，只有实战能让刚凝起的仙息融入自己的招式。',closing:'巡猎灵阵缓缓收起。仙息随着你最后一击沉入灵台，带回的仙元已经结算；下一次巡猎，仍要由自己打赢。'};}
});
bosses.forEach((b,i)=>{
 dungeons[b.id]={id:b.id,type:'boss',name:b.name,realm:b.realm,layer:b.layer,school:b.school,bossIndex:i,
 description:b.description,mechanics:b.mechanics,rewards:{xp:180,stones:1500,materials:{ore:12,herb:15,lotus:2,essence:3},crystal:6,tickets:3,fragments:{[b.school+'_skill_2']:3}},
 firstRewards:{stones:500*(b.realm+1),materials:{['crystal'+b.realm]:12,lotus:2},blueprints:[b.school],techniques:[b.school+'_skill_2'],treasures:[['t1','t0','t2','t10','t4','t6','t9','t7','t5','t8','t3','t11'][i]]},
 loot:{equipmentChance:1,set:b.school,slotWeights:{weapon:1,armor:1,head:1,bracer:1,boots:1,charm:1},rarityWeights:[[0,0,.65,.25,.095,.005],[0,0,.5,.35,.14,.01],[0,0,.35,.45,.18,.02]]},
 duration:120,artKey:'boss_'+i,difficultyUnlocks:[{realm:b.realm,layer:b.layer},{realm:Math.max(1,b.realm),layer:7},{realm:Math.max(2,b.realm),layer:7}]};
});
treasures.t0.source=bossSource(1);
treasures.t3.source=bossSource(10);
treasures.t5.source=bossSource(8);
treasures.t7.source=bossSource(7);
treasures.t8.source=bossSource(9);
treasures.t11.source=src('sidequest','world_escort','河桥长明任务；终章与天道感应');
dungeons.boss_3.firstRewards.techniques.push('body_secret_1','array_secret_1');
Object.values(recipes).forEach(r=>{r.source.label=(r.kind==='break'?'突破前可准备；丹方与备料：':'到境开放；材料来源：')+r.source.label;});

const towerThemes=[
 {name:'青锋十问',school:'sword',mechanic:'连续目标与破甲窗口',boss:0},
 {name:'玄武十问',school:'body',mechanic:'护盾时机与反击',boss:3},
 {name:'雷霄十问',school:'thunder',mechanic:'雷印消除与打断',boss:2},
 {name:'离火十问',school:'elements',mechanic:'元素轮转与范围清场',boss:6},
 {name:'太虚十问',school:'shadow',mechanic:'侵蚀与心魔顺序',boss:9},
 {name:'星罗十问',school:'array',mechanic:'回复、真元与分段护阵',boss:11}
];
const towerFloors=Array.from({length:60},(_,i)=>{
 const floor=i+1,realm=Math.floor(i/10),theme=towerThemes[realm],layer=(i%10)+1,boss=layer===10;
 return {id:'tower_'+floor,floor,name:theme.name+' · 第'+floor+'层',realm,layer:Math.max(7,Math.min(10,layer)),school:theme.school,
 description:'考验'+theme.mechanic+'。'+(boss?'十层守关可查看弱点与独立前摇。':'以本主题的敌人组合逐步增加压力。'),
 enemyCount:boss?1:1+(layer>4?1:0),bossIndex:boss?theme.boss:null,
 mechanics:boss?bosses[theme.boss].mechanics:[mechanic('tower_'+theme.school,'第'+floor+'层守卫每12秒蓄力',12,2,1.5,{[theme.school]:.12},['用控制打断','保留护盾或净化处理'])],
 rewards:{xp:120*(realm+1),stones:200*(realm+1),materials:{insight:3+realm}},
 firstRewards:{stones:300*(realm+1),tickets:boss?5:1,materials:{insight:4+realm,lotus:boss?2:0},techniques:boss?[theme.school+'_secret_1']:[]},artKey:'map_'+realm};
});
dungeons.tower={id:'tower',type:'tower',name:'问道塔',realm:0,layer:7,description:'60层六大主题。逐层首通保存进度；已通关层可回访，不重发首通券。',mechanics:[],rewards:{xp:100,stones:200,materials:{insight:3}},firstRewards:{},duration:60,artKey:'map_2'};
const caveRooms=[
 {id:'battle',name:'守门灵卫',kind:'battle',description:'击败守卫获得常规材料，可携出已确认战利品。',choices:[{id:'fight',label:'迎战',battle:true}],reward:{stones:300,materials:{ore:3,herb:5}}},
 {id:'elite',name:'残阵妖影',kind:'battle',description:'精英敌人有一次可打断蓄力；胜利额外获得残页。',choices:[{id:'fight',label:'挑战精英',battle:true}],reward:{stones:450,materials:{insight:4,essence:2}}},
 {id:'herb',name:'灵圃残园',kind:'resource',description:'取走药材或留下一半换取调养，不会同时取得两项。',choices:[{id:'gather',label:'采集灵草',reward:{materials:{herb:12,lotus:1}}},{id:'rest',label:'调养灵息',heal:.2}],reward:{}},
 {id:'ore',name:'星铁石台',kind:'resource',description:'取炼器矿，或将石台重整获得后续护盾。',choices:[{id:'mine',label:'开采玄铁',reward:{materials:{ore:8}}},{id:'guard',label:'加固阵台',buff:{shield:.1}}],reward:{}},
 {id:'healing',name:'清泉石亭',kind:'rest',description:'在泉亭休息。可恢复气血或真元，选择一次。',choices:[{id:'hp',label:'调养气血',heal:.3},{id:'mp',label:'澄净真元',mp:.45}],reward:{}},
 {id:'insight',name:'无字古碑',kind:'event',description:'参悟古碑文字，得到参悟砂；破解阵纹获得一张券。',choices:[{id:'study',label:'静心参悟',reward:{materials:{insight:7}}},{id:'decode',label:'破解阵纹',reward:{tickets:1}}],reward:{}},
 {id:'boon',name:'天意石阶',kind:'buff',description:'本次探索内选择一种临时加护，不永久增加角色属性。',choices:[{id:'attack',label:'剑光加护',buff:{attack:.1}},{id:'defense',label:'玄甲加护',buff:{defense:.15}},{id:'vigor',label:'回春加护',buff:{healing:.15}}],reward:{}},
 {id:'curse',name:'失衡阵眼',kind:'event',description:'修复阵眼需少量材料；也可绕行，不会锁死探索。',choices:[{id:'repair',label:'以三株灵草修复',cost:{materials:{herb:3}},reward:{materials:{essence:5}}},{id:'bypass',label:'绕行',buff:{dodge:.03}}],reward:{}},
 {id:'merchant',name:'云游行商',kind:'shop',description:'以灵石换药材或碎片，价格和完整收益在选择前显示。',choices:[{id:'herb',label:'200灵石换12灵草',cost:{stones:200},reward:{materials:{herb:12}}},{id:'insight',label:'300灵石换8参悟砂',cost:{stones:300},reward:{materials:{insight:8}}},{id:'leave',label:'继续探索'}],reward:{}},
 {id:'escort',name:'迷路采药人',kind:'event',description:'引导采药人到安全地点，获得感谢；调查遗迹也得到等值奖励。',choices:[{id:'help',label:'护送采药人',reward:{stones:300,materials:{herb:6}}},{id:'map',label:'交换路径情报',reward:{stones:300,materials:{ore:4}}}],reward:{}},
 {id:'relic',name:'封存书匣',kind:'event',description:'记录书页或带走灵宝碎片；不会同时取得两份战利品。',choices:[{id:'book',label:'记录秘籍',reward:{fragments:{universal:5}}},{id:'treasure',label:'提取灵粹',reward:{materials:{essence:6}}}],reward:{}},
 {id:'exit',name:'归途阵门',kind:'exit',description:'携出已确认材料并结束本次探索，或冒险前行争取最终宝箱。',choices:[{id:'extract',label:'现在携出',extract:true},{id:'continue',label:'继续深入'}],reward:{}}
];
const caves=[
 {id:'cave_0',name:'云隐古府',realm:0,layer:9,theme:'残页与剑阵',school:'sword',nodes:6,description:'六节点古府。岔路在战斗、采集与古碑之间选择，最后击败守府灵。',roomWeights:{battle:3,elite:1,herb:2,ore:1,healing:2,insight:2,boon:2,curse:1,merchant:1,escort:1,relic:2,exit:1},finalBoss:0,rewards:{stones:1200,materials:{insight:8,essence:5},tickets:2,fragments:{sword_secret_1:5}},firstRewards:{treasures:['t4'],techniques:['sword_secret_1']},artKey:'map_1'},
 {id:'cave_1',name:'赤霄炉境',realm:1,layer:7,theme:'炼器与五行',school:'elements',nodes:7,description:'七节点炼器遗境。炉温与临时元素加护影响精英战，最终宝箱提供元素秘籍。',roomWeights:{battle:2,elite:2,herb:1,ore:3,healing:2,insight:1,boon:2,curse:2,merchant:2,escort:1,relic:1,exit:1},finalBoss:2,rewards:{stones:1600,materials:{ore:16,essence:7},tickets:3,fragments:{elements_secret_1:5}},firstRewards:{techniques:['elements_secret_1'],blueprints:['elements']},artKey:'map_3'},
 {id:'cave_2',name:'星桥裂隙',realm:2,layer:7,theme:'星图与心魔',school:'shadow',nodes:8,description:'八节点星桥探索。净化、护送与心魔房间交织，携出选择需要兼顾准备与收益。',roomWeights:{battle:2,elite:3,herb:1,ore:1,healing:2,insight:3,boon:2,curse:2,merchant:1,escort:2,relic:3,exit:1},finalBoss:5,rewards:{stones:2200,materials:{insight:14,essence:10},tickets:4,fragments:{shadow_secret_1:5}},firstRewards:{techniques:['shadow_secret_1'],treasures:['t6']},artKey:'map_5'}
];
caves.forEach(c=>{dungeons[c.id]=Object.assign({type:'cave',mechanics:[],duration:600},c);});
dungeons.trial={id:'trial',type:'trial',name:'大境突破试炼',realm:0,layer:10,description:'当前路线十层修为填满后进入。失败无掉级，重试无门票；胜利记录只开放突破资格，不发重复经济奖励。',mechanics:[],rewards:{},firstRewards:{},duration:120,artKey:'map_5'};
const trials=Array.from({length:6},(_,realm)=>({id:'trial_'+realm,realm,layer:10,name:['护脉筑基','结丹归心','元婴照影','化神护阵','雷火渡厄','自证大道'][realm],description:['稳住灵息，护住阵心三波。','交替处理两段灵压，保留一次打断。','心魔会复制最近神通，改变施法顺序。','守护阵眼并清除来袭灵污。','分配护盾度过三次雷火蓄力。','完成终境圆满试炼，不要求副修或恋爱。'][realm],
 mechanics:bosses[[0,2,5,6,8,11][realm]].mechanics,optionalPill:'break'+realm,rewards:{},terminal:realm===5}));

const chapters=[
 {id:0,name:'荒山入道',title:'雪夜青岚 · 荒山入道',description:'雪夜村民灵力枯竭。沈青岚带来镇山钟碎片，你在荒山洞府学会修行，并寻找药圃里相同的阵纹。山门冲霄台即将开赛，三层可报名：亲手连赢三场，让宗门记住你的名字。',requirements:[{key:'rank',count:4,label:'任一路首境五层'},{key:'dungeonWins',id:'resource_herb',count:1,label:'灵草秘境通关'}],goal:'任一路五层，通关灵草秘境一次',reward:{stones:500,xp:240,materials:{herb:12,lotus:3,insight:8},tickets:5,techniques:['sword_heart_0','body_heart_0']},after:'钟片指向一座被改造的丹炉。你带着村人的感谢进入宗门。'},
 {id:1,name:'宗门立身',title:'炉火疑云 · 宗门立身',description:'陆月衡被诬陷暗改丹炉。你在宗门试炼中查验器纹，清理山君，稳固第一重大境。',requirements:[{key:'rank',count:10,label:'任一路第二境一层'},{key:'sect',count:1,label:'加入宗门'},{key:'crafted',count:3,label:'炼丹三炉'},{key:'bossWins',id:'boss_0',count:1,label:'击败青甲山君'},{key:'dungeonWins',id:'arena_2',count:1,label:'冲霄斗技夺魁'}],goal:'第二境，加入宗门，炼丹三炉，击败山君，冲霄斗技夺魁',reward:{stones:1500,materials:{ore:16,herb:18,lotus:4,insight:12},tickets:10,blueprints:['body'],techniques:['array_skill_1']},after:'月衡的嫌疑洗清。旧丹炉记下的星纹通向雾海古府。'},
 {id:2,name:'古府疑云',title:'雾海问心 · 古府疑云',description:'闻素衍在古府发现地脉残影。钟原本依靠众人自愿供能，却被旧盟改成夺取灵息的阵法。',requirements:[{key:'rank',count:22,label:'任一路第三境三层'},{key:'bossWins',id:'boss_4',count:1,label:'击败寒鸦真人'},{key:'tower',count:20,label:'问道塔二十层'},{key:'dungeonWins',id:'secret_2',count:1,label:'云隐秘境夺魁'}],goal:'第三境三层，寒鸦真人，问道塔二十层，云隐秘境夺魁',reward:{stones:4000,materials:{ore:24,lotus:6,insight:20,essence:12},tickets:12,techniques:['elements_heart_1'],treasures:['t3']},after:'你取得旧盟档案，证明镇山钟本是保护地脉的器物。'},
 {id:3,name:'劫火人间',title:'裂镜旧盟 · 劫火人间',description:'旧盟继续汲取地脉，山下城镇被劫火困住。你可以先守住人群，或先追寻阵眼，伙伴尊重你的选择。',requirements:[{key:'rank',count:32,label:'任一路第四境三层'},{key:'bossWins',id:'boss_6',count:1,label:'击败缚灵树王'},{key:'manualWins',count:30,label:'主动挑战三十胜'}],goal:'第四境三层，树王，主动挑战三十胜',reward:{stones:8000,materials:{herb:36,ore:32,lotus:8,insight:24},tickets:15,techniques:['shadow_skill_3']},after:'你夺回钟心，断开强迫供能的旧阵。同行无需以结契证明。'},
 {id:4,name:'天道裂隙',title:'星桥追凶 · 天道裂隙',description:'莫无迁要牺牲城池封住凌渊。素衍重建星桥，你追踪熔炉与幻阵，证明自愿协作也能守住裂隙。',requirements:[{key:'rank',count:46,label:'任一路第五境七层'},{key:'bossWins',id:'boss_8',count:1,label:'击败熔炉傀儡'},{key:'bossWins',id:'boss_9',count:1,label:'击败月蚀灵狐'}],goal:'第五境七层，熔炉与月蚀双妖王',reward:{stones:15000,materials:{ore:48,lotus:10,insight:36,essence:24},tickets:20,techniques:['array_heart_1']},after:'星桥重开，最后钟片留在天隙阵眼。'},
 {id:5,name:'自证大道',title:'长明之约 · 自证大道',description:'镇山钟即将复原。你完成终境试炼，与同行者建立能自愿加入也能退出的新约，决定自己的归途。',requirements:[{key:'rank',count:59,label:'任一路终境十层'},{key:'bossWins',id:'boss_11',count:1,label:'击败天隙劫兽'},{key:'endingTrial',count:1,label:'完成任一路终境试炼'}],goal:'终境十层，天隙劫兽，终境试炼',reward:{stones:26000,materials:{ore:60,lotus:12,insight:48,essence:32,soul:3},tickets:30,treasures:['t11']},after:'钟声长明，每个人都能自由选择自己的道路。'}
];
chapters.forEach(c=>{c.choices={protect:{text:'先守护受困之人，再追索证据。',mercy:1},seek:{text:'先追查阵眼，让灾难不再重演。',truth:1}};c.artKey='map_'+c.id;});

const companions={
 qinglan:{id:'qinglan',name:'沈青岚',age:27,role:'巡山剑修',favorite:'lotus',description:'追索镇山钟碎片，愿守住山脚村落。',quote:'同行须出于本心，停下来也无需理由。',dialogues:['青岚与你并肩看云：道途再远，也从眼前的人开始。','她讲起留守山门的原因，认真倾听你的回答。','你们交换巡山路线，她把最难的阵纹留给彼此讨论。'],bondText:'青岚自愿与你结下同道之契：彼此信任，也保留独行的自由。',jointText:'灵息汇成细雨般的光。你们循同一节律吐纳，青岚说：与你同行，我更能看清自己的路。',artKey:'qinglan',questIds:['qinglan_0','qinglan_1','qinglan_2','qinglan_3']},
 yueheng:{id:'yueheng',name:'陆月衡',age:31,role:'丹道医者',favorite:'herb',description:'调查被改造的丹炉，擅长调和灵息。',quote:'先照顾自己，才能把一盏灯传给别人。',dialogues:['月衡端来温茶：丹药补的是气，耐心照见的是人。','你们校对丹方，他认真记下你的想法。','他说医者也会疲倦，愿把今天的担忧坦诚说给你听。'],bondText:'月衡自愿与你结契：愿以尊重和坦诚，照看彼此的道途。',jointText:'丹炉清光映照平稳呼吸。你们轮流引导灵息，月衡说：默契可以慢慢练，无需勉强。',artKey:'yueheng',questIds:['yueheng_0','yueheng_1','yueheng_2','yueheng_3']},
 suyan:{id:'suyan',name:'闻素衍',age:25,role:'星图阵师',favorite:'ore',description:'绘制星桥阵图，追寻被隐去的历史。',quote:'阵法可以相合，心意不能强求。',dialogues:['素衍展开星图：每一点光都有自己的方向。','你们校准罗盘，她把空白页留给你的计划。','她向你解释新阵图上的退路：任何同行都应保留选择。'],bondText:'素衍自愿交换同道契，约定平等相待，随时表达不同意见。',jointText:'星纹缓缓流转，你们的灵息形成安稳回环。素衍收起阵盘：今日的同行，是我们共同的选择。',artKey:'suyan',questIds:['suyan_0','suyan_1','suyan_2','suyan_3']}
};
const req=(key,count,label,id)=>Object.assign({key,count,label},id?{id}:{});
const sidequests=[];
const personal=[
 ['qinglan',[
 ['钟片微光','青岚邀你辨认镇山钟碎片，药圃留下同样的汲灵纹。',[req('rank',2,'首境三层'),req('affinity',8,'青岚好感', 'qinglan')],{stones:200,materials:{herb:8},fragments:{sword_skill_0:5}},'你们确认碎片属于保护地脉的旧钟。'],
 ['山门旧愿','她想守住村落，也想看看山外。帮助她巡山，不替她作决定。',[req('rank',6,'首境七层'),req('bossWins',1,'击败山君','boss_0'),req('affinity',20,'青岚好感','qinglan')],{stones:600,materials:{insight:8},techniques:['sword_skill_1']},'青岚愿把新的巡山路与你分享。'],
 ['并肩而行','整理巡山日志，讨论结契或保持同行；任务本身不要求建立恋爱关系。',[req('rank',13,'第二境四层'),req('affinity',35,'青岚好感','qinglan')],{stones:1200,materials:{ore:12,lotus:3},techniques:['sword_secret_0']},'她尊重你的选择，同行的信任不只一种形式。'],
 ['云外之路','帮她把守山经验写成给后来人的札记，完成一次高阶守护挑战。',[req('rank',32,'第四境三层'),req('bossWins',1,'击败树王','boss_6'),req('affinity',50,'青岚好感','qinglan')],{stones:3500,materials:{insight:18,essence:8},fragments:{universal:10}},'青岚终于为自己安排一段云外游历。']
 ]],
 ['yueheng',[
 ['一炉温药','月衡教你辨认材料，先把药送给受伤的采药人。',[req('crafted',1,'炼丹一炉'),req('affinity',8,'月衡好感','yueheng')],{stones:200,materials:{herb:10},pills:{heal0:3}},'他在丹方页边写下你的观察。'],
 ['疑方求证','查明旧丹炉为何变得急躁，正确炼制与照顾自己同样重要。',[req('crafted',5,'炼丹五炉'),req('rank',10,'第二境'),req('affinity',20,'月衡好感','yueheng')],{stones:700,materials:{lotus:4,insight:6},techniques:['array_skill_1']},'月衡洗清误解，却更关心医者如何不被耗尽。'],
 ['共守灯火','协作修改诊疗记录，可选择同道之契，也能以朋友身份完成。',[req('rank',16,'第二境七层'),req('affinity',35,'月衡好感','yueheng')],{stones:1400,materials:{herb:18},techniques:['array_secret_0']},'你们约定互相提醒休息，不把关怀当成负担。'],
 ['医道长明','为新书院写出能让普通人理解的丹典。',[req('rank',40,'第五境'),req('crafted',30,'炼丹三十炉'),req('affinity',50,'月衡好感','yueheng')],{stones:3800,materials:{lotus:8,insight:20},pills:{heal2:2,purify2:2}},'丹典附上了清楚的替代材料与警示。']
 ]],
 ['suyan',[
 ['星图初识','素衍请你校准罗盘，从一块普通矿石的灵纹开始。',[req('rank',2,'首境三层'),req('affinity',8,'素衍好感','suyan')],{stones:200,materials:{ore:8,insight:3}},'空白星图多了一条可以返回的路。'],
 ['缺失一页','在云隐古府里查找被隐去的阵法记录。',[req('dungeonWins',1,'探索云隐古府','cave_0'),req('affinity',20,'素衍好感','suyan')],{stones:800,materials:{essence:6},techniques:['array_skill_2']},'她发现旧盟删去了退出供能的方法。'],
 ['自由回环','一起重绘能随时退出的供能阵，不以结契作为任务条件。',[req('rank',23,'第三境四层'),req('affinity',35,'素衍好感','suyan')],{stones:1600,materials:{insight:12,ore:12},techniques:['array_secret_1']},'新的阵图把自由选择写在了核心。'],
 ['星桥归途','在天隙之前留下可供所有人返回的路标。',[req('rank',50,'终境一层'),req('tower',40,'问道塔四十层'),req('affinity',50,'素衍好感','suyan')],{stones:4200,materials:{essence:16,lotus:6},fragments:{universal:12}},'素衍收起星图，下一次旅程由自己决定。']
 ]]
];
personal.forEach(([companion,rows])=>rows.forEach((r,step)=>sidequests.push({id:companion+'_'+step,companion,step,name:r[0],description:r[1],requirements:r[2],reward:r[3],after:r[4],previous:step?companion+'_'+(step-1):null,artKey:companion})));
sidequests.push(
 {id:'world_forge',name:'器道修复',description:'修复古器台，学习六套装备的永久蓝图。材料来自矿石秘境，打造红装不依赖抽取。',requirements:[req('rank',10,'第二境一层'),req('dungeonWins',3,'矿石秘境三胜','resource_ore')],reward:{stones:1800,materials:{ore:16,crystal1:24},blueprints:Object.keys(schools)},after:'器台六枚印记点亮，所有套装蓝图已学会。',artKey:'map_1'},
 {id:'world_sect',name:'六门问道',description:'任一入门论道后整理学到的经验，自选流派没有永久门派限制。',requirements:[req('sect',1,'加入宗门'),req('sectTrialCount',1,'任一宗门试炼')],reward:{stones:600,contribution:50,materials:{insight:12},techniques:['elements_skill_0','shadow_skill_0']},after:'宗门允许旁听六门，不以出身限制传承。',artKey:'map_0'},
 {id:'world_tower',name:'雷霄余响',description:'登上问道塔雷霄主题，记录不同雷术的连结。',requirements:[req('tower',30,'问道塔三十层')],reward:{stones:2200,materials:{insight:16},techniques:['thunder_secret_1']},after:'雷声落下，余响成为可以参悟的文字。',artKey:'map_2'},
 {id:'world_garden',name:'旧圃新生',description:'多次巡护灵圃，找出药材衰败的原因，不要求定时登录。',requirements:[req('dungeonWins',8,'灵草秘境八胜','resource_herb'),req('crafted',8,'炼丹八炉')],reward:{stones:1200,materials:{herb:24,lotus:8},pills:{qi1:2}},after:'灵圃恢复，后来人也能从这里获得药材。',artKey:'map_0'},
 {id:'world_relic',name:'失落传承',description:'探索三个古府路线中的书匣，整理可供宗门开放的旧经。',requirements:[req('rank',26,'第三境七层'),req('dungeonWins',1,'星桥裂隙通关','cave_2')],reward:{stones:3000,materials:{essence:14,insight:18},techniques:['shadow_secret_1','elements_secret_1']},after:'失落的传承被重新公开，不再由单一势力封存。',artKey:'map_4'},
 {id:'world_escort',name:'河桥长明',description:'清除玄河封锁，让运送阵心的队伍平安返回。',requirements:[req('bossWins',1,'玄河守将','boss_10')],reward:{stones:6000,materials:{crystal5:24,ore:30},treasures:['t11']},after:'河桥灯火重燃，每一位同行者都有安全归途。',artKey:'map_5'}
);
const commissions={
 hunt:{id:'hunt',name:'巡山除祟',key:'manualWins',required:5,description:'累计五场有效主动胜利即可领取；不按日重置。',rewards:{stones:500,contribution:20,materials:{herb:10,ore:4},tickets:2,crystal:4}},
 alchemy:{id:'alchemy',name:'丹药济世',key:'crafted',required:5,description:'累计炼丹五炉，领取后以新的实际炼制进度继续。',rewards:{stones:500,contribution:25,materials:{insight:6,herb:10},tickets:2,crystal:4}},
 boss:{id:'boss',name:'妖王讨伐',key:'bosses',required:2,description:'累计击败两位符合当前进度的妖王，委托无需等到次日。',rewards:{stones:800,contribution:30,materials:{ore:6,lotus:2},tickets:2,crystal:4}}
};
const regions=[
 {id:'region_0',name:'青岚山麓',realm:0,description:'灵圃、矿洞与初入宗门的山路。',mapKeys:['map_0','map_1']},
 {id:'region_1',name:'镜湖云府',realm:1,description:'雷渊与镜湖交汇，古器台等待修复。',mapKeys:['map_2','map_3']},
 {id:'region_2',name:'雾海残墟',realm:2,description:'寒鸦古府与心魔石林掩藏旧盟档案。',mapKeys:['map_4','map_5']},
 {id:'region_3',name:'赤霄地脉',realm:3,description:'被缚灵根须与影卫守护的地脉。',mapKeys:['map_6','map_7']},
 {id:'region_4',name:'星桥天隙',realm:4,description:'熔炉幻境、月蚀宫与破碎的星桥。',mapKeys:['map_8','map_9']},
 {id:'region_5',name:'长明凌渊',realm:5,description:'玄河与终境雷劫，自证大道的归途。',mapKeys:['map_10','map_11']}
];
const endings={
 guardian:{id:'guardian',title:'同道长明',text:'你留在山门守护镇山钟，让自愿相聚的灵息化为长夜中的灯。每个人都能加入，也能选择离开。'},
 wanderer:{id:'wanderer',title:'人间自由',text:'带着同行者的祝愿，你踏遍人间，把新的星图与丹方交给愿意学习的人。每次相逢都出于心愿。'},
 teacher:{id:'teacher',title:'桃李照夜',text:'你开设不问出身的书院，教授修行、丹道和护阵，让下一代自由选择自己的道路。'}
};
const gacha={
 name:'天道万象',unlock:{realm:1,layer:1},categories:['gear','treasure','technique','pill','material'],
 jointWeights:{gear:[4,8,9,5,3.5,.5],treasure:[0,3,4,5,2.7,.3],technique:[3,7,6,3,.8,.2],pill:[10,8,1,1,0,0],material:[8,4,2,1,0,0]},
 highGuarantee:10,redGuarantee:80,softStart:51,baseRed:.01,softStep:.005,targetChance:.5,
 dustPerDraw:2,historyLimit:200,description:'先判红，再判橙保底；十连逐次执行。定向失手后下一红必为目标，换目标保留计数与状态。'
};
const shop={jadePerDraw:60,historyLimit:50,packages:[
 {id:'p6',name:'初入仙途',priceYuan:6,jade:60},
 {id:'p30',name:'云海灵匣',priceYuan:30,jade:330},
 {id:'p68',name:'紫府玉藏',priceYuan:68,jade:780},
 {id:'p128',name:'瑶台宝库',priceYuan:128,jade:1500},
 {id:'p328',name:'天阙仙藏',priceYuan:328,jade:4200},
 {id:'p648',name:'万象道藏',priceYuan:648,jade:9000}
]};
const limits={bag:300,overflow:1000,drawHistory:200,battleReports:20,saveBytes:1048576,number:1e12};
const catalog={version:3,contentVersion:3,realms,routes,layerXp,realmXpFactors,rarities,slots,schools,techniques,
 facilities,recipes,treasures,sets,gearTargets,materials,monsters,rivals,dungeons,bosses,towerFloors,towerThemes,caveRooms,caves,trials,
 chapters,sidequests,companions,commissions,tasks:commissions,regions,endings,gacha,shop,limits,
 tickMs:1000,offlineCapMs:86400000,productionCapMs:604800000,sweepCapMs:28800000,
 techniqueLevelCaps:[5,8,11,14,17,20],enhanceCaps:[5,8,12,16,20,20],
 jointCost:{stones:30,materials:{herb:2}},jointCooldownMs:1800000,bondThreshold:40,jointThreshold:55,
 fragmentCost:20,duplicateTechniqueFragments:5,
 counts:{techniques:48,hearts:12,skills:24,secrets:12,treasures:12,recipes:18,sets:6,gearTargets:36,facilities:5,resources:5,sectTrials:12,bosses:12,towerFloors:60,caves:3,caveRooms:12,chapters:6,sidequests:18,companions:3,maps:12,competitions:2,tournamentBattles:6,monsters:20,rivalPortraits:6,ascensionChallenges:4,immortalHunts:3}
};
return catalog;
});
