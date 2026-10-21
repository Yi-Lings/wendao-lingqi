(function(root,factory){
  const node=typeof module==='object'&&module.exports;
  const api=factory(node?require('./data.js'):root.WendaoData,node?require('./story.js'):root.WendaoStory);
  if(node)module.exports=api;else root.WendaoStoryFocus=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(C,S){
'use strict';
const own=(o,k)=>!!o&&Object.prototype.hasOwnProperty.call(o,k);
function view(s,preferredEpisode){
  if(!s?.story||s.battle||s.exploration||s.joint||s.ritual&&s.ritual.phase!=='complete'||s.ascension?.stage==='ascended')return null;
  const saved=s.story.journeys||{},chapter='chapter_'+s.story.chapter;
  const accepted=id=>{
    if(typeof id!=='string'||!own(saved,id))return null;
    const j=S.journeyView(s,id);
    return j?.accessible&&!j.completed&&j.entry?j:null;
  };
  let j=accepted(preferredEpisode)||accepted(chapter);
  if(!j)for(const q of C.sidequests){j=accepted(q.id);if(j)break;}
  if(!j){const next=S.journeyView(s,chapter);if(next?.accessible&&!next.completed)j=next;}
  if(!j)return null;
  const episode=j.episode.id,stage=j.stage;
  const result={episode,title:j.episode.title,stage,summary:'继续眼前的约定。',label:'继续这一卷',target:{type:'story-open',payload:{episode}}};
  if(stage==='not-started'){
    result.summary=j.episode.id==='chapter_0'?'从雪夜与一盏灯开始，听听同行者的来意。':'新的故事已经可以走近，先听听同行者的来意。';
    result.label='走进这一卷';
  }else if(stage==='intro')result.summary='听完相遇的对话，再查看现场线索。';
  else if(stage==='survey'){
    const required=j.episode.clues.length,current=j.cluesRead;
    result.summary=current>=required?'现场线索已读齐，可以回去作出自己的选择。':'查看现场线索，弄清两条道路各自的缘由。';
    result.progress={kind:'clues',label:'已读线索',current,required,done:current>=required};
    result.label=current>=required?'回去作出选择':'继续查看线索';
  }else if(stage==='decision'){
    result.summary='线索已经齐备，选择你愿意承担的约定。';result.label='作出自己的选择';
  }else if(stage==='reply')result.summary='听完同行者对这次选择的回应，再动身。';
  else if(stage==='interlude'){
    result.summary='第 '+((j.mission?.index||0)+1)+' 幕行动已完成，先听归来的回应，再接下一幕约定。';result.label='听取归来回应';
  }else if(stage==='outro'){
    result.summary='约定与修行条件已经达成，听完这一程的归来对话。';result.label='听完归来对话';
  }else if(stage==='ready'){
    result.summary=j.ready?'这一程已讲完，回到卷中收下同行者的回响。':'归来对话已读完，仍需补齐本卷条件。';result.label='回到这一卷';
  }
  if(stage==='mission'&&j.mission){
    const m=j.mission,index=m.index+1,prefix='第 '+index+' / '+m.total+' 幕 · ';
    result.progress={kind:'mission',label:m.goal.label,current:m.current,required:m.required,done:m.done,index,total:m.total};
    if(m.canReturn){
      result.summary=prefix+'约定已完成，同行者等你归来。';result.label='归来兑现约定';
    }else if(m.done&&m.nextRequirement){
      const r=m.nextRequirement;
      result.summary=prefix+'本幕行动已完成；还需 '+r.label+' '+r.current+' / '+r.required+'。';
      result.progress={kind:'requirement',label:r.label,current:r.current,required:r.required,done:r.done,index,total:m.total};
      result.label='前往补齐条件';result.target={type:'story-requirement',payload:{episode,key:r.key,id:r.id}};
    }else{
      result.summary=prefix+m.goal.label+' '+m.current+' / '+m.required+'；完成后回来听取回应。';
      result.label='前往完成约定';result.target={type:'story-mission',payload:{episode}};
    }
  }
  return result;
}
return Object.freeze({view});
});
