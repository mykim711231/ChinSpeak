import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { loadLesson, loadMeta, loadVocabularyGroups } from '../lib/contentLoader';
import { speak } from '../lib/tts';
import ChunkCard from '../components/ChunkCard';
import GrammarText from '../components/GrammarText';
import Icon from '../components/Icon';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useProgressStore } from '../stores/useProgressStore';
import { useLessonPlayback } from '../hooks/useLessonPlayback';
import { usePlaybackFollow } from '../hooks/usePlaybackFollow';
import { DIALOG_PASSES, LISTENING_GUIDE, LISTENING_PASSES, VOCAB_GUIDE, VOCAB_PASSES } from '../lib/learningListening';
import { isBasicMode } from '../lib/compatibility';
import type { Lesson, LessonMeta, Vocab, VocabularyGroup } from '../types/lesson';

type Tab = 'basic' | 'applied' | 'pattern' | 'vocab' | 'memory' | 'notes';
const TABS: [Tab, string][] = [
  ['basic', '기본 대화'], ['applied', '응용 대화'], ['pattern', '핵심 문장'],
  ['vocab', '주요 단어'], ['memory', '묶음 단어'], ['notes', '회화 노트'],
];
const TAB_LABELS = Object.fromEntries(TABS) as Record<Tab, string>;

const chip = (on: boolean) =>
  `px-3 py-1 rounded-full text-sm border ${
    on ? 'bg-brand text-white border-brand' : 'border-slate-300 text-slate-600'
  }`;

const card = 'rounded-2xl border border-slate-200 bg-white p-4';

