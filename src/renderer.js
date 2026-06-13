// Canvas 2D renderer with in-canvas perspective projection
// World rotates so ship faces up. Perspective foreshortens objects ahead.

import { getCamera } from './camera.js';
import { drawStarfield } from './starfield.js';

const SHIP_SIZE = 20;
const GRID_SPACING = 200;
const GRID_FADE_DIST = 1500;
const MAX_KILL_SCALE = 10;

function killScale(kills) {
  return Math.min(MAX_KILL_SCALE, 1 + kills * 0.2);
}

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

export function render(ctx, canvas, ship, input, remotePlayers, localHue, projectiles, particles, flashes, ripples, lockedTarget, blackHoles, dead, kills, laserBeam, remoteLasers) {
  const w = canvas.width;
  const h = canvas.height;
  // Safety: ensure ship state is finite (prevents invisible world if NaN creeps in)
  if (!isFinite(ship.angle)) ship.angle = 0;
  if (!isFinite(ship.x)) ship.x = 0;
  if (!isFinite(ship.y)) ship.y = 0;
  const cam = getCamera(ship, w, h);

  ctx.fillStyle = '#0a0a1a';
  ctx.fillRect(0, 0, w, h);

  // Draw starfield (subtle parallax, no heavy perspective)
  drawStarfieldLayer(ctx, w, h, ship, cam);

  // Draw grid with perspective
  drawGrid(ctx, w, h, ship, cam);

  // Draw black holes
  if (blackHoles) {
    for (const bh of blackHoles) {
      drawBlackHole(ctx, bh, ship, cam);
    }
  }

  // Draw projectiles
  if (projectiles) {
    for (const p of projectiles) {
      drawProjectile(ctx, p, ship, cam, remotePlayers);
    }
  }

  // Draw particles (explosions)
  if (particles) {
    for (const p of particles) {
      drawParticle(ctx, p, ship, cam);
    }
  }

  // Draw impact flashes
  if (flashes) {
    for (const f of flashes) {
      drawFlash(ctx, f, ship, cam);
    }
  }

  // Draw laser ripples
  if (ripples) {
    for (const r of ripples) {
      drawRipple(ctx, r, ship, cam);
    }
  }

  // Draw remote ships
  if (remotePlayers) {
    for (const rp of remotePlayers) {
      if (!rp.dead) drawRemoteShip(ctx, rp, ship, cam);
    }
  }

  // Draw lock-on indicator
  if (lockedTarget != null && remotePlayers && remotePlayers[lockedTarget]) {
    drawLockIndicator(ctx, remotePlayers[lockedTarget], ship, cam);
  }

  if (!dead) {
    const ks = killScale(kills || 0);
    // Draw thrusters (screen space, ship faces up)
    drawThrusters(ctx, cam.screenX, cam.screenY, input, ks);

    // Draw ship (fixed screen position, facing up)
    drawShip(ctx, cam.screenX, cam.screenY, localHue, ks);

    // Draw laser beam
    if (laserBeam && laserBeam.length > 1) {
      drawLaserBeam(ctx, laserBeam, ship, cam);
    }
  } else {
    // Draw respawn overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#f44';
    ctx.font = 'bold 36px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('DESTROYED', w / 2, h / 2 - 10);
    ctx.fillStyle = '#aaa';
    ctx.font = '20px system-ui';
    ctx.fillText('Respawning...', w / 2, h / 2 + 25);
  }

  // Draw remote laser beams
  if (remoteLasers && remoteLasers.size > 0) {
    for (const points of remoteLasers.values()) {
      if (points && points.length > 1) drawLaserBeam(ctx, points, ship, cam);
    }
  }
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

function drawShip(ctx, sx, sy, hue, scale = 1) {
  const s = SHIP_SIZE * scale;
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(-Math.PI / 2);

  ctx.beginPath();
  ctx.moveTo(s, 0);
  ctx.lineTo(-s * 0.7, -s * 0.6);
  ctx.lineTo(-s * 0.4, 0);
  ctx.lineTo(-s * 0.7, s * 0.6);
  ctx.closePath();

  ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
  ctx.strokeStyle = `hsl(${hue}, 80%, 70%)`;
  ctx.lineWidth = 2;
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawRemoteShip(ctx, remote, localShip, cam) {
  const ks = killScale(remote.kills || 0);
  const size = SHIP_SIZE * ks;
  const shipAngle = remote.angle;

  // Define vertices in world space (rotated by ship's angle, offset from ship position)
  const cos = Math.cos(shipAngle);
  const sin = Math.sin(shipAngle);
  const verts = [
    { x: size, y: 0 },           // nose
    { x: -size * 0.7, y: -size * 0.6 }, // top-left
    { x: -size * 0.4, y: 0 },    // indent
    { x: -size * 0.7, y: size * 0.6 },  // bottom-left
  ];

  // Rotate vertices by ship angle and offset to world position, then project each
  const projected = [];
  for (const v of verts) {
    const wx = remote.x + v.x * cos - v.y * sin;
    const wy = remote.y + v.x * sin + v.y * cos;
    const { rx, ry } = worldToShipRelative(wx, wy, localShip);
    const p = project(rx, ry, cam);
    if (!p) return; // any vertex behind camera → skip entire ship
    projected.push(p);
  }

  ctx.beginPath();
  ctx.moveTo(projected[0].sx, projected[0].sy);
  for (let i = 1; i < projected.length; i++) {
    ctx.lineTo(projected[i].sx, projected[i].sy);
  }
  ctx.closePath();

  const hue = remote.hue ?? 0;
  ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
  ctx.strokeStyle = `hsl(${hue}, 80%, 70%)`;
  ctx.lineWidth = 2 * projected[0].scale;
  ctx.fill();
  ctx.stroke();
}

function drawProjectile(ctx, p, localShip, cam, remotePlayers) {
  const { rx, ry } = worldToShipRelative(p.x, p.y, localShip);
  const proj = project(rx, ry, cam);
  if (!proj) return;

  // Fade opacity when close to any remote ship
  let proximityFade = 1;
  if (remotePlayers) {
    for (const r of remotePlayers) {
      const dx = p.x - r.x;
      const dy = p.y - r.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const fadeStart = 100;
      if (dist < fadeStart) {
        proximityFade = Math.min(proximityFade, (dist / fadeStart) ** 2);
      }
    }
  }

  const size = Math.max(1.5, p.size * proj.scale);
  ctx.beginPath();
  ctx.arc(proj.sx, proj.sy, size, 0, Math.PI * 2);
  const alpha = proximityFade;
  ctx.fillStyle = p.homing
    ? `rgba(255, 80, 80, ${alpha})`
    : `rgba(255, 255, 100, ${alpha})`;
  ctx.fill();
}

function drawParticle(ctx, p, localShip, cam) {
  const { rx, ry } = worldToShipRelative(p.x, p.y, localShip);
  const proj = project(rx, ry, cam);
  if (!proj) return;

  const t = p.life / p.maxLife;
  const size = p.size * proj.scale * t;
  if (size < 0.5) return;

  ctx.beginPath();
  ctx.arc(proj.sx, proj.sy, size, 0, Math.PI * 2);
  // Orange-yellow fading to red
  const r = 255;
  const g = Math.floor(200 * t);
  const b = Math.floor(50 * t);
  ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${t * 0.9})`;
  ctx.fill();
}

function drawFlash(ctx, f, localShip, cam) {
  const { rx, ry } = worldToShipRelative(f.x, f.y, localShip);
  const proj = project(rx, ry, cam);
  if (!proj) return;

  const t = f.life / f.maxLife;
  const radius = f.radius * proj.scale * (1 + (1 - t) * 0.5);
  const grad = ctx.createRadialGradient(proj.sx, proj.sy, 0, proj.sx, proj.sy, radius);
  grad.addColorStop(0, `rgba(255, 255, 255, ${t * 0.9})`);
  grad.addColorStop(0.4, `rgba(255, 240, 180, ${t * 0.6})`);
  grad.addColorStop(1, `rgba(255, 200, 80, 0)`);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(proj.sx, proj.sy, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawRipple(ctx, r, localShip, cam) {
  const { rx, ry } = worldToShipRelative(r.x, r.y, localShip);
  const proj = project(rx, ry, cam);
  if (!proj) return;

  const t = r.life / r.maxLife; // 1→0
  const radius = r.radius * proj.scale * (1 + (1 - t) * 2); // expands outward
  const alpha = t * 0.8;
  ctx.beginPath();
  ctx.arc(proj.sx, proj.sy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(255, 80, 80, ${alpha})`;
  ctx.lineWidth = Math.max(1, 2 * proj.scale * t);
  ctx.stroke();
}

function drawBlackHole(ctx, bh, localShip, cam) {
  const { rx, ry } = worldToShipRelative(bh.x, bh.y, localShip);
  const p = project(rx, ry, cam);
  if (!p) return;

  const radius = 35 * p.scale;
  // Outer glow
  const outer = ctx.createRadialGradient(p.sx, p.sy, radius * 0.5, p.sx, p.sy, radius * 4);
  outer.addColorStop(0, 'rgba(180, 80, 255, 0.6)');
  outer.addColorStop(0.4, 'rgba(120, 40, 220, 0.3)');
  outer.addColorStop(1, 'rgba(80, 0, 160, 0)');
  ctx.fillStyle = outer;
  ctx.beginPath();
  ctx.arc(p.sx, p.sy, radius * 4, 0, Math.PI * 2);
  ctx.fill();
  // Bright ring
  ctx.strokeStyle = 'rgba(200, 120, 255, 0.7)';
  ctx.lineWidth = 3 * p.scale;
  ctx.beginPath();
  ctx.arc(p.sx, p.sy, radius, 0, Math.PI * 2);
  ctx.stroke();
  // Dark core
  const grad = ctx.createRadialGradient(p.sx, p.sy, 0, p.sx, p.sy, radius * 0.8);
  grad.addColorStop(0, 'rgba(0, 0, 0, 1)');
  grad.addColorStop(0.7, 'rgba(0, 0, 0, 0.9)');
  grad.addColorStop(1, 'rgba(40, 0, 80, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(p.sx, p.sy, radius * 0.8, 0, Math.PI * 2);
  ctx.fill();
}

function drawLaserBeam(ctx, points, localShip, cam) {
  const total = points.length;
  for (let i = 0; i < total - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const r0 = worldToShipRelative(p0.x, p0.y, localShip);
    const r1 = worldToShipRelative(p1.x, p1.y, localShip);
    const s0 = project(r0.rx, r0.ry, cam);
    const s1 = project(r1.rx, r1.ry, cam);
    if (!s0 || !s1) continue;

    const t = 1 - i / total; // 1 at start, 0 at end
    ctx.beginPath();
    ctx.moveTo(s0.sx, s0.sy);
    ctx.lineTo(s1.sx, s1.sy);
    ctx.strokeStyle = `rgba(255, 60, 60, ${t * 0.9})`;
    ctx.lineWidth = Math.max(1, 3 * t * s0.scale);
    ctx.stroke();
  }
}

function drawLockIndicator(ctx, target, localShip, cam) {
  const { rx, ry } = worldToShipRelative(target.x, target.y, localShip);
  const p = project(rx, ry, cam);
  if (!p) return;

  const size = 22 * p.scale;
  ctx.save();
  ctx.translate(p.sx, p.sy);
  ctx.rotate(Math.PI / 4);
  ctx.strokeStyle = 'rgba(255, 60, 60, 0.9)';
  ctx.lineWidth = 2;
  ctx.strokeRect(-size, -size, size * 2, size * 2);
  ctx.restore();
}

function drawThrusters(ctx, sx, sy, input, scale = 1) {
  const steer = input.steer || 0;
  const moveX = input.moveX || 0;
  const moveY = input.moveY || 0;
  const leftY = moveY + steer * 0.5;
  const leftX = moveX;
  const rightY = moveY - steer * 0.5;
  const rightX = moveX;
  const s = SHIP_SIZE * scale;

  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(-Math.PI / 2);

  drawThrusterFlame(ctx, -s * 0.5, -s * 0.5, rightX, rightY, s);
  drawThrusterFlame(ctx, -s * 0.5, s * 0.5, leftX, leftY, s);

  ctx.restore();
}

function drawThrusterFlame(ctx, tx, ty, stickX, stickY, shipSize = SHIP_SIZE) {
  const magnitude = Math.sqrt(stickX * stickX + stickY * stickY);
  if (!isFinite(magnitude) || magnitude < 0.05) return;

  const thrustLocalX = stickY / magnitude;
  const thrustLocalY = stickX / magnitude;
  const flameX = -thrustLocalX;
  const flameY = -thrustLocalY;
  const length = shipSize * 0.8 * magnitude;

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
