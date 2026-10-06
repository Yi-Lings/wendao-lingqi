'use strict';

// Real player controls and app timers exercise valid save fixtures. Short battles
// use a validated enemy at one HP; no test directly calls the settlement code.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const ROOT = path.resolve(process.env.LINGQI_ROOT || path.join(__dirname, '..'));
const BASE = process.env.LINGQI_URL || 'http://127.0.0.1:8787/';
const DIST = path.join(ROOT, 'dist');
const FILTER = process.env.LINGQI_FILTER || '';
const { chromium } = require(path.join(ROOT, 'qa-tools/node_modules/playwright'));
const E = require(path.join(ROOT, 'web/engine.js'));
const A = require(path.join(ROOT, 'web/equipment-art.js'));
const C = E.catalog;
const KEY = 'lingqi-save-v2';
const NOW = Date.now();
const report = { startedAt: new Date().toISOString(), url: BASE, filter: FILTER || null,
  fixtureNotice: 'Validated inventory and paused, one-HP enemy saves exercise real controls and browser app timers. No claim about economic reachability or balance.',
  tests: [], screenshots: [], art: [], pageErrors: [], consoleErrors: [], failedRequests: [], badResponses: [], externalRequests: [] };
let browser;

function fixture(options = {}) {
  const s = E.createState(NOW);
  s.training = false;
  s.rngStreams.world = 8;
  s.paths.magic = { realm: options.fresh ? 0 : 2, layer: options.fresh ? 1 : 8, xp: 0, reserve: 0 };
  s.paths.body = { realm: options.bodyRealm || 0, layer: 1, xp: 0, reserve: 0 };
  s.stones = 1200000; s.dust = 5000; s.jade = 0; s.tickets = 100;
  for (const id of Object.keys(s.materials)) s.materials[id] = 5000;
  s.bag = []; for (const slot of Object.keys(C.slots)) s.equipped[slot] = null;
  if (options.lowSet) {
    for (const slot of Object.keys(C.slots)) {
      const g = E.modules.economy.createGear(s, { slot, set: options.lowSet, rarity: 0, tier: 0 });
      assert.ok(E.modules.economy.addGear(s, g));
    }
  }
  if (options.highOwned) {
    const g = E.modules.economy.createGear(s, { slot: options.highOwned.slot, set: options.highOwned.set, rarity: 3, tier: 3 });
    assert.ok(E.modules.economy.addGear(s, g));
  }
  if (options.fullBag) {
    for (let i = s.bag.length; i < 300; i++) assert.ok(E.modules.economy.addGear(s,
      E.modules.economy.createGear(s, { slot: 'weapon', set: 'body', rarity: 0, tier: 0 })));
  }
  if (options.poor) { s.stones = 0; s.dust = 0; for (const id of Object.keys(s.materials)) s.materials[id] = 0; }
  if (options.blueprints) s.blueprints = Object.keys(C.sets);
  if (options.battle) {
    const id = options.battle === 'cave' ? 'cave_0' : options.battle;
    if (id === 'trial') { s.paths.magic.layer = 10; s.paths.magic.xp = E.modules.core.xpNeeded(s); }
    assert.ok(E.act(s, { type: 'startDungeon', id, tier: 2, practice: !!options.practice }, NOW).ok);
    if (options.battle === 'cave') {
      const choice = s.exploration.choices.find(x => x.id.startsWith('battle:') || x.id.startsWith('elite:'));
      assert.ok(choice, 'deterministic cave fixture includes a real battle room');
      assert.ok(E.act(s, { type: 'chooseCave', choice: choice.id }, NOW).ok);
      if (options.caveBanked) {
        s.exploration.banked.stones = 123;
        s.exploration.banked.materials.herb = 7;
        s.exploration.pending.stones = 999;
        s.exploration.pending.materials.ore = 17;
      }
    }
    if (options.repeat) {
      assert.ok(E.act(s, { type: 'setAutoRetry', enabled: true, maxRuns: 3, stopOnRed: false }, NOW).ok);
    }
    s.battle.paused = true;
    s.battle.auto = false;
    s.battle.attackTimer = .1;
    s.battle.enemies.forEach(enemy => { enemy.hp = options.defeat ? enemy.maxHp : 1; enemy.attackTimer = options.defeat ? .05 : 100; });
    if (options.defeat) {
      s.battle.player.hp = 1;
      s.battle.player.defense = 0;
      s.battle.player.dodge = 0;
      s.battle.attackTimer = 100;
      s.battle.enemies[0].attack = 100000;
    }
    if (options.caveFinal) {
      // Finish the final actual room, then the real treasure button settles the
      // exploration. The fixture is still validated with the engine save parser.
      s.exploration.node = s.exploration.total - 1;
    }
  }
  const result = E.validate(s);
  assert.ok(result.ok, result.error);
  return result.state;
}

