// Basic Canvas 2D renderer
// Draws the ship as a triangle, camera follows the ship.

const SHIP_SIZE = 20;
const GRID_SPACING = 200;
const GRID_COLOR = '#1a1a2e';

export function initRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  resize(canvas);
  window.addEventListener('resize', () => resize(canvas));
  return ctx;
}

function resize(canvas) {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

export function render(ctx, canvas, ship, input) {
  const w = canvas.width;
  const h = canvas.height;

  // Clear
  ctx.fillStyle = '#0a0a1a';
  ctx.fillRect(0, 0, w, h);

  // Camera offset: ship at center of screen
  const camX = ship.x - w / 2;
  const camY = ship.y - h / 2;

  // Draw grid (provides sense of movement)
  drawGrid(ctx, w, h, camX, camY);

  // Draw thrusters behind ship layer
  drawThrusters(ctx, w, h, ship, input);

  // Draw ship
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(ship.angle);

  ctx.beginPath();
  ctx.moveTo(SHIP_SIZE, 0);                          // nose
  ctx.lineTo(-SHIP_SIZE * 0.7, -SHIP_SIZE * 0.6);   // top-left
  ctx.lineTo(-SHIP_SIZE * 0.4, 0);                   // indent
  ctx.lineTo(-SHIP_SIZE * 0.7, SHIP_SIZE * 0.6);    // bottom-left
  ctx.closePath();

  ctx.fillStyle = '#4fc3f7';
  ctx.fill();
  ctx.strokeStyle = '#81d4fa';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.restore();
}

function drawGrid(ctx, w, h, camX, camY) {
  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = 1;

  const startX = -(camX % GRID_SPACING);
  const startY = -(camY % GRID_SPACING);

  ctx.beginPath();
  for (let x = startX; x < w; x += GRID_SPACING) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
  }
  for (let y = startY; y < h; y += GRID_SPACING) {
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
  }
  ctx.stroke();
}

function drawThrusters(ctx, w, h, ship, input) {
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(ship.angle);

  // Left thruster position (top-left of ship, negative Y in ship-local)
  drawThrusterFlame(ctx, -SHIP_SIZE * 0.5, -SHIP_SIZE * 0.5, input.rightX, -input.rightY);
  // Right thruster position (bottom-left of ship, positive Y in ship-local)
  drawThrusterFlame(ctx, -SHIP_SIZE * 0.5, SHIP_SIZE * 0.5, input.leftX, -input.leftY);

  ctx.restore();
}

function drawThrusterFlame(ctx, tx, ty, stickX, stickY) {
  const magnitude = Math.sqrt(stickX * stickX + stickY * stickY);
  if (magnitude < 0.05) return;

  // Map stick to ship-local: ship +X = forward = stickY, ship +Y = right = stickX
  const thrustLocalX = stickY / magnitude;
  const thrustLocalY = stickX / magnitude;

  // Flame points opposite to thrust direction (exhaust)
  const flameX = -thrustLocalX;
  const flameY = -thrustLocalY;
  const length = SHIP_SIZE * 0.8 * magnitude;

  ctx.save();
  ctx.translate(tx, ty);

  const alpha = magnitude * 0.8;
  const grad = ctx.createRadialGradient(0, 0, 0, flameX * length * 0.5, flameY * length * 0.5, length * 0.5);
  grad.addColorStop(0, `rgba(255, 220, 80, ${alpha})`);
  grad.addColorStop(1, `rgba(255, 100, 20, 0)`);

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(flameX * length * 0.5, flameY * length * 0.5, length * 0.5, length * 0.25, Math.atan2(flameY, flameX), 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
