(function(root,factory){
 const node=typeof module==='object'&&module.exports;
 const api=factory(node?require('./data.js'):root.WendaoData,node?require('./combat.js'):root.WendaoCombat,node?require('./breakthrough-ritual.js'):root.WendaoBreakthroughRitual);
 if(node)module.exports=api;else root.WendaoBattleGuidance=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(C,B,T){
'use strict';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const count=x=>Number.isFinite(x)&&x>=0?Math.floor(x):null;
const tactics=[
 [/镜壳反伤|反射期间/, '镜壳反射时尝试持续伤害，保留直接攻击到反射结束。'],
 [/雷印|叠印/, '雷劫读条前净化雷印，或预留护盾承受引爆。'],
 [/回生|敌人回复/, '在回生读条时打断，或用降低回复的神通限制回血。'],
 [/复制/, '尝试打断复制，或在读条前用辅助神通引导映照。'],
 [/根须尚存|封锁卫兵仍在/, '先转火清除根须或卫兵，再回到主目标；护盾可支援阵心。'],
 [/真元|汲灵/, '尝试打断汲灵，并用低耗神通或聚灵阵维持真元。'],
 [/魅惑|净化束缚/, '预留净化神通或净化丹，确认真实负面状态后解除。'],
 [/未打断且护盾不足|重击未打断/, '在读条时打断，或在重击前开护盾；留意随后出现的反击窗口。'],
 [/护送目标倒下/, '清理卫兵并预留护盾，优先保护护送阵心。'],
 [/气血耗尽|气血或护阵耗尽/, '检查回复与减伤手段，先用免费试阵调整出招顺序。']
];
function evidenceFor(report){
 const unique=new Set(),evidence=[];
 for(const value of Array.isArray(report.failures)?report.failures:[]){
  if(typeof value!=='string'||!value.trim()||unique.has(value))continue;
  unique.add(value);const tactic=tactics.find(([pattern])=>pattern.test(value));
  evidence.push({text:value,advice:tactic?tactic[1]:null});
  if(evidence.length===2)break;
 }
 return evidence;
}
function retryTargets(s,r){
 const no=blockedReason=>({retry:null,practiceTarget:null,blockedReason});
 const d=typeof r.entry==='string'&&Object.prototype.hasOwnProperty.call(C.dungeons,r.entry)?C.dungeons[r.entry]:null;
 if(!d||!['resource','sect','boss','arena','tower','trial'].includes(d.type))return no('此战报请从原有天路或洞天入口继续。');
 if(!s||!s.paths?.[s.route]||r.route!==s.route)return no('当前主修与这份战报不同，请从对应路线查看挑战。');
 if(s.battle||s.exploration||s.joint)return no('先完成当前历练或共修，再准备下一场。');
 if(s.ritual&&s.ritual.phase!=='complete'&&!(d.type==='trial'&&s.ritual.phase==='trial'&&s.ritual.route===s.route&&s.ritual.realm===r.tier))return no('先完成当前闭关，再准备其他挑战。');
 if(!Number.isInteger(r.tier)||r.tier<0||r.tier>5||!Number.isInteger(r.difficulty)||r.difficulty<0||r.difficulty>2)return no('这份旧战报缺少完整挑战参数，请从历练入口选择。');
 if(d.type==='trial'&&r.tier!==s.paths[s.route].realm)return no('旧试炼属于另一境界，请从当前静室查看本境试炼。');
 if(!['resource','tower','trial'].includes(d.type)&&r.tier!==d.realm)return no('战报阶位与入口不一致，请重新选择挑战。');
 const floor=d.type==='tower'?r.floor:null;
 if(d.type==='tower'&&(!Number.isInteger(floor)||floor<1||floor>60||Math.floor((floor-1)/10)!==r.tier))return no('这份旧塔战报未记录完整楼层，请从问道塔选择。');
 const target={id:d.id,tier:r.tier,difficulty:r.difficulty,floor,practice:!!r.practice};
 const allowed=value=>{
  if(d.type==='trial'&&!value.practice){const ritual=T.view(s);if(!ritual.canTrial&&!ritual.legacyReady)return false;}
  return B.previewDungeon(s,value).allowed;
 };
 const retry=allowed(target)?target:null,practice={...target,practice:true};
 const practiceTarget=allowed(practice)?practice:null;
 return {retry,practiceTarget,blockedReason:retry?'':B.previewDungeon(s,target).requirements.join('；')||'当前准备尚未满足，可先免费试阵。'};
}
function model(s,report){
 if(!report||typeof report!=='object')return null;
 const win=!!(report.win||report.victory),outcome=win?'win':report.outcome==='exit'?'exit':'defeat';
 const evidence=evidenceFor(report),handled=count(report.performance?.handled),missed=count(report.performance?.missed);
 return {title:outcome==='exit'?'归途回顾':win?'这一战的回顾':'先看这一战，再做准备',outcome,handled,missed,evidence,
  generalAdvice:evidence.length?'':outcome==='exit'?'主动退出不代表战败；确认目标和配装后，再决定是否继续。':win?'可继续当前约定，或在免费试阵中尝试新的神通组合。':'这份战报没有记录具体机制失误。一般准备建议：检查回复、减伤和出战神通，再用免费试阵尝试。',
  practiceNote:report.practice?'本场为免费试阵：不消耗战斗丹药，不发奖励，也不计首通。':'战报只回顾已经结算的这一场；查看或准备下一场不会再次发奖。',
  ...retryTargets(s,report)};
}
function render(s,report){
 const v=model(s,report);if(!v)return '';
 const performance=v.handled!==null&&v.missed!==null?`<p class="battle-guidance-count">已应对 ${v.handled} 次 · 未应对 ${v.missed} 次</p>`:'<p class="battle-guidance-count">本战报未记录完整机制计数</p>';
 return `<section class="battle-guidance" aria-label="本场复盘"><h3>${esc(v.title)}</h3>${performance}${v.evidence.map(e=>`<article><p><strong>本场记录：</strong>${esc(e.text)}</p>${e.advice?`<p class="battle-guidance-advice"><strong>下次可尝试：</strong>${esc(e.advice)}</p>`:''}</article>`).join('')}${v.generalAdvice?`<p class="battle-guidance-advice">${esc(v.generalAdvice)}</p>`:''}<small>${esc(v.practiceNote)}</small></section>`;
}
return Object.freeze({model,render});
});
