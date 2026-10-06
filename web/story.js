(function(root,factory){
  const node=typeof module==='object'&&module.exports;
  const api=factory(node?require('./data.js'):root.WendaoData,node?require('./core.js'):root.WendaoCore);
  if(node)module.exports=api;else root.WendaoStory=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(C,K){
'use strict';
const own=(o,k)=>!!o&&Object.prototype.hasOwnProperty.call(o,k);
const copy=x=>JSON.parse(JSON.stringify(x));
const yes=(message,data)=>({ok:true,message,data:data||{}});
const no=message=>({ok:false,message});
const maxTier=s=>Math.floor(K.maxRank(s)/10);
function countRecord(records,id){if(!records)return 0;if(id&&own(records,id))return records[id];return Object.entries(records).filter(([k])=>!id||k===id||k.startsWith(id+':')).reduce((n,[,v])=>n+(Number(v)||0),0);}
function value(s,r){
  if(r.key==='rank')return K.maxRank(s);
  if(r.key==='maxRealm')return maxTier(s);
  if(r.key==='sect')return s.sect.joined?1:0;
  if(r.key==='tower')return s.progress.tower;
  if(r.key==='bossWins')return r.id?countRecord(s.progress.bossWins,r.id):s.stats.bosses;
  if(r.key==='dungeonWins')return countRecord(s.progress.dungeonWins,r.id);
  if(r.key==='sectTrialCount')return new Set(s.progress.sectTrials).size;
  if(r.key==='endingTrial')return Object.values(s.progress.endingTrials).some(Boolean)?1:0;
  if(r.key==='affinity')return s.companions[r.id]?.affinity||0;
  if(r.key==='bonds')return Object.values(s.companions).filter(x=>x.bond).length;
  if(r.key==='knownTechniques')return Object.keys(s.techniques).length;
  if(r.key==='chapter')return s.story.chapter;
  if(r.key==='sidequest')return s.story.sideCompleted.includes(r.id)?1:0;
  return Number(s.stats[r.key]||0);
}
function requirementView(s,requirements){return (requirements||[]).map(r=>({key:r.key,label:r.label||r.key,current:value(s,r),required:r.count,done:value(s,r)>=r.count,id:r.id||null}));}
function satisfied(s,requirements){return requirementView(s,requirements).every(x=>x.done);}
function grantReward(s,reward,route){
  const r=reward||{};K.grant(s,r,route||s.route);
  for(const [id,n] of Object.entries(r.fragments||{}))if(id==='universal'||C.techniques[id])K.add(s.fragments,id,n);
  for(const id of r.techniques||[]){if(!C.techniques[id])throw Error('奖励功法不存在');if(s.techniques[id])K.add(s.fragments,'universal',C.duplicateTechniqueFragments||5);else s.techniques[id]={level:1,branch:0,spent:0,resetUsed:false};}
  for(const id of r.treasures||[]){if(!C.treasures[id])throw Error('奖励灵宝不存在');if(s.ownedTreasures[id])K.add(s.ownedTreasures[id],'count',1);else s.ownedTreasures[id]={level:1,count:1,awakening:0};}
  for(const id of r.blueprints||[]){if(!C.schools[id]&&!C.gearTargets?.[id])throw Error('奖励蓝图不存在');if(!s.blueprints.includes(id))s.blueprints.push(id);}
}
const commissionDefs=Object.assign({},C.commissions,{
  explore:{id:'explore',name:'洞天札记',description:'完成当前阶的完整洞天探索，整理路线与携出记录。',required:1,rewards:{stones:900,contribution:25,materials:{insight:8,essence:3},tickets:2,crystal:4}},
  study:{id:'study',name:'传道解惑',description:'完成当前阶三次功法研习，贡献新见解。',required:3,rewards:{stones:500,contribution:20,materials:{insight:6},tickets:1,crystal:2}},
  tower:{id:'tower',name:'问道留名',description:'完成当前阶的三个新塔层；首通记录不会重复计入。',required:3,rewards:{stones:900,contribution:30,materials:{ore:6},tickets:2,crystal:4}}
});
function commissionMetric(s,id,tier){
  if(id==='hunt')return s.stats['winsTier'+tier]||0;
  if(id==='boss')return s.stats['bossesTier'+tier]||0;
  if(id==='alchemy')return s.stats['craftedTier'+tier]||0;
  if(id==='explore')return s.stats['caveTier'+tier]||0;
  if(id==='study')return s.stats['studyTier'+tier]||0;
  if(id==='tower')return Math.max(0,Math.min(10,s.progress.tower-tier*10));
  return 0;
}
function commissionReward(s,def,tier){
  const raw=def.rewards||{},r=copy(raw);delete r.crystal;r.stones=Math.round((r.stones||0)*(1+tier*.4));
  r.materials=r.materials||{};if(raw.crystal)r.materials['crystal'+tier]=raw.crystal;
  return r;
}
function commissionView(s){
  const tier=maxTier(s);return Object.values(commissionDefs).map(def=>{
    const used=s.sect.taskCounts[def.id+':'+tier]||0,current=Math.max(0,commissionMetric(s,def.id,tier)-used);
    return {...def,current,required:def.required,ready:s.sect.joined&&current>=def.required,tier,reward:commissionReward(s,def,tier)};
  });
}
function view(s){
  const ch=C.chapters[s.story.chapter]||null,chapterProgress=ch?requirementView(s,ch.requirements):[];
  const sidequestProgress=C.sidequests.map(q=>{
    const completed=s.story.sideCompleted.includes(q.id),progress=requirementView(s,q.requirements),previousReady=!q.previous||s.story.sideCompleted.includes(q.previous);
    return {...q,completed,progress,ready:!completed&&previousReady&&progress.every(x=>x.done),progressText:(q.previous&&!previousReady?'先完成前置任务；':'')+progress.map(x=>x.label+' '+x.current+'/'+x.required).join(' · ')};
  });
  return {currentChapter:ch,chapterProgress,chapterReady:!!ch&&chapterProgress.every(x=>x.done),sidequestProgress,commissions:commissionView(s),jointCost:C.jointCost,bondThreshold:C.bondThreshold,jointThreshold:C.jointThreshold,jointCooldownMs:C.jointCooldownMs};
}
function handle(s,a,now){
  if(!a||typeof a.type!=='string')return null;
  if(a.type==='joinSect'){
    if(!C.schools[a.school])return no('请选择有效宗门');
    if(K.maxRank(s)<4)return no('达到首境五层后可加入宗门');
    if(s.sect.joined&&s.sect.school===a.school)return no('你已加入此宗门');
    s.sect.joined=true;s.sect.school=a.school;
    K.log(s,'加入'+C.schools[a.school].name+'，六门传承仍可自由研习。',now);
    return yes('已加入'+C.schools[a.school].name);
  }
  if(a.type==='claimCommission'){
    const q=commissionView(s).find(x=>x.id===a.id);
    if(!q||!q.ready)return no('委托进度尚未完成');
    const key=q.id+':'+q.tier;s.sect.taskCounts[key]=(s.sect.taskCounts[key]||0)+q.required;
    grantReward(s,q.reward);K.log(s,'完成宗门委托：'+q.name,now);return yes('委托完成，奖励已入账',{reward:q.reward});
  }
  if(a.type==='upgradeSect'){
    if(!s.sect.joined)return no('先加入宗门');
    if(s.sect.rank>=6)return no('宗门位阶已满');
    const cost={stones:300*Math.pow(s.sect.rank+1,2),contribution:60*(s.sect.rank+1)};
    if(!K.spend(s,cost))return no('宗门贡献或灵石不足');
    s.sect.rank++;return yes('宗门位阶提升至'+s.sect.rank);
  }
  if(a.type==='claimChapter'){
    const ch=C.chapters[s.story.chapter];if(!ch)return no('六卷主线已经完成');
    if(!['protect','seek'].includes(a.choice))return no('请选择剧情方向');
    if(!satisfied(s,ch.requirements))return no('章节目标尚未完成');
    grantReward(s,ch.reward);
    if(!s.story.completed.includes(ch.id))s.story.completed.push(ch.id);
    s.story.chapter++;if(a.choice==='protect')s.story.mercy++;else s.story.truth++;
    K.log(s,'完成《'+ch.name+'》：'+ch.after,now);
    return yes(ch.after,{reward:ch.reward,chapter:ch.id});
  }
  if(a.type==='ending'){
    if(s.story.chapter<6)return no('完成六卷主线后再选择归途');
    if(s.story.ending)return no('你已选择归途，可继续自由游历');
    if(!C.endings[a.choice])return no('请选择有效结局');
    s.story.ending=copy(C.endings[a.choice]);K.log(s,s.story.ending.title+'：'+s.story.ending.text,now);
    return yes(s.story.ending.title,{ending:s.story.ending});
  }
  if(a.type==='claimSidequest'){
    const q=C.sidequests.find(x=>x.id===a.id);
    if(!q)return no('支线不存在');
    if(s.story.sideCompleted.includes(q.id))return no('此支线奖励已领取');
    if(q.previous&&!s.story.sideCompleted.includes(q.previous))return no('先完成上一段个人任务');
    if(!satisfied(s,q.requirements))return no('支线条件尚未完成');
    grantReward(s,q.reward);s.story.sideCompleted.push(q.id);
    if(q.companion)s.companions[q.companion].questStep=Math.max(s.companions[q.companion].questStep,q.step+1);
    K.log(s,q.name+'：'+q.after,now);return yes(q.after,{reward:q.reward,quest:q.id});
  }
  if(['talk','gift','bond','jointInvite'].includes(a.type)){
    const c=C.companions[a.companion],r=s.companions[a.companion];if(!c||!r)return no('伙伴不存在');
    if(a.type==='talk'){
      if(now-r.lastTalkAt<60000)return no('稍后再聊，两次问候至少相隔一分钟');
      r.lastTalkAt=now;r.affinity=Math.min(100,r.affinity+8);
      const dialogue=c.dialogues[Math.floor(K.rng(s,'world')*c.dialogues.length)];
      K.log(s,dialogue,now);return yes(dialogue);
    }
    if(a.type==='gift'){
      const item=a.item;if(!['herb','ore','lotus','qi0','qi1','qi2'].includes(item))return no('请选择可赠礼物');
      const cost=item.startsWith('qi')?{pills:{[item]:1}}:{materials:{[item]:1}};
      if(!K.spend(s,cost))return no('礼物库存不足');
      const gain=item===c.favorite?10:5;r.affinity=Math.min(100,r.affinity+gain);K.add(s.stats,'gifts',1);
      return yes(c.name+'收下礼物，好感+'+gain);
    }
    if(a.type==='bond'){
      if(r.bond)return no('你们已结下同道之契');
      if(r.affinity<C.bondThreshold)return no('好感达到'+C.bondThreshold+'后可结契');
      r.bond=true;K.log(s,c.bondText,now);return yes(c.bondText);
    }
    if(a.type==='jointInvite'){
      if(s.joint)return no('请先完成或取消当前共修');
      if(s.battle||s.exploration)return no('结束历练后再邀约共修');
      if(!r.bond||r.affinity<C.jointThreshold)return no('结契且好感达到'+C.jointThreshold+'后可共修');
      if(now<r.cooldownUntil)return no('上次共修尚在调息');
      const selected=Array.isArray(a.techniques)?a.techniques.slice():[];
      if(!selected.length){const ids=s.loadouts[s.route].skills;for(let i=0;i<3;i++)selected.push(ids[i%ids.length]||s.loadouts[s.route].heart);}
      if(selected.length!==3||selected.some(id=>!C.techniques[id]||!s.techniques[id]))return no('请选择三门已学功法，可重复');
      if(!K.spend(s,C.jointCost))return no('共修材料不足');
      const rhythms=['sun','moon','star'];
      s.joint={companion:a.companion,round:0,score:0,techniques:selected,rhythm:Array.from({length:3},()=>rhythms[Math.floor(K.rng(s,'world')*3)]),route:s.route,cost:copy(C.jointCost)};
      return yes(c.name+'同意与你灵息共修',{joint:copy(s.joint)});
    }
  }
  if(a.type==='jointStep'){
    if(!s.joint)return no('当前没有共修');
    if(!['sun','moon','star'].includes(a.choice))return no('请选择日、月或星节律');
    const j=s.joint,correct=a.choice===j.rhythm[j.round];j.score+=correct?3:1;j.round++;
    if(j.round<3)return yes(correct?'灵息相合，进入下一回合':'调整呼吸，继续下一回合',{joint:copy(j)});
    const r=s.companions[j.companion],factor=C.realmXpFactors[s.paths[j.route||s.route].realm],xp=(80+j.score*20)*factor;
    K.addXp(s,xp,j.route||s.route);r.affinity=Math.min(100,r.affinity+4);r.cooldownUntil=now+C.jointCooldownMs;
    K.add(s.stats,'joints',1);const score=j.score;s.joint=null;
    K.log(s,'与'+C.companions[j.companion].name+'完成灵息共修，修为+'+xp+'。',now);
    return yes('共修完成，修为+'+xp,{xp,score});
  }
  if(a.type==='jointCancel'){
    if(!s.joint)return no('当前没有共修');
    grantReward(s,s.joint.cost||C.jointCost,s.joint.route||s.route);s.joint=null;
    return yes('共修已取消，邀约费用退回');
  }
  return null;
}
return {handle,view,grantReward,requirementView,commissionView,value};
});
