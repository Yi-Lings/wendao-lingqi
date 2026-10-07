'use strict';
// Browser fixtures supply rank, inventory and combat attributes explicitly.
// Story lines, clue inspection, promises, fresh victories, ritual cues and
// production payments are exercised through the real player controls.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const ROOT=path.resolve(process.env.LINGQI_ROOT||path.join(__dirname,'..'));
const BASE=process.env.LINGQI_URL||'http://127.0.0.1:8787/',KEY='lingqi-save-v2';
const E=require(path.join(ROOT,'web/engine.js')),S=require(path.join(ROOT,'web/story.js'));
const {chromium}=require(path.join(ROOT,'qa-tools/node_modules/playwright'));
const NOW=1791244800000,DIST=path.join(ROOT,'dist');
const report={startedAt:new Date().toISOString(),url:BASE,fixtureNotice:'Validated rank/resource/attribute fixtures establish UI transactions and recovery; the separate engine campaign establishes no-injection progression.',tests:[],screenshots:[],pageErrors:[],consoleErrors:[],badResponses:[],failedRequests:[]};
const copy=x=>JSON.parse(JSON.stringify(x));let browser;
function fixture(o={}){
 const s=E.createState(NOW);s.training=false;s.paths.magic={realm:o.realm||0,layer:o.layer||5,xp:0,reserve:0};
 if(o.fullXp)s.paths.magic.xp=E.modules.core.xpNeeded(s);
 s.stones=1000000;for(const id of Object.keys(s.materials))s.materials[id]=1000;
 s.migrationCompensation.magic={attack:50000,defense:10000,maxHp:100000};
 s.progress.dungeonWins.resource_herb=10;s.stats.manualWins=10;
 if(o.legacy){s.progress.trialWins['magic:0']=true;delete s.ritual;delete s.ritualLegacyWins;delete s.ritualHistory;}
 const valid=E.validate(s);assert(valid.ok,valid.error);return valid.state;
}
function observe(p){p.on('pageerror',e=>report.pageErrors.push(e.message));p.on('console',m=>{if(m.type()==='error')report.consoleErrors.push(m.text());});p.on('response',r=>{if(r.status()>=400)report.badResponses.push({url:r.url(),status:r.status()});});p.on('requestfailed',r=>report.failedRequests.push({url:r.url(),error:r.failure()?.errorText}));}
async function withPage(o,fn){
 const initial=o.initial||fixture(o),width=o.width||390,height=o.height||844;
 const context=await browser.newContext({viewport:{width,height},isMobile:width<600,hasTouch:width<600,reducedMotion:'reduce'});context.setDefaultTimeout(8000);
 await context.addInitScript(({initial,now,key})=>{window.__lingqiQaNow=now;Date.now=()=>window.__lingqiQaNow;if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(initial));localStorage.setItem('lingqi-age-confirmed','yes');localStorage.setItem('lingqi_audio_v1',JSON.stringify({muted:true,music:.45,effects:.6}));},{initial,now:NOW,key:KEY});
 const p=await context.newPage();observe(p);
 try{await p.goto(BASE,{waitUntil:'networkidle'});await p.waitForFunction(()=>window.Lingqi?.state());return await fn(p,initial);}catch(e){try{await shot(p,'story-ritual-failure-'+report.tests.length+'.png');}catch(_){}throw e;}finally{await context.close();}
}
async function test(name,fn){try{const detail=await fn();report.tests.push({name,passed:true,detail});console.log('PASS '+name);}catch(e){report.tests.push({name,passed:false,error:e.stack||String(e)});console.error('FAIL '+name+': '+e.message);}}
const state=p=>p.evaluate(()=>window.Lingqi.state());
const stored=p=>p.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
const holdings=s=>({stones:s.stones,tickets:s.tickets,materials:s.materials,pills:s.pills,techniques:s.techniques,blueprints:s.blueprints,stats:s.stats,progress:s.progress,story:s.story,ritual:s.ritual,ritualHistory:s.ritualHistory});
async function saved(p){assert.deepEqual(holdings(await stored(p)),holdings(await state(p)),'visible state is already durably stored');}
async function control(p,kind,name,pred=()=>true){const scope=await p.locator('#modal-layer [role=dialog]').count()?'#modal-layer ':'';const bs=p.locator(scope+'button[data-'+kind+'="'+name+'"]:visible');for(let n=0;n<await bs.count();n++){const b=bs.nth(n),payload=await b.evaluate(x=>JSON.parse(x.dataset.payload||'{}'));if(pred(payload))return b;}throw Error('Player control missing '+kind+' '+name);}
async function action(p,name,pred){await(await control(p,'action',name,pred)).click();}
async function ui(p,name,pred){await(await control(p,'ui',name,pred)).click();}
async function openStory(p,id){if(await p.locator('[data-narrative=story][data-story-episode="'+id+'"]').count())return;if(await p.locator('[data-narrative=story]').count())await ui(p,'story-exit');await p.locator('.nav-bottom button[data-page="fate"]').click();await ui(p,'story-open',q=>q.episode===id);await p.waitForSelector('[data-narrative=story][data-story-episode="'+id+'"]');}
async function walkToMission(p,choice='protect'){
 for(let n=0;n<100;n++){
  const stage=await p.locator('[data-narrative=story]').getAttribute('data-story-stage');
  if(stage==='mission')return;
  if(stage==='not-started')await action(p,'beginStory');
  else if(stage==='survey'){
   const clues=p.locator('button[data-action=inspectStory]:not(.examined)');while(await clues.count())await clues.first().click();await action(p,'advanceStory');
  }else if(stage==='decision')await action(p,'chooseStory',q=>q.choice===choice);
  else await action(p,'advanceStory');
 }
 throw Error('Story read sequence did not reach an actual mission');
}
async function walkToReady(p){for(let n=0;n<80;n++){const stage=await p.locator('[data-narrative=story]').getAttribute('data-story-stage');if(stage==='ready')return;assert(['mission','interlude','outro'].includes(stage),'return journey must have actual scene');if(stage==='mission'&&!S.journeyView(await state(p),'chapter_0').mission.done)await fulfilStoryMission(p,'chapter_0');else await action(p,'advanceStory');}throw Error('Return dialogue did not finish');}
async function openRitual(p){
 if(await p.locator('[data-narrative=ritual]').count())return;
 if(await p.locator('[data-narrative=story]').count())await ui(p,'story-exit');
 await p.locator('.nav-bottom button[data-page="cultivation"]').click();await ui(p,'ritual-open',q=>q.route==='magic');await p.waitForSelector('[data-narrative=ritual]');
}
async function acquirePill(p){
 const v=E.modules.ritual.view(await state(p)),id=v.mandatoryPill.id;
 await ui(p,'ritual-acquire',q=>q.kind==='pill'&&q.id===id);
 assert.equal(await p.locator('article[data-recipe="'+id+'"]').count(),1,'acquisition guide focuses the exact mandatory recipe');
 if(!(await state(p)).learnedRecipes.includes(id))await action(p,'researchRecipe',q=>q.id===id);
 const before=await state(p);await p.selectOption('#pill-count','1');const expected=copy(before),result=E.act(expected,{type:'craftPill',id,count:1,control:0},NOW);assert(result.ok,result.message);
 await action(p,'craftPill',q=>q.id===id);assert.deepEqual(holdings(await state(p)),holdings(expected),'guide uses actual paid crafting, never grants a missing pill itself');
 assert.equal(await p.locator('.activity-settlement').count(),1,'acquired pill has its own true production feedback');await saved(p);await dismissReward(p);await openRitual(p);
 return {id,researchLearned:(await state(p)).learnedRecipes.includes(id)};
}
async function ritualToTrial(p){
 for(let guard=0;guard<30;guard++){
  const v=E.modules.ritual.view(await state(p));if(v.stage==='trial')return;
  if(v.stage==='breath')await action(p,'ritualBreath',q=>q.choice===v.cue.expected);
  else if(v.stage==='array')await action(p,'ritualRune',q=>q.choice===v.cue.expected);
  else if(v.stage==='heart'){
   if(!v.heartChoice)await action(p,'ritualResolve',q=>q.choice===v.choices[0].id);
   else {assert.equal(await p.locator('.ritual-dialogue p').count(),2,'the answer has two paragraphs before entering the trial');await action(p,'continueRitual');}
  }else throw Error('Cannot drive an unprepared ritual '+v.stage);
 }
 throw Error('Ritual steps did not reach a real trial');
}
async function finishBattleClock(p){
 for(let step=0;step<80;step++){
  if(!(await state(p)).battle)return;
  await p.evaluate(()=>{window.__lingqiQaNow+=1000;});await p.waitForTimeout(300);
 }
 throw Error('Real app combat loop did not settle after 80 simulated seconds');
}
async function dismissReward(p){
 if(await p.locator('.activity-settlement').count())await ui(p,'activity-return');
 if(await p.locator('.battle-settlement').count())await ui(p,'close');
 while(await p.locator('#modal-layer [role=dialog]').count())await ui(p,'close');
}
async function fulfilStoryMission(p,id){
 const journey=S.journeyView(await state(p),id),goal=journey.mission.goal;
 for(let n=journey.mission.current;n<journey.mission.required;n++){
  await ui(p,'story-mission');
  if(['dungeonWins','bossWins','manualWins','kills'].includes(goal.key)){
   await action(p,'startDungeon');await finishBattleClock(p);
   const after=await state(p);assert(after.lastBattleResult.win,'fresh actual mission battle victory');assert.equal(await p.locator('.battle-settlement').count(),1,'real battle reward page shown');
  }else if(goal.key==='crafted')await action(p,'craftPill',q=>q.id==='heal0');
  else if(goal.key==='study')await action(p,'upgradeTechnique');
  else if(goal.key==='forged')await action(p,'forgeGear');
  else throw Error('Browser must implement declared real goal '+JSON.stringify(goal));
  await dismissReward(p);await openStory(p,id);
 }
 assert(S.journeyView(await state(p),id).mission.done,'the actual player action credits the current chapter mission');
}
async function shot(p,name){await p.evaluate(()=>document.fonts.ready);await p.screenshot({path:path.join(DIST,name),fullPage:false});report.screenshots.push(name);}
async function layout(p){const g=await p.evaluate(()=>{const r=e=>{const x=e.getBoundingClientRect();return {top:x.top,bottom:x.bottom,left:x.left,right:x.right,width:x.width,height:x.height};};const screen=document.querySelector('.narrative-screen');return {viewport:{width:innerWidth,height:innerHeight},docWidth:document.documentElement.scrollWidth,screen:r(screen),footer:r(screen.querySelector('.narrative-footer')),dialogue:screen.querySelector('.narrative-dialogue')?r(screen.querySelector('.narrative-dialogue')):null,scroll:document.querySelector('#page-content').scrollHeight};});assert(g.docWidth<=g.viewport.width+1,'no horizontal overflow');assert(g.screen.top>=-1&&g.screen.bottom<=g.viewport.height+1,'standalone scene remains within viewport');assert(g.footer.bottom<=g.viewport.height+1,'primary action stays on screen');assert(g.footer.height>=44,'primary interaction is usable');return g;}

