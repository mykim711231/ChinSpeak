import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Lesson } from '../src/types/lesson';
import { grammarItems, splitGrammarLine } from '../src/lib/readAloud';
import { alignChars } from '../src/lib/pinyin';
import { createGrammarAnnotator } from './grammar-pinyin';

const root = fileURLToPath(new URL('../../', import.meta.url));
const lessons: Lesson[] = Array.from({ length: 8 }, (_, i) =>
  JSON.parse(readFileSync(join(root, `app/public/data/lessons-vol${i + 1}.json`), 'utf8')) as Lesson[]).flat();

test('lessons publish grammar source and playable examples', () => {
  assert.ok(lessons.length >= 1);
  let cards = 0;
  for (const lesson of lessons) {
    const dir = join(root, `Doc/Markdown/vol${lesson.vol}`);
    const prefix = `vol${lesson.vol}_${String(lesson.no).padStart(2, '0')}_`;
    const name = readdirSync(dir).find(name => name.startsWith(prefix) && name.endsWith('.md'));
    assert.ok(name, lesson.id);
    const source = readFileSync(join(dir, name), 'utf8').replace(/\r\n/g, '\n');
    const section = source.split(/^## 语法点[^\n]*\n/m)[1]?.split(/^## /m)[0];
    if (!section) {
      assert.equal(lesson.grammar.length, 0, `${lesson.id}: no grammar section`);
      continue;
    }
    assert.ok(section, `${lesson.id}: grammar source`);
    const blocks = section.split(/^### /m).slice(1);
    assert.equal(lesson.grammar.length, blocks.length, lesson.id);
    lesson.grammar.forEach((card, index) => {
      const key = `${lesson.id}/${index + 1}`;
      assert.ok(card.title.trim(), `${key}: title`);
      assert.ok(card.lines.length > 0, `${key}: lines`);
      assert.ok(card.readings, `${key}: inline pinyin generated`);
      for (const [text, readings] of [[card.title, card.readings.title], ...card.lines.map((line, j) => [line, card.readings!.lines[j]] as const)] as const) {
        const han = [...text.matchAll(/[一-鿿㐀-䶿〇]+/g)];
        assert.equal(readings.length, han.length, `${key}: all Chinese spans annotated`);
        readings.forEach((reading, j) => {
          assert.equal(reading.start, han[j].index, `${key}: exact annotation position`);
          assert.equal(reading.text, han[j][0]);
          assert.equal(reading.pinyin.length, [...reading.text].length);
          assert.ok(reading.pinyin.every(py => /^[A-Za-zÀ-ɏü]+$/.test(py)), `${key}: valid pinyin syllables`);
        });
      }
      const sourceLines = blocks[index].split('\n').slice(1).filter(line => line.trim() !== '---')
        .map(line => line.replace(/^-\s*/, '').trim()).filter(Boolean);
      assert.deepEqual(card.lines, sourceLines, `${key}: generated data matches Markdown`);
      cards++;
    });
    for (const item of grammarItems(lesson)) {
      assert.ok(/[一-鿿]/.test(item.verse.zh), `${lesson.id}: Chinese example`);
      assert.ok(!/[가-힣]/.test(item.verse.zh), `${lesson.id}: no Korean in Chinese utterance`);
      assert.ok(alignChars(item.verse.zh, item.verse.pinyin), `${lesson.id}: pinyin covers every Chinese character`);
    }
  }
  assert.ok(cards >= 0);
});

test('inline grammar pinyin preserves particles, lexical polyphones and explicit contrasting readings', () => {
  const annotate = createGrammarAnnotator(lessons);
  const read = (text: string, topic = '') => annotate(text, topic).map(r => [r.text, r.pinyin.join(' ')]);
  assert.deepEqual(read('请给我 + 특징/동사구 + 的 + 명사.'), [['请给我', 'qǐng gěi wǒ'], ['的', 'de']]);
  assert.deepEqual(read('靠窗的座位에서 중심 명사는 座位, 靠窗的는 이를 꾸미는 말이에요.'), [['靠窗的座位', 'kào chuāng de zuò wèi'], ['座位', 'zuò wèi'], ['靠窗的', 'kào chuāng de']]);
  assert.deepEqual(read('得(děi)와 得(de), 地, 了, 了解, 为时, 看哪'), [['得', 'děi'], ['得', 'de'], ['地', 'de'], ['了', 'le'], ['了解', 'liǎo jiě'], ['为时', 'wéi shí'], ['看哪', 'kàn na']]);
  assert.deepEqual(read('得', '"得" (děi) — 필요'), [['得', 'děi']]);
  assert.deepEqual(read('东西(dōngxi)와 东西(dōngxī)'), [['东西', 'dōng xi'], ['东西', 'dōng xī']]);
  assert.deepEqual(read('我得开夜车，拍得怎么样，跑得快'), [['我得开夜车', 'wǒ děi kāi yè chē'], ['拍得怎么样', 'pāi de zěn me yàng'], ['跑得快', 'pǎo de kuài']]);
});

test('Chinese terms embedded in a Korean explanation never become audio examples', () => {
  for (const line of [
    '핵심: 会는 능력과 미래 예측을 나타내므로 문맥을 구별해요.',
    '문형: 주어 + 把 + 대상 + 동사 + 결과/장소.',
    '주의: 只要…就…와 只有…才…는 조건의 논리가 달라요.',
  ]) assert.equal(splitGrammarLine(line), null);
  assert.deepEqual(splitGrammarLine('你好。 Nǐ hǎo. 안녕하세요.'), { zh: '你好。', pinyin: 'Nǐ hǎo', ko: '안녕하세요.' });
});

test('pinyin is kept apart from quoted Chinese and translations starting with Chinese or parentheses', () => {
  assert.deepEqual(splitGrammarLine('你多大了？ Nǐ duō dà le? (지금) 몇 살이 되었나요?'), {
    zh: '你多大了？', pinyin: 'Nǐ duō dà le', ko: '(지금) 몇 살이 되었나요?',
  });
  assert.deepEqual(splitGrammarLine('北大就是北京大学的简称。Běidà jiù shì Běijīng dàxué de jiǎnchēng. 北大(베이징대)는 줄임말이다.'), {
    zh: '北大就是北京大学的简称。', pinyin: 'Běidà jiù shì Běijīng dàxué de jiǎnchēng', ko: '北大(베이징대)는 줄임말이다.',
  });
  const quoted = splitGrammarLine('"哪儿"就是"哪里"的意思。 "Nǎr" jiù shì "nǎlǐ" de yìsi. "哪儿"은 바로 "哪里"라는 뜻이다.');
  assert.equal(quoted?.zh, '"哪儿"就是"哪里"的意思。');
  assert.ok(quoted && alignChars(quoted.zh, quoted.pinyin));
  assert.equal(splitGrammarLine('虽然……但是……는 가장 기본적인 양보-전환 구조이다.'), null);
});
