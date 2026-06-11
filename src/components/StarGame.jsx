import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  playAnimalSound, playCountSound, playComboSound,
  playEnemyHitSound, playBossHitSound, playBeatSound, vibrate,
} from '../utils/SoundEngine';

/* ─── 스테이지 설정 (5단계) ─────────────────────────── */
const STAGES = [
  { id:1, label:'1단계', theme:'⭐', scoreGoal:30,  spawnMs:1200, maxObj:6,  speed:0,   enemyRate:0,    hasBoss:false, powerupRate:0.10,
    bg:'radial-gradient(ellipse at top, #1a0533 0%, #0d1b4f 60%, #050a1a 100%)' },
  { id:2, label:'2단계', theme:'✨', scoreGoal:60,  spawnMs:880,  maxObj:8,  speed:0.4, enemyRate:0,    hasBoss:false, powerupRate:0.10,
    bg:'radial-gradient(ellipse at top, #1a0533 0%, #1b0d4f 60%, #0a0520 100%)' },
  { id:3, label:'3단계', theme:'🚀', scoreGoal:100, spawnMs:640,  maxObj:9,  speed:0.8, enemyRate:0.18, hasBoss:false, powerupRate:0.08,
    bg:'radial-gradient(ellipse at top, #0a2033 0%, #0a1a2f 60%, #050a15 100%)' },
  { id:4, label:'4단계', theme:'💫', scoreGoal:150, spawnMs:510,  maxObj:10, speed:1.1, enemyRate:0.24, hasBoss:false, powerupRate:0.07,
    bg:'radial-gradient(ellipse at top, #0a1233 0%, #0d0a3f 60%, #05051a 100%)' },
  { id:5, label:'🔥 보스', theme:'🔥', scoreGoal:99, spawnMs:460,  maxObj:9,  speed:1.4, enemyRate:0.28, hasBoss:true,  powerupRate:0.05,
    bg:'radial-gradient(ellipse at top, #330a0a 0%, #1a0808 60%, #0a0000 100%)' },
];
const OBJECT_LIFETIME = 2400;
const MOVE_TICK_MS    = 42;
const BOSS_HP_MAX     = 6;
const MAX_HEARTS      = 5;

/* ─── 오브젝트 종류 ──────────────────────────────────── */
const GOOD_OBJS = [
  { type:'star',    emoji:'⭐', pts:1, minSize:62, maxSize:92  },
  { type:'heart',   emoji:'❤️', pts:1, minSize:58, maxSize:82  },
  { type:'banana',  emoji:'🍌', pts:2, minSize:52, maxSize:74  },
  { type:'rainbow', emoji:'🌈', pts:3, minSize:72, maxSize:104 },
];
const ENEMY_OBJS = [
  { type:'bug',  emoji:'🐛', pts:-1, minSize:52, maxSize:70 },
  { type:'bomb', emoji:'💣', pts:-2, minSize:52, maxSize:68 },
];
const POWERUP_OBJS = [
  { type:'lightning', emoji:'⚡', pts:5, minSize:60, maxSize:80, isPowerup:true },
  { type:'gem',       emoji:'💎', pts:3, minSize:60, maxSize:80, isPowerup:true },
  { type:'shield',    emoji:'🛡️', pts:0, minSize:60, maxSize:80, isPowerup:true, effect:'heal' },
];
const PARTICLE_COLORS = {
  star:      ['#FFD700','#FFA500','#FF6347','#FFFACD'],
  heart:     ['#FF69B4','#FF1493','#FFB6C1','#FF4081'],
  banana:    ['#FFD700','#32CD32','#FFF44F','#ADFF2F'],
  rainbow:   ['#FF0000','#FF7F00','#FFFF00','#00FF7F','#00BFFF','#BF00FF'],
  lightning: ['#FFE000','#FFFACD','#FF8C00','#FFD700'],
  gem:       ['#00BFFF','#7DF9FF','#9B59B6','#E8DAEF'],
  shield:    ['#00FF7F','#7FFF00','#ADFF2F','#90EE90'],
  bug:       ['#8B4513','#A0522D','#D2691E'],
  bomb:      ['#333','#555','#777'],
};

/* ─── 리듬 모드 동물 데이터 ──────────────────────────── */
const ANIMAL_EMOJI = {
  lion:'🦁', monkey:'🐒', elephant:'🐘', frog:'🐸',
  duck:'🦆', chick:'🐥', tiger:'🐯', bear:'🐻',
  cow:'🐮', pig:'🐷', cat:'🐱', dog:'🐶',
};
const ALL_ANIMAL_IDS = Object.keys(ANIMAL_EMOJI);

