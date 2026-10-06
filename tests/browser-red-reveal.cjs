'use strict';

// UI integration fixtures open the draw UI and set a tested RNG seed/pity state.
// These checks do not establish economic reachability or full-game balance.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const ROOT = path.resolve(process.env.LINGQI_ROOT || path.join(__dirname, '..'));
const BASE = process.env.LINGQI_URL || 'http://127.0.0.1:8787/';
const DIST = path.join(ROOT, 'dist');
const playwrightPath = path.join(ROOT, 'qa-tools/node_modules/playwright');
// Video is optional; missing ffmpeg must never prevent the functional checks.
const descriptors = require(path.join(fs.realpathSync(playwrightPath), '../playwright-core/browsers.json')).browsers;
const ffmpegRevision = descriptors.find(item => item.name === 'ffmpeg')?.revision;
const localBrowserCache = path.join(ROOT, 'qa-tools/browsers');
const defaultBrowserCache = path.join(process.env.XDG_CACHE_HOME || path.join(os.homedir(), '.cache'), 'ms-playwright');
const hasVideoTool = directory => {
  if (process.platform !== 'linux' || !ffmpegRevision) return false;
  try { fs.accessSync(path.join(directory, 'ffmpeg-' + ffmpegRevision, 'ffmpeg-linux'), fs.constants.X_OK); return true; }
  catch (_) { return false; }
};
if (!process.env.PLAYWRIGHT_BROWSERS_PATH && !hasVideoTool(defaultBrowserCache) && hasVideoTool(localBrowserCache)) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = localBrowserCache;
}
const videoAvailable = hasVideoTool(process.env.PLAYWRIGHT_BROWSERS_PATH || defaultBrowserCache);
const { chromium } = require(playwrightPath);
const E = require(path.join(ROOT, 'web/engine.js'));
const KEY = 'lingqi-save-v2';
const AGE = 'lingqi-age-confirmed';
const NOW = Date.now();
const clone = value => JSON.parse(JSON.stringify(value));
const rewardFields = ['tickets', 'jade', 'dust', 'gacha', 'rngStreams', 'bag', 'rewardOverflow',
  'ownedTreasures', 'techniques', 'fragments', 'pills', 'materials'];
const rewards = state => Object.fromEntries(rewardFields.map(key => [key, state[key]]));
const scene = 'section.red-reveal[data-animation="red-reveal"]';
const report = {
  startedAt: new Date().toISOString(), url: BASE, tests: [], screenshots: [], videos: [],
  pageErrors: [], consoleErrors: [], failedRequests: [], badResponses: [], externalRequests: [],
  fixtureNotice: 'Validated UI integration fixtures set unlocked progression, pity and RNG seeds. All rewards are settled by real draw/drawWithJade actions and checked against persisted state; no economic reachability claim.'
};
if (!videoAvailable) report.videoSkippedReason = 'Optional Playwright ffmpeg is unavailable; functional assertions and screenshots still run.';
let browser;

function fixture({ seed = 1, redPity = 79, target = 'gear_sword_weapon' } = {}) {
  const state = E.createState(NOW);
  state.paths.magic = { realm: 1, layer: 1, xp: 0, reserve: 0 };
  state.training = false;
  state.tickets = 100;
  const purchase = E.act(state, { type: 'buyJade', packageId: 'p648' }, NOW);
  assert.ok(purchase.ok, purchase.message);
  state.gacha.redPity = redPity;
  state.gacha.target = target;
  state.gacha.fateGuarantee = !!target;
  state.rngStreams.gacha = seed;
  const validated = E.validate(state);
  assert.ok(validated.ok, validated.error);
  return validated.state;
}

function findFixture(kind) {
  for (let seed = 1; seed <= 5000; seed++) {
    const candidate = fixture({ seed, redPity: kind === 'multiple-red' ? 79 : 0,
      target: kind === 'multiple-red' ? 'gear_sword_weapon' : null });
    const result = E.act(clone(candidate), { type: 'draw', count: kind === 'multiple-red' ? 10 : 1 }, NOW);
    assert.ok(result.ok, result.message);
    const red = result.data.results.filter(item => item.rarity === 5);
    if (kind === 'multiple-red' ? red.length >= 2 && red[0].id !== red[1].id : red.length === 0) {
      return { state: candidate, seed, results: result.data.results };
    }
  }
  throw new Error('No real draw seed found for ' + kind);
}

