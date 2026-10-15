'use strict';

// Real controls change validated inventory fixtures. These tests cover UI,
// persistence and battle locks; they do not establish economy or game balance.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const ROOT = path.resolve(process.env.LINGQI_ROOT || path.join(__dirname, '..'));
const BASE = process.env.LINGQI_URL || 'http://127.0.0.1:8787/';
const DIST = path.join(ROOT, 'dist');
const FILTER = process.env.LINGQI_FILTER || '';
const { chromium } = require(path.join(ROOT, 'qa-tools/node_modules/playwright'));
const E = require(path.join(ROOT, 'web/engine.js'));
const C = E.catalog;
const KEY = 'lingqi-save-v2';
const NOW = process.env.LINGQI_TEST_NOW === undefined ? Date.now() : Number(process.env.LINGQI_TEST_NOW);
assert.ok(Number.isSafeInteger(NOW) && NOW >= 0, 'LINGQI_TEST_NOW must be a valid millisecond timestamp');
const report = { startedAt: new Date().toISOString(), url: BASE, filter: FILTER || null,
  fixtureTimestamp: NOW,
  fixtureNotice: 'Validated unlocked inventory fixtures exercise actual UI controls and saved state; no claim about economic reachability or global optimality.',
  tests: [], screenshots: [], pageErrors: [], consoleErrors: [], failedRequests: [], badResponses: [], externalRequests: [] };
let browser;

function fixture(options = {}) {
  const s = E.createState(NOW);
  if (options.fresh) {
    s.training = false;
    const fresh = E.validate(s);
    assert.ok(fresh.ok, fresh.error);
    return fresh.state;
  }
  s.paths.magic = { realm: 2, layer: 4, xp: 0, reserve: 0 };
  s.paths.body = { realm: 1, layer: 1, xp: 0, reserve: 0 };
  s.training = false;
  s.stones = 1200000;
  s.dust = 5000;
  s.fragments.universal = 5000;
  for (const id of Object.keys(s.materials)) s.materials[id] = 5000;
  for (const [id, t] of Object.entries(C.techniques)) {
    if (t.realm <= 2) s.techniques[id] = { level: 5, branch: 0, spent: 0, resetUsed: false };
  }
  for (const id of Object.keys(C.treasures)) s.ownedTreasures[id] = { level: 1, count: 1, awakening: 0 };
  for (const id of ['heal0', 'shield0', 'purify0']) s.pills[id] = 10;
  for (const slot of Object.keys(C.slots)) {
    const g = E.modules.economy.createGear(s, { slot, set: 'body', rarity: 1, tier: 1 });
    assert.ok(E.modules.economy.addGear(s, g));
    const result = E.act(s, { type: 'equipGear', uid: g.uid }, NOW);
    assert.ok(result.ok, result.message);
  }
  for (const set of Object.keys(C.sets)) {
    for (const slot of Object.keys(C.slots)) {
      assert.ok(E.modules.economy.addGear(s,
        E.modules.economy.createGear(s, { slot, set, rarity: set === 'sword' ? 5 : 3, tier: 2 })));
    }
  }
  // More than six same-slot candidates exercise real pagination.
  for (const set of ['body', 'thunder', 'shadow', 'array']) {
    assert.ok(E.modules.economy.addGear(s,
      E.modules.economy.createGear(s, { slot: 'weapon', set, rarity: 2, tier: 1 })));
  }
  const configured = E.act(s, { type: 'setLoadout', heart: 'body_heart_0',
    skills: ['body_skill_0', 'body_skill_1', 'array_skill_0', 'array_skill_1'],
    secrets: ['body_secret_0', 'array_secret_0'], treasures: ['t10', 't1', 't11'],
    pills: ['heal0', 'shield0', 'purify0'] }, NOW);
  assert.ok(configured.ok, configured.message);
  for (const id of options.missingTechniques || []) delete s.techniques[id];
  if (options.forgeGoal) {
    s.bag = s.bag.filter(g => g.set !== options.forgeGoal || ['weapon', 'armor'].includes(g.slot));
    if (!s.blueprints.includes(options.forgeGoal)) s.blueprints.push(options.forgeGoal);
  }
  if (options.emptySlot) {
    s.bag = s.bag.filter(g => g.slot !== options.emptySlot);
    s.equipped[options.emptySlot] = null;
  }
  if (options.currentOnly) s.bag = s.bag.filter(g => g.slot !== options.currentOnly || g.uid === s.equipped[options.currentOnly]);
  if (options.battle) {
    const started = E.act(s, { type: 'startDungeon', id: 'resource_herb' }, NOW);
    assert.ok(started.ok, started.message);
    assert.ok(E.act(s, { type: 'pauseBattle', paused: true }, NOW).ok);
  }
  const verified = E.validate(s);
  assert.ok(verified.ok, verified.error);
  return verified.state;
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

async function withPage(options, run) {
  const state = fixture(options);
  const width = options.width || 390;
  const context = await browser.newContext({ viewport: { width, height: width > 600 ? 1000 : 844 },
    deviceScaleFactor: 1, isMobile: width < 600, hasTouch: width < 600, reducedMotion: 'reduce' });
  context.setDefaultTimeout(8000);
  let page;
  try {
    await context.addInitScript(({ state, key, now }) => {
      Date.now = () => now;
      if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state));
      localStorage.setItem('lingqi-age-confirmed', 'yes');
      localStorage.setItem('lingqi_audio_v1', JSON.stringify({ muted: true, music: .45, effects: .6 }));
    }, { state, key: KEY, now: NOW });
    page = await context.newPage();
    observe(page);
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.Lingqi?.state() && window.WendaoSelection);
    return await run(page, state);
  } catch (error) {
    if (page) {
      try { await shot(page, 'equipment-builds-failure-' + report.tests.length + '.png'); } catch (_) {}
    }
    throw error;
  } finally { await context.close(); }
}

