import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  playPopSound, playCountSound, playComboSound,
  playEnemyHitSound, playBossHitSound, playBeatSound,
  vibrate,
} from '../utils/SoundEngine';

/* ─── 스테이지 설정 ──────────────────────────────── */
const STAGES = [
  { id: 1, label: '1단계', theme: '⭐',  scoreGoal: 15, spawnMs: 950, maxObj: 7,  speed: 0,   enemyRate: 0,   comboOn: false, hasBoss: false,
    bg: 'radial-gradient(ellipse at top, #1a0533 0%, #0d1b4f 60%, #050a1a 100%)' },
  { id: 2, label: '2단계', theme: '✨',  scoreGoal: 20, spawnMs: 700, maxObj: 8,  speed: 0,   enemyRate: 0,   comboOn: true,  hasBoss: false,
    bg: 'radial-gradient(ellipse at top, #1a0533 0%, #1b0d4f 60%, #0a0520 100%)' },
  { id: 3, label: '3단계', theme: '🚀', scoreGoal: 25, spawnMs: 520, maxObj: 9,  speed: 0.9, enemyRate: 0.2, comboOn: true,  hasBoss: false,
    bg: 'radial-gradient(ellipse at top, #0a2033 0%, #0a1a2f 60%, #050a15 100%)' },
  { id: 4, label: '🔥 보스', theme: '🔥', scoreGoal: 99, spawnMs: 500, maxObj: 8,  speed: 1.2, enemyRate: 0.25, comboOn: true, hasBoss: true,
    bg: 'radial-gradient(ellipse at top, #330a0a 0%, #1a0808 60%, #0a0000 100%)' },
];
const OBJECT_LIFETIME = 1600;
const MOVE_TICK_MS    = 42;    // ~24fps
const BPM             = 120;
const BEAT_MS         = (60 / BPM) * 1000; // 500ms
const BOSS_HP_MAX     = 6;
const MAX_HEARTS      = 5;

/* ─── 오브젝트 종류 ──────────────────────────────── */
const GOOD_OBJS = [
  { type: 'star',    emoji: '⭐', pts: 1, minSize: 62, maxSize: 92  },
  { type: 'heart',   emoji: '❤️', pts: 1, minSize: 58, maxSize: 82  },
  { type: 'banana',  emoji: '🍌', pts: 2, minSize: 52, maxSize: 74  },
  { type: 'rainbow', emoji: '🌈', pts: 3, minSize: 72, maxSize: 104 },
];
const ENEMY_OBJS = [
  { type: 'bug',  emoji: '🐛', pts: -1, minSize: 52, maxSize: 70 },
  { type: 'bomb', emoji: '💣', pts: -2, minSize: 52, maxSize: 68 },
];
const PARTICLE_COLORS = {
  star:    ['#FFD700','#FFA500','#FF6347','#FFFACD'],
  heart:   ['#FF69B4','#FF1493','#FFB6C1','#FF4081'],
  banana:  ['#FFD700','#32CD32','#FFF44F','#ADFF2F'],
  rainbow: ['#FF0000','#FF7F00','#FFFF00','#00FF7F','#00BFFF','#BF00FF'],
  bug:     ['#8B4513','#A0522D','#D2691E'],
  bomb:    ['#333','#555','#777'],
};

/* ─── 헬퍼 ───────────────────────────────────────── */
function makeId() { return Date.now() + Math.random(); }
function rand(min, max) { return min + Math.random() * (max - min); }

/* ─── 파티클 ─────────────────────────────────────── */
function Particle({ x, y, color, angle }) {
  const dx = Math.cos((angle * Math.PI) / 180) * rand(70, 120);
  const dy = Math.sin((angle * Math.PI) / 180) * rand(70, 120);
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{ left: `${x}%`, top: `${y}%`, width: 12, height: 12, backgroundColor: color, zIndex: 30 }}
      initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
      animate={{ x: dx, y: dy, opacity: 0, scale: 0 }}
      transition={{ duration: 0.55, ease: 'easeOut' }}
    />
  );
}

