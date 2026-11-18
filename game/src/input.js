// Lumen Breaker — input. Keyboard state plus mouse position over the canvas.
// The paddle follows the mouse when the mouse moves, and the arrow keys / A-D
// drive it otherwise. Click / Space launches the ball.

import { KEYS } from './config.js';

export function createInput(canvas) {
  const input = {
    left: false,
    right: false,
    mouseX: null, // canvas-space x, or null when the mouse never moved
    mouseActive: false,
    launchPressed: false, // edge-triggered: true for one frame after press
    pausePressed: false,
    restartPressed: false,
    mutePressed: false,
    anyKeyPressed: false,
  };

  function isKey(list, code) {
    return list.includes(code);
  }

  window.addEventListener('keydown', (e) => {
    if (isKey(KEYS.left, e.code)) { input.left = true; e.preventDefault(); }
    if (isKey(KEYS.right, e.code)) { input.right = true; e.preventDefault(); }
    if (isKey(KEYS.launch, e.code)) {
      if (!e.repeat) input.launchPressed = true;
      input.anyKeyPressed = true;
      e.preventDefault();
    }
    if (isKey(KEYS.pause, e.code) && !e.repeat) input.pausePressed = true;
    if (isKey(KEYS.restart, e.code) && !e.repeat) input.restartPressed = true;
    if (isKey(KEYS.mute, e.code) && !e.repeat) input.mutePressed = true;
    if (!isKey(KEYS.left, e.code) && !isKey(KEYS.right, e.code)) input.anyKeyPressed = true;
  });

  window.addEventListener('keyup', (e) => {
    if (isKey(KEYS.left, e.code)) input.left = false;
    if (isKey(KEYS.right, e.code)) input.right = false;
  });

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    input.mouseX = ((e.clientX - rect.left) / rect.width) * canvas.width;
    input.mouseActive = true;
  });

  canvas.addEventListener('mousedown', (e) => {
    e.preventDefault();
    input.launchPressed = true;
    input.anyKeyPressed = true;
    const rect = canvas.getBoundingClientRect();
    input.mouseX = ((e.clientX - rect.left) / rect.width) * canvas.width;
    input.mouseActive = true;
  });

  window.addEventListener('blur', () => {
    input.left = false;
    input.right = false;
  });

  // Call once per frame after the game has read the edge flags.
  input.consumeEdges = () => {
    input.launchPressed = false;
    input.pausePressed = false;
    input.restartPressed = false;
    input.mutePressed = false;
    input.anyKeyPressed = false;
  };

  return input;
}
