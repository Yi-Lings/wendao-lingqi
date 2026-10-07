'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../web/engine.js'),Story=require('../web/story.js'),StoryScreen=require('../web/story-screen.js');
const Ascension=require('../web/ascension.js'),AscensionScreen=require('../web/ascension-screen.js');
const Art=require('../web/monster-art.js'),Combat=require('../web/combat.js');
const Layout=require('../web/art-layout.js');
const {terminalFixture,stageFixtures}=require('./ascension-fixtures.cjs');
const NOW=1791244800000;
function companionPosition(html){
 const tag=html.match(/<div class="conversation-portrait narrative-portrait"[^>]*>/)?.[0];
 assert(tag,'a companion portrait is actually rendered');
 return tag.match(/background-position:([^";]+)/)?.[1];
}
test('named companion emotions match the retained calm, happy, serious and worried portrait rows',()=>{
 const s=E.createState(NOW),aliases={calm:0,smile:1,joy:1,thoughtful:2,determined:2,serious:2,worried:3};
 for(const speaker of ['qinglan','yueheng','suyan'])for(const [expression,row] of Object.entries(aliases)){
  const line={speaker,expression,text:'表情核对'},story=StoryScreen.render(s,{stage:'intro',episode:{id:'chapter_0'},line});
  const celestial=AscensionScreen.render(s,{stage:'invitation',line});
  const expected=(['qinglan','yueheng','suyan'].indexOf(speaker)*50)+'% '+row*100/3+'%';
  assert.equal(companionPosition(story),expected,speaker+' '+expression+' in the human story');
  assert.equal(companionPosition(celestial),expected,speaker+' '+expression+' in the celestial story');
 }
});
test('each actual celestial realm uses its own scene tile rather than the gate background',()=>{
 const fixtures=stageFixtures(),positions=new Set();
 for(let realm=0;realm<3;realm++){
  const s=fixtures.find(f=>f.name==='ascended-'+realm+'-1').state,v=Ascension.view(s),art=v.realmNarrative.art;
  const html=AscensionScreen.render(s,v),tag=html.match(/<div class="chapter-art narrative-backdrop ascension-backdrop"[^>]*>/)?.[0];
  assert(tag,'the backdrop participates in uniform atlas fitting');
  assert(tag.includes('assets/'+art.file));assert(!tag.includes('story-heaven.png'));
  const position=(art.cols>1?art.col*100/(art.cols-1):50)+'% '+(art.rows>1?art.row*100/(art.rows-1):50)+'%';
  assert(tag.includes('background-position:'+position));
  positions.add(art.file+':'+position);
 }
 assert.equal(positions.size,3,'all three realm locations remain visually distinct');
 const gate=AscensionScreen.render(terminalFixture(),Ascension.view(terminalFixture()));
 assert(gate.includes('assets/story-heaven.png'),'the actual gate keeps its own illustration');
});
test('story backdrops declare uniform cover of their exact source windows including interior separators',()=>{
 const s=E.createState(NOW),crop=[888/1774,0,886/1774,1];
 const html=StoryScreen.render(s,{stage:'intro',episode:{id:'yueheng_3',art:{file:'v8-interiors-atlas.png',cols:2,rows:1,col:1,row:0,crop}},line:{speaker:'yueheng',text:'试读丹典'}});
 assert(html.includes('data-art-fit="cover"'));assert(html.includes('data-art-crop="'+crop.join(',')+'"'));
 for(const [width,height] of [[390,844],[844,390],[360,480]]){
  const g=Layout.geometry({width,height,imageWidth:1774,imageHeight:887,cols:2,rows:1,col:1,row:0,crop,fit:'cover'});
  assert(g);assert(g.cellWidth*g.scale>=width-1e-8&&g.cellHeight*g.scale>=height-1e-8);
  assert(Math.abs(g.width/1774-g.height/887)<1e-12,'one source scale preserves the square interior proportions');
  const left=-g.x/g.scale,right=(width-g.x)/g.scale;
  assert(left>=888-1e-8&&right<=1774+1e-8,'visible source pixels cannot cross the white interior seam');
 }
});
function contains(art,x,y){
 const native=Art.definitions[art.file],box=art.crop;
 return x>=box[0]*native.width&&x<(box[0]+box[2])*native.width&&y>=box[1]*native.height&&y<(box[1]+box[3])*native.height;
}
test('measured boss windows exclude observed neighbouring silhouettes and preserve the intended faces',()=>{
 // Coordinates were visually identified on the native transparent PNG during
 // the audit: turtle ornament beside the crow, and fox aura below the tree.
 assert(!contains(Art.bossArt(4),374,545),'the crow must not contain the turtle ornament');
 assert(contains(Art.bossArt(4),600,420),'the crow face remains visible');
 assert(!contains(Art.bossArt(6),200,1080),'the tree must not contain the next-row fox aura');
 assert(contains(Art.bossArt(9),200,1080),'the fox retains its own upper aura');
 assert(contains(Art.bossArt(6),180,860),'the tree face remains visible');
 assert(!contains(Art.bossArt(7),470,1083),'the group must not contain the next-row general');
 assert(!contains(Art.bossArt(8),850,1080),'the furnace must not contain the next-row golden beast');
});
test('actual twins have individual portraits and actual crow clones resemble their caster',()=>{
 const twins=terminalFixture();let r=Combat.handle(twins,{type:'startDungeon',id:'boss_7',practice:true},NOW);assert(r.ok,r.message);
 const view=Combat.battleView(twins),day=Art.enemyArt(view.enemies[0],view),moon=Art.enemyArt(view.enemies[1],view);
 assert.equal(day.name,'影卫·日');assert.equal(moon.name,'影卫·月');assert.notDeepEqual(day.crop,moon.crop);
 assert(contains(day,450,800));assert(!contains(day,630,800));assert(!contains(day,535,950),'the moon sword sliver must not appear at the day portrait edge');assert(contains(moon,630,800));assert(!contains(moon,450,800));
 const group=Art.bossArt(7);assert(contains(group,450,800)&&contains(group,630,800),'the entrance retains the shared pair');
 const crow=terminalFixture();r=Combat.handle(crow,{type:'startDungeon',id:'boss_4',practice:true},NOW);assert(r.ok,r.message);
 crow.battle.auto=false;crow.battle.player.attack=0;crow.battle.player.hp=crow.battle.player.maxHp=1000000;
 crow.battle.enemies[0].hp=crow.battle.enemies[0].maxHp*.7;Combat.advanceBattle(crow,2);
 const battle=Combat.battleView(crow),clones=battle.enemies.filter(e=>e.role==='clone');assert.equal(clones.length,2);
 for(const clone of clones){const art=Art.enemyArt(clone,battle);assert.equal(art.name,'寒鸦分身');assert.equal(art.file,Art.bossArt(4).file);assert.deepEqual(art.crop,Art.bossArt(4).crop);}
});
test('after winning the arena final, unmet breakthrough conditions replace the completed battle objective',()=>{
 // Explicit persisted unit fixture: all three duel victories are present,
 // while the player is still a mortal at realm zero and layer ten.
 const s=E.createState(NOW);s.paths.magic.layer=10;s.story.chapter=1;s.story.completed=[0];s.story.mercy=1;
 s.progress.dungeonWins={arena_0:1,arena_1:1,arena_2:1};
 s.story.journeys.chapter_1={stage:'mission',choice:'protect',missionIndex:2,line:0,clues:['old_matchmarks','sealed_prize'],baseline:0};
 assert(E.validate(s).ok,'the fixture is a valid save');
 const v=Story.journeyView(s,'chapter_1');assert(v.mission.done);assert.equal(v.mission.canReturn,false);
 assert.equal(v.mission.nextRequirement.key,'rank');
 const html=StoryScreen.render(s,v);
 assert(html.includes('class="story-prerequisites"'));assert(html.includes('9 / 10'));
 assert(html.includes('前往：'+v.mission.nextRequirement.label));
 assert(!html.includes('data-story-objective'),'the completed arena objective no longer competes with the missing conditions');
 assert(!html.includes('前往当前目标'),'the next action names the missing breakthrough');
 for(const x of v.missingRequirements){
  const payload={episode:'chapter_1',key:x.key,id:x.id};
  const encoded=JSON.stringify(payload).replace(/"/g,'&quot;');
  assert(html.includes('data-ui="story-requirement" data-payload="'+encoded+'"'),x.label+' has a concrete source button');
 }
});