function observe(page) {
  page.on('pageerror', e => report.pageErrors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') report.consoleErrors.push(m.text()); });
  page.on('requestfailed', r => report.failedRequests.push({ url: r.url(), error: r.failure()?.errorText }));
  page.on('response', r => { if (r.status() >= 400) report.badResponses.push({ url: r.url(), status: r.status() }); });
  page.on('request', r => { if (!r.url().startsWith(BASE) && !/^(data:|blob:)/.test(r.url())) report.externalRequests.push(r.url()); });
}

async function withPage(options, run) {
  const state = fixture(options);
  const width = options.width || 390, height = options.height || 844;
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1,
    isMobile: width < 600, hasTouch: width < 600, reducedMotion: 'reduce' });
  context.setDefaultTimeout(7000);
  let page;
  try {
    await context.addInitScript(({ state, key, now }) => {
      window.__lingqiQaNow = now;
      Date.now = () => window.__lingqiQaNow;
      if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state));
      localStorage.setItem('lingqi-age-confirmed', 'yes');
      localStorage.setItem('lingqi_audio_v1', JSON.stringify({ muted: true, music: .45, effects: .6 }));
    }, { state, key: KEY, now: NOW });
    page = await context.newPage(); observe(page);
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.Lingqi?.state());
    return await run(page, state);
  } catch (error) {
    if (page) try { await shot(page, 'sources-rewards-failure-' + report.tests.length + '.png'); } catch (_) {}
    throw error;
  } finally { await context.close(); }
}

async function test(name, run) {
  if (FILTER && !name.includes(FILTER)) return;
  const at = Date.now();
  try { const details = await run(); report.tests.push({ name, passed: true, durationMs: Date.now() - at, details }); console.log('PASS ' + name); }
  catch (error) { report.tests.push({ name, passed: false, durationMs: Date.now() - at, error: error.stack || String(error) }); console.error('FAIL ' + name + ': ' + error.message); }
}
const stateOf = page => page.evaluate(() => window.Lingqi.state());
const stored = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
async function button(page, selector, predicate = () => true) {
  const nodes = page.locator(selector);
  for (let i = 0; i < await nodes.count(); i++) {
    const node = nodes.nth(i), p = await node.evaluate(n => JSON.parse(n.dataset.payload || '{}'));
    if (predicate(p)) {
      const hiddenSummary = node.locator('xpath=ancestor::details[not(@open)][1]/summary');
      if (await hiddenSummary.count()) await hiddenSummary.click();
      return node;
    }
  }
  throw Error('Actual player control missing: ' + selector);
}
async function ui(page, name, predicate = () => true) { await (await button(page, 'button[data-ui="' + name + '"]', predicate)).click(); }
async function action(page, name, predicate = () => true) {
  const scope = await page.locator('#modal-layer [role="dialog"]').count() ? '#modal-layer ' : '';
  await (await button(page, scope + 'button[data-action="' + name + '"]', predicate)).click();
}
async function close(page) { if (await page.locator('#modal-layer [role="dialog"]').count()) await page.keyboard.press('Escape'); }
async function hold(page, target) {
  await target.scrollIntoViewIfNeeded();
  const box = await target.boundingBox(); assert.ok(box && box.width > 20 && box.height > 20);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down(); await page.waitForTimeout(540); await page.mouse.up();
}
async function sets(page, set) {
  await close(page);
  await page.locator('.nav-bottom button[data-page="character"]').click();
  await ui(page, 'equipment-sets', p => !p.set || p.set === set);
  await ui(page, 'equipment-sets', p => p.set === set);
  const details = page.locator('.build-detail');
  if (await details.count() && !await details.evaluate(n => n.open)) await details.locator('summary').click();
}
async function advance(page, seconds = 1) {
  await page.evaluate(ms => { window.__lingqiQaNow += ms; }, seconds * 1000);
  await page.waitForTimeout(320);
}
async function finishBattle(page) {
  await action(page, 'pauseBattle', p => p.paused === false);
  for (let i = 0; i < 8; i++) {
    await advance(page);
    if (await page.locator('.battle-settlement').count()) return;
  }
  throw Error('Settled actual browser battle did not open the reward screen');
}
async function shot(page, name) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(100);
  await page.screenshot({ path: path.join(DIST, name), fullPage: false });
  report.screenshots.push(name);
}
async function geometry(page) {
  const g = await page.evaluate(() => ({ width: innerWidth, html: document.documentElement.scrollWidth, body: document.body.scrollWidth,
    dialogs: [...document.querySelectorAll('#modal-layer .modal')].map(n => { const r = n.getBoundingClientRect(); return { x: r.x, width: r.width, client: n.clientWidth, scroll: n.scrollWidth }; }) }));
  assert.ok(g.html <= g.width + 1 && g.body <= g.width + 1, 'document fits viewport: ' + JSON.stringify(g));
  assert.ok(g.dialogs.every(m => m.x >= -1 && m.x + m.width <= g.width + 1 && m.scroll <= m.client + 1), 'dialog has no horizontal overflow: ' + JSON.stringify(g));
  return g;
}
function holdings(s) { return { stones: s.stones, dust: s.dust, jade: s.jade, tickets: s.tickets, materials: s.materials, fragments: s.fragments,
  bag: s.bag, rewardOverflow: s.rewardOverflow, techniques: s.techniques, ownedTreasures: s.ownedTreasures, blueprints: s.blueprints,
  stats: s.stats, progress: s.progress, path: s.paths[s.route] }; }
