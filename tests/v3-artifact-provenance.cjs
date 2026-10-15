'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const crypto=require('node:crypto');
const {pathToFileURL}=require('node:url');
const {spawnSync}=require('node:child_process');
const CHECKER=path.resolve(__dirname,'../tools/check-artifact-sources.py');
const ENV={...process.env,GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null'};
const INPUTS={
 'web/index.html':'<!doctype html><script src="engine.js"></script>',
 'web/engine.js':'window.engine = {version: 4};\n',
 'web/assets/hero.png':Buffer.from([137,80,78,71,13,10,26,10,1,2,3,4]),
 'android/settings.gradle':"rootProject.name = 'Fixture'\ninclude ':app'\n",
 'android/build.gradle':"plugins { id 'com.android.application' version '8.7.3' apply false }\n",
 'android/gradle.properties':'android.useAndroidX=false\n',
 'android/app/build.gradle':"plugins { id 'com.android.application' }\n",
 'android/app/src/main/AndroidManifest.xml':'<manifest package="example.fixture"/>\n',
 'android/app/src/main/java/example/MainActivity.java':'class MainActivity { String title = "source-v1"; }\n',
 'android/app/src/main/res/values/styles.xml':'<resources><style name="Game"/></resources>\n'
};
const MANIFEST='releases/parts-v4/manifest.json';
function write(repo,file,bytes){const target=path.join(repo,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);}
function git(repo,...args){
 const result=spawnSync('git',['-C',repo,...args],{encoding:'utf8',env:ENV,timeout:20000});
 assert.equal(result.error,undefined,result.error?.message);assert.equal(result.status,0,result.stderr||result.stdout);
 return result.stdout.trim();
}
function checker(repo,...args){
 const result=spawnSync('python3',[CHECKER,'--repo',repo,'--manifest',MANIFEST,...args],{encoding:'utf8',env:ENV,timeout:20000});
 assert.equal(result.error,undefined,result.error?.message);return result;
}
function passed(result){assert.equal(result.status,0,result.stderr||result.stdout);assert.match(result.stdout,/verified|Verified/);}
function rejected(result,pattern){assert.notEqual(result.status,0,result.stdout);assert.match(result.stderr,/Artifact source validation failed/);if(pattern)assert.match(result.stderr,pattern);}
function readManifest(repo){return JSON.parse(fs.readFileSync(path.join(repo,MANIFEST),'utf8'));}
function saveManifest(repo,manifest){write(repo,MANIFEST,JSON.stringify(manifest,null,2)+'\n');}
function commit(repo,message){git(repo,'add','--all');git(repo,'commit','--quiet','-m',message);return git(repo,'rev-parse','HEAD');}
function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'lingqi-provenance-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const repo=path.join(root,'repo');fs.mkdirSync(repo);
 git(repo,'init','--quiet');git(repo,'config','user.name','Provenance Test');git(repo,'config','user.email','provenance@example.invalid');
 write(repo,'.gitignore','android/**/build/\nandroid/.gradle/\nlocal.properties\n*.jks\n*.keystore\nweb/ignored-local.json\n');
 for(const [file,bytes] of Object.entries(INPUTS))write(repo,file,bytes);
 write(repo,'docs/notes.md','documentation v1\n');write(repo,'android/README.md','Android setup documentation\n');
 const sourceCommit=commit(repo,'Frozen build sources');
 saveManifest(repo,{fileName:'fixture.apk',size:1,sha256:'a'.repeat(64),sourceCommit,parts:[{name:'fixture.apk.part01',size:1,sha256:'a'.repeat(64)}]});
 passed(checker(repo,'--write-inputs'));return {root,repo,sourceCommit};
}

test('write-inputs records every web asset and native/Gradle input and validates exact bytes',t=>{
 const {repo}=fixture(t),manifest=readManifest(repo);
 assert.deepEqual(manifest.buildInputs.map(row=>row.path),Object.keys(INPUTS).sort());
 for(const row of manifest.buildInputs){
  const bytes=fs.readFileSync(path.join(repo,row.path));
  assert.deepEqual(Object.keys(row),['path','size','sha256']);
  assert.equal(row.size,bytes.length);assert.equal(row.sha256,crypto.createHash('sha256').update(bytes).digest('hex'));
 }
 passed(checker(repo));
});

test('a native Java change is rejected even when the game assets are unchanged',t=>{
 const {repo}=fixture(t);
 write(repo,'android/app/src/main/java/example/MainActivity.java','class MainActivity { String title = "source-v2"; }\n');
 rejected(checker(repo),/Current build input.*MainActivity\.java/);
});

