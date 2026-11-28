import topics from '../data/vocabulary-topics.json';

const topicsByLesson: Record<string, { title: string; peers: number[] }[]> = topics;

export function vocabularyTopics<T>(
  lesson: { id: string; no: number; vocab: T[] },
  volume: { no: number; vocab: T[] }[],
  keyOf: (word: T) => string,
) {
  return (topicsByLesson[lesson.id] ?? []).flatMap(({ title, peers }, index) => {
    const known = new Set(lesson.vocab.map(keyOf));
    const nearby = [...peers].sort((a, b) => Math.abs(a - lesson.no) - Math.abs(b - lesson.no)).slice(0, 4);
    const wordsPerLesson = Math.ceil(16 / nearby.length);
    const words = nearby.flatMap((no) => {
      const related = volume.find((entry) => entry.no === no)?.vocab ?? [];
      const selected: T[] = [];
      for (const word of related) {
        const key = keyOf(word);
        if (known.has(key)) continue;
        known.add(key);
        selected.push(word);
        if (selected.length === wordsPerLesson) break;
      }
      return selected;
    });
    return words.length ? [{ id: `topic-${index}`, title, words: words.slice(0, 16) }] : [];
  });
}
