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

const normalize = (lang: string) => lang.toLowerCase().replace('_', '-');

/** 같은 로캘의 대표 음성만 남긴다. 정확한 로캘이 없으면 같은 언어의 대체 음성을 쓴다. */
export function cleanVoices(voices: SpeechSynthesisVoice[], locale: string): SpeechSynthesisVoice[] {
  const target = normalize(locale);
  const prefix = target.slice(0, 2);
  const candidates = voices.filter((voice) => normalize(voice.lang).startsWith(prefix));
  const exact = candidates.filter((voice) => {
    const lang = normalize(voice.lang);
    if (lang === target || lang === prefix) return true;
    return prefix === 'zh' && (lang === 'zh-hans' || lang.startsWith('zh-hans-'));
  });
  const pool = exact.length
    ? exact
    : candidates.filter((voice) => !(prefix === 'ko' && /^ko-(in|kp)(-|$)/.test(normalize(voice.lang))))
        .filter((voice) => prefix !== 'zh' || !/^zh-(hk|mo)(-|$)/.test(normalize(voice.lang)));
  const seen = new Set<string>();
  return pool
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

/** Android Chrome first getVoices() can be empty. Poll briefly and listen for changes. */
export function watchVoices(update: () => void): () => void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return () => undefined;
  let stopped = false;
  const run = () => { if (!stopped) update(); };
  const timer = window.setInterval(run, 500);
  const stopTimer = window.setTimeout(() => window.clearInterval(timer), 8000);
  window.speechSynthesis.addEventListener('voiceschanged', run);
  update();
  return () => {
    stopped = true;
    window.clearInterval(timer);
    window.clearTimeout(stopTimer);
    window.speechSynthesis.removeEventListener('voiceschanged', run);
  };
}
