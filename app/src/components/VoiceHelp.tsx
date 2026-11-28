export default function VoiceHelp() {
  return (
    <details className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
      <summary className="cursor-pointer font-semibold">기기 TTS가 안 될 때</summary>
      <ul className="mt-2 list-disc space-y-1.5 pl-4 text-xs text-slate-600">
        <li><b>삼성:</b> 설정 → 일반 관리 → 텍스트 음성 변환 → 기본 엔진을 <b>Google 음성 인식 및 합성</b>으로 변경 → 음성 데이터 설치에서 한국어·영어·중국어·일본어를 내려받으세요.</li>
        <li><b>Android Chrome:</b> Google TTS 음성 데이터를 설치해야 기기 음성이 표시됩니다. 첫 실행 직후에는 음성 목록이 비어 있을 수 있어 잠시 후 다시 확인해 주세요.</li>
        <li><b>Samsung Internet:</b> Google 음성이 보이지 않으면 <b>Chrome</b>에서 열거나 Samsung TTS 대신 Google TTS를 기본 엔진으로 선택하세요.</li>
        <li><b>iPhone:</b> Apple 기기 음성만 제공되며 Google 온라인 음성은 표시되지 않습니다. 설정 → 손쉬운 사용 → 콘텐츠 말하기에서 음성을 내려받아 주세요.</li>
        <li><b>급할 때:</b> 앱 설정에서 <b>녹음 음성</b>을 선택하면 기기 음성팩 없이 저장된 MP3로 재생됩니다.</li>
      </ul>
    </details>
  );
}
