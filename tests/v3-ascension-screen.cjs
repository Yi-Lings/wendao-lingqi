'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../web/engine.js'),A=require('../web/ascension.js'),N=require('../web/ascension-scenes.js'),Screen=require('../web/ascension-screen.js');
const NOW=1791244800000;
function mortal(){
 const s=E.createState(NOW);s.paths.magic={realm:5,layer:10,xp:E.catalog.layerXp[9]*E.catalog.realmXpFactors[5],reserve:0};
 s.progress.trialWins['magic:5']=true;s.progress.endingTrials.magic=true;s.ritualLegacyWins['magic:5']=true;
 s.story.chapter=6;s.story.mercy=3;s.story.truth=3;s.story.completed=E.catalog.chapters.map(c=>c.id);
 for(const id of Object.keys(s.materials))s.materials[id]=1000;s.stones=1000000;return s;
}
function act(s,type,args={}){const result=A.handle(s,{type,...args},NOW);assert(result.ok,result.message);A.validate(s);return result;}
function celestial(realm=0){
 const s=mortal();act(s,'beginAscension');
 for(let n=0;n<N.invitation.length;n++)act(s,'advanceAscension');act(s,'chooseAscension',{choice:'protect'});
 for(let n=0;n<N.vows.protect.reply.length;n++)act(s,'advanceAscension');
 for(let n=0;n<N.condense.length;n++)act(s,'advanceAscension');
 for(let n=1;n<N.trial.length;n++)act(s,'advanceAscension');s.progress.dungeonWins.heaven_gate=1;act(s,'advanceAscension');
 for(let n=0;n<N.return.protect.length;n++)act(s,'advanceAscension');act(s,'completeAscension');
 for(let n=0;n<realm;n++)s.progress.dungeonWins['immortal_'+n]=1;
 s.ascension.realm=realm;s.ascension.breakthroughs=realm;s.ascension.yuan=1000;A.validate(s);return s;
}
test('ascension renderer reflects the real gate, exact payable materials and disabled unavailable controls',()=>{
 const s=E.createState(NOW),before=JSON.stringify(s),v=A.view(s),html=Screen.render(s,v);
 assert(html.includes('data-ascension-stage="preparation"'));assert.match(html,/data-action="beginAscension"[^>]* disabled/);
 for(const id of Object.keys(v.preparationCost.materials)){assert(html.includes('data-ascension-cost="'+id+'"'));assert(html.includes('已有 '+s.materials[id]));}
 assert(html.includes('data-ui="ascension-source"'));assert(html.includes('六卷山海主线'));assert.equal(JSON.stringify(s),before,'rendering cannot grant preparation or progress');
});
test('celestial progress exposes actual training and challenges while future aftermath letters remain unavailable',()=>{
 const s=celestial(),before=JSON.stringify(s),v=A.view(s),html=Screen.render(s,v);
 assert(html.includes('data-ascension-stage="ascended"'));assert(html.includes('仙元 1000'));assert(html.includes('本层修为 0 / '+v.xpNeeded));
 assert(html.includes('data-action="celestialMeditate"'));assert(html.includes('data-celestial-challenge="immortal_hunt_0"'));assert(html.includes('data-celestial-challenge="immortal_0"'));
 assert(!html.includes('data-celestial-challenge="immortal_1"'));assert(html.includes('初入此境 · 同行者来信'));
 assert(!html.includes('道劫之后 · 归途回响'));assert(!html.includes('道劫之前 · 护道叮咛'));assert.equal(JSON.stringify(s),before);
 s.ascension.layer=10;s.ascension.xp=A.xpNeeded(s.ascension);const prepared=Screen.render(s,A.view(s));assert(prepared.includes('道劫之前 · 护道叮咛'));assert(!prepared.includes('道劫之后 · 归途回响'));
 s.progress.dungeonWins.immortal_0=1;const after=Screen.render(s,A.view(s));assert(after.includes('道劫之后 · 归途回响'));assert(after.includes('data-action="celestialBreakthrough"'));
});
test('the last celestial realm offers its real perfection action rather than inventing another realm',()=>{
 const s=celestial(2);s.ascension.layer=10;s.ascension.xp=A.xpNeeded(s.ascension);s.progress.dungeonWins.immortal_2=1;
 const html=Screen.render(s,A.view(s));assert(html.includes('自证金仙圆满'));assert(html.includes('金仙圆满的实际投入'));assert(!html.includes('凝定下一仙阶的实际投入'));
 act(s,'celestialBreakthrough');const completed=Screen.render(s,A.view(s));assert(completed.includes('道心已凝 · 金仙圆满'));assert(!completed.includes('data-action="celestialBreakthrough"'));
});
test('dynamic dialogue and scene metadata are escaped while known companions retain their names',()=>{
 const s=celestial(),v=A.view(s);v.line={speaker:'qinglan',text:'<img src=x onerror=alert(1)>',expression:2};v.realmNarrative.title='<script>bad()</script>';
 const html=Screen.render(s,v);assert(!html.includes('<img src=x'));assert(!html.includes('<script>bad'));assert(html.includes('&lt;img src=x'));assert(html.includes('沈青岚'));assert(html.includes('v3-hero-expressions.png'));
 v.background='../../private.png';assert(Screen.render(s,v).includes('assets/story-heaven.png'));
});
test('three immortal mentors use their own named portrait crops and all four expressions',()=>{
 const M=require('../web/mentor-art.js'),s=celestial(),v=A.view(s);
 for(const id of ['xuanlv','chizhaochuan','shangfenyue'])for(let expression=0;expression<4;expression++){
  const art=M.portrait(id,expression);v.line={speaker:id,text:'真实的仙界人物对话。',expression};
  const html=Screen.render(s,v);assert(html.includes('data-mentor-speaker="'+id+'"'));assert(html.includes('data-mentor-expression="'+expression+'"'));
  assert(html.includes('data-art-crop="'+art.crop.join(',')+'"'));assert(html.includes('assets/'+art.file));assert(html.includes(art.name));
 }
 v.line={speaker:'未知引路人',text:'不借用已知人物的脸。'};assert(!Screen.render(s,v).includes('data-mentor-speaker='));
});
