import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

type LessonKey = { id: string; vol: number; no: number };
type VocabularyTopic = { title: string; peers: number[] };

export function writeVocabularyTopics(root: string, lessons: LessonKey[]) {
  const source = join(root, 'Doc', 'Dictionary', 'vocabulary-topics.md');
  const output = join(root, 'app', 'src', 'data', 'vocabulary-topics.json');
  const lessonsByNumber = new Map(lessons.map((lesson) => [`${lesson.vol}-${lesson.no}`, lesson]));
  const topics: Record<string, VocabularyTopic[]> = {};

  for (const line of readFileSync(source, 'utf8').split(/\r?\n/)) {
    if (!/^\|\s*\d/.test(line)) continue;
    const [, book, title, rangeText] = line.split('|').map((part) => part.trim());
    const vol = Number(book);
    if (!title || !/^\d+(?:–\d+)?(?:,\d+(?:–\d+)?)*$/.test(rangeText ?? '')) {
      throw new Error(`Invalid vocabulary topic in ${source}: ${line}`);
    }
    const numbers = rangeText.split(',').flatMap((range) => {
      const [from, to = from] = range.split('–').map(Number);
      if (to < from) throw new Error(`Invalid range in ${source}: ${range}`);
      return Array.from({ length: to - from + 1 }, (_, index) => from + index);
    });
    if (new Set(numbers).size !== numbers.length || numbers.length < 2) {
      throw new Error(`Vocabulary topic needs distinct lesson numbers: ${line}`);
    }
    for (const no of numbers) {
      const lesson = lessonsByNumber.get(`${vol}-${no}`);
      if (!lesson) throw new Error(`Unknown lesson ${vol}-${no} in ${source}`);
      (topics[lesson.id] ??= []).push({ title, peers: numbers.filter((peer) => peer !== no) });
    }
  }

  const missing = lessons.filter((lesson) => !topics[lesson.id]);
  if (missing.length) throw new Error(`Missing vocabulary topics: ${missing.map((lesson) => lesson.id).join(', ')}`);
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, JSON.stringify(topics, null, 2) + '\n');
}
