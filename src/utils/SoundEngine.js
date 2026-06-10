/* =============================================
   SoundEngine.js — Web Audio API 기반 사운드 엔진
   외부 파일 없이 즉시 구동 가능한 합성음 구현.

   실제 동물 MP3 파일로 교체하려면:
   각 playAnimalSound() 내부의 TODO 블록 참고.
   ============================================= */

let audioCtx = null;

function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

/* ─── 동물 합성음 정의 (12종) ────────────────────── */
const ANIMAL_SYNTH = {
  /** 사자: 낮은 sawtooth + LFO 흔들림 */
  lion: (ctx) => {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    const lfo = ctx.createOscillator(), lfoGain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(85, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.9);
    lfo.frequency.value = 7; lfoGain.gain.value = 18;
    lfo.connect(lfoGain); lfoGain.connect(osc.frequency);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.7, t + 0.08);
    gain.gain.linearRampToValueAtTime(0, t + 1.0);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(t); lfo.start(t); osc.stop(t + 1.0); lfo.stop(t + 1.0);
  },

  /** 원숭이: 4번 빠른 비프 */
  monkey: (ctx) => {
    const t = ctx.currentTime;
    [0, 0.13, 0.26, 0.39].forEach((offset, i) => {
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = 'sine'; osc.frequency.value = i % 2 === 0 ? 700 : 900;
      gain.gain.setValueAtTime(0, t + offset);
      gain.gain.linearRampToValueAtTime(0.45, t + offset + 0.02);
      gain.gain.linearRampToValueAtTime(0, t + offset + 0.1);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(t + offset); osc.stop(t + offset + 0.12);
    });
  },

  /** 코끼리: 높은→낮은 주파수 스윕 */
  elephant: (ctx) => {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(420, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.7);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.8, t + 0.05);
    gain.gain.linearRampToValueAtTime(0, t + 0.8);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(t); osc.stop(t + 0.8);
  },

  /** 개구리: 두 음 교대 */
  frog: (ctx) => {
    const t = ctx.currentTime;
    [{ o: 0, f: 180 }, { o: 0.18, f: 140 }, { o: 0.34, f: 180 }].forEach(({ o, f }) => {
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = 'square'; osc.frequency.value = f;
      gain.gain.setValueAtTime(0.35, t + o);
      gain.gain.linearRampToValueAtTime(0, t + o + 0.14);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(t + o); osc.stop(t + o + 0.15);
    });
  },

  /** 오리: 사각파 주파수 하강 */
  duck: (ctx) => {
    const t = ctx.currentTime;
    [0, 0.22].forEach((offset) => {
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(750, t + offset);
      osc.frequency.exponentialRampToValueAtTime(380, t + offset + 0.18);
      gain.gain.setValueAtTime(0.5, t + offset);
      gain.gain.exponentialRampToValueAtTime(0.01, t + offset + 0.2);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(t + offset); osc.stop(t + offset + 0.21);
    });
  },

  /** 병아리: 짧고 높은 삼각파 3연타 */
  chick: (ctx) => {
    const t = ctx.currentTime;
    [0, 0.1, 0.2].forEach((offset) => {
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(3200, t + offset);
      osc.frequency.exponentialRampToValueAtTime(2200, t + offset + 0.08);
      gain.gain.setValueAtTime(0.45, t + offset);
      gain.gain.linearRampToValueAtTime(0, t + offset + 0.09);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(t + offset); osc.stop(t + offset + 0.1);
    });
  },

  /** 호랑이: 사자보다 높은 피치의 으르렁 */
  tiger: (ctx) => {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    const lfo = ctx.createOscillator(), lfoGain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(130, t);
    osc.frequency.exponentialRampToValueAtTime(75, t + 0.65);
    lfo.frequency.value = 9; lfoGain.gain.value = 22;
    lfo.connect(lfoGain); lfoGain.connect(osc.frequency);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.65, t + 0.06);
    gain.gain.linearRampToValueAtTime(0, t + 0.75);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(t); lfo.start(t); osc.stop(t + 0.75); lfo.stop(t + 0.75);
  },

  /** 곰: 깊은 저음 굉음 */
  bear: (ctx) => {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(60, t);
    osc.frequency.exponentialRampToValueAtTime(38, t + 1.1);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.75, t + 0.12);
    gain.gain.linearRampToValueAtTime(0, t + 1.2);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(t); osc.stop(t + 1.2);
  },

  /** 소: 길게 내려가는 음 (음메~) */
  cow: (ctx) => {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(230, t);
    osc.frequency.exponentialRampToValueAtTime(115, t + 0.8);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.6, t + 0.05);
    gain.gain.linearRampToValueAtTime(0.45, t + 0.6);
    gain.gain.linearRampToValueAtTime(0, t + 0.95);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(t); osc.stop(t + 0.95);
  },

  /** 돼지: 짧은 코맹맹이 소리 두 번 */
  pig: (ctx) => {
    const t = ctx.currentTime;
    [0, 0.22].forEach((offset) => {
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(310, t + offset);
      osc.frequency.exponentialRampToValueAtTime(210, t + offset + 0.15);
      gain.gain.setValueAtTime(0.42, t + offset);
      gain.gain.linearRampToValueAtTime(0, t + offset + 0.16);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(t + offset); osc.stop(t + offset + 0.17);
    });
  },

  /** 고양이: LFO 넣은 야옹 */
  cat: (ctx) => {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    const lfo = ctx.createOscillator(), lfoGain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, t);
    osc.frequency.exponentialRampToValueAtTime(300, t + 0.55);
    lfo.frequency.value = 4; lfoGain.gain.value = 28;
    lfo.connect(lfoGain); lfoGain.connect(osc.frequency);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.55, t + 0.04);
    gain.gain.linearRampToValueAtTime(0.38, t + 0.4);
    gain.gain.linearRampToValueAtTime(0, t + 0.65);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(t); lfo.start(t); osc.stop(t + 0.65); lfo.stop(t + 0.65);
  },

  /** 강아지: 짧고 날카로운 멍 */
  dog: (ctx) => {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(370, t);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.18);
    gain.gain.setValueAtTime(0.65, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(t); osc.stop(t + 0.23);
  },
};

