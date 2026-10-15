'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const ROOT=process.env.LINGQI_ROOT||path.resolve(__dirname,'..'),BASE=process.env.LINGQI_URL||'http://127.0.0.1:8787/';
const {chromium}=require(path.join(ROOT,'qa-tools/node_modules/playwright')),E=require('../web/engine.js');
const DIST=path.join(ROOT,'dist'),KEY='lingqi-save-v2',AGE='lingqi-age-confirmed';
const installed=process.env.LINGQI_CHROMIUM?[]:fs.readdirSync(path.join(ROOT,'qa-tools/browsers')).filter(x=>x.startsWith('chromium_headless_shell-')).sort();
const executable=process.env.LINGQI_CHROMIUM||path.join(ROOT,'qa-tools/browsers',installed.pop(),'chrome-headless-shell-linux64/chrome-headless-shell');
const report={startedAt:new Date().toISOString(),url:BASE,tests:[],screenshots:[],pageErrors:[],consoleErrors:[],failedRequests:[],badResponses:[],externalRequests:[],fixtureNotice:'New feature integration uses validated fixtures for event eligibility and supplies. Existing V3 new-account gameplay and V3.2 legal action simulations are separate; these fixtures do not establish long-term balance or physical-device performance.'};
let browser;
function fixture(rank=7){const s=E.createState(Date.now());s.training=false;s.paths.magic={realm:Math.floor(rank/10),layer:rank%10+1,xp:0,reserve:0};s.progress.dungeonWins.resource_herb=1;s.stones=3000;s.materials.herb=100;return s;}
async function make({width=390,height=844,seed=fixture(),reduced=false}={}){
 const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:reduced?'reduce':'no-preference'}),p=await context.newPage();
 p.on('pageerror',e=>report.pageErrors.push(e.message));p.on('console',m=>{if(m.type()==='error')report.consoleErrors.push(m.text());});
 p.on('requestfailed',r=>report.failedRequests.push({url:r.url(),error:r.failure()?.errorText}));p.on('response',r=>{if(r.status()>=400)report.badResponses.push({url:r.url(),status:r.status()});});
 p.on('request',r=>{if(!r.url().startsWith(BASE)&&!/^(data:|blob:)/.test(r.url()))report.externalRequests.push(r.url());});
 if(seed){const v=E.validate(seed);assert(v.ok,v.error);await context.addInitScript(({raw,key,age})=>{if(!localStorage.getItem(key)){localStorage.setItem(key,raw);localStorage.setItem(age,'yes');}},{raw:JSON.stringify(v.state),key:KEY,age:AGE});}
 await p.goto(BASE,{waitUntil:'networkidle'});return {p,context};
}
async function test(name,fn){const at=Date.now();try{const details=await fn();report.tests.push({name,passed:true,durationMs:Date.now()-at,details});console.log('PASS '+name);}catch(e){report.tests.push({name,passed:false,durationMs:Date.now()-at,error:e.stack});console.error('FAIL '+name+': '+e.message);}}
const state=p=>p.evaluate(()=>window.Lingqi.state());
async function close(p){if(await p.locator('#modal-layer [role="dialog"]').isVisible())await p.keyboard.press('Escape');}
async function ui(p,id){const modal=p.locator('#modal-layer [role="dialog"]'),scope=await modal.isVisible()?modal:p.locator('#app');await scope.locator('[data-ui="'+id+'"]:visible').first().click();}
async function shot(p,name){await p.waitForTimeout(260);await p.evaluate(()=>{document.getElementById('toast').hidden=true;window.scrollTo({top:0,behavior:'instant'});});await p.screenshot({path:path.join(DIST,name),fullPage:false});report.screenshots.push(name);}
async function restore(p,s){s.lastAt=Date.now();assert(await p.evaluate(raw=>window.Lingqi.import(raw),JSON.stringify(s)));await close(p);}
async function overflow(p){assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1&&document.body.scrollWidth<=innerWidth+1),'viewport overflow');}
async function resolve(p,id,choice){await p.evaluate(id=>window.Lingqi.showModal('world-event',{id}),id);
 const buttons=p.locator('[data-action="resolveEncounter"]');let chosen=false;for(let i=0;i<await buttons.count();i++)if((await buttons.nth(i).evaluate(el=>JSON.parse(el.dataset.payload).choice))===choice){await buttons.nth(i).click();chosen=true;break;}assert(chosen);}
