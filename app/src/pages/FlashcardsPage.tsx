import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Icon from '../components/Icon';
import { loadMeta, loadVol, loadVocabularyGroups } from '../lib/contentLoader';
import { speakAsync, stopSpeak } from '../lib/tts';
import { flashcardIsDue, useFlashcardStore } from '../stores/useFlashcardStore';
import type { Lesson, LessonMeta, VocabularyGroup } from '../types/lesson';

type Kind = 'word' | 'example' | 'phrase' | 'dialog';
type Card = { id: string; kind: Kind; term: string; reading: string; meaning: string; lesson: string; theme: string; speaker?: string };
const KINDS = { word: '단어', example: '예문', phrase: '핵심 문장', dialog: '대화' } as const;
const buttonClass = (selected: boolean) =>
  `rounded-full border px-3 py-1.5 text-sm font-semibold ${selected ? 'border-brand bg-brand text-white' : 'border-slate-200 bg-white text-slate-600'}`;

function buildCards(lessons: Lesson[], groups: Record<string, VocabularyGroup[]>): Card[] {
  const result: Card[] = [];
  for (const lesson of lessons) {
    const seen = new Set<string>();
    const add = (kind: Kind, term: string, reading: string, meaning: string, theme: string, speaker?: string) => {
      if (!term || !meaning) return;
      const id = JSON.stringify([lesson.id, kind, term, meaning]);
      if (seen.has(id)) return;
      seen.add(id);
      result.push({ id, kind, term, reading, meaning, lesson: lesson.titleKo, theme, speaker });
    };

    const vocab = [...lesson.vocab, ...(groups[lesson.id] ?? []).flatMap((group) => group.words)];
    for (const item of vocab) {
      if (item.pos === '표현') {
        add('phrase', item.zh, item.pinyin, item.ko, '묶음 단어');
        continue;
      }
      add('word', item.zh, item.pinyin, item.ko, '단어');
      if (item.exZh && item.exKo) add('example', item.exZh, item.exPinyin ?? '', item.exKo, item.zh);
    }
    for (const pattern of lesson.patterns) {
      for (const item of pattern.examples) add('phrase', item.zh, item.pinyin, item.ko, pattern.title);
    }
    for (const dialogue of lesson.dialogs) {
      for (const item of dialogue.turns) add('dialog', item.verse.zh, item.verse.pinyin, item.verse.ko, dialogue.title, item.speaker);
    }
  }
  return result;
}

