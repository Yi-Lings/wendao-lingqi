(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./data.js'), require('./core.js'), require('./economy.js'));
  else root.WendaoCombat = factory(root.WendaoData, root.WendaoCore, root.WendaoEconomy);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (C, K, Economy) {
  'use strict';
  var resourceNames = {sword:'剑意',body:'山势',thunder:'雷印',elements:'五行轮转',shadow:'蚀魄',array:'阵力'};
  var clamp = function(v,a,b){return Math.max(a,Math.min(b,Number(v)||0));};
  var round = function(v){return Math.round(v*100)/100;};
  function rand(b){var x=b.rng>>>0;x^=x<<13;x^=x>>>17;x^=x<<5;b.rng=x>>>0;return b.rng/4294967296;}
  function loadout(s){return s.loadouts[s.route]||{};}
  function technique(s,id,b){return C.techniques[id]&&(s.techniques[id]||(b&&b.loanSkills&&b.loanSkills.indexOf(id)>=0))?C.techniques[id]:null;}
  function configuredSkills(s,b){return b&&b.loanSkills?b.loanSkills:(loadout(s).skills||[]);}
  function learned(s,id){return !!s.techniques[id];}
  function mastery(s,id){var level=((s.techniques[id]||{}).level||1);return K.techniqueEffects?K.techniqueEffects(s,id):{effectMultiplier:level>=10?1.1:1,powerMultiplier:level>=15?1.1:1,intervalMultiplier:level>=15?.9:1,cooldownMultiplier:level>=15?.9:1};}
  function passiveScale(s,id){var m=mastery(s,id);return (1+clamp(((s.techniques[id]||{}).level||1)-1,0,19)*.02)*m.effectMultiplier*m.powerMultiplier;}
  function heartScale(s){var m=mastery(s,heart(s).id);return m.effectMultiplier*m.powerMultiplier;}
  function triggerTime(s,id,seconds){return seconds*((s.techniques[id]||{}).branch===1?.88:1)*mastery(s,id).intervalMultiplier;}
  function secret(s,school,n){return (loadout(s).secrets||[]).indexOf(school+'_secret_'+n)>=0;}
  function heart(s){return C.techniques[loadout(s).heart]||{school:'thunder',id:'thunder_heart_0'};}
  function passive(s,id){return (loadout(s).treasures||[]).slice(1).indexOf(id)>=0&&!!s.ownedTreasures[id];}
  function activeTreasure(s){var id=(loadout(s).treasures||[])[0];return C.treasures[id]&&s.ownedTreasures[id]&&C.treasures[id].kind==='active'?C.treasures[id]:null;}
  function redSets(s){var out={};Object.keys(s.equipped).forEach(function(slot){var g=s.bag.find(function(x){return x.uid===s.equipped[slot];});if(g&&g.rarity===5)out[g.special||g.set]=true;});return out;}
  function mechanicEvent(b,kind,message,handled){b.mechanismEvents=b.mechanismEvents||[];b.mechanismEvents.push({at:round(b.time),kind:kind,message:message,handled:handled===undefined?null:!!handled});if(b.mechanismEvents.length>60)b.mechanismEvents.shift();}
  function note(b,msg){b.log.push({time:round(b.time),message:msg});if(b.log.length>36)b.log.shift();}
  function effect(list,id,duration,amount,stacks){var old=list.find(function(x){return x.id===id;});if(old){old.remaining=Math.max(old.remaining,duration);old.elapsed=0;old.amount=amount===undefined?old.amount:amount;old.stacks=stacks===undefined?old.stacks:stacks;}else list.push({id:id,remaining:duration,amount:amount||0,stacks:stacks||1,tick:0,elapsed:0});}
  function status(list,id){return list.find(function(x){return x.id===id;});}
  function alive(b){return b.enemies.filter(function(e){return e.hp>0;});}
  function target(b,index){var e=b.enemies[Number.isInteger(index)?index:b.target];if(e&&e.hp>0)return e;var a=alive(b);if(a[0]&&!Number.isInteger(index))b.target=b.enemies.indexOf(a[0]);return a[0]||null;}
  function setResource(b,n){b.player.resource=clamp(n,0,10);}
  function purify(s,b,count){var p=b.player,removedIds=[],bad=['burn','poison','thunder','charm','root','drain','weak','confuse'],removed=0;
    for(var i=p.statuses.length-1;i>=0&&removed<count;i--)if(bad.indexOf(p.statuses[i].id)>=0){removedIds.push(p.statuses[i].id);p.statuses.splice(i,1);removed++;}
    if(removed){b.performance.handled++;note(b,'净化了 '+removed+' 项负面状态');mechanicEvent(b,'purify','净化了'+removedIds.join('、'),true);if(secret(s,'array',0)&&(b.temporary.cleanseSecretGate||0)<=0){effect(p.statuses,'immune',4*passiveScale(s,'array_secret_0'));status(p.statuses,'immune').ids=removedIds.slice();b.temporary.cleanseSecretGate=triggerTime(s,'array_secret_0',8);}if((b.sets.array||0)>=4&&(b.temporary.arraySetGate||0)<=0){p.mp=Math.min(p.maxMp,p.mp+5);['array_skill_0','body_skill_3'].forEach(function(id){b.cooldowns[id]=Math.max(0,(b.cooldowns[id]||0)-1);});b.temporary.arraySetGate=6;}if(passive(s,'t7')&&(b.temporary.cleanseGate||0)<=0){effect(p.statuses,'immune',4);delete status(p.statuses,'immune').ids;b.temporary.cleanseGate=8;}}
    return removed;
  }

  function shield(s,b,amount,duration){var p=b.player;amount*=1+(Number(p.shieldPower)||0);amount=clamp(amount,0,p.maxHp*.8);p.shield=Math.max(p.shield,amount);p.shieldTime=Math.max(p.shieldTime,duration||8);return amount;}
  function heal(s,b,amount){var p=b.player,arrayExists=status(p.statuses,'manaArray')||status(p.statuses,'starArray');amount*=1+clamp(p.healing,0,1)+(heart(s).id==='array_heart_0'&&arrayExists?.15*heartScale(s):0)+(status(p.statuses,'manaArray')?.1:0);
    var actual=Math.min(p.maxHp-p.hp,amount);p.hp+=actual;if(b.protect&&b.bossIndex===10)b.protect.hp=Math.min(b.protect.maxHp,b.protect.hp+actual*.5);var over=amount-actual;
    if(over>0&&((secret(s,'array',1)&&arrayExists)||passive(s,'t9'))){var ratio=secret(s,'array',1)&&arrayExists?.35*passiveScale(s,'array_secret_1'):.2;p.shield=Math.max(p.shield,Math.min(p.maxHp*.2,p.shield+over*ratio));p.shieldTime=Math.max(p.shieldTime,8);}
    if(over>0&&arrayExists&&b.red.array&&(b.temporary.arrayRedGate||0)<=0){b.treasureCooldown=Math.max(0,b.treasureCooldown-2);b.temporary.arrayRedGate=10;}
    return actual;
  }
  function interrupt(b,e){if(e&&e.casting&&e.casting.interruptible){note(b,e.name+'的「'+e.casting.name+'」被打断');mechanicEvent(b,e.casting.kind,'成功打断'+e.name+'的'+e.casting.name,true);e.casting=null;e.mechanicTimer=Math.max(e.mechanicTimer,6);b.performance.interrupts++;b.performance.handled++;effect(e.statuses,'vulnerable',4,.15);if(b.red.shadow&&(b.temporary.shadowRedGate||0)<=0){effect(b.player.statuses,'shadowRed',12);b.temporary.shadowRedGate=8;}if(e.bossIndex===8){var heat=status(e.statuses,'heat');if(heat)heat.stacks=Math.max(0,heat.stacks-35);}return true;}return false;}
  function damageEnemy(s,b,e,amount,options){if(!e||e.hp<=0)return 0;options=options||{};var p=b.player,crit=false,school=b.activeSchool;
    if(!options.dot&&!options.fixed){var rate=clamp(p.crit,0,.65);if(rand(b)<rate){crit=true;amount*=clamp(p.critDamage||1.5,1.2,2.8);if(heart(s).id==='sword_heart_0')setResource(b,Math.min(5,p.resource+1));if(secret(s,'sword',0)&&(b.temporary.swordSecretGate||0)<=0){effect(p.statuses,'swordPen',8,.15*passiveScale(s,'sword_secret_0'));b.temporary.swordSecretGate=triggerTime(s,'sword_secret_0',6);}}
      var pen=clamp((p.penetration||0)+(b.temporary.skillPen||0)+(school==='sword'&&status(p.statuses,'swordPen')?status(p.statuses,'swordPen').amount:0),0,.7),armor=e.defense*(1-pen),broken=status(e.statuses,'armorBreak');if(broken)armor*=1-clamp(broken.amount,0,.65);amount=Math.max(amount*.2,amount-armor*.55);if(school==='sword'&&status(p.statuses,'swordPen'))p.statuses=p.statuses.filter(function(x){return x.id!=='swordPen';});
    }
    var vulnerable=status(e.statuses,'vulnerable');if(vulnerable)amount*=1+(vulnerable.amount||.15);
    if(status(e.statuses,'protected')&&!options.dot)amount*=.6;
    if(options.dot)amount*=1+clamp(p.dotDamage||0,0,1)+(heart(s).id==='shadow_heart_0'&&status(e.statuses,'erosion')&&status(e.statuses,'soulfire')?.2*heartScale(s):0);
    if(school==='sword'&&(b.sets.sword||0)>=4&&status(e.statuses,'armorBreak'))amount*=1.15;
    if(school==='sword'&&heart(s).id==='sword_heart_1'&&b.temporary.openingTarget===e.id)amount*=1+p.resource*.06*heartScale(s);
    var element=options.element||(school==='thunder'?'thunder':school==='shadow'?'shadow':school==='sword'||school==='body'?'physical':null);if(e.bossIndex===8&&element==='fire'){var furnace=status(e.statuses,'heat');effect(e.statuses,'heat',60,0,Math.min(100,(furnace?furnace.stacks:0)+10));}if(e.bossIndex===8&&element==='water'){var cool=status(e.statuses,'heat');if(cool){cool.stacks=Math.max(0,cool.stacks-30);mechanicEvent(b,'heat','寒潮使炉温降低30点',true);}}if(element&&e.resist&&e.resist[element])amount*=1-clamp(e.resist[element],0,.5);
    amount=Math.max(1,amount);var absorb=Math.min(e.shield,amount);e.shield-=absorb;amount-=absorb;e.hp=Math.max(0,e.hp-amount);
    if(status(e.statuses,'reflect')&&!options.dot&&amount>0){mechanicEvent(b,'reflect','反射期间仍使用直接攻击，受到镜壳反伤',false);}if(status(e.statuses,'reflect')&&!options.dot&&amount>0)damagePlayer(s,b,amount*(status(e.statuses,'reflect').amount||.25),'反射',true);
    if(crit)note(b,'会心！'+e.name+'受到 '+Math.round(amount)+' 点伤害');
    if(!options.dot&&p.lifesteal)heal(s,b,amount*clamp(p.lifesteal,0,.15));
    if(e.hp<=0&&!e.dead){e.dead=true;b.killCount=(b.killCount||0)+1;note(b,e.name+'被击败');if(e.role==='root'||e.role==='flower'||e.role==='guard'||e.role==='clone'){b.performance.handled++;mechanicEvent(b,'minion','已转火清除'+e.name,true);if(e.role==='root')purify(s,b,2);}
      if(secret(s,'thunder',0)&&(b.temporary.transferGate||0)<=0){var marks=status(e.statuses,'mark'),other=alive(b)[0];if(marks&&other){mark(other,Math.min(2+Math.floor((((s.techniques.thunder_secret_0||{}).level||1)-1)/8),marks.stacks));b.temporary.transferGate=triggerTime(s,'thunder_secret_0',1);}}
    }
    return amount;
  }
  function damagePlayer(s,b,amount,label,fixed){var p=b.player;if(p.hp<=0)return 0;
    var ev=status(p.statuses,'evade');if(!fixed&&rand(b)<clamp((p.dodge||0)+(ev?ev.amount:0),0,.4)){note(b,'闪避了'+label);b.performance.handled++;if((b.sets.shadow||0)>=4&&(b.temporary.shadowSetGate||0)<=0){b.treasureCooldown=Math.max(0,b.treasureCooldown-1);b.temporary.shadowSetGate=3;}return 0;}
    if(!fixed)amount=Math.max(amount*.18,amount-p.defense*.5);amount*=1-clamp(p.damageReduction,0,.65);var guard=status(p.statuses,'guard');if(guard&&!fixed)amount*=1-clamp(guard.amount||.25,0,.5);
    if(status(p.statuses,'vulnerable'))amount*=1.15;var previousShield=p.shield,absorbed=Math.min(p.shield,amount);p.shield-=absorbed;amount-=absorbed;p.hp=Math.max(0,p.hp-amount);b.performance.damageTaken+=amount;
    if(absorbed>0&&heart(s).id==='body_heart_0'){b.temporary.absorbed=(b.temporary.absorbed||0)+absorbed;var count=Math.floor(b.temporary.absorbed/(p.maxHp*.06/heartScale(s)));if(count){setResource(b,Math.min(5,p.resource+count));b.temporary.absorbed-=count*p.maxHp*.06/heartScale(s);}}
    if(amount>0&&!fixed&&heart(s).id==='body_heart_1'&&(b.temporary.spiritGate||0)<=0){setResource(b,Math.min(5,p.resource+1));b.temporary.spiritGate=triggerTime(s,heart(s).id,1);}
    if(amount>0&&!fixed&&secret(s,'body',1)&&(b.temporary.bodyMpGate||0)<=0){p.mp=Math.min(p.maxMp,p.mp+5*passiveScale(s,'body_secret_1'));b.temporary.bodyMpGate=triggerTime(s,'body_secret_1',3);}
    if(previousShield>0&&p.shield<=0){if(secret(s,'body',0)&&(b.temporary.bodySecretGate||0)<=0){b.temporary.bodySecretGate=triggerTime(s,'body_secret_0',8);alive(b).forEach(function(e){damageEnemy(s,b,e,p.attack*.6*passiveScale(s,'body_secret_0'));});}
      if((b.sets.body||0)>=4)effect(p.statuses,'guard',4,.12);if(b.red.body&&(b.temporary.bodyRedGate||0)<=0){b.temporary.redQuake=2;b.temporary.bodyRedGate=10;}}
    return amount;
  }
  function addNegative(s,b,id,duration,amount,stacks){var immunity=status(b.player.statuses,'immune');if(immunity&&(!immunity.ids||immunity.ids.indexOf(id)>=0)){b.performance.handled++;return;}effect(b.player.statuses,id,duration,amount,stacks);note(b,'受到状态：'+({burn:'灼烧',poison:'侵蚀',thunder:'雷印',charm:'魅惑',root:'缠绕',drain:'抽取',weak:'虚弱',confuse:'镜惑'}[id]||id));}

  function mark(e,amount,s,b){var m=status(e.statuses,'mark'),n=Math.min(5,(m?m.stacks:0)+amount);effect(e.statuses,'mark',12,0,n);
    if(s&&b&&heart(s).id==='thunder_heart_0'&&n>=3&&(b.temporary.chainGate||0)<=0){b.temporary.chainGate=triggerTime(s,heart(s).id,1);damageEnemy(s,b,e,b.player.attack*.7);var other=alive(b).find(function(x){return x!==e;});if(other)damageEnemy(s,b,other,b.player.attack*.7);effect(e.statuses,'mark',12,0,n-3);e.statuses=e.statuses.filter(function(x){return x.id!=='mark'||x.stacks>0;});note(b,'九霄连锁引爆三层雷印');}}
  function erosion(e,power,stacks){var m=status(e.statuses,'erosion');effect(e.statuses,'erosion',10,power,clamp((m?m.stacks:0)+(stacks||1),1,5));}
  function skillPower(s,id){var t=C.techniques[id],level=(s.techniques[id]||{}).level||1;var m=mastery(s,id);return (Number(t.power)||1)*(1+(level-1)*.035)*m.effectMultiplier*m.powerMultiplier;}
  function elemental(s,b,e,element,amount){var p=b.player,h=heart(s),last=p.lastElement,reaction=null;
    if(h.id==='elements_heart_0'&&last&&last!==element&&(b.time-(b.temporary.elementAt||0))<=8){if(last==='wood'&&element==='fire')reaction='燃生';if(last==='fire'&&element==='water')reaction='蒸腾';if(last==='water'&&element==='wood')reaction='冻结';
      if(reaction&&(b.temporary.reactionGate||0)<=0){damageEnemy(s,b,e,p.attack*.45*heartScale(s),{fixed:true});if(reaction==='冻结')effect(e.statuses,'root',2);b.temporary.reactionGate=triggerTime(s,h.id,2);note(b,'五行反应：'+reaction);
        if(secret(s,'elements',0)&&(b.temporary.elementMpGate||0)<=0){p.mp=Math.min(p.maxMp,p.mp+6*passiveScale(s,'elements_secret_0'));b.temporary.elementMpGate=triggerTime(s,'elements_secret_0',3);}
        if(secret(s,'elements',1)&&b.temporary.lastReaction&&b.temporary.lastReaction!==reaction&&(b.temporary.elementSecretGate||0)<=0){effect(e.statuses,'elementWeak',6,.15*passiveScale(s,'elements_secret_1'));b.temporary.elementSecretGate=triggerTime(s,'elements_secret_1',8);}
        if((b.sets.elements||0)>=4){var burn=status(e.statuses,'burn');if(burn)burn.remaining=Math.min(10,burn.remaining+2);}
        if(b.red.elements){b.temporary.brightness=(b.temporary.brightness||0)+1;if(b.temporary.brightness>=3){amount+=p.attack*.3;b.temporary.brightness=0;}}
        b.temporary.lastReaction=reaction;
      }
    }else if(h.id==='elements_heart_1'){if(last===element)p.combo=Math.min(3,p.combo+1);else{amount*=1+p.combo*.15*heartScale(s);p.combo=1;}setResource(b,p.combo);}
    p.lastElement=element;b.temporary.elementAt=b.time;if(status(e.statuses,'elementWeak'))amount*=1+status(e.statuses,'elementWeak').amount;
    return damageEnemy(s,b,e,amount,{element:element});
  }
  function castSkill(s,b,id,index,automatic){var t=technique(s,id,b),p=b.player,e=target(b,index),lo=loadout(s),h=heart(s);
    if(!t||t.kind!=='skill'||configuredSkills(s,b).indexOf(id)<0||!e)return {ok:false,message:'未配置该神通'};
    var r=t.rules||{},school=t.school,n=Number(id.slice(-1)),level=(s.techniques[id]||{}).level||1,branch=(s.techniques[id]||{}).branch||0,support=(1+(level-1)*.02)*mastery(s,id).effectMultiplier*mastery(s,id).powerMultiplier;r=Object.assign({},r);['armorBreak','attackDown','stackBonus','openingBonus','reduction','dodge','dotPower','slow','lifesteal'].forEach(function(key){if(r[key])r[key]*=mastery(s,id).effectMultiplier;});
    var arrayId=id==='array_skill_2'?'manaArray':id==='array_skill_3'?'starArray':null,oldArray=arrayId&&status(p.statuses,arrayId);
    var canReap=h.id==='array_heart_1'&&oldArray&&(oldArray.elapsed||0)>=2;
    if(canReap){var age=Math.min(10,oldArray.elapsed||0);p.statuses=p.statuses.filter(function(x){return x.id!==arrayId;});if(arrayId==='starArray')alive(b).forEach(function(x){damageEnemy(s,b,x,p.attack*1.8*heartScale(s)*age/10);});else heal(s,b,p.maxHp*.2*heartScale(s)*age/10);note(b,'主动收起'+t.name+'，积蓄'+round(age)+'秒灵力');return {ok:true,message:'已收阵'};}
    if((b.cooldowns[id]||0)>0)return {ok:false,message:'神通尚在冷却'};
    var cost=Number(t.mp)||0;if(school==='sword'&&status(p.statuses,'swordRefund')){cost*=.5;p.statuses=p.statuses.filter(function(x){return x.id!=='swordRefund';});}
    if(school==='thunder'&&status(p.statuses,'thunderRefund')){cost*=.7;p.statuses=p.statuses.filter(function(x){return x.id!=='thunderRefund';});}
    if(p.mp<cost)return {ok:false,message:'真元不足'};
    if(status(p.statuses,'charm'))return {ok:false,message:'魅惑中，可使用净化丹解除'};
    var power=p.attack*skillPower(s,id)*(branch===1?.95:1),isAttack=Number(t.power)>0;
    if(isAttack&&secret(s,'sword',1)&&b.time-(b.temporary.lastAttackCast===undefined?-99:b.temporary.lastAttackCast)>=6)power*=1+.25*passiveScale(s,'sword_secret_1');
    p.mp-=cost;b.cooldowns[id]=Math.max(.8,(Number(t.cooldown)||10)*(branch===1?.88:1)*mastery(s,id).cooldownMultiplier*(1-clamp(p.cooldownReduction,0,.4)));b.lastSkill=id;b.temporary.skillCount=(b.temporary.skillCount||0)+1;if(!b.practice)s.stats.skillCasts++;b.activeSchool=school;
    note(b,'施展「'+t.name+'」');
    if(school==='sword'){
      if(n===0){damageEnemy(s,b,e,power);effect(e.statuses,'armorBreak',r.duration||8,r.armorBreak||.25);}
      if(n===1)for(var hit=0;hit<(r.hits||3);hit++)damageEnemy(s,b,e,power/(r.hits||3));
      if(n===2){effect(p.statuses,'swordDomain',r.duration||10,p.attack*skillPower(s,id));alive(b).forEach(function(x){effect(x.statuses,'weak',r.duration||10,r.attackDown||.08);});}
      if(n===3){damageEnemy(s,b,e,power*(1+p.resource*(h.id==='sword_heart_1'?(r.openingBonus||.12):(r.stackBonus||.18))*heartScale(s)));setResource(b,0);}
      if(h.id==='sword_heart_1'){if(b.temporary.openingTarget!==e.id){setResource(b,0);b.temporary.openingTarget=e.id;}setResource(b,Math.min(4,p.resource+1));b.temporary.openingAt=b.time;}
    }else if(school==='body'){
      if(n===0){damageEnemy(s,b,e,power);interrupt(b,e);if(h.id==='body_heart_1'&&p.resource>=5){heal(s,b,p.maxHp*.1*heartScale(s));setResource(b,0);}}
      if(n===1)shield(s,b,p.maxHp*(r.shield||.3)*support*(branch===1?.95:1),r.duration||10);
      if(n===2){var quake=p.resource+(b.temporary.redQuake||0);alive(b).forEach(function(x){damageEnemy(s,b,x,power+p.attack*quake*(r.stackBonus||.15));interrupt(b,x);});setResource(b,0);b.temporary.redQuake=0;}
      if(n===3){heal(s,b,p.maxHp*(r.heal||.2)*support*(branch===1?.95:1));effect(p.statuses,'guard',r.duration||6,r.reduction||.25);}
    }else if(school==='thunder'){
      if(n===0){b.temporary.skillPen=.1;damageEnemy(s,b,e,power);mark(e,1,s,b);b.temporary.skillPen=0;}
      if(n===1){damageEnemy(s,b,e,power);interrupt(b,e);effect(p.statuses,'evade',r.duration||5,r.dodge||.2);mark(e,1,s,b);}
      if(n===2){var targets=alive(b);for(var j=0;j<(r.hits||5);j++)damageEnemy(s,b,targets[j%targets.length],power/(r.hits||5));mark(e,r.marks||2,s,b);}
      if(n===3){var m=status(e.statuses,'mark'),marks=m?m.stacks:0;damageEnemy(s,b,e,power+p.attack*marks*(r.stackBonus||.22)*heartScale(s));e.statuses=e.statuses.filter(function(x){return x.id!=='mark';});if((b.sets.thunder||0)>=4&&(b.temporary.thunderSetGate||0)<=0&&marks){damageEnemy(s,b,e,p.attack*.4);b.temporary.thunderSetGate=5;}if(b.red.thunder&&marks>=3&&(b.temporary.thunderRedGate||0)<=0){effect(p.statuses,'thunderRefund',12);b.temporary.thunderRedGate=8;}}
      if(secret(s,'thunder',1)&&b.temporary.lastThunder&&b.temporary.lastThunder!==id&&(b.temporary.thunderSecretGate||0)<=0){damageEnemy(s,b,e,p.attack*.45*passiveScale(s,'thunder_secret_1'));b.temporary.thunderSecretGate=triggerTime(s,'thunder_secret_1',5);}
      b.temporary.lastThunder=id;var mt=status(e.statuses,'mark');setResource(b,mt?mt.stacks:0);
    }else if(school==='elements'){
      if(n===0){elemental(s,b,e,'wood',power);interrupt(b,e);effect(e.statuses,'root',r.root||2);effect(e.statuses,'wood',8);}
      if(n===1){elemental(s,b,e,'fire',power);effect(e.statuses,'burn',r.duration||6,p.attack*(r.dotPower||.12),1);effect(e.statuses,'fire',8);}
      if(n===2){alive(b).forEach(function(x){elemental(s,b,x,'water',power);effect(x.statuses,'slow',r.duration||6,r.slow||.2);effect(x.statuses,'water',8);});}
      if(n===3){shield(s,b,p.maxHp*(r.shield||.25)*support,8);p.lastElement=null;p.combo=0;}
    }else if(school==='shadow'){
      if(n===0){damageEnemy(s,b,e,power);var er=status(e.statuses,'erosion');effect(e.statuses,'erosion',r.duration||8,p.attack*(r.dotPower||.18),Math.min(5,(er?er.stacks:0)+1));}
      if(n===1){damageEnemy(s,b,e,power);effect(e.statuses,'soulfire',r.duration||8,p.attack*(r.dotPower||.14),1);effect(e.statuses,'healingDown',r.duration||8,.25);}
      if(n===2){var dots=e.statuses.filter(function(x){return x.id==='erosion'||x.id==='soulfire';}),remaining=dots.reduce(function(total,x){return total+x.remaining*x.amount*(x.stacks||1)*.5;},0),count=dots.length;damageEnemy(s,b,e,power+remaining,{fixed:true});if(h.id==='shadow_heart_1'){damageEnemy(s,b,e,p.attack*.2*heartScale(s)*Math.min(3,count));p.mp=Math.min(p.maxMp,p.mp+4*heartScale(s)*Math.min(3,count));}e.statuses=e.statuses.filter(function(x){return x.id!=='erosion'&&x.id!=='soulfire';});interrupt(b,e);if(secret(s,'shadow',1)&&count&&(b.temporary.shadowHealGate||0)<=0){heal(s,b,p.maxHp*.08*passiveScale(s,'shadow_secret_1'));b.temporary.shadowHealGate=triggerTime(s,'shadow_secret_1',6);}}
      if(n===3){var actual=damageEnemy(s,b,e,power),bonus=status(p.statuses,'shadowRed');heal(s,b,actual*(r.lifesteal||.35)*(bonus?1.2:1));if(bonus)p.statuses=p.statuses.filter(function(x){return x.id!=='shadowRed';});effect(e.statuses,'weak',r.duration||6,r.attackDown||.1);}
      var st=status(e.statuses,'erosion');setResource(b,st?st.stacks:0);
    }else if(school==='array'){
      if(n===0){heal(s,b,p.maxHp*(r.heal||.18)*support*(branch===1?.95:1));effect(p.statuses,'hot',r.duration||6,p.maxHp*(r.hot||.04)*support,1);}
      if(n===1){purify(s,b,r.purify||2);heal(s,b,p.maxHp*(r.heal||.08)*support);}
      if(n===2)effect(p.statuses,'manaArray',r.duration||10,r.mp||5,1);
      if(n===3)effect(p.statuses,'starArray',r.duration||10,p.attack*(Number(t.power)||.35)*(branch===1?.95:1),1);
    }
    b.activeSchool=null;if(isAttack)b.temporary.lastAttackCast=b.time;
    if(passive(s,'t11')&&b.temporary.skillCount%4===0&&(b.temporary.bridgeGate||0)<=0){p.mp=Math.min(p.maxMp,p.mp+p.maxMp*.12);shield(s,b,p.maxHp*.12,7);b.temporary.bridgeGate=10;note(b,'星桥玉：真元回流');}
    return {ok:true,message:t.name+'已释放'};
  }

  function castTreasure(s,b){var t=activeTreasure(s),p=b.player,e=target(b);if(!t)return {ok:false,message:'未配置主动灵宝'};if(b.treasureCooldown>0)return {ok:false,message:'灵宝尚在冷却'};var level=(s.ownedTreasures[t.id]||{}).level||1,m=1+(level-1)*.05,r=t.rules||{};
    b.treasureCooldown=(Number(t.cooldown)||r.cooldown||28)*(1-clamp(p.cooldownReduction,0,.4));note(b,'催动「'+t.name+'」');
    if(t.id==='t0'){heal(s,b,p.maxHp*.3*m);purify(s,b,1);}
    else if(t.id==='t2'){damageEnemy(s,b,e,p.attack*1.8*m);effect(e.statuses,'armorBreak',8,.25);}
    else if(t.id==='t5'){shield(s,b,p.maxHp*.4*m,10);effect(e.statuses,'weak',6,.25);effect(p.statuses,'guard',6,.2);if(b.protect)b.protect.hp=Math.min(b.protect.maxHp,b.protect.hp+b.protect.maxHp*.2);}
    else if(t.id==='t8')alive(b).forEach(function(x){damageEnemy(s,b,x,p.attack*2.1*m);mark(x,2,s,b);});
    else if(t.id==='t10'){alive(b).forEach(function(x){interrupt(b,x);damageEnemy(s,b,x,p.attack*2.5*m);});shield(s,b,p.maxHp*.2*m,8);}
    else damageEnemy(s,b,e,p.attack*1.8*m);
    return {ok:true,message:t.name+'已催动'};
  }
  function takePill(s,b,id){var lo=loadout(s),r=C.recipes[id];if((lo.pills||[]).indexOf(id)<0||!r)return {ok:false,message:'该丹药不在携带栏'};if(b.potionCooldown>0)return {ok:false,message:'丹药共享冷却中'};if(!((b.practice?b.practicePills[id]:s.pills[id])>0))return {ok:false,message:'丹药数量不足'};if(['heal','shield','purify','break'].indexOf(r.kind)<0)return {ok:false,message:'该丹药不能在战斗中使用'};
    if(b.practice)b.practicePills[id]--;else{s.pills[id]--;s.stats.pillsUsed++;}b.performance.pills++;b.potionCooldown=15;var e=r.effect||{};note(b,'服用「'+r.name+'」');
    if(r.kind==='heal'){heal(s,b,b.player.maxHp*clamp(e.heal||.4,.05,.8));if(e.hot)effect(b.player.statuses,'pillHot',e.duration||6,b.player.maxHp*e.hot);}
    if(r.kind==='shield'){shield(s,b,b.player.maxHp*clamp(e.shield||.3,.05,.65),e.duration||10);if(e.reduction)effect(b.player.statuses,'guard',e.duration||10,e.reduction);}
    if(r.kind==='purify'){purify(s,b,Number(e.purify)||1);if(e.immunity){effect(b.player.statuses,'immune',e.immunity);delete status(b.player.statuses,'immune').ids;}}
    if(r.kind==='break'){heal(s,b,b.player.maxHp*(e.heal||.15));shield(s,b,b.player.maxHp*(e.trialShield||.2),e.duration||12);effect(b.player.statuses,'guard',e.duration||12,e.trialReduction||.1);}
    return {ok:true,message:'已服用'+r.name};
  }
  var mechanicSpecs=[
    {kind:'slam',name:'伏山重击',duration:3,hint:'伏岳掌/惊电步打断，或提前镇骨甲承伤后反击'},
    {kind:'bloom',name:'赤莲灼烧',duration:2,hint:'净尘诀/清心散净化，或火抗与回复承伤'},
    {kind:'storm',name:'五重雷劫',duration:2.5,hint:'净化雷印、打断引爆，或提前护盾吸收'},
    {kind:'shell',name:'镜湖反射',duration:1,hint:'反射期间暂缓直接爆发，可用持续侵蚀与回复'},
    {kind:'healClone',name:'寒鸦回生',duration:3,hint:'打断回复，或幽火降低回复并压血'},
    {kind:'copy',name:'无相映照',duration:2,hint:'打断复制，或先施放回复/防护降低复制威胁'},
    {kind:'roots',name:'树心汲灵',duration:1,hint:'打断树心抽取，或聚灵阵补充真元'},
    {kind:'twin',name:'双生换位',duration:1,hint:'切换到暴露弱点的目标，或群攻压制'},
    {kind:'overload',name:'熔炉过载',duration:3,hint:'打断降低炉温，寒潮冷却，或提前护盾反击'},
    {kind:'charm',name:'真实魅惑',duration:3,hint:'打断真实读条，或净化/免疫后续控制'},
    {kind:'escort',name:'封河箭雨',duration:2,hint:'清除封锁卫兵，或护盾与治疗支援护送目标'},
    {kind:'cataclysm',name:'天隙三劫',duration:3,hint:'分段打断、护盾和回复；三段气血阈值分别触发'}
  ];
  function addMinion(b,e,role,name,hpFraction){if(alive(b).length>=5)return;var hp=Math.max(60,e.maxHp*hpFraction),reuse=b.enemies.findIndex(function(x){return x.hp<=0&&x.role;});b.spawnCounter=(b.spawnCounter||0)+1;var minion={id:e.id+'_'+role+'_'+b.spawnCounter,name:name,hp:hp,maxHp:hp,attack:e.attack*.45,defense:e.defense*.5,shield:0,statuses:[],attackTimer:2.5,mechanicTimer:99,casting:null,phase:0,role:role,dead:false};if(reuse>=0)b.enemies[reuse]=minion;else if(b.enemies.length<12)b.enemies.push(minion);note(b,name+'进入战场');}
  function startMechanic(b,e,secondary){var spec=secondary||mechanicSpecs[e.bossIndex];if(!spec&&e.genericMechanic)spec={kind:e.genericMechanic,name:'守阵蓄力',duration:2.5,hint:'可打断读条，或以护盾/回复承受并处理状态'};if(!spec)return;e.casting={kind:spec.kind,name:spec.name,duration:spec.duration,remaining:spec.duration,hint:spec.hint,interruptible:spec.kind!=='shell'};note(b,e.name+'开始「'+spec.name+'」：'+spec.hint);mechanicEvent(b,spec.kind,e.name+'施放'+spec.name);
    if(spec.kind==='rootSummon')for(var n=0;n<2;n++)addMinion(b,e,'root','缚灵根须',.1);
    if(spec.kind==='blockade')for(var g=0;g<2;g++)addMinion(b,e,'guard','封河卫兵',.12);
  }
  function handledMechanic(b,c,message,ok){b.performance[ok?'handled':'missed']++;mechanicEvent(b,c.kind,message,ok);}
  function finishMechanic(s,b,e,c){var p=b.player,before=p.shield;
    if(c.kind==='slam'){damagePlayer(s,b,e.attack*2.1,'伏山重击');effect(e.statuses,'vulnerable',6,.25);effect(e.statuses,'armorBreak',6,.35);handledMechanic(b,c,before>e.attack?'护盾承住重击，已打开6秒破绽':'重击未打断且护盾不足，已打开6秒反击窗口',before>e.attack);}
    if(c.kind==='bloom'){damagePlayer(s,b,e.attack*.7,'赤莲火雨');addNegative(s,b,'burn',6,e.attack*.12,1);mechanicEvent(b,c.kind,'赤莲灼烧已附着：净化或回复可处理');}
    if(c.kind==='storm'){var m=status(p.statuses,'thunder'),st=m?m.stacks:0;damagePlayer(s,b,e.attack*2.4,'五重雷劫');handledMechanic(b,c,st===0?'雷印已净化，避开叠印引爆':before>e.attack?'护盾承住雷印引爆':'未净化雷印且护盾不足，雷劫引爆'+st+'层印记',st===0||before>e.attack);p.statuses=p.statuses.filter(function(x){return x.id!=='thunder';});}
    if(c.kind==='shell'){effect(e.statuses,'reflect',5,.25);note(b,'镜湖反射持续5秒：持续伤害不会触发反射');}
    if(c.kind==='healClone'){var reduced=!!status(e.statuses,'healingDown');e.hp=Math.min(e.maxHp,e.hp+e.maxHp*.15*(reduced?.75:1));handledMechanic(b,c,reduced?'幽火降低了寒鸦回生回复':'未打断寒鸦回生，敌人回复15%气血',reduced);}
    if(c.kind==='copy'){var last=C.techniques[b.lastSkill];if(last&&(last.school==='array'||last.id==='body_skill_1'||last.id==='body_skill_3')){damagePlayer(s,b,e.attack*.7,'柔和映照');handledMechanic(b,c,'以辅助神通诱导复制，降低复制伤害',true);}else{damagePlayer(s,b,e.attack*1.5,'无相复制');handledMechanic(b,c,'未打断复制且上一神通为攻击，受到复制伤害',false);}}
    if(c.kind==='confusion'){damagePlayer(s,b,e.attack*.5,'心魔侵蚀');addNegative(s,b,'poison',8,e.attack*.08,1);}
    if(c.kind==='roots'){p.mp=Math.max(0,p.mp-p.maxMp*.18);damagePlayer(s,b,e.attack*.7,'树心汲灵');handledMechanic(b,c,'树心汲灵未打断，抽取18%真元；聚灵阵可补充',!!status(p.statuses,'manaArray'));}
    if(c.kind==='rootSummon'){var roots=alive(b).some(function(x){return x.role==='root';});if(roots){addNegative(s,b,'drain',9,1.8,1);addNegative(s,b,'root',3,0,1);}handledMechanic(b,c,roots?'缚灵根须尚存，受到缠绕与抽取':'已清除根须，避免缠绕抽取',!roots);}
    if(c.kind==='twin'){e.phase=1-e.phase;var twins=alive(b).filter(function(x){return x.bossIndex===7||x.role==='twin';});twins.forEach(function(x,i){x.statuses=x.statuses.filter(function(z){return z.id!=='protected'&&z.id!=='vulnerable';});effect(x.statuses,i===e.phase?'vulnerable':'protected',12,.22);});note(b,'双生弱点交换：请查看目标状态');mechanicEvent(b,c.kind,'双生弱点已交换，转火或群攻处理');}
    if(c.kind==='overload'){damagePlayer(s,b,e.attack*2.6,'熔炉过载');effect(e.statuses,'heat',60,0,0);status(e.statuses,'heat').stacks=0;effect(e.statuses,'vulnerable',6,.2);handledMechanic(b,c,before>e.attack?'护盾承住过载，打开6秒反击窗口':'满温过载未打断且护盾不足',before>e.attack);}
    if(c.kind==='illusion'){effect(p.statuses,'illusion',4);note(b,'月蚀假象仅为幻象；查看真实魅惑状态再净化');mechanicEvent(b,c.kind,'月蚀假象出现，可辨认后保留净化');}
    if(c.kind==='charm'){damagePlayer(s,b,e.attack*1.5,'月蚀镜光');addNegative(s,b,'charm',3,0,1);handledMechanic(b,c,status(p.statuses,'charm')?'真实魅惑未打断：净尘诀或净化丹解除':'免疫阻止了真实魅惑',!status(p.statuses,'charm'));}
    if(c.kind==='escort'){var guards=alive(b).filter(function(x){return x.role==='guard';}).length;if(b.protect){var protectedNow=before>0||status(p.statuses,'guard'),hit=b.protect.maxHp*(guards?.16:.08);if(protectedNow)hit*=.35;b.protect.hp=Math.max(0,b.protect.hp-hit);handledMechanic(b,c,protectedNow?'护盾/护体保护了护送阵心':guards?'封锁卫兵仍在，护送阵心受到额外伤害':'已清卫兵，护送阵心承受基础箭雨',protectedNow||!guards);}damagePlayer(s,b,e.attack*1.1,'封河箭雨');}
    if(c.kind==='blockade'){damagePlayer(s,b,e.attack*.8,'封河封锁');mechanicEvent(b,c.kind,'两名封锁卫兵进场，需转火或群攻');}
    if(c.kind==='cataclysm'){damagePlayer(s,b,e.attack*2.3,'天隙雷劫');handledMechanic(b,c,before>e.attack?'预留护盾承住一段天隙雷劫':'一段天隙雷劫未打断且护盾不足',before>e.attack);}
    if(c.kind==='rift'){damagePlayer(s,b,e.attack*1.5,'裂隙爆发');addNegative(s,b,'burn',5,e.attack*.08,1);effect(e.statuses,'vulnerable',5,.3);effect(e.statuses,'armorBreak',5,.3);mechanicEvent(b,c.kind,'裂隙结束：净化灼烧并在5秒破绽爆发');}
    if(c.kind.indexOf('resource_')===0||c.kind.indexOf('sect_')===0||c.kind.indexOf('tower_')===0){damagePlayer(s,b,e.attack*1.5,'守阵蓄力');handledMechanic(b,c,before>e.attack?'护盾承住守阵蓄力':'守阵蓄力未打断且护盾不足',before>e.attack);if(c.kind==='resource_herb')addNegative(s,b,'poison',5,e.attack*.05,1);if(c.kind==='resource_insight')addNegative(s,b,'weak',5,.1,1);if(c.kind==='resource_essence')addNegative(s,b,'burn',5,e.attack*.06,1);if(c.kind==='resource_crystal')e.shield=e.maxHp*.05;if(c.kind==='sect_body')e.shield=e.maxHp*.1;if(c.kind==='sect_array')e.hp=Math.min(e.maxHp,e.hp+e.maxHp*.04);if(c.kind==='sect_thunder')addNegative(s,b,'thunder',6,0,2);if(c.kind==='sect_elements')addNegative(s,b,'burn',6,e.attack*.06,1);if(c.kind==='sect_shadow')addNegative(s,b,'drain',6,1,1);}
    if(b.type==='trial'&&b.protect){var protectedTrial=before>0||status(p.statuses,'guard');b.protect.hp=Math.max(0,b.protect.hp-b.protect.maxHp*(protectedTrial?.025:.06));}
    var boss=Number.isInteger(e.bossIndex)&&C.bosses[e.bossIndex];e.mechanicTimer=primaryInterval(e.bossIndex)||(boss&&boss.mechanics[0].interval)||12;e.casting=null;
  }
  function primaryInterval(index){return [12,10,8,14,13,11,8,12,16,15,12,15][index];}
  function tickBossMechanics(s,b,e,dt){var bi=e.bossIndex;if(!Number.isInteger(bi))return;e.bossClock=(e.bossClock||0)+dt;e.thresholds=e.thresholds||[];var thresholds=bi===1?[.7,.35]:bi===4?[.75,.4]:bi===11?[.8,.5,.2]:[];
    thresholds.forEach(function(value,i){if(e.hp/e.maxHp<=value&&e.thresholds.indexOf(i)<0){if(bi===11&&e.casting)return;e.thresholds.push(i);if(bi===1)addMinion(b,e,'flower','赤莲花核',.2);if(bi===4)for(var j=0;j<2;j++)addMinion(b,e,'clone','寒鸦分身',.13);if(bi===11)startMechanic(b,e);mechanicEvent(b,bi===11?'cataclysm':'summon','气血'+Math.round(value*100)+'%阶段机制触发');}});
    var secondary=bi===5?{interval:16,kind:'confusion',name:'心魔侵蚀',duration:2,hint:'净化或回复阵法处理持续侵蚀'}:bi===6?{interval:15,kind:'rootSummon',name:'缚灵根阵',duration:2,hint:'净化束缚后转火根须，或范围技能清理'}:bi===9?{interval:10,kind:'illusion',name:'月蚀假象',duration:1,hint:'假状态不会控制，保留净化给真实魅惑'}:bi===10?{interval:18,kind:'blockade',name:'封河封锁',duration:2,hint:'范围清场，或打断后优先清除卫兵'}:bi===11?{interval:17,kind:'rift',name:'裂隙爆发',duration:2,hint:'净化灼烧并等待破绽窗口'}:null;
    if(secondary){e.secondaryTimer=(e.secondaryTimer===undefined?secondary.interval:e.secondaryTimer)-dt;if(e.secondaryTimer<=0&&!e.casting){e.secondaryTimer=secondary.interval;startMechanic(b,e,secondary);}}
    if(bi===8){e.heatTimer=(e.heatTimer===undefined?6:e.heatTimer)-dt;if(e.heatTimer<=0){e.heatTimer=6;var heat=status(e.statuses,'heat');effect(e.statuses,'heat',60,0,Math.min(100,(heat?heat.stacks:0)+15));damagePlayer(s,b,e.attack*.9,'熔炉炉火');mechanicEvent(b,'heat','炉温上升并射出炉火，寒潮可降温');}var h=status(e.statuses,'heat');if(h&&h.stacks>=100&&!e.casting)startMechanic(b,e);}
    if(e.mechanicTimer<=0&&!e.casting&&bi!==2&&bi!==8&&bi!==11)startMechanic(b,e);
  }

  function autoActions(s,b){var p=b.player,lo=loadout(s),rules=b.rules||{healBelow:.45,reserveInterrupt:true,shieldBeforeBurst:true},skills=configuredSkills(s,b).filter(function(id){return technique(s,id,b)&&!b.cooldowns[id]&&p.mp>=C.techniques[id].mp;});
    var injured=p.hp/p.maxHp<rules.healBelow,negative=p.statuses.some(function(x){return ['burn','thunder','charm','drain','root','poison'].indexOf(x.id)>=0;}),casting=alive(b).find(function(e){return e.casting&&e.casting.interruptible&&e.casting.remaining<2.3;}),controlIds=['body_skill_0','body_skill_2','thunder_skill_1','elements_skill_0','shadow_skill_2'];
    if(heart(s).id==='array_heart_1'){var reap=configuredSkills(s,b).find(function(id){var st=status(p.statuses,id==='array_skill_2'?'manaArray':id==='array_skill_3'?'starArray':'none');return st&&(st.elapsed||0)>=8;});if(reap){castSkill(s,b,reap,b.target,true);return;}}
    if(negative){var clean=skills.find(function(id){return id==='array_skill_1';});if(clean){castSkill(s,b,clean,b.target,true);return;}}
    if(injured){var healing=skills.find(function(id){return id==='array_skill_0'||id==='body_skill_3'||id==='shadow_skill_3';});if(healing){castSkill(s,b,healing,b.target,true);return;}}
    if(casting){var interruptId=skills.find(function(id){return controlIds.indexOf(id)>=0;});if(interruptId){castSkill(s,b,interruptId,b.enemies.indexOf(casting),true);return;}var it=activeTreasure(s);if(it&&it.id==='t10'&&!b.treasureCooldown){castTreasure(s,b);return;}}
    var minion=alive(b).find(function(x){return x.role==='flower'||x.role==='root'||x.role==='guard';});if(minion)b.target=b.enemies.indexOf(minion);
    else if(!target(b))return;
    if(alive(b).length>1){var exposed=alive(b).find(function(x){return status(x.statuses,'vulnerable');});if(exposed)b.target=b.enemies.indexOf(exposed);}
    for(var i=0;i<skills.length;i++){var id=skills[i];
      if(id==='array_skill_0'&&!injured)continue;if(id==='array_skill_1'&&!negative)continue;if(id==='body_skill_3'&&!injured)continue;
      if(rules.reserveInterrupt&&controlIds.indexOf(id)>=0&&!casting)continue;
      if(id==='body_skill_1'&&p.shield>p.maxHp*.2)continue;
      if(status((target(b)||{}).statuses||[],'reflect')&&(id.indexOf('sword_')===0||id.indexOf('thunder_')===0))continue;
      if(rules.shieldBeforeBurst&&(id==='sword_skill_3'||id==='thunder_skill_3')&&p.shield<p.maxHp*.1){var guard=skills.find(function(x){return x==='body_skill_1'||x==='elements_skill_3';});if(guard){castSkill(s,b,guard,b.target,true);return;}}
      var res=castSkill(s,b,id,b.target,true);if(res.ok)break;
    }
    var treasure=activeTreasure(s);if(treasure&&!b.treasureCooldown&&((treasure.id==='t0'&&injured)||(treasure.id==='t5'&&p.shield<p.maxHp*.1)||(treasure.id!=='t0'&&treasure.id!=='t5'&&(!rules.reserveInterrupt||treasure.id!=='t10'))))castTreasure(s,b);
  }
  function tickStatuses(s,b,list,dt,owner){for(var i=list.length-1;i>=0;i--){var st=list[i];st.remaining-=dt;st.elapsed=(st.elapsed||0)+dt;st.tick=(st.tick||0)+dt;var periodic=['hot','manaArray','starArray','swordDomain'].indexOf(st.id)>=0?2:1;
    if(st.tick>=periodic){st.tick-=periodic;
      if(owner==='player'){if(st.id==='burn'||st.id==='poison')damagePlayer(s,b,st.amount*(st.stacks||1),'持续伤害',true);if(st.id==='drain')b.player.mp=Math.max(0,b.player.mp-st.amount);if(st.id==='hot'||st.id==='pillHot')heal(s,b,st.amount);if(st.id==='manaArray')b.player.mp=Math.min(b.player.maxMp,b.player.mp+st.amount);if(st.id==='starArray'||st.id==='swordDomain')alive(b).forEach(function(e){damageEnemy(s,b,e,st.amount,{dot:true});});}
      else if(st.id==='erosion'||st.id==='burn'||st.id==='soulfire')damageEnemy(s,b,owner,st.amount*(st.stacks||1),{dot:true});
    }
    if(st.remaining<=0){if(owner!=='player'&&['erosion','soulfire','burn'].indexOf(st.id)>=0&&secret(s,'shadow',0)&&(b.temporary.cinderGate||0)<=0){b.temporary.cinderGate=triggerTime(s,'shadow_secret_0',2);damageEnemy(s,b,owner,b.player.attack*.4*passiveScale(s,'shadow_secret_0'),{fixed:true});}
      if(owner!=='player'&&st.id==='reflect'&&owner.bossIndex===3){owner.shield=Math.min(owner.maxHp*.2,owner.shield+owner.maxHp*.18);effect(owner.statuses,'shellShield',8);mechanicEvent(b,'shell','镜壳反射结束，出现8秒护壳：破甲/破障镜或保留爆发');}if(owner!=='player'&&st.id==='shellShield')owner.shield=0;
      if(owner!=='player'&&st.id==='armorBreak'&&b.red.sword&&(b.temporary.swordRedGate||0)<=0){effect(b.player.statuses,'swordRefund',12);b.temporary.swordRedGate=8;}
      list.splice(i,1);
    }
  }}
  function foregroundStep(s,b,dt){b.time+=dt;var p=b.player;
    Object.keys(b.cooldowns).forEach(function(id){b.cooldowns[id]=Math.max(0,b.cooldowns[id]-dt);});
    b.treasureCooldown=Math.max(0,b.treasureCooldown-dt);b.potionCooldown=Math.max(0,b.potionCooldown-dt);
    Object.keys(b.temporary).forEach(function(id){if(/Gate$/.test(id))b.temporary[id]=Math.max(0,b.temporary[id]-dt);});
    p.shieldTime=Math.max(0,p.shieldTime-dt);if(!p.shieldTime)p.shield=0;
    tickStatuses(s,b,p.statuses,dt,'player');b.enemies.forEach(function(e){if(e.hp>0)tickStatuses(s,b,e.statuses,dt,e);});
    p.mp=Math.min(p.maxMp,p.mp+dt*(p.mpRegen||2));
    if(heart(s).id==='sword_heart_1'&&b.time-(b.temporary.openingAt||0)>8)setResource(b,0);
    if(heart(s).id==='array_heart_0'&&(status(p.statuses,'manaArray')||status(p.statuses,'starArray'))){b.temporary.arrayHeartTick=(b.temporary.arrayHeartTick||0)+dt;if(b.temporary.arrayHeartTick>=triggerTime(s,heart(s).id,2)){b.temporary.arrayHeartTick-=triggerTime(s,heart(s).id,2);p.mp=Math.min(p.maxMp,p.mp+heartScale(s));}}
    if(heart(s).id==='shadow_heart_0')b.enemies.forEach(function(e){var er=status(e.statuses,'erosion');if(er&&status(e.statuses,'soulfire')){e.erosionClock=(e.erosionClock||0)+dt;if(e.erosionClock>=triggerTime(s,heart(s).id,2)){e.erosionClock-=triggerTime(s,heart(s).id,2);er.stacks=Math.min(5,er.stacks+1);}}});
    if(b.queue.length){var command=b.queue.shift();if(command.type==='skill')castSkill(s,b,command.id,command.target,false);if(command.type==='treasure')castTreasure(s,b);if(command.type==='pill')takePill(s,b,command.id);}
    if(b.auto){b.temporary.autoTimer=(b.temporary.autoTimer||0)-dt;if(b.temporary.autoTimer<=0){b.temporary.autoTimer=.65;autoActions(s,b);}}
    b.attackTimer-=dt;if(b.attackTimer<=0){b.attackTimer=Math.max(.55,2/clamp(p.attackSpeed||1,.5,2.2));var e=target(b);if(e&&!status(p.statuses,'charm')&&!status(p.statuses,'root')){var amount=p.attack;if(status(p.statuses,'weak'))amount*=.85;damageEnemy(s,b,e,amount);if(heart(s).id==='sword_heart_0')setResource(b,Math.min(5,p.resource+1));if(heart(s).id==='sword_heart_1'){if(b.temporary.openingTarget!==e.id){setResource(b,0);b.temporary.openingTarget=e.id;}setResource(b,Math.min(4,p.resource+1));b.temporary.openingAt=b.time;}}}
    b.enemies.forEach(function(e){if(e.hp<=0)return;e.attackTimer-=dt;e.mechanicTimer-=dt;
      if(e.casting){e.casting.remaining-=dt;if(e.casting.remaining<=0)finishMechanic(s,b,e,e.casting);}
      else if(e.genericMechanic&&e.mechanicTimer<=0)startMechanic(b,e);tickBossMechanics(s,b,e,dt);
      if(e.attackTimer<=0&&!status(e.statuses,'root')){e.attackTimer=2*(status(e.statuses,'slow')?1+(status(e.statuses,'slow').amount||.2):1);var weak=status(e.statuses,'weak'),power=e.attack*(weak?1-clamp(weak.amount||.1,0,.4):1);if(e.casting)power*=.55;damagePlayer(s,b,power,e.name+'普攻');
        if(e.bossIndex===2){var markNow=status(p.statuses,'thunder'),count=(markNow?markNow.stacks:0)+1;addNegative(s,b,'thunder',12,0,Math.min(5,count));if(count>=4&&!e.casting)startMechanic(b,e);}
        
      }
      if(e.hp/e.maxHp<.5&&e.phase===0&&e.bossIndex!==7){e.phase=1;e.attack*=1.08;note(b,e.name+'进入第二阶段');}
    });
    if(p.hp<=0||(b.protect&&b.protect.hp<=0))settleBattle(s,b,false);
    else if(!alive(b).length)settleBattle(s,b,true);
    else if(b.time>600){note(b,'战斗超过十分钟，判定撤退；调整构筑后可重试');settleBattle(s,b,false);}
  }
  function rewardShell(){return {stones:0,xp:0,tickets:0,materials:{},fragments:{},techniques:[],gear:[],treasures:[],blueprints:[]};}
  function mergeReward(a,r){['stones','xp','tickets','contribution'].forEach(function(k){a[k]=(a[k]||0)+(r[k]||0);});['materials','fragments'].forEach(function(k){a[k]=a[k]||{};Object.keys(r[k]||{}).forEach(function(id){a[k][id]=(a[k][id]||0)+r[k][id];});});['techniques','gear','treasures','blueprints'].forEach(function(k){a[k]=(a[k]||[]).concat(r[k]||[]);});return a;}
  function learnDungeonRecipes(s,r,id,route){if(!K.learnRecipe)return;var path=s.paths[route];r.recipes=r.recipes||[];Object.keys(C.recipes).forEach(function(key){var recipe=C.recipes[key];if(recipe.source&&recipe.source.type==='dungeon'&&recipe.source.id===id&&(recipe.realm||0)<=path.realm&&((recipe.realm||0)<path.realm||(recipe.layer||1)<=path.layer)){if((s.learnedRecipes||[]).indexOf(key)<0){K.learnRecipe(s,key,{type:'dungeon',source:id,at:s.lastAt});r.recipes.push(key);}}});}
  function grantReward(s,r,route){K.grant(s,{stones:r.stones||0,xp:r.xp||0,tickets:r.tickets||0,materials:r.materials||{},contribution:r.contribution||0},route);
    Object.keys(r.fragments||{}).forEach(function(id){K.add(s.fragments,id,r.fragments[id]);});
    (r.techniques||[]).forEach(function(id){if(!C.techniques[id])return;if(s.techniques[id])K.add(s.fragments,'universal',5);else s.techniques[id]={level:1,branch:0,spent:0};});
    (r.gear||[]).forEach(function(g){Economy.addGear(s,g);s.stats.gearDrops++;});
    (r.treasures||[]).forEach(function(id){if(!C.treasures[id])return;if(s.ownedTreasures[id])s.ownedTreasures[id].count++;else s.ownedTreasures[id]={level:1,count:1,awakening:0};});
    (r.blueprints||[]).forEach(function(id){if(s.blueprints.indexOf(id)<0)s.blueprints.push(id);});
  }
  function gearRoll(s,tier,difficulty,set){var roll=K.rng(s,'loot'),rarity;if(difficulty===0)rarity=roll<.65?2:roll<.9?3:roll<.995?4:5;else if(difficulty===1)rarity=roll<.5?2:roll<.85?3:roll<.99?4:5;else rarity=roll<.35?2:roll<.8?3:roll<.98?4:5;var slots=Object.keys(C.slots),slot=slots[Math.floor(K.rng(s,'loot')*slots.length)];return Economy.createGear(s,{slot:slot,rarity:rarity,tier:tier,set:set});}
  function highestTier(s){return Math.max(s.paths.body.realm,s.paths.magic.realm);}
  function currentTierReward(s,tier){return tier===highestTier(s);}
  function firstKey(b){return b.type==='tower'?'tower_'+b.floor:b.id+':'+b.tier+':'+b.difficulty;}

  function battleRewards(s,b){var r=rewardShell(),d=b.type==='tower'?(C.towerFloors[b.floor-1]||C.dungeons.tower):(C.dungeons[b.id]||{}),tier=b.tier,m=1+tier*2,first=s.progress.firstClears.indexOf(b.firstKey)<0,eligible=currentTierReward(s,tier),diff=b.difficulty,base=d.rewards||{};
    r.stones=Math.round((base.stones||0)*m*(1+diff*.3));r.xp=Math.round((base.xp||0)*m*(1+diff*.25));r.contribution=base.contribution||0;
    Object.keys(base.materials||{}).forEach(function(id){if(id.indexOf('crystal')===0){if(eligible)r.materials[id]=base.materials[id];}else r.materials[id]=Math.round(base.materials[id]*(1+tier*.5)*(1+diff*.4));});
    Object.keys(base.fragments||{}).forEach(function(id){r.fragments[id]=base.fragments[id]+diff;});
    if(eligible){r.tickets=base.tickets||0;if(base.crystal)r.materials['crystal'+tier]=(base.crystal||0)+(b.type==='boss'?diff*3:diff);}
    if(first){var f=d.firstRewards||{};r.stones+=f.stones||0;r.xp+=f.xp||0;r.contribution+=(f.contribution||0);if(eligible)r.tickets+=f.tickets||0;
      Object.keys(f.materials||{}).forEach(function(id){if(id.indexOf('crystal')!==0||eligible)r.materials[id]=(r.materials[id]||0)+f.materials[id];});
      Object.keys(f.fragments||{}).forEach(function(id){r.fragments[id]=(r.fragments[id]||0)+f.fragments[id];});
      r.techniques=(f.techniques||[]).slice();r.treasures=(f.treasures||[]).slice();r.blueprints=(f.blueprints||[]).slice();
    }
    if(b.type==='boss')r.gear.push(gearRoll(s,tier,diff,d.school||C.bosses[b.bossIndex].school));
    if(b.performance.handled>0){r.stones+=Math.round(r.stones*.1);r.materials.insight=(r.materials.insight||0)+1;}
    return r;
  }
  function reportMessages(b,handled){var counts={};(b.mechanismEvents||[]).forEach(function(x){if(handled===undefined||x.handled===handled)counts[x.message]=(counts[x.message]||0)+1;});return Object.keys(counts).map(function(msg){return msg+(counts[msg]>1?' ×'+counts[msg]:'');});}
  function recordResult(s,b,result,outcome){if(b.reported)return result;b.reported=true;result.entry=b.id;result.entryLabel=b.name;result.route=b.route;result.realm=b.realmLabel||K.realmLabel(s,b.route);result.tier=b.tier;result.tierLabel=C.routes[b.route].realmNames[b.tier];result.difficulty=b.difficulty;result.win=!!result.win;result.practice=!!b.practice;result.outcome=outcome||(result.win?'win':'defeat');result.duration=round(b.time||0);result.at=Math.round((b.startedAt||s.lastAt)+(b.time||0)*1000);result.mechanisms=reportMessages(b);result.failures=reportMessages(b,false);if(!result.win&&!result.failures.length)result.failures=[result.reason];result.enemy=(b.enemies||[]).map(function(e){return e.name;}).join('、');s.lastBattleResult=result;s.battleReports=Array.isArray(s.battleReports)?s.battleReports:[];s.battleReports.push(JSON.parse(JSON.stringify(result)));if(s.battleReports.length>20)s.battleReports.splice(0,s.battleReports.length-20);return result;}
  function publicResult(b,win,rewards){return {win:win,name:b.name,type:b.type,time:round(b.time),tier:b.tier,difficulty:b.difficulty,rewards:rewards||null,performance:b.performance,log:b.log.slice(-10),reason:win?'挑战完成':reportMessages(b,false).length?'气血或护阵耗尽；'+reportMessages(b,false).join('；'):b.protect&&b.protect.hp<=0?'护送目标倒下；清理卫兵或使用护盾支援':b.performance.missed>0?'有 '+b.performance.missed+' 次机制未处理；可尝试打断、净化、转火或护盾':'气血耗尽；尝试回复神通、减伤和合理出招顺序'};}

  function settleBattle(s,b,win){if(s.battle!==b||b.settled)return;b.settled=true;
    if(!win){if(!b.practice)s.stats.failed++;if(s.autoRetry)s.autoRetry.enabled=false;s.lastBattleResult=publicResult(b,false,null);s.lastBattleResult.practice=!!b.practice;K.log(s,(b.practice?'试阵结束：':'挑战失败：')+b.name+'。'+s.lastBattleResult.reason);s.battle=null;
      if(s.exploration){if(!b.practice)grantReward(s,s.exploration.banked,s.exploration.route);s.lastBattleResult.rewards=b.practice?null:s.exploration.banked;s.lastBattleResult.reason+='；已携出常规材料保留，未携出部分遗失';s.exploration=null;}recordResult(s,b,s.lastBattleResult);return;
    }
    if(b.type==='cave'&&s.exploration){var ex=s.exploration,room=C.caveRooms.find(function(x){return x.id===(ex.room||{}).id;}),r=rewardShell();mergeReward(r,room&&room.reward||{});
      r.xp=100*(1+b.tier*2);if((ex.room||{}).id==='elite'){var school=(C.caves.find(function(x){return x.id===ex.id;})||{}).school||'sword';r.fragments[school+'_skill_2']=2;}
      mergeReward(ex.pending,r);ex.vitals={hp:b.player.hp,maxHp:b.player.maxHp,mp:b.player.mp,maxMp:b.player.maxMp};ex.history.push({node:ex.node,type:ex.room&&ex.room.id||'battle',win:true});ex.node++;ex.awaiting=true;ex.room=null;s.lastBattleResult=publicResult(b,true,b.practice?null:r);s.lastBattleResult.rewardsPending=!b.practice;ex.duration=(ex.duration||0)+b.time;recordResult(s,b,s.lastBattleResult);s.battle=null;caveChoices(s,ex);K.log(s,'洞天战斗胜利，继续选择路线');return;
    }
    if(b.practice){s.lastBattleResult=publicResult(b,true,null);s.lastBattleResult.practice=true;s.lastBattleResult.reason='试阵完成；无奖励、统计或首通进度';recordResult(s,b,s.lastBattleResult);s.battle=null;K.log(s,s.lastBattleResult.reason);return;}
    if(b.type==='trial'){
      if(b.tier<5)s.progress.trialWins[b.route+':'+b.tier]=true;else s.progress.endingTrials[b.route]=true;
      s.lastBattleResult=publicResult(b,true,null);s.lastBattleResult.reason=b.tier===5?'终境试炼完成，可以推进终章':'试炼完成，可在修行界面进行突破';recordResult(s,b,s.lastBattleResult);K.log(s,s.lastBattleResult.reason);s.battle=null;return;
    }
    s.stats.kills+=(b.killCount||b.enemies.length);s.stats.manualWins++;if(b.type==='boss')s.stats.bosses++;
    var r=battleRewards(s,b),first=s.progress.firstClears.indexOf(b.firstKey)<0;
    if(first)learnDungeonRecipes(s,r,b.id,b.route);grantReward(s,r,b.route);if(first)s.progress.firstClears.push(b.firstKey);
    s.progress.dungeonWins[b.id]=(s.progress.dungeonWins[b.id]||0)+1;s.progress.dungeonWins[b.id+':'+b.tier+':'+b.difficulty]=(s.progress.dungeonWins[b.id+':'+b.tier+':'+b.difficulty]||0)+1;
    s.stats['winsTier'+b.tier]=(s.stats['winsTier'+b.tier]||0)+1;if(b.type==='boss'){s.stats['bossesTier'+b.tier]=(s.stats['bossesTier'+b.tier]||0)+1;s.progress.bossWins[b.id]=(s.progress.bossWins[b.id]||0)+1;}
    if(b.type==='sect'&&s.progress.sectTrials.indexOf(b.id)<0)s.progress.sectTrials.push(b.id);
    if(b.type==='tower')s.progress.tower=Math.max(s.progress.tower,b.floor);
    var stars=b.player.hp/b.player.maxHp>=.45&&b.performance.missed===0?3:b.player.hp/b.player.maxHp>=.2?2:1;s.progress.stars[b.firstKey]=Math.max(s.progress.stars[b.firstKey]||0,stars);
    s.lastBattleResult=publicResult(b,true,r);s.lastBattleResult.first=first;s.lastBattleResult.stars=stars;recordResult(s,b,s.lastBattleResult);s.battle=null;K.log(s,'完成'+b.name+'：'+r.stones+'灵石、'+r.xp+'修为'+(r.tickets?'、'+r.tickets+'感应券':''));
    var retry=s.autoRetry;if(b.type==='boss'&&retry&&retry.enabled){retry.runs=(retry.runs||0)+1;var red=r.gear.some(function(g){return g.rarity===5;});if(retry.runs>=retry.maxRuns||(retry.stopOnRed&&red)||s.bag.length+(s.rewardOverflow||[]).length>=1300){retry.enabled=false;K.log(s,'自动重战停止：次数、红装或储存条件已满足');}else createBattle(s,C.dungeons[b.id],b.tier,b.difficulty,{name:b.name});}
  }

  function enemyFor(bossIndex,tier,difficulty,kind,floor){var f=1+difficulty*.28,layer=floor?((floor-1)%10):5,hp=(kind==='resource'?900+tier*700:kind==='sect'?1100+tier*760:kind==='tower'?900+tier*700+layer*80:kind==='cave'?1000+tier*750:kind==='trial'?1600+tier*850:2500+tier*1250)*f,boss=Number.isInteger(bossIndex)?C.bosses[bossIndex]:null;
    hp*=kind==='boss'?[1,1.8,3.2,3.4,5.2,7][tier]:kind==='trial'?[1,1.8,3.2,3.4,5.2,7][tier]:(1+tier*.6);
    var out={id:boss?boss.id||'boss_'+bossIndex:'enemy',name:boss?boss.name:kind==='resource'?'秘境守卫':kind==='sect'?'宗门试炼傀儡':kind==='tower'?'问道守阵者':kind==='trial'?'劫关心魔':'洞天守卫',hp:Math.round(hp),maxHp:Math.round(hp),attack:(14+tier*8+layer*.6)*f,defense:4+tier*4,shield:0,statuses:[],attackTimer:2,mechanicTimer:Number.isInteger(bossIndex)?primaryInterval(bossIndex):7,casting:null,phase:0,dead:false,resist:{}};
    if(boss){out.bossIndex=bossIndex;boss.mechanics.forEach(function(m){Object.keys(m.resist||{}).forEach(function(k){out.resist[k]=Math.max(out.resist[k]||0,m.resist[k]);});});}
    return out;
  }
  function createBattle(s,d,tier,difficulty,options){options=options||{};var a=K.attributes(s),p={hp:a.maxHp,maxHp:a.maxHp,mp:a.maxMp||100,maxMp:a.maxMp||100,shield:0,shieldTime:0,attack:a.attack,defense:a.defense,crit:a.crit||.05,critDamage:a.critDamage||1.5,dodge:a.dodge||0,cooldownReduction:a.cooldownReduction||0,damageReduction:a.damageReduction||0,healing:a.healing||0,penetration:a.penetration||0,attackSpeed:a.attackSpeed||1,mpRegen:a.mpRegen||2,lifesteal:a.lifesteal||0,dotDamage:a.dotDamage||0,shieldPower:a.shieldPower||0,statuses:[],resource:0,resourceName:resourceNames[heart(s).school],combo:0,lastElement:null};
    if(s.exploration){var ex=s.exploration,mods=ex.modifiers;p.attack*=1+(mods.attack||0);p.defense*=1+(mods.defense||0);p.maxHp*=1+(mods.maxHp||0);p.healing+=mods.healing||0;p.dodge+=mods.dodge||0;p.hp=p.maxHp*clamp(ex.vitals.hp/ex.vitals.maxHp,0,1);p.mp=p.maxMp*clamp(ex.vitals.mp/ex.vitals.maxMp,0,1);if(mods.shield){p.shield=p.maxHp*mods.shield;p.shieldTime=10;}}
    if((s.techniques[loadout(s).heart]||{}).branch===1)p.attackSpeed/=.88;
    var bi=Number.isInteger(options.bossIndex)?options.bossIndex:Number.isInteger(d.bossIndex)?d.bossIndex:null;
    if(d.type==='trial')bi=[0,2,5,6,8,11][tier];
    var floorData=d.type==='tower'&&C.towerFloors[options.floor-1];if(floorData&&Number.isInteger(floorData.bossIndex))bi=floorData.bossIndex;
    var b={id:d.id,name:options.name||d.name,type:d.type,tier:tier,difficulty:difficulty,route:s.route,floor:options.floor||null,bossIndex:bi,firstKey:null,startedAt:s.lastAt,realmLabel:K.realmLabel(s,s.route),mechanismEvents:[],time:0,paused:false,auto:true,target:0,practice:!!options.practice||!!(s.exploration&&s.exploration.practice),rules:Object.assign({healBelow:.45,reserveInterrupt:true,shieldBeforeBurst:true},s.battleRules||{}),practicePills:{},player:p,enemies:[enemyFor(bi,tier,difficulty,d.type,options.floor)],cooldowns:{},treasureCooldown:0,potionCooldown:0,queue:[],log:[],rng:Math.floor(K.rng(s,'world')*4294967296)||1,attackTimer:.5,accumulator:0,lastSkill:null,performance:{handled:0,missed:0,damageTaken:0,interrupts:0,pills:0},temporary:{},protect:bi===10||(d.type==='trial'&&(tier===0||tier===3))?{hp:p.maxHp*1.5,maxHp:p.maxHp*1.5}:null,red:redSets(s),sets:a.sets||{},room:options.room||null};
    var count=d.type==='resource'?3:d.type==='tower'&&floorData?floorData.enemyCount||1:1;
    if(count>1){var total=b.enemies[0].maxHp;b.enemies=[];for(var n=0;n<count;n++){var e=enemyFor(null,tier,difficulty,d.type,options.floor);e.id='guard_'+n;e.name=d.type==='resource'?'秘境守卫·'+(n+1):'问道守阵者·'+(n+1);e.hp=e.maxHp=Math.round(total/count);e.attack*=d.type==='resource'?.4:.55;e.attackTimer=1+n*.7;e.mechanicTimer=7+n*3;b.enemies.push(e);}}
    if(d.type==='resource'||d.type==='sect'||(d.type==='tower'&&!Number.isInteger(bi)))b.enemies.forEach(function(e){e.genericMechanic=d.type==='resource'?'resource_'+d.resource:d.type==='sect'?'sect_'+d.school:'tower_'+floorData.school;});
    if(bi===7){var first=b.enemies[0],second=enemyFor(null,tier,difficulty,'boss');second.id='twin';second.name='影卫·月';second.hp=first.hp*.7;second.maxHp=second.hp;second.role='twin';first.name='影卫·日';b.enemies.push(second);effect(first.statuses,'vulnerable',10,.2);effect(second.statuses,'protected',10,.4);}
    if(d.type==='sect'){var school=d.school||'sword';b.loanSkills=[school+'_skill_0',school+'_skill_1',school+'_skill_2','array_skill_0'];note(b,'宗门试炼借用教学神通；不改变已学习功法');}
    (loadout(s).pills||[]).forEach(function(id){b.practicePills[id]=3;});
    b.firstKey=firstKey(b);note(b,'进入'+b.name+(b.practice?'（免费试阵，无奖励与进度）':'')+'；战术暂停停止双方所有计时');s.battle=b;return b;
  }
  function checkDungeon(s,d,tier,difficulty,floor){if(s.battle)return '当前战斗尚未结束';if(s.exploration)return '当前洞天尚未结束';if(!d)return '副本不存在';if((d.type==='boss'||d.type==='cave')&&s.bag.length+(s.rewardOverflow||[]).length>=1300)return '背包与奖励暂存已满，请先整理以保留装备奖励';var p=s.paths[s.route],rank=K.pathRank(s),req=(Number(d.realm)||0)*10+(Number(d.layer)||1)-1,u=K.unlocks(s);
    if(rank<req)return '需要'+C.routes[s.route].realmNames[d.realm||0]+(d.layer||1)+'层';
    if(tier>p.realm)return '当前路线尚未达到该阶位';
    if(d.type==='resource'&&d.id!=='resource_herb'&&!u.resources)return '三层开放资源秘境';
    if(d.type==='sect'&&!u.sect)return '五层开放宗门试炼';
    if(d.type==='tower'&&!u.tower)return '七层开放问道塔';
    if(d.type==='cave'&&!u.cave)return '九层开放洞天探索';
    if(d.type==='trial'&&p.layer!==10)return '圆满十层开放大境试炼';
    if(d.type==='tower'){if(floor<1||floor>60)return '楼层必须为1至60';if(floor>s.progress.tower+1)return '请先完成前一层';if(Math.floor((floor-1)/10)>p.realm)return '当前路线境界尚未开放该层';}
    var difficultyRequirement=d.difficultyUnlocks&&d.difficultyUnlocks[difficulty];if(difficultyRequirement&&!(d.id==='resource_herb'&&difficulty===0)&&rank<difficultyRequirement.realm*10+difficultyRequirement.layer-1)return '此难度需要'+C.routes[s.route].realmNames[difficultyRequirement.realm]+difficultyRequirement.layer+'层';
    if(difficulty>0&&s.progress.firstClears.indexOf(d.id+':'+tier+':'+(difficulty-1))<0&&d.type!=='trial'&&d.type!=='tower')return '先完成上一难度，可自由回刷已开放难度';
    return null;
  }
  var roomTypes=[
    {id:'fight',label:'守卫回廊',description:'击败守卫，获得基础材料与参悟'},
    {id:'elite',label:'妖王遗影',description:'更强敌人，胜利获得额外参悟'},
    {id:'herb',label:'灵药园',description:'采集灵草与少量灵石'},
    {id:'ore',label:'古矿脉',description:'采集矿石与炼器精华'},
    {id:'study',label:'残碑悟道',description:'获得指定残页与参悟'},
    {id:'trade',label:'行脚商人',description:'花费灵石换取药材与矿石'},
    {id:'rest',label:'静心泉',description:'强化本次探索的气血与防御'},
    {id:'forge',label:'残炉淬锋',description:'提升本次探索的攻击'},
    {id:'cleanse',label:'净尘莲池',description:'获得莲子及防御增益'},
    {id:'escort',label:'迷途修士',description:'护送挑战，胜利获得额外材料'},
    {id:'stash',label:'藏物石台',description:'把目前常规收益安全携出'},
    {id:'treasure',label:'古匣回廊',description:'解谜后获得材料，下一场敌人更强'}
  ];

  function caveChoices(s,ex){if(ex.node>=ex.total){ex.choices=[{id:'finish',label:'开启最终宝箱',description:'通关携出全部收益；失败只保留已确认常规材料'}];ex.awaiting=true;ex.status='cleared';return;}
    if(ex.node===ex.total-1){ex.choices=[{id:'final:fight',label:'挑战洞天守关',description:'最后一战，胜利后开启最终宝箱'}];ex.awaiting=true;ex.status='choosing';return;}
    var cave=C.caves.find(function(x){return x.id===ex.id;}),weights=cave&&cave.roomWeights||{},pool=C.caveRooms.filter(function(r){return ex.node>0||r.id!=='exit';});
    function draw(){var total=pool.reduce(function(n,r){return n+(weights[r.id]||1);},0),roll=K.rng(s,'world')*total;for(var i=0;i<pool.length;i++){roll-=weights[pool[i].id]||1;if(roll<0)return pool.splice(i,1)[0];}return pool.pop();}
    var rooms=[draw(),draw()];ex.choices=[];rooms.forEach(function(room){room.choices.forEach(function(choice){ex.choices.push({id:room.id+':'+choice.id,label:room.name+' · '+choice.label,description:room.description,cost:choice.cost||{},reward:choice.reward||{},roomId:room.id,optionId:choice.id});});});ex.awaiting=true;ex.status='choosing';
  }
  function bankMaterials(ex){var r=rewardShell();r.stones=ex.pending.stones;r.xp=ex.pending.xp;Object.keys(ex.pending.materials||{}).forEach(function(id){if(id.indexOf('crystal')!==0){r.materials[id]=ex.pending.materials[id];delete ex.pending.materials[id];}});ex.pending.stones=0;ex.pending.xp=0;mergeReward(ex.banked,r);}
  function chooseRoom(s,choice){var ex=s.exploration;if(!ex||s.battle||!ex.awaiting)return {ok:false,message:'当前不能选择洞天路线'};if(choice==='finish'&&ex.node>=ex.total)return finishExploration(s);
    var shown=ex.choices.find(function(x){return x.id===choice;});if(!shown)return {ok:false,message:'只能选择当前显示的路线'};
    var bits=choice.split(':'),room=C.caveRooms.find(function(x){return x.id===bits[0];}),option=room&&room.choices.find(function(x){return x.id===bits[1];}),cave=C.caves.find(function(x){return x.id===ex.id;});
    if(bits[0]==='final'){room={id:'final',name:'洞天守关',reward:{}};option={battle:true};}
    if(!room||!option)return {ok:false,message:'洞天节点数据无效'};
    if(option.cost&&!ex.practice&&!K.spend(s,option.cost))return {ok:false,message:'所需材料或灵石不足'};
    ex.room={id:room.id,label:room.name};ex.awaiting=false;
    if(option.battle){ex.status='battle';var d={id:ex.id,name:ex.name+'·'+room.name,type:'cave'},opts={room:room.id,practice:ex.practice};
      if(room.id==='final')opts.bossIndex=cave.finalBoss;if(room.id==='elite')opts.bossIndex=Math.min(11,ex.tier*2);createBattle(s,d,ex.tier,room.id==='elite'?Math.min(2,ex.difficulty+1):ex.difficulty,opts);return {ok:true,message:'进入'+room.name};}
    if(option.extract){bankMaterials(ex);return finishExploration(s);}if(room.id==='exit'&&option.id==='continue')bankMaterials(ex);
    var r=rewardShell();mergeReward(r,option.reward||room.reward||{});if(!currentTierReward(s,ex.tier))r.tickets=0;
    if(option.heal)ex.vitals.hp=Math.min(ex.vitals.maxHp,ex.vitals.hp+ex.vitals.maxHp*option.heal);
    if(option.mp)ex.vitals.mp=Math.min(ex.vitals.maxMp,ex.vitals.mp+ex.vitals.maxMp*option.mp);
    Object.keys(option.buff||{}).forEach(function(id){ex.modifiers[id]=Math.min(.5,(ex.modifiers[id]||0)+option.buff[id]);});
    mergeReward(ex.pending,r);ex.history.push({node:ex.node,type:room.id,choice:bits[1]});ex.node++;ex.room=null;caveChoices(s,ex);K.log(s,'洞天探索：'+room.name+'，第'+ex.node+'/'+ex.total+'节点');return {ok:true,message:'完成'+room.name,data:{reward:r}};
  }
  function finishExploration(s){var ex=s.exploration;if(!ex)return {ok:false,message:'没有进行中的洞天'};if(s.battle)return {ok:false,message:'请先结束当前战斗'};var complete=ex.node>=ex.total,r=rewardShell(),cave=C.caves.find(function(x){return x.id===ex.id;}),eligible=currentTierReward(s,ex.tier);mergeReward(r,ex.banked);
    if(complete&&!ex.practice){if(s.bag.length+(s.rewardOverflow||[]).length>=1300)return {ok:false,message:'奖励暂存已满，请先整理后开启宝箱'};mergeReward(r,ex.pending);var base=cave.rewards||{};r.stones+=(base.stones||0)*(1+ex.tier*2);r.xp+=(base.xp||500)*(1+ex.tier*2);Object.keys(base.materials||{}).forEach(function(id){r.materials[id]=(r.materials[id]||0)+base.materials[id];});Object.keys(base.fragments||{}).forEach(function(id){r.fragments[id]=(r.fragments[id]||0)+base.fragments[id];});if(eligible){r.tickets+=base.tickets||0;r.materials['crystal'+ex.tier]=(r.materials['crystal'+ex.tier]||0)+8;}
      r.gear.push(gearRoll(s,ex.tier,ex.difficulty,cave.school));var key=ex.id+':'+ex.tier+':'+ex.difficulty;if(s.progress.firstClears.indexOf(key)<0){s.progress.firstClears.push(key);mergeReward(r,cave.firstRewards||{});learnDungeonRecipes(s,r,ex.id,ex.route);}
      s.progress.dungeonWins[ex.id]=(s.progress.dungeonWins[ex.id]||0)+1;s.progress.dungeonWins[ex.id+':'+ex.tier+':'+ex.difficulty]=(s.progress.dungeonWins[ex.id+':'+ex.tier+':'+ex.difficulty]||0)+1;s.stats['winsTier'+ex.tier]=(s.stats['winsTier'+ex.tier]||0)+1;s.stats['caveTier'+ex.tier]=(s.stats['caveTier'+ex.tier]||0)+1;s.stats.manualWins++;}
    if(!ex.practice)grantReward(s,r,ex.route);else r=rewardShell();
    s.lastBattleResult={win:complete,name:ex.name,type:'cave',rewards:r,practice:!!ex.practice,reason:ex.practice?'试阵探索结束，无奖励与进度':complete?'洞天通关，全部收益携出':'提前离开，仅携出归途阵门确认保存的常规收益',performance:{handled:0,missed:0},time:round(ex.duration||0)};recordResult(s,{id:ex.id,name:ex.name,type:'cave',route:ex.route,tier:ex.tier,difficulty:ex.difficulty,practice:ex.practice,startedAt:ex.startedAt,time:ex.duration||0,realmLabel:ex.realmLabel,mechanismEvents:[],enemies:[]},s.lastBattleResult,complete?'win':'exit');s.exploration=null;K.log(s,s.lastBattleResult.reason);return {ok:true,message:s.lastBattleResult.reason,data:{reward:r}};
  }
  function sweep(s,a){var d=C.dungeons[a.id],tier=Number.isInteger(a.tier)?a.tier:s.paths[s.route].realm,count=clamp(Math.floor(a.count||1),1,100),key=a.id+':'+tier+':0';if(!d||d.type!=='resource')return {ok:false,message:'只能扫荡资源秘境'};if(s.battle||s.exploration)return {ok:false,message:'请先结束当前历练'};if(tier>s.paths[s.route].realm||tier<0||tier>5)return {ok:false,message:'阶位未开放'};if((s.progress.stars[key]||0)<3)return {ok:false,message:'该阶普通资源秘境三星后才可扫荡'};var cost=count*45000;if(s.sweepMs<cost)return {ok:false,message:'历练储备不足，需要'+Math.ceil(cost/1000)+'秒'};s.sweepMs-=cost;var r=rewardShell();Object.keys((d.rewards||{}).materials||{}).forEach(function(id){if(id.indexOf('crystal')!==0)r.materials[id]=Math.round(d.rewards.materials[id]*(1+tier*.5))*count;});r.stones=Math.round(((d.rewards||{}).stones||400)*.5)*(1+tier*2)*count;grantReward(s,r,s.route);K.log(s,'扫荡'+d.name+'×'+count+'，仅获得基础材料');return {ok:true,message:'扫荡完成；无晶、感应券及首通奖励',data:{reward:r,costMs:cost}};
  }

  function handle(s,a,now){a=a||{};var b=s.battle;
    if(a.type==='setBattleRules'){var old=s.battleRules||{healBelow:.45,reserveInterrupt:true,shieldBeforeBurst:true};s.battleRules={healBelow:a.healBelow===undefined?old.healBelow:clamp(a.healBelow,.1,.8),reserveInterrupt:a.reserveInterrupt===undefined?old.reserveInterrupt:!!a.reserveInterrupt,shieldBeforeBurst:a.shieldBeforeBurst===undefined?old.shieldBeforeBurst:!!a.shieldBeforeBurst};if(b)b.rules=Object.assign({},s.battleRules);return {ok:true,message:'自动施法条件已保存'};}
    if(a.type==='setAutoRetry'){if(a.enabled&&b&&(b.type!=='boss'||b.practice))return {ok:false,message:'自动重战只用于正式妖王讨伐'};s.autoRetry={enabled:!!a.enabled,maxRuns:Math.floor(clamp(a.maxRuns||a.runs||3,1,10)),runs:0,stopOnRed:a.stopOnRed!==false,stopOnDefeat:true,stopWhenBagFull:true};return {ok:true,message:a.enabled?'自动重战已开启；失败与暂存满必停':'自动重战已停止'};}
    if(a.type==='startDungeon'){var d=C.dungeons[a.id],p=s.paths[s.route],difficulty=Number.isInteger(a.difficulty)?a.difficulty:0,floor=Number(a.floor)||Math.min(60,s.progress.tower+1),tier=d&&d.type==='resource'?(Number.isInteger(a.tier)?a.tier:p.realm):d&&d.type==='trial'?p.realm:d&&d.type==='tower'?Math.floor((floor-1)/10):d&&Number(d.realm)||0;
      if(difficulty<0||difficulty>2||tier<0||tier>5||!Number.isInteger(floor))return {ok:false,message:'副本参数无效'};var error=checkDungeon(s,d,tier,difficulty,floor);if(error)return {ok:false,message:error};
      if(d.type==='trial'&&!a.practice&&p.xp<K.xpNeeded(s))return {ok:false,message:'圆满十层修为填满后可参加正式突破试炼；可以先免费试阵'};
      if(s.autoRetry){s.autoRetry.runs=0;if(d.type!=='boss'||a.practice)s.autoRetry.enabled=false;}
      if(d.type==='cave'){var ca=C.caves.find(function(x){return x.id===d.id;}),attr=K.attributes(s);s.exploration={id:d.id,name:d.name,tier:tier,difficulty:difficulty,route:s.route,startedAt:s.lastAt,realmLabel:K.realmLabel(s,s.route),duration:0,node:0,total:ca.nodes,room:null,choices:[],pending:rewardShell(),banked:rewardShell(),modifiers:{attack:0,defense:0,maxHp:0,healing:0,shield:0,dodge:0},vitals:{hp:attr.maxHp,maxHp:attr.maxHp,mp:attr.maxMp||100,maxMp:attr.maxMp||100},history:[],awaiting:true,status:'choosing',practice:!!a.practice,seed:Math.floor(K.rng(s,'world')*4294967296)||1};caveChoices(s,s.exploration);return {ok:true,message:'进入'+d.name+'；失败仅保留确认携出的常规材料'};}
      createBattle(s,d,tier,difficulty,{floor:d.type==='tower'?floor:null,practice:!!a.practice,name:d.type==='tower'?d.name+'·第'+floor+'层':d.type==='trial'?C.routes[s.route].realmNames[tier]+'圆满试炼':d.name});return {ok:true,message:'进入'+s.battle.name};
    }
    if(a.type==='sweepDungeon')return sweep(s,a);if(a.type==='chooseCave')return chooseRoom(s,a.choice);if(a.type==='finishCave')return finishExploration(s);
    if(['pauseBattle','setBattleAuto','useSkill','useTreasure','targetEnemy','battlePill','leaveBattle'].indexOf(a.type)<0)return null;
    if(!b)return {ok:false,message:'当前没有战斗'};
    if(a.type==='pauseBattle'){b.paused=!!a.paused;note(b,b.paused?'战术暂停：双方所有计时停止':'继续战斗');return {ok:true,message:b.paused?'战斗已暂停':'战斗已继续'};}
    if(a.type==='setBattleAuto'){b.auto=!!a.enabled;return {ok:true,message:b.auto?'自动神通开启':'自动神通关闭'};}
    if(a.type==='targetEnemy'){if(!Number.isInteger(a.index)||!b.enemies[a.index]||b.enemies[a.index].hp<=0)return {ok:false,message:'目标无效'};b.target=a.index;return {ok:true,message:'目标：'+b.enemies[a.index].name};}
    if(a.type==='leaveBattle'){s.lastBattleResult={win:false,name:b.name,type:b.type,rewards:null,practice:!!b.practice,reason:'主动退出，不发晶、感应券或首通奖励',time:round(b.time),performance:b.performance};s.battle=null;if(s.autoRetry)s.autoRetry.enabled=false;if(s.exploration){if(!b.practice)grantReward(s,s.exploration.banked,s.exploration.route);s.lastBattleResult.rewards=b.practice?null:s.exploration.banked;s.exploration=null;}recordResult(s,b,s.lastBattleResult,'exit');K.log(s,'退出'+b.name);return {ok:true,message:'已退出，未使用丹药仍在背包'};}
    if(b.paused){if(b.queue.length>=6)return {ok:false,message:'暂停指令队列已满'};if(a.type==='useSkill'){var t=technique(s,a.id,b);if(!t||configuredSkills(s,b).indexOf(a.id)<0)return {ok:false,message:'未配置该神通'};b.queue.push({type:'skill',id:a.id,target:Number.isInteger(a.target)?a.target:b.target});}if(a.type==='useTreasure')b.queue.push({type:'treasure'});if(a.type==='battlePill'){if(!C.recipes[a.id])return {ok:false,message:'丹药无效'};b.queue.push({type:'pill',id:a.id});}return {ok:true,message:'指令已加入队列，继续战斗后执行'};}
    if(a.type==='useSkill')return castSkill(s,b,a.id,a.target,false);if(a.type==='useTreasure')return castTreasure(s,b);if(a.type==='battlePill')return takePill(s,b,a.id);return null;
  }
  function advanceBattle(s,seconds){var b=s.battle;if(!b||b.paused)return {ok:true,active:!!b,paused:!!b&&b.paused};var elapsed=clamp(seconds,0,60),steps=Math.ceil(elapsed/.1),dt=steps?elapsed/steps:0;for(var i=0;i<steps&&s.battle===b;i++)foregroundStep(s,b,dt);return {ok:true,active:!!s.battle,result:s.battle?null:s.lastBattleResult};}
  function prettyStatus(list){return list.map(function(x){return {id:x.id,name:({burn:'灼烧',erosion:'蚀魄',mark:'雷印',thunder:'雷印',soulfire:'燃魂',hot:'回春调养',pillHot:'丹药调养',evade:'惊电闪避',weak:'虚弱',root:'缠绕',drain:'抽取',charm:'魅惑',immune:'清心免疫',reflect:'反射',protected:'共生护盾',vulnerable:'弱点',armorBreak:'破甲',guard:'护体',manaArray:'聚灵阵',starArray:'星罗阵',swordDomain:'剑域',slow:'迟缓',heat:'炉温',illusion:'假象（无控制）',shellShield:'镜湖护壳'}[x.id]||x.id),remaining:round(x.remaining),stacks:x.stacks||1};});}
  function battleView(s){var b=s.battle;if(!b)return {active:false,lastResult:s.lastBattleResult||null,reports:battleReportsView(s)};var lo=loadout(s),t=activeTreasure(s),p=b.player;return {active:true,id:b.id,name:b.name,type:b.type,tier:b.tier,difficulty:b.difficulty,time:round(b.time),paused:b.paused,auto:b.auto,target:b.target,practice:!!b.practice,rules:b.rules,autoRetry:s.autoRetry||null,player:{hp:round(p.hp),maxHp:round(p.maxHp),mp:round(p.mp),maxMp:round(p.maxMp),shield:round(p.shield),resource:round(p.resource),resourceName:p.resourceName,statuses:prettyStatus(p.statuses)},enemies:b.enemies.map(function(e,i){return {index:i,id:e.id,name:e.name,hp:round(e.hp),maxHp:round(e.maxHp),shield:round(e.shield),statuses:prettyStatus(e.statuses),casting:e.casting?Object.assign({},e.casting,{remaining:round(e.casting.remaining)}):null,alive:e.hp>0};}),skills:configuredSkills(s,b).filter(function(id){return technique(s,id,b);}).map(function(id){var x=C.techniques[id],array=status(p.statuses,id==='array_skill_2'?'manaArray':id==='array_skill_3'?'starArray':'none'),reap=heart(s).id==='array_heart_1'&&array&&(array.elapsed||0)>=2,remaining=reap?0:b.cooldowns[id]||0;return {id:id,name:x.name+(reap?'·收阵':''),mp:reap?0:x.mp,cooldown:x.cooldown,remaining:round(remaining),ready:remaining<=0&&p.mp>=x.mp,description:x.description};}),treasure:t?{id:t.id,name:t.name,remaining:round(b.treasureCooldown),ready:b.treasureCooldown<=0}:null,pills:(lo.pills||[]).filter(function(id){return C.recipes[id];}).map(function(id){return {id:id,name:C.recipes[id].name,count:(b.practice?b.practicePills[id]:s.pills[id])||0,ready:b.potionCooldown<=0&&((b.practice?b.practicePills[id]:s.pills[id])||0)>0};}),potionRemaining:round(b.potionCooldown),queue:b.queue.slice(),protect:b.protect,log:b.log.slice(-12),performance:Object.assign({},b.performance)};}
  function battleReportsView(s){return JSON.parse(JSON.stringify((s.battleReports||[]).slice(-20).reverse()));}
  function dungeonView(s,id,tier,difficulty,floor){var d=C.dungeons[id];if(!d)return null;var p=s.paths[s.route];tier=Number.isInteger(tier)?tier:d.type==='resource'||d.type==='trial'?p.realm:Number(d.realm)||0;difficulty=Number.isInteger(difficulty)?difficulty:0;floor=Number(floor)||s.progress.tower+1;var locked=checkDungeon(Object.assign({},s,{battle:null,exploration:null}),d,tier,difficulty,floor);return Object.assign({},d,{selectedTier:tier,selectedDifficulty:difficulty,locked:!!locked,lockReason:locked,firstClear:s.progress.firstClears.indexOf(d.type==='tower'?'tower_'+floor:id+':'+tier+':'+difficulty)>=0,stars:s.progress.stars[id+':'+tier+':'+difficulty]||0,lootRates:d.type==='boss'?[{rarity:2,probability:[.65,.5,.35][difficulty]},{rarity:3,probability:[.25,.35,.45][difficulty]},{rarity:4,probability:[.095,.14,.18][difficulty]},{rarity:5,probability:[.005,.01,.02][difficulty]}]:null,criticalRewards:currentTierReward(s,tier),sweepCostMs:45000});}

  function previewDungeon(s,a){a=a||{};var d=C.dungeons[a.id];if(!d)return {allowed:false,requirements:['副本不存在'],rewards:{},firstRewards:{}};var p=s.paths[s.route],floor=Number(a.floor)||Math.min(60,s.progress.tower+1),tier=d.type==='resource'?(Number.isInteger(a.tier)?a.tier:p.realm):d.type==='trial'?p.realm:d.type==='tower'?Math.floor((floor-1)/10):d.realm,difficulty=Number.isInteger(a.difficulty)?a.difficulty:0,copy=JSON.parse(JSON.stringify(s));copy.battle=null;copy.exploration=null;
    if(tier<0||tier>5||difficulty<0||difficulty>2||!Number.isInteger(floor))return {allowed:false,requirements:['副本参数无效'],rewards:{},firstRewards:{}};
    var error=checkDungeon(copy,d,tier,difficulty,floor);if(d.type==='trial'&&!a.practice&&p.xp<K.xpNeeded(s))error='十层修为填满后参加正式突破试炼';
    var fake={id:d.id,type:d.type,tier:tier,difficulty:difficulty,floor:floor,bossIndex:Number.isInteger(d.bossIndex)?d.bossIndex:0,performance:{handled:0}},key=d.type==='tower'?'tower_'+floor:d.id+':'+tier+':'+difficulty;fake.firstKey=key;
    var repeat=rewardShell(),first=rewardShell(),isFirst=s.progress.firstClears.indexOf(key)<0;
    if(!a.practice&&d.type!=='trial'){
      if(d.type==='cave'){var base=d.rewards||{};repeat.stones=(base.stones||0)*(1+tier*2);repeat.xp=(base.xp||500)*(1+tier*2);repeat.materials=Object.assign({},base.materials||{});repeat.fragments=Object.assign({},base.fragments||{});if(currentTierReward(s,tier)){repeat.tickets=base.tickets||0;repeat.materials['crystal'+tier]=8;}repeat.gearCount=1;if(isFirst)mergeReward(first,d.firstRewards||{});}
      else{if(copy.progress.firstClears.indexOf(key)<0)copy.progress.firstClears.push(key);repeat=battleRewards(copy,fake);var fullCopy=JSON.parse(JSON.stringify(s));fullCopy.progress.firstClears=fullCopy.progress.firstClears.filter(function(x){return x!==key;});var full=battleRewards(fullCopy,fake);
        if(isFirst){['stones','xp','tickets','contribution'].forEach(function(k){first[k]=(full[k]||0)-(repeat[k]||0);});['materials','fragments'].forEach(function(k){Object.keys(full[k]||{}).forEach(function(id){var difference=full[k][id]-(repeat[k][id]||0);if(difference>0)first[k][id]=difference;});});first.techniques=full.techniques;first.treasures=full.treasures;first.blueprints=full.blueprints;}}
      repeat.gearCount=repeat.gearCount||(repeat.gear||[]).length;repeat.gear=[];first.gear=[];first.techniques=(first.techniques||[]).filter(function(id){if(s.techniques[id]){first.fragments.universal=(first.fragments.universal||0)+5;return false;}return true;});
    }
    var lootRates=d.type==='boss'||d.type==='cave'?[{rarity:2,probability:[.65,.5,.35][difficulty]},{rarity:3,probability:[.25,.35,.45][difficulty]},{rarity:4,probability:[.095,.14,.18][difficulty]},{rarity:5,probability:[.005,.01,.02][difficulty]}]:null,enemy=enemyFor(d.bossIndex,tier,difficulty,d.type,d.type==='tower'?floor:null);
    return {allowed:!error,requirements:error?[error]:[],attributes:{attack:Math.round(enemy.attack),defense:Math.round(enemy.defense),maxHp:Math.round(enemy.maxHp)},rewards:repeat,firstRewards:first,lootRates:lootRates,set:d.school||null,slotWeights:Object.fromEntries(Object.keys(C.slots).map(function(id){return [id,1];})),firstClear:!isFirst,stars:s.progress.stars[key]||0,practice:!!a.practice,consumption:{},failure:d.type==='cave'?'失败只保留归途阵门确认携出的常规材料；不发晶与券':'失败退出不发奖励、不降层、不毁装',performanceRewards:d.type==='trial'||a.practice?'无经济奖励':'成功处理机制可额外获得10%灵石与1参悟砂',note:d.type==='cave'?'这里展示最终通关奖励；途中房间会在选择前展示独立收益':''};
  }
  return {handle:handle,advanceBattle:advanceBattle,battleView:battleView,battleReportsView:battleReportsView,dungeonView:dungeonView,previewDungeon:previewDungeon,roomTypes:roomTypes};
});
