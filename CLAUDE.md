# 동물 뮤직 사파리 — Claude 작업 컨텍스트

## 프로젝트 개요
5세 아이를 위한 태블릿(샤오신패드) 가로 모드 최적화 음악 놀이 앱.
Vite + React 18 + Tailwind CSS v3 + Framer Motion 11 스택.

## 로컬 개발
```bash
cd C:\Users\user\animal-safari
npm run dev        # http://localhost:5174
npm run build      # dist/ 빌드
```

## 핵심 파일 구조
```
src/
  App.jsx                  # 루트: 탭 전환, 마법봉, TTS 칭찬 시스템
  components/
    SafariBoard.jsx        # 모드1: 동물 오케스트라 (6종 카드 + 루프)
    StarGame.jsx           # 모드2: 별 잡기 게임 (파티클, 하트 게이지)
    ParentalLock.jsx       # 아이 이름 설정 모달 (⚙️ 아이콘)
  utils/
    SoundEngine.js         # Web Audio API 합성음 + TTS + Vibration API
public/
  sw.js                    # 서비스 워커 (PWA 오프라인)
  manifest.json            # PWA 설치 설정
```

## 사운드 시스템
- `playAnimalSound(id, mode)` — mode: 0=동물소리, 1=피아노, 2=실로폰
- `startAnimalLoop / stopAnimalLoop` — 루프 관리
- `speakPraise(text)` — Web Speech API 한국어 TTS
- 실제 MP3로 교체 원할 때: SoundEngine.js 내 TODO 주석 참고

## 칭찬 트리거 조건
- SafariBoard: 루프 동물 3마리 이상 동시 활성
- StarGame: 점수 5, 10, 15, 20 달성 시

## 배포
- GitHub 레포: https://github.com/wooik/animal-safari (예정)
- Vercel 자동 배포 (main 브랜치 push → 자동 재배포)
- vercel.json에 SPA 라우팅 + SW 캐시 헤더 설정 완료
