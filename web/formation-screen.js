(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.WendaoFormationScreen=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),payload=p=>esc(JSON.stringify(p));
const ui=(label,id,p,cls='secondary')=>`<button type="button" class="btn ${cls}" data-ui="${id}" data-payload="${payload(p)}">${esc(label)}</button>`;
const act=(label,type,p,cls='primary',disabled=false)=>`<button type="button" class="btn ${cls}" data-action="${type}" data-payload="${payload(p)}"${disabled?' disabled':''}>${esc(label)}</button>`;
const names=['北','东','南','西'],points=[[50,0],[100,50],[50,100],[0,50]];
function render(v,options={}){
 if(!v)return {title:'护阵札记',body:'<p>请先在对应故事中立下护阵约定。</p>',footer:ui('合上札记','close',{})};
 const c=v.case,n=v.note,selected=Number.isInteger(options.tile)&&c.tiles[options.tile]?options.tile:c.sourcePort.tile,id=c.id,f=v.flow;
 const source=`<div class="formation-provenance"><strong>${v.sourceReady?'✓ 正式履历已核对':'待取得正式履历'}</strong><span>${esc(c.sourceLabel)}</span>${v.sourceReady?'<small>已有正式记录可沿用，无需重复历练。</small>':`${ui('前往正式历练','formation-source',{id},'secondary small')}<small>可先接图；正式通关后才可验通。试阵不计入。</small>`}</div>`;
 const intro=`<div class="formation-intro" style="--formation-art:url(assets/${c.art})"><span class="eyebrow">接来息 · 留退口</span><h3>${esc(c.title)}</h3><p>${esc(c.brief)}</p>${act('展开护阵图','beginFormation',{id})}<small>旋转阵石 → 看灵息走向 → 核验归路<br>可随时暂别，方向与进度随存档保留。</small></div>`;
 const feedback=n?.verdict&&n.verdict!=='resolved'?n.verdict==='blocked'?'来息尚未接入。让起阵石的铜槽朝向左侧来息。':n.verdict==='leak'?'亮线还有 '+f.leaks+' 处断口。检查相邻铜槽是否正面对接。':'关键阵口与归处尚未同时接通。对照口诀，逐段接续。':null;
 const board=c.tiles.map((tile,i)=>{
  if(!tile)return '<div class="formation-stone sealed" aria-hidden="true"><span>封石</span></div>';
  const ports=f.ports[i],a=points[ports[0]],b=points[ports[1]],path=`M${a[0]},${a[1]} L50,50 L${b[0]},${b[1]}`,lit=f.lit.includes(i),cls='formation-stone'+(lit?' lit':'')+(selected===i?' current':''),text=tile.label+'阵石，铜槽朝'+ports.map(d=>names[d]).join('、')+(lit?'，已通灵息':'，尚未通息');
  const content=`<svg viewBox="0 0 100 100" aria-hidden="true"><path class="formation-channel-shadow" d="${path}"/><path class="formation-channel" d="${path}"/><circle class="formation-core" cx="50" cy="50" r="10"/></svg><span class="formation-stone-label">${esc(tile.label)}</span>${lit?'<span class="formation-lit-mark" aria-hidden="true">✓</span>':''}`;
  return v.resolved?`<div class="${cls}" role="img" aria-label="${esc(text)}">${content}</div>`:`<button type="button" class="${cls}" data-action="turnFormation" data-payload="${payload({id,tile:i,step:1})}" aria-label="${esc(text+'，点击顺转四分之一圈')}" title="${esc(text)}">${content}</button>`;
 }).join('');
 const terminals=p=>`${(Math.floor(p.tile/3)+.5)*100/3}%`;
 const stage=`<div class="formation-workbench" style="--formation-art:url(assets/${c.art})">${feedback?`<p class="formation-feedback" role="status" tabindex="-1">${esc(feedback)}</p>`:''}<div class="formation-endpoints"><span>来息 · ${esc(c.tiles[c.sourcePort.tile].label)}</span><span>归处 · ${esc(c.tiles[c.sinkPort.tile].label)}</span></div><p class="formation-gesture">点击阵石顺转 · 当前阵石可在下方逆转</p><div class="formation-board-wrap"><div class="formation-grid" role="group" aria-label="九宫护阵图，七块阵石可转动">${board}<span class="formation-terminal source ${f.fed?'lit':''}" style="top:${terminals(c.sourcePort)}" aria-hidden="true">息</span><span class="formation-terminal sink ${f.sink?'lit':''}" style="top:${terminals(c.sinkPort)}" aria-hidden="true">归</span></div></div><p class="formation-flow" role="status" aria-live="polite">${f.fed?'来息已入':'来息未入'} · 关键阵口 ${f.targets.filter(t=>t.lit).length} / 3 · ${f.sink?'归处已通':'归处未通'}${f.leaks?' · '+f.leaks+' 处断口':''}</p></div>`;
 const result=v.resolved?`<section class="formation-result" tabindex="-1"><span class="eyebrow">护阵已验通 · 只读札记</span><h3>来息有路，退口仍开</h3><blockquote><strong>${esc(v.companion)}</strong><p>${esc(c.response)}</p></blockquote><p>这次验通记入约定。回到同行者身边继续对话，章节奖励仍只领取一次。</p></section>`:'';
 const controls=!v.resolved?`<div class="formation-current"><strong>当前阵石 · ${esc(c.tiles[selected].label)}</strong><p>铜槽朝 ${f.ports[selected].map(d=>names[d]).join('、')}。点击阵石可顺转；也可在这里逆转。</p>${act('逆转「'+c.tiles[selected].label+'」','turnFormation',{id,tile:selected,step:-1},'secondary')}</div>`:'';
 const notes=`<aside class="formation-notes"><p class="eyebrow">${esc(c.place)}</p><p class="formation-rule">${esc(c.rule)}</p><ul class="formation-targets" aria-label="关键阵口">${f.targets.map(t=>`<li class="${t.lit?'lit':''}"><span>${t.lit?'✓':'○'} ${esc(t.label)}</span><small>${t.lit?'已通息':'待接续'}</small></li>`).join('')}</ul>${controls}${source}<p class="formation-smallprint">先看亮线，再查断口。转动与试验不消耗资源，不计时、不罚错。${n?'已转动 '+n.moves+' 次。':''}</p></aside>`;
 return {title:'护阵札记 · '+c.title,body:`<section class="formation-screen" data-formation="${id}" data-formation-status="${n?.status||'not-started'}">${!n?intro:`${result}<div class="formation-layout">${stage}${notes}</div>`}</section>`,footer:`${n&&!v.resolved?act('引息验阵','testFormation',{id},'primary',!v.sourceReady):''}${ui('返回这一卷','story-open',{episode:c.episode},n&&!v.resolved?'secondary':'primary')}`};
}
return Object.freeze({render});
});
