import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';
import {
  playAnimalSound,
  startAnimalLoop,
  stopAnimalLoop,
  stopAllLoops,
  vibrate,
} from '../utils/SoundEngine';

/* ─── 12종 동물 데이터 ───────────────────────────── */
const ALL_ANIMALS = [
  // ── 1페이지 (기존 6종) ──
  { id: 'lion',     emoji: '🦁', name: '사자',   bg: 'from-orange-400 to-amber-500',  shadow: 'rgba(251,146,60,0.7)'  },
  { id: 'monkey',   emoji: '🐒', name: '원숭이', bg: 'from-amber-600 to-yellow-700',  shadow: 'rgba(180,83,9,0.7)'    },
  { id: 'elephant', emoji: '🐘', name: '코끼리', bg: 'from-sky-400 to-slate-500',     shadow: 'rgba(56,189,248,0.7)'  },
  { id: 'frog',     emoji: '🐸', name: '개구리', bg: 'from-green-400 to-emerald-600', shadow: 'rgba(74,222,128,0.7)'  },
  { id: 'duck',     emoji: '🦆', name: '오리',   bg: 'from-yellow-300 to-amber-400',  shadow: 'rgba(253,224,71,0.7)'  },
  { id: 'chick',    emoji: '🐥', name: '병아리', bg: 'from-yellow-100 to-lime-300',   shadow: 'rgba(190,242,100,0.7)' },
  // ── 2페이지 (신규 6종) ──
  { id: 'tiger',    emoji: '🐯', name: '호랑이', bg: 'from-orange-500 to-yellow-600', shadow: 'rgba(249,115,22,0.7)'  },
  { id: 'bear',     emoji: '🐻', name: '곰',     bg: 'from-stone-500 to-amber-800',   shadow: 'rgba(120,113,108,0.7)' },
  { id: 'cow',      emoji: '🐮', name: '소',     bg: 'from-gray-300 to-slate-400',    shadow: 'rgba(148,163,184,0.7)' },
  { id: 'pig',      emoji: '🐷', name: '돼지',   bg: 'from-pink-300 to-rose-400',     shadow: 'rgba(251,113,133,0.7)' },
  { id: 'cat',      emoji: '🐱', name: '고양이', bg: 'from-orange-200 to-amber-300',  shadow: 'rgba(253,186,116,0.7)' },
  { id: 'dog',      emoji: '🐶', name: '강아지', bg: 'from-amber-300 to-orange-400',  shadow: 'rgba(252,211,77,0.7)'  },
];

const PAGES = [ALL_ANIMALS.slice(0, 6), ALL_ANIMALS.slice(6, 12)];

/* ─── 개별 동물 카드 ──────────────────────────────── */
function AnimalCard({ animal, soundMode, isLooping, onPress }) {
  const controls = useAnimation();

  const handlePointerDown = useCallback(async (e) => {
    e.preventDefault();
    controls.start({ scaleX: 0.82, scaleY: 1.18, transition: { duration: 0.07 } })
      .then(() => controls.start({
        scaleX: 1, scaleY: 1,
        transition: { type: 'spring', stiffness: 600, damping: 14 },
      }));
    onPress(animal.id);
    vibrate([45]);
  }, [controls, animal.id, onPress]);

  return (
    <motion.div animate={controls} className="w-full h-full" style={{ transformOrigin: 'bottom center' }}>
      <motion.button
        className={`relative w-full h-full rounded-3xl cursor-pointer
          bg-gradient-to-br ${animal.bg}
          flex flex-col items-center justify-center gap-2
          border-4 border-white/40 overflow-hidden focus:outline-none`}
        animate={isLooping
          ? { boxShadow: [`0 0 18px 4px ${animal.shadow}`, `0 0 45px 18px ${animal.shadow}`, `0 0 18px 4px ${animal.shadow}`] }
          : { boxShadow: '0 8px 24px rgba(0,0,0,0.22)' }}
        transition={isLooping ? { duration: 0.9, repeat: Infinity } : {}}
        onPointerDown={handlePointerDown}
        style={{ touchAction: 'none' }}
      >
        {isLooping && (
          <motion.div
            className="absolute inset-0 bg-white/25 rounded-3xl pointer-events-none"
            animate={{ opacity: [0.1, 0.35, 0.1] }}
            transition={{ duration: 0.9, repeat: Infinity }}
          />
        )}
        <motion.span
          className="text-6xl md:text-7xl xl:text-8xl leading-none select-none"
          animate={isLooping ? { y: [0, -10, 0] } : { y: 0 }}
          transition={isLooping ? { duration: 0.5, repeat: Infinity } : {}}
        >
          {animal.emoji}
        </motion.span>
        <span className="text-white font-black text-xl md:text-2xl drop-shadow-lg pointer-events-none">
          {animal.name}
        </span>
        {isLooping && (
          <motion.div
            className="absolute top-3 right-3 w-4 h-4 bg-white rounded-full shadow-md"
            animate={{ scale: [1, 1.6, 1] }}
            transition={{ duration: 0.5, repeat: Infinity }}
          />
        )}
      </motion.button>
    </motion.div>
  );
}

