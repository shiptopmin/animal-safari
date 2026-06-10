import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SafariBoard from './components/SafariBoard';
import StarGame from './components/StarGame';
import ParentalLock from './components/ParentalLock';
import { speakPraise } from './utils/SoundEngine';

/* ─── 사운드 모드 정의 ────────────────────────────── */
const SOUND_MODES = [
  { id: 0, icon: '🦁', label: '동물소리',  badge: '🎵' },
  { id: 1, icon: '🎹', label: '피아노',    badge: '🎹' },
  { id: 2, icon: '🔔', label: '실로폰',   badge: '🔔' },
];

/* ─── 칭찬에 사용할 동물 목록 ────────────────────── */
const PRAISE_ANIMALS = [
  { emoji: '🦁', name: '사자' },
  { emoji: '🐒', name: '원숭이' },
  { emoji: '🐘', name: '코끼리' },
  { emoji: '🐸', name: '개구리' },
  { emoji: '🦆', name: '오리' },
  { emoji: '🐥', name: '병아리' },
];

function randomAnimal() {
  return PRAISE_ANIMALS[Math.floor(Math.random() * PRAISE_ANIMALS.length)];
}

/* ─── 마법봉 모드 변경 토스트 ─────────────────────── */
function ModeToast({ mode }) {
  return (
    <motion.div
      className="absolute top-20 left-1/2 -translate-x-1/2 z-40 pointer-events-none"
      initial={{ opacity: 0, y: -16, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16, scale: 0.8 }}
      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
    >
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl px-6 py-3 shadow-xl flex items-center gap-3">
        <span className="text-3xl">{mode.icon}</span>
        <div>
          <p className="font-black text-purple-800 text-lg leading-none">
            {mode.label} 모드!
          </p>
          <p className="text-purple-500 text-xs font-bold">
            🪄 마법봉으로 소리가 바뀌었어요
          </p>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── 칭찬 팝업 ──────────────────────────────────── */
function PraisePopup({ data }) {
  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none"
      style={{ backdropFilter: 'blur(2px)', background: 'rgba(0,0,0,0.25)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-white/96 rounded-3xl px-10 py-8 shadow-2xl flex flex-col items-center gap-4 max-w-xs"
        initial={{ scale: 0, rotate: -12 }}
        animate={{ scale: 1, rotate: 0 }}
        exit={{ scale: 0, rotate: 12 }}
        transition={{ type: 'spring', stiffness: 320, damping: 20 }}
      >
        {/* 동물 이모지 흔들기 */}
        <motion.span
          className="text-8xl leading-none"
          animate={{ rotate: [0, -12, 12, -8, 8, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 1.2 }}
        >
          {data.animal.emoji}
        </motion.span>

        {/* 칭찬 메시지 */}
        <p className="text-2xl font-black text-purple-800 text-center leading-snug">
          {data.message}
        </p>

        {/* 별 3개 순차 등장 */}
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="text-3xl leading-none"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.25 + i * 0.12, type: 'spring', stiffness: 500 }}
            >
              ⭐
            </motion.span>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── App 루트 컴포넌트 ──────────────────────────── */
export default function App() {
  const [tab,          setTab]          = useState('safari');   // 'safari' | 'stars'
  const [soundMode,    setSoundMode]    = useState(0);          // 0 | 1 | 2
  const [childName,    setChildName]    = useState('친구');
  const [showSettings, setShowSettings] = useState(false);
  const [praiseData,   setPraiseData]   = useState(null);
  const [modeToast,    setModeToast]    = useState(null);       // 마법봉 토스트

  // 칭찬 디바운스 ref (3초 내 중복 칭찬 방지)
  const praiseTimerRef = useRef(null);
  // 마지막 칭찬을 트리거한 루프 카운트 (SafariBoard 전용)
  const lastLoopPraise = useRef(0);
  // 토스트 타이머
  const toastTimerRef  = useRef(null);

  /* ─── 칭찬 트리거 (TTS + 팝업) ─────────────────── */
  const triggerPraise = useCallback((message, animal) => {
    if (praiseTimerRef.current) return; // 이미 칭찬 중이면 무시

    speakPraise(message);
    setPraiseData({ message, animal });

    praiseTimerRef.current = setTimeout(() => {
      setPraiseData(null);
      praiseTimerRef.current = null;
    }, 3200);
  }, []);

  /* ─── SafariBoard 루프 카운트 변경 콜백 ─────────── */
  const handleAnimalBeat = useCallback((loopCount) => {
    if (loopCount >= 3 && lastLoopPraise.current < loopCount) {
      lastLoopPraise.current = loopCount;
      const a = randomAnimal();
      triggerPraise(
        `${childName}아, 정말 대단해! 동물 친구들이 모두 같이 노래하고 있어! 최고야!`,
        a
      );
    }
    if (loopCount < 3) lastLoopPraise.current = 0;
  }, [childName, triggerPraise]);

  /* ─── StarGame 점수 변경 콜백 ───────────────────── */
  const handleStarCaught = useCallback((score) => {
    const milestones = [5, 10, 15, 20];
    if (!milestones.includes(score)) return;

    const a = randomAnimal();
    const msgs = [
      `${childName}아, 별 ${score}개나 잡았어! 우와, 최고야!`,
      `와! ${a.name}가 ${childName}이를 응원해! 별 ${score}개 완성!`,
      `${childName}아, 사파리 챔피언이야! 별 ${score}개!`,
    ];
    triggerPraise(msgs[Math.floor(Math.random() * msgs.length)], a);
  }, [childName, triggerPraise]);

  /* ─── 마법봉 클릭 ───────────────────────────────── */
  const handleWandClick = () => {
    setSoundMode((prev) => {
      const next = (prev + 1) % 3;
      // 토스트 표시
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      setModeToast(SOUND_MODES[next]);
      toastTimerRef.current = setTimeout(() => setModeToast(null), 1800);
      return next;
    });
  };

  return (
    <div className="w-screen h-screen overflow-hidden flex flex-col bg-gradient-to-br from-purple-900 via-violet-800 to-indigo-900">

      {/* ══════════════ 헤더 ══════════════ */}
      <header className="flex-shrink-0 flex items-center justify-between px-4 py-2 bg-black/25 backdrop-blur-sm z-10 gap-3">

        {/* 앱 타이틀 */}
        <div className="flex items-center gap-2 min-w-0">
          <motion.span
            className="text-3xl select-none"
            animate={{ rotate: [0, -10, 10, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 4 }}
          >
            🦁
          </motion.span>
          <h1 className="text-white font-black text-base md:text-xl tracking-wide drop-shadow truncate">
            동물 뮤직 사파리
          </h1>
        </div>

        {/* 탭 전환 */}
        <div className="flex rounded-full bg-black/35 p-1 gap-1 flex-shrink-0">
          {[
            { id: 'safari', label: '🎵 오케스트라' },
            { id: 'stars',  label: '⭐ 별 잡기'   },
          ].map((t) => (
            <motion.button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-1.5 rounded-full font-black text-sm transition-colors whitespace-nowrap ${
                tab === t.id
                  ? 'bg-white text-purple-800 shadow-md'
                  : 'text-white/75 hover:text-white'
              }`}
              whileTap={{ scale: 0.94 }}
            >
              {t.label}
            </motion.button>
          ))}
        </div>

        {/* 액션 버튼 영역 */}
        <div className="flex items-center gap-2 flex-shrink-0">

          {/* 마법봉: 사운드 모드 순환 */}
          <motion.button
            onClick={handleWandClick}
            className="relative bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full p-2 shadow-lg"
            whileTap={{ scale: 0.88, rotate: 25 }}
            transition={{ type: 'spring', stiffness: 500 }}
            title="마법봉 — 소리 변환"
          >
            <span className="text-2xl select-none">🪄</span>
            {/* 현재 모드 배지 */}
            <motion.span
              key={soundMode}
              className="absolute -bottom-1 -right-1 bg-white rounded-full text-xs px-1 font-black text-purple-800 shadow leading-tight"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 600 }}
            >
              {SOUND_MODES[soundMode].badge}
            </motion.span>
          </motion.button>

          {/* 설정(톱니바퀴) */}
          <motion.button
            onClick={() => setShowSettings(true)}
            className="bg-white/20 rounded-full p-2 shadow"
            whileTap={{ scale: 0.88 }}
            animate={showSettings ? {} : { rotate: 0 }}
            title="설정"
          >
            <span className="text-2xl select-none">⚙️</span>
          </motion.button>
        </div>
      </header>

      {/* ══════════════ 메인 콘텐츠 ══════════════ */}
      <main className="flex-1 relative overflow-hidden min-h-0">
        <AnimatePresence mode="wait">
          {tab === 'safari' ? (
            <motion.div
              key="safari"
              className="absolute inset-0"
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.28, ease: 'easeInOut' }}
            >
              <SafariBoard
                soundMode={soundMode}
                childName={childName}
                onAnimalBeat={handleAnimalBeat}
              />
            </motion.div>
          ) : (
            <motion.div
              key="stars"
              className="absolute inset-0"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.28, ease: 'easeInOut' }}
            >
              <StarGame
                childName={childName}
                onStarCaught={handleStarCaught}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* 마법봉 모드 변경 토스트 */}
        <AnimatePresence>
          {modeToast && <ModeToast key={modeToast.id} mode={modeToast} />}
        </AnimatePresence>

        {/* 칭찬 팝업 */}
        <AnimatePresence>
          {praiseData && <PraisePopup key="praise" data={praiseData} />}
        </AnimatePresence>
      </main>

      {/* ══════════════ 설정 모달 ══════════════ */}
      <AnimatePresence>
        {showSettings && (
          <ParentalLock
            childName={childName}
            onSave={(name) => {
              setChildName(name);
              setShowSettings(false);
              // 이름 저장 후 즉시 환영 TTS
              speakPraise(`안녕, ${name}아! 동물 사파리에 온 걸 환영해!`);
            }}
            onClose={() => setShowSettings(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
