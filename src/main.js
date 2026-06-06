import { pollGamepad } from './input.js';
import { createShip, updateShip } from './physics.js';
import { initRenderer, render } from './renderer.js';

const canvas = document.getElementById('game');
const ctx = initRenderer(canvas);

const ship = createShip(0, 0);

let lastTime = performance.now();

function loop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05); // cap at 50ms
  lastTime = now;

  const input = pollGamepad();
  updateShip(ship, input, dt);
  render(ctx, canvas, ship, input);

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
