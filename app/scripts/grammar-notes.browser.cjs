const { chromium } = require('playwright-core');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../dist');
const base = 'http://chinspeak.test/ChinSpeak/';
const mime = { '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.html': 'text/html', '.svg': 'image/svg+xml' };
const samples = ['v1-01', 'v1-03', 'v1-06', 'v2-09', 'v3-01', 'v3-05', 'v4-15', 'v5-08', 'v6-07', 'v6-08', 'v7-16', 'v8-11', 'v8-18'];
const lessonData = Array.from({ length: 8 }, (_, i) => JSON.parse(fs.readFileSync(path.join(root, `data/lessons-vol${i + 1}.json`), 'utf8'))).flat();
const ttsManifest = JSON.parse(fs.readFileSync(path.join(root, 'data/zh-tts-manifest.json'), 'utf8'));

async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const config of [
      { name: 'mobile', viewport: { width: 390, height: 844 }, fontSize: 'md' },
      { name: 'small-large-type', viewport: { width: 320, height: 740 }, fontSize: 'xl' },
      { name: 'tablet-basic', viewport: { width: 800, height: 1024 }, fontSize: 'md', userAgent: 'Mozilla/5.0 (Linux; Android 8.0; AGS2-L09) AppleWebKit/537.36 Chrome/138.0.0.0 Mobile Safari/537.36' },
      { name: 'recorded', viewport: { width: 390, height: 844 }, fontSize: 'md', recorded: true },
    ]) {
      const context = await browser.newContext({ viewport: config.viewport, serviceWorkers: 'block', ...(config.userAgent ? { userAgent: config.userAgent } : {}) });
      await context.route('**/*', async route => {
        const url = new URL(route.request().url());
        const relative = url.pathname.slice('/ChinSpeak/'.length) || 'index.html';
        const file = path.resolve(root, relative);
        if (!url.pathname.startsWith('/ChinSpeak/') || !file.startsWith(root + path.sep)) return route.fulfill({ status: 404, body: '' });
        try { await route.fulfill({ contentType: mime[path.extname(file)] || 'application/octet-stream', body: fs.readFileSync(file) }); }
        catch { await route.fulfill({ status: 404, body: '' }); }
      });
      await context.addInitScript(({ fontSize, recorded }) => {
        localStorage.setItem('chinspeak-settings', JSON.stringify({ version: 4, state: { onboarded: true, voiceMode: recorded ? 'recorded' : 'device', autoDownload: false, fontSize, installDismissedAt: Date.now() } }));
        window.__spoken = [];
        window.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
        const events = new EventTarget();
        Object.defineProperty(window, 'speechSynthesis', { value: {
          getVoices: () => [{ name: 'Chinese', lang: 'zh-CN', localService: true }, { name: 'Korean', lang: 'ko-KR', localService: true }],
          addEventListener: events.addEventListener.bind(events), removeEventListener: events.removeEventListener.bind(events),
          cancel() {}, speak(u) { window.__spoken.push({ text: u.text, lang: u.lang }); setTimeout(() => u.onend?.(), 20); },
        } });
        if (recorded) window.Audio = class {
          constructor(src) { this.src = src ? new URL(src, location.href).href : ''; }
          pause() {}
          play() { window.__spoken.push({ text: this.src, lang: 'recorded' }); setTimeout(() => this.onended?.(), 20); return Promise.resolve(); }
        };
      }, { fontSize: config.fontSize, recorded: !!config.recorded });
      const page = await context.newPage();
      const errors = []; page.on('pageerror', error => errors.push(error.message));
      await page.clock.install();
      for (const id of samples) {
        await page.goto(`${base}#/lesson/${id}`);
        await page.getByRole('button', { name: '문법', exact: true }).click();
        const lesson = lessonData.find(l => l.id === id);
        await page.waitForFunction(count => document.querySelectorAll('.grammar-card').length === count, lesson.grammar.length);
        assert.equal(await page.locator('[data-grammar-note]').count(), lesson.grammar.length * 3, `${config.name}/${id}: all notes displayed`);
        assert.equal(await page.locator('[data-grammar-note][data-playback-line]').count(), 0, `${id}: notes never enter listening queue`);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true, `${config.name}/${id}: no horizontal overflow`);
        const hiddenNotes = await page.locator('[data-grammar-note]').evaluateAll(nodes => nodes.some(n => n.scrollHeight > n.clientHeight + 1 || getComputedStyle(n).display === 'none'));
        assert.equal(hiddenNotes, false, `${id}: explanatory text is not clipped`);
        const crowdedPinyin = await page.locator('.grammar-annotated ruby').evaluateAll(nodes => nodes.some(node => {
          const ruby = node.getBoundingClientRect(), rt = node.querySelector('rt').getBoundingClientRect();
          return rt.left < ruby.left - 1 || rt.right > ruby.right + 1;
        }));
        assert.equal(crowdedPinyin, false, `${id}: inline pinyin has space above its character`);
        for (const [index, point] of lesson.grammar.entries()) {
          const card = page.locator('.grammar-card').nth(index);
          assert.equal(await card.locator('h3 [data-grammar-han] ruby').count(), (point.title.match(/[一-鿿㐀-䶿〇]/g) || []).length, `${id}: title pinyin`);
          for (const [line, label] of ['핵심', '문형', '주의'].entries()) {
            assert.equal(await card.locator(`[data-grammar-note="${label}"] [data-grammar-han] ruby`).count(), (point.lines[line].match(/[一-鿿㐀-䶿〇]/g) || []).length, `${id}/${index}/${label}: explanatory Chinese pinyin`);
          }
        }
        if (id === 'v3-01' && process.env.GRAMMAR_NOTES_SCREENSHOT && config.name === 'mobile') {
          await page.locator('.grammar-card').nth(3).screenshot({ path: process.env.GRAMMAR_NOTES_SCREENSHOT });
        }
        const examples = page.locator('.grammar-example');
        assert.ok(await examples.count() >= lesson.grammar.length, `${id}: every card has examples`);
        for (let index = 0; index < await examples.count(); index++) {
          const example = examples.nth(index);
          const button = example.locator('[data-grammar-audio]');
          assert.equal(await button.count(), 1, `${id}/${index}: individual audio`);
          assert.ok(await example.locator('[lang="zh-Latn-pinyin"]').count() > 0, `${id}/${index}: pinyin shown`);
          const expected = (await button.getAttribute('aria-label')).replace(/ 듣기$/, '');
          await page.evaluate(() => { window.__spoken = []; });
          await button.click();
          await page.waitForFunction(() => window.__spoken.length > 0);
          const utterances = await page.evaluate(() => window.__spoken);
          assert.deepEqual(utterances.map(s => s.lang), [config.recorded ? 'recorded' : 'zh-CN'], `${id}/${index}: Chinese only`);
          assert.equal(utterances[0].text, config.recorded ? `${base}tts/${ttsManifest[expected.replace(/\s+/g, ' ').trim()]}` : expected.replace(/[一二三四五六七八九零〇]{7,}/g, m => m.replace(/一/g, '幺')));
          await page.clock.runFor(30);
        }
        if (id === 'v1-01') {
          await page.evaluate(() => { window.__spoken = []; });
          await page.evaluate(() => window.scrollTo(0, 0));
          if (!config.recorded) await context.setOffline(true);
          await page.getByRole('button', { name: '문법 전체 듣기', exact: true }).click();
          await page.waitForFunction(() => window.__spoken.length > 0);
          const active = page.locator('[data-playback-line][aria-current="true"]');
          assert.equal(await active.count(), 1);
          assert.equal(await active.getAttribute('data-grammar-note'), null);
          const stop = page.getByRole('button', { name: '멈추기', exact: true });
          assert.equal(await stop.isEnabled(), true);
          await stop.click();
          await page.clock.runFor(2000);
          assert.equal(await page.evaluate(() => window.__spoken.length), 1, 'stop prevents later examples');
          await page.evaluate(() => { window.__spoken = []; });
          await page.getByRole('button', { name: '문법 전체 듣기', exact: true }).click();
          for (let i = 0; i < 8; i++) await page.clock.runFor(1500);
          await page.getByRole('button', { name: '문법 전체 듣기', exact: true }).waitFor();
          const spoken = await page.evaluate(() => window.__spoken);
          assert.equal(spoken.length, 6, `${config.name}: 6 Chinese examples without Korean narration`);
          assert.equal(spoken[0].text, config.recorded ? `${base}tts/${ttsManifest['你好。']}` : '你好。');
          assert.equal(spoken.every(s => s.lang === (config.recorded ? 'recorded' : 'zh-CN')), true);
          assert.equal(spoken.some(s => /^(핵심|문형|주의):/.test(s.text)), false);
          assert.equal(await page.locator('[data-playback-line][aria-current="true"]').count(), 0);
          await context.setOffline(false);
          await page.getByRole('button', { name: '병음', exact: true }).click();
          assert.equal(await page.locator('.grammar-example [lang="zh-Latn-pinyin"]').count(), 0);
          assert.equal(await page.locator('.grammar-annotated').count(), 0, 'hiding pinyin also hides explanatory ruby');
          await page.getByRole('button', { name: '병음', exact: true }).click();
          assert.ok(await page.locator('.grammar-example [lang="zh-Latn-pinyin"]').count() > 0);
          assert.ok(await page.locator('.grammar-annotated rt').count() > 0);
          if (process.env.GRAMMAR_SCREENSHOT && config.name === 'mobile') {
            await page.evaluate(() => window.scrollTo(0, 0));
            await page.screenshot({ path: process.env.GRAMMAR_SCREENSHOT, fullPage: true });
          }
        }
      }
      assert.deepEqual(errors, []);
      await context.close();
      console.log(`PASS ${config.name}: 13 lessons across all 8 volumes, pinyin on titles/notes/examples; individual Chinese audio, full listening, stop and caption toggles work`);
    }
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
