import type { Lesson, Verse } from '../types/lesson';

const HANZI = /[一-鿿]/;
const HANGUL = /[가-힣]/;
const LATIN = /[A-Za-zÀ-ɏ]/;

/** 원본의 한 줄 예문을 한자·병음·번역으로 나눈다. 한국어 설명은 읽기 대상에서 제외한다. */
export function splitGrammarLine(raw: string): { zh: string; pinyin: string; ko: string } | null {
  const line = raw.trim();
  if (!/^["“‘']?[一-鿿]/.test(line)) return null;
  const p = line.search(LATIN);
  const h = line.search(HANGUL);
  if (p < 0 || (h >= 0 && h < p)) return null;
  // 따옴표로 시작하는 병음 앞의 여는 따옴표는 한자 문장에 포함하지 않는다.
  const zh = line.slice(0, p).trim().replace(/([。！？])\s*["“‘]$/, '$1');
  const tail = line.slice(p);
  // 번역이 北大(베이징대)처럼 한자로 시작하거나 괄호로 시작해도 병음과 분리한다.
  const translation = tail.search(/[一-鿿가-힣]/);
  let end = translation < 0 ? tail.length : translation;
  if (translation >= 0) end -= tail.slice(0, end).match(/[\s("“‘]+$/)?.[0].length ?? 0;
  const pinyin = tail.slice(0, end).trim().replace(/[.?!;，。！？；"”'’]+$/, '').trim();
  const ko = translation < 0 ? '' : tail.slice(end).trim();
  return HANZI.test(zh) && pinyin ? { zh, pinyin, ko } : null;
}

export type ReadItem = { verse: Verse; group: number; line: number };

/** 문법 탭의 예문. 번역은 화면 표시용이며 문법 듣기는 중국어만 재생한다. */
export function grammarItems(lesson: Lesson | null | undefined): ReadItem[] {
  const out: ReadItem[] = [];
  lesson?.grammar.forEach((g, group) => g.lines.forEach((raw, line) => {
    const s = splitGrammarLine(raw);
    if (s) out.push({ verse: { ...s, chunks: [] }, group, line });
  }));
  return out;
}
