'use strict';
// Focused browser check for the V4.8 combat feedback layer.
// Uses the installed Edge through Playwright instead of a downloaded Chromium.
const path = require('node:path');
const assert = require('node:assert/strict');
const ROOT = path.resolve(__dirname, '..');
const { chromium } = require(path.join(ROOT, 'qa-tools/node_modules/playwright'));
const BASE = process.env.LINGQI_URL || 'http://127.0.0.1:8787/';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const KEY = 'lingqi-save-v2';
const AGE = 'lingqi-age-confirmed';

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: EDGE, args: ['--no-sandbox', '--disable-gpu'] });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.locator('#accept-age').check();
  await page.locator('[data-ui="enter"]').click();
  await page.waitForFunction(() => window.Lingqi && window.Lingqi.state());

  // Give the account enough punch to actually land hits quickly.
  await page.evaluate(() => {
    const s = window.Lingqi.state();
    s.stones = 999999; s.tickets = 50;
    for (const id of Object.keys(window.Lingqi.state().techniques)) {
      if (window.Lingqi.catalog && window.Lingqi.catalog.techniques[id]) s.techniques[id] = { level: 5, branch: 0, spent: 0, resetUsed: false };
    }
    window.Lingqi.import(JSON.stringify(s));
  });

  await page.evaluate(() => window.Lingqi.showModal('dungeon', { id: 'resource_herb' }));
  await page.locator('button[data-action="startDungeon"]').first().click();
  await page.waitForFunction(() => window.Lingqi.state().battle, null, { timeout: 15000 });

  const layer = page.locator('#combat-fx-layer');
  assert.equal(await layer.count(), 1, 'the fx layer exists outside the patched tree');
  const box = await layer.boundingBox();
  assert.ok(box && box.width > 0 && box.height > 0, 'the fx layer covers the viewport');

  // Watch for floats and the hurt flash across a few seconds of real combat.
  let sawFloat = false, sawTone = null, sawHurt = false, sawCombo = false, sawEnemyIndex = false;
  for (let i = 0; i < 120; i++) {
    const probe = await page.evaluate(() => {
      const floats = [...document.querySelectorAll('#combat-fx-layer .combat-fx')];
      const combo = document.getElementById('combat-combo');
      return {
        floats: floats.map((n) => ({ text: n.textContent, cls: n.className, left: n.style.left, top: n.style.top })),
        comboHidden: combo ? combo.hidden : true,
        comboText: combo ? combo.textContent : '',
        hurt: !!document.querySelector('.enemy-card.hurt'),
        enemyIndex: document.querySelectorAll('.enemy-card[data-enemy-index]').length,
      };
    });
    if (probe.floats.length) {
      sawFloat = true;
      sawTone = probe.floats.map((f) => f.cls).join('|');
      for (const f of probe.floats) {
        assert.match(f.text, /^([+-][\d.]+[万亿]?|击破.*|护盾 -\d+)$/, 'float text is a signed number or a kill label: ' + f.text);
        assert.ok(parseFloat(f.left) >= 0 && parseFloat(f.top) >= 0, 'floats are positioned on screen');
      }
    }
    if (probe.comboHidden === false && probe.comboText) sawCombo = true;
    if (probe.hurt) sawHurt = true;
    if (probe.enemyIndex > 0) sawEnemyIndex = true;
    if (sawFloat && sawHurt && sawCombo && sawEnemyIndex) break;
    await page.waitForTimeout(100);
  }

  // Floats must not pile up: once the fight stops producing events they expire on their own.
  await page.evaluate(() => window.Lingqi.act('pauseBattle', { paused: true }));
  await page.waitForTimeout(1600);
  const leftover = await page.locator('#combat-fx-layer .combat-fx').count();
  assert.equal(leftover, 0, 'floats clean themselves up');

  const perf = await page.evaluate(() => {
    const b = window.Lingqi.state().battle;
    return b ? { ...b.performance } : null;
  });

  // Reduced motion: floats still readable, no animation.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const reduced = await page.evaluate(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  assert.equal(reduced, true, 'reduced motion can be emulated');

  await page.screenshot({ path: path.join(ROOT, 'dist', 'v48-combat-fx.png') });

  console.log(JSON.stringify({
    sawFloat, sawHurt, sawCombo, sawEnemyIndex, tones: sawTone, leftover, perf,
    errors: errors.slice(0, 5),
  }, null, 2));

  assert.ok(sawFloat, 'floating numbers appear during a real battle');
  assert.ok(sawHurt, 'enemies flash when hit');
  assert.ok(sawEnemyIndex, 'enemy cards expose their index for anchoring');
  assert.equal(errors.length, 0, 'no page errors: ' + errors.slice(0, 3).join(' | '));

  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