function observe(page) {
  page.on('pageerror', error => report.pageErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') report.consoleErrors.push(message.text()); });
  page.on('requestfailed', request => report.failedRequests.push({ url: request.url(), error: request.failure()?.errorText }));
  page.on('response', response => { if (response.status() >= 400) report.badResponses.push({ url: response.url(), status: response.status() }); });
  page.on('request', request => {
    if (!request.url().startsWith(BASE) && !/^(data:|blob:)/.test(request.url())) report.externalRequests.push(request.url());
  });
}

async function withFixture(state, options, run) {
  const width = options.width || 390;
  const height = options.height || 844;
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1,
    isMobile: width < 600, hasTouch: width < 600, reducedMotion: options.reducedMotion || 'no-preference',
    ...(options.video && videoAvailable ? { recordVideo: { dir: path.join(DIST, 'red-reveal-videos'), size: { width, height } } } : {}) });
  let page;
  let video;
  try {
    const validated = E.validate(state);
    assert.ok(validated.ok, validated.error);
    await context.addInitScript(({ fixture, key, age, now }) => {
      // Freeze only the economy clock. Real browser timers and CSS animation clocks still run.
      Date.now = () => now;
      if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(fixture));
      localStorage.setItem(age, 'yes');
    }, { fixture: validated.state, key: KEY, age: AGE, now: NOW });
    page = await context.newPage();
    video = page.video();
    observe(page);
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.Lingqi?.state() && window.WendaoEquipmentArt);
    await page.evaluate(() => {
      window.__redObserved = [];
      window.__sawOrdinaryRitual = false;
      new MutationObserver(() => {
        if (document.querySelector('[data-animation="summoning"]')) window.__sawOrdinaryRitual = true;
        const node = document.querySelector('section.red-reveal');
        if (node) {
          const value = { index: Number(node.dataset.redIndex), phase: node.dataset.phase };
          const previous = window.__redObserved.at(-1);
          if (!previous || previous.index !== value.index || previous.phase !== value.phase) window.__redObserved.push(value);
        }
      }).observe(document.getElementById('modal-layer'), { childList: true, subtree: true, attributes: true });
    });
    return await run(page);
  } catch (error) {
    if (page) {
      try {
        const name = 'v4-red-failure-' + report.tests.length + '.png';
        await page.screenshot({ path: path.join(DIST, name) });
        report.screenshots.push(name);
      } catch (_) {}
    }
    throw error;
  } finally {
    await context.close();
    if (video) {
      const name = 'v4-red-mobile.webm';
      await video.saveAs(path.join(DIST, name));
      report.videos.push(name);
    }
  }
}

async function test(name, run) {
  const started = Date.now();
  try {
    const details = await run();
    report.tests.push({ name, passed: true, durationMs: Date.now() - started, details });
    console.log('PASS ' + name);
  } catch (error) {
    report.tests.push({ name, passed: false, durationMs: Date.now() - started, error: error.stack || String(error) });
    console.error('FAIL ' + name + ': ' + error.message);
  }
}

const stateOf = page => page.evaluate(() => window.Lingqi.state());
const savedOf = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);

async function clickAction(page, type, count) {
  const buttons = page.locator('button[data-action="' + type + '"]:visible');
  for (let index = 0; index < await buttons.count(); index++) {
    const button = buttons.nth(index);
    if ((await button.evaluate(node => JSON.parse(node.dataset.payload || '{}'))).count === count) {
      assert.ok(await button.isEnabled(), type + ' button enabled');
      await button.click();
      return;
    }
  }
  throw new Error('No draw button for ' + type + '/' + count);
}

async function draw(page, type, count = 1) {
  await page.locator('button[data-page="heaven"]').click();
  if (type === 'drawWithJade') {
    await page.locator('button[data-ui="shop"]').click();
    const tabs = page.locator('#modal-layer button[data-ui="shop-tab"]');
    for (let index = 0; index < await tabs.count(); index++) {
      const button = tabs.nth(index);
      if ((await button.evaluate(node => JSON.parse(node.dataset.payload))).tab === 'exchange') { await button.click(); break; }
    }
  }
  const before = await stateOf(page);
  const expected = clone(before);
  const result = E.act(expected, { type, count }, NOW);
  assert.ok(result.ok, result.message);
  await clickAction(page, type, count);
  const committed = await stateOf(page);
  assert.deepEqual(rewards(committed), rewards(expected), 'real UI action matches actual engine settlement');
  assert.deepEqual(rewards(await savedOf(page)), rewards(committed), 'all rewards, costs, RNG and pity persisted before animation');
  assert.equal(committed.gacha.total, before.gacha.total + count);
  assert.equal(committed.dust, before.dust + count * 2);
  assert.equal(committed.tickets, before.tickets - (type === 'draw' ? count : 0));
  assert.equal(committed.jade, before.jade - (type === 'drawWithJade' ? count * 60 : 0));
  return { before, committed, results: result.data.results };
}

