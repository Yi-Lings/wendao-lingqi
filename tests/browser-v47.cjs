'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const ROOT=path.resolve(process.env.LINGQI_ROOT||path.join(__dirname,'..'));
const BASE=process.env.LINGQI_URL||'http://127.0.0.1:8787/',OUT=path.join(ROOT,'dist');
const {chromium}=require(path.join(ROOT,'qa-tools/node_modules/playwright'));
const E=require('../web/engine.js'),Focus=require('../web/story-focus.js');
const {terminalFixture,toReady}=require('./ascension-fixtures.cjs');
const {readyJourneyFixture,toMission}=require('./story-fixtures.cjs');
const NOW=1800000000000,KEY='lingqi-save-v2';
const report={startedAt:new Date().toISOString(),fixtureNotice:'Fresh-start tests use actual starting inventory and public actions. Later fixtures explicitly set rank/resources and story metrics to isolate UI states, not prove natural pacing. All preparation, result, reload and save-failure interactions use real controls; no Android hardware claim.',tests:[],screenshots:[],pageErrors:[],consoleErrors:[],failedRequests:[],badResponses:[],externalRequests:[]};
let browser;
function fixture(){const s=E.createState(NOW);s.training=false;s.paths.magic={realm:5,layer:10,xp:0,reserve:0};s.progress.dungeonWins.resource_herb=1;s.progress.firstClears.push('resource_herb:1:0','resource_herb:1:1');s.stones=1000000;for(const id of Object.keys(s.materials))s.materials[id]=1000;return s;}
function immortal(){const s=terminalFixture({rich:true});toReady(s);assert(E.act(s,{type:'completeAscension'},NOW).ok);s.lastAt=NOW;return s;}
async function withPage(s,fn,viewport={width:390,height:844}){
 const result=E.validate(s);assert(result.ok,result.error);
 const c=await browser.newContext({viewport,deviceScaleFactor:1,reducedMotion:'reduce'});
 c.setDefaultTimeout(12000);
 await c.addInitScript(({s,now,key})=>{
  Date.now=()=>now;
  if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(s));
  localStorage.setItem('lingqi-age-confirmed','yes');
  localStorage.setItem('lingqi_audio_v1',JSON.stringify({muted:true,music:.4,effects:.5}));
  const write=Storage.prototype.setItem;
  Storage.prototype.setItem=function(k,v){if(window.__blockSave&&k===key)throw Error('EXPECTED_SAVE_FAILURE');return write.call(this,k,v);};
 },{s:result.state,now:NOW,key:KEY});
 const p=await c.newPage();
 p.on('pageerror',e=>report.pageErrors.push(e.message));
 p.on('console',m=>{if(m.type()==='error')report.consoleErrors.push(m.text());});
 p.on('requestfailed',r=>report.failedRequests.push({url:r.url(),error:r.failure()?.errorText}));
 p.on('response',r=>{if(r.status()>=400)report.badResponses.push({url:r.url(),status:r.status()});});
 p.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith(new URL(BASE).origin+'/'))report.externalRequests.push(r.url());});
 try{await p.goto(BASE,{waitUntil:'networkidle'});await p.waitForFunction(()=>window.Lingqi?.state());return await fn(p);}finally{await c.close();}
}
const state=p=>p.evaluate(()=>Lingqi.state());
async function press(p,attr,id,predicate=()=>true){
 const scope=await p.locator('#modal-layer [role=dialog]').count()?'#modal-layer ':'';
 const buttons=p.locator(scope+'button['+attr+'="'+id+'"]');
 for(let n=0;n<await buttons.count();n++){const b=buttons.nth(n),data=JSON.parse(await b.getAttribute('data-payload')||'{}');if(predicate(data)&&await b.isVisible()&&await b.isEnabled()){await b.click();return;}}
 throw Error('No enabled '+attr+'='+id);
}
const ui=(p,id,test)=>press(p,'data-ui',id,test),action=(p,id,test)=>press(p,'data-action',id,test);
async function open(p,id){await p.evaluate(id=>Lingqi.showModal('world-event',{id}),id);}
async function shot(p,name){const file='v47-'+name+'.png';await p.screenshot({path:path.join(OUT,file)});report.screenshots.push(file);}
async function fit(p){
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'no horizontal overflow');
 const footer=p.locator('#modal-layer .modal-footer');
 if(await footer.count()){const r=await footer.boundingBox();assert(r.y>=0&&r.y+r.height<=p.viewportSize().height+1,'drawer actions remain in the viewport');}
}
async function test(name,fn){
 if(process.env.LINGQI_BROWSER_FILTER&&!name.includes(process.env.LINGQI_BROWSER_FILTER))return;
 try{const details=await fn();report.tests.push({name,passed:true,details});console.log('PASS '+name);}
 catch(e){report.tests.push({name,passed:false,error:e.stack});console.error('FAIL '+name+': '+e.message);}
}
(async()=>{
 const bundle=path.join(ROOT,'qa-tools/browsers'),revisions=fs.existsSync(bundle)?fs.readdirSync(bundle).filter(x=>x.startsWith('chromium_headless_shell-')).sort():[];
 if(!process.env.LINGQI_CHROMIUM&&!revisions.length)throw Error('未找到可用浏览器：设置 LINGQI_CHROMIUM，或准备 qa-tools/browsers');
 browser=await chromium.launch({headless:true,executablePath:process.env.LINGQI_CHROMIUM||path.join(bundle,revisions.at(-1),'chrome-headless-shell-linux64/chrome-headless-shell'),args:['--no-sandbox','--disable-gpu'],env:{...process.env,FONTCONFIG_FILE:path.join(ROOT,'qa-tools/fonts.conf')}});
 await test('fresh player follows real starting pill, advances, and reaches an affordable recipe without injected supplies',()=>withPage(E.createState(NOW),async p=>{
  const initial=await state(p);assert.equal(initial.paths.magic.layer,1);
  for(let i=0;i<4;i++){const g=await p.evaluate(()=>Lingqi.journey().primary);if(g.target.kind!=='action')break;await ui(p,'journey-go',q=>q.id===g.id);}
  const before=await state(p),g=await p.evaluate(()=>Lingqi.journey().primary);assert.equal(g.target.type,'alchemy');assert.equal(g.target.payload.id,'qi0');assert.match(await p.locator('.primary-goal').innerText(),/灵草|费用|灵石/);await shot(p,'fresh-next-step');
  await ui(p,'journey-go',q=>q.id===g.id);assert(await p.locator('[data-action=queuePill][data-payload*=qi0]').count());assert.deepEqual(await state(p),before);
  await action(p,'queuePill',q=>q.id==='qi0');await action(p,'finishAlchemyJob');assert((await state(p)).pills.qi0>0);assert.equal((await state(p)).alchemy.jobs.length,0);await shot(p,'fresh-crafted');
 }));
 await test('changing difficulty shows exact lock reasons before clicking and keeps preview pure',()=>{const s=E.createState(NOW);s.paths.magic.layer=3;s.training=false;return withPage(s,async p=>{
  const before=await state(p);await p.evaluate(()=>Lingqi.showModal('dungeon',{id:'resource_herb'}));assert(await p.locator('[data-action=startDungeon]').isEnabled());
  await p.selectOption('#dungeon-difficulty','2');assert(await p.locator('[data-action=startDungeon]').isDisabled());assert.match(await p.locator('#dungeon-readiness').innerText(),/金丹|境|层/);await shot(p,'locked-difficulty');
  await p.locator('#dungeon-practice').check();assert(await p.locator('[data-action=startDungeon]').isDisabled());
  await p.selectOption('#dungeon-difficulty','0');assert(await p.locator('[data-action=startDungeon]').isEnabled());assert.match(await p.locator('#dungeon-live-preview').innerText(),/无奖励/);assert.deepEqual(await state(p),before);
  await action(p,'startDungeon');assert((await state(p)).battle.practice);assert.deepEqual((await state(p)).pills,before.pills);
 });});
 await test('retry prepares the same tier and difficulty, and returning from loadout preserves that choice',()=>{const s=fixture();assert(E.act(s,{type:'startDungeon',id:'resource_herb',tier:1,difficulty:1,practice:false},NOW).ok);assert(E.act(s,{type:'leaveBattle'},NOW).ok);return withPage(s,async p=>{
  const before=await state(p);await p.evaluate(()=>Lingqi.showModal('battle-report',{settlement:true}));assert(await p.locator('.battle-guidance').isVisible());await shot(p,'battle-review');
  await ui(p,'battle-retry',q=>!q.practice);assert.equal(await p.inputValue('#dungeon-tier'),'1');assert.equal(await p.inputValue('#dungeon-difficulty'),'1');assert(!(await p.locator('#dungeon-practice').isChecked()));assert.deepEqual(await state(p),before);
  await ui(p,'loadout');await action(p,'setLoadout');assert.equal(await p.inputValue('#dungeon-tier'),'1');assert.equal(await p.inputValue('#dungeon-difficulty'),'1');assert(!(await state(p)).battle);await shot(p,'retry-preparation');
  await action(p,'startDungeon');const b=(await state(p)).battle;assert.equal(b.tier,1);assert.equal(b.difficulty,1);assert.equal(b.practice,false);
 });});
 await test('free practice retry keeps the original parameters and never grants past rewards',()=>{const s=fixture();assert(E.act(s,{type:'startDungeon',id:'resource_ore',tier:2,difficulty:0},NOW).ok);assert(E.act(s,{type:'leaveBattle'},NOW).ok);return withPage(s,async p=>{
  const before=await state(p);await p.evaluate(()=>Lingqi.showModal('battle-report'));await ui(p,'battle-retry',q=>q.practice);assert(await p.locator('#dungeon-practice').isChecked());assert.equal(await p.inputValue('#dungeon-tier'),'2');assert.deepEqual(await state(p),before);
  await action(p,'startDungeon');await p.evaluate(()=>Lingqi.act('leaveBattle'));assert.deepEqual((await state(p)).materials,before.materials);assert.deepEqual((await state(p)).progress,before.progress);
 });});
 await test('failed save while changing loadout stays in preparation and leaves all game progress intact',()=>{const s=fixture();return withPage(s,async p=>{
  await p.evaluate(()=>Lingqi.showModal('dungeon',{id:'resource_herb',tier:1,difficulty:1,practice:true}));await ui(p,'loadout');const before=await state(p);await p.evaluate(()=>window.__blockSave=true);await action(p,'setLoadout');assert.deepEqual(await state(p),before);assert(await p.locator('[data-action=setLoadout]').isVisible());
  await p.evaluate(()=>window.__blockSave=false);await action(p,'setLoadout');assert.equal(await p.inputValue('#dungeon-tier'),'1');assert(await p.locator('#dungeon-practice').isChecked());
 });});
 await test('new tower reports restore their actual floor, while a legacy report never invents it',()=>{const s=fixture();s.progress.tower=6;assert(E.act(s,{type:'startDungeon',id:'tower',floor:7,difficulty:0,practice:true},NOW).ok);assert(E.act(s,{type:'leaveBattle'},NOW).ok);return withPage(s,async p=>{
  assert.equal((await state(p)).lastBattleResult.floor,7);await p.evaluate(()=>Lingqi.showModal('battle-report'));await ui(p,'battle-retry');assert.equal(await p.inputValue('#dungeon-floor'),'7');assert(await p.locator('#dungeon-practice').isChecked());
  await p.reload({waitUntil:'networkidle'});assert.equal((await state(p)).battleReports.at(-1).floor,7);
 });});
 await test('a saved story mission shows its real target after reload and opens its actual action',()=>{const s=fixture();toMission(s,'chapter_0','protect',NOW);return withPage(s,async p=>{
  const before=await state(p),f=Focus.view(before);assert(f.progress);assert.match(await p.locator('.story-focus').innerText(),new RegExp(f.progress.label));await shot(p,'story-focus');
  await p.reload({waitUntil:'networkidle'});assert.deepEqual(Focus.view(await state(p)),f);await ui(p,'flow-story');assert(await p.locator('[data-formation]').count());assert.deepEqual(await state(p),before);
 });});
 await test('a completed mission checkpoint offers return dialogue and never silently grants chapter rewards',()=>{const s=fixture();readyJourneyFixture(s,'chapter_0','protect',NOW);return withPage(s,async p=>{
  const before=await state(p);assert.match(await p.locator('.story-focus').innerText(),/入卷|归|收|回|答/);await ui(p,'flow-story');assert(await p.locator('[data-story-stage=ready]').count());assert.deepEqual(await state(p),before);await shot(p,'story-ready');
 });});
 for(const viewport of [{width:320,height:480},{width:390,height:844},{width:844,height:390},{width:1280,height:800}]){
  await test('flow controls remain reachable and keyboard contained at '+viewport.width+'x'+viewport.height,()=>withPage(fixture(),async p=>{
   await fit(p);await shot(p,'home-'+viewport.width+'x'+viewport.height);await p.evaluate(()=>Lingqi.showModal('dungeon',{id:'resource_herb',tier:1,difficulty:2}));await fit(p);
   for(let n=0;n<8;n++){await p.keyboard.press('Tab');assert(await p.evaluate(()=>document.querySelector('#modal-layer [role=dialog]').contains(document.activeElement)));}
   await shot(p,'challenge-'+viewport.width+'x'+viewport.height);await action(p,'startDungeon');assert((await state(p)).battle);await p.evaluate(()=>Lingqi.act('leaveBattle'));await fit(p);await shot(p,'report-'+viewport.width+'x'+viewport.height);await ui(p,'battle-retry');assert.equal(await p.inputValue('#dungeon-difficulty'),'2');
  },viewport));
 }
 await test('formal trial readiness agrees with the ceremony gate while free trial remains available',()=>{const s=E.createState(NOW);s.training=false;s.paths.magic.layer=10;s.paths.magic.xp=E.modules.core.xpNeeded(s);return withPage(s,async p=>{
  const before=await state(p);await p.evaluate(()=>Lingqi.showModal('dungeon',{id:'trial'}));assert(await p.locator('[data-action=startDungeon]').isDisabled());assert.match(await p.locator('#dungeon-readiness').innerText(),/闭关/);await shot(p,'trial-preparation-gate');
  await p.locator('#dungeon-practice').check();assert(await p.locator('[data-action=startDungeon]').isEnabled());assert.deepEqual(await state(p),before);await action(p,'startDungeon');assert((await state(p)).battle.practice);
 });});
 await test('an open trial drawer updates when passive cultivation fills the layer without a selection change',()=>{const s=E.createState(NOW);s.paths.magic.realm=2;s.paths.magic.layer=10;s.paths.magic.xp=E.modules.core.xpNeeded(s)-4;s.progress.trialWins['magic:2']=true;s.ritualLegacyWins['magic:2']=true;return withPage(s,async p=>{
  await p.evaluate(()=>Lingqi.showModal('dungeon',{id:'trial',difficulty:1}));assert(await p.locator('[data-action=startDungeon]').isDisabled());
  // Move only the UI fixture clock; this verifies a state transition, not natural pacing.
  await p.evaluate(now=>Date.now=()=>now+6000,NOW);await p.waitForFunction(()=>!document.querySelector('[data-action=startDungeon]').disabled);assert.match(await p.locator('#dungeon-selection').innerText(),/困难/);await shot(p,'trial-live-readiness');
  await action(p,'startDungeon');assert.equal((await state(p)).battle.difficulty,1);
 });});
 await test('crafting receipt reflects the saved companion task and returns without advancing or claiming it',()=>{const s=fixture();s.companions.yueheng.affinity=8;toMission(s,'yueheng_0','protect',NOW);return withPage(s,async p=>{
  await p.evaluate(()=>{Lingqi.openStory('yueheng_0');Lingqi.navigate('cave');Lingqi.showModal('alchemy');});
  await action(p,'queuePill',q=>q.id==='heal0');await action(p,'finishAlchemyJob');const saved=await state(p),focus=Focus.view(saved,'yueheng_0');assert.equal(focus.progress.current,1);assert(focus.progress.done);
  assert.equal(await p.locator('#modal-layer .story-focus').getAttribute('data-focus-episode'),'yueheng_0');assert.match(await p.locator('#modal-layer .story-focus').innerText(),/约定已完成/);await shot(p,'craft-task-feedback');
  await ui(p,'flow-story');assert(await p.locator('[data-story-stage=mission]').count());assert.deepEqual(await state(p),saved);assert(!saved.story.sideCompleted.includes('yueheng_0'));
 });});
 await test('normal flow scenarios produce no page, console or network errors',async()=>{
  for(const key of ['pageErrors','consoleErrors','failedRequests','badResponses','externalRequests'])assert.deepEqual(report[key],[],key);
 });
})().catch(e=>{report.fatal=e.stack;console.error(e);}).finally(async()=>{
 if(browser)await browser.close();report.finishedAt=new Date().toISOString();report.partial=!!process.env.LINGQI_BROWSER_FILTER;report.passed=!report.fatal&&report.tests.length>0&&report.tests.every(t=>t.passed);
 fs.writeFileSync(path.join(OUT,'browser-v47-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,tests:report.tests.length,failed:report.tests.filter(t=>!t.passed).map(t=>t.name),screenshots:report.screenshots.length}));if(!report.passed)process.exitCode=1;
});
