'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const ROOT=process.env.LINGQI_ROOT||path.resolve(__dirname,'..'),BASE=process.env.LINGQI_URL||'http://127.0.0.1:8787/';
const {chromium}=require(path.join(ROOT,'qa-tools/node_modules/playwright')),E=require('../web/engine.js');
const DIST=path.join(ROOT,'dist'),KEY='lingqi-save-v2',AGE='lingqi-age-confirmed';
const revisions=process.env.LINGQI_CHROMIUM?[]:fs.readdirSync(path.join(ROOT,'qa-tools/browsers')).filter(x=>x.startsWith('chromium_headless_shell-')).sort();
const executable=process.env.LINGQI_CHROMIUM||path.join(ROOT,'qa-tools/browsers',revisions.pop(),'chrome-headless-shell-linux64/chrome-headless-shell');
const report={startedAt:new Date().toISOString(),url:BASE,tests:[],screenshots:[],pageErrors:[],consoleErrors:[],failedRequests:[],badResponses:[],externalRequests:[],fixtureNotice:'Fresh-account onboarding uses no injected resources. Advanced equipment, trial and persistence checks use validated fixtures; these are not evidence of economic reachability or device performance.'};
let browser;
const state=p=>p.evaluate(()=>window.Lingqi.state());
async function test(name,fn){
 const at=Date.now();try{const details=await fn();report.tests.push({name,passed:true,durationMs:Date.now()-at,details});console.log('PASS '+name);}
 catch(e){report.tests.push({name,passed:false,durationMs:Date.now()-at,error:e.stack});console.error('FAIL '+name+': '+e.message);}
}
async function make({fixture,width=390,height=844,reduced=false,nativeFails=false}={}){
 const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:reduced?'reduce':'no-preference'});
 const p=await context.newPage();
 p.on('pageerror',e=>report.pageErrors.push(e.message));
 p.on('console',m=>{if(m.type()==='error')report.consoleErrors.push(m.text());});
 p.on('requestfailed',r=>report.failedRequests.push({url:r.url(),error:r.failure()?.errorText}));
 p.on('response',r=>{if(r.status()>=400)report.badResponses.push({url:r.url(),status:r.status()});});
 p.on('request',r=>{if(!r.url().startsWith(BASE)&&!/^(data:|blob:)/.test(r.url()))report.externalRequests.push(r.url());});
 if(fixture){const v=E.validate(fixture);assert(v.ok,v.error);await context.addInitScript(({key,age,raw})=>{if(!localStorage.getItem(key)){localStorage.setItem(key,raw);localStorage.setItem(age,'yes');}},{key:KEY,age:AGE,raw:JSON.stringify(v.state)});}
 if(nativeFails)await context.addInitScript(({key})=>{window.Native={loadSave:()=>localStorage.getItem(key)||'',persistSave:()=>false};},{key:KEY});
 await p.goto(BASE,{waitUntil:'networkidle'});
 return {p,context};
}
async function close(p){if(await p.locator('#modal-layer [role="dialog"]').isVisible())await p.keyboard.press('Escape');}
async function ui(p,id){await p.locator('[data-ui="'+id+'"]:visible').first().click();}
async function restore(p,s){s.lastAt=Date.now();assert(await p.evaluate(raw=>window.Lingqi.import(raw),JSON.stringify(s)));await close(p);}
async function overflow(p){assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1&&document.body.scrollWidth<=innerWidth+1),'horizontal overflow');}
async function shot(p,name){
 await p.waitForTimeout(260);await p.evaluate(()=>{document.getElementById('toast').hidden=true;});await p.screenshot({path:path.join(DIST,name),fullPage:false});report.screenshots.push(name);
}
function fixture(){
 const s=E.createState(Date.now());s.training=false;s.paths.magic.layer=5;
 const Q=E.modules.economy;
 for(const slot of Object.keys(E.catalog.slots))for(const set of ['body','sword','array'])Q.addGear(s,Q.createGear(s,{slot,set,rarity:2,tier:0}));
 Q.addGear(s,Q.createGear(s,{slot:'weapon',set:'body',rarity:5,tier:0}));
 return s;
}
(async()=>{
 fs.mkdirSync(DIST,{recursive:true});
 browser=await chromium.launch({headless:true,executablePath:executable,args:['--no-sandbox','--disable-gpu'],env:{...process.env,FONTCONFIG_FILE:path.join(ROOT,'qa-tools/fonts.conf')}});
 report.browser=await browser.version();
 const fresh=await make(),p=fresh.p;
 await test('fresh: live journey accelerates with an owned pill, then advances exactly one layer',async()=>{
  await p.locator('#accept-age').check();await ui(p,'enter');
  const before=await state(p);assert.equal(before.paths.magic.layer,1);
  const goal=await p.evaluate(()=>window.Lingqi.journey().primary);assert.equal(goal.id,'pill:qi0');
  await p.locator('#journey-body [data-ui="journey-go"]').click();
  const after=await state(p);assert.equal(after.pills.qi0,before.pills.qi0-1);assert.equal(after.paths.magic.layer,1);
  assert.equal(await p.evaluate(()=>window.Lingqi.journey().primary.id),'level-up');
  await p.locator('#journey-body [data-ui="journey-go"]').click();assert.equal((await state(p)).paths.magic.layer,2);
  await shot(p,'v31-mobile-journey.png');await overflow(p);
 });
 await test('fresh: an outdated journey link cannot repeat a consumed pill action',async()=>{
  const before=await state(p);await p.evaluate(()=>window.Lingqi.showModal('journey'));
  await p.evaluate(()=>{const b=document.createElement('button');b.dataset.ui='journey-go';b.dataset.payload=JSON.stringify({id:'pill:qi0'});document.querySelector('.modal-body').appendChild(b);b.click();});
  const after=await state(p);assert.equal(after.pills.qi0,before.pills.qi0);assert.match(await p.locator('#toast').innerText(),/目标已更新/);await close(p);
 });
 await test('keyboard: dialogs contain Tab focus and restore the original settings button',async()=>{
  await p.locator('#open-settings').focus();await p.locator('#open-settings').click();
  assert(await p.evaluate(()=>document.querySelector('[role="dialog"]').contains(document.activeElement)));
  for(let i=0;i<18;i++){await p.keyboard.press('Tab');assert(await p.evaluate(()=>document.querySelector('[role="dialog"]').contains(document.activeElement)));}
  for(let i=0;i<18;i++){await p.keyboard.press('Shift+Tab');assert(await p.evaluate(()=>document.querySelector('[role="dialog"]').contains(document.activeElement)));}
  assert(await p.evaluate(()=>document.body.classList.contains('modal-open')&&document.getElementById('app').inert));
  await close(p);assert.equal(await p.evaluate(()=>document.activeElement.id),'open-settings');
  assert(await p.evaluate(()=>!document.body.classList.contains('modal-open')&&!document.getElementById('app').inert));
 });
 await test('journey: passive XP updates the visible goal without a reload',async()=>{
  const s=E.createState(Date.now());s.paths.magic.xp=E.modules.core.xpNeeded(s)-4;s.carryMs=2500;s.pills.qi0=0;
  await restore(p,s);assert.equal(await p.evaluate(()=>window.Lingqi.journey().primary.id),'cultivate');
  await p.waitForFunction(()=>window.Lingqi.journey().primary.id==='level-up',null,{timeout:6000});
  await p.waitForFunction(()=>document.querySelector('#journey-body').textContent.includes('可以晋级'),null,{timeout:3000});
 });
 await test('journey: tenth-layer materials link opens the real source and terminal guidance stays in six realms',async()=>{
  const s=fixture();s.paths.magic.layer=10;s.paths.magic.xp=E.modules.core.xpNeeded(s);s.progress.trialWins['magic:0']=true;s.materials.ore=0;
  await restore(p,s);assert.equal(await p.evaluate(()=>window.Lingqi.journey().primary.id),'material:ore');
  await p.locator('#journey-body [data-ui="journey-go"]').click();assert((await p.locator('#modal-layer').innerText()).includes(E.catalog.dungeons.resource_ore.name));await close(p);
  s.paths.magic.realm=5;s.paths.magic.xp=E.modules.core.xpNeeded(s);s.progress.endingTrials.magic=true;
  await restore(p,s);assert.equal(await p.evaluate(()=>window.Lingqi.journey().primary.id),'finale');
  await ui(p,'journey');await shot(p,'v31-mobile-terminal-goal.png');assert(!(await p.locator('#modal-layer').innerText()).includes('第七境'));await close(p);
 });
 const mid=await make({fixture:fixture()}),q=mid.p;
 await test('equipment: sorted whole-build comparisons and reviewed recommendations apply only after acceptance',async()=>{
  await q.evaluate(()=>window.Lingqi.showModal('equipment'));assert(await q.locator('.gear-gain').count()>0);
  await q.locator('#filter-gear-sort').selectOption('rarity');assert.equal(await q.locator('#filter-gear-sort').inputValue(),'rarity');
  await q.locator('#filter-gear-sort').selectOption('gain');
  const before=await state(q);await ui(q,'recommend');assert.deepEqual((await state(q)).equipped,before.equipped);
  assert(await q.locator('.equipment-delta').isVisible());assert(await q.locator('[data-action="autoEquip"]').isEnabled());
  await shot(q,'v31-mobile-recommendation.png');await q.locator('[data-action="autoEquip"]').click();
  const after=await state(q);assert(E.attributes(after).power>E.attributes(before).power);await close(q);await q.reload({waitUntil:'networkidle'});
  assert.deepEqual((await state(q)).equipped,after.equipped);await q.evaluate(()=>window.Lingqi.showModal('equipment'));await shot(q,'v31-mobile-equipment.png');await close(q);
 });
 await test('equipment: item protection refresh preserves dialog scroll and keyboard focus',async()=>{
  await q.evaluate(()=>window.Lingqi.showModal('equipment'));
  await q.evaluate(()=>document.querySelector('.modal-body').scrollTop=280);
  const btn=q.locator('[data-action="lockGear"]').nth(3);await btn.focus();
  const before=await q.evaluate(()=>document.querySelector('.modal-body').scrollTop);await btn.press('Enter');
  const after=await q.evaluate(()=>({scroll:document.querySelector('.modal-body').scrollTop,focus:document.activeElement.dataset.action}));
  assert(Math.abs(after.scroll-before)<=3,'scroll position survives re-render');assert.equal(after.focus,'lockGear');await close(q);
 });
 await test('recycling: preview shows exact count and refunds, cancellation changes nothing, confirmation persists',async()=>{
  await q.evaluate(()=>window.Lingqi.showModal('recycle'));
  const before=await state(q),preview=E.recyclePreview(before,2);assert(preview.count>0);
  await q.locator('[data-ui="recycle-preview"]').nth(2).click();assert.deepEqual((await state(q)).bag,before.bag);
  assert.match(await q.locator('[role="dialog"]').getAttribute('aria-label'),new RegExp(preview.count+'件'));
  await shot(q,'v31-mobile-recycle-preview.png');await close(q);assert.deepEqual((await state(q)).bag,before.bag);
  await q.evaluate(()=>window.Lingqi.showModal('recycle-preview',{maxRarity:2}));await q.locator('[data-action="bulkRecycle"]').click();
  const after=await state(q);assert.equal(before.bag.length-after.bag.length,preview.count);assert.equal(after.dust-before.dust,preview.rewards.dust);await close(q);
  await q.reload({waitUntil:'networkidle'});assert.deepEqual((await state(q)).bag,after.bag);
 });
 await test('saving: recommendation and recycling failure roll back all equipment, rewards and RNG',async()=>{
  await restore(q,fixture());await q.evaluate(()=>{window.Native={persistSave:()=>false};});
  await q.evaluate(()=>window.Lingqi.showModal('recommend'));let before=await state(q);
  await q.locator('[data-action="autoEquip"]').click();let after=await state(q);
  assert.deepEqual(after.equipped,before.equipped);assert.deepEqual(after.rngStreams,before.rngStreams);assert.equal(after.revision,before.revision);
  assert.equal(await q.locator('#save-state').innerText(),'未保存');await close(q);
  await q.evaluate(()=>window.Lingqi.showModal('recycle-preview',{maxRarity:2}));before=await state(q);
  await q.locator('[data-action="bulkRecycle"]').click();after=await state(q);
  assert.deepEqual(after.bag,before.bag);assert.equal(after.stones,before.stones);assert.equal(after.dust,before.dust);await close(q);
  await q.evaluate(()=>{window.Native.persistSave=()=>true;});await ui(q,'settings');await ui(q,'retry-save');assert.equal(await q.locator('#save-state').innerText(),'已保存');await close(q);
 });
 await test('combat: repeated rendering preserves focused targets and paused combat avoids DOM churn',async()=>{
  await restore(q,fixture());assert((await q.evaluate(()=>window.Lingqi.act('startDungeon',{id:'resource_herb'}))).ok);
  await q.locator('[data-action="targetEnemy"]').first().focus();await q.waitForTimeout(750);
  assert.equal(await q.evaluate(()=>document.activeElement.dataset.action),'targetEnemy');
  assert((await q.evaluate(()=>window.Lingqi.act('pauseBattle',{paused:true}))).ok);await q.waitForTimeout(400);
  await q.evaluate(()=>{window.lingqiMutations=0;window.lingqiObserver=new MutationObserver(xs=>window.lingqiMutations+=xs.length);window.lingqiObserver.observe(document.querySelector('#encounter-container'),{childList:true,subtree:true});});
  const before=await state(q);await q.waitForTimeout(850);const after=await state(q);
  assert.equal(after.battle.time,before.battle.time);assert.equal(await q.evaluate(()=>window.lingqiMutations),0);
  await q.evaluate(()=>{window.lingqiObserver.disconnect();window.Lingqi.act('leaveBattle');});
 });
 await test('saving: failed first save keeps the age gate and can be retried without phantom progress',async()=>{
  const f=await make({nativeFails:true});await f.p.locator('#accept-age').check();await ui(f.p,'enter');
  assert.equal(await state(f.p),null);assert.equal(await f.p.locator('.game-shell').count(),0);
  assert.equal(await f.p.evaluate(age=>localStorage.getItem(age),AGE),null);
  await f.p.evaluate(()=>window.Native.persistSave=()=>true);await ui(f.p,'enter');assert.equal((await state(f.p)).paths.magic.layer,1);await f.context.close();
 });
 await test('saving: existing valid progress still opens readably when boot persistence fails',async()=>{
  const f=await make({fixture:fixture(),nativeFails:true});assert(await f.p.locator('.game-shell').isVisible());
  assert.equal(await f.p.locator('#save-state').innerText(),'未保存');
  await f.p.locator('#save-state').click();assert.match(await f.p.locator('#modal-layer').innerText(),/最近保存失败/);await shot(f.p,'v31-mobile-save-recovery.png');await f.context.close();
 });
 await test('responsive: new goal, recommendation, comparison and recycle dialogs fit 320, 360, 412 and desktop',async()=>{
  for(const width of [320,360,412,1440]){
   const f=await make({fixture:fixture(),width,height:width===1440?900:740,reduced:width===320});
   await overflow(f.p);for(const name of ['journey','equipment','recommend','recycle-preview']){await f.p.evaluate(name=>window.Lingqi.showModal(name,name==='recycle-preview'?{maxRarity:2}:{}),name);await overflow(f.p);assert(await f.p.locator('[role="dialog"]').isVisible());await close(f.p);}
   if(width===1440)await shot(f.p,'v31-desktop-journey.png');await f.context.close();
  }
 });
 await test('performance: full 300-item bag gives a non-decreasing plan and a responsive sorted inventory',async()=>{
  const s=fixture(),Q=E.modules.economy;while(s.bag.length<300){const n=s.bag.length;Q.addGear(s,Q.createGear(s,{slot:Object.keys(E.catalog.slots)[n%6],set:Object.keys(E.catalog.sets)[Math.floor(n/6)%6],rarity:n%6,tier:0}));}
  const f=await make({fixture:s});const timing=await f.p.evaluate(()=>{const start=performance.now(),plan=window.IdleEngine.recommendEquipment(window.Lingqi.state()),recommendMs=performance.now()-start;window.Lingqi.showModal('equipment');return {recommendMs,inventoryMs:performance.now()-start-recommendMs,delta:plan.delta.power};});
  assert(timing.delta>=0);assert.equal(await f.p.locator('[data-action="lockGear"]').count(),300);await overflow(f.p);await f.context.close();return timing;
 });
 assert.equal(report.pageErrors.length,0,JSON.stringify(report.pageErrors));assert.equal(report.consoleErrors.length,0,JSON.stringify(report.consoleErrors));
 assert.equal(report.failedRequests.length,0,JSON.stringify(report.failedRequests));assert.equal(report.badResponses.length,0);assert.equal(report.externalRequests.length,0);
 await fresh.context.close();await mid.context.close();
 report.passed=report.tests.every(x=>x.passed);report.finishedAt=new Date().toISOString();
 fs.writeFileSync(path.join(DIST,'browser-v31-report.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify({passed:report.passed,tests:report.tests.length,failed:report.tests.filter(x=>!x.passed).map(x=>x.name),pageErrors:report.pageErrors,screenshots:report.screenshots}));
 if(!report.passed)process.exitCode=1;
})().catch(e=>{report.passed=false;report.fatal=e.stack;fs.writeFileSync(path.join(DIST,'browser-v31-report.json'),JSON.stringify(report,null,2));console.error(e);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();});
