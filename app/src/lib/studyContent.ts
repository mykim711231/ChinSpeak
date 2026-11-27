import type { Lesson, StudySource, Verse } from '../types/lesson';

export type StudyLine = { verse: Verse; source: 'text' | 'dialog' | 'vocab'; speaker?: string; section?: string };
export const STUDY_SOURCES: { value: StudySource; label: string }[] = [
  { value: 'dialog', label: '대화' }, { value: 'vocab', label: '표현' }, { value: 'all', label: '대화+표현' },
];
export const studySourceLabel = (source: StudySource) => STUDY_SOURCES.find((s) => s.value === source)!.label;
export const parseStudySource = (value: string | null, fallback: StudySource = 'dialog'): StudySource => {
  if (value === 'dialog' || value === 'vocab' || value === 'all') return value;
  if (value === 'text') return 'dialog';
  return fallback;
};

/** 학습 대상 안내 문구: "대화+표현 · 24문장 (대화 다음 표현 순서)" 형식으로 화면마다 통일한다. */
export const studyTargetText = (source: StudySource, count?: number) =>
  `${studySourceLabel(source)}${count === undefined ? '' : ` · ${count}문장`}`;

const vocabLine = (lesson: Lesson, v: Lesson['vocab'][number], i: number): StudyLine => ({
  verse: {
    zh: v.zh, pinyin: v.pinyin, ko: v.ko,
    chunks: [{ id: `${lesson.id}:vocab:${v.zh}`, zh: v.zh, pinyin: v.pinyin, ko: v.ko }],
  },
  source: 'vocab',
  section: i === 0 ? '표현' : undefined,
});

/** 함께 학습할 때는 대화 다음에 핵심 표현을 이어서 재생한다. */
export function studyLines(lesson: Lesson, source: StudySource): StudyLine[] {
  const dialog: StudyLine[] = source === 'vocab' ? [] : lesson.dialogs.flatMap((d) => d.turns.map((turn, i) => ({
    ...turn, source: 'dialog' as const, section: i === 0 ? `대화 · ${d.title}` : undefined,
  })));
  const vocab: StudyLine[] = source === 'dialog' ? [] : lesson.vocab.map((v, i) => vocabLine(lesson, v, i));
  return [...dialog, ...vocab];
}