/* ─── 헬퍼 ───────────────────────────────────────────── */
function makeId() { return Date.now() + Math.random(); }
function rand(min, max) { return min + Math.random() * (max - min); }

/* ─── 파티클 ─────────────────────────────────────────── */
function Particle({ x, y, color, angle }) {
  const dx = Math.cos((angle * Math.PI) / 180) * rand(70, 120);
  const dy = Math.sin((angle * Math.PI) / 180) * rand(70, 120);
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{ left:`${x}%`, top:`${y}%`, width:12, height:12, backgroundColor:color, zIndex:30 }}
      initial={{ x:0, y:0, opacity:1, scale:1 }}
      animate={{ x:dx, y:dy, opacity:0, scale:0 }}
      transition={{ duration:0.55, ease:'easeOut' }}
    />
  );
}

/* ─── 떠오르는 텍스트 ────────────────────────────────── */
function FloatingText({ x, y, text, color }) {
  return (
    <motion.div
      className="absolute pointer-events-none font-black text-2xl z-30 drop-shadow-lg"
      style={{ left:`${x}%`, top:`${y}%`, color, transform:'translate(-50%,-50%)' }}
      initial={{ y:0, opacity:1, scale:0.8 }}
      animate={{ y:-70, opacity:0, scale:1.3 }}
      transition={{ duration:0.85, ease:'easeOut' }}
    >
      {text}
    </motion.div>
  );
}

/* ─── 리듬 모드 v2 (레인 낙하식) ────────────────────── */
const LANE_STYLES = [
  { bg:'rgba(255,120,40,0.14)',  line:'#FF7828', pad:'from-orange-500 to-red-600'    },
  { bg:'rgba(120,40,255,0.14)', line:'#8040FF', pad:'from-purple-500 to-violet-600' },
  { bg:'rgba(40,200,100,0.14)', line:'#28C864', pad:'from-green-500 to-emerald-600' },
];
const CATCH_MIN   = 74;
const CATCH_MAX   = 98;
const PERFECT_MIN = 80;
const PERFECT_MAX = 93;
const CATCH_ZONE_Y = 79;

