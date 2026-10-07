'use strict';
// Real source-application transactions. Rich fixtures establish accessible UI
// stages only; they do not claim natural pacing or Android device validation.
// Native.exportSave models the corrected Java snapshot-only export contract.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const ROOT=path.resolve(process.env.LINGQI_ROOT||path.join(__dirname,'..'));
const BASE=process.env.LINGQI_URL||'http://127.0.0.1:8787/';
const DIST=path.join(ROOT,'dist/audit-v4');
const {chromium}=require(path.join(ROOT,'qa-tools/node_modules/playwright'));
const E=require(path.join(ROOT,'web/engine.js')),P=require(path.join(ROOT,'web/preview.js'));
const {terminalFixture,toReady}=require('./ascension-fixtures.cjs');
const NOW=1791244800000,FORMAL='lingqi-save-v2',HUMAN='lingqi-preview-save-v1',IMMORTAL='lingqi-ascension-preview-save-v1';
const NATIVE='__v4qa-native-formal',CALLS='__v4qa-native-calls',SNAPSHOT='__v4qa-export-snapshot';
const EXPECTED_FAULT='LINGQI_QA_EXPECTED_POSTCOMMIT_MODEL_FAILURE';
const report={startedAt:new Date().toISOString(),url:BASE,fixtureNotice:'Rich public preview and legally driven ascension fixtures establish transaction/UI stages. Date.now is fixed to prevent passive-state drift; HTMLMediaElement and performance clocks remain real. Native bridge is a snapshot-only mock of the corrected Java API, not an Android system-picker test.',sourceHashes:{},tests:[],screenshots:[],pageErrors:[],consoleErrors:[],expectedConsoleErrors:[],badResponses:[],failedRequests:[]};
for(const name of ['web/app.js','web/activity-rewards.js','web/audio.js','web/ascension-screen.js','android/app/src/main/java/com/lingqi/game/MainActivity.java'])report.sourceHashes[name]=crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,name))).digest('hex');
let browser;
const copy=x=>JSON.parse(JSON.stringify(x));
function regularFixture(){const s=P.createState(NOW);s.training=false;s.player.name='正式仙途完整性回归';return s;}
function ascendedFixture(){const s=terminalFixture({rich:true});toReady(s);const r=E.act(s,{type:'completeAscension'},NOW);assert(r.ok,r.message);s.training=false;s.lastAt=NOW;assert(E.validate(s).ok);return s;}
const state=p=>p.evaluate(()=>window.Lingqi.state());
const snapshots=p=>p.evaluate(({native,formal})=>({memory:window.Lingqi.state(),native:JSON.parse(localStorage.getItem(native)),formal:JSON.parse(localStorage.getItem(formal))}),{native:NATIVE,formal:FORMAL});
async function control(p,attribute,name,predicate=()=>true){const buttons=p.locator('#modal-layer button[data-'+attribute+'="'+name+'"]:visible, #page-content button[data-'+attribute+'="'+name+'"]:visible');for(let i=0;i<await buttons.count();i++){const b=buttons.nth(i),data=await b.evaluate(e=>JSON.parse(e.dataset.payload||'{}'));if(predicate(data))return b;}throw Error('Missing actual '+attribute+' control '+name);}
async function ui(p,name,predicate){await(await control(p,'ui',name,predicate)).click();}
async function action(p,name,predicate){await(await control(p,'action',name,predicate)).click();}
async function shot(p,name){const file='integrity-'+name+'.png';await p.screenshot({path:path.join(DIST,file)});report.screenshots.push(file);}
function observe(p,name,expectedFault){
 p.on('pageerror',e=>report.pageErrors.push({test:name,error:e.message}));
 p.on('console',m=>{if(m.type()!=='error')return;const item={test:name,error:m.text()};if(expectedFault&&m.text().includes(EXPECTED_FAULT))report.expectedConsoleErrors.push(item);else report.consoleErrors.push(item);});
 p.on('response',r=>{if(r.status()>=400)report.badResponses.push({test:name,url:r.url(),status:r.status()});});
 p.on('requestfailed',r=>report.failedRequests.push({test:name,url:r.url(),error:r.failure()?.errorText}));
}
async function withPage(name,initial,fn,{expectedFault=false,siblingKey=null}={}){
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});context.setDefaultTimeout(10000);
 const sibling=copy(initial);sibling.player.name='另一试玩槽原存档';
 await context.addInitScript(({initial,sibling,siblingKey,now,formal,native,calls,snapshot})=>{
  Date.now=()=>now;
  if(!localStorage.getItem('__v4qa-seeded')){
   localStorage.setItem('__v4qa-seeded','yes');localStorage.setItem(native,JSON.stringify(initial));localStorage.setItem(formal,JSON.stringify(initial));localStorage.setItem(calls,'[]');
   if(siblingKey)localStorage.setItem(siblingKey,JSON.stringify(sibling));
   for(const age of ['lingqi-age-confirmed','lingqi-preview-age-confirmed','lingqi-ascension-preview-age-confirmed'])localStorage.setItem(age,'yes');
   localStorage.setItem('lingqi_audio_v1',JSON.stringify({muted:false,music:.45,effects:.5}));
  }
  const record=(operation)=>{const history=JSON.parse(localStorage.getItem(calls));history.push({operation,query:location.search});localStorage.setItem(calls,JSON.stringify(history));};
  window.__rejectNativeSave=false;
  window.Native={
   loadSave(){record('load');return localStorage.getItem(native);},
   persistSave(raw){record('persist');if(window.__rejectNativeSave)return false;localStorage.setItem(native,raw);return true;},
   exportSave(raw){record('export');localStorage.setItem(snapshot,raw);window.__pendingExport=raw;},
   exportRecovery(raw){record('exportRecovery');localStorage.setItem(snapshot,raw);window.__pendingExport=raw;}
  };
  // Represents Android's canceled onActivityResult, not an invented bridge API.
  window.__simulateNativeExportCancel=()=>{record('cancelExport');window.__pendingExport=null;localStorage.removeItem(snapshot);window.onNativeMessage?.('已取消存档文件操作。');};
  window.__integrityAudioNodes=[];const OriginalAudio=window.Audio;
  window.Audio=function(src){const a=new OriginalAudio(src);window.__integrityAudioNodes.push(a);return a;};
 },{initial,sibling,siblingKey,now:NOW,formal:FORMAL,native:NATIVE,calls:CALLS,snapshot:SNAPSHOT});
 const p=await context.newPage();observe(p,name,expectedFault);
 try{await p.goto(new URL('?preview=0',BASE).href,{waitUntil:'networkidle'});await p.waitForFunction(()=>window.Lingqi?.state());return await fn(p);}
 catch(e){try{await shot(p,'failure-'+report.tests.length);}catch(_){}throw e;}
 finally{await context.close();}
}
async function test(name,fn){const at=Date.now();try{const detail=await fn();report.tests.push({name,passed:true,durationMs:Date.now()-at,detail});console.log('PASS '+name);}catch(e){report.tests.push({name,passed:false,durationMs:Date.now()-at,error:e.stack});console.error('FAIL '+name+': '+e.message);}}
async function navigateMode(p,mode){await p.evaluate(()=>Lingqi.showModal('settings'));await ui(p,'preview-'+mode);await p.waitForURL(url=>{const q=url.searchParams;return mode==='formal'?q.get('preview')==='0'&&!q.has('immortal'):mode==='human'?q.get('preview')==='1'&&!q.has('immortal'):q.get('preview')==='1'&&q.get('immortal')==='1';});await p.waitForFunction(()=>window.Lingqi?.state());}
async function exportIsolation(mode){const siblingKey=mode==='human'?IMMORTAL:HUMAN;return withPage('snapshot-only export '+mode,regularFixture(),async p=>{
 const initial=await snapshots(p);assert.equal(initial.memory.player.name,'正式仙途完整性回归');assert.deepEqual(initial.memory,initial.native);assert.deepEqual(initial.native,initial.formal);
 const baseline=await p.evaluate(({native,sibling,calls})=>({native:localStorage.getItem(native),formal:localStorage.getItem('lingqi-save-v2'),sibling:localStorage.getItem(sibling),calls:JSON.parse(localStorage.getItem(calls)).length}),{native:NATIVE,sibling:siblingKey,calls:CALLS});
 await navigateMode(p,mode==='human'?'human':'ascension');
 const preview=await state(p),previewKey=mode==='human'?HUMAN:IMMORTAL;
 assert.equal(preview.player.name,mode==='human'?'试玩行者':'天门试玩行者');
 const beforeExport=await p.evaluate(({native,sibling,calls})=>({native:localStorage.getItem(native),formal:localStorage.getItem('lingqi-save-v2'),sibling:localStorage.getItem(sibling),calls:JSON.parse(localStorage.getItem(calls))}),{native:NATIVE,sibling:siblingKey,calls:CALLS});
 assert.equal(beforeExport.native,baseline.native);assert.equal(beforeExport.formal,baseline.formal);assert.equal(beforeExport.sibling,baseline.sibling);
 assert.deepEqual(beforeExport.calls.slice(baseline.calls).filter(x=>new URLSearchParams(x.query).get('preview')==='1'),[],'preview load/boot must not use formal Native slot; formal departure saves are allowed');
 await p.evaluate(()=>Lingqi.showModal('settings'));await ui(p,'export-save');
 const exported=await p.evaluate(({native,sibling,snapshot,key})=>({native:localStorage.getItem(native),formal:localStorage.getItem('lingqi-save-v2'),sibling:localStorage.getItem(sibling),snapshot:JSON.parse(localStorage.getItem(snapshot)),storedPreview:JSON.parse(localStorage.getItem(key))}),{native:NATIVE,sibling:siblingKey,snapshot:SNAPSHOT,key:previewKey});
 assert.equal(exported.native,baseline.native);assert.equal(exported.formal,baseline.formal);assert.equal(exported.sibling,baseline.sibling);assert.deepEqual(exported.snapshot,await state(p));assert.deepEqual(exported.storedPreview,exported.snapshot);
 await p.evaluate(()=>__simulateNativeExportCancel());
 const canceled=await p.evaluate(({native,snapshot})=>({native:localStorage.getItem(native),snapshot:localStorage.getItem(snapshot)}),{native:NATIVE,snapshot:SNAPSHOT});
 assert.equal(canceled.native,baseline.native);assert.equal(canceled.snapshot,null);
 const previewCalls=await p.evaluate(calls=>JSON.parse(localStorage.getItem(calls)),CALLS);
 assert.deepEqual(previewCalls.slice(beforeExport.calls.length).map(x=>x.operation),['export','cancelExport'],'preview export/cancel must never persist formal state');
 await shot(p,mode+'-export-canceled');
 await ui(p,'preview-formal');await p.waitForURL(url=>url.searchParams.get('preview')==='0');await p.waitForFunction(()=>window.Lingqi?.state());
 const returned=await snapshots(p);assert.equal(returned.memory.player.name,'正式仙途完整性回归');assert.deepEqual(returned.memory,returned.native);assert.deepEqual(returned.native,returned.formal);
 assert.equal(await p.evaluate(key=>JSON.parse(localStorage.getItem(key)).player.name,previewKey),preview.player.name);
 assert.equal(await p.evaluate(key=>localStorage.getItem(key),siblingKey),baseline.sibling);
 return {query:mode==='human'?'?preview=1':'?preview=1&immortal=1',previewKey,exportName:exported.snapshot.player.name,formalNativeUnchangedOnExportAndCancel:true,siblingUnchanged:true,returnedName:returned.memory.player.name,previewOperations:previewCalls.slice(beforeExport.calls.length),formalDepartureSaves:beforeExport.calls.slice(baseline.calls)};
 },{siblingKey});}
