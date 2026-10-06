'use strict';
// Checks the real decoder and HTMLMediaElement clock, including offline file URLs.
// This is separate from the main UI suite so audio capability is tested directly.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('../qa-tools/node_modules/playwright');
const ROOT = path.resolve(__dirname, '..');
const BASE = process.env.LINGQI_URL || 'http://127.0.0.1:8787/';
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'web/assets/audio/manifest.json')));
const html = base => `<!doctype html><html><head><base href="${base}"></head><body>
<button id="unlock">启声</button><script>
window.audioNodes=[];const NativeAudio=window.Audio;window.Audio=function(src){const a=new NativeAudio(src);audioNodes.push(a);return a;};
</script><script src="audio.js"></script><script>
document.querySelector('button').onclick=()=>LingqiAudio.unlock();
</script></body></html>`;
const report = { tests: [], pageErrors: [], consoleErrors: [], externalRequests: [] };
let browser, fixtureFile;
async function check(name, fn) {
  try { const detail = await fn(); report.tests.push({ name, passed: true, detail }); console.log('PASS ' + name); }
  catch (error) {
    if (name.startsWith('offline file URLs') && error.message.includes('ERR_BLOCKED_BY_ADMINISTRATOR')) {
      report.tests.push({ name, passed: null, skipped: true, reason: 'Host Chromium managed URL policy blocks file: navigation. Android WebView asset playback remains a device check.' });
      console.log('SKIP ' + name + ': host Chromium managed policy blocks file: navigation');
    } else { report.tests.push({ name, passed: false, error: error.stack }); console.error('FAIL ' + name + ': ' + error.message); }
  }
}
function observe(page) {
  page.on('pageerror', error => report.pageErrors.push(error.message));
  page.on('console', msg => { if (msg.type() === 'error') report.consoleErrors.push(msg.text()); });
  page.on('request', req => { if (!req.url().startsWith(BASE) && !req.url().startsWith('file:')) report.externalRequests.push(req.url()); });
}
async function playing(page) {
  await page.waitForFunction(() => audioNodes.some(a => a.loop && !a.paused && a.currentTime > .15 && a.volume > .1));
  return page.evaluate(() => audioNodes.filter(a => a.loop && !a.paused).map(a => ({ src: a.src, currentTime: a.currentTime, volume: a.volume, duration: a.duration })));
}
(async () => {
  fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
  browser = await chromium.launch({ headless: true, executablePath: process.env.LINGQI_CHROMIUM || '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-gpu', '--autoplay-policy=user-gesture-required'] });
  const context = await browser.newContext();
  const page = await context.newPage(); observe(page);
  await page.route(BASE + 'audio-validation-fixture.html', route => route.fulfill({ contentType: 'text/html', body: html(BASE) }));
  await page.goto(BASE + 'audio-validation-fixture.html');
  await check('all 14 original files decode in Chromium to their expected durations', async () => {
    const decoded = await page.evaluate(async entries => Promise.all(entries.map(([name, info]) => new Promise((resolve, reject) => {
      const audio = new Audio('assets/audio/' + info.file);
      audio.preload = 'auto';
      const timeout = setTimeout(() => reject(new Error(name + ' timed out')), 10000);
      audio.onloadedmetadata = () => { clearTimeout(timeout); resolve({ name, duration: audio.duration, expected: info.duration }); };
      audio.onerror = () => { clearTimeout(timeout); reject(new Error(name + ' decoder error')); };
      audio.load();
    }))), Object.entries(manifest.assets));
    for (const item of decoded) assert.ok(Math.abs(item.duration - item.expected) < .15, item.name);
    return decoded;
  });
  await check('a real click unlocks an advancing music clock, then scenes crossfade to one loop', async () => {
    assert.equal(await page.evaluate(() => LingqiAudio.play('red-impact')), false);
    await page.click('#unlock');
    const home = await playing(page);
    assert.ok(home.some(a => a.src.endsWith('bgm-home.mp3')));
    for (const scene of ['heaven', 'battle', 'home']) {
      await page.evaluate(scene => LingqiAudio.setScene(scene), scene);
      await page.waitForTimeout(950);
      const voices = await playing(page);
      assert.equal(voices.length, 1);
      assert.ok(voices[0].src.endsWith('bgm-' + scene + '.mp3'));
    }
    return await playing(page);
  });
  await check('every effect has an advancing real playback clock; epic cues finish without overlap leaks', async () => {
    const played = [];
    for (const name of Object.keys(manifest.assets).filter(name => manifest.assets[name].kind === 'effect')) {
      await page.evaluate(() => LingqiAudio.stopEffect());
      const accepted = await page.evaluate(name => LingqiAudio.play(name), name); assert.equal(accepted, true, name);
      await page.waitForFunction(name => audioNodes.some(a => a.src.endsWith('/' + name + '.mp3') && !a.paused && a.currentTime > .045), name);
      played.push(name);
    }
    await page.waitForTimeout(4400);
    assert.equal((await page.evaluate(() => LingqiAudio.diagnostics())).activeEffects.length, 0);
    return played;
  });
  await check('muting stops audible nodes and remains muted after a reload', async () => {
    await page.evaluate(() => { LingqiAudio.setPreferences({ muted: true }); LingqiAudio.play('red-impact'); });
    const audible = await page.evaluate(() => audioNodes.filter(a => !a.paused && a.volume > 0).length);
    assert.equal(audible, 0);
    await page.reload(); await page.click('#unlock');
    assert.equal((await page.evaluate(() => LingqiAudio.getPreferences())).muted, true);
    assert.equal((await page.evaluate(() => LingqiAudio.diagnostics())).musicPlaying.length, 0);
  });
  await check('cached local media continues music and effects with the browser network offline', async () => {
    await page.evaluate(() => {
      LingqiAudio.setPreferences({ muted: false });
      LingqiAudio.play('red-impact');
    });
    await page.waitForFunction(() => audioNodes.some(a => a.src.endsWith('/red-impact.mp3') && a.readyState >= 4 && a.currentTime > .1));
    await page.waitForTimeout(950);
    await page.evaluate(() => LingqiAudio.stopEffect());
    await playing(page);
    await context.setOffline(true);
    await page.evaluate(() => { LingqiAudio.pause(); LingqiAudio.resume(); });
    const before = (await playing(page))[0].currentTime;
    await page.waitForTimeout(500);
    const after = (await playing(page))[0].currentTime;
    assert.ok(after > before + .3);
    assert.equal(await page.evaluate(() => LingqiAudio.play('red-impact')), true);
    await page.waitForFunction(() => audioNodes.some(a => a.src.endsWith('/red-impact.mp3') && !a.paused && a.currentTime > .1));
    assert.equal((await page.evaluate(() => LingqiAudio.diagnostics())).playbackFailures, 0);
    await context.setOffline(false);
    return { musicAdvancedSeconds: after - before, effect: 'red-impact', networkOffline: true };
  });
  await check('offline file URLs decode and play with no HTTP dependency', async () => {
    fixtureFile = path.join(ROOT, 'dist/audio-validation-fixture.html');
    fs.writeFileSync(fixtureFile, html('file://' + path.join(ROOT, 'web') + '/'));
    const offlineContext = await browser.newContext();
    const offline = await offlineContext.newPage(); observe(offline);
    const network = [];
    offline.on('request', req => { if (/^https?:/.test(req.url())) network.push(req.url()); });
    await offline.goto('file://' + fixtureFile);
    await offline.click('#unlock');
    const voices = await playing(offline);
    assert.equal(voices.length, 1);
    assert.ok(voices[0].src.startsWith('file:'));
    const result = await offline.evaluate(() => { const started = LingqiAudio.play('red-impact'); return { started, state: LingqiAudio.diagnostics() }; });
    assert.equal(result.started, true);
    await offline.waitForFunction(() => audioNodes.some(a => a.src.endsWith('/red-impact.mp3') && !a.paused && a.currentTime > .1));
    await offline.evaluate(() => LingqiAudio.pause());
    assert.equal(await offline.evaluate(() => audioNodes.filter(a => !a.paused).length), 0);
    assert.equal(network.length, 0);
    await offlineContext.close(); return voices;
  });
  await context.close();
})().catch(error => { report.fatal = error.stack; console.error(error); }).finally(async () => {
  if (browser) await browser.close();
  if (fixtureFile) fs.unlinkSync(fixtureFile);
  fs.writeFileSync(path.join(ROOT, 'dist/browser-audio-report.json'), JSON.stringify(report, null, 2) + '\n');
  process.exitCode = report.fatal || report.tests.some(test => !test.passed && !test.skipped) || report.pageErrors.length || report.consoleErrors.length || report.externalRequests.length ? 1 : 0;
});