/* ─── 피아노 음계 (C 장조 확장) ────────────────── */
const PIANO_FREQ = {
  lion:     130.8,  // C3
  monkey:   164.8,  // E3
  elephant: 196.0,  // G3
  frog:     261.6,  // C4
  duck:     329.6,  // E4
  chick:    392.0,  // G4
  tiger:    440.0,  // A4
  bear:      98.0,  // G2
  cow:      220.0,  // A3
  pig:      293.7,  // D4
  cat:      349.2,  // F4
  dog:      369.9,  // F#4
};

function playPiano(animalId) {
  const ctx = getCtx(), t = ctx.currentTime;
  const freq = PIANO_FREQ[animalId] ?? 261.6;
  const osc = ctx.createOscillator(), gain = ctx.createGain();
  osc.type = 'sine'; osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.6, t + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.3, t + 0.4);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
  osc.connect(gain); gain.connect(ctx.destination);
  osc.start(t); osc.stop(t + 1.3);
}

function playXylophone(animalId) {
  const ctx = getCtx(), t = ctx.currentTime;
  const freq = PIANO_FREQ[animalId] ?? 261.6;
  [1, 2.76, 5.4].forEach((ratio, i) => {
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = 'sine'; osc.frequency.value = freq * ratio;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.55 / (i + 1), t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35 / (i + 1));
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(t); osc.stop(t + 0.4);
  });
}

/* ─── 공개 API ───────────────────────────────────── */

/**
 * 동물 소리 재생
 * @param {string} animalId
 * @param {0|1|2} mode - 0=동물소리, 1=피아노, 2=실로폰
 *
 * TODO: 실제 MP3로 교체 시:
 * const paths = ['animal','piano','xylophone'];
 * return new Audio(`/sounds/${animalId}-${paths[mode]}.mp3`).play().catch(console.warn);
 */