async function dustExchange(item,kind){return withPage('dust exchange '+item,regularFixture(),async p=>{
 await p.evaluate(()=>{Lingqi.navigate('heaven');Lingqi.showModal('dust');});
 const before=await state(p);await action(p,'exchangeDust',q=>q.item===item);const after=await state(p);
 let id,quantity;
 if(kind==='gear'){const gained=after.bag.filter(g=>!before.bag.some(x=>x.uid===g.uid));assert.equal(gained.length,1);assert.equal(gained[0].rarity,4);id=gained[0].uid;quantity=1;}
 else{const gained=Object.keys(after.ownedTreasures).map(id=>({id,delta:after.ownedTreasures[id].count-(before.ownedTreasures[id]?.count||0)})).filter(x=>x.delta>0);assert.equal(gained.length,1);assert.equal(gained[0].delta,1);id=gained[0].id;quantity=1;}
 assert.equal(before.dust-after.dust,kind==='gear'?120:150);
 const card=p.locator('[data-activity-settlement=exchangeDust] [data-reward-kind="'+kind+'"][data-reward-id="'+id+'"]');assert.equal(await card.count(),1);assert.equal(Number(await card.getAttribute('data-reward-count')),quantity);assert.equal(await card.locator('[data-selection=inspect]').count(),1,'actual reward has a details control');
 const displayed=await card.innerText();assert(displayed.trim().length>0);await p.locator('.activity-costs summary').click();assert.match(await p.locator('.activity-costs').innerText(),/天道尘/);
 const saved=await snapshots(p);assert.deepEqual(saved.memory,saved.native);assert.deepEqual(saved.native,saved.formal);
 await shot(p,item+'-actual-settlement');await ui(p,'activity-return');assert.equal(await p.locator('[role=dialog]').getAttribute('aria-label'),'天道尘兑换');
 assert.deepEqual(await state(p),after,'closing settlement must grant/charge nothing');
 await ui(p,'close');assert.deepEqual(await state(p),after,'closing the restored source must grant nothing');
 return {item,kind,id,quantity,displayed,dustSpent:before.dust-after.dust,closedWithoutReward:true,sourceRestored:'天道尘兑换'};
 });}
