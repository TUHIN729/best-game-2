// Lumen Breaker — sound. All effects are synthesized with WebAudio oscillators;
// no audio files are shipped. The context is created lazily on the first user
// gesture so browsers never autoplay anything.

let ctx = null;
let muted = false;

export function setMuted(value) {
  muted = value;
}

export function isMuted() {
  return muted;
}

function ensureContext() {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  } catch (_e) {
    ctx = null;
  }
  return ctx;
}

// Unlock audio on a gesture (click / key press). Safe to call any time.
export function unlockAudio() {
  const c = ensureContext();
  if (c && c.state === 'suspended') c.resume().catch(() => {});
}

function tone(freq, dur, type, vol, slideTo) {
  if (muted) return;
  const c = ensureContext();
  if (!c) return;
  try {
    const t0 = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  } catch (_e) {
    /* audio is cosmetic; never break the game */
  }
}

export const sfx = {
  paddle() { tone(220, 0.07, 'square', 0.12, 330); },
  brick() { tone(520, 0.08, 'triangle', 0.16, 780); },
  tough() { tone(300, 0.06, 'square', 0.12, 240); },
  steel() { tone(140, 0.05, 'square', 0.1, 110); },
  wall() { tone(180, 0.05, 'sine', 0.08, 150); },
  powerup() { tone(660, 0.1, 'sine', 0.15, 990); tone(990, 0.14, 'sine', 0.12, 1320); },
  loseLife() { tone(320, 0.35, 'sawtooth', 0.14, 70); },
  levelClear() {
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.16, 'triangle', 0.16), i * 90));
  },
  victory() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => tone(f, 0.22, 'triangle', 0.16), i * 110));
  },
  gameOver() {
    [392, 330, 262, 196].forEach((f, i) => setTimeout(() => tone(f, 0.25, 'sawtooth', 0.12), i * 130));
  },
  launch() { tone(440, 0.08, 'sine', 0.12, 660); },
};
