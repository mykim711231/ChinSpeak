// 모든 콘텐츠 텍스트가 manifest + mp3 파일로 커버되는지 검증. 사용: npm run verify:tts [-- --vol 1]
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { collectKo, collectTexts, hashOf, koHashOf, loadLessons, readKoManifest, readManifest, TTS_DIR } from './tts-texts';

const i = process.argv.indexOf('--vol');
const vols = i >= 0 && process.argv[i + 1] !== 'all' ? [parseInt(process.argv[i + 1], 10)] : [1, 2, 3, 4, 5, 6, 7, 8];
const manifest = readManifest();
const koManifest = readKoManifest();
let bad = 0;
// 일괄 받기는 현재 교재뿐 아니라 목록 전체를 내려받는다. 옛 목록의 깨진 참조도 검사한다.
for (const [label, entries, hash] of [
  ['중국어', manifest, hashOf], ['한글', koManifest, koHashOf],
] as const) {
  const missing = Object.entries(entries).filter(([text, file]) => {
    if (file !== `${hash(text)}.mp3`) return true;
    const path = join(TTS_DIR, file);
    return !existsSync(path) || statSync(path).size < 500;
  });
  console.log(`${label} 다운로드 목록: ${Object.keys(entries).length - missing.length}/${Object.keys(entries).length} 유효`);
  missing.slice(0, 10).forEach(([text, file]) => console.log(`   · ${file}: ${text}`));
  bad += missing.length;
}
for (const v of vols) {
  const texts = [...new Set(collectTexts(loadLessons(v)))];
  const missing = texts.filter((t) => {
    const f = manifest[t];
    if (!f || f !== `${hashOf(t)}.mp3`) return true;
    const p = join(TTS_DIR, f);
    return !existsSync(p) || statSync(p).size < 500;
  });
  console.log(`vol${v}: ${texts.length - missing.length}/${texts.length} 커버${missing.length ? ` — 누락 ${missing.length}` : ''}`);
  missing.slice(0, 5).forEach((t) => console.log(`   · ${t}`));
  bad += missing.length;
  const ko = collectKo(loadLessons(v));
  const koMissing = ko.filter((t) => {
    const f = koManifest[t];
    if (!f || f !== `${koHashOf(t)}.mp3`) return true;
    const p = join(TTS_DIR, f);
    return !existsSync(p) || statSync(p).size < 500;
  });
  console.log(`vol${v} 한글: ${ko.length - koMissing.length}/${ko.length} 커버${koMissing.length ? ` — 누락 ${koMissing.length}` : ''}`);
  bad += koMissing.length;
}
process.exit(bad ? 1 : 0);