(async()=>{
 fs.mkdirSync(DIST,{recursive:true});browser=await chromium.launch({headless:true,executablePath:process.env.LINGQI_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
 await test('story is a full scene, saves line and clues, and requires a fresh victory after a promise',()=>withPage({},async p=>{
  const original=await state(p);await openStory(p,'chapter_0');
  if(await p.locator('[data-narrative=story]').getAttribute('data-story-stage')==='not-started')await action(p,'beginStory');
  assert.equal(await p.locator('button[data-action=claimChapter]:visible').count(),0,'entry has no instant-complete option');
  await action(p,'advanceStory');const savedLine=(await state(p)).story.journeys.chapter_0.line;assert(savedLine>0);await saved(p);
  await p.reload({waitUntil:'networkidle'});await openStory(p,'chapter_0');assert.equal((await state(p)).story.journeys.chapter_0.line,savedLine,'reading position resumes after reload');
  while(await p.locator('[data-narrative=story]').getAttribute('data-story-stage')==='intro')await action(p,'advanceStory');
  assert.equal(await(await control(p,'action','advanceStory')).isDisabled(),true,'unread physical clues keep continue disabled');
  const clueButtons=p.locator('button[data-action=inspectStory]');const first=await clueButtons.first().evaluate(x=>JSON.parse(x.dataset.payload).clue);await clueButtons.first().click();await saved(p);
  await ui(p,'story-exit');await openStory(p,'chapter_0');assert((await state(p)).story.journeys.chapter_0.clues.includes(first),'discovery survives leaving scene');
  await walkToMission(p,'protect');const promised=await state(p),j=S.journeyView(promised,'chapter_0');assert.equal(j.mission.current,0,'ten old victories do not fulfil the new promise');
  assert.equal(promised.stones,original.stones);assert.deepEqual(promised.pills,original.pills,'reading never grants loot');await shot(p,'story-mission-390x844.png');
  await ui(p,'story-mission');await action(p,'startDungeon');await finishBattleClock(p);
  const won=await state(p);assert(won.lastBattleResult.win,'fresh actual battle won');assert(S.journeyView(won,'chapter_0').mission.done);
  assert.equal(await p.locator('.battle-settlement').count(),1,'actual battle keeps independent true loot result');await ui(p,'close');
  await openStory(p,'chapter_0');await walkToReady(p);await shot(p,'story-return-390x844.png');const before=await state(p);await action(p,'claimChapter');
  const after=await state(p);assert.equal(after.story.chapter,1);assert.equal(after.story.mercy,1);assert.equal(after.stones-before.stones,E.catalog.chapters[0].reward.stones);await saved(p);
  await ui(p,'activity-return');assert.equal(await p.locator('button[data-action=claimChapter]:visible').count(),0,'completed story cannot collect a second time');
  return {savedLine,clue:first,freshWin:true,chapter:after.story.chapter,choice:after.story.journeys.chapter_0.choice};
 }));
 await test('scene clue and decision save failures preserve the original line and can retry a different genuine choice',()=>withPage({},async p=>{
  await openStory(p,'chapter_0');if(await p.locator('[data-narrative=story]').getAttribute('data-story-stage')==='not-started')await action(p,'beginStory');
  while(await p.locator('[data-narrative=story]').getAttribute('data-story-stage')==='intro')await action(p,'advanceStory');
  const unread=await state(p);await p.evaluate(()=>{window.Native={persistSave:()=>false};});await action(p,'inspectStory');assert.deepEqual(await state(p),unread,'a clue is not marked discovered until the save succeeds');assert.deepEqual(await stored(p),unread);await p.evaluate(()=>delete window.Native);
  while(await p.locator('button[data-action=inspectStory]:not(.examined)').count())await p.locator('button[data-action=inspectStory]:not(.examined)').first().click();await action(p,'advanceStory');
  const undecided=await state(p);await p.evaluate(()=>{window.Native={persistSave:()=>false};});await action(p,'chooseStory',q=>q.choice==='protect');assert.deepEqual(await state(p),undecided,'failed choice remains uncommitted and reversible');await p.evaluate(()=>delete window.Native);
  await action(p,'chooseStory',q=>q.choice==='seek');await saved(p);assert.equal((await state(p)).story.journeys.chapter_0.choice,'seek');const chosen=await state(p);const future=await p.evaluate(()=>window.Lingqi.act('beginStory',{episode:'chapter_1'}));assert.equal(future.ok,false);assert.deepEqual(await state(p),chosen,'a future chapter cannot be opened by dispatch either');return {clueRollback:true,choiceRollback:true,retriedChoice:'seek',futureRejected:true};
 }));
 for(const size of [{width:360,height:640},{width:390,height:844},{width:1440,height:900}])await test('story viewport '+size.width+'x'+size.height+' keeps dialogue and action visible',()=>withPage(size,async p=>{await openStory(p,'chapter_0');if(await p.locator('[data-narrative=story]').getAttribute('data-story-stage')==='not-started')await action(p,'beginStory');const metrics=await layout(p);await shot(p,'story-intro-'+size.width+'x'+size.height+'.png');await walkToMission(p,'seek');const v=S.journeyView(await state(p),'chapter_0');assert.equal(v.entry.choice,'seek');assert.equal(v.mission.current,0);await saved(p);return metrics;}));
 await test('mandatory main pill guide uses deterministic research and paid crafting; wrong cues and save recovery never charge twice',()=>withPage({layer:10,fullXp:true},async p=>{
  await openRitual(p);assert.equal(await(await control(p,'action','beginRitual')).isDisabled(),true,'no substitute for the mandatory main pill');
  const guidance=await acquirePill(p);assert.equal(await(await control(p,'action','beginRitual')).isDisabled(),false);
  const before=await state(p);await action(p,'beginRitual');const paid=await state(p);assert.equal(paid.pills[guidance.id],before.pills[guidance.id]-1);assert.equal(paid.materials.lotus,before.materials.lotus-3);assert.equal(paid.materials.ore,before.materials.ore-3);await saved(p);
  const money=copy({materials:paid.materials,pills:paid.pills,stones:paid.stones});const first=E.modules.ritual.view(paid).cue.expected;await action(p,'ritualBreath',q=>q.choice!==first);
  let after=await state(p);assert.equal(after.ritual.breathStep,0);assert.deepEqual({materials:after.materials,pills:after.pills,stones:after.stones},money,'a wrong breath is an adjustment, not another material payment');
  await action(p,'ritualBreath',q=>q.choice===E.modules.ritual.view(after).cue.expected);await saved(p);assert.equal((await state(p)).ritual.breathStep,1);await shot(p,'ritual-breath-390x844.png');
  await p.reload({waitUntil:'networkidle'});await openRitual(p);assert.equal((await state(p)).ritual.breathStep,1,'a paid partly read ritual resumes after reload');
  while(E.modules.ritual.view(await state(p)).stage==='breath'){const v=E.modules.ritual.view(await state(p));await action(p,'ritualBreath',q=>q.choice===v.cue.expected);}
  after=await state(p);const rune=E.modules.ritual.view(after).cue.expected;await action(p,'ritualRune',q=>q.choice!==rune);assert.equal((await state(p)).ritual.arrayStep,0);assert.deepEqual({materials:(await state(p)).materials,pills:(await state(p)).pills,stones:(await state(p)).stones},money,'a wrong rune adds no payment');
  await ritualToTrial(p);const ready=await state(p);assert.equal(ready.ritual.phase,'trial');assert(ready.ritual.heartChoice);assert.equal(ready.ritual.heartRead,true);await shot(p,'ritual-trial-390x844.png');await ui(p,'ritual-trial');await finishBattleClock(p);
  assert((await state(p)).lastBattleResult.win);await dismissReward(p);await openRitual(p);assert.equal(E.modules.ritual.view(await state(p)).stage,'ready');const won=await state(p);await action(p,'breakthrough');const final=await state(p);assert.equal(final.paths.magic.realm,1);assert.equal(final.paths.magic.layer,1);assert.deepEqual(final.paths.body,before.paths.body,'secondary route is preserved');assert.deepEqual({materials:final.materials,pills:final.pills,stones:final.stones},{materials:won.materials,pills:won.pills,stones:won.stones},'confirming advancement charges no reserved resources a second time');assert.equal(final.ritualHistory.length,1);await saved(p);return {pill:guidance.id,resumeStep:1,heart:final.ritualHistory[0].choice,realm:1};
 }));
 await test('failed native and browser saves roll back ritual reservation and progress before any stage feedback',()=>withPage({layer:10,fullXp:true},async p=>{
  await openRitual(p);await acquirePill(p);const before=await state(p),savedBefore=await stored(p);
  await p.evaluate(()=>{window.Native={persistSave:()=>false};});await action(p,'beginRitual');assert.deepEqual(await state(p),before,'native failure restores pill and array materials');assert.deepEqual(await stored(p),savedBefore);assert.equal(await p.locator('[data-narrative=ritual]').getAttribute('data-ritual-stage'),'preparation');await p.evaluate(()=>delete window.Native);
  await p.evaluate(key=>{window.__qaSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===key)throw Error('Simulated full browser storage');return window.__qaSetItem.call(this,k,v);};},KEY);await action(p,'beginRitual');assert.deepEqual(await state(p),before,'browser save failure also restores payment');assert.deepEqual(await stored(p),savedBefore);await p.evaluate(()=>{Storage.prototype.setItem=window.__qaSetItem;delete window.__qaSetItem;});
  await action(p,'beginRitual');const paid=await state(p);await p.evaluate(()=>{window.Native={persistSave:()=>false};});await action(p,'ritualBreath',q=>q.choice===E.modules.ritual.view(paid).cue.expected);assert.deepEqual(await state(p),paid,'a failed cue save cannot silently advance');await p.evaluate(()=>delete window.Native);return {nativePaymentRollback:true,browserPaymentRollback:true,cueRollback:true};
 }));
 for(const size of [{width:360,height:640},{width:390,height:844},{width:1440,height:900}])await test('ritual viewport '+size.width+'x'+size.height+' keeps preparation, heart and controls visible',()=>withPage({...size,layer:10,fullXp:true},async p=>{
  await openRitual(p);const preparationMetrics=await layout(p);await shot(p,'ritual-preparation-'+size.width+'x'+size.height+'.png');await acquirePill(p);await action(p,'beginRitual');const breathMetrics=await layout(p);
  while(['breath','array'].includes(E.modules.ritual.view(await state(p)).stage)){const v=E.modules.ritual.view(await state(p));await action(p,v.stage==='breath'?'ritualBreath':'ritualRune',q=>q.choice===v.cue.expected);}
  const heartMetrics=await layout(p);await shot(p,'ritual-heart-'+size.width+'x'+size.height+'.png');await action(p,'ritualResolve');const responseMetrics=await layout(p);return {preparationMetrics,breathMetrics,heartMetrics,responseMetrics};
 }));
 assert(report.tests.length>=10,'scene and ritual transaction cases ran');
 assert.equal(report.pageErrors.length,0,'no browser exceptions');assert.equal(report.consoleErrors.length,0,'no console errors');assert.equal(report.badResponses.length,0,'all local resources load');assert.equal(report.failedRequests.length,0,'no failed asset requests');
})().catch(e=>{report.fatal=e.stack||String(e);console.error(e);}).finally(async()=>{if(browser)await browser.close();report.finishedAt=new Date().toISOString();report.passed=!report.fatal&&report.tests.length>0&&report.tests.every(t=>t.passed);fs.writeFileSync(path.join(DIST,'browser-story-ritual-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,tests:report.tests.length,failed:report.tests.filter(t=>!t.passed).map(t=>t.name),pageErrors:report.pageErrors}));if(!report.passed)process.exitCode=1;});