function rewardDelta(before, after, result, pending = false) {
  const r = result.rewards;
  if (pending || result.practice || !r) return assert.deepEqual(holdings(after), holdings(before), 'pending/practice/failure does not grant inventory');
  for (const key of ['stones', 'tickets']) assert.equal(after[key] - before[key], r[key] || 0, key + ' delta exactly matches saved reward');
  for (const key of Object.keys(before.materials)) assert.equal(after.materials[key] - before.materials[key], r.materials?.[key] || 0, key + ' delta exactly matches saved reward');
  for (const g of r.gear || []) assert.equal(after.bag.concat(after.rewardOverflow || []).filter(x => x.uid === g.uid).length, 1, 'actual rewarded gear exists exactly once');
}
async function displayedRewardCounts(page, result) {
  const reward = result.rewards || {}, checked = [];
  for (const [kind, values] of [['currency', Object.fromEntries(['stones', 'xp', 'tickets', 'contribution'].map(id => [id, reward[id]]))], ['material', reward.materials || {}], ['fragment', reward.fragments || {}]]) {
    for (const [id, value] of Object.entries(values)) {
      if (!value) continue;
      const card = page.locator('.settlement-card[data-reward-kind="' + kind + '"][data-reward-id="' + id + '"]');
      assert.equal(await card.count(), 1, 'one actual reward card for ' + kind + '/' + id);
      assert.equal(await card.locator('.settlement-count').innerText(), '+' + Number(value).toLocaleString('zh-CN', { maximumFractionDigits: 1 }), 'displayed quantity matches committed reward');
      checked.push({ kind, id, count: value });
    }
  }
  return checked;
}
async function missingSource(page, set, slot) {
  await sets(page, set);
  await ui(page, 'gear-source', p => p.set === set && p.slot === slot);
  assert.ok(/获取|来源|收集/.test(await page.locator('#modal-layer [role="dialog"]').innerText()), 'piece source explanation is visible');
}
async function atlasChecks(page, label) {
  await page.waitForFunction(() => !!window.WendaoArtLayout);
  await page.evaluate(() => window.WendaoArtLayout.refresh());
  await page.waitForTimeout(150);
  const rows = await page.evaluate(async () => {
    const visible = [...document.querySelectorAll('[data-atlas-fit]')].filter(n => n.clientWidth > 0 && n.clientHeight > 0);
    return Promise.all(visible.map(async n => {
      const [cols, rows, col, row, nativeW, nativeH] = n.dataset.atlasFit.split(',').map(Number);
      const css = getComputedStyle(n), urls = [...css.backgroundImage.matchAll(/url\(["']?([^"')]+)["']?\)/g)];
      const url = urls.at(-1)?.[1];
      const im = new Image(); im.src = url; await im.decode();
      const last = s => s.split(',').at(-1).trim().split(/\s+/).map(parseFloat);
      return { className: n.className, cols, rows, col, row, nativeW, nativeH, measuredW: im.naturalWidth,
        measuredH: im.naturalHeight, width: n.clientWidth, height: n.clientHeight, size: last(css.backgroundSize),
        position: last(css.backgroundPosition), file: url.split('/').at(-1) };
    }));
  });
  assert.ok(rows.length >= 1, label + ' has actual fitted atlas cells');
  for (const r of rows) {
    assert.equal(r.nativeW, r.measuredW); assert.equal(r.nativeH, r.measuredH);
    const xScale = r.size[0] / r.nativeW, yScale = r.size[1] / r.nativeH;
    assert.ok(Math.abs(xScale - yScale) <= .00002, label + ' preserves original pixels in both axes: ' + JSON.stringify(r));
    const cellW = r.size[0] / r.cols, cellH = r.size[1] / r.rows;
    const left = r.position[0] + r.col * cellW, top = r.position[1] + r.row * cellH;
    assert.ok(left <= .1 && top <= .1 && left + cellW >= r.width - .1 && top + cellH >= r.height - .1,
      label + ' shows only the requested cell, never adjacent artwork: ' + JSON.stringify(r));
    assert.ok(r.col >= 0 && r.col < r.cols && r.row >= 0 && r.row < r.rows, label + ' has valid tile index');
  }
  report.art.push({ label, rows });
  return rows;
}

