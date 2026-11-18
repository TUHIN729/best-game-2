// Lumen Breaker — bootstrap. Wires the canvas to the world: fixed-timestep
// loop, resize-to-fit scaling, the R key back to the title, and the ?shot=
// screenshot mode used to render the entry's screenshots.

import { VIEW_W, VIEW_H } from './config.js';
import { createWorld, update, backToTitle, STATES } from './world.js';
import { createInput } from './input.js';
import { render } from './render.js';
import { applyShot } from './shots.js';
import { unlockAudio } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

canvas.width = VIEW_W;
canvas.height = VIEW_H;

const input = createInput(canvas);
const world = createWorld();
let shotMode = false;

function fitCanvas() {
  const scale = Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H);
  canvas.style.width = `${Math.floor(VIEW_W * scale)}px`;
  canvas.style.height = `${Math.floor(VIEW_H * scale)}px`;
}
window.addEventListener('resize', fitCanvas);
fitCanvas();

function announce() {
  if (!statusEl) return;
  const lines = {
    [STATES.TITLE]: 'Lumen Breaker. Press space to play.',
    [STATES.SERVE]: `Level ${world.level + 1}. Press space to launch the ball.`,
    [STATES.PLAY]: `Score ${world.score}. Lives ${world.lives}. Level ${world.level + 1}.`,
    [STATES.PAUSE]: 'Paused.',
    [STATES.CLEAR]: `Level ${world.level + 1} clear. Score ${world.score}.`,
    [STATES.OVER]: `Game over. Score ${world.score}. Press space to play again.`,
    [STATES.WIN]: `You win. Final score ${world.score}. Press space to play again.`,
  };
  const text = lines[world.state] || '';
  if (statusEl.textContent !== text) statusEl.textContent = text;
}

// Fixed 60 Hz steps, decoupled from the display refresh rate.
const STEP = 1 / 60;
let last = performance.now();
let acc = 0;
let lastState = world.state;

function frame(now) {
  const elapsed = Math.min(0.25, (now - last) / 1000);
  last = now;
  acc += elapsed;
  let steps = 0;
  while (acc >= STEP && steps < 5) {
    if (input.restartPressed) {
      unlockAudio();
      backToTitle(world);
    }
    update(world, input, STEP);
    input.consumeEdges();
    acc -= STEP;
    steps += 1;
  }
  if (steps === 5) acc = 0; // drop backlog rather than spiral
  render(ctx, world);
  if (world.state !== lastState) {
    lastState = world.state;
    announce();
  }
  if (!shotMode) requestAnimationFrame(frame);
}

function startShotMode() {
  const params = new URLSearchParams(window.location.search);
  const scene = params.get('shot');
  if (!scene) return false;
  const seed = Number(params.get('seed') || '1') || 1;
  shotMode = true;
  applyShot(world, scene, seed);
  render(ctx, world);
  announce();
  window.__shotReady = true;
  return true;
}

if (!startShotMode()) {
  announce();
  requestAnimationFrame(frame);
}
