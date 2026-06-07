// Weapons module
// Defines weapon stats and creates projectiles.

export const WEAPONS = [
  { name: 'Small Gun', energyCost: 0.08, damage: 0.1, speed: 800, size: 3, cooldown: 0.2, spread: 0, count: 1, lifetime: 3 },
  { name: 'Big Gun', energyCost: 0.3, damage: 0.35, speed: 400, size: 8, cooldown: 0.8, spread: 0, count: 1, lifetime: 3 },
  { name: 'Shotgun', energyCost: 0.1, damage: 0.04, speed: 700, size: 2, cooldown: 0.4, spread: 0.3, count: 7, lifetime: 2 },
  { name: 'Homing Missile', energyCost: 0.25, damage: 0.15, speed: 450, size: 5, cooldown: 1.0, spread: 0, count: 1, lifetime: 4, homingTurnRate: 3 },
  { name: 'Repair', energyCost: 0, damage: 0, speed: 0, size: 0, cooldown: 0, spread: 0, count: 0, lifetime: 0, isRepair: true },
];

const HOMING_ARC = Math.PI / 3; // 60° acquisition arc

let nextId = 0;

export function createProjectile(ship, weapon, index, lockedTargetId) {
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
    homing: !!weapon.homingTurnRate,
    turnRate: weapon.homingTurnRate || 0,
    life: weapon.lifetime || 3,
    targetId: lockedTargetId ?? null,
  };
}

export function updateProjectile(p, dt, targets) {
  if (p.homing && p.targetId != null && targets) {
    const t = targets.find(t => t.id === p.targetId);
    if (t) {
      const desired = Math.atan2(t.y - p.y, t.x - p.x);
      let diff = desired - p.angle;
      diff = ((diff + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
      p.angle += Math.sign(diff) * Math.min(Math.abs(diff), p.turnRate * dt);
      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      p.vx = Math.cos(p.angle) * speed;
      p.vy = Math.sin(p.angle) * speed;
    }
  }
  p.x += p.vx * dt;
  p.y += p.vy * dt;
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
