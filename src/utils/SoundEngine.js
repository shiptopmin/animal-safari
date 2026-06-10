/* =============================================
   SoundEngine.js — Web Audio API 기반 사운드 엔진
   외부 파일 없이 즉시 구동 가능한 합성음 구현.

   실제 동물 MP3 파일로 교체하려면:
   각 playAnimalSound() 내부의 TODO 블록 참고.
   ============================================= */

let audioCtx = null;

/** AudioContext를 싱글톤으로 반환 (자동 재개 포함) */
function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/* ─── 기본 동물 합성음 정의 ──────────────────────── */

const ANIMAL_SYNTH = {
  /** 사자: 낮은 거칠음(sawtooth) + LFO 흔들림 → 그르렁 효과 */
  lion: (ctx) => {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(85, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.9);

    lfo.frequency.value = 7;
    lfoGain.gain.value = 18;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.7, t + 0.08);
    gain.gain.linearRampToValueAtTime(0.5, t + 0.7);
    gain.gain.linearRampToValueAtTime(0, t + 1.0);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t); lfo.start(t);
    osc.stop(t + 1.0); lfo.stop(t + 1.0);
  },

  /** 원숭이: 4번 빠른 비프 → 재잘거리는 효과 */
  monkey: (ctx) => {
    const t = ctx.currentTime;
    [0, 0.13, 0.26, 0.39].forEach((offset, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = t + offset;

      osc.type = 'sine';
      osc.frequency.value = i % 2 === 0 ? 700 : 900;

      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.45, start + 0.02);
      gain.gain.linearRampToValueAtTime(0, start + 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.12);
    });
  },

  /** 코끼리: 높은 주파수에서 낮게 스윕 → 나팔 소리 */
  elephant: (ctx) => {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(420, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.7);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.8, t + 0.05);
    gain.gain.linearRampToValueAtTime(0.5, t + 0.5);
    gain.gain.linearRampToValueAtTime(0, t + 0.8);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.8);
  },

  /** 개구리: 두 음 교대 → 개굴개굴 효과 */
  frog: (ctx) => {
    const t = ctx.currentTime;
    [{ offset: 0, freq: 180 }, { offset: 0.18, freq: 140 }, { offset: 0.34, freq: 180 }].forEach(({ offset, freq }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = t + offset;

      osc.type = 'square';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0.35, start);
      gain.gain.linearRampToValueAtTime(0, start + 0.14);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.15);
    });
  },

  /** 오리: 사각파 주파수 하강 → 꽥꽥 효과 */
  duck: (ctx) => {
    const t = ctx.currentTime;
    [0, 0.22].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = t + offset;

      osc.type = 'square';
      osc.frequency.setValueAtTime(750, start);
      osc.frequency.exponentialRampToValueAtTime(380, start + 0.18);

      gain.gain.setValueAtTime(0.5, start);
      gain.gain.exponentialRampToValueAtTime(0.01, start + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.21);
    });
  },

  /** 병아리: 짧고 높은 삼각파 3연타 → 삐약 효과 */
  chick: (ctx) => {
    const t = ctx.currentTime;
    [0, 0.1, 0.2].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = t + offset;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(3200, start);
      osc.frequency.exponentialRampToValueAtTime(2200, start + 0.08);

      gain.gain.setValueAtTime(0.45, start);
      gain.gain.linearRampToValueAtTime(0, start + 0.09);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.1);
    });
  },
};

/* ─── 피아노 음계 (C 장조 분산화음) ────────────── */
// 사자=C3, 원숭이=E3, 코끼리=G3, 개구리=C4, 오리=E4, 병아리=G4
const PIANO_FREQ = {
  lion: 130.8,
  monkey: 164.8,
  elephant: 196.0,
  frog: 261.6,
  duck: 329.6,
  chick: 392.0,
};

