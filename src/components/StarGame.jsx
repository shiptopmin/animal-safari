import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playPopSound, playCountSound, vibrate } from '../utils/SoundEngine';

/* ─── 게임 상수 ───────────────────────────────────── */
const OBJECT_LIFETIME = 1500;  // 오브젝트 생존 시간 (ms)
const SPAWN_INTERVAL  = 750;   // 스폰 간격 (ms)
const MAX_OBJECTS     = 8;     // 화면 최대 오브젝트 수
const MAX_SCORE       = 20;    // 하트 게이지 만점
const HEART_COUNT     = 10;    // 하트 게이지 칸 수

/* ─── 오브젝트 종류 ───────────────────────────────── */
const OBJ_TYPES = [
  { type: 'star',     emoji: '⭐', points: 1, minSize: 62, maxSize: 92  },
  { type: 'heart',    emoji: '❤️', points: 1, minSize: 58, maxSize: 82  },
  { type: 'banana',   emoji: '🍌', points: 2, minSize: 52, maxSize: 74  },
  { type: 'rainbow',  emoji: '🌈', points: 3, minSize: 72, maxSize: 104 },
];

/* ─── 파티클 색상 ─────────────────────────────────── */
const PARTICLE_COLORS = {
  star:    ['#FFD700', '#FFA500', '#FF6347', '#FFFACD'],
  heart:   ['#FF69B4', '#FF1493', '#FFB6C1', '#FF4081'],
  banana:  ['#FFD700', '#32CD32', '#FFF44F', '#ADFF2F'],
  rainbow: ['#FF0000', '#FF7F00', '#FFFF00', '#00FF7F', '#00BFFF', '#BF00FF'],
};

/* ─── 파티클 컴포넌트 ─────────────────────────────── */
function Particle({ x, y, color, angle }) {
  const dx = Math.cos((angle * Math.PI) / 180) * (80 + Math.random() * 40);
  const dy = Math.sin((angle * Math.PI) / 180) * (80 + Math.random() * 40);

  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        left: `${x}%`,
        top:  `${y}%`,
        width:  12,
        height: 12,
        backgroundColor: color,
        zIndex: 30,
      }}
      initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
      animate={{ x: dx, y: dy, opacity: 0, scale: 0 }}
      transition={{ duration: 0.55, ease: 'easeOut' }}
    />
  );
}

