// Lumen Breaker — entities: the paddle, balls, particles and falling power-ups.
// Plain data objects with small factory helpers; the world update in world.js
// moves them, render.js draws them.

import { TUNE, VIEW_W, VIEW_H, POWERUPS } from './config.js';

export function makePaddle() {
  return {
    x: VIEW_W / 2 - TUNE.paddleW / 2,
    y: TUNE.paddleY,
    w: TUNE.paddleW,
    h: TUNE.paddleH,
    wideUntil: 0, // game time until which the paddle stays wide
  };
}

export function paddleWidth(paddle, now) {
  return now < paddle.wideUntil ? paddle.w * 1.6 : paddle.w;
}

export function makeBall(x, y, angle, speed) {
  return {
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    r: TUNE.ballR,
    stuck: true, // stuck to the paddle until launched
    trail: [],
  };
}

export function launchBall(ball, speed) {
  const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.9;
  ball.vx = Math.cos(angle) * speed;
  ball.vy = Math.sin(angle) * speed;
  ball.stuck = false;
}

export function makeParticle(x, y, color, speed, life) {
  const a = Math.random() * Math.PI * 2;
  const s = speed * (0.4 + Math.random() * 0.8);
  return {
    x, y,
    vx: Math.cos(a) * s,
    vy: Math.sin(a) * s - 40,
    color,
    life,
    maxLife: life,
    size: 2 + Math.random() * 4,
  };
}

export function burst(particles, x, y, color, count) {
  for (let i = 0; i < count; i++) {
    particles.push(makeParticle(x, y, color, 260, 0.45 + Math.random() * 0.35));
  }
}

const POWERUP_KEYS = Object.keys(POWERUPS);

export function makePowerup(x, y, kind) {
  return {
    x, y,
    w: 46, h: 20,
    vy: TUNE.powerupFallSpeed,
    kind: kind || POWERUP_KEYS[Math.floor(Math.random() * POWERUP_KEYS.length)],
  };
}

// A power-up falls from a broken brick: bonus bricks always drop one, plain
// bricks sometimes do. Life is rarer than the rest.
export function rollPowerup(brickKind) {
  if (brickKind === 'bonus') return makePowerup(0, 0, 'life' in POWERUPS && Math.random() < 0.25 ? 'life' : POWERUP_KEYS[Math.floor(Math.random() * 3)]);
  if (Math.random() < TUNE.powerupChance) {
    return makePowerup(0, 0, Math.random() < 0.12 ? 'life' : POWERUP_KEYS[Math.floor(Math.random() * 3)]);
  }
  return null;
}

// Circle vs axis-aligned rectangle: true when they overlap.
export function circleHitsRect(cx, cy, r, rect) {
  const nx = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const ny = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy <= r * r;
}

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export { VIEW_W, VIEW_H };
