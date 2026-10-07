'use strict';

// Real-interface integration checks. Validated fixtures open progression for UI
// coverage; they make no claim about economic reachability or full-game balance.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const ROOT = path.resolve(process.env.LINGQI_ROOT || path.join(__dirname, '..'));
const BASE = process.env.LINGQI_URL || 'http://127.0.0.1:8787/';
const DIST = path.join(ROOT, 'dist');
const { chromium } = require(path.join(ROOT, 'qa-tools/node_modules/playwright'));
const E = require(path.join(ROOT, 'web/engine.js'));
const C = E.catalog;
const KEY = 'lingqi-save-v2';
const AUDIO_KEY = 'lingqi_audio_v1';
const AUDIO_UI = { music: '#audio-music', effects: '#audio-effects', muted: '#audio-muted' };
const PAGES = ['cultivation', 'character', 'adventure', 'cave', 'fate', 'heaven'];
const report = { startedAt: new Date().toISOString(), url: BASE, tests: [], screenshots: [],
  pageErrors: [], consoleErrors: [], failedRequests: [], badResponses: [], externalRequests: [],
  fixtureNotice: 'Validated unlocked UI fixtures; user actions, native HTMLAudio clocks, offline decoded PCM and persisted game state are checked. Audio calls/counters alone are not evidence of sound.' };
let browser;

function fixture(options = {}) {
  const now = Date.now();
  const state = E.createState(now);
  state.paths.magic = { realm: 1, layer: 7, xp: 100, reserve: 0 };
  state.training = false;
  state.stones = 200000;
  state.tickets = 100;
  state.dust = 3000;
  for (const id of Object.keys(state.materials)) state.materials[id] = 3000;
  for (const [id, item] of Object.entries(C.techniques)) {
    if (item.realm <= 1) state.techniques[id] = { level: 5, branch: 0, spent: 0, resetUsed: false };
  }
  for (const [id, item] of Object.entries(C.treasures)) {
    if (item.realm <= 1) state.ownedTreasures[id] = { level: 1, count: 1, awakening: 0 };
  }
  for (const id of ['heal0', 'shield0', 'purify0']) state.pills[id] = 10;
  for (const [slot, set] of [['weapon', 'thunder'], ['armor', 'body'], ['boots', 'shadow']]) {
    E.modules.economy.addGear(state, E.modules.economy.createGear(state, { slot, set, rarity: 1, tier: 1 }));
  }
  const purchased = E.act(state, { type: 'buyJade', packageId: 'p648' }, now);
  assert.ok(purchased.ok, purchased.message);
  if (options.marketPoor) state.jade = state.dust = 0;
  state.gacha.redPity = 79;
  state.gacha.target = 'gear_sword_weapon';
  state.gacha.fateGuarantee = true;
  state.rngStreams.gacha = 1;
  if (options.worldSeed) state.rngStreams.world = options.worldSeed;
  const configured = E.act(state, { type: 'setLoadout', heart: 'thunder_heart_0',
    skills: ['thunder_skill_0', 'sword_skill_0', 'body_skill_0', 'array_skill_0'], secrets: [], pills: ['heal0', 'shield0', 'purify0'] }, now);
  assert.ok(configured.ok, configured.message);
  const checked = E.validate(state);
  assert.ok(checked.ok, checked.error);
  return checked.state;
}

function observe(page) {
  page.on('pageerror', error => report.pageErrors.push(error.message));
  page.on('console', value => { if (value.type() === 'error') report.consoleErrors.push(value.text()); });
  page.on('requestfailed', request => report.failedRequests.push({ url: request.url(), error: request.failure()?.errorText }));
  page.on('response', response => { if (response.status() >= 400) report.badResponses.push({ url: response.url(), status: response.status() }); });
  page.on('request', request => {
    if (!request.url().startsWith(BASE) && !/^(data:|blob:)/.test(request.url())) report.externalRequests.push(request.url());
  });
}

async function withPage(options, run) {
  const state = fixture(options);
  const width = options.width || 390;
  const context = await browser.newContext({ viewport: { width, height: options.height || 844 },
    deviceScaleFactor: 1, isMobile: width < 600, hasTouch: width < 600,
    reducedMotion: options.reducedMotion || 'no-preference' });
  let page;
  try {
    await context.addInitScript(({ state, key, fixedClock }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state));
      localStorage.setItem('lingqi-age-confirmed', 'yes');
      if (fixedClock) Date.now = () => state.lastAt;
      window.__audioNodes = [];
      window.__audioPlaying = [];
      const NativeAudio = window.Audio;
      function ObservedAudio(...args) {
        // Every returned object is the real native element. Playback methods are
        // never replaced, so browser decode/autoplay failures remain visible.
        const node = new NativeAudio(...args);
        window.__audioNodes.push(node);
        node.addEventListener('playing', () => window.__audioPlaying.push({
          file: node.currentSrc || node.src, at: performance.now(),
          time: node.currentTime, duration: node.duration, volume: node.volume,
          redPhase: document.querySelector('.red-reveal')?.dataset.phase || null
        }));
        return node;
      }
      ObservedAudio.prototype = NativeAudio.prototype;
      Object.setPrototypeOf(ObservedAudio, NativeAudio);
      window.Audio = ObservedAudio;
    }, { state, key: KEY, fixedClock: !!options.fixedClock });
    page = await context.newPage();
    observe(page);
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.Lingqi?.state() && window.LingqiAudio && window.WendaoSelection);
    return await run(page, state);
  } catch (error) {
    if (page) {
      try {
        const name = 'v5-audio-layout-failure-' + report.tests.length + '.png';
        await page.screenshot({ path: path.join(DIST, name) });
        report.screenshots.push(name);
      } catch (_) {}
    }
    throw error;
  } finally { await context.close(); }
}

async function test(name, run) {
  const at = Date.now();
  try {
    const details = await run();
    report.tests.push({ name, passed: true, durationMs: Date.now() - at, details });
    console.log('PASS ' + name);
  } catch (error) {
    report.tests.push({ name, passed: false, durationMs: Date.now() - at, error: error.stack || String(error) });
    console.error('FAIL ' + name + ': ' + error.message);
  }
}

