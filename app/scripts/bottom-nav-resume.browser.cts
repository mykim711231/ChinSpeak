// @ts-nocheck
// 복귀 이벤트와 오래된 메뉴 위치를 모의한다. 실기기의 합성/절전 버그 재현을 대신하지 않는다.
// 다른 앱: node scripts/bottom-nav-resume.browser.cjs D:/_Git_PWA/SMCB/app/dist /SMCB/ /search
const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(process.argv[2] || path.join(__dirname, '../dist'));
const prefix = process.argv[3] || '/ChinSpeak/';
const route = process.argv[4] || '/help';
const base = `http://resume.test${prefix}`;
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };

async function main() {
  const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}) });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      const relative = url.pathname.slice(prefix.length) || 'index.html';
      const file = path.resolve(root, relative);
      if (!url.pathname.startsWith(prefix) || !file.startsWith(root + path.sep)) return route.fulfill({ status: 404, body: '' });
      try { await route.fulfill({ contentType: mime[path.extname(file)] || 'application/octet-stream', body: fs.readFileSync(file) }); }
      catch { await route.fulfill({ status: 404, body: '' }); }
    });
    await context.addInitScript(() => {
      localStorage.setItem('chinspeak-settings', JSON.stringify({ version: 4, state: { onboarded: true, voiceMode: 'device', autoDownload: false, installDismissedAt: Date.now() } }));
      let hidden = false;
      Object.defineProperty(document, 'hidden', { get: () => hidden, configurable: true });
      window.__setHidden = value => { hidden = value; document.dispatchEvent(new Event('visibilitychange')); };
      window.__session = Math.random();
    });
    const page = await context.newPage(); page.setDefaultTimeout(15000);
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.clock.install();
    await page.goto(`${base}#${route}`);
    const input = page.locator('input[type=search]').first();
    await input.fill('백업');
    await page.evaluate(() => { window.__input = document.querySelector('input[type=search]'); });
    const session = await page.evaluate(() => window.__session);
    const originalUrl = page.url();
    const bottom = async () => {
      await page.waitForFunction(() => Math.abs(document.querySelector('[data-app-bottom-nav]').getBoundingClientRect().bottom - innerHeight) < 1);
    };
    await bottom();
    for (const event of ['visibilitychange', 'pageshow', 'focus', 'orientationchange']) {
      await input.focus();
      if (event === 'visibilitychange') await page.evaluate(() => window.__setHidden(true));
      await page.evaluate(() => {
        const nav = document.querySelector('[data-app-bottom-nav]');
        nav.style.transform = 'translateY(-100px)'; // 오래된 고정 레이어 위치의 모의 결함
      });
      if (event === 'visibilitychange') {
        await page.clock.fastForward(60 * 60 * 1000);
        assert.equal(await page.locator('[data-app-bottom-nav]').evaluate(el => Math.round(innerHeight - el.getBoundingClientRect().bottom)), 100);
        await page.evaluate(() => window.__setHidden(false));
      } else {
        await page.evaluate(event => window.dispatchEvent(event === 'pageshow' ? new PageTransitionEvent('pageshow', { persisted: true }) : new Event(event)), event);
      }
      await bottom();
      await page.clock.fastForward(700); // 복귀 애니메이션 이후 두 번째 갱신도 확인
      await bottom();
      assert.equal(await input.inputValue(), '백업');
      assert.equal(await input.evaluate(el => el === window.__input && document.activeElement === el), true);
      assert.equal(page.url(), originalUrl);
      assert.equal(await page.evaluate(() => window.__session), session);
    }
    // 메뉴에 있던 키보드 포커스는 스크롤을 움직이지 않고 유지한다.
    const settings = page.locator('[data-app-bottom-nav]').getByRole('link', { name: '설정', exact: true });
    await settings.focus();
    const y = await page.evaluate(() => scrollY);
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await page.clock.fastForward(700);
    assert.equal(await settings.evaluate(el => document.activeElement === el), true);
    assert.equal(await page.evaluate(() => scrollY), y);
    await page.setViewportSize({ width: 844, height: 390 });
    await page.evaluate(() => window.dispatchEvent(new Event('orientationchange')));
    await page.clock.fastForward(700); await bottom();
    if (prefix === '/ChinSpeak/') {
      await page.goto(`${base}#/lesson/v1-01/mastery`);
      await page.getByRole('button', { name: '2. 보고 떠올리기', exact: true }).click();
      const deck = page.getByRole('region', { name: '떠올리기 카드', exact: true });
      await deck.getByRole('button', { name: /뒤집기/ }).click();
      const answer = await deck.locator('[lang="zh-Hans"]').innerText();
      const remaining = await deck.getByRole('status').filter({ hasText: '남은 카드' }).innerText();
      await page.evaluate(() => window.__setHidden(true));
      await page.clock.fastForward(60 * 60 * 1000);
      await page.evaluate(() => window.__setHidden(false));
      await page.clock.fastForward(700); await bottom();
      assert.equal(await deck.locator('[lang="zh-Hans"]').innerText(), answer);
      assert.equal(await deck.getByRole('status').filter({ hasText: '남은 카드' }).innerText(), remaining);
      assert.equal(await deck.getByRole('button', { name: '맞음', exact: true }).isVisible(), true);
    }
    assert.deepEqual(errors, []);
    console.log(`PASS ${prefix}: simulated long background, BFCache pageshow, focus and rotation restore nav; screen/input state, session, focus and scroll preserved`);
    await context.close();
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
