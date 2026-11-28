import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { StudySource } from '../types/lesson';

export type FontSize = 'md' | 'lg' | 'xl';
export type BlueLight = 0 | 1 | 2 | 3;
export const THEMES = ['light', 'sepia', 'dark', 'system'] as const;
export type Theme = typeof THEMES[number];
export const VOICE_RATE_RANGE = { min: 0.6, max: 1.4, step: 0.05 };
type Level = 1 | 2 | 3 | 4;
type ToggleKey = 'showZh' | 'showPinyin' | 'showKo' | 'showMeaningUnits';

type S = {
  showZh: boolean;
  showPinyin: boolean;
  showKo: boolean;
  /** 교재의 의미 단위 경계를 화면에 표시한다. 음성 재생과 무관하다. */
  showMeaningUnits: boolean;
  fontSize: FontSize;
  theme: Theme;
  keepAwake: boolean;
  ttsVolume: number;
  wifiOnlyDownloads: boolean;
  blueLight: BlueLight;
  ttsRate: number;
  voiceMode: 'device' | 'recorded';
  ttsVoiceUri: string | null;
  setVoiceMode: (mode: 'device' | 'recorded') => void;
  setTtsVoiceUri: (uri: string | null) => void;
  level: Level;
  onboarded: boolean;
  studySource: StudySource;
  setStudySource: (source: StudySource) => void;
  /** 녹음 음성 모드에서 전체 음원을 자동 저장하고 중단된 다운로드를 이어받는다. */
  autoDownload: boolean;
  setAutoDownload: (v: boolean) => void;
  /** 데일리·편하게 듣기·마스터리에서 중국어 뒤에 한글 번역을 읽어 줌 */
  koVoice: boolean;
  setKoVoice: (v: boolean) => void;
  lessonKoVoice: boolean;
  koreanRate: number;
  koreanVoiceUri: string | null;
  setLessonKoVoice: (v: boolean) => void;
  setKoreanRate: (v: number) => void;
  setKoreanVoiceUri: (v: string | null) => void;
  flashcardAutoPlay: boolean;
  setFlashcardAutoPlay: (v: boolean) => void;
  /** 설치 안내 "다시 보지 않기"/닫은 시각(ms), 7일 후 재표시 */
  installDismissedAt: number;
  setOnboarded: (v: boolean) => void;
  dismissInstall: () => void;
  toggle: (k: ToggleKey) => void;
  setLevel: (l: Level) => void;
  setFontSize: (f: FontSize) => void;
  setTheme: (t: Theme) => void;
  setKeepAwake: (v: boolean) => void;
  setTtsVolume: (v: number) => void;
  setWifiOnlyDownloads: (v: boolean) => void;
  setBlueLight: (b: BlueLight) => void;
  setTtsRate: (r: number) => void;
};

export const useSettingsStore = create<S>()(
  persist(
    (set) => ({
      showZh: true,
      showPinyin: true,
      showKo: true,
      showMeaningUnits: true,
      fontSize: 'md',
      theme: 'system',
      keepAwake: false,
      ttsVolume: 1,
      wifiOnlyDownloads: false,
      blueLight: 0,
      ttsRate: 1,
      voiceMode: 'device',
      ttsVoiceUri: null,
      setVoiceMode: (voiceMode) => set({ voiceMode }),
      setTtsVoiceUri: (ttsVoiceUri) => set({ ttsVoiceUri }),
      level: 1,
      onboarded: false,
      studySource: 'dialog',
      setStudySource: (studySource) => set({ studySource }),
      autoDownload: true,
      setAutoDownload: (autoDownload) => set({ autoDownload }),
      koVoice: false,
      setKoVoice: (koVoice) => set({ koVoice }),
      lessonKoVoice: true,
      koreanRate: 1,
      koreanVoiceUri: null,
      setLessonKoVoice: (lessonKoVoice) => set({ lessonKoVoice }),
      setKoreanRate: (koreanRate) => set({ koreanRate }),
      setKoreanVoiceUri: (koreanVoiceUri) => set({ koreanVoiceUri }),
      flashcardAutoPlay: false,
      setFlashcardAutoPlay: (flashcardAutoPlay) => set({ flashcardAutoPlay }),
      installDismissedAt: 0,
      setOnboarded: (onboarded) => set({ onboarded }),
      dismissInstall: () => set({ installDismissedAt: Date.now() }),
      toggle: (k) => set((s) => ({ [k]: !s[k] }) as Partial<S>),
      setLevel: (level) => set({ level }),
      setFontSize: (fontSize) => set({ fontSize }),
      setTheme: (theme) => set({ theme }),
      setKeepAwake: (keepAwake) => set({ keepAwake }),
      setTtsVolume: (ttsVolume) => set({ ttsVolume }),
      setWifiOnlyDownloads: (wifiOnlyDownloads) => set({ wifiOnlyDownloads }),
      setBlueLight: (blueLight) => set({ blueLight }),
      setTtsRate: (ttsRate) => set({ ttsRate }),
    }),
    {
      name: 'chinspeak-settings',
      version: 6,
      // 이전 단어/구/절 선택은 표시 여부만 유지한다. 나머지 사용자 설정은 보존한다.
      migrate: (old) => {
        const o = (old ?? {}) as Record<string, unknown>;
        const { large, showBreaks, breakLevel, ...rest } = o;
        const legacy = rest.studySource;
        const source = legacy === 'pattern' || legacy === 'all' || legacy === 'vocab' ? (legacy === 'vocab' ? 'pattern' : legacy) : 'dialog';
        return {
          ...rest,
          studySource: source,
          fontSize: rest.fontSize ?? (large ? 'lg' : 'md'),
          showMeaningUnits: typeof rest.showMeaningUnits === 'boolean' ? rest.showMeaningUnits
            : typeof breakLevel === 'number' ? breakLevel > 0 : typeof showBreaks === 'boolean' ? showBreaks : true,
        } as unknown as S;
      },
    },
  ),
);