test('a same-size game art change is rejected by SHA-256 instead of size alone',t=>{
 const {repo}=fixture(t),file='web/assets/hero.png',before=fs.readFileSync(path.join(repo,file));
 const changed=Buffer.from(before);changed[changed.length-1]^=0xff;write(repo,file,changed);
 assert.equal(changed.length,before.length);
 rejected(checker(repo),/Current build input.*web\/assets\/hero\.png/);
});

test('a missing manifest input, a removed input and an untracked new source cannot be silently omitted',t=>{
 const {repo}=fixture(t),original=readManifest(repo);
 const omitted=structuredClone(original);omitted.buildInputs=omitted.buildInputs.filter(row=>!row.path.endsWith('MainActivity.java'));saveManifest(repo,omitted);
 rejected(checker(repo),/input path set differs/);
 saveManifest(repo,original);write(repo,'web/assets/new-region.png','new region art');
 rejected(checker(repo),/input path set differs.*new-region\.png/);
 fs.unlinkSync(path.join(repo,'web/assets/new-region.png'));git(repo,'rm','--quiet','web/assets/hero.png');
 rejected(checker(repo),/input path set differs.*hero\.png/);
 const concealed=structuredClone(original);concealed.buildInputs=concealed.buildInputs.filter(row=>row.path!=='web/assets/hero.png');saveManifest(repo,concealed);
 rejected(checker(repo),/Manifest\/sourceCommit input path set differs.*hero\.png/);
});

test('fake commits, noncommit objects and unsafe sourceCommit text are rejected',t=>{
 const {repo}=fixture(t),original=readManifest(repo);
 const blob=git(repo,'rev-parse',original.sourceCommit+':web/engine.js');
 for(const [sourceCommit,pattern] of [
  ['0'.repeat(40),/sourceCommit is unavailable/],
  [blob,/does not identify a Git commit object/],
  ['HEAD',/safe 40-character/],
  ['--upload-pack=unexpected',/safe 40-character/]
 ]){const changed=structuredClone(original);changed.sourceCommit=sourceCommit;saveManifest(repo,changed);rejected(checker(repo,...(sourceCommit==='0'.repeat(40)?[]:['--fetch-source'])),pattern);}
});

test('a forged manifest of current hashes cannot attribute newer native bytes to an older real commit',t=>{
 const {repo}=fixture(t),manifest=readManifest(repo),file='android/app/src/main/java/example/MainActivity.java';
 write(repo,file,'class MainActivity { String title = "source-v2"; }\n');commit(repo,'Changed native behavior');
 const bytes=fs.readFileSync(path.join(repo,file)),row=manifest.buildInputs.find(row=>row.path===file);
 row.size=bytes.length;row.sha256=crypto.createHash('sha256').update(bytes).digest('hex');saveManifest(repo,manifest);
 rejected(checker(repo),/sourceCommit build input.*MainActivity\.java/);
});


test('local git replace refs cannot make an older sourceCommit impersonate newer source bytes or paths',t=>{
 const {repo,sourceCommit}=fixture(t),manifest=readManifest(repo),file='android/app/src/main/java/example/MainActivity.java';
 write(repo,file,'class MainActivity { String title = "source-v2"; }\n');
 const replacement=commit(repo,'New native behavior');
 const updateRow=file=>{const bytes=fs.readFileSync(path.join(repo,file));return {path:file,size:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};};
 Object.assign(manifest.buildInputs.find(row=>row.path===file),updateRow(file));saveManifest(repo,manifest);
 git(repo,'replace',sourceCommit,replacement);
 rejected(checker(repo),/sourceCommit build input.*MainActivity\.java/);
 const branch=git(repo,'symbolic-ref','HEAD');git(repo,'update-ref',branch,sourceCommit,replacement);
 const savedManifest=fs.readFileSync(path.join(repo,MANIFEST),'utf8');
 rejected(checker(repo,'--write-inputs'),/uncommitted source bytes.*MainActivity\.java/);
 assert.equal(fs.readFileSync(path.join(repo,MANIFEST),'utf8'),savedManifest,'replacement cannot trick the writer into overwriting the original manifest');
 git(repo,'update-ref',branch,replacement,sourceCommit);
 write(repo,'web/assets/new-region.png','new art');const newer=commit(repo,'Additional source asset');
 manifest.buildInputs.push(updateRow('web/assets/new-region.png'));saveManifest(repo,manifest);
 git(repo,'replace','-f',sourceCommit,newer);
 rejected(checker(repo),/Manifest\/sourceCommit input path set differs.*new-region\.png/);
});


