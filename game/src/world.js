// Lumen Breaker — world: the game state and its update step. Owns the paddle,
// balls, bricks, particles and power-ups, the score / lives / level, and the
// flow between title, play, pause, level-clear, game-over and victory.

import { TUNE, VIEW_W, VIEW_H, BRICK, POWERUPS } from './config.js';
import { LEVELS, buildBricks, breakableCount } from './levels.js';
import {
  makePaddle, makeBall, launchBall, paddleWidth, burst,
  rollPowerup, circleHitsRect, clamp,
} from './entities.js';
import { sfx, unlockAudio, setMuted, isMuted } from './audio.js';

export const STATES = {
  TITLE: 'title',
  SERVE: 'serve', // ball stuck on the paddle, waiting for launch
  PLAY: 'play',
  PAUSE: 'pause',
  CLEAR: 'clear', // level cleared, waiting to continue
  OVER: 'over',
  WIN: 'win',
};

const FIELD = { x: 24, y: 0, w: VIEW_W - 48, h: VIEW_H };

export function loadBest() {
  try {
    return Number(window.localStorage.getItem('lumen-breaker-best') || 0) || 0;
  } catch (_e) {
    return 0;
  }
}

export function saveBest(score) {
  try {
    window.localStorage.setItem('lumen-breaker-best', String(score));
  } catch (_e) { /* storage is a nice-to-have */ }
}

export function createWorld() {
  return {
    state: STATES.TITLE,
    score: 0,
    best: loadBest(),
    lives: TUNE.lives,
    level: 0, // 0-based index into LEVELS
    levelName: LEVELS[0].name,
    chain: 0, // consecutive bricks broken without touching the paddle
    chainTimer: 0,
    paddle: makePaddle(),
    balls: [],
    bricks: [],
    particles: [],
    powerups: [],
    ballsLeft: 0,
    time: 0,
    slowUntil: 0,
    shake: 0,
    message: '',
    messageUntil: 0,
    stats: { bricksBroken: 0, powerupsCaught: 0, ballsLost: 0 },
    demo: false, // title-screen attract mode: the game plays itself behind the title
  };
}

export function startLevel(world, levelIndex) {
  world.level = levelIndex;
  world.levelName = LEVELS[levelIndex].name;
  world.bricks = buildBricks(levelIndex, FIELD);
  world.ballsLeft = breakableCount(world.bricks);
  world.particles = [];
  world.powerups = [];
  world.balls = [makeBall(VIEW_W / 2, TUNE.paddleY - TUNE.ballR - 2, 0, ballSpeed(world))];
  world.paddle = makePaddle();
  world.chain = 0;
  world.state = STATES.SERVE;
  world.message = `LEVEL ${levelIndex + 1} — ${world.levelName}`;
  world.messageUntil = world.time + 2.2;
}

export function startGame(world) {
  world.score = 0;
  world.lives = TUNE.lives;
  world.stats = { bricksBroken: 0, powerupsCaught: 0, ballsLost: 0 };
  startLevel(world, 0);
}

function ballSpeed(world) {
  const base = TUNE.ballSpeed + world.level * TUNE.ballSpeedPerLevel;
  const slowed = world.time < world.slowUntil ? 0.62 : 1;
  return Math.min(TUNE.ballMaxSpeed, base) * slowed;
}

function addScore(world, points, x, y) {
  // Attract mode behind the title plays for show only: it never scores.
  if (!world.demo) {
    world.score += points;
    if (world.score > world.best) {
      world.best = world.score;
      saveBest(world.best);
    }
  }
  if (x !== undefined) {
    world.particles.push({
      x, y, vx: 0, vy: -46, color: '#ffffff', life: 0.7, maxLife: 0.7,
      size: 13, text: `+${points}`,
    });
  }
}

function dropPowerup(world, brick) {
  const p = rollPowerup(brick.kind);
  if (!p) return;
  p.x = brick.x + brick.w / 2 - p.w / 2;
  p.y = brick.y + brick.h / 2;
  world.powerups.push(p);
}

