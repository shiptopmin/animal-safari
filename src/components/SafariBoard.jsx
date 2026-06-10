import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';
import {
  playAnimalSound,
  startAnimalLoop,
  stopAnimalLoop,
  stopAllLoops,
  vibrate,
} from '../utils/SoundEngine';

/* ─── 동물 데이터 ─────────────────────────────────── */
const ANIMALS = [
  {
    id: 'lion',
    emoji: '🦁',
    name: '사자',
    bg: 'from-orange-400 to-amber-500',
    shadow: 'rgba(251,146,60,0.7)',
    ring: 'ring-orange-300',
  },
  {
    id: 'monkey',
    emoji: '🐒',
    name: '원숭이',
    bg: 'from-amber-600 to-yellow-700',
    shadow: 'rgba(180,83,9,0.7)',
    ring: 'ring-amber-300',
  },
  {
    id: 'elephant',
    emoji: '🐘',
    name: '코끼리',
    bg: 'from-sky-400 to-slate-500',
    shadow: 'rgba(56,189,248,0.7)',
    ring: 'ring-sky-300',
  },
  {
    id: 'frog',
    emoji: '🐸',
    name: '개구리',
    bg: 'from-green-400 to-emerald-600',
    shadow: 'rgba(74,222,128,0.7)',
    ring: 'ring-green-300',
  },
  {
    id: 'duck',
    emoji: '🦆',
    name: '오리',
    bg: 'from-yellow-300 to-amber-400',
    shadow: 'rgba(253,224,71,0.7)',
    ring: 'ring-yellow-200',
  },
  {
    id: 'chick',
    emoji: '🐥',
    name: '병아리',
    bg: 'from-yellow-100 to-lime-300',
    shadow: 'rgba(190,242,100,0.7)',
    ring: 'ring-lime-200',
  },
];

