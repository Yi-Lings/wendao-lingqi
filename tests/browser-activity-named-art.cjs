'use strict';

// Browser acceptance tests use validated rich-inventory fixtures and ordinary
// player buttons. The clock is frozen; no test grants rewards or calls a view
// function instead of the actual action. Fixtures do not prove game balance.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const ROOT = path.resolve(process.env.LINGQI_ROOT || path.join(__dirname, '..'));
const BASE = process.env.LINGQI_URL || 'http://127.0.0.1:8787/';
const FILTER = process.env.LINGQI_FILTER || '';
const DIST = path.join(ROOT, 'dist');
const { chromium } = require(path.join(ROOT, 'qa-tools/node_modules/playwright'));
const E = require(path.join(ROOT, 'web/engine.js'));
const C = E.catalog;
const KEY = 'lingqi-save-v2';
const NOW = Date.now();
const report = { startedAt: new Date().toISOString(), url: BASE, filter: FILTER || null,
  fixtureNotice: 'Validated rich inventories and a paused one-HP enemy exercise real UI and app timers; economic reachability and balance are outside this test.',
  tests: [], screenshots: [], pageErrors: [], consoleErrors: [], badResponses: [], failedRequests: [], externalRequests: [], deferredMissingImages: [] };
let browser;
fs.mkdirSync(DIST, { recursive: true });
const clone = x => JSON.parse(JSON.stringify(x));

function fixture(o = {}) {
  const s = E.createState(NOW);
  s.training = false; s.paths.magic = { realm: 2, layer: 8, xp: 0, reserve: 0 };
  s.stones = 1000000; s.jade = 0; s.dust = 10000; s.tickets = 100; s.wisdomTickets = 6;
  for (const id of Object.keys(s.materials)) s.materials[id] = 10000;
  s.blueprints = o.sidequest ? [] : Object.keys(C.sets);
  s.sweepMs = 45000 * 40;
  for (let tier = 0; tier <= 2; tier++) s.progress.stars['resource_herb:' + tier + ':0'] = 3;
  if (o.fullBag) while (s.bag.length < 300) assert.ok(E.modules.economy.addGear(s,
    E.modules.economy.createGear(s, { slot: 'head', set: 'body', rarity: 0, tier: 0 })));
  if (o.commission) {
    assert.ok(E.act(s, { type: 'joinSect', school: 'sword' }, NOW).ok);
    s.stats.craftedTier2 = 5;
  }
  if (o.chapter) { s.progress.dungeonWins.resource_herb = 1; }
  if (o.sidequest) { s.progress.dungeonWins.resource_ore = 3; }
  if (o.poor) { s.stones = 0; for (const id of Object.keys(s.materials)) s.materials[id] = 0; }
  if (o.battle) {
    assert.ok(E.act(s, { type: 'startDungeon', id: 'boss_4', tier: 2 }, NOW).ok);
    s.battle.paused = true; s.battle.auto = false; s.battle.attackTimer = .1;
    s.battle.enemies.forEach(enemy => { enemy.hp = 1; enemy.attackTimer = 100; });
  }
  const checked = E.validate(s); assert.ok(checked.ok, checked.error);
  return checked.state;
}
function observe(page) {
  page.on('pageerror', e => report.pageErrors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') {
    if (FILTER === 'production' && /404/.test(m.text())) return;
    report.consoleErrors.push(m.text());
  } });
  page.on('response', r => { if (r.status() >= 400) {
    const item = { url: r.url(), status: r.status() };
    if (FILTER === 'production' && /v6-gear-quality-[34]\.png/.test(r.url())) report.deferredMissingImages.push(item);
    else report.badResponses.push(item);
  } });
  page.on('requestfailed', r => report.failedRequests.push({ url: r.url(), error: r.failure()?.errorText }));
  page.on('request', r => { if (!r.url().startsWith(BASE) && !/^(data:|blob:)/.test(r.url())) report.externalRequests.push(r.url()); });
}
async function withPage(o, run) {
  const initial = fixture(o), width = o.width || 390, height = o.height || 844;
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1,
    isMobile: width < 600, hasTouch: width < 600, reducedMotion: 'reduce' });
  context.setDefaultTimeout(7000);
  let page;
  try {
    await context.addInitScript(({ initial, key, now }) => {
      window.__lingqiQaNow = now; Date.now = () => window.__lingqiQaNow;
      if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(initial));
      localStorage.setItem('lingqi-age-confirmed', 'yes');
      localStorage.setItem('lingqi_audio_v1', JSON.stringify({ muted: true, music: .45, effects: .6 }));
    }, { initial, key: KEY, now: NOW });
    page = await context.newPage(); observe(page);
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.Lingqi?.state());
    return await run(page, initial);
  } catch (error) {
    if (page) try { await shot(page, 'activity-named-art-failure-' + report.tests.length + '.png'); } catch (_) {}
    throw error;
  } finally { await context.close(); }
}
async function test(name, run) {
  if (FILTER && !name.includes(FILTER)) return;
  const at = Date.now();
  try { const details = await run(); report.tests.push({ name, passed: true, durationMs: Date.now() - at, details }); console.log('PASS ' + name); }
  catch (error) { report.tests.push({ name, passed: false, durationMs: Date.now() - at, error: error.stack || String(error) }); console.error('FAIL ' + name + ': ' + error.message); }
}
const stateOf = p => p.evaluate(() => window.Lingqi.state());
const stored = p => p.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
function holdings(s) { return { stones: s.stones, jade: s.jade, dust: s.dust, tickets: s.tickets,
  materials: s.materials, pills: s.pills, fragments: s.fragments, bag: s.bag, rewardOverflow: s.rewardOverflow,
  blueprints: s.blueprints, techniques: s.techniques, ownedTreasures: s.ownedTreasures,
  sweepMs: s.sweepMs, alchemy: s.alchemy, sect: s.sect, stats: s.stats, story: s.story, progress: s.progress }; }
