'use strict';
// Real guaranteed-red draws verify the rendered crop window, rather than only
// checking that a background URL exists. Generous inventory is a QA fixture.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const ROOT=path.resolve(process.env.LINGQI_ROOT||path.join(__dirname,'..'));
const BASE=process.env.LINGQI_URL||'http://127.0.0.1:8787/';
const {chromium}=require(path.join(ROOT,'qa-tools/node_modules/playwright'));
const E=require(path.join(ROOT,'web/engine.js'));
const DIST=path.join(ROOT,'dist/red-art-qa'),NOW=Date.now();
const report={startedAt:new Date().toISOString(),url:BASE,tests:[],screenshots:[],pageErrors:[],consoleErrors:[],failedRequests:[],badResponses:[],fixtureNotice:'Validated late-game inventories, red pity 79 and a guaranteed target exercise actual one-draw transactions and their original reveal. This does not prove natural economic reachability.'};
let browser;
function fixture(target){
 const s=E.createState(NOW);s.training=false;s.paths.magic={realm:5,layer:10,xp:0,reserve:0};
 s.stones=1000000;s.tickets=100;s.dust=1000;
 for(const id of Object.keys(s.materials))s.materials[id]=5000;
 s.gacha.redPity=79;s.gacha.target=target;s.gacha.fateGuarantee=true;s.rngStreams.gacha=1;
 assert.ok(E.modules.economy.targets(s).some(item=>item.id===target),'target exists in real catalog');
 const checked=E.validate(s);assert.ok(checked.ok,checked.error);return checked.state;
}
function observe(page){
 page.on('pageerror',e=>report.pageErrors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')report.consoleErrors.push(m.text());});
 page.on('requestfailed',r=>report.failedRequests.push({url:r.url(),error:r.failure()?.errorText}));
 page.on('response',r=>{if(r.status()>=400)report.badResponses.push({url:r.url(),status:r.status()});});
}
async function renderedWindow(page){
 const picture=page.locator('.red-card-art [data-atlas-picture]');
 await picture.waitFor({state:'visible'});
 const details=await picture.evaluate(async node=>{
  const css=getComputedStyle(node),rect=node.getBoundingClientRect(),icon=node.parentElement,outer=icon.getBoundingClientRect();
  const url=css.backgroundImage.match(/url\(["']?([^"')]+)["']?\)/)?.[1];
  const image=new Image();image.src=url;await image.decode();
  const ancestors=[];for(let item=node;item;item=item.parentElement){const style=getComputedStyle(item);ancestors.push({display:style.display,visibility:style.visibility,opacity:Number(style.opacity)});}
  return {display:css.display,visibility:css.visibility,rect:{width:rect.width,height:rect.height,x:rect.x,y:rect.y,right:rect.right,bottom:rect.bottom},outer:{x:outer.x,y:outer.y,right:outer.right,bottom:outer.bottom},image:{width:image.naturalWidth,height:image.naturalHeight},backgroundSize:css.backgroundSize,backgroundPosition:css.backgroundPosition,overflow:getComputedStyle(icon).overflow,ancestors};
 });
 assert.equal(details.display,'block','crop span is actually displayed');
 assert.equal(details.visibility,'visible');
 assert.ok(details.rect.width>35&&details.rect.height>35&&details.rect.width*details.rect.height>1500,'rendered crop has visible area even on short screens');
 assert.ok(details.image.width>100&&details.image.height>100,'atlas actually decodes');
 assert.ok(details.ancestors.every(a=>a.display!=='none'&&a.visibility!=='hidden'&&a.opacity>.1),'no ancestor hides the art window');
 assert.ok(details.rect.x>=details.outer.x-.5&&details.rect.y>=details.outer.y-.5&&details.rect.right<=details.outer.right+.5&&details.rect.bottom<=details.outer.bottom+.5,'complete measured object is contained inside its icon');
 assert.equal(details.overflow,'hidden','window clips neighboring cells');
 // Compare actual browser pixels with the source window hidden, keeping the
 // same frame, aura, layout and saved result. A CSS-hidden source span would
 // produce identical screenshots even if its background URL were correct.
 const icon=page.locator('.red-card-art .art-icon'),shown=await icon.screenshot();
 await picture.evaluate(node=>{node.style.visibility='hidden';});
 const hidden=await icon.screenshot();
 await picture.evaluate(node=>{node.style.removeProperty('visibility');});
 const difference=await page.evaluate(async images=>{
  async function decode(data){const image=new Image();image.src=data;await image.decode();const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const context=canvas.getContext('2d');context.drawImage(image,0,0);return {width:image.width,height:image.height,data:context.getImageData(0,0,image.width,image.height).data};}
  const [a,b]=await Promise.all(images.map(decode));if(a.width!==b.width||a.height!==b.height)throw Error('Art geometry changed between screenshots');
  let changed=0;for(let i=0;i<a.data.length;i+=4)if(Math.max(Math.abs(a.data[i]-b.data[i]),Math.abs(a.data[i+1]-b.data[i+1]),Math.abs(a.data[i+2]-b.data[i+2]))>12)changed++;
  return {pixels:a.width*a.height,changed,fraction:changed/(a.width*a.height)};
 },[shown,hidden].map(buffer=>'data:image/png;base64,'+buffer.toString('base64')));
 assert.ok(difference.fraction>.02,'decoded artwork visibly contributes pixels beyond its frame and aura');
 return {details,difference};
}
async function runCase(category,target,width,height,motion){
 const state=fixture(target),context=await browser.newContext({viewport:{width,height},isMobile:width<600,hasTouch:width<600,deviceScaleFactor:1,reducedMotion:motion});
 try{
  await context.addInitScript(s=>{localStorage.setItem('lingqi-save-v2',JSON.stringify(s));localStorage.setItem('lingqi-age-confirmed','yes');Date.now=()=>s.lastAt;},state);
  const page=await context.newPage();observe(page);
  await page.goto(BASE,{waitUntil:'networkidle'});await page.waitForFunction(()=>window.Lingqi);
  await page.locator('.nav-bottom [data-page="heaven"]').click();
  const draws=page.locator('button[data-action="draw"]');let single;
  for(let i=0;i<await draws.count();i++)if(JSON.parse(await draws.nth(i).getAttribute('data-payload')||'{}').count===1){single=draws.nth(i);break;}
  assert.ok(single,'ordinary one-draw button exists');await single.click();
  if(motion==='no-preference'){
   await page.waitForSelector('.red-reveal[data-phase="awakening"]');
   await page.waitForSelector('.red-reveal[data-phase="impact"]');
  }
  await page.waitForSelector('.red-reveal[data-phase="revealed"]');
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForFunction(()=>!!document.querySelector('.red-card-art [data-atlas-picture]')?.style.width);
  const saved=await page.evaluate(()=>window.Lingqi.state()),prize=saved.gacha.history.at(-1);
  assert.equal(prize.id,target);assert.equal(prize.category,category);assert.equal(prize.rarity,5);
  assert.equal(saved.tickets,state.tickets-1);assert.equal(saved.gacha.total,state.gacha.total+1,'only one actual draw');
  const art=await renderedWindow(page);
  const next=page.locator('[data-ui="red-reveal-next"]'),bounds=await next.boundingBox();
  assert.ok(bounds&&bounds.y>=0&&bounds.y+bounds.height<=height+.5,'red reveal continues within viewport');
  const file=`${category}-${width}x${height}.png`;await page.screenshot({path:path.join(DIST,file)});report.screenshots.push(path.join(DIST,file));
  await next.click();await page.waitForSelector('.reward-grid .reward-card');
  const after=await page.evaluate(()=>window.Lingqi.state());assert.equal(after.gacha.total,saved.gacha.total);assert.equal(after.tickets,saved.tickets,'closing reveal does not redraw or recharge');
  return {target,category,width,height,motion,prize,art};
 }finally{await context.close();}
}
(async()=>{
 fs.mkdirSync(DIST,{recursive:true});
 browser=await chromium.launch({headless:true,executablePath:process.env.LINGQI_CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const [width,height] of [[360,640],[390,480],[1440,900]])for(const [category,target] of [['gear','gear_thunder_weapon'],['technique','array_heart_1'],['treasure','t11']]){
  const name=`Visible ${category} crop during real red draw at ${width}×${height}`;
  try{const details=await runCase(category,target,width,height,width===360&&category==='gear'?'no-preference':'reduce');report.tests.push({name,passed:true,details});console.log('PASS '+name);}catch(error){report.tests.push({name,passed:false,error:error.stack||String(error)});console.error('FAIL '+name+': '+error.message);}
 }
 assert.equal(report.pageErrors.length,0,'no browser exceptions');assert.equal(report.consoleErrors.length,0,'no browser console errors');assert.equal(report.failedRequests.length,0,'no failed media loads');assert.equal(report.badResponses.length,0,'all resources exist');
})().catch(error=>{report.fatal=error.stack||String(error);console.error(error);}).finally(async()=>{
 if(browser)await browser.close();report.finishedAt=new Date().toISOString();report.passed=!report.fatal&&report.tests.length===9&&report.tests.every(t=>t.passed);
 fs.mkdirSync(DIST,{recursive:true});fs.writeFileSync(path.join(DIST,'report.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify({passed:report.passed,total:report.tests.length,failed:report.tests.filter(t=>!t.passed).map(t=>t.name),pageErrors:report.pageErrors}));if(!report.passed)process.exitCode=1;
});
