// Lumen Breaker — configuration: canvas size, palette, tuning, brick kinds.
// Every value here is original to this game; the art is drawn in code.

export const VIEW_W = 960;
export const VIEW_H = 640;

export const PALETTE = {
  bgTop: '#0b1026',
  bgBottom: '#1b0f33',
  star: '#cdd7ff',
  panel: 'rgba(8, 12, 30, 0.82)',
  panelEdge: '#4a5aa8',
  text: '#f2f5ff',
  dim: '#9aa7d8',
  gold: '#ffd166',
  danger: '#ff5d73',
  paddle: '#7ef0d4',
  paddleEdge: '#2fbfa0',
  ball: '#ffffff',
  ballGlow: '#8ef6ff',
};

export const TUNE = {
  paddleW: 112,
  paddleH: 14,
  paddleY: VIEW_H - 46,
  paddleSpeed: 620, // px per second (keyboard)
  ballR: 8,
  ballSpeed: 380, // base speed, grows a little each level
  ballSpeedPerLevel: 26,
  ballMaxSpeed: 620,
  serveSpeed: 380,
  lives: 3,
  levelCount: 5,
  levelClearBonus: 250,
  lifeBonus: 150,
  powerupFallSpeed: 150,
  powerupChance: 0.09, // chance a plain brick drops a power-up
  wideTime: 14, // seconds the wide paddle lasts
  slowTime: 10, // seconds the slow ball lasts
};

// Brick kinds. hp = hits to break. points = score. unbreakable bricks never count
// toward the level-clear total.
export const BRICK = {
  plain: { hp: 1, points: 50, colors: ['#ff9f43', '#ff7b54'] },
  tough: { hp: 2, points: 120, colors: ['#a06cd5', '#7b4bc0'] },
  gold: { hp: 3, points: 200, colors: ['#ffd166', '#f4a900'] },
  steel: { hp: Infinity, points: 0, colors: ['#5a6b8a', '#3d4a66'], unbreakable: true },
  bonus: { hp: 1, points: 100, colors: ['#4dd6ff', '#2a9df4'] },
};

// Power-up kinds that can fall from broken bricks.
export const POWERUPS = {
  wide: { label: 'WIDE', color: '#7ef0d4', desc: 'Wider paddle' },
  multi: { label: 'MULTI', color: '#ff9de2', desc: 'Split ball' },
  slow: { label: 'SLOW', color: '#8ef6ff', desc: 'Slow ball' },
  life: { label: '+1 LIFE', color: '#ffd166', desc: 'Extra life' },
};

export const KEYS = {
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  launch: ['Space', 'Enter'],
  pause: ['KeyP', 'Escape'],
  restart: ['KeyR'],
  mute: ['KeyM'],
};
