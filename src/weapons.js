// Weapons module
// Defines weapon stats and creates projectiles.
// Physics: launch speed is additive with ship velocity.
// Homing missiles accelerate toward their target rather than turning.

export const WEAPONS = [
  { name: 'Small Gun', energyCost: 0.08, damage: 0.1, launchSpeed: 800, size: 3, cooldown: 0.2, spread: 0, count: 1, lifetime: 4 },
  { name: 'Big Gun', energyCost: 0.3, damage: 0.35, launchSpeed: 400, size: 8, cooldown: 0.8, spread: 0, count: 1, lifetime: 4 },
  { name: 'Shotgun', energyCost: 0.1, damage: 0.04, launchSpeed: 700, size: 2, cooldown: 0.4, spread: 0.3, count: 7, lifetime: 4, randomSpread: 0.15 },
  { name: 'Homing Missile', energyCost: 0.25, damage: 0.15, launchSpeed: 300, size: 5, cooldown: 1.0, spread: 0, count: 1, lifetime: 14, homingAccel: 600 },
  { name: 'Laser', energyCost: 0.15, damage: 0.2, launchSpeed: 0, size: 0, cooldown: 0, spread: 0, count: 0, lifetime: 0, isLaser: true },
  { name: 'Repair', energyCost: 0, damage: 0, launchSpeed: 0, size: 0, cooldown: 0, spread: 0, count: 0, lifetime: 0, isRepair: true },
];

const HOMING_ARC = Math.PI / 3; // 60° acquisition arc

let nextId = 0;

export function createProjectile(ship, weapon, index, lockedTargetId) {
  // Base spread angle (even distribution for multi-projectile weapons)
  let spreadAngle = weapon.count > 1
    ? (index - (weapon.count - 1) / 2) * (weapon.spread / (weapon.count - 1))
    : 0;
  // Random spread for shotgun-style weapons
  if (weapon.randomSpread) {
    spreadAngle += (Math.random() - 0.5) * weapon.randomSpread;
  }
  const angle = ship.angle + spreadAngle;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  // Launch speed randomized slightly for shotgun
  const speedJitter = weapon.randomSpread ? 1 + (Math.random() - 0.5) * 0.2 : 1;
  const launchSpeed = weapon.launchSpeed * speedJitter;
  const lifeJitter = weapon.randomSpread ? 1 + (Math.random() - 0.5) * 0.4 : 1;
  const life = (weapon.lifetime || 3) * lifeJitter;
  return {
    id: nextId++,
    x: ship.x + cos * 25,
    y: ship.y + sin * 25,
    vx: cos * launchSpeed + ship.vx,
    vy: sin * launchSpeed + ship.vy,
    angle,
    size: weapon.size,
    damage: weapon.damage,
    homing: !!weapon.homingAccel,
    homingAccel: weapon.homingAccel || 0,
    life,
    maxLife: life,
    targetId: lockedTargetId ?? null,
  };
}

export function updateProjectile(p, dt, targets) {
  // Homing: accelerate toward locked target with drag to prevent orbiting
  if (p.homing && p.targetId != null && targets) {
    const t = targets.find(t => t.id === p.targetId);
    if (t) {
      const dx = t.x - p.x;
      const dy = t.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0) {
        // Accelerate toward target
        p.vx += (dx / dist) * p.homingAccel * dt;
        p.vy += (dy / dist) * p.homingAccel * dt;
        // Dampen velocity perpendicular to target direction (prevents orbiting)
        const nx = dx / dist;
        const ny = dy / dist;
        const along = p.vx * nx + p.vy * ny;
        const perpX = p.vx - along * nx;
        const perpY = p.vy - along * ny;
        p.vx -= perpX * 3 * dt;
        p.vy -= perpY * 3 * dt;
      }
    }
  }
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  p.angle = Math.atan2(p.vy, p.vx);
  p.life -= dt;
}

// Acquire lock: closest target within 60° arc of ship heading
export function acquireTarget(ship, remotes) {
  if (!remotes || remotes.length === 0) return null;
  let best = null, bestDist = Infinity;
  for (let i = 0; i < remotes.length; i++) {
    const r = remotes[i];
    const dx = r.x - ship.x;
    const dy = r.y - ship.y;
    const angleToTarget = Math.atan2(dy, dx);
    let diff = angleToTarget - ship.angle;
    diff = ((diff + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
    if (Math.abs(diff) > HOMING_ARC / 2) continue;
    const dist = dx * dx + dy * dy;
    if (dist < bestDist) { bestDist = dist; best = i; }
  }
  return best;
}

if (import.meta.hot) {
  import.meta.hot.accept(mod => {
    WEAPONS.splice(0, WEAPONS.length, ...mod.WEAPONS);
  });
}