(async()=>{
 fs.mkdirSync(DIST,{recursive:true});browser=await chromium.launch({headless:true,executablePath:process.env.LINGQI_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--autoplay-policy=user-gesture-required']});
 await test('formal query uses Native loading and commits the original character',()=>withPage('formal query',regularFixture(),async p=>{const values=await snapshots(p);assert.deepEqual(values.memory,values.native);assert.deepEqual(values.native,values.formal);const calls=await p.evaluate(key=>JSON.parse(localStorage.getItem(key)),CALLS);assert(calls.some(x=>x.operation==='load'));assert(calls.some(x=>x.operation==='persist'));assert.equal(await p.evaluate(()=>new URLSearchParams(location.search).get('preview')),'0');return {name:values.memory.player.name,query:'?preview=0',operations:calls};}));
 await test('human preview snapshot export and cancellation preserve formal Native and sibling slots',()=>exportIsolation('human'));
 await test('ascension preview snapshot export and cancellation preserve formal Native and sibling slots',()=>exportIsolation('immortal'));
 await test('failed Native ten-draw persistence restores currencies, rewards, UID, pity and random streams',()=>withPage('failed draw save',regularFixture(),async p=>{
 const result=await p.evaluate(({native,formal})=>{const before=Lingqi.state(),nativeBefore=localStorage.getItem(native),formalBefore=localStorage.getItem(formal);window.__rejectNativeSave=true;const action=Lingqi.act('draw',{count:10});const after=Lingqi.state();window.__rejectNativeSave=false;return {action,before,after,nativeBefore,nativeAfter:localStorage.getItem(native),formalBefore,formalAfter:localStorage.getItem(formal),hasReveal:!!document.querySelector('.red-reveal,.summoning-screen,.activity-settlement,.battle-settlement'),toast:document.querySelector('#toast').textContent};},{native:NATIVE,formal:FORMAL});
 assert.equal(result.action.ok,false);assert.deepEqual(result.after,result.before);assert.equal(result.nativeAfter,result.nativeBefore);assert.equal(result.formalAfter,result.formalBefore);assert.equal(result.hasReveal,false);assert.match(result.toast,/保存未成功/);
 return {rollback:true,fields:['tickets','jade','dust','bag','ownedTreasures','techniques','fragments','pills','materials','gacha','rngStreams','nextUid','revision'],noReveal:true};
 }));
 await test('postcommit feedback failure retains the saved forge UID and random state and reports presentationFailed',()=>withPage('postcommit renderer fault',regularFixture(),async p=>{
 const result=await p.evaluate(({native,formal,marker})=>{const before=Lingqi.state(),expected=JSON.parse(JSON.stringify(before));const predicted=IdleEngine.act(expected,{type:'forgeGear',set:'sword',slot:'weapon',rarity:3},Date.now());if(!predicted.ok)throw Error(predicted.message);const original=WendaoActivityRewards;window.WendaoActivityRewards={...original,model(){throw Error(marker);}};let action;try{action=Lingqi.act('forgeGear',{set:'sword',slot:'weapon',rarity:3});}finally{window.WendaoActivityRewards=original;}const memory=Lingqi.state();return {action,before,expected,memory,native:JSON.parse(localStorage.getItem(native)),formal:JSON.parse(localStorage.getItem(formal)),toast:document.querySelector('#toast').textContent};},{native:NATIVE,formal:FORMAL,marker:EXPECTED_FAULT});
 assert.equal(result.action.ok,true);assert.equal(result.action.presentationFailed,true);assert.deepEqual(result.memory,result.native);assert.deepEqual(result.native,result.formal);assert.notDeepEqual(result.memory,result.before);assert.deepEqual(result.memory,result.expected,'the same real forge must commit the exact predicted UID, affixes, costs and RNG');
 const gained=result.memory.bag.filter(g=>!result.before.bag.some(x=>x.uid===g.uid));assert.equal(gained.length,1);assert.equal(gained[0].uid,result.action.data.gear.uid);assert.equal(result.memory.nextUid,result.before.nextUid+1);assert.notDeepEqual(result.memory.rngStreams,result.before.rngStreams);assert.match(result.toast,/所得已保存/);await shot(p,'postcommit-saved-fallback');
 const next=await p.evaluate(()=>Lingqi.act('forgeGear',{set:'sword',slot:'weapon',rarity:3}));assert(next.ok&&!next.presentationFailed);const final=await snapshots(p);assert.deepEqual(final.memory,final.native);assert.deepEqual(final.native,final.formal);assert(final.memory.bag.some(g=>g.uid===gained[0].uid));assert.equal(final.memory.bag.length,result.memory.bag.length+1);assert.notEqual(next.data.gear.uid,gained[0].uid);
 return {presentationFailed:true,committedUid:gained[0].uid,nextUid:result.memory.nextUid,randomStreamsMatchDisk:true,subsequentForgeUid:next.data.gear.uid,expectedConsoleError:EXPECTED_FAULT};
 },{expectedFault:true}));
 await test('dust orange equipment shows the actual saved item and restores the source without a second grant',()=>dustExchange('orangeGear','gear'));
 await test('dust orange treasure shows the actual saved item and restores the source without a second grant',()=>dustExchange('orangeTreasure','treasure'));
 await test('real meditation followed by celestial advancement shows the saved new layer without fabricated rewards',()=>withPage('celestial advancement',ascendedFixture(),async p=>{
 await p.evaluate(()=>Lingqi.openAscension());const before=await state(p);
 for(let n=0;n<3;n++){await action(p,'celestialMeditate');assert.equal(await p.locator('.celestial-result').count(),1);await ui(p,'ascension-open');}
 const trained=await state(p);assert.equal(trained.ascension.xp+trained.ascension.reserve-(before.ascension.xp+before.ascension.reserve),660);assert.equal(trained.ascension.yuan-before.ascension.yuan,24);
 const powerBefore=E.attributes(trained).power;await action(p,'advanceCelestial');const after=await state(p);assert.equal(after.ascension.layer,2);assert.equal(after.ascension.yuan,trained.ascension.yuan);assert.deepEqual(after.materials,trained.materials);assert.equal(after.stones,trained.stones);assert(E.attributes(after).power>powerBefore);assert.equal(after.ascension.xp+after.ascension.reserve,180);
 const dialog=p.locator('[role=dialog]');assert.match(await dialog.getAttribute('aria-label'),/仙修晋层.*登仙 2层/);const text=await p.locator('.celestial-result').innerText();assert.match(text,/登仙 2层/);assert.doesNotMatch(text,/仙元 \+|仙界修为 \+|实际投入/);
 const saved=await snapshots(p);assert.deepEqual(saved.memory,saved.native);assert.deepEqual(saved.native,saved.formal);await shot(p,'celestial-layer2-saved');await ui(p,'ascension-open');assert.deepEqual(await state(p),after,'closing advancement must not grant anything');
 return {meditationXp:660,meditationYuan:24,layer:2,remainingXpAndReserve:180,yuanUnchangedOnAdvance:true,newPower:E.attributes(after).power,powerBefore,resultText:text};
 }));
 await test('actual ascension-open control synchronously switches music and the real media clock advances with one loop',()=>withPage('ascension music',ascendedFixture(),async p=>{
 await p.locator('[data-ui=help]').first().click();await ui(p,'close');await p.waitForFunction(()=>__integrityAudioNodes.some(a=>a.loop&&!a.paused&&a.src.endsWith('/bgm-home.mp3')&&a.currentTime>.1));
 const instant=await p.evaluate(()=>{const button=document.querySelector('#page-content [data-ui=ascension-open]');if(!button)throw Error('No player ascension-open control');button.click();return LingqiAudio.diagnostics();});assert.equal(instant.scene,'ascension','scene must change inside the actual click handler, before any passive timer');
 await p.waitForFunction(()=>__integrityAudioNodes.some(a=>a.loop&&!a.paused&&a.src.endsWith('/bgm-ascension.mp3')&&a.currentTime>.15&&a.volume>.01));const clockBefore=await p.evaluate(()=>__integrityAudioNodes.find(a=>a.loop&&a.src.endsWith('/bgm-ascension.mp3')).currentTime);await p.waitForTimeout(350);const clockAfter=await p.evaluate(()=>__integrityAudioNodes.find(a=>a.loop&&a.src.endsWith('/bgm-ascension.mp3')).currentTime);assert(clockAfter-clockBefore>.15,'actual decoder clock must move');
 await p.waitForTimeout(900);const playing=await p.evaluate(()=>LingqiAudio.diagnostics());assert.deepEqual(playing.musicPlaying,['ascension']);assert.equal(playing.playbackFailures,0);await shot(p,'ascension-real-audio');
 await p.evaluate(()=>onNativeLifecycle('pause'));const paused=await p.evaluate(()=>LingqiAudio.diagnostics());assert.deepEqual(paused.musicPlaying,[]);assert.deepEqual(paused.activeEffects,[]);await p.evaluate(()=>onNativeLifecycle('resume'));await p.waitForFunction(()=>LingqiAudio.diagnostics().musicPlaying.includes('ascension'));
 return {instantScene:instant.scene,clockBefore,clockAfter,clockDelta:clockAfter-clockBefore,finalTracks:playing.musicPlaying,playbackFailures:playing.playbackFailures,backgroundStopped:true};
 }));
 assert.equal(report.tests.length,9);assert.equal(report.expectedConsoleErrors.length,1,'exactly the injected postcommit failure is expected');assert.equal(report.pageErrors.length,0);assert.equal(report.consoleErrors.length,0,'normal flows have zero console errors');assert.equal(report.badResponses.length,0);assert.equal(report.failedRequests.length,0);
})().catch(e=>{report.fatal=e.stack;console.error(e);}).finally(async()=>{if(browser)await browser.close();report.finishedAt=new Date().toISOString();report.passed=!report.fatal&&report.tests.length===9&&report.tests.every(t=>t.passed);fs.writeFileSync(path.join(DIST,'browser-v4-integrity.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,tests:report.tests.length,failed:report.tests.filter(t=>!t.passed).map(t=>t.name),pageErrors:report.pageErrors,consoleErrors:report.consoleErrors,expectedConsoleErrors:report.expectedConsoleErrors,badResponses:report.badResponses,failedRequests:report.failedRequests}));if(!report.passed)process.exitCode=1;});