async function test(name, run) {
  if (FILTER && !name.includes(FILTER)) return;
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
const stored = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
async function payloadButton(page, selector, predicate = () => true) {
  const buttons = page.locator(selector);
  for (let i = 0; i < await buttons.count(); i++) {
    const button = buttons.nth(i);
    const value = await button.evaluate(node => JSON.parse(node.dataset.payload || '{}'));
    if (predicate(value)) return button;
  }
  throw Error('No matching actual control: ' + selector);
}
async function ui(page, name, predicate = () => true) {
  await (await payloadButton(page, 'button[data-ui="' + name + '"]', predicate)).click();
}
async function close(page) {
  if (await page.locator('.selection-inspect-layer').count()) await page.keyboard.press('Escape');
  if (await page.locator('#modal-layer [role="dialog"]').count()) await page.keyboard.press('Escape');
}
async function character(page, tab = 'gear') {
  await close(page);
  await page.locator('.nav-bottom button[data-page="character"]').click();
  await ui(page, 'layout-tab', p => p.section === 'character' && p.tab === tab);
}
async function slotPicker(page, slot) {
  await character(page);
  const activeState = await stateOf(page);
  await (await payloadButton(page, '.character-slot[data-ui="equipment"]', p => p.slot === slot ||
    p.uid && activeState.bag.some(g => g.uid === p.uid && g.slot === slot))).click();
  if (await page.locator('#modal-layer [role="dialog"]').getAttribute('aria-label') === '灵装养成') {
    const controls = '#modal-layer button[data-ui="equipment"], #modal-layer button[data-ui="gear-change"]';
    await (await payloadButton(page, controls, p => p.slot === slot)).click();
  }
  await page.waitForSelector('.selection-slot-equipment[data-selection-slot="' + slot + '"]');
  assert.equal(await page.locator('#filter-gear-slot').inputValue(), slot);
}
async function hold(page, locator, move = false) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  assert.ok(box && box.width > 20 && box.height > 20);
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  if (move) await page.mouse.move(x + 20, y + 10, { steps: 3 });
  await page.waitForTimeout(540);
  await page.mouse.up();
}
async function shot(page, name) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(120);
  await page.screenshot({ path: path.join(DIST, name), fullPage: false });
  report.screenshots.push(name);
}
async function geometry(page) {
  const g = await page.evaluate(() => ({ width: innerWidth, html: document.documentElement.scrollWidth,
    body: document.body.scrollWidth, modal: [...document.querySelectorAll('#modal-layer .modal')].map(n => ({ width: n.getBoundingClientRect().width, x: n.getBoundingClientRect().x,
      scrollWidth: n.scrollWidth, clientWidth: n.clientWidth })) }));
  assert.ok(g.html <= g.width + 1 && g.body <= g.width + 1, 'no document horizontal overflow: ' + JSON.stringify(g));
  assert.ok(g.modal.every(m => m.x >= -1 && m.width + m.x <= g.width + 1 && m.scrollWidth <= m.clientWidth + 1),
    'modal fits viewport without horizontal overflow: ' + JSON.stringify(g));
  return g;
}
function ownership(before, after) {
  assert.deepEqual(after.bag, before.bag, 'one-click configurations only use existing inventory');
  for (const key of ['stones', 'dust', 'jade', 'tickets', 'materials', 'techniques', 'ownedTreasures', 'pills', 'fragments', 'slotLevels']) {
    assert.deepEqual(after[key], before[key], 'configuration does not manufacture or consume ' + key);
  }
  for (const [slot, uid] of Object.entries(after.equipped)) {
    if (uid) assert.ok(after.bag.some(g => g.uid === uid && g.slot === slot), 'equipped UID really belongs to this slot');
  }
}

