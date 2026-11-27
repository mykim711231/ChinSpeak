import assert from 'node:assert/strict';
import { test } from 'node:test';
import { studyLines, parseStudySource } from '../src/lib/studyContent';
import type { Lesson, Verse } from '../src/types/lesson';

const verse = (zh: string): Verse => ({ zh, pinyin: 'nǐ hǎo', ko: '안녕하세요', chunks: [] });
const dialog = [{ title: '대화1', turns: [{ speaker: 'A', verse: verse('会话一') }, { speaker: 'B', verse: verse('会话二') }] },
  { title: '대화2', turns: [{ speaker: 'C', verse: verse('会话三') }] }];
const vocab = [
  { zh: '词一', pinyin: 'cí yī', pos: '명사', ko: '단어1' },
  { zh: '词二', pinyin: 'cí èr', pos: '명사', ko: '단어2' },
];
const lesson: Lesson = { id: 'v1-01', vol: 1, no: 1, level: 1, titleZh: '测试', titleKo: '검사', titlePinyin: 'cèshì',
  text: [], dialogs: dialog, vocab, situation: [], patterns: [], tasks: [], notes: [], related: [], grammar: [], traps: [] };

test('dialog and vocab targets contain exactly their own sentences', () => {
  assert.deepEqual(studyLines(lesson, 'dialog').map((l) => l.verse.zh), ['会话一', '会话二', '会话三']);
  assert.deepEqual(studyLines(lesson, 'vocab').map((l) => l.verse.zh), ['词一', '词二']);
});

test('combined target preserves dialogue order, speakers and sections before vocab', () => {
  const lines = studyLines(lesson, 'all');
  assert.deepEqual(lines.map((l) => l.verse.zh), ['会话一', '会话二', '会话三', '词一', '词二']);
  assert.deepEqual(lines.map((l) => l.source), ['dialog', 'dialog', 'dialog', 'vocab', 'vocab']);
  assert.equal(lines[0].section, '대화 · 대화1');
  assert.equal(lines[2].section, '대화 · 대화2');
  assert.equal(lines[1].speaker, 'B');
  assert.equal(lines[3].section, '표현');
  assert.equal(lines[3].verse.chunks.length, 1);
  assert.equal(lines[3].verse.chunks[0].zh, '词一');
});

test('missing content is safe', () => {
  assert.deepEqual(studyLines({ ...lesson, dialogs: [] }, 'dialog'), []);
  assert.deepEqual(studyLines({ ...lesson, vocab: [] }, 'vocab'), []);
  assert.equal(studyLines({ ...lesson, dialogs: [] }, 'all').length, vocab.length);
});

test('target links support dialog, vocab and combined, map legacy text to dialog', () => {
  for (const source of ['dialog', 'vocab', 'all'] as const) assert.equal(parseStudySource(source), source);
  assert.equal(parseStudySource('text'), 'dialog');
  assert.equal(parseStudySource(null, 'all'), 'all');
  assert.equal(parseStudySource('invalid', 'vocab'), 'vocab');
});