test('a blob replacement cannot relabel changed native bytes as the original source commit',t=>{
 const {repo,sourceCommit}=fixture(t),manifest=readManifest(repo),file='android/app/src/main/java/example/MainActivity.java';
 const oldBlob=git(repo,'rev-parse',sourceCommit+':'+file);
 write(repo,file,'class MainActivity { String title = "source-v2"; }\n');
 const newBlob=git(repo,'hash-object','-w',file),bytes=fs.readFileSync(path.join(repo,file));
 Object.assign(manifest.buildInputs.find(row=>row.path===file),{size:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
 saveManifest(repo,manifest);git(repo,'replace',oldBlob,newBlob);
 rejected(checker(repo),/sourceCommit build input.*MainActivity\.java/);
});

test('later documentation-only commits and excluded local build outputs remain valid',t=>{
 const {repo,sourceCommit}=fixture(t);
 write(repo,'docs/notes.md','documentation v2\n');write(repo,'android/README.md','new setup instructions\n');
 const head=commit(repo,'Documentation and release manifest only');assert.notEqual(head,sourceCommit);
 write(repo,'android/app/build/generated/output.class','local build output');write(repo,'android/.gradle/cache.bin','local gradle cache');
 write(repo,'android/local.properties','sdk.dir=/local/sdk\n');write(repo,'android/test.jks','dummy excluded keystore');write(repo,'web/ignored-local.json','local ignored configuration');
 passed(checker(repo));
 rejected(checker(repo,'--write-inputs'),/requires sourceCommit to equal HEAD/);
});

test('write-inputs refuses dirty or uncommitted build sources and preserves the existing manifest',t=>{
 const {repo}=fixture(t),original=fs.readFileSync(path.join(repo,MANIFEST),'utf8');
 write(repo,'web/engine.js','window.engine = {version: 5};\n');
 rejected(checker(repo,'--write-inputs'),/uncommitted source bytes/);
 assert.equal(fs.readFileSync(path.join(repo,MANIFEST),'utf8'),original);
 write(repo,'web/engine.js',INPUTS['web/engine.js']);write(repo,'web/new-system.js','window.newSystem = true;\n');
 rejected(checker(repo,'--write-inputs'),/input path set differs/);
 assert.equal(fs.readFileSync(path.join(repo,MANIFEST),'utf8'),original);
});

test('buildInputs rejects duplicate entries, traversal, bad sizes and bad checksums',t=>{
 const {repo}=fixture(t),original=readManifest(repo);
 for(const mutate of [
  manifest=>manifest.buildInputs.push({...manifest.buildInputs[0]}),
  manifest=>manifest.buildInputs[0].path='web/../../outside',
  manifest=>manifest.buildInputs[0].size=true,
  manifest=>manifest.buildInputs[0].sha256='bad',
  manifest=>delete manifest.buildInputs
 ]){const changed=structuredClone(original);mutate(changed);saveManifest(repo,changed);rejected(checker(repo));}
});


test('source inputs cannot be replaced by symlinks to undeclared bytes outside the repository',t=>{
 const {repo,root}=fixture(t),asset=path.join(repo,'web/assets/hero.png'),external=path.join(root,'outside.png');
 fs.writeFileSync(external,INPUTS['web/assets/hero.png']);fs.unlinkSync(asset);fs.symlinkSync(external,asset);
 rejected(checker(repo),/nonregular current build input.*hero\.png/);
});

test('a shallow clone fetches the declared source commit safely without requiring it to equal HEAD',t=>{
 const {repo,root,sourceCommit}=fixture(t);
 write(repo,'docs/notes.md','later documentation\n');commit(repo,'Publish manifest and later documentation');
 const remote=path.join(root,'origin.git');git(repo,'clone','--bare','--quiet',repo,remote);
 const shallow=path.join(root,'shallow');git(repo,'clone','--quiet','--depth=1',pathToFileURL(remote).href,shallow);
 assert.equal(git(shallow,'rev-parse','--is-shallow-repository'),'true');
 rejected(checker(shallow),/sourceCommit is unavailable/);
 passed(checker(shallow,'--fetch-source'));
 assert.equal(git(shallow,'cat-file','-t',sourceCommit),'commit');
 assert.notEqual(git(shallow,'rev-parse','HEAD'),sourceCommit,'fetching evidence does not reset the checkout');
});