export function playAnimalSound(animalId, mode = 0) {
  if (mode === 1) return playPiano(animalId);
  if (mode === 2) return playXylophone(animalId);
  ANIMAL_SYNTH[animalId]?.(getCtx());
}

/* ─── 루프 관리 ──────────────────────────────────── */
const loops = {};

export function startAnimalLoop(animalId, mode, interval = 1000) {
  if (loops[animalId]) return;
  playAnimalSound(animalId, mode);
  loops[animalId] = setInterval(() => playAnimalSound(animalId, mode), interval);
}

export function stopAnimalLoop(animalId) {
  if (loops[animalId]) { clearInterval(loops[animalId]); delete loops[animalId]; }
}

export function stopAllLoops() {
  Object.keys(loops).forEach(stopAnimalLoop);
}

/* ─── 게임 효과음 ────────────────────────────────── */

/** 별/하트/바나나 터치 "팡!" 효과음 */
export function playPopSound() {
  const ctx = getCtx(), t = ctx.currentTime;
  const osc = ctx.createOscillator(), gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(900, t);
  osc.frequency.exponentialRampToValueAtTime(300, t + 0.12);
  gain.gain.setValueAtTime(0.6, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
  osc.connect(gain); gain.connect(ctx.destination);
  osc.start(t); osc.stop(t + 0.16);
}

/** 콤보 레벨에 따라 상승하는 칭찬음 */
export function playComboSound(level) {
  const ctx = getCtx(), t = ctx.currentTime;
  const baseFreq = 500 + (Math.min(level, 8) - 1) * 120;
  [0, 0.08].forEach((offset, i) => {
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = baseFreq * (i === 0 ? 1 : 1.25);
    gain.gain.setValueAtTime(0.5, t + offset);
    gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.12);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(t + offset); osc.stop(t + offset + 0.13);
  });
}

/** 적에 맞았을 때 둔탁한 타격음 */
export function playEnemyHitSound() {
  const ctx = getCtx(), t = ctx.currentTime;
  const osc = ctx.createOscillator(), gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(200, t);
  osc.frequency.exponentialRampToValueAtTime(50, t + 0.2);
  gain.gain.setValueAtTime(0.7, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
  osc.connect(gain); gain.connect(ctx.destination);
  osc.start(t); osc.stop(t + 0.25);
}

/** 보스 타격음 */
export function playBossHitSound() {
  const ctx = getCtx(), t = ctx.currentTime;
  [0, 0.06, 0.12].forEach((offset, i) => {
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 300 - i * 60;
    gain.gain.setValueAtTime(0.55, t + offset);
    gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.1);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(t + offset); osc.stop(t + offset + 0.11);
  });
}

/** 리듬 모드 비트 드럼음 */
export function playBeatSound() {
  const ctx = getCtx(), t = ctx.currentTime;
  const osc = ctx.createOscillator(), gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(160, t);
  osc.frequency.exponentialRampToValueAtTime(0.001, t + 0.28);
  gain.gain.setValueAtTime(0.75, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
  osc.connect(gain); gain.connect(ctx.destination);
  osc.start(t); osc.stop(t + 0.31);
}

/** 점수에 맞는 한국어 숫자 음성 */
export function playCountSound(count) {
  const words = ['하나','둘','셋','넷','다섯','여섯','일곱','여덟','아홉','열',
    '열하나','열둘','열셋','열넷','열다섯','열여섯','열일곱','열여덟','열아홉','스물'];
  if ('speechSynthesis' in window) {
    const word = words[(count - 1) % words.length] ?? '우와';
    const utt = new SpeechSynthesisUtterance(`${word}!`);
    utt.lang = 'ko-KR'; utt.rate = 1.25; utt.pitch = 1.6;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utt);
  } else {
    playPopSound();
  }
}

/** 칭찬 TTS */
export function speakPraise(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = 'ko-KR'; utt.rate = 0.92; utt.pitch = 1.3;
  window.speechSynthesis.speak(utt);
}

/** 진동 피드백 */
export function vibrate(pattern = [50]) {
  if ('vibrate' in navigator) navigator.vibrate(pattern);
}