async function unchanged(page, committed) {
  assert.deepEqual(rewards(await stateOf(page)), rewards(committed), 'presentation never settles rewards again');
  assert.deepEqual(rewards(await savedOf(page)), rewards(committed), 'persisted reward transaction remains unchanged');
}

async function waitRed(page, index = 0, phase) {
  await page.waitForSelector(scene + '[data-red-index="' + index + '"]', { timeout: 6000 });
  if (phase) await page.waitForFunction(({ index, phase }) => {
    const node = document.querySelector('section.red-reveal');
    return node?.dataset.redIndex === String(index) && node.dataset.phase === phase;
  }, { index, phase }, { timeout: 3500 });
}

async function assertRedPrize(page, entry, committed) {
  assert.equal(entry.rarity, 5);
  assert.equal(await page.locator(scene + ' .red-card.reward-card.rarity-5').count(), 1);
  assert.equal(await page.locator(scene + ' .reward-card').count(), 1, 'each red scene singles out only one red reward');
  const binding = await page.locator(scene + ' .red-card').evaluate(node => ({ id: node.dataset.prizeId, uid: node.dataset.prizeUid }));
  if (binding.id) assert.equal(binding.id, entry.id);
  if (binding.uid) assert.equal(binding.uid, entry.uid);
  const label = await page.evaluate(item => window.WendaoEquipmentArt.rewardLabel(item), entry);
  assert.equal((await page.locator('.red-prize-name').innerText()).trim(), label, 'red title matches the stored reward identity');
  if (entry.category === 'gear') {
    const gear = committed.bag.concat(committed.rewardOverflow).find(item => item.uid === entry.uid);
    assert.ok(gear, 'awarded equipment UID exists in committed inventory');
    assert.equal('gear_' + gear.set + '_' + gear.slot, entry.id);
    const art = await page.evaluate(item => window.WendaoEquipmentArt.gearArt(item), gear);
    const displayed = await page.locator(scene + ' .red-card').evaluate(node => [node, ...node.querySelectorAll('*')].map(item => {
      const css = getComputedStyle(item);
      return { file: css.backgroundImage, position: css.backgroundPosition, size: css.backgroundSize };
    }));
    assert.ok(displayed.some(item => item.file.includes(art.file) && item.position.split(',')[0].trim() === art.position && item.size.split(',')[0].trim() === art.size),
      'red equipment close-up uses the saved rarity, slot and school atlas cell: ' + JSON.stringify(art));
  }
}

async function geometry(page) {
  const result = await page.evaluate(() => {
    const selectors = ['.red-reveal', '.red-card', '.red-prize-name', '.red-actions button', '.red-topline button'];
    return { width: innerWidth, height: innerHeight, html: document.documentElement.scrollWidth, body: document.body.scrollWidth,
      bounds: selectors.map(selector => {
        const node = document.querySelector(selector);
        const box = node.getBoundingClientRect();
        return { selector, left: box.left, right: box.right, top: box.top, bottom: box.bottom };
      }) };
  });
  assert.ok(result.html <= result.width + 1 && result.body <= result.width + 1, 'no horizontal viewport overflow');
  for (const box of result.bounds) {
    assert.ok(box.left >= -1 && box.right <= result.width + 1 && box.top >= -1 && box.bottom <= result.height + 1,
      'visible red-scene content fits viewport: ' + JSON.stringify(box));
  }
  const full = result.bounds[0];
  assert.ok(Math.abs(full.left) <= 1 && Math.abs(full.top) <= 1 && Math.abs(full.right - result.width) <= 1 && Math.abs(full.bottom - result.height) <= 1,
    'red scene fills the complete viewport');
  return result;
}

async function screenshot(page, name) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => ['.red-prize-name', '.red-card'].every(selector => {
    const node = document.querySelector(selector);
    return node && Number(getComputedStyle(node).opacity) > .99;
  }));
  await page.screenshot({ path: path.join(DIST, name), fullPage: false });
  report.screenshots.push(name);
}

