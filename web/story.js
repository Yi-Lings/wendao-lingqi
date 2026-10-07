(function(root,factory){
  const node=typeof module==='object'&&module.exports;
  const api=factory(node?require('./data.js'):root.WendaoData,node?require('./core.js'):root.WendaoCore,node?require('./story-scenes.js'):root.WendaoStoryScenes);
  if(node)module.exports=api;else root.WendaoStory=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(C,K,N){
'use strict';
const own=(o,k)=>!!o&&Object.prototype.hasOwnProperty.call(o,k);
const copy=x=>JSON.parse(JSON.stringify(x));
const yes=(message,data)=>({ok:true,message,data:data||{}});
const no=message=>({ok:false,message});
const maxTier=s=>Math.floor(K.maxRank(s)/10);
function countRecord(records,id){if(!records)return 0;if(id&&own(records,id))return records[id];return Math.min(K.CAP,Object.entries(records).filter(([k])=>!id||k===id||k.startsWith(id+':')).reduce((n,[,v])=>n+(Number(v)||0),0));}
function completedEndingTrial(s,route){
  return !!(s.progress.endingTrials[route]&&(s.ritualLegacyWins&&s.ritualLegacyWins[route+':5']||s.ritual&&s.ritual.route===route&&s.ritual.realm===5&&s.ritual.phase==='complete'||Array.isArray(s.ritualHistory)&&s.ritualHistory.some(h=>h.route===route&&h.realm===5)));
}
function value(s,r){
  if(r.key==='rank')return K.maxRank(s);
  if(r.key==='maxRealm')return maxTier(s);
  if(r.key==='sect')return s.sect.joined?1:0;
  if(r.key==='tower')return s.progress.tower;
  if(r.key==='bossWins')return r.id?countRecord(s.progress.bossWins,r.id):s.stats.bosses;
  if(r.key==='dungeonWins')return countRecord(s.progress.dungeonWins,r.id);
  if(r.key==='sectTrialCount')return new Set(s.progress.sectTrials).size;
  if(r.key==='endingTrial')return ['body','magic'].some(route=>completedEndingTrial(s,route))?1:0;
  if(r.key==='affinity')return s.companions[r.id]?.affinity||0;
  if(r.key==='bonds')return Object.values(s.companions).filter(x=>x.bond).length;
  if(r.key==='knownTechniques')return Object.keys(s.techniques).length;
  if(r.key==='study')return Math.min(K.CAP,Object.entries(s.stats).filter(([id])=>/^studyTier[0-5]$/.test(id)).reduce((n,[,count])=>n+count,0));
  if(r.key==='chapter')return s.story.chapter;
  if(r.key==='sidequest')return s.story.sideCompleted.includes(r.id)?1:0;
  return Number(s.stats[r.key]||0);
}
function requirementNav(s,r){
 const key=r.key,p=s.paths[s.route];
 if(key==='rank'||key==='maxRealm'||key==='endingTrial')return {page:'cultivation',...(key==='endingTrial'||p.layer===10?{kind:'ritual'}:{})};
 if(key==='tower')return {page:'adventure',modal:'dungeon',payload:{id:'tower',floor:Math.min(60,(s.progress.tower||0)+1)}};
 if(key==='bossWins'||key==='dungeonWins'||key==='manualWins')return {page:'adventure',modal:'dungeon',payload:{id:r.id|| (key==='bossWins'?'boss_0':'resource_herb')}};
 if(key==='crafted')return {page:'cave',modal:'alchemy'};
 if(key==='forged')return {page:'cave',modal:'forge'};
 if(key==='sect')return {page:'fate',tab:'sect'};
 if(key==='sectTrialCount'){
  const next=Object.values(C.dungeons).find(d=>d.type==='sect'&&d.school===s.sect.school&&!s.progress.sectTrials.includes(d.id));
  return s.sect.joined&&next?{page:'adventure',modal:'dungeon',payload:{id:next.id}}:{page:'fate',tab:'sect'};
 }
 if(key==='affinity'||key==='bonds')return {page:'fate',tab:'companions'};
 if(key==='knownTechniques')return {page:'character',modal:'techniques'};
 if(key==='study')return {page:'heaven'};
 if(key==='chapter'||key==='sidequest')return {page:'fate',kind:'story',payload:{episode:key==='sidequest'?r.id:'chapter_'+Math.min(5,s.story.chapter)}};
 return {page:'cultivation'};
}
function requirementView(s,requirements){return (requirements||[]).map(r=>({key:r.key,label:r.label||r.key,current:value(s,r),required:r.count,done:value(s,r)>=r.count,id:r.id||null,nav:requirementNav(s,r)}));}
function satisfied(s,requirements){return requirementView(s,requirements).every(x=>x.done);}
const stages=['intro','survey','decision','reply','mission','interlude','outro','ready','completed'];
const missionGoals=choice=>choice.goals||[choice.goal];
function episode(id){
  const collection=N&&N.episodes||{},scene=Array.isArray(collection)?collection.find(x=>x.id===id):collection[id];
  const chapter=typeof id==='string'&&/^chapter_[0-5]$/.test(id)?C.chapters[Number(id.slice(8))]:null;
  const quest=chapter?null:C.sidequests.find(x=>x.id===id),catalog=chapter||quest;
  if(!scene||!catalog)return null;
  const choices=Array.isArray(scene.choices)?Object.fromEntries(scene.choices.map(x=>[x.id,x])):scene.choices;
  return {...scene,clues:scene.clues.map(clue=>({...clue,title:clue.title||clue.label})),id,name:scene.name||catalog.name,title:scene.title||catalog.title||catalog.name,kind:chapter?'chapter':'sidequest',catalogId:catalog.id,artKey:scene.artKey||catalog.artKey,choices,requirements:catalog.requirements,reward:catalog.reward,previous:quest&&quest.previous||null};
}
function completed(s,ep){return ep.kind==='chapter'?s.story.chapter>ep.catalogId:s.story.sideCompleted.includes(ep.id);}
function accessible(s,ep){
  if(completed(s,ep))return true;
  if(ep.kind==='chapter')return ep.catalogId===s.story.chapter;
  if(ep.previous&&!s.story.sideCompleted.includes(ep.previous))return false;
  const requiredRank=Math.max(ep.unlockRank||0,...(ep.requirements||[]).filter(r=>r.key==='rank').map(r=>r.count),0);
  return K.maxRank(s)>=requiredRank;
}
function linesFor(ep,entry){
  if(entry.stage==='intro')return ep.intro||[];
  if(entry.stage==='reply')return ep.choices[entry.choice].reply||[];
  if(entry.stage==='outro')return ep.outro[entry.choice]||[];
  if(entry.stage==='interlude')return ep.choices[entry.choice].interludes[entry.missionIndex]||[];
  return [];
}
function journeyView(s,id){
  const ep=episode(id);if(!ep)return null;
  const saved=s.story.journeys&&s.story.journeys[id],isComplete=completed(s,ep),entry=saved?copy(saved):null;
  const stage=isComplete?'completed':entry?entry.stage:'not-started',requirements=requirementView(s,ep.requirements);
  const goals=entry&&entry.choice?missionGoals(ep.choices[entry.choice]):[],goal=goals[entry&&entry.missionIndex||0]||null;
  const current=goal?Math.max(0,value(s,goal)-entry.baseline):0;
  const index=entry&&entry.missionIndex||0,done=!!goal&&current>=goal.count;
  const missingRequirements=requirements.filter(x=>!x.done);
  const mission=goal?{goal,current,required:goal.count,done,index,total:goals.length,nextRequirement:done&&index===goals.length-1?missingRequirements[0]||null:null,canReturn:done&&(index<goals.length-1||requirements.every(x=>x.done))}:null;
  const lines=entry?linesFor(ep,entry):[],selectedClue=stage==='survey'&&entry&&entry.clues.length?ep.clues.find(clue=>clue.id===entry.clues[entry.clues.length-1]):null;
  const line=selectedClue?{speaker:selectedClue.speaker||'narrator',text:selectedClue.text,expression:0}:lines[entry&&entry.line||0]||null;
  return {episode:ep,entry,line,stage,mission,requirements,missingRequirements,accessible:accessible(s,ep),selectedClue,ready:!isComplete&&stage==='ready'&&!!mission&&index===goals.length-1&&mission.done&&requirements.every(x=>x.done),completed:isComplete,cluesRead:entry?entry.clues.length:0};
}
function handleJourney(s,a,now){
  const ep=episode(a.episode);if(!ep)return no('这段故事尚未开放');
  if(completed(s,ep))return no('这段故事已经完成，奖励不会重复领取');
  if(!accessible(s,ep))return no(ep.previous?'先完成前一段故事，再继续同行':'这段故事需要先走到对应的修行阶段');
  if(!s.story.journeys)s.story.journeys={};
  let entry=s.story.journeys[ep.id];
  if(a.type==='beginStory'){
    if(entry)return yes('回到未完的故事',{journey:journeyView(s,ep.id)});
    if(Object.keys(s.story.journeys).length>=24)return no('故事记录已满');
    s.story.journeys[ep.id]={stage:'intro',line:0,clues:[],choice:null,baseline:0,missionIndex:0};
    return yes('进入《'+ep.title+'》',{journey:journeyView(s,ep.id)});
  }
  if(!entry)return no('请先进入这段故事');
  if(a.type==='inspectStory'){
    if(entry.stage!=='survey')return no('先听完同行者的话，再查看现场');
    if(!ep.clues.some(clue=>clue.id===a.clue))return no('这条线索不在现场');
    if(entry.clues.includes(a.clue)){entry.clues=entry.clues.filter(id=>id!==a.clue);entry.clues.push(a.clue);return yes('重新查看已找到的线索',{journey:journeyView(s,ep.id)});}
    entry.clues.push(a.clue);return yes('你记下了新的线索',{journey:journeyView(s,ep.id)});
  }
  if(a.type==='chooseStory'){
    if(entry.stage!=='decision')return no('先了解现场的两条线索，再作决定');
    if(!['protect','seek'].includes(a.choice)||!ep.choices[a.choice])return no('请选择有效的行动方向');
    entry.choice=a.choice;entry.missionIndex=0;entry.baseline=Math.min(K.CAP,value(s,missionGoals(ep.choices[a.choice])[0]));entry.stage='reply';entry.line=0;
    return yes('同行者回应了你的决定',{journey:journeyView(s,ep.id)});
  }
  if(a.type==='advanceStory'){
    if(['intro','reply','interlude','outro'].includes(entry.stage)){
      const lines=linesFor(ep,entry);
      if(entry.line+1<lines.length)entry.line++;
      else{
        if(entry.stage==='interlude'){entry.missionIndex++;entry.baseline=Math.min(K.CAP,value(s,missionGoals(ep.choices[entry.choice])[entry.missionIndex]));entry.stage='mission';}
        else entry.stage=entry.stage==='intro'?'survey':entry.stage==='reply'?'mission':'ready';
        entry.line=0;
      }
      return yes(entry.stage==='mission'?'带着这次约定，去完成真实的行动':'故事继续',{journey:journeyView(s,ep.id)});
    }
    if(entry.stage==='survey'){
      if(!ep.clues.every(clue=>entry.clues.includes(clue.id)))return no('还有现场线索没有查看，先把事情弄清楚');
      entry.stage='decision';entry.line=0;return yes('你已经看清两条可走的路',{journey:journeyView(s,ep.id)});
    }
    if(entry.stage==='mission'){
      const view=journeyView(s,ep.id);
      if(!view.mission.done)return no('先完成约定的实际行动，再回来与同行者会合');
      if(view.mission.index===view.mission.total-1&&!view.requirements.every(x=>x.done))return no('此次行动已经完成，原有修行与历练目标仍需达成');
      entry.stage=view.mission.index<view.mission.total-1?'interlude':'outro';entry.line=0;return yes('同行者等到了你的归来',{journey:journeyView(s,ep.id)});
    }
    return no(entry.stage==='ready'?'这段故事已经讲完，可以收下这一程的回响':'请先作出自己的决定');
  }
  return null;
}
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
function storyDirection(s){
  return s.story.mercy>s.story.truth?'protect':s.story.truth>s.story.mercy?'seek':'balanced';
}
function companionAttitudes(s){
  const mode=storyDirection(s);
  const lines={
    protect:{qinglan:'你先救人的决定让我安心。山下的灯火，也是我们修行的意义。',yueheng:'救援之后仍愿追查根源，我愿与你一起把这盏灯守住。',suyan:'我记下你为受困者留下的退路，也会继续帮你追索阵图。'},
    seek:{qinglan:'你追查阵眼时没有忘记村人，我会替你守住归来的路。',yueheng:'从源头解开灵息枯竭，才能让更多人免受同样的苦楚。',suyan:'你愿追问被隐去的真相，我愿与你继续校准这张星图。'},
    balanced:{qinglan:'护住眼前的人，也看清远处的路。你我可以慢慢商量。',yueheng:'救人和求真都有分量，我尊重你每一次认真作出的选择。',suyan:'不同的道途都能留下自己的光，我会认真听你的判断。'}
  };
  return Object.fromEntries(Object.keys(C.companions).map(id=>[id,{direction:mode,label:mode==='protect'?'认可你的守护':mode==='seek'?'认可你的求真':'尊重你的道途',text:lines[mode][id]}]));
}
function choicePreview(s,choice){
  const gains=choice==='protect'?{qinglan:3,yueheng:2,suyan:1}:{qinglan:1,yueheng:2,suyan:3};
  return Object.entries(gains).map(([id,gain])=>({id,name:C.companions[id].name,affinity:Math.min(gain,100-s.companions[id].affinity)}));
}
function commissionFlavor(s,def){
  const direction=storyDirection(s),names={
    protect:{hunt:'护山巡界',alchemy:'济民丹会',boss:'镇妖安民',explore:'救援路记',study:'同道授业',tower:'守阵试塔'},
    seek:{hunt:'灵脉勘察',alchemy:'丹炉溯源',boss:'妖核取证',explore:'古府辨图',study:'传承考据',tower:'星纹问塔'}
  };
  if(direction==='balanced')return {name:def.name,description:def.description,storyDirection:direction};
  return {name:names[direction][def.id]||def.name,description:(direction==='protect'?'宗门记得你优先守护众人的选择。':'宗门记得你追查灾厄根源的选择。')+def.description,storyDirection:direction};
}
function commissionView(s){
  const tier=maxTier(s);return Object.values(commissionDefs).map(def=>{
    const used=s.sect.taskCounts[def.id+':'+tier]||0,current=Math.max(0,commissionMetric(s,def.id,tier)-used);
    return {...def,...commissionFlavor(s,def),current,required:def.required,ready:s.sect.joined&&current>=def.required,tier,reward:commissionReward(s,def,tier)};
  });
}
function view(s){
  const ch=C.chapters[s.story.chapter]||null,chapterProgress=ch?requirementView(s,ch.requirements):[];
  const sidequestProgress=C.sidequests.map(q=>{
    const completed=s.story.sideCompleted.includes(q.id),progress=requirementView(s,q.requirements),previousReady=!q.previous||s.story.sideCompleted.includes(q.previous);
    const journey=journeyView(s,q.id);
    return {...q,completed,progress,journey,ready:!completed&&previousReady&&progress.every(x=>x.done)&&!!journey&&journey.ready,progressText:(q.previous&&!previousReady?'先完成前置任务；':'')+progress.map(x=>x.label+' '+x.current+'/'+x.required).join(' · ')};
  });
  const currentJourney=ch?journeyView(s,'chapter_'+ch.id):null;
  return {currentChapter:ch,currentJourney,chapterProgress,chapterReady:!!currentJourney&&currentJourney.ready,sidequestProgress,commissions:commissionView(s),jointCost:C.jointCost,bondThreshold:C.bondThreshold,jointThreshold:C.jointThreshold,jointCooldownMs:C.jointCooldownMs,companionAttitudes:companionAttitudes(s),storyDirection:storyDirection(s),chapterChoices:{protect:choicePreview(s,'protect'),seek:choicePreview(s,'seek')},recommendedEnding:storyDirection(s)==='protect'?'guardian':storyDirection(s)==='seek'?'wanderer':'teacher'};
}
function handle(s,a,now){
  if(!a||typeof a.type!=='string')return null;
  if(['beginStory','advanceStory','inspectStory','chooseStory'].includes(a.type))return handleJourney(s,a,now);
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
    const journey=journeyView(s,'chapter_'+ch.id);if(!journey||!journey.ready)return no('先经历这段故事、完成约定并听完归来的对话');
    if(journey.entry.choice!==a.choice)return no('请沿着你在故事中作出的决定继续');
    s.story.journeys[journey.episode.id].stage='completed';
    grantReward(s,ch.reward);
    if(!s.story.completed.includes(ch.id))s.story.completed.push(ch.id);
    const reactions=choicePreview(s,a.choice);
    s.story.chapter++;if(a.choice==='protect')s.story.mercy++;else s.story.truth++;
    for(const reaction of reactions)s.companions[reaction.id].affinity+=reaction.affinity;
    const reactionText=reactions.map(x=>x.name+'信任+'+x.affinity).join('，');
    K.log(s,'完成《'+ch.name+'》：'+ch.after+' '+reactionText,now);
    return yes(ch.after+' '+reactionText,{reward:ch.reward,chapter:ch.id,reactions,direction:storyDirection(s)});
  }
  if(a.type==='ending'){
    if(s.story.chapter<6)return no('完成六卷主线后再选择归途');
    if(s.story.ending)return no('你已选择归途，可继续自由游历');
    if(!value(s,{key:'endingTrial'}))return no('先亲自落定终境仪式的最后道誓，再决定自己的归途');
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
    const journey=journeyView(s,q.id);if(!journey||!journey.ready)return no('先经历这段同行故事、完成约定并听完归来的对话');
    s.story.journeys[q.id].stage='completed';
    grantReward(s,q.reward);s.story.sideCompleted.push(q.id);
    if(q.companion)s.companions[q.companion].questStep=Math.max(s.companions[q.companion].questStep,q.step+1);
    K.log(s,q.name+'：'+q.after,now);return yes(q.after,{reward:q.reward,quest:q.id});
  }
  if(['talk','gift','bond','jointInvite'].includes(a.type)){
    const c=C.companions[a.companion],r=s.companions[a.companion];if(!c||!r)return no('伙伴不存在');
    if(a.type==='talk'){
      if(now-r.lastTalkAt<60000)return no('稍后再聊，两次问候至少相隔一分钟');
      r.lastTalkAt=now;r.affinity=Math.min(100,r.affinity+8);
      const ordinary=c.dialogues[Math.floor(K.rng(s,'world')*c.dialogues.length)],attitude=companionAttitudes(s)[a.companion];
      const dialogue=s.story.chapter?c.name+'：'+attitude.text+' '+ordinary:ordinary;
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
return {handle,view,grantReward,requirementView,requirementNav,commissionView,value,episode,journeyView,stages,missionGoals,completedEndingTrial};
});