/* ─── 떠오르는 점수/피드백 텍스트 ───────────────── */
function FloatingText({ x, y, text, color }) {
  return (
    <motion.div
      className="absolute pointer-events-none font-black text-2xl z-30 drop-shadow-lg"
      style={{ left: `${x}%`, top: `${y}%`, color, transform: 'translate(-50%,-50%)' }}
      initial={{ y: 0, opacity: 1, scale: 0.8 }}
      animate={{ y: -70, opacity: 0, scale: 1.3 }}
      transition={{ duration: 0.85, ease: 'easeOut' }}
    >
      {text}
    </motion.div>
  );
}

/* ─── StarGame 메인 ──────────────────────────────── */
export default function StarGame({ childName, onStarCaught }) {
  const [subMode,      setSubMode]      = useState('stage'); // 'stage' | 'rhythm'
  const [stage,        setStage]        = useState(1);
  const [stageScore,   setStageScore]   = useState(0);
  const [hearts,       setHearts]       = useState(MAX_HEARTS);
  const [combo,        setCombo]        = useState(0);
  const [objects,      setObjects]      = useState([]);
  const [particles,    setParticles]    = useState([]);
  const [floatTexts,   setFloatTexts]   = useState([]);
  const [boss,         setBoss]         = useState(null);
  const [bossFlash,    setBossFlash]    = useState(false);
  const [screenFlash,  setScreenFlash]  = useState(null); // 'red' | 'white' | null
  const [gameState,    setGameState]    = useState('playing'); // 'playing'|'stageClear'|'allClear'|'gameOver'
  const [onBeat,       setOnBeat]       = useState(false);

  // Refs (최신 값 동기화용)
  const stageRef       = useRef(1);
  const stageScoreRef  = useRef(0);
  const heartsRef      = useRef(MAX_HEARTS);
  const comboRef       = useRef(0);
  const lastCatchTime  = useRef(0);
  const objectsRef     = useRef([]);
  const gameStateRef   = useRef('playing');
  const subModeRef     = useRef('stage');

  // Interval refs
  const spawnRef       = useRef(null);
  const moveRef        = useRef(null);
  const bossRef        = useRef(null);
  const beatRef        = useRef(null);

  useEffect(() => { stageRef.current = stage; },           [stage]);
  useEffect(() => { stageScoreRef.current = stageScore; }, [stageScore]);
  useEffect(() => { heartsRef.current = hearts; },         [hearts]);
  useEffect(() => { comboRef.current = combo; },           [combo]);
  useEffect(() => { objectsRef.current = objects; },       [objects]);
  useEffect(() => { gameStateRef.current = gameState; },   [gameState]);
  useEffect(() => { subModeRef.current = subMode; },       [subMode]);

  /* ─── 인터벌 전체 정리 ────────────────────────── */
  const clearAllIntervals = useCallback(() => {
    [spawnRef, moveRef, bossRef, beatRef].forEach((r) => {
      if (r.current) { clearInterval(r.current); r.current = null; }
    });
  }, []);

  /* ─── 파티클 버스트 ───────────────────────────── */
  const burstParticles = useCallback((x, y, type) => {
    const colors = PARTICLE_COLORS[type] ?? PARTICLE_COLORS.star;
    const count  = 8 + Math.floor(Math.random() * 5);
    const burst  = Array.from({ length: count }, (_, i) => ({
      id: makeId(), x, y,
      angle: (i / count) * 360 + rand(0, 15),
      color: colors[i % colors.length],
    }));
    setParticles((p) => [...p, ...burst]);
    setTimeout(() => setParticles((p) => p.filter((pt) => !burst.some((b) => b.id === pt.id))), 700);
  }, []);

  /* ─── 떠오르는 텍스트 추가 ───────────────────── */
  const addFloat = useCallback((x, y, text, color) => {
    const id = makeId();
    setFloatTexts((p) => [...p, { id, x, y, text, color }]);
    setTimeout(() => setFloatTexts((p) => p.filter((t) => t.id !== id)), 950);
  }, []);

  /* ─── 화면 플래시 ─────────────────────────────── */
  const flash = useCallback((color) => {
    setScreenFlash(color);
    setTimeout(() => setScreenFlash(null), 180);
  }, []);

  /* ─── 스테이지 클리어 ────────────────────────── */
  const handleStageClear = useCallback(() => {
    if (gameStateRef.current !== 'playing') return;
    setGameState('stageClear');
    gameStateRef.current = 'stageClear';
    clearAllIntervals();
    setObjects([]);
    setBoss(null);
    flash('white');

    setTimeout(() => {
      if (stageRef.current >= 4) {
        setGameState('allClear');
        gameStateRef.current = 'allClear';
      } else {
        const nextStage = stageRef.current + 1;
        setStage(nextStage);
        stageRef.current = nextStage;
        setStageScore(0);
        stageScoreRef.current = 0;
        setCombo(0);
        comboRef.current = 0;
        setGameState('playing');
        gameStateRef.current = 'playing';
      }
    }, 2500);
  }, [clearAllIntervals, flash]);

  /* ─── 게임 오버 ───────────────────────────────── */
  const handleGameOver = useCallback(() => {
    setGameState('gameOver');
    gameStateRef.current = 'gameOver';
    clearAllIntervals();
    setObjects([]);
    setBoss(null);
    flash('red');
  }, [clearAllIntervals, flash]);

  /* ─── 오브젝트 터치 ───────────────────────────── */
  const handleTap = useCallback((obj) => {
    if (gameStateRef.current !== 'playing') return;
    setObjects((p) => p.filter((o) => o.id !== obj.id));

    // 적 처리
    if (obj.isEnemy) {
      const newHearts = Math.max(heartsRef.current + obj.pts, 0);
      setHearts(newHearts);
      heartsRef.current = newHearts;
      playEnemyHitSound();
      vibrate([80, 40, 80]);
      flash('red');
      addFloat(obj.x, obj.y, obj.type === 'bomb' ? '💥 -2!' : '🐛 아야!', '#FF4444');
      if (newHearts <= 0) handleGameOver();
      return;
    }

    // 콤보 계산
    const now = Date.now();
    const timeDiff = now - lastCatchTime.current;
    lastCatchTime.current = now;
    let newCombo = timeDiff < 1400 ? comboRef.current + 1 : 1;
    setCombo(newCombo);
    comboRef.current = newCombo;

    const multiplier = newCombo >= 5 ? 3 : newCombo >= 3 ? 2 : 1;
    const earned = obj.pts * multiplier;

    // 점수 업데이트
    const newStageScore = stageScoreRef.current + earned;
    setStageScore(newStageScore);
    stageScoreRef.current = newStageScore;

    // 사운드 & 진동
    if (newCombo >= 2) { playComboSound(newCombo); vibrate([20, 10, 30]); }
    else { playCountSound(newStageScore); vibrate([35]); }

    // 파티클 & 플로팅 텍스트
    burstParticles(obj.x, obj.y, obj.type);
    if (multiplier > 1) addFloat(obj.x, obj.y - 5, `x${multiplier} 콤보!`, '#FFD700');
    else addFloat(obj.x, obj.y - 5, `+${earned}`, '#FFFFFF');

    flash('white');
    onStarCaught(newStageScore);

    // 스테이지 클리어 확인
    const cfg = STAGES[stageRef.current - 1];
    if (!cfg.hasBoss && newStageScore >= cfg.scoreGoal) handleStageClear();
  }, [burstParticles, addFloat, flash, handleGameOver, handleStageClear, onStarCaught]);

  /* ─── 보스 터치 ───────────────────────────────── */
  const handleBossTap = useCallback(() => {
    if (gameStateRef.current !== 'playing') return;
    setBoss((prev) => {
      if (!prev) return prev;
      playBossHitSound();
      vibrate([60]);
      setBossFlash(true);
      setTimeout(() => setBossFlash(false), 150);
      addFloat(prev.x, prev.y - 8, '💥 타격!', '#FF6600');
      const newHp = prev.hp - 1;
      if (newHp <= 0) {
        burstParticles(prev.x, prev.y, 'rainbow');
        burstParticles(prev.x + 5, prev.y - 5, 'star');
        setTimeout(() => handleStageClear(), 300);
        return null;
      }
      return { ...prev, hp: newHp };
    });
  }, [addFloat, burstParticles, handleStageClear]);

  /* ─── 오브젝트 스폰 ───────────────────────────── */
  const spawnObject = useCallback(() => {
    if (gameStateRef.current !== 'playing') return;
    const cfg = STAGES[stageRef.current - 1];
    if (objectsRef.current.length >= cfg.maxObj) return;

    // 적 등장 여부 결정
    const isEnemy = cfg.enemyRate > 0 && Math.random() < cfg.enemyRate;
    const pool    = isEnemy ? ENEMY_OBJS : GOOD_OBJS;
    const def     = pool[Math.floor(Math.random() * pool.length)];
    const size    = rand(def.minSize, def.maxSize);
    const id      = makeId();

    // 이동 속도 (speed > 0인 스테이지에서만)
    const spd  = cfg.speed;
    const vx   = spd > 0 ? (Math.random() < 0.5 ? 1 : -1) * (spd * rand(0.6, 1.4)) : 0;
    const vy   = spd > 0 ? (Math.random() < 0.5 ? 1 : -1) * (spd * rand(0.6, 1.4)) : 0;

    const obj  = {
      id, type: def.type, emoji: def.emoji, pts: def.pts,
      isEnemy, size,
      x: rand(6, 92), y: rand(14, 84),
      vx, vy,
    };

    setObjects((p) => [...p, obj]);
    // 수명 만료 자동 제거
    setTimeout(() => setObjects((p) => p.filter((o) => o.id !== id)), OBJECT_LIFETIME);
  }, []);

  /* ─── 오브젝트 이동 루프 ──────────────────────── */
  const startMoveLoop = useCallback(() => {
    if (moveRef.current) clearInterval(moveRef.current);
    moveRef.current = setInterval(() => {
      setObjects((prev) =>
        prev.map((obj) => {
          if (!obj.vx && !obj.vy) return obj;
          let { x, y, vx, vy } = obj;
          x += vx; y += vy;
          if (x < 5)  { x = 5;  vx =  Math.abs(vx); }
          if (x > 93) { x = 93; vx = -Math.abs(vx); }
          if (y < 12) { y = 12; vy =  Math.abs(vy); }
          if (y > 86) { y = 86; vy = -Math.abs(vy); }
          return { ...obj, x, y, vx, vy };
        })
      );
    }, MOVE_TICK_MS);
  }, []);

  /* ─── 보스 이동 루프 ──────────────────────────── */
  const startBossLoop = useCallback(() => {
    if (bossRef.current) clearInterval(bossRef.current);
    bossRef.current = setInterval(() => {
      setBoss((prev) => {
        if (!prev) return prev;
        let { x, y, vx, vy } = prev;
        x += vx; y += vy;
        if (x < 10) { x = 10; vx =  Math.abs(vx); }
        if (x > 82) { x = 82; vx = -Math.abs(vx); }
        if (y < 15) { y = 15; vy =  Math.abs(vy); }
        if (y > 78) { y = 78; vy = -Math.abs(vy); }
        return { ...prev, x, y, vx, vy };
      });
    }, MOVE_TICK_MS);
  }, []);

  /* ─── 스테이지/서브모드 변경 시 인터벌 재설정 ── */
  useEffect(() => {
    clearAllIntervals();
    if (gameStateRef.current !== 'playing') return;

    const cfg = STAGES[stage - 1];

    if (subMode === 'stage') {
      // 스폰 인터벌
      spawnRef.current = setInterval(spawnObject, cfg.spawnMs);
      // 이동 (3단계+)
      if (cfg.speed > 0) startMoveLoop();
      // 보스 초기화 (4단계)
      if (cfg.hasBoss && !boss) {
        const initBoss = {
          id: 'boss', hp: BOSS_HP_MAX, maxHp: BOSS_HP_MAX,
          x: 50, y: 45,
          vx: cfg.speed * 1.2, vy: cfg.speed * 0.7,
          size: 130,
        };
        setBoss(initBoss);
        startBossLoop();
      } else if (cfg.hasBoss && boss) {
        startBossLoop();
      }
    } else {
      // 리듬 모드: 비트 루프
      beatRef.current = setInterval(() => {
        setOnBeat(true);
        setTimeout(() => setOnBeat(false), 130);
        playBeatSound();
        // 2비트마다 오브젝트 스폰
        if (Math.random() < 0.6) spawnObject();
      }, BEAT_MS);
    }

    return () => clearAllIntervals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, subMode, gameState]);

  /* ─── 리셋 ───────────────────────────────────── */
  const handleRestart = () => {
    clearAllIntervals();
    setStage(1);       stageRef.current = 1;
    setStageScore(0);  stageScoreRef.current = 0;
    setHearts(MAX_HEARTS); heartsRef.current = MAX_HEARTS;
    setCombo(0);       comboRef.current = 0;
    setObjects([]);
    setParticles([]);
    setFloatTexts([]);
    setBoss(null);
    setGameState('playing'); gameStateRef.current = 'playing';
    lastCatchTime.current = 0;
  };

  /* ─── 서브모드 전환 ───────────────────────────── */
  const handleSubModeSwitch = (mode) => {
    clearAllIntervals();
    setObjects([]);
    setCombo(0); comboRef.current = 0;
    setBoss(null);
    setSubMode(mode);
  };

  /* ─── 배경 별 (장식) ──────────────────────────── */
  const bgStars = useMemo(() =>
    Array.from({ length: 35 }, (_, i) => ({
      id: i, size: 1.5 + Math.random() * 3,
      x: Math.random() * 100, y: Math.random() * 100,
      delay: Math.random() * 2.5, duration: 1 + Math.random() * 2,
    })), []);

  const cfg         = STAGES[stage - 1];
  const filledHearts = hearts;
  const goalPct     = cfg.hasBoss ? null : Math.min(stageScore / cfg.scoreGoal, 1);

  return (
    <div
      className="h-full relative overflow-hidden"
      style={{ background: cfg.bg, transition: 'background 1s ease' }}
    >
      {/* 배경 별 */}
      {bgStars.map((s) => (
        <div key={s.id}
          className="absolute rounded-full bg-white animate-twinkle pointer-events-none"
          style={{ width: s.size, height: s.size, left: `${s.x}%`, top: `${s.y}%`,
            animationDelay: `${s.delay}s`, animationDuration: `${s.duration}s` }}
        />
      ))}

      {/* 리듬 비트 맥박 오버레이 */}
      <AnimatePresence>
        {onBeat && (
          <motion.div
            className="absolute inset-0 bg-white/8 pointer-events-none z-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.08 }}
          />
        )}
      </AnimatePresence>

      {/* 화면 플래시 */}
      <AnimatePresence>
        {screenFlash && (
          <motion.div
            className="absolute inset-0 pointer-events-none z-40"
            style={{ background: screenFlash === 'red' ? 'rgba(255,0,0,0.25)' : 'rgba(255,255,255,0.22)' }}
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          />
        )}
      </AnimatePresence>

      {/* ── HUD 상단 ── */}
      <div className="absolute top-3 left-0 right-0 z-10 flex items-start justify-between px-4 gap-2">

        {/* 서브모드 탭 */}
        <div className="flex bg-black/45 rounded-full p-1 gap-1 flex-shrink-0">
          {[{ id: 'stage', label: '🌟 스테이지' }, { id: 'rhythm', label: '🎵 리듬' }].map((m) => (
            <button key={m.id}
              onClick={() => handleSubModeSwitch(m.id)}
              className={`px-3 py-1 rounded-full text-xs font-black transition-colors whitespace-nowrap ${
                subMode === m.id ? 'bg-white text-purple-800' : 'text-white/75 hover:text-white'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* 스테이지 표시 (스테이지 모드만) */}
        {subMode === 'stage' && (
          <div className="flex flex-col items-center bg-black/40 rounded-2xl px-3 py-1.5 flex-shrink-0">
            <span className="text-white font-black text-sm">{cfg.label} {cfg.theme}</span>
            {/* 진행 바 */}
            {!cfg.hasBoss && (
              <div className="w-20 h-2 bg-white/20 rounded-full mt-1 overflow-hidden">
                <motion.div
                  className="h-full bg-yellow-400 rounded-full"
                  animate={{ width: `${(goalPct ?? 0) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            )}
            {cfg.hasBoss && boss && (
              <span className="text-red-300 text-xs font-bold mt-0.5">
                보스 ❤️ {boss.hp}/{boss.maxHp}
              </span>
            )}
          </div>
        )}

        {/* 하트 게이지 */}
        <div className="flex flex-col items-end gap-1">
          <div className="flex gap-0.5 bg-black/40 rounded-full px-3 py-1.5">
            {Array.from({ length: MAX_HEARTS }, (_, i) => (
              <motion.span key={i} className="text-lg leading-none"
                animate={i < filledHearts ? { scale: [1, 1.3, 1] } : {}}
                transition={{ duration: 0.2 }}>
                {i < filledHearts ? '❤️' : '🖤'}
              </motion.span>
            ))}
          </div>
          {/* 콤보 표시 */}
          <AnimatePresence>
            {combo >= 2 && (
              <motion.div
                className="bg-yellow-400 text-yellow-900 rounded-full px-3 py-0.5 text-xs font-black shadow-lg"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 500 }}
              >
                🔥 {combo} 콤보 {combo >= 5 ? 'x3' : combo >= 3 ? 'x2' : ''}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── 보스 ── */}
      <AnimatePresence>
        {boss && gameState === 'playing' && (
          <motion.button
            className="absolute flex flex-col items-center justify-center cursor-pointer focus:outline-none z-20"
            style={{
              left: `${boss.x}%`, top: `${boss.y}%`,
              width: boss.size, height: boss.size,
              transform: 'translate(-50%,-50%)',
              touchAction: 'none',
            }}
            initial={{ scale: 0 }}
            animate={{ scale: bossFlash ? 1.15 : 1 }}
            transition={{ duration: 0.08 }}
            onPointerDown={(e) => { e.preventDefault(); handleBossTap(); }}
            whileTap={{ scale: 1.25 }}
          >
            {/* 보스 HP 바 */}
            <div className="w-full h-2 bg-black/40 rounded-full mb-1 overflow-hidden">
              <motion.div
                className="h-full bg-red-500 rounded-full"
                animate={{ width: `${(boss.hp / boss.maxHp) * 100}%` }}
                transition={{ duration: 0.2 }}
              />
            </div>
            <motion.span
              className="leading-none select-none"
              style={{ fontSize: boss.size * 0.65 }}
              animate={bossFlash
                ? { filter: 'brightness(3)' }
                : { filter: 'brightness(1)', rotate: [-3, 3, -3, 0] }}
              transition={bossFlash ? { duration: 0.08 } : { duration: 1.5, repeat: Infinity }}
            >
              👾
            </motion.span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── 일반 게임 오브젝트 ── */}
      <AnimatePresence>
        {objects.map((obj) => (
          <motion.button
            key={obj.id}
            className={`absolute flex items-center justify-center rounded-full cursor-pointer
              focus:outline-none z-20
              ${obj.isEnemy ? 'bg-red-900/30 border-2 border-red-400/50' : 'bg-white/10 border-2 border-white/25'}`}
            style={{
              left: `${obj.x}%`, top: `${obj.y}%`,
              width: obj.size, height: obj.size,
              fontSize: obj.size * 0.55,
              transform: 'translate(-50%,-50%)',
              touchAction: 'none',
            }}
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 450, damping: 22 }}
            onPointerDown={(e) => { e.preventDefault(); handleTap(obj); }}
            whileTap={{ scale: 1.3 }}
          >
            <span className="select-none leading-none">{obj.emoji}</span>
            {/* 카운트다운 링 */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 100 100"
              style={{ transform: 'rotate(-90deg)' }}>
              <motion.circle
                cx="50" cy="50" r="47" fill="none"
                stroke={obj.isEnemy ? 'rgba(255,100,100,0.5)' : 'rgba(255,255,255,0.4)'}
                strokeWidth="4" strokeLinecap="round"
                pathLength={1}
                initial={{ pathLength: 1 }}
                animate={{ pathLength: 0 }}
                transition={{ duration: OBJECT_LIFETIME / 1000, ease: 'linear' }}
              />
            </svg>
          </motion.button>
        ))}
      </AnimatePresence>

      {/* ── 파티클 ── */}
      {particles.map((p) => <Particle key={p.id} {...p} />)}

      {/* ── 떠오르는 텍스트 ── */}
      {floatTexts.map((t) => <FloatingText key={t.id} {...t} />)}

      {/* ── 리듬 모드 맥박 원 (비트 시각화) ── */}
      {subMode === 'rhythm' && (
        <motion.div
          className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none z-0 rounded-full border-4 border-white/20"
          animate={onBeat
            ? { width: 160, height: 160, opacity: 0.5 }
            : { width: 80,  height: 80,  opacity: 0.15 }}
          transition={{ duration: 0.12, ease: 'easeOut' }}
        />
      )}

      {/* ── 힌트 ── */}
      <AnimatePresence>
        {objects.length === 0 && !boss && gameState === 'playing' && (
          <motion.p
            className="absolute inset-0 flex items-center justify-center text-white/35 text-xl font-black pointer-events-none"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            {subMode === 'rhythm' ? '🎵 비트에 맞춰 잡아요!' : '✨ 기다려요...'}
          </motion.p>
        )}
      </AnimatePresence>

      {/* ── 스테이지 클리어 오버레이 ── */}
      <AnimatePresence>
        {gameState === 'stageClear' && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center z-50"
            style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          >
            <motion.div
              className="bg-white rounded-3xl px-12 py-8 text-center shadow-2xl flex flex-col items-center gap-3"
              initial={{ scale: 0, rotate: -8 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <motion.span className="text-7xl"
                animate={{ rotate: [0, -12, 12, 0], scale: [1, 1.2, 1] }}
                transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 1 }}>
                🎉
              </motion.span>
              <h2 className="text-3xl font-black text-purple-800">
                {cfg.label} 클리어!
              </h2>
              <p className="text-gray-500 font-bold">다음 단계로 이동 중...</p>
              <div className="flex gap-1 mt-1">
                {[0,1,2].map((i) => (
                  <motion.span key={i} className="text-3xl"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2 + i * 0.1, type: 'spring' }}>
                    ⭐
                  </motion.span>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 최종 클리어 ── */}
      <AnimatePresence>
        {gameState === 'allClear' && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center z-50"
            style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          >
            <motion.div
              className="bg-white rounded-3xl p-10 text-center shadow-2xl flex flex-col items-center gap-4 max-w-xs"
              initial={{ scale: 0, rotate: -8 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 280, damping: 18 }}
            >
              <motion.span className="text-8xl"
                animate={{ rotate: [0,-10,10,-8,0], scale: [1,1.15,1] }}
                transition={{ duration: 0.7, repeat: Infinity, repeatDelay: 1.5 }}>
                🏆
              </motion.span>
              <h2 className="text-4xl font-black text-purple-800">{childName}아, 최고야!</h2>
              <p className="text-xl text-gray-500">보스까지 모두 이겼어! 🎊</p>
              <div className="flex gap-1">
                {['⭐','⭐','⭐','⭐'].map((s, i) => (
                  <motion.span key={i} className="text-3xl"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3 + i * 0.1, type: 'spring' }}>
                    {s}
                  </motion.span>
                ))}
              </div>
              <motion.button onClick={handleRestart}
                className="mt-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-black text-xl px-8 py-4 rounded-2xl shadow-lg"
                whileTap={{ scale: 0.93 }}>
                처음부터! 🎮
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 게임 오버 ── */}
      <AnimatePresence>
        {gameState === 'gameOver' && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center z-50"
            style={{ background: 'rgba(60,0,0,0.75)', backdropFilter: 'blur(6px)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          >
            <motion.div
              className="bg-white rounded-3xl p-10 text-center shadow-2xl flex flex-col items-center gap-4"
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 280 }}
            >
              <motion.span className="text-8xl"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 0.8, repeat: Infinity }}>
                😢
              </motion.span>
              <h2 className="text-3xl font-black text-red-600">게임 오버!</h2>
              <p className="text-gray-500 text-lg">괜찮아, 다시 해보자!</p>
              <motion.button onClick={handleRestart}
                className="bg-gradient-to-r from-red-500 to-orange-500 text-white font-black text-xl px-8 py-4 rounded-2xl shadow-lg"
                whileTap={{ scale: 0.93 }}>
                다시 하기! 💪
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