(async () => {
  fs.mkdirSync(DIST, { recursive: true });
  browser = await chromium.launch({ headless: true, executablePath: process.env.LINGQI_CHROMIUM || '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-gpu'], env: { ...process.env, FONTCONFIG_FILE: path.join(ROOT, 'qa-tools/fonts.conf') } });
  report.browser = await browser.version();

  await test('all six character slots open their exact replacement screen through equipment details', () => withPage({}, async page => {
    const original = await stateOf(page), entries = [];
    for (const slot of Object.keys(C.slots)) {
      await slotPicker(page, slot);
      const current = page.locator('.selection-equipment-current [data-gear-uid]');
      assert.equal(await current.getAttribute('data-gear-uid'), original.equipped[slot]);
      const uids = await page.locator('.selection-equipment-candidates [data-gear-uid]').evaluateAll(nodes => nodes.map(n => n.dataset.gearUid));
      assert.ok(uids.length > 0, 'same-slot inventory candidates are shown');
      assert.ok(uids.every(uid => uid !== original.equipped[slot] && original.bag.some(g => g.uid === uid && g.slot === slot)), 'candidates are only unequipped gear for the current slot');
      entries.push({ slot, current: original.equipped[slot], candidates: uids });
      await geometry(page);
      await close(page);
    }
    assert.deepEqual(await stateOf(page), original, 'navigation alone does not equip or alter progression');
    return entries;
  }));

  await test('long-press shows full current and candidate attributes without accidental replacement', () => withPage({}, async page => {
    await slotPicker(page, 'weapon');
    const before = await stateOf(page);
    for (const scope of ['.selection-equipment-current', '.selection-equipment-candidates']) {
      const tile = page.locator(scope + ' .selection-tile').first();
      const uid = await tile.getAttribute('data-inspect-id');
      await hold(page, tile);
      await page.waitForSelector('.selection-inspect-layer [role="dialog"]');
      const body = await page.locator('.selection-inspect-body').innerText();
      assert.ok(body.includes('攻击') && body.includes('两件') && body.includes('四件'), 'actual stats and both set milestones are explained');
      assert.equal((await stateOf(page)).equipped.weapon, before.equipped.weapon);
      assert.ok(before.bag.some(g => g.uid === uid));
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('.selection-inspect-layer').count(), 0);
    }
    assert.deepEqual(await stateOf(page), before);
  }));

  await test('pointer movement cancels inspection and replacement', () => withPage({}, async page => {
    await slotPicker(page, 'weapon');
    const before = await stateOf(page);
    await hold(page, page.locator('.selection-equipment-candidates .selection-tile').first(), true);
    assert.equal(await page.locator('.selection-inspect-layer').count(), 0, 'moving a pressed card never opens its long-press detail');
    assert.deepEqual(await stateOf(page), before, 'drag or scroll gesture never equips its starting card');
  }));

  await test('candidate replacement updates current slot and persistent save while preserving page position', () => withPage({}, async page => {
    await slotPicker(page, 'weapon');
    const before = await stateOf(page);
    const next = page.locator('.selection-slot-equipment button[data-selection="page"][aria-label="下一页"]');
    assert.ok(await next.count() && await next.isEnabled(), 'fixture has genuine replacement pagination');
    await next.click();
    const model = await page.locator('.selection-slot-equipment').getAttribute('data-selection-options');
    assert.equal(JSON.parse(model).page, 1);
    const tile = page.locator('.selection-equipment-candidates .selection-tile').first();
    await tile.scrollIntoViewIfNeeded();
    const top = await page.locator('#modal-layer .modal-body').evaluate(node => node.scrollTop);
    const uid = await tile.getAttribute('data-inspect-id');
    await tile.click();
    const after = await stateOf(page);
    assert.equal(after.equipped.weapon, uid);
    assert.equal((await stored(page)).equipped.weapon, uid);
    ownership(before, after);
    assert.equal(await page.locator('.selection-equipment-current [data-gear-uid]').getAttribute('data-gear-uid'), uid);
    assert.equal(JSON.parse(await page.locator('.selection-slot-equipment').getAttribute('data-selection-options')).page, 1, 'replacement preserves candidate pagination');
    assert.ok(Math.abs(await page.locator('#modal-layer .modal-body').evaluate(node => node.scrollTop) - top) <= 2, 'replacement preserves modal scroll position');
    const reloadSave = await stored(page);
    await page.reload({ waitUntil: 'networkidle' });
    assert.deepEqual((await stateOf(page)).equipped, reloadSave.equipped, 'replacement survives reload');
    return { oldUid: before.equipped.weapon, newUid: uid, page: 1, scrollTop: top };
  }));

  for (const option of [{ emptySlot: 'boots' }, { currentOnly: 'armor' }]) {
    const slot = option.emptySlot || option.currentOnly;
    await test((option.emptySlot ? 'empty' : 'current-only') + ' slot explains empty inventory without fabricated equipment', () => withPage(option, async page => {
      await slotPicker(page, slot);
      const before = await stateOf(page);
      assert.equal(await page.locator('.selection-equipment-candidates .selection-tile').count(), 0);
      assert.ok((await page.locator('.selection-equipment-candidates').innerText()).includes('暂无其他'));
      assert.equal(await page.locator('.selection-current-empty').count(), option.emptySlot ? 1 : 0);
      assert.equal(await page.locator('.selection-equipment-current [data-gear-uid]').count(), option.currentOnly ? 1 : 0);
      assert.deepEqual(await stateOf(page), before);
      await geometry(page);
    }));
  }

  await test('sets entry presents real 2/4-piece activation, school synergy and all owned pieces', () => withPage({}, async page => {
    await character(page);
    await ui(page, 'equipment-sets');
    assert.equal(await page.locator('#modal-layer [role="dialog"]').getAttribute('aria-label'), '成套装备');
    const before = await stateOf(page);
    const active = page.locator('.build-school-tab.active');
    assert.equal((await active.evaluate(n => JSON.parse(n.dataset.payload))).set, 'body');
    assert.equal(await page.locator('.build-effect.active').count(), 2, 'actual worn six-piece body set activates both existing milestones');
    assert.ok((await page.locator('.build-synergy').innerText()).length > 15, 'synergy explains how matching techniques make this set useful');
    await ui(page, 'equipment-sets', p => p.set === 'sword');
    assert.equal(await page.locator('.build-effect.active').count(), 0, 'owned but unworn sword set does not claim activation');
    assert.ok((await page.locator('.build-effects').innerText()).includes(C.sets.sword.twoEffect));
    assert.ok((await page.locator('.build-effects').innerText()).includes(C.sets.sword.fourEffect));
    await page.locator('details.build-detail summary').click();
    const uids = await page.locator('.build-gear-tile[data-inspect-id]').evaluateAll(n => n.map(n => n.dataset.inspectId));
    assert.equal(uids.length, 6);
    assert.ok(uids.every(uid => before.bag.some(g => g.uid === uid && g.set === 'sword')), 'set preview only shows owned real instances');
    assert.deepEqual(await stateOf(page), before);
    await geometry(page);
    return { initialActive: 'body', swordUids: uids };
  }));

  await test('one-click owned set changes all six slots and activates genuine attribute effects', () => withPage({}, async page => {
    await character(page, 'loadout');
    await ui(page, 'equipment-sets');
    await ui(page, 'equipment-sets', p => p.set === 'sword');
    const before = await stateOf(page);
    const expected = await page.evaluate(() => window.WendaoEconomy.equipmentSetView(window.Lingqi.state(), 'sword').recommendation);
    const action = await payloadButton(page, '#modal-layer button[data-action="equipSet"]', p => p.set === 'sword');
    assert.ok(await action.isEnabled());
    await action.click();
    const after = await stateOf(page);
    assert.deepEqual(after.equipped, expected.equipped, 'the whole set is one real engine commit');
    assert.deepEqual(after.loadouts, before.loadouts, 'set-only action retains every technique and combat item');
    ownership(before, after);
    assert.equal(E.attributes(after).sets.sword, 6);
    assert.notEqual(E.attributes(after).attack, E.attributes(before).attack, 'changing real equipment changes real combat stats');
    assert.equal(await page.locator('.build-effect.active').count(), 2);
    assert.deepEqual((await stored(page)).equipped, after.equipped);
    await page.reload({ waitUntil: 'networkidle' });
    assert.deepEqual((await stateOf(page)).equipped, after.equipped);
    return { oldPower: E.attributes(before).power, newPower: E.attributes(after).power, activeSwordPieces: 6 };
  }));

  await test('six school recommendations explain roles, rotations and technique purposes', () => withPage({}, async page => {
    await character(page, 'techniques');
    await ui(page, 'build-recommendations');
    const initial = await stateOf(page), summaries = [];
    for (const school of Object.keys(C.schools)) {
      await ui(page, 'build-recommendations', p => p.school === school);
      const plan = await page.evaluate(school => window.WendaoBuilds.plan(window.Lingqi.state(), school), school);
      const overview = await page.locator('.build-overview').innerText();
      assert.ok(overview.includes(plan.summary.position) && overview.includes(plan.summary.description), 'role and suitable use are visible: ' + school);
      assert.ok((await page.locator('.build-rotation').innerText()).includes(plan.summary.rotation[0]), 'recommended combat sequence is visible');
      const entries = [plan.heart, ...plan.skills, ...plan.secrets].filter(Boolean);
      assert.equal(await page.locator('.build-technique').count(), entries.length);
      for (const entry of entries) assert.ok((await page.locator('.build-technique-grid').innerText()).includes(entry.reason), 'concrete recommendation reason: ' + entry.id);
      assert.ok(entries.every(entry => initial.techniques[entry.id]), 'recommendations contain learned techniques only');
      await geometry(page);
      summaries.push({ school, position: plan.summary.position, names: entries.map(e => e.name) });
    }
    assert.deepEqual(await stateOf(page), initial, 'browsing schools alone never commits a loadout');
    return summaries;
  }));

  await test('one-click recommendation atomically saves equipment, heart, skills and secrets with real persisted identities', () => withPage({}, async page => {
    await character(page, 'loadout');
    const pageTop = await page.locator('#page-content').evaluate(node => { node.scrollTop = Math.min(50, node.scrollHeight - node.clientHeight); return node.scrollTop; });
    await ui(page, 'build-recommendations');
    await ui(page, 'build-recommendations', p => p.school === 'sword');
    const before = await stateOf(page);
    const plan = await page.evaluate(() => window.WendaoBuilds.plan(window.Lingqi.state(), 'sword'));
    assert.ok(plan.changed);
    assert.notEqual(plan.loadout.heart, before.loadouts.magic.heart, 'fixture genuinely exercises heart replacement');
    assert.notDeepEqual(plan.loadout.skills, before.loadouts.magic.skills);
    assert.notDeepEqual(plan.loadout.secrets, before.loadouts.magic.secrets);
    const button = await payloadButton(page, '#modal-layer button[data-action="equipRecommendedBuild"]', p => p.school === 'sword');
    assert.ok(await button.isEnabled());
    await button.click();
    const after = await stateOf(page);
    assert.deepEqual(after.equipped, plan.equipped);
    assert.deepEqual(after.loadouts.magic, plan.loadout);
    assert.deepEqual(after.loadouts.body, before.loadouts.body, 'inactive route remains independent');
    assert.deepEqual(E.attributes(after), plan.after, 'previewed stats are the committed combat stats');
    ownership(before, after);
    assert.deepEqual((await stored(page)).loadouts.magic, after.loadouts.magic);
    assert.deepEqual((await stored(page)).equipped, after.equipped);
    assert.equal(await page.locator('#page-content').evaluate(node => node.scrollTop), pageTop, 'background character page retains its scroll');
    const applied = await payloadButton(page, '#modal-layer button[data-action="equipRecommendedBuild"]', p => p.school === 'sword');
    assert.ok(await applied.isDisabled(), 'already applied plan cannot be repeatedly committed');
    await close(page);
    assert.equal(await page.locator('#page-content').evaluate(node => node.scrollTop), pageTop);
    await page.reload({ waitUntil: 'networkidle' });
    assert.deepEqual((await stateOf(page)).loadouts.magic, after.loadouts.magic);
    assert.deepEqual((await stateOf(page)).equipped, after.equipped);
    return { recommendedSchool: plan.school, oldPower: plan.before.power, newPower: plan.after.power, equipment: after.equipped, loadout: after.loadouts.magic };
  }));

  await test('improvement goals show future unlocks, sources and navigation from an incomplete build', () => withPage({ missingTechniques: ['sword_skill_3', 'sword_heart_1'] }, async page => {
    await character(page, 'techniques');
    await ui(page, 'build-recommendations');
    await ui(page, 'build-recommendations', p => p.school === 'sword');
    const plan = await page.evaluate(() => window.WendaoBuilds.plan(window.Lingqi.state(), 'sword'));
    assert.ok(plan.goals.length > 0, 'fixture leaves meaningful missing-technique goals');
    await ui(page, 'build-tab', p => p.tab === 'goals');
    assert.equal(await page.locator('.build-goals article').count(), plan.goals.length);
    const text = await page.locator('.build-goals').innerText();
    for (const goal of plan.goals) {
      assert.ok(text.includes(goal.name) && text.includes(goal.reason), 'goal names have reasons');
      if (goal.source?.label) assert.ok(text.includes(goal.source.label), 'goal has real acquisition source');
      for (const requirement of goal.requirements || []) assert.ok(text.includes(requirement), 'unlock requirement is explicit');
    }
    const source = page.locator('.build-goals button[data-ui="source"]').first();
    if (await source.count()) {
      const id = (await source.evaluate(n => JSON.parse(n.dataset.payload))).id;
      await source.click();
      assert.equal(await page.locator('#page-content').getAttribute('data-page'), 'adventure');
      assert.ok((await page.locator('#modal-layer').innerText()).includes(C.dungeons[id].name));
    } else {
      await page.locator('.build-goals button[data-ui="techniques"]').first().click();
      assert.ok((await page.locator('#modal-layer').innerText()).includes('功法图鉴'));
    }
    return { goals: plan.goals.map(g => ({ name: g.name, requirements: g.requirements, source: g.source })) };
  }));

  await test('fresh account recommendations respect starter ownership and locked skill/secret slots', () => withPage({ fresh: true }, async page => {
    await character(page, 'techniques');
    await ui(page, 'build-recommendations');
    const before = await stateOf(page);
    const plan = await page.evaluate(() => window.WendaoBuilds.plan(window.Lingqi.state(), 'auto'));
    assert.ok(Number.isFinite(plan.before.power) && Number.isFinite(plan.after.power));
    assert.ok(plan.loadout.skills.length <= 2 && plan.loadout.secrets.length === 0, 'first-layer plan cannot bypass unlocked combat slots');
    const text = await page.locator('#modal-layer').innerText();
    assert.ok(!/NaN|Infinity|undefined/.test(text), 'first-layer recommendations explain usable options without invalid numeric values');
    assert.ok(text.includes(plan.summary.position));
    const button = page.locator('#modal-layer button[data-action="equipRecommendedBuild"]');
    if (plan.changed) {
      assert.ok(await button.isEnabled());
      await button.click();
      ownership(before, await stateOf(page));
      assert.deepEqual((await stateOf(page)).loadouts.magic, plan.loadout);
    } else assert.ok(await button.isDisabled(), 'already-equipped starter plan is stated clearly');
    await ui(page, 'build-tab', p => p.tab === 'goals');
    assert.ok(await page.locator('.build-goals article').count() > 0, 'new players see what to earn next');
    await geometry(page);
    return { starterPower: plan.before.power, planSchool: plan.school, goals: plan.goals.map(g => g.name) };
  }));

  await test('upgrade growth goal spends its exact cost, saves the new level and refreshes the next upgrade', () => withPage({ width: 375 }, async page => {
    await character(page, 'techniques');
    await ui(page, 'build-recommendations');
    await ui(page, 'build-recommendations', p => p.school === 'sword');
    await ui(page, 'build-tab', p => p.tab === 'goals');
    const before = await stateOf(page);
    const plan = await page.evaluate(() => window.WendaoBuilds.plan(window.Lingqi.state(), 'sword'));
    const goal = plan.goals.find(g => g.kind === 'upgrade' && g.available);
    assert.ok(goal, 'already owned techniques still provide a meaningful growth target');
    const id = goal.source.id, level = before.techniques[id].level;
    const cost = E.costs(before, 'upgradeTechnique', { id });
    assert.deepEqual(goal.cost, cost, 'goal amount agrees with the real engine cost');
    const button = await payloadButton(page, '.build-goals button[data-action="upgradeTechnique"]', p => p.id === id);
    assert.ok(await button.isEnabled());
    const initialCard = button.locator('xpath=ancestor::article');
    assert.ok((await initialCard.locator('.build-goal-progress').innerText()).includes('当前 ' + level + ' 重'));
    assert.equal(await initialCard.locator('.build-goal-progress .fill').evaluate(n => parseFloat(n.style.width)), level / goal.target * 100);
    await button.scrollIntoViewIfNeeded();
    await shot(page, 'equipment-builds-upgrade-goals-375.png');
    const top = await page.locator('#modal-layer .modal-body').evaluate(node => node.scrollTop);
    await button.click();
    const after = await stateOf(page);
    assert.equal(after.techniques[id].level, level + 1, 'real owned technique advanced exactly one level');
    assert.equal(after.revision, before.revision + 1, 'upgrade commits exactly once');
    for (const key of ['stones', 'jade', 'dust', 'tickets']) assert.equal(after[key], before[key] - (cost[key] || 0), 'exact resource cost: ' + key);
    for (const key of Object.keys(before.materials)) assert.equal(after.materials[key], before.materials[key] - (cost.materials?.[key] || 0), 'exact material cost: ' + key);
    assert.deepEqual(after.bag, before.bag);
    assert.deepEqual(after.loadouts, before.loadouts, 'training does not accidentally apply the entire suggested build');
    assert.equal((await stored(page)).techniques[id].level, level + 1, 'upgrade is durably saved');
    const refreshedPlan = await page.evaluate(() => window.WendaoBuilds.plan(window.Lingqi.state(), 'sword'));
    const refreshedGoal = refreshedPlan.goals.find(g => g.source.type === 'upgrade' && g.source.id === id);
    assert.ok(refreshedGoal);
    assert.equal(refreshedGoal.level, level + 1, 'cached recommendations refresh immediately after growth');
    const nextCost = E.costs(after, 'upgradeTechnique', { id });
    assert.deepEqual(refreshedGoal.cost, nextCost);
    const currentButton = await payloadButton(page, '.build-goals button[data-action="upgradeTechnique"]', p => p.id === id);
    const card = currentButton.locator('xpath=ancestor::article');
    assert.ok((await card.innerText()).includes(Number(nextCost.stones).toLocaleString('zh-CN')), 'visible card shows the next actual cost');
    assert.ok((await card.locator('.build-goal-progress').innerText()).includes('当前 ' + (level + 1) + ' 重'), 'visible progress text refreshes');
    assert.equal(await card.locator('.build-goal-progress .fill').evaluate(n => parseFloat(n.style.width)), (level + 1) / refreshedGoal.target * 100, 'visible progress bar advances');
    const growthControls = await card.evaluate(n => {
      const r = n.getBoundingClientRect();
      return [...n.querySelectorAll('.cost, button')].map(control => {
        const box = control.getBoundingClientRect();
        return { width: box.width, left: box.left, right: box.right, inside: box.left >= r.left - 1 && box.right <= r.right + 1 };
      });
    });
    assert.ok(growthControls.every(c => c.width > 20 && c.inside), 'costs and actionable controls stay within their growth card');
    assert.ok(Math.abs(await page.locator('#modal-layer .modal-body').evaluate(node => node.scrollTop) - top) <= 2, 'upgrading keeps goal-page scroll position');
    await geometry(page);
    await shot(page, 'equipment-builds-upgrade-goals-after-375.png');
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal((await stateOf(page)).techniques[id].level, level + 1);
    return { id, oldLevel: level, newLevel: level + 1, paid: cost, nextCost };
  }));

  await test('forge growth goal opens the correct school and missing slot without spending resources', () => withPage({ forgeGoal: 'thunder', width: 375 }, async page => {
    await character(page, 'techniques');
    await ui(page, 'build-recommendations');
    await ui(page, 'build-recommendations', p => p.school === 'thunder');
    await ui(page, 'build-tab', p => p.tab === 'goals');
    const before = await stateOf(page);
    const plan = await page.evaluate(() => window.WendaoBuilds.plan(window.Lingqi.state(), 'thunder'));
    const goal = plan.goals.find(g => g.source?.type === 'forge');
    assert.ok(goal, 'blueprint plus missing pieces exposes a real forge goal');
    const control = await payloadButton(page, '.build-goals button[data-ui="source"]', p => p.type === 'forge');
    const parameter = await control.evaluate(n => JSON.parse(n.dataset.payload));
    assert.equal(parameter.set, 'thunder');
    assert.equal(parameter.slot, plan.summary.set.missingSlots[0]);
    await control.click();
    assert.equal(await page.locator('#page-content').getAttribute('data-page'), 'cave');
    assert.equal(await page.locator('#forge-set').inputValue(), 'thunder', 'does not fall back to sword');
    assert.equal(await page.locator('#forge-slot').inputValue(), parameter.slot, 'missing slot is selected');
    assert.equal(await page.locator('#forge-rarity').inputValue(), '3', 'the reachable target rarity is selected');
    assert.ok((await page.locator('#forge-art-preview').innerText()).includes(C.sets.thunder.name));
    assert.deepEqual(await stateOf(page), before, 'looking at a forge target does not craft or consume anything');
    assert.deepEqual((await stored(page)).bag, before.bag);
    await geometry(page);
    await shot(page, 'equipment-builds-forge-goal-375.png');
    return { set: parameter.set, slot: parameter.slot, rarity: 3 };
  }));

  for (const mode of ['set', 'recommendation', 'slot']) {
    await test('save failure rolls back the entire ' + mode + ' change and keeps previous durable save', () => withPage({}, async page => {
      let button;
      if (mode === 'slot') {
        await slotPicker(page, 'weapon');
        button = page.locator('.selection-equipment-candidates .selection-tile').first();
      } else {
        await character(page);
        await ui(page, mode === 'set' ? 'equipment-sets' : 'build-recommendations');
        await ui(page, mode === 'set' ? 'equipment-sets' : 'build-recommendations', p => (mode === 'set' ? p.set : p.school) === 'sword');
        button = page.locator('#modal-layer button[data-action="' + (mode === 'set' ? 'equipSet' : 'equipRecommendedBuild') + '"]');
      }
      const before = await stateOf(page), durable = await stored(page);
      await page.evaluate(key => {
        const setItem = Storage.prototype.setItem;
        window.__restoreSave = () => { Storage.prototype.setItem = setItem; };
        Storage.prototype.setItem = function(name, value) {
          if (name === key) throw new DOMException('Test storage quota exhausted', 'QuotaExceededError');
          return setItem.call(this, name, value);
        };
      }, KEY);
      await button.click();
      assert.deepEqual(await stateOf(page), before, 'entire in-memory state is rolled back');
      assert.deepEqual(await stored(page), durable, 'previous durable save remains intact');
      assert.ok((await page.locator('#toast').innerText()).includes('撤回'), 'user sees a clear save failure');
      await page.evaluate(() => window.__restoreSave());
      await page.reload({ waitUntil: 'networkidle' });
      assert.deepEqual((await stateOf(page)).equipped, durable.equipped);
      assert.deepEqual((await stateOf(page)).loadouts, durable.loadouts);
    }));
  }

  await test('paused battle locks gear, sets and recommendations while leaving gear inspection available', () => withPage({ battle: true }, async page => {
    const initial = await stateOf(page);
    await page.evaluate(() => window.Lingqi.showModal('equipment', { slot: 'weapon' }));
    const tile = page.locator('.selection-equipment-candidates .selection-tile').first();
    assert.equal(await tile.getAttribute('aria-disabled'), 'true');
    await tile.scrollIntoViewIfNeeded();
    const box = await tile.boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    assert.deepEqual(await stateOf(page), initial);
    await hold(page, tile);
    await page.waitForSelector('.selection-inspect-layer');
    await page.keyboard.press('Escape');
    for (const [type, parameter, modal] of [['equipSet', { set: 'sword' }, 'equipment-sets'],
      ['equipRecommendedBuild', { school: 'sword' }, 'build-recommendations']]) {
      await page.evaluate(({ modal, parameter }) => window.Lingqi.showModal(modal, parameter), { modal, parameter });
      assert.ok(await page.locator('#modal-layer button[data-action="' + type + '"]').isDisabled());
      const result = await page.evaluate(({ type, parameter }) => window.Lingqi.act(type, parameter), { type, parameter });
      assert.equal(result.ok, false, 'engine also enforces battle lock');
      assert.deepEqual(await stateOf(page), initial, 'combat loadout and battle snapshot remain immutable');
    }
  }));

  for (const width of [375, 390, 1280]) {
    await test('character, sets, recommendations and slot replacement fit ' + width + 'px with screenshots', () => withPage({ width }, async page => {
      const layouts = [];
      await character(page, 'loadout');
      layouts.push({ name: 'character', ...await geometry(page) });
      await shot(page, 'equipment-builds-character-' + width + '.png');
      await ui(page, 'equipment-sets');
      await ui(page, 'equipment-sets', p => p.set === 'sword');
      layouts.push({ name: 'sets', ...await geometry(page) });
      await shot(page, 'equipment-builds-sets-' + width + '.png');
      await close(page);
      await ui(page, 'build-recommendations');
      await ui(page, 'build-recommendations', p => p.school === 'sword');
      for (const tab of ['techniques', 'gear', 'goals']) {
        await ui(page, 'build-tab', p => p.tab === tab);
        layouts.push({ name: 'recommendation-' + tab, ...await geometry(page) });
        await shot(page, 'equipment-builds-' + tab + '-' + width + '.png');
      }
      await close(page);
      await slotPicker(page, 'weapon');
      layouts.push({ name: 'slot', ...await geometry(page) });
      await shot(page, 'equipment-builds-slot-' + width + '.png');
      return layouts;
    }));
  }

  await test('all exercised browser surfaces have zero script, console, network or external request failures', async () => {
    for (const key of ['pageErrors', 'consoleErrors', 'failedRequests', 'badResponses', 'externalRequests']) assert.deepEqual(report[key], [], key);
    return { observedErrors: 0 };
  });
})().catch(error => {
  report.fatal = error.stack || String(error);
  console.error(error);
}).finally(async () => {
  if (browser) await browser.close();
  report.finishedAt = new Date().toISOString();
  report.passed = !report.fatal && report.tests.length > 0 && report.tests.every(t => t.passed);
  const reportName = FILTER ? 'browser-equipment-builds-focused-report.json' : 'browser-equipment-builds-report.json';
  fs.writeFileSync(path.join(DIST, reportName), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ passed: report.passed, tests: report.tests.length,
    failed: report.tests.filter(t => !t.passed).map(t => t.name), screenshots: report.screenshots }));
  if (!report.passed) process.exitCode = 1;
});