const stateOf = page => page.evaluate(() => window.Lingqi.state());
const audioSnapshot = page => page.evaluate(() => ({ diagnostic: window.LingqiAudio.diagnostics(),
  nodes: window.__audioNodes.map(node => ({ file: node.currentSrc || node.src, duration: node.duration,
    time: node.currentTime, paused: node.paused, ended: node.ended, volume: node.volume,
    loop: node.loop, ready: node.readyState, error: node.error?.code || null })) }));

async function nav(page, id) {
  const modal = page.locator('#modal-layer [role="dialog"]');
  if (await modal.count()) await page.keyboard.press('Escape');
  await page.locator('.nav-bottom button[data-page="' + id + '"]').click();
  assert.equal(await page.locator('.nav-bottom button[data-page="' + id + '"]').getAttribute('aria-current'), 'page');
}

async function payloadButton(page, selector, predicate) {
  const all = page.locator(selector);
  for (let index = 0; index < await all.count(); index++) {
    const node = all.nth(index);
    const payload = await node.evaluate(button => JSON.parse(button.dataset.payload || '{}'));
    if (predicate(payload)) return node;
  }
  throw new Error('No matching UI control: ' + selector);
}

async function layoutTab(page, section, tab) {
  await (await payloadButton(page, 'button[data-ui="layout-tab"]', value => value.section === section && value.tab === tab)).click();
}

async function shopTab(page, tab) {
  await (await payloadButton(page, '#modal-layer button[data-ui="shop-tab"]', value => value.tab === tab)).click();
}

async function resourceButton(page, id, currency) {
  for (let index = 0; index < 10; index++) {
    const buttons = page.locator('#modal-layer button[data-action="buyResource"]');
    for (let item = 0; item < await buttons.count(); item++) {
      const node = buttons.nth(item), payload = await node.evaluate(button => JSON.parse(button.dataset.payload));
      if (payload.item === id && payload.currency === currency) return node;
    }
    const next = page.locator('#modal-layer .list-pagination button').filter({ hasText: '下一页' });
    assert.ok(await next.count() && await next.isEnabled(), 'resource is reachable through real market pagination: ' + id);
    await next.click();
  }
  throw new Error('Resource pagination did not reach ' + id);
}

async function waitMusic(page, name) {
  await page.waitForFunction(name => window.__audioNodes.some(node => node.loop &&
    (node.currentSrc || node.src).endsWith('bgm-' + name + '.mp3') && !node.paused && node.duration > 5 && node.volume > .02), name, { timeout: 6000 });
  const before = await audioSnapshot(page);
  const track = before.nodes.find(node => node.loop && node.file.endsWith('bgm-' + name + '.mp3') && !node.paused);
  await page.waitForTimeout(400);
  const after = await audioSnapshot(page);
  const advanced = after.nodes.find(node => node.loop && node.file === track.file && !node.paused);
  assert.ok(advanced && advanced.time > track.time + .15, name + ' real HTMLAudio currentTime advances');
  assert.ok(advanced.duration > 5 && advanced.volume > .02 && advanced.ready >= 2);
  assert.equal(after.diagnostic.playbackFailures, 0);
  return advanced;
}

async function audibleEffect(page, name) {
  await page.waitForFunction(name => window.__audioNodes.some(node =>
    (node.currentSrc || node.src).endsWith('/' + name + '.mp3') && !node.paused && node.currentTime > .03 && node.duration > .05 && node.volume > .001),
  name, { timeout: 2000 });
  return (await audioSnapshot(page)).nodes.find(node => node.file.endsWith('/' + name + '.mp3') && !node.paused);
}

async function screenshot(page, name) {
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(DIST, name), fullPage: false });
  report.screenshots.push(name);
}

async function settings(page) {
  await page.locator('.top-actions button[data-ui="settings"]').click();
  await page.waitForSelector(AUDIO_UI.music);
}

async function range(page, selector, level) {
  await page.locator(selector).evaluate((node, level) => {
    const minimum = Number(node.min || 0), maximum = Number(node.max || 1);
    node.value = String(minimum + (maximum - minimum) * level);
    node.dispatchEvent(new Event('input', { bubbles: true }));
    node.dispatchEvent(new Event('change', { bubbles: true }));
  }, level);
}

async function pick(page, id) {
  for (let attempt = 0; attempt < 20; attempt++) {
    const option = page.locator('.selection-loadout button[data-selection="pick"][data-selection-value="' + id + '"]');
    if (await option.count()) {
      assert.notEqual(await option.getAttribute('aria-disabled'), 'true', id + ' is available');
      await option.click();
      return;
    }
    const next = page.locator('.selection-loadout button[data-selection="page"][aria-label="下一页"]');
    assert.ok(await next.count() && await next.isEnabled(), 'picker contains ' + id);
    await next.click();
  }
  throw new Error('Picker pagination did not reach ' + id);
}

async function enterDungeon(page, type, id, tier = 0) {
  await nav(page, 'adventure');
  await (await payloadButton(page, 'button[data-ui="dungeon-type"]', value => value.id === type)).click();
  let entry;
  for (let index = 0; index < 20; index++) {
    const buttons = page.locator('#page-content button[data-ui="dungeon"]');
    for (let item = 0; item < await buttons.count(); item++) {
      const button = buttons.nth(item);
      if ((await button.evaluate(node => JSON.parse(node.dataset.payload))).id === id) entry = button;
    }
    if (entry) break;
    const next = page.locator('#page-content .list-pagination button').filter({ hasText: '下一页' });
    assert.ok(await next.count() && await next.isEnabled(), 'real dungeon entry is present: ' + id);
    await next.click();
  }
  assert.ok(entry, 'real dungeon entry found');
  await entry.scrollIntoViewIfNeeded();
  const top = await page.locator('#page-content').evaluate(node => node.scrollTop);
  await entry.click();
  const tierSelect = page.locator('#dungeon-tier');
  if (await tierSelect.count()) await tierSelect.selectOption(String(tier));
  await page.locator('#modal-layer button[data-action="startDungeon"]').click();
  await page.waitForSelector('.game-shell.battle-screen');
  return top;
}

