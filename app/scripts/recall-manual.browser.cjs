const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../dist');
const lessons = JSON.parse(fs.readFileSync(path.join(root, 'data/lessons-vol1.json'), 'utf8'));
lessons[0].text = lessons[0].text.slice(0, 2);
lessons[0].dialogs = [];
const base = 'http://chinspeak.test/ChinSpeak/';
const mime = { '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.html': 'text/html', '.svg': 'image/svg+xml' };

async function main() {
  const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}) });
  try {
    for (const auto of [null, 'on', 'off']) for (const face of ['ko', 'zh']) {
      const context = await browser.newContext({ serviceWorkers: 'block' });
      await context.route('**/*', async route => {
        const url = new URL(route.request().url());
        const relative = url.pathname.slice('/ChinSpeak/'.length) || 'index.html';
        const file = path.resolve(root, relative);
        if (!url.pathname.startsWith('/ChinSpeak/') || !file.startsWith(root + path.sep)) return route.fulfill({ status: 404, body: '' });
        try { await route.fulfill({ contentType: mime[path.extname(file)] || 'application/octet-stream', body: relative === 'data/lessons-vol1.json' ? JSON.stringify(lessons) : fs.readFileSync(file) }); }
        catch { await route.fulfill({ status: 404, body: '' }); }
      });
      await context.addInitScript(auto => {
        localStorage.setItem('chinspeak-settings', JSON.stringify({ version: 4, state: { onboarded: true, voiceMode: 'device', autoDownload: false, installDismissedAt: Date.now() } }));
        if (auto !== null) localStorage.setItem('chinspeak-recall-auto', auto);
        window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
        const events = new EventTarget();
        Object.defineProperty(window, 'speechSynthesis', { value: {
          getVoices: () => [{ name: 'local', lang: 'zh-CN', localService: true }],
          addEventListener: events.addEventListener.bind(events), removeEventListener: events.removeEventListener.bind(events),
          cancel() {}, speak(u) { queueMicrotask(() => u.onend?.()); },
        } });
      }, auto);
      const page = await context.newPage(); page.setDefaultTimeout(15000);
      const errors = []; page.on('pageerror', error => errors.push(error.message));
      await page.clock.install();
      await page.goto(`${base}#/lesson/v1-01/mastery`);
      await page.getByRole('button', { name: '2. 보고 떠올리기', exact: true }).click();
      await page.getByRole('group', { name: '카드 유형', exact: true }).getByRole('button', { name: face === 'ko' ? '한글 보고' : '간체 보고', exact: true }).click();
      const deck = page.getByRole('region', { name: '떠올리기 카드', exact: true });
      const waitForChoice = async left => {
        await deck.getByRole('button', { name: /뒤집기/ }).click();
        const answer = await deck.locator('[lang="zh-Hans"]').innerText();
        await page.clock.fastForward(60000);
        assert.equal(await deck.locator('[lang="zh-Hans"]').innerText(), answer);
        await deck.getByText(`남은 카드 ${left}장`, { exact: false }).waitFor();
        assert.equal(await deck.getByRole('button', { name: '맞음', exact: true }).isVisible(), true);
        assert.equal(await deck.getByRole('button', { name: '못함', exact: true }).isVisible(), true);
        assert.equal(await deck.getByRole('button', { name: /자동 넘김/ }).count(), 0);
      };
      await waitForChoice(2);
      await deck.getByRole('button', { name: '맞음', exact: true }).click();
      await deck.getByText('남은 카드 1장', { exact: false }).waitFor();
      await waitForChoice(1);
      await deck.getByRole('button', { name: '못함', exact: true }).click();
      await deck.getByText('원문을 듣고 따라 말해요 (0/1)', { exact: true }).waitFor();
      await deck.getByRole('button', { name: '따라 했어요 (1/1)', exact: true }).click();
      await waitForChoice(1);
      await deck.getByRole('button', { name: '맞음', exact: true }).click();
      await page.getByText(`${face === 'ko' ? '한글' : '간체'} 보고 떠올리기 완료 · 첫 시도 1/2`, { exact: true }).waitFor();
      assert.deepEqual(errors, []);
      await context.close();
      console.log(`PASS: ${face}, previous auto=${auto}: no implicit grading after 60s, explicit correct/incorrect work, retry and final accuracy preserved`);
    }
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
