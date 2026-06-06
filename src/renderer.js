// Canvas 2D renderer with in-canvas perspective projection
// World rotates so ship faces up. Perspective foreshortens objects ahead.

import { getCamera } from './camera.js';
import { drawStarfield } from './starfield.js';

const SHIP_SIZE = 20;
const GRID_SPACING = 200;
const GRID_FADE_DIST = 1500; // grid fades out beyond this distance

// Perspective: virtual camera height above the plane.
// Higher = subtler perspective. Lower = more dramatic.
const CAM_HEIGHT = 600;

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

// Project a world-relative point (already rotated so +Y = ahead)
// to screen coordinates with perspective.
// ry: distance ahead of ship (positive = ahead = up on screen)
// rx: lateral offset (positive = right)
// Returns {sx, sy, scale} or null if behind camera.
function project(rx, ry, cam) {
  // ry is in "ship forward" space. Map to depth:
  // The ship is at screen position cam.screenY.
  // Points ahead (ry > 0) go toward the top.
  // Perspective: scale = CAM_HEIGHT / (CAM_HEIGHT + ry_offset)
  // where ry_offset shifts so the vanishing point is above the screen.
  const depth = CAM_HEIGHT + ry * 0.5; // ry > 0 (ahead) increases depth → smaller scale
  if (depth <= 0) return null;

  const scale = CAM_HEIGHT / depth;
  const sx = cam.screenX + rx * scale;
  const sy = cam.screenY - ry * scale;
  return { sx, sy, scale };
}

export function render(ctx, canvas, ship, input, remotePlayers, localHue) {
  const w = canvas.width;
  const h = canvas.height;
  const cam = getCamera(ship, w, h);

  ctx.fillStyle = '#0a0a1a';
  ctx.fillRect(0, 0, w, h);

  // Draw starfield (subtle parallax, no heavy perspective)
  drawStarfieldLayer(ctx, w, h, ship, cam);

  // Draw grid with perspective
  drawGrid(ctx, w, h, ship, cam);

  // Draw remote ships
  if (remotePlayers) {
    for (const rp of remotePlayers) {
      drawRemoteShip(ctx, rp, ship, cam);
    }
  }

  // Draw thrusters (screen space, ship faces up)
  drawThrusters(ctx, cam.screenX, cam.screenY, input);

  // Draw ship (fixed screen position, facing up)
  drawShip(ctx, cam.screenX, cam.screenY, localHue);
}

function worldToShipRelative(wx, wy, ship) {
  const dx = wx - ship.x;
  const dy = wy - ship.y;
  const cos = Math.cos(ship.angle);
  const sin = Math.sin(ship.angle);
  return {
    rx: -(dx * sin - dy * cos),      // right of ship (positive = starboard)
    ry: dx * cos + dy * sin,       // ahead of ship (positive = forward)
  };
}

function drawStarfieldLayer(ctx, w, h, ship, cam) {
  // Starfield with mild parallax, drawn flat (no perspective) for background feel
  ctx.save();
  ctx.translate(cam.screenX, cam.screenY);
  ctx.rotate(-ship.angle + Math.PI / 2);
  drawStarfield(ctx, w * 2, h * 2, ship.x, ship.y);
  ctx.restore();
}

function drawGrid(ctx, w, h, ship, cam) {
  ctx.lineWidth = 1;

  const extent = 1500;
  const startX = Math.floor((ship.x - extent) / GRID_SPACING) * GRID_SPACING;
  const startY = Math.floor((ship.y - extent) / GRID_SPACING) * GRID_SPACING;
  const endX = ship.x + extent;
  const endY = ship.y + extent;

  for (let gx = startX; gx <= endX; gx += GRID_SPACING) {
    drawWorldLine(ctx, gx, ship.y - extent, gx, ship.y + extent, ship, cam);
  }
  for (let gy = startY; gy <= endY; gy += GRID_SPACING) {
    drawWorldLine(ctx, ship.x - extent, gy, ship.x + extent, gy, ship, cam);
  }
}