/** 피아노 버전: 부드러운 사인파 + 긴 서스테인 */
function playPiano(animalId) {
  const ctx = getCtx();
  const t = ctx.currentTime;
  const freq = PIANO_FREQ[animalId] ?? 261.6;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.value = freq;

  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.6, t + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.3, t + 0.4);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 1.3);
}

/** 실로폰 버전: 배음(harmonic) 3개 + 빠른 감쇠 */
function playXylophone(animalId) {
  const ctx = getCtx();
  const t = ctx.currentTime;
  const freq = PIANO_FREQ[animalId] ?? 261.6;

  [1, 2.76, 5.4].forEach((ratio, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = freq * ratio;

    const peak = 0.55 / (i + 1);
    const decay = 0.35 / (i + 1);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(peak, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, t + decay);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + decay + 0.01);
  });
}

/* ─── 공개 API ───────────────────────────────────── */

/**
 * 동물 소리 재생
 * @param {string} animalId - 'lion' | 'monkey' | 'elephant' | 'frog' | 'duck' | 'chick'
 * @param {0|1|2} mode - 0=기본 동물소리, 1=피아노, 2=실로폰
 *
 * TODO: 실제 MP3 파일로 교체하려면 아래 주석 해제 후 합성음 호출 제거:
 * const paths = ['animal', 'piano', 'xylophone'];
 * const audio = new Audio(`/sounds/${animalId}-${paths[mode]}.mp3`);
 * return audio.play().catch(console.warn);
 */
export function playAnimalSound(animalId, mode = 0) {
  if (mode === 1) return playPiano(animalId);
  if (mode === 2) return playXylophone(animalId);
  ANIMAL_SYNTH[animalId]?.(getCtx());
}

/* ─── 루프 관리 ──────────────────────────────────── */

const loops = {};

/** 동물 소리를 interval ms 간격으로 반복 재생 시작 */
export function startAnimalLoop(animalId, mode, interval = 1000) {
  if (loops[animalId]) return;
  playAnimalSound(animalId, mode);
  loops[animalId] = setInterval(() => playAnimalSound(animalId, mode), interval);
}

/** 특정 동물의 루프 정지 */
export function stopAnimalLoop(animalId) {
  if (loops[animalId]) {
    clearInterval(loops[animalId]);
    delete loops[animalId];
  }
}

/** 모든 루프 정지 */
export function stopAllLoops() {
  Object.keys(loops).forEach(stopAnimalLoop);
}

/* ─── 게임 효과음 ────────────────────────────────── */

/** 별/하트/바나나를 터치했을 때 "팡!" 효과음 */
export function playPopSound() {
  const ctx = getCtx();
  const t = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(900, t);
  osc.frequency.exponentialRampToValueAtTime(300, t + 0.12);

  gain.gain.setValueAtTime(0.6, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.16);
}

/** 점수에 맞는 한국어 숫자 음성 발화 (Web Speech API) */
export function playCountSound(count) {
  // TODO: 음성 합성을 실제 숫자 오디오 파일로 교체하려면:
  // const audio = new Audio(`/sounds/count-${count}.mp3`);
  // audio.play().catch(() => playPopSound());
  const words = ['하나', '둘', '셋', '넷', '다섯', '여섯', '일곱', '여덟', '아홉', '열',
    '열하나', '열둘', '열셋', '열넷', '열다섯', '열여섯', '열일곱', '열여덟', '열아홉', '스물'];
  const word = words[(count - 1) % words.length] ?? '우와';

  if ('speechSynthesis' in window) {
    const utt = new SpeechSynthesisUtterance(`${word}!`);
    utt.lang = 'ko-KR';
    utt.rate = 1.25;
    utt.pitch = 1.6;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utt);
  } else {
    playPopSound();
  }
}

/** 칭찬 메시지를 한국어 TTS로 발화 */
export function speakPraise(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = 'ko-KR';
  utt.rate = 0.92;
  utt.pitch = 1.3;
  window.speechSynthesis.speak(utt);
}

/** 진동 피드백 (Vibration API — Android 지원, iOS 미지원) */
export function vibrate(pattern = [50]) {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
}