export default function FlashcardsPage() {
  const [params] = useSearchParams();
  const requestedId = params.get('id') ?? '';
  const [meta, setMeta] = useState<LessonMeta[]>([]);
  const [scope, setScope] = useState<number | 'all'>(1);
  const [lessonId, setLessonId] = useState('');
  const [kind, setKind] = useState<Kind | 'all'>('all');
  const [deck, setDeck] = useState<'due' | 'all'>('due');
  const [direction, setDirection] = useState<'native' | 'ko' | 'mixed'>('native');
  const [autoPlay, setAutoPlay] = useState(false);
  const [cards, setCards] = useState<Card[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [session, setSession] = useState<Card[]>([]);
  const [cursor, setCursor] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [stats, setStats] = useState({ known: 0, again: 0 });
  const progress = useFlashcardStore((state) => state.cards);
  const grade = useFlashcardStore((state) => state.grade);

  useEffect(() => {
    let active = true;
    void loadMeta().then((rows) => {
      if (!active) return;
      const selected = rows.find((lesson) => lesson.id === requestedId);
      setScope(selected?.vol ?? rows[0]?.vol ?? 1);
      setLessonId(selected?.id ?? '');
      setMeta(rows);
      setFailed(rows.length === 0);
    }, () => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [requestedId]);

  const volumes = useMemo(() => [...new Set(meta.map((lesson) => lesson.vol))], [meta]);
  useEffect(() => {
    if (!volumes.length) return;
    let active = true;
    setCards(null);
    setFailed(false);
    void (async () => {
      const books = await Promise.all((scope === 'all' ? volumes : [scope]).map(loadVol));
      if (books.some((book) => !book.length)) throw new Error('교재를 불러오지 못했어요.');
      const lessons = books.flat().filter((lesson) => !lessonId || lesson.id === lessonId);
      const groups = Object.fromEntries(await Promise.all(lessons.map(async (lesson) =>
        [lesson.id, await loadVocabularyGroups(lesson.id).catch(() => [])] as const)));
      if (active) setCards(buildCards(lessons, groups));
    })().catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [volumes, scope, lessonId]);

  const filtered = useMemo(() => (cards ?? []).filter((card) => kind === 'all' || card.kind === kind), [cards, kind]);
  const due = useMemo(() => filtered.filter((card) => flashcardIsDue(progress[card.id])), [filtered, progress]);
  const restart = (next: Card[]) => {
    setSession(next);
    setCursor(0);
    setRevealed(false);
    setStats({ known: 0, again: 0 });
  };

  useEffect(() => {
    const saved = useFlashcardStore.getState().cards;
    restart(deck === 'all' ? filtered : filtered.filter((card) => flashcardIsDue(saved[card.id])));
  }, [filtered, deck]);

  const current = cards ? session[cursor] : undefined;
  const showNativeFirst = direction === 'native' || (direction === 'mixed' && cursor % 2 === 0);
  const autoText = autoPlay && (showNativeFirst || revealed) ? current?.term : undefined;
  useEffect(() => {
    const timer = autoText ? window.setTimeout(() => { void speakAsync(autoText); }, 250) : undefined;
    return () => { window.clearTimeout(timer); stopSpeak(); };
  }, [current, autoText]);

  const answer = (known: boolean) => {
    if (!current || !revealed) return;
    grade(current.id, known);
    setStats((previous) => known ? { ...previous, known: previous.known + 1 } : { ...previous, again: previous.again + 1 });
    setRevealed(false);
    setCursor((position) => position + 1);
  };
  const sourceText = current && (
    <div>
      <div className="flex items-center justify-center gap-2">
        <p lang="zh-Hans" className="font-hanzi text-xl font-semibold">{current.term}</p>
        <button type="button" aria-label="발음 듣기" onClick={() => void speakAsync(current.term)} className="shrink-0 rounded-full p-2 text-brand">
          <Icon name="speaker" size={18} />
        </button>
      </div>
      {current.reading && <p className="mt-1 text-sm text-slate-500">{current.reading}</p>}
    </div>
  );

  return (
    <main className="mx-auto max-w-xl space-y-4 p-4 pb-28">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold">플래시카드</h1>
        <Link to={lessonId ? `/study?id=${lessonId}` : '/study'} className="text-sm text-slate-500">학습</Link>
      </div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="권 선택">
        {([ ...volumes, 'all' ] as const).map((book) => (
          <button key={book} type="button" aria-pressed={scope === book} className={buttonClass(scope === book)} onClick={() => {
            if (book === scope) return;
            setScope(book); setLessonId('');
          }}>{book === 'all' ? '전체' : `${book}권`}</button>
        ))}
      </div>
      <label className="block text-sm font-semibold">
        과 선택
        <select value={lessonId} onChange={(event) => setLessonId(event.target.value)} className="mt-1 block w-full rounded-xl border border-slate-200 bg-white p-2 font-normal">
          <option value="">선택한 권의 전체 과</option>
          {meta.filter((lesson) => scope === 'all' || lesson.vol === scope).map((lesson) => (
            <option key={lesson.id} value={lesson.id}>{lesson.vol}권 · {lesson.no}과 · {lesson.titleKo}</option>
          ))}
        </select>
      </label>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="카드 종류">
        {(['all', ...Object.keys(KINDS)] as (Kind | 'all')[]).map((value) => (
          <button key={value} type="button" aria-pressed={kind === value} onClick={() => setKind(value)} className={buttonClass(kind === value)}>{value === 'all' ? '전체' : KINDS[value]}</button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="복습 방식">
        <button type="button" aria-pressed={deck === 'due'} onClick={() => setDeck('due')} className={buttonClass(deck === 'due')}>복습 대상 ({due.length})</button>
        <button type="button" aria-pressed={deck === 'all'} onClick={() => setDeck('all')} className={buttonClass(deck === 'all')}>전체 ({filtered.length})</button>
        <button type="button" className={buttonClass(false)} aria-label="카드 방향 바꾸기" onClick={() => { setDirection(direction === 'native' ? 'ko' : direction === 'ko' ? 'mixed' : 'native'); setRevealed(false); }}>
          {direction === 'native' ? '중국어 → 한글' : direction === 'ko' ? '한글 → 중국어' : '혼합'}
        </button>
        <button type="button" aria-pressed={autoPlay} onClick={() => setAutoPlay((on) => !on)} className={buttonClass(autoPlay)}>자동 듣기</button>
      </div>
      <p className="text-xs text-slate-500" role="status">진행 {Math.min(cursor, session.length)}/{session.length} · 알았어요 {stats.known} · 다시 {stats.again}</p>
      {failed && <p className="text-sm text-slate-600">교재를 불러오지 못했어요. 연결 상태를 확인하고 다시 열어 주세요.</p>}
      {!failed && !cards && <p className="text-sm text-slate-500">카드를 불러오는 중…</p>}
      {current && (
        <section className="space-y-3" aria-label="현재 카드">
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <p className="text-xs text-slate-500">{KINDS[current.kind]} · {current.lesson} · {current.theme}{current.speaker ? ` · ${current.speaker}` : ''}</p>
            {showNativeFirst ? sourceText : <p className="text-lg font-semibold">{current.meaning}</p>}
            {revealed && <div className="border-t border-slate-200 pt-4">{showNativeFirst ? <p className="text-lg font-semibold">{current.meaning}</p> : sourceText}</div>}
          </div>
          {!revealed ? (
            <button type="button" className="w-full rounded-xl bg-brand px-4 py-3 font-semibold text-white" onClick={() => setRevealed(true)}>{showNativeFirst ? '뜻 보기' : '중국어 보기'}</button>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className="rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold" onClick={() => answer(false)}>다시</button>
              <button type="button" className="rounded-xl bg-brand px-4 py-3 font-semibold text-white" onClick={() => answer(true)}>알았어요</button>
            </div>
          )}
        </section>
      )}
      {cards && !current && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 text-center">
          <h2 className="font-semibold">{session.length ? '세션 완료' : '선택한 범위에 카드가 없어요.'}</h2>
          {session.length > 0 && <button type="button" onClick={() => restart(deck === 'due' ? due : filtered)} className="mt-3 rounded-full bg-brand px-4 py-2 font-semibold text-white">다시 시작</button>}
        </section>
      )}
    </main>
  );
}