/* ─── 개별 동물 카드 ──────────────────────────────── */
function AnimalCard({ animal, soundMode, isLooping, onPress }) {
  const controls = useAnimation();
  const cardRef = useRef(null);

  const handlePointerDown = useCallback(async (e) => {
    e.preventDefault();

    // 찌그러졌다가 펴지는 젤리(Squish) 애니메이션
    controls.start({
      scaleX: 0.82,
      scaleY: 1.18,
      transition: { duration: 0.07, ease: 'easeOut' },
    }).then(() => {
      controls.start({
        scaleX: 1,
        scaleY: 1,
        transition: { type: 'spring', stiffness: 600, damping: 14 },
      });
    });

    onPress(animal.id);
    vibrate([45]);
  }, [controls, animal.id, onPress]);

  return (
    <motion.div
      ref={cardRef}
      animate={controls}
      className="w-full h-full"
      style={{ transformOrigin: 'bottom center' }}
    >
      <motion.button
        className={`
          relative w-full h-full rounded-3xl cursor-pointer
          bg-gradient-to-br ${animal.bg}
          flex flex-col items-center justify-center gap-2
          border-4 border-white/40 overflow-hidden
          focus:outline-none
        `}
        animate={
          isLooping
            ? {
                boxShadow: [
                  `0 0 18px 4px ${animal.shadow}`,
                  `0 0 45px 18px ${animal.shadow}`,
                  `0 0 18px 4px ${animal.shadow}`,
                ],
              }
            : { boxShadow: '0 8px 24px rgba(0,0,0,0.22)' }
        }
        transition={isLooping ? { duration: 0.9, repeat: Infinity } : {}}
        onPointerDown={handlePointerDown}
        style={{ touchAction: 'none' }}
      >
        {/* 루프 중 흰빛 오버레이 */}
        {isLooping && (
          <motion.div
            className="absolute inset-0 bg-white/25 rounded-3xl pointer-events-none"
            animate={{ opacity: [0.1, 0.35, 0.1] }}
            transition={{ duration: 0.9, repeat: Infinity }}
          />
        )}

        {/* 동물 이모지 */}
        <motion.span
          className="text-6xl md:text-7xl xl:text-8xl leading-none select-none"
          animate={isLooping ? { y: [0, -10, 0] } : { y: 0 }}
          transition={isLooping ? { duration: 0.5, repeat: Infinity } : {}}
        >
          {animal.emoji}
        </motion.span>

        {/* 동물 이름 */}
        <span className="text-white font-black text-xl md:text-2xl drop-shadow-lg pointer-events-none">
          {animal.name}
        </span>

        {/* 루프 표시 점 */}
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

/* ─── SafariBoard 메인 컴포넌트 ──────────────────── */
export default function SafariBoard({ soundMode, childName, onAnimalBeat }) {
  const [activeLoops, setActiveLoops] = useState(new Set());
  const [loopEnabled, setLoopEnabled] = useState(false);
  // soundMode 변경 시 루프 재시작에 사용할 ref
  const soundModeRef = useRef(soundMode);

  useEffect(() => {
    soundModeRef.current = soundMode;
  }, [soundMode]);

  // 활성 루프 수를 부모에 알림 (칭찬 트리거용)
  useEffect(() => {
    onAnimalBeat(activeLoops.size);
  }, [activeLoops.size, onAnimalBeat]);

  // soundMode 변경 시 활성 루프 모두 새 모드로 재시작
  useEffect(() => {
    setActiveLoops((prev) => {
      prev.forEach((id) => {
        stopAnimalLoop(id);
        startAnimalLoop(id, soundMode);
      });
      return new Set(prev);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soundMode]);

  // 언마운트 시 모든 루프 정지
  useEffect(() => () => stopAllLoops(), []);

  const handleAnimalPress = useCallback((animalId) => {
    if (loopEnabled) {
      setActiveLoops((prev) => {
        const next = new Set(prev);
        if (next.has(animalId)) {
          stopAnimalLoop(animalId);
          next.delete(animalId);
        } else {
          startAnimalLoop(animalId, soundModeRef.current);
          next.add(animalId);
        }
        return next;
      });
    } else {
      playAnimalSound(animalId, soundModeRef.current);
    }
  }, [loopEnabled]);

  const handleLoopToggle = () => {
    if (loopEnabled) {
      stopAllLoops();
      setActiveLoops(new Set());
    }
    setLoopEnabled((prev) => !prev);
  };

  return (
    <div className="h-full flex flex-col p-3 gap-2 safari-bg">
      {/* 동물 카드 그리드 (3열 2행) */}
      <div className="flex-1 grid grid-cols-3 grid-rows-2 gap-3 min-h-0">
        {ANIMALS.map((animal) => (
          <AnimalCard
            key={animal.id}
            animal={animal}
            soundMode={soundMode}
            isLooping={activeLoops.has(animal.id)}
            onPress={handleAnimalPress}
          />
        ))}
      </div>

      {/* 루프 컨트롤 바 */}
      <div className="flex-shrink-0 flex items-center justify-center gap-4 bg-white/60 rounded-2xl py-3 px-5 backdrop-blur-sm shadow-inner">
        <span className="text-2xl select-none">{loopEnabled ? '🎶' : '🎵'}</span>

        <p className="font-black text-purple-800 text-base md:text-lg leading-tight">
          {loopEnabled
            ? activeLoops.size > 0
              ? `${activeLoops.size}마리가 노래 중이에요!`
              : '동물을 눌러 비트를 만들어요!'
            : '루프 모드 OFF — 누르면 소리가 나요'}
        </p>

        {/* 루프 토글 스위치 */}
        <motion.button
          onClick={handleLoopToggle}
          className={`relative flex-shrink-0 w-16 h-8 rounded-full transition-colors duration-300 ${
            loopEnabled ? 'bg-purple-500' : 'bg-gray-300'
          }`}
          whileTap={{ scale: 0.92 }}
        >
          <motion.div
            className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-md"
            animate={{ left: loopEnabled ? '34px' : '4px' }}
            transition={{ type: 'spring', stiffness: 600, damping: 30 }}
          />
        </motion.button>

        {/* 활성 루프 동물 미리보기 이모지 */}
        {loopEnabled && activeLoops.size > 0 && (
          <motion.div
            className="flex gap-1"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400 }}
          >
            {Array.from(activeLoops).map((id) => {
              const a = ANIMALS.find((x) => x.id === id);
              return (
                <motion.span
                  key={id}
                  className="text-2xl"
                  animate={{ rotate: [-5, 5, -5] }}
                  transition={{ duration: 0.4, repeat: Infinity }}
                >
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
