# ChinSpeak — 대화로 배우는 현대 중국어

ChinTalk와 별도로 만드는 **회화 중심 중국어 학습 PWA**입니다. 상황과 관계에 맞는 실제 대화를 듣고, 핵심 표현과 패턴을 익힌 뒤, 롤플레이로 말해 보는 구조를 목표로 합니다.

- **현재 상태**: Phase 0 파일럿 — vol1 1과 「인사」 수록
- **최종 목표**: 8권 160과
- **앱 주소(예정)**: https://mykim711231.github.io/ChinSpeak/
- **기존 ChinTalk**: 그대로 유지하며, ChinSpeak와 콘텐츠·데이터 모델을 공유하지 않습니다.

## 한 과의 구성

1. **情景 · 상황** — 관계, 목표, 격식
2. **对话 · 대화** — 2~3개의 현대 회화
3. **核心表达 · 핵심 표현** — 격식/캐주얼 대안이 있는 청크
4. **句型练习 · 패턴 연습** — 대체·확장 예문
5. **角色扮演 · 롤플레이** — 정보 차이·문제 해결 과업
6. **真实口语 · 실제 회화 노트** — 호칭, 레지스터, 금기 표현

## 학습 기능

- 한자·병음·한글 표시 토글, 의미 단위 표시
- 문장별 TTS, 단어장(글자 탭), 형광펜
- 기기 음성 / 사전 합성 mp3, 오프라인 PWA
- 10분 데일리·심화 학습·편하게 듣기·복습(기존 인프라 재사용)

## 개발

```bash
cd app
npm install
npm run build          # 콘텐츠 생성 + 타입 검사 + 프로덕션 빌드
npm run build:tts -- --vol 1        # 중국어 mp3
npm run build:tts -- --vol 1 --lang ko  # 한글 mp3
npm run verify:tts
```

- 콘텐츠 원본: `Doc/Markdown/vol{1..8}/*.md`
- 생성 데이터: `app/public/data/*.json`
- 음성: `app/public/tts/*.mp3`
- 배포: `main` 푸시 시 GitHub Actions → GitHub Pages

## 로드맵

- **Phase 0**: 뼈대·데이터 모델·파일럿 1과
- **Phase 1**: vol1 20과
- **Phase 2**: vol2~4 (생활·여행·비즈니스)
- **Phase 3**: vol5~8 (고급·실무·기능·시사)
- **Phase 4**: 160과 원어민 검수·배포

## 라이선스

- 코드: MIT
- 학습 콘텐츠: AI 보조로 초안을 만들고 직접 검수·편집합니다. 오류는 이슈로 알려 주세요.
- 음성: Microsoft Edge Neural TTS(Xiaoxiao / SunHi). 학습용 무료 앱이며, 수익화 시 정식 서비스로 재합성할 예정입니다.
