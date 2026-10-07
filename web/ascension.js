(function(root,factory){
  const node=typeof module==='object'&&module.exports;
  const api=factory(node?require('./data.js'):root.WendaoData,node?require('./ascension-scenes.js'):root.WendaoAscensionScenes);
  if(node)module.exports=api;else root.WendaoAscension=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(C,N){
'use strict';
const CAP=C.limits&&C.limits.number||1e12,MAX_TIME=8640000000000000;
const routes=['body','magic'],stages=['invitation','vow','condense','trial','return','ready','ascended'],choices=['protect','seek','promise'];
const names=['登仙','真仙','金仙'],own=(o,k)=>!!o&&Object.prototype.hasOwnProperty.call(o,k),copy=x=>JSON.parse(JSON.stringify(x));
const yes=(message,data)=>({ok:true,message,data:data||{}}),no=message=>({ok:false,message,error:message});
function int(n,min,max,label){if(!Number.isSafeInteger(n)||n<min||n>max)throw Error('飞升存档无效：'+label);return n;}
function object(v,label){if(!v||typeof v!=='object'||Array.isArray(v))throw Error('飞升存档结构无效：'+label);return v;}
function records(s,id){return Number(s.progress&&s.progress.dungeonWins&&s.progress.dungeonWins[id]||0);}
function finalOath(s,route){return !!(s.progress.endingTrials[route]&&(s.ritualLegacyWins&&s.ritualLegacyWins[route+':5']||s.ritual&&s.ritual.route===route&&s.ritual.realm===5&&s.ritual.phase==='complete'||Array.isArray(s.ritualHistory)&&s.ritualHistory.some(h=>h.route===route&&h.realm===5)));}
function fullMortal(s,route){const p=s.paths[route];return p.realm===5&&p.layer===10&&p.xp>=Math.round(C.layerXp[9]*C.realmXpFactors[5]);}
function eligible(s,route){return routes.includes(route)&&fullMortal(s,route)&&finalOath(s,route)&&s.story.chapter===6;}
function normalize(s){if(s.ascension===undefined)s.ascension=null;return s;}
function xpNeeded(a){return Math.round((360+a.layer*120)*[1,3,8][a.realm]);}
function add(o,key,n){const before=o[key]||0;o[key]=Math.min(CAP,before+n);return o[key]-before;}
function addXp(a,n){const before=a.xp+a.reserve,room=Math.max(0,xpNeeded(a)-a.xp),taken=Math.min(room,n);a.xp+=taken;a.reserve=Math.min(CAP,a.reserve+n-taken);return a.xp+a.reserve-before;}
function costs(s,type,count=1){
 const a=s.ascension,realm=a&&a.realm||0;
 if(type==='preparation')return {materials:{essence:24,insight:40,lotus:12,ore:30}};
 if(type==='meditation')return {stones:3000*(realm+1)*count,materials:{essence:2*count,insight:4*count}};
 if(type==='breakthrough')return {yuan:100*(realm+1),materials:{essence:12*(realm+1),ore:20*(realm+1)}};
 return {};
}
function canPay(s,cost){return Object.entries(cost).every(([key,n])=>key==='materials'?Object.entries(n).every(([id,q])=>(s.materials[id]||0)>=q):key==='yuan'?!!s.ascension&&s.ascension.yuan>=n:s[key]>=n);}
function pay(s,cost){if(!canPay(s,cost))return false;for(const [key,n] of Object.entries(cost)){if(key==='materials')for(const [id,q] of Object.entries(n))s.materials[id]-=q;else if(key==='yuan')s.ascension.yuan-=n;else s[key]-=n;}return true;}
function currentLines(a){
 if(a.stage==='invitation')return N.invitation;
 if(a.stage==='vow'&&a.choice)return N.vows[a.choice].reply;
 if(a.stage==='condense')return N.condense;
 if(a.stage==='return')return N.return[a.choice];
 if(a.stage==='trial')return N.trial||[];
 return [];
}
function validate(s){
 if(s.ascension===null)return s;
 const a=object(s.ascension,'仙途'),fields=['version','stage','line','choice','route','baseline','startedAt','ascendedAt','realm','layer','xp','reserve','yuan','meditations','huntWins','breakthroughs','trialBaseline','perfected'];
 if(Object.keys(a).length!==fields.length||Object.keys(a).some(key=>!fields.includes(key)))throw Error('飞升存档字段无效');
 if(a.version!==1||!stages.includes(a.stage)||!routes.includes(a.route))throw Error('飞升阶段或道途无效');
 if(!eligible(s,a.route))throw Error('飞升需要完整人间道途、终境道誓与六卷主线');
 int(a.startedAt,0,MAX_TIME,'入天门时间');int(a.baseline,0,records(s,'heaven_gate'),'天门实战起点');
 const beforeChoice=a.stage==='invitation'||a.stage==='vow'&&a.choice===null;
 if(beforeChoice?a.choice!==null:!choices.includes(a.choice))throw Error('飞升道誓选择无效');
 const lines=currentLines(a);int(a.line,0,lines.length?lines.length-1:0,'飞升阅读位置');
 if(['return','ready','ascended'].includes(a.stage)&&records(s,'heaven_gate')<=a.baseline)throw Error('飞升尚未经历真实天门考验');
 int(a.realm,0,2,'仙阶');int(a.layer,1,10,'仙阶层次');int(a.xp,0,xpNeeded(a),'仙修');int(a.reserve,0,CAP,'仙修储备');
 for(const key of ['yuan','meditations','huntWins'])int(a[key],0,CAP,key);
 int(a.breakthroughs,0,3,'仙阶突破');int(a.trialBaseline,0,records(s,'immortal_'+a.realm),'仙阶实战起点');
 if(typeof a.perfected!=='boolean')throw Error('金仙圆满记录无效');
 if(a.stage!=='ascended'){
  if(a.ascendedAt!==null||a.realm!==0||a.layer!==1||a.xp||a.reserve||a.yuan||a.meditations||a.huntWins||a.breakthroughs||a.trialBaseline||a.perfected)throw Error('未飞升不能获得仙界境界与收益');
 }else{
  int(a.ascendedAt,a.startedAt,MAX_TIME,'飞升时间');
  if(a.breakthroughs!==a.realm+(a.perfected?1:0))throw Error('仙阶突破次数与境界不符');
  for(let realm=0;realm<a.realm;realm++)if(!records(s,'immortal_'+realm))throw Error('仙阶突破缺少实战考验');
  const hunts=[0,1,2].reduce((n,realm)=>n+records(s,'immortal_hunt_'+realm),0);if(a.huntWins>hunts)throw Error('仙界猎场记录超过真实胜利');
  if(a.perfected&&(a.realm!==2||a.layer!==10||a.xp<xpNeeded(a)||records(s,'immortal_2')<=a.trialBaseline))throw Error('金仙圆满缺少真实最后考验');
 }
 return s;
}
function attributeBonus(s){
 const a=s.ascension;if(!a||a.stage!=='ascended')return {attack:0,defense:0,maxHp:0};
 return {attack:.25+a.realm*.4+(a.layer-1)*.025+(a.perfected?.2:0),defense:.18+a.realm*.3+(a.layer-1)*.02+(a.perfected?.15:0),maxHp:.2+a.realm*.35+(a.layer-1)*.02+(a.perfected?.2:0)};
}
function dungeonRequirement(s,d,practice=false){
 if(!d||d.type!=='ascension')return null;
 const a=s.ascension;if(d.ascensionKind==='gate'){
  if(!a||a.stage!=='trial')return '先经历天门来信、立下道誓并亲手凝道，再踏入天门';
  if(!eligible(s,a.route))return '终境圆满、最后道誓与六卷主线缺一不可';
  if(a.line<(N.trial||[]).length-1)return '先听完天门考验的引路话，再亲自入劫';
  if(s.route!==a.route)return '先转回凝道时的路线，再进入天门考验';return null;
 }
 if(!a||a.stage!=='ascended')return '飞升落定之后，才能进入仙界天路';
 if(d.ascensionTier>a.realm)return '先突破当前仙阶，才能进入下一重仙界';
 if(d.ascensionKind==='trial'){
  if(d.ascensionTier!==a.realm)return '已走过的仙阶考验不能替代当前仙阶';
  if(a.perfected)return '金仙圆满已自证，可以继续猎场与修行';
  if(a.layer!==10||a.xp<xpNeeded(a))return '本仙阶十层仙修圆满之后，再亲自面对升阶考验';
 }
 const cost=battleCost(s,d);return practice||canPay(s,cost)?null:'仙界出征资源不足，可先修行或从人间秘境与集市备料';
}
function battleCost(s,d){if(d.ascensionKind==='hunt')return {stones:1000*(d.ascensionTier+1)};if(d.ascensionKind==='trial')return {yuan:20*(d.ascensionTier+1)};return {};}
function prepareBattle(s,d){const reason=dungeonRequirement(s,d);if(reason)return no(reason);const cost=battleCost(s,d);if(!pay(s,cost))return no('出征资源不足');return yes('已准备仙界出征',{cost:copy(cost)});}
function rewardBattle(s,d){
 const a=s.ascension;if(!a||a.stage!=='ascended'||d.type!=='ascension'||d.ascensionKind==='gate')return null;
 const realm=d.ascensionTier,n=d.ascensionKind==='hunt'?180*(realm+1):400*(realm+1),yuan=add(a,'yuan',d.ascensionKind==='hunt'?12*(realm+1):35*(realm+1)),xp=addXp(a,n);
 if(d.ascensionKind==='hunt')add(a,'huntWins',1);
 return {xp,yuan,realm,realmName:names[realm]};
}
function view(s){
 const a=s.ascension,stage=a?a.stage:'preparation',busy=!!(s.battle||s.exploration)||!!(s.ritual&&s.ritual.phase!=='complete'),suggestedRoute=eligible(s,s.route)?s.route:routes.find(route=>eligible(s,route))||s.route,route=a&&a.route||suggestedRoute;
 const requirements=[{label:'人间终境十层修为圆满',current:fullMortal(s,route)?1:0,required:1,done:fullMortal(s,route)},{label:'亲自落定终境道誓',current:finalOath(s,route)?1:0,required:1,done:finalOath(s,route)},{label:'六卷山海主线',current:s.story.chapter,required:6,done:s.story.chapter===6}];
 const realm=a&&a.realm||0,scene=N.realms[realm],lines=a?currentLines(a):[],freshGate=!!a&&records(s,'heaven_gate')>a.baseline;
 const preparationCost=costs(s,'preparation'),meditationCost=costs(s,'meditation'),breakthroughCost=costs(s,'breakthrough'),realmFull=!!a&&a.layer===10&&a.xp>=xpNeeded(a),trialFresh=!!a&&records(s,'immortal_'+realm)>a.trialBaseline;
 const ascended=stage==='ascended',challengeIds=ascended?['immortal_hunt_'+realm,'immortal_'+realm]:stage==='trial'?['heaven_gate']:[];
 const challenges=challengeIds.filter(id=>C.dungeons[id]).map(id=>{const d=C.dungeons[id],reason=dungeonRequirement(s,d);return {id,name:d.name,kind:d.ascensionKind,allowed:!reason&&!busy,reason:reason||busy&&'先完成当前历练'||null,cost:battleCost(s,d),description:d.description};});
 const choiceViews=choices.map(id=>({id,label:N.vows[id].label,text:N.vows[id].text}));
 const canAdvance=!!a&&!busy&&(stage==='invitation'||stage==='vow'&&!!a.choice||stage==='condense'&&(a.line<lines.length-1||canPay(s,preparationCost))||stage==='trial'&&(a.line<lines.length-1||freshGate)||stage==='return');
 const unlockedSections=['arrival',...(realmFull?['trial']:[]),...(trialFresh?['after']:[])],realmNarrative={...scene,unlockedSections,currentSummary:trialFresh?scene.after[0]:realmFull?scene.trial[0]:scene.arrival[0]};
 const line=lines[a&&a.line||0]||(ascended?realmNarrative.currentSummary:null);
 return {stage,line,entry:a?copy(a):null,choices:choiceViews,requirements,ready:stage==='ready',canBegin:!a&&!busy&&requirements.every(x=>x.done),canAdvance,canComplete:stage==='ready'&&!busy,ascended,realm,realmName:names[realm],realmLabel:ascended?names[realm]+' '+(a.perfected?'圆满':a.layer+'层'):'人间圆满 · 天门未启',layer:a&&a.layer||1,xp:a&&a.xp||0,xpNeeded:a?xpNeeded(a):480,reserve:a&&a.reserve||0,yuan:a&&a.yuan||0,perfected:!!(a&&a.perfected),canMeditate:ascended&&!busy&&!a.perfected&&canPay(s,meditationCost)&&a.reserve<CAP,canLevelUp:ascended&&!busy&&a.layer<10&&a.xp>=xpNeeded(a),canBreakthrough:ascended&&!busy&&!a.perfected&&realmFull&&trialFresh&&canPay(s,breakthroughCost),realmFull,trialFresh,preparationCost,meditationCost,breakthroughCost,challenges,realms:N.realms,realmNarrative,realmTrialWon:trialFresh,trialLines:N.trial||[],bonus:attributeBonus(s),suggestedRoute:route,gateWins:a?Math.max(0,records(s,'heaven_gate')-a.baseline):0,advanceLabel:stage==='condense'&&a.line===lines.length-1?'凝道 · 投入阵材':stage==='trial'&&a.line===lines.length-1?'带着天门回响归来':'继续听下去',mission:stage==='trial'?{goal:{id:'heaven_gate',label:'亲自通过天门考验'},current:a?Math.max(0,records(s,'heaven_gate')-a.baseline):0,required:1,done:freshGate}:null,meditations:a&&a.meditations||0,huntWins:a&&a.huntWins||0};
}
function handle(s,a,now){
 const actions=['beginAscension','advanceAscension','chooseAscension','completeAscension','celestialMeditate','advanceCelestial','celestialHunt','celestialBreakthrough'];if(!a||!actions.includes(a.type))return null;
 if(!Number.isSafeInteger(now)||now<0||now>MAX_TIME)return no('飞升时间无效');
 if(s.battle||s.exploration||s.ritual&&s.ritual.phase!=='complete')return no('先完成当前历练或闭关，再继续天门道途');
 if(a.type==='beginAscension'){
  if(s.ascension)return no('天門来信已经留下，继续未完的约定即可');const v=view(s);if(!v.canBegin)return no('任一路人间终境十层修为圆满、终境道誓与六卷主线完成后，才可回应天门');
  s.route=v.suggestedRoute;s.ascension={version:1,stage:'invitation',line:0,choice:null,route:s.route,baseline:records(s,'heaven_gate'),startedAt:now,ascendedAt:null,realm:0,layer:1,xp:0,reserve:0,yuan:0,meditations:0,huntWins:0,breakthroughs:0,trialBaseline:0,perfected:false};
  return yes('天门来信：先听完山海的告别，再决定为何走入天外',{ascension:view(s)});
 }
 const p=s.ascension;if(!p)return no('先回应天门来信');
 if(a.type==='chooseAscension'){
  if(p.stage!=='vow'||p.choice!==null||!choices.includes(a.choice))return no('先读完天门来信，再亲自立下一份道誓');p.choice=a.choice;p.line=0;return yes(N.vows[a.choice].label,{ascension:view(s)});
 }
 if(a.type==='advanceAscension'){
  const lines=currentLines(p);
  if(p.stage==='invitation'||p.stage==='vow'&&p.choice||p.stage==='condense'||p.stage==='return'){
   if(p.line+1<lines.length){p.line++;return yes('天门道途继续',{ascension:view(s)});}
   if(p.stage==='condense'){const cost=costs(s,'preparation');if(!pay(s,cost))return no('凝道阵材不足，准备页会标明各材料去处');p.baseline=records(s,'heaven_gate');p.stage='trial';p.line=0;return yes('你亲手凝定道身，阵材已投入，可以面对真正的天门考验',{cost,ascension:view(s)});}
   p.stage=p.stage==='invitation'?'vow':p.stage==='vow'?'condense':'ready';p.line=0;return yes(p.stage==='ready'?'告别与道誓已经落定，亲自踏入仙界':'天门道途继续',{ascension:view(s)});
  }
  if(p.stage==='trial'){if(p.line+1<lines.length){p.line++;return yes('先听清这场考验的来处，再亲自踏上天门',{ascension:view(s)});}if(records(s,'heaven_gate')<=p.baseline)return no('先亲自通过这一程新的天门考验，再听天外的回应');p.stage='return';p.line=0;return yes('天门真正向你打开。归来之人仍有一句话要说',{ascension:view(s)});}
  return no('先立下道誓，或完成当前真实的修行目标');
 }
 if(a.type==='completeAscension'){
  if(p.stage!=='ready'||!eligible(s,p.route)||records(s,'heaven_gate')<=p.baseline)return no('凝道、真实天门胜利与告别都完成后，再亲自落定飞升');
  p.stage='ascended';p.ascendedAt=now;p.yuan=100;p.trialBaseline=records(s,'immortal_0');
  return yes('飞升落定，登仙一层。新的仙修、仙元与仙界天路已经开启',{ascension:view(s),reward:{yuan:100},route:p.route});
 }
 if(p.stage!=='ascended')return no('飞升落定后，再开始仙界修行');
 if(a.type==='celestialMeditate'){
  const n=a.count===undefined?1:a.count;if(!Number.isSafeInteger(n)||n<1||n>10)return no('每次仙界静修为一至十轮');if(p.perfected)return no('金仙圆满已落定，可继续仙界猎场');
  const wantedXp=(220+p.realm*160)*n,wantedYuan=(8+p.realm*4)*n,totalRoom=Math.max(0,xpNeeded(p)-p.xp)+CAP-p.reserve;if(totalRoom<wantedXp||p.yuan+ wantedYuan>CAP||p.meditations+n>CAP)return no('仙修或仙元储存已满，先晋层或升阶');
  const cost=costs(s,'meditation',n);if(!pay(s,cost))return no('仙界静修材料不足，可从人间秘境或集市准备');const xp=addXp(p,wantedXp),yuan=add(p,'yuan',wantedYuan);p.meditations+=n;
  return yes('仙界静修完成，仙修+'+xp+'、仙元+'+yuan,{count:n,cost,reward:{xp,yuan},ascension:view(s)});
 }
 if(a.type==='advanceCelestial'){
  if(p.layer===10)return no('十层之后要完成当前仙阶实战与升阶，而非继续小层');if(p.xp<xpNeeded(p))return no('当前仙修填满后，再稳固下一层');p.layer++;p.xp=0;const take=Math.min(xpNeeded(p),p.reserve);p.xp=take;p.reserve-=take;
  return yes(names[p.realm]+' '+p.layer+'层，仙界修行带来的力量已提升',{ascension:view(s)});
 }
 if(a.type==='celestialHunt'){
  const id='immortal_hunt_'+p.realm,d=C.dungeons[id];if(!d)return no('仙界猎场尚未开放');const reason=dungeonRequirement(s,d);if(reason)return no(reason);return yes('前往'+d.name,{battleRequest:{id,difficulty:0},ascension:view(s)});
 }
 if(a.type==='celestialBreakthrough'){
  if(p.perfected)return no('金仙圆满已经自证');if(p.layer!==10||p.xp<xpNeeded(p))return no('当前仙阶十层仙修填满后，再面对升阶');if(records(s,'immortal_'+p.realm)<=p.trialBaseline)return no('先完成这一仙阶新的真实升阶考验');const cost=costs(s,'breakthrough');if(!pay(s,cost))return no('仙元与升阶材料不足，仙界猎场和静修都能继续积累');
  p.breakthroughs++;if(p.realm===2)p.perfected=true;else{p.realm++;p.layer=1;p.xp=0;p.trialBaseline=records(s,'immortal_'+p.realm);const take=Math.min(xpNeeded(p),p.reserve);p.xp=take;p.reserve-=take;}
  return yes(p.perfected?'金仙圆满，大道显化。天路仍可自由探索':'仙阶突破，进入'+names[p.realm]+'一层',{cost,ascension:view(s)});
 }
 return null;
}
return {normalize,validate,handle,view,xpNeeded,costs,attributeBonus,dungeonRequirement,battleAccess:dungeonRequirement,battleCost,prepareBattle,rewardBattle,finalOath,eligible};
});