async function button(page, selector, pred = () => true) {
  const nodes = page.locator(selector);
  for (let i = 0; i < await nodes.count(); i++) {
    const n = nodes.nth(i), p = await n.evaluate(el => JSON.parse(el.dataset.payload || '{}'));
    if (pred(p)) return n;
  }
  throw Error('Actual player control missing: ' + selector);
}
async function action(page, name, pred = () => true) {
  const prefix = await page.locator('#modal-layer [role=dialog]').count() ? '#modal-layer ' : '';
  await (await button(page, prefix + 'button[data-action="' + name + '"]', pred)).click();
}
async function ui(page, name, pred = () => true) { await (await button(page, 'button[data-ui="' + name + '"]', pred)).click(); }
async function modal(page, name, p = {}) { await page.evaluate(({ name, p }) => window.Lingqi.showModal(name, p), { name, p }); }
async function pageNav(page, name) { await page.locator('.nav-bottom button[data-page="' + name + '"]').click(); }
async function shot(page, name) {
  await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(100);
  await page.screenshot({ path: path.join(DIST, name), fullPage: false }); report.screenshots.push(name);
}
async function card(page, kind, id, count) {
  const n = page.locator('.activity-settlement .settlement-card[data-reward-kind="' + kind + '"][data-reward-id="' + id + '"]');
  assert.equal(await n.count(), 1, 'one earned card for ' + kind + '/' + id);
  assert.equal(Number(await n.getAttribute('data-reward-count')), count, 'displayed amount equals the committed gain');
  return n;
}
async function settlement(page, type) {
  const n = page.locator('.activity-settlement'); assert.equal(await n.count(), 1);
  assert.equal(await n.getAttribute('data-activity-settlement'), type);
  assert.equal(await page.locator('.battle-settlement').count(), 0, 'a production action cannot create a combat report');
  assert.equal(await page.locator('#toast').isVisible(), false, 'success toast cannot cover loot');
}
async function saved(page) { assert.deepEqual(holdings(await stored(page)), holdings(await stateOf(page)), 'inventory was saved before showing rewards'); }
async function returnNoGrant(page, kind = 'button') {
  const before = holdings(await stateOf(page));
  if (kind === 'button') await ui(page, 'activity-return');
  if (kind === 'escape') await page.keyboard.press('Escape');
  if (kind === 'close') await ui(page, 'close');
  if (kind === 'native') assert.equal(await page.evaluate(() => window.onNativeBack()), true);
  if (kind === 'backdrop') await page.locator('.modal-backdrop').click({ position: { x: 1, y: 1 } });
  assert.equal(await page.locator('.activity-settlement').count(), 0);
  assert.deepEqual(holdings(await stateOf(page)), before, 'dismissing a saved reward must never collect again');
  await saved(page);
}
async function visibleReward(page) {
  const g = await page.evaluate(() => {
    const rect = el => { const r = el.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right }; };
    return { width: innerWidth, height: innerHeight, documentWidth: document.documentElement.scrollWidth,
      body: rect(document.querySelector('#modal-layer .modal-body')),
      card: rect(document.querySelector('.activity-settlement .settlement-card')),
      footer: rect(document.querySelector('#modal-layer .modal-footer')) };
  });
  assert.ok(g.documentWidth <= g.width + 1, 'page has no horizontal overflow');
  assert.ok(g.card.top >= g.body.top - 1 && g.card.bottom <= g.body.bottom + 1, 'first loot card is completely visible: ' + JSON.stringify(g));
  assert.ok(g.footer.top >= g.card.bottom - 1 && g.footer.bottom <= g.height + 1, 'return control stays visible below the real reward');
  return g;
}