function breakBrick(world, brick) {
  const def = BRICK[brick.kind];
  world.bricks = world.bricks.filter((b) => b !== brick);
  world.stats.bricksBroken += 1;
  world.chain += 1;
  world.chainTimer = 2;
  const chainBonus = Math.min(world.chain - 1, 8) * 25;
  addScore(world, def.points + chainBonus, brick.x + brick.w / 2, brick.y);
  burst(world.particles, brick.x + brick.w / 2, brick.y + brick.h / 2, def.colors[0], brick.kind === 'gold' ? 16 : 10);
  world.shake = Math.max(world.shake, brick.kind === 'gold' ? 5 : 3);
  dropPowerup(world, brick);
  if (brick.kind !== 'steel') world.ballsLeft -= 1;
  sfx.brick();
  if (world.ballsLeft <= 0) {
    const bonus = TUNE.levelClearBonus * (world.level + 1) + world.lives * TUNE.lifeBonus;
    addScore(world, bonus);
    world.balls = [];
    world.powerups = [];
    if (world.level + 1 >= TUNE.levelCount) {
      world.state = STATES.WIN;
      sfx.victory();
    } else {
      world.state = STATES.CLEAR;
      sfx.levelClear();
    }
  }
}

function hitBrick(world, brick) {
  if (brick.kind === 'steel') {
    brick.flash = 0.15;
    sfx.steel();
    return;
  }
  brick.hp -= 1;
  brick.flash = 0.15;
  if (brick.hp <= 0) breakBrick(world, brick);
  else sfx.tough();
}

function applyPowerup(world, kind) {
  world.stats.powerupsCaught += 1;
  const label = POWERUPS[kind].label;
  if (kind === 'wide') {
    world.paddle.wideUntil = world.time + TUNE.wideTime;
    world.message = 'WIDE PADDLE!';
  } else if (kind === 'multi') {
    const speed = ballSpeed(world);
    const live = world.balls.filter((b) => !b.stuck);
    const source = live[0] || world.balls[0];
    if (source) {
      for (const off of [-0.6, 0.6]) {
        const nb = makeBall(source.x, source.y, 0, speed);
        const baseAngle = Math.atan2(source.vy, source.vx);
        nb.vx = Math.cos(baseAngle + off) * speed;
        nb.vy = Math.sin(baseAngle + off) * speed;
        nb.stuck = false;
        world.balls.push(nb);
      }
    }
    world.message = 'MULTI BALL!';
  } else if (kind === 'slow') {
    world.slowUntil = world.time + TUNE.slowTime;
    world.message = 'SLOW BALL!';
  } else if (kind === 'life') {
    world.lives += 1;
    world.message = 'EXTRA LIFE!';
  }
  world.messageUntil = world.time + 1.6;
  sfx.powerup();
}

function loseBall(world, ball) {
  world.balls = world.balls.filter((b) => b !== ball);
  if (world.balls.length > 0) return;
  world.stats.ballsLost += 1;
  world.lives -= 1;
  world.chain = 0;
  sfx.loseLife();
  if (world.lives <= 0) {
    world.state = STATES.OVER;
    sfx.gameOver();
  } else {
    world.balls = [makeBall(VIEW_W / 2, TUNE.paddleY - TUNE.ballR - 2, 0, ballSpeed(world))];
    world.paddle = makePaddle();
    world.state = STATES.SERVE;
    world.message = 'BALL LOST — CLICK TO LAUNCH';
    world.messageUntil = world.time + 2;
  }
}

function updatePaddle(world, input, dt) {
  const paddle = world.paddle;
  const w = paddleWidth(paddle, world.time);
  if (input.left) paddle.x -= TUNE.paddleSpeed * dt;
  if (input.right) paddle.x += TUNE.paddleSpeed * dt;
  if (input.mouseActive && input.mouseX !== null && !input.left && !input.right) {
    // Mouse steers directly; keyboard overrides while held.
    paddle.x = input.mouseX - w / 2;
  }
  paddle.x = clamp(paddle.x, FIELD.x, FIELD.x + FIELD.w - w);
}

