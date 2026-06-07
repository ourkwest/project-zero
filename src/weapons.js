// Weapons module
// Defines weapon stats and creates projectiles.

export const WEAPONS = [
  { name: 'Small Gun', energyCost: 0.08, damage: 0.1, speed: 800, size: 3, cooldown: 0.2, spread: 0, count: 1, homing: false },
  { name: 'Big Gun', energyCost: 0.3, damage: 0.35, speed: 400, size: 8, cooldown: 0.8, spread: 0, count: 1, homing: false },
  { name: 'Shotgun', energyCost: 0.1, damage: 0.04, speed: 700, size: 2, cooldown: 0.4, spread: 0.3, count: 7, homing: false },
  { name: 'Homing Missile', energyCost: 0.25, damage: 0.15, speed: 350, size: 5, cooldown: 1.0, spread: 0, count: 1, homing: true },
  { name: 'Repair', energyCost: 0, damage: 0, speed: 0, size: 0, cooldown: 0, spread: 0, count: 0, homing: false, isRepair: true },
];

const PROJECTILE_LIFETIME = 3; // seconds
const HOMING_TURN_RATE = 3; // radians/s

let nextId = 0;

export function createProjectile(ship, weapon, index) {
  const spreadAngle = weapon.count > 1
    ? (index - (weapon.count - 1) / 2) * (weapon.spread / (weapon.count - 1))
    : 0;
  const angle = ship.angle + spreadAngle;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    id: nextId++,
    x: ship.x + cos * 25,
    y: ship.y + sin * 25,
    vx: cos * weapon.speed + ship.vx * 0.3,
    vy: sin * weapon.speed + ship.vy * 0.3,
    angle,
    size: weapon.size,
    damage: weapon.damage,
    homing: weapon.homing,
    life: PROJECTILE_LIFETIME,
  };
}

export function updateProjectile(p, dt, targets) {
  if (p.homing && targets && targets.length > 0) {
    const t = findNearestTarget(p, targets);
    if (t) {
      const desired = Math.atan2(t.y - p.y, t.x - p.x);
      let diff = desired - p.angle;
      diff = ((diff + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
      p.angle += Math.sign(diff) * Math.min(Math.abs(diff), HOMING_TURN_RATE * dt);
      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      p.vx = Math.cos(p.angle) * speed;
      p.vy = Math.sin(p.angle) * speed;
    }
  }
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  p.life -= dt;
}

const HOMING_ARC = Math.PI / 3;

function findNearestTarget(from, targets) {
  if (!targets || targets.length === 0) return null;
  let best = null, bestDist = Infinity;
  for (const t of targets) {
    const dx = t.x - from.x;
    const dy = t.y - from.y;
    // Only consider targets roughly ahead of the missile
    const angleToTarget = Math.atan2(dy, dx);
    let diff = angleToTarget - from.angle;
    diff = ((diff + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
    if (Math.abs(diff) > HOMING_ARC) continue;
    const d = dx * dx + dy * dy;
    if (d < bestDist) { bestDist = d; best = t; }
  }
  return best;
}
