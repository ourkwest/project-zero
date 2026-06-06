import { pollGamepad } from './input.js';
import { createShip, updateShip } from './physics.js';
import { initRenderer, render } from './renderer.js';
import { getCamera } from './camera.js';
import { drawHUD } from './hud.js';

const canvas = document.getElementById('game');
const ctx = initRenderer(canvas);

const ship = createShip(0, 0);

// Player state (will be driven by gameplay later)
const playerState = { health: 1, energy: 1, weapon: 0 };

let lastTime = performance.now();

function loop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05); // cap at 50ms
  lastTime = now;

  const input = pollGamepad();
  updateShip(ship, input, dt);
  render(ctx, canvas, ship, input);

  // HUD overlay
  const cam = getCamera(ship, canvas.width, canvas.height);
  drawHUD(ctx, canvas.width, canvas.height, playerState, [], cam);

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
