'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const ROOT=path.resolve(process.env.LINGQI_ROOT||path.join(__dirname,'..'));
const BASE=process.env.LINGQI_URL||'http://127.0.0.1:8787/',OUT=path.join(ROOT,'dist');
const {chromium}=require(path.join(ROOT,'qa-tools/node_modules/playwright'));
const E=require('../web/engine.js'),Art=require('../web/scene-art.js'),Gallery=require('../web/art-collection.js');
const {terminalFixture,toReady}=require('./ascension-fixtures.cjs');
const {readyJourneyFixture}=require('./story-fixtures.cjs');
const NOW=1800000000000,KEY='lingqi-save-v2';
const report={startedAt:new Date().toISOString(),fixtureNotice:'Validated rank, supplies, affinity and chapter fixtures are explicitly supplied to exercise presentation and transactions. The immortal fixture uses public ceremony actions and a simulated real gate victory. UI choices, plans, failures, gallery navigation and reloads use application controls. These checks do not establish natural pacing or Android device performance.',tests:[],screenshots:[],pageErrors:[],consoleErrors:[],failedRequests:[],badResponses:[],externalRequests:[]};
let browser;
function fixture(){const s=E.createState(NOW);s.training=false;s.paths.magic={realm:5,layer:10,xp:0,reserve:0};s.progress.dungeonWins.resource_herb=1;s.stones=1000000;for(const id of Object.keys(s.materials))s.materials[id]=1000;return s;}
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
async function shot(p,name){const file='v46-'+name+'.png';await p.screenshot({path:path.join(OUT,file)});report.screenshots.push(file);}
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
 const revisions=fs.readdirSync(path.join(ROOT,'qa-tools/browsers')).filter(x=>x.startsWith('chromium_headless_shell-')).sort();
 browser=await chromium.launch({headless:true,executablePath:process.env.LINGQI_CHROMIUM||path.join(ROOT,'qa-tools/browsers',revisions.at(-1),'chrome-headless-shell-linux64/chrome-headless-shell'),args:['--no-sandbox','--disable-gpu'],env:{...process.env,FONTCONFIG_FILE:path.join(ROOT,'qa-tools/fonts.conf')}});
 await test('six home pages show distinct contextual paintings without covering the primary controls',()=>withPage(fixture(),async p=>{
  const seen=[];
  for(const page of ['cultivation','character','adventure','cave','fate','heaven']){
   await p.evaluate(id=>Lingqi.navigate(id),page);
   const node=p.locator('.page-hero-art');await node.waitFor();
   await p.waitForFunction(()=>!!document.querySelector('.page-hero-art')?.dataset.atlasFit);
   seen.push(await node.getAttribute('data-scene-file'));await fit(p);await shot(p,'home-'+page);
  }
  assert.equal(new Set(seen).size,6);return seen;
 }));
 await test('all eighteen encounters decode the correct isolated cell with actual cover geometry',()=>withPage(fixture(),async p=>{
  const positions=[];
  for(const id of Art.ids){
   await open(p,id);await p.waitForFunction(()=>!!document.querySelector('.event-scene')?.dataset.atlasFit);
   const drawn=await p.locator('.event-scene').evaluate(async node=>{
    const style=getComputedStyle(node),url=style.backgroundImage.slice(5,-2),image=new Image();image.src=url;await image.decode();
    return {file:node.dataset.sceneFile,crop:node.dataset.artCrop.split(',').map(Number),w:node.clientWidth,h:node.clientHeight,iw:image.naturalWidth,ih:image.naturalHeight,size:style.backgroundSize,position:style.backgroundPosition};
   });
   const art=Art.event(id);assert.equal(drawn.file,art.file);assert.deepEqual(drawn.crop,art.crop);
   const [x,y,w,h]=drawn.crop,scale=Math.max(drawn.w/(drawn.iw*w),drawn.h/(drawn.ih*h));
   const expectedX=-x*drawn.iw*scale+(drawn.w-drawn.iw*w*scale)/2;
   const expectedY=-y*drawn.ih*scale+(drawn.h-drawn.ih*h*scale)/2;
   const actual=drawn.position.split(' ').map(parseFloat);assert(Math.abs(actual[0]-expectedX)<.02);assert(Math.abs(actual[1]-expectedY)<.02);
   positions.push(drawn.file+':'+drawn.position);await shot(p,'encounter-'+id);
  }
  assert.equal(new Set(positions).size,18);return positions;
 }));
 await test('choosing, reviewing, cancelling and changing a route never writes a save or draws randomness',()=>withPage(fixture(),async p=>{
  const before=await state(p),disk=await p.evaluate(key=>localStorage.getItem(key),KEY);
  await open(p,'bridge_lantern');assert.equal(await p.locator('[data-action=resolveEncounter]').count(),0);
  for(const choice of ['resolve','compassion','insight']){
   await ui(p,'world-choice',q=>q.choice===choice);assert.equal(await p.locator('.world-choice-review').count(),1);assert.deepEqual(await state(p),before);assert.equal(await p.evaluate(key=>localStorage.getItem(key),KEY),disk);
   await ui(p,'world-event');
  }
  await p.keyboard.press('Escape');assert.deepEqual(await state(p),before);
 }));
 await test('a confirmed route persists once, survives reload and becomes a read-only illustrated journal',()=>withPage(fixture(),async p=>{
  const before=await state(p);await open(p,'bridge_lantern');await ui(p,'world-choice',q=>q.choice==='compassion');await shot(p,'choice-review');
  await action(p,'resolveEncounter');const saved=await state(p);assert.equal(saved.materials.herb,before.materials.herb-3);assert.equal(saved.wanderings.records.length,1);assert.deepEqual(saved.rngStreams,before.rngStreams);
  assert.equal(await p.locator('[data-action=resolveEncounter]').count(),0);assert.equal(await p.locator('[data-ui=world-choice]').count(),0);
  await p.reload({waitUntil:'networkidle'});assert.deepEqual((await state(p)).wanderings,saved.wanderings);await open(p,'bridge_lantern');assert.match(await p.locator('.journal-outcome').innerText(),/护生/);await shot(p,'event-journal');
 }));
 await test('a failed save retains the selected route, rolls back fees and allows exactly one retry',()=>withPage(fixture(),async p=>{
  await open(p,'bridge_lantern');await ui(p,'world-choice',q=>q.choice==='resolve');const before=await state(p);
  await p.evaluate(()=>window.__blockSave=true);await action(p,'resolveEncounter');assert.deepEqual(await state(p),before);assert.equal(await p.locator('.world-choice-review').count(),1);
  await p.evaluate(()=>window.__blockSave=false);await action(p,'resolveEncounter');assert.equal((await state(p)).wanderings.records.length,1);assert.equal((await state(p)).stones,before.stones-60);
 }));
 await test('an unaffordable route clearly disables commitment while the free route stays available',()=>{const s=fixture();s.stones=0;s.materials.herb=0;return withPage(s,async p=>{
  await open(p,'bridge_lantern');await ui(p,'world-choice',q=>q.choice==='compassion');assert(await p.locator('[data-action=resolveEncounter]').isDisabled());assert.match(await p.locator('.choice-shortage').last().innerText(),/材料不足/);
  await ui(p,'world-event');await ui(p,'world-choice',q=>q.choice==='insight');assert(await p.locator('[data-action=resolveEncounter]').isEnabled());await fit(p);
 });});
 await test('the world map exposes available counts and the next reachable encounter without overriding manual region choice',()=>withPage(fixture(),async p=>{
  await ui(p,'world');assert.equal(await p.locator('.world-next').count(),1);assert.match(await p.locator('.region-chip').first().innerText(),/可行 1/);
  await ui(p,'world-region',q=>q.realm===4);assert.match(await p.locator('.region-chip.active').innerText(),/星桥天隙/);await shot(p,'world-map');
  await p.locator('.world-next [data-ui=world-event]').click();assert.match(await p.locator('.event-scene-caption').innerText(),/雾桥借火/);
 }));
 await test('three companion records show new identity paintings and only actually completed shared stories',()=>{const s=fixture();readyJourneyFixture(s,'chapter_0','protect',NOW);assert(E.act(s,{type:'claimChapter',choice:'protect'},NOW).ok);return withPage(s,async p=>{
  const before=await state(p);
  for(const id of ['qinglan','yueheng','suyan']){await p.evaluate(id=>Lingqi.showModal('companion-record',{id}),id);assert.equal(await p.locator('[data-companion-record]').getAttribute('data-companion-record'),id);assert.equal(await p.locator('.companion-record-art').getAttribute('data-scene-file'),Art.companions[id].file);assert.deepEqual(await state(p),before);await shot(p,'companion-'+id);}
  await p.evaluate(()=>Lingqi.showModal('companion-record',{id:'qinglan'}));await ui(p,'story-memory',q=>q.episode==='chapter_0');assert.equal(await p.locator('[data-narrative=memory]').count(),1);assert.deepEqual(await state(p),before);
 });});
 await test('a fresh companion record offers an accessible story without inventing a memory or granting affinity',()=>withPage(fixture(),async p=>{
  const before=await state(p);await p.evaluate(()=>Lingqi.showModal('companion-record',{id:'qinglan'}));assert.equal(await p.locator('.companion-memory [data-ui=story-memory]').count(),0);await ui(p,'story-open');assert.equal(await p.locator('[data-story-stage=not-started]').count(),1);assert.deepEqual(await state(p),before);
 }));
 await test('the painting directory loads six thumbnails per page and jumps to any new sheet with keyboard-safe focus',()=>withPage(fixture(),async p=>{
  const before=await state(p);await p.evaluate(()=>Lingqi.showModal('art-collection'));await p.locator('.art-directory summary').click();assert.equal(await p.locator('.art-directory-item').count(),6);
  await ui(p,'art-directory-page',q=>q.page===4);assert.equal(await p.locator('.art-directory-item').count(),2);await shot(p,'art-directory');
  await ui(p,'art-collection-page',q=>q.index===25);assert.equal(await p.locator('[data-art-collection]').getAttribute('data-art-collection'),'painting_25');assert.equal(await p.evaluate(()=>document.activeElement===document.querySelector('.art-collection h3')),true);
  assert.equal(await p.locator('.art-directory-item[aria-current=true]').count(),1);assert.deepEqual(await state(p),before);await shot(p,'new-painting');
 }));
 await test('the celestial plan charges its exact displayed total and settles the minimum whole rounds once',()=>withPage(immortal(),async p=>{
  const before=await state(p);await p.evaluate(()=>Lingqi.openAscension());assert.match(await p.locator('.celestial-plan').innerText(),/3 周天/);
  await p.locator('.celestial-plan [data-action=celestialMeditate]').click();const after=await state(p);assert.equal(after.stones,before.stones-9000);assert.equal(after.materials.essence,before.materials.essence-6);assert.equal(after.ascension.xp,480);assert.equal(after.ascension.reserve,180);assert.equal(after.ascension.meditations,3);
  await shot(p,'planned-meditation-result');await ui(p,'close');assert.equal(await p.locator('.celestial-plan').count(),0);assert(await p.locator('[data-action=advanceCelestial]:enabled').count());
 }));
 await test('a failed batch save rolls back every round and a retry settles the advertised total',()=>withPage(immortal(),async p=>{
  await p.evaluate(()=>Lingqi.openAscension());const before=await state(p);await p.evaluate(()=>window.__blockSave=true);await p.locator('.celestial-plan [data-action=celestialMeditate]').click();assert.deepEqual(await state(p),before);
  await p.evaluate(()=>window.__blockSave=false);await p.locator('.celestial-plan [data-action=celestialMeditate]').click();assert.equal((await state(p)).ascension.meditations,3);
 }));
 await test('a missing-material plan disables the batch and leads directly to its actual source',()=>{const s=immortal();s.materials.essence=0;return withPage(s,async p=>{
  await p.evaluate(()=>Lingqi.openAscension());assert(await p.locator('.celestial-plan [data-action=celestialMeditate]').isDisabled());assert((await p.locator('.celestial-plan').innerText()).includes(E.catalog.materials.essence.name));await shot(p,'missing-plan-material');await ui(p,'ascension-source',q=>q.id==='essence');assert((await p.locator('#modal-layer [role=dialog]').getAttribute('aria-label')).includes(E.catalog.dungeons.resource_essence.name));
 });});
 for(const viewport of [{width:320,height:480},{width:390,height:844},{width:844,height:390},{width:1280,height:800}]){
  const label=viewport.width+'x'+viewport.height;
  await test('illustrated encounter, review, companion and gallery fit '+label,()=>withPage(fixture(),async p=>{
   await open(p,'furnace_seal');await fit(p);await shot(p,'event-'+label);await open(p,'bridge_lantern');await ui(p,'world-choice',q=>q.choice==='insight');await fit(p);await shot(p,'review-'+label);
   await p.evaluate(()=>Lingqi.showModal('companion-record',{id:'yueheng'}));await fit(p);await shot(p,'record-'+label);await p.evaluate(()=>Lingqi.showModal('art-collection',{index:25,directory:true}));await fit(p);await shot(p,'gallery-'+label);
   await p.keyboard.press('Tab');assert(await p.evaluate(()=>!!document.activeElement?.closest('#modal-layer')));await p.keyboard.press('Escape');assert.equal(await p.locator('#modal-layer [role=dialog]').count(),0);
  },viewport));
  await test('celestial planning keeps fixed actions reachable at '+label,()=>withPage(immortal(),async p=>{
   await p.evaluate(()=>Lingqi.openAscension());await fit(p);const footer=await p.locator('.ascension-footer').boundingBox();assert(footer.y>=0&&footer.y+footer.height<=viewport.height+1);for(const button of await p.locator('.ascension-footer button').all()){const b=await button.boundingBox();assert(b.width>=44&&b.height>=40);}await shot(p,'celestial-'+label);await p.locator('.celestial-plan [data-action=celestialMeditate]').click();assert.equal((await state(p)).ascension.meditations,3);
  },viewport));
 }
 await test('new scenes do not continuously mutate layout while idle and normal scenarios have no browser or network errors',()=>withPage(fixture(),async p=>{
  await open(p,'bridge_lantern');await p.waitForFunction(()=>!!document.querySelector('.event-scene')?.dataset.atlasFit);
  const count=await p.evaluate(()=>new Promise(resolve=>{let n=0;const observer=new MutationObserver(records=>n+=records.length);observer.observe(document.querySelector('.event-scene'),{attributes:true,subtree:true,childList:true});setTimeout(()=>{observer.disconnect();resolve(n);},400);}));assert.equal(count,0);
  for(const key of ['pageErrors','consoleErrors','failedRequests','badResponses','externalRequests'])assert.deepEqual(report[key],[],key);return {idleMutations:count};
 }));
})().catch(e=>{report.fatal=e.stack;console.error(e);}).finally(async()=>{
 if(browser)await browser.close();report.finishedAt=new Date().toISOString();report.partial=!!process.env.LINGQI_BROWSER_FILTER;report.passed=!report.fatal&&report.tests.length>0&&report.tests.every(t=>t.passed);
 fs.writeFileSync(path.join(OUT,'browser-v46-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,tests:report.tests.length,failed:report.tests.filter(t=>!t.passed).map(t=>t.name),screenshots:report.screenshots.length}));if(!report.passed)process.exitCode=1;
});
