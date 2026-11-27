import type { Lesson, StudySource, Verse } from '../types/lesson';

export type StudyLine = { verse: Verse; source: 'text' | 'dialog' | 'vocab' | 'pattern'; speaker?: string; section?: string };
export const STUDY_SOURCES: { value: StudySource; label: string }[] = [
  { value: 'dialog', label: '대화' }, { value: 'pattern', label: '패턴' }, { value: 'all', label: '대화+패턴' },
];
export const studySourceLabel = (source: StudySource) => STUDY_SOURCES.find((s) => s.value === source)!.label;
export const parseStudySource = (value: string | null, fallback: StudySource = 'dialog'): StudySource => {
  if (value === 'dialog' || value === 'pattern' || value === 'all') return value;
  if (value === 'text') return 'dialog';
  if (value === 'vocab') return 'pattern';
  return fallback;
};

/** 학습 대상 안내 문구: "대화+패턴 · 17문장" 형식으로 화면마다 통일한다. */
export const studyTargetText = (source: StudySource, count?: number) =>
  `${studySourceLabel(source)}${count === undefined ? '' : ` · ${count}문장`}`;

/** 함께 학습할 때는 대화 다음에 패턴 예문을 이어서 재생한다. */
export function studyLines(lesson: Lesson, source: StudySource): StudyLine[] {
  const dialog: StudyLine[] = source === 'pattern' ? [] : lesson.dialogs.flatMap((d) => d.turns.map((turn, i) => ({
    ...turn, source: 'dialog' as const, section: i === 0 ? `대화 · ${d.title}` : undefined,
  })));
  const pattern: StudyLine[] = source === 'dialog' ? [] : lesson.patterns.flatMap((p) => p.examples.map((verse, i) => ({
    verse, source: 'pattern' as const, section: i === 0 ? `패턴 · ${p.title}` : undefined,
  })));
  return [...dialog, ...pattern];
}
