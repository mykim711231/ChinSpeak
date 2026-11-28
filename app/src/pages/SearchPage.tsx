import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { loadMeta, loadVol } from '../lib/contentLoader';

type SearchLine = { id: string; lesson: string; focus: string; kind: string; zh: string; pinyin: string; ko: string };
const PAGE_SIZE = 24;
const normalized = (text: string) => text.normalize('NFKD').toLowerCase().replace(/\p{M}/gu, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
let source: Promise<SearchLine[]> | undefined;

function loadSearchLines() {
  source ??= loadMeta().then(async (meta) => {
    const volumes = [...new Set(meta.map((row) => row.vol))];
    const lessons = (await Promise.all(volumes.map(loadVol))).flat();
    return lessons.flatMap((lesson) => {
      const text = lesson.dialogs.flatMap((dialog) => dialog.turns.map((turn) => turn.verse));
      const patterns = lesson.patterns.flatMap((pattern) => pattern.examples);
      const make = (row: { zh: string; pinyin: string; ko: string }, label: string, focus: string) => ({
        id: lesson.id, lesson: `${lesson.vol}권 ${lesson.no}과 · ${lesson.titleKo}`, focus, kind: label,
        zh: row.zh, pinyin: row.pinyin, ko: row.ko,
      });
      return [
        ...text.map((row, i) => make(row, '대화', `dialog-${i}`)),
        ...patterns.map((row, i) => make(row, '표현', `pattern-${i}`)),
        ...lesson.vocab.map((row, i) => make(row, '단어', `vocab-${i}`)),
      ];
    });
  }).catch((error) => { source = undefined; throw error; });
  return source;
}

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const [input, setInput] = useState(query);
  const [lines, setLines] = useState<SearchLine[]>();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [limit, setLimit] = useState(PAGE_SIZE);

  useEffect(() => { setInput(query); setLimit(PAGE_SIZE); }, [query]);
  useEffect(() => {
    let active = true;
    setFailed(false);
    void loadSearchLines().then((value) => { if (active) setLines(value); }, () => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [attempt]);

  const results = useMemo(() => {
    const needle = normalized(query);
    if (!needle) return [];
    const terms = needle.split(' ');
    const compact = /^[a-z ]+$/.test(needle) ? needle.replace(/ /g, '') : '';
    return (lines ?? []).flatMap((line) => {
      const fields = [line.zh, line.pinyin, line.ko, line.lesson].map(normalized);
      const rank = fields.slice(0, 3).includes(needle) ? 0
        : fields.slice(0, 3).some((value) => value.includes(needle)) ? 1
        : compact && fields[1].replace(/ /g, '').includes(compact) ? 2
        : terms.every((term) => fields.some((value) => value.includes(term))) ? 3 : -1;
      return rank < 0 ? [] : [{ line, rank }];
    }).sort((a, b) => a.rank - b.rank).map(({ line }) => line);
  }, [lines, query]);

  const search = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = input.trim();
    setParams(text ? { q: text } : {});
  };

  return (
    <main className="space-y-4 p-4 pb-28">
      <h1 className="text-xl font-bold">표현 검색</h1>
      <form role="search" onSubmit={search} className="flex items-end gap-2">
        <label className="min-w-0 flex-1 text-sm font-semibold">검색어
          <input type="search" value={input} onChange={(event) => setInput(event.target.value)} placeholder="예 · 你好, ni hao, 인사" className="mt-1 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-normal" />
        </label>
        <button type="submit" className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white">검색</button>
      </form>
      {failed ? (
        <div className="text-sm text-slate-600"><p role="status">검색 자료를 불러오지 못했어요.</p><button type="button" onClick={() => setAttempt((value) => value + 1)} className="mt-2 font-semibold text-brand underline">다시 불러오기</button></div>
      ) : query && (
        <>
          <p role="status" className="text-sm text-slate-600">{!lines ? '표현을 찾는 중이에요…' : results.length ? `${results.length}개 표현` : '일치하는 표현이 없어요.'}</p>
          <ul className="space-y-2">
            {results.slice(0, limit).map((line) => (
              <li key={`${line.id}:${line.focus}`}>
                <Link to={`/lesson/${line.id}?focus=${line.focus}`} className="block space-y-1 rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-xs font-semibold text-brand">{line.kind} · {line.lesson}</p>
                  <p lang="zh-Hans" className="font-hanzi text-lg">{line.zh}</p>
                  <p lang="zh-Latn-pinyin" className="reading-pinyin text-sm text-slate-600">{line.pinyin}</p>
                  <p className="text-sm text-slate-700">{line.ko}</p>
                </Link>
              </li>
            ))}
          </ul>
          {limit < results.length && <button type="button" onClick={() => setLimit((value) => value + PAGE_SIZE)} className="rounded-lg border border-brand px-3 py-2 text-sm font-semibold text-brand">더 보기</button>}
        </>
      )}
    </main>
  );
}
