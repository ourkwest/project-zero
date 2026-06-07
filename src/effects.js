// Effects module
// Lightweight particle explosions and impact flashes.

const particles = [];
const flashes = [];

export function spawnExplosion(x, y, damage) {
  const count = Math.floor(8 + damage * 40);
  const speed = 100 + damage * 400;
  const size = 2 + damage * 6;
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const v = (0.3 + Math.random() * 0.7) * speed;
    particles.push({
      x, y,
      vx: Math.cos(angle) * v,
      vy: Math.sin(angle) * v,
      life: 0.3 + Math.random() * 0.4,
      maxLife: 0.3 + Math.random() * 0.4,
      size: size * (0.5 + Math.random() * 0.5),
    });
  }
  // Bright impact flash
  flashes.push({ x, y, life: 0.2, maxLife: 0.2, radius: 40 + damage * 100 });
}

export function updateEffects(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.95;
    p.vy *= 0.95;
    p.life -= dt;
    if (p.life <= 0) particles.splice(i, 1);
  }
  for (let i = flashes.length - 1; i >= 0; i--) {
    flashes[i].life -= dt;
    if (flashes[i].life <= 0) flashes.splice(i, 1);
  }
}

export function getParticles() {
  return particles;
}

export function getFlashes() {
  return flashes;
}
