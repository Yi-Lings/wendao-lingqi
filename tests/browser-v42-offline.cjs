'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const ROOT=path.resolve(process.env.LINGQI_ROOT||path.join(__dirname,'..'));
const {pathToFileURL}=require('node:url'),{chromium}=require(path.join(ROOT,'qa-tools/node_modules/playwright'));
const file=process.env.LINGQI_PREVIEW_HTML||path.join(ROOT,'dist/wendao-lingqi-v4.2-preview.html');
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
 for(const key of ['pageErrors','consoleErrors','failedRequests','externalRequests'])assert.equal(report[key].length,0,JSON.stringify(report[key]));
 await context.close();report.passed=report.tests.every(x=>x.passed);
})().catch(e=>{report.passed=false;report.fatal=e.stack;console.error(e);}).finally(async()=>{
 if(browser)await browser.close();report.finishedAt=new Date().toISOString();fs.writeFileSync(path.join(ROOT,'dist',process.env.LINGQI_OFFLINE_REPORT||'browser-v42-offline-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,tests:report.tests.length,pageErrors:report.pageErrors}));if(!report.passed)process.exitCode=1;
});
