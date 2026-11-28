import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { LEVEL_NAMES, loadMeta } from '../lib/contentLoader';
import { useProgressStore } from '../stores/useProgressStore';
import type { LessonMeta } from '../types/lesson';
import Icon from '../components/Icon';

const pickClass = (active: boolean) =>
  `rounded-lg border px-2 py-2 text-sm font-semibold ${active ? 'border-brand bg-brand text-white' : 'border-slate-200 bg-white text-slate-600'}`;

export default function PathPage() {
  const [meta, setMeta] = useState<LessonMeta[] | null>(null);
  const [params, setParams] = useSearchParams();
  const done = useProgressStore((state) => state.done);
  const markDone = useProgressStore((state) => state.markDone);
  const markUndone = useProgressStore((state) => state.markUndone);
  const last = useProgressStore((state) => state.last);
  useEffect(() => { void loadMeta().then(setMeta); }, []);

  const groups = useMemo(() => {
    const levels = new Map<number, Map<number, LessonMeta[]>>();
    for (const lesson of meta ?? []) {
      const volumes = levels.get(lesson.level) ?? new Map<number, LessonMeta[]>();
      const rows = volumes.get(lesson.vol) ?? [];
      rows.push(lesson);
      volumes.set(lesson.vol, rows);
      levels.set(lesson.level, volumes);
    }
    return levels;
  }, [meta]);

  const recent = meta?.find((lesson) => lesson.id === last);
  const wantedLevel = Number(params.get('lv')) || Number(params.get('level'));
  const level = groups.has(wantedLevel) ? wantedLevel : recent?.level ?? groups.keys().next().value;
  const volumes = level === undefined ? undefined : groups.get(level);
  const wantedVol = Number(params.get('vol'));
  const vol = volumes?.has(wantedVol) ? wantedVol : volumes?.has(recent?.vol ?? 0) ? recent?.vol : volumes?.keys().next().value;
  const rows = vol === undefined ? [] : volumes?.get(vol) ?? [];
  const count = rows.filter((lesson) => done[lesson.id]).length;
  const volumeCount = [...groups.values()].reduce((total, group) => total + group.size, 0);

  return (
    <main className="space-y-4 p-4 pb-28">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">학습 경로</h1>
          {!!volumeCount && <p className="text-xs text-slate-500">{volumeCount}권 · {meta?.length}과</p>}
        </div>
        <Link to="/" className="text-sm text-slate-500">홈</Link>
      </div>

      {!meta && <p role="status" className="text-sm text-slate-600">학습 경로를 불러오는 중…</p>}
      {meta?.length === 0 && <p role="status" className="text-sm text-slate-600">교재 목록을 불러오지 못했어요.</p>}

      {!!groups.size && (
        <div className="grid grid-cols-4 gap-1.5" role="group" aria-label="레벨 선택">
          {[...groups.keys()].map((value) => (
            <button key={value} type="button" aria-pressed={value === level}
              onClick={() => setParams({ lv: String(value), vol: String(value * 2 - 1) }, { replace: true })}
              className={pickClass(value === level)}>
              Lv.{value}
            </button>
          ))}
        </div>
      )}

      {volumes && (
        <div className="grid grid-cols-2 gap-1.5" role="group" aria-label="권 선택">
          {[...volumes.entries()].map(([value, lessons]) => (
            <button key={value} type="button" aria-pressed={value === vol}
              onClick={() => setParams({ lv: String(level), vol: String(value) }, { replace: true })}
              className={pickClass(value === vol)}>
              {value}권
              <span className="block text-[11px] font-normal opacity-90">{lessons[0]?.no ?? 1}~{lessons[lessons.length - 1]?.no ?? 20}과</span>
            </button>
          ))}
        </div>
      )}

      {vol !== undefined && level !== undefined && (
        <section className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div>
            <p className="text-xs text-slate-600">{LEVEL_NAMES[level]}</p>
            <p className="text-sm font-semibold">{vol}권 · {count}/{rows.length}과 완료</p>
            <p className="text-xs text-slate-500">과를 골라 대화·핵심 문장·단어·회화 노트를 학습하세요.</p>
          </div>
          <span className="text-brand"><Icon name="map" size={26} /></span>
        </section>
      )}

      {rows.length > 0 && (
        <ul className="overflow-hidden rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100">
          {rows.map((lesson) => {
            const isDone = !!done[lesson.id];
            return (
              <li key={lesson.id} className="flex items-center">
                <Link to={`/lesson/${lesson.id}`} className="flex min-w-0 flex-1 items-center gap-3 px-3 py-3">
                  <span className="grid h-8 w-8 flex-none place-items-center rounded-full bg-brand-50 text-xs font-bold text-brand">
                    {String(lesson.no).padStart(2, '0')}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{lesson.titleKo}</span>
                    <span className="mt-0.5 block truncate text-xs text-slate-500"><span lang="zh-CN">{lesson.titleZh}</span> · <span lang="zh-Latn-pinyin">{lesson.titlePinyin}</span></span>
                  </span>
                </Link>
                <button type="button" aria-pressed={isDone} aria-label={`${lesson.no}. ${lesson.titleKo}: ${isDone ? '미완료로 변경' : '완료로 표시'}`}
                  onClick={() => isDone ? markUndone(lesson.id) : markDone(lesson.id)}
                  className={`mr-3 grid h-8 w-8 shrink-0 place-items-center rounded-full border ${isDone ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-transparent hover:border-brand'}`}>
                  <Icon name="check" size={14} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
