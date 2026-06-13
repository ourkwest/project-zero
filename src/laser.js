// Laser beam module
// Traces a beam from the ship forward, bent by black hole gravity.
// Returns beam path points and any hit targets.

import { getBlackHoles } from './black-holes.js';

const LASER_RANGE = 1500; // ~75x ship length
const BEAM_SPEED = 2000; // simulation speed for tracing
const BEAM_STEPS = 60;
const GRAVITY_STRENGTH = 1500000;
const HIT_RADIUS = 18;
const LASER_DPS = 0.4; // damage per second while beam is on target

export function traceLaser(ship, remotes, dt) {
  const blackHoles = getBlackHoles();
  const stepDist = LASER_RANGE / BEAM_STEPS;
  const stepDt = stepDist / BEAM_SPEED;

  // Start at ship nose
  const cos = Math.cos(ship.angle);
  const sin = Math.sin(ship.angle);
  let x = ship.x + cos * 25;
  let y = ship.y + sin * 25;
  let vx = cos * BEAM_SPEED;
  let vy = sin * BEAM_SPEED;

  const points = [{ x, y }];
  let hitTarget = null;

  for (let i = 0; i < BEAM_STEPS; i++) {
    // Apply gravity from black holes
    for (const bh of blackHoles) {
      const dx = bh.x - x;
      const dy = bh.y - y;
      const distSq = dx * dx + dy * dy;
      const dist = Math.sqrt(distSq);
      if (dist < 10) continue;
      const force = GRAVITY_STRENGTH / dist;
      vx += (dx / dist) * force * stepDt;
      vy += (dy / dist) * force * stepDt;
    }

    x += vx * stepDt;
    y += vy * stepDt;
    points.push({ x, y });

    // Check collision with remotes
    if (!hitTarget && remotes) {
      for (let r = 0; r < remotes.length; r++) {
        const remote = remotes[r];
        if (remote.dead) continue;
        const dx = x - remote.x;
        const dy = y - remote.y;
        if (dx * dx + dy * dy < HIT_RADIUS * HIT_RADIUS) {
          hitTarget = { index: r, damage: LASER_DPS * dt, x, y };
          break;
        }
      }
    }
    if (hitTarget) break;
  }

  return { points, hitTarget };
}