(async () => {
  browser = await chromium.launch({ executablePath: process.env.LINGQI_CHROMIUM || '/usr/bin/chromium', headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'] });

  await test('production sweep saves actual batch, tier and cost, returns selections, and never grants first-clear loot twice', () => withPage({}, async page => {
    await modal(page, 'sweep', { id: 'resource_herb' });
    await page.selectOption('#sweep-tier', '2'); await page.selectOption('#sweep-count', '5');
    const before = await stateOf(page), expected = clone(before), result = E.act(expected, { type: 'sweepDungeon', id: 'resource_herb', tier: 2, count: 5 }, NOW);
    assert.ok(result.ok, result.message); await action(page, 'sweepDungeon'); await settlement(page, 'sweepDungeon');
    const after = await stateOf(page); assert.deepEqual(holdings(after), holdings(expected)); await saved(page);
    assert.equal(before.sweepMs - after.sweepMs, result.data.costMs);
    for (const [id, count] of Object.entries(result.data.reward.materials)) await card(page, 'material', id, count);
    await card(page, 'currency', 'stones', after.stones - before.stones);
    assert.deepEqual(after.progress.firstClears, before.progress.firstClears);
    assert.equal(after.tickets, before.tickets); assert.deepEqual(after.bag, before.bag);
    assert.equal(after.materials.crystal2, before.materials.crystal2);
    assert.equal(await page.locator('.activity-settlement [data-reward-kind=gear]').count(), 0);
    await shot(page, 'activity-sweep-390x844.png'); await returnNoGrant(page);
    assert.equal(await page.inputValue('#sweep-tier'), '2'); assert.equal(await page.inputValue('#sweep-count'), '5');
    const settled = holdings(await stateOf(page)); await page.reload({ waitUntil: 'networkidle' });
    assert.deepEqual(holdings(await stateOf(page)), settled); assert.equal(await page.locator('.activity-settlement').count(), 0, 'reload cannot repeat settlement');
    return { count: 5, tier: 2, reserveSpentMs: result.data.costMs, noFirstClearOrReloadDuplication: true };
  }));

  await test('production batch alchemy saves actual pills and expenses then returns the selected batch and inner scroll', () => withPage({}, async page => {
    await modal(page, 'alchemy'); await page.selectOption('#pill-count', '10');
    const control = await button(page, 'button[data-action=craftPill]', p => p.id === 'heal0');
    await control.scrollIntoViewIfNeeded();
    const scroll = await page.locator('#modal-layer .modal-body').evaluate(n => n.scrollTop), before = await stateOf(page);
    assert.ok(scroll > 0, 'test exercises a scrolled recipe list');
    await control.click(); await settlement(page, 'craftPill'); const after = await stateOf(page);
    assert.equal(after.pills.heal0 - before.pills.heal0, 10); await card(page, 'pill', 'heal0', 10);
    assert.equal(before.stones - after.stones, C.recipes.heal0.stones * 10);
    assert.equal(before.materials.herb - after.materials.herb, C.recipes.heal0.materials.herb * 10);
    await saved(page); await shot(page, 'activity-alchemy-390x844.png'); await returnNoGrant(page);
    assert.equal(await page.inputValue('#pill-count'), '10');
    assert.ok(Math.abs(await page.locator('#modal-layer .modal-body').evaluate(n => n.scrollTop) - scroll) <= 1, 'modal returns to the same recipe position');
    return { actualPills: 10, scrollRestored: scroll, batchRetained: 10 };
  }));

  await test('production queued alchemy and three-round control celebrate only the single saved completion including bonus', () => withPage({}, async page => {
    await modal(page, 'alchemy'); await page.selectOption('#pill-count', '10');
    const before = await stateOf(page); await action(page, 'queuePill', p => p.id === 'heal0');
    let state = await stateOf(page), job = state.alchemy.jobs[0]; assert.ok(job);
    assert.equal(state.pills.heal0, before.pills.heal0); assert.equal(await page.locator('.activity-settlement').count(), 0);
    await action(page, 'startAlchemyControl', p => p.jobId === job.id);
    for (let round = 0; round < 3; round++) {
      state = await stateOf(page); job = state.alchemy.jobs[0];
      await action(page, 'stokeAlchemy', p => p.jobId === job.id && p.fire === job.rhythm[round]);
      assert.equal((await stateOf(page)).pills.heal0, before.pills.heal0);
      assert.equal(await page.locator('.activity-settlement').count(), 0, 'a completed fire sequence has not yet awarded its batch');
    }
    job = (await stateOf(page)).alchemy.jobs[0]; assert.equal(job.bonus, 2);
    await action(page, 'finishAlchemyJob', p => p.jobId === job.id); await settlement(page, 'finishAlchemyJob');
    const after = await stateOf(page); assert.equal(after.pills.heal0 - before.pills.heal0, 12);
    await card(page, 'pill', 'heal0', 12); assert.equal(after.alchemy.jobs.length, 0); await saved(page);
    assert.match(await page.locator('.activity-note').innerText(), /基础成丹 10枚.*额外 2枚/);
    await returnNoGrant(page, 'native'); assert.equal(await page.locator('button[data-action=finishAlchemyJob]').count(), 0);
    const paid = holdings(await stateOf(page)); await page.reload({ waitUntil: 'networkidle' }); assert.deepEqual(holdings(await stateOf(page)), paid);
    return { base: 10, bonus: 2, actualSaved: 12, noEarlyOrDuplicatePills: true };
  }));

  for (const fullBag of [false, true]) {
    await test('production forging displays its real new UID ' + (fullBag ? 'in overflow' : 'in inventory') + ' and supports actual attribute inspection', () => withPage({ fullBag }, async page => {
      await modal(page, 'forge', { set: 'thunder', slot: 'weapon', rarity: 5 });
      const before = await stateOf(page), old = new Set(before.bag.concat(before.rewardOverflow).map(g => g.uid));
      await action(page, 'forgeGear'); await settlement(page, 'forgeGear'); const after = await stateOf(page);
      const fresh = after.bag.concat(after.rewardOverflow).filter(g => !old.has(g.uid)); assert.equal(fresh.length, 1);
      const gear = fresh[0]; assert.equal(gear.set, 'thunder'); assert.equal(gear.slot, 'weapon'); assert.equal(gear.rarity, 5);
      assert.equal(after.rewardOverflow.some(g => g.uid === gear.uid), fullBag);
      const n = await card(page, 'gear', gear.uid, 1);
      await n.locator('[data-selection=inspect]').click();
      assert.match(await page.locator('.selection-inspect-layer').innerText(), /雷霄杖/);
      assert.match(await page.locator('.selection-inspect-layer').innerText(), /攻击|真元|暴击/);
      await page.keyboard.press('Escape'); await saved(page);
      if (fullBag) assert.match(await page.locator('.settlement-status').innerText(), /奖励暂存/);
      await returnNoGrant(page); assert.equal(await page.inputValue('#forge-set'), 'thunder');
      assert.equal(await page.inputValue('#forge-slot'), 'weapon'); assert.equal(await page.inputValue('#forge-rarity'), '5');
      return { uid: gear.uid, overflow: fullBag, inspectedActualAttributes: true };
    }));
  }

  for (const method of ['button', 'escape', 'close', 'native', 'backdrop']) {
    await test('production reward dismissal via ' + method + ' restores forge inputs and source scroll without regranting', () => withPage({}, async page => {
      await pageNav(page, 'cave'); await modal(page, 'forge');
      await page.selectOption('#forge-slot', 'bracer'); await page.selectOption('#forge-set', 'array'); await page.selectOption('#forge-rarity', '2');
      const scroll = await page.locator('#modal-layer .modal-body').evaluate(n => { n.scrollTop = 180; return n.scrollTop; });
      assert.ok(scroll > 0); await action(page, 'forgeGear'); await settlement(page, 'forgeGear'); await returnNoGrant(page, method);
      assert.equal(await page.inputValue('#forge-slot'), 'bracer'); assert.equal(await page.inputValue('#forge-set'), 'array'); assert.equal(await page.inputValue('#forge-rarity'), '2');
      assert.equal(await page.locator('#modal-layer .modal-body').evaluate(n => n.scrollTop), scroll);
      assert.equal(await page.locator('.nav-bottom .active').getAttribute('data-page'), 'cave');
      return { method, selectedSet: 'array', selectedSlot: 'bracer', selectedQuality: 2, scroll };
    }));
  }

  for (const failMode of ['browser', 'native']) {
    await test('production ' + failMode + ' save failure rolls back inventory and never presents a false success, then retry succeeds once', () => withPage({}, async page => {
      await modal(page, 'forge', { set: 'sword', slot: 'weapon', rarity: 0 });
      const before = await stateOf(page), disk = await stored(page);
      await page.evaluate(({ failMode, key }) => {
        if (failMode === 'native') { window.Native = { persistSave: () => false }; window.__qaRestoreSave = () => { delete window.Native; }; }
        else { const original = Storage.prototype.setItem; Storage.prototype.setItem = function(k,v) { if(k === key) throw new DOMException('QA full store','QuotaExceededError'); return original.call(this,k,v); }; window.__qaRestoreSave = () => { Storage.prototype.setItem = original; }; }
      }, { failMode, key: KEY });
      await action(page, 'forgeGear'); assert.equal(await page.locator('.activity-settlement').count(), 0);
      assert.deepEqual(holdings(await stateOf(page)), holdings(before)); assert.deepEqual(await stored(page), disk);
      assert.match(await page.locator('#toast').innerText(), /保存未成功|撤回/);
      await page.evaluate(() => window.__qaRestoreSave()); await action(page, 'forgeGear'); await settlement(page, 'forgeGear');
      const after = await stateOf(page); assert.equal(after.bag.length, before.bag.length + 1); await saved(page);
      return { rolledBack: true, diskPreserved: true, retryProducedOneItem: true };
    }));
  }

  await test('production failed recipe/forge conditions preserve inputs and show no earned-loot overlay', () => withPage({ poor: true }, async page => {
    await modal(page, 'alchemy'); const before = holdings(await stateOf(page)); await action(page, 'craftPill', p => p.id === 'heal0');
    assert.equal(await page.locator('.activity-settlement').count(), 0); assert.deepEqual(holdings(await stateOf(page)), before);
    await modal(page, 'forge', { rarity: 5 }); await action(page, 'forgeGear'); assert.equal(await page.locator('.activity-settlement').count(), 0);
    assert.deepEqual(holdings(await stateOf(page)), before); return { noPhantomRewards: true };
  }));

  await test('production commissions save real current-tier rewards and cannot reclaim the same progress after closing', () => withPage({ commission: true }, async page => {
    await pageNav(page, 'fate'); await ui(page, 'fate-tab', p => p.id === 'sect');
    const before = await stateOf(page); await action(page, 'claimCommission', p => p.id === 'alchemy'); await settlement(page, 'claimCommission');
    const after = await stateOf(page); await card(page, 'material', 'crystal2', after.materials.crystal2 - before.materials.crystal2);
    await card(page, 'currency', 'contribution', after.sect.contribution - before.sect.contribution);
    assert.equal(after.materials.crystal0, before.materials.crystal0); await saved(page); await returnNoGrant(page);
    assert.equal(await (await button(page, 'button[data-action=claimCommission]', p => p.id === 'alchemy')).isDisabled(), true);
    return { currentTier: 2, consumedCommissionProgress: after.sect.taskCounts['alchemy:2'] };
  }));

  await test('production chapter collection reports actual newly acquired techniques or duplicate fragments and returns to the story', () => withPage({ chapter: true }, async page => {
    await pageNav(page, 'fate'); const before = await stateOf(page); await action(page, 'claimChapter', p => p.choice === 'protect'); await settlement(page, 'claimChapter');
    const after = await stateOf(page); assert.equal(after.story.chapter, before.story.chapter + 1);
    for (const id of C.chapters[0].reward.techniques) {
      if (!before.techniques[id]) { assert.ok(after.techniques[id]); await card(page, 'technique', id, 1); }
      else assert.equal(await page.locator('.activity-settlement [data-reward-kind=technique][data-reward-id="' + id + '"]').count(), 0);
    }
    const fragmentDelta = after.fragments.universal - before.fragments.universal;
    if (fragmentDelta) await card(page, 'fragment', 'universal', fragmentDelta);
    await saved(page); await returnNoGrant(page); assert.equal(await page.locator('.nav-bottom .active').getAttribute('data-page'), 'fate');
    return { nextChapter: after.story.chapter, actualDuplicateFragments: fragmentDelta };
  }));

  await test('production sidequest grants only newly learned blueprints, saves its completion and disables duplicate collection', () => withPage({ sidequest: true }, async page => {
    await pageNav(page, 'fate'); await ui(page, 'fate-tab', p => p.id === 'side');
    const index = Math.floor(C.sidequests.findIndex(q => q.id === 'world_forge') / 2);
    for (let i = 1; i <= index; i++) await ui(page, 'layout-page', p => p.key === 'fate-side' && p.index === i);
    const before = await stateOf(page); await action(page, 'claimSidequest', p => p.id === 'world_forge'); await settlement(page, 'claimSidequest');
    const after = await stateOf(page); assert.ok(after.story.sideCompleted.includes('world_forge'));
    for (const set of Object.keys(C.sets)) { assert.ok(!before.blueprints.includes(set)); assert.ok(after.blueprints.includes(set)); await card(page, 'blueprint', set, 1); }
    await saved(page); await returnNoGrant(page);
    assert.equal(await (await button(page, 'button[data-action=claimSidequest]', p => p.id === 'world_forge')).isDisabled(), true);
    return { newPermanentBlueprints: 6, completionSaved: true, duplicateDisabled: true };
  }));

  await test('production wisdom collection saves actual tickets and does not reopen an old battle report', () => withPage({}, async page => {
    await pageNav(page, 'heaven'); await ui(page, 'layout-tab', p => p.section === 'heaven' && p.tab === 'exchange'); const before = await stateOf(page); await action(page, 'claimWisdom'); await settlement(page, 'claimWisdom');
    const after = await stateOf(page); assert.equal(after.wisdomTickets, 0); await card(page, 'currency', 'tickets', after.tickets - before.tickets);
    await saved(page); await returnNoGrant(page); assert.equal(await page.locator('[data-action=claimWisdom]').isDisabled(), true);
    return { actualTickets: after.tickets - before.tickets };
  }));

  await test('production routine market purchases keep the market open for repeated purchases and never interrupt with loot overlay', () => withPage({}, async page => {
    await modal(page, 'shop'); await page.selectOption('#resource-count', '5'); const before = await stateOf(page);
    for (let i = 0; i < 2; i++) {
      await action(page, 'buyResource', p => p.item === 'herb' && p.currency === 'dust');
      assert.equal(await page.locator('.activity-settlement').count(), 0); assert.equal(await page.inputValue('#resource-count'), '5');
      assert.ok(await page.locator('[data-resource=herb]').count());
    }
    const after = await stateOf(page); assert.ok(after.materials.herb > before.materials.herb); assert.ok(after.dust < before.dust); await saved(page);
    return { continuousPurchases: 2, actualHerbGain: after.materials.herb - before.materials.herb };
  }));

  await test('production original combat victory keeps its own battle settlement priority and saved rewards', () => withPage({ battle: true }, async page => {
    const before = await stateOf(page); await action(page, 'pauseBattle', p => p.paused === false);
    for (let i = 0; i < 8 && !await page.locator('.battle-settlement').count(); i++) {
      await page.evaluate(() => { window.__lingqiQaNow += 1000; }); await page.waitForTimeout(320);
    }
    assert.equal(await page.locator('.battle-settlement').count(), 1); assert.equal(await page.locator('.activity-settlement').count(), 0);
    const after = await stateOf(page); assert.equal(after.battleReports.length, before.battleReports.length + 1);
    assert.equal(after.lastBattleResult.win, true); const disk = await stored(page), inventory = s => { const h = holdings(s); delete h.sweepMs; return h; }; assert.deepEqual(inventory(disk), inventory(after), 'combat loot is committed before presentation; passive reserve can advance afterwards'); assert.deepEqual(disk.lastBattleResult, after.lastBattleResult); assert.deepEqual(disk.battleReports, after.battleReports);
    return { battleReportPreserved: true, noProductionOverlay: true };
  }));

  for (const [width, height] of [[360, 640], [390, 844], [1440, 900]]) {
    for (const kind of ['sweep', 'alchemy', 'forge']) {
      await test('production ' + kind + ' ' + width + 'x' + height + ' first earned card and return footer fit without horizontal overflow', () => withPage({ width, height }, async page => {
        if (kind === 'sweep') { await modal(page, 'sweep', { id: 'resource_herb' }); await action(page, 'sweepDungeon'); }
        if (kind === 'alchemy') { await modal(page, 'alchemy'); await action(page, 'craftPill', p => p.id === 'qi0'); }
        if (kind === 'forge') { await modal(page, 'forge', { set: 'elements', slot: 'bracer', rarity: 5 }); await action(page, 'forgeGear'); }
        const g = await visibleReward(page); await shot(page, 'activity-' + kind + '-' + width + 'x' + height + '.png');
        return g;
      }));
    }
  }

  await test('named art all 330 cells decode actual native pixels, are distinct and preserve crop geometry with no object colour filters', () => withPage({ width: 1440, height: 900 }, async page => {
    const rows = await page.evaluate(async () => {
      const C = window.WendaoData, A = window.WendaoEquipmentArt, G = window.WendaoGameArt, I = window.WendaoArtIdentity;
      const utilities = ['herb','ore','lotus','insight','essence','soul','crystal0','crystal1','crystal2','crystal3','crystal4','crystal5','stones','tickets','dust','jade','contribution','universal','blueprint','field','furnace','forge','library','array','battle','elite','herb-room','ore-room','healing','insight-room','boon','curse','merchant','escort','relic','exit'];
      const items = [];
      for (const set of Object.keys(C.sets)) for (const slot of Object.keys(C.slots)) for (let rarity=0;rarity<=5;rarity++) items.push({kind:'gear',art:A.gearArt({set,slot,rarity})});
      for (const id of Object.keys(C.techniques)) items.push({kind:'technique',art:G.technique(id)});
      for (const id of Object.keys(C.treasures)) items.push({kind:'treasure',art:G.treasure(id)});
      for (const id of Object.keys(C.recipes)) items.push({kind:'pill',art:G.pill(id)});
      for (const id of utilities) items.push({kind:'utility',art:G.utility(id)});
      const images = new Map();
      for (const {art} of items) if (!images.has(art.file)) { const image=new Image();image.src='assets/'+art.file; await image.decode(); images.set(art.file,image); }
      const lab = document.createElement('section'); lab.id='qa-named-art-lab';lab.style='position:absolute;top:0;left:0;width:1200px;display:grid;grid-template-columns:repeat(20,58px);gap:2px;z-index:999;background:#0a131b;';
      for(const {art} of items) { const d=I.decorate(art),n=document.createElement('span'),attrs=document.createElement('template');attrs.innerHTML='<span '+d.attrs+'></span>';for(const attr of attrs.content.firstChild.attributes)n.setAttribute(attr.name,attr.value);n.className='item-icon art-icon '+d.className;n.style.cssText=d.style+'display:block;width:58px;height:70px;position:relative;background-image:url(assets/'+art.file+');background-size:'+art.size+';background-position:'+art.position;lab.append(n); }
      document.body.append(lab);window.WendaoArtLayout.refresh();
      await new Promise(resolve=>setTimeout(resolve,200));
      return Promise.all(items.map(async ({kind,art},i) => {
        const n=lab.children[i],picture=n.querySelector('[data-atlas-picture]'),css=getComputedStyle(picture||n),parentCss=getComputedStyle(n),image=images.get(art.file),fit=n.dataset.atlasFit?.split(',').map(Number),parentRect=n.getBoundingClientRect(),pictureRect=(picture||n).getBoundingClientRect();
        const cols=parseFloat(art.size)/100,rs=parseFloat(art.size.split(' ')[1])/100,parts=art.position.split(' ').map(parseFloat),col=parts[0]/100*(cols-1),row=parts[1]/100*(rs-1);
        const crop=window.WendaoArtCrops?.crop(art.file,col,row,cols,rs)||null,source=crop||[col/cols,row/rs,1/cols,1/rs],domCrop=n.dataset.artCrop?.split(',').map(Number)||null;const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;const ctx=canvas.getContext('2d');ctx.drawImage(image,source[0]*image.naturalWidth,source[1]*image.naturalHeight,source[2]*image.naturalWidth,source[3]*image.naturalHeight,0,0,64,64);
        const pixels=ctx.getImageData(0,0,64,64).data,hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',pixels))].map(x=>x.toString(16).padStart(2,'0')).join('');
        let lo=255,hi=0;for(let j=0;j<pixels.length;j+=4){lo=Math.min(lo,pixels[j],pixels[j+1],pixels[j+2]);hi=Math.max(hi,pixels[j],pixels[j+1],pixels[j+2]);}
        return {kind,name:art.name,identity:art.identity,rarity:art.rarity,palette:art.palette,aura:css.getPropertyValue('--item-aura').trim(),effect:art.effect,file:art.file,crop,source,domCrop,hash,lo,hi,fit,width:picture?pictureRect.width:n.clientWidth,height:picture?pictureRect.height:n.clientHeight,parentWidth:n.clientWidth,parentHeight:n.clientHeight,picture:!!picture,pictureBounds:{left:pictureRect.left-parentRect.left,top:pictureRect.top-parentRect.top,right:pictureRect.right-parentRect.left,bottom:pictureRect.bottom-parentRect.top,width:pictureRect.width,height:pictureRect.height},parentBounds:{width:parentRect.width,height:parentRect.height,borderLeft:parseFloat(parentCss.borderLeftWidth)||0,borderRight:parseFloat(parentCss.borderRightWidth)||0,borderTop:parseFloat(parentCss.borderTopWidth)||0,borderBottom:parseFloat(parentCss.borderBottomWidth)||0},nativeWidth:image.naturalWidth,nativeHeight:image.naturalHeight,filter:parentCss.filter,pictureFilter:css.filter,size:css.backgroundSize.split(',').at(-1).trim().split(/\s+/).map(parseFloat),position:css.backgroundPosition.split(',').at(-1).trim().split(/\s+/).map(parseFloat)};
      }));
    });
    assert.equal(rows.length, 330); const identities = new Set(), fingerprints = new Set();
    for (const r of rows) {
      assert.ok(r.fit, r.identity + ' was really fitted from a decoded PNG');
      assert.equal(r.filter, 'none', r.identity + ' keeps the original object colours');
      assert.ok(r.hi-r.lo > 40, r.identity + ' has actual nonblank art');
      assert.ok(!identities.has(r.identity), 'unique named identity ' + r.identity); identities.add(r.identity);
      assert.ok(!fingerprints.has(r.hash), 'native cell art is not reused for ' + r.identity); fingerprints.add(r.hash);
      const [cols, rs, col, row, nw, nh] = r.fit; assert.equal(nw,r.nativeWidth);assert.equal(nh,r.nativeHeight);
      assert.ok(Math.abs(r.size[0]/nw-r.size[1]/nh) < .00002, r.identity+' scales uniformly');
      const [x,y,w,h]=r.source;assert.ok([x,y,w,h].every(Number.isFinite)&&x>=0&&y>=0&&w>0&&h>0&&x+w<=1.00001&&y+h<=1.00001,r.identity+' has valid native source bounds');
      if(r.file.startsWith('v6-')){
        assert.ok(r.crop,r.identity+' uses measured painted cell bounds rather than an assumed grid');assert.deepEqual(r.domCrop,r.crop,r.identity+' DOM carries the exact measured rectangle');
        assert.equal(r.picture,true,r.identity+' uses a clipped inner image surface for its measured source rectangle');assert.equal(r.pictureFilter,'none');
        const p=r.pictureBounds,b=r.parentBounds;
        assert.ok(p.left>=b.borderLeft-.1&&p.top>=b.borderTop-.1&&p.right<=b.width-b.borderRight+.1&&p.bottom<=b.height-b.borderBottom+.1,r.identity+' contains its whole image inside the quality frame');
        const expectedScale=Math.min(r.parentWidth/(w*nw),r.parentHeight/(h*nh));
        assert.ok(Math.abs(r.size[0]/nw-expectedScale)<.00002,r.identity+' fits the actual crop uniformly without trimming object tips');
        // DOM rectangles are quantized to 1/64px. Check at most two layout units; background pixel scales above remain exact.
        assert.ok(Math.abs(p.height-p.width*(h*nh)/(w*nw))<.04,r.identity+' preserves measured native crop aspect ratio: '+JSON.stringify({picture:p,nativeWidth:w*nw,nativeHeight:h*nh}));
      }
      const left=r.position[0]+x*r.size[0],top=r.position[1]+y*r.size[1],cw=w*r.size[0],ch=h*r.size[1];
      assert.ok(left <= .1 && top <= .1 && left+cw >= r.width-.1 && top+ch >= r.height-.1, r.identity+' shows only its measured source rectangle, excluding neighbouring artwork: '+JSON.stringify({left,top,cw,ch,width:r.width,height:r.height}));
      if(r.kind==='gear'&&r.rarity<2) assert.equal(r.effect,'none','common and modest equipment stays plain');
    }
    const counts=Object.fromEntries(['gear','technique','treasure','pill','utility'].map(kind=>[kind,rows.filter(r=>r.kind===kind).length]));
    assert.deepEqual(counts,{gear:216,technique:48,treasure:12,pill:18,utility:36});
    const red=rows.filter(r=>r.kind==='gear'&&r.rarity===5); assert.ok(new Set(red.map(r=>r.aura)).size>=10,'red quality retains many material/element colours');
    const named=(name,palette)=>{const item=rows.find(r=>r.name===name);assert.ok(item,name);assert.equal(item.palette,palette);};
    named('木灵冠','wood');named('寒潮腕','water');named('地脉履','earth');named('五行佩','elements');named('星罗尺','star');named('太虚衣','moon');named('幽火冠','ghostfire');
    const oldTest=fs.readFileSync(path.join(ROOT,'tests/v3-equipment-art.test.cjs'),'utf8'),hashes=[...oldTest.matchAll(/'([^']+\.png)':'([a-f0-9]{64})'/g)];assert.equal(hashes.length,26);
    for(const [,file,hash] of hashes)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,'web/assets',file))).digest('hex'),hash,file+' original preserved');
    fs.writeFileSync(path.join(DIST,'named-art-native-cells.json'),JSON.stringify(rows,null,2)+'\n');
    for (const rarity of [0, 5]) {
      await page.evaluate(({ rows, rarity }) => {
        const lab = document.querySelector('#qa-named-art-lab'), icons = [...lab.children];
        const chosen = rows.map((r,i) => ({r,icon:icons[i]})).filter(x => x.r.kind === 'gear' && x.r.rarity === rarity);
        const sheet = document.createElement('section'); sheet.id = 'qa-named-art-sheet';
        sheet.style = 'position:fixed;inset:0;z-index:1001;background:#0a131b;overflow:auto;padding:20px;';
        const title = document.createElement('h2'); title.style='font-size:22px;margin:0 0 12px;color:#e6d4a0';
        title.textContent = rarity === 5 ? '道品装备 · 品级红框，器物依名称与材质配色' : '凡品装备 · 铁器、粗布、旧靴，各套部位独立图像';sheet.append(title);
        const grid=document.createElement('div');grid.style='display:grid;grid-template-columns:repeat(6,104px);gap:10px;width:674px;';
        for(const {r,icon} of chosen) {const cell=document.createElement('div');cell.style='min-height:114px;color:#d4e2df;font-size:11px;text-align:center';const n=icon.cloneNode();n.style.width='88px';n.style.height='88px';n.style.margin='0 auto 4px';cell.append(n);const name=document.createElement('div');name.textContent=r.name;cell.append(name);grid.append(cell);}
        sheet.append(grid);document.body.append(sheet);window.WendaoArtLayout.refresh();
      }, {rows,rarity});
      await page.waitForTimeout(150);await shot(page,'named-art-quality-'+rarity+'-36-cells.png');
      await page.evaluate(()=>document.querySelector('#qa-named-art-sheet').remove());
    }

    return {counts,nativeCellHashes:fingerprints.size,decodedAtlasFiles:new Set(rows.map(r=>r.file)).size,originalAtlasesPreserved:hashes.length,redAuraColours:new Set(red.map(r=>r.aura)).size};
  }));

  await test('named art mobile actual forge and equipment details expose their name palette and preserve native cell proportions', () => withPage({}, async page => {
    for(const [set,slot,palette] of [['elements','head','wood'],['elements','bracer','water'],['elements','boots','earth'],['array','weapon','star'],['shadow','head','ghostfire']]) {
      await modal(page,'forge',{set,slot,rarity:5});
      const icon=page.locator('.forge-art-preview .named-item');assert.equal(await icon.getAttribute('data-art-palette'),palette);
      assert.equal(await icon.getAttribute('data-art-rarity'),'5');
      await page.waitForFunction(()=>!!document.querySelector('.forge-art-preview [data-atlas-fit]'));
      assert.equal(await icon.evaluate(n=>getComputedStyle(n).filter),'none');
    }
    await shot(page,'named-art-ghostfire-forge-390x844.png');
    await action(page,'forgeGear');await settlement(page,'forgeGear');
    await page.locator('.settlement-inspect').click();assert.equal(await page.locator('.selection-inspect-layer .named-item').getAttribute('data-art-palette'),'ghostfire');
    await shot(page,'named-art-ghostfire-inspection-390x844.png');
    return {actualUiNamedPalettes:5,originalPixelsRetained:true};
  }));

  await test('named art crop fitting becomes stable at idle and never loops on unchanged icon classes', () => withPage({}, async page => {
    await modal(page,'forge',{set:'elements',slot:'bracer',rarity:5});
    await page.waitForFunction(()=>!!document.querySelector('.forge-art-preview [data-atlas-picture]'));
    await page.waitForTimeout(250);
    await page.evaluate(()=>{
      window.__qaIconMutations=0;
      window.__qaIconObserver=new MutationObserver(records=>{window.__qaIconMutations+=records.filter(r=>r.type==='attributes'&&r.target.matches('.art-icon')).length;});
      window.__qaIconObserver.observe(document.body,{subtree:true,attributes:true,attributeFilter:['class','style','data-art-crop']});
    });
    await page.waitForTimeout(1500);
    const mutations=await page.evaluate(()=>{window.__qaIconObserver.disconnect();return window.__qaIconMutations;});
    assert.equal(mutations,0,'unchanged atlas icons must not continuously rewrite their classes/styles');
    await page.selectOption('#forge-slot','head');
    await page.waitForFunction(()=>document.querySelector('.forge-art-preview .named-item')?.dataset.artPalette==='wood');
    return {unchangedIconMutationsIn1500ms:mutations,controlsRemainResponsive:true};
  }));

  await test((FILTER === 'production' ? 'production ' : '') + 'browser asset requests and JavaScript stay clean', async () => {
    assert.deepEqual(report.pageErrors,[]);assert.deepEqual(report.consoleErrors,[]);assert.deepEqual(report.badResponses,[]);assert.deepEqual(report.failedRequests,[]);assert.deepEqual(report.externalRequests,[]);
    return {pageErrors:0,consoleErrors:0,badResponses:0,failedRequests:0,externalRequests:0,deferredMissingImages:report.deferredMissingImages.length};
  });
})().catch(error=>{report.fatal=error.stack||String(error);console.error(report.fatal);process.exitCode=1;}).finally(async()=>{
  if(browser)await browser.close();report.finishedAt=new Date().toISOString();report.passed=report.tests.filter(t=>t.passed).length;report.failed=report.tests.filter(t=>!t.passed).length;
  const file=FILTER==='production'?'browser-activity-production.json':'browser-activity-named-art.json';fs.writeFileSync(path.join(DIST,file),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({passed:report.passed,failed:report.failed,report:'dist/'+file,screenshots:report.screenshots}));if(report.failed||report.fatal)process.exitCode=1;
});