function drawWorldLine(ctx, x1, y1, x2, y2, ship, cam) {
  const steps = 16;
  for (let i = 0; i < steps; i++) {
    const t0 = i / steps;
    const t1 = (i + 1) / steps;
    const wx0 = x1 + (x2 - x1) * t0;
    const wy0 = y1 + (y2 - y1) * t0;
    const wx1 = x1 + (x2 - x1) * t1;
    const wy1 = y1 + (y2 - y1) * t1;

    const r0 = worldToShipRelative(wx0, wy0, ship);
    const r1 = worldToShipRelative(wx1, wy1, ship);
    const p0 = project(r0.rx, r0.ry, cam);
    const p1 = project(r1.rx, r1.ry, cam);
    if (!p0 || !p1) continue;

    // Fade based on average distance from ship
    const dist = (Math.sqrt(r0.rx * r0.rx + r0.ry * r0.ry) + Math.sqrt(r1.rx * r1.rx + r1.ry * r1.ry)) / 2;
    const alpha = Math.max(0, 1 - dist / GRID_FADE_DIST) * 0.5;
    if (alpha < 0.01) continue;

    ctx.strokeStyle = `rgba(60, 80, 140, ${alpha})`;
    ctx.beginPath();
    ctx.moveTo(p0.sx, p0.sy);
    ctx.lineTo(p1.sx, p1.sy);
    ctx.stroke();
  }
}

function drawShip(ctx, sx, sy, hue) {
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(-Math.PI / 2); // nose points up

  ctx.beginPath();
  ctx.moveTo(SHIP_SIZE, 0);
  ctx.lineTo(-SHIP_SIZE * 0.7, -SHIP_SIZE * 0.6);
  ctx.lineTo(-SHIP_SIZE * 0.4, 0);
  ctx.lineTo(-SHIP_SIZE * 0.7, SHIP_SIZE * 0.6);
  ctx.closePath();

  ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
  ctx.strokeStyle = `hsl(${hue}, 80%, 70%)`;
  ctx.lineWidth = 2;
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawRemoteShip(ctx, remote, localShip, cam) {
  const { rx, ry } = worldToShipRelative(remote.x, remote.y, localShip);
  const p = project(rx, ry, cam);
  if (!p) return;

  const size = SHIP_SIZE * p.scale;
  // Remote ship's angle in screen space: subtract local ship's angle
  // (since the world is viewed rotated so local ship faces up)
  const screenAngle = remote.angle - localShip.angle;

  ctx.save();
  ctx.translate(p.sx, p.sy);
  ctx.rotate((remote.angle - localShip.angle) - Math.PI / 2);

  ctx.beginPath();
  ctx.moveTo(size, 0);
  ctx.lineTo(-size * 0.7, -size * 0.6);
  ctx.lineTo(-size * 0.4, 0);
  ctx.lineTo(-size * 0.7, size * 0.6);
  ctx.closePath();

  const hue = remote.hue ?? 0;
  ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
  ctx.strokeStyle = `hsl(${hue}, 80%, 70%)`;
  ctx.lineWidth = 2 * p.scale;
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawThrusters(ctx, sx, sy, input) {
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(-Math.PI / 2);

  drawThrusterFlame(ctx, -SHIP_SIZE * 0.5, -SHIP_SIZE * 0.5, input.rightX, -input.rightY);
  drawThrusterFlame(ctx, -SHIP_SIZE * 0.5, SHIP_SIZE * 0.5, input.leftX, -input.leftY);

  ctx.restore();
}

function drawThrusterFlame(ctx, tx, ty, stickX, stickY) {
  const magnitude = Math.sqrt(stickX * stickX + stickY * stickY);
  if (magnitude < 0.05) return;

  const thrustLocalX = stickY / magnitude;
  const thrustLocalY = stickX / magnitude;
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
