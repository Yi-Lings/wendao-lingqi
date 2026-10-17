'use strict';
const {spawnSync}=require('node:child_process'),path=require('node:path'),fs=require('node:fs');
const root=path.resolve(process.env.LINGQI_ROOT||path.join(__dirname,'..'));
const env={...process.env,LINGQI_ROOT:root};
if(!env.LINGQI_CHROMIUM){
 const browsers=path.join(root,'qa-tools/browsers');
 const revisions=fs.existsSync(browsers)?fs.readdirSync(browsers).filter(x=>x.startsWith('chromium_headless_shell-')).sort():[];
 const candidates=revisions.reverse().map(x=>path.join(browsers,x,'chrome-headless-shell-linux64/chrome-headless-shell'));
 candidates.push('/usr/bin/chromium','/usr/bin/chromium-browser');
 env.LINGQI_CHROMIUM=candidates.find(x=>fs.existsSync(x));
 if(!env.LINGQI_CHROMIUM)delete env.LINGQI_CHROMIUM;
}
const suites=['browser-v3.cjs','browser-v31.cjs','browser-v32.cjs','browser-v43.cjs','browser-v44.cjs'];
if(process.argv.includes('--full'))suites.push('browser-equipment-builds.cjs','browser-activity-named-art.cjs','browser-story-ritual.cjs','browser-ascension.cjs','browser-v4-integrity.cjs');
for(const name of suites){
 const result=spawnSync(process.execPath,[path.join(__dirname,name)],{stdio:'inherit',env});
 if(result.error){console.error(result.error.message);process.exit(1);}
 if(result.status!==0)process.exit(result.status||1);
}
