(function(root,factory){
  if(typeof module==='object'&&module.exports) module.exports=factory(require('./data.js'),require('./core.js'));
  else root.WendaoEconomy=factory(root.WendaoData,root.WendaoCore);
})(typeof globalThis!=='undefined'?globalThis:this,function(C,K){
  'use strict';
  var MAX_BAG=300,MAX_OVERFLOW=1000;
  var AFFIXES={
    attack:{id:'attack',name:'锋锐',base:3,kind:'flat'},
    defense:{id:'defense',name:'坚壁',base:2,kind:'flat'},
    hp:{id:'hp',name:'长生',base:18,kind:'flat'},
    crit:{id:'crit',name:'会心',base:0.025,kind:'ratio'},
    critDamage:{id:'critDamage',name:'重创',base:0.06,kind:'ratio'},
    dodge:{id:'dodge',name:'轻灵',base:0.02,kind:'ratio'},
    cooldownReduction:{id:'cooldownReduction',name:'迅法',base:0.025,kind:'ratio'},
    healing:{id:'healing',name:'回春',base:0.04,kind:'ratio'},
    penetration:{id:'penetration',name:'破势',base:0.025,kind:'ratio'},
    mpRegen:{id:'mpRegen',name:'聚元',base:0.35,kind:'flat'}
  };
  var TABLE=[
    {category:'gear',name:'装备',weights:[4,8,9,5,3.5,0.5]},
    {category:'treasure',name:'灵宝',weights:[0,3,4,5,2.7,0.3]},
    {category:'technique',name:'功法',weights:[3,7,6,3,0.8,0.2]},
    {category:'pill',name:'丹药',weights:[10,8,1,1,0,0]},
    {category:'material',name:'材料',weights:[8,4,2,1,0,0]}
  ];
  var EXCHANGES=[
    {id:'insight',name:'参悟材料×10',cost:{dust:20},reward:{materials:{insight:10}}},
    {id:'universal',name:'通用残页×5',cost:{dust:20}},
    {id:'lotus',name:'灵莲×3',cost:{dust:15},reward:{materials:{lotus:3}}},
    {id:'orangeGear',name:'本阶橙色装备',cost:{dust:120}},
    {id:'orangeTreasure',name:'橙色灵宝',cost:{dust:150}}
  ];
  var RESOURCE_MARKET=[
    {id:'herb',name:'灵草',reward:{materials:{herb:50}},price:{jade:40,dust:20}},
    {id:'ore',name:'玄铁',reward:{materials:{ore:50}},price:{jade:40,dust:20}},
    {id:'lotus',name:'灵莲',reward:{materials:{lotus:3}},price:{jade:40,dust:15}},
    {id:'insight',name:'参悟',reward:{materials:{insight:10}},price:{jade:40,dust:20}},
    {id:'essence',name:'炼器精华',reward:{materials:{essence:10}},price:{jade:60,dust:30}},
    {id:'soul',name:'器魂',reward:{materials:{soul:3}},price:{jade:80,dust:40}},
    {id:'stones',name:'灵石',reward:{stones:5000},price:{jade:60,dust:30}}
  ];
  RESOURCE_MARKET.forEach(function(item){
    if(item.reward.materials)Object.freeze(item.reward.materials);
    Object.freeze(item.reward);Object.freeze(item.price);Object.freeze(item);
  });
  Object.freeze(RESOURCE_MARKET);
  var SLOT_KEYS=Object.keys(C.slots),SCHOOL_KEYS=Object.keys(C.schools),AFFIX_KEYS=Object.keys(AFFIXES);
  var LEVEL_CAPS=[5,8,11,14,17,20],ENHANCE_CAPS=[5,8,12,16,20,20];
  function yes(message,data){return {ok:true,message:message,data:data};}
  function no(message){return {ok:false,message:message};}
  function copy(v){return JSON.parse(JSON.stringify(v));}
  function int(v,min,max){return Number.isInteger(v)&&v>=min&&v<=max;}
  function path(s){return s.paths[s.route];}
  function rand(s,stream){return K.rng(s,stream||'loot');}
  function pick(s,list,stream){return list[Math.min(list.length-1,Math.floor(rand(s,stream)*list.length))];}
  function weighted(s,list,weight,stream){
    var total=list.reduce(function(n,x){return n+weight(x);},0);
    var r=rand(s,stream)*total;
    for(var i=0;i<list.length;i++){r-=weight(list[i]);if(r<0)return list[i];}
    return list[list.length-1];
  }
  function learned(s,id){return !!s.techniques[id];}
  function available(s,item){var p=path(s);return item&&item.realm<=p.realm&&(item.realm<p.realm||(item.layer||1)<=p.layer);}
  function gear(s,uid){return s.bag.find(function(g){return String(g.uid)===String(uid);});}
  function busy(s){return !!s.battle;}
  function qualityName(r){return C.rarities[r].name;}
  function gearTitle(g){return K.gearName?K.gearName(g):qualityName(g.rarity)+'·'+C.sets[g.set].name+C.slots[g.slot];}
  function addMaterial(s,id,n){K.add(s.materials,id,n);}
  function protect(s,uid){
    if(K.protectedGear&&K.protectedGear(s,uid))return true;
    var g=gear(s,uid);if(!g||g.locked)return !!g;
    if(Object.keys(s.equipped).some(function(k){return s.equipped[k]===uid;}))return true;
    return Object.keys(s.presets).some(function(r){return s.presets[r].some(function(p){return p&&p.equipped&&Object.keys(p.equipped).some(function(k){return p.equipped[k]===uid;});});});
  }
  function capacity(s,count){return s.bag.length+(s.rewardOverflow||[]).length+count<=MAX_BAG+MAX_OVERFLOW;}
  function affixValue(s,id,tier,rarity,stream){
    var def=AFFIXES[id],roll=0.8+rand(s,stream)*0.4,mult=1+(rarity-1)*0.12;
    var n=def.base*mult*roll*(def.kind==='flat'?Math.pow(2.6,tier):1+Math.min(5,tier)*0.06);
    return def.kind==='ratio'?Math.round(n*10000)/10000:Math.round(n*100)/100;
  }
  function rollAffixes(s,tier,rarity,count,locked,forced,stream){
    var out=(locked||[]).map(copy),used=out.map(function(a){return a.id;});
    if(forced&&used.indexOf(forced)<0&&out.length<count){
      out.push({id:forced,value:affixValue(s,forced,tier,rarity,stream)});used.push(forced);
    }
    while(out.length<count){
      var id=pick(s,AFFIX_KEYS.filter(function(x){return used.indexOf(x)<0;}),stream);
      out.push({id:id,value:affixValue(s,id,tier,rarity,stream)});used.push(id);
    }
    return out;
  }
  function createGear(s,options){
    options=options||{};
    var rarity=int(options.rarity,0,5)?options.rarity:2;
    var tier=int(options.tier,0,5)?options.tier:path(s).realm;
    var slot=C.slots[options.slot]?options.slot:pick(s,SLOT_KEYS,options.stream);
    var set=C.schools[options.set]?options.set:pick(s,SCHOOL_KEYS,options.stream);
    return {uid:'g'+s.nextUid++,slot:slot,rarity:rarity,tier:tier,set:set,
      affixes:rollAffixes(s,tier,rarity,[0,1,1,2,3,4][rarity],null,null,options.stream),
      special:rarity===5?set:null,awakening:0,locked:false,rerolls:0,targetMisses:0,targetId:null};
  }
  function addGear(s,g){
    if(s.bag.length<MAX_BAG){s.bag.push(g);return true;}
    if(!s.rewardOverflow)s.rewardOverflow=[];
    if(s.rewardOverflow.length>=MAX_OVERFLOW)return false;
    s.rewardOverflow.push(g);return true;
  }
  function pools(s){
    var cells=[];
    TABLE.forEach(function(row){
      row.weights.forEach(function(w,r){
        if(!w)return;
        var items=[];
        if(row.category==='gear'){
          SLOT_KEYS.forEach(function(slot){SCHOOL_KEYS.forEach(function(set){items.push({id:'gear_'+set+'_'+slot,name:qualityName(r)+'·'+C.sets[set].name+C.slots[slot],slot:slot,set:set});});});
        }else if(row.category==='treasure'){
          Object.keys(C.treasures).forEach(function(id){var t=C.treasures[id];if(t.rarity===r&&available(s,t))items.push({id:id,name:t.name});});
        }else if(row.category==='technique'){
          Object.keys(C.techniques).forEach(function(id){var t=C.techniques[id];if(t.rarity===r&&available(s,t))items.push({id:id,name:t.name});});
        }else if(row.category==='pill'){
          Object.keys(C.recipes).forEach(function(id){var t=C.recipes[id];if((t.rarity||0)===r&&available(s,t))items.push({id:id,name:t.name});});
        }else{
          var choices=[['herb','ore'],['herb','ore'],['insight','essence'],['lotus','essence']][r];
          var names={herb:'灵草',ore:'灵矿',insight:'参悟材料',essence:'炼器精华',lotus:'灵莲'};
          choices.forEach(function(id){items.push({id:id,name:names[id]});});
        }
        cells.push({category:row.category,rarity:r,weight:w,items:items});
      });
    });
    return cells;
  }
  function targets(s){
    if(!K.unlocks(s).gacha)return [];
    var result=[];
    pools(s).filter(function(c){return c.rarity===5;}).forEach(function(c){
      c.items.forEach(function(i){result.push({id:i.id,name:i.name,category:c.category});});
    });
    return result;
  }
  function eligibleTechnique(s,id){return C.techniques[id]&&available(s,C.techniques[id]);}
  function costs(s,type,a){
    a=a||{};var p=path(s),lv,g,t,n,id;
    if(type==='buyResource'){
      t=RESOURCE_MARKET.find(function(x){return x.id===a.item;});
      if(!t||a.currency!=='jade'&&a.currency!=='dust'||!int(a.count,1,99))return null;
      var marketCost={};marketCost[a.currency]=t.price[a.currency]*a.count;return marketCost;
    }
    if(type==='exchangeJade'||type==='drawWithJade')return {jade:C.shop.jadePerDraw*(a.count===10?10:1)};
    if(type==='upgradeTechnique'){
      t=s.techniques[a.id];if(!t)return null;lv=t.level;
      return {stones:80*(lv+1)*(p.realm+1),materials:{insight:2+lv}};
    }
    if(type==='enhanceSlot'){
      if(!C.slots[a.slot])return null;lv=s.slotLevels[a.slot]||0;
      return {stones:100*(lv+1)*(p.realm+1),materials:{ore:2+lv}};
    }
    if(type==='forgeGear'){
      if(!int(a.rarity,0,5))return null;
      n=a.rarity;
      var forgeScales=[0.4,1,3,7,16,35];
      var m={ore:n===5?40*(1+Math.max(0,p.realm-1)):[2,4,6,10,20][n]*(p.realm+1)};
      if(n===5)m['crystal'+p.realm]=240;
      if(n>=3)m.essence=(n-2)*3;
      return {stones:n===5?Math.ceil(26000*forgeScales[p.realm]):[80,140,220,600,2200][n]*(p.realm+1),materials:m};
    }
    if(type==='recastGear'){
      g=gear(s,a.uid);if(!g)return null;var rm={ore:12+4*p.realm};
      if(g.rarity===5)rm['crystal'+p.realm]=24;else if(g.rarity>=3)rm.essence=3;
      return {stones:500*(p.realm+1)*(g.rarity+1),materials:rm};
    }
    if(type==='rerollGear'){
      g=gear(s,a.uid);if(!g)return null;var locks=Array.isArray(a.locks)?a.locks:[];
      return {stones:80*(g.tier+1)*(g.rarity+1),dust:5+2*g.rarity+8*locks.length,materials:{essence:1+locks.length}};
    }
    if(type==='awakenGear'){
      g=gear(s,a.uid);if(!g)return null;n=(g.awakening||0)+1;
      var am={essence:20*n};am['crystal'+g.tier]=120*n;
      return {stones:6000*n*(g.tier+1),dust:60*n,materials:am};
    }
    if(type==='researchRecipe'){t=C.recipes[a.id];return t?copy(t.researchCost):null;}
    if(type==='craftPill'||type==='queuePill'){
      t=C.recipes[a.id];if(!t)return null;n=int(a.count,1,100)?a.count:1;
      var cm={};Object.keys(t.materials).forEach(function(k){cm[k]=t.materials[k]*n;});
      return {stones:(t.stones||0)*n,materials:cm};
    }
    if(type==='startAlchemyControl'){
      var job=(s.alchemy&&s.alchemy.jobs||[]).find(function(j){return j.id===a.jobId;});
      return job?{stones:10*job.count*(C.recipes[job.recipe].realm+1)}:null;
    }
    if(type==='upgradeFacility'){
      if(!C.facilities[a.id])return null;lv=s.facilities[a.id]||1;
      return {stones:250*lv*lv,materials:{ore:8*lv,herb:4*lv}};
    }
    if(type==='upgradeTreasure'){
      t=s.ownedTreasures[a.id];if(!t)return null;lv=t.level;
      return {stones:300*(lv+1)*(p.realm+1),materials:{essence:2+lv,insight:lv}};
    }
    if(type==='draw')return {tickets:a.count};
    if(type==='exchangeDust'){t=EXCHANGES.find(function(x){return x.id===a.item;});return t?copy(t.cost):null;}
    return null;
  }
  function pay(s,cost){return cost&&K.spend(s,cost);}
  function gachaAward(s,category,rarity,item){
    var name=item.name,duplicate=false,uid;
    if(category==='gear'){
      var g=createGear(s,{slot:item.slot,rarity:rarity,tier:path(s).realm,set:item.set,stream:'gacha'});
      addGear(s,g);uid=g.uid;name=gearTitle(g);
    }else if(category==='treasure'){
      if(s.ownedTreasures[item.id]){s.ownedTreasures[item.id].count++;duplicate=true;}
      else s.ownedTreasures[item.id]={level:1,count:1,awakening:0};
    }else if(category==='technique'){
      if(learned(s,item.id)){K.add(s.fragments,'universal',5);duplicate=true;}
      else s.techniques[item.id]={level:1,branch:0,spent:0,resetUsed:false};
    }else if(category==='pill'){
      K.add(s.pills,item.id,1);
    }else{
      var qty=[8,10,6,3][rarity];
      addMaterial(s,item.id,qty);name+='×'+qty;
    }
    return {category:category,rarity:rarity,id:item.id,itemId:item.id,uid:uid,name:name,duplicate:duplicate};
  }
  function draw(s,count,now){
    if(s.battle)return no('请结束当前战斗后进行天道感应');
    if(!K.unlocks(s).gacha)return no('达到第二大境一层后开放天道感应');
    if(count!==1&&count!==10)return no('请选择单次或十次感应');
    if(s.tickets<count)return no('感应券不足');
    if(!capacity(s,count))return no('背包与奖励盒空间不足，请先整理');
    var pool=pools(s);
    if(pool.some(function(c){return c.items.length===0;}))return no('当前奖池配置不完整，已保留感应券');
    var redPool=pool.filter(function(c){return c.rarity===5;});
    var targetList=targets(s),target=s.gacha.target?targetList.find(function(t){return t.id===s.gacha.target;}):null;
    if(s.gacha.target&&!target)return no('定向目标尚未开放，请重新选择或取消目标');
    var result=[],at=Number.isFinite(now)?now:Date.now();
    if(!pay(s,{tickets:count}))return no('感应券不足');
    for(var n=0;n<count;n++){
      var before={high:s.gacha.highPity,red:s.gacha.redPity,fate:!!s.gacha.fateGuarantee};
      var attempt=s.gacha.redPity+1;
      var redChance=attempt>=80?1:attempt>50?0.01+(attempt-50)*0.005:0.01;
      var red=rand(s,'gacha')<redChance,cell,item;
      if(red){
        if(target&&(s.gacha.fateGuarantee||rand(s,'gacha')<0.5)){
          cell=redPool.find(function(c){return c.category===target.category;});
          item=cell.items.find(function(i){return i.id===target.id;});
          s.gacha.fateGuarantee=false;
        }else if(target){
          var alternatives=[];
          redPool.forEach(function(c){c.items.forEach(function(i){if(i.id!==target.id)alternatives.push({cell:c,item:i,weight:c.weight/c.items.length});});});
          var alt=weighted(s,alternatives,function(x){return x.weight;},'gacha');
          cell=alt.cell;item=alt.item;s.gacha.fateGuarantee=true;
        }else{
          cell=weighted(s,redPool,function(c){return c.weight;},'gacha');item=pick(s,cell.items,'gacha');
        }
        s.gacha.redPity=0;s.gacha.highPity=0;
      }else{
        var choices=pool.filter(function(c){return s.gacha.highPity>=9?c.rarity===4:c.rarity<5;});
        cell=weighted(s,choices,function(c){return c.weight;},'gacha');item=pick(s,cell.items,'gacha');
        s.gacha.redPity++;s.gacha.highPity=cell.rarity>=4?0:s.gacha.highPity+1;
      }
      var reward=gachaAward(s,cell.category,cell.rarity,item);
      K.add(s,'dust',2);s.gacha.total++;
      var entry={at:at,category:reward.category,rarity:reward.rarity,id:reward.id,name:reward.name,
        target:s.gacha.target,highBefore:before.high,redBefore:before.red,highAfter:s.gacha.highPity,
        redAfter:s.gacha.redPity,fateBefore:before.fate,fateAfter:!!s.gacha.fateGuarantee,drawIndex:s.gacha.total};
      if(reward.uid!==undefined)entry.uid=reward.uid;
      s.gacha.history.push(entry);if(s.gacha.history.length>200)s.gacha.history.shift();K.log(s,'天道感应：'+reward.name,at);
      result.push(Object.assign({},reward,entry));
    }
    return yes('感应完成，奖励与保底已记入存档',{results:result});
  }
  function checkLoadout(s,loadout){
    var u=K.unlocks(s),heart=loadout.heart;
    if(heart&&(!learned(s,heart)||!eligibleTechnique(s,heart)||C.techniques[heart].kind!=='heart'))return '心法未学会或尚未开放';
    var checks=[['skills','skill',u.skillSlots],['secrets','secret',u.secretSlots]];
    for(var k=0;k<checks.length;k++){
      var spec=checks[k],ids=loadout[spec[0]];
      if(!Array.isArray(ids)||ids.length>spec[2]||new Set(ids).size!==ids.length)return '神通或秘术数量超出开放槽位';
      for(var j=0;j<ids.length;j++)if(!learned(s,ids[j])||!eligibleTechnique(s,ids[j])||C.techniques[ids[j]].kind!==spec[1])return '功法未学会或尚未开放';
    }
    if(!Array.isArray(loadout.treasures)||loadout.treasures.length>3)return '灵宝槽配置错误';
    while(loadout.treasures.length<3)loadout.treasures.push(null);
    for(var i=0;i<loadout.treasures.length;i++){
      var id=loadout.treasures[i];if(!id)continue;
      var t=C.treasures[id];
      if(i>=u.treasureSlots||!s.ownedTreasures[id]||!available(s,t)||(i===0?t.kind!=='active':t.kind!=='passive'))return '灵宝未拥有、尚未开放或槽位不符';
      if(loadout.treasures.indexOf(id)!==i)return '同一灵宝不能重复装备';
    }
    if(!Array.isArray(loadout.pills)||loadout.pills.length>3)return '最多携带三种丹药';
    if(new Set(loadout.pills).size!==loadout.pills.length)return '携带丹药不能重复';
    for(var q=0;q<loadout.pills.length;q++){
      var recipe=C.recipes[loadout.pills[q]];
      if(!recipe||recipe.kind==='qi'||!available(s,recipe))return '该丹药不能用于当前战斗';
    }
    return null;
  }
  function recycleReward(s,g){
    K.add(s,'dust',[1,2,4,8,20,60][g.rarity]);
    K.add(s,'stones',30*(g.tier+1)*(g.rarity+1));
    if(g.rarity===5)addMaterial(s,'soul',1);
  }
  var FIRE_KEYS=['low','medium','high'];
  var FIRE_HINTS={
    low:'药液开始翻涌，丹纹正在闭合；收为文火，避免冲散药性。',
    medium:'炉中药香渐稳，丹纹流转均匀；维持中火，使诸药融合。',
    high:'药液尚未化开，炉壁凝出寒霜；添为武火，化开药核。'
  };
  function alchemyCapacity(s){return 2+Math.floor((s.facilities.furnace||1)/2);}
  function alchemyBonus(count,score){return score<2?0:Math.max(1,Math.floor(count*(score===3?0.2:0.1)));}
  function alchemyView(s){
    var jobs=s.alchemy?s.alchemy.jobs:[];
    return {capacity:alchemyCapacity(s),activeJobId:(jobs.find(function(j){return j.status==='control';})||{}).id||null,
      jobs:jobs.map(function(j){
        var expected=j.status==='control'?j.rhythm[j.round]:null;
        return Object.assign({},copy(j),{name:C.recipes[j.recipe].name,hint:expected?FIRE_HINTS[expected]:j.status==='queued'?'基础药材已备齐，可直接成丹，或额外支付灵石进入三轮控火。':'三轮控火已结束，可领取基础丹药与控火加成。',
          expectedFire:expected,controlCostPreview:{stones:10*j.count*(C.recipes[j.recipe].realm+1)}});
      })};
  }
  function alchemyHandle(s,a,now){
    if(!s.alchemy)s.alchemy={nextId:1,jobs:[]};
    var jobs=s.alchemy.jobs,job,recipe,n,cost;
    if(a.type==='queuePill'){
      recipe=C.recipes[a.id];if(!recipe||!available(s,recipe))return no('丹方尚未开放');
      if((s.learnedRecipes||[]).indexOf(a.id)<0)return no('尚未学会丹方，请从图鉴研究或通关来源副本');
      n=a.count===undefined?1:a.count;if(!int(n,1,100))return no('每批制作计划为1至100炉');
      if(jobs.length>=alchemyCapacity(s))return no('药炉队列已满，请成丹、取消或升级药炉');
      if(s.alchemy.nextId>=K.CAP)return no('炼丹计划编号已达上限');
      cost=costs(s,a.type,{id:a.id,count:n});if(!pay(s,cost))return no('炼丹材料不足');
      var rhythm=[];for(var i=0;i<3;i++)rhythm.push(pick(s,FIRE_KEYS,'world'));
      job={id:'a'+s.alchemy.nextId++,recipe:a.id,count:n,cost:copy(cost),route:s.route,routeTier:path(s).realm,
        status:'queued',round:0,score:0,rhythm:rhythm,choices:[],controlCost:{stones:0},bonus:0,
        createdAt:Number.isSafeInteger(now)&&now>=0?now:Date.now()};
      jobs.push(job);return yes('已预付材料，加入'+recipe.name+'×'+n+'制作计划',{job:copy(job)});
    }
    job=jobs.find(function(j){return j.id===a.jobId;});if(!job)return no('炼丹计划不存在或已领取');
    recipe=C.recipes[job.recipe];
    if(a.type==='startAlchemyControl'){
      if(s.battle)return no('请结束战斗后再开始控火');
      if(job.status!=='queued')return no('这份炼丹计划已开始控火');
      if(jobs.some(function(j){return j.status==='control';}))return no('请先完成或取消正在控火的一炉');
      cost=costs(s,a.type,a);if(!pay(s,cost))return no('控火灵石不足，基础制作计划保留');
      job.controlCost=copy(cost);job.status='control';
      return yes('已支付控火费用，请查看药炉提示并选择本轮火候',{job:copy(job),hint:FIRE_HINTS[job.rhythm[0]]});
    }
    if(a.type==='stokeAlchemy'){
      if(s.battle)return no('请结束战斗后再继续控火');
      if(job.status!=='control')return no('该炉不在控火中');
      if(FIRE_KEYS.indexOf(a.fire)<0)return no('请选择文火、中火或武火');
      var correct=a.fire===job.rhythm[job.round];if(correct)job.score++;job.choices.push(a.fire);
      job.round++;
      if(job.round===3){job.bonus=alchemyBonus(job.count,job.score);job.status='ready';}
      return yes(job.status==='ready'?'控火结束：正确'+job.score+'/3轮，额外'+job.bonus+'枚，基础产出始终保留':correct?'火候契合，查看下一轮药炉变化':'本轮火候未合，基础药材仍安全，查看下一轮药炉变化',
        {job:copy(job),correct:correct,hint:job.status==='control'?FIRE_HINTS[job.rhythm[job.round]]:null});
    }
    if(a.type==='finishAlchemyJob'){
      if(job.status==='control')return no('请完成三轮控火，或取消并退回未成丹费用');
      n=job.count+job.bonus;if((s.pills[job.recipe]||0)+n>K.CAP)return no('该丹药数量已达存储上限，请先使用');
      K.add(s.pills,job.recipe,n);K.add(s.stats,'crafted',n);K.add(s.stats,'craftedTier'+recipe.realm,n);
      jobs.splice(jobs.indexOf(job),1);
      return yes('炼成'+recipe.name+'×'+n+(job.bonus?'，控火额外'+job.bonus+'枚':''),{id:job.recipe,count:n,bonus:job.bonus,jobId:job.id});
    }
    if(a.type==='cancelAlchemyJob'){
      if(s.stones+job.cost.stones+job.controlCost.stones>K.CAP||Object.keys(job.cost.materials).some(function(id){return s.materials[id]+job.cost.materials[id]>K.CAP;}))return no('退款物品会超过存储上限，请先消耗对应灵石或药材');
      K.grant(s,job.cost);K.grant(s,job.controlCost);jobs.splice(jobs.indexOf(job),1);
      return yes('已取消制作计划，未成丹药材和已付控火灵石全额退回',{jobId:job.id,refunded:{cost:copy(job.cost),controlCost:copy(job.controlCost)}});
    }
    return null;
  }
  function handle(s,a,now){
    if(!a||typeof a.type!=='string')return null;
    var t,id,g,lv,cost,err,n,result;
    var actions=['learnTechnique','upgradeTechnique','resetTechnique','setTechniqueBranch','setLoadout','savePreset','loadPreset',
      'equipGear','autoEquip','recycleGear','bulkRecycle','lockGear','enhanceSlot','forgeGear','recastGear','rerollGear','acceptReroll',
      'awakenGear','researchRecipe','craftPill','queuePill','startAlchemyControl','stokeAlchemy','finishAlchemyJob','cancelAlchemyJob','usePill','upgradeFacility','equipTreasure','upgradeTreasure','recycleTreasure',
      'setGachaTarget','draw','drawWithJade','buyJade','buyResource','exchangeJade','exchangeDust','claimOverflow'];
    if(actions.indexOf(a.type)<0)return null;
    if(['queuePill','startAlchemyControl','stokeAlchemy','finishAlchemyJob','cancelAlchemyJob'].indexOf(a.type)>=0){
      var alchemyValidation=K.validate(s);
      if(!alchemyValidation.ok)return no('炼丹记录异常，未扣费或领奖：'+alchemyValidation.error);
      return alchemyHandle(s,a,now);
    }
    var combatBlocked=['learnTechnique','upgradeTechnique','resetTechnique','setTechniqueBranch','setLoadout','loadPreset',
      'researchRecipe','equipGear','autoEquip','enhanceSlot','recastGear','rerollGear','acceptReroll','awakenGear','equipTreasure','upgradeTreasure','usePill','draw','drawWithJade','forgeGear','exchangeDust'];
    if(busy(s)&&combatBlocked.indexOf(a.type)>=0)return no('请结束当前战斗后调整养成与配置');
    if(a.type==='learnTechnique'){
      t=C.techniques[a.id];if(!t)return no('功法不存在');
      if(learned(s,a.id))return no('已学会这部功法');
      if(!available(s,t))return no('境界尚未达到功法要求');
      if((s.fragments[a.id]||0)>=20)s.fragments[a.id]-=20;
      else if((s.fragments.universal||0)>=20)s.fragments.universal-=20;
      else return no('需要20张指定或通用残页');
      s.techniques[a.id]={level:1,branch:0,spent:0,resetUsed:false};
      return yes('学会'+t.name);
    }
    if(a.type==='upgradeTechnique'){
      t=s.techniques[a.id];if(!t||!C.techniques[a.id])return no('请先学会功法');
      if(!available(s,C.techniques[a.id]))return no('当前路线境界不足');
      if(t.level>=LEVEL_CAPS[path(s).realm])return no('已达到当前大境功法等级上限');
      cost=costs(s,a.type,a);if(!pay(s,cost))return no('灵石或参悟材料不足');
      t.level++;t.spent=(t.spent||0)+cost.materials.insight;K.add(s.stats,'studyTier'+path(s).realm,1);
      return yes(C.techniques[a.id].name+'提升至'+t.level+'级');
    }
    if(a.type==='resetTechnique'){
      t=s.techniques[a.id];if(!t||t.level<=1)return no('无需重置');
      n=Math.floor((t.spent||0)*(t.resetUsed?0.9:1));
      addMaterial(s,'insight',n);t.level=1;t.branch=0;t.spent=0;t.resetUsed=true;
      return yes('重置完成，返还'+n+'参悟材料',{refunded:n});
    }
    if(a.type==='setTechniqueBranch'){
      t=s.techniques[a.id];if(!t||!C.techniques[a.id])return no('请先学会功法');
      if(t.level<5)return no('功法5级后开放分支');
      if(a.branch!==0&&a.branch!==1)return no('分支选择无效');
      t.branch=a.branch;return yes('功法分支已切换');
    }
    if(a.type==='setLoadout'){
      var lo=copy(s.loadouts[s.route]);
      ['heart','skills','secrets','treasures','pills'].forEach(function(k){if(a[k]!==undefined)lo[k]=copy(a[k]);});
      err=checkLoadout(s,lo);if(err)return no(err);
      s.loadouts[s.route]=lo;return yes('功法配置已保存');
    }
    if(a.type==='savePreset'){
      if(!int(a.index,0,2))return no('预设编号无效');
      s.presets[s.route][a.index]={loadout:copy(s.loadouts[s.route]),equipped:copy(s.equipped)};
      return yes('预设'+(a.index+1)+'已保存');
    }
    if(a.type==='loadPreset'){
      if(!int(a.index,0,2)||!s.presets[s.route][a.index])return no('该预设为空');
      var preset=s.presets[s.route][a.index],load=copy(preset.loadout||preset);
      err=checkLoadout(s,load);if(err)return no(err);
      if(preset.equipped){
        var eq=copy(preset.equipped);
        for(id in eq){if(eq[id]!==null){g=gear(s,eq[id]);if(!g||g.slot!==id)return no('预设装备缺失，请重新保存');}}
        s.equipped=eq;
      }
      s.loadouts[s.route]=load;return yes('预设已应用');
    }
    if(a.type==='equipGear'){
      g=gear(s,a.uid);if(!g)return no('装备不存在');
      s.equipped[g.slot]=g.uid;return yes('已装备'+gearTitle(g));
    }
    if(a.type==='autoEquip'){
      var changed=0;
      SLOT_KEYS.forEach(function(slot){
        var list=s.bag.filter(function(x){return x.slot===slot;});
        if(!list.length)return;
        var best=list.reduce(function(a,b){
          var aa=K.gearStats(s,a),bb=K.gearStats(s,b);
          function score(v){return (v.attack||0)*3+(v.defense||0)*2+(v.maxHp||v.hp||0)*0.2+(v.crit||0)*80+(v.penetration||0)*80;}
          return score(bb)>score(aa)?b:a;
        });
        if(s.equipped[slot]!==best.uid){s.equipped[slot]=best.uid;changed++;}
      });
      return yes(changed?'已按基础属性装备'+changed+'件；套装搭配可手动调整':'当前装备已是推荐配置');
    }
    if(a.type==='lockGear'){
      g=gear(s,a.uid);if(!g)return no('装备不存在');g.locked=!g.locked;
      return yes(g.locked?'装备已锁定':'装备已解锁');
    }
    if(a.type==='recycleGear'){
      g=gear(s,a.uid);if(!g)return no('装备不存在');
      if(protect(s,g.uid))return no('装备中、锁定或预设中的物品不能分解');
      if(g.rarity===5&&!a.confirm)return no('红装分解需单独确认');
      if(s.rerollPending&&s.rerollPending.uid===g.uid)return no('请先处理洗炼结果');
      recycleReward(s,g);s.bag=s.bag.filter(function(x){return x.uid!==g.uid;});
      return yes('已分解'+gearTitle(g));
    }
    if(a.type==='bulkRecycle'){
      if(!int(a.maxRarity,0,4))return no('批量分解不会包含红装');
      var recycled=[];
      s.bag=s.bag.filter(function(x){
        if(x.rarity>a.maxRarity||protect(s,x.uid)||(s.rerollPending&&s.rerollPending.uid===x.uid))return true;
        recycleReward(s,x);recycled.push(x.uid);return false;
      });
      return yes('已分解'+recycled.length+'件未保护装备',{uids:recycled});
    }
    if(a.type==='enhanceSlot'){
      if(!C.slots[a.slot])return no('部位无效');
      lv=s.slotLevels[a.slot]||0;if(lv>=ENHANCE_CAPS[path(s).realm])return no('已达到当前境界强化上限');
      if(!pay(s,costs(s,a.type,a)))return no('强化材料不足');
      s.slotLevels[a.slot]=lv+1;return yes(C.slots[a.slot]+'强化至+'+(lv+1)+'，更换装备继承');
    }
    if(a.type==='forgeGear'){
      if(!C.slots[a.slot]||!C.schools[a.set]||!int(a.rarity,0,5))return no('打造选择无效');
      if(a.rarity===5&&s.blueprints.indexOf(a.set)<0)return no('尚未学会此套红装蓝图；完成器道支线或对应妖王首通');
      if(!capacity(s,1))return no('请先整理背包与奖励盒');
      if(!pay(s,costs(s,a.type,a)))return no('打造材料不足');
      g=createGear(s,{slot:a.slot,set:a.set,rarity:a.rarity,tier:path(s).realm});addGear(s,g);
      K.add(s.stats,'forged',1);return yes('打造成功：'+gearTitle(g),{gear:copy(g)});
    }
    if(a.type==='recastGear'){
      g=gear(s,a.uid);if(!g)return no('装备不存在');
      if(g.tier>=path(s).realm)return no('当前装备已达到可用阶位');
      if(s.rerollPending&&s.rerollPending.uid===g.uid)return no('请先处理洗炼结果');
      if(!pay(s,costs(s,a.type,a)))return no('重铸材料不足');
      var oldTier=g.tier;g.tier=path(s).realm;
      g.affixes.forEach(function(f){if(AFFIXES[f.id].kind==='flat')f.value=Math.round(f.value*Math.pow(2.6,g.tier-oldTier)*100)/100;});
      return yes('重铸完成，品质、词条与专属效果保留');
    }
    if(a.type==='rerollGear'){
      g=gear(s,a.uid);if(!g||!g.affixes.length)return no('该装备没有可洗炼词条');
      if(s.rerollPending)return no('请先接受或放弃上一次洗炼结果');
      var lockIndexes=Array.isArray(a.locks)?a.locks:[];
      if(new Set(lockIndexes).size!==lockIndexes.length||lockIndexes.some(function(x){return !int(x,0,g.affixes.length-1);})||lockIndexes.length>=g.affixes.length)return no('锁定词条选择无效，至少留一条用于洗炼');
      var targetId=a.target||null;if(targetId&&!AFFIXES[targetId])return no('定向词条类型无效');
      if(!pay(s,costs(s,a.type,a)))return no('洗炼材料不足');
      var misses=g.targetId===targetId?(g.targetMisses||0):0;
      var guaranteed=!!targetId&&misses>=9;
      var locks=lockIndexes.map(function(i){return g.affixes[i];});
      var next=rollAffixes(s,g.tier,g.rarity,g.affixes.length,locks,guaranteed?targetId:null);
      var hit=targetId&&next.some(function(f){return f.id===targetId;});
      g.rerolls=(g.rerolls||0)+1;g.targetId=targetId;g.targetMisses=targetId?(hit?0:misses+1):0;
      s.rerollPending={uid:g.uid,affixes:next,target:targetId,targetMisses:g.targetMisses};
      return yes(guaranteed?'定向词条已出现，请选择保留新旧结果':'洗炼完成，请选择保留新旧结果',
        {uid:g.uid,old:copy(g.affixes),next:copy(next),target:targetId,guaranteed:guaranteed});
    }
    if(a.type==='acceptReroll'){
      if(!s.rerollPending||String(s.rerollPending.uid)!==String(a.uid))return no('没有对应洗炼结果');
      g=gear(s,a.uid);if(!g)return no('装备不存在');
      if(a.accept!==true&&a.accept!==false)return no('请选择新旧词条');
      if(a.accept)g.affixes=copy(s.rerollPending.affixes);
      s.rerollPending=null;return yes(a.accept?'已替换为新词条':'已保留旧词条');
    }
    if(a.type==='awakenGear'){
      g=gear(s,a.uid);if(!g||g.rarity!==5)return no('只有红色道品装备可以觉醒');
      if((g.awakening||0)>=3)return no('已达到第三次觉醒');
      if(!pay(s,costs(s,a.type,a)))return no('觉醒材料不足');
      g.awakening=(g.awakening||0)+1;return yes('红装觉醒至'+g.awakening+'阶');
    }
    if(a.type==='researchRecipe'){
      t=C.recipes[a.id];if(!t||!available(s,t))return no('当前路线境界尚未达到丹方研究要求');
      if((s.learnedRecipes||[]).indexOf(a.id)>=0)return no('已学会这份丹方');
      cost=costs(s,a.type,a);if(!pay(s,cost))return no('研究所需灵石或参悟材料不足');
      K.learnRecipe(s,a.id,{type:'research',source:'furnace',at:Number.isSafeInteger(now)&&now>=0?now:s.lastAt});
      return yes('研究完成，学会'+t.name+'丹方',{id:a.id,cost:copy(cost)});
    }
    if(a.type==='craftPill'){
      t=C.recipes[a.id];if(!t||!available(s,t))return no('丹方尚未开放');
      if((s.learnedRecipes||[]).indexOf(a.id)<0)return no('尚未学会丹方，请从图鉴研究或通关来源副本');
      n=a.count===undefined?1:a.count;if(!int(n,1,100))return no('每批炼制1至100炉');
      var control=a.control===undefined?0:a.control;if(!int(control,0,2))return no('控火方式无效');
      if((s.pills[a.id]||0)+n>K.CAP)return no('该丹药数量已达存储上限，请先使用');
      if(!pay(s,costs(s,a.type,{id:a.id,count:n})))return no('炼丹材料不足');
      K.add(s.pills,a.id,n);K.add(s.stats,'crafted',n);K.add(s.stats,'craftedTier'+t.realm,n);
      return yes('炼成'+t.name+'×'+n,{id:a.id,count:n,bonus:0});
    }
    if(a.type==='usePill'){
      t=C.recipes[a.id];if(!t||t.kind!=='qi')return no('回复、防护、净化和调养丹请在战斗中使用');
      if(!available(s,t))return no('当前境界尚不能使用该丹药');
      if(!pay(s,{pills:(function(){var p={};p[a.id]=1;return p;})()}))return no('丹药不足');
      K.addXp(s,t.effect.xp||0);K.add(s.stats,'pillsUsed',1);
      return yes('服用'+t.name+'，获得'+(t.effect.xp||0)+'修为');
    }
    if(a.type==='upgradeFacility'){
      t=C.facilities[a.id];if(!t)return no('设施不存在');
      lv=s.facilities[a.id]||1;if(lv>=t.maxLevel)return no('设施已满级');
      if(!pay(s,costs(s,a.type,a)))return no('设施升级材料不足');
      s.facilities[a.id]=lv+1;return yes(t.name+'提升至'+(lv+1)+'级');
    }
    if(a.type==='equipTreasure'){
      if(!int(a.index,0,2))return no('灵宝槽无效');
      var tr=copy(s.loadouts[s.route].treasures);tr[a.index]=a.id||null;
      var nextLoad=copy(s.loadouts[s.route]);nextLoad.treasures=tr;
      err=checkLoadout(s,nextLoad);if(err)return no(err);
      s.loadouts[s.route]=nextLoad;return yes(a.id?'已装备'+C.treasures[a.id].name:'已卸下灵宝');
    }
    if(a.type==='upgradeTreasure'){
      t=s.ownedTreasures[a.id];if(!t||!available(s,C.treasures[a.id]))return no('灵宝未拥有或当前境界不可用');
      if(t.level>=Math.min(10,2+path(s).realm*2))return no('已达到当前境界灵宝等级上限');
      if(!pay(s,costs(s,a.type,a)))return no('灵宝升级材料不足');
      t.level++;return yes(C.treasures[a.id].name+'提升至'+t.level+'级');
    }
    if(a.type==='recycleTreasure'){
      t=s.ownedTreasures[a.id];if(!t)return no('灵宝不存在');
      var treasure=C.treasures[a.id];
      var used=Object.keys(s.loadouts).some(function(r){return s.loadouts[r].treasures.indexOf(a.id)>=0;});
      used=used||Object.keys(s.presets).some(function(r){return s.presets[r].some(function(p){return p&&(p.loadout||p).treasures.indexOf(a.id)>=0;});});
      if(t.count<=1&&used)return no('配置或预设中的最后一件灵宝不能分解');
      if(treasure.rarity===5&&!a.confirm)return no('红灵宝分解需单独确认');
      t.count--;if(!t.count)delete s.ownedTreasures[a.id];
      K.add(s,'dust',[1,2,4,8,20,60][treasure.rarity]);
      if(treasure.rarity===5)addMaterial(s,'soul',1);
      return yes('已分解一件'+treasure.name);
    }
    if(a.type==='setGachaTarget'){
      if(!K.unlocks(s).gacha)return no('达到第二大境一层后开放定向感应');
      if(a.target!==null&&!targets(s).some(function(x){return x.id===a.target;}))return no('定向目标尚未开放或不是红色物品');
      s.gacha.target=a.target;return yes(a.target?'定向目标已更新，累计保底保留':'已取消定向，累计保底保留');
    }
    if(a.type==='buyJade'){
      var pack=C.shop.packages.find(function(x){return x.id===a.packageId;});
      if(!pack)return no('商城礼包不存在');
      if(s.jade+pack.jade>K.CAP||s.shop.totalJade+pack.jade>K.CAP||s.shop.purchases>=K.CAP)return no('灵玉或购买记录已达存储上限');
      s.jade+=pack.jade;s.shop.totalJade+=pack.jade;s.shop.purchases++;
      var receipt={packageId:pack.id,amount:pack.jade,at:now,sequence:s.shop.purchases};
      s.shop.history.push(receipt);if(s.shop.history.length>C.shop.historyLimit)s.shop.history.shift();
      K.log(s,'模拟购入'+pack.name+'：灵玉+'+pack.jade,now);
      return yes('购入成功，灵玉+'+pack.jade,{jade:pack.jade,receipt:copy(receipt)});
    }
    if(a.type==='buyResource'){
      var product=RESOURCE_MARKET.find(function(x){return x.id===a.item;});
      if(!product)return no('集市商品不存在');
      if(a.currency!=='jade'&&a.currency!=='dust')return no('请选择灵玉或天道尘支付');
      if(!int(a.count,1,99))return no('每次可购买1至99份');
      var purchaseReward={};
      if(product.reward.materials){
        purchaseReward.materials={};
        Object.keys(product.reward.materials).forEach(function(key){purchaseReward.materials[key]=product.reward.materials[key]*a.count;});
        if(Object.keys(purchaseReward.materials).some(function(key){return s.materials[key]+purchaseReward.materials[key]>K.CAP;}))return no('材料已达存储上限，请先使用');
      }
      if(product.reward.stones){
        purchaseReward.stones=product.reward.stones*a.count;
        if(s.stones+purchaseReward.stones>K.CAP)return no('灵石已达存储上限，请先使用');
      }
      cost=costs(s,a.type,a);
      if(!pay(s,cost))return no(a.currency==='jade'?'灵玉不足':'天道尘不足');
      K.grant(s,purchaseReward);
      K.log(s,'集市购入'+product.name+'，共'+a.count+'份',now);
      return yes('已购入'+product.name+'，共'+a.count+'份',{item:product.id,currency:a.currency,count:a.count,cost:copy(cost),reward:copy(purchaseReward)});
    }
    if(a.type==='exchangeJade'){
      if(a.count!==1&&a.count!==10)return no('请选择兑换1张或10张感应券');
      if(s.tickets+a.count>K.CAP)return no('感应券已达存储上限');
      var jadeCost=a.count*C.shop.jadePerDraw;
      if(!pay(s,{jade:jadeCost}))return no('灵玉不足，可前往商城购入');
      s.tickets+=a.count;return yes('兑换感应券×'+a.count,{count:a.count,cost:{jade:jadeCost}});
    }
    if(a.type==='drawWithJade'){
      if(a.count!==1&&a.count!==10)return no('请选择单次或十次感应');
      if(s.tickets+a.count>K.CAP)return no('感应券已达存储上限');
      var paidJade=a.count*C.shop.jadePerDraw;
      if(!pay(s,{jade:paidJade}))return no('灵玉不足，可前往商城购入');
      s.tickets+=a.count;
      var jadeDraw=draw(s,a.count,now);
      if(jadeDraw.ok)jadeDraw.data.jadeSpent=paidJade;
      return jadeDraw;
    }
    if(a.type==='draw')return draw(s,a.count,now);
    if(a.type==='exchangeDust'){
      var ex=EXCHANGES.find(function(x){return x.id===a.item;});if(!ex)return no('兑换项目不存在');
      if(!K.unlocks(s).gacha)return no('天道兑换尚未开放');
      if(a.item==='orangeGear'&&!capacity(s,1))return no('请先整理背包与奖励盒');
      var orangeTreasurePool=Object.keys(C.treasures).filter(function(key){return C.treasures[key].rarity===4&&available(s,C.treasures[key]);});
      if(a.item==='orangeTreasure'&&!orangeTreasurePool.length)return no('当前境界没有可兑换橙色灵宝');
      if(!pay(s,ex.cost))return no('天道尘不足');
      if(ex.reward)K.grant(s,ex.reward);
      else if(a.item==='universal')K.add(s.fragments,'universal',5);
      else if(a.item==='orangeGear'){g=createGear(s,{rarity:4,tier:path(s).realm});addGear(s,g);}
      else if(a.item==='orangeTreasure'){
        id=pick(s,orangeTreasurePool);
        if(s.ownedTreasures[id])s.ownedTreasures[id].count++;else s.ownedTreasures[id]={level:1,count:1,awakening:0};
      }
      return yes('已兑换'+ex.name,g?{gear:copy(g)}:id?{id:id}:undefined);
    }
    if(a.type==='claimOverflow'){
      if(!s.rewardOverflow||!s.rewardOverflow.length)return no('奖励盒为空');
      var claimed=0;
      while(s.bag.length<MAX_BAG&&s.rewardOverflow.length){s.bag.push(s.rewardOverflow.shift());claimed++;}
      return claimed?yes('已领取'+claimed+'件待领取装备',{count:claimed}):no('背包已满，请先分解未保护装备');
    }
    return null;
  }
  return {
    handle:handle,draw:draw,createGear:createGear,addGear:addGear,costs:costs,
    alchemyCapacity:alchemyCapacity,alchemyView:alchemyView,alchemyBonus:alchemyBonus,
    targets:targets,gachaPool:pools,gachaTable:TABLE,affixes:AFFIXES,exchangeList:EXCHANGES,
    checkLoadout:checkLoadout,resourceMarket:RESOURCE_MARKET,limits:{bag:MAX_BAG,overflow:MAX_OVERFLOW,history:200},
    redChance:function(pity){var n=pity+1;return n>=80?1:n>50?0.01+(n-50)*0.005:0.01;}
  };
});
