export type Chunk = { id: string; zh: string; pinyin: string; ko: string };
export type StudySource = 'text' | 'dialog' | 'all';
export type MasterySource = StudySource;
export type Verse = { zh: string; pinyin: string; ko: string; chunks: Chunk[]; words?: number[]; phrases?: number[] };
export type Vocab = {
  zh: string; pinyin: string; pos: string; ko: string;
  hanjaNote?: string; exZh?: string; exPinyin?: string; exKo?: string;
};
export type RelatedGroup = { title: string; rows: { zh: string; pinyin: string; ko: string }[] };
export type Trap = { target: string; pinyin: string; mistake: string; correct: string };
export type GrammarReading = { start: number; text: string; pinyin: string[] };
export type GrammarPoint = {
  title: string; lines: string[];
  readings?: { title: GrammarReading[]; lines: GrammarReading[][] };
};
export type DialogSection = { title: string; turns: { speaker: string; verse: Verse }[] };
export type Pattern = { title: string; meaning: string; examples: Verse[] };
export type RichLine = { text: string; readings?: GrammarReading[] };
export type Task = { title: string; lines: RichLine[] };
export type Lesson = {
  id: string; vol: number; no: number; level: 1 | 2 | 3 | 4;
  titleZh: string; titlePinyin: string; titleKo: string;
  situation: string[];
  text: Verse[]; vocab: Vocab[]; related: RelatedGroup[];
  patterns: Pattern[]; tasks: Task[]; notes: RichLine[];
  traps: Trap[]; grammar: GrammarPoint[]; dialogs: DialogSection[];
};
export type LessonMeta = Pick<Lesson, 'id' | 'vol' | 'no' | 'level' | 'titleZh' | 'titlePinyin' | 'titleKo'>;
