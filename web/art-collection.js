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
 ...['初','青','玄','紫','天','道'].map((name,i)=>['v5-gear-quality-'+i+'.png','行旅器谱 · '+name+'卷','六派旧器的合绘。青锋、玄武、雷霄、离火、太虚与回春，在各自的形制中留下传承。']),
 ['v9-snow-village.png','雪夜留灯','雪下的药圃与回村的灯。铜槽怎样相接，决定暖意最终留在哪里。'],
 ['v9-archive-chamber.png','第七阵口','古府的书架仍存旧卷，护阵桌与石门之间，留着不该被封死的退路。'],
 ['v9-furnace-inspection.png','封炉旁席','原签、值炉簿与铜钥同置案头。灯照得见的记录，不必只听谁的声量。'],
 ['v9-evidence-atlas.png','问证八笺','钟片、草根、霜痕、旧簿与封签，各有自己的来处。画能帮助辨认，判断仍需两份相合的证据。'],
 ['v10-cloud-retreat.png','云栖入静','松下的一方席、一盏香。每一层修行，都从愿意停下来的此刻开始。'],
 ['v10-artifact-atelier.png','六器藏锋','剑、锤、杖与衣甲都各有形制。出发之前，先看清自己真正带着什么。'],
 ['v10-star-observatory.png','万象星台','铜仪循星，玉盘映月。天道感应的每一份所得，都由真实记录留存。'],
 ['v10-encounters-a.png','山湖六遇','雾桥、古井、山钟、渡舟、云圃与断晷。走近以后，每处都有自己的难题。'],
 ['v10-encounters-b.png','雾火六行','残卷、石林、家书、地脉、残炉与赤泉。有些路要辨明，有些人要等到最后。'],
 ['v10-encounters-c.png','星河六问','星桥、月镜、天炉、玄河、新雪与晴空。选择的印记，在归途里渐渐清楚。'],
 ['v10-qinglan-lantern.png','青岚 · 为归途留灯','药篓放下，灯仍需挂稳。她把村口照亮，再回头看山路上的脚印。'],
 ['v10-yueheng-medicine.png','月衡 · 灯下验药','一份活药、一只净碗。窗外雨声不停，炉边的人仍认真核对每一味材料。'],
 ['v10-suyan-records.png','素衍 · 纸上留路','星图与旧档摊在同一张桌上。她先找出遗漏的一笔，也留住书架后的出口。']
].map(([file,name,description],index)=>Object.freeze({id:'painting_'+index,file,name,description,index}));
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function view(index=0){const n=Number.isInteger(index)?Math.max(0,Math.min(records.length-1,index)):0;return {...records[n],total:records.length};}
function render(index=0,{directory=false,directoryPage}={}){
 const art=view(index),size=6,pages=Math.ceil(records.length/size),page=Number.isInteger(directoryPage)?Math.max(0,Math.min(pages-1,directoryPage)):Math.floor(art.index/size);
 const pageButtons=Array.from({length:pages},(_,i)=>`<button type="button" class="btn ghost small" data-ui="art-directory-page" data-payload="${esc(JSON.stringify({page:i}))}" aria-pressed="${i===page}">${i*size+1}–${Math.min((i+1)*size,records.length)}</button>`).join('');
 const catalog=records.slice(page*size,(page+1)*size).map(entry=>`<button type="button" class="art-directory-item" data-ui="art-collection-page" data-payload="${esc(JSON.stringify({index:entry.index,directory:true}))}" aria-current="${entry.index===art.index}"><span class="art-directory-thumb" aria-hidden="true" style="background-image:url(assets/${entry.file})"></span><small>${entry.index+1}. ${esc(entry.name)}</small></button>`).join('');
 return `<section class="art-collection" data-art-collection="${art.id}"><p class="muted">长明书院 · 藏画阁</p><div class="art-collection-painting" role="img" aria-label="${esc(art.name)}" style="background-image:url(assets/${art.file})"></div><h3 tabindex="-1">${esc(art.name)}</h3><p>${esc(art.description)}</p><div class="art-collection-navigation"><button type="button" class="btn secondary" data-ui="art-collection-page" data-payload="${esc(JSON.stringify({index:art.index-1}))}"${art.index===0?' disabled':''}>上一卷</button><span>${art.index+1} / ${art.total}</span><button type="button" class="btn secondary" data-ui="art-collection-page" data-payload="${esc(JSON.stringify({index:art.index+1}))}"${art.index===art.total-1?' disabled':''}>下一卷</button></div><details class="art-directory"${directory?' open':''}><summary>展卷目录 · ${records.length} 卷 · 点选直达</summary><div class="art-directory-pages">${pageButtons}</div><div class="art-directory-grid">${catalog}</div></details></section>`;
}

return Object.freeze({records:Object.freeze(records),view,render});
});