(async()=>{
 fs.mkdirSync(DIST,{recursive:true});browser=await chromium.launch({headless:true,executablePath:executable,args:['--no-sandbox','--disable-gpu'],env:{...process.env,FONTCONFIG_FILE:path.join(ROOT,'qa-tools/fonts.conf')}});report.browser=await browser.version();
 const f=await make(),p=f.p;
 await test('world: six regions and real progression gates render as a navigable map',async()=>{
  await ui(p,'world');assert.equal(await p.locator('.region-chip').count(),6);assert.equal(await p.locator('.world-event').count(),3);
  assert.match(await p.locator('#page-content').innerText(),/雾桥借火/);await overflow(p);await shot(p,'v32-mobile-world.png');
  await p.locator('[data-ui="world-region"]').nth(5).click();assert.match(await p.locator('#page-content').innerText(),/长明凌渊/);assert.match(await p.locator('#page-content').innerText(),/需要当前主修/);
  await ui(p,'world-event');assert.equal(await p.locator('[data-action="resolveEncounter"]:enabled').count(),0);await close(p);
 });
 await test('world: closing an unresolved choice changes no rewards, record or random stream',async()=>{
  const before=await state(p);await p.evaluate(()=>window.Lingqi.showModal('world-event',{id:'bridge_lantern'}));
  assert.equal(await p.locator('.encounter-choice').count(),3);assert.match(await p.locator('#modal-layer').innerText(),/无消耗/);await shot(p,'v32-mobile-event.png');
  await close(p);const after=await state(p);assert.deepEqual(after.wanderings,before.wanderings);assert.equal(after.stones,before.stones);assert.deepEqual(after.materials,before.materials);assert.deepEqual(after.rngStreams,before.rngStreams);
 });
 await test('world: resolving a free choice grants a single mark and persists across reload',async()=>{
  const before=await state(p);await resolve(p,'bridge_lantern','insight');const after=await state(p);
  assert.equal(after.wanderings.records.length,1);assert.equal(after.materials.insight-before.materials.insight,3);
  assert.equal(await p.locator('[data-action="resolveEncounter"]').count(),0);assert.match(await p.locator('.journal-outcome').innerText(),/求真/);
  await close(p);await p.reload({waitUntil:'networkidle'});assert.deepEqual((await state(p)).wanderings,after.wanderings);
 });
 await test('dao: changing stance preserves choices and the displayed combat attributes follow actual bonuses',async()=>{
  await resolve(p,'village_well','compassion');await close(p);await p.evaluate(()=>window.Lingqi.showModal('dao'));
  const before=await state(p);const selector='[data-action="setDaoStance"][data-payload=\'{"id":"compassion"}\']';await p.locator(selector).click();
  const after=await state(p);assert.equal(after.wanderings.stance,'compassion');assert.deepEqual(after.wanderings.records,before.wanderings.records);
  assert(E.attributes(after).maxHp>E.attributes(before).maxHp);assert.match(await p.locator('.dao-path.active').innerText(),/护生/);await shot(p,'v32-mobile-dao.png');await close(p);
 });
 await test('journal: written outcomes can be revisited without repeating rewards',async()=>{
  await p.evaluate(()=>window.Lingqi.showModal('world-journal'));assert.equal(await p.locator('.journal-entry').count(),2);await shot(p,'v32-mobile-journal.png');
  const before=await state(p);await ui(p,'world-event');assert.equal(await p.locator('[data-action="resolveEncounter"]').count(),0);const after=await state(p);assert.equal(after.stones,before.stones);assert.deepEqual(after.wanderings,before.wanderings);await close(p);
 });
 await test('preparation: four real response roles, consumables and dao are visible before a challenge',async()=>{
  await p.evaluate(()=>window.Lingqi.showModal('dungeon',{id:'resource_herb'}));assert.equal(await p.locator('.preparation-roles > div').count(),4);assert.match(await p.locator('.preparation-panel').innerText(),/护生/);assert.match(await p.locator('.preparation-panel').innerText(),/回春/);
  assert(!(await p.locator('#modal-layer').innerText()).includes('resource_herb'));await shot(p,'v32-mobile-preparation.png');await ui(p,'loadout');assert(await p.locator('[role="dialog"]').isVisible());await close(p);
 });
 await test('saving: failed event and stance saves restore all rewards, marks, resources and revision',async()=>{
  await restore(p,fixture());await p.evaluate(()=>{window.Native={persistSave:()=>false};});
  const before=await state(p);await resolve(p,'bridge_lantern','compassion');let after=await state(p);assert.deepEqual(after.wanderings,before.wanderings);assert.deepEqual(after.materials,before.materials);assert.equal(after.stones,before.stones);assert.equal(after.revision,before.revision);assert.deepEqual(after.rngStreams,before.rngStreams);
  await close(p);await p.evaluate(()=>window.Lingqi.showModal('dao'));await p.locator('[data-action="setDaoStance"][data-payload=\'{"id":"resolve"}\']').click();after=await state(p);assert.deepEqual(after.wanderings,before.wanderings);await close(p);
  await p.evaluate(()=>window.Native.persistSave=()=>true);await resolve(p,'bridge_lantern','compassion');assert.equal((await state(p)).wanderings.records.length,1);await close(p);
 });
 await test('journey: an available encounter is discoverable while immediate growth remains primary',async()=>{
  await restore(p,fixture());const goals=await p.evaluate(()=>window.Lingqi.journey());assert(goals.goals.some(x=>x.id==='world:bridge_lantern'));assert.notEqual(goals.primary.id,'world:bridge_lantern');
  await p.evaluate(()=>window.Lingqi.showModal('journey'));const buttons=p.locator('[data-ui="journey-go"]');for(let i=0;i<await buttons.count();i++){const b=buttons.nth(i);if((await b.evaluate(x=>JSON.parse(x.dataset.payload).id))==='world:bridge_lantern'){await b.click();break;}}
  assert.match(await p.locator('[role="dialog"]').getAttribute('aria-label'),/雾桥借火/);await close(p);
 });
 await test('combat: dao controls are disabled and backend rejects changes while a fight is active',async()=>{
  assert((await p.evaluate(()=>window.Lingqi.act('startDungeon',{id:'resource_herb'}))).ok);await p.evaluate(()=>window.Lingqi.showModal('dao'));
  assert.equal(await p.locator('[data-action="setDaoStance"]:enabled').count(),0);const before=await state(p);assert.equal((await p.evaluate(()=>window.Lingqi.act('setDaoStance',{id:'resolve'}))).ok,false);assert.deepEqual((await state(p)).wanderings,before.wanderings);await close(p);await p.evaluate(()=>window.Lingqi.act('leaveBattle'));
 });
 await test('compatibility: existing V3 backups without the extension remain valid and malformed history cannot replace them',async()=>{
  const legacy=fixture();delete legacy.wanderings;await restore(p,legacy);assert.deepEqual((await state(p)).wanderings,{stance:'insight',records:[]});
  const before=await state(p),bad=structuredClone(before);bad.wanderings.records=[{id:'none',choice:'resolve',route:'magic',rank:7,at:Date.now()}];
  assert.equal(await p.evaluate(raw=>window.Lingqi.import(raw),JSON.stringify(bad)),false);assert.deepEqual((await state(p)).wanderings,before.wanderings);
 });
 await test('responsive: phone, tablet and desktop layouts keep controls in bounds and dialogs keyboard accessible',async()=>{
  for(const width of [320,360,390,768,1024,1440]){
   const g=await make({width,height:width>=1000?900:780,reduced:width===320});await overflow(g.p);
   const desktop=await g.p.locator('.realm-sidebar').isVisible();assert.equal(desktop,width>=1000);
   const nav=await g.p.locator('.nav-bottom').boundingBox();assert(nav&&nav.x>=0&&nav.x+nav.width<=width+1);
   await ui(g.p,'world');await overflow(g.p);await g.p.evaluate(()=>window.Lingqi.showModal('world-event',{id:'bridge_lantern'}));await overflow(g.p);
   for(let i=0;i<10;i++){await g.p.keyboard.press('Tab');assert(await g.p.evaluate(()=>document.querySelector('[role="dialog"]').contains(document.activeElement)));}
   await close(g.p);if(width===1440){await shot(g.p,'v32-desktop-world.png');await g.p.locator('[data-page="cultivation"]').click();await shot(g.p,'v32-desktop-home.png');}
   if(width===320)await shot(g.p,'v32-small-world-reduced.png');await g.context.close();
  }
 });
 await test('fresh: a new player sees the new world feature without opening locked content or skipping age confirmation',async()=>{
  const g=await make({seed:null,width:360,height:740});assert(await g.p.locator('#accept-age').isVisible());await g.p.locator('#accept-age').check();await ui(g.p,'enter');
  assert.equal((await state(g.p)).paths.magic.layer,1);await ui(g.p,'world');await ui(g.p,'world-event');assert.equal(await g.p.locator('[data-action="resolveEncounter"]:enabled').count(),0);assert.match(await g.p.locator('#modal-layer').innerText(),/需要当前主修/);await g.context.close();
 });
 await test('world: the sixth region and complete journal remain readable with all eighteen choices saved',async()=>{
  const s=fixture(59);for(const e of E.catalog.worldEvents){const r=E.act(s,{type:'resolveEncounter',id:e.id,choice:'insight'},s.lastAt);assert(r.ok,r.message);}
  await restore(p,s);await ui(p,'world');assert.match(await p.locator('#page-content').innerText(),/长明凌渊/);assert.equal(await p.locator('.world-event.completed').count(),3);await p.evaluate(()=>window.Lingqi.showModal('world-journal'));assert.equal(await p.locator('.journal-entry').count(),18);await overflow(p);await close(p);
 });
 for(const key of ['pageErrors','consoleErrors','failedRequests','badResponses','externalRequests'])assert.equal(report[key].length,0,JSON.stringify(report[key]));
 await f.context.close();report.passed=report.tests.every(x=>x.passed);report.finishedAt=new Date().toISOString();fs.writeFileSync(path.join(DIST,'browser-v32-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,tests:report.tests.length,failed:report.tests.filter(x=>!x.passed).map(x=>x.name),screenshots:report.screenshots}));if(!report.passed)process.exitCode=1;
})().catch(e=>{report.passed=false;report.fatal=e.stack;fs.writeFileSync(path.join(DIST,'browser-v32-report.json'),JSON.stringify(report,null,2));console.error(e);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();});
