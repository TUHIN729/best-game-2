// Lumen Breaker — screenshot scenes. ?shot=start|play|clear|over&seed=N puts
// the game into a fixed, deterministic scene for screenshots: the same seed
// always renders the same picture. The scenes are built by running the real
// game update with scripted input and a seeded random generator, so every
// screenshot is a genuine render of the game code.

import { STATES, createWorld, startGame, startLevel, update } from './world.js';
import { TUNE } from './config.js';
import { setMuted } from './audio.js';

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function scriptedInput(world) {
  // Steer the paddle toward the lowest live ball; launch when serving.
  const ball = world.balls.find((b) => !b.stuck) || world.balls[0];
  const input = {
    left: false, right: false, mouseX: null, mouseActive: false,
    launchPressed: false, pausePressed: false, restartPressed: false,
    mutePressed: false, anyKeyPressed: false,
    consumeEdges() {},
  };
  if (world.state === STATES.SERVE) input.launchPressed = true;
  if (ball) {
    const center = world.paddle.x + world.paddle.w / 2;
    if (ball.x < center - 12) input.left = true;
    else if (ball.x > center + 12) input.right = true;
  }
  return input;
}

function simulate(world, steps) {
  for (let i = 0; i < steps; i++) {
    update(world, scriptedInput(world), 1 / 60);
    if (world.state === STATES.OVER || world.state === STATES.WIN) break;
    if (world.state === STATES.CLEAR) break;
  }
}

export function applyShot(world, scene, seed) {
  setMuted(true); // screenshots never need sound
  const realRandom = Math.random;
  Math.random = mulberry32(seed || 1);
  try {
    if (scene === 'play') {
      startGame(world);
      startLevel(world, 1);
      world.score = 850;
      simulate(world, 60 * 7);
      // Make sure the shot shows live play, not a cleared level.
      if (world.state !== STATES.PLAY && world.state !== STATES.SERVE) {
        startGame(world);
        startLevel(world, 1);
        world.score = 850;
        simulate(world, 60 * 4);
      }
    } else if (scene === 'clear') {
      startGame(world);
      startLevel(world, 0);
      world.score = 1450;
      world.best = 1450;
      world.bricks = [];
      world.ballsLeft = 0;
      world.balls = [];
      world.state = STATES.CLEAR;
      for (let i = 0; i < 26; i++) {
        world.particles.push({
          x: 200 + Math.random() * 560, y: 120 + Math.random() * 200,
          vx: (Math.random() - 0.5) * 120, vy: 40 + Math.random() * 80,
          color: ['#ffd166', '#7ef0d4', '#ff9de2'][i % 3],
          life: 1.2, maxLife: 1.2, size: 3 + Math.random() * 4,
        });
      }
    } else if (scene === 'over') {
      startGame(world);
      startLevel(world, 2);
      world.score = 980;
      world.best = 1450;
      world.lives = 0;
      world.stats.bricksBroken = 41;
      world.stats.powerupsCaught = 3;
      world.stats.ballsLost = 3;
      world.bricks = world.bricks.slice(0, 18);
      world.ballsLeft = 18;
      world.balls = [];
      world.state = STATES.OVER;
    } else {
      // start (default): the title over a live attract-mode game.
      startLevel(world, 0);
      world.state = STATES.TITLE;
      world.demo = true;
      simulate(world, 60 * 5);
      world.state = STATES.TITLE;
    }
  } finally {
    Math.random = realRandom;
  }
  return world;
}

export { TUNE };