(async () => {
  fs.mkdirSync(DIST, { recursive: true });
  browser = await chromium.launch({ headless: true, executablePath: process.env.LINGQI_CHROMIUM || '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-gpu'], env: { ...process.env, FONTCONFIG_FILE: path.join(ROOT, 'qa-tools/fonts.conf') } });
  report.browser = await browser.version();

  await test('all six missing sets show six illustrated named pieces and usable acquisition controls', () => withPage({ blueprints: true }, async page => {
    const original = holdings(await stateOf(page)), rows = [];
    for (const set of Object.keys(C.sets)) {
      await sets(page, set);
      const pieces = page.locator('.build-gear-grid > button');
      assert.equal(await pieces.count(), 6, 'six distinct physical slots');
      const details = await pieces.evaluateAll(nodes => nodes.map(n => ({ text: n.textContent, icon: !!n.querySelector('[role="img"]'),
        art: n.querySelector('[role="img"]') && getComputedStyle(n.querySelector('[role="img"]')).backgroundImage,
        ui: n.dataset.ui, payload: JSON.parse(n.dataset.payload || '{}') })));
      assert.ok(details.every(x => x.icon && x.art !== 'none'), 'unowned pieces have real art');
      assert.ok(details.every(x => /待获取/.test(x.text) && x.text.length > 10), 'names and acquisition state visible');
      assert.deepEqual(details.map(x => x.payload.slot).sort(), Object.keys(C.slots).sort(), 'all six acquisition controls refer to their slot');
      assert.ok(details.every(x => x.payload.set === set), 'all acquisition controls keep this set');
      rows.push({ set, details });
    }
    assert.deepEqual(holdings(await stateOf(page)), original, 'browsing never fabricates or consumes equipment');
    return rows;
  }));

  await test('all 216 actual set-quality-slot illustrations decode and preserve selected native atlas cells', () => withPage({}, async page => {
    const checked = [], before = holdings(await stateOf(page));
    for (const set of Object.keys(C.sets)) {
      await sets(page, set);
      for (let rarity = 0; rarity < 6; rarity++) {
        await page.locator('#set-preview-rarity').selectOption(String(rarity));
        assert.equal(await page.locator('.build-gear-grid > button').count(), 6);
        await page.waitForFunction(() => [...document.querySelectorAll('.build-gear-grid .art-icon')].length === 6 &&
          [...document.querySelectorAll('.build-gear-grid .art-icon')].every(n => n.dataset.atlasFit));
        await atlasChecks(page, '216-' + set + '-' + rarity);
        const icons = await page.locator('.build-gear-grid > button .art-icon').evaluateAll(nodes => nodes.map(n => ({
          slot: n.dataset.artSlot, set: n.dataset.artSet, rarity: Number(n.dataset.artRarity),
          native: n.dataset.atlasFit.split(',').map(Number),
          file: [...getComputedStyle(n).backgroundImage.matchAll(/url\(["']?([^"')]+)["']?\)/g)].at(-1)[1].split('/').at(-1)
        })));
        assert.deepEqual(icons.map(x => x.slot).sort(), Object.keys(C.slots).sort());
        for (const icon of icons) {
          assert.equal(icon.set, set); assert.equal(icon.rarity, rarity);
          const expected = A.gearArt({ set, slot: icon.slot, rarity }), size = expected.size.split(/\s+/).map(parseFloat),
            position = expected.position.split(/\s+/).map(parseFloat), cols = size[0] / 100, rows = size[1] / 100;
          assert.equal(icon.file, expected.file, 'actual decoded image agrees with selected grade and set');
          assert.equal(icon.native[0], cols); assert.equal(icon.native[1], rows);
          assert.ok(Math.abs(icon.native[2] - position[0] * (cols - 1) / 100) < .0001);
          assert.ok(Math.abs(icon.native[3] - position[1] * (rows - 1) / 100) < .0001);
          checked.push({ set, slot: icon.slot, rarity, file: icon.file, native: icon.native });
        }
      }
    }
    assert.equal(checked.length, 216);
    assert.deepEqual(holdings(await stateOf(page)), before, 'all grade previews are free and never grant gear');
    return { actualIllustrationsDecoded: checked.length, distinctAssetFiles: [...new Set(checked.map(x => x.file))], pieces: checked };
  }));

  await test('missing piece directs to exact gacha target without automatically drawing or consuming tickets', () => withPage({}, async page => {
    await missingSource(page, 'sword', 'head');
    const before = await stateOf(page);
    await ui(page, 'source', p => p.type === 'gacha' && p.target === 'gear_sword_head');
    assert.equal(await page.locator('#gacha-target').inputValue(), 'gear_sword_head', 'requested piece is preselected');
    const preselection = await stateOf(page);
    assert.deepEqual(holdings(preselection), holdings(before), 'following gacha source spends nothing');
    assert.equal(preselection.gacha.target, before.gacha.target, 'preselection waits for player confirmation');
    await action(page, 'setGachaTarget');
    const after = await stateOf(page);
    assert.equal(after.gacha.target, 'gear_sword_head', 'real confirm sets exact target');
    assert.equal(after.gacha.draws, before.gacha.draws); assert.deepEqual(after.gacha.history, before.gacha.history);
    assert.deepEqual(holdings(after), holdings(before), 'saving target is not a draw');
    return { target: after.gacha.target, ticketsSpent: 0, drawsStarted: 0 };
  }));

  await test('missing piece routes to correct same-set boss and forge keeps the requested set and physical slot', () => withPage({ blueprints: true }, async page => {
    const rows = [];
    for (const set of Object.keys(C.sets)) {
      await missingSource(page, set, 'boots');
      const before = await stateOf(page);
      const boss = await button(page, 'button[data-ui="source"]', p => p.id && C.dungeons[p.id]?.type === 'boss');
      const bossPayload = await boss.evaluate(n => JSON.parse(n.dataset.payload));
      assert.equal(C.dungeons[bossPayload.id].school, set, 'same set comes from actual dungeon school');
      await boss.click();
      assert.ok((await page.locator('#modal-layer [role="dialog"]').innerText()).includes(C.dungeons[bossPayload.id].name));
      assert.deepEqual(holdings(await stateOf(page)), holdings(before), 'following boss source starts no encounter');
      assert.equal((await stateOf(page)).battle, null);
      await missingSource(page, set, 'boots');
      await ui(page, 'source', p => p.type === 'forge' && p.set === set && p.slot === 'boots');
      assert.equal(await page.locator('#forge-slot').inputValue(), 'boots');
      assert.equal(await page.locator('#forge-set').inputValue(), set);
      const quality = Number(await page.locator('#forge-rarity').inputValue());
      assert.ok(quality >= 0 && quality <= 5);
      assert.deepEqual(holdings(await stateOf(page)), holdings(before), 'forge source previews without crafting');
      await action(page, 'forgeGear');
      const after = await stateOf(page), newGear = after.bag.find(g => !before.bag.some(old => old.uid === g.uid));
      assert.ok(newGear, 'explicit craft button creates a real inventory piece');
      assert.equal(newGear.set, set); assert.equal(newGear.slot, 'boots'); assert.equal(newGear.rarity, quality);
      assert.ok(after.stones < before.stones, 'explicit craft spends actual resources');
      rows.push({ set, boss: bossPayload.id, crafted: newGear.uid, rarity: quality });
    }
    return rows;
  }));

  await test('locked sources still explain unlock conditions, and higher-tier owned gear is clearly distinguished from missing', async () => {
    await withPage({ fresh: true }, async page => {
      await missingSource(page, 'sword', 'weapon');
      const text = await page.locator('#modal-layer [role="dialog"]').innerText();
      assert.ok(/第二境|筑基|境界|开启|开放/.test(text), 'gacha and boss unlock condition can be read');
      assert.ok(/炼器|打造|五层/.test(text), 'forge unlock condition can be read');
      const sourceButtons = page.locator('button[data-ui="source"]');
      assert.ok(await sourceButtons.count() >= 2, 'locked sources are actionable condition views');
      const before = holdings(await stateOf(page));
      await ui(page, 'source', p => p.id && C.dungeons[p.id]?.type === 'boss');
      assert.ok(/需 |开启|开放|条件/.test(await page.locator('#modal-layer [role="dialog"]').innerText()));
      assert.deepEqual(holdings(await stateOf(page)), before);
    });
    return withPage({ highOwned: { set: 'sword', slot: 'head' } }, async page => {
      await sets(page, 'sword');
      const text = await page.locator('.build-gear-grid').innerText();
      assert.ok(/已拥有/.test(text) && /当前|境界|未开放/.test(text), 'owned but inactive tier is not mistaken for absent');
      const higher = (await stateOf(page)).bag.find(g => g.slot === 'head');
      assert.equal(higher.tier, 3);
      assert.equal((await stateOf(page)).equipped.head, null, 'inactive higher tier is not force equipped');
      return { ownedUid: higher.uid, currentRealm: 2, pieceRealm: 3 };
    });
  });

  await test('low-grade full sets activate real two/four-piece effects and one-click equip all six slots', () => withPage({ lowSet: 'body' }, async page => {
    await sets(page, 'body');
    const before = await stateOf(page);
    assert.equal(before.bag.length, 6); assert.ok(before.bag.every(g => g.rarity === 0));
    await action(page, 'equipSet', p => p.set === 'body');
    const after = await stateOf(page), view = await page.evaluate(() => window.Lingqi.view());
    assert.equal(Object.values(after.equipped).filter(Boolean).length, 6);
    assert.deepEqual(after.bag, before.bag, 'same existing low-grade UID instances');
    assert.equal(view.sets.body, 6);
    assert.equal(await page.locator('.build-effect.active').count(), 2, 'two and four piece effects active');
    for (const key of ['stones', 'dust', 'jade', 'tickets', 'materials']) assert.deepEqual(after[key], before[key], 'equip does not consume ' + key);
    return after.equipped;
  }));

  await test('missing gear long press explains genuine base attributes and shortage text names currencies in Chinese', async () => {
    await withPage({}, async page => {
      await sets(page, 'sword');
      const piece = await button(page, 'button[data-ui="gear-source"]', p => p.set === 'sword' && p.slot === 'head');
      const before = holdings(await stateOf(page));
      await hold(page, piece);
      const text = await page.locator('.selection-inspect-layer').innerText();
      assert.ok(/未获取|基础属性预览/.test(text));
      assert.ok(/实际词条/.test(text), 'unowned gear does not advertise rolled affixes as guaranteed');
      assert.ok(/防御|攻击|气血/.test(text));
      assert.equal(await page.locator('.gear-source-heading').count(), 0, 'holding previews without also executing acquisition click');
      assert.deepEqual(holdings(await stateOf(page)), before);
    });
    return withPage({ poor: true }, async page => {
      await missingSource(page, 'sword', 'weapon');
      const text = await page.locator('.gear-source-route').first().innerText();
      assert.ok(/灵石还差/.test(text) && /玄铁还差/.test(text), 'actual shortfalls name the currency and material');
      assert.ok(!/stones|materials|crystal\d|\bore\b/.test(text), 'internal resource IDs never leak into player shortage copy');
      await shot(page, 'sources-rewards-poor-source.png');
      return { actualShortageCopy: text };
    });
  });

  for (const type of ['resource_herb', 'boss_4']) {
    await test(type + ' actual victory opens illustrated rewards, saves once and history never duplicates loot', () => withPage({ battle: type }, async page => {
      const before = await stateOf(page);
      await finishBattle(page);
      const after = await stateOf(page), r = after.lastBattleResult;
      assert.equal(r.win, true); assert.equal(r.first, true);
      assert.equal(after.battleReports.length, 1);
      rewardDelta(before, after, r);
      assert.deepEqual(holdings(await stored(page)), holdings(after), 'settlement already persisted before modal');
      const text = await page.locator('.battle-settlement').innerText();
      assert.ok(/首通/.test(text), 'first-clear positive feedback');
      assert.ok(/灵石/.test(text) && await page.locator('.battle-settlement [role="img"]').count() > 0, 'actual material pictures');
      await displayedRewardCounts(page, r);
      if (type.startsWith('boss_')) {
        assert.ok(r.rewards.gear.length > 0, 'real boss gear reward');
        for (const gear of r.rewards.gear) assert.ok(text.includes(C.slots[gear.slot]) || text.includes(E.modules.core.gearName(gear)), 'rewarded equipment shown');
      }
      await shot(page, 'sources-rewards-' + type + '.png');
      await close(page);
      for (let i = 0; i < 3; i++) {
        await page.evaluate(() => window.Lingqi.showModal('battle-history'));
        await ui(page, 'battle-report', p => p.index === 0);
        assert.ok(await page.locator('.battle-settlement').count(), 'history uses actual reward presentation');
        await close(page);
      }
      assert.deepEqual(holdings(await stateOf(page)), holdings(after), 'three historical views never pay again');
      await page.reload({ waitUntil: 'networkidle' });
      const normalized = E.validate(after); assert.ok(normalized.ok, normalized.error);
      assert.deepEqual(holdings(await stateOf(page)), holdings(normalized.state), 'reloading only validates the paid save, never pays again');
      return { result: r, paidOnce: true };
    }));
  }

  await test('cave room victory labels pending loot without granting it; final treasure pays only once', () => withPage({ battle: 'cave', caveFinal: true }, async page => {
    const before = await stateOf(page);
    await finishBattle(page);
    const room = await stateOf(page);
    assert.equal(room.lastBattleResult.rewardsPending, true);
    rewardDelta(before, room, room.lastBattleResult, true);
    await displayedRewardCounts(page, room.lastBattleResult);
    assert.ok(/暂存|待携出/.test(await page.locator('.battle-settlement').innerText()), 'pending cave winnings are clearly differentiated');
    await close(page);
    await action(page, 'chooseCave', p => p.choice === 'finish');
    const after = await stateOf(page);
    assert.equal(after.exploration, null);
    assert.equal(after.lastBattleResult.first, true, 'actual first cave clear receives first-clear feedback');
    assert.equal(after.battleReports.length, 2);
    assert.ok(await page.locator('.battle-settlement').count(), 'final action settlement automatically opens rewards');
    rewardDelta(before, after, after.lastBattleResult);
    await displayedRewardCounts(page, after.lastBattleResult);
    await shot(page, 'sources-rewards-cave-treasure.png');
    await close(page);
    await page.reload({ waitUntil: 'networkidle' });
    const normalized = E.validate(after); assert.ok(normalized.ok, normalized.error);
    assert.deepEqual(holdings(await stateOf(page)), holdings(normalized.state));
    return { pending: room.lastBattleResult, carriedOut: after.lastBattleResult };
  }));

  await test('cave defeat preserves and displays only previously banked real rewards, excluding lost pending loot', () => withPage({ battle: 'cave', defeat: true, caveBanked: true }, async page => {
    const before = await stateOf(page); await finishBattle(page); const after = await stateOf(page), r = after.lastBattleResult;
    assert.equal(r.win, false); assert.equal(after.exploration, null);
    assert.equal(r.rewards.stones, 123); assert.equal(r.rewards.materials.herb, 7);
    assert.equal(r.rewards.materials.ore || 0, 0, 'unbanked ore is lost');
    rewardDelta(before, after, r); await displayedRewardCounts(page, r);
    assert.ok(/已携出收益已保留/.test(await page.locator('.battle-settlement').innerText()));
    assert.equal(after.stones - before.stones, 123);
    assert.equal(after.materials.ore, before.materials.ore);
    return { bankedStones: 123, bankedHerb: 7, lostPendingStones: 999, lostPendingOre: 17 };
  }));

  await test('full backpack sends the actual boss reward to overflow and long press still shows its complete attributes', () => withPage({ battle: 'boss_4', fullBag: true }, async page => {
    const before = await stateOf(page); await finishBattle(page); const after = await stateOf(page), reward = after.lastBattleResult.rewards.gear[0];
    assert.equal(before.bag.length, 300); assert.equal(after.bag.length, 300);
    assert.ok(after.rewardOverflow.some(g => g.uid === reward.uid), 'real grant preserves full-backpack reward in overflow');
    rewardDelta(before, after, after.lastBattleResult);
    const card = page.locator('.settlement-card[data-reward-kind="gear"][data-reward-id="' + reward.uid + '"]');
    assert.ok(/奖励暂存/.test(await card.innerText()));
    await hold(page, card);
    const text = await page.locator('.selection-inspect-layer').innerText();
    assert.ok(/奖励暂存中/.test(text) && /攻击|气血|防御|暴击|真元/.test(text));
    assert.deepEqual(holdings(await stored(page)), holdings(after));
    return { backpackCount: 300, savedOverflowUid: reward.uid, fullAttributesAvailable: true };
  }));

  await test('practice victory never claims loot or first clear; defeat gives a clear outcome without rewards', async () => {
    const outcomes = [];
    for (const opts of [{ practice: true }, { defeat: true }]) await withPage({ battle: 'resource_herb', ...opts }, async page => {
      const before = await stateOf(page);
      await finishBattle(page);
      const after = await stateOf(page), r = after.lastBattleResult;
      assert.equal(r.win, !opts.defeat);
      assert.equal(after.progress.firstClears.length, before.progress.firstClears.length);
      const b = holdings(before), a = holdings(after);
      delete b.stats; delete a.stats;
      assert.deepEqual(a, b, 'practice or defeat does not claim economic reward');
      const text = await page.locator('.battle-settlement').innerText();
      assert.ok(opts.practice ? /试阵/.test(text) && /无奖励|不发奖励/.test(text) : /重整旗鼓|失败|落败|失利/.test(text));
      outcomes.push({ practice: !!opts.practice, result: r });
    });
    return outcomes;
  });

  await test('formal realm trial celebrates progression without inventing economic loot', () => withPage({ battle: 'trial' }, async page => {
    const before = await stateOf(page); await finishBattle(page);
    const after = await stateOf(page);
    assert.equal(after.lastBattleResult.win, true);
    assert.equal(after.lastBattleResult.type, 'trial');
    assert.equal(after.progress.trialWins.magic_2 || after.progress.trialWins['magic:2'], true);
    for (const key of ['stones', 'dust', 'jade', 'tickets', 'materials', 'bag']) assert.deepEqual(after[key], before[key]);
    assert.equal(await page.locator('.settlement-card').count(), 0, 'trial progress is not fabricated loot');
    assert.ok(/试炼进度|试炼完成/.test(await page.locator('.battle-settlement').innerText()));
    return { progressionRecorded: true, economicLoot: 0 };
  }));

  await test('automatic boss retry stays paused behind settlement and resumes only on explicit continue', () => withPage({ battle: 'boss_4', repeat: true }, async page => {
    await finishBattle(page);
    const after = await stateOf(page);
    assert.equal(after.battleReports.length, 1);
    assert.ok(after.battle, 'actual engine queued the next encounter');
    assert.equal(after.battle.paused, true, 'next battle is suspended while rewards are displayed');
    const time = after.battle.time, hp = after.battle.player.hp, reports = after.battleReports.length;
    await advance(page, 30); await advance(page, 30);
    const waiting = await stateOf(page);
    assert.equal(waiting.battle.time, time); assert.equal(waiting.battle.player.hp, hp); assert.equal(waiting.battleReports.length, reports);
    await action(page, 'pauseBattle', p => p.paused === false);
    assert.equal(await page.locator('.battle-settlement').count(), 0);
    assert.equal((await stateOf(page)).battle.paused, false, 'explicit continue actually unpauses');
    await advance(page);
    assert.ok((await stateOf(page)).battle.time > time, 'clock really advances after continuing');
    return { heldAt: time, resumedAt: (await stateOf(page)).battle.time };
  }));

  await test('ordinary equip and pause/resume after a victory never reopen old rewards, and a removed historical item still has real snapshot attributes', () => withPage({ battle: 'boss_4' }, async page => {
    await finishBattle(page); const paid = await stateOf(page), gear = paid.lastBattleResult.rewards.gear[0];
    assert.ok(gear);
    const rewardCard = page.locator('.settlement-card[data-reward-kind="gear"][data-reward-id="' + gear.uid + '"]');
    await hold(page, rewardCard);
    assert.ok(await page.locator('.selection-inspect-layer').count(), 'real long press reveals item detail');
    const detail = await page.locator('.selection-inspect-layer').innerText();
    assert.ok(detail.includes(C.slots[gear.slot]) && /攻击|气血|防御|暴击|真元/.test(detail), 'real full attributes are shown');
    await page.keyboard.press('Escape'); await close(page);
    await page.locator('.nav-bottom button[data-page="character"]').click();
    await action(page, 'equipGear', p => p.uid === gear.uid);
    assert.equal(await page.locator('.battle-settlement').count(), 0, 'equip does not re-celebrate old report');
    assert.equal((await stateOf(page)).equipped[gear.slot], gear.uid);
    // A second, genuinely new encounter should still show its own settlement.
    const raw = await stateOf(page);
    await page.evaluate(() => window.Lingqi.showModal('dungeon', { id: 'resource_herb' }));
    await action(page, 'startDungeon', p => p.id === 'resource_herb');
    await action(page, 'pauseBattle', p => p.paused === true);
    await action(page, 'pauseBattle', p => p.paused === false);
    assert.equal(await page.locator('.battle-settlement').count(), 0, 'pause/resume do not re-celebrate old report');
    await action(page, 'pauseBattle', p => p.paused === true);
    await ui(page, 'encounter-exit'); await action(page, 'leaveBattle');
    assert.equal(await page.locator('.battle-settlement[data-settlement="exit"]').count(), 1, 'new exit has its own settlement');
    await close(page);
    // Un-equip the reward by replacing it with a real crafted piece so the
    // original reward can actually be recycled through its ordinary control.
    await page.evaluate(({ set, slot }) => window.Lingqi.showModal('forge', { set, slot, rarity: 0 }), { set: gear.set, slot: gear.slot });
    await action(page, 'forgeGear'); await close(page);
    assert.equal(await page.locator('.battle-settlement').count(), 0, 'craft does not reopen old reward report');
    const crafted = (await stateOf(page)).bag.find(g => g.uid !== gear.uid);
    assert.ok(crafted);
    await page.locator('.nav-bottom button[data-page="character"]').click();
    await action(page, 'equipGear', p => p.uid === crafted.uid);
    await page.evaluate(uid => window.Lingqi.showModal('gear-detail', { uid }), gear.uid);
    await ui(page, 'confirm', p => p.type === 'recycleGear' && p.payload.uid === gear.uid);
    await action(page, 'recycleGear', p => p.uid === gear.uid);
    assert.ok(!(await stateOf(page)).bag.some(g => g.uid === gear.uid), 'reward item is really removed from inventory');
    await page.evaluate(() => window.Lingqi.showModal('battle-history'));
    await ui(page, 'battle-report', p => p.index === 0);
    await hold(page, page.locator('.settlement-card[data-reward-id="' + gear.uid + '"]'));
    const historical = await page.locator('.selection-inspect-layer').innerText();
    assert.ok(historical.includes(C.slots[gear.slot]) && /攻击|气血|防御|暴击|真元/.test(historical), 'saved reward snapshot still provides genuine gear stats after recycle');
    assert.equal((await stateOf(page)).battleReports.length, raw.battleReports.length + 1, 'browsing and crafting add no phantom combat reports');
    return { rewardUid: gear.uid, replacedBy: crafted.uid, historicalDetailAvailable: true };
  }));

  await test('failed persistence rolls back settlement, preserves inventory and never shows a paid reward screen', () => withPage({ battle: 'boss_4' }, async page => {
    await action(page, 'pauseBattle', p => p.paused === false);
    const before = await stateOf(page), diskBefore = await stored(page);
    await page.evaluate(key => {
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function(k, v) { if (k === key) throw new DOMException('QA full store', 'QuotaExceededError'); return original.call(this, k, v); };
      window.__restoreQaStorage = () => { Storage.prototype.setItem = original; };
    }, KEY);
    await advance(page);
    const after = await stateOf(page);
    assert.ok(after.battle && after.battle.paused, 'failed save restores and pauses pre-settlement battle: ' + JSON.stringify({battle: after.battle && {paused: after.battle.paused, time: after.battle.time}, reports: after.battleReports.length, result: after.lastBattleResult}));
    assert.deepEqual(holdings(after), holdings(before), 'no phantom paid rewards after rollback');
    assert.deepEqual(await stored(page), diskBefore, 'persistent save is intact');
    assert.equal(await page.locator('.battle-settlement').count(), 0, 'failed settlement does not celebrate paid rewards');
    assert.equal(after.battleReports.length, before.battleReports.length);
    await page.evaluate(() => window.__restoreQaStorage());
    await finishBattle(page);
    const repaired = await stateOf(page);
    assert.equal(repaired.battleReports.length, before.battleReports.length + 1);
    rewardDelta(before, repaired, repaired.lastBattleResult);
    return { rolledBack: true, recoveredOnce: true };
  }));

  for (const [width, height] of [[360, 640], [390, 844], [1440, 900]]) {
    await test(width + 'x' + height + ' source, reward, portraits, maps and boss preserve cell proportions without adjacent tile bleed', () => withPage({ width, height, lowSet: 'body' }, async page => {
      const results = [];
      await sets(page, 'sword');
      results.push(await geometry(page)); await atlasChecks(page, width + '-missing-set');
      await missingSource(page, 'sword', 'weapon');
      results.push(await geometry(page)); await atlasChecks(page, width + '-piece-source');
      await shot(page, 'sources-rewards-source-' + width + '.png');
      await close(page);
      await page.locator('.nav-bottom button[data-page="fate"]').click();
      await ui(page, 'fate-tab', p => p.id === 'companions');
      results.push(await geometry(page)); await atlasChecks(page, width + '-companions');
      const heroes = await page.locator('.companion-art').evaluateAll(nodes => nodes.map(n => n.dataset.atlasFit?.split(',').map(Number)));
      assert.equal(heroes.length, 3);
      assert.ok(heroes.every(m => m && m[0] === 3 && m[1] === 1 && Math.abs((m[4] / m[0]) / (m[5] / m[1]) - .5) < .0001), 'portraits respect actual 1:2 native cell geometry');
      await shot(page, 'sources-rewards-companions-' + width + '.png');
      await ui(page, 'fate-tab', p => p.id === 'story');
      await atlasChecks(page, width + '-chapter'); results.push(await geometry(page));
      await page.locator('.nav-bottom button[data-page="adventure"]').click();
      await atlasChecks(page, width + '-maps'); results.push(await geometry(page));
      await page.evaluate(() => window.Lingqi.showModal('dungeon', { id: 'boss_4' }));
      await atlasChecks(page, width + '-boss-banner'); results.push(await geometry(page));
      await shot(page, 'sources-rewards-boss-banner-' + width + '.png');
      return results;
    }));
    await test(width + 'x' + height + ' actual boss settlement rewards fit and preserve source art pixel ratios', () => withPage({ width, height, battle: 'boss_4' }, async page => {
      await finishBattle(page); const g = await geometry(page);
      assert.equal(await page.locator('#toast').isVisible(), false, 'stale battle-control toasts do not cover settlement loot');
      await atlasChecks(page, width + '-boss-rewards');
      const visibleLoot = await page.evaluate(() => {
        const body = document.querySelector('#modal-layer .modal-body').getBoundingClientRect(), card = document.querySelector('.settlement-card').getBoundingClientRect();
        return { bodyTop: body.top, bodyBottom: body.bottom, cardTop: card.top, cardBottom: card.bottom };
      });
      assert.ok(visibleLoot.cardTop >= visibleLoot.bodyTop - 1 && visibleLoot.cardBottom <= visibleLoot.bodyBottom + 1,
        'at least the first real loot card is fully visible immediately, without scrolling behind the footer: ' + JSON.stringify(visibleLoot));
      await shot(page, 'sources-rewards-victory-' + width + '.png');
      assert.ok(await page.locator('.settlement-card[data-reward-kind="gear"]').count() > 0);
      return { geometry: g, firstRealRewardFullyVisible: visibleLoot };
    }));
  }

  await test('browser and offline asset requests stay clean', async () => {
    assert.deepEqual(report.pageErrors, []); assert.deepEqual(report.consoleErrors, []);
    assert.deepEqual(report.failedRequests, []); assert.deepEqual(report.badResponses, []); assert.deepEqual(report.externalRequests, []);
    return { pageErrors: 0, consoleErrors: 0, requestsFailed: 0, externalRequests: 0 };
  });
})().catch(error => { report.fatal = error.stack || String(error); console.error(report.fatal); process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close();
  report.finishedAt = new Date().toISOString();
  report.passed = report.tests.filter(t => t.passed).length; report.failed = report.tests.filter(t => !t.passed).length;
  fs.writeFileSync(path.join(DIST, 'browser-sources-rewards.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ passed: report.passed, failed: report.failed, screenshots: report.screenshots, report: 'dist/browser-sources-rewards.json' }));
  if (report.failed || report.fatal) process.exitCode = 1;
});
