import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { loadLesson, loadMeta } from '../lib/contentLoader';
import { speak } from '../lib/tts';
import ChunkCard from '../components/ChunkCard';
import GrammarText from '../components/GrammarText';
import Icon from '../components/Icon';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useProgressStore } from '../stores/useProgressStore';
import type { Lesson, LessonMeta } from '../types/lesson';

const chip = (on: boolean) =>
  `px-3 py-1 rounded-full text-sm border ${
    on ? 'bg-brand text-white border-brand' : 'border-slate-300 text-slate-600'
  }`;

const card = 'rounded-2xl border border-slate-200 bg-white p-4';

export default function LessonPage() {
  const { id = '' } = useParams();
  const [lesson, setLesson] = useState<Lesson | null | undefined>(undefined);
  const [meta, setMeta] = useState<LessonMeta[]>([]);
  const settings = useSettingsStore();
  const { showZh, showPinyin, showKo, showMeaningUnits, toggle } = settings;
  const { markDone, setLast } = useProgressStore();

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
    <main className="p-4 pb-24 space-y-4">
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

      <div className="flex flex-wrap gap-2">
        <button type="button" aria-pressed={showZh} className={chip(showZh)} onClick={() => toggle('showZh')}>한자</button>
        <button type="button" aria-pressed={showPinyin} className={chip(showPinyin)} onClick={() => toggle('showPinyin')}>병음</button>
        <button type="button" aria-pressed={showKo} className={chip(showKo)} onClick={() => toggle('showKo')}>한글</button>
        <button type="button" aria-pressed={showMeaningUnits} className={chip(showMeaningUnits)} onClick={() => toggle('showMeaningUnits')}>의미단위</button>
      </div>

      {lesson.situation.length > 0 && (
        <section className={card}>
          <h2 className="font-bold text-sm text-brand mb-2">情景 · 상황</h2>
          <ul className="space-y-1 text-sm text-slate-700">
            {lesson.situation.map((line, i) => <li key={i}>{line}</li>)}
          </ul>
        </section>
      )}

      {lesson.dialogs.map((d, i) => (
        <section key={i}>
          <h2 className="font-bold text-sm text-brand mb-2">{d.title}</h2>
          {d.turns.map((t, j) => (
            <ChunkCard key={j} verse={t.verse} speaker={`${t.speaker}:`} />
          ))}
        </section>
      ))}

      {lesson.vocab.length > 0 && (
        <section>
          <h2 className="font-bold text-sm text-brand mb-2">核心表达 · 핵심 표현</h2>
          <ul className="space-y-2">
            {lesson.vocab.map((v, i) => (
              <li key={i} className={`${card} !p-3`}>
                <div className="flex items-start gap-2">
                  <button
                    type="button"
                    aria-label={`${v.zh} 듣기`}
                    onClick={() => void speak(v.zh)}
                    className="shrink-0 w-9 h-9 rounded-full bg-brand text-white flex items-center justify-center"
                  >
                    <Icon name="speaker" size={16} />
                  </button>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-2">
                      {showZh && <span lang="zh-Hans" className="font-hanzi text-xl">{v.zh}</span>}
                      {showPinyin && <span lang="zh-Latn-pinyin" className="reading-pinyin text-sm">{v.pinyin}</span>}
                      <span className="text-xs text-slate-500">{v.pos}</span>
                    </div>
                    {showKo && <p className="text-sm text-slate-800 mt-0.5">{v.ko}</p>}
                    {v.hanjaNote && <p className="text-xs text-slate-500 mt-1">{v.hanjaNote}</p>}
                    {v.exZh && (
                      <div className="mt-2 rounded-lg bg-brand-50 px-2 py-2">
                        <button
                          type="button"
                          aria-label="예문 듣기"
                          onClick={() => void speak(v.exZh!)}
                          className="float-right text-brand"
                        >
                          <Icon name="speaker" size={14} />
                        </button>
                        <span lang="zh-Hans" className="font-hanzi">{v.exZh}</span>
                        <div className="text-xs text-slate-500">
                          <span lang="zh-Latn-pinyin" className="reading-pinyin">{v.exPinyin}</span>
                          {v.exKo && <> · {v.exKo}</>}
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

      {lesson.patterns.length > 0 && (
        <section>
          <h2 className="font-bold text-sm text-brand mb-2">句型练习 · 패턴 연습</h2>
          <div className="space-y-2">
            {lesson.patterns.map((p, i) => (
              <article key={i} className={card}>
                <h3 className="font-semibold">
                  <span lang="zh-Hans" className="font-hanzi">{p.title}</span>
                  {p.meaning && <span className="text-sm text-slate-500 font-normal"> · {p.meaning}</span>}
                </h3>
                <div className="mt-2">
                  {p.examples.map((v, j) => <ChunkCard key={j} verse={v} />)}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {lesson.tasks.length > 0 && (
        <section>
          <h2 className="font-bold text-sm text-brand mb-2">角色扮演 · 롤플레이</h2>
          <div className="space-y-2">
            {lesson.tasks.map((t, i) => (
              <article key={i} className={card}>
                <h3 className="font-semibold">{i + 1}. {t.title}</h3>
                <ul className="mt-2 space-y-1 text-sm text-slate-700">
                  {t.lines.map((line, j) => (
                    <li key={j}>· <GrammarText text={line.text} readings={line.readings} showPinyin={showPinyin} /></li>
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
              <li key={i}>· <GrammarText text={n.text} readings={n.readings} showPinyin={showPinyin} /></li>
            ))}
          </ul>
        </section>
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
