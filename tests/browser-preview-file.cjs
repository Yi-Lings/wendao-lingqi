'use strict';

// Independent black-box checks of the generated one-file preview. The fixture is
// the documented WendaoPreview.createState, including its explicit supplies/pity.
// Draws, equipment and combat are committed through the game's real UI/engine.
// Managed Chromium may prohibit file: URLs; that check is reported as skipped.
// The supported fallback transports the HTML once over localhost, then goes
// offline. This does not claim that file: navigation has been tested successfully.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');
const { chromium } = require('../qa-tools/node_modules/playwright');
const E = require('../web/engine.js');
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const FILE = process.env.LINGQI_PREVIEW_FILE || path.join(DIST, 'wendao-lingqi-preview.html');
const KEY = 'lingqi-preview-save-v1';
const REGULAR_KEY = 'lingqi-save-v2';
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'web/assets/audio/manifest.json'), 'utf8'));
const images = fs.readdirSync(path.join(ROOT, 'web/assets')).filter(name => /\.png$/i.test(name));
const setAtlases = Array.from({ length: 6 }, (_, rarity) => 'v6-gear-quality-' + rarity + '.png');
const namedAtlases = [...setAtlases, ...['techniques', 'treasures', 'pills', 'utilities'].map(kind => 'v6-' + kind + '-atlas.png')];
const sourceMedia = ['icon.svg', ...images.map(name => 'assets/' + name), ...Object.values(manifest.assets).map(info => 'assets/audio/' + info.file)];
const expectedMedia = sourceMedia.map(name => {
  const bytes = fs.readFileSync(path.join(ROOT, 'web', name));
  return { path: name, bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
});
const ordinary = E.createState(Date.now());
ordinary.player.name = '正常存档保留检查';
ordinary.tickets = 17;
const REGULAR = E.serialize(ordinary);
const legacyRegular = JSON.stringify({ preserved: true, task: 'single-file-preview-qa' });
const report = { startedAt: new Date().toISOString(), file: FILE, tests: [], screenshots: [], pageErrors: [], consoleErrors: [],
  requests: [], failedRequests: [], externalRequests: [], serverRequests: [],
  fixtureNotice: 'Uses the actual validated preview default supplies, unlocked progression, RNG seed 45 and red pity 79. All rewards/costs are settled by the real draw action. No natural-progression/economy claim.',
  fileNavigation: { attempted: false, passed: false }, browser: '/usr/bin/chromium' };
let browser, server, context, page, html, base, networkBeforeReload, equippedUid, drawExpected;
const safe = value => String(value).replace(/data:[^\s"')]+/g, 'data:[embedded payload omitted]').slice(0, 3000);
const urlSummary = url => /^data:/.test(url) ? 'data:' + url.slice(5, url.indexOf(',')) : safe(url);
const stateOf = target => target.evaluate(() => window.Lingqi.state());
const savedOf = target => target.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
const rewardFields = ['tickets', 'jade', 'dust', 'gacha', 'rngStreams', 'bag', 'rewardOverflow', 'ownedTreasures', 'techniques', 'fragments', 'pills', 'materials'];
function rewards(state) {
  const value = Object.fromEntries(rewardFields.map(key => [key, state[key]]));
  value.gacha = { ...value.gacha, history: value.gacha.history.map(({ at, ...entry }) => entry) };
  return value;
}
function observe(target, mode) {
  target.on('pageerror', error => report.pageErrors.push({ mode, error: safe(error.message) }));
  target.on('console', message => { if (message.type() === 'error') report.consoleErrors.push({ mode, error: safe(message.text()) }); });
  target.on('request', request => {
    if (!/^data:/.test(request.url())) report.requests.push({ mode, url: urlSummary(request.url()), type: request.resourceType() });
    if (/^https?:/.test(request.url()) && (!base || !request.url().startsWith(base))) report.externalRequests.push({ mode, url: urlSummary(request.url()) });
  });
  target.on('requestfailed', request => report.failedRequests.push({ mode, url: urlSummary(request.url()), error: request.failure()?.errorText }));
}
async function check(name, run) {
  const started = Date.now();
  try { const details = await run(); report.tests.push({ name, passed: true, durationMs: Date.now() - started, details }); console.log('PASS ' + name); }
  catch (error) {
    report.tests.push({ name, passed: false, durationMs: Date.now() - started, error: safe(error.stack || error) });
    console.error('FAIL ' + name + ': ' + safe(error.message));
    if (page) try { await screenshot('preview-failure-' + report.tests.length + '.png'); } catch (_) {}
  }
}
async function screenshot(name) { await page.screenshot({ path: path.join(DIST, name) }); report.screenshots.push(name); }
async function assertRegular() {
  const values = await page.evaluate(() => ({ current: localStorage.getItem('lingqi-save-v2'), legacy: localStorage.getItem('lingqi-save-v1'), age: localStorage.getItem('lingqi-age-confirmed') }));
  assert.deepEqual(values, { current: REGULAR, legacy: legacyRegular, age: 'regular-age-sentinel' });
}
async function advanceMusic(scene) {
  await page.waitForFunction(scene => {
    const src = WendaoAssetURLs('assets/audio/bgm-' + scene + '.mp3');
    return window.__previewAudioNodes.some(a => a.src === src && a.loop && !a.paused && a.currentTime > .15 && a.volume > .01);
  }, scene, { timeout: 8000 });
  const before = await page.evaluate(scene => {
    const src = WendaoAssetURLs('assets/audio/bgm-' + scene + '.mp3');
    return window.__previewAudioNodes.find(a => a.src === src && a.loop).currentTime;
  }, scene);
  await page.waitForTimeout(500);
  const after = await page.evaluate(scene => {
    const src = WendaoAssetURLs('assets/audio/bgm-' + scene + '.mp3');
    const audio = window.__previewAudioNodes.find(a => a.src === src && a.loop);
    return { currentTime: audio.currentTime, duration: audio.duration, volume: audio.volume, embedded: audio.src.startsWith('data:') };
  }, scene);
  assert.ok(after.currentTime > before + .3, 'real media clock advances');
  assert.ok(after.embedded && after.duration > 1 && after.volume > 0);
  return { scene, advancedSeconds: after.currentTime - before, duration: after.duration };
}
async function selectGear() {
  const next = page.locator('button[data-ui="layout-page"]:visible').filter({ hasText: '下一页' });
  for (let index = 0; index < 8; index++) {
    const candidates = page.locator('.selection-tile[data-action="equipGear"]:visible');
    if (await candidates.count()) {
      const tile = candidates.first();
      return { tile, uid: await tile.getAttribute('data-inspect-id') };
    }
    if (!await next.count() || !await next.isEnabled()) break;
    await next.click();
  }
  throw Error('No selectable actual preview equipment icon');
}
async function chooseSkill(id) {
  const tile = page.locator('[data-selection="pick"][data-selection-value="' + id + '"]');
  const next = page.locator('.selection-loadout [data-selection="page"][aria-label="下一页"]');
  for (let index = 0; !await tile.count() && index < 12; index++) {
    assert.ok(await next.isEnabled(), 'skill exists in the real paginated owned catalog');
    await next.click();
  }
  assert.equal(await tile.getAttribute('aria-disabled'), null);
  await tile.locator('.art-icon').click();
}

(async () => {
  fs.mkdirSync(DIST, { recursive: true });
  html = fs.readFileSync(FILE, 'utf8');
  report.htmlBytes = Buffer.byteLength(html);
  report.sha256 = crypto.createHash('sha256').update(html).digest('hex');
  // Do not select a different browser to bypass the host's managed URL policy.
  browser = await chromium.launch({ headless: true, executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-gpu', '--autoplay-policy=user-gesture-required'] });
  report.browserVersion = browser.version();
  await check('actual file URL navigation obeys the managed browser policy', async () => {
    const fileContext = await browser.newContext();
    const filePage = await fileContext.newPage();
    report.fileNavigation.attempted = true;
    try {
      await filePage.goto(pathToFileURL(FILE).href, { waitUntil: 'load', timeout: 20000 });
      await filePage.waitForFunction(() => window.Lingqi?.state(), null, { timeout: 10000 });
      report.fileNavigation.passed = true;
      return { actualFileNavigation: true };
    } catch (error) {
      if (!error.message.includes('ERR_BLOCKED_BY_ADMINISTRATOR')) throw error;
      report.fileNavigation.reason = 'System Chromium managed URLBlocklist forbids file:. Policy is unchanged. Localhost one-HTML transport plus real offline media/UI checks are separate evidence; user double-click experience remains unverified.';
      report.tests.push({ name: 'double-click file URL startup and persistence', passed: null, skipped: true, reason: report.fileNavigation.reason });
      return { blockedByManagedPolicy: true, policyUnchanged: true };
    } finally { await fileContext.close(); }
  });
  server = http.createServer((request, response) => {
    report.serverRequests.push(request.url);
    if (request.url === '/wendao-lingqi-preview.html') {
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      response.end(html);
    } else { response.writeHead(404); response.end('No auxiliary resources served'); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = 'http://127.0.0.1:' + server.address().port + '/';
  const url = base + 'wendao-lingqi-preview.html';
  context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  await context.addInitScript(({ regular, legacy }) => {
    if (!localStorage.getItem('__previewQaInitialized')) {
      localStorage.setItem('lingqi-save-v2', regular);
      localStorage.setItem('lingqi-save-v1', legacy);
      localStorage.setItem('lingqi-age-confirmed', 'regular-age-sentinel');
      localStorage.setItem('__previewQaInitialized', 'yes');
    }
    const NativeAudio = window.Audio;
    window.__previewAudioNodes = [];
    window.Audio = function (src) { const node = new NativeAudio(src); window.__previewAudioNodes.push(node); return node; };
    window.Audio.prototype = NativeAudio.prototype;
  }, { regular: REGULAR, legacy: legacyRegular });
  page = await context.newPage();
  observe(page, 'single-html-offline');
  await page.goto(url, { waitUntil: 'load', timeout: 45000 });
  await context.setOffline(true);
  await page.waitForFunction(() => window.Lingqi && window.WendaoEmbeddedAssets && window.WendaoAssetURLs, null, { timeout: 10000 });
  await check('one HTML boots the isolated preview after its age confirmation without loading normal saves', async () => {
    const firstGate = await page.locator('#accept-age').count() === 1;
    if (firstGate) {
      await page.locator('#accept-age').check();
      await page.locator('button[data-ui="enter"]').click();
    }
    await page.waitForFunction(() => window.Lingqi?.state(), null, { timeout: 10000 });
    const state = await stateOf(page);
    assert.equal(state.player.name, '试玩行者');
    assert.equal(state.gacha.redPity, 79);
    assert.equal(state.rngStreams.gacha, 45);
    assert.ok(E.validate(state).ok);
    assert.equal(await page.locator('#accept-age').count(), 0);
    assert.ok(await page.locator('.nav-bottom').isVisible());
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('lingqi-preview-save-v1')).player.name), '试玩行者');
    await assertRegular();
    await screenshot('preview-single-html-home.png');
    return { defaultFixture: true, firstGateConfirmedViaUi: firstGate, isolatedSaveKey: KEY, normalSaveUnchanged: true, offline: true };
  });
  await check('acquisition, battle and production settlement, named art and image-layout modules run from inline scripts with no external imports', async () => {
    const modules = await page.evaluate(() => ({
      scripts: [...document.querySelectorAll('script[data-source]')].map(node => node.dataset.source),
      styles: [...document.querySelectorAll('style[data-source]')].map(node => node.dataset.source),
      sources: typeof window.WendaoEquipmentSources?.view,
      rewards: typeof window.WendaoRewards?.render,
      activityRewards: typeof window.WendaoActivityRewards?.render,
      activityModel: typeof window.WendaoActivityRewards?.model,
      artIdentity: typeof window.WendaoArtIdentity?.decorate,
      layout: typeof window.WendaoArtLayout?.geometry,
      external: [...document.querySelectorAll('script[src],link[rel="stylesheet"]')].map(node => node.src || node.href)
    }));
    for (const name of ['equipment-sources.js', 'rewards.js', 'activity-rewards.js', 'art-identity.js', 'art-layout.js']) assert.ok(modules.scripts.includes(name), name + ' is inside the single HTML');
    for (const name of ['rewards.css', 'activity-rewards.css', 'item-art.css', 'art-layout.css']) assert.ok(modules.styles.includes(name));
    assert.equal(modules.sources, 'function'); assert.equal(modules.rewards, 'function'); assert.equal(modules.layout, 'function');
    assert.equal(modules.activityRewards, 'function'); assert.equal(modules.activityModel, 'function'); assert.equal(modules.artIdentity, 'function');
    assert.deepEqual(modules.external, []);
    const acquisition = await page.evaluate(() => WendaoEquipmentSources.view(Lingqi.state(), { set: 'array', slot: 'weapon' }));
    assert.equal(acquisition.forgeChoices.length, 6); assert.equal(acquisition.gacha.target, 'gear_array_weapon');
    assert.ok(acquisition.bosses.length > 0 && acquisition.blueprintSources.length > 0);
    return { ...modules, offlineAcquisitionChoices: acquisition.forgeChoices.length };
  });
  await check('all ' + images.length + ' PNG atlases including all ten named art atlases and preserved original media retain source bytes and paint decoded images', async () => {
    assert.equal(images.length, 36, 'all 26 original PNG files and ten new name-based art files remain');
    for (const name of namedAtlases) assert.ok(images.includes(name), 'complete named artwork exists: ' + name);
    const decoded = await page.evaluate(async entries => {
      const result = [];
      for (const entry of entries) {
        const source = window.WendaoAssetURLs(entry.path);
        if (!source.startsWith('data:image/')) throw Error('Image was not embedded: ' + entry.path);
        const bytes = new Uint8Array(await (await fetch(source)).arrayBuffer());
        const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(value => value.toString(16).padStart(2, '0')).join('');
        if (bytes.length !== entry.bytes || hash !== entry.sha256) throw Error('Embedded image differs from source: ' + entry.path);
        const image = new Image(); image.src = source; await image.decode();
        // Decoding the source data alone missed a real regression: large data
        // URIs exceed Chromium's CSS-variable limit and leave every icon black.
        const probe = document.createElement('div');
        probe.style.backgroundImage = WendaoAssetCSS(entry.path); document.body.append(probe);
        const painted = getComputedStyle(probe).backgroundImage;
        const paintedUrl = painted.match(/^url\(["']?(.*?)["']?\)$/)?.[1]; probe.remove();
        if (!paintedUrl || !/^(blob:|data:image\/)/.test(paintedUrl)) throw Error('Image CSS does not paint: ' + entry.path);
        const paintedBytes = await (await fetch(paintedUrl)).arrayBuffer();
        const paintedHash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', paintedBytes))].map(value => value.toString(16).padStart(2, '0')).join('');
        if (paintedHash !== entry.sha256) throw Error('Painted CSS background differs from original: ' + entry.path);
        const paintedImage = new Image(); paintedImage.src = paintedUrl; await paintedImage.decode();
        if (paintedImage.naturalWidth !== image.naturalWidth || paintedImage.naturalHeight !== image.naturalHeight) throw Error('CSS image dimensions changed: ' + entry.path);
        result.push({ path: entry.path, width: image.naturalWidth, height: image.naturalHeight, sha256: hash, bytes: bytes.length, cssBackgroundPainted: true, runtimeImageScheme: paintedUrl.startsWith('blob:') ? 'blob:' : 'data:' });
      }
      return result;
    }, expectedMedia.filter(entry => entry.path.endsWith('.png') || entry.path === 'icon.svg'));
    assert.equal(decoded.length, images.length + 1);
    assert.ok(decoded.every(entry => entry.width > 0 && entry.height > 0));
    return decoded;
  });
  await check('all 14 embedded MP3s retain source hashes and decode metadata plus audible PCM', async () => {
    const entries = Object.entries(manifest.assets).map(([name, info]) => ({ name, ...info, path: 'assets/audio/' + info.file }));
    const decoded = await page.evaluate(async entries => {
      const result = [], decoder = new OfflineAudioContext(2, 24000, 24000);
      for (const entry of entries) {
        const source = window.WendaoAssetURLs(entry.path);
        if (!source.startsWith('data:audio/')) throw Error('Audio was not embedded: ' + entry.name);
        const buffer = await (await fetch(source)).arrayBuffer();
        const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', buffer))].map(value => value.toString(16).padStart(2, '0')).join('');
        if (hash !== entry.sha256) throw Error('Embedded MP3 differs from source: ' + entry.name);
        const duration = await new Promise((resolve, reject) => {
          const audio = new Audio(source); audio.preload = 'auto';
          const timeout = setTimeout(() => reject(Error('Metadata timed out: ' + entry.name)), 10000);
          audio.onloadedmetadata = () => { clearTimeout(timeout); resolve(audio.duration); };
          audio.onerror = () => { clearTimeout(timeout); reject(Error('MP3 decoder failed: ' + entry.name)); }; audio.load();
        });
        const pcm = await decoder.decodeAudioData(buffer.slice(0));
        const samples = pcm.getChannelData(0); let square = 0;
        for (let index = 0; index < samples.length; index++) square += samples[index] * samples[index];
        const rms = Math.sqrt(square / samples.length);
        if (Math.abs(duration - entry.duration) > .2 || Math.abs(pcm.duration - entry.duration) > .2 || rms < .01) throw Error('Bad audible PCM/duration: ' + entry.name);
        result.push({ name: entry.name, duration, pcmDuration: pcm.duration, sampleRate: pcm.sampleRate, channels: pcm.numberOfChannels, rms, sha256: hash });
      }
      return result;
    }, entries);
    assert.equal(decoded.length, 14);
    return decoded;
  });
  await check('a real click unlocks audible BGM with its media clock advancing offline', async () => {
    await page.locator('.nav-bottom button[data-page="character"]').click();
    assert.ok((await page.evaluate(() => LingqiAudio.diagnostics())).unlocked);
    return advanceMusic('home');
  });
  await check('the offline bundle activates a real four-piece set using only its forged inventory', async () => {
    const before = await stateOf(page);
    await page.locator('button[data-ui="equipment-sets"]').first().click();
    await page.locator('#modal-layer button[data-ui="equipment-sets"]').filter({ hasText: '玄武' }).click();
    assert.match(await page.locator('#modal-layer').innerText(), /护盾|震劲/);
    await page.locator('#modal-layer button[data-action="equipSet"]').click();
    const after = await stateOf(page), attrs = E.attributes(after);
    assert.ok(attrs.sets.body >= 4);
    assert.equal(attrs.shieldPower, .15);
    assert.deepEqual(after.bag, before.bag);
    assert.equal(after.stones, before.stones);
    assert.deepEqual((await savedOf(page)).equipped, after.equipped);
    assert.ok(await page.locator('#modal-layer .build-effect.active').count() >= 2);
    await page.locator('#modal-layer button[data-ui="close"]').click();
    return { pieces: attrs.sets.body, shieldPower: attrs.shieldPower };
  });
  await check('the offline bundle recommends real school roles and atomically saves all build components', async () => {
    await page.locator('button[data-ui="build-recommendations"]').first().click();
    await page.locator('#modal-layer button[data-ui="build-recommendations"]').filter({ hasText: '剑意' }).click();
    const before = await stateOf(page);
    const planned = await page.evaluate(() => WendaoBuilds.plan(Lingqi.state(), 'sword'));
    assert.match(await page.locator('#modal-layer').innerText(), /破甲|剑意|破绽/);
    assert.ok(planned.skills.every(item => item.tags.length && item.reason));
    if (planned.changed) await page.locator('#modal-layer button[data-action="equipRecommendedBuild"]').click();
    const after = await stateOf(page), saved = await savedOf(page);
    assert.deepEqual(after.equipped, planned.equipped);
    assert.deepEqual(after.loadouts[after.route], planned.loadout);
    assert.deepEqual(saved.equipped, after.equipped);
    assert.deepEqual(saved.loadouts, after.loadouts);
    assert.equal(after.stones, before.stones);
    assert.deepEqual(after.bag, before.bag);
    assert.ok(await page.locator('#modal-layer button[data-action="equipRecommendedBuild"]').isDisabled(), 'applied offline recommendation remains stable instead of asking for the same equipment again');
    await page.locator('#modal-layer button[data-ui="build-tab"]').filter({ hasText: '提升目标' }).click();
    assert.ok(await page.locator('#modal-layer .build-goals article').count() > 0);
    await page.locator('#modal-layer button[data-ui="close"]').click();
    return { school: planned.school, skills: after.loadouts[after.route].skills };
  });
  await check('short-clicking an equipment picture equips its actual UID and preserves page position', async () => {
    await page.setViewportSize({ width: 390, height: 640 });
    await page.locator('.nav-bottom button[data-page="character"]').click();
    const { tile, uid } = await selectGear();
    const before = await stateOf(page), gear = before.bag.find(item => item.uid === uid);
    assert.ok(gear && before.equipped[gear.slot] !== uid);
    await tile.scrollIntoViewIfNeeded();
    const scroll = await page.locator('#page-content').evaluate(node => node.scrollTop);
    assert.ok(scroll > 0, 'position preservation is checked after scrolling, not at the page top');
    await tile.locator('.equipment-art').click();
    const after = await stateOf(page);
    assert.equal(after.equipped[gear.slot], uid);
    assert.equal((await savedOf(page)).equipped[gear.slot], uid);
    assert.equal(await page.locator('#page-content').evaluate(node => node.scrollTop), scroll);
    equippedUid = uid;
    await assertRegular();
    await screenshot('preview-single-html-equipment.png');
    return { uid, slot: gear.slot, scrollTop: scroll, normalSaveUnchanged: true };
  });
  await check('long-press opens actual equipment properties without accidental equip or scroll reset', async () => {
    const { tile, uid } = await selectGear(), before = await stateOf(page);
    await tile.scrollIntoViewIfNeeded();
    const scroll = await page.locator('#page-content').evaluate(node => node.scrollTop), box = await tile.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down(); await page.waitForTimeout(570); await page.mouse.up();
    assert.ok(await page.locator('.selection-inspect-layer [role="dialog"]').isVisible());
    assert.match(await page.locator('.selection-inspect-layer').innerText(), /部位强化|套装/);
    assert.deepEqual((await stateOf(page)).equipped, before.equipped);
    await screenshot('preview-single-html-longpress.png');
    await page.locator('.selection-inspect-layer [aria-label="关闭物品详情"]').click();
    assert.equal(await page.locator('#page-content').evaluate(node => node.scrollTop), scroll);
    assert.deepEqual((await stateOf(page)).equipped, before.equipped);
    await page.setViewportSize({ width: 390, height: 844 });
    return { inspectedActualUid: uid, accidentalEquip: false, restoredScrollTop: scroll };
  });
  await check('picture-based skill selection commits the real four-slot loadout', async () => {
    await page.evaluate(() => Lingqi.showModal('loadout', { kind: 'skill' }));
    await page.locator('[data-selection="slot"][data-selection-value="0"]').click();
    await chooseSkill('thunder_skill_0');
    await page.locator('button[data-action="setLoadout"]').click();
    const state = await stateOf(page);
    assert.equal(state.loadouts.magic.skills[0], 'thunder_skill_0');
    assert.equal((await savedOf(page)).loadouts.magic.skills[0], 'thunder_skill_0');
    assert.equal(new Set(state.loadouts.magic.skills).size, state.loadouts.magic.skills.length);
    return { skills: state.loadouts.magic.skills };
  });
  await check('offline production results show saved pills and gear with painted named art and return to original inputs', async () => {
    await page.evaluate(() => Lingqi.showModal('alchemy'));
    await page.locator('#pill-count').selectOption('3');
    const before = await stateOf(page);
    await page.locator('.recipe-card[data-recipe="qi0"] button[data-action="craftPill"]').click();
    const made = await stateOf(page), saved = await savedOf(page);
    assert.equal(made.pills.qi0, before.pills.qi0 + 3, 'three real pills are credited once');
    assert.equal(saved.pills.qi0, made.pills.qi0, 'result appears after the actual preview save');
    assert.ok(await page.locator('[data-activity-settlement="craftPill"]').isVisible());
    assert.equal(await page.locator('.activity-settlement [data-reward-kind="pill"][data-reward-id="qi0"]').getAttribute('data-reward-count'), '3');
    async function assertPaintedNamedResult() {
      await page.waitForFunction(() => [...document.querySelectorAll('.activity-settlement .art-icon')].every(icon => icon.dataset.atlasFit));
      return page.locator('.activity-settlement .art-icon').evaluateAll(async icons => Promise.all(icons.map(async icon => {
        const css = getComputedStyle(icon), source = css.backgroundImage.match(/url\(["']?([^"')]+)["']?\)/)?.[1];
        if (!source || !/^(blob:|data:image\/)/.test(source)) throw Error('Production icon uses an external or missing image');
        const image = new Image(); image.src = source; await image.decode();
        if (!image.naturalWidth || !icon.dataset.artIdentity || !icon.dataset.atlasFit) throw Error('Production icon lost its named identity or native cell');
        if (css.filter !== 'none') throw Error('Production art is recolored instead of using the named source');
        return { identity: icon.dataset.artIdentity, palette: icon.dataset.artPalette, fit: icon.dataset.atlasFit, width: image.naturalWidth, height: image.naturalHeight };
      })));
    }
    const pillArt = await assertPaintedNamedResult();
    assert.ok(pillArt.length > 0);
    await screenshot('preview-single-html-alchemy-result.png');
    await page.locator('button[data-ui="activity-return"]').click();
    assert.equal(await page.locator('.activity-settlement').count(), 0);
    assert.equal(await page.locator('#pill-count').inputValue(), '3', 'original batch selection survives returning');
    assert.equal((await stateOf(page)).pills.qi0, made.pills.qi0, 'return cannot duplicate the payout');
    await page.locator('#modal-layer .modal-header button[data-ui="close"]').click();
    await page.evaluate(() => Lingqi.showModal('forge', { set: 'thunder', slot: 'weapon', rarity: 0 }));
    const forgeBefore = await stateOf(page);
    await page.locator('button[data-action="forgeGear"]').click();
    const forged = await stateOf(page), gear = forged.bag.find(item => !forgeBefore.bag.some(old => old.uid === item.uid));
    assert.ok(gear && gear.set === 'thunder' && gear.slot === 'weapon' && gear.rarity === 0);
    assert.deepEqual((await savedOf(page)).bag, forged.bag, 'actual forged UID is saved');
    assert.ok(await page.locator('[data-activity-settlement="forgeGear"]').isVisible());
    assert.equal(await page.locator('.activity-settlement [data-reward-kind="gear"]').getAttribute('data-reward-id'), gear.uid);
    const gearArt = await assertPaintedNamedResult();
    await page.locator('button[data-ui="activity-return"]').click();
    assert.equal(await page.locator('#forge-set').inputValue(), 'thunder');
    assert.equal(await page.locator('#forge-slot').inputValue(), 'weapon');
    assert.equal(await page.locator('#forge-rarity').inputValue(), '0');
    assert.deepEqual((await stateOf(page)).bag, forged.bag, 'return cannot forge a second piece');
    await page.locator('#modal-layer .modal-header button[data-ui="close"]').click();
    await assertRegular();
    return { pills: 3, forgedUid: gear.uid, pillArt, gearArt, offline: true, normalSaveUnchanged: true };
  });
  await check('entering free practice and clicking a spell executes real combat without rewards', async () => {
    await page.locator('.nav-bottom button[data-page="adventure"]').click();
    const dungeon = page.locator('button[data-ui="dungeon"]:visible').first();
    const id = JSON.parse(await dungeon.getAttribute('data-payload')).id;
    await dungeon.click(); await page.locator('#dungeon-practice').check();
    const before = await stateOf(page);
    await page.locator('button[data-action="startDungeon"]').click();
    await page.waitForSelector('.battle-arena');
    assert.equal((await stateOf(page)).battle.practice, true);
    await page.locator('button[data-action="setBattleAuto"]').click();
    assert.equal((await stateOf(page)).battle.auto, false);
    const music = await advanceMusic('battle');
    const skill = page.locator('button[data-action="useSkill"]:visible:not(:disabled)').first();
    const skillId = JSON.parse(await skill.getAttribute('data-payload')).id;
    const battleBefore = (await stateOf(page)).battle;
    await skill.locator('.art-icon').click();
    const battleAfter = (await stateOf(page)).battle;
    assert.ok(battleAfter, 'preview practice survives long enough for input');
    assert.equal(battleAfter.lastSkill, skillId);
    assert.ok(battleAfter.cooldowns[skillId] > 0);
    assert.ok(battleAfter.temporary.skillCount > (battleBefore.temporary.skillCount || 0));
    await screenshot('preview-single-html-battle.png');
    await page.locator('button[data-ui="encounter-exit"]').click();
    await page.locator('button[data-action="leaveBattle"]').click();
    const after = await stateOf(page);
    assert.equal(after.battle, null);
    assert.equal(after.lastBattleResult.practice, true);
    assert.equal(after.lastBattleResult.rewards, null);
    assert.deepEqual(after.progress, before.progress);
    assert.deepEqual(after.pills, before.pills);
    assert.deepEqual(after.stats, before.stats);
    assert.ok(await page.locator('.battle-settlement[data-settlement="practice"]').isVisible());
    assert.equal(await page.locator('.settlement-card').count(), 0);
    await page.locator('#modal-layer .modal-header button[data-ui="close"]').click();
    await assertRegular();
    return { dungeon: id, skillId, realCooldown: battleAfter.cooldowns[skillId], noRewards: true, music };
  });
  await check('boss artwork dominates its arena and actual auto-combat reaches a genuine practice victory', async () => {
    await page.locator('.nav-bottom button[data-page="adventure"]').click();
    const categories = page.locator('button[data-ui="dungeon-type"]');
    for (let index = 0; index < await categories.count(); index++) {
      const button = categories.nth(index);
      if (JSON.parse(await button.getAttribute('data-payload')).id === 'boss') { await button.click(); break; }
    }
    await page.locator('button[data-ui="dungeon"]:visible').first().click();
    await page.locator('#dungeon-practice').check();
    const before = await stateOf(page);
    await page.locator('button[data-action="startDungeon"]').click();
    await page.locator('.battle-topbar button[data-action="pauseBattle"]').click();
    assert.equal((await stateOf(page)).battle.practice, true);
    assert.equal((await stateOf(page)).battle.paused, true);
    const portrait = page.locator('.boss-arena .boss-main-art');
    assert.ok(await portrait.isVisible());
    const box = await portrait.boundingBox();
    assert.ok(box.width >= 180 && box.height >= 180, 'boss has a large central portrait');
    assert.ok(await portrait.evaluate(node => /(?:blob:|data:image\/)/.test(getComputedStyle(node).backgroundImage)));
    assert.equal(await page.locator('.boss-atmosphere .boss-halo').count(), 1);
    assert.equal(await page.locator('.boss-atmosphere .boss-rune-ring').count(), 1);
    const documentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    assert.ok(documentWidth <= 391);
    await screenshot('preview-single-html-boss.png');
    await page.locator('.battle-topbar button[data-action="pauseBattle"]').click();
    await page.waitForFunction(() => !Lingqi.state().battle && Lingqi.state().lastBattleResult?.practice, null, { timeout: 30000 });
    const after = await stateOf(page);
    assert.equal(after.lastBattleResult.win, true);
    assert.equal(after.lastBattleResult.rewards, null);
    assert.deepEqual(after.progress, before.progress);
    assert.deepEqual(after.pills, before.pills);
    await screenshot('preview-single-html-boss-victory.png');
    await page.locator('#modal-layer .modal-header button[data-ui="close"]').click();
    return { portrait: { width: box.width, height: box.height }, victory: true, realCombatDuration: after.lastBattleResult.time, practiceNoRewards: true };
  });
  await check('a genuine offline boss win displays committed loot cards and fitted source artwork without granting twice', async () => {
    await page.locator('.nav-bottom button[data-page="adventure"]').click();
    await page.locator('button[data-ui="dungeon"]:visible').first().click();
    await page.locator('#dungeon-practice').uncheck();
    const before = await stateOf(page);
    await page.locator('button[data-action="startDungeon"]').click();
    await page.waitForFunction(() => !Lingqi.state().battle && Lingqi.state().lastBattleResult?.win && !Lingqi.state().lastBattleResult.practice, null, { timeout: 45000 });
    await page.waitForSelector('.battle-settlement[data-settlement="win"]');
    const after = await stateOf(page), loot = after.lastBattleResult.rewards;
    assert.equal(after.stats.manualWins, before.stats.manualWins + 1);
    assert.equal(loot.gear.length, 1);
    const uid = loot.gear[0].uid;
    assert.ok(after.bag.some(gear => gear.uid === uid) || after.rewardOverflow.some(gear => gear.uid === uid));
    assert.equal(await page.locator('.settlement-card[data-reward-kind="gear"][data-reward-id="' + uid + '"]').count(), 1);
    const expected = await page.evaluate(() => WendaoRewards.model(Lingqi.state().lastBattleResult));
    assert.equal(await page.locator('.settlement-card').count(), expected.items.length);
    assert.match(await page.locator('.settlement-status').innerText(), /自动入账/);
    if (after.lastBattleResult.first) assert.ok(await page.locator('.settlement-first').isVisible());
    await page.waitForFunction(() => [...document.querySelectorAll('.settlement-card .art-icon')].every(node => node.classList.contains('atlas-fit')));
    const painted = await page.locator('.settlement-card .art-icon').evaluateAll(nodes => nodes.map(node => ({ image: getComputedStyle(node).backgroundImage, fit: node.dataset.atlasFit, size: getComputedStyle(node).backgroundSize })));
    assert.ok(painted.length > 0 && painted.every(item => /^(?:url\(["']?(?:blob:|data:image\/))/.test(item.image) && item.fit));
    const inventory = rewards(after), saved = await savedOf(page);
    assert.deepEqual(saved.bag, after.bag); assert.deepEqual(saved.rewardOverflow, after.rewardOverflow);
    await page.locator('.settlement-card[data-reward-kind="gear"] .settlement-inspect').click();
    assert.ok(await page.locator('.selection-inspect-layer [role="dialog"]').isVisible());
    await page.locator('.selection-inspect-layer [aria-label="关闭物品详情"]').click();
    assert.deepEqual(rewards(await stateOf(page)), inventory, 'inspection does not grant already committed loot again');
    await screenshot('preview-single-html-real-boss-rewards.png');
    await page.locator('#modal-layer .modal-header button[data-ui="close"]').click();
    await assertRegular();
    return { boss: after.lastBattleResult.entry, equipment: uid, actualRewards: expected.items.length, inlinePresentation: true, fittedEmbeddedArtwork: painted.length };
  });
  await check('the resource market shows all seven goods and both currencies settle the advertised real purchase', async () => {
    await page.locator('.nav-bottom button[data-page="heaven"]').click();
    await page.locator('button[data-ui="shop"]:visible').click();
    const ids = new Set();
    for (let index = 0; index < 5; index++) {
      for (const id of await page.locator('.resource-market-card').evaluateAll(nodes => nodes.map(node => node.dataset.resource))) ids.add(id);
      const next = page.locator('#modal-layer button[data-ui="modal-page"]').filter({ hasText: '下一页' });
      if (!await next.count() || !await next.isEnabled()) break;
      await next.click();
    }
    assert.deepEqual([...ids].sort(), (await page.evaluate(() => WendaoEconomy.resourceMarket.map(item => item.id))).sort());
    assert.equal(ids.size, 7);
    while (true) {
      const previous = page.locator('#modal-layer button[data-ui="modal-page"]').filter({ hasText: '上一页' });
      if (!await previous.count() || !await previous.isEnabled()) break;
      await previous.click();
    }
    const purchases = [];
    for (const [currency, count] of [['jade', 5], ['dust', 1]]) {
      await page.locator('#resource-count').selectOption(String(count));
      const card = page.locator('.resource-market-card').first(), item = await card.getAttribute('data-resource');
      const prediction = await page.evaluate(({ item, currency, count }) => {
        const before = Lingqi.state(), state = JSON.parse(JSON.stringify(before));
        const action = { type: 'buyResource', item, currency, count };
        const quote = IdleEngine.costs(state, action.type, action), result = IdleEngine.act(state, action, Date.now());
        return { before, state, quote, result };
      }, { item, currency, count });
      assert.ok(prediction.result.ok, prediction.result.message);
      const buttons = card.locator('button[data-action="buyResource"]');
      let button;
      for (let index = 0; index < await buttons.count(); index++) if (JSON.parse(await buttons.nth(index).getAttribute('data-payload')).currency === currency) button = buttons.nth(index);
      assert.ok(button && await button.isEnabled()); await button.click();
      const actual = await stateOf(page), saved = await savedOf(page);
      for (const key of ['stones', 'materials', 'jade', 'dust']) {
        assert.deepEqual(actual[key], prediction.state[key], key + ' real purchase settlement');
        assert.deepEqual(saved[key], actual[key], key + ' purchase persisted');
      }
      assert.ok(actual[currency] < prediction.before[currency]);
      purchases.push({ item, currency, count, paid: prediction.before[currency] - actual[currency], quote: prediction.quote });
    }
    await assertRegular();
    await screenshot('preview-single-html-resource-market.png');
    await page.locator('#modal-layer .modal-header button[data-ui="close"]').click();
    return { goods: [...ids], purchases, normalSaveUnchanged: true };
  });
  await check('the real ten-draw commits exactly the predicted costs, inventory, RNG and pity before animation', async () => {
    await page.locator('.nav-bottom button[data-page="heaven"]').click();
    const music = await advanceMusic('heaven');
    const expected = await page.evaluate(() => {
      const before = Lingqi.state(), state = JSON.parse(JSON.stringify(before));
      const result = IdleEngine.act(state, { type: 'draw', count: 10 }, Date.now());
      return { before, state, result };
    });
    assert.ok(expected.result.ok, expected.result.message);
    const buttons = page.locator('button[data-action="draw"]:visible');
    let drawButton;
    for (let index = 0; index < await buttons.count(); index++) if (JSON.parse(await buttons.nth(index).getAttribute('data-payload')).count === 10) drawButton = buttons.nth(index);
    assert.ok(drawButton); await drawButton.click();
    const actual = await stateOf(page), saved = await savedOf(page);
    assert.deepEqual(rewards(actual), rewards(expected.state));
    assert.deepEqual(rewards(saved), rewards(actual));
    assert.equal(actual.tickets, expected.before.tickets - 10);
    assert.equal(actual.gacha.total, expected.before.gacha.total + 10);
    assert.equal(actual.dust, expected.before.dust + 20);
    drawExpected = expected;
    return { actualResults: expected.result.data.results.map(item => ({ category: item.category, id: item.id, uid: item.uid, rarity: item.rarity })), ticketsCharged: 10, settledAndSavedBeforeAnimation: true, music };
  });
  await check('each genuine red reward receives its own full-screen animation and matching embedded artwork', async () => {
    assert.ok(drawExpected, 'preceding real ten-draw succeeded');
    const red = drawExpected.result.data.results.filter(item => item.rarity === 5);
    assert.ok(red.length >= 1);
    const details = [];
    for (let index = 0; index < red.length; index++) {
      await page.waitForSelector('.red-reveal[data-red-index="' + index + '"]', { timeout: 8000 });
      await page.waitForFunction(index => document.querySelector('.red-reveal')?.dataset.redIndex === String(index) && document.querySelector('.red-reveal')?.dataset.phase === 'revealed', index, { timeout: 4000 });
      const scene = page.locator('.red-reveal'), card = scene.locator('.red-card');
      assert.equal(await scene.locator('.reward-card').count(), 1);
      assert.equal(await card.getAttribute('data-prize-id'), red[index].id);
      if (red[index].uid) assert.equal(await card.getAttribute('data-prize-uid'), red[index].uid);
      assert.equal((await scene.locator('.red-prize-name').innerText()).trim(), await page.evaluate(item => WendaoEquipmentArt.rewardLabel(item), red[index]));
      const art = await card.locator('.art-icon').evaluate(async node => {
        const background = getComputedStyle(node).backgroundImage;
        const url = background.match(/^url\(["']?(.*?)["']?\)$/)?.[1];
        if (!url || !/^(data:image\/|blob:)/.test(url)) return { embedded: false };
        const bytes = await (await fetch(url)).arrayBuffer();
        const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(value => value.toString(16).padStart(2, '0')).join('');
        return { embedded: true, sha256: hash, rarity: node.dataset.artRarity };
      });
      assert.ok(art.embedded);
      assert.ok(expectedMedia.some(entry => entry.path.endsWith('.png') && entry.sha256 === art.sha256), 'painted artwork blob retains actual source atlas bytes');
      const box = await scene.boundingBox();
      assert.ok(box.x <= 1 && box.y <= 1 && box.width >= 389 && box.height >= 843);
      if (index === 0) await screenshot('preview-single-html-red.png');
      assert.deepEqual(rewards(await stateOf(page)), rewards(drawExpected.state), 'presentation never grants rewards twice');
      details.push({ id: red[index].id, uid: red[index].uid, embeddedArt: true, fullScreen: true });
      await page.locator('button[data-ui="red-reveal-next"]').click();
    }
    assert.equal(await page.locator('.reward-grid .reward-card').count(), 10);
    await page.locator('button[data-ui="close"].primary').click();
    return { reds: details, allTenActualRewardsShown: true };
  });
  networkBeforeReload = [...report.serverRequests];
  await check('offline interaction performs no secondary HTTP request or external network access', async () => {
    assert.deepEqual(networkBeforeReload, ['/wendao-lingqi-preview.html']);
    assert.equal(report.externalRequests.length, 0);
    const nonDocuments = report.requests.filter(item => item.mode === 'single-html-offline' && /^https?:/.test(item.url) && item.type !== 'document');
    assert.deepEqual(nonDocuments, []);
    const failed = report.failedRequests.filter(item => item.mode === 'single-html-offline');
    assert.deepEqual(failed, []);
    return { initialHtmlHttpRequests: 1, secondaryHttpRequests: 0, externalRequests: 0, networkOfflineDuringAllInteractions: true };
  });
  await check('reload restores preview equipment, configuration and real draw rewards while normal saves stay untouched', async () => {
    const before = await stateOf(page);
    // A second localhost HTML request tests actual reload and persistence. Avoid
    // copying the large HTML through CDP route fulfillment; media stay embedded.
    await context.setOffline(false);
    await page.reload({ waitUntil: 'load', timeout: 45000 });
    await context.setOffline(true);
    await page.waitForFunction(() => window.Lingqi?.state());
    const after = await stateOf(page);
    assert.deepEqual(rewards(after), rewards(before));
    assert.deepEqual(after.equipped, before.equipped);
    assert.deepEqual(after.loadouts, before.loadouts);
    assert.ok(Object.values(after.equipped).includes(equippedUid));
    assert.equal(after.gacha.total, drawExpected.before.gacha.total + 10);
    await assertRegular();
    return { realReload: true, additionalHtmlRequests: 1, previewSaveRestored: true, normalSaveUnchanged: true };
  });
  await check('all embedded media decode with setContent and the browser network offline', async () => {
    const offlineContext = await browser.newContext();
    await offlineContext.setOffline(true);
    const offlinePage = await offlineContext.newPage();
    observe(offlinePage, 'opaque-offline-media');
    const attempts = [];
    offlinePage.on('request', request => { if (/^https?:/.test(request.url())) attempts.push(urlSummary(request.url())); });
    try {
      await offlinePage.setContent(html, { waitUntil: 'load', timeout: 45000 });
      const result = await offlinePage.evaluate(async ({ imagePaths, audio }) => {
        for (const name of imagePaths) { const image = new Image(); image.src = WendaoAssetURLs(name); await image.decode(); }
        const decoder = new OfflineAudioContext(2, 24000, 24000);
        for (const info of audio) await decoder.decodeAudioData(await (await fetch(WendaoAssetURLs('assets/audio/' + info.file))).arrayBuffer());
        return { imagesDecoded: imagePaths.length, mp3Decoded: audio.length };
      }, { imagePaths: ['icon.svg', ...images.map(name => 'assets/' + name)], audio: Object.values(manifest.assets) });
      assert.equal(attempts.length, 0);
      assert.deepEqual(result, { imagesDecoded: images.length + 1, mp3Decoded: Object.keys(manifest.assets).length });
      return { ...result, offlineBeforeContent: true, httpRequests: 0, persistenceScope: 'Media independence only: opaque setContent origin has no writable localStorage.' };
    } finally { await offlineContext.close(); }
  });
  await check('desktop and small-mobile preview layouts have no horizontal document overflow', async () => {
    const results = [];
    for (const viewport of [{ width: 320, height: 568 }, { width: 1280, height: 800 }]) {
      await page.setViewportSize(viewport);
      const geometry = await page.evaluate(() => ({ width: innerWidth, documentWidth: document.documentElement.scrollWidth, bodyWidth: document.body.scrollWidth }));
      assert.ok(geometry.documentWidth <= geometry.width + 1 && geometry.bodyWidth <= geometry.width + 1);
      await screenshot('preview-single-html-home-' + viewport.width + '.png');
      results.push(geometry);
    }
    return results;
  });
  await check('the completed offline session has zero JavaScript errors and zero audio playback failures', async () => {
    assert.deepEqual(report.pageErrors, []);
    assert.deepEqual(report.consoleErrors, []);
    assert.deepEqual(report.externalRequests, []);
    const audio = await page.evaluate(() => LingqiAudio.diagnostics());
    assert.equal(audio.playbackFailures, 0);
    return { javascriptErrors: 0, consoleErrors: 0, playbackFailures: 0 };
  });
})().catch(error => { report.fatal = safe(error.stack || error); console.error(safe(error.stack || error)); }).finally(async () => {
  if (context) await context.close();
  if (browser) await browser.close();
  if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  report.completedAt = new Date().toISOString();
  report.summary = { passed: report.tests.filter(item => item.passed === true).length, failed: report.tests.filter(item => item.passed === false).length,
    skipped: report.tests.filter(item => item.skipped).length, externalRequests: report.externalRequests.length };
  fs.writeFileSync(path.join(DIST, 'browser-preview-file-report.json'), JSON.stringify(report, null, 2) + '\n');
  process.exitCode = report.fatal || report.tests.some(item => item.passed === false) ? 1 : 0;
});