function RhythmMode({ soundMode, onScore }) {
  const [notes,     setNotes]     = useState([]);
  const [score,     setScore]     = useState(0);
  const [combo,     setCombo]     = useState(0);
  const [padFlash,  setPadFlash]  = useState([false, false, false]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [beatCount, setBeatCount] = useState(0);

  const notesRef     = useRef([]);
  const comboRef     = useRef(0);
  const scoreRef     = useRef(0);
  const speedRef     = useRef(1.2);
  const beatCountRef = useRef(0);
  const soundModeRef = useRef(soundMode);

  useEffect(() => { soundModeRef.current = soundMode; }, [soundMode]);

  /* Beat spawner — 120 BPM */
  useEffect(() => {
    const iv = setInterval(() => {
      playBeatSound();
      beatCountRef.current++;
      setBeatCount(c => c + 1);
      speedRef.current = Math.min(3.0, 1.2 + beatCountRef.current * 0.012);

      const lanesUsed = new Set();
      const numNotes  = beatCountRef.current % 4 === 0 ? 2 : 1;
      const newNotes  = [];
      while (lanesUsed.size < numNotes) {
        const lane = Math.floor(Math.random() * 3);
        if (!lanesUsed.has(lane)) {
          lanesUsed.add(lane);
          const animalId = ALL_ANIMAL_IDS[Math.floor(Math.random() * ALL_ANIMAL_IDS.length)];
          newNotes.push({ id: makeId(), lane, y: -8, animalId, emoji: ANIMAL_EMOJI[animalId] });
        }
      }

      setNotes(prev => {
        const next = [...prev, ...newNotes];
        notesRef.current = next;
        return next;
      });
    }, 500);
    return () => clearInterval(iv);
  }, []);

  /* Movement loop */
  useEffect(() => {
    const iv = setInterval(() => {
      setNotes(prev => {
        const updated = prev.map(n => ({ ...n, y: n.y + speedRef.current }));
        const missed  = updated.filter(n => n.y > 102);
        if (missed.length > 0) { comboRef.current = 0; setCombo(0); }
        const visible = updated.filter(n => n.y <= 102);
        notesRef.current = visible;
        return visible;
      });
    }, MOVE_TICK_MS);
    return () => clearInterval(iv);
  }, []);

  const handlePadTap = useCallback((lane) => {
    setPadFlash(prev => { const n = [...prev]; n[lane] = true; return n; });
    setTimeout(() => setPadFlash(prev => { const n = [...prev]; n[lane] = false; return n; }), 150);
    vibrate([25]);

    const laneNotes = notesRef.current.filter(
      n => n.lane === lane && n.y >= CATCH_MIN && n.y <= CATCH_MAX
    );
    if (laneNotes.length === 0) return;

    const note = laneNotes.reduce((best, n) =>
      Math.abs(n.y - 87) < Math.abs(best.y - 87) ? n : best
    );

    const isPerfect = note.y >= PERFECT_MIN && note.y <= PERFECT_MAX;
    const basePts   = isPerfect ? 3 : 1;

    setNotes(prev => {
      const next = prev.filter(n => n.id !== note.id);
      notesRef.current = next;
      return next;
    });
    playAnimalSound(note.animalId, soundModeRef.current);

    const newCombo = comboRef.current + 1;
    comboRef.current = newCombo;
    setCombo(newCombo);
    if (newCombo >= 2) playComboSound(newCombo);

    const mult     = newCombo >= 8 ? 3 : newCombo >= 4 ? 2 : 1;
    const earned   = basePts * mult;
    const newScore = scoreRef.current + earned;
    scoreRef.current = newScore;
    setScore(newScore);
    onScore(newScore);

    const text  = isPerfect ? '⭐ PERFECT!' : '✨ GOOD!';
    const color = isPerfect ? '#FFD700' : '#7DF9FF';
    const fb    = { id: makeId(), lane, text: mult > 1 ? `${text} ×${mult}` : text, color };
    setFeedbacks(prev => [...prev, fb]);
    setTimeout(() => setFeedbacks(prev => prev.filter(f => f.id !== fb.id)), 900);
  }, [onScore]);

  return (
    <div className="h-full flex flex-col overflow-hidden"
      style={{ background:'radial-gradient(ellipse at top, #0f0a2e 0%, #06031a 100%)' }}>
      {/* Score bar */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 bg-black/40">
        <div className="text-white font-black text-2xl drop-shadow">⭐ {score}</div>
        <AnimatePresence>
          {combo >= 2 && (
            <motion.div
              className="bg-yellow-400 text-yellow-900 rounded-full px-3 py-1 text-sm font-black shadow-lg"
              initial={{ scale:0 }} animate={{ scale:1 }} exit={{ scale:0 }}
              key={combo} transition={{ type:'spring', stiffness:500 }}>
              🔥 {combo} COMBO{combo >= 8 ? ' ×3' : combo >= 4 ? ' ×2' : ''}
            </motion.div>
          )}
        </AnimatePresence>
        <div className="text-white/50 text-sm font-bold">🥁 {beatCount}</div>
      </div>

      {/* Lanes */}
      <div className="flex-1 flex min-h-0">
        {[0, 1, 2].map(lane => (
          <div key={lane} className="flex-1 relative overflow-hidden border-x border-white/8"
            style={{ background: LANE_STYLES[lane].bg }}>
            {/* Catch zone glow */}
            <div className="absolute left-0 right-0 pointer-events-none"
              style={{
                top:`${CATCH_ZONE_Y}%`, height:'18%',
                background:`linear-gradient(to bottom, transparent, ${LANE_STYLES[lane].line}55, transparent)`,
              }} />
            <div className="absolute left-0 right-0 h-0.5 pointer-events-none"
              style={{ top:`${CATCH_ZONE_Y + 6}%`, background:LANE_STYLES[lane].line, opacity:0.9 }} />

            {/* Falling notes */}
            {notes.filter(n => n.lane === lane).map(note => (
              <div key={note.id}
                className="absolute left-1/2 -translate-x-1/2 text-5xl leading-none select-none pointer-events-none"
                style={{ top:`${note.y}%`, filter:'drop-shadow(0 0 10px rgba(255,255,255,0.9))' }}>
                {note.emoji}
              </div>
            ))}

            {/* Feedback */}
            {feedbacks.filter(f => f.lane === lane).map(fb => (
              <motion.div key={fb.id}
                className="absolute left-1/2 -translate-x-1/2 font-black text-base whitespace-nowrap z-30 pointer-events-none"
                style={{ top:`${CATCH_ZONE_Y - 7}%`, color:fb.color, textShadow:`0 0 10px ${fb.color}` }}
                initial={{ y:0, opacity:1 }}
                animate={{ y:-55, opacity:0 }}
                transition={{ duration:0.85, ease:'easeOut' }}>
                {fb.text}
              </motion.div>
            ))}
          </div>
        ))}
      </div>

      {/* Tap pads */}
      <div className="flex-shrink-0 flex gap-2 p-2" style={{ height:'22%', minHeight:76, maxHeight:110 }}>
        {[0, 1, 2].map(lane => (
          <motion.button key={lane}
            className={`flex-1 rounded-2xl bg-gradient-to-b ${LANE_STYLES[lane].pad}
              flex items-center justify-center shadow-xl border-2 border-white/30 focus:outline-none`}
            animate={padFlash[lane]
              ? { scale:1.06, boxShadow:`0 0 24px 8px ${LANE_STYLES[lane].line}` }
              : { scale:1,    boxShadow:'0 4px 14px rgba(0,0,0,0.35)' }}
            transition={{ duration:0.08 }}
            onPointerDown={(e) => { e.preventDefault(); handlePadTap(lane); }}
            style={{ touchAction:'none' }}>
            <span className="text-3xl select-none">{['🟠','🟣','🟢'][lane]}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

/* ─── StarGame 메인 ──────────────────────────────────── */
export default function StarGame({ childName, soundMode = 0, onStarCaught }) {
  const [subMode,     setSubMode]     = useState('stage');
  const [stage,       setStage]       = useState(1);
  const [stageScore,  setStageScore]  = useState(0);
  const [hearts,      setHearts]      = useState(MAX_HEARTS);
  const [combo,       setCombo]       = useState(0);
  const [objects,     setObjects]     = useState([]);
  const [particles,   setParticles]   = useState([]);
  const [floatTexts,  setFloatTexts]  = useState([]);
  const [boss,        setBoss]        = useState(null);
  const [bossFlash,   setBossFlash]   = useState(false);
  const [screenFlash, setScreenFlash] = useState(null);
  const [gameState,   setGameState]   = useState('playing');

  const stageRef      = useRef(1);
  const stageScoreRef = useRef(0);
  const heartsRef     = useRef(MAX_HEARTS);
  const comboRef      = useRef(0);
  const lastCatchTime = useRef(0);
  const objectsRef    = useRef([]);
  const gameStateRef  = useRef('playing');

  const spawnRef = useRef(null);
  const moveRef  = useRef(null);
  const bossRef  = useRef(null);

  useEffect(() => { stageRef.current = stage; },           [stage]);
  useEffect(() => { stageScoreRef.current = stageScore; }, [stageScore]);
  useEffect(() => { heartsRef.current = hearts; },         [hearts]);
  useEffect(() => { comboRef.current = combo; },           [combo]);
  useEffect(() => { objectsRef.current = objects; },       [objects]);
  useEffect(() => { gameStateRef.current = gameState; },   [gameState]);

  const clearAllIntervals = useCallback(() => {
    [spawnRef, moveRef, bossRef].forEach((r) => {
      if (r.current) { clearInterval(r.current); r.current = null; }
    });
  }, []);

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

  const addFloat = useCallback((x, y, text, color) => {
    const id = makeId();
    setFloatTexts((p) => [...p, { id, x, y, text, color }]);
    setTimeout(() => setFloatTexts((p) => p.filter((t) => t.id !== id)), 950);
  }, []);

  const flash = useCallback((color) => {
    setScreenFlash(color);
    setTimeout(() => setScreenFlash(null), 180);
  }, []);

  const handleStageClear = useCallback(() => {
    if (gameStateRef.current !== 'playing') return;
    setGameState('stageClear');
    gameStateRef.current = 'stageClear';
    clearAllIntervals();
    setObjects([]);
    setBoss(null);
    flash('white');

    setTimeout(() => {
      if (stageRef.current >= 5) {
        setGameState('allClear');
        gameStateRef.current = 'allClear';
      } else {
        const next = stageRef.current + 1;
        setStage(next);       stageRef.current = next;
        setStageScore(0);     stageScoreRef.current = 0;
        setCombo(0);          comboRef.current = 0;
        setGameState('playing'); gameStateRef.current = 'playing';
      }
    }, 3000);
  }, [clearAllIntervals, flash]);

  const handleGameOver = useCallback(() => {
    setGameState('gameOver');
    gameStateRef.current = 'gameOver';
    clearAllIntervals();
    setObjects([]);
    setBoss(null);
    flash('red');
  }, [clearAllIntervals, flash]);

  const handleTap = useCallback((obj) => {
    if (gameStateRef.current !== 'playing') return;
    setObjects((p) => p.filter((o) => o.id !== obj.id));

    /* 파워업 */
    if (obj.isPowerup) {
      burstParticles(obj.x, obj.y, obj.type);
      vibrate([25, 15, 45]);
      flash('white');
      if (obj.effect === 'heal') {
        const newH = Math.min(heartsRef.current + 1, MAX_HEARTS);
        setHearts(newH); heartsRef.current = newH;
        addFloat(obj.x, obj.y, '🛡️ +1♥', '#00FF7F');
      } else {
        const ns = stageScoreRef.current + obj.pts;
        setStageScore(ns); stageScoreRef.current = ns;
        addFloat(obj.x, obj.y, `${obj.emoji} +${obj.pts}`, '#FFD700');
        onStarCaught(ns);
        const cfg = STAGES[stageRef.current - 1];
        if (!cfg.hasBoss && ns >= cfg.scoreGoal) handleStageClear();
      }
      return;
    }

    /* 적 */
    if (obj.isEnemy) {
      const newH = Math.max(heartsRef.current + obj.pts, 0);
      setHearts(newH); heartsRef.current = newH;
      playEnemyHitSound(); vibrate([80, 40, 80]);
      flash('red');
      addFloat(obj.x, obj.y, obj.type === 'bomb' ? '💥 -2!' : '🐛 아야!', '#FF4444');
      if (newH <= 0) handleGameOver();
      return;
    }

    /* 일반 오브젝트 + 콤보 */
    const now     = Date.now();
    const timeDiff = now - lastCatchTime.current;
    lastCatchTime.current = now;
    const newCombo = timeDiff < 2000 ? comboRef.current + 1 : 1;
    setCombo(newCombo); comboRef.current = newCombo;

    const multiplier = newCombo >= 5 ? 3 : newCombo >= 3 ? 2 : 1;
    const earned     = obj.pts * multiplier;
    const ns         = stageScoreRef.current + earned;
    setStageScore(ns); stageScoreRef.current = ns;

    if (newCombo >= 2) { playComboSound(newCombo); vibrate([20, 10, 30]); }
    else { playCountSound(ns); vibrate([35]); }

    burstParticles(obj.x, obj.y, obj.type);
    if (multiplier > 1) addFloat(obj.x, obj.y - 5, `x${multiplier} 콤보!`, '#FFD700');
    else addFloat(obj.x, obj.y - 5, `+${earned}`, '#FFFFFF');

    flash('white');
    onStarCaught(ns);

    const cfg = STAGES[stageRef.current - 1];
    if (!cfg.hasBoss && ns >= cfg.scoreGoal) handleStageClear();
  }, [burstParticles, addFloat, flash, handleGameOver, handleStageClear, onStarCaught]);

  const handleBossTap = useCallback(() => {
    if (gameStateRef.current !== 'playing') return;
    setBoss((prev) => {
      if (!prev) return prev;
      playBossHitSound(); vibrate([60]);
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

  const spawnObject = useCallback(() => {
    if (gameStateRef.current !== 'playing') return;
    const cfg = STAGES[stageRef.current - 1];
    if (objectsRef.current.length >= cfg.maxObj) return;

    const roll = Math.random();
    let pool = GOOD_OBJS;
    let isEnemy = false, isPowerup = false;

    if (cfg.powerupRate > 0 && roll < cfg.powerupRate) {
      pool = POWERUP_OBJS; isPowerup = true;
    } else if (cfg.enemyRate > 0 && roll < cfg.powerupRate + cfg.enemyRate) {
      pool = ENEMY_OBJS; isEnemy = true;
    }

    const def  = pool[Math.floor(Math.random() * pool.length)];
    const size = rand(def.minSize, def.maxSize);
    const id   = makeId();
    const spd  = cfg.speed;
    const vx   = spd > 0 ? (Math.random() < 0.5 ? 1 : -1) * spd * rand(0.6, 1.4) : 0;
    const vy   = spd > 0 ? (Math.random() < 0.5 ? 1 : -1) * spd * rand(0.6, 1.4) : 0;

    const obj = {
      id, type:def.type, emoji:def.emoji, pts:def.pts,
      isEnemy, isPowerup: isPowerup || !!def.isPowerup,
      effect: def.effect,
      size, x:rand(6, 92), y:rand(14, 84), vx, vy,
    };

    setObjects((p) => [...p, obj]);
    setTimeout(() => setObjects((p) => p.filter((o) => o.id !== id)), OBJECT_LIFETIME);
  }, []);

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

  useEffect(() => {
    clearAllIntervals();
    if (gameStateRef.current !== 'playing' || subMode !== 'stage') return;

    const cfg = STAGES[stage - 1];
    spawnRef.current = setInterval(spawnObject, cfg.spawnMs);
    if (cfg.speed > 0) startMoveLoop();
    if (cfg.hasBoss) {
      if (!boss) {
        setBoss({
          id:'boss', hp:BOSS_HP_MAX, maxHp:BOSS_HP_MAX,
          x:50, y:45,
          vx:cfg.speed * 1.2, vy:cfg.speed * 0.7,
          size:130,
        });
      }
      startBossLoop();
    }

    return () => clearAllIntervals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, subMode, gameState]);

  const handleRestart = () => {
    clearAllIntervals();
    setStage(1);          stageRef.current = 1;
    setStageScore(0);     stageScoreRef.current = 0;
    setHearts(MAX_HEARTS); heartsRef.current = MAX_HEARTS;
    setCombo(0);          comboRef.current = 0;
    setObjects([]); setParticles([]); setFloatTexts([]);
    setBoss(null);
    setGameState('playing'); gameStateRef.current = 'playing';
    lastCatchTime.current = 0;
  };

  const handleSubModeSwitch = (mode) => {
    clearAllIntervals();
    setObjects([]); setCombo(0); comboRef.current = 0; setBoss(null);
    setSubMode(mode);
  };

  const bgStars = useMemo(() =>
    Array.from({ length: 35 }, (_, i) => ({
      id:i, size:1.5 + Math.random() * 3,
      x:Math.random() * 100, y:Math.random() * 100,
      delay:Math.random() * 2.5, duration:1 + Math.random() * 2,
    })), []);

  const cfg     = STAGES[stage - 1];
  const goalPct = cfg.hasBoss ? null : Math.min(stageScore / cfg.scoreGoal, 1);

  /* ── 서브탭 버튼 (공통) ── */
  const SubTabs = () => (
    <div className="flex bg-black/45 rounded-full p-1 gap-1 flex-shrink-0">
      {[{ id:'stage', label:'🌟 스테이지' }, { id:'rhythm', label:'🎵 리듬' }].map((m) => (
        <button key={m.id}
          onClick={() => handleSubModeSwitch(m.id)}
          className={`px-3 py-1 rounded-full text-xs font-black transition-colors whitespace-nowrap ${
            subMode === m.id ? 'bg-white text-purple-800' : 'text-white/75 hover:text-white'
          }`}>
          {m.label}
        </button>
      ))}
    </div>
  );

  /* ── 리듬 모드 ── */
  if (subMode === 'rhythm') {
    return (
      <div className="h-full flex flex-col">
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 bg-black/50 backdrop-blur-sm">
          <SubTabs />
          <span className="text-white/55 text-xs font-bold">동물을 잡으면 소리가 나요!</span>
        </div>
        <div className="flex-1 min-h-0">
          <RhythmMode soundMode={soundMode} onScore={onStarCaught} />
        </div>
      </div>
    );
  }

  /* ── 스테이지 모드 ── */
  return (
    <div className="h-full relative overflow-hidden"
      style={{ background:cfg.bg, transition:'background 1s ease' }}>
      {/* 배경 별 */}
      {bgStars.map((s) => (
        <div key={s.id}
          className="absolute rounded-full bg-white animate-twinkle pointer-events-none"
          style={{ width:s.size, height:s.size, left:`${s.x}%`, top:`${s.y}%`,
            animationDelay:`${s.delay}s`, animationDuration:`${s.duration}s` }}
        />
      ))}

      {/* 화면 플래시 */}
      <AnimatePresence>
        {screenFlash && (
          <motion.div
            className="absolute inset-0 pointer-events-none z-40"
            style={{ background: screenFlash === 'red' ? 'rgba(255,0,0,0.25)' : 'rgba(255,255,255,0.22)' }}
            initial={{ opacity:1 }} animate={{ opacity:0 }}
            transition={{ duration:0.18 }}
          />
        )}
      </AnimatePresence>

      {/* HUD */}
      <div className="absolute top-3 left-0 right-0 z-10 flex items-start justify-between px-4 gap-2">
        <SubTabs />

        <div className="flex flex-col items-center bg-black/40 rounded-2xl px-3 py-1.5 flex-shrink-0">
          <span className="text-white font-black text-sm">{cfg.label} {cfg.theme}</span>
          {!cfg.hasBoss && (
            <>
              <div className="w-24 h-2 bg-white/20 rounded-full mt-1 overflow-hidden">
                <motion.div className="h-full bg-yellow-400 rounded-full"
                  animate={{ width:`${(goalPct ?? 0) * 100}%` }}
                  transition={{ duration:0.3 }} />
              </div>
              <span className="text-white/60 text-xs mt-0.5">{stageScore} / {cfg.scoreGoal}</span>
            </>
          )}
          {cfg.hasBoss && boss && (
            <span className="text-red-300 text-xs font-bold mt-0.5">보스 ❤️ {boss.hp}/{boss.maxHp}</span>
          )}
        </div>

        <div className="flex flex-col items-end gap-1">
          <div className="flex gap-0.5 bg-black/40 rounded-full px-3 py-1.5">
            {Array.from({ length: MAX_HEARTS }, (_, i) => (
              <motion.span key={i} className="text-lg leading-none"
                animate={i < hearts ? { scale:[1,1.3,1] } : {}}
                transition={{ duration:0.2 }}>
                {i < hearts ? '❤️' : '🖤'}
              </motion.span>
            ))}
          </div>
          <AnimatePresence>
            {combo >= 2 && (
              <motion.div
                className="bg-yellow-400 text-yellow-900 rounded-full px-3 py-0.5 text-xs font-black shadow-lg"
                initial={{ scale:0, opacity:0 }} animate={{ scale:1, opacity:1 }} exit={{ scale:0, opacity:0 }}
                transition={{ type:'spring', stiffness:500 }}>
                🔥 {combo} 콤보 {combo >= 5 ? 'x3' : combo >= 3 ? 'x2' : ''}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 보스 */}
      <AnimatePresence>
        {boss && gameState === 'playing' && (
          <motion.button
            className="absolute flex flex-col items-center justify-center cursor-pointer focus:outline-none z-20"
            style={{ left:`${boss.x}%`, top:`${boss.y}%`, width:boss.size, height:boss.size,
              transform:'translate(-50%,-50%)', touchAction:'none' }}
            initial={{ scale:0 }}
            animate={{ scale: bossFlash ? 1.15 : 1 }}
            transition={{ duration:0.08 }}
            onPointerDown={(e) => { e.preventDefault(); handleBossTap(); }}
            whileTap={{ scale:1.25 }}>
            <div className="w-full h-2 bg-black/40 rounded-full mb-1 overflow-hidden">
              <motion.div className="h-full bg-red-500 rounded-full"
                animate={{ width:`${(boss.hp / boss.maxHp) * 100}%` }}
                transition={{ duration:0.2 }} />
            </div>
            <motion.span className="leading-none select-none"
              style={{ fontSize: boss.size * 0.65 }}
              animate={bossFlash
                ? { filter:'brightness(3)' }
                : { filter:'brightness(1)', rotate:[-3,3,-3,0] }}
              transition={bossFlash ? { duration:0.08 } : { duration:1.5, repeat:Infinity }}>
              👾
            </motion.span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* 오브젝트 */}
      <AnimatePresence>
        {objects.map((obj) => (
          <motion.button
            key={obj.id}
            className={`absolute flex items-center justify-center rounded-full cursor-pointer
              focus:outline-none z-20
              ${obj.isEnemy   ? 'bg-red-900/30 border-2 border-red-400/50' :
                obj.isPowerup ? 'bg-white/20 border-2 border-yellow-300/60' :
                                'bg-white/10 border-2 border-white/25'}`}
            style={{ left:`${obj.x}%`, top:`${obj.y}%`, width:obj.size, height:obj.size,
              fontSize:obj.size * 0.55, transform:'translate(-50%,-50%)', touchAction:'none' }}
            initial={{ scale:0, rotate:-20 }}
            animate={{ scale:1, rotate:0 }}
            exit={{ scale:0, opacity:0 }}
            transition={{ type:'spring', stiffness:450, damping:22 }}
            onPointerDown={(e) => { e.preventDefault(); handleTap(obj); }}
            whileTap={{ scale:1.3 }}>
            <span className="select-none leading-none">{obj.emoji}</span>
            <svg className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 100 100" style={{ transform:'rotate(-90deg)' }}>
              <motion.circle cx="50" cy="50" r="47" fill="none"
                stroke={obj.isEnemy ? 'rgba(255,100,100,0.5)' :
                        obj.isPowerup ? 'rgba(255,220,0,0.6)' : 'rgba(255,255,255,0.4)'}
                strokeWidth="4" strokeLinecap="round"
                pathLength={1} initial={{ pathLength:1 }} animate={{ pathLength:0 }}
                transition={{ duration: OBJECT_LIFETIME / 1000, ease:'linear' }} />
            </svg>
          </motion.button>
        ))}
      </AnimatePresence>

      {particles.map((p) => <Particle key={p.id} {...p} />)}
      {floatTexts.map((t) => <FloatingText key={t.id} {...t} />)}

      {/* 대기 힌트 */}
      <AnimatePresence>
        {objects.length === 0 && !boss && gameState === 'playing' && (
          <motion.p
            className="absolute inset-0 flex items-center justify-center text-white/35 text-xl font-black pointer-events-none"
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
            ✨ 기다려요...
          </motion.p>
        )}
      </AnimatePresence>

      {/* 스테이지 클리어 */}
      <AnimatePresence>
        {gameState === 'stageClear' && (
          <motion.div className="absolute inset-0 flex items-center justify-center z-50"
            style={{ background:'rgba(0,0,0,0.55)', backdropFilter:'blur(4px)' }}
            initial={{ opacity:0 }} animate={{ opacity:1 }}>
            <motion.div
              className="bg-white rounded-3xl px-12 py-8 text-center shadow-2xl flex flex-col items-center gap-3"
              initial={{ scale:0, rotate:-8 }} animate={{ scale:1, rotate:0 }}
              transition={{ type:'spring', stiffness:300 }}>
              <motion.span className="text-7xl"
                animate={{ rotate:[0,-12,12,0], scale:[1,1.2,1] }}
                transition={{ duration:0.6, repeat:Infinity, repeatDelay:1 }}>🎉</motion.span>
              <h2 className="text-3xl font-black text-purple-800">{cfg.label} 클리어!</h2>
              <p className="text-gray-500 font-bold">다음 단계로 이동 중...</p>
              <div className="flex gap-1 mt-1">
                {[0,1,2].map((i) => (
                  <motion.span key={i} className="text-3xl"
                    initial={{ scale:0 }} animate={{ scale:1 }}
                    transition={{ delay:0.2 + i * 0.1, type:'spring' }}>⭐</motion.span>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 최종 클리어 */}
      <AnimatePresence>
        {gameState === 'allClear' && (
          <motion.div className="absolute inset-0 flex items-center justify-center z-50"
            style={{ background:'rgba(0,0,0,0.65)', backdropFilter:'blur(6px)' }}
            initial={{ opacity:0 }} animate={{ opacity:1 }}>
            <motion.div
              className="bg-white rounded-3xl p-10 text-center shadow-2xl flex flex-col items-center gap-4 max-w-xs"
              initial={{ scale:0, rotate:-8 }} animate={{ scale:1, rotate:0 }}
              transition={{ type:'spring', stiffness:280, damping:18 }}>
              <motion.span className="text-8xl"
                animate={{ rotate:[0,-10,10,-8,0], scale:[1,1.15,1] }}
                transition={{ duration:0.7, repeat:Infinity, repeatDelay:1.5 }}>🏆</motion.span>
              <h2 className="text-4xl font-black text-purple-800">{childName}아, 최고야!</h2>
              <p className="text-xl text-gray-500">보스까지 모두 이겼어! 🎊</p>
              <div className="flex gap-1">
                {['⭐','⭐','⭐','⭐'].map((s, i) => (
                  <motion.span key={i} className="text-3xl"
                    initial={{ scale:0 }} animate={{ scale:1 }}
                    transition={{ delay:0.3 + i * 0.1, type:'spring' }}>{s}</motion.span>
                ))}
              </div>
              <motion.button onClick={handleRestart}
                className="mt-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-black text-xl px-8 py-4 rounded-2xl shadow-lg"
                whileTap={{ scale:0.93 }}>
                처음부터! 🎮
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 게임 오버 */}
      <AnimatePresence>
        {gameState === 'gameOver' && (
          <motion.div className="absolute inset-0 flex items-center justify-center z-50"
            style={{ background:'rgba(60,0,0,0.75)', backdropFilter:'blur(6px)' }}
            initial={{ opacity:0 }} animate={{ opacity:1 }}>
            <motion.div
              className="bg-white rounded-3xl p-10 text-center shadow-2xl flex flex-col items-center gap-4"
              initial={{ scale:0 }} animate={{ scale:1 }}
              transition={{ type:'spring', stiffness:280 }}>
              <motion.span className="text-8xl"
                animate={{ y:[0,-8,0] }} transition={{ duration:0.8, repeat:Infinity }}>😢</motion.span>
              <h2 className="text-3xl font-black text-red-600">게임 오버!</h2>
              <p className="text-gray-500 text-lg">괜찮아, 다시 해보자!</p>
              <motion.button onClick={handleRestart}
                className="bg-gradient-to-r from-red-500 to-orange-500 text-white font-black text-xl px-8 py-4 rounded-2xl shadow-lg"
                whileTap={{ scale:0.93 }}>
                다시 하기! 💪
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
