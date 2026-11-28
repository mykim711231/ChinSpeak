import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { loadMeta } from '../lib/contentLoader';
import { useProgressStore } from '../stores/useProgressStore';
import type { LessonMeta } from '../types/lesson';
import Icon from '../components/Icon';

const LEVELS = [1, 2, 3, 4] as const;

export default function PathPage() {
  const [meta, setMeta] = useState<LessonMeta[]>([]);
  const [sp] = useSearchParams();
  const lv = Number(sp.get('lv'));
  const initialLevel = lv >= 1 && lv <= 4 ? lv : 1;
  const [level, setLevel] = useState(initialLevel);
  const [vol, setVol] = useState(initialLevel * 2 - 1);
  const done = useProgressStore((s) => s.done);
  const markDone = useProgressStore((s) => s.markDone);
  const markUndone = useProgressStore((s) => s.markUndone);
  useEffect(() => { void loadMeta().then(setMeta); }, []);
  useEffect(() => {
    if (lv >= 1 && lv <= 4) {
      setLevel(lv);
      setVol(lv * 2 - 1);
    }
  }, [lv]);
  const vols = [level * 2 - 1, level * 2];
  const rows = useMemo(() => meta.filter((m) => m.vol === vol), [meta, vol]);
  const count = rows.filter((m) => done[m.id]).length;

  return (
    <main className="p-4 pb-28 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">학습 경로</h1>
          <p className="text-xs text-slate-500">8권 · 160과</p>
        </div>
        <Link to="/" className="text-sm text-slate-500">홈</Link>
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-4 gap-1.5" role="tablist" aria-label="레벨 선택">
          {LEVELS.map((n) => (
            <button
              key={n}
              type="button"
              role="tab"
              aria-selected={n === level}
              onClick={() => { setLevel(n); setVol(n * 2 - 1); }}
              className={`rounded-lg px-2 py-2 text-sm font-semibold ${n === level ? 'bg-brand text-white' : 'bg-white border border-slate-200 text-slate-600'}`}
            >
              Lv.{n}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-1.5" role="tablist" aria-label="권 선택">
          {vols.map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={v === vol}
              onClick={() => setVol(v)}
              className={`rounded-xl border px-2 py-2 text-center ${v === vol ? 'border-brand bg-brand text-white' : 'border-slate-200 bg-white text-slate-700'}`}
            >
              <span className="block text-sm font-semibold">{v}권</span>
              <span className={`block text-[10px] ${v === vol ? 'text-white/80' : 'text-slate-500'}`}>1~20과</span>
            </button>
          ))}
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{vol}권 · {count}/{rows.length}과 완료</p>
          <p className="text-xs text-slate-500">과를 골라 대화·표현·단어·연습을 학습하세요.</p>
        </div>
        <span className="text-brand"><Icon name="map" size={26} /></span>
      </section>

      <ul className="overflow-hidden rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100">
        {rows.map((m) => {
          const isDone = !!done[m.id];
          return (
            <li key={m.id} className="flex items-center">
              <Link to={`/lesson/${m.id}`} className="min-w-0 flex-1 px-3 py-3">
                <span className="block text-[11px] text-slate-400">{m.vol}권 {String(m.no).padStart(2, '0')}과</span>
                <span className="mt-0.5 block truncate text-sm font-semibold">{m.titleKo}</span>
                <span className="mt-0.5 block truncate text-xs text-slate-500">{m.titleZh} · {m.titlePinyin}</span>
              </Link>
              <button
                type="button"
                aria-pressed={isDone}
                aria-label={`${m.no}. ${m.titleKo}: ${isDone ? '미완료로 변경' : '완료로 표시'}`}
                onClick={() => isDone ? markUndone(m.id) : markDone(m.id)}
                className={`mr-3 grid h-7 w-7 flex-none place-items-center rounded-full border transition ${isDone ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-transparent hover:border-brand'}`}
              >
                <Icon name="check" size={14} />
              </button>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
