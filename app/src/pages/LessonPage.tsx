import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { loadLesson, loadMeta } from '../lib/contentLoader';
import { speak } from '../lib/tts';
import ChunkCard from '../components/ChunkCard';
import GrammarText from '../components/GrammarText';
import Icon from '../components/Icon';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useProgressStore } from '../stores/useProgressStore';
import { useLessonPlayback } from '../hooks/useLessonPlayback';
import { usePlaybackFollow } from '../hooks/usePlaybackFollow';
import { LISTENING_GUIDE, LISTENING_PASSES, VOCAB_GUIDE, VOCAB_PASSES } from '../lib/learningListening';
import { isBasicMode } from '../lib/compatibility';
import type { Lesson, LessonMeta } from '../types/lesson';

type Tab = 'dialog' | 'vocab' | 'pattern' | 'task';
const TABS: [Tab, string][] = [['dialog', '대화'], ['vocab', '표현'], ['pattern', '패턴'], ['task', '롤플레이']];

const chip = (on: boolean) =>
  `px-3 py-1 rounded-full text-sm border ${
    on ? 'bg-brand text-white border-brand' : 'border-slate-300 text-slate-600'
  }`;

const card = 'rounded-2xl border border-slate-200 bg-white p-4';

export default function LessonPage() {
  const { id = '' } = useParams();
  const [lesson, setLesson] = useState<Lesson | null | undefined>(undefined);
  const [meta, setMeta] = useState<LessonMeta[]>([]);
  const [tab, setTab] = useState<Tab>('dialog');
  const settings = useSettingsStore();
  const { showZh, showPinyin, showKo, showMeaningUnits, toggle } = settings;
  const { markDone, setLast } = useProgressStore();
  const basic = isBasicMode();
  const dialogVerses = lesson?.text ?? [];
  const vocabVerses = (lesson?.vocab ?? []).map((v) => ({ zh: v.zh, pinyin: v.pinyin, ko: v.ko, chunks: [] }));
  const patternVerses = (lesson?.patterns ?? []).flatMap((p) => p.examples);
  const playableVerses = tab === 'dialog' ? dialogVerses : tab === 'vocab' ? vocabVerses : tab === 'pattern' ? patternVerses : [];
  const passList = tab === 'vocab' ? VOCAB_PASSES : LISTENING_PASSES;
  const playback = useLessonPlayback(playableVerses, `${id}:${tab}`, passList);
  const { playing, step, pass, display, passLabel, completed, play, stop: stopAll } = playback;
  const learning = pass !== null;
  const follow = usePlaybackFollow(playing, `${id}:${tab}`);
  const caption = display ?? { showZh, showPinyin, showKo };
  const passCount = passList.length;
  const tabLabel = tab === 'vocab' ? '단어' : tab === 'pattern' ? '패턴' : '대화';
  const selectTab = (next: Tab): void => {
    if (next === tab) return;
    stopAll();
    setTab(next);
  };

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

  useEffect(() => {
    if (!lesson) return;
    const onScroll = () => {
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      if (max <= 0 || (el.scrollTop || window.scrollY) / max >= 0.7) markDone(lesson.id);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [lesson, markDone]);

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

      <div ref={follow.controlsRef} className="flex flex-wrap items-center gap-2" aria-label="듣기 설정">
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
        {tab !== 'task' && (
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
        {tab !== 'task' && (
          <button
            type="button"
            disabled={!playableVerses.length}
            onClick={() => { if (playing >= 0 && !learning) stopAll(); else void play('once'); }}
            className="inline-flex items-center gap-1.5 rounded-full border border-brand text-brand text-sm font-semibold px-3 py-1 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Icon name={playing >= 0 && !learning ? 'stop' : 'play'} size={14} /> {playing >= 0 && !learning ? '멈추기' : `${tabLabel} 전체 듣기`}
          </button>
        )}
        {playing >= 0 && (
          <span role="status" className="text-xs text-slate-500">
            {learning ? `${(pass ?? 0) + 1}/${passCount}회 · ${passLabel} · ` : '재생 중 '}
            {(learning ? step : playing) + 1}/{playableVerses.length}문장
          </span>
        )}
      </div>
      {completed && <p role="status" className="text-sm text-brand">{passCount}회 학습 듣기를 마쳤어요. 기존 표시 설정으로 돌아왔어요.</p>}
      <p className="text-xs text-slate-500">
        {tab === 'task'
          ? '롤플레이는 과업을 실제로 말해 보세요. 문장 듣기는 대화·표현·패턴 탭에서 사용할 수 있어요.'
          : `${tab === 'vocab' ? VOCAB_GUIDE : LISTENING_GUIDE} 매회 선택한 ${tabLabel} 전체를 듣고, 종료하면 기존 표시 설정으로 돌아와요.`}
      </p>

      <div role="tablist" aria-label="레슨 영역" className="flex gap-1 overflow-x-auto border-b border-slate-200">
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

      {tab === 'dialog' && (
        <>
          {lesson.situation.length > 0 && (
            <section className={card}>
              <h2 className="font-bold text-sm text-brand mb-2">情景 · 상황</h2>
              <ul className="space-y-1 text-sm text-slate-700">
                {lesson.situation.map((line, i) => <li key={i}>{line}</li>)}
              </ul>
            </section>
          )}

          {(() => {
            let line = 0;
            return lesson.dialogs.map((d, i) => (
              <section key={i}>
                <h2 className="font-bold text-sm text-brand mb-2">{d.title}</h2>
                {d.turns.map((t, j) => {
                  const idx = line++;
                  return (
                    <div
                      key={j}
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

      {tab === 'vocab' && lesson.vocab.length > 0 && (
        <section>
          <h2 className="font-bold text-sm text-brand mb-2">核心表达 · 핵심 표현</h2>
          <ul className="space-y-2">
            {lesson.vocab.map((v, i) => (
              <li
                key={i}
                data-playback-line={i}
                aria-current={i === playing ? 'true' : undefined}
                className={`${card} !p-3 ${i === playing ? 'ring-2 ring-brand' : ''}`}
              >
                <div className="flex items-start gap-2">
                  <button
                    type="button"
                    aria-label={`${v.zh} 듣기`}
                    onClick={() => { if (learning) stopAll(); void speak(v.zh); }}
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
                          onClick={() => { if (learning) stopAll(); void speak(v.exZh!); }}
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
            ))}
          </ul>
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

      {tab === 'task' && (
        <>
          {lesson.tasks.length > 0 && (
            <section>
              <h2 className="font-bold text-sm text-brand mb-2">角色扮演 · 롤플레이</h2>
              <div className="space-y-2">
                {lesson.tasks.map((t, i) => (
                  <article key={i} className={card}>
                    <h3 className="font-semibold">{i + 1}. {t.title}</h3>
                    <ul className="mt-2 space-y-1 text-sm text-slate-700">
                      {t.lines.map((line, j) => (
                        <li key={j}>· <GrammarText text={line.text} readings={line.readings} showPinyin={caption.showPinyin} /></li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </section>
          )}

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
