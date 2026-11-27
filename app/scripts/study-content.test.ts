import assert from 'node:assert/strict';
import { test } from 'node:test';
import { studyLines, parseStudySource } from '../src/lib/studyContent';
import type { Lesson, Verse } from '../src/types/lesson';

const verse = (zh: string): Verse => ({ zh, pinyin: 'nǐ hǎo', ko: '안녕하세요', chunks: [] });
const dialog = [{ title: '대화1', turns: [{ speaker: 'A', verse: verse('会话一') }, { speaker: 'B', verse: verse('会话二') }] },
  { title: '대화2', turns: [{ speaker: 'C', verse: verse('会话三') }] }];
const patterns = [
  { title: '패턴1', meaning: '…', examples: [verse('句型一'), verse('句型二')] },
  { title: '패턴2', meaning: '…', examples: [verse('句型三')] },
];
const lesson: Lesson = { id: 'v1-01', vol: 1, no: 1, level: 1, titleZh: '测试', titleKo: '검사', titlePinyin: 'cèshì',
  text: [], dialogs: dialog, vocab: [], patterns, situation: [], tasks: [], notes: [], related: [], grammar: [], traps: [] };

test('dialog and pattern targets contain exactly their own sentences', () => {
  assert.deepEqual(studyLines(lesson, 'dialog').map((l) => l.verse.zh), ['会话一', '会话二', '会话三']);
  assert.deepEqual(studyLines(lesson, 'pattern').map((l) => l.verse.zh), ['句型一', '句型二', '句型三']);
});

test('combined target preserves dialogue order and sections before pattern examples', () => {
  const lines = studyLines(lesson, 'all');
  assert.deepEqual(lines.map((l) => l.verse.zh), ['会话一', '会话二', '会话三', '句型一', '句型二', '句型三']);
  assert.deepEqual(lines.map((l) => l.source), ['dialog', 'dialog', 'dialog', 'pattern', 'pattern', 'pattern']);
  assert.equal(lines[0].section, '대화 · 대화1');
  assert.equal(lines[2].section, '대화 · 대화2');
  assert.equal(lines[1].speaker, 'B');
  assert.equal(lines[3].section, '패턴 · 패턴1');
  assert.equal(lines[5].section, '패턴 · 패턴2');
});

test('missing content is safe', () => {
  assert.deepEqual(studyLines({ ...lesson, dialogs: [] }, 'dialog'), []);
  assert.deepEqual(studyLines({ ...lesson, patterns: [] }, 'pattern'), []);
  assert.equal(studyLines({ ...lesson, dialogs: [] }, 'all').length, 3);
});

test('target links support dialog, pattern and combined, map legacy values', () => {
  for (const source of ['dialog', 'pattern', 'all'] as const) assert.equal(parseStudySource(source), source);
  assert.equal(parseStudySource('text'), 'dialog');
  assert.equal(parseStudySource('vocab'), 'pattern');
  assert.equal(parseStudySource(null, 'all'), 'all');
  assert.equal(parseStudySource('invalid', 'pattern'), 'pattern');
});