async function encounterGeometry(page, screen) {
  const geometry = await page.evaluate(() => {
    const rect = node => {
      const value = node.getBoundingClientRect();
      return { x: value.x, y: value.y, width: value.width, height: value.height,
        right: value.right, bottom: value.bottom, display: getComputedStyle(node).display };
    };
    return { viewport: { width: innerWidth, height: innerHeight }, width: document.documentElement.scrollWidth,
      screen: document.querySelector('.game-shell').dataset.screen,
      ordinary: ['.nav-bottom', '.topbar', '.hero-banner', '#page-content'].map(selector => {
        const node = document.querySelector(selector); return { selector, hidden: !node || getComputedStyle(node).display === 'none' };
      }), encounter: rect(document.getElementById('encounter-container')),
      skills: Array.from(document.querySelectorAll('button[data-action="useSkill"]')).map(rect) };
  });
  assert.equal(geometry.screen, screen);
  assert.ok(geometry.ordinary.every(item => item.hidden), 'ordinary HUD/main/navigation are hidden during the encounter');
  assert.ok(geometry.width <= geometry.viewport.width + 1, 'encounter has no horizontal overflow');
  assert.ok(geometry.encounter.width >= geometry.viewport.width - 2 && geometry.encounter.height >= geometry.viewport.height - 2,
    'encounter occupies the viewport');
  if (screen === 'battle') {
    assert.equal(geometry.skills.length, 4, 'four genuinely configured skills are shown');
    assert.ok(geometry.skills.every(item => item.width > 30 && item.height > 30 && item.x >= 0 && item.y >= 0 &&
      item.right <= geometry.viewport.width + 1 && item.bottom <= geometry.viewport.height + 1), 'all four skills are visible at 360×640');
  }
  return geometry;
}

