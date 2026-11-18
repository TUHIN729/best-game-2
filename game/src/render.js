// Lumen Breaker — render: everything drawn on the canvas. Background stars and
// nebula, bricks, paddle, balls, particles, power-ups, the HUD, and every
// screen (title, pause, level clear, game over, victory). All art is drawn in
// code; there are no image assets.

import { PALETTE, VIEW_W, VIEW_H, BRICK, POWERUPS, TUNE } from './config.js';
import { STATES } from './world.js';
import { paddleWidth } from './entities.js';
import { isMuted } from './audio.js';

// A fixed starfield so the background is stable frame to frame.
const STARS = [];
for (let i = 0; i < 90; i++) {
  STARS.push({
    x: (i * 173.31) % VIEW_W,
    y: (i * 97.17) % VIEW_H,
    r: 0.6 + ((i * 7) % 10) / 10,
    tw: (i % 5) * 0.7,
  });
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawBackground(ctx, time) {
  const grad = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  grad.addColorStop(0, PALETTE.bgTop);
  grad.addColorStop(1, PALETTE.bgBottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // Two soft nebula blobs.
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = '#5b4bc0';
  ctx.beginPath(); ctx.ellipse(180, 150, 220, 120, 0.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#c04b8a';
  ctx.beginPath(); ctx.ellipse(800, 480, 260, 130, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
  for (const s of STARS) {
    ctx.globalAlpha = 0.35 + 0.45 * Math.abs(Math.sin(time * 0.6 + s.tw));
    ctx.fillStyle = PALETTE.star;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawBricks(ctx, world) {
  for (const b of world.bricks) {
    const def = BRICK[b.kind];
    const [c1, c2] = def.colors;
    const grad = ctx.createLinearGradient(b.x, b.y, b.x, b.y + b.h);
    grad.addColorStop(0, c1);
    grad.addColorStop(1, c2);
    ctx.fillStyle = grad;
    roundRect(ctx, b.x, b.y, b.w, b.h, 6);
    ctx.fill();
    // Glassy highlight on top.
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    roundRect(ctx, b.x + 3, b.y + 3, b.w - 6, 7, 4);
    ctx.fill();
    if (b.kind === 'steel') {
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(b.x + 8, b.y + b.h - 6);
      ctx.lineTo(b.x + b.w - 8, b.y + 6);
      ctx.moveTo(b.x + 8, b.y + 6);
      ctx.lineTo(b.x + b.w - 8, b.y + b.h - 6);
      ctx.stroke();
    }
    if (b.kind === 'bonus') {
      ctx.fillStyle = '#08324a';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', b.x + b.w / 2, b.y + b.h / 2 + 1);
    }
    if ((b.kind === 'tough' || b.kind === 'gold') && b.hp < b.maxHp) {
      // Cracked look as the brick weakens.
      ctx.strokeStyle = 'rgba(0,0,0,0.45)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(b.x + b.w * 0.3, b.y + 4);
      ctx.lineTo(b.x + b.w * 0.5, b.y + b.h * 0.55);
      ctx.lineTo(b.x + b.w * 0.35, b.y + b.h - 4);
      ctx.stroke();
    }
    if (b.flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${Math.min(0.8, b.flash * 5)})`;
      roundRect(ctx, b.x, b.y, b.w, b.h, 6);
      ctx.fill();
    }
  }
}

function drawPaddle(ctx, world) {
  const p = world.paddle;
  const w = paddleWidth(p, world.time);
  const grad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
  grad.addColorStop(0, PALETTE.paddle);
  grad.addColorStop(1, PALETTE.paddleEdge);
  ctx.fillStyle = grad;
  roundRect(ctx, p.x, p.y, w, p.h, 7);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  roundRect(ctx, p.x + 6, p.y + 2, w - 12, 4, 2);
  ctx.fill();
  if (world.time < p.wideUntil) {
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('WIDE', p.x + w / 2, p.y - 6);
  }
}

function drawBalls(ctx, world) {
  for (const ball of world.balls) {
    for (let i = 0; i < ball.trail.length; i++) {
      const t = ball.trail[i];
      ctx.globalAlpha = (i / ball.trail.length) * 0.25;
      ctx.fillStyle = PALETTE.ballGlow;
      ctx.beginPath();
      ctx.arc(t.x, t.y, ball.r * (0.4 + 0.6 * (i / ball.trail.length)), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = PALETTE.ballGlow;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r + 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.ball;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawParticles(ctx, world) {
  for (const p of world.particles) {
    const a = Math.max(0, p.life / p.maxLife);
    if (p.text) {
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.font = `bold ${p.size}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(p.text, p.x, p.y);
      continue;
    }
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;
}

function drawPowerups(ctx, world) {
  for (const p of world.powerups) {
    const def = POWERUPS[p.kind];
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    roundRect(ctx, p.x + 2, p.y + 3, p.w, p.h, 8);
    ctx.fill();
    ctx.fillStyle = def.color;
    roundRect(ctx, p.x, p.y, p.w, p.h, 8);
    ctx.fill();
    ctx.fillStyle = '#0b1026';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(def.label, p.x + p.w / 2, p.y + p.h / 2 + 1);
  }
}

function drawHud(ctx, world) {
  ctx.fillStyle = 'rgba(6, 9, 24, 0.72)';
  ctx.fillRect(0, 0, VIEW_W, 52);
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 19px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`SCORE  ${world.score}`, 24, 27);
  ctx.fillStyle = PALETTE.dim;
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillText(`BEST  ${world.best}`, 220, 27);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillText(`LEVEL ${world.level + 1} / ${TUNE.levelCount}  ·  ${world.levelName}`, VIEW_W / 2, 27);
  ctx.textAlign = 'right';
  ctx.fillStyle = world.lives <= 1 ? PALETTE.danger : PALETTE.text;
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillText(`LIVES  ${'●'.repeat(Math.max(0, world.lives))}`, VIEW_W - 24, 20);
  ctx.fillStyle = PALETTE.dim;
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText(`BRICKS LEFT  ${world.ballsLeft}    ${isMuted() ? 'MUTED (M)' : 'SOUND ON (M)'}`, VIEW_W - 24, 40);
  if (world.time < world.messageUntil && world.message) {
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.fillText(world.message, VIEW_W / 2, 96);
  }
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = PALETTE.panel;
  roundRect(ctx, x, y, w, h, 16);
  ctx.fill();
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function centered(ctx, text, y, size, color, bold = true) {
  ctx.fillStyle = color;
  ctx.font = `${bold ? 'bold ' : ''}${size}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, VIEW_W / 2, y);
}

function drawTitle(ctx, world) {
  panel(ctx, VIEW_W / 2 - 330, 150, 660, 330);
  centered(ctx, 'LUMEN BREAKER', 205, 52, PALETTE.gold);
  centered(ctx, 'Shatter every prism. Do not let the light fall.', 258, 19, PALETTE.text, false);
  centered(ctx, 'MOUSE or ← → to move  ·  CLICK or SPACE to launch', 305, 17, PALETTE.dim, false);
  centered(ctx, 'Catch falling power-ups: WIDE · MULTI · SLOW · +1 LIFE', 332, 17, PALETTE.dim, false);
  centered(ctx, 'Steel prisms never break — clear the rest to win the level.', 359, 17, PALETTE.dim, false);
  centered(ctx, '5 levels. 3 lives. Best score ' + world.best + '.', 396, 17, PALETTE.text, false);
  centered(ctx, 'CLICK OR PRESS SPACE TO PLAY', 445, 22, PALETTE.paddle);
  centered(ctx, 'P pause   ·   M mute   ·   R restart', 505, 14, PALETTE.dim, false);
}

function drawPause(ctx) {
  ctx.fillStyle = 'rgba(5, 8, 20, 0.6)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  panel(ctx, VIEW_W / 2 - 240, 230, 480, 160);
  centered(ctx, 'PAUSED', 285, 36, PALETTE.text);
  centered(ctx, 'Press P or CLICK to keep playing', 335, 17, PALETTE.dim, false);
}

function drawClear(ctx, world) {
  panel(ctx, VIEW_W / 2 - 300, 200, 600, 240);
  centered(ctx, `LEVEL ${world.level + 1} CLEAR!`, 255, 40, PALETTE.gold);
  centered(ctx, `${world.levelName} — bonus ${TUNE.levelClearBonus * (world.level + 1) + world.lives * TUNE.lifeBonus} points`, 305, 18, PALETTE.text, false);
  centered(ctx, `Score ${world.score}  ·  Lives ${world.lives}`, 340, 18, PALETTE.text, false);
  centered(ctx, 'CLICK OR PRESS SPACE FOR THE NEXT LEVEL', 395, 20, PALETTE.paddle);
}

function drawOver(ctx, world) {
  panel(ctx, VIEW_W / 2 - 300, 180, 600, 280);
  centered(ctx, 'GAME OVER', 235, 44, PALETTE.danger);
  centered(ctx, `The light fell on level ${world.level + 1} — ${world.levelName}.`, 290, 18, PALETTE.text, false);
  centered(ctx, `Score ${world.score}  ·  Best ${world.best}`, 325, 20, PALETTE.text, false);
  centered(ctx, `Prisms shattered ${world.stats.bricksBroken}  ·  Power-ups caught ${world.stats.powerupsCaught}`, 360, 16, PALETTE.dim, false);
  centered(ctx, 'PRESS SPACE OR CLICK TO PLAY AGAIN', 415, 20, PALETTE.paddle);
}

function drawWin(ctx, world) {
  panel(ctx, VIEW_W / 2 - 320, 170, 640, 300);
  centered(ctx, 'YOU WIN!', 225, 48, PALETTE.gold);
  centered(ctx, 'Every prism in the Lumen is shattered. The light is yours.', 280, 18, PALETTE.text, false);
  centered(ctx, `Final score ${world.score}  ·  Best ${world.best}`, 320, 22, PALETTE.text, false);
  centered(ctx, `Prisms shattered ${world.stats.bricksBroken}  ·  Power-ups caught ${world.stats.powerupsCaught}  ·  Balls lost ${world.stats.ballsLost}`, 355, 16, PALETTE.dim, false);
  centered(ctx, 'PRESS SPACE OR CLICK TO PLAY AGAIN', 420, 20, PALETTE.paddle);
}

function drawServeHint(ctx) {
  centered(ctx, 'CLICK OR PRESS SPACE TO LAUNCH', VIEW_H - 120, 20, PALETTE.paddle);
}

export function render(ctx, world) {
  ctx.save();
  if (world.shake > 0) {
    ctx.translate((Math.random() - 0.5) * world.shake, (Math.random() - 0.5) * world.shake);
  }
  drawBackground(ctx, world.time);
  drawBricks(ctx, world);
  drawPowerups(ctx, world);
  drawPaddle(ctx, world);
  drawBalls(ctx, world);
  drawParticles(ctx, world);
  drawHud(ctx, world);
  ctx.restore();

  switch (world.state) {
    case STATES.TITLE:
      drawTitle(ctx, world);
      break;
    case STATES.PAUSE:
      drawPause(ctx);
      break;
    case STATES.CLEAR:
      drawClear(ctx, world);
      break;
    case STATES.OVER:
      drawOver(ctx, world);
      break;
    case STATES.WIN:
      drawWin(ctx, world);
      break;
    case STATES.SERVE:
      drawServeHint(ctx);
      break;
    default:
      break;
  }
}
