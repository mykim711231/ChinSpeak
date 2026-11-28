import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Lesson, VocabularyGroup, Vocab } from '../src/types/lesson';


const minimumLength = 2;
const wordKey = (value: string) => value.replace(/[\s，。？！、；,.!?]/g, '');
const getTerm = (entry: Vocab) => entry.zh;
const makeWord = (zh: string, pinyin: string, pos: string, ko: string): Vocab => ({ zh, pinyin, pos, ko });
const inContext = (context: string, term: string) => context.includes(term);
const overlaps = (a: string, b: string) => a.includes(b) || b.includes(a);
const dialogueContexts = (lesson: Lesson): [string, string][] =>
  lesson.dialogs.map((dialogue) => [
    dialogue.title.replace(/^\d+[.)]\s*/, ''),
    dialogue.turns.map((turn) => wordKey(turn.verse.zh)).join('\n'),
  ]);
const explicitGroups = (lesson: Lesson): VocabularyGroup[] =>
  lesson.related.map(({ title, rows }) => ({ title, words: rows.map(({ zh, pinyin, ko }) => makeWord(zh, pinyin, '', ko)) }));
const additionalExpressions = (lesson: Lesson) =>
  lesson.patterns.flatMap(({ examples }) => examples.length ? [examples[0]] : [])
    .map((verse) => makeWord(verse.zh, verse.pinyin, '표현', verse.ko));

function readTopics(path: string, lessonIds: Set<string>) {
  const topics = new Map<string, VocabularyGroup[]>();
  let lesson: VocabularyGroup[] | undefined;
  let group: VocabularyGroup | undefined;

  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const heading = /^## (\S+)/.exec(line);
    if (heading) {
      const id = heading[1];
      if (!lessonIds.has(id) || topics.has(id)) throw new Error(`잘못된 묶음 단어 과 ID: ${id}`);
      lesson = [];
      topics.set(id, lesson);
      group = undefined;
    } else if (line.startsWith('### ')) {
      const title = line.slice(4).trim();
      if (!lesson || !title || lesson.some((entry) => entry.title === title)) throw new Error(`잘못된 묶음 단어 제목: ${line}`);
      group = { title, words: [] };
      lesson.push(group);
    } else if (line.startsWith('|') && !/^\|\s*(?:표제어|---)/.test(line)) {
      const [, term, reading, pos, meaning] = line.split('|').map((cell) => cell.trim());
      if (!group || !term || !pos || !meaning || (!reading && pos !== '표현')) {
        throw new Error(`잘못된 묶음 단어 행: ${line}`);
      }
      group.words.push(makeWord(term, reading, pos, meaning));
    }
  }

  for (const [id, groups] of topics) {
    const terms = groups.flatMap((group) => group.words.map((word) => wordKey(getTerm(word))));
    if (groups.length < 2 || groups.some((group) => group.words.length === 0) || new Set(terms).size !== terms.length) {
      throw new Error(`소주제가 비었거나 중복 표제어가 있어요: ${id}`);
    }
  }
  return topics;
}

export function writeVocabularyTopics(root: string, lessons: Lesson[]) {
  const source = join(root, 'Doc', 'Dictionary', 'vocabulary-topics.md');
  const overrides = readTopics(source, new Set(lessons.map((lesson) => lesson.id)));
  const lexicon = new Map<string, Vocab>();
  for (const lesson of lessons) {
    for (const word of lesson.vocab) {
      const key = wordKey(getTerm(word));
      if (key && !lexicon.has(key)) lexicon.set(key, word);
    }
  }

  const topics: Record<string, VocabularyGroup[]> = {};
  for (const lesson of lessons) {
    const authored = overrides.get(lesson.id);
    if (authored) {
      topics[lesson.id] = authored;
      continue;
    }

    const local = new Map(lesson.vocab.map((word) => [wordKey(getTerm(word)), word]));
    const used = new Set<string>();
    const groups: VocabularyGroup[] = explicitGroups(lesson);
    for (const group of groups) for (const word of group.words) used.add(wordKey(getTerm(word)));
    for (const [title, text] of dialogueContexts(lesson)) {
      const candidates = [...lexicon].flatMap(([key, word]) => {
        if (used.has(key) || key.length < minimumLength || !inContext(text, key)) return [];
        return [{ key, word: local.get(key) ?? word, isNew: !local.has(key) }];
      });
      candidates.sort((a, b) => Number(b.isNew) - Number(a.isNew) || b.key.length - a.key.length);
      const words: Vocab[] = [];
      for (const { key, word } of candidates) {
        if (words.some((item) => overlaps(wordKey(getTerm(item)), key))) continue;
        used.add(key);
        words.push(word);
        if (words.length === 5) break;
      }
      if (words.length) groups.push({ title, words });
    }
    const expressions = additionalExpressions(lesson).filter((word) => {
      const key = wordKey(getTerm(word));
      if (!key || used.has(key)) return false;
      used.add(key);
      return true;
    }).slice(0, 3);
    if (expressions.length) groups.push({ title: '보충 표현', words: expressions });
    if (groups.length < 2) throw new Error(`묶음 단어 소주제 부족: ${lesson.id}`);
    topics[lesson.id] = groups;
  }

  const output = join(root, 'app', 'public', 'data', 'vocabulary-groups.json');
  writeFileSync(output, JSON.stringify(topics));
  console.log(`vocabulary groups: ${lessons.length} lessons, ${overrides.size} authored`);
}