export default function LessonPage() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const target = /^(dialog|pattern|vocab)-\d+$/.exec(params.get('focus') ?? '');
  const focus = target?.[0];
  const [lesson, setLesson] = useState<Lesson | null | undefined>(undefined);
  const basicTurns = lesson?.dialogs[0]?.turns.length ?? 0;
  const dialogueTab = lesson?.id === id && lesson.dialogs.length > 1 && Number(focus?.split('-')[1]) >= basicTurns ? 'applied' : 'basic';
  const requestedTab = params.get('tab') === 'task' ? 'notes' : params.get('tab');
  const focusTab = target?.[1] === 'dialog' ? dialogueTab : TABS.find(([key]) => key === (target?.[1] ?? requestedTab))?.[0] ?? 'basic';
  const [meta, setMeta] = useState<LessonMeta[]>([]);
  const [tab, setTab] = useState<Tab>(focusTab);
  const [loadedGroups, setLoadedGroups] = useState<{ id: string; groups: VocabularyGroup[] } | null>(null);
  const settings = useSettingsStore();
  const { showZh, showPinyin, showKo, showMeaningUnits, toggle } = settings;
  const { done, markDone, markUndone, setLast } = useProgressStore();
  const basic = isBasicMode();
  const loaded = loadedGroups?.id === id;
  const memoryGroups = loaded ? loadedGroups.groups : [];
  useEffect(() => {
    if (tab !== 'memory' || !id || loaded) return;
    let active = true;
    void loadVocabularyGroups(id).then(
      (groups) => { if (active) setLoadedGroups({ id, groups }); },
      () => { if (active) setLoadedGroups({ id, groups: [] }); },
    );
    return () => { active = false; };
  }, [tab, id, loaded]);

  const vocabularyTab = tab === 'vocab' || tab === 'memory';
  const vocabulary = tab === 'memory' ? memoryGroups.flatMap((group) => group.words) : lesson?.vocab ?? [];
  const isDialogue = tab === 'basic' || tab === 'applied';
  const dialogues = tab === 'basic' ? lesson?.dialogs.slice(0, 1) ?? [] : tab === 'applied' ? lesson?.dialogs.slice(1) ?? [] : [];
  const dialogVerses = dialogues.flatMap((dialogue) => dialogue.turns.map((turn) => turn.verse));
  const vocabVerses = vocabulary.map((v) => ({ zh: v.zh, pinyin: v.pinyin, ko: v.ko, chunks: [] }));
  const patternVerses = (lesson?.patterns ?? []).flatMap((p) => p.examples);
  const playableVerses = isDialogue ? dialogVerses : vocabularyTab ? vocabVerses : tab === 'pattern' ? patternVerses : [];
  const passList = vocabularyTab ? VOCAB_PASSES : isDialogue ? DIALOG_PASSES : LISTENING_PASSES;
  const scope = `${id}:${tab}`;
  const playback = useLessonPlayback(playableVerses, scope, passList);
  const { playing, step, pass, display, passLabel, completed, play, stop: stopAll } = playback;
  const learning = pass !== null;
  const follow = usePlaybackFollow(playing, scope, !!lesson);
  const caption = display ?? { showZh, showPinyin, showKo };
  const passCount = passList.length;
  const tabLabel = TAB_LABELS[tab];
  const selectTab = (next: Tab): void => {
    if (next === tab) return;
    stopAll();
    setTab(next);
  };
  const location = (kind: 'dialog' | 'pattern' | 'vocab' | 'memory', index: number) => {
    const key = `${kind}-${index}`;
    return { id: `lesson-entry-${key}`, tabIndex: key === focus ? -1 : undefined };
  };

  useEffect(() => { stopAll(); setTab(focusTab); }, [id, focus, focusTab, stopAll]);
  useEffect(() => {
    if (!focus || lesson?.id !== id || tab !== focusTab) return;
    const frame = requestAnimationFrame(() => {
      const line = document.getElementById(`lesson-entry-${focus}`);
      line?.focus({ preventScroll: true });
      line?.scrollIntoView({ block: 'center' });
    });
    return () => cancelAnimationFrame(frame);
  }, [focus, focusTab, id, lesson, tab]);

  useEffect(() => {
    void loadMeta().then(setMeta);
  }, []);

  useEffect(() => {
    let active = true;
    setLesson(undefined);
    loadLesson(id).then((l) => {
      if (!active) return;
      setLesson(l ?? null);
      if (l) setLast(l.id);
    });
    return () => {
      active = false;
    };
  }, [id, setLast]);

  if (lesson === undefined) return <main className="p-4">불러오는 중…</main>;
  if (lesson === null) {
    return (
      <main className="p-4">
        과를 찾을 수 없습니다.{' '}
        <Link to="/path" className="text-brand">
          목록으로
        </Link>
      </main>
    );
  }

  const idx = meta.findIndex((m) => m.id === id);
  const prev = idx > 0 ? meta[idx - 1] : undefined;
  const next = idx >= 0 ? meta[idx + 1] : undefined;

  const renderVocabulary = (words: Vocab[], start: number, label: string) => (
      <ul className="space-y-2" aria-label={label}>
        {words.map((v, row) => {
        const i = start + row;
        return (
          <li
            key={i}
            {...location(tab === 'memory' ? 'memory' : 'vocab', i)}
            data-playback-line={i}
            aria-current={i === playing ? 'true' : undefined}
            className={`${card} !p-3 ${i === playing ? 'ring-2 ring-brand' : ''}`}
          >
            <div className="flex items-start gap-2">
              <button
                type="button"
                aria-label={`${v.zh} 듣기`}
                onClick={() => { stopAll(); void speak(v.zh); }}
                className="shrink-0 w-9 h-9 rounded-full bg-brand text-white flex items-center justify-center"
              >
                <Icon name="speaker" size={16} />
              </button>
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-2">
                  {caption.showZh && <span lang="zh-Hans" className="font-hanzi text-xl">{v.zh}</span>}
                  {caption.showPinyin && <span lang="zh-Latn-pinyin" className="reading-pinyin text-sm">{v.pinyin}</span>}
                  <span className="text-xs text-slate-500">{v.pos}</span>
                </div>
                {caption.showKo && <p className="text-sm text-slate-800 mt-0.5">{v.ko}</p>}
                {v.hanjaNote && <p className="text-xs text-slate-500 mt-1">{v.hanjaNote}</p>}
                {v.exZh && (caption.showZh || caption.showPinyin || caption.showKo) && (
                  <div className="mt-2 rounded-lg bg-brand-50 px-2 py-2">
                    <button
                      type="button"
                      aria-label="예문 듣기"
                      onClick={() => { stopAll(); void speak(v.exZh!); }}
                      className="float-right text-brand"
                    >
                      <Icon name="speaker" size={14} />
                    </button>
                    {caption.showZh && <span lang="zh-Hans" className="font-hanzi">{v.exZh}</span>}
                    <div className="text-xs text-slate-500">
                      {caption.showPinyin && <span lang="zh-Latn-pinyin" className="reading-pinyin">{v.exPinyin}</span>}
                      {caption.showKo && v.exKo && <> · {v.exKo}</>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </li>
          );
        })}
      </ul>
  );

  return (
    <main ref={follow.readingRef} className="p-4 pb-24 space-y-4">
      <Link to="/path" className="text-sm text-slate-500">
        ← 학습 경로
      </Link>

      <header>
        <p className="text-xs text-brand font-semibold">오늘의 대화</p>
        <h1 className="text-xl font-bold mt-1">
          {lesson.no}. <span lang="zh-Hans" className="font-hanzi">{lesson.titleZh}</span>
        </h1>
        <div className="text-sm text-slate-600">
          <span lang="zh-Latn-pinyin" className="reading-pinyin">{lesson.titlePinyin}</span> · {lesson.titleKo}
        </div>
      </header>

      <div ref={follow.controlsRef} role="group" aria-label="학습 도구" className="sticky z-20 flex flex-wrap items-center gap-2 bg-paper py-1">
        {!basic && (
          <Link to={`/daily?id=${lesson.id}`} className="inline-flex items-center gap-1.5 rounded-full bg-brand text-white text-sm font-semibold px-3 py-1">
            <Icon name="timer" size={14} /> 10분 데일리
          </Link>
        )}
        {!basic && (
          <Link to={`/lesson/${lesson.id}/mastery?source=all`} className="inline-flex items-center gap-1.5 rounded-full bg-brand text-white text-sm font-semibold px-3 py-1">
            <Icon name="target" size={14} /> 심화 학습
          </Link>
        )}
        {tab !== 'notes' && playableVerses.length > 0 && (
          <button
            type="button"
            disabled={!playableVerses.length}
            aria-pressed={learning}
            onClick={() => { if (learning) stopAll(); else void play('learning'); }}
            className="inline-flex items-center gap-1.5 rounded-full border border-brand text-brand text-sm font-semibold px-3 py-1 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Icon name={learning ? 'stop' : 'repeat'} size={14} /> {learning ? '학습 듣기 멈추기' : `${tabLabel} ${passCount}회 학습 듣기`}
          </button>
        )}
        {tab !== 'notes' && playableVerses.length > 0 && (
          <button
            type="button"
            disabled={!playableVerses.length}
            onClick={() => { if (playing >= 0 && !learning) stopAll(); else void play('once', { withKo: true }); }}
            className="inline-flex items-center gap-1.5 rounded-full border border-brand text-brand text-sm font-semibold px-3 py-1 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Icon name={playing >= 0 && !learning ? 'stop' : 'play'} size={14} /> {playing >= 0 && !learning ? '멈추기' : `${tabLabel} 전체 듣기`}
          </button>
        )}
        <button type="button" aria-pressed={!!done[id]} onClick={() => done[id] ? markUndone(id) : markDone(id)}
          className={`ml-auto rounded-full border px-3 py-1 text-sm font-semibold ${done[id] ? 'border-brand bg-brand text-white' : 'border-brand text-brand'}`}>
          {done[id] ? '완료됨' : '학습 완료'}
        </button>
        {playing >= 0 && (
          <span role="status" className="basis-full rounded-lg border border-brand bg-white px-3 py-1.5 text-xs text-brand">
            {learning ? `${(pass ?? 0) + 1}/${passCount}회 · ${passLabel} · ` : '재생 중 '}
            {(learning ? step : playing) + 1}/{playableVerses.length}{tab === 'memory' ? '항목' : vocabularyTab ? '단어' : '문장'}
          </span>
        )}
      </div>
      {completed && <p role="status" className="text-sm text-brand">{passCount}회 학습 듣기를 마쳤어요. 기존 표시 설정으로 돌아왔어요.</p>}
      <p className="text-xs text-slate-500">
        {tab === 'notes'
          ? '회화 노트에서 상황에 맞는 말투를 확인하세요.'
          : `${vocabularyTab ? VOCAB_GUIDE : LISTENING_GUIDE} 매회 선택한 ${tabLabel} 전체를 듣고, 종료하면 기존 표시 설정으로 돌아와요.`}
      </p>

      <div role="tablist" aria-label="레슨 영역" className="flex gap-1 overflow-x-auto overflow-y-hidden border-b border-slate-200">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => selectTab(key)}
            className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-semibold ${tab === key ? 'border-brand text-brand' : 'border-transparent text-slate-500'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={learning} aria-pressed={caption.showZh} className={chip(caption.showZh)} onClick={() => toggle('showZh')}>한자</button>
        <button type="button" disabled={learning} aria-pressed={caption.showPinyin} className={chip(caption.showPinyin)} onClick={() => toggle('showPinyin')}>병음</button>
        <button type="button" disabled={learning} aria-pressed={caption.showKo} className={chip(caption.showKo)} onClick={() => toggle('showKo')}>한글</button>
        <button type="button" aria-pressed={showMeaningUnits} className={chip(showMeaningUnits)} onClick={() => toggle('showMeaningUnits')}>의미단위</button>
      </div>

      {tab === 'applied' && !playableVerses.length && <p role="status" className="text-sm text-slate-600">이 과에는 응용 대화가 없어요.</p>}
      {isDialogue && (
        <>
          {tab === 'basic' && lesson.situation.length > 0 && (
            <section className={card}>
              <h2 className="font-bold text-sm text-brand mb-2">情景 · 상황</h2>
              <ul className="space-y-1 text-sm text-slate-700">
                {lesson.situation.map((line, i) => <li key={i}>{line}</li>)}
              </ul>
            </section>
          )}

          {(() => {
            let line = 0;
            return dialogues.map((d, i) => (
              <section key={i}>
                <h2 className="font-bold text-sm text-brand mb-2">{d.title}</h2>
                {d.turns.map((t, j) => {
                  const idx = line++;
                  return (
                    <div
                      key={j}
                      {...location('dialog', idx + (tab === 'applied' ? basicTurns : 0))}
                      data-playback-line={idx}
                      aria-current={idx === playing ? 'true' : undefined}
                      className={idx === playing ? 'ring-2 ring-brand rounded-xl' : ''}
                    >
                      <ChunkCard verse={t.verse} speaker={`${t.speaker}:`} display={display} onBeforeSpeak={stopAll} />
                    </div>
                  );
                })}
              </section>
            ));
          })()}
        </>
      )}

      {tab === 'vocab' && vocabulary.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-bold text-brand">주요 단어</h2>
          {renderVocabulary(vocabulary, 0, '주요 단어')}
        </section>
      )}

      {tab === 'memory' && (
        <section className="space-y-4">
          <header>
            <h2 className="text-sm font-bold text-brand">묶음 단어</h2>
            <p className="text-sm text-slate-600">{lesson.titleKo} · <span lang="zh-Hans">{lesson.titleZh}</span></p>
          </header>
          {memoryGroups.length === 0 && <p role="status" className="text-sm text-slate-600">{loaded ? '이 과의 묶음 단어를 불러오지 못했어요.' : '묶음 단어를 불러오는 중이에요.'}</p>}
          {memoryGroups.map((group, groupIndex) => (
            <section key={group.title} className="space-y-2">
              <h3 className="text-sm font-semibold text-brand">{group.title} ({group.words.length})</h3>
              {renderVocabulary(group.words, memoryGroups.slice(0, groupIndex).reduce((count, previous) => count + previous.words.length, 0), group.title)}
            </section>
          ))}
        </section>
      )}

      {tab === 'pattern' && lesson.patterns.length > 0 && (
        <section>
          <h2 className="font-bold text-sm text-brand mb-2">句型练习 · 패턴 연습</h2>
          <div className="space-y-2">
            {(() => {
              let line = 0;
              return lesson.patterns.map((p, i) => (
                <article key={i} className={card}>
                  <h3 className="font-semibold">
                    <span lang="zh-Hans" className="font-hanzi">{p.title}</span>
                    {p.meaning && <span className="text-sm text-slate-500 font-normal"> · {p.meaning}</span>}
                  </h3>
                  <div className="mt-2">
                    {p.examples.map((v, j) => {
                      const idx = line++;
                      return (
                        <div
                          key={j}
                          {...location('pattern', idx)}
                          data-playback-line={idx}
                          aria-current={idx === playing ? 'true' : undefined}
                          className={idx === playing ? 'ring-2 ring-brand rounded-xl' : ''}
                        >
                          <ChunkCard verse={v} display={display} onBeforeSpeak={stopAll} />
                        </div>
                      );
                    })}
                  </div>
                </article>
              ));
            })()}
          </div>
        </section>
      )}

      {tab === 'notes' && (
        <>
          <Link to={`/lesson/${lesson.id}/practice`} className="text-sm font-semibold text-brand underline">학습에서 롤플레이 연습하기</Link>

          {lesson.notes.length > 0 && (
            <section className={card}>
              <h2 className="font-bold text-sm text-brand mb-2">真实口语 · 실제 회화 노트</h2>
              <ul className="space-y-1 text-sm text-slate-700">
                {lesson.notes.map((n, i) => (
                  <li key={i}>· <GrammarText text={n.text} readings={n.readings} showPinyin={caption.showPinyin} /></li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <nav className="flex items-center justify-between gap-3 pt-4 border-t border-slate-200">
        {prev ? (
          <Link to={`/lesson/${prev.id}`} className="rounded-full border border-slate-200 px-4 py-2 text-sm">
            ← 이전
          </Link>
        ) : <span />}
        <Link to="/path" className="text-sm text-slate-500 underline">목차</Link>
        {next ? (
          <Link to={`/lesson/${next.id}`} className="rounded-full bg-brand text-white px-4 py-2 text-sm font-semibold">
            다음 →
          </Link>
        ) : <span />}
      </nav>
    </main>
  );
}