function updateBalls(world, dt) {
  const speed = ballSpeed(world);
  for (const ball of [...world.balls]) {
    if (ball.stuck) {
      ball.x = world.paddle.x + paddleWidth(world.paddle, world.time) / 2;
      ball.y = TUNE.paddleY - ball.r - 2;
      continue;
    }
    // Keep the speed constant even after bounces change direction.
    const cur = Math.hypot(ball.vx, ball.vy) || speed;
    ball.vx = (ball.vx / cur) * speed;
    ball.vy = (ball.vy / cur) * speed;
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    ball.trail.push({ x: ball.x, y: ball.y });
    if (ball.trail.length > 10) ball.trail.shift();

    // Walls.
    if (ball.x - ball.r < FIELD.x) { ball.x = FIELD.x + ball.r; ball.vx = Math.abs(ball.vx); sfx.wall(); }
    if (ball.x + ball.r > FIELD.x + FIELD.w) { ball.x = FIELD.x + FIELD.w - ball.r; ball.vx = -Math.abs(ball.vx); sfx.wall(); }
    if (ball.y - ball.r < 56) { ball.y = 56 + ball.r; ball.vy = Math.abs(ball.vy); sfx.wall(); }
    if (ball.y - ball.r > VIEW_H + 40) { loseBall(world, ball); continue; }

    // Paddle.
    const pw = paddleWidth(world.paddle, world.time);
    const paddleRect = { x: world.paddle.x, y: world.paddle.y, w: pw, h: world.paddle.h };
    if (ball.vy > 0 && circleHitsRect(ball.x, ball.y, ball.r, paddleRect)) {
      const rel = clamp((ball.x - (world.paddle.x + pw / 2)) / (pw / 2), -1, 1);
      const angle = -Math.PI / 2 + rel * (Math.PI / 3);
      ball.vx = Math.cos(angle) * speed;
      ball.vy = Math.sin(angle) * speed;
      ball.y = world.paddle.y - ball.r - 1;
      world.chain = 0;
      sfx.paddle();
    }

    // Bricks: test the ball against each brick once per step.
    for (const brick of [...world.bricks]) {
      if (!circleHitsRect(ball.x, ball.y, ball.r, brick)) continue;
      const prevX = ball.x - ball.vx * dt;
      const prevY = ball.y - ball.vy * dt;
      const hitSide = prevX + ball.r <= brick.x || prevX - ball.r >= brick.x + brick.w;
      const hitTop = prevY + ball.r <= brick.y || prevY - ball.r >= brick.y + brick.h;
      if (hitSide && !hitTop) ball.vx = -ball.vx;
      else if (hitTop && !hitSide) ball.vy = -ball.vy;
      else { ball.vx = -ball.vx; ball.vy = -ball.vy; }
      hitBrick(world, brick);
      break;
    }
  }
}

function updateParticles(world, dt) {
  for (const p of world.particles) {
    p.life -= dt;
    p.x += (p.vx || 0) * dt;
    p.y += (p.vy || 0) * dt;
    if (p.vy !== undefined && !p.text) p.vy += 320 * dt; // gravity for shards
  }
  world.particles = world.particles.filter((p) => p.life > 0);
}

function updatePowerups(world, dt) {
  const pw = paddleWidth(world.paddle, world.time);
  const paddleRect = { x: world.paddle.x, y: world.paddle.y, w: pw, h: world.paddle.h + 6 };
  for (const p of [...world.powerups]) {
    p.y += p.vy * dt;
    const overlaps =
      p.x < paddleRect.x + paddleRect.w && p.x + p.w > paddleRect.x &&
      p.y < paddleRect.y + paddleRect.h && p.y + p.h > paddleRect.y;
    if (overlaps) {
      applyPowerup(world, p.kind);
      world.powerups = world.powerups.filter((q) => q !== p);
    } else if (p.y > VIEW_H + 30) {
      world.powerups = world.powerups.filter((q) => q !== p);
    }
  }
}

