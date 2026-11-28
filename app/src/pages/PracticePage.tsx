import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import GrammarText from '../components/GrammarText';
import LessonSelect from '../components/LessonSelect';
import { loadLesson, loadMeta } from '../lib/contentLoader';
import { useProgressStore } from '../stores/useProgressStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import type { Lesson, LessonMeta } from '../types/lesson';

export default function PracticePage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState<Lesson | null | undefined>(undefined);
  const [meta, setMeta] = useState<LessonMeta[]>([]);
  const setLast = useProgressStore((state) => state.setLast);
  const showPinyin = useSettingsStore((state) => state.showPinyin);

  useEffect(() => { void loadMeta().then(setMeta); }, []);
  useEffect(() => {
    let active = true;
    setLesson(undefined);
    void loadLesson(id).then((value) => {
      if (!active) return;
      setLesson(value ?? null);
      if (value) setLast(value.id);
    }, () => { if (active) setLesson(null); });
    return () => { active = false; };
  }, [id, setLast]);

  if (lesson === undefined) return <main className="p-4">불러오는 중…</main>;
  if (lesson === null) return <main className="p-4">과를 찾을 수 없습니다. <Link to="/study" className="text-brand">학습으로</Link></main>;

  return (
    <main className="space-y-4 p-4 pb-28">
      <Link to={`/study?id=${id}`} className="text-sm text-slate-500">← 학습</Link>
      <LessonSelect label="과 선택" metas={meta} value={id} onChange={(next) => navigate(`/lesson/${next}/practice`)} />
      <header>
        <p className="text-xs font-semibold text-brand">롤플레이 연습</p>
        <h1 className="mt-1 text-xl font-bold">{lesson.no}. {lesson.titleKo}</h1>
        <p className="text-sm text-slate-500"><span lang="zh-CN">{lesson.titleZh}</span> · {lesson.titlePinyin}</p>
      </header>
      {lesson.tasks.length === 0 && <p className="text-sm text-slate-500">이 과에는 롤플레이가 없어요.</p>}
      {lesson.tasks.map((task, index) => (
        <article key={index} className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="font-semibold">{index + 1}. {task.title}</h2>
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            {task.lines.map((line, lineIndex) => (
              <li key={lineIndex}><GrammarText text={line.text} readings={line.readings} showPinyin={showPinyin} /></li>
            ))}
          </ul>
        </article>
      ))}
    </main>
  );
}
