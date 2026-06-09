// Black holes module
// Point masses left behind when a player dies.
// Attract projectiles but not players.

const GRAVITY_STRENGTH = 500000; // gravitational pull constant (1/r falloff)
const blackHoles = [];
let nextId = 0;
const localPrefix = Math.random().toString(36).slice(2, 8);

export function spawnBlackHole(x, y) {
  const bh = { id: localPrefix + '-' + nextId++, x, y };
  blackHoles.push(bh);
  return bh;
}

export function addRemoteBlackHole(id, x, y) {
  if (!blackHoles.find(bh => bh.id === id)) {
    blackHoles.push({ id, x, y });
  }
}

export function applyGravity(projectiles, dt) {
  for (const p of projectiles) {
    for (const bh of blackHoles) {
      const dx = bh.x - p.x;
      const dy = bh.y - p.y;
      const distSq = dx * dx + dy * dy;
      const dist = Math.sqrt(distSq);
      if (dist < 10) continue;
      const force = GRAVITY_STRENGTH / dist;
      p.vx += (dx / dist) * force * dt;
      p.vy += (dy / dist) * force * dt;
    }
  }
}

export function getBlackHoles() {
  return blackHoles;
}