function updateDemo(world, dt) {
  // Attract mode behind the title: the paddle tracks the lowest ball itself.
  // The demo never leaves the TITLE state, whatever the ball does.
  if (world.balls.length === 0 || world.ballsLeft <= 0) {
    world.lives = TUNE.lives;
    startLevel(world, (world.level + 1) % TUNE.levelCount);
    world.state = STATES.TITLE;
  }
  const ball = world.balls.find((b) => !b.stuck) || world.balls[0];
  if (ball && ball.stuck) launchBall(ball, ballSpeed(world));
  if (ball) {
    const pw = paddleWidth(world.paddle, world.time);
    const target = clamp(ball.x - pw / 2, FIELD.x, FIELD.x + FIELD.w - pw);
    world.paddle.x += clamp(target - world.paddle.x, -TUNE.paddleSpeed * dt, TUNE.paddleSpeed * dt);
  }
  updateBalls(world, dt);
  updateParticles(world, dt);
  updatePowerups(world, dt);
  // A lost ball or a cleared level inside the demo just restarts the demo.
  if (world.state !== STATES.TITLE) {
    world.lives = TUNE.lives;
    startLevel(world, (world.level + 1) % TUNE.levelCount);
    world.state = STATES.TITLE;
  }
}

// One fixed update step. input edge flags are consumed by the caller afterwards.
export function update(world, input, dt) {
  world.time += dt;
  if (world.chainTimer > 0) {
    world.chainTimer -= dt;
    if (world.chainTimer <= 0) world.chain = 0;
  }
  if (world.shake > 0) world.shake = Math.max(0, world.shake - dt * 18);
  for (const b of world.bricks) if (b.flash > 0) b.flash -= dt;

  if (input.mutePressed) {
    setMuted(!isMuted());
    world.message = isMuted() ? 'SOUND OFF' : 'SOUND ON';
    world.messageUntil = world.time + 1;
  }

  switch (world.state) {
    case STATES.TITLE: {
      if (!world.demo) {
        world.demo = true;
        startLevel(world, 0);
        world.state = STATES.TITLE;
      }
      updateDemo(world, dt);
      if (input.launchPressed || input.anyKeyPressed) {
        unlockAudio();
        world.demo = false;
        startGame(world);
      }
      break;
    }
    case STATES.SERVE: {
      updatePaddle(world, input, dt);
      updateBalls(world, dt);
      updateParticles(world, dt);
      if (input.launchPressed) {
        unlockAudio();
        for (const b of world.balls) if (b.stuck) launchBall(b, ballSpeed(world));
        world.state = STATES.PLAY;
        sfx.launch();
      }
      break;
    }
    case STATES.PLAY: {
      updatePaddle(world, input, dt);
      updateBalls(world, dt);
      updateParticles(world, dt);
      updatePowerups(world, dt);
      if (input.pausePressed) world.state = STATES.PAUSE;
      break;
    }
    case STATES.PAUSE: {
      if (input.pausePressed || input.launchPressed) world.state = STATES.PLAY;
      break;
    }
    case STATES.CLEAR: {
      updateParticles(world, dt);
      if (input.launchPressed || input.anyKeyPressed) {
        unlockAudio();
        startLevel(world, world.level + 1);
      }
      break;
    }
    case STATES.OVER:
    case STATES.WIN: {
      updateParticles(world, dt);
      if (input.restartPressed || input.launchPressed) {
        unlockAudio();
        startGame(world);
      }
      break;
    }
    default:
      break;
  }
}

// Reset to the title screen (used by the R key from anywhere).
export function backToTitle(world) {
  world.demo = false;
  world.state = STATES.TITLE;
  world.score = 0;
  world.lives = TUNE.lives;
  world.bricks = [];
  world.balls = [];
  world.particles = [];
  world.powerups = [];
}