async function grid(page, results) {
  await page.waitForSelector('.reward-grid .reward-card', { timeout: 9000 });
  assert.equal(await page.locator(scene).count(), 0);
  assert.equal(await page.locator('.reward-grid .reward-card').count(), results.length);
  const labels = await page.evaluate(items => items.map(item => window.WendaoEquipmentArt.rewardLabel(item)), results);
  const rendered = await page.locator('.reward-grid .reveal-card-face strong').allTextContents();
  assert.deepEqual(rendered.map(label => label.trim()), labels, 'final grid preserves every actual reward in draw order');
}

(async () => {
  fs.mkdirSync(DIST, { recursive: true });
  browser = await chromium.launch({ headless: true,
    executablePath: process.env.LINGQI_CHROMIUM || '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-gpu'],
    env: { ...process.env, FONTCONFIG_FILE: path.join(ROOT, 'qa-tools/fonts.conf') } });
  report.browser = await browser.version();
  const multiple = findFixture('multiple-red');
  const ordinary = findFixture('ordinary');
  report.fixtureSeeds = { multipleRed: multiple.seed, ordinary: ordinary.seed };

  await test('forge preview separates real weapon types, six grades and all five wearable slots', () =>
    withFixture(fixture(), {}, async page => {
      const before = await stateOf(page);
      await page.evaluate(() => window.Lingqi.showModal('forge'));
      const previews = [];
      async function preview(slot, set, rarity) {
        await page.locator('#forge-slot').selectOption(slot);
        await page.locator('#forge-set').selectOption(set);
        await page.locator('#forge-rarity').selectOption(String(rarity));
        const expected = await page.evaluate(gear => ({ art: window.WendaoEquipmentArt.gearArt(gear), label: window.WendaoEquipmentArt.gearLabel(gear) }),
          { slot, set, rarity, tier: before.paths.magic.realm });
        const actual = await page.locator('#forge-art-preview .equipment-art').evaluate(node => {
          const css = getComputedStyle(node);
          return { file: css.backgroundImage, position: css.backgroundPosition, size: css.backgroundSize,
            slot: node.dataset.artSlot, rarity: Number(node.dataset.artRarity), set: node.dataset.artSet };
        });
        assert.equal(actual.slot, slot);
        assert.equal(actual.rarity, rarity);
        assert.equal(actual.set, set);
        assert.ok(actual.file.includes(expected.art.file));
        assert.equal(actual.position, expected.art.position);
        assert.equal(actual.size, expected.art.size);
        const title = await page.locator('#forge-art-preview strong').innerText();
        assert.equal(title, expected.label);
        previews.push({ slot, set, rarity, title, file: expected.art.file, position: actual.position });
        return title;
      }
      assert.match(await preview('weapon', 'sword', 0), /凡品·铁剑/);
      await page.screenshot({ path: path.join(DIST, 'v4-forge-iron-sword.png') });
      report.screenshots.push('v4-forge-iron-sword.png');
      assert.match(await preview('weapon', 'thunder', 0), /凡品·铁枪/);
      for (let rarity = 1; rarity <= 5; rarity++) await preview('weapon', 'sword', rarity);
      await page.screenshot({ path: path.join(DIST, 'v4-forge-red-sword.png') });
      report.screenshots.push('v4-forge-red-sword.png');
      for (const slot of ['armor', 'head', 'bracer', 'boots', 'charm']) {
        await preview(slot, 'sword', 0);
        await preview(slot, 'sword', 5);
      }
      const signatures = await page.evaluate(async () => {
        const result = {};
        for (const file of ['v4-weapons-atlas.png', 'v4-armor-atlas.png']) {
          const image = await new Promise((resolve, reject) => {
            const node = new Image(); node.onload = () => resolve(node); node.onerror = reject; node.src = 'assets/' + file;
          });
          const canvas = document.createElement('canvas'); canvas.width = canvas.height = 48;
          const context = canvas.getContext('2d', { willReadFrequently: true });
          for (const [column, row] of (file.includes('weapons') ? [[0, 0], [5, 0], [0, 2]] : [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [5, 0]])) {
            context.clearRect(0, 0, 48, 48);
            context.drawImage(image, column * image.width / 6, row * image.height / 6, image.width / 6, image.height / 6, 0, 0, 48, 48);
            let hash = 2166136261;
            for (const byte of context.getImageData(0, 0, 48, 48).data) hash = Math.imul(hash ^ byte, 16777619) >>> 0;
            result[file + ':' + column + ':' + row] = hash;
          }
        }
        return result;
      });
      assert.notEqual(signatures['v4-weapons-atlas.png:0:0'], signatures['v4-weapons-atlas.png:5:0'], 'low/high weapon artwork differs');
      assert.notEqual(signatures['v4-weapons-atlas.png:0:0'], signatures['v4-weapons-atlas.png:0:2'], 'iron sword and iron spear artwork differs');
      assert.notEqual(signatures['v4-armor-atlas.png:0:0'], signatures['v4-armor-atlas.png:5:0'], 'low/high armor artwork differs');
      assert.equal(new Set(Array.from({ length: 5 }, (_, row) => signatures['v4-armor-atlas.png:0:' + row])).size, 5, 'wearable parts have distinct artwork');
      await unchanged(page, before);
      return { previews, signatures };
    }));

  await test('ticket 80th pity red is fullscreen, phased, persisted and skippable', () =>
    withFixture(fixture(), { video: true }, async page => {
      const drawResult = await draw(page, 'draw');
      assert.equal(drawResult.results[0].rarity, 5);
      assert.equal(drawResult.committed.gacha.redPity, 0);
      assert.ok(await page.locator('[data-animation="summoning"]').isVisible());
      await waitRed(page, 0, 'awakening');
      await assertRedPrize(page, drawResult.results[0], drawResult.committed);
      await waitRed(page, 0, 'impact');
      await waitRed(page, 0, 'revealed');
      const bounds = await geometry(page);
      await screenshot(page, 'v4-red-mobile.png');
      await page.locator('[data-ui="summon-skip"]').click();
      await grid(page, drawResult.results);
      await unchanged(page, drawResult.committed);
      return { reward: drawResult.results[0], bounds };
    }));

  for (const type of ['draw', 'drawWithJade']) {
    await test(type + ' non-red result follows ordinary reveal without a red scene', () =>
      withFixture(ordinary.state, {}, async page => {
        const result = await draw(page, type);
        assert.ok(result.results.every(item => item.rarity < 5));
        assert.ok(await page.locator('[data-animation="summoning"]').isVisible());
        await grid(page, result.results);
        assert.deepEqual(await page.evaluate(() => window.__redObserved), []);
        await unchanged(page, result.committed);
        return { seed: ordinary.seed, reward: result.results[0] };
      }));
    await test(type + ' skipping the initial ritual reveals saved rewards directly', () =>
      withFixture(fixture(), {}, async page => {
        const result = await draw(page, type);
        await page.locator('[data-ui="summon-skip"]').click();
        await grid(page, result.results);
        await page.waitForTimeout(2700);
        assert.deepEqual(await page.evaluate(() => window.__redObserved), []);
        await unchanged(page, result.committed);
      }));
  }

  for (const dismissal of ['native close', 'Escape', 'reload']) {
    await test('jade 80th pity red survives ' + dismissal + ' without duplicate costs, prizes or pity', () =>
      withFixture(fixture(), {}, async page => {
        const result = await draw(page, 'drawWithJade');
        assert.equal(result.results[0].rarity, 5);
        assert.equal(result.committed.gacha.redPity, 0);
        await waitRed(page);
        await assertRedPrize(page, result.results[0], result.committed);
        if (dismissal === 'native close') assert.equal(await page.evaluate(() => window.onNativeBack()), true);
        else if (dismissal === 'Escape') await page.keyboard.press('Escape');
        else await page.reload({ waitUntil: 'networkidle' });
        await page.waitForTimeout(4500);
        assert.equal(await page.locator('#modal-layer [role="dialog"]').count(), 0, 'closed animation timers never reopen dialogs');
        assert.equal(await page.evaluate(() => document.getElementById('app').inert), false);
        await unchanged(page, result.committed);
      }));
  }

  await test('real ten-pull red rewards receive independent scenes in saved order and then auto-finish', () =>
    withFixture(multiple.state, {}, async page => {
      const result = await draw(page, 'drawWithJade', 10);
      const red = result.results.filter(item => item.rarity === 5);
      assert.ok(red.length >= 2);
      for (let index = 0; index < red.length; index++) {
        await waitRed(page, index, 'revealed');
        await assertRedPrize(page, red[index], result.committed);
        await unchanged(page, result.committed);
        if (index < red.length - 1) await page.locator('[data-ui="red-reveal-next"]').click();
      }
      // Leave the last scene alone to exercise its timer rather than only manual advance.
      await grid(page, result.results);
      const seen = await page.evaluate(() => window.__redObserved);
      assert.deepEqual([...new Set(seen.map(item => item.index))], red.map((_, index) => index));
      await unchanged(page, result.committed);
      return { seed: multiple.seed, redRewards: red, seen };
    }));

  for (const type of ['draw', 'drawWithJade']) {
    await test(type + ' reduced motion shows static red rewards with immediately usable controls', () =>
      withFixture(multiple.state, { reducedMotion: 'reduce' }, async page => {
        const result = await draw(page, type, 10);
        const red = result.results.filter(item => item.rarity === 5);
        await waitRed(page, 0, 'revealed');
        assert.equal(await page.locator('[data-animation="summoning"]').count(), 0);
        assert.equal(await page.evaluate(() => window.__sawOrdinaryRitual), false);
        await assertRedPrize(page, red[0], result.committed);
        const animation = await page.locator(scene).evaluate(node => {
          const nodes = [node, ...node.querySelectorAll('*')];
          return { running: node.getAnimations({ subtree: true }).filter(item => item.playState === 'running').length,
            motion: nodes.flatMap(item => [null, '::before', '::after'].map(pseudo => {
              const css = getComputedStyle(item, pseudo);
              return { animation: css.animationName, transition: css.transitionDuration };
            })) };
        });
        assert.equal(animation.running, 0, 'no running red-scene animations in reduced-motion mode');
        assert.ok(animation.motion.every(item => item.animation === 'none' && item.transition.split(',').every(time => parseFloat(time) === 0)),
          'all red-scene descendants and pseudo-elements disable motion');
        const first = await page.locator('.red-card').boundingBox();
        await page.waitForTimeout(300);
        assert.deepEqual(await page.locator('.red-card').boundingBox(), first, 'red card remains static');
        assert.ok(await page.locator('[data-ui="red-reveal-next"]').isEnabled());
        await page.locator('[data-ui="red-reveal-next"]').click();
        await waitRed(page, 1, 'revealed');
        await assertRedPrize(page, red[1], result.committed);
        await page.locator('[data-ui="summon-skip"]').click();
        await grid(page, result.results);
        await unchanged(page, result.committed);
      }));
  }

  for (const [width, height, imageName] of [[360, 640, 'v4-red-small-mobile.png'], [390, 480, 'v4-red-short.png'], [1440, 900, 'v4-red-desktop.png']]) {
    await test('red reveal controls, card and name fit ' + width + '×' + height, () =>
      withFixture(fixture(), { width, height }, async page => {
        const result = await draw(page, 'draw');
        await waitRed(page, 0, 'revealed');
        await assertRedPrize(page, result.results[0], result.committed);
        const bounds = await geometry(page);
        await screenshot(page, imageName);
        await page.locator('[data-ui="red-reveal-next"]').click();
        await grid(page, result.results);
        await unchanged(page, result.committed);
        return bounds;
      }));
  }

  await test('new weapon and armor atlases decode and all browser diagnostics remain clean', () =>
    withFixture(fixture(), {}, async page => {
      const assets = await page.evaluate(async () => Promise.all(['v4-weapons-atlas.png', 'v4-armor-atlas.png'].map(name => new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve({ name, width: image.naturalWidth, height: image.naturalHeight });
        image.onerror = () => reject(Error('Cannot decode ' + name));
        image.src = 'assets/' + name;
      }))));
      assert.ok(assets.every(item => item.width >= 600 && item.height >= 600));
      for (const key of ['pageErrors', 'consoleErrors', 'failedRequests', 'badResponses', 'externalRequests']) assert.deepEqual(report[key], [], key);
      return { assets };
    }));
})().catch(error => {
  report.fatal = error.stack || String(error);
  console.error(error);
}).finally(async () => {
  if (browser) await browser.close();
  report.finishedAt = new Date().toISOString();
  report.passed = !report.fatal && report.tests.length > 0 && report.tests.every(item => item.passed);
  fs.writeFileSync(path.join(DIST, 'browser-red-reveal-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ passed: report.passed, tests: report.tests.length,
    failed: report.tests.filter(item => !item.passed).map(item => item.name), screenshots: report.screenshots, videos: report.videos }));
  if (!report.passed) process.exitCode = 1;
});
