'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const ROOT=path.resolve(process.env.LINGQI_ROOT||path.join(__dirname,'..'));
const {pathToFileURL}=require('node:url'),{chromium}=require(path.join(ROOT,'qa-tools/node_modules/playwright'));
const SERIES=JSON.parse(fs.readFileSync(path.join(ROOT,'package.json'),'utf8')).version.split('.').slice(0,2).join('.');
const file=process.env.LINGQI_PREVIEW_HTML||path.join(ROOT,'dist/wendao-lingqi-v'+SERIES+'-preview.html');
const revisions=process.env.LINGQI_CHROMIUM?[]:fs.readdirSync(path.join(ROOT,'qa-tools/browsers')).filter(x=>x.startsWith('chromium_headless_shell-')).sort();
const executablePath=process.env.LINGQI_CHROMIUM||path.join(ROOT,'qa-tools/browsers',revisions.pop(),'chrome-headless-shell-linux64/chrome-headless-shell');
const report={startedAt:new Date().toISOString(),file:path.basename(file),tests:[],pageErrors:[],consoleErrors:[],failedRequests:[],externalRequests:[]};let browser;
async function test(name,fn){try{await fn();report.tests.push({name,passed:true});console.log('PASS '+name);}catch(e){report.tests.push({name,passed:false,error:e.stack});console.error('FAIL '+name+': '+e.message);}}
(async()=>{
 assert(fs.existsSync(file));browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox','--disable-gpu']});
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});const p=await context.newPage();
 p.on('pageerror',e=>report.pageErrors.push(e.message));p.on('console',m=>{if(m.type()==='error')report.consoleErrors.push(m.text());});
 p.on('requestfailed',r=>report.failedRequests.push({url:r.url(),error:r.failure()?.errorText}));
 p.on('request',r=>{if(/^https?:/.test(r.url()))report.externalRequests.push(r.url());});
 await p.goto(pathToFileURL(file).href+'?preview=1',{waitUntil:'networkidle',timeout:90000});
 if(await p.locator('#accept-age').isVisible()){
  await p.locator('#accept-age').check();await p.locator('[data-ui="enter"]').click();
 }
 await p.waitForFunction(()=>!!window.Lingqi.state());
 await test('offline HTML boots its independent playable preview with all media embedded',async()=>{
  assert(await p.evaluate(()=>!!window.Lingqi.state()));assert.equal(await p.locator('.nav-bottom button').count(),6);
  assert(await p.evaluate(()=>window.Lingqi.state().version===3));
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
 });
 await test('offline world choice commits once and the journal survives file reload',async()=>{
  const id=await p.evaluate(()=>window.Lingqi.world().events.find(x=>x.available)?.id);assert(id,'preview has an eligible encounter');
  await p.evaluate(id=>window.Lingqi.showModal('world-event',{id}),id);
  const choices=p.locator('[data-ui="world-choice"]');for(let i=0;i<await choices.count();i++)if(await choices.nth(i).evaluate(b=>JSON.parse(b.dataset.payload).choice==='insight')){await choices.nth(i).click();break;}
  const buttons=p.locator('[data-action="resolveEncounter"]');let hit=false;
  for(let i=0;i<await buttons.count();i++)if(await buttons.nth(i).evaluate(b=>JSON.parse(b.dataset.payload).choice==='insight')){await buttons.nth(i).click();hit=true;break;}
  assert(hit);const before=await p.evaluate(()=>window.Lingqi.state().wanderings);
  assert(before.records.some(x=>x.id===id));assert.equal(await p.locator('[data-action="resolveEncounter"]').count(),0);
  await p.reload({waitUntil:'networkidle',timeout:90000});assert.deepEqual(await p.evaluate(()=>window.Lingqi.state().wanderings),before);
 });
 if(await p.evaluate(()=>!!window.Lingqi.state().production)){
  await test('offline actual crafting records the exact recipe and preserves it after file reload',async()=>{
   const before=await p.evaluate(()=>window.Lingqi.state().production.pills.heal0?.batches||0);
   await p.evaluate(()=>window.Lingqi.showModal('alchemy'));
   const buttons=p.locator('[data-action="craftPill"]');let found=false;
   for(let i=0;i<await buttons.count();i++)if(await buttons.nth(i).evaluate(b=>JSON.parse(b.dataset.payload).id==='heal0')){await buttons.nth(i).click();found=true;break;}
   assert(found);assert.equal(await p.evaluate(()=>window.Lingqi.state().production.pills.heal0.batches),before+1);
   await p.reload({waitUntil:'networkidle',timeout:90000});assert.equal(await p.evaluate(()=>window.Lingqi.state().production.pills.heal0.batches),before+1);
  });
  await test('offline read-only full replay works with an explicitly supplied legacy completion and no external assets',async()=>{
   report.replayFixtureNotice='This case imports a validated supplied legacy completion solely to verify bundled replay UI; it is not evidence of naturally completing a chapter.';
   await p.evaluate(()=>{const now=Date.now();Date.now=()=>now;const s=window.Lingqi.state();s.training=false;s.lastAt=now;s.story={chapter:1,mercy:1,truth:0,ending:null,completed:[0],sideCompleted:[],journeys:{}};if(!window.Lingqi.import(JSON.stringify(s)))throw Error('Legacy replay fixture failed validation');window.Lingqi.navigate('fate');});
   await p.locator('details.compact-details summary').filter({hasText:'仙途档案'}).click();
   const before=await p.evaluate(()=>window.Lingqi.state());
   const buttons=p.locator('[data-ui="story-memory"]');await buttons.first().click();await p.waitForSelector('[data-narrative="memory"]');
   assert.match(await p.locator('.memory-notice').innerText(),/旧记录未保留抉择/);assert.equal(await p.locator('[data-narrative="memory"] [data-action]').count(),0);assert(await p.locator('.memory-paragraph').count()>2);
   await p.locator('.memory-sections button').nth(1).click();assert.equal(await p.locator('.memory-screen').getAttribute('data-memory-section'),'clues');assert.deepEqual(await p.evaluate(()=>window.Lingqi.state()),before);
  });
 }
 if(await p.evaluate(()=>!!window.IdleEngine.modules.investigation)){
  await test('offline evidence judgment uses the bundled rules, commits a real selection and survives file reload',async()=>{
   report.proofFixtureNotice='A validated high-rank first-volume mission with an explicitly supplied prior non-practice source win is imported to test bundled proof controls and file persistence; this is not evidence of natural combat progression.';
   const E=require(path.join(ROOT,'web/engine.js')),helpers=require('./story-fixtures.cjs'),now=Date.now(),s=E.createState(now);s.training=false;s.paths.magic={realm:5,layer:10,xp:0,reserve:0};s.progress.dungeonWins.resource_herb=1;helpers.toMission(s,'chapter_0','seek',now);
   await p.evaluate(s=>{if(!Lingqi.import(JSON.stringify(s)))throw Error('Proof fixture rejected');Lingqi.openStory('chapter_0');},s);
   async function press(attr,name,predicate=()=>true){const scope=await p.locator('#modal-layer [role=dialog]').count()?'#modal-layer ':'';const bs=p.locator(scope+'button['+attr+'="'+name+'"]');for(let i=0;i<await bs.count();i++){const b=bs.nth(i),data=JSON.parse(await b.getAttribute('data-payload')||'{}');if(predicate(data)&&await b.isVisible()&&await b.isEnabled()){await b.click();return;}}throw Error('Missing offline proof control '+name);}
   await press('data-ui','story-mission');await press('data-action','beginInvestigation');for(const evidence of ['warm_shard','bent_herbs'])await press('data-action','selectEvidence',q=>q.evidence===evidence);await press('data-action','submitInvestigation',q=>q.hypothesis==='siphon');assert.match(await p.locator('.proof-result').innerText(),/流向证清/);assert.equal(await p.evaluate(()=>Lingqi.state().investigations.bell_flow.status),'resolved');
   await p.reload({waitUntil:'networkidle',timeout:90000});assert.equal(await p.evaluate(()=>Lingqi.state().investigations.bell_flow.status),'resolved');
  });
 }
 if(await p.evaluate(()=>!!window.IdleEngine.modules.formation)){
  await test('offline formation keeps partial directions, resumes after reload and verifies only through actual controls',async()=>{
   report.formationFixtureNotice='A validated high-rank protection mission with a supplied prior formal resource win verifies bundled graph rules, actual rotation controls and file persistence. It is not a natural-pacing claim.';
   const E=require(path.join(ROOT,'web/engine.js')),helpers=require('./story-fixtures.cjs'),now=Date.now(),s=E.createState(now);s.training=false;s.paths.magic={realm:5,layer:10,xp:0,reserve:0};s.progress.dungeonWins.resource_herb=1;helpers.toMission(s,'chapter_0','protect',now);
   await p.evaluate(s=>{if(!Lingqi.import(JSON.stringify(s)))throw Error('Formation fixture rejected');Lingqi.openStory('chapter_0');},s);
   async function press(attr,name,predicate=()=>true){const scope=await p.locator('#modal-layer [role=dialog]').count()?'#modal-layer ':'';const bs=p.locator(scope+'button['+attr+'="'+name+'"]');for(let i=0;i<await bs.count();i++){const b=bs.nth(i),data=JSON.parse(await b.getAttribute('data-payload')||'{}');if(predicate(data)&&await b.isVisible()&&await b.isEnabled()){await b.click();return;}}throw Error('Missing offline formation control '+name);}
   await press('data-ui','story-mission');await press('data-action','beginFormation');await press('data-action','turnFormation',q=>q.tile===3&&q.step===1);const partial=await p.evaluate(()=>Lingqi.state().formations.village_lamp);
   await p.reload({waitUntil:'networkidle',timeout:90000});await p.evaluate(()=>Lingqi.openStory('chapter_0'));await press('data-ui','story-mission');assert.deepEqual(await p.evaluate(()=>Lingqi.state().formations.village_lamp),partial);
   const c=E.modules.formation.catalog.village_lamp;for(let tile=0;tile<9;tile++)if(c.tiles[tile])while(await p.evaluate(tile=>Lingqi.state().formations.village_lamp.rotations[tile],tile))await press('data-action','turnFormation',q=>q.tile===tile&&q.step===1);
   assert.equal(await p.evaluate(()=>Lingqi.state().formations.village_lamp.status),'working');await press('data-action','testFormation');assert.equal(await p.evaluate(()=>Lingqi.state().formations.village_lamp.status),'resolved');assert.match(await p.locator('.formation-result').innerText(),/回村的路也没有封死/);
   await p.screenshot({path:path.join(ROOT,'dist/v45-offline-formation.png')});report.screenshots=['v45-offline-formation.png'];
   await p.reload({waitUntil:'networkidle',timeout:90000});assert.equal(await p.evaluate(()=>Lingqi.state().formations.village_lamp.status),'resolved');
  });
  await test('all four new art PNGs decode from file-local embedded blobs with exact source bytes',async()=>{
   const records=require(path.join(ROOT,'docs/art/V4_5_GENERATED_ASSETS.json')),collection=require(path.join(ROOT,'web/art-collection.js'));
   for(let index=13;index<17;index++){
    await p.evaluate(index=>Lingqi.showModal('art-collection',{index}),index);
    const art=await p.locator('.art-collection-painting').evaluate(async e=>{const url=getComputedStyle(e).backgroundImage.slice(5,-2),im=new Image();im.src=url;await im.decode();const bytes=await(await fetch(url)).arrayBuffer(),hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(n=>n.toString(16).padStart(2,'0')).join('');return {url,w:im.naturalWidth,h:im.naturalHeight,sha256:hash};});
    const expected=records.files['web/assets/'+collection.records[index].file];assert(art.url.startsWith('blob:'));assert.equal(art.w,expected.width);assert.equal(art.h,expected.height);assert.equal(art.sha256,expected.sha256);
   }
   await p.screenshot({path:path.join(ROOT,'dist/v45-offline-art.png')});report.screenshots.push('v45-offline-art.png');
  });
 }
 if(await p.evaluate(()=>!!window.WendaoCompanionRecords)){
  await test('all nine V4.6 originals decode from embedded file blobs with source SHA256',async()=>{
   const manifest=require(path.join(ROOT,'docs/art/V4_6_GENERATED_ASSETS.json')),collection=require(path.join(ROOT,'web/art-collection.js'));
   for(let index=17;index<26;index++){
    await p.evaluate(index=>Lingqi.showModal('art-collection',{index}),index);
    const actual=await p.locator('.art-collection-painting').evaluate(async node=>{const url=getComputedStyle(node).backgroundImage.slice(5,-2),image=new Image();image.src=url;await image.decode();const bytes=await(await fetch(url)).arrayBuffer(),sha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(n=>n.toString(16).padStart(2,'0')).join('');return {url,width:image.naturalWidth,height:image.naturalHeight,sha256};});
    const expected=manifest.files['web/assets/'+collection.records[index].file];assert(actual.url.startsWith('blob:'));assert.equal(actual.width,expected.width);assert.equal(actual.height,expected.height);assert.equal(actual.sha256,expected.sha256);
   }
   await p.screenshot({path:path.join(ROOT,'dist/v46-offline-painting.png')});report.screenshots.push('v46-offline-painting.png');
  });
  await test('file-local companion record and eighteen encounter crops render their actual embedded sheets',async()=>{
   const E=require(path.join(ROOT,'web/engine.js')),s=E.createState(Date.now());s.training=false;s.paths.magic={realm:5,layer:10,xp:0,reserve:0};s.progress.dungeonWins.resource_herb=1;
   await p.evaluate(s=>{if(!Lingqi.import(JSON.stringify(s)))throw Error('Review fixture rejected');},s);
   for(const id of require(path.join(ROOT,'web/scene-art.js')).ids){await p.evaluate(id=>Lingqi.showModal('world-event',{id}),id);await p.waitForFunction(()=>!!document.querySelector('.event-scene')?.dataset.atlasFit);assert((await p.locator('.event-scene').evaluate(n=>getComputedStyle(n).backgroundImage)).includes('blob:'));}
   await p.evaluate(()=>Lingqi.showModal('companion-record',{id:'suyan'}));assert.equal(await p.locator('[data-companion-record=suyan]').count(),1);await p.waitForFunction(()=>!!document.querySelector('.companion-record-art')?.dataset.atlasFit);await p.screenshot({path:path.join(ROOT,'dist/v46-offline-record.png')});report.screenshots.push('v46-offline-record.png');
  });
 }
 if(await p.evaluate(()=>!!window.WendaoStoryFocus&&!!window.WendaoBattleGuidance)){
  await test('offline flow guidance opens the affordable recipe and real saved story target without changing progress',async()=>{
   const E=require(path.join(ROOT,'web/engine.js')),s=E.createState(await p.evaluate(()=>Date.now()));assert(E.act(s,{type:'usePill',id:'qi0'},s.lastAt).ok);assert(E.act(s,{type:'levelUp'},s.lastAt).ok);s.training=false;
   await p.evaluate(s=>{if(!Lingqi.import(JSON.stringify(s)))throw Error('Flow fixture rejected');},s);
   await p.evaluate(()=>Lingqi.act('setTraining',{enabled:true}));const before=await p.evaluate(()=>Lingqi.state());assert.equal(await p.locator('.story-focus').getAttribute('data-focus-stage'),'not-started');
   await p.locator('[data-ui=journey-go]').filter({hasText:'前往炼制'}).click();assert(await p.locator('[data-action=queuePill][data-payload*=qi0]').count());assert.deepEqual(await p.evaluate(()=>Lingqi.state()),before);
   await p.screenshot({path:path.join(ROOT,'dist/v47-offline-growth.png')});report.screenshots.push('v47-offline-growth.png');
  });
  await test('offline challenge locks and battle retry use bundled guidance with no additional rewards',async()=>{
   await p.evaluate(()=>Lingqi.showModal('dungeon',{id:'resource_herb'}));await p.selectOption('#dungeon-difficulty','2');assert(await p.locator('[data-action=startDungeon]').isDisabled());
   await p.selectOption('#dungeon-difficulty','0');await p.locator('#dungeon-practice').check();await p.locator('[data-action=startDungeon]').click();await p.evaluate(()=>Lingqi.act('leaveBattle'));assert(await p.locator('.battle-guidance').isVisible());
   const saved=await p.evaluate(()=>Lingqi.state());await p.locator('[data-ui=battle-retry]').first().click();assert(await p.locator('#dungeon-practice').isChecked());assert.equal(await p.inputValue('#dungeon-difficulty'),'0');assert.deepEqual(await p.evaluate(()=>Lingqi.state()),saved);
   await p.screenshot({path:path.join(ROOT,'dist/v47-offline-retry.png')});report.screenshots.push('v47-offline-retry.png');
  });
 }
 for(const key of ['pageErrors','consoleErrors','failedRequests','externalRequests'])assert.equal(report[key].length,0,JSON.stringify(report[key]));
 await context.close();report.passed=report.tests.every(x=>x.passed);
})().catch(e=>{report.passed=false;report.fatal=e.stack;console.error(e);}).finally(async()=>{
 if(browser)await browser.close();report.finishedAt=new Date().toISOString();fs.writeFileSync(path.join(ROOT,'dist',process.env.LINGQI_OFFLINE_REPORT||'browser-v'+SERIES.replace('.','')+'-offline-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,tests:report.tests.length,pageErrors:report.pageErrors}));if(!report.passed)process.exitCode=1;
});
