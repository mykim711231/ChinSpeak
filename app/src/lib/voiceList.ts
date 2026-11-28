const NOVELTY = new Set([
  'Bubbles', 'Cellos', 'Wobble', 'Fred', 'Good News', 'Jester', 'Junior', 'Kathy',
  'Organ', 'Superstar', 'Ralph', 'Trinoids', 'Whisper', 'Zarvox', 'Albert', 'Bad News',
  'Bahh', 'Bells', 'Boing', 'Bruce', 'Deranged', 'Hysterical', 'Pipe Organ', 'Princess',
  'Sandy', 'Shelley', 'Flo', 'Grandma', 'Grandpa', 'Reed', 'Rocko', 'Eddy',
]);

const PREFERRED = [
  'Samantha', 'Ava', 'Allison', 'Susan', 'Karen', 'Daniel', 'Alex', 'Nicky', 'Aaron', 'Joey',
  'Kyoko', 'O-ren', 'Yuna', '유나', 'Tingting', 'Ting-Ting', 'Meijia', 'Mei-Jia',
];

/** 같은 로캘의 대표 음성만 남긴다. ko-IN 같은 지역 변종과 중복·novelty 음성을 제외한다. */
export function cleanVoices(voices: SpeechSynthesisVoice[], locale: string): SpeechSynthesisVoice[] {
  const target = locale.toLowerCase().replace('_', '-');
  const prefix = target.slice(0, 2);
  const matches = (voice: SpeechSynthesisVoice) => {
    const lang = voice.lang.toLowerCase().replace('_', '-');
    if (target.includes('-')) {
      if (lang === target || lang === prefix) return true;
      return prefix === 'zh' && (lang === 'zh-hans' || lang.startsWith('zh-hans-'));
    }
    return lang === prefix || lang.startsWith(`${prefix}-`);
  };
  const seen = new Set<string>();
  return voices
    .filter(matches)
    .filter((voice) => !NOVELTY.has(voice.name))
    .filter((voice) => {
      const key = `${voice.name}|${voice.lang}|${voice.localService}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => {
      const ai = PREFERRED.indexOf(a.name);
      const bi = PREFERRED.indexOf(b.name);
      if (ai !== -1 || bi !== -1) return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      return a.name.localeCompare(b.name);
    });
}
