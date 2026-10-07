(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.WendaoArtCollection=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const records=[
 ['v3-skills-atlas.png','灵纹初解','书院留存的旧灵纹摹本。剑意、雷光与行气图仍可辨认，前人的笔迹在卷边相互补注。'],
 ['v4-weapons-atlas.png','山海古兵谱','散修走过山河后留下的兵器画卷。铁与玉、木与铜，各有曾守住的归途。'],
 ['v4-armor-atlas.png','守山衣甲录','旧衣、护冠与甲片排在同一张案上。画师记下的不只有光彩，也有每一道缝补。'],
 ['v4-utilities-atlas.png','百物拾遗','药材、矿石与行旅杂物的旧抄图。许多不起眼的小物，曾让一炉药、一盏灯得以续下去。'],
 ['v4-treasures-atlas.png','百宝旧图','山门曾收藏的灵宝摹本。炉、灯、镜、塔各自留下纹路，等后来者读懂用途。'],
 ['v4-pills-atlas.png','丹心旧录','丹师的旧画册以色泽和纹理辨药。月衡把它留在藏画阁，供来者对照前人的心得。'],
 ['v4-basic-skills-atlas.png','入门手札','六派启蒙时画下的口诀与招式。那些最初学会的运转，仍藏在后来的每次出手里。'],
 ...['初','青','玄','紫','天','道'].map((name,i)=>['v5-gear-quality-'+i+'.png','行旅器谱 · '+name+'卷','六派旧器的合绘。青锋、玄武、雷霄、离火、太虚与回春，在各自的形制中留下传承。'])
].map(([file,name,description],index)=>Object.freeze({id:'painting_'+index,file,name,description,index}));
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function view(index=0){const n=Number.isInteger(index)?Math.max(0,Math.min(records.length-1,index)):0;return {...records[n],total:records.length};}
function render(index=0){const art=view(index);return `<section class="art-collection" data-art-collection="${art.id}"><p class="muted">长明书院 · 藏画阁</p><div class="art-collection-painting" role="img" aria-label="${esc(art.name)}" style="background-image:url(assets/${art.file})"></div><h3>${esc(art.name)}</h3><p>${esc(art.description)}</p><div class="art-collection-navigation"><button type="button" class="btn secondary" data-ui="art-collection-page" data-payload="${esc(JSON.stringify({index:art.index-1}))}"${art.index===0?' disabled':''}>上一卷</button><span>${art.index+1} / ${art.total}</span><button type="button" class="btn secondary" data-ui="art-collection-page" data-payload="${esc(JSON.stringify({index:art.index+1}))}"${art.index===art.total-1?' disabled':''}>下一卷</button></div></section>`;}
return Object.freeze({records:Object.freeze(records),view,render});
});
