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

/** iOS가 같은 음성을 중복 반환하고 영어 novelty 음성을 섞어 반환하는 문제를 정리한다. */
export function cleanVoices(voices: SpeechSynthesisVoice[], locale: string): SpeechSynthesisVoice[] {
  const prefix = locale.toLowerCase().slice(0, 2);
  const seen = new Set<string>();
  return voices
    .filter((voice) => voice.lang.toLowerCase().replace('_', '-').startsWith(prefix))
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