/* ─── SafariBoard 메인 ────────────────────────────── */
export default function SafariBoard({ soundMode, childName, onAnimalBeat }) {
  const [page, setPage] = useState(0);
  const [direction, setDirection] = useState(1); // 1=앞으로, -1=뒤로
  const [activeLoops, setActiveLoops] = useState(new Set());
  const [loopEnabled, setLoopEnabled] = useState(false);
  const soundModeRef = useRef(soundMode);
  const pointerStartX = useRef(0);

  useEffect(() => { soundModeRef.current = soundMode; }, [soundMode]);

  useEffect(() => { onAnimalBeat(activeLoops.size); }, [activeLoops.size, onAnimalBeat]);

  // soundMode 변경 시 활성 루프 재시작
  useEffect(() => {
    setActiveLoops((prev) => {
      prev.forEach((id) => { stopAnimalLoop(id); startAnimalLoop(id, soundMode); });
      return new Set(prev);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soundMode]);

  useEffect(() => () => stopAllLoops(), []);

  const goToPage = useCallback((newPage) => {
    setDirection(newPage > page ? 1 : -1);
    setPage(newPage);
  }, [page]);

  const handlePointerDown = (e) => { pointerStartX.current = e.clientX; };
  const handlePointerUp = (e) => {
    const dx = e.clientX - pointerStartX.current;
    if (dx < -50 && page < 1) goToPage(1);
    if (dx > 50 && page > 0) goToPage(0);
  };

  const handleAnimalPress = useCallback((animalId) => {
    if (loopEnabled) {
      setActiveLoops((prev) => {
        const next = new Set(prev);
        if (next.has(animalId)) { stopAnimalLoop(animalId); next.delete(animalId); }
        else { startAnimalLoop(animalId, soundModeRef.current); next.add(animalId); }
        return next;
      });
    } else {
      playAnimalSound(animalId, soundModeRef.current);
    }
  }, [loopEnabled]);

  const handleLoopToggle = () => {
    if (loopEnabled) { stopAllLoops(); setActiveLoops(new Set()); }
    setLoopEnabled((prev) => !prev);
  };

  return (
    <div className="h-full flex flex-col p-3 gap-2 safari-bg">

      {/* ── 페이지 인디케이터 + 화살표 ── */}
      <div className="flex-shrink-0 flex items-center justify-center gap-4">
        <motion.button
          onClick={() => goToPage(0)}
          className={`text-xl font-black transition-opacity ${page === 0 ? 'opacity-20 cursor-default' : 'opacity-80'}`}
          whileTap={page > 0 ? { scale: 0.85 } : {}}
          disabled={page === 0}
        >
          ◀
        </motion.button>

        <div className="flex gap-2 items-center">
          {[0, 1].map((i) => (
            <motion.button
              key={i}
              onClick={() => goToPage(i)}
              className={`rounded-full transition-all ${i === page ? 'w-6 h-3 bg-purple-600' : 'w-3 h-3 bg-purple-300'}`}
              whileTap={{ scale: 0.85 }}
            />
          ))}
        </div>

        <motion.button
          onClick={() => goToPage(1)}
          className={`text-xl font-black transition-opacity ${page === 1 ? 'opacity-20 cursor-default' : 'opacity-80'}`}
          whileTap={page < 1 ? { scale: 0.85 } : {}}
          disabled={page === 1}
        >
          ▶
        </motion.button>

        <span className="text-sm font-bold text-purple-700 ml-2">
          {page === 0 ? '🦁 1페이지' : '🐯 2페이지'}
        </span>
      </div>

      {/* ── 스와이프 가능한 그리드 영역 ── */}
      <div
        className="flex-1 relative overflow-hidden min-h-0"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      >
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={page}
            custom={direction}
            className="absolute inset-0 grid grid-cols-3 grid-rows-2 gap-3"
            initial={{ x: direction * 100 + '%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: direction * -100 + '%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          >
            {PAGES[page].map((animal) => (
              <AnimalCard
                key={animal.id}
                animal={animal}
                soundMode={soundMode}
                isLooping={activeLoops.has(animal.id)}
                onPress={handleAnimalPress}
              />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── 루프 컨트롤 바 ── */}
      <div className="flex-shrink-0 flex items-center justify-center gap-4 bg-white/60 rounded-2xl py-3 px-5 backdrop-blur-sm shadow-inner">
        <span className="text-2xl select-none">{loopEnabled ? '🎶' : '🎵'}</span>

        <p className="font-black text-purple-800 text-base md:text-lg leading-tight">
          {loopEnabled
            ? activeLoops.size > 0
              ? `${activeLoops.size}마리가 노래 중!`
              : '동물을 눌러 비트를 만들어요!'
            : '루프 모드 OFF — 누르면 소리가 나요'}
        </p>

        <motion.button
          onClick={handleLoopToggle}
          className={`relative flex-shrink-0 w-16 h-8 rounded-full transition-colors duration-300 ${loopEnabled ? 'bg-purple-500' : 'bg-gray-300'}`}
          whileTap={{ scale: 0.92 }}
        >
          <motion.div
            className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-md"
            animate={{ left: loopEnabled ? '34px' : '4px' }}
            transition={{ type: 'spring', stiffness: 600, damping: 30 }}
          />
        </motion.button>

        {loopEnabled && activeLoops.size > 0 && (
          <motion.div className="flex gap-1" initial={{ scale: 0 }} animate={{ scale: 1 }}>
            {Array.from(activeLoops).map((id) => {
              const a = ALL_ANIMALS.find((x) => x.id === id);
              return (
                <motion.span key={id} className="text-2xl"
                  animate={{ rotate: [-5, 5, -5] }}
                  transition={{ duration: 0.4, repeat: Infinity }}>
                  {a?.emoji}
                </motion.span>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}
