'use strict';
// Captures the floating numbers mid-combat (the main check pauses before shooting).
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const { chromium } = require(path.join(ROOT, 'qa-tools/node_modules/playwright'));
const BASE = process.env.LINGQI_URL || 'http://127.0.0.1:8787/';
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: EDGE, args: ['--no-sandbox', '--disable-gpu'] });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const page = await context.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.locator('#accept-age').check();
  await page.locator('[data-ui="enter"]').click();
  await page.waitForFunction(() => window.Lingqi && window.Lingqi.state());

  await page.evaluate(() => {
    const s = window.Lingqi.state();
    s.stones = 999999;
    for (const id of Object.keys(s.techniques)) s.techniques[id] = { level: 5, branch: 0, spent: 0, resetUsed: false };
    s.pills.heal0 = 20;
    window.Lingqi.import(JSON.stringify(s));
  });

  await page.evaluate(() => window.Lingqi.showModal('dungeon', { id: 'resource_herb' }));
  await page.locator('button[data-action="startDungeon"]').first().click();
  await page.waitForFunction(() => window.Lingqi.state().battle, null, { timeout: 15000 });

  let best = 0;
  for (let i = 0; i < 200; i++) {
    const n = await page.evaluate(() => document.querySelectorAll('#combat-fx-layer .combat-fx').length);
    if (n > best) {
      best = n;
      if (n >= 2) break;
    }
    await page.waitForTimeout(40);
  }
  await page.screenshot({ path: path.join(ROOT, 'dist', 'v48-combat-fx-live.png') });
  const seen = await page.evaluate(() => [...document.querySelectorAll('#combat-fx-layer .combat-fx')].map((n) => n.className + ' :: ' + n.textContent));
  console.log(JSON.stringify({ best, seen }, null, 2));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