(async () => {
  fs.mkdirSync(DIST, { recursive: true });
  browser = await chromium.launch({ headless: true, executablePath: process.env.LINGQI_CHROMIUM || '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-gpu'], env: { ...process.env, FONTCONFIG_FILE: path.join(ROOT, 'qa-tools/fonts.conf') } });
  report.browser = await browser.version();

  await test('first real gesture unlocks actual music playback and its advancing media clock', () => withPage({}, async page => {
    const initial = await audioSnapshot(page);
    assert.equal(initial.diagnostic.unlocked, false);
    assert.ok(initial.nodes.every(node => node.paused || node.volume === 0), 'boot does not emit audio before consent gesture');
    await nav(page, 'cultivation');
    assert.equal(await page.evaluate(() => navigator.userActivation.hasBeenActive), true);
    const home = await waitMusic(page, 'home');
    assert.equal((await audioSnapshot(page)).diagnostic.unlocked, true);
    return { initial, home };
  }));

  await test('settings music/effects/mute controls persist across reload and muted playback stays paused', () => withPage({}, async page => {
    await nav(page, 'cultivation');
    await waitMusic(page, 'home');
    await settings(page);
    await range(page, AUDIO_UI.music, .23);
    await range(page, AUDIO_UI.effects, .31);
    await page.locator(AUDIO_UI.muted).check();
    const expected = { music: .23, effects: .31, muted: true };
    assert.deepEqual(await page.evaluate(() => window.LingqiAudio.getPreferences()), expected);
    assert.deepEqual(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), AUDIO_KEY), expected);
    assert.ok((await audioSnapshot(page)).nodes.every(node => node.paused), 'mute stops every actual audio element');
    await page.reload({ waitUntil: 'networkidle' });
    assert.deepEqual(await page.evaluate(() => window.LingqiAudio.getPreferences()), expected);
    await settings(page);
    assert.ok(await page.locator(AUDIO_UI.muted).isChecked());
    await page.locator(AUDIO_UI.muted).uncheck();
    await waitMusic(page, 'home');
    await range(page, AUDIO_UI.music, 0);
    await range(page, AUDIO_UI.effects, 0);
    assert.deepEqual(await page.evaluate(() => window.LingqiAudio.getPreferences()), { music: 0, effects: 0, muted: false });
    assert.ok((await audioSnapshot(page)).nodes.every(node => node.paused), 'zero volumes stop actual playback');
    return { reloadedPreferences: expected };
  }));

  await test('home/heaven/battle music follows real scenes and rapid navigation bounds concurrency', () => withPage({}, async page => {
    await nav(page, 'cultivation');
    await waitMusic(page, 'home');
    const transitions = [];
    for (const id of ['heaven', 'cave', 'heaven', 'character', 'cultivation', 'heaven']) {
      await nav(page, id);
      const snapshot = await audioSnapshot(page);
      const playing = snapshot.nodes.filter(node => node.loop && !node.paused);
      assert.ok(playing.length <= 2, 'crossfade never accumulates more than two real music elements');
      assert.ok(snapshot.diagnostic.activeEffects.length <= 4);
      transitions.push({ page: id, tracks: playing.map(node => node.file) });
    }
    await waitMusic(page, 'heaven');
    await page.waitForTimeout(900);
    assert.equal((await audioSnapshot(page)).nodes.filter(node => node.loop && !node.paused).length, 1);
    const begun = await page.evaluate(() => window.Lingqi.act('startDungeon', { id: 'boss_2' }));
    assert.ok(begun.ok, begun.message);
    await waitMusic(page, 'battle');
    assert.equal((await audioSnapshot(page)).diagnostic.scene, 'battle');
    const left = await page.evaluate(() => window.Lingqi.act('leaveBattle'));
    assert.ok(left.ok, left.message);
    await waitMusic(page, 'heaven');
    return { transitions };
  }));

  await test('native background pause freezes audio and resume restarts the selected music', () => withPage({}, async page => {
    await nav(page, 'heaven');
    await waitMusic(page, 'heaven');
    await page.evaluate(() => window.onNativeLifecycle('pause'));
    const before = await audioSnapshot(page);
    assert.ok(before.nodes.every(node => node.paused));
    await page.waitForTimeout(500);
    const after = await audioSnapshot(page);
    for (const old of before.nodes.filter(node => node.loop)) {
      const current = after.nodes.find(node => node.file === old.file);
      assert.ok(current && Math.abs(current.time - old.time) < .04, 'background music clock remains paused');
    }
    await page.evaluate(() => window.onNativeLifecycle('resume'));
    return { resumed: await waitMusic(page, 'heaven') };
  }));

  await test('real red draw schedules audible awaken/impact and skipping cancels remaining red sounds', () => withPage({}, async page => {
    await nav(page, 'heaven');
    await waitMusic(page, 'heaven');
    const before = await stateOf(page);
    await (await payloadButton(page, 'button[data-action="draw"]', value => value.count === 1)).click();
    await audibleEffect(page, 'summon-rise');
    await page.waitForSelector('.red-reveal[data-phase="awakening"]', { timeout: 5000 });
    const awaken = await audibleEffect(page, 'red-awaken');
    await page.waitForSelector('.red-reveal[data-phase="impact"]', { timeout: 2000 });
    const impact = await audibleEffect(page, 'red-impact');
    const recorded = await page.evaluate(() => window.__audioPlaying.filter(item => /red-awaken|red-impact/.test(item.file)));
    assert.equal(recorded.filter(item => item.file.endsWith('/red-awaken.mp3')).length, 1);
    assert.equal(recorded.filter(item => item.file.endsWith('/red-impact.mp3')).length, 1);
    assert.ok(recorded[1].at > recorded[0].at + 600, 'impact sound follows its red-scene phase rather than starting with awakening');
    await page.locator('[data-ui="summon-skip"]').click();
    await page.waitForSelector('.reward-grid .reward-card');
    assert.ok((await audioSnapshot(page)).nodes.filter(node => /red-awaken|red-impact/.test(node.file)).every(node => node.paused));
    await page.waitForTimeout(2300);
    assert.equal(await page.evaluate(() => window.__audioPlaying.filter(item => /red-awaken|red-impact/.test(item.file)).length), recorded.length);
    const after = await stateOf(page);
    assert.equal(after.tickets, before.tickets - 1);
    assert.equal(after.gacha.total, before.gacha.total + 1);
    assert.equal(after.gacha.history.at(-1).rarity, 5);
    return { awaken, impact, schedule: recorded };
  }));

  for (const [width, height] of [[360, 640], [390, 480], [1440, 900]]) {
    await test('six navigation targets and compact tabs remain reachable at ' + width + '×' + height, () => withPage({ width, height }, async page => {
      assert.equal(await page.locator('.nav-bottom > button').count(), 6);
      const checks = [];
      for (const id of PAGES) {
        await nav(page, id);
        const geometry = await page.evaluate(() => {
          const main = document.getElementById('page-content').getBoundingClientRect();
          const nav = document.querySelector('.nav-bottom').getBoundingClientRect();
          return { width: innerWidth, height: innerHeight, html: document.documentElement.scrollWidth, body: document.body.scrollWidth,
            mainBottom: main.bottom, navTop: nav.top, buttons: Array.from(document.querySelectorAll('.nav-bottom > button')).map(button => {
              const box = button.getBoundingClientRect(), hit = document.elementFromPoint((box.left + box.right) / 2, (box.top + box.bottom) / 2);
              return { id: button.dataset.page, left: box.left, right: box.right, bottom: box.bottom, reachable: !!hit?.closest('.nav-bottom') };
            }) };
        });
        assert.ok(geometry.html <= geometry.width + 1 && geometry.body <= geometry.width + 1);
        assert.ok(geometry.mainBottom <= geometry.navTop + 1, 'main content scroll area ends above navigation');
        assert.ok(geometry.buttons.every(button => button.left >= -1 && button.right <= geometry.width + 1 && button.bottom <= geometry.height + 1 && button.reachable));
        checks.push({ page: id, geometry });
      }
      await nav(page, 'character');
      await screenshot(page, 'v5-character-' + width + '.png');
      return checks;
    }));
  }

  await test('an in-place facility action retains main scroll and unrelated DOM controls', () => withPage({ height: 480 }, async page => {
    await nav(page, 'cave');
    await layoutTab(page, 'cave', 'facilities');
    const prepared = await page.evaluate(() => {
      const main = document.getElementById('page-content');
      const buttons = Array.from(main.querySelectorAll('button[data-action="upgradeFacility"]')).filter(button => !button.disabled);
      const target = buttons.at(-1);
      if (!target) return null;
      target.scrollIntoView({ block: 'center', behavior: 'instant' });
      window.__preservedLayoutTab = main.querySelector('button[data-ui="layout-tab"]');
      return { payload: JSON.parse(target.dataset.payload), top: main.scrollTop, max: main.scrollHeight - main.clientHeight };
    });
    assert.ok(prepared && prepared.max > 20 && prepared.top > 20, 'fixture exercises a genuinely scrolled action');
    const before = await stateOf(page);
    await (await payloadButton(page, 'button[data-action="upgradeFacility"]', value => value.id === prepared.payload.id)).click();
    await page.waitForTimeout(100);
    const after = await stateOf(page);
    assert.equal(after.facilities[prepared.payload.id], before.facilities[prepared.payload.id] + 1);
    const position = await page.evaluate(() => ({ top: document.getElementById('page-content').scrollTop,
      retained: window.__preservedLayoutTab?.isConnected }));
    assert.ok(position.top > 20 && Math.abs(position.top - prepared.top) <= 2, 'real action does not return the scrolling main panel to the top');
    assert.equal(position.retained, true, 'unrelated tab DOM node survives local updates');
    return { before: prepared, after: position };
  }));

  await test('shop modal refresh retains its body scroll while a real purchase is saved', () => withPage({ height: 480 }, async page => {
    await nav(page, 'heaven');
    await page.evaluate(() => window.Lingqi.showModal('shop'));
    await shopTab(page, 'jade');
    const prepared = await page.evaluate(() => {
      const body = document.querySelector('#modal-layer .modal-body');
      const buttons = Array.from(body.querySelectorAll('button[data-action="buyJade"]'));
      const target = buttons.at(-1); target.scrollIntoView({ block: 'center', behavior: 'instant' });
      return { top: body.scrollTop, max: body.scrollHeight - body.clientHeight, payload: JSON.parse(target.dataset.payload) };
    });
    assert.ok(prepared.top > 20 && prepared.max > 20);
    const before = await stateOf(page);
    await (await payloadButton(page, 'button[data-action="buyJade"]', value => value.packageId === prepared.payload.packageId)).click();
    await page.waitForTimeout(100);
    const after = await stateOf(page);
    assert.equal(after.shop.purchases, before.shop.purchases + 1);
    assert.ok(after.jade > before.jade);
    const top = await page.locator('#modal-layer .modal-body').evaluate(node => node.scrollTop);
    assert.ok(top > 20 && Math.abs(top - prepared.top) <= 2, 'modal refresh preserves scroll after a successful action: ' + prepared.top + ' -> ' + top);
    return { before: prepared.top, after: top };
  }));

  for (const currency of ['jade', 'dust']) {
    await test('resource market purchases a real batch with ' + currency + ' and preserves its scrolled position', () => withPage({ height: 480 }, async page => {
      await nav(page, 'heaven');
      await page.evaluate(() => window.Lingqi.showModal('shop'));
      await shopTab(page, 'resources');
      const market = await page.evaluate(() => window.WendaoEconomy.resourceMarket);
      assert.ok(Array.isArray(market) && market.length >= 5, 'public market exposes ordinary resources');
      const entry = market.filter(item => Object.keys(item.reward?.materials || {}).length).at(-1);
      assert.ok(entry && entry.price[currency] > 0 && entry.reward, 'public price and reward are disclosed');
      await page.locator('#resource-count').selectOption('5');
      const button = await resourceButton(page, entry.id, currency);
      await button.evaluate(node => node.scrollIntoView({ block: 'center', behavior: 'instant' }));
      const top = await page.locator('#modal-layer .modal-body').evaluate(node => node.scrollTop);
      assert.ok(top > 20, 'resource batch purchase occurs in a genuinely scrolled modal');
      const before = await stateOf(page);
      await button.click();
      const after = await stateOf(page);
      assert.equal(after[currency], before[currency] - entry.price[currency] * 5, 'only the disclosed batch price is charged');
      for (const [id, amount] of Object.entries(entry.reward.materials || {})) assert.equal(after.materials[id], before.materials[id] + amount * 5);
      if (entry.reward.stones) assert.equal(after.stones, before.stones + entry.reward.stones * 5);
      const actualTop = await page.locator('#modal-layer .modal-body').evaluate(node => node.scrollTop);
      assert.ok(Math.abs(actualTop - top) <= 2, 'resource purchase refresh retains scroll');
      const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
      assert.equal(saved[currency], after[currency]);
      assert.deepEqual(saved.materials, after.materials);
      await page.reload({ waitUntil: 'networkidle' });
      const restored = await stateOf(page);
      assert.equal(restored[currency], after[currency]);
      assert.deepEqual(restored.materials, after.materials);
      return { entry, count: 5, currency, cost: entry.price[currency] * 5, scroll: actualTop };
    }));
  }

  await test('resource market insufficient currency disables purchase and rejected real actions leave inventory intact', () => withPage({ marketPoor: true }, async page => {
    await nav(page, 'heaven');
    await page.evaluate(() => window.Lingqi.showModal('shop'));
    await shopTab(page, 'resources');
    await page.locator('#resource-count').selectOption('10');
    const controls = [];
    for (let current = 0; current < 10; current++) {
      const buttons = page.locator('#modal-layer button[data-action="buyResource"]');
      assert.ok(await buttons.count() >= 2);
      for (let index = 0; index < await buttons.count(); index++) {
        assert.equal(await buttons.nth(index).isDisabled(), true, 'unaffordable purchase is visibly disabled');
        controls.push(await buttons.nth(index).evaluate(node => JSON.parse(node.dataset.payload)));
      }
      const next = page.locator('#modal-layer .list-pagination button').filter({ hasText: '下一页' });
      if (!await next.count() || !await next.isEnabled()) break;
      await next.click();
    }
    assert.equal(controls.length, 14, 'all seven market items have both disabled currency choices');
    assert.equal(new Set(controls.map(item => item.item)).size, 7);
    const before = await stateOf(page);
    const results = [];
    for (const currency of ['jade', 'dust']) {
      const result = await page.evaluate(currency => window.Lingqi.act('buyResource', { item: 'herb', currency, count: 10 }), currency);
      assert.equal(result.ok, false);
      results.push({ currency, message: result.message });
    }
    const after = await stateOf(page);
    assert.deepEqual(after.materials, before.materials);
    assert.equal(after.jade, before.jade);
    assert.equal(after.dust, before.dust);
    assert.deepEqual(after.rngStreams, before.rngStreams);
    return results;
  }));

  await test('real resource market clicks roll back both currencies and all inventory when Native persistence fails', () => withPage({ fixedClock: true }, async page => {
    await nav(page, 'heaven');
    await page.evaluate(() => window.Lingqi.showModal('shop'));
    await shopTab(page, 'resources');
    await page.locator('#resource-count').selectOption('5');
    const before = await stateOf(page);
    const stored = await page.evaluate(key => localStorage.getItem(key), KEY);
    await page.evaluate(() => { window.Native = { persistSave: () => false }; });
    try {
      for (const currency of ['jade', 'dust']) {
        const button = await resourceButton(page, 'herb', currency);
        assert.equal(await button.isEnabled(), true, 'fixture can afford the purchase before the actual save failure');
        await button.click();
        assert.deepEqual(await stateOf(page), before, 'failed ' + currency + ' purchase restores the whole state, including currency, materials and RNG');
        assert.equal(await page.evaluate(key => localStorage.getItem(key), KEY), stored, 'failed Native commit preserves the prior local save');
      }
    } finally { await page.evaluate(() => { delete window.Native; }); }
    return { count: 5, currencies: ['jade', 'dust'], failedCommitRetainsFullState: true };
  }));

  await test('short-clicking a character equipment icon equips and persists its actual UID', () => withPage({}, async page => {
    await nav(page, 'character');
    await layoutTab(page, 'character', 'gear');
    const before = await stateOf(page);
    const gear = before.bag.find(item => item.slot === 'weapon' && item.uid !== before.equipped.weapon);
    await page.locator('.selection-tile[data-inspect-kind="gear"][data-inspect-id="' + gear.uid + '"]').click();
    assert.equal((await stateOf(page)).equipped.weapon, gear.uid);
    assert.equal(await page.evaluate(({ key }) => JSON.parse(localStorage.getItem(key)).equipped.weapon, { key: KEY }), gear.uid);
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal((await stateOf(page)).equipped.weapon, gear.uid);
    return { equipped: gear.uid };
  }));

  await test('long press and keyboard details describe equipment without equipping it', () => withPage({}, async page => {
    await nav(page, 'character');
    const before = await stateOf(page);
    const gear = before.bag.find(item => item.slot === 'weapon' && item.uid !== before.equipped.weapon);
    const tile = page.locator('.selection-tile[data-inspect-kind="gear"][data-inspect-id="' + gear.uid + '"]');
    await tile.scrollIntoViewIfNeeded();
    const box = await tile.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(550);
    await page.mouse.up();
    assert.ok(await page.locator('.selection-inspect-layer [role="dialog"]').isVisible());
    assert.match(await page.locator('.selection-inspect-layer').innerText(), /部位强化/);
    assert.deepEqual((await stateOf(page)).equipped, before.equipped, 'long press does not activate equip action');
    await page.keyboard.press('Escape');
    const info = page.locator('.selection-info[data-inspect-kind="gear"][data-inspect-id="' + gear.uid + '"]');
    await info.focus();
    await page.keyboard.press('Enter');
    assert.ok(await page.locator('.selection-inspect-layer [role="dialog"]').isVisible());
    assert.deepEqual((await stateOf(page)).equipped, before.equipped, 'keyboard details do not equip');
    await screenshot(page, 'v5-gear-description.png');
    await page.keyboard.press('Escape');
    assert.equal(await info.evaluate(node => node === document.activeElement), true, 'closing details restores keyboard focus');
  }));

  await test('paged icon skill selection saves four real skills, rejects duplicates and survives reload', () => withPage({}, async page => {
    await nav(page, 'character');
    await page.evaluate(() => window.Lingqi.showModal('loadout'));
    await page.locator('[data-selection="category"][data-selection-value="skill"]').click();
    for (let index = 0; index < 4; index++) {
      await page.locator('[data-selection="slot"][data-selection-value="' + index + '"]').click();
      await page.locator('[data-selection="clear"]').click();
    }
    const desired = ['thunder_skill_0', 'array_skill_0', 'body_skill_1', 'thunder_skill_1'];
    for (let index = 0; index < desired.length; index++) {
      await page.locator('[data-selection="slot"][data-selection-value="' + index + '"]').click();
      await pick(page, desired[index]);
    }
    await page.locator('[data-selection="category"][data-selection-value="heart"]').click();
    await pick(page, 'thunder_heart_0');
    await screenshot(page, 'v5-loadout-icons.png');
    await page.locator('button[data-action="setLoadout"]').click();
    let state = await stateOf(page);
    assert.deepEqual(state.loadouts.magic.skills, desired);
    assert.equal(state.loadouts.magic.heart, 'thunder_heart_0');
    assert.deepEqual(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).loadouts.magic.skills, KEY), desired);
    await page.evaluate(() => window.Lingqi.showModal('loadout', { kind: 'skill' }));
    await page.locator('[data-selection="category"][data-selection-value="skill"]').click();
    await page.locator('[data-selection="slot"][data-selection-value="1"]').click();
    const duplicate = page.locator('[data-selection="pick"][data-selection-value="thunder_skill_0"]');
    for (let attempt = 0; !await duplicate.count() && attempt < 10; attempt++) {
      await page.locator('.selection-loadout button[data-selection="page"][aria-label="下一页"]').click();
    }
    assert.equal(await duplicate.getAttribute('aria-disabled'), 'true');
    const previous = await page.locator('#load-skill-1').inputValue();
    await duplicate.focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('#load-skill-1').inputValue(), previous);
    await page.keyboard.press('Escape');
    await page.reload({ waitUntil: 'networkidle' });
    state = await stateOf(page);
    assert.deepEqual(state.loadouts.magic.skills, desired);
    return { skills: desired, heart: state.loadouts.magic.heart };
  }));

  await test('real mobile battle fills the screen; pause/exit freezes combat and restores its original page/scroll', () => withPage({ width: 360, height: 640 }, async page => {
    const baseline = await stateOf(page);
    const top = await enterDungeon(page, 'resource', 'resource_herb');
    await (await payloadButton(page, 'button[data-action="setBattleAuto"]', value => value.enabled === false)).click();
    const geometry = await encounterGeometry(page, 'battle');
    await screenshot(page, 'v5-battle-mobile.png');
    await page.locator('.battle-topbar button[data-ui="encounter-exit"]').click();
    const paused = await stateOf(page);
    assert.equal(paused.battle.paused, true, 'opening the actual exit confirmation pauses combat');
    await page.waitForTimeout(700);
    const frozen = await stateOf(page);
    assert.equal(frozen.battle.time, paused.battle.time);
    assert.deepEqual(frozen.battle.enemies.map(enemy => enemy.hp), paused.battle.enemies.map(enemy => enemy.hp));
    await page.keyboard.press('Escape');
    assert.equal((await stateOf(page)).battle.paused, true, 'cancel keeps the fight paused until the explicit continue action');
    await (await payloadButton(page, 'button[data-action="pauseBattle"]', value => value.paused === false)).click();
    await page.waitForFunction(() => Array.from(document.querySelectorAll('button[data-action="useSkill"]')).some(node => !node.disabled));
    const skill = page.locator('button[data-action="useSkill"]:enabled').first();
    await skill.click();
    assert.ok((await stateOf(page)).stats.skillCasts > baseline.stats.skillCasts, 'a visible skill button performs a real manual cast');
    await page.locator('.battle-topbar button[data-ui="encounter-exit"]').click();
    await page.locator('#modal-layer button[data-action="leaveBattle"]').click();
    const after = await stateOf(page);
    assert.equal(after.battle, null);
    assert.equal(after.stats.manualWins, baseline.stats.manualWins, 'exit grants no victory');
    assert.equal(after.progress.dungeonWins.resource_herb || 0, baseline.progress.dungeonWins.resource_herb || 0);
    assert.equal(await page.locator('.nav-bottom button[data-page="adventure"]').getAttribute('aria-current'), 'page');
    assert.equal(await page.locator('.nav-bottom').isVisible(), true);
    assert.ok(Math.abs(await page.locator('#page-content').evaluate(node => node.scrollTop) - top) <= 2, 'exit restores the original main scroll');
    return { geometry, restoredScroll: top, realSkillCasts: after.stats.skillCasts - baseline.stats.skillCasts };
  }));

  await test('real battle victory settles once and restores the adventure page and scroll', () => withPage({ width: 360, height: 640 }, async page => {
    const baseline = await stateOf(page);
    const top = await enterDungeon(page, 'resource', 'resource_herb');
    await page.waitForFunction(() => !window.Lingqi.state().battle, null, { timeout: 45000 });
    const won = await stateOf(page);
    assert.equal(won.lastBattleResult.win, true);
    assert.equal(won.stats.manualWins, baseline.stats.manualWins + 1);
    assert.equal(won.progress.dungeonWins.resource_herb, (baseline.progress.dungeonWins.resource_herb || 0) + 1);
    assert.equal(won.battleReports.length, baseline.battleReports.length + 1);
    assert.equal(await page.locator('.nav-bottom button[data-page="adventure"]').getAttribute('aria-current'), 'page');
    assert.ok(Math.abs(await page.locator('#page-content').evaluate(node => node.scrollTop) - top) <= 2);
    await page.keyboard.press('Escape');
    await page.reload({ waitUntil: 'networkidle' });
    const reloaded = await stateOf(page);
    assert.equal(reloaded.stats.manualWins, won.stats.manualWins, 'reload does not settle the victory twice');
    assert.deepEqual(reloaded.battleReports, won.battleReports);
    return { time: won.lastBattleResult.time, restoredScroll: top };
  }));

  await test('actual exploration node artwork and choice enter combat, return to exploration, and exit to the original page', () => withPage({ width: 360, height: 640, worldSeed: 8 }, async page => {
    const baseline = await stateOf(page);
    const top = await enterDungeon(page, 'cave', 'cave_0');
    const geometry = await encounterGeometry(page, 'exploration');
    let exploring = await stateOf(page);
    assert.equal(exploring.exploration.node, 0);
    assert.ok(exploring.exploration.choices.some(choice => choice.id === 'battle:fight'), 'seed produces a real combat room without mocked settlement');
    const displayed = await page.locator('.exploration-choices button[data-action="chooseCave"]').evaluateAll(nodes => nodes.map(node => ({
      id: JSON.parse(node.dataset.payload).choice, image: getComputedStyle(node.querySelector('.item-icon,.art-icon,.artwork-icon') || node.firstElementChild).backgroundImage,
      text: node.innerText, width: node.getBoundingClientRect().width
    })));
    assert.deepEqual(displayed.map(item => item.id), exploring.exploration.choices.map(choice => choice.id));
    assert.ok(displayed.every(item => item.image.includes('v6-utilities-atlas.png') && item.text.length > 4 && item.width > 100));
    await screenshot(page, 'v5-exploration-mobile.png');
    await (await payloadButton(page, '.exploration-choices button[data-action="chooseCave"]', value => value.choice === 'battle:fight')).click();
    assert.equal((await stateOf(page)).battle.room, 'battle');
    await encounterGeometry(page, 'battle');
    await page.waitForFunction(() => !window.Lingqi.state().battle, null, { timeout: 45000 });
    exploring = await stateOf(page);
    assert.ok(exploring.exploration, 'room victory returns to the ongoing exploration');
    assert.equal(exploring.exploration.node, 1);
    assert.equal(exploring.exploration.history[0].type, 'battle');
    assert.ok(exploring.exploration.pending.stones > 0 && exploring.exploration.choices.length > 0);
    await page.locator('#modal-layer .modal-footer button[data-ui="close"]').click();
    await encounterGeometry(page, 'exploration');
    await page.locator('.exploration-screen .battle-topbar button[data-ui="encounter-exit"]').click();
    assert.ok(await page.locator('#modal-layer button[data-action="finishCave"]').isVisible());
    await page.locator('#modal-layer button[data-action="finishCave"]').click();
    const after = await stateOf(page);
    assert.equal(after.exploration, null);
    assert.equal(after.stats.manualWins, baseline.stats.manualWins, 'one room win does not award full cave completion');
    assert.equal(after.progress.dungeonWins.cave_0 || 0, baseline.progress.dungeonWins.cave_0 || 0);
    assert.equal(await page.locator('.nav-bottom button[data-page="adventure"]').getAttribute('aria-current'), 'page');
    assert.ok(Math.abs(await page.locator('#page-content').evaluate(node => node.scrollTop) - top) <= 2);
    return { geometry, choices: displayed, completedRoom: exploring.exploration.history[0], restoredScroll: top };
  }));

  for (const options of [{ width: 360, height: 640 }, { width: 1440, height: 900 },
    { width: 360, height: 640, reducedMotion: 'reduce' }]) {
    await test('large boss art and real combat controls fit ' + options.width + '×' + options.height + (options.reducedMotion ? ' with reduced motion' : ''),
      () => withPage(options, async page => {
        await enterDungeon(page, 'boss', 'boss_2');
        await (await payloadButton(page, 'button[data-action="setBattleAuto"]', value => value.enabled === false)).click();
        await page.waitForTimeout(1200);
        const geometry = await encounterGeometry(page, 'battle');
        const boss = await page.locator('.boss-portrait').evaluate(node => {
          const rect = node.getBoundingClientRect(), style = getComputedStyle(node);
          return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, right: rect.right,
            bottom: rect.bottom, image: style.backgroundImage, position: style.backgroundPosition };
        });
        assert.ok(boss.width >= (options.width < 600 ? 200 : 360), 'boss artwork occupies an enlarged visual area');
        assert.ok(boss.image.includes('v3-boss-atlas.png') && boss.height > 100 && boss.x >= 0 && boss.right <= options.width + 1);
        const nameplate = await page.locator('.boss-nameplate').evaluate(node => {
          const rect = node.getBoundingClientRect(), stage = node.closest('.boss-stage').getBoundingClientRect();
          return { x: rect.x, right: rect.right, width: rect.width, stageLeft: stage.left, stageRight: stage.right,
            text: Array.from(node.querySelectorAll('strong,small')).map(child => ({ text: child.textContent,
              width: child.clientWidth, scrollWidth: child.scrollWidth })) };
        });
        assert.ok(nameplate.x >= nameplate.stageLeft - 1 && nameplate.right <= nameplate.stageRight + 1,
          'boss name and HP plate fit inside the stage without clipped right-hand text');
        assert.ok(nameplate.text.every(item => item.scrollWidth <= item.width + 1), 'full boss name and HP numbers are readable');
        await page.locator('.enemy-card[data-action="targetEnemy"]').first().click();
        assert.equal((await stateOf(page)).battle.target, 0, 'actual target UI selects the boss');
        const before = await stateOf(page);
        await page.waitForFunction(() => Array.from(document.querySelectorAll('button[data-action="useSkill"]')).some(node => !node.disabled));
        await page.locator('button[data-action="useSkill"]:enabled').first().click();
        assert.ok((await stateOf(page)).stats.skillCasts > before.stats.skillCasts);
        const pill = await payloadButton(page, 'button[data-action="battlePill"]', value => value.id === 'heal0');
        assert.equal(await pill.isEnabled(), true, 'healing pill is actionable');
        const beforePill = await stateOf(page);
        await pill.click();
        assert.equal((await stateOf(page)).pills.heal0, beforePill.pills.heal0 - 1, 'real pill action consumes exactly one saved pill');
        await (await payloadButton(page, 'button[data-action="pauseBattle"]', value => value.paused === true)).click();
        const paused = await stateOf(page);
        await page.waitForTimeout(400);
        assert.equal((await stateOf(page)).battle.time, paused.battle.time);
        if (options.reducedMotion) {
          const animations = await page.locator('.battle-arena').evaluate(node => node.getAnimations({ subtree: true }).map(animation => ({
            duration: animation.effect?.getTiming().duration, iterations: animation.effect?.getTiming().iterations
          })));
          assert.ok(animations.every(animation => typeof animation.duration === 'number' && animation.duration <= 20), 'reduced motion removes long or sweeping boss animations');
        }
        await screenshot(page, 'v5-boss-' + options.width + (options.reducedMotion ? '-reduced' : '') + '.png');
        await page.locator('.battle-topbar button[data-ui="encounter-exit"]').click();
        assert.equal((await stateOf(page)).battle.paused, true);
        await page.locator('#modal-layer button[data-action="leaveBattle"]').click();
        assert.equal((await stateOf(page)).battle, null);
        return { geometry, boss, nameplate, reducedMotion: options.reducedMotion || false };
      }));
  }

  await test('all image and audio assets decode with correct MIME; offline PCM renders positive RMS', () => withPage({}, async page => {
    const images = fs.readdirSync(path.join(ROOT, 'web/assets')).filter(name => /\.png$/i.test(name));
    const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'web/assets/audio/manifest.json'), 'utf8'));
    assert.equal(images.length, 36, 'preserves all 26 original atlases plus ten new named atlases');
    for (let rarity = 0; rarity < 6; rarity++) assert.ok(images.includes('v6-gear-quality-' + rarity + '.png'));
    for (const kind of ['techniques', 'treasures', 'pills', 'utilities']) assert.ok(images.includes('v6-' + kind + '-atlas.png'));
    assert.equal(Object.keys(manifest.assets).length, 14);
    const decoded = await page.evaluate(async ({ images, assets }) => {
      const pictures = [];
      for (const name of images) {
        const response = await fetch('assets/' + name);
        if (!response.ok || !response.headers.get('content-type')?.startsWith('image/png')) throw Error('Bad image status/MIME: ' + name);
        const bitmap = await createImageBitmap(await response.blob());
        pictures.push({ name, width: bitmap.width, height: bitmap.height }); bitmap.close();
      }
      const audio = [];
      for (const [name, asset] of Object.entries(assets)) {
        const response = await fetch('assets/audio/' + asset.file);
        const type = response.headers.get('content-type');
        if (!response.ok || !type?.startsWith('audio/mpeg')) throw Error('Bad audio status/MIME: ' + name);
        const bytes = await response.arrayBuffer();
        const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))).map(value => value.toString(16).padStart(2, '0')).join('');
        if (digest !== asset.sha256) throw Error('Audio provenance/hash mismatch: ' + name);
        const decoder = new OfflineAudioContext(2, 1, 24000);
        const buffer = await decoder.decodeAudioData(bytes.slice(0));
        const length = Math.min(buffer.length, Math.round(buffer.sampleRate));
        const renderer = new OfflineAudioContext(2, length, buffer.sampleRate);
        const source = renderer.createBufferSource(), gain = renderer.createGain();
        source.buffer = buffer; gain.gain.value = .5; source.connect(gain); gain.connect(renderer.destination); source.start();
        const rendered = await renderer.startRendering();
        let sum = 0, peak = 0;
        for (let channel = 0; channel < rendered.numberOfChannels; channel++) for (const sample of rendered.getChannelData(channel)) {
          sum += sample * sample; peak = Math.max(peak, Math.abs(sample));
        }
        const rms = Math.sqrt(sum / (rendered.length * rendered.numberOfChannels));
        if (!(rms > .001 && peak > .01 && peak <= 1 && Math.abs(buffer.duration - asset.duration) < .25)) throw Error('Audio is silent/invalid: ' + name);
        audio.push({ name, mime: type, duration: buffer.duration, renderedRms: rms, renderedPeak: peak, sha256: digest });
      }
      return { images: pictures, audio };
    }, { images, assets: manifest.assets });
    assert.ok(decoded.images.every(item => item.width > 100 && item.height > 100));
    for (const key of ['pageErrors', 'consoleErrors', 'failedRequests', 'badResponses', 'externalRequests']) assert.deepEqual(report[key], [], key);
    return decoded;
  }));
})().catch(error => {
  report.fatal = error.stack || String(error);
  console.error(error);
}).finally(async () => {
  if (browser) await browser.close();
  report.finishedAt = new Date().toISOString();
  report.passed = !report.fatal && report.tests.length > 0 && report.tests.every(item => item.passed);
  fs.writeFileSync(path.join(DIST, 'browser-audio-layout-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ passed: report.passed, tests: report.tests.length,
    failed: report.tests.filter(item => !item.passed).map(item => item.name), screenshots: report.screenshots }));
  if (!report.passed) process.exitCode = 1;
});