/* ─── StarGame 메인 컴포넌트 ─────────────────────── */
export default function StarGame({ childName, onStarCaught }) {
  const [objects,   setObjects]   = useState([]);
  const [score,     setScore]     = useState(0);
  const [particles, setParticles] = useState([]);

  // 클로저 문제를 피하기 위해 최신 값을 ref로 유지
  const scoreRef   = useRef(0);
  const objectsRef = useRef([]);

  useEffect(() => { scoreRef.current = score; },   [score]);
  useEffect(() => { objectsRef.current = objects; }, [objects]);

  /* ─── 장식용 배경 별 (한 번만 생성) ──────────────── */
  const bgStars = useMemo(
    () =>
      Array.from({ length: 35 }, (_, i) => ({
        id:       i,
        size:     1.5 + Math.random() * 3,
        x:        Math.random() * 100,
        y:        Math.random() * 100,
        delay:    Math.random() * 2.5,
        duration: 1.0 + Math.random() * 2,
      })),
    []
  );

  /* ─── 오브젝트 스폰 루프 ─────────────────────────── */
  useEffect(() => {
    const interval = setInterval(() => {
      if (objectsRef.current.length >= MAX_OBJECTS) return;
      if (scoreRef.current >= MAX_SCORE) return;

      const def = OBJ_TYPES[Math.floor(Math.random() * OBJ_TYPES.length)];
      const size = def.minSize + Math.random() * (def.maxSize - def.minSize);
      const id = Date.now() + Math.random();

      const obj = {
        id,
        type:   def.type,
        emoji:  def.emoji,
        points: def.points,
        size,
        x: 6 + Math.random() * 86,   // % (화면 좌우 여백 확보)
        y: 10 + Math.random() * 72,  // % (상단 게이지 아래부터)
      };

      setObjects((prev) => [...prev, obj]);

      // 수명이 다하면 자동 제거
      setTimeout(() => {
        setObjects((prev) => prev.filter((o) => o.id !== id));
      }, OBJECT_LIFETIME);
    }, SPAWN_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  /* ─── 오브젝트 터치 핸들러 ───────────────────────── */
  const handleTap = useCallback((obj) => {
    setObjects((prev) => prev.filter((o) => o.id !== obj.id));

    const newScore = Math.min(scoreRef.current + obj.points, MAX_SCORE);
    setScore(newScore);
    scoreRef.current = newScore;

    // 소리 + 진동
    playCountSound(newScore);
    vibrate([35]);

    // 파티클 생성 (8~12개)
    const colors = PARTICLE_COLORS[obj.type] ?? PARTICLE_COLORS.star;
    const count  = 8 + Math.floor(Math.random() * 5);
    const burst  = Array.from({ length: count }, (_, i) => ({
      id:    `${obj.id}-${i}`,
      x:     obj.x,
      y:     obj.y,
      angle: (i / count) * 360 + Math.random() * 15,
      color: colors[i % colors.length],
    }));
    setParticles((prev) => [...prev, ...burst]);
    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => !burst.some((b) => b.id === p.id)));
    }, 650);

    onStarCaught(newScore);
  }, [onStarCaught]);

  /* ─── 게임 리셋 ──────────────────────────────────── */
  const handleReset = () => {
    setScore(0);
    scoreRef.current = 0;
    setObjects([]);
    setParticles([]);
  };

  const filledHearts = Math.round((score / MAX_SCORE) * HEART_COUNT);

  return (
    <div className="h-full relative overflow-hidden night-bg">

      {/* 장식 배경 별 */}
      {bgStars.map((s) => (
        <div
          key={s.id}
          className="absolute rounded-full bg-white animate-twinkle"
          style={{
            width:             s.size,
            height:            s.size,
            left:              `${s.x}%`,
            top:               `${s.y}%`,
            animationDelay:    `${s.delay}s`,
            animationDuration: `${s.duration}s`,
            pointerEvents:     'none',
          }}
        />
      ))}

      {/* ─── 하트 게이지 (상단 중앙) ─────────────── */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1">
        <div className="flex gap-1 bg-black/40 rounded-full px-5 py-2 shadow-lg">
          {Array.from({ length: HEART_COUNT }, (_, i) => (
            <motion.span
              key={i}
              className="text-xl md:text-2xl leading-none select-none"
              animate={i < filledHearts ? { scale: [1, 1.5, 1] } : {}}
              transition={{ duration: 0.3 }}
            >
              {i < filledHearts ? '❤️' : '🤍'}
            </motion.span>
          ))}
        </div>
        <span className="text-white/70 text-xs font-bold">
          {score >= MAX_SCORE ? '🎉 완성!' : `${score} / ${MAX_SCORE}`}
        </span>
      </div>

      {/* ─── 게임 오브젝트 ───────────────────────── */}
      <AnimatePresence>
        {objects.map((obj) => (
          <motion.button
            key={obj.id}
            className="absolute flex items-center justify-center rounded-full cursor-pointer
                       bg-white/10 backdrop-blur-sm border-2 border-white/25 overflow-hidden
                       focus:outline-none"
            style={{
              left:      `${obj.x}%`,
              top:       `${obj.y}%`,
              width:     obj.size,
              height:    obj.size,
              fontSize:  obj.size * 0.55,
              transform: 'translate(-50%, -50%)',
              zIndex:    20,
              touchAction: 'none',
            }}
            initial={{ scale: 0, rotate: -25 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 450, damping: 22 }}
            onPointerDown={(e) => { e.preventDefault(); handleTap(obj); }}
            whileTap={{ scale: 1.35 }}
          >
            <span className="select-none leading-none">{obj.emoji}</span>

            {/* 카운트다운 SVG 링 */}
            <svg
              className="absolute inset-0 w-full h-full"
              viewBox="0 0 100 100"
              style={{ transform: 'rotate(-90deg)', pointerEvents: 'none' }}
            >
              <motion.circle
                cx="50" cy="50" r="47"
                fill="none"
                stroke="rgba(255,255,255,0.45)"
                strokeWidth="4"
                strokeLinecap="round"
                pathLength={1}
                initial={{ pathLength: 1 }}
                animate={{ pathLength: 0 }}
                transition={{ duration: OBJECT_LIFETIME / 1000, ease: 'linear' }}
              />
            </svg>
          </motion.button>
        ))}
      </AnimatePresence>

      {/* 파티클 */}
      {particles.map((p) => (
        <Particle key={p.id} {...p} />
      ))}

      {/* ─── 힌트 텍스트 (오브젝트 없을 때) ─────── */}
      <AnimatePresence>
        {objects.length === 0 && score < MAX_SCORE && (
          <motion.p
            className="absolute inset-0 flex items-center justify-center text-white/40 text-2xl font-black pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            ✨ 별이 나타날 때까지 기다려요!
          </motion.p>
        )}
      </AnimatePresence>

      {/* ─── 클리어 화면 ──────────────────────────── */}
      <AnimatePresence>
        {score >= MAX_SCORE && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center z-40"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div
              className="bg-white rounded-3xl p-10 text-center shadow-2xl flex flex-col items-center gap-4"
              initial={{ scale: 0, rotate: -8 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 280, damping: 18 }}
            >
              <motion.span
                className="text-8xl"
                animate={{ rotate: [0, -10, 10, -8, 0], scale: [1, 1.15, 1] }}
                transition={{ duration: 0.7, repeat: Infinity, repeatDelay: 1.5 }}
              >
                🏆
              </motion.span>
              <h2 className="text-4xl font-black text-purple-800">
                {childName}아, 최고야!
              </h2>
              <p className="text-xl text-gray-500">별을 모두 잡았어! 🌟</p>
              <div className="flex gap-1">
                {['⭐', '⭐', '⭐'].map((s, i) => (
                  <motion.span
                    key={i}
                    className="text-4xl"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3 + i * 0.12, type: 'spring' }}
                  >
                    {s}
                  </motion.span>
                ))}
              </div>
              <motion.button
                onClick={handleReset}
                className="mt-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-black text-2xl px-10 py-4 rounded-2xl shadow-lg"
                whileTap={{ scale: 0.93 }}
              >
                다시 하기! 🎮
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
