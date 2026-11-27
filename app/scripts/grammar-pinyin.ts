import { pinyin } from 'pinyin-pro';
import { alignChars } from '../src/lib/pinyin';
import { splitGrammarLine } from '../src/lib/readAloud';
import type { GrammarReading, Lesson } from '../src/types/lesson';

const HAN = /[一-鿿㐀-䶿〇]+/g;
const PARTICLES: Record<string, string> = { 的: 'de', 地: 'de', 了: 'le', 得: 'de', 着: 'zhe', 过: 'guo' };
const PHRASES: Record<string, string> = {
  为时: 'wéi shí', 看哪: 'kàn na', 说得: 'shuō de',
  我得开夜车: 'wǒ děi kāi yè chē', 这个问题得早点解决: 'zhè ge wèn tí děi zǎo diǎn jiě jué',
  哪儿: 'nǎ r', 点儿: 'diǎn r', 头儿: 'tóu r', 眼儿: 'yǎn r', 花儿: 'huā r', 事儿: 'shì r',
};

/** Build-time only: preserve authored pronunciations before using the pinned converter for new note fragments. */
export function createGrammarAnnotator(lessons: Lesson[]) {
  const words = new Map<string, string[]>();
  const phrases = new Map<string, string[] | null>();
  const aligned = (zh: string, py: string) => alignChars(zh, py)?.filter(c => c.py).map(c => c.py!.toLowerCase());
  const learnPhrase = (zh: string, py: string) => {
    const chars = alignChars(zh, py);
    if (!chars) return;
    for (const match of zh.matchAll(HAN)) {
      const syllables = chars.slice(match.index, match.index! + match[0].length).map(c => c.py!.toLowerCase());
      const old = phrases.get(match[0]);
      if (old === undefined) phrases.set(match[0], syllables);
      else if (old && old.join(' ') !== syllables.join(' ')) phrases.set(match[0], null);
    }
  };
  for (const lesson of lessons) {
    for (const word of [...lesson.vocab, ...lesson.related.flatMap(group => group.rows)]) {
      const py = aligned(word.zh, word.pinyin);
      if (py && !words.has(word.zh)) words.set(word.zh, py);
    }
    for (const verse of [...lesson.text, ...lesson.dialogs.flatMap(section => section.turns.map(turn => turn.verse))]) learnPhrase(verse.zh, verse.pinyin);
    for (const point of lesson.grammar) for (const line of point.lines) {
      const example = splitGrammarLine(line);
      if (example) learnPhrase(example.zh, example.pinyin);
    }
  }
  const wordKeys = [...words.keys()].filter(key => key.length >= 2).sort((a, b) => b.length - a.length);
  return (text: string, topic: string): GrammarReading[] => [...text.matchAll(HAN)].map(match => {
    const zh = match[0];
    // Explicit readings in a discussion of polyphones (得(děi), 东西(dōngxī), etc.) have priority.
    const suffix = text.slice(match.index! + zh.length);
    const explicit = suffix.match(/^\s*[(（]\s*([a-zA-ZÀ-ɏü]+(?:\s+[a-zA-ZÀ-ɏü]+)*)\s*[)）]/)?.[1];
    let py = explicit ? aligned(zh, explicit) : undefined;
    if (!py && zh === '得' && /得["”]?\s*\(děi\)/.test(topic)) py = ['děi'];
    if (!py && PARTICLES[zh]) py = [PARTICLES[zh]];
    if (!py && PHRASES[zh]) py = aligned(zh, PHRASES[zh]);
    if (!py) py = words.get(zh) ?? phrases.get(zh) ?? undefined;
    if (!py) {
      py = pinyin(zh, { type: 'array', toneSandhi: { yi: true, bu: true, thirdTone: false } });
      // Learned word pronunciations also fix neutral tones and polyphones inside longer note fragments.
      for (let i = 0; i < zh.length;) {
        const word = wordKeys.find(key => zh.startsWith(key, i));
        if (!word) { i++; continue; }
        py.splice(i, word.length, ...words.get(word)!);
        i += word.length;
      }
      // In these teaching fragments 得 links degree/state complements, except lexical 得 and modal 得 above.
      for (let i = 0; i < zh.length; i++) if (zh[i] === '得' && !/[获取值不所]/.test(zh[i - 1] ?? '') && !/[到出分失意罪当以]/.test(zh[i + 1] ?? '') && !zh.startsWith('种瓜得瓜') && !zh.startsWith('种豆得豆')) py[i] = 'de';
    }
    if (py.length !== [...zh].length || py.some(syllable => /[一-鿿가-힣]/.test(syllable))) throw new Error(`Invalid grammar pinyin: ${zh}: ${py}`);
    return { start: match.index!, text: zh, pinyin: py };
  });
}
